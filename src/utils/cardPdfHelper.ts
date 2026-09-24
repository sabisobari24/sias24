// Helper for generating High-Resolution Official Student ID Card PDF (ISO 7810 & A4 Print Sheet)
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { Student, SchoolClass } from '../types';
import { getEffectiveSchoolLogo, DEFAULT_SCHOOL_LOGO } from './schoolLogoHelper';

export interface CardColorPreset {
  id: string;
  name: string;
  headerCss: string;
  bodyCss: string;
  borderCss: string;
  accentColor: string;
}

export const CARD_COLOR_PRESETS: Record<string, CardColorPreset> = {
  emerald: {
    id: 'emerald',
    name: 'Hijau Toska (Modern)',
    headerCss: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
    bodyCss: 'linear-gradient(160deg, #f0fdfa 0%, #f8fafc 100%)',
    borderCss: '#0d9488',
    accentColor: '#0f766e'
  },
  classic: {
    id: 'classic',
    name: 'Biru Tua (Klasik Resmi)',
    headerCss: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    bodyCss: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)',
    borderCss: '#312e81',
    accentColor: '#1e1b4b'
  },
  royal_purple: {
    id: 'royal_purple',
    name: 'Ungu Elegan (Institusional)',
    headerCss: 'linear-gradient(135deg, #581c87 0%, #7e22ce 100%)',
    bodyCss: 'linear-gradient(160deg, #faf5ff 0%, #f8fafc 100%)',
    borderCss: '#7e22ce',
    accentColor: '#581c87'
  },
  navy_gold: {
    id: 'navy_gold',
    name: 'Navy & Gold (Eksklusif)',
    headerCss: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)',
    bodyCss: 'linear-gradient(160deg, #fbfbfb 0%, #f4f6f8 100%)',
    borderCss: '#d97706',
    accentColor: '#0b192c'
  },
  crimson: {
    id: 'crimson',
    name: 'Merah Marun (Prestasi)',
    headerCss: 'linear-gradient(135deg, #881337 0%, #be123c 100%)',
    bodyCss: 'linear-gradient(160deg, #fff1f2 0%, #f8fafc 100%)',
    borderCss: '#be123c',
    accentColor: '#881337'
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monokrom (Minimalis)',
    headerCss: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    bodyCss: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)',
    borderCss: '#475569',
    accentColor: '#0f172a'
  }
};

export interface CardAdminConfig {
  colorPresetId: string;
  bgType: 'preset' | 'custom_image';
  customBgImage?: string;
  cardTitle: string;
  cardSubtitle: string;
  cardValidity: string;
  showWatermark: boolean;
  watermarkOpacity: number;
  backTitle: string;
  rules: string[];
  footerNote: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  headmasterName: string;
  headmasterNip: string;
  issueDate: string;
  schoolLogo: string;
  preset: CardColorPreset;
}

/**
 * Load complete admin card settings from localStorage
 */
