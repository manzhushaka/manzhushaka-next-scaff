import {
  Prisma,
  PrismaClient,
  RuntimeLogLevel as PrismaRuntimeLogLevel,
  TaskStatus,
} from '@prisma/client';
import {
  sanitizeRuntimeLogText,
  sanitizeRuntimeLogValue,
  type RuntimeLogLevel,
} from '@manzhushaka/contracts';
import pino from 'pino';
import { HandlerRegistry } from './task-handler.js';
import { ExampleExportHandler } from './jobs/example-export.handler.js';

const logger = pino({ name: 'manzhushaka-worker' });
const prisma = new PrismaClient();
const registry = new HandlerRegistry();
registry.register(new ExampleExportHandler());

async function writeRuntimeLog(
  level: RuntimeLogLevel,
  message: string,
  context?: Record<string, unknown>,
  stack?: string,
) {
  const safeMessage = sanitizeRuntimeLogText(message);
  const safeContext = context ? sanitizeRuntimeLogValue(context) : undefined;
  const consoleContext =
    safeContext && typeof safeContext === 'object' && !Array.isArray(safeContext)
      ? safeContext
      : undefined;
  if (level === 'ERROR') logger.error(consoleContext, safeMessage);
  else if (level === 'FATAL') logger.fatal(consoleContext, safeMessage);
  else if (level === 'WARN') logger.warn(consoleContext, safeMessage);
  else if (level === 'DEBUG') logger.debug(consoleContext, safeMessage);
  else logger.info(consoleContext, safeMessage);

  try {
    await prisma.runtimeLog.create({
      data: {
        level: level as PrismaRuntimeLogLevel,
        service: 'worker',
        message: safeMessage,
        contextJson: (safeContext ?? null) as Prisma.InputJsonValue,
        stack: stack ? sanitizeRuntimeLogText(stack) : null,
      },
    });
  } catch (error) {
    logger.error({ error: sanitizeRuntimeLogValue(error) }, '运行日志写入失败');
  }
}

let stopping = false;
process.on('SIGTERM', () => {
  stopping = true;
});
process.on('SIGINT', () => {
  stopping = true;
});

async function claimTask() {
  return prisma.$transaction(async (tx) => {
    const task = await tx.asyncTask.findFirst({
      where: { status: TaskStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
    if (!task) return null;
    const updated = await tx.asyncTask.updateMany({
      where: { id: task.id, status: TaskStatus.PENDING },
      data: { status: TaskStatus.RUNNING, startedAt: new Date() },
    });
    return updated.count === 1 ? task : null;
  });
}

async function run() {
  await prisma.$connect();
  await writeRuntimeLog('INFO', 'Worker 已启动，等待异步任务');
  while (!stopping) {
    const task = await claimTask();
    if (!task) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    const handler = registry.get(task.handler);
    if (!handler) {
      await writeRuntimeLog('WARN', '找不到异步任务处理器', {
        taskId: task.id,
        handler: task.handler,
      });
      await prisma.asyncTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.FAILED,
          errorMessage: `找不到任务处理器：${task.handler}`,
          finishedAt: new Date(),
        },
      });
      continue;
    }
    try {
      const controller = new AbortController();
      await handler.execute(
        {
          taskId: task.id,
          payload: (task.payloadJson ?? {}) as Record<string, unknown>,
          signal: controller.signal,
        },
        prisma,
      );
      await prisma.asyncTask.update({
        where: { id: task.id },
        data: { status: TaskStatus.SUCCESS, finishedAt: new Date() },
      });
      await writeRuntimeLog('INFO', '异步任务执行成功', {
        taskId: task.id,
        handler: task.handler,
      });
    } catch (error) {
      await writeRuntimeLog(
        'ERROR',
        '异步任务执行失败',
        { error, taskId: task.id, handler: task.handler },
        error instanceof Error ? error.stack : undefined,
      );
      await prisma.asyncTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.FAILED,
          errorMessage: error instanceof Error ? sanitizeRuntimeLogText(error.message) : '未知错误',
          finishedAt: new Date(),
        },
      });
    }
  }
  await prisma.$disconnect();
}

run().catch(async (error: unknown) => {
  await writeRuntimeLog(
    'FATAL',
    error instanceof Error ? error.message : 'Worker 遇到未知致命错误',
    { error },
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
