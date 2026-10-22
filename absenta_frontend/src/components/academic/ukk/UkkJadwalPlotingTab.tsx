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
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { raporApi } from '@/api/rapor.api';
import { sekolahApi } from '@/api/academic.api';
import { hubinApi } from '@/api/hubin.api';
import {
  generatePdfUkkJadwal,
  type UkkJadwalSesi,
  type UkkJadwalPrintData,
} from '@/utils/print/modules/pdfUkkJadwal';
import { cn } from '@/lib/utils';

export interface UkkJadwalPlotingTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  siswaList: Array<{
    id: string;
    nis?: string;
    nama_siswa: string;
    kelas?: string;
  }>;
  readOnly?: boolean;
}

export const UkkJadwalPlotingTab: React.FC<UkkJadwalPlotingTabProps> = ({
  jurusanId,
  jurusanNama = 'Kejuruan',
  siswaList = [],
  readOnly = false,
}) => {
  const queryClient = useQueryClient();

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

  // 1. Query Jadwal Sesi dari backend
  const {
    data: jadwalRes,
    isLoading: isLoadingJadwal,
  } = useQuery({
    queryKey: ['ukk-jadwal', jurusanId],
    queryFn: () => (jurusanId ? raporApi.getUkkJadwal(jurusanId) : Promise.resolve({ data: [] })),
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

  // Save Sessions Mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedSessions: any[]) => {
      if (!jurusanId) throw new Error('Jurusan ID tidak ditemukan');
      return raporApi.saveUkkJadwal(jurusanId, updatedSessions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ukk-jadwal', jurusanId] });
      toast.success('Jadwal & Ploting UKK berhasil disimpan!');
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

  // Delete Session
  const handleDeleteSession = (sessionId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal sesi ini?')) return;
    const updatedList = rawSessions.filter((s) => s.id !== sessionId);
    saveMutation.mutate(updatedList);
  };

  // Quick Auto-Distribute Siswa to Existing Sessions
  const handleAutoDistributeStudents = () => {
    if (sessions.length === 0) {
      toast.error('Buat minimal 1 sesi terlebih dahulu!');
      return;
    }
    if (siswaList.length === 0) {
      toast.error('Tidak ada siswa tingkat akhir untuk diplotkan!');
      return;
    }

    if (
      !window.confirm(
        `Bagi rata ${siswaList.length} siswa secara otomatis ke dalam ${sessions.length} sesi yang ada?`
      )
    )
      return;

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
        raporApi.getUkkSettings(jurusanId).catch(() => null),
      ]);

      const sekolahData = (sekolahRes as any)?.data || sekolahRes || {};
      const settingsData = (settingsRes as any)?.data || settingsRes || {};

      const printPayload: UkkJadwalPrintData = {
        jurusanNama: jurusanNama || 'Kejuruan',
        tahunPelajaran: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
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
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Sesi UKK</p>
              <h3 className="text-xl font-bold text-foreground">{sessions.length} Sesi</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Siswa Terploting</p>
              <h3 className="text-xl font-bold text-foreground">
                {plottedSiswaIds.size} / {siswaList.length}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Belum Diploting</p>
              <h3 className="text-xl font-bold text-foreground">
                {Math.max(0, siswaList.length - plottedSiswaIds.size)} Siswa
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Kelengkapan Ploting</p>
              <h3 className="text-xl font-bold text-foreground">
                {siswaList.length > 0
                  ? Math.round((plottedSiswaIds.size / siswaList.length) * 100)
                  : 0}
                %
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">
            Daftar Sesi Ujian & Ploting Penguji
          </h3>
          <Badge variant="outline" className="text-xs font-normal">
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
                className="text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950"
                title="Bagi rata siswa ke seluruh sesi yang aktif"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Bagi Rata Otomatis
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                disabled={saveMutation.isPending}
                className="text-xs gap-1.5"
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
            className="text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Jadwal & Ploting (PDF)
          </Button>
        </div>
      </div>

      {/* Sesi List Cards */}
      {isLoadingJadwal ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Memuat data jadwal & ploting UKK...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h4 className="text-base font-semibold text-foreground">Belum Ada Sesi UKK</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Mulai atur pelaksanaan Pra-UKK dengan menambahkan sesi ujian, menentukan ruang/lab,
            mengalokasikan asesor internal dan asesor industri DU/DI, serta memploting daftar siswa.
          </p>
          {!readOnly && (
            <Button size="sm" onClick={handleOpenCreateModal} className="mt-2 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Buat Sesi Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sessions.map((sesi, index) => (
            <Card key={sesi.id} className="border shadow-sm overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="bg-muted/40 p-4 border-b flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">{sesi.nama_sesi}</h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {sesi.tanggal}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {sesi.jam_mulai} - {sesi.jam_selesai} WIB
                    </span>
                    <span className="flex items-center gap-1">
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
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                      title="Edit Sesi & Ploting"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(sesi.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Assessors info */}
              <div className="px-4 py-3 bg-muted/10 border-b text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Penguji Internal:</span>
                  <span className="font-semibold text-foreground">
                    {sesi.asesor_internal || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Penguji Eksternal (DU/DI):</span>
                  <span className="font-semibold text-foreground">
                    {sesi.asesor_eksternal || '-'}{' '}
                    {sesi.mitra_nama ? `(${sesi.mitra_nama})` : ''}
                  </span>
                </div>
              </div>

              {/* Student List in Session */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">
                      Daftar Peserta Ujian
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-medium">
                      {sesi.siswa_list?.length || 0} Siswa
                    </Badge>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {(!sesi.siswa_list || sesi.siswa_list.length === 0) ? (
                      <p className="text-xs text-muted-foreground italic py-4 text-center">
                        Belum ada siswa yang diplotkan pada sesi ini.
                      </p>
                    ) : (
                      sesi.siswa_list.map((s, sIdx) => (
                        <div
                          key={s.id || sIdx}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-muted-foreground font-mono w-4">
                              {sIdx + 1}.
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {s.nama_siswa}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {s.nis || '-'}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {s.kelas || '-'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(sesi)}
                    className="w-full mt-3 text-xs gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Kelola Ploting Siswa Sesi Ini
                  </Button>
                )}
              </div>
            </Card>
          ))}
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
              <label className="text-xs font-semibold text-foreground">
                Nama Sesi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sessionForm.nama_sesi}
                onChange={(e) => setSessionForm({ ...sessionForm, nama_sesi: e.target.value })}
                placeholder="Contoh: Sesi 1 (Pagi)"
                className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Tanggal Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={sessionForm.tanggal}
                onChange={(e) => setSessionForm({ ...sessionForm, tanggal: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Jam Mulai</label>
              <input
                type="text"
                value={sessionForm.jam_mulai}
                onChange={(e) => setSessionForm({ ...sessionForm, jam_mulai: e.target.value })}
                placeholder="07:30"
                className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Jam Selesai</label>
              <input
                type="text"
                value={sessionForm.jam_selesai}
                onChange={(e) => setSessionForm({ ...sessionForm, jam_selesai: e.target.value })}
                placeholder="11:30"
                className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Ruang / Bengkel / Lab</label>
              <input
                type="text"
                value={sessionForm.ruang}
                onChange={(e) => setSessionForm({ ...sessionForm, ruang: e.target.value })}
                placeholder="Lab Komputer 1"
                className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Penguji Internal</label>
              <input
                type="text"
                value={sessionForm.asesor_internal}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, asesor_internal: e.target.value })
                }
                placeholder="Nama Guru Penguji Internal"
                className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Penguji Eksternal (DU/DI)
              </label>
              <input
                type="text"
                value={sessionForm.asesor_eksternal}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, asesor_eksternal: e.target.value })
                }
                placeholder="Nama Asesor DU/DI"
                className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Mitra Industri / DU-DI</label>
            <select
              value={sessionForm.mitra_nama}
              onChange={(e) => setSessionForm({ ...sessionForm, mitra_nama: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-xs bg-background border rounded-lg focus:ring-1 focus:ring-primary outline-none"
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
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
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
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Pilih Semua
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={() => setSessionForm({ ...sessionForm, selected_siswa_ids: [] })}
                  className="text-[11px] text-rose-500 hover:underline font-medium"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={studentSearchInModal}
                onChange={(e) => setStudentSearchInModal(e.target.value)}
                placeholder="Cari nama siswa atau NIS..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/30 border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="max-h-52 overflow-y-auto border rounded-lg p-2 space-y-1">
              {filteredStudentsForModal.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
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
                        'flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors',
                        isChecked
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
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
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="font-medium text-foreground">{siswa.nama_siswa}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {siswa.nis || '-'}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {siswa.kelas || '-'}
                        </Badge>
                        {isPlottedOther && (
                          <Badge variant="secondary" className="text-[9px] text-amber-600 bg-amber-50">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionModalOpen(false)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitSession}
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs"
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
