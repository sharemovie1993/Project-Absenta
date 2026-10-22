import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  Download,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  Smartphone,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Users,
  RotateCw,
  Loader2,
  LayoutTemplate,
} from 'lucide-react';
import { getMyTenant, type Tenant } from '@/api/tenants.api';
import { sekolahApi, type Sekolah } from '@/api/academic/sekolah.api';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_JABAR_LOGO_SVG, resolveCoverImageBase64 } from '@/utils/print/rapor/raporShared';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '@/lib/utils';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export interface PrintHeaderLine {
  text: string;
  fontSize?: number; // Size in pt/px
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string;
}

export interface PrintHeaderTenantInfo {
  name?: string;
  logo_url?: string | null;
  logo_daerah_url?: string | null;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  nama_dinas_atas?: string;
  nama_dinas_bawah?: string;
  nama_cabang_dinas?: string;
  kode_pos?: string;
  print_header_lines?: string[] | PrintHeaderLine[];
}

export interface PrintHeaderProps {
  variant?: 'portrait' | 'landscape' | 'compact';
  tenantInfo?: PrintHeaderTenantInfo;
  roleTitle?: string;
  departmentTitle?: string;
  documentTitle?: string;
  documentNumber?: string;
  academicYear?: string;
  showDivider?: boolean;
  showLogoDaerah?: boolean;
  showLogoSekolah?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface UsePrintHeaderDataResult {
  tenantInfo: PrintHeaderTenantInfo;
  logoDaerahBase64: string | null;
  logoSekolahBase64: string | null;
  isLoading: boolean;
  isError: boolean;
  rawTenant: Tenant | null;
  rawSekolah: Sekolah | null;
  refetch: () => Promise<any>;
}

// ============================================================================
// 2. UNIVERSAL HOOK: usePrintHeaderData (DRY Resolution for any Role)
// ============================================================================

export function usePrintHeaderData(
  override?: Partial<PrintHeaderTenantInfo>
): UsePrintHeaderDataResult {
  const authTenant = useAuthStore((s) => s.user?.tenant);
  const authTenantId = useAuthStore((s) => s.user?.tenant_id);

  // 1. Fetch Tenant data from /tenants/me
  const {
    data: tenantRes,
    isLoading: isLoadingTenant,
    isError: isErrorTenant,
    refetch: refetchTenant,
  } = useQuery({
    queryKey: ['tenant-my-header', authTenantId],
    queryFn: async () => {
      try {
        const res = await getMyTenant();
        return (res as any)?.data || res || null;
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // 2. Fetch Sekolah Profile data from /sekolah/me
  const {
    data: sekolahRes,
    isLoading: isLoadingSekolah,
    isError: isErrorSekolah,
    refetch: refetchSekolah,
  } = useQuery({
    queryKey: ['sekolah-profile-header'],
    queryFn: async () => {
      try {
        const res = await sekolahApi.getProfile();
        return (res as any)?.data || res || null;
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const tenant = (tenantRes as Tenant) || null;
  const sekolah = (sekolahRes as Sekolah) || null;

  // 3. Resolve Merged Tenant Info
  const resolvedTenantInfo: PrintHeaderTenantInfo = useMemo(() => {
    const rawLines =
      override?.print_header_lines ||
      tenant?.print_header_lines ||
      (sekolah as any)?.print_header_lines ||
      null;

    const dinasAtas =
      override?.nama_dinas_atas ||
      tenant?.nama_dinas_atas ||
      'PEMERINTAH DAERAH PROVINSI JAWA BARAT';

    const dinasBawah =
      override?.nama_dinas_bawah ||
      tenant?.nama_dinas_bawah ||
      'DINAS PENDIDIKAN';

    const cabangDinas =
      override?.nama_cabang_dinas ||
      tenant?.nama_cabang_dinas ||
      'CABANG DINAS PENDIDIKAN WILAYAH IV';

    const schoolName =
      override?.name ||
      tenant?.name ||
      sekolah?.nama ||
      (authTenant as any)?.name ||
      'SMK NEGERI 1 PLERED';

    const address =
      override?.address ||
      tenant?.address ||
      sekolah?.alamat ||
      '';

    const phone =
      override?.phone ||
      tenant?.phone ||
      sekolah?.telepon ||
      '';

    const email =
      override?.email ||
      tenant?.email ||
      sekolah?.email ||
      '';

    const website =
      override?.website ||
      tenant?.website ||
      sekolah?.website ||
      '';

    // Regional Logo (Daerah)
    const isJabar =
      /jawa barat|jabar/i.test(dinasAtas) ||
      /jawa barat|purwakarta|bandung|bogor|bekasi|cirebon|subang/i.test(address);

    const logoDaerah =
      override?.logo_daerah_url ??
      tenant?.logo_daerah_url ??
      (sekolah as any)?.logo_daerah_url ??
      (sekolah as any)?.logo_daerah ??
      (isJabar ? DEFAULT_JABAR_LOGO_SVG : null);

    // School Logo (Sekolah)
    const logoSekolah =
      override?.logo_url ??
      tenant?.logo_url ??
      sekolah?.logo_url ??
      (sekolah as any)?.logo ??
      (authTenant as any)?.logo_url ??
      '/logo.png';

    return {
      name: schoolName,
      logo_url: logoSekolah,
      logo_daerah_url: logoDaerah,
      address,
      phone,
      email,
      website,
      nama_dinas_atas: dinasAtas,
      nama_dinas_bawah: dinasBawah,
      nama_cabang_dinas: cabangDinas,
      print_header_lines: rawLines || [dinasAtas, dinasBawah, cabangDinas, schoolName],
    };
  }, [override, tenant, sekolah, authTenant]);

  // 4. Asynchronously Pre-convert Logos to Base64 for instant jsPDF compatibility
  const [logoDaerahBase64, setLogoDaerahBase64] = useState<string | null>(null);
  const [logoSekolahBase64, setLogoSekolahBase64] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (resolvedTenantInfo.logo_daerah_url) {
      resolveCoverImageBase64(resolvedTenantInfo.logo_daerah_url)
        .then((b64) => {
          if (active) setLogoDaerahBase64(b64);
        })
        .catch(() => {
          if (active) setLogoDaerahBase64(null);
        });
    } else {
      setLogoDaerahBase64(null);
    }

    if (resolvedTenantInfo.logo_url) {
      resolveCoverImageBase64(resolvedTenantInfo.logo_url)
        .then((b64) => {
          if (active) setLogoSekolahBase64(b64);
        })
        .catch(() => {
          if (active) setLogoSekolahBase64(null);
        });
    } else {
      setLogoSekolahBase64(null);
    }

    return () => {
      active = false;
    };
  }, [resolvedTenantInfo.logo_daerah_url, resolvedTenantInfo.logo_url]);

  const refetch = async () => {
    await Promise.allSettled([refetchTenant(), refetchSekolah()]);
  };

  return {
    tenantInfo: resolvedTenantInfo,
    logoDaerahBase64,
    logoSekolahBase64,
    isLoading: isLoadingTenant || isLoadingSekolah,
    isError: isErrorTenant && isErrorSekolah,
    rawTenant: tenant,
    rawSekolah: sekolah,
    refetch,
  };
}

// ============================================================================
// 3. PURE PRESENTATIONAL PRINT HEADER (SSR & renderToString Safe)
// ============================================================================

export const PrintHeaderPure: React.FC<PrintHeaderProps> = ({
  variant = 'portrait',
  tenantInfo,
  roleTitle,
  departmentTitle,
  documentTitle,
  documentNumber,
  academicYear,
  showDivider = true,
  showLogoDaerah = true,
  showLogoSekolah = true,
  className,
  style,
}) => {
  const logoSekolah = showLogoSekolah ? (tenantInfo?.logo_url || null) : null;
  const logoDaerah = showLogoDaerah ? (tenantInfo?.logo_daerah_url || DEFAULT_JABAR_LOGO_SVG) : null;

  const alamatLengkap = tenantInfo?.address || '';
  const telepon = tenantInfo?.phone || '';
  const email = tenantInfo?.email || '';
  const website = tenantInfo?.website || '';

  // 1. Resolve Raw Lines
  const rawLines =
    tenantInfo?.print_header_lines && tenantInfo.print_header_lines.length > 0
      ? tenantInfo.print_header_lines
      : [
          tenantInfo?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          tenantInfo?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          tenantInfo?.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
          tenantInfo?.name || 'SMK NEGERI 1 PLERED',
        ];

  // 2. Parse Lines into formatted PrintHeaderLine objects
  const parsedLines: PrintHeaderLine[] = rawLines.map((line, idx) => {
    if (typeof line === 'object' && line !== null) {
      return line as PrintHeaderLine;
    }

    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return parsed as PrintHeaderLine;
      }
    } catch {}

    const textStr = typeof line === 'string' ? line : (line as any).text || '';
    let fontSize = 11.5;

    if (idx === 0 || idx === 1 || idx === 2) {
      fontSize = 11;
    } else if (idx === 3 || idx === rawLines.length - 1) {
      fontSize = textStr.length > 32 ? 12.5 : 13.5;
    }

    return {
      text: textStr,
      fontSize,
      bold: true,
      italic: false,
      underline: false,
      fontFamily: "'Book Antiqua', 'Bookman Old Style', serif",
    };
  });

  // 3. COMPACT THERMAL LAYOUT (Receipt rolls)
  if (variant === 'compact') {
    const mainSchoolLine = parsedLines[parsedLines.length - 1];
    const schoolDisplayName = mainSchoolLine?.text || tenantInfo?.name || 'ABSENTA';

    return (
      <div
        className={cn('w-full text-center mb-3 pb-2 border-b border-dashed border-black', className)}
        style={{ ...style }}
      >
        {logoSekolah ? (
          <img
            src={logoSekolah}
            alt="Logo Sekolah"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            style={{ height: '32px', width: 'auto', margin: '0 auto 4px auto', display: 'block', objectFit: 'contain' }}
          />
        ) : logoDaerah ? (
          <img
            src={logoDaerah}
            alt="Logo Daerah"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            style={{ height: '32px', width: 'auto', margin: '0 auto 4px auto', display: 'block', objectFit: 'contain' }}
          />
        ) : null}
        <h1 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: '2px 0 0 0' }}>
          {schoolDisplayName}
        </h1>
        <p style={{ fontSize: '8px', color: '#475569', margin: 0 }}>{alamatLengkap.substring(0, 48)}...</p>
      </div>
    );
  }

  // 4. PORTRAIT & LANDSCAPE LAYOUTS (SAFETY WRAPPING + PERFECT SYMMETRY)
  const isLandscape = variant === 'landscape';

  const textLineCount = parsedLines.length;
  const hasAddress = Boolean(alamatLengkap);
  const hasContact = Boolean(website || email);
  const totalLines = textLineCount + (hasAddress ? 1 : 0) + (hasContact ? 1 : 0);

  const calculatedHeightNum = isLandscape
    ? Math.min(115, Math.max(75, 85 + (totalLines - 4) * 12))
    : Math.min(95, Math.max(60, 70 + (totalLines - 4) * 9));

  const imgHeight = `${calculatedHeightNum}px`;
  const colWidthNum = Math.max(70, Math.round(calculatedHeightNum * 0.95));
  const colWidth = `${colWidthNum}px`;
  const maxLogoWidth = `${Math.round(calculatedHeightNum * 0.88)}px`;

  return (
    <div className={cn('w-full select-text', className)} style={style}>
      <table
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          borderBottom: showDivider ? '3.5px double #000000' : 'none',
          marginBottom: showDivider ? '14px' : '6px',
          paddingBottom: '6px',
          boxSizing: 'border-box',
        }}
      >
        <tbody>
          <tr>
            {/* Logo Kiri (Daerah / Pemda) */}
            <td
              style={{
                width: colWidth,
                minWidth: colWidth,
                maxWidth: colWidth,
                verticalAlign: 'middle',
                textAlign: 'center',
                padding: '0 2px 4px 0',
              }}
            >
              {logoDaerah ? (
                <img
                  src={logoDaerah}
                  alt="Logo Kiri Daerah"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  style={{
                    height: imgHeight,
                    width: 'auto',
                    maxHeight: imgHeight,
                    maxWidth: maxLogoWidth,
                    objectFit: 'contain',
                    margin: '0 auto',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{ width: maxLogoWidth, height: '1px' }} />
              )}
            </td>

            {/* Teks Resmi Kop Surat (Tengah Sempurna dengan Auto-Wrapping) */}
            <td
              style={{
                textAlign: 'center',
                verticalAlign: 'middle',
                padding: '0 6px 4px 6px',
                overflowWrap: 'break-word',
                wordBreak: 'normal',
                hyphens: 'none',
              }}
            >
              {parsedLines.map((line, index) => {
                const isLast = index === parsedLines.length - 1;

                const lineStyle: React.CSSProperties = {
                  whiteSpace: 'normal',
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  hyphens: 'none',
                  textAlign: 'center',
                  display: 'block',
                  width: '100%',
                  margin: '1px 0',
                  lineHeight: '1.2',
                  fontFamily: line.fontFamily || "'Book Antiqua', 'Bookman Old Style', serif",
                  fontSize: line.fontSize
                    ? `${isLandscape ? line.fontSize * 1.15 : line.fontSize}pt`
                    : isLast
                    ? '13pt'
                    : '11pt',
                  fontWeight: line.bold !== false ? 'bold' : 'normal',
                  fontStyle: line.italic ? 'italic' : 'normal',
                  textDecoration: line.underline ? 'underline' : 'none',
                  textTransform: 'uppercase',
                  color: '#000000',
                  letterSpacing: '0.2px',
                };

                return (
                  <div key={index} style={lineStyle}>
                    {line.text}
                  </div>
                );
              })}

              {/* Alamat & Informasi Kontak */}
              {alamatLengkap && (
                <div
                  style={{
                    fontSize: '8.5pt',
                    fontWeight: 500,
                    color: '#334155',
                    marginTop: '3px',
                    textAlign: 'center',
                    lineHeight: '1.25',
                    fontFamily: "'Book Antiqua', 'Bookman Old Style', serif",
                    whiteSpace: 'normal',
                    wordBreak: 'normal',
                    hyphens: 'none',
                  }}
                >
                  {alamatLengkap} {telepon ? ` | Telp: ${telepon}` : ''}
                </div>
              )}
              {(website || email) && (
                <div
                  style={{
                    fontSize: '8pt',
                    fontWeight: 600,
                    color: '#475569',
                    marginTop: '1px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    whiteSpace: 'normal',
                    wordBreak: 'normal',
                    hyphens: 'none',
                  }}
                >
                  {website ? `Website: ${website}` : ''} {email ? ` | Email: ${email}` : ''}
                </div>
              )}
            </td>

            {/* Logo Kanan (Sekolah) */}
            <td
              style={{
                width: colWidth,
                minWidth: colWidth,
                maxWidth: colWidth,
                verticalAlign: 'middle',
                textAlign: 'center',
                padding: '0 0 4px 2px',
              }}
            >
              {logoSekolah ? (
                <img
                  src={logoSekolah}
                  alt="Logo Kanan Sekolah"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  style={{
                    height: imgHeight,
                    width: 'auto',
                    maxHeight: imgHeight,
                    maxWidth: maxLogoWidth,
                    objectFit: 'contain',
                    margin: '0 auto',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{ width: maxLogoWidth, height: '1px' }} />
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Universal Document Sub-Header (When metadata props are passed) */}
      {(documentTitle || departmentTitle || documentNumber || academicYear || roleTitle) && (
        <div className="text-center my-4 space-y-1">
          {documentTitle && (
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black">
              {documentTitle}
            </h3>
          )}
          {departmentTitle && (
            <p className="text-xs sm:text-sm font-semibold uppercase text-slate-800">
              {departmentTitle}
            </p>
          )}
          {documentNumber && (
            <p className="text-[11px] font-mono text-slate-600 tracking-wide">
              {documentNumber}
            </p>
          )}
          {academicYear && (
            <p className="text-[11px] font-normal italic text-slate-600">
              {academicYear}
            </p>
          )}
          {roleTitle && (
            <div className="pt-1">
              <span className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                Unit / Role: {roleTitle}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. CONNECTED PRINT HEADER (Auto-resolves Tenant & School Data via Hooks)
// ============================================================================

const PrintHeaderConnected: React.FC<PrintHeaderProps> = (props) => {
  const { tenantInfo: resolvedInfo } = usePrintHeaderData(props.tenantInfo);
  return <PrintHeaderPure {...props} tenantInfo={resolvedInfo} />;
};

/**
 * Universal PrintHeader Component
 * Can be called with 0 props `<PrintHeader />` to automatically fetch active tenant/sekolah data,
 * or with explicit `tenantInfo` for custom/SSR rendering.
 */
export const PrintHeader: React.FC<PrintHeaderProps> = (props) => {
  // If complete tenantInfo is provided by caller, render directly (SSR & renderToString friendly)
  if (props.tenantInfo && props.tenantInfo.name && (props.tenantInfo.logo_url || props.tenantInfo.address)) {
    return <PrintHeaderPure {...props} />;
  }
  return <PrintHeaderConnected {...props} />;
};

// ============================================================================
// 5. UNIVERSAL PAPER SHEET: PrintDocumentSheet (A4 / F4 Physical Sheet)
// ============================================================================

export interface PrintDocumentSheetProps {
  orientation?: 'portrait' | 'landscape';
  pageNumber?: number;
  totalPages?: number;
  pageLabel?: string;
  footerText?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const PrintDocumentSheet: React.FC<PrintDocumentSheetProps> = ({
  orientation = 'portrait',
  pageNumber,
  totalPages,
  pageLabel,
  footerText,
  children,
  className,
  style,
  id,
}) => {
  const isLandscape = orientation === 'landscape';

  // Physical Dimensions:
  // Portrait: 794px × 1123px (210mm × 297mm at 96 DPI)
  // Landscape: 1123px × 794px (297mm × 210mm at 96 DPI)
  const widthPx = isLandscape ? 1123 : 794;
  const minHeightPx = isLandscape ? 794 : 1123;

  return (
    <div
      id={id}
      style={{
        width: `${widthPx}px`,
        minWidth: `${widthPx}px`,
        maxWidth: `${widthPx}px`,
        minHeight: `${minHeightPx}px`,
        ...style,
      }}
      className={cn(
        'print-sheet bg-white text-slate-900 shadow-2xl rounded-sm font-serif text-[12px] leading-relaxed select-text border border-slate-300 dark:border-slate-800 flex flex-col justify-between transition-shadow',
        isLandscape ? 'p-8 sm:p-12' : 'p-8 sm:p-12',
        className
      )}
    >
      <div className="flex-1">{children}</div>

      {/* Standard Document Sheet Footer */}
      {(footerText || pageNumber) && (
        <div className="pt-4 mt-6 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between font-sans shrink-0">
          <span>{footerText || ''}</span>
          <span>
            {pageLabel || (pageNumber ? `Halaman ${pageNumber}${totalPages ? ` dari ${totalPages}` : ''}` : '')}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6. UNIVERSAL DESK CANVAS: PrintDeskCanvas (Adaptive Mobile Zoom & Desk)
// ============================================================================

export interface PrintDeskCanvasProps {
  orientation?: 'portrait' | 'landscape';
  zoomMode?: 'fit' | 'original';
  onZoomModeChange?: (mode: 'fit' | 'original') => void;
  children: React.ReactNode;
  className?: string;
  deskRef?: React.RefObject<HTMLDivElement | null>;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

export const PrintDeskCanvas: React.FC<PrintDeskCanvasProps> = ({
  orientation = 'portrait',
  zoomMode = 'fit',
  children,
  className,
  deskRef: externalDeskRef,
  canvasRef: externalCanvasRef,
}) => {
  const internalDeskRef = useRef<HTMLDivElement | null>(null);
  const internalCanvasRef = useRef<HTMLDivElement | null>(null);
  const deskRef = externalDeskRef || internalDeskRef;
  const canvasRef = externalCanvasRef || internalCanvasRef;

  const isLandscape = orientation === 'landscape';
  const baseWidth = isLandscape ? 1123 : 794;

  const [autoScale, setAutoScale] = useState<number>(1);

  useEffect(() => {
    const calcScale = () => {
      if (!deskRef.current) return;
      const containerWidth = deskRef.current.clientWidth;
      if (zoomMode === 'original') {
        setAutoScale(1);
      } else if (containerWidth < baseWidth + 24) {
        const calculated = Math.max(0.32, Math.min(1, (containerWidth - 24) / baseWidth));
        setAutoScale(calculated);
      } else {
        setAutoScale(1);
      }
    };

    calcScale();
    const timer = setTimeout(calcScale, 150);
    window.addEventListener('resize', calcScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calcScale);
    };
  }, [zoomMode, orientation, baseWidth, deskRef]);

  return (
    <div
      ref={deskRef}
      className={cn(
        'overflow-y-auto overflow-x-auto max-h-[76vh] p-3 sm:p-8 bg-slate-200/70 dark:bg-slate-950/80 rounded-xl border border-slate-300 dark:border-slate-800 flex flex-col items-center gap-8 select-text',
        className
      )}
    >
      <div
        ref={canvasRef}
        id="print-desk-canvas-area"
        style={{
          zoom: autoScale < 1 ? autoScale : undefined,
          width: `${baseWidth}px`,
          maxWidth: zoomMode === 'original' ? `${baseWidth}px` : undefined,
        }}
        className="flex flex-col items-center gap-8 transition-all duration-150 origin-top"
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// 7. UNIVERSAL DOCUMENT MODAL: UniversalDocumentModal (PIONEER MODEL)
//    - Support Ceklis Logo Kanan & Kiri
//    - Support Orientasi (Portrait / Landscape)
//    - Support Cetak Massal (Batch Navigation & Batch Download)
//    - Support Pilihan Template Dokumen (Template Selection)
// ============================================================================

export interface DocumentTemplateOption {
  id: string;
  label: string;
  description?: string;
  badge?: string;
}

export interface UniversalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;

  // 1. Orientasi Support
  orientation?: 'portrait' | 'landscape';
  allowOrientationToggle?: boolean;
  onOrientationChange?: (orient: 'portrait' | 'landscape') => void;

  // 2. Logo Toggles Support
  showLogoDaerah?: boolean;
  showLogoSekolah?: boolean;
  onToggleLogoDaerah?: (show: boolean) => void;
  onToggleLogoSekolah?: (show: boolean) => void;
  allowLogoToggles?: boolean; // default: true

  // 3. Batch Printing Support (Cetak Massal)
  batchTotal?: number;
  batchCurrentIndex?: number;
  onPrevBatch?: () => void;
  onNextBatch?: () => void;
  batchSelector?: React.ReactNode;
  onDownloadBatchPdf?: () => void;
  isBatchDownloading?: boolean;
  batchDownloadButtonText?: string;

  // 4. Template Selection Support
  templateOptions?: DocumentTemplateOption[];
  selectedTemplate?: string;
  onTemplateChange?: (templateId: string) => void;
  templateLabel?: string;

  // Actions
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  downloadPdfText?: string;
  printButtonText?: string;
  extraActions?: React.ReactNode;

  // Content
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  documentId?: string;
}

export const UniversalDocumentModal: React.FC<UniversalDocumentModalProps> = ({
  isOpen,
  onClose,
  title = 'Pratinjau Dokumen Resmi',
  subtitle,
  orientation: initialOrientation = 'portrait',
  allowOrientationToggle = false,
  onOrientationChange,
  showLogoDaerah: externalShowLogoDaerah,
  showLogoSekolah: externalShowLogoSekolah,
  onToggleLogoDaerah,
  onToggleLogoSekolah,
  allowLogoToggles = true,
  batchTotal = 0,
  batchCurrentIndex = 0,
  onPrevBatch,
  onNextBatch,
  batchSelector,
  onDownloadBatchPdf,
  isBatchDownloading = false,
  batchDownloadButtonText,
  templateOptions,
  selectedTemplate,
  onTemplateChange,
  templateLabel = 'Template:',
  onPrint,
  onDownloadPdf,
  downloadPdfText = 'Unduh PDF',
  printButtonText = 'Cetak',
  extraActions,
  children,
  size = '5xl',
}) => {
  const [internalOrientation, setInternalOrientation] = useState<'portrait' | 'landscape'>(initialOrientation);
  const activeOrientation = onOrientationChange ? initialOrientation : internalOrientation;

  const [internalLogoDaerah, setInternalLogoDaerah] = useState<boolean>(true);
  const [internalLogoSekolah, setInternalLogoSekolah] = useState<boolean>(true);

  const activeLogoDaerah = externalShowLogoDaerah !== undefined ? externalShowLogoDaerah : internalLogoDaerah;
  const activeLogoSekolah = externalShowLogoSekolah !== undefined ? externalShowLogoSekolah : internalLogoSekolah;

  const [zoomMode, setZoomMode] = useState<'fit' | 'original'>('fit');
  const deskRef = useRef<HTMLDivElement | null>(null);

  const handleToggleOrientation = () => {
    const next = activeOrientation === 'portrait' ? 'landscape' : 'portrait';
    if (onOrientationChange) {
      onOrientationChange(next);
    } else {
      setInternalOrientation(next);
    }
  };

  const handleToggleDaerah = (checked: boolean) => {
    if (onToggleLogoDaerah) onToggleLogoDaerah(checked);
    else setInternalLogoDaerah(checked);
  };

  const handleToggleSekolah = (checked: boolean) => {
    if (onToggleLogoSekolah) onToggleLogoSekolah(checked);
    else setInternalLogoSekolah(checked);
  };

  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-3">
        {/* ========================================================================= */}
        {/* ROW 1: PRIMARY ACTION TOOLBAR & BATCH NAVIGATOR                           */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
          {/* Left: Subtitle & Batch Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {batchTotal > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevBatch}
                  disabled={batchCurrentIndex === 0}
                  className="h-7 w-7 p-0 rounded cursor-pointer disabled:opacity-30"
                  title="Data Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 min-w-[55px] text-center">
                  {batchCurrentIndex + 1} / {batchTotal}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNextBatch}
                  disabled={batchCurrentIndex === batchTotal - 1}
                  className="h-7 w-7 p-0 rounded cursor-pointer disabled:opacity-30"
                  title="Data Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {batchSelector}

            {subtitle && (
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                {subtitle}
              </div>
            )}

            <span className="text-[11px] text-muted-foreground hidden lg:inline">
              • A4 {activeOrientation === 'landscape' ? 'Landscape (297 × 210 mm)' : 'Portrait (210 × 297 mm)'}
            </span>
          </div>

          {/* Right: Zoom Controller, Batch Download & Single Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile / Responsive Zoom Controller */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                  zoomMode === 'fit'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Sesuaikan dokumen dengan lebar layar HP"
              >
                <Smartphone className="w-3 h-3" />
                <span>Pas Layar</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('original')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                  zoomMode === 'original'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Lihat ukuran 100% standar A4 (dapat digeser)"
              >
                <Maximize2 className="w-3 h-3" />
                <span>100% Asli</span>
              </button>
            </div>

            {/* Orientation Toggle Button */}
            {allowOrientationToggle && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleOrientation}
                className="text-xs gap-1.5 h-8 px-2.5"
                title={`Ubah orientasi ke ${activeOrientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline capitalize">{activeOrientation}</span>
              </Button>
            )}

            {extraActions}

            {/* Batch PDF Download Button (Cetak Massal) */}
            {onDownloadBatchPdf && batchTotal > 1 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onDownloadBatchPdf}
                disabled={isBatchDownloading}
                className="text-xs gap-1.5 h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                title="Unduh seluruh data dalam 1 berkas PDF gabungan"
              >
                {isBatchDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengunduh...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>{batchDownloadButtonText || `Unduh Massal (${batchTotal})`}</span>
                  </>
                )}
              </Button>
            )}

            {/* Single Download PDF Button */}
            {onDownloadPdf && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownloadPdf}
                className="text-xs gap-1.5 h-8 px-2.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadPdfText}</span>
              </Button>
            )}

            {/* Direct Print Button */}
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 px-2.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{printButtonText}</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: OPSI KOP & PILIHAN TEMPLATE DOKUMEN                                */}
        {/* ========================================================================= */}
        {(allowLogoToggles || (templateOptions && templateOptions.length > 0)) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Template Selector Dropdown */}
              {templateOptions && templateOptions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11.5px]">
                    <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                    {templateLabel}
                  </span>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => onTemplateChange?.(e.target.value)}
                    className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-primary shadow-xs"
                  >
                    {templateOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Logo Toggles */}
              {allowLogoToggles && (
                <div className={cn(
                  "flex flex-wrap items-center gap-3 sm:gap-4",
                  templateOptions && templateOptions.length > 0 && "pl-0 sm:pl-3 sm:border-l sm:border-slate-300 dark:sm:border-slate-700"
                )}>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11.5px]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    Opsi Kop:
                  </span>

                  {/* Checkbox Logo Kiri Pemda */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={activeLogoDaerah}
                      onChange={(e) => handleToggleDaerah(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-foreground font-medium text-[11.5px]">
                      Logo Kiri (Pemda)
                    </span>
                  </label>

                  {/* Checkbox Logo Kanan Sekolah */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={activeLogoSekolah}
                      onChange={(e) => handleToggleSekolah(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-foreground font-medium text-[11.5px]">
                      Logo Kanan (Sekolah)
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              {allowLogoToggles && (
                <>
                  <span className={`inline-block w-2 h-2 rounded-full ${activeLogoSekolah ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>
                    Logo Kanan: <strong className={activeLogoSekolah ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>{activeLogoSekolah ? 'Aktif' : 'Nonaktif'}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROW 3: DESK CANVAS AREA                                                  */}
        {/* ========================================================================= */}
        <PrintDeskCanvas
          deskRef={deskRef}
          orientation={activeOrientation}
          zoomMode={zoomMode}
          onZoomModeChange={setZoomMode}
        >
          {children}
        </PrintDeskCanvas>
      </div>
    </Modal>
  );
};

// ============================================================================
// 8. UNIVERSAL DOCUMENT TAB: UniversalDocumentTab (PIONEER MODEL)
// ============================================================================

export interface UniversalDocumentTabProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  orientation?: 'portrait' | 'landscape';
  allowOrientationToggle?: boolean;
  onOrientationChange?: (orient: 'portrait' | 'landscape') => void;

  showLogoDaerah?: boolean;
  showLogoSekolah?: boolean;
  onToggleLogoDaerah?: (show: boolean) => void;
  onToggleLogoSekolah?: (show: boolean) => void;
  allowLogoToggles?: boolean;

  batchTotal?: number;
  batchCurrentIndex?: number;
  onPrevBatch?: () => void;
  onNextBatch?: () => void;
  batchSelector?: React.ReactNode;
  onDownloadBatchPdf?: () => void;
  isBatchDownloading?: boolean;
  batchDownloadButtonText?: string;

  // 4. Template Selection Support
  templateOptions?: DocumentTemplateOption[];
  selectedTemplate?: string;
  onTemplateChange?: (templateId: string) => void;
  templateLabel?: string;

  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onRefresh?: () => void;
  downloadPdfText?: string;
  printButtonText?: string;
  extraActions?: React.ReactNode;

  children: React.ReactNode;
}

export const UniversalDocumentTab: React.FC<UniversalDocumentTabProps> = ({
  title = 'Pratinjau & Cetak Dokumen Resmi',
  subtitle = 'Format dokumen standar dinas terpusat, siap cetak atau ekspor ke PDF.',
  orientation: initialOrientation = 'portrait',
  allowOrientationToggle = false,
  onOrientationChange,
  showLogoDaerah: externalShowLogoDaerah,
  showLogoSekolah: externalShowLogoSekolah,
  onToggleLogoDaerah,
  onToggleLogoSekolah,
  allowLogoToggles = true,
  batchTotal = 0,
  batchCurrentIndex = 0,
  onPrevBatch,
  onNextBatch,
  batchSelector,
  onDownloadBatchPdf,
  isBatchDownloading = false,
  batchDownloadButtonText,
  templateOptions,
  selectedTemplate,
  onTemplateChange,
  templateLabel = 'Template:',
  onPrint,
  onDownloadPdf,
  onRefresh,
  downloadPdfText = 'Unduh PDF',
  printButtonText = 'Cetak Dokumen',
  extraActions,
  children,
}) => {
  const [internalOrientation, setInternalOrientation] = useState<'portrait' | 'landscape'>(initialOrientation);
  const activeOrientation = onOrientationChange ? initialOrientation : internalOrientation;

  const [internalLogoDaerah, setInternalLogoDaerah] = useState<boolean>(true);
  const [internalLogoSekolah, setInternalLogoSekolah] = useState<boolean>(true);

  const activeLogoDaerah = externalShowLogoDaerah !== undefined ? externalShowLogoDaerah : internalLogoDaerah;
  const activeLogoSekolah = externalShowLogoSekolah !== undefined ? externalShowLogoSekolah : internalLogoSekolah;

  const [zoomMode, setZoomMode] = useState<'fit' | 'original'>('fit');
  const deskRef = useRef<HTMLDivElement | null>(null);

  const handleToggleOrientation = () => {
    const next = activeOrientation === 'portrait' ? 'landscape' : 'portrait';
    if (onOrientationChange) onOrientationChange(next);
    else setInternalOrientation(next);
  };

  const handleToggleDaerah = (checked: boolean) => {
    if (onToggleLogoDaerah) onToggleLogoDaerah(checked);
    else setInternalLogoDaerah(checked);
  };

  const handleToggleSekolah = (checked: boolean) => {
    if (onToggleLogoSekolah) onToggleLogoSekolah(checked);
    else setInternalLogoSekolah(checked);
  };

  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  return (
    <div className="space-y-3">
      {/* Top Header Card */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs gap-1.5 h-8 px-2.5"
              title="Perbarui Data Dokumen"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          )}

          {/* Batch Selector */}
          {batchSelector}

          {/* Batch Paginator */}
          {batchTotal > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevBatch}
                disabled={batchCurrentIndex === 0}
                className="h-7 w-7 p-0 rounded cursor-pointer disabled:opacity-30"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 min-w-[50px] text-center">
                {batchCurrentIndex + 1} / {batchTotal}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextBatch}
                disabled={batchCurrentIndex === batchTotal - 1}
                className="h-7 w-7 p-0 rounded cursor-pointer disabled:opacity-30"
                title="Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Zoom Controller */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomMode('fit')}
              className={cn(
                'px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                zoomMode === 'fit'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Smartphone className="w-3 h-3" />
              <span>Pas Layar</span>
            </button>
            <button
              type="button"
              onClick={() => setZoomMode('original')}
              className={cn(
                'px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                zoomMode === 'original'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Maximize2 className="w-3 h-3" />
              <span>100% Asli</span>
            </button>
          </div>

          {allowOrientationToggle && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleOrientation}
              className="text-xs gap-1.5 h-8 px-2.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="capitalize">{activeOrientation}</span>
            </Button>
          )}

          {extraActions}

          {onDownloadBatchPdf && batchTotal > 1 && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onDownloadBatchPdf}
              disabled={isBatchDownloading}
              className="text-xs gap-1.5 h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              {isBatchDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span>{batchDownloadButtonText || `Unduh Sekelas (${batchTotal})`}</span>
                </>
              )}
            </Button>
          )}

          {onDownloadPdf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadPdf}
              className="text-xs gap-1.5 h-8 px-2.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadPdfText}</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 px-2.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{printButtonText}</span>
          </Button>
        </div>
      </div>

      {/* Row 2: Opsi Kop & Pilihan Template Dokumen */}
      {(allowLogoToggles || (templateOptions && templateOptions.length > 0)) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Template Selector Dropdown */}
            {templateOptions && templateOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11.5px]">
                  <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                  {templateLabel}
                </span>
                <select
                  value={selectedTemplate}
                  onChange={(e) => onTemplateChange?.(e.target.value)}
                  className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-primary shadow-xs"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Logo Toggles */}
            {allowLogoToggles && (
              <div className={cn(
                "flex flex-wrap items-center gap-3 sm:gap-4",
                templateOptions && templateOptions.length > 0 && "pl-0 sm:pl-3 sm:border-l sm:border-slate-300 dark:sm:border-slate-700"
              )}>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11.5px]">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  Opsi Kop:
                </span>

                <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={activeLogoDaerah}
                    onChange={(e) => handleToggleDaerah(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-foreground font-medium text-[11.5px]">
                    Logo Kiri (Pemda)
                  </span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={activeLogoSekolah}
                    onChange={(e) => handleToggleSekolah(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-foreground font-medium text-[11.5px]">
                    Logo Kanan (Sekolah)
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            {allowLogoToggles && (
              <>
                <span className={`inline-block w-2 h-2 rounded-full ${activeLogoSekolah ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span>
                  Logo Kanan: <strong className={activeLogoSekolah ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>{activeLogoSekolah ? 'Aktif' : 'Nonaktif'}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desk Canvas Area */}
      <PrintDeskCanvas
        deskRef={deskRef}
        orientation={activeOrientation}
        zoomMode={zoomMode}
        onZoomModeChange={setZoomMode}
      >
        {children}
      </PrintDeskCanvas>
    </div>
  );
};

// Backward-compatible alias
export const PrintDocumentCanvas = PrintDocumentSheet;
export const UniversalPrintModal = UniversalDocumentModal;
export const UniversalPrintTab = UniversalDocumentTab;

export default PrintHeader;
