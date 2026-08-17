'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Database,
  FileDown,
  KeyRound,
  ListTree,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ResourcePage,
  type ResourceColumn,
  type ResourceField,
  type ResourceFilter,
} from './resource-page';
import { AsyncTasksPage } from './async-tasks-page';

const userStatusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'ACTIVE', label: '正常' },
  { value: 'DISABLED', label: '停用' },
  { value: 'LOCKED', label: '锁定' },
] as const;

const shortcuts = [
  { label: '用户管理', href: '/users', icon: Users },
  { label: '角色管理', href: '/roles', icon: KeyRound },
  { label: '菜单权限', href: '/menus', icon: ListTree },
  { label: '异步任务', href: '/async-tasks', icon: FileDown },
];

const menuFilters = [
  {
    key: 'type',
    label: '节点类型',
    options: [
      { value: 'all', label: '全部类型' },
      { value: 'DIRECTORY', label: '目录' },
      { value: 'PAGE', label: '页面' },
      { value: 'EXTERNAL', label: '外链' },
      { value: 'BUTTON', label: '按钮' },
    ],
  },
  {
    key: 'visible',
    label: '可见状态',
    options: [
      { value: 'all', label: '全部状态' },
      { value: 'true', label: '侧栏可见' },
      { value: 'false', label: '侧栏隐藏' },
    ],
  },
  {
    key: 'hierarchy',
    label: '层级',
    options: [
      { value: 'all', label: '全部层级' },
      { value: 'root', label: '顶级节点' },
      { value: 'child', label: '子级节点' },
    ],
  },
] satisfies readonly ResourceFilter[];

const resources: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    columns: readonly ResourceColumn[];
    apiPath: string;
    action?: string;
    fields?: readonly ResourceField[];
    keywordPlaceholder?: string;
    filters?: readonly ResourceFilter[];
    dateRangeFilter?: { key: string; label: string };
  }
