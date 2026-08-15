'use client';

import { ArrowRight, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import consolePreview from '../../../../docs/images/manzhushaka-console.png';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { cn } from '../../lib/cn';

type Captcha = { id: string; image: string; expiresIn: number };

export default function LoginPage() {
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
    <main className="flex min-h-screen bg-[rgb(var(--surface))]">
      <section className="relative flex w-full flex-col px-6 py-6 lg:w-[520px] lg:px-16">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[6px] bg-[rgb(var(--accent))] text-lg font-bold text-white">
            M
          </span>
          <span>
            <strong className="block text-[15px] font-semibold">Manzhushaka</strong>
            <small className="block text-[10px] uppercase tracking-[.16em] text-[rgb(var(--ink-muted))]">
              Console
            </small>
          </span>
        </div>
        <div className="my-auto w-full max-w-[360px] self-center py-12">
          <div className="mb-8">
            <h1 className="mb-2 text-2xl font-semibold">欢迎回来</h1>
            <p className="text-sm text-[rgb(var(--ink-muted))]">登录 Manzhushaka 管理控制台</p>
          </div>
          <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">用户名</span>
              <Input
                ref={usernameRef}
                name="username"
                autoComplete="username"
                placeholder="输入用户名"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">密码</span>
              <PasswordInput
                ref={passwordRef}
                name="password"
                autoComplete="current-password"
                placeholder="输入密码"
                required
              />
            </label>
            <div>
              <span className="mb-1.5 block text-xs font-medium">图片验证码</span>
              <div className="flex gap-2">
                <Input
                  ref={captchaRef}
                  name="captchaCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="输入图中数字"
                  required
                />
                <button
                  type="button"
                  title="刷新验证码"
                  aria-label="刷新验证码"
                  onClick={() => void loadCaptcha()}
                  disabled={captchaLoading}
                  className="ui-press h-9 w-[128px] shrink-0 overflow-hidden rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--muted))] disabled:cursor-wait disabled:opacity-70"
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
            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : null}
              {loading ? '正在验证…' : '进入控制台'}
              {!loading ? <ArrowRight size={16} /> : null}
            </Button>
          </form>
          <div className="mt-8 flex items-center gap-2 border-t border-[rgb(var(--line))] pt-5 text-xs text-[rgb(var(--ink-muted))]">
            <ShieldCheck size={15} className="text-[rgb(var(--success))]" />
            会话使用安全 Cookie 保存 <LockKeyhole size={14} className="ml-auto" />
          </div>
          <p className="mt-5 text-center text-xs text-[rgb(var(--ink-muted))]">
            忘记密码？联系超级管理员重置。
          </p>
          <Link href="/login" className="sr-only">
            登录
          </Link>
        </div>
        <p className="text-xs text-[rgb(var(--ink-muted))]">Manzhushaka Console · 安全管理平台</p>
      </section>
      <section className="relative hidden flex-1 overflow-hidden bg-[rgb(var(--accent))] p-10 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-[880px]">
          <div className="mb-8">
            <p className="text-3xl font-semibold">清晰掌控每一次系统变化</p>
            <p className="mt-3 text-sm text-white/75">
              用户、权限、审计与异步任务，在统一工作区内保持可追踪。
            </p>
          </div>
          <div className="overflow-hidden rounded-[6px] border border-white/25 bg-white/10 p-2 shadow-2xl shadow-blue-950/25">
            <div className="mb-2 flex h-7 items-center gap-1.5 rounded-[3px] bg-white/10 px-3">
              <span className="h-2 w-2 rounded-full bg-white/50" />
              <span className="h-2 w-2 rounded-full bg-white/35" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
            </div>
            <Image
              src={consolePreview}
              alt="Manzhushaka Console 工作台预览"
              priority
              className="h-auto w-full rounded-[2px]"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
