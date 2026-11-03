import React from 'react';
import { Zap, AlertCircle, ShieldCheck } from 'lucide-react';

export interface JamKBMDailyMaxJpPanelProps {
  dailyMaxJp?: Record<string, number>;
  onChange: (dayKey: string, val: number) => void;
  readOnly?: boolean;
}

const DEFAULT_DAYS = [
  { key: 'SENIN', label: 'Senin', defaultJp: 10 },
  { key: 'SELASA', label: 'Selasa', defaultJp: 12 },
  { key: 'RABU', label: 'Rabu', defaultJp: 12 },
  { key: 'KAMIS', label: 'Kamis', defaultJp: 12 },
  { key: 'JUMAT', label: 'Jumat', defaultJp: 6 },
  { key: 'SABTU', label: 'Sabtu', defaultJp: 6 },
];

export const JamKBMDailyMaxJpPanel: React.FC<JamKBMDailyMaxJpPanelProps> = ({
  dailyMaxJp = {},
  onChange,
  readOnly = false,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Banner Informasi Kebijakan Overload Guru */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Batas Maksimal Jam Pelajaran (JP) Harian Mengajar Guru
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Pengaturan ini berfungsi sebagai validasi otomatis (*Guardrail Overload*) pada <strong>Jadwal Builder</strong> agar sistem mencegah dan memberikan peringatan dini ketika seorang guru dijadwalkan mengajar melebihi kapasitas fisiknya dalam satu hari.
          </p>
        </div>
      </div>

      {/* Grid Konfigurasi Batas JP per Hari */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Alokasi Maksimum Beban per Hari Kerja
          </span>
          <span className="text-[11px] text-slate-400">
            Rentang valid: 1 s/d 20 JP per hari
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {DEFAULT_DAYS.map((day) => {
            const currentVal = dailyMaxJp[day.key] ?? day.defaultJp;
            return (
              <div
                key={day.key}
                className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 transition-all hover:border-amber-300 dark:hover:border-amber-800"
              >
                <label
                  htmlFor={`input-max-jp-${day.key}`}
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {day.label}
                </label>
                {readOnly ? (
                  <div className="text-base font-black text-slate-800 dark:text-slate-100">
                    {currentVal} <span className="text-xs font-medium text-slate-400">JP</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      id={`input-max-jp-${day.key}`}
                      type="number"
                      aria-label={`Batas maksimal JP ${day.label}`}
                      value={currentVal}
                      onChange={(e) => onChange(day.key, Math.max(1, Math.min(20, Number(e.target.value))))}
                      min={1}
                      max={20}
                      className="w-full px-2.5 py-1.5 text-sm font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                    />
                    <span className="text-xs font-bold text-slate-400 shrink-0">JP</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Catatan Panduan */}
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>Nilai ini otomatis disinkronkan ke algoritma deteksi konflik dan overload pada Jadwal Pelajaran.</span>
      </div>
    </div>
  );
};

export default JamKBMDailyMaxJpPanel;
