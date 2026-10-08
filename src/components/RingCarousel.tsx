import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { computeRingGeometry, ringTransform, sliceTransform, wrapDeg } from '../lib/ringGeometry';
import { useRingRotation } from '../hooks/useRingRotation';

export interface RingImage {
  src: string;
  alt: string;
}

interface RingCarouselProps {
  images: RingImage[];
  cards?: number;
  /** Vertical strips per card. 1 = flat cards. */
  slices?: number;
  cardW?: number;
  cardH?: number;
  gapDeg?: number;
  perspective?: number;
  tiltZ?: number;
  tiltX?: number;
  /** deg/sec */
  autoSpeed?: number;
  radius?: number;
  label?: string;
}

/** Shown under each image, and on its own when the image is missing. Stripes make slice seams easy to spot. */
const PLACEHOLDERS: [string, string][] = [
  ['#f4b8a8', '#c2410c'],
  ['#c7d2fe', '#3730a3'],
  ['#bbf7d0', '#166534'],
  ['#fde68a', '#b45309'],
  ['#e9d5ff', '#7e22ce'],
  ['#cbd5e1', '#1e293b'],
];

const CORNER = 16;

/** Ring scale for the container size: 0.9 at a 1440×900 desktop. */
function ringScale(w: number, h: number): number {
  const base = w < 720 ? Math.min(w / 800, h / 1100) : Math.min(w / 1600, h / 980);
  return Math.max(0.36, Math.min(1.25, base));
}

export function RingCarousel({
  images,
  cards = 12,
  slices = 6,
  cardW = 360,
  cardH = 450,
  gapDeg = 4,
  perspective = 730,
  tiltZ = -18,
  tiltX = -18,
  autoSpeed = 6,
  radius,
  label = 'Latest projects',
}: RingCarouselProps) {
  const geometry = useMemo(() => {
    const g = computeRingGeometry({ cards, slices, cardW, gapDeg });
    return radius ? { ...g, radius } : g;
  }, [cards, slices, cardW, gapDeg, radius]);

  const viewportRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);

  // Responsive scale: written straight to a CSS variable, no re-render.
  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      scaleRef.current = ringScale(width, height);
      stage.style.setProperty('--ring-scale', String(scaleRef.current));
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  const buildTransform = useCallback(
    (angle: number) => ringTransform(geometry.radius, tiltX, tiltZ, angle),
    [geometry.radius, tiltX, tiltZ],
  );

  const { step, pointerHandlers } = useRingRotation({
    ringRef,
    buildTransform,
    autoSpeed,
    tiltZ,
    stepDeg: geometry.pitch,
    // Front card follows the pointer: arc length per degree is R·π/180, times the stage scale.
    getDegPerPx: () => 180 / (Math.PI * geometry.radius * scaleRef.current),
  });

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowLeft') step(1);
    else if (e.key === 'ArrowRight') step(-1);
    else return;
    e.preventDefault();
  };

  const { sliceW } = geometry;
  const sliceCount = geometry.slices;

  return (
    <section
      ref={viewportRef}
      className="ring-viewport"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      {...pointerHandlers}
    >
      <div
        ref={stageRef}
        className="ring-stage"
        style={{ perspective: `${perspective}px` }}
      >
        <div
          ref={ringRef}
          className="ring"
          style={{ transform: buildTransform(0) }}
        >
          {Array.from({ length: cards }, (_, i) => {
            const image = images[i % images.length];
            const [from, to] = PLACEHOLDERS[i % PLACEHOLDERS.length];
            const facingFront = Math.abs(wrapDeg(i * geometry.pitch)) <= 90;
            return (
              <div key={i} className="ring-card" role="img" aria-label={image?.alt ?? `Project ${i + 1}`}>
                {Array.from({ length: sliceCount }, (_, j) => {
                  const first = j === 0;
                  const last = j === sliceCount - 1;
                  const offset = -j * sliceW;
                  const style: CSSProperties = {
                    // +1px overlap hides the seam to the next slice; the last one has no neighbour.
                    width: last ? sliceW : sliceW + 1,
                    height: cardH,
                    left: -sliceW / 2,
                    top: -cardH / 2,
                    transformOrigin: `${sliceW / 2}px 50%`,
                    transform: sliceTransform(i, j, geometry),
                    borderRadius: `${first ? CORNER : 0}px ${last ? CORNER : 0}px ${last ? CORNER : 0}px ${first ? CORNER : 0}px`,
                    backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 14px, transparent 14px 28px), linear-gradient(160deg, ${from}, ${to})`,
                    backgroundSize: `${cardW}px ${cardH}px`,
                    backgroundPosition: `${offset}px 0`,
                  };
                  return (
                    <div key={j} className="ring-slice" style={style} aria-hidden="true">
                      {image && (
                        <img
                          src={image.src}
                          alt=""
                          width={cardW}
                          height={cardH}
                          loading={facingFront ? 'eager' : 'lazy'}
                          decoding="async"
                          draggable={false}
                          style={{ left: offset }}
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden';
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
