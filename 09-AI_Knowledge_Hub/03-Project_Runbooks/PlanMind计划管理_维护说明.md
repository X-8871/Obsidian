---
type: project-runbook
domain: plan-management
project: PlanMind
status: active
created: 2026-08-28
updated: 2026-09-02
tags:
  - PlanMind
  - Plan-Web
  - Next.js
  - Obsidian
  - Runbook
---

# PlanMind 计划管理维护说明

> [!INFO] 项目定位
> - **项目物理绝对路径**：`C:\Users\22061\Desktop\Project\Person_WorkBeach\apps\plan-web`
> - **统一 Git 仓库地址**：`https://github.com/X-8871/Person_WorkBeach.git`
> - **统一入口**：`http://127.0.0.1:3000/#/modules/plan-web`
> - **独立入口**：`http://127.0.0.1:3000/`（独立启动默认端口，可按命令覆盖）

> [!IMPORTANT]
> PlanMind 是 Person WorkBeach 的独立计划领域模块。它可以使用统一登录与平台 AI，但目标、任务、历史计划和 Obsidian 文件仍由本模块独立维护。

## 一、项目物理地址与架构概览

### 1.1 技术栈与职责

| 维度 | 当前基线 |
|---|---|
| 运行时 | Node.js 20+、pnpm / npm |
| Web 框架 | Next.js `16.3.3`、React `19.2.8`、TypeScript 5 |
| 状态与可视化 | Zustand 5、Recharts 3、Tailwind CSS 4 |
| AI SDK | Vercel AI SDK 7，支持 OpenAI、Anthropic、Google 兼容 Provider |
| 数据事实源 | 用户配置的 Obsidian Vault，默认目录 `08-PlanMind` |
| 本机配置 | 被 Git 忽略的 `config.json` |

### 1.2 核心目录与接口

```text
apps/plan-web/
├── src/app/                 # Next.js App Router 页面和 API
│   ├── api/ai/              # AI 分析入口与平台适配
│   ├── api/config/          # 本机非公开配置读写
│   ├── api/goals/           # 目标数据
│   ├── api/tasks/           # 任务数据
│   ├── api/history/         # 历史计划
│   └── api/sync/            # Obsidian 同步
├── package.json             # 模块独立依赖与脚本
└── config.json              # 本机配置，不提交 Git
```

平台接入只增加认证门禁和 AI 适配，不改变以下原有业务接口：`/api/goals`、`/api/tasks`、`/api/history`、`/api/config`、`/api/sync`、`/api/ai`。

### 1.3 数据与 AI 边界

- 目标、任务、历史计划和同步内容只读写用户配置的 Obsidian `08-PlanMind`；
- `config.json` 仅用于本机独立模式，可能包含敏感 Provider 配置，禁止提交；
- `WORKBEACH_PLAN_AI_MODE=auto`：统一入口下优先平台 AI，平台网络或 5xx 故障时才回退本地；
- `platform`：强制平台 AI，需要统一登录；
- `local`：完全使用模块本地配置，用于独立维护和离线排障；
- 平台 SQLite 只保存平台元数据，不读取 PlanMind 的计划文件。

## 二、运行与部署指令（Runbook）

### 2.1 独立启动

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\Person_WorkBeach\apps\plan-web'
npm install
npm run dev
```

默认访问 `http://127.0.0.1:3000/`。若 `3000` 已被统一网关占用，使用其他端口：

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3004
```

### 2.2 统一入口启动

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\Person_WorkBeach'
pnpm dev -- --only "gateway,core-workbench,plan-web"
```

完整统一入口为 `http://127.0.0.1:3000/#/modules/plan-web`，上游端口为 `3004`。

