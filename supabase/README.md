# Supabase Setup

## 1. 프로젝트 생성 후 SQL 실행

Supabase Dashboard에서 `SQL Editor`를 열고 `supabase/schema.sql` 내용을 실행한다.

## 2. 첫 동아리/관리자 만들기

먼저 Auth에서 관리자 계정을 만든 뒤, SQL Editor에서 아래 값을 실제 계정/동아리명에 맞춰 실행한다.

```sql
insert into public.clubs (name, school)
values ('AI 수업 연구 동아리', '학교명')
returning id;
```

위에서 나온 `club_id`와 Auth Users의 관리자 `user_id`를 사용한다.

```sql
insert into public.profiles (id, club_id, name, role)
values ('관리자-user-id', 'club-id', '김유하', 'admin');

insert into public.project_settings (club_id, club_name, school, manager_name)
values ('club-id', 'AI 수업 연구 동아리', '학교명', '김유하');
```

회원 계정도 Auth에서 만든 뒤 `profiles`에 `role = 'member'`로 추가한다.

## 3. 앱 환경변수

프론트에는 아래 두 값만 사용한다.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

절대 프론트에 넣으면 안 되는 값:

- service_role key
- database password

Vercel Functions로 회원 계정 생성/삭제를 쓰려면 Vercel 프로젝트 환경변수에 아래 서버 전용 값도 추가한다.

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`는 GitHub, 프론트 코드, `app/.env`에 넣지 않는다.

## 4. Storage

`schema.sql`은 private bucket `receipts`를 생성하고 RLS 정책을 설정한다.

파일 경로 규칙:

```text
{club_id}/{user_id}/{expense_id}/{file_type}-{filename}
```

## 5. 회원 관리 기능 추가 적용

기존 DB에 회원 관리 C안 기능을 적용할 때는 `supabase/member_management_migration.sql`을 Supabase SQL Editor에서 한 번 실행한다.

이 SQL은 다음을 처리한다.

- `profiles.email`, `profiles.active`, `profiles.disabled_at` 추가
- 기존 Auth 이메일을 `profiles.email`에 채움
- 기존 AI 구독료 한도를 `user_id`와 연결
- 비활성 회원이 동아리 데이터에 접근하지 못하도록 helper function 갱신
