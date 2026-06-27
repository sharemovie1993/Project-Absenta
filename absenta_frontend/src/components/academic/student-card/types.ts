export interface StudentCardConfig {
  id?: string;
  template: 'vertical' | 'horizontal';
  card_title: string;
  header_text?: string;
  subheader_text?: string;
  school_name?: string;
  school_address?: string;
  primary_color: string;
  secondary_color: string;
  card_pattern?: 'solid' | 'gradient-diagonal' | 'gradient-radial' | 'wave-bottom' | 'wave-top' | 'diagonal-stripe' | 'dots' | 'circuit' | 'diamond' | 'split-color' | 'arc-overlay' | 'hexagon';
  card_pattern_opacity?: number;
  show_photo: boolean;
  show_qrcode: boolean;
  photo_x: number;
  photo_y: number;
  photo_scale: number;
  qrcode_x: number;
  qrcode_y: number;
  qrcode_scale: number;
  logo_url?: string;
  
  // Element Dimensions (mm)
  photo_width: number;
  photo_height: number;
  qrcode_width: number;
  qrcode_height: number;
  
  // Card Dimensions (mm)
  card_width: number;
  card_height: number;

  // Header & Footer
  header_height: number;
  header_bg_color: string;
  header_text_color: string;
  header_style?: 'solid' | 'gradient' | 'glass' | 'wave' | 'slanted' | 'double-wave' | 'two-tone' | 'minimal';
  footer_height: number;
  footer_bg_color: string;
  footer_style?: 'solid' | 'gradient' | 'glass' | 'accent-line' | 'hidden';

  // Border Defaults
  show_border: boolean;
  border_color: string;
  border_width: number;
  
  // Font Sizes Defaults
  header_font_size: number;
  subheader_font_size: number;
  school_name_font_size: number;
  school_address_font_size: number;
  card_title_font_size: number;
  student_name_font_size: number;
  student_details_font_size: number;

  // Data Positioning
  data_x?: number;
  data_y?: number;

  // Print Settings
  print_paper_size?: string;
  print_orientation?: string;
  print_margin_top?: number;
  print_margin_bottom?: number;
  print_margin_left?: number;
  print_margin_right?: number;
  print_gap_x?: number;
  print_gap_y?: number;
  print_custom_width?: number;
  print_custom_height?: number;
  print_auto_center_x?: boolean;
  print_auto_center_y?: boolean;
}

export interface PrintConfig {
    paperSize: 'A4' | 'F4' | 'Custom';
    orientation: 'portrait' | 'landscape';
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    gapX: number;
    gapY: number;
    customWidth?: number;
    customHeight?: number;
    autoCenterX?: boolean;
    autoCenterY?: boolean;
}
