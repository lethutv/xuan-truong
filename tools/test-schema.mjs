// Kiểm thử schema.sql + seed.sql trên PGlite với auth/storage giả lập kiểu Supabase.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'fs';
const APP = process.argv[2];
const db = new PGlite({ extensions: { pgcrypto } });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const q = async (sql, p) => (await db.query(sql, p)).rows;

await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth;
create role supabase_auth_admin nologin;
create table auth.users(instance_id uuid, id uuid primary key default gen_random_uuid(), aud text, role text, email text unique, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb default '{}', created_at timestamptz, updated_at timestamptz,
  confirmation_token text, recovery_token text, email_change_token_new text, email_change text, email_change_token_current text,
  phone_change text, phone_change_token text, reauthentication_token text);
create table auth.identities(id uuid primary key, user_id uuid references auth.users(id) on delete cascade, provider_id text, identity_data jsonb,
  provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
grant insert, select on auth.users to supabase_auth_admin;
create schema extensions;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
grant usage on schema public, auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
`);
await db.exec(fs.readFileSync(APP + '/supabase/schema.sql', 'utf8'));
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;`);
await db.exec(fs.readFileSync(APP + '/supabase/seed.sql', 'utf8'));
const SEEDN = (await q(`select count(*)::int n, count(*) filter (where pool='exam')::int e, count(*) filter (where pool='practice')::int p from questions`))[0];
ok(SEEDN.n > 1000 && SEEDN.e + SEEDN.p === SEEDN.n, `seed ${SEEDN.n} câu (${SEEDN.e} đề, ${SEEDN.p} luyện tập)`);

async function as(uid, fn) {
  await db.exec(`set role authenticated`); await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid || '']);
  try { return await fn(); } finally { await db.exec(`reset role`); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}
const throws = async (fn) => { try { await fn(); return false; } catch (e) { return e.message || true; } };

ok((await q(`select count(*)::int n from pg_tables where tablename='invites'`))[0].n === 0, 'không còn bảng mã kích hoạt');
// tự đăng ký qua API (GoTrue chạy dưới supabase_auth_admin) phải bị chặn
ok(await throws(async () => { await db.exec('set role supabase_auth_admin'); try { await q(`insert into auth.users(email) values ('tu.dang.ky@x.y')`); } finally { await db.exec('reset role'); } }), 'chặn tự đăng ký');
ok(await as(null, () => throws(() => q(`select create_first_admin('hacker','12345678')`))), 'khách không gọi được create_first_admin');
const admin = (await q(`select create_first_admin('admin', 'Admin@123', 'Cô Thu') id`))[0].id;
ok((await q(`select role from profiles where id=$1`, [admin]))[0].role === 'admin', 'tạo admin đầu tiên trong SQL Editor');
ok(await throws(() => q(`select create_first_admin('admin2', 'Admin@123')`)), 'không tạo được admin đầu tiên lần hai');
const u0 = (await q(`select email, email_confirmed_at is not null c, encrypted_password like '$2%' b, confirmation_token from auth.users where id=$1`, [admin]))[0];
ok(u0.email === 'admin@taikhoan.detoan.app' && u0.c && u0.b && u0.confirmation_token === '', 'tài khoản đúng định dạng Supabase (email nội bộ, đã xác nhận, bcrypt)');
ok((await q(`select count(*)::int n from auth.identities where user_id=$1 and provider='email'`, [admin]))[0].n === 1, 'có identity email');

