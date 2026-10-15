import React, { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input, Textarea } from '../../ui';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches } from '../../../lib/coopQueryKeys';
import { Plus, Trash2, ShieldCheck, Scale, Vote, Sparkles } from 'lucide-react';

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
  initialAgendaId?: string | null;
  initialTitle?: string;
  initialCategory?: 'RESOLUTION' | 'ELECTION';
}

export const CreateVotingSessionModal: React.FC<CreateVotingSessionModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  onSuccess,
  initialAgendaId,
  initialTitle,
  initialCategory,
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'RESOLUTION' | 'ELECTION'>('RESOLUTION');
  const [options, setOptions] = useState<{ title: string; description: string }[]>([
    { title: 'Setuju / Diterima', description: 'Menyetujui dan mengesahkan agenda' },
    { title: 'Menolak / Revisi', description: 'Menolak atau meminta perbaikan' }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detection helper
  const detectCategoryFromTitle = (t: string): 'RESOLUTION' | 'ELECTION' => {
    return /pemilihan|pengurus|pengawas|formatur|suksesi|calon/i.test(t) ? 'ELECTION' : 'RESOLUTION';
  };

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      const incomingTitle = initialTitle || '';
      setTitle(incomingTitle);
      setDescription('');

      const resolvedCategory = initialCategory || (incomingTitle ? detectCategoryFromTitle(incomingTitle) : 'RESOLUTION');
      setCategory(resolvedCategory);

      if (resolvedCategory === 'ELECTION') {
        setOptions([
          { title: 'Kandidat 01: [Nama Calon]', description: 'Visi: Penguatan Modal & Kesejahteraan Anggota' },
          { title: 'Kandidat 02: [Nama Calon]', description: 'Visi: Modernisasi Digital & Efisiensi Unit Usaha' }
        ]);
      } else {
        setOptions([
          { title: 'Setuju / Diterima', description: 'Menyetujui dan mengesahkan ketetapan' },
          { title: 'Menolak / Revisi', description: 'Menolak atau meminta peninjauan kembali' }
        ]);
      }
      setErrors({});
    }
  }, [isOpen, initialTitle, initialCategory]);

  // Preset switchers
  const applyPreset = (type: 'resolution_2' | 'resolution_3' | 'election_2' | 'election_3' | 'formatur') => {
    switch (type) {
      case 'resolution_2':
        setCategory('RESOLUTION');
        setOptions([
          { title: 'Setuju / Diterima', description: 'Menyetujui dan mengesahkan ketetapan' },
          { title: 'Menolak / Revisi', description: 'Menolak atau meminta peninjauan kembali' }
        ]);
        break;
      case 'resolution_3':
        setCategory('RESOLUTION');
        setOptions([
          { title: 'Setuju / Diterima', description: 'Menyetujui dan mengesahkan ketetapan' },
          { title: 'Menolak / Revisi', description: 'Menolak atau meminta peninjauan kembali' },
          { title: 'Abstain / Netral', description: 'Menyerahkan keputusan pada forum paripurna' }
        ]);
        break;
      case 'election_2':
        setCategory('ELECTION');
        setOptions([
          { title: 'Kandidat 01: [Nama Calon]', description: 'Visi: Penguatan Modal & Kesejahteraan Anggota' },
          { title: 'Kandidat 02: [Nama Calon]', description: 'Visi: Modernisasi Digital & Efisiensi Unit Usaha' }
        ]);
        break;
      case 'election_3':
        setCategory('ELECTION');
        setOptions([
          { title: 'Kandidat 01: [Nama Calon]', description: 'Visi: Penguatan Permodalan' },
          { title: 'Kandidat 02: [Nama Calon]', description: 'Visi: Modernisasi Digital' },
          { title: 'Kandidat 03: [Nama Calon]', description: 'Visi: Ekspansi Usaha Anggota' }
        ]);
        break;
      case 'formatur':
        setCategory('ELECTION');
        setOptions([
          { title: 'Paket Formatur A', description: 'Kombinasi Pengurus Senior & Kaderisasi Muda' },
          { title: 'Paket Formatur B', description: 'Fokus Profesional Manajemen Bisnis Koperasi' }
        ]);
        break;
    }
  };

  const handleAddOption = useCallback(() => {
    setOptions(prev => [
      ...prev,
      {
        title: category === 'ELECTION' ? `Kandidat 0${prev.length + 1}: [Nama Calon]` : '',
        description: ''
      }
    ]);
  }, [category]);

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
    mutationFn: async (payload: {
      title: string;
      description?: string;
      category?: string;
      agendaId?: string;
      options: { label: string; title: string; description?: string }[];
    }) => {
      const res = await api.post(`/cooperative/rat/${meetingId}/voting-sessions`, payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient, meetingId);
      toast.success('Sesi pemungutan suara e-Voting berhasil dibuka!');
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
      agendaId: initialAgendaId || undefined,
      category,
      title: parseResult.data.title,
      description: parseResult.data.description,
      options: parseResult.data.options.map(o => ({
        label: o.title,
        title: o.title,
        description: o.description,
      })),
    });
  }, [title, description, options, category, initialAgendaId, createMutation]);

  const isPending = createMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buka Sesi e-Voting Sidang RAT"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* KATEGORI VOTING SEGMENTED SELECTOR */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tipe Sesi Pemungutan Suara
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => applyPreset('resolution_2')}
              disabled={isPending}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                category === 'RESOLUTION'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4 text-indigo-500" />
              <span>Putusan Ketetapan Sidang</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('election_2')}
              disabled={isPending}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                category === 'ELECTION'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200 dark:border-slate-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Vote className="w-4 h-4 text-purple-500" />
              <span>Pemilihan Calon Pengurus/Pengawas</span>
            </button>
          </div>
        </div>

        {/* QUICK PRESETS TOOLBAR */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Template Cepat:
          </span>
          {category === 'RESOLUTION' ? (
            <>
              <button
                type="button"
                onClick={() => applyPreset('resolution_2')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                Setuju / Menolak (2 Opsi)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('resolution_3')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                Setuju / Menolak / Abstain (3 Opsi)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => applyPreset('election_2')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
              >
                2 Calon Kandidat
              </button>
              <button
                type="button"
                onClick={() => applyPreset('election_3')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
              >
                3 Calon Kandidat
              </button>
              <button
                type="button"
                onClick={() => applyPreset('formatur')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
              >
                Sistem Formatur
              </button>
            </>
          )}
        </div>

        {/* TITLE INPUT */}
        <div className="space-y-1">
          <label htmlFor="voting-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Judul / Pokok Pemungutan Suara <span className="text-red-500">*</span>
          </label>
          <Input
            id="voting-title"
            aria-label="Judul Pemungutan Suara"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!initialCategory) {
                const auto = detectCategoryFromTitle(e.target.value);
                if (auto !== category) setCategory(auto);
              }
            }}
            placeholder="cth: Pengesahan LPJ Pengurus / Pemilihan Ketua Pengurus Periode 2026-2029"
            disabled={isPending}
            className="w-full text-sm font-bold"
          />
          {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* DESCRIPTION TEXTAREA */}
        <div className="space-y-1">
          <label htmlFor="voting-desc" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Keterangan & Rujukan Keputusan (Opsional)
          </label>
          <Textarea
            id="voting-desc"
            aria-label="Keterangan Sesi Voting"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Berikan ringkasan materi, rujukan halaman berkas sidang, atau tata cara pemungutan suara..."
            rows={2}
            disabled={isPending}
            className="w-full text-xs"
          />
        </div>

        {/* OPTIONS LIST */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Daftar Opsi Surat Suara <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400 font-mono">({options.length} Opsi)</span>
            </div>
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

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {(options || []).map((opt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                    Opsi 0{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    disabled={isPending || options.length <= 2}
                    title={options.length <= 2 ? 'Minimal harus ada 2 opsi pilihan' : 'Hapus opsi ini'}
                    className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                      {category === 'ELECTION' ? 'Nama Calon / Kandidat / Formatur *' : 'Nama Opsi Putusan *'}
                    </label>
                    <Input
                      aria-label={`Nama Opsi ${idx + 1}`}
                      placeholder={category === 'ELECTION' ? 'cth: Kandidat 01: Bpk. Ahmad' : 'cth: Setuju / Diterima'}
                      value={opt.title}
                      onChange={(e) => handleOptionChange(idx, 'title', e.target.value)}
                      disabled={isPending}
                      className="w-full text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                      {category === 'ELECTION' ? 'Visi / Asal Unit / Catatan Calon (Opsional)' : 'Deskripsi Konsekuensi Putusan (Opsional)'}
                    </label>
                    <Input
                      aria-label={`Keterangan Opsi ${idx + 1}`}
                      placeholder={category === 'ELECTION' ? 'cth: Visi penguatan permodalan anggota' : 'cth: Menyetujui agenda dan mengesahkan ketetapan'}
                      value={opt.description}
                      onChange={(e) => handleOptionChange(idx, 'description', e.target.value)}
                      disabled={isPending}
                      className="w-full text-xs text-slate-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AUDIT & BROADCAST NOTICE */}
        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <span>
            Sesi voting yang dibuka akan langsung disiarkan secara real-time ke <strong>Layar Proyektor Aula</strong> dan memunculkan surat suara digital di gawai seluruh anggota yang hadir sah.
          </span>
        </div>

        {/* FOOTER ACTIONS */}
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
            className="gap-1.5"
          >
            <Vote className="w-4 h-4" />
            Buka Pemungutan Suara
          </Button>
        </div>
      </form>
    </Modal>
  );
});

CreateVotingSessionModal.displayName = 'CreateVotingSessionModal';
