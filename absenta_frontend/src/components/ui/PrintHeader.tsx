import React from 'react';

export interface PrintHeaderLine {
  text: string;
  fontSize?: number; // Size in pt/px
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string; // Arial, Times New Roman, Book Antiqua, etc.
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
 * Menggunakan tata letak HTML Table murni & inline style dengan wrapping aman
 * agar nama sekolah panjang tidak pernah menimpa logo kanan.
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
    
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return parsed as PrintHeaderLine;
      }
    } catch (e) {
      // Treat as plain text
    }

    const textStr = typeof line === 'string' ? line : (line as any).text || '';
    let fontSize = 11.5;
    
    if (idx === 0) {
      fontSize = 11;
    } else if (idx === 1) {
      fontSize = 11;
    } else if (idx === 2) {
      fontSize = 11;
    } else if (idx === 3 || idx === rawLines.length - 1) {
      // Auto scale font size for long school names so it fits cleanly
      fontSize = textStr.length > 32 ? 12.5 : 13.5;
    }

    return { 
      text: textStr,
      fontSize,
      bold: true,
      italic: false,
      underline: false,
      fontFamily: "'Book Antiqua', 'Bookman Old Style', serif"
    };
  });

  // 3. COMPACT THERMAL LAYOUT (Receipt rolls)
  if (variant === 'compact') {
    const mainSchoolLine = parsedLines[parsedLines.length - 1];
    const schoolDisplayName = mainSchoolLine?.text || tenantInfo?.name || 'SMA ABSENTA';
    
    return (
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #000' }}>
        {logoSekolah ? (
          <img 
            src={logoSekolah} 
            alt="Logo Sekolah" 
            style={{ height: '32px', width: 'auto', margin: '0 auto 4px auto', display: 'block', objectFit: 'contain' }} 
          />
        ) : logoDaerah ? (
          <img 
            src={logoDaerah} 
            alt="Logo Daerah" 
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
  const imgHeight = isLandscape ? '85px' : '70px';
  const colWidth = '85px';

  return (
    <table
      style={{
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        borderBottom: '3.5px double #000000',
        marginBottom: '14px',
        paddingBottom: '6px',
        boxSizing: 'border-box',
      }}
    >
      <tbody>
        <tr>
          {/* Logo Kiri (Daerah / Pemda) */}
          <td style={{ width: colWidth, minWidth: colWidth, maxWidth: colWidth, verticalAlign: 'middle', textAlign: 'center', padding: '0 2px 4px 0' }}>
            {logoDaerah ? (
              <img
                src={logoDaerah}
                alt="Logo Kiri"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                style={{ height: imgHeight, width: 'auto', maxHeight: imgHeight, maxWidth: '75px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
              />
            ) : (
              <div style={{ width: '75px', height: '1px' }} />
            )}
          </td>

          {/* Teks Resmi Kop Surat (Tengah Sempurna dengan Auto-Wrapping) */}
          <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 6px 4px 6px', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
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
                fontSize: line.fontSize ? `${isLandscape ? line.fontSize * 1.15 : line.fontSize}pt` : (isLast ? '13pt' : '11pt'),
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
              <div style={{ fontSize: '8.5pt', fontWeight: 500, color: '#334155', marginTop: '3px', textAlign: 'center', lineHeight: '1.25', fontFamily: "'Book Antiqua', 'Bookman Old Style', serif", whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {alamatLengkap} {telepon ? ` | Telp: ${telepon}` : ''}
              </div>
            )}
            {(website || email) && (
              <div style={{ fontSize: '8pt', fontWeight: 600, color: '#475569', marginTop: '1px', textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {website ? `Website: ${website}` : ''} {email ? ` | Email: ${email}` : ''}
              </div>
            )}
          </td>

          {/* Logo Kanan (Sekolah) */}
          <td style={{ width: colWidth, minWidth: colWidth, maxWidth: colWidth, verticalAlign: 'middle', textAlign: 'center', padding: '0 0 4px 2px' }}>
            {logoSekolah ? (
              <img
                src={logoSekolah}
                alt="Logo Kanan"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                style={{ height: imgHeight, width: 'auto', maxHeight: imgHeight, maxWidth: '75px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
              />
            ) : (
              <div style={{ width: '75px', height: '1px' }} />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default PrintHeader;
