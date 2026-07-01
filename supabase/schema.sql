-- 2026 AI 디지털 교사 동아리 정산 도우미
-- Supabase SQL editor에서 실행한다.
-- service_role key는 프론트엔드에 넣지 않는다.

create extension if not exists pgcrypto;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  email text not null default '',
  name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  active boolean not null default true,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists active boolean not null default true,
  add column if not exists disabled_at timestamptz;

create table if not exists public.project_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  club_name text not null default '',
  school text not null default '',
  principal_name text not null default '',
  school_address text not null default '',
  school_phone text not null default '',
  manager_name text not null default '',
  manager_phone text not null default '',
  manager_email text not null default '',
  total_budget integer not null default 2000000 check (total_budget >= 0),
  research_budget integer not null default 1000000 check (research_budget >= 0),
  training_budget integer not null default 0 check (training_budget >= 0),
  direct_budget integer not null default 800000 check (direct_budget >= 0),
  meeting_budget integer not null default 200000 check (meeting_budget >= 0),
  ai_subscription_budget integer not null default 800000 check (ai_subscription_budget >= 0),
  interest integer not null default 0 check (interest >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_member_budgets (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  member_name text not null,
  limit_amount integer not null default 0 check (limit_amount >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, member_name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  submitter text not null default '',
  school text not null default '',
  club_name text not null default '',
  category text not null check (category in ('research', 'training', 'direct', 'meeting')),
  direct_type text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'approved', 'rejected')),
  expense_date date,
  description text not null default '',
  amount integer not null check (amount >= 0),
  item_name text not null default '',
  vendor text not null default '',
  unit text not null default '',
  quantity numeric not null default 0,
  unit_price integer not null default 0 check (unit_price >= 0),
  payment_method text not null default 'card' check (payment_method in ('card', 'transfer', 'other')),
  evidence_no text not null default '',
  notes text not null default '',
  paid boolean not null default false,
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_files (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default '',
  file_size integer not null default 0 check (file_size >= 0),
  created_at timestamptz not null default now()
);

create index if not exists profiles_club_id_idx on public.profiles(club_id);
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists expenses_club_id_idx on public.expenses(club_id);
create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expense_files_expense_id_idx on public.expense_files(expense_id);
create index if not exists ai_member_budgets_club_id_idx on public.ai_member_budgets(club_id);

create unique index if not exists ai_member_budgets_club_user_idx
on public.ai_member_budgets(club_id, user_id)
where user_id is not null;

create or replace function public.is_admin_for_club(target_club_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.club_id = target_club_id
      and p.role = 'admin'
      and p.active = true
  );
$$;

create or replace function public.same_club(target_club_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.club_id = target_club_id
      and p.active = true
  );
$$;

alter table public.clubs enable row level security;
alter table public.profiles enable row level security;
alter table public.project_settings enable row level security;
alter table public.ai_member_budgets enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_files enable row level security;

drop policy if exists "club members can read own club" on public.clubs;
create policy "club members can read own club"
on public.clubs for select
to authenticated
using (public.same_club(id));

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin_for_club(club_id));

drop policy if exists "admins can manage profiles in club" on public.profiles;
create policy "admins can manage profiles in club"
on public.profiles for all
to authenticated
using (public.is_admin_for_club(club_id))
with check (public.is_admin_for_club(club_id));

drop policy if exists "club members can read project settings" on public.project_settings;
create policy "club members can read project settings"
on public.project_settings for select
to authenticated
using (public.same_club(club_id));

drop policy if exists "admins can manage project settings" on public.project_settings;
create policy "admins can manage project settings"
on public.project_settings for all
to authenticated
using (public.is_admin_for_club(club_id))
with check (public.is_admin_for_club(club_id));

drop policy if exists "members can read own ai budget" on public.ai_member_budgets;
create policy "members can read own ai budget"
on public.ai_member_budgets for select
to authenticated
using (
  public.is_admin_for_club(club_id)
  or user_id = auth.uid()
  or (
    user_id is null
    and member_name = (select p.name from public.profiles p where p.id = auth.uid())
    and public.same_club(club_id)
  )
);

drop policy if exists "admins can manage ai budgets" on public.ai_member_budgets;
create policy "admins can manage ai budgets"
on public.ai_member_budgets for all
to authenticated
using (public.is_admin_for_club(club_id))
with check (public.is_admin_for_club(club_id));

drop policy if exists "members can read own expenses and admins can read club" on public.expenses;
create policy "members can read own expenses and admins can read club"
on public.expenses for select
to authenticated
using (user_id = auth.uid() or public.is_admin_for_club(club_id));

drop policy if exists "members can insert own expenses" on public.expenses;
create policy "members can insert own expenses"
on public.expenses for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.same_club(club_id)
  and paid = false
);

drop policy if exists "admins can update club expenses" on public.expenses;
create policy "admins can update club expenses"
on public.expenses for update
to authenticated
using (public.is_admin_for_club(club_id))
with check (public.is_admin_for_club(club_id));

drop policy if exists "admins can delete club expenses" on public.expenses;
create policy "admins can delete club expenses"
on public.expenses for delete
to authenticated
using (public.is_admin_for_club(club_id));

drop policy if exists "members can read own files and admins can read club" on public.expense_files;
create policy "members can read own files and admins can read club"
on public.expense_files for select
to authenticated
using (user_id = auth.uid() or public.is_admin_for_club(club_id));

drop policy if exists "members can insert own file records" on public.expense_files;
create policy "members can insert own file records"
on public.expense_files for insert
to authenticated
with check (user_id = auth.uid() and public.same_club(club_id));

drop policy if exists "admins can manage file records" on public.expense_files;
create policy "admins can manage file records"
on public.expense_files for all
to authenticated
using (public.is_admin_for_club(club_id))
with check (public.is_admin_for_club(club_id));

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "members can upload own receipt files" on storage.objects;
create policy "members can upload own receipt files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and split_part(name, '/', 2) = auth.uid()::text
);

drop policy if exists "members can read own receipt files and admins can read club files" on storage.objects;
create policy "members can read own receipt files and admins can read club files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and (
    split_part(name, '/', 2) = auth.uid()::text
    or public.is_admin_for_club(split_part(name, '/', 1)::uuid)
  )
);

drop policy if exists "admins can delete receipt files" on storage.objects;
create policy "admins can delete receipt files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'receipts'
  and public.is_admin_for_club(split_part(name, '/', 1)::uuid)
);

-- Data API 권한. RLS 정책이 실제 접근 범위를 제한한다.
grant usage on schema public to authenticated;
grant select on
  public.clubs,
  public.profiles,
  public.project_settings,
  public.ai_member_budgets,
  public.expenses,
  public.expense_files
to authenticated;

grant insert, update, delete on
  public.profiles,
  public.project_settings,
  public.ai_member_budgets,
  public.expenses,
  public.expense_files
to authenticated;

grant execute on function public.is_admin_for_club(uuid) to authenticated;
grant execute on function public.same_club(uuid) to authenticated;
