import React from 'react';
import type { LoanDetailData, Installment, CooperativeSettings } from './types';

interface PrintLoanRepaymentProps {
  loan: LoanDetailData;
  installment: Installment;
  installmentNo: number;
  coopSettings?: CooperativeSettings | null;
}

export const PrintLoanRepayment = React.memo<PrintLoanRepaymentProps>(({
  loan,
  installment,
  installmentNo,
  coopSettings,
}) => {
  const amountNumber = parseFloat(installment.amount);
  const receiptNo = `BSR/${loan.id.substring(0, 8).toUpperCase()}/${installmentNo}/${new Date(installment.paidDate || '').getFullYear()}`;

  return (
    <div id="print-loan-repayment" className="hidden print:block space-y-6 p-12 bg-white text-black text-xs leading-relaxed max-w-4xl mx-auto font-sans">
      {/* Kop Surat Koperasi */}
      <div className="flex items-center justify-between border-b-4 border-double border-black pb-3 mb-6">
        <div className="w-16 h-16 flex items-center justify-center">
          <img 
            src={coopSettings?.cooperative_logo_url || '/logo.png'} 
            alt="Logo Koperasi" 
            className="max-h-16 max-w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
          />
        </div>
        <div className="flex-1 text-center px-4">
          <h1 className="text-sm font-bold uppercase tracking-wider leading-tight">
            {coopSettings?.cooperative_name || 'KOPERASI SEKOLAH'}
          </h1>
          {coopSettings?.cooperative_legal_no && (
            <p className="text-[9px] font-semibold text-slate-700 mt-0.5">
              Badan Hukum No: {coopSettings.cooperative_legal_no}
            </p>
          )}
          <p className="text-[9px] text-slate-600 mt-0.5 leading-normal">
            {coopSettings?.cooperative_address || 'Alamat Koperasi'}
          </p>
          <p className="text-[8px] text-slate-500 font-mono mt-0.5">
            {coopSettings?.cooperative_phone && `Telp: ${coopSettings.cooperative_phone}`}
            {coopSettings?.cooperative_email && ` | Email: ${coopSettings.cooperative_email}`}
            {coopSettings?.cooperative_website && ` | Web: ${coopSettings.cooperative_website}`}
          </p>
        </div>
        <div className="w-16"></div>
      </div>

      {/* Judul Slip */}
      <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-4 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-black">
            BUKTI SETOR ANGSURAN PINJAMAN
          </h2>
          <p className="text-[10px] text-slate-550 uppercase tracking-widest mt-0.5">
            Unit Usaha Simpan Pinjam (USP) Koperasi Sekolah
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-650 font-mono font-bold">No: {receiptNo}</p>
        </div>
      </div>

      {/* Detail Bukti Setor */}
      <div className="space-y-3.5 pl-2 font-semibold">
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-3 text-slate-500">Telah Diterima Dari</span>
          <span className="col-span-9 uppercase text-slate-900">{loan.member?.name} ({loan.member?.memberNo})</span>
        </div>

        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-3 text-slate-500">Uang Sejumlah</span>
          <span className="col-span-9 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg italic text-black text-[13px] font-bold">
            # {convertAmountToWords(amountNumber)} Rupiah #
          </span>
        </div>

        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-3 text-slate-500">Untuk Pembayaran</span>
          <span className="col-span-9 text-slate-800">
            Penyetoran angsuran pinjaman KSP ke-<strong>{installmentNo}</strong> dari total tenor <strong>{loan.duration} bulan</strong>.
          </span>
        </div>

        {installment.paidDate && (
          <div className="grid grid-cols-12 gap-2">
            <span className="col-span-3 text-slate-500">Tanggal Transaksi</span>
            <span className="col-span-9 text-slate-800">
              {new Date(installment.paidDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Info Tagihan Sisa */}
      <div className="p-4 bg-slate-55 border border-slate-200 rounded-xl space-y-2 mt-6 max-w-md ml-auto">
        <h4 className="font-bold text-[10px] uppercase text-slate-500 border-b border-dashed border-slate-300 pb-1">
          Informasi Status Pinjaman
        </h4>
        <div className="space-y-1.5 font-medium text-slate-700">
          <div className="flex justify-between">
            <span>Plafon Pinjaman:</span>
            <span className="font-bold">Rp {Math.round(parseFloat(loan.amount)).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span>Angsuran Terbayar:</span>
            <span className="font-bold text-emerald-600">Rp {amountNumber.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between pt-1 text-slate-900 border-t border-dashed border-slate-200 font-extrabold">
            <span>Status Cicilan:</span>
            <span className="uppercase text-indigo-650">LUNAS (Angsuran {installmentNo}/{loan.duration})</span>
          </div>
        </div>
      </div>

      {/* Tanggal dan Tanda Tangan */}
      <div className="flex justify-between items-end pt-12 font-semibold">
        <div className="space-y-1">
          <p className="text-[10px] text-slate-550 italic">Jumlah Uang Setoran:</p>
          <div className="border-2 border-double border-black bg-slate-50 px-4 py-2 font-mono text-[16px] font-black text-slate-900 rounded-xl">
            RP {amountNumber.toLocaleString('id-ID')},-
          </div>
        </div>

        <div className="text-center space-y-16">
          <p>Bendahara Penerima</p>
          <div>
            <div className="font-bold uppercase text-[11px] underline">
              {coopSettings?.signatures?.bendahara || '........................'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Tanda Tangan & Cap KSP</div>
          </div>
        </div>

        <div className="text-center space-y-16">
          <p>Penyetor (Anggota)</p>
          <div>
            <div className="font-bold uppercase text-[11px] underline">
              {loan.member?.name}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Tanda Tangan</div>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintLoanRepayment.displayName = 'PrintLoanRepayment';

// Helper function to convert numeric amount to Indonesian text words
function convertAmountToWords(num: number): string {
  const ones = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  if (num === 0) return 'Nol';
  
  function helper(n: number): string {
    if (n < 12) return ones[n];
    if (n < 20) return helper(n - 10) + ' Belas';
    if (n < 100) return ones[Math.floor(n / 10)] + ' Puluh ' + helper(n % 10);
    if (n < 200) return 'Seratus ' + helper(n - 100);
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Ratus ' + helper(n % 100);
    if (n < 2000) return 'Seribu ' + helper(n - 1000);
    if (n < 1000000) return helper(Math.floor(n / 1000)) + ' Ribu ' + helper(n % 1000);
    if (n < 1000000000) return helper(Math.floor(n / 1000000)) + ' Juta ' + helper(n % 1000000);
    return '';
  }
  
  return helper(num).replace(/\s+/g, ' ').trim();
}

export default PrintLoanRepayment;
