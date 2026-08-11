import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  FileText, 
  ArrowLeft, 
  HelpCircle, 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  BookOpen,
  CheckSquare,
  PlusCircle,
  X,
  Type
} from 'lucide-react';
import TextFormattingToolbar from './common/TextFormattingToolbar';
import FormattedText from './common/FormattedText';
import { QuestionBank, CbtQuestion, Teacher, SchoolClass } from '../types';
import { syncCollection, saveDocument, deleteDocument } from '../lib/firebase';

interface BankSoalManagerProps {
  teacher: Teacher;
  classes: SchoolClass[];
}

export default function BankSoalManager({ teacher, classes = [] }: BankSoalManagerProps) {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  
  // Create / Edit Bank modal / form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState(teacher.subject || 'Matematika');
  const [formClassId, setFormClassId] = useState('all');

  // Question Creator state (nested inside selectedBank view)
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CbtQuestion | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<CbtQuestion['type']>('pilihan_ganda');
  const [questionOptions, setQuestionOptions] = useState<string[]>(['A. ', 'B. ', 'C. ', 'D. ']);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [questionMediaUrl, setQuestionMediaUrl] = useState('');
  const [questionFormula, setQuestionFormula] = useState('');
  const [questionWeight, setQuestionWeight] = useState<number>(10);

  // Status flags
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Math helper symbols
  const MATH_SYMBOLS = [
    'x²', 'y³', '√', 'π', 'θ', 'Δ', 'Σ', '∫', '±', '≠', '≤', '≥', '÷', '×', 'α', 'β', 'λ', '∞'
  ];

  // Sync Question Banks created by this teacher
  useEffect(() => {
    const unsubscribe = syncCollection<QuestionBank>('question_banks', (data) => {
      // Filter banks owned by this teacher
      const myBanks = data.filter(b => b.teacherId === teacher.id);
      setBanks(myBanks);
      
      // Keep selected bank synchronized if it's currently open
      if (selectedBank) {
        const updatedSelected = myBanks.find(b => b.id === selectedBank.id);
        if (updatedSelected) {
          setSelectedBank(updatedSelected);
        }
      }
    });
    return () => unsubscribe();
  }, [teacher.id, selectedBank?.id]);

  // Handle saving new / edited Bank (Title, Subject, Class link)
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formTitle.trim()) {
      setErrorMsg('Judul Bank Soal wajib diisi.');
      return;
    }

    const bankId = formId || 'bank-' + Date.now();
    const existingBank = banks.find(b => b.id === bankId);

    const newBank: QuestionBank = {
      id: bankId,
      teacherId: teacher.id,
      teacherName: teacher.name,
      title: formTitle.trim(),
      subject: formSubject,
      classId: formClassId,
      createdAt: existingBank?.createdAt || new Date().toLocaleDateString('id-ID'),
      questions: existingBank?.questions || []
    };

    try {
      await saveDocument('question_banks', bankId, newBank);
      setSuccessMsg('Bank Soal berhasil disimpan!');
      setTimeout(() => {
        setIsFormOpen(false);
        setFormId(null);
        setFormTitle('');
        setSuccessMsg('');
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menyimpan bank soal ke database.');
    }
  };

  // Delete an entire Bank Soal
  const handleDeleteBank = async (bankId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus seluruh Bank Soal ini beserta semua isinya? Tindakan ini permanen.')) {
      return;
    }
    try {
      setBanks(prev => prev.filter(b => b.id !== bankId));
      if (selectedBank?.id === bankId) {
        setSelectedBank(null);
      }
      await deleteDocument('question_banks', bankId);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus bank soal.');
    }
  };

  // Open editor for creating/editing a Bank Soal metadata
  const openBankForm = (bank?: QuestionBank) => {
    if (bank) {
      setFormId(bank.id);
      setFormTitle(bank.title);
      setFormSubject(bank.subject);
      setFormClassId(bank.classId);
    } else {
      setFormId(null);
      setFormTitle('');
      setFormSubject(teacher.subject || 'Matematika');
      setFormClassId('all');
    }
    setIsFormOpen(true);
  };

  // Open Question creator or editor
  const openQuestionForm = (q?: CbtQuestion) => {
    if (q) {
      setEditingQuestion(q);
      setQuestionText(q.text);
      setQuestionType(q.type);
      setQuestionOptions(q.options || ['A. ', 'B. ', 'C. ', 'D. ']);
      setCorrectAnswers(q.correctAnswers || []);
      setQuestionMediaUrl(q.mediaUrl || '');
      setQuestionFormula(q.formula || '');
      setQuestionWeight(q.weight ?? 10);
    } else {
      setEditingQuestion(null);
      setQuestionText('');
      setQuestionType('pilihan_ganda');
      setQuestionOptions(['A. Pilihan kesatu', 'B. Pilihan kedua', 'C. Pilihan ketiga', 'D. Pilihan keempat']);
      setCorrectAnswers([]);
      setQuestionMediaUrl('');
      setQuestionFormula('');
      setQuestionWeight(10);
    }
    setIsQuestionFormOpen(true);
  };

  // Insert math helper symbol at cursor position or end of question text
  const insertMathSymbol = (symbol: string) => {
    setQuestionText(prev => prev + symbol);
  };

  // Handle saving question inside selected Bank Soal
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedBank) return;
    if (!questionText.trim()) {
      setErrorMsg('Teks pertanyaan soal tidak boleh kosong.');
      return;
    }

    // Validation based on type
    if (questionType === 'pilihan_ganda' && correctAnswers.length === 0) {
      setErrorMsg('Harap tentukan 1 jawaban benar untuk Pilihan Ganda.');
      return;
    }
    if (questionType === 'pilihan_ganda_kompleks' && correctAnswers.length === 0) {
      setErrorMsg('Harap tentukan minimal 1 jawaban benar untuk Pilihan Ganda Kompleks.');
      return;
    }

    const questionId = editingQuestion?.id || 'q-' + Date.now();
    const newQuestion: CbtQuestion = {
      id: questionId,
      type: questionType,
      text: questionText.trim(),
      options: ['pilihan_ganda', 'pilihan_ganda_kompleks'].includes(questionType) ? questionOptions : [],
      correctAnswers: correctAnswers,
      weight: Number(questionWeight) || 1,
      mediaUrl: questionMediaUrl || undefined,
      formula: questionFormula.trim() || undefined
    };

    let updatedQuestions = [...selectedBank.questions];
    if (editingQuestion) {
      // Edit existing
      updatedQuestions = updatedQuestions.map(q => q.id === questionId ? newQuestion : q);
    } else {
      // Add new
      updatedQuestions.push(newQuestion);
    }

    const updatedBank = {
      ...selectedBank,
      questions: updatedQuestions
    };

    try {
      await saveDocument('question_banks', selectedBank.id, updatedBank);
      setSuccessMsg('Pertanyaan berhasil disimpan!');
      setTimeout(() => {
        setIsQuestionFormOpen(false);
        setEditingQuestion(null);
        setSuccessMsg('');
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memperbarui soal di database.');
    }
  };

  // Delete a specific question from the active bank
  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedBank) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus soal ini dari Bank Soal?')) {
      return;
    }

    const updatedQuestions = selectedBank.questions.filter(q => q.id !== questionId);
    const updatedBank = {
      ...selectedBank,
      questions: updatedQuestions
    };

    // Update local state immediately
    setSelectedBank(updatedBank);
    setBanks(prev => prev.map(b => b.id === updatedBank.id ? updatedBank : b));

    try {
      await saveDocument('question_banks', selectedBank.id, updatedBank);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus soal.');
    }
  };

  // Convert uploaded image file to base64 safely with client-side compression (< 100 KB)
  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // LOGIKA PENGHEMATAN KUOTA: Resizing & kompresi di sisi klien agar di bawah 100 KB
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Maksimum resolusi 800px lebar/tinggi untuk optimalisasi tampilan dan ukuran file
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Kompresi kualitas adaptif agar ukuran < 100 KB
            let quality = 0.8;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            let sizeInKb = (dataUrl.length * 0.75) / 1024;
            
            while (sizeInKb > 100 && quality > 0.15) {
              quality -= 0.1;
              dataUrl = canvas.toDataURL('image/jpeg', quality);
              sizeInKb = (dataUrl.length * 0.75) / 1024;
            }
            console.log(`[QUOTA SAVED] Bank Soal Image compressed on client-side: ${sizeInKb.toFixed(1)} KB`);
            setQuestionMediaUrl(dataUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle option correct answers
  const toggleCorrectAnswer = (optVal: string) => {
    if (questionType === 'pilihan_ganda') {
      // Only single correct answer allowed
      setCorrectAnswers([optVal]);
    } else {
      // Multiple correct answers allowed
      if (correctAnswers.includes(optVal)) {
        setCorrectAnswers(correctAnswers.filter(a => a !== optVal));
      } else {
        setCorrectAnswers([...correctAnswers, optVal]);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Stats Ribbon */}
      <div className="bg-white rounded-2xl p-6 border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg">Bank Soal CBT Mandiri</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Buat, kustomisasi, dan integrasikan kumpulan soal mata pelajaran Kurikulum Merdeka Anda untuk diujikan di modul CBT Siswa.
          </p>
        </div>

        {!selectedBank && (
          <button
            onClick={() => openBankForm()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-teal-100 transition-all cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Bank Soal Baru</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      {!selectedBank ? (
        
        /* VIEW 1: DIRECTORY OF QUESTION BANKS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-500">Anda belum memiliki Bank Soal Mata Pelajaran.</p>
              <p className="text-xs max-w-sm mx-auto">Silakan klik "Buat Bank Soal Baru" di atas untuk mulai memuat butir soal mandiri Kurikulum Merdeka Terapan.</p>
            </div>
          ) : (
            banks.map(bank => {
              const matchedClass = classes.find(c => c.id === bank.classId);
              return (
                <div 
                  key={bank.id} 
                  className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md uppercase">
                        {bank.subject}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {bank.createdAt}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">
                      {bank.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span>Kelas:</span>
                      <span className="font-bold text-slate-700">
                        {bank.classId === 'all' ? 'Semua Kelas' : (matchedClass?.name || bank.classId)}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center gap-1">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">
                        {bank.questions?.length || 0} Soal Tersedia
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openBankForm(bank)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Info Bank"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBank(bank.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Bank Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedBank(bank)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                    >
                      Kelola Pertanyaan &rarr;
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      ) : (

        /* VIEW 2: BANK SOAL EDITOR (MANAGING QUESTIONS WITHIN SELECTED BANK) */
        <div className="space-y-6">
          
          {/* Bank Header Navigation */}
          <div className="bg-white rounded-2xl p-5 border shadow-xs flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedBank(null)}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Direktori</span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JUDUL BANK AKTIF</p>
              <p className="text-xs font-black text-slate-800">{selectedBank.title}</p>
            </div>

            <button
              onClick={() => openQuestionForm()}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-teal-100 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Butir Soal</span>
            </button>
          </div>

          {/* List of questions in the active bank */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5 px-1">
              <span>Butir Soal CBT Kurikulum Merdeka</span>
              <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-[10px] font-black">
                {selectedBank.questions?.length || 0} Butir
              </span>
            </h4>

            {selectedBank.questions?.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-medium text-slate-500">Belum ada pertanyaan di Bank Soal ini.</p>
                <p className="text-xs">Klik "Tambah Butir Soal" di kanan atas untuk mulai menginput butir soal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedBank.questions.map((q, idx) => (
                  <div key={q.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4 relative hover:border-slate-200 transition-all">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-400 text-sm">#{idx + 1}</span>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide bg-slate-100 text-slate-600">
                          {q.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide bg-teal-50 text-teal-700 border border-teal-200">
                          ⚡ Bobot: {q.weight ?? 10} Poin
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openQuestionForm(q)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Edit Soal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Hapus Soal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-3">
                      
                      {/* Attached media image */}
                      {q.mediaUrl && (
                        <div className="max-w-xs rounded-xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
                          <img 
                            src={q.mediaUrl} 
                            alt="Elemen pendukung soal" 
                            referrerPolicy="no-referrer"
                            className="max-h-40 object-contain mx-auto" 
                          />
                        </div>
                      )}

                      {/* Math formulas rendering */}
                      {q.formula && (
                        <div className="p-2.5 bg-slate-50 border rounded-lg font-mono text-xs text-indigo-700 flex items-center gap-2">
                          <span className="bg-indigo-100 text-[9px] font-bold text-indigo-800 px-1.5 py-0.5 rounded uppercase font-sans">Formula/Rumus:</span>
                          <span className="font-bold text-sm tracking-wide">{q.formula}</span>
                        </div>
                      )}

                      {/* Question Text */}
                      <div className="text-slate-800 font-semibold text-xs leading-relaxed text-left">
                        <FormattedText content={q.text} />
                      </div>

                      {/* Options / Answers view */}
                      {['pilihan_ganda', 'pilihan_ganda_kompleks'].includes(q.type) && q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctAnswers.includes(opt);
                            return (
                              <div 
                                key={oIdx} 
                                className={`p-2 rounded-xl border text-xs text-left flex items-center justify-between ${
                                  isCorrect 
                                    ? 'bg-emerald-500/5 border-emerald-200 text-emerald-900 font-bold' 
                                    : 'bg-white border-slate-100 text-slate-600'
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Answers for Essay or Campuran */}
                      {!['pilihan_ganda', 'pilihan_ganda_kompleks'].includes(q.type) && q.correctAnswers && q.correctAnswers.length > 0 && (
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs text-left">
                          <span className="font-extrabold text-amber-800 block text-[9px] uppercase tracking-wider mb-1">Kunci Jawaban Referensi / Guideline Uraian:</span>
                          <p className="font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">{q.correctAnswers[0]}</p>
                        </div>
                      )}

                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL 1: CREATE / EDIT QUESTION BANK METADATA */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="bg-teal-700 p-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">{formId ? 'Edit Bank Soal' : 'Buat Bank Soal Baru'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border text-rose-700 text-xs rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 border text-emerald-700 text-xs rounded-xl flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mata Pelajaran</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white font-bold"
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Judul Bank Soal / Judul Bab</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
                    placeholder="Contoh: UH Trigonometri & Bangun Datar Kelas 7"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Kelas</label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    <option value="all">Semua Kelas</option>
                    {classes.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
                >
                  Simpan Bank Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT BUTIR SOAL */}
      {isQuestionFormOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="bg-teal-700 p-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingQuestion ? 'Edit Butir Pertanyaan' : 'Tambah Butir Pertanyaan Baru'}
              </h3>
              <button onClick={() => setIsQuestionFormOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border text-rose-700 text-xs rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 border text-emerald-700 text-xs rounded-xl flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Row 1: Type Selection & Bobot Nilai */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipe Soal Kurikulum Merdeka</label>
                  <select
                    value={questionType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setQuestionType(newType);
                      setCorrectAnswers([]);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="pilihan_ganda">Pilihan Ganda Biasa (Satu Jawaban Benar)</option>
                    <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks (Beberapa Jawaban Benar)</option>
                    <option value="campuran">Isian Singkat / Campuran Menjodohkan</option>
                    <option value="essay">Uraian / Essay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-1">Bobot Nilai Soal</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={questionWeight}
                    onChange={(e) => setQuestionWeight(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs border border-teal-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-teal-50/50 font-bold text-teal-900"
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Mathematical helper templates */}
              <div className="pb-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Klik Simbol Matematika / Rumus untuk Menyisipkan Ke Teks
                </label>
                <div className="flex flex-wrap gap-1 bg-slate-50 p-2 border border-slate-100 rounded-xl overflow-y-auto max-h-12 shadow-inner">
                  {MATH_SYMBOLS.map((sym, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => insertMathSymbol(sym)}
                      className="px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 cursor-pointer"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Question Text */}
              <TextFormattingToolbar
                label="Teks Pertanyaan Soal CBT"
                value={questionText}
                onChange={(val) => setQuestionText(val)}
                rows={4}
                placeholder="Ketik pertanyaan soal Anda di sini (dukungan format Tebal, Miring, Garis Bawah, Rata Kanan-Kiri, Warna Teks, dll)..."
                helpText="Gunakan toolbar formatting di atas untuk menebalkan kata kunci, menambahkan garis bawah, atau meratakan paragraf soal."
              />

              {/* Row 3: Image element upload & Formula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 text-teal-700">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Upload Elemen Pendukung (Foto/Grafik)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold transition-all cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleUploadPhoto}
                      />
                    </label>

                    {questionMediaUrl && (
                      <button
                        type="button"
                        onClick={() => setQuestionMediaUrl('')}
                        className="px-2 py-1 bg-rose-50 text-rose-700 rounded text-[9px] font-bold hover:bg-rose-100"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                  {questionMediaUrl && (
                    <div className="mt-2 max-w-[120px] rounded-lg overflow-hidden border">
                      <img src={questionMediaUrl} alt="Preview" className="max-h-16 object-contain" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 text-indigo-700">
                    <Type className="w-3.5 h-3.5" />
                    <span>Rumus / Formula Matematika Terpisah</span>
                  </label>
                  <input
                    type="text"
                    value={questionFormula}
                    onChange={(e) => setQuestionFormula(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                    placeholder="Contoh: (a + b)² = a² + 2ab + b²"
                  />
                  <p className="text-[8px] text-slate-400 mt-1">
                    *Gunakan kolom rumus untuk memisahkan ekspresi matematis agar disajikan di box formula khusus.
                  </p>
                </div>
              </div>

              {/* Row 4: Options for PG / PG Kompleks */}
              {['pilihan_ganda', 'pilihan_ganda_kompleks'].includes(questionType) && (
                <div className="space-y-2 border-t pt-3">
                  <label className="block text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                    Pilihan Jawaban & Tentukan Kunci Jawaban
                  </label>

                  <div className="space-y-2">
                    {questionOptions.map((opt, oIdx) => {
                      const isCorrect = correctAnswers.includes(opt);
                      return (
                        <div key={oIdx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-150">
                          
                          {/* Checkbox / Radio toggle as correct answer */}
                          <button
                            type="button"
                            onClick={() => toggleCorrectAnswer(opt)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isCorrect 
                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <span className="text-xs font-black text-slate-400">
                            {String.fromCharCode(65 + oIdx)}:
                          </span>

                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...questionOptions];
                              newOpts[oIdx] = e.target.value;
                              setQuestionOptions(newOpts);
                              
                              // Keep correct answers array synced
                              if (isCorrect) {
                                const newCorrects = correctAnswers.map(c => c === opt ? e.target.value : c);
                                setCorrectAnswers(newCorrects);
                              }
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border-0 border-b border-dashed border-slate-200 focus:border-teal-500 outline-none"
                            placeholder={`Ketik opsi jawaban ${String.fromCharCode(65 + oIdx)}...`}
                          />

                          {questionOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuestionOptions(questionOptions.filter((_, idx) => idx !== oIdx));
                                if (isCorrect) {
                                  setCorrectAnswers(correctAnswers.filter(c => c !== opt));
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  {questionOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextChar = String.fromCharCode(65 + questionOptions.length);
                        setQuestionOptions([...questionOptions, `${nextChar}. `]);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Pilihan Opsi</span>
                    </button>
                  )}
                </div>
              )}

              {/* Row 5: Essay / Mixed correct reference answer input */}
              {!['pilihan_ganda', 'pilihan_ganda_kompleks'].includes(questionType) && (
                <div className="space-y-2 border-t pt-3">
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    {questionType === 'campuran' ? 'Kunci Jawaban Singkat' : 'Guideline Penilaian Essay (Kunci Jawaban Referensi)'}
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={correctAnswers[0] || ''}
                    onChange={(e) => setCorrectAnswers([e.target.value])}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                    placeholder={
                      questionType === 'campuran' 
                        ? 'Contoh: 140' 
                        : 'Ketik petunjuk penilaian atau jawaban uraian referensi untuk memudahkan koreksi...'
                    }
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsQuestionFormOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                >
                  Simpan Soal Pertanyaan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
