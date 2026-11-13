import React, { useState, useMemo, useEffect } from 'react';
import { 
  Student, 
  SchoolClass, 
  StudentPermitLog, 
  StudentPermitType, 
  StudentViolation, 
  ViolationType,
  EcoWasteCategory,
  EcoWasteDeposit
} from '../../types';
import { getSchoolClassName } from '../../utils/classUtils';
import { downloadExcel } from '../../utils/excelExport';
import { printTablePDF } from '../../utils/printHelper';
import { downloadDocx } from '../../utils/docxExport';
import StudentIdCardActivityScannerModal from './StudentIdCardActivityScannerModal';
import {
  DoorOpen,
  Clock,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  Printer,
  Users,
  Building2,
  Trash2,
  RefreshCw,
  Scan,
  ShieldAlert,
  Flame,
  Award,
  ChevronDown,
  Check,
  AlertCircle,
  Eye,
  Plus,
  Recycle
} from 'lucide-react';

interface StudentPermitMonitoringPanelProps {
  students: Student[];
  classes: SchoolClass[];
  permits: StudentPermitLog[];
  onAddPermit: (permit: Omit<StudentPermitLog, 'id'>) => Promise<void> | void;
  onReturnPermit: (permitId: string, timeIn?: string, notes?: string) => Promise<void> | void;
  onDeletePermit?: (permitId: string) => Promise<void> | void;
  violationTypes?: ViolationType[];
  onAddViolation?: (v: Omit<StudentViolation, 'id'>) => void;
  ecoCategories?: EcoWasteCategory[];
  onAddEcoDeposit?: (deposit: Omit<EcoWasteDeposit, 'id'>) => Promise<void> | void;
  operatorName?: string;
  currentOfficer?: string;
  headmasterName?: string;
}

