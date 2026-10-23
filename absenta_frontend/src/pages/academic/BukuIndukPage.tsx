import React from 'react';
import { BukuIndukView } from '@/components/academic/buku-induk/BukuIndukView';

export const BukuIndukPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Buku Induk &amp; Buku Klapper
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rekam jejak 360° data peserta didik untuk Tata Usaha
        </p>
      </div>
      <BukuIndukView />
    </div>
  );
};

export default BukuIndukPage;
