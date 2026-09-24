import QRCode from 'qrcode';
import { Student, SchoolClass } from '../types';
import { printHTML } from './printHelper';
import { getEffectiveSchoolLogo, DEFAULT_SCHOOL_LOGO } from './schoolLogoHelper';
import { getCardDesignConfig, getPresetById } from './cardDesignHelper';

/**
 * Generate high-resolution Data URL for a given NISN QR code.
 */
export async function generateNISNQRCode(nisn: string, width = 360): Promise<string> {
  try {
    const cleanNisn = (nisn || '').trim();
    return await QRCode.toDataURL(cleanNisn, {
      width,
      margin: 2, // 2 modules quiet zone for maximum camera scanner sensitivity
      color: {
        dark: '#000000', // Pure pitch black for maximum optical contrast
        light: '#ffffff'
      },
      errorCorrectionLevel: 'Q' // High fault tolerance so camera decodes instantly even with glare or distance
    });
  } catch (err) {
    console.error('Failed to generate QR code for NISN:', nisn, err);
    return '';
  }
}

/**
 * Play synthesized audio beep using Web Audio API
 */
export function playScannerBeep(type: 'success' | 'error' | 'warning' = 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Pleasant double chime: 880Hz then 1320Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.28);
    } else if (type === 'warning') {
      // Gentle warning double blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      // Error buzz: low saw/square wave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Audio context may be restricted by browser policy before first interaction
    console.debug('Audio beep playback suppressed:', e);
  }
}

/**
 * Print a single student ID Card (front & back layout)
 */
