'use client';

import { Bell, ChevronRight, Menu, Search, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Sidebar } from './sidebar';
import { ThemeToggle } from './theme-toggle';

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[rgb(var(--canvas))] text-[rgb(var(--ink))]">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[rgb(var(--line))] bg-[rgb(var(--canvas))]/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="打开菜单"
              onClick={() => setMenuOpen(true)}
              className="rounded-[4px] p-2 text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 text-xs text-[rgb(var(--ink-muted))] sm:flex">
              <span>Manzhushaka Console</span>
              <ChevronRight size={13} />
              <span className="text-[rgb(var(--ink))]">管理后台</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="全局搜索"
              title="全局搜索"
              className="hidden h-9 items-center gap-2 rounded-[4px] border border-transparent px-3 text-xs text-[rgb(var(--ink-muted))] hover:border-[rgb(var(--line))] hover:bg-[rgb(var(--surface))] md:flex"
            >
              <Search size={15} />
              搜索{' '}
              <kbd className="rounded border border-[rgb(var(--line))] px-1 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <button
              type="button"
              aria-label="通知"
              title="通知"
              className="relative grid h-9 w-9 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))]"
            >
              <Bell size={17} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-strong))]" />
            </button>
            <button
              type="button"
              aria-label="账户菜单"
              title="账户菜单"
              className="grid h-9 w-9 place-items-center rounded-[4px] bg-[rgb(var(--ink))] text-[rgb(var(--surface))]"
            >
              <UserRound size={16} />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
