'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Database,
  KeyRound,
  LayoutDashboard,
  ListTree,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn';

const groups = [
  {
    label: '工作台',
    icon: LayoutDashboard,
    items: [{ label: '总览', href: '/dashboard', icon: CircleGauge }],
  },
  {
    label: '组织管理',
    icon: Users,
    items: [
      { label: '用户管理', href: '/users', icon: Users },
      { label: '角色管理', href: '/roles', icon: KeyRound },
      { label: '菜单权限', href: '/menus', icon: ListTree },
    ],
  },
  {
    label: '系统管理',
    icon: Database,
    items: [{ label: '系统参数', href: '/system-params', icon: Database }],
  },
  {
    label: '安全中心',
    icon: ShieldCheck,
    items: [
      { label: '操作日志', href: '/operation-logs', icon: ClipboardList },
      { label: '慢 SQL', href: '/slow-sql', icon: Activity },
    ],
  },
  {
    label: '运维管理',
    icon: BookOpenText,
    items: [{ label: '异步任务', href: '/async-tasks', icon: BookOpenText }],
  },
];

type NavItem = (typeof groups)[number]['items'][number] & { children?: NavItem[] };

function NavItemLink({
  item,
  pathname,
  onClose,
  depth = 0,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
  depth?: number;
}) {
  const active = pathname === item.href;
  const hasActiveChild = item.children?.some((child) => pathname === child.href) ?? false;
  const Icon = item.icon;

  return (
    <div className={cn('relative', depth > 0 && 'ml-3 border-l border-[rgb(var(--line))] pl-3')}>
      <Link
        href={item.href}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex h-9 items-center gap-3 rounded-[4px] px-3 text-[13px] text-[rgb(var(--ink-muted))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]',
          (active || hasActiveChild) && 'text-[rgb(var(--ink))]',
          active && 'bg-[rgb(var(--muted))] font-semibold',
        )}
      >
        <span
          className={cn(
            'absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-transparent transition-colors',
            active && 'bg-[rgb(var(--accent-strong))]',
          )}
        />
        <Icon
          size={15}
          className={cn(
            'shrink-0',
            (active || hasActiveChild) && 'text-[rgb(var(--accent-strong))]',
          )}
        />
        <span className="truncate">{item.label}</span>
        {active && (
          <span className="ml-auto text-[10px] font-medium text-[rgb(var(--accent-strong))]">
            当前
          </span>
        )}
      </Link>
      {item.children?.length ? (
        <div className="space-y-0.5 pt-0.5">
          {item.children.map((child) => (
            <NavItemLink
              key={child.href}
              item={child}
              pathname={pathname}
              onClose={onClose}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="关闭菜单"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[248px] -translate-x-full flex-col border-r border-[rgb(var(--line))] bg-[rgb(var(--surface))] transition-transform lg:static lg:translate-x-0',
          open && 'translate-x-0',
        )}
      >
        <div className="flex h-[68px] items-center justify-between border-b border-[rgb(var(--line))] px-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="grid h-8 w-8 place-items-center rounded-[4px] bg-[rgb(var(--accent))] font-serif text-lg font-bold text-white">
              M
            </span>
            <span>
              <strong className="block font-serif text-[15px] tracking-wide text-[rgb(var(--ink))]">
                Manzhushaka
              </strong>
              <small className="block text-[10px] uppercase tracking-[.18em] text-[rgb(var(--ink-muted))]">
                Console
              </small>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭菜单"
            className="text-[rgb(var(--ink-muted))] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-[rgb(var(--line))] px-5 py-3 text-[11px] uppercase tracking-[.16em] text-[rgb(var(--ink-muted))]">
          <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--success))]" />
          系统在线
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="主导航">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <button
                type="button"
                aria-expanded={!collapsedGroups[group.label]}
                aria-controls={`nav-group-${group.label}`}
                onClick={() =>
                  setCollapsedGroups((current) => ({
                    ...current,
                    [group.label]: !current[group.label],
                  }))
                }
                className="flex h-8 w-full items-center gap-2 rounded-[4px] px-3 pb-1 text-left text-[13px] font-semibold text-[rgb(var(--ink))] transition-colors hover:bg-[rgb(var(--muted))]"
              >
                <group.icon size={15} className="text-[rgb(var(--ink-muted))]" />
                {group.label}
                {collapsedGroups[group.label] ? (
                  <ChevronRight size={14} className="ml-auto text-[rgb(var(--ink-muted))]" />
                ) : (
                  <ChevronDown size={14} className="ml-auto text-[rgb(var(--ink-muted))]" />
                )}
              </button>
              <div
                id={`nav-group-${group.label}`}
                hidden={collapsedGroups[group.label]}
                className="relative space-y-0.5 pl-2"
              >
                <span
                  className="absolute bottom-1 left-3 top-1 w-px bg-[rgb(var(--line))]"
                  aria-hidden="true"
                />
                {group.items.map((item) => (
                  <NavItemLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-[rgb(var(--line))] px-5 py-4">
          <p className="mb-1 text-[11px] text-[rgb(var(--ink-muted))]">版本</p>
          <p className="font-mono text-xs text-[rgb(var(--ink))]">0.1.0 / local</p>
        </div>
      </aside>
    </>
  );
}
