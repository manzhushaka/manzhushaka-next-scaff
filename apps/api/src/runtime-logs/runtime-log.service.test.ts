import { describe, expect, it, vi } from 'vitest';
import { sanitizeRuntimeLogText } from '@manzhushaka/contracts';
import type { PrismaService } from '../prisma.service.js';
import { RuntimeLogService } from './runtime-log.service.js';

function createService() {
  const runtimeLog = {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  };
  return {
    runtimeLog,
    service: new RuntimeLogService({ runtimeLog } as unknown as PrismaService),
  };
}

describe('运行日志服务', () => {
  it('脱敏文本中的认证头和连接字符串凭据', () => {
    expect(
      sanitizeRuntimeLogText(
        'Authorization: Bearer secret-token mysql://operator:db-password@example.test:3306/console',
      ),
    ).toBe('Authorization: [已脱敏] mysql://operator:[已脱敏]@example.test:3306/console');
  });

  it('写入前会脱敏消息和上下文中的敏感字段', async () => {
    const { runtimeLog, service } = createService();
    runtimeLog.create.mockResolvedValue({});

    await service.record({
      level: 'INFO',
      service: 'api',
      message: 'login password=plain-text',
      context: {
        username: 'admin',
        authorization: 'Bearer secret-token',
        nested: { sessionId: 'session-1' },
      },
    });

    expect(runtimeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        message: 'login password=[已脱敏]',
        contextJson: {
          username: 'admin',
          authorization: '[已脱敏]',
          nested: { sessionId: '[已脱敏]' },
        },
      }),
    });
  });

  it('使用最后一条已返回记录作为下一页游标', async () => {
    const { runtimeLog, service } = createService();
    const createdAt = new Date('2026-08-16T08:00:00.000Z');
    runtimeLog.findMany.mockResolvedValue(
      ['log-3', 'log-2', 'log-1'].map((id) => ({
        id,
        level: 'INFO',
        service: 'api',
        message: id,
        contextJson: null,
        stack: null,
        createdAt,
      })),
    );

    await expect(service.list({ limit: 2 })).resolves.toMatchObject({
      items: [{ id: 'log-3' }, { id: 'log-2' }],
      nextCursor: 'log-2',
    });
  });
});
