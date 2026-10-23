import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck,
  ShieldCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  BookmarkCheck,
  Save,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  suratKeteranganApi,
  suratKeteranganQueryKeys,
  type TemplateSuratType,
  type PreviewSuratKeteranganResponse,
} from '@/api/correspondence/suratKeterangan.api';
import { SuratKeteranganSheet } from './SuratKeteranganSheet';

interface SuratKeteranganModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string;
  initialTemplateType?: TemplateSuratType;
}

const TEMPLATE_OPTIONS: Array<{
  type: TemplateSuratType;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  defaultKeperluan: string;
}> = [
  {
    type: 'SISWA_AKTIF',
    title: 'Surat Siswa Aktif',
    shortDesc: 'Tunjangan Ortu, BPJS, Beasiswa PIP/KIP',
    icon: FileCheck,
    defaultKeperluan: 'Persyaratan Tunjangan Gaji Orang Tua',
  },
  {
    type: 'SKKB',
    title: 'Kelakuan Baik (SKKB)',
    shortDesc: 'Melamar Kerja, Kedinasan, Beasiswa',
    icon: ShieldCheck,
    defaultKeperluan: 'Melamar Pekerjaan / Seleksi Lanjutan',
  },
  {
    type: 'REKOMENDASI',
    title: 'Surat Rekomendasi',
    shortDesc: 'Lomba, Magang, Seleksi Khusus',
    icon: Award,
    defaultKeperluan: 'Mengikuti Seleksi Program Khusus',
  },
];

const PRESET_KEPERLUAN: Record<TemplateSuratType, string[]> = {
  SISWA_AKTIF: [
    'Persyaratan Tunjangan Gaji Orang Tua',
    'Persyaratan BPJS Kesehatan',
    'Permohonan Beasiswa KIP / PIP',
    'Pembuatan Paspor / Visa',
    'Pengajuan Kredit Perbankan Orang Tua',
  ],
  SKKB: [
    'Melamar Pekerjaan / Magang Industri',
    'Pendaftaran Perguruan Tinggi / Kedinasan',
    'Pendaftaran Seleksi TNI / Polri',
    'Persyaratan Beasiswa Pemerintah',
  ],
  REKOMENDASI: [
    'Mengikuti Lomba Kompetensi Siswa (LKS)',
    'Mengikuti Olimpiade / Kejuaraan Olahraga',
    'Program Pertukaran Pelajar / Magang Luar Daerah',
  ],
};

