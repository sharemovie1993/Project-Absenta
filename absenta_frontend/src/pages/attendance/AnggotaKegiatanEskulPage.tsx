import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Trash2, AlertCircle, X, BookOpen, ChevronRight, FileText, Network, Check } from 'lucide-react';
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
import { Button, SectionCard } from '@/components/ui';
import { Label } from '@/components/ui/Label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

export default React.memo(function AnggotaKegiatanEskulPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      return Array.isArray(r) ? r : (r as any)?.data ?? [];
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
        return { members: data, pembinas: [] };
      } else {
        const data = await getPembinaKegiatanEskul('ALL');
        return { members: [], pembinas: data };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const members = globalDataQuery.data?.members || [];
  const pembinas = globalDataQuery.data?.pembinas || [];
  const loadingData = globalDataQuery.isLoading;

  const fetchGlobalData = useCallback(async () => {
    await globalDataQuery.refetch();
  }, [globalDataQuery]);

  // -- Pickers Query
  const pickerQuery = useQuery({
    queryKey: ['eskul-pickers', activeTab, wizardSiswaSearch, wizardSiswaKelasId],
    queryFn: async () => {
      if (activeTab === 'ANGGOTA') {
        const students = await getSiswaAkademikPickerList(wizardSiswaSearch || undefined, wizardSiswaKelasId || undefined);
        return { siswa: students, guru: [] };
      } else {
        const teachers = await getGuruPickerList();
        return { siswa: [], guru: teachers };
      }
    },
    enabled: isAddModalOpen,
    staleTime: 5 * 60 * 1000,
  });

  const siswaPickerList = pickerQuery.data?.siswa || [];
  const guruPickerList = pickerQuery.data?.guru || [];
  const loadingPicker = pickerQuery.isLoading;

  // -- Delete & Save Handlers Mutations
  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => removeAnggotaKegiatanEskul(id),
    onSuccess: () => {
      toast.success('Anggota berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
    },
    onError: () => {
      toast.error('Gagal menghapus anggota');
    }
  });

  const removePembinaMutation = useMutation({
    mutationFn: (id: string) => removePembinaKegiatanEskul(id),
    onSuccess: () => {
      toast.success('Pembina berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
    },
    onError: () => {
      toast.error('Gagal menghapus pembina');
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ eskulId, siswaIds }: { eskulId: string; siswaIds: string[] }) =>
      addAnggotaKegiatanEskul(eskulId, siswaIds),
    onSuccess: (_, variables) => {
      toast.success(`${variables.siswaIds.length} anggota eskul berhasil ditambahkan`);
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan anggota');
    }
  });

  const addPembinaMutation = useMutation({
    mutationFn: ({ eskulId, guruIds }: { eskulId: string; guruIds: string[] }) =>
      addPembinaKegiatanEskul(eskulId, guruIds),
    onSuccess: () => {
      toast.success('Pembina eskul berhasil ditambahkan');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['eskul-members-pembinas-global'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan pembina');
    }
  });

  const handleRemoveMember = async (member: AnggotaKegiatanEskulItem) => {
    if (!confirm(`Hapus keanggotaan ${member.nama_siswa} dari ${member.eskul_nama || 'eskul'}?`)) return;
    await removeMemberMutation.mutateAsync(member.id);
  };

  const handleRemovePembina = async (pembina: PembinaKegiatanEskulItem) => {
    if (!confirm(`Hapus penugasan pembina ${pembina.nama_guru} dari ${pembina.eskul_nama || 'eskul'}?`)) return;
    await removePembinaMutation.mutateAsync(pembina.id);
  };

  const handleSaveWizard = async () => {
    if (!selectedWizardEskulId || selectedWizardSiswaIds.size === 0) return;
    await addMemberMutation.mutateAsync({
      eskulId: selectedWizardEskulId,
      siswaIds: Array.from(selectedWizardSiswaIds)
    });
  };

  const handleSavePembinaForm = async () => {
    if (!selectedFormGuruId || !selectedFormEskulId) return;
    await addPembinaMutation.mutateAsync({
      eskulId: selectedFormEskulId,
      guruIds: [selectedFormGuruId]
    });
  };

  const submittingForm = addMemberMutation.isPending || addPembinaMutation.isPending;

  // -- Wizard helper details
  const wizardEskulName = useMemo(() => {
    return eskulList.find(e => e.id === selectedWizardEskulId)?.nama || '';
  }, [selectedWizardEskulId, eskulList]);

  const selectedSiswaDetails = useMemo(() => {
    return siswaPickerList.filter(s => selectedWizardSiswaIds.has(s.siswa_akademik_id));
  }, [siswaPickerList, selectedWizardSiswaIds]);

  // -- Memoized Filter Lists for page view tables
  const filteredMembers = useMemo(() => {
    return members.filter(m =>
      m.nama_siswa.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.nis?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.kelas?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.eskul_nama?.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [members, memberSearch]);

  const filteredPembinas = useMemo(() => {
    return pembinas.filter(p =>
      p.nama_guru.toLowerCase().includes(pembinaSearch.toLowerCase()) ||
      p.nip?.toLowerCase().includes(pembinaSearch.toLowerCase()) ||
      p.eskul_nama?.toLowerCase().includes(pembinaSearch.toLowerCase())
    );
  }, [pembinas, pembinaSearch]);

  const breadcrumbs = useMemo(() => [
    { label: 'Kesiswaan', path: '/attendance/dashboard' },
    { label: 'Anggota & Pembina Eskul' }
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Manajemen Eskul",
    description: (
      <div className="space-y-2">
        <p>Gunakan halaman ini untuk memetakan siswa dan guru ke kegiatan ekstrakurikuler yang aktif secara global.</p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
          <p><strong>Tab Anggota:</strong> Kelola pemetaan siswa ke kegiatan eskul.</p>
          <p><strong>Tab Pembina:</strong> Kelola pemetaan guru pembina eskul.</p>
        </div>
      </div>
    ),
    items: [
      { text: "Tekan tombol 'Tambah' untuk mendaftarkan anggota/pembina baru." },
      { text: "Pilih metode penginputan: Tambah Manual atau Gunakan Diagram visual." },
      { text: "Hubungan pembina eskul otomatis sinkron dengan diagram struktur organisasi." }
    ]
  }), []);

  // -- Toggle Wizard student selection
  const handleToggleSiswa = (siswaAkademikId: string) => {
    const next = new Set(selectedWizardSiswaIds);
    if (next.has(siswaAkademikId)) {
      next.delete(siswaAkademikId);
    } else {
      next.add(siswaAkademikId);
    }
    setSelectedWizardSiswaIds(next);
  };

  const handleSelectAllSiswa = () => {
    if (selectedWizardSiswaIds.size === siswaPickerList.length) {
      setSelectedWizardSiswaIds(new Set());
    } else {
      setSelectedWizardSiswaIds(new Set(siswaPickerList.map(s => s.siswa_akademik_id)));
    }
  };

  return (
    <AcademicPageLayout
      title="Manajemen Ekstrakurikuler"
      description="Kelola keanggotaan siswa dan penugasan guru pembina eskul"
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="attendance_anggota_eskul"
    >
      <SectionCard fullWidth className="p-0">
        {/* Tab & Search Headers */}
        <div className="px-6 pt-5 pb-0 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Selector */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('ANGGOTA')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ANGGOTA'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Daftar Anggota (Siswa)
            </button>
            <button
              onClick={() => setActiveTab('PEMBINA')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'PEMBINA'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Pembina Eskul (Guru)
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-3 pb-4 md:pb-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="global-search-input"
                value={activeTab === 'ANGGOTA' ? memberSearch : pembinaSearch}
                onChange={e => activeTab === 'ANGGOTA' ? setMemberSearch(e.target.value) : setPembinaSearch(e.target.value)}
                placeholder={activeTab === 'ANGGOTA' ? "Cari nama / NIS / eskul..." : "Cari nama / NIP / eskul..."}
                className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-64"
              />
            </div>
            <Button
              id="btn-tambah-pemicu"
              variant="primary"
              onClick={() => {
                setMethodModalType(activeTab);
                setIsMethodModalOpen(true);
              }}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'ANGGOTA' ? 'Tambah Anggota' : 'Tambah Pembina'}
            </Button>
          </div>
        </div>

        {/* List Content */}
        <div className="overflow-x-auto min-h-[400px]">
          {loadingData ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Memuat data roster eskul...
            </div>
          ) : activeTab === 'ANGGOTA' ? (
            /* TABLE ANGGOTA (SISWA) */
            filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm gap-2">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                <span>Tidak ada data anggota siswa ditemukan</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-6 py-3.5">No</th>
                    <th className="text-left px-6 py-3.5">NIS</th>
                    <th className="text-left px-6 py-3.5">Nama Siswa</th>
                    <th className="text-left px-6 py-3.5">Kelas</th>
                    <th className="text-left px-6 py-3.5">Ekstrakurikuler</th>
                    <th className="text-right px-6 py-3.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMembers.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{m.nis}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{m.nama_siswa}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                          {m.kelas}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {m.eskul_nama}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          id={`btn-hapus-siswa-${m.id}`}
                          onClick={() => handleRemoveMember(m)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                          title="Hapus dari eskul"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* TABLE PEMBINA (GURU) */
            filteredPembinas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm gap-2">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                <span>Tidak ada data guru pembina ditemukan</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-6 py-3.5">No</th>
                    <th className="text-left px-6 py-3.5">NIP</th>
                    <th className="text-left px-6 py-3.5">Nama Guru</th>
                    <th className="text-left px-6 py-3.5">Membina Kegiatan</th>
                    <th className="text-right px-6 py-3.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPembinas.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p.nip}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{p.nama_guru}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {p.eskul_nama}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          id={`btn-hapus-pembina-${p.id}`}
                          onClick={() => handleRemovePembina(p)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                          title="Hapus pembina"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </SectionCard>

      {/* Choice Modal: Manual vs Diagram */}
      {isMethodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-visible border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Pilih Metode Penugasan {methodModalType === 'ANGGOTA' ? 'Anggota' : 'Pembina'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tentukan bagaimana Anda ingin memetakan data</p>
              </div>
              <button 
                onClick={() => setIsMethodModalOpen(false)} 
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Methods Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
              <button
                onClick={() => {
                  setIsMethodModalOpen(false);
                  setIsAddModalOpen(true);
                  if (methodModalType === 'ANGGOTA') {
                    setCurrentStep(1);
                    setSelectedWizardEskulId('');
                    setSelectedWizardSiswaIds(new Set());
                    setWizardSiswaSearch('');
                    setWizardSiswaKelasId('');
                  } else {
                    setSelectedFormGuruId('');
                    setSelectedFormEskulId('');
                  }
                }}
                className="group flex flex-col items-center text-center p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md rounded-2xl transition-all"
              >
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-105 transition-transform mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambah Manual</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
                  Pilih dan petakan data secara langsung menggunakan form terstruktur.
                </p>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-auto">
                  Mulai Mengisi <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>

              <button
                onClick={() => {
                  setIsMethodModalOpen(false);
                  if (methodModalType === 'ANGGOTA') {
                    navigate('/academic/struktur-organisasi?tab=PETUGAS_KELAS');
                  } else {
                    navigate('/academic/struktur-organisasi?tab=PEMBINA_ESKUL');
                  }
                }}
                className="group flex flex-col items-center text-center p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md rounded-2xl transition-all"
              >
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-105 transition-transform mb-3">
                  <Network className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Gunakan Diagram</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
                  Petakan tugas secara visual melalui struktur diagram organisasi sekolah.
                </p>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-auto">
                  Buka Diagram <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modals */}
      {isAddModalOpen && (
        activeTab === 'ANGGOTA' ? (
          /* MULTI-STEP WIZARD MODAL FOR STUDENTS (ANGGOTA) */
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-t-2xl flex-shrink-0">
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                    Tambah Anggota Eskul (Wizard)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lengkapi 3 langkah pemetaan anggota siswa</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Stepper Wizard Indicator */}
              <div className="px-6 py-3 bg-slate-50/30 dark:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                    currentStep > 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'border-current'
                  }`}>
                    {currentStep > 1 ? <Check className="w-3 h-3" /> : '1'}
                  </span>
                  <span>Pilih Eskul</span>
                </div>
                <div className="w-12 h-px bg-slate-200 dark:bg-slate-800 flex-1 mx-2" />
                <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                    currentStep > 2 ? 'bg-indigo-600 text-white border-indigo-600' : 'border-current'
                  }`}>
                    {currentStep > 2 ? <Check className="w-3 h-3" /> : '2'}
                  </span>
                  <span>Pilih Anggota</span>
                </div>
                <div className="w-12 h-px bg-slate-200 dark:bg-slate-800 flex-1 mx-2" />
                <div className={`flex items-center gap-1.5 ${currentStep === 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-current">
                    3
                  </span>
                  <span>Ringkasan</span>
                </div>
              </div>

              {/* Step Contents */}
              <div className="p-6 overflow-y-auto flex-1">
                {currentStep === 1 && (
                  /* STEP 1: PILIH ESKUL */
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-eskul-select" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Pilih Ekstrakurikuler <span className="text-rose-500">*</span>
                      </Label>
                      <SearchableSelect
                        id="wizard-eskul-select"
                        value={selectedWizardEskulId}
                        onValueChange={setSelectedWizardEskulId}
                        options={eskulList.map(e => ({ label: e.nama, value: e.id }))}
                        placeholder="Pilih kegiatan eskul..."
                        searchPlaceholder="Cari eskul..."
                        triggerClassName="h-10 text-[13px] font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
                      />
                    </div>
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                        <strong>Langkah 1:</strong> Pilih salah satu jenis eskul/pembiasaan yang ingin Anda petakan anggotanya. Langkah berikutnya akan memunculkan daftar siswa aktif.
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  /* STEP 2: MULTI-SELECT ANGGOTA */
                  <div className="space-y-4 flex flex-col h-full max-h-[50vh]">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="wizard-siswa-search"
                          value={wizardSiswaSearch}
                          onChange={e => setWizardSiswaSearch(e.target.value)}
                          placeholder="Cari nama / NIS siswa..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <SearchableSelect
                          id="wizard-kelas-filter"
                          value={wizardSiswaKelasId}
                          onValueChange={setWizardSiswaKelasId}
                          options={[
                            { label: 'Semua Kelas', value: '' },
                            ...classes.map(c => ({ label: c.nama_kelas, value: c.id }))
                          ]}
                          placeholder="Pilih kelas..."
                          triggerClassName="h-9 text-xs font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
                        />
                      </div>
                    </div>

                    {/* Students Picker List Table */}
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-y-auto flex-1">
                      {loadingPicker ? (
                        <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                          Memuat data siswa picker...
                        </div>
                      ) : siswaPickerList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-xs text-slate-400 gap-2">
                          <AlertCircle className="w-6 h-6" />
                          <span>Siswa tidak ditemukan</span>
                        </div>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 w-12 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedWizardSiswaIds.size === siswaPickerList.length && siswaPickerList.length > 0}
                                  onChange={handleSelectAllSiswa}
                                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                />
                              </th>
                              <th className="px-4 py-2.5">NIS</th>
                              <th className="px-4 py-2.5">Nama Siswa</th>
                              <th className="px-4 py-2.5">Kelas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {siswaPickerList.map(s => {
                              const checked = selectedWizardSiswaIds.has(s.siswa_akademik_id);
                              return (
                                <tr 
                                  key={s.siswa_akademik_id}
                                  onClick={() => handleToggleSiswa(s.siswa_akademik_id)}
                                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer transition-colors ${
                                    checked ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                                  }`}
                                >
                                  <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleSiswa(s.siswa_akademik_id)}
                                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-500 font-mono">{s.nis}</td>
                                  <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{s.nama_siswa}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                      {s.kelas}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Terpilih: {selectedWizardSiswaIds.size} Siswa</span>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  /* STEP 3: SUMMARY & CONFIRMATION */
                  <div className="space-y-4 flex flex-col h-full max-h-[50vh]">
                    {/* Summary Header Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilihan Kegiatan</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{wizardEskulName}</span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa Terpilih</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">{selectedWizardSiswaIds.size} Orang</span>
                      </div>
                    </div>

                    {/* Summary Selected List Table */}
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-y-auto flex-1">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 w-12 text-center">No</th>
                            <th className="px-4 py-2.5">NIS</th>
                            <th className="px-4 py-2.5">Nama Siswa</th>
                            <th className="px-4 py-2.5">Kelas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedSiswaDetails.map((s, idx) => (
                            <tr key={s.siswa_akademik_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                              <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="px-4 py-2.5 text-slate-500 font-mono">{s.nis}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{s.nama_siswa}</td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                  {s.kelas}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Stepper Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/10 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-b-2xl flex-shrink-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (currentStep === 1) {
                      setIsAddModalOpen(false);
                    } else {
                      setCurrentStep((prev) => (prev - 1) as any);
                    }
                  }}
                  disabled={submittingForm}
                >
                  {currentStep === 1 ? 'Batalkan' : 'Sebelumnya'}
                </Button>
                
                {currentStep < 3 ? (
                  <Button 
                    variant="primary"
                    onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                    disabled={currentStep === 1 ? !selectedWizardEskulId : selectedWizardSiswaIds.size === 0}
                  >
                    Selanjutnya
                  </Button>
                ) : (
                  <Button 
                    variant="primary"
                    onClick={handleSaveWizard}
                    disabled={submittingForm || !selectedWizardEskulId || selectedWizardSiswaIds.size === 0}
                    className="px-6"
                  >
                    {submittingForm ? 'Menyimpan...' : 'Simpan Penugasan'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* FORM MODAL TAMBAH PEMBINA (GURU + ESKUL) */
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                    Tambah Pembina Eskul
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Petakan guru pembina untuk kegiatan ekstrakurikuler</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-5">
                {/* Select Guru */}
                <div className="space-y-2">
                  <Label htmlFor="form-guru-select" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Pilih Guru <span className="text-rose-500">*</span>
                  </Label>
                  <SearchableSelect
                    id="form-guru-select"
                    value={selectedFormGuruId}
                    onValueChange={setSelectedFormGuruId}
                    options={guruPickerList.map(g => ({ label: g.nama_guru, value: g.id }))}
                    placeholder={loadingPicker ? "Memuat guru..." : "Cari nama guru..."}
                    searchPlaceholder="Cari nama guru..."
                    disabled={loadingPicker || submittingForm}
                    triggerClassName="h-10 text-[13px] font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
                  />
                </div>

                {/* Select Eskul */}
                <div className="space-y-2">
                  <Label htmlFor="form-eskul-select-pembina" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Pilih Ekstrakurikuler <span className="text-rose-500">*</span>
                  </Label>
                  <SearchableSelect
                    id="form-eskul-select-pembina"
                    value={selectedFormEskulId}
                    onValueChange={setSelectedFormEskulId}
                    options={eskulList.map(e => ({ label: e.nama, value: e.id }))}
                    placeholder="Pilih kegiatan eskul..."
                    searchPlaceholder="Cari eskul..."
                    disabled={submittingForm}
                    triggerClassName="h-10 text-[13px] font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl w-full"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/10 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-2xl">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submittingForm}
                >
                  Batalkan
                </Button>
                <Button 
                  variant="primary"
                  onClick={handleSavePembinaForm}
                  disabled={submittingForm || !selectedFormGuruId || !selectedFormEskulId}
                  className="px-6"
                >
                  {submittingForm ? 'Menyimpan...' : 'Simpan Penugasan'}
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </AcademicPageLayout>
  );
});
