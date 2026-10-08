import { useState } from 'react';
import type { CSSProperties } from 'react';

/** 원본과 시안을 겹쳐 놓고 경계를 드래그해 비교한다. 키보드는 range 입력으로 조작. */
export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="compare" style={{ '--pos': `${pos}%` } as CSSProperties}>
      <img className="compare__img" src={after} alt="AI 헤어 시안" />
      <img className="compare__img compare__before" src={before} alt="원본 셀카" />
      <span className="compare__line" aria-hidden="true" />
      <span className="compare__label compare__label--before" aria-hidden="true">
        지금
      </span>
      <span className="compare__label compare__label--after" aria-hidden="true">
        AI 시안
      </span>
      <input
        className="compare__range"
        type="range"
        min={0}
        max={100}
        value={pos}
        aria-label="원본과 시안 비교 위치"
        aria-valuetext={`원본 ${pos}%`}
        onChange={(e) => setPos(Number(e.target.value))}
      />
    </div>
  );
}
