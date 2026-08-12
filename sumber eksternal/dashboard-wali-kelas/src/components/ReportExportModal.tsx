import React, { useState } from 'react';
import { Student, ClassInfo } from '../types';
import { X, Printer, Download, FileText, CheckCircle2, Shield, School } from 'lucide-react';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: ClassInfo;
  students: Student[];
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  classInfo,
  students
}) => {
  if (!isOpen) return null;

  const [activeReportType, setActiveReportType] = useState<'attendance' | 'character'>('attendance');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col justify-between">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 rounded-t-3xl flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Cetak & Export Document Rekapitulasi Walas</h3>
              <p className="text-xs text-slate-400">{classInfo.className} • {classInfo.academicYear} • {classInfo.homeroomTeacher}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Cetak PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-center gap-3 text-xs font-bold">
          <button
            onClick={() => setActiveReportType('attendance')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeReportType === 'attendance'
                ? 'bg-white text-indigo-900 shadow-xs ring-2 ring-indigo-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📜 1. Rekapitulasi Presensi Kehadiran Bulanan
          </button>
          <button
            onClick={() => setActiveReportType('character')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeReportType === 'character'
                ? 'bg-white text-indigo-900 shadow-xs ring-2 ring-indigo-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎓 2. Rekapitulasi Catatan Karakter (Lampiran Rapor)
          </button>
        </div>

        {/* Printable Document Body Mockup */}
        <div className="p-8 space-y-6 print:p-0 font-serif text-slate-900">
          {/* School Kop Surat Header */}
          <div className="border-b-4 border-double border-slate-900 pb-4 text-center font-serif relative">
            <div className="flex items-center justify-center gap-3">
              <School className="w-10 h-10 text-slate-900" />
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide">PEMERINTAH PROVINSI JAWA BARAT</h2>
                <h3 className="text-xl font-extrabold uppercase tracking-wider">DINAS PENDIDIKAN • SMKN 1 TECH CENTER</h3>
                <p className="text-xs font-sans text-slate-600">Jl. Soekarno Hatta No. 123 Bandung, Jawa Barat • Telp: (022) 7302194 • Web: www.smkn1tech.sch.id</p>
              </div>
            </div>
          </div>

          {activeReportType === 'attendance' ? (
            <div>
              <div className="text-center font-sans font-bold text-base uppercase underline mb-4">
                REKAPITULASI KEHADIRAN SISWA BULAN AGUSTUS 2026
              </div>

              <div className="font-sans text-xs space-y-1 mb-4 flex flex-wrap justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>Kelas / Rombel: <strong>{classInfo.className} ({classInfo.major})</strong></div>
                <div>Wali Kelas: <strong>{classInfo.homeroomTeacher}</strong></div>
                <div>Tahun Ajaran: <strong>{classInfo.academicYear} - {classInfo.semester}</strong></div>
              </div>

              {/* Table */}
              <table className="w-full text-xs text-left border-collapse border border-slate-400 font-sans">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400 text-center">
                    <th className="p-2 border border-slate-400">No</th>
                    <th className="p-2 border border-slate-400">NIS</th>
                    <th className="p-2 border border-slate-400 text-left">Nama Siswa</th>
                    <th className="p-2 border border-slate-400">L/P</th>
                    <th className="p-2 border border-slate-400">Hadir</th>
                    <th className="p-2 border border-slate-400">Sakit</th>
                    <th className="p-2 border border-slate-400">Izin</th>
                    <th className="p-2 border border-slate-400">Alpha</th>
                    <th className="p-2 border border-slate-400">% Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="p-1.5 text-center border border-slate-300">{idx + 1}</td>
                      <td className="p-1.5 text-center border border-slate-300 font-mono">{s.nis}</td>
                      <td className="p-1.5 border border-slate-300 font-semibold">{s.name}</td>
                      <td className="p-1.5 text-center border border-slate-300">{s.gender}</td>
                      <td className="p-1.5 text-center border border-slate-300 text-emerald-800 font-bold">20</td>
                      <td className="p-1.5 text-center border border-slate-300">{s.sakitCount}</td>
                      <td className="p-1.5 text-center border border-slate-300">{s.izinCount}</td>
                      <td className="p-1.5 text-center border border-slate-300 text-rose-700 font-bold">{s.alphaCount}</td>
                      <td className="p-1.5 text-center border border-slate-300 font-bold">{s.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <div className="text-center font-sans font-bold text-base uppercase underline mb-4">
                LAMPIRAN RAPOR — REKAPITULASI CAPAIAN KARAKTER & DISIPLIN
              </div>

              <div className="font-sans text-xs space-y-1 mb-4 flex flex-wrap justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>Kelas / Rombel: <strong>{classInfo.className}</strong></div>
                <div>Wali Kelas: <strong>{classInfo.homeroomTeacher}</strong></div>
                <div>Tanggal Cetak: <strong>11 Agustus 2026</strong></div>
              </div>

              <table className="w-full text-xs text-left border-collapse border border-slate-400 font-sans">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold text-center">
                    <th className="p-2 border border-slate-400">No</th>
                    <th className="p-2 border border-slate-400 text-left">Nama Siswa</th>
                    <th className="p-2 border border-slate-400">Predikat Kehadiran</th>
                    <th className="p-2 border border-slate-400">Poin Pelanggaran</th>
                    <th className="p-2 border border-slate-400">Poin Kebaikan</th>
                    <th className="p-2 border border-slate-400 text-left">Catatan Perkembangan Wali Kelas</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 10).map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-300">
                      <td className="p-2 text-center border border-slate-300">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-bold">{s.name}</td>
                      <td className="p-2 text-center border border-slate-300 font-semibold text-emerald-800">
                        {s.attendanceRate >= 95 ? 'Sangat Baik (A)' : 'Baik (B)'}
                      </td>
                      <td className="p-2 text-center border border-slate-300">{s.violationPoints} Poin</td>
                      <td className="p-2 text-center border border-slate-300 text-purple-800 font-bold">+{s.goodDeedsPoints} Poin</td>
                      <td className="p-2 border border-slate-300 text-[11px] italic">
                        {s.attendanceRate === 100 
                          ? 'Siswa sangat disiplin, aktif, dan menjadi contoh teladan di kelas.' 
                          : 'Proaktif mengikuti KBM, komunikasi ortu berjalan lancar.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tanda Tangan Wali Kelas & Kepsek */}
          <div className="pt-8 grid grid-cols-2 text-center font-sans text-xs gap-8">
            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-bold text-slate-900">Kepala SMKN 1 Tech Center</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">Dr. H. Ahmad Dahlan, M.Pd.</p>
              <p className="text-[10px] text-slate-500">NIP. 19680315 199403 1 005</p>
            </div>

            <div>
              <p className="text-slate-500">Bandung, 11 Agustus 2026</p>
              <p className="font-bold text-slate-900">Wali Kelas {classInfo.className}</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">{classInfo.homeroomTeacher}</p>
              <p className="text-[10px] text-slate-500">NIP. {classInfo.nip}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 rounded-b-3xl border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            Tutup Pratinjau Document
          </button>
        </div>
      </div>
    </div>
  );
};
