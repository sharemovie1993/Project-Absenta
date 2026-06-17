let NODE_ID: string | null = null;

export function getNodeId(): string {
  if (NODE_ID) return NODE_ID;
  const envName = typeof process.env.NODE_NAME === 'string' ? process.env.NODE_NAME.trim() : '';
  if (!envName) {
    throw new Error('NODE_NAME is required for node identity and must be set in environment');
  }
  NODE_ID = envName.toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
  return NODE_ID;
}
