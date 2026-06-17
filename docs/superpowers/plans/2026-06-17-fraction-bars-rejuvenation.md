# Fraction Bars Rejuvenation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rejuvenate Fraction Bars into a touch-native, dependency-free, SVG-rendered, hermetically-sealed single-file web app that preserves every existing function and adds backward-compatible save/load plus LTI/Hermes hooks.

**Architecture:** Preserve the original model layer (`Bar`/`Mat`/`Split`/`Point`/`Line`/`CanvasState`/`Utilities`) nearly verbatim under one `FB` namespace; rebuild the render layer as live SVG, the input layer with Pointer Events, the chrome with native `<dialog>`/range, and persistence with safe versioned JSON + IndexedDB. A zero-dependency Node build concatenates ordered classic scripts, inlines CSS, computes CSP hashes, and emits one sealed `Fraction_Bars.html`.

**Tech Stack:** Plain ES (classic scripts, `FB.*` namespace, no framework), SVG, Pointer Events, native `<dialog>`, IndexedDB, `node:test` (zero-dep) for unit tests, `/browse` gstack skill for E2E/visual, Node `build.mjs` (no third-party deps) for packaging.

## Global Constraints

Every task implicitly inherits these (verbatim from the spec):

- **No third-party runtime or build dependencies.** No jQuery, jQuery-UI, FileSaver.js, Blob.js, cycle.js, no npm packages at runtime or build.
- **No network.** No CDN, `fetch`, `XHR`, `WebSocket`, remote `<script>`/`<link>`/`<img>`. `connect-src 'none'`.
- **No `eval`, no `Function()`, no `innerHTML`/`outerHTML`/`insertAdjacentHTML` of untrusted data.** Save files are parsed as data and rendered via DOM APIs only.
- **Preserve every function in spec §4 with behavior parity** and **keep the basic look** (toolbar group order, wording, colors).
- **Coordinate space:** model stays in the original ~1000×700 pixel space; SVG `viewBox="0 0 1000 700"`.
- **Backward compatible:** must open legacy `.txt` (v1 Crockford-cycle) saves.
- **Deliverable artifact:** single self-contained `FB_Summer_2026/Fraction_Bars.html` with strict CSP, built reproducibly from `FB_Summer_2026/src/`.
- **Attribution:** keep the original copyright/credit header (Olive & Steffe; Burke & Orrill; Sandir; UMass Dartmouth) at the top of ported model files and in the app's About/source.
- **Commit message footer:** end every commit body with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Branch: work happens on `fraction-bars-rejuvenation`.

**Directory conventions:**
- Source: `FB_Summer_2026/src/` with subdirs `model/`, `render/`, `input/`, `chrome/`, `persistence/`, `api/`, `i18n/`, `styles/`.
- Tests: `FB_Summer_2026/test/`.
- Build: `FB_Summer_2026/build.mjs`, manifest `FB_Summer_2026/build.manifest.json`.
- Old app preserved read-only for parity reference at `FB_Summer_2026/Fraction_Bars_files/` and `FB_Summer_2026/Fraction_Bars.html` until Task 14 swaps in the new build.

---

## Task 1: Project scaffold + zero-dep build pipeline + CSP sealing

**Files:**
- Create: `FB_Summer_2026/build.mjs`
- Create: `FB_Summer_2026/build.manifest.json`
- Create: `FB_Summer_2026/src/styles/app.css` (placeholder, one rule)
- Create: `FB_Summer_2026/src/model/_namespace.js` (defines `var FB = window.FB || {};`)
- Create: `FB_Summer_2026/test/build.test.mjs`

**Interfaces:**
- Produces: `build.mjs` reads `build.manifest.json` (`{ "scripts": [...paths in order], "styles": [...paths], "html": "src/index.html.template", "out": "Fraction_Bars.html" }`), concatenates scripts into ONE inline `<script>`, concatenates styles into ONE inline `<style>`, computes `sha256` (base64) of each inline block via `node:crypto`, injects a CSP `<meta>` containing those hashes, writes `out`. Exposes `buildHtml(manifest, rootDir)` returning `{ html, scriptHash, styleHash }` for tests.

- [ ] **Step 1: Write the failing test**

```js
// FB_Summer_2026/test/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHtml } from '../build.mjs';
import { createHash } from 'node:crypto';

test('buildHtml inlines scripts and emits matching CSP sha256', () => {
  const manifest = { scripts: ['a.js'], styles: ['a.css'], scriptContents: { 'a.js': 'window.X=1;' }, styleContents: { 'a.css': 'body{color:red}' } };
  const { html, scriptHash } = buildHtml(manifest);
  const expected = 'sha256-' + createHash('sha256').update('window.X=1;').digest('base64');
  assert.equal(scriptHash, expected);
  assert.ok(html.includes(expected), 'CSP must contain script hash');
  assert.ok(html.includes('window.X=1;'), 'script must be inlined');
  assert.ok(html.includes('body{color:red}'), 'style must be inlined');
  assert.ok(!/<script[^>]+src=/.test(html), 'no external scripts');
  assert.ok(html.includes("connect-src 'none'"), 'CSP must block network');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/build.test.mjs`
Expected: FAIL — cannot find `buildHtml` export.

- [ ] **Step 3: Write minimal implementation**

```js
// FB_Summer_2026/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256 = (s) => 'sha256-' + createHash('sha256').update(s).digest('base64');

export function buildHtml(manifest, rootDir) {
  const read = (p, kind) => {
    const inline = manifest[kind === 'script' ? 'scriptContents' : 'styleContents'];
    if (inline && p in inline) return inline[p];
    return readFileSync(join(rootDir, p), 'utf8');
  };
  const scriptBody = manifest.scripts.map((p) => read(p, 'script')).join('\n');
  const styleBody = manifest.styles.map((p) => read(p, 'style')).join('\n');
  const scriptHash = sha256(scriptBody);
  const styleHash = sha256(styleBody);
  const csp = [
    "default-src 'none'",
    `script-src '${scriptHash}'`,
    `style-src '${styleHash}'`,
    "img-src data: blob:",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>Fraction Bars</title>
<style>${styleBody}</style>
</head><body>
${manifest.bodyHtml || ''}
<script>${scriptBody}</script>
</body></html>`;
  return { html, scriptHash, styleHash, csp };
}

