# 공책RPG 서버

Express + PostgreSQL 백엔드

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 → JWT 토큰 반환 |
| GET | /api/user/me | 내 데이터 불러오기 |
| POST | /api/user/save | 게임 저장 (gold, chars) |
| GET | /api/admin/users | 전체 유저 목록 (관리자) |
| POST | /api/admin/gold | 골드 지급 (관리자) |
| POST | /api/admin/heal | HP 회복 (관리자) |
| POST | /api/admin/reset | 캐릭터 초기화 (관리자) |
| DELETE | /api/admin/user/:username | 유저 삭제 (관리자) |
| POST | /api/admin/toggle-admin | 관리자 권한 토글 |
| POST | /api/admin/inv-give | 특정 유저에게 아이템 지급 |
| POST | /api/admin/inv-give-all | 전체 유저에게 아이템 지급 |
| GET | /api/admin/items | 커스텀 아이템 목록 |
| POST | /api/admin/items | 커스텀 아이템 등록 |
| DELETE | /api/admin/items/:id | 커스텀 아이템 삭제 |

---

## Railway 배포 방법

### 1. GitHub에 올리기
```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/YOUR_ID/공책rpg-server.git
git push -u origin main
```

### 2. Railway 프로젝트 생성
1. https://railway.app 접속 → 로그인
2. **New Project** → **Deploy from GitHub repo** → 레포 선택
3. 자동 배포 시작됨

### 3. PostgreSQL 추가
1. Railway 프로젝트 대시보드에서 **+ Add Service** → **Database** → **PostgreSQL**
2. PostgreSQL 서비스 클릭 → **Connect** 탭 → `DATABASE_URL` 복사

### 4. 환경변수 설정
Railway 프로젝트 → 서버 서비스 클릭 → **Variables** 탭:
```
DATABASE_URL = (Railway PostgreSQL에서 자동 연결 - 같은 프로젝트면 자동)
JWT_SECRET   = 랜덤 문자열 (예: openssl rand -hex 32 로 생성)
NODE_ENV     = production
```

> Railway에서 같은 프로젝트 안에 PostgreSQL을 추가하면
> `DATABASE_URL`이 자동으로 주입됩니다.

### 5. 배포 완료
- 서버 URL: `https://프로젝트명.up.railway.app`
- 이 URL을 게임 HTML의 `API_URL` 상수에 입력

---

## 로컬 개발

```bash
npm install
cp .env.example .env   # .env 편집해서 DB 연결
npm run dev
```

---

## 게임 HTML 연동

`공책RPG.html` 안에 아래 상수 변경:
```js
const API_URL = 'https://your-server.up.railway.app'
```

로그인 후 받은 JWT 토큰을 모든 API 요청 헤더에 포함:
```js
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + TOKEN
}
```
