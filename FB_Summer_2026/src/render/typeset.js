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
