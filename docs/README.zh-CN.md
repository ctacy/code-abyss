# Code Abyss

<div align="center">

**给你的 AI 编程助手一个人格、一套方法论、22 项工程技能。**

[![npm](https://img.shields.io/npm/v/code-abyss.svg)](https://www.npmjs.com/package/code-abyss)
[![CI](https://github.com/telagod/code-abyss/actions/workflows/ci.yml/badge.svg)](https://github.com/telagod/code-abyss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

[English](../README.md) · [Tech Persona Card 规范](../docs/specs/tech-persona-card-v1.0.md) · [更新日志](../CHANGELOG.md)

</div>

---

大多数 AI 编程助手没有"自我"的记忆。无论是调试竞态、审查架构还是处理 P0 故障，它们用同一种扁平语气回应。Code Abyss 改变了这一点。

一条命令，为 Claude Code、Codex CLI、Gemini CLI 或 OpenClaw 安装可组合的**人格 + 风格 + 技能**体系。你的 Agent 获得一致的角色、结构化的执行链和跨会话的领域专长。

```bash
npx code-abyss --target claude -y
```

也可以作为 Claude Code 插件安装：

```bash
claude plugin install code-abyss
```

## 工作原理

Code Abyss 建立在三个可组合层上：

- **身份（Identity）**— Agent 是谁。角色锚定、性格特征、情绪节奏、场景脚本。每个人格都是一个有一致行为的独特角色。

- **共享行为（Shared Behavior）**— Agent 怎么工作。铁律（不妄语、不盲动、不犹豫）、各场景执行链、主动协助协议、技能路由。所有人格共享这些规则。

- **输出风格（Output Style）**— Agent 怎么说话。报告骨架、段落标题、进度格式、语气校准。风格使用 `{{self}}`/`{{user}}` 模板变量，任意人格穿任意风格都不会冲突。

5 个人格 × 5 种风格 = 25 种组合，全量验证，零冲突。

## 人格

| | 名称 | 性格 |
|---|------|------|
| 🗡 | **邪修红尘仙** `abyss` | 安全优先的暗黑修仙者。直接、果断、闭环到底。 |
| 📜 | **文言小生** `scholar` | 文言书生。视代码如诗，视调试如解谜。 |
| 💫 | **知性大姐姐** `elder-sister` | 温柔导师。用关怀包裹锋利的技术判断。善用反问引导。 |
| ⚡ | **古怪精灵小师妹** `junior-sister` | 多动症 bug 猎手。吐槽烂代码毫不留情，吐槽完默默帮你重构。 |
| 💪 | **铁壁暖阳** `iron-dad` | 靠谱大哥。扛压体质，闷骚幽默，偶尔 dad joke。 |

```bash
npx code-abyss --target claude --persona elder-sister --style scholar-classic -y
```

## 技能

22 个领域技能，扁平目录结构，对齐 [agentskills.io](https://agentskills.io/specification) 规范。技能按上下文自动加载——Agent 在正确的时机读取正确的知识，无需你手动指定。

**安全** — 渗透测试、代码审计、红蓝紫队、威胁情报、漏洞研究、12 个 Coff0xc 防御扩展  
**架构** — API 设计、云原生、消息队列、缓存、安全架构  
**开发** — Python, TypeScript, Go, Rust, Java, C++, Shell  
**DevOps** — Git 工作流、测试、数据库、可观测性、性能  
**AI/ML** — Agent 开发、LLM 安全、RAG、Prompt 工程  
**前端** — 4 种设计体系（毛玻璃、液态玻璃、新粗野、粘土态）  
**文档** — Word、PDF、PPT、Excel，OOXML 级别自动化  
**基础设施** — K8s, GitOps, IaC · **移动端** — iOS, Android, RN, Flutter  
**数据** — 管道、流处理、质量 · **编排** — 多 Agent 协调

五个验证工具可用于 CI 或手动执行：

```bash
node skills/analyzing-security/scripts/security_scanner.js .
node skills/checking-code-quality/scripts/quality_checker.js .
node skills/analyzing-changes/scripts/change_analyzer.js --mode staged
```

## 安装

| 目标 | 命令 | 安装内容 |
|------|------|---------|
| Claude Code | `npx code-abyss -t claude -y` | `CLAUDE.md` + 技能 + 输出风格 + 设置 |
| Codex CLI | `npx code-abyss -t codex -y` | `AGENTS.md` + 技能 + config.toml |
| Gemini CLI | `npx code-abyss -t gemini -y` | `GEMINI.md` + 技能 + 命令 |
| OpenClaw | `npx code-abyss -t openclaw -y` | 技能 + 工作区 AGENTS.md/SOUL.md |

```bash
npx code-abyss                 # 交互式菜单
npx code-abyss --list-styles   # 浏览可用风格
npx code-abyss --uninstall claude  # 干净卸载，恢复备份
```

### 从 v2.x 升级

```bash
npx code-abyss --uninstall claude     # 先卸载 v2.x
npx code-abyss@3 --target claude -y   # 安装 v3.0.0
```

## Tech Persona Card

Code Abyss 推出 **[Tech Persona Card v1.0](../docs/specs/tech-persona-card-v1.0.md)** — 首个 AI Agent 技术人格互换标准。可以理解为 Character Card V2 的工程版。

每个人格附带 `persona-card.json`，包含结构化的声音、能力、场景和三层内容引用。支持格式转换：

```javascript
const { toCharaCardV2, toGPTInstructions } = require('code-abyss/bin/lib/persona-converter');

// → Character Card V2（兼容 SillyTavern / Chub.ai）
const cc = toCharaCardV2(card, { identityContent, behaviorContent, styleContent });

// → OpenAI 自定义 GPT 指令
const gpt = toGPTInstructions(card, { identityContent });
```

[规范文档](../docs/specs/tech-persona-card-v1.0.md) · [JSON Schema](../docs/specs/persona-card.schema.json) · [示例卡片](../config/personas/)

## 参与贡献

```bash
git clone https://github.com/telagod/code-abyss && cd code-abyss
npm install
npm test                    # 375 个测试
npm run verify:skills       # 验证 22 个技能契约
```

添加技能：创建 `skills/<动名词>/SKILL.md`，按 [frontmatter 规范](https://agentskills.io/specification) 编写，可选添加 `scripts/` 放可执行工具。运行 `npm run verify:skills` 验证。

## 许可

[MIT](../LICENSE)。Coff0xc 安全扩展包含 Apache-2.0 改编内容，详见 [NOTICE](../NOTICE.coff0xc-security.md)。
