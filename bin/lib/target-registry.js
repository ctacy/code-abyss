'use strict';

const INSTALL_TARGETS = Object.freeze([
  {
    name: 'claude',
    label: 'Claude Code',
    actionLabel: 'Claude Code',
    homeDir: '.claude',
  },
  {
    name: 'codex',
    label: 'Codex CLI',
    actionLabel: 'Codex CLI',
    homeDir: '.codex',
  },
  {
    name: 'gemini',
    label: 'Gemini CLI',
    actionLabel: 'Gemini CLI',
    homeDir: '.gemini',
  },
]);

const MANAGED_ROOTS = Object.freeze({
  claude: '.claude',
  codex: '.codex',
  agents: '.agents',
  gemini: '.gemini',
});

function listInstallTargets() {
  return INSTALL_TARGETS.slice();
}

function listTargetNames() {
  return INSTALL_TARGETS.map((target) => target.name);
}

function isSupportedTarget(targetName) {
  return listTargetNames().includes(targetName);
}

function getTargetMeta(targetName) {
  return INSTALL_TARGETS.find((target) => target.name === targetName) || null;
}

function getManagedRootNames() {
  return Object.keys(MANAGED_ROOTS);
}

function isManagedRoot(rootName) {
  return Object.prototype.hasOwnProperty.call(MANAGED_ROOTS, rootName);
}

function getManagedRootRelativeDir(rootName) {
  if (!isManagedRoot(rootName)) {
    throw new Error(`不支持的安装根: ${rootName}`);
  }
  return MANAGED_ROOTS[rootName];
}

function formatTargetList(joiner = '|') {
  return listTargetNames().join(joiner);
}

module.exports = {
  listInstallTargets,
  listTargetNames,
  isSupportedTarget,
  getTargetMeta,
  getManagedRootNames,
  getManagedRootRelativeDir,
  formatTargetList,
};
