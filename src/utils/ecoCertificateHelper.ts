/**
 * Certificate Helper for ECo-Tiket Duta Kebersihan SMPN 50 Jakarta
 */

import { Student } from '../types';
import { getEffectiveSchoolLogo } from './schoolLogoHelper';

export interface EcoAmbassadorCertData {
  studentName: string;
  studentNisn?: string;
  className: string;
  totalEcoPoints: number;
  totalDepositsCount: number;
  dateStr: string;
  headmasterName?: string;
  headmasterNip?: string;
  schoolName?: string;
  certNumber?: string;
  schoolLogo?: string;
  logoLeftUrl?: string;
}

export function printEcoAmbassadorCertificate(data: EcoAmbassadorCertData) {
  const schoolName = data.schoolName || localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';
  const headmasterName = data.headmasterName || 'Dra. Hj. Endah Purwani, M.M.';
  const headmasterNip = data.headmasterNip || '196711261991032004';
  const year = new Date().getFullYear();
  const certNumber = data.certNumber || `050/PIAGAM-ECO/${year}/${Math.floor(1000 + Math.random() * 9000)}`;

  const effectiveSchoolLogo = getEffectiveSchoolLogo();
  const logoLeft = data.logoLeftUrl || localStorage.getItem('siakad_logo_left') || localStorage.getItem('siakad_cert_logo_left') || '/logo-dki.png';
  const logoRight = (data.schoolLogo && data.schoolLogo !== '/logo.png') 
    ? data.schoolLogo 
    : (localStorage.getItem('siakad_logo_right') || effectiveSchoolLogo);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>PIAGAM DUTA KEBERSIHAN - ${data.studentName}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
          
          .cert-container {
            width: 297mm;
            height: 210mm;
            position: relative;
            background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 40%, #f7fee7 100%);
            padding: 12mm 14mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            border: 12px solid #059669;
          }

          .outer-border {
            position: absolute;
            inset: 6mm;
            border: 2px dashed #10b981;
            pointer-events: none;
            border-radius: 6px;
          }

          .inner-corner {
            position: absolute;
            width: 32px;
            height: 32px;
            border: 3px solid #047857;
          }
          .corner-tl { top: 9mm; left: 9mm; border-right: none; border-bottom: none; }
          .corner-tr { top: 9mm; right: 9mm; border-left: none; border-bottom: none; }
          .corner-bl { bottom: 9mm; left: 9mm; border-right: none; border-top: none; }
          .corner-br { bottom: 9mm; right: 9mm; border-left: none; border-top: none; }

          .header {
            position: relative;
            z-index: 10;
            margin-bottom: 2mm;
          }

          .header-logo-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }

          .cert-logo-img {
            width: 60px;
            height: 60px;
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08));
          }

          .header-text-block {
            text-align: center;
            flex: 1;
          }

          .school-badge {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #047857;
            background: #d1fae5;
            padding: 3px 14px;
            border-radius: 9999px;
            display: inline-block;
            border: 1px solid #a7f3d0;
          }

          .school-name-text {
            font-size: 11pt;
            font-weight: 900;
            letter-spacing: 2.5px;
            color: #064e3b;
            text-transform: uppercase;
            margin-top: 2px;
          }

          .title-main {
            font-size: 26pt;
            font-weight: 900;
            letter-spacing: 3px;
            color: #064e3b;
            margin: 6px 0 2px 0;
            text-transform: uppercase;
            text-shadow: 1px 1px 0px rgba(255,255,255,0.8);
          }

          .title-sub {
            font-size: 11pt;
            font-weight: 700;
            color: #059669;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin: 0;
          }

          .cert-num {
            font-size: 8.5pt;
            font-family: monospace;
            color: #64748b;
            margin-top: 3px;
          }

          .content {
            text-align: center;
            position: relative;
            z-index: 10;
            padding: 2px 20px;
          }

          .award-to {
            font-size: 10pt;
            font-style: italic;
            color: #475569;
            margin-bottom: 4px;
          }

          .student-name {
            font-size: 24pt;
            font-weight: 900;
            color: #0f172a;
            border-bottom: 2px solid #10b981;
            display: inline-block;
            padding: 0 24px 4px 24px;
            margin: 4px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .student-meta {
            font-size: 10.5pt;
            font-weight: 700;
            color: #047857;
            margin: 4px 0 10px 0;
          }

          .badge-honor {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: #ffffff;
            padding: 7px 22px;
            border-radius: 9999px;
            font-size: 12pt;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
            border: 2px solid #a7f3d0;
            margin-bottom: 8px;
          }

          .statement {
            font-size: 10pt;
            line-height: 1.5;
            color: #334155;
            max-width: 220mm;
            margin: 0 auto;
          }

          .stats-strip {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 8px;
          }

          .stat-pill {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            padding: 3px 14px;
            border-radius: 8px;
            font-size: 8.5pt;
            color: #334155;
            font-weight: 600;
          }
          .stat-pill strong {
            color: #059669;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            position: relative;
            z-index: 10;
            padding: 0 15mm 2mm 15mm;
          }

          .signature-box {
            text-align: center;
            width: 65mm;
          }

          .sig-title {
            font-size: 9pt;
            color: #475569;
            font-weight: 600;
            margin-bottom: 16mm;
          }

          .sig-name {
            font-size: 10pt;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 1px solid #334155;
            padding-bottom: 1px;
            margin-bottom: 2px;
          }

          .sig-nip {
            font-size: 8pt;
            color: #64748b;
          }

          .seal-box {
            text-align: center;
            width: 45mm;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .seal-emblem {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: radial-gradient(circle, #fef08a 0%, #eab308 100%);
            border: 2px solid #ca8a04;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 2px 8px rgba(202, 138, 4, 0.3);
            margin-bottom: 4px;
          }

          .seal-text {
            font-size: 7.5pt;
            font-weight: 800;
            color: #854d0e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 160pt;
            color: rgba(5, 150, 105, 0.035);
            pointer-events: none;
            z-index: 1;
            user-select: none;
          }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="outer-border"></div>
          <div class="inner-corner corner-tl"></div>
          <div class="inner-corner corner-tr"></div>
          <div class="inner-corner corner-bl"></div>
          <div class="inner-corner corner-br"></div>
          <div class="watermark">
            <img src="${logoRight}" style="width: 130mm; height: 130mm; object-fit: contain; opacity: 0.04; filter: grayscale(100%);" onerror="this.style.display='none'" />
          </div>

          <!-- HEADER WITH LOGOS -->
          <div class="header">
            <div class="header-logo-row">
              <img src="${logoLeft}" class="cert-logo-img" alt="Logo Pemprov" onerror="this.src='/logo-dki.png'; this.onerror=null;" />
              <div class="header-text-block">
                <div class="school-badge">Gerakan Siswa Peduli Lingkungan &amp; Bank Sampah Sekolah</div>
                <div class="school-name-text">${schoolName}</div>
                <h1 class="title-main">Piagam Penghargaan</h1>
                <p class="title-sub">Duta Kebersihan &amp; Lingkungan Hidup</p>
                <div class="cert-num">Nomor: ${certNumber}</div>
              </div>
              <img src="${logoRight}" class="cert-logo-img" alt="Logo Sekolah" onerror="this.src='${effectiveSchoolLogo}'; this.onerror=null;" />
            </div>
          </div>

          <!-- BODY / RECIPIENT -->
          <div class="content">
            <div class="award-to">Diberikan dengan penuh kehormatan dan apresiasi tinggi kepada:</div>
            <div class="student-name">${data.studentName}</div>
            <div class="student-meta">
              ${data.studentNisn ? `NISN: ${data.studentNisn} &bull; ` : ''}Kelas: ${data.className} &bull; ${schoolName}
            </div>

            <div class="badge-honor">
              <span>🌿 DUTA KEBERSIHAN UTAMA 🌿</span>
            </div>

            <p class="statement">
              Atas dedikasi, integritas, kepeloporan, dan kontribusi nyata yang luar biasa dalam
              memilah dan menyetorkan sampah melalui program <strong>ECo-Tiket</strong>,
              serta menjadi teladan bagi seluruh warga sekolah dalam mewujudkan ekosistem sekolah Adiwiyata yang asri, hijau, bersih, dan berkelanjutan.
            </p>

            <div class="stats-strip">
              <div class="stat-pill">Total Akumulasi: <strong>${data.totalEcoPoints} Poin ECo-Tiket</strong></div>
              <div class="stat-pill">Frekuensi Setor: <strong>${data.totalDepositsCount} Kali</strong></div>
              <div class="stat-pill">Predikat: <strong>Pahlawan Lingkungan Sekolah</strong></div>
            </div>
          </div>

          <!-- FOOTER / SIGNATURES -->
          <div class="footer">
            <!-- Left: Pembina Adiwiyata -->
            <div class="signature-box">
              <div class="sig-title">
                Mengetahui,<br />Pembina Adiwiyata &amp; Kesiswaan
              </div>
              <div class="sig-name">Tim Adiwiyata SMPN 50</div>
              <div class="sig-nip">Koordinator Bidang Lingkungan</div>
            </div>

            <!-- Center Seal -->
            <div class="seal-box">
              <div class="seal-emblem">🌱</div>
              <div class="seal-text">Duta Kebersihan</div>
              <div class="seal-text" style="color: #64748b; font-size: 6.5pt; font-family: monospace;">TERVERIFIKASI RESMI</div>
            </div>

            <!-- Right: Kepala Sekolah -->
            <div class="signature-box">
              <div class="sig-title">
                Jakarta, ${data.dateStr}<br />Kepala ${schoolName}
              </div>
              <div class="sig-name">${headmasterName}</div>
              <div class="sig-nip">NIP. ${headmasterNip}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    // Fallback if popup blocked: use hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
  }
}
