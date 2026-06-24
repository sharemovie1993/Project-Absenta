import React, { useEffect, useState, useMemo } from 'react';
import api from '../../../lib/axiosInstance';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, MessageCircle, Mail, MapPin, User, PieChart, Info, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MonthlyPoint { label: string; amount: number; }

interface AccountStatus {
  savingId:            string;
  categoryCode:        string;
  categoryName:        string;
  categoryColor:       string | null;
  defaultAmount:       number;
  currentBalance:      number;
  isPeriodic:          boolean;
  depositedThisMonth:  boolean;
  lastDepositAmount:   number | null;
  lastDepositDate:     string | null;
}

interface ShuEstimation {
  memberTotalModal:    number;
  totalAllMembersModal:number;
  memberSharePct:      number;
  porsiJasaModal:      number;
  lastDistributedShu:  { year: number; totalShu: number } | null;
  note:                string;
}

interface CoopContact {
  name:      string | null;
  phone:     string | null;
  email:     string | null;
  address:   string | null;
  bendahara: string | null;
}

interface Insights {
  monthlyTrend:    MonthlyPoint[];
  accountStatuses: AccountStatus[];
  shuEstimation:   ShuEstimation;
  coopContact:     CoopContact;
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
// ─── Sparkline SVG ────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: MonthlyPoint[]; color?: string }> = React.memo(({
  data,
  color = '#6366f1',
}) => {
  const W = 180;
  const H = 48;
  const PAD = 4;

  if (!data || data.length === 0) {
    return (
      <div className="h-12 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] italic border border-dashed border-slate-200/50 dark:border-slate-800/50 rounded-xl">
        Belum ada riwayat saldo
      </div>
    );
  }

  const amounts = data?.map(d => d.amount) || [];
  const min = Math.min(...amounts, 0);
  const max = Math.max(...amounts, 1);
  const range = max - min || 1;

  const toX = (i: number) => PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const points = data?.map((d, i) => `${toX(i)},${toY(d.amount)}`).join(' ') || '';
  const areaPoints = [
    `${PAD},${H}`,
    ...data?.map((d, i) => `${toX(i)},${toY(d.amount)}`),
    `${W - PAD},${H}`,
  ].join(' ');

  const lastPoint  = data[data.length - 1];
  const firstPoint = data[0];
  const trend = lastPoint.amount - firstPoint.amount;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#sg-${color.replace('#','')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={toX(data.length - 1)} cy={toY(lastPoint.amount)} r="3" fill={color} />
      </svg>
      <div className={`absolute top-0 right-0 flex items-center gap-0.5 text-[10px] font-bold ${
        trend > 0 ? 'text-emerald-600 dark:text-emerald-400'
          : trend < 0 ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-400'
      }`}>
        {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
        {trend !== 0 && (
          <span>
            {trend > 0 ? '+' : ''}
            {Math.abs(trend) >= 1_000_000
              ? `${(trend / 1_000_000).toFixed(1)} Jt`
              : `${Math.abs(trend).toLocaleString('id-ID')}`}
          </span>
        )}
      </div>
    </div>
  );
});
Sparkline.displayName = 'Sparkline';

