'use client';

import { systemBrandingSchema, type SystemBranding } from '@manzhushaka/contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SYSTEM_BRANDING, getApiBase, resolveBrandingUrl } from '../lib/system-branding';

type SystemBrandingContextValue = {
  branding: SystemBranding;
  loading: boolean;
  refreshBranding: () => Promise<SystemBranding>;
  setBranding: (branding: SystemBranding) => void;
};

const SystemBrandingContext = createContext<SystemBrandingContextValue | null>(null);

export function SystemBrandingProvider({
  children,
  initialBranding = DEFAULT_SYSTEM_BRANDING,
}: {
  children: React.ReactNode;
  initialBranding?: SystemBranding;
}) {
  const [branding, setBranding] = useState(initialBranding);
  const [loading, setLoading] = useState(false);
  const api = getApiBase();

  const refreshBranding = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(api + '/api/public/system-branding', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('品牌配置读取失败。');
      const parsed = systemBrandingSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('品牌配置格式不正确。');
      setBranding(parsed.data);
      return parsed.data;
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refreshBranding().catch(() => {
      // 公共品牌接口不可用时保留服务端渲染的默认值。
    });
  }, [refreshBranding]);

  useEffect(() => {
    document.title = branding.systemName;
    const faviconUrl = resolveBrandingUrl(branding.faviconUrl, api);
    const existing = document.querySelector<HTMLLinkElement>('link[data-system-favicon]');
    if (!faviconUrl) {
      existing?.remove();
      return;
    }
    const link = existing ?? document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    link.dataset.systemFavicon = 'true';
    if (!existing) document.head.appendChild(link);
  }, [api, branding]);

  const value = useMemo(
    () => ({ branding, loading, refreshBranding, setBranding }),
    [branding, loading, refreshBranding],
  );
  return <SystemBrandingContext.Provider value={value}>{children}</SystemBrandingContext.Provider>;
}

export function useSystemBranding(): SystemBrandingContextValue {
  const value = useContext(SystemBrandingContext);
  if (!value) throw new Error('useSystemBranding 必须在 SystemBrandingProvider 内使用。');
  return value;
}
