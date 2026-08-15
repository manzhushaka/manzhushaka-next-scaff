import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import '@arco-design/web-react/dist/css/arco.css';
import { FeedbackProvider } from '../components/ui/feedback';
import './globals.css';

export const metadata: Metadata = { title: 'Manzhushaka Console', description: '曼珠沙华管理平台' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FeedbackProvider>{children}</FeedbackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
