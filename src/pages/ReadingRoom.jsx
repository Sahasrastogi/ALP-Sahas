import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  Hash,
  Settings2,
} from 'lucide-react';
import api from '../utils/api';
import { getFallbackBookById } from '../utils/bookFallback';
import { markBookAsRead, syncSingleBookAccess } from '../utils/readingAccess';
import { trackBookOpened, updateReadingSession } from '../utils/readingSession';
import './ReadingRoom.css';

const TOTAL_PAGES = 15;
const PAGES_PER_CHAPTER = 3;
const MINUTES_PER_PAGE = 1.6;

const ReadingRoom = ({ uiTheme, onThemeChange }) => {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(1.1875);
  const [lineHeight, setLineHeight] = useState(1.72);
  const [showSettings, setShowSettings] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageTurnDirection, setPageTurnDirection] = useState(null);
  const [goToDraft, setGoToDraft] = useState('1');

  const chromeTimeoutRef = useRef(null);
  const pointerDownRef = useRef(null);
  const goToInputRef = useRef(null);
  const chapterTitleRef = useRef(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const { data } = await api.get(`/books/${bookId}`);
        setBook(data);
      } catch (error) {
        console.error('Failed to fetch book, using local fallback:', error);
        setBook(getFallbackBookById(bookId));
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const progressPercent = Math.round((currentPage / TOTAL_PAGES) * 100);
  const currentChapter = Math.ceil(currentPage / PAGES_PER_CHAPTER);
  const isFinished = currentPage === TOTAL_PAGES;
  const chapterStartPage = (currentChapter - 1) * PAGES_PER_CHAPTER + 1;
  const isChapterStartPage = currentPage === chapterStartPage;
  const chapterEndPage = Math.min(TOTAL_PAGES, currentChapter * PAGES_PER_CHAPTER);
  const pagesLeftInChapter = Math.max(0, chapterEndPage - currentPage);
  const minutesLeftInChapter = Math.max(1, Math.round((pagesLeftInChapter + 0.25) * MINUTES_PER_PAGE));
  const authorFragment = book?.author?.split(' ')[1] || book?.author || 'the author';
  const nextBookPath = book ? `/meet/${book._id || book.id}` : '/desk';
  const isDuneBook = book?.title?.trim().toLowerCase() === 'dune';

  const readingParagraphs = [
    (
      <>
        Evening gathered slowly around the room. The page stayed brighter than the hour, and the paragraph asked for
        nothing except time, breath, and attention. In books by {authorFragment}, the feeling often arrives this way:
        not as spectacle, but as pressure that deepens with each line.
      </>
    ),
    (
      <>
        This view keeps the column steady and the margins quiet. Line spacing opens the prose without loosening it.
        The surrounding interface recedes until the screen feels closer to paper than to software.
      </>
    ),
    (
      <>
        You are reading <strong>{book?.title}</strong>. Progress is remembered quietly in the background. Threads and
        rooms can wait until the sentence has had room to settle.
      </>
    ),
    (
      <>
        Page {currentPage} of {TOTAL_PAGES}. This is sample text meant to test cadence, alignment, and comfort across a
        full tablet screen.
      </>
    ),
  ];

  const duneParagraphs = [
    (
      <>
        The desert outside the window is not described directly; it is implied in the dryness of the air, in the way
        a throat tightens after a long day, in the faint grit that seems to live in cloth. A world can enter the room
        without raising its voice.
      </>
    ),
    (
      <>
        In a good chapter, information does not stack like a manual. It threads itself through sensation: a cup set
        down too carefully, a silence that arrives half a second late, the feeling that every choice has weight.
      </>
    ),
    (
      <>
        The rhythm of reading changes when the page is stable. Your eyes begin to trust the margins. You stop hunting
        for the next line and start listening for it.
      </>
    ),
    (
      <>
        Names and places should not interrupt the flow. They should land softly, become familiar, and then disappear
        into the movement of the story.
      </>
    ),
    (
      <>
        Some paragraphs want space. Others want momentum. When the line length is right, you can feel which one you are
        in before you finish the first sentence.
      </>
    ),
    (
      <>
        A page like this should carry you to the bottom without strain: a quiet start, a steady middle, and enough
        density to make the time feel real.
      </>
    ),
    (
      <>
        If you keep turning, the lighting should not change, the column should not drift, and the text should remain
        the only thing that moves with any intention.
      </>
    ),
    (
      <>
        This extra content is only here so you can judge the iPad Mini portrait layout: how the right edge holds under
        justification, how the footer sits, and how the page breathes near the bottom.
      </>
    ),
  ];

  const pageParagraphs = isDuneBook ? [...readingParagraphs, ...duneParagraphs] : readingParagraphs;

  const clearChromeTimer = () => {
    if (chromeTimeoutRef.current) {
      window.clearTimeout(chromeTimeoutRef.current);
      chromeTimeoutRef.current = null;
    }
  };

  const scheduleChromeHide = (delay = 2200) => {
    clearChromeTimer();
    if (showSettings) {
      return;
    }

    chromeTimeoutRef.current = window.setTimeout(() => {
      setChromeVisible(false);
    }, delay);
  };

  const revealChrome = (delay = 2200) => {
    setChromeVisible(true);
    scheduleChromeHide(delay);
  };

  const toggleChrome = () => {
    if (showSettings) {
      setShowSettings(false);
      return;
    }

    if (chromeVisible) {
      clearChromeTimer();
      setChromeVisible(false);
    } else {
      revealChrome(2200);
    }
  };

  const handleSurfacePointerDown = (event) => {
    if (event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;

    pointerDownRef.current = {
      x: event.clientX,
      y: event.clientY,
      at: Date.now(),
    };
  };

  const handleSurfacePointerUp = (event) => {
    if (event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;

    const down = pointerDownRef.current;
    pointerDownRef.current = null;

    if (down) {
      const dx = event.clientX - down.x;
      const dy = event.clientY - down.y;
      const elapsed = Date.now() - down.at;
      const distance = Math.hypot(dx, dy);

      if (distance > 12 || elapsed > 650) {
        return;
      }
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

    const viewportWidth = window.innerWidth || 1;
    const x = event.clientX / viewportWidth;

    if (x <= 0.33) {
      if (!isFinished) handlePrevPage();
      return;
    }

    if (x >= 0.67) {
      if (!isFinished) handleNextPage();
      return;
    }

    toggleChrome();
  };

  const handleNextPage = () => {
    if (currentPage < TOTAL_PAGES) {
      setPageTurnDirection('next');
      setCurrentPage((page) => page + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPageTurnDirection('prev');
      setCurrentPage((page) => page - 1);
    }
  };

  const openGoTo = () => {
    setGoToDraft(String(currentPage));
    setShowSettings(true);
    window.setTimeout(() => goToInputRef.current?.focus?.(), 0);
  };

  const handleGoToSubmit = (event) => {
    event.preventDefault();
    const desiredPage = Number.parseInt(goToDraft, 10);

    if (Number.isNaN(desiredPage)) {
      return;
    }

    const clamped = Math.min(TOTAL_PAGES, Math.max(1, desiredPage));
    setCurrentPage(clamped);
    setShowSettings(false);
    clearChromeTimer();
    setChromeVisible(false);
  };

  useEffect(() => {
    if (isFinished && book) {
      const accessState = markBookAsRead(book._id || book.id);
      updateReadingSession(book._id || book.id, TOTAL_PAGES, TOTAL_PAGES);
      syncSingleBookAccess(book._id || book.id, accessState).catch((error) => {
        console.error('Failed to sync read progress:', error);
      });
    }
  }, [isFinished, book]);

  useEffect(() => {
    if (book) {
      trackBookOpened(book._id || book.id);
      updateReadingSession(book._id || book.id, currentPage, TOTAL_PAGES);
    }
  }, [book, currentPage]);

  useEffect(() => {
    document.body.classList.add('is-reading-room');

    return () => {
      clearChromeTimer();
      document.body.classList.remove('is-reading-room');
    };
  }, []);

  useEffect(() => {
    if (showSettings) {
      clearChromeTimer();
      setChromeVisible(true);
      return;
    }

    scheduleChromeHide(1800);
  }, [showSettings]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    if (!pageTurnDirection) return undefined;
    const timeout = window.setTimeout(() => setPageTurnDirection(null), 220);
    return () => window.clearTimeout(timeout);
  }, [pageTurnDirection]);

  useEffect(() => {
    if (!isChapterStartPage) return undefined;
    const element = chapterTitleRef.current;
    const container = element?.parentElement;
    if (!element || !container) return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;

    let rafId = 0;

    const fitToSingleLine = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        element.style.fontSize = '';

        const viewportWidth = window.innerWidth || 0;
        const minPx = viewportWidth <= 820 ? 16 : 18;
        const hardMinPx = 14;
        let sizePx = Number.parseFloat(window.getComputedStyle(element).fontSize) || 0;

        while (element.scrollWidth > element.clientWidth && sizePx > minPx) {
          sizePx -= 1;
          element.style.fontSize = `${sizePx}px`;
        }

        while (element.scrollWidth > element.clientWidth && sizePx > hardMinPx) {
          sizePx -= 1;
          element.style.fontSize = `${sizePx}px`;
        }
      });
    };

    fitToSingleLine();

    const resizeObserver = new ResizeObserver(() => fitToSingleLine());
    resizeObserver.observe(container);
    window.addEventListener('resize', fitToSingleLine, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', fitToSingleLine);
      element.style.fontSize = '';
    };
  }, [isChapterStartPage, currentChapter, uiTheme]);

  if (loading) return <div className="text-center p-10 mt-20">Loading...</div>;
  if (!book) return <div className="text-center p-10 mt-20">Book not found.</div>;

  return (
    <div className={`reader-root theme-${uiTheme} animate-fade-in`}>
      <div className={`reader-toolbar ${chromeVisible ? 'is-visible' : ''} ${showSettings ? 'settings-open' : ''}`}>
        <button type="button" onClick={() => navigate('/desk')} className="back-btn">
          <ChevronLeft size={18} /> The Desk
        </button>

        <div className="reader-book-title">
          <span className="reader-book-name font-serif">{book.title}</span>
        </div>

        <div className="toolbar-actions">
          <button type="button" onClick={openGoTo} className="settings-btn" title="Go to page">
            <Hash size={17} />
          </button>

          <button
            type="button"
            onClick={() => setShowSettings((prev) => {
              const next = !prev;
              if (next) {
                setGoToDraft(String(currentPage));
              }
              return next;
            })}
            className="settings-btn"
            title="Reading settings"
          >
            <Settings2 size={17} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-backdrop" onClick={() => setShowSettings(false)}>
          <div className="settings-panel glass-panel" onClick={(event) => event.stopPropagation()}>
            <div className="settings-panel-header">
              <div>
                <span className="settings-label">Reading settings</span>
                <h3 className="font-serif">Tune the page, then let it disappear.</h3>
              </div>
              <button type="button" className="settings-close" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>

            <div className="settings-group">
              <span className="settings-label">Go to page</span>
              <form className="goto-form" onSubmit={handleGoToSubmit}>
                <input
                  ref={goToInputRef}
                  className="goto-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={TOTAL_PAGES}
                  value={goToDraft}
                  onChange={(event) => setGoToDraft(event.target.value)}
                  aria-label="Go to page number"
                />
                <button type="submit" className="goto-submit">Go</button>
              </form>
            </div>

            <div className="settings-group">
              <span className="settings-label">Theme</span>
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

            <div className="settings-group">
              <span className="settings-label">Text size</span>
              <div className="font-size-toggles">
                <button type="button" onClick={() => setFontSize((size) => Math.max(0.96, Number((size - 0.05).toFixed(2))))}>A-</button>
                <span className="font-size-display">{Math.round(fontSize * 100)}%</span>
                <button type="button" onClick={() => setFontSize((size) => Math.min(1.35, Number((size + 0.05).toFixed(2))))}>A+</button>
              </div>
            </div>

            <div className="settings-group">
              <span className="settings-label">Line spacing</span>
              <div className="line-height-options">
                <button type="button" className={lineHeight === 1.66 ? 'active' : ''} onClick={() => setLineHeight(1.66)}>
                  Compact
                </button>
                <button type="button" className={lineHeight === 1.72 ? 'active' : ''} onClick={() => setLineHeight(1.72)}>
                  Book
                </button>
                <button type="button" className={lineHeight === 1.8 ? 'active' : ''} onClick={() => setLineHeight(1.8)}>
                  Open
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="reader-surface" onPointerDown={handleSurfacePointerDown} onPointerUp={handleSurfacePointerUp}>
        <main
          className={`reading-column reader-content-wrapper font-serif ${isChapterStartPage ? 'is-chapter-start' : ''} ${pageTurnDirection ? `is-turning is-turning-${pageTurnDirection}` : ''}`}
          style={{ fontSize: `${fontSize}rem`, lineHeight }}
          lang="en"
        >
          {isChapterStartPage && (
            <header className="chapter-heading">
              <span className="chapter-kicker">Chapter {currentChapter}</span>
              <h2 ref={chapterTitleRef} className="chapter-title">A quieter page, held at reading distance.</h2>
            </header>
          )}

          {pageParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}

          {isFinished && (
            <div className="finish-banner animate-fade-in">
              <CheckCircle size={48} className="finish-icon" />
              <h3>You've reached the last page.</h3>
              <p>The story ends, but the conversation is just beginning.</p>

              <Link to={nextBookPath} className="meet-people-btn mt-6">
                Continue to discussion <ArrowRight size={20} />
              </Link>
            </div>
          )}
        </main>
      </div>

      <div className={`reader-progress ${chromeVisible ? 'is-visible' : ''}`}>
        <div className="progress-info">
          <span>Page {currentPage} / {TOTAL_PAGES}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <footer className="reader-footer" aria-label="Reading progress">
        <span>Page {currentPage} of {TOTAL_PAGES}</span>
        <span className="footer-divider" aria-hidden="true">Â·</span>
        <span>{minutesLeftInChapter} min left in chapter</span>
      </footer>
    </div>
  );
};

export default ReadingRoom;
