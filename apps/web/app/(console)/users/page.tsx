import { Users } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function UsersPage() {
  return (
    <ResourcePage
      eyebrow="ORGANIZATION / USERS"
      title="用户管理"
      description="管理账号状态、所属部门、角色和初始密码策略。"
      icon={Users}
      columns={['用户名', '显示名称', '主部门', '角色', '状态', '最近登录']}
    />
  );
}
