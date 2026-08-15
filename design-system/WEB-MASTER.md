# Manzhushaka Console Web Design System Master

> Status: verified  
> Last updated: 2026-08-15  
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
- Mode: from-scratch build。
- Optimization scope: 不适用，仓库为空。
- Framework and package manager: pnpm workspace、Next.js App Router、NestJS、Prisma、MySQL、独立 Worker。
- Component library: shadcn/ui、Radix UI、Tailwind CSS、TanStack Table、Lucide Icons。
- Supported browsers and viewport range: Chrome、Edge、Safari 最新版及前两个主要版本；桌面完整、平板可用、移动端保障核心流程。
- Accessibility target: WCAG 2.2 AA；完整键盘焦点、语义标签、对比度与减少动态效果支持。
- Affected routes and components: 全新应用的登录、工作台、组织权限、系统、安全、运维、任务和个人中心。
- Adjacent regression surface: 不适用，仓库没有既有行为。
- Behavior that must remain unchanged: 不适用。
- Existing UI strengths to retain: 不适用。
- UI debt and inconsistencies observed: 不适用。

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

| Stage            | Skill                   | Status   | Key output                                                | Gate result                                      |
| ---------------- | ----------------------- | -------- | --------------------------------------------------------- | ------------------------------------------------ |
| Visual direction | `frontend-design`       | complete | 冷静运行控制台、权限脊线、克制漆红、数据优先排版          | passed：方向与单租户管理后台、审计和运维场景一致 |
| Theme system     | `theme-factory`         | complete | Sunset Boulevard 适配：烧橙、珊瑚、暖金与石墨中性基底     | passed：保留主题识别，去除绿色并满足后台对比度   |
| Implementation   | `web-artifacts-builder` | complete | pnpm monorepo、Next/Nest/Worker、设计令牌、认证与任务骨架 | passed：typecheck、lint、test、build 均通过      |
| Verification     | `webapp-testing`        | complete | Playwright 桌面/移动截图与交互检查                        | passed：关键页面、主题切换、无控制台错误         |

## 3. Visual Direction

- Visual thesis: “安静但警觉的运行控制台”。界面像一张经过校准的控制面板，优先呈现层级、状态与可追溯性；品牌感来自精确的漆红标记，而非大面积装饰。
- Typography roles: 中文正文与界面优先使用苹方/思源黑体系统栈；拉丁标题使用 IBM Plex Sans Variable；编号、时间、请求 ID 和日志使用 JetBrains Mono Variable。标题依靠字重与留白建立层级，不使用夸张字号。
- Palette direction: 冷中性石墨、纸白和雾灰构成工作面；曼珠沙华漆红用于当前路径与关键动作；青绿、琥珀和蓝青分别表达成功、等待和信息，避免单一色相统治界面。
- Layout concept: 桌面采用稳定左侧栏、紧凑顶栏和可扫描主工作区；页面标题、筛选条、批量操作与数据表按工作顺序纵向展开。统计指标使用无外框横向带，只有真正重复的数据项和工具面板使用容器。
- Content voice: 简体中文、主动语态、短句和明确动词；状态说明给出下一步，不使用营销语或含糊失败文案。
- Motion approach: 只在侧栏脊线移动、面板进入、实时日志追加和进度更新时使用 120–220ms 动效；减少动态效果模式下取消位移，仅保留必要状态切换。
- Signature element: “权限脊线”——侧栏中一条 2px 漆红细线连接当前菜单的父级路径，并在页头延续为短横标记，让用户随时知道自己处于哪一层权限上下文。
- Generic defaults rejected: 拒绝紫蓝渐变、暖米色、发光圆球、过量圆角卡片、营销式大标题和每个指标一张浮卡。最初考虑过深色全屏控制台，但它会牺牲日间高密度数据阅读，因此改为亮色默认、暗色同等完整。
- Existing patterns retained: 不适用。
- Inconsistent patterns consolidated: 不适用。
- Weak patterns replaced: 不适用。

### Stage 1 Layout Sketch

```text
┌──────────────┬────────────────────────────────────────────┐
│ 品牌 / 状态  │ 面包屑                         搜索  用户  │
│ ┃ 工作台     ├────────────────────────────────────────────┤
│ ┃ 组织管理   │ 页面标题 / 说明                 主要操作   │
│ ┣ 用户管理   │                                            │
│ ┗ 部门管理   │ 筛选与批量操作                             │
│   权限管理   │ ────────────────────────────────────────── │
│   系统管理   │ 数据表 / 详情 / 工具                       │
│   安全中心   │                                            │
│   运维管理   │ 分页 / 结果摘要                            │
└──────────────┴────────────────────────────────────────────┘
```

### Stage 1 Accessibility Baseline

- 正文与背景对比度至少 4.5:1，大字号与非文本控件至少 3:1。
- 所有交互可通过键盘完成；焦点环不依赖颜色之外的唯一提示。
- 表格保留语义表头、排序状态和批量选择说明；状态不能只用颜色表达。
- 弹窗打开后锁定焦点，关闭后归还触发点；危险操作必须有清晰名称与后果。
- 动画遵循 `prefers-reduced-motion`，实时日志提供暂停功能。

