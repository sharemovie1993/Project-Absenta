#!/bin/bash
set -e

# =========================================================
#  ABSENTA BACKEND - SETUP WITH EXTERNAL DATABASE
#  Script ini disiapkan untuk Application Server yang 
#  terhubung ke Database Server terpisah.
# =========================================================

APP_DIR="/var/www/absenta/backend"

echo "========================================================"
echo "🌍 SETUP APPLICATION SERVER (EXTERNAL DATABASE SCENARIO)"
echo "========================================================"

# 1. Cek Root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Jalankan script ini sebagai root (sudo)."
  exit 1
fi

# 2. Install Dependencies Dasar (Node.js 18 & Postgres Client)
echo "▶ Step 1: Memeriksa & Install Dependencies..."

# Install Node.js 18 jika belum ada
if ! command -v node &> /dev/null; then
    echo "   📦 Menginstall Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    echo "   ✅ Node.js sudah terinstall: $(node -v)"
fi

# Install PostgreSQL Client (untuk tes koneksi)
if ! command -v pg_isready &> /dev/null; then
    echo "   📦 Menginstall PostgreSQL Client tools..."
    apt install -y postgresql-client
else
    echo "   ✅ PostgreSQL Client sudah terinstall."
fi

# Install Redis Tools (untuk tes koneksi) & Server (jika localhost)
if ! command -v redis-cli &> /dev/null; then
    echo "   📦 Menginstall Redis Tools..."
    apt install -y redis-tools
else
    echo "   ✅ Redis Tools sudah terinstall."
fi

# Cek apakah user ingin menginstall Redis Server lokal (Opsi paling aman & cepat)
if ! command -v redis-server &> /dev/null; then
    echo ""
    echo "   ℹ️  Redis Server tidak terdeteksi di mesin ini."
    echo "   💡 Rekomendasi: Install Redis lokal untuk performa terbaik (Low Latency)."
    read -p "   ❓ Apakah Anda ingin menginstall Redis Server lokal sekarang? (y/n) " INSTALL_REDIS
    if [ "$INSTALL_REDIS" == "y" ]; then
        echo "   📦 Menginstall Redis Server..."
        apt install -y redis-server
        systemctl enable redis-server
        systemctl start redis-server
        echo "   ✅ Redis Server berhasil diinstall dan dijalankan."
    fi
fi

# 3. Setup Project Directory
echo "▶ Step 2: Menyiapkan Direktori Project..."
if [ ! -d "$APP_DIR" ]; then
    echo "   ⚠️  Direktori $APP_DIR tidak ditemukan."
    echo "   Pastikan source code sudah di-upload atau di-git clone ke lokasi tersebut."
    exit 1
fi
cd "$APP_DIR"

# 4. Konfigurasi Database Eksternal (Interactive)
echo "▶ Step 3: Konfigurasi Database Eksternal"
echo "   Silakan masukkan detail koneksi ke Database Server Eksternal."

read -p "   🔹 DB Host / IP Address : " DB_HOST
read -p "   🔹 DB Port (default 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "   🔹 DB Name (default absensi): " DB_NAME
DB_NAME=${DB_NAME:-absensi}
read -p "   🔹 DB User              : " DB_USER
read -s -p "   🔹 DB Password          : " DB_PASS
echo ""

echo "   🔄 Memverifikasi koneksi ke $DB_HOST:$DB_PORT..."

# Export PGPASSWORD agar pg_isready bisa menggunakannya (meski pg_isready hanya cek socket, psql butuh pass)
export PGPASSWORD=$DB_PASS

if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t 5; then
    echo "   ✅ KONEKSI SUKSES ke Database Server!"
else
    echo "   ❌ KONEKSI GAGAL!"
    echo "      Pastikan:"
    echo "      1. Database Server menyala."
    echo "      2. Firewall di Database Server mengizinkan port $DB_PORT dari IP server ini."
    echo "      3. Konfigurasi 'pg_hba.conf' di Database Server mengizinkan user '$DB_USER' dari IP ini."
    echo "      4. Password benar."
    
    read -p "   ❓ Ingin tetap lanjut setup config? (y/n) " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# 5. Konfigurasi Redis Eksternal (Interactive)
echo "▶ Step 4: Konfigurasi Redis Eksternal"
echo "   Silakan masukkan detail koneksi ke Redis Server Eksternal."

read -p "   🔹 Redis Host / IP Address : " REDIS_HOST
read -p "   🔹 Redis Port (default 6379): " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}
read -s -p "   🔹 Redis Password (kosongkan jika tidak ada): " REDIS_PASS
echo ""

echo "   🔄 Memverifikasi koneksi ke Redis $REDIS_HOST:$REDIS_PORT..."
if [ -z "$REDIS_PASS" ]; then
    if timeout 5 redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping | grep -q "PONG"; then
        echo "   ✅ KONEKSI REDIS SUKSES!"
    else
        echo "   ❌ KONEKSI REDIS GAGAL!"
        echo "      Pastikan Redis Server menyala dan bind ke IP public (bukan 127.0.0.1)."
        read -p "   ❓ Ingin tetap lanjut setup config? (y/n) " CONTINUE_REDIS
        if [ "$CONTINUE_REDIS" != "y" ]; then exit 1; fi
    fi
else
    if timeout 5 redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASS" ping | grep -q "PONG"; then
        echo "   ✅ KONEKSI REDIS SUKSES!"
    else
        echo "   ❌ KONEKSI REDIS GAGAL!"
        echo "      Pastikan password benar dan server bisa diakses."
        read -p "   ❓ Ingin tetap lanjut setup config? (y/n) " CONTINUE_REDIS
        if [ "$CONTINUE_REDIS" != "y" ]; then exit 1; fi
    fi
fi

# 6. Buat file .env
echo "▶ Step 5: Menulis konfigurasi ke .env..."

if [ -f ".env.example" ]; then
    cp .env.example .env
    
    # Update DATABASE_URL
    # Format: postgresql://USER:PASS@HOST:PORT/DBNAME?schema=public
    # Kita perlu escape karakter spesial di password jika ada, tapi untuk sed sederhana:
    CONNECTION_STRING="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
    
    # Menggunakan delimiter | untuk sed agar aman jika ada slash di connection string
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$CONNECTION_STRING\"|" .env
    
    # Update REDIS_URL
    if [ -z "$REDIS_PASS" ]; then
        REDIS_URL="redis://$REDIS_HOST:$REDIS_PORT"
    else
        REDIS_URL="redis://:$REDIS_PASS@$REDIS_HOST:$REDIS_PORT"
    fi

    if grep -q "REDIS_URL=" .env; then
        sed -i "s|REDIS_URL=.*|REDIS_URL=\"$REDIS_URL\"|" .env
    else
        echo "" >> .env
        echo "# Redis" >> .env
        echo "REDIS_URL=\"$REDIS_URL\"" >> .env
    fi

    echo "   ✅ File .env berhasil diupdate dengan koneksi database & redis baru."
else
    echo "   ⚠️  File .env.example tidak ditemukan, melewati pembuatan .env otomatis."
fi

# 6. Jalankan Deploy All
echo "▶ Step 5: Menjalankan Deployment Aplikasi..."
echo "   Menjalankan ./deploy_all.sh..."

chmod +x deploy_all.sh
./deploy_all.sh

echo ""
echo "========================================================"
echo "✅ SETUP EXTERNAL DATABASE SCENARIO SELESAI"
echo "========================================================"
