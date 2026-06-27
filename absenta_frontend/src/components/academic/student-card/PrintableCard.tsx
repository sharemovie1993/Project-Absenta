import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { StudentCardConfig } from './types';
import { EDITOR_SCALE, MM_TO_PX } from './constants';
import { Siswa } from '../../../types/academic';
import { CardPatternLayer } from './CardPatternLayer';

const adjustColorBrightness = (hex: string, percent: number) => {
    if (!hex) return hex;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return hex;
    let r = parseInt(cleanHex.substring(0, 2), 16);
    let g = parseInt(cleanHex.substring(2, 4), 16);
    let b = parseInt(cleanHex.substring(4, 6), 16);

    r = Math.min(255, Math.max(0, r + (r * percent) / 100));
    g = Math.min(255, Math.max(0, g + (g * percent) / 100));
    b = Math.min(255, Math.max(0, b + (b * percent) / 100));

    const rr = Math.round(r).toString(16).padStart(2, '0');
    const gg = Math.round(g).toString(16).padStart(2, '0');
    const bb = Math.round(b).toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
};

interface SekolahData {
    logo_url?: string;
    data?: {
        logo_url?: string;
    };
}

interface PrintableCardProps {
    student: Partial<Siswa> & { 
        nama?: string; 
        nama_siswa?: string;
        kelas?: { nama?: string; nama_kelas?: string }; 
        foto?: string;
    };
    config: StudentCardConfig;
    sekolah?: SekolahData;
}

