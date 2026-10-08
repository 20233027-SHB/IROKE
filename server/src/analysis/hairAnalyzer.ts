import type { Confidence, FieldEstimate, HairAnalysis, HairDensity, HairLength, HairProfile, HairTexture } from '@iroke/shared';
import { ProviderError, type ImageBlob } from '../providers/types';
import { analyzeImageJson, parseJsonText } from './geminiJson';

const LENGTHS: HairLength[] = ['short', 'bob', 'medium', 'long'];
const TEXTURES: HairTexture[] = ['straight', 'wavy', 'curly'];
const DENSITIES: HairDensity[] = ['low', 'medium', 'high'];
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low'];

const ANALYSIS_PROMPT = `You are an experienced hair designer at a Korean salon. Look ONLY at the hair of the person in the photo and estimate:
- length: short (above the ears) | bob (around the chin) | medium (around the shoulders) | long (below the shoulders)
- texture: straight | wavy (semi-curly, S-waves) | curly (defined curls). Judge the hair as it appears now; if it looks heat-styled or permed, say so in the reason.
- density: low | medium | high (amount of hair: scalp visibility, volume, thickness of the ends)
- damage: integer 1 (healthy, glossy) to 5 (severely damaged: very dry, frizzy, broken ends), judged from shine, frizz and ends
- currentLevel: hair color lightness level on the Korean salon scale, integer 1 (black) to 10 (lightest blonde)
For each field return a confidence (high | medium | low) and a one-sentence reason written in Korean.
Lower the confidence when the hair is partly hidden, cropped, or lighting/filters make it hard to judge.
colorDescription: the current hair color in a few Korean words.
notes: 1-2 Korean sentences about anything that limits this analysis (cropping, filters, styling).`;

const field = (value: Record<string, unknown>) => ({
  type: 'object',
  properties: { value, confidence: { type: 'string', enum: CONFIDENCES }, reason: { type: 'string' } },
  required: ['value', 'confidence', 'reason'],
});

const SCHEMA = {
  type: 'object',
  properties: {
    length: field({ type: 'string', enum: LENGTHS }),
    texture: field({ type: 'string', enum: TEXTURES }),
    density: field({ type: 'string', enum: DENSITIES }),
    damage: field({ type: 'integer', minimum: 1, maximum: 5 }),
    currentLevel: field({ type: 'integer', minimum: 1, maximum: 10 }),
    colorDescription: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['length', 'texture', 'density', 'damage', 'currentLevel', 'colorDescription', 'notes'],
};

function estimate<T>(raw: unknown, check: (v: unknown) => T | undefined, name: string): FieldEstimate<T> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const value = check(r.value);
  if (value === undefined) throw new ProviderError(`분석 결과의 ${name} 값이 올바르지 않음: ${JSON.stringify(r.value)}`);
  const confidence = CONFIDENCES.includes(r.confidence as Confidence) ? (r.confidence as Confidence) : 'low';
  return { value, confidence, reason: typeof r.reason === 'string' ? r.reason : '' };
}

const oneOf = <T extends string>(list: T[]) => (v: unknown) => (list.includes(v as T) ? (v as T) : undefined);
const intIn = (lo: number, hi: number) => (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : undefined;
};

/** 모델 출력(JSON 문자열)을 검증해 HairAnalysis로 만든다 */
export function parseAnalysis(text: string, model: string): HairAnalysis {
  const json = parseJsonText(text);
  return {
    model,
    analyzedAt: new Date().toISOString(),
    length: estimate(json.length, oneOf(LENGTHS), 'length'),
    texture: estimate(json.texture, oneOf(TEXTURES), 'texture'),
    density: estimate(json.density, oneOf(DENSITIES), 'density'),
    damage: estimate(json.damage, intIn(1, 5), 'damage') as FieldEstimate<HairProfile['damage']>,
    currentLevel: estimate(json.currentLevel, intIn(1, 10), 'currentLevel'),
    colorDescription: typeof json.colorDescription === 'string' ? json.colorDescription : '',
    notes: typeof json.notes === 'string' ? json.notes : '',
  };
}

/** 셀카에서 모발 특징을 추정한다 (Gemini 텍스트 모델 + JSON 스키마) */
export async function analyzeHair(image: ImageBlob): Promise<HairAnalysis> {
  const { result, latencyMs } = await analyzeImageJson({ label: 'hair', prompt: ANALYSIS_PROMPT, image, schema: SCHEMA, parse: parseAnalysis });
  return { ...result, latencyMs };
}
