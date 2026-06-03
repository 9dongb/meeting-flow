# MeetingFlow AI

AI 회의록 분석을 통해 요약, 결정사항, 액션 아이템, 후속 이메일 초안까지 정리하는 웹 서비스 입니다.

이 저장소는 FastAPI 백엔드와 Next.js 프론트엔드를 분리한 모노레포입니다. 현재는 이메일/비밀번호 및 Google 로그인, 팀 기반 회의 공유, LLM 기반 회의 분석, Google Calendar/Notion 연동을 포함합니다.

## 구조

```text
meetingflow-ai/
  backend/
    app/
      api/
      core/
      crud/
      db/
      models/
      schemas/
      services/
        ai/
        integrations/
        rag/
      tests/
    alembic/
    scripts/
    requirements.txt
    .env.example
  frontend/
    app/
    components/
    lib/
    types/
    package.json
    .env.example
```

## 빠른 실행

백엔드:

```bash
cd meetingflow-ai/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

기본 API 주소는 `http://localhost:8000`입니다.

프론트엔드:

```bash
cd meetingflow-ai/frontend
npm install
cp .env.example .env.local
npm run dev
```

기본 화면은 `http://localhost:3000`에서 확인할 수 있습니다.

데모 데이터를 넣고 싶다면 백엔드 가상환경이 활성화된 상태에서 다음 명령을 실행합니다.

```bash
cd meetingflow-ai/backend
python scripts/seed_demo.py
```

데모 계정은 `demo@meetingflow.ai` / `password123`입니다.

## Docker 배포

Docker Compose는 백엔드 FastAPI, 프론트엔드 Next.js, SQLite 데이터 볼륨을 함께 실행합니다.

```bash
cd meetingflow-ai
cp .env.docker.example .env.docker
# .env.docker의 JWT_SECRET_KEY, origin, OAuth/API key 값을 배포 환경에 맞게 수정
chmod 600 .env.docker
docker compose --env-file .env.docker up --build -d
```

기본 포트는 프론트엔드 `http://localhost:3000`, 백엔드 `http://localhost:8000`입니다.
데모 데이터를 넣으려면 컨테이너가 실행 중인 상태에서 다음 명령을 사용합니다.

```bash
docker compose --env-file .env.docker exec backend python scripts/seed_demo.py
```

운영 배포에서는 다음 값을 반드시 확인하세요.

- `JWT_SECRET_KEY`: `openssl rand -hex 32` 같은 강한 랜덤 값 사용
- `NEXT_PUBLIC_API_BASE_URL`: 브라우저에서 접근 가능한 백엔드 URL. 이 값은 프론트엔드 빌드 시점에 반영되므로 변경 후에는 `docker compose build frontend`가 필요합니다.
- `BACKEND_CORS_ORIGINS`, `FRONTEND_BASE_URL`: 실제 프론트엔드 origin과 일치
- `AUTH_COOKIE_SECURE=true`: HTTPS 뒤에서 운영할 때 권장
- `GOOGLE_*_REDIRECT_URI`, `NOTION_REDIRECT_URI`: 외부 OAuth 콘솔에 등록한 callback URL과 일치

Compose 파일은 기본적으로 호스트의 `127.0.0.1`에만 포트를 바인딩합니다. VPS나 서버에서 직접 공개하려면 Nginx/Caddy/Traefik 같은 reverse proxy로 HTTPS를 종료하고, 필요할 때만 `FRONTEND_BIND` 또는 `BACKEND_BIND`를 조정하세요.

OCI E2.1.Micro 같은 1GB RAM 인스턴스를 고려해 기본 런타임 메모리 제한은 백엔드 `512m`, 프론트엔드 `384m`로 설정되어 있습니다. 더 큰 인스턴스에서는 `.env.docker`의 `BACKEND_MEM_LIMIT`, `FRONTEND_MEM_LIMIT` 값을 올릴 수 있습니다.

