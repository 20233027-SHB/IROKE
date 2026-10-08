// 요청 본문 검증. 프롬프트는 이 값들로 서버에서 만들기 때문에 형식을 엄격하게 본다.
import type { AnalyzedField, HairProfile, ProfileSource, StyleSource, Treatment } from '@iroke/shared';

const LENGTHS = ['short', 'bob', 'medium', 'long'];
const TEXTURES = ['straight', 'wavy', 'curly'];
const DENSITIES = ['low', 'medium', 'high'];
const TREATMENTS = ['cut', 'perm', 'color', 'bleach'];
const ANALYZED_FIELDS: AnalyzedField[] = ['length', 'texture', 'density', 'damage', 'currentLevel'];
const MAX_HISTORY = 20;
export const STYLE_TAG_MAX = 30;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIntIn = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function parseTreatment(v: unknown): Treatment | null {
  if (!isObj(v) || !TREATMENTS.includes(v.type as string) || !isIsoDate(v.date)) return null;
  return { type: v.type as Treatment['type'], date: v.date };
}

/** 알 수 없는 필드는 버리고 HairProfile만 남긴다. 형식이 틀리면 null. */
export function parseProfile(v: unknown): HairProfile | null {
  if (!isObj(v)) return null;
  if (!LENGTHS.includes(v.length as string) || !TEXTURES.includes(v.texture as string) || !DENSITIES.includes(v.density as string)) return null;
  if (!isIntIn(v.damage, 1, 5)) return null;
  if (v.currentLevel != null && !isIntIn(v.currentLevel, 1, 10)) return null;
  if (!Array.isArray(v.history) || v.history.length > MAX_HISTORY) return null;
  const history = v.history.map(parseTreatment);
  if (history.some((t) => t === null)) return null;
  return {
    length: v.length as HairProfile['length'],
    texture: v.texture as HairProfile['texture'],
    density: v.density as HairProfile['density'],
    damage: v.damage as HairProfile['damage'],
    ...(v.currentLevel != null ? { currentLevel: v.currentLevel as number } : {}),
    history: history as Treatment[],
  };
}

/** 확인 단계를 거쳤는지(confirmedAt) 확인한다. analysis는 기록용이라 그대로 둔다. */
export function parseProfileSource(v: unknown): ProfileSource | null {
  if (!isObj(v) || typeof v.confirmedAt !== 'string' || Number.isNaN(Date.parse(v.confirmedAt))) return null;
  if (!Array.isArray(v.editedFields) || !v.editedFields.every((f) => ANALYZED_FIELDS.includes(f as AnalyzedField))) return null;
  return {
    ...(isObj(v.analysis) ? { analysis: v.analysis as unknown as ProfileSource['analysis'] } : {}),
    editedFields: v.editedFields as AnalyzedField[],
    confirmedAt: v.confirmedAt,
  };
}

export function parseStyleSource(v: unknown): StyleSource | null {
  if (!isObj(v) || (v.chosen !== 'suggestion' && v.chosen !== 'custom')) return null;
  if (v.suggestionIndex != null && !isIntIn(v.suggestionIndex, 0, 9)) return null;
  return {
    ...(isObj(v.analysis) ? { analysis: v.analysis as unknown as StyleSource['analysis'] } : {}),
    chosen: v.chosen,
    ...(v.suggestionIndex != null ? { suggestionIndex: v.suggestionIndex as number } : {}),
  };
}

/** 사용자가 입력한 스타일명이 프롬프트 문법을 깨지 않도록 정리한다. 비면 null. */
export function sanitizeStyleTag(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const tag = v
    .replace(/[\u0000-\u001f\u007f"“”`\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, STYLE_TAG_MAX)
    .trim();
  return tag || null;
}
