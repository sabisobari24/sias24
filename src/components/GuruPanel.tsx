import React, { useState, useEffect } from 'react';
import { Student, Attendance, SchoolClass, ViolationType, StudentViolation, Teacher, TeachingJournal, ExamSchedule, CounselorNote, QuestionBank, StudentExamSubmission, ExamGrade, ELearningMaterial, StudentLearningProgress } from '../types';
import { Calendar, UserCheck, AlertTriangle, Search, Check, Save, Sparkles, Send, Info, Download, FileSpreadsheet, Plus, Trash, GraduationCap, Edit, FileText, Award, Trash2, Clock, Database, Shield, Key, Lock, Users, RefreshCw, BookOpen } from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF } from '../utils/printHelper';
import { printHTML } from '../utils/printHelper';
import { safeLocalStorageSet } from '../utils/storageHelper';
import ConfirmModal from './ConfirmModal';
import BankSoalManager from './BankSoalManager';
import AttendancePhotoPreviewModal from './common/AttendancePhotoPreviewModal';
import { CbtScoreExporter } from './CbtScoreExporter';
import { syncCollection } from '../lib/firebase';
import ELearningPanel from './ELearningPanel';

interface GuruPanelProps {
  teacher: Teacher;
  teachers: Teacher[];
  students: Student[];
  classes: SchoolClass[];
  attendance: Attendance[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  onAddAttendanceBatch: (records: Omit<Attendance, 'id'>[]) => void;
  onAddViolation: (violation: Omit<StudentViolation, 'id'>) => void;
  onVerifyAttendance: (id: string, role: 'piket' | 'mapel', action: 'Verified' | 'Rejected') => void;
  teachingJournals?: TeachingJournal[];
  onAddTeachingJournal?: (journal: Omit<TeachingJournal, 'id'>) => void;
  onDeleteTeachingJournal?: (id: string) => void;
  examSchedules?: ExamSchedule[];
  studentSubmissions?: StudentExamSubmission[];
  examGrades?: ExamGrade[];
  onAddExamSchedule?: (schedule: Omit<ExamSchedule, 'id'>) => void;
  onDeleteExamSchedule?: (id: string) => void;
  onSwitchRole?: (role: any) => void;
  counselorNotes?: CounselorNote[];
  onAddCounselorNote?: (note: Omit<CounselorNote, 'id'>) => void;
  headmasterName: string;
  activeTabOverride?: 'presensi' | 'elearning' | 'pelanggaran' | 'riwayat' | 'verifikasi-mandiri' | 'jurnal-harian' | 'jadwal-ujian' | 'guru-wali-view' | 'bank-soal' | null;
  onTabChange?: (tab: 'presensi' | 'elearning' | 'pelanggaran' | 'riwayat' | 'verifikasi-mandiri' | 'jurnal-harian' | 'jadwal-ujian' | 'guru-wali-view' | 'bank-soal') => void;
  cbtBypassPin?: string;
  onUpdateCbtBypassPin?: (pin: string) => void;
  elearningMaterials?: ELearningMaterial[];
  elearningProgress?: StudentLearningProgress[];
  onAddMaterial?: (m: Omit<ELearningMaterial, 'id'>) => void;
  onDeleteMaterial?: (id: string) => void;
  onUpdateProgress?: (p: StudentLearningProgress) => void;
}

export default function GuruPanel({
  teacher,
  teachers,
  students,
  classes,
  attendance,
  violationTypes,
  violations,
  onAddAttendanceBatch,
  onAddViolation,
  onVerifyAttendance,
  teachingJournals = [],
  onAddTeachingJournal,
  onDeleteTeachingJournal,
  examSchedules = [],
  studentSubmissions = [],
  examGrades = [],
  onAddExamSchedule,
  onDeleteExamSchedule,
  onSwitchRole,
  counselorNotes = [],
  onAddCounselorNote,
  headmasterName,
  activeTabOverride,
  onTabChange,
  cbtBypassPin,
  onUpdateCbtBypassPin,
  elearningMaterials = [],
  elearningProgress = [],
  onAddMaterial,
  onDeleteMaterial,
  onUpdateProgress,
}: GuruPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'presensi' | 'elearning' | 'pelanggaran' | 'riwayat' | 'verifikasi-mandiri' | 'jurnal-harian' | 'jadwal-ujian' | 'guru-wali-view' | 'bank-soal'>('presensi');
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'presensi' | 'elearning' | 'pelanggaran' | 'riwayat' | 'verifikasi-mandiri' | 'jurnal-harian' | 'jadwal-ujian' | 'guru-wali-view' | 'bank-soal') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [cbtPin, setCbtPin] = useState<string>(cbtBypassPin || '9999');
  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<Attendance | null>(null);
  useEffect(() => {
    if (cbtBypassPin) setCbtPin(cbtBypassPin);
  }, [cbtBypassPin]);

