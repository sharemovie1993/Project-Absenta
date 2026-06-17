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
  photo_x: 0,
  photo_y: 0,
  photo_scale: 1,
  qrcode_x: 0,
  qrcode_y: 0,
  qrcode_scale: 1,
  logo_url: '',
  
  // Element Dimensions (mm)
  photo_width: 24,
  photo_height: 32,
  qrcode_width: 20,
  qrcode_height: 20,
  
  // Card Dimensions (mm)
  card_width: 85.6,
  card_height: 54,

  // Header & Footer
  header_height: 18,
  header_bg_color: '',
  header_text_color: '#ffffff',
  footer_height: 5,
  footer_bg_color: '',

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
    Custom: { width: 210, height: 297 }
};
