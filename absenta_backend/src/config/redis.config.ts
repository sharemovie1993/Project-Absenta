export const getRedisUrl = (): string => {
  const envUrl = String(process.env.REDIS_URL || '').trim();
  const password = String(process.env.REDIS_PASSWORD || '').trim();
  const base = envUrl.length > 0 ? envUrl : 'redis://localhost:6379';
  if (password.length === 0) return base;
  if (!base.startsWith('redis://')) return base;
  if (base.includes('@')) return base; // already has auth section
  const injected = base.replace('redis://', `redis://:${password}@`);
  return injected;
};
