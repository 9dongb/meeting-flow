# MeetingFlow AI

AI 회의록 정리 및 액션 아이템 추출 웹 서비스 MVP 기반입니다.

이 저장소는 백엔드와 프론트엔드를 분리한 모노레포 형태로 구성되어 있으며, Groq 기반 회의 분석과 승인 기반 Mock 연동 플로우를 제공합니다.

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
        rag/
        integrations/
      tests/
    alembic/
    requirements.txt
    .env.example
  frontend/
    app/
    components/
    lib/
    types/
    hooks/
    package.json
    .env.example
```

## 백엔드 실행

```bash
cd meetingflow-ai/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

기본 API 주소는 `http://localhost:8000`입니다.

백엔드 품질 점검:

```bash
cd meetingflow-ai/backend
pytest
```

주요 엔드포인트:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /meetings`
- `POST /meetings`
- `GET /meetings/{meeting_id}`
- `POST /meetings/{meeting_id}/analyze`
- `GET /meetings/{meeting_id}/action-items`
- `PATCH /action-items/{action_item_id}`
- `POST /meetings/{meeting_id}/export/markdown`
- `POST /meetings/{meeting_id}/integrations/notion/mock`
- `POST /meetings/{meeting_id}/integrations/google-calendar/mock`
- `POST /meetings/{meeting_id}/integrations/gmail/mock`

`/health`, `/auth/register`, `/auth/login`을 제외한 주요 API는 인증이 필요합니다. 인증은 httpOnly cookie 기반 JWT로 처리되며, 다른 사용자의 `meeting_id` 또는 `action_item_id`로 접근하면 `404`를 반환합니다.

## 프론트엔드 실행

```bash
cd meetingflow-ai/frontend
npm install
cp .env.example .env.local
npm run dev
```

기본 화면은 `http://localhost:3000`에서 확인할 수 있습니다.

프론트엔드 품질 점검:

```bash
cd meetingflow-ai/frontend
npm run lint
npm run build
```

프론트엔드는 다음 화면을 포함합니다.

- 로그인/회원가입
- 대시보드
- 회의록 생성 방식 선택
- 직접 작성
- txt/docx 파일 업로드 및 텍스트 추출
- AI 분석 결과 전용 화면
- 액션 아이템 검토 테이블
- 회의 상세 페이지
- Markdown, Notion, Google Calendar, Gmail Mock 연동 버튼

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
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_SECONDS=45
AI_PROVIDER=groq
AI_MOCK_FALLBACK=true
AI_MAX_TRANSCRIPT_CHARS=20000
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
PINECONE_NAMESPACE=meetingflow-local
RAG_ENABLED=false
```

주요 환경변수 설명:

- `DATABASE_URL`: SQLite 또는 향후 운영 DB 연결 문자열
- `JWT_SECRET_KEY`: JWT 서명 비밀값. 운영 환경에서는 반드시 강한 랜덤 값 사용
- `AUTH_COOKIE_SECURE`: HTTPS 운영 환경에서는 `true` 권장
- `BACKEND_CORS_ORIGINS`: 프론트엔드 origin 목록
- `GROQ_API_KEY`: Groq API key. 없으면 로컬 개발 환경에서 Mock fallback 가능
- `GROQ_MODEL`: Groq 분석 모델명
- `AI_MOCK_FALLBACK`: 개발 환경에서 Groq 실패 시 Mock 분석 사용 여부
- `AI_MAX_TRANSCRIPT_CHARS`: Groq에 전달할 transcript 최대 길이
- `PINECONE_*`, `RAG_ENABLED`: 향후 RAG/Pinecone 연동 설정

## Groq API 설정

`POST /meetings/{meeting_id}/analyze`는 기본적으로 Groq Chat Completions API를 호출합니다.

1. Groq 콘솔에서 API key를 발급합니다.
2. `meetingflow-ai/backend/.env`에 `GROQ_API_KEY`를 입력합니다.
3. 필요하면 `GROQ_MODEL`을 변경합니다. 기본값은 `llama-3.3-70b-versatile`입니다.
4. 백엔드를 재시작합니다.

분석 프롬프트는 Groq JSON mode를 사용해 구조화된 JSON만 반환하도록 요청합니다. 응답은 Pydantic 스키마로 검증한 뒤 `Meeting`, `Decision`, `ActionItem`, `UnresolvedIssue`, `FollowUpEmailDraft`에 저장됩니다.

개발 환경(`ENVIRONMENT=local`, `development`, `dev`)에서 `GROQ_API_KEY`가 없거나 Groq 호출/JSON 파싱이 실패하면 `AI_MOCK_FALLBACK=true`일 때 Mock 분석 결과로 fallback합니다. 운영 환경에서는 fallback을 끄고 명확한 `503` 오류를 반환하도록 `AI_MOCK_FALLBACK=false`를 권장합니다.

긴 transcript는 MVP 보호 장치로 `AI_MAX_TRANSCRIPT_CHARS`만큼 잘라 Groq에 전달합니다. 이후 단계에서 요약 chunk merge 방식으로 확장할 수 있습니다.

## RAG 확장 계획

현재 RAG는 실제 Pinecone 호출 없이 interface와 placeholder만 준비되어 있습니다. `RAG_ENABLED=false`가 기본값이며, 이 상태에서는 검색 결과가 빈 배열로 반환되고 인덱싱은 no-op으로 처리됩니다. 따라서 Pinecone 미연동 상태에서도 기존 로그인, 회의 생성, AI 분석, 액션 아이템 검토 플로우는 정상 동작합니다.

준비된 service 함수:

- `index_meeting_transcript`
- `index_meeting_summary`
- `index_decisions`
- `index_action_items`
- `search_related_meetings`
- `search_previous_decisions`
- `search_unresolved_action_items`

AI 분석 파이프라인은 분석 직전에 `RagService.build_analysis_context(meeting)`을 호출하고, 이 context를 Groq 프롬프트에 주입할 수 있게 연결되어 있습니다. 현재는 빈 context가 들어가지만, Pinecone adapter를 구현하면 이전 회의록과 결정사항이 분석 프롬프트에 포함됩니다. 분석 저장 후에는 회의 원문, 요약, 결정사항, 액션 아이템 인덱싱 hook이 호출됩니다.

향후 RAG 사용 시나리오:

- 이전 회의록 기반 맥락 보완
- 과거 결정사항과 이번 결정사항의 충돌 감지
- 미완료 액션 아이템 추적
- 프로젝트 문서 기반 용어/약어 해석
- 다음 회의 아젠다 자동 생성

Pinecone 실제 연동 시에는 `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_NAMESPACE`를 설정하고 `RAG_ENABLED=true`로 전환한 뒤, `PineconeClientPlaceholder`를 실제 embedding/upsert/query 구현으로 교체하면 됩니다.

## 인증 흐름

MeetingFlow AI는 이메일/비밀번호 기반 인증을 사용합니다.

1. `POST /auth/register`로 이메일 회원가입을 합니다.
2. 서버는 비밀번호를 bcrypt 해시로 저장하고 평문 비밀번호는 저장하지 않습니다.
3. 회원가입 또는 `POST /auth/login` 성공 시 JWT access token을 발급해 `AUTH_COOKIE_NAME` 이름의 httpOnly cookie로 내려줍니다.
4. 프론트엔드 API client는 `credentials: "include"`로 요청하여 cookie를 자동 전송합니다.
5. 보호 API는 `CurrentUser` dependency에서 httpOnly cookie의 JWT를 검증한 뒤 현재 사용자를 주입합니다.
6. `GET /meetings`, `GET /meetings/{meeting_id}`, 분석, 삭제, 액션 아이템, export/integration API는 현재 사용자 소유 데이터만 조회합니다.
7. 다른 사용자의 `meeting_id` 또는 `action_item_id`로 접근하면 존재하지 않는 것처럼 `404`를 반환합니다.
8. `POST /auth/logout`은 인증 cookie를 삭제합니다.

프론트엔드는 localStorage에 access token을 저장하지 않습니다. MVP 로컬 개발에서는 `AUTH_COOKIE_SECURE=false`를 사용하지만, HTTPS 운영 환경에서는 반드시 `AUTH_COOKIE_SECURE=true`로 설정하세요. 다른 도메인 간 배포가 필요하면 CORS origin과 cookie SameSite 정책도 배포 도메인에 맞게 조정해야 합니다.

프론트엔드 `meetingflow-ai/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 현재 Mock 처리 범위

