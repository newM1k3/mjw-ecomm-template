import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, Camera, X, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import heic2any from 'heic2any';
import pb from '../lib/pocketbase';
import ConditionBadge from './ConditionBadge';
import { Product } from '../lib/types';

interface AdminImageUploadProps {
  product: Product;
  onAddImages: (files: File[]) => Promise<void>;
  onRemoveImage: (filename: string) => Promise<void>;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp';
const MAX_PHOTOS = 4;

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

function getImageUrl(product: Product, filename: string): string {
  try {
    return pb.files.getURL(product, filename);
  } catch {
    return '';
  }
}

type UploadState = 'idle' | 'converting' | 'ready' | 'uploading' | 'done' | 'error';

export default function AdminImageUpload({ product, onAddImages, onRemoveImage }: AdminImageUploadProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingImages: string[] = Array.isArray(product.image) ? product.image : (product.image ? [product.image] : []);
  const slotsRemaining = MAX_PHOTOS - existingImages.length;
  const primaryImageUrl = existingImages.length > 0 ? getImageUrl(product, existingImages[0]) : '';

  function openModal() {
    setUploadState('idle');
    setPendingFiles([]);
    setPendingPreviews([]);
    setErrorMsg('');
    setActivePreviewIdx(0);
    setModalOpen(true);
  }

  function closeModal() {
    if (uploadState === 'uploading' || uploadState === 'converting') return;
    setModalOpen(false);
    setUploadState('idle');
    setPendingFiles([]);
    setPendingPreviews(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return []; });
    setErrorMsg('');
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const canAdd = MAX_PHOTOS - existingImages.length - pendingFiles.length;
    const toProcess = selected.slice(0, canAdd);

    setErrorMsg('');
    setUploadState('converting');
    try {
      const prepared = await Promise.all(toProcess.map(prepareImageFile));
      const previews = prepared.map(f => URL.createObjectURL(f));
      setPendingFiles(prev => [...prev, ...prepared]);
      setPendingPreviews(prev => [...prev, ...previews]);
      setUploadState('ready');
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to read image. Please try again.');
    }
  }

  function removePending(idx: number) {
    URL.revokeObjectURL(pendingPreviews[idx]);
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
    setPendingPreviews(prev => prev.filter((_, i) => i !== idx));
    if (pendingFiles.length - 1 === 0) setUploadState('idle');
  }

