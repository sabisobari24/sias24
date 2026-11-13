import React, { useState, useEffect } from 'react';
import { Student, Teacher, SchoolClass, StudentAchievement, WebSectionContent } from '../../types';
import { syncCollection, saveDocument, deleteDocument, saveDocumentsBatch } from '../../lib/firebase';
import { safeLocalStorageSet } from '../../utils/storageHelper';
import { compressImageFile } from '../../utils/imageHelper';
import { INITIAL_WEB_CONTENT } from '../../data/initialWebContent';
import { 
  Users, 
  Award, 
  Calendar, 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Check, 
  X, 
  Search, 
  Filter, 
  Camera, 
  FileSpreadsheet, 
  FileText,
  Clock,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { downloadExcel } from '../../utils/excelExport';
import { printTablePDF } from '../../utils/printHelper';
import { downloadDocx } from '../../utils/docxExport';
import ConfirmModal from '../ConfirmModal';

interface AttendanceSession {
  id: string;
  date: string;
  topic: string;
  attendance: { [studentId: string]: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' };
}

interface ExtracurricularJournal {
  id: string;
  date: string;
  material: string;
  notes: string;
  attendeesCount: number;
  photoUrl?: string;
}

interface StudentGrade {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  score: number;
  predicate: string;
  attitude: string;
  notes: string;
  updatedAt: string;
}

interface AdminPelatihPanelProps {
  teachers: Teacher[];
  students: Student[];
  classes: SchoolClass[];
  onAddTeacher: (t: Teacher) => void;
  onUpdateTeacher: (t: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  studentAchievements: StudentAchievement[];
  onAddStudentAchievement?: (ach: Omit<StudentAchievement, 'id'>) => void;
  onDeleteStudentAchievement?: (id: string) => void;
  headmasterName?: string;
}

const DEFAULT_EKSKUL_LIST = [
  { id: 'pramuka', name: 'Pramuka (Wajib)' },
  { id: 'paskibra', name: 'Paskibra' },
  { id: 'pmr', name: 'PMR (Palang Merah Remaja)' },
  { id: 'futsal', name: 'Futsal & Sepak Bola' },
  { id: 'basket', name: 'Bola Basket' },
  { id: 'tari', name: 'Seni Tari Tradisional' },
  { id: 'padus', name: 'Paduan Suara (Choir)' },
  { id: 'rohis', name: 'Rohis (Kerohanian Islam)' },
  { id: 'rokris', name: 'Rokris (Kerohanian Kristen)' },
  { id: 'robotik', name: 'Robotik & Coding' },
  { id: 'badminton', name: 'Bulu Tangkis (Badminton)' },
  { id: 'osis', name: 'OSIS & MPK' },
];

export default function AdminPelatihPanel({
  teachers,
  students,
  classes,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  studentAchievements,
  onAddStudentAchievement,
  onDeleteStudentAchievement,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.'
}: AdminPelatihPanelProps) {
  // Coaches list
  const coaches = teachers.filter(t => t.role === 'pelatih' || (t.roles && t.roles.includes('pelatih')));

  // Selected Ekskul for Deep Inspection & Full Management
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>('pramuka');
  const [coachSubTab, setCoachSubTab] = useState<'pelatih-list' | 'anggota' | 'absensi' | 'jurnal' | 'nilai' | 'prestasi'>('pelatih-list');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Coach modal states
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Teacher | null>(null);
  const [coachName, setCoachName] = useState('');
  const [coachNip, setCoachNip] = useState('');
  const [coachEmail, setCoachEmail] = useState('');
  const [coachPassword, setCoachPassword] = useState('');
  const [coachEkskulId, setCoachEkskulId] = useState('pramuka');
  const [coachEkskulName, setCoachEkskulName] = useState('Pramuka (Wajib)');

  // Coach Data states for selectedEkskulId
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [journals, setJournals] = useState<ExtracurricularJournal[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);

  // Forms for Coach Data Management
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedStudentForAdd, setSelectedStudentForAdd] = useState<string[]>([]);
  const [memberClassFilter, setMemberClassFilter] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');

  // Sesi Absensi Form
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionAttendance, setSessionAttendance] = useState<{ [id: string]: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' }>({});

  // Jurnal Form
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalMaterial, setJournalMaterial] = useState('');
  const [journalNotes, setJournalNotes] = useState('');
  const [journalPhoto, setJournalPhoto] = useState('');
  const [journalAttendees, setJournalAttendees] = useState<number>(0);

  // Nilai Form
  const [draftGrades, setDraftGrades] = useState<{ [id: string]: { score: string; attitude: string; notes: string } }>({});

  // Prestasi Form
  const [showAchModal, setShowAchModal] = useState(false);
  const [achStudentId, setAchStudentId] = useState('');
  const [achTitle, setAchTitle] = useState('');
  const [achLevel, setAchLevel] = useState<'Sekolah' | 'Kecamatan' | 'Kota/Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional'>('Kota/Kabupaten');
  const [achRank, setAchRank] = useState('Juara 1');
  const [achDate, setAchDate] = useState(new Date().toISOString().split('T')[0]);

  const [successMsg, setSuccessMsg] = useState('');

  // Sync attendance sessions, journals, grades for selectedEkskulId
  useEffect(() => {
    const unsubAtt = syncCollection<AttendanceSession>(`attendance_${selectedEkskulId}`, (data) => {
      setAttendanceSessions(data.sort((a, b) => b.date.localeCompare(a.date)));
    });
    const unsubJour = syncCollection<ExtracurricularJournal>(`journals_${selectedEkskulId}`, (data) => {
      setJournals(data.sort((a, b) => b.date.localeCompare(a.date)));
    });
    const unsubGrd = syncCollection<StudentGrade>(`grades_${selectedEkskulId}`, (data) => {
      setGrades(data);
    });

    // Members from localStorage/state
    const saved = localStorage.getItem(`ekskul_members_${selectedEkskulId}`);
    if (saved) {
      try {
        setMemberIds(JSON.parse(saved));
      } catch {
        setMemberIds([]);
      }
    } else {
      setMemberIds([]);
    }

    return () => {
      unsubAtt();
      unsubJour();
      unsubGrd();
    };
  }, [selectedEkskulId]);

  const currentEkskulObj = DEFAULT_EKSKUL_LIST.find(e => e.id === selectedEkskulId) || { id: selectedEkskulId, name: selectedEkskulId };

  // Handlers for Coach Teacher CRUD
  const handleOpenAddCoach = () => {
    setEditingCoach(null);
    setCoachName('');
    setCoachNip(`PELATIH-${Math.floor(1000 + Math.random() * 9000)}`);
    setCoachEmail('');
    setCoachPassword('pelatih123');
    setCoachEkskulId('pramuka');
    setCoachEkskulName('Pramuka (Wajib)');
    setIsCoachModalOpen(true);
  };

  const handleOpenEditCoach = (c: Teacher) => {
    setEditingCoach(c);
    setCoachName(c.name);
    setCoachNip(c.nip);
    setCoachEmail(c.email);
    setCoachPassword(c.password || 'pelatih123');
    setCoachEkskulId(c.ekskulId || 'pramuka');
    setCoachEkskulName(c.ekskulName || 'Pramuka (Wajib)');
    setIsCoachModalOpen(true);
  };

  const handleSaveCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachName.trim()) {
      alert('Nama pelatih wajib diisi!');
      return;
    }

    if (editingCoach) {
      onUpdateTeacher({
        ...editingCoach,
        name: coachName.trim(),
        nip: coachNip.trim(),
        email: coachEmail.trim(),
        password: coachPassword.trim() || 'pelatih123',
        role: 'pelatih',
        roles: editingCoach.roles ? Array.from(new Set([...editingCoach.roles, 'pelatih'])) : ['pelatih'],
        ekskulId: coachEkskulId,
        ekskulName: coachEkskulName
      });
      setSuccessMsg(`Data pelatih ${coachName} berhasil diperbarui!`);
    } else {
      const newId = `coach-${Date.now()}`;
      onAddTeacher({
        id: newId,
        name: coachName.trim(),
        nip: coachNip.trim(),
        email: coachEmail.trim() || `${coachNip.toLowerCase()}@smpn50.sch.id`,
        password: coachPassword.trim() || 'pelatih123',
        role: 'pelatih',
        roles: ['pelatih'],
        ekskulId: coachEkskulId,
        ekskulName: coachEkskulName
      });
      setSuccessMsg(`Pelatih baru ${coachName} (${coachEkskulName}) berhasil ditambahkan!`);
    }

    setIsCoachModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleDeleteCoachClick = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Akun Pelatih',
      message: `Yakin ingin menghapus akun pelatih "${name}" secara permanen?`,
      onConfirm: () => {
        onDeleteTeacher(id);
        setSuccessMsg(`Pelatih "${name}" berhasil dihapus.`);
        setTimeout(() => setSuccessMsg(''), 3500);
      }
    });
  };

  // Handlers for Members
  const handleSaveMembers = (newMemberIds: string[]) => {
    setMemberIds(newMemberIds);
    safeLocalStorageSet(`ekskul_members_${selectedEkskulId}`, JSON.stringify(newMemberIds));
    saveDocument('ekskul_members', selectedEkskulId, { id: selectedEkskulId, memberIds: newMemberIds })
      .catch(e => console.warn(e));
  };

  const handleRemoveMember = (studentId: string) => {
    const next = memberIds.filter(id => id !== studentId);
    handleSaveMembers(next);
    setSuccessMsg('Anggota berhasil dihapus dari ekskul ini.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddSelectedMembers = () => {
    const merged = Array.from(new Set([...memberIds, ...selectedStudentForAdd]));
    handleSaveMembers(merged);
    setSelectedStudentForAdd([]);
    setShowAddMemberModal(false);
    setSuccessMsg('Siswa terpilih berhasil didaftarkan sebagai anggota!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Handlers for Sesi Absensi
  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTopic.trim()) {
      setErrorMsg('Materi / topik latihan wajib diisi!');
      setTimeout(() => setErrorMsg(''), 3500);
      return;
    }
    const sessionId = `sesi-${Date.now()}`;
    const newSession: AttendanceSession = {
      id: sessionId,
      date: sessionDate,
      topic: sessionTopic.trim(),
      attendance: sessionAttendance
    };

    saveDocument(`attendance_${selectedEkskulId}`, sessionId, newSession)
      .then(() => {
        setSuccessMsg(`Sesi presensi latihan tanggal ${sessionDate} berhasil disimpan!`);
        setShowSessionModal(false);
        setSessionTopic('');
        setSessionAttendance({});
        setTimeout(() => setSuccessMsg(''), 3500);
      })
      .catch(err => {
        setErrorMsg(`Gagal menyimpan sesi: ${err.message}`);
        setTimeout(() => setErrorMsg(''), 4000);
      });
  };

  const handleDeleteSession = (sessionId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Sesi Absensi',
      message: 'Hapus sesi presensi latihan ini secara permanen?',
      onConfirm: () => {
        deleteDocument(`attendance_${selectedEkskulId}`, sessionId)
          .then(() => {
            setSuccessMsg('Sesi absensi berhasil dihapus.');
            setTimeout(() => setSuccessMsg(''), 3000);
          });
      }
    });
  };

  // Handlers for Jurnal
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalMaterial.trim()) {
      setErrorMsg('Materi kegiatan wajib diisi!');
      setTimeout(() => setErrorMsg(''), 3500);
      return;
    }
    const journalId = `jour-${Date.now()}`;
    const newJournal: ExtracurricularJournal = {
      id: journalId,
      date: journalDate,
      material: journalMaterial.trim(),
      notes: journalNotes.trim(),
      attendeesCount: journalAttendees || memberIds.length,
      photoUrl: journalPhoto
    };

    saveDocument(`journals_${selectedEkskulId}`, journalId, newJournal)
      .then(() => {
        setSuccessMsg(`Jurnal kegiatan ekskul berhasil disimpan!`);
        setShowJournalModal(false);
        setJournalMaterial('');
        setJournalNotes('');
        setJournalPhoto('');
        setTimeout(() => setSuccessMsg(''), 3500);
      });
  };

  const handleDeleteJournal = (journalId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Jurnal Kegiatan',
      message: 'Hapus catatan jurnal kegiatan ini secara permanen?',
      onConfirm: () => {
        deleteDocument(`journals_${selectedEkskulId}`, journalId)
          .then(() => {
            setSuccessMsg('Jurnal kegiatan berhasil dihapus.');
            setTimeout(() => setSuccessMsg(''), 3000);
          });
      }
    });
  };

  // Handlers for Nilai
  const handleSaveAllGrades = () => {
    const listToSave: StudentGrade[] = [];
    memberIds.forEach(sid => {
      const student = students.find(s => s.id === sid);
      if (!student) return;
      const draft = draftGrades[sid] || {
        score: '85',
        attitude: 'Sangat Baik',
        notes: 'Aktif, rajin, dan disiplin dalam setiap sesi latihan.'
      };
      const scoreNum = parseInt(draft.score, 10) || 85;
      const predicate = scoreNum >= 90 ? 'A (Sangat Baik)' : scoreNum >= 80 ? 'B (Baik)' : scoreNum >= 70 ? 'C (Cukup)' : 'D (Kurang)';
      listToSave.push({
        id: `grade-${selectedEkskulId}-${sid}`,
        studentId: sid,
        studentName: student.name,
        classId: student.classId,
        score: scoreNum,
        predicate: predicate,
        attitude: draft.attitude || 'Baik',
        notes: draft.notes || 'Mengikuti kegiatan dengan tertib.',
        updatedAt: new Date().toISOString()
      });
    });

    saveDocumentsBatch(`grades_${selectedEkskulId}`, listToSave)
      .then(() => {
        setSuccessMsg(`Nilai ekstrakurikuler untuk ${listToSave.length} anggota berhasil disimpan!`);
        setTimeout(() => setSuccessMsg(''), 3500);
      });
  };

  // Export handlers
  const handleExportAttendance = (format: 'excel' | 'pdf' | 'docx') => {
    const headers = ['No', 'Tanggal', 'Topik/Materi', 'Total Hadir', 'Total Sakit', 'Total Izin', 'Total Alpa'];
    const rows = attendanceSessions.map((s, idx) => {
      const counts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
      Object.values(s.attendance || {}).forEach(status => {
        if (counts[status as keyof typeof counts] !== undefined) {
          counts[status as keyof typeof counts]++;
        }
      });
      return [
        idx + 1,
        s.date,
        s.topic,
        counts.Hadir,
        counts.Sakit,
        counts.Izin,
        counts.Alpa
      ];
    });
    if (format === 'excel') {
      downloadExcel(`Rekap_Absensi_${currentEkskulObj.name}.xlsx`, headers, rows, 'Absensi Ekskul');
      setSuccessMsg('Rekap Absensi Ekskul berhasil diunduh (Excel .xlsx)!');
    } else if (format === 'docx') {
      downloadDocx(`Rekap_Absensi_${currentEkskulObj.name}.docx`, `Rekapitulasi Absensi Ekskul ${currentEkskulObj.name}`, headers, rows, headmasterName);
      setSuccessMsg('Rekap Absensi Ekskul berhasil diunduh (Word .docx)!');
    } else {
      printTablePDF(`Rekapitulasi Absensi Ekskul ${currentEkskulObj.name}`, headers, rows, headmasterName);
      setSuccessMsg('Rekap Absensi Ekskul siap dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleExportGrades = (format: 'excel' | 'pdf' | 'docx') => {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Nilai Angka', 'Predikat', 'Nilai Sikap', 'Keterangan'];
    const rows = memberIds.map((sid, idx) => {
      const student = students.find(s => s.id === sid);
      const grade = grades.find(g => g.studentId === sid);
      const draft = draftGrades[sid];
      const score = draft?.score || grade?.score || 85;
      const pred = grade?.predicate || (Number(score) >= 90 ? 'A' : 'B');
      const att = draft?.attitude || grade?.attitude || 'Sangat Baik';
      const notes = draft?.notes || grade?.notes || 'Aktif mengikuti kegiatan';
      return [
        idx + 1,
        student?.nisn || '-',
        student?.name || 'Siswa',
        getSchoolClassName(student?.classId, classes),
        score,
        pred,
        att,
        notes
      ];
    });
    if (format === 'excel') {
      downloadExcel(`Nilai_Ekskul_${currentEkskulObj.name}.xlsx`, headers, rows, 'Nilai Ekskul');
      setSuccessMsg('Rekap Nilai Ekskul berhasil diunduh (Excel .xlsx)!');
    } else if (format === 'docx') {
      downloadDocx(`Nilai_Ekskul_${currentEkskulObj.name}.docx`, `Rekapitulasi Nilai Ekskul ${currentEkskulObj.name}`, headers, rows, headmasterName);
      setSuccessMsg('Rekap Nilai Ekskul berhasil diunduh (Word .docx)!');
    } else {
      printTablePDF(`Rekapitulasi Nilai Ekskul ${currentEkskulObj.name}`, headers, rows, headmasterName);
      setSuccessMsg('Rekap Nilai Ekskul siap dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-purple-200 text-xs font-semibold uppercase tracking-wider">
            Super Administrator &bull; Manajemen Pembinaan Kesiswaan
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Data Pelatih &amp; Seluruh Data Dashboard Ekskul</h2>
          <p className="text-purple-100 text-xs sm:text-sm">
            Admin memiliki akses penuh melihat, menambah, mengedit, dan menghapus pelatih, anggota, absensi, jurnal, nilai, dan prestasi ekstrakurikuler.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddCoach}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-slate-950" />
          <span>+ Tambah Pelatih Baru</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl flex items-center gap-2 font-medium">
          <X className="w-5 h-5 text-rose-600" />
          <span className="text-xs font-bold">{errorMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          {[
            { id: 'pelatih-list', label: 'Daftar Pelatih', icon: Users, count: coaches.length },
            { id: 'anggota', label: 'Anggota Ekskul', icon: Users, count: memberIds.length },
            { id: 'absensi', label: 'Absensi Latihan', icon: Calendar, count: attendanceSessions.length },
            { id: 'jurnal', label: 'Jurnal Kegiatan', icon: BookOpen, count: journals.length },
            { id: 'nilai', label: 'Nilai Ekskul', icon: Award, count: memberIds.length },
            { id: 'prestasi', label: 'Prestasi Ekskul', icon: Sparkles, count: studentAchievements.filter(a => a.category === 'Non Akademik').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCoachSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                coachSubTab === tab.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                coachSubTab === tab.id ? 'bg-purple-800 text-purple-200' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Ekskul Switcher for Tab 2-6 */}
        {coachSubTab !== 'pelatih-list' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Pilih Ekskul:</span>
            <select
              value={selectedEkskulId}
              onChange={(e) => setSelectedEkskulId(e.target.value)}
              className="bg-purple-50 border border-purple-200 text-purple-900 font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer text-xs"
            >
              {DEFAULT_EKSKUL_LIST.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: DAFTAR PELATIH */}
      {coachSubTab === 'pelatih-list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Master Data Pelatih &amp; Pembina Ekstrakurikuler</span>
              </h3>
              <p className="text-xs text-slate-500">Akun pelatih memiliki portal khusus untuk mengisi presensi, jurnal kegiatan, dan penilaian bakat minat.</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
              {coaches.length} Pelatih Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Pelatih</th>
                  <th className="px-4 py-3">NIP / ID Pelatih</th>
                  <th className="px-4 py-3">Cabang Ekstrakurikuler</th>
                  <th className="px-4 py-3">Email Akun</th>
                  <th className="px-4 py-3">Kata Sandi</th>
                  <th className="px-4 py-3 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {coaches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Belum ada data pelatih. Klik tombol "+ Tambah Pelatih Baru" untuk menambahkan akun pelatih pertama.
                    </td>
                  </tr>
                ) : (
                  coaches.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <span className="text-[10px] text-purple-600 font-semibold">Pelatih Resmi</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 font-bold">{c.nip}</td>
                      <td className="px-4 py-3">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                          {c.ekskulName || c.ekskulId || 'Pramuka'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{c.email}</td>
                      <td className="px-4 py-3 font-mono text-purple-600 bg-purple-50/50 px-2 rounded w-fit">
                        {c.password || 'pelatih123'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEkskulId(c.ekskulId || 'pramuka');
                              setCoachSubTab('anggota');
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                            title="Buka Data Ekskul Ini"
                          >
                            <span>Kelola Ekskul</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCoach(c)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit Data Pelatih"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoachClick(c.id, c.name)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Akun Pelatih"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ANGGOTA SISWA EKSKUL */}
      {coachSubTab === 'anggota' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Daftar Anggota Siswa: <span className="text-purple-600">{currentEkskulObj.name}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Kelola daftar siswa yang tergabung dalam kegiatan ekstrakurikuler ini. Data tersinkron langsung ke akun pelatih.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Anggota Siswa</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">No</th>
                  <th className="px-4 py-2.5">Nama Siswa</th>
                  <th className="px-4 py-2.5">NISN</th>
                  <th className="px-4 py-2.5">Kelas</th>
                  <th className="px-4 py-2.5">Bakat / Minat</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {memberIds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Belum ada siswa terdaftar pada ekstrakurikuler {currentEkskulObj.name}.
                    </td>
                  </tr>
                ) : (
                  memberIds.map((sid, idx) => {
                    const student = students.find(s => s.id === sid);
                    return (
                      <tr key={sid} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">{student?.name || 'Siswa'}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{student?.nisn || '-'}</td>
                        <td className="px-4 py-2.5 font-semibold text-purple-700">{getSchoolClassName(student?.classId, classes)}</td>
                        <td className="px-4 py-2.5 text-slate-500">{student?.bakatMinat || '-'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(sid)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            title="Hapus dari Anggota"
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
      )}

      {/* TAB 3: ABSENSI LATIHAN */}
      {coachSubTab === 'absensi' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Presensi &amp; Sesi Latihan: <span className="text-purple-600">{currentEkskulObj.name}</span>
              </h3>
              <p className="text-xs text-slate-500">Riwayat sesi latihan mingguan dan rekapitulasi kehadiran anggota.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportAttendance('docx')}
                className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.docx</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportAttendance('pdf')}
                className="px-2.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.pdf</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportAttendance('excel')}
                className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>.xlsx</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionDate(new Date().toISOString().split('T')[0]);
                  setSessionTopic('');
                  setSessionAttendance({});
                  setShowSessionModal(true);
                }}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Input Sesi Latihan Baru</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {attendanceSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada rekaman sesi presensi untuk ekstrakurikuler ini.
              </div>
            ) : (
              attendanceSessions.map((session) => (
                <div key={session.id} className="p-4 border rounded-xl bg-slate-50/50 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-[10px]">
                          {session.date}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{session.topic}</h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      Hadir: {Object.values(session.attendance || {}).filter(s => s === 'Hadir').length}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Sakit: {Object.values(session.attendance || {}).filter(s => s === 'Sakit').length}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                      Izin: {Object.values(session.attendance || {}).filter(s => s === 'Izin').length}
                    </span>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
                      Alpa: {Object.values(session.attendance || {}).filter(s => s === 'Alpa').length}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: JURNAL & FOTO KEGIATAN */}
      {coachSubTab === 'jurnal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Jurnal &amp; Dokumentasi Kegiatan: <span className="text-purple-600">{currentEkskulObj.name}</span>
              </h3>
              <p className="text-xs text-slate-500">Materi latihan mingguan beserta dokumentasi visual kegiatan ekstrakurikuler.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setJournalDate(new Date().toISOString().split('T')[0]);
                setJournalMaterial('');
                setJournalNotes('');
                setJournalPhoto('');
                setJournalAttendees(memberIds.length);
                setShowJournalModal(true);
              }}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jurnal Kegiatan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {journals.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
                Belum ada jurnal kegiatan yang dibuat untuk ekstrakurikuler ini.
              </div>
            ) : (
              journals.map((j) => (
                <div key={j.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 text-xs relative">
                  <button
                    type="button"
                    onClick={() => handleDeleteJournal(j.id)}
                    className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                    title="Hapus Jurnal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded text-[10px]">
                      {j.date}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">&bull; {j.attendeesCount} Peserta Hadir</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{j.material}</h4>
                    {j.notes && <p className="text-slate-600 mt-1 italic">"{j.notes}"</p>}
                  </div>

                  {j.photoUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 max-h-40">
                      <img src={j.photoUrl} alt="Dokumentasi" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: NILAI EKSKUL */}
      {coachSubTab === 'nilai' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Penilaian Ekstrakurikuler: <span className="text-purple-600">{currentEkskulObj.name}</span>
              </h3>
              <p className="text-xs text-slate-500">Input nilai akhir ekstrakurikuler yang akan langsung tertera di rapor siswa.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportGrades('docx')}
                className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.docx</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportGrades('pdf')}
                className="px-2.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.pdf</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportGrades('excel')}
                className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>.xlsx</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAllGrades}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Seluruh Nilai</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Siswa</th>
                  <th className="px-4 py-2.5">Kelas</th>
                  <th className="px-4 py-2.5 w-24">Nilai Angka</th>
                  <th className="px-4 py-2.5 w-32">Nilai Sikap</th>
                  <th className="px-4 py-2.5">Catatan Perkembangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {memberIds.map((sid) => {
                  const student = students.find(s => s.id === sid);
                  const currentDraft = draftGrades[sid] || {
                    score: String(grades.find(g => g.studentId === sid)?.score || 85),
                    attitude: grades.find(g => g.studentId === sid)?.attitude || 'Sangat Baik',
                    notes: grades.find(g => g.studentId === sid)?.notes || 'Aktif mengikuti latihan rutin.'
                  };

                  return (
                    <tr key={sid} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{student?.name || 'Siswa'}</td>
                      <td className="px-4 py-2.5 text-purple-700 font-semibold">{getSchoolClassName(student?.classId, classes)}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentDraft.score}
                          onChange={(e) => setDraftGrades({
                            ...draftGrades,
                            [sid]: { ...currentDraft, score: e.target.value }
                          })}
                          className="w-16 px-2 py-1 bg-slate-50 border rounded text-center font-bold font-mono focus:bg-white"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={currentDraft.attitude}
                          onChange={(e) => setDraftGrades({
                            ...draftGrades,
                            [sid]: { ...currentDraft, attitude: e.target.value }
                          })}
                          className="px-2 py-1 bg-slate-50 border rounded text-xs focus:bg-white"
                        >
                          <option value="Sangat Baik">Sangat Baik (A)</option>
                          <option value="Baik">Baik (B)</option>
                          <option value="Cukup">Cukup (C)</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={currentDraft.notes}
                          onChange={(e) => setDraftGrades({
                            ...draftGrades,
                            [sid]: { ...currentDraft, notes: e.target.value }
                          })}
                          className="w-full px-2 py-1 bg-slate-50 border rounded text-xs focus:bg-white"
                          placeholder="Catatan keaktifan..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: PRESTASI EKSKUL */}
      {coachSubTab === 'prestasi' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Raihan Prestasi Non-Akademik / Ekskul
              </h3>
              <p className="text-xs text-slate-500">Capaian kejuaraan tingkat sekolah, kota, hingga nasional yang dicapai siswa.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAchStudentId('');
                setAchTitle('');
                setAchDate(new Date().toISOString().split('T')[0]);
                setShowAchModal(true);
              }}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Prestasi Ekskul</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Siswa</th>
                  <th className="px-4 py-2.5">Prestasi / Kejuaraan</th>
                  <th className="px-4 py-2.5">Tingkat</th>
                  <th className="px-4 py-2.5">Peringkat</th>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {studentAchievements
                  .filter(a => a.category === 'Non Akademik')
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{a.studentName}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{a.title}</td>
                      <td className="px-4 py-2.5 text-slate-600">{a.level}</td>
                      <td className="px-4 py-2.5 font-bold text-amber-600">{a.rank || '-'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{a.date}</td>
                      <td className="px-4 py-2.5 text-right">
                        {onDeleteStudentAchievement && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmState({
                                isOpen: true,
                                title: 'Hapus Prestasi Siswa',
                                message: `Hapus capaian prestasi "${a.title}" oleh ${a.studentName}?`,
                                onConfirm: () => {
                                  onDeleteStudentAchievement(a.id);
                                  setSuccessMsg('Prestasi berhasil dihapus.');
                                  setTimeout(() => setSuccessMsg(''), 3000);
                                }
                              });
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PELATIH */}
      {isCoachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingCoach ? 'Edit Data Pelatih' : 'Tambah Akun Pelatih Baru'}
              </h3>
              <button onClick={() => setIsCoachModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoach} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Nama Lengkap Pelatih <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="misal: Kak Herman Susilo, S.Pd"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">NIP / No. Identitas</label>
                  <input
                    type="text"
                    value={coachNip}
                    onChange={(e) => setCoachNip(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Kata Sandi Akun</label>
                  <input
                    type="text"
                    value={coachPassword}
                    onChange={(e) => setCoachPassword(e.target.value)}
                    placeholder="pelatih123"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs text-purple-700 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Cabang Ekstrakurikuler yang Dilatih</label>
                <select
                  value={coachEkskulId}
                  onChange={(e) => {
                    const sel = DEFAULT_EKSKUL_LIST.find(item => item.id === e.target.value);
                    setCoachEkskulId(e.target.value);
                    if (sel) setCoachEkskulName(sel.name);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800"
                >
                  {DEFAULT_EKSKUL_LIST.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Email Pelatih</label>
                <input
                  type="email"
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="pelatih@smpn50.sch.id"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCoachModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Simpan Pelatih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH ANGGOTA SISWA */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                Tambah Anggota: {currentEkskulObj.name}
              </h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={memberClassFilter}
                onChange={(e) => setMemberClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <option value="all">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Cari siswa..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y border rounded-xl p-2 max-h-64 text-xs">
              {students
                .filter(s => memberClassFilter === 'all' || isSameClass(s.classId, memberClassFilter, classes))
                .filter(s => !memberIds.includes(s.id))
                .filter(s => s.name.toLowerCase().includes(memberSearch.toLowerCase()))
                .map(s => {
                  const isChecked = selectedStudentForAdd.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2.5 py-2 px-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedStudentForAdd(selectedStudentForAdd.filter(id => id !== s.id));
                          } else {
                            setSelectedStudentForAdd([...selectedStudentForAdd, s.id]);
                          }
                        }}
                        className="rounded text-purple-600"
                      />
                      <span className="font-bold text-slate-900 flex-1">{s.name}</span>
                      <span className="text-purple-600 text-[10px] font-bold">{getSchoolClassName(s.classId, classes)}</span>
                    </label>
                  );
                })}
            </div>

            <div className="flex justify-between items-center pt-2 border-t shrink-0 text-xs">
              <span className="text-slate-500 font-bold">{selectedStudentForAdd.length} siswa terpilih</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedMembers}
                  disabled={selectedStudentForAdd.length === 0}
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Tambahkan Anggota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INPUT SESI LATIHAN */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                Input Sesi Absensi: {currentEkskulObj.name}
              </h3>
              <button onClick={() => setShowSessionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3.5 text-xs flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Tanggal Sesi Latihan</label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Topik / Materi Latihan</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Latihan Baris Berbaris / Dribble"
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Presensi Anggota ({memberIds.length} Siswa)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allPresent: { [id: string]: 'Hadir' } = {};
                      memberIds.forEach(id => { allPresent[id] = 'Hadir'; });
                      setSessionAttendance(allPresent);
                    }}
                    className="text-purple-600 font-bold hover:underline cursor-pointer text-[10px]"
                  >
                    Set Semua Hadir
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto divide-y border rounded-xl p-2">
                  {memberIds.map(sid => {
                    const student = students.find(s => s.id === sid);
                    const currentStatus = sessionAttendance[sid] || 'Hadir';
                    return (
                      <div key={sid} className="pt-2 flex justify-between items-center gap-2">
                        <span className="font-bold text-slate-800">{student?.name || 'Siswa'}</span>
                        <div className="flex gap-1 text-[10px] font-bold">
                          {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setSessionAttendance({ ...sessionAttendance, [sid]: st })}
                              className={`px-2 py-0.5 rounded cursor-pointer ${
                                currentStatus === st
                                  ? st === 'Hadir' ? 'bg-emerald-600 text-white' :
                                    st === 'Sakit' ? 'bg-blue-600 text-white' :
                                    st === 'Izin' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Simpan Sesi Absensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT JURNAL KEGIATAN */}
      {showJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Tambah Jurnal Kegiatan: {currentEkskulObj.name}
              </h3>
              <button onClick={() => setShowJournalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Jumlah Peserta Hadir</label>
                  <input
                    type="number"
                    min="1"
                    value={journalAttendees}
                    onChange={(e) => setJournalAttendees(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Materi / Fokus Latihan</label>
                <input
                  type="text"
                  required
                  placeholder="misal: Formasi Baris Berbaris Variasi 1"
                  value={journalMaterial}
                  onChange={(e) => setJournalMaterial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Catatan Perkembangan / Evaluasi</label>
                <textarea
                  rows={3}
                  placeholder="Evaluasi latihan dan catatan untuk anggota..."
                  value={journalNotes}
                  onChange={(e) => setJournalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Foto Dokumentasi Kegiatan</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const compressed = await compressImageFile(file, 800, 0.7);
                      setJournalPhoto(compressed);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700"
                />
                {journalPhoto && (
                  <img src={journalPhoto} alt="Preview" className="h-20 w-auto rounded border mt-1 object-cover" />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT PRESTASI EKSKUL */}
      {showAchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Tambah Prestasi Ekstrakurikuler
              </h3>
              <button onClick={() => setShowAchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!achStudentId || !achTitle.trim()) {
                  alert('Mohon pilih siswa dan isi judul prestasi!');
                  return;
                }
                const st = students.find(s => s.id === achStudentId);
                if (onAddStudentAchievement && st) {
                  onAddStudentAchievement({
                    studentId: st.id,
                    studentName: st.name,
                    classId: st.classId,
                    title: achTitle.trim(),
                    category: 'Non Akademik',
                    level: achLevel,
                    rank: achRank,
                    date: achDate,
                    notes: `Kegiatan Ekskul ${currentEkskulObj.name}`,
                    recordedBy: 'Admin Sekolah'
                  });
                  setSuccessMsg(`Prestasi ${achTitle} berhasil dicatat!`);
                  setShowAchModal(false);
                  setTimeout(() => setSuccessMsg(''), 3500);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Pilih Siswa Berprestasi <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={achStudentId}
                  onChange={(e) => setAchStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({getSchoolClassName(s.classId, classes)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Judul Prestasi / Kejuaraan <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="misal: Juara 1 Formasi Terbaik LKBB"
                  value={achTitle}
                  onChange={(e) => setAchTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Tingkat Kejuaraan</label>
                  <select
                    value={achLevel}
                    onChange={(e) => setAchLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="Sekolah">Tingkat Sekolah</option>
                    <option value="Kecamatan">Tingkat Kecamatan</option>
                    <option value="Kota/Kabupaten">Tingkat Kota/Kabupaten</option>
                    <option value="Provinsi">Tingkat Provinsi</option>
                    <option value="Nasional">Tingkat Nasional</option>
                    <option value="Internasional">Tingkat Internasional</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Peringkat / Raihan</label>
                  <input
                    type="text"
                    value={achRank}
                    onChange={(e) => setAchRank(e.target.value)}
                    placeholder="Juara 1 / Emas"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Tanggal Raihan</label>
                <input
                  type="date"
                  value={achDate}
                  onChange={(e) => setAchDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Simpan Prestasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