// ─── Main Component ───────────────────────────────────────────────────────────
export const SavingInsightsPanel: React.FC = React.memo(() => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/cooperative/savings/me/insights');
        if (!cancelled) setInsights(res.data);
      } catch {
        // Silently fail — insights are supplementary
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [expanded, setExpanded] = useState(() => {
    return localStorage.getItem('saving_insights_expanded') === 'true';
  });

  const toggleExpand = () => {
    const nextVal = !expanded;
    setExpanded(nextVal);
    localStorage.setItem('saving_insights_expanded', String(nextVal));
  };

  const periodicStatuses = useMemo(
    () => insights?.accountStatuses?.filter(a => a.isPeriodic) ?? [],
    [insights]
  );

  const hasPeriodic = periodicStatuses.length > 0;
  const allPaid     = hasPeriodic && periodicStatuses.every(a => a.depositedThisMonth);
  const anyUnpaid   = hasPeriodic && periodicStatuses.some(a => !a.depositedThisMonth);
  const bulanIni    = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const trendColor  = '#6366f1';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
          <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const { monthlyTrend, accountStatuses, shuEstimation, coopContact } = insights;

  // Running balance reconstruction
  const totalBalance = accountStatuses?.reduce((s, a) => s + (a?.currentBalance ?? 0), 0) ?? 0;
  let runningBalance = totalBalance;
  const balanceTrend: MonthlyPoint[] = [...(monthlyTrend || [])].reverse().map(m => {
    const point = { label: m?.label ?? '', amount: runningBalance };
    runningBalance = Math.max(0, runningBalance - (m?.amount ?? 0));
    return point;
  }).reverse();

  // SHU share display
  const sharePct = shuEstimation?.memberSharePct ?? 0;
  const shareBarWidth = Math.min(sharePct, 100);

  return (
    <div className="space-y-3">
      {/* Header Expand/Collapse Card */}
      <div 
        onClick={toggleExpand}
        className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm p-4 hover:border-indigo-500/30 dark:hover:border-indigo-500/20 hover:shadow-md transition-all duration-300 cursor-pointer select-none"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left section: Icon and text */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Wawasan Keuangan & Bantuan Koperasi
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Pantau tren saldo total, estimasi SHU, iuran bulanan, dan hubungi pengurus.
              </p>
            </div>
          </div>

          {/* Right section: Badges, WhatsApp Quick Link, Chevron */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Status Iuran Badge */}
            {hasPeriodic && (
              allPaid ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                  Semua Iuran Lunas
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 px-2.5 py-1 rounded-full">
                  ⚠️ Ada Iuran Belum Lunas
                </span>
              )
            )}

            {/* Quick WhatsApp button */}
            {coopContact?.phone && (() => {
              let cleanPhone = coopContact.phone.replace(/\D/g, '');
              if (cleanPhone.startsWith('0')) {
                cleanPhone = '62' + cleanPhone.substring(1);
              }
              const waUrl = `https://wa.me/${cleanPhone}`;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(waUrl, '_blank');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
                >
                  <MessageCircle size={12} className="flex-shrink-0" />
                  <span>Tanya Bendahara</span>
                </button>
              );
            })()}

            {/* Expand indicator */}
            <div className="text-slate-400 dark:text-slate-500 p-1">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Panel Content */}
      <div 
        className={`transition-all duration-300 overflow-hidden ${
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-4 pt-1">
          {/* ── Row 1: Tren Saldo + Status Iuran ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Sparkline — Tren Saldo 6 Bulan */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tren Saldo Total</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">6 bulan terakhir</p>
                </div>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {monthlyTrend?.[monthlyTrend.length - 1]?.label ?? ''}
                </span>
              </div>

              <Sparkline data={balanceTrend} color={trendColor} />

              <div className="flex justify-between mt-1.5">
                {balanceTrend?.map((m, i) => (
                  <span key={i} className={`text-[9px] font-semibold ${
                    i === balanceTrend.length - 1
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}>
                    {m.label.split(' ')[0]}
                  </span>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-semibold">Saldo Total Saat Ini</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  Rp {totalBalance.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Status Iuran Bulan Ini */}
            <div className={`rounded-2xl border p-5 shadow-sm ${
              allPaid
                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                : anyUnpaid
                ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Iuran</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{bulanIni}</p>
                </div>
                {hasPeriodic && (
                  allPaid
                    ? <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={13} /> Lunas
                      </div>
                    : <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 px-2.5 py-1 rounded-full">
                        <AlertTriangle size={13} /> Belum Lunas
                      </div>
                )}
              </div>

              {hasPeriodic ? (
                <div className="space-y-2">
                  {periodicStatuses?.map(acc => {
                    const catColor = acc.categoryColor || '#6366f1';
                    return (
                      <div key={acc.savingId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {acc.depositedThisMonth
                            ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                            : <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                          }
                          <span className="text-[11px] font-semibold" style={{ color: catColor }}>
                            {acc.categoryName}
                          </span>
                        </div>
                        <div className="text-right">
                          {acc.depositedThisMonth ? (
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              +Rp {(acc.lastDepositAmount ?? acc.defaultAmount).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              Rp {acc.defaultAmount > 0 ? acc.defaultAmount.toLocaleString('id-ID') : '—'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 leading-relaxed italic">
                    {allPaid
                      ? '✓ Semua iuran wajib bulan ini telah tercatat.'
                      : '⚠️ Iuran yang belum tercatat diproses oleh Bendahara Koperasi.'
                    }
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-slate-300 dark:text-slate-600">
                  <CheckCircle2 size={28} className="mb-1.5 opacity-50" />
                  <p className="text-xs font-medium">Tidak ada iuran periodik</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: Estimasi SHU + CTA Hubungi Bendahara ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Estimasi SHU */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-violet-50 dark:bg-violet-500/10 rounded-lg">
                  <PieChart className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimasi Porsi SHU</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Jasa modal tahun berjalan</p>
                </div>
              </div>

              {/* Proporsi simpanan anggota */}
              <div className="mb-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Porsi simpanan Anda</span>
                  <span className="font-bold text-violet-700 dark:text-violet-400">
                    {sharePct.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                    style={{ width: `${shareBarWidth}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-300 dark:text-slate-600 mt-0.5">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Detail angka */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Simpanan modal Anda</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Rp {(shuEstimation?.memberTotalModal ?? 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total modal semua anggota</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Rp {(shuEstimation?.totalAllMembersModal ?? 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Porsi jasa modal koperasi</span>
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {shuEstimation?.porsiJasaModal ?? 0}%
                  </span>
                </div>
              </div>

              {/* SHU terakhir yang diterima */}
              {shuEstimation?.lastDistributedShu && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">SHU diterima tahun {shuEstimation.lastDistributedShu.year}</span>
                    <span className="text-sm font-black text-violet-700 dark:text-violet-400">
                      Rp {shuEstimation.lastDistributedShu.totalShu.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-1.5 mt-3 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                <Info size={11} className="flex-shrink-0 mt-0.5" />
                <span>Angka ini adalah estimasi berdasarkan proporsi simpanan, bukan nilai akhir SHU yang ditetapkan koperasi.</span>
              </div>
            </div>

            {/* CTA — Hubungi Bendahara */}
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/5 dark:to-violet-500/5 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-500/15 rounded-lg">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-400 uppercase tracking-wider">Butuh Bantuan?</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      Hubungi Bendahara Koperasi
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {coopContact?.bendahara && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <User size={12} className="text-indigo-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-200 font-semibold">{coopContact.bendahara}</span>
                      <span className="text-slate-400 text-[10px]">— Bendahara</span>
                    </div>
                  )}
                  {coopContact?.phone && (() => {
                    let cleanPhone = coopContact.phone.replace(/\D/g, '');
                    if (cleanPhone.startsWith('0')) {
                      cleanPhone = '62' + cleanPhone.substring(1);
                    }
                    const waUrl = `https://wa.me/${cleanPhone}`;
                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        <MessageCircle size={12} className="flex-shrink-0 text-emerald-500" />
                        <span>{coopContact.phone} (WhatsApp)</span>
                      </a>
                    );
                  })()}
                  {coopContact?.email && (
                    <a
                      href={`mailto:${coopContact.email}`}
                      className="flex items-center gap-2 text-[11px] text-indigo-700 dark:text-indigo-400 hover:underline"
                    >
                      <Mail size={12} className="flex-shrink-0" />
                      <span className="font-semibold">{coopContact.email}</span>
                    </a>
                  )}
                  {coopContact?.address && (
                    <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                      <span>{coopContact.address}</span>
                    </div>
                  )}
                  {(!coopContact || (!coopContact.phone && !coopContact.email && !coopContact.bendahara)) && (
                    <p className="text-[11px] text-slate-400 italic">
                      Informasi kontak belum dikonfigurasi oleh pengurus koperasi.
                    </p>
                  )}
                </div>
              </div>

              {/* Panduan layanan */}
              <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-500/20">
                <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-relaxed">
                  Ajukan <span className="font-semibold text-slate-700 dark:text-slate-300">setoran</span>,{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">penarikan</span>, atau{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">pembukaan rekening baru</span>{' '}
                  langsung ke Bendahara Koperasi.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});
SavingInsightsPanel.displayName = 'SavingInsightsPanel';
