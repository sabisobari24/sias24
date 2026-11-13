export type DateFilterPreset =
  | 'all'
  | 'today'
  | 'last7'
  | 'thisMonth'
  | 'thisSemester'
  | 'custom';

export interface ExportDateRange {
  preset: DateFilterPreset;
  startDate: string;
  endDate: string;
  label: string;
}

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function resolveDatePreset(
  preset: DateFilterPreset,
  customStart: string = '',
  customEnd: string = ''
): ExportDateRange {
  const now = new Date();
  const todayStr = formatLocalDate(now);

  switch (preset) {
    case 'today':
      return {
        preset,
        startDate: todayStr,
        endDate: todayStr,
        label: `Hari Ini (${todayStr})`,
      };
    case 'last7': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      const startStr = formatLocalDate(start);
      return {
        preset,
        startDate: startStr,
        endDate: todayStr,
        label: `7 Hari Terakhir (${startStr} s.d. ${todayStr})`,
      };
    }
    case 'thisMonth': {
      const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return {
        preset,
        startDate: startStr,
        endDate: todayStr,
        label: `Bulan Ini (${startStr} s.d. ${todayStr})`,
      };
    }
    case 'thisSemester': {
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1..12
      if (month >= 7) {
        return {
          preset,
          startDate: `${year}-07-01`,
          endDate: `${year}-12-31`,
          label: `Semester Ganjil (${year}-07-01 s.d. ${year}-12-31)`,
        };
      }
      return {
        preset,
        startDate: `${year}-01-01`,
        endDate: `${year}-06-30`,
        label: `Semester Genap (${year}-01-01 s.d. ${year}-06-30)`,
      };
    }
    case 'custom':
      return {
        preset,
        startDate: customStart || '',
        endDate: customEnd || '',
        label:
          customStart || customEnd
            ? `${customStart || 'Awal'} s.d. ${customEnd || 'Sekarang'}`
            : 'Semua Waktu',
      };
    case 'all':
    default:
      return {
        preset: 'all',
        startDate: '',
        endDate: '',
        label: 'Semua Waktu',
      };
  }
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: '01',
  jan: '01',
  februari: '02',
  feb: '02',
  maret: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  agustus: '08',
  agu: '08',
  ags: '08',
  september: '09',
  sep: '09',
  oktober: '10',
  okt: '10',
  november: '11',
  nov: '11',
  desember: '12',
  des: '12',
};

export function normalizeDateString(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // ISO YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  // Indonesian format e.g. "12 Mei 2026"
  const idMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (idMatch) {
    const monthNum = INDONESIAN_MONTHS[idMatch[2].toLowerCase()];
    if (monthNum) {
      return `${idMatch[3]}-${monthNum}-${idMatch[1].padStart(2, '0')}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatLocalDate(parsed);
  }

  return '';
}

export function filterItemsByDateRange<T>(
  items: T[],
  getDateStr: (item: T) => string | undefined,
  range?: ExportDateRange
): T[] {
  if (!range || range.preset === 'all' || (!range.startDate && !range.endDate)) {
    return items;
  }

  return items.filter((item) => {
    const normalized = normalizeDateString(getDateStr(item));
    if (!normalized) return false;
    if (range.startDate && normalized < range.startDate) return false;
    if (range.endDate && normalized > range.endDate) return false;
    return true;
  });
}

export function getRangeTitleSuffix(range?: ExportDateRange): string {
  if (!range || range.preset === 'all' || (!range.startDate && !range.endDate)) {
    return '';
  }
  return ` (${range.startDate || 'Awal'} s.d. ${range.endDate || 'Sekarang'})`;
}

export function getRangeFileSuffix(range?: ExportDateRange): string {
  if (!range || range.preset === 'all' || (!range.startDate && !range.endDate)) {
    return '';
  }
  return `_${range.startDate || 'awal'}_sd_${range.endDate || 'akhir'}`;
}
