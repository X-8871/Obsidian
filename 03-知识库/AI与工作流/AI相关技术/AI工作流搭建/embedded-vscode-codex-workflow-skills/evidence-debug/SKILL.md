---
name: evidence-debug
description: Debug embedded hardware, firmware, sensor, GPIO, I2C, SPI, UART, ADC, button, interrupt, display, state-machine, serial-log, build, flash, or startup issues using evidence-first investigation.
---

# Evidence Debug

## Goal

Collect evidence before changing code, then make the smallest useful fix or verification recommendation.

## Hard Rule

If hardware wiring, power, chip/board model, sensor model, GPIO, signal level, threshold, schematic detail, datasheet meaning, flash layout, boot behavior, or test setup is uncertain, ask the user first or write it to `docs/ai_context/OPEN_QUESTIONS.md`.

Do not substitute guesses for hardware confirmation.

## Debug Flow

1. State observed behavior and expected behavior.
2. Identify directly related files; read at most 5 to 8 files first.
3. Collect evidence: code, macros, configuration, build output, serial logs, measured behavior, documentation, or user confirmation.
4. List likely causes and mark evidence strength for each one.
5. Propose the smallest code change or manual verification step.
6. After changes, run a build or provide manual acceptance steps.
7. Write newly discovered uncertainties to `OPEN_QUESTIONS.md`.

## Common Priorities

- Do not let networking or optional integrations block local safety-critical behavior unless the project explicitly requires it.
- Do not make display, logging, cloud, or telemetry failures block the main embedded loop unless that is the confirmed design.
- Avoid repeated event logging for the same unchanged abnormal condition unless the requirements say otherwise.
- Prefer observable, reversible changes.

## Output Format

```md
Observed:
Expected:
Evidence:
Likely causes:
Judgment:
Minimal change:
Verification:
Unconfirmed issues:
```

