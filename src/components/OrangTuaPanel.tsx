import React, { useState } from 'react';
import { Student, Attendance, StudentViolation, CounselorNote, HomeroomNote, ViolationType, SchoolClass, Teacher, ParentMessage, BimbinganSchedule, StudentAchievement, PemberkasanSchedule } from '../types';
import { User, Calendar, AlertTriangle, FileText, HeartHandshake, CheckCircle2, MessageSquare, Send, Check, RefreshCw, Clock, Award, Download, Sparkles, FileCheck } from 'lucide-react';
import { printCertificate } from '../utils/printHelper';
import AttendancePhotoPreviewModal from './common/AttendancePhotoPreviewModal';

interface OrangTuaPanelProps {
  student: Student;
  classes: SchoolClass[];
  teachers: Teacher[];
  attendance: Attendance[];
  violationTypes: ViolationType[];
  violations: StudentViolation[];
  counselorNotes: CounselorNote[];
  homeroomNotes: HomeroomNote[];
  parentMessages: ParentMessage[];
  studentAchievements?: StudentAchievement[];
  pemberkasanSchedules?: PemberkasanSchedule[];
  onAddParentMessage: (msg: string) => void;
  onAcknowledgeNote: (type: 'homeroom' | 'counselor', noteId: string) => void;
  bimbinganSchedules: BimbinganSchedule[];
  activeTabOverride?: 'profil' | 'absensi' | 'pelanggaran' | 'catatan' | 'komunikasi' | null;
  onTabChange?: (tab: 'profil' | 'absensi' | 'pelanggaran' | 'catatan' | 'komunikasi') => void;
  headmasterName?: string;
}

