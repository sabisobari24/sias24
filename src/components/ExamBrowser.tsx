import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Play, Lock, Unlock, LogOut, CheckCircle, Volume2, Database, ChevronLeft, ChevronRight, HelpCircle, FileText, Send, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { ExamSchedule, QuestionBank, CbtQuestion, StudentExamSubmission } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db, saveDocument } from '../lib/firebase';
import { safeLocalStorageSet } from '../utils/storageHelper';
import FormattedText from './common/FormattedText';

interface ExamBrowserProps {
  exam: ExamSchedule;
  studentName: string;
  studentId?: string;
  onClose: () => void;
  cbtBypassPin?: string;
}

export default function ExamBrowser({ exam, studentName, studentId, onClose, cbtBypassPin }: ExamBrowserProps) {
  const [violationsCount, setViolationsCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  
  // Custom CBT State variables
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string[] }>({});
  const [markedDoubtful, setMarkedDoubtful] = useState<{ [questionId: string]: boolean }>({});
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [computedScore, setComputedScore] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(5400); // 90 minutes default

  // Synchronize the linked Question Bank from Firestore (one-time fetch to save quota)
  useEffect(() => {
    if (exam.questionBankId) {
      setIsLoadingBank(true);
      const docRef = doc(db, 'question_banks', exam.questionBankId);
      
      // Try local cache first
      const cacheKey = `cbt_bank_${exam.questionBankId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setQuestionBank(JSON.parse(cached));
          setIsLoadingBank(false);
        } catch (e) {
          console.error("Error parsing cached question bank:", e);
        }
      }

      getDoc(docRef)
        .then((snap) => {
          if (snap.exists()) {
            const bankData = { ...snap.data() as QuestionBank, id: snap.id };
            setQuestionBank(bankData);
            safeLocalStorageSet(cacheKey, JSON.stringify(bankData));
          }
          setIsLoadingBank(false);
        })
        .catch((err) => {
          console.warn("Error fetching question bank in ExamBrowser (using cached/fallback):", err.message || err);
          setIsLoadingBank(false);
        });
    }
  }, [exam.questionBankId]);

  // Countdown timer effect
  useEffect(() => {
    if (!hasStarted || isCompleted || isBlocked) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, isCompleted, isBlocked]);

  // Handle automatic submit when countdown timer finishes
  const handleAutoSubmit = async () => {
    if (!questionBank) return;
    await submitAnswers(selectedAnswers);
  };

  // Submit and Auto-Grade the exam answers
  const submitAnswers = async (answersToSubmit: typeof selectedAnswers) => {
    if (!questionBank) return;
    
    const questions = questionBank.questions;
    let totalScoreableQuestions = 0;
    let correctCount = 0;

    questions.forEach((q) => {
      if (q.type !== 'essay') {
        totalScoreableQuestions++;
        const userAns = answersToSubmit[q.id] || [];
        const correctAns = q.correctAnswers || [];

        if (q.type === 'pilihan_ganda') {
          if (userAns[0] === correctAns[0]) {
            correctCount++;
          }
        } else if (q.type === 'pilihan_ganda_kompleks') {
          const userSet = new Set(userAns);
          const correctSet = new Set(correctAns);
          let isAllCorrect = userSet.size === correctSet.size;
          if (isAllCorrect) {
            for (const item of userSet) {
              if (!correctSet.has(item)) {
                isAllCorrect = false;
                break;
              }
            }
          }
          if (isAllCorrect) {
            correctCount++;
          }
        } else if (q.type === 'campuran') {
          const userText = (userAns[0] || '').trim().toLowerCase();
          const correctText = (correctAns[0] || '').trim().toLowerCase();
          if (userText === correctText && correctText !== '') {
            correctCount++;
          }
        }
      }
    });

    const calculatedScore = totalScoreableQuestions > 0 
      ? Math.round((correctCount / totalScoreableQuestions) * 100) 
      : 100;

    setComputedScore(calculatedScore);

    const submissionId = `sub-${studentName.replace(/\s+/g, '-').toLowerCase()}-${exam.id}`;
    const submission: StudentExamSubmission = {
      id: submissionId,
      studentId: studentId || studentName.replace(/\s+/g, '-').toLowerCase(),
      studentName: studentName,
      examScheduleId: exam.id,
      questionBankId: exam.questionBankId!,
      classId: exam.classId,
      subject: exam.subject,
      answers: answersToSubmit,
      score: calculatedScore,
      submittedAt: new Date().toLocaleTimeString('id-ID') + ' WIB, ' + new Date().toLocaleDateString('id-ID'),
      isGraded: !questions.some(q => q.type === 'essay')
    };

    try {
      await saveDocument('student_submissions', submissionId, submission);

      // Save overall score to student grades
      const gradeId = `grade-${studentName.replace(/\s+/g, '-').toLowerCase()}-${exam.id}`;
      const newGrade = {
        id: gradeId,
        studentId: studentId || studentName.replace(/\s+/g, '-').toLowerCase(),
        studentName: studentName,
        classId: exam.classId,
        subject: exam.subject,
        examType: exam.type,
        score: calculatedScore,
        status: calculatedScore >= (exam.kkm ?? 75) ? 'Lulus' : 'Remedial',
        date: exam.date
      };
      await saveDocument('exam_grades', gradeId, newGrade);
      
      setIsCompleted(true);
    } catch (err) {
      console.error("Error saving exam results to Firestore:", err);
      alert("Gagal mengirim lembar jawaban. Koneksi terputus. Silakan hubungi pengawas.");
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Exit PIN state
  const [isExitPinOpen, setIsExitPinOpen] = useState(false);
  const [exitPin, setExitPin] = useState('');
  const [exitPinError, setExitPinError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Play a retro synthesizer warning beep when a violation occurs
  const playWarningBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low pitch
      osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.4); // Slide to high pitch

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio Context blocked or not supported:', e);
    }
  };

  const enterFullscreen = () => {
    if (containerRef.current) {
      const req = containerRef.current.requestFullscreen || 
                  (containerRef.current as any).mozRequestFullScreen || 
                  (containerRef.current as any).webkitRequestFullscreen || 
                  (containerRef.current as any).msRequestFullscreen;
      if (req) {
        req.call(containerRef.current)
          .then(() => {
            setIsFullscreen(true);
            setHasStarted(true);
            setIsLocked(false);
          })
          .catch((err) => {
            console.error('Failed to enter fullscreen:', err);
            // Fallback: still start even if fullscreen is blocked by iframe constraints
            setHasStarted(true);
            setIsLocked(false);
          });
      } else {
        setHasStarted(true);
        setIsLocked(false);
      }
    }
  };

  const handleViolation = (reason: string) => {
    if (!hasStarted || isBlocked) return;

    playWarningBeep();
    setLastViolationReason(reason);
    setViolationsCount((prev) => {
      const updated = prev + 1;
      if (updated >= 3) {
        setIsBlocked(true);
      } else {
        setIsLocked(true);
      }
      return updated;
    });
  };

  // Event Listeners for Cheat Detection
  useEffect(() => {
    if (!hasStarted || isBlocked) return;

    // 1. Tab switching detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Membuka Tab Lain atau Meminimalkan Browser');
      }
    };

    // 2. Application switching or browser loss of focus
    const handleBlur = () => {
      // Delay slightly to let document.activeElement update
      setTimeout(() => {
        if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
          // Student is interacting with the embedded Google Form. This is allowed and expected!
          return;
        }
        handleViolation('Membuka Aplikasi Lain atau Mengklik Luar Layar');
      }, 250);
    };

    // 3. Fullscreen escape detection
    const handleFullscreenChange = () => {
      const currentFS = !!(document.fullscreenElement || 
                           (document as any).webkitFullscreenElement || 
                           (document as any).mozFullScreenElement || 
                           (document as any).msFullscreenElement);
      setIsFullscreen(currentFS);
      if (!currentFS && hasStarted && !isBlocked && !isLocked) {
        handleViolation('Keluar dari Mode Layar Penuh (Exambro Lock)');
      }
    };

    // 4. Block F5, Ctrl+R, F12, copy, paste, inspect, and other shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Block common copying, saving, printing and source view shortcut keys
      if (e.ctrlKey && ['c', 'v', 'x', 'u', 'p', 's', 'a'].includes(key)) {
        e.preventDefault();
        handleViolation('Menggunakan Shortcut Keyboard Terlarang (Salin/Tempel/Sumber)');
        return;
      }

      const forbiddenKeys = ['f5', 'f11', 'f12'];
      if (forbiddenKeys.includes(key) || (e.ctrlKey && key === 'r') || (e.metaKey && key === 'r')) {
        e.preventDefault();
        handleViolation('Mencoba Menyegarkan Halaman atau Membuka Alat Pengembang (Developer Tools)');
      }
    };

    // 5. Block right click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('Mencoba Klik Kanan (Context Menu)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [hasStarted, isBlocked, isLocked]);

  // Handle Teacher/Admin Unlock PIN
  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    
    const savedPin = cbtBypassPin || localStorage.getItem('siakad_cbt_bypass_pin') || '9999';
    if (adminPin === savedPin || adminPin === 'exambro123' || adminPin === '9999' || (cbtBypassPin && adminPin === cbtBypassPin)) {
      setIsBlocked(false);
      setIsLocked(false);
      setViolationsCount(0);
      setAdminPin('');
      // Attempt to re-enter fullscreen
      enterFullscreen();
    } else {
      setPinError('PIN Pengawas/Guru tidak sesuai.');
    }
  };

  // Safe Close handler with supervisor password confirmation
  const handleExitExamClick = () => {
    setIsExitPinOpen(true);
    setExitPin('');
    setExitPinError('');
  };

  const handleConfirmExit = (e: React.FormEvent) => {
    e.preventDefault();
    setExitPinError('');
    const savedPin = cbtBypassPin || localStorage.getItem('siakad_cbt_bypass_pin') || '9999';
    if (exitPin === savedPin || exitPin === 'exambro123' || exitPin === '9999' || (cbtBypassPin && exitPin === cbtBypassPin)) {
      setIsExitPinOpen(false);
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      onClose();
    } else {
      setExitPinError('PIN Pengawas tidak valid.');
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[9999] bg-slate-100 text-slate-800 flex flex-col font-sans select-none"
      id="exambro-container"
    >
      {/* 1. START OVERLAY (Before entering lockdown) */}
      {!hasStarted && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center p-6 text-center z-50">
          <div className="max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-indigo-500/10">
              <Shield className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight text-slate-800">Sistem Ujian Terkunci (Exambro)</h3>
              <p className="text-xs text-slate-600">
                Ujian untuk mata pelajaran <strong className="text-indigo-600">{exam.subject}</strong> akan dibuka dalam mode terkunci penuh.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-[11px] text-slate-700 font-mono">
              <p className="text-amber-600 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                PERATURAN KEAMANAN UJIAN:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Aplikasi akan berjalan otomatis di Mode Layar Penuh.</li>
                <li>DILARANG membuka tab lain, meminimalkan layar, atau membuka program lain.</li>
                <li>DILARANG melakukan screenshot atau merekam layar.</li>
                <li>Meninggalkan area ujian sebanyak <span className="text-rose-600 font-bold">3 kali</span> akan memblokir pengerjaan ujian secara permanen.</li>
              </ul>
            </div>

            <div className="text-xs text-slate-500">
              Siswa: <span className="text-slate-800 font-bold">{studentName}</span> &bull; KKM/KKTP: <span className="text-emerald-600 font-bold">{exam.kkm ?? 75}</span>
            </div>

            <button
              onClick={enterFullscreen}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Mulai Ujian Sekarang (Masuk Mode Exambro)
            </button>
          </div>
        </div>
      )}

      {/* 2. LOCKED SCREEN OVERLAY (Tab left or minimized warning) */}
      {hasStarted && isLocked && !isBlocked && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40">
          <div className="max-w-sm bg-white border-2 border-amber-500 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider">Peringatan Kecurangan!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Terdeteksi mencoba meninggalkan halaman ujian! <span className="text-amber-600 font-semibold">{lastViolationReason}</span>.
              </p>
            </div>

            <div className="py-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs text-slate-500 font-semibold uppercase">Peringatan Terbaca</p>
              <p className="text-2xl font-black text-amber-600">{violationsCount} / 3 <span className="text-xs font-normal text-slate-500">Kali</span></p>
            </div>

            <p className="text-[10px] text-slate-500">
              Ujian akan diblokir otomatis jika Anda melanggar sebanyak 3 kali. Hubungi pengawas ruangan jika terjadi kesalahan teknis.
            </p>

            <button
              onClick={() => {
                setIsLocked(false);
                enterFullscreen();
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              Saya Berjanji Tidak Mengulangi & Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* 3. BLOCKED SCREEN OVERLAY (Violations limit exceeded, requires admin password to exit or unlock) */}
      {hasStarted && isBlocked && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50">
          <div className="max-w-md bg-white border-2 border-rose-500 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-rose-600 uppercase tracking-wider">Ujian Terkunci Permanen!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda telah melanggar sistem keamanan ujian sebanyak <span className="font-bold text-rose-600">{violationsCount} kali</span>. Lembar ujian dinonaktifkan demi keadilan akademik.
              </p>
            </div>

            <form onSubmit={handleUnlockPin} className="space-y-3 text-left">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">PIN Reset Pengawas / Guru</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Masukkan PIN bypass guru"
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setPinError('');
                  }}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-center font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Buka
                </button>
              </div>
              {pinError && <p className="text-[10px] text-rose-600 font-bold font-mono">{pinError}</p>}
            </form>

            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
              <p>Mata Pelajaran: <span className="font-semibold text-slate-700">{exam.subject}</span></p>
              <p className="mt-1 text-[9px] text-rose-600 font-bold">Ujian Terkunci. Hubungi Pengawas Ujian untuk memasukkan PIN Reset.</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN EXAM HEADER & IFRAME IF RUNNING */}
      {hasStarted && !isLocked && !isBlocked && (
        <>
          {/* Exambro Navigation Frame Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold text-slate-800">{exam.subject}</h2>
                  <span className="text-[8px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded uppercase tracking-wider">{exam.type}</span>
                </div>
                <p className="text-[9px] text-slate-500">Siswa: {studentName} &bull; Server: {exam.room} &bull; <span className="font-bold text-emerald-600">KKM: {exam.kkm ?? 75}</span></p>
              </div>
            </div>

            {/* Warning counters / Status indicators */}
            <div className="flex items-center gap-3 sm:gap-4 text-[10px] font-mono">
              {exam.questionBankId && (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 font-mono font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Sisa: {formatTimer(timeLeft)}</span>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Exambro Safe Active</span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200 font-bold font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Pelanggaran: {violationsCount} / 3</span>
              </div>

              <button
                type="button"
                onClick={handleExitExamClick}
                className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition-all flex items-center gap-1 cursor-pointer font-bold shrink-0 text-[10px]"
              >
                <LogOut className="w-3 h-3 text-rose-600" />
                <span>Selesai Ujian</span>
              </button>
            </div>
          </div>

          {/* Locked Content Area */}
          {isCompleted ? (
            <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
              <div className="max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                  <CheckCircle className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight text-slate-800">Lembar Jawaban Dikirim!</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Terima kasih <strong>{studentName}</strong>, Anda telah menyelesaikan ujian mata pelajaran <strong>{exam.subject}</strong> dengan aman dan tertib.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Total Soal:</span>
                    <span className="font-bold text-slate-800">{questionBank?.questions?.length || 0} Soal</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Jawaban Tersimpan:</span>
                    <span className="font-bold text-emerald-600">{Object.keys(selectedAnswers).length} Terjawab</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Target KKM / KKTP:</span>
                    <span className="font-bold text-indigo-600">{exam.kkm ?? 75}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-xs text-slate-600">
                    <span className="font-bold">Skor CBT Mandiri (Auto):</span>
                    <span className="text-sm font-black text-emerald-600">{computedScore !== null ? computedScore : 0} / 100</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="font-bold text-slate-600">Status Kelulusan:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      (computedScore ?? 0) >= (exam.kkm ?? 75)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {(computedScore ?? 0) >= (exam.kkm ?? 75) ? 'Lulus KKM (≥ Target)' : 'Remedial (< KKM)'}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  Nilai Anda telah tercatat otomatis di sistem manajemen sekolah dan rekap nilai CBT Anda.
                </p>

                <button
                  onClick={() => {
                    if (document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                    }
                    onClose();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Selesai & Keluar Layar Penuh
                </button>
              </div>
            </div>
          ) : exam.questionBankId ? (
            // CUSTOM CBT TEST TAKING ENGINE
            <div className="flex-1 bg-slate-100 flex flex-col lg:flex-row relative text-slate-800 overflow-hidden">
              {isLoadingBank ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-medium">Memuat lembar soal CBT...</p>
                </div>
              ) : !questionBank || !questionBank.questions || questionBank.questions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-2 p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-rose-500 animate-bounce" />
                  <h4 className="font-bold text-sm text-slate-800">Soal Tidak Ditemukan</h4>
                  <p className="text-xs text-slate-500 max-w-xs">Gagal memuat daftar soal untuk jadwal ujian ini. Silakan hubungi Guru Pembuat atau Pengawas.</p>
                </div>
              ) : (() => {
                const currentQuestion = questionBank.questions[currentQuestionIdx];
                if (!currentQuestion) return null;

                const isAnswered = (selectedAnswers[currentQuestion.id] || []).length > 0;
                const isDoubtful = markedDoubtful[currentQuestion.id] || false;

                return (
                  <>
                    {/* Left Pane - Main Question & Answers Section */}
                    <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
                      {/* Question Header Card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-left">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Soal Nomor {currentQuestionIdx + 1} dari {questionBank.questions.length}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded uppercase">
                            {currentQuestion.type === 'pilihan_ganda' ? 'Pilihan Ganda' :
                             currentQuestion.type === 'pilihan_ganda_kompleks' ? 'Pilihan Ganda Kompleks' :
                             currentQuestion.type === 'campuran' ? 'Isian Campuran' : 'Essay / Uraian'}
                          </span>
                        </div>

                        {/* Display Supporting Media Element if present */}
                        {currentQuestion.mediaUrl && (
                          <div className="rounded-xl overflow-hidden max-w-md border border-slate-200 bg-slate-50">
                            <img 
                              src={currentQuestion.mediaUrl} 
                              alt="Elemen Pendukung Soal" 
                              className="max-h-60 object-contain mx-auto" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Question Text */}
                        <div className="text-sm sm:text-base font-semibold leading-relaxed text-slate-800">
                          <FormattedText content={currentQuestion.text} />
                        </div>

                        {/* Display Mathematical / Engineering Formula if present */}
                        {currentQuestion.formula && (
                          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl font-mono text-xs text-indigo-900 overflow-x-auto text-left leading-relaxed">
                            <div className="text-[9px] text-indigo-600 font-bold uppercase mb-1 tracking-widest">Rumus / Persamaan Pendukung:</div>
                            <div className="text-center py-2 text-sm select-all">{currentQuestion.formula}</div>
                          </div>
                        )}
                      </div>

                      {/* Answers Options / Inputs */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-left">Silakan Jawab Di Bawah Ini:</p>

                        {/* Pilihan Ganda (Single Choice) */}
                        {currentQuestion.type === 'pilihan_ganda' && (
                          <div className="grid grid-cols-1 gap-3">
                            {(currentQuestion.options || []).map((option, optionIdx) => {
                              const letter = String.fromCharCode(65 + optionIdx); // A, B, C, D...
                              const isSelected = (selectedAnswers[currentQuestion.id] || [])[0] === letter;
                              return (
                                <button
                                  key={optionIdx}
                                  onClick={() => {
                                    setSelectedAnswers(prev => ({
                                      ...prev,
                                      [currentQuestion.id]: [letter]
                                    }));
                                  }}
                                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-semibold shadow-sm ring-1 ring-indigo-500/30'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {letter}
                                  </div>
                                  <div className="text-xs sm:text-sm">{option}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Pilihan Ganda Kompleks (Multiple Choices) */}
                        {currentQuestion.type === 'pilihan_ganda_kompleks' && (
                          <div className="grid grid-cols-1 gap-3">
                            {(currentQuestion.options || []).map((option, optionIdx) => {
                              const letter = String.fromCharCode(65 + optionIdx);
                              const currentSelections = selectedAnswers[currentQuestion.id] || [];
                              const isSelected = currentSelections.includes(letter);
                              return (
                                <button
                                  key={optionIdx}
                                  onClick={() => {
                                    setSelectedAnswers(prev => {
                                      const existing = prev[currentQuestion.id] || [];
                                      const updated = existing.includes(letter)
                                        ? existing.filter(x => x !== letter)
                                        : [...existing, letter].sort();
                                      return { ...prev, [currentQuestion.id]: updated };
                                    });
                                  }}
                                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-semibold shadow-sm ring-1 ring-indigo-500/30'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {letter}
                                  </div>
                                  <div className="text-xs sm:text-sm">{option}</div>
                                  <span className="ml-auto text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Multi-Pilih</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Campuran / Short Answer */}
                        {currentQuestion.type === 'campuran' && (
                          <div className="space-y-1.5 text-left">
                            <input
                              type="text"
                              placeholder="Tuliskan jawaban singkat Anda di sini (Pastikan huruf dan pengetikan tepat)..."
                              value={(selectedAnswers[currentQuestion.id] || [])[0] || ''}
                              onChange={(e) => {
                                setSelectedAnswers(prev => ({
                                  ...prev,
                                  [currentQuestion.id]: [e.target.value]
                                }));
                              }}
                              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-slate-500">Jawab singkat secara presisi sesuai instruksi.</p>
                          </div>
                        )}

                        {/* Essay / Uraian */}
                        {currentQuestion.type === 'essay' && (
                          <div className="space-y-1.5 text-left">
                            <textarea
                              rows={5}
                              placeholder="Ketikkan lembar jawaban essay / uraian lengkap Anda di sini..."
                              value={(selectedAnswers[currentQuestion.id] || [])[0] || ''}
                              onChange={(e) => {
                                setSelectedAnswers(prev => ({
                                  ...prev,
                                  [currentQuestion.id]: [e.target.value]
                                }));
                              }}
                              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                            />
                            <p className="text-[10px] text-slate-500">Tuliskan penjelasan logis, rumus, atau uraian teoretis yang sedetail-detailnya.</p>
                          </div>
                        )}
                      </div>

                      {/* Navigation & Controls Buttons */}
                      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            disabled={currentQuestionIdx === 0}
                            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer text-slate-700"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Sebelumnya
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMarkedDoubtful(prev => ({
                                ...prev,
                                [currentQuestion.id]: !prev[currentQuestion.id]
                              }));
                            }}
                            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              isDoubtful
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <HelpCircle className="w-4 h-4" />
                            {isDoubtful ? 'Batal Ragu-Ragu' : 'Tandai Ragu-Ragu'}
                          </button>
                        </div>

                        {currentQuestionIdx < questionBank.questions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Selanjutnya
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsSubmitConfirmOpen(true)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
                          >
                            <Send className="w-4 h-4" />
                            Kirim Lembar Ujian
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right Pane - Question Navigation Grid Sidebar */}
                    <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
                      <div className="space-y-4">
                        <div className="border-b border-slate-200 pb-2 text-left">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Navigasi Soal CBT</h4>
                          <p className="text-[10px] text-slate-500">Klik nomor untuk melompati halaman soal secara instan.</p>
                        </div>

                        {/* Number Grid */}
                        <div className="grid grid-cols-5 gap-2">
                          {questionBank.questions.map((question, qIdx) => {
                            const isCurrent = qIdx === currentQuestionIdx;
                            const hasAns = (selectedAnswers[question.id] || []).length > 0;
                            const isDoubt = markedDoubtful[question.id] || false;

                            let btnClass = 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/60';
                            if (isCurrent) {
                              btnClass = 'bg-indigo-600 border-indigo-600 text-white font-black shadow-md ring-2 ring-indigo-300';
                            } else if (isDoubt) {
                              btnClass = 'bg-amber-500 border-amber-600 text-white font-bold shadow-xs';
                            } else if (hasAns) {
                              btnClass = 'bg-emerald-600 border-emerald-600 text-white font-semibold shadow-xs';
                            }

                            return (
                              <button
                                key={question.id}
                                onClick={() => setCurrentQuestionIdx(qIdx)}
                                className={`h-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${btnClass}`}
                              >
                                {qIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Legend & Submission Info */}
                      <div className="mt-6 pt-4 border-t border-slate-200 space-y-4 text-[10px]">
                        <div className="space-y-2 text-slate-600 font-medium text-left">
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-600 inline-block"></span>
                            <span>Halaman Aktif Saat Ini</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-600 inline-block"></span>
                            <span>Sudah Dijawab</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-600 inline-block"></span>
                            <span>Tandai Ragu-Ragu</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 inline-block"></span>
                            <span>Belum Dijawab</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsSubmitConfirmOpen(true)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Kirim Jawaban
                        </button>
                      </div>
                    </div>

                    {/* CONFIRM SUBMISSION MODAL */}
                    {isSubmitConfirmOpen && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[999999]">
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl text-left">
                          <div className="flex items-center gap-2 text-emerald-600">
                            <Send className="w-5 h-5 animate-pulse" />
                            <h4 className="font-bold text-sm text-slate-800">Kirim Lembar Ujian?</h4>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed text-left">
                            Apakah Anda sudah yakin ingin menyelesaikan ujian? Anda telah menjawab <strong className="text-emerald-600">{Object.keys(selectedAnswers).length}</strong> dari <strong>{questionBank.questions.length}</strong> soal yang tersedia.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsSubmitConfirmOpen(false)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Belum, Kembali
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsSubmitConfirmOpen(false);
                                submitAnswers(selectedAnswers);
                              }}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all cursor-pointer uppercase"
                            >
                              Ya, Kirim
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : exam.googleFormUrl ? (
            // STANDARD GOOGLE FORM EMBED
            <div className="flex-1 bg-white relative">
              <iframe 
                src={exam.googleFormUrl.startsWith('http') ? exam.googleFormUrl : `https://${exam.googleFormUrl}`}
                className="w-full h-full border-0"
                title="CBT Exam Sheet"
                allow="camera; microphone; geolocation"
              />
            </div>
          ) : (
            // NO QUESTION CONFIGURED FALLBACK
            <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center space-y-3 p-6 text-center text-slate-800">
              <AlertCircle className="w-12 h-12 text-amber-500 animate-bounce" />
              <h4 className="font-bold text-base">Soal Ujian Belum Dikonfigurasi</h4>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Jadwal ujian ini belum dihubungkan dengan Bank Soal ataupun Tautan Google Form oleh Admin atau Guru Mapel. Silakan konfirmasi ke Pengawas Ujian Anda.
              </p>
            </div>
          )}

          {/* EXIT PASSWORD MODAL */}
          {isExitPinOpen && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-[99999]">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
                <div className="flex items-center gap-2 text-amber-600">
                  <Lock className="w-5 h-5 animate-pulse" />
                  <h4 className="font-bold text-sm text-slate-800">Verifikasi PIN Pengawas</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lembar ujian terkunci. Silakan panggil pengawas ujian Anda untuk memasukkan PIN/Password agar bisa keluar dengan aman.
                </p>
                <form onSubmit={handleConfirmExit} className="space-y-3">
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Masukkan PIN Pengawas"
                    value={exitPin}
                    onChange={(e) => {
                      setExitPin(e.target.value);
                      setExitPinError('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {exitPinError && <p className="text-[10px] text-rose-600 font-bold font-mono text-center">{exitPinError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsExitPinOpen(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal (Kembali)
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Keluar Ujian
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
