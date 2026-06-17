import React from 'react';
import type { LoanDetailData, CooperativeSettings } from './types';

interface PrintLoanCardProps {
  loan: LoanDetailData;
  remainingBalance: number;
  coopSettings?: CooperativeSettings | null;
}

export const PrintLoanCard: React.FC<PrintLoanCardProps> = ({
  loan,
  remainingBalance,
  coopSettings,
}) => {
  return (
    <div id="print-loan-card" className="hidden print:block space-y-6 p-8 bg-white text-black">
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

      {/* Judul Cetak */}
      <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
        <h2 className="text-lg font-bold uppercase tracking-wider text-black underline">
          KARTU KENDALI ANGSURAN PINJAMAN
        </h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
          Unit Usaha Simpan Pinjam (USP) Koperasi Sekolah
        </p>
      </div>

      {/* Profile and Metrics Panel */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 border border-slate-300 rounded-xl bg-slate-50">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Anggota</p>
          <h4 className="text-sm font-bold text-black mt-1 uppercase truncate">{loan.member.name}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{loan.member.memberNo}</p>
          <p className="text-[10px] text-slate-650 font-bold mt-2">Status: {loan.status}</p>
        </div>
        <div className="p-4 border border-slate-300 rounded-xl bg-slate-50">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Nilai Pinjaman</p>
          <h4 className="text-sm font-bold text-black mt-1">
            Rp {Math.round(parseFloat(loan.amount)).toLocaleString('id-ID')}
          </h4>
          <p className="text-[10px] text-slate-500 mt-2">Bunga: {loan.interestRate}%</p>
        </div>
        <div className="p-4 border border-slate-300 rounded-xl bg-slate-50">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sisa Saldo Tagihan</p>
          <h4 className="text-sm font-bold text-rose-600 mt-1">
            Rp {Math.round(remainingBalance).toLocaleString('id-ID')}
          </h4>
          <p className="text-[10px] text-slate-500 mt-2">Pokok + Jasa Bunga</p>
        </div>
        <div className="p-4 border border-slate-300 rounded-xl bg-slate-50">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tenor / Jangka Waktu</p>
          <h4 className="text-sm font-bold text-black mt-1">
            {loan.duration} Bulan
          </h4>
          <p className="text-[10px] text-slate-500 mt-2">Cicilan bulanan</p>
        </div>
      </div>

      {/* Installment Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black">Jadwal Rincian Angsuran</h3>
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-black">Angsuran Ke</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-black">Jatuh Tempo</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-black">Jumlah Tagihan</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-black">Status</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-bold text-black">Tanggal Bayar</th>
            </tr>
          </thead>
          <tbody>
            {loan.installments.map((ins, index) => (
              <tr key={ins.id} className="border-b border-slate-300">
                <td className="border border-slate-300 px-3 py-2 text-black font-semibold">{index + 1}</td>
                <td className="border border-slate-300 px-3 py-2 text-black">
                  {new Date(ins.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-black font-bold">
                  Rp {Math.round(parseFloat(ins.amount)).toLocaleString('id-ID')}
                </td>
                <td className={`border border-slate-300 px-3 py-2 font-bold ${ins.status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ins.status === 'PAID' ? 'LUNAS' : 'BELUM LUNAS'}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-black">
                  {ins.paidDate ? new Date(ins.paidDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tanda Tangan */}
      <div className="grid grid-cols-2 gap-6 text-center pt-8 font-semibold text-xs mt-8 border-t border-dashed border-slate-300">
        <div className="space-y-16">
          <p>Mengetahui,<br/>Ketua Koperasi</p>
          <div>
            <div className="font-bold uppercase underline">
              {coopSettings?.signatures?.ketua || '........................'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Ketua Koperasi</div>
          </div>
        </div>

        <div className="space-y-16">
          <p>Purwakarta, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}<br/>Bendahara Koperasi</p>
          <div>
            <div className="font-bold uppercase underline">
              {coopSettings?.signatures?.bendahara || '........................'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Bendahara Koperasi</div>
          </div>
        </div>
      </div>
    </div>
  );
};
