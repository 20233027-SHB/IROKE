// 사용자(브라우저 ID)별 하루 시안 생성 횟수 제한. limit이 null이면 제한 없음.
// 서버 메모리 기준이라 재시작하면 초기화된다. DB가 정해지면 그쪽으로 옮긴다.

export function createDailyLimiter(limit: number | null, today = () => new Date().toISOString().slice(0, 10)) {
  const counts = new Map<string, number>();
  const key = (clientId: string) => `${today()}:${clientId}`;
  return {
    /** 한 번 더 생성해도 되는지 */
    allows(clientId: string): boolean {
      return limit == null || (counts.get(key(clientId)) ?? 0) < limit;
    },
    /** provider를 호출할 때마다 센다 (실패·재시도도 과금되므로 포함) */
    record(clientId: string) {
      if (limit == null) return;
      const k = key(clientId);
      counts.set(k, (counts.get(k) ?? 0) + 1);
      // 지난 날짜 키 정리
      for (const old of counts.keys()) if (!old.startsWith(today())) counts.delete(old);
    },
  };
}
