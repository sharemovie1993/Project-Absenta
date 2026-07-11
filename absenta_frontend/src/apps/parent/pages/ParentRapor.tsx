import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentRapor } from '../../../api/parent.api';
import { tahunPelajaranApi } from '../../../api/academic.api';
import { 
  FileText, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function ParentRapor() {
  const navigate = useNavigate();
  const { getSelectedStudent } = useParentAuthStore();
  const student = getSelectedStudent();

  // Selected Period State
  const [selectedTp, setSelectedTp] = useState('');
  const [selectedSem, setSelectedSem] = useState('');

  // Fetch Academic Years
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll()
  });

  const activeYear = useMemo(() => (years?.data ?? []).find(y => y.is_active), [years]);
  const activeSemester = useMemo(() => activeYear?.Semester?.find((s: any) => s.is_active), [activeYear]);

  // Set default values once years are loaded
  React.useEffect(() => {
    if (activeYear) {
      setSelectedTp(activeYear.id);
    }
    if (activeSemester) {
      setSelectedSem(activeSemester.id);
    }
  }, [activeYear, activeSemester]);

  // Fetch Rapor Detail
  const { data: rapor, isLoading } = useQuery({
    queryKey: ['parent-rapor', student?.siswa_id, selectedTp, selectedSem],
    queryFn: () => getStudentRapor(student!.siswa_id, selectedTp, selectedSem),
    enabled: !!student?.siswa_id && !!selectedTp && !!selectedSem
  });

  const averageGrade = useMemo(() => {
    if (!rapor?.nilai_akademik || rapor.nilai_akademik.length === 0) return 0;
    const total = rapor.nilai_akademik.reduce((acc: number, curr: any) => acc + (curr.nilai || 0), 0);
    return total / rapor.nilai_akademik.length;
  }, [rapor]);

  const unpassedCount = useMemo(() => {
    if (!rapor?.nilai_akademik) return 0;
    return rapor.nilai_akademik.filter((n: any) => (n.nilai || 0) < (n.kkm || 75)).length;
  }, [rapor]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 p-4">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          onClick={() => navigate('/parent-app/dashboard')}
          variant="ghost" 
          className="text-xs font-bold text-slate-500"
        >
          ← KEMBALI
        </Button>
        <h1 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">E-Rapor Online</h1>
        <div className="w-14"></div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* Period Selector Card */}
        <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tahun Pelajaran</label>
            <select
              value={selectedTp}
              onChange={(e) => setSelectedTp(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold p-2.5 text-slate-700 dark:text-slate-350"
            >
              <option value="">Pilih</option>
              {years?.data?.map((y: any) => (
                <option key={y.id} value={y.id}>{y.tahun}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Semester</label>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold p-2.5 text-slate-700 dark:text-slate-350"
            >
              <option value="">Pilih</option>
              {activeYear?.Semester?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.nama_semester}</option>
              ))}
            </select>
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-xs italic">Menghitung akumulasi nilai rapor...</div>
        ) : !rapor?.siswa ? (
          <Card className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <Inbox size={48} className="text-slate-300" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">Rapor Belum Terbit</h4>
            <p className="text-xs text-slate-400">Data e-Rapor anak Anda belum dirilis oleh wali kelas untuk periode semester ini.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 relative overflow-hidden flex items-center justify-between group">
                <div className="space-y-1">
                  <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rata-rata Nilai</h3>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{averageGrade.toFixed(1)}</p>
                </div>
                <TrendingUp size={24} className="text-emerald-500" />
              </Card>

              <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 relative overflow-hidden flex items-center justify-between group">
                <div className="space-y-1">
                  <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Belum Kompeten</h3>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{unpassedCount} Mapel</p>
                </div>
                {unpassedCount > 0 ? (
                  <AlertCircle size={24} className="text-rose-500" />
                ) : (
                  <CheckCircle2 size={24} className="text-emerald-500" />
                )}
              </Card>
            </div>

            {/* Attendance & Wali Notes */}
            <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center border-b border-slate-50 dark:border-slate-850 pb-2">
                <FileText size={14} className="mr-1.5 text-indigo-500" />
                Catatan Wali Kelas & Absensi
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Sakit</span>
                  <span className="text-base font-black text-slate-750 dark:text-slate-200">{rapor.absensi?.sakit || 0} Hari</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Izin</span>
                  <span className="text-base font-black text-slate-750 dark:text-slate-200">{rapor.absensi?.izin || 0} Hari</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Alpa</span>
                  <span className="text-base font-black text-rose-500">{rapor.absensi?.alpa || 0} Hari</span>
                </div>
              </div>

              {rapor.catatan_wali && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Pesan Wali Kelas:</span>
                  <p className="text-xs text-slate-650 leading-relaxed font-medium italic">"{rapor.catatan_wali}"</p>
                </div>
              )}

              {rapor.keputusan_transisi && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black text-center uppercase tracking-wide">
                  Keputusan: {rapor.keputusan_transisi}
                </div>
              )}
            </Card>

            {/* Academic Grades Table */}
            <Card className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center border-b border-slate-50 dark:border-slate-850 pb-2">
                <BookOpen size={14} className="mr-1.5 text-indigo-500" />
                Daftar Nilai Akademik
              </h3>

              <div className="space-y-4">
                {rapor.nilai_akademik?.map((item: any) => {
                  const isPassed = (item.nilai || 0) >= (item.kkm || 75);
                  return (
                    <div key={item.mapel_id} className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl group">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.nama_mapel}</h4>
                        <p className="text-[10px] text-slate-400">KKM Kelulusan: {item.kkm || 75}</p>
                        {item.catatan_deskripsi && (
                          <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 max-w-[280px] italic">"{item.catatan_deskripsi}"</p>
                        )}
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-sm font-black ${isPassed ? 'text-indigo-650 dark:text-indigo-400' : 'text-rose-500'}`}>
                          {item.nilai}
                        </span>
                        <Badge className={`${isPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} border-none text-[8px] font-black py-0.5 px-1.5 rounded-full`}>
                          {isPassed ? 'KOMPETEN' : 'BELUM KOMPETEN'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
