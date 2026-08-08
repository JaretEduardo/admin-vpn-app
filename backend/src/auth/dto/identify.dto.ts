import { IsNotEmpty, IsString } from 'class-validator';
import { IsVpnSubnetIp } from '../validators/is-vpn-subnet-ip.validator';

export class IdentifyDto {
  @IsString()
  @IsNotEmpty()
  @IsVpnSubnetIp()
  vpnIp: string;
}
