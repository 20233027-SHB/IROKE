import { env } from '../env';
import type { GenerateInput, GenerateOutput, ImageProvider } from './types';

/** 입력 셀카를 그대로 돌려주는 개발용 provider. API 비용 없이 플로우를 확인할 때 쓴다. */
export class MockProvider implements ImageProvider {
  readonly id = 'mock' as const;
  readonly model = 'mock-echo';
  readonly supportsMask = false;

  available() {
    return true;
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const started = performance.now();
    await mockDelay();
    return { image: input.selfie, latencyMs: Math.round(performance.now() - started), model: this.model };
  }
}

export function mockDelay() {
  const { delayMinMs, delayMaxMs } = env.mock;
  const delay = delayMinMs + Math.random() * Math.max(0, delayMaxMs - delayMinMs);
  return new Promise((r) => setTimeout(r, delay));
}
