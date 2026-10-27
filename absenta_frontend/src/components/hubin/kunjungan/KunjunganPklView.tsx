import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Printer,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Button, Input, SectionCard } from '@/components/ui';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { hubinApi, type SiswaPkl } from '@/api/hubin.api';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { KunjunganStatsCards } from './KunjunganStatsCards';
import { KunjunganFeedItem } from './KunjunganFeedItem';
import type { UniversalKunjunganPklViewProps, KunjunganItemDetail, KunjunganStats } from './types';

// Lazy Loaded Modal Subsystems
const HubinPklKunjunganModal = lazy(() =>
  import('@/components/hubin/HubinPklKunjunganModal').then((m) => ({ default: m.HubinPklKunjunganModal }))
);
const HubinPklPrintMonitoringModal = lazy(() =>
  import('@/components/hubin/HubinPklPrintMonitoringModal').then((m) => ({ default: m.HubinPklPrintMonitoringModal }))
);
const HubinPklPrintSurat = lazy(() =>
  import('@/components/hubin/HubinPklPrintSurat').then((m) => ({ default: m.HubinPklPrintSurat }))
);

export const KunjunganPklView: React.FC<UniversalKunjunganPklViewProps> = React.memo(({
  guruId: propGuruId,
  guruNama: propGuruNama,
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  mitraId: propMitraId,
  kelasId: propKelasId,
  tahunPelajaranId: propTpId,
  semesterId: propSemesterId,
  isModal = false,
  hideLayout = false,
  hideHeaderStats = false,
  hideScopeBanner = false,
  readOnly = false,
  className,
  onClose,
  onNavigateDetail,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // 1. Integrated Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const effectiveGuruId = propGuruId || user?.guru_profile?.id || user?.id;
  const effectiveTpId = propTpId || academicFilter.activeTpYear?.id;
  const effectiveJurusanId = propJurusanId;

  // 2. Local State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMitraFilter, setSelectedMitraFilter] = useState('ALL');

  // Modal State for New/Edit Visit
  const [isKunjunganModalOpen, setIsKunjunganModalOpen] = useState(false);
  const [activeSelectedPkl, setActiveSelectedPkl] = useState<SiswaPkl | null>(null);
  const [editingKunjunganId, setEditingKunjunganId] = useState<string | undefined>(undefined);
  const [isSelectSiswaModalOpen, setIsSelectSiswaModalOpen] = useState(false);

  // Form State passed to HubinPklKunjunganModal
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [visitFotoUrl, setVisitFotoUrl] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Print State
  const [printPkl, setPrintPkl] = useState<SiswaPkl | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<string | null>(null);
  const [monitoringPrintConfig, setMonitoringPrintConfig] = useState<any>(null);

  // 3. Query Siswa Penempatan PKL
  const { data: penempatanData, isLoading, refetch } = useQuery({
    queryKey: ['hubin-kunjungan-list', effectiveGuruId, effectiveTpId, effectiveJurusanId],
    queryFn: async () => {
      try {
        const res = await hubinApi.getPenempatan({
          pembimbing_id: effectiveGuruId,
          tahun_pelajaran_id: effectiveTpId,
          jurusan_id: effectiveJurusanId,
          limit: 100,
        });
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) return res.data as SiswaPkl[];
      } catch {
        /* Fallback to my penempatan */
      }
      const myRes = await hubinApi.getMyPenempatan().catch(() => ({ data: [] }));
      if (Array.isArray(myRes?.data) && myRes.data.length > 0) return myRes.data as SiswaPkl[];
      const allRes = await hubinApi.getPenempatan({ limit: 100 }).catch(() => ({ data: [] }));
      return (allRes?.data || []) as SiswaPkl[];
    },
  });

  const rawList: SiswaPkl[] = useMemo(() => {
    return Array.isArray(penempatanData) ? penempatanData : [];
  }, [penempatanData]);

  // 4. Flatten all visits from rawList
  const allVisits = useMemo<KunjunganItemDetail[]>(() => {
    const list: KunjunganItemDetail[] = [];
    rawList.forEach((p) => {
      let kList: any[] = [];
      if (Array.isArray(p.kunjungan_json)) {
        kList = p.kunjungan_json;
      } else if (typeof p.kunjungan_json === 'string') {
        try {
          kList = JSON.parse(p.kunjungan_json);
        } catch {
          kList = [];
        }
      }

      kList.forEach((k: any, idx: number) => {
        list.push({
          id: k.id || `visit-${p.id}-${idx}`,
          rawKunjunganId: k.id ? String(k.id) : String(idx),
          penempatan_id: p.id,
          siswa_id: p.Siswa?.id || p.siswa_id,
          nama_siswa: p.Siswa?.nama_siswa || 'Siswa Magang',
          nis: p.Siswa?.nis || '-',
          foto_siswa: p.Siswa?.foto,
          kelas: p.Siswa?.Kelas?.nama_kelas || 'Kelas XII',
          mitra_id: p.Mitra?.id || p.mitra_id,
          nama_mitra: p.Mitra?.nama || 'Mitra DU/DI',
          alamat_mitra: p.Mitra?.alamat,
          pembimbing_nama: p.Pembimbing?.nama_guru,
          tanggal: k.tanggal || new Date().toISOString(),
          catatan: k.catatan || '',
          catatan_dudi: k.catatan_dudi,
          foto_url: k.foto_url,
          latitude: k.latitude !== undefined && k.latitude !== null ? Number(k.latitude) : undefined,
          longitude: k.longitude !== undefined && k.longitude !== null ? Number(k.longitude) : undefined,
          created_at: k.created_at,
          created_by: k.created_by,
        });
      });
    });

    list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    return list;
  }, [rawList]);

  // 5. Compute Stats
  const stats: KunjunganStats = useMemo(() => {
    const visitedMitraIds = new Set(allVisits.map((v) => v.mitra_id).filter(Boolean));
    const visitedSiswaIds = new Set(allVisits.map((v) => v.siswa_id).filter(Boolean));
    const totalMitra = new Set(rawList.map((p) => p.mitra_id).filter(Boolean)).size;
    const persentase = totalMitra > 0 ? Math.min(100, Math.round((visitedMitraIds.size / totalMitra) * 100)) : 0;

    return {
      totalKunjungan: allVisits.length,
      totalMitraTerkunjungi: visitedMitraIds.size,
      totalSiswaTerkunjungi: visitedSiswaIds.size,
      persentaseKunjungan: persentase,
    };
  }, [allVisits, rawList]);

  // 6. Distinct Mitra Options for filter
  const mitraFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawList.forEach((p) => {
      if (p.mitra_id && p.Mitra?.nama) {
        map.set(p.mitra_id, p.Mitra.nama);
      }
    });
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }));
  }, [rawList]);

  // 7. Filtered Feed List
  const filteredVisits = useMemo(() => {
    return allVisits.filter((v) => {
      const matchSearch =
        v.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.catatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.catatan_dudi && v.catatan_dudi.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMitra = selectedMitraFilter === 'ALL' || v.mitra_id === selectedMitraFilter;
      return matchSearch && matchMitra;
    });
  }, [allVisits, searchTerm, selectedMitraFilter]);

  // 8. Mutations
  const addVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hubinApi.addKunjungan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-kunjungan-list'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
      toast.success('Laporan kunjungan supervisi berhasil disimpan!');
      setIsKunjunganModalOpen(false);
      setActiveSelectedPkl(null);
      setEditingKunjunganId(undefined);
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan laporan kunjungan.');
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, kunjunganId, data }: { id: string; kunjunganId: string; data: any }) =>
      hubinApi.updateKunjungan(id, kunjunganId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-kunjungan-list'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
      toast.success('Catatan kunjungan berhasil diperbarui!');
      setIsKunjunganModalOpen(false);
      setActiveSelectedPkl(null);
      setEditingKunjunganId(undefined);
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui kunjungan.');
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: ({ id, kunjunganId }: { id: string; kunjunganId: string }) =>
      hubinApi.deleteKunjungan(id, kunjunganId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-kunjungan-list'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
      toast.success('Catatan kunjungan berhasil dihapus!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus kunjungan.');
    },
  });

  // 9. Handlers
  const handleOpenNewVisit = useCallback(() => {
    if (rawList.length === 0) {
      toast.error('Belum ada data siswa bimbingan atau penempatan magang aktif.');
      return;
    }
    // If only 1 placement, open directly. If multiple, show selector modal
    if (rawList.length === 1) {
      setActiveSelectedPkl(rawList[0]);
      setEditingKunjunganId(undefined);
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
      setIsKunjunganModalOpen(true);
    } else {
      setIsSelectSiswaModalOpen(true);
    }
  }, [rawList]);

  const handleSelectPklForNewVisit = useCallback((pkl: SiswaPkl) => {
    setIsSelectSiswaModalOpen(false);
    setActiveSelectedPkl(pkl);
    setEditingKunjunganId(undefined);
    setVisitLat('');
    setVisitLng('');
    setVisitFotoUrl('');
    setIsKunjunganModalOpen(true);
  }, []);

  const handleEditVisit = useCallback((item: KunjunganItemDetail) => {
    const parentPkl = rawList.find((p) => p.id === item.penempatan_id);
    if (!parentPkl) {
      toast.error('Data penempatan siswa tidak ditemukan.');
      return;
    }
    setActiveSelectedPkl(parentPkl);
    setEditingKunjunganId(item.rawKunjunganId);
    setVisitLat(item.latitude !== undefined ? String(item.latitude) : '');
    setVisitLng(item.longitude !== undefined ? String(item.longitude) : '');
    setVisitFotoUrl(item.foto_url || '');
    setIsKunjunganModalOpen(true);
  }, [rawList]);

  const handleDeleteVisit = useCallback((item: KunjunganItemDetail) => {
    if (!window.confirm(`Yakin ingin menghapus catatan kunjungan di ${item.nama_mitra}?`)) return;
    deleteVisitMutation.mutate({ id: item.penempatan_id, kunjunganId: item.rawKunjunganId });
  }, [deleteVisitMutation]);

  const handlePrintVisit = useCallback((item: KunjunganItemDetail) => {
    const targetPkl = rawList.find((p) => p.id === item.penempatan_id);
    if (targetPkl) {
      setPrintPkl(targetPkl);
      setIsPrintModalOpen(true);
    }
  }, [rawList]);

  const handleKunjunganSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>, editId?: string) => {
      e.preventDefault();
      if (!activeSelectedPkl) return;

      const formData = new FormData(e.currentTarget);
      const payload = {
        tanggal: (formData.get('tanggal') as string) || new Date().toISOString(),
        catatan: (formData.get('catatan') as string) || '',
        catatan_dudi: (formData.get('catatan_dudi') as string) || undefined,
        foto_url: visitFotoUrl || undefined,
        latitude: visitLat ? parseFloat(visitLat) : undefined,
        longitude: visitLng ? parseFloat(visitLng) : undefined,
      };

      if (editId !== undefined) {
        updateVisitMutation.mutate({ id: activeSelectedPkl.id, kunjunganId: editId, data: payload });
      } else {
        addVisitMutation.mutate({ id: activeSelectedPkl.id, data: payload });
      }
    },
    [activeSelectedPkl, visitFotoUrl, visitLat, visitLng, addVisitMutation, updateVisitMutation]
  );

  return (
    <div className={cn('space-y-4 w-full min-w-0', isModal && 'p-2 sm:p-4', className)}>
      {/* 1. Header (Standalone / Modal Mode) */}
      {!hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="text-indigo-600 dark:text-indigo-400" size={24} />
              Supervisi &amp; Kunjungan Industri DU/DI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Pusat pencatatan observasi, verifikasi lokasi GPS, dan dokumentasi monitoring berkala siswa PKL.
            </p>
          </div>
          {isModal && onClose && (
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Tutup
            </Button>
          )}
        </div>
      )}

      {/* 2. Standar Academic Filter Toolbar (Hidden if controlled by parent role) */}
      {!hideScopeBanner && (
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          readOnly={readOnly}
        />
      )}

      {/* 3. Bento Metric Stats */}
      {!hideHeaderStats && <KunjunganStatsCards stats={stats} />}

      {/* 4. Action Control & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="Cari nama siswa, mitra DU/DI, atau catatan observasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm rounded-xl h-10 w-full"
            />
          </div>

          {mitraFilterOptions.length > 0 && (
            <select
              value={selectedMitraFilter}
              onChange={(e) => setSelectedMitraFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 h-10 shrink-0 font-medium"
            >
              <option value="ALL">Semua Mitra Industri</option>
              {mitraFilterOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
          )}
        </div>

        {!readOnly && (
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenNewVisit}
            className="text-xs font-bold rounded-xl h-10 gap-1.5 shadow-xs shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus size={16} />
            Catat Supervisi Baru
          </Button>
        )}
      </div>

      {/* 5. Visits Feed List */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="animate-spin w-8 h-8 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
          <p className="text-xs text-slate-400">Memuat riwayat supervisi kunjungan...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Belum Ada Catatan Kunjungan Supervisi
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Gunakan tombol &apos;Catat Supervisi Baru&apos; untuk mendokumentasikan koordinasi, foto bukti, dan observasi langsung ke DU/DI.
          </p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenNewVisit}
              className="mt-4 text-xs font-bold rounded-xl gap-1.5"
            >
              <Plus size={14} />
              Mulai Supervisi Perdana
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisits.map((item) => (
            <KunjunganFeedItem
              key={item.id}
              item={item}
              readOnly={readOnly}
              onEdit={handleEditVisit}
              onDelete={handleDeleteVisit}
              onPrint={handlePrintVisit}
            />
          ))}
        </div>
      )}

      {/* 6. Modal Dialog Pilih Siswa / Mitra untuk Kunjungan Baru */}
      {isSelectSiswaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Pilih Lokasi DU/DI &amp; Siswa Supervisi
              </h3>
              <button
                type="button"
                onClick={() => setIsSelectSiswaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Pilih siswa bimbingan atau mitra industri yang Anda kunjungi hari ini:
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {rawList.map((pkl) => (
                <button
                  type="button"
                  key={pkl.id}
                  onClick={() => handleSelectPklForNewVisit(pkl)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {pkl.Siswa?.nama_siswa || 'Siswa Magang'}
                    </span>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold block truncate">
                      {pkl.Mitra?.nama || 'Mitra DU/DI'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">Pilih ↗</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Form Catat / Edit Kunjungan (HubinPklKunjunganModal) */}
      {isKunjunganModalOpen && activeSelectedPkl && (
        <Suspense fallback={null}>
          <HubinPklKunjunganModal
            isOpen={isKunjunganModalOpen}
            onClose={() => {
              setIsKunjunganModalOpen(false);
              setActiveSelectedPkl(null);
              setEditingKunjunganId(undefined);
            }}
            selectedPkl={activeSelectedPkl as any}
            selectedKunjunganList={(activeSelectedPkl.kunjungan_json as any) || []}
            handleKunjunganSubmit={handleKunjunganSubmit}
            onDeleteKunjungan={(kId) => {
              if (activeSelectedPkl) {
                deleteVisitMutation.mutate({ id: activeSelectedPkl.id, kunjunganId: kId });
              }
            }}
            isPending={addVisitMutation.isPending || updateVisitMutation.isPending || deleteVisitMutation.isPending}
            isDetectingGps={isDetectingGps}
            setIsDetectingGps={setIsDetectingGps}
            visitLat={visitLat}
            setVisitLat={setVisitLat}
            visitLng={visitLng}
            setVisitLng={setVisitLng}
            visitFotoUrl={visitFotoUrl}
            setVisitFotoUrl={setVisitFotoUrl}
            onPrintMonitoring={(row) => {
              setPrintPkl(row);
              setIsPrintModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* 8. Modal Dialog Cetak Lembar Supervisi */}
      {isPrintModalOpen && printPkl && (
        <Suspense fallback={null}>
          <HubinPklPrintMonitoringModal
            isOpen={isPrintModalOpen}
            onClose={() => {
              setIsPrintModalOpen(false);
              setPrintPkl(null);
            }}
            selectedPkl={printPkl as any}
            onConfirmPrint={(cfg) => {
              setMonitoringPrintConfig(cfg);
              setPrintMode('monitoring');
              setIsPrintModalOpen(false);
              setTimeout(() => window.print(), 300);
            }}
          />
        </Suspense>
      )}

      {/* 9. True WYSIWYG Print Document Output */}
      {printMode && printPkl && (
        <Suspense fallback={null}>
          <HubinPklPrintSurat
            printMode={printMode}
            printData={printPkl as any}
            monitoringConfig={monitoringPrintConfig}
            onClose={() => {
              setPrintMode(null);
              setPrintPkl(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
});

KunjunganPklView.displayName = 'KunjunganPklView';
export default KunjunganPklView;
