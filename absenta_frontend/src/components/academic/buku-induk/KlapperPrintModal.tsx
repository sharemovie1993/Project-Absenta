import React from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { KlapperListItem } from '@/api/academic/buku-induk.api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KlapperPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  klapperData: KlapperListItem[];
  huruf?: string;
  tahunPelajaran?: string;
}

// Internal page-row type (data row OR letter-header row)
type PageRow = KlapperListItem & {
  isLetterHeader?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const KlapperPrintModal: React.FC<KlapperPrintModalProps> = ({
  isOpen,
  onClose,
  klapperData,
  huruf,
  tahunPelajaran,
}) => {
  const { tenantInfo } = usePrintHeaderData();

  // ── Group by first letter ──
  const grouped = React.useMemo<Record<string, KlapperListItem[]>>(() => {
    const map: Record<string, KlapperListItem[]> = {};
    klapperData.forEach((siswa) => {
      const letter = (siswa.nama_siswa?.[0] || '#').toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(siswa);
    });
    return map;
  }, [klapperData]);

  const letters = React.useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // ── Chunk into pages of max ROWS_PER_PAGE rows (counting both header & data rows) ──
  const ROWS_PER_PAGE = 30;

  const allPages = React.useMemo<Array<{ items: PageRow[] }>>(() => {
    const pages: Array<{ items: PageRow[] }> = [];
    let current: PageRow[] = [];

    letters.forEach((letter) => {
      // Letter header row — uses a synthetic id to avoid key collisions
      current.push({
        id: `header-${letter}`,
        nis: '',
        nama_siswa: letter,
        nisn: '',
        status: '',
        isLetterHeader: true,
      } as PageRow);

      grouped[letter].forEach((siswa) => {
        current.push({ ...siswa });
        if (current.length >= ROWS_PER_PAGE) {
          pages.push({ items: [...current] });
          current = [];
        }
      });
    });

    if (current.length > 0) pages.push({ items: current });
    return pages;
  }, [letters, grouped]);

  const subtitle = [
    huruf ? `Huruf: ${huruf}` : 'Semua Huruf',
    tahunPelajaran,
  ]
    .filter(Boolean)
    .join(' | ');

  // Track global row number across pages (skip letter-header rows)
  let globalNo = 0;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Buku Klapper Peserta Didik"
      subtitle={subtitle}
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="flex flex-col gap-8">
        {klapperData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
            Tidak ada data untuk dicetak
          </div>
        ) : (
          allPages.map((page, pageIdx) => (
            <PrintDocumentSheet
              key={pageIdx}
              pageNumber={pageIdx + 1}
              totalPages={allPages.length}
              footerText="Buku Klapper Peserta Didik"
            >
              <PrintHeader
                documentTitle="BUKU KLAPPER PESERTA DIDIK"
                tenantInfo={tenantInfo}
              />

              {/* Formal A-Z Index Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '10.5pt',
                  fontFamily: "'Times New Roman', serif",
                  marginTop: '12px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th
                      style={{
                        border: '0.5px solid #000',
                        padding: '4px 6px',
                        textAlign: 'center',
                        width: '8%',
                      }}
                    >
                      No.
                    </th>
                    <th
                      style={{
                        border: '0.5px solid #000',
                        padding: '4px 6px',
                        textAlign: 'left',
                        width: '15%',
                      }}
                    >
                      NIS
                    </th>
                    <th
                      style={{
                        border: '0.5px solid #000',
                        padding: '4px 6px',
                        textAlign: 'left',
                        width: '35%',
                      }}
                    >
                      Nama Siswa
                    </th>
                    <th
                      style={{
                        border: '0.5px solid #000',
                        padding: '4px 6px',
                        textAlign: 'left',
                        width: '15%',
                      }}
                    >
                      NISN
                    </th>
                    <th
                      style={{
                        border: '0.5px solid #000',
                        padding: '4px 6px',
                        textAlign: 'left',
                        width: '15%',
                      }}
                    >
                      Kelas
                    </th>
                    <th
                      style={{
                        border: '0.5px solid #000',
                        padding: '4px 6px',
                        textAlign: 'center',
                        width: '12%',
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item, idx) => {
                    if (item.isLetterHeader) {
                      return (
                        <tr key={`lh-${idx}`}>
                          <td
                            colSpan={6}
                            style={{
                              border: '0.5px solid #000',
                              padding: '3px 8px',
                              fontWeight: 'bold',
                              backgroundColor: '#e2e8f0',
                              fontSize: '11pt',
                              letterSpacing: '1px',
                            }}
                          >
                            ── {item.nama_siswa} ──
                          </td>
                        </tr>
                      );
                    }

                    globalNo++;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor: globalNo % 2 === 0 ? '#fafafa' : '#fff',
                        }}
                      >
                        <td
                          style={{
                            border: '0.5px solid #000',
                            padding: '2px 6px',
                            textAlign: 'center',
                          }}
                        >
                          {globalNo}
                        </td>
                        <td
                          style={{ border: '0.5px solid #000', padding: '2px 6px' }}
                        >
                          {item.nis}
                        </td>
                        <td
                          style={{ border: '0.5px solid #000', padding: '2px 6px' }}
                        >
                          {item.nama_siswa}
                        </td>
                        <td
                          style={{ border: '0.5px solid #000', padding: '2px 6px' }}
                        >
                          {item.nisn || '-'}
                        </td>
                        <td
                          style={{ border: '0.5px solid #000', padding: '2px 6px' }}
                        >
                          {item.Kelas?.nama_kelas || '-'}
                        </td>
                        <td
                          style={{
                            border: '0.5px solid #000',
                            padding: '2px 6px',
                            textAlign: 'center',
                          }}
                        >
                          {item.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </PrintDocumentSheet>
          ))
        )}
      </div>
    </UniversalDocumentModal>
  );
};