// CLI entry
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const root = dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(readFileSync(join(root, 'build.manifest.json'), 'utf8'));
  if (manifest.bodyHtmlFile) manifest.bodyHtml = readFileSync(join(root, manifest.bodyHtmlFile), 'utf8');
  const { html } = buildHtml(manifest, root);
  writeFileSync(join(root, manifest.out), html);
  console.log('Built', manifest.out, '(' + html.length + ' bytes)');
}
```

```json
// FB_Summer_2026/build.manifest.json
{
  "scripts": ["src/model/_namespace.js"],
  "styles": ["src/styles/app.css"],
  "bodyHtmlFile": "src/body.html",
  "out": "Fraction_Bars.dev.html"
}
```

```js
// FB_Summer_2026/src/model/_namespace.js
var FB = (typeof window !== 'undefined' ? (window.FB = window.FB || {}) : (globalThis.FB = globalThis.FB || {}));
```

```css
/* FB_Summer_2026/src/styles/app.css */
:root { color-scheme: light; }
```

Create `FB_Summer_2026/src/body.html` containing `<!-- body assembled in later tasks -->`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/build.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FB_Summer_2026/build.mjs FB_Summer_2026/build.manifest.json FB_Summer_2026/src FB_Summer_2026/test/build.test.mjs
git commit -m "build: zero-dep sealing pipeline with CSP sha256 hashing

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Port model primitives (Point, Line, Split, Mat, Utilities) verbatim

**Files:**
- Create: `src/model/Point.js`, `src/model/Line.js`, `src/model/Split.js`, `src/model/Mat.js`, `src/model/Utilities.js`
- Test: `test/model-primitives.test.mjs`

**Port rule (applies to all model files):** Copy the body of the corresponding existing file from `Fraction_Bars_files/` verbatim, then apply ONLY these transformations: (a) keep the original copyright header; (b) attach constructors/static methods to `FB.` (e.g. `function Point(){...}` → `FB.Point = function Point(){...}`; `Point.prototype.x` → `FB.Point.prototype`; `Point.min = ...` → `FB.Point.min = ...`); (c) replace internal references to other model classes with `FB.`-qualified names (`new Point()` → `new FB.Point()`); (d) **remove** the `Point.createFromMouseEvent` jQuery dependency by changing its signature to take plain numbers (see Step 3); (e) make each file export for Node tests with a trailing `if (typeof module !== 'undefined') module.exports = ...` guard is NOT used — instead tests load via the shared harness in Step 1. No logic changes otherwise.

**Interfaces:**
- Produces: `FB.Point`, `FB.Point.min/add/subtract/multiply`, `FB.Point.fromCoords(x,y)`; `FB.Line`; `FB.Split(x,y,w,h,c)`; `FB.Mat` + `FB.Mat.create/createFromMouse/copyFromJSON/distanceBetween`; `FB.Utilities.createFraction/colorLuminance/log/flag/USE_CURRENT_SELECTION/USE_LAST_SELECTION/getMarkedIterateFlag`.

- [ ] **Step 1: Write the failing test (and a Node load harness)**

```js
// test/_harness.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
export function loadFB(relPaths, stubs = {}) {
  const ctx = vm.createContext({ window: {}, globalThis: {}, console, document: stubs.document, ...stubs });
  ctx.globalThis = ctx;
  for (const p of ['src/model/_namespace.js', ...relPaths]) {
    vm.runInContext(readFileSync(join(ROOT, p), 'utf8'), ctx, { filename: p });
  }
  return ctx.FB || ctx.window.FB;
}
```

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/model-primitives.test.mjs`
Expected: FAIL — model files do not exist.

- [ ] **Step 3: Write minimal implementation (port)**

Port each file per the Port rule. For `Point.js`, replace the jQuery-coupled factory with pure functions:

```js
// in src/model/Point.js (replacing createFromMouseEvent)
FB.Point.fromCoords = function (x, y) { var p = new FB.Point(); p.x = x; p.y = y; return p; };
// Kept for compatibility; callers now pass already-localized coords:
FB.Point.createFromCoords = FB.Point.fromCoords;
```

