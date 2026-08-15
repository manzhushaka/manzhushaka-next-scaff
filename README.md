# Manzhushaka Next Scaff

面向企业管理后台的全栈脚手架。项目使用 pnpm workspace 组织 Web、API、Worker 与共享包，预置认证安全、RBAC、审计、异步任务和运维脚本等基础能力。

![Manzhushaka Console 工作台](docs/images/manzhushaka-console.png)

## 主要能力

- 控制台界面：工作台、用户、角色、部门、菜单权限、系统参数、操作日志、慢 SQL 与异步任务页面。
- 认证安全：图片验证码、Argon2id 密码哈希、服务端会话、登录失败锁定与首次登录强制修改密码。
- 权限模型：用户、角色、菜单权限和数据范围的 Prisma 领域模型。
- 数据任务：独立 Worker 应用与可注册的任务处理器骨架。
- 数据与存储：MySQL、Prisma，以及兼容 S3 协议的百度云 BOS 私有存储配置。
- 工程质量：严格 TypeScript、ESLint、Prettier、Vitest 和生产运维脚本。

## 技术栈

| 领域     | 技术                                                                  |
| -------- | --------------------------------------------------------------------- |
| Web      | Next.js 15、React 19、Tailwind CSS、Arco Design React、TanStack Query |
| API      | NestJS 11、Prisma 6、Zod、Argon2                                      |
| Worker   | TypeScript、tsx、Prisma、Pino                                         |
| 数据库   | MySQL                                                                 |
| Monorepo | pnpm workspace                                                        |

## 项目结构

```text
apps/
  web/          Next.js 控制台
  api/          NestJS API
  worker/       异步任务进程
packages/
  config/       环境配置与校验
  contracts/    跨应用数据契约
  security/     密码、令牌与加密能力
  ui/           共享 UI 包
prisma/         Schema、迁移、种子与管理员初始化
bin/            本地和生产运维脚本
design-system/  Web 设计规范
```

## 本地运行

### 环境要求

- Node.js 22 或更高版本
- pnpm 10.6.2
- MySQL

### 1. 获取代码并安装依赖

```bash
git clone https://github.com/manzhushaka/manzhushaka-next-scaff.git
cd manzhushaka-next-scaff
pnpm install
```

### 2. 配置环境

```bash
cp .env.example .env
```

至少需要在 `.env` 中配置可用的 `DATABASE_URL`。生产部署还应设置独立的 `DATA_ENCRYPTION_KEY`，并按需填写 BOS 私有存储配置。不要将 `.env` 或真实凭证提交到 Git。

### 3. 初始化数据库

先创建 `DATABASE_URL` 指向的 MySQL 数据库，再显式执行迁移和种子：

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm bootstrap:admin
```

`bootstrap:admin` 会交互式创建超级管理员，初始密码至少 10 位；已有同名账号不会被覆盖，首次登录必须修改密码。

### 4. 启动开发环境

```bash
pnpm dev
```

- Web：<http://localhost:3000>
- API 健康检查：<http://localhost:4000/api/health>

只预览 Web 界面时，可以运行：

```bash
pnpm --filter @manzhushaka/web dev
```

## 常用命令

| 命令                   | 用途                         |
| ---------------------- | ---------------------------- |
| `pnpm dev`             | 同时启动 Web、API 和 Worker  |
| `pnpm build`           | 构建全部 workspace 包        |
| `pnpm format:check`    | 检查代码格式                 |
| `pnpm lint`            | 运行 ESLint                  |
| `pnpm typecheck`       | 运行 TypeScript 类型检查     |
| `pnpm test`            | 运行单元测试                 |
| `pnpm db:migrate`      | 显式执行 Prisma 迁移         |
| `pnpm db:seed`         | 幂等写入内置角色、菜单和权限 |
| `pnpm bootstrap:admin` | 创建首个超级管理员           |

本地与生产环境的组合命令位于 `bin/local` 和 `bin/prod`。

## 安全说明

- 密码仅保存 Argon2id 哈希，初始化脚本不会打印密码。
- 数据库、BOS 和加密密钥必须通过私有环境配置注入。
- BOS Bucket 应保持私有，下载地址由服务端临时签发。
- 数据权限必须在服务端执行，前端菜单和按钮仅用于交互呈现。
- 日志不得记录密码、验证码、会话 Cookie、Authorization 或密钥明文。

## 参与开发

提交前请运行完整质量检查：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

涉及登录、会话、权限、数据范围、加密、审计或异步任务的改动，需要补充针对性测试。

## License

[MIT](LICENSE) © Manzhushaka
