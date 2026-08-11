import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Users, 
  Calendar, 
  Clock, 
  User, 
  Book, 
  Camera, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Heart,
  Quote,
  ShieldAlert
} from 'lucide-react';
import { syncCollection } from '../../lib/firebase';
import { INITIAL_WEB_CONTENT } from '../../data/initialWebContent';
import { WebSectionContent } from '../../types';
import { WebIcon } from './WebIcon';

export default function WebKesiswaan() {
  const [webContent, setWebContent] = useState<WebSectionContent>(() => {
    return INITIAL_WEB_CONTENT.find(c => c.id === 'kesiswaan')!;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = syncCollection<WebSectionContent>(
      'web_content',
      (data) => {
        const found = data.find(c => c.id === 'kesiswaan');
        if (found) {
          setWebContent(found);
        }
        setLoading(false);
      },
      INITIAL_WEB_CONTENT
    );
    return () => unsubscribe();
  }, []);

  const staff = webContent.staff;
  const extracurriculars = webContent.extracurriculars || [];
  const slides = webContent.slides;
  
  const [activeEkskulId, setActiveEkskulId] = useState<string | null>(null);
  const [activeStaff, setActiveStaff] = useState<any>(null);
  const [activeJournals, setActiveJournals] = useState<any[]>([]);

  useEffect(() => {
    setCurrentPopupSlide(0);
  }, [activeEkskulId]);

  const activeEkskul = useMemo(() => {
    if (!activeEkskulId) return null;
    return extracurriculars.find((e: any) => e.id === activeEkskulId) || null;
  }, [activeEkskulId, extracurriculars]);

  useEffect(() => {
    if (!activeEkskulId) {
      setActiveJournals([]);
      return;
    }
    const unsubscribe = syncCollection<any>(
      `journals_${activeEkskulId}`,
      (data) => {
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        setActiveJournals(sorted);
      },
      []
    );
    return () => unsubscribe();
  }, [activeEkskulId]);
  
  // 10 Poto Terbaik dan Terbaru yang di Upload Pelatih: 5 dari Daftar Prestasi, 5 dari Kegiatan Terbaru (Images), dan 5 dari Jurnal
  const popupImages = useMemo(() => {
    if (!activeEkskul) return [];
    
    // 5 dari Daftar Prestasi yang memiliki photoUrl
    const achievementsPhotos = (activeEkskul.achievements || [])
      .filter((a: any) => a.photoUrl && a.photoUrl.trim() !== '')
      .map((a: any) => a.photoUrl)
      .slice(0, 5);
      
    // 5 dari Kegiatan Terbaru (images)
    const activitiesPhotos = (activeEkskul.images || [])
      .filter((img: string) => img && img.trim() !== '')
      .slice(0, 5);

    // 5 dari Jurnal yang memiliki photoUrl
    const journalPhotos = activeJournals
      .filter((j: any) => j.photoUrl && j.photoUrl.trim() !== '')
      .map((j: any) => j.photoUrl)
      .slice(0, 5);
 
    // Combine them
    let combined = [...achievementsPhotos, ...activitiesPhotos, ...journalPhotos];
 
    // If combined is empty, fallback to default kesiswaan popupImages or some default fallback
    if (combined.length === 0) {
      combined = webContent.popupImages || [
        'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80'
      ];
    }
 
    return combined;
  }, [activeEkskul, activeJournals, webContent.popupImages]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentPopupSlide, setCurrentPopupSlide] = useState(0);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="space-y-10 pb-12 font-sans text-left">
      
      {/* BANNER HEADER */}
      <div 
        className="bg-cover bg-center rounded-3xl p-10 text-white relative overflow-hidden border-b-6 border-amber-400"
        style={{ 
          backgroundImage: `linear-gradient(135deg, rgba(30, 58, 138, 0.8) 0%, rgba(15, 23, 42, 0.75) 100%), url('${webContent.headerBgImage || 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz'}')` 
        }}
      >
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Karakter &amp; Bakat</span>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{webContent.headerTitle || 'Bidang Kesiswaan & Pengembangan Karakter'}</h1>
          <p className="text-xs md:text-sm text-slate-200">{webContent.headerSubtitle || 'Membina Kedisiplinan Positif, Melatih Kepemimpinan, dan Melejitkan Prestasi Non-Akademik.'}</p>
        </div>
      </div>

      {/* TWO COLUMN: WAKA KESISWAAN PROFILE & STAFF / PROGRAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDEBAR: HEAD OF KESISWAAN */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-5 h-5 text-blue-700" />
              <span>Kepala Bidang</span>
            </h2>
            
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 text-center shadow-md relative overflow-hidden group">
              <div 
                onClick={() => setActiveStaff({
                  name: webContent.headName,
                  role: webContent.headRole,
                  image: webContent.headImage,
                  born: webContent.headBorn || '-',
                  subject: webContent.headSubject || 'Bahasa Indonesia',
                  hobby: webContent.headHobby || '-',
                  motto: webContent.headMotto || 'Dedikasi tinggi untuk pendidikan.'
                })}
                className="relative w-32 h-40 mx-auto mb-4 p-1 bg-gradient-to-tr from-amber-400 to-blue-700 rounded-xl shadow-md cursor-pointer hover:scale-[1.03] transition-transform duration-300 group/waka"
              >
                <div className="w-full h-full rounded-lg bg-slate-100 overflow-hidden">
                  <img 
                    src={webContent.headImage} 
                    alt={webContent.headName}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 bg-blue-700 text-white rounded-lg p-1.5 shadow-md">
                  <Star className="w-3.5 h-3.5 text-amber-300" />
                </div>

                {/* Hover Details Popup */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3.5 hidden group-hover/waka:flex flex-col bg-slate-950/95 text-white rounded-2xl p-4 shadow-2xl border border-white/20 w-56 text-left z-30 transition-all duration-300 pointer-events-none">
                  <div className="space-y-2 text-[10px]">
                    <div className="font-extrabold text-amber-300 text-xs border-b border-white/10 pb-1 mb-1">
                      Detail Profil
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">TTL:</span>
                      <span className="font-semibold text-slate-100">{webContent.headBorn || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Bidang Studi:</span>
                      <span className="font-semibold text-slate-100">{webContent.headSubject || 'Bahasa Indonesia'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Hobi:</span>
                      <span className="font-semibold text-slate-100">{webContent.headHobby || '-'}</span>
                    </div>
                    <div>
                      <span className="text-amber-300 block font-bold">Motto Hidup:</span>
                      <span className="italic text-slate-200">"{webContent.headMotto || 'Dedikasi tinggi untuk pendidikan.'}"</span>
                    </div>
                  </div>
                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-950" />
                </div>
              </div>

              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block mb-0.5">{webContent.headRole}</span>
              <h3 className="font-extrabold text-blue-900 text-sm leading-tight mb-2">{webContent.headName}</h3>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-justify text-xs text-slate-600 leading-relaxed italic">
                <p>
                  <strong>Sambutan:</strong> {webContent.headMotto}
                </p>
              </div>
            </div>
          </div>

          {/* Staf & Pembina OSIS */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-700" />
              <span>Staf Kesiswaan &amp; Pembina OSIS</span>
            </h2>
            
            <div className="flex flex-col gap-3">
              {staff.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setActiveStaff({
                    ...s,
                    born: s.born || '-',
                    subject: s.subject || s.department || '-',
                    hobby: s.hobby || '-',
                    motto: s.motto || 'Dedikasi tinggi.'
                  })}
                  className="w-full flex items-center gap-3.5 p-3 bg-white border border-slate-200/80 rounded-2xl hover:border-blue-700 transition-all text-left shadow-xs hover:translate-x-1 cursor-pointer group/staff relative"
                >
                  <div className="w-11 h-11 rounded-lg border-2 border-blue-700 overflow-hidden shrink-0 bg-slate-200">
                    <img 
                      src={s.image} 
                      alt={s.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 group-hover/staff:text-blue-900 transition-colors leading-tight">
                      {s.name}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                      {s.role}
                    </p>
                  </div>

                  {/* Hover Details Popup */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3.5 hidden group-hover/staff:flex flex-col bg-slate-950/95 text-white rounded-2xl p-4 shadow-2xl border border-white/20 w-56 text-left z-30 transition-all duration-300">
                    <div className="space-y-2 text-[10px]">
                      <div className="font-extrabold text-amber-300 text-xs border-b border-white/10 pb-1 mb-1">
                        Detail Profil Staf
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">TTL:</span>
                        <span className="font-semibold text-slate-100">{s.born || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">Bidang:</span>
                        <span className="font-semibold text-slate-100">{s.subject || s.department || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">Hobi:</span>
                        <span className="font-semibold text-slate-100">{s.hobby || '-'}</span>
                      </div>
                      <div>
                        <span className="text-amber-300 block font-bold">Motto Hidup:</span>
                        <span className="italic text-slate-200">"{s.motto || 'Dedikasi tinggi.'}"</span>
                      </div>
                    </div>
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-950" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT: PROGRAM KERJA UNGGULAN & CAROUSEL */}
        <section className="lg:col-span-8 space-y-8">
          
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Star className="w-5 h-5 text-blue-700" />
              <span>Program Kerja Unggulan Kesiswaan</span>
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {webContent.programs.map((prog, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-5 hover:border-blue-500/30 transition-all hover:bg-blue-50/10 hover:shadow-lg hover:scale-[1.01] duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <WebIcon name={prog.icon || '🏆'} className="w-6 h-6 text-blue-700" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-sm">{prog.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{prog.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DOKUMENTASI CAROUSEL */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-700" />
              <span>Dokumentasi Kegiatan &amp; Program Unggulan</span>
            </h3>

            <div className="relative rounded-2xl overflow-hidden h-[260px] border border-slate-100 group">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                style={{ 
                  backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(0,0,0,0.2) 60%), url(${slides[currentSlide].image})`
                }}
              />
              
              <button 
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-amber-400 text-white hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer border border-white/10 opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-amber-400 text-white hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer border border-white/10 opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5 text-white pointer-events-none space-y-0.5">
                <span className="text-[10px] sm:text-xs font-bold text-amber-300 block line-clamp-1">{(slides[currentSlide].title || '').replace(/<[^>]*>/g, '').trim()}</span>
                <p className="text-[10px] sm:text-xs text-slate-200 leading-normal line-clamp-2">{(slides[currentSlide].desc || '').replace(/<[^>]*>/g, '').trim()}</p>
              </div>
            </div>
          </div>

        </section>

      </div>

      {/* TEN EXTRA CURRICULAR GRID */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Award className="w-5.5 h-5.5 text-blue-700" />
          <span>Ragam 10 Pilihan Ekstrakurikuler (Pengembangan Diri)</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {extracurriculars.map((ekskul) => (
            <button
              key={ekskul.id}
              onClick={() => {
                setActiveEkskulId(ekskul.id);
                setCurrentPopupSlide(0);
              }}
              className="bg-slate-50 hover:bg-white border border-slate-200/60 hover:border-blue-700 p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer hover:-translate-y-1.5 hover:shadow-md group min-h-[140px]"
            >
              <div className="w-11 h-11 rounded-full bg-white group-hover:bg-blue-900 border border-slate-100 group-hover:border-blue-950 shadow-inner flex items-center justify-center text-blue-700 group-hover:text-white transition-all scale-[1.03]">
                <WebIcon name={ekskul.icon} className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-800 group-hover:text-blue-900 transition-colors leading-snug">
                {ekskul.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* POPUP DETAIL STAFF MODAL */}
      <AnimatePresence>
        {activeStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveStaff(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-b from-slate-900 to-blue-950 text-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative z-10 border border-white/10 text-left"
            >
              <button
                onClick={() => setActiveStaff(null)}
                className="absolute right-5 top-5 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="w-16 h-20 rounded-xl border-2 border-amber-400 overflow-hidden shrink-0 bg-slate-200 shadow-md">
                    <img src={activeStaff.image} alt={activeStaff.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <div>
                    <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1">Profil Staff</span>
                    <h3 className="text-sm font-black leading-tight">{activeStaff.name}</h3>
                    <p className="text-[10px] text-slate-300 mt-0.5">{activeStaff.role}</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="popup-row flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <span><strong>Lahir:</strong> {activeStaff.born}</span>
                  </div>
                  <div className="popup-row flex items-start gap-2.5">
                    <Book className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <span><strong>Mata Pelajaran:</strong> {activeStaff.subject}</span>
                  </div>
                  <div className="popup-row flex items-start gap-2.5">
                    <Heart className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <span><strong>Hobi:</strong> {activeStaff.hobby}</span>
                  </div>
                  <div className="popup-row flex flex-col gap-1.5 bg-white/5 border border-white/10 p-3.5 rounded-2xl relative">
                    <Quote className="w-8 h-8 text-white/5 absolute -top-1 right-2" />
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">Motto Hidup:</span>
                    <p className="italic text-slate-200 text-xs leading-relaxed">"{activeStaff.motto}"</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP DETAIL EKSKUL MODAL */}
      <AnimatePresence>
        {activeEkskul && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveEkskulId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-b from-slate-900 to-blue-950 text-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative z-10 border border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <button
                onClick={() => setActiveEkskulId(null)}
                className="absolute right-5 top-5 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-5">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0 border border-white/10">
                    <WebIcon name={activeEkskul.icon} className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                      Ekskul Berprestasi
                    </span>
                    <h3 className="text-lg font-black leading-tight">{activeEkskul.name}</h3>
                  </div>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-1 gap-2.5 text-xs text-left bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-300" />
                    <span><strong>Pembina:</strong> {activeEkskul.coordinator}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-300" />
                    <span><strong>Pelatih / Pembimbing:</strong> {activeEkskul.coach}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-300" />
                    <span><strong>Jadwal Latihan:</strong> {activeEkskul.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-300" />
                    <span><strong>Anggota:</strong> {activeEkskul.members}</span>
                  </div>
                </div>

                {/* Achievements Table */}
                <div className="space-y-2 text-left">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>Prestasi / Penghargaan</span>
                  </h4>
                  
                  <div className="border border-white/10 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-white/10 font-bold border-b border-white/10">
                        <tr>
                          <th className="p-2.5">Prestasi / Penghargaan</th>
                          <th className="p-2.5 w-24">Tingkat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeEkskul.achievements.map((a, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 text-slate-200">
                              <div className="flex items-center gap-2.5">
                                {a.photoUrl && (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-slate-950 shrink-0">
                                    <img src={a.photoUrl} alt={a.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                )}
                                <span>{a.name}</span>
                              </div>
                            </td>
                            <td className="p-2.5"><span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md font-bold text-[10px]">{a.scope}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Jurnal Kegiatan / Latihan Pelatih */}
                <div className="space-y-2 text-left">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Book className="w-4 h-4" />
                    <span>Jurnal Latihan Terbaru (Pelatih)</span>
                  </h4>
                  
                  {activeJournals.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Belum ada jurnal latihan terbaru yang diinput oleh pelatih.</p>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                      {activeJournals.slice(0, 3).map((journal, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-amber-400 font-bold">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {journal.date}
                            </span>
                            <span className="bg-blue-900/40 px-2 py-0.5 rounded-full text-slate-300">
                              {journal.attendeesCount || 0} Hadir
                            </span>
                          </div>
                          <p className="font-extrabold text-xs text-slate-100">{journal.material}</p>
                          {journal.notes && (
                            <p className="text-[11px] text-slate-300 leading-relaxed italic border-l-2 border-amber-400/50 pl-2">
                              {journal.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Micro Dokumentasi Slider */}
                {(() => {
                  const ekskulImages = (activeEkskul.images && activeEkskul.images.length > 0)
                    ? activeEkskul.images
                    : popupImages;
                  const validIndex = ekskulImages.length > 0 ? (currentPopupSlide % ekskulImages.length) : 0;

                  return (
                    <div className="space-y-2 text-left">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                        <Camera className="w-4 h-4" />
                        <span>Galeri Dokumentasi {activeEkskul.name} ({ekskulImages.length} Foto)</span>
                      </h4>

                      <div className="relative rounded-xl overflow-hidden h-[150px] border border-white/10">
                        <img 
                          src={ekskulImages[validIndex] || ekskulImages[0]} 
                          alt={`Dokumentasi ${activeEkskul.name}`}
                          className="w-full h-full object-cover"
                        />

                        {ekskulImages.length > 1 && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPopupSlide((prev) => (prev - 1 + ekskulImages.length) % ekskulImages.length);
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPopupSlide((prev) => (prev + 1) % ekskulImages.length);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            <div className="absolute bottom-2 right-2 bg-slate-950/85 px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-300 font-mono">
                              {validIndex + 1} / {ekskulImages.length}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
