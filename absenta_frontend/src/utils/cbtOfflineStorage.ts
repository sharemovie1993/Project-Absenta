/**
 * IndexedDB Offline-First Storage Engine for CBT Exam Room
 * Menjamin 3.000 siswa dapat menjawab soal secara instan (<1ms) dan jawaban tersimpan lokal
 * meski koneksi internet/WiFi sekolah mengalami drop sementara.
 */

const DB_NAME = 'absenta_cbt_db';
const DB_VERSION = 1;
const STORE_NAME = 'exam_answers';

export interface LocalAnswerRecord {
  id: string; // `${jadwalId}_${siswaId}_${soalId}`
  jadwal_id: string;
  siswa_id: string;
  soal_id: string;
  jawaban_siswa: string;
  is_ragu: boolean;
  timestamp: number;
  is_synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak didukung pada browser ini'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('jadwal_siswa', ['jadwal_id', 'siswa_id'], { unique: false });
        store.createIndex('is_synced', 'is_synced', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const cbtOfflineStorage = {
  /**
   * Menyimpan jawaban ke IndexedDB lokal secara instan (<1ms)
   */
  async saveAnswer(
    jadwalId: string,
    siswaId: string,
    soalId: string,
    jawaban: string,
    isRagu: boolean
  ): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: LocalAnswerRecord = {
        id: `${jadwalId}_${siswaId}_${soalId}`,
        jadwal_id: jadwalId,
        siswa_id: siswaId,
        soal_id: soalId,
        jawaban_siswa: jawaban,
        is_ragu: isRagu,
        timestamp: Date.now(),
        is_synced: false,
      };

      store.put(record);

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      // Fallback ke localStorage jika IndexedDB bermasalah
      try {
        const key = `cbt_ans_${jadwalId}_${siswaId}_${soalId}`;
        localStorage.setItem(key, JSON.stringify({ jawaban, isRagu, timestamp: Date.now() }));
      } catch {}
    }
  },

  /**
   * Mengambil semua jawaban yang tersimpan lokal untuk jadwal & siswa tertentu
   */
  async getAllAnswers(jadwalId: string, siswaId: string): Promise<LocalAnswerRecord[]> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('jadwal_siswa');
      const request = index.getAll(IDBKeyRange.only([jadwalId, siswaId]));

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  },

  /**
   * Menandai jawaban sebagai tersinkronisasi ke server
   */
  async markAnswersSynced(jadwalId: string, siswaId: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('jadwal_siswa');
      const request = index.openCursor(IDBKeyRange.only([jadwalId, siswaId]));

      request.onsuccess = (event: any) => {
        const cursor: IDBCursorWithValue = event.target.result;
        if (cursor) {
          const updated = { ...cursor.value, is_synced: true };
          cursor.update(updated);
          cursor.continue();
        }
      };
    } catch {}
  },

  /**
   * Membersihkan data sesi ujian setelah ujian berhasil diserahkan
   */
  async clearSession(jadwalId: string, siswaId: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('jadwal_siswa');
      const request = index.openCursor(IDBKeyRange.only([jadwalId, siswaId]));

      request.onsuccess = (event: any) => {
        const cursor: IDBCursorWithValue = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch {}
  },
};
