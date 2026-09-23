import { useCallback, useState } from 'react';
import { raporApi } from '../api/rapor.api';
import { useToast } from './useToast';

export interface UseRaporPdfOptions {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export function useRaporPdf(options: UseRaporPdfOptions = {}) {
  const { showToast } = useToast();
  const [activePrintingDoc, setActivePrintingDoc] = useState<string | null>(null);

  /**
   * Helper membuka dokumen PDF via Authenticated Axios Blob
   * Kebal terhadap masalah 'Missing or invalid authorization header' karena
   * token Authorization: Bearer selalu disematkan oleh axios interceptor.
   */
  const openPdfBlob = useCallback(
    async (fetcher: () => Promise<{ data: BlobPart }>, docTitle: string) => {
      setActivePrintingDoc(docTitle);
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        const response = await fetcher();
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        showToast(`${docTitle} berhasil dibuka`, 'success');
      } catch (err: unknown) {
        let errorMsg = `Gagal membuka ${docTitle}.`;
        const typedErr = err as {
          response?: { data?: Blob | { message?: string } };
          message?: string;
        };

        if (typedErr?.response?.data instanceof Blob) {
          try {
            const rawText = await typedErr.response.data.text();
            const parsed = JSON.parse(rawText);
            if (parsed?.message) {
              errorMsg = parsed.message;
            }
          } catch {
            // Keep default fallback
          }
        } else if (typeof typedErr?.response?.data === 'object' && typedErr?.response?.data !== null && 'message' in typedErr.response.data) {
          errorMsg = typedErr.response.data.message || errorMsg;
        } else if (typedErr?.message) {
          errorMsg = typedErr.message;
        }
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [showToast]
  );

  const printCover = useCallback(
    (siswaId: string) => {
      if (!siswaId) return;
      void openPdfBlob(() => raporApi.getPdfCoverBlob(siswaId), 'Cover Rapor');
    },
    [openPdfBlob]
  );

  const printBiodata = useCallback(
    (siswaId: string) => {
      if (!siswaId) return;
      void openPdfBlob(() => raporApi.getPdfBiodataBlob(siswaId), 'Biodata Siswa');
    },
    [openPdfBlob]
  );

  const printRaporSemester = useCallback(
    (siswaId: string, customTpId?: string, customSemId?: string) => {
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      if (!tpId || !semId) {
        showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
        return;
      }
      void openPdfBlob(
        () => raporApi.getPdfRaporBlob(siswaId, tpId, semId),
        'Rapor Semester (CK1 & CK2)'
      );
    },
    [openPdfBlob, options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printRaporSumatif = useCallback(
    (siswaId: string, customTpId?: string, customSemId?: string) => {
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      if (!tpId || !semId) {
        showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
        return;
      }
      void openPdfBlob(
        () => raporApi.getPdfRaporSumatifBlob(siswaId, tpId, semId),
        'Rapor Penilaian Sumatif'
      );
    },
    [openPdfBlob, options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printLeger = useCallback(
    (kelasId: string, customTpId?: string, customSemId?: string) => {
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      if (!kelasId) {
        showToast('Pilih Rombel / Kelas terlebih dahulu', 'warning');
        return;
      }
      if (!tpId || !semId) {
        showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
        return;
      }
      void openPdfBlob(
        () => raporApi.getPdfLegerBlob(kelasId, tpId, semId),
        'Buku Leger (Landscape)'
      );
    },
    [openPdfBlob, options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printP5 = useCallback(
    (siswaId: string, customTpId?: string, customSemId?: string) => {
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      if (!tpId || !semId) {
        showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
        return;
      }
      void openPdfBlob(
        () => raporApi.getPdfP5Blob(siswaId, tpId, semId),
        'Rapor Projek P5'
      );
    },
    [openPdfBlob, options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printSkl = useCallback(
    (siswaId: string) => {
      if (!siswaId) return;
      void openPdfBlob(() => raporApi.getPdfSklBlob(siswaId), 'Surat Keterangan Lulus (SKL)');
    },
    [openPdfBlob]
  );

  const printUkk = useCallback(
    (siswaId: string) => {
      if (!siswaId) return;
      void openPdfBlob(() => raporApi.getPdfUkkBlob(siswaId), 'Sertifikat Uji Kompetensi Keahlian (UKK)');
    },
    [openPdfBlob]
  );

  const printPkl = useCallback(
    (siswaPklId: string) => {
      if (!siswaPklId) return;
      void openPdfBlob(() => raporApi.getPdfPklBlob(siswaPklId), 'Rapor Praktik Kerja Lapangan (PKL)');
    },
    [openPdfBlob]
  );

  return {
    printCover,
    printBiodata,
    printRaporSemester,
    printRaporSumatif,
    printLeger,
    printP5,
    printSkl,
    printUkk,
    printPkl,
    activePrintingDoc,
  };
}
