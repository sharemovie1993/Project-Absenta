import React from 'react';
import { Sparkles, X, Check, FileCode, Copy } from 'lucide-react';
import type { HardeningInspectorProps, LiveAuditResult, LighthouseResult } from './infra.types';
import { CRITICAL_PILLAR_IDS, getGradeInfo, mapLiveAuditToStandards } from './infra.utils';
import { RadialProgress } from './components/RadialProgress';
import { LighthousePanel } from './components/LighthousePanel';
import { PillarAuditCard } from './components/PillarAuditCard';

const CRITICAL_PILLAR_IDS_ARRAY = [
  'architectural_layout_standard',
  'architectural_safe_mapping',
  'architectural_memoization',
  'fault_tolerance',
  'memory_leak_safeguards',
  'architectural_performance_optimization',
  'architectural_table_pagination',
  'code_splitting'
];

export const HardeningInspector: React.FC<HardeningInspectorProps> = ({
  pageName,
  standards,
  moduleKey
}) => {
  // 1. State Hooks
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [liveAuditResult, setLiveAudit] = React.useState<LiveAuditResult | null>(null);
  const [copiedText, setCopiedText] = React.useState(false);
  const [auditError, setAuditError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'code' | 'lighthouse'>('code');
  const [lhResult, setLhResult] = React.useState<LighthouseResult | null>(null);
  const [isLhAuditing, setIsLhAuditing] = React.useState(false);
  const [lhError, setLhError] = React.useState<string | null>(null);

  // 2. Pure values
  const devAuditHost = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';

  // 3. Callback Handlers
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

  // 4. Memoized Calculations
  const displayedStandards = React.useMemo(() => {
    return mapLiveAuditToStandards(standards, liveAuditResult);
  }, [standards, liveAuditResult]);

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

  const handleCopyPrompt = React.useCallback(() => {
    const prompt = liveAuditResult?.refactorPrompt || staticRefactorPrompt;
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).catch(console.error);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }, [liveAuditResult, staticRefactorPrompt]);

  const { cappedScore, grade, activePrompt, verifiedCount, warningCount, failedCount, totalCount } = React.useMemo(() => {
    const totalW = displayedStandards.reduce((sum, std) => {
      return sum + (CRITICAL_PILLAR_IDS_ARRAY.includes(std.id) ? 3 : 1);
    }, 0) || 1;

    const earnedW = displayedStandards.reduce((sum, std) => {
      const w = CRITICAL_PILLAR_IDS_ARRAY.includes(std.id) ? 3 : 1;
      if (std.status === 'VERIFIED') return sum + w;
      if (std.status === 'WARNING') return sum + w * 0.5;
      return sum;
    }, 0);

    const vCount = displayedStandards.filter(s => s.status === 'VERIFIED').length;
    const wCount = displayedStandards.filter(s => s.status === 'WARNING').length;
    const fCount = displayedStandards.filter(s => s.status === 'FAILED').length;
    const tCount = displayedStandards.length || 1;

    const raw = Math.round((earnedW / totalW) * 100);
    let capped = raw;
    if (fCount >= 3) capped = Math.min(capped, 24);
    else if (fCount >= 2) capped = Math.min(capped, 39);
    else if (fCount >= 1) capped = Math.min(capped, 59);
    capped = Math.max(0, capped);

    const gradeInfo = getGradeInfo(capped);
    const actPrompt = liveAuditResult?.refactorPrompt ?? staticRefactorPrompt;

    return {
      cappedScore: capped,
      grade: gradeInfo,
      activePrompt: actPrompt,
      verifiedCount: vCount,
      warningCount: wCount,
      failedCount: fCount,
      totalCount: tCount
    };
  }, [displayedStandards, liveAuditResult, staticRefactorPrompt]);

  // Production check guard
  if (typeof window !== 'undefined' && !import.meta.env.DEV) return null;

  return (
    <>
      {/* Clickable DEV badge */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full select-none shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group ${grade.badgeClass}`}
      >
        <span className="flex h-2.5 w-2.5 relative shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${grade.pingClass}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${grade.pingDotClass}`}></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider font-sans flex items-center gap-1">
          {grade.badgeText}
        </span>
      </button>

      {/* Glassmorphism Interactive Certificate Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full h-full max-h-[90vh] sm:max-h-[82vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className={`p-4 sm:p-5 ${grade.bgLight} border-b ${grade.borderClass} flex items-center justify-between shrink-0 relative overflow-hidden`}>
              <div className="flex items-center gap-3 z-10">
                <div className={`w-9 h-9 rounded-xl ${grade.bgClass} flex items-center justify-center text-white shadow-lg shrink-0`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Hardening & Architecture Standards
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${grade.badgeClass}`}>
                      Grade {grade.grade} ({cappedScore}%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Sertifikasi Kelayakan Arsitektur Modul:{' '}
                    <span className="text-white font-mono font-semibold">{pageName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 z-10">
                {moduleKey && (
                  <button
                    onClick={handleRunLiveAudit}
                    disabled={isAuditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
                  >
                    <FileCode size={13} className={isAuditing ? 'animate-spin' : ''} />
                    <span>{isAuditing ? 'Audit...' : 'Live Audit'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Subheader Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 shrink-0">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'code'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Code Architecture Standards ({verifiedCount}/{totalCount})
              </button>
              <button
                onClick={() => setActiveTab('lighthouse')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'lighthouse'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Google Lighthouse Matrix (Pilar 18)
              </button>
            </div>

            {/* Error Banner jika audit server gagal */}
            {auditError && (
              <div className="mx-4 mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center justify-between">
                <span>⚠️ {auditError}</span>
                <span className="text-[10px] text-slate-400 font-mono">dev-audit-server:9999</span>
              </div>
            )}

            {/* Body Tab Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'code' ? (
                <>
                  {/* Executive Score Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                      <RadialProgress score={cappedScore} grade={grade.grade} />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Skor Akhir</div>
                        <div className={`text-lg font-black ${grade.textClass}`}>{cappedScore}%</div>
                        <div className="text-[10px] text-slate-400">Target kelayakan: ≥ 90%</div>
                      </div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Terverifikasi</div>
                      <div className="text-lg font-black text-emerald-400">{verifiedCount} / {totalCount}</div>
                      <div className="text-[10px] text-slate-400">Pilar compliance terpenuhi</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Advisory / Warning</div>
                      <div className="text-lg font-black text-amber-400">{warningCount}</div>
                      <div className="text-[10px] text-slate-400">Dapat ditingkatkan</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Pelanggaran Kritis</div>
                      <div className="text-lg font-black text-rose-400">{failedCount}</div>
                      <div className="text-[10px] text-slate-400">Wajib direfaktor segera</div>
                    </div>
                  </div>

                  {/* Copyable Refactor Prompt Generator */}
                  {activePrompt && (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                          <Sparkles size={14} />
                          <span>AI Refactor Instruction Prompt (Copyable)</span>
                        </div>
                        <button
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold transition-all active:scale-95"
                        >
                          {copiedText ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedText ? 'Tersalin!' : 'Salin Prompt'}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/80 p-2.5 rounded-lg overflow-x-auto max-h-28 whitespace-pre-wrap border border-slate-800">
                        {activePrompt}
                      </pre>
                    </div>
                  )}

                  {/* Daftar Evaluasi Pilar */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 tracking-wide uppercase px-1">
                      Checklist Standardisasi Hardening ({displayedStandards.length} Pilar)
                    </div>
                    <div className="space-y-1.5">
                      {displayedStandards.map((std) => (
                        <PillarAuditCard key={std.id} std={std} standard={std} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <LighthousePanel
                  result={lhResult}
                  isLoading={isLhAuditing}
                  error={lhError}
                  onRunAudit={handleRunLighthouse}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
