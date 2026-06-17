import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';

interface SupportCsatModalProps {
  isOpen: boolean;
  ticketNumber: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Sangat Buruk',
  2: 'Kurang Memuaskan',
  3: 'Cukup Baik',
  4: 'Sangat Baik & Ramah',
  5: 'Luar Biasa, Sangat Memuaskan!',
};

export default function SupportCsatModal({
  isOpen,
  ticketNumber,
  onClose,
  onSubmit,
}: SupportCsatModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Mohon berikan penilaian bintang terlebih dahulu.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      await onSubmit(rating, comment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengirimkan penilaian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Penilaian Layanan Support" size="md">
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-full inline-block">
            Tiket Teratasi: {ticketNumber}
          </p>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Bagaimana kualitas pelayanan kami hari ini?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Umpan balik Anda sangat berharga untuk meningkatkan stabilitas dan kenyamanan Absenta.id.
          </p>
        </div>

        {/* 🌟 5-Star Rating System */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-all duration-200 transform hover:scale-125 focus:outline-none"
                onClick={() => {
                  setRating(star);
                  setError(null);
                }}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= activeRating
                      ? 'text-amber-500 fill-amber-500 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Dynamic Descriptive Rating Label */}
          <div className="h-6 flex items-center justify-center">
            {activeRating > 0 ? (
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                {RATING_LABELS[activeRating]}
              </span>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Pilih jumlah bintang
              </span>
            )}
          </div>
        </div>

        {/* 📝 Ulasan Komentar */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
            Catatan Tambahan (Opsional)
          </label>
          <textarea
            className="w-full min-h-[90px] p-3 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600 transition-shadow resize-none"
            placeholder="Tulis kritik, saran, atau ucapan terima kasih kepada tim support kami..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting} type="button">
            Nanti Saja
          </Button>
          <Button
            variant="primary"
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
            type="submit"
            isLoading={submitting}
            disabled={rating === 0}
          >
            Kirim Penilaian
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
