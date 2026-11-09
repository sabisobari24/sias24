import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Student, 
  SchoolClass, 
  StudentPermitLog, 
  StudentPermitType, 
  EcoWasteCategory,
  EcoWasteDeposit
} from '../../types';
import { playScannerBeep } from '../../utils/qrHelper';
import { getSchoolClassName } from '../../utils/classUtils';
import {
  X,
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  RotateCw,
  Search,
  Clock,
  UserCheck,
  Zap,
  Sparkles,
  Smartphone,
  Scan,
  Flashlight,
  Sliders,
  DoorOpen,
  ArrowRight,
  LogOut,
  AlertTriangle,
  Recycle,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Check
} from 'lucide-react';

interface StudentIdCardActivityScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: SchoolClass[];
  permits: StudentPermitLog[];
  onAddPermit: (permit: Omit<StudentPermitLog, 'id'>) => Promise<void> | void;
  onReturnPermit: (permitId: string, timeIn?: string, notes?: string) => Promise<void> | void;
  ecoCategories?: EcoWasteCategory[];
  onAddEcoDeposit?: (deposit: Omit<EcoWasteDeposit, 'id'>) => Promise<void> | void;
  operatorName?: string;
  initialMode?: 'permit' | 'eco';
}

interface CameraDevice {
  id: string;
  label: string;
}

