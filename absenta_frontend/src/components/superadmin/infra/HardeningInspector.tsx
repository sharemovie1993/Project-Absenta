import React from 'react';
import { Sparkles, X, Check, FileCode, Copy } from 'lucide-react';
import type { HardeningInspectorProps, LiveAuditResult, LighthouseResult } from './infra.types';
import { CRITICAL_PILLAR_IDS, getGradeInfo, mapLiveAuditToStandards } from './infra.utils';
import { RadialProgress } from './components/RadialProgress';
import { LighthousePanel } from './components/LighthousePanel';
import { PillarAuditCard } from './components/PillarAuditCard';

// ─── PREMIUM DEV-ONLY HARDENING COMPLIANCE INSPECTOR ──────────────────────────

export const HardeningInspector: React.FC<HardeningInspectorProps> = ({
  pageName,
  standards,
  moduleKey
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [liveAuditResult, setLiveAudit] = React.useState<LiveAuditResult | null>(null);
  const [copiedText, setCopiedText] = React.useState(false);
  const [auditError, setAuditError] = React.useState<string | null>(null);

  // Lighthouse States
  const [activeTab, setActiveTab] = React.useState<'code' | 'lighthouse'>('code');
  const [lhResult, setLhResult] = React.useState<LighthouseResult | null>(null);
  const [isLhAuditing, setIsLhAuditing] = React.useState(false);
  const [lhError, setLhError] = React.useState<string | null>(null);

  // Jangan render apapun di mode produksi

  // ③ useCallback pada semua handler agar referensi stabil lintas render
  const handleRunLiveAudit = React.useCallback(async () => {
    if (!moduleKey) return;
    setIsAuditing(true);
    setAuditError(null);
    try {
      const res = await fetch(`http://${devAuditHost}:9999/api/audit?key=${encodeURIComponent(moduleKey)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: LiveAuditResult = await res.json();
      setLiveAudit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error tidak dikenal';
      setAuditError(msg || 'Gagal terhubung ke Dev Audit Server (pastikan port 9999 berjalan)');
    } finally {
      setIsAuditing(false);
    }
  }, [moduleKey, devAuditHost]);
  const handleRunLighthouse = React.useCallback(async () => {
    setIsLhAuditing(true);
    setLhError(null);
    try {
      const currentUrl = window.location.href;
      const res = await fetch(`http://${devAuditHost}:9999/api/lighthouse?url=${encodeURIComponent(currentUrl)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: LighthouseResult = await res.json();
      setLhResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error tidak dikenal';
      setLhError(msg || 'Gagal terhubung ke Dev Audit Server (pastikan port 9999 berjalan)');
    } finally {
      setIsLhAuditing(false);
    }
  }, [devAuditHost]);

  // ④ displayedStandards: mapper live audit ke checklist + tambah Pilar 5 safeEffect
  const displayedStandards = React.useMemo(() => {
    return mapLiveAuditToStandards(standards, liveAuditResult);
  }, [standards, liveAuditResult]);

  // ─── Fallback refactor prompt dari data statis (jika live audit server tidak berjalan) ───
  const staticRefactorPrompt = React.useMemo(() => {
    const failedPillars = displayedStandards.filter(s => s.status === 'FAILED' || s.status === 'WARNING');
    if (failedPillars.length === 0) return null;
    let prompt = `Tolong lakukan refaktor hardening penuh berdasarkan temuan audit arsitektur statis:\n\n`;
    failedPillars.forEach((std, idx) => {
      const prefix = std.status === 'FAILED' ? '❌' : '⚠️';
      prompt += `${idx + 1}. ${prefix} [${std.name}] – ${std.details}\n`;
    });
    prompt += `\nLakukan refaktor struktural ini agar halaman lulus sertifikasi kelayakan hardening 100%!`;
    return prompt;
  }, [displayedStandards]);

  // Prompt yang akan ditampilkan dan disalin (live audit lebih prioritas dari statis)

  const handleCopyPrompt = React.useCallback(() => {
    const prompt = liveAuditResult?.refactorPrompt || staticRefactorPrompt;
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).catch(console.error);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, [liveAuditResult, staticRefactorPrompt]);

  // ─── Weighted Scoring Engine (v2 – Hardened) ───────────────────────────────
  // Pilar kritis memiliki bobot 3x, pilar advisory bobotnya 1x

  // ⑤ getGradeInfo sudah dipindah ke luar komponen – tinggal panggil
  const grade = React.useMemo(() => getGradeInfo(cappedScore), [cappedScore]);
  if (typeof window !== 'undefined' && !import.meta.env.DEV) return null;
  const devAuditHost = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
  const activePrompt = liveAuditResult?.refactorPrompt ?? staticRefactorPrompt;
  const CRITICAL_PILLAR_IDS_ARRAY = ['architectural_layout_standard', 'architectural_safe_mapping', 'architectural_memoization', 'fault_tolerance', 'memory_leak_safeguards', 'architectural_performance_optimization', 'architectural_table_pagination', 'code_splitting'];
  const totalWeight = displayedStandards.reduce((sum, std) => {
    return sum + (CRITICAL_PILLAR_IDS_ARRAY.includes(std.id) ? 3 : 1);
  }, 0) || 1;
  const earnedWeight = displayedStandards.reduce((sum, std) => {
    const w = CRITICAL_PILLAR_IDS_ARRAY.includes(std.id) ? 3 : 1;
    if (std.status === 'VERIFIED') return sum + w;
    if (std.status === 'WARNING') return sum + w * 0.5;
    return sum; // FAILED = 0
  }, 0);
  const verifiedCount = displayedStandards.filter(s => s.status === 'VERIFIED').length;
  const warningCount = displayedStandards.filter(s => s.status === 'WARNING').length;
  const failedCount = displayedStandards.filter(s => s.status === 'FAILED').length;
  const totalCount = displayedStandards.length || 1;

  // Base weighted score
  const rawScore = Math.round(earnedWeight / totalWeight * 100);

  // Grade cap: setiap FAILED kritis memblokir grade tinggi
  let cappedScore = rawScore;
  if (failedCount >= 3) cappedScore = Math.min(cappedScore, 24); // Paksa F
  else if (failedCount >= 2) cappedScore = Math.min(cappedScore, 39); // Paksa D
  else if (failedCount >= 1) cappedScore = Math.min(cappedScore, 59); // Blokir A & B → max C
  cappedScore = Math.max(0, cappedScore);
  return <>
      {/* Clickable DEV badge */}
      <button type="button" onClick={() => setIsOpen(true)} className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full select-none shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group ${grade.badgeClass}`}>
        <span className="flex h-2.5 w-2.5 relative shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${grade.pingClass}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${grade.pingDotClass}`}></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider font-sans flex items-center gap-1">
          {grade.badgeText}
        </span>
      </button>

      {/* Glassmorphism Interactive Certificate Modal */}
      {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full h-full max-h-[90vh] sm:max-h-[82vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>
            {/* ⑥ Header Banner – warna adaptif sesuai grade */}
            <div className={`relative p-4 bg-gradient-to-r ${grade.headerGlow} border-b border-slate-800 overflow-hidden flex items-center justify-between gap-6`}>
              {/* Abstract glowing orbs */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-current opacity-5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-current opacity-5 rounded-full blur-2xl pointer-events-none" />

              {/* Left: Title Area */}
              <div className="space-y-0.5 z-10 flex-shrink-0">
                <span className="inline-flex items-center gap-1 text-[8px] font-extrabold text-emerald-400 tracking-widest uppercase bg-emerald-950/60 border border-emerald-900/40 px-2 py-0.5 rounded">
                  <Sparkles className="h-2 w-2" /> Dev-Mode Certification
                </span>
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                  Sertifikat Standar Hardening
                </h3>
                <p className="text-[10px] text-slate-400 font-medium font-sans">
                  Halaman: <code className="text-emerald-300 font-bold font-mono">{pageName}</code>
                </p>
              </div>

              {/* Right: Persistant Score Widget Area */}
              <div className="flex-1 z-10 max-w-xs hidden sm:flex items-center gap-3 bg-slate-950/40 border border-slate-800/50 p-2.5 rounded-xl backdrop-blur-sm mr-12">
                {/* Grade ring */}
                <div className="relative flex items-center justify-center shrink-0">
                  <div className={`w-10 h-10 rounded-full border-[2.5px] ${grade.ringClass} flex items-center justify-center text-center`}>
                    <span className="text-[12px] font-black font-mono text-white">{grade.letter}</span>
                  </div>
                  <div className={`absolute -inset-0.5 rounded-full border ${grade.ringPulse} animate-ping opacity-15 pointer-events-none`} />
                </div>

                {/* Score details */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-slate-200 truncate">Hardening: {cappedScore}%</span>
                    <span className="text-[7.5px] font-black text-slate-500 font-mono shrink-0">{verifiedCount}/{totalCount}</span>
                  </div>
                  {/* Mini animated score bar */}
                  <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${cappedScore >= 80 ? 'bg-emerald-500' : cappedScore >= 60 ? 'bg-yellow-500' : cappedScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{
                  width: `${cappedScore}%`
                }} />
                  </div>
                  {/* Compact Stats */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7.5px] font-black text-emerald-400">✓ {verifiedCount}</span>
                    {warningCount > 0 && <span className="text-[7.5px] font-black text-yellow-400">⚠ {warningCount}</span>}
                    {failedCount > 0 && <span className="text-[7.5px] font-black text-red-400 animate-pulse">✗ {failedCount}</span>}
                  </div>
                </div>
              </div>

              {/* Floating Close Button - Absolute Positioned for Visibility */}
              <button type="button" onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer z-50 flex items-center justify-center shadow-lg backdrop-blur-md group" title="Tutup Sertifikat">
                <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-1">
              <button type="button" onClick={() => setActiveTab('code')} className={`py-2 px-4 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'code' ? 'border-emerald-500 text-emerald-400 font-extrabold font-sans' : 'border-transparent text-slate-400 hover:text-slate-200 font-sans'}`}>
                🛡️ Audit Kode
              </button>
              <button type="button" onClick={() => setActiveTab('lighthouse')} className={`py-2 px-4 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'lighthouse' ? 'border-indigo-500 text-indigo-400 font-extrabold font-sans' : 'border-transparent text-slate-400 hover:text-slate-200 font-sans'}`}>
                🧭 Performa & A11y
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {activeTab === 'code' && <>
                  {/* Dynamic Real-time Audit Trigger Button */}
                  {moduleKey && <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-950/50 flex flex-col gap-2">
                      <button type="button" onClick={handleRunLiveAudit} disabled={isAuditing} className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-[0.98] disabled:opacity-50">
                        {isAuditing ? '🔄 Sedang Menganalisis Kode Sumber...' : '🔍 Jalankan Audit Kode Sumber Riil'}
                      </button>
                      {auditError && <p className="text-[10px] text-rose-400 font-bold font-sans">⚠️ {auditError}</p>}
                    </div>}

                {/* Compliance Report Checklists – Hardened v2 */}
                <div className="px-6 pt-3 pb-1.5">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-sans">
                    📋 Laporan Audit Kode Sumber ({totalCount} Pilar):
                  </div>
                </div>
                <div className="px-6 pb-5 space-y-2">
                  {displayedStandards.map(std => <PillarAuditCard key={std.id} std={std} isCritical={CRITICAL_PILLAR_IDS.has(std.id)} />)}
                </div>

                  {/* Dynamic Copyable Refactoring Instruction Area */}
                  {activePrompt && <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-2">
                    <div className="flex items-center gap-1.5 px-1">
                      <FileCode className="h-3 w-3 text-slate-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {liveAuditResult ? 'Preview Instruksi (Live):' : 'Preview Instruksi (Statis):'}
                      </span>
                    </div>
                    <textarea readOnly value={activePrompt} className="w-full h-16 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-[9px] font-mono leading-tight focus:outline-none resize-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent" />
                  </div>}
                </>}

              {activeTab === 'lighthouse' && <LighthousePanel lhResult={lhResult} isLhAuditing={isLhAuditing} lhError={lhError} onRunLighthouse={handleRunLighthouse} />}
            </div>

            {/* Certificate Footer */}
            <div className="p-3 bg-slate-900/40 border-t border-slate-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-bold text-slate-500 tracking-wider hidden md:inline">
                  VALIDATED BY DEEPMIND ANTIGRAVITY
                </span>
                
                {/* Always visible copy button in footer if there are issues or result, on code tab */}
                {activeTab === 'code' && activePrompt && <button type="button" onClick={handleCopyPrompt} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95 border ${copiedText ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/30'}`}>
                    {copiedText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedText ? 'Tersalin!' : 'Salin Perintah'}
                  </button>}
              </div>

              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow transition-colors cursor-pointer active:scale-95 border border-slate-700">
                Selesai Inspeksi
              </button>
            </div>
          </div>
        </div>}
    </>;
};