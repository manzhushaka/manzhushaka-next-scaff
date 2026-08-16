import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { HealthController } from './health/health.controller.js';
import { PrismaService } from './prisma.service.js';
import { BosStorageService } from './storage/bos.service.js';
import {
  PublicSystemBrandingController,
  SystemBrandingController,
} from './system-parameters/system-branding.controller.js';
import { SystemBrandingService } from './system-parameters/system-branding.service.js';
import { RuntimeLogsController } from './runtime-logs/runtime-logs.controller.js';
import { RuntimeLogService, RuntimeLoggerService } from './runtime-logs/runtime-log.service.js';

@Module({
  controllers: [
    AuthController,
    HealthController,
    PublicSystemBrandingController,
    SystemBrandingController,
    RuntimeLogsController,
  ],
  providers: [
    PrismaService,
    AuthService,
    BosStorageService,
    SystemBrandingService,
    RuntimeLogService,
    RuntimeLoggerService,
  ],
})
export class AppModule {}
