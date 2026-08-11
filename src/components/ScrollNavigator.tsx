import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  X,
  Sparkles,
  List
} from 'lucide-react';

interface ScrollNavigatorProps {
  activeRole?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  availableTabs?: { id: string; label: string; icon?: React.ElementType }[];
}

export const ScrollNavigator: React.FC<ScrollNavigatorProps> = ({
  activeRole,
  activeTab,
  onSelectTab,
  availableTabs = []
}) => {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [activeScrollContainer, setActiveScrollContainer] = useState<HTMLElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const checkScroll = useCallback(() => {
    // 1. Check window vertical scroll
    const windowScrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const windowScrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight || 0
    );
    const windowClientHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    let canUp = windowScrollTop > 20;
    let canDown = windowScrollTop < windowScrollHeight - windowClientHeight - 20;

    // Check inner vertical containers (like <main> or .overflow-y-auto)
    const vertContainers = Array.from(document.querySelectorAll<HTMLElement>('main, .overflow-y-auto'));
    for (const el of vertContainers) {
      if (el.scrollHeight > el.clientHeight + 20) {
        if (el.scrollTop > 20) canUp = true;
        if (el.scrollTop < el.scrollHeight - el.clientHeight - 20) canDown = true;
      }
    }

    // 2. Check for active horizontal scroll container (tables or overflow-x-auto)
    const scrollables = Array.from(document.querySelectorAll<HTMLElement>('.overflow-x-auto, table, .scrollable-content'));
    let foundHorizContainer: HTMLElement | null = null;
    let canScrollL = false;
    let canScrollR = false;

    for (const el of scrollables) {
      if (el.scrollWidth > el.clientWidth + 10) {
        foundHorizContainer = el;
        if (el.scrollLeft > 10) canScrollL = true;
        if (el.scrollLeft < el.scrollWidth - el.clientWidth - 10) canScrollR = true;
        break; // focus on the first wide scrollable container in viewport
      }
    }

    setActiveScrollContainer(foundHorizContainer);
    setShowTop(canUp);
    setShowBottom(canDown);
    setShowLeft(canScrollL);
    setShowRight(canScrollR);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    checkScroll();
    const interval = setInterval(checkScroll, 800);

    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearInterval(interval);
    };
  }, [checkScroll]);

  const handleScrollUp = () => {
    window.scrollBy({ top: -450, behavior: 'smooth' });
    const vertContainers = Array.from(document.querySelectorAll<HTMLElement>('main, .overflow-y-auto'));
    for (const el of vertContainers) {
      if (el.scrollHeight > el.clientHeight + 20) {
        el.scrollBy({ top: -450, behavior: 'smooth' });
      }
    }
  };

  const handleScrollDown = () => {
    window.scrollBy({ top: 450, behavior: 'smooth' });
    const vertContainers = Array.from(document.querySelectorAll<HTMLElement>('main, .overflow-y-auto'));
    for (const el of vertContainers) {
      if (el.scrollHeight > el.clientHeight + 20) {
        el.scrollBy({ top: 450, behavior: 'smooth' });
      }
    }
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const vertContainers = Array.from(document.querySelectorAll<HTMLElement>('main, .overflow-y-auto'));
    for (const el of vertContainers) {
      if (el.scrollHeight > el.clientHeight + 20) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleScrollLeft = () => {
    if (activeScrollContainer) {
      activeScrollContainer.scrollBy({ left: -320, behavior: 'smooth' });
    } else {
      window.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (activeScrollContainer) {
      activeScrollContainer.scrollBy({ left: 320, behavior: 'smooth' });
    } else {
      window.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const isVisible = showTop || showBottom || showLeft || showRight || availableTabs.length > 0;

  return (
    <>
      {/* Floating Navigator Capsule Widget - Auto Hide and Show */}
      <div
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-full shadow-2xl border border-slate-700/80 ring-1 ring-white/10 transition-all duration-300 ease-in-out ${
          isVisible ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-105' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {/* Scroll Left Button */}
        {showLeft && (
          <button
            type="button"
            onClick={handleScrollLeft}
            title="Geser Tabel ke Kiri"
            className="p-1.5 hover:bg-slate-700/80 text-cyan-300 hover:text-white rounded-full transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scroll Up Button */}
        <button
          type="button"
          onClick={handleScrollUp}
          onDoubleClick={handleScrollTop}
          title="Scroll Ke Atas (Klik 2x untuk ke paling atas)"
          className={`p-1.5 rounded-full transition-all cursor-pointer ${
            showTop
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Quick Menu Popover Toggle */}
        {availableTabs.length > 0 && onSelectTab && (
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              isMenuOpen
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30'
            }`}
            title="Buka Pintasan Navigasi Menu"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu</span>
          </button>
        )}

        {/* Scroll Down Button */}
        <button
          type="button"
          onClick={handleScrollDown}
          title="Scroll Ke Bawah"
          className={`p-1.5 rounded-full transition-all cursor-pointer ${
            showBottom
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Scroll Right Button */}
        {showRight && (
          <button
            type="button"
            onClick={handleScrollRight}
            title="Geser Tabel ke Kanan"
            className="p-1.5 hover:bg-slate-700/80 text-cyan-300 hover:text-white rounded-full transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Floating Quick Menu Popover Drawer */}
      {isMenuOpen && availableTabs.length > 0 && onSelectTab && (
        <div className="fixed bottom-20 right-5 z-50 w-72 bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-4 shadow-2xl border border-slate-700/90 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-200">
                Pintasan Menu {activeRole ? `(${activeRole.replace('_', ' ')})` : ''}
              </h4>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {availableTabs.map((t) => {
              const IconComp = t.icon || List;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTab(t.id);
                    setIsMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md font-black'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                    <span className="truncate">{t.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
