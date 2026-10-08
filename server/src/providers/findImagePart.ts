/**
 * 응답 JSON에서 첫 번째 base64 이미지 조각을 찾는다.
 * Interactions API(output_image 또는 {type:'image', data, mime_type})와 generateContent({inlineData:{data, mimeType}}) 형식을 모두 처리한다.
 */
export function findImagePart(node: unknown): { data: string; mimeType?: string } | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findImagePart(child);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  // Interactions API 응답의 최종 이미지 (interaction.output_image.data)
  const output = obj.output_image as Record<string, unknown> | undefined;
  if (output && typeof output.data === 'string') {
    return { data: output.data, mimeType: (output.mime_type ?? output.mimeType) as string | undefined };
  }
  if (obj.type === 'image' && typeof obj.data === 'string') {
    return { data: obj.data, mimeType: (obj.mime_type ?? obj.mimeType) as string | undefined };
  }
  const inline = (obj.inlineData ?? obj.inline_data) as Record<string, unknown> | undefined;
  if (inline && typeof inline.data === 'string') {
    return { data: inline.data, mimeType: (inline.mimeType ?? inline.mime_type) as string | undefined };
  }
  for (const value of Object.values(obj)) {
    const found = findImagePart(value);
    if (found) return found;
  }
  return null;
}

/**
 * 응답 JSON의 텍스트 조각을 모두 모은다 (output_text, {type:'text', text}, parts[].text).
 * 사고(thought) 블록과 usage는 건너뛴다. 입력 프롬프트가 함께 들어올 수 있으므로 호출부에서 골라 쓴다.
 */
export function collectTexts(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) collectTexts(child, out);
    return out;
  }
  const obj = node as Record<string, unknown>;
  if (obj.thought === true || obj.type === 'thought') return out;
  if (typeof obj.output_text === 'string') out.push(obj.output_text);
  if ((obj.type === 'text' || obj.type === undefined) && typeof obj.text === 'string') out.push(obj.text);
  for (const [key, value] of Object.entries(obj)) {
    if (key !== 'usage' && key !== 'output_text' && key !== 'text') collectTexts(value, out);
  }
  return out;
}
