import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessageSquare, MoreHorizontal, MoveRight } from 'lucide-react';
import api from '../utils/api';
import { getFallbackBooks } from '../utils/bookFallback';
import { getLibraryState } from '../utils/readingSession';
import BookCoverArt from '../components/books/BookCoverArt';
import './LandingPage.css';

const getBookId = (book) => book._id || book.id;

const countReplies = (comments = []) => comments.reduce(
  (sum, comment) => sum + 1 + countReplies(comment.replies || []),
  0,
);

const getProgressPercent = (book) => {
  if (typeof book.session?.progressPercent === 'number') {
    return book.session.progressPercent;
  }

  return book.access?.isRead ? 100 : 0;
};

const renderCover = (book, compact = false) => {
  return (
    <BookCoverArt
      book={book}
      imgClassName={`home-cover-image ${compact ? 'compact' : ''}`}
      fallbackClassName={`home-cover-fallback ${compact ? 'compact' : ''}`}
      showSpine
      showPattern={false}
      spineClassName="home-cover-spine"
      patternClassName="home-cover-pattern"
    />
  );
};

const ReadingNowBook = ({ book }) => {
  const bookId = getBookId(book);
  const progress = Math.max(0, Math.min(100, Math.round(getProgressPercent(book) || 0)));

  return (
    <article className="home-now-item" role="listitem">
      <Link
        to={`/read/${bookId}`}
        className="home-now-cover"
        aria-label={`Open ${book.title}`}
        style={{ '--book-accent': book.coverColor || '#6f614d' }}
      >
        {renderCover(book)}
      </Link>
      <h3 className="home-now-title font-serif" title={book.title}>{book.title}</h3>
      <div className="home-now-meta">
        <span className="home-now-progress">{progress}%</span>
        <button
          type="button"
          className="home-now-menu"
          aria-label={`More options for ${book.title}`}
          title="Coming soon"
          disabled
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </article>
  );
};

const ShelfBook = ({ book }) => {
  const bookId = getBookId(book);

  return (
    <Link to={`/read/${bookId}`} className="home-book-link" role="listitem" aria-label={`Open ${book.title}`}>
      <article className="home-book">
        <div className="home-book-cover" style={{ '--book-accent': book.coverColor || '#6f614d' }}>
          {renderCover(book, true)}
        </div>
        <div className="home-book-copy">
          <h3 className="font-serif">{book.title}</h3>
          <p>{book.author}</p>
        </div>
      </article>
    </Link>
  );
};

const DiscussionEntry = ({ thread }) => (
  <Link to={`/thread/${thread.bookId}#${thread._id}`} className="home-discussion-link">
    <article className="home-discussion">
      <div className="home-discussion-context">
        <span>{thread.bookTitle}</span>
        <span className="home-discussion-divider" aria-hidden="true">/</span>
        <span>{thread.replyCount} replies</span>
      </div>
      <h3 className="font-serif">{thread.title}</h3>
      <p>{thread.chapterReference?.trim() || 'Whole book'}</p>
    </article>
  </Link>
);

