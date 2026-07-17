import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, SectionCard, Modal } from '../../../components/ui';
import { getSiswaList, mapPpdbStudents, importSiswaFromExcel } from '../../../api/academic/siswa.api';
import { getJurusanForDropdown, getKelasForDropdown } from '../../../api/dropdown.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import type { Siswa } from '../../../types/academic';
import { Search, GraduationCap, UserCheck, AlertCircle, RefreshCw, FileSpreadsheet, Download, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateStandardFilename } from '../../../utils/file-download.utils';
import { generateImportTemplate } from '../../../utils/export.utils';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

const ExcelImportModal = lazy(() => import('../../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const Loader = lazy(() => import('../../../components/ui/Loader').then(module => ({ default: module.Loader })));

interface ProfileResponse {
  success: boolean;
  data?: {
    jenjang?: string;
  };
  jenjang?: string;
}

interface DropdownOption {
  value: string;
  label: string;
  jurusan_id?: string | null;
  tingkat?: number | null;
  siswa_count?: number;
  Jurusan?: {
    id: string;
    nama?: string;
  };
}

// Zod Schema Validation Guard for Student-to-Class Mapping
const mappingSchema = z.object({
  siswaIds: z.array(z.string().uuid('ID siswa tidak valid')).min(1, 'Pilih minimal satu siswa untuk dipetakan'),
  kelasId: z.string().uuid('Pilih kelas tujuan yang valid')
});

const PpdbMappingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  
  // Data lists
  const [calonList, setCalonList] = useState<Siswa[]>([]);
  const [jurusans, setJurusans] = useState<{ value: string; label: string }[]>([]);
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string; jurusan_id?: string | null; tingkat?: number | null; siswa_count?: number }[]>([]);
  
  // Filter & selections
  const [isSmkMak, setIsSmkMak] = useState(false);
  const [selectedJurusan, setSelectedJurusan] = useState<string>('all');
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([]);
  const [targetKelasId, setTargetKelasId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Fetch metadata (Sekolah, Jurusan, Kelas)
  const fetchMetadata = useCallback(async () => {
    try {
      const [sekolahRes, jurusanList, allKelas] = await Promise.all([
        sekolahApi.getProfile(),
        getJurusanForDropdown(),
        getKelasForDropdown()
      ]);

      const rawSekolah = (sekolahRes as ProfileResponse)?.data || sekolahRes;
      const jenjang = rawSekolah?.jenjang?.toUpperCase() || '';
      const smk = ['SMK', 'MAK'].includes(jenjang) || (jurusanList && (jurusanList as DropdownOption[]).length > 0);
      setIsSmkMak(smk);

      setJurusans(jurusanList as DropdownOption[]);
      
      const mappedKelas = (allKelas as DropdownOption[])?.map(k => ({
        value: k.value,
        label: k.label,
        jurusan_id: k.jurusan_id || k.Jurusan?.id || null,
        tingkat: k.tingkat || null,
        siswa_count: k.siswa_count || 0
      }));
      setKelasOptions(mappedKelas);

    } catch (err) {
      console.error('Failed to load metadata:', err);
      toast.error('Gagal memuat data referensi');
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // 2. Fetch CALON students
  const fetchCalonStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSiswaList(1, 1000, '', '', 'CALON');
      setCalonList(res.data || []);
    } catch (err) {
      console.error('Failed to load calon students:', err);
      toast.error('Gagal memuat data siswa PPDB');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalonStudents();
  }, [fetchCalonStudents]);

  // 3. Filter students based on selected jurusan & search term
  const filteredSiswa = useMemo(() => {
    const list = calonList.filter(s => {
      const matchSearch = searchTerm
        ? s.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      
      const matchJurusan = isSmkMak
        ? selectedJurusan === 'all'
          ? true
          : selectedJurusan === 'none'
            ? !s.jurusan_id
            : s.jurusan_id === selectedJurusan
        : true;

      return matchSearch && matchJurusan;
    });

    return [...list].sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));
  }, [calonList, selectedJurusan, searchTerm, isSmkMak]);

  // 4. Filter target classes based on selected jurusan & tingkat 10
  const filteredKelasOptions = useMemo(() => {
    let result = kelasOptions;
    
    // Filter by tingkat 10
    result = result.filter(k => k.tingkat === 10);

    if (!isSmkMak || selectedJurusan === 'all') {
      return result;
    }
    if (selectedJurusan === 'none') {
      return result.filter(k => !k.jurusan_id);
    }
    return result.filter(k => k.jurusan_id === selectedJurusan);
  }, [kelasOptions, selectedJurusan, isSmkMak]);

  // Dropdown options formatted dynamically with counts
  const jurusanOptions = useMemo(() => [
    { label: `Semua Jurusan (${calonList?.length || 0})`, value: 'all' },
    ...(jurusans?.map(j => ({
      label: `${j.label} (${calonList?.filter(s => s.jurusan_id === j.value)?.length || 0})`,
      value: j.value
    })) || []),
    { label: `Tanpa Jurusan (Belum diisi) (${calonList?.filter(s => !s.jurusan_id)?.length || 0})`, value: 'none' }
  ], [jurusans, calonList]);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, studentId: string) => {
    let targets = [...selectedSiswa];
    if (!targets.includes(studentId)) {
      targets = [studentId];
      setSelectedSiswa([studentId]);
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(targets));
    setDraggingIds(targets);
    e.dataTransfer.effectAllowed = 'move';
  }, [selectedSiswa]);

  const handleDragEnd = useCallback(() => {
    setDraggingIds([]);
    setActiveDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((kelasId: string) => {
    setActiveDropTarget(kelasId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setActiveDropTarget(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, kelasId: string) => {
    e.preventDefault();
    setActiveDropTarget(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const studentIds = JSON.parse(dataStr) as string[];
      if (studentIds.length === 0) return;

      setSubmitLoading(true);
      const res = await mapPpdbStudents(studentIds, kelasId);
      if (res.success) {
        toast.success(`Berhasil memetakan ${studentIds.length} siswa ke rombel!`);
        setSelectedSiswa([]);
        await Promise.all([fetchCalonStudents(), fetchMetadata()]);
      } else {
        toast.error(res.message || 'Gagal memetakan siswa');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memetakan siswa';
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
      setDraggingIds([]);
    }
  }, [fetchCalonStudents, fetchMetadata]);

  // Handle select all checkbox
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSiswa(filteredSiswa?.map(s => s.id) || []);
    } else {
      setSelectedSiswa([]);
    }
  }, [filteredSiswa]);

  // Handle single student checkbox selection
  const handleSelectStudent = useCallback((siswaId: string, checked: boolean) => {
    if (checked) {
      setSelectedSiswa(prev => [...prev, siswaId]);
    } else {
      setSelectedSiswa(prev => prev.filter(id => id !== siswaId));
    }
  }, []);

  // Perform bulk mapping submit protected by Zod Validation Guard
  const handleMapStudents = useCallback(async () => {
    const validation = mappingSchema.safeParse({
      siswaIds: selectedSiswa,
      kelasId: targetKelasId
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await mapPpdbStudents(selectedSiswa, targetKelasId);
      if (res.success) {
        toast.success(`Berhasil memetakan ${selectedSiswa.length} siswa ke rombel!`);
        setSelectedSiswa([]);
        setTargetKelasId('');
        setMappingModalOpen(false);
        await Promise.all([fetchCalonStudents(), fetchMetadata()]);
      } else {
        toast.error(res.message || 'Gagal memetakan siswa');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memetakan siswa';
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  }, [selectedSiswa, targetKelasId, fetchCalonStudents, fetchMetadata]);

  const handleOpenImport = useCallback(() => setImportOpen(true), []);
  const handleCloseImport = useCallback(() => setImportOpen(false), []);

  const handleTemplateDownload = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      toast('Menyiapkan template...');
      const jurusanNames = jurusans?.map(j => String(j.label)).filter(Boolean) || [];

      const columns = [
        { header: 'Nama Lengkap', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.nama_siswa), width: 30, required: true },
        ...(isSmkMak ? [{ header: 'Jurusan', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.jurusan), width: 25, required: true }] : []),
        { header: 'NIS', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.nis), width: 15, required: false },
        { header: 'NISN', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.nisn), width: 15, required: false },
        { header: 'NIK', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.nik), width: 20, required: false },
        { header: 'Jenis Kelamin (L/P)', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.jenis_kelamin), width: 18, required: false },
        { header: 'Tempat Lahir', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.tempat_lahir), width: 20, required: false },
        { header: 'Tanggal Lahir (YYYY-MM-DD)', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.tanggal_lahir), width: 25, required: false },
        { header: 'Alamat', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.alamat), width: 35, required: false },
        { header: 'No. HP', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.no_hp), width: 15, required: false },
        { header: 'Email', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.email), width: 25, required: false },
        { header: 'Nama Ayah', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.nama_ayah), width: 25, required: false },
        { header: 'Nama Ibu', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.nama_ibu), width: 25, required: false },
        { header: 'Status', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.status), width: 15, required: false },
        { header: 'No. RFID', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.no_rfid), width: 15, required: false },
        { header: 'Sekolah Asal', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.sekolah_asal), width: 25, required: false },
        { header: 'No. Seri Ijazah SMP', accessor: (row: Record<string, string | number | boolean | null | undefined>) => String(row.no_ijazah_smp), width: 25, required: false }
      ];

      const sampleData = [
        {
          nama_siswa: 'Budi Santoso',
          jurusan: jurusanNames[0] || 'Teknik Otomasi Industri',
          nis: '242510001',
          nisn: '0081234567',
          nik: '3201020304050001',
          jenis_kelamin: 'L',
          tempat_lahir: 'Bandung',
          tanggal_lahir: '2010-05-15',
          alamat: 'Jl. Merdeka No. 10',
          no_hp: '081234567890',
          email: 'budi@example.com',
          nama_ayah: 'Agus Santoso',
          nama_ibu: 'Siti Rahma',
          status: 'CALON',
          no_rfid: 'RF000123',
          sekolah_asal: 'SMPN 1 Bandung',
          no_ijazah_smp: 'DN-01/D-SMP/21/0000001'
        }
      ];

      const filename = generateStandardFilename('template_import_siswa_ppdb', 'xlsx').replace('.xlsx', '');
      const instructionText = `Kolom BERWARNA EMAS wajib diisi. ${
        isSmkMak 
          ? 'Isi kolom JURUSAN (wajib bagi SMK) dan set status ke CALON.' 
          : 'Set status ke CALON.'
      } JK (Jenis Kelamin): Isi L untuk Laki-laki, P untuk Perempuan. Format Tanggal Lahir (jika diisi): YYYY-MM-DD (Contoh: 2010-06-12).`;

      generateImportTemplate(
        columns,
        sampleData,
        filename,
        instructionText
      );

      toast.success('Template cerdas berhasil diunduh.');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Gagal mengunduh template';
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  }, [isSmkMak, jurusans, isExporting]);

  const handleImportSiswa = useCallback(async (file: File, onProgress: (p: number) => void, socketId?: string) => {
    return importSiswaFromExcel(file, onProgress, socketId, { status: 'CALON' });
  }, []);

  const pageStats = useMemo(() => [
    {
      title: "Siswa PPDB (Calon)",
      value: calonList?.length || 0,
      icon: <GraduationCap size={14} />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: "Menunggu pemetaan kelas"
    },
    {
      title: "Siswa Terpilih",
      value: selectedSiswa?.length || 0,
      icon: <UserCheck size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Akan dipetakan ke rombel"
    }
  ], [calonList?.length, selectedSiswa?.length]);

  return (
    <AcademicPageLayout
      title="Pemetaan PPDB ke Rombel"
      subtitle="Petakan siswa baru hasil PPDB ke rombel (kelas) secara massal"
      stats={pageStats}
      hardeningModuleKey="academic_ppdb_mapping"
      instruction={{
        title: "Panduan Pemetaan PPDB",
        description: (
          <div className="space-y-2">
            <p>Pilih calon siswa di tabel sebelah kiri dan seret ke kelas target di kanan, atau gunakan tombol wizard.</p>
          </div>
        ),
        items: [
          { text: "Pilih calon siswa di tabel sebelah kiri." },
          { text: "Seret ke kelas target di kanan, atau gunakan tombol wizard." }
        ]
      }}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Siswa', path: '/academic/siswa' },
        { label: 'Pemetaan PPDB', path: '/academic/ppdb-mapping' }
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Filter and Student Table List */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard 
            title="Daftar Calon Siswa (Seret baris siswa terpilih ke kelas tujuan)"
            fullWidth={true}
            {...{
              toolbarLeft: null,
              toolbarRight: null
            }}
          >
            
            {/* Unified Toolbar above the Table */}
            <div className="space-y-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              
              {/* Row 1: Primary Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Aksi & Impor Calon Siswa
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTemplateDownload}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <Download size={13} />
                    <span>Format Excel</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenImport}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-500/15"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Impor Excel PPDB</span>
                  </Button>
                  {selectedSiswa?.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setMappingModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-500/15 animate-in fade-in zoom-in duration-200"
                    >
                      <UserCheck size={13} />
                      <span>Petakan ({selectedSiswa?.length} Siswa)</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Row 2: Filters & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NIS calon siswa..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    aria-label="Cari nama atau NIS calon siswa"
                    className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 outline-none"
                  />
                </div>

                {isSmkMak && (
                  <SearchableSelect
                    value={selectedJurusan}
                    onValueChange={(val) => {
                      setSelectedJurusan(val);
                      setSelectedSiswa([]);
                    }}
                    options={jurusanOptions}
                    placeholder="Filter Jurusan..."
                    disabled={loading}
                    className="w-full md:w-[380px]"
                  />
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCalonStudents}
                  disabled={loading}
                  className="flex items-center gap-2 self-start md:self-auto"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
              </div>

            </div>

            {/* Students Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              {loading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-indigo-600" />
                  <span>Memuat data calon siswa...</span>
                </div>
              ) : filteredSiswa?.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <AlertCircle size={24} className="text-slate-300" />
                  <span>Tidak ada calon siswa ditemukan.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4 w-16 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={filteredSiswa?.length > 0 && selectedSiswa?.length === filteredSiswa?.length}
                          onChange={handleSelectAll}
                          aria-label="Pilih semua calon siswa"
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Nama Lengkap</th>
                      {isSmkMak && <th className="py-3 px-4 whitespace-nowrap">Jurusan PPDB</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                    {filteredSiswa?.map(s => (
                      <tr 
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, s.id)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-slate-50/70 transition-colors duration-150 cursor-grab active:cursor-grabbing ${
                          selectedSiswa?.includes(s.id) ? 'bg-indigo-50/30' : ''
                        }`}
                        onClick={() => handleSelectStudent(s.id, !selectedSiswa?.includes(s.id))}
                      >
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="text-slate-350 cursor-grab hover:text-slate-500 mr-0.5">
                              <GripVertical size={14} />
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedSiswa?.includes(s.id)}
                              onChange={e => handleSelectStudent(s.id, e.target.checked)}
                              aria-label={`Pilih ${s.nama_siswa}`}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{s.nama_siswa}</td>
                        {isSmkMak && (
                          <td className="py-3 px-4 whitespace-nowrap">
                            {s.Jurusan?.nama ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600">
                                {s.Jurusan.nama}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                Tanpa Jurusan
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="mt-4 text-xs text-slate-400">
              Menampilkan {filteredSiswa?.length || 0} dari {calonList?.length || 0} total calon siswa.
            </div>

          </SectionCard>
        </div>

        {/* Right Column: Rombel / Kelas drop targets */}
        <div className="space-y-6">
          <SectionCard 
            title="Daftar Rombel / Kelas (Tingkat 10)" 
            subtitle={isSmkMak && selectedJurusan !== 'all' ? "Difilter berdasarkan Jurusan" : "Semua kelas tingkat 10"}
            fullWidth={true}
          >
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredKelasOptions?.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/20">
                  <AlertCircle size={20} className="text-slate-300" />
                  <span className="text-xs">Tidak ada kelas tingkat 10 yang cocok.</span>
                </div>
              ) : (
                filteredKelasOptions?.map(k => {
                  const isOver = activeDropTarget === k.value;
                  const isDragging = draggingIds?.length > 0;
                  
                  return (
                    <div
                      key={k.value}
                      onDragOver={handleDragOver}
                      onDragEnter={() => handleDragEnter(k.value)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, k.value)}
                      className={`relative border rounded-xl p-4 transition-all duration-200 flex flex-col gap-2 cursor-default ${
                        isOver
                          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-md shadow-indigo-500/10'
                          : isDragging
                          ? 'border-dashed border-indigo-300 bg-indigo-50/10 animate-pulse'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900 text-sm sm:text-base">
                          {k.label?.split(' - ')[0]}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Tingkat 10
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <span>Jumlah Siswa:</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {k.siswa_count || 0} siswa
                        </span>
                      </div>

                      {/* Drop Visual Helper */}
                      {isDragging && (
                        <div className={`mt-2 py-2 border border-dashed rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors ${
                          isOver 
                            ? 'border-indigo-400 bg-indigo-100 text-indigo-700 font-medium' 
                            : 'border-slate-200 text-slate-400'
                        }`}>
                          <GraduationCap size={14} className={isOver ? 'animate-bounce' : ''} />
                          <span>{isOver ? 'Lepas untuk memetakan!' : 'Drop di sini'}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>

      </div>

      {/* Mapping Wizard Modal */}
      <Modal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        title="Pemetaan Kelas / Rombel Siswa Baru"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle size={14} />
              <span>Informasi Pemetaan</span>
            </div>
            <p>
              Sebanyak <strong>{selectedSiswa?.length} siswa</strong> yang terpilih akan dipindahkan statusnya menjadi <strong>AKTIF</strong>, dikaitkan ke kelas tujuan, dan didaftarkan ke semester/tahun pelajaran aktif secara otomatis.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="target-kelas-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Pilih Kelas Tujuan
              </label>
              <SearchableSelect
                id="target-kelas-select"
                value={targetKelasId}
                onValueChange={(val) => setTargetKelasId(val)}
                options={filteredKelasOptions?.map(k => ({
                  label: k.label,
                  value: k.value
                })) || []}
                placeholder="-- Pilih Kelas Target --"
                disabled={submitLoading}
                className="w-full"
              />
            </div>

            {/* Selected Students Scrollable List */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Daftar Siswa yang Akan Dipetakan ({selectedSiswa?.length || 0})
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2 divide-y divide-slate-50 bg-slate-50/30 scrollbar-thin">
                {calonList
                  ?.filter(s => selectedSiswa?.includes(s.id))
                  ?.map(s => (
                    <div key={s.id} className="py-1.5 px-2 text-xs font-medium text-slate-700 flex justify-between">
                      <span>{s.nama_siswa}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {s.nisn || s.nis || '-'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMappingModalOpen(false)}
              disabled={submitLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleMapStudents}
              disabled={submitLoading || !targetKelasId}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-4 rounded-lg text-sm shadow-md border-none"
            >
              {submitLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <UserCheck size={14} />
                  <span>Proses Pemetaan</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
        <ExcelImportModal
          isOpen={importOpen}
          onClose={handleCloseImport}
          title="Import Calon Siswa (PPDB)"
          onImport={handleImportSiswa}
          onDownloadTemplate={handleTemplateDownload}
          onSuccess={() => {
            fetchCalonStudents();
          }}
          sampleDataHint="Tips: Pastikan format kolom status adalah 'CALON' atau biarkan kosong agar otomatis terbaca sebagai calon siswa PPDB."
        />
      </Suspense>
    </AcademicPageLayout>
  );
};

export default PpdbMappingPage;
