'use client';

import {
  AlertCircle,
  ChevronDown,
  CircleHelp,
  Pause,
  Play,
  RefreshCw,
  Search,
  ScrollText,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  runtimeLogListSchema,
  type RuntimeLogItem,
  type RuntimeLogLevel,
} from '@manzhushaka/contracts';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { usePathname } from 'next/navigation';

type LevelFilter = 'ALL' | RuntimeLogLevel;
type ServiceFilter = 'ALL' | 'api' | 'worker';

const levelOptions: Array<{ value: LevelFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'DEBUG', label: 'Debug' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARN', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'FATAL', label: 'Fatal' },
];

const levelLabels: Record<RuntimeLogLevel, string> = {
  DEBUG: 'Debug',
  INFO: 'Info',
  WARN: 'Warning',
  ERROR: 'Error',
  FATAL: 'Fatal',
};

const levelStyles: Record<RuntimeLogLevel, string> = {
  DEBUG: 'bg-[rgb(var(--muted))] text-[rgb(var(--ink-muted))]',
  INFO: 'bg-[rgb(var(--info))]/10 text-[rgb(var(--info))]',
  WARN: 'bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]',
  ERROR: 'bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]',
  FATAL: 'bg-[rgb(var(--danger))] text-white',
};

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatContext(log: RuntimeLogItem): string | null {
  if (!log.context && !log.stack) return null;
  const detail = {
    ...(log.context ?? {}),
    ...(log.stack ? { stack: log.stack } : {}),
  };
  return JSON.stringify(detail, null, 2);
}

