import { hubinApi, type SiswaPkl, type AbsensiPkl } from '@/api/hubin.api';
import type { LogbookItem } from './tabs/PklJurnalTab';
import type { SiswaBimbinganItem } from './types';

export function mapSiswaBimbingan(rawList: SiswaPkl[]): SiswaBimbinganItem[] {
  return rawList.map((p) => {
    const s = p.Siswa || ({} as any);
    const m = p.Mitra || ({} as any);
    return {
      id: p.id,
      siswa_id: p.siswa_id,
      nama_siswa: s.nama_siswa || 'Siswa PKL',
      nis: s.nis || '-',
      kelas: s.Kelas?.nama_kelas || 'Kelas XII',
      mitra_id: p.mitra_id,
      nama_mitra: m.nama || 'Mitra Industri DU/DI',
      alamat_mitra: m.alamat || '',
      kontak_mitra: s.no_hp || '',
      pembimbing_industri: p.Pembimbing?.nama_guru || 'Instruktur DU/DI',
      tanggal_mulai: p.tanggal_mulai || '2026-07-15',
      tanggal_selesai: p.tanggal_selesai || '2026-11-30',
      status: p.status || 'AKTIF',
      total_kehadiran: 45,
      jurnal_pending_count: p.jurnal_json?.status === 'MENUNGGU_REVIEW' ? 1 : 0,
      nilai_akhir: p.nilai_json?.nilai_akhir || null,
      predikat: p.nilai_json?.predikat || '',
    };
  });
}

/**
 * Maps raw SiswaPkl placements and AbsensiPkl entries into unified LogbookItems for PklJurnalTab.
 */
export function extractLogbooksFromPenempatan(rawList: SiswaPkl[]): LogbookItem[] {
  const result: LogbookItem[] = [];

  rawList.forEach((p) => {
    const s = p.Siswa || ({} as any);
    const m = p.Mitra || ({} as any);
    const absList: AbsensiPkl[] = (p as any).AbsensiPkl || [];

    absList.forEach((a) => {
      if (!a.kegiatan) return;

      let kegiatanText = '';
      let parsedActivities: any[] = [];
      try {
        const parsed = JSON.parse(a.kegiatan || '[]');
        if (Array.isArray(parsed)) {
          parsedActivities = parsed;
          kegiatanText = parsed
            .filter((act: any) => act.type !== 'FEEDBACK')
            .map((act: any) => `${act.time ? `[${act.time}] ` : ''}${act.text}`)
            .join('\n');
        } else {
          kegiatanText = String(a.kegiatan);
        }
      } catch {
        kegiatanText = a.kegiatan || '';
      }

      const cleanKegiatan = kegiatanText.trim();
      const textWithoutAlasan = cleanKegiatan.replace(/^\[Alasan Presensi:[^\]]+\]\s*/i, '').trim();

      // Jurnal HANYA muncul di Verifikasi Jurnal jika siswa sudah mengisi catatan kegiatan magang
      if (!textWithoutAlasan || textWithoutAlasan === '[]') return;

      const feedbackAct = parsedActivities.find(
        (act: any) => act.type === 'FEEDBACK' || act.text?.startsWith('[Feedback Pembimbing]')
      );
      const catatanPembimbing = feedbackAct
        ? feedbackAct.text.replace('[Feedback Pembimbing]: ', '')
        : undefined;

      const isReviewed = Boolean(a.is_verified);
      const isRevisi = Boolean(catatanPembimbing && !isReviewed);
      const statusVerifikasi: 'MENUNGGU_REVIEW' | 'DISETUJUI' | 'REVISI' = isReviewed
        ? 'DISETUJUI'
        : isRevisi
        ? 'REVISI'
        : 'MENUNGGU_REVIEW';

      const tglFormatted = a.tanggal ? a.tanggal.split('T')[0] : 'Hari ini';

      result.push({
        id: a.id,
        penempatan_id: p.id,
        nama_siswa: s.nama_siswa || 'Siswa PKL',
        kelas: s.Kelas?.nama_kelas || 'Kelas XII',
        nama_mitra: m.nama || 'Mitra Industri DU/DI',
        tanggal: tglFormatted,
        jam_masuk: a.jam_masuk,
        jam_pulang: a.jam_pulang,
        kegiatan: cleanKegiatan,
        image_url: a.image_url,
        status_verifikasi: statusVerifikasi,
        catatan_pembimbing: catatanPembimbing,
      });
    });
  });

  return result;
}

export async function rejectLogbookAction(
  rawList: SiswaPkl[],
  logbookId: string,
  catatan: string
) {
  const target = rawList.find((p) => (p as any).AbsensiPkl?.some((a: any) => a.id === logbookId));
  if (!target) throw new Error('Penempatan tidak ditemukan');
  const targetAbs = (target as any).AbsensiPkl?.find((a: any) => a.id === logbookId);
  let parsed: any[] = [];
  try {
    parsed = JSON.parse(targetAbs?.kegiatan || '[]');
    if (!Array.isArray(parsed)) parsed = [{ time: '08:00', text: String(targetAbs?.kegiatan || '') }];
  } catch {
    parsed = [{ time: '08:00', text: String(targetAbs?.kegiatan || '') }];
  }
  const feedback = {
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    text: `[Feedback Pembimbing]: ${catatan.trim()}`,
    type: 'FEEDBACK',
  };
  return hubinApi.updateLogbook(target.id, JSON.stringify([...parsed, feedback]), logbookId);
}
