import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Check, MoveRight, Users } from 'lucide-react';
import api from '../utils/api';
import { getFallbackBooks } from '../utils/bookFallback';
import { getLibraryState } from '../utils/readingSession';
import { getDisplayBookTitle } from '../utils/bookTitle';
import BookCoverArt from '../components/books/BookCoverArt';
import './LandingPage.css';

const getBookId = (book) => book._id || book.id;

const countReplies = (comments = []) => comments.reduce(
  (sum, comment) => sum + 1 + countReplies(comment.replies || []),
  0,
);

const renderCover = (book) => (
  <BookCoverArt
    book={book}
    imgClassName="home-cover-image compact"
    fallbackClassName="home-cover-fallback compact"
    showSpine
    showPattern={false}
    spineClassName="home-cover-spine"
    patternClassName="home-cover-pattern"
  />
);

const FeaturedBook = ({ book, isMember, returnTo }) => (
  <Link to={isMember ? `/read/${getBookId(book)}` : "/auth"} state={isMember ? { returnTo } : undefined} className="home-featured-link" aria-label={`Open ${book.title}`}>
    <article className="home-featured-book">
      <div className="home-featured-cover" style={{ '--book-accent': book.coverColor || '#6f614d' }}>
        {renderCover(book)}
        <span className="home-featured-overlay" aria-hidden="true">Start reading →</span>
      </div>
      <div className="home-featured-copy">
        <h3 className="font-serif">{getDisplayBookTitle(book.title)}</h3>
        <p>{book.author}</p>
      </div>
    </article>
  </Link>
);

const DiscussionEntry = ({ thread }) => {
  const readerCount = Math.max(1, Number(thread.replyCount) || 1);
  return (
    <Link to={`/thread/${thread.bookId}#${thread._id}`} className="home-discussion-card-link">
      <article className="home-discussion-card">
        <div className="home-discussion-card-live">
          <span className="home-live-dot" aria-hidden="true" />
          <span>Live</span>
        </div>
        <h3 className="font-serif">{thread.bookTitle} discussion</h3>
        <p>{readerCount} readers currently discussing</p>
        <span className="home-discussion-card-cta">Join →</span>
      </article>
    </Link>
  );
};

const howItWorksSteps = [
  {
    key: 'read',
    title: 'Read in silence',
    description: 'A quiet reading space designed for focus.',
    icon: BookOpen,
  },
  {
    key: 'finish',
    title: 'Mark the moment',
    description: 'Mark the moment you complete a book.',
    icon: Check,
  },
  {
    key: 'discuss',
    title: 'Enter the room',
    description: 'Join meaningful conversations with readers who finished it too.',
    icon: Users,
  },
];

const placeholderActivity = [
  { id: 'dracula', title: 'Dracula discussion', subtext: '3 readers currently discussing' },
  { id: 'frankenstein', title: 'Frankenstein discussion', subtext: '2 readers currently discussing' },
  { id: 'pride-and-prejudice', title: 'Pride and Prejudice discussion', subtext: '1 reader currently discussing' },
];

const getResumeProgressLabel = (book) => {
  if (!book) {
    return 'Continue from where you left off.';
  }

  if (typeof book.progressPercent === 'number') {
    return `${Math.round(book.progressPercent)}% complete`;
  }

  if (typeof book.progress === 'number') {
    return `${Math.round(book.progress)}% complete`;
  }

  return 'Continue from where you left off.';
};

