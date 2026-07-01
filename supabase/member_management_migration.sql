-- 회원 관리 C안 보강 SQL
-- Supabase SQL Editor에서 한 번 실행한다.

alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists active boolean not null default true,
  add column if not exists disabled_at timestamptz;

create index if not exists profiles_email_idx on public.profiles(email);

update public.profiles p
set email = u.email,
    updated_at = now()
from auth.users u
where p.id = u.id
  and coalesce(p.email, '') = '';

update public.ai_member_budgets b
set user_id = p.id,
    updated_at = now()
from public.profiles p
where b.club_id = p.club_id
  and b.user_id is null
  and regexp_replace(b.member_name, '\s+', '', 'g') = regexp_replace(p.name, '\s+', '', 'g');

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
