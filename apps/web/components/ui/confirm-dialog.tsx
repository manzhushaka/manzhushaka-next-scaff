'use client';

import { TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from './button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/35 p-4"
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-[420px] rounded-[6px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-overlay)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]">
            <TriangleAlert size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-sm font-semibold">
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-1 text-xs leading-5 text-[rgb(var(--ink-muted))]"
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭确认框"
            title="关闭确认框"
            onClick={onCancel}
            className="ui-press grid h-7 w-7 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))]"
          >
            <X size={14} />
          </button>
        </div>
        <footer className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="secondary" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  );
}
