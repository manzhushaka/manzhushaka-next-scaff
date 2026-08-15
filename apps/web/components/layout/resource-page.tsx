import { ArrowRight, CircleHelp, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

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
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[rgb(var(--accent-strong))]">
            {eyebrow}
          </p>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[4px] bg-[rgb(var(--muted))] text-[rgb(var(--accent-strong))]">
              <Icon size={18} />
            </span>
            <h1 className="font-serif text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          <p className="mt-2 text-sm text-[rgb(var(--ink-muted))]">{description}</p>
        </div>
        <Button>
          <span className="text-lg leading-none">+</span>
          {action}
        </Button>
      </div>
      <section className="border border-[rgb(var(--line))] bg-[rgb(var(--surface))]">
        <div className="flex flex-col gap-3 border-b border-[rgb(var(--line))] p-4 md:flex-row">
          <div className="relative max-w-[320px] flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ink-muted))]"
            />
            <Input className="pl-9" placeholder="搜索当前资源" aria-label="搜索当前资源" />
          </div>
          <Button variant="secondary" size="sm">
            筛选
          </Button>
          <Button variant="ghost" size="sm">
            重置
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[rgb(var(--muted))] text-xs text-[rgb(var(--ink-muted))]">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-5 py-3 font-medium">
                    {column}
                  </th>
                ))}
                <th className="px-5 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length + 1} className="h-[260px] px-5 text-center">
                  <div className="mx-auto max-w-[300px]">
                    <CircleHelp size={20} className="mx-auto mb-3 text-[rgb(var(--ink-muted))]" />
                    <p className="text-sm font-medium">暂无真实数据</p>
                    <p className="mt-1 text-xs leading-5 text-[rgb(var(--ink-muted))]">
                      连接 RDS 并完成迁移后，这里会显示可操作记录。
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[rgb(var(--line))] px-5 py-3 text-xs text-[rgb(var(--ink-muted))]">
          <span>共 0 条</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[rgb(var(--accent-strong))]"
          >
            查看接口说明 <ArrowRight size={13} />
          </button>
        </div>
      </section>
    </div>
  );
}
