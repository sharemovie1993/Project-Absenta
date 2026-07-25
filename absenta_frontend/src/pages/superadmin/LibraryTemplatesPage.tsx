import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Library,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  BookOpen,
  Sparkles,
  FileText,
  Layers,
  GraduationCap,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  X,
  Filter
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card, Button, Badge, Modal } from '../../components/ui';
import { kurikulumApi } from '../../api/kurikulum.api';
import { toast } from 'sonner';
import useConfirm from '../../hooks/useConfirm';

interface LibraryTemplate {
  id: string;
  jenjang: string;
  nama_mapel: string;
  kode_mapel?: string;
  tingkat?: number;
  fase?: string;
  jenis: string;
  judul: string;
  topik?: string;
  file_url: string;
  downloads_count: number;
  created_at: string;
}

const JENIS_OPTIONS = [
  { label: 'Semua Jenis', value: '' },
  { label: 'Modul Ajar', value: 'MODUL_AJAR' },
  { label: 'ATP (Alur Tujuan Pembelajaran)', value: 'ATP' },
  { label: 'Modul Projek (P5)', value: 'MODUL_PROJEK' },
  { label: 'Program Tahunan (PROTA)', value: 'PROTA' },
  { label: 'Program Semester (PROMES)', value: 'PROMES' },
  { label: 'KKTP', value: 'KKTP' },
];

const JENJANG_OPTIONS = [
  { label: 'Semua Jenjang', value: '' },
  { label: 'PAUD / TK', value: 'PAUD' },
  { label: 'SD / MI', value: 'SD' },
  { label: 'SMP / MTs', value: 'SMP' },
  { label: 'SMA / MA', value: 'SMA' },
  { label: 'SMK / MAK', value: 'SMK' },
  { label: 'SLB', value: 'SLB' },
  { label: 'Umum / All', value: 'ALL' },
];

export const JENJANG_TINGKAT_MAP: Record<string, Array<{ tingkat: number; label: string; fase: string }>> = {
  PAUD: [{ tingkat: 0, label: 'PAUD / TK (Fase PAUD)', fase: 'PAUD' }],
  SD: [
    { tingkat: 1, label: 'Kelas 1 (Fase A)', fase: 'A' },
    { tingkat: 2, label: 'Kelas 2 (Fase A)', fase: 'A' },
    { tingkat: 3, label: 'Kelas 3 (Fase B)', fase: 'B' },
    { tingkat: 4, label: 'Kelas 4 (Fase B)', fase: 'B' },
    { tingkat: 5, label: 'Kelas 5 (Fase C)', fase: 'C' },
    { tingkat: 6, label: 'Kelas 6 (Fase C)', fase: 'C' },
  ],
  SMP: [
    { tingkat: 7, label: 'Kelas 7 / VII (Fase D)', fase: 'D' },
    { tingkat: 8, label: 'Kelas 8 / VIII (Fase D)', fase: 'D' },
    { tingkat: 9, label: 'Kelas 9 / IX (Fase D)', fase: 'D' },
  ],
  SMA: [
    { tingkat: 10, label: 'Kelas 10 / X (Fase E)', fase: 'E' },
    { tingkat: 11, label: 'Kelas 11 / XI (Fase F)', fase: 'F' },
    { tingkat: 12, label: 'Kelas 12 / XII (Fase F)', fase: 'F' },
  ],
  SMK: [
    { tingkat: 10, label: 'Kelas 10 / X (Fase E)', fase: 'E' },
    { tingkat: 11, label: 'Kelas 11 / XI (Fase F)', fase: 'F' },
    { tingkat: 12, label: 'Kelas 12 / XII (Fase F)', fase: 'F' },
    { tingkat: 13, label: 'Kelas 13 / XIII (Fase F)', fase: 'F' },
  ],
  SLB: [
    { tingkat: 1, label: 'Kelas 1 (Fase A)', fase: 'A' },
    { tingkat: 2, label: 'Kelas 2 (Fase A)', fase: 'A' },
    { tingkat: 3, label: 'Kelas 3 (Fase B)', fase: 'B' },
    { tingkat: 4, label: 'Kelas 4 (Fase B)', fase: 'B' },
    { tingkat: 5, label: 'Kelas 5 (Fase C)', fase: 'C' },
    { tingkat: 6, label: 'Kelas 6 (Fase C)', fase: 'C' },
    { tingkat: 7, label: 'Kelas 7 (Fase D)', fase: 'D' },
    { tingkat: 8, label: 'Kelas 8 (Fase D)', fase: 'D' },
    { tingkat: 9, label: 'Kelas 9 (Fase D)', fase: 'D' },
    { tingkat: 10, label: 'Kelas 10 (Fase E)', fase: 'E' },
    { tingkat: 11, label: 'Kelas 11 (Fase F)', fase: 'F' },
    { tingkat: 12, label: 'Kelas 12 (Fase F)', fase: 'F' },
  ],
  ALL: [
    { tingkat: 1, label: 'Kelas 1 (Fase A)', fase: 'A' },
    { tingkat: 2, label: 'Kelas 2 (Fase A)', fase: 'A' },
    { tingkat: 3, label: 'Kelas 3 (Fase B)', fase: 'B' },
    { tingkat: 4, label: 'Kelas 4 (Fase B)', fase: 'B' },
    { tingkat: 5, label: 'Kelas 5 (Fase C)', fase: 'C' },
    { tingkat: 6, label: 'Kelas 6 (Fase C)', fase: 'C' },
    { tingkat: 7, label: 'Kelas 7 / VII (Fase D)', fase: 'D' },
    { tingkat: 8, label: 'Kelas 8 / VIII (Fase D)', fase: 'D' },
    { tingkat: 9, label: 'Kelas 9 / IX (Fase D)', fase: 'D' },
    { tingkat: 10, label: 'Kelas 10 / X (Fase E)', fase: 'E' },
    { tingkat: 11, label: 'Kelas 11 / XI (Fase F)', fase: 'F' },
    { tingkat: 12, label: 'Kelas 12 / XII (Fase F)', fase: 'F' },
  ]
};


