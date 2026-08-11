import React, { useState } from 'react';
import { Calendar, FileSpreadsheet, FileText, Printer, X, Filter, RefreshCw } from 'lucide-react';

interface ExportDateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onExport: (startDate: string, endDate: string, format: 'excel' | 'pdf') => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function ExportDateFilterModal({
  isOpen,
  onClose,
  title,
  description = 'Pilih rentang tanggal rekapitulasi data yang ingin diunduh.',
  onExport,
  initialStartDate = '',
  initialEndDate = ''
}: ExportDateFilterModalProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  if (!isOpen) return null;

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const handleSetLast30Days = () => {
    const now = new Date();
    const endDateStr = now.toISOString().split('T')[0];
    const past = new Date();
    past.setDate(past.getDate() - 30);
    const startDateStr = past.toISOString().split('T')[0];
    setStartDate(startDateStr);
    setEndDate(endDateStr);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleExecute = (format: 'excel' | 'pdf') => {
    onExport(startDate, endDate, format);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 space-y-5 animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Pilihan Cepat Rentang Tanggal:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200 hover:border-emerald-200 cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleSetThisMonth}
              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200 hover:border-emerald-200 cursor-pointer"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={handleSetLast30Days}
              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200 hover:border-emerald-200 cursor-pointer"
            >
              30 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-500 rounded-lg text-[11px] font-bold transition-all border border-slate-200 hover:border-rose-200 cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Semua Tanggal</span>
            </button>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Tanggal Mulai:</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tanggal Selesai:</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {startDate || endDate ? (
          <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-[11px] text-blue-900 font-medium">
            📅 Menampilkan data dari <span className="font-bold">{startDate || 'Awal'}</span> s.d. <span className="font-bold">{endDate || 'Sekarang'}</span>.
          </div>
        ) : (
          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium italic text-center">
            Mengekspor seluruh riwayat data tanpa batasan tanggal.
          </div>
        )}

        {/* Export Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleExecute('excel')}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => handleExecute('pdf')}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4 text-indigo-200" />
            <span>Cetak / PDF (.pdf)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
