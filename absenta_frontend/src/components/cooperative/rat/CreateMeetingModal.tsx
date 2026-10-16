import React, { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button, Input, Textarea } from '../../ui';
import {
  Sparkles,
  Calendar,
  Building2,
  Globe,
  Video,
  Megaphone,
  ListOrdered,
  FileText,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/axiosInstance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateRatCaches, COOP_QUERY_KEYS } from '../../../lib/coopQueryKeys';

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

const FORMAT_PRESETS = [
  {
    id: 'HYBRID',
    label: 'Hybrid',
    location: 'Aula Utama Sekolah & Daring (Portal Absenta)',
    icon: Globe,
  },
  {
    id: 'OFFLINE',
    label: 'Tatap Muka',
    location: 'Aula Utama Sekolah (Luring Penuh)',
    icon: Building2,
  },
  {
    id: 'ONLINE',
    label: 'Daring Penuh',
    location: 'Daring Penuh via Portal Anggota Absenta & Video Conference',
    icon: Video,
  },
];

const getNextSaturdayAtEight = () => {
  const d = new Date();
  const dayOfWeek = d.getDay(); // 0: Sun, 6: Sat
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  if (daysUntilSaturday === 0 && d.getHours() >= 8) {
    daysUntilSaturday = 7;
  }
  const target = new Date(d);
  target.setDate(d.getDate() + daysUntilSaturday);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T08:00`;
};

const getRelativeDateAtEight = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00`;
};

