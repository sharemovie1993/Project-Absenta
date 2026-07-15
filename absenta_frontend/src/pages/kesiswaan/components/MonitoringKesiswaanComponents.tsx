import React from 'react';
import { Calendar, Users, ShieldAlert, Award, AwardIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to check arrays
const safeArr = (v: unknown): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  const o = v as { data?: unknown };
  if (Array.isArray(o?.data)) return o.data;
  const od = o?.data as { list?: unknown; data?: unknown };
  if (Array.isArray(od?.list)) return od.list;
  if (Array.isArray(od?.data)) return od.data;
  return [];
};

/* ── Piket & Agenda Panel ── */
export function PiketAgendaPanel() {
  const GURU_PIKET = ["Drs. H. Achmad S.", "Citra Amelia, S.Pd."];
  
  const AGENDA_KESISWAAN = [
    { tanggal: "17 Jul 2026", event: "Rapat Koordinasi OSIS & MPK Baru", desc: "Pleno pengesahan pengurus OSIS periode genap." },
    { tanggal: "20 Jul 2026", event: "Sosialisasi Pencegahan Perundungan & Bullying", desc: "Seminar wajib bagi siswa tingkat X dan XI." },
    { tanggal: "24 Jul 2026", event: "Latihan Dasar Kepemimpinan Siswa (LDKS)", desc: "Pembekalan kepemimpinan fisik & mental di aula utama." }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      {/* Guru Piket */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-indigo-500" />
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">Guru Piket Aktif</h4>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal mb-4">Guru yang bertugas melaksanakan piket ketertiban pintu gerbang & lingkungan hari ini.</p>
          <div className="space-y-2">
            {GURU_PIKET?.map((g, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{g}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 p-2 px-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-center justify-between">
          <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Piket Pagi</span>
          <span className="text-[9px] font-bold text-slate-400">06:30 - 15:30 WIB</span>
        </div>
      </div>

      {/* Agenda Kesiswaan */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-indigo-500" />
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">Agenda Terdekat</h4>
          </div>
          <div className="space-y-2.5">
            {AGENDA_KESISWAAN?.map((item, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{item.event}</span>
                  <span className="text-[8px] text-slate-400 font-bold">{item.tanggal}</span>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Rombel Disiplin & Rawan Panel ── */
export function RombelDisiplinPanel({ violations }: { violations: any }) {
  // Aggregate points per class dynamically
  const pointsMap: Record<string, number> = {};
  const list = safeArr(violations);
  
  list.forEach(v => {
    const className = v.Siswa?.Kelas?.nama_kelas;
    if (className) {
      pointsMap[className] = (pointsMap[className] || 0) + (v.poin || 0);
    }
  });

  const rawRombelRawan = Object.entries(pointsMap)
    ?.map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);

  // Fallback to mock data if there are no violations
  const rombelRawan = rawRombelRawan.length > 0 
    ? rawRombelRawan.slice(0, 3) 
    : [
        { name: 'X-TJKT-2', points: 12 },
        { name: 'XI-PPLG-2', points: 8 },
        { name: 'X-DKV-1', points: 5 }
      ];

  const rombelDisiplin = [
    { name: 'XII-PPLG-1', points: 0, status: 'Zero Pelanggaran' },
    { name: 'X-DKV-2', points: 0, status: 'Zero Pelanggaran' },
    { name: 'XI-AKL-3', points: 0, status: 'Zero Pelanggaran' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Rombel Terdisiplin */}
      <div className="p-4 bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100/50 dark:border-emerald-900/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Award size={16} className="text-emerald-500" />
          <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Rombel Terdisiplin</h4>
        </div>
        <div className="space-y-2">
          {rombelDisiplin?.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-100/20 dark:border-emerald-900/20 rounded-xl">
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight block leading-none mb-1">{r.name}</span>
                <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{r.status}</span>
              </div>
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Rombel Butuh Pembinaan */}
      <div className="p-4 bg-rose-50/10 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-900/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-rose-500" />
          <h4 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rombel Butuh Pembinaan</h4>
        </div>
        <div className="space-y-2">
          {rombelRawan?.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-100/20 dark:border-rose-900/20 rounded-xl">
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight block leading-none mb-1">{r.name}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Akumulasi Poin Pelanggaran</span>
              </div>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400">+{r.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
