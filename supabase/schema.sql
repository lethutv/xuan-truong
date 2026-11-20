-- =====================================================================
--  Tạo đề Toán – cơ sở dữ liệu & phân quyền cho Supabase
--  Chạy MỘT LẦN trong Supabase Dashboard → SQL Editor (dán toàn bộ rồi Run).
--  Chạy lại nhiều lần vẫn an toàn (dùng IF NOT EXISTS / OR REPLACE).
--
--  Vai trò: admin · teacher (giáo viên bộ môn) · student (học sinh) · parent (phụ huynh)
--  Nguyên tắc:
--   * Kho đề kiểm tra (pool = 'exam') CHỈ giáo viên/admin đọc được.
--   * Học sinh, phụ huynh chỉ thấy kho luyện tập, bài tập của lớp mình và điểm của mình/con mình.
--   * Tài khoản được kích hoạt bằng mã (bảng invites) – không cần email thật.
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
insert into public.subjects(code, name) values ('toan', 'Toán') on conflict do nothing;

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

create table if not exists public.invites (            -- mã kích hoạt tài khoản
  code text primary key,
  role text not null check (role in ('admin', 'teacher', 'student', 'parent')),
  full_name text not null default '',
  subjects text[] not null default '{}',
  student_id uuid references public.students(id) on delete cascade,   -- với HS: chính HS đó; với PH: con
  created_by uuid references public.profiles(id) on delete set null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

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
  foreach t in array array['subjects','cohorts','classes','profiles','students','parent_links','teacher_classes','invites','questions','exams','results','assignments','submissions']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

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

-- invites: GV tạo mã cho HS/PH; chỉ admin tạo mã GV/admin
create policy invites_read on public.invites for select to authenticated using (public.is_staff());
create policy invites_insert on public.invites for insert to authenticated
  with check (public.is_admin() or (public.is_staff() and role in ('student', 'parent')));
create policy invites_delete on public.invites for delete to authenticated using (public.is_admin() or (public.is_staff() and role in ('student', 'parent')));

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
-- Kích hoạt tài khoản bằng mã
-- ---------------------------------------------------------------------
-- Kiểm tra mã trước khi đăng ký (gọi được khi chưa đăng nhập)
create or replace function public.check_invite(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.invites; s public.students;
begin
  select * into i from public.invites where code = upper(trim(p_code));
  if not found or i.used_at is not null or (i.expires_at is not null and i.expires_at < now()) then
    return jsonb_build_object('ok', false);
  end if;
  if i.student_id is not null then select * into s from public.students where id = i.student_id; end if;
  return jsonb_build_object('ok', true, 'role', i.role, 'full_name', i.full_name,
    'student_name', s.full_name);
end $$;
grant execute on function public.check_invite(text) to anon, authenticated;

-- Khi tài khoản mới được tạo (signUp với data.invite & data.username) → tạo hồ sơ theo mã
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare i public.invites; uname text; fname text;
begin
  select * into i from public.invites
    where code = upper(trim(coalesce(new.raw_user_meta_data->>'invite', '')))
    for update;
  if not found or i.used_at is not null or (i.expires_at is not null and i.expires_at < now()) then
    raise exception 'Mã kích hoạt không hợp lệ hoặc đã dùng';
  end if;
  uname := lower(trim(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))));
  fname := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), i.full_name, '');
  if i.role = 'student' and i.student_id is not null then
    select full_name into fname from public.students where id = i.student_id;
  end if;
  insert into public.profiles(id, role, username, full_name, subjects)
    values (new.id, i.role, uname, fname, i.subjects);
  if i.role = 'student' and i.student_id is not null then
    update public.students set user_id = new.id where id = i.student_id;
  elsif i.role = 'parent' and i.student_id is not null then
    insert into public.parent_links(parent_id, student_id) values (new.id, i.student_id) on conflict do nothing;
  end if;
  update public.invites set used_by = new.id, used_at = now() where code = i.code;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tên đăng nhập còn trống không (gọi được khi chưa đăng nhập)
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as
$$ select not exists (select 1 from public.profiles where username = lower(trim(p_username))) $$;
grant execute on function public.username_available(text) to anon, authenticated;

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

-- Phụ huynh đã có tài khoản nhập thêm mã của con thứ hai
create or replace function public.redeem_parent_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i public.invites;
begin
  if public.my_role() <> 'parent' then raise exception 'Chỉ tài khoản phụ huynh dùng được chức năng này'; end if;
  select * into i from public.invites where code = upper(trim(p_code)) for update;
  if not found or i.role <> 'parent' or i.used_at is not null or (i.expires_at is not null and i.expires_at < now()) then
    raise exception 'Mã không hợp lệ hoặc đã dùng';
  end if;
  insert into public.parent_links(parent_id, student_id) values (auth.uid(), i.student_id) on conflict do nothing;
  update public.invites set used_by = auth.uid(), used_at = now() where code = i.code;
  return jsonb_build_object('ok', true);
end $$;

-- Đăng nhập bằng TÊN ĐĂNG NHẬP: app tự đổi thành email nội bộ <tên>@<LOGIN_DOMAIN trong config.js>,
-- nên không cần email thật và không cần hàm tra cứu email (tránh lộ thông tin).
drop function if exists public.login_email(text);

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
  delete from public.invites where expires_at < now() - interval '30 days' and used_at is null;
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
-- Mã kích hoạt cho tài khoản ADMIN đầu tiên (chỉ tạo khi chưa có admin)
-- ---------------------------------------------------------------------
do $$
declare c text;
begin
  if not exists (select 1 from public.profiles where role = 'admin')
     and not exists (select 1 from public.invites where role = 'admin' and used_at is null) then
    c := 'ADMIN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.invites(code, role, full_name) values (c, 'admin', 'Quản trị viên');
  end if;
end $$;
select code as "MÃ KÍCH HOẠT ADMIN – dùng để tạo tài khoản admin đầu tiên"
  from public.invites where role = 'admin' and used_at is null;
