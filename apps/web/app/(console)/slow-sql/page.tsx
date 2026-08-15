import { Activity } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function SlowSqlPage() {
  return (
    <ResourcePage
      eyebrow="SECURITY / QUERY MONITOR"
      title="慢 SQL"
      description="查看超过阈值的查询，参数默认脱敏，帮助定位数据层瓶颈。"
      icon={Activity}
      action="导出记录"
      columns={['发生时间', '耗时', '模型', '动作', '查询摘要']}
    />
  );
}
