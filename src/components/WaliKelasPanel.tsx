import React, { useState, useEffect } from 'react';
import { Student, Attendance, SchoolClass, ViolationType, StudentViolation, Teacher, HomeroomNote, ParentMessage, StudentAchievement, StudentGrade } from '../types';
import { GraduationCap, Users, Calendar, AlertTriangle, FileText, CheckCircle, Save, MessageSquare, Send, Check, Award, FileSpreadsheet, Search, Download, Filter } from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF } from '../utils/printHelper';
import { syncCollection } from '../lib/firebase';
import { INITIAL_WEB_CONTENT } from '../data/initialWebContent';

interface WaliKelasPanelProps {
  teacher: Teacher;
  students: Student[];
  classes: SchoolClass[];
  attendance: Attendance[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  homeroomNotes: HomeroomNote[];
  parentMessages: ParentMessage[];
  studentAchievements?: StudentAchievement[];
  onAddHomeroomNote: (note: Omit<HomeroomNote, 'id'>) => void;
  onReplyToParent: (messageId: string, replyMsg: string) => void;
  onSwitchRole?: (role: any) => void;
  activeTabOverride?: 'beranda' | 'catatan' | 'pesan' | 'prestasi' | 'ekskul' | null;
  onTabChange?: (tab: 'beranda' | 'catatan' | 'pesan' | 'prestasi' | 'ekskul') => void;
}

export default function WaliKelasPanel({
  teacher,
  students,
  classes,
  attendance,
  violationTypes,
  violations,
  homeroomNotes,
  parentMessages,
  studentAchievements = [],
  onAddHomeroomNote,
  onReplyToParent,
  onSwitchRole,
  activeTabOverride,
  onTabChange,
}: WaliKelasPanelProps) {
  // Find managed class
  const managedClass = classes.find((c) => c.homeroomTeacherId === teacher.id);
  const classStudents = students.filter((s) => s.classId === managedClass?.id);
  const classStudentIds = classStudents.map((s) => s.id);

  // Class achievements
  const classAchievements = studentAchievements.filter(a => classStudentIds.includes(a.studentId) || a.classId === managedClass?.id || a.classId === managedClass?.name);

  // Calculate roles this teacher holds
  const qualifiedRoles: { role: string; label: string }[] = [
    { role: 'guru', label: 'Guru Mata Pelajaran' },
    { role: 'wali_kelas', label: 'Wali Kelas' }
  ];
  if (students.some(s => s.guruWaliTeacherId === teacher.id)) {
    qualifiedRoles.push({ role: 'guru_wali', label: 'Guru Wali (Akademik)' });
  }
  if (teacher.role === 'bk') {
    qualifiedRoles.push({ role: 'bk', label: 'Guru BK' });
  }
  if (teacher.role === 'piket') {
    qualifiedRoles.push({ role: 'piket', label: 'Guru Piket' });
  }

  const [selectedStudentId, setSelectedStudentId] = useState<string>(classStudents[0]?.id || '');
  const [internalActiveTab, setInternalActiveTab] = useState<'beranda' | 'catatan' | 'pesan' | 'prestasi' | 'ekskul'>('beranda');
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'beranda' | 'catatan' | 'pesan' | 'prestasi' | 'ekskul') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // State for Extracurriculars & Coach Grades
  const [extracurriculars, setExtracurriculars] = useState<any[]>([]);
  const [selectedEkskulFilter, setSelectedEkskulFilter] = useState<string>('all');
  const [allClassGrades, setAllClassGrades] = useState<Record<string, StudentGrade[]>>({});
  const [searchJurnal, setSearchJurnal] = useState('');

  // Fetch extracurriculars
  useEffect(() => {
    const unsub = syncCollection<any>('web_content', (data) => {
      const kesiswaan = data.find((c: any) => c.id === 'kesiswaan');
      if (kesiswaan && kesiswaan.extracurriculars && kesiswaan.extracurriculars.length > 0) {
        setExtracurriculars(kesiswaan.extracurriculars);
      } else {
        const fallback = INITIAL_WEB_CONTENT.find((c) => c.id === 'kesiswaan');
        if (fallback && fallback.extracurriculars) {
          setExtracurriculars(fallback.extracurriculars);
        }
      }
    });
    return () => unsub();
  }, []);

