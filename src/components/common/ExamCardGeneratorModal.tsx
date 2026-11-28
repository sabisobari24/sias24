import React, { useState, useMemo } from 'react';
import { Student, SchoolClass, ExamSchedule } from '../../types';
import { getEffectiveSchoolLogo } from '../../utils/schoolLogoHelper';
import { getSchoolClassName, isSameClass } from '../../utils/classUtils';
import {
  buildParticipantNumber,
  buildSchedulesForStudent,
  downloadExamCardsPdfA4
} from '../../utils/examCardPdfHelper';
import { resolveStudentAvatarUrl } from '../../utils/avatarHelper';
import {
  Printer,
  X,
  CreditCard,
  Search,
  GraduationCap,
  CheckSquare,
  Square,
  FileDown,
  ChevronDown,
  Info,
  RotateCw,
  FlipHorizontal2,
  Layers,
  AlertCircle
} from 'lucide-react';

interface ExamCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: SchoolClass[];
  examSchedules?: ExamSchedule[];
  headmasterName?: string;
  schoolName?: string;
  initialClassId?: string;
}

export default function ExamCardGeneratorModal({
  isOpen,
  onClose,
  students,
  classes,
  examSchedules = [],
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  schoolName = 'SMP NEGERI 50 JAKARTA',
  initialClassId = 'all'
}: ExamCardGeneratorModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [examTitle, setExamTitle] = useState<string>('ASESMEN SUMATIF AKHIR SEMESTER (CBT)');
  const [examYear, setExamYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  });
  const [examRoom, setExamRoom] = useState<string>('Lab Komputer / Ruang Kelas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewSide, setViewSide] = useState<'both' | 'front' | 'back'>('both');
  const [sheetOrder, setSheetOrder] = useState<'grouped' | 'paired'>('grouped');
  const [mirrorBackForDuplex, setMirrorBackForDuplex] = useState<boolean>(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveSchoolName =
    schoolName || localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';
  const govTitle =
    localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DKI JAKARTA';
  const deptTitle =
    localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN';
  const schoolAddress =
    localStorage.getItem('siakad_kop_address') || 'Jakarta Timur • Portal Resmi SIAS';
  const headmasterNip = localStorage.getItem('siakad_headmaster_nip') || '';
  const schoolLogo = getEffectiveSchoolLogo();
  const dkiLogo = localStorage.getItem('siakad_logo_left') || '/logo-dki.png';

  // Filter students by selected class using standardized class matching
  const classStudents = useMemo(() => {
    let list = students;
    if (selectedClassId && selectedClassId !== 'all') {
      list = list.filter((s) => isSameClass(s.classId, selectedClassId, classes));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [students, selectedClassId, classes]);

  // Filter by search
  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.nisn && s.nisn.includes(q))
    );
  }, [classStudents, searchQuery]);

  // Initialize selected students whenever class filter changes
  React.useEffect(() => {
    setSelectedStudentIds(new Set(classStudents.map((s) => s.id)));
  }, [classStudents]);

  const studentsToPrint = useMemo(
    () => displayedStudents.filter((s) => selectedStudentIds.has(s.id)),
    [displayedStudents, selectedStudentIds]
  );

  // Split selected students into A4 chunks of 4 cards (2x2 B4 grid)
  const studentChunks = useMemo(() => {
    const chunks: Array<Array<Student | null>> = [];
    for (let i = 0; i < studentsToPrint.length; i += 4) {
      const slice: Array<Student | null> = studentsToPrint.slice(i, i + 4);
      while (slice.length < 4) slice.push(null);
      chunks.push(slice);
    }
    return chunks;
  }, [studentsToPrint]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === displayedStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(displayedStudents.map((s) => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (studentsToPrint.length === 0 || isDownloadingPdf) return;
    setErrorMsg(null);
    setIsDownloadingPdf(true);
    setPdfProgressMsg('Menyiapkan dokumen PDF A4...');
    try {
      await downloadExamCardsPdfA4(studentsToPrint, classes, examSchedules, {
        examTitle,
        examYear,
        examRoom,
        headmasterName,
        headmasterNip,
        schoolName: effectiveSchoolName,
        sideMode: viewSide,
        sheetOrder,
        mirrorBackForDuplex,
        onProgress: (_cur, _tot, msg) => setPdfProgressMsg(msg)
      });
    } catch (err) {
      console.error('Error generating Exam Card PDF:', err);
      setErrorMsg('Gagal membuat file PDF kartu ujian. Silakan coba lagi atau gunakan Cetak Browser.');
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgressMsg('');
    }
  };

  const renderFrontCard = (student: Student | null, slotKey: string) => {
    if (!student) {
      return (
        <div
          key={slotKey}
          className="border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-semibold min-h-[380px]"
        >
          Slot Kosong
        </div>
      );
    }
    const classNameLabel = getSchoolClassName(student.classId, classes, '-');
    const participantNo = buildParticipantNumber(
      student,
      studentsToPrint,
      classes,
      studentsToPrint.indexOf(student)
    );

    return (
      <div
        key={slotKey}
        className="border-2 border-slate-800 rounded-xl p-3 bg-white flex flex-col justify-between relative overflow-hidden shadow-2xs aspect-[250/353]"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <GraduationCap className="w-56 h-56 text-slate-900" />
        </div>

        {/* Kop Surat */}
        <div>
          <div className="border-b-2 border-slate-900 pb-2 mb-2.5 flex items-center gap-2">
            <img
              src={dkiLogo}
              alt="Logo Kiri"
              className="w-9 h-9 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="flex-1 text-center leading-tight min-w-0">
              <p className="text-[7.5px] font-black tracking-wider uppercase text-slate-700 truncate">
                {govTitle}
              </p>
              <p className="text-[7px] font-semibold text-slate-600 uppercase truncate">{deptTitle}</p>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                {effectiveSchoolName}
              </h3>
              <p className="text-[6.5px] text-slate-500 truncate">{schoolAddress}</p>
            </div>
            <img src={schoolLogo} alt="Logo Sekolah" className="w-9 h-9 object-contain shrink-0" />
          </div>

          {/* Card Title */}
          <div className="text-center mb-2.5">
            <span className="inline-block bg-slate-900 text-white font-black text-[9px] px-3 py-0.5 rounded-full uppercase tracking-wider">
              KARTU TANDA PESERTA UJIAN (CBT)
            </span>
            <p className="text-[10px] font-black text-purple-900 uppercase mt-1 tracking-tight leading-tight">
              {examTitle}
            </p>
            <p className="text-[8px] font-bold text-slate-500">Tahun Pelajaran: {examYear}</p>
          </div>

          {/* Student Photo (3:4 Pasfoto) & Details */}
          <div className="flex items-center gap-3 bg-purple-50/60 border border-purple-100 rounded-xl p-2 mb-2">
            <div className="w-[88px] sm:w-[96px] aspect-[3/4] bg-white border border-slate-300 rounded-lg shrink-0 overflow-hidden shadow-2xs">
              <img
                src={resolveStudentAvatarUrl(student.avatarUrl, student.gender)}
                alt={student.name}
                onError={(e) => {
                  const fallback = resolveStudentAvatarUrl('', student.gender);
                  if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                    (e.currentTarget as HTMLImageElement).src = fallback;
                  }
                }}
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="flex-1 min-w-0 text-[9.5px] space-y-1 text-slate-800">
              <div>
                <span className="block text-[7px] font-bold text-purple-900 uppercase">No. Peserta CBT</span>
                <span className="inline-block font-mono font-black text-[10.5px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                  {participantNo}
                </span>
              </div>
              <div>
                <span className="block text-[7px] font-bold text-slate-500 uppercase">Nama Peserta</span>
                <span className="block font-black uppercase tracking-tight text-slate-900 truncate">
                  {student.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="block text-[7px] font-bold text-slate-500 uppercase">NISN</span>
                  <span className="font-mono font-bold">{student.nisn || '-'}</span>
                </div>
                <div>
                  <span className="block text-[7px] font-bold text-slate-500 uppercase">Kelas</span>
                  <span className="font-bold text-slate-900">{classNameLabel}</span>
                </div>
              </div>
              <div>
                <span className="block text-[7px] font-bold text-slate-500 uppercase">Ruang / Sesi</span>
                <span className="font-semibold text-slate-700 truncate block">{examRoom}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barcode & Signature */}
        <div className="flex items-end justify-between border-t border-dashed border-slate-300 pt-2 text-[7.5px] mt-auto">
          <div className="space-y-1">
            <div className="font-mono text-[8px] tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
              |||| | |||| | ||| ||
            </div>
            <p className="text-[7px] text-slate-400 font-mono text-center">*{participantNo}*</p>
          </div>

          <div className="text-center w-32 leading-tight">
            <p className="text-[7.5px] text-slate-500">
              Jakarta,{' '}
              {new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
            <p className="text-[7.5px] font-bold text-slate-700">Kepala Sekolah,</p>
            <div className="h-7 flex items-center justify-center">
              <span className="font-serif italic text-indigo-700 text-[9px] font-bold">
                [Tanda Tangan &amp; Cap]
              </span>
            </div>
            <p className="text-[8px] font-black text-slate-900 underline truncate">{headmasterName}</p>
            {headmasterNip && <p className="text-[7px] text-slate-500 font-mono">NIP. {headmasterNip}</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderBackCard = (student: Student | null, slotKey: string) => {
    if (!student) {
      return (
        <div
          key={slotKey}
          className="border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-semibold min-h-[380px]"
        >
          Slot Kosong
        </div>
      );
    }
    const classNameLabel = getSchoolClassName(student.classId, classes, '-');
    const participantNo = buildParticipantNumber(
      student,
      studentsToPrint,
      classes,
      studentsToPrint.indexOf(student)
    );
    const schedules = buildSchedulesForStudent(student, examSchedules, classes);

    return (
      <div
        key={slotKey}
        className="border-2 border-slate-800 rounded-xl p-3 bg-white flex flex-col justify-between shadow-2xs aspect-[250/353]"
      >
        <div>
          <div className="text-center border-b-2 border-slate-300 pb-1.5 mb-2">
            <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-tight">
              JADWAL UJIAN &amp; PARAF PENGAWAS RUANG
            </h4>
            <p className="text-[8px] font-bold text-purple-900 uppercase truncate">{examTitle}</p>
            <p className="text-[8px] text-slate-600 font-medium truncate">
              <strong className="text-slate-900">{student.name}</strong> &bull; {classNameLabel} &bull;{' '}
              <strong className="text-purple-700 font-mono">{participantNo}</strong>
            </p>
          </div>

          <div className="overflow-hidden border border-slate-300 rounded-lg text-[7.5px] mb-2">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[7px] border-b border-slate-300">
                <tr>
                  <th className="px-1 py-1 text-center w-5">No</th>
                  <th className="px-1 py-1">Hari, Tgl</th>
                  <th className="px-1 py-1">Mata Pelajaran</th>
                  <th className="px-1 py-1 text-center w-14">Waktu</th>
                  <th className="px-1 py-1 text-center w-10">Paraf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schedules.map((sc) => (
                  <tr key={sc.no}>
                    <td className="px-1 py-1 text-center font-bold text-slate-500">{sc.no}</td>
                    <td className="px-1 py-1 font-medium truncate max-w-[72px]">{sc.dayDate || '\u00A0'}</td>
                    <td className="px-1 py-1 font-bold text-slate-800 truncate max-w-[100px]">
                      {sc.subject || '\u00A0'}
                    </td>
                    <td className="px-1 py-1 text-center text-slate-600 font-mono text-[7px]">
                      {sc.time || '\u00A0'}
                    </td>
                    <td className="px-1 py-1 text-center border-l border-slate-200 text-slate-300 font-mono">
                      &nbsp;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[7px] text-slate-600 space-y-0.5 leading-tight">
            <p className="font-bold text-slate-800 uppercase text-[7.5px]">Tata Tertib Peserta CBT:</p>
            <p>1. Hadir di ruang ujian 15 menit sebelum sesi dimulai dengan membawa Kartu Peserta.</p>
            <p>2. Dilarang membuka tab lain atau meminjamkan akun login ujian kepada orang lain.</p>
            <p>3. Kartu wajib diparaf Pengawas Ruang pada setiap sesi mata pelajaran.</p>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 pt-1.5 flex justify-between items-end text-[7.5px] text-slate-500 mt-2">
          <span>Halaman Belakang Kartu (A4 / 4 Kartu)</span>
          <div className="text-center w-28 leading-tight">
            <p className="text-[7px]">Tanda Tangan Peserta,</p>
            <div className="h-5" />
            <p className="font-bold text-slate-800 text-[7.5px] underline uppercase truncate">
              {student.name}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Build list of separated A4 sheets for preview & browser print
  const sheetsToRender: Array<{
    key: string;
    side: 'front' | 'back';
    title: string;
    cards: Array<Student | null>;
  }> = [];

  if (viewSide === 'front') {
    studentChunks.forEach((chunk, idx) => {
      sheetsToRender.push({
        key: `front-${idx}`,
        side: 'front',
        title: `HALAMAN DEPAN — KARTU PESERTA UJIAN (Lembar A4 #${idx + 1} • 4 Kartu Ukuran B4)`,
        cards: chunk
      });
    });
  } else if (viewSide === 'back') {
    studentChunks.forEach((chunk, idx) => {
      const arranged = mirrorBackForDuplex ? [chunk[1], chunk[0], chunk[3], chunk[2]] : chunk;
      sheetsToRender.push({
        key: `back-${idx}`,
        side: 'back',
        title: `HALAMAN BELAKANG — JADWAL UJIAN & PARAF (Lembar A4 #${idx + 1}${mirrorBackForDuplex ? ' • Mode Cermin Duplex' : ''})`,
        cards: arranged
      });
    });
  } else if (sheetOrder === 'paired') {
    studentChunks.forEach((chunk, idx) => {
      sheetsToRender.push({
        key: `front-${idx}`,
        side: 'front',
        title: `HALAMAN DEPAN — KARTU PESERTA UJIAN (Lembar A4 #${idx + 1})`,
        cards: chunk
      });
      const arranged = mirrorBackForDuplex ? [chunk[1], chunk[0], chunk[3], chunk[2]] : chunk;
      sheetsToRender.push({
        key: `back-${idx}`,
        side: 'back',
        title: `HALAMAN BELAKANG — JADWAL UJIAN & PARAF (Lembar A4 #${idx + 1}${mirrorBackForDuplex ? ' • Mode Cermin Duplex' : ''})`,
        cards: arranged
      });
    });
  } else {
    studentChunks.forEach((chunk, idx) => {
      sheetsToRender.push({
        key: `front-${idx}`,
        side: 'front',
        title: `HALAMAN DEPAN — KARTU PESERTA UJIAN (Lembar A4 #${idx + 1})`,
        cards: chunk
      });
    });
    studentChunks.forEach((chunk, idx) => {
      const arranged = mirrorBackForDuplex ? [chunk[1], chunk[0], chunk[3], chunk[2]] : chunk;
      sheetsToRender.push({
        key: `back-${idx}`,
        side: 'back',
        title: `HALAMAN BELAKANG — JADWAL UJIAN & PARAF (Lembar A4 #${idx + 1}${mirrorBackForDuplex ? ' • Mode Cermin Duplex' : ''})`,
        cards: arranged
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-cbt-cards, #print-cbt-cards * {
            visibility: visible !important;
          }
          #print-cbt-cards {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-sheet-page {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 6mm !important;
          }
          @page {
            size: A4 portrait;
            margin: 0.5cm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <CreditCard className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Unduh &amp; Cetak Kartu Peserta Ujian (CBT)
              </h2>
              <p className="text-xs text-purple-200">
                1 Lembar A4 berisi 4 Kartu Peserta (Proporsi B4) &bull; Halaman Depan &amp; Belakang (Jadwal) Terpisah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 space-y-3 shrink-0">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filter Kelas */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                Pilih Rombel / Kelas
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-7 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 cursor-pointer appearance-none text-xs"
                >
                  <option value="all">Semua Kelas ({students.length} Siswa)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getSchoolClassName(c.id, classes)} (
                      {students.filter((s) => isSameClass(s.classId, c.id, classes)).length} Siswa)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Nama Ujian */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                Nama Ujian / Asesmen
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="ASESMEN SUMATIF AKHIR SEMESTER (CBT)"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 text-xs"
              />
            </div>

            {/* Tahun Ajaran */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                Tahun Pelajaran / Sesi
              </label>
              <input
                type="text"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
                placeholder="2025/2026"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 text-xs"
              />
            </div>

            {/* Ruang Ujian */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                Ruang / Lokasi Ujian
              </label>
              <input
                type="text"
                value={examRoom}
                onChange={(e) => setExamRoom(e.target.value)}
                placeholder="Lab Komputer / Ruang Kelas"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 text-xs"
              />
            </div>
          </div>

          {/* Action & Layout Row */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                {selectedStudentIds.size === displayedStudents.length && displayedStudents.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>
                  Pilih Semua ({selectedStudentIds.size}/{displayedStudents.length})
                </span>
              </button>

              {/* View Side Selector */}
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setViewSide('both')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewSide === 'both' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Depan &amp; Belakang (Terpisah)
                </button>
                <button
                  type="button"
                  onClick={() => setViewSide('front')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewSide === 'front' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Halaman Depan Saja
                </button>
                <button
                  type="button"
                  onClick={() => setViewSide('back')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewSide === 'back' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Halaman Belakang (Jadwal)
                </button>
              </div>

              {viewSide === 'both' && (
                <button
                  type="button"
                  onClick={() => setSheetOrder((prev) => (prev === 'grouped' ? 'paired' : 'grouped'))}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title="Atur urutan lembar halaman PDF/cetak"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{sheetOrder === 'grouped' ? 'Urutan: Semua Depan -> Semua Belakang' : 'Urutan: Pasang Depan-Belakang/Lembar'}</span>
                </button>
              )}

              {(viewSide === 'both' || viewSide === 'back') && (
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mirrorBackForDuplex}
                    onChange={(e) => setMirrorBackForDuplex(e.target.checked)}
                    className="rounded text-purple-600 cursor-pointer"
                  />
                  <FlipHorizontal2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Cermin Duplex Belakang</span>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama/NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={studentsToPrint.length === 0 || isDownloadingPdf}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95"
              >
                {isDownloadingPdf ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>
                  {isDownloadingPdf
                    ? pdfProgressMsg || 'Memproses PDF...'
                    : `Unduh PDF (${studentsToPrint.length} Kartu • A4)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={studentsToPrint.length === 0 || isDownloadingPdf}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak A4 ({sheetsToRender.length} Lbr)</span>
              </button>
            </div>
          </div>

          {/* Compact Student Checklist Strip */}
          {displayedStudents.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
              {displayedStudents.map((s) => {
                const checked = selectedStudentIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStudent(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 flex items-center gap-1 cursor-pointer transition-all ${
                      checked
                        ? 'bg-purple-50 border-purple-300 text-purple-900'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-3 h-3 text-purple-600" />
                    ) : (
                      <Square className="w-3 h-3 text-slate-300" />
                    )}
                    <span className="max-w-[120px] truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Preview & Printable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/60">
          {studentsToPrint.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-sm font-bold text-slate-600">Tidak ada kartu ujian yang dipilih</p>
              <p className="text-xs text-slate-400 mt-1">
                Centang siswa di atas untuk melihat pratinjau lembar A4 (4 kartu per lembar) dan mengunduh PDF.
              </p>
            </div>
          ) : (
            <div id="print-cbt-cards" className="space-y-8">
              {sheetsToRender.map((sheet) => (
                <div
                  key={sheet.key}
                  className="a4-sheet-page bg-white rounded-2xl shadow-md border border-slate-300 p-4 sm:p-6 max-w-4xl mx-auto"
                >
                  <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className={sheet.side === 'front' ? 'text-purple-800' : 'text-indigo-800'}>
                      {sheet.title}
                    </span>
                    <span>Ukuran A4 • 2x2 Kartu Proporsi B4</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sheet.cards.map((student, slotIdx) =>
                      sheet.side === 'front'
                        ? renderFrontCard(student, `${sheet.key}-slot-${slotIdx}`)
                        : renderBackCard(student, `${sheet.key}-slot-${slotIdx}`)
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>1 Kertas A4 = 4 Kartu Peserta (Proporsi B4)</strong> dengan Halaman Depan &amp; Halaman Belakang (Jadwal) terpisah otomatis.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer self-end sm:self-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
