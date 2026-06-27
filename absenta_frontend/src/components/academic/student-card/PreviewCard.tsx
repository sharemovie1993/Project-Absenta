import React, { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import QRCode from 'qrcode';
import type { StudentCardConfig } from './types';
import { MM_TO_PX, EDITOR_SCALE } from './constants';
import { Siswa } from '../../../types/academic';

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

export const PreviewCard: React.FC<PreviewCardProps> = React.memo(({ 
    student, 
    config, 
    sekolah,
    onDragEnd
}) => {
    const isVertical = config.template === 'vertical';
    const cardW = config.card_width || 85.6;
    const cardH = config.card_height || 54;
    
    const width = (isVertical ? cardH : cardW) * MM_TO_PX * EDITOR_SCALE;
    const height = (isVertical ? cardW : cardH) * MM_TO_PX * EDITOR_SCALE;

    // Use passed student or dummy fallback
    const rawStudent = student || ({
      id: 'dummy-student-id',
      nama: 'John Doe',
      nama_siswa: 'John Doe',
      nis: '12345678',
      nisn: '0012345678',
      Kelas: { nama_kelas: 'XII IPA 1' } as unknown as Siswa['Kelas'],
      kelas: { nama: 'XII IPA 1', nama_kelas: 'XII IPA 1' },
      foto: null 
    } as NonNullable<PreviewCardProps['student']>);

    const displayStudent = {
        ...rawStudent,
        nama: rawStudent.nama_siswa || rawStudent.nama,
        kelas: {
            nama: rawStudent.Kelas?.nama_kelas || rawStudent.kelas?.nama || rawStudent.kelas?.nama_kelas || '-'
        }
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
    const QR_WIDTH_MM = config.qrcode_width || 20;
    const QR_HEIGHT_MM = config.qrcode_height || 20;

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
          {/* Subtle Decorative Background Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
               style={{
                 backgroundImage: 'radial-gradient(circle at 100% 150%, #000 24%, white 25%, white 28%, #000 29%, #000 36%, white 36%, white 40%, transparent 40%), radial-gradient(circle at 0% 150%, #000 24%, white 25%, white 28%, #000 29%, #000 36%, white 36%, white 40%, transparent 40%)',
                 backgroundSize: '24px 24px'
               }}
          />
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div 
            className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center justify-center py-4 border-b border-white/10 shadow-sm"
            style={{ 
                backgroundColor: config.header_bg_color || config.primary_color, 
                height: `${(config.header_height || 18) * MM_TO_PX * EDITOR_SCALE}px`,
                color: config.header_text_color || '#ffffff'
            }}
          >
            <div className="flex items-center gap-3 px-4 w-full justify-center">
              {/* Logo Placeholder */}
              {(config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url) ? (
                <img src={config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url} alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              ) : (
                <img src="/logo.png" alt="Absenta Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              )}
              <div className="text-center" style={{ color: 'inherit' }}>
                <h3 className="font-bold uppercase tracking-wider" style={{ fontSize: `${config.header_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.header_text}</h3>
                <h4 className="font-semibold" style={{ fontSize: `${config.subheader_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.subheader_text}</h4>
                <h2 className="font-extrabold leading-tight mt-1" style={{ fontSize: `${config.school_name_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.school_name || 'NAMA SEKOLAH'}</h2>
                <p className="opacity-90 font-medium" style={{ fontSize: `${config.school_address_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.school_address || 'Alamat Sekolah'}</p>
              </div>
            </div>
          </div>

          {/* Elegant header wave decoration */}
          <div 
            className="absolute left-0 right-0 z-0 opacity-[0.12] pointer-events-none"
            style={{
              top: `${(config.header_height || 18) * MM_TO_PX * EDITOR_SCALE}px`,
              height: '14px',
              background: `linear-gradient(to bottom, ${config.primary_color}, transparent)`,
            }}
          />

          {/* Card Title */}
          <div className="absolute top-[22%] w-full text-center pointer-events-none">
             <h1 className="font-black uppercase tracking-widest text-slate-800" style={{ color: config.primary_color, fontSize: `${config.card_title_font_size * EDITOR_SCALE}pt` }}>
                {config.card_title}
             </h1>
          </div>

          {/* Content Area */}
          {/* Draggable Student Info */}
          <motion.div 
            drag
            dragMomentum={false}
            onDragEnd={(e, info) => onDragEnd('data', info)}
            style={{ 
                x: config.data_x || 0,
                y: config.data_y || 0,
                position: 'absolute', 
                top: '30%', // Initial relative position
                left: '1rem', // Initial relative position
                cursor: 'move',
                zIndex: 15
            }}
            className={`mt-0 space-y-2 p-2.5 border border-transparent hover:border-dashed hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 rounded-xl transition-all duration-200 ${isDarkBg ? 'text-slate-200' : 'text-slate-700'}`}
          >
            <div className="flex items-center gap-2" style={{ fontSize: `${config.student_name_font_size * EDITOR_SCALE}pt` }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[50px]">Nama:</span>
                <span className={`font-extrabold ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>{displayStudent.nama}</span>
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: `${config.student_details_font_size * EDITOR_SCALE}pt` }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[50px]">NIS/N:</span>
                <span className={`font-bold ${isDarkBg ? 'text-slate-300' : 'text-slate-700'}`}>{displayStudent.nis} / {displayStudent.nisn}</span>
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: `${config.student_details_font_size * EDITOR_SCALE}pt` }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[50px]">Kelas:</span>
                <span className={`font-bold ${isDarkBg ? 'text-slate-300' : 'text-slate-700'}`}>{displayStudent.kelas?.nama}</span>
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
                height: `${photoH}px`,
                zIndex: 20,
                cursor: 'move'
              }}
              className="bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 shadow-md uppercase tracking-wider"
            >
              FOTO 3x4
            </motion.div>
          )}

          {/* Draggable QR Code */}
          {config.show_qrcode && (
            <motion.div
              drag
              dragMomentum={false}
              onDragEnd={(e, info) => onDragEnd('qrcode', info)}
              style={{
                x: config.qrcode_x,
                y: config.qrcode_y,
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
          <div 
            className="absolute bottom-0 left-0 right-0 h-4 shadow-inner"
            style={{ backgroundColor: config.primary_color }}
          />
        </div>
      </div>
    );
});

PreviewCard.displayName = 'PreviewCard';
