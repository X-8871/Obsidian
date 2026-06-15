---
name: build-test-verify
description: Build, flash, monitor, manually verify, and record validation for an embedded VS Code Codex project. Use after code changes or when the user asks for reproducible verification.
---

# Build Test Verify

## Goal

Verify changes in a reproducible way, or provide clear manual verification steps when hardware validation is not available.

## Hard Rule

Do not fabricate verification results. If a command, flash operation, serial monitor, or hardware check was not actually run, write `not actually run`.

If the build command, flash port, hardware behavior, expected log, or networking target is uncertain, ask the user first or record the gap in `OPEN_QUESTIONS.md`.

## Inputs

Read:

1. `docs/ai_context/TASK_SPEC.md`
2. `docs/ai_context/PROJECT_STATE.md`
3. `docs/ai_context/VERIFY_GUIDE.md`
4. directly relevant build or verification files

## Verification Sources

Use commands or evidence from:

- user confirmation
- `README.md`
- `docs/ai_context/VERIFY_GUIDE.md`
- `.vscode/tasks.json`
- `CMakeLists.txt`
- `Makefile`
- `platformio.ini`
- project scripts
- prior `SESSION_LOG.md`

## Verification Report

Use this format:

```md
## Verification

Build:
- Command:
- Result:
- Evidence:

Flash:
- Command:
- Result:
- Evidence:

Monitor:
- Command:
- Result:
- Evidence:

Manual checks:
- Check:
- Expected:
- Result:

Not actually run:
- Item:
- Reason:

Next verification step:
```

## When Verification Cannot Be Run

Use:

```text
This session did not actually run verification. Reason:
Suggested manual verification steps:
Expected behavior:
Check first on failure:
```

