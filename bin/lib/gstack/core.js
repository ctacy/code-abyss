'use strict';

// bin/lib/gstack/core.js
// 共享原语：所有 host 都用得到的 frontmatter 解析、source resolution、文件复制等
// 历史上这些逻辑都长在 bin/lib/gstack-codex.js 里，claude/gemini 都来 require；
// 这次把它们提到独立的 core 模块，让 strategy 文件读起来更清晰。

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { copyRecursive, rmSafe } = require('../utils');
const { getPack } = require('../pack-registry');

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const GSTACK_RUNTIME_EXTRA_DIRS = new Set(['references', 'templates', 'specialists', 'bin', 'migrations', 'vendor']);
const GSTACK_FRONTMATTER_DESCRIPTION_LIMIT = 240;

function normalizeEol(content) {
  return String(content || '').replace(/\r\n/g, '\n');
}

function getGstackConfig(hostName = 'codex', projectRoot = PROJECT_ROOT) {
  const manifest = getPack(projectRoot, 'gstack');
  const hostConfig = manifest.hosts && manifest.hosts[hostName];
  if (!manifest.upstream || !hostConfig) {
    throw new Error(`gstack pack manifest 缺少 upstream 或 ${hostName} host 配置`);
  }
  return {
    upstream: manifest.upstream,
    sourceOverrideEnv: hostConfig.sourceOverrideEnv || 'CODE_ABYSS_GSTACK_SOURCE',
    skipSkills: new Set(hostConfig.skipSkills || []),
    runtimeDirs: hostConfig.runtimeDirs || [],
    runtimeFiles: hostConfig.runtimeFiles || [],
    pathRewrites: hostConfig.pathRewrites || [],
    commandAliases: hostConfig.commandAliases || {},
  };
}

function readFrontmatterBlock(content) {
  const normalized = normalizeEol(content);
  const fmStart = normalized.indexOf('---\n');
  if (fmStart !== 0) return null;
  const fmEnd = normalized.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return null;
  return {
    raw: normalized.slice(fmStart + 4, fmEnd),
    body: normalized.slice(fmEnd + 4),
  };
}

