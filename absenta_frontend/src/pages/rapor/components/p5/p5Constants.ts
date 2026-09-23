import { SearchableSelectOption } from '@/components/ui/SearchableSelect';

export const P5_TEMA_OPTIONS: SearchableSelectOption[] = [
  { value: 'Kewirausahaan', label: 'Kewirausahaan' },
  { value: 'Kebekerjaan', label: 'Kebekerjaan (Wajib Vokasi / SMK)' },
  { value: 'Gaya Hidup Berkelanjutan', label: 'Gaya Hidup Berkelanjutan' },
  { value: 'Kearifan Lokal', label: 'Kearifan Lokal' },
  { value: 'Bhinneka Tunggal Ika', label: 'Bhinneka Tunggal Ika' },
  { value: 'Bangunlah Jiwa dan Raganya', label: 'Bangunlah Jiwa dan Raganya' },
  { value: 'Suara Demokrasi', label: 'Suara Demokrasi' },
  { value: 'Rekayasa dan Teknologi', label: 'Rekayasa dan Teknologi' },
];

export const P5_FASE_OPTIONS: SearchableSelectOption[] = [
  { value: 'Fase E', label: 'Fase E (Kelas X SMK)' },
  { value: 'Fase F', label: 'Fase F (Kelas XI - XII SMK)' },
];

export const P5_DIMENSI_OPTIONS: SearchableSelectOption[] = [
  { value: '', label: '-- Pilih Dimensi Profil Pancasila --' },
  { value: 'Mandiri', label: 'Mandiri' },
  { value: 'Kreatif', label: 'Kreatif' },
  { value: 'Gotong Royong', label: 'Gotong Royong' },
  { value: 'Bernalar Kritis', label: 'Bernalar Kritis' },
  { value: 'Berkebinekaan Global', label: 'Berkebinekaan Global' },
  { value: 'Beriman & Bertakwa', label: 'Beriman, Bertakwa kepada Tuhan YME, & Berakhlak Mulia' },
];

