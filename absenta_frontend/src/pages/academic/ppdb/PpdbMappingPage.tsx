import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, SectionCard } from '../../../components/ui';
import { getSiswaList, mapPpdbStudents, downloadSiswaImportTemplate, importSiswaFromExcel } from '../../../api/academic/siswa.api';
import { getJurusanForDropdown, getKelasForDropdown } from '../../../api/dropdown.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import type { Siswa } from '../../../types/academic';
import { Search, GraduationCap, ChevronRight, UserCheck, AlertCircle, RefreshCw, FileSpreadsheet, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadFileFromBlob, generateStandardFilename } from '../../../utils/file-download.utils';

const ExcelImportModal = lazy(() => import('../../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const Loader = lazy(() => import('../../../components/ui/Loader').then(module => ({ default: module.Loader })));

const PpdbMappingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  
  // Data lists
  const [calonList, setCalonList] = useState<Siswa[]>([]);
  const [jurusans, setJurusans] = useState<{ value: string; label: string }[]>([]);
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string[]; jurusan_id?: string | null }[]>([]);
  
  // Filter & selections
  const [isSmkMak, setIsSmkMak] = useState(false);
  const [selectedJurusan, setSelectedJurusan] = useState<string>('all');
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([]);
  const [targetKelasId, setTargetKelasId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Fetch metadata (Sekolah, Jurusan, Kelas)
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const [sekolahRes, jurusanList, allKelas] = await Promise.all([
          sekolahApi.getProfile(),
          getJurusanForDropdown(),
          getKelasForDropdown()
        ]);

        const jenjang = (sekolahRes as any)?.jenjang?.toUpperCase() || '';
        const smk = ['SMK', 'MAK'].includes(jenjang);
        setIsSmkMak(smk);

        setJurusans(jurusanList);
        
        // Map kelas options
        const mappedKelas = (allKelas as any[]).map(k => ({
          value: k.value,
          label: k.label,
          jurusan_id: k.jurusan_id || k.Jurusan?.id || null
        }));
        setKelasOptions(mappedKelas);

      } catch (err) {
        console.error('Failed to load metadata:', err);
        toast.error('Gagal memuat data referensi');
      } finally {
        setLoading(false);
      }
    };

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

  // 4. Filter target classes based on selected jurusan
  const filteredKelasOptions = useMemo(() => {
    if (!isSmkMak || selectedJurusan === 'all' || selectedJurusan === 'none') {
      return kelasOptions;
    }
    return kelasOptions.filter(k => k.jurusan_id === selectedJurusan);
  }, [kelasOptions, selectedJurusan, isSmkMak]);

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
        // Refresh list
        await fetchCalonStudents();
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
      toast('Mengunduh template...');
      const blob = await downloadSiswaImportTemplate();
      downloadFileFromBlob(blob, generateStandardFilename('template_import_siswa_ppdb', 'xlsx'));
      toast.success('Template berhasil diunduh');
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
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Siswa', path: '/academic/siswa' },
        { label: 'Pemetaan PPDB', path: '/academic/ppdb-mapping' }
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Filter and Student Table List */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Daftar Calon Siswa">
            
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
                    <option value="all">Semua Jurusan</option>
                    {jurusans.map(j => (
                      <option key={j.value} value={j.value}>{j.label}</option>
                    ))}
                    <option value="none">Tanpa Jurusan (Belum diisi)</option>
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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredSiswa.length > 0 && selectedSiswa.length === filteredSiswa.length}
                          onChange={handleSelectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">NIS / NISN</th>
                      {isSmkMak && <th className="py-3 px-4">Jurusan PPDB</th>}
                      <th className="py-3 px-4">Gender</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                    {filteredSiswa.map(s => (
                      <tr 
                        key={s.id}
                        className={`hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer ${
                          selectedSiswa.includes(s.id) ? 'bg-indigo-50/30' : ''
                        }`}
                        onClick={() => handleSelectStudent(s.id, !selectedSiswa.includes(s.id))}
                      >
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedSiswa.includes(s.id)}
                            onChange={e => handleSelectStudent(s.id, e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{s.nama_siswa}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {s.nis || '-'}{s.nisn ? ` / ${s.nisn}` : ''}
                        </td>
                        {isSmkMak && (
                          <td className="py-3 px-4">
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
                        <td className="py-3 px-4 text-slate-500">{s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
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

        {/* Right Side: Mapping Settings Action Panel */}
        <div className="space-y-6">
          <SectionCard title="Pemetaan Kelas">
            <div className="space-y-6">
              
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle size={14} />
                  <span>Informasi Pemetaan</span>
                </div>
                <p>
                  Siswa yang terpilih akan dipindahkan statusnya menjadi <strong>AKTIF</strong>, dikaitkan ke kelas tujuan, dan didaftarkan ke semester/tahun pelajaran aktif secara otomatis.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    1. Kelas Tujuan
                  </label>
                  <select
                    value={targetKelasId}
                    onChange={e => setTargetKelasId(e.target.value)}
                    disabled={submitLoading || loading}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-50"
                  >
                    <option value="">-- Pilih Kelas Target --</option>
                    {filteredKelasOptions.map(k => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                  {isSmkMak && selectedJurusan !== 'all' && (
                    <p className="mt-1 text-xs text-slate-400">
                      Pilihan kelas difilter berdasarkan Jurusan yang dipilih pada filter siswa.
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                    <span>Siswa dipilih:</span>
                    <span className="font-bold text-slate-900">{selectedSiswa.length} siswa</span>
                  </div>

                  <Button
                    onClick={handleMapStudents}
                    disabled={submitLoading || loading || selectedSiswa.length === 0 || !targetKelasId}
                    className="w-full flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200"
                  >
                    {submitLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Memproses Pemetaan...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={16} />
                        <span>Petakan ke Rombel</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

            </div>
          </SectionCard>
        </div>

      </div>

      <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
        <ExcelImportModal
          isOpen={importOpen}
          onClose={handleCloseImport}
          title="Import Calon Siswa (PPDB)"
          onImport={handleImportSiswa}
          onDownloadTemplate={handleTemplateDownload}
          onSuccess={() => {
            handleCloseImport();
            fetchCalonStudents();
          }}
          sampleDataHint="Tips: Pastikan format kolom status adalah 'CALON' atau biarkan kosong agar otomatis terbaca sebagai calon siswa PPDB."
        />
      </Suspense>
    </AcademicPageLayout>
  );
};

export default PpdbMappingPage;
