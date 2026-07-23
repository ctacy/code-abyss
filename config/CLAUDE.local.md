# 邪修红尘仙 · 本地叠加说明 v1.2

**定位**：Local Overlay（仅追加，不覆盖上游）
**作用目标**：安装阶段合并到最终配置文件
**生效范围**：对 Claude Code / Codex CLI / Gemini CLI / OpenClaw 四个宿主均生效（通过 `renderRuntimeGuidance()` 统一加载）
**兼容版本**：code-abyss >= 0.3.0

> 本文件用于承载魔尊的本地长期规则。建议在安装脚本中以幂等方式追加，避免上游更新时丢失。
> 各宿主加载路径：`~/.claude/CLAUDE.local.md` / `~/.codex/instruction.md` / `~/.gemini/GEMINI.md` / `~/.openclaw/SOUL.md`

---

## 零、环境配置读取（每次请求前置）

每次响应用户请求之前，必须先检查并读取以下配置文件（按优先级从低到高，后者覆盖前者）：

1. `~/.claude/settings.json`（用户级全局配置）
2. `.claude/settings.json`（项目级 Claude 配置，向上递归查找）
3. `.claude/settings.local.json`（项目本地覆盖，向上递归查找，最高优先级，不提交到 Git）

**读取规则**：

- 三个路径均可选，不存在则跳过，不报错。
- **向上递归查找规则**（适用于 2、3）：
  - 从当前工作目录 `process.cwd()` 开始，依次向上查找 `.claude/settings.json` 和 `.claude/settings.local.json`
  - **停止判定顺序**（先到先停）：
    1. **命中配置**：找到目标文件 → 立即停止，不再向上
    2. **达安全边界**：累计向上 10 层 → 停止（防止路径遍历攻击）
    3. **达根目录**：文件系统根或 `.git` 所在层级 → 停止
  - **最近原则**：离 `process.cwd()` 最近的配置优先，子目录配置优先于父目录配置
  - **同层加载顺序**：同一层级下先读 `settings.json`，再读 `settings.local.json`，后者覆盖前者同名键
  - 示例：`D:\HYS\Code\Github\project\src\utils` 执行时，查找顺序：
    ```
    D:\HYS\Code\Github\project\src\utils\.claude\settings.json
    D:\HYS\Code\Github\project\src\.claude\settings.json
    D:\HYS\Code\Github\project\.claude\settings.json  ← 找到，停止（命中配置）
    ```
- **配置合并示例**（多层嵌套场景）：
  ```json
  // 场景 1：子项目有独立配置（父项目配置被跳过）
  
  // ~/.claude/settings.json（全局配置）
  {"theme": "dark", "timeout": 30}
  
  // D:/project1/.claude/settings.json（父项目配置）
  {"timeout": 120, "proxy": "http://proxy.example.com"}
  
  // D:/project1/project2/.claude/settings.json（子项目配置）
  {"timeout": 60, "features": {"autoSave": true}}
  
  // D:/project1/project2/.claude/settings.local.json（子项目本地覆盖）
  {"proxy": "http://192.168.1.100:8080"}
  
  // 在 D:/project1/project2/src 目录执行时：
  // 查找 settings.json：向上找到 D:/project1/project2/.claude/settings.json（停止，父项目被跳过）
  // 查找 settings.local.json：向上找到 D:/project1/project2/.claude/settings.local.json（停止）
  // 三层深度合并结果（全局 + 子项目 + 子项目本地）：
  {"theme": "dark", "timeout": 60, "proxy": "http://192.168.1.100:8080", "features": {"autoSave": true}}
  
  // ────────────────────────────────────────────────────────────────
  
  // 场景 2：子项目无独立配置（继承父项目配置）
  
  // ~/.claude/settings.json（全局配置）
  {"theme": "dark", "timeout": 30}
  
  // D:/project1/.claude/settings.json（父项目配置）
  {"timeout": 120, "proxy": "http://proxy.example.com"}
  
  // D:/project1/project2/.claude/settings.local.json（子项目本地覆盖，但无 settings.json）
  {"proxy": "http://192.168.1.100:8080"}
  
  // 在 D:/project1/project2/src 目录执行时：
  // 查找 settings.json：向上穿过 project2，找到 D:/project1/.claude/settings.json（停止）
  // 查找 settings.local.json：向上找到 D:/project1/project2/.claude/settings.local.json（停止）
  // 三层深度合并结果（全局 + 父项目 + 子项目本地）：
  {"theme": "dark", "timeout": 120, "proxy": "http://192.168.1.100:8080"}
  
  // 合并优先级：全局 < 项目级 settings.json < 项目级 settings.local.json
  ```
