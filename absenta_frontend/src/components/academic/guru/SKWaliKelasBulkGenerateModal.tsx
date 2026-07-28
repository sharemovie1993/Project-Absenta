import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../ui';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getTenantById } from '../../../api/tenants.api';
import { tahunPelajaranApi } from '../../../api/academic.api';
import { getWaliKelasStrukturList } from '../../../api/kurikulum/waliKelas.api';
import { skWaliKelasArsipApi } from '../../../api/academic/sk-wali-kelas-arsip.api';
import { getDefaultMasterPages } from './SKWaliKelasTemplateMasterModal';
import { renderToString } from 'react-dom/server';
import { PrintHeader } from '../../ui/PrintHeader';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CheckSquare, Square, Download, RefreshCw, Printer, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SKWaliKelasBulkGenerateModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; statusText: string }>({
    current: 0,
    total: 0,
    statusText: '',
  });

  const [sekolahInfo, setSekolahInfo] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [activeTa, setActiveTa] = useState<string>('');

  // ── Load list wali kelas & profil sekolah ──
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    Promise.all([
      getWaliKelasStrukturList(1, 200, '', { include_inactive: false }).catch(() => ({ data: [] })),
      sekolahApi.getProfile().catch(() => null),
      user?.tenant_id ? getTenantById(user.tenant_id).catch(() => null) : Promise.resolve(null),
      tahunPelajaranApi.getActive().catch(() => null),
    ]).then(([waliRes, sekRes, tenRes, taRes]) => {
      const items = waliRes?.data || [];
      setList(items);
      setSelectedIds(new Set(items.map((i: any) => i.id))); // default select all
      if (sekRes?.data) setSekolahInfo(sekRes.data);
      if (tenRes?.data) setTenantInfo(tenRes.data);
      if (taRes?.data?.tahun) setActiveTa(taRes.data.tahun);
    }).finally(() => setLoading(false));
  }, [isOpen, user?.tenant_id]);

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((i) => i.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Helper untuk membangun HTML Dokumen per Wali Kelas sesuai standar WordEditorModal
  const buildWaliKelasDocumentHtml = (item: any) => {
    const masterFromDb = sekolahInfo?.sk_wali_kelas_template;
    let basePages = getDefaultMasterPages();
    if (masterFromDb && typeof masterFromDb === 'object' && !Array.isArray(masterFromDb) && masterFromDb.pages) {
      basePages = masterFromDb.pages;
    } else if (Array.isArray(masterFromDb) && masterFromDb.length > 0) {
      basePages = masterFromDb;
    }

    const headerHtml = tenantInfo ? renderToString(<PrintHeader variant="portrait" tenantInfo={tenantInfo} />) : '';
    const kopHtml = headerHtml ? `<div id="kop-surat-shared" style="width:100%;margin-bottom:12px;user-select:none;">${headerHtml}</div>` : '';

    const now = new Date();
    const defaultYearRange = `${now.getFullYear()}/${now.getFullYear() + 1}`;
    const tahunPelajaran = activeTa || sekolahInfo?.tahun_pelajaran || tenantInfo?.tahun_pelajaran || defaultYearRange;
    const namaSekolah = sekolahInfo?.nama || tenantInfo?.name || '[BELUM DIISI]';
    const kabKota = sekolahInfo?.kota || tenantInfo?.kabupaten || tenantInfo?.kota || '[BELUM DIISI]';
    const namaKepala = sekolahInfo?.kepala_sekolah || tenantInfo?.kepala_sekolah || tenantInfo?.nama_kepala_sekolah || '[BELUM DIISI]';
    const nipKepala = sekolahInfo?.nip_kepala || tenantInfo?.nip_kepala || tenantInfo?.nip_kepala_sekolah || '[BELUM DIISI]';
    const pangkatKepala = sekolahInfo?.pangkat_kepala || tenantInfo?.pangkat_kepala || '[BELUM DIISI]';

    const guruName = item.Guru?.nama_guru || 'Guru';
    const kelasName = item.StrukturOrganisasi?.Kelas?.nama_kelas || 'Kelas';

    const replacements: Record<string, string> = {
      '{{namaGuru}}': guruName,
      '{{NAMAGURU}}': guruName,
      '{{nipGuru}}': item.Guru?.nip || '[BELUM DIISI]',
      '{{NIPGURU}}': item.Guru?.nip || '[BELUM DIISI]',
      '{{pangkatGol}}': item.Guru?.pangkat_golongan || '[BELUM DIISI]',
      '{{PANGKATGOL}}': item.Guru?.pangkat_golongan || '[BELUM DIISI]',
      '{{namaKelas}}': kelasName,
      '{{NAMAKELAS}}': kelasName,
      '{{jabatan}}': `WALI KELAS ${kelasName}`,
      '{{JABATAN}}': `WALI KELAS ${kelasName}`,
      '{{tmt}}': item.start_date ? new Date(item.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '[BELUM DIISI]',
      '{{TMT}}': item.start_date ? new Date(item.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '[BELUM DIISI]',
      '{{pendidikanTerakhir}}': item.Guru?.pendidikan_terakhir || '[BELUM DIISI]',
      '{{tahunPelajaran}}': tahunPelajaran,
      '{{TAHUNPELAJARAN}}': tahunPelajaran,
      '{{namaSekolah}}': namaSekolah,
      '{{NAMASEKOLAH}}': namaSekolah,
      '{{kabKota}}': kabKota,
      '{{KABKOTA}}': kabKota,
      '{{nomorSk}}': `0408.B/PK.02/SMKN1PLD-KCD WIL.IV/${now.getFullYear()}`,
      '{{tanggalSk}}': `15 Juli ${now.getFullYear()}`,
      '{{namaKepala}}': namaKepala,
      '{{nipKepala}}': nipKepala,
      '{{pangkatKepala}}': pangkatKepala,
    };

    const replacePlaceholders = (htmlStr: string) => {
      let res = htmlStr;
      res = res.replace(/<mark[^>]*>(?:🔄\s*EDIT TIAP TAHUN:\s*)?(\{\{[^}]+\}\})<\/mark>/gi, '$1');
      res = res.replace(/<span[^>]*class="annual-field-mark"[^>]*>(.*?)<\/span>/gi, '$1');
      res = res.replace(/🔄\s*(?:EDIT TIAP TAHUN:\s*)?/gi, '');
      Object.entries(replacements).forEach(([key, val]) => {
        res = res.replaceAll(key, val || '');
      });
      return res;
    };

    const pagesList = basePages.map((p) => ({
      label: p.label,
      html: replacePlaceholders(p.html),
    }));

    const pagesHtml = pagesList.map((p, pIdx) => `
      <div class="page-container" style="page-break-after:always;width:210mm;min-height:297mm;padding:20mm 25mm 20mm 25mm;background:#fff;margin:0 auto;box-sizing:border-box;">
        ${pIdx === 0 ? kopHtml : ''}
        ${p.html}
      </div>
    `).join('');

    return {
      guruName,
      kelasName,
      tahunPelajaran,
      pagesList,
      pagesHtml,
    };
  };

  // ── Standar Modul Cetak: Stream Dialog Printer Browser (Save as PDF Native Vektor) ──
  const handleNativePrintStream = () => {
    const selectedItems = list.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length === 0) {
      toast.error('Pilih setidaknya 1 Wali Kelas!');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up diblokir. Izinkan pop-up untuk mencetak.');
      return;
    }

    const now = new Date();
    const defaultYearRange = `${now.getFullYear()}/${now.getFullYear() + 1}`;
    const tahunPelajaran = activeTa || sekolahInfo?.tahun_pelajaran || tenantInfo?.tahun_pelajaran || defaultYearRange;

    const allDocsHtml = selectedItems.map((item) => {
      return buildWaliKelasDocumentHtml(item).pagesHtml;
    }).join('');

    printWin.document.write(`<!DOCTYPE html><html><head>
      <title>SK Wali Kelas Massal - ${tahunPelajaran}</title>
      <style>
        @page { size: 210mm 297mm; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; font-family: 'Book Antiqua', 'Bookman Old Style', 'Palatino Linotype', serif; font-size: 11pt; line-height: 14.9pt; color: #000; }
        * { box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
        th, td { border: 1pt solid #000; padding: 4pt 6pt; }
        th { background-color: #f8fafc; font-weight: bold; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>
      ${allDocsHtml}
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    printWin.document.close();
  };

  // ── Standar Unduh ZIP: Pengemasan Dokumen Cetak Siap Print per Wali Kelas ──
  const handleStartBulkGenerate = async () => {
    const selectedItems = list.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length === 0) {
      toast.error('Pilih setidaknya 1 Wali Kelas untuk digenerate!');
      return;
    }

    setIsGenerating(true);
    const total = selectedItems.length;
    setProgress({ current: 0, total, statusText: 'Mempersiapkan dokumen SK...' });

    const zip = new JSZip();
    const folder = zip.folder('SK_Wali_Kelas');

    let successCount = 0;
    const now = new Date();

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const docData = buildWaliKelasDocumentHtml(item);

      setProgress({
        current: i + 1,
        total,
        statusText: `Mengolah SK (${i + 1}/${total}): ${docData.guruName} - ${docData.kelasName}`,
      });

      const standaloneHtml = `<!DOCTYPE html><html><head>
        <meta charset="utf-8">
        <title>SK Wali Kelas - ${docData.guruName}</title>
        <style>
          @page { size: 210mm 297mm; margin: 0; }
          body { margin: 0; padding: 0; background: #f1f5f9; font-family: 'Book Antiqua', 'Bookman Old Style', 'Palatino Linotype', serif; font-size: 11pt; line-height: 14.9pt; color: #000; }
          * { box-sizing: border-box; }
          .page-container { width: 210mm; min-height: 297mm; padding: 20mm 25mm 20mm 25mm; background: #ffffff; margin: 20px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); page-break-after: always; }
          table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
          th, td { border: 1pt solid #000; padding: 4pt 6pt; }
          th { background-color: #f8fafc; font-weight: bold; }
          @media print {
            body { background: #fff; }
            .page-container { margin: 0 auto; box-shadow: none; }
          }
        </style>
      </head><body>
        ${docData.pagesHtml}
        <script>window.onload = function() { window.print(); };</script>
      </body></html>`;

      const cleanGuru = docData.guruName.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanKelas = docData.kelasName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `SK_Wali_Kelas_${cleanGuru}_${cleanKelas}.html`;

      if (folder) folder.file(filename, standaloneHtml);

      // Simpan catatan ke Arsip DB
      await skWaliKelasArsipApi.saveArsip({
        guru_id: item.Guru?.id || 'unknown',
        nama_guru: docData.guruName,
        nama_kelas: docData.kelasName,
        tahun_pelajaran: docData.tahunPelajaran,
        nomor_sk: `0408.B/PK.02/SMKN1PLD-KCD WIL.IV/${now.getFullYear()}`,
        tanggal_sk: `15 Juli ${now.getFullYear()}`,
        halaman_html: docData.pagesList,
      }).catch(() => {});

      successCount++;
    }

    setProgress({ current: total, total, statusText: 'Mengompres file ZIP...' });

    try {
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const activeYearStr = activeTa || `${now.getFullYear()}_${now.getFullYear() + 1}`;
      const cleanYear = activeYearStr.replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(zipContent, `SK_Wali_Kelas_Massal_${cleanYear}.zip`);

      toast.success(`🎉 Berhasil mengemas ${successCount} Dokumen SK Wali Kelas Resmi ke dalam file ZIP!`);
      onClose();
    } catch (err: any) {
      toast.error('Gagal mengompres file ZIP: ' + (err.message || 'Error'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Generate & Cetak SK Wali Kelas Massal" size="lg">
      <div className="p-4 space-y-4">
        
        {/* Header Info */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500 text-white font-black text-sm shrink-0">
            ⚡
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100">Cetak &amp; Ekspor SK Wali Kelas Massal (Standar Modul Cetak Berkas)</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Gunakan <strong>Cetak / Save PDF (Modul Cetak Berkas Resmi)</strong> untuk mencetak seluruh dokumen sekaligus dengan teks vektor asli via dialog browser, atau <strong>Unduh ZIP Paket Dokumen</strong> per wali kelas!
            </p>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
          >
            {selectedIds.size === list.length ? (
              <CheckSquare className="w-4 h-4 text-indigo-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Pilih Semua ({list.length} Wali Kelas)</span>
          </button>

          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 font-extrabold border-indigo-200">
            {selectedIds.size} Terpilih
          </Badge>
        </div>

        {/* List Wali Kelas */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2 font-bold">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Memuat daftar wali kelas...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-bold">
            Tidak ada penugasan wali kelas aktif.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
            {list.map((item) => {
              const isChecked = selectedIds.has(item.id);
              const guruName = item.Guru?.nama_guru || 'Guru';
              const kelasName = item.StrukturOrganisasi?.Kelas?.nama_kelas || 'Kelas';

              return (
                <label
                  key={item.id}
                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                    isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectOne(item.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 block">{guruName}</span>
                      <span className="text-[11px] text-slate-500 font-bold">Wali Kelas: {kelasName} • NIP: {item.Guru?.nip || '-'}</span>
                    </div>
                  </div>

                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {kelasName}
                  </Badge>
                </label>
              );
            })}
          </div>
        )}

        {/* Progress Bar */}
        {isGenerating && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-extrabold text-amber-900 dark:text-amber-200">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                {progress.statusText}
              </span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>
            Batal
          </Button>

          <div className="flex items-center gap-2">
            {/* Native Browser Print Stream Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleNativePrintStream}
              disabled={isGenerating || selectedIds.size === 0 || loading}
              className="border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 font-extrabold flex items-center gap-1.5 py-1.5 hover:bg-indigo-100"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>🖨️ Cetak / Save PDF (Modul Cetak Berkas)</span>
            </Button>

            {/* ZIP Bulk Download Button */}
            <Button
              size="sm"
              onClick={handleStartBulkGenerate}
              disabled={isGenerating || selectedIds.size === 0 || loading}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-extrabold shadow-md flex items-center gap-2 py-1.5"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses... ({progress.current}/{progress.total})</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>⚡ Unduh ZIP Paket Dokumen ({selectedIds.size} Wali Kelas)</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
