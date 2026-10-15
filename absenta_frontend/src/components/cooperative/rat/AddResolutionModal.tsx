import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import type { CoopResolutionItem } from '../../../pages/cooperative/RatMeetingPage';

const resolutionSchema = z.object({
  resolutionNo: z.string().min(1, 'Nomor surat ketetapan wajib diisi'),
  subject: z.string().min(3, 'Perihal ketetapan minimal 3 karakter').max(150, 'Perihal maksimal 150 karakter'),
  summary: z.string().min(5, 'Ringkasan isi ketetapan minimal 5 karakter'),
  status: z.enum(['PASSED', 'REJECTED', 'AMENDED']),
  documentUrl: z.string().optional(),
});

export interface AddResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  initialData?: CoopResolutionItem | null;
  onSuccess?: () => void;
}

export const AddResolutionModal: React.FC<AddResolutionModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  initialData,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(initialData);

  const [resolutionNo, setResolutionNo] = useState('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'PASSED' | 'REJECTED' | 'AMENDED'>('PASSED');
  const [documentUrl, setDocumentUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setResolutionNo(initialData.resolutionNo || '');
      setSubject(initialData.subject || '');
      setSummary(initialData.summary || '');
      setStatus(initialData.status || 'PASSED');
      setDocumentUrl(initialData.documentUrl || '');
    } else {
      setResolutionNo('');
      setSubject('');
      setSummary('');
      setStatus('PASSED');
      setDocumentUrl('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { resolutionNo: string; subject: string; summary: string; status: 'PASSED' | 'REJECTED' | 'AMENDED'; documentUrl?: string }) => {
      if (isEditing && initialData?.id) {
        const res = await api.put(`/cooperative/rat/${meetingId}/resolutions/${initialData.id}`, payload);
        return res.data;
      } else {
        const res = await api.post(`/cooperative/rat/${meetingId}/resolutions`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success(isEditing ? 'Ketetapan resmi RAT berhasil diperbarui!' : 'Ketetapan resmi RAT berhasil didokumentasikan!');
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

    saveMutation.mutate({
      resolutionNo: parseResult.data.resolutionNo,
      subject: parseResult.data.subject,
      summary: parseResult.data.summary,
      status: parseResult.data.status,
      documentUrl: parseResult.data.documentUrl,
    });
  }, [resolutionNo, subject, summary, status, documentUrl, saveMutation]);

  const isPending = saveMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Ubah Surat Ketetapan Resmi RAT' : 'Catat Surat Ketetapan Resmi RAT'}
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
            Ringkasan Putusan / Amar Ketetapan <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="res-summary"
            aria-label="Ringkasan Putusan"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Tuliskan poin-poin keputusan resmi yang telah disepakati oleh anggota..."
            rows={4}
            disabled={isPending}
            className="w-full"
          />
          {errors.summary && <p className="text-xs text-red-500 mt-1">{errors.summary}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="res-status" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Status Putusan
            </label>
            <select
              id="res-status"
              aria-label="Status Putusan"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={isPending}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PASSED">Disahkan (Passed)</option>
              <option value="AMENDED">Disahkan Dengan Catatan (Amended)</option>
              <option value="REJECTED">Ditolak (Rejected)</option>
            </select>
          </div>

          <div>
            <label htmlFor="res-doc" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              URL Dokumen SK (Opsional)
            </label>
            <Input
              id="res-doc"
              aria-label="URL Dokumen SK"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://..."
              disabled={isPending}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
          >
            {isPending ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Dokumentasikan Ketetapan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

AddResolutionModal.displayName = 'AddResolutionModal';
