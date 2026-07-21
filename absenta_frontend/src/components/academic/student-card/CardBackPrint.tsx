import React from 'react';
import type { StudentCardConfig } from './types';

interface CardBackPrintProps {
    config: StudentCardConfig;
}

export const CardBackPrint: React.FC<CardBackPrintProps> = ({ config }) => {
    const isVertical = config.template === 'vertical';
    const cardW = isVertical ? 54 : 85.6;
    const cardH = isVertical ? 85.6 : 54;

    const bgClr = config.back_bg_color || '#ffffff';
    const textClr = config.back_text_color || '#1e293b';
    const accentClr = config.primary_color || '#2563eb';

    // Parse rules
    const rules = (config.back_rules || '')
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);

    return (
        <div
            style={{
                width: `${cardW}mm`,
                height: `${cardH}mm`,
                backgroundColor: bgClr,
                color: textClr,
                borderColor: config.show_border ? config.border_color || '#e2e8f0' : 'transparent',
                borderWidth: config.show_border ? `${config.border_width || 1}px` : '0px',
                borderStyle: 'solid',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box',
                fontFamily: "'Outfit', 'Inter', sans-serif"
            }}
            className="rounded-2xl select-none print:shadow-none"
        >
            {/* Header Accent Line */}
            <div 
                style={{ 
                    height: '2mm', 
                    backgroundColor: accentClr,
                    width: '100%'
                }} 
            />

            {/* Content Area */}
            <div 
                className="flex flex-col h-full justify-between" 
                style={{ 
                    padding: '3mm 4mm 4mm 4mm',
                    boxSizing: 'border-box',
                    height: 'calc(100% - 2mm)'
                }}
            >
                {/* Rules Section */}
                <div className="flex-1">
                    <h4 
                        style={{ 
                            fontSize: isVertical ? '6.5pt' : '7.5pt',
                            color: accentClr,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            textAlign: 'center',
                            marginBottom: '2mm',
                            textTransform: 'uppercase'
                        }}
                    >
                        {config.back_header_text || 'TATA TERTIB KARTU'}
                    </h4>
                    
                    <ul 
                        style={{ 
                            fontSize: isVertical ? '5.5pt' : '6.5pt', 
                            lineHeight: 1.3,
                            color: textClr,
                            listStyleType: 'none',
                            padding: 0,
                            margin: 0
                        }}
                        className="space-y-1"
                    >
                        {rules.map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                                <span style={{ color: accentClr, fontWeight: 'bold' }}>•</span>
                                <span style={{ fontSize: isVertical ? '5.5pt' : '6.5pt' }} className="leading-relaxed">{rule}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Signature Block */}
                {config.back_show_signature && (
                    <div 
                        className="flex flex-col items-end relative"
                        style={{ 
                            marginTop: '2mm',
                            minHeight: '12mm'
                        }}
                    >
                        {/* Stamp Image (Overlapped underneath signature) */}
                        {config.back_stamp_image_url && (
                            <img 
                                src={config.back_stamp_image_url} 
                                alt="Stempel"
                                style={{
                                    position: 'absolute',
                                    right: '8mm',
                                    bottom: '1mm',
                                    width: '14mm',
                                    height: '14mm',
                                    opacity: 0.75,
                                    zIndex: 10,
                                    pointerEvents: 'none',
                                    objectFit: 'contain'
                                }}
                            />
                        )}

                        {/* Signature Image */}
                        {config.back_signature_image_url && (
                            <img 
                                src={config.back_signature_image_url} 
                                alt="Tanda Tangan"
                                style={{
                                    position: 'absolute',
                                    right: '2mm',
                                    bottom: '2mm',
                                    width: '12mm',
                                    height: '8mm',
                                    zIndex: 15,
                                    pointerEvents: 'none',
                                    objectFit: 'contain'
                                }}
                            />
                        )}

                        {/* Text Details */}
                        <div style={{ fontSize: '5pt', zIndex: 20 }} className="text-right leading-tight">
                            <div>{config.back_signature_title || 'Kepala Sekolah'}</div>
                            <div style={{ height: '6mm' }} /> {/* Spacer for signature image */}
                            <div className="font-bold underline">{config.back_principal_name || 'Nama Kepala Sekolah'}</div>
                            <div style={{ fontSize: '4pt' }} className="text-slate-400">{config.back_principal_nip || '-'}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
