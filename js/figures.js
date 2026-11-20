// Vẽ hình cho câu hỏi -> chuỗi SVG (không cần DOM, chạy được cả trong Node để kiểm tra).
// Các dạng hình (trường `figure` của câu hỏi):
//   { type:'graph', fn:'x^3-3*x+1', x:[-3,3], y:[-3,4], points:[[1,-1,'']], ... }   đồ thị hàm số
//   { type:'bbt', x:[...], dy:[...], y:[...] }                                      bảng biến thiên
//   { type:'geo', points:{A:[0,0],...}, segs:['AB'], dashed:['AC'], ... }           hình học phẳng/không gian
//   { type:'img', src:'data:image/png;base64,...', width:300 }                       ảnh tải lên
//   { type:'svg', svg:'<svg ...>...</svg>' }                                          SVG tự vẽ
(function (G) {
  'use strict';
  const FONT = `font-family="'Times New Roman', Times, serif"`;
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const r2 = (v) => Math.round(v * 100) / 100;
  const pretty = (s) => String(s).replace(/[+\-−]?(inf(inity)?|∞)/gi, m => (m[0] === '-' || m[0] === '−' ? '−∞' : '+∞')).replace(/-/g, '−');

  // ---------- Biểu thức an toàn (không dùng eval) ----------
  const FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs, cbrt: Math.cbrt,
    log2: Math.log2, atan: Math.atan, asin: Math.asin, acos: Math.acos };
  const CONSTS = { pi: Math.PI, e: Math.E };
  function compile(src) {
    const toks = String(src).replace(/\s+/g, '').match(/\d+(?:\.\d+)?|[a-z][a-z0-9]*|[-+*/^(),]/gi);
    if (!toks || toks.join('') !== String(src).replace(/\s+/g, '')) throw new Error('Biểu thức không hợp lệ: ' + src);
    let i = 0;
    const peek = () => toks[i], next = () => toks[i++];
    const expect = (t) => { if (next() !== t) throw new Error(`Thiếu "${t}" trong: ${src}`); };
    function expr() { let f = term(); while (peek() === '+' || peek() === '-') { const op = next(), a = f, b = term(); f = op === '+' ? (x) => a(x) + b(x) : (x) => a(x) - b(x); } return f; }
    function term() { let f = unary(); while (peek() === '*' || peek() === '/') { const op = next(), a = f, b = unary(); f = op === '*' ? (x) => a(x) * b(x) : (x) => a(x) / b(x); } return f; }
    function unary() { if (peek() === '-') { next(); const a = unary(); return (x) => -a(x); } if (peek() === '+') { next(); return unary(); } return power(); }
    function power() { const a = atom(); if (peek() === '^') { next(); const b = unary(); return (x) => { const base = a(x), ex = b(x); if (base < 0 && Number.isFinite(ex)) { const k = Math.round(1 / ex); if (Math.abs(1 / ex - k) < 1e-9 && k % 2) return -Math.pow(-base, ex); } return Math.pow(base, ex); }; } return a; }
    function atom() {
      const t = next();
      if (t === undefined) throw new Error('Biểu thức bị cụt: ' + src);
      if (/^\d/.test(t)) { const v = parseFloat(t); return () => v; }
      if (t === '(') { const f = expr(); expect(')'); return f; }
      const lc = t.toLowerCase();
      if (lc === 'x') return (x) => x;
      if (lc in CONSTS) { const v = CONSTS[lc]; return () => v; }
      if (lc in FUNCS) { expect('('); const a = expr(); expect(')'); const fn = FUNCS[lc]; return (x) => fn(a(x)); }
      throw new Error('Không hiểu "' + t + '" trong: ' + src);
    }
    const f = expr(); if (i < toks.length) throw new Error('Thừa ký tự trong: ' + src);
    return f;
  }

  // ---------- Đồ thị ----------
  function graph(o) {
    const [x0, x1] = o.x || [-5, 5], [y0, y1] = o.y || [-5, 5];
    const u = o.unit || Math.min(300 / (x1 - x0), 260 / (y1 - y0), 60);
    const pad = 22, W = (x1 - x0) * u + 2 * pad, H = (y1 - y0) * u + 2 * pad;
    const X = (x) => r2(pad + (x - x0) * u), Y = (y) => r2(pad + (y1 - y) * u);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(W)}" height="${r2(H)}" viewBox="0 0 ${r2(W)} ${r2(H)}" ${FONT} font-size="13">`;
    s += `<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,1 L7,4 L0,7" fill="none" stroke="#000"/></marker>` +
      `<clipPath id="cp"><rect x="${X(x0)}" y="${Y(y1)}" width="${r2((x1 - x0) * u)}" height="${r2((y1 - y0) * u)}"/></clipPath></defs>`;
    if (o.grid) { for (let k = Math.ceil(x0); k <= x1; k++) s += `<line x1="${X(k)}" y1="${Y(y0)}" x2="${X(k)}" y2="${Y(y1)}" stroke="#ddd"/>`; for (let k = Math.ceil(y0); k <= y1; k++) s += `<line x1="${X(x0)}" y1="${Y(k)}" x2="${X(x1)}" y2="${Y(k)}" stroke="#ddd"/>`; }
    // trục
    const ax = Math.min(Math.max(0, y0), y1), ay = Math.min(Math.max(0, x0), x1);
    s += `<line x1="${X(x0) - 8}" y1="${Y(ax)}" x2="${X(x1) + 12}" y2="${Y(ax)}" stroke="#000" marker-end="url(#ar)"/>`;
    s += `<line x1="${X(ay)}" y1="${Y(y0) + 8}" x2="${X(ay)}" y2="${Y(y1) - 12}" stroke="#000" marker-end="url(#ar)"/>`;
    s += `<text x="${X(x1) + 6}" y="${Y(ax) + 16}" font-style="italic">x</text><text x="${X(ay) + 6}" y="${Y(y1) - 6}" font-style="italic">y</text>`;
    if (ax === 0 && ay === 0) s += `<text x="${X(0) - 13}" y="${Y(0) + 15}" font-style="italic">O</text>`;
    if (o.ticks !== false && x1 - x0 <= 14 && y1 - y0 <= 14) {
      for (let k = Math.ceil(x0); k <= x1; k++) if (k) s += `<line x1="${X(k)}" y1="${Y(ax) - 3}" x2="${X(k)}" y2="${Y(ax) + 3}" stroke="#000"/>` + (o.tickLabels ? `<text x="${X(k)}" y="${Y(ax) + 15}" text-anchor="middle" font-size="11">${pretty(k)}</text>` : '');
      for (let k = Math.ceil(y0); k <= y1; k++) if (k) s += `<line x1="${X(ay) - 3}" y1="${Y(k)}" x2="${X(ay) + 3}" y2="${Y(k)}" stroke="#000"/>` + (o.tickLabels ? `<text x="${X(ay) - 6}" y="${Y(k) + 4}" text-anchor="end" font-size="11">${pretty(k)}</text>` : '');
    }
    // tiệm cận
    for (const a of (o.asymptotes && o.asymptotes.x) || []) s += `<line x1="${X(a)}" y1="${Y(y0)}" x2="${X(a)}" y2="${Y(y1)}" stroke="#000" stroke-dasharray="4 3"/>`;
    for (const a of (o.asymptotes && o.asymptotes.y) || []) s += `<line x1="${X(x0)}" y1="${Y(a)}" x2="${X(x1)}" y2="${Y(a)}" stroke="#000" stroke-dasharray="4 3"/>`;
    // đường cong
    const fns = Array.isArray(o.fn) ? o.fn : [o.fn];
    const doms = o.domain ? (Array.isArray(o.domain[0]) ? o.domain : [o.domain]) : null;
    fns.forEach((src, fi) => {
      if (!src) return;
      const f = compile(src); const [d0, d1] = doms ? (doms[fi] || doms[0]) : [x0, x1];
      let path = '', pen = false; const N = 600;
      for (let k = 0; k <= N; k++) {
        const x = d0 + (d1 - d0) * k / N; const y = f(x);
        if (!Number.isFinite(y) || y > y1 + (y1 - y0) || y < y0 - (y1 - y0)) { pen = false; continue; }
        path += (pen ? 'L' : 'M') + X(x) + ',' + Y(y); pen = true;
      }
      s += `<path d="${path}" fill="none" stroke="#000" stroke-width="1.6" clip-path="url(#cp)"/>`;
    });
    // điểm đánh dấu: [x, y, nhãn điểm, {dash:true, xl:'nhãn trên Ox', yl:'nhãn trên Oy'}]
    for (const p of o.points || []) {
      const [px, py, lab, opt = {}] = p; const dash = opt.dash !== false;
      if (dash) {
        if (py !== ax) s += `<line x1="${X(px)}" y1="${Y(py)}" x2="${X(px)}" y2="${Y(ax)}" stroke="#000" stroke-dasharray="3 3"/>`;
        if (px !== ay) s += `<line x1="${X(px)}" y1="${Y(py)}" x2="${X(ay)}" y2="${Y(py)}" stroke="#000" stroke-dasharray="3 3"/>`;
      }
      s += opt.open ? `<circle cx="${X(px)}" cy="${Y(py)}" r="3" fill="#fff" stroke="#000" stroke-width="1.2"/>` : `<circle cx="${X(px)}" cy="${Y(py)}" r="2.3"/>`;
      const xl = opt.xl != null ? opt.xl : (dash && px !== ay ? pretty(px) : null);
      const yl = opt.yl != null ? opt.yl : (dash && py !== ax ? pretty(py) : null);
      if (xl != null && xl !== '') s += `<text x="${X(px)}" y="${py >= ax ? Y(ax) + 15 : Y(ax) - 6}" text-anchor="middle">${esc(pretty(xl))}</text>`;
      if (yl != null && yl !== '') s += `<text x="${px >= ay ? X(ay) - 5 : X(ay) + 5}" y="${Y(py) + 4}" text-anchor="${px >= ay ? 'end' : 'start'}">${esc(pretty(yl))}</text>`;
      if (lab) s += `<text x="${X(px) + 5}" y="${Y(py) - 6}" font-style="italic">${esc(lab)}</text>`;
    }
    for (const t of o.labels || []) s += `<text x="${X(t[0])}" y="${Y(t[1])}" font-style="italic">${esc(t[2])}</text>`;
    return s + '</svg>';
  }

  // ---------- Bảng biến thiên ----------
  // x: ['-inf','-1','1','+inf']; dy: xen kẽ [tại x0, giữa x0-x1, tại x1, ...] độ dài 2n-1, ví dụ ['', '+', '0', '-', '0', '+', '']
  //   giá trị '||' tại một điểm = hàm không xác định tại đó. Bỏ dy nếu không cần dòng f'(x).
  // y: mỗi điểm ['giá trị','top'|'bottom'|'mid'], hoặc tại điểm gián đoạn {l:['+inf','top'], r:['-inf','bottom']}
  function bbt(o) {
    const n = o.x.length, hasDy = Array.isArray(o.dy);
    const head = 52, colW = o.colW || Math.max(70, Math.min(110, 440 / (n - 1))), W = head + colW * (n - 1) + 40;
    const rx = 28, rdy = hasDy ? 28 : 0, ry = o.yHeight || 76, H = rx + rdy + ry;
    const cx = (i) => head + 20 + colW * i;
    const name = o.fname || 'f';
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 1}" viewBox="0 0 ${W} ${H + 1}" ${FONT} font-size="14">`;
    s += `<defs><marker id="ba" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,1 L7,4 L0,7 Z" fill="#000"/></marker></defs>`;
    s += `<rect x="0.5" y="0.5" width="${W - 1}" height="${H}" fill="none" stroke="#000"/>`;
    s += `<line x1="${head}" y1="0" x2="${head}" y2="${H}" stroke="#000"/><line x1="0" y1="${rx}" x2="${W}" y2="${rx}" stroke="#000"/>`;
    if (hasDy) s += `<line x1="0" y1="${rx + rdy}" x2="${W}" y2="${rx + rdy}" stroke="#000"/>`;
    s += `<text x="${head / 2}" y="19" text-anchor="middle" font-style="italic">${esc(o.xname || 'x')}</text>`;
    if (hasDy) s += `<text x="${head / 2}" y="${rx + 19}" text-anchor="middle" font-style="italic">${esc(o.dyname || name + "'(x)")}</text>`;
    s += `<text x="${head / 2}" y="${rx + rdy + ry / 2 + 5}" text-anchor="middle" font-style="italic">${esc(o.yname || name + '(x)')}</text>`;
    o.x.forEach((v, i) => { s += `<text x="${cx(i)}" y="19" text-anchor="middle">${esc(pretty(v))}</text>`; });
    const breaks = new Set();
    if (hasDy) o.dy.forEach((v, k) => {
      const x = k % 2 === 0 ? cx(k / 2) : (cx((k - 1) / 2) + cx((k + 1) / 2)) / 2;
      if (v === '||') { breaks.add(k / 2); return; }
      if (v !== '' && v != null) s += `<text x="${x}" y="${rx + 19}" text-anchor="middle">${esc(v === '-' ? '−' : v)}</text>`;
    });
    o.y.forEach((v, i) => { if (v && !Array.isArray(v) && v.l) breaks.add(i); });
    breaks.forEach(i => { const y1 = hasDy ? rx : rx; s += `<line x1="${cx(i) - 2}" y1="${y1}" x2="${cx(i) - 2}" y2="${H}" stroke="#000"/><line x1="${cx(i) + 2}" y1="${y1}" x2="${cx(i) + 2}" y2="${H}" stroke="#000"/>`; });
    const top = rx + rdy + 18, bot = rx + rdy + ry - 8, mid = rx + rdy + ry / 2 + 5;
    const yOf = (pos) => pos === 'top' ? top : pos === 'bottom' ? bot : mid;
    const anchors = []; // [{x,y,side}] mỗi điểm: left/right
    o.y.forEach((v, i) => {
      if (v == null) { anchors.push(null); return; }
      if (Array.isArray(v)) {
        const [val, pos] = v; const y = yOf(pos);
        if (val !== '' && val != null) s += `<text x="${cx(i)}" y="${y}" text-anchor="middle">${esc(pretty(val))}</text>`;
        anchors.push({ L: { x: cx(i), y, e: val === '' || val == null }, R: { x: cx(i), y, e: val === '' || val == null } });
      } else {
        const L = v.l, R = v.r; const a = {};
        if (L) { const y = yOf(L[1]); s += `<text x="${cx(i) - 6}" y="${y}" text-anchor="end">${esc(pretty(L[0]))}</text>`; a.L = { x: cx(i) - 6, y, end: true }; }
        if (R) { const y = yOf(R[1]); s += `<text x="${cx(i) + 6}" y="${y}" text-anchor="start">${esc(pretty(R[0]))}</text>`; a.R = { x: cx(i) + 6, y, start: true }; }
        anchors.push(a);
      }
    });
    for (let i = 0; i + 1 < anchors.length; i++) {
      const a = anchors[i] && anchors[i].R, b = anchors[i + 1] && anchors[i + 1].L; if (!a || !b) continue;
      const ya = a.y - 5, yb = b.y - 5;
      const xa = a.start ? a.x + 26 : a.x + (a.e ? 4 : 20), xb = b.end ? b.x - 26 : b.x - (b.e ? 4 : 20);
      const dy = yb - ya, dx = xb - xa; const sh = 0.08;
      s += `<line x1="${r2(xa + dx * sh)}" y1="${r2(ya + dy * sh + (dy > 0 ? 4 : dy < 0 ? -4 : 0) + (dy < 0 ? 0 : 0))}" x2="${r2(xb - dx * sh)}" y2="${r2(yb - dy * sh)}" stroke="#000" marker-end="url(#ba)"/>`;
    }
    return s + '</svg>';
  }

  // ---------- Hình học ----------
  // points:{A:[x,y]} (tọa độ tùy ý, trục y hướng lên); segs:['AB','BC'] nét liền; dashed:['AC'] nét đứt;
  // right:['ABC'] ký hiệu góc vuông tại B; circles:[{c:'O', r:2}] hoặc {c:[x,y], r}; fill:['ABC'];
  // labelPos:{A:'tl'|'t'|'tr'|'l'|'r'|'bl'|'b'|'br'}; hide:['H'] không ghi nhãn; texts:[[x,y,'chữ']]; arcs:['BAC'] cung góc
  function geo(o) {
    const P = o.points || {}; const names = Object.keys(P);
    if (!names.length) throw new Error('geo: thiếu points');
    const all = names.map(k => P[k]).concat(...(o.circles || []).map(c => { const cc = typeof c.c === 'string' ? P[c.c] : c.c; return [[cc[0] - c.r, cc[1] - c.r], [cc[0] + c.r, cc[1] + c.r]]; }));
    const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const target = o.width || 240; const sc = Math.min(target / Math.max(maxX - minX, 1e-9), (o.maxHeight || 220) / Math.max(maxY - minY, 1e-9));
    const pad = 22, W = (maxX - minX) * sc + 2 * pad, H = (maxY - minY) * sc + 2 * pad;
    const X = (p) => r2(pad + (p[0] - minX) * sc), Y = (p) => r2(pad + (maxY - p[1]) * sc);
    const pt = (k) => { if (!P[k]) throw new Error('geo: không có điểm ' + k); return P[k]; };
    const pairs = (arr) => (arr || []).map(sg => { const m = sg.match(/^([A-Z][0-9']*)([A-Z][0-9']*)$/); if (!m) throw new Error('geo: đoạn không hợp lệ ' + sg); return [m[1], m[2]]; });
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(W)}" height="${r2(H)}" viewBox="0 0 ${r2(W)} ${r2(H)}" ${FONT} font-size="15">`;
    for (const f of o.fill || []) { const ks = f.match(/[A-Z][0-9']*/g); s += `<polygon points="${ks.map(k => X(pt(k)) + ',' + Y(pt(k))).join(' ')}" fill="#e8eef8" stroke="none"/>`; }
    for (const c of o.circles || []) { const cc = typeof c.c === 'string' ? pt(c.c) : c.c; s += `<circle cx="${X(cc)}" cy="${Y(cc)}" r="${r2(c.r * sc)}" fill="none" stroke="#000" stroke-width="1.3"${c.dashed ? ' stroke-dasharray="5 4"' : ''}/>`; }
    for (const [a, b] of pairs(o.segs)) s += `<line x1="${X(pt(a))}" y1="${Y(pt(a))}" x2="${X(pt(b))}" y2="${Y(pt(b))}" stroke="#000" stroke-width="1.4"/>`;
    for (const [a, b] of pairs(o.dashed)) s += `<line x1="${X(pt(a))}" y1="${Y(pt(a))}" x2="${X(pt(b))}" y2="${Y(pt(b))}" stroke="#000" stroke-width="1.2" stroke-dasharray="5 4"/>`;
    const sp = (k) => [X(pt(k)), Y(pt(k))];
    for (const r of o.right || []) {
      const [a, b, c] = r.match(/[A-Z][0-9']*/g).map(sp); const L = 9;
      const ua = [a[0] - b[0], a[1] - b[1]], uc = [c[0] - b[0], c[1] - b[1]]; const na = Math.hypot(...ua), nc = Math.hypot(...uc);
      const p1 = [b[0] + ua[0] / na * L, b[1] + ua[1] / na * L], p3 = [b[0] + uc[0] / nc * L, b[1] + uc[1] / nc * L], p2 = [p1[0] + uc[0] / nc * L, p1[1] + uc[1] / nc * L];
      s += `<polyline points="${p1.map(r2)} ${p2.map(r2)} ${p3.map(r2)}" fill="none" stroke="#000"/>`;
    }
    for (const r of o.arcs || []) {
      const [a, b, c] = r.match(/[A-Z][0-9']*/g).map(sp); const R = 16;
      const t1 = Math.atan2(a[1] - b[1], a[0] - b[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let d = t2 - t1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      s += `<path d="M${r2(b[0] + R * Math.cos(t1))},${r2(b[1] + R * Math.sin(t1))} A${R},${R} 0 0 ${d > 0 ? 1 : 0} ${r2(b[0] + R * Math.cos(t2))},${r2(b[1] + R * Math.sin(t2))}" fill="none" stroke="#000"/>`;
    }
    // nhãn: đẩy ra xa trọng tâm
    const cxm = names.reduce((t, k) => t + X(P[k]), 0) / names.length, cym = names.reduce((t, k) => t + Y(P[k]), 0) / names.length;
    const DIR = { t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0], tl: [-.75, -.75], tr: [.75, -.75], bl: [-.75, .75], br: [.75, .75] };
    const hide = new Set(o.hide || []);
    for (const k of names) {
      const x = X(P[k]), y = Y(P[k]);
      if (o.dots !== false) s += `<circle cx="${x}" cy="${y}" r="1.8"/>`;
      if (hide.has(k)) continue;
      let d = (o.labelPos && DIR[o.labelPos[k]]) || null;
      if (!d) { const vx = x - cxm, vy = y - cym, n = Math.hypot(vx, vy) || 1; d = [vx / n, vy / n]; }
      s += `<text x="${r2(x + d[0] * 12)}" y="${r2(y + d[1] * 12 + 5)}" text-anchor="middle" font-style="italic">${esc(k)}</text>`;
    }
    for (const t of o.texts || []) s += `<text x="${X([t[0], t[1]])}" y="${Y([t[0], t[1]])}" text-anchor="middle" font-size="13">${esc(t[2])}</text>`;
    return s + '</svg>';
  }

  function sanitizeSvg(svg) {
    svg = String(svg || '');
    if (!/^\s*<svg[\s>]/i.test(svg)) throw new Error('svg phải bắt đầu bằng <svg');
    return svg.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href\s*=\s*["'])\s*javascript:[^"']*/gi, '$1#');
  }

  // Kết quả: {svg} hoặc {img}. Ném lỗi nếu dữ liệu hình sai.
  function render(fig) {
    if (!fig) return null;
    switch (fig.type) {
      case 'graph': return { svg: graph(fig) };
      case 'bbt': return { svg: bbt(fig) };
      case 'geo': return { svg: geo(fig) };
      case 'svg': return { svg: sanitizeSvg(fig.svg) };
      case 'img': if (!/^data:image\/(png|jpe?g|gif|webp);base64,/.test(fig.src || '')) throw new Error('ảnh phải là data URI png/jpg'); return { img: fig.src };
      default: throw new Error('Kiểu hình không hỗ trợ: ' + fig.type);
    }
  }
  // HTML để hiển thị
  function html(fig) {
    try {
      const r = render(fig); if (!r) return '';
      const w = fig.width ? ` style="max-width:${+fig.width}px"` : '';
      // id trong SVG phải duy nhất trên trang
      const uid = 'f' + Math.random().toString(36).slice(2, 8);
      const body = r.svg ? r.svg.replace(/id="(ar|cp|ba)"/g, `id="$1${uid}"`).replace(/url\(#(ar|cp|ba)\)/g, `url(#$1${uid})`) : `<img src="${esc(r.img)}" alt="Hình vẽ">`;
      return `<div class="fig"${w}>${body}</div>`;
    } catch (e) { return `<div class="fig tex-err">Lỗi hình vẽ: ${esc(e.message)}</div>`; }
  }

  G.Figures = { render, html, compile, graph, bbt, geo };
})(typeof window !== 'undefined' ? window : globalThis);
