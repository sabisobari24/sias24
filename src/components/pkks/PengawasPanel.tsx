import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  Video,
  Search,
  Save,
  CheckCircle2,
  AlertTriangle,
  MessageSquareText,
  BarChart2,
  Eye,
  Award,
  X,
  UserCheck,
} from 'lucide-react';
import {
  PkksAssessment,
  PkksDomain,
  PkksEvidenceItem,
  PkksIndicator,
  PkksQuarter,
  Teacher,
} from '../../types';
import {
  computePkksQuarterStats,
  getPkksPredicate,
  INITIAL_PKKS_INDICATORS,
  PKKS_QUARTER_LABELS,
  PKKS_QUARTERS,
} from '../../data/initialPkksData';
import PkksMediaPreviewModal from './PkksMediaPreviewModal';
import PkksQuarterChart from './PkksQuarterChart';

interface PengawasPanelProps {
  activeTabOverride?: 'penilaian' | 'grafik' | 'umpan-balik';
  onTabChange?: (tab: 'penilaian' | 'grafik' | 'umpan-balik') => void;
  teacher: Teacher;
  headmasterName: string;
  indicators: PkksIndicator[];
  evidences: PkksEvidenceItem[];
  assessments: PkksAssessment[];
  onSaveAssessment: (item: PkksAssessment) => Promise<void>;
  onSaveAssessmentsBatch: (items: PkksAssessment[]) => Promise<void>;
}

