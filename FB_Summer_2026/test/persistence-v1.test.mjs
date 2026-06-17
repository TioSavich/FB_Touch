// test/persistence-v1.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Split.js','src/model/Mat.js','src/model/Bar.js','src/persistence/format.js','src/persistence/legacy.js']);

// Legacy v1 file: decycled CanvasState; mUnitBar is a $ref into mBars.
const v1 = JSON.stringify({
  mFBCanvas: null, canvasState: null,
  mBars: [
    { x:10,y:10,w:200,h:40,size:8000,color:'#FFFF66',splits:[],label:'',isUnitBar:true,fraction:'1/1',type:'bar',isSelected:false },
    { x:10,y:80,w:100,h:40,size:4000,color:'#ACBEFF',splits:[{x:0,y:0,w:50,h:40,color:'#ACBEFF'},{x:50,y:0,w:50,h:40,color:'#ACBEFF'}],label:'half',isUnitBar:false,fraction:'',type:'bar',isSelected:false }
  ],
  mMats: [ { x:0,y:0,w:300,h:300,size:90000,color:'#888',type:'mat',isSelected:false } ],
  mUnitBar: { $ref: '$["mBars"][0]' },
  mHidden: ['tool_hide']
});

test('resolveRefs replaces $ref without eval', () => {
  const obj = JSON.parse(v1);
  const resolved = FB.Persistence.resolveRefs(obj);
  assert.equal(resolved.mUnitBar, resolved.mBars[0]);
});

test('rejects malicious $ref path (no code execution)', () => {
  const evil = { a: { $ref: '$;globalThis.HACKED=true' } };
  globalThis.HACKED = false;
  FB.Persistence.resolveRefs(evil); // must not eval
  assert.equal(globalThis.HACKED, false);
  assert.equal(evil.a.$ref, '$;globalThis.HACKED=true'); // left as-is (invalid path)
});

test('parseFile normalizes v1 into v2 shape with unitBarIndex', () => {
  const obj = FB.Persistence.parseFile(v1);
  assert.equal(obj.version, 2);
  assert.equal(obj.unitBarIndex, 0);
  assert.equal(obj.bars[1].label, 'half');
  assert.equal(obj.bars[1].splits.length, 2);
  // parseFile builds arrays inside the vm harness realm, so compare contents
  // rather than using deepStrictEqual (which checks cross-realm prototype identity).
  assert.deepEqual([...obj.hidden], ['tool_hide']);
});

test('parseFile passes through native v2 unchanged in shape', () => {
  const v2 = FB.Persistence.toJSON({ bars:[FB.Bar.create(0,0,10,10,'bar','#fff')], mats:[], unitBar:null, hidden:[] });
  const obj = FB.Persistence.parseFile(v2);
  assert.equal(obj.version, 2);
  assert.equal(obj.bars.length, 1);
});
