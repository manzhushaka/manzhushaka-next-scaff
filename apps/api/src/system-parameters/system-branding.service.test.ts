import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma.service.js';
import type { BosStorageService } from '../storage/bos.service.js';
import { SystemBrandingService } from './system-branding.service.js';

function createService() {
  const transaction = {
    systemParameter: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  };
  const prisma = {
    systemParameter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<void>) =>
      operation(transaction),
    ),
  };
  const storage = {
    isConfigured: vi.fn().mockReturnValue(true),
    putObject: vi.fn(),
    deleteObject: vi.fn(),
    createDownloadUrl: vi.fn(),
  };
  return {
    prisma,
    storage,
    transaction,
    service: new SystemBrandingService(
      prisma as unknown as PrismaService,
      storage as unknown as BosStorageService,
    ),
  };
}

describe('系统品牌服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('读取已保存参数并生成稳定资源地址', async () => {
    const { prisma, service } = createService();
    const updatedAt = new Date('2026-08-16T08:00:00.000Z');
    prisma.systemParameter.findMany.mockResolvedValue([
      { key: 'branding.systemName', value: '测试控制台', updatedAt },
      { key: 'branding.shortName', value: '测试', updatedAt },
      { key: 'branding.loginTitle', value: '欢迎登录', updatedAt },
      { key: 'branding.logoFileKey', value: 'system-branding/logo/a.png', updatedAt },
    ]);

    await expect(service.getBranding()).resolves.toEqual({
      systemName: '测试控制台',
      shortName: '测试',
      loginTitle: '欢迎登录',
      logoUrl: `/api/public/system-branding/logo?v=${updatedAt.getTime()}`,
      faviconUrl: null,
      updatedAt: updatedAt.toISOString(),
    });
  });

  it('保存基础品牌参数时同步写入审计日志', async () => {
    const { prisma, service, transaction } = createService();
    prisma.systemParameter.findMany.mockResolvedValue([]);
    await service.updateBranding(
      { systemName: '测试控制台', shortName: '测试', loginTitle: '欢迎登录' },
      {
        actorId: 'user-1',
        ip: '127.0.0.1',
        method: 'PUT',
        path: '/api/system-parameters/branding',
        userAgent: 'vitest',
      },
    );
    expect(transaction.systemParameter.upsert).toHaveBeenCalledTimes(3);
    expect(transaction.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'system.parameters.update-branding',
          result: 'SUCCESS',
        }),
      }),
    );
  });

  it('拒绝声明为 PNG 但内容不匹配的上传', async () => {
    const { service } = createService();
    await expect(
      service.uploadAsset(
        'logo',
        {
          buffer: Buffer.from('not-a-png'),
          mimetype: 'image/png',
          originalname: 'logo.png',
          size: 9,
        },
        {
          actorId: 'user-1',
          ip: undefined,
          method: 'POST',
          path: '/api/system-parameters/branding/assets/logo',
          userAgent: undefined,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