> = {
  '/users': {
    eyebrow: 'ORGANIZATION / USERS',
    title: '用户管理',
    description: '管理账号状态、所属部门、角色和初始密码策略。',
    icon: Users,
    apiPath: '/users',
    action: '新增用户',
    columns: [
      { key: 'username', label: '用户名' },
      { key: 'displayName', label: '显示名称' },
      { key: 'department', label: '主部门' },
      { key: 'roles', label: '角色' },
      { key: 'status', label: '状态' },
      { key: 'createdAt', label: '创建时间', format: 'datetime' },
    ],
    fields: [
      { key: 'username', label: '用户名', required: true },
      { key: 'displayName', label: '显示名称', required: true },
      { key: 'password', label: '初始密码', type: 'password', requiredWhenCreating: true },
      { key: 'email', label: '邮箱' },
      { key: 'mobile', label: '手机号' },
      { key: 'departmentId', label: '部门 ID' },
      { key: 'status', label: '账号状态', type: 'select', options: userStatusOptions, defaultValue: 'ACTIVE' },
    ],
    filters: [{ key: 'status', label: '状态', options: userStatusOptions }],
    dateRangeFilter: { key: 'createdAt', label: '创建时间' },
  },
  '/roles': {
    eyebrow: 'ORGANIZATION / ROLES',
    title: '角色管理',
    description: '按角色分配菜单、按钮、API 和数据范围权限。',
    icon: KeyRound,
    apiPath: '/roles',
    action: '新增角色',
    columns: [
      { key: 'name', label: '角色名称' },
      { key: 'code', label: '编码' },
      { key: 'dataScope', label: '数据范围' },
      { key: 'memberCount', label: '成员数' },
      { key: 'updatedAt', label: '更新时间', format: 'datetime' },
    ],
    fields: [
      { key: 'name', label: '角色名称', required: true },
      { key: 'code', label: '编码', required: true },
      { key: 'description', label: '说明' },
      { key: 'dataScope', label: '数据范围', defaultValue: 'SELF' },
    ],
    filters: [],
    dateRangeFilter: { key: 'createdAt', label: '创建时间' },
  },
  '/menus': {
    eyebrow: 'ORGANIZATION / PERMISSIONS',
    title: '菜单权限',
    description: '维护目录、页面、外链和按钮权限，侧栏按层级动态生成。',
    icon: ListTree,
    apiPath: '/menus',
    action: '新增节点',
    keywordPlaceholder: '名称 / 权限编码 / 路径',
    columns: [
      { key: 'name', label: '名称' },
      { key: 'code', label: '权限编码' },
      { key: 'type', label: '类型' },
      { key: 'path', label: '路径' },
      { key: 'parentName', label: '父级节点' },
      { key: 'visible', label: '可见', format: 'boolean' },
      { key: 'sort', label: '排序' },
      { key: 'createdAt', label: '创建时间', format: 'datetime' },
    ],
    fields: [
      { key: 'name', label: '名称', required: true },
      { key: 'code', label: '权限编码', required: true },
      { key: 'type', label: '节点类型', type: 'select', required: true, options: menuFilters[0]!.options, defaultValue: 'PAGE' },
      { key: 'path', label: '路径' },
      { key: 'parentId', label: '父级节点 ID' },
      { key: 'sort', label: '排序', type: 'number', defaultValue: '0' },
      { key: 'visible', label: '侧栏可见', type: 'boolean', defaultValue: 'true' },
    ],
    filters: menuFilters,
    dateRangeFilter: { key: 'createdAt', label: '创建时间' },
  },
  '/departments': {
    eyebrow: 'ORGANIZATION / DEPARTMENTS',
    title: '部门管理',
    description: '维护组织树、主部门和岗位归属。',
    icon: Users,
    apiPath: '/departments',
    action: '新增部门',
    columns: [
      { key: 'name', label: '部门名称' },
      { key: 'parentName', label: '上级部门' },
      { key: 'memberCount', label: '成员数' },
      { key: 'childCount', label: '子部门' },
      { key: 'createdAt', label: '创建时间', format: 'datetime' },
    ],
    fields: [
      { key: 'name', label: '部门名称', required: true },
      { key: 'parentId', label: '上级部门 ID' },
      { key: 'sort', label: '排序', type: 'number', defaultValue: '0' },
    ],
    filters: [menuFilters[2]!],
    dateRangeFilter: { key: 'createdAt', label: '创建时间' },
  },
  '/operation-logs': {
    eyebrow: 'SECURITY / AUDIT',
    title: '操作日志',
    description: '查看可追溯的操作审计，敏感字段会在入库前脱敏。',
    icon: ShieldCheck,
    apiPath: '/audit-logs',
    columns: [
      { key: 'createdAt', label: '时间', format: 'datetime' },
      { key: 'actor', label: '操作人' },
      { key: 'action', label: '动作' },
      { key: 'resource', label: '资源' },
      { key: 'result', label: '结果' },
      { key: 'ip', label: '来源 IP' },
    ],
    filters: [],
    dateRangeFilter: { key: 'createdAt', label: '创建时间' },
  },
  '/slow-sql': {
    eyebrow: 'SECURITY / QUERY MONITOR',
    title: '慢 SQL',
    description: '查看超过阈值的查询，参数默认脱敏，帮助定位数据层瓶颈。',
    icon: Activity,
    apiPath: '/slow-sql',
    columns: [
      { key: 'createdAt', label: '发生时间', format: 'datetime' },
      { key: 'durationMs', label: '耗时（ms）' },
      { key: 'model', label: '模型' },
      { key: 'action', label: '动作' },
      { key: 'queryText', label: '查询摘要' },
    ],
    filters: [],
    dateRangeFilter: { key: 'createdAt', label: '创建时间' },
  },
  '/async-tasks': {
    eyebrow: 'OPERATIONS / ASYNC TASKS',
    title: '异步任务',
    description: '跟踪导入、导出进度和错误报告，完成后通过 BOS 临时链接下载。',
    icon: FileDown,
    apiPath: '/async-tasks',
    action: '创建任务',
    columns: [
      { key: 'type', label: '任务类型' },
      { key: 'handler', label: '处理器' },
      { key: 'processed', label: '已处理' },
      { key: 'status', label: '状态' },
      { key: 'createdAt', label: '创建时间', format: 'datetime' },
      { key: 'fileKey', label: '文件' },
    ],
  },
};

