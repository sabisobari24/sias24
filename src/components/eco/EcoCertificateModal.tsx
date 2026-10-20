import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Sparkles, Award, ShieldCheck, Leaf } from 'lucide-react';
import { printEcoAmbassadorCertificate, EcoAmbassadorCertData } from '../../utils/ecoCertificateHelper';

interface EcoCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: EcoAmbassadorCertData;
}

export const EcoCertificateModal: React.FC<EcoCertificateModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    printEcoAmbassadorCertificate(data);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div 
          className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity" 
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] z-10"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner">
                <Leaf className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black tracking-tight">Piagam Penghargaan Duta Kebersihan</h3>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                    Resmi SMPN 50
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 font-medium">
                  Bukti pengakuan prestasi kepeloporan lingkungan siswa atas perolehan poin ECo-Tiket tertinggi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-700" />
                <span>Cetak / Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Preview Body (Scrollable Landscape Preview) */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 flex items-center justify-center">
            {/* Visual Certificate Card Replica */}
            <div className="w-full max-w-3xl aspect-[1.414/1] bg-gradient-to-br from-emerald-50 via-white to-lime-50 rounded-2xl border-8 border-emerald-700 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden text-slate-900 select-none">
              {/* Decorative Borders */}
              <div className="absolute inset-2 border border-dashed border-emerald-400 rounded-lg pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl sm:text-9xl text-emerald-500/[0.04] pointer-events-none font-sans font-black select-none">
                🌿
              </div>

              {/* Certificate Header */}
              <div className="text-center relative z-10 space-y-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-full inline-block">
                  Program Gerakan Sekolah Adiwiyata SMPN 50 Jakarta
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-emerald-950 uppercase tracking-widest mt-1">
                  Piagam Penghargaan
                </h2>
                <p className="text-[11px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Duta Kebersihan &amp; Lingkungan Hidup
                </p>
                <p className="text-[9px] font-mono text-slate-400">
                  Nomor: {data.certNumber || `050/PIAGAM-ECO/${new Date().getFullYear()}/001`}
                </p>
              </div>

              {/* Certificate Body */}
              <div className="text-center relative z-10 my-auto py-2">
                <p className="text-[10px] sm:text-xs text-slate-500 italic mb-1">
                  Diberikan dengan rasa hormat dan apresiasi setinggi-tingginya kepada:
                </p>
                <div className="text-base sm:text-2xl font-black text-slate-900 tracking-wide uppercase border-b-2 border-emerald-500 inline-block px-4 pb-1">
                  {data.studentName}
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-emerald-800 mt-1">
                  {data.studentNisn ? `NISN: ${data.studentNisn} • ` : ''}Kelas: {data.className} • {data.schoolName || 'SMPN 50 Jakarta'}
                </p>

                <div className="my-2.5">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-[11px] sm:text-xs px-4 py-1.5 rounded-full shadow-sm border border-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>DUTA KEBERSIHAN UTAMA (ECO-WARRIOR)</span>
                  </span>
                </div>

                <p className="text-[9px] sm:text-[11px] text-slate-600 max-w-xl mx-auto leading-relaxed">
                  Telah menunjukkan kepemimpinan dan dedikasi nyata dalam mengumpulkan &amp; menukarkan sampah terpilah melalui program <strong>ECo-Tiket</strong>, menginspirasi budaya hidup bersih, peduli lingkungan, dan berkelanjutan.
                </p>

                <div className="flex items-center justify-center gap-2 mt-2.5">
                  <span className="bg-white/90 border border-slate-200 text-[9px] font-bold text-slate-700 px-2.5 py-0.5 rounded-md">
                    Total: <strong className="text-emerald-700">{data.totalEcoPoints} Poin ECo-Tiket</strong>
                  </span>
                  <span className="bg-white/90 border border-slate-200 text-[9px] font-bold text-slate-700 px-2.5 py-0.5 rounded-md">
                    Setoran: <strong className="text-emerald-700">{data.totalDepositsCount} Kali</strong>
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex items-end justify-between relative z-10 pt-2 border-t border-emerald-100 text-[9px] sm:text-[10px]">
                <div className="text-center w-36">
                  <p className="text-slate-500 font-medium">Pembina Adiwiyata</p>
                  <div className="h-8 flex items-center justify-center">
                    <span className="font-script text-emerald-700 text-xs italic">Tim Adiwiyata</span>
                  </div>
                  <p className="font-bold text-slate-800 border-t border-slate-400 pt-0.5">Koord. Lingkungan</p>
                </div>

                <div className="text-center flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-xs font-black shadow-xs border border-amber-500">
                    🌱
                  </div>
                  <span className="text-[7.5px] font-black text-amber-900 tracking-wider uppercase mt-0.5">
                    TERVERIFIKASI
                  </span>
                </div>

                <div className="text-center w-40">
                  <p className="text-slate-500 font-medium">Jakarta, {data.dateStr}</p>
                  <p className="text-slate-500 font-medium">Kepala Sekolah</p>
                  <div className="h-6 flex items-center justify-center">
                    <span className="font-script text-emerald-800 font-bold text-xs italic">Dra. Hj. Endah Purwani</span>
                  </div>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-0.5">
                    {data.headmasterName || 'Dra. Hj. Endah Purwani, M.M.'}
                  </p>
                  <p className="text-[7.5px] text-slate-400">NIP. {data.headmasterNip || '196711261991032004'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sertifikat digital sah terakreditasi format A4 Landscape</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-200 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
