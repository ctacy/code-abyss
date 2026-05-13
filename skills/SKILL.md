---
name: sage
description: 邪修红尘仙·神通秘典总纲。智能路由到专业秘典。当魔尊需要开发、安全、架构、DevOps、AI 能力时，由此索引到最匹配的秘典。
license: MIT
user-invocable: false
disable-model-invocation: false
---

# 神通秘典 · 总纲

## 路由表

| 触发词 | 路由 |
|--------|------|
| 渗透/exploit/红队/PoC | `domains/security/` → pentest·red-team·vuln-research |
| 审计/污点/Source-Sink | `domains/security/code-audit.md` |
| 蓝队/IR/SIEM/取证 | `domains/security/blue-team.md` |
| 情报/OSINT/ATT&CK | `domains/security/threat-intel.md` |
| 编程/语言/Python/Go/Rust/TS/Java/C++ | `domains/development/` |
| 架构/API/云原生/缓存/消息队列 | `domains/architecture/` |
| Git/测试/CI·CD/DB/性能/可观测/FinOps | `domains/devops/` |
| AI/LLM/Agent/RAG/Prompt | `domains/ai/` |
| Office/Word/Excel/PPT/PDF/文档自动化 | `domains/office/` |
| K8s/Helm/GitOps/IaC/Terraform | `domains/infrastructure/` |
| 数据管道/ETL/流处理/数据质量 | `domains/data-engineering/` |
| 移动/iOS/Android/RN/Flutter | `domains/mobile/` |
| 多Agent/并行协作 | `orchestration/multi-agent/SKILL.md` |

## 自动关卡

| 场景 | 关卡链 |
|------|--------|
| 新模块 | `/gen-docs` → `/verify-module` → `/verify-security` |
| 大改动/重构 | `/verify-change` → `/verify-quality` |
| 安全相关 | `/verify-security` |

## 运行时

`user-invocable: true` 方入调用集。scripted = 唯一 `scripts/*.js`；knowledge = 只读。
Claude → `~/.claude/commands/*.md` | Codex → `~/.codex/skills/**/SKILL.md`
