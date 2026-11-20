// Luyện tập online cho học sinh – CHỈ dùng kho luyện tập (không bao giờ lấy câu ở kho đề kiểm tra).
(function (G) {
  'use strict';
  const DT = G.DT;

  // Dựng sẵn HTML (công thức + hình) để trang luyện tập chạy độc lập, không cần dữ liệu kho đề.
  function buildData() {
    // Công thức giữ dạng $...$ (trình duyệt học sinh tự hiển thị bằng KaTeX); hình vẽ dựng sẵn thành SVG.
    const items = DT.Bank.practice().map(q => ({
      id: q.id, grade: q.grade, chapter: q.chapter, type: q.type, level: q.level,
      c: q.content, fig: q.figure ? G.Figures.html(q.figure) : '',
      opts: q.type === 'mcq' ? q.options : null,
      stmts: q.type === 'tf' ? q.statements : null,
      ans: q.answer, sol: q.explanation || ''
    }));
    const chapters = [];
    for (const g of [10, 11, 12]) for (const c of DT.chaptersOf(g, 'all')) if (items.some(i => i.chapter === c.id)) chapters.push({ id: c.id, name: c.name, grade: g });
    return { chapters, items };
  }

  // Hàm này được chép nguyên văn vào trang luyện tập xuất ra – không dùng biến bên ngoài.
  function practiceMain(root, DATA) {
    const LV = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng' }, TY = { mcq: 'Trắc nghiệm', tf: 'Đúng/Sai', short: 'Trả lời ngắn', essay: 'Tự luận' };
    const st = { grade: '', chapter: '', done: {} };
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tex = (t) => {
      t = String(t == null ? '' : t); let out = '', last = 0, m; const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
      while ((m = re.exec(t))) {
        out += esc(t.slice(last, m.index)).replace(/\n/g, '<br>');
        const src = (m[1] || m[2]).trim();
        try { out += window.katex ? window.katex.renderToString(src, { displayMode: !!m[1], throwOnError: false }) : esc('$' + src + '$'); } catch (e) { out += esc(src); }
        last = re.lastIndex;
      }
      return out + esc(t.slice(last)).replace(/\n/g, '<br>');
    };
    const norm = (s) => String(s || '').trim().replace(/\s/g, '').replace('.', ',');
    const same = (a, b) => { const x = parseFloat(norm(a).replace(',', '.')), y = parseFloat(norm(b).replace(',', '.')); return norm(a) === norm(b) || (!isNaN(x) && !isNaN(y) && Math.abs(x - y) < 1e-9); };
    function render() {
      const grades = [...new Set(DATA.chapters.map(c => c.grade))];
      if (!st.grade) st.grade = String(grades[0]);
      const chs = DATA.chapters.filter(c => String(c.grade) === st.grade);
      if (!chs.some(c => c.id === st.chapter)) st.chapter = chs[0] ? chs[0].id : '';
      const list = DATA.items.filter(i => i.chapter === st.chapter);
      const done = list.filter(i => st.done[i.id]); const right = done.filter(i => st.done[i.id] === 'ok').length;
      root.innerHTML = `<div class="pr-head">
        <select data-k="grade">${grades.map(g => `<option ${String(g) === st.grade ? 'selected' : ''} value="${g}">Lớp ${g}</option>`).join('')}</select>
        <select data-k="chapter">${chs.map(c => `<option ${c.id === st.chapter ? 'selected' : ''} value="${c.id}">${c.name}</option>`).join('')}</select>
        <span class="pr-score">Đã làm ${done.length}/${list.length} · Đúng ${right}</span></div>` +
        list.map((it, n) => {
          let body = '';
          if (it.type === 'mcq') body = '<div class="pr-opts">' + it.opts.map((o, k) => `<label><input type="radio" name="${it.id}" value="${k}"> <b>${'ABCD'[k]}.</b> ${tex(o)}</label>`).join('') + '</div>';
          if (it.type === 'tf') body = '<div class="pr-stmts">' + it.stmts.map((s, k) => `<div><b>${'abcd'[k]})</b> ${tex(s)} <span class="pr-tf"><label><input type="radio" name="${it.id}-${k}" value="1">Đ</label><label><input type="radio" name="${it.id}-${k}" value="0">S</label></span></div>`).join('') + '</div>';
          if (it.type === 'short') body = `<div><input class="pr-in" name="${it.id}" placeholder="Nhập đáp số (dấu phẩy thập phân)"></div>`;
          const res = st.done[it.id];
          return `<div class="pr-q ${res || ''}" data-id="${it.id}"><div class="pr-meta">${TY[it.type]} · ${LV[it.level]}</div><div><b>Câu ${n + 1}.</b> ${tex(it.c)}${it.fig}</div>${body}
            <div class="pr-act"><button data-check="${it.id}">${it.type === 'essay' ? 'Xem lời giải' : 'Kiểm tra'}</button><span class="pr-res"></span></div><div class="pr-sol" hidden>${tex(it.sol)}</div></div>`;
        }).join('') + (list.length ? '' : '<p>Chưa có câu luyện tập cho chương này.</p>');
      root.querySelectorAll('select[data-k]').forEach(s => s.onchange = () => { st[s.dataset.k] = s.value; render(); });
      root.querySelectorAll('[data-check]').forEach(b => b.onclick = () => check(b.dataset.check));
    }
    function check(id) {
      const it = DATA.items.find(i => i.id === id); const box = root.querySelector(`.pr-q[data-id="${id}"]`);
      let ok = null, msg = '';
      if (it.type === 'mcq') { const c = box.querySelector(`input[name="${id}"]:checked`); if (!c) return alert('Hãy chọn một phương án.'); ok = +c.value === it.ans; msg = ok ? 'Đúng!' : 'Chưa đúng. Đáp án: ' + 'ABCD'[it.ans]; }
      else if (it.type === 'tf') {
        let k = 0; const marks = it.ans.map((a, s) => { const c = box.querySelector(`input[name="${id}-${s}"]:checked`); const r = c && (c.value === '1') === a; if (r) k++; return c ? r : null; });
        if (marks.some(m => m === null)) return alert('Hãy chọn Đ hoặc S cho cả 4 ý.');
        ok = k === 4; msg = `Đúng ${k}/4 ý. Đáp án: ` + it.ans.map((a, s) => 'abcd'[s] + ') ' + (a ? 'Đ' : 'S')).join('  ');
      } else if (it.type === 'short') { const v = box.querySelector('input.pr-in').value; if (!v.trim()) return alert('Hãy nhập đáp số.'); ok = same(v, it.ans); msg = ok ? 'Đúng!' : 'Chưa đúng. Đáp số: ' + it.ans; }
      else { msg = 'Đáp số: ' + it.ans; }
      if (ok !== null) st.done[id] = ok ? 'ok' : 'no'; else st.done[id] = 'seen';
      box.classList.remove('ok', 'no'); if (ok !== null) box.classList.add(ok ? 'ok' : 'no');
      box.querySelector('.pr-res').textContent = msg; box.querySelector('.pr-sol').hidden = false;
      const list = DATA.items.filter(i => i.chapter === st.chapter); const done = list.filter(i => st.done[i.id]);
      root.querySelector('.pr-score').textContent = `Đã làm ${done.length}/${list.length} · Đúng ${done.filter(i => st.done[i.id] === 'ok').length}`;
    }
    render();
  }

  const PR_CSS = `.pr-head{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.pr-head select{padding:6px;border-radius:7px;border:1px solid #ccd}
.pr-score{margin-left:auto;font-weight:600;color:#1f5fbf}.pr-q{border:1px solid #dfe3ea;border-radius:10px;padding:10px 14px;margin:10px 0;background:#fff;font-family:'Times New Roman',serif;font-size:16.5px}
.pr-q.ok{border-color:#18794e;background:#f3fbf6}.pr-q.no{border-color:#c0392b;background:#fdf4f3}.pr-meta{font:12px system-ui,sans-serif;color:#6b7385}
.pr-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:4px 12px;margin:6px 0 0 14px}.pr-opts label{cursor:pointer}
.pr-stmts{margin:6px 0 0 14px}.pr-tf{margin-left:8px;font:13px system-ui;white-space:nowrap}.pr-tf label{margin-right:6px}
.pr-in{padding:6px 8px;border:1px solid #ccd;border-radius:7px;margin:6px 0 0 14px}.pr-act{margin-top:8px;font:14px system-ui,sans-serif;display:flex;gap:10px;align-items:center}
.pr-act button{background:#1f5fbf;color:#fff;border:0;border-radius:7px;padding:6px 12px;cursor:pointer}.pr-sol{margin-top:6px;padding:6px 10px;border-left:3px solid #9ed3b4;background:#f5fbf7}
.pr-q label{display:inline-flex;align-items:baseline;gap:4px;margin:0;font-size:inherit;color:inherit}.pr-tf label{display:inline-flex;margin-right:6px;font-size:13px}.pr-stmts>div{margin:2px 0}.fig{margin:6px auto;text-align:center}.fig svg,.fig img{max-width:100%;height:auto}`;

  function exportHtml() {
    const data = buildData();
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Luyện tập Toán THPT</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js"></script>
<style>body{margin:0;background:#f3f5f8;font:15px system-ui,sans-serif;color:#1d2433}header{background:#13294b;color:#fff;padding:12px 16px;font-size:17px}main{max-width:860px;margin:0 auto;padding:12px}${PR_CSS}</style></head>
<body><header>∑ <b>Luyện tập Toán</b> – Kết nối tri thức</header><main id="root"></main>
<script>var DATA=${JSON.stringify(data).replace(/</g, '\\u003c')};
${practiceMain.toString()}
practiceMain(document.getElementById('root'), DATA);</script></body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = 'luyen-tap-toan.html'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return data.items.length;
  }

  function mount(root) {
    if (!document.getElementById('pr-css')) { const s = document.createElement('style'); s.id = 'pr-css'; s.textContent = PR_CSS; document.head.appendChild(s); }
    practiceMain(root, buildData());
  }
  G.Practice = { mount, exportHtml, buildData };
})(window);
