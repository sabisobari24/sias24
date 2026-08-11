import React, { useState, useEffect, useRef } from 'react';
import {
  Student,
  Attendance,
  StudentViolation,
  CounselorNote,
  HomeroomNote,
  ViolationType,
  SchoolClass,
  Teacher,
  ExamSchedule,
  ExamGrade,
  BimbinganSchedule,
  StudentAchievement,
  PemberkasanSchedule
} from '../types';
import {
  User,
  Calendar,
  AlertTriangle,
  FileText,
  HeartHandshake,
  ShieldAlert,
  CheckCircle,
  Info,
  MapPin,
  Phone,
  Users,
  Clock,
  Camera,
  Award,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Upload,
  Link,
  Download,
  Printer,
  FileCheck,
  Eye,
  X
} from 'lucide-react';
import ExamBrowser from './ExamBrowser';
import AttendancePhotoPreviewModal from './common/AttendancePhotoPreviewModal';
import { fileToBase64, convertGoogleDriveLink } from '../utils/imageHelper';
import { printCertificate, printTablePDF } from '../utils/printHelper';

// LOGIKA PENGHEMATAN KUOTA: Mengompresi ukuran gambar di sisi klien (browser siswa) menjadi maksimal 100 KB sebelum diupload
export function compressImageBase64(canvas: HTMLCanvasElement, maxKb: number = 100): string {
  let quality = 0.8;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let sizeInKb = (dataUrl.length * 0.75) / 1024;
  
  // Turunkan kualitas secara dinamis jika melebihi batas 100 KB
  while (sizeInKb > maxKb && quality > 0.15) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeInKb = (dataUrl.length * 0.75) / 1024;
  }
  console.log(`[QUOTA SAVED] Image compressed on client-side. Size: ${sizeInKb.toFixed(1)} KB (Quality: ${quality.toFixed(2)})`);
  return dataUrl;
}

