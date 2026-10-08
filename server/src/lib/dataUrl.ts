import type { ImageBlob } from '../providers/types';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** data URL → 이미지 바이트. 허용 형식(png/jpeg/webp)이 아니면 null. */
export function parseImageDataUrl(value: unknown): ImageBlob | null {
  if (typeof value !== 'string') return null;
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(value);
  if (!m || !ALLOWED_MIME.has(m[1]!)) return null;
  const data = Buffer.from(m[2]!, 'base64');
  return data.length ? { mimeType: m[1]!, data } : null;
}

export function toDataUrl(image: ImageBlob): string {
  return `data:${image.mimeType};base64,${image.data.toString('base64')}`;
}
