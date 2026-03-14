import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Book } from '../models/Book.js';

const fallbackSessions = new Map();

const parseBookQuery = (bookId) => {
  const raw = String(bookId || '').trim();
  const gutenbergMatch = raw.match(/^g?(\d+)$/i);

  if (gutenbergMatch) {
    return { gutenbergId: Number.parseInt(gutenbergMatch[1], 10) };
  }

  if (mongoose.Types.ObjectId.isValid(raw)) {
    return { _id: raw };
  }

  return null;
};

const loadBook = async (bookId) => {
  const query = parseBookQuery(bookId);
  if (!query) {
    return null;
  }

  return Book.findOne(query)
    .select('title author synopsis tags chapters')
    .lean();
};

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const topExcerpt = (book) => {
  const chapter = Array.isArray(book?.chapters) ? book.chapters.find((entry) => entry?.html) : null;
  if (chapter?.html) {
    return stripHtml(chapter.html).slice(0, 400);
  }

  return String(book?.synopsis || '').slice(0, 300);
};

const generateFallbackReply = ({ message, book }) => {
  const normalized = String(message || '').trim();
  const excerpt = topExcerpt(book);

  if (!normalized) {
    return `Want to start with what feeling ${book.title} left you with?`;
  }

  if (normalized.includes('?')) {
    return `Good question. Based on what we have from ${book.title}, one reading is that motives stay intentionally ambiguous. ${excerpt ? `A nearby passage is: "${excerpt}". ` : ''}What interpretation feels most convincing to you?`;
  }

  if (normalized.length < 30) {
    return `Interesting. If you zoom in on one scene in ${book.title}, which character choice best supports your view?`;
  }

  return `I like that perspective. It highlights a real tension in ${book.title}. ${excerpt ? `A related passage is: "${excerpt}". ` : ''}Do you think that moment changes your judgment of the protagonist?`;
};

export const isFallbackSession = (sessionId) => fallbackSessions.has(sessionId);

export const startFallbackSession = async ({ userId, bookId }) => {
  const book = await loadBook(bookId);
  if (!book) {
    const error = new Error('Book not found for BookFriend session.');
    error.statusCode = 404;
    throw error;
  }

  const sessionId = `local_bf_${crypto.randomUUID()}`;
  fallbackSessions.set(sessionId, {
    sessionId,
    userId,
    bookId,
    book,
    messages: [],
    createdAt: new Date(),
  });

  return { session_id: sessionId, mode: 'fallback' };
};

export const sendFallbackMessage = ({ sessionId, message }) => {
  const session = fallbackSessions.get(sessionId);
  if (!session) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  session.messages.push({ role: 'user', content: String(message), timestamp: new Date().toISOString() });
  const response = generateFallbackReply({ message, book: session.book });
  session.messages.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });

  return { response, mode: 'fallback' };
};

export const endFallbackSession = (sessionId) => {
  const deleted = fallbackSessions.delete(sessionId);
  if (!deleted) {
    const error = new Error('Session not found.');
    error.statusCode = 404;
    throw error;
  }

  return { message: 'Session deleted.', mode: 'fallback' };
};
