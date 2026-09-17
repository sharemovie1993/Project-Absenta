import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Building2, Calendar, AlertCircle } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';
import { SimpleFormField } from '../ui/SimpleFormField';
import type { SiswaPkl } from '../../pages/hubin/types/penempatan.types';
import { addPklMonths } from '../../utils/hubinPklLifecycle';

interface HubinPklMutasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: SiswaPkl | null;
  mitraOptions: SearchableSelectOption[];
  guruOptions: SearchableSelectOption[];
  onSubmit: (data: {
    tanggal_selesai_lama: string;
    mitra_id_baru: string;
    pembimbing_id_baru?: string;
    tanggal_mulai_baru: string;
    tanggal_selesai_baru?: string;
    catatan_mutasi?: string;
  }) => void;
  isPending: boolean;
  onMitraSearch?: (val: string) => void;
  onGuruSearch?: (val: string) => void;
  isLoadingMitra?: boolean;
  isLoadingGuru?: boolean;
}

export const HubinPklMutasiModal: React.FC<HubinPklMutasiModalProps> = React.memo(({
  isOpen,
  onClose,
  row,
  mitraOptions,
  guruOptions,
  onSubmit,
  isPending,
  onMitraSearch,
  onGuruSearch,
  isLoadingMitra,
  isLoadingGuru,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const [tglSelesaiLama, setTglSelesaiLama] = useState<string>(todayStr);
  const [newMitraId, setNewMitraId] = useState<string>('');
  const [newPembimbingId, setNewPembimbingId] = useState<string>('');
  const [tglMulaiBaru, setTglMulaiBaru] = useState<string>(todayStr);
  const [tglSelesaiBaru, setTglSelesaiBaru] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  useEffect(() => {
    if (isOpen && row) {
      setTglSelesaiLama(todayStr);
      setNewMitraId('');
      setNewPembimbingId(row.pembimbing_id || '');
      setTglMulaiBaru(todayStr);
      setTglSelesaiBaru(row.tanggal_selesai ? new Date(row.tanggal_selesai).toISOString().substring(0, 10) : '');
      setCatatan('');
    }
  }, [isOpen, row, todayStr]);

  const handleApplyDuration = (months: number) => {
    const base = tglMulaiBaru || todayStr;
    const calculated = addPklMonths(base, months);
    setTglSelesaiBaru(calculated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMitraId) {
      alert('Silakan pilih Mitra Industri baru tujuan mutasi.');
      return;
    }
    onSubmit({
      tanggal_selesai_lama: tglSelesaiLama,
      mitra_id_baru: newMitraId,
      pembimbing_id_baru: newPembimbingId || undefined,
      tanggal_mulai_baru: tglMulaiBaru,
      tanggal_selesai_baru: tglSelesaiBaru || undefined,
      catatan_mutasi: catatan || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={20} className="text-amber-500" />
          <span>Mutasi / Pindah Tempat PKL Siswa</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ringkasan Penempatan Saat Ini */}
        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/40">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span>Informasi Perpindahan Siswa (Chain of Placement)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Siswa <strong className="text-slate-900 dark:text-white">{row?.Siswa?.nama_siswa}</strong> saat ini ditempatkan di{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">{row?.Mitra?.nama}</strong>. Proses mutasi akan menutup penempatan lama sebagai <em>SELESAI</em> per tanggal efektif dan membuat penempatan aktif baru ke DUDI tujuan. Riwayat presensi lama tetap tersimpan aman.
          </p>
        </div>

        {/* Seksi Penutupan Tempat Lama */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-3">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            1. Penutupan di Mitra Asal ({row?.Mitra?.nama || 'Mitra Lama'})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SimpleFormField htmlFor="mutasi-tgl-lama" label="Hari Terakhir di Mitra Lama" required>
              <Input
                id="mutasi-tgl-lama"
                type="date"
                value={tglSelesaiLama}
                onChange={(e) => setTglSelesaiLama(e.target.value)}
                required
              />
            </SimpleFormField>
            <SimpleFormField htmlFor="mutasi-alasan" label="Alasan / Catatan Mutasi">
              <Input
                id="mutasi-alasan"
                type="text"
                placeholder="Misal: Penyesuaian shift / proyek baru"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </SimpleFormField>
          </div>
        </div>

        {/* Seksi Mitra Baru Tujuan */}
        <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/70 dark:border-indigo-900/40 space-y-3">
          <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={13} />
            2. Mitra Industri Baru Tujuan Mutasi
          </p>

          <SimpleFormField htmlFor="mutasi-mitra-baru" label="Pilih Perusahaan Mitra Baru" required>
            <SearchableSelect
              id="mutasi-mitra-baru"
              options={mitraOptions}
              value={newMitraId}
              onValueChange={setNewMitraId}
              placeholder="Cari DUDI baru..."
              onSearch={onMitraSearch}
              isLoading={isLoadingMitra}
            />
          </SimpleFormField>

          <SimpleFormField htmlFor="mutasi-guru-baru" label="Guru Pembimbing (Opsional)">
            <SearchableSelect
              id="mutasi-guru-baru"
              options={guruOptions}
              value={newPembimbingId}
              onValueChange={setNewPembimbingId}
              placeholder="Pilih pembimbing baru (default tetap)..."
              onSearch={onGuruSearch}
              isLoading={isLoadingGuru}
            />
          </SimpleFormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SimpleFormField htmlFor="mutasi-tgl-mulai-baru" label="Mulai Aktif di Tempat Baru" required>
              <Input
                id="mutasi-tgl-mulai-baru"
                type="date"
                value={tglMulaiBaru}
                onChange={(e) => setTglMulaiBaru(e.target.value)}
                required
              />
            </SimpleFormField>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="mutasi-tgl-selesai-baru" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Selesai di Tempat Baru
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-medium mr-0.5">Preset:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyDuration(3)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 cursor-pointer transition-colors"
                  >
                    +3 Bln
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDuration(4)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 cursor-pointer transition-colors"
                  >
                    +4 Bln
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDuration(6)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 cursor-pointer transition-colors"
                  >
                    +6 Bln
                  </button>
                </div>
              </div>
              <Input
                id="mutasi-tgl-selesai-baru"
                type="date"
                value={tglSelesaiBaru}
                onChange={(e) => setTglSelesaiBaru(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Simpan Mutasi PKL
          </Button>
        </div>
      </form>
    </Modal>
  );
});
