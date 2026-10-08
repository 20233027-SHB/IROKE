import { describe, expect, it } from 'vitest';
import { createDailyLimiter } from './limit';

describe('createDailyLimiter', () => {
  it('limit이 null이면 제한 없음', () => {
    const l = createDailyLimiter(null);
    for (let i = 0; i < 100; i++) l.record('a');
    expect(l.allows('a')).toBe(true);
  });
  it('사용자별로 세고 날짜가 바뀌면 초기화', () => {
    let day = '2026-10-08';
    const l = createDailyLimiter(2, () => day);
    l.record('a');
    l.record('a');
    expect(l.allows('a')).toBe(false);
    expect(l.allows('b')).toBe(true);
    day = '2026-10-09';
    expect(l.allows('a')).toBe(true);
  });
});
