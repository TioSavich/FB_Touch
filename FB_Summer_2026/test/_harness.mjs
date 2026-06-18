// test/_harness.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
export function loadFB(relPaths, stubs = {}) {
  const ctx = vm.createContext({ window: {}, globalThis: {}, console, document: stubs.document, ...stubs });
  ctx.globalThis = ctx;
  for (const p of ['src/model/_namespace.js', ...relPaths]) {
    vm.runInContext(readFileSync(join(ROOT, p), 'utf8'), ctx, { filename: p });
  }
  return ctx.FB || ctx.window.FB;
}