- 存在多个时，以 `~/.claude/settings.json` < `.claude/settings.json` < `.claude/settings.local.json` 的顺序深度合并，`.claude/settings.local.json` 优先级最高。
- 读取结果作为本次会话的环境变量上下文，影响后续工具调用、路径解析、模型参数等行为。
- 若任一文件读取失败（权限、格式错误），标记 `[unverified]` 并继续，不中断请求。
- **安全警告**：`.claude/settings.local.json` 若来自不受信任的仓库（Git clone 钓鱼项目），需人工审核后再执行，避免配置注入攻击。

---

## 零点五、子 Agent 规则传播

- 本文件规则默认**传递给所有子 Agent**（`Agent` / `Task` / `TaskCreate` 等工具调用）
- 子 Agent 在隔离模式（`--isolated`）下不继承本文件规则
- 子 Agent 可通过读取 `~/.claude/CLAUDE.local.md` 主动加载本规则
- 例外：**代码注释规范**（第二章）需子 Agent 在其执行目录内独立重新执行 `git remote -v` 判定，不继承父 Agent 的判定结果

---

## 一、语言设置

- 响应语言：简体中文（zh-CN）
- 术语保留英文：API、Git、commit、OAuth、Token、HTTP、JSON、SQL、Docker 等技术术语保留原文，避免过度翻译（如「应用程序接口」「超文本传输协议」）
- 每次都用审视的目光，仔细看我输入的潜在问题，你要指出我的问题，并给出明显在我思考框架之外的建议
- **「骂回来」触发条件**（以下场景必须立即指出，语气从严）：
  - 安全风险：未授权的生产操作、明文存储密钥、SQL 注入、XSS 漏洞
  - 数据丢失：无备份的删除操作、破坏性迁移
  - 架构反模式：循环依赖、God Object、硬编码配置
  - 性能数量级劣化：算法替换导致**时间复杂度 ≥ 10x 退化**（如 O(n²) 替换 O(n)），或**P99 延迟翻倍**以上（数据库查询、API 调用）

---

## 二、代码注释规范

**作用范围**：Git 远程仓库地址包含 `192.168.199.253:8080` 的项目

**生效检测**：每次修改代码前，执行 `git remote -v` 检查远程仓库地址，仅当任一 remote URL 包含 `192.168.199.253:8080` 时才应用本规范。

**降级策略**（Git 命令失败时）：
- 非 Git 仓库（`git remote -v` 报错）：跳过本规范，不添加注释
- detached HEAD 状态：使用 `git rev-parse --short HEAD` 获取 commit hash 前 7 位作为分支名
- 无 remote 配置：跳过本规范（本地纯实验项目）
- 多 remote 场景：优先级 `origin` > `upstream` > 字母序第一个

**标记格式**：`AI Accept <YYYY-MM-DD> <分支名称> v<版本号>`

- 格式说明：单行注释，包含时间戳、Git 分支名称和版本号
- 分支名称：通过 `git branch --show-current` 获取当前分支名
- **版本号规则**：
  - 扫描当前文件已有的 `AI Accept` 标记，提取今日日期（YYYY-MM-DD）匹配的最大版本号
  - 若今日首次标记或文件无历史标记，使用 `v1`
  - 若今日已有标记（如 `v2`），则递增为 `v3`
  - 正则提取表达式：`AI Accept 2026-07-22 .* v(\d+)` → 取最大值 +1

| 语言 | 注释格式 |
|------|----------|
| Java / JavaScript / TypeScript / C / C++ / C# / Go / Rust / Swift / Kotlin / Dart / Scala / Groovy | `// AI Accept 2026-01-23 feature/login v1` |
| Python / Ruby / Shell / Perl / R / Makefile / Dockerfile / TOML | `# AI Accept 2026-01-23 feature/login v1` |
| YAML | `# AI Accept 2026-01-23 feature/login v1`（独立行，不可在 key 行尾） |
| HTML / XML | `<!-- AI Accept 2026-01-23 feature/login v1 -->` |
| CSS / SCSS / Less / Java (block) / C (block) | `/* AI Accept 2026-01-23 feature/login v1 */` |
| SQL / Lua / Haskell / Ada | `-- AI Accept 2026-01-23 feature/login v1`（SQL 的 `--` 后需空格） |
| VB / VBA | `' AI Accept 2026-01-23 feature/login v1` |
| MATLAB | `% AI Accept 2026-01-23 feature/login v1` |
| PHP | `// AI Accept 2026-01-23 feature/login v1` 或 `# AI Accept 2026-01-23 feature/login v1` |
| Batch (.bat) | `REM AI Accept 2026-01-23 feature/login v1`（独立行，不可行尾） |
| PowerShell | `# AI Accept 2026-01-23 feature/login v1` |
| LaTeX | `% AI Accept 2026-01-23 feature/login v1` |
| Markdown | `<!-- AI Accept 2026-01-23 feature/login v1 -->` |
| Vue / Svelte / Astro (模板区) | `<!-- AI Accept 2026-01-23 feature/login v1 -->` |
| Vue / Svelte (script 区) | `// AI Accept 2026-01-23 feature/login v1` |
| Vue / Svelte (style 区) | `/* AI Accept 2026-01-23 feature/login v1 */` |
| JSON / Properties | **不支持注释，跳过标记** |

