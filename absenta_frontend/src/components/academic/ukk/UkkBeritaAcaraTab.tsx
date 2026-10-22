import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Printer,
  Plus,
  Users,
  Camera,
  Save,
  Check,
  PenTool,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { DigitalSignatureField } from '@/components/ui/DigitalSignatureField';
import { raporApi } from '@/api/rapor.api';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useConfirm } from '@/providers/ConfirmProvider';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  generatePdfUkkBeritaAcara,
  type UkkBeritaAcaraItem,
  type UkkBeritaAcaraPrintData,
} from '@/utils/print/modules/pdfUkkBeritaAcara';
import { UkkBeritaAcaraPrintModal } from './UkkBeritaAcaraPrintModal';
import { useUkkStrukturSigners } from './useUkkStrukturSigners';
import { cn } from '@/lib/utils';

export interface UkkBeritaAcaraTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  readOnly?: boolean;
  selectedJadwalId?: string | null;
  onClearSelectedJadwal?: () => void;
}

export const UkkBeritaAcaraTab: React.FC<UkkBeritaAcaraTabProps> = ({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId: _tahunPelajaranId,
  tahunAjaran,
  readOnly = false,
  selectedJadwalId,
  onClearSelectedJadwal,
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const autoSigners = useUkkStrukturSigners(jurusanId, jurusanNama);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>('ALL');
  const [printModalItem, setPrintModalItem] = useState<UkkBeritaAcaraItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<UkkBeritaAcaraItem>({
    id: '',
    nama_sesi: 'Sesi 1',
    tanggal: new Date().toISOString().split('T')[0],
    jam_mulai: '07:30',
    jam_selesai: '11:30',
    ruang: 'Lab Komputer 1',
    jumlah_peserta: 20,
    jumlah_hadir: 20,
    jumlah_tidak_hadir: 0,
    catatan_pelaksanaan:
      'Pelaksanaan Ujian UKK berjalan dengan aman, tertib, dan lancar sesuai dengan SOP.',
    kendala: '',
    penguji_internal: '',
    penguji_eksternal: '',
    mitra_nama: '',
    panitia: 'Ketua Panitia UKK',
    status: 'SELESAI',
    foto_dokumentasi: [],
  });

  // 1. Fetch Existing Berita Acara Records (Aware Filter Tahun Ajaran)
  const { data: baRes, isLoading } = useQuery({
    queryKey: ['ukk-berita-acara', jurusanId, tahunAjaran],
    queryFn: () => (jurusanId ? raporApi.getUkkBeritaAcara(jurusanId, tahunAjaran) : Promise.resolve({ data: [] })),
    enabled: !!jurusanId,
    staleTime: 60 * 1000,
  });

  const rawRecords: any[] = useMemo(() => {
    const d = baRes?.data || baRes;
    return Array.isArray(d) ? d : [];
  }, [baRes]);

  const records: UkkBeritaAcaraItem[] = rawRecords;

  // 2. Fetch Jadwal Sesi to allow quick pre-fill
  const { data: jadwalRes } = useQuery({
    queryKey: ['ukk-jadwal', jurusanId, tahunAjaran],
    queryFn: () => (jurusanId ? raporApi.getUkkJadwal(jurusanId, tahunAjaran) : Promise.resolve({ data: [] })),
    enabled: !!jurusanId,
    staleTime: 60 * 1000,
  });

  const sessionsFromJadwal: any[] = useMemo(() => {
    const d = jadwalRes?.data || jadwalRes;
    return Array.isArray(d) ? d : [];
  }, [jadwalRes]);

  // Hook Master Data Guru
  const { options: guruOptions, rawList: guruList, isLoading: isLoadingGuru } = useGuruOptions({
    jenisPtk: 'ALL',
    onlyActive: true,
  });

  const computedGuruOptions = useMemo(() => {
    if (!formData.penguji_internal) return guruOptions;
    const exists = guruOptions.some(
      (opt) =>
        opt.value === formData.penguji_internal ||
        opt.label.toLowerCase().includes(formData.penguji_internal.toLowerCase())
    );
    if (!exists && formData.penguji_internal) {
      return [{ value: formData.penguji_internal, label: formData.penguji_internal }, ...guruOptions];
    }
    return guruOptions;
  }, [guruOptions, formData.penguji_internal]);

  const currentGuruValue = useMemo(() => {
    if (!formData.penguji_internal) return '';
    const found = guruList.find(
      (g) => g.nama_guru === formData.penguji_internal || g.id === formData.penguji_internal
    );
    return found?.id || formData.penguji_internal;
  }, [formData.penguji_internal, guruList]);

  // Handle auto-open when coming from Jadwal Ploting
  useEffect(() => {
    if (selectedJadwalId && sessionsFromJadwal.length > 0) {
      const foundSession = sessionsFromJadwal.find((s) => s.id === selectedJadwalId);
      if (foundSession) {
        const existingBa = records.find(
          (r) => r.jadwal_id === selectedJadwalId || r.nama_sesi === foundSession.nama_sesi
        );
        if (existingBa) {
          handleOpenEdit(existingBa);
        } else {
          handleOpenCreateForSession(foundSession);
        }
      }
      onClearSelectedJadwal?.();
    }
  }, [selectedJadwalId, sessionsFromJadwal, records]);

  const handleOpenCreateForSession = (sesi: any) => {
    setEditingId(null);
    const count = sesi.siswa_ids?.length || sesi.siswa_list?.length || 0;
    setFormData({
      id: `ba_${Date.now()}`,
      jadwal_id: sesi.id,
      nama_sesi: sesi.nama_sesi,
      tanggal: sesi.tanggal || new Date().toISOString().split('T')[0],
      jam_mulai: sesi.jam_mulai || '07:30',
      jam_selesai: sesi.jam_selesai || '11:30',
      ruang: sesi.ruang || 'Lab Kejuruan 1',
      jumlah_peserta: count,
      jumlah_hadir: count,
      jumlah_tidak_hadir: 0,
      catatan_pelaksanaan:
        'Pelaksanaan Ujian UKK berjalan dengan aman, tertib, dan lancar sesuai dengan SOP teknis.',
      kendala: '',
      penguji_internal: sesi.asesor_internal || '',
      penguji_eksternal: sesi.asesor_eksternal || '',
      mitra_nama: sesi.mitra_nama || '',
      panitia: autoSigners.kaprog.nama || 'Ketua Panitia UKK',
      status: 'SELESAI',
      foto_dokumentasi: [],
    });
    setModalOpen(true);
  };

  const handleSelectJadwalSession = (sesiId: string) => {
    if (!sesiId) {
      setFormData((prev) => ({ ...prev, jadwal_id: undefined }));
      return;
    }
    const targetSession = sessionsFromJadwal.find((s) => s.id === sesiId);
    if (!targetSession) return;

    const count = targetSession.siswa_ids?.length || targetSession.siswa_list?.length || 0;
    setFormData((prev) => ({
      ...prev,
      jadwal_id: targetSession.id,
      nama_sesi: targetSession.nama_sesi,
      tanggal: targetSession.tanggal || prev.tanggal,
      jam_mulai: targetSession.jam_mulai || prev.jam_mulai,
      jam_selesai: targetSession.jam_selesai || prev.jam_selesai,
      ruang: targetSession.ruang || prev.ruang,
      penguji_internal: targetSession.asesor_internal || prev.penguji_internal,
      penguji_eksternal: targetSession.asesor_eksternal || prev.penguji_eksternal,
      mitra_nama: targetSession.mitra_nama || prev.mitra_nama,
      jumlah_peserta: count,
      jumlah_hadir: count,
      jumlah_tidak_hadir: 0,
    }));
    toast.success(`Data Berita Acara diselaraskan dengan ${targetSession.nama_sesi}`);
  };

  const filteredRecords = useMemo(() => {
    if (sessionFilter === 'ALL') return records;
    return records.filter((r) => r.jadwal_id === sessionFilter || r.nama_sesi === sessionFilter);
  }, [records, sessionFilter]);
  const saveMutation = useMutation({
    mutationFn: async (updatedList: UkkBeritaAcaraItem[]) => {
      if (!jurusanId) throw new Error('Jurusan ID tidak ditemukan');
      return raporApi.saveUkkBeritaAcara(jurusanId, updatedList, tahunAjaran);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ukk-berita-acara', jurusanId] });
      toast.success(
        tahunAjaran
          ? `Berita Acara UKK TA ${tahunAjaran} berhasil disimpan!`
          : 'Berita Acara UKK berhasil disimpan!'
      );
      setModalOpen(false);
      setEditingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan berita acara');
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    // Prefill from first session if available
    const firstSession = sessionsFromJadwal[0];
    setFormData({
      id: `ba_${Date.now()}`,
      nama_sesi: firstSession?.nama_sesi || `Sesi ${records.length + 1}`,
      tanggal: firstSession?.tanggal || new Date().toISOString().split('T')[0],
      jam_mulai: firstSession?.jam_mulai || '07:30',
      jam_selesai: firstSession?.jam_selesai || '11:30',
      ruang: firstSession?.ruang || 'Lab Komputer 1',
      jumlah_peserta: firstSession?.siswa_ids?.length || 20,
      jumlah_hadir: firstSession?.siswa_ids?.length || 20,
      jumlah_tidak_hadir: 0,
      catatan_pelaksanaan:
        'Pelaksanaan Ujian UKK berjalan dengan aman, tertib, dan lancar sesuai dengan SOP teknis.',
      kendala: '',
      penguji_internal: firstSession?.asesor_internal || '',
      penguji_eksternal: firstSession?.asesor_eksternal || '',
      mitra_nama: firstSession?.mitra_nama || '',
      panitia: autoSigners.kaprog.nama || 'Ketua Panitia UKK',
      status: 'SELESAI',
      foto_dokumentasi: [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: UkkBeritaAcaraItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setModalOpen(true);
  };

  // Delete Berita Acara (Pilar 15 - Dialog Konfirmasi Reusable Terstandar)
  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Berita Acara?',
      description: 'Apakah Anda yakin ingin menghapus data Berita Acara sesi ini beserta dokumentasinya?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;
    const updated = records.filter((r) => r.id !== id);
    saveMutation.mutate(updated);
  };

  const handleSubmit = () => {
    if (!formData.nama_sesi || !formData.tanggal) {
      toast.error('Nama sesi dan tanggal wajib diisi');
      return;
    }

    let updatedList = [...records];
    if (editingId) {
      updatedList = updatedList.map((r) => (r.id === editingId ? formData : r));
    } else {
      updatedList.push({
        ...formData,
        id: formData.id || `ba_${Date.now()}`,
      });
    }

    saveMutation.mutate(updatedList);
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`Ukuran file ${file.name} melebihi 2MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          foto_dokumentasi: [
            ...(prev.foto_dokumentasi || []),
            { url: base64, caption: '' },
          ],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCaptionChange = (idx: number, newCaption: string) => {
    setFormData((prev) => {
      const updated = [...(prev.foto_dokumentasi || [])];
      const item = updated[idx];
      const url = typeof item === 'string' ? item : (item as any)?.url;
      updated[idx] = { url, caption: newCaption };
      return { ...prev, foto_dokumentasi: updated };
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      foto_dokumentasi: (prev.foto_dokumentasi || []).filter((_, i) => i !== idx),
    }));
  };

  // Print Berita Acara PDF
  const handlePrintPdf = async (item: UkkBeritaAcaraItem) => {
    try {
      const [sekolahRes, settingsRes] = await Promise.all([
        sekolahApi.getProfile().catch(() => null),
        raporApi.getUkkSettings(jurusanId, tahunAjaran).catch(() => null),
      ]);

      const sekolahData = (sekolahRes as any)?.data || sekolahRes || {};
      const settingsData = (settingsRes as any)?.data || settingsRes || {};

      const printPayload: UkkBeritaAcaraPrintData = {
        jurusanNama: jurusanNama || 'Kejuruan',
        tahunPelajaran: tahunAjaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        judulPenugasan: settingsData?.judul_penugasan_id || 'Ujian Praktik Kejuruan Mandiri',
        sekolah: {
          nama: sekolahData?.nama || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: sekolahData?.alamat || '',
          kota: sekolahData?.kota || 'Purwakarta',
          kepala_sekolah: sekolahData?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: sekolahData?.nip_kepala || '-',
        },
        beritaAcara: item,
      };

      const { blobUrl } = generatePdfUkkBeritaAcara(printPayload);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Gagal membuat dokumen PDF Berita Acara');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Laporan Pelaksanaan & Berita Acara Tiap Sesi UKK
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumentasikan jalannya ujian tiap sesi, rekapitulasi kehadiran, catatan kendala, dan
            foto dokumentasi visual untuk akreditasi & DU/DI.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sessionsFromJadwal.length > 0 && (
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">Semua Sesi ({records.length})</option>
              {sessionsFromJadwal.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_sesi}
                </option>
              ))}
            </select>
          )}

          {!readOnly && (
            <Button size="sm" onClick={handleOpenCreate} className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 shrink-0 shadow-xs cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              Buat Berita Acara Sesi
            </Button>
          )}
        </div>
      </div>

      {/* List of Berita Acara Cards */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Memuat laporan berita acara UKK...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            {sessionFilter !== 'ALL' ? 'Belum Ada Berita Acara Pada Sesi Ini' : 'Belum Ada Berita Acara'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {sessionFilter !== 'ALL'
              ? 'Pilih tombol buat berita acara di bawah untuk mengisi laporan bagi sesi ini.'
              : 'Setelah sesi ujian selesai dilaksanakan, buat Berita Acara resmi per sesi lengkap dengan jumlah kehadiran, catatan evaluasi, serta unggahan foto dokumentasi pelaksanaan.'}
          </p>
          {!readOnly && (
            <Button size="sm" onClick={handleOpenCreate} className="mt-2 text-xs font-semibold gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              Buat Berita Acara
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecords.map((item, idx) => (
            <div key={item.id || idx} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700">
              {/* Header */}
              <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.status === 'SELESAI' ? 'default' : 'secondary'}
                      className={cn(
                        'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full',
                        item.status === 'SELESAI'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {item.status}
                    </Badge>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.nama_sesi}</h4>
                    {item.jadwal_id && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                        Tersinkronisasi Jadwal
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {item.tanggal}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {item.jam_mulai} - {item.jam_selesai} WIB
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {item.ruang}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintModalItem(item)}
                    className="h-8 px-2.5 text-xs gap-1.5 rounded-xl border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer shadow-2xs"
                    title="Cetak Berita Acara Resmi (Pratinjau Kop & PDF)"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    Cetak Berita Acara
                  </Button>
                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Berita Acara"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance Stats */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800/60 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-800/20 py-2.5 text-center text-xs">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Peserta Terdaftar</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{item.jumlah_peserta}</p>
                </div>
                <div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Hadir</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {item.jumlah_hadir}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-rose-500 font-semibold">Tidak Hadir</p>
                  <p className="text-base font-bold text-rose-500">{item.jumlah_tidak_hadir}</p>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-4 flex-1 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Penguji & Asesor:</span>
                  <div className="mt-1 text-slate-600 dark:text-slate-400 space-y-0.5">
                    <p>Internal: {item.penguji_internal || '-'}</p>
                    <p>
                      Eksternal: {item.penguji_eksternal || '-'}{' '}
                      {item.mitra_nama ? `(${item.mitra_nama})` : ''}
                    </p>
                  </div>
                </div>

                {item.catatan_pelaksanaan && (
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Catatan Pelaksanaan:</span>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-400 line-clamp-2">
                      {item.catatan_pelaksanaan}
                    </p>
                  </div>
                )}

                {item.kendala && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-2.5 text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Kendala & Catatan:
                    </div>
                    <p className="mt-0.5 text-xs line-clamp-2">{item.kendala}</p>
                  </div>
                )}

                {/* Photo Thumbnails */}
                {item.foto_dokumentasi && item.foto_dokumentasi.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      Dokumentasi Foto ({item.foto_dokumentasi.length})
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {item.foto_dokumentasi.map((fotoItem, fIdx) => {
                        const photoUrl = typeof fotoItem === 'string' ? fotoItem : (fotoItem as any)?.url;
                        return (
                          <img
                            key={fIdx}
                            src={photoUrl}
                            alt={`Dokumentasi ${fIdx + 1}`}
                            className="w-16 h-12 object-cover rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-2xs"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah / Edit Berita Acara */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Berita Acara UKK' : 'Buat Berita Acara Sesi UKK'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Integrasi dengan Jadwal Sesi Pra-UKK */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Hubungkan ke Sesi Jadwal Pra-UKK
              </label>
              {formData.jadwal_id ? (
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Terintegrasi
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  {sessionsFromJadwal.length} Sesi Terjadwal
                </span>
              )}
            </div>

            <select
              value={formData.jadwal_id || ''}
              onChange={(e) => handleSelectJadwalSession(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium cursor-pointer transition-all shadow-xs"
            >
              <option value="">-- Pilih Sesi dari Jadwal UKK (Isi Otomatis) --</option>
              {sessionsFromJadwal.map((sesi) => (
                <option key={sesi.id} value={sesi.id}>
                  {sesi.nama_sesi} — {sesi.tanggal} ({sesi.jam_mulai} - {sesi.jam_selesai}) | Ruang: {sesi.ruang} ({sesi.siswa_ids?.length || 0} Siswa)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Memilih sesi di atas akan mengintegrasikan berita acara dengan jadwal dan otomatis mengisi nama sesi, tanggal, jam, ruang, penguji, dan rekap peserta.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nama Sesi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nama_sesi}
                onChange={(e) => setFormData({ ...formData, nama_sesi: e.target.value })}
                placeholder="Contoh: Sesi 1 (Praktik Jaringan)"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tanggal Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jam Mulai</label>
              <input
                type="text"
                value={formData.jam_mulai}
                onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                placeholder="07:30"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jam Selesai</label>
              <input
                type="text"
                value={formData.jam_selesai}
                onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                placeholder="11:30"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ruang / Lab</label>
              <input
                type="text"
                value={formData.ruang}
                onChange={(e) => setFormData({ ...formData, ruang: e.target.value })}
                placeholder="Lab Komputer 1"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Rekap Kehadiran */}
          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Rekapitulasi Kehadiran Peserta
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Terdaftar</label>
                <input
                  type="number"
                  min="0"
                  value={formData.jumlah_peserta}
                  onChange={(e) => {
                    const total = parseInt(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      jumlah_peserta: total,
                      jumlah_tidak_hadir: Math.max(0, total - formData.jumlah_hadir),
                    });
                  }}
                  className="mt-1 w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Jumlah Hadir</label>
                <input
                  type="number"
                  min="0"
                  value={formData.jumlah_hadir}
                  onChange={(e) => {
                    const hadir = parseInt(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      jumlah_hadir: hadir,
                      jumlah_tidak_hadir: Math.max(0, formData.jumlah_peserta - hadir),
                    });
                  }}
                  className="mt-1 w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-rose-500 font-bold">Tidak Hadir</label>
                <input
                  type="number"
                  readOnly
                  value={formData.jumlah_tidak_hadir}
                  className="mt-1 w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl font-bold text-rose-500 outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Penguji Internal (Guru Master)</span>
                {formData.penguji_internal && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[150px]">
                    {formData.penguji_internal}
                  </span>
                )}
              </label>
              <div className="mt-1">
                <SearchableSelect
                  value={currentGuruValue}
                  onValueChange={(val) => {
                    const found = guruList.find((g) => g.id === val);
                    setFormData({
                      ...formData,
                      penguji_internal: found ? found.nama_guru : val,
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
                value={formData.penguji_eksternal}
                onChange={(e) => setFormData({ ...formData, penguji_eksternal: e.target.value })}
                placeholder="Nama Penguji Eksternal"
                className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Catatan Pelaksanaan Ujian
            </label>
            <textarea
              rows={2}
              value={formData.catatan_pelaksanaan}
              onChange={(e) => setFormData({ ...formData, catatan_pelaksanaan: e.target.value })}
              placeholder="Catatan umum mengenai ketertiban, kedisiplinan dan kelancaran ujian..."
              className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all shadow-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kendala & Pemecahan Masalah (Opsional)
            </label>
            <textarea
              rows={2}
              value={formData.kendala}
              onChange={(e) => setFormData({ ...formData, kendala: e.target.value })}
              placeholder="Contoh: Gangguan koneksi selama 10 menit, namun berhasil diatasi..."
              className="mt-1 w-full px-3 py-2 text-xs bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all shadow-xs"
            />
          </div>

          {/* Tanda Tangan Digital Penguji & Panitia via Pen */}
          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
              <PenTool className="w-4 h-4 text-indigo-600" />
              <span>Tanda Tangan Digital Resmi (Pen Canvas)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DigitalSignatureField
                label="TTD Penguji Internal"
                penName={formData.penguji_internal || 'Penguji Internal'}
                value={formData.ttd_penguji_internal}
                onChange={(sig) => setFormData({ ...formData, ttd_penguji_internal: sig })}
              />

              <DigitalSignatureField
                label="TTD Penguji Eksternal (DU/DI)"
                penName={formData.penguji_eksternal || 'Penguji Eksternal'}
                value={formData.ttd_penguji_eksternal}
                onChange={(sig) => setFormData({ ...formData, ttd_penguji_eksternal: sig })}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <DigitalSignatureField
                label="TTD Ketua Panitia / Kaprog"
                penName={formData.panitia || 'Ketua Panitia UKK'}
                value={formData.ttd_panitia}
                onChange={(sig) => setFormData({ ...formData, ttd_panitia: sig })}
              />
            </div>
          </div>

          {/* Upload Foto Dokumentasi */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                Foto Dokumentasi Pelaksanaan UKK
              </label>
              <label className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold">
                <Upload className="w-3.5 h-3.5" />
                Unggah Foto
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(formData.foto_dokumentasi || []).map((fotoItem, idx) => {
                const photoUrl = typeof fotoItem === 'string' ? fotoItem : (fotoItem as any)?.url;
                const photoCaption = typeof fotoItem === 'object' ? (fotoItem as any)?.caption || '' : '';

                return (
                  <div
                    key={idx}
                    className="relative group rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-2 shadow-2xs"
                  >
                    <div className="relative h-28 rounded-xl overflow-hidden">
                      <img
                        src={photoUrl}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover bg-slate-100 dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={photoCaption}
                        onChange={(e) => handleCaptionChange(idx, e.target.value)}
                        placeholder={`Caption foto ${idx + 1} (cth: Pengujian Praktik Siswa)`}
                        className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                      />
                    </div>
                  </div>
                );
              })}
              {(formData.foto_dokumentasi?.length || 0) === 0 && (
                <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 bg-slate-50/40 dark:bg-slate-800/20">
                  Belum ada foto dokumentasi diunggah. Klik "Unggah Foto" di atas.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={saveMutation.isPending}
              className="h-9 px-3.5 rounded-xl border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs font-semibold h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Berita Acara'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Official Print Preview & PDF Modal with PrintHeader */}
      <UkkBeritaAcaraPrintModal
        isOpen={!!printModalItem}
        onClose={() => setPrintModalItem(null)}
        beritaAcara={printModalItem}
        jurusanNama={jurusanNama}
        tahunPelajaran={tahunAjaran}
      />
    </div>
  );
};
