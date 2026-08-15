'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.setAttribute('arco-theme', resolvedTheme === 'dark' ? 'dark' : 'light');
  }, [resolvedTheme]);
  if (!mounted) return <span className="h-8 w-8" aria-hidden="true" />;
  const options = [
    { key: 'light', label: '亮色', icon: Sun },
    { key: 'dark', label: '暗色', icon: Moon },
    { key: 'system', label: '系统', icon: Monitor },
  ];
  return (
    <div
      className="hidden items-center gap-0.5 rounded-full bg-[rgb(var(--muted))] p-0.5 sm:flex"
      aria-label="主题模式"
    >
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => setTheme(key)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-[rgb(var(--ink-muted))]',
            theme === key &&
              'bg-[rgb(var(--surface))] text-[rgb(var(--accent))] shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

function cn(...classes: Array<string | false>) {
  return classes.filter(Boolean).join(' ');
}
