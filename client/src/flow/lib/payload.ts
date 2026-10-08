// 요청 본문 크기 사전 검사. 상한을 넘으면 Vercel이 함수에 닿기 전에 거절해서 JSON 오류조차 받을 수 없다.
import { MAX_REQUEST_BODY_BYTES } from '@iroke/shared';

/** 직렬화된 본문의 UTF-8 바이트 수 */
export const bodyBytes = (json: string) => new TextEncoder().encode(json).length;

export const fitsRequestLimit = (json: string, limit = MAX_REQUEST_BODY_BYTES) => bodyBytes(json) <= limit;
