import { KeyRound } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function RolesPage() {
  return (
    <ResourcePage
      eyebrow="ORGANIZATION / ROLES"
      title="角色管理"
      description="按角色分配菜单、按钮、API 和数据范围权限。"
      icon={KeyRound}
      columns={['角色名称', '编码', '数据范围', '成员数', '更新时间']}
    />
  );
}
