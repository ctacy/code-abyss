'use strict';

// Agent OS v5.7 — optional residual stance modules.
// Stance is attitude-only residual space (candor/initiative). It MUST NOT carry
// security authorization tiers, skip-verify instructions, or priority tables.
// Zero stance file => render identical to voice-card-only path.

const fs = require('fs');
const path = require('path');

const SPEC = 'persona-stance';
const SPEC_VERSION = '1.0';

const CANDOR_VALUES = Object.freeze(['direct', 'measured', 'blunt']);
const INITIATIVE_VALUES = Object.freeze(['low', 'normal', 'high']);

// Reject judgment-shaped / security-shaped field names outright.
const BANNED_STANCE_KEYS = Object.freeze([
  'authorization', 'auth', 'auth_tier', 'authz', 'tier', 't1', 't2', 't3',
  'skip_verify', 'skip-verify', 'verify_skip', 'skip_verification',
  'priority', 'priorities', 'judgment', 'decision', 'security_policy',
  'allow_destructive', 'capabilities', 'scenarios',
]);

const ALLOWED_KEYS = new Set([
  'spec', 'spec_version', 'slug', 'candor', 'initiative', 'notes',
]);

const MAX_NOTES = 2;
const MAX_NOTE_LEN = 48;

function validateStance(stance) {
  const errors = [];
  if (stance == null) return { valid: true, errors: [], empty: true };
  if (typeof stance !== 'object' || Array.isArray(stance)) {
    return { valid: false, errors: ['stance 必须是对象'] };
  }

  for (const k of Object.keys(stance)) {
    const lower = k.toLowerCase();
    if (BANNED_STANCE_KEYS.includes(lower) || BANNED_STANCE_KEYS.includes(k)) {
      errors.push(`禁止字段（判断/安全形状）: ${k}`);
    }
    if (!ALLOWED_KEYS.has(k)) {
      errors.push(`未知 stance 字段: ${k}`);
    }
  }

  if (stance.spec !== undefined && stance.spec !== SPEC) {
    errors.push(`spec 应为 "${SPEC}"`);
  }
  if (stance.spec_version !== undefined && stance.spec_version !== SPEC_VERSION) {
    errors.push(`spec_version 应为 "${SPEC_VERSION}"`);
  }
  if (stance.candor !== undefined && !CANDOR_VALUES.includes(stance.candor)) {
    errors.push(`candor 必须是 ${CANDOR_VALUES.join('|')}`);
  }
  if (stance.initiative !== undefined && !INITIATIVE_VALUES.includes(stance.initiative)) {
    errors.push(`initiative 必须是 ${INITIATIVE_VALUES.join('|')}`);
  }
  if (stance.notes !== undefined) {
    if (!Array.isArray(stance.notes) || stance.notes.length > MAX_NOTES) {
      errors.push(`notes 最多 ${MAX_NOTES} 项`);
    } else {
      stance.notes.forEach((n, i) => {
        if (typeof n !== 'string' || !n.trim() || n.length > MAX_NOTE_LEN) {
          errors.push(`notes[${i}] 必须非空且 ≤${MAX_NOTE_LEN} 字符`);
        }
        if (/auth|skip.?verify|authorization|tier/i.test(n)) {
          errors.push(`notes[${i}] 含判断/安全形状用语`);
        }
      });
    }
  }

  // Must carry at least one residual attitude signal if non-empty object with only meta
  const hasAttitude = stance.candor || stance.initiative
    || (Array.isArray(stance.notes) && stance.notes.length > 0);
  if (!hasAttitude && errors.length === 0) {
    errors.push('stance 非空时至少需要 candor / initiative / notes 之一');
  }

  return { valid: errors.length === 0, errors, empty: false };
}

const CANDOR_SENTENCE = {
  direct: '态度直接：坏消息优先，少包装。',
  measured: '态度克制：信息完整但不冷硬。',
  blunt: '态度锋利：少客套，先给可执行结论。',
};

const INITIATIVE_SENTENCE = {
  low: '主动度低：不越权扩 scope。',
  normal: '主动度正常：在残余空间给一个可选默认。',
  high: '主动度高：在残余空间主动推进下一步（仍不越过安全/验证边界）。',
};

function renderStanceResidual(stance) {
  if (!stance) return '';
  const { valid } = validateStance(stance);
  if (!valid) return '';
  const lines = ['## 姿态（残余空间）'];
  if (stance.candor && CANDOR_SENTENCE[stance.candor]) lines.push(CANDOR_SENTENCE[stance.candor]);
  if (stance.initiative && INITIATIVE_SENTENCE[stance.initiative]) {
    lines.push(INITIATIVE_SENTENCE[stance.initiative]);
  }
  for (const n of stance.notes || []) {
    lines.push(`- ${n}`);
  }
  lines.push('姿态永不覆盖正确性 / 安全决策 / done-gate / 数据丢失防护。');
  return lines.join('\n');
}

function resolveStancePath(projectRoot, slug) {
  const local = path.join(projectRoot, 'config', 'personas', `${slug}.stance.json`);
  if (fs.existsSync(local)) return local;
  return null;
}

function loadStance(projectRoot, slug) {
  const p = resolveStancePath(projectRoot, slug);
  if (!p) return null;
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    const err = new Error(`stance 解析失败: ${e.message}`);
    err.code = 'STANCE_PARSE';
    throw err;
  }
  const v = validateStance(raw);
  if (!v.valid) {
    const err = new Error(`stance 校验失败:\n  ${v.errors.join('\n  ')}`);
    err.code = 'STANCE_INVALID';
    err.errors = v.errors;
    throw err;
  }
  return raw;
}

/** Soft load for render: invalid stance is ignored only when soft=true (compose prefers hard fail in verify). */
function loadStanceForRender(projectRoot, slug, { soft = true } = {}) {
  try {
    return loadStance(projectRoot, slug);
  } catch (e) {
    if (soft) return null;
    throw e;
  }
}

module.exports = {
  SPEC,
  SPEC_VERSION,
  CANDOR_VALUES,
  INITIATIVE_VALUES,
  BANNED_STANCE_KEYS,
  ALLOWED_KEYS,
  validateStance,
  renderStanceResidual,
  resolveStancePath,
  loadStance,
  loadStanceForRender,
};
