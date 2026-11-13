import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

/**
 * Utility to generate and download a formatted Microsoft Word (.docx) document
 * with official school Kop Surat, formatted data table, and signature block.
 */
export const downloadDocx = async (
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  headmasterName: string = 'Dra. Hj. Endah Purwani, M.M.'
) => {
  const safeFilename = filename.toLowerCase().endsWith('.docx')
    ? filename
    : `${filename.replace(/\.(xlsx|xls|csv|pdf)$/i, '')}.docx`;

  const govTitle =
    localStorage.getItem('siakad_kop_gov_title') ||
    'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA';
  const deptTitle =
    localStorage.getItem('siakad_kop_dept_title') ||
    'DINAS PENDIDIKAN PROVINSI DKI JAKARTA';
  const sudinTitle =
    localStorage.getItem('siakad_kop_sudin_title') ||
    'SUDIN PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA TIMUR';
  const schoolTitle =
    localStorage.getItem('siakad_kop_school_title') || 'SMP NEGERI 50 JAKARTA';
  const addressText =
    localStorage.getItem('siakad_kop_address_text') ||
    'Komplek Kodam Jaya Cililitan II Kramat Jati – Jakarta Timur – Kode Pos : 13510';
  const contactText =
    localStorage.getItem('siakad_kop_contact_text') ||
    'Telp. (021) 8091734 – Fax (021) 809173 – Email : smpnegeri50@gmail.com';
  const headmasterNip =
    localStorage.getItem('siakad_headmaster_nip') || '196711261991032004';

  let downloaderRole = 'Petugas Administrasi';
  let downloaderName = '........................................';
  let downloaderNip = 'NIP. ..................................';

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
        case 'wali_kelas':
        case 'wali':
          downloaderRole = 'Guru Wali Kelas';
          break;
        case 'guru_wali':
          downloaderRole = 'Guru Wali Akademik';
          break;
        case 'bk':
          downloaderRole = 'Guru Bimbingan Konseling';
          break;
        case 'pelatih':
          downloaderRole = 'Pelatih Ekstrakurikuler';
          break;
        case 'tendik':
          downloaderRole = 'Tenaga Kependidikan (Tendik)';
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
  } catch {
    // ignore storage read error
  }

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const useLandscape = headers.length >= 7;

  const cellBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CBD5E1',
  };

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: {
            fill: '1E293B',
            type: ShadingType.CLEAR,
          },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 100, bottom: 100, left: 110, right: 110 },
          borders: {
            top: cellBorder,
            bottom: cellBorder,
            left: cellBorder,
            right: cellBorder,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: String(h),
                  bold: true,
                  size: 18,
                  color: 'FFFFFF',
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        })
    ),
  });

  const safeRows = rows.length > 0 ? rows : [headers.map((_, idx) => (idx === 0 ? 'Belum ada data tercatat' : '-'))];

  const tableDataRows = safeRows.map(
    (row, rowIdx) =>
      new TableRow({
        cantSplit: true,
        children: headers.map((_, colIdx) => {
          const rawVal = row[colIdx];
          const textVal = rawVal !== null && rawVal !== undefined && String(rawVal) !== '' ? String(rawVal) : '-';
          return new TableCell({
            shading:
              rowIdx % 2 === 1
                ? { fill: 'F8FAFC', type: ShadingType.CLEAR }
                : undefined,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 110, right: 110 },
            borders: {
              top: cellBorder,
              bottom: cellBorder,
              left: cellBorder,
              right: cellBorder,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: textVal,
                    size: 18,
                    color: '1E293B',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          });
        }),
      })
  );

  const dataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...tableDataRows],
  });

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', size: 20, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 900 },
                children: [new TextRun({ text: 'Kepala Sekolah', bold: true, size: 20, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: headmasterName, bold: true, underline: {}, size: 20, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `NIP. ${headmasterNip}`, size: 18, font: 'Calibri', color: '475569' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Jakarta, ${todayStr}`, size: 20, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 900 },
                children: [new TextRun({ text: downloaderRole, bold: true, size: 20, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: downloaderName, bold: true, underline: {}, size: 20, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: downloaderNip, size: 18, font: 'Calibri', color: '475569' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: useLandscape
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
            },
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          // Kop Surat
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: govTitle, bold: true, size: 20, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: deptTitle, bold: true, size: 20, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: sudinTitle, bold: true, size: 18, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: schoolTitle, bold: true, size: 28, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: addressText, size: 16, font: 'Calibri', color: '475569' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.DOUBLE, size: 12, color: '0F172A' },
            },
            children: [new TextRun({ text: contactText, size: 16, font: 'Calibri', color: '475569' })],
          }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 80 },
            children: [
              new TextRun({
                text: title.toUpperCase(),
                bold: true,
                size: 24,
                font: 'Calibri',
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Dicetak melalui SIAS pada ${todayStr} • Total Data: ${rows.length} baris`,
                italics: true,
                size: 18,
                font: 'Calibri',
                color: '64748B',
              }),
            ],
          }),

          // Table
          dataTable,

          // Spacer & Signature
          new Paragraph({
            spacing: { before: 360 },
            children: [],
          }),
          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
