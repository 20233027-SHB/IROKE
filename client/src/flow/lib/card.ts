// 미용사 전달 카드를 Canvas로 그린다. 미리보기와 저장 이미지가 같은 결과가 되도록 한 곳에서만 그린다.
import {
  DAMAGE_LABELS,
  DENSITY_LABELS,
  LENGTH_LABELS,
  TEXTURE_LABELS,
  TREATMENT_LABELS,
  describeToneLevel,
  type HairProfile,
} from '@iroke/shared';
import { loadImage, makeCanvas } from './image';

export interface CardInput {
  after: string;
  before: string;
  styleTag: string;
  profile: HairProfile;
  note: string;
  date: Date;
}

const W = 1080;
const P = 72;
const FONT = 'Inter, "Pretendard Variable", Pretendard, system-ui, sans-serif';
const INK = '#000';
const MUTED = '#6c6c6c';
const LINE = '#dcdcdc';
const FOOTER = 'AI 시안은 참고용이에요. 실제 결과는 모발 상태와 시술 방법에 따라 달라질 수 있어요.';

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`;
const formatDate = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
const formatIso = (iso: string) => iso.replaceAll('-', '.');

export function profileRows(profile: HairProfile): [string, string][] {
  return [
    ['기장', LENGTH_LABELS[profile.length]],
    ['모질', TEXTURE_LABELS[profile.texture]],
    ['숱', DENSITY_LABELS[profile.density]],
    ['손상도', DAMAGE_LABELS[profile.damage] ?? String(profile.damage)],
    ['현재 명도', profile.currentLevel != null ? describeToneLevel(profile.currentLevel).label : '모름'],
  ];
}

export function historyText(profile: HairProfile): string {
  if (!profile.history.length) return '입력한 시술 이력 없음';
  return [...profile.history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => `${TREATMENT_LABELS[t.type]} ${formatIso(t.date)}`)
    .join(' · ');
}

/** 한글은 단어가 길어도 글자 단위로 줄바꿈할 수 있어야 한다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/(\s+)/)) {
      if (ctx.measureText(line + word).width <= maxWidth) {
        line += word;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      for (const ch of word.trimStart()) {
        if (ctx.measureText(line + ch).width > maxWidth && line) {
          lines.push(line);
          line = '';
        }
        line += ch;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function roundedImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  // object-fit: cover
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

function pillLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = font(600, 22);
  const w = ctx.measureText(text).width + 28;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 14, y + 21);
  ctx.textBaseline = 'alphabetic';
}

export async function renderCard(input: CardInput): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(font(700, 40)), document.fonts.load(font(400, 30)), document.fonts.load(`700 40px "Pretendard Variable"`, '가')]).catch(() => undefined);
  const [after, before] = await Promise.all([loadImage(input.after), loadImage(input.before)]);

  // 1) 높이를 정하기 위해 글줄을 먼저 잰다
  const { ctx: measure } = makeCanvas(1, 1);
  const inner = W - P * 2;
  measure.font = font(700, 76);
  const titleLines = wrap(measure, input.styleTag, inner);
  measure.font = font(400, 30);
  const historyLines = wrap(measure, historyText(input.profile), inner);
  measure.font = font(400, 34);
  const noteLines = wrap(measure, input.note.trim() || '-', inner);
  measure.font = font(400, 22);
  const footerLines = wrap(measure, FOOTER, inner);

  const AFTER_W = 620;
  const AFTER_H = Math.round((AFTER_W * 4) / 3);
  const SIDE_X = P + AFTER_W + 28;
  const SIDE_W = W - P - SIDE_X;
  const BEFORE_H = Math.round((SIDE_W * 4) / 3);

  const titleTop = P + 120;
  const imagesTop = titleTop + titleLines.length * 82 + 36;
  const historyTop = imagesTop + AFTER_H + 64;
  const noteTop = historyTop + 44 + historyLines.length * 44 + 48;
  const footerTop = noteTop + 52 + noteLines.length * 52 + 48;
  const H = footerTop + footerLines.length * 34 + P;

  // 2) 그린다
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';

  ctx.font = font(700, 36);
  ctx.fillText('IROKE', P, P + 30);
  ctx.font = font(500, 26);
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  ctx.fillText(formatDate(input.date), W - P, P + 30);
  ctx.textAlign = 'left';
  ctx.fillText('HAIR CARD · 미용사님께 보여 주세요', P, P + 84);

  ctx.fillStyle = INK;
  ctx.font = font(700, 76);
  titleLines.forEach((line, i) => ctx.fillText(line, P, titleTop + 64 + i * 82));

  roundedImage(ctx, after, P, imagesTop, AFTER_W, AFTER_H, 28);
  pillLabel(ctx, 'AI 시안', P + 20, imagesTop + 20);
  roundedImage(ctx, before, SIDE_X, imagesTop, SIDE_W, BEFORE_H, 20);
  pillLabel(ctx, '지금', SIDE_X + 14, imagesTop + 14);

  // 오른쪽 열: 모발 상태
  let y = imagesTop + BEFORE_H + 52;
  for (const [label, value] of profileRows(input.profile)) {
    ctx.font = font(500, 22);
    ctx.fillStyle = MUTED;
    ctx.fillText(label, SIDE_X, y);
    ctx.font = font(700, 28);
    ctx.fillStyle = INK;
    ctx.fillText(wrap(ctx, value, SIDE_W)[0] ?? '', SIDE_X, y + 38);
    y += 84;
  }

  const section = (title: string, top: number) => {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(P, top - 28);
    ctx.lineTo(W - P, top - 28);
    ctx.stroke();
    ctx.font = font(600, 24);
    ctx.fillStyle = MUTED;
    ctx.fillText(title, P, top + 8);
  };

  section('시술 이력', historyTop);
  ctx.font = font(400, 30);
  ctx.fillStyle = INK;
  historyLines.forEach((line, i) => ctx.fillText(line, P, historyTop + 56 + i * 44));

  section('요청 사항', noteTop);
  ctx.font = font(400, 34);
  ctx.fillStyle = INK;
  noteLines.forEach((line, i) => ctx.fillText(line, P, noteTop + 64 + i * 52));

  ctx.font = font(400, 22);
  ctx.fillStyle = MUTED;
  footerLines.forEach((line, i) => ctx.fillText(line, P, footerTop + 26 + i * 34));

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png'));
}
