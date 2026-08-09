import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Save, 
  Layers, 
  ClipboardPaste, 
  Sparkles, 
  Award, 
  FileText, 
  Download, 
  Printer,
  CheckCircle2
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { hubinApi } from '../../api/hubin.api';
import { kelasApi } from '../../api/academic.api';
import { toast } from 'sonner';

import { useDudiOptions } from '../../hooks/useDudiOptions';
import { useActivePklStudents } from '../../hooks/useActivePklStudents';

export default React.memo(function InputNilaiPklPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'nilai' | 'deskripsi'>('nilai');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMitra, setSelectedMitra] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [selectedSiswaSertifikat, setSelectedSiswaSertifikat] = useState<any>(null);

  // Deskripsi TP Form State
  const [deskripsiTpText, setDeskripsiTpText] = useState('');

  // Fetch Classes
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => kelasApi.getAll()
  });

  // Integrated Custom Hooks (Pilar 31 Data Layer)
  const { options: mitraOptions, rawList: rawMitraList } = useDudiOptions();
  const { rawList: activePklStudentsList, isLoading: isLoadingPkl } = useActivePklStudents({ kelas_id: selectedKelas });

  const { data: pklRekap, isLoading: isLoadingRekap } = useQuery({
    queryKey: ['pkl-rekap', selectedKelas],
    queryFn: () => hubinApi.getRekapPklSiswa({ kelas_id: selectedKelas || undefined }),
  });

  // Fetch Setting Deskripsi TP List
  const { data: deskripsiList } = useQuery({
    queryKey: ['deskripsi-tp-list', selectedMitra],
    queryFn: () => hubinApi.getSettingDeskripsiPklList({ mitra_id: selectedMitra || undefined }),
  });

  // Scores Grid State
  const [scores, setScores] = useState<Array<any>>([]);

  useEffect(() => {
    const rawList = Array.isArray(pklRekap?.data) 
      ? pklRekap.data 
      : Array.isArray(pklRekap) 
      ? pklRekap 
      : (pklRekap as any)?.data?.list || [];

    if (Array.isArray(rawList)) {
      setScores(rawList.map((item: any) => ({
        siswa_pkl_id: item.id,
        nama_siswa: item.Siswa?.nama_siswa || item.siswa_nama || '',
        nis: item.Siswa?.nis || item.nis || '',
        mitra_nama: item.Mitra?.nama || item.mitra_nama || '-',
        instruktur_nama: item.instruktur_nama || '',
        penanggung_jawab_nama: item.penanggung_jawab_nama || '',
        alamat_dudi: item.alamat_dudi || item.Mitra?.alamat || '',
        hard_kompetensi_teknis: item.hard_kompetensi_teknis ?? null,
        hard_sop_k3lh: item.hard_sop_k3lh ?? null,
        hard_alur_bisnis: item.hard_alur_bisnis ?? null,
        soft_kedisiplinan: item.soft_kedisiplinan ?? null,
        soft_kerajinan_inisiatif: item.soft_kerajinan_inisiatif ?? null,
        soft_kerjasama: item.soft_kerjasama ?? null,
        soft_kejujuran: item.soft_kejujuran ?? null,
        soft_tanggung_jawab: item.soft_tanggung_jawab ?? null,
        nilai_akhir_pkl: item.nilai_akhir_pkl ?? null,
        predikat_pkl: item.predikat_pkl || '-',
        catatan_pkl: item.catatan_pkl || '',
        sakit_pkl: item.sakit_pkl ?? 0,
        izin_pkl: item.izin_pkl ?? 0,
        alpa_pkl: item.alpa_pkl ?? 0,
        nomor_sertifikat: item.nomor_sertifikat || '',
        deskripsi_tp: item.deskripsi_tp || '',
      })));
    }
  }, [pklRekap]);

  // Upsert Batch Mutation
  const saveBatchMutation = useMutation({
    mutationFn: hubinApi.upsertNilaiPklBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      toast.success('Nilai PKL & data sertifikat sekelas berhasil disimpan!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan nilai PKL');
    }
  });

  // Save Setting TP Mutation
  const saveDeskripsiTpMutation = useMutation({
    mutationFn: hubinApi.upsertSettingDeskripsiPkl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deskripsi-tp-list'] });
      toast.success('Deskripsi Tujuan Pembelajaran PKL berhasil disimpan!');
      setDeskripsiTpText('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan deskripsi TP PKL');
    }
  });

  // Handle Score Input Change with Auto-Calc
  const handleScoreChange = (index: number, field: string, val: any) => {
    setScores(prev => {
      const clone = [...prev];
      const target = { ...clone[index] };

      if (field.startsWith('hard_') || field.startsWith('soft_')) {
        const num = val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0));
        target[field] = num;

        // Auto Calc Nilai Akhir PKL & Predikat
        const gradeList = [
          target.hard_kompetensi_teknis,
          target.hard_sop_k3lh,
          target.hard_alur_bisnis,
          target.soft_kedisiplinan,
          target.soft_kerajinan_inisiatif,
          target.soft_kerjasama,
          target.soft_kejujuran,
          target.soft_tanggung_jawab,
        ].filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

        if (gradeList.length > 0) {
          const sum = gradeList.reduce((a, b) => a + b, 0);
          target.nilai_akhir_pkl = Number((sum / gradeList.length).toFixed(2));

          if (target.nilai_akhir_pkl >= 90) target.predikat_pkl = 'Sangat Baik';
          else if (target.nilai_akhir_pkl >= 80) target.predikat_pkl = 'Baik';
          else if (target.nilai_akhir_pkl >= 70) target.predikat_pkl = 'Cukup';
          else target.predikat_pkl = 'Kurang';
        }
      } else {
        target[field] = val;
      }

      clone[index] = target;
      return clone;
    });
  };

  const handleSaveAll = () => {
    if (!selectedKelas) {
      toast.error('Pilih kelas terlebih dahulu');
      return;
    }
    saveBatchMutation.mutate(scores);
  };

  // Process Excel Paste (TSV)
  const handleProcessPaste = () => {
    if (!pasteRawText.trim()) {
      toast.error('Data paste masih kosong');
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
        const idx = clone.findIndex(
          s => s.nis.toLowerCase() === nisOrNama || s.nama_siswa.toLowerCase().includes(nisOrNama)
        );

        if (idx !== -1) {
          const target = { ...clone[idx] };
          if (parts[1]) target.hard_kompetensi_teknis = parseFloat(parts[1]) || null;
          if (parts[2]) target.hard_sop_k3lh = parseFloat(parts[2]) || null;
          if (parts[3]) target.hard_alur_bisnis = parseFloat(parts[3]) || null;
          if (parts[4]) target.soft_kedisiplinan = parseFloat(parts[4]) || null;
          if (parts[5]) target.soft_kerajinan_inisiatif = parseFloat(parts[5]) || null;
          if (parts[6]) target.soft_kerjasama = parseFloat(parts[6]) || null;
          if (parts[7]) target.soft_kejujuran = parseFloat(parts[7]) || null;
          if (parts[8]) target.soft_tanggung_jawab = parseFloat(parts[8]) || null;
          if (parts[9]) target.catatan_pkl = parts[9];

          // Re-calc
          const gradeList = [
            target.hard_kompetensi_teknis,
            target.hard_sop_k3lh,
            target.hard_alur_bisnis,
            target.soft_kedisiplinan,
            target.soft_kerajinan_inisiatif,
            target.soft_kerjasama,
            target.soft_kejujuran,
            target.soft_tanggung_jawab,
          ].filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

          if (gradeList.length > 0) {
            const sum = gradeList.reduce((a, b) => a + b, 0);
            target.nilai_akhir_pkl = Number((sum / gradeList.length).toFixed(2));
            if (target.nilai_akhir_pkl >= 90) target.predikat_pkl = 'Sangat Baik';
            else if (target.nilai_akhir_pkl >= 80) target.predikat_pkl = 'Baik';
            else if (target.nilai_akhir_pkl >= 70) target.predikat_pkl = 'Cukup';
            else target.predikat_pkl = 'Kurang';
          }

          clone[idx] = target;
          updatedCount++;
        }
      });
      return clone;
    });

    toast.success(`Berhasil mencocokkan & memperbarui ${updatedCount} baris data PKL dari Excel!`);
    setShowPasteModal(false);
    setPasteRawText('');
  };

  // Open Certificate Preview Modal
  const handleOpenCertificate = async (siswaPklId: string) => {
    try {
      const res = await hubinApi.getSertifikatPklData(siswaPklId);
      setSelectedSiswaSertifikat(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data sertifikat');
    }
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Hubin', href: '/hubin/dashboard' },
    { label: 'Penilaian & Sertifikat PKL (Semester 5)' }
  ], []);

  return (
    <AcademicPageLayout
      title="Rapor & Sertifikat PKL (Semester 5)"
      description="Pengisian Nilai Hard Skill, Soft Skill, dan Penerbitan Sertifikat PKL Resmi DUDI."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="inputnilaipklpage"
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('nilai')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'nilai'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Award size={16} />
            Input Nilai PKL Sekelas
          </button>
          <button
            onClick={() => setActiveTab('deskripsi')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'deskripsi'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText size={16} />
            Setting Deskripsi TP DUDI (Kaprog/Kajur)
          </button>
        </div>

        {activeTab === 'nilai' ? (
          <div className="space-y-6">
            
            {/* Filter Kelas */}
            <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 w-full sm:w-80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Layers size={12} /> Pilih Kelas XII Rombel PKL
                  </label>
                  <select
                    value={selectedKelas}
                    onChange={(e) => setSelectedKelas(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Rombel Kelas --</option>
                    {classes?.data?.map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={() => setShowPasteModal(true)}
                    variant="outline"
                    className="border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 rounded-xl font-bold text-xs"
                  >
                    <ClipboardPaste className="w-4 h-4 mr-1.5" />
                    Paste dari Excel
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={saveBatchMutation.isPending || scores.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    SIMPAN SEMUA NILAI PKL
                  </Button>
                </div>
              </div>
            </Card>

            {/* Grid Table Input Nilai PKL */}
            <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
              {isLoadingRekap || isLoadingPkl ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">Menarik data rekap penempatan PKL...</div>
              ) : scores.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">
                  {selectedKelas ? 'Belum ada siswa yang ditempatkan PKL di rombel ini.' : 'Belum ada data penempatan PKL tersedia.'}
                </div>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                          <th className="py-2.5 px-2">No</th>
                          <th className="py-2.5 px-2">Siswa & DUDI</th>
                          <th className="py-2.5 px-1 text-center bg-indigo-50/40 dark:bg-indigo-950/20" colSpan={3}>HARD SKILLS (0-100)</th>
                          <th className="py-2.5 px-1 text-center bg-emerald-50/40 dark:bg-emerald-950/20" colSpan={5}>SOFT SKILLS (0-100)</th>
                          <th className="py-2.5 px-2 text-center text-indigo-600 dark:text-indigo-400">NILAI AKHIR</th>
                          <th className="py-2.5 px-2 text-center">PREDIKAT</th>
                          <th className="py-2.5 px-2">Catatan Evaluasi</th>
                          <th className="py-2.5 px-2 text-center">SERTIFIKAT</th>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[8px] font-bold">
                          <th></th>
                          <th></th>
                          <th className="text-center px-1">Teknis</th>
                          <th className="text-center px-1">K3LH</th>
                          <th className="text-center px-1">Bisnis</th>
                          <th className="text-center px-1">Disiplin</th>
                          <th className="text-center px-1">Kerajinan</th>
                          <th className="text-center px-1">Teamwork</th>
                          <th className="text-center px-1">Jujur</th>
                          <th className="text-center px-1">TanggungJwb</th>
                          <th></th>
                          <th></th>
                          <th></th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((score, index) => (
                          <tr key={score.siswa_pkl_id} className="border-b border-slate-50 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            <td className="py-3 px-2 font-bold text-slate-400">{index + 1}</td>
                            <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200 max-w-xs">
                              {score.nama_siswa}
                              <span className="block text-[9px] text-indigo-600 dark:text-indigo-400 font-bold truncate">🏢 {score.mitra_nama}</span>
                            </td>

                            {/* Hard Skills */}
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.hard_kompetensi_teknis ?? ''}
                                onChange={(e) => handleScoreChange(index, 'hard_kompetensi_teknis', e.target.value)}
                                className="w-14 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.hard_sop_k3lh ?? ''}
                                onChange={(e) => handleScoreChange(index, 'hard_sop_k3lh', e.target.value)}
                                className="w-14 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.hard_alur_bisnis ?? ''}
                                onChange={(e) => handleScoreChange(index, 'hard_alur_bisnis', e.target.value)}
                                className="w-14 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>

                            {/* Soft Skills */}
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.soft_kedisiplinan ?? ''}
                                onChange={(e) => handleScoreChange(index, 'soft_kedisiplinan', e.target.value)}
                                className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.soft_kerajinan_inisiatif ?? ''}
                                onChange={(e) => handleScoreChange(index, 'soft_kerajinan_inisiatif', e.target.value)}
                                className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.soft_kerjasama ?? ''}
                                onChange={(e) => handleScoreChange(index, 'soft_kerjasama', e.target.value)}
                                className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.soft_kejujuran ?? ''}
                                onChange={(e) => handleScoreChange(index, 'soft_kejujuran', e.target.value)}
                                className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number" min={0} max={100}
                                value={score.soft_tanggung_jawab ?? ''}
                                onChange={(e) => handleScoreChange(index, 'soft_tanggung_jawab', e.target.value)}
                                className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5 focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            {/* Nilai Akhir & Predikat */}
                            <td className="py-2 px-2 text-center font-black text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-900/40 rounded-lg">
                              {score.nilai_akhir_pkl ?? '-'}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                                {score.predikat_pkl}
                              </span>
                            </td>

                            {/* Catatan */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                placeholder="Catatan evaluasi PKL..."
                                value={score.catatan_pkl}
                                onChange={(e) => handleScoreChange(index, 'catatan_pkl', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium p-1.5"
                              />
                            </td>

                            {/* Tombol Cetak Sertifikat */}
                            <td className="py-2 px-2 text-center">
                              <Button
                                type="button"
                                onClick={() => handleOpenCertificate(score.siswa_pkl_id)}
                                variant="outline"
                                className="border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 p-1.5 rounded-lg text-[10px] font-bold"
                              >
                                <Printer size={14} className="mr-1" /> SERTIFIKAT
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

          </div>
        ) : (
          /* Tab 2: Setting Deskripsi TP PKL per DUDI (Kaprog / Kajur) */
          <Card className="p-6 border-none shadow-sm dark:bg-slate-900/40 space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <Building2 size={18} className="text-indigo-500" />
                Pengaturan Deskripsi Tujuan Pembelajaran (TP) PKL
              </h3>
              <p className="text-xs text-slate-400">Diisi oleh Kepala Program Keahlian (Kaprog/Kajur) untuk narasi yang dicetak pada Sertifikat PKL.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Pilih Perusahaan / DUDI Mitra</label>
                  <select
                    value={selectedMitra}
                    onChange={(e) => setSelectedMitra(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold p-3 text-slate-800 dark:text-white"
                  >
                    <option value="">-- Semua Mitra DUDI --</option>
                    {mitraOptions?.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Deskripsi Tujuan Pembelajaran (TP) PKL</label>
                  <textarea
                    rows={6}
                    value={deskripsiTpText}
                    onChange={(e) => setDeskripsiTpText(e.target.value)}
                    placeholder="Peserta didik diharapkan mampu memahami dan mempraktikkan perawatan berkala kendaraan serta penerapan SOP industri..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <Button
                  onClick={() => {
                    if (!selectedMitra || !deskripsiTpText) {
                      toast.error('Pilih Mitra dan isi Deskripsi TP');
                      return;
                    }
                    saveDeskripsiTpMutation.mutate({
                      mitra_id: selectedMitra,
                      deskripsi_tp: deskripsiTpText,
                    });
                  }}
                  disabled={saveDeskripsiTpMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl h-11"
                >
                  <Save className="w-4 h-4 mr-2" />
                  SIMPAN DESKRIPSI TP DUDI
                </Button>
              </div>

              {/* Daftar Setting TP */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Daftar Deskripsi TP DUDI Tersimpan</h4>
                {deskripsiList?.data?.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs italic">Belum ada deskripsi TP tersimpan.</div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {deskripsiList?.data?.map((item: any) => (
                      <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">🏢 {item.Mitra?.nama}</div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{item.deskripsi_tp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Modal Paste dari Excel */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Paste Data Nilai PKL dari Excel</h3>
                </div>
                <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Copy kolom dari Excel dalam urutan tab berikut: <br />
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    NIS | Teknis | K3LH | Bisnis | Disiplin | Kerajinan | Teamwork | Jujur | TanggungJwb | Catatan
                  </strong>
                </p>

                <textarea
                  rows={8}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder={`Contoh:\n2324100289\t90\t90\t85\t90\t90\t90\t90\t90\tSangat disiplin dan bertanggunjawab`}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowPasteModal(false)} className="rounded-xl text-xs font-bold">Batal</Button>
                <Button type="button" onClick={handleProcessPaste} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                  <Sparkles className="w-4 h-4 mr-1.5" /> PROSES & PASANG KE TABEL
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Certificate Print Preview */}
        {selectedSiswaSertifikat && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-8 space-y-6 shadow-2xl relative border border-slate-100 dark:border-slate-800 my-8">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <Award size={24} className="text-amber-500" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Pratinjau Sertifikat Praktik Kerja Lapangan (PKL)</h3>
                    <p className="text-xs text-slate-400">Nomor: {selectedSiswaSertifikat.nomor_sertifikat}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Printer className="w-4 h-4 mr-1.5" /> CETAK SERTIFIKAT
                  </Button>
                  <button onClick={() => setSelectedSiswaSertifikat(null)} className="text-slate-400 hover:text-slate-600 p-2 font-bold">✕</button>
                </div>
              </div>

              {/* Document Certificate Layout Preview */}
              <div className="border-4 border-double border-amber-600/30 p-8 rounded-2xl bg-amber-50/10 space-y-6 text-center text-slate-800 dark:text-slate-100 font-serif">
                <div className="uppercase text-xs font-bold tracking-widest text-slate-500">PEMERINTAH DAERAH PROVINSI JAWA BARAT</div>
                <div className="text-lg font-black text-slate-900 dark:text-white tracking-wide">SERTIFIKAT PRAKTIK KERJA LAPANGAN</div>
                <div className="text-xs text-slate-500 font-sans">Nomor: {selectedSiswaSertifikat.nomor_sertifikat}</div>

                <p className="text-xs font-sans leading-relaxed pt-2">
                  Diberikan kepada:
                </p>
                <div className="text-xl font-bold underline decoration-amber-500 text-indigo-950 dark:text-indigo-200">
                  {selectedSiswaSertifikat.Siswa?.nama_siswa}
                </div>
                <p className="text-xs font-sans text-slate-500">
                  NIS / NISN: {selectedSiswaSertifikat.Siswa?.nis} / {selectedSiswaSertifikat.Siswa?.nisn || '-'}
                </p>

                <p className="text-xs font-sans max-w-xl mx-auto leading-relaxed text-slate-700 dark:text-slate-300">
                  Telah melaksanakan Praktik Kerja Lapangan (PKL) di <strong>{selectedSiswaSertifikat.Mitra?.nama}</strong> dengan hasil kualifikasi:
                </p>

                <div className="inline-block px-6 py-2 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 rounded-full font-sans font-bold text-sm">
                  Predikat: {selectedSiswaSertifikat.predikat_pkl || 'Baik'} ({selectedSiswaSertifikat.nilai_akhir_pkl || 0}/100)
                </div>

                {/* TTD Footer */}
                <div className="grid grid-cols-2 gap-8 pt-8 text-xs font-sans border-t border-amber-200 dark:border-slate-800">
                  <div>
                    <p className="text-slate-500">Pimpinan / Instruktur Industri</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{selectedSiswaSertifikat.penanggung_jawab_nama || selectedSiswaSertifikat.instruktur_nama || 'Pimpinan DUDI'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Kepala SMKN 1 Plered</p>
                    <div className="h-16"></div>
                    <p className="font-bold">H. Asep Setiawan, S.Pd., M.M.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </AcademicPageLayout>
  );
});
