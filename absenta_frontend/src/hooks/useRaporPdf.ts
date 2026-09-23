import { useCallback } from 'react';
import { raporApi } from '../api/rapor.api';
import { useToast } from './useToast';

export interface UseRaporPdfOptions {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export function useRaporPdf(options: UseRaporPdfOptions = {}) {
  const { showToast } = useToast();

  const openPdf = useCallback((url: string) => {
    if (!url) {
      showToast('Gagal membentuk tautan dokumen cetak', 'error');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [showToast]);

  const printCover = useCallback((siswaId: string) => {
    if (!siswaId) return;
    const url = raporApi.getPdfCoverUrl(siswaId);
    openPdf(url);
  }, [openPdf]);

  const printBiodata = useCallback((siswaId: string) => {
    if (!siswaId) return;
    const url = raporApi.getPdfBiodataUrl(siswaId);
    openPdf(url);
  }, [openPdf]);

  const printRaporSemester = useCallback((siswaId: string, customTpId?: string, customSemId?: string) => {
    const tpId = customTpId || options.tahunPelajaranId;
    const semId = customSemId || options.semesterId;
    if (!tpId || !semId) {
      showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
      return;
    }
    const url = raporApi.getPdfRaporUrl(siswaId, tpId, semId);
    openPdf(url);
  }, [openPdf, options.tahunPelajaranId, options.semesterId, showToast]);

  const printRaporSumatif = useCallback((siswaId: string, customTpId?: string, customSemId?: string) => {
    const tpId = customTpId || options.tahunPelajaranId;
    const semId = customSemId || options.semesterId;
    if (!tpId || !semId) {
      showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
      return;
    }
    const url = raporApi.getPdfRaporSumatifUrl(siswaId, tpId, semId);
    openPdf(url);
  }, [openPdf, options.tahunPelajaranId, options.semesterId, showToast]);

  const printLeger = useCallback((kelasId: string, customTpId?: string, customSemId?: string) => {
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
    const url = raporApi.getPdfLegerUrl(kelasId, tpId, semId);
    openPdf(url);
  }, [openPdf, options.tahunPelajaranId, options.semesterId, showToast]);

  const printP5 = useCallback((siswaId: string, customTpId?: string, customSemId?: string) => {
    const tpId = customTpId || options.tahunPelajaranId;
    const semId = customSemId || options.semesterId;
    if (!tpId || !semId) {
      showToast('Pilih Tahun Pelajaran dan Semester terlebih dahulu', 'warning');
      return;
    }
    const url = raporApi.getPdfP5Url(siswaId, tpId, semId);
    openPdf(url);
  }, [openPdf, options.tahunPelajaranId, options.semesterId, showToast]);

  const printSkl = useCallback((siswaId: string) => {
    if (!siswaId) return;
    const url = raporApi.getPdfSklUrl(siswaId);
    openPdf(url);
  }, [openPdf]);

  const printUkk = useCallback((siswaId: string) => {
    if (!siswaId) return;
    const url = raporApi.getPdfUkkUrl(siswaId);
    openPdf(url);
  }, [openPdf]);

  const printPkl = useCallback((siswaPklId: string) => {
    if (!siswaPklId) return;
    const url = raporApi.getPdfPklUrl(siswaPklId);
    openPdf(url);
  }, [openPdf]);

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
  };
}