SQLite 파일은 `backend_data` Docker volume에 저장됩니다. 단일 인스턴스 배포에는 간단하고 안정적이지만, 다중 replica나 무중단 schema migration이 필요한 운영 단계에서는 PostgreSQL 전환과 Alembic migration 정리가 필요합니다.

## GitHub Actions 자동 배포

`.github/workflows/deploy-oci.yml`은 `main` 브랜치 push 또는 수동 실행 시 OCI 서버에 SSH로 접속해 최신 코드를 가져오고 Docker Compose로 재배포합니다.

GitHub repository secrets:

- `SSH_HOST`: OCI 서버 IP 또는 도메인
- `SSH_USER`: SSH 사용자. 예: `ubuntu`
- `SSH_KEY`: private key
- `SSH_PORT`: SSH 포트. 비워두면 workflow 기본값 `3223`
- `DEPLOY_PATH`: 서버의 저장소 경로. 비워두면 `/home/ubuntu/meeting-flow`

서버 최초 1회 준비:

```bash
ssh -p 3223 ubuntu@<서버IP>
mkdir -p /home/ubuntu/meeting-flow
cd /home/ubuntu/meeting-flow
git clone https://github.com/<owner>/<repo>.git .
cd meetingflow-ai
cp .env.docker.example .env.docker
chmod 600 .env.docker
# .env.docker에 실제 production origin, JWT_SECRET_KEY, OPENAI_API_KEY 등을 입력
docker compose --env-file .env.docker up -d --build
```

Actions workflow에는 API key를 넣지 않습니다. 실제 `OPENAI_API_KEY`, OAuth secret, `JWT_SECRET_KEY`는 서버의 `.env.docker`에만 둡니다.

## 품질 점검

백엔드:

```bash
cd meetingflow-ai/backend
pytest
```

프론트엔드:

```bash
cd meetingflow-ai/frontend
npm run lint
npm run build
```

## 주요 기능

- 이메일/비밀번호 회원가입, 로그인, 로그아웃
- Google OAuth 로그인
- httpOnly cookie 기반 JWT 인증
- 사용자별 기본 팀 생성, 팀 초대 코드 참여, 팀 단위 회의/액션 아이템 공유
- 회의록 직접 작성 또는 `.txt`, `.docx` 파일 업로드
- LLM 기반 회의 분석
- 분석 결과 DB 저장, 수정, 삭제
- 참석자, 요약, 주제, 결정사항, 액션 아이템, 미해결 이슈 추출
- 팀 멤버 이름 기반 참석자 이메일 보강
- 액션 아이템 칸반 보드, 마감 임박 필터, 상태 변경, 삭제
- 후속 이메일 초안 생성 및 `mailto:` 열기
- Markdown export
- Notion OAuth 연결 및 MeetingFlow 페이지 하위 회의록 초안 생성
- Google Calendar OAuth 연결, 액션 아이템 일정 동기화, 수동 동기화
- Notion, Google Calendar, Gmail 승인 기반 Mock 로그
- RAG/Pinecone 확장을 위한 interface와 hook

## 주요 화면

- `/login`: 이메일 로그인/회원가입, Google 로그인
- `/dashboard`: 팀 정보, 최근 회의, 전체 액션 아이템 칸반, 통합 상태
- `/meetings`: 회의 목록
- `/meetings/new`: 직접 작성 또는 파일 업로드로 회의 분석 시작
- `/meetings/{id}/analysis`: 분석 결과 조회/수정, 원문 보기, 삭제, 이메일/Notion 초안 생성
- `/meetings/{id}/actions`: 회의별 액션 아이템 검토 테이블

## 환경변수

백엔드 `meetingflow-ai/backend/.env`:

