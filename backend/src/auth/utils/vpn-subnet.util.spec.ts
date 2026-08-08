import {
  isIpv4InCidr,
  isVpnSubnetIp,
  VPN_SUBNET_CIDR,
} from './vpn-subnet.util';

describe('vpn-subnet.util', () => {
  describe('isIpv4InCidr', () => {
    it('accepts an address inside the given range', () => {
      expect(isIpv4InCidr('10.25.0.2', '10.25.0.0/24')).toBe(true);
      expect(isIpv4InCidr('10.25.0.254', '10.25.0.0/24')).toBe(true);
    });

    it('rejects an address outside the given range', () => {
      expect(isIpv4InCidr('10.25.1.2', '10.25.0.0/24')).toBe(false);
      expect(isIpv4InCidr('192.168.1.2', '10.25.0.0/24')).toBe(false);
    });

    it('rejects malformed input instead of throwing', () => {
      expect(isIpv4InCidr('not-an-ip', '10.25.0.0/24')).toBe(false);
      expect(isIpv4InCidr('::1', '10.25.0.0/24')).toBe(false);
    });
  });

  describe('isVpnSubnetIp', () => {
    it('accepts IPv4 addresses within the administrative VPN subnet', () => {
      expect(isVpnSubnetIp('10.25.0.2')).toBe(true);
      expect(isVpnSubnetIp('10.25.0.3')).toBe(true);
    });

    it('rejects private ranges outside the VPN subnet', () => {
      expect(isVpnSubnetIp('192.168.0.2')).toBe(false);
      expect(isVpnSubnetIp('10.25.1.2')).toBe(false);
    });

    it('accepts the boundaries of the assignable admin host range', () => {
      expect(isVpnSubnetIp('10.25.0.2')).toBe(true);
      expect(isVpnSubnetIp('10.25.0.254')).toBe(true);
    });

    it('rejects the network address .0', () => {
      expect(isVpnSubnetIp('10.25.0.0')).toBe(false);
    });

    it('rejects the gateway/infrastructure address .1', () => {
      expect(isVpnSubnetIp('10.25.0.1')).toBe(false);
    });

    it('rejects the broadcast address .255', () => {
      expect(isVpnSubnetIp('10.25.0.255')).toBe(false);
    });

    it('rejects public IPs', () => {
      expect(isVpnSubnetIp('8.8.8.8')).toBe(false);
    });

    it('rejects IPv6 addresses', () => {
      expect(isVpnSubnetIp('::1')).toBe(false);
      expect(isVpnSubnetIp('fe80::1')).toBe(false);
    });

    it('rejects arbitrary strings and empty values', () => {
      expect(isVpnSubnetIp('not-an-ip')).toBe(false);
      expect(isVpnSubnetIp('')).toBe(false);
    });

    it('uses 10.25.0.0/24 as the administrative subnet', () => {
      expect(VPN_SUBNET_CIDR).toBe('10.25.0.0/24');
    });
  });
});
