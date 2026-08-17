import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MenuType,
  Prisma,
  TaskStatus,
  TaskType,
  UserStatus,
  type User,
} from '@prisma/client';
import { asyncTaskCreateSchema, resourceQuerySchema, type ResourceQuery } from '@manzhushaka/contracts';
import { hashPassword } from '@manzhushaka/security';
import { PrismaService } from '../prisma.service.js';
import { BosStorageService } from '../storage/bos.service.js';

type AuditContext = {
  actorId: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
  method: string;
  path: string;
};

type ResourceActor = User & { roles: Array<{ roleId: string }> };
type TaskUpload = { buffer: Buffer; mimetype: string; originalname: string; size: number };

function parseQuery(input: Record<string, unknown>): ResourceQuery {
  const result = resourceQuerySchema.safeParse(input);
  if (!result.success) throw new BadRequestException('查询条件不正确。');
  if (result.data.createdFrom && result.data.createdTo && result.data.createdFrom > result.data.createdTo) {
    throw new BadRequestException('创建时间起始日期不能晚于结束日期。');
  }
  return result.data;
}

function dateRange(query: ResourceQuery): Prisma.DateTimeFilter | undefined {
  if (!query.createdFrom && !query.createdTo) return undefined;
  return {
    ...(query.createdFrom ? { gte: new Date(query.createdFrom + 'T00:00:00.000Z') } : {}),
    ...(query.createdTo ? { lte: new Date(query.createdTo + 'T23:59:59.999Z') } : {}),
  };
}

function withCreatedRange<T extends Record<string, unknown>>(
  where: T,
  query: ResourceQuery,
): T & { createdAt?: Prisma.DateTimeFilter } {
  const range = dateRange(query);
  return range ? { ...where, createdAt: range } : where;
}

function pageArgs(query: ResourceQuery) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

function listResult<T>(items: T[], total: number, query: ResourceQuery) {
  return { items, total, page: query.page, pageSize: query.pageSize };
}