// admin dựng dữ liệu
const ids = await as(admin, async () => {
  const co = (await q(`insert into cohorts(name, end_date) values ('2025-2028', '2028-06-30') returning id`))[0].id;
  const cl = (await q(`insert into classes(name, grade, cohort_id, school_year) values ('10A1', 10, $1, '2025-2026') returning id`, [co]))[0].id;
  const cl2 = (await q(`insert into classes(name, grade, cohort_id, school_year) values ('10A2', 10, $1, '2025-2026') returning id`, [co]))[0].id;
  const s1 = (await q(`insert into students(full_name, sbd, class_id, cohort_id) values ('Lưu Khánh Linh','10012345',$1,$2) returning id`, [cl, co]))[0].id;
  const s2 = (await q(`insert into students(full_name, sbd, class_id, cohort_id) values ('Trần Văn B','10012346',$1,$2) returning id`, [cl2, co]))[0].id;
  return { co, cl, cl2, s1, s2 };
});
const mk = (u, role, extra = {}) => as(admin, async () => (await q(`select admin_create_account($1, 'MatKhau1', $2, $3, $4, $5) id`, [u, role, extra.name || '', extra.student || null, extra.subjects || '{}']))[0].id);
const teacher = await mk('cohoa', 'teacher', { name: 'Cô Hoa', subjects: '{toan}' });
ok((await q(`select role from profiles where id=$1`, [teacher]))[0].role === 'teacher', 'admin tạo được giáo viên');
ok(await throws(() => mk('cohoa', 'teacher')), 'không trùng tên đăng nhập');
ok(await throws(() => mk('Tên Sai', 'teacher')), 'tên đăng nhập sai định dạng bị từ chối');
ok(await as(teacher, () => throws(() => q(`select admin_create_account('gv2','MatKhau1','teacher')`))), 'GV KHÔNG tạo được tài khoản');
ok(await as(teacher, () => throws(() => q(`select admin_create_account('hsx','MatKhau1','student','', $1)`, [ids.s1]))), 'GV KHÔNG tạo được tài khoản HS');
ok((await as(teacher, () => q(`select count(*)::int n from questions where pool='exam'`)))[0].n === SEEDN.e, 'GV thấy toàn bộ kho đề');
await as(teacher, () => q(`insert into exams(id, name, data) values ('ex1','Giữa kỳ','{}')`));
await as(teacher, () => q(`insert into results(id, exam_id, student_id, total, image_path) values ('r1','ex1',$1, 8.5, $2), ('r2','ex1',$3, 6, $4)`, [ids.s1, ids.s1 + '/r1.jpg', ids.s2, ids.s2 + '/r2.jpg']));
await as(teacher, () => q(`insert into storage.objects(bucket_id, name) values ('phieu', $1), ('phieu', $2)`, [ids.s1 + '/r1.jpg', ids.s2 + '/r2.jpg']));

const stu = await mk('hs10012345', 'student', { student: ids.s1 });
const par = await mk('ph10012345', 'parent', { student: ids.s1 });
ok(await throws(() => mk('hs.trung', 'student', { student: ids.s1 })), 'một HS chỉ có một tài khoản');
ok((await q(`select full_name from profiles where id=$1`, [par]))[0].full_name === 'Phụ huynh Lưu Khánh Linh', 'tên phụ huynh tự đặt theo con');
ok((await q(`select user_id from students where id=$1`, [ids.s1]))[0].user_id === stu, 'HS gắn với hồ sơ học sinh');
ok((await q(`select count(*)::int n from parent_links where parent_id=$1 and student_id=$2`, [par, ids.s1]))[0].n === 1, 'PH gắn với con');

// học sinh
await as(stu, async () => {
  ok((await q(`select count(*)::int n from questions where pool='exam'`))[0].n === 0, 'HS KHÔNG thấy câu kho đề');
  ok((await q(`select count(*)::int n from questions`))[0].n === SEEDN.p, 'HS chỉ thấy câu luyện tập');
  ok((await q(`select count(*)::int n from exams`))[0].n === 0, 'HS không thấy đề');
  const rs = await q(`select id, total from results`); ok(rs.length === 1 && rs[0].id === 'r1', 'HS chỉ thấy điểm của mình');
  ok((await q(`select count(*)::int n from students`))[0].n === 1, 'HS chỉ thấy hồ sơ mình');
  ok((await q(`select count(*)::int n from storage.objects`))[0].n === 1, 'HS chỉ xem được ảnh phiếu của mình');
  ok(await throws(() => q(`update results set total=10 where id='r1'`)).then ? true : true, '');
  const upd = await q(`update results set total = 10 where id = 'r1' returning id`); ok(upd.length === 0, 'HS không sửa được điểm');
  ok(await throws(() => q(`select admin_create_account('x1x','MatKhau1','student','', $1)`, [ids.s2])), 'HS không tạo được tài khoản');
  ok((await q(`select count(*)::int n from profiles`))[0].n === 1, 'HS chỉ thấy hồ sơ tài khoản mình');
});
// phụ huynh
await as(par, async () => {
  const rs = await q(`select id from results`); ok(rs.length === 1 && rs[0].id === 'r1', 'PH chỉ thấy điểm của con');
  ok((await q(`select count(*)::int n from questions where pool='exam'`))[0].n === 0, 'PH không thấy kho đề');
  ok((await q(`select count(*)::int n from storage.objects`))[0].n === 1, 'PH xem được ảnh phiếu của con');
  ok(await throws(() => q(`select admin_link_parent($1, $2)`, [par, ids.s2])), 'PH không tự gắn thêm con');
});

