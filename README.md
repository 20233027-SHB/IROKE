# IROKE

화학 시술(펌·염색·탈색)을 반복하는 20대 미용실 이용자를 위한 모바일 우선 웹.
셀카와 시술 이력으로 모발 상태를 확인하고, "내 머리로 실제 구현 가능한" AI 헤어 시안과 미용사 전달 카드를 만든다.

## 실행

```bash
npm install
cp server/.env.example server/.env   # 기본 AI_MODE=mock (API 비용 없음)
npm run dev                          # 서버 :8787 + 클라이언트 :5173
npm test                             # 단위·API 테스트 (vitest)
npm run typecheck
```

실제 분석·생성은 `server/.env`에서 `AI_MODE=gemini`와 결제 등록된 `GEMINI_API_KEY`를 넣는다. 키는 서버에만 있고 브라우저는 `/api`만 호출한다.

## 구조

| 워크스페이스 | 내용 |
|---|---|
| `shared/` | 모발 프로필 타입·한국어 라벨, 시안 프롬프트(`buildPrompt` v1/v2), 톤 안전범위(임시 규칙), API 계약 타입 |
| `server/` | Hono API. Gemini 분석기(재시도·대체 모델), 이미지 provider(Gemini·Mock), 요청 검증, JSONL 이벤트 로그 |
| `client/` | 랜딩(`/`)과 6단계 플로우(`/start` → `/flow/profile` → `/flow/reference` → `/flow/style` → `/flow/generate` → `/flow/card`) |

## API

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/status` | AI 모드, 프롬프트 버전 |
| `POST /api/analysis/hair` | 셀카 → 기장·모질·숱·손상도·명도 추정 (+확신도·근거) |
| `POST /api/analysis/style` | 레퍼런스 → 스타일명 3개 추천 |
| `POST /api/profile-confirmations` | 확정 프로필 기록 (AI 원본 + `editedFields`) |
| `POST /api/generations` | 시안 생성. 프롬프트는 서버에서 만들고, 확인(`confirmedAt`) 없는 요청은 거절. 자동 재시도 없음 |
| `PATCH /api/generations/:id` | 클라이언트 end-to-end 시간 기록 |

## 정책 (2026-10-08 결정)

- **저장소**: DB 없음. 이벤트는 `server/logs/*.jsonl`에만 기록하고 사진은 기록하지 않는다 (git 제외).
- **사용자 구분**: 로그인 없음. 브라우저별 임의 ID(`x-iroke-client-id`).
- **셀카 보관**: 서버에 저장하지 않는다. 사진과 결과는 브라우저 탭(sessionStorage)에만 남고 탭을 닫으면 사라진다. 확정 프로필(사진 제외)만 localStorage에 저장.
- **비용**: 5단계 요약 화면이 생성 전 확인 단계. 같은 입력은 24시간 동안 탭 안에서 재사용. 하루 생성 제한은 **미정** (`GENERATION_DAILY_LIMIT`을 비우면 제한 없음).
- **카드 공유**: PNG 저장, 지원 기기에서 공유 시트. 링크 공유는 서버 저장소가 정해진 뒤.

## 보류 (기술 검증 결과 대기)

- 톤 슬라이더(⑦): `getSafeToneRange`·`splitToneSteps`와 톤 프롬프트만 이식, UI·Canvas 보정·MediaPipe는 보류.
- 마스킹·얼굴 재합성(⑧): 이식 보류.
- 동의 문구: 법률 검토 전 초안 (`client/src/flow/steps/SelfieStep.tsx`의 TODO).
