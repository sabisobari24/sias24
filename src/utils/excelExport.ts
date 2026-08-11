import * as XLSX from 'xlsx';

/**
 * Utility to download formatted Excel spreadsheet.
 */
export const downloadExcel = (filename: string, headers: string[], rows: any[][], sheetName = 'Data Rekapitulasi') => {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-fit column widths
  const maxColWidths = headers.map((h, i) => {
    let maxLen = h.length;
    rows.forEach(r => {
      const valStr = r[i] !== undefined && r[i] !== null ? String(r[i]) : '';
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 55) };
  });
  ws['!cols'] = maxColWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

/**
 * Utility to parse uploaded Excel or CSV file into 2D array.
 */
export const parseCSVText = (text: string): string[][] => {
  // 1. Detect delimiter: look at first 3 lines and find count of commas, semicolons, tabs
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const firstLine = lines[0] || '';
  
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          j++;
        } else {
          // Toggle quote
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  
  return rows;
};

export const parseExcel = (file: File, callback: (rows: any[][]) => void, errorCallback: (err: any) => void) => {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.csv')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSVText(text);
        callback(rows);
      } catch (err) {
        errorCallback(err);
      }
    };
    reader.onerror = (err) => errorCallback(err);
    reader.readAsText(file, 'UTF-8');
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // { defval: "" } preserves empty columns as empty strings instead of skipping them entirely!
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        callback(json);
      } catch (err) {
        errorCallback(err);
      }
    };
    reader.onerror = (err) => errorCallback(err);
    reader.readAsArrayBuffer(file);
  }
};
