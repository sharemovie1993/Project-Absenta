/**
 * PM2-style startup table logger
 * Prints a beautiful summary table of all services/workers after boot
 */

interface ServiceEntry {
  name: string;
  status: 'online' | 'errored' | 'stopped';
  type: 'worker' | 'consumer' | 'infra' | 'scheduler' | 'server';
  startTimeMs?: number;
  error?: string;
}

const services: ServiceEntry[] = [];
const bootStart = Date.now();

export function registerService(
  name: string,
  type: ServiceEntry['type'],
  status: ServiceEntry['status'] = 'online',
  startTimeMs?: number,
  error?: string
) {
  const existing = services.find(s => s.name === name);
  if (existing) {
    existing.status = status;
    existing.startTimeMs = startTimeMs;
    existing.error = error;
  } else {
    services.push({ name, type, status, startTimeMs, error });
  }
}

export async function trackService(
  name: string,
  type: ServiceEntry['type'],
  fn: () => Promise<void> | void
): Promise<boolean> {
  const t0 = Date.now();
  try {
    await fn();
    registerService(name, type, 'online', Date.now() - t0);
    return true;
  } catch (err: any) {
    registerService(name, type, 'errored', Date.now() - t0, err?.message || 'Unknown error');
    return false;
  }
}

export function printStartupTable(port: number, host: string) {
  const uptime = Date.now() - bootStart;
  const env = process.env.NODE_ENV || 'development';
  const nodeVer = process.version;
  const pid = process.pid;

  // ─── ANSI Colors ───
  const RESET  = '\x1b[0m';
  const BOLD   = '\x1b[1m';
  const DIM    = '\x1b[2m';
  const GREEN  = '\x1b[32m';
  const RED    = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const CYAN   = '\x1b[36m';
  const WHITE  = '\x1b[37m';
  const BG_GREEN = '\x1b[42m';
  const BG_RED   = '\x1b[41m';
  const BLUE   = '\x1b[34m';
  const MAGENTA = '\x1b[35m';

  const statusColor = (s: string) => {
    switch (s) {
      case 'online':  return `${GREEN}${BOLD}online${RESET}`;
      case 'errored': return `${RED}${BOLD}errored${RESET}`;
      case 'stopped': return `${YELLOW}${BOLD}stopped${RESET}`;
      default:        return `${DIM}${s}${RESET}`;
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case 'worker':    return `${CYAN}⚙${RESET}`;
      case 'consumer':  return `${MAGENTA}⇣${RESET}`;
      case 'infra':     return `${BLUE}◉${RESET}`;
      case 'scheduler': return `${YELLOW}⏱${RESET}`;
      case 'server':    return `${GREEN}▶${RESET}`;
      default:          return `${DIM}○${RESET}`;
    }
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case 'worker':    return `${CYAN}worker${RESET}`;
      case 'consumer':  return `${MAGENTA}consumer${RESET}`;
      case 'infra':     return `${BLUE}infra${RESET}`;
      case 'scheduler': return `${YELLOW}scheduler${RESET}`;
      case 'server':    return `${GREEN}server${RESET}`;
      default:          return `${DIM}${t}${RESET}`;
    }
  };

  // ─── Calculate column widths (on raw text, no ANSI) ───
  const COL_ID   = 4;
  const COL_NAME = Math.max(22, ...services.map(s => s.name.length + 2));
  const COL_TYPE = 12;
  const COL_STAT = 10;
  const COL_TIME = 10;
  const TOTAL_W  = COL_ID + COL_NAME + COL_TYPE + COL_STAT + COL_TIME + 6; // 6 for separators

  const pad = (str: string, len: number, rawLen?: number) => {
    const actualLen = rawLen ?? str.length;
    return str + ' '.repeat(Math.max(0, len - actualLen));
  };

  const hr = (char = '─') => char.repeat(TOTAL_W);

  // ─── Header ───
  const onlineCount  = services.filter(s => s.status === 'online').length;
  const errorCount   = services.filter(s => s.status === 'errored').length;

  console.log('');
  console.log(`${DIM}${hr('━')}${RESET}`);
  console.log(`${BOLD}${CYAN}  ╔═══════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}  ║${RESET}  ${BOLD}${WHITE}  A B S E N T A   B A C K E N D${RESET}              ${BOLD}${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}  ╚═══════════════════════════════════════════════╝${RESET}`);
  console.log('');
  console.log(`  ${DIM}Node ${nodeVer}  │  PID ${pid}  │  ENV ${env}${RESET}`);
  console.log(`  ${DIM}Boot time: ${uptime}ms  │  Port: ${port}  │  Host: ${host}${RESET}`);
  console.log('');

  // ─── Table Header ───
  console.log(`${DIM}${hr()}${RESET}`);
  console.log(
    `${BOLD}${WHITE}` +
    pad(' ID', COL_ID) + ' │ ' +
    pad('Service Name', COL_NAME) + ' │ ' +
    pad('Type', COL_TYPE) + ' │ ' +
    pad('Status', COL_STAT) + ' │ ' +
    pad('Time', COL_TIME) +
    RESET
  );
  console.log(`${DIM}${hr()}${RESET}`);

  // ─── Rows ───
  services.forEach((svc, idx) => {
    const id = String(idx).padStart(2, ' ');
    const timeStr = svc.startTimeMs !== undefined ? `${svc.startTimeMs}ms` : '—';
    const icon = typeIcon(svc.type);

    console.log(
      ` ${DIM}${id}${RESET}` + ' │ ' +
      `${icon} ` + pad(svc.name, COL_NAME - 2) + ' │ ' +
      pad(typeLabel(svc.type), COL_TYPE, svc.type.length) + ' │ ' +
      pad(statusColor(svc.status), COL_STAT, svc.status.length) + ' │ ' +
      `${DIM}${pad(timeStr, COL_TIME)}${RESET}`
    );
  });

  console.log(`${DIM}${hr()}${RESET}`);

  // ─── Summary ───
  console.log('');
  console.log(
    `  ${BG_GREEN}${BOLD}${WHITE} ✓ ${onlineCount} online ${RESET}` +
    (errorCount > 0 ? `  ${BG_RED}${BOLD}${WHITE} ✗ ${errorCount} errored ${RESET}` : '') +
    `  ${DIM}│  Total: ${services.length} services${RESET}`
  );
  console.log('');
  console.log(`  ${GREEN}${BOLD}🚀 Server listening at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}${RESET}`);
  console.log(`${DIM}${hr('━')}${RESET}`);
  console.log('');
}
