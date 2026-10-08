import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { DEFAULT_PROMPT_VERSION, type PromptVersion, type StatusResponse } from '@iroke/shared';
import { ApiRequestError, api } from './api';
import { loadImage } from './lib/image';
import type { ClientErrorCode } from './lib/messages';
import { flowReducer, initialFlowState, inputKey, type FlowAction, type FlowState, type Generation } from './lib/state';
import { session } from './lib/storage';

// 진행 상황은 이 탭(sessionStorage)에만 둔다. 탭을 닫으면 사진과 결과가 함께 사라진다.
const KEY = 'iroke.flow';
const SELFIE_KEY = `${KEY}.selfie`;
const REFERENCE_KEY = `${KEY}.reference`;
const GEN_PREFIX = `${KEY}.gen.`;

type StoredState = Omit<FlowState, 'selfie' | 'reference' | 'generations'> & { generations: Omit<Generation, 'image'>[] };

function restore(): FlowState {
  const raw = session.get(KEY);
  if (!raw) return initialFlowState;
  try {
    const stored = JSON.parse(raw) as StoredState;
    const selfie = session.get(SELFIE_KEY) ?? undefined;
    const reference = session.get(REFERENCE_KEY) ?? undefined;
    const generations = stored.generations.flatMap((g) => {
      const image = session.get(GEN_PREFIX + g.generationId);
      return image ? [{ ...g, image }] : [];
    });
    return {
      ...initialFlowState,
      ...stored,
      selfie,
      selfieId: selfie ? stored.selfieId : undefined,
      reference,
      referenceId: reference ? stored.referenceId : undefined,
      generations,
    };
  } catch {
    return initialFlowState;
  }
}

/** 큰 이미지는 바뀔 때만 따로 쓴다. 용량 초과면 건너뛴다 (새로고침하면 그 단계부터 다시). */
function usePersist(state: FlowState) {
  const prev = useRef<FlowState | null>(null);
  useEffect(() => {
    const { selfie, reference, generations, ...rest } = state;
    session.set(KEY, JSON.stringify({ ...rest, generations: generations.map(({ image: _image, ...g }) => g) }));

    const writeImage = (key: string, value: string | undefined, before: string | undefined) => {
      if (value === before) return;
      if (!value) session.remove(key);
      else if (!session.set(key, value)) console.warn(`[flow] 저장 공간이 부족해 ${key}를 저장하지 못함`);
    };
    writeImage(SELFIE_KEY, selfie, prev.current?.selfie);
    writeImage(REFERENCE_KEY, reference, prev.current?.reference);

    const ids = new Set(generations.map((g) => g.generationId));
    for (const g of generations) {
      if (!prev.current?.generations.some((p) => p.generationId === g.generationId)) writeImage(GEN_PREFIX + g.generationId, g.image, undefined);
    }
    for (const key of session.keys(GEN_PREFIX)) if (!ids.has(key.slice(GEN_PREFIX.length))) session.remove(key);
    prev.current = state;
  }, [state]);
}

interface GenerationJob {
  key: string;
  startedAt: number;
}

interface FlowContextValue {
  state: FlowState;
  dispatch: Dispatch<FlowAction>;
  status?: StatusResponse;
  statusError: boolean;
  retryStatus: () => void;
  promptVersion: PromptVersion;
  /** 진행 중인 시안 생성 */
  job: GenerationJob | null;
  jobError: { key: string; code: ClientErrorCode } | null;
  /** 현재 입력으로 시안을 만든다. 자동 재시도는 하지 않는다. */
  startGeneration: () => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, undefined, restore);
  usePersist(state);

  const [status, setStatus] = useState<StatusResponse>();
  const [statusError, setStatusError] = useState(false);
  const [statusAttempt, setStatusAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setStatusError(false);
    api
      .status()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatusError(true));
    return () => {
      alive = false;
    };
  }, [statusAttempt]);

  const promptVersion = status?.promptVersion ?? state.generations[0]?.promptVersion ?? DEFAULT_PROMPT_VERSION;

  const stateRef = useRef(state);
  stateRef.current = state;
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [jobError, setJobError] = useState<FlowContextValue['jobError']>(null);
  const running = useRef(false);

  const startGeneration = useCallback(async () => {
    const s = stateRef.current;
    const key = inputKey(s, promptVersion);
    if (running.current || !key || !s.selfie || !s.reference || !s.profile || !s.profileSource || !s.styleTag || !s.styleSource) return;
    running.current = true;
    const started = performance.now();
    setJobError(null);
    setJob({ key, startedAt: Date.now() });
    try {
      const res = await api.generate({
        selfie: s.selfie,
        reference: s.reference,
        styleTag: s.styleTag,
        profile: s.profile,
        profileSource: s.profileSource,
        styleSource: s.styleSource,
      });
      // 표시 가능한 상태까지를 end-to-end 시간으로 잰다
      await loadImage(res.image)
        .then((img) => img.decode())
        .catch(() => undefined);
      const clientLatencyMs = Math.round(performance.now() - started);
      const { image, generationId, model, latencyMs } = res;
      dispatch({
        type: 'addGeneration',
        generation: { key: inputKey(s, res.promptVersion) ?? key, generationId, image, model, promptVersion: res.promptVersion, latencyMs, createdAt: new Date().toISOString() },
      });
      api.reportTiming(generationId, { clientLatencyMs }).catch(() => undefined);
    } catch (err) {
      setJobError({ key, code: err instanceof ApiRequestError ? err.code : 'generation_failed' });
    } finally {
      running.current = false;
      setJob(null);
    }
  }, [promptVersion]);

  const value = useMemo<FlowContextValue>(
    () => ({
      state,
      dispatch,
      status,
      statusError,
      retryStatus: () => setStatusAttempt((n) => n + 1),
      promptVersion,
      job,
      jobError,
      startGeneration: () => void startGeneration(),
    }),
    [state, status, statusError, promptVersion, job, jobError, startGeneration],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow는 FlowProvider 안에서만 쓸 수 있음');
  return ctx;
}
