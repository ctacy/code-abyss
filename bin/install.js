#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const pkg = require(path.join(__dirname, '..', 'package.json'));
const VERSION = pkg.version;
const HOME = os.homedir();

// ── Node.js 版本检查 ──
const MIN_NODE = pkg.engines?.node?.match(/(\d+)/)?.[1] || '18';
if (parseInt(process.versions.node) < parseInt(MIN_NODE)) {
  console.error(`\x1b[31m✘ 需要 Node.js >= ${MIN_NODE}，当前: ${process.versions.node}\x1b[0m`);
  process.exit(1);
}
const PKG_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const { shouldSkip, copyRecursive, rmSafe, deepMergeNew, printMergeLog, formatActionableError } =
  require(path.join(__dirname, 'lib', 'utils.js'));
const {
  collectInvocableSkills,
} = require(path.join(__dirname, 'lib', 'skill-registry.js'));
const {
  resolveProjectPacks,
  selectProjectPacksForInstall,
  readProjectPackLock,
} = require(path.join(__dirname, 'lib', 'pack-registry.js'));
const { syncProjectBootstrapArtifacts } = require(path.join(__dirname, 'lib', 'pack-bootstrap.js'));
const { writeReportArtifact } = require(path.join(__dirname, 'lib', 'pack-reports.js'));
const {
  listInstallTargets,
  listTargetNames,
  isSupportedTarget,
  getManagedRootRelativeDir,
  formatTargetList,
} = require(path.join(__dirname, 'lib', 'target-registry.js'));
const {
  listStyles,
  getDefaultStyle,
  resolveStyle,
  listPersonas,
  getDefaultPersona,
  resolvePersona,
  readPersonaContent,
  renderCodexAgents,
  renderGeminiContext,
} = require(path.join(__dirname, 'lib', 'style-registry.js'));
const { detectCcstatusline, installCcstatusline } = require(path.join(__dirname, 'lib', 'ccstatusline.js'));
const { installGstackClaudePack } = require(path.join(__dirname, 'lib', 'gstack-claude.js'));
const { installGstackGeminiPack } = require(path.join(__dirname, 'lib', 'gstack-gemini.js'));

const { installGstackCodexPack } = require(path.join(__dirname, 'lib', 'gstack-codex.js'));
const {
  cleanupLegacyCodexRuntime,
  detectCodexAuth: detectCodexAuthImpl,
  getCodexCoreFiles,
  postCodex: postCodexFlow,
} = require(path.join(__dirname, 'adapters', 'codex.js'));
const {
  SETTINGS_TEMPLATE,
  getClaudeCoreFiles,
  detectClaudeAuth: detectClaudeAuthImpl,
  postClaude: postClaudeFlow,
} = require(path.join(__dirname, 'adapters', 'claude.js'));
const {
  GEMINI_SETTINGS_TEMPLATE,
  getGeminiCoreFiles,
  detectGeminiAuth: detectGeminiAuthImpl,
  postGemini: postGeminiFlow,
} = require(path.join(__dirname, 'adapters', 'gemini.js'));
const {
  getOpenClawCoreFiles,
  resolveOpenClawRuntime,
  detectOpenClawEnvironment: detectOpenClawEnvironmentImpl,
  postOpenClaw: postOpenClawFlow,
} = require(path.join(__dirname, 'adapters', 'openclaw.js'));

// ── UI ──
const { c, stripAnsi, cell } = require(path.join(__dirname, 'lib', 'ui', 'ansi.js'));
const { TARGET_ICONS, TARGET_HINTS, PERSONA_ICONS } = require(path.join(__dirname, 'lib', 'ui', 'icons.js'));
const { makeBanner, divider, step, ok, warn, info, fail } = require(path.join(__dirname, 'lib', 'ui', 'logger.js'));
const banner = makeBanner(VERSION);
const {
  promptSelect,
  promptCheckbox,
  promptHorizontalSelect,
} = require(path.join(__dirname, 'lib', 'ui', 'prompts.js'));

