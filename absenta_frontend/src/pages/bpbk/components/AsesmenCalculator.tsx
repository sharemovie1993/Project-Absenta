import React, { useState, useEffect } from 'react';
import { Label } from '../../../components/ui/Label';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import toast from 'react-hot-toast';

interface AsesmenCalculatorProps {
  calcPreset: string;
  setCalcPreset: (val: string) => void;
  onApply: (data: { hasil_skor: string; keterangan: string }) => void;
}

export const AsesmenCalculator: React.FC<AsesmenCalculatorProps> = ({
  calcPreset,
  setCalcPreset,
  onApply
}) => {
  // VAK Calculator states
  const [vakVisual, setVakVisual] = useState(0);
  const [vakAuditory, setVakAuditory] = useState(0);
  const [vakKinesthetic, setVakKinesthetic] = useState(0);

  // AKPD Calculator states
  const [akpdPribadi, setAkpdPribadi] = useState(0);
  const [akpdSosial, setAkpdSosial] = useState(0);
  const [akpdBelajar, setAkpdBelajar] = useState(0);
  const [akpdKarir, setAkpdKarir] = useState(0);

  // DCM Calculator states
  const [dcmTercentang, setDcmTercentang] = useState(0);
  const [dcmTotal, setDcmTotal] = useState(50);

  // Sosiometri states
  const [sosioBelajar, setSosioBelajar] = useState(0);
  const [sosioSosial, setSosioSosial] = useState(0);

  // RIASEC Calculator states
  const [riaRealistic, setRiaRealistic] = useState(0);
  const [riaInvestigative, setRiaInvestigative] = useState(0);
  const [riaArtistic, setRiaArtistic] = useState(0);
  const [riaSocial, setRiaSocial] = useState(0);
  const [riaEnterprising, setRiaEnterprising] = useState(0);
  const [riaConventional, setRiaConventional] = useState(0);

  // ITP Calculator states
  const [itpReligius, setItpReligius] = useState(0);
  const [itpEtis, setItpEtis] = useState(0);
  const [itpEmosi, setItpEmosi] = useState(0);
  const [itpIntelek, setItpIntelek] = useState(0);
  const [itpTanggungJawab, setItpTanggungJawab] = useState(0);
  const [itpGender, setItpGender] = useState(0);
  const [itpDiri, setItpDiri] = useState(0);

  // AUM Calculator states
  const [aumUmumTercentang, setAumUmumTercentang] = useState(0);
  const [aumPtsdlTercentang, setAumPtsdlTercentang] = useState(0);

  const calculateAndApply = () => {
    if (calcPreset === 'VAK') {
      if (vakVisual < 0 || vakAuditory < 0 || vakKinesthetic < 0) {
        toast.error('Skor tidak boleh bernilai negatif');
        return;
      }
      if (vakVisual > 100 || vakAuditory > 100 || vakKinesthetic > 100) {
        toast.error('Skor Gaya Belajar per aspek tidak boleh melebihi 100');
        return;
      }
      const total = vakVisual + vakAuditory + vakKinesthetic;
      if (total === 0) {
        toast.error('Harap masukkan jumlah skor terlebih dahulu');
        return;
      }
      const visPct = Math.round((vakVisual / total) * 100);
      const audPct = Math.round((vakAuditory / total) * 100);
      const kinPct = Math.round((vakKinesthetic / total) * 100);

      let dominant = '';
      const maxVal = Math.max(visPct, audPct, kinPct);
      const doms = [];
      if (visPct === maxVal) doms.push('Visual');
      if (audPct === maxVal) doms.push('Auditori');
      if (kinPct === maxVal) doms.push('Kinestetik');
      dominant = doms.join(' & ');

      onApply({
        hasil_skor: `Dominan ${dominant} (V:${visPct}%, A:${audPct}%, K:${kinPct}%)`,
        keterangan: `Berdasarkan kalkulasi instrumen Gaya Belajar (V-A-K), siswa memiliki kecenderungan gaya belajar dominan ${dominant}.\n\nRincian Skor:\n- Gaya Visual: ${visPct}% (Skor: ${vakVisual})\n- Gaya Auditori: ${audPct}% (Skor: ${vakAuditory})\n- Gaya Kinestetik: ${kinPct}% (Skor: ${vakKinesthetic})\n\nRekomendasi Layanan BK:\nFasilitasi siswa dengan media pembelajaran yang relevan dengan tipe gaya belajar dominannya.`
      });
      toast.success('Hasil kalkulasi Gaya Belajar berhasil diterapkan!');
    } else if (calcPreset === 'AKPD') {
      if (akpdPribadi < 0 || akpdSosial < 0 || akpdBelajar < 0 || akpdKarir < 0) {
        toast.error('Skor tidak boleh bernilai negatif');
        return;
      }
      if (akpdPribadi > 100 || akpdSosial > 100 || akpdBelajar > 100 || akpdKarir > 100) {
        toast.error('Skor AKPD per aspek tidak boleh melebihi 100');
        return;
      }
      const total = akpdPribadi + akpdSosial + akpdBelajar + akpdKarir;
      if (total === 0) {
        toast.error('Harap masukkan jumlah masalah tercentang');
        return;
      }
      const priPct = Math.round((akpdPribadi / total) * 100);
      const sosPct = Math.round((akpdSosial / total) * 100);
      const belPct = Math.round((akpdBelajar / total) * 100);
      const karPct = Math.round((akpdKarir / total) * 100);

      const maxVal = Math.max(priPct, sosPct, belPct, karPct);
      const doms = [];
      if (priPct === maxVal) doms.push('Pribadi');
      if (sosPct === maxVal) doms.push('Sosial');
      if (belPct === maxVal) doms.push('Belajar');
      if (karPct === maxVal) doms.push('Karir');

      onApply({
        hasil_skor: `Kebutuhan Layanan Terbesar: Bidang ${doms.join(' & ')}`,
        keterangan: `Analisis AKPD menunjukkan siswa memiliki tingkat masalah/kebutuhan bimbingan tertinggi di bidang ${doms.join(' & ')}.\n\nPersentase Kebutuhan:\n- Bidang Pribadi: ${priPct}% (Skor: ${akpdPribadi})\n- Bidang Sosial: ${sosPct}% (Skor: ${akpdSosial})\n- Bidang Belajar: ${belPct}% (Skor: ${akpdBelajar})\n- Bidang Karir: ${karPct}% (Skor: ${akpdKarir})\n\nRekomendasi Bimbingan:\nPerlu diberikan bimbingan kelompok atau bimbingan klasikal khusus membahas topik ${doms.join(', ')} untuk membantu siswa melampaui kendala tersebut.`
      });
      toast.success('Hasil kalkulasi AKPD berhasil diterapkan!');
    } else if (calcPreset === 'DCM') {
      if (dcmTercentang < 0 || dcmTotal <= 0) {
        toast.error('Jumlah masalah tidak boleh negatif dan total soal harus lebih dari 0');
        return;
      }
      if (dcmTercentang > dcmTotal) {
        toast.error('Jumlah masalah tercentang tidak boleh melebihi total butir soal');
        return;
      }
      const pct = Math.round((dcmTercentang / dcmTotal) * 100);
      let kategori = 'Ringan';
      if (pct > 25) kategori = 'Kritis / Tinggi';
      else if (pct >= 10) kategori = 'Sedang';

      onApply({
        hasil_skor: `Beban Masalah ${pct}% (${kategori})`,
        keterangan: `Pengukuran Daftar Cek Masalah (DCM) dengan ${dcmTercentang} masalah tercentang dari total ${dcmTotal} item (${pct}%).\n\nKategori Beban Masalah: ${kategori}.\n\nRekomendasi Penanganan:\n${
          kategori === 'Ringan'
            ? 'Cukup diberikan pembinaan preventif berkala oleh wali kelas dan konselor.'
            : kategori === 'Sedang'
            ? 'Perlu dijadwalkan konseling perorangan untuk mendalami butir masalah yang krusial.'
            : 'SANGAT SEGERA dijadwalkan konseling individu mendalam, koordinasikan dengan Wali Kelas dan Orang Tua.'
        }`
      });
      toast.success('Hasil kalkulasi DCM berhasil diterapkan!');
    } else if (calcPreset === 'AUM_UMUM') {
      if (aumUmumTercentang < 0) {
        toast.error('Skor tidak boleh bernilai negatif');
        return;
      }
      if (aumUmumTercentang > 225) {
        toast.error('Jumlah masalah tercentang AUM Umum tidak boleh melebihi 225 butir');
        return;
      }
      const pct = Math.round((aumUmumTercentang / 225) * 100);
      let kategori = 'Ringan';
      if (pct > 25) kategori = 'Kritis / Tinggi';
      else if (pct >= 10) kategori = 'Sedang';

      onApply({
        hasil_skor: `Beban Masalah ${pct}% (${kategori})`,
        keterangan: `Pengukuran Alat Ungkap Masalah (AUM Umum) dengan ${aumUmumTercentang} masalah tercentang dari total 225 butir item (${pct}%).\n\nKategori Beban Masalah: ${kategori}.\n\nRekomendasi Layanan:\n${
          kategori === 'Ringan'
            ? 'Berikan layanan bimbingan informasi pencegahan secara klasikal.'
            : kategori === 'Sedang'
            ? 'Jadwalkan layanan konseling kelompok atau bimbingan kelompok.'
            : 'Layanan konseling perorangan segera dan koordinasikan untuk tindak lanjut / alih tangan kasus jika diperlukan.'
        }`
      });
      toast.success('Hasil kalkulasi AUM Umum berhasil diterapkan!');
    } else if (calcPreset === 'AUM_PTSDL') {
      if (aumPtsdlTercentang < 0) {
        toast.error('Skor tidak boleh bernilai negatif');
        return;
      }
      if (aumPtsdlTercentang > 165) {
        toast.error('Jumlah masalah tercentang AUM PTSDL tidak boleh melebihi 165 butir');
        return;
      }
      const pct = Math.round((aumPtsdlTercentang / 165) * 100);
      let kategori = 'Ringan';
      if (pct > 25) kategori = 'Kritis / Tinggi';
      else if (pct >= 10) kategori = 'Sedang';

      onApply({
        hasil_skor: `Beban Masalah Belajar ${pct}% (${kategori})`,
        keterangan: `Pengukuran AUM PTSDL (Masalah Belajar) dengan ${aumPtsdlTercentang} masalah tercentang dari total 165 butir item (${pct}%).\n\nKategori Masalah Belajar: ${kategori}.\n\nRekomendasi Bimbingan Belajar:\n${
          kategori === 'Ringan'
            ? 'Diberikan tips disiplin belajar mandiri di rumah.'
            : kategori === 'Sedang'
            ? 'Diberikan layanan penguasaan konten teknik belajar efektif dan pengaturan waktu.'
            : 'Segera lakukan layanan konseling belajar individual untuk mendiagnosis kesulitan belajar spesifik.'
        }`
      });
      toast.success('Hasil kalkulasi AUM PTSDL berhasil diterapkan!');
    } else if (calcPreset === 'Sosiometri') {
      if (sosioBelajar < 0 || sosioSosial < 0) {
        toast.error('Frekuensi pemilihan tidak boleh bernilai negatif');
        return;
      }
      if (sosioBelajar > 100 || sosioSosial > 100) {
        toast.error('Frekuensi pemilihan sosiometri tidak boleh melebihi 100');
        return;
      }
      let statusBelajar = 'Rata-rata';
      if (sosioBelajar >= 5) statusBelajar = 'Bintang Kelas (Star)';
      else if (sosioBelajar === 0) statusBelajar = 'Terisolasi (Isolated)';

      let statusSosial = 'Rata-rata';
      if (sosioSosial >= 5) statusSosial = 'Bintang Sosial';
      else if (sosioSosial === 0) statusSosial = 'Terisolasi';

      onApply({
        hasil_skor: `Belajar: ${statusBelajar} | Sosial: ${statusSosial}`,
        keterangan: `Analisis pilihan sosiometri dari teman sekelas:\n- Pemilihan Kelompok Belajar: Dipilih sebanyak ${sosioBelajar} kali (${statusBelajar}).\n- Pemilihan Bermain/Sosial: Dipilih sebanyak ${sosioSosial} kali (${statusSosial}).\n\nRekomendasi Pendampingan:\n${
          sosioBelajar === 0 || sosioSosial === 0
            ? 'Siswa tergolong terisolasi di kelas. Perlu pembinaan integrasi sosial dan penempatan kelompok belajar secara aktif untuk melatih adaptasi.'
            : 'Siswa memiliki hubungan sosial yang sehat dan dapat diikutsertakan sebagai tutor sebaya di kelas.'
        }`
      });
      toast.success('Hasil kalkulasi Sosiometri berhasil diterapkan!');
    } else if (calcPreset === 'RIASEC') {
      if (riaRealistic < 0 || riaInvestigative < 0 || riaArtistic < 0 || riaSocial < 0 || riaEnterprising < 0 || riaConventional < 0) {
        toast.error('Skor tidak boleh bernilai negatif');
        return;
      }
      if (riaRealistic > 100 || riaInvestigative > 100 || riaArtistic > 100 || riaSocial > 100 || riaEnterprising > 100 || riaConventional > 100) {
        toast.error('Skor RIASEC per aspek tidak boleh melebihi 100');
        return;
      }
      const total = riaRealistic + riaInvestigative + riaArtistic + riaSocial + riaEnterprising + riaConventional;
      if (total === 0) {
        toast.error('Harap masukkan skor tiap aspek kepribadian Holland');
        return;
      }
      const scores = [
        { key: 'R', name: 'Realistic', val: riaRealistic },
        { key: 'I', name: 'Investigative', val: riaInvestigative },
        { key: 'A', name: 'Artistic', val: riaArtistic },
        { key: 'S', name: 'Social', val: riaSocial },
        { key: 'E', name: 'Enterprising', val: riaEnterprising },
        { key: 'C', name: 'Conventional', val: riaConventional }
      ];
      scores.sort((a, b) => b.val - a.val);
      const hollandCode = scores.slice(0, 3).map(s => s.key).join('');
      const hollandNames = scores.slice(0, 3).map(s => `${s.name} (${s.val})`).join(', ');

      onApply({
        hasil_skor: `Holland Code: ${hollandCode}`,
        keterangan: `Berdasarkan hasil Kuesioner Minat Karir Holland (RIASEC), Tiga Tipe Kepribadian Minat Dominan siswa adalah:\nKode Karir: ${hollandCode} (${hollandNames})\n\nRincian Seluruh Aspek:\n- Realistic (R): ${riaRealistic}\n- Investigative (I): ${riaInvestigative}\n- Artistic (A): ${riaArtistic}\n- Social (S): ${riaSocial}\n- Enterprising (E): ${riaEnterprising}\n- Conventional (C): ${riaConventional}\n\nRekomendasi Pilihan Karir:\nPerlu dieksplorasi pilihan studi lanjut / kelompok keahlian jurusan kuliah yang sesuai dengan orientasi minat Holland Code ini.`
      });
      toast.success('Hasil kalkulasi RIASEC berhasil diterapkan!');
    } else if (calcPreset === 'ITP') {
      if (itpReligius < 0 || itpEtis < 0 || itpEmosi < 0 || itpIntelek < 0 || itpTanggungJawab < 0 || itpGender < 0 || itpDiri < 0) {
        toast.error('Skor tidak boleh bernilai negatif');
        return;
      }
      if (itpReligius > 10 || itpEtis > 10 || itpEmosi > 10 || itpIntelek > 10 || itpTanggungJawab > 10 || itpGender > 10 || itpDiri > 10) {
        toast.error('Skor aspek ITP berada dalam rentang maksimal 10');
        return;
      }
      const totalScore = itpReligius + itpEtis + itpEmosi + itpIntelek + itpTanggungJawab + itpGender + itpDiri;
      const average = Math.round((totalScore / 7) * 10) / 10;

      const tasks = [
        { name: 'Landasan Hidup Religius', val: itpReligius },
        { name: 'Landasan Perilaku Etis', val: itpEtis },
        { name: 'Kematangan Emosional', val: itpEmosi },
        { name: 'Kematangan Intelektual', val: itpIntelek },
        { name: 'Kesadaran Tanggung Jawab', val: itpTanggungJawab },
        { name: 'Peran Sosial Gender', val: itpGender },
        { name: 'Penerimaan Diri & Kembangan', val: itpDiri }
      ];
      tasks.sort((a, b) => a.val - b.val);
      const lowestArea = tasks[0];

      onApply({
        hasil_skor: `Rerata Perkembangan: ${average}`,
        keterangan: `Hasil Inventori Tugas Perkembangan (ITP) siswa menunjukkan skor rata-rata tingkat perkembangan sebesar ${average}.\n\nSkor Per-Aspek Perkembangan:\n- Landasan Hidup Religius: ${itpReligius}\n- Landasan Perilaku Etis: ${itpEtis}\n- Kematangan Emosional: ${itpEmosi}\n- Kematangan Intelektual: ${itpIntelek}\n- Kesadaran Tanggung Jawab: ${itpTanggungJawab}\n- Peran Sosial Gender: ${itpGender}\n- Penerimaan Diri dan Kembangan: ${itpDiri}\n\nFokus Konseling Pendampingan:\nPerlu perhatian lebih pada aspek '${lowestArea.name}' yang mencatat skor terendah (${lowestArea.val}) untuk membantu siswa mencapai kematangan perkembangan secara komprehensif.`
      });
      toast.success('Hasil kalkulasi ITP berhasil diterapkan!');
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
      <div className="space-y-1.5">
        <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Pilih Tipe Instrumen</Label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { key: 'VAK', label: 'VAK', kategori: 'Massal' },
            { key: 'AKPD', label: 'AKPD', kategori: 'Massal' },
            { key: 'AUM_UMUM', label: 'AUM Umum', kategori: 'Massal' },
            { key: 'AUM_PTSDL', label: 'AUM PTSDL', kategori: 'Massal' },
            { key: 'DCM', label: 'DCM', kategori: 'Khusus' },
            { key: 'Sosiometri', label: 'Sosiometri', kategori: 'Khusus' },
            { key: 'ITP', label: 'ITP', kategori: 'Massal' },
            { key: 'RIASEC', label: 'RIASEC', kategori: 'Massal' }
          ].map(item => {
            const isMassal = item.kategori === 'Massal';
            const isActive = calcPreset === item.key;
            
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCalcPreset(item.key)}
                className={`py-1.5 text-[8.5px] font-black rounded-lg border text-center transition-all ${
                  isActive
                    ? isMassal
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-amber-500 border-amber-500 text-white shadow-sm'
                    : isMassal
                    ? 'border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 hover:bg-emerald-50/30'
                    : 'border-amber-200/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 bg-amber-50/10 hover:bg-amber-50/30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {calcPreset === 'VAK' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan akumulasi jumlah jawaban V, A, dan K siswa dari lembar fisik.</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Pilihan A (Visual) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={vakVisual}
                onChange={(e) => setVakVisual(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Pilihan B (Auditori) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={vakAuditory}
                onChange={(e) => setVakAuditory(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Pilihan C (Kinestetik) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={vakKinesthetic}
                onChange={(e) => setVakKinesthetic(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {calcPreset === 'AKPD' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan jumlah butir masalah tercentang ("YA") pada tiap aspek perkembangan.</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Pribadi (Masalah Pribadi) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={akpdPribadi}
                onChange={(e) => setAkpdPribadi(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Sosial (Hubungan Teman) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={akpdSosial}
                onChange={(e) => setAkpdSosial(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Belajar (Kendala KBM) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={akpdBelajar}
                onChange={(e) => setAkpdBelajar(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Karir (Studi & Cita-cita) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={akpdKarir}
                onChange={(e) => setAkpdKarir(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {calcPreset === 'DCM' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan jumlah beban masalah tercentang berbanding total butir soal DCM.</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Jumlah Masalah Tercentang <span className="text-[8px] opacity-75 font-normal">(Maks: {dcmTotal})</span></Label>
              <Input
                type="number"
                min="0"
                max={dcmTotal}
                value={dcmTercentang}
                onChange={(e) => setDcmTercentang(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Total Butir Pertanyaan (Default: 50)</Label>
              <Input
                type="number"
                min="1"
                value={dcmTotal}
                onChange={(e) => setDcmTotal(parseInt(e.target.value) || 50)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {calcPreset === 'AUM_UMUM' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan jumlah masalah tercentang dari total 225 butir soal AUM Umum.</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Masalah Tercentang <span className="text-[8px] opacity-75 font-normal">(Maks: 225)</span></Label>
              <Input
                type="number"
                min="0"
                max="225"
                value={aumUmumTercentang}
                onChange={(e) => setAumUmumTercentang(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Total Butir Soal</Label>
              <Input
                type="text"
                disabled
                value="225 Item"
                className="h-8 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {calcPreset === 'AUM_PTSDL' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan jumlah masalah belajar tercentang dari total 165 butir soal AUM PTSDL.</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Masalah Tercentang <span className="text-[8px] opacity-75 font-normal">(Maks: 165)</span></Label>
              <Input
                type="number"
                min="0"
                max="165"
                value={aumPtsdlTercentang}
                onChange={(e) => setAumPtsdlTercentang(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Total Butir Soal</Label>
              <Input
                type="text"
                disabled
                value="165 Item"
                className="h-8 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {calcPreset === 'Sosiometri' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan akumulasi frekuensi pemilihan siswa ini oleh rekan sekelas pada sosiogram.</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Dipilih Aspek Kelompok Belajar <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={sosioBelajar}
                onChange={(e) => setSosioBelajar(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Dipilih Aspek Interaksi Sosial <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={sosioSosial}
                onChange={(e) => setSosioSosial(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {calcPreset === 'RIASEC' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan skor akumulasi siswa pada masing-masing tipe kepribadian Holland.</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Realistic (R) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riaRealistic}
                onChange={(e) => setRiaRealistic(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Investigative (I) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riaInvestigative}
                onChange={(e) => setRiaInvestigative(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Artistic (A) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riaArtistic}
                onChange={(e) => setRiaArtistic(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Social (S) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riaSocial}
                onChange={(e) => setRiaSocial(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Enterprising (E) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riaEnterprising}
                onChange={(e) => setRiaEnterprising(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">Conventional (C) <span className="text-[8px] opacity-75 font-normal">(Maks: 100)</span></Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riaConventional}
                onChange={(e) => setRiaConventional(parseInt(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {calcPreset === 'ITP' && (
        <div className="space-y-2">
          <div className="text-[9px] italic text-slate-500">Masukkan nilai skor perkembangan (skala 1 s.d 10) siswa pada tiap tugas perkembangan.</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 col-span-2">
              <Label className="text-[9px] font-bold text-slate-400">1. Landasan Hidup Religius <span className="text-[8px] opacity-75 font-normal">(Maks: 10)</span></Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={itpReligius}
                onChange={(e) => setItpReligius(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[9px] font-bold text-slate-400">2. Landasan Perilaku Etis <span className="text-[8px] opacity-75 font-normal">(Maks: 10)</span></Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={itpEtis}
                onChange={(e) => setItpEtis(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">3. Kematangan Emosional <span className="text-[8px] opacity-75 font-normal">(Maks: 10)</span></Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={itpEmosi}
                onChange={(e) => setItpEmosi(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">4. Kematangan Intelektual <span className="text-[8px] opacity-75 font-normal">(Maks: 10)</span></Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={itpIntelek}
                onChange={(e) => setItpIntelek(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[9px] font-bold text-slate-400">5. Kesadaran Tanggung Jawab Sosial <span className="text-[8px] opacity-75 font-normal">(Maks: 10)</span></Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={itpTanggungJawab}
                onChange={(e) => setItpTanggungJawab(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">6. Peran Sosial Gender <span className="text-[8px] opacity-75 font-normal">(Maks: 10)</span></Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={itpGender}
                onChange={(e) => setItpGender(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold text-slate-400">7. Penerimaan & Kembangan Diri <span className="text-[8px] opacity-75 font-normal">(Maks: 10)</span></Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={itpDiri}
                onChange={(e) => setItpDiri(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={calculateAndApply}
        variant="toolbarPrimary"
        className="w-full justify-center text-[10px] font-black h-8 mt-2"
      >
        HITUNG & TERAPKAN KE FORMULIR
      </Button>
    </div>
  );
};
