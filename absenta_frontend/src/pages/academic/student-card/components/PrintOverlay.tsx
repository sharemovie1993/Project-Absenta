import React from 'react';
import { createPortal } from 'react-dom';
import { PrintableCard } from '@/components/academic/student-card/PrintableCard';
import type { StudentCardConfig, PrintConfig } from '@/components/academic/student-card/types';

interface PrintOverlayProps {
    isPrinting: boolean;
    pages: any[][];
    printLayout: any;
    printConfig: PrintConfig;
    config: StudentCardConfig;
    sekolah: any;
}

export const PrintOverlay: React.FC<PrintOverlayProps> = ({
    isPrinting,
    pages,
    printLayout,
    printConfig,
    config,
    sekolah
}) => {
    if (!isPrinting) return null;

    return createPortal(
        <>
            <style>
                {`
                @media print {
                    @page {
                        size: ${printConfig.paperSize === 'RFID' 
                            ? (printConfig.orientation === 'portrait' ? '54mm 85.6mm portrait' : '85.6mm 54mm landscape') 
                            : (printConfig.paperSize === 'Custom' ? 'auto' : printConfig.paperSize)} ${printConfig.paperSize === 'RFID' ? '' : printConfig.orientation};
                        margin: 0;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                    }
                    body > * {
                        display: none !important;
                    }
                    body > #print-card-overlay-portal {
                        display: block !important;
                        position: fixed !important;
                        inset: 0 !important;
                        background: white !important;
                        z-index: 99999 !important;
                    }
                }
                `}
            </style>

            <div id="print-card-overlay-portal" className="fixed inset-0 bg-white z-[9999] print:block hidden">
                {pages.map((pageStudents, pageIdx) => (
                    <div
                        key={pageIdx}
                        className="relative w-full h-full"
                        style={{
                            width: `${printLayout.finalW}mm`,
                            height: `${printLayout.finalH}mm`,
                            pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto'
                        }}
                    >
                        {pageStudents.map((student: any, idx: number) => {
                            const col = idx % printLayout.cols;
                            const row = Math.floor(idx / printLayout.cols);
                            const left = printLayout.effectiveMarginLeft + col * (printLayout.cardW + printConfig.gapX);
                            const top = printLayout.effectiveMarginTop + row * (printLayout.cardH + printConfig.gapY);

                            return (
                                <div
                                    key={student.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${left}mm`,
                                        top: `${top}mm`,
                                        width: `${printLayout.cardW}mm`,
                                        height: `${printLayout.cardH}mm`
                                    }}
                                >
                                    <PrintableCard student={student} config={config} sekolah={sekolah} />
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </>,
        document.body
    );
};
