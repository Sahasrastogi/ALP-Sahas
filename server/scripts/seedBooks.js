import mongoose from "mongoose";
import { Book } from "../models/Book.js";
import { gutenbergCatalog } from "../seed/gutenbergCatalog.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/bookfriend";

async function seedBooks() {
  await mongoose.connect(MONGO_URI);

  console.log("Connected to MongoDB");

  await Book.deleteMany(); // optional (clears old books)

  await Book.insertMany(gutenbergCatalog);

  console.log("Books inserted:", gutenbergCatalog.length);

  mongoose.disconnect();
}

seedBooks();