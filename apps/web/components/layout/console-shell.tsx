'use client';

import { Bell, ChevronRight, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFeedback } from '../ui/feedback';
import { Sidebar } from './sidebar';
import { ThemeToggle } from './theme-toggle';
import { CONSOLE_SCROLL_CONTAINER_ID, WorkspaceTabs } from './workspace-tabs';

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<'notifications' | 'account' | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { notify } = useFeedback();
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const breadcrumb = {
    '/dashboard': ['工作台', '总览'],
    '/users': ['组织管理', '用户管理'],
    '/roles': ['组织管理', '角色管理'],
    '/menus': ['组织管理', '菜单权限'],
    '/departments': ['组织管理', '部门管理'],
    '/system-params': ['系统管理', '系统参数'],
    '/operation-logs': ['安全中心', '操作日志'],
    '/runtime-logs': ['安全中心', '运行日志'],
    '/slow-sql': ['安全中心', '慢 SQL'],
    '/async-tasks': ['运维管理', '异步任务'],
  }[pathname] ?? ['管理后台', '页面'];

  useEffect(() => {
    if (!headerMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setHeaderMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHeaderMenu(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [headerMenu]);

  async function logout() {
    try {
      const response = await fetch(api + '/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('退出登录失败。');
      window.location.href = '/login';
    } catch (error) {
      notify({
        title: '无法退出登录',
        description: error instanceof Error ? error.message : '请稍后重试。',
        tone: 'error',
      });
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[rgb(var(--canvas))] text-[rgb(var(--ink))]">
      <Sidebar
        open={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => setMenuOpen(false)}
      />
      <div
        id={CONSOLE_SCROLL_CONTAINER_ID}
        data-console-scroll
        className="h-screen min-w-0 flex-1 overflow-y-auto"
      >
        <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-4 lg:px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="打开菜单"
              onClick={() => setMenuOpen(true)}
              className="ui-press rounded-[4px] p-2 text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 text-sm text-[rgb(var(--ink-muted))] sm:flex">
              <span>{breadcrumb[0]}</span>
              <ChevronRight size={14} className="text-[rgb(var(--line))]" />
              <span className="font-medium text-[rgb(var(--ink))]">{breadcrumb[1]}</span>
            </div>
          </div>
          <div ref={actionsRef} className="relative flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              aria-label="系统设置"
              title="系统设置"
              onClick={() => router.push('/system-params')}
              className="ui-press grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--muted))] text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              aria-label="通知"
              title="通知"
              aria-expanded={headerMenu === 'notifications'}
              onClick={() =>
                setHeaderMenu((current) => (current === 'notifications' ? null : 'notifications'))
              }
              className="ui-press relative grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--muted))] text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]"
            >
              <Bell size={17} />
            </button>
            <button
              type="button"
              aria-label="账户菜单"
              title="账户菜单"
              aria-expanded={headerMenu === 'account'}
              onClick={() => setHeaderMenu((current) => (current === 'account' ? null : 'account'))}
              className="ui-press grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]"
            >
              <UserRound size={16} />
            </button>
            {headerMenu ? (
              <section
                role="dialog"
                aria-label={headerMenu === 'notifications' ? '通知中心' : '账户菜单'}
                className="absolute right-0 top-[calc(100%+8px)] z-40 w-[280px] rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))]/95 p-3 shadow-[var(--shadow-overlay)] backdrop-blur-[var(--blur-overlay)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
              >
                {headerMenu === 'notifications' ? (
                  <div className="py-5 text-center">
                    <Bell size={18} className="mx-auto text-[rgb(var(--ink-muted))]" />
                    <p className="mt-2 text-sm font-medium">暂无通知</p>
                    <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">
                      新通知会显示在这里。
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="border-b border-[rgb(var(--line))] px-2 pb-3">
                      <p className="text-sm font-medium">当前账户</p>
                      <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">
                        账户信息由会话服务提供
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="ui-press mt-1 flex h-9 w-full items-center gap-2 rounded-[2px] px-2 text-left text-sm text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger))]/10"
                    >
                      <LogOut size={15} />
                      退出登录
                    </button>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </header>
        <main className="w-full">
          <Suspense
            fallback={
              <div className="min-h-[320px] bg-[rgb(var(--canvas))]" aria-label="加载页面" />
            }
          >
            <WorkspaceTabs>{children}</WorkspaceTabs>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
