import type { HairProfile, ToneRange } from '../types';

/** 임시 규칙 파라미터 */
export const TONE_RULES = {
  baseMin: 4,
  baseMax: 8,
  /** 손상도가 이 값 이상이면 상한을 highDamageMax로 낮춘다 */
  highDamageThreshold: 4,
  highDamageMax: 7,
  /** 이 기간 안에 탈색했으면 상한을 현재 레벨로 제한 */
  recentBleachDays: 28,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 모발 상태 기준으로 톤(명도 레벨)의 안전범위를 돌려준다.
 *
 * TODO: 임시 규칙이다. 시술 안전 규칙표가 확정되면 이 함수 본문을 규칙표 조회로 교체한다.
 *       반환 형식({ min, max, reasons })과 시그니처는 유지해서 호출부를 바꾸지 않도록 한다.
 */
export function getSafeToneRange(profile: HairProfile, now: Date = new Date()): ToneRange {
  let min: number = TONE_RULES.baseMin;
  let max: number = TONE_RULES.baseMax;
  const reasons: string[] = [];

  if (profile.damage >= TONE_RULES.highDamageThreshold) {
    max = Math.min(max, TONE_RULES.highDamageMax);
    reasons.push(`손상도 ${profile.damage} → 상한 ${TONE_RULES.highDamageMax}레벨`);
  }

  const recentBleach = profile.history.some(
    (t) => t.type === 'bleach' && now.getTime() - new Date(t.date).getTime() <= TONE_RULES.recentBleachDays * DAY_MS,
  );
  if (recentBleach && profile.currentLevel != null) {
    max = Math.min(max, profile.currentLevel);
    reasons.push(`${TONE_RULES.recentBleachDays}일 내 탈색 → 상한 현재 레벨(${profile.currentLevel})`);
  }

  if (max < min) {
    min = max;
    reasons.push('상한이 기본 하한보다 낮아 하한을 상한에 맞춤');
  }
  return { min, max, reasons };
}

/** 안전범위를 n단계로 균등 분할한다. 결과는 오름차순 레벨 배열. */
export function splitToneSteps(range: Pick<ToneRange, 'min' | 'max'>, steps: number): number[] {
  if (steps < 2) return [range.min];
  const size = (range.max - range.min) / (steps - 1);
  return Array.from({ length: steps }, (_, i) => Number((range.min + size * i).toFixed(2)));
}