export default function StudentPermitMonitoringPanel({
  students,
  classes,
  permits,
  onAddPermit,
  onReturnPermit,
  onDeletePermit,
  violationTypes = [],
  onAddViolation,
  ecoCategories = [],
  onAddEcoDeposit,
  operatorName = 'Guru Piket / Admin',
  currentOfficer,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.'
}: StudentPermitMonitoringPanelProps) {
  const effectiveOperator = currentOfficer || operatorName || 'Guru Piket / Admin';
  const [activeTab, setActiveTab] = useState<'live' | 'riwayat' | 'investigasi' | 'analisis'>('live');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInitialMode, setScannerInitialMode] = useState<'permit' | 'eco'>('permit');
  
  // Real-time ticking state for live elapsed timers (updates every 10 seconds)
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter states for Log Riwayat
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState<string>(todayStr);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Investigation Tool States (Pelacak Insiden / Kerusakan Fasilitas Toilet)
  const [invLocation, setInvLocation] = useState<string>('Toilet Lantai 2');
  const [invDate, setInvDate] = useState<string>(todayStr);
  const [invStartTime, setInvStartTime] = useState<string>('09:00');
  const [invEndTime, setInvEndTime] = useState<string>('10:30');
  const [invDescription, setInvDescription] = useState<string>('Laporan keran air patah / coretan dinding');

  // Disciplinary Violation Modal State
  const [violatingStudent, setViolatingStudent] = useState<{
    student: Student;
    permit: StudentPermitLog;
  } | null>(null);
  const [violationTypeId, setViolationTypeId] = useState<string>('');
  const [violationNotes, setViolationNotes] = useState<string>('');
  const [violationSuccessMsg, setViolationSuccessMsg] = useState<string>('');

  // Notification feedback
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // 1. Live active permits (Siswa yang sedang di luar kelas saat ini)
  const activeOutPermits = useMemo(() => {
    return permits.filter((p) => p.status === 'keluar');
  }, [permits]);

  // Helper to calculate minutes elapsed from timeOut string "HH:mm:ss WIB"
  const getElapsedMinutes = (permit: StudentPermitLog): number => {
    if (permit.durationMinutes !== undefined && permit.status === 'kembali') {
      return permit.durationMinutes;
    }
    try {
      const match = permit.timeOut.match(/(\d{2}):(\d{2})/);
      if (!match) return 0;
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);

      const permitDate = new Date(permit.date || todayStr);
      permitDate.setHours(hours, minutes, 0, 0);

      const diffMs = currentTimeTick - permitDate.getTime();
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch {
      return 0;
    }
  };

  // 2. Filtered permits for Log Riwayat
  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      if (dateFilter && p.date !== dateFilter) return false;
      if (classFilter !== 'all' && p.classId !== classFilter) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(q);
        const matchNisn = p.nisn.toLowerCase().includes(q);
        const matchDest = p.destination.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchDest) return false;
      }
      return true;
    });
  }, [permits, dateFilter, classFilter, typeFilter, statusFilter, searchQuery]);

  // 3. Suspect students during Incident Investigation
  const incidentSuspects = useMemo(() => {
    if (!invDate || !invStartTime || !invEndTime) return [];

    return permits.filter((p) => {
      // Must match date
      if (p.date !== invDate) return false;

      // Must match location / destination keywords
      const destLower = p.destination.toLowerCase();
      const targetLoc = invLocation.toLowerCase();
      const matchLoc = destLower.includes(targetLoc) || targetLoc.includes(destLower);
      if (!matchLoc) return false;

      // Check time overlap:
      // Time string format: "09:15:30 WIB"
      const matchTime = p.timeOut.match(/(\d{2}):(\d{2})/);
      if (!matchTime) return false;
      const permitTimeHHMM = `${matchTime[1]}:${matchTime[2]}`;

      // Overlap condition: if timeOut is between start & end, or timeIn is between start & end
      const isWithinWindow = permitTimeHHMM >= invStartTime && permitTimeHHMM <= invEndTime;
      
      let isReturnWithinWindow = false;
      if (p.timeIn) {
        const matchIn = p.timeIn.match(/(\d{2}):(\d{2})/);
        if (matchIn) {
          const returnHHMM = `${matchIn[1]}:${matchIn[2]}`;
          if (returnHHMM >= invStartTime && returnHHMM <= invEndTime) {
            isReturnWithinWindow = true;
          }
        }
      }

      return isWithinWindow || isReturnWithinWindow;
    });
  }, [permits, invDate, invLocation, invStartTime, invEndTime]);

  // 4. Frequency Analysis (Ranking siswa paling sering ke toilet / keluar)
  const frequencyStats = useMemo(() => {
    const studentMap = new Map<string, {
      student: Student | undefined;
      studentName: string;
      classId: string;
      nisn: string;
      toiletCount: number;
      otherCount: number;
      totalMinutes: number;
      flaggedCount: number;
    }>();

    permits.forEach((p) => {
      const cur = studentMap.get(p.studentId) || {
        student: students.find(s => s.id === p.studentId),
        studentName: p.studentName,
        classId: p.classId,
        nisn: p.nisn,
        toiletCount: 0,
        otherCount: 0,
        totalMinutes: 0,
        flaggedCount: 0
      };

      if (p.type === 'toilet') {
        cur.toiletCount += 1;
      } else {
        cur.otherCount += 1;
      }

      const dur = p.durationMinutes || getElapsedMinutes(p);
      cur.totalMinutes += dur;

      if (p.isFlaggedSuspicious || (p.type === 'toilet' && dur > 12)) {
        cur.flaggedCount += 1;
      }

      studentMap.set(p.studentId, cur);
    });

    return Array.from(studentMap.values()).sort(
      (a, b) => (b.toiletCount + b.otherCount) - (a.toiletCount + a.otherCount)
    );
  }, [permits, students]);

  // Export Log to Excel
  const handleExportExcel = () => {
    const headers = [
      'No',
      'Tanggal',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Jenis Izin',
      'Tujuan / Lokasi',
      'Alasan',
      'Jam Keluar',
      'Jam Kembali',
      'Durasi (Menit)',
      'Status',
      'Petugas yang Mengizinkan'
    ];

    const rows = filteredPermits.map((p, idx) => [
      idx + 1,
      p.date,
      p.nisn || '-',
      p.studentName,
      getSchoolClassName(p.classId, classes),
      p.type === 'toilet' ? 'Ke Toilet' : p.type === 'pulang_cepat' ? 'Pulang Cepat' : 'Keluar Kelas',
      p.destination,
      p.reason,
      p.timeOut,
      p.timeIn || 'Belum Kembali',
      p.durationMinutes !== undefined ? `${p.durationMinutes} menit` : `${getElapsedMinutes(p)} menit (berjalan)`,
      p.status === 'kembali' ? 'Sudah Kembali' : p.status === 'izin_pulang' ? 'Pulang' : 'Masih di Luar',
      p.approvedBy
    ]);

    downloadExcel(`rekap_izin_keluar_toilet_siswa_${dateFilter || todayStr}.xlsx`, headers, rows, 'Buku Kendali Izin');
    setActionSuccessMsg('Berhasil mengunduh Laporan Buku Kendali Izin Siswa (Excel)!');
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = ['Tgl', 'Siswa', 'Kelas', 'Izin', 'Tujuan', 'Keluar', 'Kembali', 'Durasi', 'Petugas'];
    const rows = filteredPermits.map((p) => [
      p.date,
      p.studentName,
      getSchoolClassName(p.classId, classes),
      p.type.toUpperCase(),
      p.destination,
      p.timeOut,
      p.timeIn || 'Di Luar',
      p.durationMinutes ? `${p.durationMinutes} mnt` : '-',
      p.approvedBy
    ]);

    printTablePDF(`Buku Kendali Izin Keluar & Toilet Siswa (${dateFilter || 'Semua Tanggal'})`, headers, rows, headmasterName);
    setActionSuccessMsg('Dokumen Buku Kendali siap dicetak / disimpan ke PDF!');
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Export to Word (.docx)
  const handleExportDocx = () => {
    const headers = [
      'No',
      'Tanggal',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Jenis Izin',
      'Tujuan / Lokasi',
      'Alasan',
      'Jam Keluar',
      'Jam Kembali',
      'Durasi',
      'Status',
      'Petugas'
    ];
    const rows = filteredPermits.map((p, idx) => [
      idx + 1,
      p.date,
      p.nisn || '-',
      p.studentName,
      getSchoolClassName(p.classId, classes),
      p.type === 'toilet' ? 'Ke Toilet' : p.type === 'pulang_cepat' ? 'Pulang Cepat' : 'Keluar Kelas',
      p.destination,
      p.reason,
      p.timeOut,
      p.timeIn || 'Belum Kembali',
      p.durationMinutes !== undefined ? `${p.durationMinutes} mnt` : `${getElapsedMinutes(p)} mnt`,
      p.status === 'kembali' ? 'Sudah Kembali' : p.status === 'izin_pulang' ? 'Pulang' : 'Masih di Luar',
      p.approvedBy
    ]);

    downloadDocx(
      `rekap_izin_keluar_toilet_siswa_${dateFilter || todayStr}.docx`,
      `Buku Kendali Izin Keluar & Toilet Siswa (${dateFilter || 'Semua Tanggal'})`,
      headers,
      rows,
      headmasterName
    );
    setActionSuccessMsg('Berhasil mengunduh Laporan Buku Kendali Izin Siswa (Word .docx)!');
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Submit direct violation from investigation suspect
  const handleSubmitViolationFromIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!violatingStudent || !onAddViolation) return;

    const matchedType = violationTypes.find((vt) => vt.id === violationTypeId) || violationTypes[0];
    const points = matchedType ? matchedType.points : 10;

    onAddViolation({
      studentId: violatingStudent.student.id,
      violationTypeId: matchedType?.id || 'damage_toilet_auto',
      date: invDate || todayStr,
      notes: `Investigasi Insiden di ${violatingStudent.permit.destination} (${invDate} pk. ${invStartTime}-${invEndTime}). Terlacak berada di lokasi selama ${violatingStudent.permit.durationMinutes || getElapsedMinutes(violatingStudent.permit)} menit. Catatan: ${violationNotes || invDescription}`,
      points: points,
      recordedBy: operatorName
    });

    setViolationSuccessMsg(`Poin sanksi kedisiplinan (${points} poin) berhasil dicatatkan kepada ${violatingStudent.student.name}!`);
    setTimeout(() => {
      setViolationSuccessMsg('');
      setViolatingStudent(null);
      setViolationNotes('');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Buku Kendali &amp; Keamanan Sekolah
            </span>
            {activeOutPermits.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full animate-pulse">
                {activeOutPermits.length} Siswa di Luar Kelas
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 tracking-tight">
            <DoorOpen className="w-6 h-6 text-amber-200 shrink-0" />
            <span>Pusat Monitoring Izin Keluar, Toilet &amp; Track Record Siswa</span>
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
            Terintegrasi langsung dengan scan QR Kartu Pelajar untuk izin ke toilet, izin keluar kelas, pulang cepat, serta pelacakan jejak insiden kerusakan fasilitas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
          <button
            type="button"
            onClick={() => {
              setScannerInitialMode('permit');
              setIsScannerOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-900 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Scan className="w-4 h-4 text-amber-600 shrink-0" />
            <span>+ Buka Scanner Kartu Pelajar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerInitialMode('eco');
              setIsScannerOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            title="Scan Kartu Pelajar untuk Setor Sampah ECo-Tiket"
          >
            <Recycle className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>Scan Setor ECo-Tiket</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Quick Metrics Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Siswa Sedang di Luar</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{activeOutPermits.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Pantauan waktu nyata</p>
          </div>
          <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
            <DoorOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Izin Toilet Hari Ini</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">
              {permits.filter(p => p.date === todayStr && p.type === 'toilet').length}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Total kunjungan toilet</p>
          </div>
          <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Izin Pulang Cepat</p>
            <p className="text-2xl font-black text-purple-600 mt-0.5">
              {permits.filter(p => p.date === todayStr && p.type === 'pulang_cepat').length}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Sakit / urusan keluarga</p>
          </div>
          <div className="w-11 h-11 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Durasi Toilet &gt; 12 Mnt</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">
              {permits.filter(p => p.date === todayStr && (p.durationMinutes || getElapsedMinutes(p)) > 12 && p.type === 'toilet').length}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Peringatan waktu wajar</p>
          </div>
          <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'live'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Live Radar Siswa di Luar ({activeOutPermits.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'riwayat'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Buku Kendali &amp; Log Riwayat ({filteredPermits.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('investigasi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'investigasi'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Pelacak Insiden &amp; Kerusakan Toilet</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analisis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'analisis'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Analisis Frekuensi Izin Siswa</span>
        </button>
      </div>

      {/* TAB 1: LIVE RADAR (SISWA DI LUAR KELAS SAAT INI) */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                <span>Daftar Siswa Sedang di Luar Kelas / Toilet (Aktif)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Penghitung waktu otomatis berjalan. Siswa dengan durasi &gt; 12 menit ditandai peringatan warna merah.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setScannerInitialMode('permit');
                setIsScannerOpen(true);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Scan Kartu untuk Izin Baru / Kembali</span>
            </button>
          </div>

          {activeOutPermits.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">Tidak Ada Siswa di Luar Kelas</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Seluruh siswa saat ini berada di dalam ruang kelas masing-masing. Ketika siswa men-scan kartu untuk izin, kartu aktivitas akan muncul di sini.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOutPermits.map((permit) => {
                const elapsedMin = getElapsedMinutes(permit);
                const isOverdue = permit.type === 'toilet' ? elapsedMin > 12 : elapsedMin > 30;

                return (
                  <div
                    key={permit.id}
                    className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs ${
                      isOverdue
                        ? 'border-rose-400 ring-2 ring-rose-400/20'
                        : elapsedMin > 7
                        ? 'border-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{permit.studentName}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {getSchoolClassName(permit.classId, classes)}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">NISN: {permit.nisn}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          permit.type === 'toilet'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : permit.type === 'uks'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {permit.type}
                        </span>
                      </div>

                      {/* Detail Data */}
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Tujuan / Tempat:</span>
                          <span className="font-bold text-slate-800">{permit.destination}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Jam Keluar:</span>
                          <span className="font-mono font-bold text-indigo-700">{permit.timeOut}</span>
                        </div>
                        {permit.reason && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Alasan:</span>
                            <span className="italic">{permit.reason}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Petugas:</span>
                          <span className="font-medium text-slate-700">{permit.approvedBy}</span>
                        </div>
                      </div>

                      {/* Live Running Timer */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isOverdue
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : elapsedMin > 7
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold">
                          <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'animate-spin' : ''}`} />
                          <span>Durasi Berjalan:</span>
                        </div>
                        <span className="font-black text-sm">{elapsedMin} Menit</span>
                      </div>

                      {isOverdue && (
                        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Melebihi batas waktu wajar toilet! Perlu dipantau.</span>
                        </p>
                      )}
                    </div>

                    {/* Action: Konfirmasi Siswa Kembali */}
                    <div className="pt-3 border-t border-slate-100 mt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const now = new Date();
                          const timeInStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
                          await onReturnPermit(permit.id, timeInStr);
                          setActionSuccessMsg(`${permit.studentName} telah kembali ke kelas pada ${timeInStr}.`);
                          setTimeout(() => setActionSuccessMsg(''), 3000);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Konfirmasi Siswa Kembali</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUKU KENDALI & LOG RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Buku Kendali &amp; Rekapitulasi Izin Siswa</span>
              </h3>
              <p className="text-xs text-slate-500">
                Log lengkap track record seluruh aktivitas izin siswa ke toilet, keluar kelas, dan pulang cepat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportDocx}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Tanggal</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Kelas</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Jenis Izin</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="all">Semua Jenis Izin</option>
                <option value="toilet">Ke Toilet</option>
                <option value="keluar_kelas">Keluar Kelas</option>
                <option value="pulang_cepat">Pulang Cepat</option>
                <option value="uks">UKS</option>
                <option value="perpustakaan">Perpustakaan</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="keluar">Masih di Luar</option>
                <option value="kembali">Sudah Kembali</option>
                <option value="izin_pulang">Pulang Cepat</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Pencarian Siswa</label>
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nama / NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Siswa &amp; Kelas</th>
                  <th className="px-4 py-3">Jenis Izin</th>
                  <th className="px-4 py-3">Tujuan / Lokasi</th>
                  <th className="px-4 py-3">Jam Keluar</th>
                  <th className="px-4 py-3">Jam Kembali</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3">Petugas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPermits.map((p) => {
                  const dur = p.durationMinutes !== undefined ? p.durationMinutes : getElapsedMinutes(p);
                  const isLongStay = p.type === 'toilet' && dur > 12;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap">{p.date}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{p.studentName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {getSchoolClassName(p.classId, classes)} &bull; NISN: {p.nisn}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          p.type === 'toilet'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : p.type === 'pulang_cepat'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div>{p.destination}</div>
                        {p.reason && <div className="text-[10px] text-slate-400 font-normal italic">{p.reason}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-indigo-600 font-bold whitespace-nowrap">{p.timeOut}</td>
                      <td className="px-4 py-3 font-mono text-emerald-600 font-bold whitespace-nowrap">
                        {p.timeIn || <span className="text-slate-400 italic font-normal">Belum kembali</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-black ${isLongStay ? 'text-rose-600 flex items-center gap-1' : 'text-slate-700'}`}>
                          {dur} mnt
                          {isLongStay && (
                            <span title="Durasi toilet > 12 menit">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">{p.approvedBy}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.status === 'kembali' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Kembali</span>
                        ) : p.status === 'izin_pulang' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Pulang</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">Di Luar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {onDeletePermit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus catatan izin ${p.studentName}?`)) {
                                onDeletePermit(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Catatan Izin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredPermits.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                      Tidak ada catatan izin yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DETEKSI & INVESTIGASI INSIDEN / KERUSAKAN FASILITAS TOILET */}
      {activeTab === 'investigasi' && (
        <div className="space-y-5">
          <div className="bg-rose-900 text-white p-6 rounded-3xl shadow-md space-y-2 border border-rose-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-300" />
              <h3 className="font-black text-lg">Pelacak &amp; Investigasi Insiden / Kerusakan Fasilitas Sekolah</h3>
            </div>
            <p className="text-xs text-rose-100 max-w-3xl leading-relaxed">
              Ketika ada kerusakan fasilitas (seperti keran air patah, coretan, pintu rusak, merokok di toilet, dll.) di rentang waktu tertentu,
              masukkan lokasi dan perkiraan jam kejadian. Sistem akan secara otomatis mengaudit dan menampilkan daftar seluruh siswa yang izin ke lokasi tersebut pada jendela waktu itu beserta durasi menitnya.
            </p>
          </div>

          {/* Incident Inquiry Controls */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-600" />
              <span>Parameter Investigasi Kejadian</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Lokasi Fasilitas / Ruangan</label>
                <select
                  value={invLocation}
                  onChange={(e) => setInvLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="Toilet Lantai 1">Toilet Lantai 1</option>
                  <option value="Toilet Lantai 2">Toilet Lantai 2</option>
                  <option value="Toilet Lantai 3">Toilet Lantai 3</option>
                  <option value="Toilet Guru">Toilet Guru / Depan</option>
                  <option value="UKS">Ruang UKS</option>
                  <option value="Perpustakaan">Ruang Perpustakaan</option>
                  <option value="Kantin">Kantin Sekolah</option>
                  <option value="Gerbang">Pintu Gerbang Depan</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tanggal Kejadian</label>
                <input
                  type="date"
                  value={invDate}
                  onChange={(e) => setInvDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Perkiraan Jam Mulai</label>
                <input
                  type="time"
                  value={invStartTime}
                  onChange={(e) => setInvStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Perkiraan Jam Selesai</label>
                <input
                  type="time"
                  value={invEndTime}
                  onChange={(e) => setInvEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Catatan Insiden / Temuan Kerusakan</label>
              <input
                type="text"
                placeholder="Contoh: Keran air wastafel patah dan dinding toilet dicoret spidol..."
                value={invDescription}
                onChange={(e) => setInvDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Investigation Result Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  <span>Daftar Siswa yang Terlacak Berada di {invLocation}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ditemukan <strong>{incidentSuspects.length} siswa</strong> yang izin menuju lokasi pada {invDate} pk. {invStartTime} - {invEndTime}.
                </p>
              </div>

              {incidentSuspects.length > 0 && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  {incidentSuspects.length} Terduga Berada di Lokasi
                </span>
              )}
            </div>

            {incidentSuspects.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs">Tidak ada catatan siswa yang izin ke lokasi tersebut pada jendela waktu yang dimasukkan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50 text-rose-900 font-bold uppercase tracking-wider text-[10px] border-b border-rose-200">
                    <tr>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3">Jam Masuk / Keluar</th>
                      <th className="px-4 py-3">Durasi di Lokasi</th>
                      <th className="px-4 py-3">Petugas Izin</th>
                      <th className="px-4 py-3">Keterangan</th>
                      <th className="px-4 py-3 text-right">Tindak Disiplin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {incidentSuspects.map((permit) => {
                      const dur = permit.durationMinutes !== undefined ? permit.durationMinutes : getElapsedMinutes(permit);
                      const studentObj = students.find((s) => s.id === permit.studentId);

                      return (
                        <tr key={permit.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div>{permit.studentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">NISN: {permit.nisn}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {getSchoolClassName(permit.classId, classes)}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                            {permit.timeOut} s/d {permit.timeIn || 'Sekarang'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              dur > 12 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {dur} Menit
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{permit.approvedBy}</td>
                          <td className="px-4 py-3 italic text-slate-500">{permit.reason || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            {onAddViolation && studentObj && (
                              <button
                                type="button"
                                onClick={() => {
                                  setViolatingStudent({ student: studentObj, permit });
                                  setViolationNotes(`Investigasi Fasilitas ${permit.destination}: ${invDescription}`);
                                }}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>Beri Sanksi Disiplin</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ANALISIS FREKUENSI (SISWA PALING SERING IZIN) */}
      {activeTab === 'analisis' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="pb-3 border-b">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-600" />
              <span>Peringkat Frekuensi Izin Toilet &amp; Keluar Kelas Siswa</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Membantu Guru Piket, Wali Kelas, dan Guru BK mengidentifikasi siswa yang paling sering meninggalkan jam pelajaran atau terindikasi sering nongkrong di toilet.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Peringkat</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Total Frekuensi Izin</th>
                  <th className="px-4 py-3">Ke Toilet</th>
                  <th className="px-4 py-3">Total Waktu di Luar</th>
                  <th className="px-4 py-3">Peringatan Durasi Lama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {frequencyStats.slice(0, 30).map((item, idx) => (
                  <tr key={item.student?.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-slate-400">
                      {idx + 1 === 1 ? '🥇 #1' : idx + 1 === 2 ? '🥈 #2' : idx + 1 === 3 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {item.studentName}
                      <span className="block text-[10px] text-slate-400 font-mono">NISN: {item.nisn}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {getSchoolClassName(item.classId, classes)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-black text-indigo-700 text-sm">
                        {item.toiletCount + item.otherCount} kali
                      </span>
                    </td>
                    <td className="px-4 py-3 text-amber-700 font-bold">
                      {item.toiletCount} kali
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {item.totalMinutes} menit
                    </td>
                    <td className="px-4 py-3">
                      {item.flaggedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          {item.flaggedCount}x Lewat Batas Wajar
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}

                {frequencyStats.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      Belum ada data riwayat izin yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISCIPLINARY SANCTION MODAL FROM INVESTIGATION */}
      {violatingStudent && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-sm text-slate-900">Penetapan Poin Sanksi Kedisiplinan</h3>
              </div>
              <button
                type="button"
                onClick={() => setViolatingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs space-y-1">
              <div className="font-bold text-rose-950">Terduga Pelanggar: {violatingStudent.student.name}</div>
              <div className="text-rose-800">
                Kelas: {getSchoolClassName(violatingStudent.student.classId, classes)} &bull; NISN: {violatingStudent.student.nisn}
              </div>
              <div className="text-rose-700 text-[11px] pt-1">
                Lokasi Insiden: <strong>{violatingStudent.permit.destination}</strong> ({violatingStudent.permit.date} pk. {violatingStudent.permit.timeOut})
              </div>
            </div>

            {violationSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{violationSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitViolationFromIncident} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Jenis Pelanggaran</label>
                <select
                  value={violationTypeId}
                  onChange={(e) => setViolationTypeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Jenis Pelanggaran --</option>
                  {violationTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>
                      {vt.name} ({vt.points} Poin - {vt.category})
                    </option>
                  ))}
                  {violationTypes.length === 0 && (
                    <option value="kerusakan_fasilitas">Merusak Fasilitas Toilet / Sekolah (20 Poin)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Catatan Tambahan Kejadian &amp; Bukti</label>
                <textarea
                  rows={3}
                  value={violationNotes}
                  onChange={(e) => setViolationNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViolatingStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Flame className="w-4 h-4" />
                  <span>Tetapkan Poin Pelanggaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      <StudentIdCardActivityScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        students={students}
        classes={classes}
        permits={permits}
        onAddPermit={onAddPermit}
        onReturnPermit={onReturnPermit}
        ecoCategories={ecoCategories}
        onAddEcoDeposit={onAddEcoDeposit}
        operatorName={operatorName}
        initialMode={scannerInitialMode}
      />
    </div>
  );
}
