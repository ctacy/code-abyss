'use strict';

// bin/lib/gstack/strategies/codex.js
// Codex host: 写入 ~/.agents/skills/gstack/，无 commands 产出
// 特殊点：SKILL.md frontmatter 收敛、注入 GSTACK_ROOT preamble、pathRewrites 替换

const fs = require('fs');
const path = require('path');

const {
  GSTACK_FRONTMATTER_DESCRIPTION_LIMIT,
  getGstackConfig,
  readFrontmatterBlock,
  extractNameAndDescription,
  condenseDescription,
  copyRuntimeAssets,
  copySkillRuntimeFiles,
  listTopLevelSkillDirs,
} = require('../core');

function buildCodexFrontmatter(name, description) {
  const safeName = name.trim();
  const safeDesc = condenseDescription(description, GSTACK_FRONTMATTER_DESCRIPTION_LIMIT);
  const indented = safeDesc.split('\n').map((line) => `  ${line}`).join('\n');
  return `---\nname: ${safeName}\ndescription: |\n${indented}\n---`;
}

function injectRuntimeRootPreamble(content) {
  const marker = '```bash\n';
  const idx = content.indexOf(marker);
  if (idx === -1 || content.includes('GSTACK_ROOT=')) return content;

  const injected = [
    '_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)',
    'GSTACK_ROOT="$HOME/.agents/skills/gstack"',
    '[ -n "$_ROOT" ] && [ -d "$_ROOT/.agents/skills/gstack" ] && GSTACK_ROOT="$_ROOT/.agents/skills/gstack"',
    'GSTACK_BIN="$GSTACK_ROOT/bin"',
    'GSTACK_BROWSE="$GSTACK_ROOT/browse/dist"',
    'GSTACK_DESIGN="$GSTACK_ROOT/design/dist"',
  ].join('\n');

  return `${content.slice(0, idx + marker.length)}${injected}\n${content.slice(idx + marker.length)}`;
}

function rewritePaths(content) {
  return getGstackConfig('codex').pathRewrites.reduce(
    (current, [from, to]) => current.split(from).join(to),
    content
  );
}

function transformGstackSkillContent(content) {
  const parsed = extractNameAndDescription(content);
  if (!parsed.name || !parsed.description) {
    throw new Error('gstack skill frontmatter 缺少 name 或 description');
  }
  const block = readFrontmatterBlock(content);
  const stripped = `${buildCodexFrontmatter(parsed.name, parsed.description)}${block ? block.body : content}`;
  return injectRuntimeRootPreamble(rewritePaths(stripped));
}

function installToHost({
  HOME,
  backupDir,
  manifest,
  sourceRoot,
  info = () => {},
  ok = () => {},
  warn = () => {},
}) {
  const config = getGstackConfig('codex');
  const destRoot = path.join(HOME, '.agents', 'skills', 'gstack');

  // backup existing destRoot
  if (fs.existsSync(destRoot)) {
    const { copyRecursive, rmSafe } = require('../../utils');
    const backupPath = path.join(backupDir, 'agents', 'skills', 'gstack');
    rmSafe(backupPath);
    copyRecursive(destRoot, backupPath);
    manifest.backups.push({ root: 'agents', path: 'skills/gstack' });
    info('备份: agents/skills/gstack');
  }

  const { rmSafe } = require('../../utils');
  rmSafe(destRoot);
  fs.mkdirSync(destRoot, { recursive: true });

  const rootSkillPath = path.join(sourceRoot, 'SKILL.md');
  if (!fs.existsSync(rootSkillPath)) {
    warn('gstack 根技能缺失，跳过自动融合');
    return { installed: false, reason: 'missing-root-skill' };
  }

  fs.writeFileSync(
    path.join(destRoot, 'SKILL.md'),
    transformGstackSkillContent(fs.readFileSync(rootSkillPath, 'utf8'))
  );
  copyRuntimeAssets(sourceRoot, destRoot, config);

  listTopLevelSkillDirs(sourceRoot, 'codex').forEach((skillDir) => {
    copySkillRuntimeFiles(
      path.join(sourceRoot, skillDir),
      path.join(destRoot, skillDir),
      { transformSkill: transformGstackSkillContent }
    );
  });

  manifest.installed.push({ root: 'agents', path: 'skills/gstack' });
  ok(`agents/skills/gstack ${config.upstream.version ? `(gstack ${config.upstream.version})` : ''}`);
  return { installed: true, reason: null };
}

module.exports = {
  buildCodexFrontmatter,
  injectRuntimeRootPreamble,
  rewritePaths,
  transformGstackSkillContent,
  installToHost,
};
