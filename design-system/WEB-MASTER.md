# Manzhushaka Console Web Design System Master

> Status: in review
> Last updated: 2026-08-16
> Owner: Manzhushaka Console

## Contents

1. Product Context
2. Stage Record
3. Visual Direction
4. Semantic Tokens
5. Layout And Components
6. Implementation
7. Browser Verification
8. Decisions And Change Log

## 1. Product Context

- Product: Manzhushaka Console（曼珠沙华管理平台）。
- Primary users: 在个人或小型服务器环境中维护用户、权限、系统配置和运行状态的管理员。
- Primary job: 在一个安全、清晰且可扩展的界面中完成组织、权限、系统、审计和异步数据任务管理。
- Critical user flow: 登录与验证码 -> 工作台 -> 权限允许的分级菜单 -> 用户/角色管理 -> 创建异步导出 -> 查看进度 -> 获取 5 分钟 BOS 临时下载链接。
- Deliverable: 可运行、可二次开发、可部署的真实全栈管理后台脚手架，不使用业务 Mock 数据。
- Mode: existing UI optimization。
- Optimization scope: 完成工作区页签、移动导航、资源操作、异步任务、认证表单和全局反馈的交互闭环；不改变业务 API、权限和数据流，不实现全局命令搜索。
- Framework and package manager: pnpm workspace、Next.js App Router、NestJS、Prisma、MySQL、独立 Worker。
- Component library: Arco Design React、Tailwind CSS、TanStack Table、Lucide Icons；布局与品牌组件继续使用本地封装。
- Supported browsers and viewport range: Chrome、Edge、Safari 最新版及前两个主要版本；桌面完整、平板可用、移动端保障核心流程。
- Accessibility target: WCAG 2.2 AA；完整键盘焦点、语义标签、对比度与减少动态效果支持。
- Affected routes and components: `/users`、`/roles`、`/menus`、`/departments`、`/operation-logs`、`/runtime-logs`、`/slow-sql`、`/async-tasks` 的资源与运维页面，`/system-params` 的系统品牌表单，以及登录、改密、侧栏、主题切换、工作区页签和移动导航。
- Adjacent regression surface: `/login`、`/force-change-password`、`/dashboard` 和侧栏导航。
- Behavior that must remain unchanged: 路由、页签缓存、筛选状态保留、服务端 API、权限边界、登录流程和响应式断点。
- Existing UI strengths to retain: Arco 风格的蓝色操作焦点、白色导航、浅灰工作区、低圆角面板、Lucide 图标和中文状态文案。
- UI debt and inconsistencies observed: Arco 控件默认状态需要与现有语义令牌对齐；资源页空状态、分页和筛选控件需要统一密度；React 19 开发模式兼容性警告需要在浏览器验证中确认影响。

### Confirmed Product Boundaries

- 单租户；一个主部门、多岗位、多角色；角色权限取并集。
- 菜单数据可无限分级，侧栏最多展示三级；节点支持目录、页面和外链，按钮权限不进入侧栏。
- 登录使用数据库会话、图片验证码和 CSRF 防护；连续错误 5 次锁定 10 分钟；初始密码必须修改。
- 不包含单点登录、TOTP、多租户、邮件通知、通用工作流和公开注册。
- 数据库与 API 存 UTC，界面默认使用 `Asia/Shanghai`。
- 敏感字段通过统一国密对称加密服务处理；密码使用 Argon2id 单向哈希。
- 百度 BOS 是唯一文件存储，Bucket 私有；对象永久保存；签名地址有效期 5 分钟。
- 异步导入导出由独立 Worker 执行，MySQL 保存队列；支持 XLSX/CSV、流式处理、稳定游标、业务计算、进度、取消、重试和错误报告。
- 任务创建者默认只能看到自己的任务；`task:view:any` 与 `task:download:any` 独立授权；超级管理员拥有全部权限。
- 操作审计保留 180 天，慢 SQL 保留 30 天，运行日志保留 14 天；BOS 文件永久保留。
- 部署基线为单台 Linux 服务器和单 API 实例；`bin/local/` 与 `bin/prod/` 分别提供脚本。

## 2. Stage Record

