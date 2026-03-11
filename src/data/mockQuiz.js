export const mockQuizzes = {
  b1: [
    { id: 'q1', text: 'Where did the boy sleep before his journey?', type: 'text' },
    { id: 'q2', text: 'What was the boy\'s original profession?', type: 'text' },
    { id: 'q3', text: 'Who did he meet in the market regarding his sheep?', type: 'text' },
    { id: 'q4', text: 'What physical object did the King give him?', type: 'text' },
    { id: 'q5', text: 'Where did he ultimately find his treasure?', type: 'text' }
  ],
  b2: [
    { id: 'q1', text: 'What is the most valuable substance in the universe?', type: 'text' },
    { id: 'q2', text: 'What planet is known as Dune?', type: 'text' },
    { id: 'q3', text: 'Who is Paul\'s mother?', type: 'text' },
    { id: 'q4', text: 'What are the giant worms called by the Fremen?', type: 'text' },
    { id: 'q5', text: 'What does the Gom Jabbar test?', type: 'text' }
  ]
};

// Fallback quiz for other books to prevent errors
export const fallbackQuiz = [
  { id: 'fq1', text: 'Who is the main character?', type: 'text' },
  { id: 'fq2', text: 'What is the primary conflict?', type: 'text' },
  { id: 'fq3', text: 'Where does the story primarily take place?', type: 'text' },
  { id: 'fq4', text: 'Describe the ending in two words.', type: 'text' },
  { id: 'fq5', text: 'What was your favorite chapter and why?', type: 'text' }
];
