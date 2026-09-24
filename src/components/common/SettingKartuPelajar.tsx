import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Upload,
  RotateCw,
  Printer,
  CheckCircle2,
  AlertCircle,
  Save,
  Image as ImageIcon,
  School,
  FileText,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  QrCode,
  Palette,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  Eye,
  Sliders,
  Download
} from 'lucide-react';
import { getEffectiveSchoolLogo, saveSchoolCardLogo, DEFAULT_SCHOOL_LOGO } from '../../utils/schoolLogoHelper';
import {
  CARD_BACKGROUND_PRESETS,
  CardBackgroundPreset,
  RULE_TEMPLATES,
  getCardDesignConfig,
  saveCardDesignConfig,
  getPresetById
} from '../../utils/cardDesignHelper';
import { saveCardDesignToFirestore } from '../../lib/firebase';
import { printSingleStudentCard } from '../../utils/qrHelper';
import { downloadSingleStudentCardPDF } from '../../utils/cardPdfHelper';
import { Student } from '../../types';

export default function SettingKartuPelajar() {
  // Config from cardDesignHelper
  const initialConfig = getCardDesignConfig();

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string>(getEffectiveSchoolLogo);
  const [schoolName, setSchoolName] = useState<string>(
    localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA'
  );
  const [cardTitle, setCardTitle] = useState<string>(
    localStorage.getItem('siakad_card_title') || 'KARTU TANDA PELAJAR'
  );
  const [cardSubtitle, setCardSubtitle] = useState<string>(
    localStorage.getItem('siakad_card_subtitle') || 'Sistem Absensi & Administrasi Siswa'
  );
  const [cardValidity, setCardValidity] = useState<string>(
    localStorage.getItem('siakad_card_validity') || 'Berlaku Selama Menjadi Siswa Aktif'
  );
  const [headmasterName, setHeadmasterName] = useState<string>(
    localStorage.getItem('siakad_headmaster_name') || 'Dra. Hj. Endah Purwani, M.M.'
  );
  const [headmasterNip, setHeadmasterNip] = useState<string>(
    localStorage.getItem('siakad_headmaster_nip') || '19680512 199403 2 004'
  );
  const [issueDate, setIssueDate] = useState<string>(
    localStorage.getItem('siakad_card_issue_date') || 'Jakarta, 15 Juli 2024'
  );
  const [schoolAddress, setSchoolAddress] = useState<string>(
    localStorage.getItem('siakad_kop_address') || 'Jl. Slamet Riyadi IV No. 50, Matraman, Jakarta Timur'
  );
  const [schoolContact, setSchoolContact] = useState<string>(
    localStorage.getItem('siakad_kop_contact') || 'Telp: (021) 8580550 | smpn50jakarta.sch.id'
  );

  // Background / Theme state
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialConfig.presetId);
  const [bgType, setBgType] = useState<'preset' | 'custom_image'>(initialConfig.bgType);
  const [customBgImage, setCustomBgImage] = useState<string>(initialConfig.customBgImage);
  const [showWatermark, setShowWatermark] = useState<boolean>(initialConfig.showWatermark);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(initialConfig.watermarkOpacity);

  // Rules / Tata Tertib state
  const [backTitle, setBackTitle] = useState<string>(initialConfig.backTitle);
  const [rules, setRules] = useState<string[]>(initialConfig.rules);
  const [footerNote, setFooterNote] = useState<string>(initialConfig.footerNote);

  // UI state
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bgUploadError, setBgUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = getPresetById(selectedPresetId);

  useEffect(() => {
    const handleLogoUpdated = () => {
      setLogoUrl(getEffectiveSchoolLogo());
    };
    window.addEventListener('siakad_logo_updated', handleLogoUpdated);
    return () => window.removeEventListener('siakad_logo_updated', handleLogoUpdated);
  }, []);

  // Handle Logo Upload from Local Computer / Storage
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Format file tidak didukung. Harap pilih gambar PNG, JPG, WebP, atau SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 2 MB.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Custom Background Upload
  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBgUploadError('Format gambar tidak didukung. Harap pilih gambar PNG, JPG, WebP, atau SVG.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setBgUploadError('Ukuran gambar latar maksimal 3 MB.');
      return;
    }

    setBgUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomBgImage(result);
        setBgType('custom_image');
      }
    };
    reader.readAsDataURL(file);
  };

  // Rules management functions
  const handleAddRule = () => {
    const nextNumber = rules.length + 1;
    setRules([...rules, `${nextNumber}. Poin tata tertib baru...`]);
  };

  const handleUpdateRule = (index: number, text: string) => {
    const updated = [...rules];
    updated[index] = text;
    setRules(updated);
  };

  const handleDeleteRule = (index: number) => {
    if (rules.length <= 1) return;
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
  };

  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const updated = [...rules];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setRules(updated);
  };

  const handleApplyRuleTemplate = (template: { rules: string[] }) => {
    setRules([...template.rules]);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Save Logo
    saveSchoolCardLogo(logoUrl);

    // Save Card Design & Background & Rules
    saveCardDesignConfig({
      presetId: selectedPresetId,
      bgType,
      customBgImage,
      showWatermark,
      watermarkOpacity,
      backTitle,
      rules,
      footerNote
    });

    // Save text properties
    localStorage.setItem('siakad_kop_school_title', schoolName);
    localStorage.setItem('siakad_card_title', cardTitle);
    localStorage.setItem('siakad_card_subtitle', cardSubtitle);
    localStorage.setItem('siakad_card_validity', cardValidity);
    localStorage.setItem('siakad_headmaster_name', headmasterName);
    localStorage.setItem('siakad_headmaster_nip', headmasterNip);
    localStorage.setItem('siakad_card_issue_date', issueDate);
    localStorage.setItem('siakad_kop_address', schoolAddress);
    localStorage.setItem('siakad_kop_contact', schoolContact);

    // Sync to Firestore so all student accounts reflect the changes in real-time
    saveCardDesignToFirestore({
      presetId: selectedPresetId,
      bgType,
      customBgImage,
      showWatermark,
      watermarkOpacity,
      backTitle,
      rules,
      footerNote,
      cardLogo: logoUrl,
      cardTitle,
      cardSubtitle,
      cardValidity,
      issueDate,
      schoolName,
      headmasterName,
      headmasterNip
    }).catch(err => console.warn('Error saving card design to Firestore:', err));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleResetToDefaultLogo = () => {
    setLogoUrl(DEFAULT_SCHOOL_LOGO);
  };

  const handleSyncKopLogo = () => {
    const kopRight = localStorage.getItem('siakad_logo_right');
    if (kopRight && kopRight.trim() !== '') {
      setLogoUrl(kopRight);
    } else {
      setLogoUrl(DEFAULT_SCHOOL_LOGO);
    }
  };

  // Mock Student for Preview and Test Print
  const sampleStudent: Student = {
    id: 'sample-001',
    name: 'MUHAMMAD RIZKY PRATAMA',
    nisn: '0098765432',
    classId: '7-A',
    gender: 'Laki-laki',
    address: 'Jl. Slamet Riyadi IV No. 50, Matraman',
    phone: '081234567890',
    parentName: 'Bambang Pratama',
    parentNik: '3175012345670001',
    parentPhone: '081298765432',
    parentEmail: 'bambang@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop'
  };

  const [isDownloadingTestPdf, setIsDownloadingTestPdf] = useState(false);

  const handleTestDownloadPdf = async (format: 'card' | 'a4' = 'card') => {
    setIsDownloadingTestPdf(true);
    try {
      // Temporarily sync current input state to localStorage so config reflects unsaved edits
      localStorage.setItem('siakad_card_title', cardTitle);
      localStorage.setItem('siakad_card_subtitle', cardSubtitle);
      localStorage.setItem('siakad_card_validity', cardValidity);
      localStorage.setItem('siakad_headmaster_name', headmasterName);
      localStorage.setItem('siakad_headmaster_nip', headmasterNip);
      localStorage.setItem('siakad_card_issue_date', issueDate);
      localStorage.setItem('siakad_kop_school_title', schoolName);

      await downloadSingleStudentCardPDF(
        sampleStudent,
        'Kelas 7-A (Unggulan)',
        headmasterName,
        schoolName,
        logoUrl,
        { format }
      );
    } catch (err) {
      console.error('Error downloading test PDF:', err);
      alert('Gagal mengunduh contoh PDF kartu pelajar.');
    } finally {
      setIsDownloadingTestPdf(false);
    }
  };

  const handleTestPrint = () => {
    printSingleStudentCard(
      sampleStudent,
      'Kelas 7-A (Unggulan)',
      headmasterName,
      schoolName,
      logoUrl
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 text-white rounded-2xl p-6 shadow-lg shadow-indigo-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <CreditCard className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Pengaturan Desain &amp; Konten Kartu Pelajar</h3>
              <p className="text-indigo-200 text-xs mt-1 max-w-2xl">
                Atur logo sekolah, tema latar belakang (background/gradasi), watermark, identitas kepala sekolah, serta kelola poin tata tertib kartu secara dinamis.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleTestDownloadPdf('card')}
              disabled={isDownloadingTestPdf}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
              title="Unduh Contoh PDF Kartu Pelajar (Ukuran CR80 ID Card)"
            >
              {isDownloadingTestPdf ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloadingTestPdf ? 'Merender...' : 'Unduh Contoh PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleTestPrint}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Uji Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Pengaturan Desain, Background &amp; Tata Tertib Kartu Pelajar berhasil disimpan dan tersinkronisasi!</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* Bagian 1: Pengaturan Latar Belakang (Background) & Tema */}
            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-700" />
                  1. Pengaturan Latar Belakang (Background &amp; Warna Kartu)
                </label>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Kustomisasi Bebas
                </span>
              </div>

              {/* Tipe Background: Preset atau Gambar Kustom */}
              <div className="flex items-center gap-2 border-b border-purple-100 pb-3">
                <button
                  type="button"
                  onClick={() => setBgType('preset')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    bgType === 'preset'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-purple-100/50 border border-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Pilih Tema Gradien Preset
                </button>
                <button
                  type="button"
                  onClick={() => setBgType('custom_image')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    bgType === 'custom_image'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-purple-100/50 border border-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Upload Gambar Background
                </button>
              </div>

              {bgType === 'preset' ? (
                /* Preset Background Cards */
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CARD_BACKGROUND_PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPresetId(preset.id)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                            isSelected
                              ? 'border-purple-600 ring-2 ring-purple-400 bg-white shadow-sm'
                              : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/20'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold text-slate-900 leading-tight">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          
                          {/* Palette Preview Swatches */}
                          <div className="flex items-center gap-1 mt-1">
                            {preset.previewColors.map((color, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-full border border-white/60 shadow-2xs"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>

                          <div className="text-[9px] text-slate-500 line-clamp-1 mt-1">
                            {preset.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Custom Image Background Controls */
                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-purple-100">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-20 h-14 rounded-lg bg-slate-100 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                      {customBgImage ? (
                        <img src={customBgImage} alt="Custom Background" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 w-full">
                      <input
                        type="file"
                        ref={bgFileInputRef}
                        onChange={handleBgFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => bgFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Pilih Gambar Background dari Perangkat
                        </button>
                        {customBgImage && (
                          <button
                            type="button"
                            onClick={() => setCustomBgImage('')}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                          >
                            Hapus Gambar
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Disarankan gambar motif halus, tekstur perisai, atau foto gedung sekolah resolusi proporsional (85x54 mm).
                      </p>
                      {bgUploadError && (
                        <p className="text-[11px] text-rose-600 font-medium">{bgUploadError}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Atau input URL Gambar Background Online:
                    </label>
                    <input
                      type="text"
                      value={customBgImage}
                      onChange={(e) => setCustomBgImage(e.target.value)}
                      placeholder="https://... URL gambar latar kartu"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Watermark Logo Setting */}
              <div className="bg-white p-3.5 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="toggle-watermark"
                      checked={showWatermark}
                      onChange={(e) => setShowWatermark(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="toggle-watermark" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Tampilkan Watermark Logo Samar di Tengah Kartu
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Mencetak logo sekolah berukuran besar secara transparan di tengah badan kartu.
                  </p>
                </div>

                {showWatermark && (
                  <div className="flex items-center gap-2 pl-6 sm:pl-0">
                    <span className="text-[11px] text-slate-500 font-medium">Opasitas:</span>
                    <input
                      type="range"
                      min="0.04"
                      max="0.25"
                      step="0.02"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-24 accent-purple-600 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono font-bold text-purple-700">
                      {Math.round(watermarkOpacity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian 2: Logo Resmi Kartu Pelajar */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-700" />
                  2. Logo Resmi Sekolah (Tampak Depan Kartu - Sebelah Kiri)
                </label>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  KOP Kiri Kartu
                </span>
              </div>

              {/* Logo Preview & Upload Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                {/* Logo Box */}
                <div className="w-20 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-purple-300 flex items-center justify-center p-1.5 shrink-0 overflow-hidden relative group">
                  <img
                    src={logoUrl || DEFAULT_SCHOOL_LOGO}
                    alt="Logo Kartu Pelajar"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== DEFAULT_SCHOOL_LOGO) {
                        target.src = DEFAULT_SCHOOL_LOGO;
                      }
                    }}
                  />
                </div>

                {/* Upload & Action Buttons */}
                <div className="space-y-2 w-full">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Pilih Logo Baru
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefaultLogo}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      title="Gunakan logo standar sistem SMPN 50 Jakarta"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Logo Default
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncKopLogo}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      title="Gunakan logo yang sama dengan KOP Surat Kanan"
                    >
                      <RefreshCw className="w-3 h-3 text-indigo-500" />
                      Logo KOP
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Format: PNG transparan, JPG, atau WebP. Logo akan otomatis dipasang di KOP surat kartu pelajar.
                  </p>
                  {uploadError && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>

              {/* URL Option */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Atau URL Gambar Logo:
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... URL logo sekolah"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bagian 3: Identitas Sekolah & Header Kartu */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <School className="w-4 h-4 text-slate-600" />
                3. Identitas Sekolah &amp; Header Kartu
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Nama Resmi Sekolah (Baris 1)</span>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Judul Kartu (Baris 2)</span>
                  <input
                    type="text"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Sub-Judul / Keterangan</span>
                  <input
                    type="text"
                    value={cardSubtitle}
                    onChange={(e) => setCardSubtitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Masa Berlaku Kartu</span>
                  <input
                    type="text"
                    value={cardValidity}
                    onChange={(e) => setCardValidity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 4: Legalitas & TTD Kepala Sekolah (Belakang Kartu) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                4. Pejabat Pengesah (Tampak Belakang Kartu)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Nama Kepala Sekolah</span>
                  <input
                    type="text"
                    value={headmasterName}
                    onChange={(e) => setHeadmasterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">NIP Kepala Sekolah</span>
                  <input
                    type="text"
                    value={headmasterNip}
                    onChange={(e) => setHeadmasterNip(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Tempat &amp; Tanggal Pengesahan</span>
                  <input
                    type="text"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 5: Tata Tertib & Konten Tampak Belakang Kartu (Dinamis) */}
            <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-700" />
                  5. Kelola Tata Tertib &amp; Konten Tampak Belakang Kartu
                </label>
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Poin
                </button>
              </div>

              {/* Template Pilihan Cepat Tata Tertib */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-purple-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Template Cepat Tata Tertib:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {RULE_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyRuleTemplate(tmpl)}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      title={tmpl.desc}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Judul Tata Tertib */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-700">Judul Bagian Belakang Kartu</span>
                <input
                  type="text"
                  value={backTitle}
                  onChange={(e) => setBackTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold uppercase text-purple-900"
                />
              </div>

              {/* Daftar Poin Dinamis */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  Daftar Poin Tata Tertib ({rules.length} Butir):
                </span>
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleUpdateRule(idx, e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveRule(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Geser Naik"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveRule(idx, 'down')}
                        disabled={idx === rules.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Geser Turun"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(idx)}
                        disabled={rules.length <= 1}
                        className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30 cursor-pointer"
                        title="Hapus Poin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Catatan Kaki & Kontak Tambahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Alamat Sekolah</span>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Kontak Sekolah</span>
                  <input
                    type="text"
                    value={schoolContact}
                    onChange={(e) => setSchoolContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600">Catatan Kaki (Bila Menemukan Kartu)</span>
                <input
                  type="text"
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none italic"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan &amp; Terapkan ke Seluruh Kartu Pelajar
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  Pratinjau Langsung Kartu Pelajar
                </h4>
                <p className="text-[11px] text-slate-500">Standar Ukuran Fisik ID Card ISO 7810 (85.6 x 54 mm)</p>
              </div>

              {/* Flip Button */}
              <button
                type="button"
                onClick={() => setPreviewFlipped(!previewFlipped)}
                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-purple-200 transition-all cursor-pointer shadow-2xs"
              >
                <RotateCw className="w-3.5 h-3.5 text-purple-600" />
                <span>{previewFlipped ? 'Tampak Depan' : 'Tampak Belakang'}</span>
              </button>
            </div>

            {/* Card Frame with Live Active Theme */}
            <div className="p-3 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-center">
              <div className="w-full max-w-sm">
                {!previewFlipped ? (
                  /* Tampak Depan */
                  <div
                    className="w-full aspect-[85.6/54] rounded-2xl shadow-lg overflow-hidden border flex flex-col relative transition-all"
                    style={{
                      borderColor: activePreset.borderCss,
                      backgroundImage: bgType === 'custom_image' && customBgImage ? `url(${customBgImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {/* Header Pita */}
                    <div className={`${activePreset.headerTailwind} px-3 py-2 flex items-center justify-between ${activePreset.borderAccent}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Logo Sekolah di Sebelah Kiri - Tanpa Kotak Kontras & Tanpa Border */}
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-transparent border-0 outline-none shadow-none">
                          <img
                            src={logoUrl || DEFAULT_SCHOOL_LOGO}
                            alt="Logo Sekolah"
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
                          <div className="text-[10px] font-black tracking-wide uppercase text-white truncate">
                            {schoolName}
                          </div>
                          <div className="text-[7.5px] font-bold text-amber-300 tracking-wider uppercase">
                            {cardTitle}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className={`flex-1 p-2.5 flex gap-2.5 items-center relative ${bgType === 'preset' ? activePreset.bodyTailwind : 'bg-white/90 backdrop-blur-xs'}`}>
                      {/* Watermark Logo precisely in center */}
                      {showWatermark && (
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden"
                          style={{ opacity: Math.min(watermarkOpacity, 0.1) }}
                        >
                          <img
                            src={logoUrl || DEFAULT_SCHOOL_LOGO}
                            alt="Watermark"
                            className="w-28 h-28 object-contain filter grayscale"
                          />
                        </div>
                      )}

                      {/* Foto Siswa */}
                      <div className="w-18 aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-700/30 shadow-xs shrink-0 flex items-center justify-center relative z-10">
                        <img
                          src={sampleStudent.avatarUrl}
                          alt="Foto Siswa"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Biodata & Bottom Row */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between relative z-10">
                        <div className="space-y-0.5">
                          <div>
                            <div className="text-[6.5px] text-slate-500 uppercase tracking-wider font-semibold">Nama Siswa</div>
                            <div className="text-[9.5px] font-black text-slate-900 leading-snug truncate">
                              {sampleStudent.name}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[7.5px]">
                            <div>
                              <div className="text-[6px] text-slate-500 font-semibold">NISN</div>
                              <div className="font-mono font-bold text-indigo-900">{sampleStudent.nisn}</div>
                            </div>
                            <div>
                              <div className="text-[6px] text-slate-500 font-semibold">KELAS</div>
                              <div className="font-bold text-slate-900">7-A</div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: QR on Left, Signature on Right (Posisi Semula) */}
                        <div className="flex items-end justify-between border-t border-dashed border-slate-300 pt-1 mt-1 gap-1">
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-11 h-11 bg-white p-0.5 rounded-lg border-2 border-slate-300 shadow-xs flex items-center justify-center text-center">
                              <QrCode className="w-8 h-8 text-slate-900" />
                            </div>
                            <div className="leading-none">
                              <span className="text-[6.5px] font-black text-slate-800 uppercase block">QR ABSEN</span>
                              <span className="text-[5.5px] text-emerald-600 font-bold block mt-0.5">VALID NISN</span>
                            </div>
                          </div>

                          <div className="text-right leading-none min-w-0">
                            <div className="text-[6px] text-slate-500 font-medium">Kepala Sekolah,</div>
                            <div className="h-2 flex items-center justify-end text-[5.5px] text-slate-400 italic">(TTD/Cap)</div>
                            <div className="text-[6.5px] font-bold border-b border-slate-800 pb-0.2 text-slate-900 truncate max-w-[85px]">
                              {headmasterName.split(',')[0]}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Pita */}
                    <div className="bg-slate-900 text-white px-3 py-1 flex items-center justify-between text-[7px] border-t border-amber-400/40">
                      <span className="text-slate-300 truncate">{cardSubtitle}</span>
                      <span className="font-mono text-amber-300 shrink-0 font-semibold">KARTU RESMI</span>
                    </div>
                  </div>
                ) : (
                  /* Tampak Belakang */
                  <div
                    className="w-full aspect-[85.6/54] rounded-2xl shadow-lg overflow-hidden border flex flex-col p-3 text-[7.5px] relative bg-gradient-to-br from-slate-50 to-purple-50/40"
                    style={{ borderColor: activePreset.borderCss }}
                  >
                    {showWatermark && (
                      <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden"
                        style={{ opacity: watermarkOpacity * 0.7 }}
                      >
                        <img
                          src={logoUrl || DEFAULT_SCHOOL_LOGO}
                          alt="Watermark"
                          className="w-28 h-28 object-contain filter grayscale"
                        />
                      </div>
                    )}

                    <div className="text-center font-bold text-slate-900 text-[8.5px] border-b pb-1 relative z-10">
                      {backTitle}
                    </div>

                    <div className="space-y-0.5 text-slate-700 py-1 leading-tight flex-1 overflow-y-auto relative z-10">
                      {rules.map((rule, idx) => (
                        <p key={idx} className="line-clamp-1">{rule}</p>
                      ))}
                      {footerNote && (
                        <p className="text-[6.5px] text-slate-500 pt-0.5 italic">{footerNote}</p>
                      )}
                      <p className="text-[6px] text-slate-400 pt-0.5">{schoolAddress} &bull; {schoolContact}</p>
                    </div>

                    <div className="flex justify-between items-end pt-1 border-t border-slate-200 relative z-10">
                      <div className="text-[6.5px] text-slate-400 font-mono">
                        NISN: {sampleStudent.nisn}
                      </div>
                      <div className="text-center leading-tight">
                        <div className="text-[6.5px] text-slate-600">{issueDate}</div>
                        <div className="text-[6.5px] font-semibold text-slate-800">Kepala Sekolah</div>
                        <div className="h-3.5 flex items-center justify-center my-0.5">
                          <span className="text-[6px] font-serif italic text-indigo-700">[ TTD Digital ]</span>
                        </div>
                        <div className="text-[7.5px] font-bold text-slate-900 underline">{headmasterName}</div>
                        <div className="text-[6px] font-mono text-slate-500">NIP. {headmasterNip}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons for Preview */}
            <div className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTestDownloadPdf('card')}
                  disabled={isDownloadingTestPdf}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
                  title="Unduh Contoh PDF Format Kartu Standar CR80"
                >
                  {isDownloadingTestPdf ? (
                    <RotateCw className="w-4 h-4 animate-spin text-amber-700" />
                  ) : (
                    <Download className="w-4 h-4 text-amber-700" />
                  )}
                  <span>PDF Kartu (CR80)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestDownloadPdf('a4')}
                  disabled={isDownloadingTestPdf}
                  className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
                  title="Unduh Lembar Cetak A4 Siap Potong & Laminasi"
                >
                  <Download className="w-4 h-4 text-indigo-700" />
                  <span>PDF Lembar A4</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestPrint}
                className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs"
              >
                <Printer className="w-4 h-4 text-purple-600" />
                Uji Cetak Langsung (Print Browser)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
