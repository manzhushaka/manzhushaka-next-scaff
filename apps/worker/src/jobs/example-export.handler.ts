import { PrismaClient, TaskType } from '@prisma/client';
import { AsyncTaskHandler, TaskContext } from '../task-handler.js';

export class ExampleExportHandler extends AsyncTaskHandler {
  readonly name = 'system:example-export';
  readonly type = TaskType.EXPORT;

  async execute(context: TaskContext, prisma: PrismaClient): Promise<void> {
    // 示例处理器只证明任务扩展点，不生成虚假业务文件；具体模块必须提供真实 BOS 输出。
    await prisma.asyncTask.update({
      where: { id: context.taskId },
      data: { processed: 0, total: 0 },
    });
  }
}
