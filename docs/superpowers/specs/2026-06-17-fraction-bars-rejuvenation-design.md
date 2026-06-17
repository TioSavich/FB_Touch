# Fraction Bars — Full-Body Rejuvenation

**Date:** 2026-06-17
**Status:** Approved (design); pending implementation plan
**Working tree:** `FB_Touch/FB_Summer_2026/`
**Origin lineage:** TIMA Bars (John Olive & Leslie Steffe) → Transparent Media desktop Fraction Bars → JS version by James P. Burke & Jason Orrill, modified by Hakan Sandir (UMass Dartmouth). This work is a rejuvenation, not a rewrite of intent.

## 1. Goal

Modernize the Fraction Bars web app to be touch-screen native, dependency-free, vector-rendered, scalable to any screen, and "hermetically sealed" for school deployment — **while preserving the exact look and the complete set of existing functions**, which were carefully designed by math educators and are assumed meaningful. The app is destined to be embedded in Canvas via LTI and exposed as a tool for **Hermes**, a Prolog/neurosymbolic "hermeneutic calculator"; this task delivers the front-end plus clean hooks for that future, not the backend itself.

## 2. Non-negotiable constraints

1. **Preserve every existing function** (full inventory in §4). Behavior parity, including subtle behaviors.
2. **Keep the basic look the same** — toolbar grouping, labels, wording, colors, layout feel.
3. **Remove jQuery, jQuery UI, FileSaver.js, Blob.js, cycle.js.** No third-party runtime libraries.
4. **No CDN / no network.** All code local and inlined; nothing loads or phones home.
5. **Vector graphics** for the drawing surface and for print/export (no raster `<canvas>` as the source of truth, no PNG as the primary export).
6. **Touch-native** (Pointer Events) and **responsive** to screen size.
7. **Typeset labels** — fractions rendered as real stacked vulgar fractions, not flat `"3/4"` text.
8. **Security first** — strict CSP, no `eval`, no untrusted HTML injection; safe even if a JS flaw is later found.
9. **Backward-compatible** with existing `.txt` save files.
10. **Backend may be non-JS** later; design a Prolog-friendly state schema + state API now.

## 3. Architecture: keep the skin, replace the skeleton

The original cleanly separates a **model** from a **render+controller**. The model is preserved nearly verbatim; only the outer layers are rebuilt.

| Layer | Old | New |
| --- | --- | --- |
| Model (geometry/math) | `Bar`, `Mat`, `Split`, `Point`, `Line`, `CanvasState` | Same classes, ported to a single `FB.*` namespace, **no behavior change** |
| Render | `<canvas>` 2D context | Live **SVG DOM** (`viewBox="0 0 1000 700"`, CSS-scaled) |
| Input | jQuery `mousedown/move/up`, `dblclick`, shift key | **Pointer Events** (touch+mouse+stylus, one path) + touch multiselect toggle |
| Chrome | jQuery-UI dialogs / slider / draggable | Native `<dialog>` + `<input type=range>` |
| Persistence | FileSaver + Blob + Crockford cycle.js | Safe versioned JSON + IndexedDB gallery + state API |

Coordinate space stays the original ~1000×700 pixel space, so **old save files render in the same positions**.

## 4. Function inventory to preserve (parity checklist)

**Create:** Bar (drag rectangle), Mat (gray backing region).
**Transform:** Copy (bars + mats, with offset), Repeat (per-bar `repeatUnit` snapshot when tool enabled; click repeats/joins a copy), Iterate (n×, 1-way/2-way per Properties flag, vert/horiz), Join (exactly two bars, matching dimension rule across all 4 cases), Delete (bars + mats; clears measurements if unit bar deleted), Make (enter whole + num/denom → build proportional bar from selected via `makeNewCopy`).
**Partition:** Parts/Split (whole bar vs selected part, vertical/horizontal, 2–20 via slider; subsplit logic in `wholeBarSubSplit`/`wholeBarSplits`/`splitSelectedSplit`), Line/manual split (`splitBarAtPoint`, vert/horiz governed by Properties flag + shift), Break Apart (each split → its own bar), Pull Out Parts (`pullOutSplit` — selected split becomes a new bar), Clear Parts (`clearSplits`).
**Measure:** Set Unit Bar (one bar; clears prior measurements), Measure (`Utilities.createFraction` continued-fraction → "n/d" or integer, relative to unit bar size).
**Annotate:** Label (per-bar text overlay input), 8 quick colors + 16-color palette, per-split recolor when a split is selected, background color (Properties).
**Workflow:** Undo/Redo (≤100 deep, cached pre-drag state), Save/Open (multi-file), multi-file Prev/Next gallery navigation + file dropdown, New (confirm-save then reset), Print, Properties (flag0 create same/new, flag1 two-way split enabling vert/horiz, flag2 two-way iterate, flag3 language EN/TR, background color), Hide/Show toolbar buttons (with Ctrl+H toggle of the Hide/Show controls themselves), shift-multiselect, drag-move bars/mats, keyboard shortcuts (Ctrl+P Properties, Ctrl+S Save, Ctrl+H Hide toggle, Ctrl+Del Delete).
**i18n:** English (default) + Turkish strings preserved, moved from CSS `:before` hack to a JS string table.
**Subtle behaviors preserved:** `marked-iterate` flag's effect on split coloring on iterate/repeat; `unPastel`/`setRepeatUnit` structure (kept even where currently inert — assumed meaningful); whole-vs-part split branching; bar-to-front on selection; "Unit Bar" caption; fraction at top-right, label at bottom-left of each bar.

