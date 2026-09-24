// Helper for Student ID Card Design, Background Presets, and Rules Management
import { getEffectiveSchoolLogo, DEFAULT_SCHOOL_LOGO } from './schoolLogoHelper';

export interface CardBackgroundPreset {
  id: string;
  name: string;
  desc: string;
  headerTailwind: string;
  headerCss: string;
  bodyTailwind: string;
  bodyCss: string;
  borderAccent: string;
  borderCss: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  previewColors: string[];
}

export const CARD_BACKGROUND_PRESETS: CardBackgroundPreset[] = [
  {
    id: 'indigo_modern',
    name: 'Indigo & Ungu Modern',
    desc: 'Standar elegan Kemdikbud dengan gradasi indigo dan ungu berpadu aksen emas.',
    headerTailwind: 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-800 text-white',
    headerCss: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #581c87 100%)',
    bodyTailwind: 'bg-gradient-to-br from-slate-50 via-white to-purple-50/30',
    bodyCss: 'radial-gradient(circle at 90% 10%, rgba(243,244,246,0.8) 0%, #ffffff 100%)',
    borderAccent: 'border-b-2 border-amber-400',
    borderCss: '#fbbf24',
    badgeBg: 'bg-amber-400/20',
    badgeText: 'text-amber-200 border-amber-400/40',
    accentColor: '#f59e0b',
    previewColors: ['#1e1b4b', '#4338ca', '#581c87', '#fbbf24']
  },
  {
    id: 'royal_navy',
    name: 'Biru Navy & Emas Kerajaan',
    desc: 'Nuansa resmi kedinasan dan kementerian, navy gelap dengan border emas mewah.',
    headerTailwind: 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white',
    headerCss: 'linear-gradient(135deg, #0f172a 0%, #172554 60%, #1e3a8a 100%)',
    bodyTailwind: 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30',
    bodyCss: 'radial-gradient(circle at 90% 10%, rgba(239,246,255,0.8) 0%, #ffffff 100%)',
    borderAccent: 'border-b-2 border-yellow-400',
    borderCss: '#facc15',
    badgeBg: 'bg-yellow-400/20',
    badgeText: 'text-yellow-200 border-yellow-400/40',
    accentColor: '#eab308',
    previewColors: ['#0f172a', '#1e3a8a', '#1d4ed8', '#facc15']
  },
  {
    id: 'emerald_fresh',
    name: 'Hijau Zamrud & Daun Segar',
    desc: 'Nuansa alami, madrasah dan sekolah adiwiyata berkarakter lingkungan asri.',
    headerTailwind: 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 text-white',
    headerCss: 'linear-gradient(135deg, #022c22 0%, #064e3b 60%, #0f766e 100%)',
    bodyTailwind: 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30',
    bodyCss: 'radial-gradient(circle at 90% 10%, rgba(236,253,245,0.8) 0%, #ffffff 100%)',
    borderAccent: 'border-b-2 border-emerald-400',
    borderCss: '#34d399',
    badgeBg: 'bg-emerald-400/20',
    badgeText: 'text-emerald-200 border-emerald-400/40',
    accentColor: '#10b981',
    previewColors: ['#022c22', '#065f46', '#059669', '#34d399']
  },
  {
    id: 'crimson_red',
    name: 'Merah Marun & Emas Kehormatan',
    desc: 'Nuansa patriotik, berani dan prestisius dengan merah tua marun yang tegas.',
    headerTailwind: 'bg-gradient-to-r from-rose-950 via-red-900 to-rose-800 text-white',
    headerCss: 'linear-gradient(135deg, #4c0519 0%, #7f1d1d 60%, #991b1b 100%)',
    bodyTailwind: 'bg-gradient-to-br from-slate-50 via-white to-rose-50/30',
    bodyCss: 'radial-gradient(circle at 90% 10%, rgba(255,241,242,0.8) 0%, #ffffff 100%)',
    borderAccent: 'border-b-2 border-amber-300',
    borderCss: '#fcd34d',
    badgeBg: 'bg-amber-400/20',
    badgeText: 'text-amber-100 border-amber-300/40',
    accentColor: '#e11d48',
    previewColors: ['#4c0519', '#991b1b', '#b91c1c', '#fcd34d']
  },
  {
    id: 'cyan_tech',
    name: 'Biru Cyan & Slate Futuristik',
    desc: 'Nuansa teknologi modern, sekolah digital berbasis smart school dan sains.',
    headerTailwind: 'bg-gradient-to-r from-slate-950 via-cyan-950 to-cyan-900 text-white',
    headerCss: 'linear-gradient(135deg, #020617 0%, #083344 60%, #155e75 100%)',
    bodyTailwind: 'bg-gradient-to-br from-slate-50 via-white to-cyan-50/30',
    bodyCss: 'radial-gradient(circle at 90% 10%, rgba(236,254,255,0.8) 0%, #ffffff 100%)',
    borderAccent: 'border-b-2 border-cyan-400',
    borderCss: '#22d3ee',
    badgeBg: 'bg-cyan-400/20',
    badgeText: 'text-cyan-200 border-cyan-400/40',
    accentColor: '#06b6d4',
    previewColors: ['#020617', '#083344', '#0891b2', '#22d3ee']
  },
  {
    id: 'clean_slate',
    name: 'Putih Bersih Minimalis',
    desc: 'Tampilan bersih monokromatik modern, hemat tinta printer dan sangat tajam.',
    headerTailwind: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white',
    headerCss: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
    bodyTailwind: 'bg-white',
    bodyCss: '#ffffff',
    borderAccent: 'border-b-2 border-slate-400',
    borderCss: '#94a3b8',
    badgeBg: 'bg-slate-700',
    badgeText: 'text-slate-200 border-slate-600',
    accentColor: '#475569',
    previewColors: ['#0f172a', '#334155', '#64748b', '#cbd5e1']
  }
];

