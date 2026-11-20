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
create table auth.users(id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}', encrypted_password text, updated_at timestamptz);
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
ok((await q(`select count(*)::int n from questions`))[0].n === 534, 'seed 534 câu');

const adminCode = (await q(`select code from invites where role='admin' and used_at is null`))[0].code;
ok(/^ADMIN-/.test(adminCode), 'có mã admin ' + adminCode);

async function signup(code, username) {
  return (await q(`insert into auth.users(email, raw_user_meta_data) values ($1, $2) returning id`, [username + '@tk.local', JSON.stringify({ invite: code, username })]))[0].id;
}
async function as(uid, fn) {
  await db.exec(`set role authenticated`); await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid || '']);
  try { return await fn(); } finally { await db.exec(`reset role`); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}
const throws = async (fn) => { try { await fn(); return false; } catch (e) { return e.message; } };

// mã sai
ok(await throws(() => signup('SAI-MA', 'x')), 'mã sai bị từ chối');
const admin = await signup(adminCode, 'admin');
ok((await q(`select role from profiles where id=$1`, [admin]))[0].role === 'admin', 'tạo được admin');
ok(await throws(() => signup(adminCode, 'admin2')), 'mã đã dùng không dùng lại được');

// admin dựng dữ liệu
const ids = await as(admin, async () => {
  const co = (await q(`insert into cohorts(name, end_date) values ('2025-2028', '2028-06-30') returning id`))[0].id;
  const cl = (await q(`insert into classes(name, grade, cohort_id, school_year) values ('10A1', 10, $1, '2025-2026') returning id`, [co]))[0].id;
  const cl2 = (await q(`insert into classes(name, grade, cohort_id, school_year) values ('10A2', 10, $1, '2025-2026') returning id`, [co]))[0].id;
  const s1 = (await q(`insert into students(full_name, sbd, class_id, cohort_id) values ('Lưu Khánh Linh','10012345',$1,$2) returning id`, [cl, co]))[0].id;
  const s2 = (await q(`insert into students(full_name, sbd, class_id, cohort_id) values ('Trần Văn B','10012346',$1,$2) returning id`, [cl2, co]))[0].id;
  await q(`insert into invites(code, role, full_name, subjects) values ('GV-TOAN-1','teacher','Cô Hoa','{toan}')`);
  await q(`insert into invites(code, role, student_id) values ('HS-1','student',$1), ('PH-1','parent',$1), ('HS-2','student',$2), ('PH-2','parent',$2)`, [s1, s2]);
  return { co, cl, cl2, s1, s2 };
});
const teacher = await signup('GV-TOAN-1', 'cohoa');
ok((await q(`select role, subjects from profiles where id=$1`, [teacher]))[0].role === 'teacher', 'tạo được giáo viên');
const chk = await as(null, () => q(`select check_invite('hs-1') r`));
ok(chk[0].r.ok && chk[0].r.student_name === 'Lưu Khánh Linh', 'check_invite (chưa đăng nhập) trả về tên HS');

// giáo viên không tạo được mã giáo viên, tạo được mã HS
ok(await as(teacher, () => throws(() => q(`insert into invites(code, role) values ('GV-X','teacher')`))), 'GV không tạo được mã GV');
ok(!(await as(teacher, () => throws(() => q(`insert into invites(code, role, student_id) values ('PH-1B','parent',$1)`, [ids.s1])))), 'GV tạo được mã PH');
ok((await as(teacher, () => q(`select count(*)::int n from questions where pool='exam'`)))[0].n === 300, 'GV thấy kho đề (300)');
await as(teacher, () => q(`insert into exams(id, name, data) values ('ex1','Giữa kỳ','{}')`));
await as(teacher, () => q(`insert into results(id, exam_id, student_id, total, image_path) values ('r1','ex1',$1, 8.5, $2), ('r2','ex1',$3, 6, $4)`, [ids.s1, ids.s1 + '/r1.jpg', ids.s2, ids.s2 + '/r2.jpg']));
await as(teacher, () => q(`insert into storage.objects(bucket_id, name) values ('phieu', $1), ('phieu', $2)`, [ids.s1 + '/r1.jpg', ids.s2 + '/r2.jpg']));

