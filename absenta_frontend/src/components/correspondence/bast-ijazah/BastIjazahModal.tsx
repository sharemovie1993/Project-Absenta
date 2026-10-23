import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  User,
  Send,
  RotateCw,
  AlertTriangle,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  bastIjazahApi,
  bastIjazahQueryKeys,
  type PreviewBastResponse,
} from '@/api/correspondence/bastIjazah.api';
import { BastIjazahSheet } from './BastIjazahSheet';

interface BastIjazahModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
  onSuccess?: () => void;
}

export const BastIjazahModal: React.FC<BastIjazahModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { tenantInfo } = usePrintHeaderData();

  const [nomorSeriIjazah, setNomorSeriIjazah] = useState('M-SMK/K13/2026/');
  const [penerimaStatus, setPenerimaStatus] = useState<'SISWA_SENDIRI' | 'ORANG_TUA' | 'WALI_KUASA'>('SISWA_SENDIRI');
  const [penerimaNama, setPenerimaNama] = useState('');
  const [penerimaNik, setPenerimaNik] = useState('');
  const [penerimaHubungan, setPenerimaHubungan] = useState('Siswa Yang Bersangkutan');
  const [penerimaNoHp, setPenerimaNoHp] = useState('');
  const [tanggalSerahTerima, setTanggalSerahTerima] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // 1. Fetch Clearance Status Check
  const { data: clearanceRes } = useQuery({
    queryKey: bastIjazahQueryKeys.statusClearance(siswaId),
    queryFn: () => bastIjazahApi.getStatusClearance(siswaId),
    enabled: isOpen && Boolean(siswaId),
  });

  const clearanceData = clearanceRes?.data;

  // Auto-fill student name once clearanceData loads
  useEffect(() => {
    if (clearanceData?.siswa && !penerimaNama) {
      setPenerimaNama(clearanceData.siswa.nama_siswa);
    }
  }, [clearanceData, penerimaNama]);

  // When recipient status changes
  const handlePenerimaStatusChange = (status: 'SISWA_SENDIRI' | 'ORANG_TUA' | 'WALI_KUASA') => {
    setPenerimaStatus(status);
    if (status === 'SISWA_SENDIRI') {
      setPenerimaNama(clearanceData?.siswa?.nama_siswa || '');
      setPenerimaHubungan('Siswa Yang Bersangkutan');
    } else if (status === 'ORANG_TUA') {
      setPenerimaNama('');
      setPenerimaHubungan('Orang Tua Kandung');
    } else {
      setPenerimaNama('');
      setPenerimaHubungan('Wali / Penerima Kuasa Resmi');
    }
  };

  // 2. Fetch Live Preview BAST
  const {
    data: previewResponse,
    isLoading: isPreviewLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'preview-bast-ijazah',
      siswaId,
      nomorSeriIjazah,
      tanggalSerahTerima,
      penerimaStatus,
      penerimaNama,
      penerimaNik,
      penerimaHubungan,
    ],
    queryFn: () =>
      bastIjazahApi.previewBast({
        siswa_id: siswaId,
        nomor_seri_ijazah: nomorSeriIjazah.trim(),
        tanggal_serah_terima: tanggalSerahTerima,
        penerima: {
          status: penerimaStatus,
          nama: penerimaNama.trim() || clearanceData?.siswa?.nama_siswa || 'Nama Penerima',
          nik: penerimaNik.trim() || undefined,
          hubungan: penerimaHubungan,
          no_hp: penerimaNoHp.trim() || undefined,
        },
      }),
    enabled: isOpen && Boolean(siswaId),
  });

  const previewData: PreviewBastResponse | undefined = previewResponse?.data;

  // 3. Issue Mutation
  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!nomorSeriIjazah.trim()) {
        throw new Error('Nomor seri blangko ijazah wajib diisi');
      }
      if (!penerimaNama.trim()) {
        throw new Error('Nama penerima ijazah wajib diisi');
      }
      if (!previewData?.nomor_bast) {
        throw new Error('Nomor BAST belum diinisialisasi');
      }

      return bastIjazahApi.issueBast({
        siswa_id: siswaId,
        nomor_bast: previewData.nomor_bast,
        nomor_seri_ijazah: nomorSeriIjazah.trim(),
        tanggal_serah_terima: tanggalSerahTerima,
        penerima: {
          status: penerimaStatus,
          nama: penerimaNama.trim(),
          nik: penerimaNik.trim() || undefined,
          hubungan: penerimaHubungan,
          no_hp: penerimaNoHp.trim() || undefined,
        },
        dokumen_diserahkan: previewData.dokumen_diserahkan,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'BAST Ijazah berhasil diterbitkan!');
      queryClient.invalidateQueries({ queryKey: bastIjazahQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['buku-induk'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menerbitkan BAST ijazah');
    },
  });

  const handleIssue = () => {
    if (!nomorSeriIjazah.trim() || !penerimaNama.trim()) {
      toast.error('Harap lengkapi nomor seri ijazah dan nama penerima');
      return;
    }
    const confirm = window.confirm(
      `KONFIRMASI SERAH TERIMA IJAZAH:\n\n` +
      `Peserta Didik: ${clearanceData?.siswa?.nama_siswa}\n` +
      `No. Seri Ijazah: ${nomorSeriIjazah}\n` +
      `Penerima: ${penerimaNama} (${penerimaHubungan})\n\n` +
      `Apakah Anda yakin ingin memvalidasi serah terima ini dan mencatatnya ke buku ekspedisi?`
    );
    if (confirm) {
      issueMutation.mutate();
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Berita Acara Serah Terima (BAST) Ijazah & Sertifikat"
      subtitle={clearanceData?.siswa ? `${clearanceData.siswa.nama_siswa} (NIS: ${clearanceData.siswa.nis} | Kelas: ${clearanceData.siswa.kelas})` : 'Penerbitan BAST'}
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col gap-6">
        {/* Form Input Serah Terima */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
          {/* Warning Banner if not all cleared */}
          {clearanceData && !clearanceData.is_all_cleared && (
            <div className="p-3.5 rounded-xl border flex items-start gap-3 text-xs bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Peringatan Bebas Administrasi:</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Siswa ini tercatat belum menuntaskan seluruh 5 pos verifikasi bebas administrasi. Pastikan staf TU telah mendapatkan disposisi khusus dari pimpinan sebelum menerbitkan BAST penyerahan ijazah.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Nomor Seri Blangko Ijazah Kemendikbud *
              </label>
              <div className="relative">
                <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={nomorSeriIjazah}
                  onChange={(e) => setNomorSeriIjazah(e.target.value)}
                  placeholder="Contoh: M-SMK/K13/2026/0192847"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Tanggal Serah Terima & Cap 3 Jari *
              </label>
              <input
                type="date"
                value={tanggalSerahTerima}
                onChange={(e) => setTanggalSerahTerima(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Status Penerima Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Penerima Dokumen Ijazah
            </label>
            <div className="flex gap-2 mb-3">
              {(
                [
                  { id: 'SISWA_SENDIRI', label: 'Siswa Sendiri' },
                  { id: 'ORANG_TUA', label: 'Orang Tua Kandung' },
                  { id: 'WALI_KUASA', label: 'Wali / Kuasa Resmi' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePenerimaStatusChange(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    penerimaStatus === opt.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Penerima *</label>
                <div className="relative">
                  <User size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={penerimaNama}
                    onChange={(e) => setPenerimaNama(e.target.value)}
                    placeholder="Nama lengkap penerima"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Hubungan</label>
                <input
                  type="text"
                  value={penerimaHubungan}
                  onChange={(e) => setPenerimaHubungan(e.target.value)}
                  placeholder="Hubungan dengan siswa"
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">NIK Penerima (KTP)</label>
                <input
                  type="text"
                  value={penerimaNik}
                  onChange={(e) => setPenerimaNik(e.target.value)}
                  placeholder="16 digit NIK KTP"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
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
              Segarkan Pratinjau BAST
            </button>

            <button
              type="button"
              onClick={handleIssue}
              disabled={issueMutation.isPending || !nomorSeriIjazah.trim() || !penerimaNama.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={15} />
              {issueMutation.isPending ? 'Menerbitkan...' : 'Terbitkan & Catat Penyerahan BAST'}
            </button>
          </div>
        </div>

        {/* Live WYSIWYG BAST Sheet */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-slate-900/60 p-4 sm:p-6 flex justify-center">
          {isPreviewLoading ? (
            <div className="h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-xs font-bold">Menyusun naskah berita acara serah terima...</p>
            </div>
          ) : previewData ? (
            <BastIjazahSheet data={previewData} tenantInfo={tenantInfo} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
              Gagal memuat pratinjau BAST ijazah
            </div>
          )}
        </div>
      </div>
    </UniversalDocumentModal>
  );
};
