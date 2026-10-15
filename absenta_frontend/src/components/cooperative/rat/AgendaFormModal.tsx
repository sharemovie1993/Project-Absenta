import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import type { CoopAgendaItem } from '../../../pages/cooperative/RatMeetingPage';

const agendaSchema = z.object({
  title: z.string().min(2, 'Judul butir acara minimal 2 karakter').max(150, 'Judul maksimal 150 karakter'),
  presenter: z.string().optional(),
  durationMinutes: z.number().int().min(1, 'Durasi minimal 1 menit').max(360, 'Durasi maksimal 360 menit'),
  orderIndex: z.number().int().min(1).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

export interface AgendaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  initialData?: CoopAgendaItem | null;
  onSuccess?: () => void;
}

export const AgendaFormModal: React.FC<AgendaFormModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  initialData,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [presenter, setPresenter] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [orderIndex, setOrderIndex] = useState(1);
  const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('PENDING');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setPresenter(initialData.presenter || (initialData.description?.replace(/^Penyaji \/ Narasumber: /, '') || ''));
      setDurationMinutes(initialData.durationMinutes || initialData.durationMin || 30);
      setOrderIndex(initialData.orderIndex || initialData.order || 1);
      setStatus(initialData.status || (initialData.isCompleted ? 'COMPLETED' : 'PENDING'));
    } else {
      setTitle('');
      setPresenter('');
      setDurationMinutes(30);
      setOrderIndex(1);
      setStatus('PENDING');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { title: string; presenter?: string; durationMinutes: number; order?: number; status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' }) => {
      if (isEditing && initialData?.id) {
        const res = await api.put(`/cooperative/rat/${meetingId}/agendas/${initialData.id}`, payload);
        return res.data;
      } else {
        const res = await api.post(`/cooperative/rat/${meetingId}/agendas`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success(isEditing ? 'Butir acara agenda berhasil diperbarui!' : 'Butir acara agenda berhasil ditambahkan!');
      onClose();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan butir acara';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parseResult = agendaSchema.safeParse({
      title,
      presenter: presenter || undefined,
      durationMinutes: Number(durationMinutes),
      orderIndex: Number(orderIndex),
      status,
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
      title: parseResult.data.title,
      presenter: parseResult.data.presenter,
      durationMinutes: parseResult.data.durationMinutes,
      order: parseResult.data.orderIndex,
      status: parseResult.data.status,
    });
  }, [title, presenter, durationMinutes, orderIndex, status, saveMutation]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Ubah Butir Acara Sidang RAT' : 'Tambah Butir Acara Sidang RAT'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Judul Butir Acara / Agenda <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Pembacaan Laporan Pertanggungjawaban (LPJ) Pengurus"
            className="w-full text-sm"
            disabled={saveMutation.isPending}
          />
          {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alokasi Durasi (Menit) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={1}
              max={360}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full text-sm font-mono"
              disabled={saveMutation.isPending}
            />
            {errors.durationMinutes && <p className="text-[11px] text-red-500 mt-1">{errors.durationMinutes}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Urutan
            </label>
            <Input
              type="number"
              min={1}
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              className="w-full text-sm font-mono"
              disabled={saveMutation.isPending}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Narasumber / Penyaji (Opsional)
          </label>
          <Input
            value={presenter}
            onChange={(e) => setPresenter(e.target.value)}
            placeholder="Contoh: Ketua Koperasi / Tim Pengawas"
            className="w-full text-sm"
            disabled={saveMutation.isPending}
          />
        </div>

        {isEditing && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Status Acara
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={saveMutation.isPending}
            >
              <option value="PENDING">Menunggu (Belum Dimulai)</option>
              <option value="IN_PROGRESS">Sedang Berlangsung (Aktif di TV)</option>
              <option value="COMPLETED">Selesai Dibahas</option>
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambahkan Acara'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

AgendaFormModal.displayName = 'AgendaFormModal';
