import React, { useState, useMemo } from 'react';
import { Student, SchoolClass, StudentExamSubmission, ExamGrade, ExamSchedule } from '../types';
import { Download, FileSpreadsheet, Search, Filter, Printer, FileText, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF } from '../utils/printHelper';

interface CbtScoreExporterProps {
  students: Student[];
  classes: SchoolClass[];
  studentSubmissions?: StudentExamSubmission[];
  examGrades?: ExamGrade[];
  examSchedules?: ExamSchedule[];
  teacherId?: string;
  themeColor?: 'amber' | 'teal' | 'indigo';
}

export const CbtScoreExporter: React.FC<CbtScoreExporterProps> = ({
  students,
  classes,
  studentSubmissions = [],
  examGrades = [],
  examSchedules = [],
  teacherId,
  themeColor = 'amber'
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique subjects from schedules, submissions, and grades
  const availableSubjects = useMemo(() => {
    const subjectsSet = new Set<string>();
    examSchedules.forEach(s => s.subject && subjectsSet.add(s.subject));
    studentSubmissions.forEach(s => s.subject && subjectsSet.add(s.subject));
    examGrades.forEach(g => g.subject && subjectsSet.add(g.subject));
    
    if (subjectsSet.size === 0) {
      return [
        'Pendidikan Agama dan Budi Pekerti',
        'Pendidikan Pancasila',
        'Bahasa Indonesia',
        'Matematika',
        'Ilmu Pengetahuan Alam (IPA)',
        'Ilmu Pengetahuan Sosial (IPS)',
        'Bahasa Inggris',
        'Informatika',
        'PJOK',
        'Seni dan Prakarya'
      ];
    }
    return Array.from(subjectsSet).sort();
  }, [examSchedules, studentSubmissions, examGrades]);

  // Unified list of CBT results
  const combinedResults = useMemo(() => {
    const results: Array<{
      id: string;
      studentId: string;
      studentName: string;
      nisn: string;
      classId: string;
      className: string;
      subject: string;
      score: number;
      status: 'Lulus' | 'Remedial';
      date: string;
      source: 'cbt_submission' | 'exam_grade';
      examType: string;
    }> = [];

    // 1. Process student CBT submissions
    studentSubmissions.forEach((sub) => {
      const student = students.find((s) => s.id === sub.studentId);
      const studentClass = classes.find((c) => c.id === (sub.classId || student?.classId));
      const score = sub.score !== undefined ? sub.score : 0;
      const schedule = examSchedules.find((sch) => sch.id === sub.examScheduleId);

      results.push({
        id: sub.id,
        studentId: sub.studentId,
        studentName: sub.studentName || student?.name || 'Siswa',
        nisn: student?.nisn || '-',
        classId: sub.classId || student?.classId || '7-A',
        className: studentClass?.name || sub.classId || '7-A',
        subject: sub.subject || schedule?.subject || 'CBT',
        score: Math.round(score),
        status: score >= 75 ? 'Lulus' : 'Remedial',
        date: sub.submittedAt ? sub.submittedAt.split('T')[0] : new Date().toISOString().split('T')[0],
        source: 'cbt_submission',
        examType: schedule?.examType || 'Evaluasi CBT'
      });
    });

    // 2. Process exam grades (if not duplicated with submission)
    examGrades.forEach((g) => {
      const existing = results.find((r) => r.studentId === g.studentId && r.subject === g.subject && r.date === g.date);
      if (!existing) {
        const student = students.find((s) => s.id === g.studentId);
        const studentClass = classes.find((c) => c.id === (g.classId || student?.classId));

        results.push({
          id: g.id,
          studentId: g.studentId,
          studentName: student?.name || 'Siswa',
          nisn: student?.nisn || '-',
          classId: g.classId || student?.classId || '7-A',
          className: studentClass?.name || g.classId || '7-A',
          subject: g.subject,
          score: Math.round(g.score),
          status: g.status || (g.score >= 75 ? 'Lulus' : 'Remedial'),
          date: g.date || new Date().toISOString().split('T')[0],
          source: 'exam_grade',
          examType: g.examType || 'Ujian CBT'
        });
      }
    });

    return results;
  }, [studentSubmissions, examGrades, students, classes, examSchedules]);

  // Filtered CBT results
  const filteredResults = useMemo(() => {
    return combinedResults.filter((res) => {
      // Filter by class
      if (selectedClassId !== 'all' && res.classId !== selectedClassId) {
        return false;
      }
      // Filter by subject
      if (selectedSubject !== 'all' && res.subject !== selectedSubject) {
        return false;
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = res.studentName.toLowerCase().includes(q);
        const matchNisn = res.nisn.toLowerCase().includes(q);
        const matchSubject = res.subject.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchSubject) return false;
      }
      return true;
    });
  }, [combinedResults, selectedClassId, selectedSubject, searchQuery]);

  // Excel Export Handler
  const handleExportExcel = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data nilai CBT yang memenuhi kriteria filter.');
      return;
    }

    const classNameStr = selectedClassId === 'all' ? 'Semua_Kelas' : (classes.find(c => c.id === selectedClassId)?.name || selectedClassId);
    const subjectStr = selectedSubject === 'all' ? 'Semua_Mapel' : selectedSubject.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Nilai_CBT_${classNameStr}_${subjectStr}_${new Date().toISOString().split('T')[0]}`;

    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Kategori Ujian', 'Nilai CBT (0-100)', 'Status KKM (≥75)', 'Tanggal Pengerjaan'];
    const rows = filteredResults.map((r, idx) => [
      idx + 1,
      r.nisn,
      r.studentName,
      r.className,
      r.subject,
      r.examType,
      r.score,
      r.status,
      r.date
    ]);

    downloadExcel(`${fileName}.xlsx`, headers, rows, 'Nilai CBT Siswa');
  };

  // PDF Print Handler
  const handlePrintPdf = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data nilai CBT yang memenuhi kriteria filter.');
      return;
    }

    const classNameStr = selectedClassId === 'all' ? 'Semua Kelas' : (classes.find(c => c.id === selectedClassId)?.name || selectedClassId);
    const subjectStr = selectedSubject === 'all' ? 'Semua Mata Pelajaran' : selectedSubject;

    const pdfTitle = `REKAPITULASI HASIL NILAI UJIAN CBT SISWA - ${classNameStr} (${subjectStr})`;
    const pdfHeaders = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Nilai CBT', 'Status KKM', 'Tanggal'];
    const pdfRows = filteredResults.map((r, idx) => [
      (idx + 1).toString(),
      r.nisn,
      r.studentName,
      r.className,
      r.subject,
      `${r.score} / 100`,
      r.status,
      r.date
    ]);

    printTablePDF(pdfTitle, pdfHeaders, pdfRows);
  };

  const btnBgClass = themeColor === 'amber'
    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
    : themeColor === 'teal'
    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200';

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Download &amp; Export Nilai CBT Siswa</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
              Otomatis Real-time
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Nilai diambil secara otomatis dari pengerjaan CBT siswa. Filter berdasarkan Kelas &amp; Mata Pelajaran lalu unduh dalam format Excel (.xlsx) atau PDF.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${btnBgClass}`}
          >
            <Download className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs">
        {/* Class Filter */}
        <div className="space-y-1">
          <label className="block font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Kelas:
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">Semua Kelas ({classes.length} Kelas)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div className="space-y-1">
          <label className="block font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Mata Pelajaran:
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {availableSubjects.map((sbj) => (
              <option key={sbj} value={sbj}>
                {sbj}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="space-y-1">
          <label className="block font-bold text-slate-600 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            Cari Nama / NISN Siswa:
          </label>
          <input
            type="text"
            placeholder="Ketik nama atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Results Summary & Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Menampilkan <strong className="text-slate-800">{filteredResults.length}</strong> entri nilai CBT</span>
          <span className="text-slate-400">Rata-rata Nilai: <strong className="text-emerald-600">{filteredResults.length > 0 ? Math.round(filteredResults.reduce((a, b) => a + b.score, 0) / filteredResults.length) : 0}</strong></span>
        </div>

        {filteredResults.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600 text-sm">Belum Ada Data Nilai CBT Tersedia</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Siswa belum mengerjakan ujian CBT untuk filter kelas &amp; mata pelajaran ini, atau belum ada pengerjaan yang tersimpan.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-inner">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">NISN</th>
                  <th className="p-3">Nama Siswa</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3 text-center">Skor CBT</th>
                  <th className="p-3 text-center">Status KKM</th>
                  <th className="p-3 text-right">Tanggal Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredResults.map((r, idx) => (
                  <tr key={r.id + idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center font-semibold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-500">{r.nisn}</td>
                    <td className="p-3 font-bold text-slate-800">{r.studentName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[11px] border border-indigo-100">
                        {r.className}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{r.subject}</td>
                    <td className="p-3 text-center">
                      <span className={`text-sm font-extrabold ${r.score >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {r.score}
                      </span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </td>
                    <td className="p-3 text-center">
                      {r.status === 'Lulus' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Lulus
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Remedial
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-500">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
