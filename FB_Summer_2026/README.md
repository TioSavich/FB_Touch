# Fraction Bars

A single-file, offline, dependency-free fraction-bars manipulative. The shipped
artifact is one self-contained `Fraction_Bars.html` that runs from `file://`, a
USB stick, an LMS upload, or any static host with no network access of any kind.

The application is authored as small ES classic scripts under `src/`, each
attaching to a single global `FB` namespace. A deterministic build concatenates
them (plus the CSS and body markup) into the sealed `Fraction_Bars.html`, deriving
a Content-Security-Policy whose `script-src`/`style-src` hashes pin the exact
inline bundle that shipped.

## Build

```
node build.mjs
```

This reads `build.manifest.json` (the ordered list of scripts, the stylesheet,
and the body-markup file), concatenates them, computes the SHA-256 hashes of the
inline script and style blocks, injects a strict CSP `<meta>` tag, and writes the
result to `Fraction_Bars.html` (the `out` field of the manifest).

The build is reproducible: identical sources produce an identical artifact and
identical CSP hashes. `build.mjs` has zero third-party dependencies (only the
Node standard library: `fs`, `crypto`, `path`, `url`).

`build.mjs` also exports `buildHtml(manifest, rootDir)` so tests can build
in-process and inspect the HTML, hashes, and CSP without touching disk.

## Test

```
npm test
```

(equivalently `node --test "test/**/*.test.mjs"` — note the glob; the bare
`node --test test/` form is interpreted by Node 22 as a module path and fails.)

Runs the full Node built-in test suite: model primitives, bar geometry, model
operations (join/split/iterate/repeat), persistence (v1 legacy import and v2
round-trip), the gallery store, typeset fractions, the SVG renderer, the
controller, pointer input, the splits widget, i18n strings, the external State
API, the postMessage bridge, the boot/integration wiring, the build, and the
seal/security assertions. No test runner, transpiler, or third-party assertion
library is required.

To run only the security seal:

```
node --test test/seal.test.mjs
```

`test/seal.test.mjs` runs the build and then asserts the produced
`Fraction_Bars.html`:

- contains `connect-src 'none'` (no network),
- pins the inline script with a `script-src 'sha256-...'` hash,
- has **no** external `<script src=...>` and **no** external `<link href=...>`,
- contains **no** `eval(`, **no** `new Function(`, **no** `jquery`,
- contains **no** `.innerHTML =` assignment,
- contains **no** remote `http(s)://` URL except the W3C SVG namespace
  (`http://www.w3.org/2000/svg`), the `http-equiv` attribute name, and the
  documented `education.indiana.edu` attribution string.

## Security model

The artifact is built to run untrusted-content-free and network-free.

- **Strict CSP.** The injected meta CSP is:
  `default-src 'none'; script-src 'sha256-<bundle>'; style-src 'sha256-<bundle>';
  img-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none';
  form-action 'none'`.
  Only the exact inline bundle that was hashed at build time can execute; any
  injected or modified script fails the hash and is blocked.
- **No network.** `connect-src 'none'` blocks `fetch`/XHR/WebSocket/`sendBeacon`;
  `default-src 'none'` blocks every other fetch directive not explicitly
  re-allowed. Images are limited to `data:`/`blob:` (used for export/print only).
- **No dynamic code execution.** There is no `eval`, no `new Function`, no
  `setTimeout("string", ...)`. All behavior is static, hashed source.
- **No markup injection.** The code never assigns to `.innerHTML`; the DOM and SVG
  are built with `createElement`/`createElementNS`, `textContent`, and explicit
  attribute setters. User-supplied labels/fractions are rendered as text nodes,
  never parsed as markup.
- **No third-party code.** Zero runtime dependencies. The former jQuery / jQuery-UI
  layer was replaced with platform APIs (Pointer Events, native `<dialog>`,
  `<input type=range>`).
- **Origin-checked integration.** The `postMessage` bridge (see below) refuses
  messages from any origin not on its allowlist, never trusts `"null"` or `"*"`,
  and always replies to the verified sender origin rather than `"*"`.

### Iframe sandbox guidance

When embedding `Fraction_Bars.html` in a host page (LMS / Hermes shell), serve it
in a sandboxed iframe and grant only what the manipulative needs:

```
<iframe src="Fraction_Bars.html"
        sandbox="allow-scripts allow-downloads"
        referrerpolicy="no-referrer"></iframe>
```

