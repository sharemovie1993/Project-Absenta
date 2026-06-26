import React, { useMemo, useCallback } from 'react';
import { BarChart3, FileText, Download, Eye, Activity, Calendar } from 'lucide-react';
import { Button, SectionCard, Badge } from '@/components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

function ReportsPageContent() {
  const breadcrumbs = useMemo(() => [
    { label: 'Analitik & Laporan', path: '/reports' },
    { label: 'Pusat Laporan' }
  ], []);

  const stats = useMemo(() => [
    {
      title: 'Laporan Bulan Ini',
      value: '24 Dokumen',
      icon: <FileText size={14} />,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'Aktivitas Sistem',
      value: '98.4%',
      icon: <Activity size={14} />,
      gradient: 'from-emerald-500 to-teal-600'
    }
  ], []);

  const recentReports = useMemo(() => [
    { id: 1, name: 'Laporan Absensi Bulanan - Juni 2026', date: '24 Jun 2026', type: 'Attendance' },
    { id: 2, name: 'Rekapitulasi Nilai Akademik - Semester Genap', date: '15 Jun 2026', type: 'Academic' }
  ], []);

  const handleGenerateReport = useCallback((type: string) => {
    console.log(`Generating ${type} report...`);
  }, []);

  return (
    <AcademicPageLayout
      title="Pusat Laporan & Analitik"
      description="Kelola, unduh, dan analisis seluruh data operasional sekolah Anda dalam satu dashboard terpadu."
      hardeningModuleKey="reports_center"
      instruction={{
        title: "Pusat Laporan",
        description: "Pilih kategori laporan yang Anda butuhkan.",
        items: [
          { text: "Anda dapat memfilter data berdasarkan rentang waktu, kelas, atau individu tertentu sebelum mengunduh." }
        ]
      }}
      breadcrumbs={breadcrumbs}
      stats={stats}
    >
      <div className="space-y-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SectionCard title="Laporan Absensi" icon={Calendar} fullWidth>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Hasilkan laporan kehadiran harian, mingguan, atau bulanan berdasarkan filter tertentu.
            </p>
            <Button onClick={() => handleGenerateReport('attendance')} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
              <BarChart3 size={16} /> Buat Laporan
            </Button>
          </SectionCard>
          
          <SectionCard title="Laporan Akademik" icon={FileText} fullWidth>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Lihat ringkasan performa akademik dan progres kurikulum siswa secara transparan.
            </p>
            <Button onClick={() => handleGenerateReport('academic')} variant="outline" className="w-full h-11 rounded-xl border-slate-200 dark:border-slate-800 font-bold gap-2">
              <Eye size={16} /> Lihat Akademik
            </Button>
          </SectionCard>
          
          <SectionCard title="Penggunaan Sistem" icon={Activity} fullWidth>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Pantau statistik penggunaan aplikasi oleh guru, siswa, dan staf administrasi.
            </p>
            <Button onClick={() => handleGenerateReport('system')} variant="ghost" className="w-full h-11 rounded-xl font-bold gap-2 text-slate-600 dark:text-slate-300">
              <Activity size={16} /> Pantau Aktivitas
            </Button>
          </SectionCard>
        </div>
        
        <SectionCard title="Laporan Terbaru" icon={FileText} fullWidth noPadding>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentReports?.map((report) => (
              <div key={report.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{report.name}</span>
                    <Badge variant={report.type === 'Attendance' ? 'info' : 'secondary'} className="text-[9px] font-black uppercase">{report.type}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar size={12} /> Dibuat pada {report.date}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-9 rounded-lg font-bold gap-1.5 border-slate-200 dark:border-slate-800">
                    <Download size={14} /> Unduh
                  </Button>
                  <Button size="sm" className="flex-1 sm:flex-none h-9 rounded-lg font-bold gap-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                    <Eye size={14} /> Detail
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {recentReports.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium">
              Belum ada laporan yang baru saja dibuat.
            </div>
          )}
        </SectionCard>
      </div>
    </AcademicPageLayout>
  );
}

export default function ReportsPage() {
  return (
    <ReportsPageContent />
  );
}
