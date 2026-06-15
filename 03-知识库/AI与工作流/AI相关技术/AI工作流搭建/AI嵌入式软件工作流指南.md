---
type: workflow
domain: ai-workflow
status: active
---
# AI 嵌入式软件工作流指南

本指南配套使用：

`embedded-vscode-codex-workflow-skills/`

这套工作流用于让新嵌入式项目拥有长期记忆、任务边界、证据规则和接力能力。它适合 VS Code + Codex 下的 MCU、SoC、固件、传感器、串口日志、板级调试、本地构建、烧录和人工验证类项目。

## 8 个 Skill 的关系

| Skill | 作用 |
|---|---|
| `workflow` | 一次性初始化器。只在新项目第一次使用，生成工作流骨架。 |
| `embedded-project-relay` | 初始化后的项目总控入口。每次新窗口接手项目时使用。 |
| `project-handoff` | 轻量接手，不重新扫描整个仓库。 |
| `task-spec-maker` | 把大目标切成当前窗口可完成的小任务。 |
| `source-index-update` | 维护代码地图和模块职责。 |
| `evidence-debug` | 证据优先调试硬件、固件、串口、构建、状态机等问题。 |
| `build-test-verify` | 构建、烧录、串口监视和人工验证记录。 |
| `context-pack-refresh` | 每轮结束时刷新上下文，保证下个窗口能接力。 |

## 阶段 1：第一次初始化

把 8 个 skill 文件夹放入新项目：

```text
your-project/
├─ .agents/
│  └─ skills/
│     ├─ workflow/
│     ├─ embedded-project-relay/
│     ├─ project-handoff/
│     ├─ task-spec-maker/
│     ├─ source-index-update/
│     ├─ evidence-debug/
│     ├─ build-test-verify/
│     └─ context-pack-refresh/
```

在新项目根目录打开 VS Code 和 Codex，然后明确发送：

```text
/workflow-init
```

`workflow` 只负责初始化。它会生成：

```text
AGENTS.md
docs/ai_context/README.md
docs/ai_context/WORKFLOW_INIT_STATE.md
docs/ai_context/CONTEXT_PACK.md
docs/ai_context/TASK_SPEC.md
docs/ai_context/SOURCE_INDEX.md
docs/ai_context/PROJECT_STATE.md
docs/ai_context/OPEN_QUESTIONS.md
docs/ai_context/SESSION_LOG.md
docs/ai_context/DECISIONS.md
docs/ai_context/VERIFY_GUIDE.md
.agents/skills/embedded-project-relay/SKILL.md
.agents/skills/project-handoff/SKILL.md
.agents/skills/task-spec-maker/SKILL.md
.agents/skills/source-index-update/SKILL.md
.agents/skills/evidence-debug/SKILL.md
.agents/skills/build-test-verify/SKILL.md
.agents/skills/context-pack-refresh/SKILL.md
```

初始化阶段默认不改业务代码，不跑构建，不烧录，不做硬件验证。

如果项目里已经存在 `docs/ai_context/WORKFLOW_INIT_STATE.md`，说明该项目已经初始化过，不要再次执行。

## 初始化问题

初始化时优先回答：

```text
1. 项目名称和一句话目标是什么？
2. 当前阶段是什么：新建、移植、调试、功能开发、验证、交付？
3. 芯片或开发板型号是什么？如果暂时不确定，请说“不确定”。
4. 当前是否有真机可测，还是只能静态改代码？
5. 开发环境选择哪一种？
   A. 使用当前 VS Code/项目默认环境
   B. 让 AI 配一套最熟悉的嵌入式开发环境
   C. 让 AI 读取 `.vscode/`、任务配置和项目配置后再定义环境
   D. 用户自定义环境
6. 哪些目录或文件不能碰？
7. 当前第一轮最小任务是什么？
```

构建、烧录、串口监视等命令不需要一开始全部手写给 AI。让 AI 从 `README.md`、`CMakeLists.txt`、`platformio.ini`、`.vscode/tasks.json`、脚本和项目配置中找证据。找不到就写入 `OPEN_QUESTIONS.md`。

## 阶段 2：每次开新窗口

新窗口第一句话：

```text
使用 $embedded-project-relay /$esp32-s3-project-relay接手项目。

请先读取：
- AGENTS.md
- docs/ai_context/CONTEXT_PACK.md
- docs/ai_context/TASK_SPEC.md
- docs/ai_context/SOURCE_INDEX.md
- docs/ai_context/OPEN_QUESTIONS.md

先输出 Skill Gate，不要直接修改代码。
```

如果只是轻量接手：

```text
使用 $project-handoff 接手项目，不要重新扫描整个仓库。
```

## 阶段 3：开始一个新任务前

```text
使用 $task-spec-maker。

根据 PROJECT_STATE.md、CONTEXT_PACK.md、OPEN_QUESTIONS.md 和 SOURCE_INDEX.md，生成下一轮 TASK_SPEC.md。
要求这个任务必须足够小，一个窗口能完成，并写清楚验证方法。
```

## 阶段 4：调试时

```text
使用 $evidence-debug 排查当前问题。

要求：
1. 每个判断必须给证据
2. 不允许猜硬件事实
3. 不确定内容写入 OPEN_QUESTIONS.md
4. 只提出最小修改方案
```

## 阶段 5：修改后验证

```text
使用 $build-test-verify。

根据本轮修改，给出并执行可用的构建、烧录、串口监视或人工验证步骤。
如果无法实际运行，请明确写 not actually run，并给出人工验证步骤。
```

## 阶段 6：更新代码地图

```text
使用 $source-index-update 更新 SOURCE_INDEX.md。

要求每个模块职责都必须有文件路径、函数名、配置项或用户确认作为证据。
```

## 阶段 7：结束当前窗口

```text
使用 $context-pack-refresh 结束本轮任务。

请更新：
- docs/ai_context/PROJECT_STATE.md
- docs/ai_context/SESSION_LOG.md
- docs/ai_context/OPEN_QUESTIONS.md
- docs/ai_context/CONTEXT_PACK.md
- docs/ai_context/SOURCE_INDEX.md（如有必要）

要求下一个新窗口可以直接接手，不需要重新扫描整个项目。
```

## 硬规则

- `workflow` 只负责初始化，不负责长期总控。
- 初始化后由 `embedded-project-relay` 做项目总控。
- 每轮只做一个可验证的小任务。
- 不确定的硬件、环境、协议、阈值、引脚、供电、烧录和验证事实必须先问用户或写入 `OPEN_QUESTIONS.md`。
- `PROJECT_STATE.md` 只写已验证事实。
- 没跑过的验证必须写 `not actually run`。
- 不要把猜测写成事实，不要为了继续推进而编造计划。

