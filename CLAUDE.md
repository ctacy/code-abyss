# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Code Abyss is an npm CLI package that injects personalized persona configurations and 56 security engineering skill documents into Claude Code and Codex CLI. It installs to `~/.claude/` or `~/.codex/` via `npx code-abyss-sc`.

## Commands

```bash
# Run all tests (Jest, 8 suites, ~108 cases)
npm test

# Run a single test file
npm test -- install.test.js

# Coverage report
npm test -- --coverage

# CI also runs these quality gates:
node skills/tools/verify-quality/scripts/quality_checker.js .
node skills/tools/verify-security/scripts/security_scanner.js .
```

No build step — pure Node.js, no transpilation.

## Architecture

### Three-Layer Design

| Layer | Files | Purpose |
|-------|-------|---------|
| Identity & Rules | `config/CLAUDE.md` | Persona, rules, execution chains |
| Output Style | `output-styles/abyss-cultivator.md` | Tone, tags, report templates |
| Technical Knowledge | `skills/domains/**/*.md` | 56 skill documents across 11 domains |
| Merged (Codex) | `config/AGENTS.md` | CLAUDE.md + output-style combined |

### Installer Architecture (Adapter Pattern)

```
bin/install.js          — Orchestrator: CLI args, menu, backup/restore, copy flow
bin/adapters/claude.js  — Claude-specific: auth detection, settings merge, ccline
bin/adapters/codex.js   — Codex-specific: auth detection, config.toml template
bin/lib/utils.js        — Shared: copyRecursive, deepMergeNew, rmSafe, shouldSkip
bin/lib/ccline.js       — ccline status bar integration
```

Key design: `getClaudeCoreFiles()` and `getCodexCoreFiles()` return file mappings. The orchestrator never hardcodes target-specific details.

### Skill Tools

```
skills/run_skill.js           — Cross-platform runner with file locking
skills/tools/lib/shared.js    — Shared: parseCliArgs, buildReport, countBySeverity, hasFatal
skills/tools/verify-security/ — Security vulnerability scanner
skills/tools/verify-module/   — Module structure & doc completeness
skills/tools/verify-change/   — Git change analysis & doc sync
skills/tools/verify-quality/  — Complexity, naming, code quality
skills/tools/gen-docs/        — README/DESIGN skeleton generator
```

## Code Conventions

- Node.js ≥18, no transpilation, pure ESM-style CommonJS (`require`/`module.exports`)
- Production dependency: only `@inquirer/prompts`; dev: only `jest`
- Functions: complexity <10, <50 lines. Files: <500 lines
- Core test coverage target: >80%
- CI matrix: Node 18, 20, 22 on ubuntu-latest
- Auth detection priority chains differ per adapter — read the adapter before modifying
- `deepMergeNew` in utils.js does non-destructive merge (existing keys preserved, missing keys added)
- `shouldSkip` filters out `__pycache__`, `.git`, etc. during recursive copy
- Skill scripts are discovered dynamically via `skills/tools/*/scripts/*.js` pattern
