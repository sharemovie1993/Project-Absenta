import { z } from 'zod';
import { 
  type StudentCardConfig 
} from '@/components/academic/student-card/types';
import { PAPER_SIZES } from '@/components/academic/student-card/constants';

export const HCOORDS = {
    photo_width: 20, photo_height: 26, qrcode_width: 18, qrcode_height: 18,
    photo_x: 14,  photo_y: 170,
    data_x:  180, data_y:  190,
    qrcode_x: 465, qrcode_y: 200,
};

export const VCOORDS = {
    photo_width: 24, photo_height: 32, qrcode_width: 15, qrcode_height: 15,
    photo_x: 114, photo_y: 200,
    data_x:  14,  data_y:  420,
    qrcode_x: 270, qrcode_y: 420,
};

// Mirror layout (photo on the right, data on the left)
export const V2_HCOORDS = {
    photo_width: 20, photo_height: 26, qrcode_width: 18, qrcode_height: 18,
    photo_x: 490, photo_y: 170,
    data_x:  14,  data_y:  190,
    qrcode_x: 350, qrcode_y: 200,
};

// Centered layout with circular photo overlapping header (as in sample image)
export const V2_VCOORDS = {
    photo_width: 22, photo_height: 22, qrcode_width: 15, qrcode_height: 15,
    photo_x: 120, photo_y: 190,
    data_x:  14,  data_y:  420,
    qrcode_x: 270, qrcode_y: 480,
};

export interface CardPreset extends Partial<StudentCardConfig> {
  name: string;
}

export const CARD_PRESETS: CardPreset[] = [
    {
        name: 'Executive Pegawai (Slate & Gold)',
        template: 'horizontal',
        primary_color: '#0f172a', secondary_color: '#d97706',
        header_bg_color: '#0f172a', header_text_color: '#fbbf24',
        header_style: 'gradient', footer_style: 'solid',
        card_pattern: 'mesh', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        show_border: true, border_color: '#94a3b8', border_width: 1,
        card_title: 'KARTU PEGAWAI',
        ...HCOORDS,
    },
    {
        name: 'Executive Guru (Midnight Indigo)',
        template: 'vertical',
        primary_color: '#1e1b4b', secondary_color: '#38bdf8',
        header_bg_color: '#312e81', header_text_color: '#ffffff',
        header_style: 'double-wave', footer_style: 'accent-line',
        card_pattern: 'dots-grid', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        photo_shape: 'circle',
        header_height: 38,
        card_title: 'KARTU PEGAWAI',
        ...V2_VCOORDS,
    },
    {
        name: 'Modern Staf (Emerald Corporate)',
        template: 'horizontal',
        primary_color: '#064e3b', secondary_color: '#10b981',
        header_bg_color: '#065f46', header_text_color: '#ffffff',
        header_style: 'slanted', footer_style: 'gradient',
        card_pattern: 'diagonal-stripe', card_pattern_opacity: 70,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'KARTU PEGAWAI',
        ...V2_HCOORDS,
    },
    {
        name: 'Horizontal - Versi 1 (Siswa)',
        template: 'horizontal',
        primary_color: '#2563eb', secondary_color: '#ffffff',
        header_bg_color: '#1e3a8a', header_text_color: '#ffffff',
        header_style: 'solid', footer_style: 'solid',
        card_pattern: 'arc-overlay', card_pattern_opacity: 80,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'KARTU PELAJAR',
        ...HCOORDS,
    },
    {
        name: 'Horizontal - Versi 2 (Mirrored Siswa)',
        template: 'horizontal',
        primary_color: '#7c3aed', secondary_color: '#faf5ff',
        header_bg_color: '#4c1d95', header_text_color: '#ffffff',
        header_style: 'slanted', footer_style: 'gradient',
        card_pattern: 'diagonal-stripe', card_pattern_opacity: 70,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'KARTU PELAJAR',
        ...V2_HCOORDS,
    },
    {
        name: 'Vertical - Versi 1 (Siswa)',
        template: 'vertical',
        primary_color: '#2563eb', secondary_color: '#ffffff',
        header_bg_color: '#1e3a8a', header_text_color: '#ffffff',
        header_style: 'solid', footer_style: 'solid',
        card_pattern: 'gradient-radial', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        photo_shape: 'square',
        card_title: 'STUDENT PASS',
        ...VCOORDS,
    },
    {
        name: 'Vertical - Versi 2 (Centered Circle Siswa)',
        template: 'vertical',
        primary_color: '#0284c7', secondary_color: '#ffffff',
        header_bg_color: '#0369a1', header_text_color: '#ffffff',
        header_style: 'double-wave', footer_style: 'accent-line',
        card_pattern: 'solid', card_pattern_opacity: 100,
        show_photo: true, show_qrcode: true,
        photo_shape: 'circle',
        header_height: 38,
        card_title: 'KARTU PELAJAR',
        ...V2_VCOORDS,
    },
];

