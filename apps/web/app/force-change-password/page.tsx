'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function ForceChangePasswordPage() {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.get('currentPassword'),
          nextPassword: data.get('nextPassword'),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? '密码修改失败。');
      }
      window.location.href = '/login';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '密码修改失败。');
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[rgb(var(--canvas))] px-6">
      <section className="w-full max-w-[440px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] p-8">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[4px] bg-[rgb(var(--accent))] text-white">
            <LockKeyhole size={18} />
          </span>
          <div>
            <p className="font-medium">首次登录安全设置</p>
            <p className="text-xs text-[rgb(var(--ink-muted))]">初始密码必须修改后才能继续。</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">当前密码</span>
            <Input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">新密码</span>
            <Input
              name="nextPassword"
              type="password"
              minLength={10}
              required
              autoComplete="new-password"
            />
            <small className="mt-1 block text-xs text-[rgb(var(--ink-muted))]">
              至少 10 位，不能与当前密码相同。
            </small>
          </label>
          {message && (
            <p
              role="alert"
              className="rounded-[4px] border border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 px-3 py-2 text-xs text-[rgb(var(--danger))]"
            >
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? '正在保存…' : '保存并重新登录'}
            <ArrowRight size={16} />
          </Button>
        </form>
      </section>
    </main>
  );
}
