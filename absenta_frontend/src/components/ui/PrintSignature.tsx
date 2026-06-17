import React from 'react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

export interface PrintSignatureProps {
  role: 'principal' | 'mitra' | 'custom';
  kota?: string;
  date?: Date | string | null;
  name?: string;
  nip?: string;
  customLabel?: React.ReactNode;
  customSubLabel?: React.ReactNode;
  showDate?: boolean;
  widthClass?: string;
}

/**
 * PrintSignature - Komponen Tanda Tangan Resmi Terpusat Absenta
 * Mendukung format birokrasi Indonesia untuk perorangan, Kepala Sekolah, maupun Mitra HRD.
 */
export const PrintSignature: React.FC<PrintSignatureProps> = ({
  role,
  kota,
  date,
  name,
  nip,
  customLabel,
  customSubLabel,
  showDate = false,
  widthClass = 'w-[250px]'
}) => {
  const getActiveDate = () => {
    if (!date) return new Date();
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    return d;
  };
  const activeDate = getActiveDate();
  const formattedDate = format(activeDate, 'd MMMM yyyy', { locale: localeID });
  const displayKota = kota || 'Kota Absenta';

  if (role === 'principal') {
    return (
      <div className={`flex flex-col items-center text-center ${widthClass} print:text-black font-serif`}>
        {showDate && (
          <p className="text-[12px] text-gray-800 leading-tight mb-2">
            {displayKota}, {formattedDate}
          </p>
        )}
        <div className="text-[12px] font-bold leading-tight mb-24">
          {customLabel || 'Kepala Sekolah,'}
        </div>
        <p className="text-[12px] font-bold underline uppercase tracking-wide leading-none">
          {name || '........................................'}
        </p>
        {nip && (
          <p className="text-[10px] font-mono text-gray-700 mt-1.5 leading-none">
            NIP. {nip}
          </p>
        )}
      </div>
    );
  }

  if (role === 'mitra') {
    return (
      <div className={`flex flex-col items-center text-center ${widthClass} print:text-black font-serif`}>
        {showDate && (
          <p className="text-[12px] text-gray-800 leading-tight mb-2">
            {displayKota}, {formattedDate}
          </p>
        )}
        <div className="text-[12px] font-bold leading-tight mb-24">
          {customLabel || 'Pimpinan/HRD Perusahaan Mitra,'}
        </div>
        <p className="text-[12px] font-bold underline uppercase tracking-wide leading-none">
          {name || '( ........................................................ )'}
        </p>
        <p className="text-[10px] text-gray-650 mt-1.5 leading-none">
          {customSubLabel || 'Nama Lengkap & Stempel'}
        </p>
      </div>
    );
  }

  // Custom role fallback
  return (
    <div className={`flex flex-col items-center text-center ${widthClass} print:text-black font-serif`}>
      {showDate && (
        <p className="text-[12px] text-gray-800 leading-tight mb-2">
          {displayKota}, {formattedDate}
        </p>
      )}
      <div className="text-[12px] font-bold leading-tight mb-24">
        {customLabel || 'Petugas,'}
      </div>
      <p className="text-[12px] font-bold underline uppercase tracking-wide leading-none">
        {name || '........................................'}
      </p>
      {nip ? (
        <p className="text-[10px] font-mono text-gray-700 mt-1.5 leading-none">
          NIP. {nip}
        </p>
      ) : customSubLabel ? (
        <p className="text-[10px] text-gray-600 mt-1.5 leading-none">
          {customSubLabel}
        </p>
      ) : null}
    </div>
  );
};

export default PrintSignature;
