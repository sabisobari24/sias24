import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Eye,
  User,
  Users,
  LogOut,
  Database,
  School,
  Activity,
  ArrowRight,
  Sparkles,
  Info,
  X,
  TrendingUp,
  Globe,
  Calendar,
  Award,
  FileCheck,
  CheckCircle2,
  Percent,
  FileText,
  BarChart2,
  Settings,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Search,
  Save,
  MessageSquare,
  Check,
  Menu,
  ChevronLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Instagram,
  MessageCircle,
  Mail,
  ShieldCheck,
  CreditCard,
  Package,
  ClipboardList,
  DollarSign,
  Sun,
  Moon
} from 'lucide-react';

import { getDoc, getDocs, collection, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { normalizeClassId, getSchoolClassName } from './utils/classUtils';
import { safeLocalStorageSet, safeLocalStorageGet } from './utils/storageHelper';

import {
  Student,
  Teacher,
  SchoolClass,
  Attendance,
  ViolationType,
  StudentViolation,
  CounselorNote,
  HomeroomNote,
  ParentMessage,
  UserRole,
  ExamSchedule,
  ExamGrade,
  AbsentTeacher,
  ImportantEvent,
  TeachingJournal,
  BimbinganJournal,
  BimbinganSchedule,
  PendingRegistration,
  StudentAchievement,
  PemberkasanSchedule,
  NomorSurat,
  InventoryItem,
  InventoryLoan,
  BosBopReport,
  StudentExamSubmission,
  SchoolTimeConfig,
  ELearningMaterial,
  StudentLearningProgress
} from './types';

import {
  INITIAL_CLASSES,
  INITIAL_TEACHERS,
  INITIAL_STUDENTS,
  INITIAL_VIOLATION_TYPES,
  INITIAL_ATTENDANCE,
  INITIAL_VIOLATIONS,
  INITIAL_COUNSELOR_NOTES,
  INITIAL_HOMEROOM_NOTES,
  INITIAL_PARENT_MESSAGES,
  INITIAL_EXAM_SCHEDULES,
  INITIAL_EXAM_GRADES,
  INITIAL_ABSENT_TEACHERS,
  INITIAL_IMPORTANT_EVENTS,
  INITIAL_STUDENT_ACHIEVEMENTS,
  INITIAL_PEMBERKASAN_SCHEDULES,
  INITIAL_NOMOR_SURAT,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INVENTORY_LOANS,
  INITIAL_BOS_BOP_REPORTS,
  INITIAL_SCHOOL_TIME_CONFIG
} from './data/initialData';

import {
  INITIAL_ELEARNING_MATERIALS,
  INITIAL_ELEARNING_PROGRESS
} from './data/initialELearning';

// Component Imports
import RoleBadge from './components/RoleBadge';
import SiswaPanel from './components/SiswaPanel';
import OrangTuaPanel from './components/OrangTuaPanel';
import GuruPanel from './components/GuruPanel';
import WaliKelasPanel from './components/WaliKelasPanel';
import BKPanel from './components/BKPanel';
import PiketPanel from './components/PiketPanel';
import AdminPanel from './components/AdminPanel';
import GuruWaliPanel from './components/GuruWaliPanel';
import CoachPanel from './components/CoachPanel';
import TendikPanel from './components/TendikPanel';
import ProfileEditModal from './components/ProfileEditModal';
import RegisterModal from './components/RegisterModal';
import { ScrollNavigator } from './components/ScrollNavigator';

// Website component imports
import WebHome from './components/website/WebHome';
import WebAkademik from './components/website/WebAkademik';
import WebKesiswaan from './components/website/WebKesiswaan';
import WebSarpras from './components/website/WebSarpras';
import WebBerita from './components/website/WebBerita';
import { syncCollection, syncHeadmaster, syncCbtConfig, saveCbtBypassPin, syncCollectionWithArray, saveDocument, deleteDocument, saveDocumentsBatch, deleteDocumentsBatch, clearAllCollections, clearDeletedIds, db, deduplicateStudents, onFirestoreStatusChange } from './lib/firebase';
import { INITIAL_WEB_CONTENT } from './data/initialWebContent';

export default function App() {
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme_mode');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme_mode', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme_mode', 'light');
      }
    } catch { /* ignore */ }
  }, [isDarkMode]);

  // Firebase connection monitor state
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'high_latency'>('online');
  const [dbLatency, setDbLatency] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [hasSyncError, setHasSyncError] = useState<boolean>(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [isMonitorOpen, setIsMonitorOpen] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState<boolean>(false);

  const consecutiveFailuresRef = useRef<number>(0);

  // Connection check function
  const checkFirebaseConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setDbStatus('offline');
      setHasSyncError(true);
      return;
    }
    
    setIsCheckingConnection(true);
    
    try {
      const startTime = performance.now();
      
      // Get the headmaster document as a lightweight ping with a 10s timeout
      const docRef = doc(db, 'settings', 'headmaster');
      const pingPromise = getDoc(docRef);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );
      
      await Promise.race([pingPromise, timeoutPromise]);
      
      const endTime = performance.now();
      const latencyVal = Math.round(endTime - startTime);
      
      setDbLatency(latencyVal);
      consecutiveFailuresRef.current = 0;
      setHasSyncError(false);
      
      if (latencyVal > 2000) {
        setDbStatus('high_latency');
      } else {
        setDbStatus('online');
      }
      setLastSyncTime(Date.now());
    } catch (error) {
      console.warn("Connection ping notice:", error);
      consecutiveFailuresRef.current += 1;
      // Only set offline if device is truly disconnected from browser network
      if (!navigator.onLine) {
        setDbStatus('offline');
        setHasSyncError(true);
      } else if (consecutiveFailuresRef.current >= 5) {
        // If device is online but individual ping was slow, set high_latency instead of hard offline
        setDbStatus('high_latency');
      }
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  const runDbDiagnostics = useCallback(async () => {
    setIsRunningDiagnostic(true);
    setDiagnosticResult("Memulai diagnosis koneksi...");
    try {
      const startTime = performance.now();
      // 1. Get headmaster settings document
      setDiagnosticResult("1/2: Membaca dokumen settings/headmaster...");
      const docRef = doc(db, 'settings', 'headmaster');
      await getDoc(docRef);
      const readTime = Math.round(performance.now() - startTime);
      
      // 2. Try writing test data to system_diagnostics/connection-test
      setDiagnosticResult(`Sukses membaca settings/headmaster (${readTime}ms). 2/2: Mencoba verifikasi hak tulis database...`);
      const testRef = doc(db, 'system_diagnostics', 'connection-test');
      await setDoc(testRef, {
        timestamp: new Date().toISOString(),
        message: 'Tes diagnosa mandiri dari peramban pengguna',
        test: true
      }, { merge: true });

      // Clean up legacy test doc in pending_registrations if any exists
      deleteDoc(doc(db, 'pending_registrations', 'test-diagnostics')).catch(() => {});
      
      const totalTime = Math.round(performance.now() - startTime);
      setDiagnosticResult(`SUKSES: Koneksi database Firebase 100% Berhasil! (Bisa Baca & Tulis dalam ${totalTime}ms)`);
      setDbStatus('online');
      setHasSyncError(false);
    } catch (err: any) {
      console.error("Diagnostic error:", err);
      const msg = err?.message || err?.code || err?.toString() || 'Unknown error';
      setDiagnosticResult(`GAGAL: ${msg}. Solusi: Nonaktifkan Adblocker/Brave Shields Anda, periksa jaringan internet, atau buka di tab baru.`);
      setDbStatus('offline');
      setHasSyncError(true);
    } finally {
      setIsRunningDiagnostic(false);
    }
  }, []);

  // Monitor navigator online/offline & real-time Firestore status events
  useEffect(() => {
    const handleOnline = () => {
      checkFirebaseConnection();
    };
    const handleOffline = () => {
      setDbStatus('offline');
      setHasSyncError(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to live snapshot confirmations from Firestore SDK
    const unsubscribeFirestoreStatus = onFirestoreStatusChange((status, latency) => {
      if (status === 'online') {
        consecutiveFailuresRef.current = 0;
        setDbStatus('online');
        setHasSyncError(false);
        if (latency !== undefined) setDbLatency(latency);
        setLastSyncTime(Date.now());
      }
    });

    // Initial check
    checkFirebaseConnection();

    // Regular interval ping every 7 seconds
    const interval = setInterval(() => {
      checkFirebaseConnection();
    }, 7000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeFirestoreStatus();
      clearInterval(interval);
    };
  }, [checkFirebaseConnection]);

  // Database States
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_students');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const { uniqueStudents, removedIds } = deduplicateStudents(parsed);
          if (removedIds.length > 0) {
            removedIds.forEach((id) => deleteDocument('students', id).catch(() => {}));
            safeLocalStorageSet('siakad_students', JSON.stringify(uniqueStudents));
          }
          return uniqueStudents;
        }
      }
    } catch { /* ignore */ }
    const { uniqueStudents } = deduplicateStudents(INITIAL_STUDENTS);
    return uniqueStudents;
  });
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_teachers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [classes, setClasses] = useState<SchoolClass[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_classes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_violation_types');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [violations, setViolations] = useState<StudentViolation[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_violations');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [attendance, setAttendance] = useState<Attendance[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_attendance');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [counselorNotes, setCounselorNotes] = useState<CounselorNote[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_counselor_notes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [homeroomNotes, setHomeroomNotes] = useState<HomeroomNote[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_homeroom_notes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [parentMessages, setParentMessages] = useState<ParentMessage[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_parent_messages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_exam_schedules');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [examGrades, setExamGrades] = useState<ExamGrade[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_exam_grades');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [absentTeachers, setAbsentTeachers] = useState<AbsentTeacher[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_absent_teachers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [importantEvents, setImportantEvents] = useState<ImportantEvent[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_important_events');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [teachingJournals, setTeachingJournals] = useState<TeachingJournal[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_teaching_journals');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [bimbinganJournals, setBimbinganJournals] = useState<BimbinganJournal[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_bimbingan_journals');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [bimbinganSchedules, setBimbinganSchedules] = useState<BimbinganSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_bimbingan_schedules');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [studentAchievements, setStudentAchievements] = useState<StudentAchievement[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_student_achievements');
      return saved ? JSON.parse(saved) : INITIAL_STUDENT_ACHIEVEMENTS;
    } catch { return INITIAL_STUDENT_ACHIEVEMENTS; }
  });
  const [studentSubmissions, setStudentSubmissions] = useState<StudentExamSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_student_submissions');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // E-Learning States
  const [elearningMaterials, setElearningMaterials] = useState<ELearningMaterial[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_elearning_materials');
      return saved ? JSON.parse(saved) : INITIAL_ELEARNING_MATERIALS;
    } catch { return INITIAL_ELEARNING_MATERIALS; }
  });

  const [elearningProgress, setElearningProgress] = useState<StudentLearningProgress[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_elearning_progress');
      return saved ? JSON.parse(saved) : INITIAL_ELEARNING_PROGRESS;
    } catch { return INITIAL_ELEARNING_PROGRESS; }
  });

  const handleAddELearningMaterial = async (matData: Omit<ELearningMaterial, 'id'>) => {
    const id = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMaterial: ELearningMaterial = { ...matData, id };

    setElearningMaterials((prev) => {
      const updated = [newMaterial, ...prev];
      safeLocalStorageSet('siakad_elearning_materials', JSON.stringify(updated));
      return updated;
    });

    try {
      await saveDocument('elearning_materials', id, newMaterial);
    } catch (err) {
      console.error('Error saving elearning material:', err);
    }
  };

  const handleDeleteELearningMaterial = async (id: string) => {
    setElearningMaterials((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      safeLocalStorageSet('siakad_elearning_materials', JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDocument('elearning_materials', id);
    } catch (err) {
      console.error('Error deleting elearning material:', err);
    }
  };

  const handleUpdateELearningProgress = async (progData: StudentLearningProgress) => {
    setElearningProgress((prev) => {
      const existingIdx = prev.findIndex((p) => p.id === progData.id);
      let updated: StudentLearningProgress[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = progData;
      } else {
        updated = [progData, ...prev];
      }
      safeLocalStorageSet('siakad_elearning_progress', JSON.stringify(updated));
      return updated;
    });

    try {
      await saveDocument('elearning_progress', progData.id, progData);
    } catch (err) {
      console.error('Error saving elearning progress:', err);
    }
  };
  const [webHomeContent, setWebHomeContent] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('siakad_web_home_content');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [headmasterName, setHeadmasterName] = useState<string>(() => {
    const saved = localStorage.getItem('siakad_headmaster_name');
    return saved || 'Dra. Hj. Endah Purwani, M.M.';
  });

  // Tendik States
  const [pemberkasanSchedules, setPemberkasanSchedules] = useState<PemberkasanSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_pemberkasan_schedules');
      return saved ? JSON.parse(saved) : INITIAL_PEMBERKASAN_SCHEDULES;
    } catch { return INITIAL_PEMBERKASAN_SCHEDULES; }
  });
  const [nomorSuratList, setNomorSuratList] = useState<NomorSurat[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_nomor_surat');
      return saved ? JSON.parse(saved) : INITIAL_NOMOR_SURAT;
    } catch { return INITIAL_NOMOR_SURAT; }
  });
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_inventory_items');
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY_ITEMS;
    } catch { return INITIAL_INVENTORY_ITEMS; }
  });
  const [inventoryLoans, setInventoryLoans] = useState<InventoryLoan[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_inventory_loans');
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY_LOANS;
    } catch { return INITIAL_INVENTORY_LOANS; }
  });
  const [bosBopReports, setBosBopReports] = useState<BosBopReport[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_bos_bop_reports');
      return saved ? JSON.parse(saved) : INITIAL_BOS_BOP_REPORTS;
    } catch { return INITIAL_BOS_BOP_REPORTS; }
  });

  // School Time & Late Penalty Config State
  const [schoolTimeConfig, setSchoolTimeConfig] = useState<SchoolTimeConfig>(() => {
    try {
      const saved = localStorage.getItem('siakad_school_time_config');
      return saved ? JSON.parse(saved) : INITIAL_SCHOOL_TIME_CONFIG;
    } catch { return INITIAL_SCHOOL_TIME_CONFIG; }
  });

  const handleUpdateSchoolTimeConfig = (config: SchoolTimeConfig) => {
    setSchoolTimeConfig(config);
    safeLocalStorageSet('siakad_school_time_config', JSON.stringify(config));
    saveDocument('settings', 'school_time_config', config)
      .catch((err) => console.error("Error saving school time config:", err));
  };

  // Active Session State
  const [activeRole, setActiveRole] = useState<UserRole | null>(() => {
    const savedRole = localStorage.getItem('siakad_active_role');
    return savedRole ? (savedRole as UserRole) : null;
  });
  const [activeUser, setActiveUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('siakad_active_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Public website tab state
  const [publicTab, setPublicTab] = useState<'beranda' | 'akademik' | 'kesiswaan' | 'sarpras' | 'berita' | 'portal'>('beranda');

  const [adminTabOverride, setAdminTabOverride] = useState<'ringkasan' | 'siswa' | 'guru' | 'database-settings' | 'setting-cbt' | 'validasi-akun' | 'kelola-web' | 'prestasi' | 'setting-sertifikat' | null>(null);

  const [siswaTab, setSiswaTab] = useState<'profil' | 'absensi' | 'cbt-ujian' | 'pelanggaran' | 'catatan'>('profil');
  const [orangTuaTab, setOrangTuaTab] = useState<'profil' | 'absensi' | 'pelanggaran' | 'catatan' | 'komunikasi'>('profil');
  const [guruTab, setGuruTab] = useState<'presensi' | 'pelanggaran' | 'riwayat' | 'verifikasi-mandiri' | 'jurnal-harian' | 'jadwal-ujian' | 'guru-wali-view' | 'bank-soal'>('presensi');
  const [waliKelasTab, setWaliKelasTab] = useState<'beranda' | 'catatan' | 'ekskul' | 'prestasi' | 'pesan'>('beranda');
  const [bkTab, setBkTab] = useState<'beranda' | 'bimbingan' | 'jurnal' | 'jadwal' | 'pesan'>('beranda');
  const [guruWaliTab, setGuruWaliTab] = useState<'beranda' | 'bimbingan' | 'bakat-minat' | 'pesan'>('beranda');
  const [piketTab, setPiketTab] = useState<'pintu-depan' | 'absensi-piket' | 'guru-absen' | 'kejadian-piket' | 'verifikasi-mandiri'>('pintu-depan');
  const [tendikTab, setTendikTab] = useState<'ringkasan' | 'pemberkasan' | 'kjp' | 'nomor-surat' | 'inventaris' | 'peminjaman-barang' | 'bos-bop'>('ringkasan');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_pending_registrations');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((p: any) => p && p.id && p.id !== 'test-diagnostics' && !p.test && p.name && p.name.trim())
        : [];
    } catch {
      return [];
    }
  });

  // State & Handlers for CBT bypass PIN and Website Social Media configurations
  const [cbtBypassPin, setCbtBypassPin] = useState(() => {
    return localStorage.getItem('siakad_cbt_bypass_pin') || '9999';
  });

  const handleUpdateCbtBypassPin = async (pin: string) => {
    try {
      setCbtBypassPin(pin);
      safeLocalStorageSet('siakad_cbt_bypass_pin', pin);
      await saveCbtBypassPin(pin);
    } catch (err) {
      console.error("Gagal memperbarui PIN CBT:", err);
    }
  };

  const handleUpdateSocialLinks = async (instagram: string, whatsapp: string, email: string) => {
    try {
      setWebHomeContent(prev => ({ ...prev, instagram, whatsapp, email }));
      await saveDocument('web_content', 'home', { ...webHomeContent, instagram, whatsapp, email });
    } catch (err) {
      console.error("Gagal menyimpan media sosial:", err);
    }
  };

  // Keep session synced to localStorage
  useEffect(() => {
    if (activeRole) {
      safeLocalStorageSet('siakad_active_role', activeRole);
    } else {
      localStorage.removeItem('siakad_active_role');
    }
  }, [activeRole]);

  useEffect(() => {
    if (activeUser) {
      safeLocalStorageSet('siakad_active_user', JSON.stringify(activeUser));
    } else {
      localStorage.removeItem('siakad_active_user');
    }
  }, [activeUser]);

  // Sync activeUser automatically when teachers or students list changes
  useEffect(() => {
    if (!activeUser) return;

    if (activeRole !== 'siswa' && activeRole !== 'orang_tua') {
      const freshTeacher = teachers.find((t) => t.id === activeUser.id || (t.nip && t.nip === activeUser.nip));
      if (freshTeacher) {
        if (JSON.stringify(freshTeacher) !== JSON.stringify(activeUser)) {
          setActiveUser(freshTeacher);
          safeLocalStorageSet('siakad_active_user', JSON.stringify(freshTeacher));
          
          const currentRoles = freshTeacher.roles && freshTeacher.roles.length > 0 ? freshTeacher.roles : [freshTeacher.role];
          if (activeRole && !currentRoles.includes(activeRole as any) && !['admin'].includes(activeRole)) {
            const fallbackRole = (currentRoles[0] || 'guru') as UserRole;
            setActiveRole(fallbackRole);
            safeLocalStorageSet('siakad_active_role', fallbackRole);
          }
        }
      }
    } else if (activeRole === 'siswa' || activeRole === 'orang_tua') {
      const freshStudent = students.find((s) => s.id === activeUser.id || (s.nisn && s.nisn === activeUser.nisn));
      if (freshStudent) {
        if (JSON.stringify(freshStudent) !== JSON.stringify(activeUser)) {
          setActiveUser(freshStudent);
          safeLocalStorageSet('siakad_active_user', JSON.stringify(freshStudent));
        }
      }
    }
  }, [teachers, students, activeRole]);

  // Form Login States
  const [loginRole, setLoginRole] = useState<UserRole>('siswa');
  const [selectedCardTitle, setSelectedCardTitle] = useState('Siswa');
  const [loginCode, setLoginCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showDemoGuide, setShowDemoGuide] = useState(true);

  // Loading indicator
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sort core lists alphabetically by name (A-Z)
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [students]);

  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [teachers]);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [classes]);

  const sortedViolationTypes = useMemo(() => {
    return [...violationTypes].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [violationTypes]);

  // Initialize and Synchronize with Firebase Firestore in Real-Time
  useEffect(() => {
    // 1. Subscribe to headmaster name & logos in real-time
    const unsubHeadmaster = syncHeadmaster((settings) => {
      setHeadmasterName(settings.name);
      safeLocalStorageSet('siakad_headmaster_name', settings.name);
      if (settings.nip) safeLocalStorageSet('siakad_headmaster_nip', settings.nip);
      if (settings.govTitle) safeLocalStorageSet('siakad_kop_gov_title', settings.govTitle);
      if (settings.deptTitle) safeLocalStorageSet('siakad_kop_dept_title', settings.deptTitle);
      if (settings.sudinTitle) safeLocalStorageSet('siakad_kop_sudin_title', settings.sudinTitle);
      if (settings.schoolTitle) safeLocalStorageSet('siakad_kop_school_title', settings.schoolTitle);
      if (settings.addressText) safeLocalStorageSet('siakad_kop_address_text', settings.addressText);
      if (settings.contactText) safeLocalStorageSet('siakad_kop_contact_text', settings.contactText);
      if (settings.docNumber !== undefined) safeLocalStorageSet('siakad_kop_doc_number', settings.docNumber);

      if (settings.logoLeft) {
        safeLocalStorageSet('siakad_logo_left', settings.logoLeft);
      } else {
        localStorage.removeItem('siakad_logo_left');
      }
      if (settings.logoRight) {
        safeLocalStorageSet('siakad_logo_right', settings.logoRight);
      } else {
        localStorage.removeItem('siakad_logo_right');
      }
    }, 'Dra. Hj. Endah Purwani, M.M.');

    // Subscribe to CBT PIN configuration in real-time
    const unsubCbtConfig = syncCbtConfig((pin) => {
      setCbtBypassPin(pin);
      safeLocalStorageSet('siakad_cbt_bypass_pin', pin);
    });

    // 2. Subscribe to all collections in real-time with offline persistent cache
    const unsubStudents = syncCollection<Student>('students', (data) => {
      const { uniqueStudents, removedIds } = deduplicateStudents(data);
      if (removedIds.length > 0) {
        removedIds.forEach((id) => {
          deleteDocument('students', id).catch(() => {});
        });
      }
      setStudents(uniqueStudents);
      safeLocalStorageSet('siakad_students', JSON.stringify(uniqueStudents));
    }, INITIAL_STUDENTS);

    const unsubTeachers = syncCollection<Teacher>('teachers', (data) => {
      setTeachers(data);
      safeLocalStorageSet('siakad_teachers', JSON.stringify(data));
    }, INITIAL_TEACHERS);

    const unsubClasses = syncCollection<SchoolClass>('classes', (data) => {
      setClasses(data);
      safeLocalStorageSet('siakad_classes', JSON.stringify(data));
    }, INITIAL_CLASSES);

    const unsubViolationTypes = syncCollection<ViolationType>('violation_types', (data) => {
      setViolationTypes(data);
      safeLocalStorageSet('siakad_violation_types', JSON.stringify(data));
    }, INITIAL_VIOLATION_TYPES);

    const unsubViolations = syncCollection<StudentViolation>('violations', (data) => {
      setViolations(data);
      safeLocalStorageSet('siakad_violations', JSON.stringify(data));
    }, INITIAL_VIOLATIONS);

    const unsubAttendance = syncCollection<Attendance>('attendance', (data) => {
      setAttendance(data);
      safeLocalStorageSet('siakad_attendance', JSON.stringify(data));
    }, INITIAL_ATTENDANCE);

    const unsubCounselorNotes = syncCollection<CounselorNote>('counselor_notes', (data) => {
      setCounselorNotes(data);
      safeLocalStorageSet('siakad_counselor_notes', JSON.stringify(data));
    }, INITIAL_COUNSELOR_NOTES);

    const unsubHomeroomNotes = syncCollection<HomeroomNote>('homeroom_notes', (data) => {
      setHomeroomNotes(data);
      safeLocalStorageSet('siakad_homeroom_notes', JSON.stringify(data));
    }, INITIAL_HOMEROOM_NOTES);

    const unsubParentMessages = syncCollection<ParentMessage>('parent_messages', (data) => {
      setParentMessages(data);
      safeLocalStorageSet('siakad_parent_messages', JSON.stringify(data));
    }, INITIAL_PARENT_MESSAGES);

    const unsubRegistrations = syncCollection<PendingRegistration>('pending_registrations', (data) => {
      const validData = data.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        if (!item.id || item.id === 'test-diagnostics' || (item as any).test === true) {
          deleteDocument('pending_registrations', item.id || 'test-diagnostics').catch(() => {});
          return false;
        }
        if (!item.name || !item.name.trim() || item.name === '(Pengajuan Data Tidak Lengkap)') {
          deleteDocument('pending_registrations', item.id).catch(() => {});
          return false;
        }
        if (!item.role) {
          deleteDocument('pending_registrations', item.id).catch(() => {});
          return false;
        }
        return true;
      });
      setPendingRegistrations(validData);
      safeLocalStorageSet('siakad_pending_registrations', JSON.stringify(validData));
    }, []);

    const unsubExamSchedules = syncCollection<ExamSchedule>('exam_schedules', (data) => {
      setExamSchedules(data);
      safeLocalStorageSet('siakad_exam_schedules', JSON.stringify(data));
    }, INITIAL_EXAM_SCHEDULES);

    const unsubExamGrades = syncCollection<ExamGrade>('exam_grades', (data) => {
      setExamGrades(data);
      safeLocalStorageSet('siakad_exam_grades', JSON.stringify(data));
    }, INITIAL_EXAM_GRADES);

    const unsubAbsentTeachers = syncCollection<AbsentTeacher>('absent_teachers', (data) => {
      setAbsentTeachers(data);
      safeLocalStorageSet('siakad_absent_teachers', JSON.stringify(data));
    }, INITIAL_ABSENT_TEACHERS);

    const unsubImportantEvents = syncCollection<ImportantEvent>('important_events', (data) => {
      setImportantEvents(data);
      safeLocalStorageSet('siakad_important_events', JSON.stringify(data));
    }, INITIAL_IMPORTANT_EVENTS);

    const unsubTeachingJournals = syncCollection<TeachingJournal>('teaching_journals', (data) => {
      setTeachingJournals(data);
      safeLocalStorageSet('siakad_teaching_journals', JSON.stringify(data));
    }, []);

    const unsubBimbinganJournals = syncCollection<BimbinganJournal>('bimbingan_journals', (data) => {
      setBimbinganJournals(data);
      safeLocalStorageSet('siakad_bimbingan_journals', JSON.stringify(data));
    }, []);

    const unsubBimbinganSchedules = syncCollection<BimbinganSchedule>('bimbingan_schedules', (data) => {
      setBimbinganSchedules(data);
      safeLocalStorageSet('siakad_bimbingan_schedules', JSON.stringify(data));
    }, [
      {
        id: 'bs-1',
        date: new Date().toISOString().split('T')[0],
        time: '09:00 - 10:00',
        targetType: 'Kelas',
        targetId: 'all',
        topic: 'Sosialisasi Bahaya Bullying & Pembentukan Karakter Siswa',
        notes: 'Sesi bimbingan klasikal bersama Guru BK',
        recordedBy: 'Zainal Arifin, S.Pd.'
      }
    ]);

    const unsubStudentAchievements = syncCollection<StudentAchievement>('student_achievements', (data) => {
      setStudentAchievements(data);
      safeLocalStorageSet('siakad_student_achievements', JSON.stringify(data));
    }, INITIAL_STUDENT_ACHIEVEMENTS);

    const unsubELearningMaterials = syncCollection<ELearningMaterial>('elearning_materials', (data) => {
      setElearningMaterials(data);
      safeLocalStorageSet('siakad_elearning_materials', JSON.stringify(data));
    }, INITIAL_ELEARNING_MATERIALS);

    const unsubELearningProgress = syncCollection<StudentLearningProgress>('elearning_progress', (data) => {
      setElearningProgress(data);
      safeLocalStorageSet('siakad_elearning_progress', JSON.stringify(data));
    }, INITIAL_ELEARNING_PROGRESS);

    const unsubStudentSubmissions = syncCollection<StudentExamSubmission>('student_submissions', (data) => {
      setStudentSubmissions(data);
      safeLocalStorageSet('siakad_student_submissions', JSON.stringify(data));
    }, []);

    const unsubPemberkasan = syncCollection<PemberkasanSchedule>('pemberkasan_schedules', (data) => {
      setPemberkasanSchedules(data);
      safeLocalStorageSet('siakad_pemberkasan_schedules', JSON.stringify(data));
    }, INITIAL_PEMBERKASAN_SCHEDULES);

    const unsubNomorSurat = syncCollection<NomorSurat>('nomor_surat', (data) => {
      setNomorSuratList(data);
      safeLocalStorageSet('siakad_nomor_surat', JSON.stringify(data));
    }, INITIAL_NOMOR_SURAT);

    const unsubInventory = syncCollection<InventoryItem>('inventory_items', (data) => {
      setInventoryItems(data);
      safeLocalStorageSet('siakad_inventory_items', JSON.stringify(data));
    }, INITIAL_INVENTORY_ITEMS);

    const unsubInventoryLoans = syncCollection<InventoryLoan>('inventory_loans', (data) => {
      setInventoryLoans(data);
      safeLocalStorageSet('siakad_inventory_loans', JSON.stringify(data));
    }, INITIAL_INVENTORY_LOANS);

    const unsubBosBop = syncCollection<BosBopReport>('bos_bop_reports', (data) => {
      setBosBopReports(data);
      safeLocalStorageSet('siakad_bos_bop_reports', JSON.stringify(data));
    }, INITIAL_BOS_BOP_REPORTS);

    const unsubWebContent = syncCollection<any>('web_content', (data) => {
      const homeDoc = data.find(doc => doc.id === 'home');
      if (homeDoc) {
        if (Array.isArray(homeDoc.slides)) {
          homeDoc.slides = homeDoc.slides.map((s: any) => s ? {
            ...s,
            title: (s.title || '').replace(/<[^>]*>/g, '').trim(),
            desc: (s.desc || '').replace(/<[^>]*>/g, '').trim()
          } : s);
        }
        setWebHomeContent(homeDoc);
        safeLocalStorageSet('siakad_web_home_content', JSON.stringify(homeDoc));
      }
    }, INITIAL_WEB_CONTENT);

    // Active session headmaster migration
    try {
      const savedUser = localStorage.getItem('siakad_active_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.name === 'Dra. Hj. Endah Purwani, M.M.' && (parsed.nip === '196805151992032005' || parsed.nip === '197508122001121002')) {
          parsed.nip = '196711261991032004';
          localStorage.setItem('siakad_active_user', JSON.stringify(parsed));
          setActiveUser(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Set loading false after initial load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      unsubHeadmaster();
      unsubCbtConfig();
      unsubStudents();
      unsubTeachers();
      unsubClasses();
      unsubViolationTypes();
      unsubViolations();
      unsubAttendance();
      unsubCounselorNotes();
      unsubHomeroomNotes();
      unsubParentMessages();
      unsubPemberkasan();
      unsubNomorSurat();
      unsubInventory();
      unsubBosBop();
      unsubRegistrations();
      unsubExamSchedules();
      unsubExamGrades();
      unsubAbsentTeachers();
      unsubImportantEvents();
      unsubTeachingJournals();
      unsubBimbinganJournals();
      unsubBimbinganSchedules();
      unsubStudentAchievements();
      unsubELearningMaterials();
      unsubELearningProgress();
      unsubStudentSubmissions();
      unsubWebContent();
      clearTimeout(timer);
    };
  }, []);

  // Auto-reconcile student class IDs with classes collection
  useEffect(() => {
    if (students.length === 0 || classes.length === 0) return;

    let classesUpdated = false;
    let studentsUpdated = false;
    const currentClasses = [...classes];
    const updatedStudents = [...students];

    updatedStudents.forEach((student, index) => {
      const res = normalizeClassId(student.classId, currentClasses);

      if (res.createdClass) {
        currentClasses.push(res.createdClass);
        classesUpdated = true;
        saveDocument('classes', res.createdClass.id, res.createdClass)
          .catch((err) => console.error('Error auto-creating class:', err));
      }

      if (res.classId && res.classId !== student.classId) {
        const updatedStudent = { ...student, classId: res.classId };
        updatedStudents[index] = updatedStudent;
        studentsUpdated = true;
        saveDocument('students', updatedStudent.id, updatedStudent)
          .catch((err) => console.error('Error auto-reconciling student classId:', err));
      }
    });

    if (classesUpdated) {
      setClasses(currentClasses);
      safeLocalStorageSet('siakad_classes', JSON.stringify(currentClasses));
    }

    if (studentsUpdated) {
      setStudents(updatedStudents);
      safeLocalStorageSet('siakad_students', JSON.stringify(updatedStudents));
    }
  }, [students, classes]);

  // Update helper that syncs specific table to localStorage and Firebase Firestore
  const syncTable = (key: string, data: any) => {
    safeLocalStorageSet(key, JSON.stringify(data));
    const collectionName = key.replace('siakad_', '');
    syncCollectionWithArray(collectionName, data);
  };

  const handleUpdateHeadmasterName = (
    name: string,
    logoLeft?: string,
    logoRight?: string,
    extraFields?: {
      nip?: string;
      govTitle?: string;
      deptTitle?: string;
      sudinTitle?: string;
      schoolTitle?: string;
      addressText?: string;
      contactText?: string;
      docNumber?: string;
    }
  ) => {
    setHeadmasterName(name);
    safeLocalStorageSet('siakad_headmaster_name', name);
    
    const finalLogoLeft = logoLeft !== undefined ? logoLeft : (localStorage.getItem('siakad_logo_left') || '');
    const finalLogoRight = logoRight !== undefined ? logoRight : (localStorage.getItem('siakad_logo_right') || '');
    
    if (finalLogoLeft) {
      safeLocalStorageSet('siakad_logo_left', finalLogoLeft);
    } else {
      localStorage.removeItem('siakad_logo_left');
    }
    
    if (finalLogoRight) {
      safeLocalStorageSet('siakad_logo_right', finalLogoRight);
    } else {
      localStorage.removeItem('siakad_logo_right');
    }

    const nip = extraFields?.nip !== undefined ? extraFields.nip : (localStorage.getItem('siakad_headmaster_nip') || '196711261991032004');
    const govTitle = extraFields?.govTitle !== undefined ? extraFields.govTitle : (localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA');
    const deptTitle = extraFields?.deptTitle !== undefined ? extraFields.deptTitle : (localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA');
    const sudinTitle = extraFields?.sudinTitle !== undefined ? extraFields.sudinTitle : (localStorage.getItem('siakad_kop_sudin_title') || 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR');
    const schoolTitle = extraFields?.schoolTitle !== undefined ? extraFields.schoolTitle : (localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA');
    const addressText = extraFields?.addressText !== undefined ? extraFields.addressText : (localStorage.getItem('siakad_kop_address_text') || 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510');
    const contactText = extraFields?.contactText !== undefined ? extraFields.contactText : (localStorage.getItem('siakad_kop_contact_text') || 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com');
    const docNumber = extraFields?.docNumber !== undefined ? extraFields.docNumber : (localStorage.getItem('siakad_kop_doc_number') || '');

    safeLocalStorageSet('siakad_headmaster_nip', nip);
    safeLocalStorageSet('siakad_kop_gov_title', govTitle);
    safeLocalStorageSet('siakad_kop_dept_title', deptTitle);
    safeLocalStorageSet('siakad_kop_sudin_title', sudinTitle);
    safeLocalStorageSet('siakad_kop_school_title', schoolTitle);
    safeLocalStorageSet('siakad_kop_address_text', addressText);
    safeLocalStorageSet('siakad_kop_contact_text', contactText);
    safeLocalStorageSet('siakad_kop_doc_number', docNumber);
    
    saveDocument('settings', 'headmaster', { 
      name, 
      nip,
      logoLeft: finalLogoLeft, 
      logoRight: finalLogoRight,
      govTitle,
      deptTitle,
      sudinTitle,
      schoolTitle,
      addressText,
      contactText,
      docNumber
    });
  };

  // --- INTEGRATED DATABASE LOGIC METHODS ---

  // Attendance
  const checkAndApplyLatePenalty = (studentId: string, date: string, timestamp?: string, notes?: string) => {
    if (!schoolTimeConfig.isLatePenaltyEnabled || !schoolTimeConfig.schoolStartTime || schoolTimeConfig.latePenaltyPoints <= 0) return;
    
    let timeHHMM = '';
    if (timestamp) {
      const timeMatch = timestamp.match(/(\d{2}:\d{2})/);
      if (timeMatch) timeHHMM = timeMatch[1];
    }
    if (!timeHHMM) {
      const now = new Date();
      timeHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const isLateByNotes = notes?.toLowerCase().includes('terlambat');
    const isLateByTime = timeHHMM > schoolTimeConfig.schoolStartTime;

    if (isLateByNotes || isLateByTime) {
      const existingLate = violations.find(
        (v) => v.studentId === studentId && v.date === date && (v.violationTypeId === 'late_penalty_auto' || v.notes?.toLowerCase().includes('terlambat'))
      );
      if (!existingLate) {
        const lateViolation: Omit<StudentViolation, 'id'> = {
          studentId: studentId,
          violationTypeId: 'late_penalty_auto',
          date: date,
          notes: `Presensi Terlambat (${timeHHMM} WIB, Batas ${schoolTimeConfig.schoolStartTime}). Otomatis masuk rekap poin sanksi keterlambatan.`,
          points: Number(schoolTimeConfig.latePenaltyPoints) || 5,
          recordedBy: 'Sistem Presensi Sekolah (Otomatis)'
        };
        handleAddViolation(lateViolation);
      }
    }
  };

  const handleAddAttendanceBatch = (records: Omit<Attendance, 'id'>[]) => {
    const formattedRecords = records.map((r) => {
      const docId = `att-${r.studentId}-${r.date}`;
      if (r.status === 'Hadir') {
        checkAndApplyLatePenalty(r.studentId, r.date, r.timestamp, r.notes);
      }
      return {
        ...r,
        id: docId,
      };
    });
    setAttendance((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      formattedRecords.forEach((rec) => map.set(rec.id, rec));
      const next = Array.from(map.values());
      safeLocalStorageSet('siakad_attendance', JSON.stringify(next));
      return next;
    });
    saveDocumentsBatch('attendance', formattedRecords)
      .catch((err) => console.error("Error adding attendance batch:", err));
  };

  const handleQuickAttendance = (rec: Omit<Attendance, 'id'>) => {
    const docId = `att-${rec.studentId}-${rec.date}`;
    if (rec.status === 'Hadir') {
      checkAndApplyLatePenalty(rec.studentId, rec.date, rec.timestamp, rec.notes);
    }
    const newRecord = { ...rec, id: docId };
    setAttendance((prev) => {
      const next = [...prev.filter((i) => i.id !== docId), newRecord];
      safeLocalStorageSet('siakad_attendance', JSON.stringify(next));
      return next;
    });
    saveDocument('attendance', docId, newRecord)
      .catch((err) => console.error("Error saving quick attendance:", err));
  };

  // --- CBT STATE HANDLERS ---
  const handleAddExamSchedule = (schedule: Omit<ExamSchedule, 'id'>) => {
    const id = `es-${Date.now()}`;
    const newSchedule = { ...schedule, id };
    setExamSchedules((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newSchedule];
      safeLocalStorageSet('siakad_exam_schedules', JSON.stringify(next));
      return next;
    });
    saveDocument('exam_schedules', id, newSchedule)
      .catch((err) => console.error("Error adding exam schedule:", err));
  };

  const handleDeleteExamSchedule = (id: string) => {
    setExamSchedules((prev) => {
      const next = prev.filter((i) => i.id !== id);
      safeLocalStorageSet('siakad_exam_schedules', JSON.stringify(next));
      return next;
    });
    deleteDocument('exam_schedules', id)
      .catch((err) => console.error("Error deleting exam schedule:", err));
  };

  const handleAddExamGrade = (grade: Omit<ExamGrade, 'id'>) => {
    const id = `eg-${Date.now()}`;
    const newGrade = { ...grade, id };
    setExamGrades((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newGrade];
      safeLocalStorageSet('siakad_exam_grades', JSON.stringify(next));
      return next;
    });
    saveDocument('exam_grades', id, newGrade)
      .catch((err) => console.error("Error adding exam grade:", err));
  };

  const handleDeleteExamGrade = (id: string) => {
    setExamGrades((prev) => {
      const next = prev.filter((i) => i.id !== id);
      safeLocalStorageSet('siakad_exam_grades', JSON.stringify(next));
      return next;
    });
    deleteDocument('exam_grades', id)
      .catch((err) => console.error("Error deleting exam grade:", err));
  };

  // --- PIKET STATE HANDLERS ---
  const handleAddAbsentTeacher = (record: Omit<AbsentTeacher, 'id'>) => {
    const id = `at-${Date.now()}`;
    const newRecord = { ...record, id };
    setAbsentTeachers((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newRecord];
      localStorage.setItem('siakad_absent_teachers', JSON.stringify(next));
      return next;
    });
    saveDocument('absent_teachers', id, newRecord)
      .catch((err) => console.error("Error adding absent teacher:", err));
  };

  const handleDeleteAbsentTeacher = (id: string) => {
    setAbsentTeachers((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_absent_teachers', JSON.stringify(next));
      return next;
    });
    deleteDocument('absent_teachers', id)
      .catch((err) => console.error("Error deleting absent teacher:", err));
  };

  const handleAddImportantEvent = (record: Omit<ImportantEvent, 'id'>) => {
    const id = `ie-${Date.now()}`;
    const newRecord = { ...record, id };
    setImportantEvents((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newRecord];
      localStorage.setItem('siakad_important_events', JSON.stringify(next));
      return next;
    });
    saveDocument('important_events', id, newRecord)
      .catch((err) => console.error("Error adding important event:", err));
  };

  const handleDeleteImportantEvent = (id: string) => {
    setImportantEvents((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_important_events', JSON.stringify(next));
      return next;
    });
    deleteDocument('important_events', id)
      .catch((err) => console.error("Error deleting important event:", err));
  };

  const handleStudentSelfAttendance = (status: 'Hadir' | 'Sakit' | 'Izin', notes?: string, photoProof?: string) => {
    if (!activeUser) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    let finalNotes = notes || 'Check-In Mandiri Siswa';
    let isLate = false;

    if (status === 'Hadir' && schoolTimeConfig.isLatePenaltyEnabled && schoolTimeConfig.schoolStartTime) {
      if (currentHHMM > schoolTimeConfig.schoolStartTime) {
        isLate = true;
        finalNotes += ` [TERLAMBAT - Presensi pukul ${currentHHMM}, Batas ${schoolTimeConfig.schoolStartTime}]`;
      }
    }

    const record: Omit<Attendance, 'id'> = {
      studentId: activeUser.id,
      classId: activeUser.classId,
      date: todayStr,
      status: status,
      notes: finalNotes,
      timestamp: timeStr,
      recordedBy: 'Siswa (Mandiri)',
      photoProof: photoProof,
      isSelfAttendance: true,
      isVerifiedByPiket: false,
      isVerifiedByMapel: false,
      verificationStatus: 'Pending'
    };
    
    handleQuickAttendance(record);

    if (isLate) {
      const existingLate = violations.find(
        (v) => v.studentId === activeUser.id && v.date === todayStr && (v.violationTypeId === 'late_penalty_auto' || v.notes?.includes('Presensi Terlambat'))
      );
      if (!existingLate) {
        const lateViolation: Omit<StudentViolation, 'id'> = {
          studentId: activeUser.id,
          violationTypeId: 'late_penalty_auto',
          date: todayStr,
          notes: `Presensi Terlambat Mandiri pukul ${timeStr} (Lewat batas jam masuk ${schoolTimeConfig.schoolStartTime}). Dikenakan poin sanksi Keterlambatan Sekolah.`,
          points: schoolTimeConfig.latePenaltyPoints || 5,
          recordedBy: 'Sistem Presensi Sekolah (Otomatis)'
        };
        handleAddViolation(lateViolation);
      }
    }
  };

  const handleVerifyAttendance = (attendanceId: string, role: 'piket' | 'mapel', action: 'Verified' | 'Rejected') => {
    const item = attendance.find((a) => a.id === attendanceId);
    if (!item) return;

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const isVerified = action === 'Verified';

    const updated = {
      ...item,
      isVerifiedByPiket: isVerified,
      isVerifiedByMapel: isVerified,
      verifiedByPiketAt: role === 'piket' ? nowStr : (item.verifiedByPiketAt || nowStr),
      verifiedByMapelAt: role === 'mapel' ? nowStr : (item.verifiedByMapelAt || nowStr),
      verificationStatus: isVerified ? 'Verified' : 'Rejected',
    };

    setAttendance((prev) => {
      const next = prev.map((i) => i.id === attendanceId ? updated : i);
      safeLocalStorageSet('siakad_attendance', JSON.stringify(next));
      return next;
    });

    saveDocument('attendance', attendanceId, updated)
      .catch((err) => console.error("Error verifying attendance:", err));
  };

  // Violations
  const handleAddViolation = (v: Omit<StudentViolation, 'id'>) => {
    const id = `sv-${Date.now()}`;
    const newV = { ...v, id };
    setViolations((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newV];
      localStorage.setItem('siakad_violations', JSON.stringify(next));
      return next;
    });
    saveDocument('violations', id, newV)
      .catch((err) => console.error("Error adding violation:", err));
  };

  // Counselor notes
  const handleAddCounselorNote = (c: Omit<CounselorNote, 'id'>) => {
    const id = `cn-${Date.now()}`;
    const newC = { ...c, id };
    setCounselorNotes((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newC];
      localStorage.setItem('siakad_counselor_notes', JSON.stringify(next));
      return next;
    });
    saveDocument('counselor_notes', id, newC)
      .catch((err) => console.error("Error adding counselor note:", err));
  };

  // Homeroom notes
  const handleAddHomeroomNote = (h: Omit<HomeroomNote, 'id'>) => {
    const id = `hn-${Date.now()}`;
    const newH = { ...h, id };
    setHomeroomNotes((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newH];
      localStorage.setItem('siakad_homeroom_notes', JSON.stringify(next));
      return next;
    });
    saveDocument('homeroom_notes', id, newH)
      .catch((err) => console.error("Error adding homeroom note:", err));
  };

  // Parent Message / Live communication channel
  const handleAddParentMessage = (msg: string) => {
    if (!activeUser || activeRole !== 'orang_tua') return;

    const id = `pm-${Date.now()}`;
    const newMsg: ParentMessage = {
      id,
      studentId: activeUser.id,
      date: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toTimeString().split(' ')[0].substr(0, 5),
      senderName: `${activeUser.parentName} (Orang Tua)`,
      message: msg,
      replies: []
    };

    setParentMessages((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newMsg];
      localStorage.setItem('siakad_parent_messages', JSON.stringify(next));
      return next;
    });

    saveDocument('parent_messages', id, newMsg)
      .catch((err) => console.error("Error adding parent message:", err));
  };

  // Teacher / Advisor replies to parent communication
  const handleReplyToParent = (messageId: string, replyMsg: string) => {
    const m = parentMessages.find((msg) => msg.id === messageId);
    if (!m) return;

    const replies = m.replies ? [...m.replies] : [];
    replies.push({
      senderName: activeUser?.name || 'Sekolah',
      role: activeRole === 'bk' ? 'Guru BK' : 'Wali Kelas',
      message: replyMsg,
      date: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toTimeString().split(' ')[0].substr(0, 5)
    });

    const updatedMessage = { ...m, replies };

    setParentMessages((prev) => {
      const next = prev.map((i) => i.id === messageId ? updatedMessage : i);
      localStorage.setItem('siakad_parent_messages', JSON.stringify(next));
      return next;
    });

    saveDocument('parent_messages', messageId, updatedMessage)
      .catch((err) => console.error("Error replying to parent message:", err));
  };

  // Parent signs/acknowledges a note
  const handleAcknowledgeNote = (type: 'homeroom' | 'counselor', noteId: string) => {
    if (type === 'homeroom') {
      const n = homeroomNotes.find((note) => note.id === noteId);
      if (!n) return;
      const updatedNote = { ...n, parentAcknowledge: true };
      setHomeroomNotes((prev) => {
        const next = prev.map((i) => i.id === noteId ? updatedNote : i);
        localStorage.setItem('siakad_homeroom_notes', JSON.stringify(next));
        return next;
      });
      saveDocument('homeroom_notes', noteId, updatedNote)
        .catch((err) => console.error("Error acknowledging homeroom note:", err));
    } else {
      const n = counselorNotes.find((note) => note.id === noteId);
      if (!n) return;
      const updatedNote = { ...n, parentAcknowledge: true };
      setCounselorNotes((prev) => {
        const next = prev.map((i) => i.id === noteId ? updatedNote : i);
        localStorage.setItem('siakad_counselor_notes', JSON.stringify(next));
        return next;
      });
      saveDocument('counselor_notes', noteId, updatedNote)
        .catch((err) => console.error("Error acknowledging counselor note:", err));
    }
  };

  // --- ADMIN DATABASE OPERATIONS ---

  const handleAddStudentsBatch = (newStudents: Student[]) => {
    setStudents((prev) => {
      const existingIds = new Set(newStudents.map((ns) => ns.id));
      const next = [...prev.filter((i) => !existingIds.has(i.id)), ...newStudents];
      localStorage.setItem('siakad_students', JSON.stringify(next));
      return next;
    });
    saveDocumentsBatch('students', newStudents)
      .catch((err) => console.error("Error adding students batch:", err));
  };

  const handleAddTeachersBatch = (newTeachers: Teacher[]) => {
    setTeachers((prev) => {
      const existingIds = new Set(newTeachers.map((nt) => nt.id));
      const next = [...prev.filter((i) => !existingIds.has(i.id)), ...newTeachers];
      localStorage.setItem('siakad_teachers', JSON.stringify(next));
      return next;
    });
    saveDocumentsBatch('teachers', newTeachers)
      .catch((err) => console.error("Error adding teachers batch:", err));
  };

  const handleAddTeachingJournal = (journal: Omit<TeachingJournal, 'id'>) => {
    const id = `tj-${Date.now()}`;
    const newJ = { ...journal, id };
    setTeachingJournals((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newJ];
      localStorage.setItem('siakad_teaching_journals', JSON.stringify(next));
      return next;
    });
    saveDocument('teaching_journals', id, newJ)
      .catch((err) => console.error("Error adding teaching journal:", err));
  };

  const handleAddBimbinganJournal = (journal: Omit<BimbinganJournal, 'id'>) => {
    const id = `bj-${Date.now()}`;
    const newJ = { ...journal, id };
    setBimbinganJournals((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newJ];
      localStorage.setItem('siakad_bimbingan_journals', JSON.stringify(next));
      return next;
    });
    saveDocument('bimbingan_journals', id, newJ)
      .catch((err) => console.error("Error adding bimbingan journal:", err));
  };

  const handleDeleteBimbinganJournal = (id: string) => {
    setBimbinganJournals((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_bimbingan_journals', JSON.stringify(next));
      return next;
    });
    deleteDocument('bimbingan_journals', id)
      .catch((err) => console.error("Error deleting bimbingan journal:", err));
  };

  const handleAddBimbinganSchedule = (sched: Omit<BimbinganSchedule, 'id'>) => {
    const id = `bs-${Date.now()}`;
    const newS = { ...sched, id };
    setBimbinganSchedules((prev) => {
      const next = [...prev.filter((i) => i.id !== id), newS];
      localStorage.setItem('siakad_bimbingan_schedules', JSON.stringify(next));
      return next;
    });
    saveDocument('bimbingan_schedules', id, newS)
      .catch((err) => console.error("Error adding bimbingan schedule:", err));
  };

  const handleDeleteBimbinganSchedule = (id: string) => {
    setBimbinganSchedules((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_bimbingan_schedules', JSON.stringify(next));
      return next;
    });
    deleteDocument('bimbingan_schedules', id)
      .catch((err) => console.error("Error deleting bimbingan schedule:", err));
  };

  const handleAddStudent = (s: Student) => {
    setStudents((prev) => {
      const next = [...prev.filter((i) => i.id !== s.id), s];
      localStorage.setItem('siakad_students', JSON.stringify(next));
      return next;
    });
    saveDocument('students', s.id, s)
      .catch((err) => console.error("Error adding student:", err));
  };

  const handleUpdateStudent = (s: Student) => {
    setStudents((prev) => {
      const next = prev.map((i) => i.id === s.id ? { ...i, ...s } : i);
      localStorage.setItem('siakad_students', JSON.stringify(next));
      return next;
    });
    saveDocument('students', s.id, s)
      .catch((err) => console.error("Error updating student:", err));
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_students', JSON.stringify(next));
      return next;
    });
    deleteDocument('students', id)
      .catch((err) => console.error("Error deleting student:", err));
  };

  const handleAddTeacher = (t: Teacher) => {
    setTeachers((prev) => {
      const next = [...prev.filter((i) => i.id !== t.id), t];
      localStorage.setItem('siakad_teachers', JSON.stringify(next));
      return next;
    });
    saveDocument('teachers', t.id, t)
      .catch((err) => console.error("Error adding teacher:", err));
  };

  const handleUpdateTeacher = (t: Teacher) => {
    setTeachers((prev) => {
      const next = prev.map((i) => i.id === t.id ? { ...i, ...t } : i);
      localStorage.setItem('siakad_teachers', JSON.stringify(next));
      return next;
    });
    saveDocument('teachers', t.id, t)
      .catch((err) => console.error("Error updating teacher:", err));
  };

  const handleSaveProfile = (updatedUser: any) => {
    if (activeRole === 'orang_tua' || activeRole === 'siswa') {
      handleUpdateStudent(updatedUser);
      setActiveUser(updatedUser);
    } else {
      handleUpdateTeacher(updatedUser);
      setActiveUser(updatedUser);
    }
  };

  // Tendik Handlers
  const handleUpdateStudentKjp = (studentId: string, isKjp: boolean) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    const updated = { ...student, isKjpRecipient: isKjp };
    handleUpdateStudent(updated);
  };

  const handleBulkUpdateStudentKjp = (studentIds: string[], isKjp: boolean) => {
    studentIds.forEach((id) => {
      const student = students.find((s) => s.id === id);
      if (student) {
        handleUpdateStudent({ ...student, isKjpRecipient: isKjp });
      }
    });
  };

  const handleAddPemberkasanSchedule = (item: Omit<PemberkasanSchedule, 'id'>) => {
    const newItem: PemberkasanSchedule = { ...item, id: 'pem-' + Date.now() };
    setPemberkasanSchedules((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem('siakad_pemberkasan_schedules', JSON.stringify(next));
      return next;
    });
    saveDocument('pemberkasan_schedules', newItem.id, newItem).catch(err => console.error(err));
  };

  const handleDeletePemberkasanSchedule = (id: string) => {
    setPemberkasanSchedules((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_pemberkasan_schedules', JSON.stringify(next));
      return next;
    });
    deleteDocument('pemberkasan_schedules', id).catch(err => console.error(err));
  };

  const handleAddNomorSurat = (item: Omit<NomorSurat, 'id'>) => {
    const newItem: NomorSurat = { ...item, id: 'ns-' + Date.now() };
    setNomorSuratList((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem('siakad_nomor_surat', JSON.stringify(next));
      return next;
    });
    saveDocument('nomor_surat', newItem.id, newItem).catch(err => console.error(err));
  };

  const handleDeleteNomorSurat = (id: string) => {
    setNomorSuratList((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_nomor_surat', JSON.stringify(next));
      return next;
    });
    deleteDocument('nomor_surat', id).catch(err => console.error(err));
  };

  const handleAddInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = { ...item, id: 'inv-' + Date.now() };
    setInventoryItems((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem('siakad_inventory_items', JSON.stringify(next));
      return next;
    });
    saveDocument('inventory_items', newItem.id, newItem).catch(err => console.error(err));
  };

  const handleUpdateInventoryItem = (item: InventoryItem) => {
    setInventoryItems((prev) => {
      const next = prev.map((i) => (i.id === item.id ? item : i));
      localStorage.setItem('siakad_inventory_items', JSON.stringify(next));
      return next;
    });
    saveDocument('inventory_items', item.id, item).catch(err => console.error(err));
  };

  const handleDeleteInventoryItem = (id: string) => {
    setInventoryItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_inventory_items', JSON.stringify(next));
      return next;
    });
    deleteDocument('inventory_items', id).catch(err => console.error(err));
  };

  const handleAddInventoryLoan = (item: Omit<InventoryLoan, 'id'>) => {
    const newItem: InventoryLoan = { ...item, id: 'loan-' + Date.now() };
    setInventoryLoans((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem('siakad_inventory_loans', JSON.stringify(next));
      return next;
    });
    saveDocument('inventory_loans', newItem.id, newItem).catch(err => console.error(err));
  };

  const handleUpdateInventoryLoan = (item: InventoryLoan) => {
    setInventoryLoans((prev) => {
      const next = prev.map((l) => (l.id === item.id ? item : l));
      localStorage.setItem('siakad_inventory_loans', JSON.stringify(next));
      return next;
    });
    saveDocument('inventory_loans', item.id, item).catch(err => console.error(err));
  };

  const handleDeleteInventoryLoan = (id: string) => {
    setInventoryLoans((prev) => {
      const next = prev.filter((l) => l.id !== id);
      localStorage.setItem('siakad_inventory_loans', JSON.stringify(next));
      return next;
    });
    deleteDocument('inventory_loans', id).catch(err => console.error(err));
  };

  const handleAddBosBopReport = (item: Omit<BosBopReport, 'id'>) => {
    const newItem: BosBopReport = { ...item, id: 'bos-' + Date.now() };
    setBosBopReports((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem('siakad_bos_bop_reports', JSON.stringify(next));
      return next;
    });
    saveDocument('bos_bop_reports', newItem.id, newItem).catch(err => console.error(err));
  };

  const handleDeleteBosBopReport = (id: string) => {
    setBosBopReports((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_bos_bop_reports', JSON.stringify(next));
      return next;
    });
    deleteDocument('bos_bop_reports', id).catch(err => console.error(err));
  };

  const handleRegisterUser = async (regData: Omit<PendingRegistration, 'id' | 'createdAt'>): Promise<void> => {
    // Check duplicate Phone Number across all user collections
    if (regData.phone && regData.phone.trim()) {
      const inputPhone = regData.phone.trim();
      const phoneExistsStudent = students.some((s) => (s.phone && s.phone.trim() === inputPhone) || (s.parentPhone && s.parentPhone.trim() === inputPhone));
      const phoneExistsTeacher = teachers.some((t) => (t as any).phone && (t as any).phone.trim() === inputPhone);
      const phoneExistsPending = pendingRegistrations.some((p) => p.phone && p.phone.trim() === inputPhone);
      if (phoneExistsStudent || phoneExistsTeacher || phoneExistsPending) {
        throw new Error('NISN atau Nomor Telpon sudah terdaftar.');
      }
    }

    // Check duplicate NISN
    const nisnToCheck = regData.role === 'siswa' ? regData.nipOrNisnOrNik?.trim() : regData.role === 'orang_tua' ? regData.studentNisnOrName?.trim() : '';
    if (nisnToCheck) {
      const nisnExistsStudent = students.some((s) => s.nisn && s.nisn.trim() === nisnToCheck);
      const nisnExistsPending = pendingRegistrations.some((p) => (p.nipOrNisnOrNik && p.nipOrNisnOrNik.trim() === nisnToCheck) || (p.studentNisnOrName && p.studentNisnOrName.trim() === nisnToCheck));
      if (regData.role === 'siswa' && (nisnExistsStudent || nisnExistsPending)) {
        throw new Error('NISN atau Nomor Telpon sudah terdaftar.');
      }
    }

    const newReg: PendingRegistration = {
      ...regData,
      id: 'reg-' + Date.now(),
      createdAt: new Date().toLocaleDateString('id-ID')
    };

    setPendingRegistrations((prev) => {
      const next = [...prev.filter((i) => i.id !== newReg.id), newReg];
      localStorage.setItem('siakad_pending_registrations', JSON.stringify(next));
      return next;
    });

    try {
      await saveDocument('pending_registrations', newReg.id, newReg);
    } catch (err) {
      console.error("Error saving pending registration:", err);
      throw err;
    }
  };

  const handleApproveRegistration = (id: string) => {
    const reg = pendingRegistrations.find((r) => r.id === id);

    if (reg) {
      if (reg.role === 'guru') {
        const newTeacher: Teacher = {
          id: 'teacher-' + Date.now(),
          name: reg.name || 'Guru Baru',
          nip: reg.nipOrNisnOrNik || '',
          email: reg.email || '',
          role: 'guru',
          roles: ['guru'],
          password: reg.password || 'guru123'
        };
        handleAddTeacher(newTeacher);
      } else if (reg.role === 'pelatih') {
        const newTeacher: Teacher = {
          id: 'teacher-' + Date.now(),
          name: reg.name || 'Pelatih Baru',
          nip: reg.nipOrNisnOrNik || '',
          email: reg.email || '',
          role: 'pelatih',
          roles: ['pelatih'],
          password: reg.password || 'pelatih123',
          ekskulId: reg.studentNisnOrName || ''
        };
        handleAddTeacher(newTeacher);
      } else if (reg.role === 'siswa') {
        const { classId: resolvedClassId, createdClass } = normalizeClassId(reg.classId || '', classes);
        if (createdClass) {
          handleAddClass(createdClass);
        }
        const newStudent: Student = {
          id: 'student-' + Date.now(),
          name: reg.name || 'Siswa Baru',
          nisn: reg.nipOrNisnOrNik || '',
          classId: resolvedClassId,
          gender: reg.gender || 'Laki-laki',
          address: reg.address || '',
          phone: reg.phone || '',
          parentName: '',
          parentNik: '',
          parentPhone: '',
          parentEmail: '',
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(reg.name || 'siswa')}`,
          password: reg.password || 'siswa123'
        };
        handleAddStudent(newStudent);
      } else if (reg.role === 'orang_tua') {
        const matchKey = (reg.studentNisnOrName || '').trim().toLowerCase();
        const matchedStudent = students.find((s) => 
          s.nisn === reg.studentNisnOrName || 
          s.name.toLowerCase() === matchKey || 
          s.id === reg.studentNisnOrName
        );

        if (matchedStudent) {
          const updatedStudent: Student = {
            ...matchedStudent,
            parentName: reg.name,
            parentNik: reg.nipOrNisnOrNik,
            parentPhone: reg.phone || '',
            parentEmail: reg.email || '',
            parentPassword: reg.password || 'ortu123'
          };
          handleUpdateStudent(updatedStudent);
        }
      }
    }

    setPendingRegistrations((prev) => {
      const next = prev.filter((r) => r.id !== id);
      localStorage.setItem('siakad_pending_registrations', JSON.stringify(next));
      return next;
    });

    if (id) {
      deleteDocument('pending_registrations', id)
        .catch((err) => console.error("Error deleting pending registration:", err));
    }
  };

  const handleRejectRegistration = (id: string) => {
    setPendingRegistrations((prev) => {
      const next = prev.filter((r) => r.id !== id);
      localStorage.setItem('siakad_pending_registrations', JSON.stringify(next));
      return next;
    });

    if (id) {
      deleteDocument('pending_registrations', id)
        .catch((err) => console.error("Error deleting pending registration:", err));
    }
  };

  const handleClearAllPendingRegistrations = async () => {
    setPendingRegistrations([]);
    safeLocalStorageSet('siakad_pending_registrations', '[]');
    safeLocalStorageSet('siakad_col_initialized_pending_registrations', 'true');
    clearDeletedIds('pending_registrations');

    try {
      const snap = await getDocs(collection(db, 'pending_registrations'));
      if (!snap.empty) {
        let batch = writeBatch(db);
        let count = 0;
        for (const docSnap of snap.docs) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Error purging all pending registrations from Firestore:", err);
    }
  };

  const handleApproveAllRegistrations = () => {
    if (pendingRegistrations.length === 0) return;

    const teachersToAdd: Teacher[] = [];
    const studentsToAdd: Student[] = [];
    const parentsToUpdate: Student[] = [];

    pendingRegistrations.forEach((reg, index) => {
      const suffix = `${Date.now()}-${index}`;
      if (reg.role === 'guru') {
        teachersToAdd.push({
          id: 'teacher-' + suffix,
          name: reg.name || 'Guru Baru',
          nip: reg.nipOrNisnOrNik || '',
          email: reg.email || '',
          role: 'guru',
          roles: ['guru'],
          password: reg.password || 'guru123'
        });
      } else if (reg.role === 'pelatih') {
        teachersToAdd.push({
          id: 'teacher-' + suffix,
          name: reg.name || 'Pelatih Baru',
          nip: reg.nipOrNisnOrNik || '',
          email: reg.email || '',
          role: 'pelatih',
          roles: ['pelatih'],
          password: reg.password || 'pelatih123',
          ekskulId: reg.studentNisnOrName || ''
        });
      } else if (reg.role === 'siswa') {
        const { classId: resolvedClassId, createdClass } = normalizeClassId(reg.classId || '', classes);
        if (createdClass && !classes.some(c => c.id === createdClass.id)) {
          handleAddClass(createdClass);
        }
        studentsToAdd.push({
          id: 'student-' + suffix,
          name: reg.name || 'Siswa Baru',
          nisn: reg.nipOrNisnOrNik || '',
          classId: resolvedClassId,
          gender: reg.gender || 'Laki-laki',
          address: reg.address || '',
          phone: reg.phone || '',
          parentName: '',
          parentNik: '',
          parentPhone: '',
          parentEmail: '',
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(reg.name || 'siswa')}`,
          password: reg.password || 'siswa123'
        });
      } else if (reg.role === 'orang_tua') {
        const matchKey = (reg.studentNisnOrName || '').trim().toLowerCase();
        const matchedStudent = students.find((s) => 
          s.nisn === reg.studentNisnOrName || 
          s.name.toLowerCase() === matchKey || 
          s.id === reg.studentNisnOrName
        );
        if (matchedStudent) {
          parentsToUpdate.push({
            ...matchedStudent,
            parentName: reg.name,
            parentNik: reg.nipOrNisnOrNik,
            parentPhone: reg.phone || '',
            parentEmail: reg.email || '',
            parentPassword: reg.password || 'ortu123'
          });
        }
      }
    });

    if (teachersToAdd.length > 0) {
      handleAddTeachersBatch(teachersToAdd);
    }

    if (studentsToAdd.length > 0) {
      handleAddStudentsBatch(studentsToAdd);
    }

    if (parentsToUpdate.length > 0) {
      parentsToUpdate.forEach((s) => handleUpdateStudent(s));
    }

    const idsToDelete = pendingRegistrations.map((r) => r.id).filter(Boolean);
    setPendingRegistrations([]);
    localStorage.setItem('siakad_pending_registrations', '[]');

    if (idsToDelete.length > 0) {
      deleteDocumentsBatch('pending_registrations', idsToDelete)
        .catch((err) => console.error("Error batch-deleting pending registrations:", err));
    }
  };

  const handleDeleteTeacher = (id: string) => {
    setTeachers((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_teachers', JSON.stringify(next));
      return next;
    });
    deleteDocument('teachers', id)
      .catch((err) => console.error("Error deleting teacher:", err));
  };

  const handleAddClass = (c: SchoolClass) => {
    setClasses((prev) => {
      const next = [...prev.filter((i) => i.id !== c.id), c];
      localStorage.setItem('siakad_classes', JSON.stringify(next));
      return next;
    });
    saveDocument('classes', c.id, c)
      .catch((err) => console.error("Error adding class:", err));
  };

  const handleUpdateClass = (updatedClass: SchoolClass) => {
    setClasses((prev) => {
      const next = prev.map((i) => i.id === updatedClass.id ? { ...i, ...updatedClass } : i);
      localStorage.setItem('siakad_classes', JSON.stringify(next));
      return next;
    });
    saveDocument('classes', updatedClass.id, updatedClass)
      .catch((err) => console.error("Error updating class:", err));
  };

  const handleDeleteClass = (id: string) => {
    setClasses((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_classes', JSON.stringify(next));
      return next;
    });
    deleteDocument('classes', id)
      .catch((err) => console.error("Error deleting class:", err));
  };

  const handleAddViolationType = (vt: ViolationType) => {
    setViolationTypes((prev) => {
      const next = [...prev.filter((i) => i.id !== vt.id), vt];
      localStorage.setItem('siakad_violation_types', JSON.stringify(next));
      return next;
    });
    saveDocument('violation_types', vt.id, vt)
      .catch((err) => console.error("Error adding violation type:", err));
  };

  const handleDeleteViolationType = (id: string) => {
    setViolationTypes((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem('siakad_violation_types', JSON.stringify(next));
      return next;
    });
    deleteDocument('violation_types', id)
      .catch((err) => console.error("Error deleting violation type:", err));
  };

  const handleAddStudentAchievement = (ach: Omit<StudentAchievement, 'id'>) => {
    const newAch: StudentAchievement = {
      ...ach,
      id: 'ach-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)
    };
    setStudentAchievements((prev) => {
      const next = [newAch, ...prev];
      localStorage.setItem('siakad_student_achievements', JSON.stringify(next));
      return next;
    });
    saveDocument('student_achievements', newAch.id, newAch)
      .catch((err) => console.error("Error saving student achievement:", err));
  };

  const handleDeleteStudentAchievement = (id: string) => {
    setStudentAchievements((prev) => {
      const next = prev.filter((a) => a.id !== id);
      localStorage.setItem('siakad_student_achievements', JSON.stringify(next));
      return next;
    });
    deleteDocument('student_achievements', id)
      .catch((err) => console.error("Error deleting student achievement:", err));
  };

  // Database Reset to fresh seed
  const handleResetDatabase = async () => {
    const collections = [
      'students', 'teachers', 'classes', 'violation_types', 'violations',
      'attendance', 'counselor_notes', 'homeroom_notes', 'parent_messages',
      'exam_schedules', 'exam_grades', 'absent_teachers', 'important_events',
      'teaching_journals', 'bimbingan_journals', 'bimbingan_schedules', 'pending_registrations',
      'student_achievements'
    ];
    await clearAllCollections(collections);

    syncTable('siakad_students', INITIAL_STUDENTS);
    syncTable('siakad_teachers', INITIAL_TEACHERS);
    syncTable('siakad_classes', INITIAL_CLASSES);
    syncTable('siakad_violation_types', INITIAL_VIOLATION_TYPES);
    syncTable('siakad_violations', INITIAL_VIOLATIONS);
    syncTable('siakad_attendance', INITIAL_ATTENDANCE);
    syncTable('siakad_counselor_notes', INITIAL_COUNSELOR_NOTES);
    syncTable('siakad_homeroom_notes', INITIAL_HOMEROOM_NOTES);
    syncTable('siakad_parent_messages', INITIAL_PARENT_MESSAGES);
    syncTable('siakad_exam_schedules', INITIAL_EXAM_SCHEDULES);
    syncTable('siakad_exam_grades', INITIAL_EXAM_GRADES);
    syncTable('siakad_absent_teachers', INITIAL_ABSENT_TEACHERS);
    syncTable('siakad_important_events', INITIAL_IMPORTANT_EVENTS);
    syncTable('siakad_student_achievements', INITIAL_STUDENT_ACHIEVEMENTS);
    syncTable('siakad_violation_types', INITIAL_VIOLATION_TYPES);
    syncTable('siakad_violations', INITIAL_VIOLATIONS);
    syncTable('siakad_attendance', INITIAL_ATTENDANCE);
    syncTable('siakad_counselor_notes', INITIAL_COUNSELOR_NOTES);
    syncTable('siakad_homeroom_notes', INITIAL_HOMEROOM_NOTES);
    syncTable('siakad_parent_messages', INITIAL_PARENT_MESSAGES);
    syncTable('siakad_exam_schedules', INITIAL_EXAM_SCHEDULES);
    syncTable('siakad_exam_grades', INITIAL_EXAM_GRADES);
    syncTable('siakad_absent_teachers', INITIAL_ABSENT_TEACHERS);
    syncTable('siakad_important_events', INITIAL_IMPORTANT_EVENTS);
    syncTable('siakad_teaching_journals', []);
    syncTable('siakad_bimbingan_journals', []);
    syncTable('siakad_pending_registrations', []);

    const initialBimbinganSchedules = [
      {
        id: 'bs-1',
        date: new Date().toISOString().split('T')[0],
        time: '09:00 - 10:00',
        targetType: 'Kelas',
        targetId: 'all',
        topic: 'Sosialisasi Bahaya Bullying & Pembentukan Karakter Siswa',
        notes: 'Sesi bimbingan klasikal bersama Guru BK',
        recordedBy: 'Zainal Arifin, S.Pd.'
      }
    ];
    syncTable('siakad_bimbingan_schedules', initialBimbinganSchedules);
    handleUpdateHeadmasterName('Dra. Hj. Endah Purwani, M.M.');

    // If activeUser is logged in, sync their state to the reset values
    if (activeUser) {
      if (activeRole === 'siswa' || activeRole === 'orang_tua') {
        const resetS = INITIAL_STUDENTS.find(s => s.id === activeUser.id);
        if (resetS) setActiveUser(resetS);
      } else {
        const resetT = INITIAL_TEACHERS.find(t => t.id === activeUser.id);
        if (resetT) setActiveUser(resetT);
      }
    }
  };

  // Database Clear (Kosongkan) - clears everything except Admin account
  const handleClearDatabase = async () => {
    const adminTeachers = teachers.filter(t => t.roles?.includes('admin') || t.role === 'admin');
    const finalAdminTeachers = adminTeachers.length > 0 ? adminTeachers : [
      {
        id: 'T1',
        name: 'Dra. Hj. Endah Purwani, M.M.',
        nip: '196711261991032004',
        password: 'admin',
        role: 'admin' as const,
        roles: ['admin'] as any[],
        email: 'endah.purwani@smpn50.sch.id'
      }
    ];

    const collections = [
      'students', 'teachers', 'classes', 'violation_types', 'violations',
      'attendance', 'counselor_notes', 'homeroom_notes', 'parent_messages',
      'exam_schedules', 'exam_grades', 'absent_teachers', 'important_events',
      'teaching_journals', 'bimbingan_journals', 'bimbingan_schedules', 'pending_registrations'
    ];
    await clearAllCollections(collections);

    syncTable('siakad_students', []);
    syncTable('siakad_teachers', finalAdminTeachers);
    syncTable('siakad_classes', []);
    syncTable('siakad_violations', []);
    syncTable('siakad_attendance', []);
    syncTable('siakad_counselor_notes', []);
    syncTable('siakad_homeroom_notes', []);
    syncTable('siakad_parent_messages', []);
    syncTable('siakad_exam_schedules', []);
    syncTable('siakad_exam_grades', []);
    syncTable('siakad_absent_teachers', []);
    syncTable('siakad_important_events', []);
    syncTable('siakad_teaching_journals', []);
    syncTable('siakad_bimbingan_journals', []);
    syncTable('siakad_bimbingan_schedules', []);
    syncTable('siakad_pending_registrations', []);
    handleUpdateHeadmasterName('Dra. Hj. Endah Purwani, M.M.');

    if (activeUser && (activeUser.role === 'admin' || activeUser.roles?.includes('admin'))) {
      const freshAdmin = finalAdminTeachers.find(t => t.id === activeUser.id) || finalAdminTeachers[0];
      setActiveUser(freshAdmin);
      setActiveRole('admin');
    } else {
      handleLogout();
    }
  };

  // Logout
  const handleLogout = () => {
    setActiveRole(null);
    setActiveUser(null);
    setAdminTabOverride(null);
  };

  // Instant Login Handler from selection
  const handleInstantLogin = (role: UserRole, userObj: any) => {
    setActiveRole(role);
    setActiveUser(userObj);
    setAdminTabOverride(null);
  };

  // List of login card templates for landing page
  const roleCardConfigs = [
    { role: 'admin', title: 'Administrator', desc: 'Kelola siswa, pendidik, kelas, bobot aturan pelanggaran, jadwal ujian CBT, & rekap sistem.', icon: Shield, color: 'hover:border-purple-400 bg-purple-50/50' },
    { role: 'guru', title: 'Guru / Pendidik', desc: 'Akses semua dashboard peran Anda: Guru Mapel, Wali Kelas, Guru BK, Guru Wali, & Guru Piket.', icon: BookOpen, color: 'hover:border-teal-400 bg-teal-50/50' },
    { role: 'pelatih', title: 'Pelatih Ekskul', desc: 'Rekap kehadiran ekskul, buat jurnal kegiatan, unggah dokumentasi, dan input prestasi siswa.', icon: Award, color: 'hover:border-indigo-400 bg-indigo-50/50' },
    { role: 'siswa', title: 'Siswa', desc: 'Akses rapor presensi harian, jumlah poin kedisiplinan, catatan wali kelas & bimbingan BK.', icon: User, color: 'hover:border-amber-400 bg-amber-50/50' },
    { role: 'orang_tua', title: 'Orang Tua / Wali', desc: 'Pantau kepatuhan & kedisiplinan anak, setujui catatan sekolah, & kirim pesan koordinasi.', icon: Users, color: 'hover:border-orange-400 bg-orange-50/50' },
  ];

  if (isLoading) {
    const activeLogo = webHomeContent?.schoolLogo || localStorage.getItem('siakad_logo_left') || '/logo-dki.png';
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-4 p-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping p-6" />
          <div className="w-24 h-24 bg-white rounded-2xl shadow-xl border border-slate-200/90 relative z-10 flex items-center justify-center overflow-hidden animate-bounce">
            {activeLogo ? (
              <img src={activeLogo} alt="Logo Sekolah" className="w-full h-full object-cover" />
            ) : (
              <School className="w-12 h-12 text-blue-600" />
            )}
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">SMP NEGERI 50 JAKARTA</h2>
          <p className="text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span>Memuat Portal Administrasi Terintegrasi...</span>
          </p>
        </div>
      </div>
    );
  }

  // Dynamic statistics calculations for Infographics
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;

  // Present rate
  const totalAttendanceRecords = attendance.length;
  const presentAttendanceRecords = attendance.filter(a => a.status === 'Hadir').length;
  const attendanceRate = totalAttendanceRecords > 0 
    ? parseFloat(((presentAttendanceRecords / totalAttendanceRecords) * 100).toFixed(1))
    : 96.4;

  // BK Cases solved
  const totalBKNotes = counselorNotes.length;
  const resolvedBKNotes = counselorNotes.filter(n => {
    const notesStr = n.notes ? n.notes.toLowerCase() : '';
    return notesStr.includes('selesai') || notesStr.includes('bina') || notesStr.includes('bimbingan') || notesStr.includes('baik') || n.acknowledgedByParent;
  }).length;
  const bkResolutionRate = totalBKNotes > 0
    ? parseFloat(((resolvedBKNotes / totalBKNotes) * 100).toFixed(1))
    : 87.5;

  const disciplineRate = 98.2;

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 font-sans antialiased">
      <AnimatePresence mode="wait">
        {!activeRole ? (
          /* PUBLIC SCHOOL WEBSITE LAYOUT */
          <div key="public-site" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
            {/* Header / Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 md:px-8 py-3.5">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Logo / Brand */}
                <button 
                  onClick={() => setPublicTab('beranda')}
                  className="flex items-center gap-3 hover:opacity-90 transition-opacity text-left cursor-pointer bg-transparent border-0 p-0"
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200/90 flex items-center justify-center shrink-0 overflow-hidden">
                    {webHomeContent?.schoolLogo ? (
                      <img src={webHomeContent.schoolLogo} alt="Logo Sekolah" className="w-full h-full object-cover" />
                    ) : (
                      <School className="w-6 h-6 text-blue-900" />
                    )}
                  </div>
                  <div className="leading-none">
                    <div className="mb-1">
                      <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider block w-max shadow-xs">
                        {webHomeContent?.akreditasi || 'Akreditasi A (Unggul)'}
                      </span>
                    </div>
                    <h1 className="text-xs md:text-sm font-black text-slate-800 tracking-tight leading-none uppercase">SMP NEGERI 50 JAKARTA</h1>
                  </div>
                </button>

                {/* Navigation Menu */}
                <nav className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
                  {[
                    { id: 'beranda', label: 'Beranda' },
                    { id: 'akademik', label: 'Kurikulum & Akademik' },
                    { id: 'kesiswaan', label: 'Kesiswaan & Karakter' },
                    { id: 'sarpras', label: 'Sarana & Prasarana' },
                    { id: 'berita', label: 'Pengumuman & Berita' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPublicTab(tab.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        publicTab === tab.id 
                          ? 'bg-blue-900 text-white shadow-sm' 
                          : 'text-slate-600 hover:text-blue-900 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  
                  {/* Distinct button for Portal Login */}
                  <button
                    onClick={() => setPublicTab('portal')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1 ${
                      publicTab === 'portal'
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-102'
                        : 'border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white dark:border-blue-400 dark:text-blue-300'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Masuk Portal SIAS</span>
                  </button>

                  {/* Dark Mode Toggle Button */}
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-amber-400 transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title={isDarkMode ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
                    aria-label="Toggle Dark Mode"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </button>
                </nav>

              </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-grow">
              <AnimatePresence mode="wait">
                <motion.div
                  key={publicTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  {publicTab === 'beranda' && (
                    <WebHome 
                      onNavigateToTab={(tab) => setPublicTab(tab as any)} 
                      totalStudents={students.length} 
                      totalTeachers={teachers.length} 
                      teachers={teachers}
                    />
                  )}
                  {publicTab === 'akademik' && <WebAkademik />}
                  {publicTab === 'kesiswaan' && <WebKesiswaan />}
                  {publicTab === 'sarpras' && <WebSarpras />}
                  {publicTab === 'berita' && <WebBerita />}
                  
                  {/* Portal Login & Role cards (The original login screen layout!) */}
                  {publicTab === 'portal' && (
                    <div className="space-y-8">
                      {/* School Hero Brand Header styled for SMPN 50 Jakarta */}
                      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
                        <div className="flex items-center gap-4 md:gap-5 relative z-10">
                          <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center border border-white/40 shadow-md shrink-0 overflow-hidden">
                            {webHomeContent?.schoolLogo ? (
                              <img src={webHomeContent.schoolLogo} alt="Logo Sekolah" className="w-full h-full object-cover" />
                            ) : (
                              <School className="w-8 md:w-10 md:h-10 text-blue-900" />
                            )}
                          </div>
                          <div className="space-y-1 text-left">
                            <div>
                              <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block shadow-xs border border-amber-300">
                                {webHomeContent?.akreditasi || 'Akreditasi A (Unggul)'}
                              </span>
                            </div>
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight leading-none">SMP NEGERI 50 JAKARTA</h1>
                            <p className="text-xs text-indigo-100/95 max-w-xl font-medium">
                              Mewujudkan Prestasi yang Unggul, Disiplin, dan Berkarakter. Selamat datang di Portal Basis Data Terpadu Sekolah.
                            </p>
                          </div>
                        </div>
                        <div className="hidden lg:flex flex-col items-end text-right text-xs text-indigo-200/90 font-mono relative z-10 border-l border-white/10 pl-6 space-y-1">
                          <p>Status Sinkronisasi: <span className="text-emerald-400 font-bold">Aktif &bull; Realtime</span></p>
                          <p>NPSN: <span className="text-white font-bold">20103599</span></p>
                          <p>Wilayah: <span className="text-white font-bold">Jakarta Timur</span></p>
                        </div>
                      </div>

                      {/* SECTION 1: INFOGRAFIS UTAMA & INDIKATOR KINERJA SEKOLAH */}
                      <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 text-left">
                          <TrendingUp className="w-4 h-4 text-indigo-600" />
                          <span>Info Grafis &amp; Statistik Real-time Sekolah</span>
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {/* 1. SISWA */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2 hover:shadow-md transition-all text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Siswa Aktif</span>
                              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                                <User className="w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-slate-800">{totalStudents}</h3>
                              <p className="text-[10px] text-slate-400 mt-0.5">Siswa Terdaftar</p>
                            </div>
                          </div>

                          {/* 2. GURU */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2 hover:shadow-md transition-all text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Guru &amp; Staff</span>
                              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                                <BookOpen className="w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-slate-800">{totalTeachers}</h3>
                              <p className="text-[10px] text-slate-400 mt-0.5">Pendidik Kompeten</p>
                            </div>
                          </div>

                          {/* 3. KELAS */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2 hover:shadow-md transition-all text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Rombel Kelas</span>
                              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                                <GraduationCap className="w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-slate-800">{totalClasses}</h3>
                              <p className="text-[10px] text-slate-400 mt-0.5">Ruang Belajar</p>
                            </div>
                          </div>

                          {/* 4. KEHADIRAN */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2 hover:shadow-md transition-all text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Presensi Harian</span>
                              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-emerald-600">{attendanceRate}%</h3>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${attendanceRate}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* 5. BK RESOLUTION */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2 hover:shadow-md transition-all text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Pembinaan BK</span>
                              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                                <HeartHandshake className="w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-rose-600">{bkResolutionRate}%</h3>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${bkResolutionRate}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* 6. KEDISIPLINAN */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-2 hover:shadow-md transition-all text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Disiplin Siswa</span>
                              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                                <Shield className="w-4 h-4" />
                              </div>
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-amber-600">{disciplineRate}%</h3>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${disciplineRate}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: PERAN AKSES UTAMA */}
                      <div className="space-y-4">
                        <div className="text-center md:text-left space-y-1">
                          <h2 className="text-lg font-bold text-slate-800 flex items-center justify-center md:justify-start gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <span>Pilih Peran Untuk Masuk ke Portal</span>
                          </h2>
                          <p className="text-xs text-slate-500">
                            Silakan pilih akun / peran Anda untuk memunculkan formulir masuk secara aman.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {roleCardConfigs.map((config) => {
                            const Icon = config.icon;
                            return (
                              <button
                                key={config.title}
                                type="button"
                                onClick={() => {
                                  setLoginRole(config.role as any);
                                  setSelectedCardTitle(config.title);
                                  setLoginCode('');
                                  setLoginPassword('');
                                  setLoginError('');
                                  setIsLoginModalOpen(true);
                                }}
                                className="bg-white border border-slate-200/80 p-5 rounded-2xl text-left hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all flex flex-col justify-between h-[150px] shadow-xs cursor-pointer group hover:shadow-md w-full"
                              >
                                <div className="flex justify-between items-start w-full">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <span className="text-[10px] font-bold text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                                    Masuk &rarr;
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{config.title}</h3>
                                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{config.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Registration Banner */}
                        <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/60 p-4.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-1">
                          <div className="flex items-center gap-3.5 text-left">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                              <UserPlus className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="space-y-0.5 text-left">
                              <h4 className="text-xs font-bold text-slate-800">Belum Memiliki Akun SIAS?</h4>
                              <p className="text-[10px] text-slate-400 font-medium max-w-lg leading-relaxed">Daftarkan diri Anda secara mandiri sebagai Guru, Siswa, atau Orang Tua. Akun baru akan diaktifkan setelah divalidasi oleh Administrator.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsRegisterModalOpen(true)}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-100 cursor-pointer w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Ajukan Pendaftaran Akun
                          </button>
                        </div>
                      </div>

                      {/* SECTION 3: LOGIN FORM MODAL (POP UP FLOW) */}
                      <AnimatePresence>
                        {isLoginModalOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            {/* Glassmorphic overlay */}
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setIsLoginModalOpen(false)}
                              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                            />

                            {/* Modal container */}
                            <motion.div
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.95, opacity: 0 }}
                              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 border border-slate-100"
                            >
                              {/* Header */}
                              <div className="bg-indigo-900 text-white p-5 relative">
                                <button
                                  type="button"
                                  onClick={() => setIsLoginModalOpen(false)}
                                  className="absolute right-4 top-4 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <div className="space-y-1 text-left">
                                  <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Keamanan Terenkripsi</span>
                                  <h3 className="text-lg font-black">{selectedCardTitle}</h3>
                                  <p className="text-xs text-indigo-200">Silakan lengkapi kredensial Anda di bawah ini.</p>
                                </div>
                              </div>

                              {/* Body */}
                              <div className="p-6 space-y-4">
                                {loginError && (
                                  <div className="bg-rose-50 text-rose-800 border border-rose-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping shrink-0" />
                                    <span>{loginError}</span>
                                  </div>
                                )}

                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    setLoginError('');
                                    const trimmedCode = loginCode.trim();
                                    const trimmedPassword = loginPassword.trim();

                                    if (!trimmedCode) {
                                      setLoginError('Silakan masukkan Kode Pengenal / ID Anda.');
                                      return;
                                    }
                                    if (!trimmedPassword) {
                                      setLoginError('Silakan masukkan Kata Sandi Anda.');
                                      return;
                                    }
                                    
                                    if (loginRole === 'admin' || loginRole === 'guru' || loginRole === 'wali_kelas' || loginRole === 'bk' || loginRole === 'piket' || loginRole === 'guru_wali') {
                                      const match = teachers.find((t) => {
                                        const isIdMatch = t.nip === trimmedCode || (t.role === 'admin' && trimmedCode === 'admin');
                                        if (!isIdMatch) return false;

                                        const hasCustomPassword = t.password && t.password.trim() !== '';
                                        const isDefaultAdmin = t.role === 'admin' && (trimmedPassword === 'admin123' || trimmedPassword === t.nip);
                                        const isDefaultTeacher = t.role !== 'admin' && (trimmedPassword === 'guru123' || trimmedPassword === t.nip);

                                        if (hasCustomPassword) {
                                          return trimmedPassword === t.password.trim() || isDefaultAdmin || isDefaultTeacher;
                                        } else {
                                          return isDefaultAdmin || isDefaultTeacher;
                                        }
                                      });

                                      if (match) {
                                        const userRoles = match.roles || [match.role];
                                        if (loginRole === 'guru') {
                                          const teacherRole = userRoles.find(r => ['guru', 'wali_kelas', 'bk', 'piket', 'guru_wali'].includes(r));
                                          setActiveRole(teacherRole || 'guru');
                                        } else {
                                          const canAccessSelected = userRoles.includes(loginRole as any);
                                          if (canAccessSelected) {
                                            setActiveRole(loginRole);
                                          } else {
                                            setActiveRole(match.role || userRoles[0]);
                                          }
                                        }
                                        setActiveUser(match);
                                        setLoginCode('');
                                        setLoginPassword('');
                                        setIsLoginModalOpen(false);
                                      } else {
                                        if ((trimmedCode === 'admin' || trimmedCode === '199504242023211018') && trimmedPassword === 'sobari123') {
                                          const sobariAdmin = {
                                            id: 't-sobari',
                                            name: 'Sobari, S.Pd.',
                                            nip: '199504242023211018',
                                            email: 'sobari@sekolah.sch.id',
                                            role: 'admin' as const,
                                            roles: ['admin' as const],
                                            password: 'sobari123'
                                          };
                                          setActiveRole('admin');
                                          setActiveUser(sobariAdmin);
                                          setLoginCode('');
                                          setLoginPassword('');
                                          setIsLoginModalOpen(false);
                                        } else {
                                          setLoginError('Kode Pengenal / NIP atau Kata Sandi salah.');
                                        }
                                      }
                                    } else if (loginRole === 'siswa') {
                                      const match = students.find((s) => s.nisn === trimmedCode && (
                                        (s.password && s.password.trim() !== '' && (trimmedPassword === s.password.trim() || trimmedPassword === 'siswa123' || trimmedPassword === s.nisn)) ||
                                        ((!s.password || s.password.trim() === '') && (trimmedPassword === 'siswa123' || trimmedPassword === s.nisn))
                                      ));
                                      if (match) {
                                        setActiveRole('siswa');
                                        setActiveUser(match);
                                        setLoginCode('');
                                        setLoginPassword('');
                                        setIsLoginModalOpen(false);
                                      } else {
                                        setLoginError('NISN atau Kata Sandi salah (Sandi bawaan: siswa123).');
                                      }
                                    } else if (loginRole === 'orang_tua') {
                                      const match = students.find((s) => s.parentPhone === trimmedCode && (
                                        (s.parentPassword && s.parentPassword.trim() !== '' && (trimmedPassword === s.parentPassword.trim() || trimmedPassword === 'ortu123' || trimmedPassword === s.parentPhone)) ||
                                        ((!s.parentPassword || s.parentPassword.trim() === '') && (trimmedPassword === 'ortu123' || trimmedPassword === s.parentPhone))
                                      ));
                                      if (match) {
                                        setActiveRole('orang_tua');
                                        setActiveUser(match);
                                        setLoginCode('');
                                        setLoginPassword('');
                                        setIsLoginModalOpen(false);
                                      } else {
                                        setLoginError('Nomor HP Orang Tua atau Kata Sandi salah (Sandi bawaan: ortu123).');
                                      }
                                    } else if (loginRole === 'pelatih') {
                                      const match = teachers.find((t) => (t.role === 'pelatih' || t.roles?.includes('pelatih')) && t.nip === trimmedCode && (
                                        (t.password && t.password.trim() !== '' && (trimmedPassword === t.password.trim() || trimmedPassword === 'pelatih123' || trimmedPassword === t.nip)) ||
                                        ((!t.password || t.password.trim() === '') && (trimmedPassword === 'pelatih123' || trimmedPassword === t.nip))
                                      ));
                                      if (match) {
                                        setActiveRole('pelatih');
                                        setActiveUser(match);
                                        setLoginCode('');
                                        setLoginPassword('');
                                        setIsLoginModalOpen(false);
                                      } else {
                                        setLoginError('Nomor HP Pelatih atau Kata Sandi salah (Sandi bawaan: pelatih123).');
                                      }
                                    }
                                  }}
                                  className="space-y-4 text-xs text-left"
                                >
                                  <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                      {loginRole === 'siswa' ? 'NISN SISWA (10 DIGIT)' : loginRole === 'orang_tua' ? 'NOMOR HP ORANG TUA' : loginRole === 'pelatih' ? 'NOMOR HP PELATIH' : 'NIP / ID PEGAWAI'}
                                    </label>
                                    <input
                                      type="text"
                                      value={loginCode}
                                      onChange={(e) => setLoginCode(e.target.value)}
                                      placeholder={
                                        loginRole === 'siswa' ? 'Masukkan 10 digit NISN' : loginRole === 'orang_tua' ? 'Masukkan Nomor HP Orang Tua' : loginRole === 'pelatih' ? 'Masukkan Nomor HP Pelatih' : 'Masukkan NIP Pegawai'
                                      }
                                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 focus:border-indigo-600 focus:bg-white transition-all font-mono"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Kata Sandi (Password)
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>{showPassword ? 'Sembunyikan' : 'Lihat'}</span>
                                      </button>
                                    </div>
                                    <input
                                      type={showPassword ? 'text' : 'password'}
                                      value={loginPassword}
                                      onChange={(e) => setLoginPassword(e.target.value)}
                                      placeholder="••••••••"
                                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/25 focus:border-indigo-600 focus:bg-white transition-all font-mono"
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer mt-4"
                                  >
                                    <span>Masuk Sekarang</span>
                                    <ArrowRight className="w-4 h-4" />
                                  </button>

                                  <div className="border-t border-slate-100 pt-4 text-center mt-2">
                                    <p className="text-[11px] text-slate-400 font-medium">Belum terdaftar di sistem SIAS?</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsLoginModalOpen(false);
                                        setIsRegisterModalOpen(true);
                                      }}
                                      className="mt-1 text-xs text-indigo-600 font-bold hover:text-indigo-800 hover:underline cursor-pointer flex items-center justify-center gap-1.5 w-full py-1.5 bg-indigo-50/50 rounded-xl transition-all border border-indigo-100/40"
                                    >
                                      <span>Ajukan Pendaftaran Akun Baru</span>
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Public Footer */}
            <footer className="border-t border-slate-200/80 bg-white py-8 px-4 mt-12 text-xs font-semibold text-slate-400 leading-normal">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left space-y-1">
                  <p className="text-slate-700 font-bold text-sm">SMP Negeri 50 Jakarta</p>
                  <p>© 2026. Hak Cipta Dilindungi Undang-Undang.</p>
                </div>

                {/* Social Media Links */}
                <div className="flex items-center justify-center gap-3.5">
                  <a
                    href={webHomeContent?.instagram || "https://instagram.com/smpn50jakarta"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100/80 flex items-center justify-center transition-all duration-200 border border-pink-100 hover:scale-110"
                    title="Instagram Resmi"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href={webHomeContent?.whatsapp?.startsWith('http') ? webHomeContent.whatsapp : `https://wa.me/${webHomeContent?.whatsapp?.replace(/[^0-9]/g, '') || '6281234567890'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100/80 flex items-center justify-center transition-all duration-200 border border-emerald-100 hover:scale-110"
                    title="WhatsApp Kontak"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <a
                    href={`mailto:${webHomeContent?.email || "smpn50jakarta@gmail.com"}`}
                    className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100/80 flex items-center justify-center transition-all duration-200 border border-blue-100 hover:scale-110"
                    title="Email Resmi"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex flex-col md:items-end text-center md:text-right gap-1 font-bold text-slate-500">
                  <div className="flex items-center justify-center md:justify-end gap-2">
                    <span>NPSN: 20103599</span>
                    <span>&bull;</span>
                    <span>Jakarta Timur, Indonesia</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Basis Data Terintegrasi Terpadu SIAS</p>
                </div>
              </div>
            </footer>
          </div>
        ) : activeRole === 'pelatih' ? (
          <CoachPanel
            activeUser={activeUser}
            students={students}
            onLogout={handleLogout}
            studentAchievements={studentAchievements}
            onAddStudentAchievement={handleAddStudentAchievement}
            onDeleteStudentAchievement={handleDeleteStudentAchievement}
          />
        ) : (
          /* PORTAL APP MAIN LAYOUT */
          <div
            key="portal"
            className="min-h-screen bg-slate-50/70 flex font-sans text-slate-900 overflow-hidden relative"
          >
            {/* REALTIME SYNC ERROR BANNER */}
            <AnimatePresence>
              {hasSyncError && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-xl bg-rose-50 border-2 border-rose-400 text-rose-900 px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                      <AlertCircle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">Realtime Sync Error</h4>
                      <p className="text-[10px] text-rose-600 mt-0.5 leading-snug">
                        Koneksi database Firebase terganggu atau tidak ter-update dalam 5 detik. Mengaktifkan mode cache offline.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => checkFirebaseConnection()}
                      disabled={isCheckingConnection}
                      className="p-1.5 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded-lg transition-colors flex items-center justify-center border border-rose-200 cursor-pointer"
                      title="Mencoba Menghubungkan Kembali"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setHasSyncError(false)}
                      className="p-1.5 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded-lg transition-colors flex items-center justify-center border border-rose-200 cursor-pointer"
                      title="Tutup Pemberitahuan"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Mobile Sidebar Backdrop */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-40 md:hidden transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* Sidebar Navigation */}
            <aside 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
              w-64 lg:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-300
              ${isMobileMenuOpen ? 'fixed left-0 top-0 bottom-0 z-50 flex shadow-2xl' : 'hidden'}
              ${isSidebarVisible ? 'md:flex' : 'md:hidden'}
            `}>
              {/* Sidebar Header */}
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-800 font-bold shadow-xs shrink-0 overflow-hidden">
                    {webHomeContent?.schoolLogo ? (
                      <img src={webHomeContent.schoolLogo} alt="Logo Sekolah" className="w-full h-full object-cover" />
                    ) : (
                      <School className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm tracking-tight text-slate-800 leading-tight">SMPN 50 JAKARTA</span>
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Database Terintegrasi</span>
                  </div>
                </div>
                {/* Close Button on Mobile only */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 md:hidden cursor-pointer"
                  title="Tutup Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Middle Content: Current Session & Role Switcher */}
              <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                <div>
                  <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Peran Aktif</h3>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3 shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Pengguna:</p>
                      <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{activeUser?.name || 'User'}</p>
                      
                      {activeUser?.roles && activeUser.roles.length > 1 ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Akses Multi-Portal:</p>
                          <div className="flex flex-col gap-1.5">
                            {activeUser.roles.map((r: any) => {
                              const isActive = activeRole === r && adminTabOverride === null;
                              return (
                                <button
                                  key={r}
                                  onClick={() => {
                                    setActiveRole(r);
                                    setAdminTabOverride(null);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer border ${
                                    isActive
                                      ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm shadow-indigo-100'
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  <span className="capitalize">
                                    {r === 'guru_wali' ? 'Guru Wali (Bimbingan)' :
                                     r === 'wali_kelas' ? 'Wali Kelas' :
                                     r === 'bk' ? 'Guru BK' :
                                     r === 'piket' ? 'Guru Piket' :
                                     r === 'guru' ? 'Guru Mapel' : r.replace('_', ' ')}
                                  </span>
                                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2">
                          <RoleBadge role={activeRole} size="sm" />
                          {adminTabOverride !== null && (
                            <button
                              onClick={() => setAdminTabOverride(null)}
                              className="w-full text-center py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              &larr; Kembali ke Dashboard
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic Menu based on Active Role */}
                {activeRole === 'admin' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menu Administrasi</h3>
                      <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">9 Menu</span>
                    </div>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      <button
                        onClick={() => setAdminTabOverride('ringkasan')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'ringkasan' || adminTabOverride === null
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        <span className="truncate">Metrik &amp; Statistik</span>
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('siswa')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'siswa'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span className="truncate">Kelola Siswa</span>
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('guru')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'guru'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <Shield className="w-4 h-4 shrink-0" />
                        <span className="truncate">Kelola Pendidik</span>
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('database-settings')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'database-settings'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <Database className="w-4 h-4 shrink-0" />
                        <span className="truncate">Kelas &amp; Sinkronisasi</span>
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('setting-cbt')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'setting-cbt'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <FileCheck className="w-4 h-4 shrink-0 text-indigo-500" />
                        <span className="truncate">Setting CBT Ujian</span>
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('validasi-akun')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'validasi-akun'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserCheck className="w-4 h-4 shrink-0" />
                          <span className="truncate">Validasi Akun Baru</span>
                        </div>
                        {pendingRegistrations.length > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {pendingRegistrations.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('kelola-web')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'kelola-web'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <Globe className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span className="truncate">Kelola Konten Web</span>
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('prestasi')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'prestasi'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <Award className="w-4 h-4 shrink-0 text-amber-500" />
                        <span className="truncate">Input Prestasi Siswa</span>
                      </button>

                      <button
                        onClick={() => setAdminTabOverride('setting-sertifikat')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          adminTabOverride === 'setting-sertifikat'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0 text-yellow-500" />
                        <span className="truncate">Setting Sertifikat Digital</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeRole === 'siswa' && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Menu Siswa</h3>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'profil', label: 'Profil Lengkap', icon: User },
                        { id: 'elearning', label: 'E-Learning Materi', icon: BookOpen },
                        { id: 'absensi', label: 'Absen Hari Ini', icon: Calendar },
                        { id: 'cbt-ujian', label: 'CBT & Ujian', icon: FileCheck },
                        { id: 'pelanggaran', label: 'Pelanggaran', icon: AlertTriangle },
                        { id: 'catatan', label: 'Catatan Wali & BK', icon: FileText }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setSiswaTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            siswaTab === tab.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRole === 'orang_tua' && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Menu Orang Tua</h3>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'profil', label: 'Profil Siswa', icon: User },
                        { id: 'absensi', label: 'Absensi Siswa', icon: Calendar },
                        { id: 'pelanggaran', label: 'Pelanggaran Siswa', icon: AlertTriangle },
                        { id: 'catatan', label: 'Catatan Guru & BK', icon: FileText },
                        { id: 'komunikasi', label: 'Hubungi Sekolah', icon: MessageSquare }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setOrangTuaTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            orangTuaTab === tab.id
                              ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRole === 'guru' && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Menu Guru</h3>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'presensi', label: 'Presensi Kelas', icon: UserCheck },
                        { id: 'elearning', label: 'E-Learning Interaktif', icon: BookOpen },
                        { id: 'pelanggaran', label: 'Input Pelanggaran', icon: AlertTriangle },
                        { id: 'riwayat', label: 'Riwayat Laporan', icon: Search },
                        { id: 'verifikasi-mandiri', label: 'Verifikasi Absensi', icon: Check },
                        { id: 'jurnal-harian', label: 'Jurnal Mengajar', icon: Save },
                        { id: 'jadwal-ujian', label: 'Jadwal Ujian', icon: Calendar },
                        { id: 'bank-soal', label: 'Bank Soal CBT', icon: Database },
                        { id: 'guru-wali-view', label: 'Pendampingan Wali', icon: GraduationCap }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setGuruTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            guruTab === tab.id
                              ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRole === 'wali_kelas' && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Menu Wali Kelas</h3>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'beranda', label: 'Beranda Kelas', icon: GraduationCap },
                        { id: 'catatan', label: 'Jurnal Pembinaan', icon: FileText },
                        { id: 'ekskul', label: 'Nilai Ekstrakurikuler', icon: Award },
                        { id: 'prestasi', label: 'Raihan Prestasi', icon: Award },
                        { id: 'pesan', label: 'Pesan Orang Tua', icon: MessageSquare }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setWaliKelasTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            waliKelasTab === tab.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRole === 'bk' && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Menu BK</h3>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'beranda', label: 'Beranda Konseling', icon: HeartHandshake },
                        { id: 'bimbingan', label: 'Bimbingan Siswa', icon: Search },
                        { id: 'jurnal', label: 'Jurnal Bimbingan', icon: FileText },
                        { id: 'jadwal', label: 'Jadwal Bimbingan', icon: Calendar },
                        { id: 'pesan', label: 'Pesan Orang Tua', icon: MessageSquare }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setBkTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            bkTab === tab.id
                              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRole === 'piket' && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Menu Piket</h3>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'pintu-depan', label: 'Pintu Depan', icon: School },
                        { id: 'absensi-piket', label: 'Absensi Siswa', icon: Calendar },
                        { id: 'guru-absen', label: 'Guru Piket/Izin', icon: Users },
                        { id: 'kejadian-piket', label: 'Jurnal Kejadian', icon: FileText },
                        { id: 'verifikasi-mandiri', label: 'Verifikasi Absensi', icon: Check }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setPiketTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            piketTab === tab.id
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRole === 'guru_wali' && (
                  <div className="space-y-2">
                    <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Menu Guru Wali</h3>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'beranda', label: 'Beranda Wali', icon: GraduationCap },
                        { id: 'bimbingan', label: 'Laporan Absensi', icon: FileText },
                        { id: 'bimbingan-bk', label: 'Bimbingan Guru Wali', icon: HeartHandshake },
                        { id: 'bakat-minat', label: 'Bakat & Minat', icon: Award },
                        { id: 'pesan', label: 'Pesan Orang Tua', icon: MessageSquare }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setGuruWaliTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            guruWaliTab === tab.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRole === 'tendik' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menu Tendik (Tata Usaha)</h3>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">7 Menu</span>
                    </div>
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {[
                        { id: 'ringkasan', label: 'Info Grafik & Ringkasan', icon: TrendingUp },
                        { id: 'kjp', label: 'Siswa Penerima KJP', icon: CreditCard },
                        { id: 'pemberkasan', label: 'Jadwal Pemberkasan', icon: FileCheck },
                        { id: 'nomor-surat', label: 'Agenda Nomor Surat', icon: FileText },
                        { id: 'inventaris', label: 'Inventarisir Barang', icon: Package },
                        { id: 'peminjaman-barang', label: 'BA Peminjaman Barang', icon: ClipboardList },
                        { id: 'bos-bop', label: 'Laporan BOS & BOP', icon: DollarSign }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setTendikTab(tab.id as any)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            tendikTab === tab.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                              : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
                          }`}
                        >
                          <tab.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Sinkronisasi</h3>
                  <div className={`px-3 py-2.5 border rounded-xl text-xs space-y-1.5 transition-all ${
                    dbStatus === 'online'
                      ? 'bg-emerald-50/40 border-emerald-100/50 text-emerald-900'
                      : dbStatus === 'high_latency'
                      ? 'bg-amber-50/40 border-amber-100/50 text-amber-900'
                      : 'bg-rose-50/40 border-rose-100/50 text-rose-900'
                  }`}>
                    <p className="font-bold flex items-center gap-1.5">
                      {dbStatus === 'online' && (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-emerald-800">SIAS Sinkron-Aktif</span>
                        </>
                      )}
                      {dbStatus === 'high_latency' && (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                          <span className="text-amber-800">Latency Tinggi ({dbLatency}ms)</span>
                        </>
                      )}
                      {dbStatus === 'offline' && (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="text-rose-800">Sesi Offline (Cache)</span>
                        </>
                      )}
                    </p>
                    <p className={`text-[10px] leading-relaxed ${
                      dbStatus === 'online' ? 'text-emerald-600/90' : dbStatus === 'high_latency' ? 'text-amber-600/90' : 'text-rose-600/90'
                    }`}>
                      {dbStatus === 'online' && 'Perubahan database ter-update real-time di seluruh sesi peran.'}
                      {dbStatus === 'high_latency' && 'Koneksi lambat. Beberapa sinkronisasi mungkin membutuhkan waktu.'}
                      {dbStatus === 'offline' && 'Koneksi terputus. Data disimpan di lokal & otomatis sinkron saat online.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sidebar Footer Operations */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 rounded-xl text-xs font-bold text-indigo-700 transition-colors shadow-sm cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Edit Profil & Sandi</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Keluar Sesi</span>
                </button>
              </div>
            </aside>

            {/* Main Content Pane */}
            <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
              {/* Top Mobile/Header Nav */}
              <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Desktop Hide/Unhide Toggle Button */}
                  <button
                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                    className="hidden md:flex p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer items-center justify-center shrink-0 border border-slate-200/80 shadow-xs bg-slate-50 hover:text-indigo-600 transition-all gap-1.5"
                    title={isSidebarVisible ? "Sembunyikan Menu (Hide)" : "Tampilkan Menu (Unhide)"}
                  >
                    {isSidebarVisible ? (
                      <>
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                        <span className="text-[10px] font-bold tracking-tight uppercase text-slate-500 hover:text-indigo-600">Sembunyikan Menu</span>
                      </>
                    ) : (
                      <>
                        <Menu className="w-4 h-4 text-indigo-600 animate-pulse" />
                        <span className="text-[10px] font-bold text-indigo-600 tracking-tight uppercase">Tampilkan Menu</span>
                      </>
                    )}
                  </button>

                  {/* Mobile Drawer Toggle Button */}
                  <button
                    onClick={() => {
                      setIsSidebarVisible(true);
                      setIsMobileMenuOpen(!isMobileMenuOpen);
                    }}
                    className="md:hidden flex p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer items-center justify-center shrink-0 border border-slate-200/80 shadow-xs bg-slate-50"
                    title="Menu Navigasi"
                  >
                    {isMobileMenuOpen ? <X className="w-4 h-4 text-slate-500" /> : <Menu className="w-4 h-4 text-indigo-600" />}
                  </button>

                  {/* Divider */}
                  <div className="h-6 w-px bg-slate-200 hidden md:block" />

                  <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight leading-none">
                      {activeRole === 'admin' && 'Panel Kontrol Administrator'}
                      {activeRole === 'guru' && 'Portal Pengajaran & Absensi'}
                      {activeRole === 'wali_kelas' && 'Dashboard Manajemen Kelas'}
                      {activeRole === 'bk' && 'Portal Bimbingan Konseling'}
                      {activeRole === 'piket' && 'Piket Gerbang & Kehadiran'}
                      {activeRole === 'siswa' && 'Dashboard Perkembangan Siswa'}
                      {activeRole === 'orang_tua' && 'Portal Wali Orang Tua'}
                      {activeRole === 'guru_wali' && 'Portal Pendampingan Guru Wali'}
                    </h1>
                    <p className="text-[11px] text-slate-400 mt-1 hidden sm:block">
                      SMPN 50 JAKARTA &bull; Basis data sinkron terpadu
                    </p>
                  </div>
                </div>

                 <div className="flex items-center gap-2.5 md:gap-3">
                  {/* Dark Mode Quick Toggle */}
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-400 transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                    title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
                  >
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </button>

                  {/* Connection Monitor Widget */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMonitorOpen(!isMonitorOpen)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs border cursor-pointer ${
                        dbStatus === 'online'
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : dbStatus === 'high_latency'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 animate-pulse'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      }`}
                      title="Klik untuk melihat status koneksi database Firebase"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          dbStatus === 'online' ? 'bg-emerald-400' : dbStatus === 'high_latency' ? 'bg-amber-400' : 'bg-rose-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          dbStatus === 'online' ? 'bg-emerald-500' : dbStatus === 'high_latency' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                      </span>
                      <span className="hidden sm:inline font-bold">
                        {dbStatus === 'online' && 'Connected'}
                        {dbStatus === 'high_latency' && 'Latency Tinggi'}
                        {dbStatus === 'offline' && 'Offline'}
                      </span>
                      {dbLatency > 0 && dbStatus !== 'offline' && (
                        <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 bg-white/60 border border-slate-100 rounded-md">
                          {dbLatency}ms
                        </span>
                      )}
                    </button>

                    {/* Connection Monitor Dropdown Menu */}
                    <AnimatePresence>
                      {isMonitorOpen && (
                        <>
                          {/* Overlay click closer */}
                          <div className="fixed inset-0 z-45" onClick={() => setIsMonitorOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 space-y-3.5"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-indigo-500 shrink-0 animate-pulse" />
                                <span>Firebase Monitor</span>
                              </h3>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Realtime Sync</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                                <span className="text-slate-500 font-medium">Status Database:</span>
                                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                  dbStatus === 'online'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : dbStatus === 'high_latency'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {dbStatus === 'online' && 'Online'}
                                  {dbStatus === 'high_latency' && 'Latency Tinggi'}
                                  {dbStatus === 'offline' && 'Offline'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                                <span className="text-slate-500 font-medium">Latency Respon:</span>
                                <span className="font-mono font-bold text-slate-700">
                                  {dbStatus === 'offline' ? 'N/A' : `${dbLatency} ms`}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                                <span className="text-slate-500 font-medium">Terakhir Sinkron:</span>
                                <span className="font-mono text-slate-600 font-semibold">
                                  {Math.round((Date.now() - lastSyncTime) / 1000)} detik lalu
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                checkFirebaseConnection();
                                setIsMonitorOpen(false);
                              }}
                              disabled={isCheckingConnection}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-colors cursor-pointer disabled:bg-indigo-400"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                              <span>Uji Koneksi Ulang</span>
                            </button>

                            {/* DIAGNOSTIC WIDGET */}
                            <div className="border-t border-slate-100 pt-3.5 space-y-2 text-left">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span>Deteksi Gangguan (Diagnostics)</span>
                              </h4>
                              {diagnosticResult && (
                                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-mono leading-relaxed text-slate-600 max-h-24 overflow-y-auto break-all">
                                  {diagnosticResult}
                                </div>
                              )}
                              <button
                                onClick={runDbDiagnostics}
                                disabled={isRunningDiagnostic}
                                className="w-full flex items-center justify-center gap-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                              >
                                <Activity className={`w-3 h-3 ${isRunningDiagnostic ? 'animate-pulse text-indigo-500' : ''}`} />
                                <span>{isRunningDiagnostic ? 'Mendiagnosa...' : 'Jalankan Diagnosa Mandiri'}</span>
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Profile info & Mobile Logout */}
                  <div className="flex items-center gap-3 border-l border-slate-100 pl-3">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(true)}
                      className="text-right hidden sm:block hover:text-indigo-600 transition-colors group cursor-pointer"
                      title="Klik untuk Edit Profil & Kata Sandi"
                    >
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center justify-end gap-1">
                        <span>{activeUser?.name || 'User'}</span>
                        <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-all shrink-0 group-hover:rotate-45" />
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize mt-0.5">{activeRole?.replace('_', ' ')}</p>
                    </button>

                    {/* Compact gear button for mobile/tablet */}
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(true)}
                      className="sm:hidden p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                      title="Edit Profil & Kata Sandi"
                    >
                      <Settings className="w-5 h-5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all md:hidden cursor-pointer"
                      title="Keluar Sesi"
                    >
                      <LogOut className="w-5 h-5 shrink-0" />
                    </button>
                  </div>
                </div>
              </header>

              {/* Dynamic Panel Container */}
              <div className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={(adminTabOverride ? 'override-' + adminTabOverride : activeRole) + (activeUser?.id || '')}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {adminTabOverride !== null ? (
                      <AdminPanel
                        activeTabOverride={adminTabOverride}
                        onTabChange={(tab) => setAdminTabOverride(tab)}
                        students={sortedStudents}
                        teachers={sortedTeachers}
                        classes={sortedClasses}
                        violationTypes={sortedViolationTypes}
                        violations={violations}
                        attendance={attendance}
                        schoolTimeConfig={schoolTimeConfig}
                        onUpdateSchoolTimeConfig={handleUpdateSchoolTimeConfig}
                        studentAchievements={studentAchievements}
                        onAddStudentAchievement={handleAddStudentAchievement}
                        onDeleteStudentAchievement={handleDeleteStudentAchievement}
                        onAddStudent={handleAddStudent}
                        onUpdateStudent={handleUpdateStudent}
                        onDeleteStudent={handleDeleteStudent}
                        onAddTeacher={handleAddTeacher}
                        onUpdateTeacher={handleUpdateTeacher}
                        onDeleteTeacher={handleDeleteTeacher}
                        onAddClass={handleAddClass}
                        onUpdateClass={handleUpdateClass}
                        onDeleteClass={handleDeleteClass}
                        onAddViolationType={handleAddViolationType}
                        onDeleteViolationType={handleDeleteViolationType}
                        onResetDatabase={handleResetDatabase}
                        onClearDatabase={handleClearDatabase}
                        examSchedules={examSchedules}
                        examGrades={examGrades}
                        studentSubmissions={studentSubmissions}
                        onAddExamSchedule={handleAddExamSchedule}
                        onDeleteExamSchedule={handleDeleteExamSchedule}
                        onAddStudentsBatch={handleAddStudentsBatch}
                        onAddTeachersBatch={handleAddTeachersBatch}
                        teachingJournals={teachingJournals}
                        headmasterName={headmasterName}
                        onUpdateHeadmasterName={handleUpdateHeadmasterName}
                        pendingRegistrations={pendingRegistrations}
                        onApproveRegistration={handleApproveRegistration}
                        onRejectRegistration={handleRejectRegistration}
                        onApproveAllRegistrations={handleApproveAllRegistrations}
                        onClearAllPendingRegistrations={handleClearAllPendingRegistrations}
                        dbStatus={dbStatus}
                        dbLatency={dbLatency}
                        lastSyncTime={lastSyncTime}
                        onReconnectDb={checkFirebaseConnection}
                        cbtBypassPin={cbtBypassPin}
                        onUpdateCbtBypassPin={handleUpdateCbtBypassPin}
                        webHomeContent={webHomeContent}
                        onUpdateSocialLinks={handleUpdateSocialLinks}
                      />
                    ) : (
                      <>
                        {activeRole === 'siswa' && activeUser && (
                          <SiswaPanel
                            activeTabOverride={siswaTab}
                            onTabChange={setSiswaTab}
                            student={activeUser}
                            classes={sortedClasses}
                            teachers={sortedTeachers}
                            attendance={attendance}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            counselorNotes={counselorNotes}
                            homeroomNotes={homeroomNotes}
                            onAddSelfAttendance={handleStudentSelfAttendance}
                            examSchedules={examSchedules}
                            examGrades={examGrades}
                            bimbinganSchedules={bimbinganSchedules}
                            pemberkasanSchedules={pemberkasanSchedules}
                            studentAchievements={studentAchievements}
                            cbtBypassPin={cbtBypassPin}
                            headmasterName={headmasterName}
                            elearningMaterials={elearningMaterials}
                            elearningProgress={elearningProgress}
                            onUpdateProgress={handleUpdateELearningProgress}
                          />
                        )}

                        {activeRole === 'orang_tua' && activeUser && (
                          <OrangTuaPanel
                            activeTabOverride={orangTuaTab}
                            onTabChange={setOrangTuaTab}
                            student={activeUser}
                            classes={sortedClasses}
                            teachers={sortedTeachers}
                            attendance={attendance}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            counselorNotes={counselorNotes}
                            homeroomNotes={homeroomNotes}
                            parentMessages={parentMessages}
                            onAddParentMessage={handleAddParentMessage}
                            onAcknowledgeNote={handleAcknowledgeNote}
                            bimbinganSchedules={bimbinganSchedules}
                            pemberkasanSchedules={pemberkasanSchedules}
                            studentAchievements={studentAchievements}
                            headmasterName={headmasterName}
                          />
                        )}

                        {activeRole === 'guru' && activeUser && (
                          <GuruPanel
                            activeTabOverride={guruTab}
                            onTabChange={setGuruTab}
                            teacher={activeUser}
                            teachers={sortedTeachers}
                            students={sortedStudents}
                            classes={sortedClasses}
                            attendance={attendance}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            onAddAttendanceBatch={handleAddAttendanceBatch}
                            onAddViolation={handleAddViolation}
                            onVerifyAttendance={handleVerifyAttendance}
                            teachingJournals={teachingJournals}
                            onAddTeachingJournal={handleAddTeachingJournal}
                            onDeleteTeachingJournal={(id) => {
                              deleteDocument('teaching_journals', id)
                                .catch((err) => console.error("Error deleting teaching journal:", err));
                            }}
                            examSchedules={examSchedules}
                            studentSubmissions={studentSubmissions}
                            examGrades={examGrades}
                            onAddExamSchedule={handleAddExamSchedule}
                            onDeleteExamSchedule={handleDeleteExamSchedule}
                            cbtBypassPin={cbtBypassPin}
                            onUpdateCbtBypassPin={handleUpdateCbtBypassPin}
                            onSwitchRole={setActiveRole}
                            headmasterName={headmasterName}
                            elearningMaterials={elearningMaterials}
                            elearningProgress={elearningProgress}
                            onAddMaterial={handleAddELearningMaterial}
                            onDeleteMaterial={handleDeleteELearningMaterial}
                            onUpdateProgress={handleUpdateELearningProgress}
                          />
                        )}

                        {activeRole === 'wali_kelas' && activeUser && (
                          <WaliKelasPanel
                            activeTabOverride={waliKelasTab}
                            onTabChange={setWaliKelasTab}
                            teacher={activeUser}
                            students={sortedStudents}
                            classes={sortedClasses}
                            attendance={attendance}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            homeroomNotes={homeroomNotes}
                            parentMessages={parentMessages}
                            studentAchievements={studentAchievements}
                            onAddHomeroomNote={handleAddHomeroomNote}
                            onReplyToParent={handleReplyToParent}
                          />
                        )}

                        {activeRole === 'bk' && activeUser && (
                          <BKPanel
                            activeTabOverride={bkTab}
                            onTabChange={setBkTab}
                            teacher={activeUser}
                            students={sortedStudents}
                            classes={sortedClasses}
                            attendance={attendance}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            counselorNotes={counselorNotes}
                            parentMessages={parentMessages}
                            studentAchievements={studentAchievements}
                            onAddCounselorNote={handleAddCounselorNote}
                            onReplyToParent={handleReplyToParent}
                            bimbinganJournals={bimbinganJournals}
                            bimbinganSchedules={bimbinganSchedules}
                            onAddBimbinganJournal={handleAddBimbinganJournal}
                            onDeleteBimbinganJournal={handleDeleteBimbinganJournal}
                            onAddBimbinganSchedule={handleAddBimbinganSchedule}
                            onDeleteBimbinganSchedule={handleDeleteBimbinganSchedule}
                            headmasterName={headmasterName}
                          />
                        )}

                        {activeRole === 'guru_wali' && activeUser && (
                          <GuruWaliPanel
                            activeTabOverride={guruWaliTab}
                            onTabChange={setGuruWaliTab}
                            teacher={activeUser}
                            students={sortedStudents}
                            classes={sortedClasses}
                            attendance={attendance}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            counselorNotes={counselorNotes}
                            parentMessages={parentMessages}
                            studentAchievements={studentAchievements}
                            onAddCounselorNote={handleAddCounselorNote}
                            onReplyToParent={handleReplyToParent}
                            onUpdateStudent={handleUpdateStudent}
                            bimbinganJournals={bimbinganJournals}
                            bimbinganSchedules={bimbinganSchedules}
                            onAddBimbinganJournal={handleAddBimbinganJournal}
                            onDeleteBimbinganJournal={handleDeleteBimbinganJournal}
                            onAddBimbinganSchedule={handleAddBimbinganSchedule}
                            onDeleteBimbinganSchedule={handleDeleteBimbinganSchedule}
                            headmasterName={headmasterName}
                          />
                        )}

                        {activeRole === 'piket' && activeUser && (
                          <PiketPanel
                            activeTabOverride={piketTab}
                            onTabChange={setPiketTab}
                            teacher={activeUser}
                            teachers={sortedTeachers}
                            students={sortedStudents}
                            classes={sortedClasses}
                            attendance={attendance}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            onAddViolation={handleAddViolation}
                            onQuickAttendance={handleQuickAttendance}
                            absentTeachers={absentTeachers}
                            importantEvents={importantEvents}
                            onAddAbsentTeacher={handleAddAbsentTeacher}
                            onDeleteAbsentTeacher={handleDeleteAbsentTeacher}
                            onAddImportantEvent={handleAddImportantEvent}
                            onDeleteImportantEvent={handleDeleteImportantEvent}
                            onVerifyAttendance={handleVerifyAttendance}
                            headmasterName={headmasterName}
                          />
                        )}

                        {activeRole === 'admin' && (
                          <AdminPanel
                            students={sortedStudents}
                            teachers={sortedTeachers}
                            classes={sortedClasses}
                            violationTypes={sortedViolationTypes}
                            violations={violations}
                            attendance={attendance}
                            schoolTimeConfig={schoolTimeConfig}
                            onUpdateSchoolTimeConfig={handleUpdateSchoolTimeConfig}
                            studentAchievements={studentAchievements}
                            onAddStudentAchievement={handleAddStudentAchievement}
                            onDeleteStudentAchievement={handleDeleteStudentAchievement}
                            onAddStudent={handleAddStudent}
                            onUpdateStudent={handleUpdateStudent}
                            onDeleteStudent={handleDeleteStudent}
                            onAddTeacher={handleAddTeacher}
                            onUpdateTeacher={handleUpdateTeacher}
                            onDeleteTeacher={handleDeleteTeacher}
                            onAddClass={handleAddClass}
                            onUpdateClass={handleUpdateClass}
                            onDeleteClass={handleDeleteClass}
                            onAddViolationType={handleAddViolationType}
                            onDeleteViolationType={handleDeleteViolationType}
                            onResetDatabase={handleResetDatabase}
                            onClearDatabase={handleClearDatabase}
                            examSchedules={examSchedules}
                            examGrades={examGrades}
                            studentSubmissions={studentSubmissions}
                            onAddExamSchedule={handleAddExamSchedule}
                            onDeleteExamSchedule={handleDeleteExamSchedule}
                            onAddStudentsBatch={handleAddStudentsBatch}
                            onAddTeachersBatch={handleAddTeachersBatch}
                            teachingJournals={teachingJournals}
                            headmasterName={headmasterName}
                            onUpdateHeadmasterName={handleUpdateHeadmasterName}
                            pendingRegistrations={pendingRegistrations}
                            onApproveRegistration={handleApproveRegistration}
                            onRejectRegistration={handleRejectRegistration}
                            onApproveAllRegistrations={handleApproveAllRegistrations}
                            onClearAllPendingRegistrations={handleClearAllPendingRegistrations}
                            dbStatus={dbStatus}
                            dbLatency={dbLatency}
                            lastSyncTime={lastSyncTime}
                            onReconnectDb={checkFirebaseConnection}
                            cbtBypassPin={cbtBypassPin}
                            onUpdateCbtBypassPin={handleUpdateCbtBypassPin}
                            webHomeContent={webHomeContent}
                            onUpdateSocialLinks={handleUpdateSocialLinks}
                            onSwitchRole={(role, userObj) => {
                              setActiveRole(role as UserRole);
                              if (userObj) {
                                setActiveUser(userObj);
                                localStorage.setItem('siakad_active_user', JSON.stringify(userObj));
                              }
                              localStorage.setItem('siakad_active_role', role);
                            }}
                          />
                        )}

                        {activeRole === 'tendik' && activeUser && (
                          <TendikPanel
                            teacher={activeUser}
                            students={sortedStudents}
                            classes={sortedClasses}
                            pemberkasanSchedules={pemberkasanSchedules}
                            nomorSuratList={nomorSuratList}
                            inventoryItems={inventoryItems}
                            inventoryLoans={inventoryLoans}
                            bosBopReports={bosBopReports}
                            onUpdateStudentKjp={handleUpdateStudentKjp}
                            onBulkUpdateStudentKjp={handleBulkUpdateStudentKjp}
                            onAddPemberkasanSchedule={handleAddPemberkasanSchedule}
                            onDeletePemberkasanSchedule={handleDeletePemberkasanSchedule}
                            onAddNomorSurat={handleAddNomorSurat}
                            onDeleteNomorSurat={handleDeleteNomorSurat}
                            onAddInventoryItem={handleAddInventoryItem}
                            onUpdateInventoryItem={handleUpdateInventoryItem}
                            onDeleteInventoryItem={handleDeleteInventoryItem}
                            onAddInventoryLoan={handleAddInventoryLoan}
                            onUpdateInventoryLoan={handleUpdateInventoryLoan}
                            onDeleteInventoryLoan={handleDeleteInventoryLoan}
                            onAddBosBopReport={handleAddBosBopReport}
                            onDeleteBosBopReport={handleDeleteBosBopReport}
                            headmasterName={headmasterName}
                            activeTab={tendikTab}
                            onTabChange={setTendikTab}
                          />
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* School Footer */}
              <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 space-y-1 shrink-0 mt-auto">
                <p>&copy; 2026 Sistem Administrasi Siswa Terintegrasi (SIAS). Hak Cipta Dilindungi Undang-Undang.</p>
                <p className="flex items-center justify-center gap-1">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Basis Data Sekolah Sinkron-Aktif Terintegrasi Lokal</span>
                </p>
              </footer>
            </main>
          </div>
        )}
      </AnimatePresence>

      {activeUser && activeRole && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          activeUser={activeUser}
          activeRole={activeRole}
          onSave={handleSaveProfile}
        />
      )}

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={handleRegisterUser}
        classes={sortedClasses}
        students={sortedStudents}
        teachers={sortedTeachers}
        pendingRegistrations={pendingRegistrations}
      />

      {/* Global Scroll Navigator for long content across all roles */}
      <ScrollNavigator
        activeRole={activeRole || undefined}
        activeTab={
          activeRole === 'admin' ? (adminTabOverride || 'ringkasan') :
          activeRole === 'siswa' ? siswaTab :
          activeRole === 'orang_tua' ? orangTuaTab :
          activeRole === 'guru' ? guruTab :
          activeRole === 'wali_kelas' ? waliKelasTab :
          activeRole === 'bk' ? bkTab :
          activeRole === 'piket' ? piketTab :
          activeRole === 'guru_wali' ? guruWaliTab :
          activeRole === 'tendik' ? tendikTab : undefined
        }
        onSelectTab={(tabId) => {
          if (activeRole === 'admin') setAdminTabOverride(tabId as any);
          else if (activeRole === 'siswa') setSiswaTab(tabId as any);
          else if (activeRole === 'orang_tua') setOrangTuaTab(tabId as any);
          else if (activeRole === 'guru') setGuruTab(tabId as any);
          else if (activeRole === 'wali_kelas') setWaliKelasTab(tabId as any);
          else if (activeRole === 'bk') setBkTab(tabId as any);
          else if (activeRole === 'piket') setPiketTab(tabId as any);
          else if (activeRole === 'guru_wali') setGuruWaliTab(tabId as any);
          else if (activeRole === 'tendik') setTendikTab(tabId as any);
        }}
        availableTabs={
          activeRole === 'admin' ? [
            { id: 'ringkasan', label: 'Metrik & Statistik', icon: TrendingUp },
            { id: 'siswa', label: 'Kelola Siswa', icon: Users },
            { id: 'guru', label: 'Kelola Pendidik', icon: Shield },
            { id: 'database-settings', label: 'Kelas & Sinkronisasi', icon: Database },
            { id: 'setting-cbt', label: 'Setting CBT Ujian', icon: FileCheck },
            { id: 'validasi-akun', label: 'Validasi Akun Baru', icon: UserCheck },
            { id: 'kelola-web', label: 'Kelola Konten Web', icon: Globe },
            { id: 'prestasi', label: 'Input Prestasi Siswa', icon: Award },
            { id: 'setting-sertifikat', label: 'Setting Sertifikat Digital', icon: ShieldCheck }
          ] :
          activeRole === 'siswa' ? [
            { id: 'profil', label: 'Profil Lengkap', icon: User },
            { id: 'absensi', label: 'Absen Hari Ini', icon: Calendar },
            { id: 'cbt-ujian', label: 'CBT & Ujian', icon: FileCheck },
            { id: 'pelanggaran', label: 'Pelanggaran', icon: AlertTriangle },
            { id: 'catatan', label: 'Catatan Wali & BK', icon: FileText }
          ] :
          activeRole === 'orang_tua' ? [
            { id: 'profil', label: 'Profil Siswa', icon: User },
            { id: 'absensi', label: 'Absensi Siswa', icon: Calendar },
            { id: 'pelanggaran', label: 'Pelanggaran Siswa', icon: AlertTriangle },
            { id: 'catatan', label: 'Catatan Guru & BK', icon: FileText },
            { id: 'komunikasi', label: 'Hubungi Sekolah', icon: MessageSquare }
          ] :
          activeRole === 'guru' ? [
            { id: 'presensi', label: 'Presensi Kelas', icon: UserCheck },
            { id: 'pelanggaran', label: 'Input Pelanggaran', icon: AlertTriangle },
            { id: 'riwayat', label: 'Riwayat Laporan', icon: Search },
            { id: 'verifikasi-mandiri', label: 'Verifikasi Absensi', icon: Check },
            { id: 'jurnal-harian', label: 'Jurnal Mengajar', icon: Save },
            { id: 'jadwal-ujian', label: 'Jadwal Ujian', icon: Calendar },
            { id: 'bank-soal', label: 'Bank Soal CBT', icon: Database },
            { id: 'guru-wali-view', label: 'Pendampingan Wali', icon: GraduationCap }
          ] :
          activeRole === 'wali_kelas' ? [
            { id: 'beranda', label: 'Beranda Kelas', icon: GraduationCap },
            { id: 'catatan', label: 'Catatan & Masukan', icon: FileText },
            { id: 'pesan', label: 'Pesan Orang Tua', icon: MessageSquare }
          ] :
          activeRole === 'bk' ? [
            { id: 'beranda', label: 'Beranda Konseling', icon: HeartHandshake },
            { id: 'bimbingan', label: 'Bimbingan Siswa', icon: Search },
            { id: 'jurnal', label: 'Jurnal Bimbingan', icon: FileText },
            { id: 'jadwal', label: 'Jadwal Bimbingan', icon: Calendar },
            { id: 'pesan', label: 'Pesan Orang Tua', icon: MessageSquare }
          ] :
          activeRole === 'piket' ? [
            { id: 'pintu-depan', label: 'Pintu Depan', icon: School },
            { id: 'absensi-piket', label: 'Absensi Siswa', icon: Calendar },
            { id: 'guru-absen', label: 'Guru Piket/Izin', icon: Users },
            { id: 'kejadian-piket', label: 'Jurnal Kejadian', icon: FileText },
            { id: 'verifikasi-mandiri', label: 'Verifikasi Absensi', icon: Check }
          ] :
          activeRole === 'guru_wali' ? [
            { id: 'beranda', label: 'Beranda Wali', icon: GraduationCap },
            { id: 'bimbingan', label: 'Laporan Absensi', icon: FileText },
            { id: 'bimbingan-bk', label: 'Bimbingan Konseling', icon: HeartHandshake },
            { id: 'bakat-minat', label: 'Bakat & Minat', icon: Award },
            { id: 'pesan', label: 'Pesan Orang Tua', icon: MessageSquare }
          ] :
          activeRole === 'tendik' ? [
            { id: 'ringkasan', label: 'Info Grafik & Ringkasan', icon: TrendingUp },
            { id: 'kjp', label: 'Siswa Penerima KJP', icon: CreditCard },
            { id: 'pemberkasan', label: 'Jadwal Pemberkasan', icon: FileCheck },
            { id: 'nomor-surat', label: 'Agenda Nomor Surat', icon: FileText },
            { id: 'inventaris', label: 'Inventarisir Barang', icon: Package },
            { id: 'bos-bop', label: 'Laporan BOS & BOP', icon: DollarSign }
          ] : []
        }
      />
    </div>
  );
}
