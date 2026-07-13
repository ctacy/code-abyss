'use strict';

const fs = require('fs');
const path = require('path');
const { collectSkills } = require('../bin/lib/skill-registry');

describe('docs drift guard', () => {
  const projectRoot = path.join(__dirname, '..');

  test('README 不再写死过时 skill 数量与旧 Codex 入口', () => {
    const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');

    expect(readme).not.toContain('56 篇');
    expect(readme).not.toContain('~/.codex/prompts');
    expect(readme).not.toContain('~/.agents/skills/gstack');
    // Stale hard-coded suite totals rot; prefer "see suite summary" language
    expect(readme).not.toMatch(/441 tests\s*\(439/);
  });

  test('CHANGELOG 对历史 skill 数量与旧 Codex 入口显式标注历史语境', () => {
    const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');

    expect(changelog).not.toContain('— 22 skills 通过\n');
    expect(changelog).toContain('历史口径');
    expect(changelog).toContain('当时的 Codex 安装流程');
  });

  test('DESIGN 不再宣称 Codex 运行时生成 AGENTS.md', () => {
    const design = fs.readFileSync(path.join(projectRoot, 'DESIGN.md'), 'utf8');

    expect(design).not.toContain('Codex 安装时会按所选 style 动态生成');
    expect(design).not.toContain('~/.codex/AGENTS.md');
    expect(design).toContain('instruction.md');
    // Must point at current architecture, not freeform L1 identity as live truth
    expect(design).toMatch(/agent-os-v5\.md/);
    expect(design).toMatch(/not.*current runtime truth|不是.*current runtime|Historical/i);
  });

  test('当前项目不再默认声明 gstack pack', () => {
    const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, '.code-abyss', 'packs.lock.json'), 'utf8'));

    Object.values(lock.hosts).forEach((host) => {
      expect(host.required).not.toContain('gstack');
      expect(host.optional).not.toContain('gstack');
    });
  });

  test('skill registry counts: 30 domain + 9 kernel = 39; invocable set is explicit', () => {
    const skills = collectSkills(path.join(projectRoot, 'skills'));
    const kernel = skills.filter((s) => s.relPath.startsWith('_kernel' + path.sep) || s.relPath.startsWith('_kernel/'));
    const domain = skills.filter((s) => !s.relPath.startsWith('_kernel'));
    expect(skills).toHaveLength(39);
    expect(kernel).toHaveLength(9);
    expect(domain).toHaveLength(30);

    const invocable = skills.filter((s) => s.userInvocable).map((s) => s.name).sort();
    expect(invocable).toEqual([
      'cultivating-personas',
      'cultivating-skills',
      'designing-hardware-products',
      'operating-kicad-eda',
      'reducing-aigc-detection',
    ].sort());
  });

  test('CLAUDE.md does not claim zero invocable skills', () => {
    const claude = fs.readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf8');
    expect(claude).not.toMatch(/defaults to none/);
    expect(claude).toMatch(/cultivating-skills/);
  });

  test('primary design doc exists and is linked from DESIGN.md', () => {
    expect(fs.existsSync(path.join(projectRoot, 'docs', 'design', 'agent-os-v5.md'))).toBe(true);
    const design = fs.readFileSync(path.join(projectRoot, 'DESIGN.md'), 'utf8');
    expect(design).toContain('docs/design/agent-os-v5.md');
  });
});