export const PrintableCard: React.FC<PrintableCardProps> = React.memo(({ 
    student, 
    config, 
    sekolah 
}) => {
    const isVertical = config.template === 'vertical';
    const resolvedHeaderHeight = config.template === 'horizontal'
        ? Math.min(config.header_height || 18, 20)
        : (config.header_height || 18);
    const cardW = config.card_width || 85.6;
    const cardH = config.card_height || 54;
    
    // Dimensions
    const widthMM = isVertical ? cardH : cardW;
    const heightMM = isVertical ? cardW : cardH;
    
    const isCenteredCircle = isVertical && config.photo_shape === 'circle';

    const photoW = config.photo_width || 24;
    const photoH = config.photo_height || 32;
    const qrW = isCenteredCircle ? 15 : (config.qrcode_width || 20);
    const qrH = isCenteredCircle ? 15 : (config.qrcode_height || 20);

    const photoX = config.photo_x / EDITOR_SCALE;
    const photoY = config.photo_y / EDITOR_SCALE;

    const resolvedDataY = isCenteredCircle 
        ? Math.max(config.data_y || 0, 370) 
        : (config.data_y || 0);

    const resolvedQrX = isCenteredCircle 
        ? ((widthMM - qrW) * MM_TO_PX * EDITOR_SCALE) / 2 
        : config.qrcode_x;
    const resolvedQrY = isCenteredCircle 
        ? ((heightMM - qrH) * MM_TO_PX * EDITOR_SCALE) - 15 
        : config.qrcode_y;

    const qrX = resolvedQrX / EDITOR_SCALE;
    const qrY = resolvedQrY / EDITOR_SCALE;
    const dataX = (config.data_x || 0) / EDITOR_SCALE;
    const dataY = resolvedDataY / EDITOR_SCALE;

    // Strip tingkat prefix (X, XI, XII) from class name
    const stripTingkat = (nama: string) =>
        nama.replace(/^(XII|XI|X)\s*/i, '').trim() || nama;

    const kelasNama = student.Kelas?.nama_kelas || student.kelas?.nama || student.kelas?.nama_kelas || '-';
    const kelasStripped = stripTingkat(kelasNama);
    const fallbackJurusan = kelasStripped !== '-' ? kelasStripped.split(' ')[0] : '';
    const jurusanNama = (student.Kelas as any)?.Jurusan?.nama || (student as any)?.Jurusan?.nama || fallbackJurusan;

    const displayStudent = {
        ...student,
        nama: student.nama_siswa || student.nama,
        kelasNama,
        kelasStripped,
        jurusanNama,
    };

    const [qrUrl, setQrUrl] = useState('');
    
    useEffect(() => {
        if (student.id) {
            QRCode.toDataURL(student.id, { margin: 1, width: 100 })
                .then(setQrUrl);
        }
    }, [student.id]);

    const getLuminance = (hex: string) => {
        if (!hex) return 255;
        const cleanHex = hex.replace('#', '');
        if (cleanHex.length !== 6) return 255;
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000;
    };
    const isDarkBg = getLuminance(config.secondary_color || '#ffffff') < 128;

    return (
        <div 
            className={`relative overflow-hidden break-inside-avoid page-break-inside-avoid rounded-2xl ${!config.show_border ? 'border border-slate-200 print:border-0' : ''}`}
            style={{
                width: `${widthMM}mm`,
                height: `${heightMM}mm`,
                backgroundColor: config.secondary_color || '#ffffff',
                // Force background print
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
                borderColor: config.show_border ? config.border_color : undefined,
                borderWidth: config.show_border ? `${config.border_width || 1}px` : undefined,
                borderStyle: config.show_border ? 'solid' : undefined
            }}
        >
            {/* Card Pattern Layer */}
            <CardPatternLayer config={config} width={widthMM} height={heightMM} scale={1} />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div 
                className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center py-2 shadow-sm animate-in fade-in z-10 overflow-hidden"
                style={{ 
                    height: `${resolvedHeaderHeight}mm`,
                    color: config.header_style === 'minimal' 
                        ? (config.header_bg_color || config.primary_color)
                        : (config.header_text_color || '#ffffff'),
                    printColorAdjust: 'exact',
                    WebkitPrintColorAdjust: 'exact',
                    ...(() => {
                        const headerBg = config.header_bg_color || config.primary_color;
                        const style = config.header_style || 'solid';
                        if (style === 'gradient') {
                            return { background: `linear-gradient(135deg, ${headerBg} 0%, ${adjustColorBrightness(headerBg, -20)} 100%)`, borderBottom: '1px solid rgba(255,255,255,0.1)' };
                        }
                        if (style === 'glass') {
                            // Note: Print media doesn't render backdrop-filter well in all browsers.
                            // We use a semi-transparent solid background to simulate glass.
                            return { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderBottom: '1px solid rgba(255,255,255,0.3)' };
                        }
                        if (style === 'wave') {
                            return { backgroundColor: headerBg, clipPath: 'ellipse(85% 100% at 50% 0%)' };
                        }
                        if (style === 'slanted') {
                            return { backgroundColor: headerBg, clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)' };
                        }
                        if (style === 'double-wave') {
                            return { backgroundColor: headerBg, clipPath: 'polygon(0 0, 100% 0, 100% 80%, 75% 95%, 45% 82%, 0 95%)' };
                        }
                        if (style === 'minimal') {
                            return { backgroundColor: 'transparent', borderBottom: `0.8mm solid ${headerBg}` };
                        }
                        return { backgroundColor: headerBg, borderBottom: '1px solid rgba(255,255,255,0.1)' }; // solid
                    })()
                }}
            >
                {config.header_style === 'two-tone' && (
                    <div 
                      className="absolute inset-0 z-0 bg-black/15 pointer-events-none"
                      style={{ clipPath: 'polygon(0 0, 55% 0, 35% 100%, 0 100%)' }}
                    />
                )}
                <CardPatternLayer 
                  config={config} 
                  width={widthMM} 
                  height={resolvedHeaderHeight} 
                  scale={1} 
                  isHeader 
                />
                <div className="flex items-center gap-2 px-2 w-full justify-center z-10">
                    {/* Logo */}
                    {(config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url) ? (
                         <img src={config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url} alt="Logo" className="w-6 h-6 object-contain drop-shadow-sm" />
                    ) : (
                         <img src="/logo.png" alt="Absenta Logo" className="w-6 h-6 object-contain drop-shadow-sm" />
                    )}
                     <div className="text-center" style={{ color: 'inherit' }}>
                        {config.card_title && (
                          <h1 
                            className="font-black uppercase tracking-[0.2em] opacity-95 mb-0.5" 
                            style={{ 
                              fontSize: `${(config.card_title_font_size || 14) * 0.45}pt`,
                              color: config.header_style === 'minimal' ? config.primary_color : undefined
                            }}
                          >
                            {config.card_title}
                          </h1>
                        )}
                        {config.header_text && <h3 className="font-bold uppercase tracking-wider" style={{ fontSize: `${config.header_font_size}pt`, lineHeight: 1.2 }}>{config.header_text}</h3>}
                        {config.subheader_text && <h4 className="font-semibold" style={{ fontSize: `${config.subheader_font_size}pt`, lineHeight: 1.2 }}>{config.subheader_text}</h4>}
                        <h2 className="font-extrabold leading-tight mt-0.5" style={{ fontSize: `${config.school_name_font_size}pt`, lineHeight: 1.2 }}>{config.school_name || 'NAMA SEKOLAH'}</h2>
                        <p className="opacity-90 font-medium mt-0.5" style={{ fontSize: `${config.school_address_font_size}pt`, lineHeight: 1.2 }}>{config.school_address || 'Alamat'}</p>
                    </div>
                </div>
            </div>

            {/* Elegant header wave decoration */}
            {(!config.header_style || config.header_style === 'solid' || config.header_style === 'gradient') && (
                <div 
                  className="absolute left-0 right-0 z-0 opacity-[0.12] pointer-events-none"
                  style={{
                    top: `${resolvedHeaderHeight}mm`,
                    height: '3mm',
                    background: `linear-gradient(to bottom, ${config.primary_color}, transparent)`,
                  }}
                />
            )}

            {/* Content — absolute from top:0 left:0 matching PreviewCard */}
            <div 
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `translate(${dataX}px, ${dataY}px)`,
                    zIndex: 15,
                    padding: '4px 6px',
                    maxWidth: isCenteredCircle ? '190px' : (isVertical ? '110px' : '160px'),
                    textAlign: isCenteredCircle ? 'center' : undefined
                }}
            >
                <div style={{ marginBottom: '2px', fontSize: `${config.student_name_font_size}pt`, textAlign: isCenteredCircle ? 'center' : undefined }}>
                    <div style={{ fontSize: '5pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1px', color: config.primary_color || '#64748b', opacity: isDarkBg ? 0.6 : 1, textAlign: isCenteredCircle ? 'center' : undefined }}>
                        Nama Siswa
                    </div>
                    <div style={{ fontWeight: 800, color: isDarkBg ? '#fff' : '#0f172a', lineHeight: 1.2, textAlign: isCenteredCircle ? 'center' : undefined }}>
                        {displayStudent.nama}
                    </div>
                </div>

                <div style={{ height: '0.4mm', background: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', margin: '2px 0' }} />

                <div style={{ display: 'flex', gap: '8px', fontSize: `${config.student_details_font_size}pt`, marginBottom: '2px', justifyContent: isCenteredCircle ? 'center' : undefined }}>
                    <div>
                        <div style={{ fontSize: '4.5pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: config.primary_color || '#64748b', opacity: isDarkBg ? 0.6 : 1, marginBottom: '1px' }}>NIS</div>
                        <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.nis || '-'}</div>
                    </div>
                    <div style={{ width: '0.3mm', background: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }} />
                    <div>
                        <div style={{ fontSize: '4.5pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: config.primary_color || '#64748b', opacity: isDarkBg ? 0.6 : 1, marginBottom: '1px' }}>NISN</div>
                        <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.nisn || '-'}</div>
                    </div>
                </div>

                <div style={{ height: '0.4mm', background: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', margin: '2px 0' }} />

                <div style={{ display: 'flex', gap: '8px', fontSize: `${config.student_details_font_size}pt`, justifyContent: isCenteredCircle ? 'center' : undefined }}>
                    {displayStudent.jurusanNama && (
                        <div>
                            <div style={{ fontSize: '4.5pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: config.primary_color || '#64748b', opacity: isDarkBg ? 0.6 : 1, marginBottom: '1px' }}>Jurusan</div>
                            <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.jurusanNama}</div>
                        </div>
                    )}
                    {displayStudent.jurusanNama && <div style={{ width: '0.3mm', background: isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }} />}
                    <div>
                        <div style={{ fontSize: '4.5pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: config.primary_color || '#64748b', opacity: isDarkBg ? 0.6 : 1, marginBottom: '1px' }}>Kelas</div>
                        <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.kelasStripped}</div>
                    </div>
                </div>
            </div>

            {/* Photo */}
            {config.show_photo && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${photoX}px, ${photoY}px)`,
                        width: `${photoW}mm`,
                        height: `${config.photo_shape === 'circle' ? photoW : photoH}mm`,
                        zIndex: 20,
                        borderColor: config.photo_shape === 'circle' ? (config.primary_color || '#3b82f6') : undefined,
                        borderWidth: config.photo_shape === 'circle' ? '0.8mm' : undefined,
                        borderStyle: config.photo_shape === 'circle' ? 'solid' : undefined
                    }}
                    className={`bg-slate-50 flex items-center justify-center overflow-hidden shadow-md ${
                        config.photo_shape === 'circle' ? 'rounded-full' : 'border border-slate-200 rounded-xl'
                    }`}
                >
                    {student.foto ? (
                        <img src={student.foto} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-[6px] text-slate-400">FOTO</span>
                    )}
                </div>
            )}

            {/* QR Code */}
            {config.show_qrcode && qrUrl && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${qrX}px, ${qrY}px)`,
                        zIndex: 20
                    }}
                    className="bg-white p-1 rounded-xl shadow-md border border-slate-100/50 flex items-center justify-center"
                >
                    <img src={qrUrl} alt="QR" style={{ width: `${qrW}mm`, height: `${qrH}mm` }} className="object-contain" />
                </div>
            )}

             {/* Footer Decoration */}
            {(() => {
                const footerStyle = config.footer_style || 'solid';
                if (footerStyle === 'hidden') return null;

                const footerBg = config.footer_bg_color || config.primary_color;
                const heightMm = config.footer_height || 4;

                if (footerStyle === 'accent-line') {
                    return (
                        <div 
                          className="absolute bottom-1 left-3 right-3 rounded-full"
                          style={{ height: '0.8mm', backgroundColor: footerBg, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                        />
                    );
                }

                return (
                    <div 
                        className="absolute bottom-0 left-0 right-0"
                        style={{ 
                            height: `${heightMm}mm`,
                            printColorAdjust: 'exact',
                            WebkitPrintColorAdjust: 'exact',
                            ...(() => {
                                if (footerStyle === 'gradient') {
                                    return { background: `linear-gradient(90deg, ${footerBg} 0%, ${adjustColorBrightness(footerBg, -20)} 100%)` };
                                }
                                if (footerStyle === 'glass') {
                                    return { backgroundColor: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.3)' };
                                }
                                return { backgroundColor: footerBg }; // solid
                            })()
                        }}
                    />
                );
            })()}
        </div>
    );
});

PrintableCard.displayName = 'PrintableCard';