export default function PengawasPanel({
  activeTabOverride,
  onTabChange,
  teacher,
  headmasterName,
  indicators,
  evidences,
  assessments,
  onSaveAssessment,
  onSaveAssessmentsBatch,
}: PengawasPanelProps) {
  const effectiveIndicators = useMemo(() => {
    const base = indicators.length > 0 ? indicators : INITIAL_PKKS_INDICATORS;
    return base
      .filter((i) => i.isActive !== false)
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [indicators]);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => (currentYear >= 2026 ? currentYear : 2026));
  const [selectedQuarter, setSelectedQuarter] = useState<PkksQuarter>('TW 1');
  const [internalTab, setInternalTab] = useState<'penilaian' | 'grafik' | 'umpan-balik'>('penilaian');
  const activeTab = activeTabOverride || internalTab;
  const setActiveTab = (tab: 'penilaian' | 'grafik' | 'umpan-balik') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [domainFilter, setDomainFilter] = useState<'Semua' | PkksDomain>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Ada Bukti' | 'Belum Dinilai' | 'Sudah Dinilai'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Draft scores & feedback per subIndicatorId
  const [draftScores, setDraftScores] = useState<Record<string, { score: string; feedback: string }>>({});
  const [summaryFeedback, setSummaryFeedback] = useState('');
  const [summaryRecommendation, setSummaryRecommendation] = useState('');

  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState<PkksEvidenceItem | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Sync draft state whenever period or remote assessments change
  useEffect(() => {
    const nextDrafts: Record<string, { score: string; feedback: string }> = {};
    effectiveIndicators.forEach((ind) => {
      const existing = assessments.find(
        (a) =>
          a.year === selectedYear &&
          a.quarter === selectedQuarter &&
          a.recordType !== 'summary' &&
          (a.subIndicatorId === ind.id || a.subCode === ind.subCode)
      );
      nextDrafts[ind.id] = {
        score: existing && typeof existing.score === 'number' && existing.score > 0 ? String(existing.score) : '',
        feedback: existing?.feedback || '',
      };
    });
    setDraftScores(nextDrafts);

    const summaryDoc = assessments.find(
      (a) => a.year === selectedYear && a.quarter === selectedQuarter && a.recordType === 'summary'
    );
    setSummaryFeedback(summaryDoc?.feedback || '');
    setSummaryRecommendation(summaryDoc?.recommendation || '');
  }, [assessments, effectiveIndicators, selectedYear, selectedQuarter]);

  const evidenceMap = useMemo(() => {
    const map = new Map<string, PkksEvidenceItem[]>();
    evidences
      .filter((ev) => ev.year === selectedYear && ev.quarter === selectedQuarter)
      .forEach((ev) => {
        const key = ev.subIndicatorId || ev.subCode;
        const list = map.get(key) || [];
        list.push(ev);
        map.set(key, list);
      });
    return map;
  }, [evidences, selectedYear, selectedQuarter]);

  const quarterStats = useMemo(
    () => computePkksQuarterStats(effectiveIndicators, assessments, selectedYear),
    [effectiveIndicators, assessments, selectedYear]
  );

  const activeStat = quarterStats.find((q) => q.quarter === selectedQuarter) || quarterStats[0];

  const filteredIndicators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return effectiveIndicators.filter((ind) => {
      if (domainFilter !== 'Semua' && ind.domain !== domainFilter) return false;
      const items = evidenceMap.get(ind.id) || evidenceMap.get(ind.subCode) || [];
      const draftVal = Number(draftScores[ind.id]?.score || 0);
      if (statusFilter === 'Ada Bukti' && items.length === 0) return false;
      if (statusFilter === 'Belum Dinilai' && draftVal > 0) return false;
      if (statusFilter === 'Sudah Dinilai' && draftVal <= 0) return false;

      if (!q) return true;
      return (
        ind.subCode.toLowerCase().includes(q) ||
        ind.subName.toLowerCase().includes(q) ||
        ind.indicatorCode.toLowerCase().includes(q) ||
        ind.indicatorName.toLowerCase().includes(q) ||
        ind.variableName.toLowerCase().includes(q)
      );
    });
  }, [effectiveIndicators, domainFilter, statusFilter, searchQuery, evidenceMap, draftScores]);

  const buildAssessmentPayload = (ind: PkksIndicator, scoreNum: number, feedbackText: string): PkksAssessment => {
    const safeScore = Math.max(0, Math.min(100, Math.round(scoreNum)));
    return {
      id: `pkks-score-${selectedYear}-${selectedQuarter.replace(/\s+/g, '')}-${ind.subCode}`,
      recordType: 'score',
      year: selectedYear,
      quarter: selectedQuarter,
      subIndicatorId: ind.id,
      subCode: ind.subCode,
      score: safeScore,
      predicate: getPkksPredicate(safeScore).label,
      feedback: feedbackText.trim(),
      principalName: headmasterName,
      assessorId: teacher.id,
      assessorName: teacher.name,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSaveSingle = async (ind: PkksIndicator) => {
    const draft = draftScores[ind.id] || { score: '', feedback: '' };
    const num = Number(draft.score);
    if (!draft.score || Number.isNaN(num) || num < 1 || num > 100) {
      showToast('error', `Masukkan nilai antara 1–100 untuk indikator ${ind.subCode}.`);
      return;
    }

    setSavingId(ind.id);
    try {
      await onSaveAssessment(buildAssessmentPayload(ind, num, draft.feedback));
      showToast('success', `Nilai & masukan ${ind.subCode} (${selectedQuarter}) berhasil disimpan!`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan penilaian.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAllDrafts = async () => {
    const itemsToSave: PkksAssessment[] = [];
    effectiveIndicators.forEach((ind) => {
      const draft = draftScores[ind.id];
      if (!draft || !draft.score) return;
      const num = Number(draft.score);
      if (!Number.isNaN(num) && num >= 1 && num <= 100) {
        itemsToSave.push(buildAssessmentPayload(ind, num, draft.feedback));
      }
    });

    if (itemsToSave.length === 0) {
      showToast('error', 'Belum ada nilai (1–100) yang diisi untuk disimpan.');
      return;
    }

    setIsSavingAll(true);
    try {
      await onSaveAssessmentsBatch(itemsToSave);
      showToast('success', `${itemsToSave.length} penilaian PKKS (${selectedQuarter} ${selectedYear}) berhasil disimpan ke database!`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan seluruh penilaian.');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleSaveSummaryFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summaryFeedback.trim()) {
      showToast('error', 'Mohon isi catatan umpan balik umum sebelum menyimpan.');
      return;
    }

    setIsSavingSummary(true);
    try {
      const summaryDoc: PkksAssessment = {
        id: `pkks-summary-${selectedYear}-${selectedQuarter.replace(/\s+/g, '')}`,
        recordType: 'summary',
        year: selectedYear,
        quarter: selectedQuarter,
        feedback: summaryFeedback.trim(),
        recommendation: summaryRecommendation.trim(),
        principalName: headmasterName,
        assessorId: teacher.id,
        assessorName: teacher.name,
        updatedAt: new Date().toISOString(),
      };
      await onSaveAssessment(summaryDoc);
      showToast('success', `Umpan balik & rekomendasi ${selectedQuarter} (${selectedYear}) berhasil dikirim ke Kepala Sekolah & Admin!`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan umpan balik umum.');
    } finally {
      setIsSavingSummary(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Supervision Hero */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-400 text-slate-950">
              Portal Pengawas Sekolah
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-sky-100">
              PKKS Kepmendikdasmen No. 63/2026
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Penilaian Kinerja Kepala Sekolah (PKKS)
          </h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-sky-100">
            <span className="inline-flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-sky-300" />
              <span>Pengawas: <strong className="text-white">{teacher.name}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>Kepala Sekolah Dinilai: <strong className="text-white">{headmasterName}</strong></span>
            </span>
          </div>
        </div>

        {/* Period Picker */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white/10 border border-white/15 p-3 rounded-2xl shrink-0">
          <div>
            <label className="text-[10px] font-bold uppercase text-sky-200 block mb-0.5">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-slate-900 rounded-xl px-3 py-1.5 text-xs font-extrabold cursor-pointer focus:outline-none"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-sky-200 block mb-0.5">Triwulan Aktif</label>
            <div className="flex items-center gap-1 bg-slate-950/35 p-1 rounded-xl">
              {PKKS_QUARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSelectedQuarter(q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedQuarter === q
                      ? 'bg-white text-sky-900 shadow-xs'
                      : 'text-sky-100 hover:bg-white/10'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-2.5 text-xs sm:text-sm font-bold ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Rata-Rata {selectedQuarter}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {activeStat.overallAvg > 0 ? activeStat.overallAvg : '—'}
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${activeStat.predicate.badgeClass}`}>
              {activeStat.predicate.label}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Skor Akademik</span>
          <p className="text-2xl sm:text-3xl font-black text-sky-700 tabular-nums mt-1">
            {activeStat.academicAvg > 0 ? activeStat.academicAvg : '—'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Skor Manajerial</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums mt-1">
            {activeStat.managerialAvg > 0 ? activeStat.managerialAvg : '—'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Indikator Dinilai</span>
          <p className="text-2xl sm:text-3xl font-black text-indigo-700 tabular-nums mt-1">
            {activeStat.assessedCount}
            <span className="text-sm font-bold text-slate-400">/{activeStat.totalActiveCount}</span>
          </p>
        </div>
      </div>

      {/* Tabs + Bulk Save */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'penilaian', label: 'Penilaian & Bukti Dukung', icon: ClipboardCheck },
            { id: 'umpan-balik', label: 'Umpan Balik & Rekomendasi TW', icon: MessageSquareText },
            { id: 'grafik', label: 'Grafik Capaian Tiap TW', icon: BarChart2 },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  active ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'penilaian' && (
          <button
            type="button"
            onClick={handleSaveAllDrafts}
            disabled={isSavingAll}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingAll ? 'Menyimpan...' : `Simpan Semua Nilai (${selectedQuarter})`}</span>
          </button>
        )}
      </div>

      {/* TAB 1: PENILAIAN & BUKTI DUKUNG */}
      {activeTab === 'penilaian' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(['Semua', 'Akademik', 'Manajerial'] as const).map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setDomainFilter(dom)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    domainFilter === dom
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {dom === 'Semua' ? 'Semua Bidang' : dom}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Ada Bukti">Sudah Ada Bukti Dukung Admin</option>
              <option value="Belum Dinilai">Belum Dinilai</option>
              <option value="Sudah Dinilai">Sudah Dinilai</option>
            </select>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode sub-indikator atau uraian..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Indicator Cards */}
          {filteredIndicators.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
              Tidak ada indikator penilaian yang cocok dengan filter yang dipilih.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIndicators.map((ind) => {
                const items = evidenceMap.get(ind.id) || evidenceMap.get(ind.subCode) || [];
                const draft = draftScores[ind.id] || { score: '', feedback: '' };
                const numScore = Number(draft.score || 0);
                const pred = getPkksPredicate(numScore);
                const savedAssessment = assessments.find(
                  (a) =>
                    a.year === selectedYear &&
                    a.quarter === selectedQuarter &&
                    a.recordType !== 'summary' &&
                    (a.subIndicatorId === ind.id || a.subCode === ind.subCode)
                );

                return (
                  <div
                    key={ind.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 hover:border-sky-300 transition-colors"
                  >
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                      {/* Left: Indicator Info + Admin Uploaded Evidences */}
                      <div className="xl:col-span-7 space-y-3 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                              ind.domain === 'Akademik'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {ind.domain}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {ind.variableName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-900 text-white font-mono">
                            {ind.subCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {ind.indicatorCode}: {ind.indicatorName}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {ind.subName}
                        </h4>

                        {/* Dokumen Pendukung Box */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>Dokumen / Bukti Pendukung dari Admin ({selectedQuarter})</span>
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 tabular-nums text-slate-700">
                              {items.length} Berkas
                            </span>
                          </div>

                          {items.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">
                              Belum ada dokumen/gambar/video pendukung diunggah Admin untuk sub-indikator ini.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {items.map((ev) => (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={() => setPreviewEvidence(ev)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-xs font-semibold text-slate-700 hover:text-sky-800 shadow-2xs cursor-pointer transition-all"
                                >
                                  {ev.type === 'dokumen' && <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                  {ev.type === 'gambar' && <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                  {ev.type === 'video' && <Video className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                  <span className="truncate max-w-[200px]">{ev.title}</span>
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Scoring & Feedback Input */}
                      <div className="xl:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-extrabold uppercase text-slate-600">
                            Skor Penilaian (1–100)
                          </label>
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${pred.badgeClass}`}>
                            {pred.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={draft.score}
                            onChange={(e) =>
                              setDraftScores((prev) => ({
                                ...prev,
                                [ind.id]: { ...(prev[ind.id] || { feedback: '' }), score: e.target.value },
                              }))
                            }
                            placeholder="0 - 100"
                            className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-white font-black text-base text-slate-900 text-center tabular-nums focus:outline-none focus:border-sky-500"
                          />

                          {/* Quick score preset chips */}
                          <div className="flex flex-wrap gap-1 flex-1">
                            {[95, 88, 78, 65].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() =>
                                  setDraftScores((prev) => ({
                                    ...prev,
                                    [ind.id]: { ...(prev[ind.id] || { feedback: '' }), score: String(preset) },
                                  }))
                                }
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors tabular-nums ${
                                  Number(draft.score) === preset
                                    ? 'bg-sky-600 text-white border-sky-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                            Masukan &amp; Umpan Balik Sub-Indikator
                          </label>
                          <textarea
                            rows={2}
                            value={draft.feedback}
                            onChange={(e) =>
                              setDraftScores((prev) => ({
                                ...prev,
                                [ind.id]: { ...(prev[ind.id] || { score: '' }), feedback: e.target.value },
                              }))
                            }
                            placeholder="Tuliskan catatan temuan, apresiasi, atau saran perbaikan..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] text-slate-400">
                            {savedAssessment?.updatedAt
                              ? `Tersimpan ${new Date(savedAssessment.updatedAt).toLocaleDateString('id-ID')}`
                              : 'Belum disimpan'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSaveSingle(ind)}
                            disabled={savingId === ind.id}
                            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savingId === ind.id ? 'Menyimpan...' : 'Simpan Nilai'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UMPAN BALIK & REKOMENDASI UMUM TRIWULAN */}
      {activeTab === 'umpan-balik' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5 max-w-4xl">
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
              {PKKS_QUARTER_LABELS[selectedQuarter]} &bull; {selectedYear}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">
              Masukan, Umpan Balik &amp; Rekomendasi Pengawas Sekolah
            </h3>
            <p className="text-xs text-slate-500">
              Catatan ini akan tampil di dashboard Admin (Kelola PKKS) dan ringkasan capaian Beranda untuk ditindaklanjuti oleh Kepala Sekolah ({headmasterName}).
            </p>
          </div>

          <form onSubmit={handleSaveSummaryFeedback} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Umpan Balik &amp; Evaluasi Umum Kinerja Kepala Sekolah ({selectedQuarter} {selectedYear}) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={summaryFeedback}
                onChange={(e) => setSummaryFeedback(e.target.value)}
                placeholder="Tuliskan apresiasi capaian, hasil verifikasi dokumen pendukung, dan hal-hal kunci dari supervisi PKKS pada triwulan ini..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Rekomendasi &amp; Rencana Tindak Lanjut Triwulan Berikutnya
              </label>
              <textarea
                rows={3}
                value={summaryRecommendation}
                onChange={(e) => setSummaryRecommendation(e.target.value)}
                placeholder="Contoh: Tingkatkan pendampingan refleksi guru pada indikator D.3.3 serta lengkapi arsip digital ARKAS pada TW berikutnya..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500 text-slate-800"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingSummary}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSummary ? 'Menyimpan...' : `Simpan Umpan Balik ${selectedQuarter}`}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: GRAFIK CAPAIAN TIAP TW */}
      {activeTab === 'grafik' && (
        <PkksQuarterChart
          indicators={effectiveIndicators}
          assessments={assessments}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      )}

      <PkksMediaPreviewModal item={previewEvidence} onClose={() => setPreviewEvidence(null)} />
    </div>
  );
}