export default function OrangTuaPanel({
  student,
  classes,
  teachers,
  attendance,
  violationTypes,
  violations,
  counselorNotes,
  homeroomNotes,
  parentMessages,
  studentAchievements = [],
  pemberkasanSchedules = [],
  onAddParentMessage,
  onAcknowledgeNote,
  bimbinganSchedules,
  activeTabOverride,
  onTabChange,
  headmasterName = 'Dra. Hj. Endah Purwani M.M',
}: OrangTuaPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'profil' | 'absensi' | 'pelanggaran' | 'catatan' | 'komunikasi'>('profil');
  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<Attendance | null>(null);
  const activeTab = activeTabOverride ? activeTabOverride : internalActiveTab;
  const setActiveTab = (tab: 'profil' | 'absensi' | 'pelanggaran' | 'catatan' | 'komunikasi') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [newMessage, setNewMessage] = useState('');

  const studentClass = classes.find((c) => c.id === student.classId);
  const waliKelas = teachers.find((t) => t.id === studentClass?.homeroomTeacherId);

  // Stats
  const studentAttendance = attendance.filter((a) => a.studentId === student.id);
  const totalDays = studentAttendance.length;
  const hadirCount = studentAttendance.filter((a) => a.status === 'Hadir').length;
  const sakitCount = studentAttendance.filter((a) => a.status === 'Sakit').length;
  const izinCount = studentAttendance.filter((a) => a.status === 'Izin').length;
  const alpaCount = studentAttendance.filter((a) => a.status === 'Alpa').length;

  const hadirPercentage = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 100;

  const studentViolations = violations.filter((v) => v.studentId === student.id);
  const totalViolationPoints = studentViolations.reduce((sum, v) => sum + v.points, 0);

  const studentCounselorNotes = counselorNotes.filter((c) => c.studentId === student.id);
  const studentHomeroomNotes = homeroomNotes.filter((h) => h.studentId === student.id);
  const studentMessages = parentMessages.filter((m) => m.studentId === student.id);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onAddParentMessage(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Parent Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div>
              <p className="text-orange-100 text-xs font-semibold uppercase tracking-wide">Portal Wali Siswa</p>
              <h1 className="text-2xl font-bold">Bapak/Ibu {student.parentName}</h1>
              <p className="text-orange-100 text-sm">
                Orang Tua Wali dari: <span className="font-bold">{student.name}</span> ({studentClass?.name})
              </p>
            </div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-center">
            <p className="text-xs text-orange-100">Kumulatif Poin Siswa</p>
            <p className="text-2xl font-bold">{totalViolationPoints} Poin</p>
          </div>
        </div>
      </div>

      {/* PROFIL TAB OVERVIEW WIDGETS */}
      {activeTab === 'profil' && (
        <>
          {/* Grid of widgets */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">KEHADIRAN ANAK</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-800">{hadirPercentage}%</span>
                <span className="text-xs text-emerald-600 font-semibold">{hadirCount} Hari Hadir</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Sakit: {sakitCount} | Izin: {izinCount} | Alpa: {alpaCount}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">PELANGGARAN</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-800">{studentViolations.length}</span>
                <span className="text-xs text-slate-400">Kejadian</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Tertinggi: {studentViolations.length > 0 ? Math.max(...studentViolations.map(v => v.points)) + ' pts' : '-'}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">CATATAN GURU</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-800">
                  {studentHomeroomNotes.filter(n => !n.parentAcknowledge).length + studentCounselorNotes.filter(n => !n.parentAcknowledge).length}
                </span>
                <span className="text-xs text-rose-600 font-semibold">Perlu TTD</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Sudah disetujui: {studentHomeroomNotes.filter(n => n.parentAcknowledge).length + studentCounselorNotes.filter(n => n.parentAcknowledge).length}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">KOMUNIKASI AKTIF</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-800">{studentMessages.length}</span>
                <span className="text-xs text-slate-400">Pesan Terkirim</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Klik tab komunikasi untuk kirim pesan</p>
            </div>
          </div>

          {/* Agenda Bimbingan BK Terjadwal */}
          {(() => {
            const myAchievements = studentAchievements.filter((a) => a.studentId === student.id || a.studentName.toLowerCase() === student.name.toLowerCase());
            return (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Raihan Prestasi Putra/Putri Anda (Akademik &amp; Non-Akademik)</span>
                  </h3>
                  <span className="bg-amber-50 text-amber-700 font-extrabold px-2.5 py-1 rounded-full text-xs border border-amber-200/60">
                    {myAchievements.length} Prestasi
                  </span>
                </div>

                {myAchievements.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Belum ada rekam catatan prestasi yang terdaftar.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myAchievements.map((ach) => (
                      <div 
                        key={ach.id} 
                        className="relative bg-gradient-to-br from-amber-50/80 via-yellow-50/30 to-white p-5 rounded-2xl border-2 border-amber-300/80 space-y-3 shadow-md hover:shadow-lg transition-all overflow-hidden group"
                      >
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
                            <span className="text-slate-400">Putra/Putri:</span>
                            <strong className="text-slate-800 font-bold">{student.name} ({student.classId})</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Tanggal Raihan:</span>
                            <strong className="text-slate-700">{ach.date}</strong>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2 relative z-10">
                          <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Sertifikat Digital Resmi
                          </span>

                          <button
                            onClick={() => printCertificate(ach, student, headmasterName)}
                            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border border-amber-400 shrink-0"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-950" />
                            <span>Unduh / Cetak Sertifikat</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Jadwal Pemberkasan & Verifikasi Dokumen dari Tendik */}
          {(() => {
            const matchedPemberkasanSchedules = (pemberkasanSchedules || []).filter((sched) => {
              if (sched.targetClassId === 'all') return true;
              return sched.targetClassId === student.classId || sched.targetClassId === studentClass?.name;
            });

            return (
              <div className="bg-gradient-to-r from-teal-50/80 via-cyan-50/50 to-white border border-teal-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-teal-600" />
                    <span>Jadwal Pemberkasan &amp; Verifikasi Dokumen Resmi Sekolah (Real-time Tendik)</span>
                  </h3>
                  <span className="text-[10px] font-extrabold text-teal-800 bg-teal-100/90 border border-teal-300 px-2.5 py-1 rounded-full w-fit">
                    Tersinkron Otomatis
                  </span>
                </div>

                {matchedPemberkasanSchedules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Belum ada pengumuman pemberkasan dokumen/berkas aktif yang diterbitkan untuk kelas putra/putri Anda.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matchedPemberkasanSchedules.map((item) => (
                      <div key={item.id} className="bg-white p-4.5 rounded-xl border border-teal-200/90 shadow-xs space-y-2.5">
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
                            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Berkas yang Harus Disiapkan Orang Tua:</span>
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
                          <span>Petugas TU: <strong className="text-slate-600">{item.recordedBy}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Agenda Bimbingan BK Terjadwal */}
          {(() => {
            const matchedBimbinganSchedules = bimbinganSchedules ? bimbinganSchedules.filter((sched) => {
              if (sched.targetType === 'Kelas') {
                return sched.targetId === 'all' || sched.targetId === student.classId;
              }
              return sched.targetId === student.id;
            }) : [];

            if (matchedBimbinganSchedules.length === 0) return null;

            return (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-extrabold text-orange-800 text-sm tracking-wide uppercase flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-orange-600 animate-pulse" />
                  Agenda Pertemuan & Bimbingan BK Siswa
                </h3>
                <p className="text-xs text-orange-700/80">
                  Berikut adalah jadwal layanan bimbingan konseling atau koordinasi wali murid yang telah disinkronkan oleh konselor/guru BK sekolah:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedBimbinganSchedules.map((sched) => (
                    <div key={sched.id} className="bg-white p-4 rounded-xl border border-orange-100 space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full uppercase">{sched.targetType}</span>
                        <span className="text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {sched.date} &bull; {sched.time}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800">{sched.topic}</h4>
                      {sched.notes && <p className="text-xs text-slate-500 italic">"Catatan/Lokasi: {sched.notes}"</p>}
                      <p className="text-[10px] text-slate-400">Penyelenggara: {sched.recordedBy} (Guru BK)</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Main Flex Grid with Sidebar Navigation */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Right Content Column */}
        <div className="flex-1 w-full space-y-6">
          {/* Tab Contents */}
          <div className="w-full">
        {activeTab === 'profil' && (
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-base border-b pb-2 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" />
                  Identitas Lengkap Siswa
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <span className="text-slate-800 font-semibold">{student.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">NISN</span>
                    <span className="text-slate-800 font-mono">{student.nisn}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Kelas / Angkatan</span>
                    <span className="text-slate-800 font-semibold">{studentClass?.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Jenis Kelamin</span>
                    <span className="text-slate-800 font-semibold">{(student.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Alamat Tempat Tinggal</span>
                    <span className="text-slate-800 text-right max-w-xs">{student.address}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-base border-b pb-2 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-500" />
                  Kontak Penting & Pihak Sekolah
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Wali Kelas</span>
                    <span className="text-slate-800 font-semibold">{waliKelas?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">NIP Wali Kelas</span>
                    <span className="text-slate-800 font-mono">{waliKelas?.nip || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Email Wali Kelas</span>
                    <span className="text-slate-800 text-xs font-mono">{waliKelas?.email || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Kontak Orang Tua (Anda)</span>
                    <span className="text-slate-800">{student.parentPhone}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Email Terdaftar</span>
                    <span className="text-slate-800 text-xs font-mono">{student.parentEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'absensi' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p className="text-2xl font-bold text-emerald-700">{hadirCount}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase">Hadir</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-2xl font-bold text-blue-700">{sakitCount}</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase">Sakit</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-2xl font-bold text-amber-700">{izinCount}</p>
                <p className="text-[10px] text-amber-600 font-bold uppercase">Izin</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                <p className="text-2xl font-bold text-rose-700">{alpaCount}</p>
                <p className="text-[10px] text-rose-600 font-bold uppercase">Alpa</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <h4 className="font-bold text-slate-800 mb-3">Live Log Presensi Anak</h4>
              <div className="divide-y max-h-[300px] overflow-y-auto space-y-2">
                {studentAttendance.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-4">Belum ada live presensi.</p>
                ) : (
                  studentAttendance.map((rec) => (
                    <div key={rec.id} className="flex justify-between items-center py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-slate-400">Dicatat oleh: {rec.recordedBy}</p>
                        {rec.notes && <p className="text-xs text-blue-600 mt-1">Keterangan: {rec.notes}</p>}
                        {rec.photoProof && (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoRecord(rec)}
                            className="mt-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <span>📷 Lihat Foto Bukti Absen</span>
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          rec.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                          rec.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                          rec.status === 'Izin' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status}
                        </span>
                        {rec.timestamp && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500 animate-pulse" />
                            {rec.timestamp}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pelanggaran' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Catatan Pelanggaran Anak
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Sekolah memberlakukan sistem poin akumulatif. Pelanggaran keras atau poin melebihi batas (misalnya &gt; 35 poin) dapat mengakibatkan pemanggilan orang tua ke sekolah demi kebaikan bimbingan anak.
              </p>

              <div className="space-y-3">
                {studentViolations.length === 0 ? (
                  <div className="text-center p-8 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-bold text-emerald-800">Anak Anda Sangat Disiplin!</p>
                    <p className="text-xs text-emerald-600">Tidak ada poin pelanggaran yang tercatat saat ini.</p>
                  </div>
                ) : (
                  studentViolations.map((v) => {
                    const type = violationTypes.find((vt) => vt.id === v.violationTypeId);
                    return (
                      <div key={v.id} className="p-4 border rounded-lg bg-slate-50 flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800">{type?.name || v.notes}</p>
                          <p className="text-xs text-slate-400">Tanggal: {new Date(v.date).toLocaleDateString('id-ID')}</p>
                          {v.notes && <p className="text-xs text-slate-600 bg-white p-2 rounded border mt-1">"Keterangan guru: {v.notes}"</p>}
                        </div>
                        <span className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded border border-rose-100 shrink-0">+{v.points} Poin</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'catatan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wali Kelas */}
            <div className="bg-white rounded-xl p-5 border space-y-4">
              <h4 className="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                <span>Catatan Wali Kelas</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-normal">Siti Rohmah, S.Pd.</span>
              </h4>

              <div className="space-y-4">
                {studentHomeroomNotes.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-4">Belum ada catatan.</p>
                ) : (
                  studentHomeroomNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-slate-50 rounded-xl space-y-3 border">
                      <div>
                        <p className="text-xs font-semibold text-blue-700">CATATAN PERILAKU</p>
                        <p className="text-sm text-slate-700 mt-1">{note.notes}</p>
                      </div>
                      {note.academicProgress && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 border-t pt-2 mt-2">CATATAN AKADEMIK</p>
                          <p className="text-sm text-slate-700 mt-1">{note.academicProgress}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t flex justify-between items-center">
                        <span className="text-[10px] text-slate-400">{new Date(note.date).toLocaleDateString('id-ID')}</span>
                        {note.parentAcknowledge ? (
                          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            Sudah Disetujui
                          </span>
                        ) : (
                          <button
                            onClick={() => onAcknowledgeNote('homeroom', note.id)}
                            className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold px-3 py-1.5 rounded-md shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Setujui & Tandatangani
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BK Notes */}
            <div className="bg-white rounded-xl p-5 border space-y-4">
              <h4 className="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                <span>Catatan Bimbingan BK</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-normal">Ahmad Fauzi, S.Psi.</span>
              </h4>

              <div className="space-y-4">
                {studentCounselorNotes.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-4">Belum ada catatan bimbingan BK.</p>
                ) : (
                  studentCounselorNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-slate-50 rounded-xl space-y-3 border">
                      <div>
                        <p className="text-xs font-semibold text-rose-700">DETAIL KASUS / BIMBINGAN</p>
                        <p className="text-sm text-slate-700 mt-1">{note.notes}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-rose-700 border-t pt-2 mt-2">HASIL TINDAK LANJUT</p>
                        <p className="text-sm text-slate-700 mt-1">{note.followUp}</p>
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400">{new Date(note.date).toLocaleDateString('id-ID')}</span>
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 rounded px-1 inline-block text-center mt-0.5">{note.status}</span>
                        </div>
                        {note.parentAcknowledge ? (
                          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            Sudah Disetujui
                          </span>
                        ) : (
                          <button
                            onClick={() => onAcknowledgeNote('counselor', note.id)}
                            className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold px-3 py-1.5 rounded-md shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Setujui & Tandatangani
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'komunikasi' && (
          <div className="bg-white rounded-xl p-5 border space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Ruang Komunikasi Wali Siswa & Guru (BK/Wali Kelas)
            </h4>
            <p className="text-xs text-slate-500">
              Kirimkan tanggapan, pertanyaan, atau pemakluman kepada guru. Pesan Anda akan terintegrasi langsung ke sistem administrasi guru terkait.
            </p>

            {/* Chat Box */}
            <div className="border rounded-xl p-4 bg-slate-50 max-h-[350px] overflow-y-auto space-y-4">
              {studentMessages.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-6">Belum ada percakapan komunikasi.</p>
              ) : (
                studentMessages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl ml-8 shadow-sm">
                      <div className="flex justify-between text-xs text-orange-600 font-bold mb-1">
                        <span>{msg.senderName}</span>
                        <span>{msg.date}</span>
                      </div>
                      <p className="text-sm text-slate-700">{msg.message}</p>
                    </div>

                    {msg.replies && msg.replies.map((reply, rid) => (
                      <div key={rid} className="bg-blue-50 border border-blue-100 p-3 rounded-xl mr-8 shadow-sm">
                        <div className="flex justify-between text-xs text-blue-600 font-bold mb-1">
                          <span>{reply.senderName} ({reply.role})</span>
                          <span>{reply.date}</span>
                        </div>
                        <p className="text-sm text-slate-700">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Tulis pesan atau pertanyaan Anda di sini..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
                Kirim
              </button>
            </form>
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
    </div>
  </div>
</div>
  );
}
