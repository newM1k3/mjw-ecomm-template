import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, Camera, X, Image as ImageIcon } from 'lucide-react';
import heic2any from 'heic2any';
import ConditionBadge from './ConditionBadge';

interface AdminImageUploadProps {
  productId: string;
  productName: string;
  productCategory: string;
  conditionRating: string;
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
  const jpegBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.88 }) as Blob;
  const newName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
  return new File([jpegBlob], newName, { type: 'image/jpeg' });
}

type ModalState = 'idle' | 'file_selected' | 'converting' | 'ready_to_upload' | 'uploading' | 'done' | 'error';

export default function AdminImageUpload({
  productId: _productId,
  productName,
  productCategory,
  conditionRating,
  currentImageUrl,
  onUpload,
}: AdminImageUploadProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(currentImageUrl ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openModal() {
    setModalState('idle');
    setPreviewUrl('');
    setPendingFile(null);
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    if (modalState === 'uploading' || modalState === 'converting') return;
    setModalOpen(false);
    setModalState('idle');
    setPreviewUrl('');
    setPendingFile(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setErrorMsg('');
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');

    try {
      setModalState(isHeic ? 'converting' : 'file_selected');
      const prepared = await prepareImageFile(file);
      const url = URL.createObjectURL(prepared);
      setPreviewUrl(url);
      setPendingFile(prepared);
      setModalState('ready_to_upload');
    } catch (err) {
      setModalState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to read image. Please try again.');
    }
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setModalState('uploading');
    setErrorMsg('');
    try {
      await onUpload(pendingFile);
      setThumbnailUrl(previewUrl);
      setModalState('done');
      setTimeout(() => {
        setModalOpen(false);
        setModalState('idle');
        setPreviewUrl('');
        setPendingFile(null);
      }, 2000);
    } catch (err) {
      setModalState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }

  function handleChooseDifferent() {
    setPreviewUrl('');
    setPendingFile(null);
    setModalState('idle');
    setErrorMsg('');
    triggerFilePicker();
  }

  const displayPreview = previewUrl || thumbnailUrl;
  const modalPreview = previewUrl || thumbnailUrl;

  return (
    <>
      {/* Compact list thumbnail */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button
          onClick={openModal}
          className="w-24 h-24 rounded-xl bg-[--color-bg] border-2 border-[--color-border] hover:border-[--color-primary] overflow-hidden flex items-center justify-center transition-colors group relative"
          title="Click to upload photo"
        >
          {displayPreview ? (
            <img src={displayPreview} alt={productName} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-[--color-muted] opacity-30 group-hover:opacity-60 transition-opacity" />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
        <button
          onClick={openModal}
          className="text-[10px] font-semibold text-[--color-primary] hover:text-[--color-primary-dark] transition-colors"
        >
          {thumbnailUrl ? 'Change Photo' : 'Upload Photo'}
        </button>
      </div>

      {/* Modal overlay */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b border-[--color-border]">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-[--color-text] text-base leading-tight truncate">{productName}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-[--color-muted]">{productCategory}</span>
                  <ConditionBadge rating={conditionRating} />
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={modalState === 'uploading' || modalState === 'converting'}
                className="p-1.5 hover:bg-[--color-bg] rounded-lg transition-colors text-[--color-muted] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Large preview area */}
            <div className="bg-[--color-bg] mx-5 mt-5 rounded-xl overflow-hidden" style={{ height: '280px' }}>
              {modalPreview ? (
                <img src={modalPreview} alt={productName} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[--color-muted]">
                  <ImageIcon className="w-14 h-14 opacity-20 mb-2" />
                  <p className="text-sm opacity-40">No photo yet</p>
                </div>
              )}
            </div>

            {/* Status / action area */}
            <div className="p-5 space-y-3">

              {/* Converting state */}
              {modalState === 'converting' && (
                <div className="flex items-center justify-center gap-2 py-3 text-amber-700 bg-amber-50 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Converting HEIC to JPEG…</span>
                </div>
              )}

              {/* Uploading state */}
              {modalState === 'uploading' && (
                <div className="flex items-center justify-center gap-2 py-3 text-[--color-primary] bg-[--color-bg] rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Uploading…</span>
                </div>
              )}

              {/* Done state */}
              {modalState === 'done' && (
                <div className="flex items-center justify-center gap-2 py-3 text-green-700 bg-green-50 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Saved</span>
                </div>
              )}

              {/* Error state */}
              {modalState === 'error' && (
                <>
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{errorMsg}</p>
                  </div>
                  <button
                    onClick={triggerFilePicker}
                    className="w-full flex items-center justify-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Try Again
                  </button>
                </>
              )}

              {/* Ready to upload — show confirm + choose different */}
              {modalState === 'ready_to_upload' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleChooseDifferent}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-[--color-border] hover:border-[--color-primary] text-[--color-text] font-semibold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Choose Different
                  </button>
                  <button
                    onClick={handleUpload}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Upload This Photo
                  </button>
                </div>
              )}

              {/* Idle — show choose photo */}
              {(modalState === 'idle' || modalState === 'file_selected') && (
                <button
                  onClick={triggerFilePicker}
                  className="w-full flex items-center justify-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Choose Photo
                </button>
              )}

              <p className="text-center text-[--color-muted] text-xs">Accepts HEIC, JPG, PNG, WebP</p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      )}
    </>
  );
}
