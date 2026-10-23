import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Send,
  Building,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  mutasiApi,
  mutasiQueryKeys,
  type PreviewMutasiKeluarResponse,
} from '@/api/correspondence/mutasi.api';
import { SuratPindahSheet } from './SuratPindahSheet';

interface MutasiKeluarModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
  onSuccess?: () => void;
}

const ALASAN_PRESETS = [
  'Mengikuti Domisili Orang Tua / Wali',
  'Jarak Tempuh Tempat Tinggal Terlalu Jauh',
  'Pindah Minat / Program Keahlian Tertentu',
  'Kebutuhan Perawatan Medis / Kesehatan',
  'Kepentingan Keluarga Mendesak',
];

export const MutasiKeluarModal: React.FC<MutasiKeluarModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { tenantInfo } = usePrintHeaderData();

  const [sekolahTujuan, setSekolahTujuan] = useState('');
  const [alasan, setAlasan] = useState(ALASAN_PRESETS[0]);
  const [tanggalKeluar, setTanggalKeluar] = useState(
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
    queryKey: ['preview-mutasi-keluar', siswaId, sekolahTujuan, alasan, tanggalKeluar, noRekomendasiDinas],
    queryFn: () =>
      mutasiApi.previewKeluar({
        siswa_id: siswaId,
        sekolah_tujuan: sekolahTujuan.trim() || 'SMK / SMA Negeri Tujuan',
        alasan,
        tanggal_keluar: tanggalKeluar,
        no_rekomendasi_dinas: noRekomendasiDinas || undefined,
        keterangan_tambahan: keteranganTambahan || undefined,
      }),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  const previewData: PreviewMutasiKeluarResponse | undefined = previewResponse?.data;

  // 2. Issue Mutation
  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!sekolahTujuan.trim()) {
        throw new Error('Nama sekolah tujuan wajib diisi');
      }
      if (!previewData?.nomor_surat) {
        throw new Error('Nomor surat belum diinisialisasi');
      }

      return mutasiApi.issueKeluar({
        siswa_id: siswaId,
        nomor_surat: previewData.nomor_surat,
        sekolah_tujuan: sekolahTujuan.trim(),
        alasan,
        tanggal_keluar: tanggalKeluar,
        no_rekomendasi_dinas: noRekomendasiDinas || undefined,
        keterangan_tambahan: keteranganTambahan || undefined,
        dossier_terlampir: true,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Surat mutasi keluar berhasil diterbitkan dan status siswa diperbarui!');
      queryClient.invalidateQueries({ queryKey: mutasiQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['buku-induk'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menerbitkan surat mutasi keluar');
    },
  });

  const handleIssue = () => {
    if (!sekolahTujuan.trim()) {
      toast.error('Harap masukkan nama sekolah tujuan');
      return;
    }
    const confirmLock = window.confirm(
      `PERHATIAN: Apakah Anda yakin ingin memproses mutasi keluar untuk peserta didik ini?\n\n` +
      `Status siswa akan diubah menjadi "MUTASI" dan dinonaktifkan dari rombongan belajar kelas.`
    );
    if (confirmLock) {
      issueMutation.mutate();
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Proses Mutasi Keluar Siswa (Pindah Sekolah)"
      subtitle={previewData?.siswa ? `${previewData.siswa.nama_siswa} (NIS: ${previewData.siswa.nis} | Kelas: ${previewData.siswa.kelas})` : 'Dokumen Resmi Tata Usaha'}
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col gap-6">
        {/* Kontrol Input Form Mutasi */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
          {/* Warning Banner Status Transition */}
          <div className="p-3.5 rounded-xl border flex items-start gap-3 text-xs bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold">Konsekuensi Data Mutasi Keluar:</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Penerbitan surat ini secara otomatis akan mengubah status peserta didik di database menjadi <b>MUTASI</b>, mencatat tanggal keluar resmi, dan membebaskan rombel kelas dari daftar presensi harian.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Sekolah Tujuan Pindah *
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sekolahTujuan}
                  onChange={(e) => setSekolahTujuan(e.target.value)}
                  placeholder="Contoh: SMK Negeri 2 Bandung"
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Tanggal Resmi Pindah *
              </label>
              <input
                type="date"
                value={tanggalKeluar}
                onChange={(e) => setTanggalKeluar(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Alasan Kepindahan
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ALASAN_PRESETS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAlasan(item)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    alasan === item
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Tuliskan rincian alasan kepindahan..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                No. Rekomendasi Dinas Pendidikan (Opsional)
              </label>
              <input
                type="text"
                value={noRekomendasiDinas}
                onChange={(e) => setNoRekomendasiDinas(e.target.value)}
                placeholder="Contoh: 421.3/892-Disdik/2026"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Keterangan Tambahan / Berkas Lampiran
              </label>
              <input
                type="text"
                value={keteranganTambahan}
                onChange={(e) => setKeteranganTambahan(e.target.value)}
                placeholder="Rapor asli, surat permohonan ortu"
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
              disabled={issueMutation.isPending || !sekolahTujuan.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={15} />
              {issueMutation.isPending ? 'Memproses Mutasi...' : 'Terbitkan & Kunci Status Mutasi'}
            </button>
          </div>
        </div>

        {/* Live WYSIWYG Canvas */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-slate-900/60 p-4 sm:p-6 flex justify-center">
          {isPreviewLoading ? (
            <div className="h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-xs font-bold">Menyusun dokumen dinas mutasi keluar...</p>
            </div>
          ) : previewData ? (
            <SuratPindahSheet data={previewData} tenantInfo={tenantInfo} />
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
