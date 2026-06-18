// Minimal lazy DOM/window stub: just enough for FB.Main.boot to run end-to-end
// in Node so we can assert cross-module wiring. getElementById lazily creates and
// caches a stub element for any id (so every lookup succeeds and svgRoot is
// found). querySelector/All return empty -- the boot test asserts structural
// wiring, not full DOM querying (that is covered by the /browse E2E pass).

export function makeDom() {
	function makeEl(tag, ns) {
		var children = [];
		var attrs = {};
		var listeners = {};
		var classes = new Set();
		var el = {
			tagName: tag, namespaceURI: ns || null, children: children, style: {},
			value: '', checked: false, parentNode: null,
			get firstChild() { return children[0] || null; },
			setAttribute: function (k, v) {
				attrs[k] = String(v);
				if (k === 'class') { classes.clear(); String(v).split(/\s+/).forEach(function (c) { if (c) classes.add(c); }); }
				if (k === 'id') { el.id = v; }
			},
			getAttribute: function (k) { return (k in attrs) ? attrs[k] : null; },
			removeAttribute: function (k) { delete attrs[k]; },
			hasAttribute: function (k) { return k in attrs; },
			toggleAttribute: function (k, force) {
				var has = k in attrs;
				var want = (force === undefined) ? !has : !!force;
				if (want) { attrs[k] = ''; } else { delete attrs[k]; }
				return want;
			},
			classList: {
				add: function () { for (var i = 0; i < arguments.length; i++) classes.add(arguments[i]); },
				remove: function () { for (var i = 0; i < arguments.length; i++) classes.delete(arguments[i]); },
				contains: function (c) { return classes.has(c); },
				toggle: function (c, f) { var w = (f === undefined) ? !classes.has(c) : f; if (w) classes.add(c); else classes.delete(c); return w; }
			},
			appendChild: function (c) { children.push(c); if (c) c.parentNode = el; return c; },
			removeChild: function (c) { var i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
			replaceChildren: function () { children.length = 0; },
			addEventListener: function (t, h) { (listeners[t] || (listeners[t] = [])).push(h); },
			removeEventListener: function (t, h) { if (listeners[t]) listeners[t] = listeners[t].filter(function (x) { return x !== h; }); },
			dispatchEvent: function (ev) { (listeners[ev.type] || []).forEach(function (h) { h(ev); }); return true; },
			querySelector: function () { return null; },
			querySelectorAll: function () { return []; },
			getBoundingClientRect: function () { return { left: 0, top: 0, width: 1000, height: 700 }; },
			get textContent() { return el._text || ''; },
			set textContent(v) { el._text = v; children.length = 0; },
			focus: function () {}, click: function () { el.dispatchEvent({ type: 'click', preventDefault: function () {} }); },
			showModal: function () { el._open = true; }, close: function () { el._open = false; },
			_attrs: attrs, _classes: classes, _listeners: listeners
		};
		return el;
	}

	var registry = new Map();
	var document = {
		documentElement: makeEl('html'),
		body: makeEl('body'),
		title: '',
		getElementById: function (id) {
			if (!registry.has(id)) { var e = makeEl('div'); e.setAttribute('id', id); registry.set(id, e); }
			return registry.get(id);
		},
		createElement: function (t) { return makeEl(t); },
		createElementNS: function (ns, t) { return makeEl(t, ns); },
		querySelector: function () { return null; },
		querySelectorAll: function () { return []; },
		addEventListener: function () {}
	};
	document.documentElement.lang = 'en';

	var window = {
		addEventListener: function () {}, removeEventListener: function () {},
		alert: function () {}, confirm: function () { return true; }, prompt: function () { return 'x'; },
		setTimeout: function (fn) { return 0; }, clearTimeout: function () {},
		Date: Date, location: { origin: 'null' }
	};

	return { document: document, window: window, makeEl: makeEl };
}
