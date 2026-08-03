import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { PiketSecurity } from '../../components/piket/PiketSecurity';
import { piketApi, piketQueryKeys, type IzinKeluarSiswa } from '../../api/piket.api';
import { usePiketIzinKeluarOptions } from '../../hooks/usePiketIzinKeluarOptions';

export default function PiketSecurityStandalonePage() {
  const queryClient = useQueryClient();

  const [verificationResult, setVerificationResult] = useState<{
    status: 'IDLE' | 'VALID' | 'INVALID';
    permit?: IzinKeluarSiswa;
    message?: string;
  }>({ status: 'IDLE' });

  // Fetch daily permits using custom hook with 3-second real-time background polling
  const { rawList: dailyPermits, refetch: refetchPermits } = usePiketIzinKeluarOptions({ refetchInterval: 3000 });

  // Handle Mark Returned
  const handleMarkReturned = useCallback(async (id: string, namaSiswa: string): Promise<boolean> => {
    try {
      const res = await piketApi.markReturned(id);
      if (res.success) {
        toast.success(`Siswa ${namaSiswa} dinyatakan telah kembali ke sekolah`);
        queryClient.invalidateQueries({ queryKey: piketQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: ['piket-harian-list'] });
        queryClient.invalidateQueries({ queryKey: ['piket-harian'] });
        refetchPermits();
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error(err);
      const e = err as { message?: string };
      toast.error(e.message || 'Gagal memproses kepulangan siswa');
      return false;
    }
  }, [queryClient, refetchPermits]);

  // Handle Security Verification Selection
  const handleSecuritySelect = useCallback((permit: IzinKeluarSiswa) => {
    if (permit.status === 'KEMBALI') {
      setVerificationResult({
        status: 'INVALID',
        message: `IZIN SUDAH EXPIRED: Siswa ${permit.SiswaAkademik?.siswa.nama_siswa} sudah kembali sebelumnya!`
      });
      toast.error('Verifikasi Gagal: Izin kedaluwarsa');
    } else {
      setVerificationResult({
        status: 'VALID',
        permit,
        message: `IZIN VALID: ${permit.SiswaAkademik?.siswa.nama_siswa} diperbolehkan keluar`
      });
      toast.success('Verifikasi Berhasil: Izin Valid');
    }
  }, []);

  // Handle Enter/Scan Code
  const handleSecurityEnter = useCallback((code?: string) => {
    if (!code) return;
    const t = code.trim().toLowerCase();

    const match = dailyPermits.find(
      p => p.id.toLowerCase() === t ||
        String(p.SiswaAkademik?.siswa.nis || '').toLowerCase() === t ||
        String(p.SiswaAkademik?.siswa.no_rfid || '').toLowerCase() === t ||
        String((p.SiswaAkademik?.siswa as Record<string, unknown>)?.id || '').toLowerCase() === t
    );

    if (match) {
      handleSecuritySelect(match);
    } else {
      setVerificationResult({
        status: 'INVALID',
        message: `TIDAK ADA IZIN AKTIF HARI INI untuk NIS / Kartu / QR: "${code}"`
      });
      toast.error('Verifikasi Gagal: Tidak ada izin aktif');
    }
  }, [dailyPermits, handleSecuritySelect]);

  return (
    <AcademicPageLayout
      title="Pos Satpam: Verifikasi Gerbang & Izin Keluar"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kesiswaan', path: '/kesiswaan' },
        { label: 'Pos Satpam Gerbang', path: '/kesiswaan/pos-keamanan' }
      ]}
      hardeningModuleKey="kesiswaan_pos_keamanan"
      instruction={{
        title: "Panduan Pos Satpam & Petugas Gerbang",
        description: "Halaman khusus ini digunakan oleh Petugas Keamanan / Satpam Gerbang untuk memverifikasi keabsahan surat izin keluar siswa di gerbang sekolah.",
        items: [
          { text: "Pindai QR Code pada slip siswa atau tempelkan kartu RFID siswa ke reader." },
          { text: "Verifikasi status hijau (IZIN VALID) sebelum mengizinkan siswa melewati gerbang." },
          { text: "Klik tombol 'Siswa Kembali' ketika siswa kembali memasuki gerbang sekolah." }
        ]
      }}
    >
      <div className="w-full py-2">
        <PiketSecurity
          dailyPermits={dailyPermits}
          verificationResult={verificationResult}
          setVerificationResult={setVerificationResult}
          handleSecuritySelect={handleSecuritySelect}
          handleSecurityEnter={handleSecurityEnter}
          handleMarkReturned={handleMarkReturned}
        />
      </div>
    </AcademicPageLayout>
  );
}