export function RuntimeLogsPage() {
  const pathname = usePathname();
  const isActive = pathname === '/runtime-logs';
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [logs, setLogs] = useState<RuntimeLogItem[]>([]);
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [service, setService] = useState<ServiceFilter>('ALL');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const refreshingRef = useRef(false);

  const counts = useMemo(
    () => ({
      total: logs.length,
      info: logs.filter((log) => log.level === 'INFO').length,
      warning: logs.filter((log) => log.level === 'WARN').length,
      error: logs.filter((log) => log.level === 'ERROR' || log.level === 'FATAL').length,
    }),
    [logs],
  );

  const loadLogs = useCallback(
    async ({ cursor, append = false }: { cursor?: string; append?: boolean } = {}) => {
      if (!append && refreshingRef.current) return;
      if (append) setLoadingMore(true);
      else {
        refreshingRef.current = true;
        setLoading(true);
      }
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (level !== 'ALL') params.set('level', level);
        if (service !== 'ALL') params.set('service', service);
        if (appliedKeyword) params.set('keyword', appliedKeyword);
        if (cursor) params.set('cursor', cursor);
        const response = await fetch(api + '/api/runtime-logs?' + params.toString(), {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(
            response.status === 403 ? '当前账户没有查看运行日志的权限。' : '运行日志读取失败。',
          );
        }
        const result = runtimeLogListSchema.parse(await response.json());
        setLogs((current) => (append ? [...current, ...result.items] : result.items));
        setNextCursor(result.nextCursor);
        setUpdatedAt(new Date());
        setError(null);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : '运行日志读取失败。');
      } finally {
        refreshingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [api, appliedKeyword, level, service],
  );

  useEffect(() => {
    if (!isActive) return;
    void loadLogs();
  }, [isActive, loadLogs]);

  useEffect(() => {
    if (!live || !isActive) return;
    const timer = window.setInterval(() => void loadLogs(), 3000);
    return () => window.clearInterval(timer);
  }, [isActive, live, loadLogs]);

  function applyKeyword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedKeyword(keyword.trim());
  }

  return (
    <section className="min-h-[620px] rounded-[2px] bg-[rgb(var(--surface))] p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgb(var(--line))] pb-5">
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
            <ScrollText size={16} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold">运行日志</h1>
              <span className="text-[11px] text-[rgb(var(--ink-muted))]">
                OPERATIONS / RUNTIME LOGS
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--ink-muted))]">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  error
                    ? 'bg-[rgb(var(--danger))]'
                    : live
                      ? 'bg-[rgb(var(--success))]'
                      : 'bg-[rgb(var(--warning))]',
                )}
              />
              <span aria-live="polite">
                {error
                  ? '连接异常'
                  : live
                    ? '实时刷新中'
                    : updatedAt
                      ? `已暂停 · ${dateFormatter.format(updatedAt)}`
                      : '已暂停'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-pressed={!live}
            onClick={() => setLive((current) => !current)}
          >
            {live ? <Pause size={14} /> : <Play size={14} />}
            {live ? '暂停刷新' : '继续刷新'}
          </Button>
          <Button type="button" size="sm" onClick={() => void loadLogs()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
            刷新
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 border-b border-[rgb(var(--line))] py-4 sm:grid-cols-4">
        {[
          ['当前记录', counts.total, 'text-[rgb(var(--ink))]'],
          ['Info', counts.info, 'text-[rgb(var(--info))]'],
          ['Warning', counts.warning, 'text-[rgb(var(--warning))]'],
          ['Error / Fatal', counts.error, 'text-[rgb(var(--danger))]'],
        ].map(([label, value, color]) => (
          <div key={label} className="border-r border-[rgb(var(--line))] px-3 py-2 last:border-r-0">
            <p className="text-[11px] text-[rgb(var(--ink-muted))]">{label}</p>
            <strong className={cn('mt-1 block font-mono text-xl font-semibold', color as string)}>
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div className="space-y-4 border-b border-[rgb(var(--line))] py-4">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="日志级别">
          {levelOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={level === option.value}
              onClick={() => setLevel(option.value)}
              className={cn(
                'ui-press h-8 rounded-[2px] px-3 text-xs font-medium transition-colors',
                level === option.value
                  ? 'bg-[rgb(var(--accent))] text-white'
                  : 'bg-[rgb(var(--muted))] text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <form onSubmit={applyKeyword} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs text-[rgb(var(--ink-muted))]">
            服务
            <span className="relative">
              <select
                value={service}
                onChange={(event) => setService(event.target.value as ServiceFilter)}
                className="h-9 min-w-32 appearance-none rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] pl-3 pr-8 text-sm text-[rgb(var(--ink))]"
                aria-label="日志服务"
              >
                <option value="ALL">全部服务</option>
                <option value="api">API</option>
                <option value="worker">Worker</option>
              </select>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--ink-muted))]"
              />
            </span>
          </label>
          <div className="flex min-w-0 flex-1 gap-2 sm:max-w-[460px]">
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索消息或服务"
              aria-label="日志关键词"
              className="min-w-0"
            />
            <Button type="submit" size="sm" variant="secondary">
              <Search size={14} />
              查询
            </Button>
          </div>
        </form>
      </div>

      {error ? (
        <div
          role="alert"
          className="my-4 flex items-center gap-2 border border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/5 px-3 py-2 text-sm text-[rgb(var(--danger))]"
        >
          <AlertCircle size={16} />
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto border-x border-b border-[rgb(var(--line))]">
        <table className="w-full min-w-[860px] table-fixed text-left">
          <thead className="bg-[rgb(var(--muted))] text-xs text-[rgb(var(--ink-muted))]">
            <tr>
              <th className="w-[184px] px-3 py-2 font-medium">时间</th>
              <th className="w-[104px] px-3 py-2 font-medium">级别</th>
              <th className="w-[104px] px-3 py-2 font-medium">服务</th>
              <th className="px-3 py-2 font-medium">消息</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--line))]">
            {logs.map((log) => {
              const context = formatContext(log);
              return (
                <tr key={log.id} className="align-top hover:bg-[rgb(var(--muted))]/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-[rgb(var(--ink-muted))]">
                    {dateFormatter.format(new Date(log.createdAt))}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex min-w-[62px] justify-center rounded-[2px] px-2 py-0.5 font-mono text-[11px] font-semibold',
                        levelStyles[log.level],
                      )}
                    >
                      {levelLabels[log.level]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs uppercase text-[rgb(var(--ink-muted))]">
                    {log.service}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs leading-5 text-[rgb(var(--ink))]">
                    <p className="break-words">{log.message}</p>
                    {context ? (
                      <details className="mt-1 text-[rgb(var(--ink-muted))]">
                        <summary className="cursor-pointer select-none text-[11px] hover:text-[rgb(var(--accent))]">
                          查看上下文
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all border-l-2 border-[rgb(var(--line))] pl-3 text-[11px] leading-5">
                          {context}
                        </pre>
                      </details>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && logs.length === 0 ? (
          <div className="grid min-h-52 place-items-center px-4 text-center">
            <div>
              <CircleHelp size={18} className="mx-auto text-[rgb(var(--ink-muted))]" />
              <p className="mt-2 text-sm font-medium">暂无运行日志</p>
              <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">当前筛选条件下没有记录。</p>
            </div>
          </div>
        ) : null}
        {loading && logs.length === 0 ? (
          <div className="grid min-h-52 place-items-center text-sm text-[rgb(var(--ink-muted))]">
            <RefreshCw size={18} className="mb-2 animate-spin" />
            正在读取日志
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-3 py-4 text-xs text-[rgb(var(--ink-muted))]">
        <span>当前显示 {logs.length} 条</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!nextCursor || loadingMore}
          onClick={() => nextCursor && void loadLogs({ cursor: nextCursor, append: true })}
        >
          {loadingMore ? <RefreshCw size={14} className="animate-spin" /> : null}
          {nextCursor ? '加载更早记录' : '没有更多记录'}
        </Button>
      </footer>
    </section>
  );
}