## 5. Rendering details (SVG)

- Single `<svg>` with `viewBox="0 0 1000 700"`, scales responsively; crisp at any DPI/screen.
- Bar → `<g>`: base `<rect>`, per-split `<rect>`s (with selection marker), selection outline (thicker stroke when selected), label text, and a **typeset fraction** (numerator / vinculum / denominator as vector; mixed numbers handled; integers rendered plain).
- Mat → `<rect>`.
- Rubber-band create preview, drag, manual-split guide line, and the splits-preview widget are all SVG (no `getImageData`/`putImageData`).
- **Print** → vector SVG. **Export** → SVG (primary) and PNG (only for pasting into documents). No raster as source of truth.
- Label editing keeps an HTML `<input>` overlay positioned over the bar (matches current UX); the committed label is typeset in SVG.

## 6. Touch & responsive

- Pointer Events unify tap/drag/draw across touch, mouse, stylus.
- Touch multiselect: an on-screen **"add to selection"** toggle replaces shift-click when no keyboard; shift-click still works on desktop.
- Hit targets ≥44px; native range slider; browser handles pinch.
- Toolbar preserves exact group order and wording; reflows from a side rail (wide) to a wrapping bar (tablet/phone).

## 7. Persistence

### 7.1 Read (backward compatible)
- **v1 (legacy):** Crockford-decycled `CanvasState` JSON (`mBars`, `mMats`, `mUnitBar` as `$ref`, `mHidden`). Resolve `$ref` cycles by **safe path-walking — never `eval`**. This removes the legacy code-execution vector.
- **v2 (new):** see below.

### 7.2 Write (v2 schema — Prolog-friendly, acyclic)
```json
{
  "format": "fraction-bars",
  "version": 2,
  "bars":  [ { "x","y","w","h","size","color","label","isUnitBar","fraction","type",
               "splits":[ {"x","y","w","h","color"} ] } ],
  "mats":  [ { "x","y","w","h","size","color","type" } ],
  "unitBarIndex": <int|null>,
  "hidden": [ "<toolId>", ... ]
}
```
Same logical fields as today; unit bar by index (no cycle). Stable and documented for Hermes consumption.

### 7.3 Gallery
- IndexedDB named-save store: open / rename / delete / duplicate. Survives sessions so students don't lose work. File save/open remains for portability and handing files to teachers.

### 7.4 State API (Hermes / LTI hooks)
- `window.FractionBars.getState()` → v2 object.
- `window.FractionBars.loadState(obj)` → replace model, re-render.
- `window.FractionBars.onChange(cb)` → fires on model mutation.
- `postMessage` request/response mirror of the above for cross-frame (Canvas LTI iframe, Hermes) use.

## 8. Security model

- **Single self-contained `Fraction_Bars.html`**: all JS/CSS inlined; zero network.
- **Strict CSP via `<meta>`:** `default-src 'none'; script-src 'sha256-…'; style-src 'sha256-…'; img-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`. Inline script/style admitted only by SHA-256 hash (computed at build).
- **No `eval`, no `Function()`, no `innerHTML` of untrusted data.** Save files parsed as data; rendered through DOM APIs only.
- **No third-party runtime or build dependencies** (auditable for a school security review).
- Ships **iframe-sandbox-ready**; document recommended host embedding (`sandbox="allow-scripts"`, framed origin).

## 9. Source layout, build, tests

### 9.1 Source (dev-friendly, auditable)
Plain ES files under one namespace `FB.*`, CSS separate, organized by layer (model / render / input / chrome / persistence / api / i18n). No framework. Authored as ordered classic scripts (namespace pattern) so the build is a trivial, auditable concatenation — no bundler needed.

### 9.2 Build
A **zero-dependency Node script** concatenates sources in dependency order, inlines CSS, computes CSP SHA-256 hashes, and emits the sealed single-file `Fraction_Bars.html`. Swappable for a shell/Python/Make equivalent (backend needn't be JS).

### 9.3 Tests ("test thoroughly")
1. **Model unit tests** (`node:test`, zero-dep): `join` (all 4 dimension cases), `wholeBarSplits` / `splitSelectedSplit` / `splitBarAtPoint`, `iterate` / `repeat` / `makeNewCopy`, `createFraction` continued-fraction correctness, undo/redo stack depth + ordering.
2. **Save round-trip + migration:** synthesize a **v1 fixture** (legacy Crockford format, since no sample files exist in-repo) → load → assert model; serialize v2 → reload → assert identical; v1→v2 migration equality.
3. **E2E / visual** via the `/browse` skill: toolbar parity, draw/split/join/measure/label/iterate/repeat/break-apart/pull-out, pointer (touch) flows, responsive breakpoints, and a before/after visual diff against the current app to confirm the look is preserved.

## 10. Out of scope (this task)
- LTI 1.3 server and Hermes/Prolog bridge implementation (only the schema + state API hooks are delivered now).
- New pedagogical features beyond the existing function set.
- Pinch-zoom gestures beyond browser defaults.

## 11. Acceptance criteria
- All §4 functions work with behavior parity.
- No jQuery/jQuery-UI/FileSaver/Blob/cycle.js; no network requests; CSP enforced; no `eval`.
- SVG rendering scales crisply across screen sizes; fractions typeset.
- Pointer/touch interaction works on a touchscreen.
- Opens legacy `.txt` saves; saves/loads v2; gallery persists across sessions.
- Single sealed `Fraction_Bars.html` builds reproducibly from source.
- Model unit tests, save round-trip/migration tests, and E2E parity checks pass.
