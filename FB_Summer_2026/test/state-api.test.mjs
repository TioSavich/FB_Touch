// test/state-api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Split.js','src/model/Mat.js','src/model/Utilities.js','src/model/Bar.js','src/model/CanvasState.js','src/render/controller.js','src/persistence/format.js','src/api/stateApi.js']);

test('getState returns v2 object reflecting controller bars', () => {
  const c = FB.Controller.create({ renderer:{render(){}}, notify(){}, getMarkedIterate:()=>false });
  c.state.bars.push(FB.Bar.create(0,0,10,10,'bar','#fff'));
  const target = {};
  FB.StateApi.install(c, target);
  const s = target.FractionBars.getState();
  assert.equal(s.format, 'fraction-bars');
  assert.equal(s.bars.length, 1);
});

test('loadState replaces model and fires onChange', () => {
  const c = FB.Controller.create({ renderer:{render(){}}, notify(){}, getMarkedIterate:()=>false });
  const target = {}; let fired = 0;
  FB.StateApi.install(c, target);
  target.FractionBars.onChange(() => fired++);
  target.FractionBars.loadState({ format:'fraction-bars', version:2, bars:[{x:0,y:0,w:5,h:5,size:25,color:'#fff',label:'',isUnitBar:false,fraction:'',type:'bar',splits:[]}], mats:[], unitBarIndex:null, hidden:[] });
  assert.equal(c.state.bars.length, 1);
  assert.ok(fired >= 1);
});

test('loadState rejects wrong format', () => {
  const c = FB.Controller.create({ renderer:{render(){}}, notify(){}, getMarkedIterate:()=>false });
  const target = {}; FB.StateApi.install(c, target);
  assert.throws(() => target.FractionBars.loadState({ format:'evil', version:2 }));
});