// ── Lifecycle ──
const { runUninstall: runUninstallImpl } = require(path.join(__dirname, 'lib', 'lifecycle', 'uninstall.js'));
const {
  CLAUDE_COMMAND_TARGET,
  GEMINI_COMMAND_TARGET,
  buildCommandFrontmatter,
  buildClaudeCommandSpec,
  buildClaudeBody,
  generateCommandContent,
  buildGeminiCommandSpec,
  escapeTomlMultiline,
  buildGeminiPromptBody,
  generateGeminiCommandContent,
} = require(path.join(__dirname, 'lib', 'lifecycle', 'command-generation.js'));
const {
  normalizeManifestEntry,
  pushManifestEntry,
  pushPackReport,
  resolveEffectivePackSource,
  manifestLabel,
  createResolveManagedRootDir,
  createBackupManagedPathIfExists,
  createPruneLegacyCodexSettings,
} = require(path.join(__dirname, 'lib', 'install-helpers.js'));

const resolveManagedRootDir = createResolveManagedRootDir({ HOME, getManagedRootRelativeDir });
const backupManagedPathIfExists = createBackupManagedPathIfExists({
  resolveManagedRootDir, rmSafe, copyRecursive, info, c,
});
const pruneLegacyCodexSettings = createPruneLegacyCodexSettings({
  resolveManagedRootDir, backupManagedPathIfExists, rmSafe, warn,
});

const { createInstallCore } = require(path.join(__dirname, 'lib', 'lifecycle', 'core-install.js'));
const {
  installCore,
  installGeneratedArtifacts,
  installGeneratedCommands,
  installGeneratedGeminiCommands,
  installGeminiContext,
} = createInstallCore({
  HOME, PKG_ROOT, VERSION,
  getClaudeCoreFiles, getCodexCoreFiles, getGeminiCoreFiles, getOpenClawCoreFiles,
  cleanupLegacyCodexRuntime, resolveOpenClawRuntime,
  installGstackClaudePack, installGstackCodexPack, installGstackGeminiPack,
  renderGeminiContext, renderCodexAgents, readPersonaContent,
  collectInvocableSkills,
  resolveManagedRootDir, backupManagedPathIfExists, pruneLegacyCodexSettings,
  pushManifestEntry, pushPackReport, resolveEffectivePackSource,
  generateCommandContent, generateGeminiCommandContent,
  CLAUDE_COMMAND_TARGET, GEMINI_COMMAND_TARGET,
  rmSafe, copyRecursive,
  step, ok, warn, info, fail, c,
});

function formatPersonaTab(persona) {
  const icon = PERSONA_ICONS[persona.gender] || PERSONA_ICONS.other;
  return `${icon} ${persona.label}`;
}

function formatPersonaDescription(persona) {
  const suffix = persona.default ? ` ${c.grn('default')}` : '';
  return `${persona.slug}${suffix} · ${persona.description}`;
}

function formatStyleDescription(style) {
  const suffix = style.default ? ` ${c.grn('default')}` : '';
  return `${style.slug}${suffix} · ${style.description}`;
}

function formatTargetChoice(targetMeta) {
  const icon = TARGET_ICONS[targetMeta.name] || '•';
  return `${icon} ${targetMeta.actionLabel}`;
}

function formatTargetDescription(targetMeta) {
  return `${TARGET_HINTS[targetMeta.name] || ''} → ${resolveManagedRootDir(targetMeta.name)}`;
}

function summarizeSelection({ targetName, persona, style, packPlan }) {
  const packs = packPlan?.path
    ? ` · packs ${packPlan.selected.join(', ') || 'none'}`
    : '';
  info(`${c.b(targetName)} · ${persona.label} · ${style.slug}${packs}`);
}

async function installTargetFlow(targetName, installOptions = {}) {
  const persona = installOptions.persona || await resolveInstallPersona();
  const style = installOptions.style || await resolveInstallStyle(targetName);
  const packPlan = await resolveProjectPackPlan(targetName);
  summarizeSelection({ targetName, persona, style, packPlan });
  const ctx = installCore(targetName, style, persona, packPlan);
  if (targetName === 'claude') await postClaude(ctx);
  else if (targetName === 'codex') await postCodex();
  else if (targetName === 'gemini') await postGemini(ctx);
  else await postOpenClaw(ctx);
  finish(ctx);
}

