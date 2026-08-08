import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { VPN_SUBNET_CIDR, isVpnSubnetIp } from '../utils/vpn-subnet.util';

export function IsVpnSubnetIp(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isVpnSubnetIp',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isVpnSubnetIp(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} debe ser una IPv4 valida asignable a un administrador dentro de la subred ${VPN_SUBNET_CIDR} (10.25.0.2 - 10.25.0.254)`;
        },
      },
    });
  };
}
