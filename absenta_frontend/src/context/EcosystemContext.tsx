import React, { createContext, useContext, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  type EcosystemType,
  type EcosystemTheme,
  type EcosystemColorTokens,
  getEcosystemTheme,
  getEcosystemTokens,
  getEcosystemLabel,
} from '@/config/bottomNavEcosystems.config';

export interface EcosystemContextValue {
  ecosystem: EcosystemType;
  theme: EcosystemTheme;
  tokens: EcosystemColorTokens;
  label: string;
  isLayer2: boolean;
}

export const EcosystemContext = createContext<EcosystemContextValue | null>(null);

/**
 * Otomatis mendeteksi ekosistem divisi aktif dari URL Pathname & Query Params
 */
export function resolveEcosystemFromUrl(
  pathname: string = '',
  searchParams?: URLSearchParams | null
): EcosystemType {
  const currentTab = searchParams ? searchParams.get('tab') : null;

  if (pathname.startsWith('/kurikulum')) return 'kurikulum';
  if (pathname.startsWith('/kesiswaan')) return 'kesiswaan';
  if (pathname.startsWith('/hubin/tracer') || pathname.startsWith('/hubin/bkk')) return 'bkk';
  if (pathname.startsWith('/hubin')) return 'hubin';
  if (pathname.startsWith('/bpbk')) return 'bpbk';
  if (pathname.startsWith('/sarpras')) return 'sarpras';
  if (pathname.startsWith('/attendance/anggota-eskul') || pathname.startsWith('/rapor/eskul')) return 'ekskul';
  if (pathname.startsWith('/cooperative')) return 'koperasi';
  if (pathname.startsWith('/attendance/gate')) return 'satpam';
  if (pathname.startsWith('/attendance/terlambat') || pathname.startsWith('/attendance/dispensasi')) return 'piket';
  if (pathname.startsWith('/academic') || pathname.startsWith('/users')) return 'admin';

  if (pathname.startsWith('/dashboard') || pathname === '/') {
    if (currentTab === 'kaprog') return 'kaprog';
    if (currentTab === 'binaan' || currentTab === 'walas') return 'walas';
    if (currentTab === 'kepegawaian' || currentTab === 'tu') return 'tu';
    if (currentTab === 'kurikulum') return 'kurikulum';
    if (currentTab === 'kesiswaan') return 'kesiswaan';
    if (currentTab === 'hubin') return 'hubin';
    if (currentTab === 'bkk') return 'bkk';
    if (currentTab === 'bk' || currentTab === 'bpbk') return 'bpbk';
    if (currentTab === 'sarpras') return 'sarpras';
    if (currentTab === 'toolman') return 'toolman';
    if (currentTab === 'ekskul') return 'ekskul';
    if (currentTab === 'pembimbing_pkl') return 'pembimbing_pkl';
    if (currentTab === 'satpam' || currentTab === 'gerbang') return 'satpam';
    if (currentTab === 'koperasi') return 'koperasi';
    if (currentTab === 'kelola' || currentTab === 'piket') return 'piket';
    if (currentTab === 'admin') return 'admin';
    if (currentTab === 'siswa') return 'siswa';
  }

  return 'portal';
}

export interface EcosystemProviderProps {
  ecosystem?: EcosystemType;
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/**
 * ── ECOSYSTEM THEME PROVIDER (STANDAR INDUSTRI ABSENTA) ──
 * Membungkus seluruh dashboard peran atau halaman modul agar seluruh tombol,
 * badge, link, dan aksen visual di bawahnya otomatis selaras dengan warna ekosistem induk.
 */
export const EcosystemProvider: React.FC<EcosystemProviderProps> = ({
  ecosystem: propEcosystem,
  children,
  className,
  as: Component = 'div',
}) => {
  let locationPathname = '';
  let searchParams: URLSearchParams | null = null;

  try {
    const loc = useLocation();
    locationPathname = loc.pathname;
  } catch {
    if (typeof window !== 'undefined') {
      locationPathname = window.location.pathname;
    }
  }

  try {
    const [sp] = useSearchParams();
    searchParams = sp;
  } catch {
    if (typeof window !== 'undefined') {
      searchParams = new URLSearchParams(window.location.search);
    }
  }

  const resolvedEcosystem = useMemo<EcosystemType>(() => {
    if (propEcosystem) return propEcosystem;
    return resolveEcosystemFromUrl(locationPathname, searchParams);
  }, [propEcosystem, locationPathname, searchParams]);

  const value = useMemo<EcosystemContextValue>(() => {
    const theme = getEcosystemTheme(resolvedEcosystem);
    const tokens = getEcosystemTokens(resolvedEcosystem);
    const label = getEcosystemLabel(resolvedEcosystem);
    return {
      ecosystem: resolvedEcosystem,
      theme,
      tokens,
      label,
      isLayer2: theme.isLayer2,
    };
  }, [resolvedEcosystem]);

  return (
    <EcosystemContext.Provider value={value}>
      {Component === React.Fragment ? (
        children
      ) : (
        <Component data-ecosystem={resolvedEcosystem} className={className}>
          {children}
        </Component>
      )}
    </EcosystemContext.Provider>
  );
};

/**
 * Hook universal untuk mengakses token warna dan status ekosistem aktif
 */
export function useEcosystem(overrideEcosystem?: EcosystemType): EcosystemContextValue {
  const context = useContext(EcosystemContext);

  let locationPathname = '';
  let searchParams: URLSearchParams | null = null;

  try {
    const loc = useLocation();
    locationPathname = loc.pathname;
  } catch {
    if (typeof window !== 'undefined') {
      locationPathname = window.location.pathname;
    }
  }

  try {
    const [sp] = useSearchParams();
    searchParams = sp;
  } catch {
    if (typeof window !== 'undefined') {
      searchParams = new URLSearchParams(window.location.search);
    }
  }

  return useMemo(() => {
    const eco: EcosystemType =
      overrideEcosystem ||
      context?.ecosystem ||
      resolveEcosystemFromUrl(locationPathname, searchParams);

    const theme = getEcosystemTheme(eco);
    const tokens = getEcosystemTokens(eco);
    const label = getEcosystemLabel(eco);

    return {
      ecosystem: eco,
      theme,
      tokens,
      label,
      isLayer2: theme.isLayer2,
    };
  }, [overrideEcosystem, context, locationPathname, searchParams]);
}