### 2.3 校验与构建

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\Person_WorkBeach\apps\plan-web'
npm run lint
npm run build
```

融合链路检查在仓库根目录执行：

```powershell
pnpm check:structure
pnpm check:integration
```

### 2.4 配置与备份

1. 修改 Vault 路径或本地 Provider 前先备份 `config.json`；
2. 备份 Obsidian `08-PlanMind`，保持内部双链和相对路径；
3. 不把 API Key、Vault 私有正文或本机绝对配置提交到 Git；
4. 恢复时只恢复 PlanMind 自己的配置与 `08-PlanMind`，不得覆盖平台数据库或其他模块数据。

## 三、架构红线与禁忌（Redlines）

> [!CAUTION]
> 以下约束用于保持 PlanMind 的数据所有权和独立升级能力。

1. **禁止把计划数据迁入平台 SQLite**：Obsidian `08-PlanMind` 继续是计划领域事实源。
2. **禁止直接读取其他模块数据库**：不得读取 WorkBench IndexedDB、Fitness 浏览器数据、lab-coach SQLite 或 InkOS 项目状态。
3. **禁止破坏原有 API 契约**：平台适配应包裹 `/api/ai` 与认证边界，不得无迁移地改变目标、任务、历史和同步接口结构。
4. **禁止在浏览器或 Git 中暴露 API Key**：密钥只能从服务端环境或被忽略的本机配置读取。
5. **禁止取消独立模式**：`auto`、`platform`、`local` 三种模式必须继续支持模块单独升级和离线维护。
6. **禁止静默覆盖 Obsidian 文件**：同步和计划写入必须保留可诊断错误，不得把读取失败当成空数据覆盖。
7. **禁止接受伪造身份头**：开启统一门禁时，只接受网关签发且通过 HMAC 校验的模块上下文。
8. **禁止修改其他模块配置来修复 PlanMind**：故障只在 `apps/plan-web`、平台适配或用户指定的 `08-PlanMind` 范围内处理。

## 四、故障排查与已知问题记录

| 典型问题 / 现象 | 根本原因 | 标准处理 |
|---|---|---|
| 独立启动提示 `3000` 被占用 | 统一网关正在监听 `3000` | 使用 `--port 3004`，或先停止统一启动器 |
| 统一入口返回 502 | PlanMind 未启动、依赖缺失或 Next.js 启动失败 | 检查 `3004`、模块日志和 `node_modules`，只重启 PlanMind |
| 计划列表为空 | Vault 路径错误、`08-PlanMind` 不存在或文件解析失败 | 核对本机配置和目录权限，禁止先创建空数据覆盖原目录 |
| 已删除的 `08-PLAN` 再次出现 | 旧版默认 `planDir` 仍是 `08-PLAN`，读取今日任务时会自动建目录 | 升级到修复提交 `52973384`；确认 `/api/config` 返回 `08-PlanMind` 后再清理旧目录 |
| 平台 AI 提示需要登录 | 平台会话未建立或 HMAC 上下文缺失 | 从统一 WorkBench 登录，检查 Supabase 身份桥和共享密钥 |
| `auto` 模式仍走本地配置 | 通过独立入口访问，或统一平台不可用 | 从统一入口复测；需要严格禁止回退时改为 `platform` |
| 构建行为与旧 Next.js 经验不一致 | 当前使用 Next.js 16，存在破坏性变化 | 修改前阅读模块 `node_modules/next/dist/docs/` 对应版本文档 |

### 当前接手状态（2026-09-02，UTC+8）

- [x] 已接入统一左侧导航和同源模块容器；
- [x] 原有页面与 API 契约保留；
- [x] 已提供平台优先、平台严格和本地独立三种 AI 模式；
- [x] 已纳入统一启动、构建和入口烟测；
- [x] 默认计划目录、任务写入与历史接口已统一使用 `08-PlanMind`，不再自动创建旧 `08-PLAN`；
- [ ] 是否清理历史 `config.json` 中的本地 AI 配置，等待用户明确决定；
- [ ] 完整真实业务流程与真实设备视觉回归尚未验收。

## 关联文档

- [[Person_WorkBeach统一工作台_维护说明]]
- [[00-AI知识中枢总览]]
- [[AGENT_CORE]]
- [[HANDOFF_PROTOCOL]]