## 4. Semantic Tokens

主题来源：`theme-factory` 的 Sunset Boulevard。主题的深蓝绿对比色被替换为中性石墨，以符合用户不使用绿色的确认；暖沙色仅作为高亮和警示背景，避免暖米色成为主背景。

### Color

| Token                    | Light     | Dark      | Meaning                    |
| ------------------------ | --------- | --------- | -------------------------- |
| `color.bg.canvas`        | `#F5F6F7` | `#17191B` | 页面工作背景               |
| `color.bg.surface`       | `#FFFFFF` | `#202326` | 表面、面板与弹层           |
| `color.bg.muted`         | `#EEF0F1` | `#292D30` | 次级区域与输入底           |
| `color.text.primary`     | `#1E2427` | `#F5F6F7` | 主文本                     |
| `color.text.secondary`   | `#5D666B` | `#B7BEC2` | 次级文本                   |
| `color.border.subtle`    | `#DCE1E3` | `#3B4145` | 边界与分隔                 |
| `color.action.primary`   | `#E76F51` | `#F08B6D` | 主要动作、品牌焦点         |
| `color.action.secondary` | `#F4A261` | `#F4A261` | 次级强调                   |
| `color.action.current`   | `#C94F3B` | `#FF9A7D` | 权限脊线与当前路径         |
| `color.state.success`    | `#168AAD` | `#53B5D0` | 成功状态，使用青蓝而非绿色 |
| `color.state.warning`    | `#B87516` | `#E9C46A` | 警告与等待                 |
| `color.state.danger`     | `#B9382B` | `#FF8170` | 错误、锁定和危险动作       |
| `color.state.info`       | `#3D6EA8` | `#79A8DF` | 信息状态                   |
| `color.highlight.warm`   | `#E9C46A` | `#C99738` | 主题高亮，不作为大面积背景 |

### Typography

| Role           | Family                                                      | Size | Weight | Line height | Use                      |
| -------------- | ----------------------------------------------------------- | ---: | -----: | ----------: | ------------------------ |
| `type.display` | `DejaVu Serif`, 中文系统衬线回退                            | 28px |    700 |        1.25 | 登录品牌和少量页面主标题 |
| `type.heading` | `DejaVu Sans`, 中文无衬线回退                               | 20px |    650 |        1.35 | 页面与区块标题           |
| `type.body`    | `DejaVu Sans`, `PingFang SC`, `Microsoft YaHei`, sans-serif | 14px |    400 |         1.6 | 正文、说明和表单         |
| `type.ui`      | `DejaVu Sans`, 中文无衬线回退                               | 13px |    550 |        1.35 | 菜单、按钮和标签         |
| `type.data`    | `JetBrains Mono`, `SFMono-Regular`, monospace               | 12px |    450 |         1.5 | ID、时间、日志和数值     |

### Foundations

- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32px。
- Radius scale: 4px 控件、6px 工具面板、8px 弹层；页面区域不做浮动卡片。
- Border rules: 1px 实线边界，优先使用 `color.border.subtle`；焦点使用 2px action current 外环。
- Elevation scale: 0 / 1 / 2；只用于弹层、下拉和对话框，不给页面区块加浮动阴影。
- Icon family and sizing: Lucide，16px 控件、18px 导航、20px 页面动作；图标按钮提供中文 tooltip。
- Motion durations and easing: 120ms 状态反馈、180ms 面板、220ms 侧栏；`cubic-bezier(0.22, 1, 0.36, 1)`。
- Reduced-motion behavior: 关闭位移和连续动画，只保留颜色与透明度状态变化。

## 5. Layout And Components

- Page regions and content width: 待 Stage 1 与 Stage 2 确认。
- Responsive breakpoints and behavior: 桌面完整、平板可用、移动端聚焦核心任务。
- Navigation model: 权限驱动的三级侧栏、统一 13px 菜单字号、父子缩进与连接线、漆红权限脊线、面包屑、移动端抽屉导航。
- Shared primitives: 待 Stage 3 记录。
- Forms and validation: 前后端共享结构化校验规则，错误提示使用简体中文。
- Loading, empty, error, success, and disabled states: 所有数据视图和命令必须覆盖。
- Destructive-action behavior: 二次确认、服务端授权、审计记录和不可逆后果说明。
- Keyboard and focus behavior: 可见焦点、合理 Tab 顺序、弹窗焦点圈定与 Escape 关闭。

## 6. Implementation

