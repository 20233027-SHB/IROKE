import type { HairDensity, HairLength, HairProfile, HairTexture } from '../types';
import { TONE_HUE, describeToneLevel } from '../config/tone';

export const LENGTH_TEXT: Record<HairLength, string> = {
  short: 'short, above the ears',
  bob: 'chin length',
  medium: 'shoulder length',
  long: 'below the shoulders',
};

/**
 * 기장 규칙: 레퍼런스 컷의 기장을 따르되, 현재 기장보다 길게는 만들지 않는다.
 * (머리는 자를 수는 있어도 바로 기를 수는 없다 → "내 머리로 실제 구현 가능한가")
 */
export function lengthRule(profile: HairProfile, hasReference: boolean): string {
  const current = LENGTH_TEXT[profile.length];
  return hasReference
    ? `- length: follow the cut length of the second image, but never make the hair longer than this person's current length (${current}). If the reference is longer, keep the current length; if it is shorter, cut it to the reference length.`
    : `- length: never longer than this person's current length (${current}).`;
}

export const TEXTURE_TEXT: Record<HairTexture, string> = {
  straight: 'naturally straight hair',
  wavy: 'naturally wavy (semi-curly) hair',
  curly: 'naturally curly hair',
};

export const DENSITY_TEXT: Record<HairDensity, string> = {
  low: 'thin, low-density hair',
  medium: 'average hair density',
  high: 'thick, high-density hair',
};

export function damageText(damage: number): string {
  if (damage <= 1) return 'healthy, glossy hair';
  if (damage === 2) return 'mostly healthy hair with slight dryness at the ends';
  if (damage === 3) return 'moderately damaged hair, slightly dry and less shiny';
  if (damage === 4) return 'damaged hair, dry with visible frizz';
  return 'severely damaged hair, very dry and frizzy';
}

export function toneText(level: number): string {
  const d = describeToneLevel(level);
  return `${TONE_HUE.prompt} hair color at hair-color level ${level} on the 1 (black) to 10 (lightest blonde) scale: ${d.prompt}`;
}

/** 레퍼런스 합성 시 현재 머리색 유지 (레퍼런스 머리색을 따라가지 않게) */
export function colorKeepText(profile: HairProfile): string {
  const level = profile.currentLevel != null ? ` (about level ${profile.currentLevel} on the 1 black to 10 lightest blonde scale)` : '';
  return `- color: keep this person's current hair color${level}; do not copy the reference's hair color.`;
}
