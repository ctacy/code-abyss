# Code Abyss

<div align="center">

*Persona-driven configuration system for Claude Code, Codex CLI, and Gemini CLI*

[![npm](https://img.shields.io/npm/v/code-abyss.svg)](https://www.npmjs.com/package/code-abyss)
[![CI](https://github.com/telagod/code-abyss/actions/workflows/ci.yml/badge.svg)](https://github.com/telagod/code-abyss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-blue.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)]()

[中文文档](docs/README.zh-CN.md)

</div>

Code Abyss installs a switchable persona + output style + engineering skill system into your AI coding CLI. One command configures persona rules, output styles, 21 domain skills, 6 slash commands, and 5 verification tools across Claude Code, Codex CLI, and Gemini CLI.

## Quick Start

```bash
npx code-abyss                          # Interactive menu
npx code-abyss --target claude -y       # One-line install to ~/.claude/
npx code-abyss --target codex -y        # One-line install to ~/.codex/
npx code-abyss --target gemini -y       # One-line install to ~/.gemini/
```

## What It Does

Code Abyss is a three-layer configuration system:

| Layer | What | Where |
|-------|------|-------|
| Persona | Character identity, rules, execution chains | `config/personas/*.md` + `config/CLAUDE.md` |
| Output Style | Tone, formatting, response structure | `output-styles/*.md` + `index.json` |
| Skills | Domain knowledge + executable verification tools | `skills/**/*.md` + `scripts/*.js` |

The installer generates target-specific artifacts for each CLI:

| Target | Config | Skills | Style |
|--------|--------|--------|-------|
| Claude | `~/.claude/CLAUDE.md` + `settings.json` | `~/.claude/commands/*.md` + `~/.claude/skills/` | `settings.json.outputStyle` |
| Codex | `~/.codex/config.toml` + `AGENTS.md` | `~/.codex/skills/` | `~/.codex/AGENTS.md` |
| Gemini | `~/.gemini/GEMINI.md` + `settings.json` | `~/.gemini/commands/*.toml` + `~/.gemini/skills/` | `GEMINI.md` |

## Personas

5 switchable personas, each with a distinct character and interaction style:

| Slug | Name | Style |
|------|------|-------|
| `abyss` (default) | 邪修红尘仙 | Direct, security-first, no-nonsense |
| `scholar` | 文言小生 | Classical, methodical, scholarly |
| `elder-sister` | 知性大姐姐 | Warm, insightful, guiding |
| `junior-sister` | 古怪精灵小师妹 | Playful, sharp, energetic |
| `iron-dad` | 铁壁暖阳 | Firm, protective, structured |

Switch persona during install:

```bash
npx code-abyss --target claude --persona elder-sister -y
```

## Output Styles

5 output styles control tone and response formatting:

| Slug | Name | Best For |
|------|------|----------|
| `abyss-cultivator` (default) | 宿命深渊 | Immersive, high-tension delivery |
| `scholar-classic` | 墨渊书阁 | Formal, structured analysis |
| `elder-sister-gentle` | 星霜雅筑 | Gentle, step-by-step guidance |
| `junior-sister-spark` | 灵犀洞天 | Fast-paced, playful interaction |
| `iron-dad-warm` | 钢铁柔情 | Decisive, warm mentoring |

Switch style during install:

```bash
npx code-abyss --target claude --style scholar-classic -y
npx code-abyss --list-styles    # List all available styles
```

## Skills

21 skills across 14 domains, driven by `SKILL.md` frontmatter as single source of truth.

### Slash Commands (user-invocable)

| Command | Function |
|---------|----------|
| `/verify-security` | Scan code for security vulnerabilities and dangerous patterns |
| `/verify-module` | Check directory structure and documentation completeness |
| `/verify-change` | Analyze git changes, detect doc sync issues |
| `/verify-quality` | Detect complexity, naming, code quality issues |
| `/gen-docs` | Generate README.md and DESIGN.md scaffolds |
| `/frontend-design` | UI aesthetics, component patterns, UX guidance |

### Domain Knowledge (auto-loaded by context)

| Domain | Coverage |
|--------|----------|
| Security | Penetration testing, code audit, defense engineering, threat intelligence, vulnerability research |
| Architecture | API design, cloud-native, security architecture, messaging, caching |
| Development | Python, TypeScript, Go, Rust, Java, C++, Shell |
| DevOps | Git workflow, testing, database, observability, performance, cost optimization |
| Frontend | Component patterns, state management, UI aesthetics, 4 design system variants |
| Mobile | iOS/SwiftUI, Android/Compose, React Native, Flutter |
| AI | Agent development, LLM security, RAG systems, prompt engineering |
| Data Engineering | Pipeline orchestration, stream processing, data quality |
| Infrastructure | Kubernetes, GitOps, IaC (Terraform/Pulumi/CDK) |
| Orchestration | Multi-agent task decomposition and parallel coordination |

## Install Layout

```
~/.claude/                          ~/.codex/
├── CLAUDE.md        (persona)      ├── AGENTS.md       (persona + style)
├── output-styles/   (style files)  ├── instruction.md   (core instructions)
├── commands/*.md    (slash cmds)   ├── skills/          (domain skills)
├── skills/          (domain skills)├── bin/lib/          (runtime libs)
├── bin/lib/         (runtime libs) ├── config.toml      (recommended config)
├── settings.json    (config)       └── .sage-uninstall.js
└── .sage-uninstall.js
~/.gemini/
├── GEMINI.md        (persona + style)
├── commands/*.toml  (commands)
├── skills/          (domain skills)
├── settings.json    (config)
└── .sage-uninstall.js
```

All installed files are tracked in `.sage-backup/manifest.json`. Uninstall restores previous state.

## CLI Reference

```bash
# Install
npx code-abyss --target <claude|codex|gemini> [-y]
npx code-abyss --target claude --style <slug> --persona <slug> -y

# Uninstall
npx code-abyss --uninstall <claude|codex|gemini>

# Info
npx code-abyss --list-styles
npx code-abyss --help

# Verification tools (run directly)
node skills/tools/verify-security/scripts/security_scanner.js <path>
node skills/tools/verify-module/scripts/module_scanner.js <path>
node skills/tools/verify-change/scripts/change_analyzer.js --mode staged
node skills/tools/verify-quality/scripts/quality_checker.js <path>
node skills/tools/gen-docs/scripts/doc_generator.js <path>
```

## Pack System

Code Abyss supports installable packs for extending functionality per target CLI.

- `packs/abyss/manifest.json` — core pack: persona, styles, skills, runtime libs
- `packs/gstack/manifest.json` — optional pinned upstream gstack runtime (installed only when declared in `packs.lock`)
- `.code-abyss/packs.lock.json` — project-level pack declarations with `required`/`optional`/`sources`

Pack management:

```bash
node bin/packs.js bootstrap              # Initialize packs.lock
node bin/packs.js bootstrap --apply-docs # Write pack docs into README/CONTRIBUTING
node bin/packs.js diff                   # Show lock vs template drift
node bin/packs.js vendor-pull <pack>     # Pull upstream into .code-abyss/vendor/
node bin/packs.js vendor-sync --check    # CI gate: verify vendor integrity
node bin/packs.js report summary         # View install reports
node bin/packs.js uninstall <pack>       # Remove pack artifacts
```

## Skill Registry

`skills/**/SKILL.md` frontmatter is the single source of truth. The shared registry (`bin/lib/skill-registry.js`) normalizes metadata and feeds it to the installer and runtime.

Required frontmatter:

```yaml
---
name: verify-quality          # kebab-case, unique
description: Code quality gate
user-invocable: true           # false = knowledge-only
allowed-tools: Bash, Read, Glob  # optional, default: Read
argument-hint: <path>          # optional
---
```

Generation chain:

1. Registry scans and validates all `skills/**/SKILL.md`
2. Filters `user-invocable: true` for command generation
3. Claude: renders `~/.claude/commands/*.md`
4. Codex: installs to `~/.codex/skills/`, discovered directly
5. Gemini: renders `~/.gemini/commands/*.toml`
6. Scripted skills execute via `skills/run_skill.js` (lock + spawn + exit code passthrough)
7. Knowledge skills load `SKILL.md` content directly

## Development

```bash
npm test                          # Jest test suite (218 tests)
npm run verify:skills             # Validate SKILL.md frontmatter contracts
node bin/install.js --help        # Installer CLI help
```

CI runs on Node 18/20/22 across Linux, macOS, and Windows:

- Unit tests + skill contract validation
- 4 verification tools (security, module, quality, change)
- Smoke install/uninstall for all 3 targets on all 3 platforms

## Uninstall

```bash
npx code-abyss --uninstall claude
npx code-abyss --uninstall codex
npx code-abyss --uninstall gemini
```

Backup script alternative:

```bash
node ~/.claude/.sage-uninstall.js
node ~/.codex/.sage-uninstall.js
node ~/.gemini/.sage-uninstall.js
```

Restores backed-up configuration and removes all installed files.

## License

[MIT](LICENSE)
