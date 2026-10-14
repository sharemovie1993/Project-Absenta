import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';

const resolutionSchema = z.object({
  resolutionNo: z.string().min(1, 'Nomor surat ketetapan wajib diisi'),
  subject: z.string().min(3, 'Perihal ketetapan minimal 3 karakter').max(150, 'Perihal maksimal 150 karakter'),
  summary: z.string().min(5, 'Ringkasan isi ketetapan minimal 5 karakter'),
  status: z.enum(['PASSED', 'REJECTED', 'AMENDED']),
  documentUrl: z.string().optional(),
});

interface AddResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  onSuccess?: () => void;
}

export const AddResolutionModal: React.FC<AddResolutionModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [resolutionNo, setResolutionNo] = useState('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'PASSED' | 'REJECTED' | 'AMENDED'>('PASSED');
  const [documentUrl, setDocumentUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async (payload: { resolutionNo: string; subject: string; summary: string; status: 'PASSED' | 'REJECTED' | 'AMENDED'; documentUrl?: string }) => {
      const res = await api.post(`/cooperative/rat/${meetingId}/resolutions`, payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Ketetapan resmi RAT berhasil didokumentasikan!');
      setResolutionNo('');
      setSubject('');
      setSummary('');
      setDocumentUrl('');
      onClose();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan ketetapan';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parseResult = resolutionSchema.safeParse({
      resolutionNo,
      subject,
      summary,
      status,
      documentUrl: documentUrl || undefined,
    });

    if (!parseResult.success) {
      const newErrors: Record<string, string> = {};
      parseResult.error.issues.forEach(issue => {
        const key = issue.path[0];
        if (typeof key === 'string') {
          newErrors[key] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    createMutation.mutate({
      resolutionNo: parseResult.data.resolutionNo,
      subject: parseResult.data.subject,
      summary: parseResult.data.summary,
      status: parseResult.data.status,
      documentUrl: parseResult.data.documentUrl,
    });
  }, [resolutionNo, subject, summary, status, documentUrl, createMutation]);

  const isPending = createMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Surat Ketetapan Resmi RAT"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="res-no" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Nomor Ketetapan <span className="text-red-500">*</span>
          </label>
          <Input
            id="res-no"
            aria-label="Nomor Ketetapan"
            value={resolutionNo}
            onChange={(e) => setResolutionNo(e.target.value)}
            placeholder="Contoh: TAP-01/RAT/KOP-SMK/2026"
            disabled={isPending}
            className="w-full"
          />
          {errors.resolutionNo && <p className="text-xs text-red-500 mt-1">{errors.resolutionNo}</p>}
        </div>

        <div>
          <label htmlFor="res-subject" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Perihal / Pokok Ketetapan <span className="text-red-500">*</span>
          </label>
          <Input
            id="res-subject"
            aria-label="Perihal Ketetapan"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Pengesahan Laporan Pertanggungjawaban Pengurus & Pengawas"
            disabled={isPending}
            className="w-full"
          />
          {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
        </div>

        <div>
          <label htmlFor="res-summary" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Ringkasan Amar Putusan Sidang <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="res-summary"
            aria-label="Ringkasan Putusan"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Tuliskan secara ringkas amar keputusan yang telah disepakati oleh seluruh peserta sidang..."
            rows={3}
            disabled={isPending}
            className="w-full"
          />
          {errors.summary && <p className="text-xs text-red-500 mt-1">{errors.summary}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="res-status" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Hasil Putusan Sidang
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('PASSED')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  status === 'PASSED'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Disahkan
              </button>
              <button
                type="button"
                onClick={() => setStatus('AMENDED')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  status === 'AMENDED'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Dengan Catatan
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="res-doc" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Tautan Dokumen Risalah / PDF
            </label>
            <Input
              id="res-doc"
              aria-label="Tautan Dokumen Risalah"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://... atau /uploads/..."
              disabled={isPending}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={isPending}
            disabled={isPending}
          >
            Simpan Ketetapan Resmi
          </Button>
        </div>
      </form>
    </Modal>
  );
});

AddResolutionModal.displayName = 'AddResolutionModal';
