import React, { useState, useEffect, useRef } from 'react';
import { X, User, Lock, Mail, Phone, MapPin, Key, Check, AlertCircle, Shield, Camera, Upload, Link2, Calendar, Heart, Quote } from 'lucide-react';
import { Student, Teacher, UserRole } from '../types';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: any;
  activeRole: UserRole;
  onSave: (updatedUser: any) => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  activeUser,
  activeRole,
  onSave,
}: ProfileEditModalProps) {
  // Input fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nipOrNisn, setNipOrNisn] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [born, setBorn] = useState('');
  const [hobby, setHobby] = useState('');
  const [motto, setMotto] = useState('');
  
  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarInputMode, setAvatarInputMode] = useState<'upload' | 'link'>('upload');
  const [linkInputVal, setLinkInputVal] = useState('');

  // Parent specific states
  const [parentName, setParentName] = useState('');
  const [parentNik, setParentNik] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    if (isOpen && activeUser) {
      setErrorMsg('');
      setSuccessMsg('');
      setShowPasswordFields(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Populate avatar
      const currentAvatar = activeUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120';
      setAvatarUrl(currentAvatar);
      setLinkInputVal(currentAvatar.startsWith('data:') ? '' : currentAvatar);

      if (activeRole === 'orang_tua') {
        const student = activeUser as Student;
        setParentName(student.parentName || '');
        setParentNik(student.parentNik || '');
        setParentPhone(student.parentPhone || '');
        setParentEmail(student.parentEmail || '');
      } else if (activeRole === 'siswa') {
        const student = activeUser as Student;
        setName(student.name || '');
        setNipOrNisn(student.nisn || '');
        setPhone(student.phone || '');
        setAddress(student.address || '');
      } else {
        // Admin, Guru, BK, Piket, Wali Kelas, Guru Wali
        const teacher = activeUser as any;
        setName(teacher.name || '');
        setNipOrNisn(teacher.nip || '');
        setEmail(teacher.email || '');
        setBorn(teacher.born || '');
        setHobby(teacher.hobby || '');
        setMotto(teacher.motto || '');
      }
    }
  }, [isOpen, activeUser, activeRole]);

  if (!isOpen || !activeUser) return null;

  const isTeacherRole = ['admin', 'guru', 'wali_kelas', 'bk', 'piket', 'guru_wali'].includes(activeRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validate password changes if toggled
    if (showPasswordFields) {
      if (!currentPassword) {
        setErrorMsg('Silakan masukkan kata sandi saat ini untuk konfirmasi.');
        return;
      }

      // Verify current password
      let realCurrentPassword = '';
      if (activeRole === 'orang_tua') {
        realCurrentPassword = activeUser.parentPassword || 'ortu123';
      } else if (activeRole === 'siswa') {
        realCurrentPassword = activeUser.password || 'siswa123';
      } else if (activeRole === 'admin') {
        realCurrentPassword = activeUser.password || 'sobari123';
      } else {
        realCurrentPassword = activeUser.password || 'guru123';
      }

      // Allow fallback if user has default password of NIP/NISN/NIK
      const defaultPass = activeRole === 'orang_tua' ? activeUser.parentNik : (activeRole === 'siswa' ? activeUser.nisn : activeUser.nip);

      if (
        currentPassword !== realCurrentPassword && 
        currentPassword !== defaultPass &&
        !(activeRole === 'admin' && currentPassword === 'admin123')
      ) {
        setErrorMsg('Kata sandi saat ini salah.');
        return;
      }

      if (!newPassword) {
        setErrorMsg('Silakan masukkan kata sandi baru.');
        return;
      }

      if (newPassword.length < 4) {
        setErrorMsg('Kata sandi baru minimal 4 karakter.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
        return;
      }
    }

    // Build updated user object
    let updatedUser = { ...activeUser };
    
    // Always assign edited avatarUrl
    updatedUser.avatarUrl = avatarUrl;

    if (activeRole === 'orang_tua') {
      if (!parentName.trim()) {
        setErrorMsg('Nama Orang Tua/Wali tidak boleh kosong.');
        return;
      }
      updatedUser.parentName = parentName.trim();
      updatedUser.parentNik = parentNik.trim(); // Optional now, keeps existing or empty
      updatedUser.parentPhone = parentPhone.trim();
      updatedUser.parentEmail = parentEmail.trim();
      if (showPasswordFields) {
        updatedUser.parentPassword = newPassword;
      }
    } else if (activeRole === 'siswa') {
      if (!name.trim()) {
        setErrorMsg('Nama Siswa tidak boleh kosong.');
        return;
      }
      if (!nipOrNisn.trim()) {
        setErrorMsg('NISN tidak boleh kosong.');
        return;
      }
      updatedUser.name = name.trim();
      updatedUser.nisn = nipOrNisn.trim();
      updatedUser.phone = phone.trim();
      updatedUser.address = address.trim();
      if (showPasswordFields) {
        updatedUser.password = newPassword;
      }
    } else {
      // Teacher / Admin
      if (!name.trim()) {
        setErrorMsg('Nama tidak boleh kosong.');
        return;
      }
      if (!nipOrNisn.trim()) {
        setErrorMsg('NIP tidak boleh kosong.');
        return;
      }
      updatedUser.name = name.trim();
      updatedUser.nip = nipOrNisn.trim();
      updatedUser.email = email.trim();
      updatedUser.born = born.trim();
      updatedUser.hobby = hobby.trim();
      updatedUser.motto = motto.trim();
      if (showPasswordFields) {
        updatedUser.password = newPassword;
      }
    }

    onSave(updatedUser);
    setSuccessMsg('Profil berhasil diperbarui!');
    
    // Auto close modal after brief delay
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <User className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Edit Profil & Data</h2>
              <p className="text-xs text-indigo-200 mt-0.5 capitalize">Peran: {activeRole.replace('_', ' ')}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Status Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FOTO PROFIL UPLOADER SECTION */}
          <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Foto Profil Pengguna</span>
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-indigo-100 shadow-inner bg-slate-200">
                <img 
                  src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120'} 
                  alt="Avatar Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md cursor-pointer transition-all">
                <Camera className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAvatarUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex items-center gap-4 text-[10px]">
              <button
                type="button"
                onClick={() => setAvatarInputMode('upload')}
                className={`pb-0.5 font-bold cursor-pointer ${avatarInputMode === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setAvatarInputMode('link')}
                className={`pb-0.5 font-bold cursor-pointer ${avatarInputMode === 'link' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
              >
                Gunakan Link Gambar (G-Drive / Web)
              </button>
            </div>

            {avatarInputMode === 'upload' ? (
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Foto dari Device</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAvatarUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="w-full flex gap-1 px-2">
                <input
                  type="url"
                  placeholder="Paste URL Google Drive / Link Foto"
                  value={linkInputVal}
                  onChange={(e) => {
                    setLinkInputVal(e.target.value);
                    setAvatarUrl(e.target.value);
                  }}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                />
              </div>
            )}
            <p className="text-[9px] text-slate-400 text-center leading-relaxed">
              *Mendukung link share Google Drive atau upload file JPG, PNG secara langsung.
            </p>
          </div>

          {/* Form Fields depend on activeRole */}
          {activeRole === 'orang_tua' ? (
            /* Parent Form Fields */
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Orang Tua / Wali</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
                    placeholder="Nama lengkap wali"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">NIK Orang Tua / Wali (Opsional)</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={parentNik}
                    onChange={(e) => setParentNik(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800"
                    placeholder="Nomor Induk Kependudukan (Jika ada)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">No. WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Nomor telepon aktif"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Email aktif"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="bg-amber-50 p-3 border border-amber-100 rounded-xl text-[11px] text-amber-800">
                  <span className="font-bold">Info Siswa:</span> Anda saat ini masuk mendampingi siswa bernama <span className="font-bold">{activeUser.name}</span> (Kelas {activeUser.classId}).
                </div>
              </div>
            </div>
          ) : activeRole === 'siswa' ? (
            /* Student Form Fields */
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap Siswa</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Nama lengkap sesuai rapor"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">NISN Siswa (Kode Masuk)</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={nipOrNisn}
                    onChange={(e) => setNipOrNisn(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Nomor Induk Siswa Nasional"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">No. WhatsApp / Telepon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Contoh: 0812xxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alamat Rumah</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-16 resize-none"
                    placeholder="Alamat lengkap domisili saat ini"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Teacher / Admin Form Fields */
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap & Gelar</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Contoh: Drs. H. Mulyadi, M.Pd."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">NIP / Nomor Identitas (Kode Masuk)</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={nipOrNisn}
                    onChange={(e) => setNipOrNisn(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Nomor Induk Pegawai"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Surel / Email Sekolah</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Contoh: nama.guru@sekolah.sch.id"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tempat, Tanggal Lahir</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={born}
                      onChange={(e) => setBorn(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Contoh: Jakarta, 12 April 1985"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hobi</label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={hobby}
                      onChange={(e) => setHobby(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Contoh: Membaca & Catur"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Motto Hidup (Tampil di Direktori Website)</label>
                <div className="relative">
                  <Quote className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-14 resize-none"
                    placeholder="Contoh: Mengajar dengan hati, membimbing dengan keteladanan."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Password Settings Section */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <button
              type="button"
              onClick={() => setShowPasswordFields(!showPasswordFields)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>{showPasswordFields ? 'Batal Ubah Kata Sandi' : 'Ubah Kata Sandi (Password)'}</span>
            </button>

            {showPasswordFields && (
              <div className="space-y-3 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kata Sandi Saat Ini</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                      placeholder="Sandi sekarang / bawaan"
                      required={showPasswordFields}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kata Sandi Baru</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        placeholder="Min. 4 karakter"
                        required={showPasswordFields}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ulangi Sandi Baru</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                        placeholder="Konfirmasi"
                        required={showPasswordFields}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
