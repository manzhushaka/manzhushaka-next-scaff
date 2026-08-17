import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { loadEnv } from '@manzhushaka/config';
import { AuthService } from '../auth/auth.service.js';
import { ResourcesService } from './resources.service.js';

type QueryValue = string | string[] | undefined;
type ResourceQuery = Record<string, QueryValue>;
type TaskUpload = { buffer: Buffer; mimetype: string; originalname: string; size: number };

function firstQueryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeQuery(query: ResourceQuery): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, firstQueryValue(value)]),
  );
}

@Controller()
export class ResourcesController {
  constructor(
    private readonly resources: ResourcesService,
    private readonly auth: AuthService,
  ) {}

  @Get('users')
  @Header('Cache-Control', 'no-store')
  async listUsers(@Req() request: Request, @Query() query: ResourceQuery) {
    await this.requirePermission(request, 'organization:users');
    return this.resources.listUsers(normalizeQuery(query));
  }

  @Get('dashboard/summary')
  @Header('Cache-Control', 'no-store')
  async dashboardSummary(@Req() request: Request) {
    await this.requirePermission(request, 'dashboard');
    return this.resources.dashboardSummary();
  }

  @Post('users')
  async createUser(@Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:users');
    return this.resources.createUser(body, this.auditContext(request, actor.id));
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:users');
    return this.resources.updateUser(id, body, this.auditContext(request, actor.id));
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:users');
    return this.resources.deleteUser(id, this.auditContext(request, actor.id));
  }

  @Get('roles')
  @Header('Cache-Control', 'no-store')
  async listRoles(@Req() request: Request, @Query() query: ResourceQuery) {
    await this.requirePermission(request, 'organization:roles');
    return this.resources.listRoles(normalizeQuery(query));
  }

  @Post('roles')
  async createRole(@Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:roles');
    return this.resources.createRole(body, this.auditContext(request, actor.id));
  }

  @Patch('roles/:id')
  async updateRole(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:roles');
    return this.resources.updateRole(id, body, this.auditContext(request, actor.id));
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:roles');
    return this.resources.deleteRole(id, this.auditContext(request, actor.id));
  }

  @Get('menus')
  @Header('Cache-Control', 'no-store')
  async listMenus(@Req() request: Request, @Query() query: ResourceQuery) {
    await this.requirePermission(request, 'organization:menus');
    return this.resources.listMenus(normalizeQuery(query));
  }

  @Post('menus')
  async createMenu(@Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:menus');
    return this.resources.createMenu(body, this.auditContext(request, actor.id));
  }

  @Patch('menus/:id')
  async updateMenu(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:menus');
    return this.resources.updateMenu(id, body, this.auditContext(request, actor.id));
  }

  @Delete('menus/:id')
  async deleteMenu(@Param('id') id: string, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:menus');
    return this.resources.deleteMenu(id, this.auditContext(request, actor.id));
  }

  @Get('departments')
  @Header('Cache-Control', 'no-store')
  async listDepartments(@Req() request: Request, @Query() query: ResourceQuery) {
    await this.requirePermission(request, 'organization:departments');
    return this.resources.listDepartments(normalizeQuery(query));
  }

  @Post('departments')
  async createDepartment(@Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:departments');
    return this.resources.createDepartment(body, this.auditContext(request, actor.id));
  }

  @Patch('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:departments');
    return this.resources.updateDepartment(id, body, this.auditContext(request, actor.id));
  }

  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'organization:departments');
    return this.resources.deleteDepartment(id, this.auditContext(request, actor.id));
  }

  @Get('audit-logs')
  @Header('Cache-Control', 'no-store')
  async listAuditLogs(@Req() request: Request, @Query() query: ResourceQuery) {
    await this.requirePermission(request, 'security:audit');
    return this.resources.listAuditLogs(normalizeQuery(query));
  }

  @Get('slow-sql')
  @Header('Cache-Control', 'no-store')
  async listSlowSql(@Req() request: Request, @Query() query: ResourceQuery) {
    await this.requirePermission(request, 'security:slow-sql');
    return this.resources.listSlowSql(normalizeQuery(query));
  }

  @Get('async-tasks')
  @Header('Cache-Control', 'no-store')
  async listTasks(@Req() request: Request, @Query() query: ResourceQuery) {
    const actor = await this.requirePermission(request, 'operations:tasks');
    return this.resources.listTasks(actor, normalizeQuery(query));
  }

  @Post('async-tasks')
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 20 * 1024 * 1024 } }))
  async createTask(
    @Body() body: Record<string, unknown>,
    @UploadedFile() file: TaskUpload | undefined,
    @Req() request: Request,
  ) {
    const actor = await this.requirePermission(request, 'operations:tasks');
    if (file && body.type !== 'IMPORT') throw new BadRequestException('只有导入任务可以上传文件。');
    return this.resources.createTask(actor, body, this.auditContext(request, actor.id), file);
  }

  @Post('async-tasks/:id/cancel')
  async cancelTask(@Param('id') id: string, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'operations:tasks');
    return this.resources.updateTask(actor, id, 'cancel', this.auditContext(request, actor.id));
  }

  @Post('async-tasks/:id/retry')
  async retryTask(@Param('id') id: string, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'operations:tasks');
    return this.resources.updateTask(actor, id, 'retry', this.auditContext(request, actor.id));
  }

  @Get('async-tasks/:id/download')
  async downloadTask(@Param('id') id: string, @Req() request: Request) {
    const actor = await this.requirePermission(request, 'operations:tasks');
    return this.resources.taskDownload(actor, id);
  }

  private requirePermission(request: Request, permissionCode: string) {
    const token = request.cookies?.[loadEnv().SESSION_COOKIE_NAME] as string | undefined;
    return this.auth.requirePermission(token, permissionCode);
  }

  private auditContext(request: Request, actorId: string) {
    return {
      actorId,
      method: request.method,
      path: request.originalUrl,
      ...(request.ip ? { ip: request.ip } : {}),
      ...(request.get('user-agent') ? { userAgent: request.get('user-agent') } : {}),
    };
  }
}
