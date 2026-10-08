import { Link, useNavigate } from 'react-router';
import { useFlow } from '../FlowProvider';
import { normalizeSelfie } from '../lib/image';
import { uuid } from '../lib/storage';
import { FlowLayout } from '../ui/FlowLayout';
import { UploadField } from '../ui/UploadField';

export function SelfieStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const ready = state.consent && Boolean(state.selfie);
  const missing = [!state.selfie && '셀카', !state.consent && '동의'].filter(Boolean).join('와 ');

  return (
    <FlowLayout
      step={0}
      badge="Step 1 · Selfie"
      title="정면 셀카를 올려 주세요"
      lead="지금 내 머리 상태를 AI가 읽어요. 머리가 잘 보일수록 정확해져요."
      actions={
        <>
          <Link className="pill pill--ghost pill--lg pill--back" to="/">
            이전
          </Link>
          <button
            type="button"
            className="pill pill--lg"
            disabled={!ready}
            onClick={() => navigate(state.profileSource ? '/flow/reference' : '/flow/profile')}
          >
            다음 <span className="pill__arrow" aria-hidden="true">→</span>
          </button>
        </>
      }
    >
      <ul className="tips">
        <li>정면을 바라보고</li>
        <li>이마·귀·머리 전체가 나오게</li>
        <li>밝은 곳에서</li>
        <li>모자·마스크·필터 없이</li>
      </ul>

      <UploadField
        value={state.selfie}
        process={normalizeSelfie}
        onChange={(selfie) => dispatch({ type: 'setSelfie', selfie, selfieId: uuid() })}
        camera="user"
        alt="올린 셀카 (3:4로 맞춰 잘림)"
        shape="portrait"
      />

      {/* TODO(정책): 법률 검토 전 초안. 문구가 확정되면 교체한다. */}
      <fieldset className="consent">
        <legend className="visually-hidden">사진 처리 동의</legend>
        <label className="check">
          <input type="checkbox" checked={state.consent} onChange={(e) => dispatch({ type: 'setConsent', consent: e.target.checked })} />
          <span>
            <strong>[필수]</strong> 만 18세 이상이며, 아래 사진 처리 방식에 동의해요
          </span>
        </label>
        <ul className="consent__list">
          <li>셀카와 레퍼런스 사진은 모발 분석과 시안 생성을 위해 Google(Gemini API)로 전송돼요.</li>
          <li>Google은 이 사진을 서비스 개선에 쓰지 않고, 악용 방지를 위해 정해진 기간만 기록해요.</li>
          <li>IROKE 서버에는 사진을 저장하지 않아요. 처리가 끝나면 바로 폐기해요.</li>
          <li>사진과 결과는 이 브라우저 탭에만 임시로 남고, 탭을 닫거나 [처음부터]를 두 번 누르면 지워져요.</li>
          <li>확정한 모발 프로필(사진 제외)은 다음 방문을 위해 이 브라우저에 저장돼요.</li>
        </ul>
      </fieldset>

      {!ready && <p className="hint">{missing}가 있어야 다음으로 넘어갈 수 있어요.</p>}
    </FlowLayout>
  );
}
