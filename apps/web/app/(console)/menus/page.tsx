import { ListTree } from 'lucide-react';
import { ResourcePage } from '../../../components/layout/resource-page';
export default function MenusPage() {
  return (
    <ResourcePage
      eyebrow="ORGANIZATION / PERMISSIONS"
      title="菜单权限"
      description="维护目录、页面、外链和按钮权限，侧栏按层级动态生成。"
      icon={ListTree}
      action="新增节点"
      columns={['名称', '权限编码', '类型', '路径', '可见', '排序']}
    />
  );
}
