'use client';

import { ArrowRight, Check, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { PasswordInput } from '../../components/ui/password-input';
import { cn } from '../../lib/cn';
import { BrandMark } from '../../components/layout/brand-mark';
import { useSystemBranding } from '../../components/system-branding-provider';

export default function ForceChangePasswordPage() {
  const { branding } = useSystemBranding();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const requirements = [
    { label: '至少 10 位', valid: nextPassword.length >= 10 },
    {
      label: '不能与当前密码相同',
      valid: Boolean(nextPassword) && nextPassword !== currentPassword,
    },
    {
      label: '两次输入一致',
      valid: Boolean(confirmation) && nextPassword === confirmation,
    },
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!requirements.every((requirement) => requirement.valid)) {
      setMessage('请先满足全部密码要求。');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(api + '/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, nextPassword }),
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
    <main className="min-h-screen bg-[rgb(var(--canvas))]">
      <header className="flex h-[60px] items-center gap-3 border-b border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-6">
        <BrandMark
          className="h-8 w-8 rounded-[6px] bg-[rgb(var(--accent))] text-base font-bold text-white"
          imageClassName="p-1"
        />
        <span className="max-w-[320px] truncate font-semibold">{branding.systemName}</span>
      </header>
      <div className="grid min-h-[calc(100vh-60px)] place-items-center px-6 py-12">
        <section className="w-full max-w-[440px] rounded-[2px] bg-[rgb(var(--surface))] p-8 shadow-[0_2px_8px_rgb(0_0_0/0.06)]">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[4px] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
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
              <PasswordInput
                value={currentPassword}
                required
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">新密码</span>
              <PasswordInput
                value={nextPassword}
                minLength={10}
                required
                autoComplete="new-password"
                onChange={(event) => setNextPassword(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">确认新密码</span>
              <PasswordInput
                value={confirmation}
                minLength={10}
                required
                autoComplete="new-password"
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <ul className="grid gap-1.5" aria-label="密码要求">
              {requirements.map((requirement) => (
                <li
                  key={requirement.label}
                  className={cn(
                    'flex items-center gap-2 text-xs text-[rgb(var(--ink-muted))]',
                    requirement.valid && 'text-[rgb(var(--success))]',
                  )}
                >
                  <Check size={13} aria-hidden="true" />
                  {requirement.label}
                </li>
              ))}
            </ul>
            {message ? (
              <p
                role="alert"
                className="rounded-[2px] border border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 px-3 py-2 text-xs text-[rgb(var(--danger))]"
              >
                {message}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : null}
              {saving ? '正在保存…' : '保存并重新登录'}
              {!saving ? <ArrowRight size={16} /> : null}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