실제 구현된 기능:

- 이메일 회원가입/로그인
- bcrypt 비밀번호 해시 저장
- httpOnly cookie 기반 JWT 인증
- 사용자별 회의록/액션 아이템 접근 제어
- 회의 생성/조회/삭제
- Groq 기반 회의 분석 호출 구조
- 분석 결과의 DB 저장
- 액션 아이템 조회/수정/삭제
- txt/docx 파일에서 회의록 텍스트 추출
- 프론트엔드 로그인 보호, loading/empty/error/success 상태 처리

Mock 또는 placeholder 기능:

- 개발 환경에서 Groq 실패 시 `MockMeetingAnalyzer` fallback
- 음성 파일 업로드와 STT 처리
- Notion, Google Calendar, Gmail 실제 API 연동
- RAG/Pinecone 실제 벡터 인덱싱 및 검색
- Alembic migration 파일 생성

## 알려진 제한사항

- 로컬 MVP는 FastAPI startup에서 `create_all`로 테이블을 생성합니다. 운영 전 Alembic migration을 작성해야 합니다.
- Groq transcript 처리는 `AI_MAX_TRANSCRIPT_CHARS` 기준 단순 길이 제한입니다. 긴 회의록은 chunk 분석/merge가 필요합니다.
- RAG는 interface와 hook만 있으며 실제 embedding/search는 아직 없습니다.
- Gmail/Calendar/Notion은 승인 기반 Mock 로그만 남기며 실제 외부 서비스에 저장하지 않습니다.
- 프론트엔드 보호 라우트는 클라이언트에서 `/auth/me` 확인 후 redirect합니다. 민감 데이터 보호는 백엔드 권한 검증이 최종 방어선입니다.
- 테스트는 핵심 API와 실패 케이스 중심입니다. 브라우저 E2E 테스트는 아직 없습니다.

## 다음 구현 단계

1. 음성 업로드 저장소와 STT provider abstraction 추가
2. 긴 회의록용 chunk 분석 및 결과 merge 로직 추가
3. Alembic 초기 migration 생성
4. Pinecone 기반 embedding, indexing, search adapter 구현
5. 외부 연동별 승인/검토 모달과 실제 API connector 구현
6. 액션 아이템 필터, 담당자별 뷰, 마감 알림 추가
7. 백엔드 통합 테스트와 프론트엔드 E2E 테스트 보강