const stu = await signup('HS-1', '10012345');
const par = await signup('PH-1', 'phuhuynh.linh');
ok((await q(`select user_id from students where id=$1`, [ids.s1]))[0].user_id === stu, 'HS gắn với hồ sơ học sinh');
ok((await q(`select count(*)::int n from parent_links where parent_id=$1 and student_id=$2`, [par, ids.s1]))[0].n === 1, 'PH gắn với con');

// học sinh
await as(stu, async () => {
  ok((await q(`select count(*)::int n from questions where pool='exam'`))[0].n === 0, 'HS KHÔNG thấy câu kho đề');
  ok((await q(`select count(*)::int n from questions`))[0].n === 234, 'HS chỉ thấy 234 câu luyện tập');
  ok((await q(`select count(*)::int n from exams`))[0].n === 0, 'HS không thấy đề');
  const rs = await q(`select id, total from results`); ok(rs.length === 1 && rs[0].id === 'r1', 'HS chỉ thấy điểm của mình');
  ok((await q(`select count(*)::int n from students`))[0].n === 1, 'HS chỉ thấy hồ sơ mình');
  ok((await q(`select count(*)::int n from storage.objects`))[0].n === 1, 'HS chỉ xem được ảnh phiếu của mình');
  ok(await throws(() => q(`update results set total=10 where id='r1'`)).then ? true : true, '');
  const upd = await q(`update results set total = 10 where id = 'r1' returning id`); ok(upd.length === 0, 'HS không sửa được điểm');
  ok(await throws(() => q(`insert into invites(code, role) values ('X','student')`)), 'HS không tạo được mã');
  ok((await q(`select count(*)::int n from profiles`))[0].n === 1, 'HS chỉ thấy hồ sơ tài khoản mình');
});
// phụ huynh
await as(par, async () => {
  const rs = await q(`select id from results`); ok(rs.length === 1 && rs[0].id === 'r1', 'PH chỉ thấy điểm của con');
  ok((await q(`select count(*)::int n from questions where pool='exam'`))[0].n === 0, 'PH không thấy kho đề');
  ok((await q(`select count(*)::int n from storage.objects`))[0].n === 1, 'PH xem được ảnh phiếu của con');
  await q(`select redeem_parent_invite('PH-2')`);
  ok((await q(`select count(*)::int n from results`))[0].n === 2, 'PH nhập thêm mã con thứ hai → thấy điểm 2 con');
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
const stu2 = await signup('HS-2', '10012346');
await as(stu2, async () => ok((await q(`select count(*)::int n from assignments`))[0].n === 0, 'HS lớp khác không thấy bài tập lớp 10A1'));

// tên đăng nhập & đặt lại mật khẩu
ok((await as(null, () => q(`select username_available('10012345') a`)))[0].a === false, 'username_available: tên đã dùng');
ok((await as(null, () => q(`select username_available('ten.moi') a`)))[0].a === true, 'username_available: tên trống');
ok(!(await as(teacher, () => throws(() => q(`select reset_password($1, 'matkhau123')`, [stu])))), 'GV đặt lại mật khẩu HS');
ok((await q(`select encrypted_password like '$2%' ok from auth.users where id=$1`, [stu]))[0].ok, 'mật khẩu được mã hóa bcrypt');
ok(await as(teacher, () => throws(() => q(`select reset_password($1, 'matkhau123')`, [admin]))), 'GV không đặt lại được mật khẩu admin');
ok(await as(stu, () => throws(() => q(`select reset_password($1, 'matkhau123')`, [par]))), 'HS không đặt lại được mật khẩu người khác');

// hết khóa
await q(`update cohorts set end_date = current_date - 1`);
const n = (await q(`select purge_expired_accounts() n`))[0].n;
ok(n === 3, 'Hết khóa: xóa ' + n + ' tài khoản (2 HS + 1 PH)');
ok((await q(`select count(*)::int n from profiles where role in ('student','parent')`))[0].n === 0, 'Không còn hồ sơ HS/PH');
ok((await q(`select count(*)::int n from profiles where role in ('admin','teacher')`))[0].n === 2, 'Admin & GV vẫn còn');
ok(await as(teacher, () => throws(() => q(`select purge_expired_accounts()`))), 'GV không tự gọi được hàm xóa');
console.log(fails ? `\n${fails} lỗi` : '\nTẤT CẢ ĐẠT');
process.exit(fails ? 1 : 0);
