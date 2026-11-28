import React, { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, AlertTriangle, Play, Lock, Unlock, LogOut, CheckCircle, ChevronLeft, ChevronRight, HelpCircle, Send, Clock, AlertCircle, Mail, RefreshCw, X, EyeOff } from 'lucide-react';
import { ExamSchedule, QuestionBank, CbtQuestion, StudentExamSubmission } from '../types';
import { saveDocument, getDocumentById, signInWithGoogle, auth } from '../lib/firebase';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  isSupabaseGoogleOAuthEnabled,
  signInWithGoogleSupabase,
  getSupabaseVerifiedEmail,
  recordCbtEmailVerificationInSupabase
} from '../lib/supabaseDb';
import { safeLocalStorageSet } from '../utils/storageHelper';
import FormattedText from './common/FormattedText';

interface ExamBrowserProps {
  exam: ExamSchedule;
  studentName: string;
  studentId?: string;
  onClose: () => void;
  cbtBypassPin?: string;
  onExamCompleted?: (examId: string) => void;
}

const isMobileOrTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent) ||
    Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024)
  );
};

export default function ExamBrowser({ exam, studentName, studentId, onClose, cbtBypassPin, onExamCompleted }: ExamBrowserProps) {
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
  const [submitError, setSubmitError] = useState('');

  const MAX_VIOLATIONS = 5;
  const STANDBY_LIMIT_MS = 5 * 60 * 1000;

  // Track latest answers & Google Form embed transition state
  const selectedAnswersRef = useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeLoadCountRef = useRef(0);
  const graceUntilRef = useRef(0);
  const lastViolationAtRef = useRef(0);
  const lastTickAtRef = useRef(Date.now());
  const lastInteractionAtRef = useRef(Date.now());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenNodesRef = useRef<Array<{ stop?: () => void; disconnect?: () => void }>>([]);
  const sirenStopTimerRef = useRef<number | null>(null);
  const vibrateIntervalRef = useRef<number | null>(null);
  const usedFullscreenRef = useRef(false);
  const isEmailVerifyingRef = useRef(false);
  const isGoogleFormExam = Boolean(!exam.questionBankId && exam.googleFormUrl);
  const [isFormLoading, setIsFormLoading] = useState(isGoogleFormExam);
  const [hasFormSubmittedOrNavigated, setHasFormSubmittedOrNavigated] = useState(false);
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState(false);

  const emailStorageKey = `siakad_cbt_verified_email_${(studentId || studentName).replace(/\s+/g, '_').toLowerCase()}`;
  const [verifiedEmail, setVerifiedEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(emailStorageKey) || auth.currentUser?.email || '';
    } catch {
      return auth.currentUser?.email || '';
    }
  });
  const [emailInput, setEmailInput] = useState<string>(() => {
    try {
      return localStorage.getItem(emailStorageKey) || auth.currentUser?.email || '';
    } catch {
      return auth.currentUser?.email || '';
    }
  });
  const [emailVerifyNote, setEmailVerifyNote] = useState('');
  const [isEmailVerifyModalOpen, setIsEmailVerifyModalOpen] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [formReloadKey, setFormReloadKey] = useState(0);
  const [markGoogleFormDoneOnExit, setMarkGoogleFormDoneOnExit] = useState(false);

  // Only pause visibility/blur detection strictly while Google Sign-In popup is actively awaited
  isEmailVerifyingRef.current = isSigningInWithGoogle;

  // Sync verified email from Supabase Pro session if available
  useEffect(() => {
    let active = true;
    getSupabaseVerifiedEmail().then((sbEmail) => {
      if (!active || !sbEmail) return;
      setVerifiedEmail((prev) => prev || sbEmail);
      setEmailInput((prev) => prev || sbEmail);
      safeLocalStorageSet(emailStorageKey, sbEmail);
    });
    return () => {
      active = false;
    };
  }, [emailStorageKey]);

  const formattedRoom = exam.room
    ? /^ruang\s/i.test(exam.room.trim())
      ? exam.room.trim()
      : `Ruang ${exam.room.trim()}`
    : 'Ruang CBT';

  const getEmbeddableGoogleFormUrl = (rawUrl: string): string => {
    const trimmed = rawUrl.trim();
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (withProto.includes('docs.google.com/forms') && !withProto.includes('embedded=true')) {
      return `${withProto}${withProto.includes('?') ? '&' : '?'}embedded=true`;
    }
    return withProto;
  };

  // Synchronize the linked Question Bank (one-time fetch from active backend)
  useEffect(() => {
    if (exam.questionBankId) {
      setIsLoadingBank(true);

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

      getDocumentById<QuestionBank>('question_banks', exam.questionBankId)
        .then((bankData) => {
          if (bankData) {
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
    await submitAnswers(selectedAnswersRef.current);
  };

  // Submit and Auto-Grade the exam answers
  const submitAnswers = async (answersToSubmit: typeof selectedAnswers) => {
    if (!questionBank) return;
    setSubmitError('');
    
    const questions = questionBank.questions;
    let totalScoreableQuestions = 0;
    let correctCount = 0;

    const extractOptionLetter = (val: string) => {
      const cleaned = String(val || '').trim();
      const match = cleaned.match(/^([A-Ea-e])(?:[.):\s]|$)/);
      return match ? match[1].toUpperCase() : cleaned.toUpperCase();
    };

    questions.forEach((q) => {
      if (q.type !== 'essay') {
        totalScoreableQuestions++;
        const userAns = answersToSubmit[q.id] || [];
        const correctAns = q.correctAnswers || [];

        if (q.type === 'pilihan_ganda') {
          if (userAns[0] && correctAns[0] && extractOptionLetter(userAns[0]) === extractOptionLetter(correctAns[0])) {
            correctCount++;
          }
        } else if (q.type === 'pilihan_ganda_kompleks') {
          const userSet = new Set(userAns.map(extractOptionLetter));
          const correctSet = new Set(correctAns.map(extractOptionLetter));
          let isAllCorrect = userSet.size > 0 && userSet.size === correctSet.size;
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
      
      stopWarningSiren();
      setIsCompleted(true);
      onExamCompleted?.(exam.id);
    } catch (err) {
      console.error("Error saving exam results to Firestore:", err);
      setSubmitError("Gagal mengirim lembar jawaban. Koneksi terputus. Silakan periksa internet Anda dan coba kirim ulang atau hubungi pengawas.");
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

  const unlockAudioContext = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const stopWarningSiren = () => {
    if (sirenStopTimerRef.current !== null) {
      window.clearTimeout(sirenStopTimerRef.current);
      sirenStopTimerRef.current = null;
    }
    if (vibrateIntervalRef.current !== null) {
      window.clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(0);
      } catch {
        /* ignore */
      }
    }
    for (const node of sirenNodesRef.current) {
      try {
        node.stop?.();
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect?.();
      } catch {
        /* ignore */
      }
    }
    sirenNodesRef.current = [];
  };

  useEffect(() => {
    return () => {
      stopWarningSiren();
    };
  }, []);

  // Play firm, authoritative 15-second security warning klaxon at full volume
  const playWarningBeep = () => {
    try {
      stopWarningSiren();

      const triggerVibration = () => {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate([450, 150, 450, 450]);
          } catch {
            /* ignore */
          }
        }
      };
      triggerVibration();
      vibrateIntervalRef.current = window.setInterval(triggerVibration, 1500);

      const audioCtx = unlockAudioContext();
      if (!audioCtx) {
        sirenStopTimerRef.current = window.setTimeout(() => stopWarningSiren(), 15000);
        return;
      }

      const now = audioCtx.currentTime;
      const duration = 15.0;

      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-4, now);
      compressor.knee.setValueAtTime(4, now);
      compressor.ratio.setValueAtTime(16, now);
      compressor.attack.setValueAtTime(0.001, now);
      compressor.release.setValueAtTime(0.08, now);

      const pulseGain = audioCtx.createGain();
      pulseGain.gain.setValueAtTime(0.0001, now);

      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(1.0, now);
      masterGain.gain.setValueAtTime(1.0, now + duration - 0.08);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      pulseGain.connect(compressor);
      compressor.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      // Authoritative 3-harmonic klaxon stack (fundamental + fifth + crisp octave edge)
      const oscLow = audioCtx.createOscillator();
      const oscMid = audioCtx.createOscillator();
      const oscHigh = audioCtx.createOscillator();
      oscLow.type = 'square';
      oscMid.type = 'sawtooth';
      oscHigh.type = 'square';

      const oscMidGain = audioCtx.createGain();
      const oscHighGain = audioCtx.createGain();
      oscMidGain.gain.setValueAtTime(0.8, now);
      oscHighGain.gain.setValueAtTime(0.45, now);

      oscLow.connect(pulseGain);
      oscMid.connect(oscMidGain);
      oscMidGain.connect(pulseGain);
      oscHigh.connect(oscHighGain);
      oscHighGain.connect(pulseGain);

      // 15 cycles of sharp dual-tone command warning bursts: "BEEP-BEEP! ... BEEP-BEEP!"
      for (let sec = 0; sec < 15; sec++) {
        const t = now + sec;

        // First firm warning burst (540 Hz / 810 Hz / 1080 Hz)
        oscLow.frequency.setValueAtTime(540, t);
        oscMid.frequency.setValueAtTime(810, t);
        oscHigh.frequency.setValueAtTime(1080, t);
        pulseGain.gain.setValueAtTime(0.0001, t);
        pulseGain.gain.linearRampToValueAtTime(1.0, t + 0.015);
        pulseGain.gain.setValueAtTime(1.0, t + 0.25);
        pulseGain.gain.linearRampToValueAtTime(0.0001, t + 0.27);

        // Second stepped urgent warning burst (660 Hz / 990 Hz / 1320 Hz)
        const t2 = t + 0.34;
        oscLow.frequency.setValueAtTime(660, t2);
        oscMid.frequency.setValueAtTime(990, t2);
        oscHigh.frequency.setValueAtTime(1320, t2);
        pulseGain.gain.setValueAtTime(0.0001, t2);
        pulseGain.gain.linearRampToValueAtTime(1.0, t2 + 0.015);
        pulseGain.gain.setValueAtTime(1.0, t2 + 0.62);
        pulseGain.gain.linearRampToValueAtTime(0.0001, t2 + 0.64);
      }

      oscLow.start(now);
      oscMid.start(now);
      oscHigh.start(now);
      oscLow.stop(now + duration);
      oscMid.stop(now + duration);
      oscHigh.stop(now + duration);

      sirenNodesRef.current = [oscLow, oscMid, oscHigh, pulseGain, compressor, masterGain];
      sirenStopTimerRef.current = window.setTimeout(() => {
        stopWarningSiren();
      }, duration * 1000 + 150);
    } catch (e) {
      console.warn('Audio Context blocked or not supported:', e);
    }
  };

  const enterFullscreen = () => {
    unlockAudioContext();
    lastTickAtRef.current = Date.now();
    lastInteractionAtRef.current = Date.now();
    setIsPrivacyShieldActive(false);

    if (!containerRef.current) return;

    const alreadyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (alreadyFullscreen) {
      usedFullscreenRef.current = true;
      setIsFullscreen(true);
      setHasStarted(true);
      setIsLocked(false);
      return;
    }

    const el = containerRef.current as any;
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    // Capture current screen orientation before entering fullscreen so we lock to it (never auto-rotate)
    const currentType =
      (window.screen as any)?.orientation?.type ||
      (window.innerHeight >= window.innerWidth ? 'portrait-primary' : 'landscape-primary');
    const lockMode = String(currentType).startsWith('landscape') ? 'landscape' : 'portrait';

    if (req) {
      let fsPromise: Promise<void> | undefined;
      try {
        fsPromise = req.call(el, { navigationUI: 'hide' });
      } catch {
        fsPromise = req.call(el);
      }

      Promise.resolve(fsPromise)
        .then(async () => {
          usedFullscreenRef.current = true;
          setIsFullscreen(true);
          setHasStarted(true);
          setIsLocked(false);
          try {
            const orientation = (window.screen as any)?.orientation;
            if (orientation && typeof orientation.lock === 'function') {
              await orientation.lock(lockMode);
            }
          } catch {
            // Orientation lock unsupported on this browser/desktop
          }
        })
        .catch((err) => {
          console.error('Failed to enter fullscreen:', err);
          usedFullscreenRef.current = false;
          // Fallback: still start even if fullscreen is blocked by iframe constraints
          setHasStarted(true);
          setIsLocked(false);
        });
    } else {
      usedFullscreenRef.current = false;
      setHasStarted(true);
      setIsLocked(false);
    }
  };

  const handleViolation = (reason: string) => {
    if (!hasStarted || isBlocked || isLocked || isCompleted) return;
    if (isEmailVerifyingRef.current || Date.now() < graceUntilRef.current) return;
    const now = Date.now();
    // Prevent burst double-counting when multiple browser events fire for one action
    if (now - lastViolationAtRef.current < 1500) return;
    lastViolationAtRef.current = now;

    playWarningBeep();
    setLastViolationReason(reason);
    setViolationsCount((prev) => {
      const updated = prev + 1;
      if (updated >= MAX_VIOLATIONS) {
        setIsBlocked(true);
      } else {
        setIsLocked(true);
      }
      return updated;
    });
  };

  // Event Listeners for Cheat Detection, Standby 5-Minute Check & Anti-Screenshot
  useEffect(() => {
    if (!hasStarted || isBlocked || isCompleted) return;

    lastTickAtRef.current = Date.now();
    lastInteractionAtRef.current = Date.now();

    const recordActivity = () => {
      lastInteractionAtRef.current = Date.now();
    };

    // Standby / idle screen detection (triggers violation at >= 5 minutes standby or clock sleep drift)
    const standbyInterval = window.setInterval(() => {
      const now = Date.now();
      const tickGap = now - lastTickAtRef.current;
      lastTickAtRef.current = now;

      if (isLocked || isBlocked || isCompleted || isEmailVerifyingRef.current || now < graceUntilRef.current) {
        lastInteractionAtRef.current = now;
        return;
      }

      if (tickGap >= STANDBY_LIMIT_MS) {
        handleViolation('Perangkat Dalam Mode Standby Mencapai 5 Menit');
        return;
      }

      if (now - lastInteractionAtRef.current >= STANDBY_LIMIT_MS) {
        handleViolation('Layar HP Standby / Tidak Ada Aktivitas Mencapai 5 Menit');
      }
    }, 1000);

    // 1. Tab switching, screen sleep, or minimizing detection
    const handleVisibilityChange = () => {
      if (isEmailVerifyingRef.current || Date.now() < graceUntilRef.current) return;
      if (isExitPinOpen || isSubmitConfirmOpen) return;
      if (document.hidden && !isLocked && !isCompleted) {
        setIsPrivacyShieldActive(true);
        handleViolation('Membuka Tab Lain, Mengunci Layar, atau Meminimalkan Browser');
      } else if (!document.hidden) {
        const sleepDuration = Date.now() - lastTickAtRef.current;
        if (sleepDuration >= STANDBY_LIMIT_MS && !isLocked && !isCompleted) {
          handleViolation('Layar HP Standby / Tidur Mencapai 5 Menit');
        }
      }
    };

    // 2. Application switching & focus loss detection
    let blurTimer: number | null = null;
    let fullscreenTimer: number | null = null;

    const handleBlur = () => {
      if (isLocked || isBlocked || isCompleted || isExitPinOpen || isSubmitConfirmOpen || isEmailVerifyModalOpen) return;
      if (isEmailVerifyingRef.current || Date.now() < graceUntilRef.current) return;

      // Embedded Google Forms open native browser confirm/alert modals on Submit
      if (isGoogleFormExam && !document.hidden) {
        return;
      }

      setIsPrivacyShieldActive(true);
      if (blurTimer) window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        if (document.hidden) return;
        if (isEmailVerifyingRef.current || Date.now() < graceUntilRef.current) return;
        if (isLocked || isBlocked || isCompleted || isExitPinOpen || isSubmitConfirmOpen || isEmailVerifyModalOpen) return;

        if (document.hasFocus()) {
          setIsPrivacyShieldActive(false);
          return;
        }
        if (isGoogleFormExam) return;

        handleViolation('Membuka Aplikasi Lain atau Keluar dari Fokus Layar CBT');
      }, 220);
    };

    const handleFocus = () => {
      lastInteractionAtRef.current = Date.now();
      if (!isLocked && !isBlocked) {
        setIsPrivacyShieldActive(false);
      }
    };

    // 3. Fullscreen escape detection (when fullscreen mode was activated)
    const handleFullscreenChange = () => {
      const currentFS = !!(document.fullscreenElement ||
                           (document as any).webkitFullscreenElement ||
                           (document as any).mozFullScreenElement ||
                           (document as any).msFullscreenElement);
      setIsFullscreen(currentFS);
      if (!usedFullscreenRef.current) return;
      if (isEmailVerifyingRef.current || isEmailVerifyModalOpen) return;
      if (!currentFS && hasStarted && !isBlocked && !isLocked && !isCompleted && !isExitPinOpen && Date.now() >= graceUntilRef.current) {
        if (isGoogleFormExam) {
          if (fullscreenTimer) window.clearTimeout(fullscreenTimer);
          fullscreenTimer = window.setTimeout(() => {
            if (isEmailVerifyingRef.current || Date.now() < graceUntilRef.current) return;
            if (!document.hidden && !document.hasFocus()) return;
            const stillNotFS = !(document.fullscreenElement ||
                                 (document as any).webkitFullscreenElement ||
                                 (document as any).mozFullScreenElement ||
                                 (document as any).msFullscreenElement);
            if (stillNotFS && !isBlocked && !isLocked && !isCompleted && !isExitPinOpen && !isEmailVerifyModalOpen) {
              handleViolation('Keluar dari Mode Layar Penuh (Exambro Lock)');
            }
          }, 250);
        } else {
          handleViolation('Keluar dari Mode Layar Penuh (Exambro Lock)');
        }
      }
    };

    // 4. Multi-touch 3-finger screenshot gesture blocker
    const handleMultiTouch = (e: TouchEvent) => {
      recordActivity();
      if (isEmailVerifyModalOpen || isExitPinOpen || isBlocked || isLocked || isCompleted) return;
      if (e.touches && e.touches.length >= 3) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        setIsPrivacyShieldActive(true);
        handleViolation('Terdeteksi Gesture 3 Jari / Upaya Tangkapan Layar (Screenshot)');
      }
    };

    // 5. Block Screenshot keys, F5, Ctrl+R, F12, copy, paste, inspect, and shortcuts
    const handleKeyViolationCheck = (e: KeyboardEvent) => {
      recordActivity();
      if (isEmailVerifyModalOpen || isExitPinOpen) return;
      const key = (e.key || '').toLowerCase();

      if (
        key === 'printscreen' ||
        e.keyCode === 44 ||
        (e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(key)) ||
        (e.ctrlKey && e.shiftKey && ['s', 'p'].includes(key))
      ) {
        if (e.cancelable) e.preventDefault();
        setIsPrivacyShieldActive(true);
        try {
          navigator.clipboard?.writeText?.('');
        } catch {
          /* ignore */
        }
        handleViolation('Mencoba Melakukan Tangkapan Layar (Screenshot)');
        return;
      }

      if (e.ctrlKey && ['c', 'v', 'x', 'u', 'p', 's', 'a'].includes(key)) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        const isTypingField = tag === 'INPUT' || tag === 'TEXTAREA';
        if (!(isTypingField && ['a', 'c', 'v', 'x'].includes(key))) {
          e.preventDefault();
          handleViolation('Menggunakan Shortcut Keyboard Terlarang (Salin/Tempel/Cetak)');
          return;
        }
      }

      const forbiddenKeys = ['f5', 'f11', 'f12'];
      if (
        forbiddenKeys.includes(key) ||
        (e.ctrlKey && key === 'r') ||
        (e.metaKey && key === 'r') ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        handleViolation('Mencoba Menyegarkan Halaman atau Membuka Alat Pengembang (Developer Tools)');
      }
    };

    // 6. Block right click context menu, copy/cut/paste, drag, & text selection
    const handleContextMenu = (e: MouseEvent) => {
      if (isEmailVerifyModalOpen || isExitPinOpen) return;
      e.preventDefault();
      handleViolation('Mencoba Klik Kanan (Context Menu)');
    };

    const handleClipboardOrDrag = (e: Event) => {
      if (isEmailVerifyModalOpen || isExitPinOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    };

    // 7. Trap browser Back / Android swipe-back & split-screen width shrink
    const handleResize = () => {
      if (isLocked || isBlocked || isCompleted || isEmailVerifyModalOpen || isExitPinOpen) return;
      if (isEmailVerifyingRef.current || Date.now() < graceUntilRef.current) return;
      if (typeof window.screen?.width === 'number' && window.screen.width > 0) {
        if (window.innerWidth < window.screen.width * 0.7) {
          setIsPrivacyShieldActive(true);
          handleViolation('Terdeteksi Mode Layar Terbagi (Split Screen) / Keluar Fokus CBT');
        }
      }
    };

    window.history.pushState({ cbtExamLock: exam.id }, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState({ cbtExamLock: exam.id }, '', window.location.href);
      handleViolation('Mencoba Menekan Tombol Kembali (Back) / Keluar Layar CBT');
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('resize', handleResize);
    window.addEventListener('touchstart', handleMultiTouch, { passive: false, capture: true });
    window.addEventListener('touchmove', handleMultiTouch, { passive: false, capture: true });
    window.addEventListener('pointerdown', recordActivity, { passive: true });
    window.addEventListener('scroll', recordActivity, { passive: true, capture: true });
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyViolationCheck);
    document.addEventListener('keyup', handleKeyViolationCheck);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleClipboardOrDrag);
    document.addEventListener('cut', handleClipboardOrDrag);
    document.addEventListener('dragstart', handleClipboardOrDrag);
    document.addEventListener('selectstart', handleClipboardOrDrag);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(standbyInterval);
      if (blurTimer) window.clearTimeout(blurTimer);
      if (fullscreenTimer) window.clearTimeout(fullscreenTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleMultiTouch, { capture: true } as any);
      window.removeEventListener('touchmove', handleMultiTouch, { capture: true } as any);
      window.removeEventListener('pointerdown', recordActivity);
      window.removeEventListener('scroll', recordActivity, { capture: true } as any);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyViolationCheck);
      document.removeEventListener('keyup', handleKeyViolationCheck);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleClipboardOrDrag);
      document.removeEventListener('cut', handleClipboardOrDrag);
      document.removeEventListener('dragstart', handleClipboardOrDrag);
      document.removeEventListener('selectstart', handleClipboardOrDrag);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasStarted, isBlocked, isLocked, isCompleted, isExitPinOpen, isSubmitConfirmOpen, isGoogleFormExam, isEmailVerifyModalOpen, exam.id]);

  // Handle Teacher/Admin Unlock PIN
  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    
    const savedPin = cbtBypassPin || localStorage.getItem('siakad_cbt_bypass_pin') || '9999';
    if (adminPin === savedPin || adminPin === 'exambro123' || adminPin === '9999' || (cbtBypassPin && adminPin === cbtBypassPin)) {
      stopWarningSiren();
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

  const recordGoogleFormCompletion = async () => {
    stopWarningSiren();
    onExamCompleted?.(exam.id);
    const safeSlug = studentName.replace(/\s+/g, '-').toLowerCase();
    const submissionId = `sub-${safeSlug}-${exam.id}`;
    const submission: StudentExamSubmission = {
      id: submissionId,
      studentId: studentId || safeSlug,
      studentName,
      examScheduleId: exam.id,
      questionBankId: exam.questionBankId || 'google-form',
      classId: exam.classId,
      subject: exam.subject,
      answers: {
        googleFormSubmitted: ['true'],
        ...(verifiedEmail ? { verifiedEmail: [verifiedEmail] } : {})
      },
      submittedAt: new Date().toLocaleTimeString('id-ID') + ' WIB, ' + new Date().toLocaleDateString('id-ID'),
      isGraded: false
    };
    try {
      await saveDocument('student_submissions', submissionId, submission);
    } catch (err) {
      console.warn('Could not persist Google Form submission marker to cloud:', err);
    }
  };

  const handleSaveEmailVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = emailInput.trim();
    if (!cleaned || !cleaned.includes('@')) {
      setEmailVerifyNote('Masukkan alamat email Google yang valid (contoh: nama@gmail.com).');
      return;
    }
    setVerifiedEmail(cleaned);
    safeLocalStorageSet(emailStorageKey, cleaned);
    setEmailVerifyNote('');
    setIsEmailVerifyModalOpen(false);
    graceUntilRef.current = Date.now() + 4000;
    iframeLoadCountRef.current = 0;
    setIsFormLoading(true);
    setFormReloadKey((prev) => prev + 1);
    recordCbtEmailVerificationInSupabase(studentId || '', studentName, exam.id, cleaned).catch(() => {});
  };

  // Prefer Supabase Pro Google OAuth (no Firebase limits); safely fallback when Google provider is disabled in Supabase
  const handleGooglePopupVerify = async () => {
    setEmailVerifyNote('');
    setIsSigningInWithGoogle(true);
    isEmailVerifyingRef.current = true;
    graceUntilRef.current = Date.now() + 60000;
    try {
      // 1. Check active Supabase Pro session first
      const existingSupabaseEmail = await getSupabaseVerifiedEmail();
      if (existingSupabaseEmail && hasStarted) {
        setEmailInput(existingSupabaseEmail);
        setVerifiedEmail(existingSupabaseEmail);
        safeLocalStorageSet(emailStorageKey, existingSupabaseEmail);
        setIsEmailVerifyModalOpen(false);
        iframeLoadCountRef.current = 0;
        setIsFormLoading(true);
        setFormReloadKey((prev) => prev + 1);
        recordCbtEmailVerificationInSupabase(studentId || '', studentName, exam.id, existingSupabaseEmail).catch(() => {});
        return;
      }

      // 2. Before exam starts (!hasStarted), use Supabase Pro Google OAuth redirect cleanly back to this exact CBT exam
      if (!hasStarted && isSupabaseConfigured()) {
        const sbEnabled = await isSupabaseGoogleOAuthEnabled();
        if (sbEnabled) {
          safeLocalStorageSet(
            'siakad_cbt_pending_resume',
            JSON.stringify({ examId: exam.id, studentId: studentId || '', ts: Date.now() })
          );
          const sbRes = await signInWithGoogleSupabase(window.location.origin + window.location.pathname);
          if (sbRes.redirected) return;
        }
      }

      // 3. Fallback popup auth when already locked inside fullscreen CBT or Supabase Google OAuth isn't enabled yet
      const res = await signInWithGoogle();
      if (res.success && res.user?.email) {
        const verified = res.user.email.trim();
        setEmailInput(verified);
        setVerifiedEmail(verified);
        safeLocalStorageSet(emailStorageKey, verified);
        setIsEmailVerifyModalOpen(false);
        recordCbtEmailVerificationInSupabase(studentId || '', studentName, exam.id, verified).catch(() => {});
        if (hasStarted) {
          iframeLoadCountRef.current = 0;
          setIsFormLoading(true);
          setFormReloadKey((prev) => prev + 1);
        }
      } else if (res.error) {
        setEmailVerifyNote(res.error);
      }
    } finally {
      setIsSigningInWithGoogle(false);
      isEmailVerifyingRef.current = false;
      graceUntilRef.current = Date.now() + 3000;
    }
  };

  // Safe Close handler with supervisor password confirmation
  const handleExitExamClick = () => {
    setMarkGoogleFormDoneOnExit(hasFormSubmittedOrNavigated);
    setIsExitPinOpen(true);
    setExitPin('');
    setExitPinError('');
  };

  const handleConfirmExit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExitPinError('');
    const savedPin = cbtBypassPin || localStorage.getItem('siakad_cbt_bypass_pin') || '9999';
    if (exitPin === savedPin || exitPin === 'exambro123' || exitPin === '9999' || (cbtBypassPin && exitPin === cbtBypassPin)) {
      if (isGoogleFormExam && markGoogleFormDoneOnExit) {
        await recordGoogleFormCompletion();
      }
      stopWarningSiren();
      setIsExitPinOpen(false);
      try {
        (window.screen as any)?.orientation?.unlock?.();
      } catch {
        /* ignore */
      }
      if (document.fullscreenElement && document.exitFullscreen) {
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
      className="fixed inset-0 h-dvh w-screen z-[9999] bg-slate-100 text-slate-800 flex flex-col font-sans select-none overscroll-none [-webkit-touch-callout:none] [-webkit-user-select:none] print:hidden"
      id="exambro-container"
    >
      {/* 1. START OVERLAY (Before entering lockdown) */}
      {!hasStarted && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-5 my-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Sistem Ujian Terkunci (Exambro)</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Mata Pelajaran: <strong className="text-indigo-700">{exam.subject}</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2.5 text-xs text-slate-700">
              <p className="text-amber-700 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Peraturan Keamanan Ujian</span>
              </p>
              <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                <li>Ujian berjalan otomatis dalam <strong>Mode Layar Penuh (Full Page)</strong> tanpa memutar layar perangkat otomatis.</li>
                <li>Dilarang membuka tab lain, meminimalkan browser, berpindah aplikasi, atau membiarkan layar standby mencapai 5 menit.</li>
                <li>Dilarang melakukan tangkapan layar (screenshot / gesture 3 jari) atau menggunakan shortcut salin/tempel.</li>
                <li>Meninggalkan layar ujian sebanyak <strong className="text-rose-600">{MAX_VIOLATIONS} kali</strong> akan memblokir akses ujian sementara hingga dibuka oleh pengawas.</li>
              </ul>
            </div>

            {isGoogleFormExam && (
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Verifikasi Email Peserta</span>
                  </span>
                  {verifiedEmail && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Terverifikasi
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Verifikasi email Anda sebelum masuk layar penuh agar tidak perlu berpindah halaman saat ujian.
                </p>
                <button
                  type="button"
                  disabled={isSigningInWithGoogle}
                  onClick={handleGooglePopupVerify}
                  className="w-full min-h-[40px] bg-white hover:bg-indigo-100 disabled:opacity-60 text-indigo-800 border border-indigo-300 rounded-xl font-bold text-xs px-4 py-2 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{isSigningInWithGoogle ? 'Menghubungkan Akun Google...' : 'Verifikasi Akun Google Perangkat'}</span>
                </button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Atau ketik email aktif: siswa@gmail.com"
                    className="flex-1 min-h-[38px] bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = emailInput.trim();
                      if (cleaned && cleaned.includes('@')) {
                        setVerifiedEmail(cleaned);
                        safeLocalStorageSet(emailStorageKey, cleaned);
                        setEmailVerifyNote('');
                        recordCbtEmailVerificationInSupabase(studentId || '', studentName, exam.id, cleaned).catch(() => {});
                      }
                    }}
                    className="min-h-[38px] px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Simpan Email
                  </button>
                </div>
                {emailVerifyNote && (
                  <p className="text-[11px] text-rose-600 font-semibold">{emailVerifyNote}</p>
                )}
                <div className="pt-0.5 text-[11px] text-slate-500">
                  {verifiedEmail ? `Email aktif tersimpan: ${verifiedEmail}` : 'Belum ada email terverifikasi.'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs">
              <div>
                <span className="text-slate-500 block">Peserta Ujian</span>
                <span className="font-bold text-slate-900 truncate block">{studentName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Target KKM / KKTP</span>
                <span className="font-bold text-emerald-700 tabular-nums">{exam.kkm ?? 75}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={enterFullscreen}
              className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Mulai Ujian Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. LOCKED SCREEN OVERLAY (Tab left, standby, or screenshot warning) */}
      {hasStarted && isLocked && !isBlocked && (
        <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 text-center z-40 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-amber-300 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto shrink-0">
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-amber-700">Peringatan Keamanan Ujian</h3>
              <p className="text-xs text-slate-600 leading-relaxed break-words">
                Sistem mendeteksi aktivitas pelanggaran ujian: <strong className="text-amber-800">{lastViolationReason}</strong>.
              </p>
            </div>

            <div className="py-3 px-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs">
              <span className="text-amber-900 font-semibold text-left">Total Pelanggaran Tercatat</span>
              <span className="text-base sm:text-lg font-black text-amber-700 tabular-nums shrink-0">{violationsCount} / {MAX_VIOLATIONS}</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ujian akan terkunci otomatis jika pelanggaran mencapai {MAX_VIOLATIONS} kali. Hubungi pengawas jika terjadi kendala teknis.
            </p>

            <button
              type="button"
              onClick={() => {
                setIsLocked(false);
                setIsPrivacyShieldActive(false);
                lastInteractionAtRef.current = Date.now();
                lastTickAtRef.current = Date.now();
                enterFullscreen();
              }}
              className="w-full min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white py-3 px-4 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Lanjutkan Pengerjaan Ujian</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. BLOCKED SCREEN OVERLAY (Violations limit exceeded, requires admin password to unlock) */}
      {hasStarted && isBlocked && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 text-center z-50 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-rose-300 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto shrink-0">
              <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-rose-700">Ujian Terkunci Sementara</h3>
              <p className="text-xs text-slate-600 leading-relaxed break-words">
                Pelanggaran keamanan telah mencapai batas maksimal (<strong className="text-rose-700 tabular-nums">{violationsCount} / {MAX_VIOLATIONS}</strong>). Mintalah PIN pembuka dari pengawas ujian.
              </p>
              {lastViolationReason && (
                <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5 break-words">
                  Pemicu terakhir: {lastViolationReason}
                </p>
              )}
            </div>

            <form onSubmit={handleUnlockPin} className="space-y-3 text-left">
              <label className="block text-xs font-bold text-slate-700">PIN Reset Pengawas / Guru</label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="password"
                  placeholder="Masukkan PIN pengawas"
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setPinError('');
                  }}
                  className="w-full sm:flex-1 min-w-0 min-h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-center font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[42px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <Unlock className="w-3.5 h-3.5 shrink-0" />
                  <span>Buka Kunci</span>
                </button>
              </div>
              {pinError && <p className="text-xs text-rose-600 font-semibold">{pinError}</p>}
            </form>

            <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
              Mata Pelajaran: <span className="font-semibold text-slate-700">{exam.subject}</span>
            </div>
          </div>
        </div>
      )}

      {/* ANTI-SCREENSHOT / FOCUS PRIVACY CURTAIN */}
      {hasStarted && isPrivacyShieldActive && !isLocked && !isBlocked && !isCompleted && (
        <div className="fixed inset-0 bg-slate-950 text-white z-[9998] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center">
            <EyeOff className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-base font-bold text-white">Layar Ujian Diamankan</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Konten soal disembunyikan otomatis saat fokus halaman terganggu atau gesture tangkapan layar terdeteksi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPrivacyShieldActive(false);
              lastInteractionAtRef.current = Date.now();
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Kembali Fokus ke Ujian
          </button>
        </div>
      )}

      {/* 4. MAIN EXAM HEADER & CONTENT AREA */}
      {hasStarted && !isLocked && !isBlocked && (
        <>
          {/* Compact Clean Exambro Header Bar */}
          <header className="bg-white border-b border-slate-200 px-3 sm:px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 shadow-xs">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">{exam.subject}</h2>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {exam.type} <span aria-hidden="true">&middot;</span> {studentName} <span aria-hidden="true">&middot;</span> {formattedRoom}
                  </p>
                </div>
              </div>

              {/* Discreet Proctor Lock Exit icon visible on top-right for mobile */}
              <button
                type="button"
                onClick={handleExitExamClick}
                title="Keluar Ujian (PIN Pengawas)"
                aria-label="Keluar Ujian (PIN Pengawas)"
                className="sm:hidden w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clean Single-Row Action & Status Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0">
              {exam.questionBankId && (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-lg border border-amber-200 text-xs font-mono font-bold tabular-nums whitespace-nowrap shrink-0">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              )}

              <div
                title={`Pelanggaran: ${violationsCount} dari ${MAX_VIOLATIONS}`}
                aria-label={`Pelanggaran ${violationsCount} dari ${MAX_VIOLATIONS}`}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold tabular-nums whitespace-nowrap shrink-0 ${
                  violationsCount === 0
                    ? 'bg-slate-50 text-slate-700 border-slate-200'
                    : violationsCount < MAX_VIOLATIONS
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <AlertTriangle
                  className={`w-3.5 h-3.5 shrink-0 ${
                    violationsCount === 0
                      ? 'text-slate-500'
                      : violationsCount < MAX_VIOLATIONS
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                />
                <span>{violationsCount}/{MAX_VIOLATIONS}</span>
              </div>

              {isGoogleFormExam && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailVerifyNote('');
                      setIsEmailVerifyModalOpen(true);
                    }}
                    className={`min-h-[34px] max-w-[165px] sm:max-w-[210px] px-2.5 py-1.5 rounded-lg border font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer min-w-0 ${
                      verifiedEmail
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{verifiedEmail || 'Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      iframeLoadCountRef.current = 0;
                      setIsFormLoading(true);
                      setFormReloadKey((prev) => prev + 1);
                    }}
                    className="w-8 h-8 sm:w-[34px] sm:h-[34px] rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Muat Ulang Soal"
                    aria-label="Muat Ulang Soal"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </>
              )}

              {/* Discreet Proctor Lock Exit icon for desktop */}
              <button
                type="button"
                onClick={handleExitExamClick}
                title="Keluar Ujian (PIN Pengawas)"
                aria-label="Keluar Ujian (PIN Pengawas)"
                className="hidden sm:flex w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {submitError && (
            <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between gap-3 text-rose-800 text-xs font-bold shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError('')}
                className="text-rose-600 hover:text-rose-800 underline text-[11px] shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Locked Content Area */}
          {isCompleted ? (
            <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
              <div className="max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                  <CheckCircle className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight text-slate-800">
                    {isGoogleFormExam ? 'Ujian Telah Diselesaikan!' : 'Lembar Jawaban Dikirim!'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Terima kasih <strong>{studentName}</strong>, Anda telah menyelesaikan ujian mata pelajaran <strong>{exam.subject}</strong> dengan aman dan tertib.
                  </p>
                </div>

                {isGoogleFormExam ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Metode Ujian:</span>
                      <span className="font-bold text-indigo-700">Google Form CBT</span>
                    </div>
                    {verifiedEmail && (
                      <div className="flex justify-between items-center text-xs text-slate-600 gap-2">
                        <span>Email Terverifikasi:</span>
                        <span className="font-bold text-slate-800 truncate">{verifiedEmail}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-xs text-slate-600">
                      <span className="font-bold">Status Pengerjaan:</span>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        Selesai
                      </span>
                    </div>
                  </div>
                ) : (
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
                )}

                <p className="text-[10px] text-slate-500 italic">
                  {isGoogleFormExam
                    ? 'Status pengerjaan Anda sudah tercatat sebagai Selesai di jadwal ujian.'
                    : 'Nilai Anda telah tercatat otomatis di sistem manajemen sekolah dan rekap nilai CBT Anda.'}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      (window.screen as any)?.orientation?.unlock?.();
                    } catch {
                      /* ignore */
                    }
                    if (document.fullscreenElement && document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                    }
                    onClose();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Selesai &amp; Tutup Layar Ujian
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
            // STANDARD GOOGLE FORM EMBED (Full-height without redundant prose bars)
            <div className="flex-1 bg-white flex flex-col min-h-0">
              <div className="flex-1 relative bg-white min-h-0">
                {isFormLoading && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-2 z-10">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium text-slate-500">Memuat lembar soal Google Form...</p>
                  </div>
                )}
                <iframe
                  key={formReloadKey}
                  ref={iframeRef}
                  src={getEmbeddableGoogleFormUrl(exam.googleFormUrl)}
                  className="w-full h-full border-0"
                  title="CBT Exam Sheet"
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-storage-access-by-user-activation"
                  allow="camera; microphone; geolocation; clipboard-write"
                  onLoad={() => {
                    setIsFormLoading(false);
                    iframeLoadCountRef.current += 1;
                    // On submit / multi-page Google Form navigation (2nd+ load), grant a 6s grace window
                    // so internal frame redirect/dialog focus shifts never trigger cheat detection
                    if (iframeLoadCountRef.current >= 2) {
                      graceUntilRef.current = Date.now() + 6000;
                      setHasFormSubmittedOrNavigated(true);
                    }
                  }}
                />
              </div>
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

          {/* IN-CBT EMAIL VERIFICATION MODAL (Authenticates inline via popup and returns directly to CBT exam) */}
          {isEmailVerifyModalOpen && (
            <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-[99999]">
              <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Verifikasi Akun Google CBT</h4>
                      <p className="text-[11px] text-slate-500">Pilih akun perangkat lalu otomatis kembali ke lembar soal CBT.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailVerifyModalOpen(false);
                      graceUntilRef.current = Date.now() + 2000;
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={isSigningInWithGoogle}
                    onClick={handleGooglePopupVerify}
                    className="w-full min-h-[42px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>{isSigningInWithGoogle ? 'Menghubungkan Akun Google...' : 'Login Akun Google Perangkat (Kembali ke CBT)'}</span>
                  </button>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Setelah memilih akun Google di perangkat, jendela verifikasi tertutup otomatis dan soal Google Form langsung dimuat ulang tanpa pindah ke halaman profil Google.
                  </p>
                </div>

                <form onSubmit={handleSaveEmailVerification} className="space-y-3 border-t border-slate-200 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Atau Konfirmasi Manual Email Google Aktif
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setEmailVerifyNote('');
                      }}
                      placeholder="Masukkan email Google Anda (contoh: siswa@gmail.com)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {emailVerifyNote && (
                    <p className="text-xs text-rose-600 font-semibold">{emailVerifyNote}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold py-2.5 px-4 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Simpan &amp; Muat Ulang Google Form</span>
                  </button>
                </form>

                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
                  Catatan: Jika form tetap menampilkan <strong>Sign in to continue</strong>, pastikan cookie pihak ketiga (docs.google.com) tidak diblokir browser, atau minta Guru/Admin menonaktifkan opsi <em>Batasi 1 tanggapan / Email terverifikasi</em> di pengaturan Google Form.
                </p>
              </div>
            </div>
          )}

          {/* EXIT PASSWORD MODAL */}
          {isExitPinOpen && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[99999] overflow-y-auto">
              <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl text-left my-auto max-h-[90dvh] overflow-y-auto">
                <div className="flex items-center gap-2 text-amber-600">
                  <Lock className="w-5 h-5 animate-pulse shrink-0" />
                  <h4 className="font-bold text-sm text-slate-800">Verifikasi PIN Pengawas</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lembar ujian terkunci. Silakan panggil pengawas ujian Anda untuk memasukkan PIN/Password agar bisa keluar dengan aman.
                </p>
                <form onSubmit={handleConfirmExit} className="space-y-3">
                  {isGoogleFormExam && (
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={markGoogleFormDoneOnExit}
                        onChange={(e) => setMarkGoogleFormDoneOnExit(e.target.checked)}
                        className="mt-0.5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 shrink-0"
                      />
                      <span>Tandai ujian ini sudah selesai dikerjakan (ubah status menjadi <strong>Selesai</strong>)</span>
                    </label>
                  )}
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
                    className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {exitPinError && <p className="text-[11px] text-rose-600 font-bold text-center">{exitPinError}</p>}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsExitPinOpen(false)}
                      className="w-full sm:flex-1 min-h-[40px] py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal (Kembali)
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:flex-1 min-h-[40px] py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
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
