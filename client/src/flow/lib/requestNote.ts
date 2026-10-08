// 미용사에게 전할 요청 문구 자동 생성 (템플릿, 비용 없음). 사용자가 카드에서 고칠 수 있다.
import { LENGTH_LABELS, TREATMENT_LABELS, type HairProfile, type TreatmentType } from '@iroke/shared';

/** 이 기간 안의 약제 시술은 미용사가 먼저 알아야 한다 */
export const RECENT_TREATMENT_DAYS = 90;
const CHEMICAL: TreatmentType[] = ['perm', 'color', 'bleach'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 괄호 설명을 뺀 짧은 기장 이름 (예: "중단발") */
const shortLabel = (label: string) => label.replace(/\s*\(.*\)$/, '');

export function buildRequestNote(profile: HairProfile, styleTag: string, now: Date = new Date()): string {
  const lines = [`「${styleTag}」 스타일로 하고 싶어요.`];

  // 기장 규칙과 같은 내용: 지금보다 길게는 불가, 사진이 더 짧으면 그만큼 자른다
  lines.push(`기장은 지금(${shortLabel(LENGTH_LABELS[profile.length])})보다 길어질 수 없으니, 사진 기장까지만 잘라 주세요.`);

  if (profile.currentLevel != null) {
    lines.push(`머리 밝기는 지금(${profile.currentLevel}레벨) 그대로 유지하고 싶어요.`);
  }

  const recent = CHEMICAL.filter((type) =>
    profile.history.some((t) => t.type === type && now.getTime() - Date.parse(t.date) <= RECENT_TREATMENT_DAYS * DAY_MS),
  );
  if (recent.length) {
    lines.push(`최근 3개월 안에 ${recent.map((t) => TREATMENT_LABELS[t]).join('·')}을 했어요. 시술 가능 여부를 먼저 봐 주세요.`);
  }

  if (profile.damage >= 4) {
    lines.push('손상이 있는 편이라 약제·열 시술은 상담 후 정하고 싶어요.');
  }
  return lines.join('\n');
}
