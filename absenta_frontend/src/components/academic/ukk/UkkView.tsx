import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  Plus,
  RefreshCw,
  Users,
  Calendar,
  Settings2,
  BookOpen,
} from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { raporApi } from '@/api/rapor.api';
import { siswaApi } from '@/api/academic.api';
import { UkkFormModal } from './UkkFormModal';
import { UkkSertifikatModal, type UkkStudentItem } from './UkkSertifikatModal';
import { UkkJurusanConfigModal } from './UkkJurusanConfigModal';
import { UkkJadwalPlotingTab } from './UkkJadwalPlotingTab';
import { UkkBeritaAcaraTab } from './UkkBeritaAcaraTab';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { cn } from '@/lib/utils';

export interface UkkRecordItem {
  id?: string;
  siswa_id: string;
  nama_siswa: string;
  nis?: string;
  nisn?: string;
  kelas?: string;
  tingkat?: number | string;
  tahun_ajaran?: string;
  asesor_internal?: string | null;
  asesor_eksternal?: string;
  mitra_industri_id?: string | null;
  mitra_nama?: string;
  nilai_praktik?: number;
  nilai_teori?: number | null;
  predikat?: string;
  nomor_sertifikat?: string;
  tanggal_terbit?: string;
  isCompleted: boolean;
}

export interface UniversalUkkViewProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;
  isModal?: boolean;
  hideLayout?: boolean;
  readOnly?: boolean;
}