| Stage            | Skill                   | Status   | Key output                                                         | Gate result                                 |
| ---------------- | ----------------------- | -------- | ------------------------------------------------------------------ | ------------------------------------------- |
| Visual direction | `frontend-design`       | complete | 保留冷静运行控制台、蓝色操作焦点和数据优先排版，收敛 Arco 默认密度 | passed：优化范围与既有品牌和后台任务一致    |
| Theme system     | `theme-factory`         | complete | 复用已确认主题，并将 Arco 表面、文本、边界和状态变量桥接到语义令牌 | passed：亮暗主题一致，成功态继续使用青色    |
| Implementation   | `web-artifacts-builder` | complete | 原地审查 Arco 资源页，并桥接现有亮暗主题语义令牌                   | passed：typecheck、lint、test、build 均通过 |
| Verification     | `webapp-testing`        | complete | Playwright 桌面/移动截图与交互检查                                 | passed：关键页面、主题切换、无控制台错误    |
| Interaction      | `apple-design`          | complete | 即时按下反馈、可撤销页签、速度感知侧栏、抽屉与减少动态效果         | passed：交互从当前呈现值响应并保留用户控制  |

## 3. Visual Direction

- Visual thesis: 参考 Arco Design Pro 的成熟中后台秩序，使用稳定白色导航、浅灰工作区、白色内容面板和高识别度蓝色操作，让页面以数据与任务为中心。
- Typography roles: 中文正文与界面优先使用苹方/系统无衬线栈；标题同样使用无衬线字体，通过字号、字重与分隔建立层级；编号、时间、请求 ID 和日志使用 JetBrains Mono Variable。
- Palette direction: 中性白、浅灰和深石墨构成工作面；高纯度蓝用于当前导航、页签和主要动作；青色、橙色和红色表达成功、等待和危险，保持用户确认的不使用绿色约束。
- Layout concept: 桌面采用 220px 白色侧栏、60px 紧凑顶栏、44px 可缓存页签条和浅灰主工作区；页面内容使用低圆角白色面板，筛选、操作与数据表按工作顺序纵向展开。
- Content voice: 简体中文、主动语态、短句和明确动词；状态说明给出下一步，不使用营销语或含糊失败文案。
- Motion approach: 即时按下反馈使用 120ms；侧栏、抽屉和进度更新使用 220ms fluid easing；移动侧栏跟随指针 1:1 位移，释放时结合位置与速度判定，并在反向越界时使用渐进阻尼。减少动态效果模式下取消位移，仅保留必要状态切换。
- Signature element: 顶栏下方的可缓存多页签工作区，用蓝色底边表达当前页，并保留各页筛选、表单和滚动状态。
- Generic defaults rejected: 拒绝紫蓝渐变、暖米色、发光圆球、过量圆角卡片、营销式大标题和大面积装饰；采用 Arco 式高密度工作界面，不迁移 Arco Pro 整套模板，也不引入 Ant Design。
- Existing patterns retained: 不适用。
- Inconsistent patterns consolidated: 不适用。
- Weak patterns replaced: 不适用。

### Stage 1 Layout Sketch

```text
┌──────────────┬────────────────────────────────────────────┐
│ 品牌         │ 面包屑                         搜索  用户  │
│ 工作台       ├────────────────────────────────────────────┤
│ 组织管理     │ 工作台  ×  用户管理  ×  关闭其他           │
│ 用户管理     ├────────────────────────────────────────────┤
│ 部门管理     │ 页面标题 / 说明                 主要操作   │
│ 系统管理     │ 筛选与批量操作                             │
│ 安全中心     │ 数据表 / 详情 / 工具                       │
│ 运维管理     │ 分页 / 结果摘要                            │
└──────────────┴────────────────────────────────────────────┘
```

### Stage 1 Accessibility Baseline

- 正文与背景对比度至少 4.5:1，大字号与非文本控件至少 3:1。
- 所有交互可通过键盘完成；焦点环不依赖颜色之外的唯一提示。
- 表格保留语义表头、排序状态和批量选择说明；状态不能只用颜色表达。
- 弹窗打开后锁定焦点，关闭后归还触发点；危险操作必须有清晰名称与后果。
- 动画遵循 `prefers-reduced-motion`，实时日志提供暂停功能。

## 4. Semantic Tokens

主题基线参考 Arco Design Pro，并适配 Manzhushaka Console 的现有设计令牌与暗色模式；实现采用 Arco Design React 负责数据密集型控件，Tailwind CSS 和本地组件负责布局、品牌和壳层。

