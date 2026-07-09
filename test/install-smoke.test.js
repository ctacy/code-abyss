'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const gstackFixture = path.join(__dirname, 'fixtures', 'gstack-codex-source');

describe('install cli styles', () => {
  test('--list-styles 列出可用风格', () => {
    const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'install.js'), '--list-styles'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('abyss-cultivator');
    expect(result.stdout).toContain('scholar-classic');
  });
});

describe('claude install smoke', () => {
  let tmpHome;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-claude-home-'));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function runInstall(args) {
    return spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'install.js'), ...args], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        HOME: tmpHome,
        USERPROFILE: tmpHome,
        CODE_ABYSS_GSTACK_SOURCE: gstackFixture,
      },
      encoding: 'utf8',
    });
  }

  test('安装 Claude 时生成 commands 与 settings.json', () => {
    const result = runInstall(['--target', 'claude', '-y']);
    const claudeDir = path.join(tmpHome, '.claude');

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(claudeDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'skills'))).toBe(true);
    // cultivating-skills / cultivating-personas 是 user-invocable，会生成 commands
    expect(fs.existsSync(path.join(claudeDir, 'commands'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'cultivating-skills.md'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'cultivating-personas.md'))).toBe(true);
    // 但旧的非 invocable skill 不应有 commands
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'gen-docs.md'))).toBe(false);
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'review.md'))).toBe(false);
    expect(fs.existsSync(path.join(claudeDir, 'skills', 'gstack'))).toBe(false);
    expect(fs.existsSync(path.join(claudeDir, 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, '.code-abyss-uninstall.js'))).toBe(true);

    // V5.3: character Stop-hook default-on for claude
    const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
    const stop = settings.hooks && settings.hooks.Stop;
    expect(Array.isArray(stop)).toBe(true);
    expect(JSON.stringify(stop)).toContain('_kernel/character/hooks');
    expect(JSON.stringify(stop)).toContain('check_banned_openers.py');

    // V5.4: inject plane artifact (judgment map, not full kernel bodies)
    const injectPath = path.join(claudeDir, '.code-abyss-inject.md');
    expect(fs.existsSync(injectPath)).toBe(true);
    const injectBody = fs.readFileSync(injectPath, 'utf8');
    expect(injectBody).toContain('code-abyss-inject-plane');
    expect(injectBody).toContain('skills/_kernel/security');
    expect(injectBody).toContain('skills/_kernel/doctrine');
    expect(injectBody).toContain('securing-systems');
  });

  test('--no-enforcement 跳过 character Stop-hook', () => {
    const result = runInstall(['--target', 'claude', '-y', '--no-enforcement']);
    expect(result.status).toBe(0);
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpHome, '.claude', 'settings.json'), 'utf8')
    );
    const blob = JSON.stringify(settings.hooks || {});
    expect(blob).not.toContain('check_banned_openers.py');
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/--no-enforcement/);
  });

  test('安装 Claude 时支持 --style 切换 outputStyle', () => {
    const result = runInstall(['--target', 'claude', '--style', 'scholar-classic', '-y']);
    const claudeDir = path.join(tmpHome, '.claude');
    const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));

    expect(result.status).toBe(0);
    expect(settings.outputStyle).toBe('scholar-classic');
  });

  test('用户自定义 skills 在 install / uninstall 全周期中存活（child-level 安装）', () => {
    const claudeDir = path.join(tmpHome, '.claude');
    const userSkillDir = path.join(claudeDir, 'skills', 'my-custom');
    fs.mkdirSync(userSkillDir, { recursive: true });
    fs.writeFileSync(
      path.join(userSkillDir, 'SKILL.md'),
      '---\nname: my-custom\ndescription: user owned\nuser-invocable: false\n---\n# user content\n'
    );

    const install = runInstall(['--target', 'claude', '-y']);
    expect(install.status).toBe(0);
    expect(fs.existsSync(path.join(userSkillDir, 'SKILL.md'))).toBe(true);

    // manifest 应记录 children-level 条目而非整目录
    const manifest = JSON.parse(
      fs.readFileSync(path.join(claudeDir, '.code-abyss-backup', 'manifest.json'), 'utf8')
    );
    const installedPaths = manifest.installed.map((e) => (typeof e === 'string' ? e : e.path));
    expect(installedPaths).toContain('skills/analyzing-changes');
    expect(installedPaths).not.toContain('skills');

    const uninstall = runInstall(['--uninstall', 'claude']);
    expect(uninstall.status).toBe(0);
    expect(fs.existsSync(path.join(userSkillDir, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'skills', 'analyzing-changes'))).toBe(false);
  });
});

