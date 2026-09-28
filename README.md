# 체육대회 실시간 순위

학년별 반 대항 체육대회 점수를 실시간으로 입력하고, 학생들이 바로 확인할 수 있는 사이트입니다.

- 1학년 9개반 / 2학년 6개반 / 3학년 5개반
- 종목: 8자 줄넘기, 줄 파도타기, 줄다리기, 이어달리기 (Supabase Table Editor에서 추가/수정 가능)
- 점수: 1위 300점 · 2위 250점 · 3위 200점 · 4위 150점 · 5위 이하 100점

## 실행 전 꼭 해야 할 것: Supabase 연결

1. [supabase.com](https://supabase.com) 에서 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴 **SQL Editor** 로 들어가서, 이 프로젝트의 `supabase.sql` 파일 내용을 통째로 붙여넣고 **Run** 을 누릅니다.
   → 테이블 3개(teams, events, results), 반 20개, 종목 4개가 자동으로 생성됩니다.
3. 왼쪽 메뉴 **Settings > API** 에서 `Project URL` 과 `anon public` 키를 복사합니다.
4. 이 프로젝트 폴더에 `.env.example` 파일을 복사해서 `.env` 라는 이름으로 저장하고, 방금 복사한 값을 붙여넣습니다. 점수 입력 암호(`VITE_ADMIN_PASSWORD`)도 원하는 걸로 바꿀 수 있습니다.

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=여기에_anon_public_key
VITE_ADMIN_PASSWORD=원하는_암호
```

## 내 컴퓨터에서 실행해보기

```
npm install
npm run dev
```

## 종목 추가/수정하기

Supabase 대시보드 **Table Editor > events** 에서 행을 추가/수정/삭제하면 됩니다. `sort_order`가 작을수록 먼저 표시됩니다.

## Netlify에 배포하기

1. 이 폴더를 GitHub 저장소로 올립니다.
2. [netlify.com](https://netlify.com) 에서 **Add new project > Import an existing project** 로 그 저장소를 선택합니다.
3. Build command는 `npm run build`, Publish directory는 `dist` (netlify.toml에 이미 설정됨).
4. **Site configuration > Environment variables** 에 `.env`에 넣었던 값들(URL, KEY, ADMIN_PASSWORD)을 그대로 등록합니다.
5. Deploy 누르면 몇 분 뒤 실제 주소가 생깁니다.
