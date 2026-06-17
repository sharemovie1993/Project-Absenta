import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { StudentCardConfig } from './types';
import { EDITOR_SCALE } from './constants';

interface PrintableCardProps {
    student: any;
    config: StudentCardConfig;
    sekolah?: any;
}

export const PrintableCard: React.FC<PrintableCardProps> = ({ 
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

    return (
        <div 
            className={`relative bg-white overflow-hidden break-inside-avoid page-break-inside-avoid ${!config.show_border ? 'border border-slate-200 print:border-0' : ''}`}
            style={{
                width: `${widthMM}mm`,
                height: `${heightMM}mm`,
                // Force background print
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
                borderColor: config.show_border ? config.border_color : undefined,
                borderWidth: config.show_border ? `${config.border_width || 1}px` : undefined,
                borderStyle: config.show_border ? 'solid' : undefined
            }}
        >
            {/* Header */}
            <div 
                className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center py-2"
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
                         <img src={config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
                    ) : (
                        <img src="/logo.png" alt="Absenta Logo" className="w-6 h-6 object-contain" />
                    )}
                    <div className="text-center" style={{ color: 'inherit' }}>
                        <h3 className="font-bold uppercase" style={{ fontSize: `${config.header_font_size}pt` }}>{config.header_text}</h3>
                        <h4 className="font-semibold" style={{ fontSize: `${config.subheader_font_size}pt` }}>{config.subheader_text}</h4>
                        <h2 className="font-bold leading-tight mt-0.5" style={{ fontSize: `${config.school_name_font_size}pt` }}>{config.school_name || 'NAMA SEKOLAH'}</h2>
                        <p className="opacity-90" style={{ fontSize: `${config.school_address_font_size}pt` }}>{config.school_address || 'Alamat'}</p>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div className="absolute top-[22%] w-full text-center">
                 <h1 className="font-bold uppercase tracking-widest" style={{ color: config.primary_color, fontSize: `${config.card_title_font_size}pt` }}>
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
                 <div className="mt-0 space-y-1 text-black">
                    <div className="flex" style={{ fontSize: `${config.student_name_font_size}pt` }}>
                      <span className="w-12 font-bold">Nama</span>
                      <span>: {displayStudent.nama}</span>
                    </div>
                    <div className="flex" style={{ fontSize: `${config.student_details_font_size}pt` }}>
                      <span className="w-12 font-bold">NIS</span>
                      <span>: {displayStudent.nis}</span>
                    </div>
                     <div className="flex" style={{ fontSize: `${config.student_details_font_size}pt` }}>
                      <span className="w-12 font-bold">Kelas</span>
                      <span>: {displayStudent.kelas?.nama}</span>
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
                    className="bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden"
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
                >
                    <img src={qrUrl} alt="QR" style={{ width: `${qrW}mm`, height: `${qrH}mm` }} />
                </div>
            )}

             {/* Footer Decoration */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-2"
                style={{ backgroundColor: config.primary_color }}
            />
        </div>
    );
};
