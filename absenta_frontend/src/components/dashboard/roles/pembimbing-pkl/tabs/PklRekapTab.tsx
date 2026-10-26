import React from 'react';
import {
  Printer,
  FileText,
  Award,
  Calendar,
  Users,
  Download,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { toast } from 'react-hot-toast';
import type { SiswaBimbinganItem, KunjunganMonitoringItem } from '../types';

export interface PklRekapTabProps {
  siswaList: SiswaBimbinganItem[];
  kunjunganList?: KunjunganMonitoringItem[];
  tpTahun?: string;
  semesterNama?: string;
}

export const PklRekapTab: React.FC<PklRekapTabProps> = ({
  siswaList,
  kunjunganList = [],
  tpTahun,
  semesterNama,
}) => {
  const documents = [
    {
      id: 'doc-nilai',
      title: 'Rekap Penilaian Pembimbing Sekolah',
      description: 'Format rekapitulasi penilaian capaian kompetensi magang untuk pelaporan nilai rapor dan sertifikat.',
      icon: Award,
      colorVariant: 'emerald',
      actionLabel: 'Cetak Lembar Nilai',
    },
    {
      id: 'doc-monitoring',
      title: 'Buku Log Supervisi Industri',
      description: 'Rekapitulasi riwayat kunjungan monitoring guru pembimbing ke mitra DU/DI beserta tindak lanjut kendala.',
      icon: Calendar,
      colorVariant: 'indigo',
      actionLabel: 'Cetak Log Supervisi',
    },
    {
      id: 'doc-bimbingan',
      title: 'Daftar Penempatan & Pembimbing DU/DI',
      description: 'Daftar resmi seluruh siswa bimbingan, mitra industri penempatan, dan instruktur lapangan.',
      icon: Users,
      colorVariant: 'teal',
      actionLabel: 'Cetak Daftar Siswa',
    },
    {
      id: 'doc-pengesahan',
      title: 'Lembar Pengesahan Laporan PKL',
      description: 'Format halaman pengesahan laporan akhir magang siswa oleh guru pembimbing dan pimpinan sekolah.',
      icon: FileText,
      colorVariant: 'purple',
      actionLabel: 'Cetak Pengesahan',
    },
  ];

  const handlePrint = (docId: string, title: string) => {
    toast.success(`Membuka jendela cetak: ${title}`);
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Printer size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Pusat Cetak Dokumen Resmi Pembimbing PKL
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Dokumentasi administrasi magang siswa {tpTahun ? `Tahun Pelajaran ${tpTahun}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Dokumen Cetak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => {
          const IconComp = doc.icon;
          return (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                    <IconComp size={18} />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {doc.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {doc.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400">
                  {siswaList.length} Siswa Terdaftar
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handlePrint(doc.id, doc.title)}
                  className="text-xs font-bold rounded-xl h-8 gap-1.5 shadow-xs"
                >
                  <Printer size={14} />
                  {doc.actionLabel}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
