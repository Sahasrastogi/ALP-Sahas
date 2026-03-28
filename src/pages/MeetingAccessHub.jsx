import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import api from '../utils/api';
import { getFallbackBooks } from '../utils/bookFallback';
import { getAllBookAccessStates } from '../utils/readingAccess';
import BookCoverArt from '../components/books/BookCoverArt';
import './MeetingAccessHub.css';

const LOCKED_ROOM_PREVIEWS = [
  'Dracula Room',
  'Frankenstein Room',
  'Pride and Prejudice Room',
  'Jane Eyre Room',
];

const MeetingAccessHub = ({ currentUser }) => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const isMember = Boolean(currentUser && !currentUser.isAnonymous);

  useEffect(() => {
    if (!isMember) {
      setBooks([]);
      setLoading(false);
      return;
    }

    const fetchBooks = async () => {
      try {
        const { data } = await api.get('/books');
        setBooks(data);
      } catch (error) {
        console.error('Failed to fetch books for meeting hub, using fallback:', error);
        setBooks(getFallbackBooks());
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [isMember]);

  const unlockedBooks = useMemo(() => {
    if (!isMember) {
      return [];
    }

    const accessMap = getAllBookAccessStates();
    return books
      .filter((book) => {
        const access = accessMap[book._id || book.id];
        return access?.isRead && access?.quizPassed;
      })
      .map((book) => ({
        ...book,
        access: accessMap[book._id || book.id],
      }));
  }, [books, isMember]);

  if (!isMember) {
    return (
      <div className="meeting-access-page is-gated animate-fade-in">
        <section className="meeting-access-gate" aria-label="Meet">
          <div className="meeting-access-badge">
            <Users size={16} />
            <span>Meet</span>
          </div>

          <h1 className="font-serif">The conversation begins after the last page.</h1>
          <p>Join discussions with readers who reached the same ending.</p>

          <div className="meeting-access-gate-actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/auth')}>
              Sign in to join conversations <ArrowRight size={16} />
            </button>
          </div>

          <div className="meeting-access-gate-footnote">
            <ShieldCheck size={16} />
            <span>Rooms unlock after finishing a book and passing its quiz.</span>
          </div>
        </section>

        <div className="meeting-access-gate-ornament" aria-hidden="true">
          <div className="gate-bubble" />
          <div className="gate-bubble is-mid" />
          <div className="gate-bubble is-small" />
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-access-page animate-fade-in">
      <header className="meeting-access-hero" aria-label="Meet">
        <div className="meeting-access-badge">
          <Users size={16} />
          <span>Meet</span>
        </div>
        <h1 className="font-serif">The conversation begins after the last page.</h1>
        <p>Join discussions with readers who reached the same ending.</p>
        <div className="meeting-access-hint">
          <ShieldCheck size={16} /> Rooms unlock after you finish a book.
        </div>
      </header>

      {loading ? (
        <div className="meeting-access-loading glass-panel">Loading your unlocked discussion rooms...</div>
      ) : unlockedBooks.length > 0 ? (
        <section className="meeting-access-grid">
          {unlockedBooks.map((book, index) => (
            <article key={book._id || book.id} className="meeting-access-card glass-panel" style={{ '--card-order': index }}>
              <div className="meeting-access-mini-cover" style={{ '--book-accent': book.coverColor || '#6f614d' }}>
                <BookCoverArt
                  book={book}
                  imgClassName="meeting-access-mini-image"
                  fallbackClassName="meeting-access-mini-fallback"
                  showSpine
                  showPattern={false}
                  spineClassName="meeting-access-mini-spine"
                />
              </div>

              <div className="meeting-access-body">
                <span className="meeting-access-status">
                  <ShieldCheck size={16} />
                  Verified
                </span>
                <h2 className="font-serif meeting-access-title">{book.title}</h2>
                <p className="meeting-access-author">{book.author}</p>
              </div>

              <button
                type="button"
                className="btn-primary sm meeting-access-button"
                onClick={() => navigate(`/meet/${book._id || book.id}`)}
              >
                Enter <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </section>
      ) : (
        <>
          <section className="meeting-access-empty" aria-labelledby="meet-empty-heading">
            <h2 id="meet-empty-heading" className="font-serif">No rooms unlocked yet.</h2>
            <p>Finish a book and pass its reflection quiz to unlock its discussion room.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/desk')}>
              Continue reading
            </button>
          </section>

          <section className="meeting-access-locked" aria-labelledby="locked-rooms-heading">
            <div className="meeting-access-section-heading">
              <h2 id="locked-rooms-heading" className="font-serif">Rooms waiting for you</h2>
            </div>

            <div className="meeting-access-locked-grid" aria-label="Locked rooms preview">
              {LOCKED_ROOM_PREVIEWS.map((roomName) => (
                <article key={roomName} className="meeting-access-locked-card" aria-disabled="true">
                  <div className="meeting-access-locked-copy">
                    <h3 className="font-serif">{roomName}</h3>
                    <span className="meeting-access-locked-label">Locked</span>
                  </div>
                  <LockKeyhole size={16} aria-hidden="true" />
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default MeetingAccessHub;
