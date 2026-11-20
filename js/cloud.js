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
  const S = { user: null, profile: null, questions: [], exams: [], students: [], classes: [], cohorts: [], results: [], assignments: [], submissions: [], profiles: [], parentLinks: [] };
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
  const SUBJECTS = ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'GD Kinh tế & Pháp luật', 'Tin học', 'Công nghệ', 'Giáo dục thể chất', 'GD Quốc phòng & An ninh', 'Âm nhạc', 'Mĩ thuật', 'Khác'];
  const normLogin = (u) => { u = String(u || '').trim(); const d = u.replace(/[\s.\-]/g, ''); return /^\+?\d{9,12}$/.test(d) ? d.replace(/^\+?84/, '0') : u.toLowerCase(); };
  function loginOverlay() {
    const el = document.createElement('div'); el.id = 'authOverlay';
    const y = new Date().getFullYear();
    const SY = new Date().getMonth() >= 7 ? y : y - 1;   // năm bắt đầu năm học hiện tại
    el.innerHTML = `<div class="auth-box">
      <div class="auth-brand"><img src="assets/logo-256.png" alt="${esc(CFG.BRAND || '')}"><b>${esc(CFG.BRAND || 'Tiến Thịnh EDU')}</b><span>${esc(CFG.SCHOOL_NAME || '')}</span></div>
      <div class="seg auth-tabs"><button class="active" data-t="login" type="button">Đăng nhập</button><button data-t="reg" type="button">Đăng ký</button></div>
      <form id="fLogin" class="auth-form">
        <label>Số điện thoại hoặc tên đăng nhập<input name="u" autocomplete="username" autocapitalize="none" required></label>
        <label>Mật khẩu<input name="p" type="password" autocomplete="current-password" required></label>
        <button class="btn primary block">Đăng nhập</button>
        <p class="muted small">Quên mật khẩu? Liên hệ giáo viên chủ nhiệm hoặc quản trị viên.</p>
      </form>
      <form id="fReg" class="auth-form" hidden>
        <div class="seg reg-roles"><button type="button" class="active" data-r="student">Học sinh</button><button type="button" data-r="teacher">Giáo viên</button><button type="button" data-r="parent">Phụ huynh</button></div>
        <label>Họ và tên<input name="full_name" required maxlength="80" autocomplete="name"></label>
        <label>Số điện thoại (dùng để đăng nhập)<input name="phone" required inputmode="tel" pattern="[0-9 .]{10,14}" placeholder="0912 345 678" autocomplete="tel"></label>
        <div data-for="teacher" hidden>
          <label>Giáo viên dạy môn<select name="subject">${SUBJECTS.map(s => `<option>${s}</option>`).join('')}</select></label>
          <label>Chủ nhiệm lớp (nếu có)<input name="homeroom" maxlength="20" placeholder="VD: 10A1 – để trống nếu không chủ nhiệm"></label>
        </div>
        <div data-for="parent" hidden><label>Phụ huynh của học sinh (họ tên con)<input name="child_name" maxlength="80"></label></div>
        <div data-for="student parent">
          <div class="row">
            <label><span data-lbl>Lớp</span><input name="class_name" maxlength="20" placeholder="10A1"></label>
            <label>Khối<select name="grade"><option>10</option><option>11</option><option>12</option></select></label>
          </div>
          <label>Khóa<select name="cohort">${[0, 1, 2, -1].map(k => { const s = SY - k; return `<option value="${s}-${s + 3}" ${k === 0 ? 'selected' : ''}>${s}-${s + 3}${k >= 0 ? ` (đang học lớp ${10 + k})` : ' (khóa sau)'}</option>`; }).join('')}</select><small class="muted">Tự chọn theo khối, có thể đổi.</small></label>
        </div>
        <label>Mật khẩu mong muốn (tối thiểu 6 ký tự)<input name="password" type="password" minlength="6" maxlength="72" required autocomplete="new-password"></label>
        <label>Nhập lại mật khẩu<input name="password2" type="password" minlength="6" required autocomplete="new-password"></label>
        <button class="btn primary block">Gửi đăng ký</button>
        <p class="muted small">Tài khoản chỉ dùng được sau khi quản trị viên nhà trường kiểm tra thông tin và duyệt.</p>
      </form>
      <div id="authMsg" class="small warn"></div>
    </div>`;
    document.body.appendChild(el);
    const msg = (m, ok) => { const b = $('#authMsg'); b.innerHTML = m || ''; b.className = 'small ' + (ok ? 'auth-ok' : 'warn'); };
    $$('.auth-tabs button', el).forEach(b => b.onclick = () => {
      $$('.auth-tabs button', el).forEach(x => x.classList.toggle('active', x === b));
      $('#fLogin').hidden = b.dataset.t !== 'login'; $('#fReg').hidden = b.dataset.t !== 'reg'; msg('');
    });
    let role = 'student';
    const setRole = (r) => {
      role = r; $$('.reg-roles button', el).forEach(x => x.classList.toggle('active', x.dataset.r === r));
      $$('#fReg [data-for]', el).forEach(d => { d.hidden = !d.dataset.for.split(' ').includes(r); });
      $('#fReg [data-lbl]').textContent = r === 'parent' ? 'Lớp của con' : 'Lớp';
      const f = $('#fReg'); f.class_name.required = r !== 'teacher'; f.child_name.required = r === 'parent';
    };
    $$('.reg-roles button', el).forEach(b => b.onclick = () => setRole(b.dataset.r));
    setRole('student');
    $('#fLogin').onsubmit = async (e) => {
      e.preventDefault(); msg('Đang đăng nhập…');
      const f = e.target; const u = normLogin(f.u.value);
      const { error } = await sb.auth.signInWithPassword({ email: u.includes('@') ? u : emailOf(u), password: f.p.value });
      if (!error) { msg(''); return start(); }
      if (/invalid/i.test(error.message)) {
        const { data: st } = await sb.rpc('registration_status', { p_phone: u, p_password: f.p.value });
        if (st && st.status === 'pending') return msg('🔒 <b>Tài khoản chưa được xác thực thông tin.</b><br>Đăng ký của bạn đang chờ quản trị viên duyệt. Bạn sẽ đăng nhập được sau khi được duyệt.');
        if (st && st.status === 'rejected') return msg('⛔ <b>Đăng ký chưa được chấp nhận.</b>' + (st.note ? '<br>Lý do: ' + esc(st.note) : '') + '<br>Bạn có thể kiểm tra lại thông tin và đăng ký lại.');
        return msg('Sai số điện thoại/tên đăng nhập hoặc mật khẩu.');
      }
      msg(esc(error.message));
    };
    { const f = $('#fReg'); const syncCo = () => { const g = +f.grade.value; f.cohort.value = `${SY - (g - 10)}-${SY - (g - 10) + 3}`; };
      f.grade.onchange = syncCo;
      f.class_name.oninput = () => { const m = /^s*(1[012])/.exec(f.class_name.value); if (m && f.grade.value !== m[1]) { f.grade.value = m[1]; syncCo(); } }; }
    $('#fReg').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      if (f.password.value !== f.password2.value) return msg('Hai mật khẩu không khớp.');
      const p = { role, full_name: f.full_name.value.trim(), phone: normLogin(f.phone.value), password: f.password.value };
      if (role === 'teacher') Object.assign(p, { subject: f.subject.value, homeroom: f.homeroom.value.trim() });
      if (role === 'parent') p.child_name = f.child_name.value.trim();
      if (role !== 'teacher') Object.assign(p, { class_name: f.class_name.value.trim(), grade: f.grade.value, cohort: f.cohort.value });
      msg('Đang gửi…');
      const { error } = await sb.rpc('submit_registration', { p });
      if (error) return msg(esc(error.message));
      f.reset(); setRole(role);
      $$('.auth-tabs button', el)[0].click();
      msg(`✅ Đã gửi đăng ký cho số <b>${esc(p.phone)}</b>.<br>Khi quản trị viên duyệt, bạn đăng nhập bằng số điện thoại này và mật khẩu vừa đặt.`, true);
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
  const qFromRow = (r) => Object.assign({}, r.data, { id: r.id, pool: r.pool, grade: r.grade, chapter: r.chapter, topic: r.topic, type: r.type, level: r.level, subject: r.subject || (r.data && r.data.subject) || 'toan' });
  async function loadAll() {
    const role = S.profile.role;
    const [qs, classes, cohorts] = await Promise.all([
      fetchAll('questions', 'id,subject,pool,grade,chapter,topic,type,level,data,deleted', q => q.eq('deleted', false)),
      fetchAll('classes'), fetchAll('cohorts')
    ]);
    S.questions = qs.map(qFromRow); S.allQuestions = S.questions; S.classes = classes; S.cohorts = cohorts;
    S.students = await fetchAll('students');
    if (role === 'admin' || role === 'teacher') {
      const [exams, results, asg, subs, profs, links, tcs] = await Promise.all([
        fetchAll('exams'), fetchAll('results'), fetchAll('assignments'), fetchAll('submissions'), fetchAll('profiles', 'id,role,username,full_name,subjects,phone,created_at'), fetchAll('parent_links'), fetchAll('teacher_classes')]);
      S.parentLinks = links; S.teacherClasses = tcs;
      S.exams = exams.map(e => Object.assign({}, e.data, { id: e.id, name: e.name, updatedAt: e.updated_at, ownerId: e.owner_id }));
      S.results = results; S.assignments = asg; S.submissions = subs; S.profiles = profs;
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
    const qRow = (q) => ({ id: q.id, subject: q.subject || 'toan', grade: +q.grade, chapter: q.chapter, topic: q.topic, type: q.type, level: q.level, pool: DT.poolOf(q), data: q, deleted: false, updated_at: new Date().toISOString() });
    const curSub = () => G.CLOUD.subject || 'toan';
    DT.Bank.all = () => S.questions.filter(q => (q.subject || 'toan') === curSub());
    DT.Bank.get = (id) => S.questions.find(q => q.id === id);
    DT.Bank.isModified = () => false;
    DT.Bank.save = (q) => {
      if (!q.id) q.id = 'c-' + q.grade + '-' + DT.uid();
      if (!q.pool) q.pool = 'exam';
      if (!q.subject) q.subject = curSub();
      const i = S.questions.findIndex(x => x.id === q.id); if (i >= 0) S.questions[i] = q; else S.questions.push(q);
      push(sb.from('questions').upsert(qRow(q)), 'câu hỏi').catch(() => {});
      return q;
    };
    DT.Bank.remove = (id) => {
      S.questions = S.questions.filter(q => q.id !== id);
      push(sb.from('questions').update({ deleted: true, updated_at: new Date().toISOString() }).eq('id', id), 'câu hỏi').catch(() => {});
    };
    // Đề đã lưu
    const exRow = (e) => ({ id: e.id, name: e.name || '', subject: (e.config && e.config.subject) || 'toan', data: e, updated_at: new Date().toISOString() });
    DT.Exams.all = () => S.exams.filter(e => ((e.config && e.config.subject) || 'toan') === curSub()).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
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

  // ======================= MÔN HỌC =======================
  const SUBJECT_LIST = [['toan', 'Toán'], ['van', 'Ngữ văn'], ['anh', 'Tiếng Anh'], ['ly', 'Vật lí'], ['hoa', 'Hóa học'], ['sinh', 'Sinh học'], ['su', 'Lịch sử'], ['dia', 'Địa lí'],
    ['gdktpl', 'GD Kinh tế & Pháp luật'], ['tin', 'Tin học'], ['congnghe', 'Công nghệ'], ['gdtc', 'Giáo dục thể chất'], ['qpan', 'GD Quốc phòng & An ninh'], ['amnhac', 'Âm nhạc'], ['mithuat', 'Mĩ thuật'], ['khac', 'Khác']];
  const subjectName = (code) => (SUBJECT_LIST.find(s => s[0] === code) || [code, code])[1];
  const subjectCode = (x) => { const t = String(x || '').trim(); const f = SUBJECT_LIST.find(s => s[0] === t || s[1].toLowerCase() === t.toLowerCase()); return f ? f[0] : null; };
  function mySubjects() {
    const role = S.profile.role;
    if (role === 'teacher') { const c = [...new Set((S.profile.subjects || []).map(subjectCode).filter(Boolean))]; return c.length ? c : ['toan']; }
    if (role === 'student') { const have = new Set(S.allQuestions.map(q => q.subject || 'toan')); return SUBJECT_LIST.map(s => s[0]).filter(c => have.has(c)); }
    return SUBJECT_LIST.map(s => s[0]);
  }
  function setSubject(code) {
    G.CLOUD.subject = code; G.CLOUD.subjectName = subjectName(code);
    try { localStorage.setItem('dtt_subject', code); } catch (e) { /* bỏ qua */ }
    const sel = $('#subjSel'); if (sel) sel.value = code;
  }
  // Chương/bài của môn khác Toán lấy từ chính ngân hàng câu hỏi của môn đó
  function installSubjectAdapters() {
    const origChaptersOf = DT.chaptersOf, origChapterById = DT.chapterById;
    const custom = () => G.CLOUD.subject && G.CLOUD.subject !== 'toan';
    const CSUB = () => (G.CURRICULUM_SUBJECTS || {})[G.CLOUD.subject];
    const defined = (grade, sem) => { const c = CSUB(); if (!c || !c[grade]) return []; return sem === 'all' || !c[grade][sem] ? [].concat(c[grade][1] || [], c[grade][2] || []) : c[grade][sem]; };
    DT.chaptersOf = (grade, sem) => {
      if (!custom()) return origChaptersOf(grade, sem);
      const base = defined(grade, sem); const known = new Set(defined(grade, 'all').map(c => c.id));
      const map = new Map();
      for (const q of DT.Bank.all()) if (String(q.grade) === String(grade) && q.chapter) {
        if (!map.has(q.chapter)) map.set(q.chapter, new Set()); if (q.topic) map.get(q.chapter).add(q.topic);
      }
      const extra = [...map.entries()].filter(([id]) => !known.has(id)).sort((a, b) => a[0].localeCompare(b[0], 'vi', { numeric: true })).map(([id, t]) => ({ id, name: id, topics: [...t] }));
      return base.concat(sem === 'all' || !base.length ? extra : []);   // chương giáo viên tự thêm hiện ở "Cả năm"
    };
    DT.chapterById = (id) => {
      if (!custom()) return origChapterById(id);
      if (!id || id === '__new') return null;
      const c = CSUB(); if (c) for (const g of Object.keys(c)) for (const s of [1, 2]) { const f = (c[g][s] || []).find(x => x.id === id); if (f) return f; }
      const topics = new Set(); DT.Bank.all().forEach(q => { if (q.chapter === id && q.topic) topics.add(q.topic); });
      return { id, name: id, topics: [...topics] };
    };
  }

  // ======================= KHUNG GIAO DIỆN: MENU TRÁI THEO NHÓM =======================
  const VIEWS = {
    approve: { render: (r) => renderApprove(r) }, classes: { render: (r) => renderClasses(r) },
    homework: { render: (r) => renderHomework(r) }, scores: { render: (r) => renderScores(r) }
  };
  G.CLOUD.views = VIEWS;   // portal.js đăng ký thêm: home, accounts, assign, homeroom, gradebook, contact
  const isHomeroom = () => (S.teacherClasses || []).some(t => t.teacher_id === S.profile.id && t.homeroom);
  function menuFor(role) {
    const staff = role === 'admin' || role === 'teacher';
    const M = [];
    M.push({ items: [{ v: 'home', i: '🏠', l: 'Tổng quan' }] });
    if (role === 'admin') {
      M.push({ g: 'Người dùng', items: [{ v: 'approve', i: '✅', l: 'Duyệt đăng ký', badge: 'approve' }, { v: 'accounts', i: '👥', l: 'Tài khoản' }] });
      M.push({ g: 'Tổ chức', items: [{ v: 'classes', i: '🏫', l: 'Khóa, lớp & học sinh' }, { v: 'assign', i: '🧑‍🏫', l: 'Phân công giảng dạy' }] });
    }
    if (role === 'teacher' && isHomeroom()) M.push({ g: 'Lớp chủ nhiệm', items: [{ v: 'homeroom', i: '⭐', l: 'Lớp chủ nhiệm' }, { v: 'classes', i: '🏫', l: 'Lớp & học sinh' }] });
    else if (role === 'teacher') M.push({ g: 'Lớp học', items: [{ v: 'classes', i: '🏫', l: 'Lớp & học sinh' }] });
    if (staff) {
      M.push({ g: 'Đề kiểm tra', items: [{ v: 'create', i: '📝', l: 'Tạo đề' }, { v: 'saved', i: '📂', l: 'Đề đã lưu', badge: 'saved' }, { v: 'bank', i: '🗂️', l: 'Ngân hàng câu hỏi' }] });
      M.push({ g: 'Chấm & điểm', items: [{ v: 'grade', i: '📷', l: 'Chấm phiếu trắc nghiệm' }, { v: 'gradebook', i: '📊', l: 'Bảng điểm' }] });
      M.push({ g: 'Học tập', items: [{ v: 'homework', i: '📚', l: 'Bài tập về nhà' }, { v: 'practice', i: '🎯', l: 'Luyện tập (xem như HS)' }] });
      if (role === 'admin') M.push({ g: 'Lớp chủ nhiệm', items: [{ v: 'homeroom', i: '⭐', l: 'Xem theo lớp' }] });
    }
    if (role === 'student') {
      M.push({ g: 'Học tập', items: [{ v: 'homework', i: '📚', l: 'Bài tập về nhà' }, { v: 'practice', i: '🎯', l: 'Luyện tập' }] });
      M.push({ g: 'Kết quả', items: [{ v: 'scores', i: '📊', l: 'Điểm của tôi' }, { v: 'conduct', i: '🗓️', l: 'Chuyên cần & nề nếp' }] });
      M.push({ g: 'Liên hệ', items: [{ v: 'contact', i: '☎️', l: 'Giáo viên của lớp' }] });
    }
    if (role === 'parent') {
      M.push({ g: 'Con tôi', items: [{ v: 'scores', i: '📊', l: 'Điểm kiểm tra' }, { v: 'homework', i: '📚', l: 'Bài tập về nhà' }, { v: 'conduct', i: '🗓️', l: 'Chuyên cần & nề nếp' }] });
      M.push({ g: 'Liên hệ', items: [{ v: 'contact', i: '☎️', l: 'Giáo viên chủ nhiệm' }] });
    }
    return M;
  }
  const VIEW_TITLE = {};
  function setupUI() {
    installAdapters(); installSubjectAdapters();
    const role = S.profile.role;
    document.body.dataset.role = role; document.body.classList.add('portal');
    // chọn môn
    const subs = mySubjects(); let saved = null; try { saved = localStorage.getItem('dtt_subject'); } catch (e) { /* bỏ qua */ }
    setSubject(subs.includes(saved) ? saved : (subs[0] || 'toan'));
    // tạo vùng chứa cho các trang mới
    const main = $('main');
    for (const k of ['approve', 'classes', 'homework', 'scores', 'home', 'accounts', 'assign', 'homeroom', 'gradebook', 'contact', 'conduct']) {
      if (!$('#view-' + k)) { const sec = document.createElement('section'); sec.id = 'view-' + k; sec.className = 'view'; sec.innerHTML = `<div class="panel" id="${k}Root"></div>`; main.appendChild(sec); }
    }
    // thanh trên
    const top = $('.topbar');
    top.innerHTML = `<button class="nav-toggle" id="navToggle" aria-label="Menu">☰</button>
      <div class="brand"><img src="assets/logo-96.png" class="brand-logo" alt=""><span class="brand-txt"><b>${esc(CFG.BRAND || 'Tiến Thịnh EDU')}</b><small>${esc(CFG.SCHOOL_NAME || '')}</small></span></div>
      <span class="spacer"></span>
      ${role !== 'parent' && subs.length > 1 ? `<label class="subj-pick">Môn <select id="subjSel">${subs.map(c => `<option value="${c}" ${c === G.CLOUD.subject ? 'selected' : ''}>${esc(subjectName(c))}</option>`).join('')}</select></label>` : (role !== 'parent' ? `<span class="subj-one">Môn: <b>${esc(G.CLOUD.subjectName)}</b></span>` : '')}
      <div class="user-menu"><button class="user-btn" id="userBtn"><span class="avatar">${esc((S.profile.full_name || S.profile.username).trim().split(/\s+/).pop().slice(0, 1).toUpperCase())}</span><span class="user-txt"><b>${esc(S.profile.full_name || S.profile.username)}</b><small>${ROLE_NAME[role]}${isHomeroom() ? ' · GVCN' : ''}</small></span> ▾</button>
        <div class="user-drop" id="userDrop"><div class="muted small">Đăng nhập: ${esc(S.profile.username)}</div><button id="btnPw">🔑 Đổi mật khẩu</button><button id="btnLogout">↩ Đăng xuất</button></div></div>`;
    $('#userBtn').onclick = (e) => { e.stopPropagation(); $('#userDrop').classList.toggle('open'); };
    document.addEventListener('click', () => { const d = $('#userDrop'); if (d) d.classList.remove('open'); });
    $('#btnLogout').onclick = async () => { await sb.auth.signOut(); location.reload(); };
    $('#btnPw').onclick = changePassword;
    if ($('#subjSel')) $('#subjSel').onchange = (e) => { setSubject(e.target.value); G.__app.refresh(); openView(G.CLOUD.current || 'home'); toast('Đang làm việc với môn ' + G.CLOUD.subjectName + '.'); };
    // menu trái
    let nav = $('#sideNav'); if (!nav) { nav = document.createElement('aside'); nav.id = 'sideNav'; nav.className = 'no-print'; document.body.insertBefore(nav, main); }
    const M = menuFor(role);
    M.forEach(g => g.items.forEach(it => { VIEW_TITLE[it.v] = it.l; }));
    nav.innerHTML = (role === 'parent' && S.students.length > 1 ? `<div class="nav-child"><label>Con của tôi<select id="navChild">${S.students.map(k => `<option value="${k.id}">${esc(k.full_name)} – ${esc((classOf(k.class_id) || {}).name || '')}</option>`).join('')}</select></label></div>`
        : role === 'parent' && S.students[0] ? `<div class="nav-child">Con: <b>${esc(S.students[0].full_name)}</b><br><small>Lớp ${esc((classOf(S.students[0].class_id) || {}).name || '')}</small></div>` : '') +
      M.map(g => `<div class="nav-group">${g.g ? `<div class="nav-title">${esc(g.g)}</div>` : ''}${g.items.map(it => `<button class="nav-item" data-v="${it.v}"><span class="nav-ico">${it.i}</span><span>${esc(it.l)}</span>${it.badge ? `<span class="nav-badge" data-badge="${it.badge}"></span>` : ''}</button>`).join('')}</div>`).join('');
    $$('.nav-item', nav).forEach(b => b.onclick = () => { openView(b.dataset.v); document.body.classList.remove('nav-open'); });
    $('#navToggle').onclick = (e) => { e.stopPropagation(); document.body.classList.toggle('nav-open'); };
    main.onclick = () => document.body.classList.remove('nav-open');
    const cs = $('#navChild'); if (cs) { if (hw.child) cs.value = hw.child; cs.onchange = (e) => { hw.child = e.target.value; openView(G.CLOUD.current); }; }
    // nút cũ không còn dùng
    const roster = $('#grRoster'); if (roster) { roster.textContent = '👥 Lớp & học sinh'; roster.onclick = () => openView('classes'); }
    const backup = $('#btnBackup'); if (backup) backup.parentElement.hidden = true;
    G.__app.refresh();
    if (role === 'admin') loadRegistrations();
    updateBadges();
    openView('home');
  }
  function updateBadges() {
    const b = $('[data-badge="approve"]'); if (b) { const n = (S.registrations || []).filter(r => r.status === 'pending').length; b.textContent = n || ''; b.hidden = !n; }
    const s = $('[data-badge="saved"]'); if (s) { const n = DT.Exams.all().length; s.textContent = n || ''; s.hidden = !n; s.classList.add('light'); }
  }
  G.CLOUD.updateBadges = updateBadges;
  function openView(v) {
    G.CLOUD.current = v;
    $$('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.v === v));
    $$('.view').forEach(x => x.classList.toggle('active', x.id === 'view-' + v));
    document.title = (VIEW_TITLE[v] || 'Tạo đề') + ' – ' + (CFG.BRAND || 'Tiến Thịnh EDU');
    window.scrollTo(0, 0);
    if (v === 'create') G.__app.refresh();
    if (v === 'bank') G.__app.renderBank();
    if (v === 'saved') G.__app.renderSaved();
    if (v === 'grade') GR.show();
    if (v === 'practice') G.Practice.mount($('#practiceRoot'));
    if (VIEWS[v]) { const root = $('#' + v + 'Root'); try { const r = VIEWS[v].render(root); if (r && r.catch) r.catch(e => { console.error(e); root.innerHTML = `<p class="warn">Lỗi: ${esc(e.message)}</p>`; }); } catch (e) { console.error(e); root.innerHTML = `<p class="warn">Lỗi: ${esc(e.message)}</p>`; } }
    updateBadges();
  }
  G.CLOUD.openView = openView;

  function changePassword() {
    const d = dialog(`<h3>Đổi mật khẩu</h3><label>Mật khẩu mới<input name="p" type="password" minlength="6" required></label><label>Nhập lại<input name="p2" type="password" minlength="6" required></label>`, 'Đổi');
    d.onok = async (f) => {
      if (f.p.value !== f.p2.value) return toast('Hai mật khẩu không khớp.');
      const { error } = await sb.auth.updateUser({ password: f.p.value });
      toast(error ? 'Lỗi: ' + error.message : 'Đã đổi mật khẩu.');
    };
  }
  // nhập danh sách học sinh: dán văn bản hoặc chọn tệp; tự nhận cột, xem trước rồi mới lưu
  function importRoster(c, done) {
    const RI = G.RosterImport; let parsed = { out: [], skipped: [] };
    const d = document.createElement('dialog'); d.className = 'cl-dialog ri-dialog';
    d.innerHTML = `<h3>Nhập học sinh vào lớp ${esc(c.name)}</h3>
      <p class="muted small">Chọn tệp <b>Excel (.xlsx), Word (.docx), CSV/TXT</b> hoặc dán danh sách vào ô dưới. Cột thừa (STT, giới tính, dân tộc, địa chỉ, SĐT…) tự bỏ qua — chỉ lưu <b>họ tên, SBD, ngày sinh</b>. Có hay không có dòng tiêu đề đều được.</p>
      <div class="row-actions"><label class="btn sm">📂 Chọn tệp<input type="file" id="riFile" accept=".xlsx,.xlsm,.docx,.csv,.txt,.xls,.doc" hidden></label><span class="muted small" id="riFileName"></span></div>
      <textarea id="riText" rows="7" style="width:100%;margin-top:6px" placeholder="VD:&#10;STT  Họ và tên        Ngày sinh   Giới tính&#10;1    NGUYỄN VĂN AN     05/02/2011  Nam&#10;2    Trần Thị Bình     21/04/2011  Nữ"></textarea>
      <div id="riPrev" class="ri-prev"></div>
      <div class="modal-actions"><button class="btn" id="riCancel">Hủy</button><button class="btn primary" id="riOk" disabled>Lưu</button></div>`;
    document.body.appendChild(d); d.showModal();
    const close = () => { d.close(); d.remove(); };
    const show = () => {
      const p = parsed; const dupDb = (o) => o.sbd ? S.students.find(s => s.sbd === o.sbd) : S.students.find(s => s.class_id === c.id && s.full_name.toLowerCase() === o.full_name.toLowerCase() && (!o.dob || !s.dob || s.dob === o.dob));
      p.out.forEach(o => { o.ex = dupDb(o) || null; });
      const nNew = p.out.filter(o => !o.ex).length, nUpd = p.out.length - nNew;
      $('#riPrev', d).innerHTML = !p.out.length ? (p.skipped.length ? '<p class="warn small">Không đọc được học sinh nào. Kiểm tra lại danh sách.</p>' : '')
        : `<p class="small"><b>Đọc được ${p.out.length} học sinh</b>${p.sheet ? ` (trang tính “${esc(p.sheet)}”)` : ''}: ${nNew} mới${nUpd ? `, ${nUpd} đã có (sẽ cập nhật)` : ''}${p.skipped.length ? `, bỏ qua ${p.skipped.length} dòng không phải học sinh` : ''}.</p>
          <div class="table-wrap" style="max-height:260px"><table class="gr-table"><thead><tr><th>#</th><th>Họ và tên</th><th>SBD</th><th>Ngày sinh</th><th></th></tr></thead><tbody>
          ${p.out.map((o, i) => `<tr><td>${i + 1}</td><td>${esc(o.full_name)}</td><td>${esc(o.sbd || '')}</td><td>${o.dob ? o.dob.split('-').reverse().join('/') : ''}</td><td class="small">${o.ex ? '<span class="tag">đã có</span> ' : ''}${o.warn.map(w => `<span class="warn">${esc(w)}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>
          ${p.skipped.length ? `<details class="small"><summary>Dòng bị bỏ qua (${p.skipped.length})</summary>${p.skipped.slice(0, 30).map(s => `<div class="muted">Dòng ${s.line}: ${esc(s.text)}</div>`).join('')}</details>` : ''}`;
      $('#riOk', d).disabled = !p.out.length; $('#riOk', d).textContent = p.out.length ? `Lưu ${p.out.length} học sinh` : 'Lưu';
    };
    let tm; $('#riText', d).oninput = () => { clearTimeout(tm); tm = setTimeout(() => { parsed = RI.parse($('#riText', d).value); $('#riFileName', d).textContent = ''; show(); }, 250); };
    $('#riFile', d).onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return; $('#riFileName', d).textContent = 'Đang đọc ' + file.name + '…';
      try { parsed = await RI.readFile(file); $('#riFileName', d).textContent = file.name; show(); }
      catch (err) { $('#riFileName', d).textContent = ''; $('#riPrev', d).innerHTML = `<p class="warn small">${esc(err.message)}</p>`; }
      e.target.value = '';
    };
    $('#riCancel', d).onclick = (e) => { e.preventDefault(); close(); };
    d.addEventListener('cancel', () => setTimeout(() => d.remove(), 0));
    $('#riOk', d).onclick = async (e) => {
      e.preventDefault(); const b = e.target; b.disabled = true;
      try {
        const recs = parsed.out.map(o => Object.assign(o.ex ? { id: o.ex.id } : {}, { full_name: o.full_name, sbd: o.sbd || (o.ex ? o.ex.sbd : null), class_id: c.id, cohort_id: c.cohort_id || (o.ex ? o.ex.cohort_id : null), dob: o.dob || (o.ex ? o.ex.dob : null) }));
        const withId = recs.filter(r => r.id), noId = recs.filter(r => !r.id);
        if (withId.length) await push(sb.from('students').upsert(withId), 'học sinh');
        if (noId.length) await push(sb.from('students').insert(noId), 'học sinh');
        S.students = await fetchAll('students'); toast(`Đã lưu ${recs.length} học sinh vào lớp ${c.name}.`, 4000); close(); done();
      } catch (err) { b.disabled = false; toast('Lỗi: ' + (err.message || err), 6000); }
    };
  }
  // hộp thoại đơn giản
  function dialog(inner, okText = 'OK') {
    const d = document.createElement('dialog'); d.className = 'cl-dialog';
    d.innerHTML = `<form method="dialog">${inner}<div class="modal-actions"><button value="cancel" class="btn" formnovalidate>Hủy</button><button value="ok" class="btn primary">${esc(okText)}</button></div></form>`;
    document.body.appendChild(d); d.showModal();
    const api = { onok: null }; const form = d.querySelector('form');
    // xử lý ngay khi bấm nút (không chờ sự kiện "close" – có trình duyệt phát trễ hoặc không phát)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (e.submitter && e.submitter.value === 'ok' && api.onok) { const btn = e.submitter; btn.disabled = true; try { await api.onok(form); } finally { btn.disabled = false; } }
      if (d.open) d.close(); d.remove();
    });
    d.addEventListener('cancel', () => setTimeout(() => d.remove(), 0));
    return api;
  }

  // ======================= LỚP & HỌC SINH, TÀI KHOẢN =======================
  const cst = { classId: '' };
  const PW_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
  const randPw = () => { const b = new Uint32Array(8); crypto.getRandomValues(b); return [...b].map(x => PW_CHARS[x % PW_CHARS.length]).join(''); };
  const noAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  // gợi ý tên đăng nhập: hs<SBD> / ph<SBD>; không có SBD thì tên + chữ cái đầu họ đệm
  function baseUsername(s, role) {
    if (s && s.sbd) return (role === 'parent' ? 'ph' : 'hs') + s.sbd;
    const w = noAccent(s ? s.full_name : '').split(/\s+/).filter(Boolean);
    const core = w.length ? w[w.length - 1] + '.' + w.slice(0, -1).map(x => x[0]).join('') : 'user';
    return (role === 'parent' ? 'ph.' : '') + core.replace(/[^a-z0-9.]/g, '');
  }
  async function freeUsername(base) {
    const taken = new Set((S.profiles || []).map(p => p.username));
    let u = base.slice(0, 26), i = 1;
    while (taken.has(u)) u = base.slice(0, 26) + (++i);
    const { data } = await sb.rpc('username_available', { p_username: u });
    if (data === false) return freeUsername(base + '_');
    return u;
  }
  async function createAccount(username, password, role, fullName, studentId, subjects) {
    const { data, error } = await sb.rpc('admin_create_account', { p_username: username, p_password: password, p_role: role, p_full_name: fullName || '', p_student: studentId || null, p_subjects: subjects || [] });
    if (error) throw error;
    return data;
  }
  async function reloadPeople() {
    const [st, profs, links, tcs] = await Promise.all([fetchAll('students'), fetchAll('profiles', 'id,role,username,full_name,subjects,phone,created_at'), fetchAll('parent_links'), fetchAll('teacher_classes')]);
    S.students = st; S.profiles = profs; S.parentLinks = links; S.teacherClasses = tcs;
  }
  const profileOf = (id) => (S.profiles || []).find(p => p.id === id);
  const parentsOf = (sid) => (S.parentLinks || []).filter(l => l.student_id === sid).map(l => profileOf(l.parent_id)).filter(Boolean);

  function renderClasses(root) {
    const admin = S.profile.role === 'admin';
    // giáo viên chỉ thấy lớp mình được phân công (dạy hoặc chủ nhiệm) – bảo mật theo lớp
    const myTc = (S.teacherClasses || []).filter(t => t.teacher_id === S.profile.id);
    const visible = admin ? S.classes : S.classes.filter(c => myTc.some(t => t.class_id === c.id));
    const isHr = (cid) => admin || myTc.some(t => t.class_id === cid && t.homeroom);
    if (!visible.some(c => c.id === cst.classId)) cst.classId = (visible.find(c => isHr(c.id)) || visible[0] || {}).id || null;
    const canEdit = !!cst.classId && isHr(cst.classId);
    const cls = visible.slice().sort((a, b) => (b.school_year || '').localeCompare(a.school_year || '') || a.name.localeCompare(b.name, 'vi'));
    const studs = S.students.filter(s => s.class_id === cst.classId).sort((a, b) => lastName(a.full_name).localeCompare(lastName(b.full_name), 'vi'));
    root.innerHTML = `
      <div class="cl-grid">
        <div>
          <h2>Khóa học</h2>
          <table class="gr-table"><tr><th>Khóa</th><th>Kết thúc</th></tr>${S.cohorts.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.end_date)}${admin ? ` <button class="btn sm" data-editco="${c.id}">Sửa</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Chưa có khóa.</td></tr>'}</table>
          ${admin ? `<button class="btn sm" id="addCohort">＋ Thêm khóa</button>` : ''}
          <p class="muted small">Sau ngày kết thúc khóa, tài khoản học sinh và phụ huynh của khóa đó tự xóa (2 giờ sáng mỗi ngày).${admin ? ' <button class="btn sm danger" id="purgeNow">Xóa ngay tài khoản hết khóa</button>' : ''}</p>
          <h2>Lớp</h2>
          <div class="cl-classes">${cls.map(c => `<button class="cl-class ${c.id === cst.classId ? 'active' : ''}" data-cls="${c.id}"><b>${esc(c.name)}</b><small>Khối ${c.grade} · ${esc(c.school_year)} · ${S.students.filter(s => s.class_id === c.id).length} HS</small></button>`).join('') || (admin ? '<p class="muted">Chưa có lớp.</p>' : '<p class="muted">Bạn chưa được phân công lớp nào. Quản trị viên phân công ở mục <b>Phân công giảng dạy</b>.</p>')}</div>
          ${admin ? '<button class="btn sm" id="addClass">＋ Thêm lớp</button>' : ''}
          ${admin ? renderStaffBlock() : ''}
        </div>
        <div>
          ${cst.classId ? `<h2>Học sinh lớp ${esc((classOf(cst.classId) || {}).name || '')}</h2>
          <div class="row-actions" style="margin-bottom:6px">
            ${canEdit ? `<button class="btn sm primary" id="importStud">＋ Nhập danh sách</button><button class="btn sm" id="mkAccounts">👤 Tạo tài khoản HS & PH còn thiếu</button>` : '<span class="muted small">Chỉ xem – danh sách lớp do giáo viên chủ nhiệm quản lý.</span>'}
          </div>
          <div class="table-wrap"><table class="gr-table"><thead><tr><th>Họ tên</th><th>SBD</th><th>Tài khoản HS</th><th>Phụ huynh</th><th></th></tr></thead><tbody>
          ${studs.map(s => { const a = s.user_id ? profileOf(s.user_id) : null; const ps = parentsOf(s.id);
            return `<tr><td>${esc(s.full_name)}</td><td>${esc(s.sbd || '')}</td>
            <td>${a ? `${esc(a.username)} <button class="btn sm" data-reset="${a.id}" title="Đặt lại mật khẩu">🔒</button>${admin ? `<button class="btn sm danger" data-delacc="${a.id}" title="Xóa tài khoản">✕</button>` : ''}` : `<span class="muted">chưa có</span>${canEdit ? ` <button class="btn sm" data-mk1="${s.id}">Tạo</button>` : ''}`}</td>
            <td>${ps.map(p => `${esc(p.username)} <button class="btn sm" data-reset="${p.id}" title="Đặt lại mật khẩu">🔒</button>`).join('<br>')}${admin ? ` <button class="btn sm" data-linkpar="${s.id}" title="Thêm phụ huynh cho học sinh này">＋PH</button>` : ''}</td>
            <td>${canEdit ? `<button class="btn sm" data-edst="${s.id}">Sửa</button> <button class="btn sm danger" data-rmst="${s.id}">✕</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Lớp chưa có học sinh.</td></tr>'}
          </tbody></table></div>` : '<p class="muted">Hãy tạo lớp trước.</p>'}
        </div>
      </div>`;
    const R = () => renderClasses(root);
    $$('[data-cls]', root).forEach(b => b.onclick = () => { cst.classId = b.dataset.cls; R(); });
    if ($('#addCohort', root)) $('#addCohort', root).onclick = () => {
      const y = new Date().getFullYear();
      dialog(`<h3>Thêm khóa học</h3><label>Tên khóa<input name="n" required value="${y}-${y + 3}"></label><label>Ngày kết thúc (tài khoản HS/PH tự xóa sau ngày này)<input name="d" type="date" required value="${y + 3}-06-30"></label>`, 'Thêm').onok = async (f) => {
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
      const { data, error } = await sb.rpc('admin_purge_now'); toast(error ? error.message : `Đã xóa ${data} tài khoản.`); await reloadPeople(); R();
    };
    if ($('#addClass', root)) $('#addClass', root).onclick = () => {
      const y = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      dialog(`<h3>Thêm lớp</h3><label>Tên lớp<input name="n" required placeholder="10A1"></label><label>Khối<select name="g"><option>10</option><option>11</option><option>12</option></select></label>
        <label>Khóa<select name="co"><option value="">—</option>${S.cohorts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>Năm học<input name="y" value="${y}-${y + 1}"></label>`, 'Thêm').onok = async (f) => {
        const d = await push(sb.from('classes').insert({ name: f.n.value.trim(), grade: +f.g.value, cohort_id: f.co.value || null, school_year: f.y.value.trim() }).select().single(), 'lớp');
        S.classes.push(d); cst.classId = d.id; R();
      };
    };
    if (admin) bindStaff(root, R);
    $$('[data-reset]', root).forEach(b => b.onclick = () => {
      const p = profileOf(b.dataset.reset);
      dialog(`<h3>Đặt lại mật khẩu – ${esc(p ? p.username : '')}</h3><label>Mật khẩu mới (≥ 6 ký tự)<input name="p" required minlength="6" value="${randPw()}"></label><p class="muted small">Ghi lại và đưa cho người dùng.</p>`, 'Đặt lại').onok = async (f) => {
        const { error } = await sb.rpc('reset_password', { p_user: b.dataset.reset, p_password: f.p.value });
        if (error) return toast(error.message, 5000);
        showCredentials([{ name: p ? p.full_name : '', role: p ? p.role : '', username: p ? p.username : '', password: f.p.value }], 'Mật khẩu mới');
      };
    });
    $$('[data-delacc]', root).forEach(b => b.onclick = async () => {
      const p = profileOf(b.dataset.delacc); if (!confirm(`Xóa tài khoản đăng nhập "${p.username}"? (Hồ sơ học sinh và điểm vẫn giữ)`)) return;
      const { error } = await sb.rpc('admin_delete_account', { p_user: p.id }); if (error) return toast(error.message, 5000);
      await reloadPeople(); toast('Đã xóa tài khoản.'); R();
    });
    if (!cst.classId) return;
    if ($('#importStud', root)) $('#importStud', root).onclick = () => importRoster(classOf(cst.classId), R);
    if ($('#mkAccounts', root)) $('#mkAccounts', root).onclick = async () => {
      const need = studs.filter(s => !s.user_id || !parentsOf(s.id).length);
      if (!need.length) return toast('Mọi học sinh trong lớp đã có tài khoản HS và PH.');
      if (!confirm(`Tạo tài khoản cho ${need.length} học sinh (kèm tài khoản phụ huynh nếu chưa có)?`)) return;
      const creds = [], errs = [];
      for (const s of need) {
        try {
          if (!s.user_id) { const u = await freeUsername(baseUsername(s, 'student')); const pw = randPw(); await createAccount(u, pw, 'student', '', s.id); creds.push({ name: s.full_name, role: 'student', username: u, password: pw, cls: classOf(s.class_id).name }); (S.profiles = S.profiles || []).push({ username: u }); }
          if (!parentsOf(s.id).length) { const u = await freeUsername(baseUsername(s, 'parent')); const pw = randPw(); await createAccount(u, pw, 'parent', '', s.id); creds.push({ name: 'Phụ huynh ' + s.full_name, role: 'parent', username: u, password: pw, cls: classOf(s.class_id).name }); S.profiles.push({ username: u }); }
        } catch (e) { errs.push(`${s.full_name}: ${e.message}`); }
      }
      await reloadPeople(); R();
      if (errs.length) toast('Lỗi: ' + errs.join('; '), 8000);
      if (creds.length) showCredentials(creds, `Tài khoản lớp ${classOf(cst.classId).name}`);
    };
    $$('[data-mk1]', root).forEach(b => b.onclick = async () => {
      const s = studentRow(b.dataset.mk1); const u0 = await freeUsername(baseUsername(s, 'student'));
      dialog(`<h3>Tài khoản học sinh – ${esc(s.full_name)}</h3><label>Tên đăng nhập<input name="u" required pattern="[a-z0-9._]{3,30}" value="${u0}"></label><label>Mật khẩu<input name="p" required minlength="6" value="${randPw()}"></label>`, 'Tạo').onok = async (f) => {
        try { await createAccount(f.u.value.trim(), f.p.value, 'student', '', s.id); } catch (e) { return toast(e.message, 5000); }
        await reloadPeople(); R(); showCredentials([{ name: s.full_name, role: 'student', username: f.u.value.trim(), password: f.p.value, cls: (classOf(s.class_id) || {}).name }], 'Tài khoản mới');
      };
    });
    $$('[data-linkpar]', root).forEach(b => b.onclick = async () => {
      const s = studentRow(b.dataset.linkpar); const u0 = await freeUsername(baseUsername(s, 'parent'));
      const parents = (S.profiles || []).filter(p => p.role === 'parent');
      dialog(`<h3>Phụ huynh của ${esc(s.full_name)}</h3>
        <label class="check"><input type="radio" name="m" value="new" checked> Tạo tài khoản phụ huynh mới</label>
        <label>Tên đăng nhập<input name="u" pattern="[a-z0-9._]{3,30}" value="${u0}"></label><label>Mật khẩu<input name="p" minlength="6" value="${randPw()}"></label><label>Họ tên phụ huynh (không bắt buộc)<input name="n"></label>
        <label class="check"><input type="radio" name="m" value="old"> Gắn với tài khoản phụ huynh đã có (anh/chị/em ruột)</label>
        <label><select name="par"><option value="">—</option>${parents.map(p => `<option value="${p.id}">${esc(p.username)} – ${esc(p.full_name)}</option>`).join('')}</select></label>`, 'Lưu').onok = async (f) => {
        try {
          if (f.m.value === 'old') {
            if (!f.par.value) return toast('Hãy chọn tài khoản phụ huynh.');
            const { error } = await sb.rpc('admin_link_parent', { p_parent: f.par.value, p_student: s.id }); if (error) throw error;
            await reloadPeople(); R(); toast('Đã gắn phụ huynh.');
          } else {
            await createAccount(f.u.value.trim(), f.p.value, 'parent', f.n.value.trim(), s.id);
            await reloadPeople(); R();
            showCredentials([{ name: f.n.value.trim() || 'Phụ huynh ' + s.full_name, role: 'parent', username: f.u.value.trim(), password: f.p.value, cls: (classOf(s.class_id) || {}).name }], 'Tài khoản mới');
          }
        } catch (e) { toast(e.message, 5000); }
      };
    });
    $$('[data-rmst]', root).forEach(b => b.onclick = async () => {
      const s = studentRow(b.dataset.rmst); if (!confirm(`Xóa học sinh ${s.full_name}? (Điểm và bài nộp của em cũng bị xóa)`)) return;
      if (s.user_id && admin) await sb.rpc('admin_delete_account', { p_user: s.user_id });
      await push(sb.from('students').delete().eq('id', s.id), 'học sinh'); await reloadPeople(); R();
    });
    $$('[data-edst]', root).forEach(b => b.onclick = () => {
      const s = studentRow(b.dataset.edst);
      dialog(`<h3>Sửa học sinh</h3><label>Họ và tên<input name="n" required value="${esc(s.full_name)}"></label><label>SBD<input name="sbd" pattern="\\d{1,8}" value="${esc(s.sbd || '')}"></label>
        <label>Lớp<select name="c">${S.classes.map(c => `<option value="${c.id}" ${c.id === s.class_id ? 'selected' : ''}>${esc(c.name)} (${esc(c.school_year)})</option>`).join('')}</select></label>`, 'Lưu').onok = async (f) => {
        const c = classOf(f.c.value); const patch = { full_name: f.n.value.trim(), sbd: f.sbd.value.trim() || null, class_id: c.id, cohort_id: c.cohort_id || s.cohort_id };
        await push(sb.from('students').update(patch).eq('id', s.id), 'học sinh'); Object.assign(s, patch); R();
      };
    });
  }
  const lastName = (n) => { const p = String(n || '').trim().split(/\s+/); return p[p.length - 1] + ' ' + n; };

  function renderStaffBlock() {
    const ts = (S.profiles || []).filter(p => p.role === 'teacher' || p.role === 'admin').sort((a, b) => a.role.localeCompare(b.role));
    return `<h2>Giáo viên & quản trị</h2><table class="gr-table">${ts.map(t => `<tr><td>${esc(t.full_name)}</td><td>${esc(t.username)}</td><td>${ROLE_NAME[t.role]}${t.subjects && t.subjects.length ? ' · ' + t.subjects.join(', ') : ''}</td>
      <td>${t.id !== S.profile.id ? `<button class="btn sm" data-reset="${t.id}" title="Đặt lại mật khẩu">🔒</button><button class="btn sm danger" data-delacc="${t.id}" title="Xóa tài khoản">✕</button>` : '<span class="muted small">bạn</span>'}</td></tr>`).join('')}</table>
      <button class="btn sm" id="addTeacher">＋ Tạo tài khoản giáo viên</button>`;
  }
  function bindStaff(root, R) {
    $('#addTeacher', root).onclick = () => {
      const d = dialog(`<h3>Tạo tài khoản giáo viên</h3><label>Họ và tên<input name="n" required></label><label>Tên đăng nhập<input name="u" required pattern="[a-z0-9._]{3,30}" placeholder="vd: gv.hoa"></label>
        <label>Mật khẩu<input name="p" required minlength="6" value="${randPw()}"></label><label>Môn dạy<select name="s"><option value="toan">Toán</option></select></label>
        <label>Vai trò<select name="r"><option value="teacher">Giáo viên</option><option value="admin">Quản trị viên</option></select></label>`, 'Tạo');
      const form = document.querySelector('dialog.cl-dialog:last-of-type form');
      form.n.oninput = () => { if (!form.u.dataset.touched) { const w = noAccent(form.n.value).split(/\s+/).filter(Boolean); form.u.value = w.length ? 'gv.' + w[w.length - 1] + w.slice(0, -1).map(x => x[0]).join('') : ''; } };
      form.u.oninput = () => { form.u.dataset.touched = 1; };
      d.onok = async (f) => {
        try { await createAccount(f.u.value.trim(), f.p.value, f.r.value, f.n.value.trim(), null, [f.s.value]); } catch (e) { return toast(e.message, 5000); }
        await reloadPeople(); R();
        showCredentials([{ name: f.n.value.trim(), role: f.r.value, username: f.u.value.trim(), password: f.p.value }], 'Tài khoản mới');
      };
    };
  }
  // Hiện & in phiếu tài khoản (mật khẩu chỉ hiện MỘT LẦN, máy chủ không lưu mật khẩu gốc)
  function showCredentials(list, title) {
    const url = location.origin + location.pathname;
    const rows = list.map(c => `<tr><td>${esc(c.name)}</td><td>${ROLE_NAME[c.role] || ''}</td><td>${esc(c.cls || '')}</td><td><code>${esc(c.username)}</code></td><td><code>${esc(c.password)}</code></td></tr>`).join('');
    const d = dialog(`<h3>${esc(title)}</h3><p class="warn small">Mật khẩu chỉ hiện lần này. Hãy in hoặc tải danh sách ngay.</p>
      <div class="table-wrap" style="max-height:50vh;overflow:auto"><table class="gr-table"><tr><th>Họ tên</th><th>Vai trò</th><th>Lớp</th><th>Tên đăng nhập</th><th>Mật khẩu</th></tr>${rows}</table></div>
      <div class="row-actions" style="margin-top:8px"><button type="button" class="btn" id="credPrint">🖨 In phiếu tài khoản</button><button type="button" class="btn" id="credXlsx">⬇ Tải Excel</button></div>`, 'Đã lưu, đóng');
    const dlg = document.querySelector('dialog.cl-dialog:last-of-type');
    dlg.querySelector('#credPrint').onclick = () => {
      $('#printArea').innerHTML = `<div class="code-sheet">${list.map(c => `<div class="code-card"><b>${esc(c.name)}</b>${c.cls ? ' – Lớp ' + esc(c.cls) : ''}<br>Vai trò: ${ROLE_NAME[c.role] || ''}<br>Tên đăng nhập: <span class="big-code">${esc(c.username)}</span><br>Mật khẩu: <span class="big-code">${esc(c.password)}</span><br><small>Đăng nhập tại ${esc(url)}. Nên đổi mật khẩu sau lần đăng nhập đầu (nút “Đổi mật khẩu”).</small></div>`).join('')}</div>`;
      dlg.close(); dlg.remove(); document.body.classList.add('printing'); setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 50);
    };
    dlg.querySelector('#credXlsx').onclick = async () => {
      const blob = await GR.xlsx([[title], [], ['Họ tên', 'Vai trò', 'Lớp', 'Tên đăng nhập', 'Mật khẩu', 'Địa chỉ đăng nhập'], ...list.map(c => [c.name, ROLE_NAME[c.role] || '', c.cls || '', c.username, c.password, url])]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tai-khoan.xlsx'; a.click();
    };
    return d;
  }

  // ======================= DUYỆT TÀI KHOẢN (Admin) =======================
  const simpl = (t) => noAccent(t).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  async function loadRegistrations() {
    const { data, error } = await sb.from('registrations').select('*').order('created_at');
    if (error) { toast('Lỗi tải đơn đăng ký: ' + error.message, 5000); return; }
    S.registrations = data; updateApproveBadge();
    if (G.CLOUD.current === 'home' && G.CLOUD.views.home) G.CLOUD.views.home.render(document.getElementById('homeRoot'));
  }
  function updateApproveBadge() { if (G.CLOUD.updateBadges) G.CLOUD.updateBadges(); }
  const classMatch = (name, grade) => {
    const n = String(name || '').replace(/\s/g, '').toUpperCase(); if (!n) return null;
    return S.classes.filter(c => c.name.replace(/\s/g, '').toUpperCase() === n && (!grade || +c.grade === +grade))
      .sort((a, b) => (b.school_year || '').localeCompare(a.school_year || ''))[0] || null;
  };
  const studentOptions = (r, onlyFree) => {
    const target = simpl(r.role === 'parent' ? r.child_name : r.full_name); const cls = classMatch(r.class_name, r.grade);
    return S.students.filter(s => !onlyFree || !s.user_id).map(s => {
      const nm = simpl(s.full_name); let sc = 0;
      if (nm === target) sc += 10; else if (target && (nm.includes(target) || target.includes(nm))) sc += 5;
      else if (target && nm.split(' ').pop() === target.split(' ').pop()) sc += 2;
      if (cls && s.class_id === cls.id) sc += 3;
      return { s, sc };
    }).sort((a, b) => b.sc - a.sc || a.s.full_name.localeCompare(b.s.full_name, 'vi'));
  };
  const ROLE_TAG = { student: 'Học sinh', teacher: 'Giáo viên', parent: 'Phụ huynh' };
  async function renderApprove(root) {
    if (!S.registrations) await loadRegistrations();
    const list = (S.registrations || []).slice().sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || String(a.created_at).localeCompare(String(b.created_at)));
    const pend = list.filter(r => r.status === 'pending');
    const classOpts = (sel) => S.classes.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi')).map(c => `<option value="${c.id}" ${sel && sel.id === c.id ? 'selected' : ''}>${esc(c.name)} · khối ${c.grade} · ${esc(c.school_year)}</option>`).join('');
    root.innerHTML = `<div class="row-actions" style="margin-bottom:8px"><h2 style="margin:0">Đơn đăng ký chờ duyệt (${pend.length})</h2><span class="spacer"></span><button class="btn sm" id="apReload">↻ Tải lại</button></div>
      <p class="muted small">Kiểm tra thông tin rồi bấm <b>Duyệt</b>. Tài khoản được tạo đúng vai trò đã đăng ký; người dùng đăng nhập bằng số điện thoại và mật khẩu họ đã chọn. Chưa duyệt thì không đăng nhập được.</p>
      ${list.map(r => {
        const cls = classMatch(r.class_name, r.grade); const homeCls = classMatch(r.homeroom);
        let ctl = '';
        if (r.role === 'student') {
          const opts = studentOptions(r, true).slice(0, 60);
          ctl = `<label>Gắn với hồ sơ học sinh<select data-k="student"><option value="">➕ Tạo hồ sơ mới trong lớp bên dưới</option>${opts.map(o => `<option value="${o.s.id}" ${o.sc >= 13 ? 'selected' : ''}>${esc(o.s.full_name)} – ${esc((classOf(o.s.class_id) || {}).name || '?')}${o.s.sbd ? ' · SBD ' + esc(o.s.sbd) : ''}</option>`).join('')}</select></label>
            <label>Lớp<select data-k="class"><option value="">— chọn lớp —</option>${classOpts(cls)}</select></label>
            ${!cls && r.class_name ? `<button class="btn sm" data-mkcls="${r.id}">＋ Tạo lớp ${esc(r.class_name)} (khối ${r.grade || '?'})</button>` : ''}`;
        } else if (r.role === 'parent') {
          const opts = studentOptions(r, false).slice(0, 60);
          ctl = `<label>Là phụ huynh của học sinh<select data-k="student"><option value="">— chọn học sinh —</option>${opts.map(o => `<option value="${o.s.id}" ${o.sc >= 10 ? 'selected' : ''}>${esc(o.s.full_name)} – ${esc((classOf(o.s.class_id) || {}).name || '?')}</option>`).join('')}</select></label>
            ${opts.length && opts[0].sc >= 10 ? '' : '<p class="warn small">Chưa thấy học sinh trùng tên. Hãy nhập học sinh vào lớp (tab Lớp & học sinh) hoặc duyệt tài khoản của con trước.</p>'}`;
        } else {
          ctl = `<label>Môn dạy<input data-k="subjects" value="${esc(r.subject || '')}"></label>
            <label>Lớp chủ nhiệm<select data-k="class"><option value="">— không chủ nhiệm —</option>${classOpts(homeCls)}</select></label>
            ${!homeCls && r.homeroom ? `<p class="warn small">Chưa có lớp ${esc(r.homeroom)} trong hệ thống.</p><button class="btn sm" data-mkcls="${r.id}">＋ Tạo lớp ${esc(r.homeroom)} rồi chọn làm lớp chủ nhiệm</button>` : ""}`;
        }
        return `<div class="card ap-card ${r.status}" data-id="${r.id}">
          <div class="card-head"><span class="tag ap-role-${r.role}">${ROLE_TAG[r.role]}</span><b>${esc(r.full_name)}</b><span class="tag">☎ ${esc(r.phone)}</span>
            <span class="tag muted">gửi ${fmtDate(r.created_at)}</span>${r.status === 'rejected' ? `<span class="tag warn">Đã từ chối${r.note ? ': ' + esc(r.note) : ''}</span>` : ''}</div>
          <div class="ap-info small">${r.role === 'teacher' ? `Môn: <b>${esc(r.subject || '')}</b> · Chủ nhiệm: <b>${esc(r.homeroom || 'không')}</b>`
            : r.role === 'parent' ? `Con: <b>${esc(r.child_name || '')}</b> · Lớp <b>${esc(r.class_name || '')}</b> · Khối ${esc(r.grade || '')} · Khóa ${esc(r.cohort || '')}`
            : `Lớp <b>${esc(r.class_name || '')}</b> · Khối ${esc(r.grade || '')} · Khóa ${esc(r.cohort || '')}`}</div>
          ${r.status === 'pending' ? `<div class="ap-ctl">${ctl}</div><div class="row-actions"><button class="btn primary sm" data-ok="${r.id}">✔ Duyệt</button><button class="btn sm danger" data-no="${r.id}">✘ Từ chối</button></div>`
            : `<div class="row-actions"><button class="btn sm danger" data-del="${r.id}">Xóa đơn</button></div>`}
        </div>`; }).join('') || '<p class="muted">Không có đơn đăng ký nào.</p>'}`;
    const R = () => renderApprove(root);
    $('#apReload', root).onclick = async () => { await loadRegistrations(); await reloadPeople(); R(); };
    const val = (id, k) => { const el = root.querySelector(`.ap-card[data-id="${id}"] [data-k="${k}"]`); return el ? el.value : ''; };
    $$('[data-ok]', root).forEach(b => b.onclick = async () => {
      const r = S.registrations.find(x => x.id === b.dataset.ok);
      const args = { p_id: r.id, p_student: null, p_class: null, p_subjects: null };
      if (r.role === 'student') { args.p_student = val(r.id, 'student') || null; args.p_class = val(r.id, 'class') || null; if (!args.p_student && !args.p_class) return toast('Hãy chọn hồ sơ học sinh có sẵn hoặc chọn lớp để tạo hồ sơ mới.', 5000); }
      if (r.role === 'parent') { args.p_student = val(r.id, 'student') || null; if (!args.p_student) return toast('Hãy chọn học sinh là con.', 4000); }
      if (r.role === 'teacher') { args.p_class = val(r.id, 'class') || null; args.p_subjects = val(r.id, 'subjects').split(/[,;]/).map(s => s.trim()).filter(Boolean); }
      b.disabled = true;
      // GV đăng ký chủ nhiệm một lớp chưa có trong hệ thống → tự tạo lớp đó rồi giao chủ nhiệm
      if (r.role === 'teacher' && !args.p_class && r.homeroom && !classMatch(r.homeroom)) { const d = await makeClassFor(r); if (d) args.p_class = d.id; }
      const { error } = await sb.rpc('admin_approve_registration', args);
      if (error) { b.disabled = false; return toast('Không duyệt được: ' + error.message, 6000); }
      toast(`Đã duyệt ${ROLE_TAG[r.role].toLowerCase()} ${r.full_name}. Đăng nhập bằng SĐT ${r.phone}.`, 5000);
      S.registrations = S.registrations.filter(x => x.id !== r.id); updateApproveBadge();
      await reloadPeople(); S.classes = await fetchAll('classes'); R();
    });
    $$('[data-no]', root).forEach(b => b.onclick = () => {
      const r = S.registrations.find(x => x.id === b.dataset.no);
      dialog(`<h3>Từ chối đăng ký – ${esc(r.full_name)}</h3><label>Lý do (người đăng ký sẽ thấy khi đăng nhập)<input name="n" placeholder="VD: Thông tin lớp không khớp danh sách"></label>`, 'Từ chối').onok = async (f) => {
        const { error } = await sb.rpc('admin_reject_registration', { p_id: r.id, p_note: f.n.value });
        if (error) return toast(error.message, 5000);
        Object.assign(r, { status: 'rejected', note: f.n.value }); updateApproveBadge(); R();
      };
    });
    $$('[data-del]', root).forEach(b => b.onclick = async () => {
      await push(sb.from('registrations').delete().eq('id', b.dataset.del), 'đơn'); S.registrations = S.registrations.filter(x => x.id !== b.dataset.del); R();
    });
    $$('[data-mkcls]', root).forEach(b => b.onclick = async () => {
      const r = S.registrations.find(x => x.id === b.dataset.mkcls);
      if (await makeClassFor(r)) R();
    });
  }
  // tạo lớp (và khóa nếu cần) theo thông tin trên đơn đăng ký
  async function makeClassFor(r) {
    {
      const cname = String((r.role === 'teacher' ? r.homeroom : r.class_name) || '').trim().toUpperCase();
      const grade = +r.grade || +(cname.match(/^(1[012])/) || [])[1] || 10;
      const y = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      const s0 = y - (grade - 10);
      let co = S.cohorts.find(c => c.name === r.cohort) || S.cohorts.find(c => c.name === `${s0}-${s0 + 3}`);
      const coName = r.cohort && /^\d{4}-\d{4}$/.test(r.cohort) ? r.cohort : `${s0}-${s0 + 3}`;
      if (!co) co = await push(sb.from('cohorts').insert({ name: coName, end_date: coName.slice(5) + '-06-30' }).select().single(), 'khóa').then(d => (S.cohorts.push(d), d)).catch(() => null);
      const d = await push(sb.from('classes').insert({ name: cname, grade, cohort_id: co ? co.id : null, school_year: `${y}-${y + 1}` }).select().single(), 'lớp').catch(() => null);
      if (d) { S.classes.push(d); toast(`Đã tạo lớp ${d.name}.`); }
      return d;
    }
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
      const row = { class_id: st.classId, subject: G.CLOUD.subject || 'toan', grade, chapter: st.chapter, topic: st.topic || null, title: $('#hwTitle', root).value.trim() || 'Bài tập về nhà', question_ids: [...st.picked], due_at: due ? new Date(due).toISOString() : null };
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
      </div>`;
  }
  function bindChildPicker(root, R) {
    const s = $('#childSel', root); if (s) s.onchange = (e) => { hw.child = e.target.value; R(); };
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

  // API cho portal.js (các trang Tổng quan, Tài khoản, Phân công, Chủ nhiệm, Bảng điểm, Liên hệ)
  G.CLOUD.api = { sb, S, esc, toast, tex, dialog, push, fetchAll, classOf, cohortOf, studentRow, ROLE_NAME, fmtDate, lastName, reloadPeople,
    openView: (v) => openView(v), subjectName, subjectCode, SUBJECT_LIST, hw, randPw, showCredentials, createAccount, profileOf, parentsOf, loadRegistrations };

  // khởi động
  document.body.classList.add('auth-needed');
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.reload(); });
  // khởi động sau khi MỌI script (kể cả portal.js) đã nạp xong
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})(window);
