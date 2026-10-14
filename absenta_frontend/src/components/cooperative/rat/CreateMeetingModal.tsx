import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';

const meetingSchema = z.object({
  title: z.string().min(3, 'Judul rapat minimal 3 karakter').max(150, 'Judul rapat maksimal 150 karakter'),
  year: z.number().int().min(2000, 'Tahun buku tidak valid').max(2100, 'Tahun buku tidak valid'),
  meetingDate: z.string().min(1, 'Tanggal pelaksanaan wajib ditentukan'),
  description: z.string().optional(),
});

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = React.memo(({
  isOpen,
  onClose,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  
  const [title, setTitle] = useState(`Rapat Anggota Tahunan (RAT) Tahun Buku ${currentYear - 1}`);
  const [year, setYear] = useState<number>(currentYear - 1);
  const [meetingDate, setMeetingDate] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; year: number; meetingDate: string; description?: string }) => {
      const res = await api.post('/cooperative/rat', payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient);
      toast.success('Sidang Rapat Anggota Tahunan berhasil diagendakan!');
      onClose();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal membuat agenda RAT';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parseResult = meetingSchema.safeParse({
      title,
      year: Number(year),
      meetingDate,
      description,
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
      title: parseResult.data.title,
      year: parseResult.data.year,
      meetingDate: parseResult.data.meetingDate,
      description: parseResult.data.description,
    });
  }, [title, year, meetingDate, description, createMutation]);

  const isPending = createMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendakan Sidang Rapat Anggota (RAT)"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="rat-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Nama / Judul Sidang RAT <span className="text-red-500">*</span>
          </label>
          <Input
            id="rat-title"
            aria-label="Judul Sidang RAT"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Rapat Anggota Tahunan (RAT) Tahun Buku 2025"
            disabled={isPending}
            className="w-full"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rat-year" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Tahun Buku Koperasi <span className="text-red-500">*</span>
            </label>
            <Input
              id="rat-year"
              type="number"
              aria-label="Tahun Buku"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={isPending}
              className="w-full"
            />
            {errors.year && <p className="text-xs text-red-500 mt-1">{errors.year}</p>}
          </div>

          <div>
            <label htmlFor="rat-date" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Jadwal Pelaksanaan Sidang <span className="text-red-500">*</span>
            </label>
            <Input
              id="rat-date"
              type="datetime-local"
              aria-label="Tanggal dan Waktu RAT"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              disabled={isPending}
              className="w-full"
            />
            {errors.meetingDate && <p className="text-xs text-red-500 mt-1">{errors.meetingDate}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="rat-description" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Keterangan / Lokasi & Format Sidang
          </label>
          <Textarea
            id="rat-description"
            aria-label="Keterangan Sidang"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Aula Graha Cendekia & Hybrid Online via Portal Koperasi"
            rows={3}
            disabled={isPending}
            className="w-full"
          />
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
          <strong>Catatan Hukum UU Perkoperasian:</strong> Saat status rapat dibuka menjadi <em>REGISTRATION_OPEN</em>, sistem akan otomatis mengunci snapshot seluruh anggota aktif koperasi sebagai basis penentuan kuorum sah rapat (50% + 1).
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
            Agendakan Sidang
          </Button>
        </div>
      </form>
    </Modal>
  );
});

CreateMeetingModal.displayName = 'CreateMeetingModal';
