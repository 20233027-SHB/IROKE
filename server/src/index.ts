import { serve } from '@hono/node-server';
import { createApp } from './app';
import { env } from './env';
import { getImageProvider } from './providers';

const app = createApp();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`IROKE server → http://localhost:${info.port}`);
  console.log(`  AI_MODE=${env.aiMode} · image ${getImageProvider().model} · prompt ${env.promptVersion}`);
  if (env.aiMode === 'gemini') console.log(`  analyze ${env.gemini.analyzeModel} → fallback ${env.gemini.analyzeFallbackModel || '(없음)'}`);
  console.log(`  하루 생성 제한: ${env.generationDailyLimit ?? '없음'} · logs → ${env.logDir}`);
});
