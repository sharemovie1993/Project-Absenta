export interface AssignmentFlagDef {
  flag: string;
  label: string;
  isLeader: boolean;
  canSignDocument: boolean;
  description: string;
}

export const DIVISION_ASSIGNMENT_FLAGS: Record<string, AssignmentFlagDef[]> = {
  KURIKULUM: [
    {
      flag: 'WAKA_KURIKULUM',
      label: 'Waka. Kurikulum',
      isLeader: true,
      canSignDocument: true,
      description: 'Pimpinan & Penandatangan Resmi Dokumen Akademik, Kalender, KBM, dan Rapor',
    },
    {
      flag: 'SUB_PENJADWALAN',
      label: 'Bidang Penjadwalan & KBM',
      isLeader: false,
      canSignDocument: false,
      description: 'Penyusunan jadwal pelajaran, distribusi jam mengajar, dan penataan ruang kelas',
    },
    {
      flag: 'SUB_ASESMEN_MONEV',
      label: 'Bidang Asesmen & Ujian',
      isLeader: false,
      canSignDocument: true,
      description: 'Pengelolaan CBT, ANBK, Sumatif Semester, dan Berita Acara Ujian',
    },
    {
      flag: 'SUB_KOSP_PERANGKAT',
      label: 'Bidang KOSP & Perangkat Ajar',
      isLeader: false,
      canSignDocument: false,
      description: 'Penyusunan KOSP, modul ajar, dan telaah Alur Tujuan Pembelajaran (ATP)',
    },
    {
      flag: 'SUB_PROJEK_P5',
      label: 'Koordinator Projek P5',
      isLeader: false,
      canSignDocument: true,
      description: 'Pengelolaan tema projek P5, fasilitator projek, dan pengesahan rapor P5',
    },
    {
      flag: 'SUB_ADMIN_KURIKULUM',
      label: 'Administrasi Kurikulum',
      isLeader: false,
      canSignDocument: false,
      description: 'Pengarsipan administrasi akademik, berkas mengajar guru, dan surat keluar dinas kurikulum',
    },
  ],

  KESISWAAN: [
    {
      flag: 'WAKA_KESISWAAN',
      label: 'Waka. Kesiswaan',
      isLeader: true,
      canSignDocument: true,
      description: 'Pimpinan & Penandatangan Surat Peringatan, Dispensasi Lomba, dan Kebijakan Pembinaan Siswa',
    },
    {
      flag: 'SUB_KEDISIPLINAN_TATIB',
      label: 'Bidang Ketertiban & Disiplin',
      isLeader: false,
      canSignDocument: true,
      description: 'Penegakan tata tertib harian, rekapitulasi poin pelanggaran, dan razia berkala',
    },
    {
      flag: 'SUB_OSIS_MPK',
      label: 'Pembina OSIS & MPK',
      isLeader: false,
      canSignDocument: false,
      description: 'Pembinaan organisasi siswa, kepemimpinan LDKS, dan pemilihan ketua OSIS',
    },
    {
      flag: 'SUB_PRESTASI_LOMBA',
      label: 'Bidang Bakat & Prestasi',
      isLeader: false,
      canSignDocument: false,
      description: 'Pembinaan kontingen perlombaan siswa (O2SN, FLS2N, LKS, OSN) dan pemetaan minat',
    },
    {
      flag: 'SUB_KARAKTER_PEMBIASAAN',
      label: 'Bidang Karakter & Pembiasaan',
      isLeader: false,
      canSignDocument: false,
      description: 'Pengelolaan apel pagi, upacara bendera, pembiasaan ibadah Dhuha, dan budaya positif',
    },
    {
      flag: 'SUB_PPKSP_SATGAS',
      label: 'Satgas Pencegahan Kekerasan (PPKSP)',
      isLeader: false,
      canSignDocument: true,
      description: 'Penanganan pencegahan perundungan dan kekerasan di lingkungan sekolah (Permendikbudristek No. 46/2023)',
    },
  ],

  HUBIN: [
    {
      flag: 'WAKA_HUBIN',
      label: 'Waka. Hubinmas',
      isLeader: true,
      canSignDocument: true,
      description: 'Pimpinan & Penandatangan MoU Industri, Penugasan PKL, dan Pengesahan Sertifikat Industri',
    },
    {
      flag: 'SUB_KEMITRAAN_DUDI',
      label: 'Bidang Kemitraan DUDI & MoU',
      isLeader: false,
      canSignDocument: false,
      description: 'Penjajakan kerja sama industri, sinkronisasi kurikulum DUDI, dan Guru Tamu',
    },
    {
      flag: 'SUB_OPERASIONAL_PKL',
      label: 'Bidang Penempatan & Monev PKL',
      isLeader: false,
      canSignDocument: true,
      description: 'Plotting siswa PKL, penjadwalan guru pembimbing lapangan, dan monitoring berkala',
    },
    {
      flag: 'SUB_BKK_PENYALURAN',
      label: 'Ketua Bursa Kerja Khusus (BKK)',
      isLeader: false,
      canSignDocument: true,
      description: 'Penyaluran lulusan ke dunia kerja, informasi lowongan, dan penyelenggaraan Job Fair',
    },
    {
      flag: 'SUB_TRACER_STUDY',
      label: 'Bidang Penelusuran Alumni',
      isLeader: false,
      canSignDocument: false,
      description: 'Pelacakan status keterserapan alumni (BMW: Bekerja, Melanjutkan, Wirausaha)',
    },
    {
      flag: 'SUB_TEFA_UNIT_PRODUKSI',
      label: 'Koordinator Teaching Factory (TeFa)',
      isLeader: false,
      canSignDocument: false,
      description: 'Pengembangan unit produksi berbasis pesanan industri dan komersialisasi produk siswa',
    },
  ],

  SARPRAS: [
    {
      flag: 'WAKA_SARPRAS',
      label: 'Waka. Sarpras',
      isLeader: true,
      canSignDocument: true,
      description: 'Pimpinan & Penandatangan BAST Pengadaan, Validasi RAB, dan Rekomendasi Penghapusan Aset',
    },
    {
      flag: 'SUB_INVENTARIS_KIR',
      label: 'Bidang Inventarisasi & Aset',
      isLeader: false,
      canSignDocument: false,
      description: 'Penyusunan Kartu Inventaris Ruangan (KIR), pelabelan barcode, dan pencatatan aset tetap',
    },
    {
      flag: 'SUB_MAINTENANCE_GEDUNG',
      label: 'Bidang Pemeliharaan & K3',
      isLeader: false,
      canSignDocument: false,
      description: 'Perawatan berkala fasilitas fisik, instalasi listrik/air, dan standar keselamatan K3/K7',
    },
    {
      flag: 'SUB_LOGISTIK_HABIS_PAKAI',
      label: 'Bidang Pengadaan & Logistik',
      isLeader: false,
      canSignDocument: false,
      description: 'Penerimaan bahan praktik KBM, ATK kantor, dan stock opname logistik habis pakai',
    },
  ],

  TU_KEPALA: [
    {
      flag: 'KOORDINATOR_TU',
      label: 'Kepala / Koordinator TU',
      isLeader: true,
      canSignDocument: true,
      description: 'Pimpinan Tenaga Kependidikan, Legalisir Dokumen, dan Buku Ekspedisi Persuratan Dinas',
    },
    {
      flag: 'SUB_PERSURATAN_ARSIP',
      label: 'Staf Persuratan & Ekspedisi',
      isLeader: false,
      canSignDocument: false,
      description: 'Penomoran surat, buku agenda masuk/keluar, dan pengarsipan fisik/digital',
    },
    {
      flag: 'SUB_KEUANGAN_SPP',
      label: 'Bendahara SPP & Kas Sekolah',
      isLeader: false,
      canSignDocument: true,
      description: 'Penerbitan kwitansi SPP/DSP, rekapitulasi pembayaran siswa, dan buku kas pembantu',
    },
    {
      flag: 'SUB_KEPEGAWAIAN_DAPODIK',
      label: 'Operator Dapodik & Kepegawaian',
      isLeader: false,
      canSignDocument: true,
      description: 'Sinkronisasi Dapodiknas, update berkas GTK, dan SPTJM Kepala Sekolah',
    },
  ],

  BPBK: [
    {
      flag: 'KOORDINATOR_BK',
      label: 'Koordinator BP/BK',
      isLeader: true,
      canSignDocument: true,
      description: 'Pimpinan Layanan Bimbingan Konseling dan Penandatangan Surat Panggilan Orang Tua',
    },
    {
      flag: 'SUB_KONSELOR_SISWA',
      label: 'Guru BK / Konselor Siswa',
      isLeader: false,
      canSignDocument: false,
      description: 'Pelaksanaan konseling individual, bimbingan kelompok, dan pembinaan karakter',
    },
  ],
};

export const getAssignmentFlagsForPosition = (positionCode: string): AssignmentFlagDef[] => {
  const normalized = String(positionCode || '').toUpperCase();
  return DIVISION_ASSIGNMENT_FLAGS[normalized] || [];
};

export const getFlagLabel = (positionCode: string, flagCode?: string | null): string | null => {
  if (!flagCode) return null;
  const flags = getAssignmentFlagsForPosition(positionCode);
  const found = flags.find(f => f.flag === flagCode);
  return found ? found.label : null;
};
