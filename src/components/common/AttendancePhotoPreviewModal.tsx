import React, { useState, useEffect } from 'react';
import { Attendance, Student, SchoolClass } from '../../types';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  Calendar, 
  User, 
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';

export interface AttendancePhotoPreviewModalProps {
  record?: Attendance | null;
  photoUrl?: string | null;
  student?: Student | null;
  sClass?: SchoolClass | null;
  onClose: () => void;
  onVerify?: (recordId: string, role: 'piket' | 'mapel', status: 'Verified' | 'Rejected') => void;
  canVerify?: boolean;
  verifyRole?: 'piket' | 'mapel';
}

export default function AttendancePhotoPreviewModal({
  record,
  photoUrl,
  student,
  sClass,
  onClose,
  onVerify,
  canVerify = false,
  verifyRole = 'mapel'
}: AttendancePhotoPreviewModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const currentPhoto = photoUrl || record?.photoProof;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentPhoto) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!currentPhoto) return;
    const studentName = student?.name || 'Siswa';
    const dateStr = record?.date || 'Absensi';
    const filename = `Foto_Absensi_${studentName.replace(/\s+/g, '_')}_${dateStr}.png`;

    const a = document.createElement('a');
    a.href = currentPhoto;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn">
      {/* Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col lg:flex-row max-h-[92vh] my-auto">
        
        {/* Photo View Box */}
        <div className="flex-1 bg-slate-950 relative min-h-[320px] md:min-h-[420px] flex items-center justify-center overflow-hidden p-4 select-none group">
          {/* Top Control Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2 pointer-events-auto shadow-lg">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Preview Foto Absensi</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Toolbar Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 pointer-events-auto shadow-lg">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In (+)"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out (-)"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Putar Foto 90°"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset Ukuran"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleDownload}
                title="Unduh Foto Ke Komputer/HP"
                className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unduh</span>
              </button>
            </div>
          </div>

          {/* Main Photo Image */}
          <div className="w-full h-full flex items-center justify-center p-2">
            <img
              src={currentPhoto}
              alt="Bukti Foto Absensi"
              className="max-h-[65vh] max-w-full object-contain transition-transform duration-200 ease-out shadow-2xl rounded-xl"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`
              }}
            />
          </div>

          {/* Mobile close button top-right icon */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 z-30 bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-full shadow-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Metadata & Action Panel */}
        <div className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 md:p-6 flex flex-col justify-between text-slate-200 overflow-y-auto shrink-0">
          <div className="space-y-5">
            {/* Header / Student Info */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                {student?.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg shrink-0">
                    {student?.name?.charAt(0) || 'S'}
                  </div>
                )}
                <div className="text-left space-y-0.5">
                  <h3 className="font-extrabold text-white text-sm line-clamp-1">
                    {student?.name || 'Siswa'}
                  </h3>
                  <p className="text-xs text-amber-400 font-bold">
                    Kelas: {sClass?.name || 'Siswa'}
                  </p>
                  {student?.nisn && (
                    <p className="text-[10px] text-slate-400 font-mono">
                      NISN: {student.nisn}
                    </p>
                  )}
                </div>
              </div>

              {/* Close Button Desktop */}
              <button
                type="button"
                onClick={onClose}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Details Card */}
            <div className="space-y-3 text-left">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rincian Absensi Mandiri</span>
              </h4>

              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Status Diajukan:
                  </span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                    record?.status === 'Hadir' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    record?.status === 'Sakit' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                    record?.status === 'Izin' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {record?.status || 'Hadir'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Tanggal:
                  </span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {record?.date || '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Jam Absen:
                  </span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {record?.timestamp || 'N/A'}
                  </span>
                </div>

                {record?.notes && (
                  <div className="pt-1">
                    <span className="text-slate-400 text-[11px] block mb-1">Keterangan Siswa:</span>
                    <p className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-300 text-xs italic leading-relaxed">
                      "{record.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="space-y-3 text-left">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Status Verifikasi Guru</span>
              </h4>

              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Guru Piket:</span>
                  {record?.isVerifiedByPiket ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
                    </span>
                  ) : record?.verificationStatus === 'Rejected' && !record?.isVerifiedByPiket ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> Ditolak
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" /> Menunggu
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-slate-400">Guru Mapel / Wali:</span>
                  {record?.isVerifiedByMapel ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
                    </span>
                  ) : record?.verificationStatus === 'Rejected' && !record?.isVerifiedByMapel ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> Ditolak
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" /> Menunggu
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Area (Verification Buttons / Close) */}
          <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
            {canVerify && record && onVerify && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 text-left">
                  Tindakan Verifikasi Foto ({verifyRole === 'piket' ? 'Guru Piket' : 'Guru Mapel'}):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onVerify(record.id, verifyRole, 'Verified');
                      onClose();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onVerify(record.id, verifyRole, 'Rejected');
                      onClose();
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Foto</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