export interface CardDesignConfig {
  presetId: string;
  bgType: 'preset' | 'custom_image';
  customBgImage: string;
  showWatermark: boolean;
  watermarkOpacity: number;
  backTitle: string;
  rules: string[];
  footerNote: string;
}

export const DEFAULT_CARD_RULES: string[] = [
  '1. Kartu ini adalah tanda pengenal sah siswa SMP NEGERI 50 JAKARTA.',
  '2. Wajib dibawa setiap hari dan digunakan saat presensi QR code masuk/pulang.',
  '3. Kartu ini tidak boleh dipindahtangankan atau digunakan orang lain.',
  '4. Dapat digunakan untuk layanan perpustakaan & asesmen sekolah.',
  '5. Apabila kartu hilang atau rusak, segera melapor ke bagian Tata Usaha.'
];

export const RULE_TEMPLATES: { name: string; desc: string; rules: string[] }[] = [
  {
    name: 'Standar Akademik & Absensi',
    desc: 'Fokus pada identitas resmi, presensi harian, dan tata usaha.',
    rules: [
      '1. Kartu ini adalah tanda pengenal sah siswa SMP NEGERI 50 JAKARTA.',
      '2. Wajib dibawa setiap hari dan digunakan saat presensi QR code masuk & pulang.',
      '3. Kartu ini tidak boleh dipindahtangankan atau dipinjamkan kepada orang lain.',
      '4. Dapat digunakan untuk peminjaman buku perpustakaan & kegiatan asesmen sekolah.',
      '5. Apabila kartu hilang atau rusak, segera melapor ke bagian Tata Usaha.'
    ]
  },
  {
    name: 'Perpustakaan & Smart School',
    desc: 'Menekankan penggunaan kartu digital untuk fasilitas perpustakaan dan laboratorium.',
    rules: [
      '1. Kartu Tanda Pelajar resmi untuk akses gerbang pintar dan perpustakaan digital.',
      '2. Tunjukkan QR Code saat meminjam buku, akses lab komputer, dan presensi kelas.',
      '3. Jaga keutuhan kartu dan barcode agar tetap terbaca jelas oleh sensor scanner.',
      '4. Kartu berlaku selama peserta didik berstatus aktif di sekolah ini.',
      '5. Penggantian kartu hilang/rusak dikenakan biaya administrasi resmi tata usaha.'
    ]
  },
  {
    name: 'Kedisiplinan & Ketertiban',
    desc: 'Menekankan sanksi pemindahtanganan dan tanggung jawab siswa.',
    rules: [
      '1. Siswa wajib mengenakan kartu pelajar selama berada di lingkungan sekolah.',
      '2. Dilarang keras memalsukan atau menyalahgunakan kartu milik siswa lain.',
      '3. Pelanggaran peminjaman barcode absensi akan dikenakan sanksi tata tertib.',
      '4. Kehilangan kartu wajib disertai surat keterangan wali kelas untuk cetak ulang.',
      '5. Kartu harus dikembalikan ke sekolah saat siswa dinyatakan lulus atau mutasi.'
    ]
  }
];

