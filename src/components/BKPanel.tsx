import React, { useState } from 'react';
import { Student, Attendance, SchoolClass, ViolationType, StudentViolation, Teacher, CounselorNote, ParentMessage, BimbinganJournal, BimbinganSchedule, StudentAchievement } from '../types';
import { HeartHandshake, Search, FileText, CheckCircle, Save, Send, MessageSquare, AlertTriangle, ShieldCheck, Download, FileSpreadsheet, Calendar, Trash2, Clock, Users, UserCheck, Award } from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF } from '../utils/printHelper';

interface BKPanelProps {
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
  activeTabOverride?: 'beranda' | 'bimbingan' | 'jurnal' | 'jadwal' | 'pesan' | 'prestasi' | null;
  onTabChange?: (tab: 'beranda' | 'bimbingan' | 'jurnal' | 'jadwal' | 'pesan' | 'prestasi') => void;
  bimbinganJournals: BimbinganJournal[];
  bimbinganSchedules: BimbinganSchedule[];
  onAddBimbinganJournal: (journal: Omit<BimbinganJournal, 'id'>) => void;
  onDeleteBimbinganJournal: (id: string) => void;
  onAddBimbinganSchedule: (sched: Omit<BimbinganSchedule, 'id'>) => void;
  onDeleteBimbinganSchedule: (id: string) => void;
  headmasterName: string;
}

