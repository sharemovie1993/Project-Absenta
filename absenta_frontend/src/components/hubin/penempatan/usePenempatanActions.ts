import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { hubinApi, type MitraIndustri } from '@/api/hubin.api';
import { HubinJurnalStatus } from '@/constants/HubinConstants';
import type { MonitoringPrintConfig } from '@/components/hubin/HubinPklPrintMonitoringModal';
import type {
  MitraData,
  SiswaPkl,
  CreatePenempatanPayload,
  MutasiPenempatanPayload,
  PenilaianPayload,
  KunjunganPayload
} from '@/pages/hubin/types/penempatan.types';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = error as { response?: { data?: { message?: string } } };
    if (resp.response?.data?.message) return resp.response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}

const penempatanSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa harus dipilih'),
  mitra_id: z.string().min(1, 'Mitra industri harus dipilih'),
  pembimbing_id: z.string().nullable(),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai harus diisi'),
  tanggal_selesai: z.string().nullable(),
  status: z.string().min(1),
});

export interface UsePenempatanActionsProps {
  rawMitra: MitraData[];
  rawPenempatan: SiswaPkl[];
  canManage: boolean;
  selectedTpFilter: string;
}

export function usePenempatanActions({
  rawMitra,
  rawPenempatan,
  canManage,
  selectedTpFilter
}: UsePenempatanActionsProps) {
  const queryClient = useQueryClient();
  const printTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Selected Plotting IDs
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [selectedMitraId, setSelectedMitraId] = useState('');
  const [selectedPembimbingId, setSelectedPembimbingId] = useState('');

  // Modals Open State
  const [isPlottingOpen, setIsPlottingOpen] = useState(false);
  const [isBulkPlottingOpen, setIsBulkPlottingOpen] = useState(false);
  const [isNilaiOpen, setIsNilaiOpen] = useState(false);
  const [isKunjunganOpen, setIsKunjunganOpen] = useState(false);
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [visitFotoUrl, setVisitFotoUrl] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const [isReviewJurnalOpen, setIsReviewJurnalOpen] = useState(false);
  const [reviewJurnalStatus, setReviewJurnalStatus] = useState<HubinJurnalStatus>(HubinJurnalStatus.DISETUJUI);
  const [reviewJurnalCatatan, setReviewJurnalCatatan] = useState('');

  const [isMutasiOpen, setIsMutasiOpen] = useState(false);
  const [selectedMutasiPkl, setSelectedMutasiPkl] = useState<SiswaPkl | null>(null);

  const [editingMitraForKontak, setEditingMitraForKontak] = useState<MitraIndustri | null>(null);
  const [isEditMitraKontakOpen, setIsEditMitraKontakOpen] = useState(false);

  // Selected Data for Modals
  const [selectedPkl, setSelectedPkl] = useState<SiswaPkl | null>(null);
  const [printData, setPrintData] = useState<SiswaPkl | null>(null);
  const [printKolektifMitraId, setPrintKolektifMitraId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'surat_tugas' | 'lembar_monitoring'>('surat_tugas');
  const [isMonitoringConfigModalOpen, setIsMonitoringConfigModalOpen] = useState(false);
  const [selectedMonitoringPkl, setSelectedMonitoringPkl] = useState<SiswaPkl | null>(null);
  const [monitoringPrintConfig, setMonitoringPrintConfig] = useState<MonitoringPrintConfig>({
    pattern: 'standard_3',
    includeEmptyRows: true
  });

  useEffect(() => {
    return () => {
      if (printTimerRef.current) {
        clearTimeout(printTimerRef.current);
      }
    };
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreatePenempatanPayload) => hubinApi.createPenempatan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Penempatan PKL berhasil dibuat');
      setIsPlottingOpen(false);
      setSelectedSiswaId('');
      setSelectedMitraId('');
      setSelectedPembimbingId('');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal membuat penempatan'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SiswaPkl> }) => hubinApi.updatePenempatan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Perubahan penempatan berhasil disimpan');
      setIsPlottingOpen(false);
      setSelectedPkl(null);
      setSelectedSiswaId('');
      setSelectedMitraId('');
      setSelectedPembimbingId('');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal mengubah penempatan'));
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (payload: CreatePenempatanPayload[]) => hubinApi.bulkCreatePenempatan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Plotting penempatan kolektif berhasil dibuat');
      setIsBulkPlottingOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal membuat penempatan kolektif'));
    },
  });

  const nilaiMutation = useMutation({
    mutationFn: ({ id, nilai }: { id: string; nilai: PenilaianPayload }) => hubinApi.updatePenilaian(id, nilai),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['rapor'] });
      toast.success('Penilaian PKL berhasil disimpan');
      setIsNilaiOpen(false);
      setSelectedPkl(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menyimpan penilaian'));
    },
  });

  const kunjunganMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: KunjunganPayload }) => hubinApi.addKunjungan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      toast.success('Laporan kunjungan berhasil ditambahkan');
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menambahkan kunjungan'));
    },
  });

  const updateKunjunganMutation = useMutation({
    mutationFn: ({ id, kunjunganId, data }: { id: string; kunjunganId: string; data: KunjunganPayload }) =>
      hubinApi.updateKunjungan(id, kunjunganId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      toast.success('Catatan kunjungan berhasil diperbarui');
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memperbarui kunjungan'));
    },
  });

  const deleteKunjunganMutation = useMutation({
    mutationFn: ({ id, kunjunganId }: { id: string; kunjunganId: string }) =>
      hubinApi.deleteKunjungan(id, kunjunganId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      toast.success('Catatan kunjungan berhasil dihapus');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menghapus kunjungan'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deletePenempatan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Penempatan PKL berhasil dihapus');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menghapus penempatan'));
    },
  });

  const reviewJurnalMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: HubinJurnalStatus; catatan?: string }) => 
      hubinApi.reviewJurnalPortofolio(id, status, catatan || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Review Jurnal & Portofolio berhasil disimpan!');
      setIsReviewJurnalOpen(false);
      setReviewJurnalCatatan('');
      setSelectedPkl(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal menyimpan review'));
    },
  });

  const updateMitraMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MitraIndustri> }) => hubinApi.updateMitra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri-raw-penempatan'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['mitra-options'] });
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Informasi kontak & PIC DUDI berhasil diperbarui');
      setIsEditMitraKontakOpen(false);
      setEditingMitraForKontak(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memperbarui informasi DUDI'));
    }
  });

  const handleOpenEditMitraKontak = useCallback((mitraId: string) => {
    const found = (rawMitra as MitraData[])?.find(m => m.id === mitraId);
    if (found) {
      setEditingMitraForKontak(found as unknown as MitraIndustri);
      setIsEditMitraKontakOpen(true);
    } else {
      const pklMatch = rawPenempatan?.find((p: SiswaPkl) => p.mitra_id === mitraId);
      if (pklMatch?.Mitra) {
        setEditingMitraForKontak(pklMatch.Mitra as unknown as MitraIndustri);
        setIsEditMitraKontakOpen(true);
      }
    }
  }, [rawMitra, rawPenempatan]);

  const handleMitraKontakSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMitraForKontak) return;

    const formData = new FormData(e.currentTarget);
    const payload: Partial<MitraIndustri> = {
      kontak: (formData.get('kontak') as string) || undefined,
      alamat: (formData.get('alamat') as string) || undefined,
      pic_nama: (formData.get('pic_nama') as string) || undefined,
      pic_jabatan: (formData.get('pic_jabatan') as string) || undefined,
      pic_telepon: (formData.get('pic_telepon') as string) || undefined,
      pic_email: (formData.get('pic_email') as string) || undefined,
    };

    const latVal = formData.get('latitude') as string;
    const lonVal = formData.get('longitude') as string;
    if (latVal && !isNaN(Number(latVal))) payload.latitude = Number(latVal);
    if (lonVal && !isNaN(Number(lonVal))) payload.longitude = Number(lonVal);

    if (canManage) {
      const namaVal = formData.get('nama') as string;
      if (namaVal) payload.nama = namaVal;
      payload.bidang = (formData.get('bidang') as string) || undefined;
      payload.mou_nomor = (formData.get('mou_nomor') as string) || undefined;
      payload.mou_status = (formData.get('mou_status') as string) || undefined;
      const tMulai = formData.get('mou_tanggal_mulai') as string;
      const tSelesai = formData.get('mou_tanggal_berakhir') as string;
      if (tMulai) payload.mou_tanggal_mulai = new Date(tMulai).toISOString();
      if (tSelesai) payload.mou_tanggal_berakhir = new Date(tSelesai).toISOString();
      payload.mou_url = (formData.get('mou_url') as string) || undefined;
      const kuota = formData.get('kuota_pkl') as string;
      if (kuota) payload.kuota_pkl = parseInt(kuota, 10);
      const radius = formData.get('radius') as string;
      if (radius) payload.radius = parseInt(radius, 10);
    }

    updateMitraMutation.mutate({ id: editingMitraForKontak.id, data: payload });
  }, [editingMitraForKontak, canManage, updateMitraMutation]);

  const mutasiMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MutasiPenempatanPayload }) => hubinApi.mutasiPenempatan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-me'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] });
      toast.success('Mutasi penempatan siswa berhasil diproses');
      setIsMutasiOpen(false);
      setSelectedMutasiPkl(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Gagal memproses mutasi penempatan'));
    },
  });

  const handlePlottingSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedSiswaId || !selectedMitraId) {
      toast.error('Mohon pilih siswa dan mitra industri');
      return;
    }

    const isFlexible = formData.get('is_flexible_location') === 'on';
    const latOverride = formData.get('lat_override') ? parseFloat(formData.get('lat_override') as string) : null;
    const lonOverride = formData.get('lon_override') ? parseFloat(formData.get('lon_override') as string) : null;
    const radiusOverride = formData.get('radius_override') ? parseInt(formData.get('radius_override') as string) : null;
    const tpId = (formData.get('tahun_pelajaran_id') as string) || selectedTpFilter || null;
    const semId = (formData.get('semester_id') as string) || null;

    const data: CreatePenempatanPayload = {
      siswa_id: selectedSiswaId,
      mitra_id: selectedMitraId,
      pembimbing_id: selectedPembimbingId || null,
      tanggal_mulai: new Date(formData.get('tanggal_mulai') as string).toISOString(),
      tanggal_selesai: formData.get('tanggal_selesai') ? new Date(formData.get('tanggal_selesai') as string).toISOString() : null,
      status: (formData.get('status') as string) || (selectedPkl ? selectedPkl.status : 'AKTIF'),
      tahun_pelajaran_id: tpId,
      semester_id: semId,
      is_flexible_location: isFlexible,
      lat_override: latOverride,
      lon_override: lonOverride,
      radius_override: radiusOverride
    };

    const validation = penempatanSchema.safeParse({
      siswa_id: data.siswa_id,
      mitra_id: data.mitra_id,
      pembimbing_id: data.pembimbing_id,
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai,
      status: data.status,
    });
    if (!validation.success) {
      toast.error(validation.error.issues?.[0]?.message || 'Validasi formulir gagal');
      return;
    }

    if (selectedPkl) {
      updateMutation.mutate({ id: selectedPkl.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [selectedSiswaId, selectedMitraId, selectedPembimbingId, selectedPkl, selectedTpFilter, createMutation, updateMutation]);

  const handleBulkPlottingSubmit = useCallback((data: {
    siswa_ids: string[];
    mitra_id: string;
    pembimbing_id: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    tahun_pelajaran_id?: string | null;
    semester_id?: string | null;
    kelas_id?: string | null;
  }) => {
    const payload: CreatePenempatanPayload[] = (data.siswa_ids ?? [])?.map(siswa_id => ({
      siswa_id,
      mitra_id: data.mitra_id,
      pembimbing_id: data.pembimbing_id,
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai,
      status: 'AKTIF',
      tahun_pelajaran_id: data.tahun_pelajaran_id || selectedTpFilter || null,
      semester_id: data.semester_id || null,
      kelas_id: data.kelas_id || null,
    }));
    bulkCreateMutation.mutate(payload);
  }, [bulkCreateMutation, selectedTpFilter]);

  const handleNilaiSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPkl) return;

    const formData = new FormData(e.currentTarget);
    const softVal = parseFloat(formData.get('soft_skills') as string) || 0;
    const techVal = parseFloat(formData.get('technical_skills') as string) || 0;
    const discVal = parseFloat(formData.get('discipline') as string) || 0;
    const nilai: PenilaianPayload = {
      soft_skills: softVal,
      technical_skills: techVal,
      discipline: discVal,
      catatan: (formData.get('catatan') as string) || '',
      nilai_akhir: Math.round((softVal + techVal + discVal) / 3)
    };

    nilaiMutation.mutate({ id: selectedPkl.id, nilai });
  }, [selectedPkl, nilaiMutation]);

  const handleKunjunganSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPkl) return;

    const formData = new FormData(e.currentTarget);
    const payload: KunjunganPayload = {
      tanggal: new Date().toISOString(),
      catatan: (formData.get('catatan') as string) || '',
      catatan_dudi: (formData.get('catatan_dudi') as string) || undefined,
      foto_url: visitFotoUrl || undefined,
      latitude: visitLat ? parseFloat(visitLat) : undefined,
      longitude: visitLng ? parseFloat(visitLng) : undefined
    };

    kunjunganMutation.mutate({ id: selectedPkl.id, data: payload });
  }, [selectedPkl, visitFotoUrl, visitLat, visitLng, kunjunganMutation]);

  const handleDeleteKunjungan = useCallback((index: number) => {
    if (!selectedPkl) return;
    deleteKunjunganMutation.mutate({ id: selectedPkl.id, kunjunganId: String(index) });
  }, [selectedPkl, deleteKunjunganMutation]);

  const handleMutasiSubmit = useCallback((data: { mitra_id: string; pembimbing_id: string | null; tanggal_mutasi: string; alasan: string }) => {
    if (!selectedMutasiPkl) return;
    mutasiMutation.mutate({
      id: selectedMutasiPkl.id,
      data
    });
  }, [selectedMutasiPkl, mutasiMutation]);

  const handlePrintTugas = useCallback((row: SiswaPkl) => {
    setPrintKolektifMitraId(null);
    setPrintMode('surat_tugas');
    setPrintData(row);
    printTimerRef.current = setTimeout(() => {
      window.print();
    }, 250);
  }, []);

  const handlePrintKolektif = useCallback((mitraId: string) => {
    setPrintData(null);
    setPrintMode('surat_tugas');
    setPrintKolektifMitraId(mitraId);
    printTimerRef.current = setTimeout(() => {
      window.print();
    }, 250);
  }, []);

  const handleConfirmMonitoringPrint = useCallback((config: MonitoringPrintConfig) => {
    if (!selectedMonitoringPkl) return;
    setPrintKolektifMitraId(null);
    setPrintMode('lembar_monitoring');
    setMonitoringPrintConfig(config);
    setPrintData(selectedMonitoringPkl);
    printTimerRef.current = setTimeout(() => {
      window.print();
    }, 250);
  }, [selectedMonitoringPkl]);

  return {
    selectedSiswaId,
    setSelectedSiswaId,
    selectedMitraId,
    setSelectedMitraId,
    selectedPembimbingId,
    setSelectedPembimbingId,
    isPlottingOpen,
    setIsPlottingOpen,
    isBulkPlottingOpen,
    setIsBulkPlottingOpen,
    isNilaiOpen,
    setIsNilaiOpen,
    isKunjunganOpen,
    setIsKunjunganOpen,
    visitLat,
    setVisitLat,
    visitLng,
    setVisitLng,
    visitFotoUrl,
    setVisitFotoUrl,
    isDetectingGps,
    setIsDetectingGps,
    isReviewJurnalOpen,
    setIsReviewJurnalOpen,
    reviewJurnalStatus,
    setReviewJurnalStatus,
    reviewJurnalCatatan,
    setReviewJurnalCatatan,
    isMutasiOpen,
    setIsMutasiOpen,
    selectedMutasiPkl,
    setSelectedMutasiPkl,
    editingMitraForKontak,
    setEditingMitraForKontak,
    isEditMitraKontakOpen,
    setIsEditMitraKontakOpen,
    selectedPkl,
    setSelectedPkl,
    printData,
    setPrintData,
    printKolektifMitraId,
    setPrintKolektifMitraId,
    printMode,
    setPrintMode,
    isMonitoringConfigModalOpen,
    setIsMonitoringConfigModalOpen,
    selectedMonitoringPkl,
    setSelectedMonitoringPkl,
    monitoringPrintConfig,
    createMutation,
    updateMutation,
    bulkCreateMutation,
    nilaiMutation,
    kunjunganMutation,
    updateKunjunganMutation,
    deleteKunjunganMutation,
    deleteMutation,
    reviewJurnalMutation,
    updateMitraMutation,
    mutasiMutation,
    handleOpenEditMitraKontak,
    handleMitraKontakSubmit,
    handlePlottingSubmit,
    handleBulkPlottingSubmit,
    handleNilaiSubmit,
    handleKunjunganSubmit,
    handleDeleteKunjungan,
    handleMutasiSubmit,
    handlePrintTugas,
    handlePrintKolektif,
    handleConfirmMonitoringPrint,
    printTimerRef
  };
}
