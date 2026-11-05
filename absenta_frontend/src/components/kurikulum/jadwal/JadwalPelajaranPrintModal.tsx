import React, { useState, useMemo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { useQuery } from '@tanstack/react-query';
import { getJadwalKBM } from '@/api/attendance/jadwalKBM.api';
import { useKelasOptions, useGuruOptions } from '@/components/common';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';
import { Printer, Calendar, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JadwalPelajaranPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId?: string;
  tahunPelajaranId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  defaultKelasId?: string;
  defaultGuruId?: string;
}

const HARI_COLS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const MAX_JAM_KE = 10;

export const JadwalPelajaranPrintModal: React.FC<JadwalPelajaranPrintModalProps> = ({
  isOpen,
  onClose,
  semesterId,
  tahunPelajaranId,
  tahunPelajaranNama = '2026/2027',
  semesterNama = 'Ganjil',
  defaultKelasId = '',
  defaultGuruId = '',
}) => {
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64 } = usePrintHeaderData();
  const [printType, setPrintType] = useState<'kelas' | 'guru'>('kelas');
  const [selectedKelasId, setSelectedKelasId] = useState<string>(defaultKelasId);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(defaultGuruId);

  const { options: kelasOptions, rawList: rawKelas } = useKelasOptions();
  const { options: guruOptions, rawList: rawGuru } = useGuruOptions({ jenisPtk: 'PENDIDIK' });

  // Query Schedule
  const { data: rawJadwal, isLoading } = useQuery({
    queryKey: ['print-jadwal-kbm', semesterId, tahunPelajaranId],
    queryFn: () => getJadwalKBM({ semester_id: semesterId }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const schedules = useMemo(() => safeArr<any>(rawJadwal), [rawJadwal]);

  // Set default selection if empty
  React.useEffect(() => {
    if (!selectedKelasId && kelasOptions.length > 0) {
      setSelectedKelasId(String(kelasOptions[0].value));
    }
  }, [selectedKelasId, kelasOptions]);

  React.useEffect(() => {
    if (!selectedGuruId && guruOptions.length > 0) {
      setSelectedGuruId(String(guruOptions[0].value));
    }
  }, [selectedGuruId, guruOptions]);

  // Filtered target info
  const selectedKelasInfo = useMemo(() => {
    return rawKelas?.find((k: any) => String(k.id) === String(selectedKelasId));
  }, [rawKelas, selectedKelasId]);

  const selectedGuruInfo = useMemo(() => {
    return rawGuru?.find((g: any) => String(g.id) === String(selectedGuruId));
  }, [rawGuru, selectedGuruId]);

  // Matrix construction
  const matrixData = useMemo(() => {
    const filtered = schedules.filter((s) => {
      if (printType === 'kelas') {
        return !selectedKelasId || String(s.kelas_id || s.Kelas?.id) === String(selectedKelasId);
      } else {
        return !selectedGuruId || String(s.guru_id || s.Guru?.id) === String(selectedGuruId);
      }
    });

    // Build map: key = `${hari}_${jam_ke}`
    const map = new Map<string, any>();
    filtered.forEach((item) => {
      const key = `${(item.hari || '').toUpperCase()}_${item.jam_ke}`;
      map.set(key, item);
    });

    return map;
  }, [schedules, printType, selectedKelasId, selectedGuruId]);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const documentTitle = `Jadwal Pelajaran ${
    printType === 'kelas'
      ? `Kelas ${selectedKelasInfo?.nama_kelas || ''}`
      : `Guru ${selectedGuruInfo?.nama_guru || ''}`
  }`;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Jadwal Pelajaran (Roster KBM)"
      documentTitle={documentTitle}
      maxWidthClass="max-w-6xl"
    >
      <div className="space-y-4">
        {/* Print Filter Toolbar (Not in Print Output) */}
        <div className="no-print bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Format Roster:
            </span>
            <div className="flex p-0.5 bg-slate-200/80 dark:bg-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => setPrintType('kelas')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all",
                  printType === 'kelas'
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                <GraduationCap size={13} />
                Per Kelas
              </button>
              <button
                type="button"
                onClick={() => setPrintType('guru')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all",
                  printType === 'guru'
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                <Users size={13} />
                Per Guru
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-[240px]">
            {printType === 'kelas' ? (
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {kelasOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Kelas: {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedGuruId}
                onChange={(e) => setSelectedGuruId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {guruOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Guru: {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Printable Sheet */}
        <PrintDocumentSheet
          orientation="landscape"
          sheetId="sheet-jadwal-pelajaran"
          className="p-8 text-black bg-white"
        >
          {/* Header Dinas & Sekolah */}
          <PrintHeader
            title="JADWAL PELAJARAN KBM (ROSTER MINGGUAN)"
            subtitle={`TAHUN AJARAN ${tahunPelajaranNama.toUpperCase()} - SEMESTER ${semesterNama.toUpperCase()}`}
            logoKiri={logoDaerahBase64 || undefined}
            logoKanan={logoSekolahBase64 || undefined}
          />

          {/* Sub Header Information */}
          <div className="my-4 text-xs font-medium flex justify-between items-center border-b border-black pb-2">
            <div>
              <span className="font-bold">
                {printType === 'kelas' ? 'Kelas / Rombel' : 'Nama Guru Pengampu'}:
              </span>{' '}
              <span className="font-bold text-sm uppercase">
                {printType === 'kelas'
                  ? selectedKelasInfo?.nama_kelas || '-'
                  : selectedGuruInfo?.nama_guru || '-'}
              </span>
              {printType === 'guru' && selectedGuruInfo?.nip && (
                <span className="ml-2 font-mono text-[11px]">
                  (NIP: {selectedGuruInfo.nip})
                </span>
              )}
            </div>
            <div>
              <span className="font-bold">Semester / T.A:</span> {semesterNama} / {tahunPelajaranNama}
            </div>
          </div>

          {/* Matrix Schedule Table */}
          <table className="w-full border-collapse border border-black text-center text-[10px] my-3">
            <thead>
              <tr className="bg-slate-100 border-b border-black font-bold">
                <th className="border border-black p-1.5 w-12">Jam Ke</th>
                {HARI_COLS.map((hari) => (
                  <th key={hari} className="border border-black p-1.5 uppercase">
                    {hari}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_JAM_KE }, (_, i) => i + 1).map((jam) => (
                <tr key={jam} className="border-b border-black">
                  <td className="border border-black font-bold p-1 bg-slate-50">{jam}</td>
                  {HARI_COLS.map((hari) => {
                    const item = matrixData.get(`${hari}_${jam}`);
                    return (
                      <td key={hari} className="border border-black p-1 text-left align-top h-10">
                        {item ? (
                          <div className="leading-tight">
                            <div className="font-bold text-[10.5px] text-black">
                              {item.MataPelajaran?.nama_mapel || item.nama_mapel || '-'}
                            </div>
                            <div className="text-[9px] text-slate-700">
                              {printType === 'kelas'
                                ? item.Guru?.nama_guru || item.nama_guru || '-'
                                : `Kelas: ${item.Kelas?.nama_kelas || item.nama_kelas || '-'}`}
                            </div>
                            {item.ruangan && (
                              <div className="text-[8px] text-slate-500 italic">
                                R: {item.ruangan}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* 2-Tier Signature (Kurikulum & Kepala Sekolah) Menggunakan Universal Signature Engine */}
          <div className="mt-8 w-full page-break-inside-avoid">
            <UniversalDocumentSignatures
              layout="dual_unit_kepsek"
              titimangsaCity={tenantInfo?.kabupaten || 'Bandung'}
              titimangsaDate={todayStr}
              overrideSignerLeft={{
                roleTitle: 'Waka Bidang Kurikulum',
                personName: tenantInfo?.waka_kurikulum_nama,
                nip: tenantInfo?.waka_kurikulum_nip,
              }}
              overrideSignerRight={{
                personName: tenantInfo?.kepala_sekolah_nama,
                nip: tenantInfo?.kepala_sekolah_nip,
              }}
              spacingHeightMm={20}
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