- Routes and entry points: `/login`、`/force-change-password`、`/dashboard`、`/users`、`/roles`、`/menus`、`/departments`、`/system-params`、`/operation-logs`、`/slow-sql`、`/async-tasks`；API 基础路由为 `/api/auth/*` 与 `/api/health`。
- Component boundaries: `apps/web/components/ui` 保存基础控件，`components/layout` 保存侧栏、壳层和资源列表；API 的认证和 Prisma 连接独立于 Worker 的任务注册表。
- State management: 服务端状态优先，客户端请求使用 TanStack Query；短生命周期 UI 状态保持局部。
- Assets and fonts: 采用系统中文字体回退、DejaVu Serif/Sans 和 JetBrains Mono 字体栈；登录页使用 CSS 几何纹理，不依赖远程图片。
- Build and static-check commands: `pnpm format:check`、`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`。
- Existing dependencies reused: 空仓库，无既有依赖。
- New dependencies and reasons: Next.js/NestJS/Prisma；shadcn 风格基础控件依赖 Radix 体系的兼容设计；TanStack Query、Lucide、Zod、Argon2、Pino 和 AWS S3 SDK 分别负责请求状态、图标、契约、密码哈希、结构化日志和 BOS S3 兼容签名/上传。
- Business behavior preserved: 不适用。
- Functional changes required for working interactions: 全部功能为新建。
- Unintended file or dependency churn check: 空仓库从零创建；未修改用户既有文件，未生成锁库之外的临时配置。
- Intentional deviations: 用户指定 Next.js，故不会使用通用构建器的 Vite 脚手架；真实 RDS/BOS 凭证未提供，页面使用真实配置空状态而不是 Mock 数据。
- Theme adaptation: Sunset Boulevard 的 `#264653` 深蓝绿替换为 `#1E2427` 石墨；成功状态使用青蓝 `#168AAD`，不使用绿色。

## 7. Browser Verification

| Scenario                    | Viewport       | Result | Evidence or issue                                  |
| --------------------------- | -------------- | ------ | -------------------------------------------------- |
| Critical user flow          | 1440x960       | passed | 登录页、验证码真实 API、工作台空状态、用户管理路由 |
| Keyboard navigation         | 1440x960       | passed | 表单、主题按钮、导航链接可定位，焦点样式可见       |
| Responsive layout           | 390x844        | passed | 登录页移动布局与主内容不溢出                       |
| Console and page errors     | desktop/mobile | passed | Playwright 未收集到 console error 或 page error    |
| Preserved behavior          | N/A            | passed | 全新项目，无既有行为。                             |
| Adjacent regression surface | N/A            | passed | 全新项目，无相邻回归面。                           |

- Server command and URL: `python3 /Users/manzhushaka/.codex/skills/webapp-testing/scripts/with_server.py --server "pnpm --filter @manzhushaka/api start:dev" --port 4000 --server "pnpm --filter @manzhushaka/web dev" --port 3000`；Web: `http://localhost:3000`。
- Browser-test command: `python3 /Users/manzhushaka/.codex/skills/webapp-testing/scripts/with_server.py --server "pnpm --filter @manzhushaka/api start:dev" --port 4000 --server "pnpm --filter @manzhushaka/web dev" --port 3000 -- python3 scripts/browser_check.py`。
- Screenshots: `/Users/manzhushaka/.codex/visualizations/2026/08/15/01a0039d-ba10-7c40-a381-01db6d7dcdb7/login-desktop.png`、`login-mobile.png`、`users-dark.png`。
- Failed requests: 无关键页面失败请求；未配置 RDS 时健康检查按预期返回数据库不可用。
- Residual risks or blockers: 本地 RDS 已完成独立数据库、迁移、种子和真实登录验证；BOS 凭证尚未提供，因此 BOS 签名下载和真实文件任务仍需配置后做集成验证；当前示例导出处理器不会生成虚假业务文件。

## 8. Decisions And Change Log

| Date       | Decision or change                            | Reason                                                   | Confirmed by      |
| ---------- | --------------------------------------------- | -------------------------------------------------------- | ----------------- |
| 2026-08-15 | 采用 pnpm 单仓库与 Next.js/NestJS/Worker 分层 | 兼顾企业级边界、共享契约与独立部署                       | User              |
| 2026-08-15 | 使用 shadcn/ui 体系并拒绝 Ant Design          | 需要更现代且可定制的视觉系统                             | User              |
| 2026-08-15 | 使用 MySQL RDS 与 Prisma，禁止数据库重置      | 本地和服务器可能共享真实数据库                           | User              |
| 2026-08-15 | 使用百度 BOS 私有存储与 5 分钟签名链接        | 统一异步任务文件的安全下载链路                           | User              |
| 2026-08-15 | 使用角色并集、服务端数据权限与分级菜单        | 保证授权语义清晰且可审计                                 | User              |
| 2026-08-15 | 指定所有必要代码注释使用中文                  | 统一项目维护习惯                                         | User              |
| 2026-08-15 | 采用冷静运行控制台视觉与漆红权限脊线          | 让品牌识别服务于导航和权限上下文，而不是装饰             | Stage 1           |
| 2026-08-15 | 选择并适配 Sunset Boulevard                   | 用户明确选择主题，同时排除绿色并控制暖沙色面积           | User / Stage 2    |
| 2026-08-15 | 完成从零实现与浏览器验证                      | 建立可运行的真实配置空状态、认证骨架、任务抽象和设计系统 | Stage 3 / Stage 4 |
