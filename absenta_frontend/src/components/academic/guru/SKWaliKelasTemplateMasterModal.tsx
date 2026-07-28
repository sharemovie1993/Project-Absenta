import React, { useState, useEffect } from 'react';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import WordEditorModal, { WordEditorPage } from '../../common/WordEditorModal';
import { Button } from '../../ui';
import { Save, RotateCcw, Variable, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const PLACEHOLDERS = [
  { key: '{{tahunPelajaran}}', label: 'Tahun Pelajaran 🔄 (Berubah Tiap Tahun)', isAnnual: true },
  { key: '{{nomorSk}}',        label: 'Nomor SK 🔄 (Berubah Tiap Tahun)',         isAnnual: true },
  { key: '{{tanggalSk}}',      label: 'Tanggal SK 🔄 (Berubah Tiap Tahun)',       isAnnual: true },
  { key: '{{tmt}}',            label: 'TMT (Mulai Tgl) 🔄 (Berubah Tiap Tahun)',  isAnnual: true },
  { key: '{{namaGuru}}',       label: 'Nama Guru' },
  { key: '{{nipGuru}}',        label: 'NIP Guru' },
  { key: '{{pangkatGol}}',     label: 'Pangkat/Gol' },
  { key: '{{namaKelas}}',      label: 'Nama Kelas' },
  { key: '{{jabatan}}',        label: 'Jabatan' },
  { key: '{{pendidikanTerakhir}}', label: 'Pendidikan' },
  { key: '{{namaSekolah}}',    label: 'Nama Sekolah' },
  { key: '{{kabKota}}',        label: 'Kab/Kota' },
  { key: '{{namaKepala}}',     label: 'Nama Kepsek' },
  { key: '{{nipKepala}}',      label: 'NIP Kepsek' },
  { key: '{{pangkatKepala}}',  label: 'Pangkat Kepsek' },
];

const ANNUAL_MARK = (placeholder: string, titleStr: string = 'Variabel Tahunan') =>
  `<span class="annual-field-mark" style="background-color: #fef08a; padding: 1px 4px; border-radius: 2px;" title="Variabel ${titleStr} ini perlu disesuaikan/diedit tiap tahun">${placeholder}</span>`;

export const getDefaultMasterPages = (): WordEditorPage[] => {
  const F  = `font-family:'Book Antiqua','Bookman Old Style','Palatino Linotype',serif`;
  const FS = `font-size:11pt`;
  const LH = `line-height:14.9pt`;
  const BASE = `${F};${FS};${LH};color:#000`;

  const tagNomorSk   = ANNUAL_MARK('{{nomorSk}}', 'Nomor SK');
  const tagTanggalSk = ANNUAL_MARK('{{tanggalSk}}', 'Tanggal SK');
  const tagTahunPel  = ANNUAL_MARK('{{tahunPelajaran}}', 'Tahun Pelajaran');
  const tagTmt       = ANNUAL_MARK('{{tmt}}', 'TMT');

  const ttd = `
    <div style="width:280px;text-align:left;${BASE}">
      <div style="${LH}">Ditetapkan di&nbsp;&nbsp;: {{kabKota}}</div>
      <div style="${LH}">Pada Tanggal&nbsp;&nbsp;: ${tagTanggalSk}</div>
      <div style="${LH};font-weight:bold">Kepala {{namaSekolah}},</div>
      <div style="height:70px"></div>
      <div style="${LH};font-weight:bold;text-decoration:underline">{{namaKepala}}</div>
      <div style="${LH}">{{pangkatKepala}}</div>
      <div style="${LH}">NIP {{nipKepala}}</div>
    </div>`;

  const page1 = `
<div style="${BASE};text-align:justify">
  <div style="text-align:center;margin-bottom:14.9pt">
    <div style="${LH};font-weight:bold;font-size:12pt;text-decoration:underline">SURAT KEPUTUSAN</div>
    <div style="${LH};font-weight:bold">KEPALA {{namaSekolah}}</div>
    <div style="${LH};font-weight:bold">KABUPATEN {{kabKota}}</div>
    <div style="${LH}">Nomor : ${tagNomorSk}</div>
    <div style="${LH};font-weight:bold;margin-top:6pt">Tentang</div>
    <div style="${LH};font-weight:bold;text-transform:uppercase">PENGANGKATAN STAF WALI KELAS</div>
    <div style="${LH};font-weight:bold;text-transform:uppercase">SEBAGAI TUGAS TAMBAHAN GURU</div>
    <div style="${LH};font-weight:bold;text-transform:uppercase">TAHUN PELAJARAN ${tagTahunPel}</div>
  </div>
  <div style="${LH};font-weight:bold;text-transform:uppercase;margin-bottom:6pt">KEPALA {{namaSekolah}} :</div>
  <table style="width:100%;border-collapse:collapse;${F};${FS}">
    <tr style="vertical-align:top"><td style="width:110pt;${LH};font-weight:bold">Menimbang</td><td style="width:10pt;${LH};font-weight:bold">:</td><td style="width:20pt;${LH}">a.</td><td style="${LH}">Bahwa beban Kepala {{namaSekolah}} dalam penyelenggaraan Pendidikan cukup berat;</td></tr>
    <tr style="vertical-align:top"><td style="${LH}"></td><td></td><td style="${LH}">b.</td><td style="${LH}">Untuk kelancaran pelaksanaan tugas Kepala Sekolah perlu mengangkat Staf Wali Kelas sebagai Tugas Tambahan Guru Tahun Pelajaran ${tagTahunPel}.</td></tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-top:6pt;${F};${FS}">
    <tr style="vertical-align:top"><td style="width:110pt;${LH};font-weight:bold">Mengingat</td><td style="width:10pt;${LH};font-weight:bold">:</td><td style="width:20pt;${LH}">a.</td><td style="${LH}">Undang-Undang No. 43 Tahun 1999 tentang Pokok-pokok Kepegawaian;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">b.</td><td style="${LH}">Undang-undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">c.</td><td style="${LH}">Undang-undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">d.</td><td style="${LH}">Peraturan Pemerintah Nomor 19 Tahun 2005 dan Nomor 32 Tahun 2014 tentang Standar Nasional Pendidikan;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">e.</td><td style="${LH}">Permendiknas No. 19 Tahun 2007 tentang Standar Pengelolaan Pendidikan;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">f.</td><td style="${LH}">Peraturan Pemerintah Nomor 74 Tahun 2008 tentang Guru;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">g.</td><td style="${LH}">Peraturan Pemerintah No. 48 Tahun 2008 tentang Pendanaan Pendidikan;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">h.</td><td style="${LH}">Peraturan Menteri Negara Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 16 Tahun 2009 tentang Jabatan Fungsional Guru dan Angka Kreditnya;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">i.</td><td style="${LH}">Peraturan Menteri Pendidikan dan Kebudayaan Republik Indonesia Nomor 15 Tahun 2018 Tentang Pemenuhan Beban Kerja Guru, Kepala Sekolah, dan Pengawas Sekolah;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">j.</td><td style="${LH}">Peraturan Menteri Pendidikan, Kebudayaan, Riset dan Teknologi Nomor 7 Tahun 2022 Tentang Standar Isi Pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, Dan Jenjang Pendidikan Menengah;</td></tr>
    <tr style="vertical-align:top"><td></td><td></td><td style="${LH}">k.</td><td style="${LH}">Peraturan Menteri Pendidikan, Kebudayaan, Riset dan Teknologi Nomor 12 Tahun 2024 Tentang Kurikulum pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah;</td></tr>
  </table>
  <div style="${LH};text-align:right;margin-top:20.9pt;font-weight:bold">MEMUTUSKAN ….</div>
</div>`;

  const page2 = `
<div style="${BASE};text-align:justify">
  <div style="${LH};text-align:center;font-weight:bold;letter-spacing:2pt;margin-bottom:14.9pt">M E M U T U S K A N</div>
  <table style="width:100%;border-collapse:collapse;${F};${FS}">
    <tr style="vertical-align:top"><td style="width:110pt;${LH};font-weight:bold">Menetapkan</td><td style="width:10pt;${LH};font-weight:bold">:</td><td style="${LH}"></td></tr>
    <tr style="vertical-align:top"><td style="${LH};font-weight:bold">Pertama</td><td style="${LH};font-weight:bold">:</td><td style="${LH}">Mencabut SK Kepala {{namaSekolah}} Tentang Pengangkatan Staf Wali Kelas Tahun Pelajaran Sebelumnya;</td></tr>
    <tr style="vertical-align:top"><td style="${LH};font-weight:bold;padding-top:6pt">Kedua</td><td style="${LH};font-weight:bold;padding-top:6pt">:</td><td style="${LH};padding-top:6pt">Mengangkat nama yang tercantum dibawah ini :</td></tr>
  </table>
  <table style="width:92%;margin-left:18pt;border-collapse:collapse;margin-top:0;${F};${FS}">
    <tr><td style="width:160pt;${LH}">N a m a</td><td style="width:10pt;${LH}">:</td><td style="${LH};font-weight:bold">{{namaGuru}}</td></tr>
    <tr><td style="${LH}">N I P / NUPTK</td><td style="${LH}">:</td><td style="${LH}">{{nipGuru}}</td></tr>
    <tr><td style="${LH}">Pangkat / Gol.Ruang</td><td style="${LH}">:</td><td style="${LH}">{{pangkatGol}}</td></tr>
    <tr><td style="${LH}">Jabatan</td><td style="${LH}">:</td><td style="${LH};font-weight:bold">{{jabatan}}</td></tr>
    <tr><td style="${LH}">T M T</td><td style="${LH}">:</td><td style="${LH}">${tagTmt}</td></tr>
    <tr><td style="${LH}">Pendidikan Terakhir</td><td style="${LH}">:</td><td style="${LH}">{{pendidikanTerakhir}}</td></tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-top:6pt;${F};${FS}">
    <tr style="vertical-align:top"><td style="width:110pt;${LH};font-weight:bold">Ketiga</td><td style="width:10pt;${LH};font-weight:bold">:</td><td style="${LH}">Rincian Tugas Tambahan Staf Wali Kelas sebagai bagian yang tidak terpisahkan dalam lampiran Surat Keputusan ini;</td></tr>
    <tr style="vertical-align:top"><td style="${LH};font-weight:bold;padding-top:6pt">Keempat</td><td style="${LH};font-weight:bold;padding-top:6pt">:</td><td style="${LH};padding-top:6pt">Segala biaya yang timbul akibat pelaksanaan keputusan ini dibebankan pada Anggaran yang sesuai;</td></tr>
    <tr style="vertical-align:top"><td style="${LH};font-weight:bold;padding-top:6pt">Kelima</td><td style="${LH};font-weight:bold;padding-top:6pt">:</td><td style="${LH};padding-top:6pt">Apabila terdapat kekeliruan, akan ditinjau kembali dan diperbaiki seperlunya;</td></tr>
    <tr style="vertical-align:top"><td style="${LH};font-weight:bold;padding-top:6pt">Keenam</td><td style="${LH};font-weight:bold;padding-top:6pt">:</td><td style="${LH};padding-top:6pt">Keputusan ini berlaku sejak tanggal ditetapkan.</td></tr>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:20.9pt">${ttd}</div>
  <div style="${LH};margin-top:14.9pt">
    <div style="font-weight:bold;text-decoration:underline">Tembusan Yth :</div>
    <div style="${LH}">1. Yth. Kepala Dinas Pendidikan Provinsi Jawa Barat</div>
    <div style="${LH}">2. Yth. Kepala Cabang Dinas Pendidikan Wilayah IV</div>
    <div style="${LH}">3. Yth. Ketua Komite {{namaSekolah}}</div>
    <div style="${LH}">4. Arsip</div>
  </div>
</div>`;

  const page3 = `
<div style="${BASE};text-align:justify">
  <table style="width:100%;border-collapse:collapse;${F};${FS}">
    <tr><td style="width:110pt;${LH};font-weight:bold">Lampiran 1</td><td style="width:10pt;${LH}">:</td><td style="${LH};font-weight:bold">Rincian Tugas Tambahan Staf Wali Kelas</td></tr>
    <tr><td style="${LH};font-weight:bold">Nomor</td><td style="${LH}">:</td><td style="${LH}">${tagNomorSk}</td></tr>
    <tr><td style="${LH};font-weight:bold">Tanggal</td><td style="${LH}">:</td><td style="${LH}">${tagTanggalSk}</td></tr>
  </table>
  <div style="${LH};margin-top:14.9pt">
    Rincian Tugas Tambahan Staf Wali Kelas telah diatur dalam Peraturan Menteri Pendidikan dan Kebudayaan Republik Indonesia Nomor 15 Tahun 2018 tentang Beban Kerja Guru, Kepala Sekolah, dan Pengawas Sekolah yaitu :
  </div>
  <div style="${LH};margin-top:14.9pt"></div>
  <table style="width:100%;border-collapse:collapse;margin-top:14.9pt;border:1pt solid #000;${F};${FS}">
    <thead>
      <tr style="font-weight:bold;text-align:center">
        <th style="padding:5pt 6pt;width:50%;border:1pt solid #000;${LH}">Tugas</th>
        <th style="padding:5pt 6pt;width:50%;border:1pt solid #000;${LH}">Bukti Fisik</th>
      </tr>
    </thead>
    <tbody>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">a. Mengelola kelas yang menjadi tanggungjawabnya.</td><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">a. Surat tugas sebagai wali kelas dari Kepala Sekolah;</td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">b. Berinteraksi dengan orang tua/wali peserta didik;</td><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">b. Program dan jadwal kegiatan wali kelas yang ditandatangani oleh Kepala Sekolah;</td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">c. Menyelenggarakan administrasi kelas;</td><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">c. Laporan hasil kegiatan wali kelas yang disetujui oleh Kepala Sekolah.</td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">d. Menyusun dan melaporkan kemajuan belajar peserta didik;</td><td style="padding:4pt 6pt;border:1pt solid #000"></td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">e. Membuat catatan khusus tentang peserta didik;</td><td style="padding:4pt 6pt;border:1pt solid #000"></td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">f. Mencatat mutasi peserta didik;</td><td style="padding:4pt 6pt;border:1pt solid #000"></td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">g. Mengisi dan membagi buku laporan penilaian hasil belajar;</td><td style="padding:4pt 6pt;border:1pt solid #000"></td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">h. Melaksanakan tugas lainnya yang berkaitan dengan kewalikelasan;</td><td style="padding:4pt 6pt;border:1pt solid #000"></td></tr>
      <tr style="vertical-align:top"><td style="padding:4pt 6pt;border:1pt solid #000;${LH}">i. Menyusun laporan tugas sebagai wali kelas kepada Kepala Sekolah;</td><td style="padding:4pt 6pt;border:1pt solid #000"></td></tr>
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-top:20.9pt">${ttd}</div>
</div>`;

  return [
    { label: 'Halaman 1 (Konsideran)', html: page1 },
    { label: 'Halaman 2 (SK Penetapan)', html: page2 },
    { label: 'Halaman 3 (Lampiran Tugas)', html: page3 },
  ];
};

const highlightAnnualFieldsForMaster = (pagesList: WordEditorPage[]): WordEditorPage[] => {
  const stabiloMark = (content: string, label: string) =>
    `<span class="annual-field-mark" style="background-color: #fef08a; padding: 1px 4px; border-radius: 2px;" title="Area ${label} ini disetting di sini untuk tahun aktif">${content}</span>`;

  return pagesList.map((p) => {
    let html = p.html;

    // Strip old mark badges if any
    html = html.replace(/<mark[^>]*>(?:🔄\s*EDIT TIAP TAHUN:\s*)?(\{\{[^}]+\}\})<\/mark>/gi, '$1');
    html = html.replace(/🔄\s*(?:EDIT TIAP TAHUN:\s*)?/gi, '');

    // Wrap whatever text is typed after "Nomor :" with yellow stabilo highlight
    html = html.replace(/(Nomor\s*:\s*)(?:<span[^>]*class="annual-field-mark"[^>]*>(.*?)<\/span>|([^<\n\r]+))/gi,
      (match, p1, p2, p3) => `${p1}${stabiloMark((p2 || p3 || '').trim(), 'Nomor SK')}`
    );

    // Wrap whatever text is typed after "Tanggal :" or "Pada Tanggal :" with yellow stabilo highlight
    html = html.replace(/((?:Pada\s*Tanggal|Tanggal)\s*:\s*)(?:<span[^>]*class="annual-field-mark"[^>]*>(.*?)<\/span>|([^<\n\r]+))/gi,
      (match, p1, p2, p3) => `${p1}${stabiloMark((p2 || p3 || '').trim(), 'Tanggal SK')}`
    );

    // Wrap whatever text is typed after "TAHUN PELAJARAN" with yellow stabilo highlight
    html = html.replace(/(TAHUN PELAJARAN\s*)(?:<span[^>]*class="annual-field-mark"[^>]*>(.*?)<\/span>|([^<\n\r]+))/gi,
      (match, p1, p2, p3) => `${p1}${stabiloMark((p2 || p3 || '').trim(), 'Tahun Pelajaran')}`
    );

    return { ...p, html };
  });
};

