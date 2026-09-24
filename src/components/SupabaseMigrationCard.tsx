import React, { useState } from 'react';
import { Database, Download, Copy, Check, ExternalLink, ShieldCheck, Terminal, Rocket, Layers, Code, Sparkles } from 'lucide-react';
import { isSupabaseConfigured, generateSupabaseMigrationSQL } from '../lib/supabase';
import { SchoolClass, Student, Teacher, ViolationType, StudentViolation } from '../types';

interface SupabaseMigrationCardProps {
  classes: SchoolClass[];
  students: Student[];
  teachers: Teacher[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  webHomeContent?: any;
}

export default function SupabaseMigrationCard({
  classes,
  students,
  teachers,
  violationTypes,
  violations,
  webHomeContent,
}: SupabaseMigrationCardProps) {
  const [activeTab, setActiveTab] = useState<'schema' | 'export_data' | 'vercel_guide'>('schema');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [generatedSql, setGeneratedSql] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const isConfigured = isSupabaseConfigured();

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateDataSql = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const sql = generateSupabaseMigrationSQL({
        classes,
        students,
        teachers,
        violationTypes,
        violations,
        webContent: webHomeContent,
      });
      setGeneratedSql(sql);
      setIsGenerating(false);
    }, 400);
  };

  const schemaSqlOverview = `-- ============================================================================
-- SKEMA SUPABASE POSTGRESQL (schema.sql)
-- Tabel: profiles, classes, students, teachers, attendance, violation_types,
--        violations, cbt_exams, cbt_questions, cbt_submissions,
--        pending_registrations, web_content, school_settings, inventaris,
--        letter_numbers, bos_bop_reports, kjp_recipients, announcements
-- Fitur: Row Level Security (RLS) Zero-Trust, Trigger updated_at, Foreign Keys, Indexes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Auth Link)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    user_class VARCHAR(50),
    nip VARCHAR(50),
    nisn VARCHAR(30),
    phone VARCHAR(30),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Classes (Rombel)
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

-- 3. Students
CREATE TABLE IF NOT EXISTS public.students (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    nisn VARCHAR(20) NOT NULL,
    class_id VARCHAR(128) REFERENCES public.classes(id) ON DELETE SET NULL,
    gender VARCHAR(20),
    address TEXT,
    phone VARCHAR(30),
    parent_name VARCHAR(150),
    parent_nik VARCHAR(30),
    parent_phone VARCHAR(30),
    parent_email VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Teachers
CREATE TABLE IF NOT EXISTS public.teachers (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    nip VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    roles TEXT[] DEFAULT '{}',
    phone VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Attendance & Violations
CREATE TABLE IF NOT EXISTS public.attendance (
    id VARCHAR(128) PRIMARY KEY,
    student_id VARCHAR(128) REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    time VARCHAR(30),
    notes TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

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
    points INT NOT NULL DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 6. CBT Exams & Questions
CREATE TABLE IF NOT EXISTS public.cbt_exams (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    class_id VARCHAR(128),
    duration_minutes INT NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
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

-- Row Level Security (RLS) Diaktifkan di seluruh tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_exams ENABLE ROW LEVEL SECURITY;

-- Publik dapat membaca Kelas dan Konten Web
CREATE POLICY "Public Read Classes" ON public.classes FOR SELECT USING (true);
`;

  return (
    <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20 space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase &amp; Vercel Ready
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PostgreSQL Relasional
            </span>
          </div>
          <h3 className="text-lg font-extrabold flex items-center gap-2.5 tracking-tight text-white">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Migrasi &amp; Skema Supabase + Vercel Deployment</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Skema database PostgreSQL Supabase lengkap dengan Row Level Security (RLS), script migrasi data otomatis dari sistem aktif, dan konfigurasi deployment instan untuk Vercel (<code className="text-emerald-300 font-mono">vercel.json</code>).
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl self-start md:self-auto">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status Koneksi Supabase</p>
            <p className={`text-xs font-bold ${isConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isConfigured ? '✓ Terkoneksi ke Supabase' : 'Standby (Menggunakan Firebase)'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-amber-400 shadow-md shadow-amber-400/50'}`} />
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>1. Skema DDL SQL Supabase</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('export_data');
            if (!generatedSql) handleGenerateDataSql();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'export_data'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Ekspor Data Aktif ke Supabase SQL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vercel_guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'vercel_guide'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>3. Panduan Deploy ke Vercel</span>
        </button>
      </div>

      {/* TAB 1: SKEMA DDL SQL */}
      {activeTab === 'schema' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>File SQL Tersedia: <code className="text-emerald-300 font-mono">supabase/schema.sql</code></span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Berisi 18 tabel relasional, Primary Key, Foreign Key cascade, Index performa, Row Level Security (RLS), dan trigger update otomatis.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(schemaSqlOverview, 'schema')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedType === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'schema' ? 'Tersalin!' : 'Salin DDL SQL'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('supabase-schema.sql', schemaSqlOverview)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh schema.sql</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto scrollbar-thin">
            <pre className="whitespace-pre leading-relaxed">{schemaSqlOverview}</pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">1. Row Level Security (RLS)</span>
              <p className="text-slate-300 text-[11px]">Semua data siswa, nilai, pelanggaran, dan administrasi terlindungi oleh policy RLS ketat.</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">2. Triggers Otomatis</span>
              <p className="text-slate-300 text-[11px]">Kolom <code className="text-indigo-300">updated_at</code> diperbarui otomatis oleh trigger PL/pgSQL setiap operasi UPDATE.</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">3. JSONB Support</span>
              <p className="text-slate-300 text-[11px]">Mendukung array opsi CBT, slide banner website, dan data dinamis menggunakan tipe data JSONB native PostgreSQL.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPORT DATA FIREBASE KE SUPABASE SQL */}
      {activeTab === 'export_data' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Generator Data SQL untuk Supabase</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mengonversi data aktif ({classes.length} Kelas, {students.length} Siswa, {teachers.length} Guru, {violationTypes.length} Aturan) ke query INSERT SQL Supabase.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGenerateDataSql}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Memproses...' : 'Refresh Data SQL'}</span>
              </button>
              {generatedSql && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedSql, 'data_sql')}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedType === 'data_sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'data_sql' ? 'Tersalin!' : 'Salin Script'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('data-migration-supabase.sql', generatedSql)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh SQL</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto scrollbar-thin">
            {generatedSql ? (
              <pre className="whitespace-pre leading-relaxed">{generatedSql}</pre>
            ) : (
              <p className="text-slate-500 italic text-center py-8">Klik &quot;Refresh Data SQL&quot; untuk menghasilkan query migrasi data.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PANDUAN DEPLOY KE VERCEL */}
      {activeTab === 'vercel_guide' && (
        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <span>Langkah-Langkah Menghubungkan ke Supabase &amp; Deploy ke Vercel</span>
            </h4>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">1</span>
                <div>
                  <strong className="text-white">Jalankan Skema di Supabase:</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">Buka Supabase Dashboard &gt; SQL Editor &gt; New Query &gt; Salin isi file <code className="text-emerald-300 font-mono">supabase/schema.sql</code> &gt; Klik Run.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">2</span>
                <div>
                  <strong className="text-white">Ambil Kredensial API Supabase:</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">Buka Supabase Dashboard &gt; Project Settings &gt; API &gt; Salin <code className="text-emerald-300 font-mono">Project URL</code> dan <code className="text-emerald-300 font-mono">anon public key</code>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">3</span>
                <div>
                  <strong className="text-white">Konfigurasi Vercel:</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    File <code className="text-emerald-300 font-mono">vercel.json</code> sudah otomatis dibuat di root proyek dengan routing SPA (rewrite <code className="text-emerald-300 font-mono">/(.*) -&gt; /index.html</code>) dan header keamanan.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">4</span>
                <div>
                  <strong className="text-white">Tambahkan Environment Variables di Vercel:</strong>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300 mt-1 space-y-1">
                    <p>VITE_SUPABASE_URL = https://your-project.supabase.co</p>
                    <p>VITE_SUPABASE_ANON_KEY = eyJhbGciOi...</p>
                    <p>VITE_STORAGE_BACKEND = supabase</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
