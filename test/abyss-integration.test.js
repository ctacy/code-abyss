'use strict';

// abyss 联动层测试（Agent OS v5.1 kill foyer）：
// graph hook 注入已移除（→ abyss attach）；保留 strip / detect / MCP shape / lock tools / manifest。

const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  HOOK_MARKER,
  resolveAbyssHookDir,
  stripAbyssHooks,
  compareVersions,
  satisfiesMin,
  checkLockToolRequirement,
  buildMcpEntry,
  injectGeminiMcp,
  injectClaudeMcp,
  MIN_ABYSS_VERSION,
  SKILL_MANIFEST_AVAILABLE_FROM,
  tryReadAbyssManifest,
  summarizeAbyssManifest,
  resolveAbyssMcpTools,
} = require('../bin/lib/abyss-integration.js');

const {
  injectCodexMcp,
  stripCodexAbyssIntegration,
  stripLegacyCodexAbyssFromConfig,
} = require('../bin/adapters/codex.js');

const TARGET_DIR = path.join('/home/user', '.claude');
const HOOK_DIR = path.join(TARGET_DIR, 'skills', 'indexing-code', 'hooks', 'common');

function fixtureClaudeHooks(targetDir = TARGET_DIR) {
  const hookDir = path.join(targetDir, 'skills', 'indexing-code', 'hooks', 'common');
  return {
    hooks: {
      SessionStart: [{
        matcher: '',
        hooks: [{ type: 'command', command: `bash "${path.join(hookDir, 'session-init.sh')}"`, timeout: 10 }],
      }],
      PreToolUse: [{
        matcher: 'Edit|Write',
        hooks: [{ type: 'command', command: `bash "${path.join(hookDir, 'pre-edit-check.sh')}"`, timeout: 5 }],
      }],
    },
  };
}

function fixtureCodexAbyssHooks(hookDir) {
  return [
    '[[hooks.SessionStart]]',
    'matcher = "startup|resume"',
    '',
    '[[hooks.SessionStart.hooks]]',
    'type = "command"',
    `command = "bash \\"${hookDir}/session-init.sh\\""`,
    'timeout = 10',
    'statusMessage = "abyss: checking index"',
    '',
    '[[hooks.PreToolUse]]',
    'matcher = "Bash|shell|apply_patch|Edit|Write"',
    '',
    '[[hooks.PreToolUse.hooks]]',
    'type = "command"',
    `command = "bash \\"${hookDir}/pre-edit-check.sh\\""`,
    'timeout = 5',
    'statusMessage = "abyss: checking callers"',
    '',
  ].join('\n');
}

describe('卸载残留剥除 (claude/gemini settings)', () => {
  test('stripAbyssHooks 只剥我方条目，空事件键收口', () => {
    const settings = fixtureClaudeHooks();
    settings.hooks.PreToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'user-guard.sh' }] });
    expect(stripAbyssHooks(settings)).toBe(true);
    expect(settings.hooks.SessionStart).toBeUndefined();
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(JSON.stringify(settings.hooks.PreToolUse[0])).toContain('user-guard');
  });

  test('stripAbyssHooks 全空时移除 hooks 容器，无我方条目返回 false', () => {
    const settings = fixtureClaudeHooks();
    expect(stripAbyssHooks(settings)).toBe(true);
    expect(settings.hooks).toBeUndefined();
    expect(stripAbyssHooks({ hooks: { PreToolUse: [{ matcher: 'x' }] } })).toBe(false);
  });

  test('stripAbyssHooks 识别 HOOK_MARKER 路径', () => {
    const settings = {
      hooks: {
        PreToolUse: [{
          matcher: 'Edit|Write',
          hooks: [{ type: 'command', command: `bash "/tmp/npx-cache/skills/${HOOK_MARKER}/pre-edit-check.sh"` }],
        }],
      },
    };
    expect(stripAbyssHooks(settings)).toBe(true);
    expect(settings.hooks).toBeUndefined();
  });
});

