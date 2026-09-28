-- "활동 사진" 탭을 쓰려면 이 내용을 Supabase SQL Editor에 추가로 붙여넣고 Run 하세요.
-- (supabase.sql은 이미 실행했으니, 이 파일만 새로 실행하면 됩니다)

-- 사진을 담을 저장 공간(bucket)을 만들고 공개(public)로 설정
insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', true)
on conflict (id) do update set public = true;

-- 누구나 사진을 볼 수 있도록 허용
create policy "누구나 활동 사진 조회 가능"
on storage.objects for select
using (bucket_id = 'activity-photos');

-- 누구나 사진을 올릴 수 있도록 허용 (화면 자체는 교사 암호로 잠겨 있음)
create policy "누구나 활동 사진 업로드 가능"
on storage.objects for insert
with check (bucket_id = 'activity-photos');
