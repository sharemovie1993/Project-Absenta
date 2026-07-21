/**
 * Smart Physical Unit Calculator Engine for Absenta Student & Staff Cards.
 * Converts physical units (mm, pt) to standard screen pixels (DPI 96).
 * Standard: 1 inch = 25.4 mm = 96 px = 72 pt.
 */

export const MM_TO_PX = 3.779527559; // 96 / 25.4
export const PT_TO_PX = 1.333333333; // 96 / 72

export interface CardDimensions {
    widthMm: number;
    heightMm: number;
    cardWidthPx: number;
    cardHeightPx: number;
    logoSizePx: number;
    photoWidthPx: number;
    photoHeightPx: number;
    qrWidthPx: number;
    qrHeightPx: number;
    headerFontSizePx: number;
    subheaderFontSizePx: number;
    schoolNameFontSizePx: number;
    schoolAddressFontSizePx: number;
    cardTitleFontSizePx: number;
    studentNameFontSizePx: number;
    studentDetailsFontSizePx: number;
}

export function computeSmartCardDimensions(config: any): CardDimensions {
    const isVertical = config.template === 'vertical';
    const rawCardW = config.card_width || 85.6;
    const rawCardH = config.card_height || 54;
    const widthMm = isVertical ? rawCardH : rawCardW;
    const heightMm = isVertical ? rawCardW : rawCardH;

    // Convert logo_size (stored in points/mm scale) to physical mm: 24pt = 8.46mm
    const logoMm = (config.logo_size || 24) * (25.4 / 72);

    const isCenteredCircle = isVertical && config.photo_shape === 'circle';
    const qrMmW = isCenteredCircle ? 15 : (config.qrcode_width || 20);
    const qrMmH = isCenteredCircle ? 15 : (config.qrcode_height || 20);

    return {
        widthMm,
        heightMm,
        cardWidthPx: widthMm * MM_TO_PX,
        cardHeightPx: heightMm * MM_TO_PX,
        logoSizePx: logoMm * MM_TO_PX,
        photoWidthPx: (config.photo_width || 24) * MM_TO_PX,
        photoHeightPx: (config.photo_height || 32) * MM_TO_PX,
        qrWidthPx: qrMmW * MM_TO_PX,
        qrHeightPx: qrMmH * MM_TO_PX,
        headerFontSizePx: (config.header_font_size || 10) * PT_TO_PX,
        subheaderFontSizePx: (config.subheader_font_size || 8) * PT_TO_PX,
        schoolNameFontSizePx: (config.school_name_font_size || 12) * PT_TO_PX,
        schoolAddressFontSizePx: (config.school_address_font_size || 8) * PT_TO_PX,
        cardTitleFontSizePx: (config.card_title_font_size || 14) * PT_TO_PX,
        studentNameFontSizePx: (config.student_name_font_size || 10) * PT_TO_PX,
        studentDetailsFontSizePx: (config.student_details_font_size || 8) * PT_TO_PX,
    };
}
