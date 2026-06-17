import fs from 'fs';
import path from 'path';

const LOG_PATH = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'backend.log');

try {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
} catch {}

export const appendLog = (entry: any) => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = { ...entry, timestamp };
    fs.appendFileSync(LOG_PATH, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};