### Color

| Token                    | Light     | Dark      | Meaning                    |
| ------------------------ | --------- | --------- | -------------------------- |
| `color.bg.canvas`        | `#F2F3F5` | `#171A1D` | 页面工作背景               |
| `color.bg.surface`       | `#FFFFFF` | `#23262A` | 表面、面板与弹层           |
| `color.bg.muted`         | `#F7F8FA` | `#2E3136` | 次级区域与输入底           |
| `color.text.primary`     | `#1D2129` | `#F7F8FA` | 主文本                     |
| `color.text.secondary`   | `#4E5969` | `#AAB0BB` | 次级文本                   |
| `color.border.subtle`    | `#E5E6EB` | `#393C42` | 边界与分隔                 |
| `color.action.primary`   | `#165DFF` | `#4080FF` | 主要动作、品牌焦点         |
| `color.action.secondary` | `#E8F3FF` | `#1D3354` | 当前导航与轻强调背景       |
| `color.action.current`   | `#0E42D2` | `#94BFFF` | 当前路径与悬停             |
| `color.state.success`    | `#14C9C9` | `#27C3C3` | 成功状态，使用青色而非绿色 |
| `color.state.warning`    | `#FF7D00` | `#FF9A2E` | 警告与等待                 |
| `color.state.danger`     | `#F53F3F` | `#F76560` | 错误、锁定和危险动作       |
| `color.state.info`       | `#4080FF` | `#6FA5FF` | 信息状态                   |

### Typography

| Role           | Family                                                | Size | Weight | Line height | Use                  |
| -------------- | ----------------------------------------------------- | ---: | -----: | ----------: | -------------------- |
| `type.display` | `Inter`, 中文系统无衬线回退                           | 24px |    600 |         1.3 | 登录与工作台主标题   |
| `type.heading` | `Inter`, 中文系统无衬线回退                           | 16px |    600 |        1.35 | 页面与区块标题       |
| `type.body`    | `Inter`, `PingFang SC`, `Microsoft YaHei`, sans-serif | 14px |    400 |         1.5 | 正文、说明和表单     |
| `type.ui`      | `Inter`, 中文系统无衬线回退                           | 14px |    500 |        1.35 | 菜单、按钮和标签     |
| `type.data`    | `JetBrains Mono`, `SFMono-Regular`, monospace         | 12px |    450 |         1.5 | ID、时间、日志和数值 |

### Foundations

- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32px。
- Radius scale: 2px 表格与内容面板、4px 控件与图标底、6px 品牌与预览窗口；避免过量圆角。
- Border rules: 1px 实线边界，优先使用 `color.border.subtle`；焦点使用 2px action current 外环。
- Elevation scale: 0 / 1 / 2；页面面板以背景色区分，阴影只用于认证卡片、弹层和对话框。
- Icon family and sizing: Lucide，16px 控件、18px 导航、20px 页面动作；图标按钮提供中文 tooltip。
- Motion durations and easing: `--motion-feedback: 120ms`、`--motion-panel: 220ms`、`--ease-fluid: cubic-bezier(0.22, 1, 0.36, 1)`；手势跟踪期间不添加过渡，释放后才恢复收束动画。
- Reduced-motion behavior: 关闭位移和连续动画，只保留颜色与透明度状态变化。
- Arco token bridge: `body` 将 Arco 的 primary、link、success、warning、danger、surface、text、border 和 fill 变量映射到上述语义令牌；暗色模式通过 `arco-theme="dark"` 同步。

## 5. Layout And Components

