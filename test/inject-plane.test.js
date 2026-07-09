'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  DOMAIN_SKILL_MAP,
  resolveTrigger,
  renderKernelRouterMd,
  renderInjectArtifactMd,
  writeInjectArtifact,
  stripInjectArtifact,
  injectArtifactPath,
  kernelSkillPath,
  requiredRouterBundles,
  INJECT_MARKER,
  INJECT_REL_PATH,
} = require('../bin/lib/inject-plane');

const { loadSharedBehavior, renderRuntimeGuidance } = require('../bin/lib/style-registry');

const projectRoot = path.join(__dirname, '..');

describe('inject-plane trigger table', () => {
  test('DOMAIN_SKILL_MAP has exactly 16 domain-gate skills', () => {
    expect(Object.keys(DOMAIN_SKILL_MAP)).toHaveLength(16);
  });

  test('resolveTrigger: done-gate kind → doctrine', () => {
    const r = resolveTrigger({ kind: 'done-gate' });
    expect(r.bundles).toContain('doctrine');
    expect(r.reasons.some((x) => x.startsWith('kind:'))).toBe(true);
  });

  test('resolveTrigger: done-gate text fixture → doctrine', () => {
    const r = resolveTrigger({ text: 'Is this done? Can we ship?' });
    expect(r.bundles).toContain('doctrine');
  });

  test('resolveTrigger: security path → security', () => {
    const r = resolveTrigger({ path: 'src/auth/oauth/session.ts' });
    expect(r.bundles).toContain('security');
  });

  test('resolveTrigger: security keywords → security', () => {
    const r = resolveTrigger({ text: 'Please threat model this API for IDOR' });
    expect(r.bundles).toContain('security');
  });

  test('resolveTrigger: every DOMAIN_SKILL_MAP skill returns its domain from production table', () => {
    for (const [skill, domain] of Object.entries(DOMAIN_SKILL_MAP)) {
      const r = resolveTrigger({ skill });
      expect(r.bundles).toContain(domain);
      expect(r.reasons).toContain(`skill:${skill}`);
    }
  });

  test('resolveTrigger: sample path/text fixtures for frontend/backend/hardware/ml', () => {
    expect(resolveTrigger({ path: 'app/components/Button.tsx' }).bundles).toContain('frontend');
    expect(resolveTrigger({ path: 'services/api/handler.go' }).bundles).toContain('backend');
    expect(resolveTrigger({ path: 'board/main.kicad_pcb' }).bundles).toContain('hardware');
    expect(resolveTrigger({ path: 'models/training/run.py' }).bundles).toContain('ml');
  });
});

describe('inject-plane router generation (single SoT)', () => {
  test('renderKernelRouterMd covers required bundles + all MAP skills', () => {
    const md = renderKernelRouterMd();
    for (const b of requiredRouterBundles()) {
      expect(md).toContain(`\`${b}\``);
    }
    for (const [skill, domain] of Object.entries(DOMAIN_SKILL_MAP)) {
      expect(md).toContain(`\`${skill}\``);
      expect(md).toContain(kernelSkillPath(domain));
    }
    expect(md).toContain('done-gate');
    expect(md).toContain('security');
  });

  test('loadSharedBehavior uses generated router (contains MAP skill, not only static stub)', () => {
    const shared = loadSharedBehavior(projectRoot);
    expect(shared).toContain('## 纪律内核');
    // full MAP entry only present in generated router
    expect(shared).toContain('securing-systems');
    expect(shared).toContain(kernelSkillPath('security'));
    expect(shared).toContain('developing-software');
  });

  test('committed kernel-router.md is a mirror stub that points at inject-plane SoT', () => {
    const disk = fs.readFileSync(
      path.join(projectRoot, 'config', 'personas', '_shared', 'kernel-router.md'),
      'utf8'
    );
    expect(disk).toContain('inject-plane.js');
    // disk file must not be a rival full MAP (would drift); generated is authoritative
    const generated = renderKernelRouterMd();
    for (const skill of Object.keys(DOMAIN_SKILL_MAP)) {
      expect(generated).toContain(skill);
    }
  });

  test('always-on compose still under budget and ends with kernel precedence', () => {
    const content = renderRuntimeGuidance(projectRoot, 'abyss-cultivator', 'codex', 'abyss');
    expect(content.length).toBeLessThan(8000);
    expect(content).toContain('内核边界');
    expect(content).toContain('securing-systems');
  });
});

describe('inject artifact write/strip', () => {
  test('renderInjectArtifactMd carries marker + security + doctrine paths', () => {
    const md = renderInjectArtifactMd({ targetName: 'claude' });
    expect(md).toContain(INJECT_MARKER);
    expect(md).toContain(kernelSkillPath('security'));
    expect(md).toContain(kernelSkillPath('doctrine'));
    expect(md).toContain('securing-systems');
  });

  test('writeInjectArtifact + stripInjectArtifact are idempotent on real fs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-art-'));
    try {
      const p = writeInjectArtifact(tmp, { targetName: 'claude' });
      expect(p).toBe(injectArtifactPath(tmp));
      expect(fs.existsSync(path.join(tmp, INJECT_REL_PATH))).toBe(true);
      const body = fs.readFileSync(p, 'utf8');
      expect(body).toContain(INJECT_MARKER);
      expect(body).toContain(kernelSkillPath('security'));
      expect(stripInjectArtifact(tmp)).toBe(true);
      expect(fs.existsSync(p)).toBe(false);
      expect(stripInjectArtifact(tmp)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('wire-domain-gates consumes inject-plane MAP', () => {
  test('scripts/wire-domain-gates.js requires DOMAIN_SKILL_MAP (no parallel hardcode)', () => {
    const src = fs.readFileSync(
      path.join(projectRoot, 'scripts', 'wire-domain-gates.js'),
      'utf8'
    );
    expect(src).toMatch(/require\(['"]\.\.\/bin\/lib\/inject-plane['"]\)/);
    expect(src).toMatch(/DOMAIN_SKILL_MAP/);
    // must not re-list all 16 skills as a local object literal of the old shape
    expect(src).not.toMatch(/'developing-software':\s*'backend'/);
  });
});