export default function LandingPage({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [books, setBooks] = useState([]);
  const [sampleThreads, setSampleThreads] = useState([]);
  const [isHowInView, setIsHowInView] = useState(false);
  const howItWorksRef = React.useRef(null);
  const howItWorksTimeoutRef = React.useRef(null);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  const isMember = Boolean(currentUser && !currentUser.isAnonymous);
  const threadPreviewCount = isMember ? 2 : 6;

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data } = await api.get('/books');
        setBooks(data);
      } catch (error) {
        console.error('Failed to fetch books, using local fallback:', error);
        setBooks(getFallbackBooks());
      }
    };

    fetchBooks();
  }, []);

  const featuredBooks = useMemo(() => books.slice(0, 10), [books]);

  const resumeBook = useMemo(() => {
    if (!isMember || books.length === 0) {
      return null;
    }

    const libraryState = getLibraryState(books);
    return libraryState.continueReading[0] || libraryState.recentlyOpened[0] || null;
  }, [books, isMember]);

  useEffect(() => {
    if (!books.length) {
      return;
    }

    const seedBooks = books.slice(0, 4);
    let isCancelled = false;

    const fetchThreads = async () => {
      try {
        const results = await Promise.allSettled(
          seedBooks.map((book) => api.get(`/threads/${getBookId(book)}?sort=hot`)),
        );

        if (isCancelled) {
          return;
        }

        const nextThreads = results.flatMap((result, index) => {
          if (result.status !== 'fulfilled') {
            return [];
          }

          const book = seedBooks[index];
          return (result.value.data || []).map((thread) => ({
            ...thread,
            bookId: getBookId(book),
            bookTitle: book.title,
            replyCount: countReplies(thread.comments || []),
          }));
        });

        nextThreads.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        setSampleThreads(nextThreads.slice(0, threadPreviewCount));
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to fetch sample discussions:', error);
          setSampleThreads([]);
        }
      }
    };

    fetchThreads();

    return () => {
      isCancelled = true;
    };
  }, [books, threadPreviewCount]);

  useEffect(() => {
    const section = howItWorksRef.current;
    if (!section) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !howItWorksTimeoutRef.current && !isHowInView) {
            howItWorksTimeoutRef.current = window.setTimeout(() => {
              setIsHowInView(true);
              howItWorksTimeoutRef.current = null;
            }, 150);
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      if (howItWorksTimeoutRef.current) {
        window.clearTimeout(howItWorksTimeoutRef.current);
        howItWorksTimeoutRef.current = null;
      }
    };
  }, [isHowInView]);

  const handleStartReading = () => {
    navigate('/library');
  };

  const handleScrollToHowItWorks = () => {
    const section = howItWorksRef.current;
    if (!section) {
      return;
    }

    const chromeHeight = typeof window !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chrome-height')) || 72
      : 72;

    const y = section.getBoundingClientRect().top + window.pageYOffset - chromeHeight - 16;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <div className="home-page animate-fade-in">
      <div className="home-shell">
        <header className="home-hero" aria-label="Home">
          <div className="home-hero-copy home-hero-centered">
            <h1 className="home-title font-serif">
              <span className="home-title-line">Finish the book.</span>
              <span className="home-title-line">Enter the conversation.</span>
            </h1>

            <p className="home-subtitle">
              After The Last Page connects you with readers who just experienced the same story - so ideas do not end at the final line.
            </p>

            <div className="home-hero-actions">
              <button type="button" className="btn-primary" onClick={handleStartReading}>
                Start Reading <MoveRight size={16} />
              </button>
              <button type="button" className="btn-secondary" onClick={handleScrollToHowItWorks}>
                See how it works
              </button>
            </div>

            <p className="home-trust-line">No noise. No spoilers. Just meaningful conversations.</p>

            {!isMember && (
              <p className="home-signin-hint">
                Reading as a guest. <Link to="/auth">Sign in</Link> to keep your place across visits.
              </p>
            )}
          </div>
        </header>
        <div className="home-hero-divider" aria-hidden="true" />

        <section className="home-progress home-progress-priority" aria-label="Continue reading">
          {isMember && resumeBook ? (
            <div className="home-resume surface-card">
              <div className="home-resume-cover" style={{ '--book-accent': resumeBook.coverColor || '#6f614d' }}>
                {renderCover(resumeBook)}
              </div>
              <div className="home-resume-copy">
                <span className="home-resume-kicker">Continue reading</span>
                <h2 className="font-serif">{getDisplayBookTitle(resumeBook.title)}</h2>
                <p>{resumeBook.author || 'Unknown author'}</p>
                <span className="home-resume-progress">{getResumeProgressLabel(resumeBook)}</span>
              </div>
              <Link to={`/read/${getBookId(resumeBook)}`} state={{ returnTo }} className="btn-primary sm">
                Resume reading <MoveRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="home-callout surface-card">
              <div className="home-callout-copy">
                <h2 className="font-serif">Keep your place.</h2>
                <p>Sign in to save your reading position and find your discussion rooms waiting after you finish.</p>
              </div>
              <Link to="/auth" className="btn-primary sm">Sign in</Link>
            </div>
          )}
        </section>

        <section className="home-section home-shelf-section" aria-labelledby="featured-heading">
          <div className="home-section-head">
            <div className="home-section-copy">
              <h2 id="featured-heading" className="font-serif">A place to begin</h2>
              <p>Pick a book. The conversation will be waiting when you return.</p>
            </div>
            <Link to={isMember ? "/desk" : "/auth"} className="home-section-link">View all</Link>
          </div>

          <div className="home-featured" role="list" aria-label="Featured books">
            {featuredBooks.map((book) => (
              <FeaturedBook key={getBookId(book)} book={book} isMember={isMember} returnTo={returnTo} />
            ))}
          </div>
        </section>

        <section className="home-section home-discussion-preview" aria-labelledby="sample-discussions-heading">
          <div className="home-section-head">
            <div className="home-section-copy">
              <p className="home-live-kicker">Conversations happening right now</p>
              <h2 id="sample-discussions-heading" className="font-serif">From the discussion rooms</h2>
              <p>Recent threads from readers who just closed the book.</p>
            </div>
            <Link to="/threads" className="home-section-link">Join the conversation</Link>
          </div>

          {sampleThreads.length > 0 ? (
            <div className="home-discussions" role="list" aria-label="Sample discussions">
              {sampleThreads.map((thread) => (
                <DiscussionEntry key={thread._id} thread={thread} />
              ))}
            </div>
          ) : (
            <div className="home-activity-placeholder" role="list" aria-label="Live discussion activity">
              {placeholderActivity.map((item) => (
                <article key={item.id} className="home-discussion-card home-activity-card" role="listitem">
                  <div className="home-discussion-card-live">
                    <span className="home-live-dot" aria-hidden="true" />
                    <span>Live</span>
                  </div>
                  <h3 className="font-serif">{item.title}</h3>
                  <p>{item.subtext}</p>
                  <span className="home-discussion-card-cta">Join →</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="home-how-it-works" aria-labelledby="how-it-works-heading" ref={howItWorksRef}>
          <h2 id="how-it-works-heading" className="home-how-heading">How it works</h2>
          <div className={`home-how-grid ${isHowInView ? 'is-in-view' : ''}`.trim()} role="list" aria-label="How it works steps">
            {howItWorksSteps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <article
                  key={step.key}
                  className="home-how-card"
                  role="listitem"
                  style={{ transitionDelay: `${100 + index * 100}ms` }}
                >
                  <span className="home-how-step" aria-hidden="true">{index + 1}</span>
                  <span className="home-how-icon" aria-hidden="true">
                    <StepIcon size={16} strokeWidth={2.1} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
