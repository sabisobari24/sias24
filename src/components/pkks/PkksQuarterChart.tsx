import React, { useState, useMemo } from 'react';
import { BarChart2, Award, CheckCircle2, MessageSquareText, Calendar } from 'lucide-react';
import { PkksAssessment, PkksIndicator, PkksQuarter } from '../../types';
import {
  computePkksQuarterStats,
  getPkksPredicate,
  PKKS_QUARTER_LABELS,
  PKKS_QUARTERS,
} from '../../data/initialPkksData';

interface PkksQuarterChartProps {
  indicators: PkksIndicator[];
  assessments: PkksAssessment[];
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  showFeedbackPreview?: boolean;
}

export default function PkksQuarterChart({
  indicators,
  assessments,
  selectedYear: controlledYear,
  onYearChange,
  title = 'Capaian Kinerja Kepala Sekolah (PKKS) Per Triwulan',
  subtitle = 'Rekapitulasi nilai penilaian Pengawas Sekolah berdasarkan indikator Rapor Pendidikan Kepmendikdasmen No. 63 Tahun 2026',
  compact = false,
  showFeedbackPreview = true,
}: PkksQuarterChartProps) {
  const currentYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const set = new Set<number>([currentYear, 2026]);
    assessments.forEach((a) => {
      if (a.year && Number.isFinite(Number(a.year))) {
        set.add(Number(a.year));
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [assessments, currentYear]);

  const [internalYear, setInternalYear] = useState<number>(() => availableYears[0] || currentYear);
  const activeYear = controlledYear ?? internalYear;

  const handleYearSelect = (yr: number) => {
    setInternalYear(yr);
    if (onYearChange) onYearChange(yr);
  };

  const quarterStats = useMemo(
    () => computePkksQuarterStats(indicators, assessments, activeYear),
    [indicators, assessments, activeYear]
  );

  const [selectedQuarter, setSelectedQuarter] = useState<PkksQuarter>(() => {
    const withData = quarterStats.filter((q) => q.assessedCount > 0);
    return withData.length > 0 ? withData[withData.length - 1].quarter : 'TW 1';
  });

  const activeQuarterStat =
    quarterStats.find((q) => q.quarter === selectedQuarter) || quarterStats[0];

  const annualAvg = useMemo(() => {
    const evaluated = quarterStats.filter((q) => q.overallAvg > 0);
    if (evaluated.length === 0) return 0;
    const sum = evaluated.reduce((acc, q) => acc + q.overallAvg, 0);
    return Number((sum / evaluated.length).toFixed(1));
  }, [quarterStats]);

  const bestQuarter = useMemo(() => {
    const evaluated = quarterStats.filter((q) => q.overallAvg > 0);
    if (evaluated.length === 0) return null;
    return evaluated.reduce((best, curr) => (curr.overallAvg > best.overallAvg ? curr : best), evaluated[0]);
  }, [quarterStats]);

  const annualPredicate = getPkksPredicate(annualAvg);

  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-6 space-y-5 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              <BarChart2 className="w-3 h-3" />
              <span>Evaluasi Pengawas Sekolah</span>
            </span>
            {annualAvg > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${annualPredicate.badgeClass}`}
              >
                <Award className="w-3 h-3" />
                <span>Rata-rata {activeYear}: {annualAvg} ({annualPredicate.label})</span>
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Tahun:</span>
          </span>
          <select
            value={activeYear}
            onChange={(e) => handleYearSelect(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 cursor-pointer"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Layout: Chart on Left + Detail Card on Right */}
      <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-12' : 'xl:grid-cols-12'} gap-5 items-stretch`}>
        {/* Grouped Bar Chart Panel */}
        <div className={`${compact ? 'lg:col-span-8' : 'xl:col-span-8'} bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                <span>Capaian Keseluruhan</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block" />
                <span>Bidang Akademik</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                <span>Bidang Manajerial</span>
              </span>
            </div>
            {bestQuarter && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md tabular-nums">
                Tertinggi: {bestQuarter.quarter} ({bestQuarter.overallAvg})
              </span>
            )}
          </div>

          {/* Chart Plot Area */}
          <div className="relative pt-4 pb-2">
            {/* Horizontal grid lines */}
            <div className="relative h-52 sm:h-56 flex flex-col justify-between pointer-events-none select-none">
              {[100, 75, 50, 25, 0].map((tick) => (
                <div key={tick} className="flex items-center gap-2 w-full">
                  <span className="w-7 text-right text-[10px] font-semibold text-slate-400 tabular-nums shrink-0">
                    {tick}
                  </span>
                  <div className="flex-1 border-b border-dashed border-slate-200" />
                </div>
              ))}

              {/* Bars Overlay aligned inside grid */}
              <div className="absolute inset-0 left-9 right-1 bottom-2 top-1.5 grid grid-cols-4 gap-3 sm:gap-6 items-end pointer-events-auto">
                {quarterStats.map((stat) => {
                  const isSelected = stat.quarter === selectedQuarter;
                  const overallH = Math.max(stat.overallAvg > 0 ? 4 : 0, Math.min(100, stat.overallAvg));
                  const acadH = Math.max(stat.academicAvg > 0 ? 4 : 0, Math.min(100, stat.academicAvg));
                  const manajH = Math.max(stat.managerialAvg > 0 ? 4 : 0, Math.min(100, stat.managerialAvg));

                  return (
                    <button
                      key={stat.quarter}
                      type="button"
                      onClick={() => setSelectedQuarter(stat.quarter)}
                      className={`h-full flex flex-col justify-end items-center group cursor-pointer rounded-xl px-1.5 pt-2 transition-all ${
                        isSelected ? 'bg-indigo-50/60 ring-1 ring-indigo-200' : 'hover:bg-slate-50/80'
                      }`}
                      title={`Klik untuk rincian ${stat.quarter}`}
                    >
                      <div className="w-full h-full flex items-end justify-center gap-1.5 sm:gap-2 px-1">
                        {/* Overall Bar */}
                        <div className="flex flex-col items-center justify-end h-full flex-1 max-w-[26px]">
                          {stat.overallAvg > 0 && (
                            <span className="text-[10px] font-extrabold text-indigo-700 tabular-nums mb-1">
                              {stat.overallAvg}
                            </span>
                          )}
                          <div
                            style={{ height: `${overallH}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              stat.overallAvg > 0
                                ? isSelected
                                  ? 'bg-indigo-600 shadow-sm'
                                  : 'bg-indigo-500 group-hover:bg-indigo-600'
                                : 'bg-slate-200 h-[3px]'
                            }`}
                          />
                        </div>

                        {/* Academic Bar */}
                        <div className="flex flex-col items-center justify-end h-full flex-1 max-w-[20px]">
                          {stat.academicAvg > 0 && (
                            <span className="text-[9px] font-bold text-sky-700 tabular-nums mb-1 hidden sm:block">
                              {stat.academicAvg}
                            </span>
                          )}
                          <div
                            style={{ height: `${acadH}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              stat.academicAvg > 0 ? 'bg-sky-500' : 'bg-slate-200 h-[3px]'
                            }`}
                          />
                        </div>

                        {/* Managerial Bar */}
                        <div className="flex flex-col items-center justify-end h-full flex-1 max-w-[20px]">
                          {stat.managerialAvg > 0 && (
                            <span className="text-[9px] font-bold text-emerald-700 tabular-nums mb-1 hidden sm:block">
                              {stat.managerialAvg}
                            </span>
                          )}
                          <div
                            style={{ height: `${manajH}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              stat.managerialAvg > 0 ? 'bg-emerald-500' : 'bg-slate-200 h-[3px]'
                            }`}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Labels */}
            <div className="grid grid-cols-4 gap-3 sm:gap-6 pl-9 pr-1 mt-2">
              {quarterStats.map((stat) => {
                const isSelected = stat.quarter === selectedQuarter;
                return (
                  <button
                    key={stat.quarter}
                    type="button"
                    onClick={() => setSelectedQuarter(stat.quarter)}
                    className={`text-center py-1 rounded-lg transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-xs font-extrabold">{stat.quarter}</span>
                    <span
                      className={`block text-[10px] font-medium tabular-nums ${
                        isSelected ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {stat.assessedCount}/{stat.totalActiveCount} ind.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Quarter Summary Card */}
        <div className={`${compact ? 'lg:col-span-4' : 'xl:col-span-4'} bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Detail Periode Aktif
                </span>
                <h4 className="text-sm font-extrabold text-slate-800">
                  {PKKS_QUARTER_LABELS[activeQuarterStat.quarter]} {activeYear}
                </h4>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${activeQuarterStat.predicate.badgeClass}`}
              >
                {activeQuarterStat.predicate.label}
              </span>
            </div>

            {/* Main Score Display */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">Nilai Capaian PKKS</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums mt-0.5">
                  {activeQuarterStat.overallAvg > 0 ? activeQuarterStat.overallAvg : '—'}
                  <span className="text-xs font-semibold text-slate-400 ml-1">/ 100</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-slate-500">Kelengkapan Nilai</p>
                <p className="text-sm font-extrabold text-indigo-700 tabular-nums mt-0.5">
                  {activeQuarterStat.assessedCount} / {activeQuarterStat.totalActiveCount}
                </p>
                <p className="text-[10px] text-slate-400 tabular-nums">({activeQuarterStat.completionRate}% selesai)</p>
              </div>
            </div>

            {/* Domain Breakdown */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100">
                <span className="text-[10px] font-bold uppercase text-sky-700 block">Akademik</span>
                <span className="text-lg font-black text-sky-900 tabular-nums">
                  {activeQuarterStat.academicAvg > 0 ? activeQuarterStat.academicAvg : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Manajerial</span>
                <span className="text-lg font-black text-emerald-900 tabular-nums">
                  {activeQuarterStat.managerialAvg > 0 ? activeQuarterStat.managerialAvg : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Supervisor Feedback Preview */}
          {showFeedbackPreview && (
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Umpan Balik Pengawas</span>
                </span>
                {activeQuarterStat.assessorName && (
                  <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[140px]">
                    {activeQuarterStat.assessorName}
                  </span>
                )}
              </div>
              {activeQuarterStat.summaryFeedback ? (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 leading-relaxed line-clamp-3">
                  "{activeQuarterStat.summaryFeedback}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Belum ada catatan umpan balik tertulis untuk {activeQuarterStat.quarter} {activeYear}.
                </p>
              )}
            </div>
          )}

          {/* Quarter quick tabs inside card */}
          <div className="flex items-center justify-between gap-1 pt-1 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Standar Kepmendikdasmen 63/2026</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
