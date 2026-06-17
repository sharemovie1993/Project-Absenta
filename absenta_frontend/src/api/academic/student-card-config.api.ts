import { requestWithFallback } from '../apiUtils';

export interface StudentCardConfig {
  id?: string;
  template: 'vertical' | 'horizontal';
  card_title: string;
  header_text?: string;
  subheader_text?: string;
  school_name?: string;
  school_address?: string;
  
  // Font Sizes
  header_font_size: number;
  subheader_font_size: number;
  school_name_font_size: number;
  school_address_font_size: number;
  card_title_font_size: number;
  student_name_font_size: number;
  student_details_font_size: number;

  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  show_photo: boolean;
  show_qrcode: boolean;
  photo_x: number;
  photo_y: number;
  photo_scale: number;
  qrcode_x: number;
  qrcode_y: number;
  qrcode_scale: number;

  data_x?: number;
  data_y?: number;
  
  // Element Dimensions (mm)
  photo_width?: number;
  photo_height?: number;
  qrcode_width?: number;
  qrcode_height?: number;

  // Card Dimensions (mm)
  card_width?: number;
  card_height?: number;

  // Header & Footer Config
  header_height?: number;
  header_bg_color?: string;
  header_text_color?: string;
  footer_height?: number;
  footer_bg_color?: string;

  // Border Config
  show_border?: boolean;
  border_color?: string;
  border_width?: number;

  // Print Config (Optional in frontend interface as they are often handled separately, but useful for saving)
  print_paper_size?: string;
  print_orientation?: string;
  print_mode?: string;
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

export const studentCardConfigApi = {
  getConfig: async () => {
    return requestWithFallback<StudentCardConfig>('get', '/academic/student-card-config', { unwrapData: true });
  },
  
  updateConfig: async (data: StudentCardConfig) => {
    return requestWithFallback<StudentCardConfig>('put', '/academic/student-card-config', { data, unwrapData: true });
  },
};
