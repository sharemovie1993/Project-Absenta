import React from 'react';
import type { CooperativeSettings } from './types';

interface PayrollItem {
  no: number;
  memberNo: string;
  name: string;
  savings: Record<string, number>;
  loan: {
    installmentNo: number | null;
    pokok: number;
    jasa: number;
  };
  total: number;
}

interface PrintPayrollDeductionsProps {
  data: PayrollItem[];
  month: number;
  year: number;
  coopSettings?: CooperativeSettings | null;
  savingCategories: { code: string; name: string }[];
  visibleColumns: Record<string, boolean>;
  showLoans: boolean;
}

const indonesianMonths = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

export const PrintPayrollDeductions: React.FC<PrintPayrollDeductionsProps> = ({
  data,
  month,
  year,
  coopSettings,
  savingCategories,
  visibleColumns,
  showLoans,
}) => {
  const monthName = indonesianMonths[month - 1] || 'JANUARI';
  
  const activeCats = savingCategories.filter(cat => visibleColumns[cat.code]);
  const showSavings = activeCats.length > 0;
  const savingsColSpan = activeCats.length;

  // Calculate column totals
  const totalLoanPokok = data.reduce((sum, item) => sum + item.loan.pokok, 0);
  const totalLoanJasa = data.reduce((sum, item) => sum + item.loan.jasa, 0);
  
  const calculateItemTotal = (item: PayrollItem) => {
    let sum = 0;
    activeCats.forEach(cat => {
      sum += Number(item.savings[cat.code] || 0);
    });
    if (showLoans) sum += item.loan.pokok + item.loan.jasa;
    return sum;
  };

  const grandTotal = data.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  return (
    <div id="print-payroll-deductions" className="hidden print:block p-8 bg-white text-black text-[10px] leading-tight font-sans">
      {/* Title Header */}
      <div className="text-center mb-6 space-y-1">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          POTONGAN KOPERASI {coopSettings?.cooperative_name?.toUpperCase().replace('KOPERASI', '').trim() || 'SEKOLAH'}
        </h2>
        <h3 className="text-xs font-bold uppercase">
          {coopSettings?.cooperative_name || 'KOPERASI SEKOLAH'}
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-wider">
          BULAN {monthName} {year}
        </p>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border border-black text-[9px]">
        <thead>
          <tr className="bg-slate-100 border-b border-black">
            <th className="border border-black px-1.5 py-2 text-center font-bold" rowSpan={2}>NO</th>
            <th className="border border-black px-1.5 py-2 text-left font-bold" rowSpan={2}>NAMA ANGGOTA</th>
            {showSavings && (
              <th className="border border-black px-1.5 py-1 text-center font-bold" colSpan={savingsColSpan}>SIMPANAN</th>
            )}
            {showLoans && (
              <th className="border border-black px-1.5 py-1 text-center font-bold" colSpan={3}>PINJAMAN KOPERASI</th>
            )}
            <th className="border border-black px-1.5 py-2 text-right font-bold" rowSpan={2}>JUMLAH</th>
          </tr>
          <tr className="bg-slate-50 border-b border-black">
            {activeCats.map(cat => (
              <th key={cat.code} className="border border-black px-1 py-1 text-center font-bold w-14 uppercase">
                {cat.name.replace('Simpanan', '').trim().toUpperCase()}
              </th>
            ))}
            {showLoans && (
              <>
                <th className="border border-black px-1 py-1 text-center font-bold w-10">KE-</th>
                <th className="border border-black px-1 py-1 text-right font-bold w-18">POKOK</th>
                <th className="border border-black px-1 py-1 text-right font-bold w-18">JASA</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={2 + (showSavings ? savingsColSpan : 0) + (showLoans ? 3 : 0) + 1} className="border border-black p-4 text-center text-slate-400 font-bold uppercase tracking-wider">
                Tidak ada data potongan untuk periode ini.
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={item.memberNo} className="border-b border-black hover:bg-slate-50/20">
                <td className="border border-black px-1.5 py-1 text-center font-medium">{idx + 1}</td>
                <td className="border border-black px-1.5 py-1 text-left font-semibold uppercase">{item.name}</td>
                
                {/* SIMPANAN */}
                {activeCats.map(cat => (
                  <td key={cat.code} className="border border-black px-1 py-1 text-right">
                    {item.savings[cat.code] > 0 ? `Rp ${Math.round(item.savings[cat.code]).toLocaleString('id-ID')}` : '-'}
                  </td>
                ))}
                
                {/* PINJAMAN KOPERASI */}
                {showLoans && (
                  <>
                    <td className="border border-black px-1 py-1 text-center font-medium">
                      {item.loan.installmentNo || '-'}
                    </td>
                    <td className="border border-black px-1 py-1 text-right">
                      {item.loan.pokok > 0 ? `Rp ${Math.round(item.loan.pokok).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="border border-black px-1 py-1 text-right">
                      {item.loan.jasa > 0 ? `Rp ${Math.round(item.loan.jasa).toLocaleString('id-ID')}` : '-'}
                    </td>
                  </>
                )}
                
                {/* JUMLAH */}
                <td className="border border-black px-1.5 py-1 text-right font-bold">
                  Rp {Math.round(calculateItemTotal(item)).toLocaleString('id-ID')}
                </td>
              </tr>
            ))
          )}
          {/* TOTALS ROW */}
          <tr className="bg-slate-100 font-bold border-b border-black text-[9px]">
            <td className="border border-black px-1.5 py-1.5 text-center" colSpan={2}>JUMLAH</td>
            
            {activeCats.map(cat => {
              const catTotal = data.reduce((sum, item) => sum + (item.savings[cat.code] || 0), 0);
              return (
                <td key={cat.code} className="border border-black px-1 py-1.5 text-right">
                  {catTotal > 0 ? `Rp ${Math.round(catTotal).toLocaleString('id-ID')}` : '-'}
                </td>
              );
            })}
            
            {showLoans && (
              <>
                <td className="border border-black px-1 py-1.5 text-center">-</td>
                <td className="border border-black px-1 py-1.5 text-right">
                  Rp {Math.round(totalLoanPokok).toLocaleString('id-ID')}
                </td>
                <td className="border border-black px-1 py-1.5 text-right">
                  Rp {Math.round(totalLoanJasa).toLocaleString('id-ID')}
                </td>
              </>
            )}
            
            <td className="border border-black px-1.5 py-1.5 text-right font-black">
              Rp {Math.round(grandTotal).toLocaleString('id-ID')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature block */}
      <div className="flex justify-end pt-10 font-bold text-[9px]">
        <div className="text-center space-y-14 w-60">
          <p>
            Purwakarta, {monthName.charAt(0) + monthName.slice(1).toLowerCase()} {year}
            <br />
            Ketua Koperasi
          </p>
          <div>
            <div className="underline uppercase font-bold text-[10px]">
              {coopSettings?.signatures?.ketua || '........................'}
            </div>
            <div className="text-[8px] font-medium text-slate-500">Ketua Koperasi</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPayrollDeductions;
