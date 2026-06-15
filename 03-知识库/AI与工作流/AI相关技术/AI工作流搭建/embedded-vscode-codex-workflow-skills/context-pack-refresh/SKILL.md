---
name: context-pack-refresh
description: End a Codex session by updating PROJECT_STATE.md, SESSION_LOG.md, OPEN_QUESTIONS.md, CONTEXT_PACK.md, and SOURCE_INDEX.md when needed so the next window can resume cleanly.
---

# Context Pack Refresh

## Goal

Compress the current session into persistent project context so the next Codex window can continue without rescanning the project.

## Hard Rule

Do not write unverified conclusions into `PROJECT_STATE.md`. Uncertain plans, hardware facts, environment gaps, and unrun verification must go into `OPEN_QUESTIONS.md` or `SESSION_LOG.md` with clear status.

## Required Closeout

Check and update:

- `docs/ai_context/PROJECT_STATE.md`
- `docs/ai_context/SESSION_LOG.md`
- `docs/ai_context/OPEN_QUESTIONS.md`
- `docs/ai_context/CONTEXT_PACK.md`
- `docs/ai_context/SOURCE_INDEX.md` if structure changed
- `docs/ai_context/VERIFY_GUIDE.md` if verification commands changed
- project roadmap or task list if one exists and the session changed it

## Writing Rules

- `PROJECT_STATE.md` contains only verified facts.
- `SESSION_LOG.md` records what was done, what changed, and how it was verified.
- `OPEN_QUESTIONS.md` records unresolved questions and unconfirmed assumptions.
- `CONTEXT_PACK.md` stays compressed and contains only what the next window must know.
- Do not copy large blocks of source code.
- Mark unrun checks as `not actually run`.

## Output Format

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

