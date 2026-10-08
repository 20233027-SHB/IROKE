// 서비스 플로우 상태 (순수 함수). 화면과 저장 방식에 의존하지 않는다.
import type { HairAnalysis, HairProfile, ProfileSource, PromptVersion, StyleAnalysis, StyleSource } from '@iroke/shared';
import { draftFromAnalysis } from './profile';

export interface Generation {
  /** 이 결과를 만든 입력 (inputKey) */
  key: string;
  generationId: string;
  image: string;
  model: string;
  promptVersion: PromptVersion;
  latencyMs: number;
  createdAt: string;
}

export interface FlowState {
  consent: boolean;
  selfie?: string;
  /** 업로드마다 새로 발급. 큰 이미지를 해시하지 않고 같은 입력인지 판단하는 데 쓴다. */
  selfieId?: string;
  analysis?: HairAnalysis;
  profile?: HairProfile;
  /** 프로필 값의 출처: AI 분석 초안 / 저장된 프로필 / 직접 입력 */
  profileOrigin?: 'analysis' | 'saved' | 'manual';
  /** [확인]을 누른 경우에만 있다. 프로필을 고치면 사라진다. */
  profileSource?: ProfileSource;
  reference?: string;
  referenceId?: string;
  styleAnalysis?: StyleAnalysis;
  styleTag?: string;
  styleSource?: StyleSource;
  /** 같은 입력이면 다시 생성하지 않도록 최근 결과를 보관 (탭 안에서만) */
  generations: Generation[];
  /** 사용자가 고친 요청 문구. 없으면 자동 문구를 쓴다. */
  requestNote?: string;
}

export const initialFlowState: FlowState = { consent: false, generations: [] };

/** 분석 없이 직접 입력할 때의 초기값. [확인] 전에 사용자가 모두 본다. */
export const MANUAL_PROFILE: HairProfile = { length: 'medium', texture: 'straight', density: 'medium', damage: 2, currentLevel: 4, history: [] };

export const MAX_CACHED_GENERATIONS = 3;
/** 같은 입력 결과 재사용 기간 */
export const GENERATION_CACHE_MS = 24 * 60 * 60 * 1000;

export type FlowAction =
  | { type: 'setConsent'; consent: boolean }
  | { type: 'setSelfie'; selfie: string; selfieId: string }
  | { type: 'setAnalysis'; analysis: HairAnalysis }
  | { type: 'startManual' }
  | { type: 'loadSaved'; profile: HairProfile }
  | { type: 'updateProfile'; profile: HairProfile }
  | { type: 'confirmProfile'; profileSource: ProfileSource }
  | { type: 'setReference'; reference: string; referenceId: string }
  | { type: 'setStyleAnalysis'; styleAnalysis: StyleAnalysis }
  | { type: 'chooseStyle'; styleTag: string; styleSource: StyleSource }
  | { type: 'addGeneration'; generation: Generation }
  | { type: 'setRequestNote'; requestNote?: string }
  | { type: 'reset' };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'setConsent':
      return { ...state, consent: action.consent };
    case 'setSelfie':
      // AI 초안은 새 사진으로 다시 분석해야 한다. 저장·직접 입력한 프로필은 사진과 무관하게 유지한다.
      return state.profileOrigin === 'analysis' || !state.profileSource
        ? { ...state, selfie: action.selfie, selfieId: action.selfieId, analysis: undefined, profile: undefined, profileOrigin: undefined, profileSource: undefined }
        : { ...state, selfie: action.selfie, selfieId: action.selfieId, analysis: undefined };
    case 'setAnalysis':
      return {
        ...state,
        analysis: action.analysis,
        profile: draftFromAnalysis(action.analysis, state.profile?.history ?? []),
        profileOrigin: 'analysis',
        profileSource: undefined,
      };
    case 'startManual':
      return { ...state, profile: state.profile ?? MANUAL_PROFILE, profileOrigin: state.profileOrigin ?? 'manual' };
    case 'loadSaved':
      return { ...state, analysis: undefined, profile: action.profile, profileOrigin: 'saved', profileSource: undefined };
    case 'updateProfile':
      // 값을 고치면 다시 [확인]을 눌러야 한다
      return { ...state, profile: action.profile, profileSource: undefined };
    case 'confirmProfile':
      return state.profile ? { ...state, profileSource: action.profileSource } : state;
    case 'setReference':
      return { ...state, reference: action.reference, referenceId: action.referenceId, styleAnalysis: undefined, styleTag: undefined, styleSource: undefined };
    case 'setStyleAnalysis':
      return { ...state, styleAnalysis: action.styleAnalysis };
    case 'chooseStyle':
      return { ...state, styleTag: action.styleTag, styleSource: action.styleSource };
    case 'addGeneration':
      return {
        ...state,
        generations: [action.generation, ...state.generations.filter((g) => g.key !== action.generation.key)].slice(0, MAX_CACHED_GENERATIONS),
      };
    case 'setRequestNote':
      return { ...state, requestNote: action.requestNote };
    case 'reset':
      return initialFlowState;
  }
}

/** 시안 입력이 같은지 판단하는 키: 셀카·레퍼런스·스타일명·프로필·프롬프트 버전 */
export function inputKey(state: FlowState, promptVersion: PromptVersion): string | null {
  const { selfieId, referenceId, styleTag, profile } = state;
  if (!selfieId || !referenceId || !styleTag || !profile) return null;
  const p = [profile.length, profile.texture, profile.density, profile.damage, profile.currentLevel ?? null, profile.history.map((t) => [t.type, t.date])];
  return JSON.stringify([selfieId, referenceId, styleTag, p, promptVersion]);
}

/** 현재 입력으로 만든, 아직 유효한 시안 */
export function currentGeneration(state: FlowState, promptVersion: PromptVersion, now = Date.now()): Generation | undefined {
  const key = inputKey(state, promptVersion);
  return key ? state.generations.find((g) => g.key === key && now - Date.parse(g.createdAt) < GENERATION_CACHE_MS) : undefined;
}
