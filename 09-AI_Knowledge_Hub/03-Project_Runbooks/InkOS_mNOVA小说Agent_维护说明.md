---
type: project-runbook
domain: ai-agent
project: inkos-mnova
status: active
created: 2026-08-27
updated: 2026-08-27
tags:
  - InkOS
  - mNOVA
  - AI-Agent
  - Novel
  - TypeScript
  - React
  - Runbook
---

# InkOS / mNOVA 小说 Agent 维护说明

> [!INFO] 项目定位
> - **Git 权威源码目录**：`C:\Users\22061\Desktop\Project\novel-agent\inkos`
> - **运行数据与配置根目录**：`C:\Users\22061\Desktop\Project\novel-agent`
> - **工作台源码快照**：`C:\Users\22061\Desktop\Person\_workdesk\05_Novel`
> - **上游仓库**：`https://github.com/Narcooo/inkos.git`
> - **个人发布仓库**：`https://github.com/X-8871/inkos.git`

> [!WARNING]
> `05_Novel` 是 2026-08-27 生成的便携源码快照，已排除 `.git`、`node_modules`、构建产物、缓存、运行日志、数据库和密钥文件。日常开发、查看历史和 Git 提交仍以权威源码目录为准；若未来决定迁移仓库，必须显式迁移 `.git` 或重新绑定远程仓库。

> [!IMPORTANT]
> mNOVA 当前产品基线是**默认简洁爽文模式**：保留逐章契约、事实、连续性、状态、伏笔和字数硬校验，默认不运行白金盲审和整批重写。白金审稿仅作为用户显式选择的高级模式。

---

## 一、项目物理地址与架构概览

### 1.1 项目定位

InkOS 是长篇小说、短篇、剧本、分镜、互动叙事和翻译工作台；mNOVA 是其中面向长篇网文自动生产的多 Agent 协调层。它不是单次提示词生成器，而是通过可验证的文件、运行账本和状态机完成：

1. 初始化不可变故事契约与真实大纲；
2. 规划、组合上下文并生成章节；
3. 从正文提取事实和状态变化；
4. 校验连续性、伏笔、契约指纹与章节长度；
5. 在失败时保留可诊断终态，禁止把半成品标记为完成。

### 1.2 技术栈与环境基线

| 维度 | 当前基线 |
| :--- | :--- |
| 运行时 | Node.js `>=20`；本机验证版本 `v25.8.0` |
| 包管理器 | pnpm；本机验证版本 `11.9.0` |
| 语言 | TypeScript 5.8，统一 UTF-8 |
| Core | Zod、YAML/JSON 状态文件、SQLite 长期记忆、Vitest |
| Studio | React 19、Vite 6、Hono、SSE |
| 当前版本 | InkOS monorepo `1.7.2` |
| 当前模型路由 | DeepSeek 官方 OpenAI-compatible API，模型配置为 `deepseek-v4-flash` |
| Studio 地址 | `http://127.0.0.1:4567/`；mNOVA 页面为 `/#/mnova` |

### 1.3 三类物理目录必须区分

```text
C:\Users\22061\Desktop\Project\novel-agent\
├── inkos\                         # Git 权威源码仓库
│   ├── packages\core\src\mnova\ # mNOVA 核心状态机、协调器与守门逻辑
│   ├── packages\cli\src\         # CLI 入口与 mNOVA 命令
│   ├── packages\studio\src\      # Studio API 与 React 控制室
│   └── docs\plans\                # 能力验证计划
├── books\                         # 真实小说项目及运行状态，不属于源码包
├── docs\validation\              # Gate 验收证据
└── inkos.json                     # 项目级配置，严禁写入明文密钥

C:\Users\22061\Desktop\Person\_workdesk\05_Novel\
└── ...                            # 便携源码快照，不含 Git 历史与依赖
```

### 1.4 mNOVA 核心模块职责

| 模块 | 职责 |
| :--- | :--- |
| `schema.ts` | Studio 控制、运行状态、质量模式等 Zod 契约；`qualityMode` 默认 `simple` |
| `templates.ts` | 新 mNOVA 项目的目录和控制文件模板 |
| `production-coordinator.ts` | 唯一生产协调入口；串联写作、结算、暂停、恢复和可选白金审稿 |
| `agent.ts` | 单章生产与逐章硬校验 |
| `mutation-guard.ts` | 阻止反馈或提案修改不可变终局、核心真相和人物底线 |
| `validator.ts` | 校验目录、契约指纹、窗口、水位和状态一致性 |
| `run-state.ts` | 管理 queued/running/paused/completed/failed/blocked/cancelled 等终态 |
| `growth-planner.ts` / `growth-engine.ts` | 扩展滚动细纲，处理反馈提案与守门 |
| `platinum-reviewer.ts` | 可选白金审稿；简洁模式不调用 |
| `mnova-web.ts` | Studio 的 mNOVA API 与状态聚合 |
| `MNovaControlRoom.tsx` | `/#/mnova` 控制室；默认展示“简洁爽文” |

