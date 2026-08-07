import React from 'react';

export interface SopRuleMatrixItem {
  rule: string;
  limit: string;
  impact: string;
  consequence: string;
}

export interface SopSection {
  title: string;
  type: 'rules_matrix' | 'bullet_list' | 'alert_box';
  matrixData?: SopRuleMatrixItem[];
  bullets?: string[];
  alertContent?: {
    variant: 'info' | 'warning' | 'important';
    text: string;
  };
}

export interface SopPersonaTab {
  id: string;
  title: string;
  roleTag: string;
  sections: SopSection[];
}

export interface ModuleSopConfig {
  moduleKey: string;
  moduleName: string;
  badgeText: string;
  description: string;
  tabs: SopPersonaTab[];
}

export const DEFAULT_MODULE_SOPS: Record<string, (jenjang?: string) => ModuleSopConfig> = {
  piket: (jenjang = 'SMK') => {
    const isSmk = jenjang.toUpperCase() === 'SMK';
    const isSd = jenjang.toUpperCase() === 'SD';
    const durationMin = isSd ? 35 : 45;

    return {
      moduleKey: 'piket',
      moduleName: 'Modul Piket & Perizinan Keluar Siswa',
      badgeText: `Jenjang ${jenjang.toUpperCase()} • Max ${durationMin}m`,
      description: `SOP resmi tata cara penerbitan izin keluar sementara, izin pulang awal, dan ${isSmk ? 'piket jurusan/bengkel' : 'dispensasi'}.`,
      tabs: [
        {
          id: 'siswa',
          title: '👨‍🎓 Siswa',
          roleTag: 'Siswa / Peserta Didik',
          sections: [
            {
              title: 'Matriks Batas Waktu & Hak Siswa',
              type: 'rules_matrix',
              matrixData: [
                {
                  rule: 'Izin Keluar Sementara',
                  limit: `Maksimal ${durationMin} Menit (1 JP)`,
                  impact: 'Status Sesi: tetap HADIR dengan Catatan Izin',
                  consequence: `> ${durationMin}m tanpa kembali: Terhitung ALPA [BOLOS] & WA Ortu terkirim`
                },
                {
                  rule: 'Dispensasi Tugas Sekolah',
                  limit: 'Sesuai Surat Tugas (> 1 JP)',
                  impact: 'Status Sesi: DISPEN',
                  consequence: 'Wajib menyerahkan bukti tugas ke Guru Piket'
                },
                {
                  rule: 'Izin Pulang Awal',
                  limit: 'Permanen Sisa Hari Ini',
                  impact: 'Status Sesi: IZIN (Badge PULANG AWAL)',
                  consequence: 'Wajib dijemput Orang Tua / Konfirmasi Piket'
                }
              ]
            },
            {
              title: 'Prosedur Wajib Siswa',
              type: 'bullet_list',
              bullets: [
                `Wajib melapor kembali ke Ruang Piket / Satpam sebelum batas waktu ${durationMin} menit berakhir.`,
                'Dilarang meninggalkan area sekolah tanpa Surat Izin resmi bercetak/QR dari Guru Piket.',
                isSmk ? 'Siswa yang bertugas Piket Jurusan / Bengkel wajib mendaftar melalui Persona Piket Jurusan.' : 'Siswa yang mengikuti kegiatan organisasi wajib melampirkan izin pembina.'
              ]
            }
          ]
        },
        {
          id: 'guru_mapel',
          title: '👨‍🏫 Guru Mapel',
          roleTag: 'Guru Pengajar Sesi',
          sections: [
            {
              title: 'Panduan Presensi Sesi KBM',
              type: 'bullet_list',
              bullets: [
                'Layar Presensi KBM menampilkan Badge Visual otomatis saat siswa memiliki izin dari Piket.',
                'Status siswa Pulang Awal dikunci secara soft-lock ke IZIN agar tidak terabsen HADIR secara tak sengaja.',
                'Gunakan tombol "Override Manual" jika mengonfirmasi bahwa siswa secara fisik sudah kembali berada di kelas.'
              ]
            }
          ]
        },
        {
          id: 'guru_piket',
          title: '🛡️ Guru Piket',
          roleTag: 'Petugas Piket & Gerbang',
          sections: [
            {
              title: 'Tanggung Jawab Operasional',
              type: 'bullet_list',
              bullets: [
                `Batas maksimal Izin Keluar Sementara adalah ${durationMin} menit. Gunakan PULANG_AWAL untuk sakit > 1 JP.`,
                'Pantau tabel Siswa Sedang di Luar pada dasbor operational Meja Piket.',
                'Gunakan tombol Aksi 1-Klik (WA Siswa / WA Ortu / Eskalasi BK) jika durasi siswa memasuki Status Merah Overstay.'
              ]
            }
          ]
        },
        {
          id: 'ortu',
          title: '👨‍👩‍👧 Orang Tua',
          roleTag: 'Orang Tua / Wali Murid',
          sections: [
            {
              title: 'Notifikasi & Keselamatan',
              type: 'bullet_list',
              bullets: [
                'Orang tua menerima notifikasi otomatis via WhatsApp jika siswa terdeteksi Overstay belum kembali ke sekolah.',
                'Penjemputan Pulang Awal wajib diverifikasi oleh Petugas Piket demi keselamatan siswa.'
              ]
            }
          ]
        }
      ]
    };
  },
  kbm_absensi: (jenjang = 'SMK') => {
    const isSd = jenjang.toUpperCase() === 'SD';
    const durationMin = isSd ? 35 : 45;

    return {
      moduleKey: 'kbm_absensi',
      moduleName: 'Modul Presensi Sesi KBM Kelas',
      badgeText: `Sesi KBM • ${durationMin}m / JP`,
      description: 'SOP tata cara pengisian presensi sesi KBM, batas keterlambatan, dan integrasi data Piket.',
      tabs: [
        {
          id: 'guru_mapel',
          title: '👨‍🏫 Guru Mapel',
          roleTag: 'Pengampu Jam KBM',
          sections: [
            {
              title: 'Aturan Pengisian Presensi Sesi',
              type: 'bullet_list',
              bullets: [
                'Wajib membuka dan mengisi presensi sesi KBM tepat pada awal jam pelajaran.',
                'Siswa yang tidak hadir tanpa keterangan dari Piket diisi ALPA.',
                'Integrasi Piket otomatis menandai siswa yang sedang Izin Sementara, Dispensasi, atau Pulang Awal.'
              ]
            }
          ]
        }
      ]
    };
  }
};