- Page regions and content width: 待 Stage 1 与 Stage 2 确认。
- Responsive breakpoints and behavior: 桌面完整、平板可用、移动端聚焦核心任务。
- Navigation model: 权限驱动的三级侧栏、统一 14px 菜单字号、父子缩进与连接线、蓝色当前项、面包屑、可缓存的多页签工作区、移动端手势侧栏导航。页签支持拖动排序、中键关闭、右键菜单、关闭左侧/右侧/其他/全部、溢出滚动与撤销关闭。
- Scroll model: 控制台外壳固定为一屏，左侧菜单与右侧 Header 始终顶边对齐；左侧导航和右侧工作区独立滚动，页签按路由保存右侧工作区的滚动位置。
- Shared primitives: `FeedbackProvider` 统一状态提示与撤销动作；`SidePanel` 统一焦点圈定、Escape、来源一致的进出路径；`ConfirmDialog` 只用于未保存内容和取消任务等高风险动作；`PasswordInput` 统一密码可见切换与 Caps Lock 提示。
- Forms and validation: 前后端共享结构化校验规则，错误提示使用简体中文。
- Filter bar density: 桌面端筛选标签与控件以 12px 间距紧邻成组，关键词输入框固定为 360px、枚举下拉框固定为 176px；操作按钮靠右，窄屏控件占满剩余宽度。菜单权限页额外提供节点类型、可见状态、层级和创建时间范围筛选，日期范围使用起止日期并校验起始日期不晚于结束日期。
- System branding form: 系统名称、品牌简称和登录标题使用同一基础信息区；Logo 与 favicon 使用独立上传行、稳定预览尺寸和明确移除动作，窄屏保持纵向可操作。
- Loading, empty, error, success, and disabled states: 资源筛选、创建抽屉、导出、异步任务、验证码、登录和改密均覆盖进行中、空、错误、成功或禁用状态；服务端接口缺失时明确失败，不写入假数据。
- Runtime logs: 运行日志使用独立表格页面，级别通过语义状态色与文字双重表达；支持服务、级别、关键词筛选、上下文展开、游标加载和三秒实时刷新，实时刷新始终提供暂停控制。
- Destructive-action behavior: 二次确认、服务端授权、审计记录和不可逆后果说明。
- Keyboard and focus behavior: 可见焦点、合理 Tab 顺序、弹窗焦点圈定与 Escape 关闭。

## 6. Implementation

- Routes and entry points: `/login`、`/force-change-password`、`/dashboard`、`/users`、`/roles`、`/menus`、`/departments`、`/system-params`、`/operation-logs`、`/runtime-logs`、`/slow-sql`、`/async-tasks`；API 基础路由为 `/api/auth/*`、`/api/health`、`/api/runtime-logs`、`/api/public/system-branding` 与 `/api/system-parameters/branding/*`。
- Component boundaries: `apps/web/components/ui` 保存登录等基础控件，`components/layout` 保存侧栏、壳层、资源列表和 `RuntimeLogsPage`；当前资源页使用 Arco Table、Input、Button、Pagination，运行日志使用语义化表格与本地控件；API 的认证、运行日志和 Prisma 连接独立于 Worker 的任务注册表。
- State management: 服务端状态优先，客户端请求使用 TanStack Query；系统品牌由根布局预取并通过 `SystemBrandingProvider` 共享，保存和上传成功后同步更新标题、favicon、登录页和侧栏；短生命周期 UI 状态保持局部。
- Assets and fonts: 采用系统中文字体回退、DejaVu Serif/Sans 和 JetBrains Mono 字体栈；Logo 与 favicon 保存为私有 BOS 对象，界面通过稳定 API 路径获取五分钟签名地址；登录页不依赖远程装饰图片。
- Login composition: 桌面端使用接近等宽的左侧产品说明、右侧认证表单双栏结构；顶部使用品牌色细线，左侧以浅色工作面和结构化“运行边界”工具面板表达产品定位，不使用后台页面截图。移动端隐藏说明区，优先保障登录操作。
- Build and static-check commands: `pnpm format:check`、`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`。
- Existing dependencies reused: 保留 Next.js App Router、Tailwind、next-themes、Lucide、keepalive-for-react 和现有壳层；不替换路由、构建或状态管理。
- New dependencies and reasons: Next.js/NestJS/Prisma；Arco Design React 负责中后台数据表格、筛选表单、权限树、弹窗和分页；TanStack Query、Lucide、Zod、Argon2、Pino 和 AWS S3 SDK 分别负责请求状态、图标、契约、密码哈希、结构化日志和 BOS S3 兼容签名/上传。
- Business behavior preserved: 路由、筛选状态、页签缓存和登录流程保持不变；系统品牌新增独立读写权限、白名单公开读取、上传内容校验和审计边界。
- Functional changes required for working interactions: 增加 Arco 主题变量桥接；状态筛选使用设计令牌化的自定义 `combobox`；资源页增加受控筛选、抽屉表单、字段校验与未保存保护；菜单权限页按业务维度提供节点类型、可见状态、层级和创建时间范围筛选；异步任务增加状态分段、创建、取消、重试、进度与五分钟下载倒计时；认证表单增加密码可见、Caps Lock、验证码刷新和错误聚焦。
- Unintended file or dependency churn check: 系统品牌只复用既有 `SystemParameter`、`AuditLog`、RBAC 和 BOS 能力，未增加依赖或数据库结构迁移；工作树中的其他修改继续保留。
- Intentional deviations: 这是现有 Next.js 项目的原地优化，因此按编排技能要求未运行 artifact 初始化器或单文件打包；Arco Select 2.66.16 在 React 19 下会由内部 Trigger 访问已移除的 `element.ref` 并产生控制台错误，2.67.0-beta.0 仍未修复，因此状态筛选使用本地可访问 `combobox`；真实 RDS/BOS 凭证未提供，页面继续使用真实配置空状态而不是 Mock 数据。
- Theme adaptation: 参考 Arco Design Pro 的 `#165DFF` 主要操作色、浅灰工作区和低圆角密度；成功状态使用青色，不使用绿色。
- Framework integration: Tailwind Preflight 会将 Lucide `svg` 设为块级元素；Arco 按钮的直属图标在全局桥接层恢复为 `inline-block`，确保图标与文字保持同一行并垂直居中。

