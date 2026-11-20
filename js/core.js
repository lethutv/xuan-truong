// Logic lõi: ngân hàng, lưu trữ, sinh đề, đáp án. Không phụ thuộc DOM.
(function (G) {
  'use strict';

  const TYPES = {
    mcq:   { label: 'Trắc nghiệm 4 lựa chọn', part: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn', short: 'TN' },
    tf:    { label: 'Đúng/Sai', part: 'PHẦN II. Câu trắc nghiệm đúng sai', short: 'Đ/S' },
    short: { label: 'Trả lời ngắn', part: 'PHẦN III. Câu trắc nghiệm trả lời ngắn', short: 'TLN' },
    essay: { label: 'Tự luận', part: 'PHẦN IV. Tự luận', short: 'TL' }
  };
  const TYPE_ORDER = ['mcq', 'tf', 'short', 'essay'];
  const LEVELS = { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng' };
  const LEVEL_ORDER = ['NB', 'TH', 'VD'];
  const LETTERS = ['A', 'B', 'C', 'D'];

  const z = () => ({ NB: 0, TH: 0, VD: 0 });
  const PRESETS = {
    '15p': { time: 15, title: 'BÀI KIỂM TRA 15 PHÚT', matrix: { mcq: { NB: 4, TH: 4, VD: 2 }, tf: z(), short: z(), essay: z() }, points: { mcq: 1, tf: 1, short: 0.5, essay: 1 } },
    gk:    { time: 90, title: 'ĐỀ KIỂM TRA GIỮA KỲ', matrix: { mcq: { NB: 6, TH: 4, VD: 2 }, tf: { NB: 0, TH: 2, VD: 0 }, short: { NB: 0, TH: 2, VD: 2 }, essay: { NB: 0, TH: 1, VD: 2 } }, points: { mcq: 0.25, tf: 1, short: 0.5, essay: 1 } },
    ck:    { time: 90, title: 'ĐỀ KIỂM TRA CUỐI KỲ', matrix: { mcq: { NB: 6, TH: 4, VD: 2 }, tf: { NB: 0, TH: 3, VD: 1 }, short: { NB: 0, TH: 3, VD: 3 }, essay: z() }, points: { mcq: 0.25, tf: 1, short: 0.5, essay: 1 } },
    custom:{ time: 45, title: 'ĐỀ KIỂM TRA', matrix: { mcq: { NB: 4, TH: 3, VD: 1 }, tf: { NB: 0, TH: 1, VD: 0 }, short: { NB: 0, TH: 2, VD: 0 }, essay: { NB: 0, TH: 0, VD: 1 } }, points: { mcq: 0.25, tf: 1, short: 0.5, essay: 1.5 } }
  };

  // ---------- Tiện ích ----------
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmtCode = (n) => String(n).padStart(4, '0'); // mã đề 4 chữ số theo phiếu 2025
  const fmtNum = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');

  // ---------- Lưu trữ ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  const K_CUSTOM = 'dtt_custom_questions', K_DELETED = 'dtt_deleted_ids', K_EXAMS = 'dtt_exams';

  // ---------- Chương trình ----------
  function chaptersOf(grade, semester) {
    const g = G.CURRICULUM[grade]; if (!g) return [];
    if (semester === 'all') return [].concat(g[1] || [], g[2] || []);
    return g[semester] || [];
  }
  function chapterById(id) {
    for (const gr of Object.keys(G.CURRICULUM)) for (const s of [1, 2]) for (const c of G.CURRICULUM[gr][s] || []) if (c.id === id) return c;
    return null;
  }

  // ---------- Hai kho tách biệt ----------
  // 'exam'     : kho đề kiểm tra – chỉ dùng để sinh đề, KHÔNG đưa cho học sinh luyện tập.
  // 'practice' : kho luyện tập – cho học sinh làm online, KHÔNG bao giờ xuất hiện trong đề kiểm tra.
  // Mặc định: câu mẫu số 01–20 mỗi chương thuộc kho luyện tập, từ 21 trở đi thuộc kho đề; câu giáo viên tự thêm thuộc kho đề.
  const POOLS = { exam: 'Kho đề kiểm tra', practice: 'Kho luyện tập' };
  function poolOf(q) {
    if (q.pool === 'exam' || q.pool === 'practice') return q.pool;
    if (/^c-/.test(q.id || '')) return 'exam';
    const m = /-(\d+)$/.exec(q.id || ''); return m && +m[1] >= 21 ? 'exam' : 'practice';
  }

  // ---------- Ngân hàng ----------
  const Bank = {
    builtinIds: new Set((G.QBANK || []).map(q => q.id)),
    all() {
      const custom = store.get(K_CUSTOM, []);
      const deleted = new Set(store.get(K_DELETED, []));
      const map = new Map();
      for (const q of G.QBANK || []) map.set(q.id, q);
      for (const q of custom) map.set(q.id, q); // ghi đè câu có sẵn hoặc câu mới
      return [...map.values()].filter(q => !deleted.has(q.id));
    },
    get(id) { return this.all().find(q => q.id === id); },
    save(q) {
      const custom = store.get(K_CUSTOM, []);
      if (!q.id) q.id = 'c-' + q.grade + '-' + uid();
      const i = custom.findIndex(x => x.id === q.id);
      if (i >= 0) custom[i] = q; else custom.push(q);
      if (!store.set(K_CUSTOM, custom)) throw new Error('Bộ nhớ trình duyệt đầy – hãy dùng ảnh nhỏ hơn hoặc xóa bớt câu/đề.');
      return q;
    },
    remove(id) {
      const custom = store.get(K_CUSTOM, []).filter(x => x.id !== id);
      store.set(K_CUSTOM, custom);
      if (this.builtinIds.has(id)) { const d = store.get(K_DELETED, []); if (!d.includes(id)) d.push(id); store.set(K_DELETED, d); }
    },
    isModified(id) { return store.get(K_CUSTOM, []).some(x => x.id === id); },
    exam() { return this.all().filter(q => poolOf(q) === 'exam'); },
    practice() { return this.all().filter(q => poolOf(q) === 'practice'); },
    importMany(list) {
      let n = 0; const errs = [];
      list.forEach((q, i) => { const e = validateQuestion(q); if (e) errs.push('#' + (i + 1) + ': ' + e); else { this.save(q); n++; } });
      return { n, errs };
    },
    exportAll() { return this.all(); }
  };

  function validateQuestion(q) {
    if (!q || typeof q !== 'object') return 'không phải đối tượng';
    if (!TYPES[q.type]) return 'dạng câu không hợp lệ';
    if (!LEVELS[q.level]) return 'mức độ không hợp lệ';
    if (!q.content) return 'thiếu nội dung';
    if (!chapterById(q.chapter)) return 'mã chương không tồn tại: ' + q.chapter;
    if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length !== 4 || !(q.answer >= 0 && q.answer <= 3))) return 'câu trắc nghiệm cần 4 phương án và answer 0–3';
    if (q.type === 'tf' && (!Array.isArray(q.statements) || q.statements.length !== 4 || !Array.isArray(q.answer) || q.answer.length !== 4)) return 'câu đúng/sai cần 4 mệnh đề và 4 đáp án';
    if (q.figure) { try { G.Figures.render(q.figure); } catch (e) { return 'hình vẽ: ' + e.message; } }
    return null;
  }

  // ---------- Đề đã lưu ----------
  const Exams = {
    all() { return store.get(K_EXAMS, []); },
    get(id) { return this.all().find(e => e.id === id); },
    save(exam) {
      const list = this.all(); exam.updatedAt = new Date().toISOString();
      const i = list.findIndex(e => e.id === exam.id);
      if (i >= 0) list[i] = exam; else list.unshift(exam);
      return store.set(K_EXAMS, list);
    },
    remove(id) { store.set(K_EXAMS, this.all().filter(e => e.id !== id)); },
    usedIds(exceptId) {
      const s = new Set();
      for (const e of this.all()) if (e.id !== exceptId) for (const v of e.versions) for (const it of v.items) s.add(it.qid);
      return s;
    },
    replaceAll(list) { store.set(K_EXAMS, list); }
  };

  // ---------- Sinh đề ----------
  const FALLBACK = { NB: ['TH', 'VD'], TH: ['NB', 'VD'], VD: ['TH', 'NB'] };

  // Câu dùng chung dữ liệu (cùng bảng số liệu / cùng hình) -> tránh xuất hiện cùng lúc trong một đề.
  // Dùng trường `group` nếu có; nếu không, tự nhận theo dòng số liệu dài giống nhau hoặc hình giống nhau.
  const gkCache = new Map();
  function groupKey(q) {
    if (q.group) return 'g:' + q.group;
    if (gkCache.has(q.id)) return gkCache.get(q.id);
    let k = '';
    const lines = String(q.content || '').split(/\n/).filter(l => l.length >= 25 && /\d.*\d.*\d/.test(l));
    if (lines.length > 1 || (lines.length && /bảng|số liệu|mẫu/i.test(q.content))) k = 't:' + lines.sort((a, b) => b.length - a.length)[0];
    else if (q.figure && q.figure.type !== 'img') k = 'f:' + JSON.stringify(q.figure);
    gkCache.set(q.id, k); return k;
  }

  function pickSet(pool, matrix, ctx) {
    // ctx: {rand, usedSaved:Set, usedOther:Set, warnings:[] , label}
    const chosen = []; const chosenIds = new Set(); const chCount = {}; const groups = new Set();
    const score = (q) => (groups.has(groupKey(q)) ? 2000 : 0) + (ctx.usedSaved.has(q.id) ? 1000 : 0) + (ctx.usedOther.has(q.id) ? 500 : 0) + (chCount[q.chapter] || 0) * 10 + ctx.rand() * 5;
    for (const type of TYPE_ORDER) {
      for (const level of LEVEL_ORDER) {
        const need = (matrix[type] && matrix[type][level]) || 0;
        for (let k = 0; k < need; k++) {
          let lv = level, cands = pool.filter(q => q.type === type && q.level === lv && !chosenIds.has(q.id));
          if (!cands.length) {
            for (const alt of FALLBACK[level]) {
              cands = pool.filter(q => q.type === type && q.level === alt && !chosenIds.has(q.id));
              if (cands.length) { ctx.note(`${TYPES[type].label} – ${LEVELS[level]}: ngân hàng chưa đủ câu, đã lấy câu mức ${LEVELS[alt]} thay thế`); lv = alt; break; }
            }
          }
          if (!cands.length) { ctx.note(`${TYPES[type].label} – ${LEVELS[level]}: không đủ câu trong ngân hàng, đề bị thiếu`, need - k); break; }
          cands.sort((a, b) => score(a) - score(b));
          const q = cands[0];
          if (ctx.usedOther.has(q.id)) ctx.reuseCount = (ctx.reuseCount || 0) + 1;
          chosen.push(q); chosenIds.add(q.id); chCount[q.chapter] = (chCount[q.chapter] || 0) + 1; const gk = groupKey(q); if (gk) groups.add(gk);
        }
      }
    }
    return chosen;
  }

  function makeItem(q, rand, shuffleOpts) {
    const it = { qid: q.id, q: clone(q) };
    if (q.type === 'mcq') it.perm = shuffleOpts ? shuffle([0, 1, 2, 3], rand) : [0, 1, 2, 3];
    return it;
  }

  function orderItems(items, rand, doShuffle) {
    const out = [];
    for (const t of TYPE_ORDER) {
      let part = items.filter(i => i.q.type === t);
      part.sort((a, b) => LEVEL_ORDER.indexOf(a.q.level) - LEVEL_ORDER.indexOf(b.q.level));
      if (doShuffle) part = shuffle(part, rand);
      out.push(...part);
    }
    return out;
  }

  function generate(cfg) {
    // cfg: {grade, semester, chapters[], form, time, matrix, points, versions, startCode, mixMode, avoidUsed, shuffleOpts, header, seed}
    const seed = cfg.seed || (Date.now() & 0x7fffffff);
    const rand = rng(seed);
    const chapters = new Set(cfg.chapters);
    const pool = Bank.exam().filter(q => String(q.grade) === String(cfg.grade) && chapters.has(q.chapter));
    const usedSaved = cfg.avoidUsed ? Exams.usedIds() : new Set();
    const warnings = [];
    const versions = [];
    const nV = Math.max(1, Math.min(24, cfg.versions | 0));
    const codes = new Set();
    let code = parseInt(cfg.startCode, 10) || 101;
    const usedOther = new Set();
    let base = null; let reuse = 0; let picked = 0;
    const notes = new Map(); // gộp cảnh báo giống nhau giữa các mã đề

    for (let v = 0; v < nV; v++) {
      while (codes.has(code)) code++;
      codes.add(code);
      let qs;
      if (cfg.mixMode === 'diff' || !base) {
        const vcode = fmtCode(code);
        const ctx = { rand, usedSaved, usedOther, note: (msg, n = 1) => {
          const e = notes.get(msg) || { codes: new Set(), n: 0 }; e.codes.add(vcode); e.n += n; notes.set(msg, e); } };
        qs = pickSet(pool, cfg.matrix, ctx);
        reuse += ctx.reuseCount || 0; if (v > 0) picked += qs.length;
        qs.forEach(q => usedOther.add(q.id));
        if (!base) base = qs;
      } else qs = base;
      const items = orderItems(qs.map(q => makeItem(q, rand, cfg.shuffleOpts)), rand, v > 0);
      versions.push({ code: fmtCode(code), items });
      code++;
    }
    const codeList = (set) => { const a = [...set]; return a.length === 1 ? 'mã ' + a[0] : a.length === nV && nV > 2 ? `cả ${nV} mã đề` : a.length > 3 ? `${a.length} mã đề (${a[0]}–${a[a.length - 1]})` : 'mã ' + a.join(', '); };
    for (const [msg, e] of notes) {
      const perV = Math.round(e.n / e.codes.size);
      warnings.push(`${msg} (${perV} câu${nV > 1 && cfg.mixMode === 'diff' ? ', ở ' + codeList(e.codes) : ''}).`);
    }
    if (cfg.mixMode === 'diff' && reuse) {
      // ước lượng số mã đề khác câu hoàn toàn mà ngân hàng đáp ứng được
      let cap = Infinity;
      for (const t of TYPE_ORDER) {
        const need = LEVEL_ORDER.reduce((s, l) => s + ((cfg.matrix[t] || {})[l] || 0), 0);
        if (need) cap = Math.min(cap, Math.floor(pool.filter(q => q.type === t).length / need));
      }
      warnings.push(`Ngân hàng hiện chỉ đủ cho khoảng ${Math.max(1, cap)} mã đề khác câu hoàn toàn, nên ${Math.round(reuse / Math.max(1, picked) * 100)}% số câu ở các mã sau là câu dùng lại. Gợi ý: chọn “Cùng bộ câu, đảo thứ tự câu & phương án”, giảm số mã đề, hoặc bổ sung ngân hàng.`);
    }
    if (cfg.avoidUsed) {
      const again = new Set(); versions.forEach(v => v.items.forEach(i => usedSaved.has(i.qid) && again.add(i.qid)));
      if (again.size) warnings.push(`${again.size} câu đã từng xuất hiện trong đề đã lưu (ngân hàng chưa đủ câu mới).`);
    }
    return {
      id: uid(), createdAt: new Date().toISOString(), seed,
      config: clone(cfg), header: clone(cfg.header), points: clone(cfg.points),
      versions, warnings: [...new Set(warnings)]
    };
  }

  // Thay/sửa/xóa câu áp dụng cho mọi mã đề có câu đó
  function replaceQuestion(exam, oldId, newQ) {
    const rand = rng(Date.now() & 0x7fffffff);
    for (const v of exam.versions) v.items = v.items.map(it => it.qid === oldId ? makeItem(newQ, rand, exam.config.shuffleOpts) : it);
  }
  function updateQuestion(exam, qid, q) {
    for (const v of exam.versions) for (const it of v.items) if (it.qid === qid) {
      const oldAns = it.q.answer; it.q = clone(q); it.qid = q.id;
      if (q.type === 'mcq' && (!it.perm || it.perm.length !== 4)) it.perm = [0, 1, 2, 3];
      void oldAns;
    }
  }
  function removeQuestion(exam, qid) { for (const v of exam.versions) v.items = v.items.filter(it => it.qid !== qid); }

  // ---------- Đáp án ----------
  function mcqCorrectLetter(it) { return LETTERS[it.perm.indexOf(it.q.answer)]; }
  function mcqOptions(it) { return it.perm.map(i => it.q.options[i]); }
  function numbered(items) { // đánh số theo từng phần
    const cnt = {}; return items.map(it => { cnt[it.q.type] = (cnt[it.q.type] || 0) + 1; return { it, no: cnt[it.q.type] }; });
  }
  function answerKey(version) {
    const key = { mcq: [], tf: [], short: [], essay: [] };
    for (const { it, no } of numbered(version.items)) {
      const t = it.q.type;
      if (t === 'mcq') key.mcq.push({ no, ans: mcqCorrectLetter(it) });
      else if (t === 'tf') key.tf.push({ no, ans: it.q.answer.map((b, i) => 'abcd'[i] + ') ' + (b ? 'Đ' : 'S')).join('  ') });
      else key[t].push({ no, ans: String(it.q.answer || '') });
    }
    return key;
  }
  function totals(exam, version) {
    const v = version || exam.versions[0]; const c = { mcq: 0, tf: 0, short: 0, essay: 0 };
    v.items.forEach(i => c[i.q.type]++);
    let pts = 0; for (const t of TYPE_ORDER) pts += c[t] * (exam.points[t] || 0);
    return { counts: c, points: pts };
  }

  G.DT = { POOLS, poolOf, fmtCode, TYPES, TYPE_ORDER, LEVELS, LEVEL_ORDER, LETTERS, PRESETS, rng, shuffle, clone, uid, fmtNum, store,
    chaptersOf, chapterById, Bank, Exams, validateQuestion, generate, replaceQuestion, updateQuestion, removeQuestion,
    mcqCorrectLetter, mcqOptions, numbered, answerKey, totals };
})(window);