  async function handleUpload() {
    if (!pendingFiles.length) return;
    setUploadState('uploading');
    setErrorMsg('');
    try {
      await onAddImages(pendingFiles);
      setUploadState('done');
      pendingPreviews.forEach(u => URL.revokeObjectURL(u));
      setTimeout(() => {
        setModalOpen(false);
        setUploadState('idle');
        setPendingFiles([]);
        setPendingPreviews([]);
      }, 1500);
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }

  async function handleDelete(filename: string) {
    setDeletingFilename(filename);
    try {
      await onRemoveImage(filename);
    } finally {
      setDeletingFilename(null);
    }
  }

  const allPreviewUrls = [
    ...existingImages.map(fn => getImageUrl(product, fn)),
    ...pendingPreviews,
  ];

  return (
    <>
      {/* Compact list thumbnail — shows primary image or camera placeholder */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <button
          onClick={openModal}
          className="w-24 h-24 rounded-xl bg-[--color-bg] border-2 border-[--color-border] hover:border-[--color-primary] overflow-hidden flex items-center justify-center transition-colors group relative"
          title="Manage photos"
        >
          {primaryImageUrl ? (
            <img src={primaryImageUrl} alt={product.brand_model} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-[--color-muted] opacity-30 group-hover:opacity-60 transition-opacity" />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {existingImages.length > 1 && (
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-bold rounded px-1 leading-4">
              {existingImages.length}
            </span>
          )}
        </button>
        <button
          onClick={openModal}
          className="text-[10px] font-semibold text-[--color-primary] hover:text-[--color-primary-dark] transition-colors"
        >
          {existingImages.length > 0 ? `${existingImages.length}/${MAX_PHOTOS} Photos` : 'Upload Photo'}
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[--color-border]">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-[--color-text] text-base leading-tight truncate">{product.brand_model}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-[--color-muted]">{product.category}</span>
                  <ConditionBadge rating={product.condition_rating} />
                  <span className="text-xs text-[--color-muted]">
                    {existingImages.length + pendingFiles.length}/{MAX_PHOTOS} photos
                  </span>
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={uploadState === 'uploading' || uploadState === 'converting'}
                className="p-1.5 hover:bg-[--color-bg] rounded-lg transition-colors text-[--color-muted] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Large preview */}
            <div className="bg-[--color-bg] mx-5 mt-5 rounded-xl overflow-hidden" style={{ height: '260px' }}>
              {allPreviewUrls.length > 0 ? (
                <img
                  src={allPreviewUrls[Math.min(activePreviewIdx, allPreviewUrls.length - 1)]}
                  alt={product.brand_model}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[--color-muted]">
                  <ImageIcon className="w-14 h-14 opacity-20 mb-2" />
                  <p className="text-sm opacity-40">No photos yet</p>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {allPreviewUrls.length > 0 && (
              <div className="flex gap-2 px-5 pt-3 overflow-x-auto pb-1">
                {/* Existing images */}
                {existingImages.map((fn, idx) => (
                  <div
                    key={fn}
                    className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${activePreviewIdx === idx ? 'border-[--color-primary]' : 'border-[--color-border] hover:border-[--color-primary]/50'}`}
                    onClick={() => setActivePreviewIdx(idx)}
                  >
                    <img src={getImageUrl(product, fn)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(fn); }}
                      disabled={deletingFilename === fn}
                      className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors disabled:opacity-50"
                      title="Remove photo"
                    >
                      {deletingFilename === fn
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
                    </button>
                  </div>
                ))}

                {/* Pending (not yet uploaded) images */}
                {pendingPreviews.map((url, idx) => {
                  const globalIdx = existingImages.length + idx;
                  return (
                    <div
                      key={url}
                      className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-colors border-amber-400 ${activePreviewIdx === globalIdx ? 'ring-2 ring-amber-400' : ''}`}
                      onClick={() => setActivePreviewIdx(globalIdx)}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover opacity-80" />
                      <button
                        onClick={e => { e.stopPropagation(); removePending(idx); }}
                        className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                        title="Remove from queue"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold text-white bg-amber-500/80 py-0.5">
                        Pending
                      </span>
                    </div>
                  );
                })}

                {/* Add slot — shown when under the limit */}
                {existingImages.length + pendingFiles.length < MAX_PHOTOS && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-[--color-border] hover:border-[--color-primary] flex items-center justify-center transition-colors text-[--color-muted] hover:text-[--color-primary]"
                    title="Add photo"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Action area */}
            <div className="p-5 space-y-3">

              {uploadState === 'converting' && (
                <div className="flex items-center justify-center gap-2 py-3 text-amber-700 bg-amber-50 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Converting HEIC to JPEG…</span>
                </div>
              )}

              {uploadState === 'uploading' && (
                <div className="flex items-center justify-center gap-2 py-3 text-[--color-primary] bg-[--color-bg] rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Uploading {pendingFiles.length} photo{pendingFiles.length > 1 ? 's' : ''}…</span>
                </div>
              )}

              {uploadState === 'done' && (
                <div className="flex items-center justify-center gap-2 py-3 text-green-700 bg-green-50 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Saved</span>
                </div>
              )}

              {uploadState === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{errorMsg}</p>
                </div>
              )}

              {/* Upload pending photos */}
              {pendingFiles.length > 0 && uploadState !== 'uploading' && uploadState !== 'done' && (
                <button
                  onClick={handleUpload}
                  className="w-full flex items-center justify-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload {pendingFiles.length} Photo{pendingFiles.length > 1 ? 's' : ''}
                </button>
              )}

              {/* Add photos button — shown when no pending files and slots remain */}
              {pendingFiles.length === 0 && uploadState !== 'uploading' && uploadState !== 'done' && slotsRemaining > 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-[--color-primary] hover:bg-[--color-primary-dark] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {existingImages.length === 0 ? 'Choose Photo' : `Add Photo (${slotsRemaining} slot${slotsRemaining > 1 ? 's' : ''} left)`}
                </button>
              )}

              {slotsRemaining === 0 && pendingFiles.length === 0 && uploadState !== 'done' && (
                <p className="text-center text-xs text-[--color-muted]">
                  Maximum of {MAX_PHOTOS} photos reached. Remove a photo to add another.
                </p>
              )}

              <p className="text-center text-[--color-muted] text-xs">Accepts HEIC, JPG, PNG, WebP · Max {MAX_PHOTOS} photos</p>
            </div>

            {/* Hidden file input — multiple allowed */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      )}
    </>
  );
}
