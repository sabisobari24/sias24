import React, { useState } from 'react';
import { Upload, Link, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { 
  fileToBase64, 
  convertGoogleDriveLink, 
  compressBase64Image, 
  enhanceAndCompressBannerImage,
  autoEnhanceImageBase64 
} from '../utils/imageHelper';
import { WebIcon } from './website/WebIcon';

interface MediaUploadSelectorProps {
  key?: React.Key;
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  type?: 'image' | 'icon';
  mode?: 'banner' | 'avatar' | 'standard' | 'icon';
  autoEnhance?: boolean;
}

const PRESET_ICONS = [
  // --- EMOJIS (EXTRACURRICULARS) ---
  { value: '⚽', label: 'Futsal/Bola' },
  { value: '🏸', label: 'Badminton' },
  { value: '🏀', label: 'Basket' },
  { value: '🥋', label: 'Pencak Silat/Bela Diri' },
  { value: '📢', label: 'Pramuka / Scout' },
  { value: '💂', label: 'Paskibra' },
  { value: '🎵', label: 'Paduan Suara / Choir' },
  { value: '🎸', label: 'Band / Musik' },
  { value: '🎨', label: 'Seni Lukis / Gambar' },
  { value: '💃', label: 'Seni Tari' },
  { value: '🎭', label: 'Teater / Drama' },
  { value: '🕌', label: 'Rohis / Keislaman' },
  { value: '⛪', label: 'Rohkris / Kristen' },
  { value: '🩺', label: 'PMR / Kesehatan' },
  { value: '🤝', label: 'OSIS / Kepemimpinan' },
  { value: '🤖', label: 'Robotik / Coding' },
  { value: '💻', label: 'TIK / Multimedia' },
  { value: '✍️', label: 'Jurnalistik / Karya Tulis' },
  { value: '🏆', label: 'Prestasi / Lomba' },
  
  // --- EMOJIS (FACILITIES) ---
  { value: '🏫', label: 'Gedung Utama' },
  { value: '📖', label: 'Perpustakaan' },
  { value: '🧪', label: 'Laboratorium IPA' },
  { value: '🖥️', label: 'Laboratorium Komputer' },
  { value: '🕌', label: 'Masjid Sekolah' },
  { value: '🏟️', label: 'Lapangan Olahraga' },
  { value: '🏥', label: 'UKS / Klinik' },
  { value: '🍽️', label: 'Kantin Sekolah' },
  { value: '🪴', label: 'Taman / Green House' },
  { value: '🚻', label: 'Toilet Bersih' },
  
  // --- EMOJIS (SUBJECTS) ---
  { value: '📐', label: 'Matematika' },
  { value: '🧬', label: 'Biologi / IPA' },
  { value: '⚛️', label: 'Fisika / Kimia' },
  { value: '🗣️', label: 'Bahasa Indonesia' },
  { value: '🇬🇧', label: 'Bahasa Inggris' },
  { value: '🗺️', label: 'IPS / Geografi' },
  { value: '📜', label: 'Sejarah' },
  { value: '🕌', label: 'Pendidikan Agama Islam' },
  { value: '📖', label: 'Pendidikan Agama Kristen' },
  { value: '⚖️', label: 'PPKn / Kewarganegaraan' },
  { value: '🎨', label: 'Seni Budaya' },
  { value: '🏃', label: 'PJOK / Olahraga' },
  { value: '🚀', label: 'Prakarya / Kewirausahaan' },
  
  // --- LUCIDE ICONS (CLASSIC) ---
  { value: 'School', label: 'Sekolah' },
  { value: 'GraduationCap', label: 'Kelulusan' },
  { value: 'Trophy', label: 'Piala' },
  { value: 'BookOpen', label: 'Buku Buka' },
  { value: 'Laptop', label: 'Laptop' },
  { value: 'Palette', label: 'Palet Lukis' },
  { value: 'Music', label: 'Musik' },
  { value: 'HeartPulse', label: 'Kesehatan' },
  { value: 'Compass', label: 'Kompas' },
  { value: 'Award', label: 'Piagam' },
  { value: 'Users', label: 'Kelompok' },
  { value: 'Star', label: 'Bintang' },
  { value: 'Sparkles', label: 'Kilau' },
  { value: 'Lightbulb', label: 'Ide/Kreatif' },
  { value: 'Activity', label: 'Aktivitas' },
  { value: 'Cpu', label: 'Elektronika' },
  { value: 'Globe', label: 'Dunia' },
  { value: 'Flame', label: 'Semangat' }
];

export default function MediaUploadSelector({
  value,
  onChange,
  label,
  placeholder = "Masukkan URL / Link foto, atau upload...",
  type = 'image',
  mode,
  autoEnhance = true
}: MediaUploadSelectorProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-detect if this field represents a banner, slide, or wide image
  const isBanner = mode === 'banner' || (
    label !== undefined && 
    /slide|banner|cover|background|latar|galeri|unggul/i.test(label)
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      let b64 = '';
      if (isBanner) {
        // High-definition wide banner with auto-clarity, edge-sharpening, and anti-blur technology (optimized for Firestore)
        b64 = await enhanceAndCompressBannerImage(file, 1280, 720, 0.78);
        setStatusMessage('Foto banner berhasil diunggah (Kualitas HD).');
      } else {
        b64 = await fileToBase64(file, 640, 640, 0.80);
        setStatusMessage('Foto berhasil diunggah dan dioptimalkan.');
      }
      onChange(b64);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.warn('Gagal memproses gambar:', err);
      setErrorMessage('Gagal membaca file gambar. Pastikan format file PNG atau JPG.');
      setTimeout(() => setErrorMessage(null), 6000);
    } finally {
      setIsUploading(false);
      try {
        if (e.target) e.target.value = '';
      } catch (_) {}
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawUrl = e.target.value;
    const converted = convertGoogleDriveLink(rawUrl);
    if (converted.startsWith('data:image/')) {
      if (isBanner) {
        enhanceAndCompressBannerImage(converted, 1280, 720, 0.75).then(res => onChange(res));
      } else {
        compressBase64Image(converted, 640, 640, 0.80).then(res => onChange(res));
      }
    } else {
      onChange(converted);
    }
  };

  const handleManualEnhance = async () => {
    if (!value || isEnhancing) return;
    setIsEnhancing(true);
    setErrorMessage(null);
    try {
      const enhanced = await autoEnhanceImageBase64(value);
      onChange(enhanced);
      setStatusMessage('Kualitas foto berhasil ditingkatkan!');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.warn('Gagal meningkatkan kualitas foto:', err);
      setErrorMessage('Gagal memproses peningkatan kualitas gambar.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">{label}</label>
          {isBanner && (
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Auto HD</span>
            </span>
          )}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Link Input field */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Link className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={value || ''}
            onChange={handleLinkChange}
            placeholder={type === 'icon' ? "Masukkan emoji (misal: 🏆), nama Lucide (misal: Award), atau link foto..." : placeholder}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 bg-slate-50 font-mono"
          />
        </div>

        {/* Upload Button */}
        <button
          type="button"
          disabled={isUploading || isEnhancing}
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
        >
          {isUploading ? (
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>{isUploading ? 'Mengunggah...' : 'Upload File'}</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          disabled={isUploading || isEnhancing}
          onChange={handleFileChange}
        />
      </div>

      {/* Auto-Enhance Status Alert / Notification */}
      {statusMessage && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
          {errorMessage}
        </div>
      )}

      {/* Recommended Icons / Emojis selection */}
      {type === 'icon' && (
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2 mt-1 shadow-inner">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <span>✨</span>
            <span>Rekomendasi Icon &amp; Emoji Populer (Klik untuk Memilih):</span>
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-[130px] overflow-y-auto pr-1">
            {PRESET_ICONS.map((preset, idx) => {
              const isSelected = value === preset.value;
              return (
                <button
                  key={`${preset.value}-${preset.label}-${idx}`}
                  type="button"
                  onClick={() => onChange(preset.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm scale-95'
                      : 'bg-white border-slate-200/60 hover:border-indigo-400 text-slate-700 hover:bg-indigo-50/50'
                  }`}
                  title={preset.label}
                >
                  <WebIcon 
                    name={preset.value} 
                    className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-600'}`} 
                  />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Section */}
      {value && (
        <div className="flex items-center gap-3 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/70 mt-1">
          {type === 'image' || value.startsWith('http') || value.startsWith('data:') ? (
            <div className={`overflow-hidden border border-slate-200 bg-slate-900 shrink-0 relative rounded-xl ${isBanner ? 'w-20 h-12' : 'w-10 h-10'}`}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=100';
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <WebIcon name={value} className="w-5 h-5 text-indigo-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preview Aktif</p>
              {isBanner && (
                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                  HD Jernih
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-600 truncate font-mono">{value}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isBanner && (
              <button
                type="button"
                disabled={isEnhancing}
                onClick={handleManualEnhance}
                className="text-[10px] text-amber-800 hover:text-amber-950 font-bold px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                title="Tingkatkan ketajaman foto ini secara otomatis oleh sistem"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{isEnhancing ? 'Mempertajam...' : 'Perbaiki Kualitas'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[10px] text-rose-500 hover:text-rose-600 font-bold px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
