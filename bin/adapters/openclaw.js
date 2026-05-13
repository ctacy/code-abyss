'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getPackHostFiles } = require(path.join(__dirname, '..', 'lib', 'pack-registry.js'));

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const OPENCLAW_ROOT_REL = '.openclaw';
const DEFAULT_WORKSPACE_REL = path.join(OPENCLAW_ROOT_REL, 'workspace');

function expandHome(input, HOME) {
  if (typeof input !== 'string' || input.trim() === '') return null;
  const trimmed = input.trim();
  if (trimmed === '~') return HOME;
  if (trimmed.startsWith('~/')) return path.join(HOME, trimmed.slice(2));
  return path.resolve(trimmed);
}

function readOpenClawConfig({ HOME, warn = () => {} }) {
  const rootDir = path.join(HOME, OPENCLAW_ROOT_REL);
  const configPath = path.join(rootDir, 'openclaw.json');
  if (!fs.existsSync(configPath)) {
    return { rootDir, configPath, config: null };
  }

  try {
    return {
      rootDir,
      configPath,
      config: JSON.parse(fs.readFileSync(configPath, 'utf8')),
    };
  } catch (error) {
    warn(`openclaw.json 解析失败，回退默认 workspace: ${error.message}`);
    return { rootDir, configPath, config: null };
  }
}

function resolveOpenClawRuntime({ HOME, warn = () => {} }) {
  const { rootDir, configPath, config } = readOpenClawConfig({ HOME, warn });
  const configuredWorkspace = config && config.agents && config.agents.defaults
    ? config.agents.defaults.workspace
    : null;

  const workspaceDir = expandHome(configuredWorkspace, HOME) || path.join(HOME, DEFAULT_WORKSPACE_REL);

  return {
    rootDir,
    configPath,
    config,
    configExists: fs.existsSync(configPath),
    workspaceDir,
  };
}

function detectOpenClawEnvironment({ HOME, warn = () => {} }) {
  const runtime = resolveOpenClawRuntime({ HOME, warn });
  const probe = spawnSync('openclaw', ['--version'], { encoding: 'utf8' });
  const cliAvailable = !probe.error && probe.status === 0;

  return {
    runtime,
    cliAvailable,
    detail: cliAvailable
      ? ((probe.stdout || probe.stderr || '').trim().split(/\r?\n/)[0] || 'openclaw --version')
      : '未检测到 openclaw CLI',
  };
}

function getOpenClawCoreFiles() {
  return getPackHostFiles(PROJECT_ROOT, 'abyss', 'openclaw');
}

async function postOpenClaw({ runtime, HOME, step, ok, warn, info, c }) {
  step(2, 3, '运行时检测');
  const envState = detectOpenClawEnvironment({ HOME, warn });
  if (envState.cliAvailable) ok(`${c.b('cli')} → ${envState.detail}`);
  else warn(envState.detail);

  if (envState.runtime.configExists) ok(`${c.b('config')} → ${envState.runtime.configPath}`);
  else info(`未检测到 ${c.cyn(envState.runtime.configPath)}，将按默认布局安装`);

  info(`workspace → ${c.cyn(runtime.workspaceDir)}`);

  step(3, 3, '可选配置');
  ok('OpenClaw 无额外推荐配置，核心文件已就位');
}

module.exports = {
  OPENCLAW_ROOT_REL,
  DEFAULT_WORKSPACE_REL,
  readOpenClawConfig,
  resolveOpenClawRuntime,
  detectOpenClawEnvironment,
  getOpenClawCoreFiles,
  postOpenClaw,
};
