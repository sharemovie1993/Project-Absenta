import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import type { StudentCardConfig } from './types';
import { MM_TO_PX, EDITOR_SCALE } from './constants';

interface PreviewCardProps {
    student?: any;
    config: StudentCardConfig;
    sekolah?: any;
    onDragEnd: (field: 'photo' | 'qrcode' | 'data', info: any) => void;
}

export const PreviewCard: React.FC<PreviewCardProps> = ({ 
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
    const rawStudent = student || {
      id: 'dummy-student-id',
      nama: 'John Doe',
      nis: '12345678',
      nisn: '0012345678',
      kelas: { nama: 'XII IPA 1' },
      foto: null 
    };

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

    // Calculate pixel sizes for Editor (scaled)
    const photoW = PHOTO_WIDTH_MM * MM_TO_PX * EDITOR_SCALE;
    const photoH = PHOTO_HEIGHT_MM * MM_TO_PX * EDITOR_SCALE;
    const qrW = QR_WIDTH_MM * MM_TO_PX * EDITOR_SCALE;
    const qrH = QR_HEIGHT_MM * MM_TO_PX * EDITOR_SCALE;

    return (
      <div className="flex justify-center items-center p-8 bg-slate-100 rounded-lg overflow-auto">
        <div 
          className="relative bg-white shadow-2xl overflow-hidden"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            borderColor: config.show_border ? config.border_color : config.primary_color,
            borderWidth: config.show_border ? `${(config.border_width || 1) * EDITOR_SCALE}px` : `${1 * EDITOR_SCALE}px`,
            borderStyle: config.show_border ? 'solid' : 'none',
            boxShadow: config.show_border ? 'none' : '0 25px 50px -12px rgb(0 0 0 / 0.25)' 
          }}
        >
          {/* Header */}
          <div 
            className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center justify-center py-4"
            style={{ 
                backgroundColor: config.header_bg_color || config.primary_color, 
                height: `${(config.header_height || 18) * MM_TO_PX * EDITOR_SCALE}px`,
                color: config.header_text_color || '#ffffff'
            }}
          >
            <div className="flex items-center gap-3 px-4 w-full justify-center">
              {/* Logo Placeholder */}
              {(config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url) ? (
                <img src={config.logo_url || (sekolah as any)?.logo_url || (sekolah as any)?.data?.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <img src="/logo.png" alt="Absenta Logo" className="w-10 h-10 object-contain" />
              )}
              <div className="text-center" style={{ color: 'inherit' }}>
                <h3 className="font-bold uppercase tracking-wider" style={{ fontSize: `${config.header_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.header_text}</h3>
                <h4 className="font-semibold" style={{ fontSize: `${config.subheader_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.subheader_text}</h4>
                <h2 className="font-bold leading-tight mt-1" style={{ fontSize: `${config.school_name_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.school_name || 'NAMA SEKOLAH'}</h2>
                <p className="opacity-90" style={{ fontSize: `${config.school_address_font_size * EDITOR_SCALE}pt`, lineHeight: 1.2 }}>{config.school_address || 'Alamat Sekolah'}</p>
              </div>
            </div>
          </div>

          {/* Card Title */}
          <div className="absolute top-[22%] w-full text-center">
             <h1 className="font-bold uppercase tracking-widest text-slate-800" style={{ color: config.primary_color, fontSize: `${config.card_title_font_size * EDITOR_SCALE}pt` }}>
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
            className="mt-0 space-y-2 text-slate-700 p-2 border border-transparent hover:border-dashed hover:border-slate-300 rounded transition-colors"
          >
            <div className="flex" style={{ fontSize: `${config.student_name_font_size * EDITOR_SCALE}pt` }}>
                <span className="w-24 font-semibold">Nama</span>
                <span>: {displayStudent.nama}</span>
            </div>
            <div className="flex" style={{ fontSize: `${config.student_details_font_size * EDITOR_SCALE}pt` }}>
                <span className="w-24 font-semibold">NIS/NISN</span>
                <span>: {displayStudent.nis} / {displayStudent.nisn}</span>
            </div>
            <div className="flex" style={{ fontSize: `${config.student_details_font_size * EDITOR_SCALE}pt` }}>
                <span className="w-24 font-semibold">Kelas</span>
                <span>: {displayStudent.kelas?.nama}</span>
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
              className="bg-slate-200 border-2 border-dashed border-slate-400 flex items-center justify-center text-xs text-slate-500 shadow-sm"
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
              className="bg-white shadow-sm flex items-center justify-center"
            >
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR" className="w-full h-full" draggable={false} />}
            </motion.div>
          )}

          {/* Footer Decoration */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-4"
            style={{ backgroundColor: config.primary_color }}
          />
        </div>
      </div>
    );
};