### 1.5 生产数据流

```mermaid
flowchart LR
    UI[Studio mNOVA 控制室] --> API[Studio API]
    API --> PC[Production Coordinator]
    PC --> A[mNOVA 单章 Agent]
    A --> P[Planner / Composer]
    P --> W[Writer]
    W --> O[Observer / Reflector]
    O --> G[契约·事实·连续性·伏笔·字数守门]
    G --> S[(章节、索引、状态、记忆)]
    PC -. qualityMode=platinum .-> PR[Platinum Reviewer]
    PR -. 未达门槛时 .-> RW[整批回滚重写]
```

### 1.6 当前关键决策与提交基线

| 提交 | 决策 |
| :--- | :--- |
| `bfc8ec62` | 整个 mNOVA 默认使用简洁质量模式，白金审稿改为可选 |
| `fd1daacd` | 对中等幅度的章节超长执行确定性压缩 |
| `1f13d8e1` | 限制轻微章节超长，防止修订结算再次越界 |
| `48e94c63` | DeepSeek V4 默认关闭 thinking，避免模型格式不兼容 |

---

## 二、运行与部署指令（Runbook）

### 2.1 安装依赖

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\novel-agent\inkos'
pnpm install
```

### 2.2 构建 Core 与 Studio

```powershell
pnpm --filter @actalk/inkos-core build
pnpm --filter @actalk/inkos-studio build
```

Studio 类型检查依赖最新 Core `dist`，因此修改 Core 后应先构建 Core，再检查 Studio。

### 2.3 Windows 下启动 Studio

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\novel-agent\inkos'
$env:INKOS_STUDIO_PORT = '4567'
$env:INKOS_PROJECT_ROOT = 'C:\Users\22061\Desktop\Project\novel-agent'
pnpm --filter @actalk/inkos-studio exec tsx src/api/index.ts
```

访问：

- Studio 首页：`http://127.0.0.1:4567/`
- mNOVA 控制室：`http://127.0.0.1:4567/#/mnova`

健康检查：

```powershell
Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:4567/'
```

### 2.4 定向测试与构建验收

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\novel-agent\inkos'

# Core mNOVA 测试
pnpm --filter @actalk/inkos-core exec vitest run "src/__tests__/mnova-*.test.ts"

# Studio mNOVA API 测试
pnpm --filter @actalk/inkos-studio exec vitest run src/api/mnova-web.test.ts src/api/mnova-routes.test.ts

