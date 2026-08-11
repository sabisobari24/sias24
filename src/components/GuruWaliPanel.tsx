import React, { useState } from 'react';
import { Student, Attendance, SchoolClass, ViolationType, StudentViolation, Teacher, CounselorNote, ParentMessage, BimbinganJournal, BimbinganSchedule, StudentAchievement } from '../types';
import { HeartHandshake, Search, FileText, CheckCircle, Save, Send, MessageSquare, AlertTriangle, ShieldCheck, Download, FileSpreadsheet, Star, Award, GraduationCap, Users, Calendar, Activity, Clock, Trash } from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF } from '../utils/printHelper';

interface GuruWaliPanelProps {
  teacher: Teacher;
  students: Student[];
  classes: SchoolClass[];
  attendance: Attendance[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  counselorNotes: CounselorNote[];
  parentMessages: ParentMessage[];
  studentAchievements?: StudentAchievement[];
  onAddCounselorNote: (note: Omit<CounselorNote, 'id'>) => void;
  onReplyToParent: (messageId: string, replyMsg: string) => void;
  onUpdateStudent: (s: Student) => void;

  // BK integration for hybrid role
  bimbinganJournals: BimbinganJournal[];
  bimbinganSchedules: BimbinganSchedule[];
  onAddBimbinganJournal: (journal: Omit<BimbinganJournal, 'id'>) => void;
  onDeleteBimbinganJournal: (id: string) => void;
  onAddBimbinganSchedule: (schedule: Omit<BimbinganSchedule, 'id'>) => void;
  onDeleteBimbinganSchedule: (id: string) => void;
  headmasterName?: string;

  activeTabOverride?: 'beranda' | 'bimbingan' | 'bimbingan-bk' | 'bakat-minat' | 'pesan' | null;
  onTabChange?: (tab: 'beranda' | 'bimbingan' | 'bimbingan-bk' | 'bakat-minat' | 'pesan') => void;
}

export default function GuruWaliPanel({
  teacher,
  students,
  classes,
  attendance,
  violationTypes,
  violations,
  counselorNotes,
  parentMessages,
  studentAchievements = [],
  onAddCounselorNote,
  onReplyToParent,
  onUpdateStudent,
  bimbinganJournals,
  bimbinganSchedules,
  onAddBimbinganJournal,
  onDeleteBimbinganJournal,
  onAddBimbinganSchedule,
  onDeleteBimbinganSchedule,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  activeTabOverride,
  onTabChange,
}: GuruWaliPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'beranda' | 'bimbingan' | 'bimbingan-bk' | 'bakat-minat' | 'pesan'>('beranda');
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'beranda' | 'bimbingan' | 'bimbingan-bk' | 'bakat-minat' | 'pesan') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [searchQuery, setSearchQuery] = useState('');

