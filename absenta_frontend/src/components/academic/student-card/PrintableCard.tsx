import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { StudentCardConfig } from './types';
import { EDITOR_SCALE } from './constants';
import { Siswa } from '../../../types/academic';

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
    const cardW = config.card_width || 85.6;
    const cardH = config.card_height || 54;
    
    // Dimensions
    const widthMM = isVertical ? cardH : cardW;
    const heightMM = isVertical ? cardW : cardH;
    
    const photoW = config.photo_width || 24;
    const photoH = config.photo_height || 32;
    const qrW = config.qrcode_width || 20;
    const qrH = config.qrcode_height || 20;

    // We need to scale the saved coordinates (which were in EDITOR_SCALE) back to 1x
    const photoX = config.photo_x / EDITOR_SCALE;
    const photoY = config.photo_y / EDITOR_SCALE;
    const qrX = config.qrcode_x / EDITOR_SCALE;
    const qrY = config.qrcode_y / EDITOR_SCALE;
    const dataX = (config.data_x || 0) / EDITOR_SCALE;
    const dataY = (config.data_y || 0) / EDITOR_SCALE;

    const displayStudent = {
        ...student,
        nama: student.nama_siswa || student.nama,
        kelas: {
            nama: student.Kelas?.nama_kelas || student.kelas?.nama || student.kelas?.nama_kelas || '-'
        }
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
            {/* Subtle Decorative Background Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                 style={{
                   backgroundImage: 'radial-gradient(circle at 100% 150%, #000 24%, white 25%, white 28%, #000 29%, #000 36%, white 36%, white 40%, transparent 40%), radial-gradient(circle at 0% 150%, #000 24%, white 25%, white 28%, #000 29%, #000 36%, white 36%, white 40%, transparent 40%)',
                   backgroundSize: '24px 24px'
                 }}
            />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div 
                className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center py-2 border-b border-white/10 shadow-sm animate-in fade-in"
                style={{ 
                    backgroundColor: config.header_bg_color || config.primary_color, 
                    height: `${config.header_height || 18}mm`,
                    color: config.header_text_color || '#ffffff',
                    printColorAdjust: 'exact',
                    WebkitPrintColorAdjust: 'exact'
                }}
            >
                <div className="flex items-center gap-2 px-2 w-full justify-center">
                    {/* Logo */}
                    {(config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url) ? (
                         <img src={config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url} alt="Logo" className="w-6 h-6 object-contain drop-shadow-sm" />
                    ) : (
                         <img src="/logo.png" alt="Absenta Logo" className="w-6 h-6 object-contain drop-shadow-sm" />
                    )}
                    <div className="text-center" style={{ color: 'inherit' }}>
                        <h3 className="font-bold uppercase tracking-wider" style={{ fontSize: `${config.header_font_size}pt`, lineHeight: 1.2 }}>{config.header_text}</h3>
                        <h4 className="font-semibold" style={{ fontSize: `${config.subheader_font_size}pt`, lineHeight: 1.2 }}>{config.subheader_text}</h4>
                        <h2 className="font-extrabold leading-tight mt-0.5" style={{ fontSize: `${config.school_name_font_size}pt`, lineHeight: 1.2 }}>{config.school_name || 'NAMA SEKOLAH'}</h2>
                        <p className="opacity-90 font-medium" style={{ fontSize: `${config.school_address_font_size}pt`, lineHeight: 1.2 }}>{config.school_address || 'Alamat'}</p>
                    </div>
                </div>
            </div>

            {/* Elegant header wave decoration */}
            <div 
              className="absolute left-0 right-0 z-0 opacity-[0.12] pointer-events-none"
              style={{
                top: `${config.header_height || 18}mm`,
                height: '3mm',
                background: `linear-gradient(to bottom, ${config.primary_color}, transparent)`,
              }}
            />

            {/* Title */}
            <div className="absolute top-[22%] w-full text-center pointer-events-none">
                 <h1 className="font-black uppercase tracking-widest text-slate-800" style={{ color: config.primary_color, fontSize: `${config.card_title_font_size}pt` }}>
                    {config.card_title}
                 </h1>
            </div>

            {/* Content */}
            <div 
                className="absolute inset-0 p-3"
                style={{
                    top: '30%',
                    left: '1rem', // Match PreviewCard logic
                    transform: `translate(${dataX}px, ${dataY}px)`,
                    zIndex: 15
                }}
            >
                 <div className={`mt-0 space-y-1 ${isDarkBg ? 'text-slate-200' : 'text-slate-700'}`}>
                    <div className="flex items-center gap-1.5" style={{ fontSize: `${config.student_name_font_size}pt` }}>
                      <span className="text-[7pt] font-bold text-slate-400 uppercase tracking-wider min-w-[32pt]">Nama:</span>
                      <span className={`font-extrabold ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>{displayStudent.nama}</span>
                    </div>
                    <div className="flex items-center gap-1.5" style={{ fontSize: `${config.student_details_font_size}pt` }}>
                      <span className="text-[7pt] font-bold text-slate-400 uppercase tracking-wider min-w-[32pt]">NIS/N:</span>
                      <span className={`font-bold ${isDarkBg ? 'text-slate-300' : 'text-slate-700'}`}>{displayStudent.nis} / {displayStudent.nisn || '-'}</span>
                    </div>
                     <div className="flex items-center gap-1.5" style={{ fontSize: `${config.student_details_font_size}pt` }}>
                      <span className="text-[7pt] font-bold text-slate-400 uppercase tracking-wider min-w-[32pt]">Kelas:</span>
                      <span className={`font-bold ${isDarkBg ? 'text-slate-300' : 'text-slate-700'}`}>{displayStudent.kelas?.nama}</span>
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
                        height: `${photoH}mm`,
                        zIndex: 20
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-md"
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
            <div 
                className="absolute bottom-0 left-0 right-0 h-2 shadow-inner"
                style={{ backgroundColor: config.primary_color }}
            />
        </div>
    );
});

PrintableCard.displayName = 'PrintableCard';
