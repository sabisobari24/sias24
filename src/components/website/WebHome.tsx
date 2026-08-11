import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, 
  Award, 
  BookOpen, 
  Users, 
  ArrowRight, 
  TrendingUp, 
  Camera, 
  Eye, 
  ListTodo,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  X,
  Calendar,
  Book,
  Heart,
  Quote,
  GraduationCap,
  Search,
  ShieldCheck,
  CreditCard,
  DollarSign,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle2
} from 'lucide-react';
import { syncCollection } from '../../lib/firebase';
import { INITIAL_WEB_CONTENT } from '../../data/initialWebContent';
import FormattedText from '../common/FormattedText';
import { getYouTubeEmbedUrl } from '../../utils/mediaHelper';

interface WebHomeProps {
  onNavigateToTab: (tab: string) => void;
  totalStudents: number;
  totalTeachers: number;
  teachers?: any[];
}

function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;
    if (endValue === 0) {
      setCount(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing out-cubic or out-quart:
      const easedProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      
      const currentCount = Math.floor(easedProgress * (endValue - startValue) + startValue);
      setCount(currentCount);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value, duration]);

  return <>{count.toLocaleString('id-ID')}</>;
}

export default function WebHome({ onNavigateToTab, totalStudents, totalTeachers, teachers }: WebHomeProps) {
  const [webContent, setWebContent] = useState<any>(() => {
    return INITIAL_WEB_CONTENT.find(c => c.id === 'home') || {
      id: 'home',
      akreditasi: 'Akreditasi A (Unggul)',
      headName: 'Dra. Hj. Endah Purwani M.M',
      headRole: 'Kepala Sekolah',
      headImage: 'https://lh3.googleusercontent.com/d/1SoERM5qadbCj4AeCOUhZcJpDDi0fEVNj',
      headMotto: 'Mari kita bersama-sama membangun generasi cerdas, berkarakter, dan peduli lingkungan. Melalui keselarasan visi dan misi, kita berkomitmen menghadirkan ekosistem pendidikan yang inklusif, ramah anak, serta adaptif terhadap perkembangan teknologi informasi demi mengantarkan anak didik menuju prestasi terbaiknya.',
      slides: [
        {
          image: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
          title: 'Selamat Datang di <span>SMPN 50 Jakarta</span>',
          desc: 'Gedung Utama Lingkungan Sekolah'
        },
        {
          image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=1200',
          title: 'Selamat Atas Raihan <span>Prestasi Provinsi</span>',
          desc: 'Juara 1 Lomba Cerdas Cermat'
        },
        {
          image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200',
          title: 'Mengukir Prestasi di <span>Kancah Nasional</span>',
          desc: 'Medali Emas Olimpiade Sains Nasional'
        }
      ]
    };
  });

  useEffect(() => {
    const unsubscribe = syncCollection<any>(
      'web_content',
      (data) => {
        const found = data.find(c => c.id === 'home');
        if (found) {
          setWebContent(found);
        }
      },
      INITIAL_WEB_CONTENT
    );
    return () => unsubscribe();
  }, []);

  const [showTeachersModal, setShowTeachersModal] = useState(false);
  const [searchTeacherQuery, setSearchTeacherQuery] = useState('');
  const [teacherTab, setTeacherTab] = useState<'guru' | 'tendik'>('guru');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  const slides = webContent.slides || [];
  const headName = webContent.headName || 'Dra. Hj. Endah Purwani M.M';
  const headImage = webContent.headImage || 'https://lh3.googleusercontent.com/d/1SoERM5qadbCj4AeCOUhZcJpDDi0fEVNj';
  const headMotto = webContent.headMotto || '';
  const headBorn = webContent.headBorn || 'Klaten, 26 November 1967';
  const headSubject = webContent.headSubject || 'Manajemen Pendidikan';
  const headHobby = webContent.headHobby || 'Membaca & Pengabdian Masyarakat';

  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeStaff, setActiveStaff] = useState<any>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const fallbackTeachers = useMemo(() => [
    // GURU
    { id: 'g1', name: 'Apryanti Puji Rahayu, S.Pd', subject: 'Matematika', nip: '198404122009042003', email: 'apryanti@smpn50.sch.id', role: 'guru' },
    { id: 'g2', name: 'Rahaulia Nisfulah S., S.Pd', subject: 'Bahasa Indonesia', nip: '199011262015032011', email: 'rahaulia@smpn50.sch.id', role: 'guru' },
    { id: 'g3', name: 'Siti Kurniawati M, S.Pd', subject: 'IPA Terpadu', nip: '198705142010122005', email: 'sitikurnia@smpn50.sch.id', role: 'guru' },
    { id: 'g4', name: 'Rangga Malela, S.Pd', subject: 'IPS Terpadu', nip: '198509032011011002', email: 'rangga@smpn50.sch.id', role: 'guru' },
    { id: 'g5', name: 'Ahmad Syarif, S.Pd', subject: 'Pendidikan Pancasila', nip: '198103182008011004', email: 'ahmadsyarif@smpn50.sch.id', role: 'guru' },
    { id: 'g6', name: 'Sri Wahyuni, S.Pd', subject: 'Seni Budaya', nip: '197902102006042008', email: 'sriwahyuni@smpn50.sch.id', role: 'guru' },
    { id: 'g7', name: 'Budi Santoso, M.Pd', subject: 'Bahasa Inggris', nip: '197607052002121003', email: 'budisantoso@smpn50.sch.id', role: 'guru' },
    { id: 'g8', name: 'Hj. Nurlaila, S.Ag', subject: 'Pendidikan Agama Islam', nip: '197212301998032001', email: 'nurlaila@smpn50.sch.id', role: 'guru' },
    
    // TENDIK
    { id: 't1', name: 'H. Suryadi, S.Sos', subject: 'Kepala Tata Usaha', nip: '196805151992031005', email: 'suryadi.tu@smpn50.sch.id', role: 'piket' },
    { id: 't2', name: 'Eka Wijaya', subject: 'Staf Administrasi TU', nip: '198902142014021001', email: 'ekawijaya@smpn50.sch.id', role: 'piket' },
    { id: 't3', name: 'Rina Herawati', subject: 'Bendahara Sekolah', nip: '198308222010122002', email: 'rina.finance@smpn50.sch.id', role: 'piket' },
    { id: 't4', name: 'Dedi Mulyadi', subject: 'Staf Keamanan', nip: '-', email: 'dedi.security@smpn50.sch.id', role: 'piket' },
    { id: 't5', name: 'Siti Aminah, A.Md', subject: 'Pustakawan', nip: '199304012019032008', email: 'aminah.perpus@smpn50.sch.id', role: 'piket' }
  ], []);

  const allTeachersData = useMemo(() => {
    // Gather all initial staff profiles to use as pre-existing fallbacks
    const allStaff = INITIAL_WEB_CONTENT.flatMap(section => section.staff || []);

    if (!teachers || teachers.length === 0) {
      return fallbackTeachers.map(t => {
        const matched = allStaff.find(s => s.name && (s.name.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(s.name.toLowerCase())));
        return {
          ...t,
          born: matched?.born || '-',
          hobby: matched?.hobby || '-',
          motto: matched?.motto || 'Berdedikasi penuh dalam memajukan kualitas akademis dan karakter siswa-siswi SMP Negeri 50 Jakarta.',
          avatarUrl: matched?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120'
        };
      });
    }

    const normalized = teachers.map((t: any) => {
      const matched = allStaff.find(s => s.name && (s.name.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(s.name.toLowerCase())));
      return {
        id: t.id,
        name: t.name,
        nip: t.nip || '-',
        email: t.email || '-',
        subject: t.subject || (t.role === 'bk' ? 'Bimbingan Konseling' : t.role === 'piket' ? 'Staf Sekolah' : 'Guru Mapel'),
        role: t.role || 'guru',
        born: t.born || matched?.born || '-',
        hobby: t.hobby || matched?.hobby || '-',
        motto: t.motto || matched?.motto || 'Berdedikasi penuh dalam memajukan kualitas akademis dan karakter siswa-siswi SMP Negeri 50 Jakarta.',
        avatarUrl: t.avatarUrl || matched?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120'
      };
    });
    return normalized;
  }, [teachers, fallbackTeachers]);

  const filteredGuru = useMemo(() => {
    return allTeachersData.filter(t => 
      t.role === 'guru' || t.role === 'wali_kelas' || t.role === 'bk' || t.role === 'pelatih' || t.role === 'guru_wali'
    );
  }, [allTeachersData]);

  const filteredTendik = useMemo(() => {
    return allTeachersData.filter(t => 
      !['guru', 'wali_kelas', 'bk', 'pelatih', 'guru_wali'].includes(t.role)
    );
  }, [allTeachersData]);

  const modalList = useMemo(() => {
    const list = teacherTab === 'guru' ? filteredGuru : filteredTendik;
    if (!searchTeacherQuery.trim()) return list;
    const q = searchTeacherQuery.toLowerCase();
    return list.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.subject && t.subject.toLowerCase().includes(q))
    );
  }, [teacherTab, filteredGuru, filteredTendik, searchTeacherQuery]);

  // Auto-select the first teacher/tendik when the modal opens, tab changes, or query changes (only on desktop)
  useEffect(() => {
    if (showTeachersModal && modalList.length > 0) {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      if (isDesktop) {
        if (!selectedTeacher || !modalList.some(t => t.id === selectedTeacher.id)) {
          setSelectedTeacher(modalList[0]);
        }
      }
    } else if (!showTeachersModal) {
      setSelectedTeacher(null);
    }
  }, [showTeachersModal, teacherTab, searchTeacherQuery, modalList, selectedTeacher]);

  const prevSlide = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="space-y-10 pb-12 font-sans">
      {/* HERO SLIDER BANNER */}
      <div className="relative rounded-3xl overflow-hidden h-[440px] shadow-xl border-b-6 border-amber-400 group">
        <div className="absolute inset-0 bg-slate-950">
          <AnimatePresence mode="wait">
            {slides[currentSlide] && (() => {
              const sl = slides[currentSlide];
              const isVideo = sl.type === 'video' || (sl.videoUrl && sl.videoUrl.trim() !== '');
              const ytUrl = isVideo ? getYouTubeEmbedUrl(sl.videoUrl) : null;

              return (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0"
                >
                  {isVideo ? (
                    ytUrl ? (
                      <iframe 
                        src={ytUrl} 
                        title={sl.title || "Video Slider"}
                        className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video 
                        src={sl.videoUrl || sl.image} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        poster={sl.image}
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                    )
                  ) : (
                    <img 
                      src={sl.image} 
                      alt={sl.title ? sl.title.replace(/<[^>]*>/g, '') : "Banner"} 
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {/* Gradient overlay on top of media */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-slate-900/40 hover:bg-amber-400 hover:text-slate-950 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-xs opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-slate-900/40 hover:bg-amber-400 hover:text-slate-950 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-xs opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Content Info */}
        <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-8 md:left-12 right-14 sm:right-auto max-w-2xl text-left text-white z-10 space-y-1 sm:space-y-2 pointer-events-none">
          <motion.h1 
            key={`title-${currentSlide}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base sm:text-2xl md:text-3xl lg:text-4xl font-black leading-snug sm:leading-tight tracking-tight drop-shadow-md break-words line-clamp-2 sm:line-clamp-none"
          >
            {slides[currentSlide] ? (slides[currentSlide].title || slides[currentSlide].welcome || '').replace(/<[^>]*>/g, '').trim() : ''}
          </motion.h1>
          <motion.div 
            key={`ach-${currentSlide}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-300 tracking-wide line-clamp-1"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{slides[currentSlide] ? (slides[currentSlide].desc || slides[currentSlide].achievement || '').replace(/<[^>]*>/g, '').trim() : ''}</span>
          </motion.div>
        </div>

        {/* Dots indicators */}
        <div className="absolute bottom-6 right-8 z-10 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${currentSlide === idx ? 'w-6 bg-amber-400' : 'w-2 bg-white/30'}`}
            />
          ))}
        </div>
      </div>

      {/* TWO COLUMN CONTENT: VISI-MISI & PROFIL KEPSEK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: VISI & MISI (7/12) */}
        <div className="lg:col-span-7 space-y-8 text-left">
          {/* Visi */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b-2 border-slate-100 pb-2">
              <Eye className="w-5.5 h-5.5 text-blue-700" />
              <span>Visi SMPN 50 Jakarta</span>
            </h2>
            <div className="bg-blue-50/50 border-l-6 border-blue-700 rounded-2xl p-6 shadow-xs">
              <p className="text-lg md:text-xl font-extrabold text-blue-800 leading-relaxed italic">
                “{webContent.vision || 'Terwujudnya SMP Negeri 50 Jakarta yang berkarakter, berprestasi, dan berwawasan lingkungan.'}”
              </p>
            </div>
          </div>

          {/* Misi */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b-2 border-slate-100 pb-2">
              <ListTodo className="w-5.5 h-5.5 text-blue-700" />
              <span>Misi SMPN 50 Jakarta</span>
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {(webContent.missions && webContent.missions.length > 0 ? webContent.missions : [
                "Membiasakan murid untuk beriman, bertakwa, dan berakhlak mulia.",
                "Menumbuhkan kedisiplinan, tanggung jawab, dan kemandirian dalam kehidupan sehari-hari.",
                "Mengembangkan budaya literasi, penalaran kritis, serta kreativitas dalam pembelajaran.",
                "Membiasakan komunikasi yang santun, efektif, dan kolaboratif.",
                "Mendorong kepemimpinan murid dengan semangat gotong royong dan kerja sama.",
                "Mengembangkan potensi murid agar berdaya saing dan berprestasi sesuai minat and bakatnya.",
                "Memanfaatkan teknologi informasi secara bijak dalam menghadapi pembelajaran abad 21.",
                "Mewujudkan lingkungan sekolah yang sehat, ramah anak, religius, inklusif, dan menggembirakan."
              ]).map((misi, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-slate-100 hover:border-blue-500/30 hover:bg-slate-50/50 rounded-2xl p-4 flex items-start gap-4 transition-all duration-200 hover:translate-x-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-sm shadow-amber-200">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed pt-1">
                    {misi}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: KEPSEK & MANAGEMENT (5/12) */}
        <div className="lg:col-span-5 space-y-8 text-left">
          
          {/* Kepala Sekolah Card */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b-2 border-slate-100 pb-2">
              <UserCheck className="w-5.5 h-5.5 text-blue-700" />
              <span>Manajemen Sekolah</span>
            </h2>
            
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 text-center shadow-md relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full rounded-tr-3xl -z-10 group-hover:scale-110 transition-transform" />
              
              {/* Photo Frame */}
              <div 
                onClick={() => setActiveStaff({
                  name: headName,
                  role: 'Kepala Sekolah',
                  image: headImage,
                  born: headBorn,
                  subject: headSubject,
                  hobby: headHobby,
                  motto: headMotto || 'Dedikasi tinggi untuk pendidikan.'
                })}
                className="relative w-36 h-44 mx-auto mb-5 p-1.5 bg-gradient-to-tr from-amber-400 via-amber-500 to-blue-700 rounded-2xl shadow-lg group-hover:scale-[1.03] transition-transform group/photo cursor-pointer"
              >
                <div className="w-full h-full rounded-xl bg-white overflow-hidden">
                  <img 
                    src={headImage} 
                    alt={headName}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -top-2 -right-2 bg-blue-800 text-amber-300 w-8 h-8 rounded-lg flex items-center justify-center border-2 border-white shadow-md text-xs">
                  👑
                </div>

                {/* Hover Details Popup */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3.5 hidden group-hover/photo:flex flex-col bg-slate-950/95 text-white rounded-2xl p-4 shadow-2xl border border-white/20 w-64 text-left z-30 transition-all duration-300 pointer-events-none">
                  <div className="space-y-2 text-[10px]">
                    <div className="font-extrabold text-amber-300 text-xs border-b border-white/10 pb-1 mb-1">
                      Detail Profil Kepala Sekolah
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">TTL:</span>
                      <span className="font-semibold text-slate-100">{headBorn}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Bidang Keahlian:</span>
                      <span className="font-semibold text-slate-100">{headSubject}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Hobi / Kegemaran:</span>
                      <span className="font-semibold text-slate-100">{headHobby}</span>
                    </div>
                    <div>
                      <span className="text-amber-300 block font-bold">Motto Hidup:</span>
                      <span className="italic text-slate-200">"{headMotto || 'Dedikasi tinggi untuk pendidikan.'}"</span>
                    </div>
                  </div>
                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-950" />
                </div>
              </div>

              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase block mb-1">Kepala Sekolah</span>
              <div className="inline-block bg-blue-900 text-white font-extrabold text-sm px-5 py-1.5 rounded-lg shadow-sm mb-1.5">
                {headName}
              </div>
              <span className="text-xs text-slate-500 font-semibold block mb-4">NIP. 196711261991032004</span>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-justify text-xs text-slate-700 leading-relaxed relative">
                <span className="absolute -top-3 left-4 text-3xl text-slate-200 font-serif leading-none">“</span>
                <div className="relative z-10 font-medium">
                  <span className="font-extrabold text-blue-900 block mb-1">Sambutan Kepala Sekolah:</span>
                  <FormattedText content={headMotto} />
                </div>
              </div>
            </div>
          </div>

          {/* Jajaran Wakil Kepala Sekolah */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-700" />
              <span>Struktur Wakil Kepala Sekolah</span>
            </h2>
            
            <div className="flex flex-col gap-3">
              {[
                {
                  name: 'Apryanti Puji Rahayu, S.Pd',
                  role: 'Wakil Kurikulum & Akademik',
                  tab: 'akademik',
                  image: 'https://lh3.googleusercontent.com/d/1mvf-GMYWTjFvH5hNFVs1j3DutXvwQtxb'
                },
                {
                  name: 'Rahaulia Nisfulah S., S.Pd',
                  role: 'Wakil Kesiswaan & Karakter',
                  tab: 'kesiswaan',
                  image: 'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r'
                },
                {
                  name: 'Siti Kurniawati M, S.Pd',
                  role: 'Wakil Sarana Prasarana',
                  tab: 'sarpras',
                  image: 'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1'
                }
              ].map((waka) => (
                <button
                  key={waka.name}
                  onClick={() => onNavigateToTab(waka.tab)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/60 rounded-2xl transition-all cursor-pointer hover:translate-x-1.5 hover:border-blue-500/30 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl border-2 border-blue-800 overflow-hidden shrink-0 bg-slate-200">
                      <img 
                        src={waka.image} 
                        alt={waka.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 group-hover:text-blue-800 transition-colors leading-tight">
                        {waka.name}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                        {waka.role}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-800 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Jajaran Guru / Tenaga Pendidik */}
          <div className="space-y-4 pt-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>Direktori Sekolah</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Card GURU */}
              <div 
                onClick={() => {
                  setTeacherTab('guru');
                  setSearchTeacherQuery('');
                  setShowTeachersModal(true);
                }}
                className="bg-white border border-slate-200/80 hover:border-emerald-500/30 hover:bg-emerald-50/20 p-4 rounded-2xl shadow-sm text-left cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider relative z-10">
                  GURU
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold relative z-10">
                  {filteredGuru.length} Pendidik Mapel
                </p>
              </div>

              {/* Card TENDIK */}
              <div 
                onClick={() => {
                  setTeacherTab('tendik');
                  setSearchTeacherQuery('');
                  setShowTeachersModal(true);
                }}
                className="bg-white border border-slate-200/80 hover:border-blue-500/30 hover:bg-blue-50/20 p-4 rounded-2xl shadow-sm text-left cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider relative z-10">
                  TENDIK
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold relative z-10">
                  {filteredTendik.length} Staff Kependidikan
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* STATS OVERVIEW SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm text-left">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
          <TrendingUp className="w-4.5 h-4.5" />
          <span>Statistik Profil &amp; Status Satuan Pendidikan</span>
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Status Akreditasi Card */}
          <div className="p-5 rounded-2xl border bg-amber-50/70 text-amber-950 border-amber-200 flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Status Akreditasi</span>
              <h3 className="text-lg md:text-xl font-black text-amber-950 leading-tight">
                {webContent.akreditasi || 'Akreditasi A (Unggul)'}
              </h3>
              <p className="text-[10px] text-amber-800/90 font-medium">Satuan Pendidikan Terakreditasi BAN-S/M</p>
            </div>
            <div className="w-12 h-12 bg-white/90 border border-amber-300 rounded-xl flex items-center justify-center shrink-0 text-amber-600 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {[
            {
              label: 'Jumlah Siswa',
              value: totalStudents || 496,
              desc: 'Siswa aktif terdaftar',
              theme: 'blue-theme',
              bg: 'bg-blue-50/50 text-blue-800 border-blue-100',
              icon: Users
            },
            {
              label: 'Pilihan Ekstrakurikuler',
              value: 10,
              desc: 'Bidang bakat & minat',
              theme: 'purple-theme',
              bg: 'bg-purple-50/50 text-purple-800 border-purple-100',
              icon: Award
            },
            {
              label: 'Tenaga Pendidik',
              value: totalTeachers || 35,
              desc: 'Guru & staff tata usaha',
              theme: 'teal-theme',
              bg: 'bg-emerald-50/50 text-emerald-800 border-emerald-100',
              icon: BookOpen
            }
          ].map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div 
                key={idx}
                className={`p-5 rounded-2xl border flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-md ${stat.bg}`}
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">{stat.label}</span>
                  <h3 className="text-3xl font-black"><AnimatedCounter value={stat.value} /></h3>
                  <p className="text-[10px] opacity-75 font-medium">{stat.desc}</p>
                </div>
                <div className="w-12 h-12 bg-white/60 border border-current/10 rounded-xl flex items-center justify-center shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: PERSENTASE SISWA PENERIMA KJP PLUS */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Bantuan Siswa
              </span>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Data Realtime
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Persentase Penerima KJP Plus</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Rekapitulasi siswa terdaftar program Bantuan Kartu Jakarta Pintar (KJP) Plus</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-emerald-50/60 border border-emerald-200/80 px-3 py-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Terverifikasi Pusdatik DKI</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Doughnut Chart & Summary Stats */}
          <div className="lg:col-span-7 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 rounded-2xl p-4 sm:p-6 border border-emerald-100/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Distribusi Status Beasiswa</span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                40% Penerima
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-white rounded-2xl border border-emerald-100/60">
              {/* Doughnut SVG */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 transition-all duration-1000 ease-out"
                    strokeDasharray="40, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-emerald-950">40%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">KJP Plus</span>
                </div>
              </div>

              <div className="space-y-2.5 flex-1 w-full">
                <div className="flex items-center justify-between text-xs p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-bold text-slate-700 truncate">Penerima KJP Plus</span>
                  </div>
                  <span className="font-black text-emerald-800 shrink-0 ml-2">198 Siswa</span>
                </div>

                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0"></span>
                    <span className="font-bold text-slate-700 truncate">Siswa Non-KJP</span>
                  </div>
                  <span className="font-black text-slate-600 shrink-0 ml-2">298 Siswa</span>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                  <span>Total Siswa Aktif:</span>
                  <span className="font-bold text-slate-800">{totalStudents || 496} Siswa</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sebaran Tingkat Kelas */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Sebaran Penerima KJP per Tingkat
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
              <div className="p-3 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-2xl flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200/80">
                    7
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Kelas VII</span>
                    <span className="text-[10px] text-slate-400 font-medium">Tingkat Pertama</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700 text-sm block">68 Siswa</span>
                  <span className="text-[10px] text-emerald-600 font-bold">34.3%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-2xl flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200/80">
                    8
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Kelas VIII</span>
                    <span className="text-[10px] text-slate-400 font-medium">Tingkat Menengah</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700 text-sm block">65 Siswa</span>
                  <span className="text-[10px] text-emerald-600 font-bold">32.8%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-2xl flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200/80">
                    9
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Kelas IX</span>
                    <span className="text-[10px] text-slate-400 font-medium">Tingkat Akhir</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700 text-sm block">65 Siswa</span>
                  <span className="text-[10px] text-emerald-600 font-bold">32.8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: LAPORAN KEUANGAN BOS & BOP */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Transparansi Anggaran
              </span>
              <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                TA 2026
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Laporan Keuangan BOS &amp; BOP</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Transparansi realisasi anggaran operasional sekolah (BOS) &amp; pendidikan (BOP)</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-indigo-50/60 border border-indigo-200/80 px-3 py-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Terverifikasi Disdik DKI</span>
          </div>
        </div>

        {/* Realisasi BOS & BOP Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dana BOS */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 rounded-2xl border border-indigo-100 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-extrabold text-indigo-950 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0"></span>
                <span>Dana BOS (Operasional Sekolah)</span>
              </span>
              <span className="font-black text-indigo-700 font-mono text-xs sm:text-sm">
                Rp 395.000.000 <span className="text-[10px] font-normal text-slate-400">/ Rp 420.000.000</span>
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: '94%' }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="text-indigo-700 font-black">Terserap: 94%</span>
              <span>Sisa: Rp 25.000.000</span>
            </div>
          </div>

          {/* Dana BOP */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-50/40 via-white to-slate-50 rounded-2xl border border-cyan-100 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-extrabold text-cyan-950 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-600 shrink-0"></span>
                <span>Dana BOP (Operasional Pendidikan)</span>
              </span>
              <span className="font-black text-cyan-700 font-mono text-xs sm:text-sm">
                Rp 298.000.000 <span className="text-[10px] font-normal text-slate-400">/ Rp 310.000.000</span>
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-1000" style={{ width: '96%' }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="text-cyan-700 font-black">Terserap: 96%</span>
              <span>Sisa: Rp 12.000.000</span>
            </div>
          </div>
        </div>

        {/* Kategori Alokasi Pembelanjaan */}
        <div className="space-y-3 pt-1">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
            Rincian Alokasi Utama Penggunaan Anggaran
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Alokasi I</span>
                <span className="font-bold text-slate-800 text-xs">Buku &amp; Bahan Ajar</span>
              </div>
              <span className="font-black text-indigo-700 text-xs font-mono bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                Rp 185Jt
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Alokasi II</span>
                <span className="font-bold text-slate-800 text-xs">Sarpras &amp; Lab Komputer</span>
              </div>
              <span className="font-black text-indigo-700 text-xs font-mono bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                Rp 210Jt
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Alokasi III</span>
                <span className="font-bold text-slate-800 text-xs">Kegiatan Pembelajaran</span>
              </div>
              <span className="font-black text-indigo-700 text-xs font-mono bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                Rp 160Jt
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Alokasi IV</span>
                <span className="font-bold text-slate-800 text-xs">Pemeliharaan Gedung</span>
              </div>
              <span className="font-black text-indigo-700 text-xs font-mono bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                Rp 138Jt
              </span>
            </div>
          </div>
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
                    <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1">Manajemen Inti</span>
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
                    <span><strong>Keahlian:</strong> {activeStaff.subject}</span>
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

      {/* DIRECTORY TEACHERS & TENDIK MODAL */}
      <AnimatePresence>
        {showTeachersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowTeachersModal(false);
                setSelectedTeacher(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl h-[85vh] max-h-[640px] flex flex-col shadow-2xl relative z-10 border border-slate-100 overflow-hidden text-left"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <GraduationCap className={`w-5 h-5 ${teacherTab === 'guru' ? 'text-emerald-600' : 'text-blue-600'}`} />
                    <span>{teacherTab === 'guru' ? 'GURU' : 'TENDIK'}</span>
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">SMP Negeri 50 Jakarta</p>
                </div>
                <button
                  onClick={() => {
                    setShowTeachersModal(false);
                    setSelectedTeacher(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs & Search Bar */}
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-max">
                  <button
                    onClick={() => {
                      setTeacherTab('guru');
                      setSelectedTeacher(null);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      teacherTab === 'guru' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    GURU
                  </button>
                  <button
                    onClick={() => {
                      setTeacherTab('tendik');
                      setSelectedTeacher(null);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      teacherTab === 'tendik' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    TENDIK
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchTeacherQuery}
                    onChange={(e) => setSearchTeacherQuery(e.target.value)}
                    placeholder="Cari nama atau pelajaran..."
                    className="w-full text-xs font-medium border border-slate-200 hover:border-slate-300 focus:border-emerald-600 focus:outline-none rounded-xl pl-9 pr-4 py-2 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Content area split in two columns (Left: List, Right: Details if selected) */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left: List */}
                <div className={`flex-1 overflow-y-auto p-6 ${selectedTeacher ? 'hidden md:block md:max-w-xs border-r border-slate-100' : ''}`}>
                  <div className="grid grid-cols-1 gap-2">
                    {modalList.map((t) => {
                      const isSelected = selectedTeacher?.id === t.id;
                      const initials = t.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTeacher(t)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 text-left ${
                            isSelected 
                              ? 'bg-emerald-50 border-emerald-300 shadow-xs' 
                              : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-xs border-2 border-white ring-2 transition-all ${
                            isSelected
                              ? (teacherTab === 'guru' ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white ring-emerald-300' : 'bg-gradient-to-tr from-blue-500 to-indigo-400 text-white ring-blue-300')
                              : (teacherTab === 'guru' ? 'bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-800 ring-emerald-100/50' : 'bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-800 ring-blue-100/50')
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">{t.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                              {teacherTab === 'guru' ? t.subject : t.subject || 'Staff'}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {modalList.length === 0 && (
                      <div className="py-12 text-center text-slate-400 text-xs font-mono w-full">
                        Tidak ada data yang cocok.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Details */}
                <div className={`flex-1 bg-slate-50/50 p-6 overflow-y-auto ${!selectedTeacher ? 'hidden md:flex flex-col items-center justify-center text-slate-400 font-mono text-xs' : 'flex flex-col'}`}>
                  {selectedTeacher ? (
                    <div className="space-y-6">
                      {/* Back button for mobile */}
                      <button 
                        onClick={() => setSelectedTeacher(null)}
                        className="md:hidden self-start text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg mb-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Kembali ke Daftar</span>
                      </button>

                      {/* Profile Card */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs text-center relative overflow-hidden">
                        <div className={`absolute top-0 inset-x-0 h-2 ${teacherTab === 'guru' ? 'bg-emerald-600' : 'bg-blue-600'}`} />
                        {selectedTeacher.avatarUrl && selectedTeacher.avatarUrl !== '-' ? (
                          <img 
                            src={selectedTeacher.avatarUrl} 
                            alt={selectedTeacher.name} 
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-full mx-auto mb-3 object-cover shadow-md border-2 border-white ring-4 ring-slate-100"
                          />
                        ) : (
                          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-lg font-black shadow-md border-2 border-white ring-4 ${
                            teacherTab === 'guru' 
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white ring-emerald-100' 
                              : 'bg-gradient-to-tr from-blue-600 to-indigo-400 text-white ring-blue-100'
                          }`}>
                            {selectedTeacher.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                          </div>
                        )}
                        <h4 className="text-sm font-black text-slate-800 leading-tight">{selectedTeacher.name}</h4>
                        <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full mt-1.5">
                          {teacherTab === 'guru' ? 'Tenaga Pendidik / Guru' : 'Tenaga Kependidikan / Staf'}
                        </span>
                      </div>

                      {/* Info Fields */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-xs">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informasi Lengkap</h5>
                        
                        <div className="space-y-3.5 text-xs">
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-slate-500">NIP</span>
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor Induk Pegawai (NIP)</p>
                              <p className="text-xs font-semibold text-slate-700 font-mono">{selectedTeacher.nip || '-'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Book className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {teacherTab === 'guru' ? 'Mata Pelajaran Utama' : 'Bidang Tugas'}
                              </p>
                              <p className="text-xs font-bold text-slate-700">{selectedTeacher.subject || '-'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempat, Tanggal Lahir</p>
                              <p className="text-xs font-bold text-slate-700">{selectedTeacher.born || '-'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Heart className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hobi</p>
                              <p className="text-xs font-bold text-slate-700">{selectedTeacher.hobby || '-'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-slate-500">@</span>
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alamat Email Resmi</p>
                              <p className="text-xs font-semibold text-slate-700 font-mono truncate max-w-[220px] md:max-w-none">{selectedTeacher.email || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Motto / Note */}
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-3">
                        <Quote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Motto Hidup</p>
                          <p className="text-[11px] text-emerald-800 font-medium leading-relaxed italic">
                            "{selectedTeacher.motto || 'Berdedikasi penuh dalam memajukan kualitas akademis dan karakter siswa-siswi SMP Negeri 50 Jakarta.'}"
                          </p>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center space-y-2 py-12">
                      <GraduationCap className="w-8 h-8 text-slate-300 mx-auto animate-bounce" />
                      <p>Pilih salah satu nama untuk melihat detail informasi.</p>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
