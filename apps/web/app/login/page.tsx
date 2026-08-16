'use client';

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Database,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { cn } from '../../lib/cn';
import { BrandMark } from '../../components/layout/brand-mark';
import { useSystemBranding } from '../../components/system-branding-provider';

type Captcha = { id: string; image: string; expiresIn: number };

export default function LoginPage() {
  const { branding } = useSystemBranding();
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<HTMLInputElement>(null);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await fetch(api + '/api/auth/captcha', { credentials: 'include' });
      if (!response.ok) throw new Error('验证码获取失败。');
      setCaptcha((await response.json()) as Captcha);
    } catch {
      setMessage('无法连接认证服务，请检查 API 是否启动。');
    } finally {
      setCaptchaLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(api + '/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password'),
          captchaId: captcha?.id ?? '',
          captchaCode: form.get('captchaCode'),
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        user?: { mustChangePassword: boolean };
      };
      if (!response.ok) throw new Error(result.message ?? '登录失败。');
      window.location.href = result.user?.mustChangePassword
        ? '/force-change-password'
        : '/dashboard';
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : '登录失败。';
      setMessage(nextMessage);
      if (nextMessage.includes('验证码')) captchaRef.current?.focus();
      else if (nextMessage.includes('密码')) passwordRef.current?.focus();
      else usernameRef.current?.focus();
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[rgb(var(--surface))] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-[rgb(var(--accent))]" />

      <section
        data-login-description
        className="relative hidden min-h-screen border-r border-[rgb(var(--line))] bg-[rgb(var(--muted))] px-8 py-8 lg:flex lg:flex-col xl:px-16"
      >
        <header className="flex items-center gap-3">
          <BrandMark
            className="h-9 w-9 rounded-[6px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] text-lg font-bold text-[rgb(var(--accent))]"
            imageClassName="p-1"
          />
          <span>
            <strong className="block max-w-[240px] truncate text-[15px] font-semibold">
              {branding.shortName}
            </strong>
            <small
              className="block max-w-[240px] truncate text-[9px] text-[rgb(var(--ink-muted))]"
              title={branding.systemName}
            >
              {branding.systemName}
            </small>
          </span>
          <span className="ml-auto inline-flex h-7 items-center gap-2 rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-3 font-mono text-[9px] text-[rgb(var(--ink-muted))]">
            <i className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--success))]" />
            ADMIN ACCESS
          </span>
        </header>

        <div className="my-auto w-full max-w-[680px] py-12">
          <div className="mb-10 max-w-[600px]">
            <p className="mb-3 font-mono text-[10px] font-semibold text-[rgb(var(--accent-strong))]">
              MANAGEMENT CONTROL PLANE
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              让管理边界清晰，
              <br />
              让每次变化有迹可循。
            </h1>
            <p className="mt-4 max-w-[540px] text-[15px] leading-7 text-[rgb(var(--ink-muted))]">
              集中处理身份、权限、审计与异步任务，让关键操作始终保持可验证、可追踪。
            </p>
          </div>

          <section
            className="overflow-hidden rounded-[6px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] shadow-[var(--shadow-overlay)]"
            aria-label="控制台运行边界"
          >
            <header className="flex h-12 items-center justify-between border-b border-[rgb(var(--line))] px-5">
              <strong className="text-sm font-semibold">运行边界</strong>
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold text-[rgb(var(--success))]">
                <i className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--success))]" />
                READY
              </span>
            </header>
            <div className="grid grid-cols-3 border-b border-[rgb(var(--line))]">
              <div className="min-w-0 px-5 py-5">
                <ShieldCheck size={18} className="mb-3 text-[rgb(var(--accent))]" />
                <small className="block text-xs text-[rgb(var(--ink-muted))]">访问控制</small>
                <strong className="mt-1.5 block text-sm font-semibold">服务端授权</strong>
              </div>
              <div className="min-w-0 border-l border-[rgb(var(--line))] px-5 py-5">
                <Database size={18} className="mb-3 text-[rgb(var(--accent))]" />
                <small className="block text-xs text-[rgb(var(--ink-muted))]">安全数据</small>
                <strong className="mt-1.5 block text-sm font-semibold">加密存储</strong>
              </div>
              <div className="min-w-0 border-l border-[rgb(var(--line))] px-5 py-5">
                <Activity size={18} className="mb-3 text-[rgb(var(--accent))]" />
                <small className="block text-xs text-[rgb(var(--ink-muted))]">异步任务</small>
                <strong className="mt-1.5 block text-sm font-semibold">全程追踪</strong>
              </div>
            </div>
            <dl className="px-5 py-2 text-xs">
              <div className="flex min-h-10 items-center justify-between gap-4">
                <dt className="text-[rgb(var(--ink-muted))]">用户权限</dt>
                <dd className="font-medium">数据范围独立校验</dd>
              </div>
              <div className="flex min-h-10 items-center justify-between gap-4 border-t border-[rgb(var(--line))]">
                <dt className="text-[rgb(var(--ink-muted))]">操作审计</dt>
                <dd className="font-medium">关键变更完整留痕</dd>
              </div>
              <div className="flex min-h-10 items-center justify-between gap-4 border-t border-[rgb(var(--line))]">
                <dt className="text-[rgb(var(--ink-muted))]">文件下载</dt>
                <dd className="font-medium">临时地址 5 分钟有效</dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-4 font-mono text-[10px] text-[rgb(var(--ink-muted))]">
          <span className="flex items-center gap-2">
            <LockKeyhole size={14} />
            管理会话与公开访问严格隔离
          </span>
          <span>SECURE CONSOLE</span>
        </footer>
      </section>

      <section
        data-login-form
        className="relative flex min-h-screen w-full flex-col bg-[rgb(var(--surface))] px-6 py-6 lg:px-12 xl:px-20"
      >
        <div className="flex items-center gap-3 pt-1 lg:hidden">
          <BrandMark
            className="h-9 w-9 rounded-[6px] bg-[rgb(var(--accent))] text-lg font-bold text-white"
            imageClassName="p-1"
          />
          <span>
            <strong className="block max-w-[240px] truncate text-[15px] font-semibold">
              {branding.shortName}
            </strong>
            <small
              className="block max-w-[240px] truncate text-[9px] text-[rgb(var(--ink-muted))]"
              title={branding.systemName}
            >
              {branding.systemName}
            </small>
          </span>
        </div>

        <div className="my-auto w-full max-w-[420px] self-center py-12">
          <div className="mb-8">
            <p className="mb-2 font-mono text-[10px] font-semibold text-[rgb(var(--accent-strong))]">
              身份验证 · AUTHENTICATION
            </p>
            <h2 className="mb-2 text-[28px] font-semibold">{branding.loginTitle}</h2>
            <p className="text-sm leading-6 text-[rgb(var(--ink-muted))]">
              使用管理员账户登录，图片验证码不区分大小写。
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">用户名</span>
              <span className="relative block">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[rgb(var(--ink-muted))]/60"
                />
                <Input
                  ref={usernameRef}
                  name="username"
                  autoComplete="username"
                  placeholder="输入管理员用户名"
                  className="h-12 pl-10"
                  required
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">密码</span>
              <span className="relative block">
                <LockKeyhole
                  size={17}
                  className="pointer-events-none absolute left-3 top-6 z-10 -translate-y-1/2 text-[rgb(var(--ink-muted))]/60"
                />
                <PasswordInput
                  ref={passwordRef}
                  name="password"
                  autoComplete="current-password"
                  placeholder="输入管理员密码"
                  className="h-12 pl-10"
                  required
                />
              </span>
            </label>
            <div>
              <span className="mb-2 block text-sm font-semibold">图片验证码</span>
              <div className="flex gap-2">
                <span className="relative min-w-0 flex-1">
                  <KeyRound
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[rgb(var(--ink-muted))]/60"
                  />
                  <Input
                    ref={captchaRef}
                    name="captchaCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="输入图片验证码"
                    className="h-12 pl-10"
                    required
                  />
                </span>
                <button
                  type="button"
                  title="刷新验证码"
                  aria-label="刷新验证码"
                  onClick={() => void loadCaptcha()}
                  disabled={captchaLoading}
                  className="ui-press h-12 w-[132px] shrink-0 overflow-hidden rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--muted))] transition-[border-color,box-shadow,transform] [transition-duration:var(--motion-feedback)] hover:border-[rgb(var(--ink-muted))]/40 disabled:cursor-wait disabled:opacity-70"
                >
                  {captcha && !captchaLoading ? (
                    <img src={captcha.image} alt="图片验证码" className="h-full w-full" />
                  ) : (
                    <RefreshCw
                      size={16}
                      className={cn(
                        'mx-auto text-[rgb(var(--ink-muted))]',
                        captchaLoading && 'motion-safe:animate-spin',
                      )}
                    />
                  )}
                </button>
              </div>
            </div>
            {message ? (
              <p
                role="alert"
                className="rounded-[2px] border border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 px-3 py-2 text-xs text-[rgb(var(--danger))]"
              >
                {message}
              </p>
            ) : null}
            <Button type="submit" className="mt-2 h-12 w-full font-semibold" disabled={loading}>
              {loading ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : null}
              {loading ? '正在验证…' : '进入控制台'}
              {!loading ? <ArrowRight size={16} /> : null}
            </Button>
          </form>
          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[rgb(var(--ink-muted))]">
            <BadgeCheck size={15} className="mt-0.5 shrink-0 text-[rgb(var(--success))]" />
            <span>会话使用安全 Cookie 保存；忘记密码请联系超级管理员重置。</span>
          </p>
          <Link href="/login" className="sr-only">
            登录
          </Link>
        </div>
        <footer className="flex items-center justify-between gap-4 font-mono text-[10px] text-[rgb(var(--ink-muted))]">
          <span>{branding.systemName}</span>
          <span>简体中文</span>
        </footer>
      </section>
    </main>
  );
}
