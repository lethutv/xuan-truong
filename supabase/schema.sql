-- =====================================================================
--  Tạo đề Toán – cơ sở dữ liệu & phân quyền cho Supabase
--  Chạy MỘT LẦN trong Supabase Dashboard → SQL Editor (dán toàn bộ rồi Run).
--  Chạy lại nhiều lần vẫn an toàn (dùng IF NOT EXISTS / OR REPLACE).
--
--  Vai trò: admin · teacher (giáo viên bộ môn) · student (học sinh) · parent (phụ huynh)
--  Nguyên tắc:
--   * Kho đề kiểm tra (pool = 'exam') CHỈ giáo viên/admin đọc được.
--   * Học sinh, phụ huynh chỉ thấy kho luyện tập, bài tập của lớp mình và điểm của mình/con mình.
--   * Đăng ký phải được ADMIN DUYỆT mới thành tài khoản (đăng nhập bằng số điện thoại). Admin cũng tạo trực tiếp được.
--   * Hết khóa (cohorts.end_date) → tài khoản học sinh & phụ huynh tự xóa (pg_cron chạy mỗi đêm).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Bảng
-- ---------------------------------------------------------------------
create table if not exists public.subjects (
  code text primary key,
  name text not null
);
insert into public.subjects(code, name) values
  ('toan', 'Toán'), ('van', 'Ngữ văn'), ('anh', 'Tiếng Anh'), ('ly', 'Vật lí'), ('hoa', 'Hóa học'), ('sinh', 'Sinh học'),
  ('su', 'Lịch sử'), ('dia', 'Địa lí'), ('gdktpl', 'GD Kinh tế & Pháp luật'), ('tin', 'Tin học'), ('congnghe', 'Công nghệ'),
  ('gdtc', 'Giáo dục thể chất'), ('qpan', 'GD Quốc phòng & An ninh'), ('amnhac', 'Âm nhạc'), ('mithuat', 'Mĩ thuật'),
  ('khac', 'Khác'), ('gvcn', 'Chủ nhiệm')
on conflict (code) do update set name = excluded.name;

create table if not exists public.cohorts (            -- Khóa học, ví dụ 2025-2028
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  end_date date not null,                              -- sau ngày này tài khoản HS/PH bị xóa
  created_at timestamptz not null default now()
);

create table if not exists public.classes (            -- Lớp, ví dụ 10A1
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade int not null check (grade between 1 and 12),  -- khối
  cohort_id uuid references public.cohorts(id) on delete cascade,
  school_year text not null default '',                -- năm học, ví dụ 2025-2026
  created_at timestamptz not null default now(),
  unique (name, school_year)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent')),
  username text not null unique,
  full_name text not null default '',
  subjects text[] not null default '{}',               -- môn dạy (giáo viên)
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  sbd text unique,                                     -- số báo danh tô trên phiếu (tối đa 8 số)
  class_id uuid references public.classes(id) on delete set null,
  cohort_id uuid references public.cohorts(id) on delete cascade,
  dob date,
  user_id uuid unique references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.parent_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (parent_id, student_id)
);

create table if not exists public.teacher_classes (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null default 'toan' references public.subjects(code),
  primary key (teacher_id, class_id, subject)
);

drop table if exists public.invites cascade;           -- (bản cũ dùng mã kích hoạt – đã bỏ)

