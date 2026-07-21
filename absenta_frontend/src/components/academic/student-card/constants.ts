import type { StudentCardConfig, PrintConfig } from './types';

export const MM_TO_PX = 3.78;
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 54;
export const EDITOR_SCALE = 2; // 2x size for easier editing

export const DEFAULT_CONFIG: StudentCardConfig = {
  template: 'vertical',
  card_title: 'KARTU PELAJAR',
  header_text: 'PEMERINTAH KABUPATEN',
  subheader_text: 'DINAS PENDIDIKAN',
  primary_color: '#2563eb',
  secondary_color: '#ffffff',
  show_photo: true,
  show_qrcode: true,
  photo_x: 114,
  photo_y: 200,
  photo_scale: 1,
  qrcode_x: 270,
  qrcode_y: 420,
  qrcode_scale: 1,
  logo_url: '',
  
  // Element Dimensions (mm)
  photo_width: 24,
  photo_height: 32,
  qrcode_width: 15,
  qrcode_height: 15,
  
  // Card Dimensions (mm)
  card_width: 85.6,
  card_height: 54,

  // Header & Footer
  header_height: 18,
  header_bg_color: '',
  header_text_color: '#ffffff',
  header_style: 'solid',
  footer_height: 5,
  footer_bg_color: '',
  footer_style: 'solid',

  // Border Defaults
  show_border: false,
  border_color: '#000000',
  border_width: 1,
  
  // Font Sizes Defaults
  header_font_size: 10,
  subheader_font_size: 8,
  school_name_font_size: 12,
  school_address_font_size: 8,
  card_title_font_size: 14,
  student_name_font_size: 10,
  student_details_font_size: 8,

  // Data block position
  data_x: 14,
  data_y: 420,

  // Pattern
  card_pattern: 'solid',
  card_pattern_opacity: 100,
};

export const DEFAULT_GURU_CONFIG: StudentCardConfig = {
  ...DEFAULT_CONFIG,
  template: 'horizontal',
  card_title: 'KARTU PEGAWAI',
  primary_color: '#0f172a',
  secondary_color: '#0284c7',
  header_bg_color: '#0f172a',
  header_text_color: '#ffffff',
  header_style: 'gradient',
  photo_x: 14,
  photo_y: 170,
  data_x: 180,
  data_y: 190,
  qrcode_x: 497,
  qrcode_y: 200,
  photo_shape: 'square',
  show_border: true,
  border_color: '#cbd5e1',
  border_width: 1,
  card_pattern: 'dots-grid',
  card_pattern_opacity: 60,
};

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
    paperSize: 'A4',
    orientation: 'portrait',
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    gapX: 5,
    gapY: 5,
    autoCenterX: false,
    autoCenterY: false
};

export const PAPER_SIZES = {
    A4: { width: 210, height: 297 },
    F4: { width: 210, height: 330 },
    RFID: { width: 85.6, height: 54 },
    Custom: { width: 210, height: 297 }
};
