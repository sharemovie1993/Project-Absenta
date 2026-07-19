# BUSINESS RULES - JADWAL

### 1. Pemisahan Jadwal KBM dan Jadwal Kegiatan
- **JadwalKBM**: Menangani penugasan slot jam pelajaran akademik terstruktur (KBM).
- **JadwalKegiatan**: Menangani seluruh jadwal kegiatan rutin non-KBM (Apel Pagi, Upacara, Ketarunaan, Ekstrakurikuler).
- **Overlap & Inheritance Policy**: Jika jadwal kegiatan rutin (misal: Latihan Ketarunaan) bertumpang tindih dengan JadwalKBM, status kehadiran siswa pada jam KBM yang bertumpang tindih tersebut akan diwariskan secara otomatis dari kehadiran di sesi kegiatan dengan catatan `Warisan Ketarunaan`.
- **Max Hours Guard**: Guru dilarang ditugaskan mengajar melebihi 8 jam pelajaran tatap muka dalam 1 hari untuk menjaga kualitas pengajaran.