  // Sync real-time student grades across all extracurricular collections
  useEffect(() => {
    if (extracurriculars.length === 0) return;
    const unsubs: (() => void)[] = [];

    extracurriculars.forEach((eks) => {
      const unsub = syncCollection<StudentGrade>(`grades_${eks.id}`, (data) => {
        setAllClassGrades((prev) => ({
          ...prev,
          [eks.id]: data
        }));
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [extracurriculars]);

  // Input states for writing notes
  const [noteContent, setNoteContent] = useState('');
  const [academicContent, setAcademicContent] = useState('');

  // Input state for replying
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // Status indicator
  const [successMsg, setSuccessMsg] = useState('');

  // Get student data
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Stats for the class
  const classAttendances = attendance.filter((a) => a.classId === managedClass?.id);
  const totalAttendanceDays = classAttendances.length;
  const totalHadir = classAttendances.filter((a) => a.status === 'Hadir').length;
  const attendanceRate = totalAttendanceDays > 0 ? Math.round((totalHadir / totalAttendanceDays) * 100) : 100;

  const classViolations = violations.filter((v) => classStudentIds.includes(v.studentId));
  const classPoints = classViolations.reduce((sum, v) => sum + v.points, 0);

  // Handle write note
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !noteContent.trim()) {
      alert('Mohon pilih siswa dan tulis catatan.');
      return;
    }

    onAddHomeroomNote({
      studentId: selectedStudentId,
      date: new Date().toISOString().split('T')[0],
      notes: noteContent.trim(),
      academicProgress: academicContent.trim(),
      recordedBy: teacher.name,
      parentAcknowledge: false,
    });

    setNoteContent('');
    setAcademicContent('');
    setSuccessMsg(`Catatan Wali Kelas untuk ${selectedStudent?.name} berhasil disimpan!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSendReply = (msgId: string) => {
    const text = replyText[msgId];
    if (!text || !text.trim()) return;

    onReplyToParent(msgId, text.trim());
    setReplyText((prev) => ({ ...prev, [msgId]: '' }));
    setSuccessMsg('Balasan pesan wali murid berhasil dikirim!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Export functions for Jurnal Pembinaan Wali Kelas
  const handleDownloadExcelJurnal = () => {
    const classNotes = homeroomNotes.filter(n => classStudentIds.includes(n.studentId));
    const headers = ['No', 'Tanggal', 'NISN', 'Nama Siswa', 'Kelas', 'Perkembangan Perilaku & Karakter', 'Catatan Akademik & Tindak Lanjut', 'Status TTD Orang Tua', 'Pencatat'];
    const rows = classNotes.map((n, idx) => {
      const s = classStudents.find(std => std.id === n.studentId);
      return [
        idx + 1,
        n.date,
        s?.nisn || '-',
        s?.name || 'Siswa',
        managedClass?.name || '-',
        n.notes || '-',
        n.academicProgress || '-',
        n.parentAcknowledge ? 'Disetujui Orang Tua' : 'Belum Disetujui',
        n.recordedBy || teacher.name
      ];
    });

    downloadExcel(`Laporan_Pembinaan_WaliKelas_${managedClass?.name || 'Binaan'}.xlsx`, headers, rows, 'Pembinaan Wali Kelas');
  };

  const handlePrintPDFJurnal = () => {
    const classNotes = homeroomNotes.filter(n => classStudentIds.includes(n.studentId));
    const headers = ['No', 'Tanggal', 'NISN', 'Nama Siswa', 'Perkembangan Perilaku & Karakter', 'Catatan Akademik & Tindak Lanjut', 'Status TTD', 'Pencatat'];
    const rows = classNotes.map((n, idx) => {
      const s = classStudents.find(std => std.id === n.studentId);
      return [
        idx + 1,
        n.date,
        s?.nisn || '-',
        s?.name || 'Siswa',
        n.notes || '-',
        n.academicProgress || '-',
        n.parentAcknowledge ? '✓ Disetujui' : '⏳ Belum',
        n.recordedBy || teacher.name
      ];
    });

    printTablePDF(
      `LAPORAN JURNAL PEMBINAAN WALI KELAS ${managedClass?.name ? managedClass.name.toUpperCase() : ''}`,
      headers,
      rows
    );
  };

  // Helper to extract extracurricular grades for class
  const getExtracurricularGradesForClass = () => {
    const classGradeList: {
      studentId: string;
      studentNisn: string;
      studentName: string;
      ekskulId: string;
      ekskulName: string;
      score: number;
      predicate: string;
      attitude: string;
      notes: string;
      updatedAt: string;
    }[] = [];

    extracurriculars.forEach((eks) => {
      if (selectedEkskulFilter !== 'all' && eks.id !== selectedEkskulFilter) return;

      const grades = allClassGrades[eks.id] || [];
      grades.forEach((g) => {
        if (classStudentIds.includes(g.studentId)) {
          classGradeList.push({
            studentId: g.studentId,
            studentNisn: classStudents.find(s => s.id === g.studentId)?.nisn || '-',
            studentName: g.studentName,
            ekskulId: eks.id,
            ekskulName: eks.name,
            score: g.score,
            predicate: g.predicate,
            attitude: g.attitude || 'Sangat Baik',
            notes: g.notes || '-',
            updatedAt: g.updatedAt ? g.updatedAt.split('T')[0] : '-'
          });
        }
      });
    });

    return classGradeList;
  };

  const handleDownloadExcelEkskul = () => {
    const gradeList = getExtracurricularGradesForClass();
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Ekstrakurikuler', 'Nilai Angka', 'Predikat', 'Sikap', 'Catatan Pelatih', 'Tanggal Input'];
    const rows = gradeList.map((g, idx) => [
      idx + 1,
      g.studentNisn,
      g.studentName,
      managedClass?.name || '-',
      g.ekskulName,
      g.score,
      g.predicate,
      g.attitude,
      g.notes,
      g.updatedAt
    ]);

    const selectedEkskulObj = extracurriculars.find(e => e.id === selectedEkskulFilter);
    const titleName = selectedEkskulObj ? selectedEkskulObj.name.replace(/\s+/g, '_') : 'Semua';
    downloadExcel(`Rekap_Nilai_Ekskul_${titleName}_Kelas_${managedClass?.name || 'Wali'}.xlsx`, headers, rows, 'Nilai Ekstrakurikuler');
  };

  const handlePrintPDFEkskul = () => {
    const gradeList = getExtracurricularGradesForClass();
    const headers = ['No', 'NISN', 'Nama Siswa', 'Ekstrakurikuler', 'Nilai', 'Predikat', 'Sikap', 'Catatan Pelatih'];
    const rows = gradeList.map((g, idx) => [
      idx + 1,
      g.studentNisn,
      g.studentName,
      g.ekskulName,
      g.score,
      g.predicate,
      g.attitude,
      g.notes
    ]);

    const selectedEkskulObj = extracurriculars.find(e => e.id === selectedEkskulFilter);
    const titleName = selectedEkskulObj ? `EKSTRAKURIKULER ${selectedEkskulObj.name.toUpperCase()}` : 'SELURUH EKSTRAKURIKULER';

    printTablePDF(
      `REKAPITULASI NILAI ${titleName} SISWA KELAS ${managedClass?.name ? managedClass.name.toUpperCase() : ''}`,
      headers,
      rows
    );
  };

  const filteredClassNotes = homeroomNotes.filter(n => {
    if (!classStudentIds.includes(n.studentId)) return false;
    if (!searchJurnal.trim()) return true;
    const std = classStudents.find(s => s.id === n.studentId);
    const q = searchJurnal.toLowerCase();
    return (
      (std?.name || '').toLowerCase().includes(q) ||
      (std?.nisn || '').toLowerCase().includes(q) ||
      (n.notes || '').toLowerCase().includes(q) ||
      (n.academicProgress || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Wali Kelas Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Portal Wali Kelas</p>
            <h1 className="text-2xl font-bold">{teacher.name}</h1>
            <p className="text-blue-100 text-sm">
              Mengampu Kelas: <span className="font-bold underline">{managedClass?.name || 'Belum Diatur'}</span>
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-center text-xs">
            <span className="font-semibold block text-blue-100">Jumlah Siswa Binaaan</span>
            <span className="text-lg font-bold">{classStudents.length} Siswa</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 font-medium shadow-sm">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB CONTENTS */}
      <div className="w-full">
        {/* BERANDA TAB */}
        {activeTab === 'beranda' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl text-emerald-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Tingkat Kehadiran Kelas</p>
                  <p className="text-2xl font-bold text-slate-800">{attendanceRate}%</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-xl text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Akumulasi Pelanggaran</p>
                  <p className="text-2xl font-bold text-slate-800">{classPoints} Poin</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Siswa Perlu Perhatian</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {classStudents.filter((s) => violations.filter(v => v.studentId === s.id).reduce((sum, v) => sum + v.points, 0) > 15).length} Siswa
                  </p>
                </div>
              </div>
            </div>

            {/* Student Directory Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="font-bold text-slate-800">Daftar Siswa Kelas {managedClass?.name}</h3>
                  <p className="text-xs text-slate-500">Komposisi siswa Laki-laki &amp; Perempuan dalam kelas binaan</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="px-3 py-1 bg-slate-200/80 text-slate-700 rounded-full font-bold">
                    👥 Total: {classStudents.length} Siswa
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                    👨 Laki-laki (L): {classStudents.filter(s => (s.gender || 'Laki-laki').toLowerCase() === 'laki-laki').length}
                  </span>
                  <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold">
                    👩 Perempuan (P): {classStudents.filter(s => (s.gender || '').toLowerCase() === 'perempuan').length}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-100/50 text-slate-700 border-b">
                  <tr>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">NISN</th>
                    <th className="p-3 text-center">Kehadiran (Hadir/Total)</th>
                    <th className="p-3 text-center">Poin Pelanggaran</th>
                    <th className="p-3">Status Catatan Anda</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {classStudents.map((s) => {
                    const sAttendance = attendance.filter((a) => a.studentId === s.id);
                    const sHadir = sAttendance.filter((a) => a.status === 'Hadir').length;
                    const sViolations = violations.filter((v) => v.studentId === s.id);
                    const sPoints = sViolations.reduce((sum, v) => sum + v.points, 0);
                    const sNotes = homeroomNotes.filter((n) => n.studentId === s.id);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            (s.gender || 'Laki-laki').toLowerCase() === 'perempuan'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {(s.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs">{s.nisn}</td>
                        <td className="p-3 text-center font-bold">
                          {sHadir} / {sAttendance.length} hari ({sAttendance.length > 0 ? Math.round((sHadir / sAttendance.length) * 100) : 100}%)
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            sPoints === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            sPoints <= 15 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {sPoints} Poin
                          </span>
                        </td>
                        <td className="p-3">
                          {sNotes.length > 0 ? (
                            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                              Sudah diberi ({sNotes.filter(n => n.parentAcknowledge).length} TTD Wali)
                            </span>
                          ) : (
                            <button
                              onClick={() => { setSelectedStudentId(s.id); setActiveTab('catatan'); }}
                              className="text-xs text-blue-600 hover:underline font-semibold"
                            >
                              + Beri Catatan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* CATATAN / JURNAL PEMBINAAN TAB */}
        {activeTab === 'catatan' && (
          <div className="space-y-6">
            {/* Header & Export Action Bar */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Jurnal Pembinaan & Evaluasi Wali Kelas
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Catat bimbingan, evaluasi karakter, serta perkembangan akademik siswa binaan kelas {managedClass?.name || ''}. Catatan ini otomatis tersinkron dengan portal Siswa & Wali Murid.
                </p>
              </div>

              {/* Download & Cetak Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadExcelJurnal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Excel Laporan</span>
                </button>
                <button
                  onClick={handlePrintPDFJurnal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Cetak / PDF Laporan</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Siswa</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {classStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Input</label>
                  <input
                    type="date"
                    disabled
                    value={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Perkembangan Perilaku, Sosial & Karakter</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Siswa sangat aktif dalam gotong royong kelas, sopan kepada guru, namun perlu sedikit merapikan kerapian rambut..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan Prestasi & Kemajuan Akademik</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Nilai ulangan matematika meningkat pesat, pertahankan semangat belajarnya..."
                    value={academicContent}
                    onChange={(e) => setAcademicContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer shadow transition-all"
                >
                  <Save className="w-4 h-4" />
                  Kirim & Publikasikan Catatan
                </button>
              </div>
            </form>

            {/* List / Table Jurnal Pembinaan Wali Kelas */}
            <div className="mt-8 border-t pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Riwayat Jurnal Pembinaan Seluruh Siswa Kelas ({filteredClassNotes.length} Catatan)</span>
                </h4>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama / catatan..."
                    value={searchJurnal}
                    onChange={(e) => setSearchJurnal(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {filteredClassNotes.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">
                    Belum ada jurnal pembinaan wali kelas yang tercatat.
                  </div>
                ) : (
                  filteredClassNotes.map((n) => {
                    const std = classStudents.find(s => s.id === n.studentId);
                    return (
                      <div key={n.id} className="p-4 hover:bg-slate-50/70 transition-all space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{std?.name || 'Siswa'}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                              NISN: {std?.nisn || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-slate-400 font-mono">Tanggal: {n.date}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                              n.parentAcknowledge
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {n.parentAcknowledge ? '✓ Disetujui Wali Murid' : '⏳ Belum TTD Wali Murid'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/70">
                            <span className="font-extrabold text-blue-900 text-[10px] block uppercase tracking-wider mb-0.5">
                              Perkembangan Perilaku & Karakter:
                            </span>
                            <p className="text-slate-700 leading-relaxed">{n.notes}</p>
                          </div>

                          <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/70">
                            <span className="font-extrabold text-indigo-900 text-[10px] block uppercase tracking-wider mb-0.5">
                              Kemajuan Akademik & Tindak Lanjut:
                            </span>
                            <p className="text-slate-700 leading-relaxed">{n.academicProgress || <span className="text-slate-400 italic">Tidak ada catatan tambahan</span>}</p>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 text-right">
                          Pencatat: <span className="font-semibold text-slate-600">{n.recordedBy || teacher.name}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* NILAI EKSTRAKURIKULER TAB */}
        {activeTab === 'ekskul' && (
          <div className="space-y-6">
            {/* Header & Download Bar */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-2 border border-white/20">
                  <Award className="w-4 h-4 text-amber-200" />
                  <span>Nilai Ekstrakurikuler Dari Pelatih / Pembina</span>
                </div>
                <h2 className="text-xl font-bold">
                  Rekapitulasi Nilai Ekstrakurikuler Kelas {managedClass?.name || ''}
                </h2>
                <p className="text-amber-100 text-xs mt-1">
                  Daftar nilai, predikat, dan evaluasi sikap yang telah di-input oleh masing-masing Pelatih / Pembina Ekskul.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadExcelEkskul}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Excel Nilai Ekskul</span>
                </button>
                <button
                  onClick={handlePrintPDFEkskul}
                  className="px-4 py-2 bg-amber-950/40 hover:bg-amber-950/60 text-white border border-amber-300/30 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-amber-200" />
                  <span>Cetak PDF Nilai Ekskul</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Filter Ekstrakurikuler:</span>
              </div>

              <select
                value={selectedEkskulFilter}
                onChange={(e) => setSelectedEkskulFilter(e.target.value)}
                className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer min-w-[220px]"
              >
                <option value="all">⭐ Semua Ekstrakurikuler</option>
                {extracurriculars.map((eks) => (
                  <option key={eks.id} value={eks.id}>
                    {eks.icon || '🏆'} {eks.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Table of Grades */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">NISN / NIS</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Ekstrakurikuler</th>
                      <th className="px-4 py-3 text-center">Nilai Angka</th>
                      <th className="px-4 py-3 text-center">Predikat</th>
                      <th className="px-4 py-3">Evaluasi Sikap</th>
                      <th className="px-4 py-3">Catatan Pelatih</th>
                      <th className="px-4 py-3 text-center">Tanggal Input</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {getExtracurricularGradesForClass().length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-slate-400 italic bg-slate-50/20">
                          Belum ada nilai yang di-input oleh Pelatih / Pembina untuk ekstrakurikuler ini.
                        </td>
                      </tr>
                    ) : (
                      getExtracurricularGradesForClass().map((g, idx) => (
                        <tr key={`${g.studentId}_${g.ekskulId}_${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{g.studentNisn}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{g.studentName}</td>
                          <td className="px-4 py-3 font-bold text-amber-700">
                            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200/80">
                              {g.ekskulName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-extrabold text-slate-900 text-sm">
                            {g.score}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                              g.predicate === 'A' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              g.predicate === 'B' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              g.predicate === 'C' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {g.predicate}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {g.attitude}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                            {g.notes}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400 font-mono text-[10px]">
                            {g.updatedAt}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESAN TAB */}
        {activeTab === 'pesan' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Pesan Masuk Dari Wali Murid (Orang Tua)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Daftar pesan komunikasi dua arah dari Orang Tua siswa kelas bimbingan Anda. Berikan balasan langsung untuk menjalin koordinasi yang sinergis.
            </p>

            <div className="space-y-4">
              {parentMessages.filter(m => classStudentIds.includes(m.studentId)).length === 0 ? (
                <div className="p-8 text-center text-slate-400">Belum ada pesan masuk dari wali murid kelas ini.</div>
              ) : (
                parentMessages.filter(m => classStudentIds.includes(m.studentId)).map((msg) => {
                  const sSiswa = students.find((s) => s.id === msg.studentId);
                  return (
                    <div key={msg.id} className="p-4 border rounded-xl space-y-3 bg-slate-50/50">
                      <div className="flex justify-between items-start border-b pb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{msg.senderName}</p>
                          <p className="text-xs text-slate-400">Orang tua dari: {sSiswa?.name}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{msg.date}</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-700">
                        "{msg.message}"
                      </div>

                      {/* Replies */}
                      {msg.replies && msg.replies.map((rep, idx) => (
                        <div key={idx} className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/60 ml-6 text-xs text-slate-700">
                          <div className="flex justify-between font-bold text-blue-800 mb-1">
                            <span>{rep.senderName} ({rep.role})</span>
                            <span>{rep.date}</span>
                          </div>
                          <p>"{rep.message}"</p>
                        </div>
                      ))}

                      {/* Reply Input Form */}
                      <div className="flex gap-2 ml-6">
                        <input
                          type="text"
                          placeholder="Ketik tanggapan Anda..."
                          value={replyText[msg.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReplyText((prev) => ({ ...prev, [msg.id]: val }));
                          }}
                          className="flex-1 px-3 py-1.5 text-xs border bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleSendReply(msg.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Balas
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PRESTASI SISWA KELAS TAB */}
        {activeTab === 'prestasi' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Kelas {managedClass?.name || '-'}</p>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-300" />
                  <span>Raihan Prestasi Siswa Kelas</span>
                </h2>
                <p className="text-blue-100 text-xs">Daftar rekapitulasi prestasi Akademik &amp; Non-Akademik siswa binaan Anda.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const headers = ['No', 'NISN', 'Nama Siswa', 'Judul Prestasi', 'Kategori', 'Tingkat', 'Peringkat', 'Tanggal', 'Dicatat Oleh'];
                    const rows = classAchievements.map((a, i) => [
                      i + 1,
                      students.find(s => s.id === a.studentId)?.nisn || '-',
                      a.studentName,
                      a.title,
                      a.category,
                      a.level,
                      a.rank || '-',
                      a.date,
                      a.recordedBy
                    ]);
                    downloadExcel(`Prestasi_Kelas_${managedClass?.name || 'Wali'}.xlsx`, headers, rows, 'Prestasi Kelas');
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Excel</span>
                </button>
                <button
                  onClick={() => {
                    const headers = ['No', 'NISN', 'Nama Siswa', 'Judul Prestasi', 'Kategori', 'Tingkat', 'Peringkat', 'Tanggal', 'Dicatat Oleh'];
                    const rows = classAchievements.map((a, i) => [
                      i + 1,
                      students.find(s => s.id === a.studentId)?.nisn || '-',
                      a.studentName,
                      a.title,
                      a.category,
                      a.level,
                      a.rank || '-',
                      a.date,
                      a.recordedBy
                    ]);
                    printTablePDF(`Daftar Raihan Prestasi Siswa Kelas ${managedClass?.name || ''}`, headers, rows);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3">Siswa</th>
                      <th className="px-4 py-3">Raihan &amp; Kejuaraan</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Tingkat</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Dicatat Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {classAchievements.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{a.studentName}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{a.title}</div>
                          {a.rank && <div className="text-[10px] text-amber-600 font-bold">{a.rank}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.category === 'Akademik' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {a.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{a.level}</td>
                        <td className="px-4 py-3 text-slate-500">{a.date}</td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">{a.recordedBy}</td>
                      </tr>
                    ))}
                    {classAchievements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          Belum ada raihan prestasi yang dicatatkan untuk siswa di kelas ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