describe('codex install smoke', () => {
  let tmpHome;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-codex-home-'));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function runInstall(args) {
    return spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'install.js'), ...args], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        HOME: tmpHome,
        USERPROFILE: tmpHome,
      },
      encoding: 'utf8',
    });
  }

  test('安装 Codex 时生成 instruction.md + skills 且不写 settings.json', () => {
    const result = runInstall(['--target', 'codex', '-y']);
    const codexDir = path.join(tmpHome, '.codex');

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(codexDir, 'instruction.md'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'AGENTS.md'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'bin', 'lib'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'config.toml'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'full_auto.config.toml'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'full_access.config.toml'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'settings.json'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'prompts'))).toBe(false);
    expect(fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8')).not.toContain('[profiles.full_');
    const instructionMd = fs.readFileSync(path.join(codexDir, 'instruction.md'), 'utf8');
    expect(instructionMd).toContain('宿命深渊');
  });

  test('安装 Codex 时会清理旧 prompts 残留', () => {
    const codexDir = path.join(tmpHome, '.codex');
    fs.mkdirSync(path.join(codexDir, 'prompts'), { recursive: true });
    fs.writeFileSync(path.join(codexDir, 'prompts', 'old.md'), 'legacy\n');

    const result = runInstall(['--target', 'codex', '-y']);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(codexDir, 'prompts'))).toBe(false);
    expect(result.stdout).toContain('移除 legacy prompts/');
  });

  test('安装 Codex 时支持 --style 切换风格', () => {
    const result = runInstall(['--target', 'codex', '--style', 'scholar-classic', '-y']);
    const codexDir = path.join(tmpHome, '.codex');

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(codexDir, 'instruction.md'))).toBe(true);
    const instructionMd = fs.readFileSync(path.join(codexDir, 'instruction.md'), 'utf8');
    expect(instructionMd).toContain('墨渊书阁');
  });

  test('安装 Codex 时会迁移旧 settings.json，卸载后恢复', () => {
    const codexDir = path.join(tmpHome, '.codex');
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(path.join(codexDir, 'settings.json'), '{"legacy":true}\n');

    const install = runInstall(['--target', 'codex', '-y']);

    expect(install.status).toBe(0);
    expect(fs.existsSync(path.join(codexDir, 'settings.json'))).toBe(false);
    expect(install.stdout).toContain('移除 legacy settings.json');
    expect(fs.existsSync(path.join(codexDir, 'skills'))).toBe(true);

    const uninstall = runInstall(['--uninstall', 'codex']);
    expect(uninstall.status).toBe(0);
    expect(fs.readFileSync(path.join(codexDir, 'settings.json'), 'utf8')).toContain('legacy');
    expect(fs.existsSync(path.join(codexDir, 'skills'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'config.toml'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'full_auto.config.toml'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'full_access.config.toml'))).toBe(false);
  });

  test('Codex 重装后卸载不恢复上一轮 code-abyss 管理文件', () => {
    const first = runInstall(['--target', 'codex', '-y']);
    expect(first.status).toBe(0);

    const second = runInstall(['--target', 'codex', '-y']);
    expect(second.status).toBe(0);

    const codexDir = path.join(tmpHome, '.codex');
    const uninstall = runInstall(['--uninstall', 'codex']);
    expect(uninstall.status).toBe(0);

    expect(fs.existsSync(path.join(codexDir, 'skills'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'bin'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'config.toml'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'instruction.md'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'full_auto.config.toml'))).toBe(false);
    expect(fs.existsSync(path.join(codexDir, 'full_access.config.toml'))).toBe(false);
  });

  test('Codex 卸载会恢复用户原有 config.toml', () => {
    const codexDir = path.join(tmpHome, '.codex');
    fs.mkdirSync(codexDir, { recursive: true });
    const original = ['model = "custom-model"', 'model_provider = "custom"', '', '[projects."/tmp/demo"]', 'trust_level = "trusted"', ''].join('\n');
    fs.writeFileSync(path.join(codexDir, 'config.toml'), original);

    const install = runInstall(['--target', 'codex', '-y']);
    expect(install.status).toBe(0);
    // V5.1: code-abyss no longer injects graph hooks (abyss attach owns that)
    expect(fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8')).not.toContain('[[hooks.PreToolUse]]');
    expect(fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8')).toContain('model = "custom-model"');

    const uninstall = runInstall(['--uninstall', 'codex']);
    expect(uninstall.status).toBe(0);
    expect(fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8')).toBe(original);
  });

  test('codex install 永不注入 graph hooks；--with-hooks 仅引导 abyss attach', () => {
    const codexDir = path.join(tmpHome, '.codex');
    fs.mkdirSync(codexDir, { recursive: true });
    const original = ['model = "custom-model"', ''].join('\n');
    fs.writeFileSync(path.join(codexDir, 'config.toml'), original);

    const install = runInstall(['--target', 'codex', '-y', '--with-hooks']);
    expect(install.status).toBe(0);
    const cfg = fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8');
    expect(cfg).not.toContain('[[hooks.PreToolUse]]');
    expect(cfg).not.toContain('[[hooks.SessionStart]]');
    expect(`${install.stdout}\n${install.stderr}`).toMatch(/abyss attach codex/);
  });

  test('默认 install 不注入 graph hooks', () => {
    const codexDir = path.join(tmpHome, '.codex');
    fs.mkdirSync(codexDir, { recursive: true });
    const original = ['model = "custom-model"', ''].join('\n');
    fs.writeFileSync(path.join(codexDir, 'config.toml'), original);

    const install = runInstall(['--target', 'codex', '-y']);
    expect(install.status).toBe(0);
    expect(fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8')).not.toContain('[[hooks.PreToolUse]]');
    expect(fs.readFileSync(path.join(codexDir, 'config.toml'), 'utf8')).not.toContain('[[hooks.SessionStart]]');
  });
});

describe('gemini install smoke', () => {
  let tmpHome;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-gemini-home-'));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function runInstall(args) {
    return spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'install.js'), ...args], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        HOME: tmpHome,
        USERPROFILE: tmpHome,
        CODE_ABYSS_GSTACK_SOURCE: gstackFixture,
      },
      encoding: 'utf8',
    });
  }

  test('安装 Gemini 时生成 GEMINI.md、skills、commands 与 settings.json', () => {
    const result = runInstall(['--target', 'gemini', '-y']);
    const geminiDir = path.join(tmpHome, '.gemini');
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(geminiDir, 'GEMINI.md'))).toBe(true);
    expect(fs.existsSync(path.join(geminiDir, 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(geminiDir, 'commands', 'gen-docs.toml'))).toBe(false);
    expect(fs.existsSync(path.join(geminiDir, 'commands', 'review.toml'))).toBe(false);
    expect(fs.existsSync(path.join(geminiDir, 'skills', 'gstack'))).toBe(false);
    expect(fs.existsSync(path.join(geminiDir, 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(geminiDir, '.code-abyss-uninstall.js'))).toBe(true);
  });

  test('安装 Gemini 时支持 --style 切换 GEMINI.md', () => {
    const result = runInstall(['--target', 'gemini', '--style', 'scholar-classic', '-y']);
    const geminiDir = path.join(tmpHome, '.gemini');
    const content = fs.readFileSync(path.join(geminiDir, 'GEMINI.md'), 'utf8');

    expect(result.status).toBe(0);
    expect(content).toContain('# 墨渊书阁 · 输出之道');
  });
});

