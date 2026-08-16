'use client';

import {
  Button as ArcoButton,
  Empty,
  Input as ArcoInput,
  Pagination,
  Table,
  type TableColumnProps,
} from '@arco-design/web-react';
import { ChevronDown, CircleHelp, Download, Plus, RotateCcw, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useFeedback } from '../ui/feedback';
import { Input } from '../ui/input';
import { SidePanel } from '../ui/side-panel';

type ResourceRow = Record<string, string>;

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'disabled', label: '停用' },
] as const;

type StatusValue = (typeof statusOptions)[number]['value'];

function StatusSelect({
  value,
  onChange,
}: {
  value: StatusValue;
  onChange: (value: StatusValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const activeOptionId = listboxId + '-option-' + String(highlightedIndex);
  const selectedOption = statusOptions.find((option) => option.value === value) ?? statusOptions[0];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function selectOption(index: number) {
    const option = statusOptions[index];
    if (!option) return;
    onChange(option.value);
    setHighlightedIndex(index);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(statusOptions.findIndex((option) => option.value === value));
      } else {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setHighlightedIndex(
          (highlightedIndex + direction + statusOptions.length) % statusOptions.length,
        );
      }
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      selectOption(highlightedIndex);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="状态"
        aria-activedescendant={open ? activeOptionId : undefined}
        onClick={() => {
          setOpen((current) => !current);
          setHighlightedIndex(statusOptions.findIndex((option) => option.value === value));
        }}
        onKeyDown={handleButtonKeyDown}
        className={cn(
          'ui-press flex h-8 w-full items-center justify-between gap-2 rounded-[2px] border bg-[rgb(var(--surface))] px-3 text-left text-sm text-[rgb(var(--ink))] transition-colors',
          open
            ? 'border-[rgb(var(--accent))] shadow-[0_0_0_2px_rgb(var(--accent)/0.12)]'
            : 'border-[rgb(var(--line))] hover:border-[rgb(var(--accent))]',
        )}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn(
            'shrink-0 text-[rgb(var(--ink-muted))] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="状态选项"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] p-1 shadow-[var(--shadow-overlay)]"
        >
          {statusOptions.map((option, index) => {
            const selected = option.value === value;
            const highlighted = index === highlightedIndex;
            return (
              <button
                key={option.value}
                id={listboxId + '-option-' + String(index)}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectOption(index)}
                className={cn(
                  'ui-press flex h-8 w-full items-center rounded-[2px] px-2 text-left text-sm transition-colors',
                  highlighted
                    ? 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent-strong))]'
                    : 'text-[rgb(var(--ink))] hover:bg-[rgb(var(--muted))]',
                )}
              >
                <span className="flex-1">{option.label}</span>
                {selected ? <span className="text-xs text-[rgb(var(--accent))]">当前</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ResourcePage({
  eyebrow,
  title,
  description,
  icon: Icon,
  columns,
  action = '新增记录',
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  columns: string[];
  action?: string;
}) {
  const { notify } = useFeedback();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusValue>('all');
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    status: 'all' as StatusValue,
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fieldError, setFieldError] = useState('');
  const ActionIcon = action.includes('导出') ? Download : Plus;
  const formFields = useMemo(
    () =>
      columns
        .filter(
          (column) =>
            !['状态', '更新时间', '创建时间', '最近登录', '成员数', '文件', '可见'].includes(
              column,
            ),
        )
        .slice(0, 3),
    [columns],
  );
  const tableColumns: TableColumnProps<ResourceRow>[] = [
    ...columns.map((column) => ({
      title: column,
      dataIndex: column,
      key: column,
      ellipsis: true,
    })),
    {
      title: '操作',
      key: 'actions',
      align: 'right',
      render: () => (
        <ArcoButton type="text" size="small" disabled>
          查看
        </ArcoButton>
      ),
    },
  ];
  const hasAppliedFilters = Boolean(appliedFilters.keyword) || appliedFilters.status !== 'all';

  function runQuery(event?: FormEvent) {
    event?.preventDefault();
    setAppliedFilters({ keyword: keyword.trim(), status });
    notify({
      title: '查询条件已应用',
      description: '资源接口接入后将使用当前条件请求服务端数据。',
      tone: 'info',
    });
  }

  function resetQuery() {
    setKeyword('');
    setStatus('all');
    setAppliedFilters({ keyword: '', status: 'all' });
    notify({ title: '筛选条件已重置', tone: 'success' });
  }

  function openCreatePanel() {
    if (action.includes('导出')) {
      notify({
        title: action + '暂不可用',
        description: '服务端导出任务接口尚未接入，未创建虚假任务。',
        tone: 'warning',
      });
      return;
    }
    setFormValues({});
    setFieldError('');
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

  function updateField(field: string, nextValue: string) {
    setFormValues((current) => ({ ...current, [field]: nextValue }));
    setDirty(true);
    if (field === formFields[0] && nextValue.trim()) setFieldError('');
  }

  function submitResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const primaryField = formFields[0];
    if (primaryField && !formValues[primaryField]?.trim()) {
      setFieldError('请输入' + primaryField);
      return;
    }
    notify({
      title: '草稿已保留',
      description: title + '写入接口尚未接入，当前填写内容不会被伪造为已保存。',
      tone: 'warning',
    });
  }

  return (
    <>
      <section className="min-h-[620px] rounded-[2px] bg-[rgb(var(--surface))] p-5">
        <header className="mb-5 flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
            <Icon size={16} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold">{title}</h1>
              <span className="text-[11px] text-[rgb(var(--ink-muted))]">{eyebrow}</span>
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">{description}</p>
          </div>
        </header>

        <form
          onSubmit={runQuery}
          className="flex flex-col gap-4 border-b border-[rgb(var(--line))] pb-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6"
        >
          <label className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[max-content_360px]">
            <span className="whitespace-nowrap text-sm text-[rgb(var(--ink-muted))]">关键词</span>
            <ArcoInput
              allowClear
              prefix={<Search size={15} />}
              placeholder="搜索当前资源"
              aria-label="搜索当前资源"
              value={keyword}
              onChange={setKeyword}
            />
          </label>
          <label className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[max-content_176px]">
            <span className="whitespace-nowrap text-sm text-[rgb(var(--ink-muted))]">状态</span>
            <StatusSelect value={status} onChange={setStatus} />
          </label>
          <div className="flex items-center gap-2 lg:ml-auto">
            <ArcoButton htmlType="submit" type="primary" size="small" icon={<Search size={14} />}>
              查询
            </ArcoButton>
            <ArcoButton
              htmlType="button"
              type="secondary"
              size="small"
              icon={<RotateCcw size={14} />}
              onClick={resetQuery}
            >
              重置
            </ArcoButton>
          </div>
        </form>

        <div className="flex items-center justify-between gap-3 py-4">
          <ArcoButton
            type="primary"
            size="small"
            icon={<ActionIcon size={14} />}
            onClick={openCreatePanel}
          >
            {action}
          </ArcoButton>
          <span className="text-xs text-[rgb(var(--ink-muted))]">
            {hasAppliedFilters ? '已应用筛选 · ' : ''}数据同步状态：等待连接
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table<ResourceRow>
            className="min-w-[760px]"
            columns={tableColumns}
            data={[]}
            rowKey="id"
            border={{ wrapper: true, cell: true }}
            hover
            noDataElement={
              <div className="py-10 text-center">
                <Empty icon={<CircleHelp size={18} />} description="暂无数据" />
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--ink-muted))]">
                  {hasAppliedFilters
                    ? '当前条件下暂无数据；资源接口接入后将显示匹配记录。'
                    : '连接资源接口后，这里会显示可操作记录。'}
                </p>
              </div>
            }
            pagination={false}
          />
        </div>

        <footer className="flex items-center justify-between py-4 text-xs text-[rgb(var(--ink-muted))]">
          <span>共 0 条</span>
          <Pagination
            size="small"
            current={1}
            pageSize={20}
            total={0}
            disabled
            showTotal={(total) => '共 ' + String(total) + ' 条'}
          />
        </footer>
      </section>

      <SidePanel
        open={panelOpen}
        title={action}
        description={'填写' + title + '的必要信息。未接入接口前内容只保留在当前页面。'}
        onClose={requestClosePanel}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={requestClosePanel}>
              取消
            </Button>
            <Button type="submit" size="sm" form="resource-editor-form">
              保存
            </Button>
          </div>
        }
      >
        <form id="resource-editor-form" onSubmit={submitResource} className="space-y-5">
          {formFields.map((field, index) => (
            <label key={field} className="block">
              <span className="mb-1.5 block text-xs font-medium">
                {field}
                {index === 0 ? <span className="ml-1 text-[rgb(var(--danger))]">*</span> : null}
              </span>
              <Input
                value={formValues[field] ?? ''}
                aria-invalid={index === 0 && Boolean(fieldError)}
                aria-describedby={index === 0 && fieldError ? 'resource-primary-error' : undefined}
                placeholder={'输入' + field}
                onChange={(event) => updateField(field, event.target.value)}
              />
              {index === 0 && fieldError ? (
                <span
                  id="resource-primary-error"
                  role="alert"
                  className="mt-1 block text-xs text-[rgb(var(--danger))]"
                >
                  {fieldError}
                </span>
              ) : null}
            </label>
          ))}
          <div className="rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--muted))] p-3 text-xs leading-5 text-[rgb(var(--ink-muted))]">
            保存动作将在对应服务端资源接口完成后启用。当前不会写入本地假数据或绕过服务端权限。
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={discardOpen}
        title="放弃未保存的修改？"
        description="当前填写内容尚未提交，放弃后无法恢复。"
        confirmLabel="放弃修改"
        danger
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          setDirty(false);
          setPanelOpen(false);
        }}
      />
    </>
  );
}
