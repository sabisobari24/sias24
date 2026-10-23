-- ==============================================================================
-- SKRIP SQL DATABASE LENGKAP UNTUK SUPABASE
-- Sistem Informasi Manajemen Akademik, ECo-Tiket, Sertifikat Digital & Administrasi Sekolah
-- Kompatibel dengan PostgreSQL 14+ / Supabase SQL Editor
-- ==============================================================================

-- 1. SETUP EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABEL PENGGUNA & AKADEMIK UTAMA
-- ==============================================================================

-- Tabel Kelas
CREATE TABLE IF NOT EXISTS public.classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    homeroom_teacher_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Guru & Tenaga Kependidikan
CREATE TABLE IF NOT EXISTS public.teachers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    nip VARCHAR(50),
    email VARCHAR(150),
    role VARCHAR(50) DEFAULT 'guru',
    roles TEXT[] DEFAULT ARRAY['guru']::TEXT[],
    class_id VARCHAR(50) REFERENCES public.classes(id) ON DELETE SET NULL,
    password TEXT,
    ekskul_id VARCHAR(100),
    ekskul_name VARCHAR(150),
    subject VARCHAR(150),
    avatar_url TEXT,
    born VARCHAR(150),
    hobby VARCHAR(150),
    motto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambahkan foreign key homeroom_teacher_id setelah teachers dibuat
ALTER TABLE public.classes 
    DROP CONSTRAINT IF EXISTS fk_homeroom_teacher;
