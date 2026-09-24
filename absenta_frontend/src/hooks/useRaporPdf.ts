import { useCallback, useState } from 'react';
import { raporApi } from '../api/rapor.api';
import { useToast } from './useToast';
import { useRaporRenderStore } from '../store/raporRenderStore';
import {
  generateRaporPdf,
  generateP5RaporPdf,
  generateCoverRaporPdf,
  generateBiodataSiswaPdf,
  generateLegerPdf,
  generateRaporSumatifPdf,
} from '../utils/print/modules/pdfRapor';

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
    async (fetcher: () => Promise<{ data: BlobPart }>, docTitle: string, filename?: string) => {
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      setActivePrintingDoc(docTitle);
      startRender(docTitle, 1, `Mengambil berkas ${docTitle} dari server...`);
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        updateProgress({
          stage: 'processing',
          stageText: `Mengolah data dan stempel ${docTitle}...`,
          progressPercent: 65,
        });
        const response = await fetcher();
        updateProgress({
          stage: 'rendering',
          stageText: `Merender dokumen PDF resmi...`,
          progressPercent: 90,
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(blob);
        const cleanFilename = filename || `${docTitle.replace(/\s+/g, '_')}.pdf`;
        finishRender(blobUrl, cleanFilename, `${docTitle} berhasil dikompilasi!`);
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
        failRender(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [showToast]
  );

  const printCover = useCallback(
    async (siswaId: string, customTpId?: string, customSemId?: string) => {
      if (!siswaId) return;
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      const docTitle = 'Cover Rapor';
      setActivePrintingDoc(docTitle);
      startRender(docTitle, 1, `Menyiapkan ${docTitle}...`);
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        updateProgress({ stage: 'processing', stageText: 'Memuat format sampul resmi...', progressPercent: 65 });
        const { blobUrl, filename } = await generateCoverRaporPdf({
          siswaId,
          tahunPelajaranId: tpId,
          semesterId: semId,
        });
        updateProgress({ stage: 'rendering', stageText: 'Merender sampul dokumen...', progressPercent: 95 });
        finishRender(blobUrl, filename, `${docTitle} berhasil dikompilasi!`);
        showToast(`${docTitle} berhasil dibuka`, 'success');
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || `Gagal membuka ${docTitle}.`;
        failRender(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printBiodata = useCallback(
    async (siswaId: string) => {
      if (!siswaId) return;
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      const docTitle = 'Biodata Siswa (Buku Induk)';
      setActivePrintingDoc(docTitle);
      startRender(docTitle, 1, `Menyiapkan ${docTitle}...`);
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        updateProgress({ stage: 'processing', stageText: 'Memuat data diri dan orang tua...', progressPercent: 65 });
        const { blobUrl, filename } = await generateBiodataSiswaPdf({ siswaId });
        updateProgress({ stage: 'rendering', stageText: 'Merender lembar biodata...', progressPercent: 95 });
        finishRender(blobUrl, filename, `${docTitle} berhasil dikompilasi!`);
        showToast(`${docTitle} berhasil dibuka`, 'success');
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || `Gagal membuka ${docTitle}.`;
        failRender(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [showToast]
  );

  const printRaporSemester = useCallback(
    async (siswaId: string, customTpId?: string, customSemId?: string) => {
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      if (!tpId || !semId) {
        showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
        return;
      }
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      const docTitle = 'Rapor Semester (CK1 & CK2)';
      setActivePrintingDoc(docTitle);
      startRender(docTitle, 1, `Mengambil data ${docTitle}...`);
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        updateProgress({
          stage: 'processing',
          stageText: `Mengolah data dan menyusun format nilai...`,
          progressPercent: 65,
        });
        const { blobUrl, filename } = await generateRaporPdf({
          siswaId,
          tahunPelajaranId: tpId,
          semesterId: semId,
        });
        updateProgress({
          stage: 'rendering',
          stageText: `Merender dokumen PDF resmi...`,
          progressPercent: 95,
        });
        finishRender(blobUrl, filename, `${docTitle} berhasil dikompilasi!`);
        showToast(`${docTitle} berhasil dibuka`, 'success');
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || `Gagal membuka ${docTitle}.`;
        failRender(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printRaporSumatif = useCallback(
    async (siswaId: string, customTpId?: string, customSemId?: string) => {
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      if (!tpId || !semId) {
        showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
        return;
      }
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      const docTitle = 'Rapor Penilaian Sumatif';
      setActivePrintingDoc(docTitle);
      startRender(docTitle, 1, `Menyiapkan ${docTitle}...`);
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        updateProgress({ stage: 'processing', stageText: 'Memuat capaian kompetensi sumatif...', progressPercent: 65 });
        const { blobUrl, filename } = await generateRaporSumatifPdf({
          siswaId,
          tahunPelajaranId: tpId,
          semesterId: semId,
        });
        updateProgress({ stage: 'rendering', stageText: 'Merender rapor sumatif...', progressPercent: 95 });
        finishRender(blobUrl, filename, `${docTitle} berhasil dikompilasi!`);
        showToast(`${docTitle} berhasil dibuka`, 'success');
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || `Gagal membuka ${docTitle}.`;
        failRender(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printLeger = useCallback(
    async (kelasId: string, customTpId?: string, customSemId?: string, customKelasNama?: string) => {
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
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      const docTitle = 'Buku Leger (Landscape)';
      setActivePrintingDoc(docTitle);
      startRender(docTitle, 1, `Mengambil data ${docTitle}...`);
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        updateProgress({ stage: 'processing', stageText: 'Menyusun rekapitulasi nilai...', progressPercent: 65 });
        const { blobUrl, filename } = await generateLegerPdf({
          kelasId,
          tahunPelajaranId: tpId,
          semesterId: semId,
          kelasNama: customKelasNama,
        });
        updateProgress({ stage: 'rendering', stageText: 'Merender buku leger...', progressPercent: 95 });
        finishRender(blobUrl, filename, `${docTitle} berhasil dikompilasi!`);
        showToast(`${docTitle} berhasil dibuka`, 'success');
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || `Gagal membuka ${docTitle}.`;
        failRender(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [options.tahunPelajaranId, options.semesterId, showToast]
  );

  const printP5 = useCallback(
    async (siswaId: string, customTpId?: string, customSemId?: string) => {
      const tpId = customTpId || options.tahunPelajaranId;
      const semId = customSemId || options.semesterId;
      if (!tpId || !semId) {
        showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
        return;
      }
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      const docTitle = 'Rapor Projek P5';
      setActivePrintingDoc(docTitle);
      startRender(docTitle, 1, `Mengambil data ${docTitle}...`);
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      showToast(`Menyiapkan ${docTitle}...`, 'info');
      try {
        updateProgress({
          stage: 'processing',
          stageText: `Mengolah data penilaian projek...`,
          progressPercent: 65,
        });
        const { blobUrl, filename } = await generateP5RaporPdf({
          siswaId,
          tahunPelajaranId: tpId,
          semesterId: semId,
        });
        updateProgress({
          stage: 'rendering',
          stageText: `Merender dokumen PDF resmi...`,
          progressPercent: 95,
        });
        finishRender(blobUrl, filename, `${docTitle} berhasil dikompilasi!`);
        showToast(`${docTitle} berhasil dibuka`, 'success');
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || `Gagal membuka ${docTitle}.`;
        failRender(errorMsg);
        showToast(errorMsg, 'error');
      } finally {
        setActivePrintingDoc(null);
      }
    },
    [options.tahunPelajaranId, options.semesterId, showToast]
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