describe('codex TOML 残留剥除', () => {
  const CODEX_HOOK_DIR = '/home/user/.codex/skills/indexing-code/hooks/common';

  test('stripCodexAbyssIntegration 剥除带标记 hook 节 + mcp 节，保留用户节', () => {
    let cfg = 'model = "gpt"\n\n[profiles.full_auto]\napproval_policy = "on-request"\n\n';
    cfg += fixtureCodexAbyssHooks(CODEX_HOOK_DIR);
    cfg = injectCodexMcp(cfg, 'abyss', '\n');
    const { merged, removed } = stripCodexAbyssIntegration(cfg);
    expect(removed).toBe(true);
    expect(merged).not.toContain('indexing-code');
    expect(merged).not.toContain('mcp_servers.abyss');
    expect(merged).toContain('model = "gpt"');
    expect(merged).toContain('[profiles.full_auto]');
  });

  test('stripCodexAbyssIntegration 不动用户自有 hook 节', () => {
    const cfg = '[hooks.PreToolUse]\nmatcher = "Bash"\ncommand = "my-guard.sh"\n';
    const { merged, removed } = stripCodexAbyssIntegration(cfg);
    expect(removed).toBe(false);
    expect(merged).toContain('my-guard.sh');
  });

  test('MCP 节 shape 助手幂等（客户端自管参考）', () => {
    let merged = injectCodexMcp('', '/opt/bin/abyss', '\n');
    merged = injectCodexMcp(merged, '/opt/bin/abyss', '\n');
    expect((merged.match(/\[mcp_servers\.abyss\]/g) || []).length).toBe(1);
    expect(merged).toContain('command = "/opt/bin/abyss"');
    expect(merged).toContain('args = ["mcp"]');
  });

  test('stripLegacyCodexAbyssFromConfig 写回文件', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-strip-'));
    try {
      const cfgPath = path.join(tmp, 'config.toml');
      fs.writeFileSync(cfgPath, `model = "x"\n\n${fixtureCodexAbyssHooks(CODEX_HOOK_DIR)}`);
      const r = stripLegacyCodexAbyssFromConfig(cfgPath);
      expect(r.removed).toBe(true);
      const out = fs.readFileSync(cfgPath, 'utf8');
      expect(out).toContain('model = "x"');
      expect(out).not.toContain('indexing-code');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('hook shell wrapper', () => {
  test('pre-edit-check normalizes Codex apply_patch payload to file_path input', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-hook-'));
    try {
      const fakeAbyss = path.join(tmp, 'abyss');
      const captured = path.join(tmp, 'stdin.json');
      fs.writeFileSync(fakeAbyss, `#!/usr/bin/env bash\ncat > "${captured}"\n`, { mode: 0o755 });
      const hook = path.join(__dirname, '..', 'skills', 'indexing-code', 'hooks', 'common', 'pre-edit-check.sh');
      const payload = JSON.stringify({
        tool_name: 'apply_patch',
        tool_input: {
          patch: '*** Begin Patch\n*** Update File: bin/adapters/codex.js\n@@\n*** End Patch\n',
        },
      });
      const { spawnSync } = require('child_process');
      const result = spawnSync('bash', [hook], {
        input: payload,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${tmp}:${process.env.PATH || ''}` },
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(fs.readFileSync(captured, 'utf8'))).toEqual({
        tool_name: 'Edit',
        tool_input: { file_path: 'bin/adapters/codex.js' },
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('版本契约', () => {
  test('compareVersions 基本序', () => {
    expect(compareVersions('0.3.1', '0.3.0')).toBeGreaterThan(0);
    expect(compareVersions('0.3.0', '0.3.0')).toBe(0);
    expect(compareVersions('0.2.9', '0.3.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '0.9.9')).toBeGreaterThan(0);
  });

  test('satisfiesMin 拒绝缺失与过旧（针对当前 MIN_ABYSS_VERSION 锁）', () => {
    expect(satisfiesMin('0.5.20', MIN_ABYSS_VERSION)).toBe(true);
    expect(satisfiesMin('0.5.23', MIN_ABYSS_VERSION)).toBe(true);
    expect(satisfiesMin('0.5.19', MIN_ABYSS_VERSION)).toBe(false);
    expect(satisfiesMin('0.3.1', MIN_ABYSS_VERSION)).toBe(false);
    expect(satisfiesMin(null, MIN_ABYSS_VERSION)).toBe(false);
  });

  test('SKILL_MANIFEST_AVAILABLE_FROM 在 MIN_ABYSS_VERSION 之上', () => {
    expect(compareVersions(SKILL_MANIFEST_AVAILABLE_FROM, MIN_ABYSS_VERSION)).toBeGreaterThanOrEqual(0);
    expect(satisfiesMin('0.5.21', SKILL_MANIFEST_AVAILABLE_FROM)).toBe(false);
    expect(satisfiesMin('0.5.22', SKILL_MANIFEST_AVAILABLE_FROM)).toBe(true);
  });

  test('checkLockToolRequirement 覆盖缺失/过旧/满足/无声明', () => {
    const lock = { tools: { abyss: '>=0.3.1' } };
    expect(checkLockToolRequirement(lock, null)).toMatchObject({ ok: false, reason: 'missing' });
    expect(checkLockToolRequirement(lock, { version: '0.3.0' })).toMatchObject({ ok: false, reason: 'outdated' });
    expect(checkLockToolRequirement(lock, { version: '0.4.0' })).toMatchObject({ ok: true });
    expect(checkLockToolRequirement({}, { version: '0.4.0' })).toBeNull();
    expect(checkLockToolRequirement({ tools: { abyss: 'banana' } }, { version: '0.4.0' }))
      .toMatchObject({ ok: false, reason: 'unparsable' });
  });

  test('裸版本号视为 >=', () => {
    expect(checkLockToolRequirement({ tools: { abyss: '0.3.0' } }, { version: '0.3.1' }))
      .toMatchObject({ ok: true });
  });
});

describe('MCP 条目 shape（安装器不写，助手保留）', () => {
  test('buildMcpEntry 默认 abyss，managed 路径透传', () => {
    expect(buildMcpEntry(null)).toEqual({ command: 'abyss', args: ['mcp'] });
    expect(buildMcpEntry('/home/u/.code-abyss/bin/abyss').command).toBe('/home/u/.code-abyss/bin/abyss');
  });

  test('injectGeminiMcp 幂等且保留其他 server', () => {
    const settings = { mcpServers: { other: { command: 'x' } } };
    injectGeminiMcp(settings, 'abyss');
    injectGeminiMcp(settings, 'abyss');
    expect(Object.keys(settings.mcpServers).sort()).toEqual(['abyss', 'other']);
  });

  test('injectClaudeMcp 写 ~/.claude.json 并保留已有内容', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-mcp-'));
    try {
      fs.writeFileSync(path.join(tmpHome, '.claude.json'), JSON.stringify({ projects: { '/x': {} }, mcpServers: { other: { command: 'x' } } }));
      const r = injectClaudeMcp({ HOME: tmpHome, binPath: 'abyss' });
      expect(r.written).toBe(true);
      const cfg = JSON.parse(fs.readFileSync(r.cfgPath, 'utf8'));
      expect(cfg.mcpServers.abyss).toEqual({ command: 'abyss', args: ['mcp'] });
      expect(cfg.mcpServers.other).toEqual({ command: 'x' });
      expect(cfg.projects).toEqual({ '/x': {} });
    } finally {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
  });

  test('损坏的 ~/.claude.json 不覆盖', () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-mcp-'));
    try {
      fs.writeFileSync(path.join(tmpHome, '.claude.json'), '{broken');
      const r = injectClaudeMcp({ HOME: tmpHome, binPath: 'abyss' });
      expect(r.written).toBe(false);
      expect(fs.readFileSync(path.join(tmpHome, '.claude.json'), 'utf8')).toBe('{broken');
    } finally {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
  });
});

describe('kill foyer：abyss-binary 已移除', () => {
  test('bin/lib/abyss-binary.js 不存在', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'bin', 'lib', 'abyss-binary.js'))).toBe(false);
  });

  test('install help 不再列出 --with-abyss / --with-mcp 为可用 flag', () => {
    const { spawnSync } = require('child_process');
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'install.js'), '--help'], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    const out = `${r.stdout}\n${r.stderr}`;
    expect(out).toContain('--with-hooks');
    expect(out).toContain('abyss attach');
    // help text must not advertise removed flags as active options
    expect(out).not.toMatch(/--with-abyss\s+.*download/i);
    expect(out).not.toMatch(/--with-mcp\s+.*register/i);
  });
});

describe('hook 目录解析', () => {
  test('resolveAbyssHookDir 指向安装树而非包根', () => {
    const dir = resolveAbyssHookDir('/home/u/.claude');
    expect(dir).toBe(path.join('/home/u/.claude', 'skills', 'indexing-code', 'hooks', 'common'));
    expect(dir).toContain(HOOK_MARKER.split('/')[0]);
  });
});

describe('skill-manifest 能力发现', () => {
  test('abyss 不在 PATH 且 ~/.code-abyss/bin 也没有时返回 null', () => {
    expect(tryReadAbyssManifest({ binPath: '/no/such/abyss-bin-for-manifest-test' })).toBeNull();
  });

  test('显式 binPath 指向不存在的文件返回 null（不抛）', () => {
    expect(tryReadAbyssManifest({ binPath: '/no/such/abyss-bin-xyz' })).toBeNull();
  });

  const realAbyss = process.env.ABYSS_BIN
    || (fs.existsSync('/home/telagod/project/code-abyss-dev/target/release/abyss')
      ? '/home/telagod/project/code-abyss-dev/target/release/abyss'
      : null);
  const maybeIt = realAbyss ? test : test.skip;

  maybeIt('真实 abyss skill-manifest --compact 可解析', () => {
    const m = tryReadAbyssManifest({ binPath: realAbyss, timeoutMs: 5000 });
    expect(m).toBeTruthy();
    expect(m.schema_version).toBe(1);
    const line = summarizeAbyssManifest(m);
    expect(line).toMatch(/abyss v/);
    const tools = resolveAbyssMcpTools(m);
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });
});
