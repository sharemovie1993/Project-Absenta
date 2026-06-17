import { prisma } from '../../../../utils/prisma';

export class StudentCardConfigService {
  async getConfig(tenantId: string) {
    const config = await prisma.studentCardConfig.findUnique({
      where: { tenant_id: tenantId },
    });
    
    if (!config) {
      // Return defaults if not found, but don't save yet to avoid junk data
      return {
        template: 'vertical',
        card_title: 'KARTU PELAJAR',
        header_text: '',
        subheader_text: '',
        school_name: '', // Will be filled by Sekolah profile if empty in frontend
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
        
        data_x: 0,
        data_y: 0,

        logo_url: '',
        
        // Element Dimensions (mm)
        photo_width: 24,
        photo_height: 32,
        qrcode_width: 20,
        qrcode_height: 20,

        // Card Dimensions (mm)
        card_width: 85.6,
        card_height: 54,

        // Border Config
        show_border: false,
        border_color: '#000000',
        border_width: 1,

        // Default Print Config
        print_paper_size: 'A4',
        print_orientation: 'portrait',
        print_mode: 'multi',
        print_margin_top: 10,
        print_margin_bottom: 10,
        print_margin_left: 10,
        print_margin_right: 10,
        print_gap_x: 5,
        print_gap_y: 5,
        print_auto_center_x: false,
        print_auto_center_y: false
      };
    }
    
    return config;
  }

  async upsertConfig(tenantId: string, data: any) {
    // Remove fields that shouldn't be updated directly or don't exist in schema
    // Now school_name and school_address are valid fields
    const { id, tenant_id, created_at, updated_at, Tenant, ...updateData } = data;
    
    // Ensure numeric fields are floats
    if (updateData.photo_x) updateData.photo_x = parseFloat(updateData.photo_x);
    if (updateData.photo_y) updateData.photo_y = parseFloat(updateData.photo_y);
    if (updateData.photo_scale) updateData.photo_scale = parseFloat(updateData.photo_scale);
    if (updateData.qrcode_x) updateData.qrcode_x = parseFloat(updateData.qrcode_x);
    if (updateData.qrcode_y) updateData.qrcode_y = parseFloat(updateData.qrcode_y);
    if (updateData.qrcode_scale) updateData.qrcode_scale = parseFloat(updateData.qrcode_scale);

    if (updateData.data_x) updateData.data_x = parseFloat(updateData.data_x);
    if (updateData.data_y) updateData.data_y = parseFloat(updateData.data_y);

    // Element Dimensions parsing
    if (updateData.photo_width) updateData.photo_width = parseFloat(updateData.photo_width);
    if (updateData.photo_height) updateData.photo_height = parseFloat(updateData.photo_height);
    if (updateData.qrcode_width) updateData.qrcode_width = parseFloat(updateData.qrcode_width);
    if (updateData.qrcode_height) updateData.qrcode_height = parseFloat(updateData.qrcode_height);
    
    // Card Dimensions parsing
    if (updateData.card_width) updateData.card_width = parseFloat(updateData.card_width);
    if (updateData.card_height) updateData.card_height = parseFloat(updateData.card_height);

    // Header & Footer parsing
    if (updateData.header_height) updateData.header_height = parseFloat(updateData.header_height);
    if (updateData.footer_height) updateData.footer_height = parseFloat(updateData.footer_height);

    // Border Config
    if (updateData.border_width) updateData.border_width = parseFloat(updateData.border_width);

    // Font Sizes parsing
    if (updateData.header_font_size) updateData.header_font_size = parseFloat(updateData.header_font_size);
    if (updateData.subheader_font_size) updateData.subheader_font_size = parseFloat(updateData.subheader_font_size);
    if (updateData.school_name_font_size) updateData.school_name_font_size = parseFloat(updateData.school_name_font_size);
    if (updateData.school_address_font_size) updateData.school_address_font_size = parseFloat(updateData.school_address_font_size);
    if (updateData.card_title_font_size) updateData.card_title_font_size = parseFloat(updateData.card_title_font_size);
    if (updateData.student_name_font_size) updateData.student_name_font_size = parseFloat(updateData.student_name_font_size);
    if (updateData.student_details_font_size) updateData.student_details_font_size = parseFloat(updateData.student_details_font_size);

    // Print Config parsing
    if (updateData.print_margin_top) updateData.print_margin_top = parseFloat(updateData.print_margin_top);
    if (updateData.print_margin_bottom) updateData.print_margin_bottom = parseFloat(updateData.print_margin_bottom);
    if (updateData.print_margin_left) updateData.print_margin_left = parseFloat(updateData.print_margin_left);
    if (updateData.print_margin_right) updateData.print_margin_right = parseFloat(updateData.print_margin_right);
    if (updateData.print_gap_x) updateData.print_gap_x = parseFloat(updateData.print_gap_x);
    if (updateData.print_gap_y) updateData.print_gap_y = parseFloat(updateData.print_gap_y);
    if (updateData.print_custom_width) updateData.print_custom_width = parseFloat(updateData.print_custom_width);
    if (updateData.print_custom_height) updateData.print_custom_height = parseFloat(updateData.print_custom_height);

    return prisma.studentCardConfig.upsert({
      where: { tenant_id: tenantId },
      update: updateData,
      create: {
        ...updateData,
        tenant_id: tenantId,
      },
    });
  }
}

export const studentCardConfigService = new StudentCardConfigService();
