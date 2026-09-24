-- ============================================================================
-- SKEMA DATABASE SUPABASE (POSTGRESQL) - SISTEM INFORMASI AKADEMIK & SEKOLAH
-- Siap dijalankan langsung di Supabase SQL Editor (Dashboard > SQL Editor)
-- Mendukung Row Level Security (RLS), Triggers, Indexing, dan Type Safety
-- ============================================================================

-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TABEL PENGGUNA & PROFIL (users / profiles)
-- Terintegrasi dengan Supabase Auth (auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY, -- UID dari Supabase Auth atau custom ID
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'guru', 'siswa', 'orang_tua', 'pelatih', 'tendik', 'wali_kelas', 'bk', 'piket', 'guru_wali')),
    email VARCHAR(100),
    user_class VARCHAR(50),
    nip VARCHAR(50),
    nisn VARCHAR(30),
    phone VARCHAR(30),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 2. TABEL KELAS / ROMBEL (classes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level VARCHAR(20),
    academic_year VARCHAR(30),
    homeroom_teacher_id VARCHAR(128),
    total_students INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 3. TABEL SISWA (students)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    nisn VARCHAR(20) NOT NULL,
    class_id VARCHAR(128) REFERENCES public.classes(id) ON DELETE SET NULL,
    gender VARCHAR(20) CHECK (gender IN ('Laki-laki', 'Perempuan')),
    address TEXT,
    phone VARCHAR(30),
    parent_name VARCHAR(150),
    parent_nik VARCHAR(30),
    parent_phone VARCHAR(30),
    parent_email VARCHAR(100),
    avatar_url TEXT,
    password_hash TEXT,
    parent_password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 4. TABEL GURU & TENDIK (teachers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teachers (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    nip VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    roles TEXT[] DEFAULT '{}',
    phone VARCHAR(30),
    ekskul_id VARCHAR(50),
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 5. TABEL PRESENSI SISWA (attendance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id VARCHAR(128) PRIMARY KEY,
    student_id VARCHAR(128) REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat')),
    time VARCHAR(30),
    notes TEXT,
    recorded_by VARCHAR(150),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 6. TABEL ATURAN KEDISIPLINAN & PELANGGARAN
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.violation_types (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    points INT NOT NULL DEFAULT 0,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.violations (
    id VARCHAR(128) PRIMARY KEY,
    student_id VARCHAR(128) REFERENCES public.students(id) ON DELETE CASCADE,
    violation_type_id VARCHAR(128) REFERENCES public.violation_types(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    reporter_id VARCHAR(128),
    reporter_role VARCHAR(50),
    points INT NOT NULL DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    penalty TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 7. TABEL UJIAN CBT & SOAL (cbt_exams, cbt_questions, cbt_submissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cbt_exams (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    class_id VARCHAR(128),
    duration_minutes INT NOT NULL DEFAULT 60,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    total_questions INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.cbt_questions (
    id VARCHAR(128) PRIMARY KEY,
    exam_id VARCHAR(128) REFERENCES public.cbt_exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer VARCHAR(50) NOT NULL,
    points INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.cbt_submissions (
    id VARCHAR(128) PRIMARY KEY,
    exam_id VARCHAR(128) REFERENCES public.cbt_exams(id) ON DELETE CASCADE,
    student_id VARCHAR(128) REFERENCES public.students(id) ON DELETE CASCADE,
    score NUMERIC(5,2) DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 8. TABEL PENDAFTARAN MANDIRI (pending_registrations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    id VARCHAR(128) PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    nip_or_nisn_or_nik VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(30),
    gender VARCHAR(20),
    class_id VARCHAR(50),
    student_nisn_or_name VARCHAR(150),
    address TEXT,
    password_hash TEXT,
    status VARCHAR(30) DEFAULT 'Menunggu Verifikasi',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 9. TABEL KONTEN WEBSITE CMS & SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.web_content (
    id VARCHAR(128) PRIMARY KEY,
    school_logo TEXT,
    akreditasi VARCHAR(50),
    slides JSONB DEFAULT '[]'::jsonb,
    sambutan TEXT,
    visi TEXT,
    misi JSONB DEFAULT '[]'::jsonb,
    instagram VARCHAR(200),
    whatsapp VARCHAR(50),
    email VARCHAR(100),
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.school_settings (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(150),
    nip VARCHAR(50),
    logo_left TEXT,
    logo_right TEXT,
    gov_title VARCHAR(200),
    dept_title VARCHAR(200),
    sudin_title VARCHAR(200),
    school_title VARCHAR(200),
    address_text TEXT,
    contact_text TEXT,
    doc_number VARCHAR(100),
    card_title VARCHAR(200),
    preset_id VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 10. TABEL OPERASIONAL: INVENTARIS, NOMOR SURAT, LAPORAN BOS/BOP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventaris (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(100),
    category VARCHAR(100),
    quantity INT DEFAULT 1,
    condition VARCHAR(50) DEFAULT 'Baik',
    location VARCHAR(150),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.letter_numbers (
    id VARCHAR(128) PRIMARY KEY,
    letter_number VARCHAR(150) NOT NULL,
    recipient VARCHAR(200) NOT NULL,
    subject TEXT NOT NULL,
    letter_date DATE NOT NULL,
    created_by VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.bos_bop_reports (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(250) NOT NULL,
    type VARCHAR(50) NOT NULL, -- BOS / BOP
    period VARCHAR(50),
    amount NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Selesai',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.kjp_recipients (
    id VARCHAR(128) PRIMARY KEY,
    student_id VARCHAR(128) REFERENCES public.students(id) ON DELETE CASCADE,
    nisn VARCHAR(30),
    status VARCHAR(50) DEFAULT 'Aktif',
    phase VARCHAR(50),
    bank_account VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(150),
    role VARCHAR(50),
    target_group VARCHAR(50) DEFAULT 'Semua',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ----------------------------------------------------------------------------
-- 11. INDEXES UNTUK PERFORMA QUERY
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_violations_student ON public.violations(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_exam_student ON public.cbt_submissions(exam_id, student_id);

-- ----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- Standar Zero-Trust: Publik bisa membaca konten web dan pengumuman,
-- autentikasi diperlukan untuk data siswa/nilai/presensi.
-- ----------------------------------------------------------------------------

-- Aktifkan RLS di semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventaris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bos_bop_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kjp_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy Web Content & Settings: Publik boleh membaca (SELECT)
CREATE POLICY "Public Read Web Content" ON public.web_content FOR SELECT USING (true);
CREATE POLICY "Public Read School Settings" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public Read Classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Public Insert Pending Registration" ON public.pending_registrations FOR INSERT WITH CHECK (true);

-- Policy Pengguna Terotentikasi (Authenticated Users)
CREATE POLICY "Auth Users Read Profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth Users Update Own Profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()::text = id);

CREATE POLICY "Auth Users Read Students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth Users Modify Students" ON public.students FOR ALL TO authenticated USING (true);

CREATE POLICY "Auth Users Attendance" ON public.attendance FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users Violations" ON public.violations FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users CBT" ON public.cbt_exams FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users CBT Questions" ON public.cbt_questions FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users CBT Submissions" ON public.cbt_submissions FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users Teachers" ON public.teachers FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users Operations" ON public.inventaris FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users Letters" ON public.letter_numbers FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users BOS" ON public.bos_bop_reports FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users KJP" ON public.kjp_recipients FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users Manage Web Content" ON public.web_content FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users Manage Settings" ON public.school_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth Users Manage Pending Registrations" ON public.pending_registrations FOR ALL TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 13. AUTO-UPDATE TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_classes_modtime BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_teachers_modtime BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_web_content_modtime BEFORE UPDATE ON public.web_content FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_school_settings_modtime BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
