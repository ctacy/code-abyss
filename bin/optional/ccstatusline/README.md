# ccstatusline 状态栏（Code Abyss optional 模块）

> Claude Code 专属。Codex / Gemini / OpenClaw 不适用。

## 提供什么

- `bundled settings.json`：Code Abyss 双行美化预设（token / cache / cost / git）
- `index.js`：detect / deploy / install 流程
- `schema-guard.js`：部署前的轻量字段校验，防御 ccstatusline 上游 Zod schema
  对非法枚举值（如 v2.1.11 那次 `flexMode`）触发整文件重置

## 调用入口

由 `bin/adapters/claude.js` 在 `postClaude` 流程里按需调用。`install.js` 不直接依赖此模块。

## 升级 ccstatusline 上游版本时的检查清单

1. 用 `node -e "..."` 跑一遍 `validateCcstatuslineSettings`，确保 bundled
   `settings.json` 仍合法
2. 如果 ccstatusline 引入了新的 Zod 严格枚举字段，更新 `schema-guard.js` 的
   `VALID_*` 集合
3. 如有需要，更新 `plugin.json` 里的 `upstream.minVersion`
