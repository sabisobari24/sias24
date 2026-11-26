import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  Edit3,
  Search,
  Upload,
  Link as LinkIcon,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  MessageSquareText,
  BarChart2,
  X,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PkksAssessment,
  PkksDomain,
  PkksEvidenceItem,
  PkksEvidenceType,
  PkksIndicator,
  PkksQuarter,
} from '../../types';
import {
  computePkksQuarterStats,
  getPkksPredicate,
  INITIAL_PKKS_INDICATORS,
  normalizePkksScore,
  PKKS_QUARTER_LABELS,
  PKKS_QUARTERS,
  PKKS_SCORE_CRITERIA,
} from '../../data/initialPkksData';
import { fileToBase64, convertGoogleDriveLink, getHighResMediaUrl } from '../../utils/imageHelper';
import PkksMediaPreviewModal, { getYouTubeThumbnailUrl } from './PkksMediaPreviewModal';
import PkksQuarterChart from './PkksQuarterChart';

interface AdminPkksPanelProps {
  indicators: PkksIndicator[];
  evidences: PkksEvidenceItem[];
  assessments: PkksAssessment[];
  adminName: string;
  headmasterName: string;
  onSaveIndicator: (ind: PkksIndicator) => Promise<void>;
  onDeleteIndicator: (id: string) => Promise<void>;
  onResetDefaultIndicators: () => Promise<void>;
  onSaveEvidence: (ev: PkksEvidenceItem) => Promise<void>;
  onDeleteEvidence: (id: string) => Promise<void>;
  initialSubTab?: 'bukti-dukung' | 'preview' | 'indikator' | 'rekap';
}

