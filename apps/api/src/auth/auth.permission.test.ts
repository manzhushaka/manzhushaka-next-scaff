import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma.service.js';

function createService() {
  const prisma = {
    userRole: { findMany: vi.fn() },
    rolePermission: { findFirst: vi.fn() },
  };
  const service = new AuthService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('系统参数权限', () => {
  it('拒绝没有有效会话的访问', async () => {
    const { service } = createService();
    vi.spyOn(service, 'getUserBySession').mockResolvedValue(null);
    await expect(service.requirePermission(undefined, 'system:parameters')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('超级管理员拥有全部系统参数权限', async () => {
    const { prisma, service } = createService();
    const user = { id: 'user-1' };
    vi.spyOn(service, 'getUserBySession').mockResolvedValue(user as never);
    prisma.userRole.findMany.mockResolvedValue([
      { roleId: 'role-1', role: { code: 'super_admin' } },
    ]);
    await expect(service.requirePermission('token', 'system:parameters:update')).resolves.toBe(
      user,
    );
    expect(prisma.rolePermission.findFirst).not.toHaveBeenCalled();
  });

  it('拒绝缺少修改权限的普通管理员', async () => {
    const { prisma, service } = createService();
    vi.spyOn(service, 'getUserBySession').mockResolvedValue({ id: 'user-1' } as never);
    prisma.userRole.findMany.mockResolvedValue([{ roleId: 'role-1', role: { code: 'operator' } }]);
    prisma.rolePermission.findFirst.mockResolvedValue(null);
    await expect(
      service.requirePermission('token', 'system:parameters:update'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
