import React, { useState } from 'react';
import { Student, AtRiskStudent, ClassHealthMetric } from '../types';
import { DATES_MATRIX, GENERATE_MONTHLY_MATRIX } from '../data/mockData';
import { 
  HeartPulse, AlertTriangle, ShieldCheck, Search, Download, 
  Calendar, Check, UserX, UserCheck, AlertCircle, FileSpreadsheet, PhoneCall, Users, ChevronRight
} from 'lucide-react';

interface WaliKelasHealthPanelProps {
  students: Student[];
  atRiskStudents: AtRiskStudent[];
  metrics: ClassHealthMetric;
  onSelectStudent: (studentId: string) => void;
  onTakeIntervention: (atRisk: AtRiskStudent) => void;
}

export const WaliKelasHealthPanel: React.FC<WaliKelasHealthPanelProps> = ({
  students,
  atRiskStudents,
  metrics,
  onSelectStudent,
  onTakeIntervention
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'AtRisk' | 'Perfect'>('All');

  const monthlyMatrixData = GENERATE_MONTHLY_MATRIX(students);

  const filteredMatrix = monthlyMatrixData.filter(item => {
    const matchesSearch = item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.nis.includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === 'AtRisk') return item.student.alphaCount >= 2 || item.student.sakitCount >= 4;
    if (statusFilter === 'Perfect') return item.student.attendanceRate === 100;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Class Health Score & Radar Breakdown */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              Class Health Radar • XI RPL 1
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Indeks Kesehatan & Keaktifan Rombel</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Kalkulasi real-time tingkat kesehatan kelas berdasarkan rasio kehadiran (94.4%), ketiadaan kasus pelanggaran berat, dan respon komunikasi orang tua.
            </p>
          </div>

          <div className="flex items-center gap-5 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-emerald-400/30 flex items-center justify-center">
                <span className="text-2xl font-extrabold text-white">{metrics.overallScore}</span>
              </div>
              <span className="absolute -bottom-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                Sangat Baik
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Presensi Rombel:</span>
                <strong className="text-emerald-300 font-bold">{metrics.attendancePercentage}%</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Respon Ortu:</span>
                <strong className="text-indigo-300 font-bold">{metrics.parentResponseRate}%</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Status Kasus Berat:</span>
                <strong className="text-emerald-400 font-bold">Nihil (Aman)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Health Factors Checklist */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>34/36 Siswa Hadir Hari Ini</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>2 Siswa dalam EWS</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Zero Kasus Perkelahian</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Keterlibatan Ortu Aktif</span>
          </div>
        </div>
      </div>

      {/* 2. Early Warning System (EWS) Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Early Warning System (EWS) — Siswa Rawan</h3>
              <p className="text-xs text-slate-500">Deteksi otomatis siswa dengan Alpha ≥ 3 hari atau Sakit/Izin beruntun ≥ 5 hari</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            {atRiskStudents.length} Siswa Perlu Intervensi
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {atRiskStudents.map((atRisk, idx) => (
            <div
              key={atRisk.studentId}
              className="bg-gradient-to-r from-rose-50/50 via-white to-white p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={atRisk.avatar}
                      alt={atRisk.studentName}
                      onClick={() => onSelectStudent(atRisk.studentId)}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-300 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                    <div>
                      <h4 
                        onClick={() => onSelectStudent(atRisk.studentId)}
                        className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                      >
                        {atRisk.studentName}
                      </h4>
                      <p className="text-xs text-slate-500">NIS: {atRisk.nis} • Gender: {atRisk.gender}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-xs">
                    {atRisk.riskCategory}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-rose-100 text-xs space-y-1.5 my-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Alpha Bulan Ini:</span>
                    <strong className="text-rose-700 font-bold">{atRisk.totalAlphaThisMonth} Hari</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Rekomendasi Sistem:</span>
                    <strong className="text-amber-800 font-bold">{atRisk.recommendation}</strong>
                  </div>
                  {atRisk.lastIntervention && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 italic">
                      Catatan: {atRisk.lastIntervention}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-rose-100 text-xs">
                <span className="text-slate-500 font-medium">Status: {atRisk.status}</span>
                <button
                  onClick={() => onTakeIntervention(atRisk)}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Tindak Lanjuti / Panggil Ortu
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Monthly Attendance Matrix Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Matrix Kehadiran Bulanan Rombel (Agustus 2026)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Rekapitulasi harian presensi 36 siswa binaan (Hadir, Sakit, Izin, Alpha, Dispensasi)</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search filter */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                onClick={() => setStatusFilter('All')}
                className={`px-3 py-1 rounded-lg ${statusFilter === 'All' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Semua Siswa
              </button>
              <button
                onClick={() => setStatusFilter('AtRisk')}
                className={`px-3 py-1 rounded-lg ${statusFilter === 'AtRisk' ? 'bg-white font-bold text-rose-700 shadow-xs' : 'text-slate-600'}`}
              >
                Siswa Perhatian
              </button>
              <button
                onClick={() => setStatusFilter('Perfect')}
                className={`px-3 py-1 rounded-lg ${statusFilter === 'Perfect' ? 'bg-white font-bold text-emerald-700 shadow-xs' : 'text-slate-600'}`}
              >
                100% Hadir
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs mb-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <span className="font-semibold text-slate-500">Keterangan Legend:</span>
          <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">H</span> Hadir</span>
          <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">S</span> Sakit</span>
          <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">I</span> Izin</span>
          <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-[10px]">A</span> Alpha</span>
          <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[10px]">D</span> Dispensasi</span>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="p-3 sticky left-0 bg-slate-900 z-10 w-12 text-center">No</th>
                <th className="p-3 sticky left-12 bg-slate-900 z-10 min-w-[180px]">Nama Siswa</th>
                <th className="p-2 text-center border-l border-slate-800">L/P</th>
                {DATES_MATRIX.map((d, i) => (
                  <th key={i} className="p-1.5 text-center font-mono text-[10px] border-l border-slate-800 w-8">
                    {d.split(' ')[0]}
                  </th>
                ))}
                <th className="p-2 text-center border-l border-slate-800 bg-emerald-950 text-emerald-300">H</th>
                <th className="p-2 text-center border-l border-slate-800 bg-amber-950 text-amber-300">S</th>
                <th className="p-2 text-center border-l border-slate-800 bg-blue-950 text-blue-300">I</th>
                <th className="p-2 text-center border-l border-slate-800 bg-rose-950 text-rose-300">A</th>
                <th className="p-2 text-center border-l border-slate-800 bg-indigo-950 text-indigo-300">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMatrix.map((item, index) => {
                const s = item.student;
                const isHasAlpha = item.counts.A > 0;

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 text-center font-medium text-slate-500 sticky left-0 bg-white z-10">
                      {index + 1}
                    </td>
                    <td className="p-2 font-semibold text-slate-900 sticky left-12 bg-white z-10">
                      <div 
                        onClick={() => onSelectStudent(s.id)}
                        className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 truncate"
                      >
                        <img src={s.avatar} alt={s.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        <span className="truncate">{s.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-center text-slate-500 border-l border-slate-200">{s.gender}</td>

                    {/* Daily Attendance Cells */}
                    {DATES_MATRIX.map((date, idx) => {
                      const val = item.dailyRecords[date];
                      let cellBg = 'bg-slate-50 text-slate-400';
                      if (val === 'H') cellBg = 'bg-emerald-50 text-emerald-800 font-bold';
                      if (val === 'S') cellBg = 'bg-amber-100 text-amber-900 font-bold';
                      if (val === 'I') cellBg = 'bg-blue-100 text-blue-900 font-bold';
                      if (val === 'A') cellBg = 'bg-rose-500 text-white font-extrabold animate-pulse';
                      if (val === 'D') cellBg = 'bg-purple-100 text-purple-900 font-bold';

                      return (
                        <td key={idx} className={`p-1 text-center font-mono text-[10px] border-l border-slate-100 ${cellBg}`}>
                          {val}
                        </td>
                      );
                    })}

                    {/* Totals */}
                    <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/50 border-l border-slate-200">{item.counts.H}</td>
                    <td className="p-2 text-center font-bold text-amber-700 bg-amber-50/50 border-l border-slate-200">{item.counts.S}</td>
                    <td className="p-2 text-center font-bold text-blue-700 bg-blue-50/50 border-l border-slate-200">{item.counts.I}</td>
                    <td className={`p-2 text-center font-extrabold border-l border-slate-200 ${isHasAlpha ? 'bg-rose-100 text-rose-700' : 'text-slate-400'}`}>
                      {item.counts.A}
                    </td>
                    <td className="p-2 text-center font-bold text-slate-900 bg-slate-100 border-l border-slate-200">
                      {s.attendanceRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
