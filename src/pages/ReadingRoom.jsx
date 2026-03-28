import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  Type,
} from 'lucide-react';
import api from '../utils/api';
import { getFallbackBookById } from '../utils/bookFallback';
import { markBookAsRead, syncSingleBookAccess } from '../utils/readingAccess';
import { trackBookOpened, updateReadingSession } from '../utils/readingSession';
import { PaginationEngine } from '../components/reader/PaginationEngine';
import PageRenderer from '../components/reader/PageRenderer';
import './ReadingRoom.css';

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const escapeHtml = (value) => (
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
);

const getSectionTitle = (chapter, chapterNumber) => {
  const rawTitle = String(chapter?.title || '').trim();
  if (!rawTitle) {
    return '';
  }

  const stripped = rawTitle.replace(/^(chapter|book|part)\s+[ivxlcdm\d]+[\s.:,-]*/i, '').trim();
  if (stripped) {
    return stripped;
  }

  const normalized = rawTitle.replace(/[\s.:,-]+/g, ' ').trim().toLowerCase();
  if (
    normalized === `chapter ${chapterNumber}`
    || normalized === `book ${chapterNumber}`
    || normalized === `part ${chapterNumber}`
  ) {
    return '';
  }

  return rawTitle;
};

// Gutenberg parsing is now handled server-side; keep client lean.

