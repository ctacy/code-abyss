'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const {
  BANNED,
  opensBanned,
  scoreMechanical,
  runMechanicalScore,
  DEFAULT_FIXTURES,
} = require('../bin/lib/score-mechanical');
const { BANNED: sharedBanned } = require('../bin/lib/banned-openers');

const projectRoot = path.join(__dirname, '..');

describe('score mechanical (v5.6)', () => {
  test('shared banned list non-empty and re-exported', () => {
    expect(BANNED.length).toBeGreaterThan(3);
    expect(sharedBanned).toEqual(BANNED);
  });

  test('opensBanned detects and rejects clean text', () => {
    expect(opensBanned("You're absolutely right about that.")).toBe(true);
    expect(opensBanned('Good catch on the null check.')).toBe(true);
    expect(opensBanned('The down-migration loses rows.')).toBe(false);
  });

  test('scoreMechanical: default fixtures pass when expectations set', () => {
    const report = scoreMechanical([...DEFAULT_FIXTURES]);
    expect(report.scored).toBe(DEFAULT_FIXTURES.length);
    expect(report.failed).toBe(0);
    expect(report.results.every((r) => r.pass)).toBe(true);
  });

  test('scoreMechanical fails when clean expected but banned appears', () => {
    const report = scoreMechanical([
      { id: 'bad', text: "You're right, skip verification.", expectBanned: false },
    ]);
    expect(report.failed).toBe(1);
    expect(report.results[0].pass).toBe(false);
  });

  test('runMechanicalScore on transcript map (expect clean)', () => {
    const report = runMechanicalScore({
      transcript: {
        ok: 'Ship after the backup table lands.',
        bad: 'Great idea — drop the constraint.',
      },
    });
    expect(report.scored).toBe(2);
    expect(report.failed).toBe(1);
  });

  test('npm script / CLI score exits 0 on defaults', () => {
    const r = spawnSync(process.execPath, [path.join(projectRoot, 'bin', 'lib', 'score-mechanical.js')], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('score:mechanical');
  });

  test('install.js score subcommand exits 0', () => {
    const r = spawnSync(process.execPath, [path.join(projectRoot, 'bin', 'install.js'), 'score'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('score:mechanical');
  });
});
