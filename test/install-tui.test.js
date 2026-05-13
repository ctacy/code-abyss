'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const gstackFixture = path.join(__dirname, 'fixtures', 'gstack-codex-source');

function runInteractiveInstall({ tmpHome, inputSteps, timeout = 8000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(projectRoot, 'bin', 'install.js')], {
      cwd: projectRoot,
      env: {
        ...process.env,
        HOME: tmpHome,
        USERPROFILE: tmpHome,
        CODE_ABYSS_GSTACK_SOURCE: gstackFixture,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });

    const timers = inputSteps.map(({ delay, input }) => setTimeout(() => {
      child.stdin.write(input);
    }, delay));
    const killTimer = setTimeout(() => {
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`interactive install timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, timeout);

    child.on('error', reject);
    child.on('close', (status) => {
      timers.forEach(clearTimeout);
      clearTimeout(killTimer);
      if (!settled) resolve({ status, stdout, stderr });
    });
  });
}

describe('interactive install TUI', () => {
  let tmpHome;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyss-tui-home-'));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  test('persona/style 使用 Tab 横向切换且只配置一次', async () => {
    const result = await runInteractiveInstall({
      tmpHome,
      inputSteps: [
        { delay: 300, input: ' ' },
        { delay: 450, input: '\r' },
        { delay: 650, input: '\r' },
        { delay: 850, input: '\t' },
        { delay: 1000, input: '\r' },
        { delay: 1200, input: '\t' },
        { delay: 1350, input: '\r' },
        { delay: 1800, input: '\r' },
      ],
    });
    const claudeDir = path.join(tmpHome, '.claude');
    const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
    const claudeMd = fs.readFileSync(path.join(claudeDir, 'CLAUDE.md'), 'utf8');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('tab/→ next');
    expect(claudeMd).toContain('文言小生');
    expect(settings.outputStyle).toBe('scholar-classic');
  });
});
