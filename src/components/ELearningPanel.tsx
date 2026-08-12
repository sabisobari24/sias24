import React, { useState, useMemo } from 'react';
import {
  ELearningMaterial,
  StudentLearningProgress,
  SchoolClass,
  Student,
  Teacher
} from '../types';
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Video,
  Presentation,
  Link as LinkIcon,
  Search,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Printer,
  X,
  Upload,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Check
} from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF, printHTML } from '../utils/printHelper';
import ConfirmModal from './ConfirmModal';

interface ELearningPanelProps {
  currentUser: any; // Teacher or Student object
  isTeacher: boolean;
  isStudent: boolean;
  materials: ELearningMaterial[];
  progressList: StudentLearningProgress[];
  classes: SchoolClass[];
  students: Student[];
  teachers?: Teacher[];
  onAddMaterial?: (material: Omit<ELearningMaterial, 'id'>) => void;
  onDeleteMaterial?: (id: string) => void;
  onUpdateProgress?: (progress: StudentLearningProgress) => void;
  headmasterName?: string;
}

export default function ELearningPanel({
  currentUser,
  isTeacher,
  isStudent,
  materials = [],
  progressList = [],
  classes = [],
  students = [],
  teachers = [],
  onAddMaterial,
  onDeleteMaterial,
  onUpdateProgress,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.'
}: ELearningPanelProps) {
  // Tabs for Teacher view: 'materi' or 'progres'
  const [activeTeacherTab, setActiveTeacherTab] = useState<'materi' | 'progres'>('materi');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Modal States for Upload/Add
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Material Preview Modal State
  const [previewMaterial, setPreviewMaterial] = useState<ELearningMaterial | null>(null);
  const [studentReflectNote, setStudentReflectNote] = useState('');

  // Form States for New Material
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(currentUser?.subject || 'Matematika');
  const [newClassIds, setNewClassIds] = useState<string[]>(['ALL']);
  const [newType, setNewType] = useState<'pdf' | 'ppt' | 'video' | 'doc' | 'link'>('pdf');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileSize, setNewFileSize] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Subject Options List
  const subjectList = useMemo(() => {
    const defaultSubjects = [
      'Matematika',
      'IPA (Ilmu Pengetahuan Alam)',
      'IPS (Ilmu Pengetahuan Sosial)',
      'Bahasa Indonesia',
      'Bahasa Inggris',
      'PPKn / Pendidikan Pancasila',
      'PAI / Pendidikan Agama',
      'PJOK (Seni & Olahraga)',
      'Informatika / TIK',
      'Seni Budaya',
      'Prakarya'
    ];
    const extracted = materials.map((m) => m.subject).filter(Boolean);
    const setObj = new Set([...defaultSubjects, ...extracted]);
    return Array.from(setObj);
  }, [materials]);

  // Handle File Upload Conversion
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal ukuran file adalah 15MB.');
      return;
    }

    setIsUploading(true);
    setNewFileName(file.name);
    
    // Format human size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setNewFileSize(`${sizeInMB} MB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewFileUrl(result);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Gagal membaca file.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Material
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Judul materi wajib diisi!');
      return;
    }
    if (!onAddMaterial) return;

    const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 16);

    onAddMaterial({
      title: newTitle.trim(),
      subject: newSubject,
      classIds: newClassIds.length > 0 ? newClassIds : ['ALL'],
      type: newType,
      fileUrl: newFileUrl || undefined,
      fileName: newFileName || undefined,
      fileSize: newFileSize || undefined,
      videoUrl: newVideoUrl.trim() || undefined,
      description: newDescription.trim(),
      teacherId: currentUser?.id || 't1',
      teacherName: currentUser?.name || 'Guru Pengampu',
      createdAt: formattedDate
    });

    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewFileUrl('');
    setNewFileName('');
    setNewFileSize('');
    setNewVideoUrl('');
    setIsAddModalOpen(false);
  };

  // Student Toggle Progress
  const handleToggleStudentProgress = (material: ELearningMaterial) => {
    if (!onUpdateProgress || !currentUser?.id) return;

    const currentProgressId = `${currentUser.id}_${material.id}`;
    const existing = progressList.find((p) => p.id === currentProgressId || (p.studentId === currentUser.id && p.materialId === material.id));

    const isCompleted = existing?.status === 'Selesai';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updated: StudentLearningProgress = {
      id: currentProgressId,
      studentId: currentUser.id,
      studentName: currentUser.name || 'Siswa',
      classId: currentUser.classId || '7-A',
      materialId: material.id,
      materialTitle: material.title,
      subject: material.subject,
      status: isCompleted ? 'Proses' : 'Selesai',
      notes: studentReflectNote || existing?.notes || 'Telah dipelajari secara mandiri.',
      completedAt: isCompleted ? undefined : nowStr,
      lastAccessedAt: nowStr
    };

    onUpdateProgress(updated);
  };

  // Helper Student Class Info
  const studentClassObj = useMemo(() => {
    if (!currentUser?.classId) return null;
    return classes.find(c => c.id === currentUser.classId || c.name === currentUser.classId);
  }, [classes, currentUser]);

  const studentClassName = useMemo(() => {
    if (studentClassObj) return studentClassObj.name;
    if (currentUser?.classId) return currentUser.classId;
    return 'Kelas Anda';
  }, [studentClassObj, currentUser]);

  // Helper Check Class Match
  const checkClassMatch = (materialClassIds: string[], targetClassId?: string) => {
    if (!targetClassId) return true;
    if (materialClassIds.includes('ALL')) return true;
    if (materialClassIds.includes(targetClassId)) return true;

    const clsObj = classes.find((c) => c.id === targetClassId || c.name === targetClassId);
    const matchedNames = [targetClassId];
    if (clsObj) {
      if (clsObj.id) matchedNames.push(clsObj.id);
      if (clsObj.name) matchedNames.push(clsObj.name);
    }

    const normalize = (s: string) => s.toLowerCase().replace(/kelas/g, '').replace(/[^a-z0-9]/g, '');
    const targetNorms = matchedNames.map(normalize);

    return materialClassIds.some((mc) => {
      if (mc === 'ALL') return true;
      const mcNorm = normalize(mc);
      return targetNorms.some(
        (tn) => tn === mcNorm || (tn.length > 0 && mcNorm.length > 0 && (mcNorm.includes(tn) || tn.includes(mcNorm)))
      );
    });
  };

  // Filtered Materials for Display
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      // If student, strictly match student's class
      if (isStudent && currentUser?.classId) {
        const isTargeted = checkClassMatch(m.classIds, currentUser.classId);
        if (!isTargeted) return false;
      }

      // Filter by subject
      if (selectedSubjectFilter !== 'ALL' && m.subject !== selectedSubjectFilter) {
        return false;
      }

      // Filter by class (for teachers)
      if (!isStudent && selectedClassFilter !== 'ALL') {
        const matchesClass = checkClassMatch(m.classIds, selectedClassFilter);
        if (!matchesClass) return false;
      }

      // Filter by type
      if (selectedTypeFilter !== 'ALL' && m.type !== selectedTypeFilter) {
        return false;
      }

      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = m.title.toLowerCase().includes(q);
        const descMatch = m.description.toLowerCase().includes(q);
        const teacherMatch = m.teacherName.toLowerCase().includes(q);
        const subjectMatch = m.subject.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !teacherMatch && !subjectMatch) return false;
      }

      return true;
    });
  }, [materials, isStudent, currentUser, selectedSubjectFilter, selectedClassFilter, selectedTypeFilter, searchQuery, classes]);

  // Compute Helper YouTube Embed
  const getEmbedVideoUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  // Helper Badge Color
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'pdf':
        return { label: 'PDF Document', icon: FileText, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200' };
      case 'ppt':
        return { label: 'PPT Slide', icon: Presentation, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200' };
      case 'video':
        return { label: 'Video Pembelajaran', icon: Video, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200' };
      case 'doc':
        return { label: 'Dokumen Modul', icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200' };
      default:
        return { label: 'Tautan / Web', icon: LinkIcon, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200' };
    }
  };

  // Export Rekap Progress Excel
  const handleExportExcelProgress = () => {
    const filename = `Rekap_Pembelajaran_E-Learning_${new Date().toISOString().split('T')[0]}.xlsx`;
    const headers = ['No', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Judul Materi', 'Status', 'Waktu Selesai', 'Catatan'];
    const rows = progressList.map((p, idx) => [
      idx + 1,
      p.studentName,
      p.classId,
      p.subject,
      p.materialTitle,
      p.status,
      p.completedAt || '-',
      p.notes || '-'
    ]);

    downloadExcel(filename, headers, rows, 'Rekap E-Learning');
  };

  // Export Rekap Progress PDF / Print
  const handleExportPdfProgress = () => {
    const headers = ['No', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Judul Materi', 'Status', 'Waktu Selesai'];
    const rows = progressList.map((p, idx) => [
      String(idx + 1),
      p.studentName,
      p.classId,
      p.subject,
      p.materialTitle,
      p.status,
      p.completedAt || '-'
    ]);

    printTablePDF('LAPORAN HASIL REKAP PEMBELAJARAN SISWA (E-LEARNING)', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner shrink-0">
              <GraduationCap className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                  Portal E-Learning Interactive
                </span>
                <span className="text-xs text-indigo-200 font-medium">SMPN 50 JAKARTA</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1 tracking-tight">
                {isTeacher ? 'Kelola Materi & Progress Pembelajaran' : 'Pusat Materi Pembelajaran Digital'}
              </h2>
              <p className="text-xs text-indigo-100 mt-1 max-w-2xl leading-relaxed">
                Akses modul PDF, presentasi PPT, dan video pembelajaran interaktif yang tersinkronisasi otomatis secara real-time dengan akun siswa.
              </p>
            </div>
          </div>

          {/* Action Header Button for Teacher */}
          {isTeacher && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Unggah Materi Baru</span>
            </button>
          )}
        </div>

        {/* Tab Switcher for Teacher */}
        {isTeacher && (
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-indigo-500/40">
            <button
              onClick={() => setActiveTeacherTab('materi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTeacherTab === 'materi'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Daftar Materi Pembelajaran ({materials.length})</span>
            </button>
            <button
              onClick={() => setActiveTeacherTab('progres')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTeacherTab === 'progres'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Hasil Progress Siswa ({progressList.filter((p) => p.status === 'Selesai').length} Selesai)</span>
            </button>
          </div>
        )}
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul materi / kata kunci..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">Semua Mata Pelajaran</option>
              {subjectList.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            {isStudent ? (
              <div className="w-full px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between shadow-xs">
                <span className="flex items-center gap-1.5 truncate">
                  <BookOpen className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span>Fokus: Kelas {studentClassName}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 font-extrabold shrink-0">
                  Otomatis
                </span>
              </div>
            ) : (
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">Semua Kelas Target</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Material Format Filter */}
          <div>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">Semua Format (PDF, PPT, Video)</option>
              <option value="pdf">PDF Document</option>
              <option value="ppt">PPT Slide</option>
              <option value="video">Video Pembelajaran</option>
              <option value="doc">Dokumen Modul</option>
              <option value="link">Tautan Web External</option>
            </select>
          </div>
        </div>
      </div>

      {/* STUDENT CLASS FOCUS BANNER */}
      {isStudent && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/90 dark:to-indigo-950/60 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200 shadow-xs">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Materi Pembelajaran Khusus Kelas {studentClassName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                Terfilter Otomatis
              </span>
            </p>
            <p className="text-[11px] text-slate-600 dark:text-indigo-200/90 leading-relaxed">
              Halo <strong>{currentUser?.name || 'Siswa'}</strong>! Tampilan e-learning Anda telah disesuaikan khusus untuk <strong>Kelas {studentClassName}</strong>. Anda hanya fokus mengikuti materi dan modul pembelajaran yang ditugaskan untuk kelas Anda.
            </p>
          </div>
        </div>
      )}

      {/* CONTENT TAB 1: DAFTAR MATERI PEMBELAJARAN */}
      {(!isTeacher || activeTeacherTab === 'materi') && (
        <div>
          {filteredMaterials.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                {isStudent ? `Belum Ada Materi untuk Kelas ${studentClassName}` : 'Belum Ada Materi Pembelajaran'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {isTeacher
                  ? 'Klik tombol "Unggah Materi Baru" di atas untuk menambahkan modul PDF, PPT, atau video pembelajaran untuk siswa Anda.'
                  : `Belum ada materi pembelajaran yang diunggah oleh guru khusus untuk Kelas ${studentClassName} pada pilihan filter ini.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMaterials.map((mat) => {
                const badge = getTypeBadge(mat.type);
                const BadgeIcon = badge.icon;

                // Check student status
                const isStudentDone =
                  isStudent &&
                  progressList.some(
                    (p) =>
                      (p.id === `${currentUser?.id}_${mat.id}` || (p.studentId === currentUser?.id && p.materialId === mat.id)) &&
                      p.status === 'Selesai'
                  );

                return (
                  <div
                    key={mat.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 ${badge.color}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>

                        {isStudentDone ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Selesai</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{mat.createdAt}</span>
                          </span>
                        )}
                      </div>

                      {/* Subject Name */}
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                        {mat.subject}
                      </p>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                        {mat.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {mat.description || 'Tidak ada deskripsi tambahan.'}
                      </p>

                      {/* Targeted Class Badges */}
                      <div className="mt-4 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] font-bold text-slate-400 mr-1">Kelas Target:</span>
                        {mat.classIds.includes('ALL') ? (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] rounded-md font-semibold">
                            Semua Kelas
                          </span>
                        ) : (
                          mat.classIds.map((cid) => (
                            <span
                              key={cid}
                              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] rounded-md font-bold"
                            >
                              {cid}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Teacher name */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">
                        Diunggah oleh: <span className="font-semibold text-slate-700 dark:text-slate-300">{mat.teacherName}</span>
                      </p>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPreviewMaterial(mat)}
                        className="flex-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title={isTeacher ? "Lihat pratinjau materi" : "Buka dan pelajari materi"}
                      >
                        <Eye className="w-4 h-4" />
                        <span>{isTeacher ? 'Preview Materi' : 'Buka & Pelajari'}</span>
                      </button>

                      {isTeacher && onDeleteMaterial && (
                        <button
                          onClick={() => setDeleteConfirmId(mat.id)}
                          className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Hapus Materi Pembelajaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENT TAB 2: REKAP HASIL PROGRESS PEMBELAJARAN SISWA (FOR TEACHER) */}
      {isTeacher && activeTeacherTab === 'progres' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Rekap Akumulasi Pembelajaran Siswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pantau langsung persentase dan daftar siswa yang telah menyelesaikan materi E-Learning.
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcelProgress}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel</span>
              </button>
              <button
                onClick={handleExportPdfProgress}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800">
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Materi Pembelajaran Aktif</p>
              <h4 className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1">{materials.length}</h4>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Total Akses Selesai Siswa</p>
              <h4 className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                {progressList.filter((p) => p.status === 'Selesai').length}
              </h4>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Jumlah Siswa Terdaftar</p>
              <h4 className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">{students.length}</h4>
            </div>
          </div>

          {/* Progress Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4">Judul Materi Pembelajaran</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Waktu Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-medium">
                {progressList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                      Belum ada catatan aktivitas pembelajaran siswa.
                    </td>
                  </tr>
                ) : (
                  progressList.map((prog, idx) => (
                    <tr key={prog.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-3 px-4 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{prog.studentName}</td>
                      <td className="py-3 px-4">{prog.classId}</td>
                      <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-semibold">{prog.subject}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{prog.materialTitle}</td>
                      <td className="py-3 px-4">
                        {prog.status === 'Selesai' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Selesai
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Dalam Proses
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{prog.completedAt || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD / ADD NEW MATERIAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Unggah Materi Pembelajaran Baru</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tambahkan modul PDF, presentasi PPT, atau video untuk siswa.</p>
              </div>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Materi / Bab *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Modul Bab 1: Persamaan Linear Satu Variabel"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Subject & Format Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {subjectList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Format Berkas / Konten</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="ppt">PPT Slide Presentation (.ppt, .pptx)</option>
                    <option value="video">Video Pembelajaran (YouTube / Embed)</option>
                    <option value="doc">Dokumen Modul / Word</option>
                    <option value="link">Tautan Web External (Google Drive / Canva)</option>
                  </select>
                </div>
              </div>

              {/* Target Class Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Kelas Pembelajaran</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newClassIds.includes('ALL')}
                      onChange={(e) => {
                        if (e.target.checked) setNewClassIds(['ALL']);
                        else setNewClassIds([]);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Semua Kelas</span>
                  </label>
                  {classes.map((cls) => (
                    <label key={cls.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newClassIds.includes(cls.id)}
                        onChange={(e) => {
                          const withoutAll = newClassIds.filter((id) => id !== 'ALL');
                          if (e.target.checked) {
                            setNewClassIds([...withoutAll, cls.id]);
                          } else {
                            setNewClassIds(withoutAll.filter((id) => id !== cls.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{cls.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* File Attachment / URL Upload Fields */}
              {newType === 'video' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tautan Video (YouTube / MP4)</label>
                  <input
                    type="url"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="Contoh: https://www.youtube.com/watch?v=xxxxx"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Upload Berkas Berbagi (Maks 15MB)</label>
                  <div className="p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl text-center">
                    <input
                      type="file"
                      accept={
                        newType === 'pdf'
                          ? '.pdf'
                          : newType === 'ppt'
                          ? '.ppt,.pptx'
                          : '.pdf,.ppt,.pptx,.doc,.docx'
                      }
                      onChange={handleFileUpload}
                      className="hidden"
                      id="materi-file-input"
                    />
                    <label htmlFor="materi-file-input" className="cursor-pointer inline-flex flex-col items-center gap-1">
                      <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Klik Pilih File dari Komputer/HP</span>
                      <span className="text-[10px] text-slate-400">PDF, PPTX, DOCX didukung</span>
                    </label>
                    {isUploading && <p className="text-xs text-amber-600 font-bold mt-2 animate-pulse">Sedang memproses file...</p>}
                    {newFileName && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                        File Terpilih: {newFileName} ({newFileSize})
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Atau Tautan File Direct (Google Drive / Direct URL)</label>
                    <input
                      type="url"
                      value={newFileUrl.startsWith('data:') ? '' : newFileUrl}
                      onChange={(e) => setNewFileUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/xxxxx/view"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi & Petunjuk Pembelajaran *</label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Tuliskan petunjuk pembelajaran, instruksi membaca, atau poin penting..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  Simpan & Publikasikan Materi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW & STUDY MODAL FOR MATERIAL */}
      {previewMaterial && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setPreviewMaterial(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <span
                className={`p-2.5 rounded-xl border ${getTypeBadge(previewMaterial.type).color}`}
              >
                {React.createElement(getTypeBadge(previewMaterial.type).icon, { className: 'w-5 h-5' })}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {previewMaterial.subject}
                  </span>
                  {isTeacher && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      Mode Preview Guru
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{previewMaterial.title}</h3>
              </div>
            </div>

            {/* Embed Video Player or Viewer */}
            {previewMaterial.type === 'video' && previewMaterial.videoUrl ? (
              <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-md">
                <iframe
                  src={getEmbedVideoUrl(previewMaterial.videoUrl) || ''}
                  title={previewMaterial.title}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : previewMaterial.fileUrl && previewMaterial.fileUrl.startsWith('data:application/pdf') ? (
              <div className="mb-4 h-96 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100">
                <iframe src={previewMaterial.fileUrl} className="w-full h-full" title="PDF Reader" />
              </div>
            ) : null}

            {/* Description Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mb-5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Petunjuk Pembelajaran:</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {previewMaterial.description}
              </p>
            </div>

            {/* Direct File Link Download Bar */}
            {(previewMaterial.fileUrl || previewMaterial.videoUrl) && (
              <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-5">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    {previewMaterial.fileName || 'Berkas Lampiran Pembelajaran'} {previewMaterial.fileSize ? `(${previewMaterial.fileSize})` : ''}
                  </span>
                </div>
                {previewMaterial.fileUrl && (
                  <a
                    href={previewMaterial.fileUrl}
                    download={previewMaterial.fileName || 'Materi_Pembelajaran'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                  >
                    <span>Unduh Berkas</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Student Mark Completed Actions */}
            {isStudent && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Konfirmasi Status Pemahaman Pembelajaran
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleToggleStudentProgress(previewMaterial);
                      setPreviewMaterial(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {progressList.some(
                        (p) =>
                          (p.id === `${currentUser?.id}_${previewMaterial.id}` ||
                            (p.studentId === currentUser?.id && p.materialId === previewMaterial.id)) &&
                          p.status === 'Selesai'
                      )
                        ? 'Tandai Belum Selesai'
                        : 'Tandai Selesai Dipelajari'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Hapus Materi Pembelajaran"
        message="Apakah Anda yakin ingin menghapus materi ini dari daftar E-Learning? Siswa tidak lagi dapat mengakses materi ini."
        confirmText="Ya, Hapus Materi"
        onConfirm={() => {
          if (deleteConfirmId && onDeleteMaterial) {
            onDeleteMaterial(deleteConfirmId);
          }
          setDeleteConfirmId(null);
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
