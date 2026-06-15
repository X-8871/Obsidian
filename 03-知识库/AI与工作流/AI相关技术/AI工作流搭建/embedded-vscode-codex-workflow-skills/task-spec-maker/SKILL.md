---
name: task-spec-maker
description: Create the next small embedded-project task from project state, roadmap, open questions, and source index. Update TASK_SPEC.md with exact scope, files, uncertainties, and verification method.
---

# Task Spec Maker

## Goal

Turn a broad embedded project goal into one small, verifiable task that can fit in the current Codex window.

## Hard Rule

If the next implementation step depends on uncertain hardware, environment, protocol, safety, demo, or verification facts, ask the user first. Do not independently choose hardware changes, network protocols, credential storage, flash behavior, or acceptance criteria without evidence.

## Inputs

Read first:

1. `docs/ai_context/PROJECT_STATE.md`
2. `docs/ai_context/OPEN_QUESTIONS.md`
3. `docs/ai_context/CONTEXT_PACK.md`
4. `docs/ai_context/SOURCE_INDEX.md`
5. project roadmap or requirement document if one exists

## Output To `docs/ai_context/TASK_SPEC.md`

Use this stable structure:

```md
# Task Spec

## Current Task

## This Session Will Do

## This Session Will Not Do

## Files To Read First

## Files Not To Touch

## Uncertainties

## Verification Method

## Suggested Next Step
```

## Task Splitting Rules

- Do one verifiable task per session.
- Prefer a small task with clear evidence over a large task with vague completion criteria.
- Do not combine feature work, refactor, hardware change, and documentation cleanup in one task unless the user explicitly asks.
- If build or hardware verification is not possible, define manual verification steps.
- If the current task cannot be safely defined, write the blocker to `OPEN_QUESTIONS.md` and ask the user.

