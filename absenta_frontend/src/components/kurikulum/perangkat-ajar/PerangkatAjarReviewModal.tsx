import React from 'react';
import { Modal, Button, SearchableSelect } from '../../ui';
import { z } from 'zod';

export const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  catatan_reviewer: z.string().optional()
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

interface PerangkatAjarReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewForm: {
    status: 'APPROVED' | 'REJECTED';
    catatan_reviewer: string;
  };
  setReviewForm: React.Dispatch<React.SetStateAction<{
    status: 'APPROVED' | 'REJECTED';
    catatan_reviewer: string;
  }>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PerangkatAjarReviewModal({
  isOpen,
  onClose,
  reviewForm,
  setReviewForm,
  isSubmitting,
  onSubmit,
}: PerangkatAjarReviewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verifikasi Perangkat Ajar Guru"
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="review-status" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Status Persetujuan <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="review-status"
            value={reviewForm.status}
            onValueChange={(val) => setReviewForm((prev) => ({ ...prev, status: val as 'APPROVED' | 'REJECTED' }))}
            options={[
              { label: 'Disetujui (APPROVED)', value: 'APPROVED' },
              { label: 'Perlu Revisi (REJECTED)', value: 'REJECTED' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="catatan-reviewer" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Catatan Verifikator / Masukan Revisi
          </label>
          <textarea
            id="catatan-reviewer"
            rows={3}
            value={reviewForm.catatan_reviewer}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, catatan_reviewer: e.target.value }))}
            placeholder="Berikan catatan perbaikan atau rekomendasi untuk guru..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
            BATAL
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            disabled={isSubmitting}
            className="rounded-xl font-bold"
          >
            {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN VERIFIKASI'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
