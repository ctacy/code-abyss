'use strict';
const fs = require('fs');
const path = require('path');

// MAP is owned by inject-plane — do not maintain a parallel list here.
const { DOMAIN_SKILL_MAP } = require('../bin/lib/inject-plane');

const ROOT = path.resolve(__dirname, '..');
const MAP = DOMAIN_SKILL_MAP;

const MARKER = 'skills/_kernel/';
function gate(domain) {
  return (
    '> **判断先于执行**：决定「是否做 / 选什么 / 如何取舍」（栈、方案、架构、权衡）前，' +
    '先读领域判断内核 `skills/_kernel/' + domain + '/SKILL.md`——它管 judgment，' +
    '本秘典管 execution；冲突时以内核判断为准。'
  );
}

let patched = 0, skipped = 0;
for (const [skill, domain] of Object.entries(MAP)) {
  const p = path.join(ROOT, 'skills', skill, 'SKILL.md');
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes(MARKER)) { skipped++; continue; }
  const lines = t.split('\n');
  // Frontmatter may contain `# ...` YAML comment lines, so find the CLOSING
  // `---` first, then locate the real H1 in the body after it.
  if (lines[0].trim() !== '---') { console.log('WARN no frontmatter: ' + skill); skipped++; continue; }
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) { if (lines[i].trim() === '---') { fmEnd = i; break; } }
  if (fmEnd === -1) { console.log('WARN unterminated frontmatter: ' + skill); skipped++; continue; }
  let h1 = -1;
  for (let i = fmEnd + 1; i < lines.length; i++) { if (/^# /.test(lines[i])) { h1 = i; break; } }
  if (h1 === -1) { console.log('WARN no H1: ' + skill); skipped++; continue; }
  // insert gate as a blockquote after the H1 (with surrounding blank lines)
  lines.splice(h1 + 1, 0, '', gate(domain));
  fs.writeFileSync(p, lines.join('\n'));
  patched++;
}
console.log('domain gates: patched=' + patched + ' skipped=' + skipped + ' (of ' + Object.keys(MAP).length + ')');