  // Attendance states
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }>>({});

  // Violation log states
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [violationFilterClassId, setViolationFilterClassId] = useState<string>('');
  const [selectedViolationTypeId, setSelectedViolationTypeId] = useState<string>(violationTypes[0]?.id || '');
  const [violationDate, setViolationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [violationNotes, setViolationNotes] = useState<string>('');

  // Verifikasi Mandiri Date Filter
  const [verifyDateFilter, setVerifyDateFilter] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Jurnal Mengajar Harian States
  const [journalDate, setJournalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [journalClass, setJournalClass] = useState<string>(classes[0]?.id || '');
  const [journalSubject, setJournalSubject] = useState<string>('');
  const [journalKD, setJournalKD] = useState<string>('');
  const [journalTP, setJournalTP] = useState<string>('');
  const [journalMaterial, setJournalMaterial] = useState<string>('');
  const [journalPresent, setJournalPresent] = useState<number>(0);
  const [journalAbsent, setJournalAbsent] = useState<number>(0);
  const [journalNotesText, setJournalNotesText] = useState<string>('');
  const [journalSignature, setJournalSignature] = useState<string>('');
  const signatureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Auto-sync Jumlah siswa hadir dan tidak hadir dari Data Absensi Kelas yang diampu
  useEffect(() => {
    if (!journalClass || !journalDate) return;
    const classAttendance = attendance.filter(
      (a) => a.classId === journalClass && a.date === journalDate
    );
    if (classAttendance.length > 0) {
      const hadirCount = classAttendance.filter((a) => a.status === 'Hadir').length;
      const tidakHadirCount = classAttendance.filter((a) => a.status !== 'Hadir').length;
      setJournalPresent(hadirCount);
      setJournalAbsent(tidakHadirCount);
    } else {
      const totalInClass = students.filter((s) => s.classId === journalClass).length;
      setJournalPresent(totalInClass);
      setJournalAbsent(0);
    }
  }, [journalClass, journalDate, attendance, students]);

  const syncJournalFromAttendance = () => {
    if (!journalClass || !journalDate) return;
    const classAttendance = attendance.filter(
      (a) => a.classId === journalClass && a.date === journalDate
    );
    if (classAttendance.length > 0) {
      const hadirCount = classAttendance.filter((a) => a.status === 'Hadir').length;
      const tidakHadirCount = classAttendance.filter((a) => a.status !== 'Hadir').length;
      setJournalPresent(hadirCount);
      setJournalAbsent(tidakHadirCount);
      setSuccessMsg('Data kehadiran otomatis diperbarui dari Data Absensi Kelas terpilih!');
    } else {
      const totalInClass = students.filter((s) => s.classId === journalClass).length;
      setJournalPresent(totalInClass);
      setJournalAbsent(0);
      setSuccessMsg('Belum ada presensi tercatat hari ini. Memuat total siswa kelas sebagai default Hadir.');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Jadwal Ujian CBT States
  const [examSubject, setExamSubject] = useState<string>('Pendidikan Agama dan Budi Pekerti');
  const [examClass, setExamClass] = useState<string>('all');
  const [examDateStr, setExamDateStr] = useState<string>('');
  const [examStartTime, setExamStartTime] = useState<string>('07:30');
  const [examEndTime, setExamEndTime] = useState<string>('09:00');
  const [examRoomStr, setExamRoomStr] = useState<string>('Laboratorium Komputer / CBT');
  const [examTypeStr, setExamTypeStr] = useState<'Evaluasi Harian' | 'Latihan Soal' | 'UTS'>('Evaluasi Harian');
  const [examGoogleFormUrl, setExamGoogleFormUrl] = useState<string>('');
  const [examMethod, setExamMethod] = useState<'gform' | 'bank_soal'>('gform');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [examKkm, setExamKkm] = useState<number>(75);
  const [teacherBanks, setTeacherBanks] = useState<QuestionBank[]>([]);

  // Synchronize question banks for current teacher
  useEffect(() => {
    const unsubscribe = syncCollection<QuestionBank>('question_banks', (data) => {
      setTeacherBanks(data.filter(b => b.teacherId === teacher.id));
    });
    return () => unsubscribe();
  }, [teacher.id]);

  // Academic Advisor (Guru Wali) States
  const [selectedAdvisingStudentId, setSelectedAdvisingStudentId] = useState<string>('');
  const [advisingNote, setAdvisingNote] = useState<string>('');
  const [advisingCategory, setAdvisingCategory] = useState<'Akademik' | 'Karakter & Akhlak' | 'Bakat dan Minat'>('Akademik');
  const [advisingFollowUp, setAdvisingFollowUp] = useState<string>('');

  // Signature drawing helper methods
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      setJournalSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setJournalSignature('');
  };

  // Submit journal
  const handleSubmitJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTeachingJournal) return;

    onAddTeachingJournal({
      date: journalDate,
      classId: journalClass,
      subject: journalSubject,
      kd: journalKD,
      tujuanPembelajaran: journalTP,
      competensiDasar: journalKD,
      material: journalMaterial,
      presentCount: journalPresent,
      absentCount: journalAbsent,
      notes: journalNotesText,
      signatureUrl: journalSignature || '/signature-placeholder.png',
      signature: journalSignature || '/signature-placeholder.png',
      teacherName: teacher.name,
      recordedBy: teacher.name,
      teacherId: teacher.id,
    });

    setJournalKD('');
    setJournalTP('');
    setJournalMaterial('');
    setJournalPresent(0);
    setJournalAbsent(0);
    setJournalNotesText('');
    setSuccessMsg('Jurnal mengajar harian berhasil disimpan ke sistem pusat!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Print/Download journal as PDF
  const handlePrintJournal = (j: TeachingJournal) => {
    const className = classes.find(c => c.id === j.classId)?.name || j.classId;

    // Load custom logos from Admin Settings (with default fallbacks)
    const logoLeftSaved = localStorage.getItem('siakad_logo_left') || '';
    const logoRightSaved = localStorage.getItem('siakad_logo_right') || '';
    const srcLogoLeft = logoLeftSaved || `${window.location.origin}/logo-dki.png`;
    const srcLogoRight = logoRightSaved || `${window.location.origin}/logo.png`;

    const govTitle = localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA';
    const deptTitle = localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA';
    const sudinTitle = localStorage.getItem('siakad_kop_sudin_title') || 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR';
    const schoolTitle = localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';
    const addressText = localStorage.getItem('siakad_kop_address_text') || 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510';
    const contactText = localStorage.getItem('siakad_kop_contact_text') || 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com';

    const today = new Date(j.date);
    const formatToday = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let signatureElement = '';
    if (j.signature && j.signature.startsWith('data:')) {
      signatureElement = `<img class="signature-img" src="${j.signature}" alt="Tanda Tangan" style="max-height: 70px; object-fit: contain; display: block; margin: 5px auto;" />`;
    } else if (j.signature && j.signature !== '/signature-placeholder.png' && j.signature.trim() !== '') {
      signatureElement = `<div style="font-family: 'Brush Script MT', 'Dancing Script', 'Georgia', 'Times New Roman', cursive, serif; font-style: italic; font-weight: bold; font-size: 22px; color: #1e3a8a; height: 60px; display: flex; align-items: center; justify-content: center; transform: rotate(-3deg); border-bottom: 1px dashed #cbd5e1; margin-bottom: 5px;">${j.signature}</div>`;
    } else {
      signatureElement = `<div class="sig-box" style="height: 60px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 15px; width: 180px; margin-left: auto; margin-right: auto;"></div>`;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Jurnal Mengajar Harian - ${j.date}</title>
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
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; color: #1e293b; }
            th { background-color: #f1f5f9; font-weight: bold; width: 30%; color: #0f172a; }
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
            
            <div class="report-title">JURNAL MENGAJAR HARIAN GURU</div>
            
            <table>
              <tr>
                <th>Hari / Tanggal</th>
                <td>${today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <th>Nama Guru Pengajar</th>
                <td>${j.recordedBy}</td>
              </tr>
              <tr>
                <th>Mata Pelajaran</th>
                <td>${j.subject}</td>
              </tr>
              <tr>
                <th>Kelas yang Diajar</th>
                <td>${className}</td>
              </tr>
              <tr>
                <th>Kompetensi Dasar (KD)</th>
                <td>${j.competensiDasar}</td>
              </tr>
              <tr>
                <th>Materi Ajar</th>
                <td>${j.material}</td>
              </tr>
              <tr>
                <th>Statistik Kehadiran</th>
                <td>Hadir: <strong>${j.presentCount}</strong> siswa | Tidak Hadir: <strong>${j.absentCount}</strong> siswa</td>
              </tr>
              <tr>
                <th>Catatan &amp; Keterangan</th>
                <td>${j.notes || '-'}</td>
              </tr>
            </table>

            <div class="signature-section">
              <div class="signature-box" style="text-align: center; width: 220px;">
                <p>Mengetahui,</p>
                <p style="font-weight: bold; margin-top: 2px;">Kepala Sekolah</p>
                <div style="height: 60px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #cbd5e1; font-size: 9px;">
                  (Tanda Tangan & Cap Resmi)
                </div>
                <p style="font-weight: bold; text-decoration: underline;">${headmasterName}</p>
                <p>NIP. 196711261991032004</p>
              </div>
              <div class="signature-box" style="text-align: center; width: 220px;">
                <p>Jakarta, ${formatToday}</p>
                <p style="font-weight: bold; margin-top: 2px;">Guru Mata Pelajaran</p>
                ${signatureElement}
                <p style="font-weight: bold; text-decoration: underline; margin-top: 5px;">${j.recordedBy}</p>
                <p>NIP. Guru Pengajar</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    printHTML(htmlContent);
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

  // Submit CBT Exam Schedule
  const handleSubmitExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddExamSchedule) return;

    if (!examClass) {
      alert('Silakan pilih minimal 1 Kelas Target!');
      return;
    }

    if (examMethod === 'bank_soal' && !selectedBankId) {
      alert('Silakan pilih salah satu Bank Soal yang ingin diujikan!');
      return;
    }

    onAddExamSchedule({
      subject: examSubject,
      classId: examClass,
      date: examDateStr,
      time: `${examStartTime} - ${examEndTime}`,
      room: examRoomStr,
      type: examTypeStr,
      examType: examTypeStr,
      kkm: Number(examKkm) || 75,
      googleFormUrl: examMethod === 'gform' ? examGoogleFormUrl : undefined,
      questionBankId: examMethod === 'bank_soal' ? selectedBankId : undefined,
      teacherId: teacher.id,
      teacherName: teacher.name,
    });

    setExamSubject('Pendidikan Agama dan Budi Pekerti');
    setExamClass('all');
    setExamGoogleFormUrl('');
    setSelectedBankId('');
    setExamMethod('gform');
    setExamKkm(75);
    setSuccessMsg('Jadwal ujian CBT berhasil disimpan dan akan terbit di akun siswa!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Submit advising notes (Guidance counseling notes)
  const handleSubmitAdvisingNote = (e: React.FormEvent, studentId: string) => {
    e.preventDefault();
    if (!onAddCounselorNote || !advisingNote.trim()) return;

    onAddCounselorNote({
      studentId,
      date: new Date().toISOString().split('T')[0],
      notes: `[Catatan Guru Wali - Bimbingan ${advisingCategory}]: ${advisingNote.trim()}`,
      followUp: advisingFollowUp.trim() || `Pembinaan berkala ${advisingCategory} oleh Guru Wali`,
      status: 'Dalam Pemantauan',
      recordedBy: `${teacher.name} (Guru Wali)`,
      parentAcknowledge: false,
    });

    setAdvisingNote('');
    setAdvisingFollowUp('');
    setSuccessMsg('Catatan bimbingan & pembinaan Guru Wali berhasil disimpan!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Status message
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Filters
  const filteredStudents = students.filter((s) => s.classId === selectedClassId);

  // Initialize batch attendance states when class/date is changed
  const initializeAttendance = () => {
    const existing = attendance.filter((a) => a.classId === selectedClassId && a.date === attendanceDate);
    const initial: Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }> = {};

    filteredStudents.forEach((student) => {
      const record = existing.find((r) => r.studentId === student.id);
      initial[student.id] = {
        status: record ? record.status : 'Hadir',
        notes: record ? (record.notes || '') : '',
      };
    });
    setAttendanceStatuses(initial);
    setSuccessMsg('');
  };

  React.useEffect(() => {
    if (selectedClassId) {
      initializeAttendance();
    }
  }, [selectedClassId, attendanceDate, students]);

  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setAttendanceStatuses((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceStatuses((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const batch: Omit<Attendance, 'id'>[] = filteredStudents.map((s) => {
      const entry = attendanceStatuses[s.id] || { status: 'Hadir', notes: '' };
      return {
        studentId: s.id,
        classId: selectedClassId,
        date: attendanceDate,
        status: entry.status,
        notes: entry.notes,
        recordedBy: teacher.name,
      };
    });

    onAddAttendanceBatch(batch);
    setSuccessMsg('Presensi kelas berhasil disimpan ke basis data terintegrasi!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSubmitViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId) {
      alert('Silakan pilih siswa terlebih dahulu.');
      return;
    }
    const type = violationTypes.find((vt) => vt.id === selectedViolationTypeId);
    if (!type) return;

    onAddViolation({
      studentId: targetStudentId,
      violationTypeId: selectedViolationTypeId,
      date: violationDate,
      notes: violationNotes,
      points: type.points,
      recordedBy: teacher.name,
    });

    setViolationNotes('');
    setSuccessMsg(`Pelanggaran tata tertib siswa berhasil direkam (+${type.points} Poin)!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Export Handlers
  const handleExportPresensiGuru = (format: 'excel' | 'pdf') => {
    const classObj = classes.find(c => c.id === selectedClassId);
    const className = classObj ? classObj.name : selectedClassId;
    const classAttendance = attendance.filter(a => a.classId === selectedClassId);
    
    const headers = ["Tanggal", "Nama Siswa", "NISN", "Kelas", "Status Kehadiran", "Catatan Khusus", "Pencatat"];
    const rows = classAttendance.map(a => {
      const s = students.find(std => std.id === a.studentId);
      return [
        a.date,
        s?.name || 'Siswa Terhapus',
        s?.nisn || '-',
        className,
        a.status,
        a.notes || '',
        a.recordedBy
      ];
    });

    if (format === 'excel') {
      downloadExcel(`jurnal_kehadiran_kelas_${className.replace(/\s+/g, '_')}.xlsx`, headers, rows, 'Jurnal Kehadiran');
      setSuccessMsg(`Berhasil mengunduh Jurnal Kehadiran Kelas ${className} (Excel)!`);
    } else {
      printTablePDF(`Jurnal Kehadiran Kelas ${className}`, headers, rows, headmasterName);
      setSuccessMsg(`Jurnal Kehadiran Kelas ${className} berhasil dicetak / disimpan ke PDF!`);
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportTeachingJournal = (format: 'excel' | 'pdf') => {
    const myJournals = teachingJournals.filter(j => j.teacherId === teacher.id);
    
    if (myJournals.length === 0) {
      alert('Anda belum memiliki jurnal mengajar harian yang tersimpan.');
      return;
    }

    const headers = ["Tanggal", "Kelas", "Mata Pelajaran", "Materi / KD", "Siswa Hadir", "Siswa Absen", "Catatan Kegiatan"];
    const rows = myJournals.map(j => {
      const clsName = classes.find(c => c.id === j.classId)?.name || j.classId;
      return [
        j.date,
        clsName,
        j.subject,
        `${j.kd} - ${j.material}`,
        j.presentCount,
        j.absentCount,
        j.notes || ''
      ];
    });

    if (format === 'excel') {
      downloadExcel(`Jurnal_Mengajar_Guru_${teacher.name.replace(/\s+/g, '_')}.xlsx`, headers, rows, 'Jurnal Mengajar');
      setSuccessMsg(`Berhasil mengunduh Jurnal Mengajar Harian Anda (Excel)!`);
    } else {
      printTablePDF(`Jurnal Mengajar Harian Guru - ${teacher.name}`, headers, rows, headmasterName);
      setSuccessMsg(`Jurnal Mengajar Anda berhasil dicetak / disimpan ke PDF!`);
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportPelanggaranGuru = (format: 'excel' | 'pdf') => {
    const myViolations = violations.filter(v => v.recordedBy === teacher.name);
    const headers = ["Tanggal", "Nama Siswa", "Kelas", "Jenis Pelanggaran", "Poin", "Catatan", "Pencatat"];
    const rows = myViolations.map(v => {
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
      downloadExcel(`laporan_pelanggaran_oleh_${teacher.name.replace(/\s+/g, '_')}.xlsx`, headers, rows, 'Laporan Pelanggaran');
      setSuccessMsg('Berhasil mengunduh rekapan catatan kedisiplinan (Excel)!');
    } else {
      printTablePDF(`Laporan Penegakan Kedisiplinan oleh ${teacher.name}`, headers, rows, headmasterName);
      setSuccessMsg('Rekapitulasi penegakan kedisiplinan berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportRiwayatGuru = (format: 'excel' | 'pdf') => {
    const myAttendance = attendance.filter(a => a.recordedBy === teacher.name);
    const myViolations = violations.filter(v => v.recordedBy === teacher.name);
    
    const headers = ["Kategori Log", "Tanggal", "Siswa / Subjek", "Detail Status / Pelanggaran", "Catatan Khusus"];
    const rows: (string | number)[][] = [
      ...myAttendance.map(a => {
        const s = students.find(std => std.id === a.studentId);
        return [
          "Presensi Kelas",
          a.date,
          s?.name || 'Siswa Terhapus',
          `Status: ${a.status}`,
          a.notes || '-'
        ];
      }),
      ...myViolations.map(v => {
        const s = students.find(std => std.id === v.studentId);
        const type = violationTypes.find(vt => vt.id === v.violationTypeId);
        return [
          "Laporan Pelanggaran",
          v.date,
          s?.name || 'Siswa Terhapus',
          `${type?.name || 'Pelanggaran'} (+${v.points} Poin)`,
          v.notes || '-'
        ];
      })
    ];

    if (format === 'excel') {
      downloadExcel(`riwayat_entri_guru_${teacher.name.replace(/\s+/g, '_')}.xlsx`, headers, rows, 'Riwayat Entri');
      setSuccessMsg('Berhasil mengunduh Riwayat Laporan Entri Anda (Excel)!');
    } else {
      printTablePDF(`Riwayat Aktivitas & Laporan Entri Guru - ${teacher.name}`, headers, rows, headmasterName);
      setSuccessMsg('Riwayat Laporan Anda berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportVerifikasiMapel = (format: 'excel' | 'pdf') => {
    const selfRecords = attendance.filter(a => a.isSelfAttendance);
    const headers = ["Tanggal", "Waktu Check-In", "Nama Siswa", "Kelas", "Status Diajukan", "Verifikasi Guru Mapel", "Keterangan"];
    const rows = selfRecords.map(a => {
      const s = students.find(std => std.id === a.studentId);
      const c = classes.find(cls => cls.id === a.classId);
      return [
        a.date,
        a.timestamp || '-',
        s?.name || 'Siswa Terhapus',
        c?.name || '-',
        a.status,
        a.isVerifiedByMapel ? 'Disetujui' : 'Belum/Ditolak',
        a.notes || '-'
      ];
    });

    if (format === 'excel') {
      downloadExcel('rekap_verifikasi_absensi_mandiri.xlsx', headers, rows, 'Verifikasi Mandiri');
      setSuccessMsg('Berhasil mengunduh Rekap Verifikasi Absensi Mandiri (Excel)!');
    } else {
      printTablePDF('Rekapitulasi Verifikasi Presensi Mandiri Siswa', headers, rows, headmasterName);
      setSuccessMsg('Dokumen Verifikasi Absensi berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportJadwalUjian = (format: 'excel' | 'pdf') => {
    const headers = ["Tanggal", "Jam Ujian", "Mata Pelajaran", "Target Kelas", "Jenis Evaluasi", "Ruangan / Tempat"];
    const rows = examSchedules.map(e => [
      e.date,
      e.time || '-',
      e.subject,
      e.classId === 'all' ? 'Semua Kelas' : classes.find(c => c.id === e.classId)?.name || e.classId,
      e.type,
      e.room || 'Ruang CBT'
    ]);

    if (format === 'excel') {
      downloadExcel('jadwal_evaluasi_cbt_sekolah.xlsx', headers, rows, 'Jadwal Ujian');
      setSuccessMsg('Jadwal Evaluasi Ujian CBT berhasil diunduh (Excel)!');
    } else {
      printTablePDF('Jadwal Pelaksanaan Evaluasi & Ujian CBT', headers, rows, headmasterName);
      setSuccessMsg('Jadwal Ujian berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportBankSoal = (format: 'excel' | 'pdf') => {
    const headers = ["Judul Bank Soal", "Mata Pelajaran", "Tingkat Kelas", "Jumlah Soal", "Tanggal Dibuat", "Author"];
    const rows = teacherBanks.map(b => [
      b.title,
      b.subject,
      b.gradeClass || 'Semua Tingkat',
      b.questions?.length || 0,
      b.createdAt || '-',
      teacher.name
    ]);

    if (format === 'excel') {
      downloadExcel(`bank_soal_cbt_${teacher.name.replace(/\s+/g, '_')}.xlsx`, headers, rows, 'Bank Soal');
      setSuccessMsg('Daftar Bank Soal CBT berhasil diunduh (Excel)!');
    } else {
      printTablePDF(`Daftar Bank Soal CBT - ${teacher.name}`, headers, rows, headmasterName);
      setSuccessMsg('Daftar Bank Soal berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExportGuruWaliView = (format: 'excel' | 'pdf') => {
    const myWaliStudents = students.filter(s => s.guruWaliTeacherId === teacher.id);
    const headers = ["NISN", "Nama Siswa", "Kelas", "Kategori Bimbingan", "Catatan Perkembangan", "Bakat & Minat"];
    const rows = myWaliStudents.map(s => {
      const c = classes.find(cls => cls.id === s.classId);
      const note = counselorNotes.filter(n => n.studentId === s.id).pop();
      return [
        s.nisn,
        s.name,
        c?.name || '-',
        note?.notes ? 'Bimbingan Aktif' : 'Pemantauan Rutin',
        note?.notes || 'Perkembangan belajar terpantau baik',
        s.bakatMinat || 'Belum diisi'
      ];
    });

    if (format === 'excel') {
      downloadExcel(`pendampingan_guru_wali_${teacher.name.replace(/\s+/g, '_')}.xlsx`, headers, rows, 'Guru Wali');
      setSuccessMsg('Laporan Pendampingan Guru Wali berhasil diunduh (Excel)!');
    } else {
      printTablePDF(`Laporan Pendampingan Akademik Guru Wali - ${teacher.name}`, headers, rows, headmasterName);
      setSuccessMsg('Laporan Guru Wali berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Helper for dynamic contextual download config based on activeTab
  const getContextualDownloadConfig = () => {
    switch (activeTab) {
      case 'presensi': {
        const clsName = classes.find(c => c.id === selectedClassId)?.name || 'Kelas';
        return {
          labelExcel: `Presensi ${clsName} (Excel)`,
          labelPdf: `Presensi ${clsName} (PDF)`,
          onExcel: () => handleExportPresensiGuru('excel'),
          onPdf: () => handleExportPresensiGuru('pdf'),
        };
      }
      case 'pelanggaran': {
        return {
          labelExcel: 'Pelanggaran (Excel)',
          labelPdf: 'Pelanggaran (PDF)',
          onExcel: () => handleExportPelanggaranGuru('excel'),
          onPdf: () => handleExportPelanggaranGuru('pdf'),
        };
      }
      case 'jurnal-harian': {
        return {
          labelExcel: 'Jurnal Mengajar (Excel)',
          labelPdf: 'Jurnal Mengajar (PDF)',
          onExcel: () => handleExportTeachingJournal('excel'),
          onPdf: () => handleExportTeachingJournal('pdf'),
        };
      }
      case 'riwayat': {
        return {
          labelExcel: 'Riwayat Laporan (Excel)',
          labelPdf: 'Riwayat Laporan (PDF)',
          onExcel: () => handleExportRiwayatGuru('excel'),
          onPdf: () => handleExportRiwayatGuru('pdf'),
        };
      }
      case 'verifikasi-mandiri': {
        return {
          labelExcel: 'Verifikasi Absensi (Excel)',
          labelPdf: 'Verifikasi Absensi (PDF)',
          onExcel: () => handleExportVerifikasiMapel('excel'),
          onPdf: () => handleExportVerifikasiMapel('pdf'),
        };
      }
      case 'jadwal-ujian': {
        return {
          labelExcel: 'Jadwal Ujian (Excel)',
          labelPdf: 'Jadwal Ujian (PDF)',
          onExcel: () => handleExportJadwalUjian('excel'),
          onPdf: () => handleExportJadwalUjian('pdf'),
        };
      }
      case 'bank-soal': {
        return {
          labelExcel: 'Bank Soal (Excel)',
          labelPdf: 'Bank Soal (PDF)',
          onExcel: () => handleExportBankSoal('excel'),
          onPdf: () => handleExportBankSoal('pdf'),
        };
      }
      case 'guru-wali-view': {
        return {
          labelExcel: 'Guru Wali (Excel)',
          labelPdf: 'Guru Wali (PDF)',
          onExcel: () => handleExportGuruWaliView('excel'),
          onPdf: () => handleExportGuruWaliView('pdf'),
        };
      }
      default:
        return {
          labelExcel: 'Presensi (Excel)',
          labelPdf: 'Presensi (PDF)',
          onExcel: () => handleExportPresensiGuru('excel'),
          onPdf: () => handleExportPresensiGuru('pdf'),
        };
    }
  };

  const downloadConfig = getContextualDownloadConfig();

  // Calculate roles this teacher holds
  const qualifiedRoles: { role: string; label: string }[] = [
    { role: 'guru', label: 'Guru Mata Pelajaran' }
  ];
  if (classes.some(c => c.homeroomTeacherId === teacher.id)) {
    qualifiedRoles.push({ role: 'wali_kelas', label: 'Wali Kelas' });
  }
  if (students.some(s => s.guruWaliTeacherId === teacher.id)) {
    qualifiedRoles.push({ role: 'guru_wali', label: 'Guru Wali (Akademik)' });
  }
  if (teacher.role === 'bk') {
    qualifiedRoles.push({ role: 'bk', label: 'Guru BK' });
  }
  if (teacher.role === 'piket') {
    qualifiedRoles.push({ role: 'piket', label: 'Guru Piket' });
  }

  return (
    <div className="space-y-6">
      {/* Teacher Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider">Portal Guru Pengajar</p>
            <h1 className="text-2xl font-bold">{teacher.name}</h1>
            <p className="text-teal-100 text-sm">NIP: {teacher.nip}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadConfig.onExcel}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              title={`Unduh ${downloadConfig.labelExcel}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{downloadConfig.labelExcel}</span>
            </button>
            <button
              type="button"
              onClick={downloadConfig.onPdf}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              title={`Cetak ${downloadConfig.labelPdf}`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>{downloadConfig.labelPdf}</span>
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-2.5 font-medium shadow-sm transition-all animate-bounce">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Contents */}
      <div className="w-full">
        {/* PRESENSI TAB */}
        {activeTab === 'presensi' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Presensi</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Keterangan Jumlah Siswa: Laki-laki & Perempuan sesuai kelas */}
            <div className="bg-gradient-to-r from-slate-50 via-teal-50/40 to-blue-50/40 p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-slate-200/80 pb-2.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    Keterangan Komposisi Siswa & Status Presensi Kelas
                  </h4>
                  <p className="text-xs text-slate-500">
                    Rincian jumlah siswa laki-laki dan perempuan pada kelas terpilih
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md">
                    Hadir: {filteredStudents.filter((s) => (attendanceStatuses[s.id]?.status || 'Hadir') === 'Hadir').length}
                  </span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">
                    Sakit/Izin: {filteredStudents.filter((s) => ['Sakit', 'Izin'].includes(attendanceStatuses[s.id]?.status || '')).length}
                  </span>
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-md">
                    Alpa: {filteredStudents.filter((s) => (attendanceStatuses[s.id]?.status || '') === 'Alpa').length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-base">
                    👥
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
                    <p className="text-lg font-extrabold text-slate-800">
                      {filteredStudents.length} <span className="text-xs font-normal text-slate-500">Siswa</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200/80 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-700 text-base">
                    👨
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Siswa Laki-Laki (L)</p>
                    <p className="text-lg font-extrabold text-blue-800">
                      {filteredStudents.filter((s) => (s.gender || 'Laki-laki').toLowerCase() === 'laki-laki').length} <span className="text-xs font-normal text-slate-500">Siswa</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-rose-200/80 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold text-rose-700 text-base">
                    👩
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Siswa Perempuan (P)</p>
                    <p className="text-lg font-extrabold text-rose-800">
                      {filteredStudents.filter((s) => (s.gender || '').toLowerCase() === 'perempuan').length} <span className="text-xs font-normal text-slate-500">Siswa</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitAttendance} className="space-y-4">
              <div className="border rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-slate-100 text-slate-700 border-b">
                    <tr>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3 text-center">Status Presensi</th>
                      <th className="p-3">Catatan / Keterangan tambahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">Tidak ada siswa terdaftar di kelas ini.</td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const entry = attendanceStatuses[s.id] || { status: 'Hadir', notes: '' };
                        const existingRecord = attendance.find((a) => a.studentId === s.id && a.date === attendanceDate);
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/55 transition-all">
                            <td className="p-3">
                              <p className="font-semibold text-slate-800 flex items-center gap-2">
                                <span>{s.name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  (s.gender || 'Laki-laki').toLowerCase() === 'perempuan'
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                  {(s.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}
                                </span>
                              </p>
                              {existingRecord?.timestamp && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono mt-0.5">
                                  ⏰ Check-In Mandiri: {existingRecord.timestamp}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-500">{s.nisn}</td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1">
                                {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(s.id, st)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                      entry.status === st
                                        ? st === 'Hadir' ? 'bg-emerald-600 text-white shadow' :
                                          st === 'Sakit' ? 'bg-blue-600 text-white shadow' :
                                          st === 'Izin' ? 'bg-amber-600 text-white shadow' :
                                          'bg-rose-600 text-white shadow'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Tulis alasan jika Sakit/Izin/Alpa..."
                                value={entry.notes}
                                onChange={(e) => handleNotesChange(s.id, e.target.value)}
                                className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow text-sm flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Presensi Kelas
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* PELANGGARAN TAB */}
        {activeTab === 'pelanggaran' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Laporkan Pelanggaran Tata Tertib Sekolah
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Laporan pelanggaran yang Anda masukkan di sini akan secara otomatis diakumulasikan ke database siswa. Wali Kelas, Guru BK, dan Orang Tua bersangkutan akan langsung mendapatkan notifikasi di portal masing-masing.
            </p>

            <form onSubmit={handleSubmitViolation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Kelas Terlebih Dahulu <span className="text-rose-500">*</span></label>
                  <select
                    value={violationFilterClassId}
                    onChange={(e) => {
                      setViolationFilterClassId(e.target.value);
                      setTargetStudentId(''); // Reset selected student when class filter changes
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700 cursor-pointer shadow-sm"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    <option value="all">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Siswa Pelanggar <span className="text-rose-500">*</span></label>
                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    disabled={!violationFilterClassId}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {!violationFilterClassId ? (
                      <option value="">Silakan pilih kelas terlebih dahulu</option>
                    ) : (
                      <>
                        <option value="">-- Pilih Siswa Pelanggar --</option>
                        {students
                          .filter(s => violationFilterClassId === 'all' || s.classId === violationFilterClassId)
                          .map((s) => {
                            const sClass = classes.find((c) => c.id === s.classId);
                            return (
                              <option key={s.id} value={s.id}>{s.name} ({sClass?.name})</option>
                            );
                          })}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jenis Pelanggaran & Bobot Poin</label>
                  <select
                    value={selectedViolationTypeId}
                    onChange={(e) => setSelectedViolationTypeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {violationTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        [{vt.category}] {vt.name} (+{vt.points} Poin)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Kejadian</label>
                  <input
                    type="date"
                    value={violationDate}
                    onChange={(e) => setViolationDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan Kejadian Tambahan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Terlihat merokok di belakang kantin pukul 10:15..."
                    value={violationNotes}
                    onChange={(e) => setViolationNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer shadow transition-all"
                >
                  <Send className="w-4 h-4" />
                  Kirim Laporan Pelanggaran
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RIWAYAT ENTRI TAB */}
        {activeTab === 'riwayat' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h4 className="font-bold text-slate-800 border-b pb-2 mb-3">Entri Presensi Terakhir Anda</h4>
              <div className="divide-y max-h-[350px] overflow-y-auto">
                {attendance.filter(a => a.recordedBy === teacher.name).length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-4">Belum ada presensi yang Anda catat hari ini.</p>
                ) : (
                  attendance.filter(a => a.recordedBy === teacher.name).slice().reverse().map((rec) => {
                    const student = students.find(s => s.id === rec.studentId);
                    return (
                      <div key={rec.id} className="py-2.5 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{student?.name}</p>
                          <p className="text-xs text-slate-400">{new Date(rec.date).toLocaleDateString('id-ID')} &bull; Status: {rec.status}</p>
                        </div>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{rec.classId.replace('c-', '').toUpperCase()}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h4 className="font-bold text-slate-800 border-b pb-2 mb-3">Laporan Pelanggaran Terakhir Anda</h4>
              <div className="divide-y max-h-[350px] overflow-y-auto">
                {violations.filter(v => v.recordedBy === teacher.name).length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-4">Belum ada pelanggaran yang Anda laporkan.</p>
                ) : (
                  violations.filter(v => v.recordedBy === teacher.name).slice().reverse().map((v) => {
                    const student = students.find(s => s.id === v.studentId);
                    const type = violationTypes.find(vt => vt.id === v.violationTypeId);
                    return (
                      <div key={v.id} className="py-2.5 space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-slate-800">{student?.name}</p>
                          <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 rounded">+{v.points} Poin</span>
                        </div>
                        <p className="text-xs text-slate-500">[{type?.category}] {type?.name}</p>
                        {v.notes && <p className="text-xs text-slate-400 italic">"{v.notes}"</p>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Verifikasi Mandiri Siswa (Mapel) */}
        {activeTab === 'verifikasi-mandiri' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-teal-600" />
                  <span>Verifikasi Presensi Mandiri Siswa (Tingkat Guru Mapel)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Berikut adalah daftar pengajuan absensi mandiri siswa. Tinjau foto selfie GPS watermark dan lakukan tindakan verifikasi agar terintegrasi penuh ke semua rekap laporan.
                </p>
              </div>

              {/* Filter Harian */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
                <Calendar className="w-4 h-4 text-teal-600 ml-1" />
                <span className="text-xs font-bold text-slate-700">Tanggal:</span>
                <input
                  type="date"
                  value={verifyDateFilter}
                  onChange={(e) => setVerifyDateFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setVerifyDateFilter(new Date().toISOString().split('T')[0])}
                  className="text-[11px] font-bold bg-teal-100 hover:bg-teal-200 text-teal-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Hari Ini
                </button>
                {verifyDateFilter && (
                  <button
                    type="button"
                    onClick={() => setVerifyDateFilter('')}
                    className="text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Semua Tanggal
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {attendance.filter((a) => a.isSelfAttendance && (!verifyDateFilter || a.date === verifyDateFilter)).length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <UserCheck className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-medium">
                    {verifyDateFilter
                      ? `Tidak ada pengajuan absen mandiri dari siswa untuk tanggal ${verifyDateFilter}.`
                      : 'Tidak ada pengajuan absen mandiri dari siswa.'}
                  </p>
                  {verifyDateFilter && (
                    <button
                      type="button"
                      onClick={() => setVerifyDateFilter('')}
                      className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                    >
                      Lihat Semua Tanggal
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {attendance
                    .filter((a) => a.isSelfAttendance && (!verifyDateFilter || a.date === verifyDateFilter))
                    .map((record) => {
                    const student = students.find((s) => s.id === record.studentId);
                    const sClass = classes.find((c) => c.id === record.classId);

                    return (
                      <div key={record.id} className="p-4 border rounded-xl hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                        <div className="flex items-start gap-3">
                          {record.photoProof ? (
                            <div 
                              onClick={() => setPreviewPhotoRecord(record)}
                              className="relative group cursor-pointer shrink-0"
                              title="Klik untuk Zoom / Preview Foto Absensi"
                            >
                              <img
                                src={record.photoProof}
                                alt="Bukti Selfie"
                                className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 group-hover:border-teal-500 shadow-sm bg-slate-100 transition-all group-hover:brightness-95"
                              />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                <span>Preview</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-slate-100 border flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-slate-400 italic">No Photo</span>
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{student?.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 font-bold uppercase">{sClass?.name || 'N/A'}</span>
                            </div>
                            <p className="text-xs text-slate-600">
                              Status Diajukan: <span className="font-bold text-slate-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{record.status}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Waktu: {record.date} &bull; {record.timestamp || 'N/A'}
                            </p>
                            {record.notes && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded inline-block">
                                Keterangan: "{record.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                          <div className="text-right text-xs mr-2">
                            <p className="font-semibold text-slate-500">Verifikasi Guru Mapel:</p>
                            {record.isVerifiedByMapel ? (
                              <span className="text-teal-600 font-bold block">✓ Sudah Disetujui</span>
                            ) : record.verificationStatus === 'Rejected' && !record.isVerifiedByMapel ? (
                              <span className="text-rose-600 font-bold block">✗ Sudah Ditolak</span>
                            ) : (
                              <span className="text-amber-500 font-semibold block animate-pulse">⋯ Menunggu Tindakan</span>
                            )}
                          </div>

                          {(!record.isVerifiedByMapel && record.verificationStatus !== 'Rejected') ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onVerifyAttendance(record.id, 'mapel', 'Verified');
                                }}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer shadow-sm hover:shadow transition-all"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerConfirm(
                                    'Tolak Pengajuan Absen',
                                    'Apakah Anda yakin ingin menolak pengajuan absen mandiri siswa ini?',
                                    () => onVerifyAttendance(record.id, 'mapel', 'Rejected'),
                                    'Ya, Tolak'
                                  );
                                }}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-200 cursor-pointer transition-all"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="bg-slate-100 text-slate-400 text-xs font-bold px-3 py-1.5 rounded-lg cursor-not-allowed border"
                            >
                              Selesai
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* JURNAL HARIAN TAB */}
        {activeTab === 'jurnal-harian' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Input Jurnal Mengajar Harian</h3>
                  <p className="text-xs text-slate-500">Tulis dan simpan pertanggungjawaban kegiatan pembelajaran harian Anda.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExportTeachingJournal('excel')}
                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    title="Unduh Daftar Jurnal Mengajar format Excel"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>Jurnal Mengajar (Excel)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportTeachingJournal('pdf')}
                    className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded-md text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    title="Cetak Daftar Jurnal Mengajar ke PDF"
                  >
                    <FileText className="w-3 h-3 text-rose-600" />
                    <span>Jurnal Mengajar (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPresensiGuru('excel')}
                    className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-md text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    title="Unduh Jurnal Kelas Aktif format Excel"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>Absen Kelas (Excel)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPresensiGuru('pdf')}
                    className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-md text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    title="Cetak Jurnal Kelas Aktif ke PDF"
                  >
                    <FileText className="w-3 h-3 text-rose-600" />
                    <span>Absen Kelas (PDF)</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitJournal} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hari &amp; Tanggal Mengajar</label>
                    <input
                      type="date"
                      required
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kelas yang Diajar</label>
                    <select
                      value={journalClass}
                      onChange={(e) => setJournalClass(e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mata Pelajaran</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Matematika, Bahasa Inggris"
                      value={journalSubject}
                      onChange={(e) => setJournalSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kompetensi Dasar (KD)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: KD 3.2 Menjelaskan Persamaan Kuadrat"
                      value={journalKD}
                      onChange={(e) => setJournalKD(e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tujuan Pembelajaran (TP)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Peserta didik dapat menyelesaikan soal persamaan kuadrat dengan tepat"
                      value={journalTP}
                      onChange={(e) => setJournalTP(e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Materi Ajar</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Tulis ringkasan materi ajar yang disampaikan hari ini..."
                      value={journalMaterial}
                      onChange={(e) => setJournalMaterial(e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rekap Kehadiran Siswa</span>
                      <button
                        type="button"
                        onClick={syncJournalFromAttendance}
                        title="Sinkronkan Kehadiran dari Absensi Kelas"
                        className="flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-200 hover:bg-teal-100 shadow-2xs text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jumlah Siswa Hadir</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={journalPresent}
                          onChange={(e) => setJournalPresent(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jumlah Siswa Gak Hadir</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={journalAbsent}
                          onChange={(e) => setJournalAbsent(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-rose-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan &amp; Keterangan Kelas</label>
                    <textarea
                      rows={2}
                      placeholder="Misal: 2 siswa izin sakit, suasana kelas kondusif, PR dikumpulkan tepat waktu..."
                      value={journalNotesText}
                      onChange={(e) => setJournalNotesText(e.target.value)}
                      className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Digital Signature Canvas */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Tanda Tangan Digital Guru</label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative">
                      <canvas
                        ref={signatureCanvasRef}
                        width={350}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full block bg-white h-[120px] cursor-crosshair touch-none"
                      />
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="absolute right-2 bottom-2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-900 shadow font-bold"
                      >
                        Bersihkan
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Gambar tanda tangan Anda dengan mouse atau layar sentuh di area putih di atas.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Jurnal Mengajar Harian
                  </button>
                </div>
              </form>
            </div>

            {/* List of Entered Journals */}
            <div className="bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800">Daftar Jurnal Mengajar Anda</h4>
              {teachingJournals.filter(j => j.teacherId === teacher.id).length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada jurnal mengajar yang disimpan.</p>
              ) : (
                <div className="border rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm min-w-[700px]">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Kelas</th>
                        <th className="p-3">Mapel</th>
                        <th className="p-3">Materi / KD</th>
                        <th className="p-3">Kehadiran</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs text-slate-700">
                      {teachingJournals
                        .filter(j => j.teacherId === teacher.id)
                        .map((j) => (
                          <tr key={j.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium">{j.date}</td>
                            <td className="p-3 font-semibold text-teal-700">{classes.find(c => c.id === j.classId)?.name || j.classId}</td>
                            <td className="p-3 font-semibold">{j.subject}</td>
                            <td className="p-3 leading-relaxed">
                              <p className="font-semibold text-slate-800">{j.competensiDasar}</p>
                              <p className="text-slate-500 text-[11px]">{j.material}</p>
                            </td>
                            <td className="p-3">
                              <span className="bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded border border-teal-200">H: {j.presentCount}</span>
                              <span className="bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-200 ml-1">A: {j.absentCount}</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handlePrintJournal(j)}
                                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-sm text-[11px] transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Cetak PDF
                                </button>
                                {onDeleteTeachingJournal && (
                                  <button
                                    onClick={() => {
                                      triggerConfirm(
                                        'Hapus Jurnal Mengajar',
                                        `Apakah Anda yakin ingin menghapus jurnal mengajar tanggal ${j.date} kelas ${classes.find(c => c.id === j.classId)?.name || j.classId}?`,
                                        () => onDeleteTeachingJournal(j.id)
                                      );
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-1.5 rounded-lg font-bold flex items-center justify-center cursor-pointer transition-all"
                                    title="Hapus Jurnal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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

        {/* JADWAL UJIAN TAB */}
        {activeTab === 'jadwal-ujian' && (
          <div className="space-y-6">
            {/* PIN Bypass Configuration Card for Guru Mapel */}
            <div className="bg-white rounded-xl p-5 border border-teal-200/80 shadow-sm space-y-3">
              <div className="flex items-start gap-3 pb-2 border-b">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">PIN Bypass / Password Pengawas Ujian</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Kata sandi pengaman ini digunakan oleh guru pengawas untuk membuka status lembar ujian siswa jika terdeteksi melanggar tata tertib atau keluar dari mode aman Exambro.
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
                    value={cbtPin}
                    onChange={(e) => setCbtPin(e.target.value.trim())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const generated = Math.floor(100000 + Math.random() * 900000).toString();
                      setCbtPin(generated);
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
                      if (!cbtPin) {
                        alert('PIN tidak boleh kosong!');
                        return;
                      }
                      if (onUpdateCbtBypassPin) {
                        onUpdateCbtBypassPin(cbtPin);
                      } else {
                        safeLocalStorageSet('siakad_cbt_bypass_pin', cbtPin);
                      }
                      alert(`PIN Pengawas berhasil diperbarui secara tersinkronisasi menjadi: ${cbtPin}`);
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer h-10 flex items-center justify-center text-xs active:scale-95"
                  >
                    Simpan PIN Baru
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Kelola Jadwal Ujian CBT</h3>
                <p className="text-xs text-slate-500">Buat jadwal evaluasi, latihan, atau UTS. Jadwal ini akan otomatis sinkron ke akun siswa.</p>
              </div>

              <form onSubmit={handleSubmitExam} className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mata Pelajaran <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={examSubject}
                      onChange={(e) => setExamSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg transition-all outline-none cursor-pointer font-medium text-slate-700 focus:ring-2 focus:ring-teal-500"
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
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Kelas (Pilih Beberapa Kelas) <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto shadow-inner">
                      <label className="flex items-center gap-1.5 cursor-pointer col-span-2 border-b pb-1 mb-1">
                        <input
                          type="checkbox"
                          checked={examClass === 'all'}
                          onChange={() => setExamClass(examClass === 'all' ? '' : 'all')}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="font-bold text-slate-700">Semua Kelas (all)</span>
                      </label>
                      {classes.map((c) => {
                        const classIds = examClass === 'all' ? [] : examClass.split(',').map(x => x.trim()).filter(Boolean);
                        const isChecked = classIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={examClass === 'all'}
                              checked={examClass === 'all' || isChecked}
                              onChange={() => {
                                let newIds;
                                if (isChecked) {
                                  newIds = classIds.filter(id => id !== c.id);
                                } else {
                                  newIds = [...classIds, c.id];
                                }
                                setExamClass(newIds.join(', '));
                              }}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-slate-600 text-xs font-medium">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kategori Ujian</label>
                    <select
                      value={examTypeStr}
                      onChange={(e) => setExamTypeStr(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border rounded-lg font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="Evaluasi Harian">Evaluasi Harian</option>
                      <option value="Latihan Soal">Latihan Soal</option>
                      <option value="UTS">UTS (Ujian Tengah Semester)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Ujian</label>
                      <input
                        type="date"
                        required
                        value={examDateStr}
                        onChange={(e) => setExamDateStr(e.target.value)}
                        className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>Waktu Pelaksanaan <span className="text-rose-500">*</span></span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          required
                          value={examStartTime}
                          onChange={(e) => setExamStartTime(e.target.value)}
                          className="w-full px-2 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                        />
                        <span className="text-slate-400 font-bold">s/d</span>
                        <input
                          type="time"
                          required
                          value={examEndTime}
                          onChange={(e) => setExamEndTime(e.target.value)}
                          className="w-full px-2 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ruangan / Server CBT</label>
                      <input
                        type="text"
                        required
                        value={examRoomStr}
                        onChange={(e) => setExamRoomStr(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                        placeholder="Misal: Ruang CBT-01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        KKM / KKTP Target <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={examKkm}
                        onChange={(e) => setExamKkm(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-700"
                        placeholder="75"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Metode Ujian CBT</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setExamMethod('gform')}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          examMethod === 'gform'
                            ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Tautan Google Form
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamMethod('bank_soal')}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          examMethod === 'bank_soal'
                            ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        CBT Bank Soal Mandiri
                      </button>
                    </div>

                    {examMethod === 'gform' ? (
                      <input
                        type="url"
                        placeholder="https://docs.google.com/forms/d/..."
                        value={examGoogleFormUrl}
                        onChange={(e) => setExamGoogleFormUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none text-xs font-mono"
                      />
                    ) : (
                      <div>
                        {teacherBanks.length === 0 ? (
                          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-800 font-medium text-left">
                            Anda belum memiliki Bank Soal. Buat Bank Soal terlebih dahulu di menu <strong className="text-amber-900">Bank Soal CBT</strong> di sidebar kiri Anda.
                          </div>
                        ) : (
                          <select
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="">-- Pilih Bank Soal Anda --</option>
                            {teacherBanks.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.title} ({b.questions?.length || 0} Soal)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-xl font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Terbitkan Jadwal Ujian
                  </button>
                </div>
              </form>
            </div>

            {/* List of active exam schedules */}
            <div className="bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800">Daftar Agenda Ujian Aktif</h4>
              {examSchedules.filter(s => s.teacherId === teacher.id).length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada agenda ujian yang Anda terbitkan.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {examSchedules
                    .filter(s => s.teacherId === teacher.id)
                    .map((s) => (
                      <div key={s.id} className="border rounded-xl p-4 space-y-3 bg-slate-50/50">
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.examType === 'UTS' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            s.examType === 'Latihan Soal' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {s.examType}
                          </span>
                          {onDeleteExamSchedule && (
                            <button
                              onClick={() => {
                                triggerConfirm(
                                  'Batalkan Jadwal Ujian',
                                  `Apakah Anda yakin ingin membatalkan jadwal ujian ${s.subject}?`,
                                  () => onDeleteExamSchedule(s.id),
                                  'Ya, Batalkan'
                                );
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm leading-tight">{s.subject}</h5>
                          <p className="text-xs text-teal-700 font-bold mt-1">Kelas: {s.classId === 'all' ? 'Semua Kelas' : s.classId.split(',').map(id => classes.find(c => c.id === id.trim())?.name || id.trim()).join(', ')}</p>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1 bg-white p-2 rounded-lg border border-slate-100">
                          <p>📅 <strong>Tanggal:</strong> {s.date}</p>
                          <p>⏰ <strong>Waktu:</strong> {s.time}</p>
                          <p>📍 <strong>Ruang:</strong> {s.room}</p>
                        </div>
                        {s.googleFormUrl ? (
                          <a
                            href={s.googleFormUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-center text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg font-semibold transition-all"
                          >
                            Buka Link Google Form
                          </a>
                        ) : s.questionBankId ? (
                          <div className="text-[11px] text-center bg-teal-50 border border-teal-100 text-teal-700 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1">
                            <Database className="w-3.5 h-3.5" />
                            <span>Link CBT: Bank Soal Terhubung</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* CBT Score Exporter for Guru */}
            <CbtScoreExporter
              students={students}
              classes={classes}
              studentSubmissions={studentSubmissions}
              examGrades={examGrades}
              examSchedules={examSchedules}
            />
          </div>
        )}

        {/* GURU WALI BINAAN TAB */}
        {activeTab === 'guru-wali-view' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Advised Students */}
            <div className="bg-white rounded-xl p-5 border shadow-sm space-y-4 lg:col-span-1">
              <div className="border-b pb-2">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Siswa Binaan Akademik
                </h3>
                <p className="text-[11px] text-slate-500">Siswa yang Anda dampingi secara akademik selaku Guru Wali.</p>
              </div>

              <div className="space-y-2">
                {students
                  .filter(s => s.guruWaliTeacherId === teacher.id)
                  .map((s) => {
                    const isSelected = selectedAdvisingStudentId === s.id;
                    const studentClass = classes.find(c => c.id === s.classId);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedAdvisingStudentId(s.id);
                          setAdvisingNote('');
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/50 border-indigo-400 shadow-sm'
                            : 'bg-slate-50/30 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-800 truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">NISN: {s.nisn} &bull; {studentClass?.name || '-'}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Advising Student Details */}
            <div className="lg:col-span-2 space-y-6">
              {(() => {
                const s = students.find(std => std.id === selectedAdvisingStudentId);
                if (!s) {
                  return (
                    <div className="bg-white rounded-xl p-8 border shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
                      <GraduationCap className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
                      <p className="font-bold text-slate-700 text-sm">Pilih Siswa Binaan</p>
                      <p className="text-xs text-slate-400 mt-1">Silakan pilih salah satu siswa binaan di panel sebelah kiri untuk mulai bimbingan akademik.</p>
                    </div>
                  );
                }

                const sClass = classes.find(c => c.id === s.classId);
                const sAttendance = attendance.filter(a => a.studentId === s.id);
                const presentDays = sAttendance.filter(a => a.status === 'Hadir').length;
                const totalDays = sAttendance.length || 1;
                const attendanceRate = Math.round((presentDays / totalDays) * 100);

                const sViolations = violations.filter(v => v.studentId === s.id);
                const totalPoints = sViolations.reduce((sum, v) => sum + v.points, 0);

                const sCounselorNotes = counselorNotes.filter(n => n.studentId === s.id);

                return (
                  <div className="space-y-6">
                    {/* Student Mini Profile Card */}
                    <div className="bg-white rounded-xl p-5 border shadow-sm flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h4 className="font-bold text-slate-800 text-base">{s.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">NISN: {s.nisn} &bull; Kelas: {sClass?.name || '-'}</p>
                        <p className="text-[11px] text-slate-500 mt-1">Wali Murid: {s.parentName} ({s.parentPhone})</p>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <div className="bg-indigo-50 px-3 py-2 rounded-xl text-center border border-indigo-100">
                          <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Hadir</span>
                          <span className="text-sm font-bold text-indigo-700">{attendanceRate}%</span>
                        </div>
                        <div className="bg-rose-50 px-3 py-2 rounded-xl text-center border border-rose-100">
                          <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider">Poin Sanksi</span>
                          <span className="text-sm font-bold text-rose-700">{totalPoints} Pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Guidance / Counselor Notes History */}
                    <div className="bg-white rounded-xl p-5 border shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-2">Riwayat Bimbingan Akademik &amp; Konseling</h4>
                      {sCounselorNotes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Belum ada riwayat bimbingan dicatat.</p>
                      ) : (
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {sCounselorNotes.map((note) => (
                            <div key={note.id} className="p-3 rounded-lg border text-xs leading-relaxed space-y-1.5 bg-slate-50/50">
                              <div className="flex justify-between items-start font-semibold text-slate-700">
                                <span className="text-indigo-700">{note.recordedBy}</span>
                                <span className="text-slate-400 font-mono text-[10px]">{note.date}</span>
                              </div>
                              <p className="text-slate-800">{note.notes}</p>
                              <div className="text-[10px] text-slate-500 bg-white p-1.5 rounded border border-slate-100">
                                <strong>Rekomendasi Tindak Lanjut:</strong> {note.followUp}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* New Guidance Form */}
                    <div className="bg-white rounded-xl p-5 border shadow-sm space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Input Catatan Pembinaan &amp; Bimbingan Guru Wali Baru</h4>
                      <form onSubmit={(e) => handleSubmitAdvisingNote(e, s.id)} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Topik Bimbingan:</label>
                            <select
                              value={advisingCategory}
                              onChange={(e) => setAdvisingCategory(e.target.value as any)}
                              className="w-full text-xs px-2.5 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                              <option value="Akademik">Akademik &amp; Hasil Belajar</option>
                              <option value="Karakter &amp; Akhlak">Karakter &amp; Akhlak</option>
                              <option value="Bakat dan Minat">Bakat dan Minat</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rencana Tindak Lanjut:</label>
                            <input
                              type="text"
                              placeholder="Contoh: Diskusi dengan orang tua / pembinaan lanjutan..."
                              value={advisingFollowUp}
                              onChange={(e) => setAdvisingFollowUp(e.target.value)}
                              className="w-full text-xs px-2.5 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Isi Detail Bimbingan &amp; Pembinaan:</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Tulis perkembangan hasil belajar siswa, minat bakat, motivasi belajar, atau arahan khusus pembinaan..."
                            value={advisingNote}
                            onChange={(e) => setAdvisingNote(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Simpan Catatan Guru Wali
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* BANK SOAL CBT MANDIRI TAB */}
        {activeTab === 'bank-soal' && (
          <BankSoalManager
            teacher={teacher}
            classes={classes}
          />
        )}

        {/* E-LEARNING INTERACTIVE TAB */}
        {activeTab === 'elearning' && (
          <ELearningPanel
            currentUser={teacher}
            isTeacher={true}
            isStudent={false}
            materials={elearningMaterials}
            progressList={elearningProgress}
            classes={classes}
            students={students}
            teachers={teachers}
            onAddMaterial={onAddMaterial}
            onDeleteMaterial={onDeleteMaterial}
            onUpdateProgress={onUpdateProgress}
            headmasterName={headmasterName}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {previewPhotoRecord && (
        <AttendancePhotoPreviewModal
          record={previewPhotoRecord}
          student={students.find((s) => s.id === previewPhotoRecord.studentId)}
          sClass={classes.find((c) => c.id === previewPhotoRecord.classId)}
          onClose={() => setPreviewPhotoRecord(null)}
          onVerify={onVerifyAttendance}
          canVerify={true}
          verifyRole="mapel"
        />
      )}
    </div>
  );
}