export default function StudentIdCardActivityScannerModal({
  isOpen,
  onClose,
  students,
  classes,
  permits,
  onAddPermit,
  onReturnPermit,
  ecoCategories = [],
  onAddEcoDeposit,
  operatorName = 'Guru Piket / Admin',
  initialMode = 'permit'
}: StudentIdCardActivityScannerModalProps) {
  // Mode selection: 'permit' (Toilet/Keluar Kelas/Pulang) or 'eco' (Setor Sampah ECo-Tiket)
  const [activeMode, setActiveMode] = useState<'permit' | 'eco'>(initialMode);

  // Device & Camera States
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  // Scanned Student State
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [activePermitForStudent, setActivePermitForStudent] = useState<StudentPermitLog | null>(null);
  
  // Permit Form states
  const [permitType, setPermitType] = useState<StudentPermitType>('toilet');
  const [permitDestination, setPermitDestination] = useState<string>('Toilet Lantai 2');
  const [permitReason, setPermitReason] = useState<string>('Buang air kecil');
  const [permitCustomNotes, setPermitCustomNotes] = useState<string>('');

  // Eco Deposit Form states
  const [ecoCatId, setEcoCatId] = useState<string>(ecoCategories[0]?.id || '');
  const [ecoQty, setEcoQty] = useState<number>(5);
  const [ecoNotes, setEcoNotes] = useState<string>('Setor via Scanner Kartu Pelajar');

  // Scanner manual input state
  const [manualInput, setManualInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Feedback notification
  const [statusFeedback, setStatusFeedback] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'activity-card-scanner-viewport';

  // Key buffer for external USB / Bluetooth Barcode Scanners (HID Keyboard Emulation)
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Enumerate cameras
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const deviceList: CameraDevice[] = devices.map((d) => ({
            id: d.id,
            label: d.label || `Kamera ${devices.indexOf(d) + 1}`
          }));
          setCameras(deviceList);

          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('belakang') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('Tidak ada kamera video yang terdeteksi di perangkat Anda.');
        }
      })
      .catch((err) => {
        console.warn('Camera detection error:', err);
        setCameraError('Izin akses kamera belum diberikan. Izinkan kamera pada browser Anda.');
      });

    return () => {
      stopCameraScanner();
    };
  }, [isOpen]);

  // Start scanning when camera is selected
  useEffect(() => {
    if (isOpen && selectedCameraId) {
      startCameraScanner(selectedCameraId);
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, selectedCameraId, facingMode]);

  // Handle hardware barcode scanner inputs (USB/Bluetooth)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== barcodeInputRef.current) {
        return;
      }

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        const scannedCode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        if (scannedCode.length >= 4) {
          e.preventDefault();
          processScannedCode(scannedCode);
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 80 && barcodeBufferRef.current.length > 0) {
          barcodeBufferRef.current = '';
        }
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, students, permits]);

  // Update active permit whenever scanned student changes or permits update
  useEffect(() => {
    if (scannedStudent) {
      const active = permits.find(
        (p) => p.studentId === scannedStudent.id && p.status === 'keluar'
      );
      setActivePermitForStudent(active || null);
    } else {
      setActivePermitForStudent(null);
    }
  }, [scannedStudent, permits]);

  const startCameraScanner = async (cameraId: string) => {
    try {
      if (html5QrCodeRef.current) {
        await stopCameraScanner();
      }

      setCameraError(null);
      const html5Qr = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13
        ],
        verbose: false
      });
      html5QrCodeRef.current = html5Qr;

      const cameraConfig: Html5QrcodeCameraScanConfig = {
        fps: 25,
        qrbox: (viewWidth, viewHeight) => {
          const edge = Math.min(viewWidth, viewHeight);
          return {
            width: Math.floor(edge * 0.82),
            height: Math.floor(edge * 0.82)
          };
        },
        aspectRatio: 1.0,
        disableFlip: false
      };

      const cameraSource = cameraId ? { deviceId: { exact: cameraId } } : { facingMode };

      await html5Qr.start(
        cameraSource,
        cameraConfig,
        (decodedText) => {
          if (decodedText) {
            processScannedCode(decodedText);
          }
        },
        () => {
          // Frame scan callback (silent)
        }
      );

      setIsScanning(true);

      // Check flashlight/torch support
      try {
        const capabilities = (html5Qr as any).getRunningTrackCapabilities?.();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: any) {
      console.warn('Gagal memulai kamera scanner:', err);
      setIsScanning(false);
      setCameraError(err.message || 'Kamera sedang digunakan aplikasi lain atau izin akses ditolak.');
    }
  };

  const stopCameraScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (e) {
      console.debug('Notice stopping camera:', e);
    } finally {
      html5QrCodeRef.current = null;
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch control error:', e);
    }
  };

  // Process Scanned NISN from Student ID Card QR
  const processScannedCode = (code: string) => {
    const raw = code.trim();
    if (!raw) return;

    // Match student by NISN, ID, or Phone
    const matched = students.find(
      (s) => (s.nisn && s.nisn.trim() === raw) || s.id === raw || (s.phone && s.phone.trim() === raw)
    );

    if (matched) {
      if (soundEnabled) playScannerBeep('success');
      setScannedStudent(matched);

      // Check if student currently has active permit
      const active = permits.find(
        (p) => p.studentId === matched.id && p.status === 'keluar'
      );
      setActivePermitForStudent(active || null);

      setStatusFeedback({
        text: `Kartu Pelajar Terbaca: ${matched.name} (${getSchoolClassName(matched.classId, classes)})`,
        type: 'success'
      });
    } else {
      if (soundEnabled) playScannerBeep('error');
      setStatusFeedback({
        text: `Data NISN "${raw}" tidak ditemukan di database siswa.`,
        type: 'error'
      });
    }

    // Auto-clear feedback after 4 seconds
    setTimeout(() => {
      setStatusFeedback((prev) => (prev?.text.includes(raw) ? null : prev));
    }, 4000);
  };

  // Submit Exit Permit (Ke Toilet / Keluar Kelas / Pulang Cepat)
  const handleRecordExitPermit = async (forcedType?: StudentPermitType, forcedDest?: string) => {
    if (!scannedStudent) return;

    const chosenType = forcedType || permitType;
    const chosenDest = forcedDest || permitDestination;
    const now = new Date();
    const timeOutStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    const todayStr = now.toISOString().split('T')[0];

    const isEarlyDismissal = chosenType === 'pulang_cepat';

    try {
      await onAddPermit({
        studentId: scannedStudent.id,
        studentName: scannedStudent.name,
        nisn: scannedStudent.nisn || '-',
        classId: scannedStudent.classId,
        type: chosenType,
        destination: chosenDest,
        reason: permitReason || (chosenType === 'toilet' ? 'Ke Toilet' : 'Izin Keluar Kelas'),
        date: todayStr,
        timeOut: timeOutStr,
        status: isEarlyDismissal ? 'izin_pulang' : 'keluar',
        approvedBy: operatorName,
        notes: permitCustomNotes.trim() || undefined,
        timestamp: Date.now()
      });

      if (soundEnabled) playScannerBeep('success');
      setStatusFeedback({
        text: isEarlyDismissal 
          ? `Izin Pulang Cepat untuk ${scannedStudent.name} berhasil dicatat!`
          : `Izin ${chosenDest} untuk ${scannedStudent.name} berhasil dicatat (Jam Keluar: ${timeOutStr})`,
        type: 'success'
      });

      // Clear student state after quick recording
      setTimeout(() => {
        setScannedStudent(null);
        setActivePermitForStudent(null);
        setPermitCustomNotes('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStatusFeedback({ text: 'Gagal mencatat izin: ' + (err.message || 'Error'), type: 'error' });
    }
  };

  // Confirm Return to Class
  const handleConfirmReturn = async () => {
    if (!scannedStudent || !activePermitForStudent) return;

    const now = new Date();
    const timeInStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    try {
      await onReturnPermit(activePermitForStudent.id, timeInStr, permitCustomNotes);
      if (soundEnabled) playScannerBeep('success');

      setStatusFeedback({
        text: `${scannedStudent.name} telah kembali ke kelas pada ${timeInStr}. Durasi tercatat.`,
        type: 'success'
      });

      setTimeout(() => {
        setScannedStudent(null);
        setActivePermitForStudent(null);
        setPermitCustomNotes('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStatusFeedback({ text: 'Gagal memperbarui izin kembali: ' + (err.message || 'Error'), type: 'error' });
    }
  };

  // Submit Eco-Tiket Deposit
  const handleRecordEcoDeposit = async () => {
    if (!scannedStudent || !onAddEcoDeposit) return;

    const selectedCategory = ecoCategories.find((c) => c.id === ecoCatId) || ecoCategories[0];
    if (!selectedCategory) return;

    const points = Math.round(ecoQty * selectedCategory.pointsPerUnit);
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      await onAddEcoDeposit({
        studentId: scannedStudent.id,
        studentName: scannedStudent.name,
        classId: scannedStudent.classId,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        quantity: ecoQty,
        unit: selectedCategory.unit,
        pointsEarned: points,
        date: todayStr,
        notes: ecoNotes || 'Disetor via Scanner Kartu Pelajar',
        recordedBy: operatorName,
        status: 'Diverifikasi',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      });

      if (soundEnabled) playScannerBeep('success');
      setStatusFeedback({
        text: `Setoran sampah ${scannedStudent.name} berhasil! +${points} Poin ECo-Tiket ditambahkan.`,
        type: 'success'
      });

      setTimeout(() => {
        setScannedStudent(null);
        setEcoQty(5);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStatusFeedback({ text: 'Gagal mencatat setoran: ' + (err.message || 'Error'), type: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-4xl flex flex-col my-auto transition-all ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-h-[95vh]'}`}>
        
        {/* Top Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
              <Scan className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Terminal Scanner Kartu Pelajar</h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Multi-Fungsi
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Scan QR NISN untuk Izin Keluar Kelas, Toilet, Pulang Cepat, &amp; Penukaran Sampah ECo-Tiket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${soundEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500/20 text-rose-300'}`}
              title={soundEnabled ? 'Suara Beep Aktif' : 'Suara Beep Dimatikan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl transition-all cursor-pointer ${torchOn ? 'bg-amber-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                title="Lampu Senter / Flash"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Kiosk)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-rose-500 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational Mode Tabs */}
        <div className="bg-slate-100 p-2 sm:px-6 flex items-center justify-between gap-2 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMode('permit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'permit'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Izin Keluar / Toilet / Pulang</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('eco')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'eco'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Recycle className="w-3.5 h-3.5" />
              <span>Setor Sampah ECo-Tiket</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Petugas: <strong>{operatorName}</strong></span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Camera Scanner & Manual Input */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center border-2 border-slate-800 shadow-inner">
              <div id={scannerContainerId} className="w-full h-full object-cover"></div>

              {/* Scanning visual overlay frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                <div className="w-full h-full border-2 border-indigo-400/60 rounded-3xl relative animate-pulse flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-indigo-400"></span>
                    <span className="w-4 h-4 border-t-2 border-r-2 border-indigo-400"></span>
                  </div>
                  <div className="text-center text-[11px] text-white/90 bg-slate-950/70 py-1 px-3 rounded-full backdrop-blur-md self-center">
                    Arahkan QR NISN Kartu Pelajar
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-indigo-400"></span>
                    <span className="w-4 h-4 border-b-2 border-r-2 border-indigo-400"></span>
                  </div>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white z-10 space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-400" />
                  <p className="text-xs text-rose-200">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCameraId) startCameraScanner(selectedCameraId);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Coba Sambung Ulang</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            {cameras.length > 1 && (
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual NISN / Search fallback input */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ketik Manual NISN / Nama Siswa (Jika Tanpa Kamera)</span>
              </label>
              <div className="flex gap-2">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Ketik 10 digit NISN atau nama siswa..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      processScannedCode(manualInput);
                    }
                  }}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => processScannedCode(manualInput)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cari
                </button>
              </div>
            </div>

            {/* Notification alert */}
            {statusFeedback && (
              <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold animate-fadeIn ${
                statusFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : statusFeedback.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {statusFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusFeedback.text}</span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Scanned Student Action Center */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {scannedStudent ? (
              <div className="space-y-4 animate-scaleUp">
                {/* Student Profile Card */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-900/60 shadow-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={scannedStudent.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(scannedStudent.name)}`}
                      alt={scannedStudent.name}
                      className="w-12 h-12 rounded-xl object-cover bg-white/10 border border-white/20 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm sm:text-base">{scannedStudent.name}</h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                          Kelas {getSchoolClassName(scannedStudent.classId, classes)}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200 font-mono mt-0.5">
                        NISN: {scannedStudent.nisn || '-'} &bull; HP: {scannedStudent.phone || '-'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setScannedStudent(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                    title="Ganti Siswa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* MODE 1: IZIN KELUAR KELAS, TOILET, PULANG CEPAT */}
                {activeMode === 'permit' && (
                  <div className="space-y-4">
                    {/* If student is currently outside: Confirm Return Alert */}
                    {activePermitForStudent ? (
                      <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
                            <h5 className="font-black text-sm text-amber-950">
                              Siswa Sedang Berada di Luar Kelas!
                            </h5>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                            Status: Di Luar
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1.5 font-medium text-slate-700">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tujuan / Tempat:</span>
                            <strong className="text-slate-900">{activePermitForStudent.destination}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Jam Keluar:</span>
                            <span className="font-mono text-indigo-700 font-bold">{activePermitForStudent.timeOut}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Petugas yang Mengizinkan:</span>
                            <span>{activePermitForStudent.approvedBy}</span>
                          </div>
                          {activePermitForStudent.reason && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Keterangan:</span>
                              <span className="italic">{activePermitForStudent.reason}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Catatan Tambahan saat Kembali (Opsional)</label>
                          <input
                            type="text"
                            placeholder="Kondisi siswa saat kembali..."
                            value={permitCustomNotes}
                            onChange={(e) => setPermitCustomNotes(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleConfirmReturn}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>KONFIRMASI SISWA KEMBALI KE KELAS SEKARANG</span>
                        </button>
                      </div>
                    ) : (
                      /* Student is currently inside class: Options to issue new pass */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1 border-b">
                          <h5 className="font-black text-xs text-slate-700 uppercase tracking-wide">
                            Pilih Jenis Izin yang Diberikan:
                          </h5>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Saat ini: Di Kelas
                          </span>
                        </div>

                        {/* Quick Action Buttons for FAST TAP */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPermitType('toilet');
                              setPermitDestination('Toilet Lantai 2');
                              setPermitReason('Buang air kecil');
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              permitType === 'toilet' && permitDestination === 'Toilet Lantai 2'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-md font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <DoorOpen className="w-5 h-5 mb-1 text-amber-300" />
                            <div className="text-xs font-black">Toilet Lantai 2</div>
                            <div className={`text-[10px] ${permitType === 'toilet' && permitDestination === 'Toilet Lantai 2' ? 'text-amber-100' : 'text-slate-400'}`}>Izin Toilet Siswa</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPermitType('toilet');
                              setPermitDestination('Toilet Lantai 1');
                              setPermitReason('Buang air kecil');
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              permitType === 'toilet' && permitDestination === 'Toilet Lantai 1'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-md font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <DoorOpen className="w-5 h-5 mb-1 text-amber-300" />
                            <div className="text-xs font-black">Toilet Lantai 1</div>
                            <div className={`text-[10px] ${permitType === 'toilet' && permitDestination === 'Toilet Lantai 1' ? 'text-amber-100' : 'text-slate-400'}`}>Izin Toilet Siswa</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPermitType('toilet');
                              setPermitDestination('Toilet Lantai 3');
                              setPermitReason('Buang air kecil');
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              permitType === 'toilet' && permitDestination === 'Toilet Lantai 3'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-md font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <DoorOpen className="w-5 h-5 mb-1 text-amber-300" />
                            <div className="text-xs font-black">Toilet Lantai 3</div>
                            <div className={`text-[10px] ${permitType === 'toilet' && permitDestination === 'Toilet Lantai 3' ? 'text-amber-100' : 'text-slate-400'}`}>Izin Toilet Siswa</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPermitType('uks');
                              setPermitDestination('Ruang UKS');
                              setPermitReason('Sakit / Pusing / Istirahat');
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              permitType === 'uks'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-md font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <AlertCircle className="w-5 h-5 mb-1 text-rose-200" />
                            <div className="text-xs font-black">Ruang UKS</div>
                            <div className={`text-[10px] ${permitType === 'uks' ? 'text-rose-100' : 'text-slate-400'}`}>Sakit di Sekolah</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPermitType('perpustakaan');
                              setPermitDestination('Ruang Perpustakaan');
                              setPermitReason('Peminjaman / Tugas Literasi');
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              permitType === 'perpustakaan'
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <Building2 className="w-5 h-5 mb-1 text-indigo-200" />
                            <div className="text-xs font-black">Perpustakaan</div>
                            <div className={`text-[10px] ${permitType === 'perpustakaan' ? 'text-indigo-100' : 'text-slate-400'}`}>Tugas / Literasi</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPermitType('pulang_cepat');
                              setPermitDestination('Gerbang Sekolah (Pulang)');
                              setPermitReason('Izin Pulang Cepat (Sakit/Keluarga)');
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              permitType === 'pulang_cepat'
                                ? 'bg-purple-600 text-white border-purple-700 shadow-md font-bold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <LogOut className="w-5 h-5 mb-1 text-purple-200" />
                            <div className="text-xs font-black">Pulang Cepat</div>
                            <div className={`text-[10px] ${permitType === 'pulang_cepat' ? 'text-purple-100' : 'text-slate-400'}`}>Dispensasi Pulang</div>
                          </button>
                        </div>

                        {/* Detailed destination & reason form */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Tujuan / Lokasi Spesifik</label>
                            <input
                              type="text"
                              value={permitDestination}
                              onChange={(e) => setPermitDestination(e.target.value)}
                              placeholder="e.g. Toilet Lantai 2, UKS, Ruang Guru..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Alasan Izin</label>
                            <input
                              type="text"
                              value={permitReason}
                              onChange={(e) => setPermitReason(e.target.value)}
                              placeholder="e.g. Buang air kecil, sakit kepala..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Submit Action */}
                        <button
                          type="button"
                          onClick={() => handleRecordExitPermit()}
                          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-2"
                        >
                          <DoorOpen className="w-4 h-4 text-amber-200" />
                          <span>CATAT IZIN KELUAR SISWA (TAP / SCAN BERHASIL)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 2: SETOR SAMPAH ECO-TIKET */}
                {activeMode === 'eco' && (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                      <div className="flex items-center gap-2">
                        <Recycle className="w-4 h-4 text-emerald-600" />
                        <h5 className="font-bold text-sm text-emerald-950">Setor Sampah ke Bank Sampah Sekolah</h5>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">Kartu Terbaca</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Kategori Sampah</label>
                        <select
                          value={ecoCatId}
                          onChange={(e) => setEcoCatId(e.target.value)}
                          className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                        >
                          {ecoCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.pointsPerUnit} poin/{c.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Jumlah Disetor</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={ecoQty}
                            onChange={(e) => setEcoQty(Number(e.target.value) || 1)}
                            className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800"
                          />
                          <span className="text-xs font-bold text-emerald-800 shrink-0">
                            {ecoCategories.find((c) => c.id === ecoCatId)?.unit || 'unit'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Calculated Points Preview */}
                    {(() => {
                      const selCat = ecoCategories.find((c) => c.id === ecoCatId);
                      const points = selCat ? Math.round(ecoQty * selCat.pointsPerUnit) : 0;
                      return (
                        <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">Poin yang Diterima Siswa:</span>
                          <span className="text-base font-black text-emerald-700">+{points} Poin ECo</span>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={handleRecordEcoDeposit}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Recycle className="w-4 h-4 text-emerald-200" />
                      <span>SIMPAN SETORAN SAMPAH SISWA</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* No student scanned yet placeholder */
              <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Scan className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Menunggu Scan Kartu Pelajar</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                    Tempelkan atau scan QR Code pada Kartu Pelajar siswa ke kamera atau laser barcode scanner untuk memproses Izin Toilet atau Setoran Sampah.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-500 font-medium">
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg">✅ Izin Toilet Otomatis</span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg">✅ Hitung Menit Keluar</span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg">✅ Bank Sampah ECo-Tiket</span>
                </div>
              </div>
            )}

            {/* Quick summary of currently out-of-class students */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between text-slate-600">
              <span className="font-semibold">
                Siswa Sedang di Luar Kelas Saat Ini: <strong className="text-amber-700 font-black">{permits.filter(p => p.status === 'keluar').length} anak</strong>
              </span>
              <span className="text-[11px] text-indigo-600 font-bold">Sinkron Real-Time</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Scanner Aktif &amp; Terhubung SIAS Database</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
