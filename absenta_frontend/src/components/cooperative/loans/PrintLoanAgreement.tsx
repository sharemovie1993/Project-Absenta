import React from 'react';
import type { LoanDetailData, CooperativeSettings } from './types';

interface PrintLoanAgreementProps {
  loan: LoanDetailData;
  coopSettings?: CooperativeSettings | null;
}

export const PrintLoanAgreement = React.memo<PrintLoanAgreementProps>(({ loan, coopSettings }) => {
  const amountNumber = parseFloat(loan.amount);
  const durationMonths = loan.duration;
  const interestRateVal = parseFloat(loan.interestRate);
  
  // Calculate flat monthly installment
  const monthlyInstallment = loan.installments[0] 
    ? Math.round(parseFloat(loan.installments[0].amount))
    : Math.round((amountNumber + (amountNumber * (interestRateVal / 100))) / durationMonths);

  const spkNo = `SPK/${loan.id.substring(0, 8).toUpperCase()}/${new Date(loan.createdAt).getFullYear()}`;

  return (
    <div id="print-loan-agreement" className="hidden print:block space-y-6 p-12 bg-white text-black text-xs leading-relaxed max-w-4xl mx-auto font-serif">
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

      {/* Judul Surat Perjanjian */}
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold uppercase tracking-wider underline">SURAT PERJANJIAN PINJAMAN (AKAD KREDIT)</h2>
        <p className="font-semibold text-slate-600">Nomor: {spkNo}</p>
      </div>

      <p className="text-justify font-medium">
        Pada hari ini, <strong>{new Date(loan.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>, 
        telah disepakati perjanjian pinjaman dana koperasi simpan pinjam antara pihak-pihak di bawah ini:
      </p>

      {/* Identitas Para Pihak */}
      <div className="space-y-4 pl-4">
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-1 font-bold">I.</span>
          <div className="col-span-11 space-y-1">
            <p className="font-bold uppercase">PENGURUS KOPERASI SEKOLAH SMKN 1 PLERED</p>
            <p className="text-slate-600">Bertindak atas nama Koperasi Sekolah SMK Negeri 1 Plered, selaku penyalur fasilitas simpan pinjam, untuk selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-1 font-bold">II.</span>
          <div className="col-span-11 space-y-1">
            <p className="font-bold uppercase">{loan.member?.name}</p>
            <div className="grid grid-cols-12 gap-1 font-medium text-slate-700">
              <span className="col-span-3">No. Anggota</span>
              <span className="col-span-9">: {loan.member?.memberNo}</span>
              <span className="col-span-3">Jabatan/Status</span>
              <span className="col-span-9">: Anggota Koperasi</span>
            </div>
            <p className="text-slate-600 mt-1">Selaku penerima fasilitas pinjaman, untuk selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
          </div>
        </div>
      </div>

      <p className="text-justify font-medium">
        Kedua belah pihak telah bersepakat untuk mengadakan perjanjian pinjaman uang dengan syarat dan ketentuan yang diatur dalam pasal-pasal berikut ini:
      </p>

      {/* Pasal-Pasal Perjanjian */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="font-bold text-center uppercase tracking-wide">Pasal 1<br/>JUMLAH PINJAMAN DAN JANGKA WAKTU</h4>
          <p className="text-justify font-medium pl-4">
            PIHAK PERTAMA memberikan pinjaman kepada PIHAK KEDUA sebesar <strong>Rp {Math.round(amountNumber).toLocaleString('id-ID')}</strong> (Terbilang: <em>{convertAmountToWords(amountNumber)} Rupiah</em>). 
            Pinjaman tersebut disepakati dalam jangka waktu (tenor) selama <strong>{durationMonths} bulan</strong> terhitung sejak tanggal ditandatanganinya perjanjian ini.
          </p>
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-center uppercase tracking-wide">Pasal 2<br/>SUKU BUNGA DAN ANGSURAN</h4>
          <p className="text-justify font-medium pl-4">
            Atas pinjaman tersebut, PIHAK KEDUA bersedia dikenakan jasa bunga koperasi sebesar <strong>{interestRateVal}%</strong> flat per bulan. 
            PIHAK KEDUA berkewajiban melakukan pembayaran angsuran flat setiap bulannya sebesar <strong>Rp {monthlyInstallment.toLocaleString('id-ID')} / bulan</strong> selama {durationMonths} bulan berturut-turut.
          </p>
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-center uppercase tracking-wide">Pasal 3<br/>MEKANISME PEMBAYARAN DAN PELUNASAN</h4>
          <p className="text-justify font-medium pl-4">
            Pembayaran angsuran wajib disetorkan paling lambat tanggal jatuh tempo setiap bulan berjalan sesuai jadwal kartu kendali angsuran. 
            Pembayaran dapat dilakukan secara tunai langsung ke Bendahara Koperasi Sekolah SMKN 1 Plered atau melalui transfer bank ke rekening resmi Koperasi Sekolah.
          </p>
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-center uppercase tracking-wide">Pasal 4<br/>SANKSI DAN KETENTUAN KHUSUS</h4>
          <p className="text-justify font-medium pl-4">
            Apabila PIHAK KEDUA terlambat atau lalai melakukan pembayaran kewajibannya, PIHAK PERTAMA berhak melakukan tindakan penagihan intensif, 
            pembatasan hak keanggotaan sementara, atau pemotongan saldo tabungan jaminan yang tersimpan di koperasi sekolah sesuai dengan AD/ART Koperasi SMKN 1 Plered.
          </p>
        </div>
      </div>

      <p className="text-justify font-medium">
        Demikian Surat Perjanjian ini dibuat secara sadar, tanpa paksaan dari pihak mana pun, dan ditandatangani oleh kedua belah pihak di SMKN 1 Plered untuk dipergunakan sebagaimana mestinya.
      </p>

      {/* Tanda Tangan */}
      <div className="grid grid-cols-3 gap-6 text-center pt-8 font-semibold">
        <div className="space-y-16">
          <p>PIHAK PERTAMA<br/>Ketua Koperasi</p>
          <div>
            <div className="font-bold uppercase text-[11px] underline">
              {coopSettings?.signatures?.ketua || '........................'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Ketua Koperasi Sekolah</div>
          </div>
        </div>

        <div className="space-y-16">
          <p>PIHAK KEDUA<br/>Peminjam (Anggota)</p>
          <div>
            <div className="font-bold uppercase text-[11px] underline">
              {loan.member?.name}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">No. Anggota: {loan.member?.memberNo}</div>
          </div>
        </div>

        <div className="space-y-16">
          <p>MENGETAHUI<br/>Kepala Sekolah / Pembina</p>
          <div>
            <div className="font-bold uppercase text-[11px] underline">
              {coopSettings?.signatures?.kepsek || '........................'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Kepala Sekolah / Pembina Koperasi</div>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintLoanAgreement.displayName = 'PrintLoanAgreement';

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
export default PrintLoanAgreement;
