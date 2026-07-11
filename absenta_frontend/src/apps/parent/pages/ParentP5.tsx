import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParentAuthStore } from '../../../store/parentAuthStore';
import { getStudentP5 } from '../../../api/parent.api';
import { 
  Award, 
  HelpCircle, 
  Inbox,
  Bookmark
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function ParentP5() {
  const navigate = useNavigate();
  const { getSelectedStudent } = useParentAuthStore();
  const student = getSelectedStudent();

  // Fetch P5 Grades
  const { data: listP5, isLoading } = useQuery({
    queryKey: ['parent-p5', student?.siswa_id],
    queryFn: () => getStudentP5(student!.siswa_id),
    enabled: !!student?.siswa_id
  });

  // Group P5 Grades by Projek
  const groupedProjek = useMemo(() => {
    if (!listP5) return [];
    const map = new Map<string, { id: string; judul: string; deskripsi: string | null; grades: any[] }>();

    listP5.forEach((item: any) => {
      const proj = item.Projek;
      if (!proj) return;
      if (!map.has(proj.id)) {
        map.set(proj.id, {
          id: proj.id,
          judul: proj.judul,
          deskripsi: proj.deskripsi,
          grades: []
        });
      }
      map.get(proj.id)!.grades.push(item);
    });

    return Array.from(map.values());
  }, [listP5]);

  const getQualLabel = (code: string) => {
    const map: Record<string, string> = {
      'BB': 'Belum Berkembang',
      'MB': 'Mulai Berkembang',
      'BSH': 'Berkembang Sesuai Harapan',
      'SB': 'Sangat Berkembang'
    };
    return map[code] || code;
  };

  const getQualColor = (code: string) => {
    const map: Record<string, string> = {
      'BB': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-450',
      'MB': 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
      'BSH': 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400',
      'SB': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
    };
    return map[code] || 'bg-slate-100 text-slate-700';
  };

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
        <h1 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Rapor Projek P5</h1>
        <div className="w-14"></div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 text-xs italic">Menyusun rekapitulasi penilaian projek...</div>
        ) : groupedProjek.length === 0 ? (
          <Card className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <Inbox size={48} className="text-slate-300" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Projek P5</h4>
            <p className="text-xs text-slate-400">Anak Anda belum terdaftar di dalam projek P5 aktif semester berjalan.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedProjek.map((proj) => (
              <Card key={proj.id} className="p-5 border-none shadow-sm dark:bg-slate-900/40 space-y-4">
                <div className="space-y-1">
                  <Badge className="bg-indigo-50 text-indigo-650 border-none font-bold text-[8px] py-0.5 px-2 uppercase rounded-full">Projek Pembelajaran</Badge>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-snug">{proj.judul}</h3>
                  {proj.deskripsi && <p className="text-[10px] text-slate-450 leading-relaxed font-medium">{proj.deskripsi}</p>}
                </div>

                <div className="border-t border-slate-50 dark:border-slate-850 pt-4 space-y-4">
                  {proj.grades.map((grade: any) => (
                    <div key={grade.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{grade.dimensi}</span>
                        <Badge className={`${getQualColor(grade.kualifikasi)} border-none text-[8px] font-black rounded-full`}>
                          {getQualLabel(grade.kualifikasi)}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Sub-elemen: {grade.sub_elemen}</h4>
                        {grade.catatan_proses && (
                          <p className="text-[10px] text-slate-500 leading-normal italic mt-1 font-medium">"Catatan: {grade.catatan_proses}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
