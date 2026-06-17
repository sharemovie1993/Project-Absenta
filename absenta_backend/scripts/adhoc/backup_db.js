const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns'); // Assuming date-fns is installed, or use native Date

// Configuration
const DB_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, '../backups');
const RETAIN_DAYS = 7;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate filename
const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
const fileName = `backup-absensi-${dateStr}.sql.gz`;
const filePath = path.join(BACKUP_DIR, fileName);

console.log(`🚀 Starting database backup...`);
console.log(`📂 Target: ${filePath}`);

// Command: pg_dump $DB_URL | gzip > $filePath
// Note: On Windows, piping in spawn is tricky. We'll use a shell if possible or stream.

const pgDump = spawn('pg_dump', [DB_URL], {
  shell: true,
  env: { ...process.env }
});

const gzip = spawn('gzip', [], {
  shell: true
});

const fileStream = fs.createWriteStream(filePath);

pgDump.stdout.pipe(gzip.stdin);
gzip.stdout.pipe(fileStream);

pgDump.stderr.on('data', (data) => {
  console.error(`pg_dump error: ${data}`);
});

gzip.on('close', (code) => {
  if (code === 0) {
    console.log(`✅ Backup completed successfully: ${fileName}`);
    // cleanupOldBackups(); // Optional
    // uploadToCloud(filePath); // Placeholder
  } else {
    console.error(`❌ Backup failed with code ${code}`);
  }
});

// Placeholder for Cloud Upload
function uploadToCloud(file) {
  console.log('☁️  Uploading to Cloud Storage (S3/GCS)... [Pending Implementation]');
  // Implementation would use aws-sdk or @google-cloud/storage
}
