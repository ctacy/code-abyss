# gstack pack（统一架构）

历史上每个 host 各有独立 `bin/lib/gstack-{claude,codex,gemini}.js`（合计 651 LOC），靠 codex 文件 require 共享原语。本目录把它们重构为：

```
bin/lib/gstack/
├── core.js                  共享原语（frontmatter 解析、source 解析、文件复制）
├── installer.js             统一 install 入口：按 hostName 分发
├── strategies/
│   ├── claude.js            ~/.claude/skills/gstack/ + commands/*.md + extractAllowedTools
│   ├── codex.js             ~/.agents/skills/gstack/ + frontmatter 收敛 + GSTACK_ROOT preamble
│   ├── gemini.js            ~/.gemini/skills/gstack/ + commands/*.toml + pathRewrites
│   └── (openclaw.js)        留给 PR-1.γ-b 接入 OpenClaw
└── README.md                本文件
```

## 调用约定

```js
const { installGstackPack } = require('./gstack/installer');

const result = installGstackPack('claude', {
  HOME, backupDir, manifest,
  info, ok, warn,
  sourceMode: 'pinned',  // pinned | local | disabled
  projectRoot,
  fallback: true,        // pinned 失败时回退到 local，反之亦然
});
// → { installed, sourceMode, reason }
```

## 旧 facade（兼容性）

- `bin/lib/gstack-claude.js`
- `bin/lib/gstack-codex.js`
- `bin/lib/gstack-gemini.js`

均保留为薄壳函数 + re-export 旧 module.exports 形状（test/external 依赖原有公共 API），实质逻辑全部走本目录。

## 增加新 host 的步骤

1. 在 `strategies/` 下新增 `<host>.js`，导出 `installToHost({ HOME, backupDir, manifest, sourceRoot, info, ok, warn })`
2. 在 `installer.js` 的 `STRATEGIES` map 注册
3. 在 `packs/gstack/manifest.json` 加 `hosts.<host>` 配置（runtimeDirs / runtimeFiles / pathRewrites / commandAliases / uninstall）
4. 在 `bin/lib/lifecycle/core-install.js` 对应 target 分支调用 `installGstackPack('<host>', ...)`