## 7. Browser Verification

| Scenario                    | Viewport       | Result | Evidence or issue                                                    |
| --------------------------- | -------------- | ------ | -------------------------------------------------------------------- |
| Critical user flow          | 1440x960       | passed | 登录页、工作台空状态、用户/角色路由和资源页筛选控件可用              |
| Arco integration and theme  | 1440x960       | passed | Table、Input、Button、Pagination 已渲染，亮暗主题计算色匹配语义令牌  |
| Keyboard navigation         | 1440x960       | passed | 通过真实 Tab 导航定位查询按钮，焦点外环可见                          |
| Responsive layout           | 390x844        | passed | 登录页、用户页和抽屉导航可用，document 无横向溢出                    |
| 菜单业务筛选                | desktop/mobile | passed | 节点类型、可见状态、层级、日期校验和重置可用，移动端无横向溢出       |
| 多页签页面缓存              | 1440x960       | passed | 用户页输入筛选后切换角色页，再返回仍保留输入状态                     |
| 独立滚动与顶边对齐          | 1440x600       | passed | 右侧滚动 220px 后 Header 与侧栏仍为 top 0，返回页签恢复滚动位置      |
| Console and page errors     | desktop/mobile | passed | Playwright 未收集到 console error 或 page error，React 19 报错已消除 |
| Preserved behavior          | 1440x960       | passed | 路由、筛选输入、页签缓存、主题切换和导航分组行为保持                 |
| Adjacent regression surface | desktop/mobile | passed | 登录、工作台、用户、角色、侧栏和移动抽屉已覆盖                       |

- Server command and URL: `python3 /Users/manzhushaka/.codex/skills/webapp-testing/scripts/with_server.py --server "pnpm --filter @manzhushaka/api start:dev" --port 4000 --server "pnpm --filter @manzhushaka/web dev" --port 3000`；Web: `http://localhost:3000`。
- Browser-test command: `python3 /Users/manzhushaka/.codex/skills/webapp-testing/scripts/with_server.py --server "pnpm --filter @manzhushaka/api start:dev" --port 4000 --server "pnpm --filter @manzhushaka/web dev" --port 3000 -- python3 scripts/browser_check.py`。
- Screenshots: `/Users/manzhushaka/.codex/visualizations/2026/08/15/01a005cc-db97-7142-bdd8-40e2d43f3496/login-desktop.png`、`login-mobile.png`、`users-light.png`、`users-dark.png`、`users-scrolled.png`、`users-mobile-menu.png`。
- Failed requests: 无关键页面失败请求；未配置 RDS 时健康检查按预期返回数据库不可用。
- Residual risks or blockers: Arco Select 在 React 19 兼容问题修复前保持原生控件；本地 RDS 已完成独立数据库、迁移、种子和真实登录验证；BOS 凭证尚未提供，因此 BOS 签名下载和真实文件任务仍需配置后做集成验证；当前示例导出处理器不会生成虚假业务文件。

## 8. Decisions And Change Log