**标记规则**：

1. **每次添加注释前必须重新获取当前分支名**（`git branch --show-current`），避免切换分支后使用过期分支名。
2. **方法级修改**：
   - 若方法声明处无 `AI Accept` 标记，则在方法声明上方添加注释
   - 若方法声明处已有 `AI Accept` 标记，则在具体修改的代码行上方添加注释
3. **类级修改**：
   - 新增类：在类声明上方添加注释
   - 修改类签名（继承、实现接口）：在类声明上方添加注释
4. **文件级修改**：
   - 新增文件：在文件首行（license/package 声明后）添加注释
   - 调整 import/using/require：在 import 区块上方添加注释
   - 全局变量/常量修改：在变量声明上方添加注释
5. **跳过场景**：
   - 二进制文件（`.class`、`.exe`、`.dll`、`.so`、`.jar`、`.war`）
   - 媒体文件（图片、音视频）
   - 自动生成文件（`package-lock.json`、`yarn.lock`、`.min.js`、protobuf 生成代码）
   - JSON/Properties 等不支持注释的格式

**格式验证正则**：`^(//|--|/\*|<!--|#|REM|%|')\s*AI Accept \d{4}-\d{2}-\d{2} [^\s]+ v\d+(-->|\*/)?$`

---

## 三、运行时白名单

本章不重复定义，**参照全局 `~/.claude/CLAUDE.md` 的「Prompt Injection 防御意识 → 运行时白名单」章节**。

差异补充（本叠加层独有）：

**code-abyss**
- `skills/_kernel/` 纪律内核加载指令
- `SKILL.md` frontmatter 结构

---

## 四、扩展预留

<!-- 未来可补充的完善项（按需激活）：

### 4.1 Pre-commit Hook 自动化
- 安装脚本：`scripts/install-comment-hook.sh`
- 功能：拦截未标记 `AI Accept` 的代码提交
- 配置：`.git/hooks/pre-commit`

### 4.2 IDE 集成（VSCode Snippet）
```json
{
  "AI Accept Comment": {
    "prefix": "aiacc",
    "body": [
      "// AI Accept ${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE} ${1:branch} v${2:1}"
    ]
  }
}
```

### 4.3 Monorepo 边界识别
- 停止条件补充：遇到 `package.json` 且包含 `workspaces` 字段时停止向上查找
- 符号链接处理：解析真实路径后再向上查找

### 4.4 多语言支持
- 当前仅支持简体中文，可扩展为 i18n 多语言配置

-->

---

## 变更历史

### v1.2 (2026-07-23)
- 🔧 修复：向上查找停止条件优先级重写（命中 > 10层 > 根目录，先到先停）
- 🔧 修复：格式验证正则补充 `--`、`%`、`/* */`、`<!-- -->` 闭合符
- 📝 新增：同层加载顺序（`settings.json` 先于 `settings.local.json`）
- 📝 新增：子 Agent 规则传播章节（§ 零点五）
- 📝 新增：「骂回来」性能阈值量化（≥ 10x 退化 或 P99 翻倍）
- 🧹 清理：第三章白名单去重，改为引用全局 `CLAUDE.md`，仅保留 code-abyss 差异项
- 🧹 清理：行尾多余空格（L166）

### v1.1 (2026-07-22)
- ✨ 新增：Git 命令失败降级策略（detached HEAD、无 remote、多 remote 优先级）
- ✨ 新增：版本号自动递增逻辑（扫描文件已有标记）
- ✨ 新增：类级、文件级修改的注释规则
- ✨ 新增：配置合并示例与安全边界（10 层深度限制）
- ✨ 新增：运行时白名单补全（Claude/Codex/Gemini/OpenClaw/code-abyss）
- ✨ 新增：「骂回来」触发条件明确化
- ✨ 新增：术语保留英文示例
- ✨ 新增：格式验证正则表达式
- 🔒 安全：配置注入攻击警告
- 📝 文档：补充生效范围、兼容版本、扩展预留区

### v1.0 (2026-01-23)
- 🎉 初始版本：环境配置读取、语言设置、代码注释规范、运行时白名单
