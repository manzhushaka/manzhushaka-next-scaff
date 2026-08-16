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
  ScrollText,
  Users,
  X,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '../../lib/cn';
import { BrandMark } from './brand-mark';
import { useSystemBranding } from '../system-branding-provider';

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
      { label: '部门管理', href: '/departments', icon: Users },
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
      { label: '运行日志', href: '/runtime-logs', icon: ScrollText },
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
    <div className={cn('relative', depth > 0 && 'pl-3')}>
      <Link
        href={item.href}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex h-10 items-center gap-3 rounded-[2px] px-3 text-sm text-[rgb(var(--ink-muted))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]',
          (active || hasActiveChild) && 'text-[rgb(var(--accent))]',
          active && 'bg-[rgb(var(--accent-soft))] font-medium',
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-transparent transition-colors',
            active && 'bg-[rgb(var(--accent))]',
          )}
        />
        <Icon
          size={15}
          className={cn('shrink-0', (active || hasActiveChild) && 'text-[rgb(var(--accent))]')}
        />
        <span className="truncate">{item.label}</span>
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

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  active: boolean;
  canceled: boolean;
  offset: number;
};

function rubberband(distance: number, dimension = 220, constant = 0.45) {
  return (distance * dimension * constant) / (dimension + constant * Math.abs(distance));
}

export function Sidebar({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { branding } = useSystemBranding();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 1023px)').matches) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const firstControl = asideRef.current?.querySelector<HTMLElement>('button, a[href]');
    firstControl?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !asideRef.current) return;
      const focusable = asideRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!open || !window.matchMedia('(max-width: 1023px)').matches) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      active: false,
      canceled: false,
      offset: 0,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.canceled) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        drag.canceled = true;
        return;
      }
      drag.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    const elapsed = Math.max(event.timeStamp - drag.lastTime, 1);
    const instantaneousVelocity = ((event.clientX - drag.lastX) / elapsed) * 1000;
    drag.velocity = drag.velocity * 0.65 + instantaneousVelocity * 0.35;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    const nextOffset = deltaX > 0 ? rubberband(deltaX) : Math.max(deltaX, -220);
    drag.offset = nextOffset;
    setDragOffset(nextOffset);
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.active || drag.canceled) return;
    const projectedOffset = drag.offset + drag.velocity * 0.18;
    setDragOffset(null);
    if (projectedOffset < -88 || drag.velocity < -520) onClose();
  }

  return (
    <>
      <button
        type="button"
        aria-label="关闭菜单"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-black/30 transition-opacity [transition-duration:var(--motion-panel)] lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div
        aria-hidden="true"
        onPointerDown={(event) => {
          if (event.clientX <= 18) onOpen();
        }}
        className="fixed inset-y-0 left-0 z-20 w-4 bg-transparent lg:hidden"
      />
      <aside
        ref={asideRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={
          {
            '--sidebar-translate':
              dragOffset !== null ? String(dragOffset) + 'px' : open ? '0px' : '-100%',
          } as CSSProperties
        }
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-full w-[220px] shrink-0 translate-x-[var(--sidebar-translate)] touch-pan-y flex-col border-r border-[rgb(var(--line))] bg-[rgb(var(--surface))]/95 shadow-[var(--shadow-overlay)] backdrop-blur-[var(--blur-overlay)] lg:static lg:!translate-x-0 lg:shadow-none',
          dragOffset === null &&
            'transition-transform [transition-duration:var(--motion-panel)] [transition-timing-function:var(--ease-fluid)]',
        )}
      >
        <div className="flex h-[60px] items-center justify-between border-b border-[rgb(var(--line))] px-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <BrandMark className="h-8 w-8 rounded-[6px] bg-[rgb(var(--accent))] text-lg font-bold text-white" />
            <span>
              <strong className="block text-[15px] font-semibold tracking-wide text-[rgb(var(--ink))]">
                {branding.shortName}
              </strong>
              <small
                className="block max-w-[132px] truncate text-[10px] text-[rgb(var(--ink-muted))]"
                title={branding.systemName}
              >
                {branding.systemName}
              </small>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭菜单"
            className="ui-press grid h-8 w-8 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="主导航">
          {groups.map((group) => (
            <div key={group.label} className="mb-2">
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
                className="ui-press flex h-10 w-full items-center gap-3 rounded-[2px] px-3 text-left text-sm font-medium text-[rgb(var(--ink-muted))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]"
              >
                <group.icon size={16} className="text-[rgb(var(--ink-muted))]" />
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
                className="relative space-y-0.5 pl-3"
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
        <div className="border-t border-[rgb(var(--line))] px-5 py-3">
          <p className="text-xs text-[rgb(var(--ink-muted))]">v0.1.0 · local</p>
        </div>
      </aside>
    </>
  );
}