| Date       | Decision or change                            | Reason                                                               | Confirmed by       |
| ---------- | --------------------------------------------- | -------------------------------------------------------------------- | ------------------ |
| 2026-08-15 | 采用 pnpm 单仓库与 Next.js/NestJS/Worker 分层 | 兼顾企业级边界、共享契约与独立部署                                   | User               |
| 2026-08-15 | 使用 shadcn/ui 体系并拒绝 Ant Design          | 需要更现代且可定制的视觉系统                                         | User               |
| 2026-08-15 | 使用 MySQL RDS 与 Prisma，禁止数据库重置      | 本地和服务器可能共享真实数据库                                       | User               |
| 2026-08-15 | 使用百度 BOS 私有存储与 5 分钟签名链接        | 统一异步任务文件的安全下载链路                                       | User               |
| 2026-08-15 | 使用角色并集、服务端数据权限与分级菜单        | 保证授权语义清晰且可审计                                             | User               |
| 2026-08-15 | 指定所有必要代码注释使用中文                  | 统一项目维护习惯                                                     | User               |
| 2026-08-15 | 采用冷静运行控制台视觉与漆红权限脊线          | 让品牌识别服务于导航和权限上下文，而不是装饰                         | Stage 1            |
| 2026-08-15 | 选择并适配 Sunset Boulevard                   | 用户明确选择主题，同时排除绿色并控制暖沙色面积                       | User / Stage 2     |
| 2026-08-15 | 完成从零实现与浏览器验证                      | 建立可运行的真实配置空状态、认证骨架、任务抽象和设计系统             | Stage 3 / Stage 4  |
| 2026-08-15 | 增加多页签工作区与页面缓存                    | 让管理员在多个资源页之间切换时保留筛选、表单和滚动状态               | User               |
| 2026-08-15 | 整体视觉调整为 Arco Design Pro 参考方向       | 提升中后台成熟度，并保留 Tailwind 壳层与设计令牌                     | User               |
| 2026-08-15 | 引入 Arco Design React 作为数据密集型控件层   | 复用表格、筛选、分页和后续权限树/弹窗能力，降低重复实现成本          | User               |
| 2026-08-15 | 状态筛选改用本地令牌化 combobox               | 消除 Arco Trigger 在 React 19 下访问 `element.ref` 的错误            | Stage 4            |
| 2026-08-15 | 修正 Arco 按钮中的 Lucide 图标布局            | 避免 Tailwind Preflight 导致图标独占一行、文字溢出按钮               | User               |
| 2026-08-15 | 控制台改为左右区域独立滚动                    | 保持侧栏与吸顶 Header 对齐，并保留各页签滚动位置                     | User               |
| 2026-08-15 | 状态筛选改为令牌化自定义下拉                  | 避免原生 `select` 展开层受浏览器接管导致视觉密度和主题不一致         | User               |
| 2026-08-15 | 不实现全局命令搜索                            | 用户明确排除该交互                                                   | User               |
| 2026-08-15 | 完成交互闭环与 Apple 式直接操控               | 强化即时反馈、用户控制、空间一致性和移动手势连续性                   | User / Interaction |
| 2026-08-16 | 登录页调整为左侧说明、右侧表单                | 符合认证操作习惯，并用能力链路替代后台截图展示                       | User               |
| 2026-08-16 | 登录页参考 Haiqi Agent Pro 重构信息层级       | 使用等宽双栏、运行边界面板与工具化认证表单，减少大色块压迫感         | User               |
| 2026-08-16 | 收紧资源页顶部筛选栏                          | 避免下拉框过宽，并让筛选标签与对应控件保持清晰邻接                   | User               |
| 2026-08-16 | 系统参数首期聚焦品牌配置                      | 让系统名称、简称、登录标题、Logo 和 favicon 形成真实保存闭环         | User               |
| 2026-08-16 | 品牌资源使用私有 BOS 与稳定 API 地址          | 避免数据库 Base64 和公开 Bucket，并保持五分钟签名策略                | Security           |
| 2026-08-16 | 增加在线运行日志页面与统一日志存储            | 让管理员按级别实时查看 API、Worker 日志并保持权限与脱敏边界          | User               |
| 2026-08-17 | 扩展菜单权限页筛选条件                        | 菜单模型没有通用启停状态，改为按节点类型、可见性、层级和创建时间筛选 | User               |
