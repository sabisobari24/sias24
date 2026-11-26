import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ZoomIn, ZoomOut, Download, ExternalLink, Loader2, AlertTriangle, FileText } from 'lucide-react';

// Configure same-origin bundled PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasPreviewProps {
  url: string;
  fileName?: string;
  title?: string;
}

function base64DataUriToUint8Array(dataUri: string): Uint8Array | null {
  try {
    const commaIdx = dataUri.indexOf(',');
    if (commaIdx === -1) return null;
    const base64 = dataUri.slice(commaIdx + 1).replace(/\s/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export default function PdfCanvasPreview({ url, fileName, title }: PdfCanvasPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const loadPdf = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setNumPages(0);

      try {
        if (pdfDocRef.current) {
          try {
            await pdfDocRef.current.cleanup();
          } catch {
            /* ignore */
          }
          pdfDocRef.current = null;
        }

        if (url.startsWith('data:')) {
          const bytes = base64DataUriToUint8Array(url);
          if (!bytes || bytes.length === 0) {
            throw new Error('Data PDF tidak valid atau rusak.');
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else {
          loadingTask = pdfjsLib.getDocument({ url });
        }

        const doc = await loadingTask.promise;
        if (cancelled) {
          await doc.cleanup();
          return;
        }

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
      } catch (err: any) {
        if (!cancelled) {
          console.warn('[PdfCanvasPreview] Load error:', err);
          setErrorMsg(
            err?.message?.includes('CORS') || !url.startsWith('data:')
              ? 'Pratinjau langsung dibatasi oleh server sumber. Silakan buka atau unduh dokumen melalui tombol di bawah.'
              : 'Gagal merender file PDF di pratinjau. Anda tetap dapat mengunduh file asli melalui tombol di bawah.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch {
          /* ignore */
        }
      }
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.cleanup();
        } catch {
          /* ignore */
        }
        pdfDocRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    const renderAllPages = async () => {
      const doc = pdfDocRef.current;
      const container = containerRef.current;
      if (!doc || !container || numPages <= 0) return;

      container.innerHTML = '';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled) return;
        try {
          const page = await doc.getPage(pageNum);
          if (cancelled) return;

          // Base responsive viewport fit inside modal width
          const baseViewport = page.getViewport({ scale: 1 });
          const maxContainerW = Math.max(320, (container.clientWidth || 720) - 32);
          const fitScale = Math.min(1.8, maxContainerW / baseViewport.width) * (scale / 1.25);
          const viewport = page.getViewport({ scale: Math.max(0.5, fitScale) });

          const pageWrapper = document.createElement('div');
          pageWrapper.className = 'bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mx-auto';
          pageWrapper.style.width = `${Math.floor(viewport.width)}px`;

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = 'block';

          if (context) {
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            await page.render({ canvasContext: context, viewport, canvas }).promise;
          }

          const badge = document.createElement('div');
          badge.className =
            'bg-slate-50 border-t border-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 text-center tabular-nums';
          badge.textContent = `Halaman ${pageNum} dari ${numPages}`;

          pageWrapper.appendChild(canvas);
          pageWrapper.appendChild(badge);
          if (!cancelled) {
            container.appendChild(pageWrapper);
          }
        } catch (renderErr) {
          console.warn(`[PdfCanvasPreview] Page ${pageNum} render warning:`, renderErr);
        }
      }
    };

    renderAllPages();

    return () => {
      cancelled = true;
    };
  }, [numPages, scale]);

  if (errorMsg) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800">{fileName || title || 'Dokumen PDF'}</h4>
          <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {url.startsWith('data:') ? (
            <a
              href={url}
              download={fileName || `${title || 'dokumen'}.pdf`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Dokumen PDF</span>
            </a>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka PDF di Tab Baru</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="truncate max-w-[260px]">{fileName || title || 'Pratinjau PDF'}</span>
          {numPages > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold tabular-nums">
              {numPages} Halaman
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, Number((s - 0.25).toFixed(2))))}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Perkecil"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-slate-600 px-2 tabular-nums">
            {Math.round((scale / 1.25) * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.25).toFixed(2))))}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Perbesar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pages Scroll Area */}
      <div className="relative w-full h-[58vh] overflow-y-auto bg-slate-200/70 rounded-2xl border border-slate-200 p-4">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100/90 z-10">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <span className="text-xs font-bold text-slate-600">Memuat halaman dokumen PDF...</span>
          </div>
        )}
        <div ref={containerRef} className="space-y-4 flex flex-col items-center" />
      </div>
    </div>
  );
}