export const P5_SUB_ELEMEN_MAP: Record<string, SearchableSelectOption[]> = {
  'Mandiri': [
    { value: '', label: '-- Pilih Sub-Elemen --' },
    { 
      value: 'Mengenali kualitas dan minat diri serta tantangan yang dihadapi & Mengembangkan refleksi diri', 
      label: 'Pemahaman Diri: Mengenali kualitas & minat diri serta tantangan yang dihadapi' 
    },
    { 
      value: 'Regulasi emosi, penetapan tujuan dan rencana strategis pengembangan diri dan prestasi serta memiliki inisiatif dan bekerja secara mandiri', 
      label: 'Regulasi Diri: Regulasi emosi, rencana strategis pengembangan diri, inisiatif mandiri & resilien' 
    },
    {
      value: 'Percaya diri, resilien, dan adaptif dalam menghadapi situasi baru',
      label: 'Adaptabilitas: Percaya diri, resilien, dan adaptif menghadapi situasi baru'
    }
  ],
  'Kreatif': [
    { value: '', label: '-- Pilih Sub-Elemen --' },
    { 
      value: 'Menghasilkan gagasan yang beragam dan tepat sesuai dengan kebutuhan masyarakat terhadap sebuah permasalahan', 
      label: 'Gagasan Orisinal: Menghasilkan gagasan beragam & tepat guna menyelesaikan masalah' 
    },
    { 
      value: 'Mengeksplorasi dan mengekspresikan pikiran dan perasaannya kedalam sebuah karya dan tindakan nyata', 
      label: 'Karya Nyata: Mengeksplorasi dan mengekspresikan pikiran ke dalam karya nyata' 
    },
    { 
      value: 'Mampu mengevaluasi tindakan dan gagasan yang sudah dimiliki serta mengetahui kesesuaian dengan kebutuhan masyarakat umum', 
      label: 'Keluwesan Berpikir: Mengevaluasi tindakan dan gagasan sesuai kebutuhan masyarakat' 
    }
  ],
  'Gotong Royong': [
    { value: '', label: '-- Pilih Sub-Elemen --' },
    { 
      value: 'Kerjasama, komunikasi untuk mencapai tujuan bersama, saling ketergantungan positif dan koordinasi sosial', 
      label: 'Kolaborasi: Kerjasama, komunikasi pencapaian tujuan bersama & koordinasi sosial' 
    },
    { 
      value: 'Tanggap terhadap lingkungan sosial, persepsi sosial, dan kebutuhan bersama', 
      label: 'Kepedulian: Tanggap terhadap lingkungan sosial dan persepsi sosial' 
    },
    { 
      value: 'Membagi peran dan menyelaraskan tindakan dalam kelompok supaya tercipta keselarasan dan keterbukaan dalam berbagi', 
      label: 'Berbagi: Membagi peran, menyelaraskan tindakan & keterbukaan berbagi' 
    }
  ],
  'Bernalar Kritis': [
    { value: '', label: '-- Pilih Sub-Elemen --' },
    { 
      value: 'Mengajukan pertanyaan, mengidentifikasi, mengklarifikasi, dan mengolah informasi dan gagasan', 
      label: 'Memperoleh Informasi: Mengidentifikasi, mengklarifikasi, dan mengolah informasi' 
    },
    { 
      value: 'Menganalisis dan mengevaluasi penalaran serta prosedur yang digunakan dalam penyelesaian masalah', 
      label: 'Analisis Penalaran: Menganalisis & mengevaluasi penalaran dan prosedur' 
    },
    { 
      value: 'Merefleksi dan mengevaluasi pemikirannya sendiri serta mempertimbangkan berbagai perspektif', 
      label: 'Refleksi Pemikiran: Merefleksi & mengevaluasi proses pemikiran sendiri' 
    }
  ],
  'Berkebinekaan Global': [
    { value: '', label: '-- Pilih Sub-Elemen --' },
    { 
      value: 'Mendalami budaya dan identitas budaya serta mengeksplorasi dinamika budaya yang majemuk', 
      label: 'Mengenal Budaya: Mendalami budaya, identitas budaya & dinamika majemuk' 
    },
    { 
      value: 'Berkomunikasi dan berinteraksi secara efektif dan santun dengan orang dari latar budaya yang berbeda', 
      label: 'Komunikasi Interkultural: Komunikasi efektif & interaksi antar budaya' 
    },
    { 
      value: 'Menghilangkan stereotip, prasangka, dan menyelaraskan perbedaan dalam pergaulan sosial', 
      label: 'Refleksi Kebinekaan: Menghilangkan stereotip, prasangka, dan menyelaraskan perbedaan' 
    }
  ],
  'Beriman & Bertakwa': [
    { value: '', label: '-- Pilih Sub-Elemen --' },
    { 
      value: 'Memahami nilai-nilai agama dan mempraktikkannya dalam kehidupan sehari-hari dengan akhlak mulia', 
      label: 'Akhlak Beragama: Menghayati nilai agama dalam perbuatan sehari-hari' 
    },
    { 
      value: 'Integritas dan merawat diri secara fisik, mental, dan spiritual dengan penuh rasa syukur', 
      label: 'Akhlak Pribadi: Integritas & merawat diri secara fisik, mental, spiritual' 
    },
    { 
      value: 'Mengutamakan persamaan dengan orang lain dan menghargai perbedaan demi persatuan bangsa', 
      label: 'Akhlak kepada Sesama: Mengutamakan persamaan & menghargai perbedaan' 
    },
    { 
      value: 'Menjaga kelestarian lingkungan hidup dan alam sekitar sebagai amanah Tuhan', 
      label: 'Akhlak kepada Alam: Menjaga kelestarian alam lingkungan sekitar' 
    }
  ]
};

export const P5_KUALIFIKASI_OPTIONS: SearchableSelectOption[] = [
  { value: 'BB', label: 'BB (Belum Berkembang)' },
  { value: 'MB', label: 'MB (Mulai Berkembang)' },
  { value: 'BSH', label: 'BSH (Berkembang Sesuai Harapan)' },
  { value: 'SB', label: 'SB (Sangat Berkembang)' },
];

export const P5_DEFAULT_CATATAN: Record<string, string> = {
  'SB': 'Siswa mengembangkan kemampuannya melampaui harapan',
  'BSH': 'Siswa telah mengembangkan kemampuan hingga berada dalam tahap ajek',
  'MB': 'Siswa mulai menunjukkan peningkatan kemampuan pada aspek ini',
  'BB': 'Siswa masih membutuhkan bimbingan dalam mengembangkan kemampuannya',
};

