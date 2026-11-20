// Đọc Phiếu trả lời trắc nghiệm 2025 từ ảnh chụp / ảnh quét (không cần máy chủ).
// Quy trình: tìm 4 ô vuông đen ở góc -> phép biến đổi phối cảnh -> nắn thẳng ảnh -> đo độ đậm từng ô tô.
(function (G) {
  'use strict';
  const L = G.OMR_LAYOUT;
  const RW = 1100;            // bề rộng (px) của khung giữa tâm các ô vuông góc trên ảnh đã nắn
  const MARGIN = 0.035;       // lề thêm quanh khung
  const RH = Math.round(RW * L.aspect);

  // ---------- Nạp tệp: ảnh hoặc PDF (nhiều trang) -> danh sách canvas ----------
  async function filesToCanvases(files, onProgress) {
    const out = [];
    for (const f of files) {
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const vp0 = page.getViewport({ scale: 1 });
          const scale = 2200 / Math.max(vp0.width, vp0.height);
          const vp = page.getViewport({ scale });
          const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: g, viewport: vp }).promise;
          out.push({ canvas: c, name: f.name + (doc.numPages > 1 ? ` – trang ${p}` : '') });
          onProgress && onProgress(out.length);
        }
      } else {
        const bmp = await loadBitmap(f);
        const k = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        out.push({ canvas: c, name: f.name });
        onProgress && onProgress(out.length);
      }
    }
    return out;
  }
  async function loadBitmap(file) {
    if (G.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* thử cách khác */ } }
    return new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Không đọc được ảnh ' + file.name)); im.src = u; });
  }
  let pdfPromise = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Không tải được ' + src)); document.head.appendChild(s); }); }
  function loadPdfJs() {
    if (!pdfPromise) pdfPromise = (async () => {
      await loadScript('vendor/pdfjs/pdf.min.js');
      await loadScript('vendor/pdfjs/pdf.worker.min.js'); // chạy trong luồng chính, dùng được cả khi mở bằng file://
      const lib = G.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
      return lib;
    })();
    return pdfPromise;
  }

  // ---------- Xử lý ảnh cơ bản ----------
  function grayOf(canvas) {
    const { width: W, height: H } = canvas;
    const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const g = new Uint8ClampedArray(W * H);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000;
    return { g, W, H, rgba: d };
  }
  function adaptiveBinary(g, W, H) {
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { s += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; } }
    const r = Math.max(8, Math.round(Math.min(W, H) / 30)); const b = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
        const sum = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
        const mean = sum / ((y1 - y0) * (x1 - x0));
        b[y * W + x] = g[y * W + x] < mean * 0.8 && g[y * W + x] < 150 ? 1 : 0;
      }
    }
    return b;
  }
  function components(b, W, H, minArea) {
    const lab = new Int32Array(W * H); const comps = []; const stack = new Int32Array(W * H);
    let id = 0;
    for (let p = 0; p < W * H; p++) {
      if (!b[p] || lab[p]) continue;
      id++; let sp = 0; stack[sp++] = p; lab[p] = id;
      let area = 0, minX = W, minY = H, maxX = 0, maxY = 0, sx = 0, sy = 0;
      while (sp) {
        const q = stack[--sp]; const x = q % W, y = (q / W) | 0; area++; sx += x; sy += y;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x > 0 && b[q - 1] && !lab[q - 1]) { lab[q - 1] = id; stack[sp++] = q - 1; }
        if (x < W - 1 && b[q + 1] && !lab[q + 1]) { lab[q + 1] = id; stack[sp++] = q + 1; }
        if (y > 0 && b[q - W] && !lab[q - W]) { lab[q - W] = id; stack[sp++] = q - W; }
        if (y < H - 1 && b[q + W] && !lab[q + W]) { lab[q + W] = id; stack[sp++] = q + W; }
      }
      if (area >= minArea) comps.push({ area, x: sx / area, y: sy / area, w: maxX - minX + 1, h: maxY - minY + 1 });
    }
    return comps;
  }

  // ---------- Phép biến đổi phối cảnh ----------
  function solve(A, bb) { // Gauss
    const n = bb.length; const M = A.map((r, i) => [...r, bb[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-12) return null;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  function homography(src, dst) { // src[i]=[u,v] -> dst[i]=[x,y]
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [u, v] = src[i], [x, y] = dst[i];
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
    }
    const h = solve(A, b); if (!h) return null;
    return (u, v) => { const w = h[6] * u + h[7] * v + 1; return [(h[0] * u + h[1] * v + h[2]) / w, (h[3] * u + h[4] * v + h[5]) / w]; };
  }

  // ---------- Tìm 4 ô vuông góc ----------
  function findSheet(gray) {
    const { g, W, H } = gray;
    const b = adaptiveBinary(g, W, H);
    const minA = Math.max(20, (Math.min(W, H) * 0.008) ** 2);
    const comps = components(b, W, H, minA).filter(c => {
      const ar = c.w / c.h, fill = c.area / (c.w * c.h);
      return ar > 0.55 && ar < 1.8 && fill > 0.55 && c.w < Math.min(W, H) * 0.12;
    });
    if (comps.length < 4) return null;
    comps.sort((a, b) => b.area - a.area);
    const darkAt = (x, y, s) => { // ô tại (x,y) cạnh s có tối không
      const v = (xx, yy) => { xx = Math.round(xx); yy = Math.round(yy); return xx < 0 || yy < 0 || xx >= W || yy >= H ? 255 : g[yy * W + xx]; };
      let inn = 0, out = 0, n1 = 0, n2 = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { inn += v(x + dx * s * 0.25, y + dy * s * 0.25); n1++; }
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; out += v(x + Math.cos(a) * s * 1.6, y + Math.sin(a) * s * 1.6); n2++; }
      return (inn / n1) < 0.55 * (out / n2);
    };
    let best = null;
    const tried = new Set();
    for (let i = 0; i < Math.min(comps.length, 40); i++) {
      const A0 = comps[i].area; const key = Math.round(Math.log(A0) * 4); if (tried.has(key)) continue; tried.add(key);
      const grp = comps.filter(c => c.area > A0 * 0.5 && c.area < A0 * 1.9);
      if (grp.length < 4) continue;
      const pick = (f) => grp.reduce((m, c) => (f(c) > f(m) ? c : m));
      const TL = pick(c => -(c.x + c.y)), BR = pick(c => c.x + c.y), TR = pick(c => c.x - c.y), BL = pick(c => c.y - c.x);
      const quad = [TL, TR, BR, BL];
      if (new Set(quad).size < 4) continue;
      const side = Math.sqrt(A0);
      for (let rot = 0; rot < 4; rot++) {
        const q = [0, 1, 2, 3].map(k => quad[(k + rot) % 4]);
        const Hm = homography([[0, 0], [1, 0], [1, 1], [0, 1]], q.map(c => [c.x, c.y])); if (!Hm) continue;
        let score = 0; for (const [u, v] of L.markers) { const [x, y] = Hm(u, v); if (darkAt(x, y, side)) score++; }
        // các ô vuông nhỏ không được trùng ô tô: kiểm tra thêm ô tô trống ở giữa vùng SBD là sáng
        if (!best || score > best.score) best = { score, H: Hm, corners: q, side };
      }
      if (best && best.score === 4) break;
    }
    return best && best.score >= 3 ? best : null;
  }

  // ---------- Nắn thẳng ----------
  function rectify(gray, Hm) {
    const { W, H, rgba } = gray;
    const m = MARGIN; const OW = Math.round(RW * (1 + 2 * m)), OH = Math.round(RH + 2 * m * RW);
    const out = document.createElement('canvas'); out.width = OW; out.height = OH;
    const ctx = out.getContext('2d', { willReadFrequently: true }); const img = ctx.createImageData(OW, OH); const D = img.data;
    const og = new Uint8ClampedArray(OW * OH);
    for (let y = 0; y < OH; y++) {
      const v = (y - m * RW) / RH;
      for (let x = 0; x < OW; x++) {
        const u = (x - m * RW) / RW;
        let [sx, sy] = Hm(u, v);
        const k = (y * OW + x) * 4;
        if (sx < 0 || sy < 0 || sx >= W - 1 || sy >= H - 1) { D[k] = D[k + 1] = D[k + 2] = 255; D[k + 3] = 255; og[y * OW + x] = 255; continue; }
        const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
        const p = (y0 * W + x0) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const a = rgba[p + ch], bq = rgba[p + 4 + ch], c = rgba[p + W * 4 + ch], d = rgba[p + W * 4 + 4 + ch];
          D[k + ch] = a + (bq - a) * fx + (c - a) * fy + (a - bq - c + d) * fx * fy;
        }
        D[k + 3] = 255;
        og[y * OW + x] = (D[k] * 299 + D[k + 1] * 587 + D[k + 2] * 114) / 1000;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { canvas: out, g: og, W: OW, H: OH };
  }
  // toạ độ chuẩn hoá -> pixel trên ảnh đã nắn
  const toPx = (u, v) => [MARGIN * RW + u * RW, MARGIN * RW + v * RH];
  const R_PX = L.r * RW;

  // ---------- Các nhóm ô tô ----------
  // Mỗi ô: {key, u, v}. key dạng 'sbd.c.r', 'made.c.r', 'p1.q.o', 'p2.q.s.t' (t:0 Đúng,1 Sai), 'p3.q.r.k'
  function bubbleBlocks() {
    const blocks = [];
    const grid = (name, xs, ys, keyOf) => { const bs = []; xs.forEach((u, c) => ys.forEach((v, r) => { const k = keyOf(c, r); if (k) bs.push({ key: k, u, v }); })); return bs; };
    blocks.push(grid('sbd', L.sbd.xs, L.sbd.ys, (c, r) => `sbd.${c}.${r}`));
    blocks.push(grid('made', L.made.xs, L.made.ys, (c, r) => `made.${c}.${r}`));
    for (let b = 0; b < 4; b++) blocks.push(grid('p1', L.p1.xs.slice(b * 4, b * 4 + 4), L.p1.ys, (c, r) => `p1.${b * 10 + r}.${c}`));
    for (let b = 0; b < 4; b++) blocks.push(grid('p2', L.p2.xs.slice(b * 4, b * 4 + 4), L.p2.ys, (c, r) => `p2.${b * 2 + (c >> 1)}.${r}.${c & 1}`));
    const cells = new Set(L.p3.cells.map(([r, k]) => r + '.' + k));
    for (let q = 0; q < 6; q++) blocks.push(grid('p3', L.p3.xs.slice(q * 4, q * 4 + 4), L.p3.ys, (c, r) => cells.has(r + '.' + c) ? `p3.${q}.${r}.${c}` : null));
    return blocks;
  }
  const BLOCKS = bubbleBlocks();

  // ---------- Đọc ô tô ----------
  function readBubbles(rect) {
    const { g, W, H } = rect;
    const px = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= W || y >= H ? 255 : g[y * W + x]; };
    const R = R_PX; const ring = [], disc = [];
    for (let k = 0; k < 20; k++) { const a = k * Math.PI / 10; ring.push([Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93]); }
    for (let dy = -R * 0.55; dy <= R * 0.55; dy += 1.5) for (let dx = -R * 0.55; dx <= R * 0.55; dx += 1.5) if (dx * dx + dy * dy <= (R * 0.55) ** 2) disc.push([dx, dy]);
    const result = {}; const allScores = [];
    for (const blk of BLOCKS) {
      const pts = blk.map(b => toPx(b.u, b.v));
      // độ sáng nền giấy của khối
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = Math.min(...xs) - 2 * R, x1 = Math.max(...xs) + 2 * R, y0 = Math.min(...ys) - 2 * R, y1 = Math.max(...ys) + 2 * R;
      const samp = []; for (let y = y0; y < y1; y += 4) for (let x = x0; x < x1; x += 4) samp.push(px(x, y));
      samp.sort((a, b) => a - b); const white = Math.max(60, samp[Math.floor(samp.length * 0.85)]);
      // dò độ lệch nhỏ của khối để khớp đường viền ô tô
      let bestS = -1, bdx = 0, bdy = 0; const S = Math.round(R * 0.7);
      for (let dy = -S; dy <= S; dy++) for (let dx = -S; dx <= S; dx++) {
        let s = 0; for (const [x, y] of pts) for (const [ox, oy] of ring) s += 255 - px(x + dx + ox, y + dy + oy);
        if (s > bestS) { bestS = s; bdx = dx; bdy = dy; }
      }
      blk.forEach((b, i) => {
        const [x, y] = pts[i]; let s = 0;
        for (const [ox, oy] of disc) s += px(x + bdx + ox, y + bdy + oy);
        const dark = Math.max(0, Math.min(1, 1 - (s / disc.length) / white));
        result[b.key] = { score: dark, x: x + bdx, y: y + bdy };
        allScores.push(dark);
      });
    }
    // ngưỡng Otsu trên toàn phiếu
    const thr = otsu(allScores);
    for (const k in result) result[k].filled = result[k].score >= thr;
    return { bubbles: result, threshold: thr };
  }
  function otsu(vals) {
    const n = 50, hist = new Array(n).fill(0); vals.forEach(v => hist[Math.min(n - 1, Math.floor(v * n))]++);
    const tot = vals.length; let sum = 0; hist.forEach((h, i) => sum += i * h);
    let sB = 0, wB = 0, best = 0, t = n * 0.4;
    for (let i = 0; i < n; i++) {
      wB += hist[i]; if (!wB) continue; const wF = tot - wB; if (!wF) break;
      sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF; const between = wB * wF * (mB - mF) ** 2;
      if (between > best) { best = between; t = i + 1; }
    }
    return Math.max(0.3, Math.min(0.6, t / n));
  }

  // ---------- Giải mã ô tô -> câu trả lời ----------
  function decode(fill) { // fill: {key: bool}
    const f = (k) => !!fill[k];
    const digits = (name, cols) => {
      let s = '', amb = false;
      for (let c = 0; c < cols; c++) {
        const rows = []; for (let r = 0; r < 10; r++) if (f(`${name}.${c}.${r}`)) rows.push(r);
        if (rows.length === 1) s += rows[0]; else { s += rows.length ? '?' : '_'; if (rows.length) amb = true; }
      }
      return { value: s.replace(/_+$/, ''), amb };
    };
    const sbd = digits('sbd', 8), made = digits('made', 4);
    const p1 = []; for (let q = 0; q < 40; q++) { const ch = []; for (let o = 0; o < 4; o++) if (f(`p1.${q}.${o}`)) ch.push(o); p1.push(ch); }
    const p2 = []; for (let q = 0; q < 8; q++) { const st = []; for (let s = 0; s < 4; s++) { const d = f(`p2.${q}.${s}.0`), sa = f(`p2.${q}.${s}.1`); st.push(d && sa ? 'x' : d ? true : sa ? false : null); } p2.push(st); }
    const p3 = [];
    for (let q = 0; q < 6; q++) {
      let s = '', bad = false;
      for (let k = 0; k < 4; k++) {
        const rows = []; for (let r = 0; r < 12; r++) if (f(`p3.${q}.${r}.${k}`)) rows.push(r);
        if (rows.length > 1) bad = true;
        if (rows.length === 1) s += rows[0] === 0 ? '-' : rows[0] === 1 ? ',' : String(rows[0] - 2);
      }
      p3.push(bad ? '?' : s);
    }
    return { sbd: sbd.value, sbdAmb: sbd.amb, made: made.value, madeAmb: made.amb, p1, p2, p3 };
  }

  // đáp án phần III -> các ô cần tô (canh trái)
  function p3KeyCells(ans) {
    const cells = []; const chars = String(ans || '').replace(/\./g, ',').split('');
    chars.forEach((ch, k) => {
      if (k > 3) return;
      if (ch === '-') { if (k === 0) cells.push([0, k]); }
      else if (ch === ',') { if (k === 1 || k === 2) cells.push([1, k]); }
      else if (/\d/.test(ch)) cells.push([+ch + 2, k]);
    });
    return cells;
  }

  async function processCanvas(canvas) {
    const gray = grayOf(canvas);
    const sheet = findSheet(gray);
    if (!sheet) return { ok: false, error: 'Không tìm thấy 4 ô vuông đen ở góc phiếu. Hãy chụp thẳng, đủ sáng, thấy rõ cả 4 góc.' };
    const rect = rectify(gray, sheet.H);
    const read = readBubbles(rect);
    const fill = {}; for (const k in read.bubbles) fill[k] = read.bubbles[k].filled;
    return { ok: true, rect, bubbles: read.bubbles, threshold: read.threshold, fill, markerScore: sheet.score };
  }

  G.OMR = { filesToCanvases, processCanvas, decode, p3KeyCells, BLOCKS, toPx, R_PX, RW, RH, MARGIN };
})(window);
