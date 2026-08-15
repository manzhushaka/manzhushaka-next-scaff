'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';
import { KeepAlive, useKeepAliveRef } from 'keepalive-for-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useFeedback } from '../ui/feedback';
import { ConsoleRouteView } from './console-views';

const HOME_PATH = '/dashboard';
export const CONSOLE_SCROLL_CONTAINER_ID = 'console-workspace-scroll';

const TAB_TITLES: Record<string, string> = {
  '/dashboard': '工作台',
  '/users': '用户管理',
  '/roles': '角色管理',
  '/menus': '菜单权限',
  '/departments': '部门管理',
  '/system-params': '系统参数',
  '/operation-logs': '操作日志',
  '/slow-sql': '慢 SQL',
  '/async-tasks': '异步任务',
};

type WorkspaceTab = {
  key: string;
  href: string;
  title: string;
  closable: boolean;
};

type TabMenu = { key: string; x: number; y: number } | null;

function getTabTitle(pathname: string) {
  return TAB_TITLES[pathname] ?? '未命名页面';
}

function getHref(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function getScrollContainer() {
  return document.getElementById(CONSOLE_SCROLL_CONTAINER_ID);
}

export function WorkspaceTabs({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { notify } = useFeedback();
  const search = searchParams.toString();
  const activeHref = useMemo(() => getHref(pathname, search), [pathname, search]);
  const activeKey = pathname;
  const title = getTabTitle(pathname);
  const aliveRef = useKeepAliveRef();
  const scrollPositions = useRef(new Map<string, number>());
  const tabsViewportRef = useRef<HTMLDivElement>(null);
  const dragKeyRef = useRef<string | null>(null);
  const [menu, setMenu] = useState<TabMenu>(null);
  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => [
    {
      key: activeKey,
      href: activeHref,
      title,
      closable: activeKey !== HOME_PATH,
    },
  ]);

  useEffect(() => {
    setTabs((current) => {
      if (current.some((tab) => tab.key === activeKey)) {
        return current.map((tab) =>
          tab.key === activeKey && tab.href !== activeHref ? { ...tab, href: activeHref } : tab,
        );
      }
      return [
        ...current,
        {
          key: activeKey,
          href: activeHref,
          title,
          closable: activeKey !== HOME_PATH,
        },
      ];
    });
  }, [activeHref, activeKey, title]);

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    const savedScrollTop = scrollPositions.current.get(activeKey) ?? 0;
    window.requestAnimationFrame(() =>
      scrollContainer?.scrollTo({ top: savedScrollTop, behavior: 'auto' }),
    );

    return () => {
      scrollPositions.current.set(activeKey, scrollContainer?.scrollTop ?? 0);
    };
  }, [activeKey]);

  useEffect(() => {
    if (!menu) return;
    const closeMenu = () => setMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu]);

  useEffect(() => {
    const activeTab = tabsViewportRef.current?.querySelector<HTMLElement>(
      `[data-tab-key="${CSS.escape(activeKey)}"]`,
    );
    activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeKey]);

  const visibleTabs = tabs.some((tab) => tab.key === activeKey)
    ? tabs
    : [
        ...tabs,
        {
          key: activeKey,
          href: activeHref,
          title,
          closable: activeKey !== HOME_PATH,
        },
      ];
  const routeView = <ConsoleRouteView pathname={activeKey} fallback={children} />;
  const menuTab = menu ? visibleTabs.find((tab) => tab.key === menu.key) : undefined;

  function activateTab(tab: WorkspaceTab) {
    scrollPositions.current.set(activeKey, getScrollContainer()?.scrollTop ?? 0);
    router.push(tab.href);
  }

  function restoreTabs(snapshot: WorkspaceTab[], route?: string) {
    setTabs(snapshot);
    if (route) router.push(route);
  }

  function closeTab(tab: WorkspaceTab) {
    if (!tab.closable) return;
    const snapshot = visibleTabs;
    const tabIndex = visibleTabs.findIndex((item) => item.key === tab.key);
    const remainingTabs = visibleTabs.filter((item) => item.key !== tab.key);
    const wasActive = tab.key === activeKey;
    const fallback = remainingTabs[tabIndex] ?? remainingTabs[tabIndex - 1] ?? remainingTabs[0];
    setTabs(remainingTabs);
    scrollPositions.current.delete(tab.key);
    if (wasActive && fallback) router.push(fallback.href);
    notify({
      title: `已关闭“${tab.title}”`,
      description: '页面缓存暂时保留，可立即撤销。',
      action: {
        label: '撤销关闭',
        onClick: () => restoreTabs(snapshot, wasActive ? tab.href : undefined),
      },
    });
  }

  function closeTabs(nextTabs: WorkspaceTab[], message: string) {
    const snapshot = visibleTabs;
    setTabs(nextTabs);
    const nextActive = nextTabs.some((tab) => tab.key === activeKey)
      ? activeHref
      : (nextTabs.at(-1)?.href ?? HOME_PATH);
    if (nextActive !== activeHref) router.push(nextActive);
    notify({
      title: message,
      action: { label: '撤销关闭', onClick: () => restoreTabs(snapshot, activeHref) },
    });
  }

  function closeOtherTabs(targetKey = activeKey) {
    const nextTabs = visibleTabs.filter((tab) => tab.key === HOME_PATH || tab.key === targetKey);
    closeTabs(nextTabs, '已关闭其他页签');
  }

  function closeAllTabs() {
    closeTabs(
      visibleTabs.filter((tab) => tab.key === HOME_PATH),
      '已关闭全部可关闭页签',
    );
  }

  function closeTabsOnSide(targetKey: string, side: 'left' | 'right') {
    const targetIndex = visibleTabs.findIndex((tab) => tab.key === targetKey);
    const nextTabs = visibleTabs.filter((tab, index) => {
      if (!tab.closable) return true;
      return side === 'left' ? index >= targetIndex : index <= targetIndex;
    });
    closeTabs(nextTabs, `已关闭${side === 'left' ? '左侧' : '右侧'}页签`);
  }

  function reorderTab(overKey: string) {
    const draggedKey = dragKeyRef.current;
    if (!draggedKey || draggedKey === overKey || draggedKey === HOME_PATH || overKey === HOME_PATH)
      return;
    setTabs((current) => {
      const sourceIndex = current.findIndex((tab) => tab.key === draggedKey);
      const targetIndex = current.findIndex((tab) => tab.key === overKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [dragged] = next.splice(sourceIndex, 1);
      if (!dragged) return current;
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  }

  function scrollTabs(direction: -1 | 1) {
    tabsViewportRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });
  }

  return (
    <div>
      <div className="sticky top-[60px] z-10 flex h-11 items-end border-b border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-2 sm:px-5">
        <button
          type="button"
          aria-label="向左查看页签"
          title="向左查看页签"
          onClick={() => scrollTabs(-1)}
          className="ui-press mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]"
        >
          <ChevronLeft size={15} />
        </button>
        <div
          ref={tabsViewportRef}
          className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="工作区页签"
        >
          {visibleTabs.map((tab) => {
            const active = tab.key === activeKey;
            return (
              <div
                key={tab.key}
                data-tab-key={tab.key}
                draggable={tab.closable}
                onDragStart={(event) => {
                  dragKeyRef.current = tab.key;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', tab.key);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  reorderTab(tab.key);
                }}
                onDragEnd={() => {
                  dragKeyRef.current = null;
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ key: tab.key, x: event.clientX, y: event.clientY });
                }}
                onAuxClick={(event) => {
                  if (event.button === 1) closeTab(tab);
                }}
                className={cn(
                  'group relative flex h-11 shrink-0 items-center gap-2 px-3 text-xs transition-[color,opacity] [transition-duration:var(--motion-feedback)] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-transparent',
                  active
                    ? 'font-medium text-[rgb(var(--accent))] after:bg-[rgb(var(--accent))]'
                    : 'text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]',
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => activateTab(tab)}
                  className="max-w-40 truncate text-left outline-none focus-visible:underline"
                >
                  {tab.title}
                </button>
                {tab.closable ? (
                  <button
                    type="button"
                    onClick={() => closeTab(tab)}
                    aria-label={`关闭${tab.title}`}
                    title={`关闭${tab.title}`}
                    className="ui-press grid h-5 w-5 place-items-center rounded-full text-[rgb(var(--ink-muted))] opacity-60 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))] group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="向右查看页签"
          title="向右查看页签"
          onClick={() => scrollTabs(1)}
          className="ui-press mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]"
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          aria-label="页签管理"
          title="页签管理"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setMenu({ key: activeKey, x: rect.right - 180, y: rect.bottom + 4 });
          }}
          className="ui-press mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {menu && menuTab ? (
        <div
          role="menu"
          aria-label={`${menuTab.title}页签操作`}
          onPointerDown={(event) => event.stopPropagation()}
          className="fixed z-[80] w-44 overflow-hidden rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))]/95 p-1 shadow-[var(--shadow-overlay)] backdrop-blur-[var(--blur-overlay)]"
          style={{
            left: Math.min(menu.x, window.innerWidth - 184),
            top: Math.min(menu.y, window.innerHeight - 210),
          }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={!menuTab.closable}
            onClick={() => closeTab(menuTab)}
            className="w-full rounded-[2px] px-3 py-2 text-left text-xs hover:bg-[rgb(var(--muted))] disabled:opacity-40"
          >
            关闭当前
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => closeOtherTabs(menuTab.key)}
            className="w-full rounded-[2px] px-3 py-2 text-left text-xs hover:bg-[rgb(var(--muted))]"
          >
            关闭其他
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => closeTabsOnSide(menuTab.key, 'left')}
            className="w-full rounded-[2px] px-3 py-2 text-left text-xs hover:bg-[rgb(var(--muted))]"
          >
            关闭左侧
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => closeTabsOnSide(menuTab.key, 'right')}
            className="w-full rounded-[2px] px-3 py-2 text-left text-xs hover:bg-[rgb(var(--muted))]"
          >
            关闭右侧
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={closeAllTabs}
            className="w-full rounded-[2px] px-3 py-2 text-left text-xs hover:bg-[rgb(var(--muted))]"
          >
            关闭全部
          </button>
        </div>
      ) : null}

      <div className="p-4 lg:p-5">
        <KeepAlive
          aliveRef={aliveRef}
          activeCacheKey={activeKey}
          max={20}
          containerClassName="min-h-0"
          cacheNodeClassName="min-h-0"
        >
          {routeView}
        </KeepAlive>
      </div>
    </div>
  );
}
