import React, { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
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
  Code,
  Check,
  X
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

const SANITIZE_CONFIG = {
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'base', 'meta', 'applet'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onkeydown', 'onchange'],
  ALLOW_DATA_ATTR: false
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts external string value (plain text or HTML) into sanitized HTML suitable for contentEditable.
 */
function toEditorHtml(raw: string): string {
  if (!raw) return '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(raw);
  if (hasHtml) {
    // Preserve multi-paragraph splits joined by \n\n if they aren't wrapped inside lists
    const normalized = raw.replace(/\n{2,}/g, '<br><br>');
    return DOMPurify.sanitize(normalized, SANITIZE_CONFIG);
  }
  const lines = raw.split('\n');
  if (lines.length === 1) {
    return escapeHtml(raw);
  }
  return lines
    .map((line) => (line.trim() === '' ? '<p><br></p>' : `<p>${escapeHtml(line)}</p>`))
    .join('');
}

/**
 * Normalizes innerHTML emitted from contentEditable (strips empty artifacts and raw newlines inside HTML blocks).
 */
function normalizeEmittedHtml(rawHtml: string): string {
  const sanitized = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG)
    .replace(/\r?\n/g, ' ')
    .trim();
  const textOnly = sanitized
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/?(p|div|span)[^>]*>/gi, '')
    .replace(/&nbsp;/gi, '')
    .trim();
  if (!textOnly) return '';
  return sanitized;
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
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [showPreview, setShowPreview] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  const minHeightPx = Math.max(72, rows * 24 + 16);

  const refreshActiveStates = useCallback(() => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch {
      // ignore in environments without selection
    }
  }, []);

  // Sync external `value` prop into contentEditable ONLY when changed externally (never clobber active typing cursor)
  useEffect(() => {
    if (isCodeMode) return;
    const el = editorRef.current;
    if (!el) return;

    const incoming = value || '';
    if (lastEmittedRef.current === incoming) {
      return;
    }

    const nextHtml = toEditorHtml(incoming);
    if (el.innerHTML !== nextHtml) {
      el.innerHTML = nextHtml;
    }
    lastEmittedRef.current = incoming;
  }, [value, isCodeMode]);

  // Re-sync when switching back from Kode HTML mode to Visual mode
  useEffect(() => {
    if (!isCodeMode && editorRef.current) {
      const nextHtml = toEditorHtml(value || '');
      editorRef.current.innerHTML = nextHtml;
      lastEmittedRef.current = value || '';
    }
  }, [isCodeMode]);

  const emitEditorChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const clean = normalizeEmittedHtml(el.innerHTML);
    lastEmittedRef.current = clean;
    onChange(clean);
    refreshActiveStates();
  }, [onChange, refreshActiveStates]);

  const focusEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement !== el) {
      el.focus();
    }
  };

  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSavedSelection = () => {
    focusEditor();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const execVisualCommand = (command: string, commandValue?: string) => {
    if (isCodeMode) return;
    focusEditor();
    try {
      document.execCommand('styleWithCSS', false, 'false');
    } catch {
      // ignore if unsupported
    }
    try {
      document.execCommand(command, false, commandValue);
    } catch (err) {
      console.warn('Formatting command failed:', command, err);
    }
    emitEditorChange();
  };

  const handleToggleHeading = () => {
    if (isCodeMode) return;
    focusEditor();
    try {
      const currentBlock = (document.queryCommandValue('formatBlock') || '').toLowerCase();
      document.execCommand('formatBlock', false, currentBlock === 'h3' ? 'P' : 'H3');
    } catch {
      document.execCommand('formatBlock', false, 'H3');
    }
    emitEditorChange();
  };

  const handleToggleBlockquote = () => {
    if (isCodeMode) return;
    focusEditor();
    try {
      const currentBlock = (document.queryCommandValue('formatBlock') || '').toLowerCase();
      document.execCommand('formatBlock', false, currentBlock === 'blockquote' ? 'P' : 'BLOCKQUOTE');
    } catch {
      document.execCommand('formatBlock', false, 'BLOCKQUOTE');
    }
    emitEditorChange();
  };

  const handleToggleHighlight = () => {
    if (isCodeMode) return;
    focusEditor();
    try {
      const currentBg = (document.queryCommandValue('hiliteColor') || '').replace(/\s+/g, '').toLowerCase();
      const isHighlighted = currentBg === 'rgb(253,230,138)' || currentBg === '#fde68a' || currentBg === 'rgb(254,240,138)';
      document.execCommand('hiliteColor', false, isHighlighted ? 'transparent' : '#fde68a');
    } catch {
      document.execCommand('hiliteColor', false, '#fde68a');
    }
    emitEditorChange();
  };

  const applyColor = (colorHex: string) => {
    execVisualCommand('foreColor', colorHex);
    setShowColorMenu(false);
  };

  const openLinkPopover = () => {
    saveCurrentSelection();
    setLinkUrl('https://');
    setShowColorMenu(false);
    setShowLinkPopover((prev) => !prev);
  };

  const applyInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkUrl.trim();
    if (!trimmed || trimmed === 'https://') {
      setShowLinkPopover(false);
      return;
    }
    const safeUrl = /^(https?:|mailto:|tel:|\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    restoreSavedSelection();
    const sel = window.getSelection();
    if (sel && sel.isCollapsed) {
      const safeLabel = escapeHtml(safeUrl);
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`);
    } else {
      document.execCommand('createLink', false, safeUrl);
      // Add target="_blank" to newly created anchor inside editor
      if (editorRef.current) {
        editorRef.current.querySelectorAll('a').forEach((a) => {
          if (a.getAttribute('href') === safeUrl) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          }
        });
      }
    }
    emitEditorChange();
    setShowLinkPopover(false);
  };

  const clearFormatting = () => {
    if (!value) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = value;
    const plain = (tmp.textContent || tmp.innerText || '').trim();
    lastEmittedRef.current = plain;
    if (editorRef.current && !isCodeMode) {
      editorRef.current.innerHTML = toEditorHtml(plain);
    }
    onChange(plain);
    refreshActiveStates();
  };

  const isEmpty = !value || normalizeEmittedHtml(toEditorHtml(value)) === '';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || true) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {label ? (
            <label className="text-xs font-bold text-slate-700 block font-sans">{label}</label>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Editor Teks Visual</span>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsCodeMode((prev) => !prev)}
              className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                isCodeMode
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title={isCodeMode ? 'Kembali ke Editor Visual (WYSIWYG)' : 'Lihat / Edit Kode HTML'}
            >
              <Code className="w-3 h-3" />
              <span>{isCodeMode ? 'Mode Visual' : 'Kode HTML'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>{showPreview ? 'Tutup Preview' : 'Pratinjau'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TOOLBAR CONTROLS */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
        <div className="bg-slate-100/80 border-b border-slate-200 px-2.5 py-1.5 flex flex-wrap items-center gap-1">
          {/* Group 1: Font Style */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-300/60">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('bold')}
              disabled={isCodeMode}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                activeFormats.bold
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Tebal / Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('italic')}
              disabled={isCodeMode}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                activeFormats.italic
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Miring / Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('underline')}
              disabled={isCodeMode}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                activeFormats.underline
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Garis Bawah / Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('strikeThrough')}
              disabled={isCodeMode}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                activeFormats.strikeThrough
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Coret / Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 2: Paragraph Alignment */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-300/60">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('justifyLeft')}
              disabled={isCodeMode}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Rata Kiri (Left Align)"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('justifyCenter')}
              disabled={isCodeMode}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Rata Tengah (Center Align)"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('justifyRight')}
              disabled={isCodeMode}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Rata Kanan (Right Align)"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execVisualCommand('justifyFull')}
              disabled={isCodeMode}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleToggleHeading}
                disabled={isCodeMode}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                title="Judul Sub-Bab / Heading"
              >
                <Heading className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execVisualCommand('insertUnorderedList')}
                disabled={isCodeMode}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                  activeFormats.insertUnorderedList
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Daftar Poin / Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execVisualCommand('insertOrderedList')}
                disabled={isCodeMode}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                  activeFormats.insertOrderedList
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Daftar Berurutan / Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Group 4: Highlight, Link, Color */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-300/60 relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleToggleHighlight}
              disabled={isCodeMode}
              className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Sorot Teks / Highlight"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            </button>
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowLinkPopover(false);
                  setShowColorMenu(!showColorMenu);
                }}
                disabled={isCodeMode}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer flex items-center disabled:opacity-40"
                title="Pilih Warna Teks"
              >
                <Palette className="w-3.5 h-3.5 text-blue-600" />
              </button>

              {showColorMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl p-2 shadow-lg z-30 flex items-center gap-1.5">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('#1e293b')} className="w-5 h-5 rounded-full bg-slate-800 hover:scale-110 transition-transform cursor-pointer border border-slate-300" title="Hitam / Default" />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('#dc2626')} className="w-5 h-5 rounded-full bg-red-600 hover:scale-110 transition-transform cursor-pointer" title="Merah" />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('#2563eb')} className="w-5 h-5 rounded-full bg-blue-600 hover:scale-110 transition-transform cursor-pointer" title="Biru" />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('#16a34a')} className="w-5 h-5 rounded-full bg-green-600 hover:scale-110 transition-transform cursor-pointer" title="Hijau" />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('#d97706')} className="w-5 h-5 rounded-full bg-amber-600 hover:scale-110 transition-transform cursor-pointer" title="Emas/Jingga" />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor('#9333ea')} className="w-5 h-5 rounded-full bg-purple-600 hover:scale-110 transition-transform cursor-pointer" title="Ungu" />
                </div>
              )}
            </div>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={openLinkPopover}
              disabled={isCodeMode}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                showLinkPopover ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Sisipkan Tautan (Link)"
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
            </button>

            {!compact && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleToggleBlockquote}
                disabled={isCodeMode}
                className="p-1.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                title="Kutipan / Blockquote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group 5: Reset */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearFormatting}
            className="p-1.5 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer ml-auto"
            title="Bersihkan Semua Format Teks"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* INLINE LINK POPOVER */}
        {showLinkPopover && !isCodeMode && (
          <form
            onSubmit={applyInsertLink}
            className="bg-blue-50/90 border-b border-blue-100 px-3 py-2 flex items-center gap-2"
          >
            <LinkIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://contoh.sch.id"
              autoFocus
              className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Terapkan</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLinkPopover(false)}
              className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* VISUAL WYSIWYG EDITOR OR HTML CODE MODE */}
        {isCodeMode ? (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => {
              lastEmittedRef.current = e.target.value;
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            className="w-full text-xs font-mono p-3 focus:outline-none bg-slate-900 text-emerald-300 leading-relaxed border-none resize-y"
          />
        ) : (
          <div className="relative bg-white">
            {isEmpty && (
              <div className="pointer-events-none absolute top-3 left-3 right-3 text-xs text-slate-400 select-none">
                {placeholder}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={emitEditorChange}
              onKeyUp={refreshActiveStates}
              onMouseUp={refreshActiveStates}
              onBlur={emitEditorChange}
              onPaste={(e) => {
                // Keep pasted text clean and safe without broken external inline styles
                const html = e.clipboardData?.getData('text/html');
                const plain = e.clipboardData?.getData('text/plain');
                if (html) {
                  e.preventDefault();
                  const clean = DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'p', 'div', 'br', 'ul', 'ol', 'li', 'h3', 'blockquote', 'a'],
                    ALLOWED_ATTR: ['href', 'target', 'rel'],
                  });
                  document.execCommand('insertHTML', false, clean);
                  emitEditorChange();
                } else if (plain !== undefined) {
                  e.preventDefault();
                  document.execCommand('insertText', false, plain);
                  emitEditorChange();
                }
              }}
              style={{ minHeight: `${minHeightPx}px` }}
              className="w-full text-xs font-medium p-3 focus:outline-none bg-white text-slate-800 leading-relaxed font-sans max-h-[420px] overflow-y-auto [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through [&_strike]:line-through [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-1.5 [&_a]:text-blue-600 [&_a]:underline"
            />
          </div>
        )}
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
