---
name: office-documents
description: Office 文档能力总索引。统一路由到 Word、PDF、PowerPoint、Excel 工作流，用于合同、公文、汇报、表单、报表、财务模型等文档自动化场景。
license: MIT
user-invocable: false
disable-model-invocation: false
---

# 文牍秘典 · Office 文档

## 路由

| 场景 | 路由 |
|------|------|
| Word / docx / 修订 / 批注 / 红线 | [office-docx](docx/SKILL.md) |
| PDF / 表单 / 扫描件 / 合并拆分 | [office-pdf](pdf/SKILL.md) |
| PowerPoint / PPT / 演示文稿 / 模板套版 | [office-pptx](pptx/SKILL.md) |
| Excel / xlsx / csv / 财务模型 / 公式 | [office-xlsx](xlsx/SKILL.md) |

## 典型任务

- 合同、公文、制度、方案等 `.docx` 创建与修订
- PDF 表单批量填写、文本/表格提取、分页与图片化检查
- 演示文稿模板套版、内容替换、缩略图质检、HTML 转 PPTX
- Excel 预算表、财务模型、数据清洗、公式重算与错误校验

## 使用约束

- 先读对应子 skill，再执行具体工作流。
- 涉及 Office Open XML（OOXML）时，优先按 skill 中要求先解包、编辑、验证、再回包。
- 涉及公式的 Excel 交付，必须执行重算并确保零公式错误。
- 涉及文档审阅、合同红线或模板保真时，优先保持最小改动与格式一致性。
