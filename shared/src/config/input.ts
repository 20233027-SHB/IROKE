// 입력 이미지 규격. 셀카 비율과 provider 출력 비율을 맞춰야 모델이 구도를 바꾸지 않는다.

export const SELFIE_INPUT = {
  /** 셀카는 이 비율로 가운데 잘라서 올린다 (provider 출력 비율과 맞추기 위해) */
  aspectRatio: '3:4' as const,
  width: 768,
  height: 1024,
  referenceMaxEdge: 1024,
};
