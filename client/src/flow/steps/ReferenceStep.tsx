import { Link, useNavigate } from 'react-router';
import { useFlow } from '../FlowProvider';
import { resizeMaxEdge } from '../lib/image';
import { uuid } from '../lib/storage';
import { FlowLayout } from '../ui/FlowLayout';
import { UploadField } from '../ui/UploadField';

export function ReferenceStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();

  return (
    <FlowLayout
      step={2}
      badge="Step 3 · Reference"
      title="원하는 스타일 사진을 올려 주세요"
      lead="얼굴과 헤어가 잘 보이는 사진일수록 정확해요."
      actions={
        <>
          <Link className="pill pill--ghost pill--lg pill--back" to="/flow/profile">
            이전
          </Link>
          <button type="button" className="pill pill--lg" disabled={!state.reference} onClick={() => navigate('/flow/style')}>
            다음 <span className="pill__arrow" aria-hidden="true">→</span>
          </button>
        </>
      }
    >
      <p className="notice notice--plain">
        레퍼런스에서는 <strong>컷·형태·앞머리</strong>만 참고해요. 사진 속 인물의 얼굴·모질·숱은 가져오지 않고, 기장은 지금보다 길어지지 않아요.
      </p>
      <UploadField
        value={state.reference}
        process={(file) => resizeMaxEdge(file)}
        onChange={(reference) => dispatch({ type: 'setReference', reference, referenceId: uuid() })}
        alt="올린 레퍼런스 사진"
        shape="free"
      />
    </FlowLayout>
  );
}
