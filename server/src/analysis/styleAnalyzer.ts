import type { Confidence, StyleAnalysis, StyleSuggestion } from '@iroke/shared';
import { ProviderError, type ImageBlob } from '../providers/types';
import { analyzeImageJson, parseJsonText } from './geminiJson';

export const STYLE_SUGGESTION_COUNT = 3;
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low'];

const STYLE_PROMPT = `You are an experienced hair designer at a Korean salon. Look ONLY at the hairstyle in this reference photo (ignore the face and do not identify the person).
Suggest exactly ${STYLE_SUGGESTION_COUNT} Korean salon style names that best describe this hairstyle, ordered from best fit to worst.
- tag: the name a customer would say at a Korean salon, written in Korean, at most 15 characters. Each tag must name the whole hairstyle (cut, optionally with perm), never bangs alone; include bangs only as a modifier (e.g. 허쉬컷, 레이어드컷, 태슬컷, 보브컷, 픽시컷, 리프컷, C컬펌 단발, 히피펌, 빌드펌, 레이어드 C컬펌, 시스루뱅 리프컷). The 3 tags must be different from each other.
- description: one Korean sentence describing the visible features (length, layers, bangs, curl, volume).
- confidence: high | medium | low.`;

const SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      minItems: STYLE_SUGGESTION_COUNT,
      maxItems: STYLE_SUGGESTION_COUNT,
      items: {
        type: 'object',
        properties: {
          tag: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'string', enum: CONFIDENCES },
        },
        required: ['tag', 'description', 'confidence'],
      },
    },
  },
  required: ['suggestions'],
};

/** 모델 출력 검증: 빈 태그·중복 제거, 최대 3개 */
export function parseStyleAnalysis(text: string, model: string): StyleAnalysis {
  const json = parseJsonText(text);
  const raw = Array.isArray(json.suggestions) ? (json.suggestions as Record<string, unknown>[]) : [];
  const seen = new Set<string>();
  const suggestions: StyleSuggestion[] = [];
  for (const r of raw) {
    const tag = typeof r.tag === 'string' ? r.tag.trim().slice(0, 30) : '';
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    suggestions.push({
      tag,
      description: typeof r.description === 'string' ? r.description : '',
      confidence: CONFIDENCES.includes(r.confidence as Confidence) ? (r.confidence as Confidence) : 'low',
    });
    if (suggestions.length === STYLE_SUGGESTION_COUNT) break;
  }
  if (!suggestions.length) throw new ProviderError(`스타일 추천이 비어 있음: ${text.slice(0, 200)}`);
  return { model, analyzedAt: new Date().toISOString(), suggestions };
}

/** 레퍼런스 사진에서 스타일명 3개를 추천한다 */
export async function analyzeStyle(image: ImageBlob): Promise<StyleAnalysis> {
  const { result, latencyMs } = await analyzeImageJson({ label: 'style', prompt: STYLE_PROMPT, image, schema: SCHEMA, parse: parseStyleAnalysis });
  return { ...result, latencyMs };
}
