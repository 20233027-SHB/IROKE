import { useId } from 'react';
import type { ReactNode } from 'react';
import { CONFIDENCE_LABELS, describeToneLevel, type Confidence } from '@iroke/shared';

interface ChipGroupProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** 라디오 버튼을 칩 모양으로 (화살표 키 이동은 브라우저 기본 동작) */
export function ChipGroup<T extends string | number>({ label, value, options, onChange }: ChipGroupProps<T>) {
  const name = useId();
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={String(o.value)} className="chip">
          <input
            type="radio"
            className="visually-hidden"
            name={name}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function LevelSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="level">
      <input
        type="range"
        className="level__input"
        min={1}
        max={10}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={describeToneLevel(value).label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="level__scale" aria-hidden="true">
        <span>1 블랙</span>
        <span>10 밝은 금발</span>
      </div>
    </div>
  );
}

export function ConfidenceTag({ confidence }: { confidence: Confidence }) {
  return <span className={`tag tag--${confidence}`}>{CONFIDENCE_LABELS[confidence]}</span>;
}

interface FieldProps {
  label: string;
  /** 지금 선택된 값 표시 */
  valueText?: string;
  estimate?: { confidence: Confidence; reason: string; valueText: string };
  edited?: boolean;
  children: ReactNode;
}

/** 프로필 한 항목: AI 추정 근거·확신도와 입력 컨트롤 */
export function ProfileField({ label, valueText, estimate, edited, children }: FieldProps) {
  const needsCheck = estimate && !edited && estimate.confidence !== 'high';
  return (
    <section className={`field${estimate?.confidence === 'low' && !edited ? ' field--check' : ''}`}>
      <div className="field__head">
        <h2 className="field__label">{label}</h2>
        {valueText && <span className="field__value">{valueText}</span>}
        <span className="field__tags">
          {edited ? <span className="tag tag--edited">직접 수정</span> : estimate && <ConfidenceTag confidence={estimate.confidence} />}
        </span>
      </div>
      {estimate && (
        <p className="field__reason">
          {edited ? `AI 추정: ${estimate.valueText} · ` : ''}
          {estimate.reason}
        </p>
      )}
      {needsCheck && estimate.confidence === 'low' && <p className="field__check">사진만으로 판단하기 어려웠어요. 한 번 확인해 주세요.</p>}
      {children}
    </section>
  );
}
