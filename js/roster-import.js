// ĐỌC DANH SÁCH HỌC SINH THÔNG MINH: dán văn bản hoặc chọn tệp (.xlsx, .csv, .txt, .docx).
// Tự nhận cột theo tiêu đề (Họ và tên, Họ/Tên tách rời, SBD, Ngày sinh…) hoặc theo nội dung khi không có tiêu đề.
// Bỏ qua cột thừa (STT, giới tính, dân tộc, địa chỉ, SĐT, ghi chú…). Chỉ giữ: họ tên, SBD, ngày sinh.
(function (G) {
  'use strict';
  const strip = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  const clean = (s) => String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

  // ---------- ngày sinh ----------
  function toISO(d, m, y) {
    d = +d; m = +m; y = +y; if (y < 100) y += y > 50 ? 1900 : 2000;
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1950 && y <= 2030)) return null;
    const dt = new Date(Date.UTC(y, m - 1, d)); if (dt.getUTCDate() !== d) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  function parseDate(v, allowSerial) {
    const s = clean(v); if (!s) return null;
    let m = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})$/.exec(s); if (m) return toISO(m[1], m[2], m[3]);
    m = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:[T ].*)?$/.exec(s); if (m) return toISO(m[3], m[2], m[1]);
    m = /^ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})$/.exec(strip(s)); if (m) return toISO(m[1], m[2], m[3]);
    if (allowSerial && /^\d{5}(\.\d+)?$/.test(s)) { const n = Math.floor(+s); if (n > 18000 && n < 48000) { const dt = new Date(Date.UTC(1899, 11, 30) + n * 864e5); return toISO(dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear()); } }
    return null;
  }
  const DATE_IN_TEXT = /(\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*(?:\d{4}|\d{2}))(?!\d)/;

  // ---------- họ tên ----------
  const NOT_NAME = new Set(['nam', 'nu', 'kinh', 'tay', 'nung', 'muong', 'thai', 'hmong', 'dao', 'khmer', 'hoa', 'khong', 'co', 'x']);
  function looksName(v) {
    const s = clean(v); if (s.length < 4 || s.length > 60) return false;
    if (/\d|@|\/|:/.test(s)) return false;
    const w = s.split(' '); if (w.length < 2 || w.length > 7) return false;
    if (!/^[\p{L}\s.'\-]+$/u.test(s)) return false;
    if (w.length <= 2 && w.every(x => NOT_NAME.has(strip(x)))) return false;
    return true;
  }
  function normName(v) {
    let s = clean(v).replace(/^\d+[.)]\s*/, '');
    const letters = s.replace(/[^\p{L}]/gu, '');
    if (letters && (letters === letters.toUpperCase() || letters === letters.toLowerCase()))
      s = s.toLocaleLowerCase('vi').replace(/(^|[\s\-])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('vi'));
    return s;
  }

  // ---------- nhận cột theo tiêu đề ----------
  function headerRole(h) {
    const s = strip(h).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); if (!s) return null;
    if (/^(stt|tt|so tt|so thu tu|no)$/.test(s)) return 'stt';
    if (/(phu huynh|cha|me|bo |ph |nguoi giam ho)/.test(s + ' ')) return 'skip';
    if (/(ngay sinh|ns$|^ns |dob|birth|sinh ngay|ngay thang nam sinh)/.test(s)) return 'dob';
    if (/(so bao danh|^sbd|sbd$|ma hs|ma hoc sinh|ma dinh danh hs|ma so hs|^ma so$)/.test(s)) return 'sbd';
    if (/(ho va ten|ho ten|ho va ten hoc sinh|ten hoc sinh|full ?name|^name$|hoc sinh$)/.test(s)) return 'name';
    if (/^(ho|ho dem|ho va dem|ho va ten dem|ho lot|ho va chu lot)$/.test(s)) return 'last';
    if (/^(ten|ten goi)$/.test(s)) return 'first';
    return 'skip';
  }
  function findHeader(rows) {
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const roles = rows[i].map(headerRole);
      const has = (r) => roles.includes(r);
      if ((has('name') || (has('last') && has('first'))) && rows[i].filter(c => clean(c)).length >= 2) return { idx: i, roles };
    }
    return null;
  }

  // ---------- nhận cột theo nội dung (không có tiêu đề) ----------
  function guessRoles(rows) {
    const n = Math.max(...rows.map(r => r.length)); const roles = new Array(n).fill('skip');
    const score = (j, f) => { const vals = rows.map(r => clean(r[j])).filter(Boolean); return vals.length ? vals.filter(f).length / vals.length : 0; };
    let best = -1, bs = 0; for (let j = 0; j < n; j++) { const s = score(j, looksName); if (s > bs + 0.001) { bs = s; best = j; } }
    if (best >= 0 && bs >= 0.5) roles[best] = 'name';
    let dj = -1, ds = 0; for (let j = 0; j < n; j++) { if (roles[j] !== 'skip') continue; const s = score(j, v => !!parseDate(v, false)); if (s > ds) { ds = s; dj = j; } }
    if (dj >= 0 && ds >= 0.5) roles[dj] = 'dob';
    // SBD: cột số 1–8 chữ số, không phải STT (1,2,3…), không phải SĐT (10 số)
    for (let j = 0; j < n; j++) {
      if (roles[j] !== 'skip') continue;
      const vals = rows.map(r => clean(r[j])).filter(Boolean); if (!vals.length) continue;
      const isNum = vals.filter(v => /^\d{1,8}$/.test(v)).length / vals.length >= 0.8;
      const seq = vals.every((v, k) => +v === k + 1 || +v === +vals[0] + k);
      const small = vals.every(v => v.length <= 3);
      if (isNum && !(seq && small)) { roles[j] = 'sbd'; break; }
    }
    return roles;
  }

  // ---------- tách văn bản thành bảng ----------
  function splitText(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
    const sep = lines.some(l => l.includes('\t')) ? /\t/ : lines.some(l => l.includes(';')) ? /;/ : lines.some(l => l.includes('|')) ? /\|/
      : lines.filter(l => /,/.test(l)).length > lines.length / 2 ? /,(?=(?:[^"]*"[^"]*")*[^"]*$)/ : lines.some(l => /\S {2,}\S/.test(l)) ? / {2,}/ : null;
    return lines.map(l => sep ? l.split(sep).map(c => c.replace(/^"|"$/g, '').trim()) : [l.trim()]);
  }

  // một dòng tự do: "1. Nguyễn Văn A   05/02/2011  SBD 10012345 ..."
  function parseFreeLine(line) {
    let s = clean(line); const out = {};
    const dm = DATE_IN_TEXT.exec(s); if (dm) { out.dob = parseDate(dm[1]); s = s.replace(dm[0], ' '); }
    const sm = /(?:sbd|số báo danh|so bao danh|mã hs)\s*[:.]?\s*(\d{1,8})\b/i.exec(s); if (sm) { out.sbd = sm[1]; s = s.replace(sm[0], ' '); }
    s = s.replace(/^\s*\d{1,3}\s*[.)\-]?\s+/, '');
    const nm = /(\p{L}[\p{L}'\-]*(?:\s+\p{L}[\p{L}'\-]*){1,6})/u.exec(s);
    if (nm) { let words = nm[1].split(/\s+/); while (words.length > 2 && NOT_NAME.has(strip(words[words.length - 1]))) words.pop(); out.name = words.join(' '); }
    if (!out.sbd) { const lone = s.replace(nm ? nm[0] : '', ' ').match(/\b\d{5,8}\b/); if (lone) out.sbd = lone[0]; }
    return out;
  }

  // ---------- hàm chính ----------
  function parse(input) {
    const rows = (Array.isArray(input) ? input : splitText(input)).map(r => r.map(c => c == null ? '' : String(c))).filter(r => r.some(c => clean(c)));
    const out = [], skipped = []; if (!rows.length) return { out, skipped, roles: [] };
    let roles, start = 0; const hd = findHeader(rows);
    if (hd) { roles = hd.roles; start = hd.idx + 1; } else roles = guessRoles(rows);
    const useFree = !roles.includes('name') && !roles.includes('last');
    for (let i = start; i < rows.length; i++) {
      const r = rows[i]; let rec = {};
      if (useFree) { const line = r.join('  ');
        // dòng tiêu đề / tiêu đề bảng (không có ngày sinh) → bỏ qua
        if (!DATE_IN_TEXT.test(line) && /(^|\s)(stt|ho\s*va\s*ten|hovaten|ngay\s*sinh|danh\s*sach|lop\s*\d)/.test(strip(line))) continue;
        rec = parseFreeLine(line); }
      else {
        const last = [], first = [];
        r.forEach((c, j) => {
          const role = roles[j]; const v = clean(c); if (!v) return;
          if (role === 'name' && !rec.name) rec.name = v;
          else if (role === 'last') last.push(v); else if (role === 'first') first.push(v);
          else if (role === 'dob' && !rec.dob) rec.dob = parseDate(v, true) || (rec.dobBad = v, null);
          else if (role === 'sbd' && !rec.sbd) rec.sbd = v.replace(/\s/g, '');
        });
        if (!rec.name && (last.length || first.length)) rec.name = [...last, ...first].join(' ');
      }
      if (!rec.name || !looksName(normName(rec.name))) { if (r.join('').trim()) skipped.push({ line: i + 1, text: clean(r.join(' | ')).slice(0, 80), why: 'không thấy họ tên' }); continue; }
      const item = { full_name: normName(rec.name), sbd: null, dob: rec.dob || null, line: i + 1, warn: [] };
      if (rec.sbd) { if (/^\d{1,8}$/.test(rec.sbd)) item.sbd = rec.sbd; else item.warn.push(`SBD "${rec.sbd}" không phải số 1–8 chữ số, đã bỏ qua`); }
      if (rec.dobBad) item.warn.push(`ngày sinh "${rec.dobBad}" không đọc được`);
      out.push(item);
    }
    // trùng trong chính danh sách
    const seen = new Set(); out.forEach(o => { if (o.sbd) { if (seen.has(o.sbd)) { o.warn.push('SBD trùng với dòng khác, đã bỏ SBD'); o.sbd = null; } else seen.add(o.sbd); } });
    return { out, skipped, roles, header: !!hd };
  }

  // ---------- đọc tệp ----------
  const xmlDoc = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const colIdx = (ref) => { const L = /^[A-Z]+/.exec(ref)[0]; let n = 0; for (const ch of L) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  async function readXlsx(buf) {
    const z = await G.JSZip.loadAsync(buf);
    const ss = z.file('xl/sharedStrings.xml') ? [...xmlDoc(await z.file('xl/sharedStrings.xml').async('string')).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
    const wb = xmlDoc(await z.file('xl/workbook.xml').async('string'));
    const rels = xmlDoc(await z.file('xl/_rels/workbook.xml.rels').async('string'));
    const sheets = [...wb.getElementsByTagName('sheet')].map(s => { const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const rel = [...rels.getElementsByTagName('Relationship')].find(r => r.getAttribute('Id') === rid); let t = rel ? rel.getAttribute('Target') : ''; t = t.replace(/^\/?xl\//, ''); return { name: s.getAttribute('name'), path: 'xl/' + t }; });
    const tables = [];
    for (const sh of sheets) {
      const f = z.file(sh.path); if (!f) continue;
      const doc = xmlDoc(await f.async('string')); const rows = [];
      for (const row of doc.getElementsByTagName('row')) {
        const arr = [];
        for (const c of row.getElementsByTagName('c')) {
          const t = c.getAttribute('t'); const v = c.getElementsByTagName('v')[0];
          let val = t === 's' ? ss[+(v && v.textContent)] : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : v ? v.textContent : '';
          arr[colIdx(c.getAttribute('r'))] = val == null ? '' : val;
        }
        rows.push(Array.from(arr, x => x == null ? '' : x));
      }
      tables.push({ name: sh.name, rows });
    }
    // chọn trang tính đọc được nhiều học sinh nhất
    let best = { out: [] };
    for (const t of tables) { const r = parse(t.rows); if (r.out.length > best.out.length) best = Object.assign(r, { sheet: t.name }); }
    return best;
  }
  async function readDocx(buf) {
    const z = await G.JSZip.loadAsync(buf); const doc = xmlDoc(await z.file('word/document.xml').async('string'));
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const txt = (el) => [...el.getElementsByTagNameNS(W, 't')].map(t => t.textContent).join('');
    const tbls = [...doc.getElementsByTagNameNS(W, 'tbl')];
    let best = { out: [] };
    for (const tb of tbls) { const rows = [...tb.getElementsByTagNameNS(W, 'tr')].map(tr => [...tr.getElementsByTagNameNS(W, 'tc')].map(txt)); const r = parse(rows); if (r.out.length > best.out.length) best = r; }
    if (!best.out.length) best = parse([...doc.getElementsByTagNameNS(W, 'p')].map(txt).join('\n'));
    return best;
  }
  // ---------- ảnh: nhận dạng chữ ngay trên trình duyệt (Tesseract, tiếng Việt), ảnh không gửi đi đâu ----------
  let tessP = null;
  const loadTess = () => tessP || (tessP = new Promise((ok, no) => {
    if (G.Tesseract) return ok(G.Tesseract);
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = () => ok(G.Tesseract); s.onerror = () => { tessP = null; no(new Error('Không tải được bộ nhận dạng chữ (cần mạng Internet).')); };
    document.head.appendChild(s);
  }));
  async function prepImage(file) {   // phóng to ảnh nhỏ, chuyển xám → nhận dạng chính xác hơn
    const bmp = await createImageBitmap(file); const k = Math.min(3, Math.max(1, 2000 / Math.max(bmp.width, bmp.height)));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.filter = 'grayscale(1) contrast(1.4)'; x.drawImage(bmp, 0, 0, c.width, c.height); return c;
  }
  async function ocrImage(file, onProgress) {
    const T = await loadTess();
    const worker = await T.createWorker('vie', 1, { logger: m => { if (onProgress && m.status) onProgress(m.status, m.progress || 0); } });
    try {
      await worker.setParameters({ preserve_interword_spaces: '1' });
      const { data } = await worker.recognize(await prepImage(file));
      return data.text.replace(/[|]/g, ' ')
        .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')      // "NguyễnPhươngAnh" → "Nguyễn Phương Anh" (chữ dính khi nhận dạng)
        .replace(/[ \t]{2,}/g, ' ');
    } finally { await worker.terminate(); }
  }
  const isImage = (file) => /^image\//.test(file.type) || /\.(png|jpe?g|webp|bmp|gif|heic)$/i.test(file.name);

  async function readFile(file, onProgress) {
    const name = file.name.toLowerCase();
    if (isImage(file)) { const text = await ocrImage(file, onProgress); return Object.assign(parse(text), { text, fromImage: true }); }
    if (/\.xlsx$|\.xlsm$/.test(name)) return readXlsx(await file.arrayBuffer());
    if (/\.docx$/.test(name)) return readDocx(await file.arrayBuffer());
    if (/\.xls$|\.doc$/.test(name)) throw new Error('Tệp định dạng cũ (.xls/.doc). Hãy mở và "Lưu thành" .xlsx hoặc .docx rồi chọn lại, hoặc sao chép bảng và dán vào ô văn bản.');
    let text = await file.text(); if (/�/.test(text)) { try { text = new TextDecoder('windows-1258').decode(await file.arrayBuffer()); } catch (e) { /* giữ nguyên */ } }
    return parse(text);
  }

  G.RosterImport = { parse, readFile, isImage, parseDate, normName, looksName };
})(window);
