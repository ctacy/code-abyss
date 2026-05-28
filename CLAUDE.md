# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Code Abyss is an npm package that installs persona configuration plus proactive execution guidance into Claude Code, Codex CLI, Gemini CLI, and OpenClaw. It delivers: 6 switchable personas, 10 switchable output styles, 24 engineering skills (4 security domains), and 5 executable verification tools. Default persona is **abyss** (security-first dark cultivator).

## Commands

```bash
npm test                          # Run full Jest suite
npm run verify:skills             # Validate SKILL.md frontmatter contracts (fail-fast)
node bin/install.js --help        # Installer CLI help
node bin/install.js --target claude -y    # Install to ~/.claude/
node bin/install.js --target codex -y      # Install to ~/.codex/
node bin/install.js --target gemini -y     # Install to ~/.gemini/
node bin/install.js --target openclaw -y # Install to ~/.openclaw/
node bin/install.js --list-styles          # List available output styles
```

Running a single test file:
```bash
npx jest test/install-registry.test.js --runInBand
```

Running verify tools directly:
```bash
node skills/analyzing-security/scripts/security_scanner.js <path>
node skills/verifying-modules/scripts/module_scanner.js <path>
node skills/analyzing-changes/scripts/change_analyzer.js --mode staged|working
node skills/checking-code-quality/scripts/quality_checker.js <path>
node skills/generating-docs/scripts/doc_generator.js <path>
```

CI runs on Node 18/20/22: `npm ci && npm test && npm run verify:skills` plus smoke install/uninstall across all targets.

## Architecture

### Three-Layer Composition

All runtime guidance files (CLAUDE.md, GEMINI.md, instruction.md, SOUL.md) are assembled from:
- **Identity**: `config/personas/<slug>.md` — persona-specific voice/self/user/language
- **Shared Behavior**: `config/personas/_shared/*.md` — iron laws, execution chains, skill routing
- **Output Style**: `output-styles/<slug>.md` — template with `{{self}}`/`{{user}}`/`{{language}}` vars

The composition function `renderRuntimeGuidance()` in `bin/lib/style-registry.js` merges these three layers. If `config/CLAUDE.local.md` exists, it is appended as a local overlay (useful for per-machine customizations that survive upstream updates).

### Skill Registry

`bin/lib/skill-registry.js` is the single source of truth for skill discovery:
- Each skill has metadata in `skills/<category>/<name>/SKILL.md` YAML frontmatter
- Required fields: `name` (kebab), `description`, `user-invocable`
- `category` auto-inferred from directory prefix (domains/orchestration/tools)
- `runtimeType` auto-inferred: `scripts/` has exactly one `.js` → `scripted`, else `knowledge`
- Registry fail-fast validates: missing fields, bad slugs, duplicate names, multiple script entries

### Pack System

`packs/*/manifest.json` defines installable packs. `bin/lib/pack-registry.js` is the authoritative source for host file mappings and upstream metadata.

Project-level pack sync driven by `.code-abyss/packs.lock.json`. Installer reads the nearest lock file upward and installs according to `required`/`optional`/`optional_policy`/`sources`.

### Vendor Providers

`bin/lib/vendor-providers/` provides three sync strategies:
- `git`: clone from repo at specific commit
- `local-dir`: copy from local directory path
- `archive`: extract from .tgz/.zip archive

### Adapter Pattern

`bin/install.js` is the orchestration layer. Target-specific logic in adapters:
- `bin/adapters/claude.js` — auth detection, settings merge, ccstatusline integration
- `bin/adapters/codex.js` — auth detection, config.toml merge
- `bin/adapters/gemini.js` — settings.json generation
- `bin/adapters/openclaw.js` — workspace resolution, AGENTS.md/SOUL.md generation

### Skill Execution

`skills/run_skill.js` for scripted skills:
1. Resolve skill via registry → validate `runtimeType=scripted`
2. Acquire target lock (async polling, 30s timeout)
3. Spawn child process with script entry
4. Propagate exit code, release lock on exit/signal

Knowledge-type skills are read-only — load SKILL.md content directly.

### ccstatusline Integration

Status bar uses `ccline` command (user's local binary). Deploy only on first install; existing `~/.config/ccstatusline/settings.json` is preserved on subsequent installs.

## Key Contracts

### SKILL.md Frontmatter

```yaml
---
name: verify-quality          # kebab-case, unique across all skills
description: Code quality gate
user-invocable: false        # true = explicit command; false = knowledge-only
allowed-tools: Bash, Read, Glob  # optional, default: Read
argument-hint: <scan-path>    # optional
aliases: vq                  # optional comma-separated aliases
---
```

### Adding a New Skill

1. Create `skills/<category>/<name>/SKILL.md` with required frontmatter
2. For script-type: add exactly one `scripts/<name>.js` entry point
3. Run `npm run verify:skills` — must pass
4. Run `npm test` — especially `test/install-registry.test.js`, `test/run-skill.test.js`
5. Verify no name collision

### Style Contract

- Exactly one entry in `output-styles/index.json` must have `default: true`
- `slug` must be kebab-case, unique
- Corresponding `.md` file must exist in `output-styles/`

## Install Targets

| Target | Config file | Guidance file | Style mechanism |
|--------|-------------|---------------|-----------------|
| Claude | `~/.claude/settings.json` | `~/.claude/CLAUDE.md` | `settings.json.outputStyle` |
| Codex | `~/.codex/config.toml` | `~/.codex/instruction.md` | `model_instructions_file` |
| Gemini | `~/.gemini/settings.json` | `~/.gemini/GEMINI.md` | Global context + TOML commands |
| OpenClaw | `~/.openclaw/openclaw.json` | `<workspace>/SOUL.md` | SOUL.md persona + style |

Backups go to `<target-dir>/.code-abyss-backup/` with `manifest.json`. Uninstall restores from backup.
