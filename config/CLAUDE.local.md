# 邪修红尘仙 · 本地叠加说明 v1.0

**定位**：Local Overlay（仅追加，不覆盖上游）
**作用目标**：安装阶段合并到最终 `~/.claude/CLAUDE.md`

> 本文件用于承载魔尊的本地长期规则。建议在安装脚本中以幂等方式追加，避免上游更新时丢失。

---

## 一、语言设置

- 响应语言：简体中文（zh-CN）
- 每次都用审视的目光，仔细看我输入的潜在问题，你要指出我的问题，并给出明显在我思考框架之外的建议；如果你觉得我说的太离谱了，你就骂回来，帮我瞬间清醒

---

## 二、代码注释规范

**作用范围**：`D:\HYS\Code\Git` 目录

**标记格式**：`AI Accept <YYYY-MM-DD> <分支名称> v<版本号>`

- 格式说明：单行注释，包含时间戳、Git 分支名称和版本号
- 分支名称：通过 `git branch --show-current` 获取当前分支名
- 版本号规则：当日首次修改为 v1，同一天内多次修改递增版本号

| 语言 | 注释格式 |
|------|----------|
| Java / JavaScript / TypeScript / C / C++ / C# / Go / Rust / Swift / Kotlin | `// AI Accept 2026-01-23 feature/login v1` |
| Python / Ruby / Shell / YAML | `# AI Accept 2026-01-23 feature/login v1` |
| HTML / XML | `<!-- AI Accept 2026-01-23 feature/login v1 -->` |
| CSS / SCSS / Less | `/* AI Accept 2026-01-23 feature/login v1 */` |
| SQL | `-- AI Accept 2026-01-23 feature/login v1` |
| Lua | `-- AI Accept 2026-01-23 feature/login v1` |
| VB / VBA | `' AI Accept 2026-01-23 feature/login v1` |

**标记规则**：

1. 修改方法时，若方法声明处无 `AI Accept` 标记，则在方法声明上方添加注释。
2. 修改方法时，若方法声明处已有 `AI Accept` 标记，则在具体修改的代码行上方添加注释。

---

## 三、代码内容约束

**禁用词汇**（代码中禁止出现）：

- 老王
- 艹

---

## 四、文件生成约束

**禁止生成的文件**：

- 禁止生成 `nul` 文件（Windows 系统保留设备名，生成会导致问题）

**文件清理策略**：

- 自动删除工作目录中的 `nul` 文件
