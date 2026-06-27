import React, { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import QRCode from 'qrcode';
import type { StudentCardConfig } from './types';
import { MM_TO_PX, EDITOR_SCALE } from './constants';
import { Siswa } from '../../../types/academic';
import { CardPatternLayer } from './CardPatternLayer';

interface SekolahData {
    logo_url?: string;
    data?: {
        logo_url?: string;
    };
}

interface PreviewCardProps {
    student?: Partial<Siswa> & { 
        nama?: string; 
        nama_siswa?: string;
        kelas?: { nama?: string; nama_kelas?: string }; 
        foto?: string | null;
    };
    config: StudentCardConfig;
    sekolah?: SekolahData;
    onDragEnd: (field: 'photo' | 'qrcode' | 'data', info: PanInfo) => void;
}

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

export const PreviewCard: React.FC<PreviewCardProps> = React.memo(({ 
    student, 
    config, 
    sekolah,
    onDragEnd
}) => {
    const isVertical = config.template === 'vertical';
    const resolvedHeaderHeight = config.template === 'horizontal'
        ? Math.min(config.header_height || 18, 20)
        : (config.header_height || 18);

    const isCenteredCircle = isVertical && config.photo_shape === 'circle';
    const resolvedDataY = isCenteredCircle 
        ? Math.max(config.data_y || 0, 370) 
        : (config.data_y || 0);

    const cardW = config.card_width || 85.6;
    const cardH = config.card_height || 54;
    
    const width = (isVertical ? cardH : cardW) * MM_TO_PX * EDITOR_SCALE;
    const height = (isVertical ? cardW : cardH) * MM_TO_PX * EDITOR_SCALE;

    const resolvedQrX = isCenteredCircle 
        ? (width - (15 * MM_TO_PX * EDITOR_SCALE)) / 2 
        : config.qrcode_x;
    const resolvedQrY = isCenteredCircle 
        ? (height - (15 * MM_TO_PX * EDITOR_SCALE) - 15) 
        : config.qrcode_y;

    // Strip tingkat prefix (X, XI, XII) from class name
    const stripTingkat = (nama: string) =>
        nama.replace(/^(XII|XI|X)\s*/i, '').trim() || nama;

    // Use passed student or dummy fallback
    const rawStudent = student || ({
      id: 'dummy-student-id',
      nama: 'John Doe',
      nama_siswa: 'John Doe',
      nis: '12345678',
      nisn: '0012345678',
      Kelas: { nama_kelas: 'XII RPL 1', tingkat: 12, Jurusan: { id: '', nama: 'Rekayasa Perangkat Lunak' } } as unknown as Siswa['Kelas'],
      kelas: { nama: 'XII RPL 1', nama_kelas: 'XII RPL 1' },
      foto: null 
    } as NonNullable<PreviewCardProps['student']>);

    const kelasNama = rawStudent.Kelas?.nama_kelas || rawStudent.kelas?.nama || rawStudent.kelas?.nama_kelas || '-';
    const kelasStripped = stripTingkat(kelasNama);
    const fallbackJurusan = kelasStripped !== '-' ? kelasStripped.split(' ')[0] : '';
    const jurusanNama = (rawStudent.Kelas as any)?.Jurusan?.nama || (rawStudent as any)?.Jurusan?.nama || fallbackJurusan;

    const displayStudent = {
        ...rawStudent,
        nama: rawStudent.nama_siswa || rawStudent.nama,
        kelasNama,
        kelasStripped,
        jurusanNama,
    };

    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
      if (displayStudent.id) {
          QRCode.toDataURL(displayStudent.id, { margin: 1 })
            .then(setQrCodeUrl)
            .catch(console.error);
      }
    }, [displayStudent.id]);

    // Dimensions for Photo and QR (in mm)
    const PHOTO_WIDTH_MM = config.photo_width || 24;
    const PHOTO_HEIGHT_MM = config.photo_height || 32;
    const QR_WIDTH_MM = isCenteredCircle ? 15 : (config.qrcode_width || 20);
    const QR_HEIGHT_MM = isCenteredCircle ? 15 : (config.qrcode_height || 20);

    const photoW = PHOTO_WIDTH_MM * MM_TO_PX * EDITOR_SCALE;
    const photoH = PHOTO_HEIGHT_MM * MM_TO_PX * EDITOR_SCALE;
    const qrW = QR_WIDTH_MM * MM_TO_PX * EDITOR_SCALE;
    const qrH = QR_HEIGHT_MM * MM_TO_PX * EDITOR_SCALE;

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
      <div className="flex justify-center items-center p-8 bg-slate-100 rounded-lg overflow-auto">
        <div 
          className="relative shadow-2xl overflow-hidden rounded-2xl"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: config.secondary_color || '#ffffff',
            borderColor: config.show_border ? config.border_color : config.primary_color,
            borderWidth: config.show_border ? `${(config.border_width || 1) * EDITOR_SCALE}px` : `${1 * EDITOR_SCALE}px`,
            borderStyle: config.show_border ? 'solid' : 'none',
            boxShadow: config.show_border ? 'none' : '0 25px 50px -12px rgb(0 0 0 / 0.25)' 
          }}
        >
          {/* Card Pattern Layer */}
          <CardPatternLayer config={config} width={width} height={height} scale={EDITOR_SCALE} />
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div 
            className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center justify-center py-4 shadow-sm overflow-hidden"
            style={{ 
                height: `${resolvedHeaderHeight * MM_TO_PX * EDITOR_SCALE}px`,
                color: config.header_style === 'minimal' 
                    ? (config.header_bg_color || config.primary_color)
                    : (config.header_text_color || '#ffffff'),
                ...(() => {
                    const headerBg = config.header_bg_color || config.primary_color;
                    const style = config.header_style || 'solid';
                    if (style === 'gradient') {
                        return { background: `linear-gradient(135deg, ${headerBg} 0%, ${adjustColorBrightness(headerBg, -20)} 100%)`, borderBottom: '1px solid rgba(255,255,255,0.1)' };
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
                        return { backgroundColor: 'transparent', borderBottom: `3px solid ${headerBg}` };
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
              width={width} 
              height={resolvedHeaderHeight * MM_TO_PX * EDITOR_SCALE} 
              scale={EDITOR_SCALE} 
              isHeader 
            />
            <div className="flex items-center gap-3 px-4 w-full justify-center z-10">
              {/* Logo Placeholder */}
              {(config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url) ? (
                <img src={config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url} alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              ) : (
                <img src="/logo.png" alt="Absenta Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              )}
              <div className="text-center" style={{ color: 'inherit' }}>
                {config.card_title && (
                  <h1 
                    className="font-black uppercase tracking-[0.2em] opacity-95 mb-0.5" 
                    style={{ 
                      fontSize: `${(config.card_title_font_size || 14) * 0.45 * EDITOR_SCALE}pt`,
                      color: config.header_style === 'minimal' ? config.primary_color : undefined
                    }}
                  >
                    {config.card_title}
                  </h1>
                )}
                {config.header_text && <h3 className="font-bold uppercase tracking-wider" style={{ fontSize: `${config.header_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.header_text}</h3>}
                {config.subheader_text && <h4 className="font-semibold" style={{ fontSize: `${config.subheader_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.subheader_text}</h4>}
                <h2 className="font-extrabold leading-tight mt-0.5" style={{ fontSize: `${config.school_name_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.school_name || 'NAMA SEKOLAH'}</h2>
                <p className="opacity-90 font-medium mt-0.5" style={{ fontSize: `${config.school_address_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.school_address || 'Alamat Sekolah'}</p>
              </div>
            </div>
          </div>

          {/* Elegant header wave decoration */}
          {(!config.header_style || config.header_style === 'solid' || config.header_style === 'gradient') && (
            <div 
              className="absolute left-0 right-0 z-0 opacity-[0.12] pointer-events-none"
              style={{
                top: `${resolvedHeaderHeight * MM_TO_PX * EDITOR_SCALE}px`,
                height: '14px',
                background: `linear-gradient(to bottom, ${config.primary_color}, transparent)`,
              }}
            />
          )}

          {/* Content Area */}
          {/* Draggable Student Info — position is absolute from top:0 left:0 */}
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
                maxWidth: isCenteredCircle ? '380px' : (isVertical ? '220px' : '320px')
            }}
            className={`mt-0 space-y-1.5 p-2 border border-transparent hover:border-dashed hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 rounded-xl transition-all duration-200 ${isCenteredCircle ? 'text-center' : ''}`}
          >
            {/* NAMA — larger, bold */}
            <div style={{ fontSize: `${config.student_name_font_size * EDITOR_SCALE}pt` }} className={isCenteredCircle ? 'text-center' : ''}>
                <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${isCenteredCircle ? 'text-center' : ''}`}
                    style={{ color: isDarkBg ? 'rgba(255,255,255,0.5)' : config.primary_color || '#64748b' }}>
                    Nama Siswa
                </div>
                <div className={`font-extrabold leading-tight ${isDarkBg ? 'text-white' : 'text-slate-900'} ${isCenteredCircle ? 'text-center' : ''}`}>
                    {displayStudent.nama}
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />

            {/* NIS / NISN — pill style */}
            <div className={`flex gap-3 ${isCenteredCircle ? 'justify-center text-center' : ''}`} style={{ fontSize: `${config.student_details_font_size * EDITOR_SCALE}pt` }}>
                <div>
                    <div className={`text-[7px] font-black uppercase tracking-widest mb-0.5`}
                        style={{ color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b' }}>
                        NIS
                    </div>
                    <div className={`font-bold tabular-nums ${isDarkBg ? 'text-slate-200' : 'text-slate-800'}`}>
                        {displayStudent.nis || '-'}
                    </div>
                </div>
                <div style={{ width: '1px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />
                <div>
                    <div className={`text-[7px] font-black uppercase tracking-widest mb-0.5`}
                        style={{ color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b' }}>
                        NISN
                    </div>
                    <div className={`font-bold tabular-nums ${isDarkBg ? 'text-slate-200' : 'text-slate-800'}`}>
                        {displayStudent.nisn || '-'}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />

            {/* Jurusan + Kelas — two-column */}
            <div className={`flex gap-3 ${isCenteredCircle ? 'justify-center text-center' : ''}`} style={{ fontSize: `${config.student_details_font_size * EDITOR_SCALE}pt` }}>
                {displayStudent.jurusanNama && (
                    <div>
                        <div className={`text-[7px] font-black uppercase tracking-widest mb-0.5`}
                            style={{ color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b' }}>
                            Jurusan
                        </div>
                        <div className={`font-bold ${isDarkBg ? 'text-slate-200' : 'text-slate-800'}`}>
                            {displayStudent.jurusanNama}
                        </div>
                    </div>
                )}
                {displayStudent.jurusanNama && <div style={{ width: '1px', background: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }} />}
                <div>
                    <div className={`text-[7px] font-black uppercase tracking-widest mb-0.5`}
                        style={{ color: isDarkBg ? 'rgba(255,255,255,0.45)' : config.primary_color || '#64748b' }}>
                        Kelas
                    </div>
                    <div className={`font-bold ${isDarkBg ? 'text-slate-200' : 'text-slate-800'}`}>
                        {displayStudent.kelasStripped}
                    </div>
                </div>
            </div>
          </motion.div>

          {/* Draggable Photo */}
          {config.show_photo && (
            <motion.div
              drag
              dragMomentum={false}
              onDragEnd={(e, info) => onDragEnd('photo', info)}
              style={{
                x: config.photo_x,
                y: config.photo_y,
                position: 'absolute',
                top: 0, 
                left: 0,
                width: `${photoW}px`,
                height: `${config.photo_shape === 'circle' ? photoW : photoH}px`,
                zIndex: 20,
                cursor: 'move',
                borderColor: config.photo_shape === 'circle' ? (config.primary_color || '#3b82f6') : undefined,
                borderWidth: config.photo_shape === 'circle' ? '3px' : undefined
              }}
              className={`bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-md uppercase tracking-wider overflow-hidden ${
                config.photo_shape === 'circle' ? 'rounded-full' : 'border border-slate-200 dark:border-slate-800 rounded-xl'
              }`}
            >
              FOTO
            </motion.div>
          )}

          {/* Draggable QR Code */}
          {config.show_qrcode && (
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
                width: `${qrW}px`,
                height: `${qrH}px`,
                zIndex: 20,
                cursor: 'move'
              }}
              className="bg-white p-1 rounded-xl shadow-md border border-slate-100/50 flex items-center justify-center"
            >
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR" className="w-full h-full object-contain" draggable={false} />}
            </motion.div>
          )}

          {/* Footer Decoration */}
          {(() => {
              const footerStyle = config.footer_style || 'solid';
              if (footerStyle === 'hidden') return null;
              
              const footerBg = config.footer_bg_color || config.primary_color;
              const heightPx = (config.footer_height || 4) * EDITOR_SCALE;
              
              if (footerStyle === 'accent-line') {
                  return (
                      <div 
                        className="absolute bottom-1.5 left-4 right-4 rounded-full shadow-sm"
                        style={{ height: '3px', backgroundColor: footerBg }}
                      />
                  );
              }
              
              return (
                  <div 
                    className={`absolute bottom-0 left-0 right-0 shadow-inner ${
                        footerStyle === 'glass' ? 'backdrop-blur-sm border-t border-white/10' : ''
                    }`}
                    style={{ 
                        height: `${heightPx}px`,
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
      </div>
    );
});

PreviewCard.displayName = 'PreviewCard';
