-- ============================================================================
-- SIAS SMPN 50 JAKARTA - SKRIP SETUP DATABASE SUPABASE PRO (POSTGRESQL)
-- ============================================================================
-- Jalankan skrip ini SATU KALI di:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Run
--
-- Aman dijalankan berulang kali (idempotent).
-- Mendukung seluruh 36+ koleksi utama & koleksi dinamis (Ekskul, CBT, ECo-Tiket,
-- Izin Siswa, Antrean Pendaftaran, Konseling, Konten Web, & Pengaturan Sekolah).
-- ============================================================================

-- 1. Ekstensi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabel Utama Penyimpanan Terpadu (Mendukung seluruh koleksi statis & dinamis)
CREATE TABLE IF NOT EXISTS public.sias_documents (
    collection_name TEXT NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (collection_name, id),
    CONSTRAINT chk_collection_name_nonempty CHECK (LENGTH(TRIM(collection_name)) > 0),
    CONSTRAINT chk_id_nonempty CHECK (LENGTH(TRIM(id)) > 0),
    CONSTRAINT chk_data_is_object CHECK (jsonb_typeof(data) = 'object')
);

-- 3. Indexing untuk Kecepatan Tinggi (Query Siswa, NISN, Kelas, Presensi, Antrean)
CREATE INDEX IF NOT EXISTS idx_sias_docs_collection
    ON public.sias_documents (collection_name);

CREATE INDEX IF NOT EXISTS idx_sias_docs_collection_updated
    ON public.sias_documents (collection_name, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sias_docs_data_gin
    ON public.sias_documents USING GIN (data);

CREATE INDEX IF NOT EXISTS idx_sias_docs_students_nisn
    ON public.sias_documents ((data->>'nisn'))
    WHERE collection_name = 'students';

CREATE INDEX IF NOT EXISTS idx_sias_docs_students_class
    ON public.sias_documents ((data->>'classId'))
    WHERE collection_name = 'students';

CREATE INDEX IF NOT EXISTS idx_sias_docs_pending_reg_ref
    ON public.sias_documents ((data->>'nipOrNisnOrNik'))
    WHERE collection_name = 'pending_registrations';

CREATE INDEX IF NOT EXISTS idx_sias_docs_attendance_date
    ON public.sias_documents ((data->>'date'))
    WHERE collection_name = 'attendance';

-- 4. Trigger Auto-Update Timestamp updated_at
CREATE OR REPLACE FUNCTION public.set_sias_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sias_documents_updated_at ON public.sias_documents;
CREATE TRIGGER trg_sias_documents_updated_at
    BEFORE UPDATE ON public.sias_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_sias_documents_updated_at();

-- 5. Aktifkan Supabase Realtime agar seluruh dashboard sinkron otomatis
ALTER TABLE public.sias_documents REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'sias_documents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sias_documents;
    END IF;
END $$;

-- 6. Row Level Security (RLS)
-- Catatan Keamanan:
-- Kebijakan di bawah memungkinkan portal berjalan langsung dari browser untuk
-- registrasi mandiri siswa/orang tua & modul sekolah sebelum integrasi Supabase Auth penuh.
-- Setelah seluruh migrasi stabil, disarankan memperketat policy UPDATE/DELETE per peran
-- atau memindahkan aksi admin sensitif ke Supabase Edge Functions.
ALTER TABLE public.sias_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SIAS Public Select" ON public.sias_documents;
CREATE POLICY "SIAS Public Select"
    ON public.sias_documents
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "SIAS App Insert" ON public.sias_documents;
CREATE POLICY "SIAS App Insert"
    ON public.sias_documents
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        LENGTH(TRIM(collection_name)) > 0
        AND LENGTH(TRIM(id)) > 0
        AND jsonb_typeof(data) = 'object'
    );

DROP POLICY IF EXISTS "SIAS App Update" ON public.sias_documents;
CREATE POLICY "SIAS App Update"
    ON public.sias_documents
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (
        LENGTH(TRIM(collection_name)) > 0
        AND LENGTH(TRIM(id)) > 0
        AND jsonb_typeof(data) = 'object'
    );

DROP POLICY IF EXISTS "SIAS App Delete" ON public.sias_documents;
CREATE POLICY "SIAS App Delete"
    ON public.sias_documents
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- 7. View Relasional (Opsional untuk memantau data lebih rapi di Table Editor Supabase)
CREATE OR REPLACE VIEW public.v_classes AS
SELECT
    id,
    data->>'name' AS name,
    data->>'homeroomTeacherId' AS homeroom_teacher_id,
    updated_at
FROM public.sias_documents
WHERE collection_name = 'classes';

CREATE OR REPLACE VIEW public.v_teachers AS
SELECT
    id,
    data->>'name' AS name,
    data->>'nip' AS nip,
    data->>'email' AS email,
    data->>'role' AS role,
    data->>'classId' AS class_id,
    data->>'ekskulId' AS ekskul_id,
    updated_at
FROM public.sias_documents
WHERE collection_name = 'teachers';

CREATE OR REPLACE VIEW public.v_students AS
SELECT
    id,
    data->>'name' AS name,
    data->>'nisn' AS nisn,
    data->>'classId' AS class_id,
    data->>'gender' AS gender,
    data->>'phone' AS phone,
    data->>'parentName' AS parent_name,
    data->>'parentNik' AS parent_nik,
    data->>'parentPhone' AS parent_phone,
    data->>'guruWaliTeacherId' AS guru_wali_teacher_id,
    updated_at
FROM public.sias_documents
WHERE collection_name = 'students';

CREATE OR REPLACE VIEW public.v_pending_registrations AS
SELECT
    id,
    data->>'role' AS role,
    data->>'name' AS name,
    data->>'nipOrNisnOrNik' AS nip_or_nisn_or_nik,
    data->>'classId' AS class_id,
    data->>'studentNisnOrName' AS student_nisn_or_name,
    data->>'phone' AS phone,
    data->>'email' AS email,
    data->>'createdAt' AS created_at_str,
    updated_at
FROM public.sias_documents
WHERE collection_name = 'pending_registrations';

CREATE OR REPLACE VIEW public.v_attendance AS
SELECT
    id,
    data->>'studentId' AS student_id,
    data->>'classId' AS class_id,
    data->>'date' AS date,
    data->>'status' AS status,
    data->>'recordedBy' AS recorded_by,
    updated_at
FROM public.sias_documents
WHERE collection_name = 'attendance';

CREATE OR REPLACE VIEW public.v_eco_deposits AS
SELECT
    id,
    data->>'studentId' AS student_id,
    data->>'studentName' AS student_name,
    data->>'classId' AS class_id,
    data->>'categoryName' AS category_name,
    (data->>'quantity')::NUMERIC AS quantity,
    (data->>'pointsEarned')::INTEGER AS points_earned,
    data->>'status' AS status,
    data->>'date' AS date,
    updated_at
FROM public.sias_documents
WHERE collection_name = 'eco_deposits';
