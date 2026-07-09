'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const {
  getCacheDir,
  isPersonaCached,
  CACHE_BASE,
  DEFAULT_ALLOWED_HOSTS,
  assertRemoteUrlPolicy,
  fetchPersona,
  fetch,
} = require('../bin/lib/persona-fetch');

describe('persona-fetch', () => {
  test('getCacheDir returns path under ~/.code-abyss/personas/', () => {
    const dir = getCacheDir('scholar');
    expect(dir).toBe(path.join(os.homedir(), '.code-abyss', 'personas', 'scholar'));
  });

  test('isPersonaCached returns false for non-existent slug', () => {
    expect(isPersonaCached('__nonexistent_test_persona__')).toBe(false);
  });

  test('CACHE_BASE is under home directory', () => {
    expect(CACHE_BASE).toContain('.code-abyss');
    expect(CACHE_BASE).toContain('personas');
  });
});

describe('persona-fetch URL policy (v5.8)', () => {
  test('DEFAULT_ALLOWED_HOSTS includes raw.githubusercontent.com', () => {
    expect(DEFAULT_ALLOWED_HOSTS).toContain('raw.githubusercontent.com');
  });

  test('assertRemoteUrlPolicy accepts HTTPS allowlisted host', () => {
    expect(() => assertRemoteUrlPolicy(
      'https://raw.githubusercontent.com/telagod/code-abyss/main/config/personas/x.json'
    )).not.toThrow();
  });

  test('assertRemoteUrlPolicy rejects HTTP', () => {
    expect(() => assertRemoteUrlPolicy('http://raw.githubusercontent.com/x/y')).toThrow(/HTTPS|非 HTTPS/);
  });

  test('assertRemoteUrlPolicy rejects foreign host', () => {
    expect(() => assertRemoteUrlPolicy('https://evil.example/persona.json')).toThrow(/allowlist|host/);
  });

  test('fetch rejects open redirect off allowlist', async () => {
    // Local HTTP server that 302s to foreign host — policy must reject before follow
    const server = http.createServer((req, res) => {
      res.writeHead(302, { Location: 'https://evil.example/stolen.json' });
      res.end();
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      await expect(
        fetch(`http://127.0.0.1:${port}/start`, {
          requireHttps: false,
          allowedHosts: ['127.0.0.1'],
        })
      ).rejects.toThrow(/allowlist|host|evil/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('fetchPersona refuses non-HTTPS remoteBase', async () => {
    await expect(
      fetchPersona('scholar', 'http://raw.githubusercontent.com/telagod/code-abyss/main/config/personas')
    ).rejects.toThrow(/HTTPS|非 HTTPS/);
  });
});
