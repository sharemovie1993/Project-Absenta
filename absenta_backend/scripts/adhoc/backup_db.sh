#!/bin/bash
set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_absensi_$TIMESTAMP.sql.gz"
S3_BUCKET="s3://your-backup-bucket/absensi-db/"

# Ensure backup dir exists
mkdir -p $BACKUP_DIR

echo "🚀 Starting Backup at $TIMESTAMP..."

# 1. Dump & Compress
# Assumes DATABASE_URL is set in environment or .env
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL is not set. Loading from .env..."
  export $(grep -v '^#' .env | xargs)
fi

echo "📦 Dumping database..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILENAME"

echo "✅ Backup created: $BACKUP_DIR/$FILENAME"

# 2. Upload to Cloud (AWS S3 Example)
# Requires aws-cli installed and configured
if command -v aws &> /dev/null; then
    echo "☁️  Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/$FILENAME" "$S3_BUCKET"
    echo "✅ Upload success."
else
    echo "⚠️  AWS CLI not found. Skipping cloud upload."
fi

# 3. Retention Policy (Delete local backups older than 7 days)
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete
echo "🧹 Cleaned up old local backups."

echo "🎉 Backup Process Complete."
