// LỚP CHỦ NHIỆM: Tổng quan · Học sinh & PH · Điểm danh · Nề nếp – Vi phạm · Thi đua – Khen thưởng · Kết quả học tập · Công việc & lịch
// và trang "Chuyên cần & nề nếp" cho học sinh / phụ huynh.
(function (G) {
  'use strict';
  if (!G.CLOUD || !G.CLOUD.online) return;
  const V = G.CLOUD.views;
  const A = () => G.CLOUD.api;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const vnDate = (s) => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
  const weekStart = () => { const d = new Date(); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); };
  const monthStart = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)); };
  const yearStart = () => { const d = new Date(); const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-08-15`; };
  const f2 = (n) => n == null || isNaN(n) ? '' : (Math.round(n * 100) / 100).toString().replace('.', ',');
  const avg = (a) => { const x = a.filter(v => v != null && !isNaN(v)); return x.length ? x.reduce((t, v) => t + +v, 0) / x.length : null; };

  const STATUS = { present: ['Có mặt', '✓', 'st-ok'], late: ['Đi muộn', 'M', 'st-late'], excused: ['Vắng có phép', 'P', 'st-exc'], absent: ['Vắng không phép', 'K', 'st-abs'] };
  const VIOLATIONS = [['Đi học muộn', -2], ['Vắng không phép', -5], ['Không mặc đồng phục', -2], ['Không học bài / không làm bài tập', -3], ['Mất trật tự trong giờ học', -2], ['Sử dụng điện thoại sai quy định', -5], ['Vô lễ với thầy cô, người lớn', -10], ['Gây gổ, đánh nhau', -15], ['Vi phạm khác', -2]];
  const REWARDS = [['Phát biểu xây dựng bài', 2], ['Đạt điểm 9–10', 3], ['Làm việc tốt', 5], ['Tham gia phong trào của lớp, trường', 5], ['Đạt giải thi học sinh giỏi / cuộc thi', 10], ['Khen thưởng khác', 2]];
  const TASK_KIND = { task: ['Việc cần làm', '📌'], meeting: ['Họp', '👥'], event: ['Sự kiện', '🎉'] };
  const rank = (score) => score >= 90 ? ['Tốt', 'rk-a'] : score >= 70 ? ['Khá', 'rk-b'] : score >= 50 ? ['Đạt', 'rk-c'] : ['Chưa đạt', 'rk-d'];

  // ---------- dữ liệu theo lớp (tải khi cần) ----------
  const cache = {};
  async function load(cid, force) {
    if (cache[cid] && !force) return cache[cid];
    const { fetchAll } = A(); const from = yearStart();
    const [att, ev, tasks] = await Promise.all([
      fetchAll('attendance', '*', q => q.eq('class_id', cid).gte('date', from)),
      fetchAll('conduct_events', '*', q => q.eq('class_id', cid).gte('date', from)),
      fetchAll('homeroom_tasks', '*', q => q.eq('class_id', cid))
    ]);
    return (cache[cid] = { att, ev, tasks });
  }
  const studentsOf = (cid) => { const { S, lastName } = A(); return S.students.filter(s => s.class_id === cid).sort((a, b) => lastName(a.full_name).localeCompare(lastName(b.full_name), 'vi')); };
  const myHomeroomClasses = () => { const { S } = A(); if (S.profile.role === 'admin') return S.classes.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
    const ids = new Set((S.teacherClasses || []).filter(t => t.teacher_id === S.profile.id && t.homeroom).map(t => t.class_id)); return S.classes.filter(c => ids.has(c.id)); };
  const pointsOf = (ev, sid, from) => ev.filter(e => e.student_id === sid && (!from || e.date >= from)).reduce((t, e) => t + (+e.points || 0), 0);
  const attCount = (att, sid, from, st) => att.filter(a => a.student_id === sid && (!from || a.date >= from) && a.status === st).length;

  const hr = { cid: '', tab: 'overview', date: today(), session: 'sang', period: 'month', evKind: 'violation' };
  const TABS = [['overview', '🏠 Tổng quan'], ['students', '👥 Học sinh & PH'], ['attendance', '🗓️ Điểm danh'], ['conduct', '⚠️ Nề nếp – Vi phạm'], ['rewards', '🏆 Thi đua – Khen thưởng'], ['study', '📊 Kết quả học tập'], ['tasks', '📅 Công việc & lịch']];

  V.homeroom = { render: async (root) => {
    const { esc } = A();
    const list = myHomeroomClasses();
    if (!list.length) { root.innerHTML = '<p class="muted">Bạn chưa được phân công chủ nhiệm lớp nào. Liên hệ quản trị viên (mục Phân công giảng dạy).</p>'; return; }
    if (!list.some(c => c.id === hr.cid)) hr.cid = list[0].id;
    const c = A().classOf(hr.cid); const st = studentsOf(c.id);
    root.innerHTML = `<div class="row-actions page-head"><h2>⭐ Lớp ${esc(c.name)}</h2><span class="tag">sĩ số ${st.length}</span><span class="tag muted">${esc(c.school_year || '')}</span><span class="spacer"></span>
      ${list.length > 1 ? `<label class="inline-l">Lớp <select id="hrCls">${list.map(x => `<option value="${x.id}" ${x.id === hr.cid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : ''}</div>
      <div class="hr-nav">${TABS.map(([k, l]) => `<button data-t="${k}" class="${hr.tab === k ? 'active' : ''}">${l}</button>`).join('')}</div><div id="hrBody"><p class="muted">Đang tải…</p></div>`;
    $$('.hr-nav button', root).forEach(b => b.onclick = () => { hr.tab = b.dataset.t; V.homeroom.render(root); });
    if ($('#hrCls', root)) $('#hrCls', root).onchange = (e) => { hr.cid = e.target.value; V.homeroom.render(root); };
    let data; try { data = await load(c.id); } catch (e) { $('#hrBody', root).innerHTML = `<p class="warn">Không tải được dữ liệu lớp: ${esc(e.message)}. Quản trị viên cần chạy lại schema.sql mới nhất.</p>`; return; }
    const body = $('#hrBody', root); const R = async (force) => { if (force) await load(c.id, true); V.homeroom.render(root); };
    ({ overview, students, attendance, conduct, rewards, study, tasks })[hr.tab](body, c, st, data, R);
  } };

  // ---------- 1. Tổng quan ----------
  function overview(body, c, st, d) {
    const { esc, fmtDate, S } = A(); const t = today(), w = weekStart(), m = monthStart();
    const todayAtt = d.att.filter(a => a.date === t);
    const absentToday = todayAtt.filter(a => a.status === 'absent' || a.status === 'excused');
    const lateToday = todayAtt.filter(a => a.status === 'late');
    const vioW = d.ev.filter(e => e.kind === 'violation' && e.date >= w), rewW = d.ev.filter(e => e.kind === 'reward' && e.date >= w);
    const name = (sid) => (st.find(s => s.id === sid) || {}).full_name || '?';
    const weak = st.filter(s => { const rs = S.results.filter(r => r.student_id === s.id); const a = avg(rs.map(r => r.total)); return a != null && a < 5; });
    const absMonth = st.map(s => ({ s, n: attCount(d.att, s.id, m, 'absent') + attCount(d.att, s.id, m, 'excused') })).filter(x => x.n >= 3).sort((a, b) => b.n - a.n);
    const upcoming = d.tasks.filter(x => !x.done).sort((a, b) => String(a.due_at || '9').localeCompare(String(b.due_at || '9'))).slice(0, 6);
    const top = st.map(s => ({ s, p: pointsOf(d.ev, s.id, w) })).filter(x => x.p !== 0).sort((a, b) => b.p - a.p);
    const kpi = (n, l, i, go, hot) => `<button class="kpi ${hot ? 'hot' : ''}" data-tab="${go}"><span class="kpi-ico">${i}</span><span class="kpi-n">${n}</span><span class="kpi-l">${l}</span></button>`;
    body.innerHTML = `<div class="kpis">${kpi(st.length, 'Sĩ số', '👥', 'students')}${kpi(todayAtt.length ? st.length - absentToday.length : '—', 'Có mặt hôm nay', '✅', 'attendance')}${kpi(absentToday.length, 'Vắng hôm nay', '🚫', 'attendance', absentToday.length)}${kpi(lateToday.length, 'Đi muộn hôm nay', '⏰', 'attendance', lateToday.length)}
      ${kpi(vioW.length, 'Vi phạm tuần này', '⚠️', 'conduct', vioW.length)}${kpi(rewW.length, 'Khen thưởng tuần này', '🏆', 'rewards')}${kpi(weak.length, 'HS điểm TB dưới 5', '📉', 'study', weak.length)}${kpi(upcoming.length, 'Việc chưa xong', '📅', 'tasks')}</div>
      ${todayAtt.length ? '' : `<div class="info">Hôm nay (${vnDate(t)}) lớp chưa được điểm danh. <button class="btn sm primary" data-tab="attendance">Điểm danh ngay</button></div>`}
      <div class="home-grid" style="margin-top:12px">
        <div class="panel"><h2>Vắng / muộn hôm nay</h2>${[...absentToday, ...lateToday].map(a => `<div class="li"><span class="st-pill ${STATUS[a.status][2]}">${STATUS[a.status][1]}</span> ${esc(name(a.student_id))} <span class="muted small">${a.session === 'sang' ? 'sáng' : 'chiều'}${a.note ? ' · ' + esc(a.note) : ''}</span></div>`).join('') || '<p class="muted">Không có.</p>'}</div>
        <div class="panel"><h2>Cần chú ý</h2>${absMonth.map(x => `<div class="li">🚫 ${esc(x.s.full_name)} – vắng ${x.n} buổi trong tháng</div>`).join('')}${weak.map(s => `<div class="li">📉 ${esc(s.full_name)} – điểm TB kiểm tra dưới 5</div>`).join('')}${vioW.length ? [...new Set(vioW.map(e => e.student_id))].filter(sid => vioW.filter(e => e.student_id === sid).length >= 2).map(sid => `<div class="li">⚠️ ${esc(name(sid))} – ${vioW.filter(e => e.student_id === sid).length} vi phạm tuần này</div>`).join('') : ''}${!absMonth.length && !weak.length ? '<p class="muted">Chưa có học sinh cần chú ý.</p>' : ''}</div>
        <div class="panel"><h2>Thi đua tuần này</h2>${top.slice(0, 5).map((x, i) => `<div class="li">${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${esc(x.s.full_name)} <b class="${x.p < 0 ? 'warn' : 'ok'}">${x.p > 0 ? '+' : ''}${x.p}</b></div>`).join('') || '<p class="muted">Chưa có ghi nhận tuần này.</p>'}</div>
        <div class="panel"><h2>Việc sắp tới</h2>${upcoming.map(x => `<div class="li">${TASK_KIND[x.kind][1]} ${esc(x.title)} <span class="muted small">${x.due_at ? fmtDate(x.due_at) : 'không hạn'}</span></div>`).join('') || '<p class="muted">Không có việc nào.</p>'}<button class="btn sm" data-tab="tasks">＋ Thêm việc</button></div>
      </div>`;
    $$('[data-tab]', body).forEach(b => b.onclick = () => { hr.tab = b.dataset.tab; V.homeroom.render(body.parentElement); });
  }

  // ---------- Học sinh & phụ huynh ----------
  function students(body, c, st, d) {
    const { esc, S, parentsOf } = A(); const m = monthStart();
    body.innerHTML = `<div class="table-wrap"><table class="gr-table"><thead><tr><th>#</th><th>Họ tên</th><th>SBD</th><th>Tài khoản HS</th><th>Phụ huynh (liên hệ)</th><th>Vắng tháng</th><th>Điểm RL</th><th>TB kiểm tra</th></tr></thead><tbody>
      ${st.map((s, i) => { const a = s.user_id ? (S.profiles || []).find(p => p.id === s.user_id) : null; const ps = parentsOf(s.id); const sc = 100 + pointsOf(d.ev, s.id, yearStart()); const rk = rank(sc);
        return `<tr><td>${i + 1}</td><td>${esc(s.full_name)}</td><td>${esc(s.sbd || '')}</td><td>${a ? esc(a.username) : '<span class="warn small">chưa có</span>'}</td>
          <td class="small">${ps.map(p => `${esc(p.full_name)}${p.phone ? ` · <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ''}`).join('<br>') || '<span class="muted">—</span>'}</td>
          <td>${attCount(d.att, s.id, m, 'absent') + attCount(d.att, s.id, m, 'excused') || ''}</td><td><span class="rk ${rk[1]}">${sc}</span></td><td>${f2(avg(S.results.filter(r => r.student_id === s.id).map(r => r.total))) || '—'}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">Lớp chưa có học sinh.</td></tr>'}</tbody></table></div>`;
  }

  // ---------- 2. Điểm danh – Chuyên cần ----------
  function attendance(body, c, st, d, R) {
    const { esc, sb, toast } = A();
    const day = d.att.filter(a => a.date === hr.date && a.session === hr.session);
    const cur = {}; st.forEach(s => { const a = day.find(x => x.student_id === s.id); cur[s.id] = { status: a ? a.status : 'present', note: a ? a.note || '' : '' }; });
    const m = hr.date.slice(0, 7);
    body.innerHTML = `<div class="att-head"><label class="inline-l">Ngày <input type="date" id="attDate" value="${hr.date}" max="${today()}"></label>
        <div class="seg"><button data-ses="sang" class="${hr.session === 'sang' ? 'active' : ''}">Buổi sáng</button><button data-ses="chieu" class="${hr.session === 'chieu' ? 'active' : ''}">Buổi chiều</button></div>
        <span class="muted small">${day.length ? '✔ Đã điểm danh – có thể sửa' : 'Chưa điểm danh buổi này'}</span><span class="spacer"></span>
        <button class="btn sm" id="attAll">Tất cả có mặt</button><button class="btn primary" id="attSave">💾 Lưu điểm danh</button></div>
      <div class="att-legend small">${Object.entries(STATUS).map(([k, v]) => `<span class="st-pill ${v[2]}">${v[1]}</span> ${v[0]}`).join(' &nbsp; ')}</div>
      <div class="att-list">${st.map((s, i) => `<div class="att-row" data-sid="${s.id}"><span class="att-no">${i + 1}</span><span class="att-name">${esc(s.full_name)}</span>
        <span class="att-btns">${Object.entries(STATUS).map(([k, v]) => `<button class="st-btn ${v[2]} ${cur[s.id].status === k ? 'on' : ''}" data-st="${k}" title="${v[0]}">${v[1]}</button>`).join('')}</span>
        <input class="att-note" placeholder="ghi chú (lý do…)" value="${esc(cur[s.id].note)}"></div>`).join('') || '<p class="muted">Lớp chưa có học sinh.</p>'}</div>
      <h3 style="margin-top:18px">Thống kê chuyên cần tháng ${m.slice(5)}/${m.slice(0, 4)}</h3>
      <div class="table-wrap"><table class="gr-table"><thead><tr><th>Họ tên</th><th>Đi muộn</th><th>Vắng có phép</th><th>Vắng không phép</th><th>Tổng vắng</th></tr></thead><tbody>
      ${st.map(s => { const mm = d.att.filter(a => a.student_id === s.id && a.date.startsWith(m)); const n = (k) => mm.filter(a => a.status === k).length; const tot = n('excused') + n('absent');
        return `<tr><td>${esc(s.full_name)}</td><td>${n('late') || ''}</td><td>${n('excused') || ''}</td><td class="${n('absent') ? 'warn' : ''}">${n('absent') || ''}</td><td><b>${tot || ''}</b></td></tr>`; }).join('')}</tbody></table></div>
      <button class="btn sm" id="attXlsx" style="margin-top:6px">⬇ Xuất Excel chuyên cần tháng</button>`;
    $('#attDate', body).onchange = (e) => { hr.date = e.target.value || today(); R(); };
    $$('[data-ses]', body).forEach(b => b.onclick = () => { hr.session = b.dataset.ses; R(); });
    $$('.att-row', body).forEach(row => $$('.st-btn', row).forEach(b => b.onclick = () => { $$('.st-btn', row).forEach(x => x.classList.toggle('on', x === b)); }));
    $('#attAll', body).onclick = () => $$('.att-row', body).forEach(row => $$('.st-btn', row).forEach(x => x.classList.toggle('on', x.dataset.st === 'present')));
    $('#attSave', body).onclick = async (e) => {
      const rows = $$('.att-row', body).map(row => ({ class_id: c.id, student_id: row.dataset.sid, date: hr.date, session: hr.session, status: ($('.st-btn.on', row) || {}).dataset ? $('.st-btn.on', row).dataset.st : 'present', note: $('.att-note', row).value.trim() || null, updated_at: new Date().toISOString() }));
      e.target.disabled = true;
      const { error } = await sb.from('attendance').upsert(rows, { onConflict: 'student_id,date,session' });
      e.target.disabled = false;
      if (error) return toast('Lỗi lưu điểm danh: ' + error.message, 6000);
      const abs = rows.filter(r => r.status !== 'present').length;
      toast(`Đã lưu điểm danh ${vnDate(hr.date)} (${hr.session === 'sang' ? 'sáng' : 'chiều'}): ${rows.length - abs} có mặt, ${abs} vắng/muộn.`, 5000);
      R(true);
    };
    $('#attXlsx', body).onclick = async () => {
      const days = [...new Set(d.att.filter(a => a.date.startsWith(m)).map(a => a.date))].sort();
      const head = ['STT', 'Họ và tên', ...days.map(x => x.slice(8) + '/' + x.slice(5, 7)), 'Muộn', 'Vắng P', 'Vắng K'];
      const rows = st.map((s, i) => { const mm = d.att.filter(a => a.student_id === s.id && a.date.startsWith(m));
        return [i + 1, s.full_name, ...days.map(x => mm.filter(a => a.date === x && a.status !== 'present').map(a => STATUS[a.status][1] + (a.session === 'chieu' ? '(C)' : '')).join(' ')), mm.filter(a => a.status === 'late').length, mm.filter(a => a.status === 'excused').length, mm.filter(a => a.status === 'absent').length]; });
      const blob = await G.Grading.xlsx([[`Chuyên cần lớp ${c.name} – tháng ${m.slice(5)}/${m.slice(0, 4)}`], ['Ký hiệu: M đi muộn, P vắng có phép, K vắng không phép, (C) buổi chiều'], head, ...rows]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `chuyen-can_${c.name}_${m}.xlsx`; a.click();
    };
  }

  // ---------- 3 & 4. Nề nếp – Vi phạm / Thi đua – Khen thưởng ----------
  function eventsTab(kind) {
    return function (body, c, st, d, R) {
      const { esc, sb, toast } = A(); const isV = kind === 'violation'; const CATS = isV ? VIOLATIONS : REWARDS;
      const from = hr.period === 'week' ? weekStart() : hr.period === 'month' ? monthStart() : yearStart();
      const evs = d.ev.filter(e => e.kind === kind && e.date >= from).sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at)));
      const name = (sid) => (st.find(s => s.id === sid) || {}).full_name || '?';
      const per = st.map(s => ({ s, n: evs.filter(e => e.student_id === s.id).length, p: evs.filter(e => e.student_id === s.id).reduce((t, e) => t + (+e.points || 0), 0) })).filter(x => x.n).sort((a, b) => isV ? a.p - b.p : b.p - a.p);
      const board = !isV ? st.map(s => { const sc = 100 + pointsOf(d.ev, s.id, from); return { s, sc, plus: pointsOf(d.ev.filter(e => e.kind === 'reward'), s.id, from), minus: pointsOf(d.ev.filter(e => e.kind === 'violation'), s.id, from) }; }).sort((a, b) => b.sc - a.sc) : [];
      body.innerHTML = `<form class="ev-form" id="evForm">
          <label>Học sinh<select name="sid" multiple size="5" required>${st.map(s => `<option value="${s.id}">${esc(s.full_name)}</option>`).join('')}</select><small class="muted">Giữ Ctrl để chọn nhiều em</small></label>
          <div><label>${isV ? 'Loại vi phạm' : 'Nội dung khen thưởng'}<select name="cat">${CATS.map(([n, p]) => `<option data-p="${p}">${esc(n)}</option>`).join('')}</select></label>
            <div class="row"><label>Điểm<input name="pts" type="number" value="${CATS[0][1]}" ${isV ? 'max="0"' : 'min="0"'}></label><label>Ngày<input name="date" type="date" value="${today()}" max="${today()}"></label></div>
            <label>Ghi chú<input name="note" placeholder="${isV ? 'VD: tiết 3 môn Toán' : 'VD: đạt giải Nhì HSG cấp trường'}"></label>
            <button class="btn ${isV ? 'danger' : 'primary'}">${isV ? '＋ Ghi vi phạm' : '＋ Ghi khen thưởng'}</button></div></form>
        <div class="row-actions" style="margin:10px 0"><div class="seg">${[['week', 'Tuần này'], ['month', 'Tháng này'], ['year', 'Cả năm học']].map(([k, l]) => `<button data-per="${k}" class="${hr.period === k ? 'active' : ''}">${l}</button>`).join('')}</div>
          <span class="muted small">${evs.length} ${isV ? 'lượt vi phạm' : 'lượt khen thưởng'} · tổng ${evs.reduce((t, e) => t + (+e.points || 0), 0)} điểm</span></div>
        ${!isV ? `<h3>Bảng xếp hạng thi đua <small class="muted">(điểm rèn luyện = 100 + khen thưởng − vi phạm, xếp loại đề xuất)</small></h3>
          <div class="table-wrap"><table class="gr-table"><thead><tr><th>Hạng</th><th>Họ tên</th><th>Cộng</th><th>Trừ</th><th>Điểm RL</th><th>Xếp loại đề xuất</th></tr></thead><tbody>
          ${board.map((x, i) => { const rk = rank(x.sc); return `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(x.s.full_name)}</td><td class="ok">${x.plus ? '+' + x.plus : ''}</td><td class="warn">${x.minus || ''}</td><td><b>${x.sc}</b></td><td><span class="rk ${rk[1]}">${rk[0]}</span></td></tr>`; }).join('')}</tbody></table></div>`
          : `<h3>Tổng hợp theo học sinh</h3><div class="table-wrap"><table class="gr-table"><thead><tr><th>Họ tên</th><th>Số lần</th><th>Điểm trừ</th></tr></thead><tbody>${per.map(x => `<tr><td>${esc(x.s.full_name)}</td><td>${x.n}</td><td class="warn"><b>${x.p}</b></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Không có vi phạm trong thời gian này. 👍</td></tr>'}</tbody></table></div>`}
        <h3>Nhật ký</h3><div class="table-wrap"><table class="gr-table"><thead><tr><th>Ngày</th><th>Học sinh</th><th>${isV ? 'Vi phạm' : 'Khen thưởng'}</th><th>Điểm</th><th>Ghi chú</th><th></th></tr></thead><tbody>
        ${evs.map(e => `<tr><td>${vnDate(e.date)}</td><td>${esc(name(e.student_id))}</td><td>${esc(e.category)}</td><td class="${e.points < 0 ? 'warn' : 'ok'}"><b>${e.points > 0 ? '+' : ''}${e.points}</b></td><td class="small">${esc(e.note || '')}</td><td><button class="btn sm danger" data-del="${e.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Chưa có ghi nhận.</td></tr>'}</tbody></table></div>`;
      const f = $('#evForm', body);
      f.cat.onchange = () => { f.pts.value = f.cat.selectedOptions[0].dataset.p; };
      f.onsubmit = async (e) => {
        e.preventDefault(); const sids = [...f.sid.selectedOptions].map(o => o.value); if (!sids.length) return toast('Hãy chọn học sinh.');
        let p = parseInt(f.pts.value, 10) || 0; p = isV ? -Math.abs(p) : Math.abs(p);
        const rows = sids.map(sid => ({ class_id: c.id, student_id: sid, date: f.date.value || today(), kind, category: f.cat.value, points: p, note: f.note.value.trim() || null }));
        const { error } = await sb.from('conduct_events').insert(rows); if (error) return toast('Lỗi: ' + error.message, 6000);
        toast(`Đã ghi ${rows.length} ${isV ? 'vi phạm' : 'khen thưởng'}.`); R(true);
      };
      $$('[data-per]', body).forEach(b => b.onclick = () => { hr.period = b.dataset.per; R(); });
      $$('[data-del]', body).forEach(b => b.onclick = async () => { if (!confirm('Xóa ghi nhận này?')) return; const { error } = await sb.from('conduct_events').delete().eq('id', b.dataset.del); if (error) return toast(error.message, 5000); R(true); });
    };
  }
  const conduct = eventsTab('violation'), rewards = eventsTab('reward');

  // ---------- 5. Kết quả học tập ----------
  function study(body, c, st) {
    const { esc, S, subjectName, fmtDate } = A();
    const ids = new Set(st.map(s => s.id)); const rs = S.results.filter(r => ids.has(r.student_id));
    const exams = [...new Map(rs.map(r => [r.exam_id, { id: r.exam_id, name: r.exam_name, at: r.created_at, sub: ((S.exams.find(e => e.id === r.exam_id) || {}).config || {}).subject || 'toan' }])).values()].sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const asg = S.assignments.filter(a => a.class_id === c.id);
    const rows = st.map(s => { const cells = exams.map(e => { const r = rs.filter(x => x.exam_id === e.id && x.student_id === s.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]; return r ? +r.total : null; });
      const done = asg.filter(a => S.submissions.some(x => x.assignment_id === a.id && x.student_id === s.id)).length; const a = avg(cells);
      const flag = (a != null && a < 5) || cells.filter(x => x != null && x < 5).length >= 2 || (asg.length && done / asg.length < 0.5);
      return { s, cells, a, done, flag }; });
    const warn = rows.filter(r => r.flag);
    body.innerHTML = `${warn.length ? `<div class="warning">⚠ ${warn.length} học sinh cần hỗ trợ học tập (TB dưới 5, có từ 2 bài dưới 5 hoặc nộp dưới 50% bài tập): ${warn.map(r => esc(r.s.full_name)).join(', ')}</div>` : '<div class="info">Chưa có học sinh nào cần cảnh báo học tập.</div>'}
      <div class="table-wrap" style="margin-top:8px"><table class="gr-table gb"><thead><tr><th>#</th><th>Họ tên</th>${exams.map(e => `<th title="${esc(e.name)}">${esc(e.name.length > 20 ? e.name.slice(0, 18) + '…' : e.name)}<br><small>${esc(subjectName(e.sub))}</small></th>`).join('')}<th>TB kiểm tra</th><th>Bài tập đã nộp</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.flag ? 'flag' : ''}"><td>${i + 1}</td><td>${r.flag ? '⚠ ' : ''}${esc(r.s.full_name)}</td>${r.cells.map(x => `<td class="${x != null && x < 5 ? 'low' : ''}">${f2(x)}</td>`).join('')}<td><b>${f2(r.a)}</b></td><td>${r.done}/${asg.length}</td></tr>`).join('')}
      <tr class="gb-avg"><td></td><td>Trung bình lớp</td>${exams.map((e, j) => `<td>${f2(avg(rows.map(r => r.cells[j])))}</td>`).join('')}<td>${f2(avg(rows.map(r => r.a)))}</td><td></td></tr></tbody></table></div>
      <h3 style="margin-top:16px">Bài tập về nhà gần đây</h3>${asg.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8).map(a => { const subs = S.submissions.filter(x => x.assignment_id === a.id); const miss = st.filter(s => !subs.some(x => x.student_id === s.id));
        return `<div class="li"><b>${esc(a.title)}</b> <span class="tag">${esc(subjectName(a.subject || 'toan'))}</span> nộp ${subs.length}/${st.length}${a.due_at ? ` · hạn ${fmtDate(a.due_at)}` : ''}${miss.length && miss.length <= 10 ? `<br><small class="warn">Chưa nộp: ${miss.map(s => esc(s.full_name)).join(', ')}</small>` : ''}</div>`; }).join('') || '<p class="muted">Chưa có bài tập.</p>'}`;
  }

  // ---------- 6. Công việc & lịch ----------
  function tasks(body, c, st, d, R) {
    const { esc, sb, toast, fmtDate } = A();
    const open = d.tasks.filter(t => !t.done).sort((a, b) => String(a.due_at || '9').localeCompare(String(b.due_at || '9')));
    const done = d.tasks.filter(t => t.done).sort((a, b) => String(b.due_at || '').localeCompare(String(a.due_at || ''))).slice(0, 15);
    const now = new Date();
    const item = (t) => { const late = !t.done && t.due_at && new Date(t.due_at) < now;
      return `<div class="task ${t.done ? 'done' : ''} ${late ? 'late' : ''}"><input type="checkbox" data-done="${t.id}" ${t.done ? 'checked' : ''}><span class="task-ico">${TASK_KIND[t.kind][1]}</span>
        <div class="task-main"><b>${esc(t.title)}</b><small>${TASK_KIND[t.kind][0]}${t.due_at ? ' · ' + fmtDate(t.due_at) : ''}${late ? ' · <span class="warn">quá hạn</span>' : ''}${t.note ? ' · ' + esc(t.note) : ''}</small></div>
        <button class="btn sm danger" data-rm="${t.id}">✕</button></div>`; };
    // lịch tháng
    const y = now.getFullYear(), mo = now.getMonth(); const first = new Date(y, mo, 1), days = new Date(y, mo + 1, 0).getDate(); const off = (first.getDay() + 6) % 7;
    const byDay = {}; d.tasks.forEach(t => { if (t.due_at) { const k = iso(new Date(t.due_at)); (byDay[k] = byDay[k] || []).push(t); } });
    let cal = '<div class="cal">' + ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(x => `<div class="cal-h">${x}</div>`).join('') + '<div class="cal-d empty"></div>'.repeat(off);
    for (let i = 1; i <= days; i++) { const k = iso(new Date(y, mo, i)); const ts = byDay[k] || [];
      cal += `<div class="cal-d ${k === today() ? 'today' : ''}"><span>${i}</span>${ts.slice(0, 3).map(t => `<i class="${t.done ? 'done' : ''}" title="${esc(t.title)}">${TASK_KIND[t.kind][1]} ${esc(t.title.slice(0, 14))}</i>`).join('')}</div>`; }
    cal += '</div>';
    body.innerHTML = `<form class="task-form" id="tkForm"><input name="title" required placeholder="VD: Họp phụ huynh giữa kỳ, thu hồ sơ bảo hiểm, sinh hoạt lớp…" maxlength="150">
        <select name="kind">${Object.entries(TASK_KIND).map(([k, v]) => `<option value="${k}">${v[1]} ${v[0]}</option>`).join('')}</select><input name="due" type="datetime-local"><input name="note" placeholder="ghi chú"><button class="btn primary">＋ Thêm</button></form>
      <div class="home-grid" style="margin-top:10px"><div class="panel"><h2>Chưa hoàn thành (${open.length})</h2>${open.map(item).join('') || '<p class="muted">Không còn việc nào. 🎉</p>'}
        ${done.length ? `<h2 style="margin-top:14px">Đã xong gần đây</h2>${done.map(item).join('')}` : ''}</div>
        <div class="panel"><h2>Lịch tháng ${mo + 1}/${y}</h2>${cal}</div></div>`;
    $('#tkForm', body).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const { error } = await sb.from('homeroom_tasks').insert({ class_id: c.id, title: f.title.value.trim(), kind: f.kind.value, due_at: f.due.value ? new Date(f.due.value).toISOString() : null, note: f.note.value.trim() || null });
      if (error) return toast(error.message, 5000); toast('Đã thêm.'); R(true);
    };
    $$('[data-done]', body).forEach(b => b.onchange = async () => { const { error } = await sb.from('homeroom_tasks').update({ done: b.checked }).eq('id', b.dataset.done); if (error) return toast(error.message, 5000); R(true); });
    $$('[data-rm]', body).forEach(b => b.onclick = async () => { if (!confirm('Xóa việc này?')) return; await sb.from('homeroom_tasks').delete().eq('id', b.dataset.rm); R(true); });
  }

  // ======================= HS / PH: Chuyên cần & nề nếp =======================
  V.conduct = { render: async (root) => {
    const { S, esc, studentRow, classOf, fetchAll } = A();
    const kid = S.profile.role === 'parent' ? (studentRow(A().hw.child) || S.students[0]) : S.students[0];
    if (!kid) { root.innerHTML = '<p class="muted">Tài khoản chưa được gắn với học sinh.</p>'; return; }
    root.innerHTML = '<p class="muted">Đang tải…</p>';
    let att = [], ev = [];
    try { [att, ev] = await Promise.all([fetchAll('attendance', '*', q => q.eq('student_id', kid.id).gte('date', yearStart())), fetchAll('conduct_events', '*', q => q.eq('student_id', kid.id).gte('date', yearStart()))]); }
    catch (e) { root.innerHTML = `<p class="warn">${esc(e.message)}</p>`; return; }
    const m = monthStart(); const n = (k, from) => att.filter(a => a.status === k && (!from || a.date >= from)).length;
    const sc = 100 + ev.reduce((t, e) => t + (+e.points || 0), 0); const rk = rank(sc);
    const miss = att.filter(a => a.status !== 'present').sort((a, b) => b.date.localeCompare(a.date));
    root.innerHTML = `<h2>Chuyên cần & nề nếp – ${esc(kid.full_name)} <span class="tag">Lớp ${esc((classOf(kid.class_id) || {}).name || '')}</span></h2>
      <div class="kpis"><div class="kpi"><span class="kpi-ico">🚫</span><span class="kpi-n">${n('excused', m) + n('absent', m)}</span><span class="kpi-l">Buổi vắng tháng này</span></div>
        <div class="kpi"><span class="kpi-ico">⏰</span><span class="kpi-n">${n('late', m)}</span><span class="kpi-l">Đi muộn tháng này</span></div>
        <div class="kpi ${n('absent') ? 'hot' : ''}"><span class="kpi-ico">❗</span><span class="kpi-n">${n('absent')}</span><span class="kpi-l">Vắng không phép cả năm</span></div>
        <div class="kpi"><span class="kpi-ico">🏆</span><span class="kpi-n">${sc}</span><span class="kpi-l">Điểm rèn luyện · <span class="rk ${rk[1]}">${rk[0]}</span></span></div></div>
      <div class="home-grid"><div class="panel"><h2>Các buổi vắng / muộn</h2>${miss.slice(0, 20).map(a => `<div class="li"><span class="st-pill ${STATUS[a.status][2]}">${STATUS[a.status][1]}</span> ${vnDate(a.date)} (${a.session === 'sang' ? 'sáng' : 'chiều'}) – ${STATUS[a.status][0]}${a.note ? ` <span class="muted small">${esc(a.note)}</span>` : ''}</div>`).join('') || '<p class="muted">Đi học đầy đủ. 👍</p>'}</div>
        <div class="panel"><h2>Khen thưởng & vi phạm</h2>${ev.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(e => `<div class="li">${e.kind === 'reward' ? '🏆' : '⚠️'} ${vnDate(e.date)} – ${esc(e.category)} <b class="${e.points < 0 ? 'warn' : 'ok'}">${e.points > 0 ? '+' : ''}${e.points}</b>${e.note ? ` <span class="muted small">${esc(e.note)}</span>` : ''}</div>`).join('') || '<p class="muted">Chưa có ghi nhận.</p>'}</div></div>
      <p class="muted small">Điểm rèn luyện = 100 + điểm khen thưởng − điểm vi phạm trong năm học. Xếp loại là đề xuất, giáo viên chủ nhiệm sẽ đánh giá chính thức.</p>`;
  } };
})(window);
