
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { Book } from './models/Book.js';

dotenv.config();

const mockBooks = [
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    isbn: '9780061122415',
    coverColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    synopsis: 'A magical story about a shepherd boy who journeys to the pyramids of Egypt in search of a treasure.',
    minReadHours: 2,
    tags: ['Fiction', 'Philosophy', 'Adventure'],
    contentMockUrl: '/mocks/b1.json'
  },
  {
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '9780441172719',
    coverColor: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
    synopsis: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides.',
    minReadHours: 5,
    tags: ['Sci-Fi', 'Classic', 'Fantasy'],
    contentMockUrl: '/mocks/b2.json'
  },
  {
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    coverColor: 'linear-gradient(135deg, #374151 0%, #111827 100%)',
    synopsis: 'Among the seminal texts of the 20th century.',
    minReadHours: 3,
    tags: ['Dystopian', 'Classic', 'Fiction'],
    contentMockUrl: '/mocks/b3.json'
  }
];

const seedData = async () => {
  try {
    await connectDB();

    await Book.deleteMany();
    await Book.insertMany(mockBooks);

    console.log('[SEED] Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`[SEED Error]: ${error}`);
    process.exit(1);
  }
};

seedData();
