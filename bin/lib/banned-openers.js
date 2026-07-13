'use strict';

// Single JS source for banned capitulation openers (Agent OS v5.6).
// Aligned with skills/_kernel/character/hooks/check_banned_openers.py (mythos-
// vendored; cannot be rewritten by code-abyss). Drift is guarded by
// test/persona-battery-banned-openers.test.js against the live Python list.

const BANNED = Object.freeze([
  "you're absolutely right",
  'you are absolutely right',
  "you're right",
  'you are right',
  'great idea',
  'great question',
  'good catch',
  'excellent point',
]);

function opensBanned(text) {
  const s = String(text || '').trim().replace(/^[*_#>"'“‘\s]+/, '').toLowerCase();
  return BANNED.some((p) => s.startsWith(p));
}

/**
 * Mechanical score of response texts (key-free).
 * @param {Array<{ id: string, text: string, expectBanned?: boolean }>} fixtures
 * @returns {{ scored: number, failed: number, results: Array<object> }}
 */
function scoreMechanical(fixtures) {
  const results = [];
  let failed = 0;
  for (const f of fixtures) {
    const banned = opensBanned(f.text);
    const expectBanned = f.expectBanned === true;
    // default: expect clean (not banned). If expectBanned, pass when banned.
    const pass = expectBanned ? banned : !banned;
    if (!pass) failed += 1;
    results.push({
      id: f.id,
      pass,
      banned,
      expectBanned,
    });
  }
  return { scored: fixtures.length, failed, results };
}

module.exports = {
  BANNED,
  opensBanned,
  scoreMechanical,
};
