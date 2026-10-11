<template>
  <transition name="fade">
    <div v-if="isVisible" class="results-wrapper" @click.self="handleClose">
      <div class="results-modal glass-card">
        <button class="close-btn" @click="handleClose">✖</button>
        
        <!-- Results Header -->
        <div class="results-header">
          <h3 class="results-title">Quiz Results</h3>
          
          <!-- Score Display -->
          <div class="score-display" :class="scoreColorClass">
            <div class="score-percentage">{{ scorePercentage }}%</div>
            <div class="score-fraction">{{ correctCount }}/{{ totalCount }} correct</div>
          </div>
        </div>

        <!-- Questions Review Container -->
        <div class="review-container">
          <div 
            v-for="(answer, index) in results?.answers || []" 
            :key="answer.questionId"
            class="review-card"
            :class="{ 'correct': answer.isCorrect, 'incorrect': !answer.isCorrect }"
          >
            <div class="review-header">
              <span class="question-number">Question {{ index + 1 }}</span>
              <span class="result-icon" :class="{ 'correct': answer.isCorrect, 'incorrect': !answer.isCorrect }">
                {{ answer.isCorrect ? '✓' : '✗' }}
              </span>
            </div>
            
            <p class="question-text">{{ getQuestionText(answer.questionId) }}</p>
            
            <div class="answer-comparison">
              <div class="answer-row student-answer">
                <span class="label">Your Answer:</span>
                <span class="value">{{ answer.studentAnswer }}</span>
              </div>
              
              <div v-if="!answer.isCorrect" class="answer-row correct-answer">
                <span class="label">Correct Answer:</span>
                <span class="value" :class="{ 'skipped-text': !answer.correctAnswer }">
                  {{ answer.correctAnswer || 'N/A (not available)' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="results-actions">
          <button class="btn-primary" @click="handleClose">Close</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
/**
 * @component QuizResultsModal
 * @description 
 * Modal component that displays quiz results after submission.
 * Shows overall score with color-coded feedback and detailed breakdown of each question
 * with student answers, correct answers, and correctness indicators.
 * 
 * Score Colors:
 * - Green (≥70%): Passing
 * - Yellow (50-69%): Marginal
 * - Red (<50%): Failing
 * 
 * @example
 * <QuizResultsModal
 *   :results="submissionData"
 *   :isVisible="showResults"
 *   @close="handleClose"
 * />
 */
import { computed, onMounted, onUnmounted } from 'vue';

/**
 * Component Props
 * @typedef {Object} Props
 * @property {Object} results - Quiz submission results object
 * @property {string} results.id - Submission ID
 * @property {string} results.quizId - Quiz ID
 * @property {string} results.studentId - Student ID
 * @property {number} results.score - Score percentage (0-100)
 * @property {Array<Object>} results.answers - Array of answer objects
 * @property {string} results.answers[].questionId - Question ID
 * @property {string} results.answers[].studentAnswer - Student's submitted answer
 * @property {boolean} results.answers[].isCorrect - Whether answer was correct
 * @property {boolean} [results.answers[].skipped] - Whether scoring was skipped for this question
 * @property {Object} results.quiz - Quiz data including questions
 * @property {Array<Object>} results.quiz.questions - Array of question objects
 * @property {string} results.quiz.questions[].id - Question ID
 * @property {string} results.quiz.questions[].prompt - Question text
 * @property {string} results.quiz.questions[].correctAnswer - Correct answer
 * @property {boolean} isVisible - Controls modal visibility
 */
const props = defineProps({
  results: {
    type: Object,
    required: true,
    default: null
  },
  isVisible: {
    type: Boolean,
    required: true,
    default: false
  }
});

/**
 * Component Events
 * @typedef {Object} Emits
 * @event close - Emitted when user closes the results modal
 */
const emit = defineEmits(['close']);

/**
 * Computed property for total number of questions.
 * @type {ComputedRef<number>}
 */
const totalCount = computed(() => {
  return props.results?.answers?.length || 0;
});

/**
 * Computed property for number of correct answers.
 * @type {ComputedRef<number>}
 */
const correctCount = computed(() => {
  return props.results?.answers?.filter(a => a.isCorrect).length || 0;
});

/**
 * Computed property for score as a rounded percentage.
 * @type {ComputedRef<number>}
 */
const scorePercentage = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((correctCount.value / totalCount.value) * 100);
});

/**
 * Computed property for CSS class based on score percentage.
 * @type {ComputedRef<string>}
 * @returns {'score-green'|'score-yellow'|'score-red'}
 */
const scoreColorClass = computed(() => {
  const score = scorePercentage.value;
  if (score >= 70) return 'score-green';
  if (score >= 50) return 'score-yellow';
  return 'score-red';
});

/**
 * Retrieves the question text for a given question ID.
 * 
 * @function getQuestionText
 * @param {string} questionId - ID of the question
 * @returns {string} Question text or 'Question not found' if not found
 */
