import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquareHeart, ShieldCheck, Sparkles, Users } from 'lucide-react';
import api from '../utils/api';
import { getFallbackBooks } from '../utils/bookFallback';
import { getAllBookAccessStates } from '../utils/readingAccess';
import BookCoverArt from '../components/books/BookCoverArt';
import './MeetingAccessHub.css';

const MeetingAccessHub = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const unlockedBooks = useMemo(() => {
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
  }, [books]);

  return (
    <div className="meeting-access-page animate-fade-in">
      <section className="meeting-access-hero glass-panel">
        <div className="meeting-access-badge">
          <Users size={16} />
          <span>Post-reading conversation</span>
        </div>
        <h1 className="font-serif">Only verified reads make it into the conversation room.</h1>
        <p>
          These books are already unlocked for you. You finished them, passed the quiz, and can
          jump directly into meeting other readers without repeating verification.
        </p>
      </section>

      {loading ? (
        <div className="meeting-access-loading glass-panel">Loading your unlocked discussion rooms...</div>
      ) : unlockedBooks.length > 0 ? (
        <section className="meeting-access-grid">
          {unlockedBooks.map((book, index) => (
            <article key={book._id || book.id} className="meeting-access-card glass-panel" style={{ '--card-order': index }}>
              <div className="meeting-access-cover" style={{ '--book-accent': book.coverColor || '#6f614d' }}>
                <BookCoverArt
                  book={book}
                  imgClassName="meeting-access-cover-image"
                  fallbackClassName="meeting-access-cover-fallback"
                  showSpine
                  showPattern={false}
                  spineClassName="meeting-access-cover-spine"
                />
              </div>

              <div className="meeting-access-body">
                <span className="meeting-access-status">
                  <ShieldCheck size={16} />
                  Verified Reader
                </span>
                <h2 className="font-serif meeting-access-title">{book.title}</h2>
                <p className="meeting-access-author">{book.author}</p>
                <p>{book.synopsis}</p>
                <div className="meeting-access-meta">
                  <div><MessageSquareHeart size={16} /> Ready for text, voice, or video</div>
                  <div><Sparkles size={16} /> Quiz already passed on your profile</div>
                </div>
                <button
                  className="btn-primary meeting-access-button"
                  onClick={() => navigate(`/meet/${book._id || book.id}`)}
                >
                  Enter room <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="meeting-access-empty glass-panel">
          <h2 className="font-serif">No unlocked meeting rooms yet.</h2>
          <p>
            Finish a book and pass its quiz once. After that, it will appear here permanently and
            you will not be asked to re-answer the quiz for that book.
          </p>
          <button className="btn-primary" onClick={() => navigate('/books')}>
            Go to Library
          </button>
        </section>
      )}
    </div>
  );
};

export default MeetingAccessHub;
