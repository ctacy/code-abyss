# Code Abyss

<div align="center">

**Give your AI coding agent a personality, a methodology, and 22 engineering skills.**

[![npm](https://img.shields.io/npm/v/code-abyss.svg)](https://www.npmjs.com/package/code-abyss)
[![CI](https://github.com/telagod/code-abyss/actions/workflows/ci.yml/badge.svg)](https://github.com/telagod/code-abyss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[中文文档](docs/README.zh-CN.md) · [Tech Persona Card Spec](docs/specs/tech-persona-card-v1.0.md) · [Changelog](CHANGELOG.md)

</div>

---

Most AI coding agents have no memory of *who they are*. They respond in the same flat tone whether they're debugging a race condition, reviewing architecture, or triaging a P0 incident. Code Abyss changes that.

One command installs a composable **persona + style + skills** system into Claude Code, Codex CLI, Gemini CLI, or OpenClaw. Your agent gets a consistent character, structured execution chains, and domain expertise across sessions.

```bash
npx code-abyss --target claude -y
```

Or install as a Claude Code Plugin:

```bash
claude plugin install code-abyss
```

## How It Works

Code Abyss is built on three composable layers:

- **Identity** — who the agent is. Role anchoring, personality traits, emotional patterns, scenario scripts. Each persona is a distinct character with consistent behavior across sessions.

- **Shared Behavior** — how the agent works. Iron laws (never fabricate, always verify, close the loop), execution chains for different task types, proactive assistance protocol, skill routing. These rules apply to every persona.

- **Output Style** — how the agent speaks. Report skeletons, section headers, progress formatting, tone calibration. Styles use `{{self}}`/`{{user}}` template variables, so any persona can wear any style without conflicts.

Any of the 5 personas can be combined with any of the 5 styles — 25 combinations, all validated, zero naming collisions.

## Personas

| | Name | Character |
|---|------|-----------|
| 🗡 | **邪修红尘仙** `abyss` | Security-first dark cultivator. Direct, decisive, closes every loop. |
| 📜 | **文言小生** `scholar` | Literary Chinese scholar. Treats code as poetry, debugging as puzzle-solving. |
| 💫 | **知性大姐姐** `elder-sister` | Warm mentor. Wraps sharp judgment in genuine care. Guides through questions. |
| ⚡ | **古怪精灵小师妹** `junior-sister` | Hyperactive bug hunter. Roasts bad code, then silently fixes it. |
| 💪 | **铁壁暖阳** `iron-dad` | Dependable big brother. Absorbs pressure, radiates warmth. Dad-joke equipped. |

```bash
npx code-abyss --target claude --persona elder-sister --style scholar-classic -y
```

## Skills

22 domain skills, flat structure, [agentskills.io](https://agentskills.io/specification) aligned. Skills are loaded automatically by context — the agent reads the right knowledge at the right time without you asking.

**Security** — pentesting, code audit, red/blue/purple team, threat intel, vulnerability research, 12 Coff0xc defensive extensions  
**Architecture** — API design, cloud-native, messaging, caching, security architecture  
**Development** — Python, TypeScript, Go, Rust, Java, C++, Shell  
**DevOps** — Git workflow, testing, databases, observability, performance  
**AI/ML** — agent development, LLM security, RAG, prompt engineering  
**Frontend** — 4 design systems (glassmorphism, liquid-glass, neubrutalism, claymorphism)  
**Office** — Word, PDF, PowerPoint, Excel with OOXML-level automation  
**Infrastructure** — Kubernetes, GitOps, IaC · **Mobile** — iOS, Android, React Native, Flutter  
**Data** — pipelines, streaming, quality · **Orchestration** — multi-agent coordination

Five verification tools run as executable scripts for CI or manual use:

```bash
node skills/analyzing-security/scripts/security_scanner.js .
node skills/checking-code-quality/scripts/quality_checker.js .
node skills/analyzing-changes/scripts/change_analyzer.js --mode staged
```

## Installation

### Supported Targets

| Target | Command | What Gets Installed |
|--------|---------|---------------------|
| Claude Code | `npx code-abyss -t claude -y` | `CLAUDE.md` + skills + output styles + settings |
| Codex CLI | `npx code-abyss -t codex -y` | `AGENTS.md` + skills + config.toml |
| Gemini CLI | `npx code-abyss -t gemini -y` | `GEMINI.md` + skills + commands |
| OpenClaw | `npx code-abyss -t openclaw -y` | Skills + workspace AGENTS.md/SOUL.md |

```bash
npx code-abyss                 # Interactive menu — pick target, persona, style
npx code-abyss --list-styles   # Browse available styles
npx code-abyss --uninstall claude  # Clean removal, restores backups
```

All installed files are tracked in `.code-abyss-backup/manifest.json`. Uninstall restores your previous configuration.

### Upgrading from v2.x

```bash
npx code-abyss --uninstall claude     # Remove v2.x artifacts first
npx code-abyss@3 --target claude -y   # Install v3.0.0
```

## Tech Persona Card

Code Abyss introduces the **[Tech Persona Card v1.0](docs/specs/tech-persona-card-v1.0.md)** — a portable format for AI agent persona interchange. Think Character Card V2, but for engineering workflows instead of roleplay.

Each persona ships as a `persona-card.json` with structured voice, capabilities, scenarios, and three-layer content references. Convert between formats:

```javascript
const { toCharaCardV2, toGPTInstructions } = require('code-abyss/bin/lib/persona-converter');

// → Character Card V2 (SillyTavern / Chub.ai compatible)
const cc = toCharaCardV2(card, { identityContent, behaviorContent, styleContent });

// → OpenAI Custom GPT Instructions
const gpt = toGPTInstructions(card, { identityContent });
```

[Specification](docs/specs/tech-persona-card-v1.0.md) · [JSON Schema](docs/specs/persona-card.schema.json) · [Example Cards](config/personas/)

## Contributing

```bash
git clone https://github.com/telagod/code-abyss && cd code-abyss
npm install
npm test                    # 375 tests
npm run verify:skills       # Validate 22 skill contracts
```

Adding a skill: create `skills/<gerund-name>/SKILL.md` with [frontmatter](https://agentskills.io/specification), optionally add `scripts/` for executable tools. Run `npm run verify:skills` to validate.

## License

[MIT](LICENSE). The Coff0xc Security Extensions include adapted Apache-2.0 material; see [NOTICE](NOTICE.coff0xc-security.md).
