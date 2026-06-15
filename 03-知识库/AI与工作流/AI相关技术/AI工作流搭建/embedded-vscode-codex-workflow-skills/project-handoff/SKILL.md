---
name: project-handoff
description: Resume or continue an initialized embedded project by reading persistent context and avoiding a full repository rescan. Use for new-window handoff, project continuation, or "read context first" requests.
---

# Project Handoff

## Goal

Resume the current project with minimal context. Identify the current stage, current task boundary, relevant files, and uncertainties before implementation.

## Hard Rule

If the implementation plan, hardware facts, networking, PCB, enclosure, verification setup, or demo requirement is uncertain, ask the user first or record the issue in `docs/ai_context/OPEN_QUESTIONS.md`.

## Required Reading

1. `AGENTS.md`
2. `docs/ai_context/CONTEXT_PACK.md`
3. `docs/ai_context/TASK_SPEC.md`
4. `docs/ai_context/SOURCE_INDEX.md`
5. `docs/ai_context/OPEN_QUESTIONS.md`

## Skill Gate

```text
Skill used: project-handoff
Reason:
Current task summary:
Current project stage:
Files that should be read:
Files not to touch:
Uncertainties to ask user:
Coding allowed now: yes/no
```

## Action Rules

- Read only files directly related to the current task after the required context files.
- Do not treat `OPEN_QUESTIONS.md` entries as facts.
- If context files are missing, stale, or contradictory, suggest `context-pack-refresh` or `source-index-update`.
- If the task is too broad, route to `task-spec-maker`.
- After handoff, state the smallest reasonable scope for this session.

