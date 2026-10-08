import { env } from '../env';
import { collectTexts, findImagePart } from './findImagePart';
import { ProviderError, type GenerateInput, type GenerateOutput, type ImageProvider } from './types';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

/** usage에서 비용 계산에 필요한 값만 추린다 */
export function summarizeUsage(usage: unknown) {
  const u = (usage ?? {}) as {
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_thought_tokens?: number;
    output_tokens_by_modality?: { modality: string; tokens: number }[];
  };
  const imageOut = u.output_tokens_by_modality?.find((m) => m.modality === 'image')?.tokens ?? 0;
  return {
    input: u.total_input_tokens ?? 0,
    imageOutput: imageOut,
    textOutput: (u.total_output_tokens ?? 0) - imageOut,
    thought: u.total_thought_tokens ?? 0,
  };
}

/** 디버그 출력용: 긴 문자열(base64)을 잘라 응답 구조만 보이게 한다 */
function redact(node: unknown): unknown {
  if (typeof node === 'string') return node.length > 200 ? `${node.slice(0, 40)}…(${node.length}자)` : node;
  if (Array.isArray(node)) return node.map(redact);
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, redact(v)]));
  return node;
}

/**
 * Google Gemini 이미지 모델 (Interactions API).
 * 여러 장 입력을 지원하지만 마스크 파라미터가 없어서, 마스킹 모드는 클라이언트의 얼굴 재합성으로 처리한다.
 * 문서: https://ai.google.dev/gemini-api/docs/image-generation
 */
export class GeminiProvider implements ImageProvider {
  readonly id = 'gemini' as const;
  readonly supportsMask = false;
  readonly model = env.gemini.model;

  available() {
    return Boolean(env.gemini.apiKey);
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const images = [input.selfie, input.reference].filter((x) => x != null);
    const body = {
      model: this.model,
      input: [
        { type: 'text', text: input.prompt },
        ...images.map((img) => ({ type: 'image', mime_type: img.mimeType, data: img.data.toString('base64') })),
      ],
      response_format: {
        type: 'image',
        mime_type: 'image/jpeg',
        ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
        image_size: env.gemini.imageSize,
      },
    };

    const started = performance.now();
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.gemini.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(env.generationTimeoutMs),
      });
    } catch (err) {
      if ((err as Error).name === 'TimeoutError') {
        throw new ProviderError(`gemini: ${env.generationTimeoutMs}ms 안에 응답 없음`, 504, 'timeout');
      }
      throw err;
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (env.gemini.debug) {
      // 전체 구조가 필요하면 GEMINI_DEBUG=full
      if (process.env.GEMINI_DEBUG === 'full') console.log('[gemini]', JSON.stringify(redact(json), null, 2));
      else console.log('[gemini] HTTP', res.status, 'status', json?.status, 'usage', JSON.stringify(summarizeUsage(json?.usage)));
    }
    if (!res.ok) {
      throw new ProviderError(`gemini ${res.status}: ${JSON.stringify(json?.error ?? json).slice(0, 500)}`, res.status);
    }
    if (json?.status && json.status !== 'completed') {
      throw new ProviderError(`gemini status=${String(json.status)}`);
    }
    const part = findImagePart(json);
    if (!part) {
      // 입력 프롬프트가 응답에 되돌아올 수 있어 그것은 빼고 본다
      const texts = collectTexts(json).filter((t) => t.trim() && t !== input.prompt);
      throw texts.length
        ? new ProviderError(`gemini: 이미지 없이 텍스트만 응답: ${texts.join(' ').slice(0, 200)}`, 502, 'text_only')
        : new ProviderError('gemini: 응답에 이미지가 없음 (안전 필터 추정)', 502, 'no_image');
    }
    const image = { data: Buffer.from(part.data, 'base64'), mimeType: part.mimeType ?? 'image/jpeg' };
    return { image, latencyMs: Math.round(performance.now() - started), model: this.model };
  }
}
