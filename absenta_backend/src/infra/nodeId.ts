import * as os from 'os';

let NODE_ID: string | null = null;

export function getNodeId(): string {
  if (NODE_ID) return NODE_ID;
  const envName = typeof process.env.NODE_NAME === 'string' ? process.env.NODE_NAME.trim() : '';
  const finalName = envName || os.hostname() || 'absenta-node-unknown';
  NODE_ID = finalName.toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
  return NODE_ID;
}
