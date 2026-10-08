// 화면 표시용 한국어 라벨 (본 서비스에서도 재사용)
import type { Confidence, HairDensity, HairLength, HairTexture, TreatmentType } from '../types';

export const LENGTH_LABELS: Record<HairLength, string> = {
  short: '숏 (귀 위)',
  bob: '단발 (턱선)',
  medium: '중단발 (어깨)',
  long: '장발 (어깨 아래)',
};

export const TEXTURE_LABELS: Record<HairTexture, string> = {
  straight: '직모',
  wavy: '반곱슬',
  curly: '곱슬',
};

export const DENSITY_LABELS: Record<HairDensity, string> = {
  low: '적음',
  medium: '보통',
  high: '많음',
};

export const DAMAGE_LABELS: Record<number, string> = {
  1: '1 건강',
  2: '2 약간 건조',
  3: '3 보통 손상',
  4: '4 손상',
  5: '5 심한 손상',
};

export const TREATMENT_LABELS: Record<TreatmentType, string> = {
  cut: '커트',
  perm: '펌',
  color: '염색',
  bleach: '탈색',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: '확신 높음',
  medium: '확신 보통',
  low: '확신 낮음',
};