export const UkkView: React.FC<UniversalUkkViewProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  kelasId,
  tahunPelajaranId,
  tahunAjaran,
  semesterId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
}) => {
  // Fallback to platform-wide academic filter engine if not supplied by parent
  const internalAcademic = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const effectiveTpId = tahunPelajaranId || internalAcademic.values.tahunPelajaranId;
  const effectiveSemesterId = semesterId || internalAcademic.values.semesterId;
  const rawTahunAjaran =
    typeof tahunAjaran === 'string' && tahunAjaran
      ? tahunAjaran
      : (tahunAjaran as any)?.tahun ||
        internalAcademic.activeTpYear?.tahun ||
        internalAcademic.activeTpYear?.nama ||
        '2025/2026';
  const effectiveTahunAjaran = String(rawTahunAjaran || '2025/2026');

  const [activeTab, setActiveTab] = useState<'penilaian' | 'ploting' | 'berita_acara'>('penilaian');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedJadwalForBa, setSelectedJadwalForBa] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DONE' | 'PENDING'>('ALL');
  const [predikatFilter, setPredikatFilter] = useState<string>('ALL');
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL');

  // Modal States
  const [formModalData, setFormModalData] = useState<{
    isOpen: boolean;
    data: any | null;
  }>({ isOpen: false, data: null });

  const [previewModalData, setPreviewModalData] = useState<{
    isOpen: boolean;
    siswaId?: string;
    namaSiswa?: string;
    nomorSertifikat?: string;
    studentsList?: UkkStudentItem[];
  }>({ isOpen: false });

  // 1. Query Data Sertifikat UKK dari backend (Aware Filter Tahun Akademik)
  const {
    data: ukkResponse,
    isLoading: isLoadingUkk,
    isFetching: isFetchingUkk,
    refetch: refetchUkk,
  } = useQuery({
    queryKey: ['kaprog-ukk-list', jurusanId, kelasId, effectiveTpId, effectiveTahunAjaran],
    queryFn: () =>
      raporApi.getUkk({
        jurusan_id: jurusanId,
        kelas_id: kelasId,
        tahun_pelajaran_id: effectiveTpId || undefined,
        tahun_ajaran: effectiveTahunAjaran || undefined,
      }).catch(() => ({ data: [] })),
    staleTime: 60 * 1000,
  });

  // 2. Query Siswa Tingkat Akhir (Kelas XII) jurusan ini (Aware Filter Tahun Akademik)
  const {
    data: siswaResponse,
    isLoading: isLoadingSiswa,
  } = useQuery({
    queryKey: ['kaprog-siswa-tingkat-akhir', jurusanId, kelasId, effectiveTpId, effectiveSemesterId],
    queryFn: () =>
      siswaApi.getAll({
        jurusan_id: jurusanId,
        kelas_id: kelasId,
        tingkat: 12,
        limit: 1000,
        tahun_pelajaran_id: effectiveTpId || undefined,
        semester_id: effectiveSemesterId || undefined,
      }).catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  // Helper isolasi sertifikat agar tidak bocor lintas tahun ajaran
  const isCertInActiveYear = (certDateStr?: string) => {
    if (!certDateStr || !effectiveTahunAjaran) return true;
    const parts = effectiveTahunAjaran.split('/');
    if (parts.length < 2) return true;
    const y1 = parseInt(parts[0], 10);
    const y2 = parseInt(parts[1], 10);
    if (isNaN(y1) || isNaN(y2)) return true;
    const d = new Date(certDateStr);
    const start = new Date(`${y1}-07-01T00:00:00.000Z`);
    const end = new Date(`${y2}-06-30T23:59:59.999Z`);
    return d >= start && d <= end;
  };

  // Gabungkan daftar siswa XII dengan data sertifikat UKK
  const combinedList: UkkRecordItem[] = useMemo(() => {
    const certList = (ukkResponse as any)?.data || ukkResponse || [];
    const certMap = new Map<string, any>();
    if (Array.isArray(certList)) {
      certList.forEach((c: any) => {
        if (c.siswa_id && isCertInActiveYear(c.tanggal_terbit)) {
          certMap.set(c.siswa_id, c);
        }
      });
    }

    const rawSiswaList = (siswaResponse as any)?.data || siswaResponse || [];
    const siswaArray = Array.isArray(rawSiswaList) ? rawSiswaList : [];

    // Jika ada siswa tingkat XII, gunakan itu sebagai baseline
    if (siswaArray.length > 0) {
      return siswaArray.map((s: any) => {
        const cert = certMap.get(s.id);
        const isDone = !!cert;
        return {
          id: cert?.id,
          siswa_id: s.id,
          nama_siswa: s.nama_siswa || 'Siswa',
          nis: s.nis || '-',
          nisn: s.nisn || cert?.Siswa?.nisn || '-',
          kelas: s.Kelas?.nama_kelas || s.nama_kelas || '-',
          tingkat: s.Kelas?.tingkat || 12,
          tahun_ajaran: s.TahunPelajaran?.tahun || s.tahun_ajaran || effectiveTahunAjaran,
          asesor_internal: cert?.asesor_internal || null,
          asesor_eksternal: cert?.asesor_eksternal || '',
          mitra_industri_id: cert?.mitra_industri_id || null,
          mitra_nama: cert?.MitraIndustri?.nama_mitra || cert?.MitraIndustri?.nama || '',
          nilai_praktik: cert?.nilai_praktik,
          nilai_teori: cert?.nilai_teori,
          predikat: cert?.predikat || '',
          nomor_sertifikat: cert?.nomor_sertifikat || '',
          tanggal_terbit: cert?.tanggal_terbit,
          isCompleted: isDone,
        };
      });
    }

    // Fallback: hanya tampilkan rekaman sertifikat yang tanggal terbitnya cocok dengan tahun ajaran aktif
    const filteredCertList = Array.isArray(certList)
      ? certList.filter((c: any) => isCertInActiveYear(c.tanggal_terbit))
      : [];

    if (filteredCertList.length > 0) {
      return filteredCertList.map((c: any) => ({
        id: c.id,
        siswa_id: c.siswa_id,
        nama_siswa: c.Siswa?.nama_siswa || 'Siswa',
        nis: c.Siswa?.nis || '-',
        nisn: c.Siswa?.nisn || '-',
        kelas: c.Siswa?.Kelas?.nama_kelas || '-',
        tingkat: c.Siswa?.Kelas?.tingkat || 12,
        tahun_ajaran: c.Siswa?.TahunPelajaran?.tahun || effectiveTahunAjaran,
        asesor_internal: c.asesor_internal || null,
        asesor_eksternal: c.asesor_eksternal || '',
        mitra_industri_id: c.mitra_industri_id || null,
        mitra_nama: c.MitraIndustri?.nama_mitra || c.MitraIndustri?.nama || '',
        nilai_praktik: c.nilai_praktik,
        nilai_teori: c.nilai_teori,
        predikat: c.predikat || '',
        nomor_sertifikat: c.nomor_sertifikat || '',
        tanggal_terbit: c.tanggal_terbit,
        isCompleted: true,
      }));
    }

    return [];
  }, [ukkResponse, siswaResponse, effectiveTahunAjaran]);

  // Ekstrak daftar kelas unik untuk filter
  const kelasOptions = useMemo(() => {
    const set = new Set<string>();
    combinedList.forEach((item) => {
      if (item.kelas && item.kelas !== '-') {
        set.add(item.kelas);
      }
    });
    return Array.from(set).sort();
  }, [combinedList]);

  // Filter gabungan
  const filteredList = useMemo(() => {
    return combinedList.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm.trim() ||
        item.nama_siswa?.toLowerCase().includes(q) ||
        item.nis?.toLowerCase().includes(q) ||
        item.kelas?.toLowerCase().includes(q) ||
        item.nomor_sertifikat?.toLowerCase().includes(q) ||
        item.asesor_eksternal?.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'DONE' && item.isCompleted) ||
        (statusFilter === 'PENDING' && !item.isCompleted);

      const matchPredikat =
        predikatFilter === 'ALL' ||
        item.predikat?.toLowerCase() === predikatFilter.toLowerCase();

      const matchKelas =
        selectedKelas === 'ALL' || item.kelas === selectedKelas;

      return matchSearch && matchStatus && matchPredikat && matchKelas;
    });
  }, [combinedList, searchTerm, statusFilter, predikatFilter, selectedKelas]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = combinedList.length;
    const completed = combinedList.filter((s) => s.isCompleted).length;
    const pending = total - completed;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const completedWithScore = combinedList.filter(
      (s) => s.isCompleted && s.nilai_praktik !== undefined
    );
    const avgScore =
      completedWithScore.length > 0
        ? Math.round(
            (completedWithScore.reduce((acc, curr) => acc + (curr.nilai_praktik || 0), 0) /
              completedWithScore.length) *
              10
          ) / 10
        : 0;

    return { total, completed, pending, pct, avgScore };
  }, [combinedList]);

  // Daftar siswa yang sudah selesai diuji dan bersertifikat (untuk navigasi & cetak massal)
  const certifiedStudentsList: UkkStudentItem[] = useMemo(() => {
    return filteredList
      .filter((s) => s.isCompleted)
      .map((s) => ({
        id: s.siswa_id,
        nama_siswa: s.nama_siswa,
        nis: s.nis,
        nisn: s.nisn,
        kelas: s.kelas,
        nomor_sertifikat: s.nomor_sertifikat,
        predikat: s.predikat,
        nilai_praktik: s.nilai_praktik,
        nilai_teori: s.nilai_teori,
        asesor_internal: s.asesor_internal || undefined,
        asesor_eksternal: s.asesor_eksternal,
        mitra_nama: s.mitra_nama,
        isCompleted: s.isCompleted,
        tahun_ajaran: s.tahun_ajaran || effectiveTahunAjaran,
      }));
  }, [filteredList, effectiveTahunAjaran]);

  // Daftar siswa untuk ploting jadwal
  const siswaListForPloting = useMemo(() => {
    const rawSiswaList = (siswaResponse as any)?.data || siswaResponse || [];
    if (!Array.isArray(rawSiswaList)) return [];
    return rawSiswaList.map((s: any) => ({
      id: s.id,
      nis: s.nis,
      nama_siswa: s.nama_siswa,
      kelas: s.Kelas?.nama_kelas || s.kelas?.nama_kelas || s.kelas,
    }));
  }, [siswaResponse]);

  const isLoadingTotal = isLoadingUkk && isLoadingSiswa;

  return (
    <div className="space-y-6">
      {/* Standalone Academic Filter Toolbar (rendered when not embedded in dashboard with external toolbar) */}
      {!hideLayout && !tahunPelajaranId && (
        <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
          <AcademicFilterToolbar
            {...internalAcademic.toolbarProps}
            variant="compact"
            className="w-full"
          />
        </div>
      )}

      {/* Sub-Tab Navigation Bar (Identik Desain Referensi Gambar 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-full shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('penilaian')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'penilaian'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Award className="w-4 h-4 text-amber-500" />
            Penilaian & Sertifikat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ploting')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'ploting'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Calendar className="w-4 h-4 text-blue-500" />
            Pra-UKK (Jadwal & Ploting)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('berita_acara')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'berita_acara'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/60 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            Berita Acara & Dokumentasi
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 px-3 py-1.5 rounded-xl shadow-xs">
            TA {effectiveTahunAjaran}
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setConfigModalOpen(true)}
              className="h-9 px-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-all"
              title="Konfigurasi Judul Penugasan & Daftar Unit Kompetensi SKKNI untuk Lembar Depan & Belakang Sertifikat"
            >
              <Settings2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Pengaturan Sertifikat & Unit SKKNI</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ploting' && (
        <UkkJadwalPlotingTab
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={effectiveTpId}
          tahunAjaran={effectiveTahunAjaran}
          siswaList={siswaListForPloting}
          readOnly={readOnly}
          onManageBeritaAcara={(sesi) => {
            setSelectedJadwalForBa(sesi.id);
            setActiveTab('berita_acara');
          }}
        />
      )}

      {activeTab === 'berita_acara' && (
        <UkkBeritaAcaraTab
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={effectiveTpId}
          tahunAjaran={effectiveTahunAjaran}
          readOnly={readOnly}
          selectedJadwalId={selectedJadwalForBa}
          onClearSelectedJadwal={() => setSelectedJadwalForBa(null)}
        />
      )}

      {activeTab === 'penilaian' && (
        <>
          {/* Header Stat Cards (Identik Desain Referensi Gambar 1 SiswaView) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Users size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {stats.total}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Peserta Tingkat Akhir
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {stats.completed}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Sudah Diuji & Lulus ({stats.pct}%)
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Clock size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {stats.pending}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Belum Mengikuti UKK
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Award size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {stats.avgScore || '-'}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Rata-rata Nilai Praktik
                </div>
              </div>
            </div>
          </div>

          {/* Mode Terfokus Banner (Identik Desain Referensi Gambar 1 SiswaView) */}
          <div className="flex items-center gap-2.5 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 shadow-2xs">
            <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold">Mode Terfokus:</span>{' '}
              <span>
                Menampilkan direktori dan administrasi Uji Kompetensi Keahlian (UKK) untuk{' '}
                <strong>Program Keahlian {jurusanNama}</strong>.
              </span>
            </div>
          </div>

          {/* Main Table Card with Toolbar (Identik Gambar 1 SiswaList) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            {/* Toolbar Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Daftar Nilai & Sertifikasi Uji Kompetensi Keahlian (UKK)</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {jurusanNama}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pengelolaan penilaian unjuk kerja praktik, verifikasi asesor internal/eksternal DUDI, dan penerbitan sertifikat.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {certifiedStudentsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewModalData({
                        isOpen: true,
                        siswaId: certifiedStudentsList[0]?.id,
                        namaSiswa: certifiedStudentsList[0]?.nama_siswa,
                        nomorSertifikat: certifiedStudentsList[0]?.nomor_sertifikat,
                        studentsList: certifiedStudentsList,
                      })
                    }
                    className="h-9 px-3.5 rounded-xl border border-amber-200/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Cetak atau pratinjau sertifikat siswa yang sudah dinilai"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Sertifikat ({certifiedStudentsList.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => refetchUkk()}
                  disabled={isFetchingUkk}
                  className="h-9 px-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Perbarui data UKK"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isFetchingUkk && 'animate-spin')} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filters Bar (Search & Filter Pills Identik Gambar 1) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
              {/* Search Box */}
              <div className="relative sm:col-span-2 lg:col-span-5">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa (NIS, Nama, Sertifikat, Asesor)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-xs font-medium rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 overflow-x-auto no-scrollbar sm:col-span-1 lg:col-span-3">
                {[
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'DONE', label: 'Sudah Diuji' },
                  { id: 'PENDING', label: 'Belum Diuji' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id as any)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                      statusFilter === st.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Filter Kelas Rombel */}
              {kelasOptions.length > 0 && (
                <div className="sm:col-span-1 lg:col-span-2">
                  <select
                    value={selectedKelas}
                    onChange={(e) => setSelectedKelas(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {kelasOptions.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filter Predikat */}
              <div className="sm:col-span-1 lg:col-span-2">
                <select
                  value={predikatFilter}
                  onChange={(e) => setPredikatFilter(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="ALL">Semua Predikat</option>
                  <option value="Sangat Kompeten">Sangat Kompeten</option>
                  <option value="Kompeten">Kompeten</option>
                  <option value="Cukup Kompeten">Cukup Kompeten</option>
                  <option value="Belum Kompeten">Belum Kompeten</option>
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Siswa</th>
                    <th className="py-3 px-4 whitespace-nowrap">Kelas</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Nilai Praktik</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Nilai Teori</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Predikat</th>
                    <th className="py-3 px-4">Asesor & Sertifikat</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoadingTotal ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader className="w-6 h-6 text-indigo-600 animate-spin" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Memuat data peserta dan nilai UKK...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Award className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                            Tidak ada data UKK yang cocok dengan filter.
                          </p>
                          <p className="text-xs text-slate-400">
                            Pastikan data rombel kelas XII pada program keahlian {jurusanNama} sudah aktif.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item) => {
                      return (
                        <tr
                          key={item.siswa_id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Nama Siswa & NIS */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {item.nama_siswa}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {item.nis || '-'}
                            </div>
                          </td>

                          {/* Kelas */}
                          <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {item.kelas}
                          </td>

                          {/* Nilai Praktik */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                            {item.nilai_praktik !== undefined && item.nilai_praktik !== null ? (
                              <span
                                className={cn(
                                  'px-2.5 py-0.5 rounded-full text-xs font-bold font-mono shadow-xs',
                                  item.nilai_praktik >= 75
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60'
                                )}
                              >
                                {item.nilai_praktik}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>
                            )}
                          </td>

                          {/* Nilai Teori */}
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {item.nilai_teori !== undefined && item.nilai_teori !== null ? (
                              item.nilai_teori
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>
                            )}
                          </td>

                          {/* Predikat */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {item.isCompleted ? (
                              <span
                                className={cn(
                                  'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs',
                                  item.predikat?.toLowerCase().includes('sangat')
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60'
                                    : item.predikat?.toLowerCase().includes('kompeten') &&
                                      !item.predikat?.toLowerCase().includes('belum')
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60'
                                )}
                              >
                                {item.predikat}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" /> Belum Diuji
                              </span>
                            )}
                          </td>

                          {/* Asesor & No Sertifikat */}
                          <td className="py-3.5 px-4 max-w-[260px]">
                            {item.isCompleted ? (
                              <div>
                                <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {item.nomor_sertifikat || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  Asesor: {item.asesor_eksternal || item.asesor_internal || '-'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                Belum ada catatan asesor
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Tombol Cetak / Pratinjau Sertifikat */}
                              {item.isCompleted && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewModalData({
                                      isOpen: true,
                                      siswaId: item.siswa_id,
                                      namaSiswa: item.nama_siswa,
                                      nomorSertifikat: item.nomor_sertifikat,
                                      studentsList: certifiedStudentsList,
                                    })
                                  }
                                  className="h-8 px-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                                  title="Cetak / Pratinjau Sertifikat UKK"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Sertifikat</span>
                                </button>
                              )}

                              {/* Tombol Input / Edit Nilai */}
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormModalData({
                                      isOpen: true,
                                      data: item,
                                    })
                                  }
                                  className={cn(
                                    'h-8 px-3 rounded-xl text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all',
                                    item.isCompleted
                                      ? 'border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                      : 'border border-indigo-200/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                                  )}
                                >
                                  {item.isCompleted ? (
                                    <>
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Edit</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Input Nilai</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </>
      )}

      {/* Modal Input & Edit Nilai UKK */}
      <UkkFormModal
        isOpen={formModalData.isOpen}
        onClose={() => setFormModalData({ isOpen: false, data: null })}
        initialData={formModalData.data}
        tahunAjaran={effectiveTahunAjaran}
        onSuccess={() => refetchUkk()}
      />

      {/* Modal Pratinjau & Cetak Sertifikat UKK */}
      <UkkSertifikatModal
        isOpen={previewModalData.isOpen}
        onClose={() => setPreviewModalData({ isOpen: false })}
        siswaId={previewModalData.siswaId}
        namaSiswa={previewModalData.namaSiswa}
        nomorSertifikat={previewModalData.nomorSertifikat}
        kelasNama={selectedKelas !== 'ALL' ? selectedKelas : undefined}
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        tahunAjaran={effectiveTahunAjaran}
        studentsList={previewModalData.studentsList || certifiedStudentsList}
      />

      {/* Modal Pengaturan Sertifikat Dinamis & Unit Kompetensi SKKNI */}
      <UkkJurusanConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        initialTahunAjaran={effectiveTahunAjaran}
      />
    </div>
  );
});

UkkView.displayName = 'UkkView';