// bài tập về nhà
const practiceIds = (await q(`select id, type, data from questions where pool='practice' and grade=10 and chapter='10-1' order by id`));
const examQ = (await q(`select id from questions where pool='exam' limit 1`))[0].id;
ok(await as(teacher, () => throws(() => q(`insert into assignments(class_id, title, question_ids) values ($1,'x',$2)`, [ids.cl, [examQ]]))), 'Không giao được câu kho đề làm bài về nhà');
const asg = (await as(teacher, () => q(`insert into assignments(class_id, title, chapter, question_ids) values ($1,'Bài 1. Mệnh đề','10-1',$2) returning id`, [ids.cl, practiceIds.map(r => r.id)])))[0].id;
ok(!!asg, 'GV giao bài tập về nhà');
await as(stu, async () => {
  ok((await q(`select count(*)::int n from assignments`))[0].n === 1, 'HS thấy bài tập của lớp mình');
  const ans = {};
  for (const r of practiceIds) { if (r.type === 'mcq') ans[r.id] = r.data.answer; if (r.type === 'tf') ans[r.id] = r.data.answer; if (r.type === 'short') ans[r.id] = r.data.answer; }
  const res = (await q(`select submit_assignment($1, $2) r`, [asg, JSON.stringify(ans)]))[0].r;
  ok(res.score === res.max && res.max > 0, `HS nộp bài, chấm trên máy chủ: ${res.score}/${res.max}`);
  ok(await throws(() => q(`insert into submissions(assignment_id, student_id, score) values ($1,$2,100)`, [asg, ids.s1])), 'HS không tự ghi điểm bài tập');
});
await as(admin, () => q(`select admin_link_parent($1, $2)`, [par, ids.s2]));
await as(par, async () => ok((await q(`select count(*)::int n from results`))[0].n === 2, 'admin gắn con thứ hai → PH thấy điểm 2 con'));
const stu2 = await mk('hs10012346', 'student', { student: ids.s2 });
await as(stu2, async () => ok((await q(`select count(*)::int n from assignments`))[0].n === 0, 'HS lớp khác không thấy bài tập lớp 10A1'));

// tên đăng nhập & đặt lại mật khẩu
ok((await as(null, () => q(`select username_available('hs10012345') a`)))[0].a === false, 'username_available: tên đã dùng');
ok((await as(null, () => q(`select username_available('ten.moi') a`)))[0].a === true, 'username_available: tên trống');
ok(!(await as(teacher, () => throws(() => q(`select reset_password($1, 'matkhau123')`, [stu])))), 'GV đặt lại mật khẩu HS');
ok((await q(`select encrypted_password like '$2%' ok from auth.users where id=$1`, [stu]))[0].ok, 'mật khẩu được mã hóa bcrypt');
ok(await as(teacher, () => throws(() => q(`select reset_password($1, 'matkhau123')`, [admin]))), 'GV không đặt lại được mật khẩu admin');
ok(await as(stu, () => throws(() => q(`select reset_password($1, 'matkhau123')`, [par]))), 'HS không đặt lại được mật khẩu người khác');

const tmp = await mk('gv.tam', 'teacher', { name: 'GV tạm' });
ok(await as(teacher, () => throws(() => q(`select admin_delete_account($1)`, [tmp]))), 'GV không xóa được tài khoản');
await as(admin, () => q(`select admin_delete_account($1)`, [tmp]));
ok((await q(`select count(*)::int n from profiles where id=$1`, [tmp]))[0].n === 0, 'admin xóa được tài khoản');
ok(await as(admin, () => throws(() => q(`select admin_delete_account($1)`, [admin]))), 'admin không tự xóa mình');

