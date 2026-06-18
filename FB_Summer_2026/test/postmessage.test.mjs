// Security-sensitive coverage for the postMessage bridge: origin allowlisting,
// the refusal to ever reply with '*', rejection of 'null'/disallowed origins, and
// a working getState/loadState round-trip from a trusted host. This is the surface
// an LTI/Hermes embedding relies on, so its origin checks must be pinned.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFB } from './_harness.mjs';

const FB = loadFB([
	'src/model/Point.js', 'src/model/Split.js', 'src/model/Mat.js', 'src/model/Utilities.js',
	'src/model/Bar.js', 'src/model/CanvasState.js', 'src/persistence/format.js',
	'src/render/controller.js', 'src/api/stateApi.js'
]);

function setup(allowed) {
	const controller = FB.Controller.create({ renderer: { render() {} }, notify() {}, getMarkedIterate: () => false });
	const target = {};
	FB.StateApi.install(controller, target);
	const win = { location: { origin: 'https://tool.host' }, addEventListener() {} };
	const handler = FB.StateApi.installPostMessage(target.FractionBars, win, { allowedOrigins: allowed });
	return { controller, api: target.FractionBars, handler };
}

function source() {
	const out = [];
	return { posts: out, postMessage: (msg, origin) => out.push({ msg, origin }) };
}

test('trusted origin getState replies to the sender origin (never "*")', () => {
	const { handler } = setup(['https://lms.example']);
	const src = source();
	handler({ origin: 'https://lms.example', source: src, data: { source: 'hermes', type: 'getState', requestId: 7 } });
	assert.equal(src.posts.length, 1);
	assert.equal(src.posts[0].origin, 'https://lms.example');
	assert.notEqual(src.posts[0].origin, '*');
	assert.equal(src.posts[0].msg.source, 'fraction-bars');
	assert.equal(src.posts[0].msg.ok, true);
	assert.equal(src.posts[0].msg.requestId, 7);
	assert.equal(src.posts[0].msg.payload.format, 'fraction-bars');
});

test('disallowed origin is ignored (no reply)', () => {
	const { handler } = setup(['https://lms.example']);
	const src = source();
	handler({ origin: 'https://evil.example', source: src, data: { source: 'hermes', type: 'getState' } });
	assert.equal(src.posts.length, 0);
});

test('"null" and "*" origins are never trusted', () => {
	const { handler } = setup(['https://lms.example']);
	const src = source();
	handler({ origin: 'null', source: src, data: { source: 'hermes', type: 'getState' } });
	handler({ origin: '*', source: src, data: { source: 'hermes', type: 'getState' } });
	assert.equal(src.posts.length, 0);
});

test('non-hermes messages from a trusted origin are ignored', () => {
	const { handler } = setup(['https://lms.example']);
	const src = source();
	handler({ origin: 'https://lms.example', source: src, data: { source: 'somethingelse', type: 'getState' } });
	assert.equal(src.posts.length, 0);
});

test('loadState over the bridge replaces the model', () => {
	const { controller, handler } = setup(['https://lms.example']);
	const src = source();
	handler({
		origin: 'https://lms.example', source: src,
		data: {
			source: 'hermes', type: 'loadState', payload: {
				format: 'fraction-bars', version: 2,
				bars: [{ x: 0, y: 0, w: 5, h: 5, size: 25, color: '#fff', label: '', isUnitBar: false, fraction: '', type: 'bar', splits: [] }],
				mats: [], unitBarIndex: null, hidden: []
			}
		}
	});
	assert.equal(controller.state.bars.length, 1);
	assert.equal(src.posts[0].msg.ok, true);
});
