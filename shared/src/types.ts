// 서비스 공용 타입. Node·브라우저 전용 API에 의존하지 않는다.

export type HairLength = 'short' | 'bob' | 'medium' | 'long';
export type HairTexture = 'straight' | 'wavy' | 'curly';
export type HairDensity = 'low' | 'medium' | 'high';
export type TreatmentType = 'cut' | 'perm' | 'color' | 'bleach';

export interface Treatment {
  type: TreatmentType;
  /** ISO 날짜 (YYYY-MM-DD) */
  date: string;
}

export interface HairProfile {
  length: HairLength;
  texture: HairTexture;
  density: HairDensity;
  /** 1(건강) ~ 5(심한 손상) */
  damage: 1 | 2 | 3 | 4 | 5;
  history: Treatment[];
  /** 현재 모발 명도 레벨(1~10). 톤 안전범위 계산에 쓴다. 모르면 생략. */
  currentLevel?: number;
}

export type PromptVersion = 'v1' | 'v2';

export interface ToneRange {
  min: number;
  max: number;
  /** 범위를 좁힌 이유 (UI 표시용) */
  reasons: string[];
}

export type Confidence = 'high' | 'medium' | 'low';

export interface FieldEstimate<T> {
  value: T;
  confidence: Confidence;
  /** 판단 근거 (한국어 한 문장) */
  reason: string;
}

/** 셀카에서 AI가 추정한 모발 특징. 시술 이력은 사진으로 알 수 없어 포함하지 않는다. */
export interface HairAnalysis {
  model: string;
  analyzedAt: string;
  length: FieldEstimate<HairLength>;
  texture: FieldEstimate<HairTexture>;
  density: FieldEstimate<HairDensity>;
  damage: FieldEstimate<HairProfile['damage']>;
  /** 현재 명도 레벨 1(블랙)~10 */
  currentLevel: FieldEstimate<number>;
  /** 현재 모발 색 설명 */
  colorDescription: string;
  /** 분석 한계 등 메모 */
  notes: string;
  latencyMs?: number;
}

/** AI 추정과 비교할 수 있는 프로필 항목 */
export type AnalyzedField = 'length' | 'texture' | 'density' | 'damage' | 'currentLevel';

export interface ProfileSource {
  /** 없으면 AI 분석 없이 직접 입력 */
  analysis?: HairAnalysis;
  /** AI 추정값과 다르게 사용자가 고친 항목 */
  editedFields: AnalyzedField[];
  confirmedAt: string;
}

export interface StyleSuggestion {
  /** 미용실에서 부르는 스타일명 (예: "허쉬컷", "레이어드 C컬펌") */
  tag: string;
  /** 특징 한 문장 (기장·앞머리·컬 등) */
  description: string;
  confidence: Confidence;
}

/** 레퍼런스 사진에서 AI가 추천한 스타일명 (적합한 순) */
export interface StyleAnalysis {
  model: string;
  analyzedAt: string;
  suggestions: StyleSuggestion[];
  latencyMs?: number;
}

export interface StyleSource {
  analysis?: StyleAnalysis;
  /** 추천 목록에서 골랐는지, 직접 입력했는지 */
  chosen: 'suggestion' | 'custom';
  /** 고른 추천의 순번 (0부터) */
  suggestionIndex?: number;
}
