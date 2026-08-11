import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Newspaper, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  X, 
  AlertCircle,
  FileText,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  ExternalLink,
  Megaphone
} from 'lucide-react';
import { syncCollection } from '../../lib/firebase';
import { INITIAL_WEB_CONTENT } from '../../data/initialWebContent';
import { WebSectionContent, WebArticle } from '../../types';
import FormattedText from '../common/FormattedText';

export default function WebBerita() {
  const [webContent, setWebContent] = useState<WebSectionContent>(() => {
    return INITIAL_WEB_CONTENT.find(c => c.id === 'berita')!;
  });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = syncCollection<WebSectionContent>(
      'web_content',
      (data) => {
        const found = data.find(c => c.id === 'berita');
        if (found) {
          setWebContent(found);
        }
        setLoading(false);
      },
      INITIAL_WEB_CONTENT
    );
    return () => unsubscribe();
  }, []);

  const handleShare = (
    e: React.MouseEvent,
    platform: 'wa' | 'fb' | 'twitter' | 'telegram' | 'copy',
    title: string,
    text: string,
    url?: string,
    id?: string
  ) => {
    e.stopPropagation();
    const shareUrl = url || window.location.href;
    const shareContent = `${title}\n\n${text}\n\nSelengkapnya: ${shareUrl}`;

    if (platform === 'wa') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareContent)}`, '_blank');
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`${title} - ${text}`)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} - ${text}`)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${title}\n\n${text}`)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareContent);
      const targetId = id || 'default';
      setCopiedId(targetId);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const articlesList = webContent.articles || [];
  const tickers = webContent.tickers || [];
  const activities = webContent.activities || [];
  const agendas = webContent.agendas || [];

  const spotlightArticle = articlesList[0] || null;
  const remainingArticles = articlesList.slice(1);

  const [activeArticle, setActiveArticle] = useState<WebArticle | null>(null);
  const [activeTicker, setActiveTicker] = useState<any | null>(null);

  return (
    <div className="space-y-8 pb-12 font-sans text-left">
      
      {/* BANNER HEADER */}
      <div className="bg-white border border-slate-200/80 p-6 md:p-8 rounded-3xl shadow-xs">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Pusat Pengumuman &amp; Berita</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">Informasi resmi sekolah, berita pendidikan, agenda pekanan, serta kegiatan mendatang.</p>
      </div>

      {/* HOT NEWS BANNER TICKER */}
      {tickers.length > 0 && (
        <div className="bg-gradient-to-r from-blue-800 via-indigo-900 to-slate-900 border-l-6 border-amber-400 text-white rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-md overflow-hidden relative">
          <span className="bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 shadow-sm z-10">
            <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Hot News</span>
          </span>
          <div className="overflow-hidden relative w-full text-xs sm:text-sm font-semibold">
            <div className="flex animate-[marquee_8s_linear_infinite] sm:animate-[marquee_12s_linear_infinite] md:animate-[marquee_20s_linear_infinite] whitespace-nowrap gap-10 hover:[animation-play-state:paused] cursor-pointer">
              {[...tickers, ...tickers].map((ticker, tIdx) => {
                const hasLink = Boolean(ticker.linkUrl && ticker.linkUrl.trim().length > 0);
                const textContent = (
                  <span className="flex items-center gap-2 hover:text-amber-200 transition-colors">
                    <span className="text-amber-300 font-bold">[{ticker.category}]</span> 
                    <span className="font-semibold">{ticker.text}</span>
                  </span>
                );

                if (hasLink) {
                  return (
                    <a
                      key={`${ticker.id}-${tIdx}`}
                      href={ticker.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer hover:opacity-90 inline-flex items-center"
                      title={`Buka Tautan: ${ticker.linkUrl}`}
                    >
                      {textContent}
                    </a>
                  );
                }

                return (
                  <span
                    key={`${ticker.id}-${tIdx}`}
                    onClick={() => setActiveTicker(ticker)}
                    className="inline-flex items-center cursor-pointer"
                    title="Klik untuk membaca & bagikan pengumuman"
                  >
                    {textContent}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: MAIN ARTICLES (8/12) */}
        <section className="lg:col-span-8 space-y-8">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 border-b border-slate-200 pb-3">
            <Newspaper className="w-6 h-6 text-blue-700" />
            <span>Artikel &amp; Edukasi Terbaru</span>
          </h2>

          {/* Main article spotlight card - MODERATE ELEGANT SIZE */}
          {spotlightArticle ? (
            <div 
              onClick={() => setActiveArticle(spotlightArticle)}
              className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1 text-left"
            >
              <div className="h-[220px] sm:h-[260px] md:h-[290px] relative overflow-hidden bg-slate-100">
                <img 
                  src={spotlightArticle.image} 
                  alt={spotlightArticle.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-blue-700 text-white font-extrabold text-[11px] tracking-wider uppercase px-3.5 py-1 rounded-full shadow-md">
                  {spotlightArticle.category}
                </span>
              </div>
              
              <div className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    {spotlightArticle.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    {spotlightArticle.author}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                  {spotlightArticle.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium line-clamp-2">
                  {spotlightArticle.summary}
                </p>

                <div className="pt-1 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 group-hover:gap-2.5 transition-all">
                    <span>Baca Berita Selengkapnya</span>
                    <span>&rarr;</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-slate-400 font-medium">
              Belum ada artikel sekolah.
            </div>
          )}

          {/* Sub article cards grid - BALANCED SIZED CARDS */}
          {remainingArticles.length > 0 && (
            <div className="space-y-3.5 pt-1">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-wide">Berita &amp; Artikel Lainnya</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {remainingArticles.map((art) => (
                  <div 
                    key={art.id}
                    onClick={() => setActiveArticle(art)}
                    className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-blue-500 transition-all cursor-pointer group flex flex-col justify-between hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="h-40 sm:h-44 relative overflow-hidden bg-slate-100">
                        <img 
                          src={art.image} 
                          alt={art.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <span className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-xs text-white font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                          {art.category}
                        </span>
                      </div>

                      <div className="p-4 sm:p-5 space-y-2 text-left">
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            {art.date}
                          </span>
                          {art.author && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              {art.author}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-black text-slate-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                          {art.title}
                        </h4>

                        {art.summary && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                            {art.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 pb-4 pt-1 text-left">
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 group-hover:gap-2 transition-all">
                        <span>Baca Artikel</span>
                        <span>&rarr;</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        {/* RIGHT PANEL: SCHEDULE & AGENDA (4/12) */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* Timeline Pekan ini */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock className="w-4.5 h-4.5" />
              <span>Jadwal Kegiatan Pekan Ini</span>
            </h3>

            {activities.length > 0 ? (
              <div className="relative border-l-2 border-dashed border-slate-200 pl-5 ml-2 space-y-5">
                {activities.map((act) => (
                  <div key={act.id} className="relative">
                    <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-50 shadow-sm" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{act.day}</span>
                    <h4 className="text-xs font-black text-slate-800 mt-0.5 leading-snug">{act.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                      {act.desc}
                    </p>
                    <span className="inline-block bg-blue-50 text-blue-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md mt-1.5">
                      {act.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Tidak ada kegiatan terjadwal pekan ini.</p>
            )}
          </div>

          {/* Agenda Mendatang */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Calendar className="w-4.5 h-4.5" />
              <span>Agenda Mendatang</span>
            </h3>

            {agendas.length > 0 ? (
              <div className="space-y-4">
                {agendas.map((age) => (
                  <div key={age.id} className="flex items-center gap-4 pb-3 border-b border-dashed border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-slate-900 flex flex-col items-center justify-center shrink-0 border border-amber-100 shadow-xs">
                      <span className="text-base font-black leading-none">{age.day}</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">{age.month}</span>
                    </div>
                    <div className="text-left space-y-0.5 min-w-0">
                      <h4 className="text-xs font-black text-slate-800 leading-tight truncate">{age.title}</h4>
                      <p className="text-[10px] font-semibold text-blue-700 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{age.location}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Tidak ada agenda mendatang.</p>
            )}
          </div>

        </aside>

      </div>

      {/* POPUP ARTICLE DETAIL MODAL */}
      <AnimatePresence>
        {activeArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveArticle(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-7 shadow-2xl relative z-10 border border-slate-100 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <button
                onClick={() => setActiveArticle(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <span className="text-[10px] bg-blue-700 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block shadow-sm">
                    {activeArticle.category}
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 leading-snug">
                    {activeArticle.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {activeArticle.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      {activeArticle.author}
                    </span>
                  </div>
                </div>

                <div className="w-full h-[220px] sm:h-[280px] md:h-[320px] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                  <img src={activeArticle.image} alt={activeArticle.title} className="w-full h-full object-cover" />
                </div>

                <div className="text-sm md:text-base text-slate-700 leading-relaxed font-medium">
                  {activeArticle.content && (
                    <FormattedText content={activeArticle.content} />
                  )}
                </div>

                {/* SOCIAL MEDIA SHARE BAR AT MODAL FOOTER */}
                <div className="mt-6 pt-4 border-t border-slate-200/80 bg-slate-50/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      <span>Bagikan Berita &amp; Artikel ini:</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      Sebarkan informasi bermanfaat ke rekan &amp; wali murid
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'wa', activeArticle.title, activeArticle.summary, undefined, `modal-${activeArticle.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'fb', activeArticle.title, activeArticle.summary, undefined, `modal-${activeArticle.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <span>Facebook</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'twitter', activeArticle.title, activeArticle.summary, undefined, `modal-${activeArticle.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <span>X (Twitter)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'telegram', activeArticle.title, activeArticle.summary, undefined, `modal-${activeArticle.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Telegram</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'copy', activeArticle.title, activeArticle.summary, undefined, `modal-${activeArticle.id}`)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer ${
                        copiedId === `modal-${activeArticle.id}`
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {copiedId === `modal-${activeArticle.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Teks &amp; Tautan Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin Berita</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL VIEW PENGUMUMAN SEKOLAH */}
        {activeTicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200/80"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <span className="bg-amber-100 text-amber-800 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>{activeTicker.category || 'Pengumuman Resmi Sekolah'}</span>
                </span>
                <button
                  onClick={() => setActiveTicker(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                  {activeTicker.text}
                </div>

                {activeTicker.linkUrl && (
                  <div className="pt-2">
                    <a
                      href={activeTicker.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors"
                    >
                      <span>Buka Tautan Lampiran</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* SOCIAL MEDIA SHARE BAR AT MODAL FOOTER */}
                <div className="mt-6 pt-4 border-t border-slate-200/80 bg-slate-50/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      <span>Bagikan Pengumuman Ini:</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      Sebarkan informasi bermanfaat ke rekan &amp; wali murid
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'wa', `[${activeTicker.category || 'Pengumuman'}] Pengumuman Sekolah`, activeTicker.text, activeTicker.linkUrl, `modal-ticker-${activeTicker.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'fb', `[${activeTicker.category || 'Pengumuman'}] Pengumuman Sekolah`, activeTicker.text, activeTicker.linkUrl, `modal-ticker-${activeTicker.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <span>Facebook</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'twitter', `[${activeTicker.category || 'Pengumuman'}] Pengumuman Sekolah`, activeTicker.text, activeTicker.linkUrl, `modal-ticker-${activeTicker.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <span>X (Twitter)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'telegram', `[${activeTicker.category || 'Pengumuman'}] Pengumuman Sekolah`, activeTicker.text, activeTicker.linkUrl, `modal-ticker-${activeTicker.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Telegram</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, 'copy', `[${activeTicker.category || 'Pengumuman'}] Pengumuman Sekolah`, activeTicker.text, activeTicker.linkUrl, `modal-ticker-${activeTicker.id}`)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer ${
                        copiedId === `modal-ticker-${activeTicker.id}`
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {copiedId === `modal-ticker-${activeTicker.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Teks Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin Pengumuman</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
      ` }} />

    </div>
  );
}