function styleTargetForSelection(targetNames) {
  if (targetNames.length === 1) return targetNames[0];
  if (targetNames.includes('claude')) return 'claude';
  if (targetNames.includes('codex')) return 'codex';
  if (targetNames.includes('gemini')) return 'gemini';
  return targetNames[0] || 'claude';
}

// ── 认证 ──

function detectClaudeAuth(settings) {
  return detectClaudeAuthImpl({ settings, HOME, warn });
}

function detectCodexAuth() {
  return detectCodexAuthImpl({ HOME, warn });
}

function detectGeminiAuth(settings) {
  return detectGeminiAuthImpl({ settings, HOME, warn });
}

function detectOpenClawEnvironment() {
  return detectOpenClawEnvironmentImpl({ HOME, warn });
}

// ── CLI 参数 ──

const args = process.argv.slice(2);
let target = null;
let uninstallTarget = null;
let autoYes = false;
let listStylesOnly = false;
let listPersonasOnly = false;
let requestedStyleSlug = null;
let requestedPersonaSlug = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && args[i + 1]) { target = args[++i]; }
  else if (args[i] === '--uninstall' && args[i + 1]) { uninstallTarget = args[++i]; }
  else if (args[i] === '--style' && args[i + 1]) { requestedStyleSlug = args[++i]; }
  else if (args[i] === '--persona' && args[i + 1]) { requestedPersonaSlug = args[++i]; }
  else if (args[i] === '--list-styles') { listStylesOnly = true; }
  else if (args[i] === '--list-personas') { listPersonasOnly = true; }
  else if (args[i] === '--yes' || args[i] === '-y') { autoYes = true; }
  else if (args[i] === '--help' || args[i] === '-h') {
    banner();
    console.log(`${c.b('Usage')}  npx code-abyss [options]
`);
    console.log(`  ${c.cyn('--target')} <${formatTargetList('|')}>      install one target`);
    console.log(`  ${c.cyn('--uninstall')} <${formatTargetList('|')}>   remove one target`);
    console.log(`  ${c.cyn('--style')} <slug>  ${c.cyn('--persona')} <slug>  ${c.cyn('-y')}
`);
    console.log(`${c.b('Examples')}`);
    console.log(`  npx code-abyss`);
    console.log(`  npx code-abyss --target codex -y`);
    console.log(`  npx code-abyss --list-styles
`);
    process.exit(0);
  }
}

// ── 卸载 ──

function runUninstall(tgt) {
  return runUninstallImpl(tgt, {
    isSupportedTarget,
    listTargetNames,
    resolveManagedRootDir,
    normalizeManifestEntry,
    manifestLabel,
    rmSafe,
    formatActionableError,
    c,
    fail,
    ok,
    divider,
  });
}

// ── 安装核心 ──

function scanInvocableSkills(skillsDir) {
  return collectInvocableSkills(skillsDir);
}

function printStyleCatalog() {
  banner();
  divider('Styles');
  listStyles(PKG_ROOT).forEach((style) => {
    const tag = style.default ? ` ${c.grn('default')}` : '';
    console.log(`  ${c.cyn(cell(style.slug, 24))} ${style.label}${tag}`);
  });
  console.log('');
}

function printPersonaCatalog() {
  banner();
  divider('Personas');
  listPersonas(PKG_ROOT).forEach((persona) => {
    const tag = persona.default ? ` ${c.grn('default')}` : '';
    console.log(`  ${c.cyn(cell(persona.slug, 18))} ${persona.label}${tag}`);
  });
  console.log('');
}

async function resolveProjectPackPlan(targetName) {
  const projectPacks = resolveProjectPacks(process.cwd(), targetName);
  if (!projectPacks.path) {
    return {
      ...projectPacks,
      selected: [],
      optionalSelected: [],
      sources: {},
    };
  }

  let confirmOptional = null;
  if (projectPacks.optionalPolicy === 'prompt' && projectPacks.optional.length > 0 && !autoYes) {
    const { confirm } = await import('@inquirer/prompts');
    confirmOptional = async (optionalPacks) => confirm({
      message: `当前仓库声明了 optional packs: ${optionalPacks.join(', ')}，是否一并安装?`,
      default: true,
    });
  }

  const selection = await selectProjectPacksForInstall(projectPacks, {
    autoYes,
    confirm: confirmOptional,
  });

  return {
    ...projectPacks,
    ...selection,
  };
}