export function getFullCardAdminConfig(overrides?: Partial<CardAdminConfig>): CardAdminConfig {
  let cardConfig = {
    colorTheme: 'classic',
    bgType: 'preset',
    customBgImage: '',
    cardTitle: 'Kartu Tanda Pelajar',
    cardSubtitle: 'Sistem Absensi & Administrasi Siswa',
    cardValidity: 'Berlaku Selama Menjadi Siswa Aktif',
    showWatermark: true,
    watermarkOpacity: 0.08, // Subtle opacity for clean text legibility
    backTitle: 'Ketentuan & Tata Tertib Kartu',
    rules: [
      'Kartu ini adalah tanda pengenal sah siswa SMP NEGERI 50 JAKARTA.',
      'Wajib dibawa setiap hari dan digunakan saat presensi QR code masuk/pulang.',
      'Kartu ini tidak boleh dipindahtangankan atau digunakan orang lain.',
      'Dapat digunakan untuk layanan perpustakaan & asesmen sekolah.',
      'Apabila kartu hilang atau rusak, segera melapor ke bagian Tata Usaha.'
    ],
    footerNote: 'Bila menemukan kartu ini harap kembalikan ke SMPN 50 Jakarta atau hubungi (021) 8580550.'
  };

  try {
    const saved = localStorage.getItem('siakad_card_config');
    if (saved) {
      cardConfig = { ...cardConfig, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Failed to parse card config:', err);
  }

  const presetId = overrides?.colorPresetId || cardConfig.colorTheme || 'classic';
  const preset = CARD_COLOR_PRESETS[presetId] || CARD_COLOR_PRESETS.classic;

  const schoolName =
    overrides?.schoolName ||
    localStorage.getItem('siakad_kop_school_title') ||
    localStorage.getItem('siakad_school_name') ||
    'SMP NEGERI 50 JAKARTA';

  const schoolAddress =
    overrides?.schoolAddress ||
    localStorage.getItem('siakad_kop_address') ||
    'Jl. Slamet Riyadi IV No. 50, Matraman, Jakarta Timur';

  const schoolContact =
    overrides?.schoolContact ||
    localStorage.getItem('siakad_kop_phone') ||
    'Telp: (021) 8580550 | smpn50jakarta.sch.id';

  const headmasterName =
    overrides?.headmasterName ||
    localStorage.getItem('siakad_headmaster_name') ||
    'Dra. Hj. Endah Purwani, M.M.';

  const headmasterNip =
    overrides?.headmasterNip ||
    localStorage.getItem('siakad_headmaster_nip') ||
    '196711261991032004';

  const schoolLogo = overrides?.schoolLogo || getEffectiveSchoolLogo();

  return {
    colorPresetId: presetId,
    preset,
    bgType: (cardConfig.bgType as 'preset' | 'custom_image') || 'preset',
    customBgImage: cardConfig.customBgImage || '',
    cardTitle: cardConfig.cardTitle || 'KARTU TANDA PELAJAR',
    cardSubtitle: cardConfig.cardSubtitle || 'Sistem Absensi & Administrasi Siswa',
    cardValidity: cardConfig.cardValidity || 'Berlaku Selama Menjadi Siswa Aktif',
    showWatermark: cardConfig.showWatermark ?? true,
    watermarkOpacity: typeof cardConfig.watermarkOpacity === 'number' ? cardConfig.watermarkOpacity : 0.08,
    backTitle: cardConfig.backTitle || 'KETENTUAN & TATA TERTIB KARTU',
    schoolName,
    schoolAddress,
    schoolContact,
    headmasterName,
    headmasterNip,
    issueDate: overrides?.issueDate || 'Jakarta, 15 Juli 2024',
    schoolLogo,
    rules: cardConfig.rules && cardConfig.rules.length > 0 ? cardConfig.rules : [
      'Kartu ini adalah tanda pengenal sah siswa SMP NEGERI 50 JAKARTA.',
      'Wajib dibawa setiap hari dan digunakan saat presensi QR code masuk/pulang.',
      'Kartu ini tidak boleh dipindahtangankan atau digunakan orang lain.',
      'Dapat digunakan untuk layanan perpustakaan & asesmen sekolah.',
      'Apabila kartu hilang atau rusak, segera melapor ke bagian Tata Usaha.'
    ],
    footerNote: cardConfig.footerNote || 'Bila menemukan kartu ini harap kembalikan ke SMPN 50 Jakarta atau hubungi (021) 8580550.'
  };
}

/**
 * Generate a pristine high-resolution PNG Avatar data URL using pure HTML5 Canvas.
 * Unlike SVG data URLs, PNG data URLs are 100% rendered by html2canvas without CORS or blank box issues.
 */
export function createStudentAvatarPng(name: string, gender?: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background gradient: Deep royal navy blue formal student backdrop
  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, '#1e3a8a');
  grad.addColorStop(0.6, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 240, 300);

  // Soft studio light radial highlight behind portrait
  const glow = ctx.createRadialGradient(120, 110, 15, 120, 110, 95);
  glow.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
  glow.addColorStop(1, 'rgba(30, 58, 138, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(120, 110, 95, 0, Math.PI * 2);
  ctx.fill();

  // White Uniform Shoulders & Torso (Indonesian School Uniform style)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(25, 300);
  ctx.quadraticCurveTo(45, 185, 120, 170);
  ctx.quadraticCurveTo(195, 185, 215, 300);
  ctx.closePath();
  ctx.fill();

  // School Uniform Collar details
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(90, 175);
  ctx.lineTo(120, 215);
  ctx.lineTo(150, 175);
  ctx.stroke();

  // Formal School Tie (Navy Blue)
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(112, 195);
  ctx.lineTo(128, 195);
  ctx.lineTo(124, 265);
  ctx.lineTo(120, 280);
  ctx.lineTo(116, 265);
  ctx.closePath();
  ctx.fill();

  // Avatar Head Circle
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(120, 100, 48, 0, Math.PI * 2);
  ctx.fill();

  // Head contour border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Student Initials in Head
  const initials = (name || 'S')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || 'S';

  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 120, 100);

  // Outer border frame for the photo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 236, 296);

  return canvas.toDataURL('image/png');
}

/**
 * Safely convert any image URL (student photo or school logo) into a clean, CORS-free PNG Data URL.
 * Guarantees zero blank grey boxes in PDF generation.
 */
async function toSafeDataURL(src: string, fallbackGenerator: () => string): Promise<string> {
  if (!src || src.trim() === '') {
    return fallbackGenerator();
  }

  // Already a safe Base64 image
  if (src.startsWith('data:image/png') || src.startsWith('data:image/jpeg')) {
    return src;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Safety timeout: Never hang PDF generation
    const timer = setTimeout(() => {
      resolve(fallbackGenerator());
    }, 2500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 240;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        // Tainted canvas due to CORS
      }
      resolve(fallbackGenerator());
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(fallbackGenerator());
    };

    img.src = src;
  });
}

