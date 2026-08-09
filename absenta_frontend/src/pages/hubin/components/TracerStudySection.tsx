import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi, type HubinTracerStudy } from '../../../api/hubin.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useAuthStore } from '../../../store/authStore';
import { TracerFormSubfields } from './tracer/TracerFormSubfields';
import { 
  GraduationCap, 
  Search, 
  MapPin, 
  Calendar, 
  Building, 
  BookOpen, 
  Store, 
  Clipboard,
  CheckCircle2,
  TrendingUp,
  FileWarning
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Zod validation schema for Tracer Study Alumni Survey (Pillar 25)
const tracerSurveySchema = z.object({
  tahun_lulus: z.number().min(2000, 'Tahun kelulusan tidak valid'),
  status_alumni: z.enum(['BEKERJA', 'KULIAH', 'WIRAUSAHA', 'MENCARI_KERJA']),
  perusahaan_nama: z.string().optional(),
  posisi: z.string().optional(),
  gaji_estimasi: z.string().optional(),
  universitas_nama: z.string().optional(),
  program_studi: z.string().optional(),
  usaha_nama: z.string().optional(),
  usaha_bidang: z.string().optional(),
});

export const TracerStudySection: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  // Survey Form State
  const [tahunLulus, setTahunLulus] = useState(new Date().getFullYear());
  const [statusAlumni, setStatusAlumni] = useState<'BEKERJA' | 'KULIAH' | 'WIRAUSAHA' | 'MENCARI_KERJA'>('BEKERJA');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [gaji, setGaji] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [usahaNama, setUsahaNama] = useState('');
  const [usahaBidang, setUsahaBidang] = useState('');

  const isHubin = useMemo(() => {
    const roleName = user?.role?.name?.toUpperCase() || '';
    const caps = user?.capabilities || [];
    return ['ADMIN', 'SUPERADMIN'].includes(roleName) ||
           caps.includes('hubin.tracer.view') ||
           caps.includes('hubin.bkk.manage') ||
           caps.includes('hubin.partners.manage') ||
           caps.includes('dashboard.view.hubin');
  }, [user]);

  // Queries
  const { data: tracerListData, isLoading: loadingTracerList } = useQuery({
    queryKey: ['hubin-tracer-list', { search: searchTerm, tahunLulus: filterYear, statusAlumni: filterStatus, page }],
    queryFn: () => hubinApi.getTracerStudy({ 
      search: searchTerm, 
      tahunLulus: filterYear ? parseInt(filterYear) : undefined, 
      statusAlumni: filterStatus || undefined,
      page,
      limit: 20
    }),
    enabled: isHubin
  });

  const { data: myTracerData, isLoading: loadingMyTracer } = useQuery({
    queryKey: ['my-tracer', user?.id],
    queryFn: () => hubinApi.getTracerStudy({ search: (user as { nis?: string; username: string })?.nis || user?.username, page: 1, limit: 1 }),
    enabled: !isHubin && !!user?.id
  });

  const { data: tracerStatsData } = useQuery({
    queryKey: ['hubin-tracer-stats'],
    queryFn: () => hubinApi.getTracerStats(),
    enabled: isHubin
  });

  // Mutations
  const submitSurveyMutation = useMutation({
    mutationFn: (data: Partial<HubinTracerStudy>) => hubinApi.submitTracerStudy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tracer'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-tracer-list'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-tracer-stats'] });
      toast.success('Kuesioner Tracer Study berhasil disimpan!');
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan data';
      toast.error(errMsg);
    }
  });

  // Populate form if already submitted
  const existingTracer = useMemo(() => {
    const data = myTracerData?.data || [];
    return data.length > 0 ? data[0] : null;
  }, [myTracerData]);

  useEffect(() => {
    if (existingTracer) {
      setTahunLulus(existingTracer.tahun_lulus || new Date().getFullYear());
      setStatusAlumni(existingTracer.status_alumni);
      setCompanyName(existingTracer.perusahaan_nama || '');
      setPosition(existingTracer.posisi || '');
      setGaji(existingTracer.gaji_estimasi || '');
      setUniversity(existingTracer.universitas_nama || '');
      setMajor(existingTracer.program_studi || '');
      setUsahaNama(existingTracer.usaha_nama || '');
      setUsahaBidang(existingTracer.usaha_bidang || '');
    }
  }, [existingTracer]);

  const handleSubmitSurvey = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const surveyPayload: Partial<HubinTracerStudy> = {
      tahun_lulus: tahunLulus,
      status_alumni: statusAlumni,
    };

    if (statusAlumni === 'BEKERJA') {
      surveyPayload.perusahaan_nama = companyName;
      surveyPayload.posisi = position;
      surveyPayload.gaji_estimasi = gaji;
    } else if (statusAlumni === 'KULIAH') {
      surveyPayload.universitas_nama = university;
      surveyPayload.program_studi = major;
    } else if (statusAlumni === 'WIRAUSAHA') {
      surveyPayload.usaha_nama = usahaNama;
      surveyPayload.usaha_bidang = usahaBidang;
    }

    // Safe parse check using Zod Schema (Pillar 25)
    const validation = tracerSurveySchema.safeParse(surveyPayload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    submitSurveyMutation.mutate(surveyPayload);
  }, [tahunLulus, statusAlumni, companyName, position, gaji, university, major, usahaNama, usahaBidang, submitSurveyMutation]);

  const listData = useMemo(() => tracerListData?.data || [], [tracerListData]);
  const pagination = useMemo(() => tracerListData?.pagination || { total: 0, totalPages: 1 }, [tracerListData]);
  const stats = useMemo(() => tracerStatsData?.data || { BEKERJA: 0, KULIAH: 0, WIRAUSAHA: 0, MENCARI_KERJA: 0 }, [tracerStatsData]);
  const totalStats = useMemo(() => stats.BEKERJA + stats.KULIAH + stats.WIRAUSAHA + stats.MENCARI_KERJA, [stats]);

  const statsList = useMemo(() => {
    return [
      { label: 'Bekerja', val: stats.BEKERJA, icon: Building, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20', barColor: 'bg-emerald-500' },
      { label: 'Kuliah', val: stats.KULIAH, icon: BookOpen, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20', barColor: 'bg-indigo-500' },
      { label: 'Wirausaha', val: stats.WIRAUSAHA, icon: Store, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20', barColor: 'bg-amber-500' },
      { label: 'Belum Bekerja', val: stats.MENCARI_KERJA, icon: Clipboard, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20', barColor: 'bg-rose-500' },
    ];
  }, [stats]);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const yr = new Date().getFullYear() - i;
      return { value: yr.toString(), label: yr.toString() };
    });
  }, []);

  const statusOptions = useMemo(() => [
    { value: 'BEKERJA', label: 'BEKERJA' },
    { value: 'KULIAH', label: 'KULIAH' },
    { value: 'WIRAUSAHA', label: 'WIRAUSAHA' },
    { value: 'MENCARI_KERJA', label: 'MENCARI KERJA' }
  ], []);

  const statusAlumniOptions = useMemo(() => [
    { value: 'BEKERJA', label: 'BEKERJA (Karyawan / PNS / Kontrak)' },
    { value: 'KULIAH', label: 'KULIAH (Studi Lanjut Perguruan Tinggi)' },
    { value: 'WIRAUSAHA', label: 'WIRAUSAHA (Membuka Usaha Mandiri)' },
    { value: 'MENCARI_KERJA', label: 'BELUM BEKERJA / MENCARI PEKERJAAN' }
  ], []);

  const gajiOptions = useMemo(() => [
    { value: '< 2 Juta', label: '< Rp 2.000.000' },
    { value: '2 Juta - 4 Juta', label: 'Rp 2.000.000 - Rp 4.000.000' },
    { value: '4 Juta - 7 Juta', label: 'Rp 4.000.000 - Rp 7.000.000' },
    { value: '> 7 Juta', label: '> Rp 7.000.000' }
  ], []);

  return (
    <div className="space-y-6">
      
      {isHubin ? (
        /* ==================== VIEW STAF HUBIN (Tracer Study Database) ==================== */
        <div className="space-y-6">
          
          {/* Stats Summary Panel */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Grafik Serapan Alumni ({totalStats} Terlacak)</span>
            
            {totalStats === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-bold">
                Belum ada data tracer study yang diisi oleh alumni.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsList?.map((st, idx) => {
                  const pct = Math.round((st.val / totalStats) * 100) || 0;
                  return (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{st.label}</span>
                        <div className={`p-1.5 rounded-lg ${st.color}`}>
                          <st.icon size={14} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">{st.val}</span>
                        <span className="text-[9px] text-slate-400 font-bold">Lulusan ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${st.barColor}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Filtering & Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari nama alumni..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs rounded-xl"
                aria-label="Cari nama alumni"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0 z-20">
              <SearchableSelect
                id="filterYear"
                value={filterYear}
                onValueChange={(val) => setFilterYear(val)}
                options={yearOptions}
                placeholder="Semua Tahun Lulus"
                className="w-full sm:w-40"
              />
              <SearchableSelect
                id="filterStatus"
                value={filterStatus}
                onValueChange={(val) => setFilterStatus(val)}
                options={statusOptions}
                placeholder="Semua Status Serapan"
                className="w-full sm:w-44"
              />
            </div>
          </div>

          {/* Tracer Study Database Table */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm">
            {loadingTracerList ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : listData?.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                Tidak ada data tracer study ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                      <th className="py-3 px-3">Nama Alumni</th>
                      <th className="py-3 px-3">NIS</th>
                      <th className="py-3 px-3">Tahun Lulus</th>
                      <th className="py-3 px-3">Status Alumni</th>
                      <th className="py-3 px-3">Detail Penempatan</th>
                      <th className="py-3 px-3 text-right">Tanggal Submit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {listData?.map((study: HubinTracerStudy) => (
                      <tr key={study.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{study.Siswa?.nama_siswa}</td>
                        <td className="py-3 px-3 text-slate-500">{study.Siswa?.nis}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">{study.tahun_lulus}</td>
                        <td className="py-3 px-3">
                           <Badge 
                             variant={
                               study.status_alumni === 'BEKERJA' ? 'success' : 
                               study.status_alumni === 'KULIAH' ? 'info' : 
                               study.status_alumni === 'WIRAUSAHA' ? 'warning' : 'secondary'
                             }
                             className="font-bold text-[9px]"
                           >
                            {study.status_alumni}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate">
                          {study.status_alumni === 'BEKERJA' && (
                            <span className="text-slate-600 dark:text-slate-300">{study.posisi} di <strong>{study.perusahaan_nama}</strong></span>
                          )}
                          {study.status_alumni === 'KULIAH' && (
                            <span className="text-slate-600 dark:text-slate-300">{study.program_studi} di <strong>{study.universitas_nama}</strong></span>
                          )}
                          {study.status_alumni === 'WIRAUSAHA' && (
                            <span className="text-slate-600 dark:text-slate-300">Usaha <strong>{study.usaha_nama}</strong> ({study.usaha_bidang})</span>
                          )}
                          {study.status_alumni === 'MENCARI_KERJA' && (
                            <span className="text-slate-400 italic">Mencari Lowongan Kerja</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                           {new Date(study.created_at || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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
        /* ==================== VIEW ALUMNI (Questionnaire Form) ==================== */
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Kuesioner Tracer Study Lulusan</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Bantu sekolah melakukan pelacakan serapan kerja alumni untuk evaluasi mutu kurikulum & akreditasi.</p>
              </div>
            </div>

            {loadingMyTracer ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : (
              <form onSubmit={handleSubmitSurvey} className="space-y-4 text-xs">
                
                {existingTracer && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold mb-4">
                    <CheckCircle2 size={16} />
                    Anda sudah mengisi Tracer Study sebelumnya. Anda dapat memperbarui data di bawah ini kapan saja.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="tahunLulus" className="font-bold text-slate-600 dark:text-slate-400">Tahun Kelulusan Anda *</label>
                    <Input 
                      id="tahunLulus"
                      type="number" 
                      value={tahunLulus} 
                      onChange={(e) => setTahunLulus(parseInt(e.target.value))} 
                      min={2000} 
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="statusAlumni" className="font-bold text-slate-600 dark:text-slate-400">Status Serapan Setelah Lulus *</label>
                    <SearchableSelect
                      id="statusAlumni"
                      value={statusAlumni}
                      onValueChange={(val) => setStatusAlumni(val as 'BEKERJA' | 'KULIAH' | 'WIRAUSAHA' | 'MENCARI_KERJA')}
                      options={statusAlumniOptions}
                      placeholder="Pilih Status Serapan"
                    />
                  </div>
                </div>

                <TracerFormSubfields
                  statusAlumni={statusAlumni}
                  companyName={companyName}
                  setCompanyName={setCompanyName}
                  position={position}
                  setPosition={setPosition}
                  gaji={gaji}
                  setGaji={setGaji}
                  gajiOptions={gajiOptions}
                  university={university}
                  setUniversity={setUniversity}
                  major={major}
                  setMajor={setMajor}
                  usahaNama={usahaNama}
                  setUsahaNama={setUsahaNama}
                  usahaBidang={usahaBidang}
                  setUsahaBidang={setUsahaBidang}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={submitSurveyMutation.isPending} className="rounded-xl flex items-center gap-2">
                    {submitSurveyMutation.isPending && <Loader size="sm" />}
                    Simpan Laporan Tracer Study
                  </Button>
                </div>

              </form>
            )}
          </Card>
        </div>
      )}

    </div>
  );
});
