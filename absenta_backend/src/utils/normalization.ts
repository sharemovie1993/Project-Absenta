/**
 * Smart Normalization Utility
 * Handles string sanitization and fuzzy matching for human-entered data.
 */

/**
 * Deep sanitization of a string:
 * 1. Trim leading/trailing spaces
 * 2. Convert to lowercase
 * 3. Collapse multiple spaces into one
 * 4. Remove non-printable characters
 */
export function sanitizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[^\x20-\x7E]/g, ''); // Remove non-printable characters
}

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy matching typos.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, (_, i) => i)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Returns a similarity score between 0 and 1.
 */
export function getSimilarity(a: string, b: string): number {
  const sa = sanitizeString(a);
  const sb = sanitizeString(b);
  
  if (sa === sb) return 1.0;
  if (sa.length === 0 || sb.length === 0) return 0;

  const distance = getLevenshteinDistance(sa, sb);
  const maxLength = Math.max(sa.length, sb.length);
  
  return (maxLength - distance) / maxLength;
}

/**
 * Finds the best match from a list of candidates.
 */
export function findBestMatch(
  input: string, 
  candidates: string[], 
  threshold = 0.85
): { match: string | null; score: number; isExact: boolean } {
  const sanitizedInput = sanitizeString(input);
  if (!sanitizedInput) return { match: null, score: 0, isExact: false };

  let bestMatch: string | null = null;
  let highestScore = 0;

  for (const candidate of candidates) {
    const sanitizedCandidate = sanitizeString(candidate);
    
    // Check for exact normalized match first (O(1) effectively)
    if (sanitizedInput === sanitizedCandidate) {
      return { match: candidate, score: 1.0, isExact: true };
    }

    const score = getSimilarity(sanitizedInput, sanitizedCandidate);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = candidate;
    }
  }

  if (highestScore >= threshold) {
    return { match: bestMatch, score: highestScore, isExact: false };
  }

  return { match: null, score: highestScore, isExact: false };
}

const ID_MONTH_MAP: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1, febuari: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, agu: 7, ags: 7, agt: 7, aug: 7, august: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9, oct: 9, october: 9,
  november: 10, nov: 10,
  desember: 11, des: 11, dec: 11, december: 11
};

/**
 * Universal Smart Date Parser for Indonesian & International formats
 * Handles:
 * - 20/07/2023, 20-07-2023, 20.07.2023 (DD/MM/YYYY)
 * - 20 Jul 2023, 20 Juli 2023, 20-Juli-2023 (DD Month YYYY)
 * - 2023/07/20, 2023-07-20, 2023.07.20 (YYYY/MM/DD)
 * - 20/07/23 (DD/MM/YY)
 * - Excel Serial Date Numbers (e.g. 45127)
 * - ISO Strings & JS Date objects
 */
export function parseSmartDate(val: any): Date | undefined {
  if (val === null || val === undefined) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  // 1. Handle Excel Serial Number (e.g. 45127 = 2023-07-20)
  if (typeof val === 'number') {
    if (val > 1000 && val < 100000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date;
    }
    return undefined;
  }

  const str = String(val).trim();
  if (!str || str === '-' || str === 'KOSONG' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return undefined;
  }

  // Clean string: replace commas, tabs, extra spaces
  const cleanedStr = str.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  // 2. Pattern: Text Month, e.g. "20 Juli 2023", "20 Jul 2023", "20-Juli-2023", "20/Jul/2023"
  const textMonthRegex = /^(\d{1,2})[\s\/\.-]+([a-zA-Z]{3,10})[\s\/\.-]+(\d{4})$/;
  const textMatch = cleanedStr.match(textMonthRegex);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monthKey = textMatch[2].toLowerCase();
    const year = parseInt(textMatch[3], 10);
    const monthIndex = ID_MONTH_MAP[monthKey];

    if (monthIndex !== undefined && day >= 1 && day <= 31 && year > 1900) {
      const d = new Date(Date.UTC(year, monthIndex, day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Pattern: Numeric parts split by / . - or space
  const parts = cleanedStr.split(/[\/\.-]/).map(p => p.trim());
  if (parts.length === 3) {
    let y = 0, m = 0, d = 0;

    if (parts[0].length === 4) {
      // Format: YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else if (parts[2].length === 4) {
      // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (Standard Indonesian Format)
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
    } else if (parts[2].length === 2) {
      // Format: DD/MM/YY (e.g. 20/07/23)
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      const shortYear = parseInt(parts[2], 10);
      y = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
    }

    if (y > 1900 && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const parsedDate = new Date(Date.UTC(y, m, d));
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
  }

  // 4. Standard Date fallback (handles ISO 8601 like 2023-07-20T00:00:00Z)
  const directParsed = new Date(str);
  if (!isNaN(directParsed.getTime())) return directParsed;

  return undefined;
}

export function parseSmartDateISO(val: any): string | undefined {
  const d = parseSmartDate(val);
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

/**
 * Smart Universal Phone Number Normalizer
 * Cleans human-formatted phone numbers (with +, spaces, hyphens, dots, parentheses)
 * and normalizes them into E.164 international format for WhatsApp API.
 * 
 * Examples:
 * - "+62 896-2441-3887"   -> "6289624413887"
 * - "0896-2441-3887"       -> "6289624413887"
 * - "+62 (896) 2441.3887"  -> "6289624413887"
 * - "6289624413887@c.us"    -> "6289624413887"
 */
export function normalizePhone(val: any): string {
  if (val === null || val === undefined) return '';
  
  let raw = String(val).trim();
  if (!raw) return '';

  // Remove WhatsApp suffix if present (@c.us, @s.whatsapp.net)
  raw = raw.split('@')[0];

  // Remove all non-digit characters (plus, minus, spaces, dots, parentheses)
  let digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  // Handle Indonesian local format (08xxx -> 628xxx)
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  }

  return digits;
}

export function formatStandardIndonesianPhone(val: any): string | null {
  if (val === null || val === undefined) return null;
  let raw = String(val).trim();
  if (!raw) return null;

  raw = raw.split('@')[0];
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('62')) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('8')) {
    digits = '0' + digits;
  }

  if (digits.startsWith('08') && digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  if (digits.length >= 7 && digits.length <= 15) {
    return digits.startsWith('0') ? digits : '0' + digits;
  }

  return null;
}

export function formatWAJid(val: any): string {
  const phone = normalizePhone(val);
  if (!phone) return '';
  return `${phone}@s.whatsapp.net`;
}
