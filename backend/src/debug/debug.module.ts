// TEMPORAL — Checkpoint 4. Eliminar junto con DebugNetworkController
// tras validar la infraestructura de red (WireGuard + Docker/Coolify).
import { Module } from '@nestjs/common';
import { DebugNetworkController } from './debug-network.controller';

@Module({
  controllers: [DebugNetworkController],
})
export class DebugModule {}
