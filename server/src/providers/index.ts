import { env } from '../env';
import { GeminiProvider } from './gemini';
import { MockProvider } from './mock';
import type { ImageProvider } from './types';

// 새 후보는 ImageProvider를 구현해 여기에 추가한다.
let provider: ImageProvider | undefined;

/** AI_MODE에 맞는 이미지 생성 provider */
export function getImageProvider(): ImageProvider {
  provider ??= env.aiMode === 'gemini' ? new GeminiProvider() : new MockProvider();
  return provider;
}

export type { ImageProvider } from './types';
