-- Supabase 프로젝트의 SQL Editor에 이 내용을 통째로 붙여넣고 "Run" 누르면
-- 테이블 생성 + 반(팀) 20개 + 종목 4개 자동 생성 + 실시간 기능까지 한 번에 끝납니다.

-- 1) 반(팀) 테이블
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  grade integer not null,       -- 1, 2, 3학년
  class_no integer not null,    -- 반 번호
  name text not null            -- 예: "1학년 3반"
);

-- 2) 종목 테이블
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0
);

-- 3) 결과(순위) 테이블
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  rank integer not null,        -- 1,2,3,4,5 (5는 "5위 이하"를 의미)
  points integer not null,      -- rank에 따라 자동 계산된 점수
  created_at timestamptz default now(),
  unique (event_id, team_id)    -- 같은 반은 같은 종목에 결과 1개만
);

-- 4) 실시간 기능 켜기 (점수 입력하면 학생 화면에 바로 반영되도록)
alter publication supabase_realtime add table results;

-- 5) 보안 설정: 누구나 조회 가능, 점수 입력/수정도 누구나 가능하게 열어둡니다.
--    (교사만 입력하도록 화면에 암호를 걸어두었지만, DB 자체는 잠그지 않은 간단한 구조입니다)
alter table teams enable row level security;
alter table events enable row level security;
alter table results enable row level security;

create policy "누구나 반 조회 가능" on teams for select using (true);
create policy "누구나 종목 조회 가능" on events for select using (true);
create policy "누구나 결과 조회 가능" on results for select using (true);
create policy "누구나 결과 입력 가능" on results for insert with check (true);
create policy "누구나 결과 수정 가능" on results for update using (true);
create policy "누구나 결과 삭제 가능" on results for delete using (true);

-- 6) 반(팀) 20개 자동 생성: 1학년 9개반, 2학년 6개반, 3학년 5개반
insert into teams (grade, class_no, name)
select 1, n, '1학년 ' || n || '반' from generate_series(1, 9) as n
union all
select 2, n, '2학년 ' || n || '반' from generate_series(1, 6) as n
union all
select 3, n, '3학년 ' || n || '반' from generate_series(1, 5) as n;

-- 7) 종목 4개 기본 생성 (나중에 Table Editor에서 추가/수정/삭제 가능)
insert into events (name, sort_order) values
  ('8자 줄넘기', 1),
  ('줄 파도타기', 2),
  ('줄다리기', 3),
  ('이어달리기', 4);