export function getCardDesignConfig(): CardDesignConfig {
  if (typeof window === 'undefined') {
    return {
      presetId: 'indigo_modern',
      bgType: 'preset',
      customBgImage: '',
      showWatermark: true,
      watermarkOpacity: 0.1,
      backTitle: 'Ketentuan & Tata Tertib Kartu',
      rules: DEFAULT_CARD_RULES,
      footerNote: 'Bila menemukan kartu ini harap kembalikan ke SMPN 50 Jakarta atau hubungi (021) 8580550.'
    };
  }

  const presetId = localStorage.getItem('siakad_card_preset') || 'indigo_modern';
  const bgType = (localStorage.getItem('siakad_card_bg_type') as 'preset' | 'custom_image') || 'preset';
  const customBgImage = localStorage.getItem('siakad_card_bg_image') || '';
  const showWatermark = localStorage.getItem('siakad_card_show_watermark') !== 'false';
  const watermarkOpacity = parseFloat(localStorage.getItem('siakad_card_watermark_opacity') || '0.1');
  const backTitle = localStorage.getItem('siakad_card_back_title') || 'Ketentuan & Tata Tertib Kartu';
  const footerNote = localStorage.getItem('siakad_card_footer_note') || 'Bila menemukan kartu ini harap kembalikan ke SMPN 50 Jakarta atau hubungi (021) 8580550.';

  // Retrieve rules: either from JSON array or fallback to legacy rule1, rule2, rule3
  let rules = DEFAULT_CARD_RULES;
  const savedRulesJson = localStorage.getItem('siakad_card_rules');
  if (savedRulesJson) {
    try {
      const parsed = JSON.parse(savedRulesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        rules = parsed;
      }
    } catch {
      // fallback
    }
  } else {
    // Check legacy
    const r1 = localStorage.getItem('siakad_card_rule1');
    const r2 = localStorage.getItem('siakad_card_rule2');
    const r3 = localStorage.getItem('siakad_card_rule3');
    if (r1 || r2 || r3) {
      rules = [r1, r2, r3].filter(Boolean) as string[];
    }
  }

  return {
    presetId,
    bgType,
    customBgImage,
    showWatermark,
    watermarkOpacity,
    backTitle,
    rules,
    footerNote
  };
}

export function saveCardDesignConfig(config: Partial<CardDesignConfig>): void {
  if (typeof window === 'undefined') return;

  if (config.presetId !== undefined) {
    localStorage.setItem('siakad_card_preset', config.presetId);
  }
  if (config.bgType !== undefined) {
    localStorage.setItem('siakad_card_bg_type', config.bgType);
  }
  if (config.customBgImage !== undefined) {
    localStorage.setItem('siakad_card_bg_image', config.customBgImage);
  }
  if (config.showWatermark !== undefined) {
    localStorage.setItem('siakad_card_show_watermark', config.showWatermark ? 'true' : 'false');
  }
  if (config.watermarkOpacity !== undefined) {
    localStorage.setItem('siakad_card_watermark_opacity', config.watermarkOpacity.toString());
  }
  if (config.backTitle !== undefined) {
    localStorage.setItem('siakad_card_back_title', config.backTitle);
  }
  if (config.footerNote !== undefined) {
    localStorage.setItem('siakad_card_footer_note', config.footerNote);
  }
  if (config.rules !== undefined) {
    localStorage.setItem('siakad_card_rules', JSON.stringify(config.rules));
    // Also sync legacy rule1, rule2, rule3 for backward compatibility
    if (config.rules[0]) localStorage.setItem('siakad_card_rule1', config.rules[0]);
    if (config.rules[1]) localStorage.setItem('siakad_card_rule2', config.rules[1]);
    if (config.rules[2]) localStorage.setItem('siakad_card_rule3', config.rules[2]);
  }

  // Notify components
  window.dispatchEvent(new CustomEvent('siakad_card_design_updated'));
}

export function getPresetById(presetId: string): CardBackgroundPreset {
  return CARD_BACKGROUND_PRESETS.find(p => p.id === presetId) || CARD_BACKGROUND_PRESETS[0];
}