function auditData(context: AuditContext, action: string, resource: string, resourceId: string) {
  return {
    actorId: context.actorId,
    action,
    resource,
    resourceId,
    method: context.method,
    path: context.path,
    result: 'SUCCESS',
    ip: context.ip ?? null,
    userAgent: context.userAgent ?? null,
  };
}

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BosStorageService,
  ) {}

  async listUsers(input: Record<string, unknown>) {
    const query = parseQuery(input);
    const where = withCreatedRange<Prisma.UserWhereInput>({
      deletedAt: null,
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword } },
              { displayName: { contains: query.keyword } },
              { email: { contains: query.keyword } },
              { mobile: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.status && query.status !== 'all' ? { status: query.status as UserStatus } : {}),
    }, query);
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        ...pageArgs(query),
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true } },
          roles: { include: { role: { select: { id: true, name: true, code: true } } } },
        },
      }),
    ]);
    return listResult(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        department: user.department?.name ?? '未分配',
        roles: user.roles.map(({ role }) => role.name).join('、') || '未分配',
        status: user.status,
        email: user.email,
        mobile: user.mobile,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLogin: null,
      })),
      total,
      query,
    );
  }

  async createUser(input: unknown, context: AuditContext) {
    const body = this.userInput(input, true);
    const password = body.password;
    if (!password || password.length < 10) throw new BadRequestException('初始密码至少需要 10 位。');
    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const data: Prisma.UserUncheckedCreateInput = {
            username: body.username,
            displayName: body.displayName,
            passwordHash: await hashPassword(password),
            email: body.email ?? null,
            mobile: body.mobile ?? null,
            departmentId: body.departmentId ?? null,
            status: body.status ?? UserStatus.ACTIVE,
          };
        const created = await transaction.user.create({ data });
        if (body.roleIds?.length) {
          await transaction.userRole.createMany({
            data: body.roleIds.map((roleId) => ({ userId: created.id, roleId })),
          });
        }
        await transaction.auditLog.create({
          data: auditData(context, 'organization.users.create', 'User', created.id),
        });
        return created;
      });
      return { id: user.id, username: user.username, displayName: user.displayName };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('用户名已存在。');
      }
      throw error;
    }
  }

  async updateUser(id: string, input: unknown, context: AuditContext) {
    const body = this.userInput(input, false);
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('用户不存在。');
    const data: Prisma.UserUpdateInput = {
      ...(body.displayName ? { displayName: body.displayName } : {}),
      ...(body.email !== undefined ? { email: body.email ?? null } : {}),
      ...(body.mobile !== undefined ? { mobile: body.mobile ?? null } : {}),
      ...(body.departmentId !== undefined
        ? { department: body.departmentId ? { connect: { id: body.departmentId } } : { disconnect: true } }
        : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.password ? { passwordHash: await hashPassword(body.password), mustChangePassword: true } : {}),
    };
    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.user.update({ where: { id }, data });
      if (body.roleIds) {
        await transaction.userRole.deleteMany({ where: { userId: id } });
        if (body.roleIds.length) {
          await transaction.userRole.createMany({ data: body.roleIds.map((roleId) => ({ userId: id, roleId })) });
        }
      }
      await transaction.auditLog.create({ data: auditData(context, 'organization.users.update', 'User', id) });
      return result;
    });
    return { id: updated.id, username: updated.username, displayName: updated.displayName };
  }

  async deleteUser(id: string, context: AuditContext) {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: UserStatus.DELETED } });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.users.delete', 'User', id) });
    return { id };
  }

  async listRoles(input: Record<string, unknown>) {
    const query = parseQuery(input);
    const where = withCreatedRange<Prisma.RoleWhereInput>({
      deletedAt: null,
      ...(query.keyword
        ? { OR: [{ name: { contains: query.keyword } }, { code: { contains: query.keyword } }, { description: { contains: query.keyword } }] }
        : {}),
    }, query);
    const [total, roles] = await this.prisma.$transaction([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        ...pageArgs(query),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, permissions: true } } },
      }),
    ]);
    return listResult(
      roles.map((role) => ({
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        dataScope: role.dataScope,
        builtin: role.builtin,
        memberCount: role._count.users,
        permissionCount: role._count.permissions,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      })),
      total,
      query,
    );
  }

  async createRole(input: unknown, context: AuditContext) {
    const body = this.roleInput(input);
    try {
      const role = await this.prisma.role.create({ data: body });
      await this.prisma.auditLog.create({ data: auditData(context, 'organization.roles.create', 'Role', role.id) });
      return role;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('角色名称或编码已存在。');
      }
      throw error;
    }
  }

  async updateRole(id: string, input: unknown, context: AuditContext) {
    const body = this.roleInput(input);
    const existing = await this.prisma.role.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('角色不存在。');
    const role = await this.prisma.role.update({ where: { id }, data: body });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.roles.update', 'Role', id) });
    return role;
  }

  async deleteRole(id: string, context: AuditContext) {
    const role = await this.prisma.role.findFirst({ where: { id, deletedAt: null } });
    if (!role) throw new NotFoundException('角色不存在。');
    if (role.builtin) throw new BadRequestException('内置角色不能删除。');
    await this.prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.roles.delete', 'Role', id) });
    return { id };
  }

  async listMenus(input: Record<string, unknown>) {
    const query = parseQuery(input);
    const where = withCreatedRange<Prisma.MenuWhereInput>({
      ...(query.keyword ? { OR: [{ name: { contains: query.keyword } }, { code: { contains: query.keyword } }, { path: { contains: query.keyword } }] } : {}),
      ...(query.type && query.type !== 'all' ? { type: query.type as MenuType } : {}),
      ...(query.visible !== undefined ? { visible: query.visible === 'true' } : {}),
      ...(query.hierarchy === 'root' ? { parentId: null } : query.hierarchy === 'child' ? { parentId: { not: null } } : {}),
      ...(query.parentId && query.parentId !== 'all' ? { parentId: query.parentId } : {}),
    }, query);
    const [total, menus] = await this.prisma.$transaction([
      this.prisma.menu.count({ where }),
      this.prisma.menu.findMany({
        where,
        ...pageArgs(query),
        orderBy: [{ parentId: 'asc' }, { sort: 'asc' }, { createdAt: 'desc' }],
        include: { parent: { select: { id: true, name: true } }, _count: { select: { roles: true, children: true } } },
      }),
    ]);
    return listResult(
      menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        code: menu.code,
        type: menu.type,
        path: menu.path,
        parentId: menu.parentId,
        parentName: menu.parent?.name ?? '顶级节点',
        visible: menu.visible,
        sort: menu.sort,
        roleCount: menu._count.roles,
        childCount: menu._count.children,
        createdAt: menu.createdAt.toISOString(),
        updatedAt: menu.updatedAt.toISOString(),
      })),
      total,
      query,
    );
  }

  async createMenu(input: unknown, context: AuditContext) {
    const body = this.menuInput(input);
    try {
      const menu = await this.prisma.menu.create({ data: body });
      await this.prisma.auditLog.create({ data: auditData(context, 'organization.menus.create', 'Menu', menu.id) });
      return menu;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('权限编码已存在。');
      throw error;
    }
  }

  async updateMenu(id: string, input: unknown, context: AuditContext) {
    const body = this.menuInput(input);
    const existing = await this.prisma.menu.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('菜单节点不存在。');
    const menu = await this.prisma.menu.update({ where: { id }, data: body });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.menus.update', 'Menu', id) });
    return menu;
  }

  async deleteMenu(id: string, context: AuditContext) {
    const menu = await this.prisma.menu.findUnique({ where: { id }, include: { _count: { select: { children: true } } } });
    if (!menu) throw new NotFoundException('菜单节点不存在。');
    if (menu._count.children) throw new BadRequestException('请先处理子节点。');
    await this.prisma.menu.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.menus.delete', 'Menu', id) });
    return { id };
  }

  async listDepartments(input: Record<string, unknown>) {
    const query = parseQuery(input);
    const where = withCreatedRange<Prisma.DepartmentWhereInput>({
      deletedAt: null,
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
      ...(query.hierarchy === 'root' ? { parentId: null } : query.hierarchy === 'child' ? { parentId: { not: null } } : {}),
    }, query);
    const [total, departments] = await this.prisma.$transaction([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        ...pageArgs(query),
        orderBy: [{ parentId: 'asc' }, { sort: 'asc' }, { createdAt: 'desc' }],
        include: { parent: { select: { id: true, name: true } }, _count: { select: { users: true, children: true } } },
      }),
    ]);
    return listResult(
      departments.map((department) => ({
        id: department.id,
        name: department.name,
        parentName: department.parent?.name ?? '顶级部门',
        parentId: department.parentId,
        memberCount: department._count.users,
        childCount: department._count.children,
        sort: department.sort,
        createdAt: department.createdAt.toISOString(),
        updatedAt: department.updatedAt.toISOString(),
      })),
      total,
      query,
    );
  }

  async createDepartment(input: unknown, context: AuditContext) {
    const body = this.departmentInput(input);
    const department = await this.prisma.department.create({ data: body });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.departments.create', 'Department', department.id) });
    return department;
  }

  async updateDepartment(id: string, input: unknown, context: AuditContext) {
    const body = this.departmentInput(input);
    const existing = await this.prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('部门不存在。');
    const department = await this.prisma.department.update({ where: { id }, data: body });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.departments.update', 'Department', id) });
    return department;
  }

  async deleteDepartment(id: string, context: AuditContext) {
    const department = await this.prisma.department.findUnique({ where: { id }, include: { _count: { select: { users: true, children: true } } } });
    if (!department) throw new NotFoundException('部门不存在。');
    if (department._count.users || department._count.children) throw new BadRequestException('请先处理部门成员和子部门。');
    await this.prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.auditLog.create({ data: auditData(context, 'organization.departments.delete', 'Department', id) });
    return { id };
  }

  async listAuditLogs(input: Record<string, unknown>) {
    const query = parseQuery(input);
    const where = withCreatedRange<Prisma.AuditLogWhereInput>({
      ...(query.keyword ? { OR: [{ action: { contains: query.keyword } }, { resource: { contains: query.keyword } }, { result: { contains: query.keyword } }, { ip: { contains: query.keyword } }] } : {}),
    }, query);
    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, ...pageArgs(query), orderBy: { createdAt: 'desc' }, include: { actor: { select: { username: true, displayName: true } } } }),
    ]);
    return listResult(logs.map((log) => ({ ...log, actor: log.actor?.displayName ?? log.actor?.username ?? '系统', beforeJson: undefined, afterJson: undefined })), total, query);
  }

  async listSlowSql(input: Record<string, unknown>) {
    const query = parseQuery(input);
    const where = withCreatedRange<Prisma.SlowSqlLogWhereInput>({
      ...(query.keyword ? { OR: [{ model: { contains: query.keyword } }, { action: { contains: query.keyword } }, { queryText: { contains: query.keyword } }, { queryHash: { contains: query.keyword } }] } : {}),
    }, query);
    const [total, logs] = await this.prisma.$transaction([
      this.prisma.slowSqlLog.count({ where }),
      this.prisma.slowSqlLog.findMany({ where, ...pageArgs(query), orderBy: { createdAt: 'desc' } }),
    ]);
    return listResult(logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString(), queryText: log.queryText.slice(0, 1000) })), total, query);
  }

  async listTasks(actor: ResourceActor, input: Record<string, unknown>) {
    const query = parseQuery(input);
    const all = await this.hasAllTaskAccess(actor.id);
    const where = withCreatedRange<Prisma.AsyncTaskWhereInput>({
      ...(all ? {} : { createdById: actor.id }),
      ...(query.status && query.status !== 'all' ? { status: query.status as TaskStatus } : {}),
      ...(query.keyword ? { OR: [{ handler: { contains: query.keyword } }, { errorMessage: { contains: query.keyword } }] } : {}),
    }, query);
    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.asyncTask.count({ where }),
      this.prisma.asyncTask.findMany({ where, ...pageArgs(query), orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { username: true, displayName: true } } } }),
    ]);
    return listResult(
      tasks.map((task) => this.taskView(task, task.createdBy.displayName)),
      total,
      query,
    );
  }

  async createTask(
    actor: ResourceActor,
    input: unknown,
    context: AuditContext,
    file?: TaskUpload,
  ) {
    const parsed = asyncTaskCreateSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('异步任务参数不正确。');
    if (parsed.data.type === 'IMPORT' && !file) throw new BadRequestException('导入任务必须上传文件。');
    let fileKey: string | undefined;
    if (file) {
      if (!this.storage.isConfigured()) throw new ServiceUnavailableException('BOS 尚未配置，无法接收导入文件。');
      const extension = file.originalname.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
      fileKey = `async-tasks/imports/${actor.id}/${randomUUID()}.${extension}`;
      await this.storage.putObject(fileKey, file.buffer, file.mimetype);
    }
    let task;
    try {
      task = await this.prisma.asyncTask.create({
        data: {
          type: parsed.data.type as TaskType,
          handler: parsed.data.handler,
          createdById: actor.id,
          ...(fileKey ? { fileKey } : {}),
          payloadJson: (parsed.data.payload ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (fileKey) await this.storage.deleteObject(fileKey).catch(() => undefined);
      throw error;
    }
    await this.prisma.auditLog.create({ data: auditData(context, 'operations.tasks.create', 'AsyncTask', task.id) });
    return this.taskView(task, actor.displayName);
  }

  async updateTask(actor: ResourceActor, id: string, action: 'cancel' | 'retry', context: AuditContext) {
    const all = await this.hasAllTaskAccess(actor.id);
    const task = await this.prisma.asyncTask.findFirst({ where: { id, ...(all ? {} : { createdById: actor.id }) } });
    if (!task) throw new NotFoundException('异步任务不存在。');
    if (action === 'cancel' && task.status !== TaskStatus.PENDING && task.status !== TaskStatus.RUNNING) throw new BadRequestException('当前任务不能取消。');
    if (action === 'retry' && task.status !== TaskStatus.FAILED && task.status !== TaskStatus.CANCELED) throw new BadRequestException('当前任务不能重试。');
    const updated = await this.prisma.asyncTask.update({ where: { id }, data: action === 'cancel' ? { status: TaskStatus.CANCELED, finishedAt: new Date() } : { status: TaskStatus.PENDING, processed: 0, errorMessage: null, startedAt: null, finishedAt: null } });
    await this.prisma.auditLog.create({ data: auditData(context, `operations.tasks.${action}`, 'AsyncTask', id) });
    return this.taskView(updated);
  }

  async taskDownload(actor: ResourceActor, id: string) {
    const all = await this.hasAllTaskAccess(actor.id);
    const task = await this.prisma.asyncTask.findFirst({ where: { id, ...(all ? {} : { createdById: actor.id }) } });
    if (!task) throw new NotFoundException('异步任务不存在。');
    if (!task.resultFileKey) throw new BadRequestException('当前任务没有可下载的结果文件。');
    if (!this.storage.isConfigured()) throw new ServiceUnavailableException('BOS 尚未配置。');
    return { url: await this.storage.createDownloadUrl(task.resultFileKey), expiresAt: new Date(Date.now() + 300_000).toISOString() };
  }

  async dashboardSummary() {
    const since = new Date(Date.now() - 86_400_000);
    const [userCount, sessionCount, taskCount, slowSqlCount, activityRows] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
      this.prisma.asyncTask.count({ where: { status: { in: [TaskStatus.PENDING, TaskStatus.RUNNING] } } }),
      this.prisma.slowSqlLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.auditLog.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
    ]);
    const buckets = Array.from({ length: 24 }, (_, index) => {
      const start = new Date(Date.now() - (23 - index) * 3_600_000);
      start.setMinutes(0, 0, 0);
      return { hour: start.toISOString(), count: 0 };
    });
    const counts = new Map(buckets.map((bucket) => [bucket.hour, bucket]));
    for (const row of activityRows) {
      const hour = new Date(row.createdAt);
      hour.setMinutes(0, 0, 0);
      const bucket = counts.get(hour.toISOString());
      if (bucket) bucket.count += 1;
    }
    return {
      users: userCount,
      activeSessions: sessionCount,
      pendingTasks: taskCount,
      slowSqlLast24Hours: slowSqlCount,
      activity: buckets,
    };
  }

  private userInput(input: unknown, requirePassword: boolean) {
    const body = input as Record<string, unknown>;
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (requirePassword && (!username || !displayName)) throw new BadRequestException('用户名和显示名称不能为空。');
    const password = typeof body.password === 'string' ? body.password : undefined;
    return { username, displayName, password, email: typeof body.email === 'string' ? body.email.trim() || null : body.email === null ? null : undefined, mobile: typeof body.mobile === 'string' ? body.mobile.trim() || null : body.mobile === null ? null : undefined, departmentId: typeof body.departmentId === 'string' ? body.departmentId || null : body.departmentId === null ? null : undefined, roleIds: Array.isArray(body.roleIds) && body.roleIds.every((value) => typeof value === 'string') ? body.roleIds as string[] : undefined, status: typeof body.status === 'string' ? body.status as UserStatus : undefined };
  }

  private roleInput(input: unknown): Prisma.RoleCreateInput {
    const body = input as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!name || !code) throw new BadRequestException('角色名称和编码不能为空。');
    return { name, code, description: typeof body.description === 'string' ? body.description.trim() || null : null, dataScope: typeof body.dataScope === 'string' ? body.dataScope.trim() || 'SELF' : 'SELF' };
  }

  private menuInput(input: unknown): Prisma.MenuCreateInput {
    const body = input as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const type = typeof body.type === 'string' ? body.type as MenuType : undefined;
    if (!name || !code || !type || !Object.values(MenuType).includes(type)) throw new BadRequestException('菜单名称、编码和类型不能为空。');
    return { name, code, type, path: typeof body.path === 'string' ? body.path.trim() || null : null, icon: typeof body.icon === 'string' ? body.icon.trim() || null : null, sort: typeof body.sort === 'number' ? body.sort : 0, visible: typeof body.visible === 'boolean' ? body.visible : true, ...(typeof body.parentId === 'string' && body.parentId ? { parent: { connect: { id: body.parentId } } } : {}) };
  }

  private departmentInput(input: unknown): Prisma.DepartmentCreateInput {
    const body = input as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('部门名称不能为空。');
    return { name, sort: typeof body.sort === 'number' ? body.sort : 0, ...(typeof body.parentId === 'string' && body.parentId ? { parent: { connect: { id: body.parentId } } } : {}) };
  }

  private async hasAllTaskAccess(userId: string) {
    const role = await this.prisma.userRole.findFirst({
      where: { userId, role: { code: 'super_admin' } },
      select: { userId: true },
    });
    return Boolean(role);
  }

  private taskView(
    task: {
      id: string;
      type: TaskType;
      handler: string;
      status: TaskStatus;
      total: number;
      processed: number;
      successCount: number;
      failureCount: number;
      errorMessage: string | null;
      fileKey: string | null;
      createdAt: Date;
      updatedAt: Date;
      startedAt: Date | null;
      finishedAt: Date | null;
    },
    createdBy?: string,
  ) {
    return {
      id: task.id,
      type: task.type,
      handler: task.handler,
      status: task.status,
      total: task.total,
      processed: task.processed,
      successCount: task.successCount,
      failureCount: task.failureCount,
      hasFile: Boolean(task.fileKey),
      errorMessage: task.errorMessage,
      ...(createdBy ? { createdBy } : {}),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      startedAt: task.startedAt?.toISOString() ?? null,
      finishedAt: task.finishedAt?.toISOString() ?? null,
    };
  }
}
