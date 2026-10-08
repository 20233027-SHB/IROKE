// Gemini 텍스트 모델에 이미지 1장 + 지시를 보내고 JSON 스키마로 답을 받는 공통 호출.
// 과부하(429/5xx)면 1회 재시도 후 대체 모델로 넘어간다.
import { env } from '../env';
import { collectTexts } from '../providers/findImagePart';
import { ProviderError, type ImageBlob } from '../providers/types';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const RETRYABLE = new Set([429, 500, 503]);

/** 코드펜스를 벗기고 JSON으로 파싱 */
export function parseJsonText(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new ProviderError(`분석 결과가 JSON이 아님: ${text.slice(0, 200)}`);
  }
}

interface Request<T> {
  label: string;
  prompt: string;
  image: ImageBlob;
  schema: Record<string, unknown>;
  /** 모델 출력 텍스트를 검증해 결과로 만든다 (실패 시 throw) */
  parse: (text: string, model: string) => T;
}

async function callOnce<T>(model: string, req: Request<T>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.gemini.apiKey },
    body: JSON.stringify({
      model,
      input: [
        { type: 'text', text: req.prompt },
        { type: 'image', mime_type: req.image.mimeType, data: req.image.data.toString('base64') },
      ],
      response_format: { type: 'text', mime_type: 'application/json', schema: req.schema },
    }),
    signal: AbortSignal.timeout(env.analysisTimeoutMs),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (env.gemini.debug) console.log(`[gemini ${req.label} ${model}] HTTP`, res.status, JSON.stringify(json?.usage ?? json?.error ?? null));
  if (!res.ok) throw new ProviderError(`gemini ${req.label} ${res.status}: ${JSON.stringify(json?.error ?? json).slice(0, 300)}`, res.status);
  // 뒤에서부터 파싱되는 텍스트를 출력으로 본다 (입력 프롬프트 반사 대비)
  const texts = collectTexts(json).reverse();
  if (!texts.length) throw new ProviderError(`gemini ${req.label}: 응답에 텍스트가 없음`);
  let lastError: unknown;
  for (const text of texts) {
    try {
      return req.parse(text, model);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function analyzeImageJson<T>(req: Request<T>): Promise<{ result: T; latencyMs: number }> {
  const started = performance.now();
  const plan = [env.gemini.analyzeModel, env.gemini.analyzeModel, env.gemini.analyzeFallbackModel].filter(Boolean);
  let lastError: unknown;
  for (const [i, model] of plan.entries()) {
    try {
      const result = await callOnce(model, req);
      return { result, latencyMs: Math.round(performance.now() - started) };
    } catch (err) {
      lastError = err;
      const status = err instanceof ProviderError ? err.status : undefined;
      if (status == null || !RETRYABLE.has(status)) throw err;
      if (i === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastError;
}
