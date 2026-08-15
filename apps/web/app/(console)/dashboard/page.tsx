import { Activity, ArrowUpRight, Database, FileDown, ShieldCheck, Users } from 'lucide-react';

const signals = [
  { label: '用户总数', value: '—', caption: '等待数据库连接', icon: Users },
  { label: '在线会话', value: '—', caption: '等待会话服务', icon: ShieldCheck },
  { label: '待处理任务', value: '—', caption: '等待 Worker', icon: FileDown },
  { label: '慢 SQL', value: '—', caption: '等待查询监控', icon: Database },
];

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[rgb(var(--accent-strong))]">
            OPERATIONS / OVERVIEW
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight">工作台</h1>
          <p className="mt-2 text-sm text-[rgb(var(--ink-muted))]">
            这里是系统的第一现场。真实数据接入后，状态会在此展开。
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--ink-muted))]">
          <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--success))]" /> UTC 数据 /
          Asia-Shanghai 显示
        </div>
      </div>
      <section className="grid border-y border-[rgb(var(--line))] bg-[rgb(var(--surface))] sm:grid-cols-2 xl:grid-cols-4">
        {signals.map(({ label, value, caption, icon: Icon }, index) => (
          <div
            key={label}
            className="relative flex min-h-[132px] flex-col justify-between border-b border-[rgb(var(--line))] p-5 sm:border-r sm:last:border-r-0 xl:border-b-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-[rgb(var(--ink-muted))]">{label}</span>
              <Icon size={17} className="text-[rgb(var(--accent))]" />
            </div>
            <div>
              <strong className="font-mono text-3xl font-medium tracking-tight">{value}</strong>
              <p className="mt-1 text-xs text-[rgb(var(--ink-muted))]">{caption}</p>
            </div>
            {index === 0 && (
              <span className="absolute bottom-0 left-0 h-0.5 w-10 bg-[rgb(var(--accent))]" />
            )}
          </div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <section className="border border-[rgb(var(--line))] bg-[rgb(var(--surface))]">
          <div className="flex items-center justify-between border-b border-[rgb(var(--line))] px-5 py-4">
            <div>
              <h2 className="font-medium">运行概览</h2>
              <p className="mt-0.5 text-xs text-[rgb(var(--ink-muted))]">
                连接真实 API 后显示最近 24 小时活动
              </p>
            </div>
            <Activity size={17} className="text-[rgb(var(--ink-muted))]" />
          </div>
          <div className="grid min-h-[270px] place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-dashed border-[rgb(var(--line))] text-[rgb(var(--ink-muted))]">
                <Database size={20} />
              </div>
              <p className="text-sm font-medium">等待运行数据</p>
              <p className="mt-1 max-w-[290px] text-xs leading-5 text-[rgb(var(--ink-muted))]">
                完成数据库迁移并启动 API 后，这里会显示登录、操作和异步任务趋势。
              </p>
            </div>
          </div>
        </section>
        <section className="border border-[rgb(var(--line))] bg-[rgb(var(--surface))]">
          <div className="flex items-center justify-between border-b border-[rgb(var(--line))] px-5 py-4">
            <div>
              <h2 className="font-medium">安全检查</h2>
              <p className="mt-0.5 text-xs text-[rgb(var(--ink-muted))]">部署前的关键配置状态</p>
            </div>
            <ShieldCheck size={17} className="text-[rgb(var(--ink-muted))]" />
          </div>
          <div className="divide-y divide-[rgb(var(--line))]">
            {['数据库连接', 'BOS 私有存储', '加密密钥', '运行日志'].map((item) => (
              <div key={item} className="flex items-center justify-between px-5 py-4 text-sm">
                <span>{item}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--warning))]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--warning))]" />
                  待配置
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[rgb(var(--line))] px-5 py-4">
            <a
              href="/system-params"
              className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--accent-strong))] hover:underline"
            >
              前往系统参数 <ArrowUpRight size={13} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
