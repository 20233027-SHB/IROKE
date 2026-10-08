import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { FlowProvider, useFlow } from './FlowProvider';
import { STEPS, blockingStep } from './lib/steps';
import { loadSavedProfile } from './lib/storage';
import { CardStep } from './steps/CardStep';
import { GenerateStep } from './steps/GenerateStep';
import { ProfileStep } from './steps/ProfileStep';
import { ReferenceStep } from './steps/ReferenceStep';
import { SelfieStep } from './steps/SelfieStep';
import { StyleStep } from './steps/StyleStep';
import './flow.css';

/** 앞 단계를 끝내지 않았으면 먼저 끝내야 할 단계로 보낸다 (2단계 [확인] 없이는 시안 생성 불가) */
function StepRoute({ index, children }: { index: number; children: ReactNode }) {
  const { state, promptVersion } = useFlow();
  const block = blockingStep(index, state, promptVersion);
  return block === null ? children : <Navigate to={STEPS[block]!.path} replace />;
}

/** 히어로 「모발 프로필 등록/확인」: 저장된 프로필이 있으면 2단계, 없으면 1단계 */
function ProfileEntry() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  useEffect(() => {
    if (!state.profile) {
      const saved = loadSavedProfile();
      if (!saved) return void navigate('/start', { replace: true });
      dispatch({ type: 'loadSaved', profile: saved.profile });
    }
    navigate('/flow/profile', { replace: true });
    // 진입할 때 한 번만 판단한다
  }, []);
  return null;
}

export const flowRoutes = {
  layout: (
    <FlowProvider>
      <Outlet />
    </FlowProvider>
  ),
  children: [
    { path: '/start', element: <StepRoute index={0}><SelfieStep /></StepRoute> },
    { path: '/profile', element: <ProfileEntry /> },
    { path: '/flow/profile', element: <StepRoute index={1}><ProfileStep /></StepRoute> },
    { path: '/flow/reference', element: <StepRoute index={2}><ReferenceStep /></StepRoute> },
    { path: '/flow/style', element: <StepRoute index={3}><StyleStep /></StepRoute> },
    { path: '/flow/generate', element: <StepRoute index={4}><GenerateStep /></StepRoute> },
    { path: '/flow/card', element: <StepRoute index={5}><CardStep /></StepRoute> },
  ],
};
