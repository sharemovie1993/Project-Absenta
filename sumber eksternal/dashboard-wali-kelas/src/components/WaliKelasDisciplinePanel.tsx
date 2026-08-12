import React, { useState } from 'react';
import { ViolationRecord, SeverityLevel, BKStatus } from '../types';
import { 
  Scale, AlertOctagon, PlusCircle, Search, ShieldAlert, 
  FileCheck, Clock, UserCheck, CheckCircle2, ChevronRight, MessageSquare
} from 'lucide-react';

interface WaliKelasDisciplinePanelProps {
  violations: ViolationRecord[];
  onOpenAddIncidentModal: () => void;
  onSelectStudent: (studentId: string) => void;
  onUpdateBKStatus: (id: string, newStatus: BKStatus) => void;
}

export const WaliKelasDisciplinePanel: React.FC<WaliKelasDisciplinePanelProps> = ({
  violations,
  onOpenAddIncidentModal,
  onSelectStudent,
  onUpdateBKStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'Semua'>('Semua');

  const totalPoints = violations.reduce((acc, curr) => acc + curr.points, 0);

  const ringancount = violations.filter(v => v.severity === 'Ringan').length;
  const sedangcount = violations.filter(v => v.severity === 'Sedang').length;
  const beratcount = violations.filter(v => v.severity === 'Berat').length;

  const filteredViolations = violations.filter(v => {
    const matchesSearch = v.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.nis.includes(searchTerm);

    if (!matchesSearch) return false;
    if (severityFilter === 'Semua') return true;
    return v.severity === severityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Violation Metrics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Total Points Overview Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-2">
              <Scale className="w-4 h-4 text-indigo-400" />
              Total Poin Pelanggaran Rombel
            </span>
            <div className="text-4xl font-extrabold text-white mb-1">
              {totalPoints} <span className="text-sm font-normal text-slate-400">Poin Akumulasi</span>
            </div>
            <p className="text-xs text-slate-300">
              Disiplin Rombel: <strong className="text-emerald-400">Sangat Baik</strong> (Tidak ada kasus berat berturut-turut).
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
            <span>Rata-rata / siswa: {(totalPoints / 36).toFixed(1)} Poin</span>
            <span className="text-indigo-300 font-medium">Batas Maks SP1: 50 Poin</span>
          </div>
        </div>

        {/* Severity Distribution Bar Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Distribusi Kategori Kejadian</span>
              <span className="text-xs font-normal text-slate-500">{violations.length} Catatan</span>
            </h3>

            {/* Severity Stacked Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-4">
              <div className="bg-amber-400 h-full" style={{ width: `${(ringancount / Math.max(violations.length, 1)) * 100}%` }} title="Ringan" />
              <div className="bg-orange-500 h-full" style={{ width: `${(sedangcount / Math.max(violations.length, 1)) * 100}%` }} title="Sedang" />
              <div className="bg-rose-600 h-full" style={{ width: `${(beratcount / Math.max(violations.length, 1)) * 100}%` }} title="Berat" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Pelanggaran Ringan (Keterlambatan, Seragam)
                </span>
                <strong className="text-slate-900 font-bold">{ringancount} Kasus</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Pelanggaran Sedang (Atribut / HP / Aturan)
                </span>
                <strong className="text-slate-900 font-bold">{sedangcount} Kasus</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  Pelanggaran Berat (Membolos / Perkelahian)
                </span>
                <strong className="text-slate-900 font-bold">{beratcount} Kasus</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action: Catat Kejadian Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold mb-3 shadow-md shadow-indigo-600/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Catat Pembinaan / Kejadian Khusus</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Dokumentasikan kejadian disiplin, keterlambatan, atau pembinaan karakter khusus yang dilakukan Wali Kelas.
            </p>
          </div>

          <button
            onClick={onOpenAddIncidentModal}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            + Catat Kejadian Khusus
          </button>
        </div>
      </div>

      {/* Violation Records Log Table / Cards */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Daftar Catatan Kedisiplinan & Pembinaan</h3>
            <p className="text-xs text-slate-500">Rekapitulasi pelaporan dari Guru Piket, Guru BK, Guru Mapel, dan Wali Kelas</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa atau pelanggaran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Severity Filter */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
              {(['Semua', 'Ringan', 'Sedang', 'Berat'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    severityFilter === sev ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredViolations.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Tidak ada catatan pelanggaran</p>
            <p className="text-xs text-slate-500 mt-1">Siswa binaan mematuhi peraturan sekolah dengan baik.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredViolations.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all bg-white hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    v.severity === 'Ringan' ? 'bg-amber-100 text-amber-800' :
                    v.severity === 'Sedang' ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    +{v.points}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 
                        onClick={() => onSelectStudent(v.studentId)}
                        className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                      >
                        {v.studentName}
                      </h4>
                      <span className="text-xs text-slate-400">({v.nis})</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.severity === 'Ringan' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        v.severity === 'Sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        Tingkat {v.severity}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 mt-1">{v.category}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{v.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 mt-2">
                      <span>Tanggal: <strong className="text-slate-600">{v.date}</strong></span>
                      <span>Pelapor: <strong className="text-slate-600">{v.reporter}</strong></span>
                      {v.followUpNotes && <span className="text-indigo-600 font-medium">Catatan: {v.followUpNotes}</span>}
                    </div>
                  </div>
                </div>

                {/* Status Pembinaan Selector */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] text-slate-400 block">Status Pembinaan BK/Walas:</span>
                    <span className="text-xs font-bold text-indigo-950">{v.bkStatus}</span>
                  </div>

                  <select
                    value={v.bkStatus}
                    onChange={(e) => onUpdateBKStatus(v.id, e.target.value as BKStatus)}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Dalam Pemantauan">Dalam Pemantauan</option>
                    <option value="Konseling BK">Konseling BK</option>
                    <option value="Pemanggilan Ortu">Pemanggilan Ortu</option>
                    <option value="Home Visit">Home Visit</option>
                    <option value="Surat Peringatan 1">Surat Peringatan 1</option>
                    <option value="Selesai">Selesai (Teratasi)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