function DashboardView() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [summary, setSummary] = useState<{
    users: number;
    activeSessions: number;
    pendingTasks: number;
    slowSqlLast24Hours: number;
    activity: Array<{ hour: string; count: number }>;
  } | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(api + '/api/dashboard/summary', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as
          | { message?: string; users?: number; activeSessions?: number; pendingTasks?: number; slowSqlLast24Hours?: number; activity?: Array<{ hour: string; count: number }> }
          | null;
        if (!response.ok) throw new Error(body?.message ?? '工作台数据请求失败。');
        if (active && body?.users !== undefined) {
          setSummary({
            users: body.users,
            activeSessions: body.activeSessions ?? 0,
            pendingTasks: body.pendingTasks ?? 0,
            slowSqlLast24Hours: body.slowSqlLast24Hours ?? 0,
            activity: body.activity ?? [],
          });
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : '请稍后重试。');
      });
    return () => {
      active = false;
    };
  }, [api]);

  const signals = [
    { label: '用户总数', value: summary?.users ?? '—', caption: summary ? '已同步用户目录' : loadError || '正在加载', icon: Users },
    { label: '在线会话', value: summary?.activeSessions ?? '—', caption: summary ? '当前有效会话' : loadError || '正在加载', icon: ShieldCheck },
    { label: '待处理任务', value: summary?.pendingTasks ?? '—', caption: summary ? '等待或处理中' : loadError || '正在加载', icon: FileDown },
    { label: '慢 SQL', value: summary?.slowSqlLast24Hours ?? '—', caption: summary ? '最近 24 小时' : loadError || '正在加载', icon: Database },
  ];
  const activityMaximum = Math.max(1, ...((summary?.activity ?? []).map((item) => item.count)));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        <section className="rounded-[2px] bg-[rgb(var(--surface))] p-5">
          <div className="border-b border-[rgb(var(--line))] pb-4">
            <h1 className="text-xl font-semibold">欢迎回来</h1>
            <p className="mt-1 text-sm text-[rgb(var(--ink-muted))]">
              这是你的系统运行工作台，关键状态和待处理事项会集中显示在这里。
            </p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {signals.map(({ label, value, caption, icon: Icon }) => (
              <div
                key={label}
                className="flex min-h-[116px] items-center gap-4 border-b border-[rgb(var(--line))] px-4 py-5 sm:border-r xl:border-b-0"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                  <Icon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-[rgb(var(--ink-muted))]">{label}</p>
                  <strong className="mt-1 block text-2xl font-semibold">{value}</strong>
                  <p className="mt-0.5 truncate text-[11px] text-[rgb(var(--ink-muted))]">
                    {caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2px] bg-[rgb(var(--surface))] p-5">
          <div className="flex items-center justify-between border-b border-[rgb(var(--line))] pb-4">
            <div>
              <h2 className="font-semibold">运行趋势</h2>
              <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">最近 24 小时系统活动</p>
            </div>
            <Link href="/operation-logs" className="text-xs font-medium text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))]">查看详情</Link>
          </div>
          <div className="relative min-h-[300px] overflow-hidden pt-5">
            <div
              className="absolute inset-x-0 bottom-10 top-5 flex flex-col justify-between"
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4].map((line) => (
                <span
                  key={line}
                  className="block border-t border-dashed border-[rgb(var(--line))]"
                />
              ))}
            </div>
            <div className="relative flex min-h-[250px] items-end gap-1 px-1">
              {summary?.activity.length ? summary.activity.map((item) => (
                <span key={item.hour} title={new Date(item.hour).toLocaleString('zh-CN') + '：' + String(item.count) + ' 次'} className="min-w-0 flex-1 rounded-t-[2px] bg-[rgb(var(--accent))]/75" style={{ height: String(Math.max(2, Math.round((item.count / activityMaximum) * 100))) + '%' }} />
              )) : (
                <div className="mx-auto text-center"><Activity size={22} className="mx-auto mb-3 text-[rgb(var(--accent))]" /><p className="text-sm font-medium">{loadError ? '无法加载运行数据' : '正在加载运行数据'}</p><p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">{loadError || '最近 24 小时系统活动'}</p></div>
              )}
            </div>
            <div className="relative flex justify-between text-[11px] text-[rgb(var(--ink-muted))]">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-[2px] bg-[rgb(var(--surface))] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">快捷入口</h2>
            <span className="text-xs text-[rgb(var(--accent))]">常用功能</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[2px] border border-transparent bg-[rgb(var(--muted))] text-xs text-[rgb(var(--ink-muted))] transition-colors hover:border-[rgb(var(--accent))]/30 hover:text-[rgb(var(--accent))]"
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[2px] bg-[rgb(var(--surface))] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">安全检查</h2>
            <ShieldCheck size={17} className="text-[rgb(var(--accent))]" />
          </div>
          <div className="divide-y divide-[rgb(var(--line))]">
            {['数据库连接', 'BOS 私有存储', '加密密钥', '运行日志'].map((item) => (
              <div key={item} className="flex items-center justify-between py-3 text-sm">
                <span>{item}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--warning))]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--warning))]" />
                  待配置
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/system-params"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--accent))]"
          >
            前往系统参数 <ArrowUpRight size={13} />
          </Link>
        </section>
      </aside>
    </div>
  );
}

export function ConsoleRouteView({
  pathname,
  fallback,
}: {
  pathname: string;
  fallback?: React.ReactNode;
}) {
  if (pathname === '/dashboard') {
    return <DashboardView />;
  }
  if (pathname === '/async-tasks') {
    return <AsyncTasksPage />;
  }
  const resource = resources[pathname];
  return resource ? <ResourcePage {...resource} /> : fallback;
}
