// test/gallery.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/persistence/gallery.js']);

test('memory gallery save/list/load/rename/duplicate/remove', async () => {
  const g = FB.Gallery.create(FB.Gallery.memoryAdapter());
  await g.save('A', { version:2, bars:[] }, 1000);
  await g.save('B', { version:2, bars:[{x:1}] }, 2000);
  // Spread normalizes the loadFB vm-realm array into a host-realm array so
  // node:assert deepStrictEqual (prototype-sensitive) compares cleanly.
  let names = [...(await g.list()).map(e => e.name)].sort();
  assert.deepEqual(names, ['A','B']);
  assert.deepEqual(await g.load('B'), { version:2, bars:[{x:1}] });
  await g.rename('A','C');
  await g.duplicate('B','B copy', 3000);
  await g.remove('C');
  names = [...(await g.list()).map(e => e.name)].sort();
  assert.deepEqual(names, ['B','B copy']);
});
