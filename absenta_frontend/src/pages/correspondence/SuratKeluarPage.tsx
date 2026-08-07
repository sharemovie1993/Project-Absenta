import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
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
import { correspondenceApi, type SuratKeluar } from '../../api/correspondence.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { getStrukturList, type StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import { getTenantById } from '../../api/tenants.api';
import { useAuth } from '../../hooks/useAuth';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { useDebounce } from '../../hooks/useDebounce';
import useConfirm from '../../hooks/useConfirm';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Send, CheckSquare, Clock, Award, ShieldAlert, Printer, Eye } from 'lucide-react';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

export default function SuratKeluarPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const confirm = useConfirm();

  const [formData, setFormData] = useState({
    nomor_surat: '',
    judul: '',
    tujuan_surat: '',
    tanggal_surat: new Date().toISOString().split('T')[0],
    isi_ringkas: '',
    kategori_surat: 'Dinas',
    siswa_id: ''
  });

  const resetForm = useCallback(() => {
    setFormData({
      nomor_surat: '',
      judul: '',
      tujuan_surat: '',
      tanggal_surat: new Date().toISOString().split('T')[0],
      isi_ringkas: '',
      kategori_surat: 'Dinas',
      siswa_id: ''
    });
    setSelectedStudent(null);
    setSelectedId(null);
  }, []);

  const suratKeluarQuery = useQuery({
    queryKey: ['surat-keluar-list', page, limit, debouncedSearch, statusFilter, kategoriFilter],
    queryFn: async () => {
      const res = await correspondenceApi.getSuratKeluar({
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter || undefined,
        kategori_surat: kategoriFilter || undefined
      });
      return {
        list: res.data?.list || [],
        totalPages: res.data?.pagination?.totalPages || 1,
        totalItems: res.data?.pagination?.total || res.data?.pagination?.totalItems || 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = suratKeluarQuery.data?.list || [];
  const totalPages = suratKeluarQuery.data?.totalPages || 1;
  const totalItems = suratKeluarQuery.data?.totalItems || 0;
  const loading = suratKeluarQuery.isLoading;

  const fetchData = useCallback(async () => {
    await suratKeluarQuery.refetch();
  }, [suratKeluarQuery]);

  const deleteSuratKeluarMutation = useMutation({
    mutationFn: (id: string) => correspondenceApi.deleteSuratKeluar(id),
    onSuccess: () => {
      toast.success('Surat keluar berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['surat-keluar-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus surat keluar');
    }
  });

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Surat Keluar',
      description: 'Apakah Anda yakin ingin menghapus surat keluar ini? Tindakan ini tidak bisa dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;
    await deleteSuratKeluarMutation.mutateAsync(id);
  }, [confirm, deleteSuratKeluarMutation]);

  const handleOpenSign = useCallback((item: SuratKeluar) => {
    setSelectedId(item.id);
    setSignModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim()) {
      toast.error('Perihal / Judul Surat wajib diisi');
      return;
    }

    try {
      if (selectedId) {
        await correspondenceApi.updateSuratKeluar(selectedId, formData);
        toast.success('Surat keluar berhasil diperbarui');
      } else {
        await correspondenceApi.createSuratKeluar(formData);
        toast.success('Draft surat keluar berhasil dibuat');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan surat keluar');
    }
  }, [selectedId, formData, fetchData, resetForm]);

  const handleSignAction = useCallback(async (status: 'DIKIRIM' | 'DITOLAK') => {
    if (!selectedId) return;
    try {
      await correspondenceApi.signSuratKeluar(selectedId, { status });
      toast.success(status === 'DIKIRIM' ? 'Surat berhasil disetujui & ditandatangani' : 'Surat telah ditolak');
      setSignModalOpen(false);
      setSelectedId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses persetujuan');
    }
  }, [selectedId, fetchData]);

  const handlePrintPdf = useCallback(async (item: SuratKeluar) => {
    const toastId = toast.loading('Menyiapkan dokumen PDF...');
    try {
      const [sekolah, tenantRes] = await Promise.all([
        sekolahApi.getProfile().catch(() => null),
        user?.tenant_id ? getTenantById(user.tenant_id).catch(() => null) : Promise.resolve(null)
      ]);

      const tenantInfo = tenantRes?.success ? tenantRes.data : null;

      const getBase64 = async (url: string) => {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      const logoDaerahUrl = sekolah?.logo_url || tenantInfo?.logo_url;
      const logoSekolahUrl = tenantInfo?.logo_url;

      const [logoDaerahBase64, logoSekolahBase64] = await Promise.all([
        logoDaerahUrl ? getBase64(logoDaerahUrl) : Promise.resolve(null),
        logoSekolahUrl ? getBase64(logoSekolahUrl) : Promise.resolve(null)
      ]);

      // Determine module and printType
      let targetModule: 'bpbk' | 'attendance' | 'kesiswaan' = 'bpbk';
      let targetPrintType = 'letter_bk_call';
      
      // Parse agenda / reasons
      let agenda = item.isi_ringkas || '';
      if (agenda.startsWith('Digenerasikan dari modul BP/BK - Pemanggilan Orang Tua. Alasan: ')) {
        agenda = agenda.replace('Digenerasikan dari modul BP/BK - Pemanggilan Orang Tua. Alasan: ', '');
      } else if (agenda.startsWith('Digenerasikan dari modul Cetak Berkas (kesiswaan). Agenda: ')) {
        agenda = agenda.replace('Digenerasikan dari modul Cetak Berkas (kesiswaan). Agenda: ', '');
        targetModule = 'kesiswaan';
        targetPrintType = 'letter_summons';
      } else if (agenda.startsWith('Digenerasikan dari modul Cetak Berkas (attendance). Agenda: ')) {
        agenda = agenda.replace('Digenerasikan dari modul Cetak Berkas (attendance). Agenda: ', '');
        targetModule = 'attendance';
        targetPrintType = 'attendance_warning';
      }

      const isSummons = item.kategori_surat === 'Panggilan';
      const isWarning = item.kategori_surat === 'Peringatan';

      if (isWarning) {
        targetModule = 'attendance';
        targetPrintType = 'attendance_warning';
      } else if (isSummons) {
        if (targetModule !== 'kesiswaan') {
          targetModule = 'bpbk';
          targetPrintType = 'letter_bk_call';
        }
      }

      const structuresRes = await getStrukturList({ is_active: true }).catch(() => null);
      const structuresList = structuresRes?.success ? structuresRes.data : [];

      const blob = await generateGenericPdf({
        module: targetModule,
        printType: targetPrintType,
        selectedClassId: (item.Siswa?.Kelas as any)?.id || '',
        sekolah,
        tenantInfo,
        strukturList: structuresList || [],
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo: true,
        selectedStudentId: item.siswa_id || undefined,
        isSigned: item.status === 'DIKIRIM',
        eventDetails: {
          nomorSurat: item.nomor_surat,
          tanggalPertemuan: item.tanggal_surat,
          agendaPertemuan: agenda
        },
        filterData: {
          selectedStudent: item.Siswa,
          classes: item.Siswa?.Kelas ? [item.Siswa.Kelas] : [],
          students: item.Siswa ? [item.Siswa] : []
        }
      });

      const pdfUrl = URL.createObjectURL(blob);
      window.open(pdfUrl, '_blank');
      toast.success('Surat berhasil dibuka!', { id: toastId });
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      toast.error('Gagal memuat dokumen surat', { id: toastId });
    }
  }, [user]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">Draft</Badge>;
      case 'MENUNGGU_TTD': return <Badge variant="warning">Menunggu TTD</Badge>;
      case 'DIKIRIM': return <Badge variant="success">Telah Dikirim</Badge>;
      case 'DITOLAK': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: Column[] = useMemo(() => [
    {
      key: 'nomor_surat',
      label: 'Nomor Surat / Kategori',
      render: (_, item: SuratKeluar) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.nomor_surat}</div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider">
            {item.kategori_surat}
          </span>
        </div>
      )
    },
    {
      key: 'judul',
      label: 'Perihal & Penerima',
      render: (_, item: SuratKeluar) => (
        <div className="max-w-md">
          <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">{item.judul}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Tujuan: {item.tujuan_surat || '-'}</div>
        </div>
      )
    },
    {
      key: 'tanggal_surat',
      label: 'Tanggal Surat',
      render: (val: string) => (
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string) => statusBadge(val)
    },
    {
      key: 'siswa',
      label: 'Kaitan Siswa',
      render: (_, item: SuratKeluar) => (
        <div>
          {item.Siswa ? (
            <div>
              <div className="font-bold text-slate-800 dark:text-white text-[10px]">{item.Siswa.nama_siswa}</div>
              <div className="text-[9px] text-slate-400">{item.Siswa.Kelas?.nama_kelas || '-'}</div>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">-</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: SuratKeluar) => (
        <div className="flex gap-1 justify-end">
          {item.status === 'DRAFT' || item.status === 'MENUNGGU_TTD' ? (
            <Button
              variant="ghost"
              size="icon"
              title="Persetujuan & TTD"
              onClick={() => handleOpenSign(item)}
              className="w-7 h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Award size={13} />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePrintPdf(item)}
            className="w-7 h-7 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
            title="Lihat / Cetak PDF Surat"
          >
            <Printer size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            className="w-7 h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id)}
            className="w-7 h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete, handleOpenSign, handlePrintPdf]);

  return (
    <AcademicPageLayout
      title="Surat Keluar Sekolah"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Persuratan', path: '/correspondence' },
        { label: 'Surat Keluar', path: '/correspondence/surat-keluar' }
      ]}
      hardeningModuleKey="correspondence_outbox"
      instruction={{
        title: "Panduan Surat Keluar",
        description: "Gunakan halaman ini untuk memanajemen pembuatan surat keluar sekolah dan memproses tanda tangan digital Kepala Sekolah.",
        items: [
          { text: "Klik 'Buat Draft Surat' untuk membuat draft surat keluar." },
          { text: "Klik tombol bintang/persetujuan untuk melakukan Tanda Tangan Digital Kepala Sekolah secara instan." }
        ]
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center justify-between border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Surat Keluar</div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-1">{totalItems}</div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
            <Send size={18} />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menunggu Persetujuan</div>
            <div className="text-xl font-black text-amber-500 mt-1">
              {data.filter(d => d.status === 'DRAFT' || d.status === 'MENUNGGU_TTD').length}
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <Clock size={18} />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Surat Dikirim / Resmi</div>
            <div className="text-xl font-black text-emerald-500 mt-1">{data.filter(d => d.status === 'DIKIRIM').length}</div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
            <CheckSquare size={18} />
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nomor, perihal, atau tujuan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 text-xs border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 rounded-xl min-w-[150px] font-semibold text-slate-600 dark:text-slate-300"
            >
              <option value="">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="MENUNGGU_TTD">Menunggu TTD</option>
              <option value="DIKIRIM">Dikirim</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
            <select
              value={kategoriFilter}
              onChange={(e) => { setKategoriFilter(e.target.value); setPage(1); }}
              className="h-10 text-xs border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 rounded-xl min-w-[150px] font-semibold text-slate-600 dark:text-slate-300"
            >
              <option value="">Semua Kategori</option>
              <option value="Dinas">Dinas</option>
              <option value="Undangan">Undangan</option>
              <option value="Panggilan">Panggilan Orang Tua</option>
              <option value="Keterangan">Keterangan</option>
            </select>
          </div>
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => { resetForm(); setModalOpen(true); }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Buat Draft Surat
          </Button>
        </div>

        {loading && data.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader className="mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Server Surat...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={data}
            pagination={{
              currentPage: page,
              itemsPerPage: limit,
              totalItems: totalItems,
              totalPages,
              onPageChange: setPage,
              onLimitChange: (limitVal) => {
                setLimit(limitVal);
                setPage(1);
              }
            }}
          />
        )}
      </Card>

      <Suspense fallback={null}>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedId ? 'Edit Surat Keluar' : 'Buat Draft Surat Keluar Baru'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nomor Surat (Otomatis)</Label>
                <Input
                  placeholder="Kosongkan untuk otomatisasi nomor"
                  value={formData.nomor_surat}
                  onChange={(e) => setFormData(prev => ({ ...prev, nomor_surat: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-850"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori Surat</Label>
                <select
                  value={formData.kategori_surat}
                  onChange={(e) => setFormData(prev => ({ ...prev, kategori_surat: e.target.value }))}
                  className="w-full h-10 px-3 text-xs border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Dinas">Dinas</option>
                  <option value="Undangan">Undangan</option>
                  <option value="Panggilan">Panggilan Orang Tua</option>
                  <option value="Keterangan">Keterangan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tujuan Surat / Penerima</Label>
                <Input
                  placeholder="Contoh: Orang Tua Ahmad / Kepala Sekolah SMKN 2"
                  value={formData.tujuan_surat}
                  onChange={(e) => setFormData(prev => ({ ...prev, tujuan_surat: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Surat</Label>
                <Input
                  type="date"
                  value={formData.tanggal_surat}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal_surat: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Perihal / Hal Surat</Label>
              <Input
                placeholder="Contoh: Surat Panggilan Orang Tua Tahap I"
                value={formData.judul}
                onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kaitkan ke Siswa (Opsional)</Label>
              {selectedStudent ? (
                <div className="flex items-center justify-between p-3.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl">
                  <div>
                    <div className="font-bold text-xs">{selectedStudent.nama_siswa}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedStudent.Kelas?.nama_kelas || '-'} • NIS: {selectedStudent.nis}</div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setSelectedStudent(null); setFormData(prev => ({ ...prev, siswa_id: '' })); }}
                    className="text-xs font-bold text-rose-500 hover:bg-rose-50"
                  >
                    Batal
                  </Button>
                </div>
              ) : (
                <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                  <SmartStudentPicker
                    scope="piket"
                    onSelect={(s) => {
                      setSelectedStudent(s);
                      setFormData(prev => ({ ...prev, siswa_id: s.id }));
                    }}
                    mode="siswa"
                    placeholder="Ketik nama siswa..."
                  />
                </Suspense>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ringkasan / Isi Surat (Opsional)</Label>
              <textarea
                value={formData.isi_ringkas}
                onChange={(e) => setFormData(prev => ({ ...prev, isi_ringkas: e.target.value }))}
                className="w-full p-3 text-xs border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={3}
                placeholder="Tulis detail isi surat atau instruksi pendukung..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" variant="primary">Simpan Draft</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={signModalOpen} onClose={() => setSignModalOpen(false)} title="Persetujuan & Tanda Tangan Digital" size="md">
          <div className="space-y-6 p-4">
            <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
              <ShieldAlert className="text-amber-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">Verifikasi Kepala Sekolah</h4>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Persetujuan ini akan menyematkan Tanda Tangan Digital & QR-Validation Code pada surat resmi sekolah.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 rounded-xl text-center space-y-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preview E-Signature</div>
              <div className="inline-block border-2 border-dashed border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 rounded-xl">
                <div className="w-32 h-32 flex flex-col items-center justify-center border border-indigo-500/20 rounded bg-indigo-50/10">
                  <div className="text-[8px] font-black text-indigo-500 uppercase tracking-wider">SECURE DIGITAL SIGNATURE</div>
                  <div className="my-2 border-2 border-indigo-500 p-1 rounded-lg">
                    {/* Simulated QR Code Icon */}
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 rounded border">QR</div>
                  </div>
                  <div className="text-[7px] text-slate-400">ID: SECURE-ABSENTA-SIG</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="text-rose-500 border-rose-200 hover:bg-rose-50" onClick={() => handleSignAction('DITOLAK')}>
                Tolak Surat
              </Button>
              <Button type="button" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSignAction('DIKIRIM')}>
                Approve & Sign
              </Button>
            </div>
          </div>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
}