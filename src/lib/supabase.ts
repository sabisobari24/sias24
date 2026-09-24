import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase (Can be defined in .env or Vercel dashboard)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

/**
 * Checks whether Supabase has been configured with real credentials
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20 &&
    !supabaseUrl.includes('placeholder')
  );
};

/**
 * Supabase client instance (initialized if credentials exist)
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Helper to generate SQL INSERT queries for migrating existing Firestore collections to Supabase
 */
export function generateSupabaseMigrationSQL(data: {
  classes?: any[];
  students?: any[];
  teachers?: any[];
  attendance?: any[];
  violationTypes?: any[];
  violations?: any[];
  settings?: any;
  webContent?: any;
}): string {
  const lines: string[] = [
    '-- ============================================================================',
    '-- DATA MIGRATION SCRIPT FROM FIREBASE TO SUPABASE (POSTGRESQL)',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Run this in Supabase SQL Editor AFTER running schema.sql',
    '-- ============================================================================\n',
  ];

  // 1. Classes
  if (data.classes && data.classes.length > 0) {
    lines.push('-- 1. Classes Data');
    for (const c of data.classes) {
      const id = escapeSql(c.id);
      const name = escapeSql(c.name);
      const level = escapeSql(c.level || '');
      const year = escapeSql(c.academicYear || '');
      const teacher = escapeSql(c.homeroomTeacherId || '');
      const count = Number(c.totalStudents || 0);
      lines.push(
        `INSERT INTO public.classes (id, name, level, academic_year, homeroom_teacher_id, total_students) ` +
        `VALUES (${id}, ${name}, ${level}, ${year}, ${teacher}, ${count}) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, level = EXCLUDED.level;`
      );
    }
    lines.push('');
  }

  // 2. Students
  if (data.students && data.students.length > 0) {
    lines.push('-- 2. Students Data');
    for (const s of data.students) {
      const id = escapeSql(s.id);
      const name = escapeSql(s.name);
      const nisn = escapeSql(s.nisn);
      const classId = s.classId ? escapeSql(s.classId) : 'NULL';
      const gender = escapeSql(s.gender || 'Laki-laki');
      const address = escapeSql(s.address || '');
      const phone = escapeSql(s.phone || '');
      const parentName = escapeSql(s.parentName || '');
      const parentNik = escapeSql(s.parentNik || '');
      const parentPhone = escapeSql(s.parentPhone || '');
      const parentEmail = escapeSql(s.parentEmail || '');
      lines.push(
        `INSERT INTO public.students (id, name, nisn, class_id, gender, address, phone, parent_name, parent_nik, parent_phone, parent_email) ` +
        `VALUES (${id}, ${name}, ${nisn}, ${classId}, ${gender}, ${address}, ${phone}, ${parentName}, ${parentNik}, ${parentPhone}, ${parentEmail}) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, class_id = EXCLUDED.class_id;`
      );
    }
    lines.push('');
  }

  // 3. Teachers
  if (data.teachers && data.teachers.length > 0) {
    lines.push('-- 3. Teachers Data');
    for (const t of data.teachers) {
      const id = escapeSql(t.id);
      const name = escapeSql(t.name);
      const nip = escapeSql(t.nip);
      const email = escapeSql(t.email || '');
      const role = escapeSql(t.role || 'guru');
      const phone = escapeSql(t.phone || '');
      lines.push(
        `INSERT INTO public.teachers (id, name, nip, email, role, phone) ` +
        `VALUES (${id}, ${name}, ${nip}, ${email}, ${role}, ${phone}) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;`
      );
    }
    lines.push('');
  }

  // 4. Violation Types
  if (data.violationTypes && data.violationTypes.length > 0) {
    lines.push('-- 4. Violation Types');
    for (const vt of data.violationTypes) {
      const id = escapeSql(vt.id);
      const name = escapeSql(vt.name);
      const pts = Number(vt.points || 0);
      const cat = escapeSql(vt.category || 'Umum');
      const desc = escapeSql(vt.description || '');
      lines.push(
        `INSERT INTO public.violation_types (id, name, points, category, description) ` +
        `VALUES (${id}, ${name}, ${pts}, ${cat}, ${desc}) ` +
        `ON CONFLICT (id) DO NOTHING;`
      );
    }
    lines.push('');
  }

  // 5. Web Content
  if (data.webContent) {
    lines.push('-- 5. Web Content');
    const id = escapeSql(data.webContent.id || 'default');
    const logo = escapeSql(data.webContent.schoolLogo || '');
    const akred = escapeSql(data.webContent.akreditasi || 'A');
    const sambutan = escapeSql(data.webContent.sambutan || '');
    const visi = escapeSql(data.webContent.visi || '');
    lines.push(
      `INSERT INTO public.web_content (id, school_logo, akreditasi, sambutan, visi) ` +
      `VALUES (${id}, ${logo}, ${akred}, ${sambutan}, ${visi}) ` +
      `ON CONFLICT (id) DO UPDATE SET school_logo = EXCLUDED.school_logo, akreditasi = EXCLUDED.akreditasi;`
    );
    lines.push('');
  }

  return lines.join('\n');
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return "''";
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}
