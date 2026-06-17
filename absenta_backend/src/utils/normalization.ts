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
