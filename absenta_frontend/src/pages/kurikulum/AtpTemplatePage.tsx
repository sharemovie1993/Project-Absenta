const atpTemplateSchema = z.object({
  nama_template: z.string().min(1, 'Nama template wajib diisi'),
  fase: z.string().min(1, 'Fase wajib diisi')
});
import { SectionCard } from '../../components/ui/SectionCard';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { z } from 'zod';
import { formatDate } from '@/utils/date.utils';
import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Search,
  Layers,
  Clock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  DownloadCloud,
  GraduationCap
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button, Input, Label } from '../../components/ui';
import { getAtpTemplates, importAtpTemplate, AtpTemplateData } from '../../api/atp-template.api';
import { listGuruMapel } from '../../api/kurikulum/guru-mapel.api';
import { useAuth } from '../../hooks/useAuth';
import axiosInstance from '../../lib/axiosInstance';
import { toast } from 'react-hot-toast';

export const AtpTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const guruId = (user as Record<string, unknown>)?.guru_profile?.id || '';

  // Filter state
  const [selectedFase, setSelectedFase] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<AtpTemplateData | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [targetMapelId, setTargetMapelId] = useState<string>('');
  const [targetTahunId, setTargetTahunId] = useState<string>('');
  const [targetSemesterId, setTargetSemesterId] = useState<string>('');

  // Fetch Templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['atpTemplatesPage', selectedFase, search],
    queryFn: () => getAtpTemplates({
      fase: selectedFase || undefined,
      search: search || undefined
    }),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  // Fetch Mapel Guru
  const { data: guruMapelList = [] } = useQuery({
    queryKey: ['guruMapelForTemplateImport', guruId],
    queryFn: async () => {
      if (!guruId) return [];
      const res = await listGuruMapel({ guru_id: guruId });
      const seen = new Set<string>();
      return (res.data || []).filter((gm: unknown) => {
        if (!gm.Mapel?.id || seen.has(gm.Mapel.id)) return false;
        seen.add(gm.Mapel.id);
        return true;
      });
    },
    enabled: Boolean(guruId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  // Fetch Tahun Pelajaran Aktif
  const { data: tahunPelajaranList = [] } = useQuery({
    queryKey: ['tahunPelajaranListActive'],
    queryFn: async () => {
      const res = await axiosInstance.get('/academic/tahun-pelajaran');
      return res.data?.data || [];
    },
    staleTime: 10 * 60 * 1000
  });

  // Fetch Semester
  const { data: semesterList = [] } = useQuery({
    queryKey: ['semesterListActive'],
    queryFn: async () => {
      const res = await axiosInstance.get('/academic/semester');
      return res.data?.data || [];
    },
    staleTime: 10 * 60 * 1000
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error('Pilih template terlebih dahulu');
      if (!targetMapelId) throw new Error('Pilih mata pelajaran tujuan');
      if (!targetTahunId) throw new Error('Pilih tahun pelajaran');
      if (!targetSemesterId) throw new Error('Pilih semester');

      return importAtpTemplate(selectedTemplate.id, {
        guru_id: guruId || undefined,
        mapel_id: targetMapelId,
        tahun_pelajaran_id: targetTahunId,
        semester_id: targetSemesterId,
        fase: selectedTemplate.fase
      });
    },
    onSuccess: () => {
      toast.success('Template ATP berhasil disalin ke akun Anda!', { icon: '✨' });
      setIsImportModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['atpList'] });
      queryClient.invalidateQueries({ queryKey: ['activeTpForSesi'] });
      queryClient.invalidateQueries({ queryKey: ['atpTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['atpTemplatesPage'] });
      navigate('/kurikulum/atp');
    },
    onError: (err: unknown) => {
      toast.error(err.message || 'Gagal mengimpor template ATP');
    }
  });

  const handleOpenImport = (tpl: AtpTemplateData) => {
    setSelectedTemplate(tpl);
    if ((guruMapelList as Record<string, unknown>[]).length > 0 && !targetMapelId) {
      setTargetMapelId((guruMapelList[0] as Record<string, unknown>).Mapel?.id || '');
    }
    const activeTahun = (tahunPelajaranList as Record<string, unknown>[]).find((t: unknown) => t.is_active);
    if (activeTahun && !targetTahunId) setTargetTahunId(activeTahun.id);
    const activeSemester = (semesterList as Record<string, unknown>[]).find((s: unknown) => s.is_active);
    if (activeSemester && !targetSemesterId) setTargetSemesterId(activeSemester.id);
    setIsImportModalOpen(true);
  };

  return (
    <AcademicPageLayout hardeningModuleKey="kurikulum_atp_template"
      title="Perpustakaan Template ATP"
      description="Database Alur Tujuan Pembelajaran resmi Kurikulum Merdeka yang siap diimpor dan disesuaikan untuk kebutuhan kelas Anda."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Template ATP', path: '/kurikulum/atp-templates' }
      ]}
      instruction={{
        title: 'Cara Menggunakan Template ATP',
        description: 'Pilih template siap pakai untuk mempercepat penyusunan administrasi KBM.',
        items: [
          { text: 'Pilih template berdasarkan Fase Kurikulum dan Mata Pelajaran yang sesuai.' },
          { text: 'Klik "Gunakan Template" untuk menyalin rangkaian TP ke akun mengajar Anda.' },
          { text: 'Setelah diimpor, Anda bebas menambah, mengubah, atau menghapus TP sesuai karakteristik kelas.' }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
<div className="space-y-6">
        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari mapel, topik materi, atau sumber..."
                className="pl-10 h-11 rounded-2xl text-xs"
              />
            </div>

            <SearchableSelect
    id="atp_template_select"
    aria-label="Pilih Opsi Template ATP"
    options={[
      { value: 'Fase A', label: 'Fase A (Kelas 1-2)' },
      { value: 'Fase B', label: 'Fase B (Kelas 3-4)' },
      { value: 'Fase C', label: 'Fase C (Kelas 5-6)' },
      { value: 'Fase D', label: 'Fase D (Kelas 7-9)' },
      { value: 'Fase E', label: 'Fase E (Kelas 10)' },
      { value: 'Fase F', label: 'Fase F (Kelas 11-12)' }
    ]}
    placeholder="Pilih Fase..."
  />
          </div>

          <Button
            onClick={() => navigate('/kurikulum/atp')}
            variant="outline"
            className="h-11 px-4 rounded-2xl font-bold text-xs border-slate-300 dark:border-slate-700 gap-2 shrink-0 self-end sm:self-center"
          >
            <BookOpen size={15} />
            <span>Buka ATP Saya</span>
          </Button>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6]?.map(n => (
              <div key={n} className="h-56 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum ada template yang sesuai</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Cobalah ubah filter pencarian atau fase untuk menemukan template ATP Kurikulum Merdeka.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates?.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      Fase {tpl.fase}
                    </span>
                    {tpl.sumber && (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl truncate max-w-[150px]">
                        {tpl.sumber}
                      </span>
                    )}
                  </div>

                  {/* Title & Mapel */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2">
                      {tpl.nama_template}
                    </h3>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {tpl.nama_mapel_ref}
                    </p>
                  </div>

                  {/* Description */}
                  {tpl.deskripsi && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {tpl.deskripsi}
                    </p>
                  )}

                  {/* TP Preview Snippet */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Topik TP Utama ({tpl.TpTemplate?.length || 0} TP)
                    </p>
                    <div className="space-y-1">
                      {(tpl.TpTemplate || []).slice(0, 2)?.map((tp, idx) => (
                        <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-[10px]">{tp.kode_tp}:</span>
                          <span className="truncate">{tp.judul_materi}</span>
                        </div>
                      ))}
                      {(tpl.TpTemplate?.length || 0) > 2 && (
                        <p className="text-[10px] text-slate-400 italic">
                          +{ (tpl.TpTemplate?.length || 0) - 2 } Tujuan Pembelajaran lainnya
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Stats & Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Clock size={13} className="text-amber-500" />
                    <span>{tpl.total_alokasi_jp} JP</span>
                  </div>

                  <Button
                    onClick={() => handleOpenImport(tpl)}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <DownloadCloud size={14} />
                    <span>Gunakan Template</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Konfirmasi Import */}
        {isImportModalOpen && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <DownloadCloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Gunakan Template Ini
                  </h3>
                  <p className="text-xs text-slate-500">
                    Template: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedTemplate.nama_template}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {/* Target Mapel */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Salin ke Mata Pelajaran Anda
                  </Label>
                  <SearchableSelect
    id="atp_template_select"
    aria-label="Pilih Opsi Template ATP"
    options={[
      { value: 'Fase A', label: 'Fase A (Kelas 1-2)' },
      { value: 'Fase B', label: 'Fase B (Kelas 3-4)' },
      { value: 'Fase C', label: 'Fase C (Kelas 5-6)' },
      { value: 'Fase D', label: 'Fase D (Kelas 7-9)' },
      { value: 'Fase E', label: 'Fase E (Kelas 10)' },
      { value: 'Fase F', label: 'Fase F (Kelas 11-12)' }
    ]}
    placeholder="Pilih Fase..."
  />
                </div>

                {/* Tahun Pelajaran & Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tahun Pelajaran</Label>
                    <SearchableSelect
    id="atp_template_select"
    aria-label="Pilih Opsi Template ATP"
    options={[
      { value: 'Fase A', label: 'Fase A (Kelas 1-2)' },
      { value: 'Fase B', label: 'Fase B (Kelas 3-4)' },
      { value: 'Fase C', label: 'Fase C (Kelas 5-6)' },
      { value: 'Fase D', label: 'Fase D (Kelas 7-9)' },
      { value: 'Fase E', label: 'Fase E (Kelas 10)' },
      { value: 'Fase F', label: 'Fase F (Kelas 11-12)' }
    ]}
    placeholder="Pilih Fase..."
  />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester</Label>
                    <SearchableSelect
    id="atp_template_select"
    aria-label="Pilih Opsi Template ATP"
    options={[
      { value: 'Fase A', label: 'Fase A (Kelas 1-2)' },
      { value: 'Fase B', label: 'Fase B (Kelas 3-4)' },
      { value: 'Fase C', label: 'Fase C (Kelas 5-6)' },
      { value: 'Fase D', label: 'Fase D (Kelas 7-9)' },
      { value: 'Fase E', label: 'Fase E (Kelas 10)' },
      { value: 'Fase F', label: 'Fase F (Kelas 11-12)' }
    ]}
    placeholder="Pilih Fase..."
  />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                Seluruh {selectedTemplate.TpTemplate?.length || 0} TP akan disalin ke akun Anda dan bisa diedit bebas di halaman ATP Builder.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsImportModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending}
                  className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-2"
                >
                  {importMutation.isPending ? 'Mengimpor...' : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Konfirmasi &amp; Salin</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </SectionCard>
    </AcademicPageLayout>
  );
};

export default AtpTemplatePage;
