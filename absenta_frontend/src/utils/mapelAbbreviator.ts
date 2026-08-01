/**
 * Utility to smartly abbreviate long Indonesian subject names for clean UI display.
 */

const KNOWN_SUBJECT_MAP: Record<string, string> = {
  'pendidikan agama dan budi pekerti': 'PAI',
  'pendidikan agama islam dan budi pekerti': 'PAI',
  'pendidikan agama kristen dan budi pekerti': 'PA-Kristen',
  'pendidikan agama katolik dan budi pekerti': 'PA-Katolik',
  'pendidikan agama hindu dan budi pekerti': 'PA-Hindu',
  'pendidikan agama buddha dan budi pekerti': 'PA-Buddha',
  'pendidikan agama khonghucu dan budi pekerti': 'PA-Khonghucu',
  'pendidikan pancasila dan kewarganegaraan': 'PPKn',
  'pendidikan pancasila': 'Pancasila',
  'bahasa indonesia': 'B. Indo',
  'bahasa inggris': 'B. Inggris',
  'bahasa sunda': 'B. Sunda',
  'bahasa jawa': 'B. Jawa',
  'bahasa jepang': 'B. Jepang',
  'bahasa mandarin': 'B. Mandarin',
  'matematika': 'MTK',
  'matematika tingkat lanjut': 'MTK Lanjut',
  'pendidikan jasmani olahraga dan kesehatan': 'PJOK',
  'pendidikan jasmani, olahraga, dan kesehatan': 'PJOK',
  'ilmu pengetahuan alam': 'IPA',
  'ilmu pengetahuan sosial': 'IPS',
  'projek ilmu pengetahuan alam dan sosial': 'IPAS',
  'projek kreatif dan kewirausahaan': 'PKK',
  'prakarya dan kewirausahaan': 'PKWU',
  'sejarah indonesia': 'Sejarah',
  'sejarah': 'Sejarah',
  'seni budaya': 'Seni Budaya',
  'seni musik': 'Seni Musik',
  'seni rupa': 'Seni Rupa',
  'seni tari': 'Seni Tari',
  'seni teater': 'Seni Teater',
  'bimbingan dan konseling': 'BK',
  'teknologi informasi dan komunikasi': 'TIK',
  'informatika': 'Informatika',
};

/**
 * Returns a short, clean subject name suitable for tight UI badges and headers.
 * e.g., "Pendidikan Agama dan Budi Pekerti" => "PAI"
 */
export function getShortSubjectName(fullSubjectName?: string): string {
  if (!fullSubjectName || !fullSubjectName.trim()) return '—';

  const cleanName = fullSubjectName.trim();
  const lower = cleanName.toLowerCase();

  // 1. Direct match in dictionary
  if (KNOWN_SUBJECT_MAP[lower]) {
    return KNOWN_SUBJECT_MAP[lower];
  }

  // 2. Partial match check for common prefixes
  for (const [key, shortVal] of Object.entries(KNOWN_SUBJECT_MAP)) {
    if (lower.includes(key)) {
      return shortVal;
    }
  }

  // 3. If name is reasonably short (<= 15 chars), keep original
  if (cleanName.length <= 15) {
    return cleanName;
  }

  // 4. Fallback smart abbreviation generator for custom long subject names
  return cleanName
    .replace(/Pendidikan Agama Islam/gi, 'PAI')
    .replace(/Pendidikan Agama/gi, 'Agama')
    .replace(/Pendidikan/gi, 'Pend.')
    .replace(/dan Budi Pekerti/gi, '')
    .replace(/Ilmu Pengetahuan/gi, 'IP')
    .replace(/Kewirausahaan/gi, 'KWU')
    .replace(/Keahlian/gi, 'Keahlian')
    .trim();
}
