import { Database } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function SystemParamsPage() {
  return (
    <ResourcePage
      eyebrow="SYSTEM / PARAMETERS"
      title="系统参数"
      description="配置验证码、日志保留、慢 SQL 阈值和 BOS 连接状态。密钥只读私有环境配置。"
      icon={Database}
      action="新增参数"
      columns={['参数名称', '参数键', '类型', '当前值', '更新时间']}
    />
  );
}
