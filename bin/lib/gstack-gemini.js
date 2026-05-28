'use strict';

// bin/lib/gstack-gemini.js (facade)
// 历史 API 入口，保留以维持 test 与 external consumer 兼容。
// 真正逻辑见 bin/lib/gstack/strategies/gemini.js

const { installGstackPack } = require('./gstack/installer');
const geminiStrategy = require('./gstack/strategies/gemini');

function installGstackGeminiPack(options = {}) {
  return installGstackPack('gemini', options);
}

module.exports = {
  buildGeminiCommand: geminiStrategy.buildGeminiCommand,
  transformGeminiSkillContent: geminiStrategy.transformGeminiSkillContent,
  installGstackGeminiPack,
};
