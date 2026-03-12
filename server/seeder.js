
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { Book } from './models/Book.js';
import { defaultBooks } from './seed/defaultBooks.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    await Book.deleteMany();
    await Book.insertMany(defaultBooks);

    console.log('[SEED] Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`[SEED Error]: ${error}`);
    process.exit(1);
  }
};

seedData();
