'use client';

import { Ban, CircleHelp, Download, FileDown, Plus, RefreshCw, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { TaskStatus } from '@manzhushaka/contracts';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useFeedback } from '../ui/feedback';
import { Input } from '../ui/input';
import { SidePanel } from '../ui/side-panel';

type TaskItem = {
  id: string;
  type: 'IMPORT' | 'EXPORT';
  handler: string;
  status: TaskStatus;
  total: number;
  processed: number;
  createdAt: string;
  errorMessage?: string;
};

type TaskFilter = 'all' | 'running' | 'done' | 'failed';

const filters: Array<{ value: TaskFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'running', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'failed', label: '失败' },
];

const statusLabels: Record<TaskStatus, string> = {
  PENDING: '等待中',
  RUNNING: '处理中',
  SUCCESS: '已完成',
  PARTIAL_SUCCESS: '部分完成',
  FAILED: '失败',
  CANCELED: '已取消',
};

const statusStyles: Record<TaskStatus, string> = {
  PENDING: 'bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]',
  RUNNING: 'bg-[rgb(var(--info))]/10 text-[rgb(var(--info))]',
  SUCCESS: 'bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]',
  PARTIAL_SUCCESS: 'bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]',
  FAILED: 'bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]',
  CANCELED: 'bg-[rgb(var(--muted))] text-[rgb(var(--ink-muted))]',
};

function matchesFilter(task: TaskItem, filter: TaskFilter) {
  if (filter === 'all') return true;
  if (filter === 'running') return task.status === 'PENDING' || task.status === 'RUNNING';
  if (filter === 'done') return task.status === 'SUCCESS' || task.status === 'PARTIAL_SUCCESS';
  return task.status === 'FAILED';
}