// ĐĂNG KÝ CÓ DUYỆT
const reg = (p) => as(null, () => q(`select submit_registration($1) r`, [JSON.stringify(p)]));
await reg({ role: 'student', full_name: 'Nguyễn Văn Nam', phone: '0912 345 678', password: 'hocsinh1', class_name: '10a1', grade: 10, cohort: '2025-2028' });
ok(await throws(() => reg({ role: 'student', full_name: 'Ai Đó Khác', phone: '0912345678', password: 'xxxxxx1', class_name: '10A1', grade: 10 })), 'trùng SĐT đang chờ duyệt bị từ chối');
ok(await throws(() => reg({ role: 'student', full_name: 'Sai Số', phone: '12345', password: 'xxxxxx1', class_name: '10A1', grade: 10 })), 'SĐT sai định dạng bị từ chối');
ok(await throws(() => reg({ role: 'admin', full_name: 'Muốn Làm Admin', phone: '0900000001', password: 'xxxxxx1' })), 'không đăng ký được vai trò admin');
ok(await throws(() => reg({ role: 'teacher', full_name: 'Thiếu Môn', phone: '0900000002', password: 'xxxxxx1' })), 'GV phải nhập môn dạy');
const stPend = await as(null, () => q(`select registration_status('0912345678', 'hocsinh1') r`));
ok(stPend[0].r && stPend[0].r.status === 'pending', 'đăng nhập khi chưa duyệt → biết là đang chờ duyệt');
ok((await as(null, () => q(`select registration_status('0912345678', 'saimatkhau') r`)))[0].r === null, 'sai mật khẩu thì không tiết lộ trạng thái');
ok((await q(`select count(*)::int n from registrations where password_hash like '$2%'`))[0].n === 1, 'mật khẩu đăng ký được băm bcrypt');
ok((await as(teacher, () => q(`select count(*)::int n from registrations`)))[0].n === 0, 'GV không xem được đơn đăng ký');
const regId = (await q(`select id from registrations where phone='0912345678'`))[0].id;
ok(await as(teacher, () => throws(() => q(`select admin_approve_registration($1, null, $2)`, [regId, ids.cl]))), 'GV không duyệt được');
const newStu = (await as(admin, () => q(`select admin_approve_registration($1, null, $2) id`, [regId, ids.cl])))[0].id;
const ns = (await q(`select p.role, p.username, p.phone, s.full_name, s.class_id from profiles p join students s on s.user_id = p.id where p.id = $1`, [newStu]))[0];
ok(ns && ns.role === 'student' && ns.username === '0912345678' && ns.class_id === ids.cl, 'duyệt HS: tạo tài khoản đúng vai trò, đúng lớp, tên đăng nhập = SĐT');
ok((await q(`select encrypted_password = crypt('hocsinh1', encrypted_password) ok from auth.users where id=$1`, [newStu]))[0].ok, 'HS đăng nhập bằng đúng mật khẩu đã đăng ký');
ok((await q(`select count(*)::int n from registrations where phone='0912345678'`))[0].n === 0, 'duyệt xong xóa đơn (không giữ mật khẩu băm)');
await reg({ role: 'parent', full_name: 'Nguyễn Văn Bố', phone: '0987654321', password: 'phuhuynh1', child_name: 'Nguyễn Văn Nam', class_name: '10A1', grade: 10 });
const pReg = (await q(`select id from registrations where phone='0987654321'`))[0].id;
ok(await as(admin, () => throws(() => q(`select admin_approve_registration($1)`, [pReg]))), 'duyệt PH bắt buộc chọn con');
const namSid = (await q(`select id from students where user_id=$1`, [newStu]))[0].id;
const newPar = (await as(admin, () => q(`select admin_approve_registration($1, $2) id`, [pReg, namSid])))[0].id;
ok((await q(`select count(*)::int n from parent_links where parent_id=$1`, [newPar]))[0].n === 1, 'duyệt PH: gắn đúng con');
await reg({ role: 'teacher', full_name: 'Trần Thị Lan', phone: '0911222333', password: 'giaovien1', subject: 'Toán', homeroom: '10A1' });
const tReg = (await q(`select id from registrations where phone='0911222333'`))[0].id;
const newT = (await as(admin, () => q(`select admin_approve_registration($1, null, $2, '{toan}') id`, [tReg, ids.cl])))[0].id;
ok((await q(`select role from profiles where id=$1`, [newT]))[0].role === 'teacher' && (await q(`select homeroom from teacher_classes where teacher_id=$1`, [newT]))[0].homeroom === true, 'duyệt GV: đúng vai trò, ghi lớp chủ nhiệm');
await reg({ role: 'student', full_name: 'Người Lạ', phone: '0909090909', password: 'nguoila1', class_name: '12A9', grade: 12 });
const rReg = (await q(`select id from registrations where phone='0909090909'`))[0].id;
await as(admin, () => q(`select admin_reject_registration($1, 'Không có trong danh sách lớp')`, [rReg]));
const stRej = (await as(null, () => q(`select registration_status('0909090909', 'nguoila1') r`)))[0].r;
ok(stRej.status === 'rejected' && /danh sách/.test(stRej.note), 'bị từ chối → báo lý do');
ok(!(await throws(() => reg({ role: 'student', full_name: 'Người Lạ', phone: '0909090909', password: 'nguoila2', class_name: '12A1', grade: 12 }))), 'đăng ký lại được sau khi bị từ chối');
ok(await throws(() => reg({ role: 'student', full_name: 'Trùng Tài Khoản', phone: '0912345678', password: 'xxxxxx1', class_name: '10A1', grade: 10 })), 'SĐT đã có tài khoản thì không đăng ký lại');

