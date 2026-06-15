---
name: embedded-project-relay
description: Continue an initialized embedded VS Code Codex project by reading persistent context, setting task boundaries, surfacing uncertainties, and routing to the proper workflow skill. Use after the workflow initializer has created the project skeleton.
---

# Embedded Project Relay

## Goal

Let each Codex window resume an embedded project from repository memory, handle one small task, avoid full rescans, and avoid recording guesses as facts.

## Hard Rule

If implementation plan, hardware wiring, chip/board model, sensor model, GPIO, signal level, threshold, power supply, schematic, PCB, enclosure, network approach, server address, credential storage, flash layout, boot behavior, demo requirement, or verification path is uncertain, ask the user first or write it to `docs/ai_context/OPEN_QUESTIONS.md`.

Do not guess. Do not invent a plan to keep moving.

## First Read Order

Read first:

1. `AGENTS.md`
2. `docs/ai_context/CONTEXT_PACK.md`
3. `docs/ai_context/TASK_SPEC.md`
4. `docs/ai_context/SOURCE_INDEX.md`
5. `docs/ai_context/OPEN_QUESTIONS.md`
6. 5 to 8 files directly related to the current task

Avoid first:

- `.git/`
- build outputs
- generated files
- third-party dependencies
- large PDFs or datasheets unless the current task requires them
- unrelated documentation folders

## Skill Gate

Before each task, output:

```text
Skill used: embedded-project-relay
Reason:
Current step:
Task scope:
Files to read first:
Files not to touch:
Uncertainties to ask user:
Coding allowed now: yes/no
```

If `Uncertainties to ask user` is not empty, ask the user before implementation.

## Routing

- Use `project-handoff` when the user asks to resume, continue, hand off, or avoid rescanning.
- Use `task-spec-maker` when the next task is unclear or too broad.
- Use `source-index-update` after module additions, refactors, or structure changes.
- Use `evidence-debug` for embedded debugging, hardware behavior, serial logs, startup, GPIO, sensors, peripherals, interrupts, state machines, or build failures.
- Use `build-test-verify` after changes or when the user asks for build, flash, monitor, or manual verification.
- Use `context-pack-refresh` before ending a meaningful session.

## Single-Session Flow

1. Read context.
2. Output the Skill Gate.
3. List uncertainties.
4. Ask the user before work that depends on uncertain facts.
5. State what this session will and will not do.
6. Read only directly related files.
7. Propose the smallest useful change or documentation update.
8. Modify only files inside the approved task scope.
9. Run verification or provide manual verification steps.
10. Update or propose updates to relay context.

## Closeout Format

```md
## Session Result

Completed:
Not completed:

Verification:
New uncertainties:
Needs user confirmation:

Updated context:
Suggested next step:
```

