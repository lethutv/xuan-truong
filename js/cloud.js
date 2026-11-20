// Chế độ trực tuyến (Supabase): đăng nhập theo vai trò, đồng bộ dữ liệu, quản trị lớp/học sinh, bài tập về nhà, xem điểm.
// Nếu js/config.js chưa có URL/khóa → không làm gì (app chạy chế độ ngoại tuyến như cũ).
(function (G) {
  'use strict';
  const CFG = G.APP_CONFIG || {};
  const ONLINE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && G.supabase);
  G.CLOUD = { online: ONLINE };
  if (!ONLINE) return;

  const DT = G.DT, GR = G.Grading;
  const sb = G.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  G.CLOUD.sb = sb;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const toast = (m, ms) => G.__app.toast(m, ms);
  const tex = (t) => G.__app.tex(t);
  const ROLE_NAME = { admin: 'Quản trị', teacher: 'Giáo viên', student: 'Học sinh', parent: 'Phụ huynh' };
  const emailOf = (u) => `${String(u).trim().toLowerCase()}@${CFG.LOGIN_DOMAIN || 'taikhoan.detoan.app'}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const S = { user: null, profile: null, questions: [], exams: [], students: [], classes: [], cohorts: [], results: [], invites: [], assignments: [], submissions: [], teachers: [] };
  G.CLOUD.state = S;
  const isStaff = () => S.profile && (S.profile.role === 'admin' || S.profile.role === 'teacher');

  // Ghi lên máy chủ, báo lỗi nếu có
  async function push(p, what) {
    const { error, data } = await p;
    if (error) { console.error(what, error); toast(`Lỗi lưu ${what}: ${error.message}`, 6000); throw error; }
    return data;
  }
  async function fetchAll(table, cols = '*', build) {
    let out = [], from = 0; const page = 1000;
    for (;;) {
      let q = sb.from(table).select(cols).range(from, from + page - 1); if (build) q = build(q);
      const { data, error } = await q; if (error) throw error;
      out = out.concat(data); if (data.length < page) break; from += page;
    }
    return out;
  }

  // ======================= ĐĂNG NHẬP =======================
  function loginOverlay() {
    const el = document.createElement('div'); el.id = 'authOverlay';
    el.innerHTML = `<div class="auth-box">
      <div class="auth-brand">∑ <b>Tạo đề Toán</b><span>${esc(CFG.SCHOOL_NAME || '')}</span></div>
      <div class="seg auth-tabs"><button class="active" data-t="login">Đăng nhập</button><button data-t="act">Kích hoạt tài khoản</button></div>
      <form id="fLogin" class="auth-form">
        <label>Tên đăng nhập<input name="u" autocomplete="username" required></label>
        <label>Mật khẩu<input name="p" type="password" autocomplete="current-password" required></label>
        <button class="btn primary block">Đăng nhập</button>
        <p class="muted small">Quên mật khẩu? Nhờ giáo viên chủ nhiệm hoặc quản trị đặt lại.</p>
      </form>
      <form id="fAct" class="auth-form" hidden>
        <label>Mã kích hoạt (do nhà trường cấp)<input name="code" required placeholder="VD: HS-7K2M9Q4T"></label>
        <div id="actInfo" class="small"></div>
        <div id="actMore" hidden>
          <label id="actNameL">Họ và tên<input name="name"></label>
          <label>Tên đăng nhập (chữ thường, số, dấu chấm)<input name="u" pattern="[a-z0-9._]{3,30}" autocomplete="username"></label>
          <label>Mật khẩu (tối thiểu 6 ký tự)<input name="p" type="password" minlength="6" autocomplete="new-password"></label>
          <label>Nhập lại mật khẩu<input name="p2" type="password" minlength="6" autocomplete="new-password"></label>
        </div>
        <button class="btn primary block" id="actBtn">Kiểm tra mã</button>
      </form>
      <div id="authMsg" class="small warn"></div>
    </div>`;
    document.body.appendChild(el);
    const msg = (m) => { $('#authMsg').textContent = m || ''; };
    $$('.auth-tabs button', el).forEach(b => b.onclick = () => {
      $$('.auth-tabs button', el).forEach(x => x.classList.toggle('active', x === b));
      $('#fLogin').hidden = b.dataset.t !== 'login'; $('#fAct').hidden = b.dataset.t !== 'act'; msg('');
    });
    $('#fLogin').onsubmit = async (e) => {
      e.preventDefault(); msg('Đang đăng nhập…');
      const f = e.target; const u = f.u.value.trim();
      const { error } = await sb.auth.signInWithPassword({ email: u.includes('@') ? u : emailOf(u), password: f.p.value });
      if (error) return msg(/invalid/i.test(error.message) ? 'Sai tên đăng nhập hoặc mật khẩu.' : error.message);
      msg(''); start();
    };
    let invite = null;
    $('#fAct').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; msg('');
      if (!invite) {
        const { data, error } = await sb.rpc('check_invite', { p_code: f.code.value });
        if (error || !data || !data.ok) return msg('Mã không hợp lệ, đã dùng hoặc đã hết hạn.');
        invite = data; f.code.readOnly = true;
        $('#actInfo').innerHTML = `Mã dành cho: <b>${ROLE_NAME[data.role]}</b>` + (data.student_name ? (data.role === 'parent' ? ` của học sinh <b>${esc(data.student_name)}</b>` : ` <b>${esc(data.student_name)}</b>`) : (data.full_name ? ` <b>${esc(data.full_name)}</b>` : ''));
        $('#actMore').hidden = false; $('#actBtn').textContent = 'Tạo tài khoản';
        $('#actNameL').hidden = data.role === 'student';
        f.name.value = data.full_name || ''; f.u.required = f.p.required = f.p2.required = true;
        return;
      }
      const u = f.u.value.trim().toLowerCase();
      if (!/^[a-z0-9._]{3,30}$/.test(u)) return msg('Tên đăng nhập 3–30 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới.');
      if (f.p.value !== f.p2.value) return msg('Hai mật khẩu không khớp.');
      const { data: free } = await sb.rpc('username_available', { p_username: u });
      if (free === false) return msg('Tên đăng nhập đã có người dùng, hãy chọn tên khác.');
      msg('Đang tạo tài khoản…');
      const { data, error } = await sb.auth.signUp({ email: emailOf(u), password: f.p.value, options: { data: { invite: f.code.value.trim().toUpperCase(), username: u, full_name: f.name.value.trim() } } });
      if (error) return msg(/database/i.test(error.message) ? 'Không tạo được tài khoản: mã đã dùng hoặc tên đăng nhập trùng.' : error.message);
      if (!data.session) {
        const r = await sb.auth.signInWithPassword({ email: emailOf(u), password: f.p.value });
        if (r.error) return msg('Đã tạo tài khoản nhưng chưa đăng nhập được. Hãy kiểm tra "Confirm email" đã tắt trong Supabase. (' + r.error.message + ')');
      }
      toast(`Đã tạo tài khoản "${u}". Hãy ghi nhớ tên đăng nhập và mật khẩu.`, 6000);
      start();
    };
  }

  async function start() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { document.body.classList.add('auth-needed'); if (!$('#authOverlay')) loginOverlay(); return; }
    S.user = session.user;
    const { data: prof, error } = await sb.from('profiles').select('*').eq('id', S.user.id).single();
    if (error || !prof) { toast('Tài khoản chưa có hồ sơ. Liên hệ quản trị.', 6000); await sb.auth.signOut(); return start(); }
    S.profile = prof;
    document.body.classList.add('loading-data');
    try { await loadAll(); } catch (e) { console.error(e); toast('Lỗi tải dữ liệu: ' + e.message, 8000); }
    document.body.classList.remove('loading-data', 'auth-needed');
    const ov = $('#authOverlay'); if (ov) ov.remove();
    setupUI();
  }

  // ======================= TẢI DỮ LIỆU =======================
  const qFromRow = (r) => Object.assign({}, r.data, { id: r.id, pool: r.pool, grade: r.grade, chapter: r.chapter, topic: r.topic, type: r.type, level: r.level });
  async function loadAll() {
    const role = S.profile.role;
    const [qs, classes, cohorts] = await Promise.all([
      fetchAll('questions', 'id,pool,grade,chapter,topic,type,level,data,deleted', q => q.eq('deleted', false)),
      fetchAll('classes'), fetchAll('cohorts')
    ]);
    S.questions = qs.map(qFromRow); S.classes = classes; S.cohorts = cohorts;
    S.students = await fetchAll('students');
    if (role === 'admin' || role === 'teacher') {
      const [exams, results, invites, asg, subs, profs, links] = await Promise.all([
        fetchAll('exams'), fetchAll('results'), fetchAll('invites'), fetchAll('assignments'), fetchAll('submissions'), fetchAll('profiles', 'id,role,username,full_name,subjects,created_at'), fetchAll('parent_links')]);
      S.parentLinks = links;
      S.exams = exams.map(e => Object.assign({}, e.data, { id: e.id, name: e.name, updatedAt: e.updated_at, ownerId: e.owner_id }));
      S.results = results; S.invites = invites; S.assignments = asg; S.submissions = subs; S.profiles = profs;
    } else {
      const [results, asg, subs] = await Promise.all([fetchAll('results'), fetchAll('assignments'), fetchAll('submissions')]);
      S.results = results; S.assignments = asg; S.submissions = subs;
    }
  }
  const classOf = (id) => S.classes.find(c => c.id === id);
  const cohortOf = (id) => S.cohorts.find(c => c.id === id);
  const studentRow = (id) => S.students.find(s => s.id === id);

  // ======================= THAY LỚP LƯU TRỮ CỦA APP =======================
  function installAdapters() {
    // Ngân hàng câu hỏi
    const qRow = (q) => ({ id: q.id, subject: 'toan', grade: +q.grade, chapter: q.chapter, topic: q.topic, type: q.type, level: q.level, pool: DT.poolOf(q), data: q, deleted: false, updated_at: new Date().toISOString() });
    DT.Bank.all = () => S.questions;
    DT.Bank.get = (id) => S.questions.find(q => q.id === id);
    DT.Bank.isModified = () => false;
    DT.Bank.save = (q) => {
      if (!q.id) q.id = 'c-' + q.grade + '-' + DT.uid();
      if (!q.pool) q.pool = 'exam';
      const i = S.questions.findIndex(x => x.id === q.id); if (i >= 0) S.questions[i] = q; else S.questions.push(q);
      push(sb.from('questions').upsert(qRow(q)), 'câu hỏi').catch(() => {});
      return q;
    };
    DT.Bank.remove = (id) => {
      S.questions = S.questions.filter(q => q.id !== id);
      push(sb.from('questions').update({ deleted: true, updated_at: new Date().toISOString() }).eq('id', id), 'câu hỏi').catch(() => {});
    };
    // Đề đã lưu
    const exRow = (e) => ({ id: e.id, name: e.name || '', subject: 'toan', data: e, updated_at: new Date().toISOString() });
    DT.Exams.all = () => S.exams.slice().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    DT.Exams.get = (id) => S.exams.find(e => e.id === id);
    DT.Exams.save = (exam) => {
      exam.updatedAt = new Date().toISOString();
      const i = S.exams.findIndex(e => e.id === exam.id); if (i >= 0) S.exams[i] = exam; else S.exams.unshift(exam);
      push(sb.from('exams').upsert(exRow(exam)), 'đề').catch(() => {});
      return true;
    };
    DT.Exams.remove = (id) => { S.exams = S.exams.filter(e => e.id !== id); S.results = S.results.filter(r => r.exam_id !== id); push(sb.from('exams').delete().eq('id', id), 'đề').catch(() => {}); };
    DT.Exams.replaceAll = (list) => list.forEach(e => DT.Exams.save(e));
    // Danh sách học sinh (dùng khi chấm)
    GR.Students.all = () => S.students.map(s => { const c = classOf(s.class_id) || {}; const co = cohortOf(s.cohort_id || c.cohort_id) || {}; return { id: s.id, name: s.full_name, sbd: s.sbd || '', lop: c.name || '', khoi: c.grade ? String(c.grade) : '', khoa: co.name || '' }; });
    GR.Students.save = () => toast('Quản lý học sinh ở tab “Lớp & học sinh”.');
    // Kết quả chấm
    const toLocal = (r) => ({ id: r.id, file: r.file, fill: r.fill || {}, pos: r.pos || {}, essay: r.essay, studentId: r.student_id, versionCode: r.version_code, createdAt: r.created_at, _row: r });
    GR.Results.all = (examId) => S.results.filter(r => r.exam_id === examId).map(toLocal);
    GR.Results.save = (examId, list) => {
      const exam = DT.Exams.get(examId); if (!exam) return;
      const old = S.results.filter(r => r.exam_id === examId);
      const keep = new Set(list.map(r => r.id));
      for (const o of old) if (!keep.has(o.id)) {
        S.results = S.results.filter(r => r.id !== o.id);
        push(sb.from('results').delete().eq('id', o.id), 'kết quả').catch(() => {});
        const paths = [`raw/${o.id}.jpg`]; if (o.image_path) paths.push(o.image_path);
        sb.storage.from('phieu').remove(paths);
      }
      for (const r of list) {
        const g = GR.grade(exam, r); const s = GR.studentOf(r, g);
        const row = { id: r.id, exam_id: examId, exam_name: exam.name || '', student_id: s ? s.id : null, sbd: g.d.sbd || null, version_code: r.versionCode || null,
          fill: r.fill, pos: r.pos, essay: r.essay == null || r.essay === '' ? null : +r.essay,
          p1: g.p1 ? g.p1.score : null, p2: g.p2 ? g.p2.score : null, p3: g.p3 ? g.p3.score : null, total: g.total, file: r.file || null,
          image_path: s ? `${s.id}/${r.id}.jpg` : null, updated_at: new Date().toISOString() };
        const prev = S.results.find(x => x.id === r.id);
        const sig = (x) => JSON.stringify([x.student_id, x.version_code, x.fill, x.essay, x.total]);
        if (prev && sig(prev) === sig(row)) continue;
        const oldPath = prev && prev.image_path;
        if (prev) Object.assign(prev, row); else S.results.push(Object.assign({ created_at: new Date().toISOString() }, row));
        push(sb.from('results').upsert(row), 'kết quả').then(() => scheduleAnnotated(examId, r.id, oldPath)).catch(() => {});
      }
    };
    // Ảnh phiếu: lưu cục bộ + tải lên Storage (ảnh gốc đã nắn ở thư mục raw/, chỉ GV xem)
    const idb = GR.IDB; const orig = { put: idb.put.bind(idb), get: idb.get.bind(idb), del: idb.del.bind(idb) };
    idb.put = async (k, blob) => { await orig.put(k, blob); await sb.storage.from('phieu').upload(`raw/${k}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' }); };
    idb.get = async (k) => {
      let b = await orig.get(k).catch(() => null); if (b) return b;
      const { data } = await sb.storage.from('phieu').download(`raw/${k}.jpg`); if (data) { await orig.put(k, data).catch(() => {}); return data; }
      return null;
    };
    idb.del = async (k) => { await orig.del(k); };
  }
  // Ảnh đã tô màu cho HS/PH xem: tải lên <student_id>/<result_id>.jpg (gom lại, tránh tải liên tục khi sửa)
  const pending = new Map();
  function scheduleAnnotated(examId, rid, oldPath) {
    clearTimeout(pending.get(rid));
    pending.set(rid, setTimeout(async () => {
      pending.delete(rid);
      const exam = DT.Exams.get(examId); const row = S.results.find(r => r.id === rid); if (!exam || !row) return;
      if (oldPath && oldPath !== row.image_path) await sb.storage.from('phieu').remove([oldPath]);
      if (!row.image_path) return;
      const local = GR.Results.all(examId).find(r => r.id === rid);
      const blob = await GR.annotatedBlob(exam, local);
      const { error } = await sb.storage.from('phieu').upload(row.image_path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) toast('Lỗi tải ảnh phiếu lên: ' + error.message, 5000);
    }, 1500));
  }

  // ======================= GIAO DIỆN THEO VAI TRÒ =======================
  const NEW_VIEWS = {
    classes: { label: 'Lớp & học sinh', roles: ['admin', 'teacher'], render: renderClasses },
    homework: { label: 'Bài tập về nhà', roles: ['admin', 'teacher', 'student', 'parent'], render: renderHomework },
    scores: { label: 'Điểm', roles: ['student', 'parent'], render: renderScores }
  };
  const TAB_ROLES = { create: ['admin', 'teacher'], bank: ['admin', 'teacher'], saved: ['admin', 'teacher'], grade: ['admin', 'teacher'], practice: ['admin', 'teacher', 'student'] };
  function setupUI() {
    installAdapters();
    const role = S.profile.role;
    document.body.dataset.role = role;
    // thêm tab & view mới
    const nav = $('.tabs'), main = $('main');
    for (const [k, v] of Object.entries(NEW_VIEWS)) {
      if (!$(`.tab[data-view="${k}"]`)) {
        const b = document.createElement('button'); b.className = 'tab'; b.dataset.view = k; b.textContent = v.label; nav.appendChild(b);
        const sec = document.createElement('section'); sec.id = 'view-' + k; sec.className = 'view'; sec.innerHTML = '<div class="panel" id="' + k + 'Root"></div>'; main.appendChild(sec);
      }
    }
    $('.tab[data-view="practice"]').textContent = role === 'student' ? 'Luyện tập' : 'Luyện tập (HS)';
    $('.tab[data-view="scores"]').textContent = role === 'parent' ? 'Điểm của con' : 'Điểm của tôi';
    $('.tab[data-view="homework"]').textContent = role === 'parent' ? 'Bài tập của con' : 'Bài tập về nhà';
    const allowed = (v) => (TAB_ROLES[v] || (NEW_VIEWS[v] && NEW_VIEWS[v].roles) || []).includes(role);
    $$('.tab').forEach(b => {
      b.hidden = !allowed(b.dataset.view);
      b.onclick = () => openView(b.dataset.view);
    });
    // thanh người dùng
    if (!$('#userBox')) {
      const u = document.createElement('div'); u.id = 'userBox';
      u.innerHTML = `<span>${esc(S.profile.full_name || S.profile.username)} · <b>${ROLE_NAME[role]}</b></span><button class="btn sm" id="btnPw">Đổi mật khẩu</button><button class="btn sm" id="btnLogout">Đăng xuất</button>`;
      $('.topbar').appendChild(u);
      $('#btnLogout').onclick = async () => { await sb.auth.signOut(); location.reload(); };
      $('#btnPw').onclick = changePassword;
    }
    // các nút chế độ ngoại tuyến không còn phù hợp
    const roster = $('#grRoster'); if (roster) { roster.textContent = '👥 Lớp & học sinh'; roster.onclick = () => openView('classes'); }
    const backup = $('#btnBackup'); if (backup) backup.parentElement.hidden = true;
    G.__app.refresh();
    const first = ['create', 'homework', 'scores'].find(allowed) || 'practice';
    openView(first);
  }
  function openView(v) {
    $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.view === v));
    $$('.view').forEach(x => x.classList.toggle('active', x.id === 'view-' + v));
    if (v === 'bank') G.__app.renderBank();
    if (v === 'saved') G.__app.renderSaved();
    if (v === 'grade') GR.show();
    if (v === 'practice') G.Practice.mount($('#practiceRoot'));
    if (NEW_VIEWS[v]) NEW_VIEWS[v].render($('#' + v + 'Root'));
  }

  function changePassword() {
    const d = dialog(`<h3>Đổi mật khẩu</h3><label>Mật khẩu mới<input name="p" type="password" minlength="6" required></label><label>Nhập lại<input name="p2" type="password" minlength="6" required></label>`, 'Đổi');
    d.onok = async (f) => {
      if (f.p.value !== f.p2.value) return toast('Hai mật khẩu không khớp.');
      const { error } = await sb.auth.updateUser({ password: f.p.value });
      toast(error ? 'Lỗi: ' + error.message : 'Đã đổi mật khẩu.');
    };
  }
  // hộp thoại đơn giản
  function dialog(inner, okText = 'OK') {
    const d = document.createElement('dialog'); d.className = 'cl-dialog';
    d.innerHTML = `<form method="dialog">${inner}<div class="modal-actions"><button value="cancel" class="btn" formnovalidate>Hủy</button><button value="ok" class="btn primary">${esc(okText)}</button></div></form>`;
    document.body.appendChild(d); d.showModal();
    const api = { onok: null };
    d.addEventListener('close', async () => { if (d.returnValue === 'ok' && api.onok) await api.onok(d.querySelector('form')); d.remove(); });
    return api;
  }

  // ======================= LỚP & HỌC SINH (GV/Admin) =======================
  const cst = { classId: '' };
  const randCode = (prefix) => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = new Uint32Array(8); crypto.getRandomValues(b); return prefix + '-' + [...b].map(x => A[x % A.length]).join(''); };
  function renderClasses(root) {
    const admin = S.profile.role === 'admin';
    if (!cst.classId && S.classes[0]) cst.classId = S.classes[0].id;
    const cls = S.classes.slice().sort((a, b) => (b.school_year || '').localeCompare(a.school_year || '') || a.name.localeCompare(b.name, 'vi'));
    const studs = S.students.filter(s => s.class_id === cst.classId).sort((a, b) => lastName(a.full_name).localeCompare(lastName(b.full_name), 'vi'));
    const inv = (sid, role) => S.invites.find(i => i.student_id === sid && i.role === role && !i.used_at);
    const accOf = (s) => s.user_id ? (S.profiles || []).find(p => p.id === s.user_id) : null;
    const parentsOf = (sid) => (S.parentLinks || []).filter(l => l.student_id === sid);
    root.innerHTML = `
      <div class="cl-grid">
        <div>
          <h2>Khóa học</h2>
          <table class="gr-table"><tr><th>Khóa</th><th>Kết thúc</th></tr>${S.cohorts.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.end_date)}${admin ? ` <button class="btn sm" data-editco="${c.id}">Sửa</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Chưa có khóa.</td></tr>'}</table>
          ${admin ? `<button class="btn sm" id="addCohort">＋ Thêm khóa</button>` : ''}
          <p class="muted small">Sau ngày kết thúc khóa, tài khoản học sinh & phụ huynh của khóa đó tự xóa (2 giờ sáng mỗi ngày).${admin ? ' <button class="btn sm danger" id="purgeNow">Xóa ngay tài khoản hết khóa</button>' : ''}</p>
          <h2>Lớp</h2>
          <div class="cl-classes">${cls.map(c => `<button class="cl-class ${c.id === cst.classId ? 'active' : ''}" data-cls="${c.id}"><b>${esc(c.name)}</b><small>Khối ${c.grade} · ${esc(c.school_year)} · ${S.students.filter(s => s.class_id === c.id).length} HS</small></button>`).join('') || '<p class="muted">Chưa có lớp.</p>'}</div>
          <button class="btn sm" id="addClass">＋ Thêm lớp</button>
          ${admin ? renderTeachersBlock() : ''}
        </div>
        <div>
          ${cst.classId ? `<h2>Học sinh lớp ${esc((classOf(cst.classId) || {}).name || '')}</h2>
          <div class="row-actions" style="margin-bottom:6px">
            <button class="btn sm primary" id="importStud">＋ Nhập danh sách</button>
            <button class="btn sm" id="mkCodes">🔑 Tạo mã kích hoạt cho HS & PH chưa có</button>
            <button class="btn sm" id="printCodes">🖨 In phiếu mã kích hoạt</button>
          </div>
          <div class="table-wrap"><table class="gr-table"><thead><tr><th>Họ tên</th><th>SBD</th><th>Tài khoản HS</th><th>Phụ huynh</th><th></th></tr></thead><tbody>
          ${studs.map(s => { const a = accOf(s); const ih = inv(s.id, 'student'), ip = inv(s.id, 'parent'); const np = parentsOf(s.id).length;
            return `<tr><td>${esc(s.full_name)}</td><td>${esc(s.sbd || '')}</td>
            <td>${a ? `✅ ${esc(a.username)} <button class="btn sm" data-reset="${a.id}" title="Đặt lại mật khẩu">🔒</button>` : ih ? `<code>${ih.code}</code>` : '<span class="muted">chưa có mã</span>'}</td>
            <td>${np ? `✅ ${np} TK` : ''} ${ip ? `<code>${ip.code}</code>` : ''}</td>
            <td><button class="btn sm" data-edst="${s.id}">Sửa</button> <button class="btn sm danger" data-rmst="${s.id}">✕</button></td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Lớp chưa có học sinh.</td></tr>'}
          </tbody></table></div>` : '<p class="muted">Hãy tạo lớp trước.</p>'}
        </div>
      </div>`;
    const R = () => renderClasses(root);
    $$('[data-cls]', root).forEach(b => b.onclick = () => { cst.classId = b.dataset.cls; R(); });
    if ($('#addCohort', root)) $('#addCohort', root).onclick = () => {
      const y = new Date().getFullYear();
      dialog(`<h3>Thêm khóa học</h3><label>Tên khóa<input name="n" required value="${y}-${y + 3}"></label><label>Ngày kết thúc (tài khoản tự xóa sau ngày này)<input name="d" type="date" required value="${y + 3}-06-30"></label>`, 'Thêm').onok = async (f) => {
        const d = await push(sb.from('cohorts').insert({ name: f.n.value.trim(), end_date: f.d.value }).select().single(), 'khóa'); S.cohorts.push(d); R();
      };
    };
    $$('[data-editco]', root).forEach(b => b.onclick = () => {
      const c = cohortOf(b.dataset.editco);
      dialog(`<h3>Khóa ${esc(c.name)}</h3><label>Ngày kết thúc<input name="d" type="date" required value="${c.end_date}"></label>`, 'Lưu').onok = async (f) => {
        await push(sb.from('cohorts').update({ end_date: f.d.value }).eq('id', c.id), 'khóa'); c.end_date = f.d.value; R();
      };
    });
    if ($('#purgeNow', root)) $('#purgeNow', root).onclick = async () => {
      if (!confirm('Xóa ngay tài khoản học sinh & phụ huynh của các khóa đã kết thúc?')) return;
      const { data, error } = await sb.rpc('admin_purge_now'); toast(error ? error.message : `Đã xóa ${data} tài khoản.`);
    };
    $('#addClass', root).onclick = () => {
      const y = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      dialog(`<h3>Thêm lớp</h3><label>Tên lớp<input name="n" required placeholder="10A1"></label><label>Khối<select name="g"><option>10</option><option>11</option><option>12</option></select></label>
        <label>Khóa<select name="co"><option value="">—</option>${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>Năm học<input name="y" value="${y}-${y + 1}"></label>`, 'Thêm').onok = async (f) => {
        const d = await push(sb.from('classes').insert({ name: f.n.value.trim(), grade: +f.g.value, cohort_id: f.co.value || null, school_year: f.y.value.trim() }).select().single(), 'lớp');
        S.classes.push(d); cst.classId = d.id; R();
      };
    };
    if (!cst.classId) return;
    $('#importStud', root).onclick = () => {
      dialog(`<h3>Nhập học sinh vào lớp ${esc(classOf(cst.classId).name)}</h3><p class="muted small">Dán từ Excel, mỗi dòng: <b>Họ và tên · SBD · Ngày sinh (dd/mm/yyyy, không bắt buộc)</b>. HS trùng SBD sẽ được cập nhật.</p><textarea name="t" rows="10" style="width:100%"></textarea>`, 'Nhập').onok = async (f) => {
        const c = classOf(cst.classId); const rows = f.t.value.split(/\r?\n/).map(l => l.split(/\t|;/).map(x => x.trim())).filter(r => r[0] && !/họ.*tên/i.test(r[0]));
        const recs = []; const errs = [];
        rows.forEach((r, i) => {
          const [name, sbd, dob] = r; if (sbd && !/^\d{1,8}$/.test(sbd)) { errs.push(`Dòng ${i + 1}: SBD "${sbd}" không hợp lệ`); return; }
          const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dob || '');
          const ex = sbd ? S.students.find(s => s.sbd === sbd) : null;
          recs.push(Object.assign(ex ? { id: ex.id } : {}, { full_name: name, sbd: sbd || null, class_id: c.id, cohort_id: c.cohort_id, dob: m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null }));
        });
        if (errs.length) return toast(errs.join('; '), 7000);
        const withId = recs.filter(r => r.id), noId = recs.filter(r => !r.id);
        if (withId.length) await push(sb.from('students').upsert(withId), 'học sinh');
        if (noId.length) await push(sb.from('students').insert(noId), 'học sinh');
        S.students = await fetchAll('students'); toast(`Đã nhập ${recs.length} học sinh.`); R();
      };
    };
    $('#mkCodes', root).onclick = async () => {
      const rows = [];
      for (const s of studs) {
        if (!s.user_id && !inv(s.id, 'student')) rows.push({ code: randCode('HS'), role: 'student', student_id: s.id, full_name: s.full_name });
        if (!inv(s.id, 'parent')) rows.push({ code: randCode('PH'), role: 'parent', student_id: s.id, full_name: 'Phụ huynh ' + s.full_name });
      }
      if (!rows.length) return toast('Mọi học sinh đã có mã.');
      const d = await push(sb.from('invites').insert(rows).select(), 'mã kích hoạt'); S.invites.push(...d); toast(`Đã tạo ${d.length} mã.`); R();
    };
    $('#printCodes', root).onclick = () => printCodes(studs, inv);
    $$('[data-rmst]', root).forEach(b => b.onclick = async () => {
      const s = studentRow(b.dataset.rmst); if (!confirm(`Xóa học sinh ${s.full_name}? (Điểm và bài nộp của em cũng bị xóa khỏi hồ sơ)`)) return;
      await push(sb.from('students').delete().eq('id', s.id), 'học sinh'); S.students = S.students.filter(x => x.id !== s.id); R();
    });
    $$('[data-edst]', root).forEach(b => b.onclick = () => {
      const s = studentRow(b.dataset.edst);
      dialog(`<h3>Sửa học sinh</h3><label>Họ và tên<input name="n" required value="${esc(s.full_name)}"></label><label>SBD<input name="sbd" pattern="\\d{1,8}" value="${esc(s.sbd || '')}"></label>
        <label>Lớp<select name="c">${S.classes.map(c => `<option value="${c.id}" ${c.id === s.class_id ? 'selected' : ''}>${esc(c.name)} (${esc(c.school_year)})</option>`).join('')}</select></label>`, 'Lưu').onok = async (f) => {
        const c = classOf(f.c.value); const patch = { full_name: f.n.value.trim(), sbd: f.sbd.value.trim() || null, class_id: c.id, cohort_id: c.cohort_id || s.cohort_id };
        await push(sb.from('students').update(patch).eq('id', s.id), 'học sinh'); Object.assign(s, patch); R();
      };
    });
    $$('[data-reset]', root).forEach(b => b.onclick = () => {
      dialog(`<h3>Đặt lại mật khẩu</h3><label>Mật khẩu mới (≥ 6 ký tự)<input name="p" required minlength="6" value="${Math.random().toString(36).slice(2, 10)}"></label><p class="muted small">Ghi lại và đưa cho học sinh/phụ huynh.</p>`, 'Đặt lại').onok = async (f) => {
        const { error } = await sb.rpc('reset_password', { p_user: b.dataset.reset, p_password: f.p.value }); toast(error ? error.message : 'Đã đặt lại mật khẩu.', 5000);
      };
    });
    if (admin) bindTeachers(root, R);
  }
  const lastName = (n) => { const p = String(n || '').trim().split(/\s+/); return p[p.length - 1] + ' ' + n; };
  function renderTeachersBlock() {
    const ts = (S.profiles || []).filter(p => p.role === 'teacher' || p.role === 'admin');
    const pend = S.invites.filter(i => (i.role === 'teacher' || i.role === 'admin') && !i.used_at);
    return `<h2>Giáo viên</h2><table class="gr-table">${ts.map(t => `<tr><td>${esc(t.full_name)}</td><td>${esc(t.username)}</td><td>${ROLE_NAME[t.role]}${t.subjects && t.subjects.length ? ' · ' + t.subjects.join(', ') : ''}</td><td>${t.id !== S.profile.id ? `<button class="btn sm" data-reset="${t.id}">🔒</button>` : ''}</td></tr>`).join('')}
      ${pend.map(i => `<tr class="muted"><td>${esc(i.full_name)}</td><td colspan="2">chờ kích hoạt: <code>${i.code}</code> (${ROLE_NAME[i.role]})</td><td><button class="btn sm danger" data-rminv="${i.code}">✕</button></td></tr>`).join('')}</table>
      <button class="btn sm" id="addTeacher">＋ Tạo mã cho giáo viên</button>`;
  }
  function bindTeachers(root, R) {
    $('#addTeacher', root).onclick = () => {
      dialog(`<h3>Mã kích hoạt cho giáo viên</h3><label>Họ và tên<input name="n" required></label><label>Môn dạy<select name="s"><option value="toan">Toán</option></select></label><label>Vai trò<select name="r"><option value="teacher">Giáo viên</option><option value="admin">Quản trị</option></select></label>`, 'Tạo mã').onok = async (f) => {
        const row = { code: randCode('GV'), role: f.r.value, full_name: f.n.value.trim(), subjects: [f.s.value] };
        const d = await push(sb.from('invites').insert(row).select().single(), 'mã'); S.invites.push(d); R();
        dialog(`<h3>Mã kích hoạt</h3><p>Gửi cho <b>${esc(d.full_name)}</b>:</p><p class="big-code">${d.code}</p><p class="muted small">Vào trang web → Kích hoạt tài khoản → nhập mã này.</p>`, 'Xong');
      };
    };
    $$('[data-rminv]', root).forEach(b => b.onclick = async () => { await push(sb.from('invites').delete().eq('code', b.dataset.rminv), 'mã'); S.invites = S.invites.filter(i => i.code !== b.dataset.rminv); R(); });
  }
  function printCodes(studs, inv) {
    const c = classOf(cst.classId); const url = location.origin + location.pathname;
    const cards = studs.map(s => { const a = inv(s.id, 'student'), p = inv(s.id, 'parent'); if (!a && !p) return '';
      return `<div class="code-card"><b>${esc(s.full_name)}</b> – Lớp ${esc(c.name)}<br>${a ? `Mã học sinh: <span class="big-code">${a.code}</span><br>` : '<i>Học sinh đã có tài khoản</i><br>'}${p ? `Mã phụ huynh: <span class="big-code">${p.code}</span><br>` : ''}<small>Truy cập ${esc(url)} → “Kích hoạt tài khoản”, nhập mã, tự đặt tên đăng nhập và mật khẩu. Mỗi mã chỉ dùng một lần.</small></div>`; }).join('');
    const pa = $('#printArea'); pa.innerHTML = `<div class="code-sheet">${cards || '<p>Không có mã nào. Hãy bấm “Tạo mã kích hoạt” trước.</p>'}</div>`;
    document.body.classList.add('printing'); setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 50);
  }

  // ======================= BÀI TẬP VỀ NHÀ =======================
  const hw = { open: null, child: '' };
  function renderHomework(root) {
    const role = S.profile.role;
    if (role === 'admin' || role === 'teacher') return hwTeacher(root);
    if (role === 'student') return hwStudent(root);
    return hwParent(root);
  }
  function hwTeacher(root) {
    const cls = S.classes.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    const st = hw.form || (hw.form = { classId: cls[0] ? cls[0].id : '', chapter: '', topic: '', picked: new Set() });
    const c = classOf(st.classId); const grade = c ? c.grade : 10;
    const chapters = DT.chaptersOf(grade, 'all'); if (!chapters.some(x => x.id === st.chapter)) st.chapter = chapters[0] ? chapters[0].id : '';
    const ch = DT.chapterById(st.chapter); if (ch && !ch.topics.includes(st.topic)) st.topic = '';
    const pool = S.questions.filter(q => DT.poolOf(q) === 'practice' && q.chapter === st.chapter && (!st.topic || q.topic === st.topic));
    const list = S.assignments.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    root.innerHTML = `<div class="cl-grid">
      <div><h2>Giao bài tập mới</h2>
        <label>Lớp<select id="hwClass">${cls.map(x => `<option value="${x.id}" ${x.id === st.classId ? 'selected' : ''}>${esc(x.name)} (${esc(x.school_year)})</option>`).join('')}</select></label>
        <label>Chương<select id="hwCh">${chapters.map(x => `<option value="${x.id}" ${x.id === st.chapter ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label>Bài học<select id="hwTopic"><option value="">— Cả chương —</option>${(ch ? ch.topics : []).map(t => `<option ${t === st.topic ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        <div class="muted small">Chọn câu (chỉ từ kho luyện tập) – ${pool.length} câu:</div>
        <div class="hw-pick">${pool.map(q => `<label class="check"><input type="checkbox" value="${q.id}" ${st.picked.has(q.id) ? 'checked' : ''}><span><span class="lv lv-${q.level}">${q.level}</span> ${tex(q.content.slice(0, 140))}</span></label>`).join('') || '<p class="muted">Không có câu luyện tập cho bài này.</p>'}</div>
        <label>Tiêu đề<input id="hwTitle" value="${esc(st.topic ? 'Bài tập: ' + st.topic : (ch ? 'Bài tập ' + ch.name.split('.')[0] : ''))}"></label>
        <label>Hạn nộp<input id="hwDue" type="datetime-local"></label>
        <button class="btn primary" id="hwCreate">Giao bài</button>
      </div>
      <div><h2>Bài đã giao</h2>${list.map(a => { const cl = classOf(a.class_id) || {}; const subs = S.submissions.filter(s => s.assignment_id === a.id); const nst = S.students.filter(s => s.class_id === a.class_id).length;
        const avg = subs.length ? subs.reduce((t, s) => t + (s.max_score ? s.score / s.max_score : 0), 0) / subs.length * 10 : 0;
        return `<div class="card hw-card ${hw.open === a.id ? 'open' : ''}"><div class="card-head"><b>${esc(a.title)}</b><span class="tag">${esc(cl.name || '')}</span><span class="tag">${a.question_ids.length} câu</span>${a.due_at ? `<span class="tag">Hạn ${fmtDate(a.due_at)}</span>` : ''}<span class="spacer"></span>
          <span>Đã nộp <b>${subs.length}/${nst}</b>${subs.length ? ` · TB ${DT.fmtNum(avg)}/10` : ''}</span><button class="btn sm" data-hwopen="${a.id}">${hw.open === a.id ? 'Ẩn' : 'Xem'}</button><button class="btn sm danger" data-hwrm="${a.id}">✕</button></div>
          ${hw.open === a.id ? `<table class="gr-table">${S.students.filter(s => s.class_id === a.class_id).sort((x, y) => lastName(x.full_name).localeCompare(lastName(y.full_name), 'vi')).map(s => { const sub = subs.find(x => x.student_id === s.id);
            return `<tr><td>${esc(s.full_name)}</td><td>${sub ? `${DT.fmtNum(sub.score)}/${sub.max_score} câu · ${fmtDate(sub.submitted_at)}` : '<span class="muted">chưa nộp</span>'}</td></tr>`; }).join('')}</table>` : ''}</div>`; }).join('') || '<p class="muted">Chưa giao bài nào.</p>'}</div></div>`;
    const R = () => hwTeacher(root);
    $('#hwClass', root).onchange = (e) => { st.classId = e.target.value; st.picked.clear(); R(); };
    $('#hwCh', root).onchange = (e) => { st.chapter = e.target.value; st.topic = ''; st.picked.clear(); R(); };
    $('#hwTopic', root).onchange = (e) => { st.topic = e.target.value; st.picked.clear(); R(); };
    $$('.hw-pick input', root).forEach(i => i.onchange = () => { i.checked ? st.picked.add(i.value) : st.picked.delete(i.value); });
    $('#hwCreate', root).onclick = async () => {
      if (!st.classId) return toast('Hãy tạo lớp trước (tab Lớp & học sinh).');
      if (!st.picked.size) return toast('Hãy chọn ít nhất một câu.');
      const due = $('#hwDue', root).value;
      const row = { class_id: st.classId, grade, chapter: st.chapter, topic: st.topic || null, title: $('#hwTitle', root).value.trim() || 'Bài tập về nhà', question_ids: [...st.picked], due_at: due ? new Date(due).toISOString() : null };
      const d = await push(sb.from('assignments').insert(row).select().single(), 'bài tập'); S.assignments.push(d); st.picked.clear(); toast('Đã giao bài.'); R();
    };
    $$('[data-hwopen]', root).forEach(b => b.onclick = () => { hw.open = hw.open === b.dataset.hwopen ? null : b.dataset.hwopen; R(); });
    $$('[data-hwrm]', root).forEach(b => b.onclick = async () => { if (!confirm('Xóa bài tập này (cả bài nộp)?')) return; await push(sb.from('assignments').delete().eq('id', b.dataset.hwrm), 'bài tập'); S.assignments = S.assignments.filter(a => a.id !== b.dataset.hwrm); R(); });
  }
  function hwStudent(root) {
    const me = S.students[0];
    if (hw.doing) return hwDo(root, hw.doing);
    const list = S.assignments.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    root.innerHTML = `<h2>Bài tập về nhà ${me ? '– ' + esc(me.full_name) : ''}</h2>` + (list.map(a => { const sub = S.submissions.find(s => s.assignment_id === a.id); const late = a.due_at && new Date(a.due_at) < new Date();
      return `<div class="card"><div class="card-head"><b>${esc(a.title)}</b><span class="tag">${a.question_ids.length} câu</span>${a.due_at ? `<span class="tag ${late ? 'warn' : ''}">Hạn ${fmtDate(a.due_at)}</span>` : ''}<span class="spacer"></span>
        ${sub ? `<span class="ok">Đã nộp: ${DT.fmtNum(sub.score)}/${sub.max_score}</span>` : late ? '<span class="warn">Quá hạn</span>' : '<span class="muted">Chưa làm</span>'}
        <button class="btn sm primary" data-hwdo="${a.id}">${sub ? 'Xem / làm lại' : 'Làm bài'}</button></div></div>`; }).join('') || '<p class="muted">Chưa có bài tập nào.</p>');
    $$('[data-hwdo]', root).forEach(b => b.onclick = () => { hw.doing = b.dataset.hwdo; hwDo(root, hw.doing); });
  }
  function hwDo(root, aid) {
    const a = S.assignments.find(x => x.id === aid); const sub = S.submissions.find(s => s.assignment_id === aid);
    const qs = a.question_ids.map(id => S.questions.find(q => q.id === id)).filter(Boolean);
    const late = a.due_at && new Date(a.due_at) < new Date();
    const prev = (sub && sub.answers) || {};
    const showSol = !!sub;
    root.innerHTML = `<div class="row-actions"><button class="btn sm" id="hwBack">← Danh sách</button><b style="margin-left:8px">${esc(a.title)}</b>${a.due_at ? `<span class="tag">Hạn ${fmtDate(a.due_at)}</span>` : ''}</div>
      ${sub ? `<div class="info">Điểm lần nộp gần nhất: <b>${DT.fmtNum(sub.score)}/${sub.max_score}</b> (${fmtDate(sub.submitted_at)})</div>` : ''}
      <div id="hwQs">${qs.map((q, n) => {
        const v = prev[q.id]; const pts = sub && sub.detail ? sub.detail[q.id] : null;
        let body = '';
        if (q.type === 'mcq') body = '<div class="pr-opts">' + q.options.map((o, k) => `<label><input type="radio" name="${q.id}" value="${k}" ${v === k ? 'checked' : ''}> <b>${'ABCD'[k]}.</b> ${tex(o)}</label>`).join('') + '</div>';
        if (q.type === 'tf') body = '<div class="pr-stmts">' + q.statements.map((s, k) => `<div><b>${'abcd'[k]})</b> ${tex(s)} <span class="pr-tf"><label><input type="radio" name="${q.id}-${k}" value="1" ${v && v[k] === true ? 'checked' : ''}>Đ</label><label><input type="radio" name="${q.id}-${k}" value="0" ${v && v[k] === false ? 'checked' : ''}>S</label></span></div>`).join('') + '</div>';
        if (q.type === 'short') body = `<input class="pr-in" name="${q.id}" value="${esc(v || '')}" placeholder="Đáp số">`;
        if (q.type === 'essay') body = `<textarea name="${q.id}" rows="3" style="width:100%" placeholder="Trình bày ngắn gọn">${esc(v || '')}</textarea>`;
        const res = pts == null ? '' : `<div class="${pts >= 1 ? 'ok' : 'warn'} small">${q.type === 'essay' ? '' : (pts >= 1 ? '✔ Đúng' : pts > 0 ? `Đúng một phần (${DT.fmtNum(pts)})` : '✘ Chưa đúng')}</div>`;
        const sol = showSol ? `<details><summary>Đáp án & lời giải</summary><div class="pr-sol">${q.type === 'mcq' ? '<b>Đáp án: ' + 'ABCD'[q.answer] + '</b><br>' : q.type === 'tf' ? '<b>' + q.answer.map((x, k) => 'abcd'[k] + ') ' + (x ? 'Đ' : 'S')).join('  ') + '</b><br>' : '<b>Đáp số: ' + tex(String(q.answer)) + '</b><br>'}${tex(q.explanation || '')}</div></details>` : '';
        return `<div class="pr-q"><div><b>Câu ${n + 1}.</b> ${tex(q.content)}${q.figure ? G.Figures.html(q.figure) : ''}</div>${body}${res}${sol}</div>`; }).join('')}</div>
      ${late && sub ? '<p class="muted">Đã quá hạn – không nộp lại được.</p>' : `<button class="btn primary" id="hwSubmit">${sub ? 'Nộp lại' : 'Nộp bài'}</button>`}`;
    if (!document.getElementById('pr-css')) G.Practice.mount(document.createElement('div')); // nạp CSS luyện tập
    $('#hwBack', root).onclick = () => { hw.doing = null; hwStudent(root); };
    const btn = $('#hwSubmit', root); if (btn) btn.onclick = async () => {
      const ans = {};
      for (const q of qs) {
        if (q.type === 'mcq') { const c = root.querySelector(`input[name="${q.id}"]:checked`); if (c) ans[q.id] = +c.value; }
        if (q.type === 'tf') { const arr = [0, 1, 2, 3].map(k => { const c = root.querySelector(`input[name="${q.id}-${k}"]:checked`); return c ? c.value === '1' : null; }); if (arr.some(x => x !== null)) ans[q.id] = arr; }
        if (q.type === 'short' || q.type === 'essay') { const v = root.querySelector(`[name="${q.id}"]`).value.trim(); if (v) ans[q.id] = v; }
      }
      const missing = qs.filter(q => q.type !== 'essay' && ans[q.id] == null).length;
      if (missing && !confirm(`Còn ${missing} câu chưa làm. Vẫn nộp?`)) return;
      btn.disabled = true;
      const { data, error } = await sb.rpc('submit_assignment', { p_assignment: aid, p_answers: ans });
      btn.disabled = false;
      if (error) return toast('Lỗi nộp bài: ' + error.message, 6000);
      S.submissions = await fetchAll('submissions');
      toast(`Đã nộp: ${DT.fmtNum(data.score)}/${data.max} điểm.`, 5000); hwDo(root, aid);
    };
  }
  function hwParent(root) {
    const kids = S.students; if (!hw.child && kids[0]) hw.child = kids[0].id;
    const kid = studentRow(hw.child);
    const list = S.assignments.filter(a => kid && a.class_id === kid.class_id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    root.innerHTML = childPicker(kids) + (kid ? list.map(a => { const sub = S.submissions.find(s => s.assignment_id === a.id && s.student_id === kid.id);
      return `<div class="card"><div class="card-head"><b>${esc(a.title)}</b>${a.due_at ? `<span class="tag">Hạn ${fmtDate(a.due_at)}</span>` : ''}<span class="spacer"></span>${sub ? `<span class="ok">Đã nộp ${DT.fmtNum(sub.score)}/${sub.max_score} · ${fmtDate(sub.submitted_at)}</span>` : '<span class="warn">Chưa nộp</span>'}</div></div>`; }).join('') || '<p class="muted">Chưa có bài tập.</p>' : '<p class="muted">Tài khoản chưa gắn với học sinh nào.</p>');
    bindChildPicker(root, () => hwParent(root));
  }
  function childPicker(kids) {
    return `<div class="row-actions" style="margin-bottom:8px">${kids.length > 1 ? `<select id="childSel">${kids.map(k => `<option value="${k.id}" ${k.id === hw.child ? 'selected' : ''}>${esc(k.full_name)} – ${esc((classOf(k.class_id) || {}).name || '')}</option>`).join('')}</select>` : kids[0] ? `<b>${esc(kids[0].full_name)}</b> – lớp ${esc((classOf(kids[0].class_id) || {}).name || '')}` : ''}
      <span class="spacer"></span><button class="btn sm" id="addChild">＋ Thêm con (nhập mã phụ huynh)</button></div>`;
  }
  function bindChildPicker(root, R) {
    const s = $('#childSel', root); if (s) s.onchange = (e) => { hw.child = e.target.value; R(); };
    $('#addChild', root).onclick = () => dialog(`<h3>Thêm con</h3><label>Mã phụ huynh của con<input name="c" required></label>`, 'Thêm').onok = async (f) => {
      const { error } = await sb.rpc('redeem_parent_invite', { p_code: f.c.value });
      if (error) return toast(error.message, 5000);
      await loadAll(); toast('Đã thêm.'); R();
    };
  }

  // ======================= ĐIỂM (HS / PH) =======================
  function renderScores(root) {
    const parent = S.profile.role === 'parent'; const kids = S.students;
    if (!hw.child && kids[0]) hw.child = kids[0].id;
    const kid = parent ? studentRow(hw.child) : kids[0];
    const rs = S.results.filter(r => kid && r.student_id === kid.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const subs = S.submissions.filter(s => kid && s.student_id === kid.id);
    const f = DT.fmtNum;
    root.innerHTML = (parent ? childPicker(kids) : `<h2>${esc(kid ? kid.full_name : '')}</h2>`) +
      `<h3>Bài kiểm tra</h3><div class="table-wrap"><table class="gr-table"><thead><tr><th>Ngày</th><th>Bài kiểm tra</th><th>Mã đề</th><th>P.I</th><th>P.II</th><th>P.III</th><th>TL</th><th>Tổng</th><th></th></tr></thead><tbody>
      ${rs.map(r => `<tr><td>${fmtDate(r.created_at)}</td><td>${esc(r.exam_name)}</td><td>${esc(r.version_code || '')}</td><td>${r.p1 != null ? f(+r.p1) : ''}</td><td>${r.p2 != null ? f(+r.p2) : ''}</td><td>${r.p3 != null ? f(+r.p3) : ''}</td><td>${r.essay != null ? f(+r.essay) : ''}</td><td><b>${r.total != null ? f(+r.total) : ''}</b></td>
        <td>${r.image_path ? `<button class="btn sm" data-img="${esc(r.image_path)}">Xem phiếu</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Chưa có điểm.</td></tr>'}</tbody></table></div>
      <h3>Bài tập về nhà</h3><table class="gr-table">${subs.map(s => { const a = S.assignments.find(x => x.id === s.assignment_id) || {}; return `<tr><td>${esc(a.title || '')}</td><td>${f(+s.score)}/${s.max_score}</td><td>${fmtDate(s.submitted_at)}</td></tr>`; }).join('') || '<tr><td class="muted">Chưa nộp bài nào.</td></tr>'}</table>
      <div id="scoreImg"></div>`;
    if (parent) bindChildPicker(root, () => renderScores(root));
    $$('[data-img]', root).forEach(b => b.onclick = async () => {
      const { data, error } = await sb.storage.from('phieu').createSignedUrl(b.dataset.img, 600);
      $('#scoreImg', root).innerHTML = error ? `<p class="warn">Chưa có ảnh phiếu (${esc(error.message)}).</p>` : `<p class="muted small">Xanh: đúng · Vàng: đáp án đúng · Đỏ: tô sai</p><img src="${data.signedUrl}" style="max-width:100%;border:1px solid #ddd;border-radius:8px">`;
      $('#scoreImg', root).scrollIntoView({ behavior: 'smooth' });
    });
  }

  // khởi động
  document.body.classList.add('auth-needed');
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.reload(); });
  start();
})(window);
