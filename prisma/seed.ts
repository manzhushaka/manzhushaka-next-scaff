import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.upsert({
    where: { code: 'super_admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'super_admin',
      description: '拥有平台全部管理权限',
      dataScope: 'ALL',
      builtin: true,
    },
  });

  const menus = [
    ['工作台', 'dashboard', 'PAGE', '/dashboard'],
    ['组织管理', 'organization', 'DIRECTORY', null],
    ['用户管理', 'organization:users', 'PAGE', '/users'],
    ['角色管理', 'organization:roles', 'PAGE', '/roles'],
    ['菜单权限', 'organization:menus', 'PAGE', '/menus'],
    ['系统管理', 'system', 'DIRECTORY', null],
    ['系统参数', 'system:parameters', 'PAGE', '/system-params'],
    ['安全中心', 'security', 'DIRECTORY', null],
    ['操作日志', 'security:audit', 'PAGE', '/operation-logs'],
    ['慢 SQL', 'security:slow-sql', 'PAGE', '/slow-sql'],
    ['异步任务', 'operations:tasks', 'PAGE', '/async-tasks'],
  ] as const;

  for (const [name, code, type, path] of menus) {
    const menu = await prisma.menu.upsert({
      where: { code },
      update: { name, type, path },
      create: { name, code, type, path },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_menuId: { roleId: role.id, menuId: menu.id } },
      update: {},
      create: { roleId: role.id, menuId: menu.id },
    });
  }
}

main().finally(() => prisma.$disconnect());
