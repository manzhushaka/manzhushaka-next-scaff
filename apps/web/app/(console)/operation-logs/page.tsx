import { ClipboardList } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function OperationLogsPage() {
  return (
    <ResourcePage
      eyebrow="SECURITY / AUDIT"
      title="操作日志"
      description="查看可追溯的操作审计，敏感字段会在入库前脱敏。"
      icon={ClipboardList}
      action="导出日志"
      columns={['时间', '操作人', '动作', '资源', '结果', '来源 IP']}
    />
  );
}
