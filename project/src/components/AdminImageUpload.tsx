import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import heic2any from 'heic2any';

interface AdminImageUploadProps {
  productId: string;
  currentImageUrl?: string;
  onUpload: (file: File) => Promise<void>;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp';

async function prepareImageFile(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (!isHeic) return file;

  const jpegBlob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.88,
  }) as Blob;

  const newName = file.name
    .replace(/\.heic$/i, '.jpg')
    .replace(/\.heif$/i, '.jpg');

  return new File([jpegBlob], newName, { type: 'image/jpeg' });
}

type UploadState = 'idle' | 'converting' | 'uploading' | 'done' | 'error';

export default function AdminImageUpload({ productId: _productId, currentImageUrl, onUpload }: AdminImageUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');

    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');

    try {
      setState(isHeic ? 'converting' : 'uploading');

      const prepared = await prepareImageFile(file);

      const localUrl = URL.createObjectURL(prepared);
      setPreviewUrl(localUrl);

      setState('uploading');
      await onUpload(prepared);
      setState('done');

      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }

    if (inputRef.current) inputRef.current.value = '';
  }

  const buttonLabel: Record<UploadState, string> = {
    idle: 'Change Photo',
    converting: 'Converting…',
    uploading: 'Uploading…',
    done: 'Saved',
    error: 'Try Again',
  };

  const isDisabled = state === 'converting' || state === 'uploading';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-24 h-24 rounded-xl bg-[--color-bg] border border-[--color-border] overflow-hidden flex items-center justify-center shrink-0">
        {previewUrl ? (
          <img src={previewUrl} alt="Product" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-8 h-8 text-[--color-muted] opacity-30" />
        )}
      </div>

      <div className="text-center">
        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors
          ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[--color-primary] hover:bg-[--color-primary-dark] text-white'}`}>
          {state === 'converting' || state === 'uploading' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : state === 'done' ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : state === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {buttonLabel[state]}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            disabled={isDisabled}
            className="hidden"
          />
        </label>
        {errorMsg && (
          <p className="text-red-500 text-xs mt-1 max-w-[160px]">{errorMsg}</p>
        )}
        <p className="text-[--color-muted] text-[10px] mt-1">HEIC, JPG, PNG, WebP</p>
      </div>
    </div>
  );
}
