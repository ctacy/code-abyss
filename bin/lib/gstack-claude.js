'use strict';

// bin/lib/gstack-claude.js (facade)
// 历史 API 入口，保留以维持 test 与 external consumer 兼容。
// 真正逻辑见 bin/lib/gstack/strategies/claude.js

const { installGstackPack } = require('./gstack/installer');
const claudeStrategy = require('./gstack/strategies/claude');

function installGstackClaudePack(options = {}) {
  return installGstackPack('claude', options);
}

module.exports = {
  extractAllowedTools: claudeStrategy.extractAllowedTools,
  buildClaudeCommand: claudeStrategy.buildClaudeCommand,
  installGstackClaudePack,
};