export function AsyncTasksPage() {
  const { notify } = useFeedback();
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [taskType, setTaskType] = useState<'IMPORT' | 'EXPORT'>('EXPORT');
  const [handler, setHandler] = useState('system:example-export');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingCancel, setPendingCancel] = useState<TaskItem | null>(null);
  const [downloads, setDownloads] = useState<Record<string, { url: string; expiresAt: number }>>(
    {},
  );
  const [now, setNow] = useState(() => Date.now());
  const visibleTasks = useMemo(
    () => tasks.filter((task) => matchesFilter(task, filter)),
    [filter, tasks],
  );

  useEffect(() => {
    if (!Object.values(downloads).some((download) => download.expiresAt > Date.now())) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [downloads]);

  async function refreshTasks() {
    try {
      const response = await fetch(api + '/api/async-tasks', { credentials: 'include' });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? '异步任务查询失败。');
      }
      const body = (await response.json()) as { items?: TaskItem[] };
      setTasks(body.items ?? []);
      notify({ title: '任务列表已更新', tone: 'success' });
    } catch (error) {
      notify({
        title: '无法刷新任务',
        description: error instanceof Error ? error.message : '请稍后重试。',
        tone: 'error',
      });
    }
  }

  useEffect(() => {
    void refreshTasks();
  }, []);

  function openCreatePanel() {
    setTaskType('EXPORT');
    setHandler('system:example-export');
    setSelectedFile(null);
    setDirty(false);
    setPanelOpen(true);
  }

  function requestClosePanel() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    setPanelOpen(false);
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = new FormData();
      body.set('type', taskType);
      body.set('handler', handler);
      if (selectedFile) body.set('file', selectedFile);
      const response = await fetch(api + '/api/async-tasks', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(errorBody?.message ?? '异步任务创建失败。');
      }
      const task = (await response.json()) as TaskItem;
      setTasks((current) => [task, ...current]);
      setDirty(false);
      setPanelOpen(false);
      notify({ title: '任务已创建', description: '进度会在列表中持续更新。', tone: 'success' });
    } catch (error) {
      notify({
        title: '任务未创建',
        description: error instanceof Error ? error.message : '请稍后重试。',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTask(task: TaskItem, action: 'cancel' | 'retry') {
    try {
      const response = await fetch(api + '/api/async-tasks/' + task.id + '/' + action, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(errorBody?.message ?? (action === 'cancel' ? '取消任务失败。' : '重试任务失败。'));
      }
      const updatedTask = (await response.json()) as TaskItem;
      setTasks((current) =>
        current.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
      );
      notify({
        title: action === 'cancel' ? '任务已取消' : '任务已重新排队',
        tone: 'success',
      });
    } catch (error) {
      notify({
        title: action === 'cancel' ? '无法取消任务' : '无法重试任务',
        description: error instanceof Error ? error.message : '请稍后重试。',
        tone: 'error',
      });
    }
  }

  async function downloadTask(task: TaskItem) {
    try {
      const existingDownload = downloads[task.id];
      if (existingDownload && existingDownload.expiresAt > Date.now()) {
        window.location.assign(existingDownload.url);
        return;
      }
      const response = await fetch(api + '/api/async-tasks/' + task.id + '/download', {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(errorBody?.message ?? '临时下载链接签发失败。');
      }
      const result = (await response.json()) as { url: string; expiresAt: string };
      const expiresAt = new Date(result.expiresAt).getTime();
      const expiresIn = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setDownloads((current) => ({
        ...current,
        [task.id]: { url: result.url, expiresAt },
      }));
      notify({
        title: '下载链接已签发',
        description: '链接将在 ' + String(expiresIn) + ' 秒后失效。',
        tone: 'success',
      });
      window.location.assign(result.url);
    } catch (error) {
      notify({
        title: '无法下载文件',
        description: error instanceof Error ? error.message : '请稍后重试。',
        tone: 'error',
      });
    }
  }

  return (
    <>
      <section className="min-h-[620px] rounded-[2px] bg-[rgb(var(--surface))] p-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgb(var(--line))] pb-5">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[4px] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
              <FileDown size={16} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold">异步任务</h1>
                <span className="text-[11px] text-[rgb(var(--ink-muted))]">
                  OPERATIONS / ASYNC TASKS
                </span>
              </div>
              <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">
                跟踪导入、导出进度和错误报告，完成后获取临时下载链接。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void refreshTasks()}>
              <RefreshCw size={14} />
              刷新
            </Button>
            <Button type="button" size="sm" onClick={openCreatePanel}>
              <Plus size={14} />
              创建任务
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div
            className="inline-flex rounded-[4px] bg-[rgb(var(--muted))] p-0.5"
            role="tablist"
            aria-label="任务状态"
          >
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  'ui-press h-8 min-w-[68px] rounded-[3px] px-3 text-xs font-medium text-[rgb(var(--ink-muted))] transition-colors',
                  filter === item.value &&
                    'bg-[rgb(var(--surface))] text-[rgb(var(--accent))] shadow-[0_1px_2px_rgb(0_0_0/0.08)]',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-[rgb(var(--ink-muted))]">
            共 {visibleTasks.length} 个任务
          </span>
        </div>

        {visibleTasks.length ? (
          <div className="divide-y divide-[rgb(var(--line))] border-y border-[rgb(var(--line))]">
            {visibleTasks.map((task) => {
              const progress =
                task.total > 0 ? Math.min(100, (task.processed / task.total) * 100) : 0;
              const downloadSeconds = Math.max(
                0,
                Math.ceil(((downloads[task.id]?.expiresAt ?? 0) - now) / 1000),
              );
              const downloadCountdown =
                downloadSeconds > 0
                  ? String(Math.floor(downloadSeconds / 60)) +
                    ':' +
                    String(downloadSeconds % 60).padStart(2, '0')
                  : '';
              return (
                <article key={task.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-medium">{task.handler}</h2>
                        <span
                          className={cn(
                            'rounded-[3px] px-2 py-0.5 text-[11px]',
                            statusStyles[task.status],
                          )}
                        >
                          {statusLabels[task.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">
                        {task.type === 'EXPORT' ? '导出' : '导入'} ·{' '}
                        {new Date(task.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {task.status === 'RUNNING' || task.status === 'PENDING' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingCancel(task)}
                        >
                          <Ban size={14} />
                          取消
                        </Button>
                      ) : null}
                      {task.status === 'FAILED' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void updateTask(task, 'retry')}
                        >
                          <RotateCcw size={14} />
                          重试
                        </Button>
                      ) : null}
                      {task.status === 'SUCCESS' || task.status === 'PARTIAL_SUCCESS' ? (
                        <Button type="button" size="sm" onClick={() => void downloadTask(task)}>
                          <Download size={14} />
                          {downloadCountdown ? '下载 · ' + downloadCountdown : '下载'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--muted))]">
                    <span
                      className="block h-full rounded-full bg-[rgb(var(--accent))] transition-[width] [transition-duration:var(--motion-panel)] [transition-timing-function:var(--ease-fluid)]"
                      style={{ width: String(progress) + '%' }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-[rgb(var(--ink-muted))]">
                    <span>
                      {task.processed} / {task.total}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  {task.errorMessage ? (
                    <p className="mt-3 text-xs text-[rgb(var(--danger))]">{task.errorMessage}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-[360px] place-items-center border-y border-[rgb(var(--line))] text-center">
            <div>
              <CircleHelp size={22} className="mx-auto text-[rgb(var(--ink-muted))]" />
              <p className="mt-3 text-sm font-medium">暂无任务</p>
              <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">
                {filter === 'all' ? '创建任务后可在这里跟踪状态。' : '当前状态下没有任务。'}
              </p>
            </div>
          </div>
        )}
      </section>

      <SidePanel
        open={panelOpen}
        title="创建异步任务"
        description="任务默认仅创建者可见。"
        onClose={requestClosePanel}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={requestClosePanel}>
              取消
            </Button>
            <Button type="submit" size="sm" form="async-task-form" disabled={submitting}>
              {submitting ? '正在创建…' : '创建任务'}
            </Button>
          </div>
        }
      >
        <form id="async-task-form" className="space-y-5" onSubmit={createTask}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">任务类型</span>
            <select
              value={taskType}
              onChange={(event) => {
                setTaskType(event.target.value as 'IMPORT' | 'EXPORT');
                setDirty(true);
              }}
              className="h-9 w-full rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-3 text-sm"
            >
              <option value="EXPORT">导出</option>
              <option value="IMPORT">导入</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">处理器</span>
            <Input
              value={handler}
              required
              onChange={(event) => {
                setHandler(event.target.value);
                setDirty(true);
              }}
            />
          </label>
          {taskType === 'IMPORT' ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">导入文件</span>
              <Input
                type="file"
                required
                accept=".xlsx,.csv"
                className="pt-1.5"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setDirty(true);
                }}
              />
            </label>
          ) : null}
        </form>
      </SidePanel>

      <ConfirmDialog
        open={discardOpen}
        title="放弃任务配置？"
        description="当前配置尚未提交，放弃后需要重新填写。"
        confirmLabel="放弃配置"
        danger
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          setDirty(false);
          setPanelOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="取消这个任务？"
        description="已完成的处理不会回滚，任务文件将按服务端策略保留。"
        confirmLabel="取消任务"
        danger
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => {
          const task = pendingCancel;
          setPendingCancel(null);
          if (task) void updateTask(task, 'cancel');
        }}
      />
    </>
  );
}
