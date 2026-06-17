import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from '@/components/ui';
import { School, Users, CalendarPlus, PlusCircle, CalendarRange, GraduationCap, IdCard, CheckCircle } from 'lucide-react';

interface DashboardEmptyStateProps {
  stats?: {
    total_tahun_pelajaran?: number;
    total_semester?: number;
    total_jurusan?: number;
    total_kelas?: number;
    total_guru?: number;
    total_siswa?: number;
  };
  hasActiveTahunPelajaran?: boolean;
}

export default function DashboardEmptyState({ stats, hasActiveTahunPelajaran = false }: DashboardEmptyStateProps) {
  const navigate = useNavigate();
  const totals = {
    tp: stats?.total_tahun_pelajaran || 0,
    smt: stats?.total_semester || 0,
    jur: stats?.total_jurusan || 0,
    kelas: stats?.total_kelas || 0,
    guru: stats?.total_guru || 0,
    siswa: stats?.total_siswa || 0,
  };

  return (
    <div className="w-full">
      <Card className="border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <PlusCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="space-y-2 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Panduan Setup Akademik</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg">
              Ikuti urutan berikut agar sistem siap digunakan. Tombol di bawah akan membawa Anda ke halaman yang tepat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            <Button 
              variant="outline" 
              className="relative h-auto py-4 flex flex-col items-center gap-2 hover:border-indigo-300 transition-all"
              onClick={() => navigate('/academic/tahun-pelajaran')}
            >
              {totals.tp > 0 && hasActiveTahunPelajaran && (
                <span className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 p-1">
                  <CheckCircle className="w-4 h-4" />
                </span>
              )}
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Tahun Pelajaran</span>
                <span className="text-xs text-gray-500 font-normal">
                  {totals.tp > 0 ? 'Sudah ada' : 'Tetapkan periode aktif'}
                </span>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-sky-300 transition-all"
              onClick={() => navigate('/academic/semester')}
            >
              <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg text-sky-600 dark:text-sky-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Semester</span>
                <span className="text-xs text-gray-500 font-normal">
                  {totals.smt > 0 ? 'Sudah ada' : 'Aktifkan semester berjalan'}
                </span>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-violet-300 transition-all"
              onClick={() => navigate('/academic/jurusan')}
            >
              <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-violet-600 dark:text-violet-400">
                <IdCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Jurusan</span>
                <span className="text-xs text-gray-500 font-normal">
                  {totals.jur > 0 ? 'Sudah ada' : 'Siapkan struktur jurusan'}
                </span>
              </div>
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-blue-300 transition-all"
              onClick={() => navigate('/academic/kelas')}
            >
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <School className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Tambah Kelas</span>
                <span className="text-xs text-gray-500 font-normal">
                  {totals.kelas > 0 ? 'Sudah ada' : 'Atur struktur kelas'}
                </span>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-green-300 transition-all"
              onClick={() => navigate('/academic/guru')}
            >
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Tambah Guru</span>
                <span className="text-xs text-gray-500 font-normal">
                  {totals.guru > 0 ? 'Sudah ada' : 'Input data pengajar'}
                </span>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-purple-300 transition-all"
              onClick={() => navigate('/attendance/sesi')}
            >
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Buat Sesi</span>
                <span className="text-xs text-gray-500 font-normal">
                  Jadwalkan absensi
                </span>
              </div>
            </Button>
          </div>

          <div className="mt-8">
            <Button 
              onClick={() => navigate(totals.tp < 1 ? '/academic/tahun-pelajaran' : '/academic/kelas')} 
              className="px-6"
            >
              Mulai dari {totals.tp < 1 ? 'Tahun Pelajaran' : 'Kelas'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
