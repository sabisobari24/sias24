import React, { useState } from 'react';
import { Student, Teacher, SchoolClass, ViolationType, StudentViolation, Attendance, CounselorNote, HomeroomNote, ParentMessage, ExamSchedule, ExamGrade, TeachingJournal, PendingRegistration, QuestionBank, StudentAchievement, StudentExamSubmission, SchoolTimeConfig } from '../types';
import { Settings, Users, Shield, Plus, Edit2, Trash2, RefreshCw, BarChart2, BookOpen, AlertTriangle, FileText, Check, CheckCircle2, Award, Calendar, Link, Clock, Download, FileSpreadsheet, Upload, FileDown, Search, Database, Wifi, WifiOff, Save, ShieldCheck, Sliders, TrendingUp, UserCheck, Globe, FileCheck } from 'lucide-react';
import { downloadExcel, parseExcel } from '../utils/excelExport';
import { printHTML, printTablePDF } from '../utils/printHelper';
import { getSchoolClassName } from '../utils/classUtils';
import ConfirmModal from './ConfirmModal';
import WebContentEditor from './WebContentEditor';
import { CbtScoreExporter } from './CbtScoreExporter';
import { syncCollection, saveDocument } from '../lib/firebase';
import { safeLocalStorageSet } from '../utils/storageHelper';

interface AdminPanelProps {
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  attendance: Attendance[];
  examSchedules: ExamSchedule[];
  examGrades: ExamGrade[];
  studentSubmissions?: StudentExamSubmission[];
  teachingJournals?: TeachingJournal[];
  schoolTimeConfig?: SchoolTimeConfig;
  onUpdateSchoolTimeConfig?: (config: SchoolTimeConfig) => void;
  onAddStudent: (s: Student) => void;
  onUpdateStudent: (s: Student) => void;
  onDeleteStudent: (id: string) => void;
  onAddTeacher: (t: Teacher) => void;
  onUpdateTeacher: (t: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onAddClass: (c: SchoolClass) => void;
  onUpdateClass?: (c: SchoolClass) => void;
  onDeleteClass: (id: string) => void;
  onAddViolationType: (vt: ViolationType) => void;
  onDeleteViolationType: (id: string) => void;
  onResetDatabase: () => void;
  onClearDatabase?: () => void;
  onAddExamSchedule: (schedule: Omit<ExamSchedule, 'id'>) => void;
  onDeleteExamSchedule: (id: string) => void;
  onAddStudentsBatch: (sList: Student[]) => void;
  onAddTeachersBatch: (tList: Teacher[]) => void;
  headmasterName: string;
  onUpdateHeadmasterName: (name: string, logoLeft?: string, logoRight?: string, extraFields?: any) => void;
  activeTabOverride?: 'ringkasan' | 'siswa' | 'guru' | 'database-settings' | 'setting-cbt' | 'validasi-akun' | 'kelola-web' | 'prestasi' | 'setting-sertifikat' | null;
  onTabChange?: (tab: 'ringkasan' | 'siswa' | 'guru' | 'database-settings' | 'setting-cbt' | 'validasi-akun' | 'kelola-web' | 'prestasi' | 'setting-sertifikat') => void;
  onSwitchRole?: (role: 'admin' | 'guru' | 'wali_kelas' | 'bk' | 'piket' | 'guru_wali' | 'tendik', userObj?: Teacher) => void;
  studentAchievements?: StudentAchievement[];
  onAddStudentAchievement?: (ach: Omit<StudentAchievement, 'id'>) => void;
  onDeleteStudentAchievement?: (id: string) => void;
  pendingRegistrations?: PendingRegistration[];
  onApproveRegistration?: (id: string) => void;
  onRejectRegistration?: (id: string) => void;
  onApproveAllRegistrations?: () => void;
  onClearAllPendingRegistrations?: () => void;
  dbStatus?: 'online' | 'offline' | 'high_latency';
  dbLatency?: number;
  lastSyncTime?: number;
  onReconnectDb?: () => void;
  cbtBypassPin?: string;
  onUpdateCbtBypassPin?: (pin: string) => void;
  webHomeContent?: any;
  onUpdateSocialLinks?: (instagram: string, whatsapp: string, email: string) => void;
}

export default function AdminPanel({
  students,
  teachers,
  classes,
  violationTypes,
  violations,
  attendance,
  examSchedules,
  examGrades,
  studentSubmissions = [],
  teachingJournals = [],
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onAddViolationType,
  onDeleteViolationType,
  onResetDatabase,
  onClearDatabase,
  onAddExamSchedule,
  onDeleteExamSchedule,
  onAddStudentsBatch,
  onAddTeachersBatch,
  headmasterName,
  onUpdateHeadmasterName,
  activeTabOverride,
  onTabChange,
  onSwitchRole,
  pendingRegistrations = [],
  onApproveRegistration,
  onRejectRegistration,
  onApproveAllRegistrations,
  onClearAllPendingRegistrations,
  studentAchievements = [],
  onAddStudentAchievement,
  onDeleteStudentAchievement,
  dbStatus = 'online',
  dbLatency = 0,
  lastSyncTime,
  onReconnectDb,
  cbtBypassPin: propsCbtBypassPin,
  onUpdateCbtBypassPin,
  webHomeContent,
  onUpdateSocialLinks,
  schoolTimeConfig = { schoolStartTime: '07:00', latePenaltyPoints: 5, isLatePenaltyEnabled: true },
  onUpdateSchoolTimeConfig,
}: AdminPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'ringkasan' | 'siswa' | 'guru' | 'database-settings' | 'setting-cbt' | 'validasi-akun' | 'kelola-web' | 'prestasi' | 'setting-sertifikat'>('ringkasan');
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'ringkasan' | 'siswa' | 'guru' | 'database-settings' | 'setting-cbt' | 'validasi-akun' | 'kelola-web' | 'prestasi' | 'setting-sertifikat') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [globalSearch, setGlobalSearch] = useState('');

  // School Time & Late Penalty States
  const [localSchoolStartTime, setLocalSchoolStartTime] = useState(schoolTimeConfig.schoolStartTime || '07:00');
  const [localLatePenaltyPoints, setLocalLatePenaltyPoints] = useState(schoolTimeConfig.latePenaltyPoints || 5);
  const [localIsLatePenaltyEnabled, setLocalIsLatePenaltyEnabled] = useState(schoolTimeConfig.isLatePenaltyEnabled ?? true);

  // Achievement state & handlers for Admin
  const [achClassFilter, setAchClassFilter] = useState('');
  const [achStudentId, setAchStudentId] = useState('');
  const [achTitle, setAchTitle] = useState('');
  const [achCategory, setAchCategory] = useState<'Akademik' | 'Non Akademik'>('Akademik');
  const [achLevel, setAchLevel] = useState<'Sekolah' | 'Kecamatan' | 'Kota/Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional'>('Kota/Kabupaten');
  const [achRank, setAchRank] = useState('Juara 1');
  const [achDate, setAchDate] = useState(new Date().toISOString().split('T')[0]);
  const [achNotes, setAchNotes] = useState('');
  const [achCertificateUrl, setAchCertificateUrl] = useState('');
  const [achFilterCat, setAchFilterCat] = useState<'Semua' | 'Akademik' | 'Non Akademik'>('Semua');
  const [achSearch, setAchSearch] = useState('');

