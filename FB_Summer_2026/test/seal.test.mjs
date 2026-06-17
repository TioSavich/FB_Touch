// test/seal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;

test('build produces sealed Fraction_Bars.html with strict CSP and no banned patterns', () => {
  execFileSync('node', ['build.mjs'], { cwd: ROOT });
  const html = readFileSync(ROOT + 'Fraction_Bars.html', 'utf8');
  assert.ok(html.includes("connect-src 'none'"), 'CSP blocks network');
  assert.ok(/script-src 'sha256-/.test(html), 'CSP hashes inline script');
  assert.ok(!/<script[^>]+src=/.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+href=/.test(html), 'no external styles');
  assert.ok(!/\beval\s*\(/.test(html), 'no eval');
  assert.ok(!/\bnew Function\s*\(/.test(html), 'no Function constructor');
  assert.ok(!/jquery/i.test(html), 'no jQuery');
  assert.ok(!/\.innerHTML\s*=/.test(html), 'no innerHTML assignment');
  assert.ok(!/https?:\/\//.test(html.replace(/https?:\/\/www\.w3\.org\/2000\/svg|http-equiv|education\.indiana\.edu/g,'')), 'no remote URLs');
});
