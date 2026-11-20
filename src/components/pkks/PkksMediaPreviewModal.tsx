import React from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Image as ImageIcon, Video, Download, ExternalLink, Calendar, User } from 'lucide-react';
import { PkksEvidenceItem } from '../../types';
import { getYouTubeEmbedUrl, isDirectVideoUrl } from '../../utils/mediaHelper';
import { getHighResMediaUrl } from '../../utils/imageHelper';

interface PkksMediaPreviewModalProps {
  item: PkksEvidenceItem | null;
  onClose: () => void;
}

export function getGoogleDriveFileId(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) return null;
  const matchD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD?.[1]) return matchD[1];
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId?.[1]) return matchId[1];
  return null;
}

export function getDocumentPreviewUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:application/pdf')) return trimmed;
  const driveId = getGoogleDriveFileId(trimmed);
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
  if (/\.pdf(\?.*)?$/i.test(trimmed)) return trimmed;
  if (trimmed.includes('docs.google.com')) {
    return trimmed.replace(/\/edit(\?.*)?$/i, '/preview');
  }
  return null;
}

export default function PkksMediaPreviewModal({ item, onClose }: PkksMediaPreviewModalProps) {
  if (!item) return null;

  const isPdfOrDocPreview = item.type === 'dokumen' ? getDocumentPreviewUrl(item.url) : null;
  const youtubeUrl = item.type === 'video' ? getYouTubeEmbedUrl(item.url) : null;
  const driveVideoId = item.type === 'video' ? getGoogleDriveFileId(item.url) : null;
  const isDirectVideo = item.type === 'video' && isDirectVideoUrl(item.url);

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                item.type === 'dokumen'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : item.type === 'gambar'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}
            >
              {item.type === 'dokumen' && <FileText className="w-5 h-5" />}
              {item.type === 'gambar' && <ImageIcon className="w-5 h-5" />}
              {item.type === 'video' && <Video className="w-5 h-5" />}
            </div>
            <div className="min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-sky-200">
                  {item.subCode} &bull; {item.quarter} ({item.year})
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-100">
                  {item.type}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate">{item.title}</h3>
              {item.description && (
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{item.description}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Tutup Pratinjau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Viewer Stage */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 sm:p-6 flex items-center justify-center min-h-[340px]">
          {item.type === 'gambar' && (
            <img
              src={getHighResMediaUrl(item.url)}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[68vh] object-contain rounded-2xl shadow-lg bg-white"
            />
          )}

          {item.type === 'video' && (
            <div className="w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
              {youtubeUrl ? (
                <iframe
                  src={youtubeUrl}
                  title={item.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : driveVideoId ? (
                <iframe
                  src={`https://drive.google.com/file/d/${driveVideoId}/preview`}
                  title={item.title}
                  className="w-full h-full border-0"
                  allow="autoplay"
                  allowFullScreen
                />
              ) : isDirectVideo ? (
                <video src={item.url} controls className="w-full h-full object-contain bg-black" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white p-6 text-center space-y-3">
                  <Video className="w-10 h-10 text-slate-400" />
                  <p className="text-sm font-semibold">Tautan Video Eksternal</p>
                  <p className="text-xs text-slate-400 break-all max-w-md">{item.url}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Video di Tab Baru</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {item.type === 'dokumen' && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {isPdfOrDocPreview ? (
                <iframe
                  src={isPdfOrDocPreview}
                  title={item.title}
                  className="w-full h-[64vh] bg-white rounded-2xl border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">{item.fileName || item.title}</h4>
                    <p className="text-xs text-slate-500">
                      Dokumen siap diunduh atau dibuka langsung melalui tautan sumber.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    {item.url.startsWith('data:') ? (
                      <a
                        href={item.url}
                        download={item.fileName || `${item.subCode}_${item.title}.pdf`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Dokumen</span>
                      </a>
                    ) : (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Buka Dokumen</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer metadata & actions */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Diunggah oleh: <strong className="text-slate-700">{item.uploadedBy}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(item.uploadedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {item.url.startsWith('data:') ? (
              <a
                href={item.url}
                download={item.fileName || `${item.subCode}_${item.title}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File</span>
              </a>
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Sumber Asli</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
