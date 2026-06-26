-- Schema awal untuk sistem Absenta Mobile
-- Menampung data presensi offline-first yang akan disinkronisasi ke backend utama

-- Extension untuk Vector (Opsional jika ingin pakai Face Recognition)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabel Siswa (Cache lokal untuk mobile)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nis TEXT UNIQUE NOT NULL,
  class_name TEXT,
  rfid_code TEXT,
  face_embedding VECTOR(128),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabel Sesi Pelajaran
CREATE TABLE IF NOT EXISTS teaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED, SYNCED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabel Log Presensi (Data utama yang dikumpulkan di mobile)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES teaching_sessions(id),
  student_id UUID REFERENCES students(id),
  tap_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL, -- HADIR, TERLAMBAT, IZIN, dsb
  sync_status TEXT DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) - Untuk dev kita set public dulu agar mudah testing
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public access to sessions" ON teaching_sessions FOR ALL USING (true);
CREATE POLICY "Allow public access to logs" ON attendance_logs FOR ALL USING (true);

-- SEED DATA UNTUK TESTING
INSERT INTO students (name, nis, class_name, rfid_code) VALUES
('Budi Santoso', '12345', 'XII TKJ 1', 'RFID001'),
('Siti Aminah', '12346', 'XII TKJ 1', 'RFID002'),
('Andi Wijaya', '12347', 'XII TKJ 2', 'RFID003'),
('Rina Pratama', '12348', 'XII TKJ 2', 'RFID004')
ON CONFLICT (nis) DO NOTHING;

INSERT INTO teaching_sessions (teacher_id, subject_name, class_name, start_time) VALUES
('00000000-0000-0000-0000-000000000000', 'Matematika', 'XII TKJ 1', now())
ON CONFLICT DO NOTHING;
