---
name: workflow
description: Initialize an embedded VS Code Codex project workflow exactly once. Use only after the user explicitly sends /workflow-init or an equivalent confirmed initialization command. Generates AGENTS.md, docs/ai_context templates, and project workflow skills without modifying business code.
---

# Workflow Initializer

## Role

This skill is a one-time initializer for embedded projects developed with VS Code and Codex.

It creates the workflow skeleton only. It is not the long-term project controller. After initialization, use `embedded-project-relay`, `project-handoff`, `task-spec-maker`, `source-index-update`, `evidence-debug`, `build-test-verify`, and `context-pack-refresh`.

## Trigger Rule

Only initialize after the user explicitly sends:

```text
/workflow-init
```

Equivalent commands are allowed only when the user's intent is unambiguous, for example:

```text
执行 workflow 初始化
开始生成嵌入式 Codex 工作流骨架
```

If the user mentions the workflow but does not confirm initialization, explain that `/workflow-init` is required and do not inspect or write project files.

## Scope

Use this skill only for embedded software projects in VS Code with Codex, such as MCU, SoC, firmware, board bring-up, sensor integration, serial-log debugging, local build, flash, and hardware verification projects.

Do not use this skill for pure frontend, pure backend, content writing, data analysis, or non-embedded repositories.

## Hard Rules

- Each project can be initialized only once.
- Do not modify business code, build logic, source files, firmware modules, drivers, third-party libraries, generated files, or existing implementation files during initialization.
- Do not invent hardware facts.
- Do not guess chip model, board model, GPIO, sensor model, power supply, threshold, schematic, PCB, enclosure, network protocol, server address, credential storage, or demo requirements.
- Write unconfirmed facts to `docs/ai_context/OPEN_QUESTIONS.md`, not to `PROJECT_STATE.md`.
- If a target file already exists, do not overwrite it silently. Summarize the conflict and ask the user.
- Use UTF-8 when reading or writing Chinese files.

## One-Time Check

Before writing anything, check whether the project already has workflow traces:

- `docs/ai_context/WORKFLOW_INIT_STATE.md`
- `AGENTS.md`
- `docs/ai_context/CONTEXT_PACK.md`
- `.agents/skills/embedded-project-relay/SKILL.md`

If `WORKFLOW_INIT_STATE.md` exists, stop. Report that the project appears initialized.

If other workflow files exist but the marker does not, ask the user whether this is a partial/manual setup before writing.

## Initialization Questions

Ask these questions before creating the first skeleton. Keep the questions compact and accept partial answers. Unknown items must be recorded as open questions.

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

Do not force the user to provide build, flash, or monitor commands at this stage. After the user confirms the environment mode, infer commands from project evidence such as `README.md`, `CMakeLists.txt`, `platformio.ini`, `idf_component.yml`, `Makefile`, `.vscode/tasks.json`, scripts, or user confirmation. If no evidence exists, write the command gap to `OPEN_QUESTIONS.md`.

## Allowed Discovery After Confirmation

After `/workflow-init`, read only a small evidence set:

- top-level file list
- `README.md` if present
- project configuration files such as `CMakeLists.txt`, `platformio.ini`, `Makefile`, `package.json`, `idf_component.yml`, `sdkconfig.defaults`
- `.vscode/settings.json`, `.vscode/tasks.json`, `.vscode/launch.json` when the user chooses environment mode C or when these files are clearly relevant
- existing docs that describe hardware, build, flashing, or verification

Avoid:

- `.git/`
- `build/`
- `dist/`
- generated files
- third-party dependency directories
- large PDFs unless the user explicitly says they are needed

## Files To Generate

Create this skeleton when safe:

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

The generated skill files should match the 7 companion skills in this workflow package, adjusted only for the new project name if needed.

## AGENTS.md Template

Use this structure:

````md
# AGENTS.md

## Project Positioning

This repository is an embedded software project developed with VS Code and Codex.

Codex should not rely on chat memory. It must use repository-level persistent context files before implementation, debugging, verification, or documentation work.

## Required Read Order

Before changing code or project documentation, read:

1. `docs/ai_context/CONTEXT_PACK.md`
2. `docs/ai_context/TASK_SPEC.md`
3. `docs/ai_context/SOURCE_INDEX.md`
4. `docs/ai_context/OPEN_QUESTIONS.md`
5. Files directly related to the current task

If these files are missing, stale, or contradictory, update the context or ask the user before modifying business code.

## Embedded Hard Rules

- Do not guess hardware facts.
- Do not silently change GPIO, pin mapping, thresholds, power assumptions, state-machine semantics, network protocol, server address, credential storage, flash layout, or boot behavior.
- Any hardware, firmware, or verification conclusion must have evidence.
- Unverified items belong in `OPEN_QUESTIONS.md`.
- Verified facts belong in `PROJECT_STATE.md`.
- Initialization and handoff work must not modify business code unless the current task explicitly allows it.

## Evidence Requirements

Each technical conclusion needs at least one evidence source:

