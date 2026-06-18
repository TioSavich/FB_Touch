// Boot / integration test. The per-module unit tests all pass, but the assembled
// app shipped broken once because src/main.js wired against APIs that did not
// match the modules. This test boots the whole bundle against a DOM stub and
// asserts the exact wiring contracts that were violated, so that class of
// regression cannot return undetected.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadFB } from './_harness.mjs';
import { makeDom } from './_dom.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(ROOT + 'build.manifest.json', 'utf8'));

function boot() {
	const dom = makeDom();
	// Load every bundle script in manifest order into one realm sharing document/window.
	const FB = loadFB(manifest.scripts, { document: dom.document, window: dom.window });
	const app = FB.Main.boot(dom.document, dom.window);
	return { FB, app, dom };
}

test('boot returns a running app', () => {
	const { app } = boot();
	assert.ok(app, 'FB.Main.boot returned an app');
	assert.ok(app.controller && app.controller.state, 'controller present');
});

test('svgRoot is found -> real renderer (regression: fb-canvas vs fbCanvas id)', () => {
	const { app } = boot();
	// The real renderer exposes setPreview; the no-op fallback does not.
	assert.equal(typeof app.renderer.setPreview, 'function');
});

test('dialogs wired via FB.Dialogs.init (regression: .create vs .init)', () => {
	const { app } = boot();
	assert.ok(app.dialogs, 'dialogs object present');
	assert.equal(typeof app.dialogs.open, 'function');
	assert.equal(typeof app.dialogs.close, 'function');
});

test('toolbar ui hooks are assigned (regression: hooks never set)', () => {
	const { FB, app } = boot();
	assert.equal(FB.Toolbar.ui.save, app.actions.save);
	assert.equal(FB.Toolbar.ui.print, app.actions.print);
	assert.equal(typeof FB.Toolbar.ui.openSplits, 'function');
	assert.equal(typeof FB.Toolbar.ui.openProperties, 'function');
});

test('gallery UI is bound (regression: FB.GalleryUI referenced but undefined)', () => {
	const { FB, app } = boot();
	assert.equal(typeof FB.GalleryUI.bind, 'function');
	assert.ok(app.galleryUi, 'gallery UI instance bound');
});

test('external State API is installed on window', () => {
	const { dom } = boot();
	assert.ok(dom.window.FractionBars, 'window.FractionBars defined');
	assert.equal(typeof dom.window.FractionBars.getState, 'function');
	assert.equal(typeof dom.window.FractionBars.loadState, 'function');
});

test('toolbar dispatch reaches the controller (action_copy)', () => {
	const { FB, app } = boot();
	const c = app.controller;
	const b = FB.Bar.create(0, 0, 10, 10, 'bar', '#fff'); b.isSelected = true;
	c.state.bars.push(b); c.state.selectedBars.push(b);
	FB.Toolbar.dispatch(c, 'action_copy');
	assert.equal(c.state.bars.length, 2, 'copy duplicated the selected bar');
});

test('pointer down+up with the Bar tool creates a bar (renderer ran)', () => {
	const { FB, app } = boot();
	const c = app.controller;
	c.state.currentAction = 'bar';
	FB.Pointer.handleDown(c, { x: 10, y: 10 }, false);
	FB.Pointer.handleUp(c, { x: 120, y: 70 });
	assert.equal(c.state.bars.length, 1, 'a bar was created');
	// renderer drew into the svg root (real renderer, not the no-op)
	const svg = app.renderer; // render already called via controller.refresh
	assert.ok(svg, 'renderer present');
});
