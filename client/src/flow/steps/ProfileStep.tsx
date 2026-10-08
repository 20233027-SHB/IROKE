import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  DAMAGE_LABELS,
  DENSITY_LABELS,
  LENGTH_LABELS,
  TEXTURE_LABELS,
  TREATMENT_LABELS,
  describeToneLevel,
  type AnalyzedField,
  type HairAnalysis,
  type HairProfile,
  type TreatmentType,
} from '@iroke/shared';
import { ApiRequestError, api } from '../api';
import { useFlow } from '../FlowProvider';
import { analysisMessage, type ClientErrorCode } from '../lib/messages';
import { once } from '../lib/once';
import { confirmProfile, editedFields } from '../lib/profile';
import { clearSavedProfile, loadSavedProfile, saveProfile } from '../lib/storage';
import { ChipGroup, LevelSlider, ProfileField } from '../ui/controls';
import { FlowLayout } from '../ui/FlowLayout';

const entries = <K extends string | number>(labels: Record<K, string>) =>
  (Object.entries(labels) as [string, string][]).map(([value, label]) => ({ value, label }));

const LENGTH_OPTIONS = entries(LENGTH_LABELS) as { value: HairProfile['length']; label: string }[];
const TEXTURE_OPTIONS = entries(TEXTURE_LABELS) as { value: HairProfile['texture']; label: string }[];
const DENSITY_OPTIONS = entries(DENSITY_LABELS) as { value: HairProfile['density']; label: string }[];
const DAMAGE_OPTIONS = ([1, 2, 3, 4, 5] as const).map((value) => ({ value, label: DAMAGE_LABELS[value]! }));
const TREATMENT_OPTIONS = Object.entries(TREATMENT_LABELS) as [TreatmentType, string][];

const today = () => new Date().toISOString().slice(0, 10);

function valueLabel(field: AnalyzedField, value: unknown): string {
  switch (field) {
    case 'length':
      return LENGTH_LABELS[value as HairProfile['length']];
    case 'texture':
      return TEXTURE_LABELS[value as HairProfile['texture']];
    case 'density':
      return DENSITY_LABELS[value as HairProfile['density']];
    case 'damage':
      return DAMAGE_LABELS[value as number] ?? String(value);
    case 'currentLevel':
      return describeToneLevel(value as number).label;
  }
}

