// Coverage for model operations the original review found untested: iterate,
// repeat, splitSelectedSplit, splitBarAtPoint, horizontal join, and createFraction
// edge cases. These exercise the geometry that the math-educator design depends on.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';

const M = ['src/model/Point.js', 'src/model/Line.js', 'src/model/Split.js', 'src/model/Mat.js', 'src/model/Utilities.js', 'src/model/Bar.js', 'src/model/CanvasState.js'];
const FB = loadFB(M);

test('iterate(3, horizontal) joins two copies -> width tripled', () => {
	var a = FB.Bar.create(0, 0, 50, 30, 'bar', '#ff0');
	a.iterate(3, false);
	assert.equal(a.w, 150);
	assert.ok(a.splits.length >= 2);
});

test('repeat joins the repeatUnit snapshot -> width doubled', () => {
	var a = FB.Bar.create(0, 0, 50, 30, 'bar', '#ff0');
	a.setRepeatUnit();
	a.repeat(FB.Point.fromCoords(10, 10));
	assert.equal(a.w, 100);
	assert.equal(a.splits.length, 2);
});

test('repeat with no repeatUnit does not throw', () => {
	var a = FB.Bar.create(0, 0, 50, 30, 'bar', '#ff0');
	assert.doesNotThrow(function () { a.repeat(FB.Point.fromCoords(1, 1)); });
});

test('splitSelectedSplit subdivides only the selected part', () => {
	var a = FB.Bar.create(0, 0, 90, 30, 'bar', '#ff0');
	a.wholeBarSplits(3, true);          // 3 cells of width 30
	a.splits[1].isSelected = true;
	a.splitSelectedSplit(2, true);      // split that one cell into 2
	assert.equal(a.splits.length, 4);
	var widths = a.splits.map(function (s) { return s.w; }).sort(function (x, y) { return x - y; });
	assert.equal(widths[0], 15);        // the two new sub-cells are 15 wide
	assert.equal(widths[1], 15);
});

test('splitBarAtPoint on an unsplit bar makes two cells at the point (vertical line)', () => {
	var a = FB.Bar.create(0, 0, 100, 30, 'bar', '#ff0');
	a.splitBarAtPoint(FB.Point.fromCoords(40, 15), false);
	assert.equal(a.splits.length, 2);
	var ws = a.splits.map(function (s) { return s.w; }).sort(function (x, y) { return x - y; });
	assert.equal(ws[0], 40);
	assert.equal(ws[1], 60);
});

test('join side-by-side bars (matching height) sums width', () => {
	var a = FB.Bar.create(0, 0, 40, 30, 'bar', '#ff0');
	var b = FB.Bar.create(40, 0, 50, 30, 'bar', '#0f0');
	assert.equal(a.join(b), true);
	assert.equal(a.w, 90);
	assert.equal(a.splits.length, 2);
});

test('createFraction reduces 100/300 to 1/3 and 150/100 to 3/2', () => {
	assert.equal(FB.Utilities.createFraction(100, 300), '1/3');
	assert.equal(FB.Utilities.createFraction(150, 100), '3/2');
});

test('createFraction does not leak undeclared globals i/n/d', () => {
	FB.Utilities.createFraction(50, 100);
	assert.equal(typeof FB.i, 'undefined');
	assert.equal(typeof FB.n, 'undefined');
	assert.equal(typeof FB.d, 'undefined');
});
