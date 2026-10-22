import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Building2,
  Users,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Sparkles,
  Search,
  CheckCircle2,
  Save,
  HelpCircle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { raporApi } from '@/api/rapor.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { hubinApi } from '@/api/hubin.api';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useConfirm } from '@/providers/ConfirmProvider';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  generatePdfUkkJadwal,
  type UkkJadwalSesi,
  type UkkJadwalPrintData,
} from '@/utils/print/modules/pdfUkkJadwal';
import type { UkkBeritaAcaraItem } from '@/utils/print/modules/pdfUkkBeritaAcara';
import { cn } from '@/lib/utils';

export interface UkkJadwalPlotingTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  siswaList: Array<{
    id: string;
    nis?: string;
    nama_siswa: string;
    kelas?: string;
  }>;
  readOnly?: boolean;
  onManageBeritaAcara?: (sesi: UkkJadwalSesi) => void;
}

export const UkkJadwalPlotingTab: React.FC<UkkJadwalPlotingTabProps> = ({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId: _tahunPelajaranId,
  tahunAjaran,
  siswaList = [],
  readOnly = false,
  onManageBeritaAcara,
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Form State for Session
  const [sessionForm, setSessionForm] = useState({
    nama_sesi: 'Sesi 1',
    tanggal: new Date().toISOString().split('T')[0],
    jam_mulai: '07:30',
    jam_selesai: '11:30',
    ruang: 'Lab Komputer 1',
    asesor_internal: '',
    asesor_eksternal: '',
    mitra_nama: '',
    selected_siswa_ids: [] as string[],
  });

  const [studentSearchInModal, setStudentSearchInModal] = useState('');

  // 1. Query Jadwal Sesi dari backend (Aware Filter Tahun Ajaran)
  const {
    data: jadwalRes,
    isLoading: isLoadingJadwal,
  } = useQuery({
    queryKey: ['ukk-jadwal', jurusanId, tahunAjaran],
    queryFn: () => (jurusanId ? raporApi.getUkkJadwal(jurusanId, tahunAjaran) : Promise.resolve({ data: [] })),
    enabled: !!jurusanId,
    staleTime: 60 * 1000,
  });

  const rawSessions: any[] = useMemo(() => {
    const data = jadwalRes?.data || jadwalRes;
    return Array.isArray(data) ? data : [];
  }, [jadwalRes]);

  // Convert raw sessions with full student data
  const sessions: UkkJadwalSesi[] = useMemo(() => {
    return rawSessions.map((s) => ({
      ...s,
      siswa_list: (s.siswa_ids || s.siswa_list || []).map((sIdOrObj: any) => {
        if (typeof sIdOrObj === 'object' && sIdOrObj !== null) return sIdOrObj;
        const found = siswaList.find((st) => st.id === sIdOrObj);
        return {
          id: sIdOrObj,
          nis: found?.nis || '-',
          nama_siswa: found?.nama_siswa || 'Siswa',
          kelas: found?.kelas || '-',
        };
      }),
    }));
  }, [rawSessions, siswaList]);

  // Query Mitra Industri
  const { data: mitraRes } = useQuery({
    queryKey: ['mitra-list-options'],
    queryFn: () => hubinApi.getMitraList({ limit: 100 }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const mitraOptions = useMemo(() => {
    const list = mitraRes?.data?.list || mitraRes?.list || mitraRes?.data || [];
    return Array.isArray(list) ? list : [];
  }, [mitraRes]);

  // Query Berita Acara untuk sinkronisasi status per sesi
  const { data: baRes } = useQuery({
    queryKey: ['ukk-berita-acara', jurusanId, tahunAjaran],
    queryFn: () => (jurusanId ? raporApi.getUkkBeritaAcara(jurusanId, tahunAjaran) : Promise.resolve({ data: [] })),
    enabled: !!jurusanId,
    staleTime: 60 * 1000,
  });

  const beritaAcaraList: UkkBeritaAcaraItem[] = useMemo(() => {
    const d = baRes?.data || baRes;
    return Array.isArray(d) ? d : [];
  }, [baRes]);

  // Hook Master Data Guru untuk Penguji Internal UKK
  const { options: guruOptions, rawList: guruList, isLoading: isLoadingGuru } = useGuruOptions({
    jenisPtk: 'ALL',
    onlyActive: true,
  });

  const computedGuruOptions = useMemo(() => {
    if (!sessionForm.asesor_internal) return guruOptions;
    const exists = guruOptions.some(
      (opt) =>
        opt.value === sessionForm.asesor_internal ||
        opt.label.toLowerCase().includes(sessionForm.asesor_internal.toLowerCase())
    );
    if (!exists && sessionForm.asesor_internal) {
      return [{ value: sessionForm.asesor_internal, label: sessionForm.asesor_internal }, ...guruOptions];
    }
    return guruOptions;
  }, [guruOptions, sessionForm.asesor_internal]);

  const currentGuruValue = useMemo(() => {
    if (!sessionForm.asesor_internal) return '';
    const found = guruList.find(
      (g) => g.nama_guru === sessionForm.asesor_internal || g.id === sessionForm.asesor_internal
    );
    return found?.id || sessionForm.asesor_internal;
  }, [sessionForm.asesor_internal, guruList]);

  // Save Sessions Mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedSessions: any[]) => {
      if (!jurusanId) throw new Error('Jurusan ID tidak ditemukan');
      return raporApi.saveUkkJadwal(jurusanId, updatedSessions, tahunAjaran);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ukk-jadwal', jurusanId] });
      toast.success(
        tahunAjaran
          ? `Jadwal & Ploting UKK TA ${tahunAjaran} berhasil disimpan!`
          : 'Jadwal & Ploting UKK berhasil disimpan!'
      );
      setSessionModalOpen(false);
      setEditingSessionId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan jadwal UKK');
    },
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSessionId(null);
    setSessionForm({
      nama_sesi: `Sesi ${sessions.length + 1}`,
      tanggal: new Date().toISOString().split('T')[0],
      jam_mulai: '07:30',
      jam_selesai: '11:30',
      ruang: 'Lab Kejuruan 1',
      asesor_internal: '',
      asesor_eksternal: '',
      mitra_nama: '',
      selected_siswa_ids: [],
    });
    setStudentSearchInModal('');
    setSessionModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (sesi: UkkJadwalSesi) => {
    setEditingSessionId(sesi.id);
    setSessionForm({
      nama_sesi: sesi.nama_sesi,
      tanggal: sesi.tanggal,
      jam_mulai: sesi.jam_mulai,
      jam_selesai: sesi.jam_selesai,
      ruang: sesi.ruang,
      asesor_internal: sesi.asesor_internal,
      asesor_eksternal: sesi.asesor_eksternal,
      mitra_nama: sesi.mitra_nama || '',
      selected_siswa_ids: (sesi.siswa_list || []).map((s) => s.id),
    });
    setStudentSearchInModal('');
    setSessionModalOpen(true);
  };

  // Submit Session Form
  const handleSubmitSession = () => {
    if (!sessionForm.nama_sesi || !sessionForm.tanggal) {
      toast.error('Nama sesi dan tanggal wajib diisi');
      return;
    }

    const newSessionItem = {
      id: editingSessionId || `sesi_${Date.now()}`,
      nama_sesi: sessionForm.nama_sesi,
      tanggal: sessionForm.tanggal,
      jam_mulai: sessionForm.jam_mulai,
      jam_selesai: sessionForm.jam_selesai,
      ruang: sessionForm.ruang,
      asesor_internal: sessionForm.asesor_internal,
      asesor_eksternal: sessionForm.asesor_eksternal,
      mitra_nama: sessionForm.mitra_nama,
      siswa_ids: sessionForm.selected_siswa_ids,
    };

    let updatedList = [...rawSessions];
    if (editingSessionId) {
      updatedList = updatedList.map((s) => (s.id === editingSessionId ? newSessionItem : s));
    } else {
      updatedList.push(newSessionItem);
    }

    saveMutation.mutate(updatedList);
  };

  // Delete Session (Pilar 15 - Dialog Konfirmasi Reusable Terstandar)
  const handleDeleteSession = async (sessionId: string) => {
    const ok = await confirm({
      title: 'Hapus Sesi UKK?',
      description: 'Apakah Anda yakin ingin menghapus jadwal sesi ini beserta daftar ploting siswa yang ada?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;
    const updatedList = rawSessions.filter((s) => s.id !== sessionId);
    saveMutation.mutate(updatedList);
  };

  // Quick Auto-Distribute Siswa to Existing Sessions
  const handleAutoDistributeStudents = async () => {
    if (sessions.length === 0) {
      toast.error('Buat minimal 1 sesi terlebih dahulu!');
      return;
    }
    if (siswaList.length === 0) {
      toast.error('Tidak ada siswa tingkat akhir untuk diplotkan!');
      return;
    }

    const ok = await confirm({
      title: 'Bagi Rata Siswa Otomatis?',
      description: `Bagi rata ${siswaList.length} siswa secara otomatis ke dalam ${sessions.length} sesi ujian aktif?`,
      confirmText: 'Ya, Bagi Rata',
      cancelText: 'Batal',
      style: 'primary',
    });
    if (!ok) return;

    const distributedSessions = rawSessions.map((s) => ({ ...s, siswa_ids: [] as string[] }));
    siswaList.forEach((siswa, idx) => {
      const targetSessionIdx = idx % distributedSessions.length;
      distributedSessions[targetSessionIdx].siswa_ids.push(siswa.id);
    });

    saveMutation.mutate(distributedSessions);
  };

  // Print Jadwal & Ploting Matrix PDF
  const handlePrintJadwalPdf = async () => {
    if (sessions.length === 0) {
      toast.error('Belum ada sesi UKK untuk dicetak!');
      return;
    }

    try {
      const [sekolahRes, settingsRes] = await Promise.all([
        sekolahApi.getProfile().catch(() => null),
        raporApi.getUkkSettings(jurusanId, tahunAjaran).catch(() => null),
      ]);

      const sekolahData = (sekolahRes as any)?.data || sekolahRes || {};
      const settingsData = (settingsRes as any)?.data || settingsRes || {};

      const printPayload: UkkJadwalPrintData = {
        jurusanNama: jurusanNama || 'Kejuruan',
        tahunPelajaran: tahunAjaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        skemaSertifikasi: settingsData?.skema_sertifikasi || 'Skema Sertifikasi KKNI Level II',
        judulPenugasan: settingsData?.judul_penugasan_id || 'Ujian Praktik Kejuruan Mandiri',
        sekolah: {
          nama: sekolahData?.nama || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: sekolahData?.alamat || '',
          kota: sekolahData?.kota || 'Purwakarta',
          kepala_sekolah: sekolahData?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: sekolahData?.nip_kepala || '-',
        },
        kaprog: {
          nama: 'Ketua Program Keahlian',
          nip: '-',
        },
        sesiList: sessions,
      };

      const { blobUrl } = generatePdfUkkJadwal(printPayload);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      toast.error('Gagal membuat dokumen PDF Jadwal UKK');
    }
  };

  // Plotted vs Unplotted count
  const plottedSiswaIds = useMemo(() => {
    const ids = new Set<string>();
    rawSessions.forEach((s) => {
      (s.siswa_ids || []).forEach((id: string) => ids.add(id));
    });
    return ids;
  }, [rawSessions]);

  const filteredStudentsForModal = useMemo(() => {
    if (!studentSearchInModal) return siswaList;
    const q = studentSearchInModal.toLowerCase();
    return siswaList.filter(
      (s) =>
        s.nama_siswa.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q)) ||
        (s.kelas && s.kelas.toLowerCase().includes(q))
    );
  }, [siswaList, studentSearchInModal]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics: Sesuai Benchmark Gambar 1 (Clean White Card + Small Gradient Icon Box) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Sesi UKK</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
              {sessions.length} Sesi
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Sesi terjadwal</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Siswa Terploting</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
              {plottedSiswaIds.size} <span className="text-xs font-semibold text-slate-400">/ {siswaList.length}</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Alokasi peserta</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Belum Diploting</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
              {Math.max(0, siswaList.length - plottedSiswaIds.size)} Siswa
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Menunggu sesi</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Kelengkapan Ploting</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
              {siswaList.length > 0 ? Math.round((plottedSiswaIds.size / siswaList.length) * 100) : 0}%
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">Rasio peserta</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Daftar Sesi Ujian & Ploting Penguji
          </h3>
          <Badge variant="outline" className="text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg">
            {jurusanNama}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoDistributeStudents}
                disabled={sessions.length === 0 || saveMutation.isPending}
                className="h-9 px-3 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                title="Bagi rata siswa ke seluruh sesi yang aktif"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Bagi Rata Otomatis
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                disabled={saveMutation.isPending}
                className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Sesi Ujian
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintJadwalPdf}
            disabled={sessions.length === 0}
            className="h-9 px-3 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            Cetak Jadwal & Ploting (PDF)
          </Button>
        </div>
      </div>

      {/* Sesi List Cards */}
      {isLoadingJadwal ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Memuat data jadwal & ploting UKK...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Belum Ada Sesi UKK</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Mulai atur pelaksanaan Pra-UKK dengan menambahkan sesi ujian, menentukan ruang/lab,
            mengalokasikan asesor internal dan asesor industri DU/DI, serta memploting daftar siswa.
          </p>
          {!readOnly && (
            <Button size="sm" onClick={handleOpenCreateModal} className="mt-2 text-xs font-semibold gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              Buat Sesi Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sessions.map((sesi, index) => {
            const sessionBa = beritaAcaraList.find(
              (b) => b.jadwal_id === sesi.id || b.nama_sesi === sesi.nama_sesi
            );

            return (
              <div key={sesi.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700">
                {/* Card Header */}
                <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shadow-2xs">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{sesi.nama_sesi}</h4>
                      {sessionBa ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          BA: {sessionBa.jumlah_hadir} Hadir
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          BA Belum Dibuat
                        </span>
                      )}
                    </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {sesi.tanggal}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {sesi.jam_mulai} - {sesi.jam_selesai} WIB
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {sesi.ruang}
                    </span>
                  </div>
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(sesi)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit Sesi & Ploting"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(sesi.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Assessors info */}
              <div className="px-4 py-3 bg-slate-50/40 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Penguji Internal:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {sesi.asesor_internal || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Penguji Eksternal (DU/DI):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {sesi.asesor_eksternal || '-'}{' '}
                    {sesi.mitra_nama ? `(${sesi.mitra_nama})` : ''}
                  </span>
                </div>
              </div>

              {/* Student List in Session */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Daftar Peserta Ujian
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {sesi.siswa_list?.length || 0} Siswa
                    </Badge>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {(!sesi.siswa_list || sesi.siswa_list.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        Belum ada siswa yang diplotkan pada sesi ini.
                      </p>
                    ) : (
                      sesi.siswa_list.map((s, sIdx) => (
                        <div
                          key={s.id || sIdx}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-slate-400 font-mono w-4">
                              {sIdx + 1}.
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {s.nama_siswa}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400 font-mono">
                              {s.nis || '-'}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                              {s.kelas || '-'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Laporan Berita Acara:</span>
                    {sessionBa ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selesai ({sessionBa.jumlah_hadir}/{sessionBa.jumlah_peserta} Siswa)
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Belum Dibuat
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {!readOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(sesi)}
                        className="text-xs font-semibold gap-1.5 w-full cursor-pointer h-8 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Kelola Ploting
                      </Button>
                    )}

                    {onManageBeritaAcara && (
                      <Button
                        variant={sessionBa ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => onManageBeritaAcara(sesi)}
                        className={cn(
                          'text-xs font-semibold gap-1.5 w-full cursor-pointer h-8 rounded-xl',
                          sessionBa
                            ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                        )}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {sessionBa ? 'Buka Berita Acara' : 'Buat Berita Acara'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Edit Sesi */}
      <Modal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        title={editingSessionId ? 'Edit Sesi & Ploting Siswa' : 'Tambah Sesi Ujian UKK Baru'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nama Sesi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sessionForm.nama_sesi}
                onChange={(e) => setSessionForm({ ...sessionForm, nama_sesi: e.target.value })}
                placeholder="Contoh: Sesi 1 (Pagi)"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tanggal Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={sessionForm.tanggal}
                onChange={(e) => setSessionForm({ ...sessionForm, tanggal: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jam Mulai</label>
              <input
                type="text"
                value={sessionForm.jam_mulai}
                onChange={(e) => setSessionForm({ ...sessionForm, jam_mulai: e.target.value })}
                placeholder="07:30"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jam Selesai</label>
              <input
                type="text"
                value={sessionForm.jam_selesai}
                onChange={(e) => setSessionForm({ ...sessionForm, jam_selesai: e.target.value })}
                placeholder="11:30"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ruang / Bengkel / Lab</label>
              <input
                type="text"
                value={sessionForm.ruang}
                onChange={(e) => setSessionForm({ ...sessionForm, ruang: e.target.value })}
                placeholder="Lab Komputer 1"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Penguji Internal (Guru Master)</span>
                {sessionForm.asesor_internal && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[150px]">
                    {sessionForm.asesor_internal}
                  </span>
                )}
              </label>
              <div className="mt-1">
                <SearchableSelect
                  value={currentGuruValue}
                  onValueChange={(val) => {
                    const found = guruList.find((g) => g.id === val);
                    setSessionForm({
                      ...sessionForm,
                      asesor_internal: found ? found.nama_guru : val,
                    });
                  }}
                  options={computedGuruOptions}
                  placeholder="Pilih Guru Penguji Internal..."
                  searchPlaceholder="Cari nama guru atau NIP..."
                  isLoading={isLoadingGuru}
                  clearable
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Penguji Eksternal (DU/DI)
              </label>
              <input
                type="text"
                value={sessionForm.asesor_eksternal}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, asesor_eksternal: e.target.value })
                }
                placeholder="Nama Asesor DU/DI"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mitra Industri / DU-DI</label>
            <select
              value={sessionForm.mitra_nama}
              onChange={(e) => setSessionForm({ ...sessionForm, mitra_nama: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-xs"
            >
              <option value="">Pilih Mitra Industri (Opsional)...</option>
              {mitraOptions.map((m: any) => (
                <option key={m.id} value={m.nama}>
                  {m.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Student Multi-Select Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Pilih Peserta Ujian Sesi Ini ({sessionForm.selected_siswa_ids.length} Dipilih)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSessionForm({
                      ...sessionForm,
                      selected_siswa_ids: siswaList.map((s) => s.id),
                    })
                  }
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setSessionForm({ ...sessionForm, selected_siswa_ids: [] })}
                  className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={studentSearchInModal}
                onChange={(e) => setStudentSearchInModal(e.target.value)}
                placeholder="Cari nama siswa atau NIS..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/40">
              {filteredStudentsForModal.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Siswa tidak ditemukan
                </div>
              ) : (
                filteredStudentsForModal.map((siswa) => {
                  const isChecked = sessionForm.selected_siswa_ids.includes(siswa.id);
                  const isPlottedOther =
                    plottedSiswaIds.has(siswa.id) &&
                    !sessions
                      .find((s) => s.id === editingSessionId)
                      ?.siswa_list?.some((st) => st.id === siswa.id);

                  return (
                    <label
                      key={siswa.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors',
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white font-medium'
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60 border border-transparent text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSessionForm({
                                ...sessionForm,
                                selected_siswa_ids: [
                                  ...sessionForm.selected_siswa_ids,
                                  siswa.id,
                                ],
                              });
                            } else {
                              setSessionForm({
                                ...sessionForm,
                                selected_siswa_ids: sessionForm.selected_siswa_ids.filter(
                                  (id) => id !== siswa.id
                                ),
                              });
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="font-medium text-slate-900 dark:text-white">{siswa.nama_siswa}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {siswa.nis || '-'}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                          {siswa.kelas || '-'}
                        </Badge>
                        {isPlottedOther && (
                          <Badge variant="secondary" className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                            Sesi Lain
                          </Badge>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionModalOpen(false)}
              disabled={saveMutation.isPending}
              className="h-9 px-3.5 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitSession}
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs font-semibold h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Sesi & Ploting'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
