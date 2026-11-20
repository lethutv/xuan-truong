// Cổng quản lý (chế độ trực tuyến): Tổng quan, Tài khoản, Phân công giảng dạy, Lớp chủ nhiệm, Bảng điểm, Liên hệ.
(function (G) {
  'use strict';
  if (!G.CLOUD || !G.CLOUD.online) return;
  const V = G.CLOUD.views;
  const A = () => G.CLOUD.api;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const f2 = (n) => n == null || n === '' || isNaN(n) ? '' : (Math.round(n * 100) / 100).toString().replace('.', ',');
  const avg = (a) => { const x = a.filter(v => v != null && !isNaN(v)); return x.length ? x.reduce((t, v) => t + +v, 0) / x.length : null; };
  const card = (n, label, icon, go, tone) => `<button class="kpi ${tone || ''}" ${go ? `data-go="${go}"` : 'disabled'}><span class="kpi-ico">${icon}</span><span class="kpi-n">${n}</span><span class="kpi-l">${label}</span></button>`;
  const bindGo = (root) => $$('[data-go]', root).forEach(b => b.onclick = () => A().openView(b.dataset.go));
  const me = () => A().S.profile;
  const myClasses = (homeroomOnly) => { const { S } = A(); const ids = new Set((S.teacherClasses || []).filter(t => t.teacher_id === me().id && (!homeroomOnly || t.homeroom)).map(t => t.class_id)); return S.classes.filter(c => ids.has(c.id)); };
  const studentsOf = (cid) => { const { S, lastName } = A(); return S.students.filter(s => s.class_id === cid).sort((a, b) => lastName(a.full_name).localeCompare(lastName(b.full_name), 'vi')); };
  const examSubject = (examId) => { const e = A().S.exams.find(x => x.id === examId); return (e && e.config && e.config.subject) || 'toan'; };
  const classSel = (id, list, sel, label) => `<label class="inline-l">${label || 'Lớp'} <select id="${id}">${list.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${A().esc(c.name)}${c.school_year ? ' · ' + A().esc(c.school_year) : ''}</option>`).join('')}</select></label>`;

  // ======================= TỔNG QUAN =======================
  V.home = { render: async (root) => {
    const { S, esc, fmtDate, ROLE_NAME } = A(); const role = me().role;
    const hello = `<div class="hello"><h1>Xin chào, ${esc(me().full_name || me().username)}</h1><p class="muted">${ROLE_NAME[role]}${role === 'teacher' ? ' · ' + esc((me().subjects || []).join(', ') || 'chưa có môn') : ''} · ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}</p></div>`;
    if (role === 'admin') {
      const pend = (S.registrations || []).filter(r => r.status === 'pending');
      const cnt = (r) => (S.profiles || []).filter(p => p.role === r).length;
      const recent = S.results.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6);
      root.innerHTML = hello + `<div class="kpis">${card(pend.length, 'Đơn chờ duyệt', '✅', 'approve', pend.length ? 'hot' : '')}${card(cnt('teacher'), 'Giáo viên', '🧑‍🏫', 'accounts')}${card(cnt('student'), 'Tài khoản học sinh', '🎒', 'accounts')}${card(cnt('parent'), 'Phụ huynh', '👪', 'accounts')}
        ${card(S.classes.length, 'Lớp học', '🏫', 'classes')}${card(S.students.length, 'Học sinh trong danh sách', '📋', 'classes')}${card(S.exams.length, 'Đề kiểm tra', '📝', 'saved')}${card(S.results.length, 'Bài đã chấm', '📷', 'grade')}</div>
        <div class="home-grid"><div class="panel"><h2>Đơn đăng ký mới</h2>${pend.slice(0, 6).map(r => `<div class="li"><span class="tag ap-role-${r.role}">${{ student: 'HS', teacher: 'GV', parent: 'PH' }[r.role]}</span> ${esc(r.full_name)} <span class="muted small">${esc(r.phone)} · ${fmtDate(r.created_at)}</span></div>`).join('') || '<p class="muted">Không có đơn mới.</p>'}
          ${pend.length ? '<button class="btn sm primary" data-go="approve">Duyệt ngay</button>' : ''}</div>
          <div class="panel"><h2>Bài chấm gần đây</h2>${recent.map(r => `<div class="li">${esc(r.exam_name)} · <b>${f2(r.total)}</b> <span class="muted small">${esc((A().studentRow(r.student_id) || {}).full_name || 'SBD ' + (r.sbd || '?'))} · ${fmtDate(r.created_at)}</span></div>`).join('') || '<p class="muted">Chưa có bài chấm.</p>'}</div>
          <div class="panel"><h2>Thao tác nhanh</h2><div class="quick">${[['create', '📝 Tạo đề kiểm tra'], ['grade', '📷 Chấm phiếu'], ['gradebook', '📊 Bảng điểm'], ['assign', '🧑‍🏫 Phân công giảng dạy'], ['classes', '🏫 Lớp & học sinh'], ['homework', '📚 Giao bài tập']].map(([v, l]) => `<button class="btn" data-go="${v}">${l}</button>`).join('')}</div></div></div>`;
    } else if (role === 'teacher') {
      const hr = myClasses(true), mine = myClasses(false);
      const exams = S.exams.filter(e => e.ownerId === me().id), asg = S.assignments.filter(a => a.teacher_id === me().id);
      const graded = S.results.filter(r => r.graded_by === me().id);
      root.innerHTML = hello + `<div class="kpis">${card(exams.length, 'Đề của tôi', '📝', 'saved')}${card(graded.length, 'Bài tôi đã chấm', '📷', 'grade')}${card(asg.length, 'Bài tập đã giao', '📚', 'homework')}${card(mine.length, 'Lớp được phân công', '🏫', 'gradebook')}</div>
        <div class="home-grid">${hr.map(c => { const st = studentsOf(c.id); const noAcc = st.filter(s => !s.user_id).length;
          const rs = S.results.filter(r => st.some(s => s.id === r.student_id)); const a = avg(rs.map(r => r.total));
          return `<div class="panel"><h2>⭐ Lớp chủ nhiệm ${esc(c.name)}</h2><div class="li">Sĩ số: <b>${st.length}</b> · chưa có tài khoản: <b>${noAcc}</b></div><div class="li">Điểm TB các bài kiểm tra: <b>${f2(a) || '—'}</b></div><button class="btn sm primary" data-go="homeroom">Quản lý lớp</button></div>`; }).join('')}
          <div class="panel"><h2>Bài tập đã giao</h2>${asg.slice(-6).reverse().map(a => { const n = S.students.filter(s => s.class_id === a.class_id).length, sub = S.submissions.filter(x => x.assignment_id === a.id).length;
            return `<div class="li">${esc(a.title)} · ${esc((A().classOf(a.class_id) || {}).name || '')} <span class="muted small">nộp ${sub}/${n}</span></div>`; }).join('') || '<p class="muted">Chưa giao bài tập.</p>'}<button class="btn sm" data-go="homework">Giao bài mới</button></div>
          <div class="panel"><h2>Thao tác nhanh</h2><div class="quick">${[['create', '📝 Tạo đề'], ['bank', '🗂️ Ngân hàng câu hỏi'], ['grade', '📷 Chấm phiếu'], ['gradebook', '📊 Bảng điểm']].map(([v, l]) => `<button class="btn" data-go="${v}">${l}</button>`).join('')}</div></div></div>`;
    } else {
      const kid = role === 'parent' ? (A().studentRow(A().hw.child) || S.students[0]) : S.students[0];
      if (!kid) { root.innerHTML = hello + '<p class="muted">Tài khoản chưa được gắn với học sinh. Liên hệ quản trị viên.</p>'; return; }
      const rs = S.results.filter(r => r.student_id === kid.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const asg = S.assignments.filter(a => a.class_id === kid.class_id);
      const todo = asg.filter(a => !S.submissions.some(s => s.assignment_id === a.id && s.student_id === kid.id));
      const late = todo.filter(a => a.due_at && new Date(a.due_at) < new Date());
      let contacts = []; try { const { data } = await A().sb.rpc('my_contacts'); contacts = (data || []).filter(c => c.student_id === kid.id); } catch (e) { /* bỏ qua */ }
      const gvcn = contacts.find(c => c.homeroom);
      root.innerHTML = hello + (role === 'parent' ? `<p class="child-line">Đang xem: <b>${esc(kid.full_name)}</b> – lớp ${esc((A().classOf(kid.class_id) || {}).name || '')}</p>` : '') +
        `<div class="kpis">${card(f2(avg(rs.map(r => r.total))) || '—', 'Điểm TB bài kiểm tra', '📊', 'scores')}${card(rs.length, 'Bài kiểm tra đã chấm', '📝', 'scores')}${card(todo.length, 'Bài tập chưa nộp', '📚', 'homework', todo.length ? 'hot' : '')}${card(late.length, 'Bài tập quá hạn', '⏰', 'homework', late.length ? 'hot' : '')}</div>
        <div class="home-grid"><div class="panel"><h2>Điểm gần đây</h2>${rs.slice(0, 6).map(r => `<div class="li">${esc(r.exam_name)} · <b>${f2(r.total)}</b> <span class="muted small">${fmtDate(r.created_at)}</span></div>`).join('') || '<p class="muted">Chưa có điểm.</p>'}</div>
          <div class="panel"><h2>Bài tập cần làm</h2>${todo.slice(0, 6).map(a => `<div class="li">${esc(a.title)} ${a.due_at ? `<span class="muted small">hạn ${fmtDate(a.due_at)}</span>` : ''}</div>`).join('') || '<p class="muted">Không còn bài tập nào.</p>'}${role === 'student' && todo.length ? '<button class="btn sm primary" data-go="homework">Làm bài</button>' : ''}</div>
          <div class="panel"><h2>Giáo viên chủ nhiệm</h2>${gvcn ? `<div class="li"><b>${esc(gvcn.teacher_name)}</b>${gvcn.teacher_phone ? ` · <a href="tel:${esc(gvcn.teacher_phone)}">☎ ${esc(gvcn.teacher_phone)}</a>` : ''}</div>` : '<p class="muted">Chưa có thông tin.</p>'}<button class="btn sm" data-go="contact">Tất cả giáo viên</button>
            ${role === 'student' ? '<button class="btn sm" data-go="practice">🎯 Luyện tập</button>' : ''}</div></div>`;
    }
    bindGo(root);
  } };

  // ======================= TÀI KHOẢN (Admin) =======================
  const acc = { role: '', q: '' };
  V.accounts = { render: (root) => {
    const { S, esc, ROLE_NAME, fmtDate, classOf } = A();
    const linkOf = (p) => {
      if (p.role === 'student') { const s = S.students.find(x => x.user_id === p.id); return s ? `Lớp ${esc((classOf(s.class_id) || {}).name || '?')}` : '<span class="warn">chưa gắn hồ sơ</span>'; }
      if (p.role === 'parent') { const kids = (S.parentLinks || []).filter(l => l.parent_id === p.id).map(l => A().studentRow(l.student_id)).filter(Boolean); return kids.length ? 'Con: ' + kids.map(k => esc(k.full_name)).join(', ') : '<span class="warn">chưa gắn con</span>'; }
      const tc = (S.teacherClasses || []).filter(t => t.teacher_id === p.id);
      return [esc((p.subjects || []).join(', ')), ...tc.filter(t => t.homeroom).map(t => 'GVCN ' + esc((classOf(t.class_id) || {}).name || ''))].filter(Boolean).join(' · ');
    };
    const q = acc.q.toLowerCase();
    const list = (S.profiles || []).filter(p => (!acc.role || p.role === acc.role) && (!q || (p.full_name + ' ' + p.username + ' ' + (p.phone || '')).toLowerCase().includes(q)))
      .sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, 'vi'));
    const cnt = (r) => (S.profiles || []).filter(p => !r || p.role === r).length;
    root.innerHTML = `<div class="row-actions page-head"><h2>Tài khoản</h2><span class="spacer"></span><button class="btn sm primary" id="accNewT">＋ Tài khoản giáo viên</button><button class="btn sm" data-go="classes">＋ Tài khoản HS/PH (theo lớp)</button></div>
      <div class="seg acc-roles">${[['', 'Tất cả'], ['admin', 'Quản trị'], ['teacher', 'Giáo viên'], ['student', 'Học sinh'], ['parent', 'Phụ huynh']].map(([r, l]) => `<button data-r="${r}" class="${acc.role === r ? 'active' : ''}">${l} (${cnt(r)})</button>`).join('')}</div>
      <input id="accQ" placeholder="Tìm tên, tên đăng nhập, SĐT…" value="${esc(acc.q)}" style="margin:8px 0;width:min(360px,100%)">
      <div class="table-wrap"><table class="gr-table"><thead><tr><th>Họ tên</th><th>Đăng nhập</th><th>Vai trò</th><th>Thông tin</th><th>Tạo ngày</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td>${esc(p.full_name)}</td><td>${esc(p.username)}</td><td><span class="tag ap-role-${p.role}">${ROLE_NAME[p.role]}</span></td><td class="small">${linkOf(p)}</td><td class="small muted">${fmtDate(p.created_at)}</td>
        <td>${p.id !== me().id ? `<button class="btn sm" data-reset="${p.id}" title="Đặt lại mật khẩu">🔒</button><button class="btn sm danger" data-del="${p.id}" title="Xóa tài khoản">✕</button>` : '<span class="muted small">bạn</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Không có tài khoản phù hợp.</td></tr>'}</tbody></table></div>`;
    const R = () => V.accounts.render(root);
    bindGo(root);
    $$('.acc-roles button', root).forEach(b => b.onclick = () => { acc.role = b.dataset.r; R(); });
    $('#accQ', root).oninput = (e) => { acc.q = e.target.value; clearTimeout(R._t); R._t = setTimeout(() => { R(); const i = $('#accQ', root); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    $$('[data-reset]', root).forEach(b => b.onclick = () => {
      const p = A().profileOf(b.dataset.reset);
      A().dialog(`<h3>Đặt lại mật khẩu – ${esc(p.full_name)}</h3><label>Mật khẩu mới<input name="p" required minlength="6" value="${A().randPw()}"></label>`, 'Đặt lại').onok = async (f) => {
        const { error } = await A().sb.rpc('reset_password', { p_user: p.id, p_password: f.p.value }); if (error) return A().toast(error.message, 5000);
        A().showCredentials([{ name: p.full_name, role: p.role, username: p.username, password: f.p.value }], 'Mật khẩu mới');
      };
    });
    $$('[data-del]', root).forEach(b => b.onclick = async () => {
      const p = A().profileOf(b.dataset.del); if (!confirm(`Xóa tài khoản "${p.full_name}" (${p.username})? Hồ sơ học sinh và điểm vẫn được giữ.`)) return;
      const { error } = await A().sb.rpc('admin_delete_account', { p_user: p.id }); if (error) return A().toast(error.message, 5000);
      await A().reloadPeople(); A().toast('Đã xóa tài khoản.'); R();
    });
    $('#accNewT', root).onclick = () => {
      const subs = A().SUBJECT_LIST;
      A().dialog(`<h3>Tạo tài khoản giáo viên</h3><label>Họ và tên<input name="n" required></label><label>Số điện thoại (dùng để đăng nhập)<input name="u" required pattern="0[0-9]{9,10}" inputmode="tel"></label>
        <label>Mật khẩu<input name="p" required minlength="6" value="${A().randPw()}"></label><label>Môn dạy<select name="s">${subs.map(s => `<option>${s[1]}</option>`).join('')}</select></label>
        <label>Vai trò<select name="r"><option value="teacher">Giáo viên</option><option value="admin">Quản trị viên</option></select></label>`, 'Tạo').onok = async (f) => {
        try { await A().createAccount(f.u.value.trim(), f.p.value, f.r.value, f.n.value.trim(), null, [f.s.value]); } catch (e) { return A().toast(e.message, 5000); }
        await A().sb.from('profiles').update({ phone: f.u.value.trim() }).eq('username', f.u.value.trim());
        await A().reloadPeople(); R();
        A().showCredentials([{ name: f.n.value.trim(), role: f.r.value, username: f.u.value.trim(), password: f.p.value }], 'Tài khoản mới');
      };
    };
  } };

  // ======================= PHÂN CÔNG GIẢNG DẠY (Admin) =======================
  V.assign = { render: (root) => {
    const { S, esc, classOf, subjectName, SUBJECT_LIST } = A();
    const teachers = (S.profiles || []).filter(p => p.role === 'teacher' || p.role === 'admin').sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'));
    const cls = S.classes.slice().sort((a, b) => (b.school_year || '').localeCompare(a.school_year || '') || a.name.localeCompare(b.name, 'vi', { numeric: true }));
    const tcs = S.teacherClasses || [];
    root.innerHTML = `<div class="row-actions page-head"><h2>Phân công giảng dạy & chủ nhiệm</h2></div>
      <form id="asForm" class="as-form"><label>Giáo viên<select name="t" required>${teachers.map(t => `<option value="${t.id}">${esc(t.full_name)}${t.subjects && t.subjects.length ? ' – ' + esc(t.subjects.join(', ')) : ''}</option>`).join('')}</select></label>
        <label>Lớp<select name="c" required>${cls.map(c => `<option value="${c.id}">${esc(c.name)} · ${esc(c.school_year)}</option>`).join('')}</select></label>
        <label>Nhiệm vụ<select name="s"><option value="gvcn">⭐ Chủ nhiệm lớp</option>${SUBJECT_LIST.map(s => `<option value="${s[0]}">Dạy ${esc(s[1])}</option>`).join('')}</select></label>
        <button class="btn primary">＋ Phân công</button></form>
      ${!teachers.length || !cls.length ? '<p class="warn small">Cần có giáo viên (tab Tài khoản / Duyệt đăng ký) và lớp (tab Khóa, lớp & học sinh) trước.</p>' : ''}
      <div class="as-grid">${cls.map(c => { const rows = tcs.filter(t => t.class_id === c.id).sort((a, b) => (b.homeroom - a.homeroom) || String(a.subject).localeCompare(String(b.subject)));
        return `<div class="card"><div class="card-head"><b>${esc(c.name)}</b><span class="tag">khối ${c.grade}</span><span class="tag muted">${esc(c.school_year)}</span></div>
          ${rows.map(t => { const p = A().profileOf(t.teacher_id) || {}; return `<div class="li">${t.homeroom ? '⭐ <b>GVCN</b>' : esc(subjectName(t.subject))}: ${esc(p.full_name || '?')} <button class="btn sm danger" data-rm="${t.teacher_id}|${t.class_id}|${t.subject}">✕</button></div>`; }).join('') || '<p class="muted small">Chưa phân công.</p>'}</div>`; }).join('')}</div>`;
    const R = () => V.assign.render(root);
    $('#asForm', root).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; const hr = f.s.value === 'gvcn';
      if (hr && tcs.some(t => t.class_id === f.c.value && t.homeroom)) { if (!confirm('Lớp này đã có GVCN. Thêm GVCN thứ hai?')) return; }
      const { error } = await A().sb.from('teacher_classes').upsert({ teacher_id: f.t.value, class_id: f.c.value, subject: f.s.value, homeroom: hr });
      if (error) return A().toast(error.message, 5000);
      await A().reloadPeople(); A().toast('Đã phân công.'); R();
    };
    $$('[data-rm]', root).forEach(b => b.onclick = async () => {
      const [t, c, s] = b.dataset.rm.split('|');
      const { error } = await A().sb.from('teacher_classes').delete().match({ teacher_id: t, class_id: c, subject: s });
      if (error) return A().toast(error.message, 5000);
      await A().reloadPeople(); R();
    });
  } };

  // ======================= BẢNG ĐIỂM =======================
  function gradeMatrix(cid, subjectFilter) {
    const { S } = A();
    const st = studentsOf(cid); const ids = new Set(st.map(s => s.id));
    const rs = S.results.filter(r => ids.has(r.student_id) && (!subjectFilter || examSubject(r.exam_id) === subjectFilter));
    const exams = [...new Map(rs.map(r => [r.exam_id, { id: r.exam_id, name: r.exam_name, at: r.created_at, subject: examSubject(r.exam_id) }])).values()].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const rows = st.map(s => { const cells = exams.map(e => { const r = rs.filter(x => x.exam_id === e.id && x.student_id === s.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]; return r ? +r.total : null; });
      const subs = S.submissions.filter(x => x.student_id === s.id && S.assignments.some(a => a.id === x.assignment_id && (!subjectFilter || (a.subject || 'toan') === subjectFilter)));
      return { s, cells, avg: avg(cells), hw: avg(subs.map(x => x.max_score ? x.score / x.max_score * 10 : null)) }; });
    return { exams, rows };
  }
  function matrixHTML(m, showSubject) {
    const { esc, subjectName } = A();
    if (!m.rows.length) return '<p class="muted">Lớp chưa có học sinh.</p>';
    return `<div class="table-wrap"><table class="gr-table gb"><thead><tr><th>#</th><th>Họ tên</th>${m.exams.map(e => `<th title="${esc(e.name)}">${esc(e.name.length > 22 ? e.name.slice(0, 20) + '…' : e.name)}${showSubject ? `<br><small>${esc(subjectName(e.subject))}</small>` : ''}</th>`).join('')}<th>TB kiểm tra</th><th>TB bài tập</th></tr></thead><tbody>
      ${m.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.s.full_name)}</td>${r.cells.map(c => `<td class="${c != null && c < 5 ? 'low' : ''}">${f2(c)}</td>`).join('')}<td><b>${f2(r.avg)}</b></td><td>${f2(r.hw)}</td></tr>`).join('')}
      <tr class="gb-avg"><td></td><td>Trung bình lớp</td>${m.exams.map((e, j) => `<td>${f2(avg(m.rows.map(r => r.cells[j])))}</td>`).join('')}<td>${f2(avg(m.rows.map(r => r.avg)))}</td><td>${f2(avg(m.rows.map(r => r.hw)))}</td></tr></tbody></table></div>`;
  }
  async function exportMatrix(m, title) {
    const blob = await G.Grading.xlsx([[title], [], ['STT', 'Họ và tên', 'SBD', ...m.exams.map(e => e.name), 'TB kiểm tra', 'TB bài tập (/10)'],
      ...m.rows.map((r, i) => [i + 1, r.s.full_name, r.s.sbd || '', ...r.cells.map(c => c == null ? '' : c), r.avg == null ? '' : Math.round(r.avg * 100) / 100, r.hw == null ? '' : Math.round(r.hw * 100) / 100])]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = title.replace(/[^\p{L}\p{N}]+/gu, '_') + '.xlsx'; a.click();
  }
  const gb = { cid: '' };
  V.gradebook = { render: (root) => {
    const { S, esc } = A();
    const list = me().role === 'admin' ? S.classes.slice() : (myClasses(false).length ? myClasses(false) : S.classes.slice());
    list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
    if (!list.some(c => c.id === gb.cid)) gb.cid = list[0] ? list[0].id : '';
    const m = gb.cid ? gradeMatrix(gb.cid, G.CLOUD.subject) : { exams: [], rows: [] };
    const c = A().classOf(gb.cid) || {};
    root.innerHTML = `<div class="row-actions page-head"><h2>Bảng điểm môn ${esc(G.CLOUD.subjectName)}</h2><span class="spacer"></span>${classSel('gbCls', list, gb.cid)}<button class="btn sm" id="gbX">⬇ Excel</button></div>
      <p class="muted small">Điểm lấy từ các bài đã chấm bằng phiếu trắc nghiệm (môn đang chọn ở góc trên) và điểm bài tập về nhà quy về thang 10. Điểm dưới 5 tô đỏ.</p>${gb.cid ? matrixHTML(m) : '<p class="muted">Chưa có lớp.</p>'}`;
    if ($('#gbCls', root)) $('#gbCls', root).onchange = (e) => { gb.cid = e.target.value; V.gradebook.render(root); };
    $('#gbX', root).onclick = () => exportMatrix(m, `Bảng điểm ${G.CLOUD.subjectName} lớp ${c.name || ''}`);
  } };

  // ======================= LỚP CHỦ NHIỆM =======================
  const hr = { cid: '', tab: 'students' };
  V.homeroom = { render: (root) => {
    const { S, esc, fmtDate, parentsOf } = A();
    const list = me().role === 'admin' ? S.classes.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true })) : myClasses(true);
    if (!list.length) { root.innerHTML = '<p class="muted">Bạn chưa được phân công chủ nhiệm lớp nào. Liên hệ quản trị viên.</p>'; return; }
    if (!list.some(c => c.id === hr.cid)) hr.cid = list[0].id;
    const c = A().classOf(hr.cid); const st = studentsOf(c.id);
    const profile = (id) => (S.profiles || []).find(p => p.id === id);
    let body = '';
    if (hr.tab === 'students') {
      body = `<div class="table-wrap"><table class="gr-table"><thead><tr><th>#</th><th>Họ tên</th><th>SBD</th><th>Tài khoản HS</th><th>Phụ huynh (liên hệ)</th><th>TB kiểm tra</th><th>Bài tập</th></tr></thead><tbody>
        ${st.map((s, i) => { const a = s.user_id ? profile(s.user_id) : null; const ps = parentsOf(s.id); const rs = S.results.filter(r => r.student_id === s.id);
          const asg = S.assignments.filter(x => x.class_id === c.id); const done = asg.filter(x => S.submissions.some(y => y.assignment_id === x.id && y.student_id === s.id)).length;
          return `<tr><td>${i + 1}</td><td>${esc(s.full_name)}</td><td>${esc(s.sbd || '')}</td><td>${a ? esc(a.username) : '<span class="warn small">chưa có</span>'}</td>
            <td class="small">${ps.map(p => `${esc(p.full_name)}${p.phone ? ` · <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ''}`).join('<br>') || '<span class="muted">—</span>'}</td>
            <td>${f2(avg(rs.map(r => r.total))) || '—'}</td><td class="${asg.length && done < asg.length ? 'warn' : ''}">${done}/${asg.length}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Lớp chưa có học sinh.</td></tr>'}</tbody></table></div>`;
    } else if (hr.tab === 'scores') {
      const m = gradeMatrix(c.id, null); body = `<div class="row-actions" style="margin-bottom:6px"><span class="muted small">Tất cả các môn</span><span class="spacer"></span><button class="btn sm" id="hrX">⬇ Excel</button></div>` + matrixHTML(m, true);
      setTimeout(() => { const x = $('#hrX', root); if (x) x.onclick = () => exportMatrix(m, `Bảng điểm tổng hợp lớp ${c.name}`); });
    } else {
      const asg = S.assignments.filter(x => x.class_id === c.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      body = asg.map(a => { const subs = S.submissions.filter(x => x.assignment_id === a.id); const miss = st.filter(s => !subs.some(x => x.student_id === s.id));
        return `<div class="card"><div class="card-head"><b>${esc(a.title)}</b><span class="tag">${esc(A().subjectName(a.subject || 'toan'))}</span>${a.due_at ? `<span class="tag">hạn ${fmtDate(a.due_at)}</span>` : ''}<span class="spacer"></span><span>Đã nộp <b>${subs.length}/${st.length}</b></span></div>
          ${miss.length ? `<div class="small warn">Chưa nộp: ${miss.map(s => esc(s.full_name)).join(', ')}</div>` : '<div class="small ok">Cả lớp đã nộp.</div>'}</div>`; }).join('') || '<p class="muted">Chưa có bài tập nào được giao cho lớp.</p>';
    }
    root.innerHTML = `<div class="row-actions page-head"><h2>⭐ Lớp ${esc(c.name)}</h2><span class="tag">sĩ số ${st.length}</span><span class="spacer"></span>${list.length > 1 ? classSel('hrCls', list, hr.cid) : ''}</div>
      <div class="seg hr-tabs">${[['students', '👥 Học sinh & phụ huynh'], ['scores', '📊 Điểm tổng hợp'], ['homework', '📚 Tình hình bài tập']].map(([k, l]) => `<button data-t="${k}" class="${hr.tab === k ? 'active' : ''}">${l}</button>`).join('')}</div>${body}`;
    $$('.hr-tabs button', root).forEach(b => b.onclick = () => { hr.tab = b.dataset.t; V.homeroom.render(root); });
    if ($('#hrCls', root)) $('#hrCls', root).onchange = (e) => { hr.cid = e.target.value; V.homeroom.render(root); };
  } };

  // ======================= LIÊN HỆ GIÁO VIÊN (HS / PH) =======================
  V.contact = { render: async (root) => {
    const { esc } = A();
    root.innerHTML = '<p class="muted">Đang tải…</p>';
    const { data, error } = await A().sb.rpc('my_contacts');
    if (error) { root.innerHTML = `<p class="warn">${esc(error.message)}</p>`; return; }
    const by = {}; (data || []).forEach(c => { (by[c.student_id] = by[c.student_id] || { name: c.student_name, cls: c.class_name, list: [] }).list.push(c); });
    const kids = Object.values(by);
    root.innerHTML = `<h2>Giáo viên của lớp</h2>` + (kids.map(k => `<div class="card"><div class="card-head"><b>${esc(k.name)}</b><span class="tag">Lớp ${esc(k.cls)}</span></div>
      ${k.list.map(c => `<div class="li">${c.homeroom ? '⭐ <b>Giáo viên chủ nhiệm</b>' : esc(c.subject)}: <b>${esc(c.teacher_name)}</b>${c.teacher_phone ? ` · <a href="tel:${esc(c.teacher_phone)}">☎ ${esc(c.teacher_phone)}</a>` : ''}</div>`).join('')}</div>`).join('') ||
      '<p class="muted">Lớp chưa được phân công giáo viên. Nhà trường sẽ cập nhật sau.</p>');
  } };
})(window);
