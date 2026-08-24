import React from 'react';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';

interface ProductImageUploadSectionProps {
  imageUrl: string;
  isUploadingImage: boolean;
  onRemoveImage: () => void;
  onCameraClick: () => void;
  onGalleryClick: () => void;
}

export const ProductImageUploadSection: React.FC<ProductImageUploadSectionProps> = React.memo(({
  imageUrl,
  isUploadingImage,
  onRemoveImage,
  onCameraClick,
  onGalleryClick
}) => {
  return (
    <div className="flex flex-col items-center justify-center pt-1 pb-2">
      <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden shadow-2xs group">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="Preview Barang"
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
            />
            <button
              type="button"
              aria-label="Hapus Foto"
              onClick={onRemoveImage}
              className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </>
        ) : isUploadingImage ? (
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        ) : (
          <ImageIcon size={36} className="text-slate-400 dark:text-slate-600" />
        )}
      </div>

      <div className="flex items-center gap-6 mt-2.5 text-slate-600 dark:text-slate-400">
        <button
          type="button"
          aria-label="Ambil Foto Kamera"
          onClick={onCameraClick}
          disabled={isUploadingImage}
          className="p-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-90 transition-transform cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <Camera size={20} />
        </button>
        <button
          type="button"
          aria-label="Pilih dari Galeri"
          onClick={onGalleryClick}
          disabled={isUploadingImage}
          className="p-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-90 transition-transform cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <ImageIcon size={20} />
        </button>
      </div>
    </div>
  );
});
