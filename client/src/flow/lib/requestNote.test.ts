import { describe, expect, it } from 'vitest';
import type { HairProfile } from '@iroke/shared';
import { buildRequestNote } from './requestNote';

const now = new Date('2026-10-08');
const profile: HairProfile = { length: 'medium', texture: 'wavy', density: 'medium', damage: 2, currentLevel: 6, history: [] };

describe('buildRequestNote', () => {
  it('스타일명·기장 규칙·밝기 유지를 담는다', () => {
    const note = buildRequestNote(profile, '허쉬컷', now);
    expect(note).toContain('「허쉬컷」');
    expect(note).toContain('지금(중단발)보다 길어질 수 없으니');
    expect(note).toContain('지금(6레벨) 그대로');
  });
  it('명도를 모르면 밝기 문장을 넣지 않는다', () => {
    const { currentLevel: _omit, ...rest } = profile;
    expect(buildRequestNote(rest, '허쉬컷', now)).not.toContain('레벨');
  });
  it('3개월 안의 약제 시술만 알린다 (커트·오래된 시술 제외)', () => {
    const note = buildRequestNote(
      {
        ...profile,
        history: [
          { type: 'bleach', date: '2026-09-20' },
          { type: 'color', date: '2026-08-01' },
          { type: 'cut', date: '2026-10-01' },
          { type: 'perm', date: '2026-03-01' },
        ],
      },
      '허쉬컷',
      now,
    );
    expect(note).toContain('염색·탈색을 했어요');
    expect(note).not.toContain('펌');
    expect(note).not.toContain('커트');
  });
  it('손상도 4 이상이면 상담 요청', () => {
    expect(buildRequestNote({ ...profile, damage: 4 }, '허쉬컷', now)).toContain('상담 후');
    expect(buildRequestNote(profile, '허쉬컷', now)).not.toContain('상담 후');
  });
});
