import { describe, expect, it } from 'vitest';
import type { HairAnalysis } from '@iroke/shared';
import { confirmProfile, draftFromAnalysis, editedFields } from './profile';

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

describe('profile', () => {
  it('AI 추정값으로 초안을 만들고 이력은 유지', () => {
    const p = draftFromAnalysis(analysis, [{ type: 'perm', date: '2026-09-01' }]);
    expect(p).toMatchObject({ length: 'long', texture: 'wavy', density: 'high', damage: 2, currentLevel: 3 });
    expect(p.history).toHaveLength(1);
  });

  it('사용자가 고친 항목만 기록', () => {
    const p = { ...draftFromAnalysis(analysis), density: 'medium' as const, damage: 4 as const };
    expect(editedFields(analysis, p)).toEqual(['density', 'damage']);
    expect(confirmProfile(analysis, p).editedFields).toEqual(['density', 'damage']);
  });

  it('분석 없이 직접 입력하면 수정 항목 없음', () => {
    expect(editedFields(undefined, draftFromAnalysis(analysis))).toEqual([]);
  });
});