```bash
APP_NAME="MeetingFlow AI"
ENVIRONMENT=local
DATABASE_URL=sqlite:///./meetingflow.db
JWT_SECRET_KEY=change-this-secret-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
AUTH_COOKIE_NAME=meetingflow_access_token
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax
BACKEND_CORS_ORIGINS=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:3000
TOKEN_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_LOGIN_REDIRECT_URI=http://localhost:8000/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/integrations/google-calendar/callback
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=http://localhost:8000/integrations/notion/callback
NOTION_AUTHORIZATION_URL=https://api.notion.com/v1/oauth/authorize
NOTION_API_VERSION=2026-03-11
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT_SECONDS=60
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_SECONDS=45
AI_PROVIDER=openai
AI_MOCK_FALLBACK=true
AI_MAX_TRANSCRIPT_CHARS=20000
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
PINECONE_NAMESPACE=meetingflow-local
RAG_ENABLED=false
```

프론트엔드 `meetingflow-ai/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

주요 환경변수 설명:

- `DATABASE_URL`: SQLite 또는 운영 DB 연결 문자열
- `JWT_SECRET_KEY`: JWT 서명 비밀값. 운영 환경에서는 강한 랜덤 값 사용
- `TOKEN_ENCRYPTION_KEY`: 외부 서비스 access/refresh token 암호화 키. 비워두면 `JWT_SECRET_KEY`에서 파생
- `AUTH_COOKIE_SECURE`: HTTPS 운영 환경에서는 `true` 권장
- `AUTH_COOKIE_SAMESITE`: 로컬 기본값은 `lax`. 다른 도메인 간 배포 시 cookie 정책에 맞게 조정
- `BACKEND_CORS_ORIGINS`: 프론트엔드 origin 목록
- `FRONTEND_BASE_URL`: OAuth callback 이후 리다이렉트할 프론트엔드 주소
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google 로그인 및 Calendar OAuth 설정
- `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`: Notion OAuth 설정
- `OPENAI_API_KEY`, `OPENAI_MODEL`: OpenAI 분석/후속 이메일 생성 설정
- `GROQ_API_KEY`, `GROQ_MODEL`: Groq 분석/후속 이메일 생성 설정
- `AI_PROVIDER`: `openai`, `groq`, `mock` 중 선택. 기본값은 `openai`
- `AI_MOCK_FALLBACK`: 로컬 개발에서 provider API key가 없을 때 Mock 분석으로 fallback할지 여부
- `AI_MAX_TRANSCRIPT_CHARS`: AI provider에 전달할 transcript 최대 길이
- `PINECONE_*`, `RAG_ENABLED`: 향후 RAG/Pinecone 연동 설정

## AI 분석 설정

`POST /meetings/{meeting_id}/analyze`는 `AI_PROVIDER`에 따라 분석기를 선택합니다.

- `AI_PROVIDER=openai`: OpenAI Chat Completions API 사용
- `AI_PROVIDER=groq`: Groq OpenAI-compatible Chat Completions API 사용
- `AI_PROVIDER=mock`: 외부 호출 없이 `MockMeetingAnalyzer` 사용

로컬 개발 환경(`ENVIRONMENT=local`, `development`, `dev`)에서 provider API key가 없고 `AI_MOCK_FALLBACK=true`이면 Mock 분석 결과로 fallback합니다. provider 응답 오류나 JSON 파싱 실패까지 무조건 fallback하지는 않습니다. 운영 환경에서는 `AI_MOCK_FALLBACK=false`를 권장합니다.

분석 응답은 Pydantic 스키마로 검증한 뒤 `Meeting`, `Participant`, `Decision`, `ActionItem`, `UnresolvedIssue`에 저장됩니다. 후속 이메일 초안은 별도 API에서 생성해 `FollowUpEmailDraft`로 저장합니다.

긴 transcript는 MVP 보호 장치로 `AI_MAX_TRANSCRIPT_CHARS`만큼 잘라 provider에 전달합니다. 긴 회의록을 완성도 있게 처리하려면 chunk 분석과 merge 로직이 추가로 필요합니다.

## 인증과 권한

MeetingFlow AI는 이메일/비밀번호 인증과 Google OAuth 로그인을 지원합니다.

1. 이메일 회원가입은 `POST /auth/register`, 로그인은 `POST /auth/login`을 사용합니다.
2. Google 로그인은 `GET /auth/google/login`에서 시작해 `/auth/google/callback`으로 돌아옵니다.
3. 서버는 비밀번호를 bcrypt 해시로 저장하고 평문 비밀번호는 저장하지 않습니다.
4. 로그인 성공 시 JWT access token을 `AUTH_COOKIE_NAME` 이름의 httpOnly cookie로 내려줍니다.
5. 프론트엔드 API client는 `credentials: "include"`로 cookie를 전송합니다.
6. 보호 API는 cookie의 JWT를 검증한 뒤 현재 사용자를 주입합니다.
7. 신규 사용자는 기본 팀을 가지며, 팀 초대 코드로 다른 팀에 참여할 수 있습니다.
8. 회의와 액션 아이템은 현재 활성 팀 범위에서만 조회/수정됩니다.
9. 접근 권한이 없는 `meeting_id` 또는 `action_item_id`는 존재하지 않는 것처럼 `404`를 반환합니다.

프론트엔드는 localStorage에 access token을 저장하지 않습니다. MVP 로컬 개발에서는 `AUTH_COOKIE_SECURE=false`를 사용하지만, HTTPS 운영 환경에서는 반드시 `AUTH_COOKIE_SECURE=true`로 설정하세요.

## 주요 API

인증:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PATCH /auth/me`
- `POST /auth/logout`
- `GET /auth/google/login`
- `GET /auth/google/callback`

