import type { AiMode } from '@iroke/shared';

export interface ImageBlob {
  data: Buffer;
  mimeType: string;
}

export interface GenerateInput {
  /** 편집 대상 (셀카 또는 기준 시안). 항상 첫 번째 이미지로 전달한다. */
  selfie: ImageBlob;
  /** 헤어 레퍼런스. 두 번째 이미지로 전달한다. */
  reference?: ImageBlob;
  prompt: string;
  /** selfie와 같은 크기의 PNG. 알파 0 = 편집할 영역. supportsMask인 provider만 사용한다. */
  mask?: ImageBlob;
  /** 출력 비율 힌트 (예: "3:4") */
  aspectRatio?: string;
}

export interface GenerateOutput {
  image: ImageBlob;
  /** API 호출 시작 ~ 이미지 수신·디코딩 완료 */
  latencyMs: number;
  model: string;
}

export interface ImageProvider {
  readonly id: AiMode;
  readonly model: string;
  readonly supportsMask: boolean;
  /** 키 등 실행 조건이 갖춰졌는지 */
  available(): boolean;
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

/** 사용자 메시지를 고르기 위한 실패 분류 */
export type ProviderErrorCode = 'generation_failed' | 'no_image' | 'text_only' | 'timeout';

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code: ProviderErrorCode = 'generation_failed',
  ) {
    super(message);
  }
}
