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
import { raporApi } from '@/api/rapor.api';
import { siswaApi } from '@/api/academic.api';
import { UkkFormModal } from './UkkFormModal';
import { UkkSertifikatModal, type UkkStudentItem } from './UkkSertifikatModal';
import { UkkJurusanConfigModal } from './UkkJurusanConfigModal';
import { UkkJadwalPlotingTab } from './UkkJadwalPlotingTab';
import { UkkBeritaAcaraTab } from './UkkBeritaAcaraTab';
import { cn } from '@/lib/utils';

export interface UkkRecordItem {
  id?: string;
  siswa_id: string;
  nama_siswa: string;
  nis?: string;
  kelas?: string;
  tingkat?: number | string;
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
  semesterId,
  isModal = false,
  hideLayout = false,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'penilaian' | 'ploting' | 'berita_acara'>('penilaian');
  const [configModalOpen, setConfigModalOpen] = useState(false);
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

  // 1. Query Data Sertifikat UKK dari backend
  const {
    data: ukkResponse,
    isLoading: isLoadingUkk,
    isFetching: isFetchingUkk,
    refetch: refetchUkk,
  } = useQuery({
    queryKey: ['kaprog-ukk-list', jurusanId, kelasId],
    queryFn: () =>
      raporApi.getUkk({
        jurusan_id: jurusanId,
        kelas_id: kelasId,
      }).catch(() => ({ data: [] })),
    staleTime: 60 * 1000,
  });

  // 2. Query Siswa Tingkat Akhir (Kelas XII) jurusan ini
  const {
    data: siswaResponse,
    isLoading: isLoadingSiswa,
  } = useQuery({
    queryKey: ['kaprog-siswa-tingkat-akhir', jurusanId, kelasId],
    queryFn: () =>
      siswaApi.getAll({
        jurusan_id: jurusanId,
        kelas_id: kelasId,
        tingkat: 12,
        limit: 1000,
      }).catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  // Gabungkan daftar siswa XII dengan data sertifikat UKK
  const combinedList: UkkRecordItem[] = useMemo(() => {
    const certList = (ukkResponse as any)?.data || ukkResponse || [];
    const certMap = new Map<string, any>();
    if (Array.isArray(certList)) {
      certList.forEach((c: any) => {
        if (c.siswa_id) {
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
          kelas: s.Kelas?.nama_kelas || s.nama_kelas || '-',
          tingkat: s.Kelas?.tingkat || 12,
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

    // Fallback: tampilkan siswa yang ada di certList
    if (Array.isArray(certList) && certList.length > 0) {
      return certList.map((c: any) => ({
        id: c.id,
        siswa_id: c.siswa_id,
        nama_siswa: c.Siswa?.nama_siswa || 'Siswa',
        nis: c.Siswa?.nis || '-',
        kelas: c.Siswa?.Kelas?.nama_kelas || '-',
        tingkat: c.Siswa?.Kelas?.tingkat || 12,
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
  }, [ukkResponse, siswaResponse]);

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
        kelas: s.kelas,
        nomor_sertifikat: s.nomor_sertifikat,
        predikat: s.predikat,
        nilai_praktik: s.nilai_praktik,
        nilai_teori: s.nilai_teori,
        asesor_internal: s.asesor_internal || undefined,
        asesor_eksternal: s.asesor_eksternal,
        mitra_nama: s.mitra_nama,
        isCompleted: s.isCompleted,
      }));
  }, [filteredList]);

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
      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('penilaian')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'penilaian'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
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
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
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
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            Berita Acara & Dokumentasi
          </button>
        </div>

        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigModalOpen(true)}
            className="text-xs font-semibold gap-1.5 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 self-start sm:self-auto cursor-pointer"
            title="Konfigurasi Judul Penugasan & Daftar Unit Kompetensi SKKNI untuk Lembar Depan & Belakang Sertifikat"
          >
            <Settings2 className="w-3.5 h-3.5 text-primary" />
            <span>Pengaturan Sertifikat & Unit SKKNI</span>
          </Button>
        )}
      </div>

      {activeTab === 'ploting' && (
        <UkkJadwalPlotingTab
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          siswaList={siswaListForPloting}
          readOnly={readOnly}
        />
      )}

      {activeTab === 'berita_acara' && (
        <UkkBeritaAcaraTab
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          readOnly={readOnly}
        />
      )}

      {activeTab === 'penilaian' && (
        <>
          {/* Header Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card
          noPadding
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Peserta Tingkat Akhir
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-400">siswa</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Target uji kompetensi {jurusanNama}
          </p>
        </Card>

        <Card
          noPadding
          className="p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Sudah Diuji & Lulus
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats.completed}
            </span>
            <span className="text-[11px] text-emerald-600/80 font-bold font-mono">
              ({stats.pct}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Sertifikat siap dicetak & diterbitkan
          </p>
        </Card>

        <Card
          noPadding
          className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Belum Mengikuti UKK
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {stats.pending}
            </span>
            <span className="text-[11px] text-amber-500/80 font-medium">siswa</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Menunggu jadwal / pelaksanaan ujian
          </p>
        </Card>

        <Card
          noPadding
          className="p-4 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Rata-rata Nilai Praktik
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 font-mono">
              {stats.avgScore || '-'}
            </span>
            <span className="text-[11px] text-indigo-500/80 font-medium">skor unjuk kerja</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Standar kelulusan kompetensi kejuruan
          </p>
        </Card>
      </div>

      {/* Main Table Card with Toolbar */}
      <Card
        noPadding
        className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4"
      >
        {/* Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Daftar Nilai & Sertifikasi Uji Kompetensi Keahlian (UKK)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                {jurusanNama}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengelolaan penilaian unjuk kerja praktik, verifikasi asesor internal/eksternal DUDI, dan penerbitan sertifikat.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {certifiedStudentsList.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPreviewModalData({
                    isOpen: true,
                    siswaId: certifiedStudentsList[0]?.id,
                    namaSiswa: certifiedStudentsList[0]?.nama_siswa,
                    nomorSertifikat: certifiedStudentsList[0]?.nomor_sertifikat,
                    studentsList: certifiedStudentsList,
                  })
                }
                className="text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 cursor-pointer"
                title="Cetak atau pratinjau sertifikat siswa yang sudah dinilai"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                <span>Cetak Sertifikat ({certifiedStudentsList.length})</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchUkk()}
              disabled={isFetchingUkk}
              className="text-xs font-semibold rounded-xl cursor-pointer"
              title="Perbarui data UKK"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isFetchingUkk && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa, NIS, nomor sertifikat, atau asesor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar sm:col-span-1 lg:col-span-3">
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
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
          <div className="sm:col-span-1 lg:col-span-3">
            <select
              value={predikatFilter}
              onChange={(e) => setPredikatFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/70 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Siswa</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Kelas</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Nilai Praktik</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Nilai Teori</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Predikat</th>
                <th className="py-2.5 px-4">Asesor & Sertifikat</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoadingTotal ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
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
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        Tidak ada data UKK yang cocok dengan filter.
                      </p>
                      <p className="text-[11px] text-slate-400">
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
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Nama Siswa & NIS */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {item.nama_siswa}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.nis || '-'}
                        </div>
                      </td>

                      {/* Kelas */}
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.kelas}
                      </td>

                      {/* Nilai Praktik */}
                      <td className="py-3 px-4 text-center font-mono font-bold whitespace-nowrap">
                        {item.nilai_praktik !== undefined && item.nilai_praktik !== null ? (
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs',
                              item.nilai_praktik >= 75
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
                            )}
                          >
                            {item.nilai_praktik}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Nilai Teori */}
                      <td className="py-3 px-4 text-center font-mono font-semibold whitespace-nowrap">
                        {item.nilai_teori !== undefined && item.nilai_teori !== null ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            {item.nilai_teori}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Predikat */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.isCompleted ? (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                              item.predikat?.toLowerCase().includes('sangat')
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                                : item.predikat?.toLowerCase().includes('kompeten') &&
                                  !item.predikat?.toLowerCase().includes('belum')
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                            )}
                          >
                            {item.predikat}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="w-3 h-3" /> Belum Diuji
                          </span>
                        )}
                      </td>