(Do NOT keep the old `createFromMouseEvent(e, elem)` jQuery version; the input layer in Task 9 computes local SVG coords and calls `fromCoords`.) Everything else in Point/Line/Split/Mat/Utilities is copied verbatim with `FB.` qualification. Keep `Utilities.flag` array semantics exactly (`flag[0..3]`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/model-primitives.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model test/_harness.mjs test/model-primitives.test.mjs
git commit -m "model: port Point/Line/Split/Mat/Utilities to FB namespace, drop jQuery coupling

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Port Bar + CanvasState and lock behavior with parity tests

**Files:**
- Create: `src/model/Bar.js`, `src/model/CanvasState.js`
- Test: `test/model-bar.test.mjs`

**Port note:** `Bar.copy` references the global `fbCanvasObj.currentAction == "repeat"`. Replace that coupling with a module flag: `FB.repeatModeActive` (boolean, default false), set by the controller (Task 10). In `Bar.copy`, change `if (fbCanvasObj.currentAction == "repeat")` → `if (FB.repeatModeActive)`. `CanvasState.grabBarsAndMats` references globals `hiddenButtonsName`; replace with `FB.hiddenButtonNames` array (controller-owned, default `[]`). No other logic changes.

**Interfaces:**
- Consumes: `FB.Point`, `FB.Split`, `FB.Mat`, `FB.Utilities`.
- Produces: `FB.Bar` with all prototype methods from the original (`addSplit`, `wholeBarSplits`, `wholeBarSubSplit`, `splitSelectedSplit`, `splitBarAtPoint`, `initialSplits`, `breakApart`, `copy`, `makeCopy`, `makeNewCopy`, `iterate`, `repeat`, `join`, `nearestEdge`, `selectSplit`, `findSplitForPoint`, `splitClickedOn`, `clearSplits`, `clearSplitSelection`, `hasSelectedSplit`, `updateColorOfSelectedSplit`, `removeASplit`, `copySplits`, `makeSplitsFromJSON`) and statics (`create`, `createFromMouse`, `createFromSplit`, `distanceBetween`, `copyFromJSON`); `FB.CanvasState` + `grabBarsAndMats`; module flags `FB.repeatModeActive`, `FB.hiddenButtonNames`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/model-bar.test.mjs`
Expected: FAIL — `Bar.js` missing.

- [ ] **Step 3: Write minimal implementation**

Port `Bar.js` and `CanvasState.js` per the Port note. Apply the two decoupling edits (`FB.repeatModeActive`, `FB.hiddenButtonNames`). Keep all other lines identical to source (verbatim math).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/model-bar.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/Bar.js src/model/CanvasState.js test/model-bar.test.mjs
git commit -m "model: port Bar + CanvasState verbatim with global-coupling removed; parity tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: v2 persistence (serialize/deserialize) — acyclic, Prolog-friendly

**Files:**
- Create: `src/persistence/format.js`
- Test: `test/persistence-v2.test.mjs`

**Interfaces:**
- Consumes: `FB.Bar`, `FB.Mat`.
- Produces: `FB.Persistence.serialize(state)` where `state = { bars:[FB.Bar], mats:[FB.Mat], unitBar:FB.Bar|null, hidden:[string] }` → returns the v2 plain object (spec §7.2); `FB.Persistence.toJSON(state)` → string; `FB.Persistence.deserialize(obj)` → `{ bars, mats, unitBarIndex, hidden }` rebuilt into `FB.Bar`/`FB.Mat` instances `{ bars:[FB.Bar], mats:[FB.Mat], unitBar:FB.Bar|null, hidden:[string] }`; `FB.Persistence.FORMAT='fraction-bars'`, `FB.Persistence.VERSION=2`.

- [ ] **Step 1: Write the failing test**

```js
// test/persistence-v2.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/model/Point.js','src/model/Split.js','src/model/Mat.js','src/model/Bar.js','src/persistence/format.js']);

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/persistence-v2.test.mjs`
Expected: FAIL — `FB.Persistence` undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/persistence/format.js
FB.Persistence = FB.Persistence || {};
FB.Persistence.FORMAT = 'fraction-bars';
FB.Persistence.VERSION = 2;

function barToPlain(b) {
  return { x:b.x, y:b.y, w:b.w, h:b.h, size:b.size, color:b.color, label:b.label,
    isUnitBar:!!b.isUnitBar, fraction:b.fraction, type:b.type,
    splits:(b.splits||[]).map(function(s){ return { x:s.x, y:s.y, w:s.w, h:s.h, color:s.color }; }) };
}
function matToPlain(m) {
  return { x:m.x, y:m.y, w:m.w, h:m.h, size:m.size, color:m.color, type:m.type };
}

FB.Persistence.serialize = function (state) {
  var bars = state.bars || [];
  var idx = state.unitBar ? bars.indexOf(state.unitBar) : -1;
  return {
    format: FB.Persistence.FORMAT,
    version: FB.Persistence.VERSION,
    bars: bars.map(barToPlain),
    mats: (state.mats || []).map(matToPlain),
    unitBarIndex: idx >= 0 ? idx : null,
    hidden: (state.hidden || []).slice(0)
  };
};

FB.Persistence.toJSON = function (state) { return JSON.stringify(FB.Persistence.serialize(state)); };

FB.Persistence.deserialize = function (obj) {
  var bars = (obj.bars || []).map(FB.Bar.copyFromJSON);
  var mats = (obj.mats || []).map(FB.Mat.copyFromJSON);
  var unitBar = null;
  if (obj.unitBarIndex !== null && obj.unitBarIndex !== undefined && bars[obj.unitBarIndex]) {
    unitBar = bars[obj.unitBarIndex];
    unitBar.isUnitBar = true;
    unitBar.fraction = '1/1';
  }
  return { bars: bars, mats: mats, unitBar: unitBar, hidden: (obj.hidden || []).slice(0) };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/persistence-v2.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/persistence/format.js test/persistence-v2.test.mjs
git commit -m "persistence: versioned acyclic v2 save format with round-trip tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Legacy v1 reader with safe path-walker (no eval) + migration

**Files:**
- Create: `src/persistence/legacy.js`
- Test: `test/persistence-v1.test.mjs`

**Interfaces:**
- Consumes: `FB.Persistence`, `FB.Bar`, `FB.Mat`.
- Produces: `FB.Persistence.parseFile(text)` → normalized v2-shaped plain object regardless of input version; `FB.Persistence.resolveRefs(root)` (safe, eval-free `$ref` resolver matching the Crockford JSONPath subset `$["key"][n]`); `FB.Persistence.detectVersion(obj)` → 1 | 2.

- [ ] **Step 1: Write the failing test**

```js
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
  assert.deepEqual(obj.hidden, ['tool_hide']);
});

