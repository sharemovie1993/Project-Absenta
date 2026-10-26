import React from 'react';
import { Printer, FileText, Download, Users, Award, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';

export interface EkskulRekapTabProps {
  tpTahun?: string;
  semesterNama?: string;
}

export const EkskulRekapTab: React.FC<EkskulRekapTabProps> = ({
  tpTahun,
  semesterNama,
}) => {
  const handlePrint = (title: string) => {
    window.print();
  };

  const rekapDocuments = [
    {
      id: 'doc-anggota',
      title: 'Daftar Anggota & Peminatan Siswa',
      desc: 'Rekapitulasi seluruh siswa yang terdaftar dalam klub ekstrakurikuler per rombel kelas.',
      icon: Users,
      badge: 'DAFTAR SISWA',
      color: 'teal',
    },
    {
      id: 'doc-nilai',
      title: 'Lembar Nilai Ekstrakurikuler Rapor',
      desc: 'Format cetak predikat capaian (A/B/C/D) dan deskripsi naratif untuk leger nilai kurikulum.',
      icon: Award,
      badge: 'RAPOR RESMI',
      color: 'emerald',
    },
    {
      id: 'doc-presensi',
      title: 'Rekapitulasi Kehadiran Latihan',
      desc: 'Buku catatan presensi mingguan latihan ekstrakurikuler sebagai bukti pelaksanaan tugas.',
      icon: CheckCircle2,
      badge: 'LOG PRESENSI',
      color: 'indigo',
    },
    {
      id: 'doc-sk',
      title: 'SK Penugasan Pembina & Pelatih',
      desc: 'Daftar surat keputusan pembina ekstrakurikuler sekolah ditandatangani Kepala Sekolah.',
      icon: FileText,
      badge: 'ARSIP KESISWAAN',
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Pusat Cetak &amp; Ekspor Dokumen
          </span>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Dokumen Resmi Ekstrakurikuler
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tahun Pelajaran {tpTahun || 'Aktif'} • {semesterNama || 'Semester Ganjil/Genap'}
          </p>
        </div>
      </div>

      {/* Grid Dokumen Siap Cetak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rekapDocuments.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                    <Icon size={20} />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {doc.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {doc.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {doc.desc}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handlePrint(doc.title)}
                  className="flex-1 h-9 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Dokumen</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
