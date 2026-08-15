import { PrismaClient, TaskType } from '@prisma/client';

export type TaskContext = { taskId: string; payload: Record<string, unknown>; signal: AbortSignal };

export abstract class AsyncTaskHandler {
  abstract readonly name: string;
  abstract readonly type: TaskType;
  abstract execute(context: TaskContext, prisma: PrismaClient): Promise<void>;
}

export type ImportRowError = { row: number; message: string; values?: Record<string, unknown> };
export type ExportCursor = string | number | null;

export abstract class AsyncImportHandler<TInput = unknown> extends AsyncTaskHandler {
  readonly type = TaskType.IMPORT;
  abstract parse(input: TInput): AsyncIterable<Record<string, unknown>>;
  abstract validate(
    row: Record<string, unknown>,
    context: TaskContext,
  ): Promise<ImportRowError | null>;
  abstract persist(
    rows: Record<string, unknown>[],
    context: TaskContext,
    prisma: PrismaClient,
  ): Promise<number>;
}

export abstract class AsyncExportHandler<TRow = unknown> extends AsyncTaskHandler {
  readonly type = TaskType.EXPORT;
  abstract readBatch(
    cursor: ExportCursor,
    context: TaskContext,
    prisma: PrismaClient,
  ): Promise<{ rows: TRow[]; nextCursor: ExportCursor }>;
  abstract transform(row: TRow, context: TaskContext): Promise<Record<string, unknown>>;
  abstract writeBatch(rows: Record<string, unknown>[], context: TaskContext): Promise<void>;
}

export class HandlerRegistry {
  private readonly handlers = new Map<string, AsyncTaskHandler>();

  register(handler: AsyncTaskHandler) {
    if (this.handlers.has(handler.name)) throw new Error(`任务处理器已注册：${handler.name}`);
    this.handlers.set(handler.name, handler);
  }

  get(name: string): AsyncTaskHandler | undefined {
    return this.handlers.get(name);
  }
}
