'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  validateStance,
  renderStanceResidual,
  loadStance,
  SPEC,
  SPEC_VERSION,
} = require('../bin/lib/stance');
const { renderRuntimeGuidance } = require('../bin/lib/style-registry');

const projectRoot = path.join(__dirname, '..');

describe('stance validate (v5.7)', () => {
  test('null/undefined is valid empty', () => {
    expect(validateStance(null).valid).toBe(true);
    expect(validateStance(null).empty).toBe(true);
  });

  test('valid residual stance accepted', () => {
    const v = validateStance({
      spec: SPEC,
      spec_version: SPEC_VERSION,
      candor: 'direct',
      initiative: 'normal',
      notes: ['少客套'],
    });
    expect(v.valid).toBe(true);
  });

  test('judgment-shaped fields rejected', () => {
    const v = validateStance({
      candor: 'direct',
      authorization: { tier: 'T1' },
    });
    expect(v.valid).toBe(false);
    expect(v.errors.join(' ')).toMatch(/authorization|禁止/);
  });

  test('skip_verify rejected', () => {
    const v = validateStance({ skip_verify: true, candor: 'blunt' });
    expect(v.valid).toBe(false);
  });

  test('unknown freeform keys rejected', () => {
    const v = validateStance({ candor: 'direct', freeform_policy: 'x' });
    expect(v.valid).toBe(false);
  });
});

describe('stance render residual', () => {
  test('renderStanceResidual emits residual header', () => {
    const md = renderStanceResidual({ candor: 'blunt', initiative: 'high' });
    expect(md).toContain('姿态（残余空间）');
    expect(md).toContain('永不覆盖');
  });

  test('zero stance: render identical to baseline (no residual header)', () => {
    // No .stance.json for abyss in package → soft load null
    const withNone = renderRuntimeGuidance(projectRoot, 'abyss-cultivator', 'codex', 'abyss');
    expect(withNone).not.toContain('## 姿态（残余空间）');
  });

  test('valid stance file injects residual block only', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stance-root-'));
    try {
      // minimal project tree: copy config/personas for abyss + styles + shared
      const copyDir = (src, dest) => {
        fs.mkdirSync(dest, { recursive: true });
        for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
          const s = path.join(src, ent.name);
          const d = path.join(dest, ent.name);
          if (ent.isDirectory()) copyDir(s, d);
          else fs.copyFileSync(s, d);
        }
      };
      copyDir(path.join(projectRoot, 'config'), path.join(tmp, 'config'));
      copyDir(path.join(projectRoot, 'output-styles'), path.join(tmp, 'output-styles'));
      // minimal skills/_kernel for nothing required in render
      fs.mkdirSync(path.join(tmp, 'skills', '_kernel'), { recursive: true });

      fs.writeFileSync(
        path.join(tmp, 'config', 'personas', 'abyss.stance.json'),
        JSON.stringify({
          spec: SPEC,
          spec_version: SPEC_VERSION,
          candor: 'direct',
          initiative: 'low',
        })
      );

      const withStance = renderRuntimeGuidance(tmp, 'abyss-cultivator', 'codex', 'abyss');
      expect(withStance).toContain('## 姿态（残余空间）');
      expect(withStance).toContain('内核边界');
      // still voice-card identity
      expect(withStance).toContain('## 人格');

      // loadStance hard path
      const loaded = loadStance(tmp, 'abyss');
      expect(loaded.candor).toBe('direct');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
