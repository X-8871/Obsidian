---
title: Codex Skills 与本机 MCP 清单
created: 2026-08-28
updated: 2026-08-28
tags:
  - AI/Codex
  - AI/Skills
  - AI/MCP
  - 本机环境
aliases:
  - Codex Skill 清单
  - 本机 MCP 清单
---

# Codex Skills 与本机 MCP 清单

> [!info] 盘点口径
> - Codex 当前启用 Skill：**159 个，名称无重复**。
> - MCP：**8 个**，其中 Codex 3 个、Antigravity 4 个、OpenCode 1 个。
> - Codex 配置中已禁用的 11 个共享 Skill 不计入。
> - GitHub 栏仅填写能够从本地元数据或项目来源确认的地址；`—` 表示未确认到公开仓库。
> - 盘点日期：2026-08-28（南京时间，UTC+8）。

## Codex 当前启用的全部 Skill

| 来源 | 数量 | Skill 名称（全部） | GitHub |
|---|---:|---|---|
| 个人 Skill | 4 | `esp32-s3-lvgl-ui`、`feynman-spaced-learning`、`impeccable`、`read-pdf-reliably` | `impeccable`：[pbakaus/impeccable](https://github.com/pbakaus/impeccable) |
| Codex 系统 Skill | 6 | `imagegen`、`openai-docs`、`plugin-creator`、`review-agent`、`skill-creator`、`skill-installer` | [openai/skills](https://github.com/openai/skills) |
| 共享·安全与运维 | 7 | `1password`、`clawdefender`、`git-essentials`、`security-auditor`、`skill-vetter`、`session-logs`、`tmux` | — |
| 共享·开发与架构 | 7 | `architecture-designer`、`debug-pro-1.0.0`、`test-runner-1.0.0`、`frontend-design`、`ui-ux-pro-max`、`supabase-postgres-best-practices`、`clone-website` | [Supabase Agent Skills](https://github.com/supabase/agent-skills)、[UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| 共享·Antigravity 工程 | 9 | `cross-platform-paths`、`debug-failing-test`、`generate-snapshot`、`python-manager-discovery`、`run-e2e-tests`、`run-integration-tests`、`run-pre-commit-checks`、`run-smoke-tests`、`settings-precedence` | — |
| 共享·Gemini 多端开发 | 8 | `android-native-dev`、`flutter-dev`、`frontend-dev`、`fullstack-dev`、`ios-application-dev`、`react-native-dev`、`shader-dev`、`gif-sticker-maker` | — |
| 共享·AutoGLM | 6 | `autoglm-browser-agent`、`autoglm-deepresearch`、`autoglm-generate-image`、`autoglm-open-link`、`autoglm-search-image`、`autoglm-websearch` | — |
| 共享·办公与多媒体 | 9 | `FFmpeg Video Editor`、`markitdown`、`minimax-docx`、`minimax-multimodal-toolkit`、`minimax-pdf`、`minimax-xlsx`、`pptx-generator`、`video-frames`、`vision-analysis` | MarkItDown：[microsoft/markitdown](https://github.com/microsoft/markitdown) |
| 共享·飞书 | 7 | `feishu-chat-history`、`feishu-cron-reminder`、`feishu-doc`、`feishu-drive`、`feishu-perm`、`feishu-screenshot`、`feishu-send-file` | — |
| 共享·内容与营销 | 10 | `Market Research`、`blog-writer`、`content-strategy`、`copywriting`、`interview-designer`、`research-paper-writer`、`SEO (Site Audit + Content Writer + Competitor Analysis)`、`seo-content-writer`、`Social Media Scheduler`、`social-content` | — |
| 共享·数据、金融与知识 | 5 | `a-stock-analysis`、`aminer-data-search`、`automation-workflows`、`backtest-expert`、`obsidian-ontology-sync` | — |
| Browser + Chrome 插件 | 2 | `control-in-app-browser`、`control-chrome` | [openai/openai Browser Plugin](https://github.com/openai/openai/tree/master/lib/browser_use/plugin) |
| Computer Use 插件 | 1 | `computer-use` | [openai/openai Computer Use Plugin](https://github.com/openai/openai/tree/master/project/cua/sky_js/plugin) |
| Sites + Visualize 插件 | 3 | `sites-building`、`sites-hosting`、`visualize` | — |
| Office/PDF 运行时插件 | 6 | `documents`、`Spreadsheets`、`excel-live-control`、`Presentations`、`pdf`、`template-creator` | [openai/openai](https://github.com/openai/openai) |
| Vercel 插件 | 47 | `agent-browser`、`agent-browser-verify`、`ai-elements`、`ai-gateway`、`ai-generation-persistence`、`ai-sdk`、`auth`、`bootstrap`、`chat-sdk`、`cms`、`cron-jobs`、`deployments-cicd`、`email`、`env-vars`、`geist`、`geistdocs`、`investigation-mode`、`json-render`、`marketplace`、`micro`、`ncc`、`next-forge`、`nextjs`、`observability`、`payments`、`react-best-practices`、`routing-middleware`、`runtime-cache`、`satori`、`shadcn`、`sign-in-with-vercel`、`swr`、`turbopack`、`turborepo`、`v0-dev`、`vercel-agent`、`vercel-api`、`vercel-cli`、`vercel-firewall`、`vercel-flags`、`vercel-functions`、`vercel-queues`、`vercel-sandbox`、`vercel-services`、`vercel-storage`、`verification`、`workflow` | [vercel/vercel-plugin](https://github.com/vercel/vercel-plugin) |
| Exa 插件 | 1 | `Search` | — |
| Plugin Management 插件 | 1 | `plugin-management` | [OpenAI Plugin Management](https://github.com/openai/openai/tree/master/chatgpt/oai-maintained-plugins/plugins/plugin-management) |
| OpenAI Templates 插件 | 20 | `artifact-template-analytics-dashboard`、`artifact-template-business-review`、`artifact-template-design-report`、`artifact-template-experiment-analysis`、`artifact-template-financial-budget`、`artifact-template-investment-committee-memo`、`artifact-template-legal-memorandum`、`artifact-template-market-trends-report`、`artifact-template-minimal-letterhead`、`artifact-template-operating-calendar`、`artifact-template-operating-review`、`artifact-template-project-kickoff`、`artifact-template-project-tracker`、`artifact-template-sales-pipeline`、`artifact-template-simple-dark-mode`、`artifact-template-simple-light-mode`、`artifact-template-strategy-memorandum`、`artifact-template-system-design`、`artifact-template-team-alignment`、`artifact-template-three-statement-forecast` | [openai/oai-maintained-plugins](https://github.com/openai/oai-maintained-plugins/tree/main/plugins/openai-templates) |
| **合计** | **159** | **159 个唯一 Skill** |  |

> [!note] Skill 清单显示机制
> Vercel 的 47 个 Skill 处于启用状态，因此计入。Codex 会限制启动时 Skill 索引占用的上下文，当前任务的可见清单可能不会展示所有已启用 Skill，但这不代表它们不存在。

## 本机 MCP 清单

| 客户端 | MCP | 状态/启动方式 | 主要用途 | GitHub |
|---|---|---|---|---|
| Codex | `node_repl` | 已启用；`node_repl.exe`，stdio | 持久 Node.js 执行环境，同时支撑 Browser、Chrome 等插件 | — |
| Codex | `codex_app` | 桌面运行时启用 | Codex 任务、项目、自动化、面板、分享和任务管理 | — |
| Codex | `codex_apps` | 当前运行时启用 | 为 Exa、Sites、Spreadsheets、Plugin Management 等插件提供工具注册 | — |
| Antigravity | `agent-browser` | `agent-browser.cmd mcp` | 浏览器自动化、页面交互、截图、DOM/可访问性树操作 | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) |
| Antigravity | `blender` | `cmd /c uvx blender-mcp` | Blender 建模、材质、场景和 Python 控制 | [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp) |
| Antigravity | `scrapling` | `scrapling mcp` | 网页抓取、反爬、结构化内容提取 | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) |
| Antigravity | `chrome_devtools` | 内建，检测到 31 个工具定义 | Chrome DevTools 调试、网络、性能、控制台与页面操作 | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) |
| OpenCode | `github` | 已启用；`npx -y @modelcontextprotocol/github` | GitHub 仓库、文件、Issue 等操作 | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) |
| **合计** | **8 个** | Codex 3 + Antigravity 4 + OpenCode 1 |  |  |

## Codex 已禁用、未计入的共享 Skill

以下 11 个 Skill 仍保留在 `C:\Users\22061\.agents\skills`，但已通过 Codex 配置禁用：

1. `Code`
2. `brainstorming`
3. `writing-plans`
4. `executing-plans`
5. `pua`
6. `Self-Improving Agent (With Self-Reflection)`
7. `self-reflection`
8. `Memory`
9. `find-skills`
10. 共享版 `skill-creator`
11. `opencode-controller`

## 相关位置

- Codex 配置：`C:\Users\22061\.codex\config.toml`
- Codex 个人 Skill：`C:\Users\22061\.codex\skills`
- 共享 Skill：`C:\Users\22061\.agents\skills`
- Codex 插件缓存：`C:\Users\22061\.codex\plugins\cache`
- Antigravity MCP：`C:\Users\22061\.gemini\antigravity\mcp`
- OpenCode 配置：`C:\Users\22061\.config\opencode\opencode.json`
