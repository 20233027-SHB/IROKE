import { describe, expect, it } from 'vitest';
import type { HairAnalysis, ProfileSource } from '@iroke/shared';
import { MANUAL_PROFILE, currentGeneration, flowReducer, initialFlowState, inputKey, type FlowState, type Generation } from './state';
import { blockingStep } from './steps';

const est = <T,>(value: T) => ({ value, confidence: 'high' as const, reason: '' });
const analysis: HairAnalysis = {
  model: 'm',
  analyzedAt: '',
  length: est('long'),
  texture: est('wavy'),
  density: est('high'),
  damage: est(2),
  currentLevel: est(3),
  colorDescription: '',
  notes: '',
};
const confirmed: ProfileSource = { editedFields: [], confirmedAt: '2026-10-08T10:00:00.000Z' };

function reach(...actions: Parameters<typeof flowReducer>[1][]): FlowState {
  return actions.reduce(flowReducer, initialFlowState);
}

const ready = reach(
  { type: 'setConsent', consent: true },
  { type: 'setSelfie', selfie: 'data:s', selfieId: 's1' },
  { type: 'setAnalysis', analysis },
  { type: 'confirmProfile', profileSource: confirmed },
  { type: 'setReference', reference: 'data:r', referenceId: 'r1' },
  { type: 'chooseStyle', styleTag: '허쉬컷', styleSource: { chosen: 'suggestion', suggestionIndex: 0 } },
);

describe('확인 단계', () => {
  it('[확인] 전에는 3단계 이후로 못 간다', () => {
    const s = reach({ type: 'setConsent', consent: true }, { type: 'setSelfie', selfie: 'data:s', selfieId: 's1' }, { type: 'setAnalysis', analysis });
    expect(blockingStep(2, s, 'v1')).toBe(1);
    expect(blockingStep(4, s, 'v1')).toBe(1);
  });
  it('확인 뒤 프로필을 고치면 다시 확인해야 한다', () => {
    const edited = flowReducer(ready, { type: 'updateProfile', profile: { ...ready.profile!, density: 'low' } });
    expect(edited.profileSource).toBeUndefined();
    expect(blockingStep(4, edited, 'v1')).toBe(1);
  });
  it('동의와 셀카가 없으면 1단계부터', () => {
    expect(blockingStep(1, initialFlowState, 'v1')).toBe(0);
    expect(blockingStep(1, reach({ type: 'setSelfie', selfie: 'data:s', selfieId: 's1' }), 'v1')).toBe(0);
  });
  it('저장된 프로필이 있으면 셀카 없이 2단계는 열리지만 3단계는 막힌다', () => {
    const s = reach({ type: 'loadSaved', profile: MANUAL_PROFILE }, { type: 'confirmProfile', profileSource: confirmed });
    expect(blockingStep(1, s, 'v1')).toBeNull();
    expect(blockingStep(2, s, 'v1')).toBe(0);
  });
});

describe('입력이 바뀌면 다음 단계를 초기화', () => {
  it('새 셀카: AI 초안과 확인을 지운다', () => {
    const s = flowReducer(ready, { type: 'setSelfie', selfie: 'data:s2', selfieId: 's2' });
    expect(s.analysis).toBeUndefined();
    expect(s.profile).toBeUndefined();
    expect(s.profileSource).toBeUndefined();
  });
  it('새 셀카: 저장된 프로필은 확인 상태째 유지', () => {
    const saved = reach({ type: 'loadSaved', profile: MANUAL_PROFILE }, { type: 'confirmProfile', profileSource: confirmed });
    const s = flowReducer(saved, { type: 'setSelfie', selfie: 'data:s', selfieId: 's1' });
    expect(s.profile).toEqual(MANUAL_PROFILE);
    expect(s.profileSource).toEqual(confirmed);
  });
  it('재분석해도 시술 이력은 유지', () => {
    const withHistory = flowReducer(ready, { type: 'updateProfile', profile: { ...ready.profile!, history: [{ type: 'bleach', date: '2026-09-01' }] } });
    expect(flowReducer(withHistory, { type: 'setAnalysis', analysis }).profile?.history).toHaveLength(1);
  });
  it('새 레퍼런스: 스타일 선택을 지운다', () => {
    const s = flowReducer(ready, { type: 'setReference', reference: 'data:r2', referenceId: 'r2' });
    expect(s.styleTag).toBeUndefined();
    expect(blockingStep(4, s, 'v1')).toBe(3);
  });
});

describe('시안 캐시', () => {
  const gen = (key: string, createdAt = '2026-10-08T10:00:00.000Z'): Generation => ({
    key,
    generationId: key,
    image: 'data:g',
    model: 'mock-echo',
    promptVersion: 'v1',
    latencyMs: 1,
    createdAt,
  });
  const now = Date.parse('2026-10-08T12:00:00.000Z');

  it('같은 입력이면 이전 결과를 쓰고, 입력이나 프롬프트 버전이 바뀌면 쓰지 않는다', () => {
    const s = flowReducer(ready, { type: 'addGeneration', generation: gen(inputKey(ready, 'v1')!) });
    expect(currentGeneration(s, 'v1', now)).toBeDefined();
    expect(currentGeneration(s, 'v2', now)).toBeUndefined();
    const other = flowReducer(s, { type: 'chooseStyle', styleTag: '보브컷', styleSource: { chosen: 'custom' } });
    expect(currentGeneration(other, 'v1', now)).toBeUndefined();
  });
  it('24시간이 지나면 다시 생성', () => {
    const s = flowReducer(ready, { type: 'addGeneration', generation: gen(inputKey(ready, 'v1')!, '2026-10-07T11:00:00.000Z') });
    expect(currentGeneration(s, 'v1', now)).toBeUndefined();
  });
  it('최근 3개만 보관', () => {
    let s = ready;
    for (const k of ['a', 'b', 'c', 'd']) s = flowReducer(s, { type: 'addGeneration', generation: gen(k) });
    expect(s.generations.map((g) => g.key)).toEqual(['d', 'c', 'b']);
  });
});
