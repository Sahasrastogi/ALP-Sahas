import { Book } from '../models/Book.js';

export const getBooks = async (req, res) => {
  try {
    const books = await Book.find({});
    res.json(books);
  } catch {
    res.status(500).json({ message: 'Server error fetching books' });
  }
};

export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (book) {
      res.json(book);
    } else {
      res.status(404).json({ message: 'Book not found' });
    }
  } catch {
    res.status(500).json({ message: 'Server error fetching book' });
  }
};