/**
 * Build pixel-perfect offscreen HTML elements for front & back student card.
 * Dimensions: 856px x 540px (Exactly matches standard CR80 ISO 7810 85.6mm x 54mm with 1.585185 ratio).
 */
async function createCardElements(
  student: Student,
  className: string,
  headmasterName?: string,
  schoolName?: string,
  customSchoolLogo?: string
): Promise<{ frontEl: HTMLElement; backEl: HTMLElement; cleanup: () => void }> {
  const config = getFullCardAdminConfig({
    schoolName,
    headmasterName,
    schoolLogo: customSchoolLogo
  });

  // Pre-generate QR Code as high-res PNG data URL
  const qrDataUrl = await QRCode.toDataURL(student.nisn || student.id, {
    width: 280,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });

  // Convert School Logo to safe PNG data URL
  const logoDataUrl = await toSafeDataURL(
    config.schoolLogo,
    () => DEFAULT_SCHOOL_LOGO
  );

  // Convert Student Avatar to safe PNG data URL (or professional student avatar PNG)
  const avatarDataUrl = await toSafeDataURL(
    student.avatarUrl || '',
    () => createStudentAvatarPng(student.name, student.gender)
  );

  // Hidden offscreen container attached to body for full layout computation
  // Placed at -9999px with opacity: 1 and visibility: visible so html2canvas renders text & fonts perfectly
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-9999px';
  container.style.width = '856px';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  container.style.background = '#ffffff';

  // Front Card Element (856px x 540px)
  const frontEl = document.createElement('div');
  frontEl.style.width = '856px';
  frontEl.style.height = '540px';
  frontEl.style.position = 'relative';
  frontEl.style.overflow = 'hidden';
  frontEl.style.boxSizing = 'border-box';
  frontEl.style.borderRadius = '24px';
  frontEl.style.border = `2.5px solid ${config.preset.borderCss}`;
  frontEl.style.display = 'flex';
  frontEl.style.flexDirection = 'column';
  frontEl.style.fontFamily = "Arial, Helvetica, sans-serif";
  frontEl.style.backgroundColor = '#ffffff';

  const safeWatermarkOpacity = Math.min(config.watermarkOpacity, 0.08);

  frontEl.innerHTML = `
    <!-- Header: min-height 84px with generous vertical breathing room for font ascent -->
    <div style="min-height: 84px; background: ${config.preset.headerCss}; border-bottom: 3.5px solid ${config.preset.borderCss}; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
      <div style="display: flex; align-items: center; gap: 16px; min-width: 0; flex: 1;">
        <div style="width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <img src="${logoDataUrl}" alt="Logo Sekolah" style="max-width: 56px; max-height: 56px; object-fit: contain;" />
        </div>
        <div style="min-width: 0; flex: 1;">
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; line-height: 1.35; padding: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${config.schoolName}
          </div>
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; color: #fef08a; text-transform: uppercase; letter-spacing: 0.8px; line-height: 1.3;">
            ${config.cardTitle}
          </div>
        </div>
      </div>
    </div>

    <!-- Body: 426px with balanced layout -->
    <div style="flex: 1; padding: 18px 24px 14px 24px; display: flex; gap: 24px; background: ${config.bgType === 'custom_image' && config.customBgImage ? `url(${config.customBgImage}) center/cover no-repeat` : config.preset.bodyCss}; position: relative; box-sizing: border-box;">
      ${config.showWatermark ? `
        <!-- Watermark precisely centered on the whole card -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 210px; height: 210px; display: flex; align-items: center; justify-content: center; opacity: ${safeWatermarkOpacity}; pointer-events: none; z-index: 0;">
          <img src="${logoDataUrl}" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(100%); background: transparent;" />
        </div>
      ` : ''}

      <!-- Left: Photo Column -->
      <div style="width: 170px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1;">
        <div style="width: 170px; height: 215px; border-radius: 12px; border: 2.5px solid #1e1b4b; overflow: hidden; background: #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.12);">
          <img src="${avatarDataUrl}" alt="${student.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        </div>
        ${student.isKjpRecipient ? `
          <div style="width: 170px; margin-top: 8px; background: #059669; color: #ffffff; font-size: 12.5px; font-weight: 800; padding: 5px 0; border-radius: 8px; text-align: center; letter-spacing: 0.5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            KJP PLUS
          </div>
        ` : `
          <div style="width: 170px; margin-top: 10px; text-align: center; font-size: 11px; font-weight: 700; color: #4338ca; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 5px 6px; border-radius: 6px; box-sizing: border-box;">
            ${config.cardValidity}
          </div>
        `}
      </div>

      <!-- Right: Student Details & Bottom Row (Signature on Left, Larger Elegant QR on Right) -->
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; position: relative; z-index: 1;">
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
          <tr>
            <td style="width: 90px; color: #64748b; font-weight: 600; font-size: 14px; padding: 4px 0; vertical-align: top;">Nama</td>
            <td style="width: 14px; color: #64748b; font-size: 14px; padding: 4px 0; vertical-align: top;">:</td>
            <td style="font-weight: 900; color: #0f172a; font-size: 17px; text-transform: uppercase; padding: 4px 0; vertical-align: top; line-height: 1.25; word-break: break-word;">${student.name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 14px; padding: 4px 0; vertical-align: top;">NISN</td>
            <td style="color: #64748b; font-size: 14px; padding: 4px 0; vertical-align: top;">:</td>
            <td style="font-size: 16px; font-weight: 800; color: #1e1b4b; letter-spacing: 0.5px; padding: 4px 0; vertical-align: top;">${student.nisn || '-'}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 14px; padding: 4px 0; vertical-align: top;">Kelas</td>
            <td style="color: #64748b; font-size: 14px; padding: 4px 0; vertical-align: top;">:</td>
            <td style="font-weight: 700; font-size: 15px; color: #334155; padding: 4px 0; vertical-align: top;">${className}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 14px; padding: 4px 0; vertical-align: top;">Gender</td>
            <td style="color: #64748b; font-size: 14px; padding: 4px 0; vertical-align: top;">:</td>
            <td style="font-weight: 600; font-size: 14.5px; color: #475569; padding: 4px 0; vertical-align: top;">${student.gender || '-'}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13.5px; padding: 4px 0; vertical-align: top;">Status</td>
            <td style="color: #64748b; font-size: 13.5px; padding: 4px 0; vertical-align: top;">:</td>
            <td style="font-weight: 700; font-size: 13.5px; color: #059669; padding: 4px 0; vertical-align: top;">Siswa Aktif Terdaftar</td>
          </tr>
        </table>

        <!-- Bottom Row: QR Absensi Lebih Besar di KIRI & Pengesahan Kepala Sekolah di KANAN (Posisi Semula) -->
        <div style="display: flex; align-items: flex-end; justify-content: space-between; border-top: 1.5px dashed #cbd5e1; padding-top: 10px; margin-top: 6px; gap: 16px;">
          <!-- Larger Elegant QR Code Block on LEFT (Posisi Semula, Ukuran Lebih Besar & Jelas) -->
          <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
            <div style="width: 100px; height: 100px; border: 2px solid ${config.preset.borderCss}; border-radius: 12px; background: #ffffff; padding: 5px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); box-sizing: border-box; display: flex; align-items: center; justify-content: center;">
              <img src="${qrDataUrl}" alt="QR Absensi" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
            </div>
            <div style="font-family: Arial, Helvetica, sans-serif;">
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase;">QR ABSENSI</div>
              <div style="font-size: 10px; font-weight: 700; color: #059669; margin-top: 3px; letter-spacing: 0.3px;">SCAN MASUK / PULANG</div>
              <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-top: 2px;">Presensi Siswa Resmi</div>
            </div>
          </div>

          <!-- Signature Block on RIGHT (Posisi Semula, Rapi & Tidak Tumpang Tindih) -->
          <div style="flex: 1; text-align: right; font-family: Arial, Helvetica, sans-serif; min-width: 190px;">
            <div style="font-size: 12.5px; font-weight: 600; color: #334155; line-height: 1.2;">Kepala Sekolah,</div>
            <div style="height: 32px; display: flex; align-items: center; justify-content: flex-end; font-style: italic; font-size: 11px; color: #94a3b8;">[ TTD &amp; Cap ]</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; border-bottom: 1.5px solid #0f172a; display: inline-block; padding-bottom: 2px; line-height: 1.2;">
              ${config.headmasterName}
            </div>
            <div style="font-size: 11.5px; font-weight: 600; color: #475569; margin-top: 4px; line-height: 1.2;">
              NIP. ${config.headmasterNip}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Ribbon: 30px with clear, vertically centered text -->
    <div style="height: 30px; background: #0f172a; border-top: 1px solid rgba(251, 191, 36, 0.4); padding: 0 24px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif;">
      <span style="font-size: 11px; font-weight: 500; color: #94a3b8; line-height: 1;">${config.cardSubtitle}</span>
      <span style="font-size: 11px; font-weight: 800; color: #fde047; letter-spacing: 0.5px; line-height: 1;">KARTU RESMI</span>
    </div>
  `;

  // Back Card Element (856px x 540px)
  const backEl = document.createElement('div');
  backEl.style.width = '856px';
  backEl.style.height = '540px';
  backEl.style.position = 'relative';
  backEl.style.overflow = 'hidden';
  backEl.style.boxSizing = 'border-box';
  backEl.style.borderRadius = '24px';
  backEl.style.border = `2.5px solid ${config.preset.borderCss}`;
  backEl.style.display = 'flex';
  backEl.style.flexDirection = 'column';
  backEl.style.justifyContent = 'space-between';
  backEl.style.fontFamily = "Arial, Helvetica, sans-serif";
  backEl.style.background = 'linear-gradient(145deg, #fafafa 0%, #f8fafc 50%, #f1f5f9 100%)';
  backEl.style.padding = '22px 28px';

  backEl.innerHTML = `
    ${config.showWatermark ? `
      <!-- Watermark precisely centered on the back card -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 210px; height: 210px; display: flex; align-items: center; justify-content: center; opacity: ${safeWatermarkOpacity * 0.75}; pointer-events: none; z-index: 0;">
        <img src="${logoDataUrl}" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(100%); background: transparent;" />
      </div>
    ` : ''}

    <!-- Header Belakang: Elegant cleanly aligned accent bar -->
    <div style="border-bottom: 2.5px solid ${config.preset.borderCss}; padding-bottom: 8px; position: relative; z-index: 1; text-align: center;">
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 800; color: ${config.preset.accentColor || '#1e1b4b'}; text-transform: uppercase; letter-spacing: 0.8px;">
        ${config.backTitle || 'KETENTUAN & TATA TERTIB KARTU'}
      </div>
    </div>

    <!-- Middle: Rules List with readable spacing -->
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; padding: 10px 0; position: relative; z-index: 1;">
      <div style="display: flex; flex-direction: column; gap: 7px;">
        ${config.rules.map((r, i) => `
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.45; color: #1e293b; display: flex; gap: 10px; align-items: flex-start;">
            <span style="color: ${config.preset.accentColor || '#4338ca'}; font-weight: 800; font-size: 13px; flex-shrink: 0;">${i + 1}.</span>
            <span style="flex: 1; font-weight: 500;">${r.replace(/^\d+[\.\)]\s*/, '')}</span>
          </div>
        `).join('')}
      </div>

      ${config.footerNote ? `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11.5px; font-style: italic; color: #475569; margin-top: 8px; padding: 6px 12px; background: rgba(0,0,0,0.025); border-left: 3px solid ${config.preset.borderCss}; border-radius: 4px;">
          ${config.footerNote}
        </div>
      ` : ''}

      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #64748b; margin-top: 4px; padding-left: 4px;">
        ${config.schoolAddress} &bull; ${config.schoolContact}
      </div>
    </div>

    <!-- Bottom: Barcode NISN & Pengesahan Kepala Sekolah (No overlap) -->
    <div style="border-top: 1.5px dashed #cbd5e1; padding-top: 10px; position: relative; z-index: 1; display: flex; align-items: flex-end; justify-content: space-between;">
      <div style="font-family: Arial, Helvetica, sans-serif;">
        <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">NOMOR INDUK SISWA NASIONAL (NISN)</div>
        <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #0f172a; margin-top: 3px;">${student.nisn || student.id}</div>
        <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">Berlaku selama tercatat sebagai siswa aktif</div>
      </div>

      <div style="text-align: right; font-family: Arial, Helvetica, sans-serif; min-width: 210px;">
        <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">${config.issueDate}</div>
        <div style="font-size: 12.5px; font-weight: 600; color: #1e293b; line-height: 1.2;">Kepala Sekolah,</div>
        <div style="height: 30px; display: flex; align-items: center; justify-content: flex-end; font-style: italic; font-size: 10.5px; color: #94a3b8;">[ TTD &amp; Cap ]</div>
        <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; border-bottom: 1.5px solid #0f172a; display: inline-block; padding-bottom: 2px; line-height: 1.2;">
          ${config.headmasterName}
        </div>
        <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px; line-height: 1.2;">
          NIP. ${config.headmasterNip}
        </div>
      </div>
    </div>
  `;

  container.appendChild(frontEl);
  container.appendChild(backEl);
  document.body.appendChild(container);

  // Wait for all images inside container to be fully decoded
  await Promise.all(
    Array.from(container.querySelectorAll('img')).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 2000);
      });
    })
  );

  // Wait for document fonts to settle
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  // Animation frame tick for browser layout computation
  await new Promise((resolve) => requestAnimationFrame(resolve));

  return {
    frontEl,
    backEl,
    cleanup: () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };
}

