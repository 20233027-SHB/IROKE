// 같은 키의 요청이 진행 중이면 그 결과를 함께 쓴다.
// 개발 모드(StrictMode)의 이중 마운트나 빠른 재진입으로 같은 사진을 두 번 분석(과금)하지 않게 한다.
const inflight = new Map<string, Promise<unknown>>();

export function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = run().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}
