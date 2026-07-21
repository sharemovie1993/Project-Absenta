import React, { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
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
    student?: Partial<Siswa> & { 
        nama?: string; 
        nama_siswa?: string;
        kelas?: { nama?: string; nama_kelas?: string }; 
        foto?: string | null;
    };
    config: StudentCardConfig;
    sekolah?: SekolahData;
    isInteractive?: boolean;
    onDragEnd?: (field: 'photo' | 'qrcode' | 'data' | 'header' | 'title', info: PanInfo) => void;
}

export const PrintableCard: React.FC<PrintableCardProps> = React.memo(({ 
    student = {}, 
    config, 
    sekolah,
    isInteractive = false,
    onDragEnd
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

    const PX_TO_MM_SCALE = MM_TO_PX * EDITOR_SCALE;

    const photoX_MM = (config.photo_x || 0) / PX_TO_MM_SCALE;
    const photoY_MM = (config.photo_y || 0) / PX_TO_MM_SCALE;

    const resolvedDataY = isCenteredCircle 
        ? Math.max(config.data_y || 0, 370) 
        : (config.data_y || 0);

    const resolvedQrX = isCenteredCircle 
        ? ((widthMM - qrW) * MM_TO_PX * EDITOR_SCALE) / 2 
        : config.qrcode_x;
    const resolvedQrY = isCenteredCircle 
        ? ((heightMM - qrH) * MM_TO_PX * EDITOR_SCALE) - 15 
        : config.qrcode_y;

    const qrX_MM = resolvedQrX / PX_TO_MM_SCALE;
    const qrY_MM = resolvedQrY / PX_TO_MM_SCALE;
    const dataX_MM = (config.data_x || 0) / PX_TO_MM_SCALE;
    const dataY_MM = resolvedDataY / PX_TO_MM_SCALE;
    const headerX_MM = (config.header_x || 0) / PX_TO_MM_SCALE;
    const headerY_MM = (config.header_y || 0) / PX_TO_MM_SCALE;
    const titleX_MM = (config.title_x || 0) / PX_TO_MM_SCALE;
    const titleY_MM = (config.title_y || 0) / PX_TO_MM_SCALE;

    // Strip tingkat prefix (X, XI, XII) from class name
    const stripTingkat = (nama: string) =>
        nama.replace(/^(XII|XI|X)\s*/i, '').trim() || nama;

    const getDynamicNameFontSize = (name: string, baseSizePt: number) => {
        const len = name.length;
        if (len <= 16) return baseSizePt;
        if (len <= 22) return baseSizePt * 0.8;
        if (len <= 28) return baseSizePt * 0.7;
        return baseSizePt * 0.55;
    };

    const kelasNama = student.Kelas?.nama_kelas || student.kelas?.nama || student.kelas?.nama_kelas || '-';
    const kelasStripped = stripTingkat(kelasNama);
    const fallbackJurusan = kelasStripped !== '-' ? kelasStripped.split(' ')[0] : '';
    const jurusanNama = (student.Kelas as any)?.Jurusan?.nama || (student as any)?.Jurusan?.nama || fallbackJurusan;

    const getDynamicTitleFontSize = (title: string, basePt: number) => {
        const len = title.length;
        if (len <= 14) return basePt;
        if (len <= 18) return basePt * 0.82;
        if (len <= 23) return basePt * 0.68;
        return basePt * 0.55;
    };

    const isGuruCard = Boolean((student as any)?.nama_guru || (student as any)?.nip || (student as any)?.jenis_ptk);

    const resolvedCardTitle = (config.card_title && config.card_title !== 'KARTU PELAJAR' && config.card_title !== 'KARTU IDENTITAS PEGAWAI' && config.card_title !== 'KARTU PEGAWAI')
        ? config.card_title
        : (isGuruCard ? 'KARTU PEGAWAI' : 'KARTU PELAJAR');

    const displayStudent = {
        ...student,
        isGuruCard,
        nama: (student as any)?.nama_guru || student.nama_siswa || student.nama || (isGuruCard ? 'Ahmad Fauzi, S.Pd' : 'A. SYARIF HIDAYAT'),
        nip: (student as any)?.nip || student.nis || '2526100001',
        jenisPtk: (student as any)?.jenis_ptk === 'PENDIDIK' ? 'Guru' : ((student as any)?.jenis_ptk === 'TENAGA_KEPENDIDIKAN' ? 'Staf TU' : ((student as any)?.jenis_ptk || student.nisn || '0084354802')),
        statusPegawai: (student as any)?.status_kepegawaian || (kelasStripped !== '-' ? kelasStripped : 'KUL'),
        kelasNama: kelasNama !== '-' ? kelasNama : 'X - Kuliner 1',
        kelasStripped: kelasStripped !== '-' ? kelasStripped : 'KUL',
        jurusanNama: jurusanNama || 'Kuliner',
    };

    const [qrUrl, setQrUrl] = useState<string>('');

    useEffect(() => {
        const qrValue = displayStudent.isGuruCard 
            ? ((student as any)?.nip || student.id || 'NIP-GURU-SAMPLE') 
            : (student.nisn || student.nis || student.id || 'NISN-SISWA-SAMPLE');
            
        if (qrValue) {
            QRCode.toDataURL(qrValue, { margin: 1, width: 200 })
                .then(setQrUrl)
                .catch(() => setQrUrl(''));
        } else {
            setQrUrl('');
        }
    }, [displayStudent, student]);

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

    const logoSrc = config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url || '/logo.png';

    const headerInnerContent = (
        <>
            <img 
              src={logoSrc} 
              alt="Logo" 
              className="object-contain drop-shadow-sm flex-shrink-0" 
              style={{
                width: `${(config.logo_size || 24) * MM_TO_PX * 0.4233}px`,
                height: `${(config.logo_size || 24) * MM_TO_PX * 0.4233}px`
              }}
            />
            <div className="text-center" style={{ color: 'inherit' }}>
                {isCenteredCircle && (
                    <h1 
                        className="font-black uppercase tracking-[0.2em] opacity-95 mb-0.5" 
                        style={{ 
                            fontSize: `${getDynamicTitleFontSize(resolvedCardTitle, (config.card_title_font_size || 14) * 0.45)}pt`,
                            color: config.header_style === 'minimal' ? config.primary_color : undefined
                        }}
                    >
                        {resolvedCardTitle}
                    </h1>
                )}
                {(config.show_header_text ?? true) && config.header_text && <h3 className="font-bold uppercase tracking-wider text-[9px] leading-tight">{config.header_text}</h3>}
                {(config.show_subheader_text ?? true) && config.subheader_text && <h4 className="font-semibold text-[8px] leading-tight">{config.subheader_text}</h4>}
                {(config.show_school_name ?? true) && <h2 className="font-extrabold leading-tight text-[11px] mt-0.5">{config.school_name || 'SMK Negeri 1 Plered'}</h2>}
                {(config.show_school_address ?? true) && <p className="opacity-90 font-medium text-[7.5px] mt-0.5">{config.school_address || 'Jl. Rawasari, Plered - Purwakarta'}</p>}
            </div>
        </>
    );

    const titleInnerContent = (
        <h1 className="font-black uppercase tracking-widest" style={{ color: config.primary_color, fontSize: `${getDynamicTitleFontSize(resolvedCardTitle, config.card_title_font_size || 14)}pt` }}>
            {resolvedCardTitle}
        </h1>
    );

    return (
        <div 
            className={`relative overflow-hidden break-inside-avoid page-break-inside-avoid rounded-2xl select-none ${!config.show_border ? 'border border-slate-200 print:border-0' : ''}`}
            style={{
                width: `${widthMM}mm`,
                height: `${heightMM}mm`,
                backgroundColor: config.secondary_color || '#ffffff',
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
                borderColor: config.show_border ? config.border_color : undefined,
                borderWidth: config.show_border ? `${config.border_width || 1}px` : undefined,
                borderStyle: config.show_border ? 'solid' : undefined
            }}
        >
            {/* Card Pattern Layer */}
            <CardPatternLayer config={config} width={widthMM} height={heightMM} scale={1} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Header (Fixed) */}
            <div 
                className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center py-2 shadow-sm animate-in fade-in z-10 overflow-hidden"
                style={{ 
                    height: `${resolvedHeaderHeight}mm`,
                    color: config.header_style === 'minimal' 
                        ? (config.header_bg_color || config.primary_color)
                        : (config.header_text_color || '#ffffff'),
                    ...(() => {
                        const headerBg = config.header_bg_color || config.primary_color;
                        const style = config.header_style || 'solid';
                        if (style === 'gradient') {
                            return { background: `linear-gradient(135deg, ${headerBg} 0%, ${adjustColorBrightness(headerBg, -20)} 100%)`, borderBottom: '0.3mm solid rgba(255,255,255,0.1)' };
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
                        return { backgroundColor: headerBg, borderBottom: '0.3mm solid rgba(255,255,255,0.1)' }; // solid
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
                
                {isInteractive && onDragEnd ? (
                    <motion.div 
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => onDragEnd('header', info)}
                        className="flex items-center gap-2 px-2 w-full justify-center z-10 cursor-move border border-transparent hover:border-dashed hover:border-blue-400 hover:bg-white/10 rounded-xl transition-all"
                        style={{
                            x: config.header_x || 0,
                            y: config.header_y || 0
                        }}
                    >
                        {headerInnerContent}
                    </motion.div>
                ) : (
                    <div 
                        className="flex items-center gap-2 px-2 w-full justify-center z-10"
                        style={{ transform: `translate(${headerX_MM}mm, ${headerY_MM}mm)` }}
                    >
                        {headerInnerContent}
                    </div>
                )}
            </div>

            {/* Header Wave Decoration */}
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

            {/* Card Title */}
            {!isCenteredCircle && (
                isInteractive && onDragEnd ? (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => onDragEnd('title', info)}
                        className="absolute w-full text-center z-10 cursor-move border border-transparent hover:border-dashed hover:border-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                        style={{ 
                            x: config.title_x || 0,
                            top: `${resolvedHeaderHeight * MM_TO_PX + 
                                    ((config.header_style === 'wave' || config.header_style === 'slanted' || config.header_style === 'double-wave') ? 1 : -3) + (config.title_y || 0) / EDITOR_SCALE}px` 
                        }}
                    >
                        {titleInnerContent}
                    </motion.div>
                ) : (
                    <div
                        className="absolute w-full text-center pointer-events-none z-10"
                        style={{ 
                            transform: `translateX(${titleX_MM}mm)`,
                            top: `${resolvedHeaderHeight * MM_TO_PX + 
                                    ((config.header_style === 'wave' || config.header_style === 'slanted' || config.header_style === 'double-wave') ? 1 : -3) + (config.title_y || 0) / EDITOR_SCALE}px` 
                        }}
                    >
                        {titleInnerContent}
                    </div>
                )
            )}

            {/* Data Block */}
            {isInteractive && onDragEnd ? (
                <motion.div
                    drag
                    dragMomentum={false}
                    onDragEnd={(e, info) => onDragEnd('data', info)}
                    style={{
                        x: config.data_x || 0,
                        y: resolvedDataY,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        cursor: 'move',
                        zIndex: 15,
                        padding: '3px 3px',
                        maxWidth: isCenteredCircle ? '190px' : (isVertical ? '110px' : '160px'),
                        textAlign: isCenteredCircle ? 'center' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                    }}
                    className="border border-transparent hover:border-dashed hover:border-slate-300 hover:bg-slate-50/50 rounded-xl transition-all"
                >
                    {/* NAMA SISWA / GURU */}
                    <div style={{ fontSize: `${getDynamicNameFontSize(displayStudent.nama, config.student_name_font_size)}pt`, textAlign: isCenteredCircle ? 'center' : undefined }}>
                        <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5px', color: isDarkBg ? 'rgba(255,255,255,0.5)' : config.primary_color || '#64748b', textAlign: isCenteredCircle ? 'center' : undefined }}>
                            {displayStudent.isGuruCard ? 'Nama Pegawai / Guru' : 'Nama Siswa'}
                        </div>
                        <div style={{ fontWeight: 800, color: isDarkBg ? '#fff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1, textAlign: isCenteredCircle ? 'center' : undefined }}>
                            {displayStudent.nama}
                        </div>
                    </div>

                    <div style={{ height: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />

                    <div style={{ display: 'flex', gap: '6px', fontSize: `${config.student_details_font_size}pt`, justifyContent: isCenteredCircle ? 'center' : undefined }}>
                        <div>
                            <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>
                              {displayStudent.isGuruCard ? 'NIP / NUPTK' : 'NIS'}
                            </div>
                            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.nip || (displayStudent.isGuruCard ? '-' : displayStudent.nis || '-')}</div>
                        </div>
                        <div style={{ width: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />
                        <div>
                            <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>
                              {displayStudent.isGuruCard ? 'Fungsi / PTK' : 'NISN'}
                            </div>
                            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.isGuruCard ? displayStudent.jenisPtk : (displayStudent.nisn || '-')}</div>
                        </div>
                    </div>

                    <div style={{ height: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />

                    <div style={{ display: 'flex', gap: '6px', fontSize: `${config.student_details_font_size}pt`, justifyContent: isCenteredCircle ? 'center' : undefined }}>
                        {displayStudent.isGuruCard ? (
                          <div>
                              <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>Status</div>
                              <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.statusPegawai || 'Aktif'}</div>
                          </div>
                        ) : (
                          <>
                            {displayStudent.jurusanNama && (
                                <div>
                                    <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>Jurusan</div>
                                    <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.jurusanNama}</div>
                                </div>
                            )}
                            {displayStudent.jurusanNama && <div style={{ width: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />}
                            <div>
                                <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>Kelas</div>
                                <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.kelasStripped}</div>
                            </div>
                          </>
                        )}
                    </div>
                </motion.div>
            ) : (
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transform: `translate(${dataX_MM}mm, ${dataY_MM}mm)`,
                        zIndex: 15,
                        padding: '3px 3px',
                        maxWidth: isCenteredCircle ? '190px' : (isVertical ? '110px' : '160px'),
                        textAlign: isCenteredCircle ? 'center' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                    }}
                >
                    {/* NAMA SISWA / GURU */}
                    <div style={{ fontSize: `${getDynamicNameFontSize(displayStudent.nama, config.student_name_font_size)}pt`, textAlign: isCenteredCircle ? 'center' : undefined }}>
                        <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5px', color: isDarkBg ? 'rgba(255,255,255,0.5)' : config.primary_color || '#64748b', textAlign: isCenteredCircle ? 'center' : undefined }}>
                            {displayStudent.isGuruCard ? 'Nama Pegawai / Guru' : 'Nama Siswa'}
                        </div>
                        <div style={{ fontWeight: 800, color: isDarkBg ? '#fff' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1, textAlign: isCenteredCircle ? 'center' : undefined }}>
                            {displayStudent.nama}
                        </div>
                    </div>

                    <div style={{ height: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />

                    <div style={{ display: 'flex', gap: '6px', fontSize: `${config.student_details_font_size}pt`, justifyContent: isCenteredCircle ? 'center' : undefined }}>
                        <div>
                            <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>
                              {displayStudent.isGuruCard ? 'NIP / NUPTK' : 'NIS'}
                            </div>
                            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.nip || (displayStudent.isGuruCard ? '-' : displayStudent.nis || '-')}</div>
                        </div>
                        <div style={{ width: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />
                        <div>
                            <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>
                              {displayStudent.isGuruCard ? 'Fungsi / PTK' : 'NISN'}
                            </div>
                            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.isGuruCard ? displayStudent.jenisPtk : (displayStudent.nisn || '-')}</div>
                        </div>
                    </div>

                    <div style={{ height: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />

                    <div style={{ display: 'flex', gap: '6px', fontSize: `${config.student_details_font_size}pt`, justifyContent: isCenteredCircle ? 'center' : undefined }}>
                        {displayStudent.isGuruCard ? (
                          <div>
                              <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>Status</div>
                              <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.statusPegawai || 'Aktif'}</div>
                          </div>
                        ) : (
                          <>
                            {displayStudent.jurusanNama && (
                                <div>
                                    <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>Jurusan</div>
                                    <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.jurusanNama}</div>
                                </div>
                            )}
                            {displayStudent.jurusanNama && <div style={{ width: '0.5px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />}
                            <div>
                                <div style={{ fontSize: '3.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b', marginBottom: '1px' }}>Kelas</div>
                                <div style={{ fontWeight: 700, color: isDarkBg ? '#e2e8f0' : '#1e293b' }}>{displayStudent.kelasStripped}</div>
                            </div>
                          </>
                        )}
                    </div>
                </div>
            )}

            {/* Photo */}
            {config.show_photo && (
                isInteractive && onDragEnd ? (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => onDragEnd('photo', info)}
                        style={{
                            x: config.photo_x || 0,
                            y: config.photo_y || 0,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${photoW}mm`,
                            height: `${config.photo_shape === 'circle' ? photoW : photoH}mm`,
                            zIndex: 20,
                            cursor: 'move',
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
                    </motion.div>
                ) : (
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            transform: `translate(${photoX_MM}mm, ${photoY_MM}mm)`,
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
                )
            )}

            {/* QR Code */}
            {config.show_qrcode && (
                isInteractive && onDragEnd ? (
                    <motion.div
                        drag
                        dragMomentum={false}
                        onDragEnd={(e, info) => onDragEnd('qrcode', info)}
                        style={{
                            x: resolvedQrX,
                            y: resolvedQrY,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${qrW}mm`,
                            height: `${qrH}mm`,
                            boxSizing: 'border-box',
                            zIndex: 20,
                            cursor: 'move'
                        }}
                        className="bg-white p-0.5 rounded-xl shadow-md border border-slate-100/50 flex items-center justify-center overflow-hidden"
                    >
                        {qrUrl && <img src={qrUrl} alt="QR" className="w-full h-full object-contain" draggable={false} />}
                    </motion.div>
                ) : (
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            transform: `translate(${qrX_MM}mm, ${qrY_MM}mm)`,
                            width: `${qrW}mm`,
                            height: `${qrH}mm`,
                            boxSizing: 'border-box',
                            zIndex: 20
                        }}
                        className="bg-white p-0.5 rounded-xl shadow-md border border-slate-100/50 flex items-center justify-center overflow-hidden"
                    >
                        {qrUrl && <img src={qrUrl} alt="QR" className="w-full h-full object-contain" />}
                    </div>
                )
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
                          className="absolute bottom-1.5 left-4 right-4 rounded-full shadow-sm"
                          style={{ height: '0.8mm', backgroundColor: footerBg }}
                        />
                    );
                }

                return (
                    <div 
                      className={`absolute bottom-0 left-0 right-0 shadow-inner ${
                          footerStyle === 'glass' ? 'backdrop-blur-sm border-t border-white/10' : ''
                      }`}
                      style={{ 
                          height: `${heightMm}mm`,
                          ...(() => {
                              if (footerStyle === 'gradient') {
                                  return { background: `linear-gradient(90deg, ${footerBg} 0%, ${adjustColorBrightness(footerBg, -20)} 100%)` };
                              }
                              if (footerStyle === 'glass') {
                                  return { backgroundColor: 'rgba(255, 255, 255, 0.15)' };
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