/**
 * Download a Single Student ID Card as a real high-resolution PDF file.
 */
export async function downloadSingleStudentCardPDF(
  student: Student,
  className: string,
  headmasterName?: string,
  schoolName?: string,
  customSchoolLogo?: string,
  options?: {
    format?: 'card' | 'a4';
    onProgress?: (msg: string) => void;
  }
): Promise<void> {
  const format = options?.format || 'card';
  options?.onProgress?.('Menyiapkan tata letak & aset kartu...');

  const config = getFullCardAdminConfig({
    schoolName,
    headmasterName,
    schoolLogo: customSchoolLogo
  });

  const { frontEl, backEl, cleanup } = await createCardElements(
    student,
    className,
    config.headmasterName,
    config.schoolName,
    config.schoolLogo
  );

  try {
    options?.onProgress?.('Merender tampak depan kartu (High-Res 300+ DPI)...');
    const canvasOptions = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 856,
      windowHeight: 540,
    };

    const frontCanvas = await html2canvas(frontEl, canvasOptions);

    options?.onProgress?.('Merender tampak belakang kartu...');
    const backCanvas = await html2canvas(backEl, canvasOptions);

    const frontImg = frontCanvas.toDataURL('image/png');
    const backImg = backCanvas.toDataURL('image/png');

    const cleanName = (student.name || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
    const nisn = student.nisn || student.id;

    if (format === 'a4') {
      options?.onProgress?.('Menyusun lembar cetak dokumen A4...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header on A4 sheet
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(config.schoolName.toUpperCase(), 105, 18, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('LEMBAR CETAK RESMI KARTU TANDA PELAJAR', 105, 24, { align: 'center' });
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Nama Siswa: ${student.name} | NISN: ${student.nisn || '-'} | Kelas: ${className}`, 105, 29, { align: 'center' });
      
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(14, 33, 196, 33);

      // Card Front (Left side)
      pdf.setLineDashPattern([], 0);
      pdf.setFontSize(8.5);
      pdf.setTextColor(30, 30, 30);
      pdf.setFont('helvetica', 'bold');
      pdf.text('1. TAMPAK DEPAN (FRONT)', 14, 42);
      
      // Draw subtle crop guide border
      pdf.setDrawColor(215, 220, 225);
      pdf.rect(13.8, 44.8, 86, 54.4);
      pdf.addImage(frontImg, 'PNG', 14, 45, 85.6, 54, undefined, 'FAST');

      // Card Back (Right side)
      pdf.text('2. TAMPAK BELAKANG (BACK)', 110.4, 42);
      pdf.rect(110.2, 44.8, 86, 54.4);
      pdf.addImage(backImg, 'PNG', 110.4, 45, 85.6, 54, undefined, 'FAST');

      // Cut guideline instructions
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'italic');
      pdf.text('* Petunjuk: Gunting rapi mengikuti garis tepi kartu (85.6 x 54 mm - Standar ID Card ISO 7810), satukan tampak depan & belakang lalu laminasi.', 105, 110, { align: 'center' });

      options?.onProgress?.('Menyimpan berkas PDF...');
      pdf.save(`Kartu_Pelajar_A4_${cleanName}_${nisn}.pdf`);
    } else {
      options?.onProgress?.('Menyusun berkas PDF kartu standar CR80...');
      // Standard CR80 ISO/IEC 7810 Card Size (85.6mm x 54mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54]
      });

      // Page 1: Tampak Depan
      pdf.addImage(frontImg, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST');

      // Page 2: Tampak Belakang
      pdf.addPage([85.6, 54], 'landscape');
      pdf.addImage(backImg, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST');

      options?.onProgress?.('Menyimpan berkas PDF...');
      pdf.save(`Kartu_Pelajar_${cleanName}_${nisn}.pdf`);
    }
  } finally {
    cleanup();
  }
}

/**
 * Download Batch of Student Cards as a multi-page PDF document.
 * Arranged neatly in an A4 grid:
 * - 'both': 4 students per page (Front and Back placed side-by-side on each row with ample spacing)
 * - 'front': 8 front cards per page (2 columns x 4 rows)
 * - 'back': 8 back cards per page (2 columns x 4 rows)
 */
export async function downloadBatchStudentCardsPDF(
  studentList: Student[],
  classes: SchoolClass[],
  headmasterName?: string,
  schoolName?: string,
  options?: {
    side?: 'front' | 'both' | 'back';
    schoolLogo?: string;
    onProgress?: (current: number, total: number, msg: string) => void;
  }
): Promise<void> {
  const side = options?.side || 'front';
  const totalStudents = studentList.length;
  if (totalStudents === 0) return;

  const config = getFullCardAdminConfig({
    schoolName,
    headmasterName,
    schoolLogo: options?.schoolLogo
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // A4 geometry: 210mm x 297mm
  // Standard CR80 Card size: 85.6mm x 54mm
  // Symmetrical margins:
  // Col 1 (Front): X = 14mm -> ends at 99.6mm
  // Gap between cards: 10.8mm
  // Col 2 (Back): X = 110.4mm -> ends at 196mm
  // Right margin: 14mm (196 + 14 = 210mm)
  const col1X = 14;
  const col2X = 110.4;
  const startY = 18;
  const cardH = 54;
  const rowGap = 11; // 11mm row gap gives comfortable room for student labels without crowding

  if (side === 'both') {
    // 4 students per page (Front in Col 1, Back in Col 2 for each student)
    const studentsPerPage = 4;
    let pageCount = 0;

    for (let i = 0; i < totalStudents; i++) {
      const student = studentList[i];
      const cName = classes.find(c => c.id === student.classId)?.name || student.classId || '-';

      options?.onProgress?.(i + 1, totalStudents, `Memproses kartu ${i + 1} dari ${totalStudents} (${student.name})...`);

      const { frontEl, backEl, cleanup } = await createCardElements(
        student,
        cName,
        config.headmasterName,
        config.schoolName,
        config.schoolLogo
      );

      try {
        const batchCanvasOptions = {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 856,
          windowHeight: 540,
        };

        const frontCanvas = await html2canvas(frontEl, batchCanvasOptions);
        const backCanvas = await html2canvas(backEl, batchCanvasOptions);

        const frontImg = frontCanvas.toDataURL('image/png');
        const backImg = backCanvas.toDataURL('image/png');

        const indexOnPage = i % studentsPerPage;
        if (i > 0 && indexOnPage === 0) {
          pdf.addPage('a4', 'portrait');
          pageCount++;
        }

        const y = startY + indexOnPage * (cardH + rowGap);

        // Header label for student pair with clean margin
        pdf.setFontSize(7.5);
        pdf.setTextColor(80, 90, 105);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Siswa #${i + 1}: ${student.name.toUpperCase()} (NISN: ${student.nisn || '-'}) • Kelas: ${cName}`, col1X, y - 2.5);

        // Draw crop border guide for front
        pdf.setDrawColor(215, 220, 225);
        pdf.rect(col1X - 0.2, y - 0.2, 86, 54.4);
        pdf.addImage(frontImg, 'PNG', col1X, y, 85.6, 54, undefined, 'FAST');

        // Draw crop border guide for back
        pdf.rect(col2X - 0.2, y - 0.2, 86, 54.4);
        pdf.addImage(backImg, 'PNG', col2X, y, 85.6, 54, undefined, 'FAST');
      } finally {
        cleanup();
      }
    }
  } else {
    // Single-side batch (front only or back only): 8 cards per page (2 columns x 4 rows)
    const cardsPerPage = 8;
    let cardCount = 0;

    for (let i = 0; i < totalStudents; i++) {
      const student = studentList[i];
      const cName = classes.find(c => c.id === student.classId)?.name || student.classId || '-';

      options?.onProgress?.(i + 1, totalStudents, `Memproses kartu ${i + 1} dari ${totalStudents} (${student.name})...`);

      const { frontEl, backEl, cleanup } = await createCardElements(
        student,
        cName,
        config.headmasterName,
        config.schoolName,
        config.schoolLogo
      );

      try {
        const targetEl = side === 'front' ? frontEl : backEl;
        const canvas = await html2canvas(targetEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 856,
          windowHeight: 540,
        });
        const imgData = canvas.toDataURL('image/png');

        if (cardCount > 0 && cardCount % cardsPerPage === 0) {
          pdf.addPage('a4', 'portrait');
        }

        const indexOnPage = cardCount % cardsPerPage;
        const col = indexOnPage % 2;
        const row = Math.floor(indexOnPage / 2);
        const x = col === 0 ? col1X : col2X;
        const y = startY + row * (cardH + rowGap);

        // Student label
        pdf.setFontSize(7);
        pdf.setTextColor(80, 90, 105);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Siswa #${i + 1}: ${student.name.toUpperCase()} • ${cName}`, x, y - 2.5);

        // Subtle crop border guide
        pdf.setDrawColor(215, 220, 225);
        pdf.rect(x - 0.2, y - 0.2, 86, 54.4);
        pdf.addImage(imgData, 'PNG', x, y, 85.6, 54, undefined, 'FAST');

        cardCount++;
      } finally {
        cleanup();
      }
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`Kartu_Pelajar_Massal_${dateStr}.pdf`);
}