export async function printSingleStudentCard(
  student: Student,
  className: string,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  schoolName = 'SMP NEGERI 50 JAKARTA',
  customSchoolLogo?: string
) {
  const qrDataUrl = await generateNISNQRCode(student.nisn || student.id);
  // School Logo on the LEFT side as explicitly requested - Gunakan Logo Resmi Sekolah
  const schoolLogo = customSchoolLogo && customSchoolLogo.trim() !== '' && !customSchoolLogo.includes('/logo.png')
    ? customSchoolLogo
    : getEffectiveSchoolLogo();
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4f46e5&color=fff&size=200&bold=true`;
  const avatarUrl = student.avatarUrl || defaultAvatar;

  const cardConfig = getCardDesignConfig();
  const preset = getPresetById(cardConfig.presetId);

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Kartu Pelajar - ${student.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f1f5f9;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .card-container {
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
            justify-content: center;
          }
          .id-card {
            width: 85.6mm;
            height: 54mm;
            background: #ffffff;
            border-radius: 4.5mm;
            overflow: hidden;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
            border: 1.2px solid ${preset.borderCss};
            position: relative;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
          }
          @media print {
            body {
              background: transparent;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            .id-card {
              box-shadow: none;
              border: 1px solid ${preset.borderCss};
            }
          }
          /* Front Card Styling */
          .card-header {
            background: ${preset.headerCss};
            color: #ffffff;
            padding: 2.8mm 4mm;
            display: flex;
            align-items: center;
            gap: 2.5mm;
            border-bottom: 1.5px solid ${preset.borderCss};
          }
          .header-logo-container {
            width: 8.5mm;
            height: 8.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          .header-logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            filter: none !important;
          }
          .header-text {
            flex: 1;
            line-height: 1.1;
          }
          .header-school {
            font-size: 2.5mm;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: #ffffff;
          }
          .header-title {
            font-size: 2mm;
            font-weight: 700;
            color: #fef08a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .header-sub {
            font-size: 1.5mm;
            color: #cbd5e1;
          }
          .header-badge {
            font-size: 1.6mm;
            font-weight: 800;
            padding: 0.5mm 1.5mm;
            background: rgba(0, 0, 0, 0.25);
            color: #ffffff;
            border: 0.5px solid ${preset.borderCss};
            border-radius: 1mm;
            flex-shrink: 0;
            letter-spacing: 0.3px;
          }
          .card-body {
            flex: 1;
            display: flex;
            padding: 3mm 4mm;
            gap: 3mm;
            background: ${cardConfig.bgType === 'custom_image' && cardConfig.customBgImage ? `url(${cardConfig.customBgImage}) center/cover no-repeat` : preset.bodyCss};
            position: relative;
          }
          .student-photo-wrapper {
            width: 19mm;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .student-photo {
            width: 19mm;
            height: 24mm;
            object-fit: cover;
            border-radius: 2mm;
            border: 1.5px solid #1e1b4b;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            background: #e2e8f0;
          }
          .badge-kjp {
            margin-top: 1mm;
            background: #059669;
            color: #ffffff;
            font-size: 1.4mm;
            font-weight: 800;
            padding: 0.5mm 1.5mm;
            border-radius: 1mm;
            text-align: center;
            width: 100%;
          }
          .student-info {
            flex: 1;
            font-size: 2mm;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            line-height: 1.25;
          }
          .info-table td {
            padding: 0.3mm 0;
            vertical-align: top;
          }
          .info-table .lbl {
            width: 14mm;
            color: #64748b;
            font-weight: 600;
            font-size: 1.9mm;
          }
          .info-table .sep {
            width: 2mm;
            color: #64748b;
          }
          .info-table .val {
            font-weight: 800;
            color: #0f172a;
            font-size: 2.1mm;
          }
          .val-name {
            font-size: 2.4mm;
            color: #1e1b4b;
            text-transform: uppercase;
          }
          .card-bottom-row {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-top: 1mm;
            border-top: 0.5px dashed #cbd5e1;
            padding-top: 1mm;
          }
          .qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-img {
            width: 16.5mm;
            height: 16.5mm;
            border: 1.5px solid #64748b;
            border-radius: 1.5mm;
            background: #ffffff;
            padding: 0.5mm;
            box-shadow: 0 1mm 2mm rgba(0,0,0,0.08);
          }
          .qr-lbl {
            font-size: 1.3mm;
            font-weight: 800;
            color: #ffffff;
            background: #0f172a;
            padding: 0.3mm 1.6mm;
            border-radius: 2mm;
            margin-top: 0.5mm;
            letter-spacing: 0.2px;
          }
          .signature-box {
            text-align: right;
            font-size: 1.6mm;
            line-height: 1.1;
            color: #334155;
          }
          .sig-title {
            font-weight: 600;
          }
          .sig-space {
            height: 4mm;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            font-style: italic;
            font-size: 1.5mm;
            color: #94a3b8;
          }
          .sig-name {
            font-weight: 800;
            text-decoration: underline;
            color: #0f172a;
          }

          /* Back Card Styling */
          .back-card {
            padding: 3.5mm 4mm;
            background: #faf5ff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .back-header {
            text-align: center;
            border-bottom: 1px solid #d8b4fe;
            padding-bottom: 1.5mm;
          }
          .back-title {
            font-size: 2.2mm;
            font-weight: 800;
            color: #581c87;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .back-rules {
            font-size: 1.8mm;
            color: #334155;
            line-height: 1.35;
            padding-left: 3.5mm;
            margin: 1.5mm 0;
          }
          .back-rules li {
            margin-bottom: 0.8mm;
          }
          .barcode-box {
            text-align: center;
            border-top: 1px dashed #cbd5e1;
            padding-top: 1mm;
            margin-top: 1mm;
          }
          .barcode-nisn {
            font-family: monospace;
            font-size: 2.5mm;
            font-weight: 900;
            letter-spacing: 1.5px;
            color: #0f172a;
          }
          .barcode-desc {
            font-size: 1.5mm;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <!-- TAMPAK DEPAN: LOGO RESMI SEKOLAH DI SEBELAH KIRI -->
          <div class="id-card">
            <div class="card-header">
              <div class="header-logo-container">
                <img src="${schoolLogo}" alt="Logo Sekolah" class="header-logo" onerror="this.src='/logo.png'" />
              </div>
              <div class="header-text">
                <div class="header-school">${schoolName}</div>
                <div class="header-title">Kartu Tanda Pelajar</div>
                <div class="header-sub">Sistem Absensi & Administrasi Siswa</div>
              </div>
            </div>

            <div class="card-body">
              ${cardConfig.showWatermark ? `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28mm; height: 28mm; display: flex; align-items: center; justify-content: center; opacity: ${cardConfig.watermarkOpacity}; pointer-events: none; z-index: 0;">
                  <img src="${schoolLogo}" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(100%);" />
                </div>
              ` : ''}

              <div class="student-photo-wrapper" style="position: relative; z-index: 1;">
                <img src="${avatarUrl}" alt="${student.name}" class="student-photo" onerror="this.src='${defaultAvatar}'" />
                ${student.isKjpRecipient ? '<div class="badge-kjp">KJP PLUS</div>' : ''}
              </div>

              <div class="student-info" style="position: relative; z-index: 1;">
                <table class="info-table">
                  <tr>
                    <td class="lbl">Nama</td>
                    <td class="sep">:</td>
                    <td class="val val-name">${student.name}</td>
                  </tr>
                  <tr>
                    <td class="lbl">NISN</td>
                    <td class="sep">:</td>
                    <td class="val" style="font-family: monospace; letter-spacing: 0.5px;">${student.nisn || '-'}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Kelas</td>
                    <td class="sep">:</td>
                    <td class="val">${className}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Gender</td>
                    <td class="sep">:</td>
                    <td class="val">${student.gender || '-'}</td>
                  </tr>
                </table>

                <div class="card-bottom-row">
                  <div class="qr-box">
                    <img src="${qrDataUrl}" alt="QR NISN" class="qr-img" />
                    <div class="qr-lbl">QR ABSENSI</div>
                  </div>

                  <div class="signature-box">
                    <div class="sig-title">Kepala Sekolah,</div>
                    <div class="sig-space">[ TTD &amp; Cap ]</div>
                    <div class="sig-name">${headmasterName}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAMPAK BELAKANG -->
          <div class="id-card back-card" style="position: relative; border: 1.2px solid ${preset.borderCss};">
            ${cardConfig.showWatermark ? `
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28mm; height: 28mm; display: flex; align-items: center; justify-content: center; opacity: ${cardConfig.watermarkOpacity * 0.7}; pointer-events: none; z-index: 0;">
                <img src="${schoolLogo}" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(100%);" />
              </div>
            ` : ''}

            <div class="back-header" style="position: relative; z-index: 1;">
              <div class="back-title" style="color: ${preset.accentColor};">${cardConfig.backTitle}</div>
            </div>

            <div style="position: relative; z-index: 1; flex: 1;">
              <ol class="back-rules">
                ${cardConfig.rules.map(r => `<li>${r}</li>`).join('')}
              </ol>
              ${cardConfig.footerNote ? `<div style="font-size: 1.5mm; color: #64748b; font-style: italic; margin-top: 0.8mm; padding-left: 3.5mm;">${cardConfig.footerNote}</div>` : ''}
            </div>

            <div class="barcode-box" style="position: relative; z-index: 1;">
              <div class="barcode-desc">KODE INDUK SISWA RESMI (NISN)</div>
              <div class="barcode-nisn">${student.nisn || student.id}</div>
              <div class="barcode-desc" style="font-size: 1.3mm; margin-top: 0.3mm;">Berlaku selama menjadi siswa aktif</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printHTML(html);
}

/**
 * Print batch of student cards in A4 layout (arranged in a clean grid)
 * Supports filtering, front-only, back-only, or both sides
 */
export async function printBatchStudentCards(
  studentList: Student[],
  classes: SchoolClass[],
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  title = 'Cetak Massal Kartu Pelajar Siswa',
  options?: {
    side?: 'front' | 'both' | 'back';
    schoolLogo?: string;
  }
) {
  const side = options?.side || 'front';
  // Logo Resmi Sekolah: Gunakan Logo Pengaturan Kartu Pelajar / KOP Surat
  const schoolLogo = options?.schoolLogo && options.schoolLogo.trim() !== '' && !options.schoolLogo.includes('/logo.png')
    ? options.schoolLogo
    : getEffectiveSchoolLogo();
  const schoolName = localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';

  const cardConfig = getCardDesignConfig();
  const preset = getPresetById(cardConfig.presetId);

  // Generate QR codes for all students in parallel
  const cardsData = await Promise.all(
    studentList.map(async (student) => {
      const qrDataUrl = await generateNISNQRCode(student.nisn || student.id, 240);
      const cName = classes.find(c => c.id === student.classId)?.name || student.classId || '-';
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4f46e5&color=fff&size=160&bold=true`;
      return {
        student,
        className: cName,
        qrDataUrl,
        avatarUrl: student.avatarUrl || defaultAvatar,
        defaultAvatar
      };
    })
  );

  const renderFrontCard = ({ student, className, qrDataUrl, avatarUrl, defaultAvatar }: typeof cardsData[0]) => `
    <div class="id-card">
      <div class="card-header">
        <div class="header-logo-container">
          <img src="${schoolLogo}" alt="Logo Sekolah" class="header-logo" onerror="this.src='/logo.png'" />
        </div>
        <div class="header-text">
          <div class="header-school">${schoolName}</div>
          <div class="header-title">Kartu Tanda Pelajar</div>
        </div>
      </div>

      <div class="card-body">
        ${cardConfig.showWatermark ? `
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 26mm; height: 26mm; display: flex; align-items: center; justify-content: center; opacity: ${cardConfig.watermarkOpacity}; pointer-events: none; z-index: 0;">
            <img src="${schoolLogo}" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(100%);" />
          </div>
        ` : ''}

        <div class="student-photo-wrapper" style="position: relative; z-index: 1;">
          <img src="${avatarUrl}" alt="${student.name}" class="student-photo" onerror="this.src='${defaultAvatar}'" />
          ${student.isKjpRecipient ? '<div class="badge-kjp">KJP PLUS</div>' : ''}
        </div>

        <div class="student-info" style="position: relative; z-index: 1;">
          <table class="info-table">
            <tr>
              <td class="lbl">Nama</td>
              <td class="sep">:</td>
              <td class="val val-name">${student.name}</td>
            </tr>
            <tr>
              <td class="lbl">NISN</td>
              <td class="sep">:</td>
              <td class="val font-mono">${student.nisn || '-'}</td>
            </tr>
            <tr>
              <td class="lbl">Kelas</td>
              <td class="sep">:</td>
              <td class="val">${className}</td>
            </tr>
            <tr>
              <td class="lbl">Gender</td>
              <td class="sep">:</td>
              <td class="val">${student.gender || '-'}</td>
            </tr>
          </table>

          <div class="card-bottom-row">
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="QR" class="qr-img" />
              <div class="qr-lbl">QR ABSEN</div>
            </div>

            <div class="signature-box">
              <div class="sig-title">Kepala Sekolah,</div>
              <div class="sig-space">[TTD/Cap]</div>
              <div class="sig-name">${headmasterName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const renderBackCard = ({ student }: typeof cardsData[0]) => `
    <div class="id-card back-card" style="position: relative; border: 1px solid ${preset.borderCss};">
      ${cardConfig.showWatermark ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 26mm; height: 26mm; display: flex; align-items: center; justify-content: center; opacity: ${cardConfig.watermarkOpacity * 0.7}; pointer-events: none; z-index: 0;">
          <img src="${schoolLogo}" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(100%);" />
        </div>
      ` : ''}

      <div class="back-header" style="position: relative; z-index: 1;">
        <div class="back-title" style="color: ${preset.accentColor};">${cardConfig.backTitle}</div>
      </div>

      <div style="position: relative; z-index: 1; flex: 1;">
        <ol class="back-rules">
          ${cardConfig.rules.map(r => `<li>${r}</li>`).join('')}
        </ol>
        ${cardConfig.footerNote ? `<div style="font-size: 1.3mm; color: #64748b; font-style: italic; margin-top: 0.6mm; padding-left: 3mm;">${cardConfig.footerNote}</div>` : ''}
      </div>

      <div class="barcode-box" style="position: relative; z-index: 1;">
        <div class="barcode-desc">KODE INDUK SISWA RESMI (NISN)</div>
        <div class="barcode-nisn">${student.nisn || student.id}</div>
        <div class="barcode-desc" style="font-size: 1.3mm; margin-top: 0.2mm;">Berlaku selama menjadi siswa aktif</div>
      </div>
    </div>
  `;

  let cardsHtml = '';
  if (side === 'front') {
    cardsHtml = cardsData.map(renderFrontCard).join('');
  } else if (side === 'back') {
    cardsHtml = cardsData.map(renderBackCard).join('');
  } else {
    // Both: print front and back for each student consecutively
    cardsHtml = cardsData.map(item => `${renderFrontCard(item)}${renderBackCard(item)}`).join('');
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${title} (${studentList.length} Siswa)</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 8px;
            background: #f8fafc;
          }
          .sheet-grid {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            gap: 5mm 6mm;
            justify-content: center;
          }
          @media print {
            body {
              background: transparent;
              padding: 0;
            }
            .sheet-grid {
              gap: 4mm 4mm;
            }
            .no-print {
              display: none !important;
            }
          }
          .id-card {
            width: 85.6mm;
            height: 54mm;
            background: #ffffff;
            border-radius: 3.5mm;
            overflow: hidden;
            border: 1px solid ${preset.borderCss};
            position: relative;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          }
          .card-header {
            background: ${preset.headerCss};
            color: #ffffff;
            padding: 2.2mm 3.5mm;
            display: flex;
            align-items: center;
            gap: 2mm;
            border-bottom: 1.2px solid ${preset.borderCss};
          }
          .header-logo-container {
            width: 7.5mm;
            height: 7.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          .header-logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            filter: none !important;
          }
          .header-text {
            flex: 1;
            line-height: 1.1;
          }
          .header-school {
            font-size: 2.2mm;
            font-weight: 900;
            text-transform: uppercase;
            color: #ffffff;
          }
          .header-title {
            font-size: 1.8mm;
            font-weight: 700;
            color: #fef08a;
            text-transform: uppercase;
          }
          .header-badge {
            font-size: 1.5mm;
            font-weight: 800;
            padding: 0.4mm 1.2mm;
            background: rgba(0, 0, 0, 0.25);
            color: #ffffff;
            border: 0.5px solid ${preset.borderCss};
            border-radius: 0.8mm;
            flex-shrink: 0;
            letter-spacing: 0.3px;
          }
          .card-body {
            flex: 1;
            display: flex;
            padding: 2.5mm 3.5mm;
            gap: 2.5mm;
            background: ${cardConfig.bgType === 'custom_image' && cardConfig.customBgImage ? `url(${cardConfig.customBgImage}) center/cover no-repeat` : preset.bodyCss};
            position: relative;
          }
          .student-photo-wrapper {
            width: 17mm;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .student-photo {
            width: 17mm;
            height: 22mm;
            object-fit: cover;
            border-radius: 1.5mm;
            border: 1.2px solid #1e1b4b;
            background: #e2e8f0;
          }
          .badge-kjp {
            margin-top: 0.8mm;
            background: #059669;
            color: #ffffff;
            font-size: 1.3mm;
            font-weight: 800;
            padding: 0.3mm 1mm;
            border-radius: 0.8mm;
            text-align: center;
            width: 100%;
          }
          .student-info {
            flex: 1;
            font-size: 1.9mm;
            color: #1e293b;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            line-height: 1.2;
          }
          .info-table td {
            padding: 0.3mm 0;
            vertical-align: top;
          }
          .info-table .lbl {
            width: 13mm;
            color: #64748b;
            font-weight: 600;
            font-size: 1.8mm;
          }
          .info-table .sep {
            width: 1.8mm;
            color: #64748b;
          }
          .info-table .val {
            font-weight: 800;
            color: #0f172a;
            font-size: 2mm;
          }
          .val-name {
            font-size: 2.2mm;
            color: #1e1b4b;
            text-transform: uppercase;
          }
          .font-mono {
            font-family: monospace;
          }
          .card-bottom-row {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-top: 0.8mm;
            border-top: 0.5px dashed #cbd5e1;
            padding-top: 0.8mm;
          }
          .qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-img {
            width: 12.5mm;
            height: 12.5mm;
            border: 0.8px solid #94a3b8;
            border-radius: 0.8mm;
            background: #ffffff;
            padding: 0.3mm;
          }
          .qr-lbl {
            font-size: 1.3mm;
            font-weight: 800;
            color: #475569;
            margin-top: 0.4mm;
          }
          .signature-box {
            text-align: right;
            font-size: 1.5mm;
            line-height: 1.1;
            color: #334155;
          }
          .sig-title {
            font-weight: 600;
          }
          .sig-space {
            height: 4.5mm;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            font-style: italic;
            font-size: 1.3mm;
            color: #94a3b8;
          }
          .sig-name {
            font-weight: 800;
            text-decoration: underline;
            color: #0f172a;
          }

          /* Back Card in Batch */
          .back-card {
            padding: 3mm 3.5mm;
            background: #faf5ff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .back-header {
            text-align: center;
            border-bottom: 0.8px solid #d8b4fe;
            padding-bottom: 1.2mm;
          }
          .back-title {
            font-size: 2mm;
            font-weight: 800;
            color: #581c87;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .back-rules {
            font-size: 1.6mm;
            color: #334155;
            line-height: 1.3;
            padding-left: 3mm;
            margin: 1mm 0;
          }
          .back-rules li {
            margin-bottom: 0.6mm;
          }
          .barcode-box {
            text-align: center;
            border-top: 0.8px dashed #cbd5e1;
            padding-top: 0.8mm;
            margin-top: 0.8mm;
          }
          .barcode-nisn {
            font-family: monospace;
            font-size: 2.2mm;
            font-weight: 900;
            letter-spacing: 1.2px;
            color: #0f172a;
          }
          .barcode-desc {
            font-size: 1.4mm;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="sheet-grid">
          ${cardsHtml}
        </div>
      </body>
    </html>
  `;

  printHTML(html);
}
