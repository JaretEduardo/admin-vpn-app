// TEMPORAL — Checkpoint 4.
// Endpoint exclusivo para validar qué IP de socket observa NestJS detrás
// del port mapping de Docker/Coolify (10.25.0.1:3001 -> contenedor:3000).
// No lee ni confía en X-Forwarded-For / X-Real-IP ni ningún otro header
// de proxy. No se activa `trust proxy`. Eliminar tras validar la infraestructura.
import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('debug')
export class DebugNetworkController {
  @Get('network')
  getNetworkInfo(@Req() req: Request): {
    ip: string | undefined;
    remoteAddress: string | undefined;
  } {
    return {
      ip: req.ip,
      remoteAddress: req.socket.remoteAddress,
    };
  }
}
