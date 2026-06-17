// test/typeset.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/render/typeset.js']);

// NOTE: loadFB runs sources in a separate vm realm, so returned objects carry a
// foreign Object.prototype. assert/strict's deepEqual compares prototypes, so we
// spread results into host-realm plain objects to compare structure only.
test('parseFraction handles integer', () => {
  assert.deepEqual({ ...FB.Typeset.parseFraction('2') }, { kind:'integer', whole:2 });
});
test('parseFraction handles proper fraction', () => {
  assert.deepEqual({ ...FB.Typeset.parseFraction('3/4') }, { kind:'fraction', num:3, den:4 });
});
test('parseFraction handles improper fraction', () => {
  assert.deepEqual({ ...FB.Typeset.parseFraction('3/2') }, { kind:'fraction', num:3, den:2 });
});
test('parseFraction handles mixed number "1 1/2"', () => {
  assert.deepEqual({ ...FB.Typeset.parseFraction('1 1/2') }, { kind:'mixed', whole:1, num:1, den:2 });
});
test('parseFraction falls back to text', () => {
  assert.deepEqual({ ...FB.Typeset.parseFraction('half') }, { kind:'text', text:'half' });
});
test('parseFraction empty -> text empty', () => {
  assert.deepEqual({ ...FB.Typeset.parseFraction('') }, { kind:'text', text:'' });
});

test('buildFractionSVG returns a <g> with a vinculum line for fractions', () => {
  const stub = makeSvgDocStub();
  const g = FB.Typeset.buildFractionSVG(stub, '3/4', { x:0, y:0, fontSize:12, anchor:'end', color:'#000' });
  assert.equal(g.tag, 'g');
  assert.ok(g.children.some(c => c.tag === 'line'), 'has vinculum');
  assert.equal(g.children.filter(c => c.tag === 'text').length, 2, 'num + den');
});

function makeSvgDocStub() {
  function el(tag){ return { tag, attrs:{}, children:[], textContent:'',
    setAttribute(k,v){this.attrs[k]=v;}, appendChild(c){this.children.push(c); return c;} }; }
  return { createElementNS:(_ns,tag)=>el(tag) };
}