export default function BKPanel({
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
  activeTabOverride,
  onTabChange,
  bimbinganJournals,
  bimbinganSchedules,
  onAddBimbinganJournal,
  onDeleteBimbinganJournal,
  onAddBimbinganSchedule,
  onDeleteBimbinganSchedule,
  headmasterName,
}: BKPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'beranda' | 'bimbingan' | 'jurnal' | 'jadwal' | 'pesan' | 'prestasi'>('beranda');
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'beranda' | 'bimbingan' | 'jurnal' | 'jadwal' | 'pesan' | 'prestasi') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [searchQuery, setSearchQuery] = useState('');

  // Class Filter for Bimbingan Tab
  const [bimbinganClassFilter, setBimbinganClassFilter] = useState('');

  // Form states for Counselor note
  const [targetStudentId, setTargetStudentId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [followUpContent, setFollowUpContent] = useState('');
  const [counselingStatus, setCounselingStatus] = useState<'Perlu Perhatian' | 'Selesai' | 'Dalam Pemantauan'>('Dalam Pemantauan');

  // Form states for Jurnal Bimbingan
  const [jurnalDate, setJurnalDate] = useState(new Date().toISOString().split('T')[0]);
  const [jurnalType, setJurnalType] = useState<'Individu' | 'Kelompok'>('Individu');
  const [jurnalClassId, setJurnalClassId] = useState('');
  const [jurnalStudentId, setJurnalStudentId] = useState(''); // for Individu
  const [jurnalSelectedStudents, setJurnalSelectedStudents] = useState<string[]>([]); // for Kelompok
  const [jurnalTopic, setJurnalTopic] = useState<'Karakter & Akhlak' | 'Akademik' | 'Bakat dan Minat'>('Karakter & Akhlak');
  const [jurnalNotes, setJurnalNotes] = useState('');

  // Form states for Jadwal Bimbingan
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('08:00'); // starting time
  const [scheduleTimeEnd, setScheduleTimeEnd] = useState('09:00'); // ending time
  const [scheduleTargetType, setScheduleTargetType] = useState<'Kelas' | 'Individu' | 'Orang Tua'>('Kelas');
  const [scheduleClassId, setScheduleClassId] = useState('');
  const [scheduleStudentId, setScheduleStudentId] = useState('');
  const [scheduleTopic, setScheduleTopic] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  // Reply state
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nisn.includes(searchQuery)
  );

  const handleSubmitCounselorNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !noteContent.trim()) {
      alert('Pilih siswa dan berikan catatan bimbingan.');
      return;
    }

    onAddCounselorNote({
      studentId: targetStudentId,
      date: new Date().toISOString().split('T')[0],
      notes: noteContent.trim(),
      followUp: followUpContent.trim(),
      status: counselingStatus,
      recordedBy: teacher.name,
      parentAcknowledge: false,
    });

    setNoteContent('');
    setFollowUpContent('');
    setCounselingStatus('Dalam Pemantauan');
    setSuccessMsg('Catatan bimbingan BK berhasil diterbitkan!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSendReply = (msgId: string) => {
    const text = replyText[msgId];
    if (!text || !text.trim()) return;

    onReplyToParent(msgId, text.trim());
    setReplyText((prev) => ({ ...prev, [msgId]: '' }));
    setSuccessMsg('Balasan pesan konseling wali murid dikirim!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSubmitJurnalBimbingan = (e: React.FormEvent) => {
    e.preventDefault();
    if (jurnalType === 'Individu' && !jurnalStudentId) {
      alert('Silakan pilih siswa terbimbing.');
      return;
    }
    if (jurnalType === 'Kelompok' && (!jurnalClassId || jurnalSelectedStudents.length === 0)) {
      alert('Silakan pilih kelas dan minimal satu siswa terbimbing.');
      return;
    }
    if (!jurnalNotes.trim()) {
      alert('Silakan tuliskan catatan bimbingan.');
      return;
    }

    const studentIds = jurnalType === 'Individu' ? [jurnalStudentId] : jurnalSelectedStudents;
    const resolvedClassId = jurnalType === 'Individu' 
      ? (students.find(s => s.id === jurnalStudentId)?.classId || '')
      : jurnalClassId;

    onAddBimbinganJournal({
      date: jurnalDate,
      type: jurnalType,
      studentIds,
      classId: resolvedClassId,
      topic: jurnalTopic,
      notes: jurnalNotes.trim(),
      recordedBy: teacher.name,
    });

    setJurnalStudentId('');
    setJurnalSelectedStudents([]);
    setJurnalNotes('');
    setSuccessMsg('Jurnal Bimbingan berhasil disimpan!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSubmitJadwalBimbingan = (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduleTargetType === 'Kelas' && !scheduleClassId) {
      alert('Silakan pilih kelas sasaran.');
      return;
    }
    if ((scheduleTargetType === 'Individu' || scheduleTargetType === 'Orang Tua') && !scheduleStudentId) {
      alert('Silakan pilih siswa sasaran.');
      return;
    }
    if (!scheduleTopic.trim()) {
      alert('Silakan isi topik bimbingan.');
      return;
    }

    const targetId = scheduleTargetType === 'Kelas' ? scheduleClassId : scheduleStudentId;
    const timeFormatted = `${scheduleTime} - ${scheduleTimeEnd}`;

    onAddBimbinganSchedule({
      date: scheduleDate,
      time: timeFormatted,
      targetType: scheduleTargetType,
      targetId,
      topic: scheduleTopic.trim(),
      notes: scheduleNotes.trim(),
      recordedBy: teacher.name,
    });

    setScheduleTopic('');
    setScheduleNotes('');
    setSuccessMsg('Jadwal Bimbingan berhasil ditambahkan dan disinkronkan!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Export Handlers
  const handleExportBimbinganBK = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Nama Siswa", "Kelas", "Catatan Bimbingan", "Tindak Lanjut", "Status Pembinaan", "Wali Murid Mengetahui", "Konselor"];
    const rows = counselorNotes.map(n => {
      const s = students.find(std => std.id === n.studentId);
      return [
        n.date,
        s?.name || 'Siswa Terhapus',
        classes.find(c => c.id === s?.classId)?.name || '-',
        n.notes,
        n.followUp || '-',
        n.status,
        n.parentAcknowledge ? 'Sudah Dibaca' : 'Belum Dibaca',
        n.recordedBy
      ];
    });

    if (format === 'excel') {
      downloadExcel('rekap_bimbingan_konseling_bk.xlsx', headers, rows, 'Bimbingan BK');
      setSuccessMsg('Rekapan Catatan Bimbingan BK berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Rekapitulasi Layanan Bimbingan Konseling (BK)', headers, rows, headmasterName);
      setSuccessMsg('Dokumen Bimbingan BK berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportKedisiplinanBK = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Nama Siswa", "Kelas", "Jenis Pelanggaran", "Poin", "Catatan", "Pencatat"];
    const rows = violations.map(v => {
      const s = students.find(std => std.id === v.studentId);
      const type = violationTypes.find(vt => vt.id === v.violationTypeId);
      return [
        v.date,
        s?.name || 'Siswa Terhapus',
        classes.find(c => c.id === s?.classId)?.name || '-',
        type?.name || 'Pelanggaran Khusus',
        v.points,
        v.notes || '',
        v.recordedBy
      ];
    });

    if (format === 'excel') {
      downloadExcel('rekap_laporan_pelanggaran_siswa_bk.xlsx', headers, rows, 'Pelanggaran BK');
      setSuccessMsg('Laporan Poin Kedisiplinan Siswa berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Laporan Catatan Pelanggaran Kedisiplinan Siswa', headers, rows, headmasterName);
      setSuccessMsg('Laporan Kedisiplinan berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportJurnalBK = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Tipe", "Kelas / Siswa", "Kategori Bidang", "Catatan Jurnal Layanan"];
    const rows = bimbinganJournals.map(j => {
      const cls = classes.find(c => c.id === j.classId)?.name || j.classId;
      const stdNames = (j.studentIds || []).map(sid => students.find(s => s.id === sid)?.name || '').filter(Boolean).join(', ');
      const target = j.type === 'Individu' ? `Siswa: ${stdNames} (${cls})` : `Kelas: ${cls}`;
      return [
        j.date,
        j.type,
        target,
        j.topic,
        j.notes
      ];
    });

    if (format === 'excel') {
      downloadExcel('jurnal_harian_layanan_bk.xlsx', headers, rows, 'Jurnal BK');
      setSuccessMsg('Jurnal Layanan BK berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Jurnal Harian Layanan Bimbingan Konseling (BK)', headers, rows, headmasterName);
      setSuccessMsg('Jurnal Layanan BK berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportJadwalBK = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Waktu", "Target", "Subjek / Sasaran", "Topik / Agenda", "Catatan Persiapan"];
    const rows = bimbinganSchedules.map(s => {
      const clsName = classes.find(c => c.id === s.targetId)?.name || '';
      const stdName = students.find(std => std.id === s.targetId)?.name || '';
      const sasaran = s.targetType === 'Kelas' ? `Kelas ${clsName}` : s.targetType === 'Individu' ? `Siswa: ${stdName}` : `Orang Tua: ${stdName}`;
      return [
        s.date,
        s.time || '-',
        s.targetType,
        sasaran,
        s.topic,
        s.notes || '-'
      ];
    });

    if (format === 'excel') {
      downloadExcel('jadwal_layanan_bimbingan_bk.xlsx', headers, rows, 'Jadwal BK');
      setSuccessMsg('Jadwal Layanan Konseling BK berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Agenda & Jadwal Layanan Bimbingan Konseling (BK)', headers, rows, headmasterName);
      setSuccessMsg('Jadwal Bimbingan BK berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportPesanBK = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Pengirim / Orang Tua", "Nama Siswa", "Pesan dari Orang Tua", "Balasan Terakhir", "Status Respon"];
    const rows = parentMessages.map(m => {
      const s = students.find(std => std.id === m.studentId);
      const lastReply = m.replies && m.replies.length > 0 ? m.replies[m.replies.length - 1].message : 'Belum Dibalas';
      return [
        m.date,
        m.senderName || 'Orang Tua',
        s?.name || 'Siswa Terhapus',
        m.message,
        lastReply,
        m.replies && m.replies.length > 0 ? 'Selesai Dibalas' : 'Menunggu Respon'
      ];
    });

    if (format === 'excel') {
      downloadExcel('konseling_pesan_orang_tua_bk.xlsx', headers, rows, 'Pesan Konseling');
      setSuccessMsg('Rekap Pesan Konseling Orang Tua berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Rekapitulasi Komunikasi & Pesan Konseling Orang Tua', headers, rows, headmasterName);
      setSuccessMsg('Pesan Konseling berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const getBKDownloadConfig = () => {
    switch (activeTab) {
      case 'beranda':
      case 'bimbingan':
        return [
          { label: 'Bimbingan (Excel)', onClick: () => handleExportBimbinganBK('excel') },
          { label: 'Bimbingan (PDF)', onClick: () => handleExportBimbinganBK('pdf') },
          { label: 'Pelanggaran (Excel)', onClick: () => handleExportKedisiplinanBK('excel') },
          { label: 'Pelanggaran (PDF)', onClick: () => handleExportKedisiplinanBK('pdf') },
        ];
      case 'jurnal':
        return [
          { label: 'Jurnal BK (Excel)', onClick: () => handleExportJurnalBK('excel') },
          { label: 'Jurnal BK (PDF)', onClick: () => handleExportJurnalBK('pdf') },
        ];
      case 'jadwal':
        return [
          { label: 'Jadwal BK (Excel)', onClick: () => handleExportJadwalBK('excel') },
          { label: 'Jadwal BK (PDF)', onClick: () => handleExportJadwalBK('pdf') },
        ];
      case 'pesan':
        return [
          { label: 'Pesan Konseling (Excel)', onClick: () => handleExportPesanBK('excel') },
          { label: 'Pesan Konseling (PDF)', onClick: () => handleExportPesanBK('pdf') },
        ];
      default:
        return [
          { label: 'Bimbingan (Excel)', onClick: () => handleExportBimbinganBK('excel') },
          { label: 'Bimbingan (PDF)', onClick: () => handleExportBimbinganBK('pdf') },
        ];
    }
  };

  return (
    <div className="space-y-6">
      {/* BK Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1">
            <p className="text-rose-100 text-xs font-semibold uppercase tracking-wider">Portal Bimbingan Konseling (BK)</p>
            <h1 className="text-2xl font-bold">{teacher.name}</h1>
            <p className="text-rose-100 text-sm">NIP: {teacher.nip} &bull; Spesialis Bimbingan & Disiplin Siswa</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {getBKDownloadConfig().map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={btn.onClick}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              >
                {btn.label.includes('Excel') ? (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB CONTENTS */}
      <div className="w-full">
        {/* BERANDA MONITORING TAB */}
        {activeTab === 'beranda' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h4 className="font-bold text-slate-800">Cari Profil & Riwayat Poin Siswa</h4>
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    placeholder="Cari nama atau NISN siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                {filteredStudents.map((s) => {
                  const sClass = classes.find((c) => c.id === s.classId);
                  const sViolations = violations.filter((v) => v.studentId === s.id);
                  const sPoints = sViolations.reduce((sum, v) => sum + v.points, 0);
                  const sNotes = counselorNotes.filter((n) => n.studentId === s.id);

                  return (
                    <div key={s.id} className="p-4 border rounded-xl hover:border-rose-300 transition-all bg-slate-50/50 flex justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">NISN: {s.nisn} &bull; {sClass?.name}</p>
                        <p className="text-[10px] text-slate-500">Parent: {s.parentName} ({s.parentPhone})</p>
                        {sNotes.length > 0 && (
                          <div className="text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full inline-block mt-1 font-semibold">
                            {sNotes.length} Catatan Konseling BK
                          </div>
                        )}
                      </div>

                      <div className="text-right flex flex-col justify-between items-end shrink-0">
                        <span className={`px-2.5 py-1 rounded text-xs font-extrabold ${
                          sPoints === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          sPoints < 25 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {sPoints} POIN
                        </span>
                        <button
                          onClick={() => { setTargetStudentId(s.id); setActiveTab('bimbingan'); }}
                          className="text-xs text-rose-600 hover:underline font-bold mt-2"
                        >
                          + Bimbingan
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List of Serious Violations recently */}
            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Daftar Pelanggaran Siswa Terbaru (Merekam Masuk)
              </h4>
              <div className="divide-y text-xs text-slate-600">
                {violations.slice().reverse().map((v) => {
                  const student = students.find((s) => s.id === v.studentId);
                  const type = violationTypes.find((vt) => vt.id === v.violationTypeId);
                  return (
                    <div key={v.id} className="py-2.5 flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{student?.name} ({classes.find(c => c.id === student?.classId)?.name})</p>
                        <p className="text-slate-500 font-medium">[{type?.category}] {type?.name}</p>
                        {v.notes && <p className="text-slate-400 italic">"Keterangan: {v.notes}"</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-600">+{v.points} Poin</span>
                        <p className="text-[10px] text-slate-400">{v.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* BIMBINGAN & CATATAN KONSUL TAB */}
        {activeTab === 'bimbingan' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-rose-500" />
              Sesi Pembinaan Mandiri & Catatan Konseling BK
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Gunakan formulir ini untuk mencatat hasil pertemuan konseling tatap muka dengan siswa yang memerlukan bimbingan kepribadian maupun kedisiplinan.
            </p>

            <form onSubmit={handleSubmitCounselorNote} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Kelas Terlebih Dahulu <span className="text-rose-500">*</span></label>
                  <select
                    value={bimbinganClassFilter}
                    onChange={(e) => {
                      setBimbinganClassFilter(e.target.value);
                      setTargetStudentId('');
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700 shadow-sm"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    <option value="all">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Siswa Terbimbing <span className="text-rose-500">*</span></label>
                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    disabled={!bimbinganClassFilter}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700 shadow-sm disabled:opacity-50"
                  >
                    {!bimbinganClassFilter ? (
                      <option value="">Silakan pilih kelas terlebih dahulu</option>
                    ) : (
                      <>
                        <option value="">-- Pilih Siswa --</option>
                        {students
                          .filter((s) => bimbinganClassFilter === 'all' || s.classId === bimbinganClassFilter)
                          .map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({classes.find(c => c.id === s.classId)?.name})</option>
                          ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status Pembinaan Setelah Sesi</label>
                  <select
                    value={counselingStatus}
                    onChange={(e) => setCounselingStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Dalam Pemantauan">Dalam Pemantauan (Siswa masih dalam pengawasan BK)</option>
                    <option value="Selesai">Selesai (Pembinaan sukses & dianggap tuntas)</option>
                    <option value="Perlu Perhatian">Perlu Perhatian (Masalah mendesak / berat)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Masalah & Ringkasan Pembinaan Konseling</label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan latar belakang masalah siswa, sikap siswa selama bimbingan, dan kesadaran perilakunya..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rencana Tindak Lanjut & Kesepakatan BK-Siswa</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Siswa wajib lapor diri setiap hari Jumat, membuat surat komitmen ditandatangani orang tua..."
                    value={followUpContent}
                    onChange={(e) => setFollowUpContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer shadow transition-all"
                >
                  <Save className="w-4 h-4" />
                  Simpan & Kirim Catatan BK
                </button>
              </div>
            </form>

            {targetStudentId && (
              <div className="mt-8 border-t pt-6">
                <h4 className="font-bold text-slate-800 mb-3 text-sm">Arsip Riwayat Konseling BK Terkait</h4>
                <div className="space-y-3">
                  {counselorNotes.filter(n => n.studentId === targetStudentId).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada riwayat konseling.</p>
                  ) : (
                    counselorNotes.filter(n => n.studentId === targetStudentId).map((n) => (
                      <div key={n.id} className="p-4 border rounded-xl bg-slate-50/50 space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Tanggal Konseling: {n.date}</span>
                          <span className="text-rose-600">Bimbingan: {n.status}</span>
                        </div>
                        <p className="text-xs text-slate-700"><span className="font-bold text-rose-700 text-[10px] block uppercase">Hasil Konseling:</span> {n.notes}</p>
                        {n.followUp && (
                          <p className="text-xs text-slate-700"><span className="font-bold text-rose-700 text-[10px] block uppercase">Tindak Lanjut:</span> {n.followUp}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* JURNAL BIMBINGAN TAB */}
        {activeTab === 'jurnal' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                Input Jurnal Bimbingan Konseling (BK)
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Pencatatan harian bimbingan dan layanan bimbingan konseling baik individu maupun kelompok siswa dalam pembinaan karakter, akademik, atau minat bakat.
              </p>

              <form onSubmit={handleSubmitJurnalBimbingan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Layanan</label>
                    <input
                      type="date"
                      value={jurnalDate}
                      onChange={(e) => setJurnalDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipe Bimbingan</label>
                    <div className="flex gap-4 mt-2">
                      <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="jurnalType"
                          value="Individu"
                          checked={jurnalType === 'Individu'}
                          onChange={() => {
                            setJurnalType('Individu');
                            setJurnalSelectedStudents([]);
                          }}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        Individu (1 Siswa)
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="jurnalType"
                          value="Kelompok"
                          checked={jurnalType === 'Kelompok'}
                          onChange={() => {
                            setJurnalType('Kelompok');
                            setJurnalStudentId('');
                          }}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        Kelompok (Multi Kelas/Siswa)
                      </label>
                    </div>
                  </div>

                  {jurnalType === 'Individu' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Filter Kelas</label>
                        <select
                          value={jurnalClassId}
                          onChange={(e) => {
                            setJurnalClassId(e.target.value);
                            setJurnalStudentId('');
                          }}
                          className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        >
                          <option value="all">Semua Kelas</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Siswa Terbimbing <span className="text-rose-500">*</span></label>
                        <select
                          value={jurnalStudentId}
                          onChange={(e) => setJurnalStudentId(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {students
                            .filter(s => jurnalClassId === 'all' || jurnalClassId === '' || s.classId === jurnalClassId)
                            .map((s) => (
                              <option key={s.id} value={s.id}>{s.name} ({classes.find(c => c.id === s.classId)?.name})</option>
                            ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Kelas</label>
                          <select
                            value={jurnalClassId}
                            onChange={(e) => {
                              setJurnalClassId(e.target.value);
                              setJurnalSelectedStudents([]);
                            }}
                            className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                          >
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Jumlah Terpilih</p>
                          <p className="text-sm font-bold text-rose-600 mt-2">{jurnalSelectedStudents.length} Siswa Terpilih</p>
                        </div>
                      </div>

                      {jurnalClassId && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Ceklis Siswa Anggota Kelompok Bimbingan:</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-xl max-h-[160px] overflow-y-auto bg-slate-50">
                            {students
                              .filter((s) => s.classId === jurnalClassId)
                              .map((s) => {
                                const isChecked = jurnalSelectedStudents.includes(s.id);
                                return (
                                  <label key={s.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs font-medium text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setJurnalSelectedStudents(prev => prev.filter(id => id !== s.id));
                                        } else {
                                          setJurnalSelectedStudents(prev => [...prev, s.id]);
                                        }
                                      }}
                                      className="rounded text-rose-600 focus:ring-rose-500"
                                    />
                                    <span className="truncate">{s.name}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Topik Utama Bimbingan</label>
                    <select
                      value={jurnalTopic}
                      onChange={(e) => setJurnalTopic(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                    >
                      <option value="Karakter & Akhlak">Karakter & Akhlak (Sopan Santun, Kedisiplinan)</option>
                      <option value="Akademik">Akademik (Nilai, Hambatan Belajar, PR)</option>
                      <option value="Bakat dan Minat">Bakat dan Minat (Ekstrakulikuler, Karir, Hobi)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Isi & Catatan Bimbingan Jurnal</label>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan materi pembinaan, tanggapan siswa, dan solusi pemecahan masalah bimbingan..."
                      value={jurnalNotes}
                      onChange={(e) => setJurnalNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shadow cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Jurnal Bimbingan
                  </button>
                </div>
              </form>
            </div>

            {/* Jurnal History List */}
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Riwayat Jurnal Layanan Bimbingan BK</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-3 font-semibold text-slate-500">Tanggal</th>
                      <th className="p-3 font-semibold text-slate-500">Tipe / Layanan</th>
                      <th className="p-3 font-semibold text-slate-500">Siswa / Kelas</th>
                      <th className="p-3 font-semibold text-slate-500">Topik Bimbingan</th>
                      <th className="p-3 font-semibold text-slate-500">Hasil & Catatan Layanan</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bimbinganJournals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 italic">Belum ada jurnal bimbingan tercatat.</td>
                      </tr>
                    ) : (
                      bimbinganJournals.slice().reverse().map((j) => {
                        const sClass = classes.find((c) => c.id === j.classId);
                        return (
                          <tr key={j.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-slate-700">{j.date}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                j.type === 'Individu' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-pink-50 text-pink-700 border border-pink-100'
                              }`}>
                                {j.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-800">
                                  {j.type === 'Individu' 
                                    ? (students.find(s => s.id === j.studentIds[0])?.name || 'Siswa Terhapus')
                                    : `${j.studentIds.length} Siswa`
                                  }
                                </p>
                                <p className="text-[10px] text-slate-400">Kelas: {sClass?.name || '-'}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-700">{j.topic}</span>
                            </td>
                            <td className="p-3 text-slate-600 max-w-xs truncate" title={j.notes}>
                              {j.notes}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => onDeleteBimbinganJournal(j.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-all"
                                title="Hapus Jurnal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* JADWAL BIMBINGAN TAB */}
        {activeTab === 'jadwal' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                Agendakan Sesi & Jadwal Bimbingan BK
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Buat jadwal bimbingan terjadwal. Jadwal ini akan otomatis disinkronkan dan muncul di Dashboard Siswa dan Orang Tua terkait agar terkoordinasi dengan baik.
              </p>

              <form onSubmit={handleSubmitJadwalBimbingan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Pelaksanaan</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rentang Waktu Pelaksanaan</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-sm border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        />
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                      </div>
                      <span className="text-xs font-semibold text-slate-400">s/d</span>
                      <div className="relative flex-1">
                        <input
                          type="time"
                          value={scheduleTimeEnd}
                          onChange={(e) => setScheduleTimeEnd(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-sm border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        />
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sasaran Bimbingan</label>
                    <select
                      value={scheduleTargetType}
                      onChange={(e) => {
                        setScheduleTargetType(e.target.value as any);
                        setScheduleClassId('');
                        setScheduleStudentId('');
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-slate-700"
                    >
                      <option value="Kelas">Kelas (Satu Kelas Penuh)</option>
                      <option value="Individu">Individu (Siswa Tertentu)</option>
                      <option value="Orang Tua">Orang Tua Wali Murid</option>
                    </select>
                  </div>

                  {scheduleTargetType === 'Kelas' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Kelas Sasaran</label>
                      <select
                        value={scheduleClassId}
                        onChange={(e) => setScheduleClassId(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                      >
                        <option value="">-- Pilih Kelas --</option>
                        <option value="all">Semua Kelas</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Filter Kelas Siswa</label>
                        <select
                          value={scheduleClassId}
                          onChange={(e) => {
                            setScheduleClassId(e.target.value);
                            setScheduleStudentId('');
                          }}
                          className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                        >
                          <option value="">-- Pilih Kelas --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Siswa Sasaran <span className="text-rose-500">*</span></label>
                        <select
                          value={scheduleStudentId}
                          onChange={(e) => setScheduleStudentId(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                          disabled={!scheduleClassId}
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {students
                            .filter(s => s.classId === scheduleClassId)
                            .map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Topik Utama Sesi</label>
                    <input
                      type="text"
                      placeholder="Contoh: Konsultasi Bakat Minat & Jurusan SMA, Mediasi Konflik Teman Sebaya"
                      value={scheduleTopic}
                      onChange={(e) => setScheduleTopic(e.target.value)}
                      className="w-full px-3 py-2 text-sm border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Keterangan / Tempat Pelaksanaan</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Bertemu di Ruang BK Lantai 2, harap membawa rapor terakhir siswa..."
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shadow cursor-pointer transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    Terbitkan Jadwal Bimbingan
                  </button>
                </div>
              </form>
            </div>

            {/* Schedules List */}
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Agenda Terjadwal Layanan Bimbingan BK</h3>
              <div className="space-y-4">
                {bimbinganSchedules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Belum ada agenda bimbingan aktif.</p>
                ) : (
                  bimbinganSchedules.slice().reverse().map((sched) => {
                    let targetLabel = '';
                    if (sched.targetType === 'Kelas') {
                      targetLabel = sched.targetId === 'all' ? 'Semua Kelas' : `Kelas ${classes.find(c => c.id === sched.targetId)?.name || sched.targetId}`;
                    } else {
                      const studentName = students.find(s => s.id === sched.targetId)?.name || 'Siswa Terhapus';
                      targetLabel = `${sched.targetType}: ${studentName}`;
                    }

                    return (
                      <div key={sched.id} className="p-4 border rounded-xl hover:border-rose-200 transition-all bg-slate-50/50 flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {sched.targetType}
                            </span>
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-rose-500" />
                              {sched.date} &bull; {sched.time}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-800">{sched.topic}</h4>
                          <p className="text-xs text-slate-600 font-medium"><span className="font-bold text-slate-500">Sasaran:</span> {targetLabel}</p>
                          {sched.notes && <p className="text-xs text-slate-500 italic">"Catatan: {sched.notes}"</p>}
                        </div>
                        <button
                          onClick={() => onDeleteBimbinganSchedule(sched.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 shrink-0 cursor-pointer transition-all"
                          title="Batalkan Jadwal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESAN KOMUNIKASI TAB */}
        {activeTab === 'pesan' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Pesan & Pengaduan Konseling Dari Orang Tua</h3>
            <p className="text-xs text-slate-500 mb-4">
              Daftar koordinasi wali murid yang mengadukan atau merespons tindakan bimbingan bapak/ibu Guru BK. Berikan saran bimbingan rumah yang sinkron.
            </p>

            <div className="space-y-4">
              {parentMessages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Belum ada komunikasi masuk dari orang tua saat ini.</div>
              ) : (
                parentMessages.map((msg) => {
                  const sSiswa = students.find((s) => s.id === msg.studentId);
                  return (
                    <div key={msg.id} className="p-4 border rounded-xl space-y-3 bg-slate-50/50">
                      <div className="flex justify-between items-start border-b pb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{msg.senderName}</p>
                          <p className="text-xs text-slate-400">Orang tua dari siswa: {sSiswa?.name}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{msg.date}</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-700">
                        "{msg.message}"
                      </div>

                      {/* Replies */}
                      {msg.replies && msg.replies.map((rep, idx) => (
                        <div key={idx} className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/60 ml-6 text-xs text-slate-700">
                          <div className="flex justify-between font-bold text-rose-800 mb-1">
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
                          placeholder="Ketik balasan bimbingan rumah BK..."
                          value={replyText[msg.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReplyText((prev) => ({ ...prev, [msg.id]: val }));
                          }}
                          className="flex-1 px-3 py-1.5 text-xs border bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <button
                          onClick={() => handleSendReply(msg.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Kirim BK
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PRESTASI SISWA TAB (BK) */}
        {activeTab === 'prestasi' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-rose-700 via-pink-700 to-rose-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-rose-100 text-xs font-semibold uppercase tracking-wider">Bimbingan &amp; Konseling</p>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-300" />
                  <span>Portofolio &amp; Raihan Prestasi Seluruh Siswa</span>
                </h2>
                <p className="text-rose-100 text-xs">Pencatatan rekam jejak apresiasi positif siswa untuk mendukung bimbingan karir dan kepribadian.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Judul Prestasi', 'Kategori', 'Tingkat', 'Peringkat', 'Tanggal', 'Dicatat Oleh'];
                    const rows = studentAchievements.map((a, i) => [
                      i + 1,
                      students.find(s => s.id === a.studentId)?.nisn || '-',
                      a.studentName,
                      a.classId,
                      a.title,
                      a.category,
                      a.level,
                      a.rank || '-',
                      a.date,
                      a.recordedBy
                    ]);
                    downloadExcel(`Portofolio_Prestasi_Siswa_BK.xlsx`, headers, rows, 'Prestasi Siswa BK');
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Excel</span>
                </button>
                <button
                  onClick={() => {
                    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Judul Prestasi', 'Kategori', 'Tingkat', 'Peringkat', 'Tanggal', 'Dicatat Oleh'];
                    const rows = studentAchievements.map((a, i) => [
                      i + 1,
                      students.find(s => s.id === a.studentId)?.nisn || '-',
                      a.studentName,
                      a.classId,
                      a.title,
                      a.category,
                      a.level,
                      a.rank || '-',
                      a.date,
                      a.recordedBy
                    ]);
                    printTablePDF(`Laporan Rekam Jejak Prestasi Siswa - BK`, headers, rows);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs">Rekapitulasi Prestasi Akademik &amp; Non-Akademik</h3>
                <span className="text-xs text-slate-400 font-semibold">{studentAchievements.length} Total Prestasi</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3">Siswa</th>
                      <th className="px-4 py-3">Judul Prestasi</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Tingkat</th>
                      <th className="px-4 py-3">Peringkat</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Dicatat Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {studentAchievements.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{a.studentName}</div>
                          <div className="text-[10px] text-slate-400">{a.classId}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{a.title}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.category === 'Akademik' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {a.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{a.level}</td>
                        <td className="px-4 py-3 font-bold text-amber-600">{a.rank || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{a.date}</td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">{a.recordedBy}</td>
                      </tr>
                    ))}
                    {studentAchievements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          Belum ada data prestasi siswa yang dicatat dalam sistem.
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