export default function SKWaliKelasTemplateMasterModal({ isOpen, onClose, onSaved }: Props) {
  const [pages, setPages] = useState<WordEditorPage[]>([]);
  const [templateConfig, setTemplateConfig] = useState<any>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    sekolahApi.getProfile()
      .then((res: any) => {
        const existing = res?.data?.sk_wali_kelas_template;
        if (existing && typeof existing === 'object' && !Array.isArray(existing) && existing.pages) {
          setPages(highlightAnnualFieldsForMaster(existing.pages));
          setTemplateConfig(existing.config || undefined);
        } else if (Array.isArray(existing) && existing.length > 0) {
          setPages(highlightAnnualFieldsForMaster(existing));
          setTemplateConfig(undefined);
        } else {
          setPages(highlightAnnualFieldsForMaster(getDefaultMasterPages()));
          setTemplateConfig(undefined);
        }
      })
      .catch(() => {
        setPages(highlightAnnualFieldsForMaster(getDefaultMasterPages()));
        setTemplateConfig(undefined);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleSave = async (currentPages: WordEditorPage[], currentConfig?: any) => {
    setIsSaving(true);
    try {
      const payload = {
        pages: currentPages,
        config: currentConfig || { margin: { top: 20, right: 25, bottom: 20, left: 25 }, paperKey: 'A4', orientation: 'portrait' }
      };
      await sekolahApi.updateSKWaliKelasTemplate(payload as any);
      if (currentConfig) setTemplateConfig(currentConfig);
      alert('Template Master SK Wali Kelas & Konfigurasi Margin berhasil disimpan ke database!');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan template: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan template master ke bawaan awal sistem?')) {
      const defaultPages = highlightAnnualFieldsForMaster(getDefaultMasterPages());
      setPages(defaultPages);
      setTemplateConfig(undefined);
      if ((window as any).tinymce?.activeEditor) {
        const mergedHtml = defaultPages
          .map((p) => p.html)
          .join('<p style="page-break-before: always;"><!-- pagebreak --></p>');
        (window as any).tinymce.activeEditor.setContent(mergedHtml);
      }
    }
  };

  const insertPlaceholder = (phKey: string) => {
    const protectedPill = `<span contenteditable="false" class="mceNonEditable placeholder-pill" style="user-select:none; background-color:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; border-radius:4px; padding:1px 6px; font-weight:bold; font-family:sans-serif; font-size:10pt; display:inline-block; margin:0 2px;">✉️ ${phKey}</span>&nbsp;`;
    if ((window as any).tinymce?.activeEditor) {
      (window as any).tinymce.activeEditor.execCommand('mceInsertContent', false, protectedPill);
    } else {
      document.execCommand('insertHTML', false, protectedPill);
    }
  };

  if (isLoading) return null;

  const extraToolbar = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1 shrink-0">
        <Variable className="w-3.5 h-3.5 text-amber-600" />
        Mail Merge:
      </span>
      <select
        onChange={(e) => {
          if (e.target.value) {
            insertPlaceholder(e.target.value);
            e.target.value = '';
          }
        }}
        defaultValue=""
        className="text-xs font-bold border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-slate-800 rounded px-2 py-0.5 text-amber-900 dark:text-amber-200 cursor-pointer shadow-2xs focus:outline-none"
      >
        <option value="" disabled>✉️ -- Sisipkan Variabel --</option>
        {PLACEHOLDERS.map((ph) => (
          <option key={ph.key} value={ph.key}>
            + {ph.label} ({ph.key})
          </option>
        ))}
      </select>

      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold text-[11px] flex items-center gap-1">
        <Info className="w-3 h-3 text-amber-600 shrink-0" />
        🔄 Field (Berubah Tiap Tahun) Diberi Tanda khusus
      </span>

      <button
        type="button"
        onClick={handleReset}
        title="Kembalikan template ke default awal sistem"
        className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
        Reset Default
      </button>
    </div>
  );

  return (
    <WordEditorModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Template Master SK Wali Kelas (Terpusat Database)"
      printTitle="Template Master SK Wali Kelas"
      printButtonLabel="Cetak Preview"
      initialPages={pages}
      initialConfig={templateConfig}
      allowExtraPages={true}
      orientation="portrait"
      onSave={handleSave}
      saveButtonLabel={isSaving ? 'Menyimpan...' : '💾 SIMPAN TEMPLATE MASTER'}
      extraToolbarItems={extraToolbar}
    />
  );
}
