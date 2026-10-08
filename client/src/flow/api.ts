// 서버 API 호출. API 키는 서버에만 있고, 브라우저는 항상 /api를 거친다.
import type {
  AnalyzeRequest,
  ApiError,
  GenerationRequest,
  GenerationResponse,
  GenerationTimingRequest,
  HairAnalysis,
  ProfileConfirmationRequest,
  StatusResponse,
  StyleAnalysis,
} from '@iroke/shared';
import type { ClientErrorCode } from './lib/messages';
import { fitsRequestLimit } from './lib/payload';
import { getClientId } from './lib/storage';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: ClientErrorCode,
    readonly status?: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined && !fitsRequestLimit(payload)) {
    throw new ApiRequestError('요청 본문이 상한을 넘음', 'payload_too_large');
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-iroke-client-id': getClientId() },
      body: payload,
      signal,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'AbortError') throw err;
    if (name === 'TimeoutError') throw new ApiRequestError('응답 시간 초과', 'timeout');
    throw new ApiRequestError('네트워크 오류', 'network');
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) {
    const err = json as ApiError | null;
    // Vercel이 함수 앞에서 거절한 413은 JSON 본문이 없다
    const code = err?.code ?? (res.status === 413 ? 'payload_too_large' : 'server_error');
    throw new ApiRequestError(err?.error ?? `HTTP ${res.status}`, code, res.status);
  }
  return json as T;
}

/** 서버 타임아웃(60초)보다 조금 길게 기다린다 */
const GENERATION_CLIENT_TIMEOUT_MS = 75_000;

export const api = {
  status: () => request<StatusResponse>('GET', '/status'),
  analyzeHair: (image: string, signal?: AbortSignal) =>
    request<HairAnalysis>('POST', '/analysis/hair', { image } satisfies AnalyzeRequest, signal),
  analyzeStyle: (image: string, signal?: AbortSignal) =>
    request<StyleAnalysis>('POST', '/analysis/style', { image } satisfies AnalyzeRequest, signal),
  confirmProfile: (body: ProfileConfirmationRequest) => request<void>('POST', '/profile-confirmations', body),
  generate: (body: GenerationRequest) =>
    request<GenerationResponse>('POST', '/generations', body, AbortSignal.timeout(GENERATION_CLIENT_TIMEOUT_MS)),
  reportTiming: (generationId: string, body: GenerationTimingRequest) =>
    request<void>('PATCH', `/generations/${encodeURIComponent(generationId)}`, body),
};
