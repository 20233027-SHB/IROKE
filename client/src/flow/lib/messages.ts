// 오류 코드 → 사용자 메시지
import type { ApiErrorCode } from '@iroke/shared';

export type ClientErrorCode = ApiErrorCode | 'network';

const GENERATION_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  generation_failed: '시안을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  no_image: '안전 기준에 걸려 이미지가 만들어지지 않았어요. 다른 셀카나 레퍼런스 사진으로 시도해 보세요.',
  text_only: 'AI가 이미지 대신 설명만 보냈어요. 다시 시도하면 대부분 해결돼요.',
  timeout: '응답이 너무 오래 걸려 중단했어요. 다시 시도해 주세요.',
  limit_reached: '오늘 만들 수 있는 시안을 모두 사용했어요. 내일 다시 시도해 주세요.',
  profile_not_confirmed: '모발 프로필 확인이 필요해요. 2단계에서 [확인]을 눌러 주세요.',
  payload_too_large: '사진 용량이 너무 커요. 다른 사진으로 시도해 주세요.',
};

const ANALYSIS_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
  analysis_failed: 'AI 분석이 지금 원활하지 않아요.',
  payload_too_large: '사진 용량이 너무 커요. 다른 사진으로 시도해 주세요.',
};

const COMMON: Partial<Record<ClientErrorCode, string>> = {
  network: '인터넷 연결을 확인해 주세요.',
};

const FALLBACK = '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';

export const generationMessage = (code: ClientErrorCode) => GENERATION_MESSAGES[code] ?? COMMON[code] ?? FALLBACK;
export const analysisMessage = (code: ClientErrorCode) => ANALYSIS_MESSAGES[code] ?? COMMON[code] ?? FALLBACK;
