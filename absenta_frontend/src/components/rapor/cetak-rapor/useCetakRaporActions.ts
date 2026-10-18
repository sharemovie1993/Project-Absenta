import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { raporApi } from '../../../api/rapor.api';
import {
  generateRaporPdf,
  generateP5RaporPdf,
  generateRaporKelasBatchPdf,
  generateBiodataKelasBatchPdf,
  generateRaporSumatifKelasBatchPdf,
  generateP5KelasBatchPdf,
  generateBundelRaporKelasBatchPdf,
} from '../../../utils/print/modules/pdfRapor';
import { useRaporRenderStore } from '../../../store/raporRenderStore';
import {
  LegerStudent,
  AcademicYear,
  Semester,
} from '../../../types/cetakRapor.types';
import { KelasOptionItem } from './useRaporPklPrint';

interface UseCetakRaporActionsProps {
  selectedKelas: string;
  activeYear: AcademicYear | null;
  activeSemester: Semester | null;
  currentKelasObj?: KelasOptionItem;
  filteredStudents: LegerStudent[];
}

export function useCetakRaporActions({
  selectedKelas,
  activeYear,
  activeSemester,
  currentKelasObj,
  filteredStudents,
}: UseCetakRaporActionsProps) {
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [batchLoadingType, setBatchLoadingType] = useState<string | null>(null);

  const handlePrintRapor = useCallback(
    async (student: LegerStudent) => {
      if (!activeYear?.id || !activeSemester?.id) {
        toast.error('Tahun pelajaran / semester belum tersedia');
        return;
      }
      const key = `rapor_${student.id}`;
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      setPdfLoading((prev) => ({ ...prev, [key]: true }));
      startRender(`Rapor Semester - ${student.nama_siswa}`, 1, `Mengambil data capaian ${student.nama_siswa}...`);
      updateProgress({ stage: 'fetching', progressPercent: 25 });
      try {
        updateProgress({ stage: 'processing', stageText: 'Menyusun narasi Capaian Pembelajaran & nilai...', progressPercent: 60 });
        const { blobUrl, filename } = await generateRaporPdf({
          siswaId: student.id,
          tahunPelajaranId: activeYear.id,
          semesterId: activeSemester.id,
          tahunPelajaranNama: activeYear.nama ?? '',
          semesterNama: activeSemester.nama ?? '',
        });
        updateProgress({ stage: 'rendering', stageText: 'Merender tata letak 2 halaman PDF...', progressPercent: 90 });
        finishRender(blobUrl, filename, `Rapor Semester ${student.nama_siswa} siap!`);
        toast.success(`Pratinjau Rapor ${student.nama_siswa} dibuka di tab baru`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failRender(msg);
        toast.error(`Gagal membuat PDF Rapor: ${msg}`);
      } finally {
        setPdfLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [activeYear, activeSemester]
  );

  const handlePrintP5 = useCallback(
    async (student: LegerStudent) => {
      if (!activeYear?.id || !activeSemester?.id) {
        toast.error('Tahun pelajaran / semester belum tersedia');
        return;
      }
      const key = `p5_${student.id}`;
      const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
      setPdfLoading((prev) => ({ ...prev, [key]: true }));
      startRender(`Rapor P5 - ${student.nama_siswa}`, 1, 'Mengambil dimensi & instrumen projek P5...');
      updateProgress({ stage: 'fetching', progressPercent: 30 });
      try {
        updateProgress({ stage: 'processing', stageText: 'Menghitung capaian elemen profil kelulusan...', progressPercent: 65 });
        const { blobUrl, filename } = await generateP5RaporPdf({
          siswaId: student.id,
          tahunPelajaranId: activeYear.id,
          semesterId: activeSemester.id,
          tahunPelajaranNama: activeYear.nama ?? '',
          semesterNama: activeSemester.nama ?? '',
        });
        updateProgress({ stage: 'rendering', stageText: 'Merender tata letak matriks P5...', progressPercent: 90 });
        finishRender(blobUrl, filename, `Rapor P5 ${student.nama_siswa} siap!`);
        toast.success(`Pratinjau Rapor P5 ${student.nama_siswa} dibuka di tab baru`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failRender(msg);
        toast.error(`Gagal membuat PDF P5: ${msg}`);
      } finally {
        setPdfLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [activeYear, activeSemester]
  );

  const handleExportLeger = useCallback(async () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas, tahun pelajaran, dan semester terlebih dahulu');
      return;
    }
    toast.info('Menyiapkan ekspor file Excel Leger Kelas...');
    try {
      const response = await raporApi.exportLegerBlob({
        kelas_id: selectedKelas,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const kelasName = currentKelasObj?.nama_kelas || currentKelasObj?.nama || 'Kelas';
      const cleanTpName = activeYear.nama?.replace(/[/\\?%*:|"<>]/g, '-') || 'TP';
      const cleanSemName = activeSemester.nama || 'Sem';
      link.download = `Leger_${kelasName}_TP_${cleanTpName}_Sem_${cleanSemName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('File Excel Leger Kelas berhasil diunduh');
    } catch (err: unknown) {
      let msg = 'Gagal mengekspor file Excel Leger Kelas.';
      const typedErr = err as {
        response?: { data?: Blob | { message?: string } };
        message?: string;
      };
      if (typedErr?.response?.data instanceof Blob) {
        try {
          const rawText = await typedErr.response.data.text();
          const parsed = JSON.parse(rawText);
          if (parsed?.message) {
            msg = parsed.message;
          }
        } catch {
          // Fallback to default
        }
      } else if (typeof typedErr?.response?.data === 'object' && typedErr?.response?.data !== null && 'message' in typedErr.response.data) {
        msg = typedErr.response.data.message || msg;
      } else if (typedErr?.message) {
        msg = typedErr.message;
      }
      toast.error(msg);
    }
  }, [selectedKelas, activeYear, activeSemester, currentKelasObj]);

  // 1. Cetak Massal Rapor Semester CK1 & CK2
  const handleBatchPrintRapor = useCallback(async () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas, tahun pelajaran, dan semester terlebih dahulu');
      return;
    }
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas ini untuk dicetak.');
      return;
    }
    const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
    setIsBatchPrinting(true);
    setBatchLoadingType('rapor_semester');
    startRender('Kompilasi Rapor Semester Sekelas (CK1-CK2)', filteredStudents.length, `Menyiapkan kompilasi cetak massal ${filteredStudents.length} siswa...`);
    updateProgress({ stage: 'fetching', progressPercent: 10 });
    toast.info(`Memproses cetak massal ${filteredStudents.length} Rapor Semester...`);
    try {
      const { blobUrl, filename } = await generateRaporKelasBatchPdf({
        students: filteredStudents,
        tahunPelajaranId: activeYear.id,
        semesterId: activeSemester.id,
        tahunPelajaranNama: activeYear.nama,
        semesterNama: activeSemester.nama,
        kelasNama: currentKelasObj?.nama_kelas || 'Sekelas',
        onProgress: (current, total, studentName) => {
          const percent = Math.min(99, 10 + Math.round((current / total) * 88));
          updateProgress({
            stage: 'rendering',
            stageText: `Merender Rapor Siswa (${current}/${total})...`,
            progressPercent: percent,
            current,
            total,
            detail: `Siswa: ${studentName}`,
          });
        },
      });
      finishRender(blobUrl, filename, `Kompilasi Rapor Sekelas (${filteredStudents.length} Siswa) berhasil dibuat!`);
      toast.success(`Pratinjau Rapor Sekelas (${filteredStudents.length} Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failRender(msg);
      toast.error(`Gagal membuat PDF Batch Rapor: ${msg}`);
    } finally {
      setIsBatchPrinting(false);
      setBatchLoadingType(null);
    }
  }, [selectedKelas, activeYear, activeSemester, filteredStudents, currentKelasObj]);

  // 2. Cetak Massal Biodata & Cover Rapor
  const handleBatchPrintBiodata = useCallback(async () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas, tahun pelajaran, dan semester terlebih dahulu');
      return;
    }
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas ini untuk dicetak.');
      return;
    }
    const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
    setIsBatchPrinting(true);
    setBatchLoadingType('biodata');
    startRender('Kompilasi Biodata & Cover Rapor Sekelas', filteredStudents.length, `Menyiapkan cetak biodata 17 butir ${filteredStudents.length} siswa...`);
    updateProgress({ stage: 'fetching', progressPercent: 10 });
    toast.info(`Memproses cetak massal ${filteredStudents.length} Biodata & Cover Siswa...`);
    try {
      const { blobUrl, filename } = await generateBiodataKelasBatchPdf({
        students: filteredStudents,
        tahunPelajaranId: activeYear.id,
        semesterId: activeSemester.id,
        tahunPelajaranNama: activeYear.nama,
        semesterNama: activeSemester.nama,
        kelasNama: currentKelasObj?.nama_kelas || 'Sekelas',
        onProgress: (current, total, studentName) => {
          const percent = Math.min(99, 10 + Math.round((current / total) * 88));
          updateProgress({
            stage: 'rendering',
            stageText: `Merender Biodata Siswa (${current}/${total})...`,
            progressPercent: percent,
            current,
            total,
            detail: `Siswa: ${studentName}`,
          });
        },
      });
      finishRender(blobUrl, filename, `Kompilasi Biodata Sekelas (${filteredStudents.length} Siswa) berhasil dibuat!`);
      toast.success(`Pratinjau Biodata Sekelas (${filteredStudents.length} Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failRender(msg);
      toast.error(`Gagal membuat PDF Batch Biodata: ${msg}`);
    } finally {
      setIsBatchPrinting(false);
      setBatchLoadingType(null);
    }
  }, [selectedKelas, activeYear, activeSemester, filteredStudents, currentKelasObj]);

  // 3. Cetak Massal Rapor Penilaian Sumatif
  const handleBatchPrintRaporSumatif = useCallback(async () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas, tahun pelajaran, dan semester terlebih dahulu');
      return;
    }
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas ini untuk dicetak.');
      return;
    }
    const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
    setIsBatchPrinting(true);
    setBatchLoadingType('sumatif');
    startRender('Kompilasi Rapor Penilaian Sumatif Sekelas', filteredStudents.length, `Menyiapkan rekap nilai sumatif ${filteredStudents.length} siswa...`);
    updateProgress({ stage: 'fetching', progressPercent: 10 });
    toast.info(`Memproses cetak massal ${filteredStudents.length} Rapor Sumatif Siswa...`);
    try {
      const { blobUrl, filename } = await generateRaporSumatifKelasBatchPdf({
        students: filteredStudents,
        tahunPelajaranId: activeYear.id,
        semesterId: activeSemester.id,
        tahunPelajaranNama: activeYear.nama,
        semesterNama: activeSemester.nama,
        kelasNama: currentKelasObj?.nama_kelas || 'Sekelas',
        onProgress: (current, total, studentName) => {
          const percent = Math.min(99, 10 + Math.round((current / total) * 88));
          updateProgress({
            stage: 'rendering',
            stageText: `Merender Rapor Sumatif (${current}/${total})...`,
            progressPercent: percent,
            current,
            total,
            detail: `Siswa: ${studentName}`,
          });
        },
      });
      finishRender(blobUrl, filename, `Kompilasi Rapor Sumatif Sekelas (${filteredStudents.length} Siswa) berhasil dibuat!`);
      toast.success(`Pratinjau Rapor Sumatif Sekelas (${filteredStudents.length} Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failRender(msg);
      toast.error(`Gagal membuat PDF Batch Rapor Sumatif: ${msg}`);
    } finally {
      setIsBatchPrinting(false);
      setBatchLoadingType(null);
    }
  }, [selectedKelas, activeYear, activeSemester, filteredStudents, currentKelasObj]);

  // 4. Cetak Massal Rapor Projek (P5)
  const handleBatchPrintP5 = useCallback(async () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas, tahun pelajaran, dan semester terlebih dahulu');
      return;
    }
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas ini untuk dicetak.');
      return;
    }
    const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
    setIsBatchPrinting(true);
    setBatchLoadingType('p5');
    startRender('Kompilasi Rapor Projek P5 Sekelas', filteredStudents.length, `Menyiapkan matriks P5 ${filteredStudents.length} siswa...`);
    updateProgress({ stage: 'fetching', progressPercent: 10 });
    toast.info(`Memproses cetak massal ${filteredStudents.length} Rapor P5 Siswa...`);
    try {
      const { blobUrl, filename } = await generateP5KelasBatchPdf({
        students: filteredStudents,
        tahunPelajaranId: activeYear.id,
        semesterId: activeSemester.id,
        tahunPelajaranNama: activeYear.nama,
        semesterNama: activeSemester.nama,
        kelasNama: currentKelasObj?.nama_kelas || 'Sekelas',
        onProgress: (current, total, studentName) => {
          const percent = Math.min(99, 10 + Math.round((current / total) * 88));
          updateProgress({
            stage: 'rendering',
            stageText: `Merender Rapor P5 (${current}/${total})...`,
            progressPercent: percent,
            current,
            total,
            detail: `Siswa: ${studentName}`,
          });
        },
      });
      finishRender(blobUrl, filename, `Kompilasi Rapor P5 Sekelas (${filteredStudents.length} Siswa) berhasil dibuat!`);
      toast.success(`Pratinjau Rapor P5 Sekelas (${filteredStudents.length} Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failRender(msg);
      toast.error(`Gagal membuat PDF Batch Rapor P5: ${msg}`);
    } finally {
      setIsBatchPrinting(false);
      setBatchLoadingType(null);
    }
  }, [selectedKelas, activeYear, activeSemester, filteredStudents, currentKelasObj]);

  // 5. Cetak Massal Bundel Lengkap Rapor (Cover + Biodata + Rapor Semester)
  const handleBatchPrintBundelLengkap = useCallback(async () => {
    if (!selectedKelas || !activeYear?.id || !activeSemester?.id) {
      toast.error('Pilih kelas, tahun pelajaran, dan semester terlebih dahulu');
      return;
    }
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('Tidak ada siswa di kelas ini untuk dicetak.');
      return;
    }
    const { startRender, updateProgress, finishRender, failRender } = useRaporRenderStore.getState();
    setIsBatchPrinting(true);
    setBatchLoadingType('bundel');
    startRender('Kompilasi Bundel Lengkap Rapor Sekelas', filteredStudents.length, `Menyiapkan bundel lengkap (Cover + Bio + Nilai) ${filteredStudents.length} siswa...`);
    updateProgress({ stage: 'fetching', progressPercent: 10 });
    toast.info(`Memproses cetak massal ${filteredStudents.length} Bundel Rapor Lengkap Siswa...`);
    try {
      const { blobUrl, filename } = await generateBundelRaporKelasBatchPdf({
        students: filteredStudents,
        tahunPelajaranId: activeYear.id,
        semesterId: activeSemester.id,
        tahunPelajaranNama: activeYear.nama,
        semesterNama: activeSemester.nama,
        kelasNama: currentKelasObj?.nama_kelas || 'Sekelas',
        onProgress: (current, total, studentName) => {
          const percent = Math.min(99, 10 + Math.round((current / total) * 88));
          updateProgress({
            stage: 'rendering',
            stageText: `Merender Bundel Rapor (${current}/${total})...`,
            progressPercent: percent,
            current,
            total,
            detail: `Siswa: ${studentName}`,
          });
        },
      });
      finishRender(blobUrl, filename, `Kompilasi Bundel Rapor Sekelas (${filteredStudents.length} Siswa) berhasil dibuat!`);
      toast.success(`Pratinjau Bundel Rapor Sekelas (${filteredStudents.length} Siswa) dibuka di tab baru`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failRender(msg);
      toast.error(`Gagal membuat PDF Bundel Rapor: ${msg}`);
    } finally {
      setIsBatchPrinting(false);
      setBatchLoadingType(null);
    }
  }, [selectedKelas, activeYear, activeSemester, filteredStudents, currentKelasObj]);

  return {
    pdfLoading,
    setPdfLoading,
    isBatchPrinting,
    batchLoadingType,
    handlePrintRapor,
    handlePrintP5,
    handleExportLeger,
    handleBatchPrintRapor,
    handleBatchPrintBiodata,
    handleBatchPrintRaporSumatif,
    handleBatchPrintP5,
    handleBatchPrintBundelLengkap,
  };
}
