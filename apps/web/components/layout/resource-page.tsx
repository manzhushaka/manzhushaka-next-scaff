'use client';

import {
  Button as ArcoButton,
  Empty,
  Input as ArcoInput,
  Pagination,
  Table,
  type TableColumnProps,
} from '@arco-design/web-react';
import { ChevronDown, CircleHelp, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useFeedback } from '../ui/feedback';
import { Input } from '../ui/input';
import { SidePanel } from '../ui/side-panel';

type ResourceValue = string | number | boolean | null | undefined;
type ResourceItem = { id: string; [key: string]: ResourceValue };

export type ResourceFilterOption = { value: string; label: string };

export type ResourceFilter = {
  key: string;
  label: string;
  options: readonly ResourceFilterOption[];
};

export type ResourceDateRangeFilter = {
  key: string;
  label: string;
};

export type ResourceColumn = {
  key: string;
  label: string;
  format?: 'datetime' | 'boolean';
};

export type ResourceField = {
  key: string;
  label: string;
  required?: boolean;
  requiredWhenCreating?: boolean;
  type?: 'text' | 'password' | 'number' | 'select' | 'boolean';
  options?: readonly ResourceFilterOption[];
  defaultValue?: string;
};

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'disabled', label: '停用' },
] as const;

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ResourceFilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const activeOptionId = listboxId + '-option-' + String(highlightedIndex);
  const selectedOption = options.find((option) => option.value === value) ?? {
    value: '',
    label: '',
  };

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
    const option = options[index];
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
        setHighlightedIndex(
          Math.max(
            0,
            options.findIndex((option) => option.value === value),
          ),
        );
      } else {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setHighlightedIndex((highlightedIndex + direction + options.length) % options.length);
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
        aria-label={label}
        aria-activedescendant={open ? activeOptionId : undefined}
        onClick={() => {
          setOpen((current) => !current);
          setHighlightedIndex(
            Math.max(
              0,
              options.findIndex((option) => option.value === value),
            ),
          );
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
          aria-label={label + '选项'}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[4px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] p-1 shadow-[var(--shadow-overlay)]"
        >
          {options.map((option, index) => {
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
  apiPath,
  action,
  fields = [],
  keywordPlaceholder = '搜索当前资源',
  filters = [{ key: 'status', label: '状态', options: statusOptions }],
  dateRangeFilter,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  columns: readonly ResourceColumn[];
  apiPath: string;
  action?: string;
  fields?: readonly ResourceField[];
  keywordPlaceholder?: string;
  filters?: readonly ResourceFilter[];
  dateRangeFilter?: ResourceDateRangeFilter;
}) {
  const { notify } = useFeedback();
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [keyword, setKeyword] = useState('');
  const defaultFilterValues = Object.fromEntries(
    filters.map((filter) => [filter.key, filter.options[0]?.value ?? 'all']),
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>(defaultFilterValues);
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    filterValues: defaultFilterValues,
    createdFrom: '',
    createdTo: '',
  });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fieldError, setFieldError] = useState('');
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResourceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const hasWriteActions = Boolean(action && fields.length);
  const tableColumns: TableColumnProps<ResourceItem>[] = [
    ...columns.map((column) => ({
      title: column.label,
      dataIndex: column.key,
      key: column.key,
      ellipsis: true,
      render: (value: ResourceValue) => formatCell(value, column.format),
    })),
    ...(hasWriteActions
      ? [
          {
            title: '操作',
            key: 'actions',
            align: 'right' as const,
            render: (_: ResourceValue, row: ResourceItem) => (
              <span className="inline-flex gap-1">
                <ArcoButton type="text" size="small" icon={<Pencil size={14} />} onClick={() => openEditPanel(row)}>
                  编辑
                </ArcoButton>
                <ArcoButton type="text" size="small" status="danger" icon={<Trash2 size={14} />} onClick={() => setPendingDelete(row)}>
                  删除
                </ArcoButton>
              </span>
            ),
          },
        ]
      : []),
  ];
  const hasAppliedFilters =
    Boolean(appliedFilters.keyword || appliedFilters.createdFrom || appliedFilters.createdTo) ||
    Object.values(appliedFilters.filterValues).some((value) => value !== 'all');

  async function loadResources() {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (appliedFilters.keyword) params.set('keyword', appliedFilters.keyword);
      for (const [key, value] of Object.entries(appliedFilters.filterValues)) {
        if (value !== 'all') params.set(key, value);
      }
      if (appliedFilters.createdFrom) params.set('createdFrom', appliedFilters.createdFrom);
      if (appliedFilters.createdTo) params.set('createdTo', appliedFilters.createdTo);
      const response = await fetch(api + '/api' + apiPath + '?' + params.toString(), {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null) as
        | { items?: ResourceItem[]; total?: number; message?: string }
        | null;
      if (!response.ok) throw new Error(body?.message ?? '资源请求失败。');
      setItems(body?.items ?? []);
      setTotal(body?.total ?? 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试。';
      setItems([]);
      setTotal(0);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResources();
  }, [api, apiPath, appliedFilters, page]);

  function runQuery(event?: FormEvent) {
    event?.preventDefault();
    if (createdFrom && createdTo && createdFrom > createdTo) {
      notify({
        title: '创建时间范围无效',
        description: '起始日期不能晚于结束日期。',
        tone: 'warning',
      });
      return;
    }
    setAppliedFilters({
      keyword: keyword.trim(),
      filterValues: { ...filterValues },
      createdFrom,
      createdTo,
    });
    setPage(1);
  }

  function resetQuery() {
    setKeyword('');
    setFilterValues(defaultFilterValues);
    setCreatedFrom('');
    setCreatedTo('');
    setAppliedFilters({
      keyword: '',
      filterValues: defaultFilterValues,
      createdFrom: '',
      createdTo: '',
    });
    setPage(1);
    notify({ title: '筛选条件已重置', tone: 'success' });
  }

  function openCreatePanel() {
    setEditingItem(null);
    setFormValues(Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? ''])));
    setFieldError('');
    setDirty(false);
    setPanelOpen(true);
  }

  function openEditPanel(item: ResourceItem) {
    setEditingItem(item);
    setFormValues(
      Object.fromEntries(
        fields.map((field) => [field.key, item[field.key] === null || item[field.key] === undefined ? field.defaultValue ?? '' : String(item[field.key])]),
      ),
    );
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
    if (nextValue.trim()) setFieldError('');
  }

  async function submitResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredField = fields.find(
      (field) => field.required || (!editingItem && field.requiredWhenCreating),
    );
    if (requiredField && !formValues[requiredField.key]?.trim()) {
      setFieldError('请输入' + requiredField.label);
      return;
    }
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        fields.map((field) => {
          const value = formValues[field.key] ?? '';
          if (field.type === 'number') return [field.key, value ? Number(value) : 0];
          if (field.type === 'boolean') return [field.key, value === 'true'];
          return [field.key, value];
        }),
      );
      const response = await fetch(api + '/api' + apiPath + (editingItem ? '/' + editingItem.id : ''), {
        method: editingItem ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? '保存失败。');
      setDirty(false);
      setPanelOpen(false);
      notify({ title: editingItem ? '记录已更新' : '记录已创建', tone: 'success' });
      await loadResources();
    } catch (error) {
      notify({ title: '保存失败', description: error instanceof Error ? error.message : '请稍后重试。', tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource() {
    const item = pendingDelete;
    setPendingDelete(null);
    if (!item) return;
    try {
      const response = await fetch(api + '/api' + apiPath + '/' + item.id, {
        method: 'DELETE',
        credentials: 'include',
      });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? '删除失败。');
      notify({ title: '记录已删除', tone: 'success' });
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await loadResources();
    } catch (error) {
      notify({ title: '删除失败', description: error instanceof Error ? error.message : '请稍后重试。', tone: 'error' });
    }
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
              placeholder={keywordPlaceholder}
              aria-label={keywordPlaceholder}
              value={keyword}
              onChange={setKeyword}
            />
          </label>
          {filters.map((filter) => (
            <label
              key={filter.key}
              className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[max-content_176px]"
            >
              <span className="whitespace-nowrap text-sm text-[rgb(var(--ink-muted))]">
                {filter.label}
              </span>
              <FilterSelect
                label={filter.label}
                options={filter.options}
                value={filterValues[filter.key] ?? filter.options[0]?.value ?? 'all'}
                onChange={(value) =>
                  setFilterValues((current) => ({ ...current, [filter.key]: value }))
                }
              />
            </label>
          ))}
          {dateRangeFilter ? (
            <label className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[max-content_auto]">
              <span className="whitespace-nowrap text-sm text-[rgb(var(--ink-muted))]">
                {dateRangeFilter.label}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="date"
                  value={createdFrom}
                  aria-label={dateRangeFilter.label + '起始日期'}
                  onChange={(event) => setCreatedFrom(event.target.value)}
                  className="h-8 min-w-0 w-[142px] rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-2 text-sm text-[rgb(var(--ink))] outline-none transition-colors focus:border-[rgb(var(--accent))] focus:shadow-[0_0_0_2px_rgb(var(--accent)/0.12)]"
                />
                <span className="shrink-0 text-xs text-[rgb(var(--ink-muted))]">至</span>
                <input
                  type="date"
                  value={createdTo}
                  aria-label={dateRangeFilter.label + '结束日期'}
                  onChange={(event) => setCreatedTo(event.target.value)}
                  className="h-8 min-w-0 w-[142px] rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-2 text-sm text-[rgb(var(--ink))] outline-none transition-colors focus:border-[rgb(var(--accent))] focus:shadow-[0_0_0_2px_rgb(var(--accent)/0.12)]"
                />
              </span>
            </label>
          ) : null}
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
          {hasWriteActions ? (
            <ArcoButton type="primary" size="small" icon={<Plus size={14} />} onClick={openCreatePanel}>
              {action}
            </ArcoButton>
          ) : <span />}
          <span className="text-xs text-[rgb(var(--ink-muted))]">
            {hasAppliedFilters ? '已应用筛选 · ' : ''}数据同步状态：{loading ? '加载中' : loadError ? '加载失败' : '已同步'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table<ResourceItem>
            className="min-w-[760px]"
            columns={tableColumns}
            loading={loading}
            data={items}
            rowKey="id"
            border={{ wrapper: true, cell: true }}
            hover
            noDataElement={
              <div className="py-10 text-center">
                <Empty icon={<CircleHelp size={18} />} description="暂无数据" />
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--ink-muted))]">
                  {loadError ? loadError : hasAppliedFilters ? '当前条件下暂无数据。' : '暂无可操作记录。'}
                </p>
              </div>
            }
            pagination={false}
          />
        </div>

        <footer className="flex items-center justify-between py-4 text-xs text-[rgb(var(--ink-muted))]">
          <span>共 {total} 条</span>
          <Pagination
            size="small"
            current={page}
            pageSize={20}
            total={total}
            disabled={loading || total === 0}
            onChange={setPage}
            showTotal={(total) => '共 ' + String(total) + ' 条'}
          />
        </footer>
      </section>

      <SidePanel
        open={panelOpen}
        title={editingItem ? '编辑' + title : action ?? '新增记录'}
        description={'填写' + title + '的必要信息。'}
        onClose={requestClosePanel}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={requestClosePanel}>
              取消
            </Button>
            <Button type="submit" size="sm" form="resource-editor-form" disabled={saving}>
              {saving ? '正在保存…' : '保存'}
            </Button>
          </div>
        }
      >
        <form id="resource-editor-form" onSubmit={submitResource} className="space-y-5">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-xs font-medium">
                {field.label}
                {field.required ? <span className="ml-1 text-[rgb(var(--danger))]">*</span> : null}
              </span>
              {field.type === 'select' ? (
                <select value={formValues[field.key] ?? ''} onChange={(event) => updateField(field.key, event.target.value)} className="h-9 w-full rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-3 text-sm">
                  {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === 'boolean' ? (
                <select value={formValues[field.key] ?? 'true'} onChange={(event) => updateField(field.key, event.target.value)} className="h-9 w-full rounded-[2px] border border-[rgb(var(--line))] bg-[rgb(var(--surface))] px-3 text-sm">
                  <option value="true">是</option><option value="false">否</option>
                </select>
              ) : (
                <Input type={field.type ?? 'text'} value={formValues[field.key] ?? ''} aria-invalid={field.required && Boolean(fieldError)} aria-describedby={field.required && fieldError ? 'resource-primary-error' : undefined} placeholder={'输入' + field.label} onChange={(event) => updateField(field.key, event.target.value)} />
              )}
              {field.required && fieldError ? (
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
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除这条记录？"
        description="删除后将立即生效，相关限制会由服务端再次校验。"
        confirmLabel="删除记录"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteResource()}
      />
    </>
  );
}

function formatCell(value: ResourceValue, format?: ResourceColumn['format']) {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'boolean') return value ? '是' : '否';
  if (format === 'datetime' && typeof value === 'string') return new Date(value).toLocaleString('zh-CN');
  return String(value);
}
