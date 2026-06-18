// test/pointer.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Line.js','src/model/Split.js','src/model/Mat.js','src/model/Utilities.js','src/model/Bar.js','src/model/CanvasState.js','src/render/controller.js','src/input/toolbar.js']);

test('toolbar dispatch routes action_copy to controller.copyBars', () => {
  let called = false;
  const c = FB.Controller.create({ renderer:{render(){}}, notify(){}, getMarkedIterate:()=>false });
  c.copyBars = () => { called = true; };
  FB.Toolbar.dispatch(c, 'action_copy');
  assert.equal(called, true);
});

test('toolbar dispatch toggles a tool on/off via currentAction', () => {
  const c = FB.Controller.create({ renderer:{render(){}}, notify(){}, getMarkedIterate:()=>false });
  FB.Toolbar.dispatch(c, 'tool_bar');
  assert.equal(c.state.currentAction, 'bar');
  FB.Toolbar.dispatch(c, 'tool_bar'); // second press turns off
  assert.equal(c.state.currentAction, '');
});