async function resolveInstallPersona() {
  if (requestedPersonaSlug) {
    const persona = resolvePersona(PKG_ROOT, requestedPersonaSlug);
    if (!persona) throw new Error(`未知人格预设: ${requestedPersonaSlug}`);
    return persona;
  }
  if (autoYes) return getDefaultPersona(PKG_ROOT);

  const personas = listPersonas(PKG_ROOT);
  const defaultPersona = getDefaultPersona(PKG_ROOT);
  const slug = await promptHorizontalSelect({
    message: `${c.mag('选择人格')} ${c.d('Tab 横向切换')}`,
    choices: personas.map(p => ({
      name: formatPersonaTab(p),
      value: p.slug,
      short: p.label,
      description: formatPersonaDescription(p),
    })),
    default: defaultPersona.slug,
  });
  return resolvePersona(PKG_ROOT, slug);
}

async function resolveInstallStyle(targetName) {
  if (requestedStyleSlug) {
    const style = resolveStyle(PKG_ROOT, requestedStyleSlug, targetName === 'gemini' || targetName === 'codex' ? 'claude' : targetName)
      || resolveStyle(PKG_ROOT, requestedStyleSlug, 'claude');
    if (!style) throw new Error(`未知输出风格: ${requestedStyleSlug}`);
    return style;
  }

  if (autoYes) return getDefaultStyle(PKG_ROOT, targetName);

  const styles = listStyles(PKG_ROOT, targetName);
  const defaultStyle = getDefaultStyle(PKG_ROOT, targetName);

  const slug = await promptHorizontalSelect({
    message: `${c.cyn('选择输出风格')} ${c.d('Tab 横向切换')}`,
    choices: styles.map(style => ({
      name: style.label,
      value: style.slug,
      short: style.label,
      description: formatStyleDescription(style),
    })),
    default: defaultStyle.slug,
  });
  return resolveStyle(PKG_ROOT, slug, targetName);
}


// ── Claude 后续 ──

async function postClaude(ctx) {
  await postClaudeFlow({
    ctx,
    autoYes,
    HOME,
    PKG_ROOT,
    step,
    ok,
    warn,
    info,
    c,
    deepMergeNew,
    printMergeLog,
    installCcstatusline,
    promptCheckbox,
  });
}

// ── Codex 后续 ──

async function postCodex() {
  await postCodexFlow({
    autoYes,
    HOME,
    PKG_ROOT,
    step,
    ok,
    warn,
    info,
    c,
  });
}

async function postGemini(ctx) {
  await postGeminiFlow({
    settingsPath: ctx.settingsPath,
    settings: ctx.settings,
    autoYes,
    HOME,
    PKG_ROOT,
    step,
    ok,
    warn,
    info,
    c,
  });
}

async function postOpenClaw(ctx) {
  await postOpenClawFlow({
    runtime: resolveOpenClawRuntime({ HOME, warn }),
    autoYes,
    HOME,
    PKG_ROOT,
    step,
    ok,
    warn,
    info,
    c,
    detected: detectOpenClawEnvironment(),
  });
}

// ── 主流程 ──

async function main() {
  if (listStylesOnly) {
    printStyleCatalog();
    return;
  }

  if (listPersonasOnly) {
    printPersonaCatalog();
    return;
  }

  if (uninstallTarget) { runUninstall(uninstallTarget); return; }

  banner();

  if (target) {
    if (!isSupportedTarget(target)) {
      fail(formatActionableError(`--target 必须是 ${listTargetNames().join('、')}`, 'Try: node bin/install.js --target claude'));
      process.exit(1);
    }
    await installTargetFlow(target);
    return;
  }

  const selectedTargets = await promptCheckbox({
    message: '选择目标（可多选）',
    choices: listInstallTargets().map((targetMeta) => ({
      name: formatTargetChoice(targetMeta),
      value: targetMeta.name,
      description: formatTargetDescription(targetMeta),
    })),
    required: true,
  });

  const action = await promptSelect({
    message: '选择动作',
    choices: [
      { name: `${c.grn('+')} Install / Update`, value: 'install', description: '安装或覆盖更新所选目标' },
      { name: `${c.red('−')} Remove`, value: 'remove', description: '按 .sage-backup/manifest.json 卸载并恢复备份' },
    ],
  });

  if (action === 'install') {
    const persona = await resolveInstallPersona();
    const style = await resolveInstallStyle(styleTargetForSelection(selectedTargets));
    for (const targetName of selectedTargets) {
      await installTargetFlow(targetName, { persona, style });
    }
  } else {
    for (const targetName of selectedTargets) runUninstall(targetName);
  }
}

