import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { loginInputSchema } from '@manzhushaka/contracts';
import { loadEnv } from '@manzhushaka/config';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('captcha')
  captcha() {
    return this.auth.createCaptcha();
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    const input = loginInputSchema.parse(body);
    const result = await this.auth.login(input, req.ip, userAgent);
    const env = loadEnv();
    res.cookie(env.SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: env.SESSION_TTL_SECONDS * 1000,
      path: '/',
    });
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[loadEnv().SESSION_COOKIE_NAME] as string | undefined);
    res.clearCookie(loadEnv().SESSION_COOKIE_NAME, { path: '/' });
  }

  @Get('me')
  async me(@Req() req: Request) {
    const user = await this.auth.getUserBySession(
      req.cookies?.[loadEnv().SESSION_COOKIE_NAME] as string | undefined,
    );
    if (!user)
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: '登录已过期，请重新登录。',
      });
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      mustChangePassword: user.mustChangePassword,
      roles: user.roles.map((role) => role.roleId),
    };
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Body() body: { currentPassword?: string; nextPassword?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[loadEnv().SESSION_COOKIE_NAME] as string | undefined;
    const user = await this.auth.getUserBySession(token);
    if (!user || !body.currentPassword || !body.nextPassword)
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: '登录已过期，请重新登录。',
      });
    await this.auth.changePassword(user.id, body.currentPassword, body.nextPassword);
    res.clearCookie(loadEnv().SESSION_COOKIE_NAME, { path: '/' });
  }
}
