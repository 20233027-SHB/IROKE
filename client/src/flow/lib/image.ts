// 브라우저 이미지 유틸 (검증 레포 client/src/lib/image.ts에서 입력 정규화 부분만 이식)
import { SELFIE_INPUT } from '@iroke/shared';

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 열 수 없음'));
    img.src = src;
  });
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/** 셀카를 설정 비율(3:4)로 가운데 잘라 고정 크기로 줄인다. 비율이 다르면 모델이 구도를 바꾼다. */
export async function normalizeSelfie(file: Blob): Promise<string> {
  const img = await loadImage(await fileToDataUrl(file));
  const { width: W, height: H } = SELFIE_INPUT;
  const target = W / H;
  const src = img.naturalWidth / img.naturalHeight;
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (src > target) {
    sw = sh * target;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = sw / target;
    sy = (img.naturalHeight - sh) / 2;
  }
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  return canvas.toDataURL('image/png');
}

/** 레퍼런스는 비율을 유지한 채 긴 변만 줄인다 */
export async function resizeMaxEdge(file: Blob, maxEdge = SELFIE_INPUT.referenceMaxEdge): Promise<string> {
  const img = await loadImage(await fileToDataUrl(file));
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const { canvas, ctx } = makeCanvas(Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}
