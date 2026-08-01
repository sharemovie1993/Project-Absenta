import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  Printer, 
  Award, 
  CheckCircle,
  FileSpreadsheet,
  Edit3,
  Save,
  Users,
  Search
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { raporApi } from '../../api/rapor.api';
import { tahunPelajaranApi } from '../../api/academic.api';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { toast } from 'sonner';

export default function CetakRaporPage() {
  const queryClient = useQueryClient();
  
  // Filters State
  const [selectedKelas, setSelectedKelas] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Use Kelas & Siswa Hooks
  const { rawList: classList, isLoading: isLoadingClasses } = useKelasOptions({ filterByJenjang: false, onlyActive: false });
  const { rawList: studentList, isLoading: isLoadingStudents } = useSiswaOptions({ kelasId: selectedKelas, onlyActive: false });

  // Modal State for Rapor Summary (Absensi & Catatan)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [summaryForm, setSummaryForm] = useState({
    sakit: 0,
    izin: 0,
    alpa: 0,
    catatan_wali: '',
    keputusan_transisi: ''
  });

  // Fetch Metadata
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll()
  });
  const activeYear = useMemo(() => {
    const list = Array.isArray(years?.data) ? years.data : (Array.isArray(years) ? years : []);
    return list.find((y: any) => y.is_active) || list[0] || null;
  }, [years]);

  const activeSemester = useMemo(() => {
    const semList = activeYear?.Semester || [];
    return semList.find((s: any) => s.is_active) || semList[0] || null;
  }, [activeYear]);

  // Fetch Leger (Grades, Ranks & Rata-rata)
  const { data: leger, isLoading: isLoadingLeger } = useQuery({
    queryKey: ['leger', selectedKelas, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getLeger({
      kelas_id: selectedKelas,
      tahun_pelajaran_id: activeYear?.id || '',
      semester_id: activeSemester?.id || ''
    }),
    enabled: !!selectedKelas && !!activeYear?.id && !!activeSemester?.id
  });

  // Mutation for Rapor Summary Upsert
  const summaryMutation = useMutation({
    mutationFn: raporApi.upsertRaporSummary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leger'] });
      toast.success('Rekap absensi & catatan wali kelas berhasil disimpan');
      setIsSummaryModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan catatan');
    }
  });

  const handleOpenSummaryModal = (student: any) => {
    setSelectedStudent(student);
    setSummaryForm({
      sakit: student.sakit || 0,
      izin: student.izin || 0,
      alpa: student.alpa || 0,
      catatan_wali: student.catatan_wali || '',
      keputusan_transisi: student.keputusan_transisi || ''
    });
    setIsSummaryModalOpen(true);
  };

  const handleSummarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedKelas || !activeYear?.id || !activeSemester?.id) return;
    summaryMutation.mutate({
      siswa_id: selectedStudent.id,
      kelas_id: selectedKelas,
      tahun_pelajaran_id: activeYear.id,
      semester_id: activeSemester.id,
      ...summaryForm
    });
  };

  const handleExportLeger = () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) return;
    const url = raporApi.getLegerExportUrl({
      kelas_id: selectedKelas,
      tahun_pelajaran_id: activeYear.id,
      semester_id: activeSemester.id
    });
    window.open(url, '_blank');
  };

  const filteredStudents = useMemo(() => {
    // Primary source: studentList from useSiswaOptions
    const baseList = studentList && studentList.length > 0 ? studentList : (leger?.data?.students || []);
    if (!baseList || baseList.length === 0) return [];

    const legerStudents = leger?.data?.students || [];

    return baseList
      .map((s: any) => {
        const foundLeger = legerStudents.find((ls: any) => ls.id === s.id || ls.siswa_id === s.id);
        const name = s.nama_siswa || s.nama || s.nama_lengkap || '—';
        const nisVal = s.nis || '—';

        return {
          id: s.id,
          nama_siswa: name,
          nis: nisVal,
          rank: foundLeger?.rank || '—',
          rata_rata: foundLeger?.rata_rata ?? 0,
          sakit: foundLeger?.sakit ?? (s as any).sakit ?? 0,
          izin: foundLeger?.izin ?? (s as any).izin ?? 0,
          alpa: foundLeger?.alpa ?? (s as any).alpa ?? 0,
          catatan_wali: foundLeger?.catatan_wali || '',
          keputusan_transisi: foundLeger?.keputusan_transisi || '',
        };
      })
      .filter((s: any) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.nama_siswa.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q)
        );
      });
  }, [studentList, leger, searchQuery]);

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', href: '/rapor/dashboard' },
    { label: 'Cetak Rapor & Leger' }
  ], []);

  return (
    <AcademicPageLayout
      title="Leger Kelas & Cetakan Rapor"
      description="Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pengunduhan PDF lembar e-Rapor resmi."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="cetakraporpage"
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Selector Header */}
        <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Pilih Kelas</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500 min-w-[200px]"
              >
                <option value="">Pilih Kelas</option>
                {classList?.map((k: any) => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
            </div>

            {selectedKelas && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Cari Siswa</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nama / NIS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold pl-8 pr-4 py-2.5 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
              </div>
            )}
          </div>

          {selectedKelas && leger?.data && (
            <Button
              onClick={handleExportLeger}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-100 dark:shadow-none"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              EKSPOR LEGER (EXCEL)
            </Button>
          )}
        </Card>

        {selectedKelas && (
          <div className="space-y-6">
            {isLoadingLeger ? (
              <div className="text-center py-20 text-slate-400 text-xs italic">Menghitung ranking & rekapitulasi leger...</div>
            ) : filteredStudents.length === 0 ? (
              <Card className="p-10 text-center text-slate-400 text-xs italic">Tidak ada data siswa ditemukan.</Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                
                {/* Leger Table Mini & Cetak PDF */}
                {filteredStudents.map((student: any) => (
                  <Card key={student.id} className="p-5 border-none shadow-sm dark:bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      {/* Badge Rank */}
                      <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-md">
                        <span className="text-[9px] font-black uppercase text-indigo-200">Rank</span>
                        <span className="text-sm font-black -mt-1">{student.rank}</span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.nama_siswa}</h4>
                        <p className="text-[10px] text-slate-450">NIS. {student.nis} | Rata-rata Nilai: <span className="font-bold text-indigo-600 dark:text-indigo-400">{student.rata_rata?.toFixed(1) || '0.0'}</span></p>
                        
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="outline" className="text-[9px] font-semibold border-slate-100 dark:border-slate-800 text-slate-500">Sakit: {student.sakit || 0}</Badge>
                          <Badge variant="outline" className="text-[9px] font-semibold border-slate-100 dark:border-slate-800 text-slate-500">Izin: {student.izin || 0}</Badge>
                          <Badge variant="outline" className="text-[9px] font-semibold border-slate-100 dark:border-slate-800 text-slate-500">Alpa: {student.alpa || 0}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => handleOpenSummaryModal(student)}
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50"
                      >
                        <Edit3 size={14} className="mr-1.5" />
                        ABSENSI & CATATAN
                      </Button>

                      {/* PDF Links */}
                      {activeYear?.id && activeSemester?.id && (
                        <>
                          <a href={raporApi.getPdfRaporUrl(student.id, activeYear.id, activeSemester.id)} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2 px-3 flex items-center gap-1 shadow-sm">
                              <Printer size={13} />
                              RAPOR
                            </Button>
                          </a>

                          <a href={raporApi.getPdfP5Url(student.id, activeYear.id, activeSemester.id)} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl py-2 px-3 flex items-center gap-1 shadow-sm">
                              <Printer size={13} />
                              P5
                            </Button>
                          </a>
                        </>
                      )}

                      <a href={raporApi.getPdfSklUrl(student.id)} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs font-bold border-slate-200 text-slate-650 hover:bg-slate-50">
                          SKL
                        </Button>
                      </a>

                      <a href={raporApi.getPdfUkkUrl(student.id)} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs font-bold border-slate-200 text-slate-650 hover:bg-slate-50">
                          UKK
                        </Button>
                      </a>
                    </div>
                  </Card>
                ))}

              </div>
            )}
          </div>
        )}

        {/* Modal Absensi & Catatan Wali Kelas */}
        {isSummaryModalOpen && selectedStudent && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Absensi & Catatan Wali Kelas</h3>
                <p className="text-xs text-slate-400">Siswa: {selectedStudent.nama_siswa}</p>
              </div>

              <form onSubmit={handleSummarySubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Sakit (Hari)</label>
                    <input
                      type="number"
                      min={0}
                      value={summaryForm.sakit}
                      onChange={(e) => setSummaryForm(prev => ({ ...prev, sakit: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white text-center focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Izin (Hari)</label>
                    <input
                      type="number"
                      min={0}
                      value={summaryForm.izin}
                      onChange={(e) => setSummaryForm(prev => ({ ...prev, izin: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white text-center focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Alpa (Hari)</label>
                    <input
                      type="number"
                      min={0}
                      value={summaryForm.alpa}
                      onChange={(e) => setSummaryForm(prev => ({ ...prev, alpa: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white text-center focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Catatan Wali Kelas / Rekomendasi</label>
                  <textarea
                    placeholder="Contoh: Pertahankan prestasi akademik Anda. Lebih giat lagi dalam berorganisasi."
                    rows={3}
                    value={summaryForm.catatan_wali}
                    onChange={(e) => setSummaryForm(prev => ({ ...prev, catatan_wali: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-550 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Keputusan Akhir Semester / Transisi Kenaikan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Naik ke Kelas XI TJKT 1"
                    value={summaryForm.keputusan_transisi}
                    onChange={(e) => setSummaryForm(prev => ({ ...prev, keputusan_transisi: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-550"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsSummaryModalOpen(false)} className="rounded-xl font-bold">BATAL</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">SIMPAN PERUBAHAN</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
}
