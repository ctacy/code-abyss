---
name: verifying-modules
description: Scans directory structure, detects missing documentation, and verifies code-doc synchronization. Use when checking module completeness, README presence, or DESIGN.md alignment. Automatically triggered after creating new modules.
compatibility: node>=18
user-invocable: false
allowed-tools: Bash, Read, Glob
argument-hint: <模块路径>
---

# 模块完整性校验关卡

## 命令

```bash
node scripts/module_scanner.js <模块路径>
node scripts/module_scanner.js <模块路径> -v      # 详细
node scripts/module_scanner.js <模块路径> --json  # JSON
```

## 检测项

| 文件 | 缺失后果 |
|------|----------|
| `README.md` | 阻断交付 |
| `DESIGN.md` | 阻断交付 |
| `tests/` | 警告 |
| `__init__.py` | 提示 |

## 文档要求

README 须含：模块名与定位、存在理由、核心职责、依赖关系、快速使用示例
DESIGN 须含：设计目标、方案选择与理由、关键决策、已知限制、变更历史

## 触发条件

新建模块 | 模块重构 | 提交前

## 快速修复

缺文档时用 `/gen-docs <模块路径>` 生成骨架。