- Include `allow-scripts` (the app is client-side JS).
- Include `allow-downloads` only if learners should be able to save `.json`
  state files locally.
- **Do not** add `allow-same-origin` together with `allow-scripts` if the iframe
  is served from your own origin and you rely on the sandbox for isolation; that
  combination lets framed content remove its own sandbox.
- Drive state across the boundary with the origin-checked `postMessage` contract,
  and pass the host origin into `allowedOrigins` (a sandboxed-without-same-origin
  iframe reports `origin === "null"`, which the bridge rejects by design, so use
  `allow-same-origin` from a trusted host origin when you need the bridge, or
  drive the in-page `FractionBars` API directly).

## External integration API

`FB.StateApi.install(controller, target)` defines on `target`:

```
target.FractionBars = {
  getState(),          // -> v2 state object (see schema below)
  loadState(stateObj), // restore a v2 state object; throws on bad format/version
  onChange(cb),        // register a callback fired on every mutation/refresh
  version              // current schema version (2)
}
```

`FB.StateApi.installPostMessage(api, win, { allowedOrigins })` bridges that
contract over `window.postMessage`:

- Inbound request: `{ source: 'hermes', type: 'getState' | 'loadState',
  payload?, requestId? }`.
- Outbound reply: `{ source: 'fraction-bars', type, requestId?, ok,
  payload | error }`, posted back to the verified `event.origin` only.
- Messages from non-allowlisted origins, from `"null"`, or from `"*"` are
  ignored. Unknown `type` values are ignored silently.

## v2 save schema (for Hermes)

`getState()` / file save produce a plain JSON object:

```jsonc
{
  "format": "fraction-bars",   // constant tag; loadState rejects anything else
  "version": 2,                 // integer; loadState requires version >= 2
  "bars": [ /* Bar objects, in z-order */ ],
  "mats": [ /* Mat objects */ ],
  "unitBarIndex": 0,            // index into "bars" of the unit bar, or null
  "hidden": [ /* implementation-defined hidden-element records */ ]
}
```

### Bar object

```jsonc
{
  "x": 40, "y": 60,             // top-left position, canvas pixels
  "w": 200, "h": 40,            // width and height, canvas pixels
  "size": 200,                  // intrinsic size used for measurement math
  "color": "#7fc7ff",           // fill color (CSS color string)
  "label": "one half",          // optional user label (rendered as text only)
  "isUnitBar": false,           // true for the designated unit bar
  "fraction": "1/2",            // measured fraction string ("1/1" for the unit bar)
  "type": "bar",                // element type discriminator
  "splits": [                   // partition rectangles, in order
    { "x": 40, "y": 60, "w": 100, "h": 40, "color": "#7fc7ff" },
    { "x": 140, "y": 60, "w": 100, "h": 40, "color": "#ffd27f" }
  ]
}
```

### Mat object

```jsonc
{
  "x": 20, "y": 20,
  "w": 300, "h": 120,
  "size": 300,
  "color": "#eef3f8",
  "type": "mat"
}
```

### Notes for integrators

- `unitBarIndex` is the index of the unit bar within `bars`. On load, the bar at
  that index has `isUnitBar` forced to `true` and `fraction` forced to `"1/1"`.
  Use `null` when no unit bar is set.
- All coordinates and sizes are canvas pixels; the renderer scales SVG to fit.
- `label`, `fraction`, and `color` are user/derived text and are always rendered
  as text nodes or as discrete SVG attributes, never as markup.
- `loadState` validates `format === "fraction-bars"` and `version >= 2` and
  throws on mismatch; it tolerates forward-compatible additive fields.
- Legacy v1 files (the original `mBars`/`mMats` Crockford-cycle format) are
  imported by `FB.Persistence` on open and re-serialized as v2 on the next save.

## Source layout

```
build.mjs              Deterministic single-file build (Node stdlib only)
build.manifest.json    Ordered script/style/body inputs and output filename
src/model/             Geometry + canvas state (Point, Line, Split, Mat, Bar, ...)
src/persistence/       v2 format, v1 legacy import, gallery store
src/render/            typeset fractions, SVG renderer, controller
src/input/             Pointer Events input + toolbar dispatch
src/chrome/            Native <dialog> dialogs + splits widget
src/i18n/              UI strings
src/api/               External State API + origin-checked postMessage bridge
src/styles/app.css     Stylesheet
src/body.html          Body markup (toolbar, canvas, dialogs)
test/                  node:test suites incl. seal/security assertions
```
