import React, { useState } from 'react';
import { Attendance, Student, SchoolClass } from '../types';
import { ShieldCheck, Clock, CheckCircle2, XCircle, Info, Image, MapPin, Eye } from 'lucide-react';
import AttendancePhotoPreviewModal from './common/AttendancePhotoPreviewModal';

interface LaporanAbsensiGlobalProps {
  attendance: Attendance[];
  students: Student[];
  classes: SchoolClass[];
}

export default function LaporanAbsensiGlobal({
  attendance,
  students,
  classes
}: LaporanAbsensiGlobalProps) {
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);

  // Filter only student-initiated self-attendance
  const selfAttendanceList = attendance.filter((a) => a.isSelfAttendance);

  // Sort by date and time/id descending
  const sortedList = [...selfAttendanceList].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return (b.timestamp || '').localeCompare(a.timestamp || '');
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mt-6">
      <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Laporan Real-Time Presensi Mandiri Siswa</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan kehadiran harian siswa dengan bukti foto ber-GPS watermark yang diverifikasi oleh Guru Piket & Guru Mapel.
          </p>
        </div>
        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
          Publik & Semua User
        </span>
      </div>

      <div className="p-5">
        {sortedList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Info className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Belum ada laporan absen mandiri dari siswa.</p>
            <p className="text-xs text-slate-400">Siswa dapat melakukan absen mandiri berbukti foto di portal siswa mereka.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4">Siswa & Kelas</th>
                  <th className="py-3 px-4">Status & Waktu</th>
                  <th className="py-3 px-4 text-center">Bukti Foto GPS</th>
                  <th className="py-3 px-4">Verifikasi Piket</th>
                  <th className="py-3 px-4">Verifikasi Guru Mapel</th>
                  <th className="py-3 px-4">Status Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sortedList.map((record) => {
                  const student = students.find((s) => s.id === record.studentId);
                  const sClass = classes.find((c) => c.id === record.classId);

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-2.5">
                          {student?.avatarUrl ? (
                            <img
                              src={student.avatarUrl}
                              alt={student.name}
                              className="w-7 h-7 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {student?.name?.charAt(0) || 'S'}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-800 block">{student?.name || 'Siswa'}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{sClass?.name || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            record.verificationStatus === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            record.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                            record.status === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {record.verificationStatus === 'Rejected' ? 'Ditolak' : record.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {record.date} &bull; {record.timestamp || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {record.photoProof ? (
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 px-2 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer font-bold"
                          >
                            <Eye className="w-3 h-3 text-indigo-500" />
                            <span>Preview Foto</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No Photo</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {record.isVerifiedByPiket ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Disetujui</span>
                            </span>
                          ) : record.verificationStatus === 'Rejected' && !record.isVerifiedByPiket ? (
                            <span className="text-rose-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <span>Ditolak/Belum</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Menunggu</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {record.isVerifiedByMapel ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Disetujui</span>
                            </span>
                          ) : record.verificationStatus === 'Rejected' && !record.isVerifiedByMapel ? (
                            <span className="text-rose-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <span>Ditolak/Belum</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Menunggu</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          record.verificationStatus === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                          record.verificationStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {record.verificationStatus === 'Verified' ? 'VERIFIED' :
                           record.verificationStatus === 'Rejected' ? 'REJECTED' :
                           'PENDING'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo Proof */}
      {selectedRecord && (
        <AttendancePhotoPreviewModal
          record={selectedRecord}
          student={students.find((s) => s.id === selectedRecord.studentId)}
          sClass={classes.find((c) => c.id === selectedRecord.classId)}
          onClose={() => setSelectedRecord(null)}
          canVerify={false}
        />
      )}
    </div>
  );
}