const getDefaultTitle = (type: string, yr: number) => {
  if (type === 'RAPAT_LUAR_BIASA') {
    return `Rapat Anggota Luar Biasa (RALB) Koperasi Tahun ${yr}`;
  }
  if (type === 'RAPBK') {
    return `Rapat Anggota Pembahasan RK & RAPBK Tahun Buku ${yr + 1}`;
  }
  return `Rapat Anggota Tahunan (RAT) Tahun Buku ${yr}`;
};

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = React.memo(({
  isOpen,
  onClose,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  
  const [meetingType, setMeetingType] = useState<'RAT' | 'RAPAT_LUAR_BIASA' | 'RAPBK'>('RAT');
  const [year, setYear] = useState<number>(currentYear - 1);
  const [isCustomTitle, setIsCustomTitle] = useState(false);
  const [title, setTitle] = useState(getDefaultTitle('RAT', currentYear - 1));
  const [meetingDate, setMeetingDate] = useState(getNextSaturdayAtEight());
  const [description, setDescription] = useState(FORMAT_PRESETS[0].location);
  const [activeFormat, setActiveFormat] = useState('HYBRID');

  // Automation flags
  const [autoPresetAgendas, setAutoPresetAgendas] = useState(true);
  const [autoPresetResolutions, setAutoPresetResolutions] = useState(true);
  const [createAnnouncement, setCreateAnnouncement] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    if (!isCustomTitle) {
      setTitle(getDefaultTitle(meetingType, newYear));
    }
  };

  const handleMeetingTypeChange = (type: 'RAT' | 'RAPAT_LUAR_BIASA' | 'RAPBK') => {
    setMeetingType(type);
    if (!isCustomTitle) {
      setTitle(getDefaultTitle(type, year));
    }
  };

  const handleFormatSelect = (preset: typeof FORMAT_PRESETS[0]) => {
    setActiveFormat(preset.id);
    setDescription(preset.location);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      year: number;
      fiscalYear: number;
      date: string;
      meetingDate: string;
      location?: string;
      description?: string;
      meetingType?: string;
      autoPresetAgendas?: boolean;
      autoPresetResolutions?: boolean;
      createAnnouncement?: boolean;
    }) => {
      const res = await api.post('/cooperative/rat', payload);
      return res.data;
    },
    onSuccess: () => {
      invalidateRatCaches(queryClient);
      if (createAnnouncement) {
        queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.announcements });
        queryClient.invalidateQueries({ queryKey: ['cooperative-announcements'] });
      }
      toast.success(
        createAnnouncement
          ? 'Sidang RAT & Siaran Pengumuman resmi berhasil diterbitkan!'
          : 'Sidang Rapat Anggota Tahunan berhasil diagendakan!'
      );
      onClose();
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const resData = (err as { response?: { data?: { message?: string; errors?: Array<{ message: string }> } } })?.response?.data;
      const errorMsg = resData?.errors?.[0]?.message || resData?.message || 'Gagal membuat agenda RAT';
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
      fiscalYear: parseResult.data.year,
      date: parseResult.data.meetingDate,
      meetingDate: parseResult.data.meetingDate,
      location: parseResult.data.description || 'Aula Utama Sekolah',
      description: parseResult.data.description,
      meetingType: meetingType === 'RAPBK' ? 'RAT' : meetingType,
      autoPresetAgendas,
      autoPresetResolutions,
      createAnnouncement,
    });
  }, [title, year, meetingDate, description, meetingType, autoPresetAgendas, autoPresetResolutions, createAnnouncement, createMutation]);

  const isPending = createMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendakan Sidang Rapat Anggota (RAT)"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipe Sidang Chips */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Pilihan Jenis Sidang
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'RAT' as const, label: 'RAT Tahunan' },
              { type: 'RAPBK' as const, label: 'Rapat RK & RAPBK' },
              { type: 'RAPAT_LUAR_BIASA' as const, label: 'RALB (Luar Biasa)' },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleMeetingTypeChange(item.type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  meetingType === item.type
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Judul Sidang */}
        <div>
          <label htmlFor="rat-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Nama / Judul Sidang RAT <span className="text-red-500">*</span>
          </label>
          <Input
            id="rat-title"
            aria-label="Judul Sidang RAT"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsCustomTitle(true);
            }}
            placeholder="Contoh: Rapat Anggota Tahunan (RAT) Tahun Buku 2025"
            disabled={isPending}
            className="w-full"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Tahun Buku & Jadwal */}
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
              onChange={(e) => handleYearChange(Number(e.target.value))}
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

            {/* Quick Date Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-0.5">
                <Clock className="w-3 h-3" /> Cepat:
              </span>
              <button
                type="button"
                onClick={() => setMeetingDate(getNextSaturdayAtEight())}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 font-medium transition-colors"
              >
                Sabtu Ini (08:00)
              </button>
              <button
                type="button"
                onClick={() => setMeetingDate(getRelativeDateAtEight(0))}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 font-medium transition-colors"
              >
                Hari Ini (08:00)
              </button>
              <button
                type="button"
                onClick={() => setMeetingDate(getRelativeDateAtEight(1))}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 font-medium transition-colors"
              >
                Besok (08:00)
              </button>
            </div>
          </div>
        </div>

        {/* Keterangan & Format Sidang */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="rat-description" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Keterangan / Lokasi & Format Sidang
            </label>
            <div className="flex items-center gap-1">
              {FORMAT_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = activeFormat === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleFormatSelect(preset)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Textarea
            id="rat-description"
            aria-label="Keterangan Sidang"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setActiveFormat('');
            }}
            placeholder="Contoh: Aula Utama Sekolah & Daring (Portal Absenta)"
            rows={2}
            disabled={isPending}
            className="w-full text-xs"
          />
        </div>

        {/* Otomasi & Preset Checklist Suite */}
        <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-indigo-950/30 dark:via-slate-900/40 dark:to-blue-950/20 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Otomasi & Paket Preset Cepat (Siap Tempur)</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPresetAgendas}
                onChange={(e) => setAutoPresetAgendas(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Pasang 9 Butir Rundown Standar UU Perkoperasian
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Otomatis menyusun butir acara baku dari Kuorum, Tatib, LPJ, LHP, hingga Penetapan TAP.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPresetResolutions}
                onChange={(e) => setAutoPresetResolutions(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Siapkan 5 Draf Surat Ketetapan (TAP RAT) Standar
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Otomatis menyiapkan draf yuridis (Tatib, LPJ, LHP, SHU, dan RAPBK) yang siap dibahas.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createAnnouncement}
                onChange={(e) => setCreateAnnouncement(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Publikasikan Pengumuman Undangan ke Portal Anggota
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Otomatis menerbitkan siaran pengumuman resmi ke seluruh anggota lengkap dengan jadwal dan lokasi.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Catatan Kuorum */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          <strong>Catatan Hukum UU Perkoperasian:</strong> Saat status rapat dibuka menjadi <em>REGISTRATION_OPEN</em>, sistem akan otomatis mengunci snapshot seluruh anggota aktif koperasi sebagai basis penentuan kuorum sah rapat (50% + 1).
        </div>

        {/* Footer Actions */}
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
            className="flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Agendakan Sidang</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
});

CreateMeetingModal.displayName = 'CreateMeetingModal';
