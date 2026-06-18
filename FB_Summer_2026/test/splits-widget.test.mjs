// test/splits-widget.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/chrome/splitsWidget.js']);

function el(tag){ return { tag, attrs:{}, children:[],
  setAttribute(k,v){this.attrs[k]=String(v);}, appendChild(c){this.children.push(c);return c;},
  replaceChildren(){this.children=[];}, getAttribute(k){return this.attrs[k];} }; }

test('splits widget draws N vertical cells', () => {
  const svg = el('svg'); svg.setAttribute('width','100'); svg.setAttribute('height','100');
  const w = FB.SplitsWidget.create(svg, { createElementNS:(_n,t)=>el(t) });
  w.setVertical(true); w.setNumSplits(4); w.refresh();
  const rects = svg.children.filter(c => c.tag === 'rect');
  assert.equal(rects.length, 4);
});
