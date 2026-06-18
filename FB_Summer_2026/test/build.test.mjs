// FB_Summer_2026/test/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHtml } from '../build.mjs';
import { createHash } from 'node:crypto';

test('buildHtml inlines scripts and emits matching CSP sha256', () => {
  const manifest = { scripts: ['a.js'], styles: ['a.css'], scriptContents: { 'a.js': 'window.X=1;' }, styleContents: { 'a.css': 'body{color:red}' } };
  const { html, scriptHash } = buildHtml(manifest);
  const expected = 'sha256-' + createHash('sha256').update('window.X=1;').digest('base64');
  assert.equal(scriptHash, expected);
  assert.ok(html.includes(expected), 'CSP must contain script hash');
  assert.ok(html.includes('window.X=1;'), 'script must be inlined');
  assert.ok(html.includes('body{color:red}'), 'style must be inlined');
  assert.ok(!/<script[^>]+src=/.test(html), 'no external scripts');
  assert.ok(html.includes("connect-src 'none'"), 'CSP must block network');
});
