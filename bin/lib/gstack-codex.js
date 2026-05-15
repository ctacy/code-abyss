'use strict';

// bin/lib/gstack-codex.js (facade)
// 历史 API 入口，保留以维持 test 与 external consumer 兼容。
// 真正逻辑见 bin/lib/gstack/strategies/codex.js + bin/lib/gstack/core.js
//
// 历史导出包含 codex strategy 的内部原语（getGstackConfig / extractNameAndDescription /
// listTopLevelSkillDirs / resolveGstackSource / condenseDescription / copySkillRuntimeFiles
// / transformGstackSkillContent / ensurePinnedGstackSource），claude/gemini facade
// 历史上靠 require('./gstack-codex') 来取这些 — 重构后这些都搬到了 gstack/core.js +
// gstack/strategies/codex.js，本 facade 把它们透传出去维持公共 API 不变。

const { installGstackPack } = require('./gstack/installer');
const core = require('./gstack/core');
const codexStrategy = require('./gstack/strategies/codex');

function installGstackCodexPack(options = {}) {
  return installGstackPack('codex', options);
}

module.exports = {
  // core re-exports
  getGstackConfig: core.getGstackConfig,
  extractNameAndDescription: core.extractNameAndDescription,
  condenseDescription: core.condenseDescription,
  listTopLevelSkillDirs: core.listTopLevelSkillDirs,
  ensurePinnedGstackSource: core.ensurePinnedGstackSource,
  resolveGstackSource: core.resolveGstackSource,
  copySkillRuntimeFiles: core.copySkillRuntimeFiles,
  // codex strategy re-exports
  transformGstackSkillContent: codexStrategy.transformGstackSkillContent,
  // facade
  installGstackCodexPack,
};