const getQuestionText = (questionId) => {
  if (!props.results?.quiz?.questions) return 'Question not found';
  const question = props.results.quiz.questions.find(q => q.id === questionId);
  return question?.prompt || question?.text || 'Question not found';
};

/**
 * Retrieves the correct answer for a given question ID.
 * 
 * @function getCorrectAnswer
 * @param {string} questionId - ID of the question
 * @returns {string} Correct answer or 'N/A' if not available
 */
const getCorrectAnswer = (questionId) => {
  if (!props.results?.quiz?.questions) return 'N/A';
  const question = props.results.quiz.questions.find(q => q.id === questionId);
  
  // Handle missing correctAnswer field
  if (!question) return 'Question not found';
  if (!question.correctAnswer) return 'N/A (not provided)';
  
  return question.correctAnswer;
};

/**
 * Handles modal close action.
 * 
 * @function handleClose
 * @returns {void}
 * @emits close - When user clicks close button
 */
const handleClose = () => {
  emit('close');
};

/**
 * Keyboard event handler for modal interactions.
 * - Escape or Enter: Close modal
 * 
 * @function handleKeydown
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {void}
 */
const handleKeydown = (event) => {
  if (!props.isVisible) return;
  
  // Escape key or Enter key to close modal
  if (event.key === 'Escape' || event.key === 'Enter') {
    event.preventDefault();
    handleClose();
  }
};

/**
 * Lifecycle hook: Adds keyboard event listener when component mounts.
 */
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

/**
 * Lifecycle hook: Removes keyboard event listener when component unmounts.
 */
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Modal Container */
.results-modal {
  position: relative;
  min-width: 400px;
  max-width: 700px;
  max-height: 90vh; /* Increased from 85vh to use more viewport */
  padding: 2rem;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  color: #fff;
  z-index: 2001;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 1rem; /* Add margin to prevent touching viewport edges */
}

.results-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
}

/* Close Button */
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 0.7;
}

.close-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  opacity: 0.9;
}

/* Header */
.results-header {
  margin-bottom: 1.5rem;
  text-align: center;
}

.results-title {
  margin: 0 0 1rem;
  font-size: 1.6rem;
  font-weight: 600;
  color: #3b82f6;
}

/* Score Display */
.score-display {
  padding: 1.5rem;
  border-radius: 8px;
  margin: 0 auto;
  max-width: 300px;
  transition: all 0.3s;
}

.score-display.score-green {
  background: rgba(34, 197, 94, 0.2);
  border: 2px solid rgba(34, 197, 94, 0.5);
}

.score-display.score-yellow {
  background: rgba(234, 179, 8, 0.2);
  border: 2px solid rgba(234, 179, 8, 0.5);
}

.score-display.score-red {
  background: rgba(239, 68, 68, 0.2);
  border: 2px solid rgba(239, 68, 68, 0.5);
}

.score-percentage {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.score-green .score-percentage {
  color: #22c55e;
}

.score-yellow .score-percentage {
  color: #eab308;
}

.score-red .score-percentage {
  color: #ef4444;
}

.score-fraction {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

/* Review Container */
.review-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1.5rem;
  padding-right: 0.5rem;
}

/* Scrollbar Styling */
.review-container::-webkit-scrollbar {
  width: 8px;
}

.review-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.review-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.review-container::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

/* Review Card */
.review-card {
  background: rgba(255, 255, 255, 0.08);
  padding: 1.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 2px solid rgba(59, 130, 246, 0.2);
  transition: border-color 0.2s;
}

.review-card.correct {
  border-color: rgba(34, 197, 94, 0.4);
}

.review-card.incorrect {
  border-color: rgba(239, 68, 68, 0.4);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.question-number {
  font-weight: 600;
  font-size: 0.9rem;
  color: #3b82f6;
}

.result-icon {
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

.result-icon.correct {
  color: #22c55e;
}

.result-icon.incorrect {
  color: #ef4444;
}

.question-text {
  margin: 0 0 1rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #fff;
}

/* Answer Comparison */
.answer-comparison {
  margin-top: 1rem;
}

.answer-row {
  display: flex;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.answer-row.student-answer {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.answer-row.correct-answer {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.answer-row .label {
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  margin-right: 0.75rem;
  min-width: 120px;
}

.answer-row .value {
  font-size: 0.9rem;
  color: #fff;
  flex: 1;
}

.answer-row .value.skipped-text {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}

/* Actions */
.results-actions {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-primary {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .results-modal {
    min-width: 90vw;
    max-width: 90vw;
    padding: 1.5rem;
  }

  .results-title {
    font-size: 1.3rem;
  }

  .score-percentage {
    font-size: 2rem;
  }

  .answer-row {
    flex-direction: column;
  }

  .answer-row .label {
    margin-bottom: 0.25rem;
  }
}
</style>
