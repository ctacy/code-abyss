'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const { validatePersonaVoiceCard } = require('./persona-voice-card');

const CACHE_BASE = path.join(os.homedir(), '.code-abyss', 'personas');

// Agent OS v5.8 — transport policy for remote personas
const DEFAULT_ALLOWED_HOSTS = Object.freeze(['raw.githubusercontent.com']);

function getCacheDir(slug) {
  return path.join(CACHE_BASE, slug);
}

function isPersonaCached(slug) {
  return fs.existsSync(path.join(getCacheDir(slug), `${slug}.json`));
}

/**
 * Refuse non-HTTPS and hosts outside allowlist (incl. redirect targets).
 * @throws {Error} with code URL_POLICY
 */
function assertRemoteUrlPolicy(url, {
  allowedHosts = DEFAULT_ALLOWED_HOSTS,
  requireHttps = true,
} = {}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    const err = new Error(`非法 URL: ${url}`);
    err.code = 'URL_POLICY';
    throw err;
  }
  if (requireHttps && parsed.protocol !== 'https:') {
    const err = new Error(`拒绝非 HTTPS 远程人格 URL: ${parsed.protocol}//${parsed.host}`);
    err.code = 'URL_POLICY';
    throw err;
  }
  const host = parsed.hostname;
  const allow = Array.isArray(allowedHosts) ? allowedHosts : DEFAULT_ALLOWED_HOSTS;
  if (!allow.includes(host)) {
    const err = new Error(`拒绝未在 allowlist 的 host: ${host}（允许: ${allow.join(', ')}）`);
    err.code = 'URL_POLICY';
    throw err;
  }
  return parsed;
}

function fetch(url, opts = {}) {
  const allowedHosts = opts.allowedHosts || DEFAULT_ALLOWED_HOSTS;
  assertRemoteUrlPolicy(url, { allowedHosts, requireHttps: opts.requireHttps !== false });

  return new Promise((resolve, reject) => {
    // After policy check we only open https (unless tests disable requireHttps)
    const useHttp = url.startsWith('http://') && opts.requireHttps === false;
    const mod = useHttp ? http : https;
    mod.get(url, { headers: { 'User-Agent': 'code-abyss' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let next = res.headers.location;
        // Resolve relative redirects against current URL
        try {
          next = new URL(next, url).toString();
        } catch {
          res.resume();
          return reject(Object.assign(new Error(`无效 redirect: ${res.headers.location}`), { code: 'URL_POLICY' }));
        }
        try {
          assertRemoteUrlPolicy(next, { allowedHosts, requireHttps: opts.requireHttps !== false });
        } catch (e) {
          res.resume();
          return reject(e);
        }
        return fetch(next, opts).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchPersona(slug, remoteBase, opts = {}) {
  const cacheDir = getCacheDir(slug);
  fs.mkdirSync(cacheDir, { recursive: true });

  const base = remoteBase.replace(/\/+$/, '');
  // Policy on base before path join
  assertRemoteUrlPolicy(`${base}/`, {
    allowedHosts: opts.allowedHosts || DEFAULT_ALLOWED_HOSTS,
    requireHttps: opts.requireHttps !== false,
  });
  const cardUrl = `${base}/${slug}.json`;
  const raw = await fetch(cardUrl, opts);
  if (!raw) {
    throw new Error(`远程人格 ${slug} 不存在: ${cardUrl} 返回非 200`);
  }

  let card;
  try {
    card = JSON.parse(raw);
  } catch (e) {
    throw new Error(`远程人格 ${slug} 的 voice card 解析失败: ${e.message}`);
  }
  const { valid, errors } = validatePersonaVoiceCard(card);
  if (!valid) {
    throw new Error(`远程人格 ${slug} 的 voice card 未通过校验，拒绝缓存:\n  ${errors.join('\n  ')}`);
  }

  fs.writeFileSync(path.join(cacheDir, `${slug}.json`), raw);
  return cacheDir;
}

async function ensurePersona(slug, remoteBase, opts = {}) {
  if (isPersonaCached(slug)) return getCacheDir(slug);
  return fetchPersona(slug, remoteBase, opts);
}

module.exports = {
  getCacheDir,
  isPersonaCached,
  fetchPersona,
  ensurePersona,
  CACHE_BASE,
  DEFAULT_ALLOWED_HOSTS,
  assertRemoteUrlPolicy,
  fetch,
};
