// Giao diện người dùng
(function (G) {
  'use strict';
  const DT = G.DT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- Hiển thị công thức ----------
  function tex(text) {
    text = String(text == null ? '' : text);
    const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g; let out = '', last = 0, m;
    const plain = (s) => esc(s).replace(/\n/g, '<br>');
    while ((m = re.exec(text))) {
      out += plain(text.slice(last, m.index));
      const src = (m[1] || m[2]).trim();
      try { out += G.katex.renderToString(src, { displayMode: !!m[1], throwOnError: true, strict: false }); }
      catch (e) { out += `<span class="tex-err" title="${esc(e.message)}">${esc(src)}</span>`; }
      last = re.lastIndex;
    }
    return out + plain(text.slice(last));
  }

  function toast(msg, ms = 2600) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }

  const state = { exam: null, vIndex: 0, saved: false };

  // ---------- Điều hướng ----------
  $$('.tab').forEach(b => b.onclick = () => {
    $$('.tab').forEach(x => x.classList.toggle('active', x === b));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + b.dataset.view));
    if (b.dataset.view === 'bank') renderBank();
    if (b.dataset.view === 'saved') renderSaved();
    if (b.dataset.view === 'grade') G.Grading.show();
    if (b.dataset.view === 'practice') G.Practice.mount($('#practiceRoot'));
  });

  // ================= TẠO ĐỀ =================
  function renderChapters() {
    const grade = $('#cfgGrade').value, sem = $('#cfgSemester').value;
    const bank = DT.Bank.exam();
    $('#chapterList').innerHTML = `<div class="chapters-head"><label class="check"><input type="checkbox" id="chkAll" checked> Chọn tất cả</label></div>` +
      DT.chaptersOf(grade, sem).map(c => {
        const n = bank.filter(q => q.chapter === c.id).length;
        return `<label class="check chapter"><input type="checkbox" value="${c.id}" checked> <span>${esc(c.name)}</span> <span class="badge light">${n} câu</span></label>`;
      }).join('');
    $('#chkAll').onchange = (e) => { $$('#chapterList .chapter input').forEach(i => i.checked = e.target.checked); updateMatrixInfo(); };
    $$('#chapterList .chapter input').forEach(i => i.onchange = updateMatrixInfo);
    updateMatrixInfo();
  }
  const selectedChapters = () => $$('#chapterList .chapter input:checked').map(i => i.value);

  function renderMatrix(preset) {
    $('#matrixBody').innerHTML = DT.TYPE_ORDER.map(t => `<tr data-type="${t}"><td>${{mcq:'TN 4 lựa chọn',tf:'Đúng/Sai',short:'Trả lời ngắn',essay:'Tự luận'}[t]}</td>` +
      DT.LEVEL_ORDER.map(l => `<td><input type="number" min="0" max="40" data-level="${l}" value="${preset.matrix[t][l]}"><small class="avail" data-avail="${t}-${l}"></small></td>`).join('') +
      `<td><input type="number" min="0" max="10" step="0.05" class="pts" value="${preset.points[t]}"></td><td class="rowsum"></td></tr>`).join('');
    $$('#matrixBody input').forEach(i => i.oninput = () => { updateMatrixInfo(); });
    updateMatrixInfo();
  }
  function readMatrix() {
    const matrix = {}, points = {};
    $$('#matrixBody tr').forEach(tr => {
      const t = tr.dataset.type; matrix[t] = {};
      $$('input[data-level]', tr).forEach(i => matrix[t][i.dataset.level] = Math.max(0, parseInt(i.value, 10) || 0));
      points[t] = Math.max(0, parseFloat(tr.querySelector('.pts').value) || 0);
    });
    return { matrix, points };
  }
  function updateMatrixInfo() {
    const { matrix, points } = readMatrix();
    const chs = new Set(selectedChapters()); const grade = $('#cfgGrade').value;
    const pool = DT.Bank.exam().filter(q => String(q.grade) === grade && chs.has(q.chapter));
    const sums = { NB: 0, TH: 0, VD: 0 }; let pts = 0; let short = [];
    $$('#matrixBody tr').forEach(tr => {
      const t = tr.dataset.type; let n = 0;
      DT.LEVEL_ORDER.forEach(l => {
        const have = pool.filter(q => q.type === t && q.level === l).length;
        const el = tr.querySelector(`[data-avail="${t}-${l}"]`); el.textContent = '/' + have;
        el.classList.toggle('lack', matrix[t][l] > have);
        if (matrix[t][l] > have) short.push(`${DT.TYPES[t].short} ${l}`);
        n += matrix[t][l]; sums[l] += matrix[t][l];
      });
      pts += n * points[t];
      tr.querySelector('.rowsum').textContent = n ? `${n}c · ${DT.fmtNum(n * points[t])}đ` : '–';
    });
    $('#sumNB').textContent = sums.NB; $('#sumTH').textContent = sums.TH; $('#sumVD').textContent = sums.VD;
    $('#sumPts').innerHTML = `<b class="${Math.abs(pts - 10) < 1e-6 ? 'ok' : 'warn'}">${DT.fmtNum(pts)} điểm</b>`;
    const total = sums.NB + sums.TH + sums.VD;
    const pct = (x) => total ? Math.round(x / total * 100) + '%' : '0%';
    $('#matrixHint').innerHTML = `Tỉ lệ NB/TH/VD: ${pct(sums.NB)} / ${pct(sums.TH)} / ${pct(sums.VD)}. Số nhỏ “/n” là số câu hiện có trong ngân hàng.` +
      (short.length ? ` <span class="warn">Thiếu câu: ${short.join(', ')} – app sẽ lấy câu mức độ gần nhất thay thế.</span>` : '') +
      (Math.abs(pts - 10) > 1e-6 ? ` <span class="warn">Tổng điểm chưa bằng 10.</span>` : '');
  }
  function applyPreset() {
    const p = DT.PRESETS[$('#cfgForm').value];
    $('#cfgTime').value = p.time; $('#cfgTitle').value = p.title;
    renderMatrix(p);
  }

  $('#cfgGrade').onchange = renderChapters;
  $('#cfgSemester').onchange = renderChapters;
  $('#cfgForm').onchange = applyPreset;

  function readConfig() {
    const { matrix, points } = readMatrix();
    return {
      grade: $('#cfgGrade').value, semester: $('#cfgSemester').value, chapters: selectedChapters(),
      form: $('#cfgForm').value, time: parseInt($('#cfgTime').value, 10) || 45, matrix, points,
      versions: parseInt($('#cfgVersions').value, 10) || 1, startCode: $('#cfgStartCode').value.replace(/\D/g, '') || '0101',
      mixMode: $('input[name=mixMode]:checked').value, avoidUsed: $('#cfgAvoidUsed').checked, shuffleOpts: $('#cfgShuffleOpts').checked,
      header: { school: $('#cfgSchool').value, title: $('#cfgTitle').value, year: $('#cfgYear').value },
      subject: (G.CLOUD && G.CLOUD.subject) || 'toan', subjectName: (G.CLOUD && G.CLOUD.subjectName) || 'Toán'
    };
  }

  $('#btnGenerate').onclick = () => {
    const cfg = readConfig();
    if (!cfg.chapters.length) return toast('Hãy chọn ít nhất một chương.');
    const total = Object.values(cfg.matrix).reduce((s, r) => s + r.NB + r.TH + r.VD, 0);
    if (!total) return toast('Ma trận đề đang trống.');
    if (state.exam && !state.saved && !confirm('Đề hiện tại chưa lưu. Sinh đề mới?')) return;
    state.exam = DT.generate(cfg); state.vIndex = 0; state.saved = false;
    renderExam();
    if (window.innerWidth < 900) $('.preview-panel').scrollIntoView({ behavior: 'smooth' });
  };

  // ---------- Xem trước ----------
  function paperHTML(exam, v, opt = {}) {
    const h = exam.header; const t = DT.totals(exam, v);
    let html = `<article class="paper">
      <table class="paper-head"><tr>
        <td><b>${esc(h.school)}</b><br><b>TỔ ${esc(String(exam.config.subjectName || 'Toán').toUpperCase())}</b><div class="code-box">Mã đề: ${esc(v.code)}</div></td>
        <td><b>${esc(h.title)}</b><br><b>NĂM HỌC ${esc(h.year)}</b><br><b>Môn: ${esc(String(exam.config.subjectName || 'Toán').toUpperCase())} – Lớp ${esc(exam.config.grade)}</b><br><i>Thời gian làm bài: ${esc(exam.config.time)} phút, không kể thời gian phát đề</i></td>
      </tr></table>
      <p class="candidate">Họ và tên thí sinh: ……………………………………………… Số báo danh: ……………………</p>`;
    const roman = ['I', 'II', 'III', 'IV']; let gi = 0;
    for (const type of DT.TYPE_ORDER) {
      const items = v.items.filter(i => i.q.type === type); if (!items.length) continue;
      const p = DT.fmtNum(exam.points[type]);
      const intro = { mcq: `Thí sinh trả lời từ câu 1 đến câu ${items.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án (${p} điểm/câu).`,
        tf: `Thí sinh trả lời từ câu 1 đến câu ${items.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`,
        short: `Thí sinh trả lời từ câu 1 đến câu ${items.length} (${p} điểm/câu).`, essay: `Thí sinh trình bày lời giải từ câu 1 đến câu ${items.length}.` }[type];
      html += `<h4 class="part"><b>PHẦN ${roman[gi++]}. ${DT.TYPES[type].part.replace(/^PHẦN [IV]+\. /, '')}.</b> ${intro}</h4>`;
      items.forEach((it, i) => { html += questionHTML(exam, it, i + 1, opt); });
    }
    html += `<p class="end">------------- HẾT -------------</p><p class="center"><i>Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.</i></p>`;
    if (opt.actions) html += `<p class="paper-foot no-print">Tổng: ${v.items.length} câu · ${DT.fmtNum(t.points)} điểm</p>`;
    return html + '</article>';
  }
  function questionHTML(exam, it, no, opt) {
    const q = it.q; const type = q.type;
    const meta = opt.actions ? `<span class="qmeta no-print"><span class="lv lv-${q.level}">${q.level}</span> ${esc(shortCh(q.chapter))} · ${esc(q.topic || '')}</span>` : '';
    const acts = opt.actions ? `<span class="qacts no-print">
      <button data-act="swap" data-qid="${esc(it.qid)}" title="Đổi câu khác">⇄ Đổi</button>
      <button data-act="edit" data-qid="${esc(it.qid)}" title="Sửa câu này trong đề">✎ Sửa</button>
      <button data-act="del" data-qid="${esc(it.qid)}" title="Xóa khỏi đề">✕</button></span>` : '';
    let body = '';
    if (type === 'mcq') {
      const opts = DT.mcqOptions(it); const correct = it.perm.indexOf(q.answer);
      const maxLen = Math.max(...opts.map(o => o.replace(/\$|\\[a-z]+|[{}]/g, '').length));
      const cls = maxLen <= 12 ? 'cols4' : maxLen <= 30 ? 'cols2' : 'cols1';
      body = `<div class="opts ${cls}">` + opts.map((o, k) => `<div class="opt ${opt.answers && k === correct ? 'correct' : ''}"><b>${DT.LETTERS[k]}.</b> ${tex(o)}</div>`).join('') + '</div>';
    } else if (type === 'tf') {
      body = '<div class="stmts">' + q.statements.map((s, k) => `<div class="stmt"><b>${'abcd'[k]})</b> ${tex(s)}${opt.answers ? ` <span class="tfans ${q.answer[k] ? 't' : 'f'}">${q.answer[k] ? 'Đúng' : 'Sai'}</span>` : ''}</div>`).join('') + '</div>';
    }
    let ans = '';
    if (opt.answers) {
      const a = type === 'mcq' ? 'Đáp án: ' + DT.mcqCorrectLetter(it) : type === 'tf' ? '' : 'Đáp số: ' + tex(q.answer);
      ans = `<div class="solution">${a ? '<b>' + a + '</b><br>' : ''}${tex(q.explanation || '(Chưa có lời giải)')}</div>`;
    }
    const pts = type === 'essay' ? ` <i>(${DT.fmtNum(exam.points.essay)} điểm)</i>` : '';
    return `<div class="q" data-qid="${esc(it.qid)}">${acts}<div class="qtext"><b>Câu ${no}.</b>${pts} ${tex(q.content)} ${meta}</div>${q.figure ? G.Figures.html(q.figure) : ''}${body}${ans}</div>`;
  }
  const shortCh = (id) => { const c = DT.chapterById(id); return c ? c.name.split('.')[0] : id; };

  function renderExam() {
    const ex = state.exam;
    $('#btnSave').disabled = !ex; $('#btnExport').disabled = !ex;
    if (!ex) return;
    $('#versionTabs').innerHTML = ex.versions.map((v, i) => `<button class="${i === state.vIndex ? 'active' : ''}" data-v="${i}">Mã ${esc(v.code)}</button>`).join('');
    $$('#versionTabs button').forEach(b => b.onclick = () => { state.vIndex = +b.dataset.v; renderExam(); });
    $('#warnings').innerHTML = (ex.warnings || []).map(w => `<div class="warning">⚠ ${esc(w)}</div>`).join('') +
      (ex.name ? `<div class="info">Đang mở: <b>${esc(ex.name)}</b>${state.saved ? ' (đã lưu)' : ' (có thay đổi chưa lưu)'}</div>` : '');
    $('#preview').innerHTML = paperHTML(ex, ex.versions[state.vIndex], { actions: true, answers: $('#showAnswers').checked });
  }
  $('#showAnswers').onchange = renderExam;
  $('#preview').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const qid = b.dataset.qid;
    if (b.dataset.act === 'del') { if (confirm('Xóa câu này khỏi đề (ở tất cả mã đề)?')) { DT.removeQuestion(state.exam, qid); changed(); } }
    if (b.dataset.act === 'swap') openSwap(qid);
    if (b.dataset.act === 'edit') {
      const it = state.exam.versions[state.vIndex].items.find(i => i.qid === qid);
      openEditor(it.q, 'exam', (q) => { DT.updateQuestion(state.exam, qid, q); changed(); });
    }
  });
  function changed() { state.saved = false; renderExam(); }

  // ---------- Đổi câu ----------
  function openSwap(qid) {
    const ex = state.exam; const cur = ex.versions[state.vIndex].items.find(i => i.qid === qid).q;
    const inExam = new Set(); ex.versions.forEach(v => v.items.forEach(i => inExam.add(i.qid)));
    const chs = new Set(ex.config.chapters);
    const used = DT.Exams.usedIds(ex.id);
    let cands = DT.Bank.exam().filter(q => q.type === cur.type && String(q.grade) === String(ex.config.grade) && !inExam.has(q.id));
    cands.sort((a, b) => (chs.has(b.chapter) - chs.has(a.chapter)) || ((b.level === cur.level) - (a.level === cur.level)) || ((b.chapter === cur.chapter) - (a.chapter === cur.chapter)) || (used.has(a.id) - used.has(b.id)));
    $('#swapInfo').textContent = `Câu cùng dạng “${DT.TYPES[cur.type].label}”, ưu tiên cùng chương/mức độ (${cur.level}). Có ${cands.length} câu.`;
    $('#swapList').innerHTML = cands.slice(0, 60).map(q => bankCard(q, `<button class="btn primary sm" data-pick="${esc(q.id)}">Chọn câu này</button>`, chs.has(q.chapter) ? '' : 'Ngoài phạm vi đã chọn')).join('') || '<p class="muted">Không còn câu phù hợp trong ngân hàng.</p>';
    $$('#swapList [data-pick]').forEach(b => b.onclick = () => { DT.replaceQuestion(ex, qid, DT.Bank.get(b.dataset.pick)); $('#swapModal').close(); changed(); toast('Đã đổi câu.'); });
    $('#swapModal').showModal();
  }
  $('#swapClose').onclick = () => $('#swapModal').close();

  // ---------- Lưu ----------
  $('#btnSave').onclick = () => {
    const ex = state.exam; const ch = ex.config.chapters.map(shortCh).join(', ');
    const def = ex.name || `${ex.header.title} – Toán ${ex.config.grade} (${ch})`;
    const dlg = $('#nameModal'); dlg.querySelector('input').value = def; dlg.returnValue = '';
    dlg.querySelector('form').onsubmit = (e) => {
      if (!e.submitter || e.submitter.value !== 'ok') return;
      ex.name = dlg.querySelector('input').value.trim() || def;
      if (DT.Exams.save(DT.clone(ex))) { state.saved = true; renderExam(); updateSavedCount(); toast('Đã lưu đề.'); }
      else toast('Không lưu được – bộ nhớ trình duyệt đầy (ảnh tải lên quá lớn?) hoặc bị chặn.', 5000);
    };
    dlg.showModal(); dlg.querySelector('input').select();
  };

  // ---------- Xuất ----------
  $('#btnExport').onclick = (e) => { e.stopPropagation(); $('#exportMenu').classList.toggle('open'); };
  document.addEventListener('click', () => $('#exportMenu').classList.remove('open'));
  $('#exportMenu').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-exp]'); if (!b) return;
    const ex = state.exam, v = ex.versions[state.vIndex];
    const kind = b.dataset.exp;
    try {
      if (kind === 'pdf-exam') printHTML(paperHTML(ex, v, {}), 'de_ma' + v.code);
      if (kind === 'pdf-all') printHTML(ex.versions.map(x => paperHTML(ex, x, {})).join('<div class="page-break"></div>'), 'de_tat_ca');
      if (kind === 'pdf-key') printHTML(keyHTML(ex, v), 'dap_an');
      if (kind === 'docx-exam') { toast('Đang tạo file Word…'); await G.DocxExport.exam(ex, [v]); }
      if (kind === 'docx-all') { toast('Đang tạo file Word…'); await G.DocxExport.exam(ex, ex.versions); }
      if (kind === 'docx-key') { toast('Đang tạo file Word…'); await G.DocxExport.key(ex, v); }
    } catch (err) { console.error(err); toast('Lỗi khi xuất: ' + err.message, 5000); }
  });
  function printHTML(html, title) {
    $('#printArea').innerHTML = html;
    const old = document.title; document.title = title;
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.title = old; document.body.classList.remove('printing'); }, 50);
  }
  function keyHTML(ex, detailV) {
    const h = ex.header;
    let s = `<article class="paper key"><h3 class="center">ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</h3><p class="center"><b>${esc(h.title)} – MÔN ${esc(String(ex.config.subjectName || 'Toán').toUpperCase())} LỚP ${esc(ex.config.grade)} – NĂM HỌC ${esc(h.year)}</b></p>`;
    for (const v of ex.versions) {
      const k = DT.answerKey(v);
      s += `<h4>Mã đề ${esc(v.code)}</h4>`;
      if (k.mcq.length) {
        s += `<p><b>Phần I</b> (mỗi câu đúng ${DT.fmtNum(ex.points.mcq)} điểm)</p>`;
        for (let i = 0; i < k.mcq.length; i += 12) { const c = k.mcq.slice(i, i + 12); s += `<table class="keytbl"><tr><th>Câu</th>${c.map(x => `<td>${x.no}</td>`).join('')}</tr><tr><th>Đáp án</th>${c.map(x => `<td><b>${x.ans}</b></td>`).join('')}</tr></table>`; }
      }
      if (k.tf.length) s += `<p><b>Phần II</b> <i>(mỗi câu tối đa ${DT.fmtNum(ex.points.tf)} điểm: đúng 1 ý được 10%, 2 ý 25%, 3 ý 50%, 4 ý 100% số điểm)</i></p><table class="keytbl"><tr><th>Câu</th><th>Đáp án</th></tr>${k.tf.map(x => `<tr><td>${x.no}</td><td>${esc(x.ans)}</td></tr>`).join('')}</table>`;
      if (k.short.length) s += `<p><b>Phần III</b> (mỗi câu đúng ${DT.fmtNum(ex.points.short)} điểm)</p><table class="keytbl"><tr><th>Câu</th>${k.short.map(x => `<td>${x.no}</td>`).join('')}</tr><tr><th>Đáp án</th>${k.short.map(x => `<td><b>${esc(x.ans)}</b></td>`).join('')}</tr></table>`;
      if (k.essay.length) s += `<p><b>Tự luận:</b> ${k.essay.map(x => 'Câu ' + x.no + ': ' + tex(x.ans.replace(/[.;\s]+$/, ''))).join('; ')}</p>`;
    }
    s += `<h3 class="center" style="margin-top:24px">LỜI GIẢI CHI TIẾT – MÃ ĐỀ ${esc(detailV.code)}</h3>`;
    s += paperBodyWithSolutions(ex, detailV);
    return s + '</article>';
  }
  function paperBodyWithSolutions(ex, v) {
    let s = ''; const roman = ['I', 'II', 'III', 'IV']; let gi = 0;
    for (const t of DT.TYPE_ORDER) {
      const items = v.items.filter(i => i.q.type === t); if (!items.length) continue;
      s += `<h4>Phần ${roman[gi++]}. ${DT.TYPES[t].label}</h4>`;
      items.forEach((it, i) => s += questionHTML(ex, it, i + 1, { answers: true }));
    }
    return s;
  }

  // ================= TRÌNH SỬA CÂU HỎI =================
  let editorCb = null;
  // Môn khác Toán (chế độ trực tuyến): chương/bài do giáo viên tự đặt tên, chọn được "＋ mới…"
  const customSubject = () => !!(G.CLOUD && G.CLOUD.subject && G.CLOUD.subject !== 'toan');
  function fillChapterSelect(sel, grade, value) {
    const chs = DT.chaptersOf(grade, 'all');
    let h = chs.map(c => `<option value="${esc(c.id)}" ${c.id === value ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    if (customSubject()) {
      if (value && !chs.some(c => c.id === value)) h += `<option value="${esc(value)}" selected>${esc(value)}</option>`;
      h += '<option value="__new">＋ Chương mới…</option>';
    }
    sel.innerHTML = h;
    if (customSubject() && !chs.length && !value) sel.value = '__new';
    toggleNew(sel.form);
  }
  function fillTopicSelect(sel, chapterId, value) {
    const c = DT.chapterById(chapterId); const tps = c ? c.topics.slice() : [];
    if (value && !tps.includes(value)) tps.push(value);
    let h = tps.map(t => `<option ${t === value ? 'selected' : ''}>${esc(t)}</option>`).join('');
    if (customSubject()) h += '<option value="__new">＋ Bài/chủ đề mới…</option>';
    sel.innerHTML = h;
    if (customSubject() && !tps.length) sel.value = '__new';
    toggleNew(sel.form);
  }
  function toggleNew(f) {
    if (!f || !f.chapterNew) return;
    f.chapterNew.hidden = f.chapter.value !== '__new'; f.topicNew.hidden = f.topic.value !== '__new';
  }
  function typeFields(type, q) {
    if (type === 'mcq') return '<div class="tf-grid">' + [0, 1, 2, 3].map(i => `<label class="opt-edit"><input type="radio" name="correct" value="${i}" ${q.answer === i ? 'checked' : ''} title="Đáp án đúng"> ${DT.LETTERS[i]}. <input name="opt${i}" value="${esc((q.options || [])[i] || '')}" required></label>`).join('') + '<small class="muted">Chọn nút tròn ở phương án đúng.</small></div>';
    if (type === 'tf') return '<div class="tf-grid">' + [0, 1, 2, 3].map(i => `<label class="opt-edit">${'abcd'[i]}) <input name="st${i}" value="${esc((q.statements || [])[i] || '')}" required> <span class="check inline"><input type="checkbox" name="tf${i}" ${(q.answer || [])[i] ? 'checked' : ''}> Đúng</span></label>`).join('') + '</div>';
    if (type === 'short') return `<label>Đáp số (tối đa 4 ký tự, dùng dấu phẩy thập phân)<input name="answer" value="${esc(q.answer || '')}" maxlength="8" required></label>`;
    return `<label>Đáp số / ý chính<textarea name="answer" rows="2">${esc(q.answer || '')}</textarea></label>`;
  }
  function openEditor(q, scope, cb) {
    const f = $('#qForm'); q = DT.clone(q || {});
    const grade = String(q.grade || $('#cfgGrade').value);
    f.grade.value = grade;
    fillChapterSelect(f.chapter, grade, q.chapter);
    fillTopicSelect(f.topic, f.chapter.value, q.topic);
    f.type.innerHTML = DT.TYPE_ORDER.map(t => `<option value="${t}" ${t === (q.type || 'mcq') ? 'selected' : ''}>${DT.TYPES[t].label}</option>`).join('');
    f.pool.value = q.id ? DT.poolOf(q) : (q.pool || 'exam');
    f.level.value = q.level || 'NB'; f.difficulty.value = q.difficulty || 1; f.source.value = q.source || 'Tự biên soạn';
    f.content.value = q.content || ''; f.explanation.value = q.explanation || '';
    setEditorFigure(q.figure || null);
    $('#qTypeFields').innerHTML = typeFields(f.type.value, q);
    $('#qModalTitle').textContent = scope === 'exam' ? 'Sửa câu hỏi trong đề' : (q.id ? 'Sửa câu hỏi trong ngân hàng' : 'Thêm câu hỏi mới');
    $('#qScopeNote').textContent = scope === 'exam' ? 'Chỉ thay đổi trong đề này (mọi mã đề), không đổi ngân hàng.' : '';
    f.type.disabled = scope === 'exam';
    f.dataset.id = q.id || ''; editorCb = cb; live();
    $('#qModal').showModal();
  }

  // ----- Hình vẽ trong trình sửa -----
  let uploadedSrc = null, figError = null;
  const IMG_PH = '(ảnh tải lên)';
  function setEditorFigure(fig) {
    uploadedSrc = fig && fig.type === 'img' ? fig.src : null;
    const shown = fig ? (fig.type === 'img' ? Object.assign({}, fig, { src: IMG_PH }) : fig) : null;
    $('#qForm').figure.value = shown ? JSON.stringify(shown, null, 1) : '';
  }
  function readEditorFigure() {
    figError = null;
    const raw = $('#qForm').figure.value.trim(); if (!raw) return null;
    try {
      const fig = JSON.parse(raw);
      if (fig.type === 'img' && fig.src === IMG_PH) fig.src = uploadedSrc;
      G.Figures.render(fig); return fig;
    } catch (e) { figError = e.message; return null; }
  }
  const FIG_SAMPLES = {
    graph: { type: 'graph', fn: 'x^3-3*x+1', x: [-2.5, 2.5], y: [-2, 4], points: [[-1, 3], [1, -1]] },
    bbt: { type: 'bbt', x: ['-inf', '-1', '1', '+inf'], dy: ['', '+', '0', '-', '0', '+', ''], y: [['-inf', 'bottom'], ['3', 'top'], ['-1', 'bottom'], ['+inf', 'top']] },
    geo: { type: 'geo', points: { S: [2, 5], A: [0, 0], B: [1.4, -1], C: [4, 0], D: [2.6, 1] }, segs: ['SA', 'SB', 'SC', 'AB', 'BC'], dashed: ['SD', 'AD', 'DC'] }
  };
  $('#figSample').onchange = (e) => { if (e.target.value) { setEditorFigure(FIG_SAMPLES[e.target.value]); e.target.value = ''; live(); } };
  $('#figClear').onclick = () => { setEditorFigure(null); live(); };
  $('#figUpload').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = '';
    try {
      const src = await shrinkImage(file, 900);
      setEditorFigure({ type: 'img', src, width: 320 }); live();
      toast(`Đã chèn ảnh (${Math.round(src.length * 0.75 / 1024)} KB).`);
    } catch (err) { toast('Không đọc được ảnh: ' + err.message, 4000); }
  };
  function shrinkImage(file, maxW) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxW / img.naturalWidth); const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const png = c.toDataURL('image/png'), jpg = c.toDataURL('image/jpeg', 0.85);
        res(png.length < jpg.length * 1.3 ? png : jpg);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('định dạng không hỗ trợ')); };
      img.src = url;
    });
  }
  function readEditor() {
    const f = $('#qForm'); const type = f.type.value;
    const chap = f.chapter.value === '__new' ? f.chapterNew.value.trim() : f.chapter.value, top = f.topic.value === '__new' ? f.topicNew.value.trim() : f.topic.value;
    const q = { id: f.dataset.id || undefined, grade: +f.grade.value, chapter: chap, topic: top, type, level: f.level.value,
      difficulty: +f.difficulty.value || 1, source: f.source.value, content: f.content.value, explanation: f.explanation.value, pool: f.pool.value };
    const fig = readEditorFigure(); if (fig) q.figure = fig;
    if (type === 'mcq') { q.options = [0, 1, 2, 3].map(i => f['opt' + i].value); const c = f.querySelector('input[name=correct]:checked'); q.answer = c ? +c.value : 0; }
    else if (type === 'tf') { q.statements = [0, 1, 2, 3].map(i => f['st' + i].value); q.answer = [0, 1, 2, 3].map(i => f['tf' + i].checked); }
    else q.answer = f.answer.value;
    return q;
  }
  function live() {
    const q = readEditor();
    let h = tex(q.content);
    if (figError) h += `<div class="fig tex-err">${esc(figError)}</div>`; else if (q.figure) h += G.Figures.html(q.figure);
    if (q.type === 'mcq') h += '<div class="opts cols2">' + q.options.map((o, i) => `<div class="opt ${i === q.answer ? 'correct' : ''}"><b>${DT.LETTERS[i]}.</b> ${tex(o)}</div>`).join('') + '</div>';
    if (q.type === 'tf') h += q.statements.map((s, i) => `<div class="stmt"><b>${'abcd'[i]})</b> ${tex(s)} <span class="tfans ${q.answer[i] ? 't' : 'f'}">${q.answer[i] ? 'Đúng' : 'Sai'}</span></div>`).join('');
    if (q.type === 'short' || q.type === 'essay') h += `<div><b>Đáp số:</b> ${tex(q.answer)}</div>`;
    if (q.explanation) h += `<div class="solution">${tex(q.explanation)}</div>`;
    $('#qLive').innerHTML = h;
  }
  $('#qForm').addEventListener('input', live);
  $('#qForm').grade.onchange = (e) => { fillChapterSelect(e.target.form.chapter, e.target.value); fillTopicSelect(e.target.form.topic, e.target.form.chapter.value); };
  $('#qForm').chapter.onchange = (e) => fillTopicSelect(e.target.form.topic, e.target.value);
  $('#qForm').topic.onchange = (e) => toggleNew(e.target.form);
  $('#qForm').type.onchange = (e) => { $('#qTypeFields').innerHTML = typeFields(e.target.value, {}); live(); };
  // Lưu ngay khi bấm nút "Lưu" (không phụ thuộc sự kiện đóng hộp thoại); lỗi thì giữ hộp thoại mở để sửa
  $('#qForm').addEventListener('submit', (e) => {
    if (!e.submitter || e.submitter.value !== 'ok' || !editorCb) return;
    const q = readEditor(); const err = figError ? 'hình vẽ: ' + figError : DT.validateQuestion(q);
    if (err) { e.preventDefault(); toast('Chưa lưu: ' + err, 4000); return; }
    try { editorCb(q); editorCb = null; } catch (er) { e.preventDefault(); toast('Không lưu được: ' + er.message, 5000); }
  });

  // ================= NGÂN HÀNG =================
  function bankCard(q, actions, note) {
    let body = '';
    if (q.type === 'mcq') body = '<div class="opts cols2">' + q.options.map((o, i) => `<div class="opt ${i === q.answer ? 'correct' : ''}"><b>${DT.LETTERS[i]}.</b> ${tex(o)}</div>`).join('') + '</div>';
    if (q.type === 'tf') body = q.statements.map((s, i) => `<div class="stmt"><b>${'abcd'[i]})</b> ${tex(s)} <span class="tfans ${q.answer[i] ? 't' : 'f'}">${q.answer[i] ? 'Đ' : 'S'}</span></div>`).join('');
    if (q.type === 'short' || q.type === 'essay') body = `<div><b>Đáp số:</b> ${tex(q.answer)}</div>`;
    return `<div class="card">
      <div class="card-head"><span class="lv lv-${q.level}">${DT.LEVELS[q.level]}</span><span class="tag">${DT.TYPES[q.type].label}</span><span class="tag">Lớp ${q.grade} · ${esc(shortCh(q.chapter))}</span><span class="tag">${esc(q.topic || '')}</span><span class="tag">Độ khó ${q.difficulty || '-'}</span><span class="tag pool-${DT.poolOf(q)}">${DT.POOLS[DT.poolOf(q)]}</span><span class="tag muted">${esc(q.source || '')}${DT.Bank.isModified(q.id) ? ' · đã sửa' : ''}</span>${note ? `<span class="tag warn">${esc(note)}</span>` : ''}<span class="spacer"></span>${actions}</div>
      <div class="qtext">${tex(q.content)}</div>${q.figure ? G.Figures.html(q.figure) : ''}${body}
      <details><summary>Lời giải</summary><div class="solution">${tex(q.explanation || '')}</div></details></div>`;
  }
  function renderBank() {
    const g = $('#fGrade').value;
    const chSel = $('#fChapter'); const curCh = chSel.value;
    chSel.innerHTML = '<option value="">Mọi chương</option>' + (g ? DT.chaptersOf(g, 'all') : []).map(c => `<option value="${c.id}" ${c.id === curCh ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    const ch = chSel.value, ty = $('#fType').value, lv = $('#fLevel').value, s = $('#fSearch').value.trim().toLowerCase(), pl = $('#fPool').value;
    const all = DT.Bank.all();
    const list = all.filter(q => (!pl || DT.poolOf(q) === pl) && (!g || String(q.grade) === g) && (!ch || q.chapter === ch) && (!ty || q.type === ty) && (!lv || q.level === lv) &&
      (!s || (q.content + ' ' + (q.topic || '')).toLowerCase().includes(s)));
    const by = (k) => list.reduce((m, q) => (m[q[k]] = (m[q[k]] || 0) + 1, m), {});
    const bt = by('type'), bl = by('level');
    const nEx = all.filter(q => DT.poolOf(q) === 'exam').length;
    $('#bankStats').innerHTML = `Tổng: <b>${all.length}</b> câu (kho đề kiểm tra <b>${nEx}</b>, kho luyện tập <b>${all.length - nEx}</b>) · Đang lọc: <b>${list.length}</b> câu — ` +
      DT.TYPE_ORDER.map(t => `${DT.TYPES[t].short}: ${bt[t] || 0}`).join(' · ') + ' | ' + DT.LEVEL_ORDER.map(l => `${l}: ${bl[l] || 0}`).join(' · ');
    const shown = list.slice(0, 150);
    $('#bankList').innerHTML = shown.map(q => bankCard(q, `<button class="btn sm" data-move="${esc(q.id)}" title="Chuyển sang kho kia">⇆ ${DT.poolOf(q) === 'exam' ? 'Sang luyện tập' : 'Sang kho đề'}</button><button class="btn sm" data-edit="${esc(q.id)}">Sửa</button><button class="btn sm danger" data-del="${esc(q.id)}">Xóa</button>`)).join('') +
      (list.length > shown.length ? `<p class="muted">Hiển thị 150/${list.length} câu – hãy lọc thêm.</p>` : '') + (list.length ? '' : '<p class="muted">Không có câu hỏi phù hợp.</p>');
  }
  $('#fType').innerHTML = '<option value="">Mọi dạng</option>' + DT.TYPE_ORDER.map(t => `<option value="${t}">${DT.TYPES[t].label}</option>`).join('');
  ['#fGrade', '#fChapter', '#fType', '#fLevel', '#fPool'].forEach(s => $(s).onchange = renderBank);
  $('#fSearch').oninput = () => { clearTimeout(renderBank._t); renderBank._t = setTimeout(renderBank, 200); };
  $('#bankList').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]'), mv = e.target.closest('[data-move]');
    if (mv) {
      const q = DT.clone(DT.Bank.get(mv.dataset.move)); q.pool = DT.poolOf(q) === 'exam' ? 'practice' : 'exam';
      try { DT.Bank.save(q); toast('Đã chuyển sang ' + DT.POOLS[q.pool].toLowerCase() + '.'); renderBank(); renderChapters(); } catch (err) { toast(err.message, 4000); }
      return;
    }
    if (ed) openEditor(DT.Bank.get(ed.dataset.edit), 'bank', (q) => { DT.Bank.save(q); renderBank(); renderChapters(); toast('Đã lưu câu hỏi.'); });
    if (del && confirm('Xóa câu hỏi này khỏi ngân hàng? (Câu mẫu có sẵn sẽ bị ẩn)')) { DT.Bank.remove(del.dataset.del); renderBank(); renderChapters(); }
  });
  $('#btnAddQ').onclick = () => openEditor({ grade: +($('#fGrade').value || $('#cfgGrade').value), chapter: $('#fChapter').value || undefined, type: $('#fType').value || 'mcq' }, 'bank',
    (q) => { DT.Bank.save(q); renderBank(); renderChapters(); toast('Đã thêm câu hỏi.'); });
  $('#btnExportBank').onclick = () => download('ngan-hang-cau-hoi.json', JSON.stringify(DT.Bank.exportAll(), null, 1));
  $('#importBank').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text()); const r = DT.Bank.importMany(Array.isArray(data) ? data : data.questions || []);
      toast(`Đã nhập ${r.n} câu.` + (r.errs.length ? ` ${r.errs.length} câu lỗi (xem Console).` : ''), 4000); if (r.errs.length) console.warn(r.errs);
      renderBank(); renderChapters();
    } catch (err) { toast('File JSON không hợp lệ: ' + err.message, 4000); }
    e.target.value = '';
  };
  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ================= ĐỀ ĐÃ LƯU =================
  function updateSavedCount() { const el = $('#savedCount'); if (el) el.textContent = DT.Exams.all().length; if (G.CLOUD && G.CLOUD.updateBadges) G.CLOUD.updateBadges(); }
  function renderSaved() {
    const list = DT.Exams.all();
    $('#savedList').innerHTML = list.length ? list.map(e => {
      const t = DT.totals(e);
      return `<div class="card saved"><div><b>${esc(e.name)}</b><br><span class="muted">Lớp ${e.config.grade} · ${e.versions.length} mã đề (${e.versions.map(v => v.code).join(', ')}) · ${e.versions[0].items.length} câu · ${DT.fmtNum(t.points)} điểm · lưu ${new Date(e.updatedAt).toLocaleString('vi-VN')}</span></div>
      <div class="row-actions"><button class="btn primary sm" data-open="${e.id}">Mở</button><button class="btn sm" data-dup="${e.id}">Nhân bản</button><button class="btn sm danger" data-rm="${e.id}">Xóa</button></div></div>`;
    }).join('') : '<p class="muted">Chưa có đề nào được lưu.</p>';
  }
  $('#savedList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.open) { state.exam = DT.clone(DT.Exams.get(b.dataset.open)); state.vIndex = 0; state.saved = true; $('.tab[data-view=create]').click(); renderExam(); }
    if (b.dataset.dup) { const c = DT.clone(DT.Exams.get(b.dataset.dup)); c.id = DT.uid(); c.name += ' (bản sao)'; DT.Exams.save(c); renderSaved(); updateSavedCount(); }
    if (b.dataset.rm && confirm('Xóa đề đã lưu này?')) { DT.Exams.remove(b.dataset.rm); renderSaved(); updateSavedCount(); }
  });
  $('#btnBackup').onclick = () => download('sao-luu-de-toan.json', JSON.stringify({ app: 'tao-de-toan', version: 1, exams: DT.Exams.all(), questions: DT.store.get('dtt_custom_questions', []), deleted: DT.store.get('dtt_deleted_ids', []) }, null, 1));
  $('#restoreFile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.exams)) throw new Error('thiếu danh sách đề');
      if (!confirm(`Khôi phục ${d.exams.length} đề và ${(d.questions || []).length} câu hỏi tự thêm? Dữ liệu hiện tại sẽ bị thay thế.`)) return;
      DT.Exams.replaceAll(d.exams); DT.store.set('dtt_custom_questions', d.questions || []); DT.store.set('dtt_deleted_ids', d.deleted || []);
      renderSaved(); updateSavedCount(); renderChapters(); toast('Đã khôi phục.');
    } catch (err) { toast('Không khôi phục được: ' + err.message, 4000); }
    e.target.value = '';
  };

  // ---------- Khởi động ----------
  if ((!G.QBANK || !G.QBANK.length) && !(G.APP_CONFIG && G.APP_CONFIG.SUPABASE_URL)) toast('Không tải được ngân hàng câu hỏi mẫu.', 5000);
  renderChapters(); applyPreset(); updateSavedCount();
  G.addEventListener('beforeunload', (e) => { if (state.exam && !state.saved) { e.preventDefault(); e.returnValue = ''; } });
  G.__app = { state, tex, toast, renderBank, renderSaved, refresh: () => { renderChapters(); applyPreset(); updateSavedCount(); if (state.exam) renderExam(); } };
  if (G.Grading) G.Grading.init();
  $('#btnExportPractice').onclick = () => { const n = G.Practice.exportHtml(); toast(`Đã xuất trang luyện tập (${n} câu, chỉ kho luyện tập).`); };
})(window);
