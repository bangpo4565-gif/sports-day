-- 종목/인원 정보를 최신으로 바꾸려면 이 내용을 Supabase SQL Editor에 붙여넣고 Run 하세요.
-- (이미 있는 종목 4개의 이름과 인원 정보만 업데이트합니다. 나중에 또 바뀌면
--  이 파일을 다시 고쳐서 실행하면 돼요.)

-- 인원 정보를 담을 칸(participants)이 없으면 새로 추가
alter table events add column if not exists participants text;

-- 이어달리기 -> 계주 (남 3, 여 3)
update events set name = '계주', participants = '남 3명 · 여 3명'
where name = '이어달리기';

-- 8자 줄넘기 (8명)
update events set participants = '8명'
where name = '8자 줄넘기';

-- 줄 파도타기 -> 줄파도타기 (24명)
update events set name = '줄파도타기', participants = '24명'
where name = '줄 파도타기';

-- 줄다리기 (작은 반 학생 수에 맞춤)
update events set participants = '작은 반 학생 수에 맞춤'
where name = '줄다리기';
