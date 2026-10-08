import { describe, expect, it } from 'vitest';
import { MAX_REQUEST_BODY_BYTES } from '@iroke/shared';
import { bodyBytes, fitsRequestLimit } from './payload';

describe('요청 본문 크기 검사', () => {
  it('한글은 UTF-8 바이트로 센다', () => {
    expect(bodyBytes('{"styleTag":"레이어드컷"}')).toBe(15 + 5 * 3);
  });

  it('상한 이하는 통과, 넘으면 거절', () => {
    expect(fitsRequestLimit('a'.repeat(10), 10)).toBe(true);
    expect(fitsRequestLimit('a'.repeat(11), 10)).toBe(false);
  });

  it('기본 상한은 Vercel 요청 한도(4.5MB)보다 작다', () => {
    expect(MAX_REQUEST_BODY_BYTES).toBeLessThan(4.5 * 1000 * 1000);
    expect(fitsRequestLimit(JSON.stringify({ selfie: 'x'.repeat(MAX_REQUEST_BODY_BYTES) }))).toBe(false);
  });
});
