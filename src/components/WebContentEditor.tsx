import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  User, 
  BookOpen, 
  Award, 
  Sparkles, 
  Building2,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Newspaper,
  Clock,
  Calendar,
  School,
  ListTodo,
  Eye,
  Instagram,
  MessageCircle,
  Mail,
  Video,
  Play,
  Link2,
  Upload
} from 'lucide-react';
import { syncCollection, saveDocument } from '../lib/firebase';
import { INITIAL_WEB_CONTENT } from '../data/initialWebContent';
import { WebSectionContent, WebStaff, WebProgram, WebSlide, WebSubject, WebExtracurricular, WebFacility, WebArticle, WebTicker, WebActivity, WebAgenda } from '../types';
import MediaUploadSelector from './MediaUploadSelector';
import TextFormattingToolbar from './common/TextFormattingToolbar';
import { getYouTubeEmbedUrl } from '../utils/mediaHelper';
import { WebIcon } from './website/WebIcon';

export default function WebContentEditor() {
  const [contents, setContents] = useState<WebSectionContent[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<'home' | 'academic' | 'kesiswaan' | 'sarpras' | 'berita'>('home');
  const [activeSubTab, setActiveSubTab] = useState<'header' | 'staff' | 'programs' | 'slides' | 'specialized' | 'gallery' | 'articles' | 'tickers' | 'activities' | 'agendas' | 'vision-mission'>('header');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Synchronization with Firestore
  useEffect(() => {
    const unsubscribe = syncCollection<WebSectionContent>(
      'web_content', 
      (data) => {
        // Sort to ensure home, academic, kesiswaan, sarpras, berita order
        const sorted = [...data].sort((a, b) => {
          const order = { home: 1, academic: 2, kesiswaan: 3, sarpras: 4, berita: 5 };
          return (order[a.id] || 99) - (order[b.id] || 99);
        });
        setContents(sorted);
        setLoading(false);
      },
      INITIAL_WEB_CONTENT
    );

    return () => unsubscribe();
  }, []);

  const activeSection = contents.find(c => c.id === activeSectionId);

  // Local editor states for Header Profile & Section Banner Header
  const [headerBgImage, setHeaderBgImage] = useState('');
  const [headerTitle, setHeaderTitle] = useState('');
  const [headerSubtitle, setHeaderSubtitle] = useState('');
  const [headName, setHeadName] = useState('');
  const [headRole, setHeadRole] = useState('');
  const [headImage, setHeadImage] = useState('');
  const [headMotto, setHeadMotto] = useState('');
  const [headBorn, setHeadBorn] = useState('');
  const [headSubject, setHeadSubject] = useState('');
  const [headHobby, setHeadHobby] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [akreditasi, setAkreditasi] = useState('Akreditasi A (Unggul)');
  const [vision, setVision] = useState('');
  const [missions, setMissions] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Local editor states for array modals/drawers
  const [editingStaffIdx, setEditingStaffIdx] = useState<number | null>(null);
  const [staffForm, setStaffForm] = useState<Partial<WebStaff>>({});

  const [editingProgIdx, setEditingProgIdx] = useState<number | null>(null);
  const [progForm, setProgForm] = useState<Partial<WebProgram>>({});

  const [editingSlideIdx, setEditingSlideIdx] = useState<number | null>(null);
  const [slideForm, setSlideForm] = useState<Partial<WebSlide>>({});

  // Specialized forms
  const [editingSubjectIdx, setEditingSubjectIdx] = useState<number | null>(null);
  const [subjectForm, setSubjectForm] = useState<Partial<WebSubject>>({});

  const [editingExtraIdx, setEditingExtraIdx] = useState<number | null>(null);
  const [extraForm, setExtraForm] = useState<Partial<WebExtracurricular>>({});

  const [editingFacilityIdx, setEditingFacilityIdx] = useState<number | null>(null);
  const [facilityForm, setFacilityForm] = useState<Partial<WebFacility>>({});

  // News states
  const [editingArticleIdx, setEditingArticleIdx] = useState<number | null>(null);
  const [articleForm, setArticleForm] = useState<Partial<WebArticle>>({});

  const [editingTickerIdx, setEditingTickerIdx] = useState<number | null>(null);
  const [tickerForm, setTickerForm] = useState<Partial<WebTicker>>({});

  const [editingActivityIdx, setEditingActivityIdx] = useState<number | null>(null);
  const [activityForm, setEditingActivityForm] = useState<Partial<WebActivity>>({});

  const [editingAgendaIdx, setEditingAgendaIdx] = useState<number | null>(null);
  const [agendaForm, setAgendaForm] = useState<Partial<WebAgenda>>({});

  // Gallery images list state
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  // Update local states when active section changes
  useEffect(() => {
    if (activeSection) {
      if (activeSection.id === 'berita') {
        setActiveSubTab('articles');
      } else if (activeSection.id === 'home') {
        if (!['header', 'slides', 'vision-mission'].includes(activeSubTab)) {
          setActiveSubTab('header');
        }
      } else {
        if (['articles', 'tickers', 'activities', 'agendas'].includes(activeSubTab)) {
          setActiveSubTab('header');
        }
      }
      setHeaderBgImage(activeSection.headerBgImage || (
        activeSection.id === 'academic' ? 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz' :
        activeSection.id === 'kesiswaan' ? 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz' :
        activeSection.id === 'sarpras' ? 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz' : ''
      ));
      setHeaderTitle(activeSection.headerTitle || (
        activeSection.id === 'academic' ? 'Bidang Akademik & Kurikulum' :
        activeSection.id === 'kesiswaan' ? 'Bidang Kesiswaan & Pengembangan Karakter' :
        activeSection.id === 'sarpras' ? 'Bidang Sarana & Prasarana' : ''
      ));
      setHeaderSubtitle(activeSection.headerSubtitle || (
        activeSection.id === 'academic' ? 'Mewujudkan Standar Pendidikan Berkualitas Tinggi, Inovatif, dan Berpusat pada Murid.' :
        activeSection.id === 'kesiswaan' ? 'Membina Kedisiplinan Positif, Melatih Kepemimpinan, dan Melejitkan Prestasi Non-Akademik.' :
        activeSection.id === 'sarpras' ? 'Mewujudkan Infrastruktur Sekolah yang Modern, Nyaman, Bersih, Sehat, dan Berwawasan Lingkungan.' : ''
      ));
      setHeadName(activeSection.headName || '');
      setHeadRole(activeSection.headRole || '');
      setHeadImage(activeSection.headImage || '');
      setHeadMotto(activeSection.headMotto || '');
      setHeadBorn(activeSection.headBorn || '');
      setHeadSubject(activeSection.headSubject || '');
      setHeadHobby(activeSection.headHobby || '');
      setSchoolLogo(activeSection.schoolLogo || '');
      setAkreditasi(activeSection.akreditasi || 'Akreditasi A (Unggul)');
      setVision(activeSection.vision || '');
      setMissions(activeSection.missions || []);
      setInstagram(activeSection.instagram || '');
      setWhatsapp(activeSection.whatsapp || '');
      setEmail(activeSection.email || '');
      setGalleryUrls(activeSection.popupImages || []);
      
      // Close any active sub-editors
      setEditingStaffIdx(null);
      setEditingProgIdx(null);
      setEditingSlideIdx(null);
      setEditingSubjectIdx(null);
      setEditingExtraIdx(null);
      setEditingFacilityIdx(null);
      setEditingArticleIdx(null);
      setEditingTickerIdx(null);
      setEditingActivityIdx(null);
      setEditingAgendaIdx(null);
    }
  }, [activeSectionId, contents]);

  const showToast = (message: string) => {
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Save changes to Firestore
  const handleSaveSection = async (updatedFields: Partial<WebSectionContent>) => {
    if (!activeSection) return;
    const fullUpdated = { ...activeSection, ...updatedFields };
    // Optimistically update local contents state immediately so deletions/edits reflect instantly
    setContents(prev => prev.map(item => item.id === activeSection.id ? fullUpdated : item));
    try {
      // Save full updated section to Firestore so all devices receive complete data
      await saveDocument('web_content', activeSection.id, fullUpdated);
      showToast('Konten Berhasil Disinkronkan!');
    } catch (err) {
      console.error(err);
      showToast('Error Menyimpan Konten');
    }
  };

  const handleSaveHeader = () => {
    handleSaveSection({
      headName,
      headRole,
      headImage,
      headMotto,
      headBorn,
      headSubject,
      headHobby,
      ...(activeSectionId === 'home' 
        ? { akreditasi, schoolLogo, vision, missions, instagram, whatsapp, email } 
        : { headerBgImage, headerTitle, headerSubtitle }
      )
    });
  };

  // Staff CRUD Operations
  const handleSaveStaff = () => {
    if (!activeSection) return;
    const staffList = [...(activeSection.staff || [])];
    if (editingStaffIdx === null) return;

    const newStaff: WebStaff = {
      name: staffForm.name || '',
      role: staffForm.role || '',
      image: staffForm.image || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
      born: staffForm.born || '',
      subject: staffForm.subject || '',
      department: staffForm.department || '',
      hobby: staffForm.hobby || '',
      motto: staffForm.motto || ''
    };

    if (editingStaffIdx === -1) {
      staffList.push(newStaff);
    } else {
      staffList[editingStaffIdx] = newStaff;
    }

    handleSaveSection({ staff: staffList });
    setEditingStaffIdx(null);
  };

  const handleDeleteStaff = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Apakah Anda yakin ingin menghapus staf ini?')) {
      const staffList = [...(activeSection.staff || [])];
      staffList.splice(idx, 1);
      handleSaveSection({ staff: staffList });
    }
  };

  // Program CRUD Operations
  const handleSaveProgram = () => {
    if (!activeSection) return;
    const list = [...(activeSection.programs || [])];
    if (editingProgIdx === null) return;

    const newProg: WebProgram = {
      title: progForm.title || '',
      desc: progForm.desc || '',
      icon: progForm.icon || '🏆'
    };

    if (editingProgIdx === -1) {
      list.push(newProg);
    } else {
      list[editingProgIdx] = newProg;
    }

    handleSaveSection({ programs: list });
    setEditingProgIdx(null);
  };

  const handleDeleteProgram = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus program kerja ini?')) {
      const list = [...(activeSection.programs || [])];
      list.splice(idx, 1);
      handleSaveSection({ programs: list });
    }
  };

  // Slide CRUD Operations
  const handleSaveSlide = () => {
    if (!activeSection) return;
    const list = [...(activeSection.slides || [])];
    if (editingSlideIdx === null) return;

    if (editingSlideIdx === -1 && list.length >= 10) {
      alert('Jumlah maksimum slider adalah 10 slide.');
      return;
    }

    const newSlide: WebSlide = {
      image: slideForm.image || (slideForm.type === 'video' ? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600' : 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz'),
      title: (slideForm.title || '').replace(/<[^>]*>/g, '').trim(),
      desc: (slideForm.desc || '').replace(/<[^>]*>/g, '').trim(),
      type: slideForm.type || 'image',
      videoUrl: slideForm.videoUrl || ''
    };

    if (editingSlideIdx === -1) {
      list.push(newSlide);
    } else {
      list[editingSlideIdx] = newSlide;
    }

    handleSaveSection({ slides: list });
    setEditingSlideIdx(null);
  };

  const handleDeleteSlide = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus slide dokumentasi ini?')) {
      const list = [...(activeSection.slides || [])];
      list.splice(idx, 1);
      handleSaveSection({ slides: list });
    }
  };

  // Subject CRUD Operations (Academic specific)
  const handleSaveSubject = () => {
    if (!activeSection) return;
    const list = [...(activeSection.subjects || [])];
    if (editingSubjectIdx === null) return;

    const newSub: WebSubject = {
      id: subjectForm.id || Math.random().toString(36).substring(7),
      name: subjectForm.name || '',
      icon: subjectForm.icon || 'book-open',
      coordinator: subjectForm.coordinator || '',
      teachers: subjectForm.teachers || '',
      hours: subjectForm.hours || '',
      method: subjectForm.method || '',
      focus: subjectForm.focus || [],
      images: subjectForm.images || []
    };

    if (editingSubjectIdx === -1) {
      list.push(newSub);
    } else {
      list[editingSubjectIdx] = newSub;
    }

    handleSaveSection({ subjects: list });
    setEditingSubjectIdx(null);
  };

  const handleDeleteSubject = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus mata pelajaran ini dari web?')) {
      const list = [...(activeSection.subjects || [])];
      list.splice(idx, 1);
      handleSaveSection({ subjects: list });
    }
  };

  // Extracurricular CRUD Operations (Kesiswaan specific)
  const handleSaveExtra = () => {
    if (!activeSection) return;
    const list = [...(activeSection.extracurriculars || [])];
    if (editingExtraIdx === null) return;

    const newExtra: WebExtracurricular = {
      id: extraForm.id || Math.random().toString(36).substring(7),
      name: extraForm.name || '',
      icon: extraForm.icon || '🏆',
      coordinator: extraForm.coordinator || '',
      coach: extraForm.coach || '',
      members: extraForm.members || '',
      schedule: extraForm.schedule || '',
      achievements: extraForm.achievements || [],
      images: extraForm.images || []
    };

    if (editingExtraIdx === -1) {
      list.push(newExtra);
    } else {
      list[editingExtraIdx] = newExtra;
    }

    handleSaveSection({ extracurriculars: list });
    setEditingExtraIdx(null);
  };

  const handleDeleteExtra = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus Ekstrakurikuler ini?')) {
      const list = [...(activeSection.extracurriculars || [])];
      list.splice(idx, 1);
      handleSaveSection({ extracurriculars: list });
    }
  };

  // Facility CRUD Operations (Sarpras specific)
  const handleSaveFacility = () => {
    if (!activeSection) return;
    const list = [...(activeSection.facilities || [])];
    if (editingFacilityIdx === null) return;

    const newFac: WebFacility = {
      id: facilityForm.id || Math.random().toString(36).substring(7),
      name: facilityForm.name || '',
      icon: facilityForm.icon || '🏫',
      coordinator: facilityForm.coordinator || '',
      condition: facilityForm.condition || '',
      capacity: facilityForm.capacity || '',
      mainFeatures: facilityForm.mainFeatures || '',
      inventory: facilityForm.inventory || [],
      images: facilityForm.images || []
    };

    if (editingFacilityIdx === -1) {
      list.push(newFac);
    } else {
      list[editingFacilityIdx] = newFac;
    }

    handleSaveSection({ facilities: list });
    setEditingFacilityIdx(null);
  };

  const handleDeleteFacility = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus sarana utama ini?')) {
      const list = [...(activeSection.facilities || [])];
      list.splice(idx, 1);
      handleSaveSection({ facilities: list });
    }
  };

  // Article CRUD Operations
  const handleSaveArticle = () => {
    if (!activeSection) return;
    const list = [...(activeSection.articles || [])];
    if (editingArticleIdx === null) return;

    const newArticle: WebArticle = {
      id: articleForm.id || Math.random().toString(36).substring(7),
      title: articleForm.title || '',
      category: articleForm.category || 'Edukasi',
      date: articleForm.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      author: articleForm.author || 'Admin Sekolah',
      image: articleForm.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
      summary: articleForm.summary || '',
      content: articleForm.content || []
    };

    if (editingArticleIdx === -1) {
      list.push(newArticle);
    } else {
      list[editingArticleIdx] = newArticle;
    }

    handleSaveSection({ articles: list });
    setEditingArticleIdx(null);
  };

  const handleDeleteArticle = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Apakah Anda yakin ingin menghapus artikel ini?')) {
      const list = [...(activeSection.articles || [])];
      list.splice(idx, 1);
      handleSaveSection({ articles: list });
    }
  };

  // Ticker CRUD Operations
  const handleSaveTicker = () => {
    if (!activeSection) return;
    const list = [...(activeSection.tickers || [])];
    if (editingTickerIdx === null) return;

    const newTicker: WebTicker = {
      id: tickerForm.id || Math.random().toString(36).substring(7),
      category: tickerForm.category || 'Sekolah',
      text: tickerForm.text || '',
      linkUrl: tickerForm.linkUrl || ''
    };

    if (editingTickerIdx === -1) {
      list.push(newTicker);
    } else {
      list[editingTickerIdx] = newTicker;
    }

    handleSaveSection({ tickers: list });
    setEditingTickerIdx(null);
  };

  const handleDeleteTicker = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus teks berita berjalan ini?')) {
      const list = [...(activeSection.tickers || [])];
      list.splice(idx, 1);
      handleSaveSection({ tickers: list });
    }
  };

  // Activity CRUD Operations
  const handleSaveActivity = () => {
    if (!activeSection) return;
    const list = [...(activeSection.activities || [])];
    if (editingActivityIdx === null) return;

    const newAct: WebActivity = {
      id: activityForm.id || Math.random().toString(36).substring(7),
      day: activityForm.day || 'Senin',
      title: activityForm.title || '',
      desc: activityForm.desc || '',
      time: activityForm.time || '07.30 - selesai'
    };

    if (editingActivityIdx === -1) {
      list.push(newAct);
    } else {
      list[editingActivityIdx] = newAct;
    }

    handleSaveSection({ activities: list });
    setEditingActivityIdx(null);
  };

  const handleDeleteActivity = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus kegiatan terdaftar ini?')) {
      const list = [...(activeSection.activities || [])];
      list.splice(idx, 1);
      handleSaveSection({ activities: list });
    }
  };

  // Agenda CRUD Operations
  const handleSaveAgenda = () => {
    if (!activeSection) return;
    const list = [...(activeSection.agendas || [])];
    if (editingAgendaIdx === null) return;

    const newAge: WebAgenda = {
      id: agendaForm.id || Math.random().toString(36).substring(7),
      day: agendaForm.day || '01',
      month: agendaForm.month || 'JUL',
      title: agendaForm.title || '',
      location: agendaForm.location || 'Lapangan Sekolah'
    };

    if (editingAgendaIdx === -1) {
      list.push(newAge);
    } else {
      list[editingAgendaIdx] = newAge;
    }

    handleSaveSection({ agendas: list });
    setEditingAgendaIdx(null);
  };

  const handleDeleteAgenda = (idx: number) => {
    if (!activeSection) return;
    if (confirm('Hapus agenda mendatang ini?')) {
      const list = [...(activeSection.agendas || [])];
      list.splice(idx, 1);
      handleSaveSection({ agendas: list });
    }
  };

  // Popup Gallery save
  const handleSaveGallery = () => {
    handleSaveSection({ popupImages: galleryUrls });
  };

  const handleGalleryUrlChange = (idx: number, val: string) => {
    const updated = [...galleryUrls];
    updated[idx] = val;
    setGalleryUrls(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white border border-slate-100 rounded-3xl min-h-[400px]">
        <div className="w-10 h-10 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-mono">Sinkronisasi Database Konten...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SECTION SELECTOR HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz')" }} />
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">CMS Konten Realtime</span>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Kelola Konten <span className="text-amber-300">Tampilan Web</span></h2>
              <p className="text-xs text-slate-400">Atur sambutan kepala bidang, foto slide, staf, mapel, ekskul, dan sarana sekolah secara instan.</p>
            </div>
            
            {saveStatus && (
              <div className="bg-emerald-800 text-emerald-100 text-xs px-4 py-2 rounded-2xl flex items-center gap-1.5 border border-emerald-700 font-bold animate-pulse">
                <Check className="w-4 h-4" />
                <span>{saveStatus}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
            {[
              { id: 'home', label: 'Beranda', icon: School },
              { id: 'academic', label: 'Akademik', icon: BookOpen },
              { id: 'kesiswaan', label: 'Kesiswaan', icon: Award },
              { id: 'sarpras', label: 'Sarana Prasarana', icon: Building },
              { id: 'berita', label: 'Berita & Pengumuman', icon: Newspaper },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSectionId(sec.id as any);
                  setActiveSubTab('header');
                }}
                className={`py-2.5 px-2 md:px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeSectionId === sec.id 
                    ? 'bg-amber-400 text-slate-950 shadow-md' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <sec.icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">{sec.label}</span>
                <span className="inline md:hidden">{sec.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CORE WRAPPER: NAVIGATION SUB-TABS & ACTIVE CMS COMPONENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SUB NAVIGATION TAB RAIL */}
        <aside className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-4 space-y-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Kelompok Konten</p>
          {activeSectionId === 'berita' ? (
            [
              { id: 'articles', label: 'Artikel & Edukasi', icon: Newspaper },
              { id: 'tickers', label: 'Hot News Ticker', icon: Sparkles },
              { id: 'activities', label: 'Jadwal Pekan Ini', icon: Clock },
              { id: 'agendas', label: 'Agenda Mendatang', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer border ${
                  activeSubTab === tab.id 
                    ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900' 
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeSubTab === tab.id ? 'text-emerald-800' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            ))
          ) : activeSectionId === 'home' ? (
            [
              { id: 'header', label: 'Kepala Sekolah & Sambutan', icon: User },
              { id: 'slides', label: 'Carousel Foto Banner', icon: ImageIcon },
              { id: 'vision-mission', label: 'Visi, Misi & Media Sosial', icon: ListTodo }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer border ${
                  activeSubTab === tab.id 
                    ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900' 
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeSubTab === tab.id ? 'text-emerald-800' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            ))
          ) : (
            [
              { id: 'header', label: 'Kepala Bidang', icon: User },
              { id: 'staff', label: 'Tim Anggota / Staf', icon: Layers },
              { id: 'programs', label: 'Program Kerja', icon: Sparkles },
              { id: 'slides', label: 'Carousel Foto', icon: ImageIcon },
              { 
                id: 'specialized', 
                label: activeSectionId === 'academic' ? 'Mata Pelajaran' : activeSectionId === 'kesiswaan' ? 'Ekstrakurikuler' : 'Fasilitas & Profil', 
                icon: activeSectionId === 'academic' ? BookOpen : activeSectionId === 'kesiswaan' ? Award : Building 
              },
              { id: 'gallery', label: 'Galeri Slider PopUp', icon: ImageIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer border ${
                  activeSubTab === tab.id 
                    ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900' 
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeSubTab === tab.id ? 'text-emerald-800' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            ))
          )}
        </aside>

        {/* CMS ACTIVE PANEL CONTENT */}
        <main className="lg:col-span-9 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            
            {/* SUB-TAB: HEADER */}
            {activeSubTab === 'header' && (
              <motion.div
                key="header"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-extrabold text-slate-800 text-base">
                    {activeSectionId === 'home' ? 'Profil & Sambutan Kepala Sekolah' : 'Profil & Sambutan Kepala Bidang'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeSectionId === 'home' 
                      ? 'Edit detail sambutan, biodata, NIP, nama dan foto Kepala Sekolah di halaman utama (Beranda).' 
                      : 'Edit detail sambutan Waka dan gambar profil di halaman kesiswaan/sarpras/akademik.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">Nama Lengkap &amp; Gelar</label>
                    <input 
                      type="text" 
                      value={headName}
                      onChange={(e) => setHeadName(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-700 bg-slate-50"
                      placeholder="Contoh: Siti Kurniawati, S.Pd"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">Jabatan / Role Resmi</label>
                    <input 
                      type="text" 
                      value={headRole}
                      onChange={(e) => setHeadRole(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-700 bg-slate-50"
                      placeholder="Contoh: Wakil Kepala Sekolah Bidang Sarana"
                    />
                  </div>
                </div>

                <MediaUploadSelector
                  value={headImage}
                  onChange={setHeadImage}
                  label="Link/URL Foto Profil (G-Drive atau Upload)"
                  placeholder="https://lh3.googleusercontent.com/..."
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">Tempat, Tanggal Lahir (TTL)</label>
                    <input 
                      type="text" 
                      value={headBorn}
                      onChange={(e) => setHeadBorn(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-700 bg-slate-50"
                      placeholder="Contoh: Jakarta, 17 Agustus 1970"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">Bidang Studi / Keahlian</label>
                    <input 
                      type="text" 
                      value={headSubject}
                      onChange={(e) => setHeadSubject(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-700 bg-slate-50"
                      placeholder="Contoh: Manajemen Pendidikan / Matematika"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">Hobi / Kegemaran</label>
                    <input 
                      type="text" 
                      value={headHobby}
                      onChange={(e) => setHeadHobby(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-700 bg-slate-50"
                      placeholder="Contoh: Membaca & Menulis"
                    />
                  </div>
                </div>

                {activeSectionId !== 'home' && (
                  <div className="space-y-4 p-5 bg-gradient-to-br from-emerald-50/80 via-blue-50/50 to-amber-50/50 border border-emerald-200/80 rounded-2xl text-left">
                    <div className="border-b border-emerald-100 pb-3">
                      <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-700" />
                        <span>Pengaturan Tampilan Header Banner Halaman ({activeSectionId === 'academic' ? 'Akademik' : activeSectionId === 'kesiswaan' ? 'Kesiswaan' : 'Sarana Prasarana'})</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Atur gambar background, judul utama, dan sub-judul pada banner header paling atas untuk halaman ini.
                      </p>
                    </div>

                    <MediaUploadSelector
                      value={headerBgImage}
                      onChange={setHeaderBgImage}
                      label="Background Gambar Header Banner (Upload Foto atau URL Direct)"
                      placeholder="https://..."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Judul Header Banner</label>
                        <input 
                          type="text" 
                          value={headerTitle}
                          onChange={(e) => setHeaderTitle(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:border-emerald-700"
                          placeholder="Contoh: Bidang Akademik & Kurikulum"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Sub Judul / Keterangan Banner</label>
                        <textarea 
                          rows={2}
                          value={headerSubtitle}
                          onChange={(e) => setHeaderSubtitle(e.target.value)}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-emerald-700 leading-relaxed"
                          placeholder="Contoh: Mewujudkan Standar Pendidikan Berkualitas Tinggi..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSectionId === 'home' && (
                  <div className="space-y-4 p-5 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-amber-50/50 border border-indigo-200/80 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <School className="w-4 h-4 text-indigo-600" />
                          <span>Logo Resmi Sekolah (Navigasi &amp; Header Website)</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Atur logo resmi sekolah untuk ditampilkan pada Header Beranda Website, Navbar Atas, dan Sidebar.
                        </p>
                      </div>
                      {schoolLogo && (
                        <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-xs">
                          <span className="text-[10px] font-bold text-slate-500">Preview:</span>
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                            <img src={schoolLogo} alt="Preview Logo" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}
                    </div>

                    <MediaUploadSelector
                      value={schoolLogo}
                      onChange={setSchoolLogo}
                      label="Logo Sekolah (Upload Foto / Pilih Galeri / URL Direct)"
                      placeholder="https://..."
                    />

                    <div className="space-y-1.5 pt-2 border-t border-indigo-100/80">
                      <label className="text-xs font-bold text-amber-900 block">Status Akreditasi Sekolah (Ditampilkan di Header Web)</label>
                      <input 
                        type="text" 
                        value={akreditasi}
                        onChange={(e) => setAkreditasi(e.target.value)}
                        className="w-full text-xs font-bold border border-amber-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-600 bg-white text-amber-950 shadow-2xs"
                        placeholder="Contoh: Akreditasi A (Unggul)"
                      />
                      <p className="text-[10px] text-amber-800">
                        Teks akreditasi ini akan ditampilkan sebagai lencana emas di Judul Utama Beranda Web Sekolah menggantikan teks SIAS.
                      </p>
                    </div>
                  </div>
                )}

                <TextFormattingToolbar
                  label="Naskah Sambutan Utama / Motto / Moto Hidup"
                  value={headMotto}
                  onChange={(val) => setHeadMotto(val)}
                  rows={6}
                  placeholder="Tuliskan naskah sambutan resmi kepala bidang di sini..."
                  helpText="Gunakan tombol toolbar di atas untuk menebalkan, miring, garis bawah, serta meratakan paragraf sambutan."
                />

                <button
                  onClick={handleSaveHeader}
                  className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{activeSectionId === 'home' ? 'Simpan Profil Kepsek & Status Akreditasi' : 'Simpan Profil Kepala Bidang'}</span>
                </button>
              </motion.div>
            )}

            {/* SUB-TAB: VISION & MISSION */}
            {activeSubTab === 'vision-mission' && (
              <motion.div
                key="vision-mission"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-extrabold text-slate-800 text-base">Visi, Misi &amp; Media Sosial</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Kelola visi, misi utama sekolah, serta link media sosial yang tampil di footer website secara terpusat.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block">Visi Sekolah</label>
                  <textarea 
                    rows={3}
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-700 bg-slate-50 leading-relaxed text-slate-800 font-sans"
                    placeholder="Masukkan visi utama sekolah di sini..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 block">Butir-Butir Misi Sekolah</label>
                    <button
                      type="button"
                      onClick={() => setMissions([...missions, ''])}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Butir Misi</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {missions.map((misi, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                        <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-1">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <textarea
                          rows={2}
                          value={misi}
                          onChange={(e) => {
                            const copy = [...missions];
                            copy[idx] = e.target.value;
                            setMissions(copy);
                          }}
                          className="flex-1 text-xs font-semibold bg-transparent border-none focus:outline-none p-1 leading-relaxed text-slate-700 font-sans"
                          placeholder={`Butir misi ke-${idx + 1}...`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...missions];
                            copy.splice(idx, 1);
                            setMissions(copy);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {missions.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-4">Belum ada butir misi yang ditambahkan.</p>
                    )}
                  </div>
                </div>

                {/* MEDIA SOSIAL SEKOLAH SECTION */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <span>Media Sosial &amp; Kontak Resmi Sekolah</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Atur link atau detail kontak untuk ditampilkan pada bagian footer website sekolah.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Instagram className="w-4 h-4 text-pink-600" />
                        <span>Link Instagram</span>
                      </label>
                      <input 
                        type="text" 
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-emerald-700 bg-slate-50"
                        placeholder="https://instagram.com/smpn50jakarta"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>WhatsApp (Link atau No. HP)</span>
                      </label>
                      <input 
                        type="text" 
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-emerald-700 bg-slate-50"
                        placeholder="Contoh: https://wa.me/6281234567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span>Email Resmi Sekolah</span>
                      </label>
                      <input 
                        type="text" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-emerald-700 bg-slate-50"
                        placeholder="smpn50jakarta@gmail.com"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await handleSaveSection({ vision, missions, instagram, whatsapp, email });
                    showToast('Visi, Misi & Media Sosial berhasil disimpan!');
                  }}
                  className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Visi, Misi &amp; Sosial Media</span>
                </button>
              </motion.div>
            )}

            {/* SUB-TAB: STAFF LIST */}
            {activeSubTab === 'staff' && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Tim Anggota &amp; Staf Bidang</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola anggota kepengurusan bidang kesiswaan/sarpras/akademik.</p>
                  </div>
                  {editingStaffIdx === null && (
                    <button
                      onClick={() => {
                        setEditingStaffIdx(-1);
                        setStaffForm({
                          name: '',
                          role: '',
                          image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
                          born: '',
                          subject: '',
                          department: '',
                          hobby: '',
                          motto: ''
                        });
                      }}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Anggota</span>
                    </button>
                  )}
                </div>

                {editingStaffIdx !== null ? (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {editingStaffIdx === -1 ? 'Tambah Staf Baru' : `Edit Staf: ${staffForm.name}`}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Nama Lengkap &amp; Gelar</label>
                        <input 
                          type="text" 
                          value={staffForm.name || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Nama Staf"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Jabatan / Peran di Bidang</label>
                        <input 
                          type="text" 
                          value={staffForm.role || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Staf Hubungan Masyarakat"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <MediaUploadSelector
                          value={staffForm.image || ''}
                          onChange={(val) => setStaffForm({ ...staffForm, image: val })}
                          label="Foto Profil Staf"
                        />
                      </div>

                      {/* Optional metadata for details popup */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Tempat, Tanggal Lahir (Opsional)</label>
                        <input 
                          type="text" 
                          value={staffForm.born || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, born: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Bogor, 12 Oktober 1992"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Bidang/Instansi/Pelajaran (Opsional)</label>
                        <input 
                          type="text" 
                          value={staffForm.department || staffForm.subject || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value, subject: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Kurikulum / Matematika"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Hobi (Opsional)</label>
                        <input 
                          type="text" 
                          value={staffForm.hobby || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, hobby: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Bulutangkis & Coding"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Motto Hidup (Opsional - Akan Tampil di PopUp)</label>
                        <textarea 
                          rows={2}
                          value={staffForm.motto || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, motto: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 bg-white focus:outline-none"
                          placeholder="Tuliskan motto hidup yang memotivasi..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setEditingStaffIdx(null)}
                        className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveStaff}
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Simpan Anggota
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSection?.staff?.map((st, sIdx) => (
                      <div 
                        key={sIdx}
                        className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-all bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-13 rounded-lg border border-slate-100 overflow-hidden bg-slate-50 shrink-0">
                            <img src={st.image} alt={st.name} className="w-full h-full object-cover object-top" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{st.name}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">{st.role}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setEditingStaffIdx(sIdx);
                              setStaffForm(st);
                            }}
                            className="p-1.5 border border-slate-200 hover:border-emerald-600 rounded-lg text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(sIdx)}
                            className="p-1.5 border border-slate-200 hover:border-red-600 rounded-lg text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!activeSection?.staff || activeSection.staff.length === 0) && (
                      <p className="text-xs text-slate-400 py-6 md:col-span-2 font-mono">Belum ada tim anggota staf yang disimpan.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: PROGRAMS LIST */}
            {activeSubTab === 'programs' && (
              <motion.div
                key="programs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Program Kerja Unggulan</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Edit program kerja unggulan bidang ini beserta deskripsi &amp; icon emoji.</p>
                  </div>
                  {editingProgIdx === null && (
                    <button
                      onClick={() => {
                        setEditingProgIdx(-1);
                        setProgForm({ title: '', desc: '', icon: '🏆' });
                      }}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Program</span>
                    </button>
                  )}
                </div>

                {editingProgIdx !== null ? (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {editingProgIdx === -1 ? 'Tambah Program Baru' : 'Edit Program Kerja'}
                    </h4>

                    <div className="space-y-4 text-left">
                      <div className="space-y-4">
                        <MediaUploadSelector
                          value={progForm.icon || ''}
                          onChange={(val) => setProgForm({ ...progForm, icon: val })}
                          label="Icon Konten (Emoji, Lucide Name, atau Upload Foto)"
                          type="icon"
                        />

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Nama Program Kerja</label>
                          <input 
                            type="text" 
                            value={progForm.title || ''}
                            onChange={(e) => setProgForm({ ...progForm, title: e.target.value })}
                            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                            placeholder="Contoh: Digitalisasi Lab TIK"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Deskripsi Ringkas</label>
                        <textarea 
                          rows={3}
                          value={progForm.desc || ''}
                          onChange={(e) => setProgForm({ ...progForm, desc: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 bg-white focus:outline-none leading-relaxed"
                          placeholder="Tuliskan penjelasan singkat mengenai program ini..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setEditingProgIdx(null)}
                        className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveProgram}
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Simpan Program
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSection?.programs?.map((pr, pIdx) => (
                      <div 
                        key={pIdx}
                        className="border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-4 hover:border-slate-300 transition-all bg-white"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                            <WebIcon name={pr.icon} className="w-5 h-5 text-slate-800" />
                          </div>
                          <div className="text-left space-y-0.5">
                            <h4 className="text-xs font-bold text-slate-800">{pr.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{pr.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setEditingProgIdx(pIdx);
                              setProgForm(pr);
                            }}
                            className="p-1.5 border border-slate-200 hover:border-emerald-600 rounded-lg text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProgram(pIdx)}
                            className="p-1.5 border border-slate-200 hover:border-red-600 rounded-lg text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!activeSection?.programs || activeSection.programs.length === 0) && (
                      <p className="text-xs text-slate-400 py-6 font-mono text-center">Belum ada program kerja yang disimpan.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: SLIDESHOW */}
            {activeSubTab === 'slides' && (
              <motion.div
                key="slides"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Slider Dokumentasi Unggulan</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola gambar &amp; video slider (YouTube atau Upload Komputer), judul, dan takarir slideshow.</p>
                  </div>
                  {editingSlideIdx === null && (
                    <button
                      onClick={() => {
                        setEditingSlideIdx(-1);
                        setSlideForm({ image: '', title: '', desc: '', type: 'image', videoUrl: '' });
                      }}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Slide</span>
                    </button>
                  )}
                </div>

                {editingSlideIdx !== null ? (
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-5 text-left">
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center justify-between">
                      <span>{editingSlideIdx === -1 ? 'Tambah Slide Baru' : 'Edit Slide Dokumentasi'}</span>
                      <span className="text-xs font-normal text-slate-400">Pilih Tipe Media (Gambar / Video)</span>
                    </h4>

                    {/* Media Type Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 block">Tipe Media Slide</label>
                      <div className="grid grid-cols-2 gap-3 max-w-sm">
                        <button
                          type="button"
                          onClick={() => setSlideForm({ ...slideForm, type: 'image' })}
                          className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            slideForm.type !== 'video' 
                              ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Foto / Gambar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlideForm({ ...slideForm, type: 'video' })}
                          className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            slideForm.type === 'video' 
                              ? 'bg-red-600 border-red-600 text-white shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Video className="w-4 h-4" />
                          <span>Video Slider</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">Judul Slide</label>
                        <input 
                          type="text" 
                          value={slideForm.title || ''}
                          onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:border-emerald-700"
                          placeholder="Contoh: Gelaran Karya P5 / Video Profil Sekolah"
                        />
                      </div>

                      {/* Video Inputs */}
                      {slideForm.type === 'video' ? (
                        <div className="space-y-4 p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                              <Link2 className="w-4 h-4 text-red-600" />
                              <span>Link Video YouTube (Embed Link / Direct Link)</span>
                            </label>
                            <input 
                              type="text" 
                              value={slideForm.videoUrl || ''}
                              onChange={(e) => setSlideForm({ ...slideForm, videoUrl: e.target.value })}
                              className="w-full text-xs font-mono border border-red-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:border-red-600"
                              placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                            />
                            <p className="text-[10px] text-red-700">
                              Format otomatis terdeteksi: Tautan standar YouTube atau share link akan di-embed langsung pada slider beranda.
                            </p>
                          </div>

                          <div className="relative border-t border-red-100 pt-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Atau Upload Video dari Komputer</p>
                            <label className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-red-600 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-2xs hover:bg-red-50 transition-all">
                              <Upload className="w-4 h-4 text-red-600" />
                              <span>Upload File Video (.mp4, .webm)</span>
                              <input 
                                type="file" 
                                accept="video/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 50 * 1024 * 1024) {
                                    alert('Ukuran video maksimal 50MB. Disarankan memasukkan link YouTube untuk performa terbaik.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    const result = evt.target?.result as string;
                                    setSlideForm(prev => ({
                                      ...prev,
                                      type: 'video',
                                      videoUrl: result
                                    }));
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                            {slideForm.videoUrl && slideForm.videoUrl.startsWith('data:video') && (
                              <span className="text-[10px] font-bold text-emerald-600 ml-3">✓ File video lokal berhasil dimuat</span>
                            )}
                          </div>

                          <MediaUploadSelector
                            value={slideForm.image || ''}
                            onChange={(val) => setSlideForm({ ...slideForm, image: val })}
                            label="Foto Cover / Thumbnail Poster Video (Opsional)"
                            placeholder="https://..."
                          />
                        </div>
                      ) : (
                        <MediaUploadSelector
                          value={slideForm.image || ''}
                          onChange={(val) => setSlideForm({ ...slideForm, image: val })}
                          label="Gambar Foto Slide Dokumentasi"
                          placeholder="https://..."
                        />
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">Deskripsi / Caption Singkat</label>
                        <textarea 
                          rows={2}
                          value={slideForm.desc || ''}
                          onChange={(e) => setSlideForm({ ...slideForm, desc: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 bg-white focus:outline-none leading-relaxed"
                          placeholder="Tuliskan takarir dokumentasi di sini..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingSlideIdx(null)}
                        className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSlide}
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm"
                      >
                        Simpan Slide
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeSection?.slides?.map((sl, sIdx) => {
                      const isVideo = sl.type === 'video' || (sl.videoUrl && sl.videoUrl.trim() !== '');
                      return (
                        <div 
                          key={sIdx}
                          className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-all bg-white"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-12 rounded-xl border border-slate-100 overflow-hidden bg-slate-900 shrink-0 relative flex items-center justify-center">
                              {sl.image ? (
                                <img src={sl.image} alt={sl.title} className="w-full h-full object-cover" />
                              ) : (
                                <Video className="w-6 h-6 text-slate-400" />
                              )}
                              {isVideo && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-white fill-white" />
                                </div>
                              )}
                            </div>
                            <div className="text-left space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-800">{(sl.title || '').replace(/<[^>]*>/g, '').trim()}</h4>
                                {isVideo ? (
                                  <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                    <Video className="w-2.5 h-2.5" />
                                    <span>VIDEO</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                    <ImageIcon className="w-2.5 h-2.5" />
                                    <span>FOTO</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{(sl.desc || '').replace(/<[^>]*>/g, '').trim()}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setEditingSlideIdx(sIdx);
                                setSlideForm({
                                  ...sl,
                                  title: (sl.title || '').replace(/<[^>]*>/g, '').trim(),
                                  desc: (sl.desc || '').replace(/<[^>]*>/g, '').trim()
                                });
                              }}
                              className="p-1.5 border border-slate-200 hover:border-emerald-600 rounded-lg text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlide(sIdx)}
                              className="p-1.5 border border-slate-200 hover:border-red-600 rounded-lg text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {(!activeSection?.slides || activeSection.slides.length === 0) && (
                      <p className="text-xs text-slate-400 py-6 font-mono text-center">Belum ada slide foto/video dokumentasi.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: SPECIALIZED (MAPEL / EKSKUL / FACILITIES) */}
            {activeSubTab === 'specialized' && (
              <motion.div
                key="specialized"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* 1. ACADEMIC: SUBJECTS */}
                {activeSectionId === 'academic' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base">Mata Pelajaran &amp; Galeri PopUp Slider</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Atur mata pelajaran resmi, koordinator guru, jam per minggu, serta foto galeri slider pop-up khusus masing-masing mata pelajaran.</p>
                      </div>
                      {editingSubjectIdx === null && (
                        <button
                          onClick={() => {
                            setEditingSubjectIdx(-1);
                            setSubjectForm({ name: '', coordinator: '', teachers: '', hours: '', method: '', icon: 'book', focus: [], images: [] });
                          }}
                          className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Mapel</span>
                        </button>
                      )}
                    </div>

                    {editingSubjectIdx !== null ? (
                      <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-5 text-left">
                        <h4 className="font-extrabold text-slate-800 text-sm">
                          {editingSubjectIdx === -1 ? 'Tambah Mata Pelajaran Baru' : 'Edit Mata Pelajaran'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Nama Mata Pelajaran</label>
                            <input 
                              type="text" 
                              value={subjectForm.name || ''}
                              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Bahasa Indonesia"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <MediaUploadSelector
                              value={subjectForm.icon || ''}
                              onChange={(val) => setSubjectForm({ ...subjectForm, icon: val })}
                              label="Icon Mata Pelajaran (Lucide Name, Emoji, atau Upload)"
                              type="icon"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Koordinator / Ketua MGMP</label>
                            <input 
                              type="text" 
                              value={subjectForm.coordinator || ''}
                              onChange={(e) => setSubjectForm({ ...subjectForm, coordinator: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Ibu Maryam, S.Ag"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Tim Pendidik / Guru Pengampu</label>
                            <input 
                              type="text" 
                              value={subjectForm.teachers || ''}
                              onChange={(e) => setSubjectForm({ ...subjectForm, teachers: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Tim MGMP Agama"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Beban Belajar (JP / Minggu)</label>
                            <input 
                              type="text" 
                              value={subjectForm.hours || ''}
                              onChange={(e) => setSubjectForm({ ...subjectForm, hours: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="3 JP / Minggu"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Metode Pembelajaran Utama</label>
                            <input 
                              type="text" 
                              value={subjectForm.method || ''}
                              onChange={(e) => setSubjectForm({ ...subjectForm, method: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Pembiasaan & Diskusi Kelompok"
                            />
                          </div>
                        </div>

                        {/* Focus Topic Editor */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 block">Fokus Kognitif (2 Topik Utama)</label>
                          <div className="space-y-2">
                            {[0, 1].map((fIdx) => {
                              const currFocus = subjectForm.focus?.[fIdx] || { topic: '', level: '' };
                              return (
                                <div key={fIdx} className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-100 rounded-xl">
                                  <input 
                                    type="text"
                                    placeholder={`Topik Fokus ${fIdx + 1}`}
                                    value={currFocus.topic}
                                    onChange={(e) => {
                                      const updatedFocus = [...(subjectForm.focus || [])];
                                      updatedFocus[fIdx] = { ...currFocus, topic: e.target.value };
                                      setSubjectForm({ ...subjectForm, focus: updatedFocus });
                                    }}
                                    className="w-full text-xs border-b border-slate-100 focus:outline-none font-medium"
                                  />
                                  <input 
                                    type="text"
                                    placeholder="Tingkat/Cakupan (e.g. Utama, Tinggi)"
                                    value={currFocus.level}
                                    onChange={(e) => {
                                      const updatedFocus = [...(subjectForm.focus || [])];
                                      updatedFocus[fIdx] = { ...currFocus, level: e.target.value };
                                      setSubjectForm({ ...subjectForm, focus: updatedFocus });
                                    }}
                                    className="w-full text-xs border-b border-slate-100 focus:outline-none font-medium"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* GALERI SLIDER POPUP FOTO KHUSUS MATA PELAJARAN INI */}
                        <div className="space-y-3 bg-white p-4 md:p-5 border border-indigo-100 rounded-2xl shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-50 pb-3">
                            <div>
                              <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-indigo-600" />
                                <span>Galeri Slider PopUp Foto Mata Pelajaran ({subjectForm.name || 'Mapel'})</span>
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Foto/gambar dokumentasi yang tampil berputar saat siswa atau pengunjung mengklik mata pelajaran ini. Pengguna bisa Upload File langsung dari Komputer atau memasukkan Link Google Drive.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const currentImgs = [...(subjectForm.images || [])];
                                if (currentImgs.length >= 10) {
                                  alert('Maksimal 10 foto slider per mata pelajaran.');
                                  return;
                                }
                                currentImgs.push('');
                                setSubjectForm({ ...subjectForm, images: currentImgs });
                              }}
                              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Foto Slider</span>
                            </button>
                          </div>

                          {(!subjectForm.images || subjectForm.images.length === 0) ? (
                            <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-1.5">
                              <p className="text-xs font-semibold text-indigo-900">Belum ada foto slider khusus untuk mata pelajaran ini.</p>
                              <p className="text-[10px] text-slate-500">
                                Klik tombol <strong>"Tambah Foto Slider"</strong> di atas. Anda dapat memilih foto dari <strong>Komputer (Upload File)</strong> atau menempelkan <strong>Link Google Drive / Direct URL</strong>.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {subjectForm.images.map((imgUrl, imgIdx) => (
                                <div key={imgIdx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 relative">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                      FOTO SLIDER POPUP #{imgIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedImgs = [...(subjectForm.images || [])];
                                        updatedImgs.splice(imgIdx, 1);
                                        setSubjectForm({ ...subjectForm, images: updatedImgs });
                                      }}
                                      className="text-rose-500 hover:text-rose-700 text-[10px] font-bold px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                                    >
                                      Hapus Foto
                                    </button>
                                  </div>

                                  <MediaUploadSelector
                                    value={imgUrl}
                                    onChange={(val) => {
                                      const updatedImgs = [...(subjectForm.images || [])];
                                      updatedImgs[imgIdx] = val;
                                      setSubjectForm({ ...subjectForm, images: updatedImgs });
                                    }}
                                    label=""
                                    placeholder="Upload File Komputer atau paste Link Google Drive / Direct URL..."
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setEditingSubjectIdx(null)}
                            className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleSaveSubject}
                            className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm"
                          >
                            Simpan Mapel &amp; Foto Slider
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeSection?.subjects?.map((sub, sIdx) => (
                          <div 
                            key={sIdx}
                            className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-indigo-200 transition-all bg-white shadow-xs"
                          >
                            <div className="text-left space-y-1">
                              <h4 className="text-xs font-bold text-slate-800">{sub.name}</h4>
                              <p className="text-[10px] text-slate-400 font-medium">Pengampu: {sub.coordinator}</p>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="inline-block bg-slate-50 text-[9px] px-2 py-0.5 rounded-md border border-slate-100 font-bold text-emerald-800">
                                  {sub.hours}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-[9px] px-2 py-0.5 rounded-md border border-indigo-100 font-bold text-indigo-700">
                                  <ImageIcon className="w-3 h-3 text-indigo-500" />
                                  <span>{sub.images?.length || 0} Foto Slider PopUp</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingSubjectIdx(sIdx);
                                  setSubjectForm(sub);
                                }}
                                className="p-2 border border-slate-200 hover:border-indigo-600 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                                title="Edit Mapel & Galeri PopUp"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit Mapel &amp; Foto</span>
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(sIdx)}
                                className="p-2 border border-slate-200 hover:border-red-600 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50/50 transition-all cursor-pointer"
                                title="Hapus Mapel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. KESISWAAN: EXTRACURRICULARS */}
                {activeSectionId === 'kesiswaan' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base">Ekstrakurikuler &amp; Galeri PopUp Slider</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Kelola daftar ekstrakurikuler, pembimbing, jadwal latihan, prestasi, serta foto galeri slider pop-up khusus masing-masing ekskul.</p>
                      </div>
                      {editingExtraIdx === null && (
                        <button
                          onClick={() => {
                            setEditingExtraIdx(-1);
                            setExtraForm({ name: '', coordinator: '', coach: '', members: '', schedule: '', icon: '⚽', achievements: [], images: [] });
                          }}
                          className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Ekskul</span>
                        </button>
                      )}
                    </div>

                    {editingExtraIdx !== null ? (
                      <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-5 text-left">
                        <h4 className="font-extrabold text-slate-800 text-sm">
                          {editingExtraIdx === -1 ? 'Tambah Ekstrakurikuler Baru' : 'Edit Ekstrakurikuler'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Nama Ekskul</label>
                            <input 
                              type="text" 
                              value={extraForm.name || ''}
                              onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Futsal / Paskibra"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <MediaUploadSelector
                              value={extraForm.icon || ''}
                              onChange={(val) => setExtraForm({ ...extraForm, icon: val })}
                              label="Icon Ekskul (Lucide Name, Emoji, atau Upload)"
                              type="icon"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Nama Pembina Ekstrakurikuler</label>
                            <input 
                              type="text" 
                              value={extraForm.coordinator || ''}
                              onChange={(e) => setExtraForm({ ...extraForm, coordinator: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Sobari, S.Pd"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Pelatih Luar / Instruktur</label>
                            <input 
                              type="text" 
                              value={extraForm.coach || ''}
                              onChange={(e) => setExtraForm({ ...extraForm, coach: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Coach Roni Hartono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Anggota Aktif</label>
                            <input 
                              type="text" 
                              value={extraForm.members || ''}
                              onChange={(e) => setExtraForm({ ...extraForm, members: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="40 Siswa"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Waktu Latihan (Jadwal Rutin)</label>
                            <input 
                              type="text" 
                              value={extraForm.schedule || ''}
                              onChange={(e) => setExtraForm({ ...extraForm, schedule: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Senin & Kamis, 15.30 WIB"
                            />
                          </div>
                        </div>

                        {/* Achievements Editor */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 block">Dua Prestasi Terbaik (Akan Tampil di PopUp)</label>
                          <div className="space-y-2">
                            {[0, 1].map((aIdx) => {
                              const currAch = extraForm.achievements?.[aIdx] || { name: '', scope: '' };
                              return (
                                <div key={aIdx} className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-100 rounded-xl">
                                  <input 
                                    type="text"
                                    placeholder={`Piala/Kejuaraan ${aIdx + 1}`}
                                    value={currAch.name}
                                    onChange={(e) => {
                                      const updatedAch = [...(extraForm.achievements || [])];
                                      updatedAch[aIdx] = { ...currAch, name: e.target.value };
                                      setExtraForm({ ...extraForm, achievements: updatedAch });
                                    }}
                                    className="w-full text-xs border-b border-slate-100 focus:outline-none font-medium"
                                  />
                                  <input 
                                    type="text"
                                    placeholder="Tingkat (e.g. Kota, Provinsi, Nasional)"
                                    value={currAch.scope}
                                    onChange={(e) => {
                                      const updatedAch = [...(extraForm.achievements || [])];
                                      updatedAch[aIdx] = { ...currAch, scope: e.target.value };
                                      setExtraForm({ ...extraForm, achievements: updatedAch });
                                    }}
                                    className="w-full text-xs border-b border-slate-100 focus:outline-none font-medium"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* GALERI SLIDER POPUP FOTO KHUSUS EKSTRAKURIKULER INI */}
                        <div className="space-y-3 bg-white p-4 md:p-5 border border-indigo-100 rounded-2xl shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-50 pb-3">
                            <div>
                              <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-indigo-600" />
                                <span>Galeri Slider PopUp Foto Ekstrakurikuler ({extraForm.name || 'Ekskul'})</span>
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Foto/gambar kegiatan yang tampil berputar saat pengunjung mengklik ekstrakurikuler ini. Boleh diupload langsung dari Komputer atau memasukkan Link Google Drive.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const currentImgs = [...(extraForm.images || [])];
                                if (currentImgs.length >= 10) {
                                  alert('Maksimal 10 foto slider per ekstrakurikuler.');
                                  return;
                                }
                                currentImgs.push('');
                                setExtraForm({ ...extraForm, images: currentImgs });
                              }}
                              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Foto Slider</span>
                            </button>
                          </div>

                          {(!extraForm.images || extraForm.images.length === 0) ? (
                            <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-1.5">
                              <p className="text-xs font-semibold text-indigo-900">Belum ada foto slider khusus untuk ekstrakurikuler ini.</p>
                              <p className="text-[10px] text-slate-500">
                                Klik <strong>"Tambah Foto Slider"</strong>. Anda dapat memilih foto dari <strong>Komputer (Upload File)</strong> atau menempelkan <strong>Link Google Drive / Direct URL</strong>.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {extraForm.images.map((imgUrl, imgIdx) => (
                                <div key={imgIdx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 relative">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                      FOTO SLIDER POPUP #{imgIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedImgs = [...(extraForm.images || [])];
                                        updatedImgs.splice(imgIdx, 1);
                                        setExtraForm({ ...extraForm, images: updatedImgs });
                                      }}
                                      className="text-rose-500 hover:text-rose-700 text-[10px] font-bold px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                                    >
                                      Hapus Foto
                                    </button>
                                  </div>

                                  <MediaUploadSelector
                                    value={imgUrl}
                                    onChange={(val) => {
                                      const updatedImgs = [...(extraForm.images || [])];
                                      updatedImgs[imgIdx] = val;
                                      setExtraForm({ ...extraForm, images: updatedImgs });
                                    }}
                                    label=""
                                    placeholder="Upload File Komputer atau paste Link Google Drive / Direct URL..."
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setEditingExtraIdx(null)}
                            className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleSaveExtra}
                            className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm"
                          >
                            Simpan Ekskul &amp; Foto Slider
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeSection?.extracurriculars?.map((ex, eIdx) => (
                          <div 
                            key={eIdx}
                            className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-indigo-200 transition-all bg-white shadow-xs"
                          >
                            <div className="text-left flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                                <WebIcon name={ex.icon} className="w-5 h-5 text-slate-800" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-slate-800">{ex.name}</h4>
                                <p className="text-[10px] text-slate-400 font-medium">Jadwal: {ex.schedule}</p>
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-[9px] px-2 py-0.5 rounded-md border border-indigo-100 font-bold text-indigo-700 mt-1">
                                  <ImageIcon className="w-3 h-3 text-indigo-500" />
                                  <span>{ex.images?.length || 0} Foto Slider PopUp</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingExtraIdx(eIdx);
                                  setExtraForm(ex);
                                }}
                                className="p-2 border border-slate-200 hover:border-indigo-600 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                                title="Edit Ekskul & Galeri PopUp"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit Ekskul &amp; Foto</span>
                              </button>
                              <button
                                onClick={() => handleDeleteExtra(eIdx)}
                                className="p-2 border border-slate-200 hover:border-red-600 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50/50 transition-all cursor-pointer"
                                title="Hapus Ekskul"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SARPRAS: FACILITIES */}
                {activeSectionId === 'sarpras' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base">Sarana Prasarana &amp; Galeri PopUp Slider</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Kelola profil sarana sekolah, penanggung jawab, kapasitas, inventaris, serta foto galeri slider pop-up khusus masing-masing fasilitas.</p>
                      </div>
                      {editingFacilityIdx === null && (
                        <button
                          onClick={() => {
                            setEditingFacilityIdx(-1);
                            setFacilityForm({ name: '', coordinator: '', condition: '', capacity: '', mainFeatures: '', icon: '🏫', inventory: [], images: [] });
                          }}
                          className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Sarana</span>
                        </button>
                      )}
                    </div>

                    {editingFacilityIdx !== null ? (
                      <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-5 text-left">
                        <h4 className="font-extrabold text-slate-800 text-sm">
                          {editingFacilityIdx === -1 ? 'Tambah Sarana Baru' : 'Edit Profil Sarana'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Nama Fasilitas</label>
                            <input 
                              type="text" 
                              value={facilityForm.name || ''}
                              onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Unit Kesehatan Sekolah (UKS)"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <MediaUploadSelector
                              value={facilityForm.icon || ''}
                              onChange={(val) => setFacilityForm({ ...facilityForm, icon: val })}
                              label="Icon Sarana (Lucide Name, Emoji, atau Upload)"
                              type="icon"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Penanggung Jawab / Pengelola</label>
                            <input 
                              type="text" 
                              value={facilityForm.coordinator || ''}
                              onChange={(e) => setFacilityForm({ ...facilityForm, coordinator: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Tim UKS & PMR"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Kondisi Fisik / Fasilitas Utama</label>
                            <input 
                              type="text" 
                              value={facilityForm.condition || ''}
                              onChange={(e) => setFacilityForm({ ...facilityForm, condition: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="AC, Bersih, Higienis"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Kapasitas Maksimal</label>
                            <input 
                              type="text" 
                              value={facilityForm.capacity || ''}
                              onChange={(e) => setFacilityForm({ ...facilityForm, capacity: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="4 Bed Pasien (Putra/Putri Terpisah)"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Fitur Pendukung Unggulan</label>
                            <input 
                              type="text" 
                              value={facilityForm.mainFeatures || ''}
                              onChange={(e) => setFacilityForm({ ...facilityForm, mainFeatures: e.target.value })}
                              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                              placeholder="Tabung Oksigen, Tensimeter Digital"
                            />
                          </div>
                        </div>

                        {/* Inventory Editor */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 block">Daftar Inventaris Utama (2 Item Penting)</label>
                          <div className="space-y-2">
                            {[0, 1].map((iIdx) => {
                              const currInv = facilityForm.inventory?.[iIdx] || { item: '', detail: '' };
                              return (
                                <div key={iIdx} className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-100 rounded-xl">
                                  <input 
                                    type="text"
                                    placeholder={`Nama Item ${iIdx + 1}`}
                                    value={currInv.item}
                                    onChange={(e) => {
                                      const updatedInv = [...(facilityForm.inventory || [])];
                                      updatedInv[iIdx] = { ...currInv, item: e.target.value };
                                      setFacilityForm({ ...facilityForm, inventory: updatedInv });
                                    }}
                                    className="w-full text-xs border-b border-slate-100 focus:outline-none font-medium"
                                  />
                                  <input 
                                    type="text"
                                    placeholder="Detail Kondisi/Status"
                                    value={currInv.detail}
                                    onChange={(e) => {
                                      const updatedInv = [...(facilityForm.inventory || [])];
                                      updatedInv[iIdx] = { ...currInv, detail: e.target.value };
                                      setFacilityForm({ ...facilityForm, inventory: updatedInv });
                                    }}
                                    className="w-full text-xs border-b border-slate-100 focus:outline-none font-medium"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* GALERI SLIDER POPUP FOTO KHUSUS SARANA PRASARANA INI */}
                        <div className="space-y-3 bg-white p-4 md:p-5 border border-indigo-100 rounded-2xl shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-50 pb-3">
                            <div>
                              <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-indigo-600" />
                                <span>Galeri Slider PopUp Foto Sarana ({facilityForm.name || 'Sarpras'})</span>
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Foto/gambar dokumentasi yang tampil berputar saat pengunjung mengklik sarana ini. Boleh diupload langsung dari Komputer atau memasukkan Link Google Drive.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const currentImgs = [...(facilityForm.images || [])];
                                if (currentImgs.length >= 10) {
                                  alert('Maksimal 10 foto slider per sarana prasarana.');
                                  return;
                                }
                                currentImgs.push('');
                                setFacilityForm({ ...facilityForm, images: currentImgs });
                              }}
                              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Foto Slider</span>
                            </button>
                          </div>

                          {(!facilityForm.images || facilityForm.images.length === 0) ? (
                            <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-1.5">
                              <p className="text-xs font-semibold text-indigo-900">Belum ada foto slider khusus untuk sarana prasarana ini.</p>
                              <p className="text-[10px] text-slate-500">
                                Klik <strong>"Tambah Foto Slider"</strong>. Anda dapat memilih foto dari <strong>Komputer (Upload File)</strong> atau menempelkan <strong>Link Google Drive / Direct URL</strong>.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {facilityForm.images.map((imgUrl, imgIdx) => (
                                <div key={imgIdx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 relative">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                      FOTO SLIDER POPUP #{imgIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedImgs = [...(facilityForm.images || [])];
                                        updatedImgs.splice(imgIdx, 1);
                                        setFacilityForm({ ...facilityForm, images: updatedImgs });
                                      }}
                                      className="text-rose-500 hover:text-rose-700 text-[10px] font-bold px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                                    >
                                      Hapus Foto
                                    </button>
                                  </div>

                                  <MediaUploadSelector
                                    value={imgUrl}
                                    onChange={(val) => {
                                      const updatedImgs = [...(facilityForm.images || [])];
                                      updatedImgs[imgIdx] = val;
                                      setFacilityForm({ ...facilityForm, images: updatedImgs });
                                    }}
                                    label=""
                                    placeholder="Upload File Komputer atau paste Link Google Drive / Direct URL..."
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setEditingFacilityIdx(null)}
                            className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleSaveFacility}
                            className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-sm"
                          >
                            Simpan Sarana &amp; Foto Slider
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeSection?.facilities?.map((fa, fIdx) => (
                          <div 
                            key={fIdx}
                            className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-indigo-200 transition-all bg-white shadow-xs"
                          >
                            <div className="text-left flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                                <WebIcon name={fa.icon} className="w-5 h-5 text-slate-800" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-slate-800">{fa.name}</h4>
                                <p className="text-[10px] text-slate-400 font-medium">Penanggung Jawab: {fa.coordinator}</p>
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-[9px] px-2 py-0.5 rounded-md border border-indigo-100 font-bold text-indigo-700 mt-1">
                                  <ImageIcon className="w-3 h-3 text-indigo-500" />
                                  <span>{fa.images?.length || 0} Foto Slider PopUp</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingFacilityIdx(fIdx);
                                  setFacilityForm(fa);
                                }}
                                className="p-2 border border-slate-200 hover:border-indigo-600 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                                title="Edit Sarana & Galeri PopUp"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit Sarana &amp; Foto</span>
                              </button>
                              <button
                                onClick={() => handleDeleteFacility(fIdx)}
                                className="p-2 border border-slate-200 hover:border-red-600 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50/50 transition-all cursor-pointer"
                                title="Hapus Sarana"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: POPUP GALLERY */}
            {activeSubTab === 'gallery' && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {activeSectionId === 'academic' ? (
                  <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white border border-indigo-200 rounded-3xl p-6 md:p-8 space-y-4 text-left shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-indigo-950">Galeri Slider PopUp Foto Dikelola Per Mata Pelajaran</h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        Pengaturan foto slider modal pop-up untuk menu <strong>Akademik</strong> telah digabungkan secara khusus di dalam pengaturan masing-masing <strong>Mata Pelajaran</strong>. Hal ini memungkinkan setiap mata pelajaran memiliki foto galeri slider tersendiri yang unik saat siswa atau pengunjung mengeklik mata pelajaran tersebut.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('specialized')}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Buka &amp; Kelola Pengaturan Mata Pelajaran</span>
                    </button>
                  </div>
                ) : activeSectionId === 'kesiswaan' ? (
                  <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white border border-indigo-200 rounded-3xl p-6 md:p-8 space-y-4 text-left shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-indigo-950">Galeri Slider PopUp Foto Dikelola Per Ekstrakurikuler</h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        Pengaturan foto slider modal pop-up untuk menu <strong>Kesiswaan</strong> telah digabungkan di dalam pengaturan masing-masing <strong>Ekstrakurikuler</strong>. Anda dapat mengupload foto langsung dari komputer atau menempelkan link Google Drive untuk tiap-tiap ekskul.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('specialized')}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Award className="w-4 h-4" />
                      <span>Buka &amp; Kelola Ekstrakurikuler</span>
                    </button>
                  </div>
                ) : activeSectionId === 'sarpras' ? (
                  <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white border border-indigo-200 rounded-3xl p-6 md:p-8 space-y-4 text-left shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-indigo-950">Galeri Slider PopUp Foto Dikelola Per Sarana Prasarana</h3>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        Pengaturan foto slider modal pop-up untuk menu <strong>Sarana Prasarana</strong> telah digabungkan di dalam pengaturan masing-masing <strong>Fasilitas Sekolah</strong>. Anda dapat mengupload foto dari Komputer maupun menggunakan link Google Drive.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('specialized')}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Buka &amp; Kelola Sarana Prasarana</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="font-extrabold text-slate-800 text-base">Galeri Slider PopUp (10 Foto Unggulan)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Kelola 10 URL foto yang tampil berputar dalam galeri modal ketika mengklik sarana/ekskul sekolah.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                      {Array.from({ length: 10 }).map((_, idx) => (
                        <MediaUploadSelector
                          key={idx}
                          value={galleryUrls[idx] || ''}
                          onChange={(val) => handleGalleryUrlChange(idx, val)}
                          label={`Foto Galeri PopUp #${idx + 1}`}
                          placeholder="Masukkan URL foto, atau upload..."
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleSaveGallery}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Semua URL Galeri</span>
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: ARTICLES */}
            {activeSubTab === 'articles' && (
              <motion.div
                key="articles"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Berita &amp; Artikel Edukasi</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola artikel sekolah, berita kegiatan, dan konten edukasi.</p>
                  </div>
                  {editingArticleIdx === null && (
                    <button
                      onClick={() => {
                        setEditingArticleIdx(-1);
                        setArticleForm({ title: '', category: 'Edukasi', author: 'Admin Sekolah', image: '', summary: '', content: [] });
                      }}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Artikel</span>
                    </button>
                  )}
                </div>

                {editingArticleIdx !== null ? (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-4 text-left">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {editingArticleIdx === -1 ? 'Tambah Artikel Baru' : 'Edit Artikel'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Judul Artikel</label>
                        <input 
                          type="text" 
                          value={articleForm.title || ''}
                          onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Cara Bijak Memanfaatkan AI"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Kategori</label>
                        <select 
                          value={articleForm.category || 'Edukasi'}
                          onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                        >
                          <option value="Edukasi">Edukasi</option>
                          <option value="Ragam">Ragam</option>
                          <option value="Nasional">Nasional</option>
                          <option value="Sekolah">Sekolah</option>
                          <option value="Pengumuman">Pengumuman</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Penulis (Author)</label>
                        <input 
                          type="text" 
                          value={articleForm.author || ''}
                          onChange={(e) => setArticleForm({ ...articleForm, author: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Admin Sekolah / Tim Humas"
                        />
                      </div>

                      <MediaUploadSelector
                        value={articleForm.image || ''}
                        onChange={(val) => setArticleForm({ ...articleForm, image: val })}
                        label="Gambar Utama Artikel / Dokumentasi"
                        placeholder="Masukkan URL foto, atau upload..."
                      />
                    </div>

                    <TextFormattingToolbar
                      label="Ringkasan Singkat (Summary)"
                      value={articleForm.summary || ''}
                      onChange={(val) => setArticleForm({ ...articleForm, summary: val })}
                      rows={2}
                      compact={true}
                      placeholder="Tulis ringkasan singkat artikel yang tampil pada daftar..."
                    />

                    <TextFormattingToolbar
                      label="Konten Paragraf Artikel & Berita"
                      value={articleForm.content ? articleForm.content.join('\n\n') : ''}
                      onChange={(val) => {
                        const paragraphs = val.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                        setArticleForm({ ...articleForm, content: paragraphs });
                      }}
                      rows={8}
                      placeholder="Tuliskan isi paragraf artikel di sini... (Pisahkan dengan baris kosong untuk paragraf baru)"
                      helpText="Gunakan toolbar di atas untuk memformat teks (Tebal, Miring, Garis Bawah, Coret, Rata Kiri/Tengah/Kanan/Justify, Warna Teks, dan Tautan)."
                    />

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setEditingArticleIdx(null)}
                        className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveArticle}
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Simpan Artikel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {activeSection?.articles?.map((art, aIdx) => (
                      <div 
                        key={aIdx}
                        className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex gap-4 hover:border-blue-500 transition-all bg-white text-left items-start justify-between shadow-xs"
                      >
                        <div className="flex gap-4 min-w-0">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                            <img src={art.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <span className="text-[10px] sm:text-xs font-extrabold text-blue-700 uppercase tracking-wider block">{art.category}</span>
                            <h4 className="text-xs sm:text-sm font-black text-slate-800 line-clamp-2 leading-snug">{art.title}</h4>
                            <p className="text-xs text-slate-400 font-medium truncate">Oleh: {art.author || 'Admin'} • {art.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <button
                            onClick={() => {
                              setEditingArticleIdx(aIdx);
                              setArticleForm(art);
                            }}
                            className="p-2 border border-slate-200 hover:border-emerald-600 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Edit Artikel"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(aIdx)}
                            className="p-2 border border-slate-200 hover:border-red-600 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Artikel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!activeSection?.articles || activeSection.articles.length === 0) && (
                      <p className="col-span-2 text-xs text-slate-400 py-6 font-mono text-center w-full">Belum ada berita atau artikel terbit.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: TICKERS */}
            {activeSubTab === 'tickers' && (
              <motion.div
                key="tickers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Running Hot News Ticker</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola pesan singkat berjalan di bagian atas halaman berita sekolah.</p>
                  </div>
                  {editingTickerIdx === null && (
                    <button
                      onClick={() => {
                        setEditingTickerIdx(-1);
                        setTickerForm({ category: 'Sekolah', text: '' });
                      }}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Pesan</span>
                    </button>
                  )}
                </div>

                {editingTickerIdx !== null ? (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-4 text-left">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {editingTickerIdx === -1 ? 'Tambah Hot News Baru' : 'Edit Hot News'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-bold text-slate-500">Label Kategori</label>
                        <input 
                          type="text" 
                          value={tickerForm.category || ''}
                          onChange={(e) => setTickerForm({ ...tickerForm, category: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Sekolah / Nasional / BK"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Pesan Pengumuman</label>
                        <input 
                          type="text" 
                          value={tickerForm.text || ''}
                          onChange={(e) => setTickerForm({ ...tickerForm, text: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Pendaftaran Ekstrakurikuler Gelombang II Resmi Dibuka..."
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-3">
                        <label className="text-xs font-bold text-slate-500">Tautan / Link URL Website (Opsional)</label>
                        <input 
                          type="url" 
                          value={tickerForm.linkUrl || ''}
                          onChange={(e) => setTickerForm({ ...tickerForm, linkUrl: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="https://kemdikbud.go.id atau https://sekolah.sch.id/info"
                        />
                        <p className="text-[10px] text-slate-400">Jika diisi, ketika pengunjung mengklik pesan Hot News ini, mereka akan otomatis dialihkan ke laman web penyedia informasi.</p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setEditingTickerIdx(null)}
                        className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveTicker}
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Simpan Hot News
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSection?.tickers?.map((tick, tIdx) => (
                      <div 
                        key={tIdx}
                        className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-all bg-white text-left"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                              {tick.category}
                            </span>
                            {tick.linkUrl && (
                              <a
                                href={tick.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                              >
                                <span>Tautan: {tick.linkUrl}</span>
                              </a>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mt-1.5 leading-relaxed">{tick.text}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <button
                            onClick={() => {
                              setEditingTickerIdx(tIdx);
                              setTickerForm(tick);
                            }}
                            className="p-1.5 border border-slate-200 hover:border-emerald-600 rounded-lg text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTicker(tIdx)}
                            className="p-1.5 border border-slate-200 hover:border-red-600 rounded-lg text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!activeSection?.tickers || activeSection.tickers.length === 0) && (
                      <p className="text-xs text-slate-400 py-6 font-mono text-center">Belum ada running news ticker.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: ACTIVITIES */}
            {activeSubTab === 'activities' && (
              <motion.div
                key="activities"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Jadwal Kegiatan Pekan Ini</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola lini masa (timeline) kegiatan penting pekanan sekolah.</p>
                  </div>
                  {editingActivityIdx === null && (
                    <button
                      onClick={() => {
                        setEditingActivityIdx(-1);
                        setEditingActivityForm({ day: 'Senin', title: '', desc: '', time: '' });
                      }}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Kegiatan</span>
                    </button>
                  )}
                </div>

                {editingActivityIdx !== null ? (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-4 text-left">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {editingActivityIdx === -1 ? 'Tambah Kegiatan Baru' : 'Edit Kegiatan'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Hari Pekan</label>
                        <input 
                          type="text" 
                          value={activityForm.day || ''}
                          onChange={(e) => setEditingActivityForm({ ...activityForm, day: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Senin / Selasa / Jum'at"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Judul Kegiatan</label>
                        <input 
                          type="text" 
                          value={activityForm.title || ''}
                          onChange={(e) => setEditingActivityForm({ ...activityForm, title: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Upacara Bendera"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">Waktu / Jam</label>
                        <input 
                          type="text" 
                          value={activityForm.time || ''}
                          onChange={(e) => setEditingActivityForm({ ...activityForm, time: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="07.00 - 08.00 WIB"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Deskripsi Ringkas</label>
                      <input 
                        type="text" 
                        value={activityForm.desc || ''}
                        onChange={(e) => setEditingActivityForm({ ...activityForm, desc: e.target.value })}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                        placeholder="Pembina: Humas Sekolah. Diikuti seluruh guru dan staf tata usaha."
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setEditingActivityIdx(null)}
                        className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveActivity}
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Simpan Kegiatan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSection?.activities?.map((act, actIdx) => (
                      <div 
                        key={actIdx}
                        className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-all bg-white text-left"
                      >
                        <div>
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{act.day}</span>
                          <h4 className="text-xs font-bold text-slate-800 mt-0.5 leading-tight">{act.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-normal font-medium">{act.desc}</p>
                          <span className="inline-block bg-blue-50 text-blue-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md mt-1.5">
                            {act.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <button
                            onClick={() => {
                              setEditingActivityIdx(actIdx);
                              setEditingActivityForm(act);
                            }}
                            className="p-1.5 border border-slate-200 hover:border-emerald-600 rounded-lg text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(actIdx)}
                            className="p-1.5 border border-slate-200 hover:border-red-600 rounded-lg text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!activeSection?.activities || activeSection.activities.length === 0) && (
                      <p className="col-span-2 text-xs text-slate-400 py-6 font-mono text-center w-full">Belum ada kegiatan terjadwal pekan ini.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUB-TAB: AGENDAS */}
            {activeSubTab === 'agendas' && (
              <motion.div
                key="agendas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Agenda Mendatang</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola agenda kegiatan bulanan sekolah yang akan datang.</p>
                  </div>
                  {editingAgendaIdx === null && (
                    <button
                      onClick={() => {
                        setEditingAgendaIdx(-1);
                        setAgendaForm({ day: '01', month: 'JUL', title: '', location: 'Lapangan Sekolah' });
                      }}
                      className="bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Agenda</span>
                    </button>
                  )}
                </div>

                {editingAgendaIdx !== null ? (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-5 md:p-6 space-y-4 text-left">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {editingAgendaIdx === -1 ? 'Tambah Agenda Baru' : 'Edit Agenda'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 font-sans">Tanggal (Angka)</label>
                        <input 
                          type="text" 
                          maxLength={2}
                          value={agendaForm.day || ''}
                          onChange={(e) => setAgendaForm({ ...agendaForm, day: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none text-center"
                          placeholder="15"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 font-sans">Bulan (3 Huruf)</label>
                        <input 
                          type="text" 
                          maxLength={3}
                          value={agendaForm.month || ''}
                          onChange={(e) => setAgendaForm({ ...agendaForm, month: e.target.value.toUpperCase() })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none text-center font-mono uppercase"
                          placeholder="JUL"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Nama Kegiatan Agenda</label>
                        <input 
                          type="text" 
                          value={agendaForm.title || ''}
                          onChange={(e) => setAgendaForm({ ...agendaForm, title: e.target.value })}
                          className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                          placeholder="Latihan Dasar Kepemimpinan (LDKS)"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Lokasi Kegiatan</label>
                      <input 
                        type="text" 
                        value={agendaForm.location || ''}
                        onChange={(e) => setAgendaForm({ ...agendaForm, location: e.target.value })}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none"
                        placeholder="Aula Serbaguna Lantai 3 / Kebun Raya"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setEditingAgendaIdx(null)}
                        className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveAgenda}
                        className="bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Simpan Agenda
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSection?.agendas?.map((age, ageIdx) => (
                      <div 
                        key={ageIdx}
                        className="border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-all bg-white text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 text-slate-900 flex flex-col items-center justify-center shrink-0 border border-amber-100 shadow-xs">
                            <span className="text-base font-black leading-none">{age.day}</span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">{age.month}</span>
                          </div>
                          <div className="text-left min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{age.title}</h4>
                            <p className="text-[10px] font-semibold text-blue-700 mt-1 truncate font-sans">@ {age.location}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <button
                            onClick={() => {
                              setEditingAgendaIdx(ageIdx);
                              setAgendaForm(age);
                            }}
                            className="p-1.5 border border-slate-200 hover:border-emerald-600 rounded-lg text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgenda(ageIdx)}
                            className="p-1.5 border border-slate-200 hover:border-red-600 rounded-lg text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!activeSection?.agendas || activeSection.agendas.length === 0) && (
                      <p className="col-span-2 text-xs text-slate-400 py-6 font-mono text-center w-full">Belum ada agenda mendatang.</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      </div>

    </div>
  );
}
