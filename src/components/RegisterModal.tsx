import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Phone, MapPin, Shield, Check, AlertCircle, School, Heart, Sparkles } from 'lucide-react';
import { PendingRegistration, SchoolClass, Student, Teacher, WebSectionContent } from '../types';
import { syncCollection } from '../lib/firebase';
import { INITIAL_WEB_CONTENT } from '../data/initialWebContent';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (registration: Omit<PendingRegistration, 'id' | 'createdAt'>) => Promise<void>;
  classes: SchoolClass[];
  students: Student[];
  teachers?: Teacher[];
  pendingRegistrations?: PendingRegistration[];
}

export default function RegisterModal({ 
  isOpen, 
  onClose, 
  onRegister, 
  classes = [], 
  students = [], 
  teachers = [], 
  pendingRegistrations = [] 
}: RegisterModalProps) {
  const [role, setRole] = useState<'guru' | 'siswa' | 'orang_tua' | 'pelatih'>('siswa');

  // Input fields
  const [name, setName] = useState('');
  const [nipOrNisnOrNik, setNipOrNisnOrNik] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [studentNisnOrName, setStudentNisnOrName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [kesiswaanContent, setKesiswaanContent] = useState<WebSectionContent | null>(null);

  // Fetch Kesiswaan section from Web Content
  useEffect(() => {
    const unsubscribe = syncCollection<WebSectionContent>('web_content', (data) => {
      const found = data.find((c) => c.id === 'kesiswaan');
      if (found) {
        setKesiswaanContent(found);
      } else {
        const fallback = INITIAL_WEB_CONTENT.find((c) => c.id === 'kesiswaan')!;
        setKesiswaanContent(fallback);
      }
    }, INITIAL_WEB_CONTENT);
    return () => unsubscribe();
  }, []);

  // When role changes to 'pelatih', set default studentNisnOrName if empty or not matching any ekskul
  useEffect(() => {
    if (role === 'pelatih' && kesiswaanContent?.extracurriculars && kesiswaanContent.extracurriculars.length > 0) {
      const isValid = kesiswaanContent.extracurriculars.some(e => e.id === studentNisnOrName);
      if (!isValid) {
        setStudentNisnOrName(kesiswaanContent.extracurriculars[0].id);
      }
    }
  }, [role, kesiswaanContent, studentNisnOrName]);

  // Dynamically set default classId when classes are loaded
  useEffect(() => {
    if (classes && classes.length > 0) {
      setClassId(classes[0].id);
    } else {
      setClassId('Kelas 7A');
    }
  }, [classes, isOpen]);

  // UI status
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validations
    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    // Phone Number uniqueness check across all collections
    const inputPhone = phone.trim();
    if (inputPhone) {
      const phoneExistsStudent = students.some((s) => (s.phone && s.phone.trim() === inputPhone) || (s.parentPhone && s.parentPhone.trim() === inputPhone));
      const phoneExistsTeacher = teachers.some((t) => (t as any).phone && (t as any).phone.trim() === inputPhone);
      const phoneExistsPending = pendingRegistrations.some((p) => p.phone && p.phone.trim() === inputPhone);
      if (phoneExistsStudent || phoneExistsTeacher || phoneExistsPending) {
        setErrorMsg('Pendaftaran ditolak: NISN atau Nomor Telpon sudah terdaftar.');
        return;
      }
    }

    let trimmedCode = '';
    if (role === 'guru' || role === 'siswa') {
      trimmedCode = nipOrNisnOrNik.trim();
      if (!trimmedCode) {
        setErrorMsg(role === 'guru' ? 'NIP tidak boleh kosong.' : 'NISN tidak boleh kosong.');
        return;
      }
      if (role === 'siswa') {
        if (trimmedCode.length !== 10) {
          setErrorMsg('NISN Siswa harus berupa 10 digit angka.');
          return;
        }
        // Ensure NISN is unique across all students and pending registrations
        const alreadyExistsStudent = students.some((s) => s.nisn && s.nisn.trim() === trimmedCode);
        const alreadyPendingStudent = pendingRegistrations.some((p) => p.role === 'siswa' && p.nipOrNisnOrNik && p.nipOrNisnOrNik.trim() === trimmedCode);
        if (alreadyExistsStudent || alreadyPendingStudent) {
          setErrorMsg('Pendaftaran ditolak: NISN atau Nomor Telpon sudah terdaftar.');
          return;
        }
      } else if (role === 'guru') {
        // Ensure NIP is unique across all teachers and pending registrations
        const alreadyExistsTeacher = teachers.some((t) => t.nip && t.nip.trim() === trimmedCode);
        if (alreadyExistsTeacher) {
          setErrorMsg(`Gagal: NIP/NIK ${trimmedCode} sudah terdaftar dalam sistem oleh Pendidik/Tendik lain. Satu NIP hanya dapat digunakan oleh 1 akun.`);
          return;
        }
        const alreadyPendingTeacher = pendingRegistrations.some((p) => (p.role === 'guru' || p.role === 'pelatih') && p.nipOrNisnOrNik && p.nipOrNisnOrNik.trim() === trimmedCode);
        if (alreadyPendingTeacher) {
          setErrorMsg(`Gagal: NIP/NIK ${trimmedCode} sudah mendaftar dan sedang menunggu validasi Admin. Tidak dapat melakukan pendaftaran ganda.`);
          return;
        }
      }
    } else if (role === 'orang_tua' || role === 'pelatih') {
      trimmedCode = phone.trim();
      if (!trimmedCode) {
        setErrorMsg('Nomor Handphone tidak boleh kosong.');
        return;
      }
      if (trimmedCode.length < 10) {
        setErrorMsg('Nomor Handphone minimal 10 digit.');
        return;
      }
    }

    if (!password) {
      setErrorMsg('Kata sandi tidak boleh kosong.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Kata sandi minimal 4 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (role === 'orang_tua') {
      const targetNisn = studentNisnOrName.trim();
      if (!targetNisn) {
        setErrorMsg('NISN Anak Kandung (10 digit) wajib diisi untuk sinkronisasi akun.');
        return;
      }
      if (targetNisn.length !== 10 || isNaN(Number(targetNisn))) {
        setErrorMsg('NISN Anak Kandung harus berupa 10 digit angka unik.');
        return;
      }
      // Check if this student exists
      const matchedStudent = students.find((s) => s.nisn === targetNisn);
      if (!matchedStudent) {
        setErrorMsg('NISN Anak tidak ditemukan dalam sistem. Pastikan siswa tersebut telah terdaftar/aktif di sekolah.');
        return;
      }
      // Ensure only one parent account can be registered per student NISN
      if (matchedStudent.parentPhone || matchedStudent.parentName || matchedStudent.parentNik) {
        setErrorMsg('Pendaftaran ditolak: NISN atau Nomor Telpon sudah terdaftar.');
        return;
      }
      const alreadyPendingOrtu = pendingRegistrations.some((p) => p.role === 'orang_tua' && p.studentNisnOrName?.trim() === targetNisn);
      if (alreadyPendingOrtu) {
        setErrorMsg('Pendaftaran ditolak: NISN atau Nomor Telpon sudah terdaftar.');
        return;
      }
    }

    if (role === 'pelatih') {
      const ekskul = studentNisnOrName.trim();
      if (!ekskul) {
        setErrorMsg('Nama Ekstrakurikuler yang diampu wajib diisi.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Call callback to register
      await onRegister({
        role,
        name: name.trim(),
        nipOrNisnOrNik: trimmedCode,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: role === 'siswa' ? address.trim() : undefined,
        classId: role === 'siswa' ? classId : undefined,
        gender: role === 'siswa' ? gender : undefined,
        studentNisnOrName: (role === 'orang_tua' || role === 'pelatih') ? studentNisnOrName.trim() : undefined,
        password,
      });

      setSuccessMsg('Registrasi berhasil dikirim! Akun Anda sedang menunggu validasi oleh Admin.');
      
      // Reset form
      setTimeout(() => {
        setName('');
        setNipOrNisnOrNik('');
        setEmail('');
        setPhone('');
        setAddress('');
        setStudentNisnOrName('');
        setPassword('');
        setConfirmPassword('');
        onClose();
        setSuccessMsg('');
      }, 2500);
    } catch (err: any) {
      console.error(err);
      const errorDetails = err?.message || err?.toString() || 'Unknown error';
      setErrorMsg(`Gagal mengirim pendaftaran ke database (${errorDetails}). Periksa jaringan internet Anda, nonaktifkan Adblocker / Brave Shields, atau hubungi Admin.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl">
              <School className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Daftar Akun Baru</h2>
              <p className="text-xs text-indigo-200 mt-0.5">Ajukan pendaftaran akun Sistem Informasi Akademik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Status Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex flex-col gap-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pendaftaran Akun Terkirim!</span>
              </div>
              <p className="mt-1 text-slate-600 font-medium">Validasi akan segera diproses oleh Admin Sekolah. Silakan koordinasikan dengan administrator untuk mengaktifkan akun Anda.</p>
            </div>
          )}

          {/* Role selector tabs */}
          {!successMsg && (
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Pilih Peran Akun</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {(['siswa', 'guru', 'orang_tua', 'pelatih'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setErrorMsg('');
                    }}
                    className={`py-2 px-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all capitalize cursor-pointer whitespace-nowrap text-center ${
                      role === r
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                        : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    {r === 'guru' ? 'Guru' : r === 'siswa' ? 'Siswa' : r === 'orang_tua' ? 'Orang Tua' : 'Pelatih'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!successMsg && (
            <div className="space-y-3.5">
              
              {/* Common Name field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {role === 'orang_tua' ? 'Nama Orang Tua / Wali' : role === 'pelatih' ? 'Nama Lengkap Pelatih' : 'Nama Lengkap'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder={role === 'orang_tua' ? 'Nama lengkap Ayah/Ibu/Wali' : role === 'pelatih' ? 'Contoh: Coach Hermawan' : 'Contoh: Ahmad Subarjo'}
                    required
                  />
                </div>
              </div>

              {/* Code field (NIP / NISN) */}
              {role !== 'orang_tua' && role !== 'pelatih' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {role === 'guru' ? 'NIP (Nomor Induk Pegawai)' : 'NISN (10 Digit Angka)'}
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={nipOrNisnOrNik}
                      onChange={(e) => setNipOrNisnOrNik(e.target.value)}
                      className="w-full pl-9.5 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                      placeholder={role === 'guru' ? 'Masukkan NIP Pegawai' : 'Contoh: 0081234567'}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Role-specific fields */}
              {role === 'guru' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Sekolah / Pribadi</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="nama@sekolah.sch.id"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">No. WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="0812xxxxxxxx"
                      />
                    </div>
                  </div>
                </div>
              )}

              {role === 'siswa' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kelas</label>
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white font-bold text-indigo-950"
                      >
                        {classes && classes.length > 0 ? (
                          classes.map((cl) => (
                            <option key={cl.id} value={cl.id}>{cl.name}</option>
                          ))
                        ) : (
                          [
                            { id: 'Kelas 7A', name: 'Kelas VII-A' },
                            { id: 'Kelas 7B', name: 'Kelas VII-B' },
                            { id: 'Kelas 7C', name: 'Kelas VII-C' },
                            { id: 'Kelas 8A', name: 'Kelas VIII-A' },
                            { id: 'Kelas 8B', name: 'Kelas VIII-B' },
                            { id: 'Kelas 8C', name: 'Kelas VIII-C' },
                            { id: 'Kelas 9A', name: 'Kelas IX-A' },
                            { id: 'Kelas 9B', name: 'Kelas IX-B' },
                            { id: 'Kelas 9C', name: 'Kelas IX-C' },
                          ].map((cl) => (
                            <option key={cl.id} value={cl.id}>{cl.name}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Kelamin</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        {['Laki-laki', 'Perempuan'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g as any)}
                            className={`py-1.5 px-2 text-xs font-semibold rounded-xl capitalize cursor-pointer ${
                              gender === g
                                ? 'bg-indigo-100 text-indigo-800 font-bold'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">No. WhatsApp HP Siswa</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alamat Rumah Lengkap</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-14 resize-none"
                        placeholder="Isi alamat lengkap domisili saat ini"
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'orang_tua' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">No. WhatsApp / HP</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          placeholder="Nomor HP aktif untuk Login"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          placeholder="Email opsional"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">NISN Anak Kandung (10 Digit Angka Unik)</label>
                    <div className="relative">
                      <School className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={studentNisnOrName}
                        onChange={(e) => setStudentNisnOrName(e.target.value)}
                        className="w-full pl-9.5 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono font-bold text-indigo-950"
                        placeholder="Masukkan 10 digit NISN Anak Kandung"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-indigo-600 mt-1.5 font-semibold">Akun Orang Tua akan otomatis SINKRON dengan data Akademik & Kehadiran Anak Anda berdasarkan NISN unik ini.</p>
                  </div>
                </>
              )}

              {role === 'pelatih' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">No. WhatsApp / HP</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          placeholder="Nomor HP aktif untuk Login"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          placeholder="Email opsional"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Ekstrakurikuler yang Diampu</label>
                    <div className="relative">
                      <Sparkles className="absolute left-3.5 top-3 w-4 h-4 text-indigo-500" />
                      <select
                        value={studentNisnOrName}
                        onChange={(e) => setStudentNisnOrName(e.target.value)}
                        className="w-full pl-9.5 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-indigo-950 bg-white"
                        required
                      >
                        {kesiswaanContent?.extracurriculars?.map((ex) => {
                          const isImage = ex.icon && (ex.icon.startsWith('http') || ex.icon.startsWith('data:'));
                          return (
                            <option key={ex.id} value={ex.id}>
                              {isImage ? '✨' : ex.icon} {ex.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <p className="text-[10px] text-indigo-600 mt-1.5 font-semibold">Pilihan ekstrakurikuler diambil langsung dari data kesiswaan yang diatur oleh Admin.</p>
                  </div>
                </>
              )}

              {/* Password */}
              <div className="border-t border-slate-100 pt-3 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buat Kata Sandi (Sandi)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                        placeholder="Min. 4 karakter"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ulangi Kata Sandi</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                        placeholder="Konfirmasi"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Action Buttons */}
          {!successMsg && (
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200 shrink-0" />
                    <span>Kirim Pendaftaran</span>
                  </>
                )}
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
