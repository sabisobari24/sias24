import React, { useState, useEffect, useRef } from 'react';
import { Student, SchoolClass } from '../../types';
import { generateNISNQRCode, printSingleStudentCard } from '../../utils/qrHelper';
import { getEffectiveSchoolLogo, DEFAULT_SCHOOL_LOGO } from '../../utils/schoolLogoHelper';
import { getCardDesignConfig, getPresetById, CardDesignConfig } from '../../utils/cardDesignHelper';
import { downloadSingleStudentCardPDF } from '../../utils/cardPdfHelper';
import { X, Printer, QrCode, CreditCard, RotateCw, CheckCircle2, ShieldCheck, Download, Sparkles, FileDown, Loader2, ChevronDown, Check } from 'lucide-react';

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: SchoolClass[];
  headmasterName?: string;
  schoolName?: string;
  schoolLogo?: string;
}

export default function StudentIdCardModal({
  isOpen,
  onClose,
  student,
  classes,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  schoolName,
  schoolLogo: customSchoolLogo
}: StudentIdCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardConfig, setCardConfig] = useState<CardDesignConfig>(getCardDesignConfig);

  const effectiveSchoolName = schoolName || localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';

  const [effectiveSchoolLogo, setEffectiveSchoolLogo] = useState<string>(() => {
    if (customSchoolLogo && customSchoolLogo.trim() !== '' && !customSchoolLogo.includes('/logo.png')) {
      return customSchoolLogo;
    }
    return getEffectiveSchoolLogo();
  });

  const activePreset = getPresetById(cardConfig.presetId);

  useEffect(() => {
    const updateLogoAndConfig = () => {
      if (customSchoolLogo && customSchoolLogo.trim() !== '' && !customSchoolLogo.includes('/logo.png')) {
        setEffectiveSchoolLogo(customSchoolLogo);
      } else {
        setEffectiveSchoolLogo(getEffectiveSchoolLogo());
      }
      setCardConfig(getCardDesignConfig());
    };

    updateLogoAndConfig();
    window.addEventListener('siakad_logo_updated', updateLogoAndConfig);
    window.addEventListener('siakad_card_design_updated', updateLogoAndConfig);
    window.addEventListener('storage', updateLogoAndConfig);
    return () => {
      window.removeEventListener('siakad_logo_updated', updateLogoAndConfig);
      window.removeEventListener('siakad_card_design_updated', updateLogoAndConfig);
      window.removeEventListener('storage', updateLogoAndConfig);
    };
  }, [customSchoolLogo, isOpen]);

  useEffect(() => {
    if (!student || !isOpen) {
      setQrDataUrl('');
      setIsFlipped(false);
      return;
    }

    setLoading(true);
    generateNISNQRCode(student.nisn || student.id, 320)
      .then((url) => {
        setQrDataUrl(url);
      })
      .finally(() => setLoading(false));
  }, [student, isOpen]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState('');
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement>(null);

  // Close format dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setShowPdfMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const currentClass = classes.find(c => c.id === student.classId);
  const className = currentClass?.name || student.classId || '-';
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4f46e5&color=fff&size=200&bold=true`;
  const avatarUrl = student.avatarUrl || defaultAvatar;

  const handleDownloadPdf = async (format: 'card' | 'a4' = 'card') => {
    if (!student) return;
    setIsDownloadingPdf(true);
    setShowPdfMenu(false);
    try {
      await downloadSingleStudentCardPDF(
        student,
        className,
        headmasterName,
        effectiveSchoolName,
        effectiveSchoolLogo,
        {
          format,
          onProgress: (msg) => setPdfProgressMsg(msg)
        }
      );
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('Terjadi kendala saat memproses berkas PDF. Silakan coba kembali.');
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgressMsg('');
    }
  };

  const handlePrint = () => {
    printSingleStudentCard(student, className, headmasterName, effectiveSchoolName, effectiveSchoolLogo);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Kartu Tanda Pelajar Siswa</h3>
              <p className="text-[11px] text-slate-500">Dilengkapi QR Code NISN untuk Absensi Cepat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Preview Container */}
        <div className="p-6 bg-slate-100/70 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm perspective-1000">
            {/* The Physical-ratio ID Card (85.6mm x 54mm -> aspect-[85.6/54] ~ 1.585) */}
            {!isFlipped ? (
              /* TAMPAK DEPAN */
              <div
                className="w-full aspect-[85.6/54] rounded-2xl shadow-xl overflow-hidden border flex flex-col relative transition-all transform hover:scale-[1.01]"
                style={{
                  borderColor: activePreset.borderCss,
                  backgroundImage: cardConfig.bgType === 'custom_image' && cardConfig.customBgImage ? `url(${cardConfig.customBgImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Header Pita Kartu */}
                <div className={`${activePreset.headerTailwind} px-3 py-2 flex items-center justify-between ${activePreset.borderAccent}`}>
                  {/* Logo Sekolah di Sebelah Kiri */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Logo Sekolah di Sebelah Kiri Tanpa Kotak Kontras & Tanpa Border */}
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-transparent border-0 outline-none shadow-none">
                      <img
                        src={effectiveSchoolLogo}
                        alt="Logo Resmi Sekolah"
                        className="w-full h-full object-contain border-0 outline-none shadow-none bg-transparent"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== DEFAULT_SCHOOL_LOGO) {
                            target.src = DEFAULT_SCHOOL_LOGO;
                          }
                        }}
                      />
                    </div>
                    <div className="leading-tight truncate">
                      <div className="text-[10.5px] font-black tracking-wide uppercase text-white truncate">
                        {effectiveSchoolName}
                      </div>
                      <div className="text-[8px] font-bold text-amber-300 tracking-wider uppercase">
                        KARTU TANDA PELAJAR
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body Kartu */}
                <div className={`flex-1 p-3 flex gap-3 relative ${cardConfig.bgType === 'preset' ? activePreset.bodyTailwind : 'bg-white/90 backdrop-blur-xs'}`}>
                  {/* Watermark Logo precisely in center */}
                  {cardConfig.showWatermark && (
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden"
                      style={{ opacity: Math.min(cardConfig.watermarkOpacity, 0.1) }}
                    >
                      <img
                        src={effectiveSchoolLogo}
                        alt="Watermark"
                        className="w-32 h-32 object-contain filter grayscale"
                      />
                    </div>
                  )}

                  {/* Foto Siswa */}
                  <div className="w-20 shrink-0 flex flex-col items-center relative z-10">
                    <img
                      src={avatarUrl}
                      alt={student.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultAvatar;
                      }}
                      className="w-20 h-24 object-cover rounded-lg border-2 border-slate-700/40 shadow-sm bg-slate-200"
                    />
                    {student.isKjpRecipient && (
                      <span className="mt-1 text-[8px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-xs w-full text-center">
                        KJP PLUS
                      </span>
                    )}
                  </div>

                  {/* Biodata & QR Code */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 relative z-10">
                    <div className="space-y-0.5">
                      <div className="text-[12px] font-black text-slate-950 uppercase truncate leading-tight">
                        {student.name}
                      </div>
                      <div className="text-[9px] text-slate-600 flex items-center gap-1 font-mono font-bold">
                        <span className="text-slate-400">NISN:</span>
                        <span className="text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-100">
                          {student.nisn || '-'}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-600 flex items-center gap-1 font-semibold">
                        <span className="text-slate-400">Kelas:</span>
                        <span className="font-bold text-slate-800">{className}</span>
                      </div>
                      <div className="text-[9px] text-slate-600 flex items-center gap-1 font-semibold">
                        <span className="text-slate-400">Gender:</span>
                        <span>{student.gender || '-'}</span>
                      </div>
                    </div>

                    {/* Bottom Row: QR Code on Left & Signature on Right (Posisi Semula, Lebih Besar & Rapi) */}
                    <div className="flex items-end justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1 gap-2">
                      <div className="flex items-center gap-1.5 shrink-0">
                        {loading ? (
                          <div className="w-13 h-13 bg-slate-200 animate-pulse rounded-lg" />
                        ) : (
                          <div className="p-1 bg-white rounded-lg border-2 border-slate-300 shadow-sm">
                            <img src={qrDataUrl} alt="QR NISN" className="w-11 h-11" />
                          </div>
                        )}
                        <div className="leading-none">
                          <span className="text-[8px] font-black text-slate-700 uppercase block">QR Absensi</span>
                          <span className="text-[6.5px] text-emerald-600 font-bold block mt-0.5">Scan Presensi</span>
                        </div>
                      </div>

                      <div className="text-right leading-none min-w-0">
                        <span className="text-[7.5px] font-semibold text-slate-500 block">Kepala Sekolah,</span>
                        <div className="h-3.5 flex items-center justify-end text-[7px] text-slate-400 italic">
                          (TTD &amp; Cap)
                        </div>
                        <span className="text-[8.5px] font-black text-slate-900 border-b border-slate-900 pb-0.5 inline-block truncate max-w-[120px]">
                          {headmasterName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* TAMPAK BELAKANG */
              <div
                className="w-full aspect-[85.6/54] rounded-2xl shadow-xl overflow-hidden border p-3.5 flex flex-col justify-between transition-all relative bg-gradient-to-br from-slate-50 to-purple-50/40"
                style={{ borderColor: activePreset.borderCss }}
              >
                {cardConfig.showWatermark && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden"
                    style={{ opacity: cardConfig.watermarkOpacity * 0.7 }}
                  >
                    <img
                      src={effectiveSchoolLogo}
                      alt="Watermark"
                      className="w-28 h-28 object-contain filter grayscale"
                    />
                  </div>
                )}

                <div className="text-center border-b border-purple-200 pb-1.5 relative z-10">
                  <span className="text-[10px] font-black text-purple-900 uppercase tracking-wide">
                    {cardConfig.backTitle}
                  </span>
                </div>

                <div className="text-[8px] text-slate-700 space-y-1 leading-relaxed pl-1 flex-1 overflow-y-auto relative z-10 py-1">
                  {cardConfig.rules.map((rule, idx) => (
                    <div key={idx} className="line-clamp-1">{rule}</div>
                  ))}
                  {cardConfig.footerNote && (
                    <div className="text-[7px] text-slate-500 italic pt-0.5">{cardConfig.footerNote}</div>
                  )}
                </div>

                <div className="border-t border-dashed border-purple-200 pt-1.5 text-center relative z-10">
                  <div className="text-[7.5px] text-slate-500 font-semibold uppercase tracking-wider">
                    Nomor Induk Siswa Nasional (NISN)
                  </div>
                  <div className="text-[12px] font-mono font-black text-purple-950 tracking-widest mt-0.5">
                    {student.nisn || student.id}
                  </div>
                  <div className="text-[6.5px] text-slate-400 mt-0.5">Berlaku selama menjadi siswa aktif</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Flip Toggle */}
          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-white hover:bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 shadow-sm transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-purple-600" />
            <span>{isFlipped ? 'Lihat Tampak Depan Kartu' : 'Lihat Tampak Belakang (Tata Tertib)'}</span>
          </button>
        </div>

        {/* PDF Progress Toast if downloading */}
        {isDownloadingPdf && (
          <div className="px-5 py-2.5 bg-purple-50 border-t border-purple-100 flex items-center justify-between gap-2 text-xs text-purple-900 animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
              <span className="font-semibold">{pdfProgressMsg || 'Memproses berkas PDF resolusi tinggi...'}</span>
            </div>
            <span className="text-[10px] text-purple-600 font-mono">Tunggu sebentar</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Format PDF 300 DPI siap simpan & cetak</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Tutup
            </button>

            {/* Tombol Unduh PDF Utama dengan Pilihan Format */}
            <div className="relative inline-flex" ref={pdfMenuRef}>
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() => handleDownloadPdf('card')}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-l-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Kartu Pelajar dalam bentuk PDF (Ukuran Standar ID Card)"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>Unduh PDF Kartu</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() => setShowPdfMenu(!showPdfMenu)}
                className="px-2 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-r-xl border-l border-emerald-500/50 transition-all cursor-pointer disabled:opacity-50"
                title="Pilih Format Unduh PDF"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Format Dropdown Menu */}
              {showPdfMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-left text-xs space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Format Berkas PDF
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('card')}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 font-semibold flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ukuran Standar ID Card (CR80)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        85.6 x 54 mm (2 Halaman: Depan & Belakang)
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('a4')}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 font-semibold flex items-center justify-between text-left transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Format Lembar Kertas A4</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        1 Lembar A4 siap cetak printer & gunting rapi
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Tombol Cetak Browser */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
