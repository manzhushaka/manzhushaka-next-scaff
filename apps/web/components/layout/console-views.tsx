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
import { ResourcePage } from './resource-page';
import { AsyncTasksPage } from './async-tasks-page';

const signals = [
  { label: '用户总数', value: '—', caption: '等待数据库连接', icon: Users },
  { label: '在线会话', value: '—', caption: '等待会话服务', icon: ShieldCheck },
  { label: '待处理任务', value: '—', caption: '等待 Worker', icon: FileDown },
  { label: '慢 SQL', value: '—', caption: '等待查询监控', icon: Database },
];

const shortcuts = [
  { label: '用户管理', href: '/users', icon: Users },
  { label: '角色管理', href: '/roles', icon: KeyRound },
  { label: '菜单权限', href: '/menus', icon: ListTree },
  { label: '异步任务', href: '/async-tasks', icon: FileDown },
];

const resources: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    columns: string[];
    action?: string;
  }
> = {
  '/users': {
    eyebrow: 'ORGANIZATION / USERS',
    title: '用户管理',
    description: '管理账号状态、所属部门、角色和初始密码策略。',
    icon: Users,
    columns: ['用户名', '显示名称', '主部门', '角色', '状态', '最近登录'],
  },
  '/roles': {
    eyebrow: 'ORGANIZATION / ROLES',
    title: '角色管理',
    description: '按角色分配菜单、按钮、API 和数据范围权限。',
    icon: KeyRound,
    columns: ['角色名称', '编码', '数据范围', '成员数', '更新时间'],
  },
  '/menus': {
    eyebrow: 'ORGANIZATION / PERMISSIONS',
    title: '菜单权限',
    description: '维护目录、页面、外链和按钮权限，侧栏按层级动态生成。',
    icon: ListTree,
    action: '新增节点',
    columns: ['名称', '权限编码', '类型', '路径', '可见', '排序'],
  },
  '/departments': {
    eyebrow: 'ORGANIZATION / DEPARTMENTS',
    title: '部门管理',
    description: '维护组织树、主部门和岗位归属。',
    icon: Users,
    action: '新增部门',
    columns: ['部门名称', '上级部门', '负责人', '成员数', '状态'],
  },
  '/operation-logs': {
    eyebrow: 'SECURITY / AUDIT',
    title: '操作日志',
    description: '查看可追溯的操作审计，敏感字段会在入库前脱敏。',
    icon: ShieldCheck,
    action: '导出日志',
    columns: ['时间', '操作人', '动作', '资源', '结果', '来源 IP'],
  },
  '/slow-sql': {
    eyebrow: 'SECURITY / QUERY MONITOR',
    title: '慢 SQL',
    description: '查看超过阈值的查询，参数默认脱敏，帮助定位数据层瓶颈。',
    icon: Activity,
    action: '导出记录',
    columns: ['发生时间', '耗时', '模型', '动作', '查询摘要'],
  },
  '/async-tasks': {
    eyebrow: 'OPERATIONS / ASYNC TASKS',
    title: '异步任务',
    description: '跟踪导入、导出进度和错误报告，完成后通过 BOS 临时链接下载。',
    icon: FileDown,
    action: '创建任务',
    columns: ['任务类型', '处理器', '进度', '状态', '创建时间', '文件'],
  },
};

function DashboardView() {
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
            <button
              type="button"
              className="text-xs font-medium text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))]"
            >
              查看详情
            </button>
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
            <div className="relative grid min-h-[250px] place-items-center text-center">
              <div className="rounded-[2px] bg-[rgb(var(--surface))] px-6 py-4">
                <Activity size={22} className="mx-auto mb-3 text-[rgb(var(--accent))]" />
                <p className="text-sm font-medium">等待运行数据</p>
                <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">
                  API 与 Worker 启动后显示真实趋势
                </p>
              </div>
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
