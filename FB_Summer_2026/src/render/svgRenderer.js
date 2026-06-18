// src/render/svgRenderer.js
//
// SVG renderer ported from the original canvas drawBar/drawMat/refreshCanvas
// logic in fractionbarscanvas.js. The original used an immediate-mode canvas
// 2D context; here we rebuild the SVG tree deterministically on every render
// using createElementNS only (no innerHTML). Parity rules are preserved:
//  - base rect fill = bar.color
//  - each split: rect with fill split.color and a black stroke
//  - selected split: a 4x4 center marker rect
//  - selected bar/mat: outline stroke-width 2.5 (else 1)
//  - unit bar: "Unit Bar" caption below the bar
//  - fraction typeset at top-right (anchor end), label at bottom-left
//  - manual-split guide line drawn red when currentAction === 'manualSplit'
FB.Renderer = FB.Renderer || {};

(function () {
	var SVGNS = 'http://www.w3.org/2000/svg';

	FB.Renderer.create = function (svgRoot, doc) {
		var previewSpec = null;

		function elem(tag) {
			return doc.createElementNS(SVGNS, tag);
		}

		function rect(x, y, w, h, attrs) {
			var r = elem('rect');
			r.setAttribute('x', x);
			r.setAttribute('y', y);
			r.setAttribute('width', w);
			r.setAttribute('height', h);
			if (attrs) {
				for (var k in attrs) {
					if (Object.prototype.hasOwnProperty.call(attrs, k)) {
						r.setAttribute(k, attrs[k]);
					}
				}
			}
			return r;
		}

		function textNode(str, x, y, anchor) {
			var t = elem('text');
			t.setAttribute('x', x);
			t.setAttribute('y', y);
			t.setAttribute('fill', '#000000');
			t.setAttribute('font-size', 12);
			t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
			t.setAttribute('text-anchor', anchor === 'end' ? 'end' : 'start');
			t.textContent = String(str);
			return t;
		}

		function renderMat(layer, m) {
			var g = elem('g');
			g.setAttribute('class', 'mat');
			g.appendChild(rect(m.x, m.y, m.w, m.h, {
				fill: m.color,
				stroke: '#000000',
				'stroke-width': m.isSelected ? 2.5 : 1
			}));
			layer.appendChild(g);
		}

		function renderBar(layer, b) {
			var g = elem('g');
			g.setAttribute('class', 'bar');

			// base rect (fill only; the single black outline is drawn below, matching
			// the original drawBar which fillRect'd the base then strokeRect'd once).
			g.appendChild(rect(b.x, b.y, b.w, b.h, { fill: b.color, stroke: 'none' }));

			// splits -- the original drew split borders in red ('#FF0000').
			if (b.splits && b.splits.length > 0) {
				for (var i = 0; i < b.splits.length; i++) {
					var s = b.splits[i];
					g.appendChild(rect(b.x + s.x, b.y + s.y, s.w, s.h, {
						fill: s.color,
						stroke: '#FF0000',
						'stroke-width': 1
					}));
					if (s.isSelected === true) {
						// Selected-split marker: red, matching the original (which used
						// the prevailing red strokeStyle for the 4x4 center marker).
						var xcenter = s.x + (s.w / 2);
						var ycenter = s.y + (s.h / 2);
						g.appendChild(rect(b.x + xcenter - 2, b.y + ycenter - 2, 4, 4, {
							fill: 'none',
							stroke: '#FF0000',
							'stroke-width': 1
						}));
					}
				}
			}

			// selection outline (stroke-width 2.5 when selected else 1)
			g.appendChild(rect(b.x, b.y, b.w, b.h, {
				fill: 'none',
				stroke: '#000000',
				'stroke-width': b.isSelected ? 2.5 : 1
			}));

			// unit bar caption below the bar
			if (b.isUnitBar) {
				g.appendChild(textNode('Unit Bar', b.x, b.y + b.h + 15, 'start'));
			}

			// fraction typeset at top-right (anchor end)
			if (b.fraction !== null && b.fraction !== undefined && String(b.fraction) !== '') {
				var frac = FB.Typeset.buildFractionSVG(doc, b.fraction, {
					x: b.x + b.w - 5,
					// Raised so the stacked fraction sits fully ABOVE the bar edge
					// (matching the original flat-text placement) instead of the
					// denominator dipping into the bar interior.
					y: b.y - 15,
					anchor: 'end',
					fontSize: 12,
					color: '#000000'
				});
				g.appendChild(frac);
			}

			// label at bottom-left
			if (b.label !== null && b.label !== undefined && String(b.label) !== '') {
				g.appendChild(textNode(b.label, b.x + 5, b.y + b.h - 5, 'start'));
			}

			layer.appendChild(g);
		}

		function hguide(x1, y1, x2, y2) {
			var line = elem('line');
			line.setAttribute('x1', x1);
			line.setAttribute('y1', y1);
			line.setAttribute('x2', x2);
			line.setAttribute('y2', y2);
			line.setAttribute('stroke', '#FF0000');
			line.setAttribute('stroke-width', 1);
			return line;
		}

		// Hit-test helpers mirroring Bar.findSplitForPoint / findBarForPoint so the
		// overlay can reproduce the original drawBar manual-split guide.
		function barAt(bars, p) {
			for (var i = bars.length - 1; i >= 0; i--) {
				var b = bars[i];
				if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { return b; }
			}
			return null;
		}
		function splitAt(b, p) {
			if (!b || !b.splits) { return null; }
			for (var i = b.splits.length - 1; i >= 0; i--) {
				var s = b.splits[i];
				if (p.x > s.x + b.x && p.x < s.x + b.x + s.w &&
					p.y > s.y + b.y && p.y < s.y + b.y + s.h) { return s; }
			}
			return null;
		}

		function renderOverlay(layer, scene) {
			// rubber-band preview rect (from the scene, set during a bar/mat draw).
			var pv = scene.preview || previewSpec;
			if (pv && pv.type === 'rect') {
				layer.appendChild(rect(pv.x, pv.y, pv.w, pv.h, {
					fill: pv.fill || 'none',
					stroke: pv.stroke || '#000000',
					'stroke-width': 1
				}));
			}

			// manual-split red guide -- ported from the original drawBar logic: the
			// guide spans the full width/height of the bar (or split) under the
			// pointer, drawn only over a valid target. Direction follows the flag[1]
			// (two-way split enabled) + shift-key rule from the original.
			if (scene.currentAction === 'manualSplit' && scene.manualSplitPoint) {
				var p = scene.manualSplitPoint;
				var bars = scene.bars || [];
				var abar = barAt(bars, p);
				var asplit = abar ? splitAt(abar, p) : null;
				var thing = null, xoff = 0, yoff = 0;
				if (asplit) { thing = asplit; xoff = abar.x; yoff = abar.y; }
				else { thing = abar; }

				// split_key: original used flag[1] ? !shiftKeyDown : true
				var twoWay = !!(FB.Utilities && FB.Utilities.flag && FB.Utilities.flag[1]);
				var split_key = twoWay ? !scene.shiftDown : true;

				// Skip the ambiguous case the original guarded: pointer exactly
				// between existing splits of a bar that already has splits.
				var ambiguous = (asplit === null) && (abar !== null) && (abar.splits && abar.splits.length !== 0);
				if (thing !== null && !ambiguous) {
					if (!split_key) {
						// horizontal cut: full-width line at the pointer's y
						layer.appendChild(hguide(thing.x + xoff, p.y, thing.x + xoff + thing.w, p.y));
					} else {
						// vertical cut: full-height line at the pointer's x
						layer.appendChild(hguide(p.x, thing.y + yoff, p.x, thing.y + yoff + thing.h));
					}
				}
			}
		}

		function render(scene) {
			scene = scene || {};
			var bars = scene.bars || [];
			var mats = scene.mats || [];

			svgRoot.replaceChildren();

			// mats first, then bars, then overlays
			var matLayer = elem('g');
			matLayer.setAttribute('class', 'mats');
			for (var mi = 0; mi < mats.length; mi++) {
				renderMat(matLayer, mats[mi]);
			}
			svgRoot.appendChild(matLayer);

			var barLayer = elem('g');
			barLayer.setAttribute('class', 'bars');
			for (var bi = 0; bi < bars.length; bi++) {
				renderBar(barLayer, bars[bi]);
			}
			svgRoot.appendChild(barLayer);

			var overlayLayer = elem('g');
			overlayLayer.setAttribute('class', 'overlay');
			renderOverlay(overlayLayer, scene);
			svgRoot.appendChild(overlayLayer);

			return svgRoot.children.length;
		}

		function setPreview(spec) {
			previewSpec = spec || null;
		}

		return { render: render, setPreview: setPreview };
	};
})();
