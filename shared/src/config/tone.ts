// 명도(톤) 표현 설정. 프롬프트의 색 설명과 톤 슬라이더(보류 중)가 함께 쓴다.

/** 톤 변경 시 고정하는 색상(hue) */
export const TONE_HUE = { id: 'ash-brown', label: '애쉬브라운', prompt: 'ash brown' } as const;

/**
 * 명도 레벨 ↔ 색 설명 매핑 (미용실 1~10 레벨 기준, hue는 TONE_HUE로 고정).
 * 프롬프트에는 레벨 번호와 이 설명을 함께 넣는다.
 */
export const TONE_LEVEL_DESCRIPTIONS: Record<number, { label: string; prompt: string }> = {
  1: { label: '1레벨 (블랙)', prompt: 'jet black, the darkest possible shade' },
  2: { label: '2레벨', prompt: 'near-black, with only a faint hint of the hue in strong light' },
  3: { label: '3레벨', prompt: 'very dark, the hue barely visible indoors' },
  4: { label: '4레벨', prompt: 'dark, close to natural dark hair, hue visible only in light' },
  5: { label: '5레벨', prompt: 'medium-dark, hue clearly visible in daylight' },
  6: { label: '6레벨', prompt: 'medium lightness, hue visible indoors' },
  7: { label: '7레벨', prompt: 'light, noticeably brighter than natural hair' },
  8: { label: '8레벨', prompt: 'very light, approaching dark blonde lightness' },
  9: { label: '9레벨', prompt: 'very bright, light blonde lightness' },
  10: { label: '10레벨', prompt: 'extremely bright, pale blonde lightness' },
};

export function describeToneLevel(level: number): { label: string; prompt: string } {
  const key = Math.min(10, Math.max(1, Math.round(level)));
  return TONE_LEVEL_DESCRIPTIONS[key]!;
}
