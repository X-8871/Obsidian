---
type: project
domain: ai-agent
status: active
created: 2026-08-27
tags: [项目, AI_Agent, PlanMind, Web, 目标管理, OKR]
---

# PlanMind 个人目标管理 Web Agent

> [!important] **项目定位**：
> 深度融合本地 Obsidian Vault 的目标与计划智能 Agent 系统，提供**大目标逐层拆解（年 → 月 → 周 → 日 → 长期）**、**60FPS 丝滑数据看板**、**毫秒级双向实时同步**、**内置番茄钟**与**多模型 AI 计划导师**。

---

## 📌 项目基本信息

| 属性 | 说明 |
| :--- | :--- |
| **项目名称** | PlanMind Personal Goal Agent |
| **本地源码路径** | `C:\Users\22061\Desktop\Person_workdesk\plan_web` |
| **Vault 数据路径** | `C:\Users\22061\Documents\Obsidian Vault\PlanMind` |
| **技术栈** | Next.js 16.3.3 (Turbopack) + React 19 + Tailwind CSS + Zustand + Server-Sent Events (SSE) |
| **访问端口** | `http://localhost:3000` |
| **配置文件** | `C:\Users\22061\Desktop\Person_workdesk\plan_web\config.json` |

---

## 🏗️ 系统核心架构与功能

### 1. 目标与计划五层认知模型（日 → 周 → 月 → 年 → 总）
- **☀️ 当日计划**：聚焦今日 7 项攻坚清单，直连 `PlanMind/04-日计划/YYYY-MM-DD.md`。
- **🗓️ 当周目标**：周度阶段里程碑与硬节点，直连 `PlanMind/03-周目标/YYYY-WXX.md`。
- **📆 当月目标**：月度冲刺关键结果，直连 `PlanMind/02-月度目标/YYYY-MM.md`。
- **📅 当年目标**：年度宏观战略主线，直连 `PlanMind/01-年度目标/YYYY.md`。
- **🎯 长期与总规划**：考研北邮（085401）与微电子/嵌入式职业发展，直连 `PlanMind/05-长期目标/`。

### 2. 双向实时同步体系（SSE 网关）
- **Obsidian $\to$ Web**：Node.js `fs.watch` 毫秒级捕获文件变动，通过 SSE 通道自动推送，网页 **0.2 秒内无感刷新**。
- **Web $\to$ Obsidian**：网页勾选/取消 Checkbox，调用 `/api/tasks` 精准定位行号直接回写修改 `.md` 原文件。

### 3. 右上角常驻生产力套件
- **🍅 番茄钟胶囊（HeaderPomodoro）**：常驻顶部导航栏，支持倒计时、阶段切换、任务绑定与下拉环形大表盘。
- **🤖 AI 计划导师（HeaderAIChat）**：支持 OpenAI / Anthropic / Gemini 多模型切换，注入当前任务进度上下文，支持优先级拆解与复盘。
- **📜 历史计划归档（HistoryArchive）**：年/月/周/日逐层折叠，**严格只读锁定**，安全复盘过往周计划与日记。

---

## 🚀 本地启动与运维命令

```powershell
# 进入项目工作目录
cd C:\Users\22061\Desktop\Person_workdesk\plan_web

# 启动开发服务器
npm run dev

# 浏览器访问
# http://localhost:3000
```

---

## 🔗 相关索引与笔记双链

- 导航总索引：[[00-索引/00-总索引|00-总索引]]
- 项目索引中心：[[00-索引/项目索引|项目索引]]
- AI 工作流索引：[[00-索引/AI与工作流索引|AI与工作流索引]]
- 目标数据中心：[[PlanMind/00-INDEX|PlanMind 目标中心]]
- 长期方向规划：[[08-PLAN/长期/长期方向规划|长期方向规划]]
