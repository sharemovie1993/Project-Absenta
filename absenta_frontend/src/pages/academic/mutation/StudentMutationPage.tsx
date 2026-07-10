import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Card, CardHeader, CardContent,
  Button, Input,
  Checkbox, Badge, Alert, AlertDescription, Label, Textarea,
  ModalFooter, SearchableSelect, Table, SectionCard
} from '../../../components/ui';
import { getSiswaList, bulkUpdateStatus } from '../../../api/academic/siswa.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import type { Siswa, Kelas } from '../../../types/academic';
import { Loader2, Search, AlertTriangle, GraduationCap, LogOut, Users, RefreshCw, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { getAcademicStats } from '../../../api/academic-stats.api';
import { Loader } from '../../../components/ui/Loader';
import { useJenjang } from '../../../hooks/useJenjang';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';

const Modal = lazy(() => import('../../../components/ui').then(module => ({ default: module.Modal })));

const StudentMutationPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const { config } = useJenjang();

  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [isGraduationModalOpen, setIsGraduationModalOpen] = useState(false);
  const [mutationDate, setMutationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mutationReason, setMutationReason] = useState('');
  const [mutationStatus, setMutationStatus] = useState('PINDAH');
  const [executing, setExecuting] = useState(false);

  // Tipe eksplisit untuk stats akademik menggantikan titik dua e-n-y
  type AcademicStatsData = {
    total_siswa?: number;
    total_guru?: number;
    total_kelas?: number;
    [key: string]: number | undefined;
  };

  const [stats, setStats] = useState<AcademicStatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const navigate = useNavigate();
  const canView = useMemo(() => can('academic.students.view.list'), [can]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoadingStats(true);
        const response = await getAcademicStats();
        setStats(response.data as any);
      } catch (e) { console.error(e); }
      finally { setIsLoadingStats(false); }
    };
    loadStats();
  }, []);

  useEffect(() => { if (canView) fetchKelas(); }, [canView]);
  useEffect(() => { if (canView) fetchSiswa(1); }, [canView, filterKelas, search, itemsPerPage]);

  // Tingkat tertinggi yang terdaftar di tenant (diambil langsung dari jenjang sekolah, e.g. SD=6, SMP=9, SMA=12, SMK=13)
  const maxTingkat = config.tingkatMax;

  const academicStats = useMemo(() => [
    { 
      title: "Siswa Aktif", 
      value: stats?.total_siswa || 0, 
      icon: <Users size={14} />, 
      gradient: "from-blue-600 to-indigo-700",
      subtitle: "Populasi aktif saat ini"
    },
    { 
      title: "Siswa Terpilih", 
      value: selectedSiswa.length, 
      icon: <CheckSquare size={14} />, 
      gradient: selectedSiswa.length > 0 ? "from-orange-500 to-amber-600" : "from-slate-400 to-slate-500",
      subtitle: "Siap diproses massal"
    },
    {
      title: "Target Lulus",
      value: siswaList.filter(s => s.Kelas?.tingkat === maxTingkat).length,
      icon: <GraduationCap size={14} />,
      gradient: "from-emerald-600 to-teal-700",
      subtitle: `Siswa tingkat ${maxTingkat} (tingkat akhir)`
    }
  ], [stats, selectedSiswa.length, siswaList, maxTingkat]);

  const fetchKelas = useCallback(async () => {
    try {
      const res = await getKelasList(1, 100);
      setKelasList(res.data || []);
    } catch (e: unknown) { console.error(e); }
  }, []);

  const fetchSiswa = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getSiswaList(page, itemsPerPage, search, filterKelas === 'all' ? '' : filterKelas, 'AKTIF');
      setSiswaList(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setCurrentPage(res?.pagination?.page || page);
      setSelectedSiswa([]);
    } catch (e: unknown) { console.error(e); }
    finally { setLoading(false); }
  }, [itemsPerPage, search, filterKelas]);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedSiswa(checked ? (siswaList?.map(s => s.id) || []) : []);
  }, [siswaList]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedSiswa(prev => checked ? [...prev, id] : prev.filter(sid => sid !== id));
  }, []);

  const columns = useMemo(() => [
    { key: 'nis', label: 'NIS', sortable: true, render: (v: string) => <span className="font-mono text-gray-500">{v}</span> },
    { key: 'nama_siswa', label: 'Nama Siswa', sortable: true, render: (v: string) => <span className="font-semibold">{v}</span> },
    { key: 'Kelas', label: 'Kelas', sortable: true, render: (v: Kelas | undefined) => v?.nama_kelas || '-' },
    { key: 'status', label: 'Status', render: () => <Badge variant="success" className="text-[10px]">AKTIF</Badge> }
  ], []);

  const openMutationModal = useCallback(() => {
    if (selectedSiswa.length === 0) { toast.error('Pilih minimal satu siswa.'); return; }
    setMutationDate(new Date().toISOString().split('T')[0]);
    setMutationReason(''); setMutationStatus('PINDAH');
    setIsMutationModalOpen(true);
  }, [selectedSiswa.length]);

  const openGraduationModal = useCallback(() => {
    if (selectedSiswa.length === 0) { toast.error('Pilih minimal satu siswa.'); return; }
    setMutationDate(new Date().toISOString().split('T')[0]);
    setIsGraduationModalOpen(true);
  }, [selectedSiswa.length]);

  const handleExecute = useCallback(async (type: 'MUTATION' | 'GRADUATION') => {
    if (!mutationDate) { toast.error('Tanggal wajib diisi.'); return; }
    if (type === 'MUTATION' && !mutationReason) { toast.error('Alasan wajib diisi untuk mutasi.'); return; }
    setExecuting(true);
    try {
      const status = type === 'GRADUATION' ? 'LULUS' : mutationStatus;
      const reason = type === 'GRADUATION' ? 'Lulus Sekolah' : mutationReason;
      await bulkUpdateStatus({ ids: selectedSiswa, status, tanggal: new Date(mutationDate), keterangan: reason });
      toast.success(`Berhasil memproses ${selectedSiswa.length} siswa.`);
      setSelectedSiswa([]); setIsMutationModalOpen(false); setIsGraduationModalOpen(false);
      fetchSiswa();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Gagal memproses data.');
    }
    finally { setExecuting(false); }
  }, [mutationDate, mutationReason, mutationStatus, selectedSiswa, fetchSiswa]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik' },
    { label: 'Mutasi Siswa' },
  ], []);

  const toolbarLeft = (
    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
      <div className="relative w-full md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Cari siswa (Nama/NIS)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-[11px] font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
        />
      </div>
      <div className="w-full md:w-56">
        <SearchableSelect
          triggerClassName="h-9 text-[11px] font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
          value={filterKelas}
          onValueChange={setFilterKelas}
          options={[{ value: 'all', label: 'Semua Kelas' }, ...(kelasList?.map(k => ({ value: k.id, label: k.nama_kelas })) || [])]}
          placeholder="Filter Kelas"
        />
      </div>
    </div>
  );

  const toolbarRight = (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <div className="h-9 px-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl mr-2">
        <CheckSquare size={14} className={selectedSiswa.length > 0 ? "text-orange-500" : "text-slate-300"} />
        <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">
          {selectedSiswa.length} Terpilih
        </span>
      </div>

      <Button
        variant="toolbarOutline"
        size="toolbar"
        onClick={openMutationModal}
        disabled={selectedSiswa.length === 0}
        className={selectedSiswa.length > 0 ? 'text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30 bg-orange-50/30' : ''}
      >
        <LogOut className="w-3.5 h-3.5 mr-1.5" />
        Mutasi
      </Button>

      <Button
        variant="toolbarPrimary"
        size="toolbar"
        onClick={openGraduationModal}
        disabled={selectedSiswa.length === 0}
      >
        <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
        Luluskan
      </Button>

      <Button
        variant="toolbarOutline"
        size="toolbarIcon"
        onClick={() => fetchSiswa(currentPage)}
        title="Refresh Data"
        disabled={loading}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );

  return (
    <AcademicPageLayout
      title="Mutasi Siswa"
      description="Kelola siswa pindah, drop out, atau dinonaktifkan. Digunakan kapan saja (ad-hoc) jika ada siswa keluar dari sekolah."
      canView={canView}
      isLoading={authLoading}
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={breadcrumbs}
      instruction={{
        title: "Panduan Mutasi Siswa",
        description: (
          <div className="space-y-2">
            <p>Kelola perubahan status siswa di luar transisi kenaikan kelas reguler.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengelola siswa yang keluar dari sekolah secara individual atau kelompok di tengah-tengah tahun ajaran berjalan.</p>
              <p><strong>Waktu Penggunaan:</strong> Kapan saja (ad-hoc) ketika ada kasus siswa keluar, pindah, atau drop out.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Pilih satu atau beberapa siswa untuk memulai proses mutasi." },
          { text: "Status LULUS hanya digunakan untuk siswa tingkat akhir." },
          { text: "Halaman Transisi Akademik digunakan untuk kenaikan kelas massal." }
        ]
      }}
      hardeningModuleKey="studentmutationpage"
    >
      <SectionCard
        fullWidth
        noPadding
        className="overflow-hidden"
      >
        <div className="flex flex-col">
          <div className="px-6 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">PENTING: Gunakan fitur "Transisi Akademik" untuk kenaikan kelas reguler akhir semester.</span>
          </div>

          <div className="bg-transparent">
            <Table
              columns={columns}
              data={siswaList}
              loading={loading}
              emptyMessage="Tidak ada data siswa aktif yang ditemukan."
              compact={true}
              selectedRowKeys={new Set(selectedSiswa)}
              onSelectedRowKeysChange={(keys) => setSelectedSiswa(Array.from(keys))}
              toolbarLeft={toolbarLeft}
              toolbarRight={toolbarRight}
              pagination={{
                currentPage,
                totalPages,
                totalItems: stats?.total_siswa || siswaList.length,
                itemsPerPage,
                onLimitChange: (limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                },
                onPageChange: fetchSiswa,
              }}
            />
          </div>
        </div>
      </SectionCard>

      {/* Mutation Modal */}
      <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader size="lg" /></div>}>
        <Modal 
          isOpen={isMutationModalOpen} 
          onClose={() => setIsMutationModalOpen(false)} 
          title={
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600">
                <LogOut size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Proses Mutasi Siswa</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Student Academic Status</p>
              </div>
            </div>
          }
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 flex items-center gap-3">
              <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-orange-600 shadow-sm font-black text-lg">
                {selectedSiswa.length}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Siswa Terpilih</p>
                <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-black">Siap untuk diproses perubahan statusnya</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Jenis Mutasi / Keluar</Label>
                <SearchableSelect 
                  triggerClassName="h-10 rounded-xl" 
                  value={mutationStatus} 
                  onValueChange={setMutationStatus} 
                  options={[
                    { label: 'Pindah Sekolah', value: 'PINDAH' }, 
                    { label: 'Undur Diri (Keluar)', value: 'KELUAR' }, 
                    { label: 'Dikeluarkan (DO)', value: 'DO' }, 
                    { label: 'Meninggal Dunia', value: 'MENINGGAL' }
                  ]} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tanggal Efektif</Label>
                <Input type="date" value={mutationDate} onChange={e => setMutationDate(e.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alasan / Keterangan <span className="text-red-500">*</span></Label>
              <Textarea 
                placeholder="Berikan alasan detail mutasi atau nomor surat pindah..." 
                value={mutationReason} 
                onChange={e => setMutationReason(e.target.value)} 
                rows={3} 
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800 focus:ring-orange-500" 
              />
            </div>

            <ModalFooter className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setIsMutationModalOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
              <Button 
                variant="danger" 
                onClick={() => handleExecute('MUTATION')} 
                disabled={executing || !mutationReason}
                className="rounded-xl px-10 shadow-lg shadow-red-100 dark:shadow-none"
              >
                {executing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <LogOut className="mr-2" size={16} />}
                Konfirmasi Mutasi
              </Button>
            </ModalFooter>
          </div>
        </Modal>

        {/* Graduation Modal */}
        <Modal 
          isOpen={isGraduationModalOpen} 
          onClose={() => setIsGraduationModalOpen(false)} 
          title={
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Proses Kelulusan Massal</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End of Academic Lifecycle</p>
              </div>
            </div>
          }
          size="md"
        >
          <div className="space-y-6">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4">
              <div className="h-12 w-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm font-black text-xl border-2 border-emerald-100">
                {selectedSiswa.length}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Siswa akan Diluluskan</p>
                <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-black">Data akan dipindahkan ke arsip alumni</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tanggal Kelulusan (Ijazah/SKL)</Label>
              <Input type="date" value={mutationDate} onChange={e => setMutationDate(e.target.value)} className="h-11 rounded-xl font-bold" />
            </div>

            <Alert className="bg-amber-50/50 border-amber-100 rounded-xl py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[10px] font-bold text-amber-700 leading-normal ml-1">
                Tindakan ini permanen. Siswa yang diluluskan tidak dapat lagi melakukan absensi harian dan statusnya akan berubah menjadi TIDAK AKTIF (LULUS).
              </AlertDescription>
            </Alert>

            <ModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setIsGraduationModalOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Batal</Button>
              <Button 
                onClick={() => handleExecute('GRADUATION')} 
                disabled={executing}
                className="rounded-xl px-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 dark:shadow-none"
              >
                {executing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <CheckSquare className="mr-2" size={16} />}
                Luluskan Sekarang
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
};

export default StudentMutationPage;
