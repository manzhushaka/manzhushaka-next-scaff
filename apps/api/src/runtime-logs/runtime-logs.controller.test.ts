import { BadRequestException } from '@nestjs/common';
import { loadEnv } from '@manzhushaka/config';
import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { RuntimeLogsController } from './runtime-logs.controller.js';

function createController() {
  const runtimeLogs = { list: vi.fn() };
  const auth = { requirePermission: vi.fn() };
  return {
    runtimeLogs,
    auth,
    controller: new RuntimeLogsController(runtimeLogs as never, auth as never),
  };
}

function requestWithSession(): Request {
  return {
    cookies: { [loadEnv().SESSION_COOKIE_NAME]: 'session-token' },
  } as unknown as Request;
}

describe('运行日志控制器', () => {
  it('使用运行日志权限并将合法查询交给服务层', async () => {
    const { runtimeLogs, auth, controller } = createController();
    auth.requirePermission.mockResolvedValue({ id: 'admin-1' });
    runtimeLogs.list.mockResolvedValue({ items: [], nextCursor: null });

    await expect(
      controller.list(requestWithSession(), {
        level: 'ERROR',
        service: 'api',
        keyword: 'database',
        limit: '20',
      }),
    ).resolves.toEqual({ items: [], nextCursor: null });

    expect(auth.requirePermission).toHaveBeenCalledWith('session-token', 'security:runtime-logs');
    expect(runtimeLogs.list).toHaveBeenCalledWith({
      level: 'ERROR',
      service: 'api',
      keyword: 'database',
      limit: 20,
    });
  });

  it('拒绝非法级别和分页参数', async () => {
    const { auth, controller } = createController();
    auth.requirePermission.mockResolvedValue({ id: 'admin-1' });

    await expect(
      controller.list(requestWithSession(), { level: 'TRACE', limit: '0' }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: expect.objectContaining({ code: 'RUNTIME_LOG_QUERY_INVALID' }),
    });
  });
});
