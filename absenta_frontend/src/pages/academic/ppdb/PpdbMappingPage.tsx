import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, SectionCard, Modal } from '../../../components/ui';
import { getSiswaList, mapPpdbStudents, downloadSiswaImportTemplate, importSiswaFromExcel } from '../../../api/academic/siswa.api';
import { getJurusanForDropdown, getKelasForDropdown } from '../../../api/dropdown.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import type { Siswa } from '../../../types/academic';
import { Search, GraduationCap, ChevronRight, UserCheck, AlertCircle, RefreshCw, FileSpreadsheet, Download, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadFileFromBlob, generateStandardFilename } from '../../../utils/file-download.utils';
import { generateAdvancedTemplate } from '../../../utils/excel-advanced.utils';

const ExcelImportModal = lazy(() => import('../../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const Loader = lazy(() => import('../../../components/ui/Loader').then(module => ({ default: module.Loader })));

const PpdbMappingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
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
  const fetchMetadata = async () => {
    try {
      const [sekolahRes, jurusanList, allKelas] = await Promise.all([
        sekolahApi.getProfile(),
        getJurusanForDropdown(),
        getKelasForDropdown()
      ]);

      const rawSekolah = (sekolahRes as any)?.data || sekolahRes;
      const jenjang = rawSekolah?.jenjang?.toUpperCase() || '';
      const smk = ['SMK', 'MAK'].includes(jenjang) || (jurusanList && (jurusanList as any[]).length > 0);
      setIsSmkMak(smk);

      setJurusans(jurusanList);
      
      const mappedKelas = (allKelas as any[]).map(k => ({
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
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  // 2. Fetch CALON students
  const fetchCalonStudents = async () => {
    setLoading(true);
    try {
      // Fetch maximum 1000 calon students for bulk mapping
      const res = await getSiswaList(1, 1000, '', '', 'CALON');
      setCalonList(res.data || []);
    } catch (err) {
      console.error('Failed to load calon students:', err);
      toast.error('Gagal memuat data siswa PPDB');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalonStudents();
  }, []);

  // 3. Filter students based on selected jurusan & search term
  const filteredSiswa = useMemo(() => {
    return calonList.filter(s => {
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

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    // If the student is already checked, drag all checked students.
    // If not checked, select it and drag it alone.
    let targets = [...selectedSiswa];
    if (!targets.includes(studentId)) {
      targets = [studentId];
      setSelectedSiswa([studentId]);
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(targets));
    setDraggingIds(targets);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingIds([]);
    setActiveDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (kelasId: string) => {
    setActiveDropTarget(kelasId);
  };

  const handleDragLeave = () => {
    setActiveDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, kelasId: string) => {
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
        // Refresh list and metadata
        await Promise.all([fetchCalonStudents(), fetchMetadata()]);
      } else {
        toast.error(res.message || 'Gagal memetakan siswa');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memetakan siswa');
    } finally {
      setSubmitLoading(false);
      setDraggingIds([]);
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSiswa(filteredSiswa.map(s => s.id));
    } else {
      setSelectedSiswa([]);
    }
  };

  // Handle single student checkbox selection
  const handleSelectStudent = (siswaId: string, checked: boolean) => {
    if (checked) {
      setSelectedSiswa(prev => [...prev, siswaId]);
    } else {
      setSelectedSiswa(prev => prev.filter(id => id !== siswaId));
    }
  };

  // Perform bulk mapping submit
  const handleMapStudents = async () => {
    if (selectedSiswa.length === 0) {
      toast.error('Pilih minimal satu siswa untuk dipetakan');
      return;
    }
    if (!targetKelasId) {
      toast.error('Pilih kelas tujuan');
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
        // Refresh list and metadata
        await Promise.all([fetchCalonStudents(), fetchMetadata()]);
      } else {
        toast.error(res.message || 'Gagal memetakan siswa');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memetakan siswa');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenImport = () => setImportOpen(true);
  const handleCloseImport = () => setImportOpen(false);

  const handleTemplateDownload = async () => {
    try {
      toast('Menyiapkan template...');
      const jurusanNames = jurusans.map(j => String(j.label)).filter(Boolean);

      const columns = [
        { header: 'Nama Lengkap', key: 'nama_siswa', width: 30, required: true },
        ...(isSmkMak ? [{ header: 'Jurusan', key: 'jurusan', width: 25, required: true, dropdown: { refKey: 'jurusan' } }] : []),
        { header: 'NIS', key: 'nis', width: 15, required: false },
        { header: 'NISN', key: 'nisn', width: 15, required: false },
        { header: 'NIK', key: 'nik', width: 20, required: false },
        { header: 'Jenis Kelamin (L/P)', key: 'jenis_kelamin', width: 18, required: false, dropdown: { refKey: 'jk' } },
        { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20, required: false },
        { header: 'Tanggal Lahir (YYYY-MM-DD)', key: 'tanggal_lahir', width: 25, required: false },
        { header: 'Alamat', key: 'alamat', width: 35, required: false },
        { header: 'No. HP', key: 'no_hp', width: 15, required: false },
        { header: 'Email', key: 'email', width: 25, required: false },
        { header: 'Nama Ayah', key: 'nama_ayah', width: 25, required: false },
        { header: 'Nama Ibu', key: 'nama_ibu', width: 25, required: false },
        { header: 'Status', key: 'status', width: 15, required: false, dropdown: { refKey: 'status' } },
        { header: 'No. RFID', key: 'no_rfid', width: 15, required: false },
        { header: 'Sekolah Asal', key: 'sekolah_asal', width: 25, required: false },
        { header: 'No. Seri Ijazah SMP', key: 'no_ijazah_smp', width: 25, required: false }
      ];

      await generateAdvancedTemplate(
        columns,
        {
          fileName: generateStandardFilename('template_import_siswa_ppdb', 'xlsx'),
          instructions: [
            'Kolom BERWARNA EMAS wajib diisi.',
            isSmkMak 
              ? 'Isi kolom JURUSAN (wajib bagi SMK) dan set status ke CALON.' 
              : 'Set status ke CALON.',
            'JK (Jenis Kelamin): Isi L untuk Laki-laki, P untuk Perempuan.',
            'Format Tanggal Lahir (jika diisi): YYYY-MM-DD (Contoh: 2010-06-12).'
          ],
          referenceData: {
            jurusan: jurusanNames,
            jk: ['L', 'P'],
            status: ['CALON', 'AKTIF']
          }
        }
      );
      toast.success('Template cerdas berhasil diunduh.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh template');
    }
  };

  const handleImportSiswa = async (file: File, onProgress: (p: number) => void, socketId?: string) => {
    return importSiswaFromExcel(file, onProgress, socketId, { status: 'CALON' });
  };

  const pageStats = useMemo(() => [
    {
      title: "Siswa PPDB (Calon)",
      value: calonList.length,
      icon: <GraduationCap size={14} />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: "Menunggu pemetaan kelas"
    },
    {
      title: "Siswa Terpilih",
      value: selectedSiswa.length,
      icon: <UserCheck size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Akan dipetakan ke rombel"
    }
  ], [calonList.length, selectedSiswa.length]);

  return (
    <AcademicPageLayout
      title="Pemetaan PPDB ke Rombel"
      subtitle="Petakan siswa baru hasil PPDB ke rombel (kelas) secara massal"
      stats={pageStats}
      hardeningModuleKey="academic_ppdb_mapping"
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Siswa', path: '/academic/siswa' },
        { label: 'Pemetaan PPDB', path: '/academic/ppdb-mapping' }
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Filter and Student Table List */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Daftar Calon Siswa (Seret baris siswa terpilih ke kelas tujuan)">
            
            {/* PPDB Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
              <div className="text-sm font-medium text-slate-600">
                Penerimaan & Impor Calon Siswa
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTemplateDownload}
                  className="flex items-center gap-1.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Download size={13} />
                  <span>Format Excel</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenImport}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-500/15"
                >
                  <FileSpreadsheet size={13} />
                  <span>Impor Excel PPDB</span>
                </Button>
                {selectedSiswa.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setMappingModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-500/15 animate-in fade-in zoom-in duration-200"
                  >
                    <UserCheck size={13} />
                    <span>Petakan ({selectedSiswa.length} Siswa)</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS calon siswa..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 outline-none"
                />
              </div>

              {isSmkMak && (
                <div className="w-full md:w-64">
                  <select
                    value={selectedJurusan}
                    onChange={e => {
                      setSelectedJurusan(e.target.value);
                      setSelectedSiswa([]);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="all">Semua Jurusan ({calonList.length})</option>
                    {jurusans.map(j => {
                      const count = calonList.filter(s => s.jurusan_id === j.value).length;
                      return (
                        <option key={j.value} value={j.value}>
                          {j.label} ({count})
                        </option>
                      );
                    })}
                    <option value="none">
                      Tanpa Jurusan (Belum diisi) ({calonList.filter(s => !s.jurusan_id).length})
                    </option>
                  </select>
                </div>
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

            {/* Students Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              {loading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-indigo-600" />
                  <span>Memuat data calon siswa...</span>
                </div>
              ) : filteredSiswa.length === 0 ? (
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
                          checked={filteredSiswa.length > 0 && selectedSiswa.length === filteredSiswa.length}
                          onChange={handleSelectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Nama Lengkap</th>
                      {isSmkMak && <th className="py-3 px-4 whitespace-nowrap">Jurusan PPDB</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                    {filteredSiswa.map(s => (
                      <tr 
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, s.id)}
                        onDragEnd={handleDragEnd}
                        className={`hover:bg-slate-50/70 transition-colors duration-150 cursor-grab active:cursor-grabbing ${
                          selectedSiswa.includes(s.id) ? 'bg-indigo-50/30' : ''
                        }`}
                        onClick={() => handleSelectStudent(s.id, !selectedSiswa.includes(s.id))}
                      >
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <div className="text-slate-350 cursor-grab hover:text-slate-500 mr-0.5">
                            <GripVertical size={14} />
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedSiswa.includes(s.id)}
                            onChange={e => handleSelectStudent(s.id, e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
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
              Menampilkan {filteredSiswa.length} dari {calonList.length} total calon siswa.
            </div>

          </SectionCard>
        </div>

        {/* Right Column: Rombel / Kelas drop targets */}
        <div className="space-y-6">
          <SectionCard 
            title="Daftar Rombel / Kelas (Tingkat 10)" 
            subtitle={isSmkMak && selectedJurusan !== 'all' ? "Difilter berdasarkan Jurusan" : "Semua kelas tingkat 10"}
          >
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredKelasOptions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/20">
                  <AlertCircle size={20} className="text-slate-300" />
                  <span className="text-xs">Tidak ada kelas tingkat 10 yang cocok.</span>
                </div>
              ) : (
                filteredKelasOptions.map(k => {
                  const isOver = activeDropTarget === k.value;
                  const isDragging = draggingIds.length > 0;
                  const matchedJurusan = jurusans.find(j => j.value === k.jurusan_id);
                  
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
                          {k.label.split(' - ')[0]}
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
              Sebanyak <strong>{selectedSiswa.length} siswa</strong> yang terpilih akan dipindahkan statusnya menjadi <strong>AKTIF</strong>, dikaitkan ke kelas tujuan, dan didaftarkan ke semester/tahun pelajaran aktif secara otomatis.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Pilih Kelas Tujuan
              </label>
              <select
                value={targetKelasId}
                onChange={e => setTargetKelasId(e.target.value)}
                disabled={submitLoading}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-50"
              >
                <option value="">-- Pilih Kelas Target --</option>
                {filteredKelasOptions.map(k => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>

            {/* Selected Students Scrollable List */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Daftar Siswa yang Akan Dipetakan ({selectedSiswa.length})
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2 divide-y divide-slate-50 bg-slate-50/30 scrollbar-thin">
                {calonList
                  .filter(s => selectedSiswa.includes(s.id))
                  .map(s => (
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
