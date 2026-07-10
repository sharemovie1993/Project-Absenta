export interface NomenklaturProgram {
  nama: string;
  kode: string;
  singkatan: string;
}

export interface NomenklaturBidang {
  bidang: string;
  programs: NomenklaturProgram[];
}

export const SPEKTRUM_SMK_2024: NomenklaturBidang[] = [
  {
    bidang: "Teknologi Konstruksi dan Properti",
    programs: [
      { nama: "Teknik Konstruksi dan Perumahan", kode: "TKP", singkatan: "TKP" },
      { nama: "Desain Pemodelan dan Informasi Bangunan", kode: "DPIB", singkatan: "DPIB" },
      { nama: "Teknik Geomatika", kode: "TGEO", singkatan: "TGEO" },
      { nama: "Teknik Perawatan Gedung", kode: "TPG", singkatan: "TPG" },
      { nama: "Konstruksi dan Perawatan Bangunan Sipil", kode: "KPBS", singkatan: "KPBS" },
      { nama: "Teknik Furnitur", kode: "TFUR", singkatan: "TFUR" }
    ]
  },
  {
    bidang: "Teknologi Manufaktur dan Rekayasa",
    programs: [
      { nama: "Teknik Mesin", kode: "TM", singkatan: "TM" },
      { nama: "Teknik Otomotif", kode: "TO", singkatan: "TO" },
      { nama: "Teknik Pengelasan dan Fabrikasi Logam", kode: "TPFL", singkatan: "TPFL" },
      { nama: "Teknik Logistik", kode: "TLOG", singkatan: "TLOG" },
      { nama: "Teknik Elektronika", kode: "TE", singkatan: "TE" },
      { nama: "Teknik Pesawat Udara", kode: "TPU", singkatan: "TPU" },
      { nama: "Teknik Konstruksi Kapal", kode: "TKK", singkatan: "TKK" },
      { nama: "Kimia Analisis", kode: "KA", singkatan: "KA" },
      { nama: "Teknik Kimia Industri", kode: "TKI", singkatan: "TKI" },
      { nama: "Teknik Tekstil", kode: "TT", singkatan: "TT" }
    ]
  },
  {
    bidang: "Energi dan Pertambangan",
    programs: [
      { nama: "Teknik Ketenagalistrikan", kode: "TKL", singkatan: "TKL" },
      { nama: "Teknik Energi Terbarukan", kode: "TET", singkatan: "TET" },
      { nama: "Teknik Geospasial", kode: "TGS", singkatan: "TGS" },
      { nama: "Teknik Geologi Pertambangan", kode: "TGP", singkatan: "TGP" },
      { nama: "Teknik Perminyakan", kode: "TPM", singkatan: "TPM" }
    ]
  },
  {
    bidang: "Teknologi Informasi",
    programs: [
      { nama: "Pengembangan Perangkat Lunak dan Gim", kode: "PPLG", singkatan: "PPLG" },
      { nama: "Teknik Jaringan Komputer dan Telekomunikasi", kode: "TJKT", singkatan: "TJKT" }
    ]
  },
  {
    bidang: "Kesehatan dan Pekerjaan Sosial",
    programs: [
      { nama: "Layanan Kesehatan", kode: "LKES", singkatan: "LKES" },
      { nama: "Teknik Laboratorium Medik", kode: "TLM", singkatan: "TLM" },
      { nama: "Teknologi Farmasi", kode: "TFAR", singkatan: "TFAR" },
      { nama: "Pekerjaan Sosial", kode: "PEKSOS", singkatan: "PEKSOS" }
    ]
  },
  {
    bidang: "Agribisnis dan Agriteknologi",
    programs: [
      { nama: "Agribisnis Tanaman", kode: "ATAN", singkatan: "ATAN" },
      { nama: "Agribisnis Ternak", kode: "ATER", singkatan: "ATER" },
      { nama: "Agribisnis Perikanan", kode: "APIK", singkatan: "APIK" },
      { nama: "Usaha Pertanian Terpadu", kode: "UPT", singkatan: "UPT" },
      { nama: "Agriteknologi Pengolahan Hasil Pertanian", kode: "APHP", singkatan: "APHP" },
      { nama: "Kehutanan", kode: "HUT", singkatan: "HUT" }
    ]
  },
  {
    bidang: "Kemaritiman",
    programs: [
      { nama: "Nautika Kapal Penangkapan Ikan", kode: "NKPI", singkatan: "NKPI" },
      { nama: "Teknika Kapal Penangkapan Ikan", kode: "TKPI", singkatan: "TKPI" },
      { nama: "Nautika Kapal Niaga", kode: "NKN", singkatan: "NKN" },
      { nama: "Teknika Kapal Niaga", kode: "TKN", singkatan: "TKN" },
      { nama: "Agribisnis Perikanan Air Payau dan Laut", kode: "APAPL", singkatan: "APAPL" }
    ]
  },
  {
    bidang: "Bisnis dan Manajemen",
    programs: [
      { nama: "Pemasaran", kode: "PM", singkatan: "PM" },
      { nama: "Manajemen Perkantoran dan Layanan Bisnis", kode: "MPLB", singkatan: "MPLB" },
      { nama: "Akuntansi dan Keuangan Lembaga", kode: "AKL", singkatan: "AKL" },
      { nama: "Logistik", kode: "LOG", singkatan: "LOG" }
    ]
  },
  {
    bidang: "Pariwisata",
    programs: [
      { nama: "Usaha Layanan Pariwisata", kode: "ULP", singkatan: "ULP" },
      { nama: "Perhotelan", kode: "PH", singkatan: "PH" },
      { nama: "Kuliner", kode: "KLN", singkatan: "KLN" },
      { nama: "Kecantikan dan Spa", kode: "KSP", singkatan: "KSP" }
    ]
  },
  {
    bidang: "Seni dan Ekonomi Kreatif",
    programs: [
      { nama: "Seni Rupa", kode: "SR", singkatan: "SR" },
      { nama: "Desain Komunikasi Visual", kode: "DKV", singkatan: "DKV" },
      { nama: "Desain dan Produksi Kriya", kode: "DPKR", singkatan: "DPKR" },
      { nama: "Seni Pertunjukan", kode: "SP", singkatan: "SP" },
      { nama: "Broadcasting dan Perfilman", kode: "BP", singkatan: "BP" },
      { nama: "Animasi", kode: "ANM", singkatan: "ANM" },
      { nama: "Busana", kode: "BSN", singkatan: "BSN" }
    ]
  }
];
