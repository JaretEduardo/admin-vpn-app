import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
// TEMPORAL — Checkpoint 4: quitar este import y DebugModule del array
// de imports al finalizar la validación de red.
import { DebugModule } from './debug/debug.module';

@Module({
  imports: [PrismaModule, DebugModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
