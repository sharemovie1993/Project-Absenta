import React, { useState } from 'react';
import { ZoomIn, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CbtContentRendererProps {
  content: string;
  imageUrl?: string | null;
  className?: string;
  imageAlt?: string;
}

export const CbtContentRenderer: React.FC<CbtContentRendererProps> = ({
  content,
  imageUrl,
  className,
  imageAlt = 'Stimulus Soal',
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Sederhana namun aman: render teks dengan pemisahan baris dan format formula dasar
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    return text.split('\n').map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Teks Pertanyaan / Konten */}
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {renderFormattedText(content)}
      </div>

      {/* Gambar Stimulus / Ilustrasi jika ada */}
      {imageUrl && (
        <div className="mt-3 inline-block">
          <div className="relative group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white p-1.5 max-w-md shadow-xs">
            <img
              src={imageUrl}
              alt={imageAlt}
              decoding="async"
              className="max-h-64 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02] cursor-pointer bg-white"
              onClick={() => setIsZoomOpen(true)}
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              aria-label="Perbesar gambar"
              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center gap-1 text-[10px] font-bold"
            >
              <ZoomIn size={14} />
              <span>Perbesar</span>
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {isZoomOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white p-3 rounded-2xl shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label="Tutup pratinjau gambar"
              className="absolute -top-3 -right-3 p-2 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
            >
              <X size={16} />
            </button>
            <img
              src={imageUrl}
              alt={imageAlt}
              decoding="async"
              className="max-h-[80vh] w-auto object-contain rounded-xl bg-white"
            />
            <div className="py-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <ImageIcon size={14} />
              <span>{imageAlt}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
