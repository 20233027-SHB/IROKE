// 6단계 정의와 진입 조건 (순수 함수)
import type { PromptVersion } from '@iroke/shared';
import { currentGeneration, type FlowState } from './state';

export const STEPS = [
  { path: '/start', label: '셀카' },
  { path: '/flow/profile', label: '모발 확인' },
  { path: '/flow/reference', label: '레퍼런스' },
  { path: '/flow/style', label: '스타일' },
  { path: '/flow/generate', label: 'AI 시술' },
  { path: '/flow/card', label: '전달 카드' },
] as const;

/** 단계별 완료 여부 */
export function stepDone(state: FlowState, promptVersion: PromptVersion): boolean[] {
  return [
    state.consent && Boolean(state.selfie),
    Boolean(state.profileSource),
    Boolean(state.reference),
    Boolean(state.styleTag && state.styleSource),
    Boolean(currentGeneration(state, promptVersion)),
    false,
  ];
}

/**
 * index 단계에 들어갈 수 없으면 먼저 끝내야 할 단계 번호, 들어갈 수 있으면 null.
 * 저장된 프로필이 있으면 셀카 없이도 모발 확인(2단계)은 열어 준다.
 */
export function blockingStep(index: number, state: FlowState, promptVersion: PromptVersion): number | null {
  if (index === 1 && state.profileOrigin === 'saved') return null;
  const done = stepDone(state, promptVersion);
  for (let i = 0; i < index; i++) if (!done[i]) return i;
  return null;
}
