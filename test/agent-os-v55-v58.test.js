'use strict';

const path = require('path');
const fs = require('fs');
const { renderPersonaIdentity, NEUTRAL_FALLBACK_PERSONA, NEUTRAL_FALLBACK_MARKER } = require('../bin/lib/persona-voice-card');

const projectRoot = path.join(__dirname, '..');

describe('v5.8 visible neutral fallback marker', () => {
  test('renderPersonaIdentity includes visible marker for neutral fallback', () => {
    const md = renderPersonaIdentity({ ...NEUTRAL_FALLBACK_PERSONA });
    expect(md).toContain(NEUTRAL_FALLBACK_MARKER);
    expect(md).toContain('## 人格');
  });
});

describe('v5.8 release workflow packs parity', () => {
  test('release.yml runs packs:check and vendor-sync --check', () => {
    const yml = fs.readFileSync(path.join(projectRoot, '.github', 'workflows', 'release.yml'), 'utf8');
    expect(yml).toContain('packs:check');
    expect(yml).toMatch(/packs:vendor:sync/);
    expect(yml).toContain('score:mechanical');
  });

  test('release.yml publishes prereleases under npm dist-tag rc', () => {
    const yml = fs.readFileSync(path.join(projectRoot, '.github', 'workflows', 'release.yml'), 'utf8');
    expect(yml).toMatch(/--tag rc/);
    expect(yml).toMatch(/rc\|alpha\|beta\|pre/);
  });
});

describe('package version is rc until stable 5.0.0', () => {
  test('package.json is 5.0.0-rc.N prerelease', () => {
    const v = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version;
    expect(v).toMatch(/^5\.0\.0-rc\.\d+$/);
  });
});

describe('v5.1..v5.4 regression guards', () => {
  test('abyss-binary.js still absent', () => {
    expect(fs.existsSync(path.join(projectRoot, 'bin', 'lib', 'abyss-binary.js'))).toBe(false);
  });

  test('inject-plane module still exports DOMAIN_SKILL_MAP', () => {
    const { DOMAIN_SKILL_MAP, resolveTrigger } = require('../bin/lib/inject-plane');
    expect(Object.keys(DOMAIN_SKILL_MAP)).toHaveLength(16);
    expect(resolveTrigger({ kind: 'done-gate' }).bundles).toContain('doctrine');
  });
});
