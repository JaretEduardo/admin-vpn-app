import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IdentifyDto } from './dto/identify.dto';
import { IdentifyResponseDto } from './dto/identify-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('identify')
  @HttpCode(HttpStatus.OK)
  identify(@Body() dto: IdentifyDto): Promise<IdentifyResponseDto> {
    return this.authService.identify(dto.vpnIp);
  }
}
