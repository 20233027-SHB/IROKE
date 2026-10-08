// 입력 이미지 규격. 셀카 비율과 provider 출력 비율을 맞춰야 모델이 구도를 바꾸지 않는다.

export const SELFIE_INPUT = {
  /** 셀카는 이 비율로 가운데 잘라서 올린다 (provider 출력 비율과 맞추기 위해) */
  aspectRatio: '3:4' as const,
  width: 768,
  height: 1024,
  referenceMaxEdge: 1024,
};

/**
 * API 요청 본문 상한 (바이트). Vercel 함수는 4.5MB를 넘는 요청을 함수에 닿기 전에 거절하므로
 * 헤더 여유를 두고 그보다 조금 작게 잡는다. 서버 bodyLimit과 클라이언트 사전 검사가 같은 값을 쓴다.
 */
export const MAX_REQUEST_BODY_BYTES = 4_400_000;