describe('openclaw install smoke', () => {
  let tmpHome;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-openclaw-home-'));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function runInstall(args) {
    return spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'install.js'), ...args], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        HOME: tmpHome,
        USERPROFILE: tmpHome,
      },
      encoding: 'utf8',
    });
  }

  test('安装 OpenClaw 时写入 shared skills + workspace AGENTS/SOUL', () => {
    const result = runInstall(['--target', 'openclaw', '-y']);
    const rootDir = path.join(tmpHome, '.openclaw');
    const workspaceDir = path.join(rootDir, 'workspace');

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(rootDir, 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceDir, 'SOUL.md'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, '.code-abyss-uninstall.js'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'commands'))).toBe(false);
  });

  test('安装 OpenClaw 时尊重 agents.defaults.workspace 自定义路径', () => {
    const rootDir = path.join(tmpHome, '.openclaw');
    const customWorkspace = path.join(tmpHome, 'lab', 'openclaw-workspace');
    fs.mkdirSync(rootDir, { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, 'openclaw.json'),
      JSON.stringify({ agents: { defaults: { workspace: customWorkspace } } }, null, 2) + '\n'
    );

    const result = runInstall(['--target', 'openclaw', '--style', 'scholar-classic', '-y']);
    const soulContent = fs.readFileSync(path.join(customWorkspace, 'SOUL.md'), 'utf8');

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(customWorkspace, 'AGENTS.md'))).toBe(true);
    expect(soulContent).toContain('# 墨渊书阁 · 输出之道');
  });

  test('卸载 OpenClaw 时恢复原 workspace bootstrap 文件', () => {
    const rootDir = path.join(tmpHome, '.openclaw');
    const workspaceDir = path.join(rootDir, 'workspace');
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.writeFileSync(path.join(workspaceDir, 'AGENTS.md'), '# legacy agents\n');
    fs.writeFileSync(path.join(workspaceDir, 'SOUL.md'), '# legacy soul\n');

    const install = runInstall(['--target', 'openclaw', '-y']);
    expect(install.status).toBe(0);
    expect(fs.readFileSync(path.join(workspaceDir, 'AGENTS.md'), 'utf8')).not.toContain('legacy');

    const uninstall = runInstall(['--uninstall', 'openclaw']);
    expect(uninstall.status).toBe(0);
    expect(fs.readFileSync(path.join(workspaceDir, 'AGENTS.md'), 'utf8')).toContain('legacy agents');
    expect(fs.readFileSync(path.join(workspaceDir, 'SOUL.md'), 'utf8')).toContain('legacy soul');
    expect(fs.existsSync(path.join(rootDir, 'skills'))).toBe(false);
  });
});
