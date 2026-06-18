// test/persistence-v2.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Split.js','src/model/Mat.js','src/model/Utilities.js','src/model/Bar.js','src/persistence/format.js']);

function sample() {
  const u = FB.Bar.create(10,10,200,40,'bar','#FFFF66'); u.isUnitBar = true; u.fraction='1/1';
  const b = FB.Bar.create(10,80,100,40,'bar','#ACBEFF'); b.label='half'; b.wholeBarSplits(2,true);
  const m = FB.Mat.create(0,0,300,300,'mat','#888');
  return { bars:[u,b], mats:[m], unitBar:u, hidden:['tool_hide'] };
}

test('serialize emits versioned acyclic object with unitBarIndex', () => {
  const o = FB.Persistence.serialize(sample());
  assert.equal(o.format,'fraction-bars'); assert.equal(o.version,2);
  assert.equal(o.unitBarIndex,0);
  assert.equal(o.bars[1].splits.length,2);
  assert.equal(JSON.stringify(o).includes('$ref'), false);
});

test('round-trip preserves geometry, splits, unit bar, label, hidden', () => {
  const before = sample();
  const round = FB.Persistence.deserialize(JSON.parse(FB.Persistence.toJSON(before)));
  assert.equal(round.bars.length, 2);
  assert.equal(round.bars[1].label, 'half');
  assert.equal(round.bars[1].splits.length, 2);
  assert.equal(round.unitBar, round.bars[0]);
  assert.equal(round.unitBar.isUnitBar, true);
  assert.deepEqual(round.hidden, ['tool_hide']);
});
