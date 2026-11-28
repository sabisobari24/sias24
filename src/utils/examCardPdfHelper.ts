// Helper for generating Official CBT Exam Participant Cards PDF (1 A4 page = 4 B4-proportioned cards, Front & Back strictly separated)
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Student, SchoolClass, ExamSchedule } from '../types';
import { getEffectiveSchoolLogo, DEFAULT_SCHOOL_LOGO } from './schoolLogoHelper';
import { getSchoolClassName, isSameClass } from './classUtils';
import { createStudentAvatarPng } from './cardPdfHelper';
import { isCartoonOrPlaceholderAvatar } from './avatarHelper';

const escapeHtml = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const isSafeMediaUrl = (url: unknown, fallback: string = ''): string => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmed)
  ) {
    return escapeHtml(trimmed);
  }
  return fallback;
};

async function toSafeDataURL(src: string, fallbackGenerator: () => string): Promise<string> {
  if (!src || src.trim() === '' || isCartoonOrPlaceholderAvatar(src)) {
    return fallbackGenerator();
  }
  if (src.startsWith('data:image/png') || src.startsWith('data:image/jpeg') || src.startsWith('data:image/webp')) {
    return src;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(fallbackGenerator()), 2500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 240;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (_) {
        // Cross-origin taint
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

export interface ExamCardPdfOptions {
  examTitle: string;
  examYear: string;
  examRoom: string;
  headmasterName: string;
  headmasterNip?: string;
  schoolName: string;
  sideMode: 'both' | 'front' | 'back';
  sheetOrder?: 'grouped' | 'paired';
  mirrorBackForDuplex?: boolean;
  onProgress?: (current: number, total: number, msg: string) => void;
}

export interface FormattedExamScheduleRow {
  no: number;
  dayDate: string;
  subject: string;
  time: string;
}

export function buildParticipantNumber(
  student: Student,
  allClassStudents: Student[],
  classes: SchoolClass[],
  fallbackIdx: number
): string {
  const year = new Date().getFullYear();
  const className = getSchoolClassName(student.classId, classes, '-');
  const cleanClass = className.replace(/^Kelas\s+/i, '').replace(/[^a-zA-Z0-9]/g, '') || 'CBT';
  const sortedSameClass = allClassStudents
    .filter((s) => isSameClass(s.classId, student.classId, classes))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const idxInClass = sortedSameClass.findIndex((s) => s.id === student.id);
  const orderNo = String((idxInClass >= 0 ? idxInClass : fallbackIdx) + 1).padStart(2, '0');
  return `${year}-${cleanClass}-${orderNo}`;
}

export function buildSchedulesForStudent(
  student: Student,
  examSchedules: ExamSchedule[],
  classes: SchoolClass[]
): FormattedExamScheduleRow[] {
  const matched = examSchedules.filter(
    (es) => !es.classId || es.classId === 'all' || isSameClass(es.classId, student.classId, classes)
  );

  if (matched.length > 0) {
    return matched.slice(0, 10).map((es, idx) => ({
      no: idx + 1,
      dayDate: es.date || '-',
      subject: es.subject || '-',
      time: es.time || '-',
    }));
  }

  // Blank printable template (8 clean rows ready for manual fill or future CBT schedule data)
  return Array.from({ length: 8 }, (_, idx) => ({
    no: idx + 1,
    dayDate: '',
    subject: '',
    time: '',
  }));
}

function buildFrontCardHtml(params: {
  student: Student;
  classNameLabel: string;
  participantNo: string;
  safeAvatar: string;
  safeLogoRight: string;
  safeLogoLeft: string;
  govTitle: string;
  deptTitle: string;
  schoolAddress: string;
  examTitle: string;
  examYear: string;
  examRoom: string;
  schoolName: string;
  headmasterName: string;
  headmasterNip: string;
  dateLabel: string;
}): string {
  const {
    student,
    classNameLabel,
    participantNo,
    safeAvatar,
    safeLogoRight,
    safeLogoLeft,
    govTitle,
    deptTitle,
    schoolAddress,
    examTitle,
    examYear,
    examRoom,
    schoolName,
    headmasterName,
    headmasterNip,
    dateLabel,
  } = params;

  return `
    <div style="
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: 2px solid #1e293b;
      border-radius: 10px;
      background: #ffffff;
      padding: 12px 13px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      position: relative;
      overflow: hidden;
    ">
      <!-- KOP SURAT -->
      <div>
        <div style="display:flex;align-items:center;gap:8px;border-bottom:2px solid #0f172a;padding-bottom:7px;margin-bottom:8px;">
          <img src="${isSafeMediaUrl(safeLogoLeft)}" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;" />
          <div style="flex:1;text-align:center;line-height:1.15;">
            <div style="font-size:7.5px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.4px;">${escapeHtml(govTitle)}</div>
            <div style="font-size:7px;font-weight:600;color:#475569;text-transform:uppercase;">${escapeHtml(deptTitle)}</div>
            <div style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;margin-top:1px;">${escapeHtml(schoolName)}</div>
            <div style="font-size:6.5px;color:#64748b;margin-top:1px;">${escapeHtml(schoolAddress)}</div>
          </div>
          <img src="${isSafeMediaUrl(safeLogoRight)}" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;" />
        </div>

        <!-- BADGE JUDUL KARTU -->
        <div style="text-align:center;margin-bottom:8px;">
          <div style="display:inline-block;background:#1e1b4b;color:#ffffff;font-size:9px;font-weight:900;padding:3px 12px;border-radius:999px;letter-spacing:0.8px;text-transform:uppercase;">
            KARTU TANDA PESERTA UJIAN (CBT)
          </div>
          <div style="font-size:10px;font-weight:900;color:#4c1d95;text-transform:uppercase;margin-top:4px;line-height:1.2;">
            ${escapeHtml(examTitle)}
          </div>
          <div style="font-size:8px;font-weight:700;color:#64748b;margin-top:2px;">
            Tahun Pelajaran: ${escapeHtml(examYear)}
          </div>
        </div>

        <!-- BIODATA & FOTO 3x4 -->
        <div style="display:flex;gap:11px;align-items:stretch;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:9px;">
          <div style="width:96px;height:128px;border:1.5px solid #94a3b8;border-radius:6px;overflow:hidden;background:#ffffff;flex-shrink:0;">
            <img src="${isSafeMediaUrl(safeAvatar)}" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;" />
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:5px;font-size:9.5px;">
            <div>
              <div style="font-size:7px;font-weight:800;color:#6d28d9;text-transform:uppercase;">Nomor Peserta CBT</div>
              <div style="display:inline-block;margin-top:1px;font-family:monospace;font-size:11px;font-weight:900;color:#5b21b6;background:#ede9fe;padding:2px 7px;border-radius:4px;border:1px solid #c4b5fd;">
                ${escapeHtml(participantNo)}
              </div>
            </div>
            <div>
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Nama Peserta</div>
              <div style="font-size:10.5px;font-weight:900;color:#0f172a;text-transform:uppercase;line-height:1.15;word-break:break-word;">
                ${escapeHtml(student.name)}
              </div>
            </div>
            <div style="display:flex;gap:10px;">
              <div style="flex:1;">
                <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">NISN</div>
                <div style="font-family:monospace;font-size:9px;font-weight:700;color:#1e293b;">${escapeHtml(student.nisn || '-')}</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Kelas</div>
                <div style="font-size:9px;font-weight:800;color:#1e293b;">${escapeHtml(classNameLabel)}</div>
              </div>
            </div>
            <div>
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Ruang / Sesi Ujian</div>
              <div style="font-size:8.5px;font-weight:700;color:#334155;">${escapeHtml(examRoom)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CATATAN & PENGESAHAN -->
      <div style="border-top:1px dashed #cbd5e1;padding-top:8px;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;">
        <div style="flex:1;">
          <div style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:3px 7px;font-family:monospace;font-size:8.5px;font-weight:800;letter-spacing:1.2px;color:#0f172a;">
            |||| | |||| || ||| |
          </div>
          <div style="font-family:monospace;font-size:7px;color:#64748b;margin-top:2px;">*${escapeHtml(participantNo)}*</div>
          <div style="font-size:6.5px;color:#64748b;margin-top:3px;line-height:1.25;">
            Kartu wajib dibawa saat mengikuti ujian berbasis komputer (CBT).
          </div>
        </div>
        <div style="text-align:center;width:138px;flex-shrink:0;line-height:1.2;">
          <div style="font-size:7.5px;color:#475569;">Jakarta, ${escapeHtml(dateLabel)}</div>
          <div style="font-size:7.5px;font-weight:700;color:#1e293b;">Kepala Sekolah,</div>
          <div style="height:26px;display:flex;align-items:center;justify-content:center;">
            <span style="font-family:Georgia,serif;font-style:italic;font-size:8.5px;color:#4338ca;font-weight:700;">[Tanda Tangan &amp; Cap]</span>
          </div>
          <div style="font-size:8px;font-weight:900;color:#0f172a;text-decoration:underline;">${escapeHtml(headmasterName)}</div>
          ${headmasterNip ? `<div style="font-size:7px;color:#475569;font-family:monospace;">NIP. ${escapeHtml(headmasterNip)}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function buildBackCardHtml(params: {
  student: Student;
  classNameLabel: string;
  participantNo: string;
  schedules: FormattedExamScheduleRow[];
  examTitle: string;
}): string {
  const { student, classNameLabel, participantNo, schedules, examTitle } = params;

  const rowsHtml = schedules
    .map(
      (sc) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:3px 4px;text-align:center;font-weight:700;color:#64748b;border-right:1px solid #e2e8f0;">${sc.no}</td>
        <td style="padding:3px 5px;color:#1e293b;border-right:1px solid #e2e8f0;white-space:nowrap;">${escapeHtml(sc.dayDate || '')}</td>
        <td style="padding:3px 5px;font-weight:700;color:#0f172a;border-right:1px solid #e2e8f0;">${escapeHtml(sc.subject || '')}</td>
        <td style="padding:3px 4px;text-align:center;font-family:monospace;color:#334155;border-right:1px solid #e2e8f0;white-space:nowrap;">${escapeHtml(sc.time || '')}</td>
        <td style="padding:3px 4px;text-align:center;color:#94a3b8;">&nbsp;</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: 2px solid #1e293b;
      border-radius: 10px;
      background: #ffffff;
      padding: 12px 13px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
    ">
      <div>
        <!-- HEADER BELAKANG -->
        <div style="text-align:center;border-bottom:2px solid #334155;padding-bottom:6px;margin-bottom:7px;">
          <div style="font-size:10px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.3px;">
            JADWAL UJIAN &amp; PARAF PENGAWAS RUANG
          </div>
          <div style="font-size:7.5px;font-weight:700;color:#4c1d95;text-transform:uppercase;margin-top:1px;">
            ${escapeHtml(examTitle)}
          </div>
          <div style="font-size:7.5px;color:#475569;margin-top:2px;">
            Nama: <strong style="color:#0f172a;">${escapeHtml(student.name)}</strong> &bull;
            Kelas: <strong style="color:#0f172a;">${escapeHtml(classNameLabel)}</strong> &bull;
            No: <strong style="color:#5b21b6;font-family:monospace;">${escapeHtml(participantNo)}</strong>
          </div>
        </div>

        <!-- TABEL JADWAL -->
        <table style="width:100%;border-collapse:collapse;border:1px solid #94a3b8;font-size:7.5px;margin-bottom:7px;">
          <thead>
            <tr style="background:#f1f5f9;border-bottom:1.5px solid #94a3b8;color:#1e293b;font-weight:800;text-transform:uppercase;">
              <th style="padding:4px 3px;text-align:center;width:20px;border-right:1px solid #cbd5e1;">No</th>
              <th style="padding:4px 5px;text-align:left;width:72px;border-right:1px solid #cbd5e1;">Hari / Tgl</th>
              <th style="padding:4px 5px;text-align:left;border-right:1px solid #cbd5e1;">Mata Pelajaran</th>
              <th style="padding:4px 4px;text-align:center;width:54px;border-right:1px solid #cbd5e1;">Waktu</th>
              <th style="padding:4px 4px;text-align:center;width:36px;">Paraf</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- TATA TERTIB -->
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;font-size:7px;color:#334155;line-height:1.35;">
          <div style="font-weight:800;color:#0f172a;text-transform:uppercase;margin-bottom:2px;font-size:7.5px;">Tata Tertib Peserta CBT:</div>
          <div>1. Hadir di ruang ujian minimal 15 menit sebelum sesi dimulai.</div>
          <div>2. Wajib membawa Kartu Peserta dan dilarang meminjamkan akun kepada orang lain.</div>
          <div>3. Kartu wajib diparaf Pengawas Ruang setiap selesai mengikuti mata pelajaran.</div>
        </div>
      </div>

      <!-- TTD PESERTA -->
      <div style="border-top:1px dashed #cbd5e1;padding-top:6px;display:flex;justify-content:space-between;align-items:flex-end;font-size:7.5px;color:#64748b;">
        <span>Halaman Belakang Kartu Ujian (B4-Grid A4)</span>
        <div style="text-align:center;width:115px;line-height:1.2;">
          <div style="font-size:7px;">Tanda Tangan Peserta,</div>
          <div style="height:22px;"></div>
          <div style="font-weight:800;color:#0f172a;text-decoration:underline;font-size:8px;text-transform:uppercase;">${escapeHtml(student.name)}</div>
        </div>
      </div>
    </div>
  `;
}

async function renderSheetToPdfPage(
  pdf: jsPDF,
  sheetTitle: string,
  cardsHtml: Array<string | null>,
  isFirstPage: boolean
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.height = '1123px';
  container.style.background = '#ffffff';
  container.style.boxSizing = 'border-box';
  container.style.padding = '22px 24px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.fontFamily = 'Arial, Helvetica, sans-serif';
  container.style.zIndex = '-1';

  const cellsHtml = cardsHtml
    .map((card) =>
      card
        ? `<div style="width:100%;height:100%;box-sizing:border-box;">${card}</div>`
        : `<div style="width:100%;height:100%;box-sizing:border-box;border:1px dashed #e2e8f0;border-radius:10px;"></div>`
    )
    .join('');

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:4px;border-bottom:1px dashed #cbd5e1;font-size:8.5px;color:#64748b;font-weight:700;">
      <span>${escapeHtml(sheetTitle)}</span>
      <span>Format A4 (4 Kartu Proporsi B4) • Garis Potong</span>
    </div>
    <div style="flex:1;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr));gap:14px;min-height:0;">
      ${cellsHtml}
    </div>
  `;

  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    if (!isFirstPage) {
      pdf.addPage('a4', 'portrait');
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadExamCardsPdfA4(
  studentList: Student[],
  classes: SchoolClass[],
  examSchedules: ExamSchedule[],
  options: ExamCardPdfOptions
): Promise<void> {
  if (studentList.length === 0) return;

  const {
    examTitle,
    examYear,
    examRoom,
    headmasterName,
    schoolName,
    sideMode,
    sheetOrder = 'grouped',
    mirrorBackForDuplex = true,
    onProgress,
  } = options;

  const headmasterNip =
    options.headmasterNip || localStorage.getItem('siakad_headmaster_nip') || '';
  const govTitle =
    localStorage.getItem('siakad_kop_gov_title') || 'PEMERINTAH PROVINSI DKI JAKARTA';
  const deptTitle =
    localStorage.getItem('siakad_kop_dept_title') || 'DINAS PENDIDIKAN';
  const schoolAddress =
    localStorage.getItem('siakad_kop_address') || 'Jakarta Timur • Portal Resmi SIAS';
  const logoLeftRaw = localStorage.getItem('siakad_logo_left') || '/logo-dki.png';
  const logoRightRaw = getEffectiveSchoolLogo() || DEFAULT_SCHOOL_LOGO;

  onProgress?.(0, studentList.length, 'Menyiapkan aset logo & foto peserta...');

  const [safeLogoLeft, safeLogoRight] = await Promise.all([
    toSafeDataURL(logoLeftRaw, () => ''),
    toSafeDataURL(logoRightRaw, () => ''),
  ]);

  const dateLabel = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Prepare Front & Back HTML per student
  const preparedCards: Array<{ frontHtml: string; backHtml: string }> = [];
  for (let i = 0; i < studentList.length; i++) {
    const student = studentList[i];
    onProgress?.(
      i + 1,
      studentList.length,
      `Menyiapkan kartu ${i + 1}/${studentList.length}: ${student.name}`
    );
    const classNameLabel = getSchoolClassName(student.classId, classes, '-');
    const participantNo = buildParticipantNumber(student, studentList, classes, i);
    const safeAvatar = await toSafeDataURL(student.avatarUrl, () =>
      createStudentAvatarPng(student.name, student.gender)
    );
    const schedules = buildSchedulesForStudent(student, examSchedules, classes);

    const frontHtml = buildFrontCardHtml({
      student,
      classNameLabel,
      participantNo,
      safeAvatar,
      safeLogoLeft,
      safeLogoRight,
      govTitle,
      deptTitle,
      schoolAddress,
      examTitle,
      examYear,
      examRoom,
      schoolName,
      headmasterName,
      headmasterNip,
      dateLabel,
    });

    const backHtml = buildBackCardHtml({
      student,
      classNameLabel,
      participantNo,
      schedules,
      examTitle,
    });

    preparedCards.push({ frontHtml, backHtml });
  }

  // Group into chunks of 4 cards per A4 page
  const chunks: Array<Array<{ frontHtml: string; backHtml: string } | null>> = [];
  for (let i = 0; i < preparedCards.length; i += 4) {
    const slice: Array<{ frontHtml: string; backHtml: string } | null> = preparedCards.slice(i, i + 4);
    while (slice.length < 4) slice.push(null);
    chunks.push(slice);
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let isFirstPage = true;
  const totalChunks = chunks.length;

  const renderFrontChunk = async (chunkIdx: number) => {
    onProgress?.(
      chunkIdx + 1,
      totalChunks,
      `Merender Lembar A4 Depan ${chunkIdx + 1} dari ${totalChunks}...`
    );
    const cards = chunks[chunkIdx].map((c) => (c ? c.frontHtml : null));
    await renderSheetToPdfPage(
      pdf,
      `HALAMAN DEPAN — KARTU PESERTA UJIAN (Lembar ${chunkIdx + 1}/${totalChunks})`,
      cards,
      isFirstPage
    );
    isFirstPage = false;
  };

  const renderBackChunk = async (chunkIdx: number) => {
    onProgress?.(
      chunkIdx + 1,
      totalChunks,
      `Merender Lembar A4 Belakang (Jadwal) ${chunkIdx + 1} dari ${totalChunks}...`
    );
    const raw = chunks[chunkIdx];
    const arranged = mirrorBackForDuplex ? [raw[1], raw[0], raw[3], raw[2]] : raw;
    const cards = arranged.map((c) => (c ? c.backHtml : null));
    await renderSheetToPdfPage(
      pdf,
      `HALAMAN BELAKANG — JADWAL UJIAN & PARAF PENGAWAS (Lembar ${chunkIdx + 1}/${totalChunks}${mirrorBackForDuplex ? ' • Duplex Cermin' : ''})`,
      cards,
      isFirstPage
    );
    isFirstPage = false;
  };

  if (sideMode === 'front') {
    for (let i = 0; i < totalChunks; i++) {
      await renderFrontChunk(i);
    }
  } else if (sideMode === 'back') {
    for (let i = 0; i < totalChunks; i++) {
      await renderBackChunk(i);
    }
  } else if (sheetOrder === 'paired') {
    for (let i = 0; i < totalChunks; i++) {
      await renderFrontChunk(i);
      await renderBackChunk(i);
    }
  } else {
    // Default 'grouped': All Front A4 pages first, strictly separated from all Back (Schedule) A4 pages
    for (let i = 0; i < totalChunks; i++) {
      await renderFrontChunk(i);
    }
    for (let i = 0; i < totalChunks; i++) {
      await renderBackChunk(i);
    }
  }

  const safeExam = examTitle.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'CBT';
  const sideTag = sideMode === 'front' ? '_Depan' : sideMode === 'back' ? '_Belakang_Jadwal' : '_Depan_Belakang_Terpisah';
  pdf.save(`Kartu_Peserta_${safeExam}${sideTag}_A4.pdf`);
}
