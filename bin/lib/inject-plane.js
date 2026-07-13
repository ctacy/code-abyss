'use strict';

// bin/lib/inject-plane.js
// Agent OS v5.4 — single source of truth for forced judgment mapping.
//
// Consumers:
//   1. resolveTrigger() — pure logic (tests + future hooks)
//   2. renderKernelRouterMd() — always-on router prose (style-registry)
//   3. writeInjectArtifact() — thin host install drop (install lifecycle)
//   4. DOMAIN_SKILL_MAP — scripts/wire-domain-gates.js (must not fork a second map)
//
// Does NOT bake full kernel SKILL.md bodies into always-on compose.

const fs = require('fs');
const path = require('path');

/** Exec skill → kernel domain bundle (16 entries). Canonical MAP for domain gates. */
const DOMAIN_SKILL_MAP = Object.freeze({
  'developing-software': 'backend',
  'designing-architectures': 'backend',
  'provisioning-infrastructure': 'backend',
  'engineering-data-pipelines': 'backend',
  'automating-devops': 'backend',
  'applying-ui-design-system': 'frontend',
  'developing-mobile-apps': 'frontend',
  'designing-hardware-products': 'hardware',
  'operating-kicad-eda': 'hardware',
  'building-agent-systems': 'ml',
  'securing-systems': 'security',
  'analyzing-security': 'security',
  'architecting-security': 'security',
  'defending-applications': 'security',
  'detecting-and-responding': 'security',
  'securing-cloud-and-supply-chain': 'security',
});

/** Cross-cutting kernel moments (router table). */
const CROSS_CUTTING = Object.freeze([
  {
    id: 'doctrine-done-gate',
    bundle: 'doctrine',
    label: '委派 / 重试·升级 / done-gate / 完成判定',
    keywords: [
      'is this done', 'are we done', 'done-gate', '完成了吗', '可以收工', '算完成',
      'done yet', 'ready to ship', '可以合并吗', 'merge ready',
    ],
  },
  {
    id: 'methods-investigate',
    bundle: 'methods',
    label: '调查根因 / 设计评估 / 规划 / 验证复核',
    keywords: ['root cause', '根因', 'verify', '验证', 'design review', '设计评估'],
  },
  {
    id: 'loop-engineering',
    bundle: 'loop-engineering',
    label: '会话选题·节奏 / 单元切分 / 收尾交接',
    keywords: ['what next', '下一步做什么', 'handoff', '交接', 'unit of work'],
  },
  {
    id: 'character-residual',
    bundle: 'character',
    label: '平局取舍 / 是否反驳 / 越界范围 / 批评与坏消息',
    keywords: ["you're right", 'push back', '反驳', '坏消息', 'bad news first'],
  },
]);

/** Path → domain bundle (observable file-class triggers). */
const PATH_DOMAIN_RULES = Object.freeze([
  {
    id: 'path-security',
    bundle: 'security',
    // paths under auth/crypto/security-ish trees or known skill dirs
    test: (p) => /(?:^|\/)(?:security|auth|crypto|oauth|secrets?)(?:\/|$)/i.test(p)
      || /securing-|defending-|analyzing-security|architecting-security|detecting-and-responding/i.test(p),
  },
  {
    id: 'path-frontend',
    bundle: 'frontend',
    test: (p) => /\.(tsx|jsx|vue|svelte|css|scss)$/i.test(p)
      || /(?:^|\/)(?:components?|ui)(?:\/|$)/i.test(p),
  },
  {
    id: 'path-hardware',
    bundle: 'hardware',
    test: (p) => /\.(kicad_pcb|kicad_sch|sch|brd)$/i.test(p)
      || /(?:kicad|firmware|embedded)/i.test(p),
  },
  {
    id: 'path-ml',
    bundle: 'ml',
    test: (p) => /(?:^|\/)(?:models?|training|evals?|rag)(?:\/|$)/i.test(p)
      || /\.(ipynb)$/i.test(p),
  },
  {
    id: 'path-backend',
    bundle: 'backend',
    test: (p) => /(?:^|\/)(?:api|server|services?)(?:\/|$)/i.test(p)
      || /\.(go|rs|py|java|rb)$/i.test(p),
  },
]);

