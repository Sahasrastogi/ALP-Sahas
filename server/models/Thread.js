import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  authorAnonId: String,
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

commentSchema.add({
  replies: [commentSchema],
});

const threadSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  authorAnonId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxLength: 100,
  },
  chapterReference: {
    type: String,
    maxLength: 80,
  },
  content: {
    type: String,
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: { type: [String], default: [] },
  comments: [commentSchema],
}, { timestamps: true });

export const Thread = mongoose.model('Thread', threadSchema);