function extractNameAndDescription(content) {
  const block = readFrontmatterBlock(content);
  if (!block) return { name: '', description: '' };

  const nameMatch = block.raw.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  let description = '';
  const lines = block.raw.split('\n');
  let inDescription = false;
  const descLines = [];

  for (const line of lines) {
    if (/^description:\s*\|?\s*$/.test(line)) {
      inDescription = true;
      continue;
    }
    if (/^description:\s*\S/.test(line)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDescription) {
      if (line === '' || /^\s/.test(line)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }

  if (descLines.length > 0) description = descLines.join('\n').trim();
  return { name, description };
}

function condenseDescription(description, limit) {
  const firstParagraph = description.split(/\n\s*\n/)[0] || description;
  const collapsed = firstParagraph.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= limit) return collapsed;
  const truncated = collapsed.slice(0, limit - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  const safe = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe}...`;
}

function listTopLevelSkillDirs(sourceRoot, hostName = 'codex') {
  const config = getGstackConfig(hostName);
  const entries = fs.readdirSync(sourceRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(sourceRoot, name, 'SKILL.md')))
    .filter((name) => !config.skipSkills.has(name))
    .sort();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function resolveLocalGstackSource(projectRoot, env, sourceOverrideEnv) {
  if (env[sourceOverrideEnv]) return env[sourceOverrideEnv];
  if (!projectRoot) return null;

  const candidates = [
    path.join(projectRoot, '.code-abyss', 'vendor', 'gstack'),
    path.join(projectRoot, 'vendor', 'gstack'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function syncPinnedRepo(targetDir) {
  const { upstream } = getGstackConfig();
  rmSafe(targetDir);
  ensureDir(path.dirname(targetDir));

  const clone = spawnSync('git', ['clone', '--depth', '1', upstream.repo, targetDir], { encoding: 'utf8' });
  if (clone.status !== 0) {
    throw new Error(`gstack clone 失败: ${(clone.stderr || clone.stdout || '').trim()}`);
  }

  const checkout = spawnSync('git', ['-C', targetDir, 'fetch', '--depth', '1', 'origin', upstream.commit], { encoding: 'utf8' });
  if (checkout.status !== 0) {
    throw new Error(`gstack fetch commit 失败: ${(checkout.stderr || checkout.stdout || '').trim()}`);
  }

  const detach = spawnSync('git', ['-C', targetDir, 'checkout', '--detach', upstream.commit], { encoding: 'utf8' });
  if (detach.status !== 0) {
    throw new Error(`gstack checkout 失败: ${(detach.stderr || detach.stdout || '').trim()}`);
  }
}

function ensurePinnedGstackSource({ HOME, env = process.env, warn = () => {} }) {
  const config = getGstackConfig();
  const override = env[config.sourceOverrideEnv];
  if (override) return override;

  const cacheDir = path.join(HOME, '.code-abyss', 'vendor', `gstack-${config.upstream.commit.slice(0, 12)}`);
  const versionFile = path.join(cacheDir, '.code-abyss-source-version');

  try {
    if (!fs.existsSync(cacheDir) || !fs.existsSync(versionFile)
      || fs.readFileSync(versionFile, 'utf8').trim() !== config.upstream.commit) {
      syncPinnedRepo(cacheDir);
      fs.writeFileSync(versionFile, `${config.upstream.commit}\n`);
    }
    return cacheDir;
  } catch (error) {
    warn(`获取 gstack 失败，跳过自动融合: ${error.message}`);
    return null;
  }
}

function resolveGstackSource({
  HOME,
  env = process.env,
  warn = () => {},
  sourceMode = 'pinned',
  projectRoot = null,
  hostName = 'codex',
  fallback = false,
}) {
  const config = getGstackConfig(hostName);
  if (sourceMode === 'disabled') return { sourceRoot: null, mode: 'disabled', reason: 'disabled' };

  const localRoot = resolveLocalGstackSource(projectRoot, env, config.sourceOverrideEnv);

  if (sourceMode === 'local') {
    if (!localRoot) {
      if (fallback) {
        const pinnedRoot = ensurePinnedGstackSource({ HOME, env, warn });
        if (pinnedRoot) {
          return { sourceRoot: pinnedRoot, mode: 'pinned', reason: 'fallback-local-to-pinned' };
        }
      }
      warn('gstack source=local，但未找到本地源（.code-abyss/vendor/gstack 或 env override）');
      return { sourceRoot: null, mode: 'local', reason: 'missing-local-source' };
    }
    return { sourceRoot: localRoot, mode: 'local', reason: null };
  }

  const pinnedRoot = ensurePinnedGstackSource({ HOME, env, warn });
  if (pinnedRoot) return { sourceRoot: pinnedRoot, mode: 'pinned', reason: null };
  if (fallback && localRoot) {
    return { sourceRoot: localRoot, mode: 'local', reason: 'fallback-pinned-to-local' };
  }
  return { sourceRoot: null, mode: 'pinned', reason: 'fetch-failed' };
}

function copyRuntimeAssets(sourceRoot, destRoot, config) {
  config.runtimeDirs.forEach((dirName) => {
    const src = path.join(sourceRoot, dirName);
    if (!fs.existsSync(src)) return;
    copyRecursive(src, path.join(destRoot, dirName));
  });

  config.runtimeFiles.forEach((fileName) => {
    const src = path.join(sourceRoot, fileName);
    if (!fs.existsSync(src)) return;
    copyRecursive(src, path.join(destRoot, fileName));
  });
}

function copySkillRuntimeFiles(sourceSkillDir, destSkillDir, { transformSkill = null } = {}) {
  ensureDir(destSkillDir);
  rmSafe(path.join(destSkillDir, 'SKILL.md.tmpl'));
  const sourceSkillPath = path.join(sourceSkillDir, 'SKILL.md');
  if (!fs.existsSync(sourceSkillPath)) return;

  const content = fs.readFileSync(sourceSkillPath, 'utf8');
  fs.writeFileSync(
    path.join(destSkillDir, 'SKILL.md'),
    typeof transformSkill === 'function' ? transformSkill(content) : content
  );

  fs.readdirSync(sourceSkillDir, { withFileTypes: true }).forEach((entry) => {
    if (entry.name === 'SKILL.md' || entry.name === 'SKILL.md.tmpl') return;
    if (!entry.isDirectory()) return;
    if (!GSTACK_RUNTIME_EXTRA_DIRS.has(entry.name)) return;
    copyRecursive(path.join(sourceSkillDir, entry.name), path.join(destSkillDir, entry.name));
  });
}

function backupPathIfExists(targetPath, backupPath, manifest, rootName, relPath, info) {
  if (!fs.existsSync(targetPath)) return false;
  rmSafe(backupPath);
  copyRecursive(targetPath, backupPath);
  manifest.backups.push({ root: rootName, path: relPath });
  info(`备份: ${rootName}/${relPath}`);
  return true;
}

module.exports = {
  PROJECT_ROOT,
  GSTACK_RUNTIME_EXTRA_DIRS,
  GSTACK_FRONTMATTER_DESCRIPTION_LIMIT,
  normalizeEol,
  getGstackConfig,
  readFrontmatterBlock,
  extractNameAndDescription,
  condenseDescription,
  listTopLevelSkillDirs,
  ensureDir,
  resolveLocalGstackSource,
  ensurePinnedGstackSource,
  resolveGstackSource,
  copyRuntimeAssets,
  copySkillRuntimeFiles,
  backupPathIfExists,
};