export default function AdminPkksPanel({
  indicators,
  evidences,
  assessments,
  adminName,
  headmasterName,
  onSaveIndicator,
  onDeleteIndicator,
  onResetDefaultIndicators,
  onSaveEvidence,
  onDeleteEvidence,
  initialSubTab,
}: AdminPkksPanelProps) {
  const effectiveIndicators = indicators.length > 0 ? indicators : INITIAL_PKKS_INDICATORS;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => (currentYear >= 2026 ? currentYear : 2026));
  const [selectedQuarter, setSelectedQuarter] = useState<PkksQuarter>('TW 1');
  const [subTab, setSubTab] = useState<'bukti-dukung' | 'preview' | 'indikator' | 'rekap'>(initialSubTab || 'bukti-dukung');
  const [domainFilter, setDomainFilter] = useState<'Semua' | PkksDomain>('Semua');
  const [variableFilter, setVariableFilter] = useState<string>('Semua');
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<'Semua' | 'Ada Bukti' | 'Belum Ada Bukti'>('Semua');
  const [previewTypeFilter, setPreviewTypeFilter] = useState<'Semua' | PkksEvidenceType>('Semua');
  const [previewPeriodScope, setPreviewPeriodScope] = useState<'triwulan' | 'semua_triwulan'>('triwulan');
  const [searchQuery, setSearchQuery] = useState('');

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewEvidence, setPreviewEvidence] = useState<PkksEvidenceItem | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Evidence Upload Modal States
  const [evidenceModalIndicator, setEvidenceModalIndicator] = useState<PkksIndicator | null>(null);
  const [evType, setEvType] = useState<PkksEvidenceType>('dokumen');
  const [evTitle, setEvTitle] = useState('');
  const [evUrl, setEvUrl] = useState('');
  const [evFileName, setEvFileName] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Indicator Add/Edit Modal States
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [indForm, setIndForm] = useState<Omit<PkksIndicator, 'id'>>({
    domain: 'Akademik',
    variableName: 'Kualitas Pembelajaran',
    indicatorCode: 'D.1',
    indicatorName: '',
    subCode: '',
    subName: '',
    order: effectiveIndicators.length + 1,
    isActive: true,
    targetScore: 4,
  });
  const [isSavingIndicator, setIsSavingIndicator] = useState(false);
  const [isResettingDefaults, setIsResettingDefaults] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const sortedIndicators = useMemo(() => {
    return [...effectiveIndicators].sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [effectiveIndicators]);

  const variables = useMemo(() => {
    const set = new Set<string>();
    sortedIndicators.forEach((ind) => {
      if (domainFilter === 'Semua' || ind.domain === domainFilter) {
        set.add(ind.variableName);
      }
    });
    return ['Semua', ...Array.from(set)];
  }, [sortedIndicators, domainFilter]);

  const filteredIndicators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sortedIndicators.filter((ind) => {
      if (subTab !== 'indikator' && ind.isActive === false) return false;
      if (domainFilter !== 'Semua' && ind.domain !== domainFilter) return false;
      if (variableFilter !== 'Semua' && ind.variableName !== variableFilter) return false;
      if (!q) return true;
      return (
        ind.subCode.toLowerCase().includes(q) ||
        ind.subName.toLowerCase().includes(q) ||
        ind.indicatorCode.toLowerCase().includes(q) ||
        ind.indicatorName.toLowerCase().includes(q) ||
        ind.variableName.toLowerCase().includes(q)
      );
    });
  }, [sortedIndicators, subTab, domainFilter, variableFilter, searchQuery]);

  const quarterStats = useMemo(
    () => computePkksQuarterStats(sortedIndicators, assessments, selectedYear),
    [sortedIndicators, assessments, selectedYear]
  );

  const activeStat = quarterStats.find((q) => q.quarter === selectedQuarter) || quarterStats[0];

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

  const indicatorByKey = useMemo(() => {
    const map = new Map<string, PkksIndicator>();
    sortedIndicators.forEach((ind) => {
      map.set(ind.id, ind);
      map.set(ind.subCode, ind);
    });
    return map;
  }, [sortedIndicators]);

  const displayedIndicators = useMemo(() => {
    if (subTab !== 'bukti-dukung' || evidenceStatusFilter === 'Semua') return filteredIndicators;
    return filteredIndicators.filter((ind) => {
      const items = evidenceMap.get(ind.id) || evidenceMap.get(ind.subCode) || [];
      return evidenceStatusFilter === 'Ada Bukti' ? items.length > 0 : items.length === 0;
    });
  }, [filteredIndicators, subTab, evidenceStatusFilter, evidenceMap]);

  const filteredPreviewEvidences = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return evidences
      .filter((ev) => {
        if (ev.year !== selectedYear) return false;
        if (previewPeriodScope === 'triwulan' && ev.quarter !== selectedQuarter) return false;
        if (previewTypeFilter !== 'Semua' && ev.type !== previewTypeFilter) return false;
        const ind = indicatorByKey.get(ev.subIndicatorId) || indicatorByKey.get(ev.subCode);
        if (domainFilter !== 'Semua' && ind && ind.domain !== domainFilter) return false;
        if (variableFilter !== 'Semua' && ind && ind.variableName !== variableFilter) return false;
        if (!q) return true;
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.subCode.toLowerCase().includes(q) ||
          (ev.description || '').toLowerCase().includes(q) ||
          (ev.fileName || '').toLowerCase().includes(q) ||
          (ind?.subName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
  }, [
    evidences,
    selectedYear,
    selectedQuarter,
    previewPeriodScope,
    previewTypeFilter,
    domainFilter,
    variableFilter,
    searchQuery,
    indicatorByKey,
  ]);

  const assessmentMap = useMemo(() => {
    const map = new Map<string, PkksAssessment>();
    assessments
      .filter((a) => a.year === selectedYear && a.quarter === selectedQuarter && a.recordType !== 'summary')
      .forEach((a) => {
        if (a.subIndicatorId) map.set(a.subIndicatorId, a);
        if (a.subCode) map.set(a.subCode, a);
      });
    return map;
  }, [assessments, selectedYear, selectedQuarter]);

  const totalEvidencesThisQuarter = useMemo(
    () => evidences.filter((ev) => ev.year === selectedYear && ev.quarter === selectedQuarter).length,
    [evidences, selectedYear, selectedQuarter]
  );

  const totalEvidencesThisYear = useMemo(
    () => evidences.filter((ev) => ev.year === selectedYear).length,
    [evidences, selectedYear]
  );

  const openEvidenceModal = (ind: PkksIndicator, defaultType: PkksEvidenceType = 'dokumen') => {
    setEvidenceModalIndicator(ind);
    setEvType(defaultType);
    setEvTitle('');
    setEvUrl('');
    setEvFileName('');
    setEvDescription('');
  };

  const handleEvidenceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    try {
      if (evType === 'gambar') {
        if (!file.type.startsWith('image/')) {
          showToast('error', 'Harap pilih file gambar (PNG, JPG, WEBP).');
          return;
        }
        const b64 = await fileToBase64(file, 1440, 1440, 0.91);
        setEvUrl(b64);
        setEvFileName(file.name);
        if (!evTitle) setEvTitle(file.name.replace(/\.[^.]+$/, ''));
        showToast('success', 'Gambar bukti dukung siap disimpan.');
      } else if (evType === 'dokumen') {
        if (file.size > 2.5 * 1024 * 1024) {
          showToast(
            'error',
            'Ukuran file dokumen melebihi 2,5 MB. Gunakan tautan Google Drive agar database tetap ringan dan cepat.'
          );
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setEvUrl(String(reader.result || ''));
          setEvFileName(file.name);
          if (!evTitle) setEvTitle(file.name.replace(/\.[^.]+$/, ''));
          showToast('success', `Dokumen "${file.name}" berhasil dimuat.`);
        };
        reader.readAsDataURL(file);
      } else if (evType === 'video') {
        if (file.size > 3 * 1024 * 1024) {
          showToast(
            'error',
            'Ukuran video langsung maksimal 3 MB. Untuk video berdurasi panjang, tempelkan tautan YouTube atau Google Drive.'
          );
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setEvUrl(String(reader.result || ''));
          setEvFileName(file.name);
          if (!evTitle) setEvTitle(file.name.replace(/\.[^.]+$/, ''));
          showToast('success', `Video "${file.name}" berhasil dimuat.`);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal membaca file.');
    } finally {
      setIsProcessingFile(false);
      try {
        e.target.value = '';
      } catch {
        /* ignore */
      }
    }
  };

  const handleSaveEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceModalIndicator) return;
    if (!evTitle.trim()) {
      showToast('error', 'Judul bukti dukung wajib diisi.');
      return;
    }
    if (!evUrl.trim()) {
      showToast('error', 'Harap unggah file atau masukkan tautan bukti dukung.');
      return;
    }

    setIsSavingEvidence(true);
    try {
      const normalizedUrl =
        evType === 'gambar' ? convertGoogleDriveLink(evUrl.trim()) : evUrl.trim();
      const newEv: PkksEvidenceItem = {
        id: `pkks-ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        subIndicatorId: evidenceModalIndicator.id,
        subCode: evidenceModalIndicator.subCode,
        year: selectedYear,
        quarter: selectedQuarter,
        title: evTitle.trim(),
        type: evType,
        url: normalizedUrl,
        fileName: evFileName || undefined,
        description: evDescription.trim() || undefined,
        uploadedBy: adminName || 'Administrator',
        uploadedAt: new Date().toISOString(),
      };
      await onSaveEvidence(newEv);
      setEvidenceModalIndicator(null);
      showToast('success', `Bukti dukung ${evidenceModalIndicator.subCode} (${selectedQuarter}) berhasil disimpan!`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan bukti dukung ke Supabase.');
    } finally {
      setIsSavingEvidence(false);
    }
  };

  const openAddIndicatorModal = () => {
    setEditingIndicatorId(null);
    setIndForm({
      domain: 'Akademik',
      variableName: 'Kualitas Pembelajaran',
      indicatorCode: 'D.1',
      indicatorName: '',
      subCode: '',
      subName: '',
      order: sortedIndicators.length + 1,
      isActive: true,
      targetScore: 4,
    });
    setIsIndicatorModalOpen(true);
  };

  const openEditIndicatorModal = (ind: PkksIndicator) => {
    setEditingIndicatorId(ind.id);
    setIndForm({
      domain: ind.domain,
      variableName: ind.variableName,
      indicatorCode: ind.indicatorCode,
      indicatorName: ind.indicatorName,
      subCode: ind.subCode,
      subName: ind.subName,
      order: ind.order,
      isActive: ind.isActive !== false,
      targetScore: ind.targetScore && ind.targetScore <= 4 ? ind.targetScore : 4,
    });
    setIsIndicatorModalOpen(true);
  };

  const handleSaveIndicatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indForm.subCode.trim() || !indForm.subName.trim() || !indForm.indicatorCode.trim()) {
      showToast('error', 'Kode Indikator, Kode Sub, dan Uraian Sub-Indikator wajib diisi.');
      return;
    }
    setIsSavingIndicator(true);
    try {
      const id = editingIndicatorId || `pkks-${indForm.subCode.trim()}-${Date.now().toString(36)}`;
      await onSaveIndicator({
        id,
        domain: indForm.domain,
        variableName: indForm.variableName.trim(),
        indicatorCode: indForm.indicatorCode.trim(),
        indicatorName: indForm.indicatorName.trim() || indForm.variableName.trim(),
        subCode: indForm.subCode.trim(),
        subName: indForm.subName.trim(),
        order: Number(indForm.order) || 1,
        isActive: indForm.isActive,
        targetScore: Math.max(1, Math.min(4, Number(indForm.targetScore) || 4)),
      });
      setIsIndicatorModalOpen(false);
      showToast('success', editingIndicatorId ? 'Indikator EKKS berhasil diperbarui.' : 'Sub-Indikator EKKS baru berhasil ditambahkan.');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyimpan indikator EKKS.');
    } finally {
      setIsSavingIndicator(false);
    }
  };

  const handleSyncDefaultIndicators = async () => {
    setIsResettingDefaults(true);
    try {
      await onResetDefaultIndicators();
      showToast('success', '43 Sub-Indikator standar Kepmendikdasmen No. 63 Tahun 2026 berhasil disinkronkan!');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menyinkronkan standar indikator.');
    } finally {
      setIsResettingDefaults(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Institutional Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-800 rounded-3xl p-5 sm:p-7 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
              Kelola EKKS
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/15 text-indigo-100">
              Kepmendikdasmen No. 63 Tahun 2026
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Manajemen Evaluasi Kinerja Kepala Sekolah (EKKS)
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
            Atur indikator penilaian, unggah bukti dukung (Dokumen, Gambar, Video) per Triwulan untuk Kepala Sekolah{' '}
            <strong className="text-white">{headmasterName}</strong>, dan pantau hasil evaluasi Pengawas Sekolah.
          </p>
        </div>

        {/* Period Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white/10 backdrop-blur-xs border border-white/15 p-3 rounded-2xl shrink-0">
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold uppercase text-indigo-200 block">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-slate-900 rounded-xl px-3 py-1.5 text-xs font-extrabold focus:outline-none cursor-pointer"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold uppercase text-indigo-200 block">Periode Triwulan</label>
            <div className="flex items-center gap-1 bg-slate-950/30 p-1 rounded-xl">
              {PKKS_QUARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSelectedQuarter(q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedQuarter === q
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-indigo-100 hover:bg-white/10'
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

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Indikator Aktif</span>
            <p className="text-2xl font-black text-slate-800 tabular-nums mt-0.5">
              {sortedIndicators.filter((i) => i.isActive !== false).length}
            </p>
            <span className="text-[11px] text-slate-500">Akademik &amp; Manajerial</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Bukti Dukung ({selectedQuarter})</span>
            <p className="text-2xl font-black text-slate-800 tabular-nums mt-0.5">{totalEvidencesThisQuarter}</p>
            <button
              type="button"
              onClick={() => setSubTab('preview')}
              className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>Preview Semua ({totalEvidencesThisYear} thn {selectedYear})</span>
            </button>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Nilai Capaian ({selectedQuarter})</span>
            <p className="text-2xl font-black text-slate-800 tabular-nums mt-0.5">
              {activeStat.overallAvg > 0 ? activeStat.overallAvg : '—'}
              {activeStat.overallAvg > 0 && <span className="text-xs font-bold text-slate-400 ml-0.5">/4</span>}
            </p>
            <span className={`text-[11px] font-bold ${activeStat.predicate.textClass}`}>
              {activeStat.predicate.label}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Progress Penilaian</span>
            <p className="text-2xl font-black text-slate-800 tabular-nums mt-0.5">
              {activeStat.assessedCount}/{activeStat.totalActiveCount}
            </p>
            <span className="text-[11px] text-slate-500 tabular-nums">{activeStat.completionRate}% terisi pengawas</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <MessageSquareText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'bukti-dukung', label: '1. Upload Bukti Dukung & Monitoring', icon: Upload },
            { id: 'preview', label: `2. Preview Bukti Dukung (${totalEvidencesThisQuarter})`, icon: Eye },
            { id: 'indikator', label: '3. Pengaturan Indikator Penilaian', icon: SlidersHorizontal },
            { id: 'rekap', label: '4. Grafik Capaian & Umpan Balik Pengawas', icon: BarChart2 },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {subTab === 'indikator' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncDefaultIndicators}
              disabled={isResettingDefaults}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResettingDefaults ? 'animate-spin' : ''}`} />
              <span>Muat Standar Kepmendikdasmen 63/2026</span>
            </button>
            <button
              type="button"
              onClick={openAddIndicatorModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sub-Indikator</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters Toolbar (shown on Bukti Dukung, Preview & Indikator tabs) */}
      {subTab !== 'rekap' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {(['Semua', 'Akademik', 'Manajerial'] as const).map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => {
                  setDomainFilter(dom);
                  setVariableFilter('Semua');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  domainFilter === dom
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dom === 'Semua' ? 'Semua Bidang' : `Bidang ${dom}`}
              </button>
            ))}
          </div>

          <select
            value={variableFilter}
            onChange={(e) => setVariableFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {variables.map((v) => (
              <option key={v} value={v}>
                {v === 'Semua' ? 'Semua Variabel' : v}
              </option>
            ))}
          </select>

          {subTab === 'bukti-dukung' && (
            <select
              value={evidenceStatusFilter}
              onChange={(e) => setEvidenceStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Semua">Semua Status Bukti</option>
              <option value="Ada Bukti">Sudah Ada Bukti Dukung</option>
              <option value="Belum Ada Bukti">Belum Ada Bukti Dukung</option>
            </select>
          )}

          {subTab === 'preview' && (
            <>
              <select
                value={previewTypeFilter}
                onChange={(e) => setPreviewTypeFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Semua">Semua Format</option>
                <option value="dokumen">Dokumen (PDF/Link)</option>
                <option value="gambar">Gambar / Foto</option>
                <option value="video">Video / YouTube</option>
              </select>

              <select
                value={previewPeriodScope}
                onChange={(e) => setPreviewPeriodScope(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="triwulan">Hanya {selectedQuarter} ({selectedYear})</option>
                <option value="semua_triwulan">Semua Triwulan ({selectedYear})</option>
              </select>
            </>
          )}

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                subTab === 'preview'
                  ? 'Cari judul berkas, kode sub-indikator, atau catatan...'
                  : 'Cari kode (D.1.1, D.4.3, E.3.2) atau uraian indikator...'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
      )}

      {/* TAB 1: UPLOAD BUKTI DUKUNG & MONITORING */}
      {subTab === 'bukti-dukung' && (
        <div className="space-y-3">
          {displayedIndicators.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
              Tidak ada indikator aktif yang sesuai dengan filter pencarian.
            </div>
          ) : (
            displayedIndicators.map((ind) => {
              const items = evidenceMap.get(ind.id) || evidenceMap.get(ind.subCode) || [];
              const scoreObj = assessmentMap.get(ind.id) || assessmentMap.get(ind.subCode);
              const scoreVal = normalizePkksScore(scoreObj?.score || 0);
              const pred = getPkksPredicate(scoreVal);

              return (
                <div
                  key={ind.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-indigo-300 transition-all space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
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
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-indigo-600 text-white font-mono">
                          {ind.subCode}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          ({ind.indicatorCode} — {ind.indicatorName})
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 leading-snug">{ind.subName}</h4>

                      {scoreObj?.feedback && (
                        <div className="mt-2 bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2 text-xs text-amber-950 flex items-start gap-2">
                          <MessageSquareText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Masukan Pengawas ({scoreObj.assessorName}): </span>
                            <span>{scoreObj.feedback}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Score & Quick Upload Action */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                      <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[110px]">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Nilai {selectedQuarter}
                        </span>
                        <span className="text-lg font-black text-slate-800 tabular-nums">
                          {scoreVal > 0 ? scoreVal : '—'}
                          {scoreVal > 0 && <span className="text-xs font-bold text-slate-400 ml-0.5">/4</span>}
                        </span>
                        <span
                          className={`block text-[10px] font-bold mt-0.5 px-1.5 py-0.2 rounded border ${pred.badgeClass}`}
                        >
                          {pred.label}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEvidenceModal(ind, 'dokumen')}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Upload Bukti Dukung</span>
                        </button>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEvidenceModal(ind, 'dokumen')}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 cursor-pointer"
                            title="Upload Dokumen"
                          >
                            + Dok
                          </button>
                          <button
                            type="button"
                            onClick={() => openEvidenceModal(ind, 'gambar')}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 cursor-pointer"
                            title="Upload Gambar"
                          >
                            + Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => openEvidenceModal(ind, 'video')}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer"
                            title="Upload Video"
                          >
                            + Video
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Evidences List for this Sub-Indicator */}
                  {items.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Bukti Dukung Terunggah ({items.length} berkas):</span>
                        <span className="text-indigo-600">Klik tombol Preview untuk membuka dokumen/media</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((ev) => (
                          <div
                            key={ev.id}
                            className="inline-flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs group hover:border-indigo-300 transition-colors"
                          >
                            {ev.type === 'gambar' ? (
                              <img
                                src={getHighResMediaUrl(ev.url)}
                                alt={ev.title}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0 bg-white cursor-pointer"
                                onClick={() => setPreviewEvidence(ev)}
                              />
                            ) : (
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  ev.type === 'dokumen'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                                }`}
                              >
                                {ev.type === 'dokumen' ? (
                                  <FileText className="w-3.5 h-3.5" />
                                ) : (
                                  <Video className="w-3.5 h-3.5" />
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setPreviewEvidence(ev)}
                              className="font-semibold text-slate-700 hover:text-indigo-700 truncate max-w-[210px] cursor-pointer text-left"
                              title="Klik untuk preview bukti dukung"
                            >
                              {ev.title}
                            </button>

                            <button
                              type="button"
                              onClick={() => setPreviewEvidence(ev)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                              title="Preview Bukti Dukung"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteEvidence(ev.id);
                                showToast('success', `Bukti "${ev.title}" dihapus.`);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Hapus Bukti Dukung"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: PREVIEW GALERI & ARSIP BUKTI DUKUNG */}
      {subTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-indigo-950">
                  Preview Bukti Dukung Terunggah ({filteredPreviewEvidences.length} Berkas)
                </h3>
                <p className="text-xs text-indigo-700">
                  Tinjau kembali dokumen PDF/Link, foto dokumentasi, maupun video bukti dukung EKKS yang sudah diupload oleh Admin.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 tabular-nums">
                {filteredPreviewEvidences.filter((e) => e.type === 'dokumen').length} Dokumen
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 tabular-nums">
                {filteredPreviewEvidences.filter((e) => e.type === 'gambar').length} Gambar
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 tabular-nums">
                {filteredPreviewEvidences.filter((e) => e.type === 'video').length} Video
              </span>
            </div>
          </div>

          {filteredPreviewEvidences.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-600">
                  Belum ada bukti dukung yang sesuai filter untuk periode ini.
                </p>
                <p className="text-xs text-slate-400">
                  Silakan ubah filter Triwulan/Format atau unggah bukti dukung baru melalui Tab 1.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('bukti-dukung')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Buka Menu Upload Bukti Dukung</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPreviewEvidences.map((ev) => {
                const ind = indicatorByKey.get(ev.subIndicatorId) || indicatorByKey.get(ev.subCode);
                const ytThumb = ev.type === 'video' ? getYouTubeThumbnailUrl(ev.url) : null;
                return (
                  <div
                    key={ev.id}
                    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    {/* Visual Thumbnail / Type Header */}
                    <button
                      type="button"
                      onClick={() => setPreviewEvidence(ev)}
                      className="relative h-40 w-full bg-slate-100 overflow-hidden cursor-pointer text-left block"
                    >
                      {ev.type === 'gambar' ? (
                        <img
                          src={getHighResMediaUrl(ev.url)}
                          alt={ev.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : ev.type === 'video' && ytThumb ? (
                        <img
                          src={ytThumb}
                          alt={ev.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex flex-col items-center justify-center gap-2 ${
                            ev.type === 'dokumen'
                              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600'
                              : 'bg-gradient-to-br from-rose-50 to-amber-50 text-rose-600'
                          }`}
                        >
                          {ev.type === 'dokumen' ? (
                            <FileText className="w-11 h-11 opacity-85" />
                          ) : (
                            <Video className="w-11 h-11 opacity-85" />
                          )}
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/85 border border-current/15">
                            {ev.type === 'dokumen' ? (ev.fileName || 'Dokumen PDF / Tautan') : 'Video Bukti Dukung'}
                          </span>
                        </div>
                      )}

                      {/* Top Badges Overlay */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900/85 text-white font-mono">
                          {ev.subCode} &bull; {ev.quarter}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            ev.type === 'dokumen'
                              ? 'bg-blue-600 text-white'
                              : ev.type === 'gambar'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {ev.type}
                        </span>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-extrabold shadow-lg">
                          <Eye className="w-4 h-4 text-indigo-600" />
                          <span>Klik untuk Preview</span>
                        </span>
                      </div>
                    </button>

                    {/* Body Metadata */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">{ev.title}</h4>
                        {ind && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            <span className="font-bold text-slate-700">{ind.variableName}:</span> {ind.subName}
                          </p>
                        )}
                        {ev.description && (
                          <p className="text-[11px] text-slate-500 italic line-clamp-2">"{ev.description}"</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 truncate">
                          {new Date(ev.uploadedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          &bull; {ev.uploadedBy}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewEvidence(ev)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteEvidence(ev.id);
                              showToast('success', `Bukti "${ev.title}" dihapus.`);
                            }}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 cursor-pointer transition-colors"
                            title="Hapus Bukti Dukung"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* TAB 3: PENGATURAN INDIKATOR PENILAIAN */}
      {subTab === 'indikator' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 w-14 text-center">No</th>
                  <th className="p-3.5">Bidang / Variabel</th>
                  <th className="p-3.5 w-36">Indikator</th>
                  <th className="p-3.5 w-24">Kode Sub</th>
                  <th className="p-3.5">Uraian Sub Indikator</th>
                  <th className="p-3.5 w-28 text-center">Status</th>
                  <th className="p-3.5 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIndicators.map((ind, index) => (
                  <tr key={ind.id} className={ind.isActive === false ? 'bg-slate-50/60 opacity-65' : 'hover:bg-slate-50/60'}>
                    <td className="p-3.5 text-center font-bold text-slate-500 tabular-nums">{index + 1}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                          ind.domain === 'Akademik'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {ind.domain}
                      </span>
                      <p className="font-bold text-slate-800">{ind.variableName}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-indigo-700">{ind.indicatorCode}</span>
                      <p className="text-slate-600 mt-0.5 leading-snug">{ind.indicatorName}</p>
                    </td>
                    <td className="p-3.5 font-mono font-black text-slate-800">{ind.subCode}</td>
                    <td className="p-3.5 text-slate-700 font-medium leading-relaxed">{ind.subName}</td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onSaveIndicator({ ...ind, isActive: ind.isActive === false })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                          ind.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {ind.isActive !== false ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditIndicatorModal(ind)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 cursor-pointer"
                          title="Edit Indikator"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteIndicator(ind.id);
                            showToast('success', `Indikator ${ind.subCode} dihapus.`);
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Hapus Indikator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REKAP CAPAIAN & UMPAN BALIK PENGAWAS */}
      {subTab === 'rekap' && (
        <div className="space-y-6">
          <PkksQuarterChart
            indicators={sortedIndicators}
            assessments={assessments}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />

          {/* Detail Rekap & Umpan Balik Per Triwulan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-indigo-600" />
              <span>Catatan &amp; Umpan Balik Pengawas Sekolah ({selectedYear})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quarterStats.map((stat) => (
                <div
                  key={stat.quarter}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {PKKS_QUARTER_LABELS[stat.quarter]}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Pengawas: <strong className="text-slate-700">{stat.assessorName || 'Belum diisi'}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-indigo-700 tabular-nums">
                        {stat.overallAvg > 0 ? stat.overallAvg : '—'}
                        {stat.overallAvg > 0 && <span className="text-xs font-bold text-slate-400 ml-0.5">/4</span>}
                      </span>
                      <span className={`block text-[10px] font-bold px-2 py-0.5 rounded border ${stat.predicate.badgeClass}`}>
                        {stat.predicate.label}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 bg-white border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                    <p className="font-bold text-[11px] text-slate-500 uppercase">Masukan &amp; Umpan Balik:</p>
                    <p className="leading-relaxed">
                      {stat.summaryFeedback || <span className="text-slate-400 italic">Belum ada masukan umum untuk periode ini.</span>}
                    </p>
                    {stat.summaryRecommendation && (
                      <>
                        <p className="font-bold text-[11px] text-indigo-600 uppercase pt-1.5">Rekomendasi Tindak Lanjut:</p>
                        <p className="leading-relaxed text-slate-700">{stat.summaryRecommendation}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD BUKTI DUKUNG */}
      {evidenceModalIndicator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setEvidenceModalIndicator(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-indigo-900 text-white p-5 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                  {evidenceModalIndicator.subCode} &bull; {selectedQuarter} ({selectedYear})
                </span>
                <h3 className="text-base font-bold mt-1.5">Upload Bukti Dukung Kinerja</h3>
                <p className="text-xs text-indigo-200 line-clamp-2 mt-0.5">{evidenceModalIndicator.subName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceModalIndicator(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvidenceSubmit} className="p-5 space-y-4 text-xs">
              {/* Type Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 uppercase text-[10px] block">
                  Format Bukti Dukung
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dokumen', label: 'Dokumen (PDF/Link)', icon: FileText },
                    { id: 'gambar', label: 'Gambar / Foto', icon: ImageIcon },
                    { id: 'video', label: 'Video / YouTube', icon: Video },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = evType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setEvType(opt.id as PkksEvidenceType);
                          setEvUrl('');
                          setEvFileName('');
                        }}
                        className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          active
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Judul Bukti Dukung <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Contoh: SK Tim Penjaminan Mutu, Foto Supervisi Kelas, Video Rapat Koordinasi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-600 uppercase text-[10px] block">
                  {evType === 'dokumen'
                    ? 'Unggah File PDF (maks 2.5 MB) atau Tempel Link Google Drive / PDF'
                    : evType === 'gambar'
                    ? 'Unggah File Gambar HD atau Tempel Link Foto'
                    : 'Tempel Link YouTube / Google Drive atau Unggah Video Singkat (maks 3 MB)'}
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={evUrl}
                      onChange={(e) => setEvUrl(e.target.value)}
                      placeholder={
                        evType === 'video'
                          ? 'https://youtube.com/... atau https://drive.google.com/...'
                          : 'https://drive.google.com/... atau klik Upload'
                      }
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                    />
                  </div>
                  <label className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingFile ? 'Memuat...' : 'Upload'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept={
                        evType === 'dokumen'
                          ? 'application/pdf,.pdf'
                          : evType === 'gambar'
                          ? 'image/*'
                          : 'video/mp4,video/webm,video/ogg'
                      }
                      onChange={handleEvidenceFileUpload}
                    />
                  </label>
                </div>
                {evFileName && (
                  <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>File terpilih: {evFileName}</span>
                  </p>
                )}

                {evUrl.trim() && (
                  <div className="pt-1 flex items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-3 py-2">
                    <span className="text-[11px] font-semibold text-indigo-800 truncate">
                      Berkas / tautan siap disimpan
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewEvidence({
                          id: 'draft-preview',
                          subIndicatorId: evidenceModalIndicator.id,
                          subCode: evidenceModalIndicator.subCode,
                          year: selectedYear,
                          quarter: selectedQuarter,
                          title: evTitle.trim() || evFileName || `Pratinjau ${evidenceModalIndicator.subCode}`,
                          type: evType,
                          url: evType === 'gambar' ? convertGoogleDriveLink(evUrl.trim()) : evUrl.trim(),
                          fileName: evFileName || undefined,
                          description: evDescription.trim() || undefined,
                          uploadedBy: adminName || 'Administrator',
                          uploadedAt: new Date().toISOString(),
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Sebelum Simpan</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Keterangan / Catatan Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={evDescription}
                  onChange={(e) => setEvDescription(e.target.value)}
                  placeholder="Keterangan tambahan mengenai bukti dukung ini untuk Pengawas..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEvidenceModalIndicator(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvidence || isProcessingFile}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingEvidence ? 'Menyimpan...' : 'Simpan Bukti Dukung'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT INDIKATOR */}
      {isIndicatorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setIsIndicatorModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingIndicatorId ? 'Edit Indikator Evaluasi EKKS' : 'Tambah Indikator Evaluasi EKKS'}
              </h3>
              <button
                type="button"
                onClick={() => setIsIndicatorModalOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIndicatorSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Bidang</label>
                  <select
                    value={indForm.domain}
                    onChange={(e) => setIndForm({ ...indForm, domain: e.target.value as PkksDomain })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="Akademik">Akademik</option>
                    <option value="Manajerial">Manajerial</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    min={1}
                    value={indForm.order}
                    onChange={(e) => setIndForm({ ...indForm, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Variabel</label>
                <input
                  type="text"
                  required
                  value={indForm.variableName}
                  onChange={(e) => setIndForm({ ...indForm, variableName: e.target.value })}
                  placeholder="Contoh: Kualitas Pembelajaran, Lingkungan Belajar..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Kode Indikator</label>
                  <input
                    type="text"
                    required
                    value={indForm.indicatorCode}
                    onChange={(e) => setIndForm({ ...indForm, indicatorCode: e.target.value })}
                    placeholder="D.1 / E.7"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Nama Indikator</label>
                  <input
                    type="text"
                    required
                    value={indForm.indicatorName}
                    onChange={(e) => setIndForm({ ...indForm, indicatorName: e.target.value })}
                    placeholder="Contoh: Iklim keamanan satuan pendidikan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Kode Sub</label>
                  <input
                    type="text"
                    required
                    value={indForm.subCode}
                    onChange={(e) => setIndForm({ ...indForm, subCode: e.target.value })}
                    placeholder="D.1.1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">Target Skor (1–4)</label>
                  <select
                    value={indForm.targetScore && indForm.targetScore <= 4 ? indForm.targetScore : 4}
                    onChange={(e) => setIndForm({ ...indForm, targetScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold cursor-pointer"
                  >
                    {PKKS_SCORE_CRITERIA.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.value} — {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Uraian Sub-Indikator <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={indForm.subName}
                  onChange={(e) => setIndForm({ ...indForm, subName: e.target.value })}
                  placeholder="Uraian lengkap sub-indikator penilaian..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={indForm.isActive}
                  onChange={(e) => setIndForm({ ...indForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Aktifkan indikator ini pada penilaian Pengawas</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIndicatorModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingIndicator}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingIndicator ? 'Menyimpan...' : 'Simpan Indikator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW MODAL */}
      <PkksMediaPreviewModal item={previewEvidence} onClose={() => setPreviewEvidence(null)} />
    </div>
  );
}
