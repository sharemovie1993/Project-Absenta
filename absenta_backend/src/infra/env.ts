import dotenv from 'dotenv';

// 1. CARI DAN LOAD .ENV SECEPAT MUNGKIN (Side-Effect)
const result = dotenv.config();


if (result.error) {
  // Jika gagal meload .env, kita cek apakah file .env ada
  // Ini penting untuk logging awal jika startup gagal
  console.warn('⚠️  [Env] Gagal memuat file .env atau file tidak ditemukan.');
} else {
  // console.log('✅ [Env] Variabel lingkungan berhasil dimuat.');
}

// 2. SET TIMEZONE LOCK (Penting agar tidak dipengaruhi environment OS)
process.env.TZ = 'UTC';

// 3. EXPORT UNTUK VERIFIKASI JIKA DIBUTUHKAN
export const isEnvLoaded = !result.error;
