# Code Abyss

<div align="center">

*为 Claude Code / Codex CLI / Gemini CLI 打造的人格驱动配置系统*

[![npm](https://img.shields.io/npm/v/code-abyss.svg)](https://www.npmjs.com/package/code-abyss)
[![CI](https://github.com/telagod/code-abyss/actions/workflows/ci.yml/badge.svg)](https://github.com/telagod/code-abyss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-blue.svg)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)]()

</div>

Code Abyss 为你的 AI 编程 CLI 注入可切换的人格 + 输出风格 + 工程技能体系。一条命令即可配置人格规则、输出风格、21 个领域技能、6 个斜杠命令和 5 个校验工具，覆盖 Claude Code、Codex CLI 和 Gemini CLI 三端。

## 快速开始

```bash
npx code-abyss                          # 交互式菜单
npx code-abyss --target claude -y       # 一键安装到 ~/.claude/
npx code-abyss --target codex -y        # 一键安装到 ~/.codex/
npx code-abyss --target gemini -y       # 一键安装到 ~/.gemini/
```

## 功能概述

Code Abyss 是一个三层配置系统：

| 层级 | 内容 | 位置 |
|------|------|------|
| 人格 | 角色身份、规则、执行链 | `config/personas/*.md` + `config/CLAUDE.md` |
| 输出风格 | 语气、格式、回复结构 | `output-styles/*.md` + `index.json` |
| 技能 | 领域知识 + 可执行校验工具 | `skills/**/*.md` + `scripts/*.js` |

安装器为每个 CLI 生成对应的产物：

| 目标 | 配置 | 技能 | 风格 |
|------|------|------|------|
| Claude | `~/.claude/CLAUDE.md` + `settings.json` | `~/.claude/commands/*.md` + `~/.claude/skills/` | `settings.json.outputStyle` |
| Codex | `~/.codex/config.toml` + `AGENTS.md` | `~/.codex/skills/` | `~/.codex/AGENTS.md` |
| Gemini | `~/.gemini/GEMINI.md` + `settings.json` | `~/.gemini/commands/*.toml` + `~/.gemini/skills/` | `GEMINI.md` |

## 人格系统

5 个可切换人格，各有独特的性格和交互风格：

| 标识 | 名称 | 风格特点 |
|------|------|----------|
| `abyss`（默认） | 邪修红尘仙 | 直接、安全优先、不废话 |
| `scholar` | 文言小生 | 古典、严谨、学者气质 |
| `elder-sister` | 知性大姐姐 | 温柔、洞察、引导式 |
| `junior-sister` | 古怪精灵小师妹 | 活泼、敏锐、跳脱 |
| `iron-dad` | 铁壁暖阳 | 果断、温暖、结构化 |

安装时切换人格：

```bash
npx code-abyss --target claude --persona elder-sister -y
```

## 输出风格

5 个输出风格控制语气和回复格式：

| 标识 | 名称 | 适用场景 |
|------|------|----------|
| `abyss-cultivator`（默认） | 宿命深渊 | 沉浸式、高张力输出 |
| `scholar-classic` | 墨渊书阁 | 正式、结构化分析 |
| `elder-sister-gentle` | 星霜雅筑 | 温柔、循序渐进引导 |
| `junior-sister-spark` | 灵犀洞天 | 快节奏、活泼互动 |
| `iron-dad-warm` | 钢铁柔情 | 果断、温暖指导 |

安装时切换风格：

```bash
npx code-abyss --target claude --style scholar-classic -y
npx code-abyss --list-styles    # 列出所有可用风格
```

## 技能体系

21 个技能覆盖 14 个领域，以 `SKILL.md` frontmatter 为单一事实源。

### 斜杠命令（可直接调用）

| 命令 | 功能 |
|------|------|
| `/verify-security` | 扫描代码安全漏洞和危险模式 |
| `/verify-module` | 检查目录结构和文档完整性 |
| `/verify-change` | 分析 Git 变更，检测文档同步问题 |
| `/verify-quality` | 检测复杂度、命名、代码质量问题 |
| `/gen-docs` | 自动生成 README.md 和 DESIGN.md 骨架 |
| `/frontend-design` | UI 美学、组件模式、UX 指导 |

### 领域知识（按上下文自动加载）

| 领域 | 覆盖范围 |
|------|----------|
| 安全 | 渗透测试、代码审计、防御工程、威胁情报、漏洞研究 |
| 架构 | API 设计、云原生、安全架构、消息队列、缓存策略 |
| 开发 | Python、TypeScript、Go、Rust、Java、C++、Shell |
| DevOps | Git 工作流、测试、数据库、可观测性、性能、成本优化 |
| 前端 | 组件模式、状态管理、UI 美学、4 种设计系统变体 |
| 移动端 | iOS/SwiftUI、Android/Compose、React Native、Flutter |
| AI | Agent 开发、LLM 安全、RAG 系统、Prompt 工程 |
| 数据工程 | 管道编排、流处理、数据质量 |
| 基础设施 | Kubernetes、GitOps、IaC（Terraform/Pulumi/CDK） |
| 协同 | 多 Agent 任务分解与并行编排 |

## 安装布局

```
~/.claude/                          ~/.codex/
├── CLAUDE.md        (人格)         ├── AGENTS.md       (人格 + 风格)
├── output-styles/   (风格文件)     ├── instruction.md   (核心指令)
├── commands/*.md    (斜杠命令)     ├── skills/          (领域技能)
├── skills/          (领域技能)     ├── bin/lib/          (运行时库)
├── bin/lib/         (运行时库)     ├── config.toml      (推荐配置)
├── settings.json    (配置)         └── .sage-uninstall.js
└── .sage-uninstall.js
~/.gemini/
├── GEMINI.md        (人格 + 风格)
├── commands/*.toml  (命令)
├── skills/          (领域技能)
├── settings.json    (配置)
└── .sage-uninstall.js
```

所有安装文件记录在 `.sage-backup/manifest.json` 中，卸载时自动恢复原有状态。

## 命令参考

```bash
# 安装
npx code-abyss --target <claude|codex|gemini> [-y]
npx code-abyss --target claude --style <slug> --persona <slug> -y

# 卸载
npx code-abyss --uninstall <claude|codex|gemini>

# 查看
npx code-abyss --list-styles
npx code-abyss --help

# 校验工具（直接运行）
node skills/tools/verify-security/scripts/security_scanner.js <路径>
node skills/tools/verify-module/scripts/module_scanner.js <路径>
node skills/tools/verify-change/scripts/change_analyzer.js --mode staged
node skills/tools/verify-quality/scripts/quality_checker.js <路径>
node skills/tools/gen-docs/scripts/doc_generator.js <路径>
```

## Pack 系统

Code Abyss 支持可安装的 pack 扩展功能：

- `packs/abyss/manifest.json` — 核心包：人格、风格、技能、运行时库
- `packs/gstack/manifest.json` — 可选的固定版本上游 gstack 运行时（仅在 `packs.lock` 声明时安装）
- `.code-abyss/packs.lock.json` — 项目级 pack 声明，支持 `required`/`optional`/`sources`

Pack 管理：

```bash
node bin/packs.js bootstrap              # 初始化 packs.lock
node bin/packs.js bootstrap --apply-docs # 将 pack 文档写入 README/CONTRIBUTING
node bin/packs.js diff                   # 查看 lock 与模板的差异
node bin/packs.js vendor-pull <pack>     # 拉取上游到 .code-abyss/vendor/
node bin/packs.js vendor-sync --check    # CI 门禁：验证 vendor 完整性
node bin/packs.js report summary         # 查看安装报告
node bin/packs.js uninstall <pack>       # 移除 pack 产物
```

## 技能注册表

`skills/**/SKILL.md` frontmatter 是单一事实源。共享注册表（`bin/lib/skill-registry.js`）标准化元数据后供安装器和运行时消费。

必填 frontmatter：

```yaml
---
name: verify-quality          # kebab-case，全局唯一
description: 代码质量校验关卡
user-invocable: true           # false = 仅知识库
allowed-tools: Bash, Read, Glob  # 可选，默认 Read
argument-hint: <路径>          # 可选
---
```

生成链：

1. 注册表扫描并校验所有 `skills/**/SKILL.md`
2. 筛选 `user-invocable: true` 用于命令生成
3. Claude：渲染为 `~/.claude/commands/*.md`
4. Codex：安装到 `~/.codex/skills/`，由 Codex 直接发现
5. Gemini：渲染为 `~/.gemini/commands/*.toml`
6. 脚本型技能通过 `skills/run_skill.js` 执行（加锁 + spawn + 退出码透传）
7. 知识型技能直接加载 `SKILL.md` 内容

## 开发

```bash
npm test                          # Jest 测试套件（218 个测试）
npm run verify:skills             # 校验 SKILL.md frontmatter 契约
node bin/install.js --help        # 安装器帮助
```

CI 在 Node 18/20/22 + Linux/macOS/Windows 上运行：

- 单元测试 + 技能契约校验
- 4 个校验工具（安全、模块、质量、变更）
- 三端三平台 smoke 安装/卸载测试

## 卸载

```bash
npx code-abyss --uninstall claude
npx code-abyss --uninstall codex
npx code-abyss --uninstall gemini
```

自动恢复备份的配置，清理所有安装文件。

## 许可证

[MIT](LICENSE)
