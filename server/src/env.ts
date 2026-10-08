import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PROMPT_VERSION, type AiMode, type PromptVersion } from '@iroke/shared';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(serverRoot, '.env'));
} catch {
  // .env가 없으면 기본값(mock)으로 동작한다
}

const num = (v: string | undefined, fallback: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : fallback);

const aiMode: AiMode = process.env.AI_MODE === 'gemini' ? 'gemini' : 'mock';
const promptVersion: PromptVersion = process.env.PROMPT_VERSION === 'v2' ? 'v2' : DEFAULT_PROMPT_VERSION;

export const env = {
  port: num(process.env.PORT, 8787),
  /** mock = API 비용 없이 전체 플로우 확인, gemini = 실제 분석·생성 */
  aiMode,
  promptVersion,
  /** 사용자(브라우저 ID)별 하루 시안 생성 횟수. 비우면 제한 없음 (정책 미정) */
  generationDailyLimit: process.env.GENERATION_DAILY_LIMIT ? num(process.env.GENERATION_DAILY_LIMIT, 0) : null,
  generationTimeoutMs: num(process.env.GENERATION_TIMEOUT_MS, 60_000),
  analysisTimeoutMs: num(process.env.ANALYSIS_TIMEOUT_MS, 30_000),
  /** 이벤트 로그(JSONL) 위치. 사진은 기록하지 않는다. */
  logDir: path.resolve(serverRoot, process.env.LOG_DIR ?? 'logs'),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL || 'gemini-nano-banana-2.1',
    imageSize: process.env.GEMINI_IMAGE_SIZE || '1K',
    /** 셀카 모발 분석·스타일 추천용 텍스트 모델 */
    analyzeModel: process.env.GEMINI_ANALYZE_MODEL || 'gemini-3.5-flash-lite',
    /** 분석 모델이 과부하일 때 대체 모델 (비우면 사용 안 함) */
    analyzeFallbackModel: process.env.GEMINI_ANALYZE_FALLBACK_MODEL ?? 'gemini-3.8-flash',
    /** 1이면 응답 구조를 콘솔에 출력 (base64는 잘라서) */
    debug: process.env.GEMINI_DEBUG === '1' || process.env.GEMINI_DEBUG === 'full',
  },
  mock: {
    delayMinMs: num(process.env.MOCK_DELAY_MIN_MS, 800),
    delayMaxMs: num(process.env.MOCK_DELAY_MAX_MS, 2500),
  },
};

if (env.aiMode === 'gemini' && !env.gemini.apiKey) {
  throw new Error('AI_MODE=gemini인데 GEMINI_API_KEY가 없습니다. server/.env를 확인하세요.');
}