export const SuratKeteranganModal: React.FC<SuratKeteranganModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  initialTemplateType = 'SISWA_AKTIF',
}) => {
  const queryClient = useQueryClient();
  const { tenantInfo } = usePrintHeaderData();

  const [activeTemplate, setActiveTemplate] = useState<TemplateSuratType>(initialTemplateType);
  const [keperluan, setKeperluan] = useState<string>(TEMPLATE_OPTIONS[0].defaultKeperluan);
  const [keteranganTambahan, setKeteranganTambahan] = useState<string>('');

  // Sinkronisasi default keperluan saat tab template berganti
  const handleSelectTemplate = useCallback((type: TemplateSuratType) => {
    setActiveTemplate(type);
    const opt = TEMPLATE_OPTIONS.find((t) => t.type === type);
    if (opt) setKeperluan(opt.defaultKeperluan);
  }, []);

  // Fetch Live Preview Data
  const {
    data: previewRes,
    isLoading: isPreviewLoading,
    refetch,
  } = useQuery({
    queryKey: suratKeteranganQueryKeys.preview({
      template_type: activeTemplate,
      siswa_id: siswaId,
      keperluan,
      keterangan_tambahan: keteranganTambahan || undefined,
    }),
    queryFn: () =>
      suratKeteranganApi.preview({
        template_type: activeTemplate,
        siswa_id: siswaId,
        keperluan,
        keterangan_tambahan: keteranganTambahan || undefined,
      }),
    enabled: isOpen && Boolean(siswaId),
    staleTime: 60 * 1000,
  });

  const previewData: PreviewSuratKeteranganResponse | undefined = previewRes?.data;
  const discipline = previewData?.discipline_check;

  // Mutation untuk Menerbitkan Surat Resmi & Masuk ke Agenda Keluar
  const issueMutation = useMutation({
    mutationFn: () => {
      if (!previewData) throw new Error('Draf surat belum siap');
      return suratKeteranganApi.issue({
        template_type: activeTemplate,
        siswa_id: siswaId,
        nomor_surat: previewData.nomor_surat,
        keperluan: keperluan.trim(),
        isi_surat: previewData.klausul_pernyataan,
        keterangan_tambahan: keteranganTambahan.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Surat resmi berhasil diterbitkan ke buku agenda keluar!');
      queryClient.invalidateQueries({ queryKey: suratKeteranganQueryKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan surat keterangan');
    },
  });

  if (!isOpen) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Layanan Surat Keterangan Siswa</span>
          {previewData?.siswa && (
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              • {previewData.siswa.nama_siswa} ({previewData.siswa.kelas})
            </span>
          )}
        </div>
      }
      subtitle="Terbitkan surat resmi instan berpola penomoran dinas baku untuk tanda tangan & cap basah"
      orientation="portrait"
      allowLogoToggles={true}
    >
      <div className="space-y-6">
        {/* PANEL KONTROL PENERBITAN (Tidak Ikut Tercetak / print:hidden) */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 print:hidden shadow-sm">
          {/* 1. Pemilihan Jenis Surat Keterangan */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Pilih Jenis Surat Keterangan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TEMPLATE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = activeTemplate === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleSelectTemplate(opt.type)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-tight">{opt.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {opt.shortDesc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Auto-Guard Peringatan Disiplin (Khusus SKKB) */}
          {activeTemplate === 'SKKB' && discipline && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                discipline.is_clean
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              {discipline.is_clean ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {discipline.is_clean
                    ? 'Rekam Jejak Kedisiplinan: BERSIH'
                    : `Perhatian Kedisiplinan: Ditemukan ${discipline.recent_violations.length} Catatan Pelanggaran (${discipline.total_poin} Poin)`}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {discipline.is_clean
                    ? 'Peserta didik tidak memiliki riwayat pelanggaran tata tertib aktif di database sekolah. Aman diterbitkan SKKB.'
                    : `Terdapat catatan kasus aktif. Pastikan staf TU telah berkoordinasi dengan Guru BK / Kesiswaan sebelum pengesahan.`}
                </p>
                {!discipline.is_clean && discipline.recent_violations.length > 0 && (
                  <div className="mt-2 space-y-1 bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-[10px]">
                    {discipline.recent_violations.map((v) => (
                      <div key={v.id} className="flex justify-between items-center">
                        <span className="font-semibold truncate mr-2">• {v.nama}</span>
                        <span className="shrink-0 font-mono text-amber-700 dark:text-amber-300 font-bold">
                          +{v.poin} Poin ({v.status})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Form Input Keperluan Surat & Presets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Peruntukan / Keperluan Surat
              </label>
              <input
                type="text"
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Contoh: Persyaratan Tunjangan Gaji PNS Orang Tua"
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              {/* Presets Cepat */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {PRESET_KEPERLUAN[activeTemplate].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setKeperluan(preset)}
                    className="text-[10px] font-medium bg-slate-200/70 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Keterangan Tambahan (Opsional)
              </label>
              <textarea
                value={keteranganTambahan}
                onChange={(e) => setKeteranganTambahan(e.target.value)}
                rows={2}
                placeholder="Catatan klausul tambahan jika diminta oleh instansi penerima..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none"
              />
            </div>
          </div>

          {/* 4. Baris Aksi Agenda & Sinkronisasi */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                No. Draf Otomatis: <b className="text-slate-700 dark:text-slate-300">{previewData?.nomor_surat || '...'}</b>
              </span>
              <button
                type="button"
                onClick={() => refetch()}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Muat Ulang Nomor & Pratinjau"
              >
                <RotateCw size={13} className={isPreviewLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending || !previewData}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 transition-colors"
              >
                <Save size={13} />
                {issueMutation.isPending ? 'Menyimpan...' : 'Simpan ke Buku Agenda Keluar'}
              </button>
            </div>
          </div>
        </div>

        {/* PRATINJAU LEMBAR DOKUMEN CETAK A4 TRUE WYSIWYG */}
        <div className="flex flex-col items-center">
          {isPreviewLoading && !previewData ? (
            <div className="w-[794px] min-h-[500px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-sm shadow-xl p-12 text-slate-400">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent mb-3" />
              <p className="text-xs font-bold">Menyusun Naskah Surat Keterangan Resmi...</p>
            </div>
          ) : previewData ? (
            <SuratKeteranganSheet data={previewData} tenantInfo={tenantInfo} />
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Gagal menyusun pratinjau dokumen surat keterangan.
            </div>
          )}
        </div>
      </div>
    </UniversalDocumentModal>
  );
};
