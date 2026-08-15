import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { HealthController } from './health/health.controller.js';
import { PrismaService } from './prisma.service.js';
import { BosStorageService } from './storage/bos.service.js';

@Module({
  controllers: [AuthController, HealthController],
  providers: [PrismaService, AuthService, BosStorageService],
})
export class AppModule {}
