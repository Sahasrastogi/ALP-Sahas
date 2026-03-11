import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle2, LockKeyhole, MessageSquare, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import { getFallbackBooks } from '../utils/bookFallback';
import { getBookAccessState } from '../utils/readingAccess';
import BookCoverArt from '../components/books/BookCoverArt';
import './ThreadAccessHub.css';

const ThreadAccessHub = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data } = await api.get('/books');
        setBooks(data);
      } catch (error) {
        console.error('Failed to fetch books for thread access, using fallback:', error);
        setBooks(getFallbackBooks());
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const bookCards = useMemo(
    () =>
      books.map((book) => {
        const access = getBookAccessState(book._id || book.id);
        return { book, access };
      }),
    [books],
  );

  const handleThreadAccess = (book) => {
    const bookId = book._id || book.id;
    const access = getBookAccessState(bookId);

    if (!access.isRead) {
      setNotice({
        type: 'warning',
        title: 'Read the book first',
        message: `You need to finish ${book.title} before entering its community thread.`,
        actionLabel: 'Start Reading',
        action: () => navigate(`/read/${bookId}`),
      });
      return;
    }

    if (!access.quizPassed) {
      navigate(`/meet/${bookId}`, {
        state: {
          accessMode: 'thread-gate',
          notice: 'Please provide the answer to quiz questions to get access to threads.',
        },
      });
      return;
    }

    navigate(`/thread/${bookId}`, {
      state: {
        notice: `Welcome back. You have full access to ${book.title}'s thread.`,
      },
    });
  };

  return (
    <div className="thread-access-page animate-fade-in">
      <section className="thread-access-hero">
        <div className="thread-access-copy">
          <div className="thread-access-badge glass-panel">
            <MessageSquare size={16} />
            <span>Reader discussion access</span>
          </div>
          <h1 className="font-serif">Choose a book and step into its reader-only thread.</h1>
          <p>
            Each thread is unlocked per book. Finish the book, pass the quiz, and you get a calmer,
            spoiler-safe discussion space built for people who actually made it to the end.
          </p>
        </div>
      </section>

      {notice && (
        <div className={`thread-access-notice ${notice.type}`}>
          <div className="thread-access-notice-copy">
            <strong>{notice.title}</strong>
            <p>{notice.message}</p>
          </div>
          <div className="thread-access-notice-actions">
            <button className="btn-primary" onClick={notice.action}>
              {notice.actionLabel}
            </button>
            <button className="btn-secondary" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section className="thread-access-grid">
        {loading ? (
          <div className="thread-access-loading glass-panel">Loading thread access library...</div>
        ) : (
          bookCards.map(({ book, access }) => {
            const bookId = book._id || book.id;
            const status = access.quizPassed
              ? {
                  label: 'Thread unlocked',
                  icon: <CheckCircle2 size={16} />,
                  className: 'unlocked',
                }
              : access.isRead
                ? {
                    label: 'Quiz required',
                    icon: <ShieldCheck size={16} />,
                    className: 'quiz-required',
                  }
                : {
                    label: 'Read required',
                    icon: <LockKeyhole size={16} />,
                    className: 'read-required',
                  };

            return (
              <article key={bookId} className="thread-access-card glass-panel">
                <div className="thread-access-cover" style={{ '--book-accent': book.coverColor || '#6f614d' }}>
                  <BookCoverArt
                    book={book}
                    imgClassName="thread-access-cover-image"
                    fallbackClassName="thread-access-cover-fallback"
                    showSpine
                    showPattern={false}
                    spineClassName="thread-access-cover-spine"
                  />
                </div>

                <div className="thread-access-card-body">
                  <span className={`thread-status ${status.className}`}>
                    {status.icon}
                    {status.label}
                  </span>
                  <h2 className="font-serif thread-access-title">{book.title}</h2>
                  <p className="thread-access-author">{book.author}</p>
                  <p className="thread-access-synopsis">{book.synopsis}</p>

                  <div className="thread-access-rules">
                    <div className={`thread-rule ${access.isRead ? 'done' : ''}`}>
                      {access.isRead ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                      <span>Finish reading</span>
                    </div>
                    <div className={`thread-rule ${access.quizPassed ? 'done' : ''}`}>
                      {access.quizPassed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>Pass quiz verification</span>
                    </div>
                  </div>

                  <button className="btn-primary thread-access-button" onClick={() => handleThreadAccess(book)}>
                    Enter Thread
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};

export default ThreadAccessHub;
