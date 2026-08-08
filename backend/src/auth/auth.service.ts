import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_AUDIT_EVENTS } from './auth-events.constant';
import { IdentifyResponseDto } from './dto/identify-response.dto';

const MFA_CHALLENGE_TTL_MS = 2 * 60 * 1000;
const MFA_CHALLENGE_TTL_SECONDS = MFA_CHALLENGE_TTL_MS / 1000;
const CHALLENGE_TOKEN_BYTES = 32;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async identify(vpnIp: string): Promise<IdentifyResponseDto> {
    const admin = await this.prisma.admin.findFirst({
      where: { vpnIpAddress: vpnIp, isActive: true },
    });

    if (!admin) {
      await this.prisma.auditLog.create({
        data: {
          eventType: AUTH_AUDIT_EVENTS.LOGIN_IP_UNKNOWN,
          ipAddress: vpnIp,
        },
      });

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'VPN_IP_NOT_AUTHORIZED',
        message: 'No hay un administrador activo asociado a esta IP VPN.',
      });
    }

    const token = randomBytes(CHALLENGE_TOKEN_BYTES).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.mfaChallenge.updateMany({
        where: { adminId: admin.id, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.mfaChallenge.create({
        data: {
          adminId: admin.id,
          tokenHash,
          expiresAt,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          eventType: AUTH_AUDIT_EVENTS.MFA_CHALLENGE_CREATED,
          adminId: admin.id,
          ipAddress: vpnIp,
        },
      }),
    ]);

    return {
      admin: {
        id: admin.id,
        fullName: admin.fullName,
      },
      challengeToken: token,
      expiresIn: MFA_CHALLENGE_TTL_SECONDS,
    };
  }
}
