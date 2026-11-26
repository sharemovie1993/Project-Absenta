import * as os from 'os';

let NODE_ID: string | null = null;

export function getNodeId(): string {
  if (NODE_ID) return NODE_ID;
  const envNodeName = typeof process.env.NODE_NAME === 'string' ? process.env.NODE_NAME.trim() : '';
  const envNodeId = typeof process.env.NODE_ID === 'string' ? process.env.NODE_ID.trim() : '';
  const envBackendId = typeof process.env.BACKEND_NODE_ID === 'string' ? process.env.BACKEND_NODE_ID.trim() : '';

  // Avoid legacy default 'windows-node-1' overriding real Linux hostname/NODE_NAME
  const validNodeId = envNodeId && !(process.platform !== 'win32' && envNodeId === 'windows-node-1') ? envNodeId : '';
  const finalName = envNodeName || validNodeId || envBackendId || os.hostname() || 'absenta-node-unknown';
  NODE_ID = finalName.toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
  return NODE_ID;
}
