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
    const backStyle = config.back_style || 'default';

    // Parse rules
    const rules = (config.back_rules || '')
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);

    // Dynamic background style
    const getBackgroundStyle = () => {
        if (backStyle === 'split-gradient') {
            return {
                background: `linear-gradient(135deg, ${accentClr}1a 0%, ${bgClr} 100%)`
            };
        }
        return { backgroundColor: bgClr };
    };

    return (
        <div
            style={{
                width: `${cardW}mm`,
                height: `${cardH}mm`,
                ...getBackgroundStyle(),
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
            {/* VARIANT 1: Default Top Accent Line */}
            {backStyle === 'default' && (
                <div 
                    style={{ 
                        height: '2mm', 
                        backgroundColor: accentClr,
                        width: '100%'
                    }} 
                />
            )}

            {/* VARIANT 3: Full Header Bar */}
            {backStyle === 'full-header' && (
                <div 
                    style={{ 
                        backgroundColor: accentClr,
                        color: '#ffffff',
                        padding: '2mm 3mm',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2mm',
                        borderBottom: '0.5mm solid rgba(255,255,255,0.2)'
                    }}
                >
                    {config.logo_url ? (
                        <img 
                            src={config.logo_url} 
                            alt="Logo" 
                            style={{ 
                                width: '7mm', 
                                height: '7mm', 
                                objectFit: 'contain'
                            }} 
                        />
                    ) : (
                        <div style={{ width: '7mm', height: '7mm', backgroundColor: 'rgba(255,255,255,0.2)' }} className="rounded flex items-center justify-center text-[8px] font-bold">🏫</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '5.2pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {config.school_name || 'NAMA SEKOLAH'}
                        </div>
                        <div style={{ fontSize: '3.5pt', opacity: 0.85, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {config.school_address || 'Alamat Sekolah'}
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area Wrap */}
            <div 
                className="flex flex-col h-full justify-between relative" 
                style={{ 
                    padding: '3mm 4mm 2mm 4mm',
                    boxSizing: 'border-box',
                    height: backStyle === 'default' 
                        ? 'calc(100% - 2mm)' 
                        : (backStyle === 'full-header' ? 'calc(100% - 11mm)' : '100%')
                }}
            >
                {/* VARIANT 4: Accent Border overlay */}
                {backStyle === 'accent-border' && (
                    <div 
                        style={{
                            position: 'absolute',
                            inset: '1.5mm',
                            border: `0.5mm solid ${accentClr}44`,
                            borderRadius: '8px',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}
                    />
                )}

                {/* Rules Section */}
                <div className="flex-1 z-10">
                    <h4 
                        style={{ 
                            fontSize: isVertical ? '6.5pt' : '7.5pt',
                            color: backStyle === 'full-header' ? textClr : accentClr,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            textAlign: backStyle === 'minimal' ? 'center' : 'left',
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
                        className="flex flex-col items-end relative text-right z-10"
                        style={{ 
                            marginTop: '2mm',
                            minHeight: '10mm'
                        }}
                    >
                        {/* Stamp Image */}
                        {config.back_stamp_image_url && (
                            <img 
                                src={config.back_stamp_image_url} 
                                alt="Stempel"
                                style={{
                                    position: 'absolute',
                                    right: '7mm',
                                    bottom: '1mm',
                                    width: '11mm',
                                    height: '11mm',
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
                                    width: '9mm',
                                    height: '6mm',
                                    zIndex: 15,
                                    pointerEvents: 'none',
                                    objectFit: 'contain'
                                }}
                            />
                        )}

                        {/* Text Details */}
                        <div style={{ fontSize: '5pt', zIndex: 20 }} className="leading-tight">
                            <div>{config.back_signature_title || 'Kepala Sekolah'}</div>
                            <div style={{ height: '4mm' }} />
                            <div className="font-bold underline">{config.back_principal_name || 'Nama Kepala Sekolah'}</div>
                            <div style={{ fontSize: '4pt' }} className="text-slate-400">{config.back_principal_nip || '-'}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