/** Free-text keyword → domain (security first among domains). */
const TEXT_DOMAIN_RULES = Object.freeze([
  {
    id: 'text-security',
    bundle: 'security',
    keywords: [
      'threat model', '威胁建模', 'pentest', 'owasp', 'injection', 'authz', 'authorization',
      '漏洞', '安全审计', 'code audit', 'cve', 'xss', 'csrf', 'idor',
    ],
  },
  {
    id: 'text-frontend',
    bundle: 'frontend',
    keywords: ['ui design', 'design system', 'css', 'react component', '视觉', '前端'],
  },
  {
    id: 'text-hardware',
    bundle: 'hardware',
    keywords: ['kicad', 'pcb', 'schematic', '固件', 'mcu', 'hardware'],
  },
  {
    id: 'text-ml',
    bundle: 'ml',
    keywords: ['rag', 'fine-tune', 'llm eval', 'embedding', 'agent system', '训练'],
  },
  {
    id: 'text-backend',
    bundle: 'backend',
    keywords: ['api design', 'architecture', 'schema', 'queue', 'database', '架构', '微服务'],
  },
]);

const ALL_DOMAIN_BUNDLES = Object.freeze(
  [...new Set(Object.values(DOMAIN_SKILL_MAP))].sort()
);

const KERNEL_BUNDLES = Object.freeze([
  'doctrine', 'methods', 'character', 'loop-engineering',
  ...ALL_DOMAIN_BUNDLES,
]);

const INJECT_MARKER = 'code-abyss-inject-plane';
const INJECT_REL_PATH = '.code-abyss-inject.md';

function kernelSkillPath(bundle) {
  return `skills/_kernel/${bundle}/SKILL.md`;
}

function textMatchesKeywords(text, keywords) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return keywords.some((k) => lower.includes(String(k).toLowerCase()));
}

/**
 * Resolve observable trigger → kernel bundle ids (judgment must-load).
 * @param {{ path?: string, text?: string, skill?: string, kind?: string }} input
 * @returns {{ bundles: string[], reasons: string[] }}
 */
function resolveTrigger(input = {}) {
  const bundles = [];
  const reasons = [];
  const seen = new Set();

  function add(bundle, reason) {
    if (!bundle || seen.has(bundle)) return;
    seen.add(bundle);
    bundles.push(bundle);
    reasons.push(reason);
  }

  const kind = input.kind && String(input.kind);
  if (kind === 'done-gate' || kind === 'doctrine') {
    add('doctrine', `kind:${kind}`);
  }

  const skill = input.skill && String(input.skill);
  if (skill && DOMAIN_SKILL_MAP[skill]) {
    add(DOMAIN_SKILL_MAP[skill], `skill:${skill}`);
  }

  const filePath = input.path && String(input.path).replace(/\\/g, '/');
  if (filePath) {
    for (const rule of PATH_DOMAIN_RULES) {
      if (rule.test(filePath)) {
        add(rule.bundle, `path:${rule.id}`);
        break; // first path rule wins for specificity order in PATH_DOMAIN_RULES
      }
    }
  }

  const text = input.text && String(input.text);
  if (text) {
    for (const row of CROSS_CUTTING) {
      if (textMatchesKeywords(text, row.keywords)) {
        add(row.bundle, `text:${row.id}`);
      }
    }
    for (const rule of TEXT_DOMAIN_RULES) {
      if (textMatchesKeywords(text, rule.keywords)) {
        add(rule.bundle, `text:${rule.id}`);
        break;
      }
    }
  }

  return { bundles, reasons };
}

/**
 * Always-on kernel router markdown — generated from this module only.
 */
