import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Save, 
  Layers, 
  ClipboardPaste, 
  Sparkles, 
  Award, 
  Printer,
  CheckCircle2,
  Users
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Card, SectionCard, Button, SearchableSelect } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { hubinApi } from '../../api/hubin.api';
import { kelasApi } from '../../api/academic.api';
import { toast } from 'sonner';
import { useDudiOptions } from '../../hooks/useDudiOptions';

// Zod Schema Validation Guard (Pilar 25)
const scoreFieldSchema = z.number().min(0).max(100).nullable();
const deskripsiTpSchema = z.object({
  mitra_id: z.string().min(1, 'Mitra DUDI wajib dipilih'),
  deskripsi_tp: z.string().min(5, 'Deskripsi TP minimal 5 karakter'),
});

interface ScoreRow {
  siswa_pkl_id: string;
  nama_siswa: string;
  nis: string;
  mitra_nama: string;
  instruktur_nama: string;
  penanggung_jawab_nama: string;
  alamat_dudi: string;
  hard_kompetensi_teknis: number | null;
  hard_sop_k3lh: number | null;
  hard_alur_bisnis: number | null;
  soft_kedisiplinan: number | null;
  soft_kerajinan_inisiatif: number | null;
  soft_kerjasama: number | null;
  soft_kejujuran: number | null;
  soft_tanggung_jawab: number | null;
  nilai_akhir_pkl: number | null;
  predikat_pkl: string;
  catatan_pkl: string;
  sakit_pkl: number;
  izin_pkl: number;
  alpa_pkl: number;
  nomor_sertifikat: string;
  deskripsi_tp: string;
}

interface RawPklItem {
  id?: string;
  siswa_pkl_id?: string;
  Siswa?: { nama_siswa?: string; nis?: string; nisn?: string };
  siswa_nama?: string;
  nis?: string;
  Mitra?: { nama?: string; alamat?: string };
  mitra_nama?: string;
  instruktur_nama?: string;
  penanggung_jawab_nama?: string;
  alamat_dudi?: string;
  hard_kompetensi_teknis?: number | null;
  hard_sop_k3lh?: number | null;
  hard_alur_bisnis?: number | null;
  soft_kedisiplinan?: number | null;
  soft_kerajinan_inisiatif?: number | null;
  soft_kerjasama?: number | null;
  soft_kejujuran?: number | null;
  soft_tanggung_jawab?: number | null;
  nilai_akhir_pkl?: number | null;
  predikat_pkl?: string;
  catatan_pkl?: string;
  sakit_pkl?: number;
  izin_pkl?: number;
  alpa_pkl?: number;
  nomor_sertifikat?: string;
  deskripsi_tp?: string;
}

