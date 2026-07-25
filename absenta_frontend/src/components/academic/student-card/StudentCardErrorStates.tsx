import React from 'react';
import { Shield, Settings } from 'lucide-react';
import { SectionCard, Button } from '@/components/ui';

interface AccessRestrictedProps {
    onBack: () => void;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-700">
            <SectionCard className="max-w-md w-full p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center mx-auto shadow-xl shadow-rose-500/20">
                    <Shield className="w-10 h-10 text-rose-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Akses Terbatas</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Anda tidak memiliki izin otorisasi untuk mengelola sistem Kartu Pelajar.
                    </p>
                </div>
                <Button onClick={onBack} variant="toolbarOutline" className="h-12 w-full rounded-xl font-black uppercase tracking-widest text-[10px]">
                    Kembali ke Dashboard
                </Button>
            </SectionCard>
        </div>
    );
};

interface ConfigErrorStateProps {
    onBack: () => void;
}

export const ConfigErrorState: React.FC<ConfigErrorStateProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">Akses Ditolak</h1>
                <p className="text-slate-600 mb-6">
                    Anda tidak memiliki izin untuk mengakses halaman Kartu Pelajar.
                    Silakan hubungi Administrator jika Anda memerlukan akses ini.
                </p>
                <Button onClick={onBack} variant="outline">
                    Kembali
                </Button>
            </div>
        </div>
    );
};
