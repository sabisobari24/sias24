import { CertificateConfig, InventoryLoan } from '../types';

/**
 * Utility to print styled HTML safely in an iframe environment without being blocked by pop-up blockers.
 */
export const printHTML = (htmlContent: string) => {
  // Check if an overlay already exists and remove it
  const existingOverlay = document.getElementById('siakad-print-fallback-overlay');
  if (existingOverlay && document.body.contains(existingOverlay)) {
    document.body.removeChild(existingOverlay);
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'siakad-print-fallback-overlay';
  overlay.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-2 sm:p-6';

  // Create modal card
  const modal = document.createElement('div');
  modal.className = 'bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-200 transition-all scale-100';

  // Create header
  const header = document.createElement('div');
  header.className = 'px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0';

  // Title section
  const titleSection = document.createElement('div');
  titleSection.className = 'flex items-center gap-2.5';
  titleSection.innerHTML = `
    <div class="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 10-4 0v4h4z" />
      </svg>
    </div>
    <div>
      <h3 class="text-sm font-bold text-slate-800">Pratinjau Dokumen Resmi</h3>
      <p class="text-[10px] text-slate-400">Siap Cetak & Ekspor ke PDF</p>
    </div>
  `;

  // Action buttons container
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'flex flex-wrap items-center gap-2';

  // Cetak button
  const printBtn = document.createElement('button');
  printBtn.className = 'px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer';
  printBtn.innerHTML = `
    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2" />
    </svg>
    <span>Cetak Langsung</span>
  `;

  // Unduh HTML button
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer';
  downloadBtn.innerHTML = `
    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    <span>Unduh Berkas Cetak</span>
  `;

  // Tutup button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer';
  closeBtn.innerText = 'Tutup';

  actionsContainer.appendChild(printBtn);
  actionsContainer.appendChild(downloadBtn);
  actionsContainer.appendChild(closeBtn);

  header.appendChild(titleSection);
  header.appendChild(actionsContainer);

  // Tip Info banner
  const tipBanner = document.createElement('div');
  tipBanner.className = 'px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 flex items-start gap-2 shrink-0';
  tipBanner.innerHTML = `
    <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>
      <strong>Tip Penting:</strong> Jika dialog cetak diblokir oleh sistem sandbox, silakan klik tombol hijau <strong>"Unduh Berkas Cetak"</strong>, kemudian buka file yang terunduh tersebut di browser Anda untuk langsung mencetak atau menyimpan sebagai PDF berkualitas tinggi secara mandiri.
    </span>
  `;

  // Preview content body
  const previewBody = document.createElement('div');
  previewBody.className = 'flex-1 bg-slate-100 p-2 sm:p-4 overflow-auto flex justify-center';

  const previewIframe = document.createElement('iframe');
  previewIframe.className = 'bg-white shadow-lg w-full max-w-3xl h-full border border-slate-200 rounded-xl';
  previewBody.appendChild(previewIframe);

  modal.appendChild(header);
  modal.appendChild(tipBanner);
  modal.appendChild(previewBody);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Write content to preview iframe
  const doc = previewIframe.contentWindow?.document || previewIframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }

  // Trigger browser print function safely on the iframe
  const triggerPrint = () => {
    try {
      previewIframe.contentWindow?.focus();
      previewIframe.contentWindow?.print();
    } catch (err) {
      console.error('Failed to print from iframe:', err);
    }
  };

  // Button actions
  printBtn.onclick = () => {
    // Try to focus and print on iframe
    triggerPrint();
  };

  downloadBtn.onclick = () => {
    try {
      // Package HTML content and download it
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Extract title as filename or default
      let fileName = 'laporan_resmi_smpn50.html';
      const titleMatch = htmlContent.match(/<title>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        fileName = `${titleMatch[1].trim().replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download HTML file:', err);
      alert('Gagal mengunduh berkas. Coba klik kanan halaman untuk mencetak.');
    }
  };

  closeBtn.onclick = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  // Auto trigger direct print after content finishes loading inside preview
  const images = Array.from(doc?.querySelectorAll('img') || []);
  let loadedCount = 0;
  const totalImages = images.length;

  const onAllImagesLoaded = () => {
    setTimeout(triggerPrint, 500);
  };

  if (totalImages === 0) {
    onAllImagesLoaded();
  } else {
    let completed = false;
    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === totalImages && !completed) {
        completed = true;
        onAllImagesLoaded();
      }
    };

    // Timeout fallback
    setTimeout(() => {
      if (!completed) {
        completed = true;
        triggerPrint();
      }
    }, 4000);

    images.forEach(img => {
      if ((img as HTMLImageElement).complete) {
        onImageLoad();
      } else {
        img.addEventListener('load', onImageLoad);
        img.addEventListener('error', onImageLoad);
      }
    });
  }
};

/**
 * Generates an official-looking school administration PDF report with headers,
 * structured tables, and a formal signature block.
 */
export const printTablePDF = (
  title: string,
  headers: string[],
  rows: any[][],
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.'
) => {
  const tableHeadersHtml = headers.map(h => `<th style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f1f5f9; text-align: left; font-size: 11px; font-weight: bold; color: #1e293b;">${h}</th>`).join('');
  
  const tableRowsHtml = rows.map(r => {
    const cells = r.map(cell => `<td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 10px; color: #334155; max-width: 250px; word-wrap: break-word;">${cell !== null && cell !== undefined ? String(cell) : '-'}</td>`).join('');
    return `<tr style="page-break-inside: avoid;">${cells}</tr>`;
  }).join('');

  const today = new Date();
  const formatToday = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Get active user and role to replace Komite Sekolah with the actual downloader
  let downloaderRole = 'Petugas Administrasi';
  let downloaderName = '........................................';
  let downloaderNip = '..................................';

  try {
    const savedRole = localStorage.getItem('siakad_active_role');
    const savedUserStr = localStorage.getItem('siakad_active_user');
    if (savedRole && savedUserStr) {
      const savedUser = JSON.parse(savedUserStr);
      downloaderName = savedUser.name || savedUser.username || 'Petugas Sekolah';
      const rawNip = savedUser.nip || savedUser.id || '';
      downloaderNip = rawNip ? `NIP. ${rawNip}` : 'NIP. ..................................';
      
      switch (savedRole) {
        case 'admin':
          downloaderRole = 'Administrator SIAS';
          break;
        case 'piket':
          downloaderRole = 'Guru Piket';
          break;
        case 'guru':
          downloaderRole = 'Guru Mata Pelajaran';
          break;
        case 'wali':
          downloaderRole = 'Guru Wali Kelas';
          break;
        case 'bk':
          downloaderRole = 'Guru Bimbingan Konseling';
          break;
        case 'pelatih':
          downloaderRole = 'Pelatih Ekstrakurikuler';
          break;
        case 'siswa':
          downloaderRole = 'Siswa';
          break;
        case 'orang_tua':
          downloaderRole = 'Orang Tua / Wali Siswa';
          break;
        default:
          downloaderRole = 'Petugas Sekolah';
      }
    }
  } catch (e) {
    console.error('Error reading active user/role for signature:', e);
  }

  // Load custom logos and Kop Surat text from Admin Settings (with default fallbacks)
  const logoLeftSaved = localStorage.getItem('siakad_logo_left') || '';
  const logoRightSaved = localStorage.getItem('siakad_logo_right') || '';
  const srcLogoLeft = logoLeftSaved || `${window.location.origin}/logo-dki.png`;
  const srcLogoRight = logoRightSaved || `${window.location.origin}/logo.png`;

  const govTitle = localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA';
  const deptTitle = localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN PROVINSI DKI JAKARTA';
  const sudinTitle = localStorage.getItem('siakad_kop_sudin_title') || 'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR';
  const schoolTitle = localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';
  const addressText = localStorage.getItem('siakad_kop_address_text') || 'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510';
  const contactText = localStorage.getItem('siakad_kop_contact_text') || 'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com, smpn50.jt2@gmail.com';
  const headmasterNip = localStorage.getItem('siakad_headmaster_nip') || '196711261991032004';
  const docNumber = localStorage.getItem('siakad_kop_doc_number') || '';

  const htmlContent = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          @media print {
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
            .document-wrapper { max-width: 100%; width: 100%; margin: 0; padding: 0; }
          }
          body { font-family: Arial, sans-serif; color: #111; line-height: 1.4; padding: 15px; margin: 0; }
          
          /* Kop Surat styled precisely after the official school letterhead */
          .kop-surat { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            border-bottom: 4px double #000; 
            padding-bottom: 8px; 
            margin-bottom: 18px; 
          }
          .kop-logo-left { 
            height: 75px; 
            width: auto; 
            max-width: 75px;
            object-fit: contain; 
            margin-right: 15px;
          }
          .kop-logo-right { 
            height: 75px; 
            width: auto; 
            max-width: 75px;
            object-fit: contain; 
            margin-left: 15px;
          }
          .kop-logo-fallback { 
            display: none; 
            align-items: center; 
            justify-content: center; 
            height: 75px; 
            width: 75px; 
            background: #fafafa; 
            border: 1.5px solid #000; 
            border-radius: 50%; 
            box-sizing: border-box; 
          }
          .kop-details { 
            text-align: center; 
            flex: 1; 
          }
          .kop-details .gov-title { 
            margin: 0; 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            color: #000; 
          }
          .kop-details .dept-title { 
            margin: 1px 0; 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            color: #000; 
          }
          .kop-details .sudin-title { 
            margin: 1px 0; 
            font-size: 10px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.3px; 
            color: #000; 
          }
          .kop-details .school-title { 
            margin: 3px 0; 
            font-size: 20px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            color: #000; 
            font-family: 'Times New Roman', Times, serif;
          }
          .kop-details .address-text { 
            margin: 0; 
            font-size: 9px; 
            color: #000; 
            font-weight: normal;
          }
          .kop-details .contact-text { 
            margin: 1px 0; 
            font-size: 9px; 
            color: #000; 
            font-weight: 500;
          }
          
          .report-title { text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; text-decoration: underline; color: #000; margin-top: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          table tr:nth-child(even) { background-color: #f8fafc; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; page-break-inside: avoid; }
          .signature-box { text-align: center; width: 220px; }
          .document-wrapper { max-width: 800px; margin: 0 auto; background: #fff; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="document-wrapper">
        <div class="kop-surat">
          <!-- Logo Kiri -->
          <img class="kop-logo-left" src="${srcLogoLeft}" alt="Logo Kiri" onerror="this.style.display='none'; document.getElementById('logo-fallback-left').style.display='inline-flex';" />
          <div id="logo-fallback-left" class="kop-logo-fallback" style="margin-right: 15px;">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v8"/>
              <path d="M8 11h8"/>
            </svg>
          </div>
          
          <div class="kop-details">
            <h2 class="gov-title">${govTitle}</h2>
            <h2 class="dept-title">${deptTitle}</h2>
            <h3 class="sudin-title">${sudinTitle}</h3>
            <h1 class="school-title">${schoolTitle}</h1>
            <p class="address-text">${addressText}</p>
            <p class="contact-text">${contactText}</p>
          </div>
          
          <!-- Logo Kanan -->
          <img class="kop-logo-right" src="${srcLogoRight}" alt="Logo Kanan" onerror="this.style.display='none'; document.getElementById('logo-fallback-right').style.display='inline-flex';" />
          <div id="logo-fallback-right" class="kop-logo-fallback" style="margin-left: 15px;">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
        </div>
        
        <div class="report-title">${title}</div>
        ${docNumber ? `<div style="text-align: center; font-size: 11px; font-weight: bold; margin-top: -15px; margin-bottom: 20px; color: #1e293b;">Nomor: ${docNumber}</div>` : ''}
        
        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        
        <div class="signature-section">
          <div class="signature-box">
            <p>Unduh Oleh,</p>
            <p style="font-weight: bold; margin-top: 2px;">${downloaderRole}</p>
            <div style="height: 60px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #cbd5e1; font-size: 9px;">
              (Tanda Tangan Elektronik)
            </div>
            <p style="font-weight: bold; text-decoration: underline;">${downloaderName}</p>
            <p>${downloaderNip}</p>
          </div>
          <div class="signature-box">
            <p>Jakarta, ${formatToday}</p>
            <p style="font-weight: bold; margin-top: 2px;">Kepala Sekolah</p>
            <div style="height: 60px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #cbd5e1; font-size: 9px;">
              (Tanda Tangan & Cap Resmi)
            </div>
            <p style="font-weight: bold; text-decoration: underline;">${headmasterName}</p>
            <p>NIP. ${headmasterNip}</p>
          </div>
        </div>
        </div>
      </body>
    </html>
  `;
  
  printHTML(htmlContent);
};

export const printCertificate = (
  achievement: {
    id?: string;
    title: string;
    category: 'Akademik' | 'Non-Akademik' | string;
    level: string;
    rank?: string;
    date: string;
    recordedBy?: string;
    description?: string;
  },
  student: {
    name: string;
    nisn?: string;
    classId?: string;
  },
  headmasterName: string = 'Dra. Hj. Endah Purwani M.M',
  config?: CertificateConfig
) => {
  const numberTemplate = config?.numberTemplate || 'SER/{TYPE}/{YEAR}/{ID}';
  const yearStr = new Date().getFullYear().toString();
  const idStr = (achievement.id || '001').slice(-4).toUpperCase();
  const typeStr = (achievement.category || 'PRESTASI').toUpperCase();

  const certNumber = numberTemplate
    .replace('{TYPE}', typeStr)
    .replace('{YEAR}', yearStr)
    .replace('{ID}', idStr);

  const leftSigTitle = config?.leftSigTitle || 'Pembina / Coach Kesiswaan';
  const leftSigName = config?.leftSigName || achievement.recordedBy || 'Tim Kesiswaan';

  const rightSigTitle = config?.rightSigTitle || 'Kepala SMPN 50 Jakarta';
  const rightSigName = config?.rightSigName || headmasterName;

  const logoLeft = config?.logoLeftUrl || '/logo-dki.png';
  const logoRight = config?.logoRightUrl || '/logo.png';

  const isAcademic = achievement.category === 'Akademik';
  const bgImage = isAcademic 
    ? (config?.academicBgUrl || config?.bgUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop')
    : (config?.nonAcademicBgUrl || config?.bgUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop');

  const primaryBorderColor = isAcademic ? '#d97706' : '#059669';
  const secondaryBorderColor = isAcademic ? '#b45309' : '#047857';
  const titleColor = isAcademic ? '#78350f' : '#064e3b';
  const themeBadge = isAcademic ? 'AKADEMIK (OSN & LOMBA)' : 'NON-AKADEMIK (EKSTRAKURIKULER)';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>SERTIFIKAT DIGITAL PRESTASI - ${student.name}</title>
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
          
          .cert-card {
            width: 297mm;
            height: 210mm;
            max-width: 100%;
            max-height: 100%;
            padding: 8mm;
            position: relative;
            background: #ffffff;
            background-image: url('${bgImage}');
            background-size: cover;
            background-position: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            page-break-inside: avoid;
            page-break-after: avoid;
          }

          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }
            html, body {
              width: 297mm;
              height: 210mm;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden;
            }
            .cert-card {
              width: 297mm !important;
              height: 210mm !important;
              padding: 8mm !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              page-break-inside: avoid !important;
            }
          }
          
          .cert-outer-border {
            border: 4px double ${primaryBorderColor};
            padding: 8px;
            border-radius: 12px;
            background: ${isAcademic ? 'linear-gradient(135deg, rgba(255,253,250,0.95) 0%, rgba(255,255,255,0.92) 50%, rgba(255,251,240,0.95) 100%)' : 'linear-gradient(135deg, rgba(240,253,244,0.95) 0%, rgba(255,255,255,0.92) 50%, rgba(236,253,245,0.95) 100%)'};
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          
          .cert-inner-border {
            border: 2px solid ${secondaryBorderColor};
            padding: 20px 32px;
            border-radius: 8px;
            text-align: center;
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .header-logos {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .logo-img {
            height: 52px;
            width: auto;
            object-fit: contain;
          }
          
          .corner-ornament {
            position: absolute;
            width: 24px;
            height: 24px;
            border-color: #d97706;
            border-style: solid;
          }
          .c-tl { top: 6px; left: 6px; border-width: 3px 0 0 3px; }
          .c-tr { top: 6px; right: 6px; border-width: 3px 3px 0 0; }
          .c-bl { bottom: 6px; left: 6px; border-width: 0 0 3px 3px; }
          .c-br { bottom: 6px; right: 6px; border-width: 0 3px 3px 0; }
          
          .school-header {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2.5px;
            color: #475569;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          
          .cert-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 3px;
            color: #78350f;
            text-transform: uppercase;
            margin: 4px 0;
            font-family: Georgia, serif;
          }
          
          .cert-no {
            font-size: 10px;
            font-weight: 700;
            color: #d97706;
            letter-spacing: 1.5px;
            margin-bottom: 18px;
          }
          
          .given-to {
            font-size: 13px;
            font-style: italic;
            color: #64748b;
            margin-bottom: 8px;
          }
          
          .student-name {
            font-size: 26px;
            font-weight: 900;
            color: #1e1b4b;
            border-bottom: 2px solid #f59e0b;
            display: inline-block;
            padding-bottom: 4px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .student-meta {
            font-size: 11px;
            color: #475569;
            font-weight: 700;
            margin-bottom: 18px;
          }
          
          .for-text {
            font-size: 12px;
            color: #334155;
            margin-bottom: 6px;
          }
          
          .achievement-title {
            font-size: 20px;
            font-weight: 900;
            color: #b45309;
            margin-bottom: 14px;
            line-height: 1.3;
          }
          
          .pill-group {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-bottom: 22px;
            flex-wrap: wrap;
          }
          
          .pill {
            background: #fef3c7;
            border: 1px solid #fde68a;
            color: #92400e;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .cert-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 16px;
            padding-top: 14px;
            border-top: 1px dashed #e2e8f0;
            text-align: left;
          }
          
          .seal-container {
            text-align: center;
          }
          .seal-badge {
            width: 60px;
            height: 60px;
            border: 3px double #d97706;
            border-radius: 50%;
            background: radial-gradient(circle, #fef3c7 0%, #fde68a 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 4px auto;
            color: #b45309;
            font-size: 22px;
            font-weight: bold;
          }
          .seal-label {
            font-size: 9px;
            font-weight: 800;
            color: #d97706;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          
          .sig-box {
            text-align: center;
            min-width: 180px;
          }
          .sig-date {
            font-size: 10px;
            color: #64748b;
            margin-bottom: 2px;
          }
          .sig-role {
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 35px;
          }
          .sig-name {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            text-decoration: underline;
          }
          .sig-nip {
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="cert-card">
          <div class="cert-outer-border">
            <div class="corner-ornament c-tl"></div>
            <div class="corner-ornament c-tr"></div>
            <div class="corner-ornament c-bl"></div>
            <div class="corner-ornament c-br"></div>
            
            <div class="cert-inner-border">
              <div class="header-logos">
                <img src="${logoLeft}" alt="Logo Kiri" class="logo-img" onerror="this.style.display='none'" />
                <div style="flex:1;">
                  <div class="school-header">PEMERINTAH PROVINSI DKI JAKARTA &bull; SMP NEGERI 50 JAKARTA</div>
                  <div class="cert-title">SERTIFIKAT DIGITAL PRESTASI</div>
                  <div class="cert-no">NO: ${certNumber}</div>
                </div>
                <img src="${logoRight}" alt="Logo Kanan" class="logo-img" onerror="this.style.display='none'" />
              </div>
              
              <div class="given-to">Diberikan dengan rasa bangga dan apresiasi setinggi-tingginya kepada:</div>
              <div class="student-name">${student.name}</div>
              <div class="student-meta">
                NISN: ${student.nisn || '-'} &nbsp;&bull;&nbsp; Kelas: ${student.classId || '-'}
              </div>
              
              <div class="for-text">Atas capaian prestasi gemilang yang telah diraih dalam bidang:</div>
              <div class="achievement-title">"${achievement.title}"</div>
              
              <div class="pill-group">
                <span class="pill">Kategori: ${achievement.category}</span>
                <span class="pill">Tingkat: ${achievement.level}</span>
                ${achievement.rank ? `<span class="pill">Peringkat: ${achievement.rank}</span>` : ''}
              </div>
              
              <div class="cert-footer">
                <div class="sig-box">
                  <div class="sig-date">&nbsp;</div>
                  <div class="sig-role">${leftSigTitle}</div>
                  <div class="sig-name">${leftSigName}</div>
                </div>
                
                <div class="seal-container">
                  <div class="seal-badge">🏆</div>
                  <div class="seal-label">RESMI & SAH</div>
                </div>
                
                <div class="sig-box">
                  <div class="sig-date">Jakarta, ${achievement.date || new Date().toLocaleDateString('id-ID')}</div>
                  <div class="sig-role">${rightSigTitle}</div>
                  <div class="sig-name">${rightSigName}</div>
                  ${config?.rightSigNip ? `<div class="sig-nip">${config.rightSigNip}</div>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printHTML(htmlContent);
};

export const printBeritaAcaraPeminjaman = (
  loan: InventoryLoan,
  headmasterName: string = 'Dra. Hj. Endah Purwani, M.M.'
) => {
  const formattedLoanDate = loan.loanDate ? new Date(loan.loanDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const formattedReturnDate = loan.expectedReturnDate ? new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const formattedActualReturnDate = loan.actualReturnDate ? new Date(loan.actualReturnDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Berita Acara Peminjaman - ${loan.baNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #111827;
            background: #fff;
            margin: 0;
            padding: 20px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px double #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .logo {
            width: 70px;
            height: auto;
          }
          .header-text {
            text-align: center;
            flex: 1;
            padding: 0 10px;
          }
          .header-text h3 {
            margin: 0;
            font-size: 14px;
            font-weight: normal;
            text-transform: uppercase;
          }
          .header-text h2 {
            margin: 2px 0;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header-text p {
            margin: 0;
            font-size: 11px;
            font-style: italic;
          }
          .document-title {
            text-align: center;
            margin: 20px 0 15px 0;
          }
          .document-title h1 {
            font-size: 15px;
            font-weight: bold;
            text-decoration: underline;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .document-title p {
            margin: 4px 0 0 0;
            font-size: 12px;
            font-weight: bold;
          }
          .content-paragraph {
            text-align: justify;
            margin-bottom: 12px;
            text-indent: 20px;
          }
          .party-box {
            margin-left: 15px;
            margin-bottom: 12px;
          }
          .party-table {
            width: 100%;
            border-collapse: collapse;
          }
          .party-table td {
            padding: 3px 6px;
            vertical-align: top;
          }
          .party-table td.label {
            width: 160px;
            font-weight: bold;
          }
          .party-table td.colon {
            width: 10px;
          }
          .item-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .item-table th, .item-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            font-size: 12px;
          }
          .item-table th {
            background-color: #f3f4f6;
            text-align: center;
            font-weight: bold;
          }
          .terms-box {
            margin: 15px 0;
            padding: 10px 15px;
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            border-radius: 4px;
          }
          .terms-box h4 {
            margin: 0 0 6px 0;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .terms-box ol {
            margin: 0;
            padding-left: 20px;
            font-size: 11.5px;
          }
          .terms-box li {
            margin-bottom: 4px;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: bold;
            border-radius: 4px;
            border: 1px solid #000;
          }
          .signature-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 30%;
          }
          .sig-space {
            height: 65px;
          }
          .sig-name {
            font-weight: bold;
            text-decoration: underline;
          }
          .sig-role {
            font-size: 12px;
          }
          .headmaster-sig {
            margin-top: 25px;
            text-align: center;
            width: 100%;
            display: flex;
            justify-content: center;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <!-- Header Kop Surat -->
        <div class="header">
          <img src="/logo-dki.png" alt="Logo DKI" class="logo" />
          <div class="header-text">
            <h3>Pemerintah Provinsi Daerah Khusus Ibukota Jakarta</h3>
            <h3>Dinas Pendidikan</h3>
            <h2>SMP NEGERI 50 JAKARTA</h2>
            <p>Jl. Mayjen Sutoyo, Cawang, Kramat Jati, Jakarta Timur | Telp: (021) 8091234 | Email: info@smpn50.sch.id</p>
          </div>
          <img src="/logo.png" alt="Logo Sekolah" class="logo" />
        </div>

        <!-- Judul Berita Acara -->
        <div class="document-title">
          <h1>BERITA ACARA PEMINJAMAN BARANG INVENTARIS</h1>
          <p>Nomor: ${loan.baNumber}</p>
        </div>

        <p class="content-paragraph">
          Pada hari ini, <strong>${formattedLoanDate}</strong>, telah dilaksanakan serah terima barang inventaris milik SMP Negeri 50 Jakarta untuk keperluan kedinasan/kegiatan pembelajaran, oleh para pihak berikut:
        </p>

        <!-- Pihak Pertama -->
        <div class="party-box">
          <table class="party-table">
            <tr>
              <td class="label">PIHAK PERTAMA (Penyerah)</td>
              <td class="colon">:</td>
              <td><strong>${loan.recordedBy || 'Petugas Sarpras & Inventaris'}</strong></td>
            </tr>
            <tr>
              <td class="label">Jabatan / Unit</td>
              <td class="colon">:</td>
              <td>Pengelola Inventaris & Sarpras SMPN 50 Jakarta</td>
            </tr>
          </table>
        </div>

        <!-- Pihak Kedua -->
        <div class="party-box">
          <table class="party-table">
            <tr>
              <td class="label">PIHAK KEDUA (Peminjam)</td>
              <td class="colon">:</td>
              <td><strong>${loan.borrowerName}</strong></td>
            </tr>
            <tr>
              <td class="label">Kategori Peminjam</td>
              <td class="colon">:</td>
              <td>${loan.borrowerRole}</td>
            </tr>
            <tr>
              <td class="label">Kontak / Keterangan</td>
              <td class="colon">:</td>
              <td>${loan.borrowerContact || '-'}</td>
            </tr>
            <tr>
              <td class="label">Tujuan / Keperluan</td>
              <td class="colon">:</td>
              <td>${loan.purpose}</td>
            </tr>
          </table>
        </div>

        <p style="margin-top: 10px; margin-bottom: 5px;">
          Pihak Pertama telah menyerahkan barang kepada Pihak Kedua, dan Pihak Kedua menyatakan telah menerima barang berikut dalam keadaan fisik yang sesuai:
        </p>

        <!-- Tabel Barang -->
        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 25%;">Kode Inventaris</th>
              <th style="width: 30%;">Nama Barang Sarpras</th>
              <th style="width: 10%;">Jumlah</th>
              <th style="width: 15%;">Kondisi Awal</th>
              <th style="width: 15%;">Target Pengembalian</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td style="font-family: monospace; font-weight: bold; text-align: center;">${loan.itemCode}</td>
              <td><strong>${loan.itemName}</strong></td>
              <td style="text-align: center; font-weight: bold;">${loan.quantity} Unit</td>
              <td style="text-align: center;">${loan.conditionBefore}</td>
              <td style="text-align: center; font-weight: bold;">${formattedReturnDate}</td>
            </tr>
          </tbody>
        </table>

        ${loan.notes ? `
          <p style="margin-top: -5px; margin-bottom: 10px; font-size: 11.5px;">
            <strong>Catatan Kelengkapan:</strong> ${loan.notes}
          </p>
        ` : ''}

        ${loan.status === 'Dikembalikan' ? `
          <div style="margin: 10px 0; padding: 8px 12px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px;">
            <strong style="color: #166534;">STATUS PENGEMBALIAN: DIKEMBALIKAN BERHASIL</strong><br/>
            <span style="font-size: 11.5px;">Telah dikembalikan pada tanggal <strong>${formattedActualReturnDate}</strong> dengan kondisi akhir: <strong>${loan.conditionAfter || 'Baik'}</strong>.</span>
          </div>
        ` : ''}

        <!-- Ketentuan Peminjaman -->
        <div class="terms-box">
          <h4>Ketentuan & Tanggung Jawab Peminjam:</h4>
          <ol>
            <li>Peminjam bertanggung jawab penuh atas keamanan, kebersihan, dan pemeliharaan barang selama masa peminjaman.</li>
            <li>Barang hanya dipergunakan untuk kepentingan kedinasan/pembelajaran sebagaimana tertera di atas dan dilarang dipindahtangankan kepada pihak lain.</li>
            <li>Peminjam wajib mengembalikan barang tepat waktu sesuai target pengembalian (<strong>${formattedReturnDate}</strong>).</li>
            <li>Apabila terjadi kerusakan atau kehilangan, peminjam bersedia mengganti atau memperbaiki sesuai spesifikasi barang yang bersangkutan.</li>
          </ol>
        </div>

        <p>Demikian Berita Acara Peminjaman Barang ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>

        <!-- Tanda Tangan -->
        <div class="signature-section">
          <div class="sig-box">
            <div class="sig-role">Pihak Kedua (Peminjam),</div>
            <div class="sig-space"></div>
            <div class="sig-name">${loan.borrowerName}</div>
            <div style="font-size: 11px; color: #475569;">(${loan.borrowerRole})</div>
          </div>

          <div class="sig-box">
            <div class="sig-role">Pihak Pertama (Petugas),</div>
            <div class="sig-space"></div>
            <div class="sig-name">${loan.recordedBy || 'Pengelola Sarpras'}</div>
            <div style="font-size: 11px; color: #475569;">NIP. 198506122014031002</div>
          </div>
        </div>

        <div class="headmaster-sig">
          <div class="sig-box">
            <div class="sig-role">Mengetahui,<br/>Kepala SMP Negeri 50 Jakarta</div>
            <div class="sig-space"></div>
            <div class="sig-name">${headmasterName}</div>
            <div style="font-size: 11px; color: #475569;">NIP. 196711261991032004</div>
          </div>
        </div>
      </body>
    </html>
  `;

  printHTML(htmlContent);
};

