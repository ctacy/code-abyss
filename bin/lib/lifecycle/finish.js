// bin/lib/lifecycle/finish.js
// 安装完成总结：生成 report、打印安装详情、同步 README/CONTRIBUTING bootstrap snippets

const { spawnSync } = require('child_process');

// indexing-code 的 hook 依赖 abyss 二进制；缺失时 hook 静默停用，
// 必须在安装收尾时显式告知，而不是让用户以为功能已生效。
function detectAbyssVersion() {
  try {
    const r = spawnSync('abyss', ['--version'], { encoding: 'utf8', timeout: 3000 });
    if (r.status === 0) return String(r.stdout || '').trim();
  } catch {}
  return null;
}

function createFinish(deps) {
  const {
    VERSION,
    writeReportArtifact, syncProjectBootstrapArtifacts, readProjectPackLock,
    c, divider,
  } = deps;

  return function finish(ctx) {
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
    const abyssVersion = detectAbyssVersion();
    if (abyssVersion) {
      console.log(`  ${c.b('abyss:')}    ${c.grn(abyssVersion)} — 代码图谱 pre-edit hook 可用`);
    } else {
      console.log('');
      console.log(`  ${c.ylw('⚠ 未检测到 abyss 二进制 — indexing-code 的代码图谱 hook 将静默停用')}`);
      console.log(`    ${c.b('安装（任选其一）:')}`);
      console.log(`    ${c.d('curl -fsSL https://raw.githubusercontent.com/telagod/abyss/main/install.sh | bash')}`);
      console.log(`    ${c.d('curl -fsSL https://cdn.jsdelivr.net/gh/telagod/abyss@main/install.sh | bash   # raw 不可达时的镜像')}`);
      console.log(`    ${c.d('cargo binstall code-abyss   # 或 cargo install code-abyss')}`);
    }
    console.log('');
    console.log(c.grn(`  ✓ 安装完成\n`));
  };
}

module.exports = { createFinish };
