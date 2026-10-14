import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import { Plus, Trash2 } from 'lucide-react';

const sessionSchema = z.object({
  title: z.string().min(3, 'Judul pemungutan suara minimal 3 karakter').max(150, 'Judul maksimal 150 karakter'),
  description: z.string().optional(),
  options: z.array(z.object({
    title: z.string().min(1, 'Nama opsi wajib diisi'),
    description: z.string().optional(),
  })).min(2, 'Minimal harus terdapat 2 opsi pilihan pemungutan suara'),
});

interface CreateVotingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  onSuccess?: () => void;
}

export const CreateVotingSessionModal: React.FC<CreateVotingSessionModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<{ title: string; description: string }[]>([
    { title: 'Setuju / Diterima', description: 'Menyetujui dan mengesahkan' },
    { title: 'Menolak / Perlu Revisi', description: 'Menolak pengesahan agenda' }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddOption = useCallback(() => {
    setOptions(prev => [...prev, { title: '', description: '' }]);
  }, []);

  const handleRemoveOption = useCallback((index: number) => {
    setOptions(prev => {
      if (prev.length <= 2) {
        toast.error('Minimal harus ada 2 opsi pilihan');
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  const handleOptionChange = useCallback((index: number, field: 'title' | 'description', val: string) => {
    setOptions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; description?: string; options: { title: string; description?: string }[] }) => {
      const res = await api.post(`/cooperative/rat/${meetingId}/voting-sessions`, payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Sesi pemungutan suara e-Voting berhasil dibuat!');
      setTitle('');
      setDescription('');
      onClose();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal membuat sesi voting';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parseResult = sessionSchema.safeParse({
      title,
      description,
      options: options.map(o => ({
        title: o.title.trim(),
        description: o.description.trim() || undefined
      }))
    });

    if (!parseResult.success) {
      const newErrors: Record<string, string> = {};
      parseResult.error.issues.forEach(issue => {
        const key = issue.path.join('_');
        newErrors[key] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    createMutation.mutate({
      title: parseResult.data.title,
      description: parseResult.data.description,
      options: parseResult.data.options,
    });
  }, [title, description, options, createMutation]);

  const isPending = createMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buka Sesi e-Voting Sidang RAT"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="voting-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Judul / Pokok Pemungutan Suara <span className="text-red-500">*</span>
          </label>
          <Input
            id="voting-title"
            aria-label="Judul Sesi Voting"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Pengesahan Laporan Pertanggungjawaban (LPJ) Pengurus Tahun Buku 2025"
            disabled={isPending}
            className="w-full"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="voting-desc" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Keterangan & Rujukan Keputusan
          </label>
          <Textarea
            id="voting-desc"
            aria-label="Keterangan Sesi Voting"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Berikan ringkasan materi atau rujukan berkas lampiran sidang untuk dipelajari anggota..."
            rows={2}
            disabled={isPending}
            className="w-full"
          />
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Opsi / Pilihan Suara Anggota <span className="text-red-500">*</span>
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddOption}
              disabled={isPending}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Opsi
            </Button>
          </div>

          {errors.options && <p className="text-xs text-red-500">{errors.options}</p>}

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {(options || []).map((opt, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1 space-y-1.5">
                  <Input
                    aria-label={`Judul Opsi ${idx + 1}`}
                    placeholder={`Opsi ${idx + 1} (cth: Paslon 1 / Setuju)`}
                    value={opt.title}
                    onChange={(e) => handleOptionChange(idx, 'title', e.target.value)}
                    disabled={isPending}
                    className="w-full text-sm font-medium"
                  />
                  <Input
                    aria-label={`Keterangan Opsi ${idx + 1}`}
                    placeholder="Deskripsi singkat (opsional)"
                    value={opt.description}
                    onChange={(e) => handleOptionChange(idx, 'description', e.target.value)}
                    disabled={isPending}
                    className="w-full text-xs text-slate-500"
                  />
                </div>
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(idx)}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
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
            Buka Pemungutan Suara
          </Button>
        </div>
      </form>
    </Modal>
  );
});

CreateVotingSessionModal.displayName = 'CreateVotingSessionModal';
