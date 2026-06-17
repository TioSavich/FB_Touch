// test/controller.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Line.js','src/model/Split.js','src/model/Mat.js','src/model/Utilities.js','src/model/Bar.js','src/model/CanvasState.js','src/render/controller.js']);

function ctrl(){ return FB.Controller.create({ renderer:{ render(){} }, notify(){}, getMarkedIterate:()=>false }); }

test('copyBars duplicates selected bars', () => {
  const c = ctrl();
  const b = FB.Bar.create(0,0,10,10,'bar','#fff'); b.isSelected = true;
  c.state.bars.push(b); c.state.selectedBars.push(b);
  c.copyBars();
  assert.equal(c.state.bars.length, 2);
});

test('setUnitBar then measure assigns fraction', () => {
  const c = ctrl();
  const unit = FB.Bar.create(0,0,100,20,'bar','#fff'); unit.isSelected = true;
  c.state.bars.push(unit); c.state.selectedBars=[unit];
  c.setUnitBar();
  const half = FB.Bar.create(0,30,50,20,'bar','#fff'); half.isSelected = true;
  c.state.bars.push(half); c.state.selectedBars=[half];
  c.measureBars();
  assert.equal(half.fraction, '1/2');
});

test('undo restores prior bar count', () => {
  const c = ctrl();
  c.addUndoState();
  c.state.bars.push(FB.Bar.create(0,0,10,10,'bar','#fff'));
  c.undo();
  assert.equal(c.state.bars.length, 0);
});

test('joinSelected requires exactly two bars (notify on misuse)', () => {
  let msg = null;
  const c = FB.Controller.create({ renderer:{render(){}}, notify:(m)=>{msg=m;}, getMarkedIterate:()=>false });
  c.state.selectedBars = [FB.Bar.create(0,0,10,10,'bar','#fff')];
  c.joinSelected();
  assert.ok(/two bars/i.test(msg));
});
