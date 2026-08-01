import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Save, 
  Layers,
  ClipboardPaste,
  FileOutput,
  Sparkles,
  Calculator
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { raporApi } from '../../api/rapor.api';
import { kelasApi, mapelApi, tahunPelajaranApi, siswaApi } from '../../api/academic.api';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useMapelOptions } from '../../hooks/useMapelOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { toast } from 'sonner';

export default function InputNilaiPage() {
  const queryClient = useQueryClient();

  // Mode Selection: 'sumatif' (Kurikulum Merdeka S1,S2,S3,Akhir) vs 'kategori'
  const [entryMode, setEntryMode] = useState<'sumatif' | 'kategori'>('sumatif');

  // Filters State
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedJenisNilai, setSelectedJenisNilai] = useState('');
  const [selectedSesiKbm, setSelectedSesiKbm] = useState('');

  // Paste Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Excel Import File State
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Scores Grid State
  const [scores, setScores] = useState<Array<{
    siswa_id: string;
    nama_siswa: string;
    nis: string;
    nilai: number;
    sumatif_1?: number | null;
    sumatif_2?: number | null;
    sumatif_3?: number | null;
    rata_rata_sumatif?: number | null;
    nilai_akhir_sumatif?: number | null;
    nilai_rapor_final?: number | null;
    capaian_kompetensi?: string;
    catatan_deskripsi?: string;
  }>>([]);

  // Consume Standardized Custom Hooks
  const { rawList: classes } = useKelasOptions({ onlyActive: true });

  const selectedKelasObj = useMemo(() => {
    return classes.find((k: any) => k.id === selectedKelas);
  }, [classes, selectedKelas]);

  const targetTingkat = useMemo(() => {
    if (!selectedKelasObj?.tingkat) return undefined;
    const val = String(selectedKelasObj.tingkat).trim().toUpperCase();
    if (val === '10' || val === 'X') return 10;
    if (val === '11' || val === 'XI') return 11;
    if (val === '12' || val === 'XII') return 12;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [selectedKelasObj]);

  const { rawList: subjects } = useMapelOptions({
    tingkat: targetTingkat
  });

  const { activeTahunPelajaran: activeYear } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions({ tahunPelajaranId: activeYear?.id });
  const { rawList: studentsInKelas, isLoading: isLoadingStudents } = useSiswaOptions({
    kelasId: selectedKelas,
    onlyActive: true
  });

  const { data: categories } = useQuery({
    queryKey: ['jenis-penilaian'],
    queryFn: () => raporApi.getJenisPenilaian()
  });

  // Fetch Existing Grades
  const { data: existingGrades, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['grades', selectedKelas, selectedMapel, selectedJenisNilai, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getNilas({
      kelas_id: selectedKelas,
      mapel_id: selectedMapel,
      jenis_nilai_id: selectedJenisNilai || undefined,
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id
    }),
    enabled: !!selectedKelas && !!selectedMapel && !!activeYear && !!activeSemester
  });

  // Diagnostic Console Log for Filter & Query States
  useEffect(() => {
    console.log('🎛️ [InputNilaiPage] State Diagnostics:', {
      selectedKelas,
      selectedMapel,
      entryMode,
      activeYearId: activeYear?.id,
      activeSemesterId: activeSemester?.id,
      classesCount: classes?.length,
      subjectsCount: subjects?.length,
      studentsInKelasCount: studentsInKelas?.length,
      existingGradesCount: existingGrades?.data?.length,
      scoresCount: scores?.length,
      isLoadingStudents,
      isLoadingGrades
    });
  }, [selectedKelas, selectedMapel, entryMode, activeYear, activeSemester, classes, subjects, studentsInKelas, existingGrades, scores, isLoadingStudents, isLoadingGrades]);

  // Prepopulate Scores Grid with full student roster + existing grades
  useEffect(() => {
    console.log('🔄 [InputNilaiPage] useEffect prepopulateScores triggered:', {
      selectedKelas,
      selectedMapel,
      studentsInKelasCount: studentsInKelas?.length,
      existingGradesCount: existingGrades?.data?.length
    });

    if (selectedKelas && studentsInKelas && studentsInKelas.length > 0) {
      const existingMap = new Map();
      if (existingGrades?.data && Array.isArray(existingGrades.data)) {
        existingGrades.data.forEach((item: any) => {
          existingMap.set(item.siswa_id, item);
        });
      }

      const grid = studentsInKelas.map((siswa: any) => {
        const existing = existingMap.get(siswa.id);
        return {
          siswa_id: siswa.id,
          nama_siswa: siswa.nama_siswa || '',
          nis: siswa.nis || '',
          nilai: existing?.nilai ?? 0,
          sumatif_1: existing?.sumatif_1 ?? null,
          sumatif_2: existing?.sumatif_2 ?? null,
          sumatif_3: existing?.sumatif_3 ?? null,
          rata_rata_sumatif: existing?.rata_rata_sumatif ?? null,
          nilai_akhir_sumatif: existing?.nilai_akhir_sumatif ?? null,
          nilai_rapor_final: existing?.nilai_rapor_final ?? existing?.nilai ?? 0,
          capaian_kompetensi: existing?.capaian_kompetensi || existing?.catatan_deskripsi || '',
          catatan_deskripsi: existing?.catatan_deskripsi || ''
        };
      });

      console.log('✅ [InputNilaiPage] Grid successfully created with', grid.length, 'students!');
      setScores(grid);
    } else {
      console.warn('⚠️ [InputNilaiPage] Could not prepopulate grid. Reasons:', {
        hasSelectedKelas: !!selectedKelas,
        hasStudentsInKelas: !!studentsInKelas,
        studentsCount: studentsInKelas?.length
      });
    }
  }, [selectedKelas, selectedMapel, studentsInKelas, existingGrades]);

  // Success Banner State
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Save Batch Sumatif Mutation
  const sumatifSaveMutation = useMutation({
    mutationFn: raporApi.upsertBatchSumatifNilai,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['students-by-kelas'] });
      toast.success('🎉 BERHASIL DISIMPAN! Nilai Sumatif & Capaian Kompetensi sekelas telah tersimpan ke database.', {
        duration: 5000,
      });
      setSaveSuccessMsg('Daftar nilai sumatif & capaian kompetensi sekelas berhasil tersimpan permanen ke database!');
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai sumatif');
    }
  });

  // Bulk Save Mutation (Legacy)
  const bulkSaveMutation = useMutation({
    mutationFn: raporApi.upsertBulkNilai,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['students-by-kelas'] });
      toast.success('🎉 BERHASIL DISIMPAN! Nilai siswa sekelas berhasil tersimpan ke database.');
      setSaveSuccessMsg('Daftar nilai siswa sekelas berhasil tersimpan permanen!');
      setTimeout(() => setSaveSuccessMsg(null), 6000);
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

  // Handle Score Field Change with Auto-Calc
  const handleSumatifChange = (index: number, field: string, val: any) => {
    setScores(prev => {
      const clone = [...prev];
      const target = { ...clone[index] };

      if (['sumatif_1', 'sumatif_2', 'sumatif_3', 'nilai_akhir_sumatif'].includes(field)) {
        const num = val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0));
        (target as any)[field] = num;

        // Auto Calc Rata-rata Sumatif
        const sList = [target.sumatif_1, target.sumatif_2, target.sumatif_3].filter(
          (v): v is number => v !== null && v !== undefined && !isNaN(v)
        );
        let rata: number | null = null;
        if (sList.length > 0) {
          rata = Number((sList.reduce((a, b) => a + b, 0) / sList.length).toFixed(2));
        }
        target.rata_rata_sumatif = rata;

        // Auto Calc Nilai Rapor Final = (Rata-rata + Nilai Akhir) / 2
        const nAkhir = target.nilai_akhir_sumatif;
        if (rata !== null && nAkhir !== null && nAkhir !== undefined) {
          target.nilai_rapor_final = Number(((rata + nAkhir) / 2).toFixed(2));
        } else if (nAkhir !== null && nAkhir !== undefined) {
          target.nilai_rapor_final = nAkhir;
        } else if (rata !== null) {
          target.nilai_rapor_final = rata;
        } else {
          target.nilai_rapor_final = 0;
        }
        target.nilai = target.nilai_rapor_final;
      } else if (field === 'capaian_kompetensi') {
        target.capaian_kompetensi = val;
      }

      clone[index] = target;
      return clone;
    });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [InputNilaiPage] handleSaveSubmit triggered. State:', {
      selectedKelas,
      selectedMapel,
      activeYearId: activeYear?.id,
      activeSemesterId: activeSemester?.id,
      entryMode,
      scoresCount: scores.length
    });

    if (!selectedKelas) {
      toast.error('Pilih Kelas Rombel terlebih dahulu');
      return;
    }
    if (!selectedMapel) {
      toast.error('Pilih Mata Pelajaran terlebih dahulu');
      return;
    }
    if (!activeYear || !activeSemester) {
      toast.error('Tahun Pelajaran atau Semester aktif belum diset di sistem');
      return;
    }
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }

    if (entryMode === 'sumatif') {
      const payload = {
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        scores: scores.map(s => ({
          siswa_id: s.siswa_id,
          sumatif_1: s.sumatif_1,
          sumatif_2: s.sumatif_2,
          sumatif_3: s.sumatif_3,
          nilai_akhir_sumatif: s.nilai_akhir_sumatif,
          capaian_kompetensi: s.capaian_kompetensi
        }))
      };
      console.log('📤 [InputNilaiPage] Mutating sumatifSaveMutation with payload:', payload);
      sumatifSaveMutation.mutate(payload);
    } else {
      if (!selectedJenisNilai) {
        toast.error('Pilih Kategori Penilaian terlebih dahulu');
        return;
      }
      bulkSaveMutation.mutate({
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        jenis_nilai_id: selectedJenisNilai,
        sesi_absensi_id: selectedSesiKbm || null,
        scores: scores.map(s => ({
          siswa_id: s.siswa_id,
          nilai: s.nilai,
          catatan_deskripsi: s.catatan_deskripsi
        }))
      });
    }
  };

  // Handle Paste from Excel (TSV Parsing)
  const handleProcessPaste = () => {
    if (!pasteRawText.trim()) {
      toast.error('Data yang di-paste masih kosong');
      return;
    }

    const lines = pasteRawText.trim().split('\n');
    let updatedCount = 0;

    setScores(prev => {
      const clone = [...prev];
      lines.forEach(line => {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length < 2) return;

        const nisOrNama = parts[0].toLowerCase();

        // Match student by NIS or Name
        const idx = clone.findIndex(
          s => s.nis.toLowerCase() === nisOrNama || s.nama_siswa.toLowerCase().includes(nisOrNama)
        );

        if (idx !== -1) {
          const s1 = parseFloat(parts[1]) || null;
          const s2 = parseFloat(parts[2]) || null;
          const s3 = parseFloat(parts[3]) || null;
          const nAkhir = parseFloat(parts[4]) || null;
          const cpText = parts[5] || '';

          const target = { ...clone[idx] };
          if (s1 !== null) target.sumatif_1 = s1;
          if (s2 !== null) target.sumatif_2 = s2;
          if (s3 !== null) target.sumatif_3 = s3;
          if (nAkhir !== null) target.nilai_akhir_sumatif = nAkhir;
          if (cpText) target.capaian_kompetensi = cpText;

          // Re-calc
          const sList = [target.sumatif_1, target.sumatif_2, target.sumatif_3].filter(
            (v): v is number => v !== null && v !== undefined && !isNaN(v)
          );
          let rata: number | null = null;
          if (sList.length > 0) {
            rata = Number((sList.reduce((a, b) => a + b, 0) / sList.length).toFixed(2));
          }
          target.rata_rata_sumatif = rata;

          const nA = target.nilai_akhir_sumatif;
          if (rata !== null && nA !== null && nA !== undefined) {
            target.nilai_rapor_final = Number(((rata + nA) / 2).toFixed(2));
          } else if (nA !== null && nA !== undefined) {
            target.nilai_rapor_final = nA;
          } else if (rata !== null) {
            target.nilai_rapor_final = rata;
          }
          target.nilai = target.nilai_rapor_final ?? 0;

          clone[idx] = target;
          updatedCount++;
        }
      });
      return clone;
    });

    toast.success(`Berhasil mencocokkan & memperbarui ${updatedCount} baris data dari Excel!`);
    setShowPasteModal(false);
    setPasteRawText('');
  };

  // Export e-Rapor Kemendikbud (Authenticated Blob Download)
  const handleExportEraporKemendikbud = async () => {
    if (!selectedKelas || !selectedMapel || !activeYear || !activeSemester) {
      toast.error('Pilih Kelas dan Mapel terlebih dahulu');
      return;
    }
    try {
      toast.info('Mengunduh berkas format e-Rapor Kemendikbud...');
      const response = await raporApi.exportEraporKemendikbudBlob({
        kelas_id: selectedKelas,
        mapel_id: selectedMapel,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
      });

      // Extract filename from header or build fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'eRapor_Kemendikbud.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Create Blob & Trigger Download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Berkas ${filename} berhasil diunduh! Siap diimport ke e-Rapor Kemendikbud.`);
    } catch (err: any) {
      console.error('❌ [InputNilaiPage] Failed to export e-Rapor:', err);
      toast.error(err.message || 'Gagal mengunduh berkas e-Rapor Kemendikbud');
    }
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
      title="Input Nilai KBM & Rapor Kurikulum Merdeka"
      description="Pencatatan nilai sumatif, ulangan harian, dan capaian kompetensi siswa kelas terintegrasi."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="inputnilaipage"
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Mode Selector & Header Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Skema Penilaian Rapor</h2>
              <p className="text-[11px] text-slate-400">Pilih alur pengisian nilai yang sesuai kebutuhan Anda.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setEntryMode('sumatif')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                entryMode === 'sumatif' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mode Sumatif Rapor (Merdeka)
            </button>
            <button
              onClick={() => setEntryMode('kategori')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                entryMode === 'kategori' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mode Per Kategori (Legacy)
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center">
            <Layers size={14} className="mr-1.5" />
            Parameter Penilaian Kelas (Kelas-Sentrik)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">1. Kelas Rombel</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Pilih Kelas</option>
                {classes?.map((k: any) => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">2. Mata Pelajaran</label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Pilih Mapel</option>
                {subjects?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                ))}
              </select>
            </div>

            {entryMode === 'kategori' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">3. Kategori Penilaian</label>
                <select
                  value={selectedJenisNilai}
                  onChange={(e) => {
                    setSelectedJenisNilai(e.target.value);
                    setScores([]);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Pilih Kategori</option>
                  {categories?.data?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nama} ({c.kode}) - Bobot {c.bobot}x</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                {entryMode === 'sumatif' ? '3.' : '4.'} Sesi KBM Harian (Opsional)
              </label>
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

        {saveSuccessMsg && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-sm">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold">{saveSuccessMsg}</p>
                <p className="text-[10px] text-emerald-100">Nilai siap digunakan untuk penerbitan Leger & e-Rapor resmi Dinas.</p>
              </div>
            </div>
            <button onClick={() => setSaveSuccessMsg(null)} className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all text-white">
              Tutup
            </button>
          </div>
        )}

        {selectedKelas && selectedMapel && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Input Grid Nilai (Kiri 3 Cols) */}
            <Card className="lg:col-span-3 p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    Lembar Pengisian Nilai Kelas
                    <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                      {scores.length} Siswa
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {entryMode === 'sumatif' 
                      ? 'Formula Rapor: Nilai Akhir = (Rata-rata(S1,S2,S3) + Sumatif Akhir) / 2' 
                      : 'Input nilai langsung per kategori.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {entryMode === 'sumatif' && (
                    <Button 
                      type="button"
                      onClick={() => setShowPasteModal(true)}
                      variant="outline"
                      className="border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl font-bold text-xs"
                    >
                      <ClipboardPaste className="w-4 h-4 mr-1.5" />
                      Paste dari Excel
                    </Button>
                  )}

                  <Button 
                    onClick={handleSaveSubmit}
                    disabled={sumatifSaveMutation.isPending || bulkSaveMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none text-xs"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    SIMPAN PERUBAHAN
                  </Button>
                </div>
              </div>

              {isLoadingStudents || isLoadingGrades ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">Menarik daftar siswa rombel...</div>
              ) : scores.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">Rombel kosong atau tidak ada siswa aktif.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                        <th className="py-2.5 px-2">No</th>
                        <th className="py-2.5 px-2">Nama Siswa</th>

                        {entryMode === 'sumatif' ? (
                          <>
                            <th className="py-2.5 px-1 text-center w-16">Sumatif 1</th>
                            <th className="py-2.5 px-1 text-center w-16">Sumatif 2</th>
                            <th className="py-2.5 px-1 text-center w-16">Sumatif 3</th>
                            <th className="py-2.5 px-1 text-center w-20 text-indigo-600 dark:text-indigo-400">Rata-Rata</th>
                            <th className="py-2.5 px-1 text-center w-20 text-amber-600 dark:text-amber-400">Sumatif Akhir</th>
                            <th className="py-2.5 px-1 text-center w-20 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">NILAI RAPOR</th>
                            <th className="py-2.5 px-2">Capaian Kompetensi (CP Narasi)</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-2 w-24">Nilai (0-100)</th>
                            <th className="py-2.5 px-2">Deskripsi Rapor</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((score, index) => (
                        <tr key={score.siswa_id} className="border-b border-slate-50 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="py-3 px-2 font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200">
                            {score.nama_siswa}
                            <span className="block text-[9px] text-slate-400 font-normal">NIS. {score.nis}</span>
                          </td>

                          {entryMode === 'sumatif' ? (
                            <>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score.sumatif_1 ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'sumatif_1', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-2 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score.sumatif_2 ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'sumatif_2', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-2 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score.sumatif_3 ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'sumatif_3', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-2 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="py-2 px-1 text-center font-black text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-lg">
                                {score.rata_rata_sumatif ?? '-'}
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score.nilai_akhir_sumatif ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'nilai_akhir_sumatif', e.target.value)}
                                  className="w-full bg-amber-50 dark:bg-amber-950/40 border-none rounded-lg text-xs font-black text-center p-2 text-amber-800 dark:text-amber-200 focus:ring-1 focus:ring-amber-500"
                                />
                              </td>
                              <td className="py-2 px-1 text-center font-black text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/40 rounded-lg">
                                {score.nilai_rapor_final ?? 0}
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  placeholder="Narasi capaian kompetensi..."
                                  value={score.capaian_kompetensi ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'capaian_kompetensi', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium p-2 text-slate-700 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score.nilai}
                                  onChange={(e) => handleSumatifChange(index, 'nilai', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-black text-center p-2.5 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="py-3 px-2">
                                <input
                                  type="text"
                                  placeholder="Deskripsi Rapor..."
                                  value={score.catatan_deskripsi ?? ''}
                                  onChange={(e) => handleSumatifChange(index, 'catatan_deskripsi', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-medium p-2.5 text-slate-700 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Impor & Ekspor e-Rapor (Kanan 1 Col) */}
            <div className="space-y-6">
              
              {/* Card Export e-Rapor Kemendikbud */}
              <Card className="p-5 border-none shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white space-y-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-2 text-indigo-300">
                  <FileOutput size={20} />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Export e-Rapor Kemendikbud</h3>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Unduh file Excel yang telah ter-format khusus sesuai skema impor aplikasi <strong>e-Rapor resmi Dinas Pendidikan</strong>.
                </p>

                <Button
                  onClick={handleExportEraporKemendikbud}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl h-11 shadow-lg shadow-indigo-500/25"
                >
                  <Download className="w-4 h-4 mr-2" />
                  EXPORT SIAP IMPORT E-RAPOR
                </Button>
              </Card>

              {/* Card Template & Import Standard */}
              <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center">
                  <FileSpreadsheet size={18} className="mr-2 text-indigo-500" />
                  Impor & Ekspor Excel Offline
                </h3>
                <p className="text-xs text-slate-450 leading-relaxed font-medium">
                  Unduh template Excel rombel ini, isi nilai di komputer offline, lalu unggah kembali.
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unggah Berkas Excel</label>
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

            </div>

          </div>
        )}

        {/* Modal Paste dari Excel */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Paste Data dari Excel / Google Sheets</h3>
                </div>
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Copy kolom dari Excel dalam urutan tab berikut: <br />
                  <strong className="text-indigo-600 dark:text-indigo-400">NIS (atau Nama) | Sumatif 1 | Sumatif 2 | Sumatif 3 | Sumatif Akhir | CP Narasi</strong>
                </p>

                <textarea
                  rows={8}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder={`Contoh (Paste dari Excel):\n2526100414\t82\t81\t\t80\tMemahami ayat Al-Qur'an...\n2526100415\t78\t77\t\t75\tCukup mampu memahami...`}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasteModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleProcessPaste}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  PROSES & PASANG KE TABEL
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
}
