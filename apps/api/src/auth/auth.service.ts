import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';
import { loadEnv } from '@manzhushaka/config';
import { createOpaqueToken, hashToken, verifyPassword } from '@manzhushaka/security';
import { hashPassword } from '@manzhushaka/security';

type CaptchaEntry = { answerHash: string; expiresAt: number };

function escapeSvg(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function digest(value: string): string {
  return hashToken(value);
}

@Injectable()
export class AuthService {
  private readonly captchas = new Map<string, CaptchaEntry>();

  constructor(private readonly prisma: PrismaService) {}

  createCaptcha() {
    const env = loadEnv();
    const id = randomUUID();
    const answer = String(randomInt(1000, 9999));
    this.captchas.set(id, {
      answerHash: digest(answer),
      expiresAt: Date.now() + env.CAPTCHA_TTL_SECONDS * 1000,
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="40" viewBox="0 0 132 40" role="img" aria-label="图片验证码"><rect width="132" height="40" rx="5" fill="#eef0f1"/><path d="M8 31 C32 5 74 35 122 8" fill="none" stroke="#e76f51" stroke-width="2" opacity=".55"/><text x="66" y="27" text-anchor="middle" font-family="monospace" font-size="21" font-weight="700" letter-spacing="5" fill="#1e2427">${escapeSvg(answer)}</text></svg>`;
    return {
      id,
      image: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      expiresIn: env.CAPTCHA_TTL_SECONDS,
    };
  }

  async login(
    input: { username: string; password: string; captchaId: string; captchaCode: string },
    ip?: string,
    userAgent?: string,
  ) {
    const env = loadEnv();
    const captcha = this.captchas.get(input.captchaId);
    this.captchas.delete(input.captchaId);
    if (
      !captcha ||
      captcha.expiresAt < Date.now() ||
      digest(input.captchaCode) !== captcha.answerHash
    ) {
      throw new UnauthorizedException({
        code: 'CAPTCHA_INVALID',
        message: '图片验证码错误或已过期。',
      });
    }

    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { username: input.username },
        include: { roles: true },
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: '数据库暂不可用，请检查服务配置。',
      });
    }
    if (!user || user.status === 'DELETED' || user.status === 'DISABLED') {
      throw new UnauthorizedException({ code: 'LOGIN_FAILED', message: '用户名或密码错误。' });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_LOCKED',
        message: '账号已锁定，请稍后再试。',
      });
    }
    if (user.status === 'LOCKED') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', failedLoginCount: 0, lockedUntil: null },
      });
      user.status = 'ACTIVE';
    }
    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= env.LOGIN_MAX_FAILURES
              ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000)
              : null,
          status: failedLoginCount >= env.LOGIN_MAX_FAILURES ? 'LOCKED' : user.status,
        },
      });
      throw new UnauthorizedException({ code: 'LOGIN_FAILED', message: '用户名或密码错误。' });
    }

    const token = createOpaqueToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, status: 'ACTIVE' },
    });
    await this.prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000),
      },
    });
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async getUserBySession(token: string | undefined) {
    if (!token) return null;
    const session = await this.prisma.session.findFirst({
      where: { tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { include: { roles: true } } },
    });
    return session?.user ?? null;
  }

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(user.passwordHash, currentPassword)))
      throw new UnauthorizedException({ code: 'PASSWORD_INVALID', message: '当前密码错误。' });
    if (nextPassword.length < 10 || nextPassword === currentPassword)
      throw new UnauthorizedException({
        code: 'PASSWORD_POLICY',
        message: '新密码至少 10 位且不能与当前密码相同。',
      });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(nextPassword),
        mustChangePassword: false,
        failedLoginCount: 0,
      },
    });
    await this.prisma.session.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  }

  async logout(token: string | undefined) {
    if (token)
      await this.prisma.session.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
  }
}
