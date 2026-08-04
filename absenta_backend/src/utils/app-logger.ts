import pino from 'pino';

const isDev = (process.env.NODE_ENV || '').toLowerCase() !== 'production';
const level = process.env.LOG_LEVEL || 'info';

/**
 * Shared application logger — pino dengan warna level-based.
 *
 * Level colors (via pino-pretty):
 *   INFO  → hijau
 *   WARN  → kuning
 *   ERROR → merah
 *   FATAL → merah bold (background merah)
 *   DEBUG → abu-abu
 *
 * Format produksi: `HH:MM:ss.l LEVEL [msg] {context}`
 * Format dev     : pino-pretty verbose dengan colorize
 */
export const appLogger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
}, pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    colorizeObjects: false,
    translateTime: 'HH:MM:ss.l',
    ignore: 'pid,hostname',
    singleLine: !isDev,
    messageFormat: isDev
      ? '{msg}'
      : '{msg} {if reqId}[{reqId}]{end}',
    customColors: 'info:green,warn:yellow,error:red,fatal:bgRed,debug:gray',
    levelFirst: false,
  },
}));
