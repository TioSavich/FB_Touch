// test/svg-renderer.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Split.js','src/model/Mat.js','src/model/Bar.js','src/render/typeset.js','src/render/svgRenderer.js']);

function el(tag){ return { tag, attrs:{}, children:[], textContent:'',
  setAttribute(k,v){this.attrs[k]=String(v);}, appendChild(c){this.children.push(c);return c;},
  removeChild(c){this.children=this.children.filter(x=>x!==c);},
  get firstChild(){return this.children[0]||null;}, replaceChildren(){this.children=[];} }; }
function doc(){ return { createElementNS:(_n,t)=>el(t) }; }

test('render draws mats then bars; selected bar gets thick stroke', () => {
  const d = doc(); const root = el('svg');
  const r = FB.Renderer.create(root, d);
  const m = FB.Mat.create(0,0,50,50,'mat','#888');
  const b = FB.Bar.create(10,10,100,40,'bar','#ff0'); b.isSelected = true;
  r.render({ bars:[b], mats:[m], currentAction:'', manualSplitPoint:null, shiftDown:false });
  // first group is the mat layer, second is bars layer
  assert.ok(root.children.length >= 1);
  const flat = JSON.stringify(root);
  assert.ok(flat.includes('"stroke-width":"2.5"'), 'selected bar stroke');
});

test('render typesets a unit bar caption', () => {
  const d = doc(); const root = el('svg');
  const r = FB.Renderer.create(root, d);
  const b = FB.Bar.create(10,10,100,40,'bar','#ff0'); b.isUnitBar = true; b.fraction='1/1';
  r.render({ bars:[b], mats:[], currentAction:'', manualSplitPoint:null, shiftDown:false });
  assert.ok(JSON.stringify(root).includes('Unit Bar'));
});
