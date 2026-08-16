import { BadRequestException, Controller, Get, Header, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { runtimeLogQuerySchema } from '@manzhushaka/contracts';
import { loadEnv } from '@manzhushaka/config';
import { AuthService } from '../auth/auth.service.js';
import { RuntimeLogService } from './runtime-log.service.js';

type QueryValue = string | string[] | undefined;
type RuntimeLogsQuery = Record<string, QueryValue>;

function firstQueryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

@Controller('runtime-logs')
export class RuntimeLogsController {
  constructor(
    private readonly runtimeLogs: RuntimeLogService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: Request, @Query() query: RuntimeLogsQuery) {
    const token = request.cookies?.[loadEnv().SESSION_COOKIE_NAME] as string | undefined;
    await this.auth.requirePermission(token, 'security:runtime-logs');
    const parsed = runtimeLogQuerySchema.safeParse({
      level: firstQueryValue(query.level),
      service: firstQueryValue(query.service),
      keyword: firstQueryValue(query.keyword),
      cursor: firstQueryValue(query.cursor),
      limit: firstQueryValue(query.limit),
    });
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'RUNTIME_LOG_QUERY_INVALID',
        message: '运行日志查询条件不正确。',
        fields: parsed.error.flatten().fieldErrors,
      });
    }
    return this.runtimeLogs.list(parsed.data);
  }
}
