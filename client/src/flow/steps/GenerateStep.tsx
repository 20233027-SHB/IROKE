import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useFlow } from '../FlowProvider';
import { historyText, profileRows } from '../lib/card';
import { generationMessage } from '../lib/messages';
import { currentGeneration, inputKey } from '../lib/state';
import { BeforeAfter } from '../ui/BeforeAfter';
import { FlowLayout } from '../ui/FlowLayout';

/** 가짜 퍼센트 대신 경과 시간과 단계 문구로 진행감을 준다 */
function stageText(seconds: number) {
  if (seconds < 3) return '사진과 모발 조건을 보내고 있어요';
  if (seconds < 12) return '내 모발 조건에 맞춰 헤어를 합성하고 있어요';
  if (seconds < 20) return '마무리하고 있어요';
  return '평소보다 오래 걸리고 있어요. 조금만 기다려 주세요';
}

function useElapsed(startedAt: number | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

export function GenerateStep() {
  const { state, status, statusError, retryStatus, promptVersion, job, jobError, startGeneration } = useFlow();
  const navigate = useNavigate();
  const key = inputKey(state, promptVersion);
  const result = currentGeneration(state, promptVersion);
  const pending = Boolean(job);
  const error = jobError && jobError.key === key ? jobError : null;
  const elapsed = useElapsed(job?.startedAt);
  const { selfie, reference, profile, styleTag } = state;
  if (!selfie || !reference || !profile || !styleTag) return null;

  const back = (
    <Link className="pill pill--ghost pill--lg pill--back" to="/flow/style">
      이전
    </Link>
  );

  if (pending) {
    return (
      <FlowLayout
        step={4}
        badge="Step 5 · AI hair"
        title="AI가 헤어를 시술하고 있어요"
        lead="얼굴·표정·배경은 그대로 두고 헤어만 바꿔요."
        actions={
          <button type="button" className="pill pill--lg" disabled>
            시술 중… {elapsed}초
          </button>
        }
      >
        <div className="working" role="status" aria-live="polite">
          <img src={selfie} alt="" />
          <span className="working__shimmer" aria-hidden="true" />
          <p className="working__text">
            <span className="spinner spinner--light" aria-hidden="true" />
            {stageText(elapsed)}
          </p>
        </div>
      </FlowLayout>
    );
  }

  if (result) {
    return (
      <FlowLayout
        step={4}
        badge="Step 5 · AI hair"
        title={`「${styleTag}」 시안이 나왔어요`}
        lead="가운데 선을 좌우로 움직여 지금 모습과 비교해 보세요."
        actions={
          <>
            {back}
            <button type="button" className="pill pill--lg" onClick={() => navigate('/flow/card')}>
              전달 카드 만들기 <span className="pill__arrow" aria-hidden="true">→</span>
            </button>
          </>
        }
      >
        <BeforeAfter before={selfie} after={result.image} />
        {status?.mode === 'mock' && <p className="hint">MOCK 모드라 셀카가 그대로 돌아와요. 실제 시안은 AI_MODE=gemini에서 만들어져요.</p>}
        <p className="meta">
          생성 {(result.latencyMs / 1000).toFixed(1)}초 · 프롬프트 {result.promptVersion}
        </p>
        <button type="button" className="text-button" onClick={startGeneration}>
          같은 조건으로 다시 만들기
        </button>
        {error && (
          <p className="form-error" role="alert">
            {generationMessage(error.code)}
          </p>
        )}
      </FlowLayout>
    );
  }

  return (
    <FlowLayout
      step={4}
      badge="Step 5 · AI hair"
      title="이 조건으로 시안을 만들까요?"
      lead="보통 20초 안에 완성돼요. 얼굴·표정·배경은 그대로 두고 헤어만 바꿔요."
      actions={
        <>
          {back}
          <button type="button" className="pill pill--lg" disabled={!status} onClick={startGeneration}>
            {error ? '다시 시도' : 'AI 헤어 시술 시작'} <span className="pill__arrow" aria-hidden="true">→</span>
          </button>
        </>
      }
    >
      {error && (
        <div className="notice notice--error" role="alert">
          <p>{generationMessage(error.code)}</p>
          {error.code === 'profile_not_confirmed' && (
            <div className="notice__actions">
              <Link className="pill pill--ghost" to="/flow/profile">
                모발 프로필 확인하기
              </Link>
            </div>
          )}
        </div>
      )}
      {statusError && (
        <div className="notice notice--error" role="alert">
          <p>서버에 연결하지 못했어요.</p>
          <div className="notice__actions">
            <button type="button" className="pill pill--ghost" onClick={retryStatus}>
              다시 연결
            </button>
          </div>
        </div>
      )}

      <div className="summary-images">
        <figure>
          <img src={selfie} alt="내 셀카" />
          <figcaption>
            내 셀카 <Link to="/start">변경</Link>
          </figcaption>
        </figure>
        <figure>
          <img src={reference} alt="레퍼런스 사진" />
          <figcaption>
            레퍼런스 <Link to="/flow/reference">변경</Link>
          </figcaption>
        </figure>
      </div>

      <dl className="summary">
        <div className="summary__row summary__row--wide">
          <dt>스타일</dt>
          <dd>
            {styleTag} <Link to="/flow/style">변경</Link>
          </dd>
        </div>
        {profileRows(profile).map(([label, value]) => (
          <div key={label} className="summary__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="summary__row summary__row--wide">
          <dt>시술 이력</dt>
          <dd>
            {historyText(profile)} <Link to="/flow/profile">변경</Link>
          </dd>
        </div>
      </dl>
    </FlowLayout>
  );
}
