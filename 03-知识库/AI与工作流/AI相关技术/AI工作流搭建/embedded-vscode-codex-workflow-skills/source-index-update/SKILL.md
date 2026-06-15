---
name: source-index-update
description: Update SOURCE_INDEX.md for an embedded project. Maintain code map, entry points, module responsibilities, key functions, build configuration, hardware-related files, and high-risk files.
---

# Source Index Update

## Goal

Maintain `docs/ai_context/SOURCE_INDEX.md` so future Codex windows can understand the repository without randomly scanning the whole project.

## Hard Rule

Do not record module responsibilities or hardware behavior as facts without evidence. If hardware wiring, thresholds, state semantics, protocol behavior, or build configuration is uncertain, ask the user or write the issue to `OPEN_QUESTIONS.md`.

## Scan Scope

Prefer evidence from:

- firmware entry points
- application modules
- driver or board-support modules
- middleware modules
- build files such as `CMakeLists.txt`, `Makefile`, `platformio.ini`, `idf_component.yml`, `sdkconfig.defaults`
- `.vscode/tasks.json` or project scripts when relevant
- requirement, roadmap, hardware, pin, or verification documents

Avoid:

- `.git/`
- build outputs
- generated files
- dependency directories
- large binaries
- large PDFs unless the current task needs them

## Update Content

Update `SOURCE_INDEX.md` with:

- entry points
- module responsibilities
- key functions
- call relationships
- build and configuration files
- hardware-related files
- high-risk files
- files that should not be casually modified
- newly discovered uncertainties

## Evidence Requirement

Every responsibility statement must be traceable to at least one file path, function name, macro/configuration item, build file, roadmap item, pin table, datasheet/manual reference, serial log, or user confirmation.

