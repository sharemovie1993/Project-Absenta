import { z } from 'zod';

export const assignWaliKelasStrukturSchema = z.object({
  kelas_id: z.string({
    required_error: 'kelas_id wajib diisi'
  }).uuid({ message: 'kelas_id harus berupa UUID yang valid' }),
  guru_id: z.string({
    required_error: 'guru_id wajib diisi'
  }).uuid({ message: 'guru_id harus berupa UUID yang valid' })
});

export const kenaikanKelasSchema = z.object({
  tahun_sumber_id: z.string({
    required_error: 'tahun_sumber_id wajib diisi'
  }).uuid({ message: 'tahun_sumber_id harus berupa UUID yang valid' }),
  tahun_target_id: z.string({
    required_error: 'tahun_target_id wajib diisi'
  }).uuid({ message: 'tahun_target_id harus berupa UUID yang valid' }),
  mapping: z.array(
    z.object({
      sumber_kelas_id: z.string({
        required_error: 'sumber_kelas_id wajib diisi'
      }).uuid({ message: 'sumber_kelas_id harus berupa UUID yang valid' }),
      target_kelas_id: z.string({
        required_error: 'target_kelas_id wajib diisi'
      }).uuid({ message: 'target_kelas_id harus berupa UUID yang valid' })
    })
  )
});

export const createStrukturSchema = z.object({
  kode: z.string({
    required_error: 'kode wajib diisi'
  }).min(1, 'kode tidak boleh kosong').max(50, 'kode maksimal 50 karakter'),
  nama: z.string({
    required_error: 'nama wajib diisi'
  }).min(1, 'nama tidak boleh kosong').max(100, 'nama maksimal 100 karakter'),
  deskripsi: z.string().max(255, 'deskripsi maksimal 255 karakter').nullable().optional().transform(v => v === null ? undefined : v),
  scope: z.string({
    required_error: 'scope wajib diisi'
  }).min(1, 'scope tidak boleh kosong'),
  kelas_id: z.string().uuid({ message: 'kelas_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v)
});

export const updateStrukturSchema = z.object({
  kode: z.string().min(1, 'kode tidak boleh kosong').max(50, 'kode maksimal 50 karakter').optional(),
  nama: z.string().min(1, 'nama tidak boleh kosong').max(100, 'nama maksimal 100 karakter').optional(),
  deskripsi: z.string().max(255, 'deskripsi maksimal 255 karakter').nullable().optional().transform(v => v === null ? undefined : v),
  scope: z.string().min(1, 'scope tidak boleh kosong').optional(),
  kelas_id: z.string().uuid({ message: 'kelas_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  is_active: z.boolean().optional()
});

export const assignGuruSchema = z.object({
  guru_id: z.string({
    required_error: 'guru_id wajib diisi'
  }).uuid({ message: 'guru_id harus berupa UUID yang valid' }),
  start_date: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date()).optional(),
  end_date: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date().nullable().optional().transform(v => v === null ? undefined : v)),
  kelas_id: z.string().uuid({ message: 'kelas_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  unit_id: z.string().uuid({ message: 'unit_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  jenis_kegiatan_id: z.string().uuid({ message: 'jenis_kegiatan_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v)
});

export const assignSiswaSchema = z.object({
  siswa_id: z.string({
    required_error: 'siswa_id wajib diisi'
  }).uuid({ message: 'siswa_id harus berupa UUID yang valid' }),
  kelas_id: z.string().uuid({ message: 'kelas_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v),
  start_date: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date()).optional(),
  end_date: z.preprocess((val) => {
    if (!val) return undefined;
    return new Date(String(val));
  }, z.date().nullable().optional().transform(v => v === null ? undefined : v)),
  unit_id: z.string().uuid({ message: 'unit_id harus berupa UUID yang valid' }).nullable().optional().transform(v => v === null ? undefined : v)
});

export const upsertStudentCardConfigSchema = z.object({
  template: z.string().optional(),
  selected_preset: z.string().nullable().optional(),
  layout_presets: z.string().nullable().optional(),
  card_title: z.string().optional(),
  header_text: z.string().nullable().optional(),
  subheader_text: z.string().nullable().optional(),
  school_name: z.string().nullable().optional(),
  school_address: z.string().nullable().optional(),
  show_back_side: z.boolean().optional(),
  back_bg_color: z.string().optional(),
  back_text_color: z.string().optional(),
  back_header_text: z.string().nullable().optional(),
  back_rules: z.string().nullable().optional(),
  back_show_signature: z.boolean().optional(),
  back_signature_title: z.string().nullable().optional(),
  back_principal_name: z.string().nullable().optional(),
  back_principal_nip: z.string().nullable().optional(),
  back_signature_image_url: z.string().nullable().optional(),
  back_stamp_image_url: z.string().nullable().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  show_photo: z.boolean().optional(),
  photo_shape: z.string().optional(),
  show_qrcode: z.boolean().optional(),
  photo_x: z.coerce.number().optional(),
  photo_y: z.coerce.number().optional(),
  photo_scale: z.coerce.number().optional(),
  qrcode_x: z.coerce.number().optional(),
  qrcode_y: z.coerce.number().optional(),
  qrcode_scale: z.coerce.number().optional(),
  data_x: z.coerce.number().optional(),
  data_y: z.coerce.number().optional(),
  logo_url: z.string().nullable().optional(),
  photo_width: z.coerce.number().optional(),
  photo_height: z.coerce.number().optional(),
  qrcode_width: z.coerce.number().optional(),
  qrcode_height: z.coerce.number().optional(),
  card_width: z.coerce.number().optional(),
  card_height: z.coerce.number().optional(),
  show_border: z.boolean().optional(),
  border_color: z.string().optional(),
  border_width: z.coerce.number().optional(),
  card_pattern: z.string().optional(),
  card_pattern_opacity: z.coerce.number().optional(),
  header_height: z.coerce.number().optional(),
  header_bg_color: z.string().nullable().optional(),
  header_text_color: z.string().optional(),
  header_style: z.string().optional(),
  header_pattern: z.string().optional(),
  header_pattern_opacity: z.coerce.number().optional(),
  footer_height: z.coerce.number().optional(),
  footer_bg_color: z.string().nullable().optional(),
  footer_style: z.string().optional(),
  header_font_size: z.coerce.number().optional(),
  subheader_font_size: z.coerce.number().optional(),
  school_name_font_size: z.coerce.number().optional(),
  school_address_font_size: z.coerce.number().optional(),
  card_title_font_size: z.coerce.number().optional(),
  student_name_font_size: z.coerce.number().optional(),
  student_details_font_size: z.coerce.number().optional(),
  print_paper_size: z.string().optional(),
  print_orientation: z.string().optional(),
  print_mode: z.string().optional(),
  print_margin_top: z.coerce.number().optional(),
  print_margin_bottom: z.coerce.number().optional(),
  print_margin_left: z.coerce.number().optional(),
  print_margin_right: z.coerce.number().optional(),
  print_gap_x: z.coerce.number().optional(),
  print_gap_y: z.coerce.number().optional(),
  print_custom_width: z.coerce.number().nullable().optional(),
  print_custom_height: z.coerce.number().nullable().optional(),
  print_auto_center_x: z.boolean().optional(),
  print_auto_center_y: z.boolean().optional()
});
