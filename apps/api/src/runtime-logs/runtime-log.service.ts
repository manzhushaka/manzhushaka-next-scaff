import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, RuntimeLogLevel as PrismaRuntimeLogLevel } from '@prisma/client';
import {
  runtimeLogLevelSchema,
  sanitizeRuntimeLogText,
  sanitizeRuntimeLogValue,
  type RuntimeLogItem,
  type RuntimeLogJsonValue,
  type RuntimeLogLevel,
  type RuntimeLogQuery,
} from '@manzhushaka/contracts';
import { loadEnv } from '@manzhushaka/config';
import { PrismaService } from '../prisma.service.js';

type RuntimeLogInput = {
  level: RuntimeLogLevel;
  service: string;
  message: unknown;
  context?: unknown;
  stack?: unknown;
};

function formatMessage(value: unknown): string {
  if (value instanceof Error) return sanitizeRuntimeLogText(value.message);
  if (typeof value === 'string') return sanitizeRuntimeLogText(value);
  try {
    return sanitizeRuntimeLogText(JSON.stringify(sanitizeRuntimeLogValue(value)));
  } catch {
    return '[无法序列化的日志消息]';
  }
}

function formatContext(value: unknown): Record<string, RuntimeLogJsonValue> | null {
  if (value === undefined) return null;
  const sanitized = sanitizeRuntimeLogValue(value);
  if (typeof sanitized === 'object' && sanitized !== null && !Array.isArray(sanitized)) {
    return sanitized as Record<string, RuntimeLogJsonValue>;
  }
  return { value: sanitized };
}

function formatErrorMessage(error: unknown): string {
  return sanitizeRuntimeLogText(error instanceof Error ? error.message : String(error));
}

@Injectable()
export class RuntimeLogService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const env = loadEnv();
    const cutoff = new Date(Date.now() - env.LOG_RETENTION_DAYS * 86_400_000);
    try {
      await this.prisma.runtimeLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          service: 'api',
          message: '运行日志过期数据清理失败',
          error: formatErrorMessage(error),
        }) + '\n',
      );
    }
  }

  async record(input: RuntimeLogInput): Promise<void> {
    const level = runtimeLogLevelSchema.parse(input.level);
    const context = formatContext(input.context);
    const data: Prisma.RuntimeLogCreateInput = {
      level: level as PrismaRuntimeLogLevel,
      service: input.service.slice(0, 32),
      message: formatMessage(input.message),
      contextJson: context === null ? Prisma.JsonNull : (context as Prisma.InputJsonValue),
      stack: typeof input.stack === 'string' ? sanitizeRuntimeLogText(input.stack) : null,
    };
    try {
      await this.prisma.runtimeLog.create({ data });
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          service: 'api',
          message: '运行日志写入失败',
          error: formatErrorMessage(error),
        }) + '\n',
      );
    }
  }

  async list(
    query: RuntimeLogQuery,
  ): Promise<{ items: RuntimeLogItem[]; nextCursor: string | null }> {
    const conditions: Prisma.RuntimeLogWhereInput[] = [];
    if (query.level) conditions.push({ level: query.level as PrismaRuntimeLogLevel });
    if (query.service) conditions.push({ service: query.service });
    if (query.keyword) {
      conditions.push({
        OR: [{ message: { contains: query.keyword } }, { service: { contains: query.keyword } }],
      });
    }
    if (query.cursor) {
      const cursorLog = await this.prisma.runtimeLog.findUnique({ where: { id: query.cursor } });
      if (cursorLog) {
        conditions.push({
          OR: [
            { createdAt: { lt: cursorLog.createdAt } },
            { createdAt: cursorLog.createdAt, id: { lt: cursorLog.id } },
          ],
        });
      }
    }

    const rows = await this.prisma.runtimeLog.findMany({
      ...(conditions.length ? { where: { AND: conditions } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const pageRows = rows.slice(0, query.limit);
    const items = pageRows.map((row) => ({
      id: row.id,
      level: row.level as RuntimeLogLevel,
      service: row.service,
      message: row.message,
      context:
        row.contextJson && typeof row.contextJson === 'object' && !Array.isArray(row.contextJson)
          ? (row.contextJson as Record<string, unknown>)
          : null,
      stack: row.stack,
      createdAt: row.createdAt.toISOString(),
    }));
    return {
      items,
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }
}

@Injectable()
export class RuntimeLoggerService {
  constructor(private readonly runtimeLogs: RuntimeLogService) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('INFO', message, this.contextFrom(optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('WARN', message, this.contextFrom(optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const stack = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    const context =
      typeof optionalParams[1] === 'string' ? { context: optionalParams[1] } : undefined;
    this.write('ERROR', message, context, stack);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('DEBUG', message, this.contextFrom(optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('DEBUG', message, this.contextFrom(optionalParams));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('FATAL', message, this.contextFrom(optionalParams));
  }

  write(
    level: RuntimeLogLevel,
    message: unknown,
    context?: Record<string, unknown>,
    stack?: string,
  ): void {
    const output = {
      timestamp: new Date().toISOString(),
      level,
      service: 'api',
      message: formatMessage(message),
      ...(context ? { context: sanitizeRuntimeLogValue(context) } : {}),
      ...(stack ? { stack: sanitizeRuntimeLogText(stack) } : {}),
    };
    const line = JSON.stringify(output) + '\n';
    if (level === 'ERROR' || level === 'FATAL') process.stderr.write(line);
    else process.stdout.write(line);
    void this.runtimeLogs.record({ level, service: 'api', message, context, stack });
  }

  private contextFrom(optionalParams: unknown[]): Record<string, string> | undefined {
    const context = optionalParams[0];
    return typeof context === 'string' ? { context } : undefined;
  }
}