팀:

- `GET /teams/current`
- `PATCH /teams/current`
- `POST /teams/join`

회의:

- `GET /meetings`
- `POST /meetings`
- `GET /meetings/{meeting_id}`
- `PATCH /meetings/{meeting_id}`
- `DELETE /meetings/{meeting_id}`
- `POST /meetings/{meeting_id}/analyze`
- `PATCH /meetings/{meeting_id}/analysis`
- `POST /meetings/{meeting_id}/follow-up-email-draft`

액션 아이템:

- `GET /action-items`
- `GET /meetings/{meeting_id}/action-items`
- `PATCH /action-items/{action_item_id}`
- `DELETE /action-items/{action_item_id}`

내보내기와 연동:

- `POST /meetings/{meeting_id}/export/markdown`
- `POST /meetings/{meeting_id}/integrations/notion/mock`
- `POST /meetings/{meeting_id}/integrations/google-calendar/mock`
- `POST /meetings/{meeting_id}/integrations/gmail/mock`
- `GET /integrations/notion/status`
- `GET /integrations/notion/connect`
- `GET /integrations/notion/callback`
- `POST /meetings/{meeting_id}/notion-draft`
- `GET /integrations/google-calendar/status`
- `GET /integrations/google-calendar/connect`
- `GET /integrations/google-calendar/callback`
- `PATCH /integrations/google-calendar/settings`
- `POST /integrations/google-calendar/sync`

상태 확인:

- `GET /health`

`/health`, `/auth/register`, `/auth/login`, `/auth/google/login`, `/auth/google/callback`을 제외한 주요 API는 인증이 필요합니다.

## 외부 연동 상태

실제 구현된 연동:

- Google 로그인 OAuth
- Google Calendar OAuth 연결, 설정 변경, 액션 아이템 all-day 이벤트 생성/수정/삭제
- Notion OAuth 연결, MeetingFlow 상위 페이지 생성/재사용, 회의록 초안 페이지 생성
- 후속 이메일 초안 생성 후 프론트엔드에서 `mailto:` 실행

Mock 또는 제한된 기능:

- Gmail 실제 API 발송은 구현되어 있지 않으며 Mock 로그와 `mailto:` 기반 초안 흐름을 사용합니다.
- Notion/Google Calendar Mock API는 실제 저장 전 승인 플로우를 검증하기 위한 로그를 남깁니다.
- Calendar 동기화는 마감일이 있는 액션 아이템을 all-day 이벤트로 생성합니다.
- 마감일이 없는 액션 아이템은 `skipped_no_due_date` 상태로 기록됩니다.

## RAG 확장 계획

