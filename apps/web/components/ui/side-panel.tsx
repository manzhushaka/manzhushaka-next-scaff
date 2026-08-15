'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

export function SidePanel({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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

  return (
    <div className={open ? 'pointer-events-auto' : 'pointer-events-none'} aria-hidden={!open}>
      <button
        type="button"
        aria-label="关闭侧边面板"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity [transition-duration:var(--motion-panel)] ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed inset-y-0 right-0 z-[60] flex w-full max-w-[480px] flex-col border-l border-[rgb(var(--line))] bg-[rgb(var(--surface))]/95 shadow-[var(--shadow-overlay)] backdrop-blur-[var(--blur-overlay)] transition-transform [transition-duration:var(--motion-panel)] [transition-timing-function:var(--ease-fluid)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex min-h-[60px] items-start gap-3 border-b border-[rgb(var(--line))] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">{description}</p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="关闭"
            title="关闭"
            tabIndex={open ? 0 : -1}
            onClick={onClose}
            className="ui-press grid h-8 w-8 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <footer className="border-t border-[rgb(var(--line))] p-4">{footer}</footer>
        ) : null}
      </section>
    </div>
  );
}
