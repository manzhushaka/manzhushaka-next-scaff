import { describe, expect, it, vi } from 'vitest';
import { ResourcesController } from './resources.controller.js';

describe('ResourcesController', () => {
  it('查询资源前先校验会话权限并规范化查询参数', async () => {
    const auth = { requirePermission: vi.fn().mockResolvedValue({ id: 'actor-1' }) };
    const resources = { listUsers: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }) };
    const controller = new ResourcesController(resources as never, auth as never);
    const request = {
      cookies: { manzhushaka_session: 'session-token' },
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/api/users?page=1',
      get: vi.fn().mockReturnValue('test-agent'),
    } as never;

    await controller.listUsers(request, { keyword: ['alice'], page: ['1'], pageSize: ['20'] });

    expect(auth.requirePermission).toHaveBeenCalledWith('session-token', 'organization:users');
    expect(resources.listUsers).toHaveBeenCalledWith({ keyword: 'alice', page: '1', pageSize: '20' });
  });
});
