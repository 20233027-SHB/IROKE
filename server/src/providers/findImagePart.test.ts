import { describe, expect, it } from 'vitest';
import { findImagePart } from './findImagePart';

describe('findImagePart', () => {
  it('Interactions API 형식', () => {
    expect(findImagePart({ steps: [{ content: [{ type: 'text', text: 'hi' }, { type: 'image', data: 'QUJD', mime_type: 'image/png' }] }] }))
      .toEqual({ data: 'QUJD', mimeType: 'image/png' });
  });
  it('Interactions API output_image 형식', () => {
    expect(findImagePart({ id: 'x', output_image: { data: 'QUJD', mime_type: 'image/jpeg' } }))
      .toEqual({ data: 'QUJD', mimeType: 'image/jpeg' });
  });
  it('generateContent 형식', () => {
    expect(findImagePart({ candidates: [{ content: { parts: [{ inlineData: { data: 'QUJD', mimeType: 'image/jpeg' } }] } }] }))
      .toEqual({ data: 'QUJD', mimeType: 'image/jpeg' });
  });
  it('이미지 없음', () => {
    expect(findImagePart({ steps: [{ content: [{ type: 'text', text: 'blocked' }] }] })).toBeNull();
  });
});
