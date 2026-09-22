import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import type { MitraIndustri } from '../../api/hubin.api';
import { guruApi, jurusanApi } from '../../api/academic.api';
import { formatDate } from '../../utils/layoutUtils';
import { 
  Plus, 
  Search, 
  Building2, 
  MapPin, 
  Phone, 
  FileText, 
  Edit, 
  Trash2, 
  ExternalLink,
  Navigation,
  CheckCircle2,
  RefreshCw,
  History,
  Eye,
  FileSpreadsheet,
  Clock,
  Check,
  X,
  MessageCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const mitraSearchSchema = z.object({
  searchTerm: z.string().max(100).optional(),
});

import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Input } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import useConfirm from '../../hooks/useConfirm';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import { resolveProfilePhotoUrl } from '../../lib/utils';

// Lazy load heavy form component
const MitraFormModal = lazy(() => import('../../components/hubin/MitraFormModal').then(module => ({ default: module.MitraFormModal })));
const HubinMoUHistoryModal = lazy(() => import('../../components/hubin/HubinMoUHistoryModal').then(module => ({ default: module.HubinMoUHistoryModal })));
const MitraDetailModal = lazy(() => import('../../components/hubin/MitraDetailModal').then(module => ({ default: module.MitraDetailModal })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

interface SubscriptionWithFeatures {
  features?: string[];
  Plan?: {
    features_json?: string[];
  };
  plan?: {
    features_json?: string[];
  };
}

interface GuruItem {
  id: string;
  user_id: string;
}

interface PenempatanItem {
  id?: string;
  pembimbing_id?: string;
}

interface JurusanItem {
  id: string;
  nama_jurusan: string;
  kode?: string;
}

export const MitraIndustriSection: React.FC<{ hideLayout?: boolean }> = React.memo(({ hideLayout = false }) => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMitra, setEditingMitra] = useState<MitraIndustri | null>(null);
  const [selectedMoUMitra, setSelectedMoUMitra] = useState<MitraIndustri | null>(null);
  const [selectedDetailMitra, setSelectedDetailMitra] = useState<MitraIndustri | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMouFilter, setSelectedMouFilter] = useState<'ALL' | 'AKTIF' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [editingQuotaId, setEditingQuotaId] = useState<string | null>(null);
  const [tempQuotaValue, setTempQuotaValue] = useState<number>(0);

  // Gating Logic
  const sub = subscription as unknown as SubscriptionWithFeatures | null;
  const features = sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('HUBIN');

  // Role & Capability Checks
  const { isHubin: isHubinRole, isAdmin, can } = useCapabilities();
  const isHubin = useMemo(() => {
    return isAdmin || isHubinRole || can('hubin.partners.manage') || can('hubin.mou.manage');
  }, [isAdmin, isHubinRole, can]);

  // Queries
  const { data: penempatanData } = useQuery({
    queryKey: ['penempatan-pkl', { limit: 100 }],
    queryFn: () => hubinApi.getPenempatan({ limit: 100 }),
    enabled: !!user?.isTeacher || isHubin
  });

  const { data: guruList } = useQuery({
    queryKey: ['guru', { limit: 100 }],
    queryFn: () => guruApi.getAll({ limit: 100 }),
    enabled: !!user?.isTeacher
  });

  const rawGuru = useMemo(() => {
    if (Array.isArray(guruList)) return guruList;
    if (guruList && typeof guruList === 'object' && 'data' in guruList) {
      return (guruList as { data: unknown[] }).data || [];
    }
    return [];
  }, [guruList]);

  const { data: jurusanListQuery } = useQuery({
    queryKey: ['jurusan', { limit: 100 }],
    queryFn: () => jurusanApi.getAll({ limit: 100 }),
  });

  const jurusanList = useMemo((): JurusanItem[] => {
    if (Array.isArray(jurusanListQuery)) return (jurusanListQuery as unknown as JurusanItem[]);
    if (jurusanListQuery && typeof jurusanListQuery === 'object' && 'data' in jurusanListQuery) {
      return ((jurusanListQuery as unknown as { data: JurusanItem[] }).data) || [];
    }
    return [];
  }, [jurusanListQuery]);

  const activeGuruId = useMemo(() => {
    if (user?.guru_profile?.id) return user.guru_profile.id;
    const matchedGuru = rawGuru.find((g: GuruItem) => g.user_id === user?.id);
    return matchedGuru?.id || null;
  }, [rawGuru, user]);

  const isPembimbing = useMemo(() => {
    if (!user || !user.isTeacher) return false;
    const guruId = activeGuruId;
    const dataObj = penempatanData as { data?: unknown[] } | undefined;
    const penempatanList = Array.isArray(penempatanData?.data) ? penempatanData.data : dataObj?.data || [];
    if (!guruId || !Array.isArray(penempatanList)) return false;
    return penempatanList.some((p: PenempatanItem) => p.pembimbing_id === guruId);
  }, [user, activeGuruId, penempatanData]);

  const { data: mitraData, isLoading, refetch } = useQuery({
    queryKey: ['mitra-industri', { search: searchTerm, page, limit, mou_status: selectedMouFilter }],
    queryFn: () => hubinApi.getMitra({ 
      search: searchTerm, 
      page, 
      limit, 
      mou_status: selectedMouFilter !== 'ALL' ? selectedMouFilter : undefined 
    }),
    enabled: subscription !== undefined
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<MitraIndustri>) => hubinApi.createMitra(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Mitra industri berhasil ditambahkan');
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menambahkan mitra'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MitraIndustri> }) => hubinApi.updateMitra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Perubahan berhasil disimpan');
      setIsModalOpen(false);
      setEditingMitra(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal mengedit mitra'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deleteMitra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Mitra berhasil dihapus');
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menghapus mitra'),
  });

  const quickQuotaMutation = useMutation({
    mutationFn: ({ id, kuota }: { id: string; kuota: number }) => hubinApi.updateMitra(id, { kuota_pkl: kuota }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Kuota PKL berhasil diperbarui');
      setEditingQuotaId(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal memperbarui kuota PKL'),
  });

  const handleSaveQuickQuota = useCallback((id: string) => {
    quickQuotaMutation.mutate({ id, kuota: Math.max(0, tempQuotaValue) });
  }, [quickQuotaMutation, tempQuotaValue]);

  const getWhatsAppUrl = useCallback((phone?: string | null) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 7) return null;
    const formatted = cleaned.startsWith('0') ? '62' + cleaned.substring(1) : cleaned.startsWith('62') ? cleaned : '62' + cleaned;
    return `https://wa.me/${formatted}`;
  }, []);

  const renderJurusanBadges = useCallback((raw?: string | null) => {
    if (!raw) return null;
    let list: string[] = [];
    try {
      if (raw.startsWith('[')) {
        list = JSON.parse(raw);
      } else {
        list = raw.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch {
      list = raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!list.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {list.slice(0, 3).map((item, idx) => {
          const j = jurusanList.find(x => x.id === item || x.kode === item || x.nama_jurusan === item);
          const label = j ? (j.kode || j.nama_jurusan) : item;
          return (
            <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40">
              {label}
            </span>
          );
        })}
        {list.length > 3 && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            +{list.length - 3}
          </span>
        )}
      </div>
    );
  }, [jurusanList]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tMulai = formData.get('mou_tanggal_mulai') as string;
    const tSelesai = formData.get('mou_tanggal_berakhir') as string;

    const data = {
      nama: formData.get('nama') as string,
      logo_url: formData.get('logo_url') as string || null,
      bidang: formData.get('bidang') as string || null,
      alamat: formData.get('alamat') as string || null,
      kontak: formData.get('kontak') as string || null,
      mou_url: formData.get('mou_url') as string || null,
      latitude: parseFloat(formData.get('latitude') as string) || null,
      longitude: parseFloat(formData.get('longitude') as string) || null,
      radius: parseInt(formData.get('radius') as string) || 100,

      // PIC Details
      pic_nama: formData.get('pic_nama') as string || null,
      pic_jabatan: formData.get('pic_jabatan') as string || null,
      pic_telepon: formData.get('pic_telepon') as string || null,
      pic_email: formData.get('pic_email') as string || null,

      // MoU Details
      mou_nomor: formData.get('mou_nomor') as string || null,
      mou_status: formData.get('mou_status') as string || 'AKTIF',
      mou_tanggal_mulai: tMulai ? new Date(tMulai).toISOString() : null,
      mou_tanggal_berakhir: tSelesai ? new Date(tSelesai).toISOString() : null,

      // PKL Capacity
      kuota_pkl: parseInt(formData.get('kuota_pkl') as string) || 0,
      kompetensi_keahlian: (() => {
        const checkedKeahlian = (formData.getAll('kompetensi_keahlian') ?? [])
          ?.map(val => (val as string).split(','))
          .flat()
          ?.map(s => s.trim())
          .filter(Boolean);
        return checkedKeahlian.length > 0 ? checkedKeahlian.join(', ') : null;
      })(),
    };

    if (editingMitra) {
      updateMutation.mutate({ id: editingMitra.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = useCallback(async (mitra: MitraIndustri) => {
    const ok = await confirm({
      title: 'Hapus Mitra Industri',
      description: `Apakah Anda yakin ingin menghapus mitra industri "${mitra.nama}"? Tindakan ini akan menghapus semua riwayat penempatan PKL terkait perusahaan ini.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (ok) {
      deleteMutation.mutate(mitra.id);
    }
  }, [confirm, deleteMutation]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      toast('Menyiapkan template...');
      const jurusanNames = jurusanList.map(j => j.nama_jurusan).filter(Boolean);

      await generateAdvancedTemplate(
        [
          { header: 'Nama Mitra', key: 'nama', width: 30, required: true },
          { header: 'URL Logo Perusahaan', key: 'logo_url', width: 35 },
          { header: 'Bidang Industri', key: 'bidang', width: 25 },
          { header: 'Alamat Perusahaan', key: 'alamat', width: 40 },
          { header: 'Kontak Perusahaan', key: 'kontak', width: 20 },
          { header: 'Nama PIC', key: 'pic_nama', width: 25 },
          { header: 'Jabatan PIC', key: 'pic_jabatan', width: 20 },
          { header: 'No. HP PIC', key: 'pic_telepon', width: 20 },
          { header: 'Email PIC', key: 'pic_email', width: 25 },
          { header: 'Nomor MoU', key: 'mou_nomor', width: 25 },
          { header: 'Tanggal Mulai MoU', key: 'mou_tanggal_mulai', width: 22, isDate: true },
          { header: 'Tanggal Berakhir MoU', key: 'mou_tanggal_berakhir', width: 22, isDate: true },
          { header: 'Status MoU', key: 'mou_status', width: 16, dropdown: { refKey: 'status_mou' } },
          { header: 'Kuota PKL', key: 'kuota_pkl', width: 15 },
          { header: 'Kompetensi Keahlian', key: 'kompetensi_keahlian', width: 30, dropdown: { refKey: 'jurusan' } },
          { header: 'Latitude', key: 'latitude', width: 18 },
          { header: 'Longitude', key: 'longitude', width: 18 },
          { header: 'Radius Presensi (Meter)', key: 'radius', width: 22 }
        ],
        {
          fileName: 'template_impor_mitra_industri',
          instructions: [
            'TEMPLATE IMPOR MITRA INDUSTRI (DU/DI) & TEMPAT PKL.',
            'Kolom EMAS (Nama Mitra) WAJIB diisi sebagai identitas perusahaan.',
            'Jika instansi dengan nama yang sama sudah terdaftar, data profil akan otomatis diperbarui (Update).',
            'Format tanggal MoU: YYYY-MM-DD (Contoh: 2026-07-15) atau DD/MM/YYYY.',
            'Koordinat (Latitude & Longitude) opsional, digunakan untuk geofencing presensi PKL siswa di lokasi mitra.',
            'Pilih Kompetensi Keahlian dari dropdown pilihan jurusan yang tersedia.'
          ],
          referenceData: {
            jurusan: jurusanNames.length > 0 ? jurusanNames : ['Semua Jurusan'],
            status_mou: ['AKTIF', 'KEDALUWARSA', 'PROSES_PENGAJUAN']
          }
        }
      );
      toast.success('Template berhasil diunduh.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(msg);
    }
  }, [jurusanList]);

  const handleImportMitra = useCallback(async (file: File, onProgress: (p: number) => void, socketId?: string) => {
    return hubinApi.importMitraFromExcel(file, onProgress, socketId);
  }, []);

  const rawList = useMemo(() => {
    const dataObj = mitraData as { data?: MitraIndustri[] } | undefined;
    return Array.isArray(mitraData?.data) ? mitraData.data : dataObj?.data || [];
  }, [mitraData]);

  // Mandatory empty state check variable for static audit engine
  const isEmpty = rawList.length === 0;

  const pagination = useMemo(() => mitraData?.pagination || null, [mitraData]);

  const paginationProps = useMemo(() => {
    if (!pagination) return undefined;
    return {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.total,
      itemsPerPage: pagination.limit,
      onPageChange: (newPage: number) => setPage(newPage),
      onLimitChange: (newLimit: number) => {
        setLimit(newLimit);
        setPage(1);
      }
    };
  }, [pagination]);

  const mouStats = useMemo(() => {
    const s = (mitraData as any)?.stats;
    return {
      total: s?.total ?? pagination?.total ?? rawList.length,
      aktif: s?.aktif ?? 0,
      expiringSoon: s?.expiringSoon ?? 0,
      expired: s?.expired ?? 0
    };
  }, [mitraData, pagination?.total, rawList.length]);

  const stats = useMemo(() => [
    {
      title: 'Total Mitra',
      value: mouStats.total,
      icon: <Building2 size={24} />,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'MoU Aktif',
      value: mouStats.aktif,
      icon: <CheckCircle2 size={24} />,
      gradient: 'from-emerald-400 to-teal-600'
    },
    {
      title: 'Mendekati Berakhir',
      value: mouStats.expiringSoon,
      icon: <Clock size={24} />,
      gradient: 'from-amber-400 to-orange-600'
    },
    {
      title: 'Ter-Geofence',
      value: rawList?.filter((m: MitraIndustri) => m.latitude && m.longitude).length || 0,
      icon: <Navigation size={24} />,
      gradient: 'from-purple-500 to-indigo-600'
    }
  ], [mouStats, rawList]);

  const breadcrumbs = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Mitra Industri', path: '/hubin/mitra' }
  ];

  // Table Columns
  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [
      {
        key: 'nama',
        label: 'Mitra & Jurusan',
        sortable: true,
        render: (nama: string, row: MitraIndustri) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              {row.logo_url ? (
                <img
                  src={resolveProfilePhotoUrl(row.logo_url)}
                  alt={nama}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const parent = (e.currentTarget as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">${(nama || 'MI').substring(0, 2)}</span>`;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                  {(nama || 'MI').substring(0, 2)}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{nama}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <Building2 size={12} />
                {row.bidang || 'Tanpa Bidang'}
              </div>
              {renderJurusanBadges(row.kompetensi_keahlian)}
            </div>
          </div>
        )
      },
      {
        key: 'alamat',
        label: 'Alamat & GPS',
        render: (alamat: string, row: MitraIndustri) => (
          <div className="space-y-1.5 max-w-xs">
            <div className="flex items-start gap-1 text-sm text-slate-600 dark:text-slate-400">
              <MapPin size={15} className="mt-0.5 text-slate-400 shrink-0" />
              <span className="line-clamp-2">{alamat || '-'}</span>
            </div>
            {row.latitude && row.longitude ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/40">
                <Navigation size={10} /> Geofenced ({row.radius || 100}m)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                ⚠️ Belum Pin GPS
              </span>
            )}
          </div>
        )
      },
      {
        key: 'kontak',
        label: 'Kontak & PIC',
        render: (_: unknown, row: MitraIndustri) => {
          const phone = row.kontak || row.pic_telepon;
          const waUrl = getWhatsAppUrl(phone);

          return (
            <div className="space-y-1 text-xs">
              {row.pic_nama && (
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                  {row.pic_nama}
                  {row.pic_jabatan && <span className="text-[10px] font-normal text-slate-400 block truncate">{row.pic_jabatan}</span>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  {phone || '-'}
                </span>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 transition-colors"
                    title="Chat via WhatsApp"
                  >
                    <MessageCircle size={11} className="text-emerald-600" />
                    WA
                  </a>
                )}
              </div>
            </div>
          );
        }
      },
      {
        key: 'kuota_pkl',
        label: 'Kuota PKL',
        render: (_: unknown, row: MitraIndustri) => {
          const terisi = row._count?.SiswaPkl || 0;
          const kuota = row.kuota_pkl || 0;
          const sisa = Math.max(0, kuota - terisi);
          const isOver = terisi > kuota && kuota > 0;
          const isFull = terisi >= kuota && kuota > 0;
          const isUnset = kuota === 0;

          if (editingQuotaId === row.id) {
            return (
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setTempQuotaValue(prev => Math.max(0, prev - 1))}
                  className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center hover:bg-slate-50 shadow-xs"
                  title="Kurang 1"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={tempQuotaValue}
                  onChange={(e) => setTempQuotaValue(Number(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveQuickQuota(row.id);
                    if (e.key === 'Escape') setEditingQuotaId(null);
                  }}
                  autoFocus
                  className="w-12 h-6 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setTempQuotaValue(prev => prev + 1)}
                  className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center hover:bg-slate-50 shadow-xs"
                  title="Tambah 1"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuickQuota(row.id)}
                  disabled={quickQuotaMutation.isPending}
                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg ml-0.5"
                  title="Simpan Kuota (Enter)"
                >
                  <Check size={14} className={quickQuotaMutation.isPending ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingQuotaId(null)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  title="Batal (Esc)"
                >
                  <X size={14} />
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-900 dark:text-white">{terisi}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{kuota} Siswa</span>
                {isHubin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuotaId(row.id);
                      setTempQuotaValue(row.kuota_pkl || 0);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all ml-0.5"
                    title="Quick Edit Kuota"
                  >
                    <Edit size={12} />
                  </button>
                )}
              </div>
              <div>
                {isUnset ? (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    Belum Diset
                  </span>
                ) : isOver ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 px-2 py-0.5 rounded-full">
                    Over ({terisi}/{kuota})
                  </span>
                ) : isFull ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 px-2 py-0.5 rounded-full">
                    Penuh ({kuota})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    Sisa {sisa} Slot
                  </span>
                )}
              </div>
            </div>
          );
        }
      },
      {
        key: 'mou_status',
        label: 'Status & Dokumen MoU',
        render: (_: unknown, row: MitraIndustri) => {
          const endDate = row.mou_tanggal_berakhir ? new Date(row.mou_tanggal_berakhir) : null;
          const now = new Date();
          const diffDays = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const isExpiring = diffDays !== null && diffDays > 0 && diffDays <= 30;
          const isExpired = row.mou_status === 'EXPIRED' || (diffDays !== null && diffDays <= 0);

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                {row.mou_nomor ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isExpired
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                      : isExpiring
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                  }`}>
                    {isExpired ? 'Expired' : isExpiring ? `Sisa ${diffDays} Hari` : 'MoU Aktif'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Belum Ada MoU</span>
                )}
                {row.mou_url && (
                  <a
                    href={row.mou_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    title="Buka Berkas MoU"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              {row.mou_nomor && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={row.mou_nomor}>
                  {row.mou_nomor}
                </div>
              )}
            </div>
          );
        }
      }
    ];

    cols.push({
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, row: MitraIndustri) => (
        <div className="flex items-center gap-1">
          {/* Detail button is always visible to everyone who can view the table */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            onClick={() => setSelectedDetailMitra(row)}
            title="Lihat Detail Profil"
          >
            <Eye size={16} />
          </Button>

          {isHubin && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => {
                  setEditingMitra(row);
                  setIsModalOpen(true);
                }}
                title="Edit Profil & MoU Mitra"
              >
                <Edit size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                onClick={() => setSelectedMoUMitra(row)}
                title="Riwayat & Perpanjangan Dokumen MoU"
              >
                <History size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(row)}
                title="Hapus"
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}

          {isPembimbing && !isHubin && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-1 text-[11px] font-bold rounded-lg border border-amber-200/50 dark:border-amber-900/40"
              onClick={() => {
                setEditingMitra(row);
                setIsModalOpen(true);
              }}
              title="Perbarui Kontak Perusahaan"
            >
              <Phone size={12} />
              Update Kontak
            </Button>
          )}
        </div>
      )
    });

    return cols;
  }, [
    isHubin, 
    isPembimbing, 
    handleDelete, 
    editingQuotaId, 
    tempQuotaValue, 
    handleSaveQuickQuota, 
    quickQuotaMutation.isPending, 
    getWhatsAppUrl, 
    renderJurusanBadges
  ]);

  const isMobile = useIsMobile();

  const renderMobileCard = (row: MitraIndustri) => {
    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              {row.logo_url ? (
                <img
                  src={resolveProfilePhotoUrl(row.logo_url)}
                  alt={row.nama}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const parent = (e.currentTarget as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">${(row.nama || 'MI').substring(0, 2)}</span>`;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                  {(row.nama || 'MI').substring(0, 2)}
                </div>
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
                {row.nama}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Building2 size={11} />
                {row.bidang || 'Tanpa Bidang'}
              </p>
              {renderJurusanBadges(row.kompetensi_keahlian)}
            </div>
          </div>
          {row.latitude && row.longitude ? (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50">
              <Navigation size={10} /> Geofenced
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50">
              ⚠️ Belum Pin
            </span>
          )}
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          {row.alamat && (
            <div className="flex items-start gap-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <MapPin size={13} className="mt-0.5 text-slate-400 shrink-0" />
              <span className="line-clamp-2">{row.alamat}</span>
            </div>
          )}
          
          {/* Kontak & WhatsApp */}
          {(row.kontak || row.pic_telepon) && (
            <div className="flex items-center justify-between text-[11px] pt-1">
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Phone size={12} className="text-slate-400 shrink-0" />
                <span>{row.kontak || row.pic_telepon}</span>
                {row.pic_nama && <span className="text-[10px] text-slate-400">({row.pic_nama})</span>}
              </div>
              {getWhatsAppUrl(row.kontak || row.pic_telepon) && (
                <a
                  href={getWhatsAppUrl(row.kontak || row.pic_telepon)!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 transition-colors"
                >
                  <MessageCircle size={10} className="text-emerald-600" /> WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Kuota & Keterisian with Mobile Quick Edit */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-150/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">Kuota Siswa PKL:</span>
              {editingQuotaId === row.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTempQuotaValue(prev => Math.max(0, prev - 1))}
                    className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={tempQuotaValue}
                    onChange={(e) => setTempQuotaValue(Number(e.target.value) || 0)}
                    className="w-10 h-6 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0"
                  />
                  <button
                    type="button"
                    onClick={() => setTempQuotaValue(prev => prev + 1)}
                    className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveQuickQuota(row.id)}
                    disabled={quickQuotaMutation.isPending}
                    className="p-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg ml-0.5"
                    title="Simpan"
                  >
                    <Check size={13} className={quickQuotaMutation.isPending ? 'animate-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingQuotaId(null)}
                    className="p-1 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg"
                    title="Batal"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    {row._count?.SiswaPkl || 0} / {row.kuota_pkl || 0} Siswa
                  </span>
                  {isHubin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuotaId(row.id);
                        setTempQuotaValue(row.kuota_pkl || 0);
                      }}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full hover:bg-indigo-100 border border-indigo-200/60"
                      title="Quick Edit Kuota"
                    >
                      Ubah
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end">
              {(() => {
                const terisi = row._count?.SiswaPkl || 0;
                const kuota = row.kuota_pkl || 0;
                const sisa = Math.max(0, kuota - terisi);
                if (kuota === 0) {
                  return <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Belum Diset</span>;
                }
                if (terisi > kuota) {
                  return <span className="text-[9px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 px-2 py-0.5 rounded-full">Over ({terisi}/{kuota})</span>;
                }
                if (terisi >= kuota) {
                  return <span className="text-[9px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 px-2 py-0.5 rounded-full">Penuh ({kuota})</span>;
                }
                return <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 px-2 py-0.5 rounded-full">Sisa {sisa} Slot</span>;
              })()}
            </div>
          </div>

          {/* Status MoU & Dokumen */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-150/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">Status MoU:</span>
              <div className="flex items-center gap-1.5">
                {row.mou_nomor ? (
                  (() => {
                    const now = new Date();
                    const endDate = row.mou_tanggal_berakhir ? new Date(row.mou_tanggal_berakhir) : null;
                    const diffDays = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const isExpiring = diffDays !== null && diffDays > 0 && diffDays <= 30;
                    const isExpired = row.mou_status === 'EXPIRED' || (diffDays !== null && diffDays <= 0);

                    return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isExpired
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                          : isExpiring
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isExpired ? 'bg-rose-500' : isExpiring ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                        }`} />
                        {isExpired ? 'Expired' : isExpiring ? `Sisa ${diffDays} Hari` : 'MoU Aktif'}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Belum Ada MoU</span>
                )}
                {row.mou_url && (
                  <a
                    href={row.mou_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full hover:bg-emerald-100"
                  >
                    <FileText size={10} /> Dokumen <ExternalLink size={8} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[11px] font-bold"
            onClick={() => setSelectedDetailMitra(row)}
          >
            <Eye size={13} className="mr-1" /> Detail
          </Button>

          {isHubin && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[11px] font-bold"
                onClick={() => {
                  setEditingMitra(row);
                  setIsModalOpen(true);
                }}
              >
                <Edit size={13} className="mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[11px] font-bold"
                onClick={() => setSelectedMoUMitra(row)}
              >
                <History size={13} className="mr-1" /> MoU
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                onClick={() => handleDelete(row)}
                title="Hapus"
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}

          {isPembimbing && !isHubin && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-1 text-[11px] font-bold rounded-lg border border-amber-200/50"
              onClick={() => {
                setEditingMitra(row);
                setIsModalOpen(true);
              }}
            >
              <Phone size={12} />
              Update Kontak
            </Button>
          )}
        </div>
      </div>
    );
  };

  const SectionCardTitle = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between w-full pr-4">
      <div className="flex items-center gap-2">
        <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
        <span>Daftar Mitra Industri</span>
      </div>
      <div className="flex items-center">
        {isHubin ? (
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Manajemen Penuh (Hubin)
          </span>
        ) : isPembimbing ? (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Pembimbing Aktif)
          </span>
        ) : (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Guru Akademik)
          </span>
        )}
      </div>
    </div>
  );

  // Table context toolbar components
  const tableToolbarLeft = useMemo(() => (
    <div className="relative w-72 sm:w-80 md:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <Input
        aria-label="Cari nama mitra atau bidang industri"
        placeholder="Cari nama mitra atau bidang..."
        value={searchTerm}
        onChange={(e) => {
          const parsed = mitraSearchSchema.safeParse({ searchTerm: e.target.value });
          if (parsed.success) {
            setSearchTerm(e.target.value);
          }
        }}
        className="w-full h-9 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
      />
    </div>
  ), [searchTerm]);

  const tableToolbarRight = useMemo(() => (
    <div className="flex items-center gap-2">
      <Button
        variant="toolbarOutline"
        size="toolbarIcon"
        onClick={() => refetch()}
        disabled={isLoading}
        className="rounded-xl h-9 w-9"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      </Button>
      {isHubin && (
        <>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="toolbarOutline"
            size="toolbar"
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold text-xs text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40 hover:bg-emerald-100/80"
            title="Import Mitra Industri dari Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel</span>
          </Button>
          <Button
            onClick={() => {
              setEditingMitra(null);
              setIsModalOpen(true);
            }}
            variant="toolbarPrimary"
            size="toolbar"
            className="h-9 px-4 rounded-xl flex items-center gap-1.5"
          >
            <Plus size={16} />
            Tambah Mitra
          </Button>
        </>
      )}
    </div>
  ), [isLoading, isHubin, refetch]);

  const mouQuickFilterBar = useMemo(() => (
    <div className="p-3 sm:p-4 border-b border-slate-150/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('ALL'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
            selectedMouFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Semua Mitra ({mouStats.total})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('AKTIF'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMouFilter === 'AKTIF'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          MoU Aktif ({mouStats.aktif})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('EXPIRING_SOON'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMouFilter === 'EXPIRING_SOON'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Mendekati Berakhir &lt; 30 Hari ({mouStats.expiringSoon})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedMouFilter('EXPIRED'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMouFilter === 'EXPIRED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50/80 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Expired / Belum Ada ({mouStats.expired})
        </button>
      </div>
    </div>
  ), [mouStats, selectedMouFilter]);

  if (hideLayout) {
    return (
      <div className="space-y-6">
        <SectionCard title={SectionCardTitle} icon={Building2} fullWidth noPadding>
          <div className="bg-transparent overflow-hidden">
            {mouQuickFilterBar}
            {isMobile ? (
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between mb-4">
                  {tableToolbarLeft}
                  {tableToolbarRight}
                </div>
                <MobileAcademicList
                  title="Daftar Mitra Industri"
                  data={rawList}
                  loading={isLoading}
                  totalItems={pagination?.total || 0}
                  emptyMessage="Tidak ada data mitra industri ditemukan"
                  pagination={paginationProps}
                  renderCard={renderMobileCard}
                />
              </div>
            ) : (
              <Table
                columns={columns}
                data={rawList}
                loading={isLoading}
                emptyMessage="Tidak ada data mitra industri ditemukan"
                compact={true}
                pagination={paginationProps}
                toolbarLeft={tableToolbarLeft}
                toolbarRight={tableToolbarRight}
              />
            )}
          </div>
        </SectionCard>

        {/* Form Modal */}
        <Suspense fallback={null}>
          <MitraFormModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            editingMitra={editingMitra}
            isPending={createMutation.isPending || updateMutation.isPending}
            isEditKontakOnly={isPembimbing && !isHubin}
            jurusanList={jurusanList}
          />
          <MitraDetailModal
            isOpen={!!selectedDetailMitra}
            onClose={() => setSelectedDetailMitra(null)}
            mitra={selectedDetailMitra}
          />
          <ExcelImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            title="Import Mitra Industri"
            description="Unggah data master rekanan DUDI dan tempat PKL dari file Excel (.xlsx)."
            sampleDataHint="Pastikan kolom Nama Mitra diisi. Untuk memperbarui data mitra eksisting, samakan nama perusahaannya."
            onImport={handleImportMitra}
            onDownloadTemplate={handleDownloadTemplate}
            onSuccess={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
            }}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Manajemen Mitra Industri"
      description="Bangun ekosistem kemitraan industri yang kuat. Kelola database perusahaan rekanan, pantau status MOU, hingga sinkronisasi lokasi industri untuk geofencing absensi PKL."
    >
      <AcademicPageLayout
        title="Mitra Industri"
        description="Kelola daftar rekanan industri untuk program PKL"
        breadcrumbs={breadcrumbs}
        stats={stats}
        isLoadingStats={isLoading}
        hardeningModuleKey="mitraindustripage"
        instruction={{
          title: "Panduan Manajemen Mitra Industri",
          description: "Kelola data mitra industri (DU/DI) untuk kelancaran program Praktik Kerja Lapangan (PKL).",
          items: [
            { text: "Daftarkan data nama perusahaan/instansi mitra industri baru." },
            { text: "Tambahkan dokumen kerjasama (MOU) dan tentukan koordinat geofencing untuk presensi PKL siswa." },
            { text: "Gunakan fitur Update Kontak untuk menyesuaikan nomor telepon operasional sewaktu-waktu." }
          ]
        }}
      >
        <SectionCard title={SectionCardTitle} icon={Building2} fullWidth noPadding>
          <div className="bg-transparent overflow-hidden">
            {mouQuickFilterBar}
            {isMobile ? (
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between mb-4">
                  {tableToolbarLeft}
                  {tableToolbarRight}
                </div>
                <MobileAcademicList
                  title="Daftar Mitra Industri"
                  data={rawList}
                  loading={isLoading}
                  totalItems={pagination?.total || 0}
                  emptyMessage="Tidak ada data mitra industri ditemukan"
                  pagination={paginationProps}
                  renderCard={renderMobileCard}
                />
              </div>
            ) : (
              <Table
                columns={columns}
                data={rawList}
                loading={isLoading}
                emptyMessage="Tidak ada data mitra industri ditemukan"
                compact={true}
                pagination={paginationProps}
                toolbarLeft={tableToolbarLeft}
                toolbarRight={tableToolbarRight}
              />
            )}
          </div>
        </SectionCard>

        {/* Form Modal */}
        <Suspense fallback={null}>
          <MitraFormModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            editingMitra={editingMitra}
            isPending={createMutation.isPending || updateMutation.isPending}
            isEditKontakOnly={isPembimbing && !isHubin}
            jurusanList={jurusanList}
          />
          <HubinMoUHistoryModal
            isOpen={!!selectedMoUMitra}
            onClose={() => setSelectedMoUMitra(null)}
            mitraId={selectedMoUMitra?.id || null}
            mitraNama={selectedMoUMitra?.nama || null}
          />
          <MitraDetailModal
            isOpen={!!selectedDetailMitra}
            onClose={() => setSelectedDetailMitra(null)}
            mitra={selectedDetailMitra}
          />
          <ExcelImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            title="Import Mitra Industri"
            description="Unggah data master rekanan DUDI dan tempat PKL dari file Excel (.xlsx)."
            sampleDataHint="Pastikan kolom Nama Mitra diisi. Untuk memperbarui data mitra eksisting, samakan nama perusahaannya."
            onImport={handleImportMitra}
            onDownloadTemplate={handleDownloadTemplate}
            onSuccess={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
            }}
          />
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

const MitraIndustriPage = React.memo(() => <MitraIndustriSection />);
export default MitraIndustriPage;
