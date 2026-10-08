import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { SparkleIcon } from '../../components/icons';
import { useFlow } from '../FlowProvider';
import { STEPS, blockingStep } from '../lib/steps';

interface FlowLayoutProps {
  step: number;
  badge: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  /** 하단 고정 버튼 영역 */
  actions: ReactNode;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 실수로 지우지 않도록 두 번 눌러야 초기화된다 (모달 없이) */
function ResetButton() {
  const { dispatch } = useFlow();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className="text-button"
      onClick={() => {
        if (!armed) return setArmed(true);
        dispatch({ type: 'reset' });
        navigate('/start');
      }}
    >
      {armed ? '한 번 더 누르면 사진·결과 삭제' : '처음부터'}
    </button>
  );
}

export function FlowLayout({ step, badge, title, lead, children, actions }: FlowLayoutProps) {
  const { state, status, promptVersion } = useFlow();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  return (
    <div className="flow">
      <header className="flow-header">
        <Link className="header__brand" to="/">
          IROKE
        </Link>
        <span className="flow-header__step" aria-hidden="true">
          STEP {pad(step + 1)} / {pad(STEPS.length)}
        </span>
        <div className="flow-header__end">
          {status?.mode === 'mock' && (
            <span className="tag" title="API 비용 없이 예시 결과를 보여 주는 개발 모드예요">
              MOCK
            </span>
          )}
          <ResetButton />
        </div>
      </header>

      <nav className="steps" aria-label="진행 단계">
        <ol>
          {STEPS.map((s, i) => {
            const reachable = i !== step && blockingStep(i, state, promptVersion) === null && i < step + 2;
            const cls = `steps__item${i < step ? ' is-done' : ''}${i === step ? ' is-current' : ''}`;
            return (
              <li key={s.path} className={cls} aria-current={i === step ? 'step' : undefined}>
                {reachable ? <Link to={s.path}>{s.label}</Link> : <span>{s.label}</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="flow-main" key={step}>
        <p className="badge">
          <SparkleIcon />
          {badge}
        </p>
        <h1 className="flow-title">{title}</h1>
        {lead && <p className="flow-lead">{lead}</p>}
        {children}
      </main>

      <div className="flow-actions">{actions}</div>
    </div>
  );
}
