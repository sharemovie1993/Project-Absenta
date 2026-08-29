/**
 * 🔐 Shared Auth Security Utilities & Constants
 */

export const BCRYPT_ROUNDS = 12;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Satu sumber kebenaran JWT Secret.
 * Fail-fast: throw jika JWT_SECRET tidak di-set atau terlalu pendek (< 32 char) di production.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (String(process.env.NODE_ENV).toLowerCase() === 'production') {
      throw new Error('[SECURITY] JWT_SECRET wajib diisi dan minimal 32 karakter di environment production!');
    }
    return 'absenta-dev-secret-key-32-chars!!';
  }
  return secret;
};

/**
 * Mask email atau identifier untuk keamanan logging (PDPA / privacy protection)
 */
export const maskIdentifier = (input?: string | null): string => {
  if (!input) return '';
  const str = String(input).trim();
  if (!str.includes('@')) {
    if (str.length <= 4) return '***';
    return `${str.slice(0, 2)}***${str.slice(-2)}`;
  }
  const [local, domain] = str.split('@');
  const maskedLocal = local.length > 2 
    ? `${local.slice(0, 2)}***${local.slice(-1)}`
    : `${local.slice(0, 1)}***`;
  return `${maskedLocal}@${domain}`;
};
