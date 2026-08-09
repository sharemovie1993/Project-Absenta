import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Award, 
  Plus, 
  Trash2, 
  Save, 
  Layers, 
  Bookmark, 
  Info,
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { raporApi } from '../../api/rapor.api';
import { kelasApi, tahunPelajaranApi, siswaApi } from '../../api/academic.api';
import { toast } from 'sonner';

export default React.memo(function P5Page() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'projek' | 'penilaian'>('projek');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form Create Projek State
  const [newProjek, setNewProjek] = useState({
    judul: '',
    deskripsi: ''
  });

  // Penilaian Filters State
  const [selectedProjek, setSelectedProjek] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedDimensi, setSelectedDimensi] = useState('');
  const [selectedSubElemen, setSelectedSubElemen] = useState('');

  // Scores Grid State
  const [scores, setScores] = useState<Array<{ siswa_id: string; nama_siswa: string; nis: string; kualifikasi: string; catatan_proses: string }>>([]);

  // Fetch Metadata
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

  // Fetch P5 Projek Master List
  const { data: projekList, isLoading: isLoadingProjek } = useQuery({
    queryKey: ['p5-projek', activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getP5Projek({
      tahun_pelajaran_id: activeYear!.id,
      semester_id: activeSemester!.id
    }),
    enabled: !!activeYear && !!activeSemester
  });

  // Fetch Students by Class (to populate blank grades)
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-p5', selectedKelas],
    queryFn: () => siswaApi.getByKelas(selectedKelas),
    enabled: activeTab === 'penilaian' && !!selectedKelas
  });

  // Fetch Existing P5 Grades
  const { data: existingP5Nilai } = useQuery({
    queryKey: ['p5-nilai', selectedProjek, selectedDimensi, selectedSubElemen],
    queryFn: () => raporApi.getP5Nilai({
      projek_id: selectedProjek,
      dimensi: selectedDimensi
    }),
    enabled: activeTab === 'penilaian' && !!selectedProjek && !!selectedDimensi && !!selectedSubElemen
  });

  // Prepopulate Grid when students load or existing grades arrive
  React.useEffect(() => {
    if (activeTab === 'penilaian' && students?.data) {
      const grid = students.data.map((stud: any) => {
        // Find existing record
        const exist = existingP5Nilai?.data?.find((n: any) => 
          n.siswa_id === stud.id && 
          n.sub_elemen === selectedSubElemen
        );
        return {
          siswa_id: stud.id,
          nama_siswa: stud.nama_siswa,
          nis: stud.nis || '',
          kualifikasi: exist?.kualifikasi || 'BSH',
          catatan_proses: exist?.catatan_proses || ''
        };
      });
      setScores(grid);
    }
  }, [students, existingP5Nilai, activeTab, selectedSubElemen]);

  // Mutations
  const createProjekMutation = useMutation({
    mutationFn: raporApi.createP5Projek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      toast.success('Projek P5 berhasil dibuat');
      setIsCreateModalOpen(false);
      setNewProjek({ judul: '', deskripsi: '' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membuat projek');
    }
  });

  const deleteProjekMutation = useMutation({
    mutationFn: raporApi.deleteP5Projek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-projek'] });
      toast.success('Projek P5 berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus projek');
    }
  });

  const saveP5BulkMutation = useMutation({
    mutationFn: raporApi.upsertBulkP5Nilai,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p5-nilai'] });
      toast.success('Nilai Projek P5 berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjek.judul) {
      toast.error('Judul Projek wajib diisi');
      return;
    }
    createProjekMutation.mutate({
      ...newProjek,
      tahun_pelajaran_id: activeYear!.id,
      semester_id: activeSemester!.id
    });
  };

  const handleScoreChange = (index: number, field: 'kualifikasi' | 'catatan_proses', val: string) => {
    setScores(prev => {
      const clone = [...prev];
      clone[index][field] = val;
      return clone;
    });
  };

  const handleSaveScores = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjek || !selectedDimensi || !selectedSubElemen) {
      toast.error('Harap lengkapi kriteria dimensi & sub-elemen');
      return;
    }
    saveP5BulkMutation.mutate({
      projek_id: selectedProjek,
      dimensi: selectedDimensi,
      sub_elemen: selectedSubElemen,
      scores: scores.map(s => ({
        siswa_id: s.siswa_id,
        kualifikasi: s.kualifikasi,
        catatan_proses: s.catatan_proses
      }))
    });
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', href: '/rapor/dashboard' },
    { label: 'Projek P5' }
  ], []);

  return (
    <AcademicPageLayout
      title="Projek Penguatan Profil Pelajar Pancasila (P5)"
      description="Manajemen tema projek dan penilaian kualitatif karakter siswa Kurikulum Merdeka."
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('projek')}
            className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'projek' 
                ? 'border-indigo-600 text-indigo-650' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Master Projek P5
          </button>
          <button
            onClick={() => setActiveTab('penilaian')}
            className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'penilaian' 
                ? 'border-indigo-600 text-indigo-650' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Penilaian Projek Siswa
          </button>
        </div>

        {/* Tab 1: Projek Master */}
        {activeTab === 'projek' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Daftar Projek Sekolah</h3>
                <p className="text-[11px] text-slate-400">Tema dan judul projek P5 yang sedang berjalan.</p>
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                TAMBAH PROJEK P5
              </Button>
            </div>

            {isLoadingProjek ? (
              <div className="text-center py-20 text-slate-400 text-xs italic">Memuat master projek...</div>
            ) : !projekList?.data || projekList.data.length === 0 ? (
              <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center space-y-3">
                <FileText size={48} className="text-slate-300" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Projek P5</h4>
                <p className="text-xs text-slate-450 max-w-sm">Wakasek belum mendaftarkan tema projek P5 semester aktif.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projekList.data.map((item: any) => (
                  <Card key={item.id} className="p-5 border-none shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border-none font-bold">P5 PROJEK</Badge>
                        <Button
                          onClick={() => {
                            if (confirm('Apakah Anda yakin ingin menghapus projek P5 ini beserta seluruh penilaian siswanya?')) {
                              deleteProjekMutation.mutate(item.id);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-rose-500 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-550 transition-colors line-clamp-1">{item.judul}</h4>
                        <p className="text-xs text-slate-450 mt-1 leading-relaxed line-clamp-3">{item.deskripsi || 'Tidak ada deskripsi.'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Penilaian Projek */}
        {activeTab === 'penilaian' && (
          <div className="space-y-6">
            
            {/* Filter Penilaian */}
            <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">1. Projek P5</label>
                <select
                  value={selectedProjek}
                  onChange={(e) => setSelectedProjek(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Pilih Projek</option>
                  {projekList?.data?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.judul}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">2. Kelas Siswa</label>
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Pilih Kelas</option>
                  {classes?.data?.map((k: any) => (
                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">3. Dimensi Pancasila</label>
                <select
                  value={selectedDimensi}
                  onChange={(e) => {
                    setSelectedDimensi(e.target.value);
                    setSelectedSubElemen('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Pilih Dimensi</option>
                  <option value="Beriman & Bertakwa">Beriman, Bertakwa kepada Tuhan YME, & Berakhlak Mulia</option>
                  <option value="Berkebinekaan Global">Berkebinekaan Global</option>
                  <option value="Gotong Royong">Gotong Royong</option>
                  <option value="Mandiri">Mandiri</option>
                  <option value="Bernalar Kritis">Bernalar Kritis</option>
                  <option value="Kreatif">Kreatif</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">4. Sub-Elemen Karakter</label>
                <select
                  value={selectedSubElemen}
                  onChange={(e) => setSelectedSubElemen(e.target.value)}
                  disabled={!selectedDimensi}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-850 dark:text-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Pilih Sub-Elemen</option>
                  {selectedDimensi === 'Gotong Royong' && (
                    <>
                      <option value="Kolaborasi: Kerjasama">Kolaborasi: Kerjasama kelompok</option>
                      <option value="Kepedulian: Tanggap sosial">Kepedulian: Tanggap terhadap lingkungan sosial</option>
                    </>
                  )}
                  {selectedDimensi === 'Berkebinekaan Global' && (
                    <>
                      <option value="Mendalami budaya">Mendalami budaya dan identitas budaya</option>
                      <option value="Komunikasi interkultural">Komunikasi & interaksi interkultural</option>
                    </>
                  )}
                  {selectedDimensi !== 'Gotong Royong' && selectedDimensi !== 'Berkebinekaan Global' && selectedDimensi && (
                    <>
                      <option value="Pemahaman Diri & Situasi">Mengenali kualitas diri & situasi dihadapi</option>
                      <option value="Refleksi Pemikiran">Melakukan refleksi pemikiran & proses berpikir</option>
                    </>
                  )}
                </select>
              </div>
            </Card>

            {/* Scores Table */}
            {selectedProjek && selectedKelas && selectedDimensi && selectedSubElemen && (
              <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Matriks Penilaian Karakter P5</h3>
                    <p className="text-[11px] text-slate-400">Dimensi: {selectedDimensi} | Sub-elemen: {selectedSubElemen}</p>
                  </div>
                  <Button
                    onClick={handleSaveScores}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    SIMPAN NILAI P5
                  </Button>
                </div>

                {isLoadingStudents ? (
                  <div className="text-center py-20 text-slate-400 text-xs italic">Menarik daftar siswa kelas...</div>
                ) : scores.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 text-xs italic">Kelas kosong atau tidak ditemukan data siswa.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                          <th className="py-2.5">Siswa</th>
                          <th className="py-2.5 w-44">Kualifikasi Capaian</th>
                          <th className="py-2.5">Catatan Proses Karakter P5</th>
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
                              <select
                                value={score.kualifikasi}
                                onChange={(e) => handleScoreChange(index, 'kualifikasi', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold p-2.5 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="BB">BB (Belum Berkembang)</option>
                                <option value="MB">MB (Mulai Berkembang)</option>
                                <option value="BSH">BSH (Berkembang Sesuai Harapan)</option>
                                <option value="SB">SB (Sangat Berkembang)</option>
                              </select>
                            </td>
                            <td className="py-3">
                              <input
                                type="text"
                                placeholder="Tulis catatan perkembangan spesifik siswa selama pengerjaan projek..."
                                value={score.catatan_proses}
                                onChange={(e) => handleScoreChange(index, 'catatan_proses', e.target.value)}
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
            )}
          </div>
        )}

        {/* Modal Create Projek P5 */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Tambah Projek P5 Baru</h3>
                <p className="text-xs text-slate-400">Daftarkan projek pembelajaran bertema Pancasila semester aktif ini.</p>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Judul Projek</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kewirausahaan: Membuat Kuliner Khas Daerah"
                    value={newProjek.judul}
                    onChange={(e) => setNewProjek(prev => ({ ...prev, judul: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-550"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Deskripsi Projek</label>
                  <textarea
                    placeholder="Tulis ringkasan aktivitas, tujuan projek, dan hasil akhir yang diharapkan dari siswa..."
                    rows={4}
                    value={newProjek.deskripsi}
                    onChange={(e) => setNewProjek(prev => ({ ...prev, deskripsi: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-550 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl font-bold">BATAL</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">SIMPAN PROJEK</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
});
