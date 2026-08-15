'use client';

import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';

type FeedbackTone = 'info' | 'success' | 'warning' | 'error';

type FeedbackAction = {
  label: string;
  onClick: () => void;
};

type FeedbackInput = {
  title: string;
  description?: string;
  tone?: FeedbackTone;
  action?: FeedbackAction;
  duration?: number;
};

type FeedbackItem = FeedbackInput & { id: number };

type FeedbackContextValue = {
  notify: (input: FeedbackInput) => number;
  dismiss: (id: number) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneStyles: Record<FeedbackTone, string> = {
  info: 'text-[rgb(var(--info))]',
  success: 'text-[rgb(var(--success))]',
  warning: 'text-[rgb(var(--warning))]',
  error: 'text-[rgb(var(--danger))]',
};

const toneIcons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (input: FeedbackInput) => {
      const id = ++nextId.current;
      setItems((current) => [...current.slice(-3), { ...input, id }]);
      const duration = input.duration ?? (input.action ? 7000 : 4500);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:w-[360px]"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => {
          const tone = item.tone ?? 'info';
          const Icon = toneIcons[tone];
          return (
            <div
              key={item.id}
              role={tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-[6px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))]/95 p-3 shadow-[var(--shadow-overlay)] backdrop-blur-[var(--blur-overlay)] motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:fade-in"
            >
              <Icon size={17} className={cn('mt-0.5 shrink-0', toneStyles[tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[rgb(var(--ink))]">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--ink-muted))]">
                    {item.description}
                  </p>
                ) : null}
                {item.action ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))]"
                    onClick={() => {
                      item.action?.onClick();
                      dismiss(item.id);
                    }}
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="关闭提示"
                title="关闭提示"
                onClick={() => dismiss(item.id)}
                className="ui-press grid h-7 w-7 shrink-0 place-items-center rounded-[4px] text-[rgb(var(--ink-muted))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback 必须在 FeedbackProvider 内使用');
  return context;
}
