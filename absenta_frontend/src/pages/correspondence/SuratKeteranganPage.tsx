import React from 'react';
import { SuratKeteranganView } from '@/components/correspondence/surat-keterangan/SuratKeteranganView';

export const SuratKeteranganPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <SuratKeteranganView />
    </div>
  );
};

export default SuratKeteranganPage;
