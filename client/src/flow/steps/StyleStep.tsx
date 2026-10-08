import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiRequestError, api } from '../api';
import { useFlow } from '../FlowProvider';
import { analysisMessage, type ClientErrorCode } from '../lib/messages';
import { once } from '../lib/once';
import { ConfidenceTag } from '../ui/controls';
import { FlowLayout } from '../ui/FlowLayout';

const STYLE_TAG_MAX = 30;
type Choice = number | 'custom';

export function StyleStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const { reference, styleAnalysis, styleSource } = state;
  const suggestions = styleAnalysis?.suggestions ?? [];

  const [phase, setPhase] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<ClientErrorCode>('analysis_failed');
  const [attempt, setAttempt] = useState(0);
  // 이전에 고른 값이 있으면 복원, 없으면 1순위
  const [choice, setChoice] = useState<Choice | undefined>(
    styleSource?.chosen === 'custom' ? 'custom' : styleSource?.suggestionIndex,
  );
  const [custom, setCustom] = useState(styleSource?.chosen === 'custom' ? (state.styleTag ?? '') : '');

  // 같은 레퍼런스는 한 번만 요청한다
  useEffect(() => {
    if (styleAnalysis || !reference) return;
    let alive = true;
    setPhase('loading');
    once(`style:${state.referenceId}:${attempt}`, () => api.analyzeStyle(reference))
      .then((a) => {
        if (!alive) return;
        dispatch({ type: 'setStyleAnalysis', styleAnalysis: a });
        setPhase('idle');
      })
      .catch((err: Error) => {
        if (!alive) return;
        setErrorCode(err instanceof ApiRequestError ? err.code : 'analysis_failed');
        setPhase('error');
        setChoice('custom');
      });
    return () => {
      alive = false;
    };
  }, [styleAnalysis, reference, state.referenceId, attempt, dispatch]);

  const selected: Choice | undefined = choice ?? (suggestions.length ? 0 : undefined);
  const tag = selected === 'custom' ? custom.trim() : selected != null ? suggestions[selected]?.tag : undefined;

  const next = () => {
    if (!tag) return;
    dispatch({
      type: 'chooseStyle',
      styleTag: tag,
      styleSource:
        selected === 'custom'
          ? { analysis: styleAnalysis, chosen: 'custom' }
          : { analysis: styleAnalysis, chosen: 'suggestion', suggestionIndex: selected as number },
    });
    navigate('/flow/generate');
  };

  return (
    <FlowLayout
      step={3}
      badge="Step 4 · Style"
      title="미용실에서 부를 스타일 이름을 골라 주세요"
      lead="레퍼런스 사진에 가장 가까운 순서로 추천했어요. 원하는 이름이 없으면 직접 입력해 주세요."
      actions={
        <>
          <Link className="pill pill--ghost pill--lg pill--back" to="/flow/reference">
            이전
          </Link>
          <button type="button" className="pill pill--lg" disabled={!tag} onClick={next}>
            다음 <span className="pill__arrow" aria-hidden="true">→</span>
          </button>
        </>
      }
    >
      {reference && <img className="reference-thumb" src={reference} alt="올린 레퍼런스 사진" />}

      {phase === 'loading' && (
        <div className="loading loading--inline" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>헤어스타일을 읽고 있어요</p>
        </div>
      )}
      {phase === 'error' && (
        <div className="notice notice--error" role="alert">
          <p>{analysisMessage(errorCode)} 스타일 이름을 직접 입력해서 진행할 수 있어요.</p>
          <div className="notice__actions">
            <button type="button" className="pill pill--ghost" onClick={() => setAttempt((n) => n + 1)}>
              다시 추천받기
            </button>
          </div>
        </div>
      )}

      <div className="options" role="radiogroup" aria-label="스타일 이름">
        {suggestions.map((s, i) => (
          <label key={s.tag} className="option">
            <input type="radio" className="visually-hidden" name="style" checked={selected === i} onChange={() => setChoice(i)} />
            <span className="option__rank" aria-hidden="true">
              {i + 1}
            </span>
            <span className="option__body">
              <strong>{s.tag}</strong>
              <span>{s.description}</span>
            </span>
            <ConfidenceTag confidence={s.confidence} />
          </label>
        ))}
        {phase !== 'loading' && (
          <label className="option option--custom">
            <input type="radio" className="visually-hidden" name="style" checked={selected === 'custom'} onChange={() => setChoice('custom')} />
            <span className="option__rank" aria-hidden="true">
              +
            </span>
            <span className="option__body">
              <strong>직접 입력</strong>
              <input
                className="text-input"
                type="text"
                value={custom}
                maxLength={STYLE_TAG_MAX}
                placeholder="예: 레이어드 C컬펌"
                aria-label="스타일 이름 직접 입력"
                onFocus={() => setChoice('custom')}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setChoice('custom');
                }}
              />
            </span>
          </label>
        )}
      </div>
    </FlowLayout>
  );
}
