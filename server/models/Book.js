import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  isbn: String,
  coverImage: String,
  coverColor: String,
  synopsis: String,
  minReadHours: { type: Number, default: 2 },
  tags: [String],
  contentMockUrl: String // For the simulated reader text
});

export const Book = mongoose.model('Book', bookSchema);
