import { Users } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function DepartmentsPage() {
  return (
    <ResourcePage
      eyebrow="ORGANIZATION / DEPARTMENTS"
      title="部门管理"
      description="维护组织树、主部门和岗位归属。"
      icon={Users}
      action="新增部门"
      columns={['部门名称', '上级部门', '负责人', '成员数', '状态']}
    />
  );
}
