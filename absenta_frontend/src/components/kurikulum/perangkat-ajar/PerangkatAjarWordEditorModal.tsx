import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Loader2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Undo,
  Redo,
  Table as TableIcon,
  Minus,
  RemoveFormatting,
  Palette,
  Highlighter,
  FileText
} from 'lucide-react';
import { Modal, Button, Badge } from '../../ui';
import { toast } from 'sonner';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { useAuth } from '../../../hooks/useAuth';
import { getTenantById } from '../../../api/tenants.api';

export interface PerangkatAjarItemForEdit {
  id?: string;
  judul: string;
  jenis: string;
  mapel_id?: string;
  guru_id?: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  html_content?: string;
  status?: string;
}

interface PerangkatAjarWordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemData?: PerangkatAjarItemForEdit | null;
  onSaveSuccess: () => void;
}

export default function PerangkatAjarWordEditorModal({
  isOpen,
  onClose,
  itemData,
  onSaveSuccess,
}: PerangkatAjarWordEditorModalProps) {
  const { user } = useAuth();
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [judul, setJudul] = useState('');
  const [jenis, setJenis] = useState('MODUL_AJAR');
  const [pages, setPages] = useState<string[]>(['']);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [hasKopHeader, setHasKopHeader] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  // Formatting States
  const [textColor, setTextColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');

  // Fetch data profil tenant / sekolah saat modal dibuka
  useEffect(() => {
    if (!isOpen || !user?.tenant_id) return;
    getTenantById(user.tenant_id)
      .then((res) => {
        if (res?.data) {
          setTenantInfo(res.data);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat profil tenant untuk kop sekolah:', err);
      });
  }, [isOpen, user?.tenant_id]);

  // Helper untuk membangun Kop Surat Resmi Sekolah presisi (sesuai konfigurasi Tenant & PrintHeader)
  const buildKopHeaderHtml = (dataOverride?: any): string => {
    const data = dataOverride || tenantInfo;
    const logoSekolah = data?.logo_url || null;
    const logoDaerah = data?.logo_daerah_url || null;

    const alamatLengkap = data?.address || itemData?.nama_sekolah || '';
    const telepon = data?.phone || '';
    const email = data?.email || '';
    const website = data?.website || '';

    const rawLines = data?.print_header_lines && data.print_header_lines.length > 0
      ? data.print_header_lines
      : [
          data?.nama_dinas_atas || 'PEMERINTAH DAERAH PROPINSI JAWA BARAT',
          data?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          data?.nama_cabang_dinas || 'KANTOR CABANG DINAS PENDIDIKAN WILAYAH IV',
          data?.name || itemData?.nama_sekolah || 'SEKOLAH MENENGAH KEJURUAN NEGERI 1 PLERED'
        ];

    const parsedLines = rawLines.map((line: any, idx: number) => {
      if (typeof line === 'object' && line !== null) return line;
      try {
        const p = JSON.parse(line);
        if (p && typeof p === 'object' && 'text' in p) return p;
      } catch {}

      const textStr = typeof line === 'string' ? line : line?.text || '';
      let fontSize = idx === 3 || idx === rawLines.length - 1 ? 15 : idx <= 1 ? 11 : 9.5;
      return { text: textStr, fontSize, bold: true, fontFamily: 'Arial' };
    });

    const linesHtml = parsedLines.map((l: any, idx: number) => {
      const isLast = idx === parsedLines.length - 1;
      const isSecondLast = idx === parsedLines.length - 2 && parsedLines.length > 1;
      const sz = isLandscape ? (l.fontSize || 11) * 1.1 : (l.fontSize || 11);
      const weight = l.bold !== undefined ? (l.bold ? '900' : '400') : (isLast ? '900' : isSecondLast ? '800' : '700');
      return `<div style="font-size:${sz}pt;font-weight:${weight};font-family:${l.fontFamily || 'Arial'},sans-serif;text-transform:uppercase;line-height:1.2;color:#0f172a;text-align:center;width:100%;margin-bottom:2px;">${l.text}</div>`;
    }).join('');

    return `
<div id="kop-sekolah-official" class="kop-sekolah-official" style="width:100%;margin-bottom:14px;padding-bottom:8px;border-bottom:3px double #0f172a;font-family:Arial,sans-serif;">
  <table style="width:100%;border-collapse:collapse;border:none;">
    <tr>
      <td style="width:110px;text-align:center;vertical-align:middle;border:none;padding:0;">
        ${logoDaerah
          ? `<img src="${logoDaerah}" alt="Logo Daerah" style="max-height:${isLandscape ? '80px' : '70px'};max-width:100px;object-fit:contain;" />`
          : `<div style="width:70px;height:70px;visibility:hidden;"></div>`
        }
      </td>
      <td style="text-align:center;vertical-align:middle;border:none;padding:0 8px;">
        ${linesHtml}
        ${alamatLengkap ? `
        <div style="font-size:8.5pt;color:#334155;font-weight:500;margin-top:4px;line-height:1.3;text-align:center;">
          ${alamatLengkap}${telepon ? ` | Telp: ${telepon}` : ''}
        </div>` : ''}
        ${(website || email) ? `
        <div style="font-size:8pt;color:#475569;font-weight:700;font-family:monospace;margin-top:1px;text-align:center;">
          ${website ? `Website: ${website}` : ''}${website && email ? ' | ' : ''}${email ? `Email: ${email}` : ''}
        </div>` : ''}
      </td>
      <td style="width:110px;text-align:center;vertical-align:middle;border:none;padding:0;">
        ${logoSekolah
          ? `<img src="${logoSekolah}" alt="Logo Sekolah" style="max-height:${isLandscape ? '80px' : '70px'};max-width:100px;object-fit:contain;" />`
          : `<div style="width:70px;height:70px;visibility:hidden;"></div>`
        }
      </td>
    </tr>
  </table>
</div>`;
  };

  // Helper Toggle Kop Surat (Bisa check / uncheck fleksibel)
  const toggleKopHeader = () => {
    if (!pageRefs.current[0]) return;
    const page1El = pageRefs.current[0]!;
    const existingKop = page1El.querySelector('#kop-sekolah-official, .kop-sekolah-official');

    if (existingKop) {
      existingKop.remove();
      setHasKopHeader(false);
      toast.success('Kop Surat Sekolah dihapus dari Halaman 1');
    } else {
      const kopHtml = buildKopHeaderHtml();
      page1El.insertAdjacentHTML('afterbegin', kopHtml);
      setHasKopHeader(true);
      toast.success('Kop Surat Resmi Sekolah berhasil ditambahkan ke Halaman 1!');
    }
    calculateWordCount();
  };

  // Helper untuk memecah HTML berdasarkan elemen page-break-before menjadi beberapa lembar halaman A4
  const parseHtmlIntoPages = (rawHtml: string): string[] => {
    if (!rawHtml || !rawHtml.trim()) return ['<p>Ketik isi perangkat ajar di sini...</p>'];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

      // Cari elemen yang memiliki gaya page-break-before
      const breakEls = Array.from(doc.body.querySelectorAll('*')).filter((el) => {
        const style = el.getAttribute('style') || '';
        return style.includes('page-break-before');
      });

      if (breakEls.length === 0) {
        return [rawHtml];
      }

      const MARKER = '___PAGE_BREAK_SPLIT_MARKER___';
      breakEls.forEach((el) => {
        el.insertAdjacentHTML('beforebegin', MARKER);
      });

      const markedHtml = doc.body.innerHTML;
      const parts = markedHtml
        .split(MARKER)
        .map((p) => p.trim())
        .filter(Boolean);

      return parts.length > 0 ? parts : [rawHtml];
    } catch {
      return [rawHtml];
    }
  };

  // Load content saat modal terbuka atau data berubah
  useEffect(() => {
    if (!isOpen || !itemData) return;

    const currentJenis = itemData.jenis || 'MODUL_AJAR';
    setJudul(itemData.judul || 'Dokumen Perangkat Ajar');
    setJenis(currentJenis);

    // Auto set landscape mode untuk dokumen matriks lebar (ATP, PROTA, PROMES)
    const upperJ = String(currentJenis).toUpperCase();
    if (upperJ.includes('ATP') || upperJ.includes('PROTA') || upperJ.includes('PROMES')) {
      setIsLandscape(true);
    } else {
      setIsLandscape(false);
    }

    const applyContent = (rawContent: string) => {
      const splitPages = parseHtmlIntoPages(rawContent);
      setPages(splitPages);

      // Isi innerHTML untuk setiap lembar halaman
      setTimeout(() => {
        splitPages.forEach((pageHtml, idx) => {
          if (pageRefs.current[idx]) {
            pageRefs.current[idx]!.innerHTML = pageHtml;
          }
        });

        if (pageRefs.current[0]) {
          const hasKop = !!pageRefs.current[0]!.querySelector('#kop-sekolah-official, .kop-sekolah-official');
          setHasKopHeader(hasKop);
        }

        calculateWordCount();
      }, 80);
    };

    if (itemData.id) {
      setLoading(true);
      kurikulumApi
        .getPerangkatById(itemData.id)
        .then((res) => {
          const content = res?.data?.html_content || itemData.html_content || '<p>Ketik isi perangkat ajar di sini...</p>';
          applyContent(content);
        })
        .catch(() => {
          const content = itemData.html_content || '<p>Ketik isi perangkat ajar di sini...</p>';
          applyContent(content);
        })
        .finally(() => setLoading(false));
    } else {
      const content = itemData.html_content || '<p>Ketik isi perangkat ajar di sini...</p>';
      applyContent(content);
    }
  }, [isOpen, itemData]);

  const calculateWordCount = () => {
    let totalText = '';
    pageRefs.current.forEach((el) => {
      if (el) {
        totalText += ' ' + (el.innerText || '');
      }
    });
    const words = totalText.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    calculateWordCount();
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold;">No</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold;">Kegiatan Pembelajaran</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold;">Alokasi Waktu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Pendahuluan & Asesmen Diagnostik</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">15 Menit</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">2</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Kegiatan Inti & Eksplorasi Konsep</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">60 Menit</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">3</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Penutup & Refleksi Guru</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">15 Menit</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    execCmd('insertHTML', tableHtml);
  };

  const getCombinedHtml = () => {
    return pageRefs.current
      .filter(Boolean)
      .map((el) => el?.innerHTML || '')
      .join('');
  };

  const handleSave = async () => {
    const finalHtml = getCombinedHtml();

    if (!judul.trim()) {
      toast.error('Judul perangkat ajar wajib diisi');
      return;
    }

    setSaving(true);
    try {
      await kurikulumApi.saveEditorPerangkat({
        perangkat_id: itemData?.id,
        judul,
        jenis,
        mapel_id: itemData?.mapel_id,
        guru_id: itemData?.guru_id,
        tahun_pelajaran_id: itemData?.tahun_pelajaran_id,
        semester_id: itemData?.semester_id,
        html_content: finalHtml,
      });

      toast.success('Naskah Perangkat Ajar berhasil disimpan ke repositori!');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Word-Style Document Editor — Perangkat Ajar Kurikulum Merdeka"
      size={isLandscape ? 'full' : '5xl'}
    >
      <div className="flex flex-col space-y-3 -mt-2">
        {/* Document Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl shadow-md">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <FileText className="w-5 h-5 text-blue-400 shrink-0" />
            <input
              type="text"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Judul Perangkat Ajar"
              className="bg-transparent font-bold text-sm text-white focus:outline-none border-b border-blue-400/40 focus:border-blue-400 w-full px-1 py-0.5"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold text-xs">
              {jenis.replace('_', ' ')}
            </Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold text-xs">
              Status: DRAFT / PENDING
            </Badge>
          </div>
        </div>

        {/* MS Word Ribbon Formatting Toolbar */}
        <div className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-inner">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
            {/* Style Dropdown */}
            <select
              onChange={(e) => execCmd('formatBlock', e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none cursor-pointer"
            >
              <option value="<p>">Paragraf (Normal)</option>
              <option value="<h1>">Judul Utama (H1)</option>
              <option value="<h2>">Sub Judul (H2)</option>
              <option value="<h3>">Seksi (H3)</option>
              <option value="<blockquote>">Kutipan (Quote)</option>
            </select>

            {/* Font Family */}
            <select
              onChange={(e) => execCmd('fontName', e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium outline-none cursor-pointer"
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Calibri">Calibri</option>
              <option value="Courier New">Courier New</option>
            </select>

            {/* Font Size */}
            <select
              onChange={(e) => execCmd('fontSize', e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium outline-none cursor-pointer"
            >
              <option value="2">10pt</option>
              <option value="3">12pt (Standar)</option>
              <option value="4">14pt</option>
              <option value="5">18pt (Besar)</option>
              <option value="6">24pt (Judul)</option>
            </select>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Bold, Italic, Underline, Strike */}
            <button
              type="button"
              onClick={() => execCmd('bold')}
              title="Cetak Tebal (Bold)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold transition-colors"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              title="Cetak Miring (Italic)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold transition-colors"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              title="Garis Bawah (Underline)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold transition-colors"
            >
              <Underline size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('strikeThrough')}
              title="Coret (Strikethrough)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold transition-colors"
            >
              <Strikethrough size={15} />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Color Pickers */}
            <div className="flex items-center gap-1" title="Warna Teks">
              <Palette size={14} className="text-slate-500" />
              <input
                type="color"
                value={textColor}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  execCmd('foreColor', e.target.value);
                }}
                className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer rounded"
              />
            </div>

            <div className="flex items-center gap-1" title="Warna Sorotan (Highlight)">
              <Highlighter size={14} className="text-amber-500" />
              <input
                type="color"
                value={bgColor}
                onChange={(e) => {
                  setBgColor(e.target.value);
                  execCmd('hiliteColor', e.target.value);
                }}
                className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer rounded"
              />
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Alignments */}
            <button
              type="button"
              onClick={() => execCmd('justifyLeft')}
              title="Rata Kiri"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <AlignLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyCenter')}
              title="Rata Tengah"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <AlignCenter size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyRight')}
              title="Rata Kanan"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <AlignRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyFull')}
              title="Rata Kanan Kiri (Justify)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <AlignJustify size={15} />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Lists */}
            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              title="Daftar Simbol (Bulleted List)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              title="Daftar Angka (Numbered List)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <ListOrdered size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('indent')}
              title="Tambah Indentasi"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <Indent size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('outdent')}
              title="Kurangi Indentasi"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <Outdent size={15} />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Insert Tools */}
            <button
              type="button"
              onClick={handleInsertTable}
              title="Sisipkan Tabel 3x3"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-indigo-600 font-bold transition-colors flex items-center gap-1"
            >
              <TableIcon size={15} />
              <span className="text-[10px] hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertHorizontalRule')}
              title="Garis Pembatas Horizontal"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('removeFormat')}
              title="Hapus Format"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-rose-500 transition-colors"
            >
              <RemoveFormatting size={15} />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => execCmd('undo')}
              title="Undo (Ctrl+Z)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <Undo size={15} />
            </button>
            <button
              type="button"
              onClick={() => execCmd('redo')}
              title="Redo (Ctrl+Y)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <Redo size={15} />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Paper Orientation & Kop Surat Toggles */}
            <button
              type="button"
              onClick={toggleKopHeader}
              title={hasKopHeader ? "Hapus Kop Surat Sekolah dari Halaman 1" : "Sisipkan Kop Surat Resmi Sekolah ke Halaman 1"}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 border ${
                hasKopHeader
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/25 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {hasKopHeader ? '🏛️ KOP SURAT (AKTIF ✓)' : '🏛️ TAMBAH KOP SURAT'}
            </button>

            <button
              type="button"
              onClick={() => setIsLandscape(!isLandscape)}
              title={isLandscape ? "Ganti ke Mode Portrait (A4 Vertikal)" : "Ganti ke Mode Landscape (A4 Horisontal - Cocok untuk Tabel Luas ATP/PROTA)"}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 border ${
                isLandscape
                  ? 'bg-amber-500/10 text-amber-600 border-amber-400/40 hover:bg-amber-500/20'
                  : 'bg-blue-500/10 text-blue-600 border-blue-400/40 hover:bg-blue-500/20'
              }`}
            >
              {isLandscape ? '📜 LANDSCAPE (TABEL LUAS)' : '📄 PORTRAIT'}
            </button>
          </div>
        </div>

        {/* Word Document Paper Sheet Area — Multi-page A4 canvas */}
        <div
          className="w-full bg-slate-300/80 dark:bg-slate-950 px-4 md:px-8 py-6 rounded-xl border border-slate-300 dark:border-slate-800 flex flex-col items-center overflow-x-auto overflow-y-auto space-y-6"
          style={{ minHeight: '65vh', maxHeight: '68vh' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-xs font-bold">Memuat naskah dokumen...</span>
            </div>
          ) : (
            pages.map((_, index) => (
              <div key={index} className="flex flex-col items-center shrink-0 w-auto">
                {/* Visual MS Word Page Sheet Label */}
                <div className="w-full flex items-center justify-between px-2 mb-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm">
                    <FileText size={12} className="text-blue-500" /> HALAMAN {index + 1} DARI {pages.length}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    A4 {isLandscape ? 'Landscape (297 x 210 mm)' : 'Portrait (210 x 297 mm)'}
                  </span>
                </div>

                {/* Individual A4 Page Canvas Sheet */}
                <div
                  ref={(el) => {
                    pageRefs.current[index] = el;
                  }}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onFocus={() => setActivePageIndex(index)}
                  onInput={calculateWordCount}
                  onBlur={calculateWordCount}
                  className="bg-white text-slate-900 shadow-2xl rounded-sm font-sans text-xs leading-relaxed focus:outline-none select-text transition-all duration-300 shrink-0"
                  style={{
                    width: isLandscape ? '297mm' : '210mm',
                    minHeight: isLandscape ? '210mm' : '297mm',
                    padding: isLandscape
                      ? '1.5cm 2cm 1.5cm 2.5cm'
                      : '2.5cm 2.5cm 2.5cm 3cm',
                    boxShadow:
                      '0 10px 40px -8px rgba(0,0,0,0.25), 0 4px 16px -4px rgba(0,0,0,0.12)',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Visual Page Break Separator Gap if not last page */}
                {index < pages.length - 1 && (
                  <div className="w-full my-4 flex items-center justify-center">
                    <div className="w-full border-t-2 border-dashed border-slate-400/50 relative">
                      <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-slate-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                        ✂️ PEMISAH HALAMAN (PAGE BREAK)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Word Bottom Status Bar */}
        <div className="flex flex-wrap items-center justify-between px-3 py-2 pb-20 sm:pb-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
              <FileText size={13} className="text-blue-500" /> Halaman {activePageIndex + 1} dari {pages.length}
            </span>
            <span>{wordCount} Kata</span>
            <span>Bahasa Indonesia (Kurikulum Merdeka)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl font-bold text-xs"
            >
              BATAL
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> MENYIMPAN...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" /> SIMPAN PERUBAHAN
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