const ReadingRoom = ({ uiTheme, onThemeChange }) => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentError, setContentError] = useState(false);

  const [fontSize, setFontSize] = useState(1.1875);
  const [fontFamily, setFontFamily] = useState('serif');
  const [lineHeight, setLineHeight] = useState(1.78);
  const [marginScale, setMarginScale] = useState(1);
  const [chromeVisible, setChromeVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPageHtml, setCurrentPageHtml] = useState('');
  const [totalPages, setTotalPages] = useState(null);
  const [paginationDone, setPaginationDone] = useState(false);
  const [pageTurnDirection, setPageTurnDirection] = useState(null);
  const [pendingRestore, setPendingRestore] = useState(null);

  const chromeTimeoutRef = useRef(null);
  const pointerDownRef = useRef(null);
  const pageViewportRef = useRef(null);
  const paginationEngineRef = useRef(null);
  const currentPageIndexRef = useRef(0);
  const chapterPageMemoryRef = useRef({});
  const pendingChapterPageRef = useRef(null);

  const resolvedBookId = book?._id || book?.id || bookId;
  const returnTo = location.state?.returnTo;
  const currentReadingPath = `${location.pathname}${location.search}${location.hash}`;
  const returnToStorageKey = useMemo(
    () => `atlpg:return-to:${resolvedBookId || bookId}`,
    [bookId, resolvedBookId],
  );

  useEffect(() => {
    if (!returnToStorageKey) return;
    if (typeof returnTo !== 'string' || !returnTo.startsWith('/')) return;
    if (returnTo === currentReadingPath) return;

    try {
      window.sessionStorage.setItem(returnToStorageKey, returnTo);
    } catch (error) {
      console.warn('Failed to persist reader return target:', error);
    }
  }, [currentReadingPath, returnTo, returnToStorageKey]);

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setContentError(false);

      try {
        const { data } = await api.get(`/books/${bookId}`);
        setBook(data);
      } catch (error) {
        console.error('Failed to fetch book, using local fallback:', error);
        setBook(getFallbackBookById(bookId));
      }
    };

    fetchBook();
  }, [bookId]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!resolvedBookId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/books/${resolvedBookId}/content`);
        const nextChapters = Array.isArray(data?.chapters) ? data.chapters : [];

        if (nextChapters.length === 0) {
          throw new Error('Book content response did not include any chapters.');
        }

        chapterPageMemoryRef.current = {};
        pendingChapterPageRef.current = 0;
        setChapters(nextChapters);
        setCurrentChapter(1);
      } catch (error) {
        console.error('Failed to fetch book content:', error);
        setChapters([]);
        setContentError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [resolvedBookId]);

  const totalChapters = Math.max(1, chapters.length);
  const clampedChapter = clampNumber(currentChapter, 1, totalChapters);
  const chapterIndex = clampedChapter - 1;
  const activeChapter = chapters[chapterIndex] || null;
  const isLastChapter = chapters.length > 0 && clampedChapter === totalChapters;

  const progressPercent = useMemo(
    () => Math.round((clampedChapter / totalChapters) * 100),
    [clampedChapter, totalChapters],
  );

  const nextBookPath = book ? `/meet/${book._id || book.id}` : '/desk';
  const chapterHtmlForPagination = useMemo(() => {
    if (!activeChapter) return '';

    const bookLabel = escapeHtml(book?.title || 'Reading room');
    const progressLabel = escapeHtml(`Chapter ${clampedChapter} of ${totalChapters}`);
    const displayTitle = getSectionTitle(activeChapter, clampedChapter);
    const content = String(activeChapter.html || '');

    return [
      '<header class="chapter-heading">',
      `<span class="chapter-book">${bookLabel}</span>`,
      `<span class="chapter-progress">${progressLabel}</span>`,
      ...(displayTitle ? [`<h2 class="chapter-title">${escapeHtml(displayTitle)}</h2>`] : []),
      '</header>',
      content,
    ].join('\n');
  }, [activeChapter, book?.title, clampedChapter, totalChapters]);

  const readerLayout = useMemo(() => {
    const family = fontFamily === 'sans'
      ? "'IBM Plex Sans', 'Segoe UI', sans-serif"
      : "'Literata', Georgia, serif";

    return {
      fontSizeRem: fontSize,
      lineHeight,
      fontFamily: family,
      marginScale,
    };
  }, [fontFamily, fontSize, lineHeight, marginScale]);

  const readerLayoutRef = useRef(readerLayout);
  useEffect(() => {
    readerLayoutRef.current = readerLayout;
  }, [readerLayout]);

  const readerLayoutSignature = useMemo(
    () => `${fontFamily}|${fontSize}|${lineHeight}|${marginScale}`,
    [fontFamily, fontSize, lineHeight, marginScale],
  );

  const readerPositionStorageKey = useMemo(() => (
    resolvedBookId ? `atlpg:reading-position:v1:${resolvedBookId}` : null
  ), [resolvedBookId]);

  const lastKnownBoundaryRef = useRef({ blockIndex: 0, textOffset: 0 });
  const lastAppliedLayoutSignatureRef = useRef(readerLayoutSignature);

  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
    chapterPageMemoryRef.current[clampedChapter] = currentPageIndex;
  }, [clampedChapter, currentPageIndex]);

  const clearChromeTimer = useCallback(() => {
    if (chromeTimeoutRef.current) {
      window.clearTimeout(chromeTimeoutRef.current);
      chromeTimeoutRef.current = null;
    }
  }, []);

  const scheduleChromeHide = useCallback((delay = 2600) => {
    clearChromeTimer();
    chromeTimeoutRef.current = window.setTimeout(() => {
      setChromeVisible(false);
    }, delay);
  }, [clearChromeTimer]);

  const revealChrome = useCallback((delay = 2600) => {
    setChromeVisible(true);
    scheduleChromeHide(delay);
  }, [scheduleChromeHide]);

  const revealChromeOnInteraction = useCallback(() => {
    revealChrome(2600);
  }, [revealChrome]);

  const handleSurfacePointerDown = (event) => {
    if (event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;

    pointerDownRef.current = {
      x: event.clientX,
      y: event.clientY,
      at: Date.now(),
    };
  };

  const handleSurfacePointerCancel = () => {
    pointerDownRef.current = null;
  };

  const handleReturn = useCallback(() => {
    let target = null;

    if (typeof returnTo === 'string' && returnTo.startsWith('/')) {
      target = returnTo;
    } else if (returnToStorageKey) {
      try {
        target = window.sessionStorage.getItem(returnToStorageKey);
      } catch (error) {
        console.warn('Failed to read reader return target:', error);
      }
    }

    if (target && target !== currentReadingPath) {
      navigate(target, { replace: true });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/desk');
  }, [currentReadingPath, navigate, returnTo, returnToStorageKey]);

  const handleNextPage = useCallback(() => {
    const engine = paginationEngineRef.current;
    if (!engine) return;

    const currentIndex = currentPageIndexRef.current;
    const nextIndex = currentIndex + 1;
    const next = engine.ensurePage(nextIndex);

    if (next.html) {
      setPageTurnDirection('next');
      setCurrentPageIndex(() => nextIndex);
      return;
    }

    if (next.isDone && next.totalPages != null && nextIndex >= next.totalPages) {
      if (clampedChapter < totalChapters) {
        setPageTurnDirection('next');
        pendingChapterPageRef.current = 0;
        setCurrentChapter((chapter) => Math.min(totalChapters, chapter + 1));
      }
    }
  }, [clampedChapter, totalChapters]);

  const handlePrevPage = useCallback(() => {
    const currentIndex = currentPageIndexRef.current;

    if (currentIndex > 0) {
      setPageTurnDirection('prev');
      setCurrentPageIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (clampedChapter > 1) {
      const targetChapter = clampedChapter - 1;
      setPageTurnDirection('prev');
      pendingChapterPageRef.current = chapterPageMemoryRef.current[targetChapter] ?? 0;
      setCurrentChapter((chapter) => Math.max(1, chapter - 1));
    }
  }, [clampedChapter]);

  const handleSurfacePointerUp = (event) => {
    if (event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;

    const down = pointerDownRef.current;
    pointerDownRef.current = null;

    const viewportWidth = window.innerWidth || 1;

    if (down) {
      const dx = event.clientX - down.x;
      const dy = event.clientY - down.y;
      const elapsed = Date.now() - down.at;
      const distance = Math.hypot(dx, dy);
      const swipeThreshold = Math.max(52, Math.min(88, viewportWidth * 0.06));
      const horizontalIntent = Math.abs(dx) > Math.abs(dy) * 1.2;
      const quickSwipe = elapsed < 750;

      const isHorizontalSwipe = horizontalIntent && Math.abs(dx) > swipeThreshold && Math.abs(dy) < 84 && quickSwipe;
      if (isHorizontalSwipe) {
        if (dx < 0) {
          handleNextPage();
        } else {
          handlePrevPage();
        }
        return;
      }

      if (distance > 12 || elapsed > 650) return;
    }

    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed) return;

    const path = event.composedPath?.() || [];
    const isInteractive = path.some((node) => (
      node?.tagName === 'A'
      || node?.tagName === 'BUTTON'
      || node?.tagName === 'INPUT'
      || node?.tagName === 'TEXTAREA'
      || node?.tagName === 'SELECT'
      || node?.tagName === 'LABEL'
    ));
    if (isInteractive) return;

    const x = event.clientX / viewportWidth;

    if (x <= 0.3) {
      handlePrevPage();
      return;
    }

    if (x >= 0.7) {
      handleNextPage();
      return;
    }

    revealChromeOnInteraction();
  };

  const isAtEndOfChapter = Boolean(
    paginationDone
    && totalPages != null
    && totalPages > 0
    && currentPageIndex >= totalPages - 1,
  );

  const isAtEndOfBook = Boolean(book && isLastChapter && isAtEndOfChapter);

  useEffect(() => {
    if (!readerPositionStorageKey) return;
    if (chapters.length === 0) return;
    if (pendingRestore) return;

    try {
      const raw = window.localStorage.getItem(readerPositionStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const chapterNumber = clampNumber(Number(saved?.chapterNumber || 1), 1, totalChapters);

      const savedSettings = saved?.settings || null;
      if (savedSettings) {
        if (typeof savedSettings.fontSize === 'number') setFontSize(savedSettings.fontSize);
        if (typeof savedSettings.lineHeight === 'number') setLineHeight(savedSettings.lineHeight);
        if (typeof savedSettings.marginScale === 'number') setMarginScale(savedSettings.marginScale);
        if (typeof savedSettings.fontFamily === 'string') setFontFamily(savedSettings.fontFamily);
      }

      const desiredTheme = saved?.uiTheme || saved?.theme;
      if (desiredTheme && desiredTheme !== uiTheme) {
        onThemeChange?.(desiredTheme);
      }

      const anchor = saved?.reading_anchor || saved?.anchor || null;
      const pageIndexFallback = Math.max(0, Number(saved?.page_index ?? saved?.pageIndex ?? 0) || 0);

      setPendingRestore({ chapterNumber, anchor, pageIndexFallback });
      setCurrentChapter(chapterNumber);
    } catch (error) {
      console.warn('Failed to restore reading position:', error);
    }
  }, [chapters.length, onThemeChange, pendingRestore, readerPositionStorageKey, totalChapters, uiTheme]);

  useEffect(() => {
    const viewportEl = pageViewportRef.current;
    if (!viewportEl) return undefined;
    if (!chapterHtmlForPagination) return undefined;

    const layout = readerLayoutRef.current;
    if (!paginationEngineRef.current) {
      paginationEngineRef.current = new PaginationEngine({ viewportEl, layout });
    } else {
      paginationEngineRef.current.setViewportEl(viewportEl);
      paginationEngineRef.current.setLayout(layout);
    }

    paginationEngineRef.current.setChapterHtml(chapterHtmlForPagination);

    return () => {
      // Keep engine between chapter transitions; destroy on unmount.
    };
  }, [chapterHtmlForPagination]);

  useEffect(() => {
    const engine = paginationEngineRef.current;
    if (!engine) return;
    const boundary = engine.getPageStartBoundary?.(currentPageIndex);
    if (boundary) {
      lastKnownBoundaryRef.current = boundary;
    }
  }, [chapterHtmlForPagination, currentPageIndex]);

  useEffect(() => {
    const engine = paginationEngineRef.current;
    if (!engine) return;
    if (!chapterHtmlForPagination) return;
    if (pendingRestore) return;

    if (lastAppliedLayoutSignatureRef.current === readerLayoutSignature) return;
    lastAppliedLayoutSignatureRef.current = readerLayoutSignature;

    const anchor = lastKnownBoundaryRef.current || { blockIndex: 0, textOffset: 0 };
    engine.setLayout(readerLayoutRef.current);
    engine.resetPagination();
    const restoredIndex = engine.ensurePageIndexForBoundary(anchor);
    setCurrentPageIndex(restoredIndex);
  }, [chapterHtmlForPagination, pendingRestore, readerLayoutSignature]);

  useEffect(() => (
    () => paginationEngineRef.current?.destroy?.()
  ), []);

  useEffect(() => {
    if (!activeChapter) return;

    if (pendingRestore && pendingRestore.chapterNumber === clampedChapter) {
      const engine = paginationEngineRef.current;
      if (engine && pendingRestore.anchor) {
        engine.setLayout(readerLayoutRef.current);
        engine.resetPagination();
        const boundary = engine.boundaryFromReadingAnchor(pendingRestore.anchor);
        const restoredIndex = engine.ensurePageIndexForBoundary(boundary);
        setCurrentPageIndex(restoredIndex);
      } else {
        setCurrentPageIndex(Math.max(0, Number(pendingRestore.pageIndexFallback) || 0));
      }
      setPendingRestore(null);
      return;
    }

    if (pendingChapterPageRef.current != null) {
      const targetPage = Math.max(0, Number(pendingChapterPageRef.current) || 0);
      pendingChapterPageRef.current = null;
      setCurrentPageIndex(targetPage);
      return;
    }

    setCurrentPageIndex(0);
  }, [activeChapter, clampedChapter, pendingRestore]);

  useEffect(() => {
    const engine = paginationEngineRef.current;
    if (!engine) return;
    if (!chapterHtmlForPagination) return;

    const result = engine.ensurePage(currentPageIndex);
    if (!result.html && currentPageIndex > 0) {
      if (result.isDone && result.totalPages != null && result.totalPages > 0) {
        setCurrentPageIndex(Math.max(0, result.totalPages - 1));
      } else {
        setCurrentPageIndex((index) => Math.max(0, index - 1));
      }
      return;
    }

    setCurrentPageHtml(result.html);
    setTotalPages(result.totalPages);
    setPaginationDone(result.isDone);
  }, [chapterHtmlForPagination, currentPageIndex, readerLayout]);

  useEffect(() => {
    const engine = paginationEngineRef.current;
    if (!engine) return undefined;

    const target = currentPageIndex + 1;
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(() => engine.precomputeThrough(target), { timeout: 600 });
      return () => window.cancelIdleCallback(handle);
    }

    const timeout = window.setTimeout(() => engine.precomputeThrough(target), 60);
    return () => window.clearTimeout(timeout);
  }, [chapterHtmlForPagination, currentPageIndex, readerLayout]);

  useEffect(() => {
    const engine = paginationEngineRef.current;
    if (!engine) return undefined;
    if (!chapterHtmlForPagination) return undefined;

    let cancelled = false;
    let handle = 0;

    const step = (deadline) => {
      if (cancelled) return;

      const budgetOk = !deadline || deadline.didTimeout || (typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() > 8);
      if (budgetOk) {
        engine.precomputeNextPages(2);
      }

      const total = engine.getTotalPagesIfKnown();
      if (total != null) {
        setTotalPages(total);
        setPaginationDone(true);
        return;
      }

      if (typeof window.requestIdleCallback === 'function') {
        handle = window.requestIdleCallback(step, { timeout: 900 });
      } else {
        handle = window.setTimeout(() => step({ didTimeout: true, timeRemaining: () => 50 }), 60);
      }
    };

    step();

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function' && handle) {
        window.cancelIdleCallback(handle);
      } else if (handle) {
        window.clearTimeout(handle);
      }
    };
  }, [chapterHtmlForPagination, readerLayoutSignature]);

  useEffect(() => {
    const viewportEl = pageViewportRef.current;
    const engine = paginationEngineRef.current;
    if (!viewportEl || !engine) return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;

    let lastWidth = 0;
    let lastHeight = 0;

    const resizeObserver = new ResizeObserver(() => {
      const rect = viewportEl.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width === lastWidth && height === lastHeight) return;

      lastWidth = width;
      lastHeight = height;
      const anchor = engine.getPageStartBoundary?.(currentPageIndexRef.current)
        || lastKnownBoundaryRef.current
        || { blockIndex: 0, textOffset: 0 };
      engine.setViewportEl(viewportEl);
      engine.resetPagination();
      const restoredIndex = engine.ensurePageIndexForBoundary(anchor);
      setCurrentPageIndex(restoredIndex);
    });

    resizeObserver.observe(viewportEl);
    return () => resizeObserver.disconnect();
  }, [chapterHtmlForPagination]);

  useEffect(() => {
    if (!readerPositionStorageKey) return;
    if (!activeChapter) return;

    const chapterId = activeChapter?._id || activeChapter?.id || activeChapter?.chapter_id || activeChapter?.index || clampedChapter;
    const engine = paginationEngineRef.current;
    const readingAnchor = engine?.getReadingAnchorForPageStart?.(currentPageIndex) || { paragraphIndex: 0, characterOffset: 0, blockIndex: 0, textOffset: 0 };

    try {
      window.localStorage.setItem(readerPositionStorageKey, JSON.stringify({
        book_id: resolvedBookId,
        chapter_id: chapterId,
        chapterNumber: clampedChapter,
        reading_anchor: readingAnchor,
        page_index: currentPageIndex,
        settings: {
          fontSize,
          fontFamily,
          lineHeight,
          marginScale,
        },
        uiTheme,
      }));
    } catch (error) {
      console.warn('Failed to persist reading position:', error);
    }
  }, [activeChapter, clampedChapter, currentPageIndex, fontFamily, fontSize, lineHeight, marginScale, readerPositionStorageKey, resolvedBookId, uiTheme]);

  useEffect(() => {
    if (isAtEndOfBook && book) {
      const accessState = markBookAsRead(book._id || book.id);
      updateReadingSession(book._id || book.id, totalChapters, totalChapters);
      syncSingleBookAccess(book._id || book.id, accessState).catch((error) => {
        console.error('Failed to sync read progress:', error);
      });
    }
  }, [book, isAtEndOfBook, totalChapters]);

  useEffect(() => {
    if (book) {
      trackBookOpened(book._id || book.id);
      updateReadingSession(book._id || book.id, clampedChapter, totalChapters);
    }
  }, [book, clampedChapter, totalChapters]);

  useEffect(() => {
    document.body.classList.add('is-reading-room');

    return () => {
      clearChromeTimer();
      document.body.classList.remove('is-reading-room');
    };
  }, [clearChromeTimer]);

  useEffect(() => {
    if (showSettings) {
      clearChromeTimer();
      setChromeVisible(true);
      return;
    }

    scheduleChromeHide(2600);
  }, [clearChromeTimer, scheduleChromeHide, showSettings]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showSettings) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowSettings(false);
        }
        return;
      }

      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.defaultPrevented) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        handleNextPage();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        handlePrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, showSettings]);

  useEffect(() => {
    if (!pageTurnDirection) return undefined;
    const timeout = window.setTimeout(() => setPageTurnDirection(null), 220);
    return () => window.clearTimeout(timeout);
  }, [pageTurnDirection]);

  if (loading) return <div className="text-center p-10 mt-20">Loading...</div>;
  if (!book) return <div className="text-center p-10 mt-20">Book not found.</div>;
  if (contentError) return <div className="text-center p-10 mt-20">Unable to load this book right now.</div>;
  if (!activeChapter) return <div className="text-center p-10 mt-20">Preparing chapters...</div>;

  return (
    <div className={`reader-root theme-${uiTheme} animate-fade-in`}>
      <div
        className={`reader-toolbar ${chromeVisible ? 'is-visible' : ''}`}
        onPointerDownCapture={() => revealChrome(2600)}
        onFocusCapture={() => revealChrome(2600)}
      >
        <button type="button" onClick={handleReturn} className="back-btn">
          <ChevronLeft size={18} /> The Desk
        </button>

        <div className="reader-book-title">
          <div className="reader-title-block">
            <span className="reader-overline">Reading room</span>
          </div>
        </div>

        <button
          type="button"
          className="reader-settings-trigger"
          onClick={() => {
            clearChromeTimer();
            setChromeVisible(true);
            setShowSettings(true);
          }}
          aria-label="Open reading settings"
          title="Reading settings"
        >
          <Type size={16} />
        </button>
      </div>

      {showSettings && (
        <div className="settings-backdrop" onClick={() => setShowSettings(false)}>
          <div
            className="settings-panel glass-panel"
            onClick={(event) => event.stopPropagation()}
            onPointerDownCapture={() => revealChrome(2600)}
            onFocusCapture={() => revealChrome(2600)}
          >
            <div className="settings-panel-header">
              <div>
                <span className="settings-label">Reading settings</span>
                <h3 className="font-serif">Adjust the page, then let it disappear.</h3>
              </div>
              <button type="button" className="settings-close" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>

            <div className="settings-group">
              <span className="settings-label">Appearance</span>
              <div className="settings-stack">
                <div className="settings-subgroup">
                  <span className="settings-subtitle">Theme</span>
                  <div className="theme-toggles">
                    <button
                      type="button"
                      className={`theme-btn preview-light ${uiTheme === 'light' ? 'active' : ''}`}
                      onClick={() => onThemeChange('light')}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      className={`theme-btn preview-sepia ${uiTheme === 'sepia' ? 'active' : ''}`}
                      onClick={() => onThemeChange('sepia')}
                    >
                      Sepia
                    </button>
                    <button
                      type="button"
                      className={`theme-btn preview-dark ${uiTheme === 'dark' ? 'active' : ''}`}
                      onClick={() => onThemeChange('dark')}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                <div className="settings-subgroup">
                  <span className="settings-subtitle">Font</span>
                  <div className="line-height-options line-height-options--two">
                    <button type="button" className={fontFamily === 'serif' ? 'active' : ''} onClick={() => setFontFamily('serif')}>
                      Serif
                    </button>
                    <button type="button" className={fontFamily === 'sans' ? 'active' : ''} onClick={() => setFontFamily('sans')}>
                      Sans
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <span className="settings-label">Reading comfort</span>
              <div className="settings-stack">
                <div className="settings-subgroup">
                  <span className="settings-subtitle">Text size</span>
                  <div className="font-size-toggles">
                    <button type="button" onClick={() => setFontSize((size) => Math.max(0.96, Number((size - 0.05).toFixed(2))))}>A-</button>
                    <span className="font-size-display">{Math.round(fontSize * 100)}%</span>
                    <button type="button" onClick={() => setFontSize((size) => Math.min(1.35, Number((size + 0.05).toFixed(2))))}>A+</button>
                  </div>
                </div>

                <div className="settings-subgroup">
                  <span className="settings-subtitle">Line spacing</span>
                  <div className="line-height-options">
                    <button type="button" className={lineHeight === 1.66 ? 'active' : ''} onClick={() => setLineHeight(1.66)}>
                      Compact
                    </button>
                    <button type="button" className={lineHeight === 1.78 ? 'active' : ''} onClick={() => setLineHeight(1.78)}>
                      Standard
                    </button>
                    <button type="button" className={lineHeight === 1.9 ? 'active' : ''} onClick={() => setLineHeight(1.9)}>
                      Open
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="reader-surface">
        <PageRenderer
          viewportRef={pageViewportRef}
          html={currentPageHtml}
          pageTurnDirection={pageTurnDirection}
          style={{
            fontSize: `${fontSize}rem`,
            lineHeight,
            '--font-reading': readerLayout.fontFamily,
            '--reader-margin-scale': marginScale,
          }}
          onPointerDown={handleSurfacePointerDown}
          onPointerCancel={handleSurfacePointerCancel}
          onPointerUp={handleSurfacePointerUp}
        />
      </div>

      {isAtEndOfBook && (
        <div className="finish-overlay animate-fade-in" role="dialog" aria-label="Finished book">
          <div className="finish-banner">
            <CheckCircle size={48} className="finish-icon" />
            <h3>You've reached the last page.</h3>
            <p>The story ends, but the conversation is just beginning.</p>

            <Link to={nextBookPath} className="meet-people-btn mt-6">
              Continue to discussion <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      )}

      <footer className={`reader-footer ${chromeVisible ? 'is-visible' : ''}`} aria-label="Reading progress">
        <span>Chapter {clampedChapter} of {totalChapters}</span>
        <span className="footer-divider" aria-hidden="true">&middot;</span>
        <span>{progressPercent}% read</span>
        {paginationDone && totalPages ? (
          <>
            <span className="footer-divider" aria-hidden="true">&middot;</span>
            <span>Page {currentPageIndex + 1} of {totalPages}</span>
          </>
        ) : null}
      </footer>
    </div>
  );
};

export default ReadingRoom;
