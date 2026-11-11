import React, { useMemo } from 'react';
import { Calendar, Copy, Printer, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Modal } from '@/components/ui';
import type { ReconciledStudent } from '@/api/dapodik.api';
import {
  computeDapodikAgeDistribution,
  getTodayIsoDate,
} from '@/utils/dapodik/dapodikAgeStats';

export interface DapodikLppdUsiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: ReconciledStudent[];
  referenceDate: string;
  onChangeReferenceDate: (dateStr: string) => void;
  sourceMode: 'LIVE' | 'STAGING';
  onOpenPrintModal: () => void;
}

export const DapodikLppdUsiaModal: React.FC<DapodikLppdUsiaModalProps> = ({
  isOpen,
  onClose,
  students,
  referenceDate,
  onChangeReferenceDate,
  sourceMode,
  onOpenPrintModal,
}) => {
  const ageStats = useMemo(
    () => computeDapodikAgeDistribution(students, referenceDate),
    [students, referenceDate]
  );

  const currentYear = new Date().getFullYear();

  const handleCopyBuckets = async () => {
    const header = ageStats.buckets.map((b) => b.label).join('\t');
    const values = ageStats.buckets.map((b) => String(b.total)).join('\t');
    try {
      await navigator.clipboard.writeText(`${header}\n${values}`);
      toast.success('Baris 6 kelompok usia berhasil disalin (siap tempel ke Word / Excel).');
    } catch {
      toast.error('Gagal menyalin ke clipboard.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Rekap Data Siswa Menurut Usia (Verval LPPD • Sumber Dapodik)"
    >
      <div className="space-y-4 text-xs">
        {/* Header Sumber Data & Pengaturan Tanggal Cut-Off */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>
                Total Sumber Dapodik:{' '}
                {ageStats.totalDapodikStudents.toLocaleString('id-ID')} Siswa
              </span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                {sourceMode === 'STAGING' ? 'Staging Platform' : 'Live Port 5774'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Terklasifikasi usia: <strong>{ageStats.validBirthDateCount.toLocaleString('id-ID')}</strong> siswa •
              Laki-laki: <strong>{ageStats.totalMale.toLocaleString('id-ID')}</strong> •
              Perempuan: <strong>{ageStats.totalFemale.toLocaleString('id-ID')}</strong>
              {ageStats.missingBirthDateCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {' '}
                  • Tanggal lahir kosong: {ageStats.missingBirthDateCount}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Cut-Off:</span>
              <input
                type="date"
                value={referenceDate}
                onChange={(e) => onChangeReferenceDate(e.target.value || getTodayIsoDate())}
                className="h-8 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChangeReferenceDate(getTodayIsoDate())}
              className="h-8 px-2 text-[11px]"
            >
              Hari Ini
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChangeReferenceDate(`${currentYear}-07-01`)}
              className="h-8 px-2 text-[11px]"
            >
              1 Jul {currentYear}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChangeReferenceDate(`${currentYear}-12-31`)}
              className="h-8 px-2 text-[11px]"
            >
              31 Des {currentYear}
            </Button>
          </div>
        </div>

        {/* Kartu 6 Kelompok Usia Sesuai Format Berita Acara LPPD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">
              Data Siswa Menurut Usia (6 Kategori Resmi LPPD)
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyBuckets}
              className="h-7 px-2.5 text-[11px] gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Salin Tab (Word / Excel)
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {ageStats.buckets.map((bucket) => (
              <div
                key={bucket.key}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs"
              >
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {bucket.label}
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white my-1">
                  {bucket.total.toLocaleString('id-ID')}
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  L: {bucket.male.toLocaleString('id-ID')} • P: {bucket.female.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rincian Per Tingkat Pendidikan */}
        {ageStats.byTingkat.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">
              Rincian Per Tingkat Pendidikan (Sumber Dapodik)
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2.5 text-left">Tingkat</th>
                    <th className="p-2.5 text-center">&lt; 15 Th</th>
                    <th className="p-2.5 text-center">15 Th</th>
                    <th className="p-2.5 text-center">16 Th</th>
                    <th className="p-2.5 text-center">17 Th</th>
                    <th className="p-2.5 text-center">18 Th</th>
                    <th className="p-2.5 text-center">&gt; 18 Th</th>
                    <th className="p-2.5 text-center">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ageStats.byTingkat.map((row) => (
                    <tr key={row.tingkat} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{row.tingkat}</td>
                      <td className="p-2.5 text-center">{row.under15.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 text-center">{row.age15.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 text-center">{row.age16.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 text-center">{row.age17.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 text-center">{row.age18.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 text-center">{row.over18.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white">
                        {row.total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onOpenPrintModal();
            }}
            className="gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Berita Acara &amp; PDF (Universal Signature)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DapodikLppdUsiaModal;
