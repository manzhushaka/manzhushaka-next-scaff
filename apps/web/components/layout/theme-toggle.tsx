'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="h-9 w-24" aria-hidden="true" />;
  const options = [
    { key: 'light', label: '亮色', icon: Sun },
    { key: 'dark', label: '暗色', icon: Moon },
    { key: 'system', label: '系统', icon: Monitor },
  ];
  return (
    <div
      className="flex items-center gap-0.5 rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] p-0.5"
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
            'flex h-8 w-8 items-center justify-center rounded-[3px] text-[rgb(var(--ink-muted))]',
            theme === key && 'bg-[rgb(var(--muted))] text-[rgb(var(--ink))]',
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
