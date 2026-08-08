import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

type MfaChallengeCreateArgs = {
  data: { adminId: string; tokenHash: string; expiresAt: Date };
};
type AuditLogCreateArgs = {
  data: { eventType: string; adminId?: string; ipAddress?: string };
};

type MockPrisma = {
  admin: {
    findFirst: jest.Mock<Promise<typeof activeAdmin | null>, [unknown]>;
  };
  mfaChallenge: {
    updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
    create: jest.Mock<Promise<{ id: string }>, [MfaChallengeCreateArgs]>;
  };
  auditLog: {
    create: jest.Mock<Promise<{ id: string }>, [AuditLogCreateArgs]>;
  };
  $transaction: jest.Mock<Promise<unknown[]>, [Promise<unknown>[]]>;
};

function createMockPrisma(): MockPrisma {
  return {
    admin: {
      findFirst: jest.fn<Promise<typeof activeAdmin | null>, [unknown]>(),
    },
    mfaChallenge: {
      updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
      create: jest.fn<Promise<{ id: string }>, [MfaChallengeCreateArgs]>(),
    },
    auditLog: {
      create: jest.fn<Promise<{ id: string }>, [AuditLogCreateArgs]>(),
    },
    $transaction: jest.fn<Promise<unknown[]>, [Promise<unknown>[]]>((ops) =>
      Promise.all(ops),
    ),
  };
}

const activeAdmin = {
  id: 'admin_1',
  username: 'jdoe',
  fullName: 'Admin One',
  vpnIpAddress: '10.25.0.2',
  totpSecret: 'super-secret-should-never-leak',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  roleId: 'role_1',
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AuthService(prisma as unknown as PrismaService);
  });

  describe('when the vpnIp is not associated to an active admin', () => {
    beforeEach(() => {
      prisma.admin.findFirst.mockResolvedValue(null);
    });

    it('throws an UnauthorizedException with the VPN_IP_NOT_AUTHORIZED code', async () => {
      expect.assertions(2);
      try {
        await service.identify('10.25.0.99');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse();
        expect(response).toMatchObject({ code: 'VPN_IP_NOT_AUTHORIZED' });
      }
    });

    it('records a LOGIN_IP_UNKNOWN audit event without creating a challenge', async () => {
      await expect(service.identify('10.25.0.99')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: { eventType: 'LOGIN_IP_UNKNOWN', ipAddress: '10.25.0.99' },
      });
      expect(prisma.mfaChallenge.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('when the vpnIp is associated to an active admin', () => {
    beforeEach(() => {
      prisma.admin.findFirst.mockResolvedValue(activeAdmin);
      prisma.mfaChallenge.updateMany.mockResolvedValue({ count: 1 });
      prisma.mfaChallenge.create.mockResolvedValue({ id: 'challenge_1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'audit_1' });
    });

    it('looks up the admin by vpnIpAddress and isActive only', async () => {
      await service.identify('10.25.0.2');

      expect(prisma.admin.findFirst).toHaveBeenCalledWith({
        where: { vpnIpAddress: '10.25.0.2', isActive: true },
      });
    });

    it('invalidates previous unconsumed challenges for that admin', async () => {
      await service.identify('10.25.0.2');

      expect(prisma.mfaChallenge.updateMany).toHaveBeenCalledTimes(1);
      const updateManyArgs = prisma.mfaChallenge.updateMany.mock
        .calls[0][0] as {
        where: { adminId: string; consumedAt: null };
        data: { consumedAt: Date };
      };

      expect(updateManyArgs.where).toEqual({
        adminId: activeAdmin.id,
        consumedAt: null,
      });
      expect(updateManyArgs.data.consumedAt).toBeInstanceOf(Date);
    });

    it('stores only the sha256 hash of the generated token, never the token itself', async () => {
      const result = await service.identify('10.25.0.2');

      const createCall = prisma.mfaChallenge.create.mock.calls[0][0];
      const expectedHash = createHash('sha256')
        .update(result.challengeToken)
        .digest('hex');

      expect(createCall.data.tokenHash).toBe(expectedHash);
      expect(createCall.data.adminId).toBe(activeAdmin.id);
      expect(createCall.data).not.toHaveProperty('token');
    });

    it('sets expiresAt to exactly 2 minutes from creation', async () => {
      const before = Date.now();
      await service.identify('10.25.0.2');
      const after = Date.now();

      const createCall = prisma.mfaChallenge.create.mock.calls[0][0];
      const expiresAtMs = createCall.data.expiresAt.getTime();

      expect(expiresAtMs).toBeGreaterThanOrEqual(before + 120_000);
      expect(expiresAtMs).toBeLessThanOrEqual(after + 120_000);
    });

    it('records a MFA_CHALLENGE_CREATED audit event without the raw token', async () => {
      await service.identify('10.25.0.2');

      const auditCall = prisma.auditLog.create.mock.calls[0][0];
      expect(auditCall.data.eventType).toBe('MFA_CHALLENGE_CREATED');
      expect(auditCall.data.adminId).toBe(activeAdmin.id);
      expect(JSON.stringify(auditCall.data)).not.toContain('challengeToken');
    });

    it('returns only admin id/fullName, the raw token and expiresIn', async () => {
      const result = await service.identify('10.25.0.2');

      expect(result.admin).toEqual({
        id: activeAdmin.id,
        fullName: activeAdmin.fullName,
      });
      expect(typeof result.challengeToken).toBe('string');
      expect(result.challengeToken).toHaveLength(64);
      expect(result.expiresIn).toBe(120);
      expect(result).not.toHaveProperty('totpSecret');
    });
  });
});
