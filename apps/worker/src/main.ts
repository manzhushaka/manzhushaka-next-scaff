import { PrismaClient, TaskStatus } from '@prisma/client';
import pino from 'pino';
import { HandlerRegistry } from './task-handler.js';
import { ExampleExportHandler } from './jobs/example-export.handler.js';

const logger = pino({ name: 'manzhushaka-worker' });
const prisma = new PrismaClient();
const registry = new HandlerRegistry();
registry.register(new ExampleExportHandler());

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
  logger.info('Worker 已启动，等待异步任务');
  while (!stopping) {
    const task = await claimTask();
    if (!task) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    const handler = registry.get(task.handler);
    if (!handler) {
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
    } catch (error) {
      logger.error({ err: error, taskId: task.id }, '异步任务执行失败');
      await prisma.asyncTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : '未知错误',
          finishedAt: new Date(),
        },
      });
    }
  }
  await prisma.$disconnect();
}

run().catch((error: unknown) => {
  logger.fatal(error);
  process.exitCode = 1;
});
