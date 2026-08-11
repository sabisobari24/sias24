import React, { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading,
  List,
  ListOrdered,
  Highlighter,
  Link as LinkIcon,
  Quote,
  RotateCcw,
  Palette,
  Eye,
  Code
} from 'lucide-react';
import FormattedText from './FormattedText';

interface TextFormattingToolbarProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  compact?: boolean;
  helpText?: string;
}

export default function TextFormattingToolbar({
  value,
  onChange,
  label,
  placeholder = 'Ketik isi teks di sini...',
  rows = 4,
  className = '',
  compact = false,
  helpText
}: TextFormattingToolbarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const applyFormatting = (tagOpen: string, tagClose: string, defaultPlaceholder = '') => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${tagOpen}${defaultPlaceholder}${tagClose}`);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToWrap = selectedText || defaultPlaceholder;

    const newText = value.substring(0, start) + tagOpen + textToWrap + tagClose + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      el.focus();
      const cursorStart = start + tagOpen.length;
      const cursorEnd = cursorStart + textToWrap.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    }, 10);
  };

  const applyColor = (colorHex: string) => {
    applyFormatting(`<span style="color: ${colorHex}">`, '</span>', 'Teks Berwarna');
    setShowColorMenu(false);
  };

  const handleInsertLink = () => {
    const url = prompt('Masukkan URL Tautan (Link):', 'https://');
    if (url && url.trim().length > 0) {
      applyFormatting(`<a href="${url.trim()}" target="_blank" class="text-blue-600 underline font-semibold">`, '</a>', 'Teks Tautan');
    }
  };

  const clearFormatting = () => {
    if (!value) return;
    // Strip HTML tags
    const clean = value.replace(/<[^>]*>?/gm, '');
    onChange(clean);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 block font-sans">{label}</label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-3 h-3" />
            <span>{showPreview ? 'Sembunyikan Preview' : 'Pratinjau Tampilan'}</span>
          </button>
        </div>
      )}

      {/* TOOLBAR CONTROLS */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="bg-slate-100/80 border-b border-slate-200 px-2.5 py-1.5 flex flex-wrap items-center gap-1">
          {/* Group 1: Font Style */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-300/60">
            <button
              type="button"
              onClick={() => applyFormatting('<b>', '</b>', 'Teks Tebal')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Tebal / Bold (<b>)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('<i>', '</i>', 'Teks Miring')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Miring / Italic (<i>)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('<u>', '</u>', 'Teks Garis Bawah')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Garis Bawah / Underline (<u>)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('<s>', '</s>', 'Teks Coret')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Coret / Strikethrough (<s>)"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 2: Paragraph Alignment */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-300/60">
            <button
              type="button"
              onClick={() => applyFormatting('<p align="left">', '</p>', 'Paragraf Rata Kiri')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Rata Kiri (Left Align)"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('<p align="center">', '</p>', 'Paragraf Rata Tengah')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Rata Tengah (Center Align)"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('<p align="right">', '</p>', 'Paragraf Rata Kanan')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Rata Kanan (Right Align)"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('<p align="justify">', '</p>', 'Paragraf Rata Kanan-Kiri (Justify)')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Rata Kanan-Kiri / Justify"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 3: Lists & Headings */}
          {!compact && (
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-300/60">
              <button
                type="button"
                onClick={() => applyFormatting('<h3 className="text-base font-bold text-slate-800">', '</h3>', 'Judul Sub-Bab')}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Judul Sub-Bab / Heading (<h3>)"
              >
                <Heading className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('<ul>\n  <li>', '</li>\n  <li>Poin 2</li>\n</ul>', 'Poin 1')}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Daftar Poin / Bullet List (<ul>)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('<ol>\n  <li>', '</li>\n  <li>Nomor 2</li>\n</ol>', 'Nomor 1')}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Daftar Berurutan / Numbered List (<ol>)"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Group 4: Highlight, Link, Color */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-300/60 relative">
            <button
              type="button"
              onClick={() => applyFormatting('<mark className="bg-amber-200 px-1 rounded">', '</mark>', 'Teks Disorot')}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Sorot Teks / Highlight (<mark>)"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorMenu(!showColorMenu)}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer flex items-center"
                title="Pilih Warna Teks"
              >
                <Palette className="w-3.5 h-3.5 text-blue-600" />
              </button>

              {showColorMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl p-2 shadow-lg z-30 flex items-center gap-1.5">
                  <button type="button" onClick={() => applyColor('#dc2626')} className="w-5 h-5 rounded-full bg-red-600 hover:scale-110 transition-transform cursor-pointer" title="Merah" />
                  <button type="button" onClick={() => applyColor('#2563eb')} className="w-5 h-5 rounded-full bg-blue-600 hover:scale-110 transition-transform cursor-pointer" title="Biru" />
                  <button type="button" onClick={() => applyColor('#16a34a')} className="w-5 h-5 rounded-full bg-green-600 hover:scale-110 transition-transform cursor-pointer" title="Hijau" />
                  <button type="button" onClick={() => applyColor('#d97706')} className="w-5 h-5 rounded-full bg-amber-600 hover:scale-110 transition-transform cursor-pointer" title="Emas/Jingga" />
                  <button type="button" onClick={() => applyColor('#9333ea')} className="w-5 h-5 rounded-full bg-purple-600 hover:scale-110 transition-transform cursor-pointer" title="Ungu" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleInsertLink}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Sisipkan Tautan (Link)"
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
            </button>

            {!compact && (
              <button
                type="button"
                onClick={() => applyFormatting('<blockquote className="border-l-4 border-blue-600 pl-3 italic text-slate-600 my-2">', '</blockquote>', 'Kalimat Kutipan...')}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Kutipan / Blockquote (<blockquote>)"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group 5: Reset */}
          <button
            type="button"
            onClick={clearFormatting}
            className="p-1.5 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer ml-auto"
            title="Bersihkan Semua Tag Format / Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* INPUT TEXTAREA */}
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs font-medium p-3 focus:outline-none bg-white text-slate-800 leading-relaxed font-sans border-none resize-y"
        />
      </div>

      {helpText && <p className="text-[10px] text-slate-400 leading-tight">{helpText}</p>}

      {/* PREVIEW BOX */}
      {showPreview && (
        <div className="bg-slate-50 border border-blue-100 rounded-2xl p-4 space-y-1.5 mt-2">
          <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">
            Pratinjau Hasil Tampilan Teks:
          </span>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 font-sans shadow-xs min-h-[60px]">
            {value ? (
              <FormattedText content={value} />
            ) : (
              <span className="text-slate-400 italic">Belum ada teks yang diketik...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