export const P5_AVAILABLE_DIMENSI = [
  { id: 'Mandiri', label: 'Mandiri', desc: 'Regulasi diri, inisiatif, dan percaya diri' },
  { id: 'Gotong Royong', label: 'Gotong Royong', desc: 'Kolaborasi, kepedulian sosial, dan berbagi' },
  { id: 'Kreatif', label: 'Kreatif', desc: 'Gagasan orisinal, karya nyata, dan keluwesan berpikir' },
  { id: 'Bernalar Kritis', label: 'Bernalar Kritis', desc: 'Memperoleh info, analisis penalaran, dan refleksi' },
  { id: 'Berkebinekaan Global', label: 'Berkebinekaan Global', desc: 'Mengenal budaya, komunikasi interkultural, refleksi' },
  { id: 'Beriman & Bertakwa', label: 'Beriman & Bertakwa', desc: 'Akhlak beragama, pribadi, sesama, dan alam' },
];

/**
 * Pemetaan pasangan dimensi sasaran resmi Kemendikbudristek berdasarkan tema P5
 */
export const P5_THEME_RECOMMENDED_DIMENSI: Record<string, string[]> = {
  'Kewirausahaan': ['Mandiri', 'Gotong Royong', 'Kreatif'],
  'Kebekerjaan': ['Mandiri', 'Gotong Royong', 'Bernalar Kritis'],
  'Gaya Hidup Berkelanjutan': ['Beriman & Bertakwa', 'Bernalar Kritis', 'Gotong Royong'],
  'Kearifan Lokal': ['Berkebinekaan Global', 'Kreatif', 'Gotong Royong'],
  'Bhinneka Tunggal Ika': ['Berkebinekaan Global', 'Beriman & Bertakwa', 'Gotong Royong'],
  'Bangunlah Jiwa dan Raganya': ['Beriman & Bertakwa', 'Mandiri', 'Gotong Royong'],
  'Suara Demokrasi': ['Bernalar Kritis', 'Berkebinekaan Global', 'Gotong Royong'],
  'Rekayasa dan Teknologi': ['Bernalar Kritis', 'Kreatif', 'Mandiri'],
};

/**
 * Format deskripsi projek dengan tag metadata tema, fase, dan dimensi
 */
export function formatProjekDeskripsi(
  tema: string,
  fase: string,
  rawDesc: string,
  dimensiList: string[] = []
): string {
  const cleanDesc = (rawDesc || '').trim();
  const dimensiTag = dimensiList.length > 0 ? ` [Dimensi: ${dimensiList.join('|')}]` : '';
  return `[Tema: ${tema}] [Fase: ${fase}]${dimensiTag}\n${cleanDesc}`;
}

/**
 * Ekstraksi metadata tema, fase, dimensi, dan deskripsi murni dari teks deskripsi tersimpan
 */
export function parseProjekMetadata(deskripsi?: string | null): {
  tema: string;
  fase: string;
  dimensiList: string[];
  cleanDesc: string;
} {
  if (!deskripsi) {
    return {
      tema: 'Kewirausahaan',
      fase: 'Fase F',
      dimensiList: ['Mandiri', 'Gotong Royong', 'Kreatif'],
      cleanDesc: '',
    };
  }

  let tema = 'Kewirausahaan';
  let fase = 'Fase F';
  let dimensiList: string[] = [];
  let cleanDesc = deskripsi;

  const temaMatch = deskripsi.match(/\[Tema:\s*([^\]]+)\]/i);
  if (temaMatch && temaMatch[1]) {
    tema = temaMatch[1].trim();
    cleanDesc = cleanDesc.replace(temaMatch[0], '');
  }

  const faseMatch = deskripsi.match(/\[Fase:\s*([^\]]+)\]/i);
  if (faseMatch && faseMatch[1]) {
    fase = faseMatch[1].trim();
    cleanDesc = cleanDesc.replace(faseMatch[0], '');
  }

  const dimensiMatch = deskripsi.match(/\[Dimensi:\s*([^\]]+)\]/i);
  if (dimensiMatch && dimensiMatch[1]) {
    dimensiList = dimensiMatch[1]
      .split(/[|,]/)
      .map((d) => d.trim())
      .filter(Boolean);
    cleanDesc = cleanDesc.replace(dimensiMatch[0], '');
  } else {
    // Default fallback if project was created without specific dimensions tag
    dimensiList = ['Mandiri', 'Gotong Royong', 'Kreatif'];
  }

  return {
    tema,
    fase,
    dimensiList,
    cleanDesc: cleanDesc.trim(),
  };
}

/**
 * Mengambil sub-elemen default untuk dimensi tertentu
 */
export function getDefaultSubElemen(dimensi: string): string {
  const list = P5_SUB_ELEMEN_MAP[dimensi];
  if (list && list.length > 1) {
    return list[1].value;
  }
  return dimensi;
}
