import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { raporApi } from '../../api/rapor.api';
import { kelasApi, mapelApi, tahunPelajaranApi } from '../../api/academic.api';
import { toast } from 'sonner';

export default function InputNilaiPage() {
  const queryClient = useQueryClient();

  // Filters State
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedJenisNilai, setSelectedJenisNilai] = useState('');
  const [selectedSesiKbm, setSelectedSesiKbm] = useState('');

  // Excel Import File State
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Scores Grid State
  const [scores, setScores] = useState<Array<{ siswa_id: string; nama_siswa: string; nis: string; nilai: number; catatan_deskripsi: string }>>([]);

  // Metadata Fetch
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll()
  });
  const activeYear = useMemo(() => (years?.data ?? []).find(y => y.is_active), [years]);
  const activeSemester = useMemo(() => activeYear?.Semester?.find((s: any) => s.is_active), [activeYear]);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => kelasApi.getAll()
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => mapelApi.getAll()
  });
  const { data: categories } = useQuery({
    queryKey: ['jenis-penilaian'],
    queryFn: () => raporApi.getJenisPenilaian()
  });

  // Fetch Existing Grades (to prepopulate or check)
  const { data: existingGrades, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['grades', selectedKelas, selectedMapel, selectedJenisNilai, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getNilas({
      kelas_id: selectedKelas,
      mapel_id: selectedMapel,
      jenis_nilai_id: selectedJenisNilai,
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!selectedKelas && !!selectedMapel && !!selectedJenisNilai && !!activeYear && !!activeSemester
  });

  // Prepopulate Scores Grid when filter changes or grades loaded
  useEffect(() => {
    if (existingGrades?.data) {
      const grid = existingGrades.data.map((item: any) => ({
        siswa_id: item.siswa_id,
        nama_siswa: item.Siswa?.nama_siswa || '',
        nis: item.Siswa?.nis || '',
        nilai: item.nilai ?? 0,
        catatan_deskripsi: item.catatan_deskripsi || ''
      }));
      setScores(grid);
    }
  }, [existingGrades]);

  // Mutations
  const bulkSaveMutation = useMutation({
    mutationFn: raporApi.upsertBulkNilai,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Nilai siswa sekelas berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai');
    }
  });

  const importExcelMutation = useMutation({
    mutationFn: raporApi.importNilaiExcel,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast.success(res.message || 'Excel berhasil diimpor');
      setExcelFile(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengimpor file Excel');
    }
  });

  const handleScoreChange = (index: number, field: 'nilai' | 'catatan_deskripsi', val: any) => {
    setScores(prev => {
      const clone = [...prev];
      if (field === 'nilai') {
        const num = Math.min(100, Math.max(0, parseInt(val) || 0));
        clone[index].nilai = num;
      } else {
        clone[index].catatan_deskripsi = val;
      }
      return clone;
    });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapel || !selectedJenisNilai) {
      toast.error('Pilih filter terlebih dahulu');
      return;
    }
    bulkSaveMutation.mutate({
      mapel_id: selectedMapel,
      tahun_pelajaran_id: activeYear!.id,
      semester_id: activeSemester!.id,
      jenis_nilai_id: selectedJenisNilai,
      sesi_absensi_id: selectedSesiKbm || null,
      scores: scores.map(s => ({
        siswa_id: s.siswa_id,
        nilai: s.nilai,
        catatan_deskripsi: s.catatan_deskripsi
      }))
    });
  };

  const handleDownloadTemplate = () => {
    if (!selectedKelas || !selectedMapel || !selectedJenisNilai) {
      toast.error('Pilih Kelas, Mapel, dan Kategori Penilaian terlebih dahulu untuk mengunduh template');
      return;
    }
    const url = raporApi.getTemplateExcelUrl({
      kelas_id: selectedKelas,
      mapel_id: selectedMapel,
      jenis_nilai_id: selectedJenisNilai
    });
    window.open(url, '_blank');
  };

  const handleImportExcelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile || !selectedMapel || !selectedJenisNilai) {
      toast.error('Pilih file Excel dan lengkapi kriteria filter');
      return;
    }
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('mapel_id', selectedMapel);
    formData.append('tahun_pelajaran_id', activeYear!.id);
    formData.append('semester_id', activeSemester!.id);
    formData.append('jenis_nilai_id', selectedJenisNilai);
    if (selectedSesiKbm) formData.append('sesi_absensi_id', selectedSesiKbm);

    importExcelMutation.mutate(formData);
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', href: '/rapor/dashboard' },
    { label: 'Input Nilai Siswa' }
  ], []);

  return (
    <AcademicPageLayout
      title="Input Nilai KBM & Rapor"
      description="Pencatatan nilai harian, ulangan, dan capaian kompetensi siswa kelas aktif."
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Filter Card */}
        <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center">
            <Layers size={14} className="mr-1.5" />
            Parameter Penilaian Kelas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">1. Kelas Rombel</label>
              <select
                value={selectedKelas}
                onChange={(e) => {
                  setSelectedKelas(e.target.value);
                  setScores([]);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Pilih Kelas</option>
                {classes?.data?.map((k: any) => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">2. Mata Pelajaran</label>
              <select
                value={selectedMapel}
                onChange={(e) => {
                  setSelectedMapel(e.target.value);
                  setScores([]);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Pilih Mapel</option>
                {subjects?.data?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">3. Kategori Penilaian</label>
              <select
                value={selectedJenisNilai}
                onChange={(e) => {
                  setSelectedJenisNilai(e.target.value);
                  setScores([]);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Pilih Kategori</option>
                {categories?.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nama} ({c.kode}) - Bobot {c.bobot}x</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">4. Sesi KBM Harian (Opsional)</label>
              <input
                type="text"
                placeholder="ID Sesi Absensi Pertemuan"
                value={selectedSesiKbm}
                onChange={(e) => setSelectedSesiKbm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </Card>

        {selectedKelas && selectedMapel && selectedJenisNilai && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Input Grid Nilai (Kiri) */}
            <Card className="lg:col-span-2 p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Lembar Pengisian Nilai Kelas</h3>
                  <p className="text-[11px] text-slate-400">Total siswa aktif di rombel kelas: {scores.length} siswa.</p>
                </div>
                <Button 
                  onClick={handleSaveSubmit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  SIMPAN PERUBAHAN
                </Button>
              </div>

              {isLoadingGrades ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">Menarik daftar siswa rombel...</div>
              ) : scores.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">Rombel kosong atau tidak ada siswa aktif.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                        <th className="py-2.5">Siswa</th>
                        <th className="py-2.5 w-24">Nilai (0-100)</th>
                        <th className="py-2.5">Capaian Kompetensi / Deskripsi Rapor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((score, index) => (
                        <tr key={score.siswa_id} className="border-b border-slate-50 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {score.nama_siswa}
                            <span className="block text-[9px] text-slate-400 font-normal">NIS. {score.nis}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={score.nilai}
                              onChange={(e) => handleScoreChange(index, 'nilai', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black text-center p-2.5 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-3">
                            <input
                              type="text"
                              placeholder="Deskripsi pencapaian kompetensi dalam rapor..."
                              value={score.catatan_deskripsi}
                              onChange={(e) => handleScoreChange(index, 'catatan_deskripsi', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-medium p-2.5 text-slate-700 dark:text-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Impor & Ekspor Excel (Kanan) */}
            <div className="space-y-6">
              <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center">
                  <FileSpreadsheet size={18} className="mr-2 text-indigo-500" />
                  Impor & Ekspor Excel
                </h3>
                <p className="text-xs text-slate-450 leading-relaxed font-medium">
                  Anda dapat mengunduh berkas template kosong rombel ini, mengisi nilainya di komputer lokal secara offline, lalu mengunggahnya kembali.
                </p>

                <div className="pt-2 space-y-3">
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="w-full border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl h-11 flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    UNDUH TEMPLATE EXCEL
                  </Button>

                  <div className="border-t border-slate-50 dark:border-slate-800 my-4"></div>

                  <form onSubmit={handleImportExcelSubmit} className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unggah Hasil Pengisian Excel</label>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                    />

                    <Button
                      type="submit"
                      disabled={!excelFile}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-11"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      IMPOR MASSAL NILAI
                    </Button>
                  </form>
                </div>
              </Card>

              {/* Box Warning */}
              <Card className="p-5 border-none shadow-sm bg-indigo-600 dark:bg-indigo-950 text-white space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mr-12 -mt-12 rounded-full"></div>
                <div className="flex items-center gap-2 text-white/90">
                  <AlertTriangle size={18} className="text-amber-300" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Aturan Kelulusan KKM</h4>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                  Pastikan semua kompetensi dasar formatif dan sumatif siswa telah terisi lengkap. Nilai akhir dihitung secara proporsional berdasarkan persentase bobot jenis penilaian yang disetujui di kurikulum.
                </p>
              </Card>
            </div>

          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
}
