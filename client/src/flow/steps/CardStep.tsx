import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useFlow } from '../FlowProvider';
import { canvasToBlob, renderCard } from '../lib/card';
import { buildRequestNote } from '../lib/requestNote';
import { currentGeneration } from '../lib/state';
import { FlowLayout } from '../ui/FlowLayout';

const fileName = () => `iroke-hair-card-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.png`;

export function CardStep() {
  const { state, dispatch, promptVersion } = useFlow();
  const result = currentGeneration(state, promptVersion);
  const { selfie, profile, styleTag } = state;

  const autoNote = useMemo(() => (profile && styleTag ? buildRequestNote(profile, styleTag) : ''), [profile, styleTag]);
  const note = state.requestNote ?? autoNote;

  const [preview, setPreview] = useState<string>();
  const [message, setMessage] = useState('');
  const blobRef = useRef<Blob | null>(null);
  const [canShare, setCanShare] = useState(false);

  // 카드 미리보기 = 저장될 PNG 그대로 (입력이 멈추면 다시 그림)
  useEffect(() => {
    if (!result || !selfie || !profile || !styleTag) return;
    let url: string | undefined;
    let alive = true;
    const id = window.setTimeout(async () => {
      try {
        const blob = await canvasToBlob(await renderCard({ after: result.image, before: selfie, styleTag, profile, note, date: new Date() }));
        if (!alive) return;
        blobRef.current = blob;
        url = URL.createObjectURL(blob);
        setPreview(url);
        const file = new File([blob], fileName(), { type: 'image/png' });
        setCanShare(Boolean(navigator.canShare?.({ files: [file] })));
      } catch (err) {
        console.error('[card] 그리기 실패', err);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(id);
      if (url) URL.revokeObjectURL(url);
    };
  }, [result, selfie, profile, styleTag, note]);

  const save = () => {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName();
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('이미지를 저장했어요.');
  };

  const share = async () => {
    if (!blobRef.current) return;
    try {
      await navigator.share({ files: [new File([blobRef.current], fileName(), { type: 'image/png' })], title: 'IROKE 헤어 카드', text: styleTag });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setMessage('공유하지 못했어요. 이미지로 저장해서 보내 주세요.');
    }
  };

  if (!result || !profile || !styleTag) return null;

  return (
    <FlowLayout
      step={5}
      badge="Step 6 · Stylist card"
      title="미용사님께 이 카드를 보여 주세요"
      lead="시안과 내 모발 상태, 요청 사항을 한 장에 담았어요."
      actions={
        <>
          {canShare ? (
            <button type="button" className="pill pill--ghost pill--lg" onClick={share} disabled={!preview}>
              공유하기
            </button>
          ) : (
            <Link className="pill pill--ghost pill--lg pill--back" to="/flow/generate">
              이전
            </Link>
          )}
          <button type="button" className="pill pill--lg" onClick={save} disabled={!preview}>
            이미지로 저장
          </button>
        </>
      }
    >
      <div className="card-preview">
        {preview ? (
          <img src={preview} alt={`${styleTag} 헤어 카드: AI 시안, 지금 모습, 모발 상태와 요청 사항`} />
        ) : (
          <div className="loading loading--inline" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>카드를 만들고 있어요</p>
          </div>
        )}
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {message}
      </p>
      {message && <p className="hint">{message}</p>}

      <section className="field">
        <div className="field__head">
          <label className="field__label" htmlFor="request-note">
            미용사에게 전할 말
          </label>
          {state.requestNote != null && (
            <button type="button" className="text-button" onClick={() => dispatch({ type: 'setRequestNote', requestNote: undefined })}>
              자동 문구로 되돌리기
            </button>
          )}
        </div>
        <textarea
          id="request-note"
          className="textarea"
          rows={7}
          maxLength={400}
          value={note}
          onChange={(e) => dispatch({ type: 'setRequestNote', requestNote: e.target.value })}
        />
      </section>

      <div className="after-links">
        <Link to="/flow/reference">다른 스타일로 다시 해보기</Link>
        {canShare && <Link to="/flow/generate">시안 다시 보기</Link>}
      </div>
    </FlowLayout>
  );
}