export const InputNilaiPklPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'nilai' | 'deskripsi'>('nilai');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMitra, setSelectedMitra] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [selectedSiswaSertifikat, setSelectedSiswaSertifikat] = useState<ScoreRow | null>(null);

  // Deskripsi TP Form State
  const [deskripsiTpText, setDeskripsiTpText] = useState('');

  // Fetch Classes
  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => kelasApi.getAll()
  });

  const classOptions = useMemo(() => {
    const raw = (classesData as { data?: Array<{ id: string; nama_kelas: string }> })?.data || 
                (Array.isArray(classesData) ? classesData : []);
    return (raw ?? [])?.map((k: { id: string; nama_kelas: string }) => ({
      value: k.id,
      label: k.nama_kelas
    }));
  }, [classesData]);

  // Integrated Custom Hooks (Pilar 31 Data Layer)
  const { options: mitraOptions } = useDudiOptions();

  const { data: pklRekap, isLoading: isLoadingRekap } = useQuery({
    queryKey: ['pkl-rekap', selectedKelas],
    queryFn: () => hubinApi.getRekapPklSiswa({ kelas_id: selectedKelas || undefined }),
  });

  // Fetch Setting Deskripsi TP List
  const { data: deskripsiList, isLoading: isLoadingDeskripsi } = useQuery({
    queryKey: ['deskripsi-tp-list', selectedMitra],
    queryFn: () => hubinApi.getSettingDeskripsiPklList({ mitra_id: selectedMitra || undefined }),
  });

  // Scores Grid State
  const [scores, setScores] = useState<ScoreRow[]>([]);

  useEffect(() => {
    const rawResponse = pklRekap as { data?: RawPklItem[] | { list?: RawPklItem[] } } | RawPklItem[] | undefined;
    const rawList = Array.isArray((rawResponse as { data?: RawPklItem[] })?.data) 
      ? (rawResponse as { data: RawPklItem[] }).data 
      : Array.isArray(rawResponse) 
      ? rawResponse 
      : (rawResponse as { data?: { list?: RawPklItem[] } })?.data?.list || [];

    if (Array.isArray(rawList)) {
      setScores(rawList?.map((item: RawPklItem) => ({
        siswa_pkl_id: item.id || item.siswa_pkl_id || '',
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
    onError: () => {
      toast.error('Gagal menyimpan nilai PKL');
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
    onError: () => {
      toast.error('Gagal menyimpan deskripsi TP PKL');
    }
  });

  // Handle Score Input Change with Auto-Calc
  const handleScoreChange = useCallback((index: number, field: keyof ScoreRow, val: string) => {
    setScores(prev => {
      const clone = [...prev];
      const target = { ...clone[index] };

      if (field.startsWith('hard_') || field.startsWith('soft_')) {
        const parsedVal = val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0));
        scoreFieldSchema.parse(parsedVal);
        (target as Record<string, unknown>)[field] = parsedVal;

        // Auto Calc Nilai Akhir PKL & Predikat
        const gradeList = [
          target.hard_kompetensi_teknis,
          target.hard_sop_k3lh,
          target.hard_alur_bisnis,
          target.soft_kedisiplinan,
          target.soft_kerajinan_inisiatif,
          target.soft_kerjasama,
          target.soft_kejujuran,
          target.soft_tanggung_jawab
        ].filter(g => typeof g === 'number' && g !== null) as number[];

        if (gradeList.length > 0) {
          const avg = gradeList.reduce((a, b) => a + b, 0) / gradeList.length;
          target.nilai_akhir_pkl = Math.round(avg * 10) / 10;

          if (target.nilai_akhir_pkl >= 90) target.predikat_pkl = 'Amat Baik';
          else if (target.nilai_akhir_pkl >= 80) target.predikat_pkl = 'Baik';
          else if (target.nilai_akhir_pkl >= 70) target.predikat_pkl = 'Cukup';
          else target.predikat_pkl = 'Kurang';
        } else {
          target.nilai_akhir_pkl = null;
          target.predikat_pkl = '-';
        }
      } else {
        (target as Record<string, unknown>)[field] = val;
      }

      clone[index] = target;
      return clone;
    });
  }, []);

  const handleProcessPaste = useCallback(() => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.trim().split('\n');
    let matchedCount = 0;

    setScores(prev => {
      const clone = [...prev];
      lines.forEach(line => {
        const parts = line.split('\t')?.map(p => p.trim());
        if (parts.length >= 2) {
          const nis = parts[0];
          const idx = clone.findIndex(s => s.nis === nis);
          if (idx !== -1) {
            matchedCount++;
            const t = { ...clone[idx] };
            if (parts[1] !== undefined && parts[1] !== '') t.hard_kompetensi_teknis = parseFloat(parts[1]) || null;
            if (parts[2] !== undefined && parts[2] !== '') t.hard_sop_k3lh = parseFloat(parts[2]) || null;
            if (parts[3] !== undefined && parts[3] !== '') t.hard_alur_bisnis = parseFloat(parts[3]) || null;
            if (parts[4] !== undefined && parts[4] !== '') t.soft_kedisiplinan = parseFloat(parts[4]) || null;
            if (parts[5] !== undefined && parts[5] !== '') t.soft_kerajinan_inisiatif = parseFloat(parts[5]) || null;
            if (parts[6] !== undefined && parts[6] !== '') t.soft_kerjasama = parseFloat(parts[6]) || null;
            if (parts[7] !== undefined && parts[7] !== '') t.soft_kejujuran = parseFloat(parts[7]) || null;
            if (parts[8] !== undefined && parts[8] !== '') t.soft_tanggung_jawab = parseFloat(parts[8]) || null;
            if (parts[9] !== undefined && parts[9] !== '') t.catatan_pkl = parts[9];

            // Re-calculate
            const gradeList = [
              t.hard_kompetensi_teknis,
              t.hard_sop_k3lh,
              t.hard_alur_bisnis,
              t.soft_kedisiplinan,
              t.soft_kerajinan_inisiatif,
              t.soft_kerjasama,
              t.soft_kejujuran,
              t.soft_tanggung_jawab
            ].filter(g => typeof g === 'number' && g !== null) as number[];

            if (gradeList.length > 0) {
              const avg = gradeList.reduce((a, b) => a + b, 0) / gradeList.length;
              t.nilai_akhir_pkl = Math.round(avg * 10) / 10;
              if (t.nilai_akhir_pkl >= 90) t.predikat_pkl = 'Amat Baik';
              else if (t.nilai_akhir_pkl >= 80) t.predikat_pkl = 'Baik';
              else if (t.nilai_akhir_pkl >= 70) t.predikat_pkl = 'Cukup';
              else t.predikat_pkl = 'Kurang';
            }

            clone[idx] = t;
          }
        }
      });
      return clone;
    });

    toast.success(`Berhasil memetakan ${matchedCount} data siswa dari Excel!`);
    setShowPasteModal(false);
    setPasteRawText('');
  }, [pasteRawText]);

  const handleSaveBatch = useCallback(() => {
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }
    saveBatchMutation.mutate({
      kelas_id: selectedKelas || undefined,
      scores: scores?.map(s => ({
        siswa_pkl_id: s.siswa_pkl_id,
        hard_kompetensi_teknis: s.hard_kompetensi_teknis,
        hard_sop_k3lh: s.hard_sop_k3lh,
        hard_alur_bisnis: s.hard_alur_bisnis,
        soft_kedisiplinan: s.soft_kedisiplinan,
        soft_kerajinan_inisiatif: s.soft_kerajinan_inisiatif,
        soft_kerjasama: s.soft_kerjasama,
        soft_kejujuran: s.soft_kejujuran,
        soft_tanggung_jawab: s.soft_tanggung_jawab,
        nilai_akhir_pkl: s.nilai_akhir_pkl,
        predikat_pkl: s.predikat_pkl,
        catatan_pkl: s.catatan_pkl,
        sakit_pkl: s.sakit_pkl,
        izin_pkl: s.izin_pkl,
        alpa_pkl: s.alpa_pkl,
        nomor_sertifikat: s.nomor_sertifikat,
        instruktur_nama: s.instruktur_nama,
        penanggung_jawab_nama: s.penanggung_jawab_nama,
        alamat_dudi: s.alamat_dudi
      }))
    });
  }, [scores, selectedKelas, saveBatchMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Hubin & PKL', path: '/hubin/workspace' },
    { label: 'Penilaian PKL' }
  ], []);

  const deskripsiListData = useMemo(() => {
    const raw = (deskripsiList as { data?: Array<{ id: string; Mitra?: { nama: string }; deskripsi_tp: string }> })?.data;
    return Array.isArray(raw) ? raw : [];
  }, [deskripsiList]);

  const tabs = useMemo(() => [
    { id: 'nilai', label: 'Entri Nilai & Sertifikat Siswa' },
    { id: 'deskripsi', label: 'Pengaturan Deskripsi TP DUDI' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Penilaian & Sertifikasi PKL Siswa"
      description="Kelola penilaian hard skills, soft skills, catatan instruktur industri, dan sertifikat resmi PKL siswa."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Penilaian & Sertifikasi Praktik Kerja Lapangan (PKL)"
          description="Entri nilai hard skills & soft skills, catatan instruktur DUDI, serta pratinjau sertifikat resmi PKL siswa."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="hubin_input_nilai_pkl"
          topSlot={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleSaveBatch}
                disabled={saveBatchMutation.isPending || scores.length === 0}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                {saveBatchMutation.isPending ? 'Menyimpan...' : 'Simpan Nilai PKL'}
              </Button>
            </div>
          }
          instruction={{
            title: "Panduan Penilaian PKL",
            description: "Gunakan modul ini untuk memasukkan capaian kompetensi siswa di DUDI mitra.",
            items: [
              { text: "Pilih kelas untuk memuat daftar siswa yang sedang atau telah menyelesaikan masa PKL." },
              { text: "Gunakan fitur Paste dari Excel untuk mempercepat entri massal nilai dari instruktur industri." },
              { text: "Klik tombol Sertifikat pada baris siswa untuk mencetak sertifikat resmi PKL." }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6">
              {/* Tab Switcher Component */}
              <TabSwitcher
                activeTab={activeTab}
                onChange={(t) => setActiveTab(t as 'nilai' | 'deskripsi')}
                tabs={tabs}
              />

              {activeTab === 'nilai' ? (
                <div className="space-y-4">
                  {/* Filter & Action Card */}
                  <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div className="flex-1 max-w-xs">
                        <label htmlFor="filter-kelas-pkl" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Filter Kelas Siswa
                        </label>
                        <SearchableSelect
                          id="filter-kelas-pkl"
                          aria-label="Pilih kelas siswa PKL"
                          value={selectedKelas}
                          onValueChange={setSelectedKelas}
                          options={[
                            { value: '', label: '-- Semua Kelas PKL --' },
                            ...classOptions
                          ]}
                          placeholder="Pilih Kelas"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPasteModal(true)}
                          className="flex items-center gap-1.5 text-xs font-bold rounded-xl"
                        >
                          <ClipboardPaste size={14} className="text-emerald-500" />
                          Paste dari Excel
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Grid Table */}
                  <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden p-0 bg-white dark:bg-slate-900">
                    {isLoadingRekap ? (
                      <div className="text-center py-20 text-xs text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
                        Memuat data penilaian PKL siswa...
                      </div>
                    ) : scores.length === 0 ? (
                      <div className="text-center py-20 text-xs text-slate-400">
                        Belum ada data penempatan PKL aktif pada kelas ini.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-3 text-center w-12">No</th>
                              <th className="p-3 min-w-[160px]">Siswa & Mitra DUDI</th>
                              <th className="p-3 text-center min-w-[80px]">Teknis</th>
                              <th className="p-3 text-center min-w-[80px]">K3LH</th>
                              <th className="p-3 text-center min-w-[80px]">Bisnis</th>
                              <th className="p-3 text-center min-w-[80px]">Disiplin</th>
                              <th className="p-3 text-center min-w-[80px]">Kerjasama</th>
                              <th className="p-3 text-center min-w-[80px]">Tanggung Jwb</th>
                              <th className="p-3 text-center min-w-[80px]">Nilai Akhir</th>
                              <th className="p-3 text-center min-w-[80px]">Predikat</th>
                              <th className="p-3 min-w-[140px]">Catatan Evaluasi</th>
                              <th className="p-3 text-center min-w-[100px]">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {scores?.map((score, index) => (
                              <tr key={score.siswa_pkl_id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                <td className="p-3 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                                <td className="p-3">
                                  <p className="font-bold text-slate-900 dark:text-white">{score.nama_siswa}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">NIS: {score.nis}</p>
                                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">🏢 {score.mitra_nama}</p>
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    id={`score-tek-${index}`}
                                    aria-label={`Nilai teknis ${score.nama_siswa}`}
                                    type="number" min={0} max={100}
                                    value={score.hard_kompetensi_teknis ?? ''}
                                    onChange={(e) => handleScoreChange(index, 'hard_kompetensi_teknis', e.target.value)}
                                    className="w-14 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-1.5"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    id={`score-k3-${index}`}
                                    aria-label={`Nilai K3LH ${score.nama_siswa}`}
                                    type="number" min={0} max={100}
                                    value={score.hard_sop_k3lh ?? ''}
                                    onChange={(e) => handleScoreChange(index, 'hard_sop_k3lh', e.target.value)}
                                    className="w-14 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-1.5"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    id={`score-bis-${index}`}
                                    aria-label={`Nilai alur bisnis ${score.nama_siswa}`}
                                    type="number" min={0} max={100}
                                    value={score.hard_alur_bisnis ?? ''}
                                    onChange={(e) => handleScoreChange(index, 'hard_alur_bisnis', e.target.value)}
                                    className="w-14 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-center p-1.5"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    id={`score-dis-${index}`}
                                    aria-label={`Nilai kedisiplinan ${score.nama_siswa}`}
                                    type="number" min={0} max={100}
                                    value={score.soft_kedisiplinan ?? ''}
                                    onChange={(e) => handleScoreChange(index, 'soft_kedisiplinan', e.target.value)}
                                    className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    id={`score-ker-${index}`}
                                    aria-label={`Nilai kerjasama ${score.nama_siswa}`}
                                    type="number" min={0} max={100}
                                    value={score.soft_kerjasama ?? ''}
                                    onChange={(e) => handleScoreChange(index, 'soft_kerjasama', e.target.value)}
                                    className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    id={`score-tgj-${index}`}
                                    aria-label={`Nilai tanggung jawab ${score.nama_siswa}`}
                                    type="number" min={0} max={100}
                                    value={score.soft_tanggung_jawab ?? ''}
                                    onChange={(e) => handleScoreChange(index, 'soft_tanggung_jawab', e.target.value)}
                                    className="w-14 bg-emerald-50/50 dark:bg-emerald-950/20 border-none rounded-lg text-xs font-bold text-center p-1.5"
                                  />
                                </td>

                                <td className="p-2 text-center font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                  {score.nilai_akhir_pkl ?? '-'}
                                </td>

                                <td className="p-2 text-center">
                                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                                    {score.predikat_pkl}
                                  </span>
                                </td>

                                <td className="p-2">
                                  <input
                                    id={`score-cat-${index}`}
                                    aria-label={`Catatan evaluasi ${score.nama_siswa}`}
                                    type="text"
                                    placeholder="Catatan evaluasi..."
                                    value={score.catatan_pkl}
                                    onChange={(e) => handleScoreChange(index, 'catatan_pkl', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium p-1.5"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() => setSelectedSiswaSertifikat(score)}
                                    className="text-[10px] font-bold flex items-center gap-1 mx-auto"
                                  >
                                    <Printer size={12} />
                                    Sertifikat
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
                /* Tab 2: Deskripsi TP PKL */
                <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Building2 size={18} className="text-indigo-500" />
                      Pengaturan Deskripsi Tujuan Pembelajaran (TP) PKL
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Diisi oleh Ketua Program Keahlian untuk narasi kompetensi yang dicetak pada sertifikat PKL.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="tp-mitra-select" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Pilih Perusahaan / Mitra DUDI
                        </label>
                        <SearchableSelect
                          id="tp-mitra-select"
                          aria-label="Pilih mitra DUDI untuk deskripsi TP"
                          value={selectedMitra}
                          onValueChange={setSelectedMitra}
                          options={[
                            { value: '', label: '-- Semua Mitra DUDI --' },
                            ...mitraOptions
                          ]}
                          placeholder="Pilih Mitra DUDI"
                        />
                      </div>

                      <div>
                        <label htmlFor="tp-deskripsi-text" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Deskripsi Capaian Pembelajaran PKL
                        </label>
                        <textarea
                          id="tp-deskripsi-text"
                          aria-label="Deskripsi capaian pembelajaran PKL"
                          rows={6}
                          value={deskripsiTpText}
                          onChange={(e) => setDeskripsiTpText(e.target.value)}
                          placeholder="Peserta didik mampu memahami dan mempraktikkan SOP industri..."
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-medium"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          const parsed = deskripsiTpSchema.safeParse({
                            mitra_id: selectedMitra,
                            deskripsi_tp: deskripsiTpText,
                          });
                          if (!parsed.success) {
                            toast.error(parsed.error.errors[0]?.message || 'Data TP belum lengkap');
                            return;
                          }
                          saveDeskripsiTpMutation.mutate({
                            mitra_id: selectedMitra,
                            deskripsi_tp: deskripsiTpText,
                          });
                        }}
                        disabled={saveDeskripsiTpMutation.isPending}
                        className="w-full font-bold rounded-xl text-xs"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        {saveDeskripsiTpMutation.isPending ? 'Menyimpan...' : 'Simpan Deskripsi TP DUDI'}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Daftar Deskripsi TP DUDI Tersimpan
                      </h4>
                      {isLoadingDeskripsi ? (
                        <div className="text-center py-10 text-slate-400 text-xs">Memuat deskripsi...</div>
                      ) : deskripsiListData.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs italic">Belum ada deskripsi TP tersimpan.</div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {deskripsiListData?.map((item) => (
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
            </div>
          </SectionCard>
        </AcademicPageLayout>

        {/* Modal Paste Excel */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Paste Data Nilai PKL dari Excel</h3>
                </div>
                <button type="button" onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Salin kolom dari Excel dengan urutan format: <br />
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    NIS [TAB] Teknis [TAB] K3LH [TAB] Bisnis [TAB] Disiplin [TAB] Inisiatif [TAB] Kerjasama [TAB] Jujur [TAB] TanggungJwb [TAB] Catatan
                  </strong>
                </p>

                <textarea
                  id="paste-excel-text"
                  aria-label="Area paste data dari Excel"
                  rows={8}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder="2324100289&#9;90&#9;90&#9;85&#9;90&#9;90&#9;90&#9;90&#9;90&#9;Sangat disiplin"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowPasteModal(false)} className="rounded-xl text-xs font-bold">Batal</Button>
                <Button type="button" variant="primary" onClick={handleProcessPaste} className="rounded-xl text-xs font-bold">
                  <Sparkles className="w-4 h-4 mr-1.5" /> Pasang ke Tabel
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
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Pratinjau Sertifikat PKL Siswa</h3>
                    <p className="text-xs text-slate-400">Nomor: {selectedSiswaSertifikat.nomor_sertifikat || 'DRAFT/PKL/' + selectedSiswaSertifikat.nis}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => window.print()}
                    className="text-xs font-bold rounded-xl"
                  >
                    <Printer className="w-4 h-4 mr-1.5" /> Cetak Sertifikat
                  </Button>
                  <button type="button" onClick={() => setSelectedSiswaSertifikat(null)} className="text-slate-400 hover:text-slate-600 p-2 font-bold">✕</button>
                </div>
              </div>

              {/* Certificate Layout */}
              <div className="border-4 border-double border-amber-600/30 p-8 rounded-2xl bg-amber-50/10 space-y-6 text-center text-slate-800 dark:text-slate-100 font-serif">
                <div className="uppercase text-xs font-bold tracking-widest text-slate-500">DINAS PENDIDIKAN PROVINSI JAWA BARAT</div>
                <div className="text-lg font-black text-slate-900 dark:text-white tracking-wide">SERTIFIKAT PRAKTIK KERJA LAPANGAN</div>
                <div className="text-xs text-slate-500 font-sans">Nomor: {selectedSiswaSertifikat.nomor_sertifikat || 'DRAFT/PKL/' + selectedSiswaSertifikat.nis}</div>

                <p className="text-xs font-sans leading-relaxed pt-2">Diberikan kepada:</p>
                <div className="text-xl font-bold underline decoration-amber-500 text-indigo-950 dark:text-indigo-200">
                  {selectedSiswaSertifikat.nama_siswa}
                </div>
                <p className="text-xs font-sans text-slate-500">
                  NIS: {selectedSiswaSertifikat.nis}
                </p>

                <p className="text-xs font-sans max-w-xl mx-auto leading-relaxed text-slate-700 dark:text-slate-300">
                  Telah melaksanakan Praktik Kerja Lapangan (PKL) di <strong>{selectedSiswaSertifikat.mitra_nama}</strong> dengan hasil kualifikasi:
                </p>

                <div className="inline-block px-6 py-2 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 rounded-full font-sans font-bold text-sm">
                  Predikat: {selectedSiswaSertifikat.predikat_pkl || 'Baik'} ({selectedSiswaSertifikat.nilai_akhir_pkl || 0}/100)
                </div>
              </div>
            </div>
          </div>
        )}
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default InputNilaiPklPage;
