// test/model-bar.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const M = ['src/model/Point.js','src/model/Line.js','src/model/Split.js','src/model/Mat.js','src/model/Utilities.js','src/model/Bar.js','src/model/CanvasState.js'];
const FB = loadFB(M);

test('join two equal-width bars stacked vertically merges height and creates two splits', () => {
  const a = FB.Bar.create(0,0,100,40,'bar','#ff0');
  const b = FB.Bar.create(0,40,100,40,'bar','#0f0');
  const ok = a.join(b);
  assert.equal(ok, true);
  assert.equal(a.h, 80);
  assert.equal(a.splits.length, 2);
});

test('join rejects bars with no matching dimension', () => {
  const a = FB.Bar.create(0,0,100,40,'bar','#ff0');
  const b = FB.Bar.create(0,0,55,33,'bar','#0f0');
  assert.equal(a.join(b), false);
});

test('initialSplits vertical creates N equal splits across width', () => {
  const a = FB.Bar.create(0,0,90,30,'bar','#ff0');
  a.wholeBarSplits(3, true);
  assert.equal(a.splits.length, 3);
  assert.equal(a.splits[0].w, 30);
});

test('breakApart returns one bar per split', () => {
  const a = FB.Bar.create(0,0,90,30,'bar','#ff0');
  a.wholeBarSplits(3, true);
  assert.equal(a.breakApart().length, 3);
});

test('makeNewCopy scales width and size by fraction', () => {
  const a = FB.Bar.create(0,0,100,30,'bar','#ff0');
  const c = a.makeNewCopy(0.5);
  assert.equal(c.w, 50);
  assert.equal(c.size, a.size * 0.5);
});

test('createFromSplit offsets new bar by 10', () => {
  const s = new FB.Split(5,5,20,20,'#f00');
  const b = FB.Bar.createFromSplit(s, 0, 0);
  assert.equal(b.x, 15); assert.equal(b.y, 15);
});
