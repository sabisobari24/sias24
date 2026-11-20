import { PkksAssessment, PkksIndicator, PkksQuarter } from '../types';

export const PKKS_QUARTERS: PkksQuarter[] = ['TW 1', 'TW 2', 'TW 3', 'TW 4'];

export const PKKS_QUARTER_LABELS: Record<PkksQuarter, string> = {
  'TW 1': 'Triwulan 1 (Jan–Mar)',
  'TW 2': 'Triwulan 2 (Apr–Jun)',
  'TW 3': 'Triwulan 3 (Jul–Sep)',
  'TW 4': 'Triwulan 4 (Okt–Des)',
};

export const PKKS_SCORE_CRITERIA = [
  {
    value: 1,
    label: 'Kurang',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    activeBtnClass: 'bg-rose-600 text-white border-rose-600 shadow-sm',
    idleBtnClass: 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50',
  },
  {
    value: 2,
    label: 'Cukup',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    activeBtnClass: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    idleBtnClass: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50',
  },
  {
    value: 3,
    label: 'Baik',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    activeBtnClass: 'bg-blue-600 text-white border-blue-600 shadow-sm',
    idleBtnClass: 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50',
  },
  {
    value: 4,
    label: 'Sangat Baik',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    idleBtnClass: 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50',
  },
] as const;