현재 RAG는 실제 Pinecone 호출 없이 interface와 placeholder가 준비되어 있습니다. `RAG_ENABLED=false`가 기본값이며, 이 상태에서는 검색 결과가 빈 배열로 반환되고 인덱싱은 no-op으로 처리됩니다. 따라서 Pinecone 미연동 상태에서도 로그인, 회의 생성, AI 분석, 액션 아이템 검토 플로우는 정상 동작합니다.

준비된 service 함수:

- `index_meeting_transcript`
- `index_meeting_summary`
- `index_decisions`
- `index_action_items`
- `search_related_meetings`
- `search_previous_decisions`
- `search_unresolved_action_items`

AI 분석 파이프라인은 분석 직전에 `RagService.build_analysis_context(meeting)`을 호출하고, 이 context를 분석 프롬프트에 주입할 수 있게 연결되어 있습니다. 현재는 빈 context가 들어가지만, Pinecone adapter를 구현하면 이전 회의록과 결정사항을 분석 프롬프트에 포함할 수 있습니다.

향후 RAG 사용 시나리오:

- 이전 회의록 기반 맥락 보완
- 과거 결정사항과 이번 결정사항의 충돌 감지
- 미완료 액션 아이템 추적
- 프로젝트 문서 기반 용어/약어 해석
- 다음 회의 아젠다 자동 생성

## 현재 구현 범위

실제 구현된 기능:

- 이메일 회원가입/로그인 및 Google 로그인
- bcrypt 비밀번호 해시 저장
- httpOnly cookie 기반 JWT 인증
- 팀 생성, 팀 초대 코드 참여, 팀 범위 접근 제어
- 회의 생성/조회/수정/삭제
- OpenAI/Groq/Mock 분석기 선택
- 분석 결과 저장 및 편집
- 후속 이메일 초안 생성
- 액션 아이템 조회/수정/삭제와 칸반 보드
- txt/docx 파일에서 회의록 텍스트 추출
- Markdown export
- Notion OAuth 연결과 회의록 초안 생성 흐름
- Google Calendar OAuth 연결과 액션 아이템 동기화 흐름
- 로컬 SQLite lightweight migration
- 핵심 API 테스트

아직 제한적인 기능:

- 음성 파일 업로드와 STT 처리
- Gmail 실제 API 발송
- RAG/Pinecone 실제 벡터 인덱싱 및 검색
- Alembic migration 파일 기반 운영 마이그레이션
- 브라우저 E2E 테스트

## 알려진 제한사항

- 로컬 MVP는 FastAPI startup에서 `create_all`과 SQLite용 lightweight migration을 실행합니다. 운영 전 Alembic migration을 작성해야 합니다.
- provider API key가 없을 때만 로컬 Mock fallback이 동작합니다. provider 장애나 응답 스키마 오류는 `503`으로 처리될 수 있습니다.
- transcript 처리는 `AI_MAX_TRANSCRIPT_CHARS` 기준 단순 길이 제한입니다.
- Calendar 동기화는 액션 아이템의 `due_date`를 기준으로 all-day 이벤트를 만듭니다.
- Notion 초안 생성은 OAuth와 page 생성 흐름 중심이며, 더 정교한 block 변환은 추가 구현이 필요합니다.
- 프론트엔드 보호 라우트는 클라이언트에서 `/auth/me` 확인 후 redirect합니다. 민감 데이터 보호는 백엔드 권한 검증이 최종 방어선입니다.

## 다음 구현 후보

1. 음성 업로드 저장소와 STT provider abstraction 추가
2. 긴 회의록용 chunk 분석 및 결과 merge 로직 추가
3. Alembic 초기 migration 생성
4. Pinecone 기반 embedding, indexing, search adapter 구현
5. Gmail 실제 API connector 및 사용자 승인 UI 추가
6. Notion block 변환 고도화
7. 액션 아이템 필터, 담당자별 뷰, 마감 알림 강화
8. 백엔드 통합 테스트와 프론트엔드 E2E 테스트 보강
