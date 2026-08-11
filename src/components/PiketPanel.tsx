import React, { useState } from 'react';
import {
  Student,
  Attendance,
  SchoolClass,
  ViolationType,
  StudentViolation,
  Teacher,
  AbsentTeacher,
  ImportantEvent
} from '../types';
import {
  Clock,
  UserCheck,
  ShieldAlert,
  Check,
  UserX,
  FileText,
  Plus,
  Trash2,
  Printer,
  X,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF, printHTML } from '../utils/printHelper';
import ConfirmModal from './ConfirmModal';
import AttendancePhotoPreviewModal from './common/AttendancePhotoPreviewModal';
import ExportDateFilterModal from './ExportDateFilterModal';

interface PiketPanelProps {
  teacher: Teacher;
  teachers: Teacher[];
  students: Student[];
  classes: SchoolClass[];
  attendance: Attendance[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  onAddViolation: (v: Omit<StudentViolation, 'id'>) => void;
  onQuickAttendance: (rec: Omit<Attendance, 'id'>) => void;
  onVerifyAttendance: (id: string, role: 'piket' | 'mapel', action: 'Verified' | 'Rejected') => void;

  // Piket-specific data and handlers
  absentTeachers: AbsentTeacher[];
  importantEvents: ImportantEvent[];
  onAddAbsentTeacher: (t: Omit<AbsentTeacher, 'id'>) => void;
  onDeleteAbsentTeacher: (id: string) => void;
  onAddImportantEvent: (e: Omit<ImportantEvent, 'id'>) => void;
  onDeleteImportantEvent: (id: string) => void;
  headmasterName: string;
  activeTabOverride?: 'pintu-depan' | 'absensi-piket' | 'guru-absen' | 'kejadian-piket' | 'verifikasi-mandiri' | null;
  onTabChange?: (tab: 'pintu-depan' | 'absensi-piket' | 'guru-absen' | 'kejadian-piket' | 'verifikasi-mandiri') => void;
}

export default function PiketPanel({
  teacher,
  teachers,
  students,
  classes,
  attendance,
  violationTypes,
  violations,
  onAddViolation,
  onQuickAttendance,
  onVerifyAttendance,
  absentTeachers,
  importantEvents,
  onAddAbsentTeacher,
  onDeleteAbsentTeacher,
  onAddImportantEvent,
  onDeleteImportantEvent,
  headmasterName,
  activeTabOverride,
  onTabChange,
}: PiketPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'pintu-depan' | 'absensi-piket' | 'guru-absen' | 'kejadian-piket' | 'verifikasi-mandiri'>('pintu-depan');
  const [verifyDateFilter, setVerifyDateFilter] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<Attendance | null>(null);
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'pintu-depan' | 'absensi-piket' | 'guru-absen' | 'kejadian-piket' | 'verifikasi-mandiri') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);

  // Retrieve dynamic logos from Admin Settings (with default fallbacks)
  const dynamicLogoLeft = localStorage.getItem('siakad_logo_left') || '/logo-dki.png';
  const dynamicLogoRight = localStorage.getItem('siakad_logo_right') || '/logo.png';

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

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Ya, Tolak') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  // 1. Pintu Gerbang States
  const [gateClassId, setGateClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedViolationTypeId, setSelectedViolationTypeId] = useState(violationTypes[0]?.id || '');
  const [gateNotes, setGateNotes] = useState('');

  // 2. Absensi Piket States
  const [quickClassId, setQuickClassId] = useState('');
  const [quickStudentId, setQuickStudentId] = useState('');
  const [quickStatus, setQuickStatus] = useState<'Hadir' | 'Sakit' | 'Izin' | 'Alpa'>('Hadir');
  const [quickNotes, setQuickNotes] = useState('');

  // 3. Guru Tidak Hadir States
  const [absentTeacherName, setAbsentTeacherName] = useState('');
  const [absentSubject, setAbsentSubject] = useState('');
  const [absentClassId, setAbsentClassId] = useState('');
  const [absentReason, setAbsentReason] = useState('Sakit');
  const [absentSubstitute, setAbsentSubstitute] = useState('');

  // 4. Kejadian Penting States
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  // Today string
  const todayStr = new Date().toISOString().split('T')[0];

  // 5. PDF / Printing Report Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFilterStartDate, setPrintFilterStartDate] = useState(todayStr);
  const [printFilterEndDate, setPrintFilterEndDate] = useState(todayStr);

  // Date-filtered Export Modal State
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    type: 'kehadiran' | 'kedisiplinan' | 'jurnal' | 'rekap-harian';
    title: string;
  }>({
    isOpen: false,
    type: 'kehadiran',
    title: ''
  });

  // Download / Export Handlers with Date Filtering
  const handleExportDispatch = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    switch (exportModal.type) {
      case 'kehadiran':
        handleDownloadKehadiranPiket(startDate, endDate, format);
        break;
      case 'kedisiplinan':
        handleDownloadKedisiplinanPiket(startDate, endDate, format);
        break;
      case 'jurnal':
        handleDownloadJurnalHarianPiket(startDate, endDate, format);
        break;
      case 'rekap-harian':
        setPrintFilterStartDate(startDate || todayStr);
        setPrintFilterEndDate(endDate || todayStr);
        setIsPrintModalOpen(true);
        break;
    }
  };

  const handleDownloadKehadiranPiket = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = attendance;
    if (startDate) list = list.filter(a => a.date >= startDate);
    if (endDate) list = list.filter(a => a.date <= endDate);

    const headers = ["Nama Siswa", "NISN", "Kelas", "Tanggal", "Status Presensi", "Catatan", "Pencatat / Verifikator"];
    const rows = list.map(a => {
      const s = students.find(std => std.id === a.studentId);
      return [
        s?.name || 'Siswa Terhapus',
        s?.nisn || '-',
        classes.find(c => c.id === a.classId)?.name || '-',
        a.date,
        a.status,
        a.notes || '',
        a.recordedBy
      ];
    });
    const dateSuffix = startDate || endDate ? `_${startDate || 'awal'}_s.d_${endDate || 'akhir'}` : `_${todayStr}`;
    if (format === 'excel') {
      downloadExcel(`rekap_kehadiran_piket${dateSuffix}.xlsx`, headers, rows, 'Presensi Piket');
      setSuccessMsg('Rekapan Kehadiran berhasil diunduh (Excel)!');
    } else {
      printTablePDF(`Rekapitulasi Kehadiran Siswa oleh Guru Piket (${startDate || 'Semua'} s.d. ${endDate || 'Semua'})`, headers, rows, headmasterName);
      setSuccessMsg('Dokumen Kehadiran berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDownloadKedisiplinanPiket = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = violations;
    if (startDate) list = list.filter(v => v.date >= startDate);
    if (endDate) list = list.filter(v => v.date <= endDate);

    const headers = ["Nama Siswa", "Kelas", "Tanggal", "Jenis Pelanggaran", "Poin", "Catatan Kejadian", "Pencatat"];
    const rows = list.map(v => {
      const s = students.find(std => std.id === v.studentId);
      const type = violationTypes.find(vt => vt.id === v.violationTypeId);
      return [
        s?.name || 'Siswa Terhapus',
        classes.find(c => c.id === s?.classId)?.name || '-',
        v.date,
        type?.name || 'Pelanggaran Khusus',
        v.points,
        v.notes || '',
        v.recordedBy
      ];
    });
    const dateSuffix = startDate || endDate ? `_${startDate || 'awal'}_s.d_${endDate || 'akhir'}` : `_${todayStr}`;
    if (format === 'excel') {
      downloadExcel(`rekap_kedisiplinan_piket${dateSuffix}.xlsx`, headers, rows, 'Kedisiplinan Piket');
      setSuccessMsg('Rekapan Catatan Kedisiplinan berhasil diunduh (Excel)!');
    } else {
      printTablePDF(`Rekapitulasi Pelanggaran Kedisiplinan Siswa (${startDate || 'Semua'} s.d. ${endDate || 'Semua'})`, headers, rows, headmasterName);
      setSuccessMsg('Dokumen Kedisiplinan berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDownloadJurnalHarianPiket = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let filteredTeachers = absentTeachers;
    let filteredEvents = importantEvents;
    if (startDate) {
      filteredTeachers = filteredTeachers.filter(at => at.date >= startDate);
      filteredEvents = filteredEvents.filter(ie => ie.date >= startDate);
    }
    if (endDate) {
      filteredTeachers = filteredTeachers.filter(at => at.date <= endDate);
      filteredEvents = filteredEvents.filter(ie => ie.date <= endDate);
    }

    const headers = ["Tipe Catatan", "Tanggal", "Nama/Judul", "Detail 1", "Detail 2", "Keterangan/Catatan"];
    const rows: (string | number)[][] = [];

    filteredTeachers.forEach(at => {
      rows.push([
        "Guru Tidak Hadir",
        at.date,
        at.teacherName,
        `Mapel: ${at.subject}`,
        classes.find(c => c.id === at.classId)?.name || '-',
        `Alasan: ${at.reason} | Guru Pengganti: ${at.substituteTeacher || '-'}`
      ]);
    });

    filteredEvents.forEach(ie => {
      rows.push([
        "Kejadian Penting",
        ie.date,
        ie.title,
        `Waktu: ${ie.time}`,
        "-",
        ie.description
      ]);
    });

    const dateSuffix = startDate || endDate ? `_${startDate || 'awal'}_s.d_${endDate || 'akhir'}` : `_${todayStr}`;
    if (format === 'excel') {
      downloadExcel(`jurnal_harian_piket${dateSuffix}.xlsx`, headers, rows, 'Jurnal Piket');
      setSuccessMsg('Laporan Jurnal Harian Piket berhasil diunduh (Excel)!');
    } else {
      printTablePDF(`Laporan Jurnal Mengajar & Kejadian Penting (${startDate || 'Semua'} s.d. ${endDate || 'Semua'})`, headers, rows, headmasterName);
      setSuccessMsg('Laporan Jurnal Harian berhasil dicetak / disimpan ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleLogLateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg('Pilih siswa terlebih dahulu.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const type = violationTypes.find((vt) => vt.id === selectedViolationTypeId);
    if (!type) return;

    onAddViolation({
      studentId: selectedStudentId,
      violationTypeId: selectedViolationTypeId,
      date: todayStr,
      notes: gateNotes.trim() || 'Dicatat oleh Guru Piket di gerbang sekolah.',
      points: type.points,
      recordedBy: teacher.name
    });

    setGateNotes('');
    setSuccessMsg(`Berhasil mencatat pelanggaran kedatangan siswa (+${type.points} Poin)`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleQuickAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStudentId) {
      setErrorMsg('Pilih siswa terlebih dahulu.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const student = students.find((s) => s.id === quickStudentId);
    if (!student) return;

    onQuickAttendance({
      studentId: quickStudentId,
      classId: student.classId,
      date: todayStr,
      status: quickStatus,
      notes: quickNotes.trim() || 'Dicatat Manual oleh Guru Piket',
      recordedBy: teacher.name
    });

    setQuickNotes('');
    setSuccessMsg(`Status presensi siswa ${student.name} berhasil diperbarui ke '${quickStatus}'`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleAddTeacherAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!absentTeacherName.trim()) {
      setErrorMsg('Nama guru tidak boleh kosong.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (!absentSubject.trim()) {
      setErrorMsg('Mata pelajaran tidak boleh kosong.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (!absentClassId) {
      setErrorMsg('Silakan pilih kelas.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    onAddAbsentTeacher({
      teacherName: absentTeacherName.trim(),
      subject: absentSubject.trim(),
      classId: absentClassId,
      reason: absentReason,
      date: todayStr,
      substituteTeacher: absentSubstitute.trim() || 'Tugas Mandiri Mandiri'
    });

    setAbsentTeacherName('');
    setAbsentSubject('');
    setAbsentClassId('');
    setAbsentSubstitute('');
    setSuccessMsg('Pencatatan ketidakhadiran guru berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleAddImportantEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      setErrorMsg('Judul kejadian tidak boleh kosong.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (!eventTime.trim()) {
      setErrorMsg('Silakan tentukan waktu kejadian.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (!eventDescription.trim()) {
      setErrorMsg('Deskripsi kejadian tidak boleh kosong.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    onAddImportantEvent({
      title: eventTitle.trim(),
      time: eventTime,
      date: todayStr,
      description: eventDescription.trim(),
      reporter: teacher.name
    });

    setEventTitle('');
    setEventTime('');
    setEventDescription('');
    setSuccessMsg('Kejadian penting hari ini berhasil disimpan.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleTriggerPrint = () => {
    const printElement = document.getElementById('print-area');
    if (printElement) {
      let content = printElement.innerHTML;
      // Convert relative image paths to absolute ones so they load correctly inside the blank iframe
      const origin = window.location.origin;
      if (!dynamicLogoLeft.startsWith('data:')) {
        content = content.replace(/src="\/logo-dki.png"/g, `src="${origin}/logo-dki.png"`);
      }
      if (!dynamicLogoRight.startsWith('data:')) {
        content = content.replace(/src="\/logo.png"/g, `src="${origin}/logo.png"`);
      }

      const htmlContent = `
        <html>
          <head>
            <title>Laporan Rekap Harian Guru Piket</title>
            <style>
              @page {
                size: A4;
                margin: 1cm;
              }
              body { font-family: Arial, sans-serif; padding: 25px; color: #111; line-height: 1.4; background-color: #fff; margin: 0; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
              }
              
              /* Kop Surat styling matching the printed layout */
              .border-b-4 { border-bottom: 4px double #000 !important; }
              .border-double { border-style: double !important; }
              .pb-4 { padding-bottom: 1rem !important; }
              .kop-logo-fallback { 
                display: none; 
                align-items: center !important; 
                justify-content: center !important; 
                height: 75px !important; 
                width: 75px !important; 
                background: #fafafa !important; 
                border: 1.5px solid #000 !important; 
                border-radius: 50% !important; 
                box-sizing: border-box !important; 
              }
              .w-16 { width: 75px !important; height: auto !important; object-fit: contain !important; }
              .object-contain { object-fit: contain !important; }
              .flex { display: flex !important; }
              .flex-1 { flex: 1 !important; }
              .items-center { align-items: center !important; }
              .justify-between { justify-content: space-between !important; }
              .text-center { text-align: center !important; }
              .mx-4 { margin-left: 1rem !important; margin-right: 1rem !important; }
              .space-y-0.5 > * + * { margin-top: 2px !important; }
              .text-[10px] { font-size: 11px !important; font-weight: bold !important; text-transform: uppercase !important; }
              .text-[9px] { font-size: 10px !important; font-weight: bold !important; text-transform: uppercase !important; }
              .text-[8px] { font-size: 9px !important; }
              .text-xs { font-size: 11px !important; }
              .text-sm { font-size: 13px !important; }
              .text-base { font-size: 20px !important; font-weight: 800 !important; font-family: 'Times New Roman', Times, serif !important; }
              .font-black { font-weight: 800 !important; }
              .uppercase { text-transform: uppercase !important; }
              .tracking-wide { letter-spacing: 0.5px !important; }
              .tracking-wider { letter-spacing: 1px !important; }
              .leading-tight { line-height: 1.25 !important; }
              .leading-snug { line-height: 1.375 !important; }
              .leading-normal { line-height: 1.4 !important; }
              .font-serif { font-family: 'Times New Roman', Times, serif !important; }
              
              .report-title { text-align: center !important; font-size: 13px !important; font-weight: bold !important; text-transform: uppercase !important; margin-bottom: 20px !important; text-decoration: underline !important; margin-top: 15px !important; }
              
              .grid { display: grid !important; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
              .gap-4 { gap: 1rem !important; }
              .gap-2 { gap: 0.5rem !important; }
              .p-3 { padding: 0.75rem !important; }
              .p-2 { padding: 0.5rem !important; }
              .bg-slate-50 { background-color: #f8fafc !important; }
              .rounded { border-radius: 0.25rem !important; }
              .border-slate-300 { border-color: #cbd5e1 !important; }
              
              table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 25px !important; margin-top: 10px !important; }
              th, td { border: 1px solid #cbd5e1 !important; padding: 6px 10px !important; text-align: left !important; font-size: 11px !important; }
              th { background-color: #f1f5f9 !important; font-weight: bold !important; color: #1e293b !important; }
              
              .space-y-2 > * + * { margin-top: 0.5rem !important; }
              .pt-4 { padding-top: 1rem !important; }
              .border-b { border-bottom: 1px solid #cbd5e1 !important; }
              .pb-1 { padding-bottom: 0.25rem !important; }
              .font-bold { font-weight: bold !important; }
              .font-extrabold { font-weight: 800 !important; }
              .font-semibold { font-weight: 600 !important; }
              .text-indigo-700 { color: #4338ca !important; }
              .text-rose-600 { color: #e11d48 !important; }
              .text-amber-700 { color: #b45309 !important; }
              .italic { font-style: italic !important; }
              .p-1 { padding: 0.25rem !important; }
              .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
              .text-right { text-align: right !important; }
              
              .pt-12 { padding-top: 3rem !important; }
              .space-y-12 > * + * { margin-top: 3rem !important; }
              .underline { text-decoration: underline !important; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `;
      printHTML(htmlContent);
    }
  };

  // Helper stats for today
  const todayAttendance = attendance.filter((a) => a.date === todayStr);
  const todayViolations = violations.filter((v) => v.date === todayStr);
  const todayAbsentTeachers = absentTeachers.filter((t) => t.date === todayStr);
  const todayEvents = importantEvents.filter((ev) => ev.date === todayStr);

  return (
    <div className="space-y-6">
      {/* Print-Only Style Overlay */}
      <style>{`
        @page {
          size: A4;
          margin: 1cm;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Piket Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-1">
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Portal Guru Piket Harian</p>
          <h1 className="text-2xl font-bold">{teacher.name}</h1>
          <p className="text-emerald-100 text-sm">Bertugas mengawal ketertiban, presensi harian, ketidakhadiran guru, & log kejadian penting harian.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto relative">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap Harian (PDF)</span>
          </button>

          <div className="relative flex-1 md:flex-initial">
            <button
              type="button"
              onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
              className="w-full flex items-center justify-center gap-1.5 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Rekapitulasi</span>
            </button>
            
            {isDownloadDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDownloadDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 text-slate-800 text-[11px] font-medium divide-y divide-slate-100">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rekap Laporan Piket</div>
                  <button
                    onClick={() => {
                      setExportModal({ isOpen: true, type: 'rekap-harian', title: 'Cetak / Unduh Rekap Laporan Harian Piket' });
                      setIsDownloadDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-800 font-bold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Laporan Rekap Harian Lengkap (PDF)</span>
                  </button>

                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rekap Kehadiran</div>
                  <button
                    onClick={() => {
                      setExportModal({ isOpen: true, type: 'kehadiran', title: 'Unduh Rekap Kehadiran Piket' });
                      setIsDownloadDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ekspor Kehadiran (Excel / PDF)</span>
                  </button>

                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rekap Kedisiplinan</div>
                  <button
                    onClick={() => {
                      setExportModal({ isOpen: true, type: 'kedisiplinan', title: 'Unduh Rekap Kedisiplinan Piket' });
                      setIsDownloadDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ekspor Kedisiplinan (Excel / PDF)</span>
                  </button>

                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jurnal Harian Piket</div>
                  <button
                    onClick={() => {
                      setExportModal({ isOpen: true, type: 'jurnal', title: 'Unduh Jurnal Harian Piket' });
                      setIsDownloadDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ekspor Jurnal Harian (Excel / PDF)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Main Flex Grid with Sidebar Navigation */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Right Content Column */}
        <div className="flex-1 w-full space-y-6">
          {/* Tab Contents */}
          <div className="w-full">
        {/* Tab 1: Pintu Gerbang */}
        {activeTab === 'pintu-depan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-5 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Catat Pelanggaran Kedatangan (Gerbang Depan)
              </h3>
              <p className="text-xs text-slate-400">
                Gunakan panel cepat ini untuk merekam siswa yang terlambat tiba di gerbang sekolah atau melanggar aturan atribut pagi lainnya.
              </p>

              <form onSubmit={handleLogLateStudent} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Kelas Terlebih Dahulu <span className="text-rose-500">*</span></label>
                  <select
                    value={gateClassId}
                    onChange={(e) => {
                      setGateClassId(e.target.value);
                      setSelectedStudentId('');
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 shadow-sm cursor-pointer"
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
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={!gateClassId}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {!gateClassId ? (
                      <option value="">Silakan pilih kelas terlebih dahulu</option>
                    ) : (
                      <>
                        <option value="">-- Cari / Pilih Siswa --</option>
                        {students
                          .filter((s) => gateClassId === 'all' || s.classId === gateClassId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({classes.find((c) => c.id === s.classId)?.name})
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jenis Ketidakdisiplinan</label>
                  <select
                    value={selectedViolationTypeId}
                    onChange={(e) => setSelectedViolationTypeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {violationTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        [{vt.category}] {vt.name} (+{vt.points} Pts)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Keterangan / Catatan Piket</label>
                  <input
                    type="text"
                    placeholder="Contoh: Terlambat 12 menit, beralasan bangun kesiangan..."
                    value={gateNotes}
                    onChange={(e) => setGateNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl text-sm transition-all shadow cursor-pointer"
                >
                  Simpan Pelanggaran Pagi
                </button>
              </form>
            </div>

            {/* Logs Today */}
            <div className="lg:col-span-7 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Log Kejadian Pelanggaran Kedatangan Hari Ini</h3>
              <div className="divide-y max-h-[350px] overflow-y-auto pr-1">
                {todayViolations.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-12 text-center">Belum ada pelanggaran yang dicatat hari ini.</p>
                ) : (
                  todayViolations.slice().reverse().map((v) => {
                    const student = students.find((s) => s.id === v.studentId);
                    const type = violationTypes.find((vt) => vt.id === v.violationTypeId);
                    return (
                      <div key={v.id} className="py-2.5 flex justify-between items-start">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-800">{student?.name || 'Siswa'}</p>
                          <p className="text-xs text-slate-500">[{type?.category}] {type?.name}</p>
                          <p className="text-[10px] text-slate-400 italic">"{v.notes}" • Dicatat: {v.recordedBy}</p>
                        </div>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          +{v.points} Pts
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Absensi Piket */}
        {activeTab === 'absensi-piket' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Input Izin Keluar Kelas / Sakit Mendadak
              </h3>
              <p className="text-xs text-slate-400">
                Gunakan panel ini untuk menginput izin keluar sekolah di tengah jam pelajaran (misal sakit mendadak harus pulang, dispensasi lomba, dll) langsung ke sistem kehadiran hari ini.
              </p>

              <form onSubmit={handleQuickAttendanceSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Kelas Terlebih Dahulu <span className="text-rose-500">*</span></label>
                  <select
                    value={quickClassId}
                    onChange={(e) => {
                      setQuickClassId(e.target.value);
                      setQuickStudentId('');
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 shadow-sm cursor-pointer"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    <option value="all">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {quickClassId && quickClassId !== 'all' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs font-semibold text-slate-700">
                      <span>👥 Total Siswa: <strong>{students.filter(s => s.classId === quickClassId).length}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-blue-700">👨 Laki-laki (L): <strong>{students.filter(s => s.classId === quickClassId && (s.gender || 'Laki-laki').toLowerCase() === 'laki-laki').length}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-rose-700">👩 Perempuan (P): <strong>{students.filter(s => s.classId === quickClassId && (s.gender || '').toLowerCase() === 'perempuan').length}</strong></span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Siswa <span className="text-rose-500">*</span></label>
                  <select
                    value={quickStudentId}
                    onChange={(e) => setQuickStudentId(e.target.value)}
                    disabled={!quickClassId}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {!quickClassId ? (
                      <option value="">Silakan pilih kelas terlebih dahulu</option>
                    ) : (
                      <>
                        <option value="">-- Cari Siswa --</option>
                        {students
                          .filter((s) => quickClassId === 'all' || s.classId === quickClassId)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({classes.find((c) => c.id === s.classId)?.name})
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Keterangan Presensi Harian</label>
                  <div className="flex gap-2">
                    {([ 'Sakit', 'Izin', 'Alpa', 'Hadir' ] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setQuickStatus(st)}
                        className={`flex-1 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${
                          quickStatus === st
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Detail Alasan / Dokumen Izin</label>
                  <input
                    type="text"
                    placeholder="Contoh: Izin pulang karena demam tinggi, dijemput orang tua..."
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl text-sm transition-all shadow cursor-pointer"
                >
                  Simpan Perubahan Presensi
                </button>
              </form>
            </div>

            {/* Recaps */}
            <div className="lg:col-span-7 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Rekap Presensi Tercatat Hari Ini ({todayStr})</h3>
              
              {/* Executive Totals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-emerald-700 block font-bold uppercase tracking-wider">HADIR</span>
                  <span className="text-lg font-black text-emerald-800">
                    {todayAttendance.filter((a) => a.status === 'Hadir').length} Siswa
                  </span>
                </div>
                <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 text-center">
                  <span className="text-[10px] text-sky-700 block font-bold uppercase tracking-wider">SAKIT / IZIN</span>
                  <span className="text-lg font-black text-sky-800">
                    {todayAttendance.filter((a) => a.status === 'Sakit' || a.status === 'Izin').length} Siswa
                  </span>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
                  <span className="text-[10px] text-rose-700 block font-bold uppercase tracking-wider">ALPA</span>
                  <span className="text-lg font-black text-rose-800">
                    {todayAttendance.filter((a) => a.status === 'Alpa').length} Siswa
                  </span>
                </div>
              </div>

              {/* Rekap Kehadiran Per Kelas */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Rekapitulasi Kehadiran Per Kelas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {classes.map((cls) => {
                    const classStudents = students.filter(s => s.classId === cls.id || (cls.name && s.classId === cls.name));
                    const totalSiswa = classStudents.length;
                    const classAtts = todayAttendance.filter(a => a.classId === cls.id || classStudents.some(s => s.id === a.studentId));
                    const hadir = classAtts.filter(a => a.status === 'Hadir').length;
                    const tidakHadir = classAtts.filter(a => a.status !== 'Hadir').length;

                    return (
                      <div key={cls.id} className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 text-xs">{cls.name}</span>
                          <span className="text-[10px] font-bold text-slate-500">{totalSiswa} Siswa</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-emerald-700 font-bold">{hadir} Hadir</span>
                          <span className={tidakHadir > 0 ? "text-rose-600 font-bold" : "text-slate-400"}>
                            {tidakHadir} Tdk Hadir
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daftar Siswa Tidak Hadir */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Daftar Siswa Tidak Hadir Hari Ini</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    {todayAttendance.filter((a) => a.status !== 'Hadir').length} Siswa
                  </span>
                </h4>

                <div className="divide-y text-xs max-h-[220px] overflow-y-auto pr-1 border rounded-xl p-2 bg-white">
                  {todayAttendance.filter((a) => a.status !== 'Hadir').length === 0 ? (
                    <p className="text-emerald-700 font-medium italic py-6 text-center text-xs">
                      ✨ Alhamdulillah, tidak ada siswa yang berhalangan hadir / alpa hari ini.
                    </p>
                  ) : (
                    todayAttendance.filter((a) => a.status !== 'Hadir').map((a) => {
                      const student = students.find((s) => s.id === a.studentId);
                      const matchedClass = classes.find(c => c.id === a.classId || c.id === student?.classId || c.name === student?.classId);
                      const className = matchedClass ? matchedClass.name : (student?.classId || '-');

                      return (
                        <div key={a.id} className="py-2 flex justify-between items-start gap-2">
                          <div className="space-y-0.5 max-w-[75%]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{student?.name || 'Siswa'}</span>
                              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {className}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 italic">
                              Keterangan: &quot;{a.notes || 'Tanpa keterangan'}&quot;
                            </p>
                            {a.photoProof && (
                              <span className="inline-block text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold mt-0.5">
                                Bukti Surat / Foto Dilampirkan
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase shrink-0 ${
                              a.status === 'Sakit'
                                ? 'bg-blue-100 text-blue-800'
                                : a.status === 'Izin'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Guru Tidak Hadir */}
        {activeTab === 'guru-absen' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <UserX className="w-5 h-5 text-indigo-600" />
                Catat Ketidakhadiran Guru / Pendidik
              </h3>
              <p className="text-xs text-slate-400">
                Guru Piket bertanggung jawab mencatat guru yang tidak hadir hari ini beserta alasan dan info tugas pengganti/kelas harian.
              </p>

              <form onSubmit={handleAddTeacherAbsence} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pilih Guru Tidak Hadir <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={absentTeacherName}
                    onChange={(e) => setAbsentTeacherName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 shadow-sm cursor-pointer"
                  >
                    <option value="">-- Pilih Guru --</option>
                    {teachers
                      .filter((t) => t.role !== 'admin' && t.name)
                      .map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} (NIP. {t.nip || '-'})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mata Pelajaran <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={absentSubject}
                    onChange={(e) => setAbsentSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 shadow-sm cursor-pointer"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
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
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kelas yang Ditinggal (Pilih Beberapa) <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto shadow-inner">
                    {classes.map((c) => {
                      const classIds = absentClassId.split(',').map(x => x.trim()).filter(Boolean);
                      const isChecked = classIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              let newIds;
                              if (isChecked) {
                                newIds = classIds.filter(id => id !== c.id);
                              } else {
                                newIds = [...classIds, c.id];
                              }
                              setAbsentClassId(newIds.join(', '));
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-slate-600 text-xs font-medium">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Alasan</label>
                  <select
                    value={absentReason}
                    onChange={(e) => setAbsentReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 shadow-sm cursor-pointer"
                  >
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin Mandiri</option>
                    <option value="Dinas Luar">Dinas Luar</option>
                    <option value="Tanpa Keterangan">Tanpa Keterangan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tugas / Guru Pengganti</label>
                  <input
                    type="text"
                    placeholder="Contoh: Mengerjakan Hal 45 di LKS, dikumpul di meja Guru Piket..."
                    value={absentSubstitute}
                    onChange={(e) => setAbsentSubstitute(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl text-sm transition-all shadow cursor-pointer"
                >
                  Simpan Catatan Guru Tidak Hadir
                </button>
              </form>
            </div>

            {/* List Today */}
            <div className="lg:col-span-7 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Daftar Guru Tidak Hadir Hari Ini ({todayStr})</h3>
              <div className="overflow-x-auto">
                {todayAbsentTeachers.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-16 text-center">Tidak ada laporan ketidakhadiran guru hari ini. Semua pendidik hadir.</p>
                ) : (
                  <table className="min-w-full text-xs text-left divide-y">
                    <thead>
                      <tr className="text-slate-400 uppercase font-bold tracking-wider">
                        <th className="py-2.5">Nama Guru</th>
                        <th className="py-2.5">Mapel & Kelas</th>
                        <th className="py-2.5">Alasan</th>
                        <th className="py-2.5">Tugas / Pengganti</th>
                        <th className="py-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {todayAbsentTeachers.map((at) => (
                        <tr key={at.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-900">{at.teacherName}</td>
                          <td className="py-3">
                            <span className="block font-medium">{at.subject}</span>
                            <span className="text-[10px] text-slate-400">Kelas: {at.classId.split(',').map(id => classes.find(c => c.id === id.trim())?.name || id.trim()).join(', ')}</span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                at.reason === 'Sakit'
                                  ? 'bg-blue-100 text-blue-800'
                                  : at.reason === 'Dinas Luar'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {at.reason}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 italic max-w-[150px] truncate" title={at.substituteTeacher}>
                            {at.substituteTeacher || '-'}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => onDeleteAbsentTeacher(at.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus pencatatan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Kejadian Penting */}
        {activeTab === 'kejadian-piket' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Catat Kejadian Penting Harian Sekolah
              </h3>
              <p className="text-xs text-slate-400">
                Gunakan panel ini untuk menginput peristiwa atau peristiwa istimewa yang terjadi di sekolah hari ini (misal: kunjungan dinas, siswa pingsan saat upacara, kerusakan sarana prasarana, dll).
              </p>

              <form onSubmit={handleAddImportantEventSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Judul Kejadian / Peristiwa</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kunjungan Pengawas Dinas Pendidikan"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Waktu Kejadian (Pukul)</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Deskripsi Detail Peristiwa</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Pengawas Dinas melakukan peninjauan ruang kelas VIII-B dan memeriksa modul ajar guru bahasa Inggris. Berjalan dengan kondusif..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl text-sm transition-all shadow cursor-pointer"
                >
                  Simpan Laporan Kejadian Penting
                </button>
              </form>
            </div>

            {/* Event Timeline */}
            <div className="lg:col-span-7 bg-white rounded-xl p-6 border shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Log Peristiwa & Kejadian Penting Hari Ini</h3>
              <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-6 max-h-[350px] overflow-y-auto pr-1">
                {todayEvents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-16 text-center -ml-2">Belum ada catatan peristiwa hari ini.</p>
                ) : (
                  todayEvents.slice().reverse().map((ev) => (
                    <div key={ev.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-white" />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            <span>Pukul {ev.time} • Pelapor: {ev.reporter}</span>
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed mt-2 p-2.5 bg-slate-50 border rounded-lg italic">
                            "{ev.description}"
                          </p>
                        </div>
                        <button
                          onClick={() => onDeleteImportantEvent(ev.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Verifikasi Mandiri Siswa */}
        {activeTab === 'verifikasi-mandiri' && (
          <div className="bg-white rounded-xl p-6 border shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                  <span>Verifikasi Presensi Mandiri Siswa (Tingkat Piket)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Berikut adalah daftar pengajuan absensi mandiri siswa. Tinjau foto selfie GPS watermark dan lakukan tindakan verifikasi agar terintegrasi penuh ke semua rekap laporan.
                </p>
              </div>

              {/* Filter Harian */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
                <Calendar className="w-4 h-4 text-emerald-600 ml-1" />
                <span className="text-xs font-bold text-slate-700">Tanggal:</span>
                <input
                  type="date"
                  value={verifyDateFilter}
                  onChange={(e) => setVerifyDateFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setVerifyDateFilter(new Date().toISOString().split('T')[0])}
                  className="text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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
                      className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
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
                                className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 group-hover:border-indigo-500 shadow-sm bg-slate-100 transition-all group-hover:brightness-95"
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
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 font-bold uppercase">{sClass?.name || 'N/A'}</span>
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
                            <p className="font-semibold text-slate-500">Verifikasi Piket:</p>
                            {record.isVerifiedByPiket ? (
                              <span className="text-emerald-600 font-bold block">✓ Sudah Disetujui</span>
                            ) : record.verificationStatus === 'Rejected' && !record.isVerifiedByPiket ? (
                              <span className="text-rose-600 font-bold block">✗ Sudah Ditolak</span>
                            ) : (
                              <span className="text-amber-500 font-semibold block animate-pulse">⋯ Menunggu Tindakan</span>
                            )}
                          </div>

                          {(!record.isVerifiedByPiket && record.verificationStatus !== 'Rejected') ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onVerifyAttendance(record.id, 'piket', 'Verified');
                                  setSuccessMsg('Absensi siswa berhasil disetujui oleh Guru Piket!');
                                  setTimeout(() => setSuccessMsg(''), 4000);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer shadow-sm hover:shadow transition-all"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerConfirm(
                                    'Tolak Pengajuan Absensi',
                                    'Apakah Anda yakin ingin menolak pengajuan absen mandiri siswa ini?',
                                    () => {
                                      onVerifyAttendance(record.id, 'piket', 'Rejected');
                                      setSuccessMsg('Absensi siswa ditolak oleh Guru Piket!');
                                      setTimeout(() => setSuccessMsg(''), 4000);
                                    },
                                    'Tolak Pengajuan'
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
      </div></div></div>

      {/* PDF / Printing Report Modal */}
      {isPrintModalOpen && (() => {
        const reportAttendance = attendance.filter((a) => {
          if (printFilterStartDate && a.date < printFilterStartDate) return false;
          if (printFilterEndDate && a.date > printFilterEndDate) return false;
          return true;
        });

        const reportViolations = violations.filter((v) => {
          if (printFilterStartDate && v.date < printFilterStartDate) return false;
          if (printFilterEndDate && v.date > printFilterEndDate) return false;
          return true;
        });

        const reportAbsentTeachers = absentTeachers.filter((t) => {
          if (printFilterStartDate && t.date < printFilterStartDate) return false;
          if (printFilterEndDate && t.date > printFilterEndDate) return false;
          return true;
        });

        const reportEvents = importantEvents.filter((ev) => {
          if (printFilterStartDate && ev.date < printFilterStartDate) return false;
          if (printFilterEndDate && ev.date > printFilterEndDate) return false;
          return true;
        });

        const reportDateRangeText = printFilterStartDate === printFilterEndDate
          ? (printFilterStartDate || 'Semua Tanggal')
          : (printFilterStartDate && printFilterEndDate)
            ? `${printFilterStartDate} s.d. ${printFilterEndDate}`
            : (printFilterStartDate ? `Mulai ${printFilterStartDate}` : (printFilterEndDate ? `Sampai ${printFilterEndDate}` : 'Semua Tanggal'));

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 border shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center pb-4 border-b">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-800 text-lg">Pratinjau Cetak Laporan Rekap Guru Piket</h3>
                  <p className="text-xs text-slate-400">Siap cetak atau ekspor langsung ke format PDF dokumen resmi.</p>
                </div>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tanggal Control Bar */}
              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Saring Periode Tanggal Laporan:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Dari:</span>
                    <input
                      type="date"
                      value={printFilterStartDate}
                      onChange={(e) => setPrintFilterStartDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Sampai:</span>
                    <input
                      type="date"
                      value={printFilterEndDate}
                      onChange={(e) => setPrintFilterEndDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintFilterStartDate(todayStr);
                      setPrintFilterEndDate(todayStr);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                      setPrintFilterStartDate(first);
                      setPrintFilterEndDate(last);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintFilterStartDate('');
                      setPrintFilterEndDate('');
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Semua Data
                  </button>
                </div>
              </div>

              {/* Printable Report Sheet */}
              <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6" id="print-area">
                <div className="bg-white p-6 border border-slate-300 rounded-lg shadow-inner text-slate-900 font-sans leading-relaxed">
                  {/* School Letterhead Header */}
                  <div className="flex items-center justify-between border-b-4 border-double border-slate-800 pb-4">
                    <img src={dynamicLogoLeft} alt="Logo DKI" className="w-16 h-auto object-contain" onError={(e) => { e.currentTarget.style.display='none'; const el = document.getElementById('logo-piket-fallback-left'); if(el) el.style.display='inline-flex'; }} />
                    <div id="logo-piket-fallback-left" className="kop-logo-fallback w-16 h-16 border-2 border-slate-800 rounded-full flex items-center justify-center bg-slate-50 text-slate-800" style={{ display: 'none' }}>
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M12 8v8"/>
                        <path d="M8 11h8"/>
                      </svg>
                    </div>
                    
                    <div className="text-center flex-1 mx-4 space-y-0.5">
                      <h3 className="text-[10px] font-bold tracking-wide uppercase text-slate-800 leading-tight">{localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA'}</h3>
                      <h2 className="text-[10px] font-bold tracking-wide uppercase text-slate-900 leading-tight">{localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA'}</h2>
                      <h3 className="text-[9px] font-bold tracking-wide uppercase text-slate-700 leading-tight">{localStorage.getItem('siakad_kop_sudin_title') || 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR'}</h3>
                      <h1 className="text-base font-black uppercase tracking-wide text-slate-900 leading-snug font-serif">{localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA'}</h1>
                      <p className="text-[8px] text-slate-600 font-medium leading-normal">{localStorage.getItem('siakad_kop_address_text') || 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510'}</p>
                      <p className="text-[8px] text-slate-600 font-semibold leading-normal">{localStorage.getItem('siakad_kop_contact_text') || 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com'}</p>
                      <div className="flex justify-between items-center text-[8px] font-bold text-indigo-700 tracking-wider mt-2 px-1">
                        <span>TAHUN PELAJARAN 2026-2027</span>
                        <span>SISTEM ADM SINKRON TERPADU (SIAS)</span>
                      </div>
                    </div>
                    
                    <img src={dynamicLogoRight} alt="Logo SMP 50" className="w-16 h-auto object-contain" onError={(e) => { e.currentTarget.style.display='none'; const el = document.getElementById('logo-piket-fallback-right'); if(el) el.style.display='inline-flex'; }} />
                    <div id="logo-piket-fallback-right" className="kop-logo-fallback w-16 h-16 border-2 border-slate-800 rounded-full flex items-center justify-center bg-slate-50 text-slate-800" style={{ display: 'none' }}>
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center py-4 space-y-1">
                    <h3 className="text-sm font-bold tracking-wider uppercase decoration-solid underline underline-offset-2">LAPORAN REKAP HARIAN GURU PIKET</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">PERIODE LAPORAN: {reportDateRangeText}</p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50 p-3 rounded border border-slate-300">
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[9px]">GURU PIKET BERTUGAS:</span>
                      <span className="font-extrabold text-slate-800 text-sm">{teacher.name}</span>
                      <span className="block text-slate-400">NIP. {teacher.nip || '-'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500 block uppercase text-[9px]">STATUS SISTEM DATABASE:</span>
                      <span className="font-extrabold text-indigo-700 text-xs">TERINTEGRASI SINKRON</span>
                      <span className="block text-[9px] text-slate-400">Dicetak otomatis: {new Date().toLocaleTimeString()} WIB</span>
                    </div>
                  </div>

                  {/* Section 1: Presensi Siswa */}
                  <div className="space-y-3 pt-4">
                    <h4 className="font-bold text-xs uppercase border-b border-slate-400 pb-1 text-slate-800">
                      I. RINGKASAN PRESENSI SISWA ({reportDateRangeText})
                    </h4>

                    {/* A. Rekap Kehadiran Per Kelas */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-700 uppercase">A. Rekapitulasi Kehadiran Siswa Per Kelas</p>
                      <table className="min-w-full text-[10px] text-left border border-slate-300 divide-y divide-slate-200">
                        <thead>
                          <tr className="bg-slate-100 font-bold uppercase text-slate-700 text-center">
                            <th className="p-1 border-r w-8">No</th>
                            <th className="p-1 border-r text-left px-2">Kelas</th>
                            <th className="p-1 border-r w-16">Total Siswa</th>
                            <th className="p-1 border-r w-14 text-emerald-700">Hadir</th>
                            <th className="p-1 border-r w-14 text-blue-700">Sakit</th>
                            <th className="p-1 border-r w-14 text-amber-700">Izin</th>
                            <th className="p-1 border-r w-14 text-rose-700">Alpa</th>
                            <th className="p-1 w-20">% Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {classes.map((c, idx) => {
                            const classStudents = students.filter(s => s.classId === c.id || (c.name && s.classId === c.name));
                            const totalClassStudents = classStudents.length;
                            const classAtts = reportAttendance.filter(a => a.classId === c.id || classStudents.some(s => s.id === a.studentId));
                            const hadir = classAtts.filter(a => a.status === 'Hadir').length;
                            const sakit = classAtts.filter(a => a.status === 'Sakit').length;
                            const izin = classAtts.filter(a => a.status === 'Izin').length;
                            const alpa = classAtts.filter(a => a.status === 'Alpa').length;
                            const pct = totalClassStudents > 0 ? Math.round((hadir / totalClassStudents) * 100) : 0;

                            return (
                              <tr key={c.id} className="text-center hover:bg-slate-50">
                                <td className="p-1 border-r">{idx + 1}</td>
                                <td className="p-1 border-r text-left px-2 font-bold text-slate-800">{c.name}</td>
                                <td className="p-1 border-r font-semibold">{totalClassStudents}</td>
                                <td className="p-1 border-r text-emerald-700 font-bold">{hadir}</td>
                                <td className="p-1 border-r text-blue-700 font-semibold">{sakit}</td>
                                <td className="p-1 border-r text-amber-700 font-semibold">{izin}</td>
                                <td className="p-1 border-r text-rose-700 font-bold">{alpa}</td>
                                <td className="p-1 font-bold text-slate-800">{pct}%</td>
                              </tr>
                            );
                          })}
                          {/* Summary Total Row */}
                          <tr className="bg-slate-100 font-bold text-center border-t-2 border-slate-400">
                            <td colSpan={2} className="p-1.5 border-r text-right px-2 uppercase">TOTAL SEKOLAH</td>
                            <td className="p-1.5 border-r">{students.length}</td>
                            <td className="p-1.5 border-r text-emerald-700">{reportAttendance.filter(a => a.status === 'Hadir').length}</td>
                            <td className="p-1.5 border-r text-blue-700">{reportAttendance.filter(a => a.status === 'Sakit').length}</td>
                            <td className="p-1.5 border-r text-amber-700">{reportAttendance.filter(a => a.status === 'Izin').length}</td>
                            <td className="p-1.5 border-r text-rose-700">{reportAttendance.filter(a => a.status === 'Alpa').length}</td>
                            <td className="p-1.5 text-indigo-900">
                              {students.length > 0 
                                ? Math.round((reportAttendance.filter(a => a.status === 'Hadir').length / students.length) * 100) 
                                : 0}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* B. Daftar Siswa Tidak Hadir */}
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] font-bold text-slate-700 uppercase">B. Daftar Siswa Tidak Hadir & Keterangan</p>
                      {reportAttendance.filter(a => a.status !== 'Hadir').length === 0 ? (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-center text-[10px] text-emerald-800 font-bold">
                          Alhamdulillah, Seluruh Siswa Hadir 100% pada periode ini (Nihil Ketidakhadiran).
                        </div>
                      ) : (
                        <table className="min-w-full text-[10px] text-left border border-slate-300 divide-y divide-slate-200">
                          <thead>
                            <tr className="bg-slate-100 font-bold uppercase text-slate-700">
                              <th className="p-1 border-r w-8 text-center">No</th>
                              <th className="p-1 border-r px-2">Nama Siswa</th>
                              <th className="p-1 border-r px-2 w-24">NISN</th>
                              <th className="p-1 border-r px-2 w-20">Kelas</th>
                              <th className="p-1 border-r px-2 w-20 text-center">Tanggal</th>
                              <th className="p-1 border-r px-2 w-16 text-center">Status</th>
                              <th className="p-1 px-2">Catatan / Alasan Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {reportAttendance.filter(a => a.status !== 'Hadir').map((a, idx) => {
                              const std = students.find(s => s.id === a.studentId);
                              const matchedClass = classes.find(c => c.id === a.classId || c.id === std?.classId || c.name === std?.classId);
                              const className = matchedClass ? matchedClass.name : (std?.classId || '-');

                              return (
                                <tr key={a.id} className="hover:bg-slate-50">
                                  <td className="p-1 border-r text-center">{idx + 1}</td>
                                  <td className="p-1 border-r px-2 font-bold text-slate-800">{std?.name || 'Siswa'}</td>
                                  <td className="p-1 border-r px-2 text-slate-500 font-mono">{std?.nisn || '-'}</td>
                                  <td className="p-1 border-r px-2 font-semibold text-slate-700">{className}</td>
                                  <td className="p-1 border-r px-2 text-center text-slate-600 font-mono">{a.date}</td>
                                  <td className="p-1 border-r px-2 text-center font-bold">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                                      a.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                                      a.status === 'Izin' ? 'bg-amber-100 text-amber-800' :
                                      'bg-rose-100 text-rose-800'
                                    }`}>
                                      {a.status}
                                    </span>
                                  </td>
                                  <td className="p-1 px-2 italic text-slate-600">
                                    {a.notes || 'Tanpa Keterangan'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Pelanggaran Kedatangan */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-xs uppercase border-b border-slate-400 pb-1 text-slate-800">II. PELANGGARAN KETERTIBAN & KETERLAMBATAN SISWA</h4>
                    {reportViolations.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1">Tidak ada pelanggaran kedisiplinan tercatat pada periode ini.</p>
                    ) : (
                      <table className="min-w-full text-[10px] text-left divide-y border">
                        <thead>
                          <tr className="bg-slate-50 font-bold uppercase text-slate-500">
                            <th className="p-1 px-2">Siswa</th>
                            <th className="p-1 px-2">Tanggal</th>
                            <th className="p-1 px-2">Jenis Pelanggaran</th>
                            <th className="p-1 px-2">Keterangan</th>
                            <th className="p-1 px-2 text-right">Poin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {reportViolations.map((v) => {
                            const sObj = students.find(s => s.id === v.studentId);
                            const tObj = violationTypes.find(t => t.id === v.violationTypeId);
                            return (
                              <tr key={v.id}>
                                <td className="p-1 px-2 font-bold">{sObj?.name} ({classes.find(c => c.id === sObj?.classId)?.name})</td>
                                <td className="p-1 px-2 text-slate-600 font-mono">{v.date}</td>
                                <td className="p-1 px-2">{tObj?.name}</td>
                                <td className="p-1 px-2 italic">"{v.notes}"</td>
                                <td className="p-1 px-2 text-right text-rose-600 font-semibold">+{v.points} Poin</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Section 3: Guru Tidak Hadir */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-xs uppercase border-b border-slate-400 pb-1 text-slate-800">III. LAPORAN GURU YANG TIDAK HADIR & TUGAS</h4>
                    {reportAbsentTeachers.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1">Semua guru pengajar dilaporkan hadir sesuai jadwal kelas pada periode ini.</p>
                    ) : (
                      <table className="min-w-full text-[10px] text-left divide-y border">
                        <thead>
                          <tr className="bg-slate-50 font-bold uppercase text-slate-500">
                            <th className="p-1 px-2">Nama Guru</th>
                            <th className="p-1 px-2">Tanggal</th>
                            <th className="p-1 px-2">Mata Pelajaran</th>
                            <th className="p-1 px-2">Kelas</th>
                            <th className="p-1 px-2">Alasan</th>
                            <th className="p-1 px-2">Tugas / Guru Pengganti</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {reportAbsentTeachers.map((at) => (
                            <tr key={at.id}>
                              <td className="p-1 px-2 font-bold">{at.teacherName}</td>
                              <td className="p-1 px-2 text-slate-600 font-mono">{at.date}</td>
                              <td className="p-1 px-2">{at.subject}</td>
                              <td className="p-1 px-2">{classes.find(c => c.id === at.classId)?.name || at.classId}</td>
                              <td className="p-1 px-2 font-semibold text-amber-700">{at.reason}</td>
                              <td className="p-1 px-2 italic">{at.substituteTeacher || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Section 4: Kejadian Penting */}
                  <div className="space-y-2 pt-4">
                    <h4 className="font-bold text-xs uppercase border-b border-slate-400 pb-1 text-slate-800">IV. LOG KEJADIAN & PERISTIWA PENTING</h4>
                    {reportEvents.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1">Tidak ada kejadian luar biasa atau peristiwa khusus dilaporkan pada periode ini.</p>
                    ) : (
                      <div className="space-y-2 text-[10px]">
                        {reportEvents.map((ev) => (
                          <div key={ev.id} className="p-2 bg-slate-50 border rounded">
                            <strong className="block text-slate-900 text-xs">{ev.title}</strong>
                            <span className="text-[8px] text-slate-400 block uppercase">TANGGAL: {ev.date} | WAKTU: pukul {ev.time} | DILAPORKAN OLEH: {ev.reporter}</span>
                            <p className="mt-1 text-slate-700 italic">"{ev.description}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Signature Block */}
                  <div className="grid grid-cols-2 gap-4 pt-12 text-center text-[10px] text-slate-800">
                    <div className="space-y-12">
                      <p>Mengetahui,<br /><strong className="uppercase">Kepala Sekolah SMPN 50 JAKARTA</strong></p>
                      <div>
                        <p className="font-bold underline uppercase">{headmasterName}</p>
                        <p className="text-[9px] text-slate-400">NIP. {localStorage.getItem('siakad_headmaster_nip') || '196711261991032004'}</p>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <p>Hormat Kami,<br /><strong className="uppercase">Guru Piket Harian Sekolah</strong></p>
                      <div>
                        <p className="font-bold underline uppercase">{teacher.name}</p>
                        <p className="text-[9px] text-slate-400">NIP. {teacher.nip || '.......................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Print Dialogue Trigger Button */}
              <div className="pt-4 border-t flex gap-2 justify-end">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
                <button
                  onClick={handleTriggerPrint}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <ExportDateFilterModal
        isOpen={exportModal.isOpen}
        title={exportModal.title}
        onClose={() => setExportModal({ ...exportModal, isOpen: false })}
        onExport={(startDate, endDate, format) => handleExportDispatch(startDate, endDate, format)}
      />

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
          verifyRole="piket"
        />
      )}
    </div>
  );
}