ALTER TABLE public.classes 
    ADD CONSTRAINT fk_homeroom_teacher 
    FOREIGN KEY (homeroom_teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Tabel Siswa
CREATE TABLE IF NOT EXISTS public.students (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    nisn VARCHAR(50) UNIQUE,
    class_id VARCHAR(50) REFERENCES public.classes(id) ON DELETE SET NULL,
    gender VARCHAR(20) CHECK (gender IN ('Laki-laki', 'Perempuan')),
    address TEXT,
    phone VARCHAR(50),
    parent_name VARCHAR(200),
    parent_nik VARCHAR(50),
    parent_phone VARCHAR(50),
    parent_email VARCHAR(150),
    avatar_url TEXT,
    guru_wali_teacher_id VARCHAR(100) REFERENCES public.teachers(id) ON DELETE SET NULL,
    password TEXT,
    parent_password TEXT,
    bakat_minat TEXT,
    prestasi TEXT,
    is_kjp_recipient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABEL PRESENSI / ATTENDANCE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.attendance (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES public.classes(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpa')),
    notes TEXT,
    recorded_by VARCHAR(150) NOT NULL,
    timestamp VARCHAR(50),
    photo_proof TEXT,
    is_self_attendance BOOLEAN DEFAULT FALSE,
    is_verified_by_piket BOOLEAN DEFAULT FALSE,
    is_verified_by_mapel BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
    verified_by_piket_at TIMESTAMPTZ,
    verified_by_mapel_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- ==============================================================================
-- 4. TATA TERTIB, PELANGGARAN & KONSELING BK
-- ==============================================================================

-- Jenis Pelanggaran
CREATE TABLE IF NOT EXISTS public.violation_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Ringan', 'Sedang', 'Berat')),
    points INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pelanggaran Siswa
CREATE TABLE IF NOT EXISTS public.student_violations (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    violation_type_id VARCHAR(50) REFERENCES public.violation_types(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    notes TEXT,
    points INTEGER NOT NULL DEFAULT 5,
    recorded_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catatan Guru BK (Bimbingan Konseling)
CREATE TABLE IF NOT EXISTS public.counselor_notes (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT NOT NULL,
    follow_up TEXT,
    status VARCHAR(30) DEFAULT 'Perlu Perhatian' CHECK (status IN ('Perlu Perhatian', 'Selesai', 'Dalam Pemantauan')),
    recorded_by VARCHAR(150) NOT NULL,
    parent_acknowledge BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catatan Wali Kelas
CREATE TABLE IF NOT EXISTS public.homeroom_notes (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT NOT NULL,
    academic_progress TEXT,
    recorded_by VARCHAR(150) NOT NULL,
    parent_acknowledge BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pesan Orang Tua ke Sekolah
CREATE TABLE IF NOT EXISTS public.parent_messages (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date TIMESTAMPTZ DEFAULT NOW(),
    sender_name VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    replies JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. NILAI & RAPORT AKADEMIK
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_grades (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(200),
    class_id VARCHAR(50) REFERENCES public.classes(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    predicate VARCHAR(5),
    attitude VARCHAR(50),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. CBT (COMPUTER BASED TEST) & UJIAN
-- ==============================================================================

-- Jadwal Ujian
CREATE TABLE IF NOT EXISTS public.exam_schedules (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    class_id VARCHAR(50) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(50) NOT NULL,
    room VARCHAR(100),
    type VARCHAR(100) NOT NULL, -- UTS, UAS, Evaluasi Harian
    exam_type VARCHAR(100),
    google_form_url TEXT,
    teacher_id VARCHAR(100) REFERENCES public.teachers(id) ON DELETE SET NULL,
    teacher_name VARCHAR(200),
    question_bank_id VARCHAR(100),
    kkm NUMERIC(5,2) DEFAULT 75,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Soal CBT
CREATE TABLE IF NOT EXISTS public.question_banks (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    teacher_id VARCHAR(100) REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(200) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    questions JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submission / Hasil Jawaban Siswa
CREATE TABLE IF NOT EXISTS public.student_exam_submissions (
    id VARCHAR(150) PRIMARY KEY, -- e.g. "sub-studentId-examScheduleId"
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(200) NOT NULL,
    exam_schedule_id VARCHAR(100) REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
    question_bank_id VARCHAR(100),
    class_id VARCHAR(50) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    answers JSONB DEFAULT '{}'::JSONB,
    scores JSONB DEFAULT '{}'::JSONB,
    score NUMERIC(5,2),
    is_graded BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rekap Nilai Ujian Siswa
CREATE TABLE IF NOT EXISTS public.exam_grades (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Lulus', 'Remedial')),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. JURNAL MENGAJAR, GURU PIKET & BIMBINGAN
-- ==============================================================================

-- Jurnal Mengajar Guru
CREATE TABLE IF NOT EXISTS public.teaching_journals (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    teacher_id VARCHAR(100) NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    kd TEXT NOT NULL,
    tujuan_pembelajaran TEXT,
    material TEXT NOT NULL,
    present_count INTEGER DEFAULT 0,
    absent_count INTEGER DEFAULT 0,
    notes TEXT,
    signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guru Izin / Berhalangan Hadir
CREATE TABLE IF NOT EXISTS public.absent_teachers (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    teacher_name VARCHAR(200) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    substitute_teacher VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kejadian Penting Sekolah (Buku Piket)
CREATE TABLE IF NOT EXISTS public.important_events (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    time VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    reporter VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jurnal Konseling BK
CREATE TABLE IF NOT EXISTS public.bimbingan_journals (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    date DATE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('Individu', 'Kelompok')),
    student_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    class_id VARCHAR(50) NOT NULL,
    topic VARCHAR(50) CHECK (topic IN ('Karakter & Akhlak', 'Akademik', 'Bakat dan Minat')),
    notes TEXT NOT NULL,
    recorded_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jadwal Konseling BK
CREATE TABLE IF NOT EXISTS public.bimbingan_schedules (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    date DATE NOT NULL,
    time VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) CHECK (target_type IN ('Kelas', 'Individu', 'Orang Tua')),
    target_id VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    notes TEXT,
    recorded_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. PRESTASI SISWA & KUSTOMISASI SERTIFIKAT DIGITAL
-- ==============================================================================

-- Prestasi Akademik & Non-Akademik Siswa
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(200) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Akademik', 'Non Akademik')),
    level VARCHAR(50) NOT NULL, -- 'Sekolah', 'Kecamatan', 'Kota/Kabupaten', 'Provinsi', 'Nasional', 'Internasional'
    date DATE NOT NULL,
    ekskul_name VARCHAR(150),
    rank VARCHAR(100), -- Juara 1, Medali Emas, dll.
    notes TEXT,
    recorded_by VARCHAR(150) NOT NULL,
    certificate_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pengaturan Desain & Tampilan Sertifikat Digital
CREATE TABLE IF NOT EXISTS public.certificate_configs (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    academic_bg_url TEXT,
    non_academic_bg_url TEXT,
    logo_left_url TEXT,
    logo_right_url TEXT,
    logo_auto_sync BOOLEAN DEFAULT TRUE,
    bg_opacity INTEGER DEFAULT 35,
    frame_style VARCHAR(50) DEFAULT 'double-gold',
    watermark_style VARCHAR(50) DEFAULT 'school-crest',
    font_family VARCHAR(50) DEFAULT 'serif',
    school_header VARCHAR(255) DEFAULT 'SMP NEGERI 50 JAKARTA',
    sub_header TEXT DEFAULT 'PEMERINTAH PROVINSI DKI JAKARTA • DINAS PENDIDIKAN',
    show_stamp BOOLEAN DEFAULT TRUE,
    show_watermark BOOLEAN DEFAULT TRUE,
    number_template VARCHAR(150) DEFAULT '50/SERT/{CAT}/{YEAR}/{ID}',
    left_sign_title VARCHAR(150) DEFAULT 'Pembina / Pelatih Ekstrakurikuler',
    left_sign_name VARCHAR(150) DEFAULT 'Budi Santoso, S.Pd.',
    left_sign_img TEXT,
    right_sign_title VARCHAR(150) DEFAULT 'Kepala SMP Negeri 50 Jakarta',
    right_sign_name VARCHAR(150) DEFAULT 'Dra. Hj. Endah Purwani, M.M.',
    right_sign_nip VARCHAR(50) DEFAULT '196711261991032004',
    right_sign_img TEXT,
    stamp_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. PROGRAM ECO-TIKET (BANK SAMPAH SEKOLAH & DUTA KEBERSIHAN)
-- ==============================================================================

-- Kategori Sampah yang Dapat Disetor
CREATE TABLE IF NOT EXISTS public.eco_waste_categories (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- buah, kg, liter, ikat
    points_per_unit INTEGER NOT NULL DEFAULT 1,
    icon VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Riwayat Setor Sampah Siswa
CREATE TABLE IF NOT EXISTS public.eco_waste_deposits (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(200) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    category_id VARCHAR(100) REFERENCES public.eco_waste_categories(id) ON DELETE SET NULL,
    category_name VARCHAR(150) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    notes TEXT,
    recorded_by VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'Menunggu' CHECK (status IN ('Diverifikasi', 'Menunggu', 'Ditolak')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Katalog Hadiah / Reward Ramah Lingkungan
CREATE TABLE IF NOT EXISTS public.eco_rewards (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name VARCHAR(200) NOT NULL,
    points_required INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    description TEXT,
    category VARCHAR(50) DEFAULT 'Alat Tulis',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Penukaran Hadiah atau Penebusan Poin Pelanggaran
CREATE TABLE IF NOT EXISTS public.eco_redemptions (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(200) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('tebus_pelanggaran', 'tukar_hadiah')),
    reward_id VARCHAR(100) REFERENCES public.eco_rewards(id) ON DELETE SET NULL,
    reward_name VARCHAR(200),
    points_spent INTEGER NOT NULL,
    violation_points_reduced INTEGER DEFAULT 0,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Menunggu' CHECK (status IN ('Selesai', 'Menunggu', 'Ditolak')),
    notes TEXT,
    approved_by VARCHAR(150),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Konfigurasi Parameter ECo-Tiket
CREATE TABLE IF NOT EXISTS public.eco_configs (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    eco_points_per_violation_point INTEGER DEFAULT 5,
    ambassador_min_points INTEGER DEFAULT 50,
    school_title VARCHAR(200) DEFAULT 'SMP NEGERI 50 JAKARTA',
    is_feature_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. E-LEARNING (MATERI AJAR & TRACKING PROGRES)
-- ==============================================================================

-- Materi Pembelajaran Digital
CREATE TABLE IF NOT EXISTS public.elearning_materials (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    class_ids TEXT[] DEFAULT ARRAY['ALL']::TEXT[],
    type VARCHAR(20) NOT NULL CHECK (type IN ('pdf', 'ppt', 'video', 'doc', 'link')),
    file_url TEXT,
    file_name VARCHAR(255),
    file_size VARCHAR(50),
    video_url TEXT,
    description TEXT,
    teacher_id VARCHAR(100) REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progres Belajar Siswa
CREATE TABLE IF NOT EXISTS public.student_learning_progress (
    id VARCHAR(200) PRIMARY KEY, -- e.g. "studentId_materialId"
    student_id VARCHAR(100) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(200) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    material_id VARCHAR(100) NOT NULL REFERENCES public.elearning_materials(id) ON DELETE CASCADE,
    material_title VARCHAR(255) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'Proses' CHECK (status IN ('Selesai', 'Proses')),
    notes TEXT,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. SARANA PRASARANA, INVENTARIS & PEMINJAMAN
-- ==============================================================================

-- Barang Inventaris Sekolah
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    item_name VARCHAR(200) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition VARCHAR(30) DEFAULT 'Baik' CHECK (condition IN ('Baik', 'Rusak Ringan', 'Rusak Berat')),
    location VARCHAR(150) NOT NULL,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Berita Acara Peminjaman Barang
CREATE TABLE IF NOT EXISTS public.inventory_loans (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    ba_number VARCHAR(100) NOT NULL,
    borrower_name VARCHAR(200) NOT NULL,
    borrower_role VARCHAR(50) NOT NULL,
    borrower_contact VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    loan_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    purpose TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Dipinjam' CHECK (status IN ('Dipinjam', 'Dikembalikan', 'Terlambat', 'Hilang/Rusak')),
    condition_before VARCHAR(30) DEFAULT 'Baik',
    condition_after VARCHAR(30),
    recorded_by VARCHAR(150) NOT NULL,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. TATA USAHA, SURAT MENYURAT, KEUANGAN BOS/BOP & AGENDA
-- ==============================================================================

-- Buku Agenda Penomoran Surat
CREATE TABLE IF NOT EXISTS public.nomor_surat (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    letter_number VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    recorded_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jadwal Pemberkasan Dokumen
CREATE TABLE IF NOT EXISTS public.pemberkasan_schedules (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title VARCHAR(255) NOT NULL,
    target_class_id VARCHAR(50) DEFAULT 'all',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    required_docs TEXT[] DEFAULT ARRAY[]::TEXT[],
    recorded_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transparansi Anggaran BOS & BOP
CREATE TABLE IF NOT EXISTS public.bos_bop_reports (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    fund_type VARCHAR(10) NOT NULL CHECK (fund_type IN ('BOS', 'BOP')),
    period VARCHAR(100) NOT NULL, -- Triwulan I 2026
    year INTEGER NOT NULL,
    budget_total NUMERIC(15,2) NOT NULL,
    expense_total NUMERIC(15,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    recorded_by VARCHAR(150) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pendaftaran Akun Pending (Menunggu Persetujuan Admin)
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    nip_or_nisn_or_nik VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    class_id VARCHAR(50),
    gender VARCHAR(20),
    student_nisn_or_name VARCHAR(150),
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pengaturan Jam Masuk & Toleransi Keterlambatan
CREATE TABLE IF NOT EXISTS public.school_time_configs (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    school_start_time VARCHAR(10) DEFAULT '07:00',
    late_penalty_points INTEGER DEFAULT 5,
    is_late_penalty_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pengaturan KOP Surat Resmi & Info Sekolah
CREATE TABLE IF NOT EXISTS public.school_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    school_title VARCHAR(200) DEFAULT 'SMP NEGERI 50 JAKARTA',
    gov_title VARCHAR(200) DEFAULT 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA',
    dept_title VARCHAR(200) DEFAULT 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA',
    sudin_title VARCHAR(200) DEFAULT 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR',
    address_text TEXT DEFAULT 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510',
    contact_text TEXT DEFAULT 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com',
    headmaster_name VARCHAR(200) DEFAULT 'Dra. Hj. Endah Purwani, M.M.',
    headmaster_nip VARCHAR(50) DEFAULT '196711261991032004',
    logo_left TEXT DEFAULT '/logo-dki.png',
    logo_right TEXT,
    cbt_bypass_pin VARCHAR(20) DEFAULT '5050',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Konten Profil Web Sekolah (Landing Page & Portal)
CREATE TABLE IF NOT EXISTS public.web_section_contents (
    id VARCHAR(50) PRIMARY KEY, -- 'home', 'academic', 'kesiswaan', 'sarpras', 'berita'
    header_bg_image TEXT,
    header_title TEXT,
    header_subtitle TEXT,
    header_motto TEXT,
    school_logo TEXT,
    akreditasi VARCHAR(20) DEFAULT 'A',
    head_name VARCHAR(200),
    head_image TEXT,
    head_role VARCHAR(100),
    head_motto TEXT,
    head_born VARCHAR(100),
    head_subject VARCHAR(100),
    head_hobby VARCHAR(100),
    staff JSONB DEFAULT '[]'::JSONB,
    programs JSONB DEFAULT '[]'::JSONB,
    slides JSONB DEFAULT '[]'::JSONB,
    subjects JSONB DEFAULT '[]'::JSONB,
    extracurriculars JSONB DEFAULT '[]'::JSONB,
    facilities JSONB DEFAULT '[]'::JSONB,
    articles JSONB DEFAULT '[]'::JSONB,
    tickers JSONB DEFAULT '[]'::JSONB,
    activities JSONB DEFAULT '[]'::JSONB,
    agendas JSONB DEFAULT '[]'::JSONB,
    vision TEXT,
    missions TEXT[] DEFAULT ARRAY[]::TEXT[],
    vision_pillars JSONB DEFAULT '[]'::JSONB,
    instagram VARCHAR(150),
    whatsapp VARCHAR(50),
    email VARCHAR(150),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. INDEXING UNTUK KECEPATAN QUERY
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_student_violations_student ON public.student_violations(student_id);
CREATE INDEX IF NOT EXISTS idx_eco_deposits_student ON public.eco_waste_deposits(student_id);
CREATE INDEX IF NOT EXISTS idx_eco_deposits_class ON public.eco_waste_deposits(class_id);
CREATE INDEX IF NOT EXISTS idx_eco_deposits_status ON public.eco_waste_deposits(status);
CREATE INDEX IF NOT EXISTS idx_eco_redemptions_student ON public.eco_redemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_elearning_materials_subject ON public.elearning_materials(subject);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON public.student_achievements(student_id);

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) & POLICIES DI SUPABASE
-- ==============================================================================

-- Aktifkan RLS di setiap tabel
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeroom_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absent_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bimbingan_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bimbingan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_waste_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_waste_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomor_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pemberkasan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bos_bop_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_time_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_section_contents ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Membaca Data Umum (Anon & Authenticated)
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'classes', 'teachers', 'students', 'attendance', 'violation_types',
        'student_violations', 'counselor_notes', 'homeroom_notes', 'parent_messages',
        'student_grades', 'exam_schedules', 'question_banks', 'student_exam_submissions',
        'exam_grades', 'teaching_journals', 'absent_teachers', 'important_events',
        'bimbingan_journals', 'bimbingan_schedules', 'student_achievements',
        'certificate_configs', 'eco_waste_categories', 'eco_waste_deposits',
        'eco_rewards', 'eco_redemptions', 'eco_configs', 'elearning_materials',
        'student_learning_progress', 'inventory_items', 'inventory_loans',
        'nomor_surat', 'pemberkasan_schedules', 'bos_bop_reports',
        'pending_registrations', 'school_time_configs', 'school_settings', 'web_section_contents'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Policy SELECT publik / terotentikasi
        EXECUTE format('DROP POLICY IF EXISTS "Allow Public Read %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow Public Read %I" ON public.%I FOR SELECT USING (true)', tbl, tbl);
        
        -- Policy INSERT / UPDATE / DELETE untuk operasional aplikasi
        EXECUTE format('DROP POLICY IF EXISTS "Allow Full Access %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow Full Access %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 15. SEED DATA AWAL (DEFAULT CONFIGS)
-- ==============================================================================

-- Default Certificate Config
INSERT INTO public.certificate_configs (
    id, academic_bg_url, non_academic_bg_url, logo_left_url, logo_auto_sync, bg_opacity, frame_style, watermark_style, font_family, school_header
) VALUES (
    'default',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    '/logo-dki.png',
    TRUE,
    35,
    'double-gold',
    'school-crest',
    'serif',
    'SMP NEGERI 50 JAKARTA'
) ON CONFLICT (id) DO NOTHING;

-- Default ECo Config
INSERT INTO public.eco_configs (
    id, eco_points_per_violation_point, ambassador_min_points, school_title, is_feature_active
) VALUES (
    'default',
    5,
    50,
    'SMP NEGERI 50 JAKARTA',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- Default School Kop Surat
INSERT INTO public.school_settings (
    id, school_title, gov_title, dept_title, sudin_title, headmaster_name, headmaster_nip, logo_left, cbt_bypass_pin
) VALUES (
    'default',
    'SMP NEGERI 50 JAKARTA',
    'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA',
    'DINAS PENDIDIKAN PROVINSI DKI JAKARTA',
    'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR',
    'Dra. Hj. Endah Purwani, M.M.',
    '196711261991032004',
    '/logo-dki.png',
    '5050'
) ON CONFLICT (id) DO NOTHING;

-- Default ECo Waste Categories
INSERT INTO public.eco_waste_categories (id, name, unit, points_per_unit, description) VALUES
    ('cat-1', 'Botol Plastik PET Bersih', 'buah', 2, 'Botol air mineral/minuman tanpa tutup dan label'),
    ('cat-2', 'Gelas Plastik Bersih', 'buah', 1, 'Gelas plastik minuman bersih tanpa sedotan'),
    ('cat-3', 'Kardus & Kertas Bekas', 'kg', 15, 'Kardus coklat dan kertas HVS bebas minyak/air'),
    ('cat-4', 'Kaleng Minuman Aluminium', 'buah', 5, 'Kaleng soda/minuman aluminium bersih'),
    ('cat-5', 'Minyak Jelantah', 'liter', 25, 'Minyak goreng bekas dalam wadah tertutup')
ON CONFLICT (id) DO NOTHING;
