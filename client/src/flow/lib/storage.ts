// 브라우저 저장소 접근. 사파리 사설 모드 등에서 저장소가 막혀도 앱은 동작해야 하므로 모두 try/catch.
import type { HairProfile } from '@iroke/shared';

function attempt<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const session = {
  get: (key: string) => attempt(() => sessionStorage.getItem(key), null),
  /** 용량 초과 등으로 실패하면 false */
  set: (key: string, value: string) =>
    attempt(() => {
      sessionStorage.setItem(key, value);
      return true;
    }, false),
  remove: (key: string) => attempt(() => sessionStorage.removeItem(key), undefined),
  keys: (prefix: string) =>
    attempt(() => Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i) ?? '').filter((k) => k.startsWith(prefix)), [] as string[]),
};

/** crypto.randomUUID는 https·localhost에서만 있어서, 휴대폰으로 사설 IP에 접속할 때를 위해 직접 만든다 */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const CLIENT_ID_KEY = 'iroke.clientId';
let clientId: string | undefined;

/** 로그인 전까지 사용자를 구분하는 브라우저별 임의 ID */
export function getClientId(): string {
  clientId ??= attempt(() => localStorage.getItem(CLIENT_ID_KEY), null) ?? undefined;
  if (!clientId) {
    clientId = uuid();
    attempt(() => localStorage.setItem(CLIENT_ID_KEY, clientId!), undefined);
  }
  return clientId;
}

const SAVED_PROFILE_KEY = 'iroke.savedProfile';

export interface SavedProfile {
  profile: HairProfile;
  confirmedAt: string;
}

/** 확정한 모발 프로필(사진 제외). 다음 방문 때 「모발 프로필 등록/확인」에서 불러온다. */
export function loadSavedProfile(): SavedProfile | null {
  const raw = attempt(() => localStorage.getItem(SAVED_PROFILE_KEY), null);
  if (!raw) return null;
  const parsed = attempt(() => JSON.parse(raw) as SavedProfile, null);
  return parsed?.profile && parsed.confirmedAt ? parsed : null;
}

export function saveProfile(saved: SavedProfile) {
  attempt(() => localStorage.setItem(SAVED_PROFILE_KEY, JSON.stringify(saved)), undefined);
}

export function clearSavedProfile() {
  attempt(() => localStorage.removeItem(SAVED_PROFILE_KEY), undefined);
}
