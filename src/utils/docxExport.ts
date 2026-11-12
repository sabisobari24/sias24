import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';

/**
 * Download tabular data as an official formatted Microsoft Word (.docx) document.
 */
export const downloadDocx = async (
  filename: string,
  title: string,
  headers: string[],
  rows: any[][],
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.'
) => {
  try {
    const cleanFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Determine downloader role & name from localStorage
    let downloaderRole = 'Petugas Administrasi';
    let downloaderName = 'Petugas Sekolah';
    let downloaderNip = '..................................';
    try {
      const savedRole = localStorage.getItem('siakad_active_role');
      const savedUserStr = localStorage.getItem('siakad_active_user');
      if (savedRole && savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        downloaderName = savedUser.name || savedUser.username || 'Petugas Sekolah';
        downloaderNip = savedUser.nip || savedUser.id || '..................................';
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
            downloaderRole = 'Wali Kelas';
            break;
          case 'guru_wali':
            downloaderRole = 'Guru Wali Siswa';
            break;
          case 'bk':
            downloaderRole = 'Guru Bimbingan Konseling';
            break;
          case 'pelatih':
            downloaderRole = 'Pelatih Ekstrakurikuler';
            break;
          case 'tendik':
            downloaderRole = 'Staf Tenaga Kependidikan';
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
      /* ignore */
    }

    // Build Table Header Row
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map(
        h =>
          new TableCell({
            width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
            shading: { fill: '4338CA' }, // Indigo-700
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: h,
                    bold: true,
                    color: 'FFFFFF',
                    size: 18, // 9pt
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
      )
    });

    // Build Table Data Rows
    const dataRows = rows.map((r, rIdx) => {
      const isEven = rIdx % 2 === 0;
      return new TableRow({
        children: r.map(
          cell =>
            new TableCell({
              width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
              shading: { fill: isEven ? 'FFFFFF' : 'F8FAFC' },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell !== null && cell !== undefined ? String(cell) : '-',
                      size: 18, // 9pt
                      font: 'Calibri',
                      color: '1E293B'
                    })
                  ]
                })
              ]
            })
        )
      });
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720, // 0.5 in
                bottom: 720,
                left: 720,
                right: 720
              }
            }
          },
          children: [
            // KOP SURAT
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA',
                  bold: true,
                  size: 20,
                  font: 'Arial'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'DINAS PENDIDIKAN',
                  bold: true,
                  size: 22,
                  font: 'Arial'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'SMP NEGERI 50 JAKARTA',
                  bold: true,
                  size: 26,
                  color: '1E3A8A',
                  font: 'Arial'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'Jl. Slamet Riyadi No. 50, Matraman, Jakarta Timur | Telp: (021) 8580556',
                  size: 16,
                  color: '475569',
                  font: 'Arial'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'Website: smpn50jakarta.sch.id | Email: info@smpn50jakarta.sch.id',
                  size: 16,
                  color: '475569',
                  font: 'Arial'
                })
              ]
            }),
            new Paragraph({
              border: {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 12,
                  color: '1E293B'
                }
              },
              children: []
            }),
            new Paragraph({ children: [] }),

            // JUDUL DOKUMEN
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: title.toUpperCase(),
                  bold: true,
                  size: 24,
                  font: 'Arial',
                  color: '0F172A'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `Tanggal Cetak Dokumen: ${formattedDate} | Sistem Informasi Akademik Sekolah (SIAS)`,
                  size: 16,
                  italics: true,
                  color: '64748B',
                  font: 'Calibri'
                })
              ]
            }),
            new Paragraph({ children: [] }),

            // DATA TABLE
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [headerRow, ...dataRows]
            }),

            new Paragraph({ children: [] }),
            new Paragraph({ children: [] }),

            // TANDA TANGAN (SIGNATURE BLOCK)
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE }
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Mengetahui,', size: 18, font: 'Calibri' })]
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: 'Kepala SMPN 50 Jakarta', bold: true, size: 18, font: 'Calibri' })]
                        }),
                        new Paragraph({ children: [] }),
                        new Paragraph({ children: [] }),
                        new Paragraph({ children: [] }),
                        new Paragraph({
                          children: [new TextRun({ text: headmasterName, bold: true, underline: {}, size: 18, font: 'Calibri' })]
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: 'NIP. 196805121994122001', size: 16, font: 'Calibri' })]
                        })
                      ]
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: `Jakarta, ${formattedDate}`, size: 18, font: 'Calibri' })]
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: downloaderRole, bold: true, size: 18, font: 'Calibri' })]
                        }),
                        new Paragraph({ children: [] }),
                        new Paragraph({ children: [] }),
                        new Paragraph({ children: [] }),
                        new Paragraph({
                          children: [new TextRun({ text: downloaderName, bold: true, underline: {}, size: 18, font: 'Calibri' })]
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: `NIP. ${downloaderNip}`, size: 16, font: 'Calibri' })]
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error generating DOCX document, fallback to HTML-Word:', err);
    // Robust HTML-Word Fallback
    fallbackDownloadWordHTML(filename, title, headers, rows, headmasterName);
  }
};

/**
 * Fallback to standard Word-compatible HTML format
 */
const fallbackDownloadWordHTML = (
  filename: string,
  title: string,
  headers: string[],
  rows: any[][],
  headmasterName: string
) => {
  const cleanFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  const tableHeaders = headers.map(h => `<th style="background:#4338CA;color:#FFFFFF;padding:8px;border:1px solid #CBD5E1;font-size:11px;">${h}</th>`).join('');
  const tableRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    const cells = r.map(c => `<td style="padding:6px 8px;border:1px solid #E2E8F0;font-size:10px;background:${bg};">${c !== null && c !== undefined ? String(c) : '-'}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${title}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
    </style>
    </head>
    <body>
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:16px;">
        <h4 style="margin:0;font-size:12pt;">PEMERINTAH PROVINSI DKI JAKARTA - DINAS PENDIDIKAN</h4>
        <h2 style="margin:0;font-size:16pt;color:#1E3A8A;">SMP NEGERI 50 JAKARTA</h2>
        <p style="margin:0;font-size:9pt;color:#475569;">Jl. Slamet Riyadi No. 50, Matraman, Jakarta Timur</p>
      </div>
      <h3 style="text-align:center;font-size:14pt;margin:12px 0 4px 0;">${title.toUpperCase()}</h3>
      <p style="text-align:center;font-size:9pt;color:#64748B;margin-bottom:16px;">Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
      <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <br><br>
      <table style="width:100%;border:none;">
        <tr>
          <td style="width:50%;border:none;">
            Mengetahui,<br>Kepala SMPN 50 Jakarta<br><br><br><br>
            <strong><u>${headmasterName}</u></strong><br>NIP. 196805121994122001
          </td>
          <td style="width:50%;border:none;text-align:right;">
            Jakarta, ${new Date().toLocaleDateString('id-ID')}<br>Petugas Sekolah<br><br><br><br>
            <strong><u>Petugas Administrasi</u></strong>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
