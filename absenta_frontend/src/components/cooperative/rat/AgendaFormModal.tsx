import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input } from '../../ui';
import { Scale, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import type { CoopAgendaItem } from '../../../pages/cooperative/RatMeetingPage';
import {
  isStatutoryTapAgenda,
  getAgendaMinuteRequirement,
  cleanAgendaTitle,
  type AgendaMinuteObligation,
} from './ratAgendaClassifier';

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

  // Klasifikasi Yuridis (Wajib TAP & Kewajiban Notulensi)
  const [requiresTap, setRequiresTap] = useState(false);
  const [tapManuallyEdited, setTapManuallyEdited] = useState(false);
  const [minuteObligation, setMinuteObligation] = useState<AgendaMinuteObligation>('MANDATORY');
  const [minuteManuallyEdited, setMinuteManuallyEdited] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      const rawTitle = initialData.title || '';
      setTitle(cleanAgendaTitle(rawTitle));
      setPresenter(initialData.presenter || (initialData.description?.replace(/^Penyaji \/ Narasumber: /, '') || ''));
      setDurationMinutes(initialData.durationMinutes || initialData.durationMin || 30);
      setOrderIndex(initialData.orderIndex || initialData.order || 1);
      setStatus(initialData.status || (initialData.isCompleted ? 'COMPLETED' : 'PENDING'));
      setRequiresTap(isStatutoryTapAgenda(rawTitle));
      setMinuteObligation(getAgendaMinuteRequirement(rawTitle).obligation);
      setTapManuallyEdited(false);
      setMinuteManuallyEdited(false);
    } else {
      setTitle('');
      setPresenter('');
      setDurationMinutes(30);
      setOrderIndex(1);
      setStatus('PENDING');
      setRequiresTap(false);
      setMinuteObligation('MANDATORY');
      setTapManuallyEdited(false);
      setMinuteManuallyEdited(false);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Smart Auto-Sync: Jika belum diubah manual, sesuaikan otomatis dengan kata kunci
    if (!tapManuallyEdited) {
      setRequiresTap(isStatutoryTapAgenda(newTitle));
    }
    if (!minuteManuallyEdited) {
      setMinuteObligation(getAgendaMinuteRequirement(newTitle).obligation);
    }
  };

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

    // Rekonstruksi judul dengan tag klasifikasi bila diperlukan
    let finalTitle = cleanAgendaTitle(parseResult.data.title).trim();
    const naturalIsTap = isStatutoryTapAgenda(finalTitle);

    if (requiresTap && !naturalIsTap) {
      finalTitle = `${finalTitle} [TAP]`;
    } else if (!requiresTap && naturalIsTap) {
      finalTitle = `${finalTitle} [NON-TAP]`;
    }

    const naturalMinute = getAgendaMinuteRequirement(finalTitle).obligation;
    if (minuteObligation === 'CEREMONIAL' && naturalMinute !== 'CEREMONIAL') {
      finalTitle = `${finalTitle} [PROTOKOLER]`;
    } else if (minuteObligation === 'ADVISORY' && naturalMinute !== 'ADVISORY') {
      finalTitle = `${finalTitle} [ARAHAN]`;
    } else if (minuteObligation === 'MANDATORY' && naturalMinute !== 'MANDATORY') {
      finalTitle = `${finalTitle} [WAJIB-NOTULENSI]`;
    }

    saveMutation.mutate({
      title: finalTitle,
      presenter: parseResult.data.presenter,
      durationMinutes: parseResult.data.durationMinutes,
      order: parseResult.data.orderIndex,
      status: parseResult.data.status,
    });
  }, [title, presenter, durationMinutes, orderIndex, status, requiresTap, minuteObligation, saveMutation]);

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
            onChange={(e) => handleTitleChange(e.target.value)}
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

        {/* Klasifikasi Yuridis (Wajib TAP & Kewajiban Notulensi) */}
        <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Klasifikasi Yuridis Sidang</span>
          </div>

          {/* Checkbox Wajib TAP */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requiresTap}
              onChange={(e) => {
                setRequiresTap(e.target.checked);
                setTapManuallyEdited(true);
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Menghasilkan Surat Ketetapan (Wajib TAP RAT)</span>
                {requiresTap && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    TAP
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Saat agenda ini diselesaikan, sistem otomatis memicu draf Surat Ketetapan (TAP RAT) resmi.
              </p>
            </div>
          </label>

          {/* Pilihan Kewajiban Notulensi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Kewajiban Risalah / Notulensi</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'MANDATORY' as const, label: 'Wajib Notulensi', desc: 'Materi Inti' },
                { value: 'ADVISORY' as const, label: 'Catat Arahan', desc: 'Sambutan' },
                { value: 'CEREMONIAL' as const, label: 'Opsional', desc: 'Seremonial' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setMinuteObligation(item.value);
                    setMinuteManuallyEdited(true);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-left transition-all border ${
                    minuteObligation === item.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                  }`}
                >
                  <p className="text-[11px] font-bold leading-tight">{item.label}</p>
                  <p className={`text-[10px] leading-tight ${minuteObligation === item.value ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
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