export function normalizePkksScore(rawScore: number): number {
  const num = Number(rawScore || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  // Backward compatibility if any legacy 1-100 score exists
  if (num > 4) {
    if (num >= 86) return 4;
    if (num >= 71) return 3;
    if (num >= 56) return 2;
    return 1;
  }
  return Math.max(1, Math.min(4, num));
}

export function getPkksPredicate(score: number): {
  label: string;
  badgeClass: string;
  barClass: string;
  textClass: string;
} {
  const val = normalizePkksScore(score);
  if (val <= 0) {
    return {
      label: 'Belum Dinilai',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      barClass: 'bg-slate-300',
      textClass: 'text-slate-500',
    };
  }
  if (val >= 3.5) {
    return {
      label: 'Sangat Baik',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-700',
    };
  }
  if (val >= 2.5) {
    return {
      label: 'Baik',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      barClass: 'bg-blue-600',
      textClass: 'text-blue-700',
    };
  }
  if (val >= 1.5) {
    return {
      label: 'Cukup',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      barClass: 'bg-amber-500',
      textClass: 'text-amber-700',
    };
  }
  return {
    label: 'Kurang',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    barClass: 'bg-rose-500',
    textClass: 'text-rose-700',
  };
}

export interface PkksQuarterStats {
  quarter: PkksQuarter;
  overallAvg: number;
  academicAvg: number;
  managerialAvg: number;
  assessedCount: number;
  totalActiveCount: number;
  completionRate: number;
  predicate: ReturnType<typeof getPkksPredicate>;
  summaryFeedback?: string;
  summaryRecommendation?: string;
  assessorName?: string;
  updatedAt?: string;
}

export function computePkksQuarterStats(
  indicators: PkksIndicator[],
  assessments: PkksAssessment[],
  year: number
): PkksQuarterStats[] {
  const activeIndicators = indicators.filter((ind) => ind.isActive !== false);
  const indicatorBySub = new Map<string, PkksIndicator>();
  activeIndicators.forEach((ind) => {
    indicatorBySub.set(ind.id, ind);
    indicatorBySub.set(ind.subCode, ind);
  });

  return PKKS_QUARTERS.map((quarter) => {
    const quarterScores = assessments.filter(
      (a) =>
        a.year === year &&
        a.quarter === quarter &&
        a.recordType !== 'summary' &&
        typeof a.score === 'number' &&
        a.score > 0
    );

    const summaryDoc = assessments.find(
      (a) => a.year === year && a.quarter === quarter && a.recordType === 'summary'
    );

    let sumAll = 0;
    let countAll = 0;
    let sumAkademik = 0;
    let countAkademik = 0;
    let sumManajerial = 0;
    let countManajerial = 0;

    quarterScores.forEach((item) => {
      const ind =
        (item.subIndicatorId ? indicatorBySub.get(item.subIndicatorId) : undefined) ||
        (item.subCode ? indicatorBySub.get(item.subCode) : undefined);

      const scoreVal = normalizePkksScore(Number(item.score || 0));
      if (!Number.isFinite(scoreVal) || scoreVal <= 0) return;

      // Skip inactive indicators if known
      if (ind && ind.isActive === false) return;

      sumAll += scoreVal;
      countAll += 1;

      const domain = ind?.domain || (item.subCode?.startsWith('D.1.') ? 'Akademik' : 'Manajerial');
      if (domain === 'Akademik') {
        sumAkademik += scoreVal;
        countAkademik += 1;
      } else {
        sumManajerial += scoreVal;
        countManajerial += 1;
      }
    });

    const overallAvg = countAll > 0 ? Number((sumAll / countAll).toFixed(2)) : 0;
    const academicAvg = countAkademik > 0 ? Number((sumAkademik / countAkademik).toFixed(2)) : 0;
    const managerialAvg = countManajerial > 0 ? Number((sumManajerial / countManajerial).toFixed(2)) : 0;
    const totalActiveCount = activeIndicators.length || INITIAL_PKKS_INDICATORS.length;
    const completionRate =
      totalActiveCount > 0 ? Math.min(100, Math.round((countAll / totalActiveCount) * 100)) : 0;

    return {
      quarter,
      overallAvg,
      academicAvg,
      managerialAvg,
      assessedCount: countAll,
      totalActiveCount,
      completionRate,
      predicate: getPkksPredicate(overallAvg),
      summaryFeedback: summaryDoc?.feedback,
      summaryRecommendation: summaryDoc?.recommendation,
      assessorName: summaryDoc?.assessorName || quarterScores[0]?.assessorName,
      updatedAt: summaryDoc?.updatedAt || quarterScores[0]?.updatedAt,
    };
  });
}

// =============================================================================
// Indikator Rapor Pendidikan PKKS (Kepmendikdasmen No. 63 Tahun 2026)
// Bidang Akademik & Bidang Manajerial
// =============================================================================
export const INITIAL_PKKS_INDICATORS: PkksIndicator[] = [
  // --- BIDANG AKADEMIK ---
  {
    id: 'pkks-D.1.1',
    domain: 'Akademik',
    variableName: 'Kualitas Pembelajaran',
    indicatorCode: 'D.1',
    indicatorName: 'Kualitas pembelajaran',
    subCode: 'D.1.1',
    subName: 'Pengelolaan Kelas (Manajemen kelas): keteraturan suasana kelas dan disiplin positif',
    order: 1,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.1.2',
    domain: 'Akademik',
    variableName: 'Kualitas Pembelajaran',
    indicatorCode: 'D.1',
    indicatorName: 'Kualitas pembelajaran',
    subCode: 'D.1.2',
    subName: 'Dukungan Psikologis Murid: dukungan afektif, perhatian dan kepedulian guru, umpan balik konstruktif',
    order: 2,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.1.3',
    domain: 'Akademik',
    variableName: 'Kualitas Pembelajaran',
    indicatorCode: 'D.1',
    indicatorName: 'Kualitas pembelajaran',
    subCode: 'D.1.3',
    subName: 'Metode Pembelajaran: instruksi adaptif, panduan guru, aktivitas interaktif, pembelajaran literasi, pembelajaran numerasi, iklim pembelajaran terbuka',
    order: 3,
    isActive: true,
    targetScore: 4,
  },

  // --- BIDANG MANAJERIAL: 1. Kepemimpinan Pembelajaran ---
  {
    id: 'pkks-D.3.1',
    domain: 'Manajerial',
    variableName: 'Kepemimpinan Pembelajaran',
    indicatorCode: 'D.3',
    indicatorName: 'Kepemimpinan instruksional',
    subCode: 'D.3.1',
    subName: 'Visi-misi satuan pendidikan',
    order: 4,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.3.2',
    domain: 'Manajerial',
    variableName: 'Kepemimpinan Pembelajaran',
    indicatorCode: 'D.3',
    indicatorName: 'Kepemimpinan instruksional',
    subCode: 'D.3.2',
    subName: 'Pengelolaan kurikulum satuan pendidikan',
    order: 5,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.3.3',
    domain: 'Manajerial',
    variableName: 'Kepemimpinan Pembelajaran',
    indicatorCode: 'D.3',
    indicatorName: 'Kepemimpinan instruksional',
    subCode: 'D.3.3',
    subName: 'Dukungan untuk refleksi guru',
    order: 6,
    isActive: true,
    targetScore: 4,
  },

  // --- BIDANG MANAJERIAL: 2. Lingkungan Belajar (D.4, D.6, D.8, D.10) ---
  {
    id: 'pkks-D.4.1',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.1',
    subName: 'Kesejahteraan psikologis (wellbeing) peserta didik',
    order: 7,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.2',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.2',
    subName: 'Kesejahteraan psikologis (wellbeing) guru',
    order: 8,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.3',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.3',
    subName: 'Pemahaman dan sikap guru terhadap perundungan',
    order: 9,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.4',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.4',
    subName: 'Pengalaman perundungan peserta didik',
    order: 10,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.5',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.5',
    subName: 'Pemahaman dan sikap guru terhadap hukuman fisik',
    order: 11,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.6',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.6',
    subName: 'Pengalaman hukuman fisik peserta didik',
    order: 12,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.7',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.7',
    subName: 'Pemahaman dan sikap guru tentang kekerasan seksual',
    order: 13,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.8',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.8',
    subName: 'Pengalaman kekerasan seksual peserta didik',
    order: 14,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.9',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.9',
    subName: 'Pemahaman dan sikap guru tentang rokok, minuman keras, dan narkoba',
    order: 15,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.4.10',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.4',
    indicatorName: 'Iklim keamanan satuan pendidikan',
    subCode: 'D.4.10',
    subName: 'Pengalaman peserta didik terkait rokok, minuman keras, dan narkoba',
    order: 16,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.6.1',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.6',
    indicatorName: 'Iklim kesetaraan gender',
    subCode: 'D.6.1',
    subName: 'Pemahaman dan sikap warga satuan pendidikan terhadap kesetaraan gender',
    order: 17,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.6.2',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.6',
    indicatorName: 'Iklim kesetaraan gender',
    subCode: 'D.6.2',
    subName: 'Perilaku warga satuan pendidikan terhadap kesetaraan gender',
    order: 18,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.8.1',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.8',
    indicatorName: 'Iklim kebinekaan',
    subCode: 'D.8.1',
    subName: 'Toleransi agama dan budaya',
    order: 19,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.8.2',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.8',
    indicatorName: 'Iklim kebinekaan',
    subCode: 'D.8.2',
    subName: 'Komitmen kebangsaan',
    order: 20,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.8.3',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.8',
    indicatorName: 'Iklim kebinekaan',
    subCode: 'D.8.3',
    subName: 'Toleransi dan kesetaraan peserta didik',
    order: 21,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.10.1',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.10',
    indicatorName: 'Iklim inklusivitas',
    subCode: 'D.10.1',
    subName: 'Layanan untuk peserta didik penyandang disabilitas',
    order: 22,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.10.2',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.10',
    indicatorName: 'Iklim inklusivitas',
    subCode: 'D.10.2',
    subName: 'Layanan untuk peserta didik cerdas dan bakat istimewa',
    order: 23,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-D.10.3',
    domain: 'Manajerial',
    variableName: 'Lingkungan Belajar',
    indicatorCode: 'D.10',
    indicatorName: 'Iklim inklusivitas',
    subCode: 'D.10.3',
    subName: 'Sikap guru terhadap disabilitas',
    order: 24,
    isActive: true,
    targetScore: 4,
  },

  // --- BIDANG MANAJERIAL: 3. Pengelolaan Satuan Pendidikan Efektif (E.1, E.2, E.3, E.5, E.6, E.7) ---
  {
    id: 'pkks-E.1.1',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.1',
    indicatorName: 'Partisipasi warga satuan pendidikan',
    subCode: 'E.1.1',
    subName: 'Partisipasi orang tua',
    order: 25,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.1.2',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.1',
    indicatorName: 'Partisipasi warga satuan pendidikan',
    subCode: 'E.1.2',
    subName: 'Partisipasi peserta didik',
    order: 26,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.2.1',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.2',
    indicatorName: 'Proporsi pemanfaatan sumber daya sekolah',
    subCode: 'E.2.1',
    subName: 'Proporsi pembelanjaan peningkatan mutu guru dan tenaga kependidikan',
    order: 27,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.2.2',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.2',
    indicatorName: 'Proporsi pemanfaatan sumber daya sekolah',
    subCode: 'E.2.2',
    subName: 'Proporsi pembelanjaan non personil untuk mutu pembelajaran',
    order: 28,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.3.1',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.3',
    indicatorName: 'Pemanfaatan TIK untuk pengelolaan anggaran',
    subCode: 'E.3.1',
    subName: 'Proporsi pembelanjaan dana BOS secara daring (SIPLah)',
    order: 29,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.3.2',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.3',
    indicatorName: 'Pemanfaatan TIK untuk pengelolaan anggaran',
    subCode: 'E.3.2',
    subName: 'Indeks penggunaan platform sumber daya sekolah (ketepatan dan kelengkapan pelaporan BOS di ARKAS)',
    order: 30,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.5.1',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.5',
    indicatorName: 'Program dan kebijakan satuan pendidikan',
    subCode: 'E.5.1',
    subName: 'Tentang perundungan',
    order: 31,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.5.2',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.5',
    indicatorName: 'Program dan kebijakan satuan pendidikan',
    subCode: 'E.5.2',
    subName: 'Tentang hukuman fisik',
    order: 32,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.5.3',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.5',
    indicatorName: 'Program dan kebijakan satuan pendidikan',
    subCode: 'E.5.3',
    subName: 'Tentang kekerasan seksual',
    order: 33,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.5.4',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.5',
    indicatorName: 'Program dan kebijakan satuan pendidikan',
    subCode: 'E.5.4',
    subName: 'Tentang rokok, minuman keras, dan narkoba',
    order: 34,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.5.5',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.5',
    indicatorName: 'Program dan kebijakan satuan pendidikan',
    subCode: 'E.5.5',
    subName: 'Mengenai kesetaraan gender',
    order: 35,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.5.6',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.5',
    indicatorName: 'Program dan kebijakan satuan pendidikan',
    subCode: 'E.5.6',
    subName: 'Mengenai penanggulangan dan pencegahan intoleransi',
    order: 36,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.6.1',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.6',
    indicatorName: 'Ketersediaan buku pendidikan',
    subCode: 'E.6.1',
    subName: 'Ketersediaan buku teks utama',
    order: 37,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.6.2',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.6',
    indicatorName: 'Ketersediaan buku pendidikan',
    subCode: 'E.6.2',
    subName: 'Ketersediaan buku non teks',
    order: 38,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.7.1',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.7',
    indicatorName: 'Indeks fasilitas satuan pendidikan',
    subCode: 'E.7.1',
    subName: 'Indeks fasilitas ruang',
    order: 39,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.7.2',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.7',
    indicatorName: 'Indeks fasilitas satuan pendidikan',
    subCode: 'E.7.2',
    subName: 'Indeks sanitasi',
    order: 40,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.7.4',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.7',
    indicatorName: 'Indeks fasilitas satuan pendidikan',
    subCode: 'E.7.4',
    subName: 'Indeks fasilitas TIK',
    order: 41,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.7.5',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.7',
    indicatorName: 'Indeks fasilitas satuan pendidikan',
    subCode: 'E.7.5',
    subName: 'Indeks kelengkapan ruang',
    order: 42,
    isActive: true,
    targetScore: 4,
  },
  {
    id: 'pkks-E.7.6',
    domain: 'Manajerial',
    variableName: 'Pengelolaan Satuan Pendidikan Efektif',
    indicatorCode: 'E.7',
    indicatorName: 'Indeks fasilitas satuan pendidikan',
    subCode: 'E.7.6',
    subName: 'Indeks kelayakan ruang',
    order: 43,
    isActive: true,
    targetScore: 4,
  },
];
