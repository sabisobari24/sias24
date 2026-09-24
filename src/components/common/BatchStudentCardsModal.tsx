import React, { useState, useMemo, useEffect } from 'react';
import { Student, SchoolClass } from '../../types';
import { printBatchStudentCards } from '../../utils/qrHelper';
import { downloadBatchStudentCardsPDF } from '../../utils/cardPdfHelper';
import { getEffectiveSchoolLogo, DEFAULT_SCHOOL_LOGO } from '../../utils/schoolLogoHelper';
import { getCardDesignConfig, getPresetById, CardDesignConfig } from '../../utils/cardDesignHelper';
import {
  Printer,
  X,
  CreditCard,
  Filter,
  CheckSquare,
  Square,
  Search,
  School,
  Sparkles,
  Layers,
  RotateCw,
  CheckCircle2,
  Users,
  FileDown,
  Loader2
} from 'lucide-react';

interface BatchStudentCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: SchoolClass[];
  initialClassId?: string;
  headmasterName?: string;
  schoolName?: string;
  schoolLogo?: string;
}

export default function BatchStudentCardsModal({
  isOpen,
  onClose,
  students,
  classes,
  initialClassId = 'all',
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  schoolName,
  schoolLogo
}: BatchStudentCardsModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [printSide, setPrintSide] = useState<'front' | 'both' | 'back'>('front');
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewFlipped, setPreviewFlipped] = useState(false);

  const effectiveSchoolName = schoolName || localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';

  const [effectiveSchoolLogo, setEffectiveSchoolLogo] = useState<string>(() => {
    if (schoolLogo && schoolLogo.trim() !== '' && !schoolLogo.includes('/logo.png')) {
      return schoolLogo;
    }
    return getEffectiveSchoolLogo();
  });

  const [cardConfig, setCardConfig] = useState<CardDesignConfig>(getCardDesignConfig);
  const activePreset = getPresetById(cardConfig.presetId);

  useEffect(() => {
    const updateLogoAndConfig = () => {
      if (schoolLogo && schoolLogo.trim() !== '' && !schoolLogo.includes('/logo.png')) {
        setEffectiveSchoolLogo(schoolLogo);
      } else {
        setEffectiveSchoolLogo(getEffectiveSchoolLogo());
      }
      setCardConfig(getCardDesignConfig());
    };

    updateLogoAndConfig();
    window.addEventListener('siakad_logo_updated', updateLogoAndConfig);
    window.addEventListener('siakad_card_design_updated', updateLogoAndConfig);
    window.addEventListener('storage', updateLogoAndConfig);
    return () => {
      window.removeEventListener('siakad_logo_updated', updateLogoAndConfig);
      window.removeEventListener('siakad_card_design_updated', updateLogoAndConfig);
      window.removeEventListener('storage', updateLogoAndConfig);
    };
  }, [schoolLogo, isOpen]);

  // Update selection whenever class filter or open state changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedClassId(initialClassId || 'all');
      setIsInitialized(true);
    } else {
      setIsInitialized(false);
    }
  }, [isOpen, initialClassId]);

  // Compute class student counts
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = { all: students.length };
    classes.forEach(c => {
      counts[c.id] = students.filter(s => s.classId === c.id).length;
    });
    return counts;
  }, [students, classes]);

  // Filter students based on class selection and search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClassId === 'all' || s.classId === selectedClassId;
      const matchSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nisn && s.nisn.includes(searchQuery.trim())) ||
        (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchSearch;
    });
  }, [students, selectedClassId, searchQuery]);

  // Initialize all visible students as selected when class changes or modal opens
  React.useEffect(() => {
    if (isOpen && isInitialized) {
      const allFilteredIds = new Set(filteredStudents.map((s) => s.id));
      setSelectedStudentIds(allFilteredIds);
    }
  }, [selectedClassId, isOpen, isInitialized, students]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState('');

  if (!isOpen) return null;

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id));
  const selectedCount = filteredStudents.filter(s => selectedStudentIds.has(s.id)).length;

  const handleToggleSelectAll = () => {
    const nextSet = new Set(selectedStudentIds);
    if (isAllSelected) {
      // Uncheck all in current filtered view
      filteredStudents.forEach(s => nextSet.delete(s.id));
    } else {
      // Check all in current filtered view
      filteredStudents.forEach(s => nextSet.add(s.id));
    }
    setSelectedStudentIds(nextSet);
  };

  const handleToggleStudent = (id: string) => {
    const nextSet = new Set(selectedStudentIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSelectedStudentIds(nextSet);
  };

  // Sample student for live preview
  const previewStudent = filteredStudents.find(s => selectedStudentIds.has(s.id)) || filteredStudents[0] || students[0];
  const previewClass = previewStudent ? classes.find(c => c.id === previewStudent.classId)?.name || previewStudent.classId : '-';
  const previewAvatar = previewStudent?.avatarUrl || (previewStudent ? `https://ui-avatars.com/api/?name=${encodeURIComponent(previewStudent.name)}&background=4f46e5&color=fff&size=200&bold=true` : '');

  const handlePrintBatch = async () => {
    const targetStudents = filteredStudents.filter(s => selectedStudentIds.has(s.id));
    if (targetStudents.length === 0) return;

    setIsPrinting(true);
    try {
      const selectedClassObj = classes.find(c => c.id === selectedClassId);
      const title = selectedClassId !== 'all'
        ? `Kartu Pelajar Siswa - Kelas ${selectedClassObj?.name || selectedClassId}`
        : 'Kartu Pelajar Siswa - Seluruh Kelas';

      await printBatchStudentCards(targetStudents, classes, headmasterName, title, {
        side: printSide,
        schoolLogo: effectiveSchoolLogo
      });
    } catch (err) {
      console.error('Gagal mencetak kartu massal:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadBatchPdf = async () => {
    const targetStudents = filteredStudents.filter(s => selectedStudentIds.has(s.id));
    if (targetStudents.length === 0) return;

    setIsDownloadingPdf(true);
    try {
      await downloadBatchStudentCardsPDF(targetStudents, classes, headmasterName, effectiveSchoolName, {
        side: printSide,
        schoolLogo: effectiveSchoolLogo,
        onProgress: (current, total, msg) => {
          setPdfProgressMsg(msg);
        }
      });
    } catch (err) {
      console.error('Gagal mengunduh berkas PDF massal:', err);
      alert('Terjadi kendala saat memproses berkas PDF. Silakan coba kembali.');
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgressMsg('');
    }
  };

  // Estimate A4 pages (8 cards per page for front-only, 4 pairs per page for both)
  const cardsPerPage = printSide === 'both' ? 4 : 8;
  const estimatedPages = Math.ceil(selectedCount / cardsPerPage) || 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-indigo-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 shadow-inner flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight text-white">
                  Cetak Massal Kartu Tanda Pelajar
                </h3>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Filter Kelas
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Cetak kartu tanda pelajar ber-QR Code absensi dengan Logo Sekolah resmi di sebelah kiri.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          {/* Left Column: Filter Controls & Student List (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Class Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Filter className="w-3.5 h-3.5 text-purple-600" />
                  Pilih Filter Kelas:
                </label>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                  {selectedClassId === 'all' ? 'Seluruh Siswa' : `Kelas ${classes.find(c => c.id === selectedClassId)?.name || selectedClassId}`}
                </span>
              </div>

              {/* Class Tabs */}
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedClassId('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedClassId === 'all'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>Semua Kelas</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedClassId === 'all' ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {classCounts['all'] || 0}
                  </span>
                </button>

                {classes.map((cls) => {
                  const count = classCounts[cls.id] || 0;
                  const isSelected = selectedClassId === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{cls.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student Search & Selection Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa atau NISN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Toggle Select All */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg transition-all cursor-pointer shrink-0"
                >
                  {isAllSelected ? (
                    <>
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                      <span>Batal Pilih Semua</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 text-slate-400" />
                      <span>Pilih Semua ({filteredStudents.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Selection Status */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>
                  Siswa Terpilih: <strong className="text-purple-700 font-bold">{selectedCount}</strong> dari {filteredStudents.length} siswa
                </span>
                {selectedClassId !== 'all' && (
                  <span className="text-[11px] text-slate-400">
                    Filter aktif: Kelas {classes.find(c => c.id === selectedClassId)?.name}
                  </span>
                )}
              </div>

              {/* Student Checkbox List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50/40">
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Tidak ada siswa yang sesuai dengan filter atau pencarian.
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const isChecked = selectedStudentIds.has(student.id);
                    const cName = classes.find(c => c.id === student.classId)?.name || student.classId || '-';
                    const avatar = student.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4f46e5&color=fff&size=100&bold=true`;

                    return (
                      <div
                        key={student.id}
                        onClick={() => handleToggleStudent(student.id)}
                        className={`flex items-center justify-between p-2.5 hover:bg-purple-50/60 cursor-pointer transition-colors ${
                          isChecked ? 'bg-purple-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by parent div
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <img
                            src={avatar}
                            alt={student.name}
                            className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {student.name}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>NISN: <span className="font-mono text-slate-700">{student.nisn || '-'}</span></span>
                              <span>•</span>
                              <span>Kelas: {cName}</span>
                            </p>
                          </div>
                        </div>

                        {student.isKjpRecipient && (
                          <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                            KJP
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Print Side Selection */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Format Layout Sisi Kartu:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintSide('front')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    printSide === 'front'
                      ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs ring-1 ring-purple-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Tampak Depan</span>
                    {printSide === 'front' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Standar ID Card (8 kartu / Lembar A4)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintSide('both')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    printSide === 'both'
                      ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs ring-1 ring-purple-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Depan & Belakang</span>
                    {printSide === 'both' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Lengkap dengan tata tertib & barcode
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintSide('back')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    printSide === 'back'
                      ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs ring-1 ring-purple-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Tampak Belakang</span>
                    {printSide === 'back' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Aturan & kode barcode NISN
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Card Preview & Print Action (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                  Pratinjau Kartu Pelajar
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewFlipped(!previewFlipped)}
                  className="text-purple-700 hover:text-purple-900 text-xs font-bold flex items-center gap-1 cursor-pointer bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg border border-purple-200 transition-all"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{previewFlipped ? 'Lihat Depan' : 'Lihat Belakang'}</span>
                </button>
              </div>

              {/* Physical Card Preview Box */}
              {previewStudent ? (
                <div
                  className="w-full aspect-[85.6/54] rounded-xl shadow-md overflow-hidden border flex flex-col relative transition-all"
                  style={{
                    borderColor: activePreset.borderCss,
                    backgroundImage: cardConfig.bgType === 'custom_image' && cardConfig.customBgImage ? `url(${cardConfig.customBgImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {!previewFlipped ? (
                    /* Front Card Preview */
                    <>
                      {/* Card Header with School Logo on LEFT */}
                      <div className={`${activePreset.headerTailwind} px-2.5 py-1.5 flex items-center justify-between ${activePreset.borderAccent}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          {/* School Logo Container (Left) - Transparent, no border, no contrast box */}
                          <div className="w-7 h-7 flex items-center justify-center shrink-0 bg-transparent border-0 outline-none shadow-none">
                            <img
                              src={effectiveSchoolLogo}
                              alt="Logo Resmi Sekolah"
                              className="w-full h-full object-contain border-0 outline-none shadow-none bg-transparent"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src !== DEFAULT_SCHOOL_LOGO) {
                                  target.src = DEFAULT_SCHOOL_LOGO;
                                }
                              }}
                            />
                          </div>
                          <div className="leading-tight truncate">
                            <div className="text-[9px] font-black tracking-wide uppercase text-white truncate">
                              {effectiveSchoolName}
                            </div>
                            <div className="text-[7px] font-bold text-amber-300 tracking-wider uppercase">
                              KARTU TANDA PELAJAR
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className={`flex-1 p-2.5 flex gap-2.5 relative ${cardConfig.bgType === 'preset' ? activePreset.bodyTailwind : 'bg-white/90 backdrop-blur-xs'}`}>
                        {/* Watermark precisely in center */}
                        {cardConfig.showWatermark && (
                          <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden"
                            style={{ opacity: Math.min(cardConfig.watermarkOpacity, 0.1) }}
                          >
                            <img
                              src={effectiveSchoolLogo}
                              alt="Watermark"
                              className="w-24 h-24 object-contain filter grayscale"
                            />
                          </div>
                        )}

                        {/* Student Photo */}
                        <div className="w-14 shrink-0 flex flex-col items-center relative z-10">
                          <img
                            src={previewAvatar}
                            alt={previewStudent.name}
                            className="w-14 h-16 object-cover rounded-md border border-slate-700/40 shadow-xs bg-slate-100"
                          />
                          {previewStudent.isKjpRecipient && (
                            <span className="mt-1 text-[7px] font-black bg-emerald-600 text-white px-1 py-0.2 rounded shadow-xs w-full text-center">
                              KJP PLUS
                            </span>
                          )}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1 flex flex-col justify-between text-[8px] min-w-0 relative z-10">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase text-slate-950 truncate">
                              {previewStudent.name}
                            </p>
                            <p className="text-slate-600">
                              NISN: <span className="font-mono font-bold text-purple-700">{previewStudent.nisn || '-'}</span>
                            </p>
                            <p className="text-slate-600">
                              Kelas: <strong className="text-slate-800">{previewClass}</strong>
                            </p>
                          </div>

                          {/* Bottom Row: QR Mock on Left & Signature on Right (Posisi Semula) */}
                          <div className="flex items-end justify-between border-t border-dashed border-slate-200 pt-1 mt-1 gap-1.5">
                            <div className="flex items-center gap-1 shrink-0">
                              <div className="w-8 h-8 bg-white border border-slate-300 rounded p-0.5 shadow-2xs flex items-center justify-center">
                                <CreditCard className="w-5.5 h-5.5 text-indigo-700" />
                              </div>
                              <div className="leading-none">
                                <span className="text-[6.5px] font-black text-slate-700 uppercase block">QR ABSEN</span>
                                <span className="text-[5.5px] text-emerald-600 font-bold block mt-0.5">NISN</span>
                              </div>
                            </div>

                            <div className="text-right leading-none min-w-0">
                              <div className="text-[6.5px] text-slate-500">Kepala Sekolah,</div>
                              <div className="h-2 flex items-center justify-end text-[6px] text-slate-400 italic">(TTD &amp; Cap)</div>
                              <div className="text-[7px] font-bold border-b border-slate-800 pb-0.2 text-slate-800 truncate max-w-[90px]">
                                {headmasterName.split(',')[0]}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Back Card Preview */
                    <div
                      className="p-3 bg-gradient-to-br from-slate-50 to-purple-50/40 flex-1 flex flex-col justify-between relative"
                    >
                      {cardConfig.showWatermark && (
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden"
                          style={{ opacity: cardConfig.watermarkOpacity * 0.7 }}
                        >
                          <img
                            src={effectiveSchoolLogo}
                            alt="Watermark"
                            className="w-24 h-24 object-contain filter grayscale"
                          />
                        </div>
                      )}

                      <div className="text-center border-b border-purple-200 pb-1 relative z-10">
                        <span className="text-[8px] font-black text-purple-900 uppercase">
                          {cardConfig.backTitle}
                        </span>
                      </div>
                      <div className="text-[6.5px] text-slate-700 space-y-0.5 leading-tight pl-0.5 flex-1 overflow-y-auto relative z-10 py-1">
                        {cardConfig.rules.map((rule, idx) => (
                          <div key={idx} className="line-clamp-1">{rule}</div>
                        ))}
                        {cardConfig.footerNote && (
                          <div className="text-[6px] text-slate-500 italic pt-0.5">{cardConfig.footerNote}</div>
                        )}
                      </div>
                      <div className="border-t border-dashed border-purple-200 pt-1 text-center relative z-10">
                        <div className="text-[6px] text-slate-500 font-semibold uppercase">KODE NISN</div>
                        <div className="text-[9px] font-mono font-black text-purple-950">
                          {previewStudent.nisn || previewStudent.id}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Pilih siswa untuk melihat pratinjau kartu.
                </div>
              )}

              {/* Logo Information Badge */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Logo Sekolah di Sebelah Kiri
                </div>
                <p className="text-amber-700 text-[10px] leading-relaxed">
                  Tiap kartu pelajar otomatis memuat <strong>Logo Resmi Sekolah</strong> di bagian kiri pita header kartu sesuai pengaturan sistem.
                </p>
              </div>
            </div>

            {/* Print Summary Card & Action Button */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between font-semibold">
                  <span>Total Siswa Siap Cetak:</span>
                  <span className="font-bold text-purple-700">{selectedCount} Siswa</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Estimasi Kertas A4:</span>
                  <span className="font-bold text-slate-800">~{estimatedPages} Lembar</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Kapasitas Per Lembar:</span>
                  <span>{cardsPerPage} Kartu / A4</span>
                </div>
              </div>

              {/* PDF Progress Toast */}
              {isDownloadingPdf && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1 animate-pulse">
                  <div className="flex items-center gap-2 font-bold">
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                    <span>Memproses Berkas PDF Massal...</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-snug">
                    {pdfProgressMsg || 'Merender kartu siswa dalam resolusi tinggi...'}
                  </p>
                </div>
              )}

              {/* Action Buttons: Unduh PDF & Cetak Langsung */}
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isPrinting || isDownloadingPdf || selectedCount === 0}
                  onClick={handleDownloadBatchPdf}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  title="Download seluruh kartu pelajar terpilih dalam 1 berkas PDF"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  <span>
                    {isDownloadingPdf
                      ? 'Menyusun Berkas PDF...'
                      : `Unduh ${selectedCount} Kartu (Format PDF)`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isPrinting || isDownloadingPdf || selectedCount === 0}
                  onClick={handlePrintBatch}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isPrinting
                      ? 'Menyiapkan Dokumen Cetak...'
                      : `Buka Pratinjau Cetak Browser`}
                  </span>
                </button>
              </div>

              <button
                type="button"
                disabled={isPrinting || isDownloadingPdf}
                onClick={onClose}
                className="w-full text-center py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal / Kembali ke Tabel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
