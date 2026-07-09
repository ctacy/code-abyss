'use strict';

// Agent OS v5.5 — doctor + compose pure control plane.
// CLI wiring lives in bin/install.js; this module stays unit-testable without install.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { detectAbyss, MIN_ABYSS_VERSION } = require('./abyss-integration');
const { renderRuntimeGuidance, getDefaultStyle, getDefaultPersona, resolveStyle, resolvePersona } = require('./style-registry');
const { INJECT_REL_PATH } = require('./inject-plane');

const COMPOSE_BUDGET_CAP = 8000;

function readKernelSyncMeta(projectRoot) {
  const p = path.join(projectRoot, 'skills', '_kernel', '.sync-meta.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function detectEnforcementOn({ HOME = os.homedir(), target = 'claude' } = {}) {
  if (target === 'claude') {
    const settingsPath = path.join(HOME, '.claude', 'settings.json');
    if (!fs.existsSync(settingsPath)) return { on: false, path: settingsPath, reason: 'no-settings' };
    try {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      const on = raw.includes('check_banned_openers.py') || raw.includes('_kernel/character/hooks');
      return { on, path: settingsPath };
    } catch (e) {
      return { on: false, path: settingsPath, reason: e.message };
    }
  }
  if (target === 'codex') {
    const cfgPath = path.join(HOME, '.codex', 'config.toml');
    if (!fs.existsSync(cfgPath)) return { on: false, path: cfgPath, reason: 'no-config' };
    try {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const on = raw.includes('check_banned_openers.py') || raw.includes('_kernel/character/hooks');
      return { on, path: cfgPath };
    } catch (e) {
      return { on: false, path: cfgPath, reason: e.message };
    }
  }
  return { on: false, reason: 'unsupported-target' };
}

function measureComposeBudget(projectRoot, { styleSlug, personaSlug } = {}) {
  const style = styleSlug || getDefaultStyle(projectRoot, 'claude').slug;
  const persona = personaSlug || getDefaultPersona(projectRoot).slug;
  const text = renderRuntimeGuidance(projectRoot, style, 'codex', persona);
  return {
    style,
    persona,
    length: text.length,
    cap: COMPOSE_BUDGET_CAP,
    headroom: COMPOSE_BUDGET_CAP - text.length,
    underBudget: text.length < COMPOSE_BUDGET_CAP,
  };
}

/**
 * Doctor report object (pure enough for tests; may read HOME + project tree).
 */
function buildDoctorReport({
  projectRoot,
  HOME = os.homedir(),
  version,
  packageName = 'code-abyss',
  target = 'claude',
} = {}) {
  const pkgPath = path.join(projectRoot, 'package.json');
  let pkg = { name: packageName, version: version || '0.0.0' };
  if (fs.existsSync(pkgPath)) {
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch { /* keep */ }
  }
  const abyss = detectAbyss({ HOME });
  const kernel = readKernelSyncMeta(projectRoot);
  const enforcement = detectEnforcementOn({ HOME, target });
  const budget = measureComposeBudget(projectRoot);
  const injectPath = path.join(HOME, target === 'codex' ? '.codex' : '.claude', INJECT_REL_PATH);
  const injectPresent = fs.existsSync(injectPath);

  return {
    package: { name: pkg.name, version: pkg.version },
    abyss: abyss
      ? { present: true, version: abyss.version, source: abyss.source, binPath: abyss.binPath, minRequired: MIN_ABYSS_VERSION }
      : { present: false, minRequired: MIN_ABYSS_VERSION },
    kernel: kernel
      ? {
        present: true,
        sourceCommit: kernel.sourceCommit || null,
        syncedAt: kernel.syncedAt || null,
        bundles: kernel.bundles || [],
      }
      : { present: false },
    enforcement: { target, ...enforcement },
    composeBudget: budget,
    injectPlane: { present: injectPresent, path: injectPath },
  };
}

function formatDoctorReport(report) {
  const lines = [];
  lines.push(`code-abyss doctor · ${report.package.name}@${report.package.version}`);
  if (report.abyss.present) {
    lines.push(`abyss: ${report.abyss.version || '?'} (${report.abyss.source}) min=${report.abyss.minRequired}`);
  } else {
    lines.push(`abyss: not detected (min ${report.abyss.minRequired}) — install via abyss install.sh`);
  }
  if (report.kernel.present) {
    lines.push(`kernel: commit=${report.kernel.sourceCommit || '?'} syncedAt=${report.kernel.syncedAt || '?'}`);
  } else {
    lines.push('kernel: .sync-meta.json missing');
  }
  lines.push(
    `enforcement(${report.enforcement.target}): ${report.enforcement.on ? 'ON' : 'OFF'}`
    + (report.enforcement.reason ? ` (${report.enforcement.reason})` : '')
  );
  const b = report.composeBudget;
  lines.push(`compose budget: ${b.length}/${b.cap} (headroom ${b.headroom}) persona=${b.persona} style=${b.style}`);
  lines.push(`inject plane: ${report.injectPlane.present ? 'present' : 'absent'} (${report.injectPlane.path})`);
  return lines.join('\n') + '\n';
}

/**
 * Compose host guidance using the same engine as install (no skill tree copy).
 * @returns {{ guidance: string, destPath: string|null, wrote: boolean }}
 */
function composeHostGuidance({
  projectRoot,
  target = 'claude',
  personaSlug = null,
  styleSlug = null,
  HOME = os.homedir(),
  write = false,
} = {}) {
  const persona = personaSlug || getDefaultPersona(projectRoot).slug;
  const style = styleSlug
    || getDefaultStyle(projectRoot, target === 'gemini' ? 'claude' : target).slug;

  // Validate slugs resolve
  if (!resolvePersona(projectRoot, persona)) {
    throw new Error(`unknown persona: ${persona}`);
  }
  if (!resolveStyle(projectRoot, style, target === 'gemini' ? 'claude' : target)) {
    throw new Error(`unknown style: ${style}`);
  }

  const hostForRender = target === 'gemini' ? 'gemini' : 'codex';
  const guidance = renderRuntimeGuidance(projectRoot, style, hostForRender, persona);

  let destPath = null;
  if (target === 'claude') destPath = path.join(HOME, '.claude', 'CLAUDE.md');
  else if (target === 'codex') destPath = path.join(HOME, '.codex', 'instruction.md');
  else if (target === 'gemini') destPath = path.join(HOME, '.gemini', 'GEMINI.md');
  else if (target === 'openclaw') {
    destPath = path.join(HOME, '.openclaw', 'workspace', 'AGENTS.md');
  }

  let wrote = false;
  if (write && destPath) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, guidance);
    wrote = true;
  }

  return { guidance, destPath, wrote, persona, style };
}

module.exports = {
  COMPOSE_BUDGET_CAP,
  readKernelSyncMeta,
  detectEnforcementOn,
  measureComposeBudget,
  buildDoctorReport,
  formatDoctorReport,
  composeHostGuidance,
};
