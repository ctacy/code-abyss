---
name: analyzing-changes
description: Analyzes code changes, detects documentation drift, and evaluates change impact scope. Use when reviewing diffs, checking doc sync, or running pre-commit analysis. Automatically triggered after design-level changes or refactoring.
compatibility: node>=18
user-invocable: false
allowed-tools: Bash, Read, Grep
argument-hint: [--mode working|staged|committed]
---

# 变更校验关卡

## 命令

```bash
node scripts/change_analyzer.js                    # 工作区（默认）
node scripts/change_analyzer.js --mode staged      # 暂存区
node scripts/change_analyzer.js --mode committed   # 已提交
node scripts/change_analyzer.js -v                 # 详细
node scripts/change_analyzer.js --json             # JSON
```

## 检测项

| 检测 | 说明 |
|------|------|
| 文件分类 | 自动识别代码/文档/测试/配置 |
| 模块识别 | 识别受影响模块 |
| 文档同步 | 代码变更是否同步更新文档 |
| 测试覆盖 | 代码变更是否有对应测试 |
| 影响评估 | 变更规模与影响范围 |

## 警告触发条件

- 代码变更 >50 行而 DESIGN.md 未更新
- 代码变更 >30 行而无测试更新
- 新增文件而 README.md 未更新
- 配置变更未记录
- 删除文件须确认引用已清理

## 触发条件

设计级变更 | 重构完成 | 代码变更 >30 行 | 提交前

## 人工复核

先读受影响模块 README/DESIGN，确认职责、设计、测试同步。设计级改动须于 DESIGN.md 留痕：改了什么、为何改、影响何处。