// liên hệ giáo viên
await as(admin, () => q(`insert into teacher_classes(teacher_id, class_id, subject, homeroom) values ($1, $2, 'toan', false)`, [teacher, ids.cl]));
await as(par, async () => {
  const cs = await q(`select * from my_contacts()`);
  ok(cs.some(c => c.teacher_name === 'Trần Thị Lan' && c.homeroom) && cs.some(c => c.teacher_name === 'Cô Hoa' && c.subject === 'Toán'), 'PH xem được GVCN và GV bộ môn của lớp con');
  ok(cs.every(c => c.class_name === '10A1' || c.class_name === '10A2'), 'chỉ thấy lớp của con');
});
await as(stu2, async () => ok((await q(`select * from my_contacts()`)).every(c => c.class_name === '10A2'), 'HS chỉ thấy GV lớp mình'));
ok((await q(`select count(*)::int n from subjects`))[0].n >= 16, 'có đủ danh sách môn học');

// lớp chủ nhiệm: điểm danh, nề nếp, công việc
await as(newT, () => q(`insert into attendance(class_id, student_id, date, session, status) values ($1,$2,current_date,'sang','absent'), ($1,$3,current_date,'sang','present')`, [ids.cl, ids.s1, namSid]));
await as(newT, () => q(`insert into conduct_events(class_id, student_id, kind, category, points) values ($1,$2,'violation','Đi muộn',-2), ($1,$3,'reward','Phát biểu xây dựng bài',2)`, [ids.cl, ids.s1, namSid]));
await as(newT, () => q(`insert into homeroom_tasks(class_id, title, kind) values ($1,'Họp phụ huynh đầu năm','meeting')`, [ids.cl]));
await as(par, async () => {
  const at = await q(`select student_id, status from attendance`); ok(at.length === 1 && at[0].student_id === ids.s1, 'PH chỉ thấy điểm danh của con');
  ok((await q(`select count(*)::int n from homeroom_tasks`))[0].n === 0, 'PH không thấy công việc chủ nhiệm');
  ok(await throws(() => q(`insert into conduct_events(class_id, student_id, kind, category, points) values ($1,$2,'reward','Tự cộng',100)`, [ids.cl, ids.s1])), 'PH không tự ghi khen thưởng');
});
await as(stu2, async () => ok((await q(`select count(*)::int n from conduct_events`))[0].n === 0, 'HS lớp khác không thấy nề nếp của lớp 10A1'));
await as(newStu, async () => { const c = await q(`select category from conduct_events`); ok(c.length === 1 && c[0].category === 'Phát biểu xây dựng bài', 'HS chỉ thấy nề nếp của mình'); });

// hết khóa
await q(`update cohorts set end_date = current_date - 1`);
const n = (await q(`select purge_expired_accounts() n`))[0].n;
ok(n === 5, 'Hết khóa: xóa ' + n + ' tài khoản (3 HS + 2 PH)');
ok((await q(`select count(*)::int n from profiles where role in ('student','parent')`))[0].n === 0, 'Không còn hồ sơ HS/PH');
ok((await q(`select count(*)::int n from profiles where role in ('admin','teacher')`))[0].n === 3, 'Admin & GV vẫn còn');
ok(await as(teacher, () => throws(() => q(`select purge_expired_accounts()`))), 'GV không tự gọi được hàm xóa');
console.log(fails ? `\n${fails} lỗi` : '\nTẤT CẢ ĐẠT');
process.exit(fails ? 1 : 0);
