import { describe, expect, it } from 'vitest';
import { HandlerRegistry, type AsyncTaskHandler } from './task-handler.js';

describe('异步任务处理器注册表', () => {
  it('拒绝重复的处理器名称', () => {
    const registry = new HandlerRegistry();
    const handler = {
      name: 'test',
      type: 'EXPORT',
      execute: async () => undefined,
    } as unknown as AsyncTaskHandler;
    registry.register(handler);
    expect(() => registry.register(handler)).toThrow('任务处理器已注册');
  });
});
