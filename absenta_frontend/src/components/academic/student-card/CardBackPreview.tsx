import React from 'react';
import type { StudentCardConfig } from './types';
import { EDITOR_SCALE, MM_TO_PX } from './constants';

interface CardBackPreviewProps {
    config: StudentCardConfig;
}

export const CardBackPreview: React.FC<CardBackPreviewProps> = ({ config }) => {
    const isVertical = config.template === 'vertical';
    const cWidth = config.card_width || 85.6;
    const cHeight = config.card_height || 54;

    const SCALE = MM_TO_PX * EDITOR_SCALE;
    const cardW = (isVertical ? cHeight : cWidth) * SCALE;
    const cardH = (isVertical ? cWidth : cHeight) * SCALE;

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
                width: `${cardW}px`,
                height: `${cardH}px`,
                backgroundColor: bgClr,
                color: textClr,
                borderColor: config.show_border ? config.border_color || '#e2e8f0' : 'transparent',
                borderWidth: config.show_border ? `${(config.border_width || 1) * EDITOR_SCALE}px` : '0px',
                borderStyle: 'solid',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box',
                fontFamily: "'Outfit', 'Inter', sans-serif"
            }}
            className="shadow-xl rounded-2xl select-none"
        >
            {/* Header Accent Line (2mm height) */}
            <div 
                style={{ 
                    height: `${2 * SCALE}px`, 
                    backgroundColor: accentClr,
                    width: '100%'
                }} 
            />

            {/* Content Area */}
            <div 
                className="flex flex-col h-full justify-between" 
                style={{ 
                    padding: `${3 * SCALE}px ${4 * SCALE}px ${4 * SCALE}px ${4 * SCALE}px`,
                    boxSizing: 'border-box',
                    height: `calc(100% - ${2 * SCALE}px)`
                }}
            >
                {/* Rules Section */}
                <div className="flex-1">
                    <h4 
                        style={{ 
                            fontSize: `${(isVertical ? 6.5 : 7.5) * EDITOR_SCALE}pt`,
                            color: accentClr,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            textAlign: 'center',
                            marginBottom: `${2 * SCALE}px`,
                            textTransform: 'uppercase'
                        }}
                    >
                        {config.back_header_text || 'TATA TERTIB KARTU'}
                    </h4>
                    
                    <ul 
                        style={{ 
                            fontSize: `${(isVertical ? 5.5 : 6.5) * EDITOR_SCALE}pt`, 
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
                                <span style={{ fontSize: `${(isVertical ? 5.5 : 6.5) * EDITOR_SCALE}pt` }} className="leading-relaxed">{rule}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Signature Block */}
                {config.back_show_signature && (
                    <div 
                        className="flex flex-col items-end relative text-right"
                        style={{ 
                            marginTop: `${2 * SCALE}px`,
                            minHeight: `${12 * SCALE}px`
                        }}
                    >
                        {/* Stamp Image (Overlapped underneath signature) */}
                        {config.back_stamp_image_url && (
                            <img 
                                src={config.back_stamp_image_url} 
                                alt="Stempel"
                                style={{
                                    position: 'absolute',
                                    right: `${8 * SCALE}px`,
                                    bottom: `${1 * SCALE}px`,
                                    width: `${14 * SCALE}px`,
                                    height: `${14 * SCALE}px`,
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
                                    right: `${2 * SCALE}px`,
                                    bottom: `${2 * SCALE}px`,
                                    width: `${12 * SCALE}px`,
                                    height: `${8 * SCALE}px`,
                                    zIndex: 15,
                                    pointerEvents: 'none',
                                    objectFit: 'contain'
                                }}
                            />
                        )}

                        {/* Text Details */}
                        <div style={{ fontSize: `${5 * EDITOR_SCALE}pt`, zIndex: 20 }} className="leading-tight">
                            <div>{config.back_signature_title || 'Kepala Sekolah'}</div>
                            <div style={{ height: `${6 * SCALE}px` }} /> {/* Spacer for signature image */}
                            <div className="font-bold underline">{config.back_principal_name || 'Nama Kepala Sekolah'}</div>
                            <div style={{ fontSize: `${4 * EDITOR_SCALE}pt` }} className="text-slate-400">{config.back_principal_nip || '-'}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