- file path
- function name
- macro or configuration item
- build output
- serial log
- measured behavior
- schematic, pin table, datasheet, or board manual
- user confirmation

## Skill Routing

Every task should start with a Skill Gate:

```text
Skill used:
Reason:
Current step:
Task scope:
Files to read first:
Files not to touch:
Uncertainties to ask user:
Coding allowed now: yes/no
```

Use:

- `embedded-project-relay` for normal project continuation and project-level coordination.
- `project-handoff` for lightweight new-window handoff.
- `task-spec-maker` to define the next small task.
- `source-index-update` after structure changes or code-map updates.
- `evidence-debug` for embedded debugging.
- `build-test-verify` for build, flash, monitor, and manual verification.
- `context-pack-refresh` before ending a session.

## Closeout

Before ending a meaningful task, update or propose updates to:

- `docs/ai_context/PROJECT_STATE.md`
- `docs/ai_context/SESSION_LOG.md`
- `docs/ai_context/OPEN_QUESTIONS.md`
- `docs/ai_context/CONTEXT_PACK.md`
- `docs/ai_context/SOURCE_INDEX.md` if structure changed
````

## Context File Templates

Create stable templates. Do not improvise new headings each time.

### `docs/ai_context/WORKFLOW_INIT_STATE.md`

```md
# Workflow Init State

Status: initialized
Initialized at:
Initialized by: Codex workflow skill

## Project

- Name:
- Goal:
- Stage:
- Chip/board:
- Hardware availability:
- Environment mode:

## Initialization Evidence

- Files inspected:
- User confirmations:

## Initialization Limits

- Business code changed: no
- Build run: not actually run
- Flash run: not actually run
- Hardware verification run: not actually run
```

### `docs/ai_context/CONTEXT_PACK.md`

```md
# Context Pack

## Project Snapshot

- Project name:
- One-line goal:
- Current stage:
- Chip/board:
- Framework/toolchain:
- Hardware availability:

## Current State

- Verified facts:
- Current task:
- Known blockers:

## Read First

- `AGENTS.md`
- `docs/ai_context/TASK_SPEC.md`
- `docs/ai_context/SOURCE_INDEX.md`
- `docs/ai_context/OPEN_QUESTIONS.md`

## Do Not Read First

- `.git/`
- build outputs
- generated files
- third-party dependencies
- large documents unrelated to the task

## Next Recommended Step

-
```

### `docs/ai_context/TASK_SPEC.md`

```md
# Task Spec

## Current Task

-

## This Session Will Do

-

## This Session Will Not Do

-

## Files To Read First

-

## Files Not To Touch

-

## Uncertainties

-

## Verification Method

-

## Suggested Next Step

-
```

### `docs/ai_context/SOURCE_INDEX.md`

```md
# Source Index

## Entry Points

| File | Role | Evidence |
|---|---|---|

## Module Map

| Module/File | Responsibility | Key Functions | Evidence |
|---|---|---|---|

## Build And Configuration

| File | Purpose | Evidence |
|---|---|---|

## Hardware-Related Files

| File | Hardware Area | Evidence |
|---|---|---|

## High-Risk Files

| File | Risk | Reason |
|---|---|---|

## Unknowns

-
```

### `docs/ai_context/PROJECT_STATE.md`

```md
# Project State

Only verified facts go here.

## Confirmed Project Facts

| Fact | Evidence |
|---|---|

## Confirmed Hardware Facts

| Fact | Evidence |
|---|---|

## Confirmed Environment Facts

| Fact | Evidence |
|---|---|

## Confirmed Behavior

| Behavior | Evidence |
|---|---|

## Current Stage

-
```

### `docs/ai_context/OPEN_QUESTIONS.md`

```md
# Open Questions

Unverified or user-dependent facts go here.

| ID | Question | Why It Matters | Blocks Work? | Status |
|---|---|---|---|---|
```

### `docs/ai_context/SESSION_LOG.md`

```md
# Session Log

## YYYY-MM-DD Session

Completed:

Not completed:

Verification:

New uncertainties:

Context updated:

Suggested next step:
```

### `docs/ai_context/DECISIONS.md`

```md
# Decisions

| Date | Decision | Evidence/User Confirmation | Impact |
|---|---|---|---|
```

### `docs/ai_context/VERIFY_GUIDE.md`

````md
# Verify Guide

## Build

- Command:
- Evidence:

## Flash

- Command:
- Port:
- Evidence:

## Monitor

- Command:
- Expected logs:

## Manual Hardware Checks

| Check | Expected Result | Evidence |
|---|---|---|

## When Verification Cannot Be Run

Use:

```text
This session did not actually run verification. Reason:
Suggested manual verification steps:
Expected behavior:
Check first on failure:
```
````

## Final Output

After initialization, report:

```md
## Workflow Initialization Result

Created:
Skipped:
Conflicts:

Project facts recorded:
Open questions:
Environment mode:

Business code changed: no
Verification run: not actually run

Next step:
Use `project-handoff` or `task-spec-maker` to define the first small task.
```
