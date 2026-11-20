// Chấm bài từ Phiếu trả lời trắc nghiệm 2025: danh sách học sinh, đọc phiếu, tô màu kết quả, sửa tay, xuất Excel.
(function (G) {
  'use strict';
  const DT = G.DT, OMR = G.OMR;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const toast = (m, ms) => G.__app.toast(m, ms);
  const fmt = DT.fmtNum;
  const COLORS = { ok: '#16a34a', key: '#eab308', bad: '#dc2626', info: '#2563eb' };
  const TF_RATE = [0, 0.1, 0.25, 0.5, 1];

  // ---------- Lưu trữ ----------
  const K_STUD = 'dtt_students';
  const Students = {
    all() { return DT.store.get(K_STUD, []); },
    save(list) { if (!DT.store.set(K_STUD, list)) throw new Error('Bộ nhớ trình duyệt đầy.'); },
    bySbd(sbd) { const s = String(sbd || '').replace(/^0+/, ''); return s ? this.all().find(x => String(x.sbd).replace(/^0+/, '') === s) : null; },
    get(id) { return this.all().find(x => x.id === id); }
  };
  const resKey = (examId) => 'dtt_grading_' + examId;
  const Results = {
    all(examId) { return DT.store.get(resKey(examId), []); },
    save(examId, list) { if (!DT.store.set(resKey(examId), list)) throw new Error('Bộ nhớ trình duyệt đầy – hãy xuất Excel rồi xóa bớt kết quả cũ.'); }
  };
  // Ảnh phiếu đã nắn: IndexedDB
  const IDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => { const r = indexedDB.open('dtt-omr', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); });
    },
    async put(k, blob) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('img', 'readwrite'); t.objectStore('img').put(blob, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
    async get(k) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('img').objectStore('img').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async del(k) { const db = await this.open(); return new Promise((res) => { const t = db.transaction('img', 'readwrite'); t.objectStore('img').delete(k); t.oncomplete = res; t.onerror = res; }); }
  };

  // ---------- Đáp án & tính điểm ----------
  function sheetKey(version) {
    const items = version.items;
    return {
      mcq: items.filter(i => i.q.type === 'mcq').map(i => i.perm.indexOf(i.q.answer)),
      tf: items.filter(i => i.q.type === 'tf').map(i => i.q.answer.slice()),
      short: items.filter(i => i.q.type === 'short').map(i => String(i.q.answer)),
      essay: items.filter(i => i.q.type === 'essay').length
    };
  }
  const normNum = (s) => String(s || '').trim().replace(/\s/g, '').replace('.', ',');
  function sameShort(a, b) {
    if (!a || a === '?') return false;
    if (normNum(a) === normNum(b)) return true;
    const x = parseFloat(normNum(a).replace(',', '.')), y = parseFloat(normNum(b).replace(',', '.'));
    return !isNaN(x) && !isNaN(y) && Math.abs(x - y) < 1e-9;
  }
  function findVersion(exam, made) {
    if (!made || /[?_]/.test(made)) return null;
    return exam.versions.find(v => +v.code === +made) || null;
  }
  function grade(exam, r) {
    const d = OMR.decode(r.fill);
    const v = r.versionCode ? exam.versions.find(x => x.code === r.versionCode) : findVersion(exam, d.made);
    const out = { d, version: v, p1: null, p2: null, p3: null, total: null, notes: [] };
    if (!v) { out.notes.push('Không xác định được mã đề'); return out; }
    const K = sheetKey(v), P = exam.points;
    const n1 = Math.min(40, K.mcq.length), n2 = Math.min(8, K.tf.length), n3 = Math.min(6, K.short.length);
    let c1 = 0; const res1 = [];
    for (let q = 0; q < n1; q++) { const ch = d.p1[q]; const ok = ch.length === 1 && ch[0] === K.mcq[q]; if (ok) c1++; res1.push(ok); if (ch.length > 1) out.notes.push(`Câu ${q + 1} phần I tô nhiều ô`); }
    const res2 = [];
    let s2 = 0;
    for (let q = 0; q < n2; q++) { let k = 0; for (let s = 0; s < 4; s++) if (d.p2[q][s] === K.tf[q][s]) k++; res2.push(k); s2 += (P.tf || 0) * TF_RATE[k]; }
    let c3 = 0; const res3 = [];
    for (let q = 0; q < n3; q++) { const ok = sameShort(d.p3[q], K.short[q]); if (ok) c3++; res3.push(ok); }
    out.p1 = { n: n1, c: c1, score: c1 * (P.mcq || 0), res: res1 };
    out.p2 = { n: n2, score: s2, res: res2 };
    out.p3 = { n: n3, c: c3, score: c3 * (P.short || 0), res: res3 };
    out.essayMax = K.essay * (P.essay || 0);
    const essay = r.essay == null || r.essay === '' ? 0 : +r.essay;
    out.total = Math.round((out.p1.score + out.p2.score + out.p3.score + essay) * 100) / 100;
    if (K.mcq.length > 40 || K.tf.length > 8 || K.short.length > 6) out.notes.push('Đề có nhiều câu hơn số ô trên phiếu – phần vượt không được chấm');
    if (d.sbdAmb) out.notes.push('Số báo danh tô không rõ');
    return out;
  }

  // ---------- Tô màu kết quả lên phiếu ----------
  function overlay(ctx, exam, r, g) {
    const R = OMR.R_PX;
    const dot = (key, color, ring) => {
      const p = r.pos[key]; if (!p) return;
      ctx.beginPath(); ctx.arc(p[0], p[1], R * 1.02, 0, Math.PI * 2);
      ctx.globalAlpha = ring ? 1 : 0.55; ctx.fillStyle = color; if (!ring) ctx.fill();
      ctx.globalAlpha = 1; ctx.lineWidth = 2.2; ctx.strokeStyle = color; ctx.stroke();
    };
    const fill = r.fill;
    // SBD & mã đề: viền xanh dương các ô đã tô
    for (const k in fill) if (fill[k] && (k.startsWith('sbd.') || k.startsWith('made.'))) dot(k, COLORS.info, true);
    if (!g.version) { for (const k in fill) if (fill[k]) dot(k, COLORS.info, true); return; }
    const K = sheetKey(g.version);
    // Phần I
    for (let q = 0; q < g.p1.n; q++) {
      const key = K.mcq[q], ch = g.d.p1[q];
      if (g.p1.res[q]) dot(`p1.${q}.${key}`, COLORS.ok);
      else { ch.forEach(o => dot(`p1.${q}.${o}`, COLORS.bad)); dot(`p1.${q}.${key}`, COLORS.key); }
    }
    // Phần II
    for (let q = 0; q < g.p2.n; q++) for (let s = 0; s < 4; s++) {
      const ans = K.tf[q][s], st = g.d.p2[q][s]; const keyCol = ans ? 0 : 1;
      if (st === ans) dot(`p2.${q}.${s}.${keyCol}`, COLORS.ok);
      else {
        if (fill[`p2.${q}.${s}.0`]) dot(`p2.${q}.${s}.0`, COLORS.bad);
        if (fill[`p2.${q}.${s}.1`]) dot(`p2.${q}.${s}.1`, COLORS.bad);
        dot(`p2.${q}.${s}.${keyCol}`, COLORS.key);
      }
    }
    // Phần III
    for (let q = 0; q < g.p3.n; q++) {
      const chosen = Object.keys(fill).filter(k => fill[k] && k.startsWith(`p3.${q}.`));
      if (g.p3.res[q]) chosen.forEach(k => dot(k, COLORS.ok));
      else {
        chosen.forEach(k => dot(k, COLORS.bad));
        OMR.p3KeyCells(K.short[q]).forEach(([row, col]) => { const k = `p3.${q}.${row}.${col}`; if (!(fill[k])) dot(k, COLORS.key); else dot(k, COLORS.key); });
      }
    }
  }

  // ---------- Trạng thái giao diện ----------
  const st = { examId: '', current: null, img: null, filterClass: '' };
  const curExam = () => st.examId ? DT.Exams.get(st.examId) : null;
  const studentOf = (r, g) => (r.studentId && Students.get(r.studentId)) || Students.bySbd(g.d.sbd);

  function renderExamSelect() {
    const exams = DT.Exams.all();
    const sel = $('#grExam');
    sel.innerHTML = '<option value="">— Chọn đề đã lưu —</option>' + exams.map(e => `<option value="${e.id}" ${e.id === st.examId ? 'selected' : ''}>${esc(e.name)} · mã ${e.versions.map(v => v.code).join(', ')}</option>`).join('');
    renderExamInfo();
  }
  function renderExamInfo() {
    const ex = curExam(); const box = $('#grExamInfo');
    if (!ex) { box.innerHTML = '<span class="muted">Hãy lưu đề ở tab “Tạo đề” rồi chọn tại đây. Đáp án lấy từ đề đã lưu theo đúng mã đề học sinh tô.</span>'; return; }
    const K = sheetKey(ex.versions[0]);
    const warn = [];
    if (K.mcq.length > 40 || K.tf.length > 8 || K.short.length > 6) warn.push('Đề vượt số ô của phiếu (tối đa 40 câu phần I, 8 câu phần II, 6 câu phần III).');
    if (K.essay) warn.push(`Có ${K.essay} câu tự luận: nhập điểm tự luận bằng tay cho từng bài.`);
    if (ex.versions.some(v => v.code.length !== 4)) warn.push('Đề lưu với mã đề 3 số – app vẫn khớp theo giá trị số (ví dụ 101 = 0101).');
    box.innerHTML = `Phần I: <b>${K.mcq.length}</b> câu · Phần II: <b>${K.tf.length}</b> câu · Phần III: <b>${K.short.length}</b> câu${K.essay ? ` · Tự luận: <b>${K.essay}</b>` : ''} · Mã đề: <b>${ex.versions.map(v => v.code).join(', ')}</b>` +
      warn.map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join('');
  }

  function renderResults() {
    const ex = curExam(); const tb = $('#grTable');
    if (!ex) { tb.innerHTML = ''; $('#grSummary').textContent = ''; return; }
    const list = Results.all(ex.id).map(r => { const g = grade(ex, r); const s = studentOf(r, g); return { r, g, s }; });
    const classes = [...new Set(list.map(x => x.s ? x.s.lop : '').filter(Boolean))].sort();
    const fc = $('#grClassFilter'); fc.innerHTML = '<option value="">Mọi lớp</option>' + classes.map(c => `<option ${c === st.filterClass ? 'selected' : ''}>${esc(c)}</option>`).join('');
    const rows = list.filter(x => !st.filterClass || (x.s && x.s.lop === st.filterClass))
      .sort((a, b) => ((a.s && a.s.lop) || '~').localeCompare((b.s && b.s.lop) || '~', 'vi') || ((a.s && lastName(a.s.name)) || '').localeCompare((b.s && lastName(b.s.name)) || '', 'vi'));
    const sbdCount = {}; list.forEach(x => { if (x.g.d.sbd) sbdCount[x.g.d.sbd] = (sbdCount[x.g.d.sbd] || 0) + 1; });
    rows.forEach(x => { if (sbdCount[x.g.d.sbd] > 1) x.g.notes.push('Trùng SBD với bài khác'); });
    const totals = rows.map(x => x.g.total).filter(t => t != null);
    $('#grSummary').textContent = rows.length ? `${rows.length} bài · điểm TB ${fmt(totals.reduce((a, b) => a + b, 0) / (totals.length || 1))} · cao nhất ${fmt(Math.max(...totals, 0))} · thấp nhất ${fmt(totals.length ? Math.min(...totals) : 0)}` : 'Chưa có bài nào.';
    tb.innerHTML = `<thead><tr><th>#</th><th>SBD</th><th>Họ tên</th><th>Lớp</th><th>Mã đề</th><th>P.I</th><th>P.II</th><th>P.III</th><th>TL</th><th>Tổng</th><th></th></tr></thead><tbody>` +
      rows.map((x, i) => `<tr data-id="${x.r.id}" class="${st.current === x.r.id ? 'sel' : ''}"><td>${i + 1}</td><td>${esc(x.g.d.sbd || '—')}</td><td>${x.s ? esc(x.s.name) : '<span class="warn">Chưa khớp</span>'}</td><td>${x.s ? esc(x.s.lop) : ''}</td>
        <td>${x.g.version ? esc(x.g.version.code) : `<span class="warn">${esc(x.g.d.made || '?')}</span>`}</td>
        <td>${x.g.p1 ? fmt(x.g.p1.score) : ''}</td><td>${x.g.p2 ? fmt(x.g.p2.score) : ''}</td><td>${x.g.p3 ? fmt(x.g.p3.score) : ''}</td><td>${x.r.essay != null && x.r.essay !== '' ? fmt(+x.r.essay) : ''}</td>
        <td><b>${x.g.total != null ? fmt(x.g.total) : '—'}</b></td><td>${x.g.notes.length || !x.s ? '<span class="warn" title="' + esc(x.g.notes.join('; ') || 'Không tìm thấy học sinh theo SBD') + '">⚠</span>' : ''}</td></tr>`).join('') + '</tbody>';
  }
  const lastName = (n) => { const p = String(n || '').trim().split(/\s+/); return p[p.length - 1] + ' ' + n; };

  async function openResult(id) {
    const ex = curExam(); const r = Results.all(ex.id).find(x => x.id === id); if (!r) return;
    st.current = id; renderResults();
    const blob = await IDB.get(id).catch(() => null);
    st.img = null;
    if (blob) { st.img = await createImageBitmap(blob); }
    renderDetail();
    if (window.innerWidth < 1000) $('#grDetail').scrollIntoView({ behavior: 'smooth' });
  }
  function renderDetail() {
    const ex = curExam(); const box = $('#grDetail');
    const r = ex && Results.all(ex.id).find(x => x.id === st.current);
    if (!r) { box.innerHTML = '<div class="empty muted">Chọn một bài trong danh sách để xem phiếu đã chấm.</div>'; return; }
    const g = grade(ex, r); const s = studentOf(r, g);
    const studs = Students.all();
    box.innerHTML = `<div class="gr-card">
      <div class="gr-row"><div>
        <div>Số báo danh: <b>${esc(g.d.sbd || '—')}</b></div>
        <div>Học sinh: <select id="grStudent"><option value="">${s ? '' : '— chưa khớp SBD —'}</option>${studs.map(x => `<option value="${x.id}" ${s && s.id === x.id ? 'selected' : ''}>${esc(x.name)} – ${esc(x.lop)} (SBD ${esc(x.sbd)})</option>`).join('')}</select></div>
        <div>Mã đề: <select id="grVersion"><option value="">${g.version ? '' : '— phiếu tô: ' + esc(g.d.made || '?') + ' —'}</option>${ex.versions.map(v => `<option ${g.version && g.version.code === v.code ? 'selected' : ''}>${v.code}</option>`).join('')}</select></div>
        ${s ? `<div class="muted">Lớp ${esc(s.lop)} · Khối ${esc(s.khoi)} · Khóa ${esc(s.khoa || '')}</div>` : ''}
      </div><div class="gr-total"><span>TỔNG ĐIỂM</span><b>${g.total != null ? fmt(g.total) : '—'}</b></div></div>
      ${g.version ? `<div class="gr-part"><b>P1</b> ${g.p1.c}/${g.p1.n}<span>${fmt(g.p1.score)}</span></div>
      <div class="gr-part"><b>P2</b> ${g.p2.res.map(k => `<i>${k}/4</i>`).join('')}<span>${fmt(g.p2.score)}</span></div>
      <div class="gr-part"><b>P3</b> ${g.p3.c}/${g.p3.n}<span>${fmt(g.p3.score)}</span></div>` : ''}
      <div class="gr-part"><b>TL</b> <input id="grEssay" type="number" step="0.25" min="0" ${g.essayMax ? `max="${g.essayMax}"` : ''} value="${r.essay == null ? '' : r.essay}" placeholder="điểm tự luận"><span class="muted">${g.essayMax ? 'tối đa ' + fmt(g.essayMax) : ''}</span></div>
      ${g.notes.length ? `<div class="warn">⚠ ${esc(g.notes.join(' · '))}</div>` : ''}
      <div class="gr-legend"><i style="background:${COLORS.ok}"></i>HS đúng <i style="background:${COLORS.key}"></i>Đáp án đúng <i style="background:${COLORS.bad}"></i>HS sai <i style="border:2px solid ${COLORS.info}"></i>SBD/mã đề đã đọc</div>
      <div class="row-actions"><button class="btn sm" id="grDl">⬇ Tải ảnh đã chấm</button><button class="btn sm danger" id="grDel">Xóa bài này</button></div>
    </div>
    <p class="muted small">Bấm vào một ô trên phiếu để sửa (tô/bỏ tô) nếu máy đọc sai – điểm được tính lại ngay.</p>
    <div class="gr-canvas-wrap"><canvas id="grCanvas"></canvas></div>`;
    draw(ex, r, g);
    $('#grStudent').onchange = (e) => update(r.id, { studentId: e.target.value || null });
    $('#grVersion').onchange = (e) => update(r.id, { versionCode: e.target.value || null });
    $('#grEssay').onchange = (e) => update(r.id, { essay: e.target.value === '' ? null : +e.target.value });
    $('#grDel').onclick = async () => { if (!confirm('Xóa bài chấm này?')) return; Results.save(ex.id, Results.all(ex.id).filter(x => x.id !== r.id)); await IDB.del(r.id); st.current = null; renderResults(); renderDetail(); };
    $('#grDl').onclick = async () => { const b = await annotatedBlob(ex, r); downloadBlob(b, fileNameFor(ex, r) + '.jpg'); };
    $('#grCanvas').onclick = (e) => {
      const c = e.target; const rc = c.getBoundingClientRect(); const x = (e.clientX - rc.left) * c.width / rc.width, y = (e.clientY - rc.top) * c.height / rc.height;
      let best = null, bd = OMR.R_PX * 1.3;
      for (const k in r.pos) { const p = r.pos[k]; const dd = Math.hypot(p[0] - x, p[1] - y); if (dd < bd) { bd = dd; best = k; } }
      if (!best) return;
      const fill = Object.assign({}, r.fill, { [best]: !r.fill[best] });
      update(r.id, { fill, edited: (r.edited || 0) + 1 });
    };
  }
  function draw(ex, r, g) {
    const c = $('#grCanvas'); if (!c) return;
    const W = st.img ? st.img.width : Math.round(OMR.RW * (1 + 2 * OMR.MARGIN)), H = st.img ? st.img.height : Math.round(OMR.RH + 2 * OMR.MARGIN * OMR.RW);
    c.width = W; c.height = H; const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    if (st.img) ctx.drawImage(st.img, 0, 0); else { ctx.fillStyle = '#999'; ctx.font = '20px sans-serif'; ctx.fillText('(Không còn ảnh phiếu – chỉ hiển thị kết quả)', 40, 60); }
    overlay(ctx, ex, r, g);
  }
  function update(id, patch) {
    const ex = curExam(); const list = Results.all(ex.id); const r = list.find(x => x.id === id); Object.assign(r, patch);
    try { Results.save(ex.id, list); } catch (e) { toast(e.message, 5000); }
    renderResults(); renderDetail();
  }

  // ---------- Ảnh đã chấm (có tiêu đề) ----------
  async function annotatedBlob(ex, r) {
    const g = grade(ex, r); const s = studentOf(r, g);
    const blob = await IDB.get(r.id); const img = blob ? await createImageBitmap(blob) : null;
    const W = img ? img.width : 1176, H = img ? img.height : 1700, head = 110;
    const c = document.createElement('canvas'); c.width = W; c.height = H + head; const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#c2410c'; ctx.fillRect(0, 0, W, head);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${s ? s.name : 'SBD ' + (g.d.sbd || '?')}${s ? ' – ' + s.lop : ''}`, 24, 44);
    ctx.font = '22px sans-serif';
    ctx.fillText(`SBD ${g.d.sbd || '—'} · Mã đề ${g.version ? g.version.code : '?'} · P1 ${g.p1 ? fmt(g.p1.score) : '-'} · P2 ${g.p2 ? fmt(g.p2.score) : '-'} · P3 ${g.p3 ? fmt(g.p3.score) : '-'}${r.essay != null && r.essay !== '' ? ' · TL ' + fmt(+r.essay) : ''}`, 24, 84);
    ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(g.total != null ? fmt(g.total) : '—', W - 24, 74); ctx.textAlign = 'left';
    ctx.save(); ctx.translate(0, head); if (img) ctx.drawImage(img, 0, 0); overlay(ctx, ex, r, g); ctx.restore();
    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  }
  const fileNameFor = (ex, r) => { const g = grade(ex, r); const s = studentOf(r, g); return slug((s ? s.lop + '_' + s.name : 'SBD_' + (g.d.sbd || r.id))); };
  const slug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9_]+/g, '-').replace(/^-|-$/g, '');
  function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }

  // ---------- Tải phiếu lên ----------
  async function handleFiles(files) {
    const ex = curExam(); if (!ex) return toast('Hãy chọn đề cần chấm trước.');
    if (!files.length) return;
    const prog = $('#grProgress'); prog.textContent = 'Đang đọc tệp…';
    let canv;
    try { canv = await OMR.filesToCanvases([...files], n => prog.textContent = `Đã nạp ${n} trang…`); } catch (e) { prog.textContent = ''; return toast('Lỗi đọc tệp: ' + e.message, 5000); }
    let ok = 0; const fails = []; let lastId = null;
    for (let i = 0; i < canv.length; i++) {
      prog.textContent = `Đang chấm ${i + 1}/${canv.length}: ${canv[i].name}`;
      await new Promise(r => setTimeout(r, 0));
      const res = await OMR.processCanvas(canv[i].canvas);
      if (!res.ok) { fails.push(canv[i].name + ': ' + res.error); continue; }
      const id = DT.uid(); const pos = {};
      for (const k in res.bubbles) pos[k] = [Math.round(res.bubbles[k].x * 10) / 10, Math.round(res.bubbles[k].y * 10) / 10];
      const blob = await new Promise(r => res.rect.canvas.toBlob(r, 'image/jpeg', 0.82));
      await IDB.put(id, blob);
      const list = Results.all(ex.id);
      list.push({ id, file: canv[i].name, fill: res.fill, pos, essay: null, studentId: null, versionCode: null, createdAt: new Date().toISOString() });
      try { Results.save(ex.id, list); } catch (e) { fails.push(e.message); break; }
      ok++; lastId = id;
    }
    prog.textContent = `Đã chấm ${ok}/${canv.length} phiếu.` + (fails.length ? ` ${fails.length} phiếu lỗi.` : '');
    if (fails.length) $('#grFails').innerHTML = fails.map(f => `<div class="warning">⚠ ${esc(f)}</div>`).join(''); else $('#grFails').innerHTML = '';
    renderResults(); if (lastId) openResult(lastId);
  }

  // ---------- Danh sách học sinh ----------
  function renderRoster() {
    const list = Students.all();
    const byClass = {}; list.forEach(s => (byClass[s.lop] = (byClass[s.lop] || 0) + 1));
    $('#rosterInfo').textContent = list.length ? `${list.length} học sinh · ` + Object.entries(byClass).map(([c, n]) => `${c}: ${n}`).join(' · ') : 'Chưa có học sinh.';
    $('#rosterTable').innerHTML = '<thead><tr><th>SBD</th><th>Họ tên</th><th>Lớp</th><th>Khối</th><th>Khóa</th><th></th></tr></thead><tbody>' +
      list.map(s => `<tr><td>${esc(s.sbd)}</td><td>${esc(s.name)}</td><td>${esc(s.lop)}</td><td>${esc(s.khoi)}</td><td>${esc(s.khoa || '')}</td><td><button class="btn sm danger" data-rmstu="${s.id}">✕</button></td></tr>`).join('') + '</tbody>';
  }
  function parseRoster(text) {
    const rows = text.split(/\r?\n/).map(l => l.split(/\t|;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim())).filter(r => r.some(Boolean));
    if (rows.length && /tên|ten|name|sbd/i.test(rows[0].join(' '))) rows.shift();
    const out = [], errs = [];
    rows.forEach((r, i) => {
      const [name, sbd, lop, khoi, khoa] = r;
      if (!name || !sbd) { errs.push(`Dòng ${i + 1}: thiếu họ tên hoặc SBD`); return; }
      if (!/^\d{1,8}$/.test(sbd)) { errs.push(`Dòng ${i + 1}: SBD "${sbd}" phải là số (tối đa 8 chữ số)`); return; }
      out.push({ id: DT.uid(), name, sbd, lop: lop || '', khoi: khoi || (String(lop || '').match(/^\d{2}/) || [''])[0], khoa: khoa || '' });
    });
    return { out, errs };
  }

  // ---------- Xuất Excel (.xlsx) ----------
  async function exportXlsx() {
    const ex = curExam(); if (!ex) return;
    const rows = Results.all(ex.id).map(r => { const g = grade(ex, r); const s = studentOf(r, g); return [s ? s.khoa : '', s ? s.khoi : '', s ? s.lop : '', g.d.sbd, s ? s.name : '', g.version ? g.version.code : g.d.made,
      g.p1 ? g.p1.score : '', g.p2 ? g.p2.score : '', g.p3 ? g.p3.score : '', r.essay == null ? '' : +r.essay, g.total == null ? '' : g.total, g.notes.join('; ') + (s ? '' : ' Chưa khớp học sinh')]; })
      .sort((a, b) => String(a[2]).localeCompare(String(b[2]), 'vi') || String(a[3]).localeCompare(String(b[3])));
    const head = ['Khóa', 'Khối', 'Lớp', 'SBD', 'Họ và tên', 'Mã đề', 'Phần I', 'Phần II', 'Phần III', 'Tự luận', 'Tổng điểm', 'Ghi chú'];
    const blob = await xlsx([[ex.name], [], head, ...rows]);
    downloadBlob(blob, 'diem_' + slug(ex.name) + '.xlsx');
  }
  async function xlsx(rows) {
    const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const col = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
    const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="5" max="5" width="28" customWidth="1"/><col min="12" max="12" width="40" customWidth="1"/></cols><sheetData>' +
      rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => { const ref = col(ci) + (ri + 1); if (v === '' || v == null) return ''; return typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`; }).join('') + '</row>').join('') + '</sheetData></worksheet>';
    const z = new G.JSZip();
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Diem" sheetId="1" r:id="rId1"/></sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    z.file('xl/worksheets/sheet1.xml', sheet);
    return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  async function exportImagesZip() {
    const ex = curExam(); if (!ex) return; const list = Results.all(ex.id); if (!list.length) return toast('Chưa có bài.');
    toast('Đang tạo tệp ZIP…'); const z = new G.JSZip();
    for (const r of list) { const b = await annotatedBlob(ex, r); z.file(fileNameFor(ex, r) + '_' + r.id.slice(-4) + '.jpg', b); }
    downloadBlob(await z.generateAsync({ type: 'blob' }), 'phieu_da_cham_' + slug(ex.name) + '.zip');
  }

  // ---------- Gắn sự kiện ----------
  function init() {
    $('#grExam').onchange = (e) => { st.examId = e.target.value; st.current = null; renderExamInfo(); renderResults(); renderDetail(); };
    $('#grFiles').onchange = (e) => { handleFiles(e.target.files); e.target.value = ''; };
    $('#grCamera').onchange = (e) => { handleFiles(e.target.files); e.target.value = ''; };
    $('#grTable').onclick = (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) openResult(tr.dataset.id); };
    $('#grClassFilter').onchange = (e) => { st.filterClass = e.target.value; renderResults(); };
    $('#grXlsx').onclick = exportXlsx; $('#grZip').onclick = exportImagesZip;
    $('#grRoster').onclick = () => { renderRoster(); $('#rosterModal').showModal(); };
    $('#rosterClose').onclick = () => { $('#rosterModal').close(); renderResults(); renderDetail(); };
    $('#rosterAdd').onclick = () => {
      const { out, errs } = parseRoster($('#rosterText').value);
      const list = Students.all(); let added = 0, upd = 0;
      out.forEach(s => { const i = list.findIndex(x => String(x.sbd).replace(/^0+/, '') === String(s.sbd).replace(/^0+/, '')); if (i >= 0) { s.id = list[i].id; list[i] = s; upd++; } else { list.push(s); added++; } });
      try { Students.save(list); } catch (e) { return toast(e.message, 4000); }
      $('#rosterErr').innerHTML = errs.map(e => `<div class="warn">${esc(e)}</div>`).join('');
      if (!errs.length) $('#rosterText').value = '';
      toast(`Đã thêm ${added}, cập nhật ${upd} học sinh.`); renderRoster();
    };
    $('#rosterFile').onchange = async (e) => { const f = e.target.files[0]; if (f) $('#rosterText').value = await f.text(); e.target.value = ''; };
    $('#rosterTable').onclick = (e) => { const b = e.target.closest('[data-rmstu]'); if (b && confirm('Xóa học sinh này?')) { Students.save(Students.all().filter(s => s.id !== b.dataset.rmstu)); renderRoster(); } };
    $('#rosterClear').onclick = () => {
      const k = $('#rosterKhoa').value.trim(); const n = Students.all().filter(s => !k || s.khoa === k).length;
      if (!n) return toast('Không có học sinh phù hợp.');
      if (!confirm(k ? `Xóa ${n} học sinh khóa ${k} (đã hết khóa)?` : `Xóa toàn bộ ${n} học sinh?`)) return;
      Students.save(k ? Students.all().filter(s => s.khoa !== k) : []); renderRoster();
    };
  }
  function show() { renderExamSelect(); renderResults(); renderDetail(); }

  G.Grading = { init, show, grade, sheetKey, Students, Results, IDB, parseRoster, xlsx, annotatedBlob, studentOf, renderResults, renderDetail };
})(window);