create table if not exists public.questions (
  id text primary key,
  subject text not null default 'toan' references public.subjects(code),
  grade int,
  chapter text,
  topic text,
  type text not null check (type in ('mcq', 'tf', 'short', 'essay')),
  level text,
  pool text not null default 'exam' check (pool in ('exam', 'practice')),
  data jsonb not null,                                 -- toàn bộ câu hỏi (nội dung, đáp án, lời giải, hình)
  owner_id uuid references public.profiles(id) on delete set null default auth.uid(),
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists questions_pool_idx on public.questions(pool, grade, chapter);

create table if not exists public.exams (
  id text primary key,
  owner_id uuid references public.profiles(id) on delete set null default auth.uid(),
  subject text not null default 'toan' references public.subjects(code),
  name text not null default '',
  data jsonb not null,                                 -- đề đầy đủ (các mã đề, đáp án)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.results (            -- kết quả chấm phiếu
  id text primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  exam_name text not null default '',                  -- tên đề (để HS/PH xem mà không cần đọc bảng exams)
  student_id uuid references public.students(id) on delete set null,
  sbd text,
  version_code text,
  fill jsonb,
  pos jsonb,
  essay numeric,
  p1 numeric, p2 numeric, p3 numeric, total numeric,
  image_path text,
  file text,
  published boolean not null default true,             -- cho HS/PH xem
  graded_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.results add column if not exists exam_name text not null default '';
create index if not exists results_student_idx on public.results(student_id);

create table if not exists public.assignments (        -- bài tập về nhà theo bài học
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null default 'toan' references public.subjects(code),
  grade int,
  chapter text,
  topic text,                                          -- bài học trong sách
  title text not null,
  question_ids text[] not null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  answers jsonb not null default '{}',
  detail jsonb not null default '{}',
  score numeric not null default 0,
  max_score numeric not null default 0,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- ---------------------------------------------------------------------
-- Hàm trợ giúp phân quyền (security definer để tránh vòng lặp RLS)
-- ---------------------------------------------------------------------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role in ('admin', 'teacher') from public.profiles where id = auth.uid()), false) $$;

create or replace function public.my_student_id() returns uuid
language sql stable security definer set search_path = public as
$$ select id from public.students where user_id = auth.uid() $$;

create or replace function public.my_children() returns setof uuid
language sql stable security definer set search_path = public as
$$ select student_id from public.parent_links where parent_id = auth.uid() $$;

create or replace function public.my_class_ids() returns setof uuid
language sql stable security definer set search_path = public as
$$ select class_id from public.students where class_id is not null and (user_id = auth.uid() or id in (select public.my_children())) $$;

-- ---------------------------------------------------------------------
-- Bật RLS và chính sách
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['subjects','cohorts','classes','profiles','students','parent_links','teacher_classes','questions','exams','results','assignments','submissions']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Quyền cơ bản trên bảng cho người đã đăng nhập (RLS bên dưới quyết định từng dòng).
-- Dự án Supabase mới không tự cấp quyền này. Khách (anon) không được đọc bảng nào.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- xóa chính sách cũ (để chạy lại được)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- subjects, cohorts, classes: ai đăng nhập cũng đọc được; admin sửa
create policy subjects_read on public.subjects for select to authenticated using (true);
create policy subjects_admin on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cohorts_read on public.cohorts for select to authenticated using (true);
create policy cohorts_admin on public.cohorts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy classes_read on public.classes for select to authenticated using (true);
create policy classes_staff on public.classes for insert to authenticated with check (public.is_staff());
create policy classes_staff_upd on public.classes for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy classes_admin_del on public.classes for delete to authenticated using (public.is_admin());

-- profiles: xem của mình; giáo viên/admin xem tất cả; admin sửa/xóa
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy profiles_admin_upd on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_admin_del on public.profiles for delete to authenticated using (public.is_admin());

-- students: GV/admin quản lý; HS xem mình; PH xem con
create policy students_staff on public.students for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy students_self on public.students for select to authenticated using (user_id = auth.uid() or id in (select public.my_children()));

create policy parent_links_staff on public.parent_links for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy parent_links_self on public.parent_links for select to authenticated using (parent_id = auth.uid());

create policy teacher_classes_admin on public.teacher_classes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy teacher_classes_self on public.teacher_classes for select to authenticated using (teacher_id = auth.uid() or public.is_staff());

-- questions: GV/admin toàn quyền; HS/PH CHỈ đọc kho luyện tập
create policy questions_staff on public.questions for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy questions_practice on public.questions for select to authenticated using (pool = 'practice' and not deleted);

-- exams: chỉ GV/admin
create policy exams_read on public.exams for select to authenticated using (public.is_staff());
create policy exams_insert on public.exams for insert to authenticated with check (public.is_staff());
create policy exams_update on public.exams for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy exams_delete on public.exams for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- results: GV/admin toàn quyền; HS xem của mình; PH xem của con
create policy results_staff on public.results for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy results_self on public.results for select to authenticated
  using (published and (student_id = public.my_student_id() or student_id in (select public.my_children())));

-- assignments: GV/admin quản lý; HS/PH xem bài của lớp mình/con
create policy assignments_staff on public.assignments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy assignments_class on public.assignments for select to authenticated using (class_id in (select public.my_class_ids()));

-- submissions: GV/admin xem; HS/PH xem; HS nộp qua hàm submit_assignment
create policy submissions_staff on public.submissions for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy submissions_self on public.submissions for select to authenticated
  using (student_id = public.my_student_id() or student_id in (select public.my_children()));

-- Bài tập về nhà chỉ được lấy câu từ kho luyện tập
create or replace function public.check_assignment_questions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from unnest(new.question_ids) qid left join public.questions q on q.id = qid
             where q.id is null or q.pool <> 'practice') then
    raise exception 'Bài tập về nhà chỉ được dùng câu hỏi trong kho luyện tập';
  end if;
  return new;
end $$;
drop trigger if exists assignments_check on public.assignments;
create trigger assignments_check before insert or update on public.assignments
  for each row execute function public.check_assignment_questions();

-- ---------------------------------------------------------------------
-- Tài khoản: KHÔNG tự đăng ký – chỉ admin tạo
-- Đăng nhập bằng tên đăng nhập; email nội bộ = <tên>@<login_domain()> (phải trùng LOGIN_DOMAIN trong js/config.js)
-- ---------------------------------------------------------------------
drop function if exists public.check_invite(text);
drop function if exists public.redeem_parent_invite(text);
drop function if exists public.login_email(text);

create or replace function public.login_domain() returns text language sql immutable as $$ select 'taikhoan.detoan.app' $$;

-- Chặn mọi đăng ký qua API (signUp). Tài khoản chỉ được tạo bởi các hàm bên dưới.
-- (Hàm trigger KHÔNG là security definer để biết ai đang tạo: GoTrue chạy dưới vai trò supabase_auth_admin.)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
create or replace function public.block_self_signup() returns trigger language plpgsql as $$
begin
  if current_user = 'supabase_auth_admin' then
    raise exception 'Không tự đăng ký được – tài khoản do quản trị viên cấp';
  end if;
  return new;
end $$;
drop trigger if exists block_self_signup on auth.users;
create trigger block_self_signup before insert on auth.users
  for each row execute function public.block_self_signup();

-- Hàm nội bộ tạo tài khoản đăng nhập + hồ sơ
create or replace function public._create_account(p_username text, p_password text, p_role text, p_full_name text, p_subjects text[])
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid(); u text := lower(trim(coalesce(p_username, ''))); em text;
begin
  if u !~ '^[a-z0-9._]{3,30}$' then raise exception 'Tên đăng nhập "%" không hợp lệ (3–30 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới)', u; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Mật khẩu tối thiểu 6 ký tự'; end if;
  if p_role not in ('admin', 'teacher', 'student', 'parent') then raise exception 'Vai trò không hợp lệ'; end if;
  em := u || '@' || public.login_domain();
  if exists (select 1 from public.profiles where username = u) or exists (select 1 from auth.users where email = em) then
    raise exception 'Tên đăng nhập "%" đã có người dùng', u;
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('username', u, 'full_name', coalesce(p_full_name, '')), now(), now(),
      '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  insert into public.profiles (id, role, username, full_name, subjects) values (uid, p_role, u, coalesce(p_full_name, ''), coalesce(p_subjects, '{}'));
  return uid;
end $$;
revoke execute on function public._create_account(text, text, text, text, text[]) from public, anon, authenticated;

-- Admin tạo tài khoản. Học sinh/phụ huynh phải gắn với một học sinh trong danh sách.
create or replace function public.admin_create_account(p_username text, p_password text, p_role text,
    p_full_name text default '', p_student uuid default null, p_subjects text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid; s public.students;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được tạo tài khoản'; end if;
  if p_role in ('student', 'parent') then
    select * into s from public.students where id = p_student;
    if not found then raise exception 'Hãy chọn học sinh'; end if;
    if p_role = 'student' and s.user_id is not null then raise exception 'Học sinh % đã có tài khoản', s.full_name; end if;
  end if;
  uid := public._create_account(p_username, p_password, p_role,
           case when p_role = 'student' then s.full_name
                when p_role = 'parent' and coalesce(p_full_name, '') = '' then 'Phụ huynh ' || s.full_name
                else p_full_name end,
           p_subjects);
  if p_role = 'student' then update public.students set user_id = uid where id = s.id;
  elsif p_role = 'parent' then insert into public.parent_links (parent_id, student_id) values (uid, s.id) on conflict do nothing;
  end if;
  return uid;
end $$;

-- Gắn thêm con cho tài khoản phụ huynh đã có (anh chị em ruột)
create or replace function public.admin_link_parent(p_parent uuid, p_student uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  if (select role from public.profiles where id = p_parent) is distinct from 'parent' then raise exception 'Tài khoản không phải phụ huynh'; end if;
  insert into public.parent_links (parent_id, student_id) values (p_parent, p_student) on conflict do nothing;
  return true;
end $$;

-- Xóa tài khoản đăng nhập (giữ hồ sơ học sinh và điểm)
create or replace function public.admin_delete_account(p_user uuid) returns boolean
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  if p_user = auth.uid() then raise exception 'Không tự xóa tài khoản đang đăng nhập'; end if;
  delete from auth.users where id = p_user;
  return true;
end $$;

-- Tên đăng nhập còn trống không (admin dùng khi gợi ý tên)
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as
$$ select not exists (select 1 from public.profiles where username = lower(trim(p_username))) $$;
revoke execute on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

-- Đặt lại mật khẩu (không cần email): admin đặt cho mọi tài khoản, giáo viên đặt cho học sinh & phụ huynh
create or replace function public.reset_password(p_user uuid, p_password text) returns boolean
language plpgsql security definer set search_path = public, auth, extensions as $$
declare r text;
begin
  select role into r from public.profiles where id = p_user;
  if r is null then raise exception 'Không tìm thấy tài khoản'; end if;
  if not (public.is_admin() or (public.is_staff() and r in ('student', 'parent'))) then raise exception 'Không có quyền'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Mật khẩu tối thiểu 6 ký tự'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  return true;
end $$;

-- Tạo ADMIN ĐẦU TIÊN – chỉ chạy được trong SQL Editor và chỉ khi chưa có admin nào
create or replace function public.create_first_admin(p_username text, p_password text, p_full_name text default 'Quản trị viên')
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then raise exception 'Đã có admin. Hãy đăng nhập admin để tạo thêm tài khoản.'; end if;
  return public._create_account(p_username, p_password, 'admin', p_full_name, '{}');
end $$;
revoke execute on function public.create_first_admin(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- ĐĂNG KÝ CÓ DUYỆT
-- Người dùng gửi ĐƠN (chưa phải tài khoản). Admin duyệt → tài khoản được tạo đúng vai trò.
-- Đăng nhập bằng SỐ ĐIỆN THOẠI + mật khẩu đã chọn khi đăng ký.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists phone text;
alter table public.teacher_classes add column if not exists homeroom boolean not null default false;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('teacher', 'student', 'parent')),
  full_name text not null,
  phone text not null unique,
  password_hash text not null,                         -- bcrypt, không lưu mật khẩu gốc
  subject text,                                        -- GV: môn dạy
  homeroom text,                                       -- GV: chủ nhiệm lớp (nếu có)
  child_name text,                                     -- PH: họ tên con
  class_name text, grade int, cohort text,             -- HS: lớp/khối/khóa của mình; PH: của con
  status text not null default 'pending' check (status in ('pending', 'rejected')),
  note text,                                           -- lý do từ chối
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.registrations enable row level security;
grant select, update, delete on public.registrations to authenticated;
revoke all on public.registrations from anon;
drop policy if exists registrations_admin on public.registrations;
create policy registrations_admin on public.registrations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Gửi đơn đăng ký (gọi được khi chưa đăng nhập)
create or replace function public.submit_registration(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r text := p->>'role'; ph text := regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g');
        nm text := trim(coalesce(p->>'full_name', '')); pw text := coalesce(p->>'password', '');
begin
  if r not in ('teacher', 'student', 'parent') then raise exception 'Hãy chọn vai trò'; end if;
  if length(nm) < 4 or length(nm) > 80 then raise exception 'Họ và tên không hợp lệ'; end if;
  if ph !~ '^0\d{9,10}$' then raise exception 'Số điện thoại không hợp lệ (10–11 số, bắt đầu bằng 0)'; end if;
  if length(pw) < 6 or length(pw) > 72 then raise exception 'Mật khẩu từ 6 đến 72 ký tự'; end if;
  if exists (select 1 from public.profiles where username = ph or phone = ph) then
    raise exception 'Số điện thoại này đã có tài khoản. Hãy đăng nhập.';
  end if;
  if exists (select 1 from public.registrations where phone = ph and status = 'pending') then
    raise exception 'Số điện thoại này đã gửi đăng ký và đang chờ duyệt.';
  end if;
  if r = 'teacher' and coalesce(trim(p->>'subject'), '') = '' then raise exception 'Hãy nhập môn dạy'; end if;
  if r = 'parent' and coalesce(trim(p->>'child_name'), '') = '' then raise exception 'Hãy nhập họ tên con'; end if;
  if r in ('student', 'parent') and (coalesce(trim(p->>'class_name'), '') = '' or coalesce(p->>'grade', '') = '') then
    raise exception 'Hãy nhập lớp và khối';
  end if;
  delete from public.registrations where phone = ph and status = 'rejected';   -- đăng ký lại sau khi bị từ chối
  insert into public.registrations (role, full_name, phone, password_hash, subject, homeroom, child_name, class_name, grade, cohort)
  values (r, nm, ph, crypt(pw, gen_salt('bf')),
          nullif(trim(left(p->>'subject', 60)), ''), nullif(trim(left(p->>'homeroom', 30)), ''),
          nullif(trim(left(p->>'child_name', 80)), ''), nullif(upper(trim(left(p->>'class_name', 20))), ''),
          nullif(p->>'grade', '')::int, nullif(trim(left(p->>'cohort', 20)), ''));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.submit_registration(jsonb) to anon, authenticated;

-- Khi đăng nhập thất bại: kiểm tra có đơn đang chờ không (phải đúng mật khẩu mới trả lời)
create or replace function public.registration_status(p_phone text, p_password text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare g public.registrations;
begin
  select * into g from public.registrations where phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if not found or g.password_hash <> crypt(coalesce(p_password, ''), g.password_hash) then return null; end if;
  return jsonb_build_object('status', g.status, 'note', g.note, 'role', g.role);
end $$;
grant execute on function public.registration_status(text, text) to anon, authenticated;

-- Admin DUYỆT đơn → tạo tài khoản đúng vai trò, mật khẩu là mật khẩu người dùng đã chọn
--  p_student: HS – hồ sơ có sẵn để gắn (null = tạo hồ sơ mới trong p_class); PH – học sinh là con
--  p_class:   HS – lớp để tạo hồ sơ mới; GV – lớp chủ nhiệm (không bắt buộc)
create or replace function public.admin_approve_registration(p_id uuid, p_student uuid default null, p_class uuid default null, p_subjects text[] default null)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare g public.registrations; uid uuid; sid uuid; c public.classes;
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  select * into g from public.registrations where id = p_id for update;
  if not found then raise exception 'Không tìm thấy đơn đăng ký'; end if;
  if g.role = 'student' then
    if p_student is not null then
      if exists (select 1 from public.students where id = p_student and user_id is not null) then raise exception 'Học sinh này đã có tài khoản'; end if;
      sid := p_student;
    else
      select * into c from public.classes where id = p_class;
      if not found then raise exception 'Hãy chọn lớp cho học sinh'; end if;
      insert into public.students (full_name, class_id, cohort_id) values (g.full_name, c.id, c.cohort_id) returning id into sid;
    end if;
  elsif g.role = 'parent' then
    if p_student is null then raise exception 'Hãy chọn học sinh là con của phụ huynh'; end if;
  end if;
  uid := public._create_account(g.phone, encode(gen_random_bytes(12), 'hex'), g.role, g.full_name,
           case when g.role = 'teacher' then coalesce(p_subjects, array[coalesce(g.subject, '')]) else '{}' end);
  update auth.users set encrypted_password = g.password_hash where id = uid;       -- dùng đúng mật khẩu đã đăng ký
  update public.profiles set phone = g.phone where id = uid;
  if g.role = 'student' then update public.students set user_id = uid where id = sid;
  elsif g.role = 'parent' then insert into public.parent_links (parent_id, student_id) values (uid, p_student) on conflict do nothing;
  elsif g.role = 'teacher' and p_class is not null then
    insert into public.teacher_classes (teacher_id, class_id, subject, homeroom) values (uid, p_class, 'gvcn', true) on conflict do nothing;
  end if;
  delete from public.registrations where id = g.id;                                -- không giữ mật khẩu băm sau khi duyệt
  return uid;
end $$;

create or replace function public.admin_reject_registration(p_id uuid, p_note text default '') returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  update public.registrations set status = 'rejected', note = nullif(trim(p_note), ''), reviewed_at = now() where id = p_id;
  return found;
end $$;

-- Đơn bị từ chối quá 30 ngày thì tự xóa
create or replace function public.purge_old_registrations() returns void
language sql security definer set search_path = public as
$$ delete from public.registrations where status = 'rejected' and reviewed_at < now() - interval '30 days' $$;
revoke execute on function public.purge_old_registrations() from public, anon, authenticated;

-- Liên hệ giáo viên (chủ nhiệm & bộ môn) của lớp mình / lớp của con – không lộ thông tin tài khoản khác
create or replace function public.my_contacts()
returns table (student_id uuid, student_name text, class_name text, teacher_name text, teacher_phone text, subject text, homeroom boolean)
language sql stable security definer set search_path = public as $$
  select s.id, s.full_name, c.name, p.full_name, p.phone, coalesce(sj.name, tc.subject), tc.homeroom
  from public.students s
  join public.classes c on c.id = s.class_id
  join public.teacher_classes tc on tc.class_id = c.id
  join public.profiles p on p.id = tc.teacher_id
  left join public.subjects sj on sj.code = tc.subject
  where s.user_id = auth.uid() or s.id in (select public.my_children())
  order by s.full_name, tc.homeroom desc, sj.name
$$;
revoke execute on function public.my_contacts() from public, anon;
grant execute on function public.my_contacts() to authenticated;

-- ---------------------------------------------------------------------
-- Nộp bài tập về nhà – chấm trên máy chủ (HS không sửa được điểm)
-- answers: { "<id câu>": 2 | [true,false,..] | "2,5" | "bài làm tự luận" }
-- ---------------------------------------------------------------------
create or replace function public.num_eq(a text, b text) returns boolean
language plpgsql immutable as $$
declare x numeric; y numeric;
begin
  if a is null or b is null then return false; end if;
  a := replace(replace(trim(a), ' ', ''), '.', ','); b := replace(replace(trim(b), ' ', ''), '.', ',');
  if a = b then return true; end if;
  begin x := replace(a, ',', '.')::numeric; y := replace(b, ',', '.')::numeric; exception when others then return false; end;
  return x = y;
end $$;

create or replace function public.submit_assignment(p_assignment uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.assignments; sid uuid; q record; ans jsonb; k int; pts numeric; total numeric := 0; maxs numeric := 0;
        det jsonb := '{}'; rate numeric[] := array[0, 0.1, 0.25, 0.5, 1];
begin
  sid := public.my_student_id();
  if sid is null then raise exception 'Chỉ học sinh mới nộp bài'; end if;
  select * into a from public.assignments where id = p_assignment;
  if not found or a.class_id not in (select class_id from public.students where id = sid) then raise exception 'Không tìm thấy bài tập'; end if;
  for q in select id, type, data from public.questions where id = any(a.question_ids) loop
    ans := p_answers -> q.id; pts := 0;
    if q.type = 'mcq' then
      maxs := maxs + 1;
      if ans is not null and jsonb_typeof(ans) = 'number' and ans::int = (q.data->>'answer')::int then pts := 1; end if;
    elsif q.type = 'tf' then
      maxs := maxs + 1; k := 0;
      if ans is not null and jsonb_typeof(ans) = 'array' then
        for i in 0..3 loop
          if (ans->i) is not null and jsonb_typeof(ans->i) = 'boolean' and (ans->>i)::boolean = (q.data->'answer'->>i)::boolean then k := k + 1; end if;
        end loop;
      end if;
      pts := rate[k + 1];
    elsif q.type = 'short' then
      maxs := maxs + 1;
      if ans is not null and public.num_eq(ans #>> '{}', q.data->>'answer') then pts := 1; end if;
    end if;   -- tự luận: giáo viên chấm sau
    total := total + pts;
    det := det || jsonb_build_object(q.id, pts);
  end loop;
  insert into public.submissions(assignment_id, student_id, answers, detail, score, max_score, submitted_at)
    values (a.id, sid, coalesce(p_answers, '{}'), det, total, maxs, now())
    on conflict (assignment_id, student_id) do update
      set answers = excluded.answers, detail = excluded.detail, score = excluded.score, max_score = excluded.max_score, submitted_at = now();
  return jsonb_build_object('score', total, 'max', maxs, 'detail', det);
end $$;

-- ---------------------------------------------------------------------
-- Tự xóa tài khoản khi hết khóa
-- ---------------------------------------------------------------------
create or replace function public.purge_expired_accounts() returns int
language plpgsql security definer set search_path = public, auth as $$
declare n int := 0; m int := 0;
begin
  -- học sinh thuộc khóa đã kết thúc
  with expired as (
    select s.user_id from public.students s join public.cohorts c on c.id = s.cohort_id
    where c.end_date < current_date and s.user_id is not null
  ) delete from auth.users u using expired e where u.id = e.user_id;
  get diagnostics n = row_count;
  -- phụ huynh không còn con nào đang học
  with lonely as (
    select p.id from public.profiles p where p.role = 'parent' and not exists (
      select 1 from public.parent_links l join public.students s on s.id = l.student_id
      left join public.cohorts c on c.id = s.cohort_id
      where l.parent_id = p.id and (c.id is null or c.end_date >= current_date))
  ) delete from auth.users u using lonely l where u.id = l.id;
  get diagnostics m = row_count;
  perform public.purge_old_registrations();
  return n + m;
end $$;
revoke execute on function public.purge_expired_accounts() from public, anon, authenticated;

create or replace function public.admin_purge_now() returns int
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ admin'; end if;
  return public.purge_expired_accounts();
end $$;

-- Lịch chạy mỗi đêm 2:00 (giờ UTC). Cần bật extension pg_cron (Database → Extensions).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-expired-accounts';
  perform cron.schedule('purge-expired-accounts', '0 19 * * *', 'select public.purge_expired_accounts()');
exception when others then
  raise notice 'Chưa bật được pg_cron (%). Hãy bật extension pg_cron rồi chạy lại đoạn này, hoặc admin bấm "Xóa tài khoản hết khóa" trong app.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- Ảnh phiếu đã chấm (Storage, bucket riêng tư "phieu", đường dẫn <student_id>/<result_id>.jpg)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('phieu', 'phieu', false) on conflict (id) do nothing;
drop policy if exists phieu_staff on storage.objects;
drop policy if exists phieu_self on storage.objects;
create policy phieu_staff on storage.objects for all to authenticated
  using (bucket_id = 'phieu' and public.is_staff()) with check (bucket_id = 'phieu' and public.is_staff());
create policy phieu_self on storage.objects for select to authenticated
  using (bucket_id = 'phieu' and ((storage.foldername(name))[1] = public.my_student_id()::text
         or (storage.foldername(name))[1] in (select public.my_children()::text)));

-- ---------------------------------------------------------------------
-- BƯỚC CUỐI: tạo tài khoản admin đầu tiên. Bỏ dấu -- ở dòng dưới, đổi tên đăng nhập & mật khẩu rồi chạy:
-- select public.create_first_admin('admin', 'DoiMatKhauNay123', 'Tên của bạn');
-- ---------------------------------------------------------------------
select 'Đã tạo cơ sở dữ liệu xong. Tiếp theo: chạy seed.sql, rồi tạo admin bằng create_first_admin(...)' as "Kết quả";
