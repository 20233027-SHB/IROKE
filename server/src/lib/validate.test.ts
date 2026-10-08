import { describe, expect, it } from 'vitest';
import { parseProfile, parseProfileSource, parseStyleSource, sanitizeStyleTag } from './validate';

const profile = {
  length: 'medium',
  texture: 'wavy',
  density: 'high',
  damage: 3,
  currentLevel: 6,
  history: [{ type: 'color', date: '2026-08-10' }],
};

describe('parseProfile', () => {
  it('정상 프로필은 그대로, 모르는 필드는 버린다', () => {
    expect(parseProfile({ ...profile, extra: 'x' })).toEqual(profile);
  });
  it('명도 레벨은 생략할 수 있다', () => {
    const { currentLevel: _omit, ...rest } = profile;
    expect(parseProfile(rest)).toEqual(rest);
  });
  it('enum·범위·날짜가 틀리면 null', () => {
    expect(parseProfile({ ...profile, texture: 'frizzy' })).toBeNull();
    expect(parseProfile({ ...profile, damage: 6 })).toBeNull();
    expect(parseProfile({ ...profile, damage: 2.5 })).toBeNull();
    expect(parseProfile({ ...profile, currentLevel: 0 })).toBeNull();
    expect(parseProfile({ ...profile, history: [{ type: 'color', date: '어제' }] })).toBeNull();
    expect(parseProfile({ ...profile, history: [{ type: 'botox', date: '2026-08-10' }] })).toBeNull();
  });
});

describe('parseProfileSource', () => {
  it('confirmedAt이 없으면 확인 안 된 것으로 본다', () => {
    expect(parseProfileSource({ editedFields: [] })).toBeNull();
    expect(parseProfileSource({ editedFields: [], confirmedAt: '2026-10-08T10:00:00.000Z' })).toEqual({
      editedFields: [],
      confirmedAt: '2026-10-08T10:00:00.000Z',
    });
  });
  it('모르는 수정 항목은 거절', () => {
    expect(parseProfileSource({ editedFields: ['history'], confirmedAt: '2026-10-08T10:00:00.000Z' })).toBeNull();
  });
});

describe('parseStyleSource', () => {
  it('선택 방식과 순번', () => {
    expect(parseStyleSource({ chosen: 'suggestion', suggestionIndex: 0 })).toEqual({ chosen: 'suggestion', suggestionIndex: 0 });
    expect(parseStyleSource({ chosen: 'custom' })).toEqual({ chosen: 'custom' });
    expect(parseStyleSource({ chosen: 'other' })).toBeNull();
  });
});

describe('sanitizeStyleTag', () => {
  it('따옴표·줄바꿈을 지우고 30자로 자른다', () => {
    expect(sanitizeStyleTag('  레이어드\n"컷"  ')).toBe('레이어드 컷');
    expect(sanitizeStyleTag('가'.repeat(40))).toHaveLength(30);
  });
  it('비면 null', () => {
    expect(sanitizeStyleTag('  \n ')).toBeNull();
    expect(sanitizeStyleTag(3)).toBeNull();
  });
});
