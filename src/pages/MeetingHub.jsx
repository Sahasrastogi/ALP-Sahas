import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Video, MessageSquare, Mic, User, Send, LockKeyhole } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { getFallbackBookById } from '../utils/bookFallback';
import { getBookAccessState, markQuizAsPassed, syncSingleBookAccess } from '../utils/readingAccess';
import './MeetingHub.css';

const socketServer = (() => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) {
    return envUrl;
  }

  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    return `${window.location.protocol}//${host}:5000`;
  }

  return 'http://127.0.0.1:5000';
})();

const MeetingHub = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState('quiz');
  const [book, setBook] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socketReady, setSocketReady] = useState(false);
  const [matchNotice, setMatchNotice] = useState('');
  const [searchHint, setSearchHint] = useState('');
  const socketRef = useRef(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [prefType, setPrefType] = useState('text');
  const accessMode = location.state?.accessMode || null;
  const gateNotice = location.state?.notice || '';

  useEffect(() => {
    const buildQuiz = (selectedBook) => {
      if (!selectedBook) {
        setQuizQuestions([]);
        return;
      }

      setQuizQuestions([
        { text: `What was the most striking moment in ${selectedBook.title} for you?` },
        { text: `How did the author's style influence your reading pace?` },
        { text: 'Which character did you relate to most?' }
      ]);
    };

    const fetchData = async () => {
      const access = getBookAccessState(bookId);
      if (access.quizPassed && accessMode !== 'thread-gate') {
        setPhase('preferences');
      }

      try {
        const { data } = await api.get(`/books/${bookId}`);
        setBook(data);
        buildQuiz(data);
      } catch (error) {
        const fallbackBook = getFallbackBookById(bookId);
        console.error('Fetch error, using local fallback:', error);
        setBook(fallbackBook);
        buildQuiz(fallbackBook);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    socketRef.current = io(socketServer, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 600,
      timeout: 3000,
    });

    socketRef.current.on('connect', () => {
      setSocketReady(true);
      setMatchNotice('');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection failed:', error);
      setSocketReady(false);
      setMatchNotice('Live matching is offline right now. You can still enter the community thread.');
    });

    socketRef.current.on('match_found', ({ roomId: matchedRoomId }) => {
      setRoomId(matchedRoomId);
      setPhase('connected');
    });

    socketRef.current.on('receive_message', ({ message }) => {
      setMessages((prev) => [...prev, { text: message, sender: 'partner', timestamp: new Date() }]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [accessMode, bookId]);

  useEffect(() => {
    if (phase !== 'searching') {
      setSearchHint('');
      return undefined;
    }

    setSearchHint(`Waiting for another reader who chose ${prefType}.`);

    const timeoutId = window.setTimeout(() => {
      setSearchHint('Still waiting. Try again later, or step into the community thread.');
    }, 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase, prefType]);

  if (loading) return <div className="p-10 text-center mt-20 font-serif">Deep in the archives... Seeking your book.</div>;
  if (!book) return <div className="p-10 text-center mt-20 font-serif">Book not found. Perhaps it's still being written?</div>;

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      setCurrentAnswer('');
    } else {
      const accessState = markQuizAsPassed(book._id || book.id);
      syncSingleBookAccess(book._id || book.id, accessState).catch((error) => {
        console.error('Failed to sync quiz progress:', error);
      });
      if (accessMode === 'thread-gate') {
        navigate(`/thread/${bookId}`, {
          state: {
            notice: `Access unlocked. Welcome to ${book.title}'s thread.`,
          },
        });
        return;
      }
      setPhase('preferences');
      setCurrentAnswer('');
    }
  };

  const handleStartSearch = () => {
    if (!socketRef.current?.connected) {
      setMatchNotice('Live matching is unavailable right now. Please try again shortly, or enter the community thread.');
      return;
    }

    setPhase('searching');
    setMatchNotice('');
    socketRef.current.emit('join_matchmaking', {
      bookId,
      prefType,
      anonymousId: `user_${Math.random().toString(36).slice(2, 11)}`,
    });
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!chatInput.trim() || !roomId || !socketRef.current) return;

    const msgData = { roomId, message: chatInput, senderId: socketRef.current.id };
    socketRef.current.emit('send_message', msgData);
    setMessages((prev) => [...prev, { text: chatInput, sender: 'me', timestamp: new Date() }]);
    setChatInput('');
  };

  return (
    <div className="meeting-hub animate-fade-in">
      {phase === 'quiz' && (
        <div className="quiz-container">
          <div className="quiz-card glass-panel">
            {gateNotice && (
              <div className="quiz-gate-banner">
                <LockKeyhole size={18} />
                <span>{gateNotice}</span>
              </div>
            )}
            <div className="quiz-header">
              <ShieldCheck size={32} className="text-accent mb-2" />
              <h2 className="font-serif">Knowledge Verification</h2>
              <p className="text-muted text-sm">To ensure genuine conversations, please answer a few questions about <em>{book.title}</em>.</p>
            </div>

            <div className="quiz-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(currentQuestionIndex / Math.max(quizQuestions.length, 1)) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted">Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
            </div>

            <div className="quiz-question-area animate-fade-in" key={currentQuestionIndex}>
              <h3 className="question-text">{quizQuestions[currentQuestionIndex]?.text}</h3>
              <textarea
                className="quiz-input"
                placeholder="Type your answer here... (Accuracy isn't strict, we just want to verify you've read it)"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                autoFocus
              />
            </div>

            <div className="quiz-footer">
              <button
                className="btn-primary"
                onClick={handleNextQuestion}
                disabled={currentAnswer.trim().length < 3 || quizQuestions.length === 0}
              >
                {currentQuestionIndex === quizQuestions.length - 1 ? 'Submit & Enter Hub' : 'Next Question'} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'preferences' && (
        <div className="preferences-container animate-fade-in">
          <div className="preferences-content glass-panel">
            <h2 className="font-serif text-center mb-2">How would you like to connect?</h2>
            <p className="text-muted text-center mb-8">Select your preferred medium to discuss <em>{book.title}</em>. Your identity remains anonymous.</p>

            <div className="pref-options">
              <button
                type="button"
                className={`pref-card ${prefType === 'text' ? 'selected' : ''}`}
                onClick={() => { setPrefType('text'); setMatchNotice(''); }}
                aria-pressed={prefType === 'text'}
              >
                <div className="pref-icon-wrapper"><MessageSquare size={32} /></div>
                <h3>Text Chat</h3>
                <p>Quiet, thoughtful discussion.</p>
              </button>

              <button
                type="button"
                className={`pref-card ${prefType === 'voice' ? 'selected' : ''}`}
                onClick={() => { setPrefType('voice'); setMatchNotice(''); }}
                aria-pressed={prefType === 'voice'}
              >
                <div className="pref-icon-wrapper"><Mic size={32} /></div>
                <h3>Voice Call</h3>
                <p>Vocalize your thoughts securely.</p>
              </button>

              <button
                type="button"
                className={`pref-card ${prefType === 'video' ? 'selected' : ''}`}
                onClick={() => { setPrefType('video'); setMatchNotice(''); }}
                aria-pressed={prefType === 'video'}
              >
                <div className="pref-icon-wrapper"><Video size={32} /></div>
                <h3>Video Call</h3>
                <p>Face-to-face, masked connection.</p>
              </button>
            </div>

            {matchNotice && (
              <div className="meeting-notice" role="status">
                {matchNotice}
              </div>
            )}

            <div className="mt-8 text-center flex-column-center gap-4">
              <button
                className="btn-primary"
                disabled={!prefType || !socketReady}
                onClick={handleStartSearch}
              >
                Find a reading partner <ArrowRight size={18} />
              </button>
              <button className="btn-secondary" onClick={() => navigate(`/thread/${bookId}`)}>
                Skip to Community Thread instead
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'searching' && (
        <div className="searching-container animate-fade-in">
          <div className="radar-animation">
            <div className="radar-circle"></div>
            <div className="radar-circle delay-1"></div>
            <div className="radar-circle delay-2"></div>
            <User size={48} className="radar-center-icon text-accent" />
          </div>
          <h2 className="font-serif">Searching the cosmos...</h2>
          <p className="text-muted mt-2">Looking for someone who just finished <em>{book.title}</em></p>
          {searchHint && <p className="text-muted">{searchHint}</p>}
          <button className="btn-secondary mt-8" onClick={() => setPhase('preferences')}>Cancel Search</button>
        </div>
      )}

      {phase === 'connected' && (
        <div className="room-container animate-fade-in">
          <div className="room-header glass-panel">
            <div className="partner-info">
              <div className="partner-avatar bg-gradient" />
              <div>
                <h3 className="font-serif">Reading Partner Connected</h3>
                <p className="text-xs text-muted">Prefers {prefType} | In {roomId}</p>
              </div>
            </div>
            <div className="room-actions">
              <button className="btn-secondary sm" onClick={() => window.location.reload()}>Leave Room</button>
            </div>
          </div>

          <div className="room-main glass-panel">
            {prefType === 'text' ? (
              <div className="chat-interface">
                <div className="chat-messages">
                  {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                      <div className="msg-bubble">{msg.text}</div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-muted p-10">Matched! Say hi to your fellow reader.</div>
                  )}
                </div>
                <form className="chat-input-area" onSubmit={sendMessage}>
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="send-btn bg-gradient"><Send size={20} /></button>
                </form>
              </div>
            ) : (
              <div className="media-interface">
                <div className="media-placeholder">
                  <User size={64} className="text-muted opacity-50 mb-4" />
                  <p className="text-muted mt-4">Video/Voice placeholder. Signaling established in room {roomId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingHub;
