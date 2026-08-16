'use client';

import { ImagePlus, LoaderCircle, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  systemBrandingInputSchema,
  systemBrandingSchema,
  type BrandingAssetKind,
  type SystemBranding,
  type SystemBrandingInput,
} from '@manzhushaka/contracts';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Input } from '../ui/input';
import { useFeedback } from '../ui/feedback';
import { cn } from '../../lib/cn';
import { getApiBase, resolveBrandingUrl } from '../../lib/system-branding';
import { useSystemBranding } from '../system-branding-provider';

type AssetKind = BrandingAssetKind;

const assetLabels: Record<AssetKind, { title: string; description: string; accept: string }> = {
  logo: {
    title: '系统 Logo',
    description: '用于侧栏和登录页，支持 PNG、WebP，最大 2 MB。',
    accept: 'image/png,image/webp',
  },
  favicon: {
    title: '浏览器图标',
    description: '用于浏览器标签页，支持 PNG、WebP、ICO，最大 2 MB。',
    accept: 'image/png,image/webp,image/x-icon',
  },
};

function getErrorMessage(response: Response, fallback: string): Promise<string> {
  return response
    .json()
    .then((body: unknown) => {
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const message = (body as { message?: unknown }).message;
        if (typeof message === 'string') return message;
      }
      return fallback;
    })
    .catch(() => fallback);
}

