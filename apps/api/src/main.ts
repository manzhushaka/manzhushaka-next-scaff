import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { loadEnv } from '@manzhushaka/config';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { RuntimeLoggerService } from './runtime-logs/runtime-log.service.js';

type CorsCallback = (error: Error | null, allow?: boolean) => void;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const env = loadEnv();
  const logger = app.get(RuntimeLoggerService);
  app.useLogger(logger);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.once('finish', () => {
      const path = request.path;
      if (path === '/api/health' || path.startsWith('/api/runtime-logs')) return;
      const level =
        response.statusCode >= 500 ? 'ERROR' : response.statusCode >= 400 ? 'WARN' : 'INFO';
      logger.write(level, `${request.method} ${path}`, {
        method: request.method,
        path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
        ip: request.ip,
      });
    });
    next();
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    origin: (origin: string | undefined, callback: CorsCallback) => {
      const localDevelopmentOrigin =
        env.NODE_ENV !== 'production' &&
        origin !== undefined &&
        /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/u.test(origin);
      if (!origin || origin === env.APP_URL || localDevelopmentOrigin) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin 未被允许。'));
    },
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  const port = Number(process.env.API_PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT 必须是 1-65535 的整数');
  }
  await app.listen(port);
}

bootstrap();
