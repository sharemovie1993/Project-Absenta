import React from 'react';
import { Badge } from '../../ui';
import {
  Clock,
  Shield,
  Scale,
  Gavel,
  AlertCircle,
} from 'lucide-react';

interface RatRulesTabContentProps {
  meetingDescription?: string | null;
}

export const RatRulesTabContent: React.FC<RatRulesTabContentProps> = React.memo(({
  meetingDescription,
}) => {
  return (
    <div className="space-y-6 pt-1">
      {/* 4 CORE HIGHLIGHT PILLARS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase">
            <Scale className="w-3.5 h-3.5" />
            <span>Kedaulatan Anggota</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            1 Anggota 1 Suara
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Satu anggota memiliki tepat satu hak suara sah tanpa perwakilan bertingkat.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
            <Shield className="w-3.5 h-3.5" />
            <span>Ambang Kuorum</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            Minimal 50% + 1
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Syarat legalitas yuridis pengambilan keputusan rapat anggota menurut UU.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-xs uppercase">
            <Clock className="w-3.5 h-3.5" />
            <span>Hak Bicara & Interupsi</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            Maksimal 3 Menit
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Melalui izin pimpinan sidang dengan menyebutkan jenis interupsi resmi.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase">
            <Gavel className="w-3.5 h-3.5" />
            <span>Ketetapan Sidang</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            Sah & Mengikat (TAP RAT)
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Seluruh keputusan dituangkan dalam surat ketetapan yang mengikat kepengurusan.
          </p>
        </div>
      </div>

      {/* CUSTOM RULES BOX (IF SAVED IN DATABASE) */}
      {meetingDescription && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/70 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase">
            <AlertCircle className="w-4 h-4" />
            <span>Klausul Khusus & Ketentuan Tambahan Sidang Tahun Buku Ini:</span>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed pl-6">
            {meetingDescription}
          </p>
        </div>
      )}

      {/* OFFICIAL 7 ARTICLES (PASAL-PASAL RESMI TATA TERTIB SIDANG RAT) */}
      <div className="space-y-4 pt-2">
        {/* PASAL 1 */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">1</span>
              Pasal 1: Nama, Kedudukan, dan Dasar Hukum
            </h4>
            <Badge variant="outline" className="text-[10px]">Landasan Yuridis</Badge>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            1. Rapat Anggota Tahunan (RAT) merupakan pemegang kekuasaan tertinggi dalam tata kehidupan koperasi.<br />
            2. RAT ini diselenggarakan berdasarkan Undang-Undang Republik Indonesia Nomor 25 Tahun 1992 tentang Perkoperasian (Pasal 22 s/d Pasal 27), Peraturan Menteri Koperasi dan UKM, serta Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART) Koperasi.
          </p>
        </div>

        {/* PASAL 2 */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">2</span>
              Pasal 2: Peserta Sidang, Hak Suara, dan Hak Bicara
            </h4>
            <Badge variant="outline" className="text-[10px]">Hak Anggota</Badge>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            1. Peserta RAT adalah seluruh anggota aktif koperasi yang telah terdaftar resmi pada buku daftar anggota dan melakukan presensi kehadiran.<br />
            2. Dalam pengambilan keputusan, berlaku prinsip perkoperasian <strong>Satu Anggota Satu Suara (One Man, One Vote)</strong> tanpa memandang besaran simpanan pokok maupun simpanan wajib.<br />
            3. Setiap peserta berhak mengajukan usul, saran, dan pertanyaan dengan seizin Pimpinan Sidang secara tertib dan konstruktif.
          </p>
        </div>

        {/* PASAL 3 */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">3</span>
              Pasal 3: Kuorum dan Keabsahan Sidang
            </h4>
            <Badge variant="outline" className="text-[10px]">Syarat Sah Pleno</Badge>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            1. Sidang RAT dinyatakan sah dan berhak mengambil keputusan yang mengikat apabila dihadiri oleh lebih dari separuh jumlah anggota aktif berhak suara (50% + 1).<br />
            2. Apabila kuorum belum tercapai pada waktu yang ditentukan, sidang dapat diskors selama 1 x 15 menit. Apabila setelah skors kuorum tetap belum terpenuhi, sidang dilanjutkan dan keputusannya sah mengikat sesuai kesepakatan anggota yang hadir.
          </p>
        </div>

        {/* PASAL 4 */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">4</span>
              Pasal 4: Pimpinan Sidang (Presidium Sidang)
            </h4>
            <Badge variant="outline" className="text-[10px]">Wewenang Pimpinan</Badge>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            1. Sidang RAT dibuka oleh Pengurus/Pimpinan Sidang Sementara hingga disahkannya Tata Tertib dan terpilihnya Presidium Sidang Pleno definitif.<br />
            2. Presidium Sidang beranggotakan Ketua, Sekretaris, dan Anggota yang dipilih dari dan oleh peserta rapat anggota.<br />
            3. Pimpinan Sidang berwenang memimpin jalannya pleno, menjaga ketertiban, mengalokasikan waktu bicara, dan mengetuk palu pengesahan ketetapan sidang.
          </p>
        </div>

        {/* PASAL 5 */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">5</span>
              Pasal 5: Tata Cara Interupsi dan Waktu Berbicara
            </h4>
            <Badge variant="outline" className="text-[10px]">Ketertiban Pleno</Badge>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            1. Peserta yang ingin menyampaikan pandangan atau interupsi wajib mengangkat tangan dan menunggu persetujuan Pimpinan Sidang.<br />
            2. Interupsi hanya diperkenankan untuk: (a) <em>Point of Order</em> (penegakan tata tertib), (b) <em>Point of Information</em> (memberikan data faktual), atau (c) <em>Point of Clarification</em> (meluruskan kekeliruan).<br />
            3. Setiap peserta diberikan alokasi waktu berbicara maksimal 3 (tiga) menit untuk menjaga kelancaran durasi persidangan.
          </p>
        </div>

        {/* PASAL 6 */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">6</span>
              Pasal 6: Mekanisme Pengambilan Keputusan & e-Voting
            </h4>
            <Badge variant="outline" className="text-[10px]">Putusan Sidang</Badge>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            1. Keputusan sidang diutamakan melalui asas musyawarah untuk mencapai mufakat.<br />
            2. Apabila musyawarah mufakat tidak tercapai setelah diupayakan sungguh-sungguh, maka keputusan diambil berdasarkan suara terbanyak (voting).<br />
            3. Pemungutan suara dapat diselenggarakan secara digital melalui sistem <strong>e-Voting Absenta Cooperative</strong> atau pemungutan suara terbuka/tertutup secara langsung.
          </p>
        </div>

        {/* PASAL 7 */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono text-xs">7</span>
              Pasal 7: Risalah Sidang dan Surat Ketetapan (TAP RAT)
            </h4>
            <Badge variant="outline" className="text-[10px]">Kepastian Hukum</Badge>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            1. Seluruh jalannya persidangan dan dinamika rapat wajib dicatat oleh Sekretaris Sidang dalam Berita Acara Rapat.<br />
            2. Seluruh hasil keputusan yang disetujui dituangkan dalam <strong>Surat Ketetapan Resmi Rapat Anggota Tahunan (TAP RAT)</strong> yang ditandatangani oleh Presidium Sidang dan sah mengikat seluruh Pengurus, Pengawas, dan Anggota Koperasi.
          </p>
        </div>
      </div>
    </div>
  );
});

RatRulesTabContent.displayName = 'RatRulesTabContent';
export default RatRulesTabContent;
