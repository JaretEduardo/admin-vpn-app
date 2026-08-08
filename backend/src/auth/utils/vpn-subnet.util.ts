import { isIPv4 } from 'node:net';

export const VPN_SUBNET_CIDR = '10.25.0.0/24';

// Rango de hosts asignables a administradores dentro de la subred.
// Excluye .0 (dirección de red), .1 (gateway/infraestructura WireGuard)
// y .255 (broadcast).
const VPN_HOST_RANGE_MIN = 2;
const VPN_HOST_RANGE_MAX = 254;

function ipv4ToInt(ip: string): number {
  return (
    ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
  );
}

export function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixLengthRaw] = cidr.split('/');
  if (!isIPv4(ip) || !isIPv4(rangeIp)) {
    return false;
  }

  const prefixLength = Number(prefixLengthRaw);
  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;

  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(rangeIp) & mask);
}

function isAssignableVpnHost(ip: string): boolean {
  const lastOctet = Number(ip.split('.')[3]);
  return lastOctet >= VPN_HOST_RANGE_MIN && lastOctet <= VPN_HOST_RANGE_MAX;
}

export function isVpnSubnetIp(ip: string): boolean {
  return (
    isIPv4(ip) && isIpv4InCidr(ip, VPN_SUBNET_CIDR) && isAssignableVpnHost(ip)
  );
}