export default function LandingPage({ currentUser }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discussionThreads, setDiscussionThreads] = useState([]);
  const [discussionError, setDiscussionError] = useState(false);
  const [readingNowTab, setReadingNowTab] = useState('current');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data } = await api.get('/books');
        setBooks(data);
      } catch (error) {
        console.error('Failed to fetch books, using local fallback:', error);
        setBooks(getFallbackBooks());
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const libraryState = useMemo(() => getLibraryState(books), [books]);

  const dashboardBooks = useMemo(() => (
    books.map((book) => ({
      ...book,
      access: libraryState.accessMap[getBookId(book)] || {},
      session: libraryState.sessions[getBookId(book)] || null,
    }))
  ), [books, libraryState.accessMap, libraryState.sessions]);

  const continueBook = useMemo(() => {
    if (libraryState.continueReading.length > 0) {
      return libraryState.continueReading[0];
    }

    if (libraryState.recentlyOpened.length > 0) {
      return libraryState.recentlyOpened[0];
    }

    return dashboardBooks[0] || null;
  }, [dashboardBooks, libraryState.continueReading, libraryState.recentlyOpened]);

  const discoverBooks = useMemo(() => {
    if (libraryState.discover.length > 0) {
      return libraryState.discover.slice(0, 8);
    }

    return dashboardBooks.slice(0, 8);
  }, [dashboardBooks, libraryState.discover]);

  useEffect(() => {
    const finishedBooks = libraryState.recentlyRead.slice(0, 6);

    if (!finishedBooks.length) {
      setDiscussionThreads([]);
      setDiscussionError(false);
      return;
    }

    let isCancelled = false;

    const fetchDiscussions = async () => {
      try {
        const results = await Promise.allSettled(
          finishedBooks.map((book) => api.get(`/threads/${getBookId(book)}?sort=hot`)),
        );

        if (isCancelled) {
          return;
        }

        const nextThreads = results.flatMap((result, index) => {
          if (result.status !== 'fulfilled') {
            return [];
          }

          const book = finishedBooks[index];
          return (result.value.data || []).map((thread) => ({
            ...thread,
            bookId: getBookId(book),
            bookTitle: book.title,
            replyCount: countReplies(thread.comments || []),
          }));
        });

        nextThreads.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        setDiscussionThreads(nextThreads.slice(0, 6));
        setDiscussionError(results.every((result) => result.status !== 'fulfilled'));
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to fetch dashboard discussions:', error);
          setDiscussionThreads([]);
          setDiscussionError(true);
        }
      }
    };

    fetchDiscussions();

    return () => {
      isCancelled = true;
    };
  }, [libraryState.recentlyRead]);

  const readerLabel = currentUser?.name || currentUser?.anonymousId || 'Reader';
  const libraryBooks = dashboardBooks.slice(0, 12);
  const hasContinue = Boolean(continueBook);

  const currentBooks = useMemo(() => (
    (libraryState.continueReading?.length ? libraryState.continueReading : dashboardBooks)
      .slice(0, 8)
  ), [dashboardBooks, libraryState.continueReading]);

  const recentBooks = useMemo(() => (
    (libraryState.recentlyOpened?.length ? libraryState.recentlyOpened : dashboardBooks)
      .slice(0, 8)
  ), [dashboardBooks, libraryState.recentlyOpened]);

  const readingNowBooks = readingNowTab === 'recent' ? recentBooks : currentBooks;

  if (loading) {
    return (
      <div className="home-page animate-fade-in">
        <div className="home-shell">
          <p className="home-status">Loading your reading desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page animate-fade-in">
      <div className="home-shell">
        <header className="home-hero" aria-label="Home">
          <div className="home-hero-copy">
            <span className="home-kicker">Home</span>
            <h1 className="home-title font-serif">A quiet reading instrument.</h1>
            <p className="home-subtitle">
              Welcome back, <span className="home-reader">{readerLabel}</span>. Open a page, keep the margins steady,
              and let everything else wait.
            </p>
            <div className="home-hero-actions">
              <Link to="/books" className="btn-secondary">Open library</Link>
              <Link to={hasContinue ? `/read/${getBookId(continueBook)}` : '/books'} className="btn-primary">
                {hasContinue ? 'Continue reading' : 'Start reading'} <MoveRight size={16} />
              </Link>
            </div>
          </div>
          <aside className="home-hero-aside" aria-label="Reading note">
            <p className="home-note">
              The interface stays quiet by design. The book is the main surface; everything else is a supporting margin.
            </p>
          </aside>
        </header>

        <section className="home-section home-reading-now" aria-labelledby="reading-now-heading">
          <div className="home-reading-header">
            <div className="home-reading-title-row">
              <h2 id="reading-now-heading" className="font-serif">Reading Now</h2>
              {hasContinue && (
                <Link to={`/read/${getBookId(continueBook)}`} className="home-reading-cta">
                  Continue <MoveRight size={16} />
                </Link>
              )}
            </div>

            <div className="home-reading-tabs" role="tablist" aria-label="Reading now shelves">
              <button
                type="button"
                className={`home-reading-tab ${readingNowTab === 'current' ? 'is-active' : ''}`}
                onClick={() => setReadingNowTab('current')}
                role="tab"
                aria-selected={readingNowTab === 'current'}
              >
                Current
              </button>
              <button
                type="button"
                className={`home-reading-tab ${readingNowTab === 'recent' ? 'is-active' : ''}`}
                onClick={() => setReadingNowTab('recent')}
                role="tab"
                aria-selected={readingNowTab === 'recent'}
              >
                Recent
              </button>
            </div>
          </div>

          {readingNowBooks.length ? (
            <div className="home-reading-row" role="list" aria-label="Reading now books">
              {readingNowBooks.map((book) => (
                <ReadingNowBook key={getBookId(book)} book={book} />
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <BookOpen size={18} />
              <p>No book is open yet. Start from your library.</p>
              <Link to="/books" className="btn-primary sm">Browse books</Link>
            </div>
          )}
        </section>

        <section className="home-section" aria-labelledby="library-heading">
          <div className="home-section-head">
            <div className="home-section-copy">
              <h2 id="library-heading" className="font-serif">Your Shelf</h2>
              <p>A cover-led shelf of what’s waiting for you.</p>
            </div>
            <Link to="/books" className="home-section-link">Open full library</Link>
          </div>

          <div className="home-shelf" role="list" aria-label="Library preview">
            {libraryBooks.map((book) => (
              <ShelfBook key={getBookId(book)} book={book} />
            ))}
          </div>
        </section>

        <section className="home-section" aria-labelledby="discussions-heading">
          <div className="home-section-head">
            <div className="home-section-copy">
              <h2 id="discussions-heading" className="font-serif">Active Discussions</h2>
              <p>Pick up thoughtful threads after you close the page.</p>
            </div>
            <Link to="/threads" className="home-section-link">Open thread rooms</Link>
          </div>

          {discussionThreads.length > 0 ? (
            <div className="home-discussions" role="list" aria-label="Discussion threads">
              {discussionThreads.map((thread) => (
                <DiscussionEntry key={thread._id} thread={thread} />
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <MessageSquare size={18} />
              <p>
                {discussionError
                  ? 'Discussion rooms are unavailable right now.'
                  : 'Finish a book to see its active discussions here.'}
              </p>
            </div>
          )}
        </section>

        <section className="home-section" aria-labelledby="discover-heading">
          <div className="home-section-head">
            <div className="home-section-copy">
              <h2 id="discover-heading" className="font-serif">Want To Read</h2>
              <p>Save a few covers for later, then return to the page.</p>
            </div>
          </div>

          <div className="home-shelf" role="list" aria-label="Discover books">
            {discoverBooks.map((book) => (
              <ShelfBook key={getBookId(book)} book={book} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