  const handleSaveAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!achStudentId) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }
    if (!achTitle.trim()) {
      alert('Judul / Raihan prestasi wajib diisi!');
      return;
    }
    const studentObj = students.find(s => s.id === achStudentId);
    if (!studentObj) return;

    if (onAddStudentAchievement) {
      onAddStudentAchievement({
        studentId: studentObj.id,
        studentName: studentObj.name,
        classId: studentObj.classId,
        title: achTitle.trim(),
        category: achCategory,
        level: achLevel,
        date: achDate,
        rank: achRank,
        notes: achNotes,
        recordedBy: 'Admin Sekolah',
        certificateUrl: achCertificateUrl
      });
    }

    setAchTitle('');
    setAchNotes('');
    setAchCertificateUrl('');
    setSuccessMsg(`Prestasi ${achCategory} untuk ${studentObj.name} berhasil disimpan!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDownloadAchievements = (format: 'excel' | 'pdf') => {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Judul Prestasi', 'Kategori', 'Tingkat', 'Peringkat', 'Tanggal', 'Dicatat Oleh'];
    const filtered = studentAchievements.filter(a => {
      const matchCat = achFilterCat === 'Semua' || a.category === achFilterCat;
      const matchSearch = a.studentName.toLowerCase().includes(achSearch.toLowerCase()) ||
                          a.title.toLowerCase().includes(achSearch.toLowerCase()) ||
                          a.classId.toLowerCase().includes(achSearch.toLowerCase());
      return matchCat && matchSearch;
    });

    const rows = filtered.map((a, idx) => [
      idx + 1,
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

    if (format === 'excel') {
      downloadExcel(`Rekap_Prestasi_Siswa_${new Date().toISOString().split('T')[0]}.xlsx`, headers, rows, 'Prestasi Siswa');
      setSuccessMsg('Berhasil mengunduh Rekapitulasi Prestasi Siswa (Excel)');
    } else {
      printTablePDF('Daftar Raihan Prestasi Siswa (Akademik & Non-Akademik)', headers, rows);
      setSuccessMsg('Rekapitulasi Prestasi Siswa berhasil dicetak / PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // State for Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Ya, Hapus') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  // Certificate Configuration States
  const [certAcademicBgUrl, setCertAcademicBgUrl] = useState(() => localStorage.getItem('siakad_cert_academic_bg_url') || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop');
  const [certNonAcademicBgUrl, setCertNonAcademicBgUrl] = useState(() => localStorage.getItem('siakad_cert_non_academic_bg_url') || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop');
  const [previewCertType, setPreviewCertType] = useState<'akademik' | 'non_akademik'>('akademik');

  const [certBgUrl, setCertBgUrl] = useState(() => localStorage.getItem('siakad_cert_bg_url') || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop');
  const [certLogoLeft, setCertLogoLeft] = useState(() => localStorage.getItem('siakad_cert_logo_left') || `${window.location.origin}/logo-dki.png`);
  const [certLogoRight, setCertLogoRight] = useState(() => localStorage.getItem('siakad_cert_logo_right') || `${window.location.origin}/logo.png`);
  const [certNumFormat, setCertNumFormat] = useState(() => localStorage.getItem('siakad_cert_num_format') || '50/SERT/{CAT}/{YEAR}/{ID}');
  const [certLeftTitle, setCertLeftTitle] = useState(() => localStorage.getItem('siakad_cert_left_title') || 'Pembina / Pelatih Ekstrakurikuler');
  const [certLeftName, setCertLeftName] = useState(() => localStorage.getItem('siakad_cert_left_name') || 'Budi Santoso, S.Pd.');
  const [certRightTitle, setCertRightTitle] = useState(() => localStorage.getItem('siakad_cert_right_title') || 'Kepala SMP Negeri 50 Jakarta');
  const [certRightName, setCertRightName] = useState(() => localStorage.getItem('siakad_cert_right_name') || headmasterName || 'Dra. Hj. Endah Purwani, M.M.');
  const [certRightNip, setCertRightNip] = useState(() => localStorage.getItem('siakad_cert_right_nip') || '196711261991032004');

  const handleSaveCertificateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      backgroundUrl: certAcademicBgUrl,
      academicBgUrl: certAcademicBgUrl,
      nonAcademicBgUrl: certNonAcademicBgUrl,
      logoLeftUrl: certLogoLeft,
      logoRightUrl: certLogoRight,
      certNumberFormat: certNumFormat,
      leftSignTitle: certLeftTitle,
      leftSignName: certLeftName,
      rightSignTitle: certRightTitle,
      rightSignName: certRightName,
      rightSignNip: certRightNip
    };
    safeLocalStorageSet('siakad_certificate_config', JSON.stringify(config));
    safeLocalStorageSet('siakad_cert_bg_url', certAcademicBgUrl);
    safeLocalStorageSet('siakad_cert_academic_bg_url', certAcademicBgUrl);
    safeLocalStorageSet('siakad_cert_non_academic_bg_url', certNonAcademicBgUrl);
    safeLocalStorageSet('siakad_cert_logo_left', certLogoLeft);
    safeLocalStorageSet('siakad_cert_logo_right', certLogoRight);
    safeLocalStorageSet('siakad_cert_num_format', certNumFormat);
    safeLocalStorageSet('siakad_cert_left_title', certLeftTitle);
    safeLocalStorageSet('siakad_cert_left_name', certLeftName);
    safeLocalStorageSet('siakad_cert_right_title', certRightTitle);
    safeLocalStorageSet('siakad_cert_right_name', certRightName);
    safeLocalStorageSet('siakad_cert_right_nip', certRightNip);

    try {
      await saveDocument('settings', 'certificate_config', config);
    } catch (err) {
      console.error('Failed to sync certificate config to Firebase:', err);
    }

    setSuccessMsg('Pengaturan Tampilan Sertifikat Digital berhasil disimpan dan tersinkronisasi!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRoleToggle = (roleVal: 'guru' | 'wali_kelas' | 'bk' | 'piket' | 'admin' | 'guru_wali' | 'tendik') => {
    const currentRoles = teacherForm.roles || [teacherForm.role];
    let newRoles: Array<'guru' | 'wali_kelas' | 'bk' | 'piket' | 'admin' | 'guru_wali' | 'tendik'>;
    if (currentRoles.includes(roleVal)) {
      if (currentRoles.length === 1) return;
      newRoles = currentRoles.filter(r => r !== roleVal) as any;
    } else {
      newRoles = [...currentRoles, roleVal] as any;
    }
    setTeacherForm({
      ...teacherForm,
      roles: newRoles,
      role: newRoles[0] || 'guru'
    });
  };

  // CBT Schedule Form States
  const [cbtSubject, setCbtSubject] = useState('Pendidikan Agama dan Budi Pekerti');
  const [cbtBypassPin, setCbtBypassPin] = useState(propsCbtBypassPin || '9999');
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [cbtMethod, setCbtMethod] = useState<'bank_soal' | 'gform'>('bank_soal');
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  React.useEffect(() => {
    const unsub = syncCollection<QuestionBank>('question_banks', (data) => {
      if (data && data.length > 0) {
        setQuestionBanks(data);
      } else {
        try {
          const local = localStorage.getItem('siakad_question_banks');
          if (local) setQuestionBanks(JSON.parse(local));
        } catch (e) {
          console.error(e);
        }
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  React.useEffect(() => {
    if (propsCbtBypassPin) {
      setCbtBypassPin(propsCbtBypassPin);
    }
  }, [propsCbtBypassPin]);

  // Kop Surat Detail Text States
  const [headmasterNipInput, setHeadmasterNipInput] = useState(() => localStorage.getItem('siakad_headmaster_nip') || '196711261991032004');
  const [govTitleInput, setGovTitleInput] = useState(() => localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA');
  const [deptTitleInput, setDeptTitleInput] = useState(() => localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA');
  const [sudinTitleInput, setSudinTitleInput] = useState(() => localStorage.getItem('siakad_kop_sudin_title') || 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR');
  const [schoolTitleInput, setSchoolTitleInput] = useState(() => localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA');
  const [addressTextInput, setAddressTextInput] = useState(() => localStorage.getItem('siakad_kop_address_text') || 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510');
  const [contactTextInput, setContactTextInput] = useState(() => localStorage.getItem('siakad_kop_contact_text') || 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com');
  const [docNumberInput, setDocNumberInput] = useState(() => localStorage.getItem('siakad_kop_doc_number') || '');

  // Social Media Link States (Footer Website)
  const [adminInstagram, setAdminInstagram] = useState(webHomeContent?.instagram || '');
  const [adminWhatsapp, setAdminWhatsapp] = useState(webHomeContent?.whatsapp || '');
  const [adminEmail, setAdminEmail] = useState(webHomeContent?.email || '');

  React.useEffect(() => {
    if (webHomeContent) {
      setAdminInstagram(webHomeContent.instagram || '');
      setAdminWhatsapp(webHomeContent.whatsapp || '');
      setAdminEmail(webHomeContent.email || '');
    }
  }, [webHomeContent]);
  const [cbtClassId, setCbtClassId] = useState('all');
  const [cbtDate, setCbtDate] = useState('');
  const [cbtStartTime, setCbtStartTime] = useState('07:30');
  const [cbtEndTime, setCbtEndTime] = useState('09:00');
  const [cbtRoom, setCbtRoom] = useState('Ruang CBT-01');
  const [cbtType, setCbtType] = useState<'UTS' | 'UAS' | 'Harian' | 'Simulasi'>('UTS');
  const [cbtGoogleFormUrl, setCbtGoogleFormUrl] = useState('');
  const [cbtKkm, setCbtKkm] = useState<number>(75);

  // State for forms
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState<Omit<Student, 'id'>>({
    name: '',
    nisn: '',
    classId: classes[0]?.id || '',
    gender: 'Laki-laki',
    address: '',
    phone: '',
    parentName: '',
    parentNik: '',
    parentPhone: '',
    parentEmail: '',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120',
    guruWaliTeacherId: '',
    password: '',
    parentPassword: '',
  });

  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<Omit<Teacher, 'id'>>({
    name: '',
    nip: '',
    email: '',
    role: 'guru',
    roles: ['guru'],
    classId: '',
    password: '',
  });

  const [isAddingClass, setIsAddingClass] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    homeroomTeacherId: teachers.find(t => t.role === 'wali_kelas')?.id || '',
  });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingHomeroomTeacherId, setEditingHomeroomTeacherId] = useState<string>('');

  const [isAddingViolationType, setIsAddingViolationType] = useState(false);
  const [violationTypeForm, setViolationTypeForm] = useState<Omit<ViolationType, 'id'>>({
    name: '',
    category: 'Ringan',
    points: 5,
  });

  const [successMsg, setSuccessMsg] = useState('');

  const [showStudentBatch, setShowStudentBatch] = useState(false);
  const [showTeacherBatch, setShowTeacherBatch] = useState(false);

  // Download Student Template Excel
  const downloadStudentTemplate = () => {
    const headers = ['Nama', 'NISN', 'ID_Kelas', 'Jenis_Kelamin', 'Alamat', 'HP_Siswa', 'Nama_Orang_Tua', 'HP_Orang_Tua', 'Email_Orang_Tua', 'ID_Guru_Wali', 'NIK_Orang_Tua'];
    const exampleRow = ['Ahmad Syarif', '1234567890', classes[0]?.id || 'Kelas 7A', 'Laki-laki', 'Jl. Merdeka No. 10', '08123456789', 'Budi Syarif', '08129876543', 'budi@gmail.com', teachers[0]?.id || 't-guru-1', '3171011111110008'];
    downloadExcel('template_import_siswa.xlsx', headers, [exampleRow]);
  };

  // Download Teacher Template Excel
  const downloadTeacherTemplate = () => {
    const headers = ['Nama', 'NIP', 'Email', 'Peran', 'ID_Kelas'];
    const exampleRow = ['Siti Aminah, S.Pd.', '198506122010012003', 'siti.aminah@sekolah.sch.id', 'guru', classes[0]?.id || 'Kelas 7A'];
    downloadExcel('template_import_pendidik.xlsx', headers, [exampleRow]);
  };

  // Helper to find column index in parsed spreadsheet header row
  const getColumnIndex = (headers: string[], possibleNames: string[], avoidNames: string[] = []): number => {
    // Clean headers to keep only alphanumeric
    const cleanHeaders = headers.map(h => h ? String(h).toLowerCase().replace(/[^a-z0-9]/g, '') : '');
    const cleanPossibles = possibleNames.map(p => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const cleanAvoids = avoidNames.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Try EXACT match first (after cleaning)
    for (let i = 0; i < cleanHeaders.length; i++) {
      const h = cleanHeaders[i];
      if (!h) continue;
      
      // Check if it's in avoid list
      if (cleanAvoids.some(avoid => h.includes(avoid))) {
        continue;
      }

      if (cleanPossibles.includes(h)) {
        return i;
      }
    }

    // Try FUZZY match: check if header includes one of the possible names
    for (let i = 0; i < cleanHeaders.length; i++) {
      const h = cleanHeaders[i];
      if (!h) continue;

      if (cleanAvoids.some(avoid => h.includes(avoid))) {
        continue;
      }

      // Check if any of the possible names is a substring of the header
      // Or if the header is a substring of the possible name (but only if possible name is long enough)
      const matched = cleanPossibles.some(possible => {
        return h.includes(possible) || (possible.length > 3 && possible.includes(h));
      });

      if (matched) {
        return i;
      }
    }

    return -1;
  };

  const formatScientificNumber = (str: string): string => {
    if (!str) return '';
    // If it contains E+ or e+
    if (/^[0-9]+[.,]?[0-9]*[eE]\+[0-9]+$/.test(str)) {
      try {
        const normalized = str.replace(',', '.');
        const num = Number(normalized);
        if (!isNaN(num)) {
          return String(Math.round(num));
        }
      } catch (e) {
        // ignore
      }
    }
    return str;
  };

  const formatPhoneNumber = (str: string): string => {
    let clean = formatScientificNumber(str).trim();
    if (!clean) return '';
    // Remove any non-digit/plus characters
    clean = clean.replace(/[^0-9+]/g, '');
    if (clean.startsWith('8') && clean.length >= 9 && clean.length <= 13) {
      clean = '0' + clean;
    }
    return clean;
  };

  const cleanString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[-._]/g, '')
      .replace(/kelas/g, '');
  };
  
  const romanToNormal = (str: string) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/viii/g, '8')
      .replace(/vii/g, '7')
      .replace(/vi/g, '6')
      .replace(/ix/g, '9');
  };

  // Handle student Excel upload
  const handleStudentCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    parseExcel(file, (rows) => {
      try {
        if (rows.length < 2) {
          alert('File Excel kosong atau format tidak valid.');
          return;
        }

        // Clean header names
        const headerRow = rows[0].map(h => h !== undefined && h !== null ? String(h).trim().toLowerCase() : '');
        
        const idxName = getColumnIndex(
          headerRow, 
          ['namasiswa', 'namalengkap', 'nama', 'studentname', 'name'], 
          ['orangtua', 'ortu', 'wali', 'guru', 'pembina', 'teacher', 'nip', 'nisn', 'nomorinduk', 'idkelas', 'kelas']
        );
        const idxNisn = getColumnIndex(
          headerRow, 
          ['nisn', 'nis', 'nomorinduk', 'id'], 
          ['kelas', 'role', 'peran', 'orangtua', 'ortu', 'wali', 'guru', 'nama', 'email', 'alamat', 'hp']
        );
        const idxClass = getColumnIndex(
          headerRow, 
          ['idkelas', 'kelasid', 'kelas', 'classid', 'class'], 
          ['guru', 'pembina', 'wali', 'nama', 'nip', 'nisn']
        );
        const idxGender = getColumnIndex(headerRow, ['jeniskelamin', 'gender', 'sex', 'jk', 'kelamin']);
        const idxAddress = getColumnIndex(headerRow, ['alamat', 'alamatrumah', 'alamatlengkap', 'address']);
        const idxPhone = getColumnIndex(
          headerRow, 
          ['hpsiswa', 'teleponsiswa', 'nowasiswa', 'nowhatsapphpsiswa', 'studentphone', 'studenthp', 'hpseluler', 'nohp'], 
          ['orangtua', 'ortu', 'wali', 'parent', 'guardian']
        );
        const idxParentName = getColumnIndex(
          headerRow, 
          ['namaorangtua', 'namawali', 'namaortu', 'orangtua', 'wali', 'parentname', 'guardianname'], 
          ['guruwali', 'walikelas', 'hpsiswa', 'hp_siswa', 'teleponsiswa']
        );
        const idxParentPhone = getColumnIndex(
          headerRow, 
          ['hporangtua', 'hpwali', 'hportu', 'nowaorangtua', 'nowawali', 'parentphone', 'guardianphone', 'teleponorangtua'], 
          ['hpsiswa', 'teleponsiswa', 'nowasiswa']
        );
        const idxParentEmail = getColumnIndex(headerRow, ['emailorangtua', 'emailwali', 'emailortu', 'parentemail']);
        const idxGuruWali = getColumnIndex(headerRow, ['idguruwali', 'guruwali', 'walikelas', 'idwalikelas', 'homeroom']);
        const idxParentNik = getColumnIndex(
          headerRow, 
          ['nikorangtua', 'nikwali', 'nikortu', 'parentnik'], 
          ['nisn', 'nip', 'idkelas', 'kelas', 'gender']
        );

        // Default indices if headers not matched
        const nameIdx = idxName !== -1 ? idxName : (idxNisn === 0 ? 1 : 0);
        const nisnIdx = idxNisn !== -1 ? idxNisn : (nameIdx === 1 ? 0 : 1);
        const classIdx = idxClass;
        const genderIdx = idxGender;
        const addressIdx = idxAddress;
        const phoneIdx = idxPhone;
        const parentNameIdx = idxParentName;
        const parentPhoneIdx = idxParentPhone;
        const parentEmailIdx = idxParentEmail;
        const guruWaliIdx = idxGuruWali;
        const parentNikIdx = idxParentNik;

        const dataRows = rows.slice(1);
        const importedStudents: Student[] = [];
        const createdClassesInBatch: SchoolClass[] = [];

        dataRows.forEach((row) => {
          const valAt = (idx: number, fallback = '') => {
            return (idx !== -1 && row[idx] !== undefined && row[idx] !== null) ? String(row[idx]).trim() : fallback;
          };

          const nameVal = valAt(nameIdx);
          let nisnVal = valAt(nisnIdx);
          
          if (!nameVal) return; // Skip invalid or blank rows

          // If NISN is missing, auto-generate a unique placeholder NISN
          if (!nisnVal) {
            nisnVal = '000' + Math.floor(1000000 + Math.random() * 9000000);
          }

          // Class ID matching with dynamic auto-creation
          const uploadedClassId = valAt(classIdx);
          let classIdToUse = '';

          if (uploadedClassId) {
            const cleanUploaded = romanToNormal(cleanString(uploadedClassId));
            
            const matchedClass = classes.find(c => {
              const cleanId = romanToNormal(cleanString(c.id));
              const cleanName = romanToNormal(cleanString(c.name));
              return cleanId === cleanUploaded || cleanName === cleanUploaded || cleanId.includes(cleanUploaded) || cleanUploaded.includes(cleanId);
            });
            
            if (matchedClass) {
              classIdToUse = matchedClass.id;
            } else {
              // Check if already created in this batch
              const alreadyCreated = createdClassesInBatch.find(c => {
                const cleanId = romanToNormal(cleanString(c.id));
                const cleanName = romanToNormal(cleanString(c.name));
                return cleanId === cleanUploaded || cleanName === cleanUploaded;
              });

              if (alreadyCreated) {
                classIdToUse = alreadyCreated.id;
              } else {
                // Auto create missing class
                const newClassId = uploadedClassId;
                const newClassObj: SchoolClass = {
                  id: newClassId,
                  name: newClassId,
                  homeroomTeacherId: ''
                };
                createdClassesInBatch.push(newClassObj);
                onAddClass(newClassObj);
                classIdToUse = newClassId;
              }
            }
          } else {
            classIdToUse = classes[0]?.id || 'Kelas 7A';
          }

          // Gender mapping
          const genderVal = valAt(genderIdx);
          let genderToUse: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
          const cleanGender = genderVal.toLowerCase().trim();
          if (cleanGender.startsWith('p') || cleanGender.includes('wanita') || cleanGender.includes('perempuan')) {
            genderToUse = 'Perempuan';
          }

          const sId = `s-${Math.random().toString(36).substr(2, 9)}`;
          importedStudents.push({
            id: sId,
            name: nameVal,
            nisn: nisnVal,
            classId: classIdToUse,
            gender: genderToUse,
            address: valAt(addressIdx),
            phone: formatPhoneNumber(valAt(phoneIdx)),
            parentName: valAt(parentNameIdx, 'Wali Siswa'),
            parentPhone: formatPhoneNumber(valAt(parentPhoneIdx)),
            parentEmail: valAt(parentEmailIdx),
            parentNik: formatScientificNumber(valAt(parentNikIdx, nisnVal ? `3171${nisnVal}0` : '')),
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120',
            guruWaliTeacherId: valAt(guruWaliIdx),
          });
        });

        if (importedStudents.length > 0) {
          onAddStudentsBatch(importedStudents);
          setSuccessMsg(`Berhasil mengimpor ${importedStudents.length} siswa baru secara massal!`);
          setShowStudentBatch(false);
          setTimeout(() => setSuccessMsg(''), 5000);
        } else {
          alert('Tidak ada data siswa valid yang terdeteksi. Pastikan baris data terisi Nama.');
        }
      } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan saat memproses file Excel.');
      }
    }, (err) => {
      console.error(err);
      alert('Gagal membaca file Excel. Pastikan format file benar (.xlsx atau .csv).');
    });

    e.target.value = '';
  };

  // Handle teacher Excel upload
  const handleTeacherCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    parseExcel(file, (rows) => {
      try {
        if (rows.length < 2) {
          alert('File Excel kosong atau format tidak valid.');
          return;
        }

        // Clean header names
        const headerRow = rows[0].map(h => h !== undefined && h !== null ? String(h).trim().toLowerCase() : '');
        
        const idxName = getColumnIndex(headerRow, ['nama', 'namalengkap', 'teachername', 'name'], ['kelas', 'role', 'peran']);
        const idxNip = getColumnIndex(headerRow, ['nip', 'nomorinduk', 'id'], ['kelas', 'role', 'peran', 'nama']);
        const idxEmail = getColumnIndex(headerRow, ['email', 'surel']);
        const idxRole = getColumnIndex(headerRow, ['peran', 'role', 'jabatan']);
        const idxClass = getColumnIndex(headerRow, ['kelas', 'idkelas', 'kelasid', 'class', 'classid'], ['nama', 'nip']);

        // Default indices if headers not matched
        const nameIdx = idxName !== -1 ? idxName : 0;
        const nipIdx = idxNip !== -1 ? idxNip : 1;
        const emailIdx = idxEmail;
        const roleIdx = idxRole;
        const classIdx = idxClass;

        const dataRows = rows.slice(1);
        const importedTeachers: Teacher[] = [];
        const createdClassesInBatch: SchoolClass[] = [];

        dataRows.forEach((row) => {
          const valAt = (idx: number, fallback = '') => {
            return (idx !== -1 && row[idx] !== undefined && row[idx] !== null) ? String(row[idx]).trim() : fallback;
          };

          const nameVal = valAt(nameIdx);
          const nipVal = valAt(nipIdx);
          if (!nameVal) return; // Skip invalid or empty rows

          // Class ID matching with dynamic auto-creation
          const uploadedClassId = valAt(classIdx);
          let classIdToUse = '';

          if (uploadedClassId) {
            const cleanUploaded = romanToNormal(cleanString(uploadedClassId));
            
            const matchedClass = classes.find(c => {
              const cleanId = romanToNormal(cleanString(c.id));
              const cleanName = romanToNormal(cleanString(c.name));
              return cleanId === cleanUploaded || cleanName === cleanUploaded || cleanId.includes(cleanUploaded) || cleanUploaded.includes(cleanId);
            });
            
            if (matchedClass) {
              classIdToUse = matchedClass.id;
            } else {
              const alreadyCreated = createdClassesInBatch.find(c => {
                const cleanId = romanToNormal(cleanString(c.id));
                const cleanName = romanToNormal(cleanString(c.name));
                return cleanId === cleanUploaded || cleanName === cleanUploaded;
              });

              if (alreadyCreated) {
                classIdToUse = alreadyCreated.id;
              } else {
                const newClassId = uploadedClassId;
                const newClassObj: SchoolClass = {
                  id: newClassId,
                  name: newClassId,
                  homeroomTeacherId: ''
                };
                createdClassesInBatch.push(newClassObj);
                onAddClass(newClassObj);
                classIdToUse = newClassId;
              }
            }
          }

          const tId = `t-${Math.random().toString(36).substr(2, 9)}`;
          importedTeachers.push({
            id: tId,
            name: nameVal,
            nip: formatScientificNumber(nipVal || '199000000000000000'),
            email: valAt(emailIdx, `${nameVal.toLowerCase().replace(/[^a-z0-9]/g, '')}@sekolah.sch.id`),
            role: (valAt(roleIdx) as any) || 'guru',
            classId: classIdToUse,
          });
        });

        if (importedTeachers.length > 0) {
          onAddTeachersBatch(importedTeachers);
          setSuccessMsg(`Berhasil mengimpor ${importedTeachers.length} pendidik baru secara massal!`);
          setShowTeacherBatch(false);
          setTimeout(() => setSuccessMsg(''), 5000);
        } else {
          alert('Tidak ada data pendidik valid yang terdeteksi. Pastikan baris data terisi Nama.');
        }
      } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan saat memproses file Excel.');
      }
    }, (err) => {
      console.error(err);
      alert('Gagal membaca file Excel. Pastikan format file benar (.xlsx atau .csv).');
    });

    e.target.value = '';
  };

  // Custom Rekap States
  const [rekapClassId, setRekapClassId] = useState('all');
  const [rekapTahunPelajaran, setRekapTahunPelajaran] = useState('2025/2026 Ganjil');
  const [rekapSubject, setRekapSubject] = useState('all');
  const [rekapReportType, setRekapReportType] = useState<'presensi' | 'pelanggaran' | 'cbt_grade' | 'kolektif'>('kolektif');
  const [rekapStartDate, setRekapStartDate] = useState('');
  const [rekapEndDate, setRekapEndDate] = useState('');

  // Handle student submit
  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNisn = studentForm.nisn.trim();
    if (!targetNisn) {
      alert('NISN tidak boleh kosong!');
      return;
    }
    if (targetNisn.length !== 10 || isNaN(Number(targetNisn))) {
      alert('NISN Siswa harus berupa 10 digit angka!');
      return;
    }

    // Check uniqueness
    const duplicateNisn = students.some(
      (s) => s.nisn === targetNisn && s.id !== editingStudentId
    );
    if (duplicateNisn) {
      alert(`Gagal: NISN ${targetNisn} sudah terdaftar dalam sistem oleh siswa lain.`);
      return;
    }

    if (editingStudentId) {
      onUpdateStudent({ ...studentForm, nisn: targetNisn, id: editingStudentId });
      setSuccessMsg('Data siswa berhasil diperbarui!');
      setEditingStudentId(null);
    } else {
      const newId = `s-${Math.random().toString(36).substr(2, 9)}`;
      onAddStudent({ ...studentForm, nisn: targetNisn, id: newId });
      setSuccessMsg('Siswa baru berhasil didaftarkan!');
    }
    setIsAddingStudent(false);
    resetStudentForm();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const resetStudentForm = () => {
    setStudentForm({
      name: '',
      nisn: '',
      classId: classes[0]?.id || '',
      gender: 'Laki-laki',
      address: '',
      phone: '',
      parentName: '',
      parentNik: '',
      parentPhone: '',
      parentEmail: '',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120',
      guruWaliTeacherId: '',
      password: '',
      parentPassword: '',
    });
  };

  // Handle teacher submit
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoles = teacherForm.roles && teacherForm.roles.length > 0 ? teacherForm.roles : [teacherForm.role];
    const finalTeacherData = {
      ...teacherForm,
      roles: finalRoles,
      role: finalRoles[0] || 'guru'
    };

    if (editingTeacherId) {
      onUpdateTeacher({ ...finalTeacherData, id: editingTeacherId });
      setSuccessMsg('Data pendidik berhasil diperbarui!');
      setEditingTeacherId(null);
    } else {
      const newId = `t-${Math.random().toString(36).substr(2, 9)}`;
      onAddTeacher({ ...finalTeacherData, id: newId });
      setSuccessMsg('Tenaga pendidik baru berhasil didaftarkan!');
    }
    setIsAddingTeacher(false);
    setTeacherForm({ name: '', nip: '', email: '', role: 'guru', roles: ['guru'], classId: '', password: '' });
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Handle class submit
  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = classForm.name.trim();
    onAddClass({
      id: newId,
      name: classForm.name,
      homeroomTeacherId: classForm.homeroomTeacherId,
    });
    setSuccessMsg('Kelas baru berhasil ditambahkan!');
    setIsAddingClass(false);
    setClassForm({ name: '', homeroomTeacherId: teachers.find(t => t.role === 'wali_kelas')?.id || '' });
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Handle violation type submit
  const handleViolationTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `v-${Math.random().toString(36).substr(2, 9)}`;
    onAddViolationType({
      id: newId,
      name: violationTypeForm.name,
      category: violationTypeForm.category,
      points: Number(violationTypeForm.points),
    });
    setSuccessMsg('Aturan pelanggaran baru berhasil ditambahkan!');
    setIsAddingViolationType(false);
    setViolationTypeForm({ name: '', category: 'Ringan', points: 5 });
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Stats calculation
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;
  const totalRecordedAttendance = attendance.length;
  const totalHadir = attendance.filter(a => a.status === 'Hadir').length;
  const avgAttendance = totalRecordedAttendance > 0 ? Math.round((totalHadir / totalRecordedAttendance) * 100) : 100;
  const totalViolationsCount = violations.length;

  // Instant search logic for students and teachers
  const filteredStudents = students.filter(s => {
    if (!globalSearch) return true;
    const query = globalSearch.toLowerCase().trim();
    const className = classes.find(c => c.id === s.classId)?.name || '';
    const waliName = teachers.find(t => t.id === s.guruWaliTeacherId)?.name || '';
    return (
      s.name.toLowerCase().includes(query) ||
      s.nisn.toLowerCase().includes(query) ||
      className.toLowerCase().includes(query) ||
      waliName.toLowerCase().includes(query) ||
      (s.parentName && s.parentName.toLowerCase().includes(query)) ||
      (s.parentNik && s.parentNik.toLowerCase().includes(query))
    );
  });

  const filteredTeachers = teachers.filter(t => {
    if (!globalSearch) return true;
    const query = globalSearch.toLowerCase().trim();
    const roleLabels = (t.roles && t.roles.length > 0 ? t.roles : [t.role]).map(r => r.replace('_', ' ')).join(' ');
    const className = classes.find(c => c.id === t.classId)?.name || '';
    return (
      t.name.toLowerCase().includes(query) ||
      t.nip.toLowerCase().includes(query) ||
      t.email.toLowerCase().includes(query) ||
      roleLabels.toLowerCase().includes(query) ||
      className.toLowerCase().includes(query)
    );
  });

  // Export handlers
  const handleExportSiswa = (format: 'excel' | 'pdf') => {
    const headers = ["ID Siswa", "Nama Lengkap", "NISN", "ID Kelas", "Kelas", "Jenis Kelamin", "Alamat", "No. HP", "Nama Orang Tua", "No. HP Orang Tua"];
    const rows = students.map(s => [
      s.id,
      s.name,
      s.nisn,
      s.classId,
      classes.find(c => c.id === s.classId)?.name || s.classId,
      s.gender,
      s.address,
      s.phone,
      s.parentName,
      s.parentPhone
    ]);
    if (format === 'excel') {
      downloadExcel('rekap_database_siswa.xlsx', headers, rows, 'Data Siswa');
      setSuccessMsg('Berhasil mengunduh Database Siswa (Excel)!');
    } else {
      printTablePDF('Daftar Database Siswa Terdaftar', headers, rows);
      setSuccessMsg('Dokumen Database Siswa berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportGuru = (format: 'excel' | 'pdf') => {
    const headers = ["ID Guru", "Nama Lengkap", "NIP", "Email", "Peran", "Kelas Pendamping (Wali)"];
    const rows = teachers.map(t => [
      t.id,
      t.name,
      t.nip,
      t.email,
      t.role === 'admin' ? 'Super Admin' : t.role === 'wali_kelas' ? 'Wali Kelas' : t.role === 'bk' ? 'Guru BK' : t.role === 'piket' ? 'Guru Piket' : 'Guru Pengajar',
      classes.find(c => c.id === t.classId)?.name || '-'
    ]);
    if (format === 'excel') {
      downloadExcel('rekap_database_pendidik.xlsx', headers, rows, 'Data Guru');
      setSuccessMsg('Berhasil mengunduh Database Pendidik (Excel)!');
    } else {
      printTablePDF('Daftar Database Tenaga Pendidik & Kependidikan', headers, rows);
      setSuccessMsg('Dokumen Database Pendidik berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportAbsensi = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Nama Siswa", "NISN", "Kelas", "Status Kehadiran", "Catatan", "Pencatat / Verifikator"];
    const rows = attendance.map(a => {
      const s = students.find(std => std.id === a.studentId);
      return [
        a.date,
        s?.name || 'Siswa Terhapus',
        s?.nisn || '-',
        classes.find(c => c.id === a.classId)?.name || a.classId,
        a.status,
        a.notes || '',
        a.recordedBy
      ];
    });
    if (format === 'excel') {
      downloadExcel('rekap_log_kehadiran_global.xlsx', headers, rows, 'Kehadiran Global');
      setSuccessMsg('Berhasil mengunduh Log Kehadiran Global (Excel)!');
    } else {
      printTablePDF('Rekapitulasi Kehadiran Siswa Global', headers, rows);
      setSuccessMsg('Dokumen Kehadiran Global berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportPelanggaran = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Nama Siswa", "Kelas", "Pelanggaran", "Poin Pelanggaran", "Kategori", "Catatan Kejadian", "Pencatat"];
    const rows = violations.map(v => {
      const s = students.find(std => std.id === v.studentId);
      const t = violationTypes.find(vt => vt.id === v.violationTypeId);
      return [
        v.date,
        s?.name || 'Siswa Terhapus',
        classes.find(c => c.id === s?.classId)?.name || '-',
        t?.name || 'Pelanggaran Khusus',
        v.points,
        t?.category || '-',
        v.notes || '',
        v.recordedBy
      ];
    });
    if (format === 'excel') {
      downloadExcel('rekap_laporan_pelanggaran_global.xlsx', headers, rows, 'Pelanggaran Global');
      setSuccessMsg('Berhasil mengunduh Laporan Pelanggaran Global (Excel)!');
    } else {
      printTablePDF('Rekapitulasi Pelanggaran Kedisiplinan Siswa Global', headers, rows);
      setSuccessMsg('Dokumen Pelanggaran Global berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportKustom = (format: 'excel' | 'pdf') => {
    const selectedClassObj = classes.find(c => c.id === rekapClassId);
    const classNameText = selectedClassObj ? selectedClassObj.name : "Semua Kelas";
    const subjectText = rekapSubject === 'all' ? "Semua Mapel" : rekapSubject;

    if (rekapReportType === 'presensi') {
      const filteredAttendance = attendance.filter(a => {
        const student = students.find(s => s.id === a.studentId);
        if (!student) return false;
        if (rekapClassId !== 'all' && student.classId !== rekapClassId) return false;
        if (rekapStartDate && a.date < rekapStartDate) return false;
        if (rekapEndDate && a.date > rekapEndDate) return false;
        return true;
      });

      const headers = ["Tahun Pelajaran", "Tanggal", "Nama Siswa", "NISN", "Kelas", "Status Kehadiran", "Catatan Khusus", "Pencatat"];
      const rows = filteredAttendance.map(a => {
        const s = students.find(std => std.id === a.studentId);
        const sClass = classes.find(c => c.id === s?.classId);
        return [
          rekapTahunPelajaran,
          a.date,
          s?.name || 'Siswa Terhapus',
          s?.nisn || '-',
          sClass?.name || '-',
          a.status,
          a.notes || '',
          a.recordedBy
        ];
      });

      if (format === 'excel') {
        downloadExcel(`rekap_kehadiran_${classNameText.replace(/\s+/g, '_')}_TP_${rekapTahunPelajaran.replace(/\s+|\//g, '_')}.xlsx`, headers, rows, 'Presensi');
        setSuccessMsg(`Berhasil mengunduh Rekap Presensi Kustom (Excel)!`);
      } else {
        printTablePDF(`Rekap Presensi - ${classNameText} (TP: ${rekapTahunPelajaran})`, headers, rows);
        setSuccessMsg(`Rekap Presensi Kustom berhasil dicetak / disimpan ke PDF!`);
      }
    }

    else if (rekapReportType === 'pelanggaran') {
      const filteredViolations = violations.filter(v => {
        const student = students.find(s => s.id === v.studentId);
        if (!student) return false;
        if (rekapClassId !== 'all' && student.classId !== rekapClassId) return false;
        if (rekapStartDate && v.date < rekapStartDate) return false;
        if (rekapEndDate && v.date > rekapEndDate) return false;
        return true;
      });

      const headers = ["Tahun Pelajaran", "Tanggal", "Nama Siswa", "Kelas", "Jenis Pelanggaran", "Poin", "Kategori", "Catatan Kejadian", "Pencatat"];
      const rows = filteredViolations.map(v => {
        const s = students.find(std => std.id === v.studentId);
        const sClass = classes.find(c => c.id === s?.classId);
        const type = violationTypes.find(vt => vt.id === v.violationTypeId);
        return [
          rekapTahunPelajaran,
          v.date,
          s?.name || 'Siswa Terhapus',
          sClass?.name || '-',
          type?.name || 'Pelanggaran Khusus',
          v.points,
          type?.category || '-',
          v.notes || '',
          v.recordedBy
        ];
      });

      if (format === 'excel') {
        downloadExcel(`rekap_pelanggaran_${classNameText.replace(/\s+/g, '_')}_TP_${rekapTahunPelajaran.replace(/\s+|\//g, '_')}.xlsx`, headers, rows, 'Kedisiplinan');
        setSuccessMsg(`Berhasil mengunduh Rekap Pelanggaran Kustom (Excel)!`);
      } else {
        printTablePDF(`Rekap Catatan Pelanggaran - ${classNameText} (TP: ${rekapTahunPelajaran})`, headers, rows);
        setSuccessMsg(`Rekap Pelanggaran Kustom berhasil dicetak / disimpan ke PDF!`);
      }
    }

    else if (rekapReportType === 'cbt_grade') {
      const filteredGrades = examGrades.filter(g => {
        const student = students.find(s => s.id === g.studentId);
        if (!student) return false;
        if (rekapClassId !== 'all' && student.classId !== rekapClassId) return false;
        if (rekapSubject !== 'all' && g.subject !== rekapSubject) return false;
        if (rekapStartDate && g.date < rekapStartDate) return false;
        if (rekapEndDate && g.date > rekapEndDate) return false;
        return true;
      });

      const headers = ["Tahun Pelajaran", "Tanggal Ujian", "Nama Siswa", "Kelas", "Mata Pelajaran", "Jenis Ujian", "Skor CBT", "Status Kriteria"];
      const rows = filteredGrades.map(g => {
        const s = students.find(std => std.id === g.studentId);
        const sClass = classes.find(c => c.id === s?.classId);
        return [
          rekapTahunPelajaran,
          g.date,
          s?.name || 'Siswa Terhapus',
          sClass?.name || '-',
          g.subject,
          g.examType,
          g.score,
          g.status
        ];
      });

      if (format === 'excel') {
        downloadExcel(`rekap_nilai_cbt_${classNameText.replace(/\s+/g, '_')}_${subjectText.replace(/\s+/g, '_')}_TP_${rekapTahunPelajaran.replace(/\s+|\//g, '_')}.xlsx`, headers, rows, 'Nilai CBT');
        setSuccessMsg(`Berhasil mengunduh Rekap Nilai CBT Kustom (Excel)!`);
      } else {
        printTablePDF(`Rekap Nilai CBT ${subjectText} - ${classNameText} (TP: ${rekapTahunPelajaran})`, headers, rows);
        setSuccessMsg(`Rekap Nilai CBT Kustom berhasil dicetak / disimpan ke PDF!`);
      }
    }

    else if (rekapReportType === 'kolektif') {
      const targetStudents = students.filter(s => {
        if (rekapClassId !== 'all' && s.classId !== rekapClassId) return false;
        return true;
      });

      const headers = [
        "Tahun Pelajaran", 
        "NISN", 
        "Nama Siswa", 
        "Kelas", 
        `Rata-rata Ujian (${subjectText})`, 
        "Hadir (Hari)", 
        "Sakit/Izin (Hari)", 
        "Alpa (Hari)", 
        "Persentase Kehadiran", 
        "Total Poin Pelanggaran", 
        "Predikat Kelakuan"
      ];

      const rows = targetStudents.map(s => {
        const sClass = classes.find(c => c.id === s.classId);
        
        const sGrades = examGrades.filter(g => {
          if (g.studentId !== s.id) return false;
          if (rekapSubject !== 'all' && g.subject !== rekapSubject) return false;
          return true;
        });
        const avgGrade = sGrades.length > 0 ? Math.round(sGrades.reduce((sum, curr) => sum + curr.score, 0) / sGrades.length) : '-';

        const sAttendance = attendance.filter(a => a.studentId === s.id);
        const countHadir = sAttendance.filter(a => a.status === 'Hadir').length;
        const countSakitIzin = sAttendance.filter(a => a.status === 'Sakit' || a.status === 'Izin').length;
        const countAlpa = sAttendance.filter(a => a.status === 'Alpa').length;
        const totalLog = sAttendance.length;
        const pctAttendance = totalLog > 0 ? `${Math.round((countHadir / totalLog) * 100)}%` : '100%';

        const sViolations = violations.filter(v => v.studentId === s.id);
        const totalPoints = sViolations.reduce((sum, curr) => sum + curr.points, 0);

        let conduct = "Sangat Baik";
        if (totalPoints >= 50) conduct = "Sangat Kurang (Perlu BK)";
        else if (totalPoints >= 30) conduct = "Cukup (Pemantauan Wali)";
        else if (totalPoints >= 15) conduct = "Baik (Peringatan Ringan)";

        return [
          rekapTahunPelajaran,
          s.nisn,
          s.name,
          sClass?.name || '-',
          avgGrade,
          countHadir,
          countSakitIzin,
          countAlpa,
          pctAttendance,
          totalPoints,
          conduct
        ];
      });

      if (format === 'excel') {
        downloadExcel(`rekap_kolektif_${classNameText.replace(/\s+/g, '_')}_TP_${rekapTahunPelajaran.replace(/\s+|\//g, '_')}.xlsx`, headers, rows, 'Kolektif Kelas');
        setSuccessMsg(`Berhasil mengunduh Rekapitulasi Kolektif Kelas (Excel)!`);
      } else {
        printTablePDF(`Rekapitulasi Rapor Kolektif Kelas - ${classNameText} (TP: ${rekapTahunPelajaran})`, headers, rows);
        setSuccessMsg(`Rekapitulasi Kolektif Kelas berhasil dicetak / disimpan ke PDF!`);
      }
    }

    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-purple-100 text-xs font-semibold uppercase tracking-wider">Super Administrator & Kepala Sekolah</p>
            <h1 className="text-2xl font-bold">Panel Kontrol Pusat Administrasi</h1>
            <p className="text-purple-100 text-sm">Kelola semua entitas data sekolah, wali kelas, guru, siswa, dan konfigurasi database.</p>
          </div>
          <span className="bg-white/15 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-semibold shrink-0">
            Sistem: Terintegrasi 100%
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full space-y-6">
          {/* Global Search Bar */}
          {(activeTab === 'siswa' || activeTab === 'guru') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={activeTab === 'siswa' ? "Cari siswa instan berdasarkan Nama, NISN, Kelas, Guru Wali, Nama Ortu..." : "Cari pendidik instan berdasarkan Nama, NIP, Email, Jabatan (BK/Piket/Wali Kelas)..."}
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/25 focus:border-purple-600 focus:bg-white transition-all text-slate-800"
                />
              </div>
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="w-full sm:w-auto text-xs text-rose-600 font-bold hover:underline cursor-pointer px-4 py-2.5 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200/40 text-center"
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          )}

          {/* TAB CONTENTS */}
          <div className="w-full">
        {/* METRICS SUMMARY */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6">
            {onSwitchRole && (
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-200 animate-spin-slow" />
                    <span>Pindah Akses Cepat (Quick Access Switcher)</span>
                  </h4>
                  <p className="text-[11px] text-purple-100">Beralih peran dan akun simulasi secara instan tanpa log out untuk menguji alur kerja pendidik.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-slate-800 text-xs w-full md:w-auto">
                  <select
                    className="bg-white border rounded-lg px-3 py-1.5 font-bold outline-none cursor-pointer w-full md:w-64 text-slate-700 shadow-sm"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const [role, teacherId] = val.split(':');
                      const targetTeacher = teachers.find(t => t.id === teacherId);
                      if (targetTeacher) {
                        onSwitchRole(role as any, targetTeacher);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled className="text-slate-400">-- Pilih Akses Simulasi --</option>
                    <optgroup label="Peran Guru Mapel">
                      {teachers.filter(t => t.roles?.includes('guru') || t.role === 'guru').map(t => (
                        <option key={`guru:${t.id}`} value={`guru:${t.id}`}>Guru Mapel: {t.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Peran Wali Kelas">
                      {teachers.filter(t => t.roles?.includes('wali_kelas') || t.role === 'wali_kelas').map(t => (
                        <option key={`wali_kelas:${t.id}`} value={`wali_kelas:${t.id}`}>Wali Kelas: {t.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Peran Guru Wali (Mentorship)">
                      {teachers.filter(t => t.roles?.includes('guru_wali') || t.role === 'guru_wali').map(t => (
                        <option key={`guru_wali:${t.id}`} value={`guru_wali:${t.id}`}>Guru Wali: {t.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Peran Guru BK">
                      {teachers.filter(t => t.roles?.includes('bk') || t.role === 'bk').map(t => (
                        <option key={`bk:${t.id}`} value={`bk:${t.id}`}>Guru BK: {t.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Peran Tendik (Tata Usaha)">
                      {teachers.filter(t => t.roles?.includes('tendik') || t.role === 'tendik').map(t => (
                        <option key={`tendik:${t.id}`} value={`tendik:${t.id}`}>Tendik: {t.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )}

            {/* FIREBASE REALTIME CONNECTION STATUS CARD */}
            <div className="bg-white rounded-xl p-5 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl shrink-0 ${
                  dbStatus === 'online' ? 'bg-emerald-50 text-emerald-600' : dbStatus === 'high_latency' ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-rose-50 text-rose-600'
                }`}>
                  {dbStatus === 'online' ? <Wifi className="w-6 h-6" /> : dbStatus === 'high_latency' ? <RefreshCw className="w-6 h-6 animate-spin-slow" /> : <WifiOff className="w-6 h-6" />}
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-slate-800">Pemantau Realtime Database Firebase (Connection Monitor)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Memantau sinkronisasi sinkron-aktif dan latensi respon server secara instan.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-left md:text-right space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Status Database</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    dbStatus === 'online' ? 'bg-emerald-100 text-emerald-800' : dbStatus === 'high_latency' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      dbStatus === 'online' ? 'bg-emerald-500' : dbStatus === 'high_latency' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
                    }`} />
                    <span>{dbStatus === 'online' ? 'Terhubung (Online)' : dbStatus === 'high_latency' ? 'Koneksi Lambat' : 'Terputus (Offline)'}</span>
                  </span>
                </div>
                {dbStatus !== 'offline' && (
                  <div className="text-left md:text-right space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Latensi Ping</span>
                    <span className="font-mono text-xs font-bold text-slate-700">{dbLatency} ms</span>
                  </div>
                )}
                {lastSyncTime && (
                  <div className="text-left md:text-right space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Terakhir Sinkron</span>
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {Math.round((Date.now() - lastSyncTime) / 1000)} detik lalu
                    </span>
                  </div>
                )}
                {onReconnectDb && (
                  <button
                    onClick={onReconnectDb}
                    className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
                    title="Uji Ulang Koneksi"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border shadow-sm text-center">
                <span className="text-2xl font-bold text-slate-800 block">{totalStudents}</span>
                <span className="text-xs text-slate-400 font-bold uppercase mt-1 block">Total Siswa</span>
              </div>
              <div className="bg-white rounded-xl p-5 border shadow-sm text-center">
                <span className="text-2xl font-bold text-slate-800 block">{totalTeachers}</span>
                <span className="text-xs text-slate-400 font-bold uppercase mt-1 block">Total Pendidik</span>
              </div>
              <div className="bg-white rounded-xl p-5 border shadow-sm text-center">
                <span className="text-2xl font-bold text-slate-800 block">{avgAttendance}%</span>
                <span className="text-xs text-slate-400 font-bold uppercase mt-1 block">Rata Presensi</span>
              </div>
              <div className="bg-white rounded-xl p-5 border shadow-sm text-center">
                <span className="text-2xl font-bold text-rose-600 block">{totalViolationsCount}</span>
                <span className="text-xs text-slate-400 font-bold uppercase mt-1 block">Total Pelanggaran</span>
              </div>
            </div>

            {/* Quick overview graphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Distribusi Kelas & Siswa</h3>
                <div className="space-y-3">
                  {classes.map((cls) => {
                    const count = students.filter(s => s.classId === cls.id).length;
                    const percent = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                    return (
                      <div key={cls.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-600">
                          <span>{cls.name} (Homeroom: {teachers.find(t => t.id === cls.homeroomTeacherId)?.name})</span>
                          <span>{count} Siswa ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-purple-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Pelanggaran Berdasarkan Kategori</h3>
                <div className="space-y-3">
                  {['Berat', 'Sedang', 'Ringan'].map((cat) => {
                    // count total violations of this category
                    const count = violations.filter(v => {
                      const type = violationTypes.find(vt => vt.id === v.violationTypeId);
                      return type?.category === cat;
                    }).length;
                    const percent = totalViolationsCount > 0 ? Math.round((count / totalViolationsCount) * 100) : 0;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-600">
                          <span>Kategori {cat}</span>
                          <span>{count} Kejadian ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            cat === 'Berat' ? 'bg-rose-600' :
                            cat === 'Sedang' ? 'bg-amber-500' : 'bg-slate-400'
                          }`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Download & Export Section */}
            <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b pb-3">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Pusat Unduh Rekapan Data & Laporan</h3>
                  <p className="text-xs text-slate-500">Ekspor basis data sekolah terpadu atau rekap kustom ke format Excel (.xlsx) atau PDF (.pdf).</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Unduh Cepat Database Utama (Global)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Database Siswa */}
                  <div className="flex flex-col justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-xl transition-all hover:bg-purple-50 font-semibold text-slate-700">
                    <div className="space-y-1 mb-3">
                      <span className="text-xs font-bold text-purple-700 block">Database Siswa</span>
                      <span className="text-[10px] text-slate-400 block">{totalStudents} data terdaftar</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportSiswa('excel')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        onClick={() => handleExportSiswa('pdf')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-200/80 hover:border-rose-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileText className="w-3 h-3 text-rose-500" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Database Pendidik */}
                  <div className="flex flex-col justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl transition-all hover:bg-indigo-50 font-semibold text-slate-700">
                    <div className="space-y-1 mb-3">
                      <span className="text-xs font-bold text-indigo-700 block">Database Pendidik</span>
                      <span className="text-[10px] text-slate-400 block">{totalTeachers} guru & staf</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportGuru('excel')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        onClick={() => handleExportGuru('pdf')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-200/80 hover:border-rose-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileText className="w-3 h-3 text-rose-500" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Rekap Presensi */}
                  <div className="flex flex-col justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl transition-all hover:bg-emerald-50 font-semibold text-slate-700">
                    <div className="space-y-1 mb-3">
                      <span className="text-xs font-bold text-emerald-700 block">Rekap Presensi</span>
                      <span className="text-[10px] text-slate-400 block">{totalRecordedAttendance} entri log</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportAbsensi('excel')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        onClick={() => handleExportAbsensi('pdf')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-200/80 hover:border-rose-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileText className="w-3 h-3 text-rose-500" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Laporan Pelanggaran */}
                  <div className="flex flex-col justify-between p-4 bg-rose-50/50 border border-rose-100 rounded-xl transition-all hover:bg-rose-50 font-semibold text-slate-700">
                    <div className="space-y-1 mb-3">
                      <span className="text-xs font-bold text-rose-700 block">Laporan Pelanggaran</span>
                      <span className="text-[10px] text-slate-400 block">{totalViolationsCount} pelanggaran</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportPelanggaran('excel')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                      <button
                        onClick={() => handleExportPelanggaran('pdf')}
                        className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-200/80 hover:border-rose-300 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <FileText className="w-3 h-3 text-rose-500" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Filter Section */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4.5 h-4.5 text-purple-600" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Opsi Rekap Kustom (Sesuaikan Kriteria)</h4>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    Saringan Aktif
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs font-semibold text-slate-700">
                  {/* Select Kelas */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Saring Kelas:</label>
                    <select
                      value={rekapClassId}
                      onChange={(e) => setRekapClassId(e.target.value)}
                      className="w-full text-xs bg-white text-slate-700 px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-xs"
                    >
                      <option value="all">Semua Kelas</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Tahun Pelajaran */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Tahun Pelajaran:</label>
                    <select
                      value={rekapTahunPelajaran}
                      onChange={(e) => setRekapTahunPelajaran(e.target.value)}
                      className="w-full text-xs bg-white text-slate-700 px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-xs"
                    >
                      <option value="2025/2026 Ganjil">2025/2026 - Ganjil</option>
                      <option value="2025/2026 Genap">2025/2026 - Genap</option>
                      <option value="2026/2027 Ganjil">2026/2027 - Ganjil</option>
                      <option value="2026/2027 Genap">2026/2027 - Genap</option>
                    </select>
                  </div>

                  {/* Filter Tanggal Mulai */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Dari Tanggal:</label>
                    <input
                      type="date"
                      value={rekapStartDate}
                      onChange={(e) => setRekapStartDate(e.target.value)}
                      className="w-full text-xs bg-white text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-xs"
                    />
                  </div>

                  {/* Filter Tanggal Selesai */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Sampai Tanggal:</label>
                    <input
                      type="date"
                      value={rekapEndDate}
                      onChange={(e) => setRekapEndDate(e.target.value)}
                      className="w-full text-xs bg-white text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-xs"
                    />
                  </div>

                  {/* Select Mata Pelajaran */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Mata Pelajaran:</label>
                    <select
                      value={rekapSubject}
                      onChange={(e) => setRekapSubject(e.target.value)}
                      className="w-full text-xs bg-white text-slate-700 px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-xs"
                    >
                      <option value="all">Semua Mata Pelajaran</option>
                      <option value="Pendidikan Agama dan Budi Pekerti">Pendidikan Agama</option>
                      <option value="Pendidikan Pancasila">Pancasila</option>
                      <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                      <option value="Matematika">Matematika</option>
                      <option value="Ilmu Pengetahuan Alam (IPA)">IPA</option>
                      <option value="Ilmu Pengetahuan Sosial (IPS)">IPS</option>
                      <option value="Bahasa Inggris">Bahasa Inggris</option>
                      <option value="Informatika">Informatika</option>
                      <option value="Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)">PJOK</option>
                      <option value="Seni dan Prakarya">Seni &amp; Prakarya</option>
                    </select>
                  </div>

                  {/* Select Tipe Laporan */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Model Laporan:</label>
                    <select
                      value={rekapReportType}
                      onChange={(e) => setRekapReportType(e.target.value as any)}
                      className="w-full text-xs bg-white text-slate-700 px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-xs"
                    >
                      <option value="kolektif">1. Rapor Kolektif Kelas</option>
                      <option value="presensi">2. Jurnal Presensi</option>
                      <option value="pelanggaran">3. Poin Kedisiplinan</option>
                      <option value="cbt_grade">4. Rapor Ujian CBT</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 max-w-xl text-[11px] leading-relaxed font-medium">
                    {rekapReportType === 'kolektif' && (
                      <p>✨ <strong>Model Kolektif</strong>: Menggabungkan profil siswa, nilai rata-rata ujian CBT, persentase kehadiran (Hadir/Sakit/Izin/Alpa), total poin pelanggaran, serta predikat kelakuan otomatis dalam satu sheet excel yang rapi.</p>
                    )}
                    {rekapReportType === 'presensi' && (
                      <p>✨ <strong>Model Presensi</strong>: Mengunduh seluruh riwayat absensi log harian kelas terpilih sesuai filter tahun pelajaran.</p>
                    )}
                    {rekapReportType === 'pelanggaran' && (
                      <p>✨ <strong>Model Kedisiplinan</strong>: Mengunduh seluruh rincian insiden pelanggaran tata tertib, nama pencatat, jenis, poin, dan kategori.</p>
                    )}
                    {rekapReportType === 'cbt_grade' && (
                      <p>✨ <strong>Model Nilai CBT</strong>: Mengunduh seluruh hasil skor tes siswa pada mata pelajaran terpilih.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleExportKustom('excel')}
                      className="flex items-center justify-center gap-1 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-300 py-1.5 px-3 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unduh Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportKustom('pdf')}
                      className="flex items-center justify-center gap-1 bg-white hover:bg-rose-50 text-rose-800 hover:text-rose-700 border border-slate-200/80 hover:border-rose-300 py-1.5 px-3 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                      <span>Cetak PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MANAGE STUDENTS */}
        {activeTab === 'siswa' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-lg">
                Manajemen Database Siswa {globalSearch && <span className="text-purple-600 text-xs">({filteredStudents.length} cocok)</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowStudentBatch(!showStudentBatch)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload Batch Excel/CSV
                </button>
                <button
                  onClick={() => {
                    setIsAddingStudent(!isAddingStudent);
                    setEditingStudentId(null);
                    resetStudentForm();
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Registrasi Siswa Baru
                </button>
              </div>
            </div>

            {showStudentBatch && (
              <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-4 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Registrasi Massal Siswa via File Excel/CSV</h4>
                    <p className="text-indigo-700 mt-1">Gunakan fitur ini untuk mendaftarkan banyak siswa sekaligus dari file spreadsheet Excel atau CSV.</p>
                  </div>
                  <button
                    onClick={downloadStudentTemplate}
                    className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg font-bold shadow-sm cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Format Excel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-indigo-100/50">
                  <div className="space-y-1.5 text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700 block text-xs">Petunjuk Kolom Excel/CSV:</span>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Nama</strong>: Nama lengkap siswa (Contoh: Budi Susanto)</li>
                      <li><strong>NISN</strong>: Nomor Induk Siswa Nasional (10 digit angka)</li>
                      <li><strong>ID_Kelas</strong>: ID kelas, misalnya: <code>Kelas 7A</code>, <code>Kelas 8B</code></li>
                      <li><strong>Jenis_Kelamin</strong>: <code>Laki-laki</code> atau <code>Perempuan</code></li>
                      <li><strong>Alamat</strong>: Alamat rumah siswa</li>
                      <li><strong>HP_Siswa</strong>: Nomor WhatsApp/HP siswa</li>
                      <li><strong>Nama_Orang_Tua</strong>, <strong>HP_Orang_Tua</strong> (Sebagai ID masuk login), <strong>Email_Orang_Tua</strong></li>
                      <li><strong>ID_Guru_Wali</strong>: ID guru pendamping (opsional)</li>
                    </ul>
                  </div>
                  <div className="space-y-3 flex flex-col justify-center">
                    <label className="block font-bold text-slate-700 text-xs">Pilih File Excel/CSV:</label>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleStudentCSVUpload}
                      className="block w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">Pastikan baris pertama berisi nama kolom persis seperti template format.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Student Registration Form */}
            {isAddingStudent && (
              <form id="student-form-container" onSubmit={handleStudentSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 transition-all">
                <h4 className="font-bold text-slate-800 text-sm">{editingStudentId ? 'Edit Data Siswa' : 'Formulir Siswa Baru'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Nama Siswa</label>
                    <input
                      type="text"
                      required
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">NISN (10 Digit)</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={studentForm.nisn}
                      onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Kelas</label>
                    <select
                      value={studentForm.classId}
                      onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Jenis Kelamin</label>
                    <select
                      value={studentForm.gender}
                      onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">HP Siswa</label>
                    <input
                      type="text"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Nama Orang Tua</label>
                    <input
                      type="text"
                      required
                      value={studentForm.parentName}
                      onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">HP Orang Tua</label>
                    <input
                      type="text"
                      required
                      value={studentForm.parentPhone}
                      onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Email Orang Tua</label>
                    <input
                      type="email"
                      required
                      value={studentForm.parentEmail}
                      onChange={(e) => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Alamat Rumah</label>
                    <input
                      type="text"
                      value={studentForm.address}
                      onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Guru Wali (Pendamping)</label>
                    <select
                      value={studentForm.guruWaliTeacherId || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, guruWaliTeacherId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    >
                      <option value="">-- Tanpa Guru Wali --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.role === 'guru' ? 'Guru' : t.role.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Kata Sandi Siswa (Opsional)</label>
                    <input
                      type="password"
                      placeholder="Bawaan: siswa123 / NISN"
                      value={studentForm.password || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Kata Sandi Orang Tua (Opsional)</label>
                    <input
                      type="password"
                      placeholder="Bawaan: ortu123 / NIK"
                      value={studentForm.parentPassword || ''}
                      onChange={(e) => setStudentForm({ ...studentForm, parentPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingStudent(false)}
                    className="px-4 py-2 border rounded-lg text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-5 py-2 rounded-lg text-xs font-bold"
                  >
                    {editingStudentId ? 'Simpan Siswa' : 'Tambah Siswa'}
                  </button>
                </div>
              </form>
            )}

            {/* Students Table */}
            <div className="border rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[1000px]">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">NISN</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Sandi Siswa</th>
                    <th className="p-3">Sandi Ortu</th>
                    <th className="p-3">Guru Wali</th>
                    <th className="p-3">Wali Murid (Kontak)</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold italic bg-slate-50/20">
                        Tidak ada data siswa yang cocok dengan pencarian "{globalSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            (s.gender || 'Laki-laki').toLowerCase() === 'perempuan'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {(s.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500">{s.nisn}</td>
                      <td className="p-3 text-xs font-semibold text-slate-700">{getSchoolClassName(s.classId, classes)}</td>
                      <td className="p-3 font-mono text-xs text-indigo-600 font-bold">
                        {s.password || 'siswa123'}
                      </td>
                      <td className="p-3 font-mono text-xs text-teal-600 font-bold">
                        {s.parentPassword || 'ortu123'}
                      </td>
                      <td className="p-3 text-xs">
                        {teachers.find(t => t.id === s.guruWaliTeacherId)?.name || <span className="text-slate-400 italic">Belum diatur</span>}
                      </td>
                      <td className="p-3">
                        <p className="text-xs font-semibold">{s.parentName}</p>
                        <p className="text-[10px] text-slate-400">{s.parentPhone}</p>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingStudentId(s.id);
                              setStudentForm({ ...s });
                              setIsAddingStudent(true);
                              setTimeout(() => {
                                const el = document.getElementById('student-form-container');
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('ring-4', 'ring-indigo-400');
                                  setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-400'), 2000);
                                }
                              }, 100);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Data Siswa & Orang Tua"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              triggerConfirm(
                                'Hapus Data Siswa',
                                `Yakin ingin menghapus siswa ${s.name}? Tindakan ini permanen.`,
                                () => onDeleteStudent(s.id)
                              );
                            }}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MANAGE TEACHERS */}
        {activeTab === 'guru' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-lg">
                Manajemen Tenaga Pendidik / Staf {globalSearch && <span className="text-purple-600 text-xs">({filteredTeachers.length} cocok)</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowTeacherBatch(!showTeacherBatch)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload Batch Excel/CSV
                </button>
                <button
                  onClick={() => {
                    setIsAddingTeacher(!isAddingTeacher);
                    setEditingTeacherId(null);
                    setTeacherForm({ name: '', nip: '', email: '', role: 'guru', roles: ['guru'], classId: '' });
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Registrasi Guru / Staf Baru
                </button>
              </div>
            </div>

            {showTeacherBatch && (
              <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-4 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Registrasi Massal Pendidik via File Excel/CSV</h4>
                    <p className="text-indigo-700 mt-1">Gunakan fitur ini untuk mendaftarkan banyak guru/staf sekaligus dari file spreadsheet Excel atau CSV.</p>
                  </div>
                  <button
                    onClick={downloadTeacherTemplate}
                    className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg font-bold shadow-sm cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Format Excel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-indigo-100/50">
                  <div className="space-y-1.5 text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700 block text-xs">Petunjuk Kolom Excel/CSV:</span>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Nama</strong>: Nama lengkap pendidik dengan gelar (Contoh: Drs. Wahyu Hidayat)</li>
                      <li><strong>NIP</strong>: Nomor Induk Pegawai (18 digit angka)</li>
                      <li><strong>Email</strong>: Alamat email resmi pendidik</li>
                      <li><strong>Peran</strong>: Peran utama, misalnya: <code>guru</code>, <code>bk</code>, <code>piket</code>, <code>wali_kelas</code></li>
                      <li><strong>ID_Kelas</strong>: ID kelas binaan (misalnya: <code>Kelas 7A</code>) (opsional, untuk wali kelas)</li>
                    </ul>
                  </div>
                  <div className="space-y-3 flex flex-col justify-center">
                    <label className="block font-bold text-slate-700 text-xs">Pilih File Excel/CSV:</label>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleTeacherCSVUpload}
                      className="block w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">Pastikan baris pertama berisi nama kolom persis seperti template format.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Form */}
            {isAddingTeacher && (
              <form id="teacher-form-container" onSubmit={handleTeacherSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 transition-all">
                <h4 className="font-bold text-slate-800 text-sm">{editingTeacherId ? 'Edit Data Pendidik' : 'Formulir Pendidik Baru'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Nama Pendidik & Gelar</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">NIP (18 Digit)</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.nip}
                      onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Email Sekolah</label>
                    <input
                      type="email"
                      required
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 font-semibold mb-2">
                      Tugas / Jabatan Sistem (Satu guru bisa memegang 2 sampai 3 peran sekaligus) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 border rounded-xl">
                      {[
                        { val: 'guru', label: 'Guru Mata Pelajaran' },
                        { val: 'wali_kelas', label: 'Wali Kelas (Homeroom)' },
                        { val: 'bk', label: 'Guru BK / Konseling' },
                        { val: 'piket', label: 'Guru Piket Harian' },
                        { val: 'admin', label: 'Administrator / Kepsek' },
                        { val: 'guru_wali', label: 'Guru Wali (Mentorship)' },
                        { val: 'tendik', label: 'Tendik (Tenaga Kependidikan / TU)' }
                      ].map((rItem) => {
                        const currentRoles = teacherForm.roles || [teacherForm.role];
                        const isChecked = currentRoles.includes(rItem.val as any);
                        return (
                          <label key={rItem.val} className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-all ${isChecked ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-bold shadow-sm' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleRoleToggle(rItem.val as any)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <span>{rItem.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Mata Pelajaran / Tugas</label>
                    <input
                      type="text"
                      placeholder="Contoh: Matematika (Guru) / Kepala TU, Sekretaris, Bendahara, Caraka, Satpam (Tendik)"
                      value={teacherForm.subject || ''}
                      onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tugas digunakan untuk mengklasifikasikan Tendik (Kepala TU, Sekretaris, Bendahara, Caraka, Satpam, dll.) atau Mata Pelajaran bagi Guru.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-1">Kata Sandi (Opsional)</label>
                    <input
                      type="password"
                      placeholder="Bawaan: guru123 / admin123 / NIP"
                      value={teacherForm.password || ''}
                      onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                      className="w-full px-3 py-2 bg-white border rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTeacher(false)}
                    className="px-4 py-2 border rounded-lg text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-5 py-2 rounded-lg text-xs font-bold"
                  >
                    {editingTeacherId ? 'Simpan Pendidik' : 'Tambah Pendidik'}
                  </button>
                </div>
              </form>
            )}

            {/* Teachers Table */}
            <div className="border rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[1000px]">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Nama Lengkap</th>
                    <th className="p-3">NIP</th>
                    <th className="p-3">Jabatan Portal</th>
                    <th className="p-3">Mata Pelajaran / Tugas</th>
                    <th className="p-3">Kata Sandi</th>
                    <th className="p-3">Email Sekolah</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold italic bg-slate-50/20">
                        Tidak ada data pendidik yang cocok dengan pencarian "{globalSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{t.name}</td>
                      <td className="p-3 font-mono text-xs text-slate-500">{t.nip}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(t.roles && t.roles.length > 0 ? t.roles : [t.role]).map((r) => (
                            <span key={r} className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-sm ${
                              r === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              r === 'guru_wali' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                              r === 'wali_kelas' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              r === 'bk' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              r === 'piket' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              r === 'tendik' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                              'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {r === 'guru_wali' ? 'Guru Wali' : r === 'tendik' ? 'Tendik / TU' : r.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-600 text-xs">{t.subject || <span className="text-slate-300 italic">Belum diatur</span>}</td>
                      <td className="p-3 font-mono text-xs text-indigo-600 font-bold">
                        {t.password || (t.role === 'admin' ? 'admin123' : 'guru123')}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-400">{t.email}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingTeacherId(t.id);
                              setTeacherForm({ ...t });
                              setIsAddingTeacher(true);
                              setTimeout(() => {
                                const el = document.getElementById('teacher-form-container');
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('ring-4', 'ring-indigo-400');
                                  setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-400'), 2000);
                                }
                              }, 100);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Data Pendidik"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              triggerConfirm(
                                'Hapus Data Pendidik',
                                `Yakin ingin menghapus pendidik ${t.name}? Tindakan ini permanen.`,
                                () => onDeleteTeacher(t.id)
                              );
                            }}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATABASE SETTINGS */}
        {activeTab === 'database-settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800">Daftar Kelas Aktif</h4>
                <button
                  onClick={() => setIsAddingClass(!isAddingClass)}
                  className="bg-purple-600 text-white px-2.5 py-1 rounded-md text-xs"
                >
                  + Tambah Kelas
                </button>
              </div>

              {isAddingClass && (
                <form onSubmit={handleClassSubmit} className="bg-slate-50 p-3 rounded-lg border text-xs space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Nama Kelas (misal: Kelas VIII-C)"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border rounded"
                  />
                  <select
                    value={classForm.homeroomTeacherId}
                    onChange={(e) => setClassForm({ ...classForm, homeroomTeacherId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border rounded"
                  >
                    <option value="">-- Pilih Wali Kelas --</option>
                    {teachers.filter(t => t.role !== 'admin').map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.role.toUpperCase()})</option>
                    ))}
                  </select>
                  <button type="submit" className="w-full bg-purple-600 text-white py-1 rounded font-bold">Simpan Kelas</button>
                </form>
              )}

              <div className="divide-y">
                {classes.map((cls) => {
                  const teacher = teachers.find(t => t.id === cls.homeroomTeacherId);
                  const isEditing = editingClassId === cls.id;
                  return (
                    <div key={cls.id} className="py-2.5 flex justify-between text-xs items-center gap-2">
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-semibold text-slate-800 shrink-0">{cls.name}</span>
                          <select
                            value={editingHomeroomTeacherId}
                            onChange={(e) => setEditingHomeroomTeacherId(e.target.value)}
                            className="flex-1 text-[11px] px-2 py-1 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Tidak ada Wali Kelas</option>
                            {teachers.filter(t => t.role !== 'admin').map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.role.toUpperCase()})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (onUpdateClass) {
                                onUpdateClass({
                                  ...cls,
                                  homeroomTeacherId: editingHomeroomTeacherId || undefined
                                });
                              }
                              setEditingClassId(null);
                            }}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1 rounded cursor-pointer"
                            title="Simpan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingClassId(null)}
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded text-[10px] cursor-pointer font-medium"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-semibold text-slate-800">{cls.name}</p>
                            <p className="text-[10px] text-slate-400">Wali: {teacher?.name || 'Tidak ada'}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingClassId(cls.id);
                                setEditingHomeroomTeacherId(cls.homeroomTeacherId || '');
                              }}
                              className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 cursor-pointer"
                              title="Ubah Wali Kelas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                triggerConfirm(
                                  'Hapus Kelas',
                                  `Yakin ingin menghapus ${cls.name}? Tindakan ini dapat mempengaruhi data relasi siswa.`,
                                  () => onDeleteClass(cls.id)
                                );
                              }}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border space-y-4">
              <h4 className="font-bold text-slate-800 flex justify-between items-center">
                <span>Daftar Aturan Tata Tertib & Bobot Poin ({violationTypes.length})</span>
                <button
                  onClick={() => setIsAddingViolationType(!isAddingViolationType)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  + Tambah Aturan
                </button>
              </h4>

              {isAddingViolationType && (
                <form onSubmit={handleViolationTypeSubmit} className="bg-slate-50 p-3 rounded-lg border text-xs space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Nama Pelanggaran"
                    value={violationTypeForm.name}
                    onChange={(e) => setViolationTypeForm({ ...violationTypeForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border rounded"
                  />
                  <select
                    value={violationTypeForm.category}
                    onChange={(e) => setViolationTypeForm({ ...violationTypeForm, category: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-white border rounded"
                  >
                    <option value="Ringan">Ringan</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Berat">Berat</option>
                  </select>
                  <input
                    type="number"
                    required
                    placeholder="Beban Poin (contoh: 15)"
                    value={violationTypeForm.points}
                    onChange={(e) => setViolationTypeForm({ ...violationTypeForm, points: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border rounded"
                  />
                  <button type="submit" className="w-full bg-purple-600 text-white py-1.5 rounded-lg font-bold hover:bg-purple-700 transition-colors cursor-pointer">Simpan Aturan</button>
                </form>
              )}

              <div className="divide-y divide-slate-100 max-h-[500px] min-h-[220px] overflow-y-auto pr-2 pb-10 scrollbar-thin space-y-1">
                {violationTypes.map((vt) => (
                  <div key={vt.id} className="py-2.5 flex justify-between text-xs items-center gap-2 hover:bg-slate-50/90 px-2.5 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{vt.name}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        vt.category === 'Berat' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        vt.category === 'Sedang' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>{vt.category}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 text-xs">+{vt.points} Pts</span>
                      <button
                        onClick={() => {
                          triggerConfirm(
                            'Hapus Aturan Pelanggaran',
                            `Yakin ingin menghapus aturan pelanggaran: "${vt.name}"?`,
                            () => onDeleteViolationType(vt.id)
                          );
                        }}
                        className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Hapus Aturan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PENGATURAN JAM MASUK & POIN TERLAMBAT (BRIGHT & ELEGANT UI) */}
            <div className="md:col-span-2 bg-white rounded-2xl p-6 border-2 border-indigo-200/90 shadow-md space-y-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-indigo-100 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                      <span>Pengaturan Waktu Presensi & Sanksi Poin Terlambat</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                        ✓ Otomatis Presensi
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Konfigurasi jam batas masuk sekolah dan besaran sanksi poin terlambat yang di-input secara otomatis ke rekap poin siswa.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateSchoolTimeConfig) {
                      onUpdateSchoolTimeConfig({
                        schoolStartTime: localSchoolStartTime,
                        latePenaltyPoints: Number(localLatePenaltyPoints),
                        isLatePenaltyEnabled: localIsLatePenaltyEnabled
                      });
                      setSuccessMsg('Pengaturan Jam Masuk & Sanksi Poin Terlambat berhasil disimpan!');
                      setTimeout(() => setSuccessMsg(''), 4000);
                    }
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Simpan Jam Masuk & Poin</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs">
                {/* Jam Masuk */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                    Jam Masuk Sekolah (Batas Terlambat)
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={localSchoolStartTime}
                      onChange={(e) => setLocalSchoolStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border-2 border-indigo-200 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono font-black shadow-2xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Siswa yang presensi di atas jam <span className="font-black text-indigo-700">{localSchoolStartTime} WIB</span> otomatis ditandai <span className="text-rose-600 font-bold">Terlambat</span>.
                  </p>
                </div>

                {/* Besaran Poin */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                    Besaran Poin Terlambat (Sanksi)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={localLatePenaltyPoints}
                      onChange={(e) => setLocalLatePenaltyPoints(Number(e.target.value))}
                      className="w-full pl-4 pr-12 py-2.5 text-sm border-2 border-rose-200 bg-white text-rose-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-black shadow-2xs"
                    />
                    <span className="absolute right-3.5 top-3 text-xs font-black text-rose-500">Poin</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Poin sanksi terlambat dibuat terpisah & otomatis menambah <span className="font-black text-rose-700">Akumulasi Poin Pelanggaran</span>.
                  </p>
                </div>

                {/* Toggle Status */}
                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                    Status Otomatisasi Sanksi
                  </label>
                  <label className={`inline-flex items-center justify-center gap-3 cursor-pointer py-3 px-4 rounded-xl border-2 transition-all ${
                    localIsLatePenaltyEnabled 
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' 
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={localIsLatePenaltyEnabled}
                      onChange={(e) => setLocalIsLatePenaltyEnabled(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                    <span className="text-xs font-black tracking-wide">
                      {localIsLatePenaltyEnabled ? '✓ AKTIF (Poin Terinput Otomatis)' : '✗ NONAKTIF'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* LOGO KOP SURAT & NAMA KEPALA SEKOLAH */}
            <div className="md:col-span-2 bg-white rounded-xl p-5 border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Pengaturan Kop Surat & Dokumen Resmi Sekolah</h4>
                    <p className="text-[10px] text-slate-400">Atur Logo Kiri, Logo Kanan, teks identitas sekolah, serta data Kepala Sekolah. Perubahan akan langsung diaplikasikan ke seluruh cetakan dokumen/PDF sistem.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateHeadmasterName(headmasterName, undefined, undefined, {
                      nip: headmasterNipInput,
                      govTitle: govTitleInput,
                      deptTitle: deptTitleInput,
                      sudinTitle: sudinTitleInput,
                      schoolTitle: schoolTitleInput,
                      addressText: addressTextInput,
                      contactText: contactTextInput,
                      docNumber: docNumberInput
                    });
                    setSuccessMsg('Pengaturan Kop Surat & Nomor Dokumen berhasil disimpan & disinkronkan!');
                    setTimeout(() => setSuccessMsg(''), 4000);
                  }}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Kop Surat</span>
                </button>
              </div>

              {/* Grid Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo Kiri */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Logo Kiri (Logo Pemprov / Instansi Pembina)</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border bg-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <img
                        src={localStorage.getItem('siakad_logo_left') || '/logo-dki.png'}
                        alt="Logo Kiri Preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { e.currentTarget.src = '/logo-dki.png'; }}
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-2xs">
                        <Upload className="w-3 h-3 text-purple-600" />
                        <span>Upload Logo Kiri (PNG/JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                onUpdateHeadmasterName(headmasterName, reader.result as string, undefined, {
                                  nip: headmasterNipInput,
                                  govTitle: govTitleInput,
                                  deptTitle: deptTitleInput,
                                  sudinTitle: sudinTitleInput,
                                  schoolTitle: schoolTitleInput,
                                  addressText: addressTextInput,
                                  contactText: contactTextInput
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {localStorage.getItem('siakad_logo_left') && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateHeadmasterName(headmasterName, '', undefined, {
                              nip: headmasterNipInput,
                              govTitle: govTitleInput,
                              deptTitle: deptTitleInput,
                              sudinTitle: sudinTitleInput,
                              schoolTitle: schoolTitleInput,
                              addressText: addressTextInput,
                              contactText: contactTextInput
                            });
                          }}
                          className="block text-[9px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Reset ke Default Logo DKI
                        </button>
                      )}
                      <p className="text-[9px] text-slate-400">Rekomendasi rasio 1:1 format PNG transparan.</p>
                    </div>
                  </div>
                </div>

                {/* Logo Kanan */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Logo Kanan (Logo Resmi Sekolah / Yayasan)</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border bg-white flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                      <img
                        src={localStorage.getItem('siakad_logo_right') || '/logo.png'}
                        alt="Logo Kanan Preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-2xs">
                        <Upload className="w-3 h-3 text-purple-600" />
                        <span>Upload Logo Kanan (PNG/JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                onUpdateHeadmasterName(headmasterName, undefined, reader.result as string, {
                                  nip: headmasterNipInput,
                                  govTitle: govTitleInput,
                                  deptTitle: deptTitleInput,
                                  sudinTitle: sudinTitleInput,
                                  schoolTitle: schoolTitleInput,
                                  addressText: addressTextInput,
                                  contactText: contactTextInput
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {localStorage.getItem('siakad_logo_right') && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateHeadmasterName(headmasterName, undefined, '', {
                              nip: headmasterNipInput,
                              govTitle: govTitleInput,
                              deptTitle: deptTitleInput,
                              sudinTitle: sudinTitleInput,
                              schoolTitle: schoolTitleInput,
                              addressText: addressTextInput,
                              contactText: contactTextInput
                            });
                          }}
                          className="block text-[9px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Reset ke Default Logo Sekolah
                        </button>
                      )}
                      <p className="text-[9px] text-slate-400">Rekomendasi rasio 1:1 format PNG transparan.</p>
                    </div>
                  </div>
                </div>

                {/* Baris Teks 1: Instansi Pembina */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Baris Header 1 (Pemerintah / Yayasan)</label>
                  <input
                    type="text"
                    value={govTitleInput}
                    onChange={(e) => setGovTitleInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-800"
                    placeholder="PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA"
                  />
                </div>

                {/* Baris Teks 2: Dinas */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Baris Header 2 (Dinas Pendidikan)</label>
                  <input
                    type="text"
                    value={deptTitleInput}
                    onChange={(e) => setDeptTitleInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-800"
                    placeholder="DINAS PENDIDIKAN PROVINSI DKI JAKARTA"
                  />
                </div>

                {/* Baris Teks 3: Sudin / Cabang */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Baris Header 3 (Sudin / Cabang Dinas)</label>
                  <input
                    type="text"
                    value={sudinTitleInput}
                    onChange={(e) => setSudinTitleInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-800"
                    placeholder="SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR"
                  />
                </div>

                {/* Nama Utama Sekolah */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Utama Sekolah</label>
                  <input
                    type="text"
                    value={schoolTitleInput}
                    onChange={(e) => setSchoolTitleInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-extrabold text-slate-900"
                    placeholder="SMP NEGERI 50 JAKARTA"
                  />
                </div>

                {/* Alamat Sekolah */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alamat Lengkap Sekolah</label>
                  <input
                    type="text"
                    value={addressTextInput}
                    onChange={(e) => setAddressTextInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-slate-800"
                    placeholder="Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510"
                  />
                </div>

                {/* Telepon & Email Kontak */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kontak Telepon, Fax, & Email</label>
                  <input
                    type="text"
                    value={contactTextInput}
                    onChange={(e) => setContactTextInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-slate-800"
                    placeholder="Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com"
                  />
                </div>

                {/* Nama Kepala Sekolah */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Kepala Sekolah (Penandatangan Dokumen)</label>
                  <input
                    type="text"
                    value={headmasterName}
                    onChange={(e) => onUpdateHeadmasterName(e.target.value, undefined, undefined, {
                      nip: headmasterNipInput,
                      govTitle: govTitleInput,
                      deptTitle: deptTitleInput,
                      sudinTitle: sudinTitleInput,
                      schoolTitle: schoolTitleInput,
                      addressText: addressTextInput,
                      contactText: contactTextInput
                    })}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-800"
                    placeholder="Dra. Hj. Endah Purwani, M.M."
                  />
                </div>

                {/* NIP Kepala Sekolah */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">NIP Kepala Sekolah</label>
                  <input
                    type="text"
                    value={headmasterNipInput}
                    onChange={(e) => setHeadmasterNipInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-slate-800"
                    placeholder="196711261991032004"
                  />
                </div>

                {/* Nomor Dokumen / Surat */}
                <div className="md:col-span-2 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                  <label className="block text-[10px] font-bold text-purple-900 uppercase tracking-wider mb-1">Pengaturan Nomor Dokumen / Surat (Opsional)</label>
                  <input
                    type="text"
                    value={docNumberInput}
                    onChange={(e) => setDocNumberInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none font-mono font-bold text-slate-800"
                    placeholder="Contoh: 421.3/001/SMPN50/2026 atau kosongkan jika tidak digunakan"
                  />
                  <p className="text-[10px] text-purple-700 mt-1">Admin bisa mengatur nomor surat resmi untuk setiap laporan cetak PDF, atau mengosongkannya agar tidak menampilkan baris nomor dokumen.</p>
                </div>
              </div>

              {/* LIVE PRATINJAU KOP SURAT */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    Pratinjau Kop Surat Resmi Cetak
                  </span>
                  <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    Sesuai Standar Administrasi Sekolah
                  </span>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-300 shadow-xs space-y-4 text-slate-900 font-serif">
                  {/* Kop Surat Header */}
                  <div className="flex items-center justify-between pb-2 border-b-4 border-double border-slate-900 gap-2">
                    {/* Logo Kiri */}
                    <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                      <img
                        src={localStorage.getItem('siakad_logo_left') || '/logo-dki.png'}
                        alt="Logo Kiri"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>

                    {/* Teks Kop Tengah */}
                    <div className="text-center flex-1 space-y-0.5 px-2">
                      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-tight text-slate-900 font-sans">{govTitleInput}</p>
                      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-tight text-slate-900 font-sans">{deptTitleInput}</p>
                      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide leading-tight text-slate-800 font-sans">{sudinTitleInput}</p>
                      <h2 className="text-base sm:text-xl font-extrabold uppercase tracking-widest text-slate-950 font-serif my-0.5">{schoolTitleInput}</h2>
                      <p className="text-[8px] sm:text-[9px] text-slate-800 font-sans leading-tight">{addressTextInput}</p>
                      <p className="text-[8px] sm:text-[9px] text-slate-800 font-sans leading-tight">{contactTextInput}</p>
                    </div>

                    {/* Logo Kanan */}
                    <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                      <img
                        src={localStorage.getItem('siakad_logo_right') || '/logo.png'}
                        alt="Logo Kanan"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Body Sample */}
                  <div className="text-center py-2 space-y-1 font-sans">
                    <p className="text-xs font-bold uppercase underline">CONTOH JUDUL DOKUMEN LAPORAN RESMI</p>
                    {docNumberInput ? (
                      <p className="text-[10px] font-bold text-slate-700">Nomor: {docNumberInput}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">(Nomor Dokumen Dikosongkan)</p>
                    )}
                  </div>

                  {/* Tanda Tangan Sample */}
                  <div className="flex justify-between items-end pt-3 text-[10px] font-sans border-t border-dashed border-slate-200">
                    <div className="text-center w-40">
                      <p>Mengetahui,</p>
                      <p className="font-bold">Pengunduh Dokumen</p>
                      <div className="h-10 flex items-center justify-center text-[8px] text-slate-400 italic">( Tanda Tangan )</div>
                      <p className="font-bold underline">Petugas Administrator</p>
                      <p className="text-[9px]">NIP. 199504242023211018</p>
                    </div>
                    <div className="text-center w-48">
                      <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="font-bold">Kepala Sekolah</p>
                      <div className="h-10 flex items-center justify-center text-[8px] text-slate-400 italic">( Tanda Tangan & Cap Resmi )</div>
                      <p className="font-bold underline">{headmasterName}</p>
                      <p className="text-[9px]">NIP. {headmasterNipInput}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PENGATURAN MEDIA SOSIAL (FOOTER WEBSITE) */}
            <div className="md:col-span-2 bg-white rounded-xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Link className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Pengaturan Media Sosial Sekolah</h4>
                  <p className="text-[10px] text-slate-400">Atur tautan Instagram, nomor WhatsApp, dan Email resmi untuk ditampilkan pada bagian footer website sekolah.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Link Instagram */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Link Instagram</label>
                  <input
                    type="text"
                    value={adminInstagram}
                    onChange={(e) => setAdminInstagram(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    placeholder="https://instagram.com/smpn50jakarta"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp (Link atau No. HP)</label>
                  <input
                    type="text"
                    value={adminWhatsapp}
                    onChange={(e) => setAdminWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    placeholder="https://wa.me/6281234567890"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Resmi Sekolah</label>
                  <input
                    type="text"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 font-semibold"
                    placeholder="smpn50jakarta@gmail.com"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateSocialLinks) {
                      onUpdateSocialLinks(adminInstagram, adminWhatsapp, adminEmail);
                      alert('Link Media Sosial Sekolah berhasil disimpan dan diperbarui di footer website!');
                    } else {
                      alert('Fitur sinkronisasi media sosial tidak tersedia.');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center text-xs gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Media Sosial</span>
                </button>
              </div>
            </div>

            {/* RESET DATABASE SINKRONISASI & PEMULIHAN AWA L*/}
            <div className="md:col-span-2 bg-gradient-to-r from-slate-50 to-indigo-50/50 p-5 rounded-2xl border border-indigo-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Pusat Pemulihan & Reset Data Sistem</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">Admin Only</span>
                </h4>
                <p className="text-xs text-slate-500 max-w-xl">
                  Gunakan fitur ini untuk memulihkan seluruh struktur data ke sampel awal atau mengosongkan database untuk input data ril sekolah baru.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerConfirm(
                      'Reset ke Data Awal',
                      'Yakin ingin memulihkan seluruh database ke posisi data sampel awal? Data siswa, pendidik, kelas, presensi, & jadwal akan dikembalikan ke setelan standar.',
                      () => {
                        onResetDatabase();
                        setSuccessMsg('Database berhasil dipulihkan ke posisi data awal standar!');
                        setTimeout(() => setSuccessMsg(''), 4000);
                      },
                      'Ya, Reset ke Data Awal'
                    );
                  }}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-amber-200 cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Memulihkan seluruh data ke contoh/sampel bawaan aplikasi"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reset ke Data Awal</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerConfirm(
                      'Kosongkan Database',
                      'Yakin ingin mengosongkan seluruh database? Seluruh data siswa, guru, kelas, presensi, & catatan pelanggaran akan dihapus permanen kecuali akun Admin utama Anda.',
                      () => {
                        if (onClearDatabase) {
                          onClearDatabase();
                        } else {
                          onResetDatabase();
                        }
                        setSuccessMsg('Seluruh database berhasil dikosongkan! Sistem siap digunakan untuk data ril.');
                        setTimeout(() => setSuccessMsg(''), 4000);
                      },
                      'Ya, Kosongkan'
                    );
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-rose-200 cursor-pointer shadow-sm transition-all active:scale-95"
                  title="Mengosongkan seluruh tabel database untuk mulai input baru"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Kosongkan Database</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SETTING CBT TAB */}
        {activeTab === 'setting-cbt' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] bg-purple-600 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">CBT Scheduling Engine</span>
                <h3 className="text-lg font-bold text-slate-800">Setting Jadwal Ujian CBT</h3>
                <p className="text-xs text-slate-600">
                  Buat dan tautkan soal ujian Google Form untuk kelas tertentu. Jadwal ujian hanya akan tampil secara otomatis di akun siswa yang bersangkutan.
                </p>
              </div>
            </div>

            {/* PIN Bypass Configuration Card */}
            <div className="bg-white rounded-xl p-5 border border-purple-200/80 shadow-sm space-y-3">
              <div className="flex items-start gap-3 pb-2 border-b">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">PIN Bypass / Password Pengawas Ujian</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Kata sandi pengaman ini digunakan oleh pengawas ujian di kelas untuk membuka status lembar ujian siswa jika terdeteksi melanggar tata tertib / keluar dari mode aman Exambro.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-end gap-3 max-w-xl text-xs">
                <div className="flex-1 space-y-1">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">PIN Pengawas Aktif</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="Masukkan PIN Baru (misal: 1234)"
                    value={cbtBypassPin}
                    onChange={(e) => setCbtBypassPin(e.target.value.trim())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const generated = Math.floor(100000 + Math.random() * 900000).toString();
                      setCbtBypassPin(generated);
                      if (onUpdateCbtBypassPin) {
                        onUpdateCbtBypassPin(generated);
                      } else {
                        safeLocalStorageSet('siakad_cbt_bypass_pin', generated);
                      }
                      alert(`Kode/Password Pengawas baru berhasil digenerate otomatis: ${generated}`);
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer h-10 flex items-center justify-center gap-1.5 text-xs active:scale-95"
                    title="Generate acak 6 digit angka kode/password CBT"
                  >
                    <span>⚡ Generate Kode/Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!cbtBypassPin) {
                        alert('PIN tidak boleh kosong!');
                        return;
                      }
                      if (onUpdateCbtBypassPin) {
                        onUpdateCbtBypassPin(cbtBypassPin);
                      } else {
                        safeLocalStorageSet('siakad_cbt_bypass_pin', cbtBypassPin);
                      }
                      alert(`PIN Pengawas berhasil diperbarui secara tersinkronisasi menjadi: ${cbtBypassPin}`);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer h-10 flex items-center justify-center text-xs active:scale-95"
                  >
                    Simpan PIN Baru
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Exam Schedule Form */}
              <div className="bg-white rounded-xl p-5 border shadow-sm space-y-4 h-fit">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <Plus className="w-5 h-5 text-purple-600" />
                  <span>Jadwal Ujian Baru</span>
                </h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cbtSubject || !cbtDate || !cbtStartTime || !cbtEndTime) {
                      alert('Silakan lengkapi semua data wajib!');
                      return;
                    }
                    if (cbtMethod === 'gform' && !cbtGoogleFormUrl) {
                      alert('Silakan masukan Tautan Google Form!');
                      return;
                    }
                    if (cbtMethod === 'bank_soal' && !selectedBankId) {
                      alert('Silakan pilih salah satu Bank Soal yang dibuat oleh Guru!');
                      return;
                    }
                    if (!cbtClassId) {
                      alert('Silakan pilih minimal 1 Kelas Target!');
                      return;
                    }
                    onAddExamSchedule({
                      subject: cbtSubject,
                      classId: cbtClassId,
                      date: cbtDate,
                      time: `${cbtStartTime} - ${cbtEndTime}`,
                      room: cbtRoom,
                      type: cbtType,
                      examType: cbtType,
                      kkm: Number(cbtKkm) || 75,
                      googleFormUrl: cbtMethod === 'gform' ? cbtGoogleFormUrl : undefined,
                      questionBankId: cbtMethod === 'bank_soal' ? selectedBankId : undefined,
                    });
                    // Reset fields
                    setCbtSubject('Pendidikan Agama dan Budi Pekerti');
                    setCbtGoogleFormUrl('');
                    setSelectedBankId('');
                    setCbtKkm(75);
                    setSuccessMsg('Jadwal ujian CBT berhasil disimpan & disinkronkan ke siswa!');
                    setTimeout(() => setSuccessMsg(''), 4000);
                  }}
                  className="space-y-3.5 text-xs"
                >
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Metode Soal Ujian <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCbtMethod('bank_soal')}
                        className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                          cbtMethod === 'bank_soal' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Bank Soal Guru (CBT)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCbtMethod('gform')}
                        className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                          cbtMethod === 'gform' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Google Form Link
                      </button>
                    </div>
                  </div>

                  {cbtMethod === 'bank_soal' ? (
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Pilih Bank Soal Guru <span className="text-rose-500">*</span></label>
                      <select
                        required
                        value={selectedBankId}
                        onChange={(e) => {
                          const bId = e.target.value;
                          setSelectedBankId(bId);
                          const matchedQb = questionBanks.find(q => q.id === bId);
                          if (matchedQb && matchedQb.subject) {
                            setCbtSubject(matchedQb.subject);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none cursor-pointer font-medium text-slate-700 text-xs"
                      >
                        <option value="">-- Pilih Bank Soal Guru ({questionBanks.length} Tersedia) --</option>
                        {questionBanks.map((qb) => (
                          <option key={qb.id} value={qb.id}>
                            {qb.title} ({qb.subject}) - Guru: {qb.teacherName} [{qb.questions?.length || 0} Soal]
                          </option>
                        ))}
                      </select>
                      {questionBanks.length === 0 && (
                        <p className="text-[10px] text-amber-600 italic mt-1">Belum ada Bank Soal buatan Guru. Guru dapat membuat Bank Soal di portal Guru.</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Tautan Soal (Google Form) <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="https://forms.gle/..."
                          value={cbtGoogleFormUrl}
                          onChange={(e) => setCbtGoogleFormUrl(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none text-indigo-600 font-mono"
                        />
                        <Link className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Mata Pelajaran <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={cbtSubject}
                      onChange={(e) => setCbtSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none cursor-pointer font-medium text-slate-700"
                    >
                      <option value="Pendidikan Agama dan Budi Pekerti">Pendidikan Agama dan Budi Pekerti</option>
                      <option value="Pendidikan Pancasila">Pendidikan Pancasila</option>
                      <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                      <option value="Matematika">Matematika</option>
                      <option value="Ilmu Pengetahuan Alam (IPA)">Ilmu Pengetahuan Alam (IPA)</option>
                      <option value="Ilmu Pengetahuan Sosial (IPS)">Ilmu Pengetahuan Sosial (IPS)</option>
                      <option value="Bahasa Inggris">Bahasa Inggris</option>
                      <option value="Informatika">Informatika</option>
                      <option value="Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)">Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)</option>
                      <option value="Seni dan Prakarya">Seni dan Prakarya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Kelas Target (Pilih Beberapa Kelas) <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cbtClassId === 'all'}
                          onChange={() => setCbtClassId(cbtClassId === 'all' ? '' : 'all')}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-bold text-slate-700">Semua Kelas (all)</span>
                      </label>
                      {classes.map((c) => {
                        const classIds = cbtClassId === 'all' ? [] : cbtClassId.split(',').map(x => x.trim()).filter(Boolean);
                        const isChecked = classIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={cbtClassId === 'all'}
                              checked={cbtClassId === 'all' || isChecked}
                              onChange={() => {
                                let newIds;
                                if (isChecked) {
                                  newIds = classIds.filter(id => id !== c.id);
                                } else {
                                  newIds = [...classIds, c.id];
                                }
                                setCbtClassId(newIds.join(', '));
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-slate-600">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Hari & Tanggal <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        required
                        value={cbtDate}
                        onChange={(e) => setCbtDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Tipe Ujian <span className="text-rose-500">*</span></label>
                      <select
                        value={cbtType}
                        onChange={(e) => setCbtType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none"
                      >
                        <option value="UTS">UTS</option>
                        <option value="UAS">UAS</option>
                        <option value="Harian">Harian</option>
                        <option value="Simulasi">Simulasi</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Waktu Pelaksanaan <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        required
                        value={cbtStartTime}
                        onChange={(e) => setCbtStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none font-medium text-slate-700"
                      />
                      <span className="text-slate-400 font-bold px-1 shrink-0">s/d</span>
                      <input
                        type="time"
                        required
                        value={cbtEndTime}
                        onChange={(e) => setCbtEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none font-medium text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Nilai KKM / KKTP Target (Batas Lulus) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={cbtKkm}
                      onChange={(e) => setCbtKkm(Number(e.target.value) || 0)}
                      placeholder="Misal: 75"
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg transition-all outline-none font-medium text-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl font-bold cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5 mt-2 text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Simpan & Rilis Jadwal</span>
                  </button>
                </form>
              </div>

              {/* Exam Schedule List */}
              <div className="lg:col-span-2 bg-white rounded-xl p-5 border shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span>Daftar Jadwal Ujian Aktif</span>
                </h4>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                  {examSchedules.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <Award className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium">Belum ada jadwal ujian CBT aktif.</p>
                      <p className="text-xs text-slate-400 mt-1">Gunakan formulir sebelah kiri untuk menerbitkan jadwal ujian baru.</p>
                    </div>
                  ) : (
                    examSchedules.map((schedule) => {
                      const cls = classes.find((c) => c.id === schedule.classId);
                      return (
                        <div key={schedule.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-lg transition-colors text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{schedule.subject}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 font-bold uppercase border text-slate-600">{schedule.type}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-800 font-bold uppercase">{cls ? cls.name : 'Semua Kelas'}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {schedule.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {schedule.time}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">Server: {schedule.room}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                KKM/KKTP: {schedule.kkm ?? 75}
                              </span>
                            </div>
                            {schedule.questionBankId ? (
                              <p className="text-[11px] text-purple-700 font-bold flex items-center gap-1 mt-1">
                                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                                <span>Bank Soal: {questionBanks.find(q => q.id === schedule.questionBankId)?.title || schedule.questionBankId}</span>
                              </p>
                            ) : schedule.googleFormUrl ? (
                              <p className="text-[10px] text-indigo-600 font-mono hover:underline flex items-center gap-1 mt-1 truncate max-w-md">
                                <Link className="w-3 h-3 text-indigo-400 shrink-0" />
                                <a href={schedule.googleFormUrl} target="_blank" rel="noopener noreferrer" className="truncate">{schedule.googleFormUrl}</a>
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                'Hapus Jadwal Ujian',
                                'Apakah Anda yakin ingin menghapus jadwal ujian ini?',
                                () => onDeleteExamSchedule(schedule.id)
                              );
                            }}
                            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 font-semibold shrink-0 cursor-pointer self-start sm:self-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* CBT Score Exporter Section */}
            <CbtScoreExporter
              students={students}
              classes={classes}
              studentSubmissions={studentSubmissions}
              examGrades={examGrades}
              examSchedules={examSchedules}
            />
          </div>
        )}

        {/* VALIDASI AKUN BARU TAB */}
        {activeTab === 'validasi-akun' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Modul Validasi Pendaftaran</span>
                <h3 className="text-lg font-bold text-slate-800">Verifikasi &amp; Persetujuan Registrasi Mandiri</h3>
                <p className="text-xs text-slate-600">
                  Semua pendaftaran akun baru oleh Guru, Siswa, dan Orang Tua wajib melalui proses validasi ini sebelum mereka dapat login ke sistem.
                </p>
              </div>
              <div className="bg-indigo-600/10 text-indigo-700 text-xs px-3 py-1.5 rounded-xl border border-indigo-200 font-bold">
                Total Menunggu: {pendingRegistrations.length} Akun
              </div>
            </div>

            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl p-6">
              {pendingRegistrations.length === 0 ? (
                <div className="py-12 text-center space-y-3.5 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">Tidak Ada Pendaftaran Menunggu</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Seluruh pengajuan registrasi mandiri akun baru telah diproses. Antrean pendaftaran bersih.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Daftar Pengajuan Registrasi ({pendingRegistrations.length})
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                      {onClearAllPendingRegistrations && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirm(
                              'Bersihkan Semua Data Pendaftaran / Data Rusak',
                              'Apakah Anda yakin ingin mengosongkan dan membersihkan seluruh antrean pendaftaran? Semua data pendaftaran lama atau rusak akan dihapus permanen dari database.',
                              () => {
                                onClearAllPendingRegistrations();
                                setSuccessMsg('Seluruh antrean pendaftaran berhasil dibersihkan.');
                                setTimeout(() => setSuccessMsg(''), 4000);
                              },
                              'Ya, Bersihkan Semua'
                            );
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs justify-center flex-1 sm:flex-initial"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Bersihkan Data Rusak / Kosongkan</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          triggerConfirm(
                            'Konfirmasi Semua Pendaftar',
                            `Apakah Anda yakin ingin menyetujui dan mengaktifkan semua (${pendingRegistrations.length}) pendaftar akun yang menunggu sekaligus?`,
                            () => {
                              if (onApproveAllRegistrations) onApproveAllRegistrations();
                              setSuccessMsg(`Berhasil menyetujui dan mengaktifkan semua pendaftar akun baru.`);
                              setTimeout(() => setSuccessMsg(''), 4000);
                            }
                          );
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-100 justify-center flex-1 sm:flex-initial"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-100" />
                        <span>Setujui Semua Pendaftar ({pendingRegistrations.length})</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-xs transition-all bg-slate-50/50 space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Header of card */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="font-bold text-sm text-slate-800 leading-tight">
                                {reg.name || '(Pengajuan Data Tidak Lengkap)'}
                              </h5>
                              <span className="text-[10px] text-slate-400 font-medium font-mono">Daftar: {reg.createdAt || '-'}</span>
                            </div>

                            {/* Role Badge */}
                            {reg.role === 'guru' && (
                              <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                Guru
                              </span>
                            )}
                            {reg.role === 'siswa' && (
                              <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                Siswa
                              </span>
                            )}
                            {reg.role === 'orang_tua' && (
                              <span className="bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                Orang Tua
                              </span>
                            )}
                          </div>

                          {/* Detail metadata list */}
                          <div className="text-xs space-y-1.5 border-t border-slate-100/70 pt-3">
                            <div className="flex justify-between items-center text-slate-500">
                              <span>
                                {reg.role === 'guru' ? 'NIP Pegawai:' : reg.role === 'siswa' ? 'NISN Siswa:' : 'NIK Orang Tua:'}
                              </span>
                              <span className="font-bold text-slate-800 font-mono text-[11px] bg-white border border-slate-100 px-1.5 py-0.5 rounded-lg">
                                {reg.nipOrNisnOrNik || '-'}
                              </span>
                            </div>

                            {reg.role === 'siswa' && reg.classId && (
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Rombel Kelas:</span>
                                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg text-[10px]">
                                  {getSchoolClassName(reg.classId, classes)}
                                </span>
                              </div>
                            )}

                            {reg.role === 'siswa' && reg.gender && (
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Jenis Kelamin:</span>
                                <span className="font-semibold text-slate-700">{(reg.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}</span>
                              </div>
                            )}

                            {reg.role === 'orang_tua' && reg.studentNisnOrName && (
                              <div className="p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl space-y-0.5 mt-1.5">
                                <span className="block text-[9px] font-black text-amber-700 uppercase tracking-wide">Link Anak (Siswa):</span>
                                <span className="text-slate-800 font-bold text-xs">{reg.studentNisnOrName}</span>
                              </div>
                            )}

                            {reg.email && (
                              <div className="flex justify-between items-center text-slate-500">
                                <span>Email:</span>
                                <span className="text-slate-700 font-medium truncate max-w-[180px]">{reg.email}</span>
                              </div>
                            )}

                            {reg.phone && (
                              <div className="flex justify-between items-center text-slate-500">
                                <span>No. WhatsApp:</span>
                                <span className="text-slate-700 font-semibold font-mono text-[11px]">{reg.phone}</span>
                              </div>
                            )}

                            {reg.address && (
                              <div className="border-t border-dashed border-slate-100 pt-2 mt-2">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Alamat Domisili:</span>
                                <p className="text-[11px] text-slate-600 leading-relaxed italic">{reg.address}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 border-t border-slate-100 pt-3 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm(
                                'Tolak Pendaftaran',
                                `Apakah Anda yakin ingin menolak pendaftaran akun atas nama ${reg.name}? Data pengajuan ini akan dihapus permanen.`,
                                () => {
                                  if (onRejectRegistration) onRejectRegistration(reg.id);
                                  setSuccessMsg(`Pendaftaran akun ${reg.name} berhasil ditolak.`);
                                  setTimeout(() => setSuccessMsg(''), 4000);
                                }
                              );
                            }}
                            className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Tolak</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onApproveRegistration) onApproveRegistration(reg.id);
                              setSuccessMsg(`Pendaftaran akun ${reg.name} berhasil divalidasi dan diaktifkan.`);
                              setTimeout(() => setSuccessMsg(''), 4000);
                            }}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100"
                          >
                            <Check className="w-4 h-4 shrink-0 text-indigo-200" />
                            <span>Setujui &amp; Aktifkan</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* KELOLA KONTEN WEB TAB */}
        {activeTab === 'kelola-web' && (
          <WebContentEditor />
        )}

        {/* PRESTASI SISWA TAB */}
        {activeTab === 'prestasi' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Pengelolaan Pusat
                </span>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-200" />
                  <span>Daftar Raihan Prestasi Siswa</span>
                </h2>
                <p className="text-amber-100 text-xs">
                  Sistem pencatatan terpadu untuk Prestasi Akademik (Di-input oleh Admin) &amp; Non-Akademik (Di-input oleh Pelatih Ekskul).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAchievements('excel')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadAchievements('pdf')}
                  className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Prestasi Terdata</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{studentAchievements.length}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tersinkron di semua Dashboard</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prestasi Akademik</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">
                    {studentAchievements.filter(a => a.category === 'Akademik').length}
                  </p>
                  <p className="text-[11px] text-indigo-500 font-medium mt-0.5">Input oleh Admin Sekolah</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prestasi Non-Akademik</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {studentAchievements.filter(a => a.category === 'Non Akademik').length}
                  </p>
                  <p className="text-[11px] text-emerald-500 font-medium mt-0.5">Input oleh Pelatih Ekstrakurikuler</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <Award className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Form Input Prestasi Baru */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-600" />
                  <span>Input Prestasi Siswa Baru (Akademik / Non Akademik)</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">Form Resmi Admin</span>
              </div>

              <form onSubmit={handleSaveAchievement} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Filter Kelas Siswa</label>
                  <select
                    value={achClassFilter}
                    onChange={(e) => {
                      setAchClassFilter(e.target.value);
                      setAchStudentId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Siswa *</label>
                  <select
                    value={achStudentId}
                    onChange={(e) => setAchStudentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                    required
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {students
                      .filter(s => !achClassFilter || s.classId === achClassFilter)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.classId}) - NISN: {s.nisn}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Prestasi *</label>
                  <select
                    value={achCategory}
                    onChange={(e) => setAchCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                  >
                    <option value="Akademik">Akademik (OSN, Lomba Karya Tulis, Cerdas Cermat - Input Admin)</option>
                    <option value="Non Akademik">Non Akademik (Olahraga, Seni, Keagamaan, Pramuka - Input Pelatih)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    * Sesuai ketentuan: Admin menginput Prestasi Akademik, sedangkan Pelatih menginput Prestasi Non-Akademik di Dashboard Pelatih.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Perlombaan *</label>
                  <select
                    value={achLevel}
                    onChange={(e) => setAchLevel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                  >
                    <option value="Sekolah">Tingkat Sekolah</option>
                    <option value="Kecamatan">Tingkat Kecamatan</option>
                    <option value="Kota/Kabupaten">Tingkat Kota / Kabupaten</option>
                    <option value="Provinsi">Tingkat Provinsi</option>
                    <option value="Nasional">Tingkat Nasional</option>
                    <option value="Internasional">Tingkat Internasional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peringkat / Raihan *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Juara 1, Medali Emas, Harapan 1"
                    value={achRank}
                    onChange={(e) => setAchRank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Nama Kejuaraan *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Juara 1 Olimpiade Sains Nasional (OSN) Matematika"
                    value={achTitle}
                    onChange={(e) => setAchTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Perolehan *</label>
                  <input
                    type="date"
                    value={achDate}
                    onChange={(e) => setAchDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Foto / Piagam (Opsional)</label>
                  <input
                    type="text"
                    placeholder="https://... atau foto piagam"
                    value={achCertificateUrl}
                    onChange={(e) => setAchCertificateUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600/25 focus:bg-white text-slate-800"
                  />
                </div>

                <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm shadow-amber-200"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Prestasi Siswa</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List Table of Achievements */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAchFilterCat('Semua')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      achFilterCat === 'Semua' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({studentAchievements.length})
                  </button>
                  <button
                    onClick={() => setAchFilterCat('Akademik')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      achFilterCat === 'Akademik' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Akademik ({studentAchievements.filter(a => a.category === 'Akademik').length})
                  </button>
                  <button
                    onClick={() => setAchFilterCat('Non Akademik')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      achFilterCat === 'Non Akademik' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Non-Akademik ({studentAchievements.filter(a => a.category === 'Non Akademik').length})
                  </button>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa / prestasi..."
                    value={achSearch}
                    onChange={(e) => setAchSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/25"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3">Siswa</th>
                      <th className="px-4 py-3">Raihan &amp; Kejuaraan</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Tingkat</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Pencatat</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {studentAchievements
                      .filter(a => {
                        const matchCat = achFilterCat === 'Semua' || a.category === achFilterCat;
                        const matchSearch = a.studentName.toLowerCase().includes(achSearch.toLowerCase()) ||
                                            a.title.toLowerCase().includes(achSearch.toLowerCase()) ||
                                            a.classId.toLowerCase().includes(achSearch.toLowerCase());
                        return matchCat && matchSearch;
                      })
                      .map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{a.studentName}</div>
                            <div className="text-[10px] text-slate-400">{a.classId}</div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-bold text-slate-900">{a.title}</div>
                            {a.rank && <div className="text-[10px] text-amber-600 font-bold">{a.rank}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                              a.category === 'Akademik' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {a.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {a.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.date}</td>
                          <td className="px-4 py-3 text-[11px] text-slate-600 font-semibold">{a.recordedBy}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                triggerConfirm(
                                  'Hapus Prestasi',
                                  `Apakah Anda yakin ingin menghapus data prestasi "${a.title}" milik ${a.studentName}?`,
                                  () => {
                                    if (onDeleteStudentAchievement) onDeleteStudentAchievement(a.id);
                                    setSuccessMsg('Data prestasi berhasil dihapus.');
                                    setTimeout(() => setSuccessMsg(''), 3000);
                                  }
                                );
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    {studentAchievements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                          Belum ada data prestasi siswa yang dicatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'setting-sertifikat' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white rounded-2xl p-6 shadow-lg shadow-amber-200/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                  <ShieldCheck className="w-8 h-8 text-yellow-200" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Pengaturan Sertifikat Digital (Akademik &amp; Non-Akademik)</h3>
                  <p className="text-amber-100 text-xs mt-1">
                    Atur tampilan sertifikat resmi siswa, logo, background, nomor sertifikat, serta TTD digital kiri &amp; kanan. Tampilan ini akan otomatis tersinkronisasi ke seluruh akun Siswa &amp; Orang Tua.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Settings Left Column */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-3 border-b">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  Form Konfigurasi Desain &amp; Legalitas Sertifikat
                </h4>

                <form onSubmit={handleSaveCertificateSettings} className="space-y-4">
                  {/* Background Selector Academic */}
                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
                    <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      1. Background Frame Sertifikat AKADEMIK (OSN, Cerdas Cermat, Lomba Karya Tulis)
                    </label>
                    <input
                      type="text"
                      value={certAcademicBgUrl}
                      onChange={(e) => setCertAcademicBgUrl(e.target.value)}
                      placeholder="https://... URL background sertifikat akademik"
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                      <span className="text-amber-800 font-medium">Preset Cepat:</span>
                      <button
                        type="button"
                        onClick={() => setCertAcademicBgUrl('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop')}
                        className="px-2 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 cursor-pointer"
                      >
                        Gold Luxe
                      </button>
                      <button
                        type="button"
                        onClick={() => setCertAcademicBgUrl('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop')}
                        className="px-2 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg hover:bg-blue-200 cursor-pointer"
                      >
                        Royal Blue
                      </button>
                    </div>
                  </div>

                  {/* Background Selector Non-Academic */}
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                    <label className="block text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      2. Background Frame Sertifikat NON-AKADEMIK (Pramuka, Seni, Olahraga, Ekskul)
                    </label>
                    <input
                      type="text"
                      value={certNonAcademicBgUrl}
                      onChange={(e) => setCertNonAcademicBgUrl(e.target.value)}
                      placeholder="https://... URL background sertifikat non-akademik"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                      <span className="text-emerald-800 font-medium">Preset Cepat:</span>
                      <button
                        type="button"
                        onClick={() => setCertNonAcademicBgUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop')}
                        className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg hover:bg-emerald-200 cursor-pointer"
                      >
                        Emerald Classic
                      </button>
                      <button
                        type="button"
                        onClick={() => setCertNonAcademicBgUrl('https://images.unsplash.com/photo-1579546929662-711aa81148cf?q=80&w=1000&auto=format&fit=crop')}
                        className="px-2 py-1 bg-purple-100 text-purple-800 font-bold rounded-lg hover:bg-purple-200 cursor-pointer"
                      >
                        Ruby Distinction
                      </button>
                    </div>
                  </div>

                  {/* Custom Logos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">URL Logo Kiri (Pemprov / Dinas)</label>
                      <input
                        type="text"
                        value={certLogoLeft}
                        onChange={(e) => setCertLogoLeft(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">URL Logo Kanan (Sekolah)</label>
                      <input
                        type="text"
                        value={certLogoRight}
                        onChange={(e) => setCertLogoRight(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Format Nomor Sertifikat */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-bold text-slate-700">Format Template Nomor Sertifikat</label>
                    <input
                      type="text"
                      value={certNumFormat}
                      onChange={(e) => setCertNumFormat(e.target.value)}
                      placeholder="50/SERT/{CAT}/{YEAR}/{ID}"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">Variabel yang didukung: &#123;CAT&#125;, &#123;YEAR&#125;, &#123;ID&#125;</p>
                  </div>

                  {/* Signature Left */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h5 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      Pengaturan Tanda Tangan Kiri (Pelatih / Pembina / Walas)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jabatan / Judul TTD</label>
                        <input
                          type="text"
                          value={certLeftTitle}
                          onChange={(e) => setCertLeftTitle(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Lengkap &amp; Gelar</label>
                        <input
                          type="text"
                          value={certLeftName}
                          onChange={(e) => setCertLeftName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signature Right */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h5 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Pengaturan Tanda Tangan Kanan (Kepala Sekolah)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jabatan / Judul TTD</label>
                        <input
                          type="text"
                          value={certRightTitle}
                          onChange={(e) => setCertRightTitle(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Lengkap Kepala Sekolah</label>
                        <input
                          type="text"
                          value={certRightName}
                          onChange={(e) => setCertRightName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIP Kepala Sekolah</label>
                      <input
                        type="text"
                        value={certRightNip}
                        onChange={(e) => setCertRightNip(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan &amp; Sinkronkan Tampilan Sertifikat</span>
                  </button>
                </form>
              </div>

              {/* Live Preview Right Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      Live Preview Sertifikat Digital
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">Real-time</span>
                  </div>

                  {/* Preview Type Toggle Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewCertType('akademik')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        previewCertType === 'akademik'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Preview Akademik
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewCertType('non_akademik')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        previewCertType === 'non_akademik'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Preview Non-Akademik
                    </button>
                  </div>

                  {/* Certificate Digital Visual Card Mock */}
                  <div className={`relative rounded-2xl overflow-hidden border-4 shadow-xl bg-slate-900 text-white p-6 space-y-4 min-h-[360px] flex flex-col justify-between transition-all ${
                    previewCertType === 'akademik' ? 'border-amber-400' : 'border-emerald-400'
                  }`}>
                    {/* Background Overlay */}
                    <div
                      className="absolute inset-0 opacity-30 bg-cover bg-center pointer-events-none transition-all duration-300"
                      style={{
                        backgroundImage: `url('${previewCertType === 'akademik' ? certAcademicBgUrl : certNonAcademicBgUrl}')`
                      }}
                    />
                    
                    {/* Inner Gold / Emerald Border Frame */}
                    <div className={`absolute inset-2 border-2 rounded-xl pointer-events-none ${
                      previewCertType === 'akademik' ? 'border-amber-300/60' : 'border-emerald-300/60'
                    }`} />

                    <div className="relative z-10 space-y-3">
                      {/* Top Logos & Title */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-3">
                        <img src={certLogoLeft} alt="Logo Left" className="w-9 h-9 object-contain" onError={(e: any) => e.target.style.display = 'none'} />
                        <div className="text-center flex-1">
                          <p className="text-[9px] font-bold tracking-widest text-amber-200 uppercase">SMP NEGERI 50 JAKARTA</p>
                          <h5 className={`text-sm font-extrabold tracking-wider ${previewCertType === 'akademik' ? 'text-amber-300' : 'text-emerald-300'}`}>
                            SERTIFIKAT PRESTASI {previewCertType === 'akademik' ? 'AKADEMIK' : 'NON-AKADEMIK'}
                          </h5>
                          <p className="text-[9px] text-slate-300 font-mono mt-0.5">
                            {certNumFormat.replace('{CAT}', previewCertType === 'akademik' ? 'AKAD' : 'NONAKAD').replace('{YEAR}', '2026').replace('{ID}', '001')}
                          </p>
                        </div>
                        <img src={certLogoRight} alt="Logo Right" className="w-9 h-9 object-contain" onError={(e: any) => e.target.style.display = 'none'} />
                      </div>

                      {/* Recipient */}
                      <div className="text-center space-y-1 my-2">
                        <p className="text-[10px] text-slate-300 italic">Diberikan Kepada:</p>
                        <p className={`text-base font-extrabold underline ${previewCertType === 'akademik' ? 'text-amber-200 decoration-amber-400' : 'text-emerald-200 decoration-emerald-400'}`}>
                          AHMAD RIFAI
                        </p>
                        <p className="text-[10px] text-slate-300">NISN: 0081234567 &bull; Kelas: VII-A</p>
                      </div>

                      {/* Achievement */}
                      <div className="text-center bg-black/40 backdrop-blur-md p-2.5 rounded-xl border border-white/10 space-y-1">
                        <p className="text-[9px] text-slate-300 font-bold uppercase">Atas Capaian Prestasi:</p>
                        <p className="text-xs font-bold text-white">
                          {previewCertType === 'akademik'
                            ? '"Juara 1 Lomba Olimpiade Sains Nasional (OSN) Matematika"'
                            : '"Juara 1 FLS2N Festival Seni Tari Tradisional Kategori Daerah"'}
                        </p>
                        <div className="flex justify-center gap-2 pt-1 text-[9px]">
                          <span className="px-2 py-0.5 bg-white/20 text-white rounded-full font-semibold">Tingkat Kota</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            previewCertType === 'akademik' ? 'bg-amber-500/30 text-amber-200' : 'bg-emerald-500/30 text-emerald-200'
                          }`}>
                            Kategori {previewCertType === 'akademik' ? 'Akademik' : 'Non-Akademik'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Signatures */}
                    <div className="relative z-10 grid grid-cols-2 gap-2 text-center pt-2 border-t border-white/20 text-[9px]">
                      <div className="space-y-1">
                        <p className="text-slate-300 font-semibold">{certLeftTitle}</p>
                        <div className="h-7 flex items-center justify-center">
                          <span className="text-[10px] font-serif italic text-amber-200/80">[ TTD Digital ]</span>
                        </div>
                        <p className="font-extrabold text-white underline">{certLeftName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-300 font-semibold">{certRightTitle}</p>
                        <div className="h-7 flex items-center justify-center">
                          <span className="text-[10px] font-serif italic text-amber-200/80">[ TTD Digital ]</span>
                        </div>
                        <p className="font-extrabold text-white underline">{certRightName}</p>
                        <p className="text-[8px] text-slate-400 font-mono">{certRightNip ? `NIP. ${certRightNip}` : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