function finish(ctx) {
  const tgt = ctx.manifest.target;
  let reportPath = null;
  if (ctx.packPlan && ctx.packPlan.root) {
    reportPath = writeReportArtifact(ctx.packPlan.root, `install-${tgt}`, {
      version: VERSION,
      target: tgt,
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      pack_plan: {
        required: ctx.packPlan.required,
        optional: ctx.packPlan.optional,
        selected: ctx.packPlan.selected,
        optional_policy: ctx.packPlan.optionalPolicy,
        sources: ctx.packPlan.sources,
      },
      pack_reports: ctx.manifest.pack_reports || [],
      installed: ctx.manifest.installed || [],
      backups: ctx.manifest.backups || [],
    });
  }
  divider('安装完成');
  console.log('');
  console.log(`  ${c.b('目标:')}     ${c.cyn(ctx.targetDir)}`);
  console.log(`  ${c.b('版本:')}     v${VERSION}`);
  if (ctx.manifest.style && tgt !== 'codex') {
    console.log(`  ${c.b('风格:')}     ${c.mag(ctx.manifest.style)}`);
  }
  if (Array.isArray(ctx.manifest.project_packs) && ctx.manifest.project_packs.length > 0) {
    console.log(`  ${c.b('Packs:')}    ${ctx.manifest.project_packs.join(', ')}`);
  }
  if (ctx.manifest.optional_policy) {
    console.log(`  ${c.b('Pack策略:')} ${ctx.manifest.optional_policy}`);
  }
  if (Array.isArray(ctx.manifest.pack_reports) && ctx.manifest.pack_reports.length > 0) {
    ctx.manifest.pack_reports.forEach((report) => {
      const source = report.source ? ` source=${report.source}` : '';
      const reason = report.reason ? ` reason=${report.reason}` : '';
      console.log(`  ${c.b('Pack报告:')} ${report.pack}@${report.host} ${report.status}${source}${reason}`);
    });
  }
  if (ctx.packPlan && ctx.packPlan.root) {
    const projectLock = readProjectPackLock(ctx.packPlan.root);
    if (projectLock) {
      const bootstrap = syncProjectBootstrapArtifacts(ctx.packPlan.root, projectLock.lock);
      const updatedDocs = bootstrap.docs.filter((entry) => entry.action !== 'skipped');
      if (updatedDocs.length > 0) {
        updatedDocs.forEach((entry) => console.log(`  ${c.b('文档同步:')} ${entry.action} ${entry.filePath}`));
      }
    }
  }
  if (reportPath) {
    console.log(`  ${c.b('Report:')}   ${reportPath}`);
  }
  console.log(`  ${c.b('文件:')}     ${ctx.manifest.installed.length} 个安装, ${ctx.manifest.backups.length} 个备份`);
  console.log(`  ${c.b('卸载:')}     ${c.d(`npx code-abyss --uninstall ${tgt}`)}`);
  console.log('');
  console.log(c.mag(`  ⚚ 劫——破——了——！！！\n`));
}

if (require.main === module) {
  main().catch(err => { fail(err.message); process.exit(1); });
}

module.exports = {
  deepMergeNew, detectClaudeAuth, detectCodexAuth,
  detectCcstatusline, copyRecursive, shouldSkip, SETTINGS_TEMPLATE,
  scanInvocableSkills,
  generateCommandContent,
  generateGeminiCommandContent,
  installGeneratedCommands,
  installGeneratedGeminiCommands,
};
