# Fraction Bars — E2E / Visual / Touch Verification

Date: 2026-06-17
Method: gstack `/browse` (headless Chromium) against the sealed
`Fraction_Bars.html` served over `http://127.0.0.1` (the `file://` scheme is
blocked by the browse sandbox; HTTP serving does not relax the in-page CSP).

## Boot & security
- [x] Loads with **no console errors/warnings** under the strict CSP (the inline
      script/style hashes match; nothing is blocked).
- [x] `window.FractionBars` and `window.FB.app` present after boot (regression
      guard for the prior `fb-canvas` vs `fbCanvas` id mismatch).
- [x] Toolbar + canvas visible; 27 tool/action/window buttons present in the
      original group order and wording.
- [x] No network requests (sealed, `connect-src 'none'`).

## Rendering (vector / typeset)
- [x] `loadState` renders bars as SVG `<rect>`s (6 rects for unit bar + split
      half-bar + outlines).
- [x] Fractions **typeset** as stacked vulgar fractions (2 vinculum `<line>`s for
      `1/1` and `1/2`) — the requested upgrade over flat `"1/2"` text.
- [x] "Unit Bar" caption rendered under the unit bar.
- [x] Split borders red (`#FF0000`), matching the original look.
- [x] Per-bar label ("half") rendered bottom-left.

## Touch / pointer (touch-native)
- [x] Selecting the **Bar** tool sets `currentAction='bar'`.
- [x] A `PointerEvent` sequence with `pointerType:'touch'` (down/move/up) **draws a
      bar** → 1 model bar, 1 SVG group.
- [x] Tapping a bar selects it (1 selected).

## Functions (parity)
- [x] **Parts** dialog opens (native `<dialog>`).
- [x] **Properties** dialog opens.
- [x] **Undo** then **Undo** returns to empty; **Redo** restores — stack ordering
      correct. (Opening Parts pushes an undo snapshot, faithful to the original.)
- [x] Color palette, Set Unit Bar / Measure / Make / Label, Hide/Show, Add to
      Selection toggle all present and wired.

## Modern save/load
- [x] In-browser **gallery**: "Save to browser" stores named work; list shows it.
- [x] **Persists across reload** (IndexedDB) — "My Halves" survived a full reload.
- [x] Legacy `.txt` v1 import + v2 round-trip covered by unit tests
      (`persistence-v1/v2.test.mjs`); file Save/Open wired in `appActions.js`.

## Responsive
- [x] Desktop (≥900px): toolbar is a fixed side rail (CSS grid).
- [x] Mobile (375×812): toolbar wraps into grouped rows, ≥44px targets, canvas and
      gallery stack below (flex layout). Screenshot: clean and touch-usable.

## Screenshots captured
- `/tmp/fb-loaded.png` (desktop, loaded state)
- `/tmp/fb-drawn.png` (after touch draw)
- `/tmp/fb-mobile.png` (responsive)

## Notes / follow-ups
- Authentic Turkish **UI label** strings (toolbar/dialogs) were not present in the
  provided sources (only the inline TR `alert` strings were). The `data-i18n` +
  `FB.I18N.apply` mechanism is in place and switches the strings we have; TR UI
  labels fall back to English until a `lang_tur` UI string set is supplied.
- Fraction typeset sits just above the bar's top-right; legible but could be
  nudged down a few px in a future polish pass.
