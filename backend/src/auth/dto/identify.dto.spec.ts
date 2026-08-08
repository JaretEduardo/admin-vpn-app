import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IdentifyDto } from './identify.dto';

async function validateVpnIp(vpnIp: unknown) {
  const dto = plainToInstance(IdentifyDto, { vpnIp });
  return validate(dto);
}

describe('IdentifyDto', () => {
  it('accepts an IPv4 address inside the administrative VPN subnet', async () => {
    const errors = await validateVpnIp('10.25.0.2');
    expect(errors).toHaveLength(0);
  });

  it('rejects an IPv4 address outside the administrative VPN subnet', async () => {
    const errors = await validateVpnIp('192.168.1.2');
    expect(errors).toHaveLength(1);
  });

  it('rejects the network address 10.25.0.0', async () => {
    const errors = await validateVpnIp('10.25.0.0');
    expect(errors).toHaveLength(1);
  });

  it('rejects the gateway address 10.25.0.1', async () => {
    const errors = await validateVpnIp('10.25.0.1');
    expect(errors).toHaveLength(1);
  });

  it('rejects the broadcast address 10.25.0.255', async () => {
    const errors = await validateVpnIp('10.25.0.255');
    expect(errors).toHaveLength(1);
  });

  it('rejects public IPv4 addresses', async () => {
    const errors = await validateVpnIp('8.8.8.8');
    expect(errors).toHaveLength(1);
  });

  it('rejects IPv6 addresses', async () => {
    const errors = await validateVpnIp('::1');
    expect(errors).toHaveLength(1);
  });

  it('rejects arbitrary strings', async () => {
    const errors = await validateVpnIp('not-an-ip');
    expect(errors).toHaveLength(1);
  });

  it('rejects empty values', async () => {
    const errors = await validateVpnIp('');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects missing values', async () => {
    const errors = await validateVpnIp(undefined);
    expect(errors.length).toBeGreaterThan(0);
  });
});
