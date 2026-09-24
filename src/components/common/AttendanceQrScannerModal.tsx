import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Student, SchoolClass, Attendance } from '../../types';
import { playScannerBeep } from '../../utils/qrHelper';
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
  Barcode,
  Search,
  Clock,
  UserCheck,
  Zap,
  Sparkles,
  Smartphone,
  Laptop,
  Scan,
  Flashlight,
  Sliders,
  Focus
} from 'lucide-react';

interface AttendanceQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: SchoolClass[];
  attendance: Attendance[];
  onRecordAttendance: (record: Omit<Attendance, 'id'>) => void;
  operatorName?: string;
  schoolStartTime?: string;
}

interface CameraDevice {
  id: string;
  label: string;
}

interface ScanLogEntry {
  student: Student;
  className: string;
  timestamp: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  isDuplicate?: boolean;
}

export default function AttendanceQrScannerModal({
  isOpen,
  onClose,
  students,
  classes,
  attendance,
  onRecordAttendance,
  operatorName = 'Admin Sekolah',
  schoolStartTime = '07:00'
}: AttendanceQrScannerModalProps) {
  // Device & Camera States
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // High Sensitivity & Ultra-Wide Viewport States
  const [scanSensitivity, setScanSensitivity] = useState<'ultra' | 'normal'>('ultra');
  const [scanAreaMode, setScanAreaMode] = useState<'wide' | 'standard'>('wide');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  // Attendance Config
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<'Hadir' | 'Sakit' | 'Izin'>('Hadir');

  // Scanner Hardware / Manual Input State
  const [manualNisn, setManualNisn] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Feedback states
  const [lastScannedEntry, setLastScannedEntry] = useState<ScanLogEntry | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [recentLogs, setRecentLogs] = useState<ScanLogEntry[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerId = 'attendance-qr-reader-container';

  // Key buffer for external USB / Bluetooth Barcode Scanners (HID Keyboard Emulation)
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Get available cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const formatted = devices.map((d) => ({
            id: d.id,
            label: d.label || `Kamera ${d.id.slice(0, 6)}`
          }));
          setCameras(formatted);
          setSelectedCameraId(formatted[0].id);
        } else {
          setCameras([]);
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration info:', err);
        // On mobile browsers, enumeration before permission may return empty; Html5Qrcode handles facingMode automatically.
      });

    // Auto focus barcode input
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 400);

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Listen for hardware barcode scanner keystrokes (types rapidly + sends Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused on date input or search input, let standard input happen
      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const activeId = (document.activeElement as HTMLElement)?.id;

      if (activeTag === 'input' && activeId !== 'hardware-barcode-listener-input') {
        return;
      }

      const now = Date.now();
      // Most barcode scanners send characters within 20-50ms of each other
      if (now - lastKeyTimeRef.current > 250) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode) {
          e.preventDefault();
          handleProcessScannedCode(scannedCode);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedDate, selectedStatus, students, attendance]);

  // Start Camera Scanner with High Sensitivity & Wide Area
  const startScanner = async (overrideSensitivity?: 'ultra' | 'normal', overrideArea?: 'wide' | 'standard') => {
    setCameraError(null);
    const sensitivity = overrideSensitivity ?? scanSensitivity;
    const area = overrideArea ?? scanAreaMode;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.DATA_MATRIX
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
      }

      const fpsValue = sensitivity === 'ultra' ? 25 : 15;

      // Ultra-Wide and sensitive bounding box calculation:
      // In wide mode: covers 94% of container width & 85% of height!
      // This eliminates the narrow box restriction so barcodes are instantly detected across the view.
      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        if (area === 'wide') {
          return {
            width: Math.max(280, Math.floor(viewfinderWidth * 0.94)),
            height: Math.max(220, Math.floor(viewfinderHeight * 0.85))
          };
        }
        // Standard square mode
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.max(240, Math.floor(minEdge * 0.8)),
          height: Math.max(240, Math.floor(minEdge * 0.8))
        };
      };

      const config: Html5QrcodeCameraScanConfig = {
        fps: fpsValue,
        qrbox: qrboxFunction,
        aspectRatio: undefined, // Do not force 1:1 square crop, allow natural widescreen
        disableFlip: false,
        videoConstraints: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      };

      const qrSuccessCallback = (decodedText: string) => {
        handleProcessScannedCode(decodedText);
      };

      const qrErrorCallback = () => {
        // Continuous scan loop frame ignore
      };

      if (selectedCameraId && cameras.length > 0) {
        await html5QrCodeRef.current.start(
          selectedCameraId,
          config,
          qrSuccessCallback,
          qrErrorCallback
        );
      } else {
        // Fallback to facing mode (for mobile phones)
        await html5QrCodeRef.current.start(
          { facingMode: facingMode },
          config,
          qrSuccessCallback,
          qrErrorCallback
        );
      }

      setIsScanning(true);

      // Check if torch/flashlight is supported
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        if ((capabilities as any)?.torchFeature?.().isSupported?.()) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: any) {
      console.error('Error starting QR scanner:', err);
      setCameraError(
        'Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser atau periksa apakah kamera sedang dipakai aplikasi lain.'
      );
      setIsScanning(false);
    }
  };

  // Stop Camera Scanner
  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      setIsScanning(false);
      setTorchOn(false);
    } catch (err) {
      console.warn('Error stopping scanner:', err);
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  // Toggle Camera
  const handleToggleScanner = () => {
    if (isScanning) {
      stopScanner();
    } else {
      startScanner();
    }
  };

  // Switch camera facing mode
  const handleSwitchCamera = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  };

  // Toggle Flashlight / Torch
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch not supported on this device/browser:', err);
    }
  };

  // Change Area Mode (Wide / Standard)
  const handleChangeAreaMode = async (newArea: 'wide' | 'standard') => {
    setScanAreaMode(newArea);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner(scanSensitivity, newArea);
      }, 250);
    }
  };

  // Change Sensitivity (Ultra 25 FPS / Normal 15 FPS)
  const handleChangeSensitivity = async (newSens: 'ultra' | 'normal') => {
    setScanSensitivity(newSens);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner(newSens, scanAreaMode);
      }, 250);
    }
  };

  // Handle Scanned Code (from camera, hardware scanner, or manual input)
  const lastProcessedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const handleProcessScannedCode = (rawCode: string) => {
    const cleanCode = rawCode.trim().replace(/^NISN:\s*/i, '').replace(/[\r\n\t]/g, '').trim();
    if (!cleanCode) return;

    // Debounce duplicate scans within 2.5 seconds for same code
    const now = Date.now();
    if (lastProcessedTimeRef.current.code === cleanCode && now - lastProcessedTimeRef.current.time < 2500) {
      return;
    }
    lastProcessedTimeRef.current = { code: cleanCode, time: now };

    // Find student by NISN or ID with smart normalized match fallback
    const normalizedClean = cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const student = students.find((s) => {
      const sNisn = (s.nisn || '').toLowerCase().trim();
      const sId = (s.id || '').toLowerCase().trim();
      const normNisn = sNisn.replace(/[^a-z0-9]/g, '');
      const normId = sId.replace(/[^a-z0-9]/g, '');

      return (
        sNisn === cleanCode.toLowerCase() ||
        sId === cleanCode.toLowerCase() ||
        (normalizedClean.length >= 4 && (normNisn === normalizedClean || normId === normalizedClean))
      );
    });

    if (!student) {
      if (soundEnabled) playScannerBeep('error');
      setStatusMessage({
        text: `Data Siswa dengan NISN/Barcode "${cleanCode}" tidak ditemukan dalam sistem!`,
        type: 'error'
      });
      return;
    }

    const currentClass = classes.find((c) => c.id === student.classId);
    const className = currentClass?.name || student.classId || '-';

    // Check if already attended today
    const existing = attendance.find(
      (a) => a.studentId === student.id && a.date === selectedDate
    );

    const nowTime = new Date();
    const timeFormatted = nowTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';

    if (existing) {
      if (soundEnabled) playScannerBeep('warning');
      const entry: ScanLogEntry = {
        student,
        className,
        timestamp: existing.timestamp || timeFormatted,
        status: existing.status,
        isDuplicate: true
      };
      setLastScannedEntry(entry);
      setStatusMessage({
        text: `Siswa "${student.name}" sudah tercatat [${existing.status}] hari ini (${existing.timestamp || 'Tercatat'})!`,
        type: 'warning'
      });
      return;
    }

    // New attendance record!
    if (soundEnabled) playScannerBeep('success');

    // Form record
    const newRecord: Omit<Attendance, 'id'> = {
      studentId: student.id,
      classId: student.classId,
      date: selectedDate,
      status: selectedStatus,
      recordedBy: operatorName,
      timestamp: timeFormatted,
      notes: `Absensi Scan QR NISN via Scanner (${operatorName})`,
      verificationStatus: 'Verified',
      isVerifiedByPiket: true
    };

    onRecordAttendance(newRecord);

    const logEntry: ScanLogEntry = {
      student,
      className,
      timestamp: timeFormatted,
      status: selectedStatus,
      isDuplicate: false
    };

    setLastScannedEntry(logEntry);
    setRecentLogs((prev) => [logEntry, ...prev.slice(0, 19)]);
    setStatusMessage({
      text: `Berhasil mencatat absensi: ${student.name} (${className}) - ${selectedStatus}`,
      type: 'success'
    });

    // Clear manual input
    setManualNisn('');
    barcodeInputRef.current?.focus();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualNisn.trim()) {
      handleProcessScannedCode(manualNisn.trim());
    }
  };

  // Filter today's attendance stats
  const todayScannedCount = attendance.filter((a) => a.date === selectedDate).length;
  const todayHadirCount = attendance.filter((a) => a.date === selectedDate && a.status === 'Hadir').length;

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden border border-slate-200 transition-all ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* Header bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl border border-white/15">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
                  Pos Scanner Absensi QR & Barcode Siswa
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Universal Device
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Kompatibel dengan Kamera HP, Laptop, Webcam, & Alat Scanner Barcode Fisik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-white/10 hover:bg-white/20 text-emerald-300'
                  : 'bg-white/5 text-slate-400'
              }`}
              title={soundEnabled ? 'Suara scanner aktif' : 'Suara scanner hening'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Kiosk Mode */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-slate-200 transition-all cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Kiosk)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 bg-white/10 hover:bg-rose-600 rounded-xl text-slate-200 transition-all cursor-pointer"
              title="Tutup Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Configuration Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tanggal Absen */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 text-[11px] uppercase">Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-purple-600"
              />
            </div>

            {/* Status Default */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 text-[11px] uppercase">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-purple-600"
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
              </select>
            </div>

            {/* Operator */}
            <div className="hidden md:flex items-center gap-1.5 text-slate-500">
              <span className="text-[11px]">Petugas:</span>
              <span className="font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded">
                {operatorName}
              </span>
            </div>
          </div>

          {/* Today's Quick Counter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Rekap Hari Ini:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              {todayHadirCount} Hadir
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
              {todayScannedCount} Total Log
            </span>
          </div>
        </div>

        {/* Main Scanner Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/50">
          {/* Left Column: Camera / Scanner Window (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Camera Viewport Container */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col relative">
              {/* Scoped CSS for html5-qrcode video layout and hiding restrictive dark SVG overlays */}
              <style>{`
                #${scannerId} {
                  width: 100% !important;
                  height: 100% !important;
                  border: none !important;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                #${scannerId} video {
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: cover !important;
                }
                #${scannerId}__scan_region {
                  background: transparent !important;
                }
                #${scannerId}__scan_region svg {
                  display: none !important;
                }
                #${scannerId}__header_message {
                  display: none !important;
                }
              `}</style>

              {/* Camera Header controls */}
              <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isScanning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <span className="font-bold">
                    {isScanning ? 'Kamera Scanner Aktif' : 'Kamera Siaga (Standby)'}
                  </span>
                  {isScanning && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {scanAreaMode === 'wide' ? 'Area Luas 94%' : 'Fokus Kotak'} &bull; {scanSensitivity === 'ultra' ? '25 FPS' : '15 FPS'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Torch / Senter toggle if camera supports it */}
                  {torchSupported && isScanning && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        torchOn
                          ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                      title="Nyalakan Lampu Flash / Senter"
                    >
                      <Flashlight className="w-3 h-3" />
                      <span>{torchOn ? 'Senter Nyala' : 'Senter'}</span>
                    </button>
                  )}

                  {/* Switch Front/Back on phones */}
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer text-slate-200"
                    title="Ganti Kamera Depan / Belakang"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span className="hidden sm:inline">
                      {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
                    </span>
                  </button>

                  {/* Toggle Camera Scan */}
                  <button
                    type="button"
                    onClick={handleToggleScanner}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      isScanning
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isScanning ? 'Matikan Kamera' : 'Nyalakan Kamera'}</span>
                  </button>
                </div>
              </div>

              {/* Secondary Scanner Sensitivity & Area Width Controls Bar */}
              <div className="px-3 py-2 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                {/* Area Mode: Ultra Wide vs Standard */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium hidden xs:inline">Area Kotak:</span>
                  <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleChangeAreaMode('wide')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        scanAreaMode === 'wide'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Area Pindai Super Luas (94% layar) - Memudahkan scan dari berbagai sudut"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Lensa Luas (Mudah)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeAreaMode('standard')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        scanAreaMode === 'standard'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Fokus Kotak Persegi Tengah"
                    >
                      <Focus className="w-3 h-3" />
                      <span>Kotak Fokus</span>
                    </button>
                  </div>
                </div>

                {/* Sensitivity Mode: Ultra 25 FPS vs Normal 15 FPS */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium hidden xs:inline">Sensitivitas:</span>
                  <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleChangeSensitivity('ultra')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        scanSensitivity === 'ultra'
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="25 FPS Cepat & Aktifkan Detektor Barcode Hardware Browser"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Turbo 25 FPS (Super Cepat)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeSensitivity('normal')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        scanSensitivity === 'normal'
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="15 FPS Hemat Daya"
                    >
                      <span>Standar 15 FPS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport element for Html5Qrcode - Made much more spacious */}
              <div
                className={`relative w-full ${
                  isFullscreen
                    ? 'min-h-[500px] h-[64vh]'
                    : 'min-h-[420px] sm:min-h-[480px] lg:min-h-[520px] h-[52vh] sm:h-[58vh] max-h-[640px]'
                } bg-slate-950 flex items-center justify-center overflow-hidden`}
              >
                <div id={scannerId} className="w-full h-full object-cover" />

                {!isScanning && (
                  <div className="absolute inset-0 bg-slate-950/92 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                    <div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400">
                      <Camera className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">Kamera Siap Digunakan</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Klik <strong>"Nyalakan Kamera"</strong> untuk mengaktifkan pemindai kartu dengan area luas & sensitif, atau langsung gunakan <strong>Alat Barcode Scanner Gun Fisik</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startScanner()}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Mulai Pindai Kamera</span>
                    </button>
                  </div>
                )}

                {/* Spacious & Highly Responsive Viewfinder Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3 sm:p-5">
                    <div
                      className={`relative transition-all duration-300 ${
                        scanAreaMode === 'wide'
                          ? 'w-[94%] max-w-[580px] h-[82%] min-h-[270px] max-h-[420px]'
                          : 'w-[78%] max-w-[380px] h-[70%] min-h-[230px] max-h-[340px]'
                      } border-2 border-amber-400/60 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.2)] flex flex-col items-center justify-between p-3.5`}
                    >
                      {/* 4 Neon Glowing Corner brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-2xl -mt-1 -ml-1 shadow-[0_0_12px_#f59e0b]" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-2xl -mt-1 -mr-1 shadow-[0_0_12px_#f59e0b]" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-2xl -mb-1 -ml-1 shadow-[0_0_12px_#f59e0b]" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-2xl -mb-1 -mr-1 shadow-[0_0_12px_#f59e0b]" />

                      {/* Top Header Tag inside viewfinder */}
                      <div className="flex items-center justify-between w-full px-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-black/75 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-amber-400/30 flex items-center gap-1.5 shadow-sm">
                          <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>{scanAreaMode === 'wide' ? 'Area Pindai Super Luas' : 'Area Fokus Kotak'}</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-black/75 px-2 py-1 rounded-lg backdrop-blur-xs border border-emerald-400/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>{scanSensitivity === 'ultra' ? 'Turbo 25 FPS' : '15 FPS'}</span>
                        </span>
                      </div>

                      {/* Sweeping Laser Scan Line */}
                      <div className="w-full relative flex items-center justify-center my-auto">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-[0_0_18px_#f59e0b]" />
                      </div>

                      {/* Bottom Guidance Pill */}
                      <div className="w-full text-center pb-0.5">
                        <span className="text-[10px] sm:text-[11px] font-bold text-white bg-black/80 px-3.5 py-1.5 rounded-full backdrop-blur-xs shadow-md border border-white/15 inline-flex items-center gap-1.5">
                          <Scan className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Dekatkan Kartu Pelajar atau HP Siswa (Jarak 10 – 30 cm)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera selection dropdown if multiple cameras detected */}
              {cameras.length > 1 && (
                <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-[11px] font-medium text-slate-400">Pilih Device Kamera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={async (e) => {
                      setSelectedCameraId(e.target.value);
                      if (isScanning) {
                        await stopScanner();
                        setTimeout(() => startScanner(), 300);
                      }
                    }}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-rose-950/80 border-t border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Hardware Barcode Scanner & Manual NISN Input */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Input Barcode Scanner Fisik / Manual NISN
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Tekan Enter setelah scan</span>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={barcodeInputRef}
                    id="hardware-barcode-listener-input"
                    type="text"
                    placeholder="Tembak scanner di sini atau ketik NISN..."
                    value={manualNisn}
                    onChange={(e) => setManualNisn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualNisn.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                >
                  Catat Hadir
                </button>
              </form>

              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kamera HP</span>
                </div>
                <div className="flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span>Webcam Laptop</span>
                </div>
                <div className="flex items-center gap-1 text-purple-700 font-semibold">
                  <Barcode className="w-3.5 h-3.5 text-purple-600" />
                  <span>Scanner Gun USB/Bluetooth</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Scan Result Banner & Live Scan Activity Feed (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Live Result Banner */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Hasil Scan Terkini</span>
                {lastScannedEntry && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {lastScannedEntry.timestamp}
                  </span>
                )}
              </h4>

              {lastScannedEntry ? (
                <div
                  className={`p-3.5 rounded-xl border flex gap-3 transition-all ${
                    lastScannedEntry.isDuplicate
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <img
                    src={
                      lastScannedEntry.student.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        lastScannedEntry.student.name
                      )}&background=4f46e5&color=fff&size=120&bold=true`
                    }
                    alt={lastScannedEntry.student.name}
                    className="w-14 h-18 object-cover rounded-lg border border-slate-300 bg-white shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-extrabold text-sm truncate block leading-tight">
                        {lastScannedEntry.student.name}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                          lastScannedEntry.isDuplicate
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {lastScannedEntry.isDuplicate ? 'Sudah Hadir' : lastScannedEntry.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono">
                      NISN: <strong>{lastScannedEntry.student.nisn || '-'}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Kelas: <strong>{lastScannedEntry.className}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{lastScannedEntry.timestamp}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold">Belum ada siswa yang di-scan</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Arahkan kartu ke kamera atau tembak dengan barcode scanner
                  </p>
                </div>
              )}

              {/* Status Message Notification */}
              {statusMessage && (
                <div
                  className={`mt-3 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : statusMessage.type === 'warning'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{statusMessage.text}</span>
                </div>
              )}
            </div>

            {/* Session Scans Activity Feed */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Riwayat Scan Sesi Ini ({recentLogs.length})
                </h4>
                {recentLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecentLogs([])}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    Bersihkan List
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
                {recentLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Riwayat scan sesi ini akan muncul di sini secara real-time.
                  </div>
                ) : (
                  recentLogs.map((log, index) => (
                    <div
                      key={index}
                      className="p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-150 flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {recentLogs.length - index}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{log.student.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {log.className} &bull; {log.student.nisn || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            log.isDuplicate
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.isDuplicate ? 'Duplikat' : log.status}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">{log.timestamp}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>
              Siswa tercatat otomatis terverifikasi dan langsung tersinkronisasi ke database.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Selesai & Tutup Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
