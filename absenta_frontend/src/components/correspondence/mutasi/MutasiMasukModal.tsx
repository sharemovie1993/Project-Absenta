import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  User,
  Send,
  RotateCw,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  mutasiApi,
  mutasiQueryKeys,
  type PreviewMutasiMasukResponse,
} from '@/api/correspondence/mutasi.api';
import { SuratDiterimaSheet } from './SuratDiterimaSheet';

interface MutasiMasukModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId?: string;
  initialNamaSiswa?: string;
  initialNisn?: string;
  onSuccess?: () => void;
}

export const MutasiMasukModal: React.FC<MutasiMasukModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  initialNamaSiswa = '',
  initialNisn = '',
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { tenantInfo } = usePrintHeaderData();

  const [namaSiswa, setNamaSiswa] = useState(initialNamaSiswa);
  const [nisn, setNisn] = useState(initialNisn);
  const [sekolahAsal, setSekolahAsal] = useState('');
  const [kelasTujuan, setKelasTujuan] = useState('X RPL 1');
  const [tingkat, setTingkat] = useState(10);
  const [tanggalMasuk, setTanggalMasuk] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [noRekomendasiDinas, setNoRekomendasiDinas] = useState('');
  const [keteranganTambahan, setKeteranganTambahan] = useState('');

  // 1. Fetch Real-Time Preview
  const {
    data: previewResponse,
    isLoading: isPreviewLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['preview-mutasi-masuk', namaSiswa, nisn, sekolahAsal, kelasTujuan, tingkat, tanggalMasuk, noRekomendasiDinas],
    queryFn: () =>
      mutasiApi.previewMasuk({
        siswa_id: siswaId || undefined,
        nama_siswa: namaSiswa.trim() || 'Nama Calon Siswa Pindahan',
        nisn: nisn.trim() || undefined,
        sekolah_asal: sekolahAsal.trim() || 'Sekolah Asal Siswa',
        kelas_tujuan: kelasTujuan.trim() || 'X',
        tingkat,
        tanggal_masuk: tanggalMasuk,
        no_rekomendasi_dinas: noRekomendasiDinas || undefined,
        keterangan_tambahan: keteranganTambahan || undefined,
      }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const previewData: PreviewMutasiMasukResponse | undefined = previewResponse?.data;

  // 2. Issue Mutation
  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!namaSiswa.trim()) throw new Error('Nama siswa wajib diisi');
      if (!sekolahAsal.trim()) throw new Error('Nama sekolah asal wajib diisi');
      if (!previewData?.nomor_surat) throw new Error('Nomor surat belum diinisialisasi');

      return mutasiApi.issueMasuk({
        siswa_id: siswaId || undefined,
        nama_siswa: namaSiswa.trim(),
        nisn: nisn.trim() || undefined,
        sekolah_asal: sekolahAsal.trim(),
        kelas_tujuan: kelasTujuan.trim(),
        tingkat,
        tanggal_masuk: tanggalMasuk,
        nomor_surat: previewData.nomor_surat,
        no_rekomendasi_dinas: noRekomendasiDinas || undefined,
        keterangan_tambahan: keteranganTambahan || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Surat keterangan diterima berhasil diterbitkan!');
      queryClient.invalidateQueries({ queryKey: mutasiQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['buku-induk'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menerbitkan surat keterangan diterima');
    },
  });

  const handleIssue = () => {
    if (!namaSiswa.trim() || !sekolahAsal.trim()) {
      toast.error('Harap lengkapi nama siswa dan sekolah asal');
      return;
    }
    issueMutation.mutate();
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Penerbitan Surat Keterangan Diterima (Mutasi Masuk)"
      subtitle="Konfirmasi kesediaan menampung peserta didik pindahan dari sekolah lain"
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col gap-6">
        {/* Kontrol Input Form Mutasi Masuk */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="p-3.5 rounded-xl border flex items-start gap-3 text-xs bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
            <Info size={18} className="shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div>
              <p className="font-bold">Informasi Mutasi Masuk:</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Surat ini diterbitkan sebagai konfirmasi formal daya tampung bagi sekolah asal siswa. Data akan tercatat di Buku Register Mutasi dan Agenda Persuratan Keluar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Nama Lengkap Siswa *
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={namaSiswa}
                  onChange={(e) => setNamaSiswa(e.target.value)}
                  placeholder="Nama calon peserta didik"
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                NISN Siswa (Opsional)
              </label>
              <input
                type="text"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="10 digit nomor NISN"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Sekolah Asal *
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sekolahAsal}
                  onChange={(e) => setSekolahAsal(e.target.value)}
                  placeholder="Contoh: SMA Negeri 1 Purwakarta"
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Tingkat & Rombel Tujuan *
              </label>
              <div className="flex gap-2">
                <select
                  value={tingkat}
                  onChange={(e) => setTingkat(Number(e.target.value))}
                  className="w-20 px-2 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value={10}>Kls 10</option>
                  <option value={11}>Kls 11</option>
                  <option value={12}>Kls 12</option>
                  <option value={13}>Kls 13</option>
                </select>
                <input
                  type="text"
                  value={kelasTujuan}
                  onChange={(e) => setKelasTujuan(e.target.value)}
                  placeholder="Nama Kelas (XI RPL 1)"
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Tanggal Diterima *
              </label>
              <input
                type="date"
                value={tanggalMasuk}
                onChange={(e) => setTanggalMasuk(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Nomor Rekomendasi Dinas Pendidikan (Opsional)
              </label>
              <input
                type="text"
                value={noRekomendasiDinas}
                onChange={(e) => setNoRekomendasiDinas(e.target.value)}
                placeholder="Contoh: 421.3/901-Disdik/2026"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Keterangan Tambahan
              </label>
              <input
                type="text"
                value={keteranganTambahan}
                onChange={(e) => setKeteranganTambahan(e.target.value)}
                placeholder="Rapor asli terlampir lengkap"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors"
            >
              <RotateCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Segarkan Pratinjau
            </button>

            <button
              type="button"
              onClick={handleIssue}
              disabled={issueMutation.isPending || !namaSiswa.trim() || !sekolahAsal.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={15} />
              {issueMutation.isPending ? 'Menerbitkan...' : 'Terbitkan Surat Keterangan Diterima'}
            </button>
          </div>
        </div>

        {/* Live Canvas Pratinjau WYSIWYG */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-slate-900/60 p-4 sm:p-6 flex justify-center">
          {isPreviewLoading ? (
            <div className="h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-xs font-bold">Menyusun dokumen dinas mutasi masuk...</p>
            </div>
          ) : previewData ? (
            <SuratDiterimaSheet data={previewData} tenantInfo={tenantInfo} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
              Gagal memuat pratinjau surat
            </div>
          )}
        </div>
      </div>
    </UniversalDocumentModal>
  );
};
