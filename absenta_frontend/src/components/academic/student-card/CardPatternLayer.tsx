import React from 'react';
import type { StudentCardConfig } from './types';

interface CardPatternLayerProps {
    config: StudentCardConfig;
    /** width in px (editor) or mm (print) */
    width: number;
    height: number;
    scale?: number; // 1 for print, EDITOR_SCALE for preview
    isHeader?: boolean;
}

export const CardPatternLayer: React.FC<CardPatternLayerProps> = ({ config, width, height, scale = 1, isHeader = false }) => {
    const isMinimalHeader = isHeader && config.header_style === 'minimal';
    
    let p = isHeader 
        ? (isMinimalHeader ? (config.primary_color || '#2563eb') : (config.header_text_color || '#ffffff'))
        : (config.primary_color || '#2563eb');
    
    // Ensure p starts with #
    if (!p.startsWith('#')) {
        p = '#ffffff';
    }

    const s = config.secondary_color || '#ffffff';
    const pattern = isHeader ? (config.header_pattern || 'solid') : (config.card_pattern || 'solid');
    const opacity = isHeader 
        ? ((config.header_pattern_opacity ?? 20) / 100)
        : ((config.card_pattern_opacity ?? 100) / 100);

    const renderPattern = () => {
        switch (pattern) {
            case 'solid':
                return null;

            case 'gradient-diagonal':
                return (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `linear-gradient(135deg, ${p}22 0%, ${p}08 40%, transparent 60%, ${p}18 100%)`,
                            opacity
                        }}
                    />
                );

            case 'gradient-radial':
                return (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(ellipse at 80% 20%, ${p}30 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, ${p}20 0%, transparent 50%)`,
                            opacity
                        }}
                    />
                );

            case 'wave-bottom':
                return (
                    <svg
                        className="absolute bottom-0 left-0 w-full pointer-events-none"
                        style={{ opacity }}
                        viewBox="0 0 500 120"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M0,60 C80,120 160,0 260,60 C360,120 430,10 500,60 L500,120 L0,120 Z"
                            fill={p}
                            fillOpacity="0.15"
                        />
                        <path
                            d="M0,80 C100,30 200,110 300,70 C400,30 450,100 500,80 L500,120 L0,120 Z"
                            fill={p}
                            fillOpacity="0.10"
                        />
                    </svg>
                );

            case 'wave-top':
                return (
                    <svg
                        className="absolute top-0 left-0 w-full pointer-events-none"
                        style={{ opacity }}
                        viewBox="0 0 500 80"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M0,40 C100,80 200,0 300,40 C400,80 450,20 500,40 L500,0 L0,0 Z"
                            fill={p}
                            fillOpacity="0.12"
                        />
                    </svg>
                );

            case 'diagonal-stripe':
                return (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: `repeating-linear-gradient(
                                45deg,
                                ${p}12 0px,
                                ${p}12 2px,
                                transparent 2px,
                                transparent 16px
                            )`,
                            opacity
                        }}
                    />
                );

            case 'dots':
                return (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: `radial-gradient(circle, ${p}30 1px, transparent 1px)`,
                            backgroundSize: `${12 * scale}px ${12 * scale}px`,
                            opacity
                        }}
                    />
                );

            case 'circuit':
                return (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity: opacity * 0.15 }}
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern id="circuit-pat" width="60" height="60" patternUnits="userSpaceOnUse">
                                <rect width="60" height="60" fill="none" />
                                <path d="M10,10 L50,10 L50,30 M30,10 L30,50 M10,30 L50,30 M10,50 L50,50" stroke={p} strokeWidth="1.5" fill="none" />
                                <circle cx="10" cy="10" r="3" fill={p} />
                                <circle cx="50" cy="10" r="3" fill={p} />
                                <circle cx="30" cy="30" r="3" fill={p} />
                                <circle cx="10" cy="50" r="3" fill={p} />
                                <circle cx="50" cy="50" r="3" fill={p} />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#circuit-pat)" />
                    </svg>
                );

            case 'diamond':
                return (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity: opacity * 0.12 }}
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern id="diamond-pat" width="24" height="24" patternUnits="userSpaceOnUse">
                                <path d="M12,0 L24,12 L12,24 L0,12 Z" stroke={p} strokeWidth="1" fill="none" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#diamond-pat)" />
                    </svg>
                );

            case 'split-color':
                return (
                    <>
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: `linear-gradient(160deg, ${p}20 0%, ${p}20 45%, transparent 45%)`,
                                opacity
                            }}
                        />
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ opacity: opacity * 0.5 }}
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M0,45 L100,25 L100,28 L0,48 Z" fill={p} fillOpacity="0.2" />
                        </svg>
                    </>
                );

            case 'arc-overlay':
                return (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity }}
                        viewBox="0 0 200 120"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Large background arc */}
                        <ellipse cx="200" cy="0" rx="160" ry="130" fill={p} fillOpacity="0.08" />
                        {/* Medium decorative arc */}
                        <ellipse cx="0" cy="120" rx="120" ry="90" fill={p} fillOpacity="0.06" />
                        {/* Thin ring stroke */}
                        <ellipse cx="200" cy="10" rx="140" ry="110" fill="none" stroke={p} strokeWidth="1" strokeOpacity="0.12" />
                    </svg>
                );

            case 'hexagon':
                return (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity: opacity * 0.13 }}
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern id="hex-pat" width="28" height="32" patternUnits="userSpaceOnUse">
                                <polygon
                                    points="14,2 24,8 24,20 14,26 4,20 4,8"
                                    stroke={p}
                                    strokeWidth="1"
                                    fill="none"
                                />
                                <polygon
                                    points="28,18 38,24 38,36 28,42 18,36 18,24"
                                    stroke={p}
                                    strokeWidth="1"
                                    fill="none"
                                />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#hex-pat)" />
                    </svg>
                );

            default:
                return null;
        }
    };

    return <>{renderPattern()}</>;
};

CardPatternLayer.displayName = 'CardPatternLayer';
