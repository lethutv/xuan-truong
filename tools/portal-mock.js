// Supabase GIẢ LẬP để xem thử giao diện cổng quản lý theo từng vai trò, không cần máy chủ.
// Dùng: mở tools/portal-test.html?role=admin|teacher|homeroom|student|parent qua localhost.
(function (G) {
  const role = new URLSearchParams(location.search).get('role') || 'admin';
  const id = (n) => '00000000-0000-0000-0000-' + String(n).padStart(12, '0');
  const now = new Date().toISOString();
  const cohort = { id: id(900), name: '2025-2028', end_date: '2028-06-30' };
  const classes = [{ id: id(801), name: '10A1', grade: 10, cohort_id: cohort.id, school_year: '2025-2026' }, { id: id(802), name: '10A2', grade: 10, cohort_id: cohort.id, school_year: '2025-2026' }];
  const profiles = [
    { id: id(1), role: 'admin', username: 'admin', full_name: 'Quản trị viên', subjects: [], phone: null, created_at: now },
    { id: id(2), role: 'teacher', username: '0911222333', full_name: 'Trần Thị Lan', subjects: ['Toán'], phone: '0911222333', created_at: now },
    { id: id(3), role: 'teacher', username: '0911222444', full_name: 'Lê Văn Minh', subjects: ['Ngữ văn'], phone: '0911222444', created_at: now },
    { id: id(4), role: 'student', username: '0912345678', full_name: 'Nguyễn Văn Nam', subjects: [], phone: '0912345678', created_at: now },
    { id: id(5), role: 'parent', username: '0987654321', full_name: 'Nguyễn Văn Bố', subjects: [], phone: '0987654321', created_at: now }];
  const students = [
    { id: id(101), full_name: 'Nguyễn Văn Nam', sbd: '10012345', class_id: classes[0].id, cohort_id: cohort.id, user_id: id(4) },
    { id: id(102), full_name: 'Lưu Khánh Linh', sbd: '10012346', class_id: classes[0].id, cohort_id: cohort.id, user_id: null },
    { id: id(103), full_name: 'Trần Thu Hà', sbd: '10012347', class_id: classes[0].id, cohort_id: cohort.id, user_id: null },
    { id: id(104), full_name: 'Phạm Quốc Bảo', sbd: '10012350', class_id: classes[1].id, cohort_id: cohort.id, user_id: null }];
  const tcs = [{ teacher_id: id(2), class_id: classes[0].id, subject: 'gvcn', homeroom: true }, { teacher_id: id(2), class_id: classes[0].id, subject: 'toan', homeroom: false }, { teacher_id: id(3), class_id: classes[0].id, subject: 'van', homeroom: false }];
  const exams = [{ id: 'ex1', name: 'Giữa kỳ I – Toán 10', owner_id: id(2), updated_at: now, data: { id: 'ex1', name: 'Giữa kỳ I – Toán 10', config: { subject: 'toan', grade: '10', chapters: [] }, versions: [{ code: '0101', items: [] }], header: {}, points: {} } },
    { id: 'ex2', name: 'Kiểm tra 15 phút Văn', owner_id: id(3), updated_at: now, data: { id: 'ex2', name: 'Kiểm tra 15 phút Văn', config: { subject: 'van', grade: '10', chapters: [] }, versions: [{ code: '0101', items: [] }], header: {}, points: {} } }];
  const results = [
    { id: 'r1', exam_id: 'ex1', exam_name: 'Giữa kỳ I – Toán 10', student_id: id(101), sbd: '10012345', version_code: '0101', total: 8.25, p1: 2.75, p2: 3, p3: 2.5, graded_by: id(2), created_at: now, image_path: null },
    { id: 'r2', exam_id: 'ex1', exam_name: 'Giữa kỳ I – Toán 10', student_id: id(102), sbd: '10012346', version_code: '0101', total: 4.5, p1: 1.5, p2: 1.5, p3: 1.5, graded_by: id(2), created_at: now },
    { id: 'r3', exam_id: 'ex2', exam_name: 'Kiểm tra 15 phút Văn', student_id: id(101), total: 7, graded_by: id(3), created_at: now }];
  const assignments = [{ id: 'a1', teacher_id: id(2), class_id: classes[0].id, subject: 'toan', grade: 10, chapter: '10-1', title: 'Bài tập: Mệnh đề', question_ids: ['10-1-01', '10-1-02'], due_at: new Date(Date.now() + 86400000 * 2).toISOString(), created_at: now }];
  const submissions = [{ id: 's1', assignment_id: 'a1', student_id: id(101), score: 2, max_score: 2, detail: {}, answers: {}, submitted_at: now }];
  const registrations = [{ id: 'g1', role: 'teacher', full_name: 'Đỗ Thị Hoa', phone: '0933444555', subject: 'Tiếng Anh', homeroom: '10A2', status: 'pending', created_at: now },
    { id: 'g2', role: 'parent', full_name: 'Lưu Văn Hùng', phone: '0944555666', child_name: 'Lưu Khánh Linh', class_name: '10A1', grade: 10, cohort: '2025-2028', status: 'pending', created_at: now }];
  const me = { admin: id(1), teacher: id(3), homeroom: id(2), student: id(4), officer: id(4), parent: id(5) }[role];
  // ?role=officer: học sinh Nguyễn Văn Nam là lớp trưởng 10A1
  if (role === 'officer') students[0].officer = 'lop_truong';
  const visibleStudents = role === 'officer' ? students.filter(s => s.class_id === students[0].class_id) : role === 'student' ? students.filter(s => s.user_id === me) : role === 'parent' ? students.filter(s => s.id === id(101)) : students;
  const kidIds = new Set(visibleStudents.map(s => s.id));
  const qs = (G.QBANK || []).map(q => ({ id: q.id, subject: 'toan', pool: q.id.match(/-(\d+)$/) && +q.id.match(/-(\d+)$/)[1] >= 21 ? 'exam' : 'practice', grade: q.grade, chapter: q.chapter, topic: q.topic, type: q.type, level: q.level, data: q, deleted: false }));
  const staff = role === 'admin' || role === 'teacher' || role === 'homeroom';
  const D = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
  const hr = {
    att: [[101, 0, "present"], [102, 0, "absent", "không báo"], [103, 0, "late", "muộn 10 phút"], [101, 1, "present"], [102, 1, "excused", "ốm"], [103, 1, "present"], [102, 3, "absent"], [102, 5, "excused"]].map(([s, k, st, note], i) => ({ id: "at" + i, class_id: classes[0].id, student_id: id(s), date: D(k), session: "sang", status: st, note: note || null })),
    ev: [[101, 0, "reward", "Phát biểu xây dựng bài", 2], [101, 2, "reward", "Đạt điểm 9–10", 3], [102, 0, "violation", "Không học bài / không làm bài tập", -3], [102, 1, "violation", "Đi học muộn", -2], [103, 0, "violation", "Không mặc đồng phục", -2]].map(([s, k, kind, cat, p], i) => ({ id: "ev" + i, class_id: classes[0].id, student_id: id(s), date: D(k), kind, category: cat, points: p, note: null, created_at: now })),
    tasks: [{ id: "t1", class_id: classes[0].id, title: "Họp phụ huynh giữa kỳ I", kind: "meeting", due_at: new Date(Date.now() + 3 * 864e5).toISOString(), done: false, note: "Phòng 10A1" }, { id: "t2", class_id: classes[0].id, title: "Thu hồ sơ bảo hiểm y tế", kind: "task", due_at: new Date(Date.now() - 864e5).toISOString(), done: false }, { id: "t3", class_id: classes[0].id, title: "Sinh hoạt lớp tuần", kind: "event", due_at: new Date().toISOString(), done: true }]
  };
  const T = {
    questions: staff ? qs : qs.filter(q => q.pool === 'practice'), classes, cohorts: [cohort], students: visibleStudents,
    profiles: staff ? profiles : profiles.filter(p => p.id === me), exams: staff ? exams : [],
    results: staff ? results : results.filter(r => kidIds.has(r.student_id)), assignments: staff ? assignments : assignments.filter(a => visibleStudents.some(s => s.class_id === a.class_id)),
    submissions: staff ? submissions : submissions.filter(s => kidIds.has(s.student_id)), parent_links: [{ parent_id: id(5), student_id: id(101) }], teacher_classes: tcs, registrations,
    attendance: hr.att.filter(a => staff || role === 'officer' || kidIds.has(a.student_id)), conduct_events: hr.ev.filter(e => staff || role === 'officer' || kidIds.has(e.student_id)), homeroom_tasks: staff ? hr.tasks : []
  };
  const ok = (data) => Promise.resolve({ data, error: null });
  function query(table) {
    let rows = (T[table] || []).slice(); let single = false;
    const q = {
      select() { return q; }, range() { return q; }, order() { return q; }, match() { return q; },
      eq(k, v) { rows = rows.filter(r => String(r[k]) === String(v)); return q; }, gte(k, v) { rows = rows.filter(r => String(r[k]) >= String(v)); return q; },
      single() { single = true; return q; },
      insert(x) { const arr = [].concat(x).map(r => Object.assign({ id: 'n' + Math.random().toString(36).slice(2, 8), created_at: now }, r)); (T[table] = T[table] || []).push(...arr); rows = arr; return q; },
      upsert(x) { return q.insert(x); }, update() { return q; }, delete() { return q; },
      then(res, rej) { return ok(single ? rows[0] : rows).then(res, rej); }
    };
    return q;
  }
  G.supabase = { createClient: () => ({
    auth: { getSession: () => ok({ session: { user: { id: me } } }), signOut: () => ok(null), onAuthStateChange() {}, updateUser: () => ok({}), signInWithPassword: () => ok({}) },
    from: query,
    rpc: (name) => name === 'my_contacts' ? ok(tcs.map(t => { const p = profiles.find(x => x.id === t.teacher_id); const s = visibleStudents[0]; return { student_id: s && s.id, student_name: s && s.full_name, class_name: '10A1', teacher_name: p.full_name, teacher_phone: p.phone, subject: { gvcn: 'Chủ nhiệm', toan: 'Toán', van: 'Ngữ văn' }[t.subject], homeroom: t.homeroom }; })) : ok(null),
    storage: { from: () => ({ upload: () => ok({}), download: () => ok(null), remove: () => ok({}), createSignedUrl: () => ok({ signedUrl: '' }) }) }
  }) };
  if (role === 'homeroom') { /* giáo viên chủ nhiệm = Trần Thị Lan */ }
  // profile của người đang xem
  T.profiles_me = profiles.find(p => p.id === me);
  const origFrom = query;
  G.supabase.createClient = ((cc) => () => { const c = cc(); const f = c.from; c.from = (t) => { const qq = f(t); if (t === 'profiles') { const oe = qq.eq; qq.eq = (k, v) => { if (k === 'id' && v === me) { const s = query('__'); s.then = (res) => ok(profiles.find(p => p.id === me)).then(res); return s; } return oe(k, v); }; } return qq; }; return c; })(G.supabase.createClient);
})(window);
