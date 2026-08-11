import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  Calendar, 
  Clock, 
  User, 
  Book, 
  Camera, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  ArrowRight,
  ExternalLink,
  Shield,
  Search,
  Quote,
  Heart
} from 'lucide-react';
import { syncCollection } from '../../lib/firebase';
import { INITIAL_WEB_CONTENT } from '../../data/initialWebContent';
import { WebSectionContent } from '../../types';
import { WebIcon } from './WebIcon';

export default function WebAkademik() {
  const [webContent, setWebContent] = useState<WebSectionContent>(() => {
    return INITIAL_WEB_CONTENT.find(c => c.id === 'academic')!;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = syncCollection<WebSectionContent>(
      'web_content',
      (data) => {
        const found = data.find(c => c.id === 'academic');
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
  const subjects = webContent.subjects || [];
  const slides = webContent.slides;
  const popupImages = webContent.popupImages || [];

  const [activeSubject, setActiveSubject] = useState<any>(null);
  const [activeStaff, setActiveStaff] = useState<any>(null);
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
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.75) 100%), url('${webContent.headerBgImage || 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz'}')` 
        }}
      >
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Kurikulum Merdeka</span>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">{webContent.headerTitle || 'Bidang Akademik & Kurikulum'}</h1>
          <p className="text-xs md:text-sm text-slate-200">{webContent.headerSubtitle || 'Mewujudkan Standar Pendidikan Berkualitas Tinggi, Inovatif, dan Berpusat pada Murid.'}</p>
        </div>
      </div>

      {/* TWO COLUMN: WAKA KESISWAAN PROFILE & PROGRAM KERJA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDEBAR: WAKA AKADEMIK */}
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
                  born: webContent.headBorn || 'Klaten, 14 April 1980',
                  subject: webContent.headSubject || 'Bahasa Inggris / Kurikulum',
                  hobby: webContent.headHobby || 'Membaca & Menulis Jurnal',
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

                {/* Hover Details Popup */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3.5 hidden group-hover/waka:flex flex-col bg-slate-950/95 text-white rounded-2xl p-4 shadow-2xl border border-white/20 w-56 text-left z-30 transition-all duration-300 pointer-events-none">
                  <div className="space-y-2 text-[10px]">
                    <div className="font-extrabold text-amber-300 text-xs border-b border-white/10 pb-1 mb-1">
                      Detail Profil
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">TTL:</span>
                      <span className="font-semibold text-slate-100">{webContent.headBorn || 'Klaten, 14 April 1980'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Bidang Studi:</span>
                      <span className="font-semibold text-slate-100">{webContent.headSubject || 'Bahasa Inggris / Kurikulum'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Hobi:</span>
                      <span className="font-semibold text-slate-100">{webContent.headHobby || 'Membaca & Menulis Jurnal'}</span>
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

          {/* Staf Kurikulum */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-700" />
              <span>Staf Kurikulum</span>
            </h2>
            <div className="flex flex-col gap-3">
              {staff.map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveStaff({
                    name: s.name,
                    role: s.role,
                    image: s.image,
                    born: s.born || 'Jakarta, 5 Juli 1988',
                    subject: s.subject || s.department || 'Penilaian & Kurikulum',
                    hobby: s.hobby || 'Teknologi Informasi',
                    motto: s.motto || 'Bekerja dengan ikhlas dan berdedikasi tinggi.'
                  })}
                  className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-blue-700 hover:translate-x-1 duration-300 cursor-pointer text-left group/staff relative"
                >
                  <div className="w-11 h-11 rounded-lg border-2 border-blue-700 overflow-hidden shrink-0 bg-slate-200">
                    <img 
                      src={s.image} 
                      alt={s.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-slate-800 group-hover/staff:text-blue-900 duration-300">{s.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{s.role}</p>
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
              <Award className="w-5 h-5 text-blue-700" />
              <span>Program Kerja Unggulan Akademik</span>
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
              <span>Dokumentasi Pembelajaran &amp; Kurikulum Merdeka</span>
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

              <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none space-y-0.5">
                <span className="text-[10px] font-bold text-amber-300 block">{slides[currentSlide].title}</span>
                <p className="text-xs text-slate-200 leading-normal">{slides[currentSlide].desc}</p>
              </div>
            </div>
          </div>

        </section>

      </div>

      {/* TEN SUBJECTS GRID */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <BookOpen className="w-5.5 h-5.5 text-blue-700" />
          <span>Struktur 10 Mata Pelajaran Kurikulum Merdeka</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setActiveSubject(sub);
                setCurrentPopupSlide(0);
              }}
              className="bg-slate-50 hover:bg-white border border-slate-200/60 hover:border-blue-700 p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer hover:-translate-y-1.5 hover:shadow-md group min-h-[140px]"
            >
              <div className="w-11 h-11 rounded-full bg-white group-hover:bg-blue-900 border border-slate-100 group-hover:border-blue-950 shadow-inner flex items-center justify-center text-blue-700 group-hover:text-white transition-all scale-[1.03]">
                <WebIcon name={sub.icon} className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-800 group-hover:text-blue-900 transition-colors leading-snug">
                {sub.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* POPUP DETAIL SUBJECT MODAL */}
      <AnimatePresence>
        {activeSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSubject(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-b from-slate-900 to-blue-950 text-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative z-10 border border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <button
                onClick={() => setActiveSubject(null)}
                className="absolute right-5 top-5 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-5">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0 border border-white/10">
                    <WebIcon name={activeSubject.icon} className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                      Detail Mapel
                    </span>
                    <h3 className="text-lg font-black leading-tight">{activeSubject.name}</h3>
                  </div>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-1 gap-2.5 text-xs text-left bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-300" />
                    <span><strong>Koordinator:</strong> {activeSubject.coordinator}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-300" />
                    <span><strong>Pengampu:</strong> {activeSubject.teachers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-300" />
                    <span><strong>Alokasi:</strong> {activeSubject.hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Book className="w-4 h-4 text-amber-300" />
                    <span><strong>Metode:</strong> {activeSubject.method}</span>
                  </div>
                </div>

                {/* Competencies Table */}
                <div className="space-y-2 text-left">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>Fokus Kompetensi</span>
                  </h4>
                  
                  <div className="border border-white/10 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-white/10 font-bold border-b border-white/10">
                        <tr>
                          <th className="p-2.5">Fokus Pembelajaran</th>
                          <th className="p-2.5 w-24">Tingkat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeSubject.focus.map((f, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 text-slate-200">{f.topic}</td>
                            <td className="p-2.5"><span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md font-bold text-[10px]">{f.level}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Micro Dokumentasi Slider */}
                {(() => {
                  const subjectImages = (activeSubject.images && activeSubject.images.length > 0)
                    ? activeSubject.images
                    : popupImages;
                  const validIndex = subjectImages.length > 0 ? (currentPopupSlide % subjectImages.length) : 0;

                  return (
                    <div className="space-y-2 text-left">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                        <Camera className="w-4 h-4" />
                        <span>Galeri Dokumentasi {activeSubject.name} ({subjectImages.length} Foto)</span>
                      </h4>

                      <div className="relative rounded-xl overflow-hidden h-[160px] border border-white/10">
                        <img 
                          src={subjectImages[validIndex] || subjectImages[0]} 
                          alt={`Dokumentasi ${activeSubject.name}`}
                          className="w-full h-full object-cover"
                        />

                        {subjectImages.length > 1 && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPopupSlide((prev) => (prev - 1 + subjectImages.length) % subjectImages.length);
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPopupSlide((prev) => (prev + 1) % subjectImages.length);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            <div className="absolute bottom-2 right-2 bg-slate-950/85 px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-300 font-mono">
                              {validIndex + 1} / {subjectImages.length}
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
                    <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1">Profil Bidang</span>
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
                    <span><strong>Bidang Studi:</strong> {activeStaff.subject}</span>
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

    </div>
  );
}
