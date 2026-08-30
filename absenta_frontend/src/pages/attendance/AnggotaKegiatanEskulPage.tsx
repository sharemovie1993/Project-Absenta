import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Trash2, AlertCircle, BookOpen, ChevronRight, Network, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAnggotaKegiatanEskul,
  addAnggotaKegiatanEskul,
  removeAnggotaKegiatanEskul,
  getSiswaAkademikPickerList,
  type AnggotaKegiatanEskulItem,
  type SiswaAkademikPickerItem,
} from '@/api/attendance/anggotaKegiatanEskul.api';
import {
  getPembinaKegiatanEskul,
  addPembinaKegiatanEskul,
  removePembinaKegiatanEskul,
  getGuruPickerList,
  type PembinaKegiatanEskulItem,
  type GuruPickerItem,
} from '@/api/attendance/pembinaKegiatanEskul.api';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';
import { getKelasList } from '@/api/academic/kelas.api';
import { Button, SectionCard, TabSwitcher, Loader } from '@/components/ui';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import useConfirm from '@/hooks/useConfirm';
import { useIsMobile } from '@/hooks/useIsMobile';

// Modular Lazy Loaded Modals
const MethodChoiceModal = lazy(() => import('@/components/attendance/eskul/MethodChoiceModal').then(m => ({ default: m.MethodChoiceModal })));
const AnggotaEskulWizardModal = lazy(() => import('@/components/attendance/eskul/AnggotaEskulWizardModal').then(m => ({ default: m.AnggotaEskulWizardModal })));
const PembinaEskulModal = lazy(() => import('@/components/attendance/eskul/PembinaEskulModal').then(m => ({ default: m.PembinaEskulModal })));

// Zod Schema Validation Guard (Pilar 25)
const eskulAssignmentSchema = z.object({
  eskulId: z.string().min(1, 'Kegiatan wajib dipilih'),
  siswaIds: z.array(z.string()).min(1, 'Minimal satu siswa dipilih').optional(),
  guruId: z.string().min(1, 'Guru pembina wajib dipilih').optional(),
});

export default React.memo(function AnggotaKegiatanEskulPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // -- Tab Selector ('ANGGOTA' | 'PEMBINA')
  const [activeTab, setActiveTab] = useState<'ANGGOTA' | 'PEMBINA'>('ANGGOTA');

  // -- Search filters
  const [memberSearch, setMemberSearch] = useState('');
  const [pembinaSearch, setPembinaSearch] = useState('');

  // -- Method Choice Modal state
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [methodModalType, setMethodModalType] = useState<'ANGGOTA' | 'PEMBINA' | null>(null);

  // -- Modal Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Student Wizard states
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedWizardEskulId, setSelectedWizardEskulId] = useState('');
  const [selectedWizardSiswaIds, setSelectedWizardSiswaIds] = useState<Set<string>>(new Set());
  const [wizardSiswaSearch, setWizardSiswaSearch] = useState('');
  const [wizardSiswaKelasId, setWizardSiswaKelasId] = useState('');
  
  // Teacher single form states
  const [selectedFormGuruId, setSelectedFormGuruId] = useState('');
  const [selectedFormEskulId, setSelectedFormEskulId] = useState('');

  // -- Master data eskul Query
  const eskulQuery = useQuery({
    queryKey: ['jenis-kegiatan-eskul-list'],
    queryFn: async () => {
      const res = await jenisKegiatanMasterApi.getAll({ limit: 200 });
      const eskulOnly = (res.data ?? []).filter(e => e.tipe !== 'KBM' && e.aktif);
      return [...eskulOnly].sort((a, b) => {
        const isAOsis = a.nama.toUpperCase().includes('OSIS');
        const isBOsis = b.nama.toUpperCase().includes('OSIS');
        if (isAOsis && !isBOsis) return -1;
        if (!isAOsis && isBOsis) return 1;
        return a.nama.localeCompare(b.nama);
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const eskulList = eskulQuery.data || [];
  const loadingEskul = eskulQuery.isLoading;

  // -- Kelas Query
  const kelasQuery = useQuery({
    queryKey: ['kelas-list-eskul'],
    queryFn: async () => {
      const r = await getKelasList();
      const rObj = r as Record<string, unknown>;
      return Array.isArray(r) ? r : (rObj?.data as Array<{ id: string; nama_kelas: string }> ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const classes = kelasQuery.data || [];

  // -- Global Members / Pembinas Query
  const globalDataQuery = useQuery({
    queryKey: ['eskul-members-pembinas-global', activeTab],
    queryFn: async () => {
      if (activeTab === 'ANGGOTA') {
        const data = await getAnggotaKegiatanEskul('ALL');
        return { members: data ?? [], pembinas: [] };
      } else {
        const data = await getPembinaKegiatanEskul('ALL');
        return { members: [], pembinas: data ?? [] };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const members = globalDataQuery.data?.members || [];
  const pembinas = globalDataQuery.data?.pembinas || [];
  const loadingData = globalDataQuery.isLoading;

  // -- Pickers Query
  const pickerQuery = useQuery({
    queryKey: ['eskul-pickers', activeTab, wizardSiswaSearch, wizardSiswaKelasId],
    queryFn: async () => {
      if (activeTab === 'ANGGOTA') {
        const students = await getSiswaAkademikPickerList(wizardSiswaSearch || undefined, wizardSiswaKelasId || undefined);
        return { siswa: students ?? [], guru: [] };
      } else {
        const teachers = await getGuruPickerList();
        return { siswa: [], guru: teachers ?? [] };
      }
    },
    enabled: isAddModalOpen,
    staleTime: 2 * 60 * 1000,
  });

  const siswaPickerList = pickerQuery.data?.siswa || [];
  const guruPickerList = pickerQuery.data?.guru || [];
  const loadingPicker = pickerQuery.isLoading;

  // Mutations
  const addAnggotaMutation = useMutation({
    mutationFn: addAnggotaKegiatanEskul,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
      toast.success(res?.message || 'Anggota eskul berhasil ditambahkan');
      setIsAddModalOpen(false);
      resetWizardForm();
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menambahkan anggota');
    }
  });

  const removeAnggotaMutation = useMutation({
    mutationFn: removeAnggotaKegiatanEskul,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
      toast.success(res?.message || 'Anggota eskul berhasil dihapus');
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menghapus anggota');
    }
  });

  const addPembinaMutation = useMutation({
    mutationFn: addPembinaKegiatanEskul,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
      toast.success(res?.message || 'Pembina eskul berhasil ditambahkan');
      setIsAddModalOpen(false);
      resetPembinaForm();
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menambahkan pembina');
    }
  });

  const removePembinaMutation = useMutation({
    mutationFn: removePembinaKegiatanEskul,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
      toast.success(res?.message || 'Pembina eskul berhasil dihapus');
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menghapus pembina');
    }
  });

  const resetWizardForm = useCallback(() => {
    setCurrentStep(1);
    setSelectedWizardEskulId('');
    setSelectedWizardSiswaIds(new Set());
    setWizardSiswaSearch('');
    setWizardSiswaKelasId('');
  }, []);

  const resetPembinaForm = useCallback(() => {
    setSelectedFormGuruId('');
    setSelectedFormEskulId('');
  }, []);

  const handleOpenMethodChoice = useCallback((type: 'ANGGOTA' | 'PEMBINA') => {
    setMethodModalType(type);
    setIsMethodModalOpen(true);
  }, []);

  const handleSelectDirectForm = useCallback(() => {
    setIsMethodModalOpen(false);
    if (methodModalType === 'ANGGOTA') {
      resetWizardForm();
    } else {
      resetPembinaForm();
    }
    setIsAddModalOpen(true);
  }, [methodModalType, resetWizardForm, resetPembinaForm]);

  const handleSelectMatrix = useCallback(() => {
    setIsMethodModalOpen(false);
    navigate('/attendance/anggota-eskul/matrix');
  }, [navigate]);

  const handleToggleSiswa = useCallback((siswaId: string) => {
    setSelectedWizardSiswaIds(prev => {
      const next = new Set(prev);
      if (next.has(siswaId)) next.delete(siswaId);
      else next.add(siswaId);
      return next;
    });
  }, []);

  const handleSelectAllSiswa = useCallback(() => {
    if (selectedWizardSiswaIds.size === siswaPickerList.length) {
      setSelectedWizardSiswaIds(new Set());
    } else {
      setSelectedWizardSiswaIds(new Set(siswaPickerList?.map(s => s.siswa_akademik_id)));
    }
  }, [selectedWizardSiswaIds.size, siswaPickerList]);

  const handleSaveWizard = useCallback(async () => {
    const payload = {
      eskulId: selectedWizardEskulId,
      siswaIds: Array.from(selectedWizardSiswaIds),
    };
    const parsed = eskulAssignmentSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data penugasan tidak valid');
      return;
    }
    await addAnggotaMutation.mutateAsync({
      jenis_kegiatan_id: selectedWizardEskulId,
      siswa_akademik_ids: Array.from(selectedWizardSiswaIds)
    });
  }, [selectedWizardEskulId, selectedWizardSiswaIds, addAnggotaMutation]);

  const handleSavePembinaForm = useCallback(async () => {
    const payload = {
      eskulId: selectedFormEskulId,
      guruId: selectedFormGuruId,
    };
    const parsed = eskulAssignmentSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data penugasan tidak valid');
      return;
    }
    await addPembinaMutation.mutateAsync({
      guru_id: selectedFormGuruId,
      jenis_kegiatan_id: selectedFormEskulId
    });
  }, [selectedFormGuruId, selectedFormEskulId, addPembinaMutation]);

  const handleDeleteAnggota = useCallback(async (item: AnggotaKegiatanEskulItem) => {
    const ok = await confirm({
      title: 'Hapus Anggota Ekstrakurikuler?',
      description: `Apakah Anda yakin ingin menghapus ${item.nama_siswa} dari eskul ${item.nama_kegiatan}?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      await removeAnggotaMutation.mutateAsync(item.id);
    }
  }, [confirm, removeAnggotaMutation]);

  const handleDeletePembina = useCallback(async (item: PembinaKegiatanEskulItem) => {
    const ok = await confirm({
      title: 'Hapus Pembina Ekstrakurikuler?',
      description: `Apakah Anda yakin ingin menghapus ${item.nama_guru} dari pembina ${item.nama_kegiatan}?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      await removePembinaMutation.mutateAsync(item.id);
    }
  }, [confirm, removePembinaMutation]);

  // Grouped members by eskul
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m => 
      m.nama_siswa?.toLowerCase().includes(q) ||
      m.nis?.toLowerCase().includes(q) ||
      m.nama_kelas?.toLowerCase().includes(q) ||
      m.nama_kegiatan?.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const groupedMembers = useMemo(() => {
    const groups: Record<string, { eskul: JenisKegiatanMaster | undefined; items: AnggotaKegiatanEskulItem[] }> = {};
    (eskulList ?? []).forEach(e => {
      groups[e.id] = { eskul: e, items: [] };
    });
    (filteredMembers ?? []).forEach(m => {
      if (groups[m.jenis_kegiatan_id]) {
        groups[m.jenis_kegiatan_id].items.push(m);
      }
    });
    return Object.values(groups).filter(g => g.eskul !== undefined);
  }, [eskulList, filteredMembers]);

  // Grouped pembinas by eskul
  const filteredPembinas = useMemo(() => {
    if (!pembinaSearch.trim()) return pembinas;
    const q = pembinaSearch.toLowerCase();
    return pembinas.filter(p => 
      p.nama_guru?.toLowerCase().includes(q) ||
      p.nip?.toLowerCase().includes(q) ||
      p.nama_kegiatan?.toLowerCase().includes(q)
    );
  }, [pembinas, pembinaSearch]);

  const groupedPembinas = useMemo(() => {
    const groups: Record<string, { eskul: JenisKegiatanMaster | undefined; items: PembinaKegiatanEskulItem[] }> = {};
    (eskulList ?? []).forEach(e => {
      groups[e.id] = { eskul: e, items: [] };
    });
    (filteredPembinas ?? []).forEach(p => {
      if (groups[p.jenis_kegiatan_id]) {
        groups[p.jenis_kegiatan_id].items.push(p);
      }
    });
    return Object.values(groups).filter(g => g.eskul !== undefined);
  }, [eskulList, filteredPembinas]);

  const wizardEskulName = useMemo(() => {
    return eskulList.find(e => e.id === selectedWizardEskulId)?.nama || '-';
  }, [eskulList, selectedWizardEskulId]);

  const selectedSiswaDetails = useMemo(() => {
    return siswaPickerList.filter(s => selectedWizardSiswaIds.has(s.siswa_akademik_id));
  }, [siswaPickerList, selectedWizardSiswaIds]);

  const submittingForm = addAnggotaMutation.isPending || addPembinaMutation.isPending;

  const breadcrumbs = useMemo(() => [
    { label: 'Presensi', path: '/attendance' },
    { label: 'Anggota Eskul & Pembiasaan' }
  ], []);

  const tabOptions = useMemo(() => [
    { id: 'ANGGOTA', label: 'Daftar Anggota (Siswa)', icon: Users },
    { id: 'PEMBINA', label: 'Daftar Pembina (Guru)', icon: UserCheck },
  ], []);

  return (
    <PremiumFeatureGate feature="attendance_ops">
      <AcademicPageLayout
        title="Anggota Eskul & Pembiasaan"
        description="Kelola pemetaan penugasan anggota siswa dan guru pembina untuk kegiatan ekstrakurikuler serta pembiasaan karakter."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="attendance_anggota_eskul"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => navigate('/attendance/anggota-eskul/matrix')}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <Network className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Mode Matriks
            </Button>
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={() => handleOpenMethodChoice(activeTab)}
              className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'ANGGOTA' ? 'Tambah Anggota Siswa' : 'Tambah Pembina Guru'}
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Pemetaan Ekstrakurikuler",
          description: "Petakan siswa dan guru pembina ke dalam ekstrakurikuler atau kegiatan pembiasaan.",
          items: [
            { text: "Pilih tab Anggota Siswa atau Pembina Guru sesuai data yang ingin dikelola." },
            { text: "Gunakan Mode Matriks untuk checklist visual seluruh siswa dan kegiatan sekaligus." },
            { text: "Gunakan tombol Tambah untuk wizard penugasan cepat." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Tab Navigation */}
            <TabSwitcher
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'ANGGOTA' | 'PEMBINA')}
            />

            {/* TAB CONTENT: ANGGOTA (SISWA) */}
            {activeTab === 'ANGGOTA' && (
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="memberSearchInput"
                      aria-label="Cari siswa anggota eskul"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Cari nama siswa, NIS, kelas, atau kegiatan..."
                      className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Total: {filteredMembers.length} Penugasan
                  </div>
                </div>

                {/* Grouped Eskul Cards List */}
                {loadingData || loadingEskul ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader size="lg" />
                    <span className="text-xs font-medium">Memuat data anggota kegiatan...</span>
                  </div>
                ) : groupedMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                    <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum Ada Data Kegiatan</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Silakan buat jenis kegiatan eskul terlebih dahulu di Master Jenis Kegiatan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedMembers?.map(group => {
                      if (!group.eskul) return null;
                      return (
                        <div 
                          key={group.eskul.id} 
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
                        >
                          <div className="px-5 py-3.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  {group.eskul.nama}
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-800">
                                    {group.eskul.tipe}
                                  </span>
                                </h4>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {group.items.length} Anggota Terdaftar
                            </span>
                          </div>

                          {group.items.length === 0 ? (
                            <div className="px-5 py-6 text-center text-xs text-slate-400">
                              Belum ada anggota siswa yang terdaftar di kegiatan ini.
                            </div>
                          ) : isMobile ? (
                            <div className="p-3 space-y-2">
                              {group.items.map((item) => (
                                <div key={item.id} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                  <div className="space-y-0.5 min-w-0">
                                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate">
                                      {item.nama_siswa}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-slate-400">NIS: {item.nis || '-'}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {item.nama_kelas || '-'}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    aria-label={`Hapus ${item.nama_siswa}`}
                                    onClick={() => handleDeleteAnggota(item)}
                                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                                    title="Hapus dari eskul"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/30 dark:bg-slate-800/20 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    <th className="px-5 py-2.5 w-12 text-center">No</th>
                                    <th className="px-5 py-2.5">NIS</th>
                                    <th className="px-5 py-2.5">Nama Siswa</th>
                                    <th className="px-5 py-2.5">Kelas</th>
                                    <th className="px-5 py-2.5 text-right">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {group.items?.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                      <td className="px-5 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                                      <td className="px-5 py-2.5 font-mono text-slate-500">{item.nis || '-'}</td>
                                      <td className="px-5 py-2.5 font-bold text-slate-800 dark:text-slate-100">{item.nama_siswa}</td>
                                      <td className="px-5 py-2.5">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                          {item.nama_kelas || '-'}
                                        </span>
                                      </td>
                                      <td className="px-5 py-2.5 text-right">
                                        <button
                                          type="button"
                                          aria-label={`Hapus ${item.nama_siswa}`}
                                          onClick={() => handleDeleteAnggota(item)}
                                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                          title="Hapus dari eskul"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: PEMBINA (GURU) */}
            {activeTab === 'PEMBINA' && (
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="pembinaSearchInput"
                      aria-label="Cari guru pembina eskul"
                      value={pembinaSearch}
                      onChange={e => setPembinaSearch(e.target.value)}
                      placeholder="Cari nama guru, NIP, atau kegiatan..."
                      className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Total: {filteredPembinas.length} Pembina
                  </div>
                </div>

                {/* Grouped Pembinas Cards List */}
                {loadingData || loadingEskul ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader size="lg" />
                    <span className="text-xs font-medium">Memuat data pembina kegiatan...</span>
                  </div>
                ) : groupedPembinas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                    <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum Ada Data Kegiatan</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Silakan buat jenis kegiatan eskul terlebih dahulu di Master Jenis Kegiatan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedPembinas?.map(group => {
                      if (!group.eskul) return null;
                      return (
                        <div 
                          key={group.eskul.id} 
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
                        >
                          <div className="px-5 py-3.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  {group.eskul.nama}
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-800">
                                    {group.eskul.tipe}
                                  </span>
                                </h4>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {group.items.length} Pembina Terdaftar
                            </span>
                          </div>

                          {group.items.length === 0 ? (
                            <div className="px-5 py-6 text-center text-xs text-slate-400">
                              Belum ada pembina guru yang terdaftar di kegiatan ini.
                            </div>
                          ) : isMobile ? (
                            <div className="p-3 space-y-2">
                              {group.items.map((item) => (
                                <div key={item.id} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                  <div className="space-y-0.5 min-w-0">
                                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate">
                                      {item.nama_guru}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">NIP: {item.nip || '-'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    aria-label={`Hapus pembina ${item.nama_guru}`}
                                    onClick={() => handleDeletePembina(item)}
                                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                                    title="Hapus pembina"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/30 dark:bg-slate-800/20 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    <th className="px-5 py-2.5 w-12 text-center">No</th>
                                    <th className="px-5 py-2.5">NIP</th>
                                    <th className="px-5 py-2.5">Nama Guru Pembina</th>
                                    <th className="px-5 py-2.5 text-right">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {group.items?.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                      <td className="px-5 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                                      <td className="px-5 py-2.5 font-mono text-slate-500">{item.nip || '-'}</td>
                                      <td className="px-5 py-2.5 font-bold text-slate-800 dark:text-slate-100">{item.nama_guru}</td>
                                      <td className="px-5 py-2.5 text-right">
                                        <button
                                          type="button"
                                          aria-label={`Hapus pembina ${item.nama_guru}`}
                                          onClick={() => handleDeletePembina(item)}
                                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                          title="Hapus pembina"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Modals */}
        <Suspense fallback={null}>
          <MethodChoiceModal
            isOpen={isMethodModalOpen}
            onClose={() => setIsMethodModalOpen(false)}
            type={methodModalType}
            onSelectDirect={handleSelectDirectForm}
            onSelectMatrix={handleSelectMatrix}
          />

          {isAddModalOpen && activeTab === 'ANGGOTA' && (
            <AnggotaEskulWizardModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              eskulList={eskulList}
              classes={classes}
              selectedWizardEskulId={selectedWizardEskulId}
              setSelectedWizardEskulId={setSelectedWizardEskulId}
              selectedWizardSiswaIds={selectedWizardSiswaIds}
              wizardSiswaSearch={wizardSiswaSearch}
              setWizardSiswaSearch={setWizardSiswaSearch}
              wizardSiswaKelasId={wizardSiswaKelasId}
              setWizardSiswaKelasId={setWizardSiswaKelasId}
              siswaPickerList={siswaPickerList}
              loadingPicker={loadingPicker}
              handleSelectAllSiswa={handleSelectAllSiswa}
              handleToggleSiswa={handleToggleSiswa}
              wizardEskulName={wizardEskulName}
              selectedSiswaDetails={selectedSiswaDetails}
              handleSaveWizard={handleSaveWizard}
              submittingForm={submittingForm}
            />
          )}

          {isAddModalOpen && activeTab === 'PEMBINA' && (
            <PembinaEskulModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              selectedFormGuruId={selectedFormGuruId}
              setSelectedFormGuruId={setSelectedFormGuruId}
              selectedFormEskulId={selectedFormEskulId}
              setSelectedFormEskulId={setSelectedFormEskulId}
              guruPickerList={guruPickerList}
              eskulList={eskulList}
              loadingPicker={loadingPicker}
              submittingForm={submittingForm}
              handleSavePembinaForm={handleSavePembinaForm}
            />
          )}
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
