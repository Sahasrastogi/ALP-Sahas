import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Clock3, Search } from 'lucide-react';
import api from '../utils/api';
import { getFallbackBooks } from '../utils/bookFallback';
import { getLibraryState } from '../utils/readingSession';
import BookCoverArt from '../components/books/BookCoverArt';
import './BooksLibrary.css';

const getBookId = (book) => book._id || book.id;

const getProgressLabel = (book) => {
  if (book.session?.progressPercent > 0 && book.session?.progressPercent < 100) {
    return `Continue from page ${book.session.currentPage}`;
  }

  if (book.access?.isRead) {
    return 'Finished';
  }

  return `${book.minReadHours || 2}h reading time`;
};

const renderCoverArt = (book) => {
  return (
    <BookCoverArt
      book={book}
      imgClassName="book-cover-image"
      fallbackClassName="book-cover-fallback"
      showSpine
      showPattern
      spineClassName="book-cover-spine"
      patternClassName="book-cover-pattern"
    />
  );
};

const FeaturedContinue = ({ book }) => {
  if (!book) {
    return (
      <div className="section-empty">
        <BookOpen size={18} />
        <p>No book is open yet. Start from your library.</p>
      </div>
    );
  }

  const bookId = getBookId(book);
  const progressPercent = book.session?.progressPercent || (book.access?.isRead ? 100 : 0);

  return (
    <article className="featured-continue-card">
      <Link to={`/read/${bookId}`} className="featured-continue-cover" aria-label={`Open ${book.title}`}>
        <div className="featured-continue-cover-art" style={{ '--book-accent': book.coverColor || '#6f614d' }}>
          {renderCoverArt(book)}
        </div>
      </Link>

      <div className="featured-continue-copy">
        <span className="featured-continue-kicker">Pick up where you left off</span>
        <h3 className="featured-continue-title font-serif">{book.title}</h3>
        <p className="featured-continue-author">{book.author}</p>
        <p className="featured-continue-progress">{getProgressLabel(book)}</p>
        {progressPercent > 0 && progressPercent < 100 && (
          <div className="featured-continue-meter" aria-label={`Reading progress ${progressPercent}%`}>
            <div className="featured-continue-meter-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      <div className="featured-continue-action">
        <Link to={`/read/${bookId}`} className="btn-resume">
          Resume
        </Link>
      </div>
    </article>
  );
};

const BookEntry = ({ book, compact = false }) => {
  const bookId = getBookId(book);
  const progressPercent = book.session?.progressPercent || (book.access?.isRead ? 100 : 0);

  return (
    <Link to={`/read/${bookId}`} className={`book-entry ${compact ? 'compact' : ''}`}>
      <article className="book-object">
        <div className="book-cover-wrap" style={{ '--book-accent': book.coverColor || '#6f614d' }}>
          {renderCoverArt(book)}
        </div>

        {progressPercent > 0 && (
          <div className="book-progress">
            <div className="book-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        <div className="book-copy">
          <h3 className="book-title font-serif">{book.title}</h3>
          <p className="book-author">{book.author}</p>
          <div className="book-meta">
            <span>{getProgressLabel(book)}</span>
            {!book.access?.isRead && !book.session?.progressPercent && (
              <>
                <span className="meta-separator">/</span>
                <span>{(book.tags || []).slice(0, 1)[0] || 'Book'}</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
};

const Section = ({ title, subtitle, books, compact = false }) => {
  if (!books.length) {
    return null;
  }

  return (
    <section className="library-section">
      <div className="section-heading">
        <h2 className="font-serif">{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className={`books-shelf ${compact ? 'compact' : ''}`}>
        {books.map((book) => (
          <BookEntry key={getBookId(book)} book={book} compact={compact} />
        ))}
      </div>
    </section>
  );
};

const BooksLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [tagPage, setTagPage] = useState(0);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const allTags = useMemo(
    () => ['All', 'Fiction', 'Philosophy', 'Adventure', 'Sci-Fi', 'Classic', 'Fantasy', 'Dystopian'],
    [],
  );

  const TAGS_PER_PAGE = 5;
  const maxTagPage = Math.max(0, Math.ceil(allTags.length / TAGS_PER_PAGE) - 1);

  useEffect(() => {
    const selectedIndex = allTags.indexOf(selectedTag);
    if (selectedIndex < 0) {
      return;
    }

    const desiredPage = Math.floor(selectedIndex / TAGS_PER_PAGE);
    setTagPage((prev) => (prev === desiredPage ? prev : desiredPage));
  }, [allTags, selectedTag]);

  const visibleTags = useMemo(() => {
    const start = tagPage * TAGS_PER_PAGE;
    return allTags.slice(start, start + TAGS_PER_PAGE);
  }, [allTags, tagPage]);

  const libraryState = useMemo(() => getLibraryState(books), [books]);

  const filteredBooks = useMemo(() => (
    books
      .map((book) => ({
        ...book,
        access: libraryState.accessMap[getBookId(book)] || {},
        session: libraryState.sessions[getBookId(book)] || null,
      }))
      .filter((book) => {
        const matchesSearch = !searchTerm.trim() || `${book.title} ${book.author}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = selectedTag === 'All' || (book.tags || []).includes(selectedTag);
        return matchesSearch && matchesTag;
      })
  ), [books, libraryState.accessMap, libraryState.sessions, searchTerm, selectedTag]);

  const hasActiveFiltering = Boolean(searchTerm.trim()) || selectedTag !== 'All';

  if (loading) {
    return (
      <div className="library-page">
        <div className="library-hero">
          <h1 className="library-title animate-fade-in" style={{ textAlign: 'center', maxWidth: 'none' }}>Loading library...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="library-page animate-fade-in">
      <header className="library-hero">
        <div className="library-copy">
          <h1 className="library-title font-serif">Your reading library</h1>
          <p className="library-subtitle">Continue where you left off or browse your collection.</p>
        </div>

        <div className="library-controls">
          <label className="search-bar">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search your books"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="search-input"
            />
          </label>

          <div className="filter-carousel" aria-label="Categories">
            <button
              type="button"
              className="carousel-btn"
              onClick={() => setTagPage((page) => Math.max(0, page - 1))}
              disabled={tagPage === 0}
              aria-label="Show previous categories"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="filter-tags" role="list">
              {visibleTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                  type="button"
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="carousel-btn"
              onClick={() => setTagPage((page) => Math.min(maxTagPage, page + 1))}
              disabled={tagPage === maxTagPage}
              aria-label="Show more categories"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {hasActiveFiltering ? (
        <section className="library-section">
          <div className="section-heading">
            <h2 className="font-serif">Filtered shelf</h2>
            <p>{filteredBooks.length} books match your current search.</p>
          </div>

          {filteredBooks.length > 0 ? (
            <div className="books-grid">
              {filteredBooks.map((book) => (
                <BookEntry key={getBookId(book)} book={book} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <BookOpen size={40} className="text-muted" />
              <h3 className="font-serif">No books found on this shelf.</h3>
              <p>Try a different title, author, or category.</p>
              <button className="btn-secondary" type="button" onClick={() => { setSearchTerm(''); setSelectedTag('All'); }}>
                Clear search
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="library-section">
            <div className="section-heading">
              <h2 className="font-serif">Continue Reading</h2>
            </div>
            <FeaturedContinue book={libraryState.continueReading[0] || libraryState.recentlyOpened[0] || null} />
          </section>

          <Section
            title="Recently Read"
            subtitle="Finished books that still feel nearby."
            books={libraryState.recentlyRead.slice(0, 6)}
            compact
          />

          <Section
            title="Recently Opened"
            subtitle="Books you picked up most recently."
            books={libraryState.recentlyOpened}
            compact
          />

          <section className="library-section">
            <div className="section-heading">
              <h2 className="font-serif">Your Library</h2>
              <p>The full shelf, arranged as a calm cover grid.</p>
            </div>

            <div className="books-shelf">
              {books.map((book) => (
                <BookEntry
                  key={getBookId(book)}
                  book={{
                    ...book,
                    access: libraryState.accessMap[getBookId(book)] || {},
                    session: libraryState.sessions[getBookId(book)] || null,
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="library-note">
        <Clock3 size={16} />
        <p>Progress and recent reading are kept intentionally quiet so the covers remain the center of gravity.</p>
      </section>
    </div>
  );
};

export default BooksLibrary;
