import {
  endFallbackSession,
  isFallbackSession,
  sendFallbackMessage,
  startFallbackSession,
} from '../services/bookfriendFallbackService.js';

const getBookFriendBaseUrl = () => (process.env.BOOKFRIEND_SERVER_URL || 'http://127.0.0.1:5050').replace(/\/$/, '');

const isFallbackEnabled = () => process.env.BOOKFRIEND_FALLBACK_ENABLED !== 'false';

const shouldFallback = (error) => {
  const status = error?.statusCode;
  if (!status) {
    return true;
  }

  return status >= 500;
};

const forwardToBookFriend = async (path, payload) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBookFriendBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.message || 'BookFriend agent request failed.';
      const error = new Error(message);
      error.statusCode = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 502;
      error.payload = { source: 'bookfriend_server_unreachable' };
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const startAgentSession = async (req, res) => {
  try {
    const { book_id: explicitBookId, chapter_progress: chapterProgress } = req.body || {};
    const userId = req.user?._id?.toString() || req.user?.anonymousId;
    const bookId = explicitBookId;

    if (!userId || !bookId) {
      return res.status(400).json({ message: 'book_id is required.' });
    }

    try {
      const data = await forwardToBookFriend('/agent/start', {
        user_id: userId,
        book_id: bookId,
        chapter_progress: chapterProgress,
      });

      return res.status(201).json(data);
    } catch (error) {
      if (!isFallbackEnabled() || !shouldFallback(error)) {
        throw error;
      }

      const localData = await startFallbackSession({ userId, bookId });
      return res.status(201).json(localData);
    }
  } catch (error) {
    const status = error.statusCode || 502;
    return res.status(status).json({
      message: error.message || 'Unable to start BookFriend session.',
      details: error.payload,
    });
  }
};

export const sendAgentMessage = async (req, res) => {
  try {
    const { session_id: sessionId, message } = req.body || {};

    if (!sessionId || !message) {
      return res.status(400).json({ message: 'session_id and message are required.' });
    }

    if (isFallbackSession(sessionId)) {
      const data = sendFallbackMessage({ sessionId, message });
      return res.json(data);
    }

    const data = await forwardToBookFriend('/agent/message', req.body || {});
    return res.json(data);
  } catch (error) {
    const status = error.statusCode || 502;
    return res.status(status).json({
      message: error.message || 'Unable to fetch BookFriend response.',
      details: error.payload,
    });
  }
};

export const endAgentSession = async (req, res) => {
  try {
    const { session_id: sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ message: 'session_id is required.' });
    }

    if (isFallbackSession(sessionId)) {
      const data = endFallbackSession(sessionId);
      return res.json(data);
    }

    const data = await forwardToBookFriend('/agent/end', req.body || {});
    return res.json(data);
  } catch (error) {
    const status = error.statusCode || 502;
    return res.status(status).json({
      message: error.message || 'Unable to end BookFriend session.',
      details: error.payload,
    });
  }
};