export function ProfileStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<ClientErrorCode>('analysis_failed');
  const [attempt, setAttempt] = useState(0);
  const [savedDeleted, setSavedDeleted] = useState(false);
  const { selfie, profile, analysis } = state;

  /** AI 분석. 결과는 초안이 되고, 시술 이력은 유지된다 (setAnalysis). 화면을 떠나면 결과를 버린다. */
  const analyze = useCallback(
    (request: Promise<HairAnalysis>, isAlive: () => boolean = () => true) => {
      setPhase('loading');
      request
        .then((a) => {
          if (!isAlive()) return;
          dispatch({ type: 'setAnalysis', analysis: a });
          setPhase('idle');
        })
        .catch((err: Error) => {
          if (!isAlive()) return;
          setErrorCode(err instanceof ApiRequestError ? err.code : 'analysis_failed');
          setPhase('error');
        });
    },
    [dispatch],
  );

  // 셀카가 있고 프로필 초안이 없으면 분석을 돌린다 (같은 셀카는 한 번만 요청)
  const shouldAnalyze = Boolean(selfie) && !profile;
  useEffect(() => {
    if (!shouldAnalyze || !selfie) return;
    let alive = true;
    analyze(
      once(`hair:${state.selfieId}:${attempt}`, () => api.analyzeHair(selfie)),
      () => alive,
    );
    return () => {
      alive = false;
    };
  }, [shouldAnalyze, selfie, state.selfieId, attempt, analyze]);

  const set = <K extends keyof HairProfile>(key: K, value: HairProfile[K]) => {
    if (profile) dispatch({ type: 'updateProfile', profile: { ...profile, [key]: value } });
  };

  const edited = new Set(profile ? editedFields(analysis, profile) : []);
  const estimate = (field: AnalyzedField) =>
    analysis ? { confidence: analysis[field].confidence, reason: analysis[field].reason, valueText: valueLabel(field, analysis[field].value) } : undefined;

  const confirm = () => {
    if (!profile) return;
    const profileSource = confirmProfile(analysis, profile);
    dispatch({ type: 'confirmProfile', profileSource });
    saveProfile({ profile, confirmedAt: profileSource.confirmedAt });
    // AI 원본 추정값 + 고친 항목 기록 (실패해도 진행은 막지 않는다)
    api.confirmProfile({ profile, profileSource }).catch(() => undefined);
    navigate(selfie ? '/flow/reference' : '/start');
  };

  const actions = (
    <>
      <Link className="pill pill--ghost pill--lg pill--back" to="/start">
        이전
      </Link>
      <button type="button" className="pill pill--lg" disabled={!profile} onClick={confirm}>
        이 내용으로 확인 <span className="pill__arrow" aria-hidden="true">→</span>
      </button>
    </>
  );

  if (!profile) {
    return (
      <FlowLayout step={1} badge="Step 2 · Hair profile" title="모발 상태를 분석하고 있어요" actions={actions}>
        {phase === 'error' ? (
          <div className="notice notice--error" role="alert">
            <p>{analysisMessage(errorCode)} 다시 시도하거나 직접 입력해서 진행할 수 있어요.</p>
            <div className="notice__actions">
              <button type="button" className="pill" onClick={() => setAttempt((n) => n + 1)}>
                다시 시도
              </button>
              <button type="button" className="pill pill--ghost" onClick={() => dispatch({ type: 'startManual' })}>
                직접 입력으로 진행
              </button>
            </div>
          </div>
        ) : (
          <div className="loading" role="status">
            {selfie && <img className="loading__thumb" src={selfie} alt="" />}
            <span className="spinner" aria-hidden="true" />
            <p>
              기장·모질·숱·손상도·밝기를 보고 있어요
              <br />
              <span className="muted">보통 5초 정도 걸려요</span>
            </p>
          </div>
        )}
      </FlowLayout>
    );
  }

  const saved = state.profileOrigin === 'saved' ? loadSavedProfile() : null;

  return (
    <FlowLayout
      step={1}
      badge="Step 2 · Hair profile"
      title="내 모발 상태가 맞는지 확인해 주세요"
      lead={
        analysis
          ? 'AI가 사진으로 추정한 값이에요. 다르면 고쳐 주세요. 확인한 값으로 시안을 만들어요.'
          : '내 모발 상태를 골라 주세요. 확인한 값으로 시안을 만들어요.'
      }
      actions={actions}
    >
      {state.profileOrigin === 'saved' && (
        <div className="notice">
          <p>
            {saved ? `${saved.confirmedAt.slice(0, 10).replaceAll('-', '.')}에 확정한 프로필이에요. ` : ''}
            바뀐 부분이 있으면 고쳐 주세요.
          </p>
          <div className="notice__actions">
            {selfie && (
              <button type="button" className="pill pill--ghost" disabled={phase === 'loading'} onClick={() => analyze(api.analyzeHair(selfie))}>
                {phase === 'loading' ? '분석하고 있어요…' : '이 셀카로 다시 분석'}
              </button>
            )}
            {!savedDeleted && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  clearSavedProfile();
                  setSavedDeleted(true);
                }}
              >
                이 브라우저에 저장된 프로필 삭제
              </button>
            )}
            {savedDeleted && <span className="muted" role="status">저장된 프로필을 삭제했어요</span>}
          </div>
          {phase === 'error' && (
            <p className="form-error" role="alert">
              {analysisMessage(errorCode)} 지금 값으로 계속 진행할 수 있어요.
            </p>
          )}
        </div>
      )}
      {analysis && (analysis.colorDescription || analysis.notes) && (
        <p className="analysis-note">
          {analysis.colorDescription && <>현재 색: {analysis.colorDescription}. </>}
          {analysis.notes}
        </p>
      )}

      <ProfileField label="기장" estimate={estimate('length')} edited={edited.has('length')}>
        <ChipGroup label="기장" value={profile.length} options={LENGTH_OPTIONS} onChange={(v) => set('length', v)} />
      </ProfileField>
      <ProfileField label="모질" estimate={estimate('texture')} edited={edited.has('texture')}>
        <ChipGroup label="모질" value={profile.texture} options={TEXTURE_OPTIONS} onChange={(v) => set('texture', v)} />
      </ProfileField>
      <ProfileField label="숱" estimate={estimate('density')} edited={edited.has('density')}>
        <ChipGroup label="숱" value={profile.density} options={DENSITY_OPTIONS} onChange={(v) => set('density', v)} />
      </ProfileField>
      <ProfileField label="손상도" estimate={estimate('damage')} edited={edited.has('damage')}>
        <ChipGroup label="손상도" value={profile.damage} options={DAMAGE_OPTIONS} onChange={(v) => set('damage', v)} />
      </ProfileField>
      <ProfileField
        label="현재 밝기"
        valueText={describeToneLevel(profile.currentLevel ?? 4).label}
        estimate={estimate('currentLevel')}
        edited={edited.has('currentLevel')}
      >
        <LevelSlider label="현재 밝기 레벨" value={profile.currentLevel ?? 4} onChange={(v) => set('currentLevel', v)} />
      </ProfileField>

      <section className="field">
        <div className="field__head">
          <h2 className="field__label">시술 이력</h2>
        </div>
        <p className="field__reason">사진으로는 알 수 없어서 직접 입력해 주세요. 최근 펌·염색·탈색이 중요해요.</p>
        {profile.history.map((t, i) => (
          <div key={i} className="history-row">
            <select
              className="select"
              aria-label={`${i + 1}번째 시술 종류`}
              value={t.type}
              onChange={(e) => set('history', profile.history.map((h, k) => (k === i ? { ...h, type: e.target.value as TreatmentType } : h)))}
            >
              {TREATMENT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="select"
              type="date"
              aria-label={`${i + 1}번째 시술 날짜`}
              max={today()}
              value={t.date}
              onChange={(e) => e.target.value && set('history', profile.history.map((h, k) => (k === i ? { ...h, date: e.target.value } : h)))}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={`${i + 1}번째 시술 삭제`}
              onClick={() => set('history', profile.history.filter((_, k) => k !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="pill pill--ghost" onClick={() => set('history', [...profile.history, { type: 'color', date: today() }])}>
          + 시술 추가
        </button>
      </section>
    </FlowLayout>
  );
}