  // Filter students managed by this Guru Wali (binaaan dari kelas 7 sampai lulus)
  const myStudents = students.filter(s => s.guruWaliTeacherId === teacher.id);
  const filteredStudents = myStudents.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nisn.includes(searchQuery)
  );

  // Form states for Counselor note (Bimbingan Akademik & Pribadi)
  const [targetStudentId, setTargetStudentId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [followUpContent, setFollowUpContent] = useState('');
  const [counselingStatus, setCounselingStatus] = useState<'Perlu Perhatian' | 'Selesai' | 'Dalam Pemantauan'>('Dalam Pemantauan');

  // Form states for Bakat & Minat
  const [bakatStudentId, setBakatStudentId] = useState('');
  const [bakatValue, setBakatValue] = useState('');
  const [prestasiValue, setPrestasiValue] = useState('');

  // Reply state
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Hybrid BK Jurnal States
  const [journalStudentId, setJournalStudentId] = useState('');
  const [journalTopic, setJournalTopic] = useState('');
  const [journalType, setJournalType] = useState<'Karakter & Akhlak' | 'Akademik' | 'Bakat dan Minat'>('Akademik');
  const [journalCategory, setJournalCategory] = useState<'Individu' | 'Kelompok'>('Individu');
  const [journalNotes, setJournalNotes] = useState('');

  // Hybrid BK Schedule States
  const [scheduleTargetType, setScheduleTargetType] = useState<'Kelas' | 'Individu' | 'Orang Tua'>('Individu');
  const [scheduleTargetId, setScheduleTargetId] = useState('');
  const [scheduleTopic, setScheduleTopic] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  const handleSubmitJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalStudentId || !journalTopic.trim() || !journalNotes.trim()) {
      alert('Mohon isi semua field wajib untuk jurnal bimbingan.');
      return;
    }
    const studentObj = students.find(s => s.id === journalStudentId);
    onAddBimbinganJournal({
      studentIds: [journalStudentId],
      classId: studentObj?.classId || '',
      topic: journalType, // 'Karakter & Akhlak' | 'Akademik' | 'Bakat dan Minat'
      type: journalCategory, // 'Individu' | 'Kelompok'
      date: new Date().toISOString().split('T')[0],
      notes: `[${journalTopic.trim()}] ${journalNotes.trim()}`,
      recordedBy: `${teacher.name} (Guru Wali)`,
    });
    setJournalStudentId('');
    setJournalTopic('');
    setJournalNotes('');
    setSuccessMsg('Jurnal Bimbingan Guru Wali berhasil dicatat!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSubmitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTargetId || !scheduleTopic.trim() || !scheduleDate || !scheduleTime) {
      alert('Mohon lengkapi semua field wajib untuk jadwal bimbingan.');
      return;
    }
    onAddBimbinganSchedule({
      targetType: scheduleTargetType,
      targetId: scheduleTargetId,
      topic: scheduleTopic.trim(),
      date: scheduleDate,
      time: scheduleTime,
      notes: scheduleNotes.trim(),
      recordedBy: `${teacher.name} (Guru Wali)`,
    });
    setScheduleTopic('');
    setScheduleDate('');
    setScheduleTime('');
    setScheduleNotes('');
    setSuccessMsg('Jadwal bimbingan baru berhasil dipublikasikan!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSubmitCounselorNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !noteContent.trim()) {
      alert('Pilih siswa bimbingan dan berikan catatan bimbingan.');
      return;
    }

    onAddCounselorNote({
      studentId: targetStudentId,
      date: new Date().toISOString().split('T')[0],
      notes: noteContent.trim(),
      followUp: followUpContent.trim(),
      status: counselingStatus,
      recordedBy: `${teacher.name} (Guru Wali)`,
      parentAcknowledge: false,
    });

    setNoteContent('');
    setFollowUpContent('');
    setCounselingStatus('Dalam Pemantauan');
    setSuccessMsg('Catatan bimbingan akademik berhasil diterbitkan!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleUpdateBakatMinat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bakatStudentId) {
      alert('Pilih siswa bimbingan terlebih dahulu.');
      return;
    }

    const std = students.find(s => s.id === bakatStudentId);
    if (std) {
      onUpdateStudent({
        ...std,
        bakatMinat: bakatValue.trim(),
        prestasi: prestasiValue.trim()
      });
      setSuccessMsg('Data Pembinaan Bakat, Minat, dan Prestasi siswa berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleSendReply = (msgId: string) => {
    const text = replyText[msgId];
    if (!text || !text.trim()) return;

    onReplyToParent(msgId, text.trim());
    setReplyText((prev) => ({ ...prev, [msgId]: '' }));
    setSuccessMsg('Balasan pesan bimbingan wali murid berhasil dikirim!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Export Handlers
  const handleExportBimbingan = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Nama Siswa", "Kelas", "Catatan Bimbingan", "Rencana Tindak Lanjut", "Status", "Pencatat"];
    const rows = counselorNotes
      .filter(n => myStudents.some(s => s.id === n.studentId))
      .map(n => {
        const s = students.find(std => std.id === n.studentId);
        return [
          n.date,
          s?.name || 'Siswa Terhapus',
          classes.find(c => c.id === s?.classId)?.name || '-',
          n.notes,
          n.followUp || '-',
          n.status,
          n.recordedBy
        ];
      });

    if (format === 'excel') {
      downloadExcel('rekap_bimbingan_guru_wali.xlsx', headers, rows, 'Bimbingan Guru Wali');
      setSuccessMsg('Laporan Rekapitulasi Bimbingan berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Laporan Rekapitulasi Layanan Bimbingan & Pembinaan (Guru Wali)', headers, rows, headmasterName);
      setSuccessMsg('Dokumen Laporan Bimbingan berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportBakatMinat = (format: 'excel' | 'pdf') => {
    const headers = ["NISN", "Nama Siswa", "Kelas", "Bakat & Minat", "Prestasi Akademik / Non-Akademik"];
    const rows = myStudents.map(s => [
      s.nisn,
      s.name,
      classes.find(c => c.id === s.classId)?.name || '-',
      s.bakatMinat || 'Belum diisi',
      s.prestasi || 'Belum diisi'
    ]);

    if (format === 'excel') {
      downloadExcel('rekap_bakat_minat_prestasi_guru_wali.xlsx', headers, rows, 'Bakat & Minat');
      setSuccessMsg('Rekapitulasi Bakat & Minat berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Rekapitulasi Pembinaan Bakat, Minat, dan Prestasi Siswa', headers, rows, headmasterName);
      setSuccessMsg('Dokumen Rekapitulasi Bakat & Minat berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportPesanGuruWali = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Nama Orang Tua", "Siswa Bimbingan", "Pesan dari Orang Tua", "Balasan Terakhir", "Status"];
    const myMsgList = parentMessages.filter(m => myStudents.some(s => s.id === m.studentId));
    const rows = myMsgList.map(m => {
      const s = students.find(std => std.id === m.studentId);
      const lastReply = m.replies && m.replies.length > 0 ? m.replies[m.replies.length - 1].message : 'Belum Dibalas';
      return [
        m.date,
        m.senderName || 'Orang Tua',
        s?.name || '-',
        m.message,
        lastReply,
        m.replies && m.replies.length > 0 ? 'Selesai Dibalas' : 'Belum Dibalas'
      ];
    });

    if (format === 'excel') {
      downloadExcel('komunikasi_orang_tua_guru_wali.xlsx', headers, rows, 'Pesan Orang Tua');
      setSuccessMsg('Pesan Komunikasi Orang Tua berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Rekapitulasi Komunikasi Orang Tua & Guru Wali', headers, rows, headmasterName);
      setSuccessMsg('Pesan Komunikasi berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const getGuruWaliDownloadConfig = () => {
    switch (activeTab) {
      case 'beranda':
      case 'bimbingan':
      case 'bimbingan-bk':
        return [
          { label: 'Bimbingan (Excel)', onClick: () => handleExportBimbingan('excel') },
          { label: 'Bimbingan (PDF)', onClick: () => handleExportBimbingan('pdf') },
        ];
      case 'bakat-minat':
        return [
          { label: 'Bakat & Minat (Excel)', onClick: () => handleExportBakatMinat('excel') },
          { label: 'Bakat & Minat (PDF)', onClick: () => handleExportBakatMinat('pdf') },
        ];
      case 'pesan':
        return [
          { label: 'Pesan Orang Tua (Excel)', onClick: () => handleExportPesanGuruWali('excel') },
          { label: 'Pesan Orang Tua (PDF)', onClick: () => handleExportPesanGuruWali('pdf') },
        ];
      default:
        return [
          { label: 'Bimbingan (Excel)', onClick: () => handleExportBimbingan('excel') },
          { label: 'Bimbingan (PDF)', onClick: () => handleExportBimbingan('pdf') },
        ];
    }
  };

  return (
    <div className="space-y-6">
      {/* Guru Wali Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1">
            <span className="text-indigo-100 text-xs font-semibold uppercase tracking-wider">Masa Bimbingan: Kelas 7 s/d Kelulusan</span>
            <h1 className="text-2xl font-bold">{teacher.name}</h1>
            <p className="text-indigo-100 text-sm">NIP: {teacher.nip} | Peran: Guru Wali Akademik & Bakat Minat</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {getGuruWaliDownloadConfig().map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={btn.onClick}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-all text-xs font-bold flex items-center gap-2 border border-slate-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                {btn.label.includes('Excel') ? (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                ) : (
                  <FileText className="w-4 h-4 text-indigo-600" />
                )}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BERANDA TAB */}
      {activeTab === 'beranda' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border shadow-xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Binaan (7 - Lulus)</span>
              <p className="text-2xl font-bold text-slate-800">{myStudents.length} Siswa</p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-xs space-y-1">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">Bimbingan Terbit</span>
              <p className="text-2xl font-bold text-indigo-600">
                {counselorNotes.filter(n => myStudents.some(s => s.id === n.studentId)).length} Sesi
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-xs space-y-1">
              <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider block">Bakat &amp; Minat Terisi</span>
              <p className="text-2xl font-bold text-purple-600">
                {myStudents.filter(s => s.bakatMinat && s.bakatMinat.trim().length > 0).length} Siswa
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-xs space-y-1">
              <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">Pelanggaran Binaan</span>
              <p className="text-2xl font-bold text-rose-600">
                {violations.filter(v => myStudents.some(s => s.id === v.studentId)).length} Kejadian
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Siswa List */}
            <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Daftar Siswa Binaan Akademik</h3>
                  <p className="text-[11px] text-slate-400">Menampilkan seluruh siswa bimbingan yang didampingi dari kelas 7 sampai lulus.</p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="border rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
                    <tr>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">NISN</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3">Bakat &amp; Minat</th>
                      <th className="px-4 py-3">Poin Pelanggaran</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">Siswa tidak ditemukan atau belum ditautkan.</td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const totalPoints = violations
                          .filter(v => v.studentId === s.id)
                          .reduce((sum, v) => sum + v.points, 0);
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                              <img src={s.avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0" />
                              <span>{s.name}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono">{s.nisn}</td>
                            <td className="px-4 py-3 font-semibold text-slate-600">
                              {classes.find(c => c.id === s.classId)?.name || s.classId}
                            </td>
                            <td className="px-4 py-3 truncate max-w-[150px] text-indigo-600 font-medium">
                              {s.bakatMinat || <span className="text-slate-300 font-normal italic">Belum diisi</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                totalPoints > 50 ? 'bg-rose-100 text-rose-800' :
                                totalPoints > 15 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {totalPoints} Poin
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setTargetStudentId(s.id);
                                    setActiveTab('bimbingan');
                                  }}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                                >
                                  Beri Bimbingan
                                </button>
                                <button
                                  onClick={() => {
                                    setBakatStudentId(s.id);
                                    setBakatValue(s.bakatMinat || '');
                                    setPrestasiValue(s.prestasi || '');
                                    setActiveTab('bakat-minat');
                                  }}
                                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                                >
                                  Edit Bakat
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pedoman Peran */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <HeartHandshake className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm">Pedoman Kerja Guru Wali</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Guru Wali merupakan perpaduan peran strategis antara <strong>Guru BK</strong> dan <strong>Wali Kelas</strong>. Tanggung jawab utama meliputi pembinaan akademik berkelanjutan, bimbingan pribadi, serta pemetaan dan penyaluran bakat, minat, dan prestasi siswa bimbingan dari kelas 7 hingga lulus.
              </p>
              <div className="space-y-3 pt-2 text-[11px]">
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[10px]">1</div>
                  <p className="text-slate-600"><strong className="text-slate-800">Pendampingan Karakter:</strong> Membimbing akhlak mulia dan kedisiplinan berkolaborasi dengan guru piket dan guru BK.</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-[10px]">2</div>
                  <p className="text-slate-600"><strong className="text-slate-800">Pembinaan Bakat:</strong> Mendokumentasikan dan memotivasi prestasi serta kegemaran siswa (seni, olahraga, sains).</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold text-[10px]">3</div>
                  <p className="text-slate-600"><strong className="text-slate-800">Komunikasi Efektif:</strong> Berfungsi sebagai jembatan langsung antara pihak sekolah dan orang tua murid.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BIMBINGAN TAB */}
      {activeTab === 'bimbingan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Bimbingan Note Form */}
          <div className="bg-white rounded-xl p-5 border shadow-sm space-y-4 h-fit">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Input Layanan Bimbingan</span>
            </h4>

            <form onSubmit={handleSubmitCounselorNote} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold mb-1">Target Siswa Bimbingan <span className="text-rose-500">*</span></label>
                <select
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer text-slate-700 font-medium"
                >
                  <option value="">-- Pilih Siswa Binaan --</option>
                  {myStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({classes.find(c => c.id === s.classId)?.name || s.classId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold mb-1">Catatan Pembinaan &amp; Saran Akademik <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  placeholder="Ketik rincian hasil bimbingan, permasalahan akademik/non-akademik, atau saran pengembangan di sini..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold mb-1">Rencana Tindak Lanjut</label>
                <textarea
                  rows={2}
                  placeholder="Ketik kesepakatan tindak lanjut bimbingan..."
                  value={followUpContent}
                  onChange={(e) => setFollowUpContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold mb-1">Status Pembinaan</label>
                <select
                  value={counselingStatus}
                  onChange={(e) => setCounselingStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer text-slate-700"
                >
                  <option value="Dalam Pemantauan">Dalam Pemantauan</option>
                  <option value="Perlu Perhatian">Perlu Perhatian Khusus</option>
                  <option value="Selesai">Bimbingan Selesai / Tuntas</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Terbitkan Catatan Bimbingan</span>
              </button>
            </form>
          </div>

          {/* Bimbingan List History */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span>Riwayat Sesi Bimbingan Siswa Binaan</span>
              </h4>
            </div>

            <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
              {counselorNotes.filter(n => myStudents.some(s => s.id === n.studentId)).length === 0 ? (
                <div className="py-24 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium">Belum ada catatan bimbingan terbit.</p>
                  <p className="text-xs text-slate-400 mt-1">Gunakan form di samping untuk mulai mempublikasikan catatan bimbingan akademik pertama.</p>
                </div>
              ) : (
                counselorNotes
                  .filter(n => myStudents.some(s => s.id === n.studentId))
                  .slice()
                  .reverse()
                  .map((note) => {
                    const student = students.find(s => s.id === note.studentId);
                    return (
                      <div key={note.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3 text-xs">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-center gap-2.5">
                            <img src={student?.avatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                            <div>
                              <p className="font-bold text-slate-800 text-[13px]">{student?.name}</p>
                              <p className="text-[10px] text-slate-400">Tanggal Sesi: {note.date} | Oleh: {note.recordedBy}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                            note.status === 'Perlu Perhatian' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            note.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                            {note.status}
                          </span>
                        </div>

                        <div className="space-y-2 border-t pt-2.5 text-slate-600">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Catatan Pembinaan / Bimbingan:</p>
                            <p className="text-slate-700 leading-relaxed mt-0.5">{note.notes}</p>
                          </div>
                          {note.followUp && (
                            <div className="bg-white border p-2 rounded-lg mt-1.5">
                              <p className="text-[9px] font-bold text-indigo-500 uppercase">Kesepakatan Rencana Tindak Lanjut:</p>
                              <p className="text-slate-600 mt-0.5 leading-relaxed font-medium">{note.followUp}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                          <ShieldCheck className={`w-4 h-4 ${note.parentAcknowledge ? 'text-emerald-500' : 'text-slate-300'}`} />
                          <span>Status Wali Murid: {note.parentAcknowledge ? 'Sudah membaca & menandatangani secara digital' : 'Belum membaca'}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* BIMBINGAN BK (HYBRID ROLE) TAB */}
      {activeTab === 'bimbingan-bk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jurnal Bimbingan Guru Wali */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-600" />
                Input Jurnal Bimbingan Guru Wali (Individu / Kelompok)
              </h3>
              <form onSubmit={handleSubmitJournal} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Pilih Siswa Binaan <span className="text-rose-500">*</span></label>
                    <select
                      value={journalStudentId}
                      onChange={(e) => setJournalStudentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                    >
                      <option value="">-- Pilih Siswa --</option>
                      {myStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({classes.find(c => c.id === s.classId)?.name || s.classId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Kategori Layanan <span className="text-rose-500">*</span></label>
                    <select
                      value={journalCategory}
                      onChange={(e) => setJournalCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                    >
                      <option value="Individu">Individu</option>
                      <option value="Kelompok">Kelompok / Berkelompok</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Topik Utama <span className="text-rose-500">*</span></label>
                    <select
                      value={journalType}
                      onChange={(e) => setJournalType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                    >
                      <option value="Karakter & Akhlak">Karakter &amp; Akhlak</option>
                      <option value="Akademik">Akademik</option>
                      <option value="Bakat dan Minat">Bakat dan Minat</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Judul Bahasan / Kasus <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pemetaan Ekstrakurikuler Unggulan"
                      value={journalTopic}
                      onChange={(e) => setJournalTopic(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold mb-1">Catatan &amp; Hasil Konseling <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ketik rincian hasil bimbingan karir, bakat, minat, bimbingan moral atau bimbingan sosial..."
                    value={journalNotes}
                    onChange={(e) => setJournalNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Jurnal Bimbingan</span>
                </button>
              </form>
            </div>

            {/* Jadwal Bimbingan Guru Wali */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Buat Jadwal Bimbingan Guru Wali &amp; Orang Tua
              </h3>
              <form onSubmit={handleSubmitSchedule} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Target Peserta <span className="text-rose-500">*</span></label>
                    <select
                      value={scheduleTargetType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setScheduleTargetType(val);
                        setScheduleTargetId('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                    >
                      <option value="Kelas">Kelas</option>
                      <option value="Individu">Individu Siswa</option>
                      <option value="Orang Tua">Orang Tua Murid</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Pilih Target <span className="text-rose-500">*</span></label>
                    <select
                      value={scheduleTargetId}
                      onChange={(e) => setScheduleTargetId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                    >
                      <option value="">-- Pilih --</option>
                      {scheduleTargetType === 'Kelas' ? (
                        <>
                          <option value="all">Semua Kelas Binaan</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </>
                      ) : (
                        myStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({classes.find(c => c.id === s.classId)?.name})</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold mb-1">Topik Bimbingan <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Konsultasi Pemilihan Jurusan SMA/SMK atau Pembinaan Kedisiplinan"
                    value={scheduleTopic}
                    onChange={(e) => setScheduleTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Tanggal Pertemuan <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-semibold mb-1">Waktu / Jam Pertemuan <span className="text-rose-500">*</span></label>
                    <input
                      type="time"
                      required
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-500 font-semibold mb-1">Catatan Lokasi / Persyaratan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Di ruang Guru Wali, harap membawa rapor terakhir"
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Publikasikan Jadwal Pertemuan</span>
                </button>
              </form>
            </div>
          </div>

          {/* Tabular Lists for Journals and Schedules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jurnal Bimbingan List */}
            <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <Activity className="w-5 h-5 text-indigo-600" />
                <span>Riwayat Jurnal Bimbingan Guru Wali Siswa Binaan</span>
              </h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {(() => {
                  const filteredJournals = bimbinganJournals ? bimbinganJournals.filter(j => j.studentIds && j.studentIds.some(sid => myStudents.some(s => s.id === sid))) : [];
                  if (filteredJournals.length === 0) {
                    return <p className="text-slate-400 text-xs italic text-center py-12">Belum ada jurnal bimbingan tercatat.</p>;
                  }
                  return filteredJournals.slice().reverse().map((journal) => {
                    const studentObj = students.find(s => journal.studentIds && journal.studentIds.includes(s.id));
                    return (
                      <div key={journal.id} className="p-3.5 border rounded-xl bg-slate-50/60 text-xs space-y-2 relative">
                        <button
                          onClick={() => onDeleteBimbinganJournal(journal.id)}
                          className="absolute top-3.5 right-3.5 text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            journal.topic === 'Karakter & Akhlak' ? 'bg-amber-100 text-amber-800' :
                            journal.topic === 'Bakat dan Minat' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {journal.topic}
                          </span>
                          <span className="text-slate-400 font-semibold text-[10px]">&bull; {journal.type}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium">"{journal.notes}"</p>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 border-t pt-2 mt-2">
                          <span>Siswa: <strong className="text-slate-600">{studentObj?.name || 'Multi-siswa / Kelompok'}</strong></span>
                          <span>Tanggal: {journal.date}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Jadwal Bimbingan List */}
            <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>Daftar Jadwal Layanan / Pertemuan Bimbingan Guru Wali</span>
              </h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {(() => {
                  const filteredSchedules = bimbinganSchedules ? bimbinganSchedules.filter(s => {
                    if (s.targetType === 'Kelas') {
                      return s.targetId === 'all' || myStudents.some(student => student.classId === s.targetId);
                    }
                    return myStudents.some(student => student.id === s.targetId);
                  }) : [];
                  if (filteredSchedules.length === 0) {
                    return <p className="text-slate-400 text-xs italic text-center py-12">Belum ada jadwal bimbingan dibuat.</p>;
                  }
                  return filteredSchedules.slice().reverse().map((sched) => {
                    const targetObj = sched.targetType === 'Kelas' ? classes.find(c => c.id === sched.targetId) : students.find(s => s.id === sched.targetId);
                    return (
                      <div key={sched.id} className="p-3.5 border rounded-xl bg-slate-50/60 text-xs space-y-2 relative">
                        <button
                          onClick={() => onDeleteBimbinganSchedule(sched.id)}
                          className="absolute top-3.5 right-3.5 text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase">{sched.targetType}</span>
                          <span className="text-slate-500 font-mono flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />
                            {sched.date} &bull; {sched.time}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-800">{sched.topic}</h5>
                        {sched.notes && <p className="text-slate-500 italic">"Catatan/Lokasi: {sched.notes}"</p>}
                        <p className="text-[10px] text-slate-400 border-t pt-1.5 mt-1.5">
                          Target: <strong className="text-slate-600">{sched.targetId === 'all' ? 'Semua Kelas' : targetObj?.name || 'Siswa'}</strong>
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BAKAT & MINAT TAB */}
      {activeTab === 'bakat-minat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Edit Bakat Form */}
          <div className="bg-white rounded-xl p-5 border shadow-sm space-y-4 h-fit">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
              <Star className="w-5 h-5 text-purple-600" />
              <span>Input Minat, Bakat, &amp; Prestasi</span>
            </h4>

            <form onSubmit={handleUpdateBakatMinat} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold mb-1">Siswa Bimbingan <span className="text-rose-500">*</span></label>
                <select
                  value={bakatStudentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBakatStudentId(val);
                    const std = students.find(s => s.id === val);
                    if (std) {
                      setBakatValue(std.bakatMinat || '');
                      setPrestasiValue(std.prestasi || '');
                    } else {
                      setBakatValue('');
                      setPrestasiValue('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer text-slate-700 font-medium"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {myStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({classes.find(c => c.id === s.classId)?.name || s.classId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold mb-1">Bakat &amp; Minat (Potensi / Ekstrakurikuler) <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Sangat berbakat di bidang Seni Rupa & Lukis, aktif di klub Basket Sekolah, tertarik pada pengembangan robotika."
                  value={bakatValue}
                  onChange={(e) => setBakatValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 outline-none text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-semibold mb-1">Prestasi Akademik / Non-Akademik</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Juara 2 Lomba Menggambar Kaligrafi Tingkat Kota Jakarta Timur (2025)."
                  value={prestasiValue}
                  onChange={(e) => setPrestasiValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 outline-none text-slate-700"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perkembangan Bakat</span>
              </button>
            </form>
          </div>

          {/* Bakat History Grid */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span>Pemetaan Bakat &amp; Minat Siswa Binaan</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {myStudents.map((s) => (
                <div key={s.id} className="p-4 rounded-xl border border-purple-100 bg-purple-50/20 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 border-b border-purple-100 pb-2">
                    <img src={s.avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400">Kelas: {classes.find(c => c.id === s.classId)?.name || s.classId}</p>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-purple-700 block text-[10px] uppercase">Minat &amp; Bakat:</span>
                    <p className="text-slate-600 leading-relaxed mt-0.5 font-medium">
                      {s.bakatMinat || <span className="text-slate-300 italic font-normal">Belum diinputkan</span>}
                    </p>
                  </div>
                  {s.prestasi && (
                    <div className="bg-white border border-purple-100 p-2 rounded-lg">
                      <span className="font-bold text-amber-600 block text-[10px] uppercase">Pencapaian / Prestasi:</span>
                      <p className="text-slate-600 font-medium leading-relaxed mt-0.5">{s.prestasi}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Synchronized Student Achievements Table */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Daftar Raihan Prestasi Siswa Bimbingan (Akademik &amp; Non-Akademik)</span>
                  </h5>
                  <p className="text-[11px] text-slate-500">Hasil rekapitulasi terintegrasi dari Admin &amp; Pelatih Ekskul.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const myStudentIds = myStudents.map(s => s.id);
                      const myAchs = studentAchievements.filter(a => myStudentIds.includes(a.studentId));
                      const headers = ['No', 'Nama Siswa', 'Kelas', 'Judul Prestasi', 'Kategori', 'Tingkat', 'Peringkat', 'Tanggal', 'Dicatat Oleh'];
                      const rows = myAchs.map((a, i) => [
                        i + 1,
                        a.studentName,
                        a.classId,
                        a.title,
                        a.category,
                        a.level,
                        a.rank || '-',
                        a.date,
                        a.recordedBy
                      ]);
                      downloadExcel(`Prestasi_Siswa_Bimbingan_GuruWali.xlsx`, headers, rows, 'Prestasi Bimbingan');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      const myStudentIds = myStudents.map(s => s.id);
                      const myAchs = studentAchievements.filter(a => myStudentIds.includes(a.studentId));
                      const headers = ['No', 'Nama Siswa', 'Kelas', 'Judul Prestasi', 'Kategori', 'Tingkat', 'Peringkat', 'Tanggal', 'Dicatat Oleh'];
                      const rows = myAchs.map((a, i) => [
                        i + 1,
                        a.studentName,
                        a.classId,
                        a.title,
                        a.category,
                        a.level,
                        a.rank || '-',
                        a.date,
                        a.recordedBy
                      ]);
                      printTablePDF(`Daftar Raihan Prestasi Siswa Bimbingan - Guru Wali`, headers, rows);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Siswa</th>
                      <th className="px-3 py-2">Prestasi</th>
                      <th className="px-3 py-2">Kategori</th>
                      <th className="px-3 py-2">Tingkat</th>
                      <th className="px-3 py-2">Peringkat</th>
                      <th className="px-3 py-2">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {studentAchievements
                      .filter(a => myStudents.some(s => s.id === a.studentId))
                      .map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-900">{a.studentName}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{a.title}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.category === 'Akademik' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {a.category}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{a.level}</td>
                          <td className="px-3 py-2 text-amber-600 font-bold">{a.rank || '-'}</td>
                          <td className="px-3 py-2 text-slate-500">{a.date}</td>
                        </tr>
                      ))}
                    {studentAchievements.filter(a => myStudents.some(s => s.id === a.studentId)).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          Belum ada data prestasi untuk siswa bimbingan Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESAN TAB */}
      {activeTab === 'pesan' && (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Konsultasi Interaktif Wali Murid</h3>
            <p className="text-xs text-slate-500">Balas pertanyaan atau pesan konsultasi langsung yang dikirimkan oleh orang tua siswa binaan Anda.</p>
          </div>

          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {parentMessages.filter(m => myStudents.some(s => s.id === m.studentId)).length === 0 ? (
              <div className="py-24 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">Belum ada pesan masuk dari wali murid.</p>
              </div>
            ) : (
              parentMessages
                .filter(m => myStudents.some(s => s.id === m.studentId))
                .slice()
                .reverse()
                .map((msg) => {
                  const student = students.find(s => s.id === msg.studentId);
                  return (
                    <div key={msg.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 text-xs space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">W</span>
                          <div>
                            <p className="font-bold text-slate-800">{msg.senderName} <span className="text-[10px] text-slate-400 font-normal">(Wali dari {student?.name})</span></p>
                            <p className="text-[9px] text-slate-400">Dikirim: {msg.date}</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-700 bg-white border p-3 rounded-xl font-medium leading-relaxed shadow-3xs">{msg.message}</p>

                      {/* Replies List */}
                      {msg.replies && msg.replies.length > 0 && (
                        <div className="space-y-2 border-l-2 border-indigo-200 pl-3 pt-1">
                          {msg.replies.map((reply, rIdx) => (
                            <div key={rIdx} className="bg-slate-100/70 p-2.5 rounded-lg space-y-0.5">
                              <p className="font-bold text-slate-700 text-[10px]">{reply.senderName} <span className="text-[9px] text-indigo-600 font-bold">({reply.role})</span></p>
                              <p className="text-slate-600 leading-relaxed font-medium">{reply.message}</p>
                              <p className="text-[8px] text-slate-400 text-right">{reply.date}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Form */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Tulis balasan bimbingan untuk wali murid..."
                          value={replyText[msg.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [msg.id]: e.target.value })}
                          className="flex-1 px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendReply(msg.id)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Balas</span>
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