export function LibraryTemplatesPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('');
  const [selectedJenis, setSelectedJenis] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryTemplate | null>(null);
  const [formState, setFormState] = useState({
    jenjang: 'SMK',
    nama_mapel: '',
    kode_mapel: '',
    tingkat: 10,
    fase: 'E',
    jenis: 'MODUL_AJAR',
    judul: '',
    topik: '',
    html_content: ''
  });

  // Query Data
  const { data: libraryData, isLoading, isRefetching } = useQuery({
    queryKey: ['superadmin-library-templates', selectedJenjang, selectedJenis, searchQuery],
    queryFn: () => kurikulumApi.getLibraryTemplates({
      jenjang: selectedJenjang || undefined,
      jenis: selectedJenis || undefined,
      search: searchQuery || undefined
    })
  });

  const templates: LibraryTemplate[] = libraryData?.data ?? [];

  // Analytics Stats
  const stats = useMemo(() => {
    const total = templates.length;
    const totalDownloads = templates.reduce((acc, curr) => acc + (curr.downloads_count || 0), 0);
    const mapelCount = new Set(templates.map((t) => t.nama_mapel)).size;
    const modulAjarCount = templates.filter((t) => t.jenis === 'MODUL_AJAR').length;
    return { total, totalDownloads, mapelCount, modulAjarCount };
  }, [templates]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formState) => kurikulumApi.createLibraryTemplate(data),
    onSuccess: () => {
      toast.success('Template Bank Library Nasional berhasil ditambahkan!');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['superadmin-library-templates'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan template';
      toast.error(msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; data: Partial<typeof formState> }) =>
      kurikulumApi.updateLibraryTemplate(vars.id, vars.data),
    onSuccess: () => {
      toast.success('Template Bank Library berhasil diperbarui!');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['superadmin-library-templates'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui template';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kurikulumApi.deleteLibraryTemplate(id),
    onSuccess: () => {
      toast.success('Template berhasil dihapus dari Bank Katalog Library');
      queryClient.invalidateQueries({ queryKey: ['superadmin-library-templates'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus template';
      toast.error(msg);
    }
  });

  const resetForm = () => {
    setEditingItem(null);
    setFormState({
      jenjang: 'SMK',
      nama_mapel: '',
      kode_mapel: '',
      tingkat: 10,
      fase: 'E',
      jenis: 'MODUL_AJAR',
      judul: '',
      topik: '',
      html_content: ''
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LibraryTemplate) => {
    setEditingItem(item);
    setFormState({
      jenjang: item.jenjang || 'SMK',
      nama_mapel: item.nama_mapel || '',
      kode_mapel: item.kode_mapel || '',
      tingkat: item.tingkat || 10,
      fase: item.fase || 'E',
      jenis: item.jenis || 'MODUL_AJAR',
      judul: item.judul || '',
      topik: item.topik || '',
      html_content: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, judul: string) => {
    const ok = await confirm({
      title: 'Hapus Template Library',
      message: `Apakah Anda yakin ingin menghapus template "${judul}" dari Bank Katalog Nasional?`,
      confirmText: 'Hapus Master',
      style: 'danger'
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formState });
    } else {
      createMutation.mutate(formState);
    }
  };

  return (
    <AcademicPageLayout
      title="Bank Katalog Library Nasional"
      subtitle="Manajemen Master Katalog Berkas Perangkat Ajar & Template AI Seluruh Sekolah (Superadmin Level)"
      icon={Library}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['superadmin-library-templates'] })}
            className="rounded-xl font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Master Template
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/10 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-violet-100 uppercase tracking-wider">Total Master Template</p>
                <h3 className="text-2xl font-black mt-1">{stats.total} Dokumen</h3>
              </div>
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
                <Library className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/10 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Total Adopsi Guru</p>
                <h3 className="text-2xl font-black mt-1">{stats.totalDownloads} Kali Adopsi</h3>
              </div>
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
                <Download className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-0 shadow-lg shadow-indigo-500/10 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Cakupan Mapel</p>
                <h3 className="text-2xl font-black mt-1">{stats.mapelCount} Mata Pelajaran</h3>
              </div>
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/10 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-100 uppercase tracking-wider">Modul Ajar Master</p>
                <h3 className="text-2xl font-black mt-1">{stats.modulAjarCount} Berkas</h3>
              </div>
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Controls Bar */}
        <Card className="p-4 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul template, mapel, atau topik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>

            <select
              value={selectedJenjang}
              onChange={(e) => setSelectedJenjang(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
            >
              {JENJANG_OPTIONS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>

            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
            >
              {JENIS_OPTIONS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Data Table */}
        <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 font-bold">Memuat Katalog Library Nasional...</div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Library className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Belum ada template master di Katalog Library</p>
              <p className="text-xs text-slate-400">Klik "Tambah Master Template" untuk mendaftarkan berkas Kurikulum Merdeka nasional.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Dokumen & Judul Template</th>
                    <th className="p-4">Jenjang & Mapel</th>
                    <th className="p-4">Jenis Perangkat</th>
                    <th className="p-4">Tingkat / Fase</th>
                    <th className="p-4 text-center">Statistik Adopsi</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {templates.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200 max-w-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                          <span className="truncate">{item.judul}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">{item.nama_mapel}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                            {item.jenjang || 'ALL'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 font-bold text-[10px]">
                          {item.jenis}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {item.tingkat ? `Kelas ${item.tingkat}` : '-'} {item.fase ? `(Fase ${item.fase})` : ''}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                          <Download size={13} /> {item.downloads_count || 0} x
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-slate-900 dark:hover:text-slate-200"
                            title="Edit Master Template"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id, item.judul)}
                            className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Hapus Template"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal Form Tambah / Edit */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Edit Master Template Library' : 'Tambah Master Template Library Baru'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenjang Pendidikan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formState.jenjang}
                  onChange={(e) => setFormState({ ...formState, jenjang: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
                >
                  <option value="PAUD">PAUD / TK</option>
                  <option value="SD">SD / MI</option>
                  <option value="SMP">SMP / MTs</option>
                  <option value="SMA">SMA / MA</option>
                  <option value="SMK">SMK / MAK</option>
                  <option value="SLB">SLB</option>
                  <option value="ALL">Semua / General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Perangkat <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formState.jenis}
                  onChange={(e) => setFormState({ ...formState, jenis: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
                >
                  <option value="MODUL_AJAR">Modul Ajar</option>
                  <option value="ATP">ATP (Alur Tujuan Pembelajaran)</option>
                  <option value="MODUL_PROJEK">Modul Projek (P5)</option>
                  <option value="PROTA">Program Tahunan (PROTA)</option>
                  <option value="PROMES">Program Semester (PROMES)</option>
                  <option value="KKTP">KKTP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.nama_mapel}
                  onChange={(e) => setFormState({ ...formState, nama_mapel: e.target.value })}
                  placeholder="Contoh: Pemrograman Web / Bahasa Indonesia"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Template Dokumen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.judul}
                  onChange={(e) => setFormState({ ...formState, judul: e.target.value })}
                  placeholder="Contoh: Modul Ajar RESTful API Frontend React"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tingkat Kelas <span className="text-rose-500">*</span>
                </label>
                {(() => {
                  const options = JENJANG_TINGKAT_MAP[formState.jenjang] || JENJANG_TINGKAT_MAP['SMK'];
                  return (
                    <select
                      value={formState.tingkat}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const match = options.find((o) => o.tingkat === val);
                        setFormState({
                          ...formState,
                          tingkat: val,
                          fase: match?.fase || formState.fase
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none font-bold"
                    >
                      {options.map((opt) => (
                        <option key={opt.tingkat} value={opt.tingkat}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fase Kurikulum Merdeka (Otomatis)
                </label>
                <div className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 font-bold text-violet-700 dark:text-violet-300 flex items-center justify-between">
                  <span>Fase {formState.fase || 'E'}</span>
                  <Badge className="bg-violet-200 dark:bg-violet-900 text-violet-900 dark:text-violet-200 text-[10px]">
                    Auto-Sync Jenjang
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Topik / Pokok Bahasan Utama <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formState.topik}
                onChange={(e) => setFormState({ ...formState, topik: e.target.value })}
                placeholder="Contoh: REST API & State Management"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
                BATAL
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
              >
                {editingItem ? 'SIMPAN PERUBAHAN' : 'TAMBAH TEMPLATE'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AcademicPageLayout>
  );
}

export default LibraryTemplatesPage;
