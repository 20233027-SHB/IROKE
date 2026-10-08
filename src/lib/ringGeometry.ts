/**
 * Pure geometry for the cylinder ring carousel.
 *
 * The ring is one big cylinder. Each card is a patch on its surface, cut into
 * `slices` vertical strips that sit tangent to the cylinder, so the card reads
 * as curved. With `slices = 1` every card is a flat panel.
 */

export const toRad = (deg: number) => (deg * Math.PI) / 180;

export interface RingGeometryInput {
  cards: number;
  slices: number;
  cardW: number;
  gapDeg: number;
}

export interface RingGeometry {
  /** Angle between neighbouring card centres (deg). */
  pitch: number;
  /** Angle covered by one card (deg). */
  cardAngle: number;
  /** Cylinder radius (px): card width ≈ arc length. */
  radius: number;
  /** Angle covered by one slice (deg). */
  sliceAngle: number;
  /** Width of one slice (px). */
  sliceW: number;
  slices: number;
}

export function computeRingGeometry({ cards, slices, cardW, gapDeg }: RingGeometryInput): RingGeometry {
  const sliceCount = Math.max(1, Math.round(slices));
  const pitch = 360 / cards;
  const cardAngle = pitch - gapDeg;
  if (cardAngle <= 0) {
    throw new Error(`gapDeg (${gapDeg}) must be smaller than the card pitch (${pitch})`);
  }
  return {
    pitch,
    cardAngle,
    radius: cardW / toRad(cardAngle),
    sliceAngle: cardAngle / sliceCount,
    sliceW: cardW / sliceCount,
    slices: sliceCount,
  };
}

/** Angle (deg) of slice `j` of card `i` around the cylinder axis. */
export function slicePhi(i: number, j: number, g: RingGeometry): number {
  return i * g.pitch + (j - (g.slices - 1) / 2) * g.sliceAngle;
}

export function sliceTransform(i: number, j: number, g: RingGeometry): string {
  return `rotateY(${slicePhi(i, j, g)}deg) translateZ(${g.radius}px)`;
}

/** Transform of the ring wrapper. Pulls the cylinder back by R so the front card sits near z = 0. */
export function ringTransform(radius: number, tiltX: number, tiltZ: number, angle: number): string {
  return `translateZ(${-radius}px) rotateX(${tiltX}deg) rotateZ(${tiltZ}deg) rotateY(${angle}deg)`;
}

/** Signed angle in (-180, 180]. */
export function wrapDeg(deg: number): number {
  const a = ((deg % 360) + 360) % 360;
  return a > 180 ? a - 360 : a;
}
