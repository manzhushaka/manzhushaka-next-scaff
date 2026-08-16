import type { Metadata } from 'next';
import { cache } from 'react';
import { ThemeProvider } from 'next-themes';
import '@arco-design/web-react/dist/css/arco.css';
import { FeedbackProvider } from '../components/ui/feedback';
import { SystemBrandingProvider } from '../components/system-branding-provider';
import { DEFAULT_SYSTEM_BRANDING, getApiBase, resolveBrandingUrl } from '../lib/system-branding';
import { systemBrandingSchema, type SystemBranding } from '@manzhushaka/contracts';
import './globals.css';

const fetchBranding = cache(async (): Promise<SystemBranding> => {
  try {
    const serverApi = process.env.API_URL ?? getApiBase();
    const response = await fetch(serverApi + '/api/public/system-branding', {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return DEFAULT_SYSTEM_BRANDING;
    const result = systemBrandingSchema.safeParse(await response.json());
    return result.success ? result.data : DEFAULT_SYSTEM_BRANDING;
  } catch {
    return DEFAULT_SYSTEM_BRANDING;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await fetchBranding();
  const faviconUrl = resolveBrandingUrl(branding.faviconUrl, process.env.API_URL ?? getApiBase());
  return {
    title: branding.systemName,
    description: branding.loginTitle,
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const branding = await fetchBranding();
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FeedbackProvider>
            <SystemBrandingProvider initialBranding={branding}>{children}</SystemBrandingProvider>
          </FeedbackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