function renderKernelRouterMd() {
  const domainLine =
    '领域判断（' +
    ALL_DOMAIN_BUNDLES.map((b) => `\`${b}\``).join(' / ') +
    '）→ 同名 bundle，再落到对应执行 skill';

  const lines = [
    '## 纪律内核（行动前先读）',
    '',
    '判断与纪律以 skill 形式在 `skills/_kernel/`，按当下时刻读匹配的 `SKILL.md` 再动。内核高于下方执行路由，也压过声音；冲突时内核胜。',
    '',
  ];

  for (const row of CROSS_CUTTING) {
    lines.push(`- ${row.label} → \`${row.bundle}\``);
  }
  lines.push(`- ${domainLine}`);
  lines.push('');
  lines.push('### 强制判断映射（inject plane）');
  lines.push('');
  lines.push('下列 exec skill 在动手前必须先读对应领域内核（与 `DOMAIN_SKILL_MAP` 同源）：');
  lines.push('');
  for (const [skill, domain] of Object.entries(DOMAIN_SKILL_MAP)) {
    lines.push(`- \`${skill}\` → \`${kernelSkillPath(domain)}\``);
  }
  lines.push('');
  lines.push('三条非协商项：重活委派只留结论+`file:line`；空结果先重试再核；完成须经自读以外的验证。');
  lines.push('');
  return lines.join('\n');
}

/**
 * Thin host artifact: names judgment paths without inlining kernel bodies.
 */
function renderInjectArtifactMd({ targetName = 'host', generatedAt = new Date().toISOString() } = {}) {
  const lines = [
    `<!-- ${INJECT_MARKER} -->`,
    `# code-abyss inject plane`,
    '',
    `target: ${targetName}`,
    `generated: ${generatedAt}`,
    `source: bin/lib/inject-plane.js`,
    '',
    'Graph hooks for code-graph: `abyss attach <host>` (not this file).',
    'This file lists **judgment must-load** paths. Do not skip under pressure.',
    '',
    '## Domain exec → kernel',
    '',
  ];
  for (const [skill, domain] of Object.entries(DOMAIN_SKILL_MAP)) {
    lines.push(`- ${skill} → ${kernelSkillPath(domain)}`);
  }
  lines.push('');
  lines.push('## Cross-cutting');
  lines.push('');
  for (const row of CROSS_CUTTING) {
    lines.push(`- ${row.id} → ${kernelSkillPath(row.bundle)} (${row.label})`);
  }
  lines.push('');
  lines.push('## Required security + done-gate');
  lines.push('');
  lines.push(`- done-gate → ${kernelSkillPath('doctrine')}`);
  lines.push(`- security-shaped work → ${kernelSkillPath('security')}`);
  lines.push('');
  return lines.join('\n');
}

function injectArtifactPath(targetDir) {
  return path.join(targetDir, INJECT_REL_PATH);
}

function writeInjectArtifact(targetDir, { targetName, info } = {}) {
  const dest = injectArtifactPath(targetDir);
  fs.writeFileSync(dest, renderInjectArtifactMd({ targetName }));
  if (info) info(`inject plane → ${INJECT_REL_PATH}`);
  return dest;
}

function stripInjectArtifact(targetDir) {
  const dest = injectArtifactPath(targetDir);
  if (!fs.existsSync(dest)) return false;
  const raw = fs.readFileSync(dest, 'utf8');
  if (!raw.includes(INJECT_MARKER)) return false;
  fs.rmSync(dest, { force: true });
  return true;
}

/** Required bundles that must appear in router coverage (tests). */
function requiredRouterBundles() {
  return [...new Set([
    'doctrine',
    'methods',
    'character',
    'loop-engineering',
    ...ALL_DOMAIN_BUNDLES,
  ])];
}

module.exports = {
  DOMAIN_SKILL_MAP,
  CROSS_CUTTING,
  PATH_DOMAIN_RULES,
  TEXT_DOMAIN_RULES,
  ALL_DOMAIN_BUNDLES,
  KERNEL_BUNDLES,
  INJECT_MARKER,
  INJECT_REL_PATH,
  kernelSkillPath,
  resolveTrigger,
  renderKernelRouterMd,
  renderInjectArtifactMd,
  injectArtifactPath,
  writeInjectArtifact,
  stripInjectArtifact,
  requiredRouterBundles,
};
