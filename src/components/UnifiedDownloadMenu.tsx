import React, { useEffect, useState } from 'react';
import { Download, ChevronDown, Calendar, FileText, FileSpreadsheet, Filter } from 'lucide-react';
import type { DownloadActionItem } from '../context/DownloadContext';
import { DateFilterPreset, resolveDatePreset } from '../utils/exportDateFilter';

interface UnifiedDownloadMenuProps {
  actions: DownloadActionItem[];
  roleLabel?: string;
  variant?: 'navbar' | 'coach';
}

type DocFormat = 'docx' | 'pdf' | 'excel';

const PRESET_OPTIONS: { id: DateFilterPreset; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari Ini' },
  { id: 'last7', label: '7 Hari' },
  { id: 'thisMonth', label: 'Bulan Ini' },
  { id: 'thisSemester', label: 'Semester' },
  { id: 'custom', label: 'Kustom' },
];

export default function UnifiedDownloadMenu({
  actions,
  roleLabel = 'Portal',
  variant = 'navbar',
}: UnifiedDownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [preset, setPreset] = useState<DateFilterPreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<DocFormat>('excel');

  const firstLabel = actions[0]?.label || '';

  useEffect(() => {
    setSelectedIdx(0);
  }, [firstLabel, actions.length]);

  if (!actions || actions.length === 0) return null;

  const safeIdx = selectedIdx < actions.length ? selectedIdx : 0;
  const activeAction = actions[safeIdx];
  const resolvedRange = resolveDatePreset(preset, customStart, customEnd);

  const availableFormats: DocFormat[] = activeAction?.formats
    ? (['docx', 'pdf', 'excel'] as DocFormat[]).filter((f) => Boolean(activeAction.formats?.[f]))
    : [];

  const effectiveFormat: DocFormat = availableFormats.includes(selectedFormat)
    ? selectedFormat
    : availableFormats[0] || 'pdf';

  const handleTriggerDownload = (explicitFormat?: DocFormat) => {
    if (!activeAction) return;
    if (activeAction.formats) {
      const fmt = explicitFormat || effectiveFormat;
      const handler = activeAction.formats[fmt];
      if (handler) {
        handler(resolvedRange);
        setIsOpen(false);
      }
    } else if (activeAction.onClick) {
      activeAction.onClick(resolvedRange);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          variant === 'coach'
            ? 'flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs'
            : 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs border cursor-pointer bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700'
        }
        title="Unduh Dokumen (Filter Waktu, Jenis Data & Format .docx / .pdf / .xls)"
      >
        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="font-bold">Unduh Dokumen</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-[340px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3.5 z-40 text-slate-800 dark:text-slate-200 text-xs space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-100">
                  Unduh Dokumen &amp; Laporan
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 capitalize">
                {roleLabel.replace('_', ' ')}
              </span>
            </div>

            {/* 1. Jenis Data Dropdown */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Jenis Data Dokumen
              </label>
              <select
                value={safeIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                {actions.map((action, idx) => (
                  <option key={`${action.label}-${idx}`} value={idx}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Filter Waktu */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  <span>2. Filter Waktu</span>
                </label>
                <span className="text-[10px] text-slate-400 truncate max-w-[165px]">
                  {resolvedRange.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {PRESET_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPreset(opt.id)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      preset === opt.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {preset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 mb-0.5">
                      Dari Tanggal
                    </span>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 mb-0.5">
                      Sampai Tanggal
                    </span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Format Dokumen & Download */}
            {activeAction?.formats ? (
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Format Dokumen Download
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  {activeAction.formats.docx && (
                    <button
                      type="button"
                      onClick={() => setSelectedFormat('docx')}
                      className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer ${
                        effectiveFormat === 'docx'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100'
                      }`}
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span>.docx</span>
                    </button>
                  )}
                  {activeAction.formats.pdf && (
                    <button
                      type="button"
                      onClick={() => setSelectedFormat('pdf')}
                      className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer ${
                        effectiveFormat === 'pdf'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                      }`}
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span>.pdf</span>
                    </button>
                  )}
                  {activeAction.formats.excel && (
                    <button
                      type="button"
                      onClick={() => setSelectedFormat('excel')}
                      className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer ${
                        effectiveFormat === 'excel'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                      }`}
                    >
                      <FileSpreadsheet className="w-3 h-3 shrink-0" />
                      <span>.xls / .xlsx</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleTriggerDownload()}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Unduh {effectiveFormat === 'docx' ? '.docx' : effectiveFormat === 'pdf' ? '.pdf' : '.xlsx'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleTriggerDownload()}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>{activeAction?.label || 'Unduh Dokumen'}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