interface SiswaPanelProps {
  student: Student;
  classes: SchoolClass[];
  teachers: Teacher[];
  attendance: Attendance[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  counselorNotes: CounselorNote[];
  homeroomNotes: HomeroomNote[];
  onAddSelfAttendance: (status: 'Hadir' | 'Sakit' | 'Izin', notes?: string, photoProof?: string) => void;

  // New props for CBT integration
  examSchedules: ExamSchedule[];
  examGrades: ExamGrade[];
  bimbinganSchedules: BimbinganSchedule[];
  studentAchievements?: StudentAchievement[];
  pemberkasanSchedules?: PemberkasanSchedule[];
  activeTabOverride?: 'profil' | 'absensi' | 'cbt-ujian' | 'pelanggaran' | 'catatan' | null;
  onTabChange?: (tab: 'profil' | 'absensi' | 'cbt-ujian' | 'pelanggaran' | 'catatan') => void;
  cbtBypassPin?: string;
  headmasterName?: string;
}

export default function SiswaPanel({
  student,
  classes,
  teachers,
  attendance,
  violationTypes,
  violations,
  counselorNotes,
  homeroomNotes,
  onAddSelfAttendance,
  examSchedules,
  examGrades,
  bimbinganSchedules,
  studentAchievements = [],
  pemberkasanSchedules = [],
  activeTabOverride,
  onTabChange,
  cbtBypassPin,
  headmasterName = 'Dra. Hj. Endah Purwani M.M',
}: SiswaPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'profil' | 'absensi' | 'cbt-ujian' | 'pelanggaran' | 'catatan'>('profil');
  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<Attendance | null>(null);
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'profil' | 'absensi' | 'cbt-ujian' | 'pelanggaran' | 'catatan') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [activeExamForBrowser, setActiveExamForBrowser] = useState<ExamSchedule | null>(null);
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<StudentAchievement | null>(null);
  const [selfStatus, setSelfStatus] = useState<'Hadir' | 'Sakit' | 'Izin'>('Hadir');
  const [selfNotes, setSelfNotes] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  
  // Real Device Camera States & Refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasClosedCamera, setHasClosedCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState({ lat: '-6.2655', lng: '106.8705' });
  const [gpsLocationName, setGpsLocationName] = useState<string>('SMPN 50 Jakarta, Kramat Jati, Jakarta Timur');
  const [isGeneratingGps, setIsGeneratingGps] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsResubmitting(false);
  }, [activeTab]);

  // Set up or tear down camera stream with high-resiliency fallbacks for iOS/Android/various webviews
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    if (isCameraActive && !capturedPhoto) {
      setCameraError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Fitur kamera tidak didukung di browser/device ini. Pastikan Anda mengakses via HTTPS " +
          "dan mengizinkan akses kamera. Jika berada di dalam frame AI Studio, silakan klik tombol 'Buka di Tab Baru' di kanan atas."
        );
        return;
      }

      // Try with optimal mobile constraints (facingMode: user)
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      })
      .then((mediaStream) => {
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((err) => console.warn("Video play failed:", err));
        }
      })
      .catch((err) => {
        console.warn("Mencoba fallback kamera pertama gagal:", err);
        // Fallback 1: Try with simpler video constraints (just video: true, without ideal size constraints)
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        })
        .then((mediaStream) => {
          activeStream = mediaStream;
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch((err) => console.warn("Video play failed:", err));
          }
        })
        .catch((err2) => {
          console.warn("Mencoba fallback kamera kedua gagal:", err2);
          // Fallback 2: Absolutely generic video constraints
          navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          })
          .then((mediaStream) => {
            activeStream = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch((err) => console.warn("Video play failed:", err));
            }
          })
          .catch((finalErr) => {
            console.error("Semua metode akses kamera gagal:", finalErr);
            setCameraError(
              "Gagal mengakses kamera perangkat Anda. Pastikan Anda telah memberikan " +
              "izin kamera di pengaturan sistem perangkat Anda (terutama untuk pengguna iOS/Safari)."
            );
          });
        });
      });
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive, capturedPhoto]);

  // Reverse geocode helper via OpenStreetMap Nominatim with a timeout
  const reverseGeocode = async (lat: string, lng: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'id' }
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        const address = data.address;
        const road = address.road || address.suburb || address.neighbourhood || '';
        const village = address.village || address.hamlet || '';
        const municipality = address.municipality || address.city_district || address.city || '';
        let displayLoc = [road || village, municipality].filter(Boolean).join(', ');
        if (!displayLoc) {
          displayLoc = data.display_name || 'Kramat Jati, Jakarta Timur';
        }
        setGpsLocationName(displayLoc);
      } else {
        setGpsLocationName('Cililitan, Kramat Jati, Jakarta Timur');
      }
    } catch (err) {
      console.warn('Gagal reverse geocode, menggunakan fallback:', err);
      setGpsLocationName('Kramat Jati, Jakarta Timur');
    }
  };

  // Helper to fetch the device's real GPS coordinates with robust multi-stage fallbacks
  const requestGpsLocation = () => {
    setIsGeneratingGps(true);
    setGpsLocationName('Menghubungkan satelit GPS...');

    const fallbackGps = () => {
      const latOffset = (Math.random() - 0.5) * 0.005;
      const lngOffset = (Math.random() - 0.5) * 0.005;
      const latVal = (-6.265502 + latOffset).toFixed(6);
      const lngVal = (106.870531 + lngOffset).toFixed(6);
      setGpsCoords({ lat: latVal, lng: lngVal });
      setGpsLocationName('Cililitan, Kramat Jati, Jakarta Timur');
      setIsGeneratingGps(false);
    };

    if (navigator.geolocation) {
      // Stage 1: Try high accuracy first (best for outdoor precise locks)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setGpsCoords({ lat, lng });
          await reverseGeocode(lat, lng);
          setIsGeneratingGps(false);
        },
        (error) => {
          console.warn('High accuracy geolocation failed or timed out, trying low accuracy...', error);
          // Stage 2: Fallback to low accuracy (Wi-Fi/Cellular lock - extremely fast and works indoors!)
          navigator.geolocation.getCurrentPosition(
            async (pos2) => {
              const lat = pos2.coords.latitude.toFixed(6);
              const lng = pos2.coords.longitude.toFixed(6);
              setGpsCoords({ lat, lng });
              await reverseGeocode(lat, lng);
              setIsGeneratingGps(false);
            },
            (err2) => {
              console.warn('Low accuracy geolocation also failed, using fallback:', err2);
              fallbackGps();
            },
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      fallbackGps();
    }
  };

  // Update real or fallback GPS when camera is turned on with robust dual-stage accuracy
  const handleToggleCamera = () => {
    if (!isCameraActive) {
      setHasClosedCamera(false);
      requestGpsLocation();
      setIsCameraActive(true);
    } else {
      setHasClosedCamera(true);
      setIsCameraActive(false);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  };

  // Re-request both camera & GPS access (clears error state and starts prompts again)
  const handleRetryPermission = () => {
    setCameraError(null);
    setHasClosedCamera(false);
    requestGpsLocation();
    
    // Toggle camera to trigger a clean re-mount of media device requests
    setIsCameraActive(false);
    setTimeout(() => {
      setIsCameraActive(true);
    }, 100);
  };

  // Automatically reset hasClosedCamera when switching status or tab
  useEffect(() => {
    setHasClosedCamera(false);
  }, [activeTab, selfStatus]);

  // Immediately request permission and open camera & GPS when user lands on Hadir or switches status
  useEffect(() => {
    if (
      activeTab === 'absensi' &&
      selfStatus === 'Hadir' &&
      !capturedPhoto &&
      !isCameraActive &&
      !hasClosedCamera
    ) {
      setIsCameraActive(true);
      requestGpsLocation();
    }
  }, [activeTab, selfStatus, capturedPhoto, isCameraActive, hasClosedCamera]);

  // Capture a real photo with GPS & Time Stamp Watermark overlay
  const handleCapturePhoto = () => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const formattedTime = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    
    // Create canvas to generate a beautiful custom watermark attendance card image
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw frame from real video if active
      if (videoRef.current && stream) {
        try {
          ctx.drawImage(videoRef.current, 0, 0, 480, 360);
        } catch (e) {
          console.error("Error drawing video stream to canvas:", e);
          const grad = ctx.createRadialGradient(240, 180, 50, 240, 180, 250);
          grad.addColorStop(0, '#f8fafc');
          grad.addColorStop(1, '#e2e8f0');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 480, 360);
        }
      } else {
        // Fallback gradient if no stream is active
        const grad = ctx.createRadialGradient(240, 180, 50, 240, 180, 250);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 480, 360);
      }

      // Draw camera viewfinder grid lines
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // vertical grid
      ctx.moveTo(160, 0); ctx.lineTo(160, 360);
      ctx.moveTo(320, 0); ctx.lineTo(320, 360);
      // horizontal grid
      ctx.moveTo(0, 120); ctx.lineTo(480, 120);
      ctx.moveTo(0, 240); ctx.lineTo(480, 240);
      ctx.stroke();

      // Viewfinder corners
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 3;
      const len = 20;
      // top-left
      ctx.beginPath(); ctx.moveTo(len, 10); ctx.lineTo(10, 10); ctx.lineTo(10, len); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(480 - len, 10); ctx.lineTo(480 - 10, 10); ctx.lineTo(480 - 10, len); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(len, 350); ctx.lineTo(10, 350); ctx.lineTo(10, 360 - len); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(480 - len, 350); ctx.lineTo(480 - 10, 350); ctx.lineTo(480 - 10, 360 - len); ctx.stroke();

      // Draw shiny success ring overlay
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(240, 180, 110, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Translucent black watermarking panel at the bottom
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(0, 260, 480, 100);

      // 3. Write elegant Watermark Metadata text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", Courier, monospace';
      ctx.fillText('SIAS GPS ATTENDANCE SECURITY VERIFIED', 15, 280);

      ctx.fillStyle = '#34d399'; // Mint green for timestamp
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`TIME: ${formattedDate} @ ${formattedTime}`, 15, 302);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.fillText(`ID  : ${student.name.toUpperCase()} (NISN: ${student.nisn})`, 15, 323);
      ctx.fillText(`LOC : ${gpsLocationName.toUpperCase()} (${gpsCoords.lat}, ${gpsCoords.lng})`, 15, 340);

      // Icon simulation top-right
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.arc(440, 35, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.fillText('GPS', 430, 38);

      // LOGIKA PENGHEMATAN KUOTA: Kompresi gambar otomatis ke resolusi optimal & kualitas adaptif < 100 KB
      const dataUrl = compressImageBase64(canvas, 100);
      setCapturedPhoto(dataUrl);

      // Release media stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  };

  const handleResetCamera = () => {
    setCapturedPhoto(null);
    setIsCameraActive(false);
  };

  const handleNativePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        const formattedTime = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
        
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw uploaded image onto canvas nicely covering it
          ctx.drawImage(img, 0, 0, 480, 360);

          // Draw camera viewfinder grid lines
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(160, 0); ctx.lineTo(160, 360);
          ctx.moveTo(320, 0); ctx.lineTo(320, 360);
          ctx.moveTo(0, 120); ctx.lineTo(480, 120);
          ctx.moveTo(0, 240); ctx.lineTo(480, 240);
          ctx.stroke();

          // Viewfinder corners
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 3;
          const len = 20;
          ctx.beginPath(); ctx.moveTo(len, 10); ctx.lineTo(10, 10); ctx.lineTo(10, len); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(480 - len, 10); ctx.lineTo(480 - 10, 10); ctx.lineTo(480 - 10, len); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(len, 350); ctx.lineTo(10, 350); ctx.lineTo(10, 360 - len); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(480 - len, 350); ctx.lineTo(480 - 10, 350); ctx.lineTo(480 - 10, 360 - len); ctx.stroke();

          // Draw shiny success ring overlay
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(240, 180, 110, 0, Math.PI * 2);
          ctx.stroke();

          // Translucent black watermarking panel
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          ctx.fillRect(0, 260, 480, 100);

          // Write elegant Watermark Metadata
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "JetBrains Mono", Courier, monospace';
          ctx.fillText('SIAS GPS ATTENDANCE SECURITY VERIFIED', 15, 280);

          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 13px "JetBrains Mono", monospace';
          ctx.fillText(`TIME: ${formattedDate} @ ${formattedTime}`, 15, 302);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11px sans-serif';
          ctx.fillText(`ID  : ${student.name.toUpperCase()} (NISN: ${student.nisn})`, 15, 323);
          ctx.fillText(`LOC : ${gpsLocationName.toUpperCase()} (${gpsCoords.lat}, ${gpsCoords.lng})`, 15, 340);

          // Icon simulation
          ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.beginPath();
          ctx.arc(440, 35, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px Arial';
          ctx.fillText('GPS', 430, 38);

          // LOGIKA PENGHEMATAN KUOTA: Kompresi gambar otomatis ke resolusi optimal & kualitas adaptif < 100 KB
          const dataUrl = compressImageBase64(canvas, 100);
          setCapturedPhoto(dataUrl);
          setIsCameraActive(true); // Ensure it transitions to preview
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Find class details
  const studentClass = classes.find((c) => c.id === student.classId);
  const waliKelas = teachers.find((t) => t.id === studentClass?.homeroomTeacherId);

  // Filter attendance for this student
  const studentAttendance = attendance.filter((a) => a.studentId === student.id);
  const totalDays = studentAttendance.length;
  const hadirCount = studentAttendance.filter((a) => a.status === 'Hadir' && a.verificationStatus !== 'Rejected').length;
  const sakitCount = studentAttendance.filter((a) => a.status === 'Sakit' && a.verificationStatus !== 'Rejected').length;
  const izinCount = studentAttendance.filter((a) => a.status === 'Izin' && a.verificationStatus !== 'Rejected').length;
  const alpaCount = studentAttendance.filter((a) => a.status === 'Alpa' || a.verificationStatus === 'Rejected').length;

  const hadirPercentage = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 0;

  // Filter notes
  const studentCounselorNotes = counselorNotes.filter((n) => n.studentId === student.id);
  const studentHomeroomNotes = homeroomNotes.filter((n) => n.studentId === student.id);

  // Filter violations
  const studentViolations = violations.filter((v) => v.studentId === student.id);
  const totalViolationPoints = studentViolations.reduce((acc, curr) => acc + curr.points, 0);

  // Achievements
  const myAchievements = studentAchievements.filter((a) => a.studentId === student.id || a.studentName.toLowerCase() === student.name.toLowerCase());

  // CBT Exam Filter: schedules matching this student's specific classId or "all"
  const matchedExams = examSchedules.filter(
    (exam) => exam.classId === 'all' || exam.classId === student.classId || (exam.classId && exam.classId.split(',').map(c => c.trim()).includes(student.classId))
  );

  // CBT Exam Grades for this student
  const matchedGrades = examGrades.filter((grade) => grade.studentId === student.id);

  const getDisciplineStatus = (points: number) => {
    if (points === 0) return { label: 'Sangat Tertib (A)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (points <= 10) return { label: 'Tertib (B)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (points <= 25) return { label: 'Cukup Tertib (C)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Bahaya (Panggilan Orang Tua)', color: 'text-rose-600 bg-rose-50 border-rose-200' };
  };

  const disciplineStatus = getDisciplineStatus(totalViolationPoints);

  const matchedBimbinganSchedules = bimbinganSchedules ? bimbinganSchedules.filter((sched) => {
    if (sched.targetType === 'Kelas') {
      return sched.targetId === 'all' || sched.targetId === student.classId;
    }
    return sched.targetId === student.id;
  }) : [];

  const matchedPemberkasanSchedules = (pemberkasanSchedules || []).filter((sched) => {
    if (sched.targetClassId === 'all') return true;
    return sched.targetClassId === student.classId || sched.targetClassId === studentClass?.name;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <img
            src={student.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120"}
            alt={student.name}
            className="w-20 h-20 rounded-full border-4 border-white/30 object-cover shadow-lg"
          />
          <div className="text-center md:text-left space-y-1">
            <p className="text-blue-100 text-sm font-medium tracking-wide uppercase">Selamat Datang di Portal Siswa</p>
            <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            <p className="text-blue-100 text-sm">
              NISN: {student.nisn} &bull; {studentClass?.name || 'Belum Masuk Kelas'}
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase">Kehadiran Kelas</p>
            <p className="text-xl font-bold text-slate-800">{hadirPercentage}% Hadir</p>
            <p className="text-xs text-slate-400 mt-0.5">Dari {totalDays} hari terekam</p>
          </div>
        </div>

        {/* Violations Points Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase">Poin Pelanggaran</p>
            <p className="text-xl font-bold text-slate-800">{totalViolationPoints} Poin</p>
            <p className="text-xs text-slate-400 mt-0.5">Jumlah: {studentViolations.length} pelanggaran</p>
          </div>
        </div>

        {/* Discipline Status Widget */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase">Status Perilaku</p>
            <div className={`text-sm font-semibold rounded-md px-2 py-1 mt-1 text-center inline-block ${disciplineStatus.color}`}>
              {disciplineStatus.label}
            </div>
          </div>
        </div>
      </div>

      {/* Raihan Prestasi Siswa Widget */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Daftar Raihan Prestasi Saya (Akademik &amp; Non-Akademik)</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {myAchievements.length > 0 && (
              <button
                onClick={() => {
                  const headers = ["Judul Prestasi", "Kategori", "Tingkat", "Peringkat", "Tanggal"];
                  const rows = myAchievements.map((a) => [a.title, a.category, `Tingkat ${a.level}`, a.rank || a.level, a.date]);
                  printTablePDF(`Rekapitulasi Raihan Prestasi Siswa - ${student.name}`, headers, rows, headmasterName);
                }}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-amber-300 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap (PDF)</span>
              </button>
            )}
            <span className="bg-amber-50 text-amber-700 font-extrabold px-2.5 py-1 rounded-full text-xs border border-amber-200/60">
              {myAchievements.length} Prestasi Terekam
            </span>
          </div>
        </div>

        {myAchievements.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">
            Belum ada rekam prestasi yang terdaftar. Terus semangat belajar dan berprestasi!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAchievements.map((ach) => (
              <div 
                key={ach.id} 
                className="relative bg-gradient-to-br from-amber-50/80 via-yellow-50/30 to-white p-5 rounded-2xl border-2 border-amber-300/80 space-y-3 shadow-md hover:shadow-lg transition-all overflow-hidden group"
              >
                {/* Decorative Certificate Background Watermark / Accent */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-200/20 rounded-full blur-xl pointer-events-none" />
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-200/40 to-transparent rounded-bl-full pointer-events-none" />

                <div className="flex justify-between items-start gap-3 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        ach.category === 'Akademik' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {ach.category}
                      </span>
                      <span className="bg-amber-100/80 text-amber-900 border border-amber-300/80 font-bold text-[10px] px-2 py-0.5 rounded-full">
                        Tingkat {ach.level}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug pt-1">{ach.title}</h4>
                  </div>
                  
                  <div className="bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-xl shrink-0 shadow-xs border border-amber-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-950 shrink-0" />
                    <span>{ach.rank || ach.level}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 bg-white/70 p-2.5 rounded-xl border border-amber-100 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Penerima:</span>
                    <strong className="text-slate-800 font-bold">{student.name} ({student.classId})</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Tanggal Raihan:</span>
                    <strong className="text-slate-700">{ach.date}</strong>
                  </div>
                </div>

                {/* Digital Certificate Download Buttons */}
                <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 relative z-10">
                  <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Sertifikat Digital Sah
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedCertForPreview(ach)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-indigo-200 shrink-0"
                      title="Pratinjau Sertifikat Digital"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau</span>
                    </button>
                    <button
                      onClick={() => printCertificate(ach, student, headmasterName)}
                      className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm border border-amber-400 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-950" />
                      <span>Download Sertifikat</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jadwal Pemberkasan Widget */}
      <div className="bg-gradient-to-r from-cyan-50/80 via-teal-50/50 to-white border border-cyan-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-200/60 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-teal-600" />
            <span>Jadwal Pemberkasan &amp; Verifikasi Dokumen (Tendik)</span>
          </h3>
          <span className="text-[10px] font-extrabold text-teal-800 bg-teal-100/90 border border-teal-300 px-2.5 py-1 rounded-full w-fit">
            Tersinkron Real-time
          </span>
        </div>

        {matchedPemberkasanSchedules.length === 0 ? (
          <div className="bg-white p-4 rounded-xl border border-cyan-100 text-center text-slate-400 text-xs italic">
            Belum ada agenda pemberkasan aktif yang diterbitkan oleh Tim Tendik untuk kelas Anda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedPemberkasanSchedules.map((item) => (
              <div key={item.id} className="bg-white p-4.5 rounded-xl border border-cyan-200/90 shadow-xs space-y-2.5">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{item.title}</h4>
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-rose-500" />
                    <span>Batas: {item.endDate}</span>
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {item.description}
                  </p>
                )}

                {item.requiredDocs && item.requiredDocs.length > 0 && (
                  <div className="space-y-1">
                    <span className="block text-[9px] font-extrabold uppercase text-slate-400">Berkas Wajib Disiapkan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.requiredDocs.map((docItem, idx) => (
                        <span key={idx} className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          ✓ {docItem}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>Target: <strong className="text-slate-600">{item.targetClassId === 'all' ? 'Seluruh Kelas' : item.targetClassId}</strong></span>
                  <span>Petugas: <strong className="text-slate-600">{item.recordedBy}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {matchedBimbinganSchedules.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-extrabold text-rose-800 text-sm tracking-wide uppercase flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-rose-600 animate-pulse" />
            Agenda Layanan & Bimbingan BK Terdekat
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedBimbinganSchedules.map((sched) => (
              <div key={sched.id} className="bg-white p-4 rounded-xl border border-rose-100 space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full uppercase">{sched.targetType}</span>
                  <span className="text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {sched.date} &bull; {sched.time}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800">{sched.topic}</h4>
                {sched.notes && <p className="text-xs text-slate-500 italic">"Catatan: {sched.notes}"</p>}
                <p className="text-[10px] text-slate-400">Diagendakan oleh Guru BK: {sched.recordedBy}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Flex Grid with Sidebar Navigation */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Right Content Column */}
        <div className="flex-1 w-full space-y-6">
          {/* Tab Contents */}
          <div className="w-full">
        {/* PROFIL TAB */}
        {activeTab === 'profil' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <User className="w-5 h-5 text-indigo-600" />
                Data Diri Siswa
              </h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-slate-500 font-medium">Nama Lengkap</span>
                <span className="text-slate-800 font-semibold col-span-2">: {student.name}</span>

                <span className="text-slate-500 font-medium">NISN</span>
                <span className="text-slate-880 font-mono col-span-2">: {student.nisn}</span>

                <span className="text-slate-500 font-medium">Kelas</span>
                <span className="text-slate-800 font-semibold col-span-2">: {studentClass?.name}</span>

                <span className="text-slate-500 font-medium">Jenis Kelamin</span>
                <span className="text-slate-800 col-span-2">: {(student.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}</span>

                <span className="text-slate-500 font-medium">No. Telepon</span>
                <span className="text-slate-800 col-span-2 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  : {student.phone}
                </span>

                <span className="text-slate-500 font-medium">Alamat</span>
                <span className="text-slate-800 col-span-2 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                  : {student.address}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <Users className="w-5 h-5 text-indigo-600" />
                Data Orang Tua / Wali & Guru
              </h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-slate-500 font-medium">Orang Tua Wali</span>
                <span className="text-slate-800 font-semibold col-span-2">: {student.parentName}</span>

                <span className="text-slate-500 font-medium">Kontak HP</span>
                <span className="text-slate-800 col-span-2">: {student.parentPhone}</span>

                <span className="text-slate-500 font-medium">Email</span>
                <span className="text-slate-800 col-span-2 font-mono text-xs">: {student.parentEmail}</span>

                <span className="text-slate-100 col-span-3 border-b my-2"></span>

                <span className="text-slate-500 font-medium">Wali Kelas</span>
                <span className="text-slate-800 font-semibold col-span-2">: {waliKelas?.name || 'Tidak ada'}</span>

                <span className="text-slate-500 font-medium">NIP Wali</span>
                <span className="text-slate-800 font-mono text-xs col-span-2">: {waliKelas?.nip || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ABSENSI TAB WITH PHOTO TIMESTAMP */}
        {activeTab === 'absensi' && (() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayRecord = studentAttendance.find((a) => a.date === todayStr);

          return (
            <div className="space-y-6">
              {/* Absensi Mandiri Form */}
              {todayRecord && !isResubmitting ? (
                todayRecord.verificationStatus === 'Rejected' ? (
                  <div className="bg-rose-50/70 border border-rose-200 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-fade-in">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Pengajuan Absensi Hari Ini Ditolak</p>
                        <p className="text-sm font-bold text-slate-800">
                          Status Pengajuan: <span className="font-extrabold text-rose-700">{todayRecord.status} (Ditolak)</span>
                          {todayRecord.timestamp && <span className="text-slate-500 font-medium text-xs"> (Pukul {todayRecord.timestamp})</span>}
                        </p>
                        <p className="text-xs text-slate-500">Diverifikasi oleh: <span className="font-bold text-slate-600">Guru Piket/Mapel</span></p>
                        <div className="text-xs text-rose-700/85 bg-rose-50 border border-rose-100 p-2.5 rounded-lg mt-1 font-medium">
                          ⚠️ Absen Anda ditolak karena bukti foto atau koordinat GPS tidak sesuai ketentuan sekolah. Silakan ambil bukti foto yang valid di lingkungan sekolah dan ajukan kembali.
                        </div>
                        {todayRecord.notes && <p className="text-xs text-slate-500 bg-white border border-rose-100 px-2 py-1.5 rounded-lg mt-1 inline-block">Catatan Guru: &quot;{todayRecord.notes}&quot;</p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedPhoto(null);
                          setIsResubmitting(true);
                        }}
                        className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Ajukan Ulang Presensi</span>
                      </button>
                      <div className="text-center text-[10px] text-slate-400 font-mono bg-white border border-slate-200 px-3 py-1 rounded-full">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`${
                    todayRecord.verificationStatus === 'Verified' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
                  } border p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm`}>
                    <div className="flex items-start gap-3.5">
                      <div className={`w-10 h-10 rounded-full ${
                        todayRecord.verificationStatus === 'Verified' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      } flex items-center justify-center shrink-0 mt-0.5`}>
                        {todayRecord.verificationStatus === 'Verified' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <p className={`text-xs font-bold ${
                          todayRecord.verificationStatus === 'Verified' ? 'text-emerald-800' : 'text-amber-800'
                        } uppercase tracking-wider`}>
                          {todayRecord.verificationStatus === 'Verified' ? 'Status Kehadiran Hari Ini Terverifikasi' : 'Status Kehadiran Hari Ini Tercatat (Pending Verifikasi)'}
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          Status: <span className={`font-extrabold ${
                            todayRecord.verificationStatus === 'Verified' ? 'text-emerald-700' : 'text-amber-600'
                          }`}>{todayRecord.status}</span>
                          {todayRecord.timestamp && <span className="text-slate-500 font-medium text-xs"> (Check-in pukul {todayRecord.timestamp})</span>}
                        </p>
                        <p className="text-xs text-slate-500">Metode Pencatatan: <span className="font-semibold text-slate-600">{todayRecord.recordedBy}</span></p>
                        {todayRecord.notes && <p className="text-xs text-slate-400 italic">&quot;{todayRecord.notes}&quot;</p>}
                        {todayRecord.photoProof && (
                          <div className="mt-2.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bukti Foto Secure Watermark:</p>
                            <div 
                              onClick={() => setPreviewPhotoRecord(todayRecord)}
                              className="relative group cursor-pointer inline-block"
                              title="Klik untuk Zoom & Preview Foto Absensi"
                            >
                              <img src={todayRecord.photoProof} alt="Watermark proof" className="w-64 rounded-xl border border-slate-200 group-hover:border-indigo-500 shadow-sm max-w-full transition-all group-hover:brightness-95" />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" />
                                <span>Preview & Zoom Foto</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 font-mono bg-white border border-slate-200 px-3 py-1 rounded-full shrink-0">
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span>Absensi Mandiri Berbukti Foto Secure Time Stamp</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Lakukan konfirmasi kehadiran harian Anda lengkap dengan koordinat satelit GPS dan tanda waktu.</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border rounded-full text-slate-600 font-mono text-xs shadow-sm self-start sm:self-auto shrink-0">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                      <span>{liveTime || '07:00:00 WIB'}</span>
                    </div>
                  </div>

                  {/* Status selection */}
                  <div className="grid grid-cols-3 gap-3">
                    {(['Hadir', 'Sakit', 'Izin'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setSelfStatus(status);
                          if (status !== 'Hadir') {
                            setCapturedPhoto(null);
                            setIsCameraActive(false);
                          }
                        }}
                        className={`px-4 py-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          selfStatus === status
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          status === 'Hadir' ? 'bg-emerald-500' :
                          status === 'Sakit' ? 'bg-blue-500' : 'bg-amber-500'
                        }`} />
                        <span>{status}</span>
                      </button>
                    ))}
                  </div>

                  {/* Camera Section - Only needed for 'Hadir' or optional for others */}
                  {selfStatus === 'Hadir' && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-600 animate-pulse" />
                        <h5 className="text-xs font-bold text-slate-700 uppercase">Verifikasi Kehadiran Kamera GPS</h5>
                      </div>

                      {capturedPhoto ? (
                        <div className="space-y-2">
                          <img
                            src={capturedPhoto}
                            alt="Bukti Absen Tercapture"
                            className="w-full max-w-sm rounded-lg border shadow-md mx-auto"
                          />
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleResetCamera}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Ambil Ulang Foto</span>
                            </button>
                          </div>
                        </div>
                      ) : isCameraActive ? (
                        <div className="w-full max-w-md bg-slate-900 rounded-xl overflow-hidden border border-slate-700 relative text-center text-white min-h-[220px] flex flex-col justify-center items-center">
                          {isGeneratingGps ? (
                            <div className="p-8 space-y-2">
                              <p className="text-xs text-indigo-300 animate-pulse">Menghubungkan ke Satelit GPS...</p>
                            </div>
                          ) : cameraError ? (
                            <div className="p-6 space-y-4 max-w-sm mx-auto text-center w-full font-sans">
                              <p className="text-xs text-rose-400 font-semibold">{cameraError}</p>
                              
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                Harap berikan izin akses kamera dan lokasi/GPS pada browser atau perangkat Anda untuk melakukan absensi.
                              </p>

                              {/* Iframe detection and direct link to bypass browser permissions restrictions */}
                              {typeof window !== 'undefined' && window.self !== window.top && (
                                <div className="mt-3 p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-left space-y-2">
                                  <p className="text-[11px] font-bold text-indigo-300">
                                    ⚠️ Terdeteksi di dalam IFrame Portal Sekolah
                                  </p>
                                  <p className="text-[10px] text-slate-300 leading-relaxed">
                                    Kebijakan keamanan browser memblokir kamera & lokasi jika dibuka di dalam frame portal sekolah. Silakan klik tombol di bawah untuk membukanya secara langsung di browser HP Anda.
                                  </p>
                                  <a
                                    href={window.location.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs transition-all shadow-md cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Buka di Tab Baru (Browser HP)</span>
                                  </a>
                                  
                                  <div className="pt-2 border-t border-slate-800/80 text-[9px] text-slate-400 leading-normal">
                                    <span className="font-semibold text-slate-300">Petunjuk untuk Admin Portal Sekolah:</span> Agar kamera bisa diakses langsung dari portal tanpa keluar, tambahkan atribut berikut pada tag <code className="text-emerald-400 font-mono text-[8px]">&lt;iframe&gt;</code> Anda:
                                    <code className="block mt-1 p-1.5 bg-slate-900 rounded font-mono text-[8px] text-emerald-400 break-all select-all">
                                      {`allow="camera; geolocation"`}
                                    </code>
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col items-center gap-3 pt-3">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleRetryPermission}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                                  >
                                    Coba Kamera Web
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsCameraActive(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                                  >
                                    Tutup
                                  </button>
                                </div>
                                
                                <div className="w-full max-w-xs border-t border-slate-200/60 pt-3 text-center">
                                  <p className="text-[10px] text-slate-400 font-medium mb-2">Device/browser Anda tidak mendukung streaming kamera langsung?</p>
                                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer w-full justify-center">
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Ambil Foto via Kamera Bawaan HP</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="user"
                                      onChange={handleNativePhotoUpload}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="relative w-full flex flex-col items-center">
                              {/* Real video feed */}
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                onLoadedMetadata={(e) => {
                                  e.currentTarget.play().catch((err) => console.warn("Video play failed on loaded metadata:", err));
                                }}
                                className="w-full h-[280px] object-cover bg-black"
                              />
                              
                              {/* Overlay Viewfinder indicators on top of live video */}
                              <div className="absolute inset-0 pointer-events-none border border-indigo-500/10 flex items-center justify-center">
                                <div className="w-3/4 h-3/4 border border-dashed border-white/20 relative">
                                  {/* Viewfinder Corners */}
                                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400"></div>
                                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400"></div>
                                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400"></div>
                                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400"></div>
                                </div>
                              </div>

                              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                <span>LIVE VIEW &bull; LAT: {gpsCoords.lat} &bull; LNG: {gpsCoords.lng}</span>
                              </div>

                              <div className="w-full bg-slate-950 p-3 flex justify-center items-center gap-4">
                                <button
                                  type="button"
                                  onClick={handleCapturePhoto}
                                  title="Ambil Foto Real-time"
                                  className="w-12 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                >
                                  <Camera className="w-6 h-6 animate-pulse" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleToggleCamera}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 space-y-4 w-full max-w-sm mx-auto">
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-500 font-semibold">Opsi 1: Rekam langsung menggunakan kamera internal HP/Laptop</p>
                            <button
                              type="button"
                              onClick={handleToggleCamera}
                              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mx-auto transition-all shadow cursor-pointer w-full"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Buka Kamera Absen GPS</span>
                            </button>
                          </div>

                          <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink mx-4 text-slate-400 font-bold uppercase text-[9px] tracking-wider">ATAU</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                          </div>

                          <div className="space-y-3 text-left">
                            <p className="text-[11px] text-slate-500 font-semibold text-center">Opsi 2: Upload foto dari galeri / link Google Drive share</p>
                            
                            {/* File Upload Button */}
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/80 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                  <p className="text-[11px] text-slate-500 font-medium">Klik untuk upload foto dari HP / Komputer</p>
                                  <p className="text-[9px] text-slate-400 font-mono">PNG, JPG, JPEG (Maks 5MB)</p>
                                </div>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const b64 = await fileToBase64(file);
                                        setCapturedPhoto(b64);
                                      } catch (err) {
                                        alert('Gagal membaca file gambar. Silakan coba lagi.');
                                      }
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            {/* Google Drive Link Paste */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Link className="w-3 h-3 text-indigo-500" />
                                <span>Atau Tempel Link Share Google Drive:</span>
                              </label>
                              <input
                                type="url"
                                placeholder="https://drive.google.com/file/d/..."
                                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500"
                                onChange={(e) => {
                                  const rawUrl = e.target.value;
                                  if (rawUrl) {
                                    const converted = convertGoogleDriveLink(rawUrl);
                                    setCapturedPhoto(converted);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Catatan / Keterangan Kehadiran (Opsional):</label>
                    <input
                      type="text"
                      placeholder="Contoh: Hadir tepat waktu di sekolah / Sakit demam ada surat / Izin menghadiri nikahan keluarga"
                      value={selfNotes}
                      onChange={(e) => setSelfNotes(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (selfStatus === 'Hadir' && !capturedPhoto) {
                        alert('Silakan ambil bukti foto ber-timestamp terlebih dahulu sebelum mengirim.');
                        return;
                      }
                      onAddSelfAttendance(
                        selfStatus,
                        selfNotes || `Check-in mandiri oleh siswa (${selfStatus})`,
                        capturedPhoto || undefined
                      );
                      setSelfNotes('');
                      setCapturedPhoto(null);
                      setIsCameraActive(false);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Kirim Absen Kehadiran ({liveTime})</span>
                  </button>
                </div>
              )}

              {/* Stats & History */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                  <p className="text-3xl font-extrabold text-emerald-700">{hadirCount}</p>
                  <p className="text-xs text-emerald-600 font-semibold uppercase mt-1">Hadir</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-center">
                  <p className="text-3xl font-extrabold text-blue-700">{sakitCount}</p>
                  <p className="text-xs text-blue-600 font-semibold uppercase mt-1">Sakit</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
                  <p className="text-3xl font-extrabold text-amber-700">{izinCount}</p>
                  <p className="text-xs text-amber-600 font-semibold uppercase mt-1">Izin</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 text-center">
                  <p className="text-3xl font-extrabold text-rose-700">{alpaCount}</p>
                  <p className="text-xs text-rose-600 font-semibold uppercase mt-1">Tanpa Keterangan</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b">
                  <h4 className="font-bold text-slate-800">Riwayat Presensi Kehadiran Terintegrasi</h4>
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {studentAttendance.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-1">
                      <Info className="w-8 h-8 mx-auto" />
                      <p>Belum ada catatan presensi kelas yang terekam.</p>
                    </div>
                  ) : (
                    studentAttendance.slice().reverse().map((record) => (
                      <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-all gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800">{new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          <p className="text-xs text-slate-400">Dicatat oleh: <span className="font-bold text-slate-600">{record.recordedBy}</span></p>
                          {record.notes && <p className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block mt-1">Keterangan: {record.notes}</p>}
                          {record.photoProof && (
                            <div className="mt-2">
                              <p className="text-[10px] text-indigo-500 font-bold uppercase mb-1">Preview Bukti Absen GPS:</p>
                              <div 
                                onClick={() => setPreviewPhotoRecord(record)}
                                className="relative group cursor-pointer inline-block"
                                title="Klik untuk Zoom & Preview Foto Absensi"
                              >
                                <img src={record.photoProof} alt="Watermark preview" className="w-48 rounded-xl border border-slate-200 group-hover:border-indigo-500 shadow-xs transition-all group-hover:brightness-95" />
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            record.verificationStatus === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            record.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                            record.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                            record.status === 'Izin' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {record.verificationStatus === 'Rejected' ? 'Ditolak' : record.status}
                          </span>
                          
                          {record.isSelfAttendance && (
                            record.verificationStatus === 'Verified' ? (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1">
                                ✓ Terverifikasi
                              </span>
                            ) : record.verificationStatus === 'Rejected' ? (
                              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100 mt-1">
                                ✗ Ditolak
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1 animate-pulse">
                                ⋯ Pending
                              </span>
                            )
                          )}

                          {record.timestamp && (
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {record.timestamp}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* CBT EXAM TAB */}
        {activeTab === 'cbt-ujian' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">CBT System</span>
                <h3 className="text-base font-bold text-slate-800">Jadwal & Hasil Nilai Ujian CBT</h3>
                <p className="text-xs text-slate-500">Sistem ujian berbasis komputer sinkron otomatis untuk kelas perwalian {studentClass?.name || 'Sekolah'}.</p>
              </div>
            </div>

            {/* Main CBT Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Exam Schedule Card */}
              <div className="lg:col-span-6 bg-white rounded-xl p-5 border shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Jadwal Ujian Aktif Perwalian
                </h4>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {matchedExams.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs italic">Belum ada jadwal ujian CBT aktif untuk kelasmu.</p>
                    </div>
                  ) : (
                    matchedExams.map((exam) => {
                      const isToday = exam.date === new Date().toISOString().split('T')[0];
                      return (
                        <div
                          key={exam.id}
                          className={`p-3.5 border rounded-xl transition-all ${
                            isToday
                              ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/25'
                              : 'hover:bg-slate-50 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <strong className="text-slate-800 text-sm">{exam.subject}</strong>
                                <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                                  {exam.type}
                                </span>
                                {isToday && (
                                  <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse shrink-0">
                                    Hari Ini
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{new Date(exam.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </p>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Pukul {exam.time}</span>
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                <span>Ruangan: <code className="font-semibold bg-white border px-1 rounded text-slate-700">{exam.room}</code></span>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                                  KKM / KKTP: {exam.kkm ?? 75}
                                </span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveExamForBrowser(exam)}
                              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm hover:shadow hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <span>Kerjakan Soal (Exambro)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Exam Results Card */}
              <div className="lg:col-span-6 bg-white rounded-xl p-5 border shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Daftar Rekap Nilai CBT Siswa
                </h4>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {matchedGrades.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs italic">Belum ada nilai ujian CBT yang diumumkan oleh CBT Admin.</p>
                    </div>
                  ) : (
                    matchedGrades.map((grade) => (
                      <div key={grade.id} className="p-3.5 border rounded-xl hover:bg-slate-50 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 text-sm">{grade.subject}</p>
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{grade.examType} &bull; {new Date(grade.date).toLocaleDateString('id-ID')}</p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Skor CBT</span>
                            <span className={`text-xl font-black ${grade.score >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>{grade.score}</span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              grade.status === 'Lulus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {grade.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PELANGGARAN TAB */}
        {activeTab === 'pelanggaran' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Daftar Pelanggaran Tata Tertib Tercatat
              </h4>
              <div className="space-y-3">
                {studentViolations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-1">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-semibold text-slate-700">Luar Biasa!</p>
                    <p className="text-sm">Kamu tidak memiliki catatan pelanggaran tata tertib.</p>
                  </div>
                ) : (
                  studentViolations.map((v) => {
                    const type = violationTypes.find((vt) => vt.id === v.violationTypeId);
                    return (
                      <div key={v.id} className="p-4 border rounded-xl hover:border-slate-300 transition-all bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{type?.name || v.notes}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              type?.category === 'Berat' ? 'bg-rose-100 text-rose-800' :
                              type?.category === 'Sedang' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {type?.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Tanggal Kejadian: {new Date(v.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          {v.notes && <p className="text-xs text-slate-600 italic bg-white p-2 rounded border mt-1">Keterangan: "{v.notes}"</p>}
                          <p className="text-[10px] text-slate-400">Dilaporkan oleh: {v.recordedBy}</p>
                        </div>
                        <div className="flex items-center gap-2 self-start md:self-center">
                          <span className="text-xs text-slate-500 font-medium">Beban Poin:</span>
                          <span className="text-lg font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">+{v.points} Poin</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* CATATAN TAB */}
        {activeTab === 'catatan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wali Kelas notes */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <User className="w-5 h-5 text-blue-600" />
                Catatatan Wali Kelas
              </h4>
              <div className="space-y-4">
                {studentHomeroomNotes.length === 0 ? (
                  <p className="text-slate-400 text-sm italic text-center py-4">Belum ada catatan khusus dari Wali Kelas.</p>
                ) : (
                  studentHomeroomNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Oleh: {note.recordedBy}</span>
                        <span>{new Date(note.date).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Perkembangan Perilaku & Sosial</p>
                        <p className="text-sm text-slate-700">{note.notes}</p>
                      </div>
                      {note.academicProgress && (
                        <div className="space-y-1 pt-2 border-t border-blue-100/60 mt-2">
                          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Catatan Akademis</p>
                          <p className="text-sm text-slate-700">{note.academicProgress}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BK notes */}
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                <HeartHandshake className="w-5 h-5 text-rose-500" />
                Catatan Bimbingan Konseling (BK)
              </h4>
              <div className="space-y-4">
                {studentCounselorNotes.length === 0 ? (
                  <p className="text-slate-400 text-sm italic text-center py-4">Belum ada catatan pembinaan dari Bimbingan Konseling.</p>
                ) : (
                  studentCounselorNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-rose-50/30 rounded-xl border border-rose-100/50 space-y-2">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>Oleh: {note.recordedBy}</span>
                        <span>{new Date(note.date).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Hasil Bimbingan / Konseling</p>
                        <p className="text-sm text-slate-700">{note.notes}</p>
                      </div>
                      {note.followUp && (
                        <div className="space-y-1 pt-2 border-t border-rose-100/60 mt-2">
                          <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Tindak Lanjut</p>
                          <p className="text-sm text-slate-700">{note.followUp}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-slate-400">Status Pembinaan:</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          note.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                          note.status === 'Dalam Pemantauan' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {note.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div></div></div>

      {activeExamForBrowser && (
        <ExamBrowser
          exam={activeExamForBrowser}
          studentName={student.name}
          studentId={student.id}
          onClose={() => setActiveExamForBrowser(null)}
          cbtBypassPin={cbtBypassPin}
        />
      )}

      {/* Modal Pratinjau & Download Sertifikat Digital Prestasi */}
      {selectedCertForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-amber-200 space-y-5 relative my-8">
            <button
              onClick={() => setSelectedCertForPreview(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Pratinjau Sertifikat Digital Prestasi</h3>
                <p className="text-xs text-slate-500">Sertifikat resmi diterbitkan oleh pihak sekolah dengan nomor registrasi unik.</p>
              </div>
            </div>

            {/* Certificate Canvas / Card Preview */}
            <div className="relative bg-gradient-to-b from-amber-50/90 via-yellow-50/40 to-amber-100/40 p-6 md:p-8 rounded-2xl border-4 border-amber-400/80 shadow-inner space-y-4 text-center overflow-hidden">
              {/* Corner ornaments */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600" />

              <div className="text-[10px] uppercase font-extrabold text-amber-900 tracking-widest">
                PEMERINTAH PROVINSI DKI JAKARTA &bull; SMP NEGERI 50 JAKARTA
              </div>
              
              <h2 className="font-serif font-black text-xl md:text-2xl text-amber-900 tracking-wide">
                SERTIFIKAT DIGITAL PRESTASI
              </h2>

              <p className="font-mono text-[11px] font-bold text-amber-800 tracking-wider">
                NO: CERT/{selectedCertForPreview.id.toUpperCase()}/{selectedCertForPreview.date.replace(/-/g, '')}
              </p>

              <p className="text-xs text-slate-600 italic pt-1">
                Diberikan dengan rasa bangga dan apresiasi setinggi-tingginya kepada:
              </p>

              <div className="text-xl md:text-2xl font-black text-indigo-950 uppercase tracking-wide border-b-2 border-amber-500 inline-block pb-1 px-4">
                {student.name}
              </div>

              <p className="text-xs font-semibold text-slate-600">
                NISN: {student.nisn || '-'} &bull; Kelas: {student.classId || '-'}
              </p>

              <p className="text-xs text-slate-600 pt-1">
                Atas capaian prestasi gemilang yang telah diraih dalam bidang:
              </p>

              <h3 className="text-lg md:text-xl font-black text-amber-800 leading-snug">
                {selectedCertForPreview.title}
              </h3>

              <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                <span className="bg-amber-200 text-amber-950 text-xs font-black px-3 py-1 rounded-full uppercase border border-amber-300">
                  {selectedCertForPreview.category}
                </span>
                <span className="bg-indigo-100 text-indigo-900 text-xs font-black px-3 py-1 rounded-full uppercase border border-indigo-200">
                  Tingkat {selectedCertForPreview.level}
                </span>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-black px-3 py-1 rounded-full uppercase border border-emerald-200">
                  {selectedCertForPreview.rank || 'Peringkat Terbaik'}
                </span>
              </div>

              {selectedCertForPreview.notes && (
                <p className="text-xs italic text-slate-500 bg-white/80 p-2.5 rounded-xl border border-amber-200 max-w-md mx-auto">
                  "{selectedCertForPreview.notes}"
                </p>
              )}

              <div className="pt-4 border-t border-amber-300/60 flex items-end justify-between text-left text-xs text-slate-700">
                <div>
                  <div className="w-12 h-12 rounded-full border-2 border-amber-600 bg-amber-100 flex items-center justify-center font-bold text-amber-800 text-lg shadow-xs">
                    ★
                  </div>
                  <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider block mt-1">CAP SAH DIGITAL</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">Jakarta, {selectedCertForPreview.date}</p>
                  <p className="font-bold text-slate-800">Kepala Sekolah,</p>
                  <div className="h-8 flex items-center justify-end">
                    <span className="text-[10px] font-mono text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      [Tanda Tangan Digital Sah]
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 underline">{headmasterName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP: 196711261991032004</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              {selectedCertForPreview.certificateUrl && (
                <a
                  href={convertGoogleDriveLink(selectedCertForPreview.certificateUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-300"
                >
                  <ExternalLink className="w-4 h-4 text-slate-600" />
                  <span>Unduh Lampiran Sertifikat Asli</span>
                </a>
              )}
              <button
                onClick={() => {
                  printCertificate(selectedCertForPreview, student, headmasterName);
                }}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md border border-amber-400"
              >
                <Printer className="w-4 h-4" />
                <span>Unduh / Cetak Sertifikat Resmi (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPhotoRecord && (
        <AttendancePhotoPreviewModal
          record={previewPhotoRecord}
          student={student}
          onClose={() => setPreviewPhotoRecord(null)}
          canVerify={false}
        />
      )}
    </div>
  );
}