test('parseFile passes through native v2 unchanged in shape', () => {
  const v2 = FB.Persistence.toJSON({ bars:[FB.Bar.create(0,0,10,10,'bar','#fff')], mats:[], unitBar:null, hidden:[] });
  const obj = FB.Persistence.parseFile(v2);
  assert.equal(obj.version, 2);
  assert.equal(obj.bars.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/persistence-v1.test.mjs`
Expected: FAIL — `parseFile`/`resolveRefs` undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/persistence/legacy.js
// Safe replacement for Crockford retrocycle: walk $ref paths without eval().
var REF_PATH = /^\$(?:\[(?:\d+|"(?:[^"\\]|\\.)*")\])*$/;

function parseRefPath(path) {
  // returns array of keys (strings/numbers) for paths like $["mBars"][0]
  var keys = [];
  var re = /\[(?:(\d+)|"((?:[^"\\]|\\.)*)")\]/g, m;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) keys.push(parseInt(m[1], 10));
    else keys.push(JSON.parse('"' + m[2] + '"'));
  }
  return keys;
}

FB.Persistence.resolveRefs = function (root) {
  function deref(path) {
    if (typeof path !== 'string' || !REF_PATH.test(path)) return undefined;
    var node = root, keys = parseRefPath(path);
    for (var i = 0; i < keys.length; i++) {
      if (node == null) return undefined;
      node = node[keys[i]];
    }
    return node;
  }
  (function rez(value) {
    if (!value || typeof value !== 'object') return;
    var keys = Array.isArray(value) ? value.map(function (_, i) { return i; }) : Object.keys(value);
    for (var k = 0; k < keys.length; k++) {
      var name = keys[k], item = value[name];
      if (item && typeof item === 'object') {
        if (typeof item.$ref === 'string') {
          var target = deref(item.$ref);
          if (target !== undefined) value[name] = target; // else leave invalid $ref untouched
        } else {
          rez(item);
        }
      }
    }
  })(root);
  return root;
};

FB.Persistence.detectVersion = function (obj) {
  if (obj && obj.format === FB.Persistence.FORMAT && obj.version >= 2) return 2;
  return 1; // legacy decycled CanvasState
};

FB.Persistence.parseFile = function (text) {
  var clean = String(text).replace(/(\r\n|\n|\r)/gm, '');
  var raw = JSON.parse(clean);
  if (FB.Persistence.detectVersion(raw) === 2) return raw;
  var resolved = FB.Persistence.resolveRefs(raw);
  var bars = (resolved.mBars || []);
  var unitIdx = resolved.mUnitBar ? bars.indexOf(resolved.mUnitBar) : -1;
  return {
    format: FB.Persistence.FORMAT,
    version: 2,
    bars: bars.map(function (b) {
      return { x:b.x,y:b.y,w:b.w,h:b.h,size:b.size,color:b.color,label:b.label||'',
        isUnitBar:!!b.isUnitBar,fraction:b.fraction||'',type:b.type||'bar',
        splits:(b.splits||[]).map(function(s){return {x:s.x,y:s.y,w:s.w,h:s.h,color:s.color};}) };
    }),
    mats: (resolved.mMats || []).map(function (m) {
      return { x:m.x,y:m.y,w:m.w,h:m.h,size:m.size,color:m.color,type:m.type||'mat' };
    }),
    unitBarIndex: unitIdx >= 0 ? unitIdx : null,
    hidden: (resolved.mHidden || []).slice(0)
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/persistence-v1.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/persistence/legacy.js test/persistence-v1.test.mjs
git commit -m "persistence: eval-free legacy v1 reader + v1->v2 migration; security regression tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: IndexedDB gallery via a swappable storage adapter

**Files:**
- Create: `src/persistence/gallery.js`
- Test: `test/gallery.test.mjs`

**Interfaces:**
- Produces: `FB.Gallery.create(adapter)` → object with `async save(name, v2obj)`, `async load(name)`, `async list()` → `[{name, updatedAt}]`, `async rename(oldName,newName)`, `async remove(name)`, `async duplicate(name, copyName)`. `FB.Gallery.indexedDbAdapter()` (browser; used only at runtime). `FB.Gallery.memoryAdapter()` (Map-backed; used by tests). Adapter contract: `get(key)`, `set(key,value)`, `delete(key)`, `keys()`, all async. `updatedAt` is supplied by the caller (controller passes a timestamp) — the module never calls `Date.now()` itself so it stays deterministic/testable; signature: `save(name, v2obj, updatedAt)`.

- [ ] **Step 1: Write the failing test**

```js
// test/gallery.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/persistence/gallery.js']);

test('memory gallery save/list/load/rename/duplicate/remove', async () => {
  const g = FB.Gallery.create(FB.Gallery.memoryAdapter());
  await g.save('A', { version:2, bars:[] }, 1000);
  await g.save('B', { version:2, bars:[{x:1}] }, 2000);
  let names = (await g.list()).map(e => e.name).sort();
  assert.deepEqual(names, ['A','B']);
  assert.deepEqual(await g.load('B'), { version:2, bars:[{x:1}] });
  await g.rename('A','C');
  await g.duplicate('B','B copy', 3000);
  await g.remove('C');
  names = (await g.list()).map(e => e.name).sort();
  assert.deepEqual(names, ['B','B copy']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/gallery.test.mjs`
Expected: FAIL — `FB.Gallery` undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/persistence/gallery.js
FB.Gallery = FB.Gallery || {};

FB.Gallery.memoryAdapter = function () {
  var m = new Map();
  return {
    get: async (k) => (m.has(k) ? m.get(k) : undefined),
    set: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
    keys: async () => Array.from(m.keys()),
  };
};

FB.Gallery.indexedDbAdapter = function (dbName) {
  dbName = dbName || 'fraction-bars';
  function open() {
    return new Promise(function (res, rej) {
      var req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('saves'); };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }
  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('saves', mode), store = t.objectStore('saves'), out;
        out = fn(store);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
    delete: (k) => tx('readwrite', (s) => s.delete(k)),
    keys: () => tx('readonly', (s) => s.getAllKeys()),
  };
};

FB.Gallery.create = function (adapter) {
  var rec = (obj, updatedAt) => ({ updatedAt: updatedAt || 0, data: obj });
  return {
    save: async (name, obj, updatedAt) => { await adapter.set(name, rec(obj, updatedAt)); },
    load: async (name) => { var r = await adapter.get(name); return r ? r.data : null; },
    list: async () => {
      var keys = await adapter.keys(), out = [];
      for (var i = 0; i < keys.length; i++) { var r = await adapter.get(keys[i]); out.push({ name: keys[i], updatedAt: r ? r.updatedAt : 0 }); }
      return out;
    },
    rename: async (oldName, newName) => { var r = await adapter.get(oldName); if (r) { await adapter.set(newName, r); await adapter.delete(oldName); } },
    remove: async (name) => { await adapter.delete(name); },
    duplicate: async (name, copyName, updatedAt) => { var r = await adapter.get(name); if (r) await adapter.set(copyName, rec(r.data, updatedAt)); },
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/gallery.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/gallery.js test/gallery.test.mjs
git commit -m "persistence: IndexedDB gallery with swappable adapter + in-memory test double

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Fraction typesetter (vector) + label/measure text model

**Files:**
- Create: `src/render/typeset.js`
- Test: `test/typeset.test.mjs`

**Interfaces:**
- Produces: `FB.Typeset.parseFraction(str)` → `{ kind:'integer'|'fraction'|'mixed'|'text', whole?, num?, den?, text? }`; `FB.Typeset.buildFractionSVG(doc, str, opts)` → an SVG `<g>` element with numerator, vinculum `<line>`, denominator (or plain `<text>` for integers/text). `opts = { x, y, fontSize, anchor:'start'|'end', color }`. Uses `doc.createElementNS('http://www.w3.org/2000/svg', ...)` only; never string HTML.

- [ ] **Step 1: Write the failing test (parsing is pure; SVG build tested via a minimal DOM stub)**

```js
// test/typeset.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/render/typeset.js']);

test('parseFraction handles integer', () => {
  assert.deepEqual(FB.Typeset.parseFraction('2'), { kind:'integer', whole:2 });
});
test('parseFraction handles proper fraction', () => {
  assert.deepEqual(FB.Typeset.parseFraction('3/4'), { kind:'fraction', num:3, den:4 });
});
test('parseFraction handles improper fraction', () => {
  assert.deepEqual(FB.Typeset.parseFraction('3/2'), { kind:'fraction', num:3, den:2 });
});
test('parseFraction handles mixed number "1 1/2"', () => {
  assert.deepEqual(FB.Typeset.parseFraction('1 1/2'), { kind:'mixed', whole:1, num:1, den:2 });
});
test('parseFraction falls back to text', () => {
  assert.deepEqual(FB.Typeset.parseFraction('half'), { kind:'text', text:'half' });
});
test('parseFraction empty -> text empty', () => {
  assert.deepEqual(FB.Typeset.parseFraction(''), { kind:'text', text:'' });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/typeset.test.mjs`
Expected: FAIL — `FB.Typeset` undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/render/typeset.js
FB.Typeset = FB.Typeset || {};
var SVGNS = 'http://www.w3.org/2000/svg';

FB.Typeset.parseFraction = function (raw) {
  var str = (raw === null || raw === undefined) ? '' : String(raw).trim();
  if (str === '') return { kind:'text', text:'' };
  var mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(str);
  if (mixed) return { kind:'mixed', whole:+mixed[1], num:+mixed[2], den:+mixed[3] };
  var frac = /^(\d+)\/(\d+)$/.exec(str);
  if (frac) return { kind:'fraction', num:+frac[1], den:+frac[2] };
  var intgr = /^\d+$/.exec(str);
  if (intgr) return { kind:'integer', whole:+str };
  return { kind:'text', text:str };
};

FB.Typeset.buildFractionSVG = function (doc, raw, opts) {
  opts = opts || {};
  var fs = opts.fontSize || 12, color = opts.color || '#000', anchor = opts.anchor || 'start';
  var g = doc.createElementNS(SVGNS, 'g');
  var info = FB.Typeset.parseFraction(raw);
  function text(t, x, y) {
    var el = doc.createElementNS(SVGNS, 'text');
    el.setAttribute('x', x); el.setAttribute('y', y);
    el.setAttribute('font-size', fs); el.setAttribute('fill', color);
    el.setAttribute('text-anchor', anchor === 'end' ? 'end' : 'start');
    el.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
    el.textContent = String(t);
    return el;
  }
  if (info.kind === 'text' || info.kind === 'integer') {
    g.appendChild(text(info.kind === 'integer' ? info.whole : info.text, opts.x || 0, opts.y || 0));
    return g;
  }
  // stacked fraction (and optional whole part for mixed)
  var x = opts.x || 0, y = opts.y || 0;
  var half = fs * 0.7, gap = 2, barW = fs * 1.1;
  var cursorX = x;
  if (info.kind === 'mixed') { g.appendChild(text(info.whole, cursorX, y)); cursorX += fs * 0.7; }
  g.appendChild(text(info.num, cursorX + barW / 2, y - half - gap)).setAttribute('text-anchor','middle');
  var line = doc.createElementNS(SVGNS, 'line');
  line.setAttribute('x1', cursorX); line.setAttribute('y1', y - half);
  line.setAttribute('x2', cursorX + barW); line.setAttribute('y2', y - half);
  line.setAttribute('stroke', color); line.setAttribute('stroke-width', Math.max(1, fs / 12));
  g.appendChild(line);
  g.appendChild(text(info.den, cursorX + barW / 2, y + gap + half * 0.9)).setAttribute('text-anchor','middle');
  return g;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/typeset.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render/typeset.js test/typeset.test.mjs
git commit -m "render: vector fraction typesetter (integer/fraction/mixed/text)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: SVG renderer (bars, mats, splits, selection, previews)

**Files:**
- Create: `src/render/svgRenderer.js`
- Test: `test/svg-renderer.test.mjs`

**Interfaces:**
- Consumes: `FB.Bar`, `FB.Mat`, `FB.Typeset`.
- Produces: `FB.Renderer.create(svgRoot, doc)` → `{ render(scene), setPreview(previewSpec|null) }` where `scene = { bars:[FB.Bar], mats:[FB.Mat], currentAction, manualSplitPoint, shiftDown }` and `previewSpec` describes the rubber-band rect for `bar`/`mat` creation `{type:'rect', x,y,w,h, fill, stroke}`. `render` rebuilds the SVG children deterministically (mats first, then bars, then overlays) using `createElementNS` only. Returns the count of top-level rendered nodes for testability via `svgRoot.children.length`.

**Render parity rules (from original `drawBar`/`drawMat`):** base rect fill = bar.color; each split drawn as rect with stroke `#000` and fill split.color; selected split gets a 4×4 center marker; selected bar uses stroke-width 2.5; unit bar shows "Unit Bar" caption below; fraction typeset at top-right (anchor end), label at bottom-left; manual-split guide line drawn red when `currentAction==='manualSplit'`.

- [ ] **Step 1: Write the failing test (DOM via lightweight stub)**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/svg-renderer.test.mjs`
Expected: FAIL — `FB.Renderer` undefined.

- [ ] **Step 3: Write minimal implementation**

Implement `FB.Renderer.create` honoring the parity rules. Use `replaceChildren()` then append a `<g class="mats">`, `<g class="bars">`, `<g class="overlay">`. Each bar group: base `<rect>`; split `<rect>`s; selection marker; selection outline `<rect>` (stroke-width 2.5 when selected else 1); `Unit Bar` `<text>` when `isUnitBar`; `FB.Typeset.buildFractionSVG` for the fraction (anchor end at `x+w-5`, `y-5`); label `<text>` at `x+5, y+h-5`. Mats: `<rect>` fill mat.color, stroke `#000`, stroke-width 2.5 if selected. Overlay: rubber-band preview rect from `setPreview`, and manual-split red guide `<line>` when `currentAction==='manualSplit' && manualSplitPoint`. All via `createElementNS`; **no innerHTML**.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/svg-renderer.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render/svgRenderer.js test/svg-renderer.test.mjs
git commit -m "render: SVG renderer with split/selection/unit-bar/typeset parity

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Controller core (model orchestration, ported from FractionBarsCanvas)

**Files:**
- Create: `src/render/controller.js`
- Test: `test/controller.test.mjs`

**Port note:** Port every non-drawing method of `FractionBarsCanvas` (the model-orchestration logic) into `FB.Controller`: `addBar`, `addMat`, `copyBars`, `breakApartBars`, `pullOutSplit`, `clearSplits`, `makeSplits`, `makeIterations`, `makeMake`, `measureBars`, `clearAllMeasurements`, `setUnitBar`, `saveLabel`, `deleteSelectedBars`, `updateSelectionFromState`, `findBarForPoint`, `findSplitForPoint`, `findSomethingForPoint`, `barClickedOn`, `barToFront`, `matClickedOn`, `clearSelection`, `removeBarFromSelection`, `removeMatFromSelection`, `joinSelected`, `setupBarRepeats`, `unsetBarRepeats`, `handleToolUpdate`, `updateColorsOfSelectedBars`, `drag`, undo/redo stack (`addUndoState`, `cacheUndoState`, `finalizeCachedUndoState`, `undo`, `redo`, `restoreAState`), `setFillColor`. Replace jQuery `$.inArray`/`$.each` with `Array.indexOf`/`for` loops. Replace `alert(...)` with an injected `notify(msg)` callback (default `()=>{}` in tests, wired to a toast/dialog in Task 11). Drawing methods (`drawBar`, etc.) are NOT ported here (Task 8 owns rendering); `refreshCanvas()` becomes a call to the injected renderer.

**Interfaces:**
- Consumes: `FB.Bar`, `FB.Mat`, `FB.CanvasState`, `FB.Utilities`, `FB.Renderer`.
- Produces: `FB.Controller.create({ renderer, notify, getMarkedIterate })` → controller instance exposing all ported methods plus `state` (`bars`, `mats`, `selectedBars`, `selectedMats`, `unitBar`, `currentAction`, `currentFill`), `refresh()`, and `getScene()` for the renderer.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/controller.test.mjs`
Expected: FAIL — `FB.Controller` undefined.

- [ ] **Step 3: Write minimal implementation**

Port per the Port note. `FB.Controller.create(deps)` returns an object whose methods mirror the originals but operate on `this.state`. Keep the undo cap (100), redo-clear-on-new-state, cached-drag semantics, and `restoreAState` unit-bar restoration exactly. `refresh()` calls `deps.renderer.render(this.getScene())`. Set `FB.repeatModeActive`/`FB.hiddenButtonNames` as the controller toggles repeat/hide.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/controller.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render/controller.js test/controller.test.mjs
git commit -m "controller: port FractionBarsCanvas orchestration, jQuery/alert removed

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Pointer input layer (touch + mouse + stylus) + tool dispatch

**Files:**
- Create: `src/input/pointer.js`
- Create: `src/input/toolbar.js`
- Test: `test/pointer.test.mjs`

**Interfaces:**
- Consumes: `FB.Controller`, `FB.Point`.
- Produces: `FB.Pointer.attach(svgRoot, controller, { clientToLocal })` binding `pointerdown/move/up` (+ `setPointerCapture`) that reproduce the original mousedown/move/up logic (select/drag/draw/manual-split/repeat); `clientToLocal(evt)` → `{x,y}` in viewBox space. `FB.Toolbar.bind(rootEl, controller, { addToSelectionToggle })` wiring all `tool_*`, `action_*`, `window_*`, `setColor*`, and Hide/Show controls to controller methods (the dispatch from the original `$('a').click` switch). `FB.Toolbar.selectionMode` boolean drives the touch "add to selection" toggle (replaces shiftKey when true).

- [ ] **Step 1: Write the failing test (pure dispatch logic; DOM events stubbed)**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/pointer.test.mjs`
Expected: FAIL — `FB.Toolbar` undefined.

- [ ] **Step 3: Write minimal implementation**

Implement `FB.Toolbar.dispatch(controller, id)` mirroring the original switch (tool_/action_/window_ + color + hide/show). Implement `FB.Toolbar.bind` to attach click/pointerup listeners that call `dispatch`. Implement `FB.Pointer.attach` reproducing original mousedown/move/up: on down, cache undo, compute local point, run `barClickedOn`/`matClickedOn` selection logic (honoring `shiftDown || FB.Toolbar.selectionMode`); on move, draw preview or drag or manual-split refresh; on up, finalize bar/mat creation or finalize drag undo state. Use `setPointerCapture` so drags continue off-element. Provide `clientToLocal` using `svgRoot.getScreenCTM().inverse()` (DOM Matrix) — guarded so tests that don't exercise it don't need a DOM.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/pointer.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/input test/pointer.test.mjs
git commit -m "input: Pointer Events layer + toolbar dispatch with touch multiselect toggle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Native dialogs, splits preview widget, slider, notify/toast

**Files:**
- Create: `src/chrome/dialogs.js`
- Create: `src/chrome/splitsWidget.js`
- Test: `test/splits-widget.test.mjs`

**Interfaces:**
- Consumes: `FB.Controller`, `FB.Utilities`.
- Produces: `FB.Dialogs.init(doc, controller)` wiring native `<dialog>` elements (`#dialog-splits`, `#dialog-properties`, `#dialog-iterate`, `#dialog-make`, `#dialog-file`) with `showModal()`/`close()` and OK/Cancel handlers reproducing the original button logic (split → `makeSplits`, iterate → `makeIterations`, make → `makeMake`, properties → set `FB.Utilities.flag[0..3]` + background color, file → file input). `FB.Dialogs.notify(msg)` → accessible non-blocking toast (replaces `alert`). `FB.SplitsWidget.create(svgEl, doc)` → `{ setVertical(bool), setNumSplits(n), setColor(c), refresh() }` drawing the live splits preview in SVG (ported from `SplitsWidget`, canvas→SVG).

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/splits-widget.test.mjs`
Expected: FAIL — `FB.SplitsWidget` undefined.

- [ ] **Step 3: Write minimal implementation**

Port `SplitsWidget` to SVG in `splitsWidget.js` (N rects across width or height per `vertical`). Implement `FB.Dialogs` using native `<dialog>` (`showModal`/`close`) and a toast element for `notify`. OK handlers read native inputs (`#split-slider` range value, radio states) and call the controller, exactly mirroring the original dialog button code (including `Utilities.flag` updates and background color set).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/splits-widget.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/chrome test/splits-widget.test.mjs
git commit -m "chrome: native <dialog>s, SVG splits preview, accessible toast (no alert/jQuery-UI)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: i18n string table + body markup + responsive CSS (preserve the look)

**Files:**
- Create: `src/i18n/strings.js`
- Create: `src/body.html` (replace placeholder)
- Modify: `src/styles/app.css`
- Test: `test/i18n.test.mjs`

**Interfaces:**
- Produces: `FB.I18N.set(lang)` (`'eng'|'tur'`), `FB.I18N.t(key)` → string; keys mirror the original `lang_eng.css` content map (`bar`, `mat`, `copy`, `repeat`, `iterate`, `join`, `delete`, `parts`, `pieces`, `b_apart`, `pullout`, `c_parts`, `set_unit`, `measure`, `label`, `undo`, `redo`, `save`, `open`, `new`, `print`, `properties`, `hide`, `show`, `previous`, `next`, plus dialog strings). `src/body.html` provides the toolbar (same group order/labels), the `<svg id="fbCanvas" viewBox="0 0 1000 700">`, the label `<input>` overlay, and the five `<dialog>`s. CSS reproduces the original visual style (Helvetica, light gray canvas `#EFEFEF`, gray grooved border, 8 + 16 color swatches with the exact hex values from `fractionBars.css`) and adds responsive layout (side rail ≥900px, wrapping bar below) and ≥44px touch targets.

- [ ] **Step 1: Write the failing test**

```js
// test/i18n.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';
const FB = loadFB(['src/i18n/strings.js']);

test('English labels match the originals', () => {
  FB.I18N.set('eng');
  assert.equal(FB.I18N.t('parts'), 'Parts');
  assert.equal(FB.I18N.t('set_unit'), 'Set Unit Bar');
  assert.equal(FB.I18N.t('b_apart'), 'Break Apart');
});
test('Turkish strings present for partition alert', () => {
  FB.I18N.set('tur');
  assert.ok(FB.I18N.t('select_bar_to_partition').length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/i18n.test.mjs`
Expected: FAIL — `FB.I18N` undefined.

- [ ] **Step 3: Write minimal implementation**

Create `strings.js` with `eng`/`tur` tables transcribed from `lang_eng.css` (English) and the inline Turkish `alert` strings found in the original (`FractionBarsCanvas.js`/`Bar.js`). Build `src/body.html` toolbar with the exact group order and label text from the original HTML, swatches with the exact `.colorN` hex values, the SVG canvas, label input, and the five native `<dialog>`s (ported from the jQuery-UI markup, stripped to native). Extend `app.css` to reproduce the look + responsive/touch rules. Update `build.manifest.json` `scripts`/`styles` arrays to include every `src/**` file in dependency order and point `bodyHtmlFile` at `src/body.html`, `out` at `Fraction_Bars.html`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/i18n.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n src/body.html src/styles/app.css build.manifest.json test/i18n.test.mjs
git commit -m "ui: i18n table, preserved-look toolbar markup, responsive/touch CSS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: App bootstrap + State API + postMessage bridge (Hermes/LTI hook)

**Files:**
- Create: `src/api/stateApi.js`
- Create: `src/main.js`
- Test: `test/state-api.test.mjs`

**Interfaces:**
- Consumes: `FB.Controller`, `FB.Persistence`.
- Produces: `FB.StateApi.install(controller, target)` → defines `target.FractionBars = { getState(), loadState(obj), onChange(cb), version }` where `getState()` returns the v2 object (`FB.Persistence.serialize(controller.state)`), `loadState(obj)` validates `format/version` then rebuilds via `FB.Persistence.deserialize` + `controller` setters + refresh, `onChange(cb)` registers a listener fired after each mutation. `FB.StateApi.installPostMessage(api, win)` → listens for `{source:'hermes', type:'getState'|'loadState', payload}` and replies via `win.postMessage({source:'fraction-bars', ...})` with **origin checks** (only respond to a configured allowlist; never `*` for replies to a known opener). `src/main.js` wires renderer+controller+pointer+toolbar+dialogs+gallery+i18n on `DOMContentLoaded`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/state-api.test.mjs`
Expected: FAIL — `FB.StateApi` undefined.

- [ ] **Step 3: Write minimal implementation**

Implement `FB.StateApi.install` and `installPostMessage` per the interface (validate `format==='fraction-bars' && version>=2` in `loadState`, throw otherwise; maintain a `listeners` array fired by a `controller.onMutate` hook — add a tiny `controller.notifyChange()` called from mutating methods/`refresh`). Implement `src/main.js` bootstrap. Add both to `build.manifest.json` (main.js last).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd FB_Summer_2026 && node --test test/state-api.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/api src/main.js build.manifest.json test/state-api.test.mjs
git commit -m "api: window.FractionBars state API + origin-checked postMessage bridge; app bootstrap

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Seal the build + automated security assertions + swap in artifact

**Files:**
- Create: `test/seal.test.mjs`
- Modify: `FB_Summer_2026/Fraction_Bars.html` (replace with built artifact)
- Create: `FB_Summer_2026/README.md` (build/deploy/security notes, schema doc)

**Interfaces:**
- Produces: a reproducible `Fraction_Bars.html` artifact and a test asserting the sealed file contains no banned patterns and a correct CSP.

- [ ] **Step 1: Write the failing test**

```js
// test/seal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;

test('build produces sealed Fraction_Bars.html with strict CSP and no banned patterns', () => {
  execFileSync('node', ['build.mjs'], { cwd: ROOT });
  const html = readFileSync(ROOT + 'Fraction_Bars.html', 'utf8');
  assert.ok(html.includes("connect-src 'none'"), 'CSP blocks network');
  assert.ok(/script-src 'sha256-/.test(html), 'CSP hashes inline script');
  assert.ok(!/<script[^>]+src=/.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+href=/.test(html), 'no external styles');
  assert.ok(!/\beval\s*\(/.test(html), 'no eval');
  assert.ok(!/\bnew Function\s*\(/.test(html), 'no Function constructor');
  assert.ok(!/jquery/i.test(html), 'no jQuery');
  assert.ok(!/\.innerHTML\s*=/.test(html), 'no innerHTML assignment');
  assert.ok(!/https?:\/\//.test(html.replace(/w3\.org\/2000\/svg|http-equiv|education\.indiana\.edu/g,'')), 'no remote URLs');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd FB_Summer_2026 && node --test test/seal.test.mjs`
Expected: FAIL until manifest includes all sources and code is free of banned patterns; fix any offending source (e.g., replace any `.innerHTML=` with DOM APIs) until green.

- [ ] **Step 3: Make it pass**

Finalize `build.manifest.json` ordering, run the build, and remediate any banned-pattern hits in `src/`. Write `README.md` documenting: how to build (`node build.mjs`), how to run tests (`node --test test/`), the security model (CSP, no-network, no-eval, iframe sandbox guidance), and the v2 save schema (for Hermes).

- [ ] **Step 4: Run the full suite**

Run: `cd FB_Summer_2026 && node --test test/`
Expected: PASS (all unit + seal tests).

- [ ] **Step 5: Commit**

```bash
git add FB_Summer_2026/Fraction_Bars.html FB_Summer_2026/README.md test/seal.test.mjs FB_Summer_2026/build.manifest.json
git commit -m "build: seal single-file artifact; automated security assertions; docs + schema

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: E2E + visual parity + touch verification via /browse

**Files:**
- Create: `test/e2e/checklist.md` (recorded results, screenshots)

**Interfaces:** none (manual-driven via the gstack `/browse` skill).

- [ ] **Step 1: Capture the baseline**

Use `/browse` to open the ORIGINAL `FB_Summer_2026/Fraction_Bars_files/`-backed app (the pre-existing `Fraction_Bars.html` from git history / `Fraction_Bars_files`) and screenshot: empty canvas, a bar, a split bar, a measured bar, the Properties dialog, the Split dialog. Save as `before-*`.

- [ ] **Step 2: Exercise the new app**

Use `/browse` to open the new sealed `FB_Summer_2026/Fraction_Bars.html` and perform, capturing screenshots and noting pass/fail in `checklist.md`:
draw Bar; draw Mat; Copy; Set Unit Bar + Measure (assert typeset fraction); Parts (whole, vertical, 3); Parts (part of selected split); Line manual split; Break Apart; Pull Out Parts; Clear Parts; Iterate (2, one-way and two-way); Repeat; Join (two bars); Make (1 1/2); Label; color change + per-split recolor; Undo/Redo; Save → reload via Open (round-trip); open the synthesized legacy v1 file; gallery save/load; Print (vector); Hide/Show; Properties flags; keyboard shortcuts.

- [ ] **Step 3: Touch + responsive checks**

In `/browse`, emulate a touch device: verify tap-select, drag-move, draw, and the "add to selection" toggle work via Pointer Events; verify layout reflows at ≥900px (side rail) and < 600px (wrapping toolbar) with ≥44px targets.

- [ ] **Step 4: Visual diff**

Compare before/after screenshots; confirm the look is preserved (toolbar grouping, colors, canvas styling, fraction now typeset). Record deltas in `checklist.md`; file/fix any regressions as follow-up edits to the relevant `src/` file (with its own commit) and rebuild.

- [ ] **Step 5: Commit**

```bash
git add FB_Summer_2026/test/e2e/checklist.md
git commit -m "test: E2E/visual parity, touch + responsive verification via browse

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (completed by author)

**Spec coverage:** §3 layers → Tasks 2–13. §4 functions → Tasks 3 (model ops), 9 (controller orchestration), 10 (tool dispatch), 11 (dialogs); parity verified in Task 15. §5 SVG render → Tasks 7–8. §6 touch/responsive → Tasks 10, 12, 15. §7 persistence (v1/v2/gallery/API) → Tasks 4, 5, 6, 13. §8 security → Tasks 1, 13 (origin checks), 14 (assertions). §9 source/build/tests → Tasks 1, 14, plus per-task tests. Acceptance criteria §11 → Task 14 (seal) + Task 15 (E2E).

**Placeholder scan:** No TBD/TODO; every code step has runnable content; the two port-heavy tasks (2, 3, 9) specify exact verbatim-with-named-transformations rules rather than re-pasting hundreds of lines, which is intentional and unambiguous.

**Type consistency:** `FB.Persistence` (serialize/deserialize/toJSON/parseFile/resolveRefs/detectVersion), `FB.Controller.create({renderer,notify,getMarkedIterate})` with `.state`, `FB.Renderer.create(svgRoot,doc)` with `.render(scene)`, `FB.Typeset.parseFraction/buildFractionSVG`, `FB.Gallery.create(adapter)`, `FB.StateApi.install/installPostMessage`, `FB.I18N.set/t`, `FB.Toolbar.dispatch/bind`, `FB.Pointer.attach` — names are consistent across all consuming tasks.