                      {/* Asesor & No Sertifikat */}
                      <td className="py-3 px-4 max-w-[260px]">
                        {item.isCompleted ? (
                          <div>
                            <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                              {item.nomor_sertifikat || '-'}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              Asesor: {item.asesor_eksternal || item.asesor_internal || '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Belum ada catatan asesor
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Cetak / Pratinjau Sertifikat */}
                          {item.isCompleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPreviewModalData({
                                  isOpen: true,
                                  siswaId: item.siswa_id,
                                  namaSiswa: item.nama_siswa,
                                  nomorSertifikat: item.nomor_sertifikat,
                                  studentsList: certifiedStudentsList,
                                })
                              }
                              className="h-7 px-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              title="Cetak / Pratinjau Sertifikat UKK"
                            >
                              <Printer className="w-3 h-3" />
                              <span className="hidden sm:inline">Sertifikat</span>
                            </Button>
                          )}

                          {/* Tombol Input / Edit Nilai */}
                          {!readOnly && (
                            <Button
                              variant={item.isCompleted ? 'ghost' : 'outline'}
                              size="sm"
                              onClick={() =>
                                setFormModalData({
                                  isOpen: true,
                                  data: item,
                                })
                              }
                              className={cn(
                                'h-7 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer',
                                item.isCompleted
                                  ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                              )}
                            >
                              {item.isCompleted ? (
                                <>
                                  <Edit3 className="w-3 h-3" />
                                  <span className="hidden sm:inline">Edit</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Input Nilai</span>
                                </>
                              )}
                            </Button>
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
      </Card>
      </>
      )}

      {/* Modal Input & Edit Nilai UKK */}
      <UkkFormModal
        isOpen={formModalData.isOpen}
        onClose={() => setFormModalData({ isOpen: false, data: null })}
        initialData={formModalData.data}
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
        jurusanNama={jurusanNama}
        studentsList={previewModalData.studentsList || certifiedStudentsList}
      />

      {/* Modal Pengaturan Sertifikat Dinamis & Unit Kompetensi SKKNI */}
      <UkkJurusanConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
      />
    </div>
  );
});

UkkView.displayName = 'UkkView';