export const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

export interface SekolahProfileData {
    data?: {
        name?: string;
        nama?: string;
        address?: string;
        alamat?: string;
        logo_url?: string;
        kepala_sekolah?: string;
        nip_kepala?: string;
    };
    name?: string;
    nama?: string;
    address?: string;
    alamat?: string;
    logo_url?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
}

export interface TenantInfoData {
    name?: string;
    address?: string;
    logo_url?: string;
    nama_dinas_atas?: string;
    nama_dinas_bawah?: string;
}

export const cardConfigSchema = z.object({
    school_name: z.string().min(1, 'Nama sekolah tidak boleh kosong'),
    school_address: z.string().min(1, 'Alamat sekolah tidak boleh kosong'),
    header_text: z.string().optional().nullable(),
    subheader_text: z.string().optional().nullable(),
    card_title: z.string().optional().nullable(),
    back_signature_title: z.string().optional().nullable(),
    back_principal_name: z.string().optional().nullable(),
    back_principal_nip: z.string().optional().nullable(),
});

export interface PrintLayoutResult {
    finalW: number;
    finalH: number;
    cardW: number;
    cardH: number;
    cols: number;
    rows: number;
    itemsPerPage: number;
    effectiveMarginLeft: number;
    effectiveMarginTop: number;
}

export const calculatePrintLayout = (
    printConfig: any, 
    template: 'horizontal' | 'vertical'
): PrintLayoutResult => {
    const paperW = printConfig.paperSize === 'Custom' ? (printConfig.customWidth || 210) : PAPER_SIZES[printConfig.paperSize].width;
    const paperH = printConfig.paperSize === 'Custom' ? (printConfig.customHeight || 297) : PAPER_SIZES[printConfig.paperSize].height;

    const baseW = Math.min(paperW, paperH);
    const baseH = Math.max(paperW, paperH);

    const finalW = printConfig.orientation === 'portrait' ? baseW : baseH;
    const finalH = printConfig.orientation === 'portrait' ? baseH : baseW;

    const cardW = template === 'vertical' ? 54 : 85.6;
    const cardH = template === 'vertical' ? 85.6 : 54;

    const availW = finalW - printConfig.marginLeft - printConfig.marginRight;
    const availH = finalH - printConfig.marginTop - printConfig.marginBottom;

    const cols = Math.max(1, Math.floor((availW + printConfig.gapX) / (cardW + printConfig.gapX)));
    const rows = Math.max(1, Math.floor((availH + printConfig.gapY) / (cardH + printConfig.gapY)));

    const contentW = cols * cardW + (cols - 1) * printConfig.gapX;
    const contentH = rows * cardH + (rows - 1) * printConfig.gapY;

    let effectiveMarginLeft = printConfig.marginLeft;
    let effectiveMarginTop = printConfig.marginTop;

    if (printConfig.autoCenterX) {
        effectiveMarginLeft = (finalW - contentW) / 2;
    }

    if (printConfig.autoCenterY) {
        effectiveMarginTop = (finalH - contentH) / 2;
    }

    const itemsPerPage = cols * rows;

    return { finalW, finalH, cardW, cardH, cols, rows, itemsPerPage, effectiveMarginLeft, effectiveMarginTop };
};
