import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, LayoutDashboard, Globe, AlertTriangle, School, X, ArrowRight } from 'lucide-react';
import { UserRole } from '../../types';

interface ReturnToWebConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: any;
  activeRole: UserRole | null;
  schoolLogo?: string;
  onLogoutAndGoToWeb: () => void;
  onStayInDashboard: () => void;
  onViewWebKeepLogin: () => void;
}

export const ReturnToWebConfirmModal: React.FC<ReturnToWebConfirmModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  activeRole,
  schoolLogo,
  onLogoutAndGoToWeb,
  onStayInDashboard,
  onViewWebKeepLogin
}) => {
  if (!isOpen) return null;

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    guru: 'Guru Mata Pelajaran',
    wali_kelas: 'Wali Kelas',
    bk: 'Guru BK',
    piket: 'Guru Piket',
    siswa: 'Siswa',
    orang_tua: 'Orang Tua / Wali',
    guru_wali: 'Guru Wali',
    tendik: 'Tenaga Kependidikan',
    pelatih: 'Pelatih Ekskul'
  };

  const currentRoleName = activeRole ? (roleLabels[activeRole] || activeRole.replace('_', ' ')) : 'Pengguna';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        {/* Backdrop dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-8"
        >
          {/* Top Brand Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="Logo Sekolah" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <School className="w-8 h-8 text-blue-900" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                  Konfirmasi Navigasi
                </span>
                <h3 className="text-lg font-black tracking-tight leading-snug">
                  Kembali ke Web Sekolah?
                </h3>
                <p className="text-xs text-indigo-200">
                  SMP NEGERI 50 JAKARTA &bull; SIAS Terpadu
                </p>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {/* Active User Information Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">
                  Anda saat ini sedang login di akun SIAS:
                </p>
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                    {activeUser?.name || 'Pengguna'}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wide">
                    {currentRoleName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                  Pilih apakah Anda ingin <strong>keluar (logout)</strong> dari sistem SIAS terlebih dahulu, atau <strong>tetap berada di Dashboard</strong> akun Anda.
                </p>
              </div>
            </div>

            {/* Selection Options */}
            <div className="space-y-2.5">
              {/* Option 1: Tetap di Dashboard SIAS (Recommended) */}
              <button
                type="button"
                onClick={onStayInDashboard}
                className="w-full text-left p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-950 transition-all flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                      Tetap di Dashboard SIAS (Batal)
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-slate-600">
                      Lanjutkan aktivitas dan kelola data di akun SIAS Anda saat ini.
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  Tetap Disini
                </div>
              </button>

              {/* Option 2: Keluar dari SIAS & Buka Web */}
              <button
                type="button"
                onClick={onLogoutAndGoToWeb}
                className="w-full text-left p-4 rounded-2xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-950 transition-all flex items-center justify-between group cursor-pointer hover:border-rose-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-sm shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-900">
                      Keluar dari SIAS &amp; Buka Web Sekolah
                    </h4>
                    <p className="text-[11px] text-rose-700/80">
                      Sesi akun Anda akan ditutup (logout) dan dialihkan ke Website Resmi Sekolah.
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-rose-600 bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors flex items-center gap-1">
                  <span>Keluar &amp; Web</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option 3: Lihat Web Sekolah Tanpa Logout */}
              <button
                type="button"
                onClick={onViewWebKeepLogin}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Lihat Web Sekolah Saja (Tetap Login)
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Buka tampilan web sekolah tanpa keluar akun. Anda dapat kembali ke Dashboard kapan saja.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-600 hover:underline shrink-0">
                  Buka Web &rarr;
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReturnToWebConfirmModal;
