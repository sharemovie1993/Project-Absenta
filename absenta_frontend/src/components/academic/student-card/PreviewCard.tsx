import React from 'react';
import { PanInfo } from 'framer-motion';
import type { StudentCardConfig } from './types';
import { Siswa } from '../../../types/academic';
import { PrintableCard } from './PrintableCard';

interface PreviewCardProps {
    student?: Partial<Siswa> & { 
        nama?: string; 
        nama_siswa?: string;
        kelas?: { nama?: string; nama_kelas?: string }; 
        foto?: string | null;
    };
    config: StudentCardConfig;
    sekolah?: any;
    onDragEnd: (field: 'photo' | 'qrcode' | 'data' | 'header' | 'title', info: PanInfo) => void;
}

export const PreviewCard: React.FC<PreviewCardProps> = React.memo(({ 
    student, 
    config, 
    sekolah,
    onDragEnd
}) => {
    return (
        <div className="flex justify-center items-center p-8 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-auto">
            <div className="shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">
                <PrintableCard
                    student={student || {}}
                    config={config}
                    sekolah={sekolah}
                    isInteractive={true}
                    onDragEnd={onDragEnd}
                />
            </div>
        </div>
    );
});

PreviewCard.displayName = 'PreviewCard';
