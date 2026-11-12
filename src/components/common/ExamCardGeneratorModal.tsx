import React, { useState, useMemo } from 'react';
import { Student, SchoolClass, ExamSchedule } from '../../types';
import { getEffectiveSchoolLogo } from '../../utils/schoolLogoHelper';
import { 
  Printer, 
  X, 
  CreditCard, 
  Calendar, 
  Search, 
  GraduationCap, 
  RotateCw, 
  CheckSquare, 
  Square, 
  FileDown, 
  Sparkles,
  Layers,
  ChevronDown,
  Info
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
  const [examTitle, setExamTitle] = useState<string>('PENILAIAN AKHIR SEMESTER (PAS) - CBT');
  const [examYear, setExamYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  });
  const [examRoom, setExamRoom] = useState<string>('Lab Komputer / Ruang Kelas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewSide, setViewSide] = useState<'both' | 'front' | 'back'>('both');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const effectiveSchoolName = schoolName || 'SMP NEGERI 50 JAKARTA';
  const schoolLogo = getEffectiveSchoolLogo();
  const dkiLogo = '/logo-dki.png';

  // Filter students by selected class
  const classStudents = useMemo(() => {
    let list = students;
    if (selectedClassId && selectedClassId !== 'all') {
      list = list.filter((s) => s.classId === selectedClassId);
    }
    // Sort alphabetically by name so exam attendance numbers are sequential & clean
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [students, selectedClassId]);

  // Filter by search
  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter((s) => 
      s.name.toLowerCase().includes(q) || 
      (s.nisn && s.nisn.includes(q))
    );
  }, [classStudents, searchQuery]);

  // Initialize selected students whenever class changes
  React.useEffect(() => {
    setSelectedStudentIds(new Set(classStudents.map(s => s.id)));
  }, [classStudents]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === displayedStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(displayedStudents.map(s => s.id)));
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

  const studentsToPrint = displayedStudents.filter(s => selectedStudentIds.has(s.id));

  // Auto-generate Participant Number (Nomor Peserta Ujian)
  const getParticipantNumber = (student: Student, indexInClass: number) => {
    const currentYear = new Date().getFullYear();
    const className = classes.find(c => c.id === student.classId)?.name || 'CBT';
    const cleanClass = className.replace(/[^a-zA-Z0-9]/g, '');
    const studentIndex = classStudents.findIndex(s => s.id === student.id);
    const orderNo = String((studentIndex >= 0 ? studentIndex : indexInClass) + 1).padStart(2, '0');
    return `${currentYear}-${cleanClass}-${orderNo}`;
  };

  // Get exam schedule for a class or default matrix
  const getSchedulesForClass = (classId: string) => {
    const matched = examSchedules.filter(es => !es.classId || es.classId === 'all' || es.classId === classId);
    if (matched.length > 0) {
      return matched.map((es, idx) => ({
        no: idx + 1,
        dayDate: es.date || 'Sesuai Jadwal',
        time: es.time || '07:30 - 09:30',
        subject: es.subject,
        room: es.room || examRoom,
      }));
    }

    // Standard school exam schedule matrix fallback
    return [
      { no: 1, dayDate: 'Senin, 02 Juni 2026', time: '07.30 - 09.30', subject: 'Bahasa Indonesia', room: examRoom },
      { no: 2, dayDate: 'Senin, 02 Juni 2026', time: '10.00 - 11.30', subject: 'Pendidikan Agama & Budi Pekerti', room: examRoom },
      { no: 3, dayDate: 'Selasa, 03 Juni 2026', time: '07.30 - 09.30', subject: 'Matematika', room: examRoom },
      { no: 4, dayDate: 'Selasa, 03 Juni 2026', time: '10.00 - 11.30', subject: 'PPKn / Pancasila', room: examRoom },
      { no: 5, dayDate: 'Rabu, 04 Juni 2026', time: '07.30 - 09.30', subject: 'Ilmu Pengetahuan Alam (IPA)', room: examRoom },
      { no: 6, dayDate: 'Rabu, 04 Juni 2026', time: '10.00 - 11.30', subject: 'Informatika', room: examRoom },
      { no: 7, dayDate: 'Kamis, 05 Juni 2026', time: '07.30 - 09.30', subject: 'Bahasa Inggris', room: examRoom },
      { no: 8, dayDate: 'Kamis, 05 Juni 2026', time: '10.00 - 11.30', subject: 'Ilmu Pengetahuan Sosial (IPS)', room: examRoom },
      { no: 9, dayDate: 'Jumat, 06 Juni 2026', time: '07.30 - 09.00', subject: 'Seni Budaya & Prakarya', room: examRoom },
      { no: 10, dayDate: 'Jumat, 06 Juni 2026', time: '09.30 - 11.00', subject: 'PJOK / Pendidikan Jasmani', room: examRoom },
    ];
  };

  const handlePrint = () => {
    window.print();
  };

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
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          @page {
            size: A4 portrait;
            margin: 0.8cm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <CreditCard className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Generate &amp; Cetak Kartu Ujian Siswa (CBT)</h2>
              <p className="text-xs text-purple-200">
                Format Resmi Siap Cetak Depan-Belakang &bull; Nomor Peserta Otomatis per Rombel
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

        {/* Form Controls / Filter Bar */}
        <div className="p-5 bg-slate-50 border-b border-slate-200/80 space-y-4 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filter Kelas */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Pilih Rombel / Kelas</label>
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
                      {c.name} ({students.filter(s => s.classId === c.id).length} Siswa)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Nama Ujian */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Nama Ujian / Asesmen</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="misal: ASESMEN SUMATIF AKHIR SEMESTER (CBT)"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 text-xs"
              />
            </div>

            {/* Tahun Ajaran / Sesi */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Tahun Pelajaran / Sesi</label>
              <input
                type="text"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
                placeholder="2025/2026 - Semester Genap"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 text-xs"
              />
            </div>

            {/* Lokasi / Ruang Ujian */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Ruang / Lokasi Ujian</label>
              <input
                type="text"
                value={examRoom}
                onChange={(e) => setExamRoom(e.target.value)}
                placeholder="Lab Komputer / Ruang Kelas"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/30 text-xs"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                {selectedStudentIds.size === displayedStudents.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Pilih Semua ({selectedStudentIds.size}/{displayedStudents.length})</span>
              </button>

              {/* View Side Selector */}
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewSide('both')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewSide === 'both' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Depan &amp; Belakang
                </button>
                <button
                  type="button"
                  onClick={() => setViewSide('front')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewSide === 'front' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tampak Depan
                </button>
                <button
                  type="button"
                  onClick={() => setViewSide('back')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewSide === 'back' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tampak Belakang
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <button
                type="button"
                onClick={handlePrint}
                disabled={studentsToPrint.length === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak {studentsToPrint.length} Kartu Ujian (A4/B4)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview & Printable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          {studentsToPrint.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-sm font-bold text-slate-600">Tidak ada kartu ujian yang dipilih</p>
              <p className="text-xs text-slate-400 mt-1">Centang siswa di atas untuk melihat pratinjau dan mencetak kartu peserta ujian.</p>
            </div>
          ) : (
            <div id="print-cbt-cards" className="space-y-6">
              {studentsToPrint.map((student, idx) => {
                const studentClass = classes.find(c => c.id === student.classId);
                const participantNo = getParticipantNumber(student, idx);
                const schedules = getSchedulesForClass(student.classId);

                return (
                  <div 
                    key={student.id} 
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-4 sm:p-6 space-y-6 page-break max-w-4xl mx-auto"
                  >
                    {/* Visual Card Pair Container: Ready for duplex printing or side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                      
                      {/* FRONT OF EXAM CARD */}
                      {(viewSide === 'both' || viewSide === 'front') && (
                        <div className="border-2 border-slate-800 rounded-2xl p-4 bg-white flex flex-col justify-between relative overflow-hidden shadow-xs">
                          {/* Top Background Watermark */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            <GraduationCap className="w-72 h-72 text-slate-900" />
                          </div>

                          {/* Kop Surat Sekolah */}
                          <div className="border-b-2 border-slate-900 pb-2.5 mb-3 flex items-center gap-3">
                            <img
                              src={dkiLogo}
                              alt="DKI"
                              className="w-11 h-11 object-contain shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            />
                            <div className="flex-1 text-center leading-tight">
                              <p className="text-[9px] font-black tracking-wider uppercase text-slate-700">PEMERINTAH PROVINSI DKI JAKARTA</p>
                              <p className="text-[8px] font-semibold text-slate-600">DINAS PENDIDIKAN DASAR &amp; MENENGAH</p>
                              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{effectiveSchoolName}</h3>
                              <p className="text-[7.5px] text-slate-500">Jl. Slamet Riyadi No. 19, Matraman, Jakarta Timur &bull; NPSN: 20103599</p>
                            </div>
                            <img
                              src={schoolLogo}
                              alt="Logo"
                              className="w-11 h-11 object-contain shrink-0"
                            />
                          </div>

                          {/* Card Badge Title */}
                          <div className="text-center mb-3">
                            <span className="inline-block bg-slate-900 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                              KARTU TANDA PESERTA UJIAN (CBT)
                            </span>
                            <p className="text-[11px] font-black text-purple-900 uppercase mt-1 tracking-tight">
                              {examTitle}
                            </p>
                            <p className="text-[9px] font-bold text-slate-500">
                              Tahun Pelajaran: {examYear}
                            </p>
                          </div>

                          {/* Student Details & Photo */}
                          <div className="flex items-center gap-3 bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 mb-3">
                            {/* Photo / Avatar */}
                            <div className="w-20 h-24 bg-white border border-slate-300 rounded-lg shrink-0 overflow-hidden flex flex-col items-center justify-center p-1 text-center shadow-2xs">
                              {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt="" className="w-full h-full object-cover rounded" />
                              ) : (
                                <div className="text-center">
                                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">Pasfoto 3x4</span>
                                </div>
                              )}
                            </div>

                            {/* Details Table */}
                            <div className="flex-1 text-[11px] space-y-1 text-slate-800">
                              <div className="flex">
                                <span className="w-24 font-bold text-purple-950 text-[10px] uppercase">No. Peserta</span>
                                <span className="font-mono font-black text-xs text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                                  {participantNo}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="w-24 font-bold text-slate-500 text-[10px] uppercase">Nama Lengkap</span>
                                <span className="font-bold uppercase tracking-tight text-slate-900">{student.name}</span>
                              </div>
                              <div className="flex">
                                <span className="w-24 font-bold text-slate-500 text-[10px] uppercase">NISN / NIS</span>
                                <span className="font-mono">{student.nisn || '-'}</span>
                              </div>
                              <div className="flex">
                                <span className="w-24 font-bold text-slate-500 text-[10px] uppercase">Kelas</span>
                                <span className="font-bold text-slate-900">{studentClass?.name || student.classId}</span>
                              </div>
                              <div className="flex">
                                <span className="w-24 font-bold text-slate-500 text-[10px] uppercase">Ruang / Sesi</span>
                                <span className="font-semibold">{examRoom}</span>
                              </div>
                            </div>
                          </div>

                          {/* Barcode & Signature */}
                          <div className="flex items-end justify-between border-t border-slate-200 pt-2 text-[8px] mt-auto">
                            {/* Barcode Mock */}
                            <div className="space-y-1">
                              <div className="font-mono text-[9px] tracking-widest bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold">
                                ||| | |||| | ||| |||| |
                              </div>
                              <p className="text-[7.5px] text-slate-400 font-mono text-center">*{participantNo}*</p>
                            </div>

                            {/* TTD Kepala Sekolah */}
                            <div className="text-center w-36">
                              <p className="text-[8px] text-slate-500">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              <p className="text-[8px] font-bold text-slate-700">Kepala Sekolah,</p>
                              <div className="h-9 flex items-center justify-center">
                                <span className="font-serif italic text-indigo-700 text-[11px] font-bold">[Tanda Tangan &amp; Cap]</span>
                              </div>
                              <p className="text-[8.5px] font-black text-slate-900 underline">{headmasterName}</p>
                              <p className="text-[7.5px] text-slate-500">NIP. 196805121994122001</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* BACK OF EXAM CARD: JADWAL & PARAF PENGAWAS */}
                      {(viewSide === 'both' || viewSide === 'back') && (
                        <div className="border-2 border-slate-800 rounded-2xl p-4 bg-white flex flex-col justify-between shadow-xs">
                          <div>
                            {/* Back Header */}
                            <div className="text-center border-b border-slate-300 pb-2 mb-2">
                              <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight">
                                JADWAL UJIAN &amp; PARAF PENGAWAS RUANG
                              </h4>
                              <p className="text-[9px] text-slate-500 font-medium">
                                Nama: <strong className="text-slate-800">{student.name}</strong> &bull; No: <strong className="text-purple-700">{participantNo}</strong>
                              </p>
                            </div>

                            {/* Schedule Table */}
                            <div className="overflow-hidden border border-slate-300 rounded-lg text-[8.5px] mb-2.5">
                              <table className="w-full text-left">
                                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[7.5px] border-b border-slate-300">
                                  <tr>
                                    <th className="px-1.5 py-1 text-center w-5">No</th>
                                    <th className="px-1.5 py-1">Hari, Tgl</th>
                                    <th className="px-1.5 py-1">Mata Pelajaran</th>
                                    <th className="px-1.5 py-1 text-center w-14">Waktu</th>
                                    <th className="px-1.5 py-1 text-center w-12">Paraf</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {schedules.map((sc) => (
                                    <tr key={sc.no} className="hover:bg-slate-50/50">
                                      <td className="px-1.5 py-1 text-center font-bold text-slate-500">{sc.no}</td>
                                      <td className="px-1.5 py-1 font-medium truncate max-w-[85px]">{sc.dayDate}</td>
                                      <td className="px-1.5 py-1 font-bold text-slate-800 truncate max-w-[110px]">{sc.subject}</td>
                                      <td className="px-1.5 py-1 text-center text-slate-600 font-mono text-[7.5px]">{sc.time}</td>
                                      <td className="px-1.5 py-1 text-center border-l border-slate-200 text-slate-300 font-mono">
                                        &bull;
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Rules & Instructions */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[7.5px] text-slate-600 space-y-0.5 leading-tight">
                              <p className="font-bold text-slate-800 uppercase text-[8px]">Tata Tertib Peserta CBT:</p>
                              <p>1. Hadir di ruang ujian 15 menit sebelum asesmen dimulai dengan membawa Kartu Peserta ini.</p>
                              <p>2. Dilarang membuka tab lain atau meminjamkan akun login Exambro kepada orang lain.</p>
                              <p>3. Kartu wajib diparaf oleh Pengawas Ruang pada setiap sesi ujian yang telah diselesaikan.</p>
                            </div>
                          </div>

                          {/* Student Sign Off */}
                          <div className="border-t border-slate-200 pt-2 flex justify-between items-end text-[8px] text-slate-500 mt-2">
                            <span>Dicetak Otomatis dari SIAS Web Portal</span>
                            <div className="text-center w-28">
                              <p className="text-[7.5px]">Tanda Tangan Peserta,</p>
                              <div className="h-6"></div>
                              <p className="font-bold text-slate-800 text-[8px] underline uppercase">{student.name.split(' ')[0]}</p>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-4 h-4 text-purple-600" />
            <span>Tips: Gunakan opsi cetak <strong>"Landscape"</strong> atau <strong>"Portrait (Fit to Printable Area)"</strong> pada dialog printer peramban.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
