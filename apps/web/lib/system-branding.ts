import type { SystemBranding } from '@manzhushaka/contracts';

export const DEFAULT_SYSTEM_BRANDING: SystemBranding = {
  systemName: 'Manzhushaka Console',
  shortName: 'Manzhushaka',
  loginTitle: '登录管理后台',
  logoUrl: null,
  faviconUrl: null,
  updatedAt: null,
};

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

export function resolveBrandingUrl(url: string | null, apiBase = getApiBase()): string | null {
  if (!url) return null;
  try {
    if (url.startsWith('/')) return apiBase.replace(/\/$/u, '') + url;
    return new URL(url, apiBase).toString();
  } catch {
    return null;
  }
}
