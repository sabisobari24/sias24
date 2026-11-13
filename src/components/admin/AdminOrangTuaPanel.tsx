import React, { useState, useMemo } from 'react';
import { Student, SchoolClass, ParentMessage } from '../../types';
import { saveDocument } from '../../lib/firebase';
import { 
  Users, 
  Search, 
  Filter, 
  Edit2, 
  Key, 
  Phone, 
  Mail, 
  Send, 
  Check, 
  X, 
  FileSpreadsheet, 
  FileText, 
  MessageSquare,
  GraduationCap,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { downloadExcel } from '../../utils/excelExport';
import { printTablePDF } from '../../utils/printHelper';

interface AdminOrangTuaPanelProps {
  students: Student[];
  classes: SchoolClass[];
  onUpdateStudent: (s: Student) => void;
  headmasterName?: string;
}

export default function AdminOrangTuaPanel({
  students,
  classes,
  onUpdateStudent,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.'
}: AdminOrangTuaPanelProps) {
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Edit Parent Modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [parentName, setParentName] = useState('');
  const [parentNik, setParentNik] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');

  // Send Message Modal
  const [messagingStudent, setMessagingStudent] = useState<Student | null>(null);
  const [noticeMessage, setNoticeMessage] = useState('');

  // Filtered Parents
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = classFilter === 'all' || s.classId === classFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        !searchQuery.trim() ||
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        s.name.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.includes(q)) ||
        (s.parentPhone && s.parentPhone.includes(q));
      return matchClass && matchSearch;
    });
  }, [students, classFilter, searchQuery]);

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setParentName(s.parentName || '');
    setParentNik(s.parentNik || '');
    setParentPhone(s.parentPhone || '');
    setParentEmail(s.parentEmail || '');
    setParentPassword(s.parentPassword || 'ortu123');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updated: Student = {
      ...editingStudent,
      parentName: parentName.trim() || 'Orang Tua Siswa',
      parentNik: parentNik.trim(),
      parentPhone: parentPhone.trim(),
      parentEmail: parentEmail.trim(),
      parentPassword: parentPassword.trim() || 'ortu123'
    };

    onUpdateStudent(updated);
    setEditingStudent(null);
    setSuccessMsg(`Data akun wali murid ${parentName} berhasil diperbarui!`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleResetPassword = (s: Student) => {
    const newPass = `${s.nisn || '50'}${Math.floor(100 + Math.random() * 900)}`;
    const updated: Student = {
      ...s,
      parentPassword: newPass
    };
    onUpdateStudent(updated);
    setSuccessMsg(`Kata sandi akun wali dari ${s.name} berhasil di-reset menjadi: ${newPass}`);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messagingStudent || !noticeMessage.trim()) return;

    const id = `pm-${Date.now()}`;
    const newMsg: ParentMessage = {
      id,
      studentId: messagingStudent.id,
      date: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toTimeString().split(' ')[0].substr(0, 5),
      senderName: 'Administrator Sekolah (SIAS)',
      message: noticeMessage.trim(),
      replies: []
    };

    saveDocument('parent_messages', id, newMsg)
      .then(() => {
        // Also update local storage if available
        try {
          const current = JSON.parse(localStorage.getItem('siakad_parent_messages') || '[]');
          localStorage.setItem('siakad_parent_messages', JSON.stringify([...current, newMsg]));
        } catch { /* ignore */ }

        setSuccessMsg(`Pesan resmi berhasil dikirimkan ke akun Orang Tua ${messagingStudent.name}!`);
        setMessagingStudent(null);
        setNoticeMessage('');
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch((err) => {
        alert(`Gagal mengirim pesan: ${err.message}`);
      });
  };

  const handleExportExcel = () => {
    const headers = ['No', 'Nama Orang Tua / Wali', 'NIK Orang Tua', 'No. HP / WhatsApp', 'Email', 'Siswa yang Diwakili', 'NISN', 'Kelas', 'Kata Sandi Akun'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      s.parentName || 'Belum Diatur',
      s.parentNik || '-',
      s.parentPhone || '-',
      s.parentEmail || '-',
      s.name,
      s.nisn || '-',
      classes.find(c => c.id === s.classId)?.name || s.classId,
      s.parentPassword || 'ortu123'
    ]);
    downloadExcel(`Data_Orang_Tua_Murid_${new Date().toISOString().split('T')[0]}.xlsx`, headers, rows, 'Orang Tua');
    setSuccessMsg('Data kontak Orang Tua berhasil diunduh (Excel)!');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleExportPDF = () => {
    const headers = ['No', 'Wali Murid', 'No. HP/WA', 'Nama Siswa', 'Kelas', 'Sandi'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      s.parentName || 'Wali Murid',
      s.parentPhone || '-',
      s.name,
      classes.find(c => c.id === s.classId)?.name || s.classId,
      s.parentPassword || 'ortu123'
    ]);
    printTablePDF('Daftar Kontak & Akun Orang Tua Siswa', headers, rows, headmasterName);
    setSuccessMsg('Dokumen data Orang Tua berhasil dicetak / PDF!');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-purple-200 text-xs font-semibold uppercase tracking-wider">
            Super Administrator &bull; Layanan Orang Tua &amp; Komite Sekolah
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Manajemen Data Orang Tua / Wali Murid</h2>
          <p className="text-purple-100 text-xs sm:text-sm">
            Kelola data kontak, NIK, kredensial login portal wali murid, dan komunikasi pesan terintegrasi.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <GraduationCap className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-6 py-2 font-bold text-slate-800 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">Semua Kelas ({students.length} Wali)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({students.filter(s => s.classId === c.id).length} Wali)
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama orang tua, siswa, atau nomor HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 text-center">
          Menampilkan {filteredStudents.length} Data Orang Tua
        </span>
      </div>

      {/* Table Data Orang Tua */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Orang Tua / Wali</th>
                <th className="px-4 py-3">NIK Wali</th>
                <th className="px-4 py-3">No. HP / WhatsApp</th>
                <th className="px-4 py-3">Siswa Binaan (Anak)</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Kata Sandi</th>
                <th className="px-4 py-3 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Tidak ditemukan data orang tua sesuai pencarian / filter kelas.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {(s.parentName || 'O').charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{s.parentName || <span className="text-slate-400 italic">Belum Diisi</span>}</p>
                        <p className="text-[10px] text-slate-400">Wali Resmi Siswa</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.parentNik || '-'}</td>
                    <td className="px-4 py-3">
                      {s.parentPhone ? (
                        <a
                          href={`https://wa.me/${s.parentPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{s.parentPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        {classes.find(c => c.id === s.classId)?.name || s.classId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-purple-700 bg-purple-50/60 px-2 py-0.5 rounded text-[11px] font-bold">
                        {s.parentPassword || 'ortu123'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMessagingStudent(s);
                            setNoticeMessage('');
                          }}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                          title="Kirim Pesan Resmi ke Akun Orang Tua"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(s)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                          title="Reset Password Akun Orang Tua"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          title="Edit Data Lengkap Orang Tua"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT DATA ORANG TUA */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Data Orang Tua / Wali</h3>
                <p className="text-xs text-slate-500">Wali murid dari siswa: <strong className="text-slate-800">{editingStudent.name}</strong></p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Nama Lengkap Orang Tua / Wali <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Nama Bapak / Ibu"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">NIK Orang Tua</label>
                  <input
                    type="text"
                    value={parentNik}
                    onChange={(e) => setParentNik(e.target.value)}
                    placeholder="3171xxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Email Orang Tua</label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="orangtua@email.com"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Kata Sandi Akun Login Orang Tua</label>
                <input
                  type="text"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  placeholder="ortu123"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-xs text-purple-700 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KIRIM PESAN LANGSUNG */}
      {messagingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Kirim Pesan Resmi ke Wali Murid</h3>
                <p className="text-xs text-slate-500">Tujuan: Bapak/Ibu {messagingStudent.parentName || messagingStudent.name}</p>
              </div>
              <button onClick={() => setMessagingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Isi Pesan / Informasi Sekolah <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="Tuliskan pengumuman, pemberitahuan perkembangan ananda, atau informasi penting lainnya..."
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl focus:bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setMessagingStudent(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Pesan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
