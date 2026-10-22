import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Download, RefreshCw, FileText } from 'lucide-react';
import { getMyTenant, type Tenant } from '@/api/tenants.api';
import { sekolahApi, type Sekolah } from '@/api/academic/sekolah.api';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_JABAR_LOGO_SVG, resolveCoverImageBase64 } from '@/utils/print/rapor/raporShared';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PrintHeaderLine {
  text: string;
  fontSize?: number; // Size in pt/px
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string; // Arial, Times New Roman, Book Antiqua, etc.
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
  roleTitle?: string;            // e.g. "KAPROG KEJURUAN", "WALI KELAS", "KURIKULUM", "KEPALA SEKOLAH"
  departmentTitle?: string;      // e.g. "PROGRAM KEAHLIAN TEKNIK KOMPUTER DAN JARINGAN"
  documentTitle?: string;        // e.g. "BERITA ACARA PELAKSANAAN"
  documentNumber?: string;       // e.g. "Nomor: 421.5/028/SMK-PLR/2026"
  academicYear?: string;         // e.g. "Tahun Pelajaran 2026/2027"
  showDivider?: boolean;         // default: true
  showLogoDaerah?: boolean;      // default: true
  showLogoSekolah?: boolean;     // default: true
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
// UNIVERSAL HOOK: usePrintHeaderData (DRY Resolution for any Role)
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
// PURE PRESENTATIONAL PRINT HEADER (SSR & renderToString Safe)
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
  const colWidthNum = Math.max(85, Math.round(calculatedHeightNum * 0.95));
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
                wordBreak: 'break-word',
              }}
            >
              {parsedLines.map((line, index) => {
                const isLast = index === parsedLines.length - 1;

                const lineStyle: React.CSSProperties = {
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
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
                    wordBreak: 'break-word',
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
                    wordBreak: 'break-word',
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
// CONNECTED PRINT HEADER (Auto-resolves Tenant & School Data via Hooks)
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
// UNIVERSAL COMPONENT: PrintDocumentCanvas (A4 Paper Sheet View)
// ============================================================================

export interface PrintDocumentCanvasProps {
  variant?: 'portrait' | 'landscape';
  tenantInfo?: PrintHeaderTenantInfo;
  roleTitle?: string;
  departmentTitle?: string;
  documentTitle?: string;
  documentNumber?: string;
  academicYear?: string;
  showDivider?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export const PrintDocumentCanvas: React.FC<PrintDocumentCanvasProps> = ({
  variant = 'portrait',
  tenantInfo,
  roleTitle,
  departmentTitle,
  documentTitle,
  documentNumber,
  academicYear,
  showDivider = true,
  children,
  className,
  style,
  id,
  contentRef,
}) => {
  const isLandscape = variant === 'landscape';

  return (
    <div
      ref={contentRef}
      id={id}
      className={cn(
        'w-full bg-white text-slate-900 shadow-2xl rounded-sm font-serif text-[12px] leading-relaxed select-text border border-slate-300 dark:border-slate-800 transition-all',
        isLandscape
          ? 'max-w-[297mm] p-6 sm:p-10 min-h-[210mm]'
          : 'max-w-[210mm] p-8 sm:p-12 min-h-[297mm]',
        className
      )}
      style={style}
    >
      <PrintHeader
        variant={variant}
        tenantInfo={tenantInfo}
        roleTitle={roleTitle}
        departmentTitle={departmentTitle}
        documentTitle={documentTitle}
        documentNumber={documentNumber}
        academicYear={academicYear}
        showDivider={showDivider}
      />
      <div className="mt-4">{children}</div>
    </div>
  );
};

// ============================================================================
// UNIVERSAL COMPONENT: UniversalPrintModal (Modal for Any Role Dashboard)
// ============================================================================

export interface UniversalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  variant?: 'portrait' | 'landscape';
  tenantInfo?: PrintHeaderTenantInfo;
  roleTitle?: string;
  departmentTitle?: string;
  documentTitle?: string;
  documentNumber?: string;
  academicYear?: string;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  downloadPdfText?: string;
  printButtonText?: string;
  extraActions?: React.ReactNode;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  documentId?: string;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export const UniversalPrintModal: React.FC<UniversalPrintModalProps> = ({
  isOpen,
  onClose,
  title = 'Pratinjau Dokumen Cetak Resmi',
  variant = 'portrait',
  tenantInfo,
  roleTitle,
  departmentTitle,
  documentTitle,
  documentNumber,
  academicYear,
  onPrint,
  onDownloadPdf,
  downloadPdfText = 'Unduh PDF',
  printButtonText = 'Cetak Dokumen',
  extraActions,
  children,
  size = '5xl',
  documentId = 'print-document-area',
  contentRef,
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-4">
        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
          <div className="flex flex-wrap items-center gap-2">
            {roleTitle && (
              <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                {roleTitle}
              </span>
            )}
            {departmentTitle && (
              <span className="text-xs font-semibold text-muted-foreground">
                {departmentTitle}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • Standar A4 {variant === 'landscape' ? 'Landscape (297 × 210 mm)' : 'Portrait (210 × 297 mm)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {extraActions}
            {onDownloadPdf && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownloadPdf}
                className="text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadPdfText}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              {printButtonText}
            </Button>
          </div>
        </div>

        {/* Paper Sheet Preview Area */}
        <div className="overflow-y-auto max-h-[78vh] p-3 sm:p-6 bg-slate-200/60 dark:bg-slate-950/70 rounded-xl border flex justify-center">
          <PrintDocumentCanvas
            id={documentId}
            contentRef={contentRef}
            variant={variant}
            tenantInfo={tenantInfo}
            roleTitle={roleTitle}
            departmentTitle={departmentTitle}
            documentTitle={documentTitle}
            documentNumber={documentNumber}
            academicYear={academicYear}
          >
            {children}
          </PrintDocumentCanvas>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// UNIVERSAL COMPONENT: UniversalPrintTab (Tab View for Any Role Dashboard)
// ============================================================================

export interface UniversalPrintTabProps {
  title?: string;
  description?: string;
  variant?: 'portrait' | 'landscape';
  tenantInfo?: PrintHeaderTenantInfo;
  roleTitle?: string;
  departmentTitle?: string;
  documentTitle?: string;
  documentNumber?: string;
  academicYear?: string;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onRefresh?: () => void;
  downloadPdfText?: string;
  printButtonText?: string;
  extraActions?: React.ReactNode;
  children?: React.ReactNode;
  documentId?: string;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

export const UniversalPrintTab: React.FC<UniversalPrintTabProps> = ({
  title = 'Pratinjau & Cetak Dokumen Resmi',
  description = 'Format kop surat resmi terpusat, siap cetak atau ekspor ke PDF.',
  variant = 'portrait',
  tenantInfo,
  roleTitle,
  departmentTitle,
  documentTitle,
  documentNumber,
  academicYear,
  onPrint,
  onDownloadPdf,
  onRefresh,
  downloadPdfText = 'Unduh PDF',
  printButtonText = 'Cetak Dokumen',
  extraActions,
  children,
  documentId = 'print-tab-document-area',
  contentRef,
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-4 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs gap-1.5"
              title="Perbarui Data Dokumen"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          )}
          {extraActions}
          {onDownloadPdf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadPdf}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {downloadPdfText}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="w-3.5 h-3.5" />
            {printButtonText}
          </Button>
        </div>
      </div>

      {/* Paper Preview Desk */}
      <div className="overflow-y-auto max-h-[82vh] p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950/70 rounded-xl border flex justify-center">
        <PrintDocumentCanvas
          id={documentId}
          contentRef={contentRef}
          variant={variant}
          tenantInfo={tenantInfo}
          roleTitle={roleTitle}
          departmentTitle={departmentTitle}
          documentTitle={documentTitle}
          documentNumber={documentNumber}
          academicYear={academicYear}
        >
          {children}
        </PrintDocumentCanvas>
      </div>
    </div>
  );
};

export default PrintHeader;
