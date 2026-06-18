// test/model-primitives.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Line.js','src/model/Split.js','src/model/Mat.js','src/model/Utilities.js']);

test('Point.min returns componentwise min', () => {
  const p = FB.Point.min(FB.Point.fromCoords(5,2), FB.Point.fromCoords(3,9));
  assert.deepEqual([p.x,p.y],[3,2]);
});
test('createFraction approximates 0.5 as 1/2', () => {
  assert.equal(FB.Utilities.createFraction(50, 100), '1/2');
});
test('createFraction returns integer when exact', () => {
  assert.equal(FB.Utilities.createFraction(200, 100), 2);
});
test('Split.equals compares geometry', () => {
  const a = new FB.Split(0,0,10,10,'#fff'); const b = new FB.Split(0,0,10,10,'#000');
  assert.equal(a.equals(b), true);
});
test('Mat.create computes size', () => {
  const m = FB.Mat.create(0,0,4,5,'mat','#888'); assert.equal(m.size, 20);
});
