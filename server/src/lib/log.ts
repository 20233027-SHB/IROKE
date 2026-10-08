// 이벤트 로그 (JSONL, 하루 한 파일). DB가 정해지기 전까지 정확도 집계·파인튜닝 데이터의 임시 저장소다.
// 사진(data URL)은 절대 기록하지 않는다.
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../env';

let ready: Promise<unknown> | undefined;

export async function logEvent(event: string, data: Record<string, unknown>): Promise<void> {
  const at = new Date();
  const file = path.join(env.logDir, `${at.toISOString().slice(0, 10)}.jsonl`);
  try {
    ready ??= mkdir(env.logDir, { recursive: true });
    await ready;
    await appendFile(file, `${JSON.stringify({ at: at.toISOString(), event, ...data })}\n`);
  } catch (err) {
    // 로그 실패가 사용자 요청을 실패시키지 않게 한다
    console.error('[log] 기록 실패', err);
  }
}
