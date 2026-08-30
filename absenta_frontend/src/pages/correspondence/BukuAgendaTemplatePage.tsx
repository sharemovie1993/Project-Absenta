import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Loader } from '../../components/ui/Loader';
import { Badge } from '../../components/ui/Badge';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import {
  correspondenceApi,
  type SuratMasuk,
  type SuratKeluar,
  type TemplateSurat
} from '../../api/correspondence.api';
import { formatDate } from '@/utils/date.utils';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  Archive,
  Inbox,
  Send,
  FileText,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  Eye,
  Copy,
  CheckCircle,
  Clock,
  Sparkles,
  Code
} from 'lucide-react';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));

export default function BukuAgendaTemplatePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'AGENDA_MASUK' | 'AGENDA_KELUAR' | 'TEMPLATES'>('AGENDA_MASUK');
  const [searchTerm, setSearchTerm] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');

  // Modals state
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateSurat | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');

  // Form State Template
  const [templateForm, setTemplateForm] = useState({
    nama_template: '',
    kategori: 'Umum',
    isi_template: '',
    is_active: true
  });

  // Fetch Data Surat Masuk (Buku Agenda Masuk)
  const { data: masukData, isLoading: loadingMasuk } = useQuery({
    queryKey: ['agenda-surat-masuk', searchTerm],
    queryFn: () => correspondenceApi.getSuratMasuk({ search: searchTerm || undefined, limit: 100 }),
    enabled: activeTab === 'AGENDA_MASUK'
  });

  // Fetch Data Surat Keluar (Buku Agenda Keluar)
  const { data: keluarData, isLoading: loadingKeluar } = useQuery({
    queryKey: ['agenda-surat-keluar', searchTerm, kategoriFilter],
    queryFn: () => correspondenceApi.getSuratKeluar({ search: searchTerm || undefined, kategori: kategoriFilter || undefined, limit: 100 }),
    enabled: activeTab === 'AGENDA_KELUAR'
  });

  // Fetch Data Templates
  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['correspondence-templates', searchTerm, kategoriFilter],
    queryFn: () => correspondenceApi.getTemplates({ search: searchTerm || undefined, kategori: kategoriFilter || undefined }),
    enabled: activeTab === 'TEMPLATES'
  });

  // Fetch System Variables
  const { data: systemVarsData } = useQuery({
    queryKey: ['correspondence-system-variables'],
    queryFn: () => correspondenceApi.getSystemVariables(),
    staleTime: 60 * 60 * 1000
  });

  const listMasuk: SuratMasuk[] = useMemo(() => {
    return masukData?.data?.list || [];
  }, [masukData]);

  const listKeluar: SuratKeluar[] = useMemo(() => {
    return keluarData?.data?.list || [];
  }, [keluarData]);

  const listTemplates: TemplateSurat[] = useMemo(() => {
    return templatesData?.data?.list || [];
  }, [templatesData]);

  const systemVars = useMemo(() => {
    return systemVarsData?.data || [
      { key: 'nama_sekolah', label: 'Nama Sekolah', example: 'SMK Negeri 1 Absenta' },
      { key: 'nomor_surat', label: 'Nomor Surat', example: '421/045/SMK/2026' },
      { key: 'tanggal', label: 'Tanggal Hari Ini', example: '31 Agustus 2026' },
      { key: 'kepala_sekolah', label: 'Nama Kepala Sekolah', example: 'Dr. H. Ahmad Fauzi, M.Pd' },
      { key: 'nip_kepsek', label: 'NIP Kepala Sekolah', example: '197001011995011001' },
      { key: 'nama_siswa', label: 'Nama Siswa', example: 'Amelia Reygina Putri' },
      { key: 'nis', label: 'NIS Siswa', example: '20251906' },
      { key: 'nisn', label: 'NISN Siswa', example: '0071906001' },
      { key: 'kelas', label: 'Kelas Siswa', example: 'X TJKT 1' },
    ];
  }, [systemVarsData]);

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: typeof templateForm) => correspondenceApi.createTemplate(data),
    onSuccess: () => {
      toast.success('Template surat berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['correspondence-templates'] });
      setTemplateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan template');
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof templateForm }) => correspondenceApi.updateTemplate(id, data),
    onSuccess: () => {
      toast.success('Template surat berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['correspondence-templates'] });
      setTemplateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui template');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => correspondenceApi.deleteTemplate(id),
    onSuccess: () => {
      toast.success('Template berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['correspondence-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus template');
    }
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateForm({
      nama_template: '',
      kategori: 'Umum',
      isi_template: '',
      is_active: true
    });
  };

  const handleOpenAddTemplate = () => {
    resetForm();
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: TemplateSurat) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      nama_template: tmpl.nama_template,
      kategori: tmpl.kategori || 'Umum',
      isi_template: tmpl.isi_template,
      is_active: tmpl.is_active
    });
    setTemplateModalOpen(true);
  };

  const handleDeleteTemplate = async (tmpl: TemplateSurat) => {
    if (window.confirm(`Yakin ingin menghapus template "${tmpl.nama_template}"?`)) {
      deleteTemplateMutation.mutate(tmpl.id);
    }
  };

  const handlePreviewTemplate = async (tmpl: TemplateSurat) => {
    try {
      setPreviewTitle(tmpl.nama_template);
      const res = await correspondenceApi.renderTemplate({
        template_id: tmpl.id,
        custom_vars: {
          nomor_surat: '421/099/SMK/2026',
          tanggal: formatDate(new Date().toISOString()),
          nama_siswa: 'Amelia Reygina Putri',
          nis: '20251906',
          kelas: 'X TJKT 1'
        }
      });
      setPreviewContent(res?.data?.html || tmpl.isi_template);
      setPreviewModalOpen(true);
    } catch {
      setPreviewContent(tmpl.isi_template);
      setPreviewModalOpen(true);
    }
  };

  const handleInsertVariable = (varKey: string) => {
    setTemplateForm(prev => ({
      ...prev,
      isi_template: prev.isi_template + ` {{${varKey}}} `
    }));
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.nama_template.trim()) {
      toast.error('Nama template wajib diisi');
      return;
    }
    if (!templateForm.isi_template.trim()) {
      toast.error('Isi konten template surat wajib diisi');
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  // Cetak Buku Agenda PDF
  const handlePrintAgenda = useCallback(() => {
    if (activeTab === 'AGENDA_MASUK') {
      generateGenericPdf({
        title: 'BUKU AGENDA SURAT MASUK',
        subtitle: `Dicetak pada: ${formatDate(new Date().toISOString())}`,
        headers: ['No', 'No. Agenda', 'No. Surat', 'Tgl Terima', 'Asal Surat', 'Perihal', 'Status'],
        data: listMasuk.map((s, idx) => [
          String(idx + 1),
          `AGM-${String(idx + 1).padStart(4, '0')}`,
          s.nomor_surat,
          formatDate(s.tanggal_terima),
          s.asal_surat || '-',
          s.judul,
          s.status
        ]),
        filename: `buku-agenda-surat-masuk-${new Date().toISOString().slice(0, 10)}.pdf`
      });
    } else if (activeTab === 'AGENDA_KELUAR') {
      generateGenericPdf({
        title: 'BUKU AGENDA SURAT KELUAR',
        subtitle: `Dicetak pada: ${formatDate(new Date().toISOString())}`,
        headers: ['No', 'No. Agenda', 'No. Surat', 'Tgl Surat', 'Tujuan', 'Perihal', 'Kategori', 'Status'],
        data: listKeluar.map((s, idx) => [
          String(idx + 1),
          `AGK-${String(idx + 1).padStart(4, '0')}`,
          s.nomor_surat,
          formatDate(s.tanggal_surat),
          s.tujuan_surat || '-',
          s.judul,
          s.kategori_surat || 'Umum',
          s.status
        ]),
        filename: `buku-agenda-surat-keluar-${new Date().toISOString().slice(0, 10)}.pdf`
      });
    }
  }, [activeTab, listMasuk, listKeluar]);

  // Tab Options
  const tabOptions = useMemo(() => [
    { id: 'AGENDA_MASUK', label: 'Buku Agenda Masuk', icon: Inbox, colorClass: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'AGENDA_KELUAR', label: 'Buku Agenda Keluar', icon: Send, colorClass: 'text-blue-600 dark:text-blue-400' },
    { id: 'TEMPLATES', label: 'Template Surat Dinas', icon: FileText, colorClass: 'text-emerald-600 dark:text-emerald-400' }
  ], []);

  // Columns for Agenda Masuk
  const columnsMasuk: Column[] = useMemo(() => [
    {
      key: 'agenda_no',
      label: 'No. Agenda',
      render: (_val, _row, idx) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          AGM-{String(idx + 1).padStart(4, '0')}
        </span>
      ),
      className: 'w-28'
    },
    {
      key: 'nomor_surat',
      label: 'No. & Tanggal Surat',
      render: (_val, s: SuratMasuk) => (
        <div>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">{s?.nomor_surat}</span>
          <span className="text-[11px] text-slate-400">Tgl Surat: {formatDate(s?.tanggal_surat)}</span>
        </div>
      )
    },
    {
      key: 'tanggal_terima',
      label: 'Tanggal Diterima',
      render: (val) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {formatDate(val)}
        </span>
      )
    },
    {
      key: 'asal_surat',
      label: 'Pengirim / Asal',
      render: (val) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {val || '-'}
        </span>
      )
    },
    {
      key: 'judul',
      label: 'Perihal & Ringkasan',
      render: (_val, s: SuratMasuk) => (
        <div className="max-w-xs">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">{s?.judul}</span>
          {s?.ringkasan && <span className="text-[10px] text-slate-400 line-clamp-1">{s.ringkasan}</span>}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Disposisi / Status',
      render: (status) => (
        <Badge
          variant={status === 'DISETUJUI' ? 'success' : status === 'DIPROSES' ? 'info' : 'secondary'}
          size="sm"
          className="text-[10px] font-bold"
        >
          {status}
        </Badge>
      )
    }
  ], []);

  // Columns for Agenda Keluar
  const columnsKeluar: Column[] = useMemo(() => [
    {
      key: 'agenda_no',
      label: 'No. Agenda',
      render: (_val, _row, idx) => (
        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
          AGK-{String(idx + 1).padStart(4, '0')}
        </span>
      ),
      className: 'w-28'
    },
    {
      key: 'nomor_surat',
      label: 'No. Surat & Kategori',
      render: (_val, s: SuratKeluar) => (
        <div>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">{s?.nomor_surat}</span>
          <span className="text-[10px] uppercase font-bold text-blue-500">{s?.kategori_surat || 'Umum'}</span>
        </div>
      )
    },
    {
      key: 'tanggal_surat',
      label: 'Tanggal Kirim',
      render: (val) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {formatDate(val)}
        </span>
      )
    },
    {
      key: 'tujuan_surat',
      label: 'Tujuan Surat',
      render: (val) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {val || '-'}
        </span>
      )
    },
    {
      key: 'judul',
      label: 'Perihal Surat',
      render: (_val, s: SuratKeluar) => (
        <div className="max-w-xs">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">{s?.judul}</span>
          {s?.isi_ringkas && <span className="text-[10px] text-slate-400 line-clamp-1">{s.isi_ringkas}</span>}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <Badge
          variant={status === 'DIKIRIM' ? 'success' : status === 'MENUNGGU_TTD' ? 'warning' : 'secondary'}
          size="sm"
          className="text-[10px] font-bold"
        >
          {status}
        </Badge>
      )
    }
  ], []);

  return (
    <AcademicPageLayout
      title="Buku Agenda & Template Surat"
      description="Buku agenda resmi surat masuk/keluar sekolah, registrasi nomor surat, dan penyusunan template dokumen dinas."
      hardeningModuleKey="correspondence_templates"
      topSlot={
        <div className="flex items-center gap-2">
          {activeTab !== 'TEMPLATES' ? (
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={handlePrintAgenda}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Buku Agenda PDF
            </Button>
          ) : (
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleOpenAddTemplate}
              className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat Template Baru
            </Button>
          )}
        </div>
      }
      instruction={{
        title: "Panduan Buku Agenda & Template Surat",
        description: "Kelola rekapitulasi buku agenda resmi dan template otomatis surat dinas.",
        items: [
          { text: "Buku Agenda Masuk & Keluar merekam seluruh berkas persuratan dengan nomor agenda berurutan." },
          { text: "Gunakan fitur 'Cetak Buku Agenda PDF' untuk arsip fisik atau laporan pertanggungjawaban TU." },
          { text: "Pilih tab 'Template Surat Dinas' untuk membuat format surat siap pakai dengan variabel otomatis." }
        ]
      }}
    >
      <div className="space-y-6">
        {/* Tab Switcher & Search Bar */}
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <TabSwitcher
              options={tabOptions}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as any)}
              className="overflow-x-auto"
            />

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={activeTab === 'TEMPLATES' ? "Cari nama template..." : "Cari no agenda, nomor surat, perihal..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              {activeTab === 'TEMPLATES' && (
                <div className="w-40">
                  <SearchableSelect
                    id="filter-kategori-template"
                    aria-label="Filter Kategori"
                    value={kategoriFilter}
                    onValueChange={setKategoriFilter}
                    options={[
                      { value: '', label: 'Semua Kategori' },
                      { value: 'Umum', label: 'Umum' },
                      { value: 'Panggilan', label: 'Panggilan Ortu' },
                      { value: 'Keterangan', label: 'Keterangan Siswa' },
                      { value: 'Tugas', label: 'Surat Tugas' },
                      { value: 'Undangan', label: 'Undangan' },
                    ]}
                    placeholder="Kategori..."
                    triggerClassName="h-9 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* TAB 1: BUKU AGENDA SURAT MASUK */}
        {activeTab === 'AGENDA_MASUK' && (
          <Card className="p-0 overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
            {loadingMasuk ? (
              <div className="flex justify-center items-center py-20">
                <Loader size="lg" />
              </div>
            ) : listMasuk.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada catatan buku agenda surat masuk</h4>
                <p className="text-xs text-slate-400 mt-1">Surat masuk yang diregistrasi akan otomatis masuk ke dalam buku agenda ini.</p>
              </div>
            ) : (
              <Table
                data={listMasuk}
                columns={columnsMasuk}
                rowKey="id"
              />
            )}
          </Card>
        )}

        {/* TAB 2: BUKU AGENDA SURAT KELUAR */}
        {activeTab === 'AGENDA_KELUAR' && (
          <Card className="p-0 overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
            {loadingKeluar ? (
              <div className="flex justify-center items-center py-20">
                <Loader size="lg" />
              </div>
            ) : listKeluar.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Send className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada catatan buku agenda surat keluar</h4>
                <p className="text-xs text-slate-400 mt-1">Surat keluar yang diterbitkan akan otomatis teragendakan di sini.</p>
              </div>
            ) : (
              <Table
                data={listKeluar}
                columns={columnsKeluar}
                rowKey="id"
              />
            )}
          </Card>
        )}

        {/* TAB 3: KATALOG TEMPLATE SURAT DINAS */}
        {activeTab === 'TEMPLATES' && (
          <div>
            {loadingTemplates ? (
              <div className="flex justify-center items-center py-20">
                <Loader size="lg" />
              </div>
            ) : listTemplates.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada template surat dinas</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">Buat template surat dinas pertama Anda untuk memudahkan staf dan guru mencetak surat resmi.</p>
                <Button onClick={handleOpenAddTemplate} variant="primary" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Buat Template Surat
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listTemplates.map((tmpl) => (
                  <Card
                    key={tmpl.id}
                    className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200">
                          {tmpl.kategori || 'Umum'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(tmpl.updated_at || tmpl.created_at)}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2 leading-snug">
                        {tmpl.nama_template}
                      </h4>

                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 font-serif leading-relaxed">
                          {tmpl.isi_template.replace(/<[^>]*>?/gm, '')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handlePreviewTemplate(tmpl)}
                          className="flex items-center gap-1 text-slate-600 hover:text-indigo-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleOpenEditTemplate(tmpl)}
                          className="text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeleteTemplate(tmpl)}
                          className="text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL BUAT / EDIT TEMPLATE */}
      {templateModalOpen && (
        <Suspense fallback={null}>
          <Modal
            isOpen={templateModalOpen}
            onClose={() => setTemplateModalOpen(false)}
            title={editingTemplate ? "Edit Template Surat Dinas" : "Buat Template Surat Dinas Baru"}
            maxWidth="max-w-3xl"
          >
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nama_template" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nama Template Surat *
                  </Label>
                  <Input
                    id="nama_template"
                    placeholder="Contoh: Surat Panggilan Orang Tua Siswa"
                    value={templateForm.nama_template}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, nama_template: e.target.value }))}
                    className="mt-1 h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="kategori_template" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kategori Dokumen *
                  </Label>
                  <SearchableSelect
                    id="kategori_template"
                    value={templateForm.kategori}
                    onValueChange={(val) => setTemplateForm(prev => ({ ...prev, kategori: val }))}
                    options={[
                      { value: 'Umum', label: 'Umum' },
                      { value: 'Panggilan', label: 'Surat Panggilan Orang Tua' },
                      { value: 'Keterangan', label: 'Surat Keterangan Siswa' },
                      { value: 'Tugas', label: 'Surat Tugas Guru / Staf' },
                      { value: 'Undangan', label: 'Surat Undangan Resmi' },
                      { value: 'Keputusan', label: 'Surat Keputusan (SK)' },
                    ]}
                    placeholder="Pilih Kategori..."
                    triggerClassName="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Variabel Sistem yang Bisa Dipakai */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Klik Variabel Otomatis untuk Disisipkan:
                  </Label>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 max-h-24 overflow-y-auto">
                  {systemVars.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      title={v.example ? `Contoh: ${v.example}` : v.label}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="isi_template" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Isi / Konten Surat Resmi *
                </Label>
                <textarea
                  id="isi_template"
                  rows={8}
                  placeholder="Ketik isi draf surat dinas di sini... Gunakan variabel {{nama_siswa}}, {{nomor_surat}}, dll."
                  value={templateForm.isi_template}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, isi_template: e.target.value }))}
                  className="w-full mt-1 p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-serif leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplateModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  Simpan Template
                </Button>
              </div>
            </form>
          </Modal>
        </Suspense>
      )}

      {/* MODAL PREVIEW TEMPLATE */}
      {previewModalOpen && (
        <Suspense fallback={null}>
          <Modal
            isOpen={previewModalOpen}
            onClose={() => setPreviewModalOpen(false)}
            title={`Preview Render: ${previewTitle}`}
            maxWidth="max-w-2xl"
          >
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-inner font-serif text-xs text-black leading-relaxed whitespace-pre-wrap min-h-[250px]">
                {previewContent}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setPreviewModalOpen(false)}
                >
                  Tutup Preview
                </Button>
              </div>
            </div>
          </Modal>
        </Suspense>
      )}
    </AcademicPageLayout>
  );
}
