import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import type { CooperativeSettings } from '../settings/types';

interface CoopDocumentKopProps {
  coopSettings?: CooperativeSettings | null;
  coopNameFallback?: string;
  subtitle?: string;
  subtext?: string;
  showDoubleBorder?: boolean;
  className?: string;
}

export const CoopDocumentKop: React.FC<CoopDocumentKopProps> = React.memo(({
  coopSettings: propSettings,
  coopNameFallback = 'KOPERASI KONSUMEN / SIMPAN PINJAM',
  subtitle = 'RAPAT ANGGOTA TAHUNAN (RAT)',
  subtext = 'Berdasarkan Undang-Undang Nomor 25 Tahun 1992 tentang Perkoperasian',
  showDoubleBorder = true,
  className = ''
}) => {
  // Fetch settings from API if not passed from parent
  const { data: fetchedSettings } = useQuery({
    queryKey: ['koperasi-settings-detail'],
    queryFn: async () => {
      const res = await api.get('/cooperative/settings');
      return (res.data?.data || {}) as CooperativeSettings;
    },
    enabled: !propSettings,
    staleTime: 5 * 60 * 1000,
  });

  const settings = propSettings || fetchedSettings;
  const effectiveLogoUrl = settings?.cooperative_logo_url || '/logo.png';
  const effectiveCoopName = (settings?.cooperative_name?.trim()) || coopNameFallback;

  return (
    <div
      className={`flex items-center justify-between gap-4 pb-4 mb-5 text-slate-900 ${
        showDoubleBorder ? 'border-b-4 border-double border-slate-900' : 'border-b-2 border-slate-900'
      } ${className}`}
    >
      {/* ── LOGO KOPERASI RESMI ────────────────────────────────────────── */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
        <img
          src={effectiveLogoUrl}
          alt="Logo Koperasi"
          className="max-h-16 max-w-16 sm:max-h-20 sm:max-w-20 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/logo.png';
          }}
        />
      </div>

      {/* ── IDENTITAS BADAN HUKUM & ALAMAT ────────────────────────────── */}
      <div className="flex-1 text-center px-2 space-y-0.5">
        <h1 className="text-sm sm:text-base md:text-lg font-black tracking-wider uppercase leading-tight text-slate-900">
          {effectiveCoopName}
        </h1>

        {settings?.cooperative_legal_no && (
          <p className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-wide font-sans">
            Badan Hukum No: {settings.cooperative_legal_no}
          </p>
        )}

        {subtitle && (
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-900 pt-0.5">
            {subtitle}
          </h2>
        )}

        {settings?.cooperative_address && (
          <p className="text-[10px] sm:text-[11px] font-sans text-slate-700 leading-snug">
            {settings.cooperative_address}
          </p>
        )}

        {(settings?.cooperative_phone || settings?.cooperative_email || settings?.cooperative_website) && (
          <p className="text-[9px] sm:text-[10px] font-sans text-slate-600 font-mono">
            {[
              settings?.cooperative_phone ? `Telp: ${settings.cooperative_phone}` : null,
              settings?.cooperative_email ? `Email: ${settings.cooperative_email}` : null,
              settings?.cooperative_website ? `Web: ${settings.cooperative_website}` : null,
            ].filter(Boolean).join(' | ')}
          </p>
        )}

        {subtext && (
          <p className="text-[9px] sm:text-[10px] font-sans text-slate-500 italic pt-0.5">
            {subtext}
          </p>
        )}
      </div>

      {/* ── RIGHT BALANCING SPACER (Symmetry for document print) ──────── */}
      <div className="w-16 sm:w-20 shrink-0 hidden sm:block" />
    </div>
  );
});

CoopDocumentKop.displayName = 'CoopDocumentKop';
