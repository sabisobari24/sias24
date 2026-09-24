import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  X,
  Pin,
  PinOff
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
  // Navigation requirements
  const [hasVerticalScroll, setHasVerticalScroll] = useState(false);
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);

  // Position indicator states
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Auto-hide visibility states
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('siakad_nav_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeContainerRef = useRef<HTMLElement | null>(null);

  // 1. DYNAMIC VERTICAL ELEMENT RESOLVER
  const getPrimaryVerticalElement = useCallback((): HTMLElement | null => {
    // 1. Check dashboard <main> container
    const mainEl = document.querySelector('main');
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight + 35) {
      return mainEl;
    }
    // 2. Check inner overflow-y scrollable containers
    const scrollables = Array.from(
      document.querySelectorAll<HTMLElement>('.overflow-y-auto, [data-scrollable-y="true"]')
    );
    for (const el of scrollables) {
      if (el.scrollHeight > el.clientHeight + 35) {
        return el;
      }
    }
    // 3. Check document/window for public website pages
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const winH = window.innerHeight;
    if (docH > winH + 35) {
      return document.documentElement;
    }
    return null;
  }, []);

  // 2. DYNAMIC HORIZONTAL ELEMENT RESOLVER
  const getPrimaryHorizontalElement = useCallback((): HTMLElement | null => {
    if (activeContainerRef.current && document.body.contains(activeContainerRef.current)) {
      if (activeContainerRef.current.scrollWidth > activeContainerRef.current.clientWidth + 25) {
        return activeContainerRef.current;
      }
    }
    const containers = Array.from(
      document.querySelectorAll<HTMLElement>('.overflow-x-auto, [data-scrollable="true"]')
    );
    for (const c of containers) {
      if (c.scrollWidth > c.clientWidth + 25) {
        return c;
      }
    }
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table'));
    for (const tbl of tables) {
      const parent = tbl.parentElement;
      if (parent && parent.scrollWidth > parent.clientWidth + 25) {
        return parent;
      }
    }
    return null;
  }, []);

  // 3. CHECK SCROLLABILITY & POSITION
  const evaluateScrollNeeds = useCallback(() => {
    // Check vertical scroll necessity
    const vEl = getPrimaryVerticalElement();
    const needsV = vEl !== null;
    setHasVerticalScroll(needsV);

    if (vEl) {
      let vTop = 0;
      let vH = 0;
      let vClient = 0;

      if (vEl === document.documentElement) {
        vTop = window.scrollY || document.documentElement.scrollTop || 0;
        vH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        vClient = window.innerHeight;
      } else {
        vTop = vEl.scrollTop;
        vH = vEl.scrollHeight;
        vClient = vEl.clientHeight;
      }

      setCanScrollUp(vTop > 25);
      setCanScrollDown(vTop < vH - vClient - 25);
    } else {
      setCanScrollUp(false);
      setCanScrollDown(false);
    }

    // Check horizontal scroll necessity
    const hEl = getPrimaryHorizontalElement();
    const needsH = hEl !== null;
    setHasHorizontalScroll(needsH);

    if (hEl) {
      const sLeft = hEl.scrollLeft;
      const maxLeft = hEl.scrollWidth - hEl.clientWidth;
      setCanScrollLeft(sLeft > 15);
      setCanScrollRight(sLeft < maxLeft - 15);
    } else {
      setCanScrollLeft(false);
      setCanScrollRight(false);
    }
  }, [getPrimaryVerticalElement, getPrimaryHorizontalElement]);

  // 4. AUTO-HIDE SCHEDULER (Only triggered by actual scrolling/wheel, NEVER by mousemove!)
  const triggerShowOnScroll = useCallback(() => {
    setIsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Auto hide after 1.8 seconds if not pinned and not hovered
    if (!isPinned) {
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsMenuOpen(false);
      }, 1800);
    }
  }, [isPinned]);

  // Pin toggle
  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    if (next) {
      setIsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      triggerShowOnScroll();
    }
    try {
      localStorage.setItem('siakad_nav_pinned', next ? 'true' : 'false');
    } catch { /* ignore */ }
  };

  // 5. EVENT LISTENERS
  useEffect(() => {
    let ticking = false;

    const handleScrollEvent = () => {
      triggerShowOnScroll();
      if (!ticking) {
        window.requestAnimationFrame(() => {
          evaluateScrollNeeds();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Notice: We intentionally do NOT listen to 'mousemove'!
    // Responsiveness to mouse is confined strictly to direct interactions.
    window.addEventListener('scroll', handleScrollEvent, { capture: true, passive: true });
    window.addEventListener('wheel', handleScrollEvent, { passive: true });
    window.addEventListener('touchmove', handleScrollEvent, { passive: true });
    window.addEventListener('resize', evaluateScrollNeeds, { passive: true });

    // Initial check
    evaluateScrollNeeds();

    // Observe DOM mutations so when tab content or table data updates, scroll needs are re-evaluated
    const observer = new MutationObserver(() => {
      evaluateScrollNeeds();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', handleScrollEvent, { capture: true });
      window.removeEventListener('wheel', handleScrollEvent);
      window.removeEventListener('touchmove', handleScrollEvent);
      window.removeEventListener('resize', evaluateScrollNeeds);
      observer.disconnect();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [evaluateScrollNeeds, triggerShowOnScroll]);

  // Re-check when active role or tab changes
  useEffect(() => {
    const timer = setTimeout(evaluateScrollNeeds, 150);
    return () => clearTimeout(timer);
  }, [activeRole, activeTab, evaluateScrollNeeds]);

  // 6. SCROLL HANDLERS
  const handleScrollUp = () => {
    const vEl = getPrimaryVerticalElement();
    if (vEl && vEl !== document.documentElement) {
      vEl.scrollBy({ top: -400, behavior: 'smooth' });
    }
    window.scrollBy({ top: -400, behavior: 'smooth' });
    document.documentElement.scrollBy({ top: -400, behavior: 'smooth' });
    document.body.scrollBy({ top: -400, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  const handleScrollTop = () => {
    const vEl = getPrimaryVerticalElement();
    if (vEl && vEl !== document.documentElement) {
      vEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  const handleScrollDown = () => {
    const vEl = getPrimaryVerticalElement();
    if (vEl && vEl !== document.documentElement) {
      vEl.scrollBy({ top: 400, behavior: 'smooth' });
    }
    window.scrollBy({ top: 400, behavior: 'smooth' });
    document.documentElement.scrollBy({ top: 400, behavior: 'smooth' });
    document.body.scrollBy({ top: 400, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  const handleScrollBottom = () => {
    const vEl = getPrimaryVerticalElement();
    if (vEl && vEl !== document.documentElement) {
      vEl.scrollTo({ top: vEl.scrollHeight, behavior: 'smooth' });
    }
    const maxH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    window.scrollTo({ top: maxH, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: maxH, behavior: 'smooth' });
    document.body.scrollTo({ top: maxH, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  const handleScrollLeft = () => {
    const hEl = getPrimaryHorizontalElement();
    if (hEl) hEl.scrollBy({ left: -320, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  const handleScrollFarLeft = () => {
    const hEl = getPrimaryHorizontalElement();
    if (hEl) hEl.scrollTo({ left: 0, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  const handleScrollRight = () => {
    const hEl = getPrimaryHorizontalElement();
    if (hEl) hEl.scrollBy({ left: 320, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  const handleScrollFarRight = () => {
    const hEl = getPrimaryHorizontalElement();
    if (hEl) hEl.scrollTo({ left: hEl.scrollWidth, behavior: 'smooth' });
    triggerShowOnScroll();
    setTimeout(evaluateScrollNeeds, 160);
  };

  // CRITICAL REQUIREMENT:
  // "Tombol akan Muncul Jika Kontent pada Tampilan Sistem butuh Navigasi"
  // If the screen does NOT need navigation (content fits without scrolling), do not render at all!
  const needsNavigation = hasVerticalScroll || hasHorizontalScroll;
  if (!needsNavigation) {
    return null;
  }

  const shouldBeVisible = isVisible || isPinned || isHovered || isMenuOpen;

  return (
    <>
      {/* 
        COMPACT & SLEEK FLOATING NAVIGATION DOCK
        Ultra-light, unobtrusive micro pill (height ~34px).
        Only renders the directional buttons that are needed.
        Auto-hides completely (opacity-0 & pointer-events-none) when idle.
      */}
      <div
        id="scroll-navigator-dock"
        className={`fixed bottom-4 right-4 z-40 select-none transition-all duration-200 ease-out ${
          shouldBeVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onMouseEnter={() => {
          setIsHovered(true);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (!isPinned) {
            hideTimerRef.current = setTimeout(() => {
              setIsVisible(false);
              setIsMenuOpen(false);
            }, 1500);
          }
        }}
      >
        <div className="flex items-center gap-0.5 bg-slate-900/90 hover:bg-slate-950 backdrop-blur-md text-slate-200 px-1.5 py-1 rounded-full shadow-lg border border-slate-700/80 ring-1 ring-white/10">
          
          {/* HORIZONTAL BUTTONS (Only shown if page has wide tables / horizontal scrolling) */}
          {hasHorizontalScroll && (
            <>
              <button
                type="button"
                onClick={handleScrollLeft}
                onDoubleClick={handleScrollFarLeft}
                title="Geser Kiri (2x klik: paling kiri)"
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                  canScrollLeft
                    ? 'text-cyan-300 hover:text-white hover:bg-cyan-700/60'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleScrollRight}
                onDoubleClick={handleScrollFarRight}
                title="Geser Kanan (2x klik: paling kanan)"
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                  canScrollRight
                    ? 'text-cyan-300 hover:text-white hover:bg-cyan-700/60'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {hasVerticalScroll && <div className="w-px h-3.5 bg-slate-700/80 mx-0.5" />}
            </>
          )}

          {/* VERTICAL BUTTONS (Only shown if page is longer than viewport) */}
          {hasVerticalScroll && (
            <>
              <button
                type="button"
                onClick={handleScrollUp}
                onDoubleClick={handleScrollTop}
                title="Scroll Atas (2x klik: puncak)"
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                  canScrollUp
                    ? 'text-white bg-indigo-600/90 hover:bg-indigo-500 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleScrollDown}
                onDoubleClick={handleScrollBottom}
                title="Scroll Bawah (2x klik: dasar)"
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                  canScrollDown
                    ? 'text-white bg-indigo-600/90 hover:bg-indigo-500 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* QUICK MENU BUTTON (If tabs exist) */}
          {availableTabs.length > 0 && onSelectTab && (
            <>
              <div className="w-px h-3.5 bg-slate-700/80 mx-0.5" />
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="Pintasan Tab Halaman"
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                  isMenuOpen
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* PIN TOGGLE (Keep visible or auto-hide) */}
          <button
            type="button"
            onClick={togglePin}
            title={isPinned ? 'Lepas Sematan (Auto-Hide Aktif)' : 'Sematkan Navigasi'}
            className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isPinned
                ? 'text-amber-400 bg-amber-400/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isPinned ? <Pin className="w-3 h-3 rotate-45" /> : <PinOff className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* COMPACT MENU DRAWER */}
      {isMenuOpen && shouldBeVisible && availableTabs.length > 0 && onSelectTab && (
        <div
          id="scroll-navigator-menu"
          className="fixed bottom-14 right-4 z-40 w-64 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl text-white rounded-xl p-3 shadow-xl border border-slate-700/90 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Pintasan {activeRole ? activeRole.replace('_', ' ') : 'Halaman'}
            </h4>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {availableTabs.map((t) => {
              const IconComp = t.icon || Compass;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(t.id);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <IconComp className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                    <span className="truncate">{t.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
