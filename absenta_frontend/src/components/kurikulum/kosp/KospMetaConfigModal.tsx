import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Plus, Trash2, RefreshCw, FileCheck2, UserCheck } from 'lucide-react';
import type { TimPenyusunItem } from '../../../utils/kurikulum/kospDataHelper';

export interface KospMetaConfigData {
  nomor_sk?: string;
  tanggal_sk?: string;
  kcd_nama?: string;
  kcd_nip?: string;
  komite_nama?: string;
  tim_penyusun?: TimPenyusunItem[];
}

interface KospMetaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: KospMetaConfigData;
  defaultKepsek?: string;
  defaultWakasek?: string;
  onSave: (updatedMeta: KospMetaConfigData) => Promise<void>;
  isSaving?: boolean;
}

export const KospMetaConfigModal: React.FC<KospMetaConfigModalProps> = ({
  isOpen,
  onClose,
  initialData,
  defaultKepsek,
  defaultWakasek,
  onSave,
  isSaving = false,
}) => {
  const [nomorSk, setNomorSk] = useState<string>('');
  const [tanggalSk, setTanggalSk] = useState<string>('');
  const [kcdNama, setKcdNama] = useState<string>('');
  const [kcdNip, setKcdNip] = useState<string>('');
  const [komiteNama, setKomiteNama] = useState<string>('');
  const [timPenyusun, setTimPenyusun] = useState<TimPenyusunItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNomorSk(initialData?.nomor_sk || '421.5/089/SK-KOSP/2025');
      setTanggalSk(initialData?.tanggal_sk || new Date().toISOString().split('T')[0]);
      setKcdNama(initialData?.kcd_nama || 'Drs. H. Mamat Rahmat, M.Si.');
      setKcdNip(initialData?.kcd_nip || '19680315 199303 1 008');
      setKomiteNama(initialData?.komite_nama || 'H. Dudung Abdurrahman, M.Pd.');

      if (initialData?.tim_penyusun && initialData.tim_penyusun.length > 0) {
        setTimPenyusun(initialData.tim_penyusun);
      } else {
        generateDefaultTim();
      }
    }
  }, [isOpen, initialData, defaultKepsek, defaultWakasek]);

  const generateDefaultTim = () => {
    const list: TimPenyusunItem[] = [
      { no: 1, nama: defaultKepsek || 'Kepala Sekolah', jabatan_kedinasan: 'Kepala Sekolah', jabatan_tim: 'Penanggung Jawab' },
      { no: 2, nama: defaultWakasek || 'Wakasek Kurikulum', jabatan_kedinasan: 'Wakasek Bidang Kurikulum', jabatan_tim: 'Ketua Tim Penyusun' },
      { no: 3, nama: 'Drs. H. Mulyana, M.Pd.', jabatan_kedinasan: 'Pengawas Pembina Sekolah', jabatan_tim: 'Narasumber / Pendamping' },
      { no: 4, nama: komiteNama || 'H. Dudung Abdurrahman, M.Pd.', jabatan_kedinasan: 'Ketua Komite Sekolah', jabatan_tim: 'Narasumber Komite' },
      { no: 5, nama: 'Wakasek Bidang Kesiswaan', jabatan_kedinasan: 'Wakasek Kesiswaan', jabatan_tim: 'Anggota / Tim Pengembang' },
      { no: 6, nama: 'Wakasek Bidang Humas & Hubin', jabatan_kedinasan: 'Wakasek Humas/DUDI', jabatan_tim: 'Anggota / Tim Penyelaras DUDI' },
      { no: 7, nama: 'Wakasek Bidang Sarana Prasarana', jabatan_kedinasan: 'Wakasek Sarpras', jabatan_tim: 'Anggota / Tim Fasilitas' },
      { no: 8, nama: 'Para Ketua Program Keahlian (Kaprog)', jabatan_kedinasan: 'Kaprog Keahlian', jabatan_tim: 'Anggota / Tim Kurikulum Jurusan' },
      { no: 9, nama: 'Koor. Bimbingan Konseling (BK)', jabatan_kedinasan: 'Guru BK', jabatan_tim: 'Anggota / Tim Asesmen & Karakter' },
    ];
    setTimPenyusun(list);
  };

  const handleAddMember = () => {
    setTimPenyusun((prev) => [
      ...prev,
      {
        no: prev.length + 1,
        nama: '',
        jabatan_kedinasan: 'Guru Mata Pelajaran',
        jabatan_tim: 'Anggota Tim Penyusun',
      },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    setTimPenyusun((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMember = (index: number, key: keyof TimPenyusunItem, val: string) => {
    setTimPenyusun((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      nomor_sk: nomorSk,
      tanggal_sk: tanggalSk,
      kcd_nama: kcdNama,
      kcd_nip: kcdNip,
      komite_nama: komiteNama,
      tim_penyusun: timPenyusun.map((item, idx) => ({ ...item, no: idx + 1 })),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⚙️ Pengaturan Legalitas & Tim Penyusun KOSP"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Section 1: Informasi SK & Pengesahan */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
            <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Informasi SK Penetapan & Pengesahan KOSP</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nomor SK Kepsek
              </label>
              <Input
                value={nomorSk}
                onChange={(e) => setNomorSk(e.target.value)}
                placeholder="421.5/089/SK-KOSP/2025"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Tanggal Penetapan SK
              </label>
              <Input
                type="date"
                value={tanggalSk}
                onChange={(e) => setTanggalSk(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nama Kepala Cabang Dinas (KCD)
              </label>
              <Input
                value={kcdNama}
                onChange={(e) => setKcdNama(e.target.value)}
                placeholder="Drs. H. Mamat Rahmat, M.Si."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                NIP Kepala Cabang Dinas (KCD)
              </label>
              <Input
                value={kcdNip}
                onChange={(e) => setKcdNip(e.target.value)}
                placeholder="19680315 199303 1 008"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nama Ketua Komite Sekolah
              </label>
              <Input
                value={komiteNama}
                onChange={(e) => setKomiteNama(e.target.value)}
                placeholder="H. Dudung Abdurrahman, M.Pd."
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tabel Dynamic Tim Penyusun KOSP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Susunan Tim Pengembang & Penyusun KOSP ({timPenyusun.length} Orang)</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateDefaultTim}
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Reset ke Default
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddMember}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah Anggota
              </Button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2.5 text-center w-10">No</th>
                  <th className="p-2.5 text-left">Nama Personal</th>
                  <th className="p-2.5 text-left">Jabatan Kedinasan</th>
                  <th className="p-2.5 text-left">Tugas dalam Tim</th>
                  <th className="p-2.5 text-center w-10">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {timPenyusun.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-2">
                      <Input
                        value={item.nama}
                        onChange={(e) => handleUpdateMember(idx, 'nama', e.target.value)}
                        placeholder="Nama Lengkap & Gelar"
                        className="text-xs py-1 h-8"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={item.jabatan_kedinasan}
                        onChange={(e) => handleUpdateMember(idx, 'jabatan_kedinasan', e.target.value)}
                        placeholder="Jabatan Kedinasan"
                        className="text-xs py-1 h-8"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={item.jabatan_tim}
                        onChange={(e) => handleUpdateMember(idx, 'jabatan_tim', e.target.value)}
                        placeholder="Tugas Tim KOSP"
                        className="text-xs py-1 h-8"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" isLoading={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
