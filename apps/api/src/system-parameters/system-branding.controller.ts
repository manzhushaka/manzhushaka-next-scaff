import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import {
  brandingAssetKindSchema,
  systemBrandingInputSchema,
  type BrandingAssetKind,
} from '@manzhushaka/contracts';
import { loadEnv } from '@manzhushaka/config';
import { AuthService } from '../auth/auth.service.js';
import { SystemBrandingService } from './system-branding.service.js';

type BrandingUpload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

function parseAssetKind(value: string): BrandingAssetKind {
  const result = brandingAssetKindSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      code: 'BRANDING_ASSET_KIND_INVALID',
      message: '品牌图片类型不合法。',
    });
  }
  return result.data;
}

@Controller('public/system-branding')
export class PublicSystemBrandingController {
  constructor(private readonly branding: SystemBrandingService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  getBranding() {
    return this.branding.getPublicBranding();
  }

  @Get(':kind')
  async getAsset(@Param('kind') kindValue: string, @Res() response: Response) {
    const url = await this.branding.createAssetDownloadUrl(parseAssetKind(kindValue));
    response.setHeader('Cache-Control', 'public, max-age=60');
    return response.redirect(302, url);
  }
}

@Controller('system-parameters/branding')
export class SystemBrandingController {
  constructor(
    private readonly branding: SystemBrandingService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async getBranding(@Req() request: Request) {
    await this.requirePermission(request, 'system:parameters');
    return this.branding.getBranding();
  }

  @Put()
  async updateBranding(
    @Body() body: unknown,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const user = await this.requirePermission(request, 'system:parameters:update');
    const result = systemBrandingInputSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        code: 'SYSTEM_BRANDING_INVALID',
        message: '系统品牌参数格式不正确。',
        fields: result.error.flatten().fieldErrors,
      });
    }
    return this.branding.updateBranding(result.data, {
      actorId: user.id,
      ip: request.ip,
      method: request.method,
      path: request.originalUrl,
      userAgent,
    });
  }

  @Post('assets/:kind')
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 2 * 1024 * 1024 } }))
  async uploadAsset(
    @Param('kind') kindValue: string,
    @UploadedFile() file: BrandingUpload | undefined,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const kind = parseAssetKind(kindValue);
    const user = await this.requirePermission(request, 'system:parameters:update');
    return this.branding.uploadAsset(kind, file, {
      actorId: user.id,
      ip: request.ip,
      method: request.method,
      path: request.originalUrl,
      userAgent,
    });
  }

  @Delete('assets/:kind')
  async removeAsset(
    @Param('kind') kindValue: string,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const kind = parseAssetKind(kindValue);
    const user = await this.requirePermission(request, 'system:parameters:update');
    return this.branding.removeAsset(kind, {
      actorId: user.id,
      ip: request.ip,
      method: request.method,
      path: request.originalUrl,
      userAgent,
    });
  }

  private requirePermission(request: Request, permissionCode: string) {
    const token = request.cookies?.[loadEnv().SESSION_COOKIE_NAME] as string | undefined;
    return this.auth.requirePermission(token, permissionCode);
  }
}
