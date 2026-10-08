import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from '../../components/icons';

interface UploadFieldProps {
  /** 미리보기 이미지 (정규화된 data URL) */
  value?: string;
  /** 파일을 받아 서비스 규격으로 바꾼다 */
  process: (file: File) => Promise<string>;
  onChange: (dataUrl: string) => void;
  /** 휴대폰에서 바로 촬영 (셀카는 전면 카메라) */
  camera?: 'user' | 'environment';
  alt: string;
  shape: 'portrait' | 'free';
}

export function UploadField({ value, process, onChange, camera, alt, shape }: UploadFieldProps) {
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await process(file));
    } catch {
      setError('이 사진은 열 수 없어요. JPG나 PNG 사진으로 다시 올려 주세요.');
    } finally {
      setBusy(false);
      if (pickRef.current) pickRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  return (
    <div className="upload">
      <button
        type="button"
        className={`upload__drop upload__drop--${shape}${value ? ' has-image' : ''}`}
        onClick={() => pickRef.current?.click()}
        aria-label={value ? '다른 사진 선택' : '사진 선택'}
        disabled={busy}
      >
        {value ? (
          <img src={value} alt={alt} />
        ) : (
          <span className="upload__empty">
            <CameraIcon />
            <span>{busy ? '사진을 준비하고 있어요…' : '눌러서 사진 선택'}</span>
          </span>
        )}
      </button>
      <div className="upload__buttons">
        <button type="button" className="pill pill--ghost" onClick={() => pickRef.current?.click()} disabled={busy}>
          {value ? '다른 사진 선택' : '앨범에서 선택'}
        </button>
        {camera && touch && (
          <button type="button" className="pill pill--ghost" onClick={() => cameraRef.current?.click()} disabled={busy}>
            카메라로 촬영
          </button>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <input ref={pickRef} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files?.[0])} />
      {camera && <input ref={cameraRef} type="file" accept="image/*" capture={camera} hidden onChange={(e) => handle(e.target.files?.[0])} />}
    </div>
  );
}
