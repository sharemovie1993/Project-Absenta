import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

export const appLogger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

