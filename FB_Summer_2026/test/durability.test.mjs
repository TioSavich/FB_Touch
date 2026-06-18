// Durability / adversarial-input regressions found during the "beat it to hell"
// QA pass: measure-without-unit-bar must not throw, malformed save data must
// coerce to safe values, makeMake rejects non-positive fractions, and a
// degenerate tap (no drag) must not create a zero-size object.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';

const MODEL = ['src/model/Point.js', 'src/model/Line.js', 'src/model/Split.js', 'src/model/Mat.js', 'src/model/Utilities.js', 'src/model/Bar.js', 'src/model/CanvasState.js'];

test('toFinite / toNonNeg coerce junk to safe numbers', () => {
	const FB = loadFB(MODEL);
	const F = FB.Utilities;
	assert.equal(F.toFinite(NaN), 0);
	assert.equal(F.toFinite(undefined), 0);
	assert.equal(F.toFinite('12'), 12);
	assert.equal(F.toFinite(-3), -3);          // negatives allowed for x/y
	assert.equal(F.toNonNeg(-3), 0);           // not for w/h/size
	assert.equal(F.toNonNeg('50'), 50);
	assert.equal(F.toNonNeg(NaN), 0);
});

test('Bar.copyFromJSON coerces malformed fields (no NaN/undefined leak)', () => {
	const FB = loadFB(MODEL);
	const b = FB.Bar.copyFromJSON({ x: 'a', y: null, w: NaN, h: undefined, size: 'x', color: 123, splits: 'nope', label: null, type: 7 });
	assert.equal(b.x, 0); assert.equal(b.y, 0); assert.equal(b.w, 0); assert.equal(b.h, 0); assert.equal(b.size, 0);
	assert.equal(typeof b.color, 'string');
	assert.equal(b.label, '');
	assert.equal(b.type, 'bar');
	assert.equal(b.splits.length, 0);          // non-array splits -> []
});

test('Bar.copyFromJSON keeps valid data intact', () => {
	const FB = loadFB(MODEL);
	const b = FB.Bar.copyFromJSON({ x: 10, y: 20, w: 100, h: 40, size: 4000, color: '#ABCDEF', splits: [{ x: 0, y: 0, w: 50, h: 40, color: '#fff' }], label: 'q', isUnitBar: true, fraction: '1/2', type: 'bar' });
	assert.equal(b.w, 100); assert.equal(b.color, '#ABCDEF'); assert.equal(b.label, 'q');
	assert.equal(b.isUnitBar, true); assert.equal(b.splits.length, 1); assert.equal(b.splits[0].w, 50);
});

test('measureBars without a unit bar notifies instead of throwing', () => {
	const FB = loadFB([...MODEL, 'src/render/controller.js']);
	let msg = null;
	const c = FB.Controller.create({ renderer: { render() {} }, notify: (m) => { msg = m; }, getMarkedIterate: () => false });
	const b = FB.Bar.create(0, 0, 50, 50, 'bar', '#fff'); b.isSelected = true;
	c.state.bars.push(b); c.state.selectedBars = [b];
	assert.doesNotThrow(() => c.measureBars());
	assert.equal(b.fraction, '');           // unchanged
	assert.ok(msg && /unit bar/i.test(msg));
});

test('makeMake rejects non-positive / non-finite fractions', () => {
	const FB = loadFB([...MODEL, 'src/render/controller.js']);
	const c = FB.Controller.create({ renderer: { render() {} }, notify() {}, getMarkedIterate: () => false });
	const u = FB.Bar.create(0, 0, 100, 40, 'bar', '#fff'); u.isSelected = true;
	c.state.bars.push(u); c.state.selectedBars = [u];
	c.makeMake(-5); c.makeMake(0); c.makeMake(NaN); c.makeMake(Infinity);
	assert.equal(c.state.bars.length, 1, 'no junk bars created');
	c.makeMake(0.5);
	assert.equal(c.state.bars.length, 2, 'valid fraction still works');
});

test('degenerate tap (no drag) does not create a zero-size bar', () => {
	const FB = loadFB([...MODEL, 'src/render/controller.js', 'src/input/toolbar.js', 'src/input/pointer.js']);
	const c = FB.Controller.create({ renderer: { render() {} }, notify() {}, getMarkedIterate: () => false });
	c.state.currentAction = 'bar';
	FB.Pointer.handleDown(c, { x: 100, y: 100 }, false);
	FB.Pointer.handleUp(c, { x: 101, y: 101 });          // ~1px: a tap
	assert.equal(c.state.bars.length, 0, 'tap created nothing');

	c.state.currentAction = 'bar';
	FB.Pointer.handleDown(c, { x: 100, y: 100 }, false);
	FB.Pointer.handleUp(c, { x: 200, y: 160 });          // a real drag
	assert.equal(c.state.bars.length, 1, 'a real drag still draws');
});
