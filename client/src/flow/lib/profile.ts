// AI 분석 결과 ↔ 프로필 변환 (DOM 의존 없음)
import type { AnalyzedField, HairAnalysis, HairProfile, ProfileSource, Treatment } from '@iroke/shared';

export const ANALYZED_FIELDS: AnalyzedField[] = ['length', 'texture', 'density', 'damage', 'currentLevel'];

/** AI 추정값으로 프로필 초안을 만든다. 시술 이력은 사진으로 알 수 없어 그대로 둔다. */
export function draftFromAnalysis(a: HairAnalysis, history: Treatment[] = []): HairProfile {
  return {
    length: a.length.value,
    texture: a.texture.value,
    density: a.density.value,
    damage: a.damage.value,
    currentLevel: a.currentLevel.value,
    history,
  };
}

/** AI 추정값과 다르게 사용자가 고친 항목 */
export function editedFields(a: HairAnalysis | undefined, p: HairProfile): AnalyzedField[] {
  if (!a) return [];
  return ANALYZED_FIELDS.filter((f) => a[f].value !== p[f]);
}

export function confirmProfile(a: HairAnalysis | undefined, p: HairProfile): ProfileSource {
  return { analysis: a, editedFields: editedFields(a, p), confirmedAt: new Date().toISOString() };
}
