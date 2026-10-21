export const getRedisUrl = (): string => {
  const envUrl = String(process.env.REDIS_URL || '').trim();
  const password = String(process.env.REDIS_PASSWORD || '').trim();
  let base = envUrl.length > 0 ? envUrl : 'redis://127.0.0.1:6379';
  // Normalize localhost to 127.0.0.1 to avoid Windows IPv6 (::1) ETIMEDOUT hang
  base = base.replace('redis://localhost:', 'redis://127.0.0.1:');
  if (password.length === 0) return base;
  if (!base.startsWith('redis://')) return base;
  if (base.includes('@')) return base; // already has auth section
  const injected = base.replace('redis://', `redis://:${password}@`);
  return injected;
};
