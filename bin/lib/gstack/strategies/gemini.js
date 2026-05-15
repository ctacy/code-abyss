'use strict';

// bin/lib/gstack/strategies/gemini.js
// Gemini host: 写入 ~/.gemini/skills/gstack/ + 生成 commands/*.toml
// 特殊点：SKILL.md 体走 pathRewrites 替换；commands 用 TOML 而非 Markdown

const fs = require('fs');
const path = require('path');

const { copyRecursive, rmSafe } = require('../../utils');
const {
  getGstackConfig,
  extractNameAndDescription,
  condenseDescription,
  listTopLevelSkillDirs,
  copySkillRuntimeFiles,
  backupPathIfExists,
} = require('../core');

function rewriteGeminiPaths(content) {
  return (getGstackConfig('gemini').pathRewrites || [])
    .reduce((current, [from, to]) => current.split(from).join(to), content);
}

function transformGeminiSkillContent(content) {
  return rewriteGeminiPaths(content);
}

function buildGeminiCommand(name, description, skillPath) {
  const shortDescription = condenseDescription(description, 180).replace(/"/g, '\\"');
  const prompt = [
    `Read \`${skillPath}\` before acting.`,
    '',
    'If Gemini CLI appended raw arguments after this command name, parse them before acting.',
    '',
    'Use that skill as the authoritative playbook for the task.',
    'Respond with concrete actions instead of generic advice.',
  ].join('\n');

  return [
    `description = "${shortDescription}"`,
    'prompt = """',
    prompt,
    '"""',
    '',
  ].join('\n');
}

function installToHost({
  HOME,
  backupDir,
  manifest,
  sourceRoot,
  info = () => {},
  ok = () => {},
}) {
  const config = getGstackConfig('gemini');
  const skillRoot = path.join(HOME, '.gemini', 'skills', 'gstack');
  const commandsRoot = path.join(HOME, '.gemini', 'commands');

  backupPathIfExists(
    skillRoot,
    path.join(backupDir, 'gemini', 'skills', 'gstack'),
    manifest,
    'gemini',
    'skills/gstack',
    info
  );

  rmSafe(skillRoot);
  fs.mkdirSync(skillRoot, { recursive: true });
  fs.mkdirSync(commandsRoot, { recursive: true });

  config.runtimeDirs.forEach((dirName) => {
    const src = path.join(sourceRoot, dirName);
    if (!fs.existsSync(src)) return;
    copyRecursive(src, path.join(skillRoot, dirName));
  });

  config.runtimeFiles.forEach((fileName) => {
    const src = path.join(sourceRoot, fileName);
    if (!fs.existsSync(src)) return;
    if (fileName === 'SKILL.md') {
      const transformed = transformGeminiSkillContent(fs.readFileSync(src, 'utf8'));
      fs.writeFileSync(path.join(skillRoot, fileName), transformed);
      return;
    }
    copyRecursive(src, path.join(skillRoot, fileName));
  });

  listTopLevelSkillDirs(sourceRoot, 'gemini').forEach((skillDirName) => {
    const srcDir = path.join(sourceRoot, skillDirName);
    const destDir = path.join(skillRoot, skillDirName);
    copySkillRuntimeFiles(srcDir, destDir, { transformSkill: transformGeminiSkillContent });

    const content = fs.readFileSync(path.join(srcDir, 'SKILL.md'), 'utf8');
    const { name, description } = extractNameAndDescription(content);
    const skillPath = `~/.gemini/skills/gstack/${skillDirName}/SKILL.md`;
    const commandNames = [name, ...((config.commandAliases && config.commandAliases[name]) || [])];

    commandNames.forEach((commandName) => {
      const relPath = `commands/${commandName}.toml`;
      backupPathIfExists(
        path.join(commandsRoot, `${commandName}.toml`),
        path.join(backupDir, 'gemini', relPath),
        manifest,
        'gemini',
        relPath,
        info
      );
      fs.writeFileSync(
        path.join(commandsRoot, `${commandName}.toml`),
        buildGeminiCommand(commandName, description, skillPath)
      );
      manifest.installed.push({ root: 'gemini', path: relPath });
    });
  });

  manifest.installed.push({ root: 'gemini', path: 'skills/gstack' });
  ok('gemini/skills/gstack (gstack runtime)');
  return { installed: true, reason: null };
}

module.exports = {
  rewriteGeminiPaths,
  transformGeminiSkillContent,
  buildGeminiCommand,
  installToHost,
};
