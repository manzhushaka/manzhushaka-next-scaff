import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { loadEnv } from '@manzhushaka/config';
import type {
  BrandingAssetKind,
  SystemBranding,
  SystemBrandingInput,
} from '@manzhushaka/contracts';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { BosStorageService } from '../storage/bos.service.js';

const KEYS = {
  systemName: 'branding.systemName',
  shortName: 'branding.shortName',
  loginTitle: 'branding.loginTitle',
  logo: 'branding.logoFileKey',
  favicon: 'branding.faviconFileKey',
} as const;

const DESCRIPTIONS: Record<string, string> = {
  [KEYS.systemName]: '系统完整名称',
  [KEYS.shortName]: '导航栏品牌简称',
  [KEYS.loginTitle]: '登录表单标题',
  [KEYS.logo]: '系统 Logo 的私有 BOS 对象 Key',
  [KEYS.favicon]: '浏览器图标的私有 BOS 对象 Key',
};

type BrandingUpload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type AuditContext = {
  actorId: string;
  ip: string | undefined;
  method: string;
  path: string;
  userAgent: string | undefined;
};

type ParameterRow = {
  key: string;
  value: string;
  updatedAt: Date;
};

function truncate(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function defaultBranding(): SystemBrandingInput {
  const configuredName = truncate(loadEnv().APP_NAME, 60) || 'Manzhushaka Console';
  const derivedShortName = configuredName.split(/\s+/u)[0] || configuredName;
  return {
    systemName: configuredName,
    shortName: truncate(derivedShortName, 20),
    loginTitle: '登录管理后台',
  };
}

function validText(value: string | undefined, min: number, max: number, fallback: string): string {
  const normalized = value?.trim() ?? '';
  return normalized.length >= min && normalized.length <= max ? normalized : fallback;
}

function assetSignatureIsValid(kind: BrandingAssetKind, file: BrandingUpload): boolean {
  const bytes = file.buffer;
  const png =
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const ico =
    bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0;
  if (file.mimetype === 'image/png') return png;
  if (file.mimetype === 'image/webp') return webp;
  if (kind === 'favicon' && ['image/x-icon', 'image/vnd.microsoft.icon'].includes(file.mimetype)) {
    return ico;
  }
  return false;
}

function assetExtension(kind: BrandingAssetKind, mimetype: string): string {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  if (kind === 'favicon' && ['image/x-icon', 'image/vnd.microsoft.icon'].includes(mimetype)) {
    return 'ico';
  }
  throw new BadRequestException({
    code: 'BRANDING_ASSET_TYPE_INVALID',
    message: kind === 'logo' ? 'Logo 仅支持 PNG 或 WebP。' : '浏览器图标仅支持 PNG、WebP 或 ICO。',
  });
}

function descriptionFor(key: string): string {
  return DESCRIPTIONS[key] ?? key;
}

@Injectable()
export class SystemBrandingService {
  private readonly logger = new Logger(SystemBrandingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BosStorageService,
  ) {}

  async getPublicBranding(): Promise<SystemBranding> {
    try {
      return await this.getBranding();
    } catch (error) {
      this.logger.warn(
        `系统品牌参数读取失败，使用环境默认值：${error instanceof Error ? error.message : '未知错误'}`,
      );
      return this.buildBranding([]);
    }
  }

  async getBranding(): Promise<SystemBranding> {
    const rows = await this.prisma.systemParameter.findMany({
      where: { key: { in: Object.values(KEYS) } },
      select: { key: true, value: true, updatedAt: true },
    });
    return this.buildBranding(rows);
  }

  async updateBranding(input: SystemBrandingInput, audit: AuditContext): Promise<SystemBranding> {
    const before = await this.getBranding();
    const values = [
      [KEYS.systemName, input.systemName],
      [KEYS.shortName, input.shortName],
      [KEYS.loginTitle, input.loginTitle],
    ] as const;
    await this.prisma.$transaction(async (transaction) => {
      for (const [key, value] of values) {
        await transaction.systemParameter.upsert({
          where: { key },
          update: { value, encrypted: false, description: descriptionFor(key) },
          create: { key, value, encrypted: false, description: descriptionFor(key) },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: 'system.parameters.update-branding',
          resource: 'SystemBranding',
          resourceId: 'branding',
          method: audit.method,
          path: audit.path,
          result: 'SUCCESS',
          ip: audit.ip ?? null,
          userAgent: audit.userAgent ?? null,
          beforeJson: this.publicAuditValue(before),
          afterJson: this.publicAuditValue({ ...before, ...input }),
        },
      });
    });
    return this.getBranding();
  }

  async uploadAsset(
    kind: BrandingAssetKind,
    file: BrandingUpload | undefined,
    audit: AuditContext,
  ): Promise<SystemBranding> {
    if (!file) {
      throw new BadRequestException({
        code: 'BRANDING_ASSET_REQUIRED',
        message: '请选择图片文件。',
      });
    }
    if (file.size < 1 || file.size > 2 * 1024 * 1024) {
      throw new BadRequestException({
        code: 'BRANDING_ASSET_SIZE_INVALID',
        message: '图片文件大小必须在 2 MB 以内。',
      });
    }
    const extension = assetExtension(kind, file.mimetype);
    if (!assetSignatureIsValid(kind, file)) {
      throw new BadRequestException({
        code: 'BRANDING_ASSET_CONTENT_INVALID',
        message: '图片内容与声明的文件类型不一致。',
      });
    }
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'BOS_NOT_CONFIGURED',
        message: 'BOS 尚未配置，暂时无法上传品牌图片。',
      });
    }

    const parameterKey = KEYS[kind];
    const previous = await this.prisma.systemParameter.findUnique({ where: { key: parameterKey } });
    const objectKey = `system-branding/${kind}/${randomUUID()}.${extension}`;
    await this.storage.putObject(objectKey, file.buffer, file.mimetype);
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.systemParameter.upsert({
          where: { key: parameterKey },
          update: { value: objectKey, encrypted: false, description: descriptionFor(parameterKey) },
          create: {
            key: parameterKey,
            value: objectKey,
            encrypted: false,
            description: descriptionFor(parameterKey),
          },
        });
        await transaction.auditLog.create({
          data: {
            actorId: audit.actorId,
            action: `system.parameters.upload-${kind}`,
            resource: 'SystemBranding',
            resourceId: kind,
            method: audit.method,
            path: audit.path,
            result: 'SUCCESS',
            ip: audit.ip ?? null,
            userAgent: audit.userAgent ?? null,
            beforeJson: { configured: Boolean(previous?.value) },
            afterJson: { configured: true },
          },
        });
      });
    } catch (error) {
      await this.tryDeleteObject(objectKey);
      throw error;
    }
    if (previous?.value && previous.value.startsWith(`system-branding/${kind}/`)) {
      await this.tryDeleteObject(previous.value);
    }
    return this.getBranding();
  }

  async removeAsset(kind: BrandingAssetKind, audit: AuditContext): Promise<SystemBranding> {
    const parameterKey = KEYS[kind];
    const previous = await this.prisma.systemParameter.findUnique({ where: { key: parameterKey } });
    await this.prisma.$transaction(async (transaction) => {
      await transaction.systemParameter.deleteMany({ where: { key: parameterKey } });
      await transaction.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: `system.parameters.remove-${kind}`,
          resource: 'SystemBranding',
          resourceId: kind,
          method: audit.method,
          path: audit.path,
          result: 'SUCCESS',
          ip: audit.ip ?? null,
          userAgent: audit.userAgent ?? null,
          beforeJson: { configured: Boolean(previous?.value) },
          afterJson: { configured: false },
        },
      });
    });
    if (previous?.value && previous.value.startsWith(`system-branding/${kind}/`)) {
      await this.tryDeleteObject(previous.value);
    }
    return this.getBranding();
  }

  async createAssetDownloadUrl(kind: BrandingAssetKind): Promise<string> {
    const parameter = await this.prisma.systemParameter.findUnique({ where: { key: KEYS[kind] } });
    if (!parameter?.value) {
      throw new NotFoundException({
        code: 'BRANDING_ASSET_NOT_FOUND',
        message: '品牌图片尚未配置。',
      });
    }
    return this.storage.createDownloadUrl(parameter.value);
  }

  private buildBranding(rows: ParameterRow[]): SystemBranding {
    const defaults = defaultBranding();
    const parameters = new Map(rows.map((row) => [row.key, row]));
    const logo = parameters.get(KEYS.logo);
    const favicon = parameters.get(KEYS.favicon);
    const latest = rows.reduce<Date | null>(
      (current, row) => (!current || row.updatedAt > current ? row.updatedAt : current),
      null,
    );
    return {
      systemName: validText(parameters.get(KEYS.systemName)?.value, 2, 60, defaults.systemName),
      shortName: validText(parameters.get(KEYS.shortName)?.value, 1, 20, defaults.shortName),
      loginTitle: validText(parameters.get(KEYS.loginTitle)?.value, 2, 80, defaults.loginTitle),
      logoUrl: logo ? `/api/public/system-branding/logo?v=${logo.updatedAt.getTime()}` : null,
      faviconUrl: favicon
        ? `/api/public/system-branding/favicon?v=${favicon.updatedAt.getTime()}`
        : null,
      updatedAt: latest?.toISOString() ?? null,
    };
  }

  private publicAuditValue(value: SystemBranding): Prisma.InputJsonValue {
    return {
      systemName: value.systemName,
      shortName: value.shortName,
      loginTitle: value.loginTitle,
      logoConfigured: Boolean(value.logoUrl),
      faviconConfigured: Boolean(value.faviconUrl),
    };
  }

  private async tryDeleteObject(key: string): Promise<void> {
    try {
      await this.storage.deleteObject(key);
    } catch (error) {
      this.logger.warn(
        `旧品牌图片清理失败：${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }
}