function AssetSetting({
  kind,
  branding,
  disabled,
  onUpload,
  onRemove,
}: {
  kind: AssetKind;
  branding: SystemBranding;
  disabled: boolean;
  onUpload: (kind: AssetKind, event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (kind: AssetKind) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const metadata = assetLabels[kind];
  const url = resolveBrandingUrl(kind === 'logo' ? branding.logoUrl : branding.faviconUrl);
  return (
    <div className="grid gap-4 border-b border-[rgb(var(--line))] py-5 last:border-b-0 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h3 className="text-sm font-medium">{metadata.title}</h3>
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--ink-muted))]">
          {metadata.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            'grid h-16 w-16 place-items-center overflow-hidden rounded-[6px] border border-[rgb(var(--line))] bg-[rgb(var(--muted))] text-xl font-semibold text-[rgb(var(--accent))]',
            kind === 'favicon' && 'h-12 w-12',
          )}
        >
          {url ? (
            <img
              src={url}
              alt={metadata.title + '预览'}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <ImagePlus size={20} />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={metadata.accept}
          className="sr-only"
          onChange={(event) => onUpload(kind, event)}
          disabled={disabled}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {disabled ? (
              <LoaderCircle size={14} className="motion-safe:animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            上传图片
          </Button>
          {url ? (
            <button
              type="button"
              title={'移除' + metadata.title}
              aria-label={'移除' + metadata.title}
              disabled={disabled}
              onClick={() => onRemove(kind)}
              className="ui-press grid h-8 w-8 place-items-center rounded-[4px] text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger))]/10 disabled:pointer-events-none disabled:opacity-45"
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SystemBrandingPage() {
  const { branding: publicBranding, setBranding } = useSystemBranding();
  const { notify } = useFeedback();
  const [branding, setLocalBranding] = useState(publicBranding);
  const [form, setForm] = useState<SystemBrandingInput>({
    systemName: publicBranding.systemName,
    shortName: publicBranding.shortName,
    loginTitle: publicBranding.loginTitle,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<AssetKind | null>(null);
  const [removing, setRemoving] = useState<AssetKind | null>(null);
  const [error, setError] = useState('');
  const [confirmKind, setConfirmKind] = useState<AssetKind | null>(null);
  const [dirty, setDirty] = useState(false);
  const api = getApiBase();

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(api + '/api/system-parameters/branding', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getErrorMessage(response, '系统参数读取失败。'));
        const result = systemBrandingSchema.safeParse(await response.json());
        if (!result.success) throw new Error('系统参数响应格式不正确。');
        if (!active) return;
        setLocalBranding(result.data);
        setBranding(result.data);
        setForm({
          systemName: result.data.systemName,
          shortName: result.data.shortName,
          loginTitle: result.data.loginTitle,
        });
        setDirty(false);
        setError('');
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : '系统参数读取失败。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, setBranding]);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  function updateField(field: keyof SystemBrandingInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = systemBrandingInputSchema.safeParse(form);
    if (!result.success) {
      const issue = result.error.issues[0];
      setError(issue?.message ?? '请检查输入内容。');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(api + '/api/system-parameters/branding', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result.data),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, '系统参数保存失败。'));
      const next = systemBrandingSchema.parse(await response.json());
      setLocalBranding(next);
      setBranding(next);
      setForm({
        systemName: next.systemName,
        shortName: next.shortName,
        loginTitle: next.loginTitle,
      });
      setDirty(false);
      notify({
        title: '系统品牌已保存',
        description: '新的名称会立即应用到当前页面。',
        tone: 'success',
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '系统参数保存失败。');
    } finally {
      setSaving(false);
    }
  }

  async function upload(kind: AssetKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(kind);
    setError('');
    const body = new FormData();
    body.set('file', file);
    try {
      const response = await fetch(api + '/api/system-parameters/branding/assets/' + kind, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, '品牌图片上传失败。'));
      const next = systemBrandingSchema.parse(await response.json());
      setLocalBranding(next);
      setBranding(next);
      notify({ title: '品牌图片已更新', tone: 'success' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '品牌图片上传失败。');
    } finally {
      setUploading(null);
    }
  }

  async function remove(kind: AssetKind) {
    setConfirmKind(null);
    setRemoving(kind);
    setError('');
    try {
      const response = await fetch(api + '/api/system-parameters/branding/assets/' + kind, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, '品牌图片移除失败。'));
      const next = systemBrandingSchema.parse(await response.json());
      setLocalBranding(next);
      setBranding(next);
      notify({ title: '品牌图片已移除', tone: 'success' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '品牌图片移除失败。');
    } finally {
      setRemoving(null);
    }
  }

  const busy = loading || saving || uploading !== null || removing !== null;
  return (
    <div className="p-4 lg:p-5">
      <section className="overflow-hidden rounded-[2px] bg-[rgb(var(--surface))]">
        <header className="border-b border-[rgb(var(--line))] px-5 py-5">
          <p className="font-mono text-[10px] font-semibold text-[rgb(var(--accent-strong))]">
            SYSTEM / BRANDING
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">系统品牌</h1>
              <p className="mt-1 text-sm text-[rgb(var(--ink-muted))]">
                统一设置名称、登录标题和品牌图片。
              </p>
            </div>
            {branding.updatedAt ? (
              <span className="text-xs text-[rgb(var(--ink-muted))]">
                最近更新：{new Date(branding.updatedAt).toLocaleString('zh-CN')}
              </span>
            ) : null}
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            className="mx-5 mt-5 rounded-[2px] border border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 px-3 py-2 text-sm text-[rgb(var(--danger))]"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid min-h-[320px] place-items-center text-sm text-[rgb(var(--ink-muted))]">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={16} className="motion-safe:animate-spin" />
              正在读取系统参数
            </span>
          </div>
        ) : (
          <>
            <form onSubmit={save} className="px-5">
              <section className="border-b border-[rgb(var(--line))] py-5">
                <h2 className="text-sm font-semibold">基础信息</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium">系统名称</span>
                    <Input
                      value={form.systemName}
                      maxLength={60}
                      onChange={(event) => updateField('systemName', event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium">品牌简称</span>
                    <Input
                      value={form.shortName}
                      maxLength={20}
                      onChange={(event) => updateField('shortName', event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium">登录标题</span>
                    <Input
                      value={form.loginTitle}
                      maxLength={80}
                      onChange={(event) => updateField('loginTitle', event.target.value)}
                    />
                  </label>
                </div>
              </section>
              <section>
                <h2 className="pt-5 text-sm font-semibold">品牌资源</h2>
                <AssetSetting
                  kind="logo"
                  branding={branding}
                  disabled={busy}
                  onUpload={upload}
                  onRemove={setConfirmKind}
                />
                <AssetSetting
                  kind="favicon"
                  branding={branding}
                  disabled={busy}
                  onUpload={upload}
                  onRemove={setConfirmKind}
                />
              </section>
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[rgb(var(--line))] py-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!dirty || busy}
                  onClick={() => {
                    setForm({
                      systemName: branding.systemName,
                      shortName: branding.shortName,
                      loginTitle: branding.loginTitle,
                    });
                    setDirty(false);
                    setError('');
                  }}
                >
                  <RefreshCw size={14} />
                  撤销修改
                </Button>
                <Button type="submit" size="sm" disabled={!dirty || busy}>
                  {saving ? (
                    <LoaderCircle size={14} className="motion-safe:animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  保存设置
                </Button>
              </footer>
            </form>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmKind !== null}
        title="移除品牌图片？"
        description="移除后页面会恢复文字占位，已上传的私有对象也会被清理。"
        confirmLabel="移除图片"
        danger
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => {
          if (confirmKind) void remove(confirmKind);
        }}
      />
    </div>
  );
}
