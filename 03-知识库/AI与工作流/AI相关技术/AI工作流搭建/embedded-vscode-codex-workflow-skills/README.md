---
type: guide
domain: ai-workflow
status: active
---


# Embedded VS Code Codex Workflow Skills

A reusable 8-skill workflow system for embedded software projects developed with VS Code and Codex.

It gives a new embedded repository a persistent project memory, explicit task boundaries, evidence-first debugging rules, and a repeatable handoff process across Codex sessions.

This repository is not an embedded framework and does not contain firmware code. It provides workflow files only.

## What This Solves

Codex sessions are short-lived. Embedded projects are not.

Without a project-level workflow, each new session tends to rediscover the repository, guess hardware details, mix unrelated tasks, and lose verification history. This skill set creates a stable project memory layer so future sessions can continue from known context instead of starting over.

## Designed For

- Embedded firmware projects
- MCU, SoC, board bring-up, and sensor integration work
- VS Code + Codex workflows
- Projects that need build, flash, serial log, and hardware verification records
- Long-running development where context handoff matters

Not recommended for pure frontend, pure backend, content writing, or data-analysis-only projects.

## Skill Set

| Skill | Type | Purpose |
|---|---|---|
| `workflow` | One-time initializer | Creates the workflow skeleton in a new project. Runs only after an explicit `/workflow-init`. |
| `embedded-project-relay` | Project controller | Main entry after initialization. Reads persistent context, defines scope, and routes to other skills. |
| `project-handoff` | Lightweight handoff | Resumes a project in a new window without rescanning the whole repository. |
| `task-spec-maker` | Task splitter | Turns broad project goals into one small, verifiable task for the current session. |
| `source-index-update` | Code map maintainer | Updates module responsibilities, entry points, key functions, build files, and high-risk files. |
| `evidence-debug` | Debug workflow | Investigates embedded issues using evidence before changing code. |
| `build-test-verify` | Verification workflow | Records build, flash, monitor, manual checks, and unrun verification honestly. |
| `context-pack-refresh` | Session closeout | Updates project state, session log, open questions, and compressed context for the next session. |

## Repository Layout

```text
.
├─ workflow/
│  └─ SKILL.md
├─ embedded-project-relay/
│  └─ SKILL.md
├─ project-handoff/
│  └─ SKILL.md
├─ task-spec-maker/
│  └─ SKILL.md
├─ source-index-update/
│  └─ SKILL.md
├─ evidence-debug/
│  └─ SKILL.md
├─ build-test-verify/
│  └─ SKILL.md
├─ context-pack-refresh/
│  └─ SKILL.md
└─ 使用指南.md
```

## Quick Start

Copy the eight skill folders into your target embedded project:

```text
your-project/
└─ .agents/
  └─ skills/
     ├─ workflow/
     ├─ embedded-project-relay/
     ├─ project-handoff/
     ├─ task-spec-maker/
     ├─ source-index-update/
     ├─ evidence-debug/
     ├─ build-test-verify/
     └─ context-pack-refresh/
```

Open the target project in VS Code with Codex, then send:

```text
/workflow-init
```

The `workflow` skill will ask a small set of initialization questions, inspect a limited set of project files, and generate the project workflow skeleton.

## What Initialization Creates

The initializer creates stable workflow files such as:

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

`workflow` is intentionally one-time. After initialization, normal project work should start with `embedded-project-relay` or `project-handoff`.

## Initialization Questions

The initializer asks for the minimum information needed to avoid bad assumptions:

```text
1. Project name and one-line goal
2. Current stage: new, porting, debugging, feature work, verification, delivery
3. Chip or development board model, or "unknown"
4. Whether real hardware is available or only static code work is possible
5. Environment mode:
  A. Use current VS Code/project defaults
  B. Let AI define a familiar embedded environment
  C. Let AI inspect `.vscode/` and project configs first
  D. User-defined environment
6. Files or directories that must not be touched
7. First smallest task
```

Build, flash, and monitor commands do not need to be provided manually at first. Codex should infer them from evidence such as `README.md`, `CMakeLists.txt`, `platformio.ini`, `.vscode/tasks.json`, project scripts, or user confirmation. Missing facts should go into `OPEN_QUESTIONS.md`.

## Operating Model

After initialization:

1. Use `embedded-project-relay` at the start of normal work.
2. Use `project-handoff` for lightweight continuation in a new window.
3. Use `task-spec-maker` before starting a broad or unclear task.
4. Use `evidence-debug` for embedded debugging.
5. Use `build-test-verify` after implementation.
6. Use `source-index-update` after structural code changes.
7. Use `context-pack-refresh` before ending a meaningful session.

## Safety Rules

- Do not guess hardware facts.
- Do not silently change GPIO, pin mapping, thresholds, power assumptions, state-machine semantics, network protocol, server address, credential storage, flash layout, or boot behavior.
- Unverified facts belong in `docs/ai_context/OPEN_QUESTIONS.md`.
- Verified facts belong in `docs/ai_context/PROJECT_STATE.md`.
- If a build, flash, serial monitor, or hardware test was not run, write `not actually run`.
- Initialization must not modify business code by default.

## What This Does Not Do

- It does not install toolchains.
- It does not provide firmware drivers.
- It does not replace hardware documentation.
- It does not guarantee that Codex can infer unavailable hardware facts.
- It does not make verification results valid unless commands or manual checks were actually performed.

## Suggested First Prompt After Initialization

```text
Use $embedded-project-relay to resume the project.

Read:
- AGENTS.md
- docs/ai_context/CONTEXT_PACK.md
- docs/ai_context/TASK_SPEC.md
- docs/ai_context/SOURCE_INDEX.md
- docs/ai_context/OPEN_QUESTIONS.md

Output the Skill Gate first. Do not modify code yet.
```

## License

Add a license before publishing if you want others to reuse or contribute to this workflow.
