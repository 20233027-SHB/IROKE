// 클라이언트 ↔ 서버 API 계약. 필드는 camelCase.
import type { HairProfile, ProfileSource, PromptVersion, StyleSource } from './types';

export type AiMode = 'mock' | 'gemini';

/** GET /api/status */
export interface StatusResponse {
  mode: AiMode;
  /** 현재 시안 생성에 쓰는 프롬프트 버전 (브라우저 캐시 키에 포함) */
  promptVersion: PromptVersion;
}

/** POST /api/analysis/hair, POST /api/analysis/style */
export interface AnalyzeRequest {
  /** data URL */
  image: string;
}

/** POST /api/profile-confirmations — AI 원본 추정값 + 사용자가 고친 항목 + 확정 프로필 기록 */
export interface ProfileConfirmationRequest {
  profile: HairProfile;
  profileSource: ProfileSource;
}

/** POST /api/generations */
export interface GenerationRequest {
  /** 정규화된 셀카 data URL (3:4, 768×1024) */
  selfie: string;
  /** 레퍼런스 data URL (긴 변 1024px) */
  reference: string;
  styleTag: string;
  profile: HairProfile;
  /** 확인 단계를 거쳤다는 증거. confirmedAt이 없으면 서버가 거절한다. */
  profileSource: ProfileSource;
  styleSource: StyleSource;
}

export interface GenerationResponse {
  generationId: string;
  /** 생성 이미지 data URL. 서버에는 저장하지 않는다. */
  image: string;
  model: string;
  promptVersion: PromptVersion;
  /** 서버 측: API 호출 ~ 이미지 수신 */
  latencyMs: number;
}

/** PATCH /api/generations/:generationId */
export interface GenerationTimingRequest {
  /** 클라이언트 측: 요청 ~ 결과 표시 (end-to-end) */
  clientLatencyMs: number;
}

export type ApiErrorCode =
  | 'bad_request'
  | 'payload_too_large'
  | 'profile_not_confirmed'
  | 'limit_reached'
  | 'analysis_failed'
  | 'generation_failed'
  /** 안전 필터 등으로 이미지 없이 응답 */
  | 'no_image'
  /** 이미지 대신 텍스트만 응답 */
  | 'text_only'
  | 'timeout'
  | 'server_error';

export interface ApiError {
  error: string;
  code: ApiErrorCode;
}
