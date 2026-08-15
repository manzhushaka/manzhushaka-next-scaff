'use client';

import Link from 'next/link';
import { ArrowRight, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

type Captcha = { id: string; image: string; expiresIn: number };

export default function LoginPage() {
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const loadCaptcha = async () => {
    try {
      const response = await fetch(`${api}/api/auth/captcha`, { credentials: 'include' });
      setCaptcha((await response.json()) as Captcha);
    } catch {
      setMessage('无法连接认证服务，请检查 API 是否启动。');
    }
  };
  useEffect(() => {
    void loadCaptcha();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/api/auth/login`, {
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
      setMessage(error instanceof Error ? error.message : '登录失败。');
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(420px,0.9fr)_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[#202326] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(135deg, transparent 0 42%, rgba(231,111,81,.5) 42.2% 42.5%, transparent 42.7% 100%), linear-gradient(45deg, transparent 0 58%, rgba(244,162,97,.2) 58.2% 58.4%, transparent 58.7% 100%)',
          }}
        />
        <div className="relative">
          <div className="mb-20 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[4px] bg-[#e76f51] font-serif text-xl font-bold">
              M
            </span>
            <span>
              <strong className="block font-serif text-lg">Manzhushaka</strong>
              <small className="text-[10px] uppercase tracking-[.2em] text-white/55">Console</small>
            </span>
          </div>
          <p className="mb-5 max-w-[360px] font-serif text-4xl leading-tight">
            把复杂系统，
            <br />
            <span className="text-[#f4a261]">留在清晰的边界里。</span>
          </p>
          <p className="max-w-[330px] text-sm leading-7 text-white/60">
            安全、审计、权限和异步数据任务，在一张可靠的控制面板上保持可追溯。
          </p>
        </div>
        <div className="relative flex items-center gap-5 text-[11px] uppercase tracking-[.12em] text-white/45">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#168aad]" />
            私有连接
          </span>
          <span>·</span>
          <span>RBAC / AUDIT</span>
        </div>
      </section>
      <section className="flex items-center justify-center bg-[rgb(var(--canvas))] px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-12 lg:hidden">
            <span className="mb-4 grid h-10 w-10 place-items-center rounded-[4px] bg-[rgb(var(--accent))] font-serif text-xl font-bold text-white">
              M
            </span>
            <p className="font-serif text-xl">Manzhushaka Console</p>
          </div>
          <div className="mb-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.18em] text-[rgb(var(--accent-strong))]">
              SECURE ACCESS / 01
            </p>
            <h1 className="mb-2 font-serif text-3xl font-bold">欢迎回来</h1>
            <p className="text-sm text-[rgb(var(--ink-muted))]">使用管理员账号进入控制台。</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">用户名</span>
              <Input name="username" autoComplete="username" placeholder="输入用户名" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">密码</span>
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="输入密码"
                required
              />
            </label>
            <div>
              <span className="mb-1.5 block text-xs font-medium">图片验证码</span>
              <div className="flex gap-2">
                <Input name="captchaCode" inputMode="numeric" placeholder="输入图中数字" required />
                <button
                  type="button"
                  title="刷新验证码"
                  aria-label="刷新验证码"
                  onClick={() => void loadCaptcha()}
                  className="h-10 w-[136px] shrink-0 overflow-hidden rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))]"
                >
                  {captcha ? (
                    <img src={captcha.image} alt="图片验证码" className="h-full w-full" />
                  ) : (
                    <RefreshCw size={16} className="mx-auto text-[rgb(var(--ink-muted))]" />
                  )}
                </button>
              </div>
            </div>
            {message && (
              <p
                role="alert"
                className="rounded-[4px] border border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 px-3 py-2 text-xs text-[rgb(var(--danger))]"
              >
                {message}
              </p>
            )}
            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? '正在验证…' : '进入控制台'}
              <ArrowRight size={16} />
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
      </section>
    </main>
  );
}
