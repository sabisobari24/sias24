import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  Clock, 
  BookOpen, 
  Award, 
  Camera, 
  Plus, 
  Trash2, 
  Save, 
  LogOut, 
  Check, 
  X, 
  AlertCircle,
  FileText,
  FileSpreadsheet,
  UserPlus,
  ArrowRight,
  Upload,
  Globe,
  Download,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { saveDocument, syncCollection, saveDocumentsBatch } from '../lib/firebase';
import { safeLocalStorageSet } from '../utils/storageHelper';
import { printHTML } from '../utils/printHelper';
import { downloadExcel } from '../utils/excelExport';
import { Student, Teacher, WebSectionContent, WebExtracurricular, StudentAchievement } from '../types';
import { INITIAL_WEB_CONTENT } from '../data/initialWebContent';
import { WebIcon } from './website/WebIcon';

interface CoachPanelProps {
  activeUser: Teacher;
  students: Student[];
  onLogout: () => void;
  studentAchievements?: StudentAchievement[];
  onAddStudentAchievement?: (ach: Omit<StudentAchievement, 'id'>) => void;
  onDeleteStudentAchievement?: (id: string) => void;
}

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

export default function CoachPanel({ 
  activeUser, 
  students, 
  onLogout,
  studentAchievements = [],
  onAddStudentAchievement,
  onDeleteStudentAchievement 
}: CoachPanelProps) {
  // Sync directly with the extracurricular coached by this coach (activeUser.ekskulId)
  const ekskulId = activeUser.ekskulId || 'pramuka';
  
  const [activeTab, setActiveTab] = useState<'anggota' | 'absensi' | 'jurnal' | 'dokumentasi' | 'prestasi' | 'nilai'>('anggota');
  
  // Real-time Web Content sync for extracurriculars
  const [kesiswaanContent, setKesiswaanContent] = useState<WebSectionContent | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceSession[]>([]);
  const [journals, setJournals] = useState<ExtracurricularJournal[]>([]);

  // Grades state
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [draftGrades, setDraftGrades] = useState<{ [studentId: string]: { score: string; attitude: string; notes: string } }>({});

  // Local state for forms
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Member selection & filter states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudentIdsForAdd, setSelectedStudentIdsForAdd] = useState<string[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Attendance Session Form
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTopic, setSessionTopic] = useState('');
  const [tempAttendance, setTempAttendance] = useState<{ [studentId: string]: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' }>({});

  // Journal Form
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalMaterial, setJournalMaterial] = useState('');
  const [journalNotes, setJournalNotes] = useState('');
  const [journalPhoto, setJournalPhoto] = useState('');

  // Achievements Form
  const [achievementName, setAchievementName] = useState('');
  const [achievementScope, setAchievementScope] = useState('Sekolah');
  const [achievementStudentId, setAchievementStudentId] = useState('');
  const [achievementPhoto, setAchievementPhoto] = useState('');

  // Documentation Photo Form
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Fetch Kesiswaan section from Web Content
  useEffect(() => {
    const unsubscribe = syncCollection<WebSectionContent>('web_content', (data) => {
      const found = data.find((c) => c.id === 'kesiswaan');
      if (found) {
        setKesiswaanContent(found);
      } else {
        // Fallback seed
        const fallback = INITIAL_WEB_CONTENT.find((c) => c.id === 'kesiswaan')!;
        setKesiswaanContent(fallback);
      }
    }, INITIAL_WEB_CONTENT);
    return () => unsubscribe();
  }, []);

  // Fetch or initialize attendance & journals
  useEffect(() => {
    const unsubscribeAttendance = syncCollection<AttendanceSession>(`attendance_${ekskulId}`, (data) => {
      setAttendanceList(data.sort((a, b) => b.date.localeCompare(a.date)));
    });
    const unsubscribeJournals = syncCollection<ExtracurricularJournal>(`journals_${ekskulId}`, (data) => {
      setJournals(data.sort((a, b) => b.date.localeCompare(a.date)));
    });
    return () => {
      unsubscribeAttendance();
      unsubscribeJournals();
    };
  }, [ekskulId]);

  // Load registered members from localStorage or custom state linked to the coach
  useEffect(() => {
    const savedMembers = localStorage.getItem(`ekskul_members_${ekskulId}`);
    if (savedMembers) {
      try {
        setMemberIds(JSON.parse(savedMembers));
      } catch (e) {
        setMemberIds([]);
      }
    } else {
      // Default members - pick first 5 students for demonstration if empty
      const defaultIds = students.slice(0, 5).map(s => s.id);
      setMemberIds(defaultIds);
      safeLocalStorageSet(`ekskul_members_${ekskulId}`, JSON.stringify(defaultIds));
    }
  }, [ekskulId, students]);

  // Load student grades in real-time
  useEffect(() => {
    const unsubscribeGrades = syncCollection<StudentGrade>(`grades_${ekskulId}`, (data) => {
      setStudentGrades(data);
    });
    return () => unsubscribeGrades();
  }, [ekskulId]);

  // Synchronize draft grades whenever members list or fetched studentGrades change
  useEffect(() => {
    const newDrafts: { [studentId: string]: { score: string; attitude: string; notes: string } } = {};
    memberIds.forEach(id => {
      const match = studentGrades.find(g => g.studentId === id);
      newDrafts[id] = {
        score: match ? String(match.score) : '',
        attitude: match ? match.attitude : 'Baik',
        notes: match ? match.notes : ''
      };
    });
    setDraftGrades(newDrafts);
  }, [memberIds, studentGrades]);

  // Get current extracurricular profile
  const currentEkskul = kesiswaanContent?.extracurriculars?.find(e => e.id === ekskulId) || {
    id: ekskulId,
    name: 'Ekstrakurikuler ' + ekskulId.toUpperCase(),
    icon: '🏆',
    coordinator: 'Belum ditentukan',
    coach: activeUser.name,
    members: '0 Siswa',
    schedule: 'Belum ditentukan',
    achievements: [],
    images: []
  } as WebExtracurricular;

  // Helper to save members
  const saveMembers = (newIds: string[]) => {
    setMemberIds(newIds);
    safeLocalStorageSet(`ekskul_members_${ekskulId}`, JSON.stringify(newIds));
    
    // Sync members count to web
    if (kesiswaanContent && kesiswaanContent.extracurriculars) {
      const updatedEkskuls = kesiswaanContent.extracurriculars.map(e => {
        if (e.id === ekskulId) {
          return {
            ...e,
            members: `${newIds.length} Siswa (Terdaftar)`
          };
        }
        return e;
      });
      saveDocument('web_content', 'kesiswaan', {
        ...kesiswaanContent,
        extracurriculars: updatedEkskuls
      }).catch(err => console.error(err));
    }
  };

  // Filtered available classes
  const availableClasses = Array.from(new Set(students.map(s => s.classId).filter(Boolean))).sort();

  // Filtered available students for addition
  const availableStudentsForAdd = students
    .filter(s => !memberIds.includes(s.id))
    .filter(s => selectedClassFilter === 'all' || s.classId === selectedClassFilter)
    .filter(s => 
      !searchStudentQuery.trim() || 
      s.name.toLowerCase().includes(searchStudentQuery.toLowerCase().trim()) || 
      (s.nisn && s.nisn.includes(searchStudentQuery.trim()))
    );

  const handleToggleStudentSelect = (id: string) => {
    if (selectedStudentIdsForAdd.includes(id)) {
      setSelectedStudentIdsForAdd(selectedStudentIdsForAdd.filter(sId => sId !== id));
    } else {
      setSelectedStudentIdsForAdd([...selectedStudentIdsForAdd, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = availableStudentsForAdd.map(s => s.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedStudentIdsForAdd.includes(id));
    if (allSelected) {
      // Unselect filtered
      setSelectedStudentIdsForAdd(selectedStudentIdsForAdd.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedStudentIdsForAdd(Array.from(new Set([...selectedStudentIdsForAdd, ...filteredIds])));
    }
  };

  const handleBulkAddMembers = () => {
    if (selectedStudentIdsForAdd.length === 0) return;
    const updated = Array.from(new Set([...memberIds, ...selectedStudentIdsForAdd]));
    saveMembers(updated);
    setSuccessMsg(`Berhasil menambahkan ${selectedStudentIdsForAdd.length} siswa ke anggota ekstrakurikuler!`);
    setSelectedStudentIdsForAdd([]);
    setShowAddMemberModal(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddMember = () => {
    if (!selectedStudentId) return;
    if (memberIds.includes(selectedStudentId)) {
      setErrorMsg('Siswa ini sudah menjadi anggota ekstrakurikuler.');
      return;
    }
    const updated = [...memberIds, selectedStudentId];
    saveMembers(updated);
    setSelectedStudentId('');
    setSuccessMsg('Berhasil menambahkan anggota baru!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRemoveMember = (id: string) => {
    const updated = memberIds.filter(mId => mId !== id);
    saveMembers(updated);
    setSuccessMsg('Anggota berhasil dihapus.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Record Attendance Session
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTopic.trim()) {
      setErrorMsg('Materi / Topik Latihan wajib diisi.');
      return;
    }

    // Prepare attendance object for all members
    const finalAttendance: { [studentId: string]: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' } = {};
    memberIds.forEach(mId => {
      finalAttendance[mId] = tempAttendance[mId] || 'Hadir';
    });

    const session: AttendanceSession = {
      id: `session-${Date.now()}`,
      date: sessionDate,
      topic: sessionTopic.trim(),
      attendance: finalAttendance
    };

    try {
      await saveDocument(`attendance_${ekskulId}`, session.id, session);
      
      // Auto-create a training journal entry too!
      const presentCount = Object.values(finalAttendance).filter(v => v === 'Hadir').length;
      const journal: ExtracurricularJournal = {
        id: `journal-${Date.now()}`,
        date: sessionDate,
        material: sessionTopic.trim(),
        notes: `Presensi latihan berhasil direkap. ${presentCount} siswa hadir dari total ${memberIds.length} anggota.`,
        attendeesCount: presentCount
      };
      await saveDocument(`journals_${ekskulId}`, journal.id, journal);

      setSessionTopic('');
      setSuccessMsg('Rekap absensi & jurnal otomatis berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal menyimpan presensi ke database.');
    }
  };

  // Custom Journal Entry
  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalMaterial.trim()) {
      setErrorMsg('Materi / Pokok Bahasan wajib diisi.');
      return;
    }

    const journal: ExtracurricularJournal = {
      id: `journal-${Date.now()}`,
      date: journalDate,
      material: journalMaterial.trim(),
      notes: journalNotes.trim() || 'Latihan berjalan dengan baik dan lancar.',
      attendeesCount: memberIds.length,
      photoUrl: journalPhoto.trim() || undefined
    };

    try {
      await saveDocument(`journals_${ekskulId}`, journal.id, journal);
      setJournalMaterial('');
      setJournalNotes('');
      setJournalPhoto('');
      setSuccessMsg('Jurnal kegiatan berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal menambahkan jurnal.');
    }
  };

  // Upload Photo Documentation - Sync instantly to Website
  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) {
      setErrorMsg('Link foto / path gambar wajib diisi.');
      return;
    }

    if (!kesiswaanContent || !kesiswaanContent.extracurriculars) {
      setErrorMsg('Gagal menghubungkan ke konten website.');
      return;
    }

    const currentImages = currentEkskul.images || [];
    if (currentImages.includes(newPhotoUrl.trim())) {
      setErrorMsg('Foto ini sudah ada di dalam galeri.');
      return;
    }

    const updatedImages = [...currentImages, newPhotoUrl.trim()];
    const updatedEkskuls = kesiswaanContent.extracurriculars.map(e => {
      if (e.id === ekskulId) {
        return { ...e, images: updatedImages };
      }
      return e;
    });

    try {
      await saveDocument('web_content', 'kesiswaan', {
        ...kesiswaanContent,
        extracurriculars: updatedEkskuls
      });
      setNewPhotoUrl('');
      setSuccessMsg('Foto dokumentasi berhasil diunggah & langsung sinkron ke Website!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal memperbarui galeri website.');
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!kesiswaanContent || !kesiswaanContent.extracurriculars) return;

    const currentImages = currentEkskul.images || [];
    const updatedImages = currentImages.filter(img => img !== photoUrl);

    const updatedEkskuls = kesiswaanContent.extracurriculars.map(e => {
      if (e.id === ekskulId) {
        return { ...e, images: updatedImages };
      }
      return e;
    });

    try {
      await saveDocument('web_content', 'kesiswaan', {
        ...kesiswaanContent,
        extracurriculars: updatedEkskuls
      });
      setSuccessMsg('Foto dokumentasi berhasil dihapus.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal memperbarui galeri website.');
    }
  };

  // Input Student Achievement - Sync instantly to Website
  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achievementName.trim()) {
      setErrorMsg('Nama / Jenis Prestasi wajib diisi.');
      return;
    }

    if (!kesiswaanContent || !kesiswaanContent.extracurriculars) {
      setErrorMsg('Gagal menghubungkan ke konten website.');
      return;
    }

    // Identify selected student if any
    const selectedStudent = students.find(s => s.id === achievementStudentId);
    const studentSuffix = selectedStudent ? ` - diraih oleh ${selectedStudent.name} (Kelas ${selectedStudent.classId})` : '';
    const formattedAchievementName = achievementName.trim() + studentSuffix;

    const newAchievement = {
      name: formattedAchievementName,
      scope: achievementScope,
      studentName: selectedStudent ? selectedStudent.name : '',
      photoUrl: achievementPhoto || ''
    };

    const currentAchievements = currentEkskul.achievements || [];
    const updatedAchievements = [...currentAchievements, newAchievement];

    const updatedEkskuls = kesiswaanContent.extracurriculars.map(e => {
      if (e.id === ekskulId) {
        return { ...e, achievements: updatedAchievements };
      }
      return e;
    });

    try {
      await saveDocument('web_content', 'kesiswaan', {
        ...kesiswaanContent,
        extracurriculars: updatedEkskuls
      });

      if (onAddStudentAchievement) {
        onAddStudentAchievement({
          studentId: selectedStudent ? selectedStudent.id : '',
          studentName: selectedStudent ? selectedStudent.name : 'Anggota Ekskul',
          classId: selectedStudent ? selectedStudent.classId : '-',
          title: achievementName.trim(),
          category: 'Non Akademik',
          level: (achievementScope as any) || 'Kota/Kabupaten',
          date: new Date().toISOString().split('T')[0],
          ekskulName: currentEkskul?.name || activeUser.ekskulName || 'Ekstrakurikuler',
          rank: 'Penghargaan / Juara',
          notes: `Ekskul ${currentEkskul?.name || activeUser.ekskulName || ''}`,
          recordedBy: `Pelatih (${activeUser.name})`,
          certificateUrl: achievementPhoto || ''
        });
      }

      setAchievementName('');
      setAchievementStudentId('');
      setAchievementPhoto('');
      setSuccessMsg('Prestasi siswa berhasil disimpan dan otomatis disinkronkan ke Website & Sistem SIAKAD!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal memperbarui prestasi website.');
    }
  };

  const handleRemoveAchievement = async (index: number) => {
    if (!kesiswaanContent || !kesiswaanContent.extracurriculars) return;

    const currentAchievements = currentEkskul.achievements || [];
    const updatedAchievements = currentAchievements.filter((_, idx) => idx !== index);

    const updatedEkskuls = kesiswaanContent.extracurriculars.map(e => {
      if (e.id === ekskulId) {
        return { ...e, achievements: updatedAchievements };
      }
      return e;
    });

    try {
      await saveDocument('web_content', 'kesiswaan', {
        ...kesiswaanContent,
        extracurriculars: updatedEkskuls
      });
      setSuccessMsg('Prestasi berhasil dihapus.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal memperbarui prestasi website.');
    }
  };

  // Grade Management Handlers
  const handleDraftChange = (studentId: string, field: 'score' | 'attitude' | 'notes', value: string) => {
    setDraftGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId] || { score: '', attitude: 'Baik', notes: '' },
        [field]: value
      }
    }));
  };

  const handleSaveSingleGrade = async (studentId: string) => {
    const draft = draftGrades[studentId];
    if (!draft) return;
    const scoreNum = parseInt(draft.score) || 0;
    const studentObj = students.find(s => s.id === studentId);
    if (!studentObj) return;

    // Calculate predicate automatically
    let predicate = 'D';
    if (scoreNum >= 85) predicate = 'A';
    else if (scoreNum >= 75) predicate = 'B';
    else if (scoreNum >= 60) predicate = 'C';

    const gradeData: StudentGrade = {
      id: studentId,
      studentId,
      studentName: studentObj.name,
      classId: studentObj.classId,
      score: scoreNum,
      predicate,
      attitude: draft.attitude,
      notes: draft.notes,
      updatedAt: new Date().toISOString()
    };

    try {
      await saveDocument(`grades_${ekskulId}`, studentId, gradeData);
      setSuccessMsg(`Nilai untuk ${studentObj.name} berhasil disimpan!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal menyimpan nilai.');
    }
  };

  const handleSaveAllGrades = async () => {
    try {
      // LOGIKA PENGHEMATAN KUOTA: Menggunakan batch writes untuk input nilai massal sekaligus guna mengurangi kuota Write Firestore
      const gradesToSave: StudentGrade[] = [];
      for (const id of memberIds) {
        const draft = draftGrades[id];
        if (!draft) continue;
        const scoreNum = parseInt(draft.score) || 0;
        const studentObj = students.find(s => s.id === id);
        if (!studentObj) continue;

        let predicate = 'D';
        if (scoreNum >= 85) predicate = 'A';
        else if (scoreNum >= 75) predicate = 'B';
        else if (scoreNum >= 60) predicate = 'C';

        const gradeData: StudentGrade = {
          id,
          studentId: id,
          studentName: studentObj.name,
          classId: studentObj.classId,
          score: scoreNum,
          predicate,
          attitude: draft.attitude,
          notes: draft.notes,
          updatedAt: new Date().toISOString()
        };
        gradesToSave.push(gradeData);
      }
      
      if (gradesToSave.length > 0) {
        await saveDocumentsBatch(`grades_${ekskulId}`, gradesToSave);
      }
      setSuccessMsg('Seluruh rekap nilai berhasil disimpan ke cloud database via Batch Write!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal menyimpan rekap nilai.');
    }
  };

  const handleDownloadPDFGrades = () => {
    // Load custom logos from Admin Settings (with default fallbacks)
    const logoLeftSaved = localStorage.getItem('siakad_logo_left') || '';
    const logoRightSaved = localStorage.getItem('siakad_logo_right') || '';
    const srcLogoLeft = logoLeftSaved || `${window.location.origin}/logo-dki.png`;
    const srcLogoRight = logoRightSaved || `${window.location.origin}/logo.png`;
    const headmasterName = localStorage.getItem('siakad_headmaster_name') || 'Dra. Hj. Endah Purwani, M.M.';
    const headmasterNip = localStorage.getItem('siakad_headmaster_nip') || '196711261991032004';

    const govTitle = localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA';
    const deptTitle = localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA';
    const sudinTitle = localStorage.getItem('siakad_kop_sudin_title') || 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR';
    const schoolTitle = localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';
    const addressText = localStorage.getItem('siakad_kop_address_text') || 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510';
    const contactText = localStorage.getItem('siakad_kop_contact_text') || 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com';

    const activeMembers = students.filter(s => memberIds.includes(s.id));
    const ekskulName = currentEkskul.name;

    const rowsHTML = activeMembers.map((m, idx) => {
      const g = studentGrades.find(grade => grade.studentId === m.id);
      const score = g ? g.score : '-';
      const predicate = g ? g.predicate : '-';
      const attitude = g ? g.attitude : '-';
      const notes = g ? g.notes : '-';
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><b>${m.name}</b></td>
          <td style="text-align: center;">${m.classId}</td>
          <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${score}</td>
          <td style="text-align: center; font-weight: bold;">${predicate}</td>
          <td style="text-align: center;">${attitude}</td>
          <td>${notes}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Rekap Nilai Ekskul - ${ekskulName}</title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            @media print {
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; color: #111; line-height: 1.4; padding: 15px; margin: 0; }
            
            /* Kop Surat styled precisely after the official SMPN 50 Jakarta letterhead */
            .kop-surat { 
              display: flex; 
              align-items: center; 
              justify-content: space-between; 
              border-bottom: 4px double #000; 
              padding-bottom: 8px; 
              margin-bottom: 18px; 
            }
            .kop-logo-left { 
              height: 75px; 
              width: auto; 
              max-width: 75px;
              object-fit: contain; 
              margin-right: 15px;
            }
            .kop-logo-right { 
              height: 75px; 
              width: auto; 
              max-width: 75px;
              object-fit: contain; 
              margin-left: 15px;
            }
            .kop-logo-fallback { 
              display: none; 
              align-items: center; 
              justify-content: center; 
              height: 75px; 
              width: 75px; 
              background: #fafafa; 
              border: 1.5px solid #000; 
              border-radius: 50%; 
              box-sizing: border-box; 
            }
            .kop-details { 
              text-align: center; 
              flex: 1; 
            }
            .kop-details .gov-title { 
              margin: 0; 
              font-size: 11px; 
              font-weight: bold; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
              color: #000; 
            }
            .kop-details .dept-title { 
              margin: 1px 0; 
              font-size: 11px; 
              font-weight: bold; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
              color: #000; 
            }
            .kop-details .sudin-title { 
              margin: 1px 0; 
              font-size: 10px; 
              font-weight: bold; 
              text-transform: uppercase; 
              letter-spacing: 0.3px; 
              color: #000; 
            }
            .kop-details .school-title { 
              margin: 3px 0; 
              font-size: 20px; 
              font-weight: 800; 
              text-transform: uppercase; 
              letter-spacing: 1px; 
              color: #000; 
              font-family: 'Times New Roman', Times, serif;
            }
            .kop-details .address-text { 
              margin: 0; 
              font-size: 9px; 
              color: #000; 
              font-weight: normal;
            }
            .kop-details .contact-text { 
              margin: 1px 0; 
              font-size: 9px; 
              color: #000; 
              font-weight: 500;
            }
            
            .report-title { text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; text-decoration: underline; color: #000; margin-top: 10px; }
            .meta-info { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 12px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; color: #1e293b; }
            th { background-color: #f1f5f9; font-weight: bold; width: 30%; color: #0f172a; text-align: center; }
            table tr:nth-child(even) { background-color: #f8fafc; }
            
            .signature-section { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; page-break-inside: avoid; }
            .signature-box { text-align: center; width: 220px; }
            .document-wrapper { max-width: 800px; margin: 0 auto; background: #fff; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="document-wrapper">
            <div class="kop-surat">
              <!-- Logo DKI Jakarta (Left) -->
              <img class="kop-logo-left" src="${srcLogoLeft}" alt="Logo DKI Jakarta" onerror="this.style.display='none'; document.getElementById('logo-fallback-left').style.display='inline-flex';" />
              <div id="logo-fallback-left" class="kop-logo-fallback" style="margin-right: 15px;">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M12 8v8"/>
                  <path d="M8 11h8"/>
                </svg>
              </div>
              
              <div class="kop-details">
                <h2 class="gov-title">${govTitle}</h2>
                <h2 class="dept-title">${deptTitle}</h2>
                <h3 class="sudin-title">${sudinTitle}</h3>
                <h1 class="school-title">${schoolTitle}</h1>
                <p class="address-text">${addressText}</p>
                <p class="contact-text">${contactText}</p>
              </div>
              
              <!-- Logo SMP Negeri 50 Jakarta (Right) -->
              <img class="kop-logo-right" src="${srcLogoRight}" alt="Logo SMP Negeri 50" onerror="this.style.display='none'; document.getElementById('logo-fallback-right').style.display='inline-flex';" />
              <div id="logo-fallback-right" class="kop-logo-fallback" style="margin-left: 15px;">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
            </div>
            
            <div class="report-title">LAPORAN REKAPITULASI NILAI EKSTRAKURIKULER</div>
            
            <div class="meta-info">
              <div>Ekstrakurikuler: ${ekskulName.toUpperCase()}</div>
              <div>Tahun Pelajaran: 2026/2027</div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="width: 5%; border: 1px solid #cbd5e1; padding: 8px;">No</th>
                  <th style="width: 25%; border: 1px solid #cbd5e1; padding: 8px;">Nama Anggota</th>
                  <th style="width: 10%; border: 1px solid #cbd5e1; padding: 8px;">Kelas</th>
                  <th style="width: 12%; border: 1px solid #cbd5e1; padding: 8px;">Nilai Angka</th>
                  <th style="width: 10%; border: 1px solid #cbd5e1; padding: 8px;">Predikat</th>
                  <th style="width: 13%; border: 1px solid #cbd5e1; padding: 8px;">Sikap / Karakter</th>
                  <th style="width: 25%; border: 1px solid #cbd5e1; padding: 8px;">Catatan & Deskripsi Kemajuan</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || '<tr><td colspan="7" style="text-align: center; font-style: italic;">Belum ada data nilai siswa</td></tr>'}
              </tbody>
            </table>
            
            <div class="signature-section">
              <div class="signature-box">
                <p>Mengetahui,</p>
                <p style="font-weight: bold; margin-top: 2px;">Kepala Sekolah</p>
                <div style="height: 60px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #cbd5e1; font-size: 9px;">
                  (Tanda Tangan & Cap Resmi)
                </div>
                <p style="font-weight: bold; text-decoration: underline;">${headmasterName}</p>
                <p>NIP. ${headmasterNip}</p>
              </div>
              <div class="signature-box">
                <p>&nbsp;</p>
                <p style="font-weight: bold; margin-top: 2px;">Pembina Ekstrakurikuler</p>
                <div style="height: 60px;"></div>
                <p style="font-weight: bold; text-decoration: underline;">${currentEkskul.coordinator || '_____________________'}</p>
                <p>NIP. Pembina</p>
              </div>
              <div class="signature-box">
                <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p style="font-weight: bold; margin-top: 2px;">Pelatih / Pembimbing</p>
                <div style="height: 60px;"></div>
                <p style="font-weight: bold; text-decoration: underline;">${activeUser.name}</p>
                <p>NIP. Pelatih</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    printHTML(htmlContent);
  };

  const handleDownloadExcelGrades = () => {
    const activeMembers = students.filter(s => memberIds.includes(s.id));
    const ekskulName = currentEkskul.name;

    // Headers
    let csvContent = "No;Nama Siswa;Kelas;Nilai Angka;Predikat;Sikap;Catatan Perkembangan\n";

    activeMembers.forEach((m, idx) => {
      const g = studentGrades.find(grade => grade.studentId === m.id);
      const score = g ? g.score : '-';
      const predicate = g ? g.predicate : '-';
      const attitude = g ? g.attitude : '-';
      const notes = g ? g.notes ? g.notes.replace(/;/g, ',') : '-' : '-';

      csvContent += `${idx + 1};${m.name};${m.classId};${score};${predicate};${attitude};${notes}\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rekap_nilai_ekskul_${ekskulName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAttendanceRecap = () => {
    if (attendanceList.length === 0) return;
    
    // Sort oldest first
    const sortedSessions = [...attendanceList].sort((a, b) => a.date.localeCompare(b.date));
    
    const headers = [
      'No',
      'Nama Siswa',
      'Kelas',
      'NISN',
      ...sortedSessions.map(session => `${session.date} (${session.topic})`),
      'Hadir (Total)',
      'Sakit (Total)',
      'Izin (Total)',
      'Alpa (Total)',
      'Persentase Kehadiran'
    ];
    
    const rows = memberStudents.map((siswa, idx) => {
      let countHadir = 0;
      let countSakit = 0;
      let countIzin = 0;
      let countAlpa = 0;
      
      const sessionStatuses = sortedSessions.map(session => {
        const status = session.attendance[siswa.id] || 'Alpa';
        if (status === 'Hadir') countHadir++;
        else if (status === 'Sakit') countSakit++;
        else if (status === 'Izin') countIzin++;
        else if (status === 'Alpa') countAlpa++;
        return status;
      });
      
      const totalSessions = sortedSessions.length;
      const attendancePercentage = totalSessions > 0 
        ? Math.round((countHadir / totalSessions) * 100) + '%' 
        : '0%';
        
      return [
        idx + 1,
        siswa.name,
        siswa.classId || '-',
        siswa.nisn,
        ...sessionStatuses,
        countHadir,
        countSakit,
        countIzin,
        countAlpa,
        attendancePercentage
      ];
    });
    
    downloadExcel(
      `rekap_kehadiran_ekskul_${currentEkskul.name.toLowerCase().replace(/\s+/g, '_')}.xlsx`,
      headers,
      rows,
      `Presensi ${currentEkskul.name.slice(0, 25)}`
    );
  };

  // Handle Local Photo Selection Base64 helper
  const handleLocalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Get active student members
  const memberStudents = students.filter(s => memberIds.includes(s.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER BAR */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-amber-400">
        <div className="flex items-center gap-3 text-center md:text-left">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg border border-amber-300 shrink-0 overflow-hidden">
            <WebIcon name={currentEkskul.icon} className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black tracking-tight">{currentEkskul.name}</h1>
            <p className="text-[10px] md:text-xs text-slate-300 font-mono">
              Dashboard Pelatih: <span className="font-bold text-amber-400">{activeUser.name}</span> | ID: {activeUser.nip}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-400 font-black text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Website Ter-Sinkronisasi</span>
          </span>
          <button
            onClick={onLogout}
            className="bg-rose-600/90 hover:bg-rose-700 font-bold text-xs text-white px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md border border-rose-500"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Portal</span>
          </button>
        </div>
      </header>

      {/* DASHBOARD SHELL */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* FLASH NOTIFICATION MESSAGES */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold">Galat:</span> {errorMsg}
                <button onClick={() => setErrorMsg('')} className="block mt-1 text-rose-600 underline font-bold cursor-pointer">Tutup</button>
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm text-xs font-semibold"
            >
              <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>{successMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EKSKUL PROFILE & INFORMATION PANEL */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jadwal Latihan</span>
            <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{currentEkskul.schedule}</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pembina Ekskul</span>
            <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>{currentEkskul.coordinator}</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jumlah Anggota</span>
            <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>{memberIds.length} Siswa Terdaftar</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Presensi & Jurnal</span>
            <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-500" />
              <span>{attendanceList.length} Pertemuan Direkap</span>
            </p>
          </div>
        </div>

        {/* MAIN LAYOUT WITH LEFT SIDEBAR NAVIGATION */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT SIDEBAR NAVIGATION MENU */}
          <div className="w-full lg:w-64 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2 shrink-0 sticky top-4">
            <div className="px-3 py-2 border-b border-slate-100 mb-2">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Menu Navigasi</h2>
              <p className="text-[10px] text-slate-400 font-medium">Pelatih {currentEkskul.name}</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('anggota')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                activeTab === 'anggota' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black border border-amber-400' 
                  : 'text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Anggota Ekskul</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('absensi')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                activeTab === 'absensi' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black border border-amber-400' 
                  : 'text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Rekap Absensi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('jurnal')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                activeTab === 'jurnal' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black border border-amber-400' 
                  : 'text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Jurnal Latihan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dokumentasi')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                activeTab === 'dokumentasi' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black border border-amber-400' 
                  : 'text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Upload Dokumentasi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('prestasi')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                activeTab === 'prestasi' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black border border-amber-400' 
                  : 'text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Prestasi Non-Akademik</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('nilai')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                activeTab === 'nilai' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black border border-amber-400' 
                  : 'text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>Rekap & Input Nilai</span>
            </button>
          </div>

          {/* RIGHT CONTENT COLUMN */}
          <div className="flex-1 w-full space-y-6">
            {/* TAB PANELS CONTAINER */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs min-h-[400px]">
          
          {/* TAB 1: MEMBER MANAGEMENT */}
          {activeTab === 'anggota' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Manajemen Anggota Ekstrakurikuler</span>
                  </h3>
                  <p className="text-xs text-slate-400">Daftarkan siswa ke kelompok ekstrakurikuler berdasarkan kelas dan pilih beberapa siswa sekaligus.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1.5 rounded-xl text-xs border border-indigo-200/80 shadow-xs">
                    {memberStudents.length} Anggota Terdaftar
                  </span>
                </div>
              </div>

              {/* FILTER & MULTI-SELECT ADD MEMBER BOX */}
              <div className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-white p-5 rounded-2xl border border-indigo-100/90 space-y-4 shadow-xs">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-indigo-600" />
                      <span>Tambah Anggota Baru (Filter Per Kelas &amp; Multi-Pilih)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Pilih kelas siswa, centang satu atau lebih siswa, lalu klik Tambahkan.</p>
                  </div>

                  {selectedStudentIdsForAdd.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkAddMembers}
                      className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 animate-bounce"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Tambahkan {selectedStudentIdsForAdd.length} Siswa Terpilih</span>
                    </button>
                  )}
                </div>

                {/* FILTERS BAR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {/* Class Filter Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                      <Filter className="w-3 h-3 text-indigo-600" />
                      <span>Filter Kelas:</span>
                    </label>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
                    >
                      <option value="all">-- Semua Kelas ({students.filter(s => !memberIds.includes(s.id)).length} Siswa) --</option>
                      {availableClasses.map(cls => {
                        const countInClass = students.filter(s => !memberIds.includes(s.id) && s.classId === cls).length;
                        return (
                          <option key={cls} value={cls}>
                            Kelas {cls} ({countInClass} Belum Terdaftar)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                      <Search className="w-3 h-3 text-indigo-600" />
                      <span>Cari Nama / NISN:</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik nama atau NISN..."
                        value={searchStudentQuery}
                        onChange={(e) => setSearchStudentQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      {searchStudentQuery && (
                        <button
                          onClick={() => setSearchStudentQuery('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Select All Toggle Button */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      disabled={availableStudentsForAdd.length === 0}
                      className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {availableStudentsForAdd.length > 0 && availableStudentsForAdd.every(s => selectedStudentIdsForAdd.includes(s.id)) ? (
                        <>
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                          <span>Batalkan Pilih Semua ({availableStudentsForAdd.length})</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 text-slate-400" />
                          <span>Pilih Semua Siswa Terfilter ({availableStudentsForAdd.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* CANDIDATE STUDENTS MULTI-SELECT CONTAINER */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 max-h-[260px] overflow-y-auto space-y-2 shadow-inner">
                  {availableStudentsForAdd.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      Tidak ada siswa yang sesuai filter atau semua siswa di kelas ini sudah terdaftar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {availableStudentsForAdd.map((student) => {
                        const isSelected = selectedStudentIdsForAdd.includes(student.id);
                        return (
                          <div
                            key={student.id}
                            onClick={() => handleToggleStudentSelect(student.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-400'
                                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                                {student.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-extrabold">
                                  Kelas {student.classId}
                                </span>
                                <span className="font-mono">{student.nisn}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* BULK ADD SUBMIT BAR */}
                {selectedStudentIdsForAdd.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                    <span className="text-xs text-indigo-900 font-bold">
                      {selectedStudentIdsForAdd.length} siswa telah ditandai untuk dimasukkan.
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkAddMembers}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Proses Tambah {selectedStudentIdsForAdd.length} Siswa</span>
                    </button>
                  </div>
                )}
              </div>

              {/* LIST OF CURRENT MEMBERS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Anggota Terdaftar Saat Ini ({memberStudents.length} Siswa)</span>
                </h4>

                {memberStudents.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                    <Users className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">Belum ada anggota yang terdaftar di ekstrakurikuler ini.</p>
                    <p className="text-[10px]">Gunakan panel filter kelas di atas untuk mulai menambahkan anggota.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3.5 pl-5">Nama Siswa</th>
                          <th className="p-3.5">NISN</th>
                          <th className="p-3.5">Kelas</th>
                          <th className="p-3.5">Jenis Kelamin</th>
                          <th className="p-3.5 text-center w-24">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {memberStudents.map((siswa) => (
                          <tr key={siswa.id} className="hover:bg-slate-50/50">
                            <td className="p-3.5 pl-5 font-bold text-slate-800">{siswa.name}</td>
                            <td className="p-3.5 font-mono text-slate-500">{siswa.nisn}</td>
                            <td className="p-3.5 font-bold text-indigo-600">Kelas {siswa.classId}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                (siswa.gender || 'Laki-laki').toLowerCase() === 'perempuan'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}>
                                {(siswa.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => handleRemoveMember(siswa.id)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer"
                                title="Keluarkan dari Ekskul"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RECORD ATTENDANCE */}
          {activeTab === 'absensi' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Rekap Presensi Pertemuan</h3>
                  <p className="text-xs text-slate-400">Catat dan kelola riwayat absensi kehadiran latihan anggota ekstrakurikuler.</p>
                </div>
                {attendanceList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAttendanceRecap}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer w-max"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Rekap Kehadiran (Excel)</span>
                  </button>
                )}
              </div>

              {memberStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-3xl">
                  <Users className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">Daftar Anggota Kosong</p>
                  <p className="text-[10px]">Silakan tambahkan anggota di tab "Anggota Ekskul" terlebih dahulu sebelum merekap absensi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* ABSENSI INPUT FORM */}
                  <form onSubmit={handleSaveAttendance} className="lg:col-span-2 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 text-xs">
                    <span className="text-[10px] bg-slate-800 text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">Mulai Sesi Baru</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tanggal Pertemuan</label>
                        <input
                          type="date"
                          value={sessionDate}
                          onChange={(e) => setSessionDate(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Materi / Bahasan Latihan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Latihan Tali Temali dasar / LKBB"
                          value={sessionTopic}
                          onChange={(e) => setSessionTopic(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Status Absensi Kehadiran Siswa</label>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[250px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 font-bold border-b border-slate-200 uppercase text-[9px] tracking-wider text-slate-500">
                            <tr>
                              <th className="p-2 pl-4">Siswa</th>
                              <th className="p-2 text-center w-64">Status Presensi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {memberStudents.map((siswa) => {
                              const currentStatus = tempAttendance[siswa.id] || 'Hadir';
                              return (
                                <tr key={siswa.id} className="hover:bg-slate-50/40">
                                  <td className="p-2 pl-4 font-bold text-slate-700">{siswa.name}</td>
                                  <td className="p-2">
                                    <div className="flex justify-center gap-1">
                                      {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => setTempAttendance(prev => ({ ...prev, [siswa.id]: opt }))}
                                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wide border cursor-pointer transition-colors ${
                                            currentStatus === opt
                                              ? opt === 'Hadir' ? 'bg-emerald-600 border-emerald-700 text-white'
                                                : opt === 'Sakit' ? 'bg-amber-500 border-amber-600 text-white'
                                                : opt === 'Izin' ? 'bg-blue-600 border-blue-700 text-white'
                                                : 'bg-rose-600 border-rose-700 text-white'
                                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-slate-800"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Rekap Kehadiran (Otomatis Tambah Jurnal)</span>
                    </button>
                  </form>

                  {/* HISTORY RECAPS */}
                  <div className="space-y-4 text-xs">
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max">Riwayat Pertemuan</span>
                    
                    {attendanceList.length === 0 ? (
                      <p className="text-slate-400 italic font-semibold">Belum ada riwayat presensi yang terekam.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {attendanceList.map((att) => {
                          const entries = Object.values(att.attendance);
                          const hadir = entries.filter(v => v === 'Hadir').length;
                          return (
                            <div key={att.id} className="bg-white border border-slate-200/80 p-3.5 rounded-xl space-y-1.5 shadow-xs hover:border-indigo-400 transition-colors">
                              <div className="flex justify-between items-start">
                                <span className="font-mono text-[10px] text-indigo-600 font-bold">{att.date}</span>
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                                  {hadir} / {entries.length} Hadir
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-800 leading-tight">{att.topic}</h4>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXTRA CURRICULAR JOURNAL */}
          {activeTab === 'jurnal' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800">Jurnal Pelatihan Mingguan</h3>
                <p className="text-xs text-slate-400">Catat pokok materi yang diajarkan, catatan khusus kegiatan latihan, dan unggah foto jurnal.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* NEW JOURNAL ENTRY FORM */}
                <form onSubmit={handleSaveJournal} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 text-xs text-left">
                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Catat Jurnal Manual</span>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tanggal Kegiatan</label>
                    <input
                      type="date"
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Materi Pokok Bahasan</label>
                    <input
                      type="text"
                      placeholder="Masukkan pokok bahasan materi..."
                      value={journalMaterial}
                      onChange={(e) => setJournalMaterial(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Catatan Kegiatan / Evaluasi</label>
                    <textarea
                      rows={3}
                      placeholder="Tulis evaluasi kemajuan latihan siswa..."
                      value={journalNotes}
                      onChange={(e) => setJournalNotes(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600 resize-none"
                    />
                  </div>

                  {/* CHOOSE LOGO OR PHOTO UPLOAD */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Foto Dokumentasi Kegiatan (URL atau upload device)</label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Tempel link foto share Google Drive / URL luar"
                        value={journalPhoto}
                        onChange={(e) => setJournalPhoto(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Atau Upload:</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLocalPhotoUpload(e, setJournalPhoto)}
                          className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-indigo-500"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambahkan ke Jurnal</span>
                  </button>
                </form>

                {/* JOURNALS LOG */}
                <div className="lg:col-span-2 space-y-4">
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max">Semua Log Jurnal Latihan</span>
                  
                  {journals.length === 0 ? (
                    <p className="text-slate-400 italic font-semibold text-xs">Belum ada catatan jurnal.</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {journals.map((j) => (
                        <div key={j.id} className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-start shadow-xs">
                          {j.photoUrl && (
                            <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                              <img src={j.photoUrl} alt="Jurnal" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="space-y-1.5 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{j.date}</span>
                              <span className="text-[9px] bg-slate-800 text-slate-200 font-bold px-2 py-0.5 rounded-md font-mono">{j.attendeesCount} Siswa Latihan</span>
                            </div>
                            <h4 className="text-xs font-black text-slate-800 leading-snug">{j.material}</h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed italic">"{j.notes}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTATION IMAGE UPLOADER */}
          {activeTab === 'dokumentasi' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Unggah Dokumentasi & Galeri Kegiatan</h3>
                  <p className="text-xs text-slate-400">Unggah foto-foto dokumentasi terbaik. Foto ini akan otomatis sinkron ke Slider Galeri detail ekskul di Website.</p>
                </div>
              </div>

              {/* UPLOAD PHOTO CONTAINER */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* PHOTO FORM */}
                <form onSubmit={handleAddPhoto} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 text-xs space-y-4 text-left self-start">
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-max">Tambah Dokumentasi Baru</span>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sumber Gambar (Gunakan URL/Drive Share, atau Upload Device)</label>
                    <input
                      type="text"
                      placeholder="Tempel link share foto Google Drive / URL image"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none"
                    />
                    
                    <div className="space-y-1.5 mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Atau pilih file dari HP / Komputer:</span>
                      <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-white text-center hover:bg-slate-50 transition-colors relative cursor-pointer group">
                        <Upload className="w-5 h-5 mx-auto text-slate-400 group-hover:text-indigo-600 mb-1" />
                        <span className="text-[10px] font-black text-slate-500 block">Pilih File Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLocalPhotoUpload(e, setNewPhotoUrl)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {newPhotoUrl && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Preview Gambar:</span>
                      <div className="h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Unggah ke Website</span>
                  </button>
                </form>

                {/* CURRENT GALLERY LIST */}
                <div className="lg:col-span-2 space-y-4">
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max">Foto Galeri Aktif di Website ({currentEkskul.images?.length || 0} Foto)</span>
                  
                  {(!currentEkskul.images || currentEkskul.images.length === 0) ? (
                    <div className="text-center py-12 text-slate-400 space-y-2 border border-slate-100 rounded-2xl bg-slate-50/50">
                      <Camera className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">Belum ada foto dokumentasi.</p>
                      <p className="text-[10px]">Silakan unggah foto di panel kiri untuk mulai mempublikasikan di website.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {currentEkskul.images.map((photo, idx) => (
                        <div key={idx} className="group relative bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden aspect-video shadow-xs hover:border-rose-400 transition-colors">
                          <img src={photo} alt="Dokumentasi" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => handleRemovePhoto(photo)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-md border border-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: STUDENT ACHIEVEMENTS UPLOADER */}
          {activeTab === 'prestasi' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800">Prestasi & Penghargaan Ekskul</h3>
                <p className="text-xs text-slate-400">Publikasikan prestasi, piala, atau piagam penghargaan yang diraih ekstrakurikuler ini langsung di Website.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* NEW ACHIEVEMENT FORM */}
                <form onSubmit={handleAddAchievement} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 text-xs space-y-4 text-left self-start">
                  <div className="flex flex-col gap-1 border-b border-slate-200 pb-3 mb-2">
                    <span className="text-[10px] bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-full uppercase tracking-wider block w-max">Alur Penginputan Prestasi</span>
                    <p className="text-[9px] text-slate-400 mt-1">Sesuai aturan: Pilih Ekskul &rarr; Pilih Siswa &rarr; Input Detail Prestasi.</p>
                  </div>
                  
                  {/* STEP 1: Ekstrakurikuler Kelolaan (Locked) */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-wide">1. Ekstrakurikuler Kelolaan</label>
                    <input
                      type="text"
                      className="w-full text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none text-slate-500 cursor-not-allowed"
                      value={`${currentEkskul.icon && (currentEkskul.icon.startsWith('http') || currentEkskul.icon.startsWith('data:')) ? '✨' : currentEkskul.icon || ''} ${currentEkskul.name}`}
                      disabled
                    />
                  </div>

                  {/* STEP 2: Pilih Nama Anggota / Siswa */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-wide">2. Pilih Nama Anggota / Siswa</label>
                    <select
                      value={achievementStudentId}
                      onChange={(e) => setAchievementStudentId(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      required
                    >
                      <option value="">-- Pilih Anggota Ekskul --</option>
                      {students.filter(s => memberIds.includes(s.id)).map(st => (
                        <option key={st.id} value={st.id}>
                          {st.name} (Kelas {st.classId})
                        </option>
                      ))}
                    </select>
                    {students.filter(s => memberIds.includes(s.id)).length === 0 && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">Ekskul ini belum memiliki anggota. Silakan tambah anggota di tab "Anggota Ekskul" terlebih dahulu.</p>
                    )}
                  </div>

                  {/* STEP 3: Jenis / Detail Prestasi */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-wide">3. Detail / Jenis Prestasi</label>
                    <input
                      type="text"
                      placeholder="Contoh: Juara 1 Lomba LKBB Putra Nasional"
                      value={achievementName}
                      onChange={(e) => setAchievementName(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tingkat / Scope Prestasi</label>
                    <select
                      value={achievementScope}
                      onChange={(e) => setAchievementScope(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none"
                    >
                      <option value="Sekolah">Sekolah / Internal</option>
                      <option value="Kecamatan">Kecamatan</option>
                      <option value="Kota / Kabupaten">Kota / Kabupaten</option>
                      <option value="Provinsi">Provinsi</option>
                      <option value="Nasional">Nasional</option>
                      <option value="Internasional">Internasional</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Foto Dokumentasi Prestasi (Opsional)</label>
                    <div className="flex items-center gap-2">
                      <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1 transition-colors text-[11px] shadow-xs flex-1 justify-center">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{achievementPhoto ? '✓ Foto Dipilih (Ubah)' : 'Pilih File Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLocalPhotoUpload(e, setAchievementPhoto)}
                          className="hidden"
                        />
                      </label>
                      {achievementPhoto && (
                        <button
                          type="button"
                          onClick={() => setAchievementPhoto('')}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl border border-rose-200 transition-colors"
                          title="Batal Pilih Foto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {achievementPhoto && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 aspect-video max-h-32 bg-slate-100">
                        <img src={achievementPhoto} alt="Preview Prestasi" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer border border-indigo-500"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambahkan Prestasi</span>
                  </button>
                </form>

                {/* CURRENT ACHIEVEMENTS TABLE */}
                <div className="lg:col-span-2 space-y-4">
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max">Tabel Penghargaan Aktif di Website ({currentEkskul.achievements?.length || 0} Prestasi)</span>
                  
                  {(!currentEkskul.achievements || currentEkskul.achievements.length === 0) ? (
                    <div className="text-center py-12 text-slate-400 space-y-2 border border-slate-100 rounded-2xl bg-slate-50/50">
                      <Award className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">Belum ada rekor prestasi yang di-input.</p>
                      <p className="text-[10px]">Silakan masukkan data kejuaraan di panel kiri untuk mempublikasikan di website.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3.5 pl-5">Nama Prestasi / Penghargaan</th>
                            <th className="p-3.5 w-40">Tingkat</th>
                            <th className="p-3.5 text-center w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {currentEkskul.achievements.map((ach, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="p-3.5 pl-5 font-bold text-slate-800">
                                <div className="flex items-center gap-3">
                                  {ach.photoUrl && (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                                      <img src={ach.photoUrl} alt={ach.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                  <span className="font-bold text-slate-850 text-xs">{ach.name}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-black text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                                  {ach.scope}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAchievement(index)}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer"
                                  title="Hapus Prestasi"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: STUDENT GRADES UPLOADER */}
          {activeTab === 'nilai' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-800">Rekapitulasi Nilai Ekstrakurikuler</h3>
                  <p className="text-xs text-slate-400">Masukkan nilai siswa anggota kelompok ini, rekap predikat, sikap, dan unduh laporan resmi.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={handleDownloadPDFGrades}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-rose-500"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Unduh PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadExcelGrades}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-emerald-500"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Unduh Excel</span>
                  </button>
                  <button
                    onClick={handleSaveAllGrades}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-indigo-500"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Semua</span>
                  </button>
                </div>
              </div>

              {students.filter(s => memberIds.includes(s.id)).length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2 border border-slate-200/60 rounded-3xl bg-slate-50/50">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-black text-slate-700 text-center">Belum Ada Anggota Terdaftar</p>
                  <p className="text-xs max-w-md mx-auto text-center">Silakan tambahkan anggota ekstrakurikuler terlebih dahulu di tab "Anggota Ekskul" agar dapat memasukkan nilai.</p>
                </div>
              ) : (
                <div className="border border-slate-200/60 rounded-3xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-black text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4 text-center w-12">No</th>
                        <th className="p-4 w-52 text-left">Nama Siswa</th>
                        <th className="p-4 text-center w-20">Kelas</th>
                        <th className="p-4 text-center w-32">Nilai Angka</th>
                        <th className="p-4 text-center w-24">Predikat</th>
                        <th className="p-4 text-center w-36">Sikap / Karakter</th>
                        <th className="p-4 text-left">Catatan & Deskripsi Kemajuan</th>
                        <th className="p-4 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {students.filter(s => memberIds.includes(s.id)).map((student, idx) => {
                        const draft = draftGrades[student.id] || { score: '', attitude: 'Baik', notes: '' };
                        const scoreNum = parseInt(draft.score) || 0;
                        
                        // Calculate live predicate
                        let livePredicate = '-';
                        if (draft.score !== '') {
                          if (scoreNum >= 85) livePredicate = 'A';
                          else if (scoreNum >= 75) livePredicate = 'B';
                          else if (scoreNum >= 60) livePredicate = 'C';
                          else livePredicate = 'D';
                        }

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/40">
                            <td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-4 text-left">
                              <p className="font-bold text-slate-900">{student.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">NISN: {student.nisn}</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-md text-[10px]">
                                {student.classId}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0-100"
                                value={draft.score}
                                onChange={(e) => handleDraftChange(student.id, 'score', e.target.value)}
                                className="w-20 text-center font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <span className={`font-black px-2.5 py-1 rounded-md text-[11px] ${
                                livePredicate === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                livePredicate === 'B' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                livePredicate === 'C' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                livePredicate === 'D' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-400'
                              }`}>
                                {livePredicate}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <select
                                value={draft.attitude}
                                onChange={(e) => handleDraftChange(student.id, 'attitude', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none"
                              >
                                <option value="Sangat Baik">Sangat Baik</option>
                                <option value="Baik">Baik</option>
                                <option value="Cukup">Cukup</option>
                                <option value="Kurang">Kurang</option>
                              </select>
                            </td>
                            <td className="p-4 text-left">
                              <input
                                type="text"
                                placeholder="Tulis catatan kemajuan belajar siswa..."
                                value={draft.notes}
                                onChange={(e) => handleDraftChange(student.id, 'notes', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleSaveSingleGrade(student.id)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer border border-slate-200"
                                title="Simpan Nilai Siswa Ini"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Simpan</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  </main>
</div>
  );
}
