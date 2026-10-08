import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { toRad } from '../lib/ringGeometry';

interface RingRotationOptions {
  /** Element whose `style.transform` is written every frame. */
  ringRef: RefObject<HTMLElement | null>;
  /** Builds the full ring transform for a rotation angle (deg). */
  buildTransform: (angle: number) => string;
  /** Auto-rotation speed (deg/sec). */
  autoSpeed: number;
  /** Rotation per pointer pixel (deg/px). Read lazily so it can follow the responsive scale. */
  getDegPerPx: () => number;
  /** In-plane tilt of the ring (deg); drag is measured along the tilted ring axis. */
  tiltZ: number;
  /** Angle of one keyboard step (deg). */
  stepDeg: number;
}

/** How fast velocity eases back to the auto speed after a release (1/sec). Lower = longer glide. */
const RETURN_RATE = 1.4;
/** How fast a keyboard step is consumed (1/sec). */
const STEP_RATE = 7;
/** A release this long after the last move counts as a stop, not a flick (ms). */
const FLICK_WINDOW = 90;
const MAX_VELOCITY = 720;

interface RotationState {
  angle: number;
  velocity: number;
  pendingStep: number;
  dragging: boolean;
  pointerId: number;
  lastX: number;
  lastY: number;
  lastT: number;
  reducedMotion: boolean;
}

/**
 * Drives the ring with requestAnimationFrame. The only per-frame DOM write is the
 * ring wrapper's `style.transform`; nothing here triggers a React re-render.
 */
export function useRingRotation(options: RingRotationOptions) {
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const state = useRef<RotationState>({
    angle: 0,
    velocity: options.autoSpeed,
    pendingStep: 0,
    dragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    reducedMotion: false,
  });

  useEffect(() => {
    const s = state.current;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      s.reducedMotion = motionQuery.matches;
      if (s.reducedMotion) s.velocity = 0;
    };
    syncMotion();

    let raf = 0;
    let lastFrame = 0;

    const frame = (now: number) => {
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      const { autoSpeed, buildTransform } = optionsRef.current;

      if (!s.dragging) {
        const target = s.reducedMotion ? 0 : autoSpeed;
        s.velocity += (target - s.velocity) * (1 - Math.exp(-dt * RETURN_RATE));
        s.angle += s.velocity * dt;

        if (s.pendingStep !== 0) {
          let step = s.pendingStep * (1 - Math.exp(-dt * STEP_RATE));
          if (Math.abs(s.pendingStep - step) < 0.01) step = s.pendingStep;
          s.angle += step;
          s.pendingStep -= step;
        }
      }

      s.angle %= 360;
      const el = optionsRef.current.ringRef.current;
      if (el) el.style.transform = buildTransform(s.angle);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) return;
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    motionQuery.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) start();

    return () => {
      stop();
      motionQuery.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const s = state.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragging = '';
    s.dragging = true;
    s.pointerId = e.pointerId;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = e.timeStamp;
    s.velocity = 0;
    s.pendingStep = 0;
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const s = state.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    const { getDegPerPx, tiltZ } = optionsRef.current;

    // Project the pointer delta onto the ring's tilted horizontal axis.
    const t = toRad(tiltZ);
    const along = (e.clientX - s.lastX) * Math.cos(t) + (e.clientY - s.lastY) * Math.sin(t);
    const dDeg = along * getDegPerPx();
    const dt = (e.timeStamp - s.lastT) / 1000;

    s.angle += dDeg;
    if (dt > 0) {
      const instant = dDeg / dt;
      s.velocity = s.velocity * 0.6 + instant * 0.4;
    }
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = e.timeStamp;
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const s = state.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    s.dragging = false;
    s.pointerId = -1;
    delete e.currentTarget.dataset.dragging;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (e.timeStamp - s.lastT > FLICK_WINDOW) s.velocity = 0;
    s.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, s.velocity));
  }, []);

  /** Rotate by whole cards (+1 / -1). */
  const step = useCallback((dir: number) => {
    state.current.pendingStep += dir * optionsRef.current.stepDeg;
  }, []);

  return {
    step,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
