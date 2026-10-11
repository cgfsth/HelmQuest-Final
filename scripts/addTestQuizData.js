/**
 * Script to add test quiz data to localStorage for manual testing
 * Run this in browser console or as a script
 */

const STORAGE_KEY = 'helmquest-progress-v3';

// Sample quiz for testing
const testQuiz = {
  id: 'quiz-test-001',
  title: 'Module 1 Mission 1 Quiz',
  description: 'Test your knowledge of basic boat operation and safety',
  questions: [
    {
      id: 'q1',
      prompt: 'What is the primary purpose of dropping an anchor?',
      type: 'multiple-choice',
      options: ['To stop the boat', 'To secure the boat in position', 'To catch fish', 'To add weight to the boat'],
      correctAnswer: 'To secure the boat in position',
      order: 0
    },
    {
      id: 'q2',
      prompt: 'The anchor should be dropped slowly to avoid damaging the boat.',
      type: 'true-false',
      correctAnswer: 'True',
      order: 1
    },
    {
      id: 'q3',
      prompt: 'What key do you press to deploy the anchor?',
      type: 'fill-in-the-blank',
      correctAnswer: 'H',
      order: 2
    },
    {
      id: 'q4',
      prompt: 'Which of the following is NOT a safety consideration when anchoring?',
      type: 'multiple-choice',
      options: ['Water depth', 'Wind direction', 'Time of day', 'Bottom type'],
      correctAnswer: 'Time of day',
      order: 3
    },
    {
      id: 'q5',
      prompt: 'You should always check the anchor is secure before leaving the helm.',
      type: 'true-false',
      correctAnswer: 'True',
      order: 4
    }
  ],
  buoyCount: 0,
  createdAt: new Date().toISOString(),
  createdBy: 'instructor-helen',
  updatedAt: new Date().toISOString()
};

// Quiz assignment linking the quiz to m1-mission1 module
const testAssignment = {
  id: 'assignment-test-001',
  quizId: 'quiz-test-001',
  targetType: 'module',
  targetId: 'm1-mission1',
  createdAt: new Date().toISOString(),
  createdBy: 'instructor-helen'
};

function addTestQuizData() {
  try {
    // Load existing progress data
    const raw = localStorage.getItem(STORAGE_KEY);
    let progressData;
    
    if (raw) {
      progressData = JSON.parse(raw);
    } else {
      console.error('No progress data found in localStorage');
      return;
    }
    
    // Initialize quiz arrays if they don't exist
    if (!progressData.quizzes) progressData.quizzes = [];
    if (!progressData.quizAssignments) progressData.quizAssignments = [];
    if (!progressData.quizSubmissions) progressData.quizSubmissions = [];
    if (!progressData.quizResults) progressData.quizResults = [];
    
    // Check if test quiz already exists
    const existingQuiz = progressData.quizzes.find(q => q.id === testQuiz.id);
    if (existingQuiz) {
      console.log('Test quiz already exists, updating...');
      Object.assign(existingQuiz, testQuiz);
    } else {
      console.log('Adding new test quiz...');
      progressData.quizzes.push(testQuiz);
    }
    
    // Check if test assignment already exists
    const existingAssignment = progressData.quizAssignments.find(a => a.id === testAssignment.id);
    if (existingAssignment) {
      console.log('Test assignment already exists, updating...');
      Object.assign(existingAssignment, testAssignment);
    } else {
      console.log('Adding new test assignment...');
      progressData.quizAssignments.push(testAssignment);
    }
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    
    console.log('✅ Test quiz data added successfully!');
    console.log('Quiz:', testQuiz);
    console.log('Assignment:', testAssignment);
    console.log('To test: Login as student, start Module 1 Mission 1, and drop anchor.');
    
  } catch (error) {
    console.error('Error adding test quiz data:', error);
  }
}

// If running in browser console, execute immediately
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  addTestQuizData();
} else {
  // Export for use as module
  module.exports = { addTestQuizData, testQuiz, testAssignment };
}
