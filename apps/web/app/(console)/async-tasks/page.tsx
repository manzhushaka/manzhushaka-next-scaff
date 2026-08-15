import { FileDown } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function AsyncTasksPage() {
  return (
    <ResourcePage
      eyebrow="OPERATIONS / ASYNC TASKS"
      title="异步任务"
      description="跟踪导入、导出进度和错误报告，完成后通过 BOS 临时链接下载。"
      icon={FileDown}
      action="创建任务"
      columns={['任务类型', '处理器', '进度', '状态', '创建时间', '文件']}
    />
  );
}