# 类型检查与生产构建
pnpm --filter @actalk/inkos-core typecheck
pnpm --filter @actalk/inkos-core build
pnpm --filter @actalk/inkos-studio typecheck
pnpm --filter @actalk/inkos-studio build
```

2026-08-25 最近一次相关基线：Core mNOVA 40/40、Studio mNOVA Web 8/8，通过 Core/Studio typecheck 与生产构建。全量 Core 测试曾有 3 个与 Windows 权限/故障注入环境相关的既有失败，不得把它们误报为本轮 mNOVA 回归。

### 2.5 模型与密钥配置

> [!CAUTION]
> 本知识库、源码、日志、Prompt、章节与 Git 历史中禁止出现原始 API Key。

- 项目配置位于运行根目录的 `inkos.json`；只保存 provider、base URL、模型和环境变量引用等非秘密字段。
- 密钥只能来自 Studio 的本地 secret store 或用户环境变量。
- 当前路由是 DeepSeek 官方 API；更换服务、模型或 Base URL 后必须新开验证轮次。
- 配置检查时只能记录凭据来源和不可逆指纹，禁止记录密钥首尾字符。

### 2.6 Git 工作流

```powershell
Set-Location 'C:\Users\22061\Desktop\Project\novel-agent\inkos'
git status --short
git diff --check
git diff -- <本轮文件>
git add -- <本轮文件>
git commit -m "<类型>(mnova): <本轮说明>"
```

- 当前主分支：`master`。
- 只提交本轮相关文件；不得混入用户已有的 `packages/studio/tsconfig.server.json`、`pnpm-lock.yaml` 等无关改动。
- `05_Novel` 快照没有 `.git`，不能作为提交位置。

---

## 三、架构红线与禁忌（Architectural Redlines）

> [!CAUTION]
> 以下红线除非用户明确改变产品目标，否则禁止绕过。

1. **不可变契约不得漂移**：终局、核心真相、人物底线和故事承诺必须以哈希或指纹复核，模型不得自行改写。
2. **默认简洁模式不得暗中调用白金审稿**：`qualityMode` 默认值必须保持 `simple`；只有用户显式选择 `platinum` 才可产生白金调用和整批回滚重写。
3. **简洁不等于无校验**：事实来源、未知/猜测边界、连续性、状态结算、伏笔 ID 唯一性、章节编号和字数硬区间仍必须逐章通过。
4. **唯一写入口**：生产状态和正文变更必须经过 `Production Coordinator` / mNOVA Agent；禁止直接改账本伪造完成状态。
5. **失败不得伪装成功**：模型 402、超时、非法 JSON、写盘失败或章节越界时必须进入可诊断失败/阻断状态，不得落半章后显示完成。
6. **项目记忆隔离**：不同小说项目不得共用 `story/memory.db`、状态文件或契约；禁止从历史测试项目污染新书。
7. **伏笔身份唯一**：每条伏笔必须有唯一 `id/hookId`；重复 ID 必须中止结算，而不是静默覆盖。
8. **密钥零落盘红线**：真实密钥不得进入源码、Obsidian、测试夹具、日志、错误堆栈、模型 Trace 或提交历史。
9. **Git 权威目录唯一**：未完成正式迁移前，只在 `...\novel-agent\inkos` 中提交；不得把工作台快照误当权威仓库。

---

## 四、故障排查与已知问题记录

| 典型问题 / 现象 | 根本原因 | 标准处理 |
| :--- | :--- | :--- |
| 页面显示“加载库失败 / 意外服务器错误” | Studio 后端未启动，或 `INKOS_PROJECT_ROOT` 指向了源码目录而非运行根目录 | 按 2.3 节启动；确认项目根是 `...\novel-agent`，再请求 4567 首页 |
| 启动后一直没有章节进度 | 先查 `06_runtime/current_run.yaml`，不能只看前端等待动画 | 读取 `status/phase/error`；模型端长响应与终态失败要分开处理 |
| `402 Insufficient Balance` | DeepSeek 官方账户余额不足 | 充值或换有余额的官方密钥；不得改代码掩盖。确认失败前没有落盘章节，并复核契约哈希 |
| `duplicate hook ID` / 伏笔 ID 不唯一 | Reflector 输出重复身份，或旧项目已有污染账本 | 中止该章结算，检查 `story/state/hooks.json`；修复 admission/normalization 后用隔离新项目复测 |
| 修订后章节超过 2500 字 | 模型重写扩张或确定性压缩未覆盖该幅度 | 检查 normalizer 与修订结算；硬区间未满足时不得通过 Gate |
| Windows 执行 `pnpm ... dev` 失败 | package script 使用 POSIX 环境变量写法 | 使用 2.3 节 PowerShell 启动方式 |
| pnpm 提示 package.json 的 `pnpm.overrides` 不再读取 | pnpm 11 配置行为变化 | 目前为警告；升级依赖前迁移到 pnpm 推荐配置并跑全量回归 |
| Studio 端类型检查找不到 Core 新类型 | Core `dist` 仍是旧构建 | 先执行 Core build，再执行 Studio typecheck/build |

### 4.1 当前 Gate 状态（2026-08-27）

- Gate 0 的基础代码、默认简洁模式和相关测试已完成。
- A8 隔离项目已验证默认 `qualityMode: simple`、真实 30 章大纲和契约有效。
- A8 四章实跑在第 1 章生成前收到 DeepSeek 官方 `402 Insufficient Balance`，因此 **Gate 1 尚未通过**；没有生成章节，契约哈希前后一致。
- 原验证计划仍含“百炼 + 强制白金”的旧验收口径，与当前“DeepSeek 官方 + 默认简洁爽文”的产品决策不一致。应在真实四章通过后更新计划与 Gate 2 交接文件。

### 4.2 下一步恢复顺序

1. 确认 DeepSeek 官方账户有余额，不在日志或命令中输出密钥。
2. 重新启动 Studio，使用隔离项目执行 4 章简洁模式实跑。
3. 按 [[mNOVA_Agent能力验证与防幻觉验收SOP]] 复核章节、状态、契约哈希和伏笔唯一性。
4. Gate 1 通过后更新 `docs/plans/2026-08-20-mnova-agent-capability-validation.md`，再交接 Gate 2。

---

## 🔗 相关中枢文档与双链

- 知识中枢总览：[[00-AI知识中枢总览]]
- mNOVA 验收流程：[[mNOVA_Agent能力验证与防幻觉验收SOP]]
- 本机开发环境：[[常用开发环境与工具链]]
- Git 连接规范：[[Git与GitHub连接配置]]
- 跨 Agent 交接：[[HANDOFF_PROTOCOL]]
