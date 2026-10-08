import { randomUUID } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  SELFIE_INPUT,
  buildPrompt,
  type ApiError,
  type ApiErrorCode,
  type GenerationResponse,
  type StatusResponse,
} from '@iroke/shared';
import { analyzers } from './analysis';
import { env } from './env';
import { parseImageDataUrl, toDataUrl } from './lib/dataUrl';
import { createDailyLimiter } from './lib/limit';
import { logEvent } from './lib/log';
import { parseProfile, parseProfileSource, parseStyleSource, sanitizeStyleTag } from './lib/validate';
import { getImageProvider } from './providers';
import { ProviderError } from './providers/types';

type Env = { Variables: { clientId: string } };

/** 셀카(PNG 768×1024)와 레퍼런스 2장이 넉넉히 들어가는 크기 */
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const CLIENT_ID = /^[0-9a-f-]{36}$/i;

const fail = (c: Context, status: ContentfulStatusCode, code: ApiErrorCode, error: string) =>
  c.json<ApiError>({ code, error }, status);

const readJson = (c: Context) => c.req.json<Record<string, unknown>>().catch(() => null);

export function createApp() {
  const limiter = createDailyLimiter(env.generationDailyLimit);
  const app = new Hono<Env>().basePath('/api');

  app.use(bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => fail(c, 413, 'payload_too_large', '요청이 너무 큼') }));
  // 로그인 전까지는 브라우저별 임의 ID로 사용자를 구분한다
  app.use(async (c, next) => {
    const id = c.req.header('x-iroke-client-id') ?? '';
    c.set('clientId', CLIENT_ID.test(id) ? id.toLowerCase() : 'anonymous');
    await next();
  });
  app.onError((err, c) => {
    console.error(err);
    return fail(c, 500, 'server_error', err.message);
  });

  app.get('/health', (c) => c.json({ ok: true }));
  app.get('/status', (c) => c.json<StatusResponse>({ mode: env.aiMode, promptVersion: env.promptVersion }));

  /** 셀카 모발 분석: 기장·모질·숱·손상도·현재 명도 추정 (사용자 확인용 초안) */
  app.post('/analysis/hair', async (c) => {
    const image = parseImageDataUrl((await readJson(c))?.image);
    if (!image) return fail(c, 400, 'bad_request', 'image(data URL)가 필요함');
    try {
      const analysis = await analyzers.hair(image);
      void logEvent('hair_analysis', { clientId: c.get('clientId'), analysis });
      return c.json(analysis);
    } catch (err) {
      void logEvent('hair_analysis_failed', { clientId: c.get('clientId'), error: (err as Error).message });
      return fail(c, 502, 'analysis_failed', (err as Error).message);
    }
  });

  /** 레퍼런스 사진에서 스타일명 3개 추천 */
  app.post('/analysis/style', async (c) => {
    const image = parseImageDataUrl((await readJson(c))?.image);
    if (!image) return fail(c, 400, 'bad_request', 'image(data URL)가 필요함');
    try {
      const analysis = await analyzers.style(image);
      void logEvent('style_analysis', { clientId: c.get('clientId'), analysis });
      return c.json(analysis);
    } catch (err) {
      void logEvent('style_analysis_failed', { clientId: c.get('clientId'), error: (err as Error).message });
      return fail(c, 502, 'analysis_failed', (err as Error).message);
    }
  });

  /** 확정 프로필 기록: AI 원본 추정값 + 사용자가 고친 항목 (정확도 집계·파인튜닝용) */
  app.post('/profile-confirmations', async (c) => {
    const body = await readJson(c);
    const profile = parseProfile(body?.profile);
    const profileSource = parseProfileSource(body?.profileSource);
    if (!profile || !profileSource) return fail(c, 400, 'bad_request', 'profile·profileSource 형식이 올바르지 않음');
    await logEvent('profile_confirmed', { clientId: c.get('clientId'), profile, profileSource });
    return c.body(null, 204);
  });

  /** 시안 생성. 프롬프트는 서버에서 만든다 (클라이언트가 임의 프롬프트를 보낼 수 없음). 자동 재시도 없음. */
  app.post('/generations', async (c) => {
    const body = await readJson(c);
    const selfie = parseImageDataUrl(body?.selfie);
    const reference = parseImageDataUrl(body?.reference);
    const profile = parseProfile(body?.profile);
    const styleTag = sanitizeStyleTag(body?.styleTag);
    const styleSource = parseStyleSource(body?.styleSource);
    if (!selfie || !reference || !profile || !styleTag || !styleSource) {
      return fail(c, 400, 'bad_request', 'selfie·reference·profile·styleTag·styleSource 형식이 올바르지 않음');
    }
    const profileSource = parseProfileSource(body?.profileSource);
    if (!profileSource) return fail(c, 400, 'profile_not_confirmed', '모발 프로필 확인 단계를 거치지 않음');

    const clientId = c.get('clientId');
    if (!limiter.allows(clientId)) return fail(c, 429, 'limit_reached', '오늘 생성 횟수를 모두 사용함');

    const { text: prompt, promptVersion } = buildPrompt(profile, styleTag, { task: 'style', hasReference: true }, env.promptVersion);
    const provider = getImageProvider();
    const generationId = randomUUID();
    const record = { generationId, clientId, mode: env.aiMode, model: provider.model, promptVersion, styleTag, styleSource, profile, profileSource };
    limiter.record(clientId);

    try {
      // 이미지 입력 순서: 1) 셀카 2) 레퍼런스. 셀카와 같은 3:4 비율을 요청해야 구도가 유지된다.
      const out = await provider.generate({ selfie, reference, prompt, aspectRatio: SELFIE_INPUT.aspectRatio });
      void logEvent('generation', { ...record, model: out.model, status: 'done', latencyMs: out.latencyMs });
      return c.json<GenerationResponse>({
        generationId,
        image: toDataUrl(out.image),
        model: out.model,
        promptVersion,
        latencyMs: out.latencyMs,
      });
    } catch (err) {
      const code = err instanceof ProviderError ? err.code : 'generation_failed';
      void logEvent('generation', { ...record, status: 'failed', errorCode: code, error: (err as Error).message });
      return fail(c, code === 'timeout' ? 504 : 502, code, (err as Error).message);
    }
  });

  /** 클라이언트 측 end-to-end 시간 기록 */
  app.patch('/generations/:generationId', async (c) => {
    const clientLatencyMs = (await readJson(c))?.clientLatencyMs;
    if (typeof clientLatencyMs !== 'number' || !Number.isFinite(clientLatencyMs) || clientLatencyMs < 0) {
      return fail(c, 400, 'bad_request', 'clientLatencyMs가 필요함');
    }
    await logEvent('generation_client_latency', {
      generationId: c.req.param('generationId'),
      clientId: c.get('clientId'),
      clientLatencyMs: Math.round(clientLatencyMs),
    });
    return c.body(null, 204);
  });

  return app;
}
