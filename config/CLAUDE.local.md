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

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->