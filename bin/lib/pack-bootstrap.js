'use strict';

const fs = require('fs');
const path = require('path');

const { listTargetNames } = require('./target-registry');

// Snippet markers + apply helpers
// 历史上这部分独立在 pack-docs.js 里，仅本文件消费 — 已并入此处。

const MARKERS = {
  readme: {
    start: '<!-- code-abyss:packs:readme:start -->',
    end: '<!-- code-abyss:packs:readme:end -->',
  },
  contributing: {
    start: '<!-- code-abyss:packs:contributing:start -->',
    end: '<!-- code-abyss:packs:contributing:end -->',
  },
};

function wrapSnippet(kind, content) {
  const marker = MARKERS[kind];
  return `${marker.start}\n${content.trim()}\n${marker.end}\n`;
}

function hasSnippetBlock(filePath, kind) {
  if (!fs.existsSync(filePath)) return false;
  const marker = MARKERS[kind];
  const current = fs.readFileSync(filePath, 'utf8');
  return current.includes(marker.start) && current.includes(marker.end);
}

function applySnippetToFile(filePath, kind, content) {
  const wrapped = wrapSnippet(kind, content);
  const marker = MARKERS[kind];
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, 'utf8') : '';

  const blockRe = new RegExp(`${marker.start}[\\s\\S]*?${marker.end}\\n?`, 'm');
  let next;
  let action;

  if (blockRe.test(current)) {
    next = current.replace(blockRe, wrapped);
    action = 'updated';
  } else if (current.trim().length === 0) {
    next = wrapped;
    action = 'created';
  } else {
    const suffix = current.endsWith('\n') ? '\n' : '\n\n';
    next = `${current}${suffix}${wrapped}`;
    action = 'appended';
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next);
  return { filePath, action };
}

function renderReadmeSnippet(lock) {
  const lines = [
    '## AI Pack Bootstrap',
    '',
    'This repository declares Code Abyss packs in `.code-abyss/packs.lock.json`.',
    '',
  ];

  listTargetNames().forEach((host) => {
    const cfg = (lock.hosts && lock.hosts[host]) || { required: [], optional: [], optional_policy: 'auto' };
    lines.push(`- ${host}: required=[${cfg.required.join(', ') || 'none'}], optional=[${cfg.optional.join(', ') || 'none'}], optional_policy=${cfg.optional_policy}`);
  });

  const installCommands = listTargetNames().map((host) => `npx code-abyss --target ${host} -y`);
  lines.push(
    '',
    'Recommended install:',
    '',
    '```bash',
    ...installCommands,
    '```',
    ''
  );
  return lines.join('\n');
}

function renderContributingSnippet(lock) {
  const targetNames = listTargetNames();
  return [
    '## AI Tooling',
    '',
    'This repository uses `.code-abyss/packs.lock.json` to declare AI packs.',
    '',
    '- Update the lock with `npm run packs:update -- [flags]`.',
    '- Validate it with `npm run packs:check`.',
    `- Re-run \`npx code-abyss --target ${targetNames.join('|')} -y\` after pack changes.`,
    '',
    `Current host policies: ${targetNames.map((host) => `${host}=${((lock.hosts && lock.hosts[host]) || { optional_policy: 'auto' }).optional_policy}`).join(', ')}`,
    '',
  ].join('\n');
}

function writeBootstrapSnippets(projectRoot, lock) {
  const snippetDir = path.join(projectRoot, '.code-abyss', 'snippets');
  fs.mkdirSync(snippetDir, { recursive: true });
  fs.writeFileSync(path.join(snippetDir, 'README.packs.md'), `${renderReadmeSnippet(lock)}\n`);
  fs.writeFileSync(path.join(snippetDir, 'CONTRIBUTING.packs.md'), `${renderContributingSnippet(lock)}\n`);
  return snippetDir;
}

function applyBootstrapDocs(projectRoot, lock, mode = 'all') {
  const operations = [
    { filePath: path.join(projectRoot, 'README.md'), kind: 'readme', content: renderReadmeSnippet(lock) },
    { filePath: path.join(projectRoot, 'CONTRIBUTING.md'), kind: 'contributing', content: renderContributingSnippet(lock) },
  ];

  const results = [];
  operations.forEach((op) => {
    if (mode === 'markers-only' && !hasSnippetBlock(op.filePath, op.kind)) {
      results.push({ filePath: op.filePath, action: 'skipped' });
      return;
    }
    results.push(applySnippetToFile(op.filePath, op.kind, op.content));
  });

  return results;
}

function syncProjectBootstrapArtifacts(projectRoot, lock) {
  const snippetDir = writeBootstrapSnippets(projectRoot, lock);
  const docs = applyBootstrapDocs(projectRoot, lock, 'markers-only');
  return { snippetDir, docs };
}

module.exports = {
  // snippet markers (historically pack-docs.js)
  MARKERS,
  wrapSnippet,
  hasSnippetBlock,
  applySnippetToFile,
  // bootstrap orchestration
  renderReadmeSnippet,
  renderContributingSnippet,
  writeBootstrapSnippets,
  applyBootstrapDocs,
  syncProjectBootstrapArtifacts,
};
