import React from 'react';

export interface PrintHeaderLine {
  text: string;
  fontSize?: number; // Size in pixels
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string; // Arial, Times New Roman, Courier New, Inter, Outfit
}

export interface PrintHeaderProps {
  variant?: 'portrait' | 'landscape' | 'compact';
  tenantInfo?: {
    name?: string;
    logo_url?: string;
    logo_daerah_url?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    nama_dinas_atas?: string;
    nama_dinas_bawah?: string;
    nama_cabang_dinas?: string;
    kode_pos?: string;
    print_header_lines?: string[] | PrintHeaderLine[];
  };
}

/**
 * PrintHeader - Komponen Kop Surat Resmi Terpusat Absenta
 * Mendukung format dinamis birokrasi Indonesia dengan kustomisasi per-baris teks
 * (Font Family, Ukuran, Tebal, Miring, Garis Bawah) yang dikonfigurasi admin tenant.
 */
export const PrintHeader: React.FC<PrintHeaderProps> = ({
  variant = 'portrait',
  tenantInfo
}) => {
  const logoSekolah = tenantInfo?.logo_url || null;
  const logoDaerah = tenantInfo?.logo_daerah_url || null;

  const alamatLengkap = tenantInfo?.address || '';
  const telepon = tenantInfo?.phone || '';
  const email = tenantInfo?.email || '';
  const website = tenantInfo?.website || '';

  // 1. Resolve Raw Lines (String[] or PrintHeaderLine[])
  const rawLines = tenantInfo?.print_header_lines && tenantInfo.print_header_lines.length > 0
    ? tenantInfo.print_header_lines
    : [
        tenantInfo?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
        tenantInfo?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
        tenantInfo?.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
        tenantInfo?.name || 'SMK NEGERI 1 PLERED'
      ];

  // 2. Parse Lines into formatted PrintHeaderLine objects
  const parsedLines: PrintHeaderLine[] = rawLines.map((line, idx) => {
    if (typeof line === 'object' && line !== null) {
      return line as PrintHeaderLine;
    }
    
    // Attempt to parse string as JSON (supporting rich formats)
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return parsed as PrintHeaderLine;
      }
    } catch (e) {
      // Treat as plain text
    }

    const textStr = typeof line === 'string' ? line : (line as any).text || '';
    let fontSize = 12;
    
    if (idx === 0) {
      fontSize = 14;
    } else if (idx === 1) {
      fontSize = 14;
    } else if (idx === 2) {
      fontSize = 12;
    } else if (idx === 3 || idx === rawLines.length - 1) {
      fontSize = 18;
    }

    return { 
      text: textStr,
      fontSize,
      bold: true,
      italic: false,
      underline: false,
      fontFamily: 'Arial'
    };
  });

  // 3. COMPACT THERMAL LAYOUT (Receipt rolls)
  if (variant === 'compact') {
    const mainSchoolLine = parsedLines[parsedLines.length - 1];
    const schoolDisplayName = mainSchoolLine?.text || tenantInfo?.name || 'SMA ABSENTA';
    
    const inlineStyles: React.CSSProperties = {};
    if (mainSchoolLine?.fontFamily) {
      inlineStyles.fontFamily = mainSchoolLine.fontFamily;
    }

    return (
      <div className="w-full text-center space-y-1 mb-4 pb-3 border-b border-dashed border-gray-900 print:text-black">
        {logoSekolah ? (
          <img 
            src={logoSekolah} 
            alt="Logo Sekolah" 
            className="mx-auto h-8 w-auto mb-1 object-contain shrink-0" 
          />
        ) : logoDaerah ? (
          <img 
            src={logoDaerah} 
            alt="Logo Daerah" 
            className="mx-auto h-8 w-auto mb-1 object-contain shrink-0" 
          />
        ) : null}
        <h1 
          className="text-[12px] font-black uppercase tracking-tight leading-none mt-1"
          style={inlineStyles}
        >
          {schoolDisplayName}
        </h1>
        <p className="text-[8px] text-gray-600 dark:text-gray-400 leading-tight">{alamatLengkap.substring(0, 48)}...</p>
      </div>
    );
  }

  // 4. PORTRAIT & LANDSCAPE LAYOUTS
  const isLandscape = variant === 'landscape';

  return (
    <div className={`w-full flex flex-col items-center mb-6 print:text-black ${isLandscape ? 'px-2' : ''}`}>
      <div className="w-full flex items-center justify-between pb-3 border-b-[3px] border-double border-gray-900 relative gap-0">
        
        {/* Logo Daerah (Kiri) - Lebar Terkunci Statis */}
        <div className="flex-shrink-0 flex items-center justify-start w-[120px]">
          {logoDaerah ? (
            <img 
              src={logoDaerah} 
              alt="Logo Kiri" 
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className={`${isLandscape ? 'h-24' : 'h-20'} w-auto object-contain shrink-0`} 
            />
          ) : (
            <div className="w-16 h-16 opacity-0" />
          )}
        </div>

        {/* Teks Resmi Kop Surat - Container Statis & Rigid */}
        <div className="flex-[1_0_auto] flex flex-col items-center justify-center min-w-0 overflow-visible py-1 px-2">
          <div className="w-full flex flex-col items-center space-y-0.5 shrink-0">
            {parsedLines.map((line, index) => {
              const isLast = index === parsedLines.length - 1;
              const isSecondLast = index === parsedLines.length - 2 && parsedLines.length > 1;

              const inlineStyles: React.CSSProperties = {
                whiteSpace: 'nowrap',
                textAlign: 'center',
                display: 'block',
                width: '100%'
              };
              
              if (line.fontSize) {
                // Scale size in landscape for optimal visibility
                const scaledSize = isLandscape ? line.fontSize * 1.15 : line.fontSize;
                inlineStyles.fontSize = `${scaledSize}px`;
              }
              if (line.fontFamily) {
                inlineStyles.fontFamily = line.fontFamily;
              }

              // Construct text class based on format toggles
              let textClass = 'uppercase leading-tight print:text-black ';
              
              // Apply custom bold weight
              if (line.bold !== undefined) {
                textClass += line.bold ? 'font-bold ' : 'font-normal ';
              } else {
                // Default hierarchy fallback
                if (isLast) textClass += 'font-black ';
                else if (isSecondLast) textClass += 'font-extrabold ';
                else textClass += 'font-semibold ';
              }

              // Apply custom italic style
              if (line.italic) {
                textClass += 'italic ';
              }

              // Apply custom underline style
              if (line.underline) {
                textClass += 'underline ';
              }

              // Apply default font scale if no specific font size is configured
              if (!line.fontSize) {
                if (isLast) {
                  textClass += isLandscape ? 'text-lg ' : 'text-base ';
                } else if (isSecondLast) {
                  textClass += isLandscape ? 'text-sm ' : 'text-xs ';
                } else {
                  textClass += isLandscape ? 'text-xs ' : 'text-[10px] ';
                }
              }

              return (
                <h2 
                  key={index} 
                  className={textClass}
                  style={inlineStyles}
                >
                  {line.text}
                </h2>
              );
            })}
          </div>

          {/* Alamat & Informasi Kontak */}
          <div className="w-full flex flex-col items-center mt-1.5 shrink-0">
            {alamatLengkap && (
              <p className="text-[9px] text-gray-700 font-medium leading-tight text-center whitespace-nowrap">
                {alamatLengkap} {telepon ? ` | Telp: ${telepon}` : ''}
              </p>
            )}
            {(website || email) && (
              <p className="text-[8px] text-gray-600 font-bold leading-tight mt-0.5 text-center whitespace-nowrap font-mono tracking-tight">
                {website ? `Website: ${website}` : ''} {email ? ` | Email: ${email}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Logo Sekolah (Kanan) - Lebar Terkunci Statis */}
        <div className="flex-shrink-0 flex items-center justify-end w-[120px]">
          {logoSekolah ? (
            <img 
              src={logoSekolah} 
              alt="Logo Kanan" 
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className={`${isLandscape ? 'h-24' : 'h-20'} w-auto object-contain shrink-0`} 
            />
          ) : (
            <div className="w-20 h-20 opacity-0" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;
