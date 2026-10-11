<template>
  <transition name="fade">
    <div v-if="isVisible" class="quiz-wrapper" @click.self="handleClose">
      <div class="quiz-modal glass-card">
        <button class="close-btn" :disabled="isSubmitting" aria-label="Close quiz" @click="handleClose">✖</button>
        
        <!-- Loading State -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading quiz...</p>
        </div>
        
        <!-- Error State: No Quiz Data -->
        <div v-else-if="!quiz || !quiz.questions || quiz.questions.length === 0" class="error-container">
          <div class="error-icon">⚠️</div>
          <h3 class="error-title">Quiz Not Available</h3>
          <p class="error-text">The quiz data could not be loaded. Please contact your instructor.</p>
          <button class="btn-nav btn-primary" @click="handleClose">Close</button>
        </div>
        
        <!-- Quiz Content -->
        <div v-else class="quiz-content" :aria-busy="isSubmitting">
          <!-- Quiz Header -->
          <div class="quiz-header">
            <h3 class="quiz-title">{{ quiz?.title || 'Quiz' }}</h3>
            <p class="quiz-description">{{ quiz?.description || 'Complete the following questions.' }}</p>
          </div>

          <!-- Question Progress Indicator -->
          <div class="question-progress">
            <span class="progress-text">Question {{ currentQuestionIndex + 1 }} of {{ totalQuestions }}</span>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
            </div>
          </div>

          <!-- Single Question Display -->
          <div v-if="currentQuestion" class="question-container">
            <fieldset class="question-card" :disabled="isSubmitting">
              <div class="question-header">
                <span class="question-number">Question {{ currentQuestionIndex + 1 }}</span>
                <span class="question-type-badge">{{ getQuestionTypeLabel(currentQuestion.type) }}</span>
              </div>
              <p class="question-text">{{ currentQuestion.prompt }}</p>
              
              <!-- Multiple Choice Renderer -->
              <div v-if="currentQuestion.type === 'multiple-choice'" class="answer-input">
                <div 
                  v-for="(option, optIndex) in currentQuestion.options" 
                  :key="optIndex"
                  class="radio-option"
                  :class="{ 'selected': answers[currentQuestion.id] === getOptionText(option) }"
                  @click="selectAnswer(currentQuestion.id, getOptionText(option))"
                >
                  <input 
                    type="radio" 
                    :id="`${currentQuestion.id}-${optIndex}`"
                    :name="`question-${currentQuestion.id}`"
                    :value="getOptionText(option)"
                    :checked="answers[currentQuestion.id] === getOptionText(option)"
                    @change="selectAnswer(currentQuestion.id, getOptionText(option))"
                  />
                  <label :for="`${currentQuestion.id}-${optIndex}`">{{ getOptionText(option) }}</label>
                </div>
              </div>

              <!-- True/False Renderer -->
              <div v-else-if="currentQuestion.type === 'true-false'" class="answer-input">
                <div class="toggle-buttons">
                  <button 
                    type="button"
                    class="toggle-btn"
                    :class="{ 'selected': answers[currentQuestion.id] === 'True' }"
                    @click="selectAnswer(currentQuestion.id, 'True')"
                  >
                    True
                  </button>
                  <button 
                    type="button"
                    class="toggle-btn"
                    :class="{ 'selected': answers[currentQuestion.id] === 'False' }"
                    @click="selectAnswer(currentQuestion.id, 'False')"
                  >
                    False
                  </button>
                </div>
              </div>

              <!-- Fill in the Blank Renderer -->
              <div v-else-if="currentQuestion.type === 'fill-in-the-blank'" class="answer-input">
                <input 
                  type="text" 
                  class="text-input"
                  :placeholder="'Type your answer here...'"
                  :value="answers[currentQuestion.id] || ''"
                  @input="selectAnswer(currentQuestion.id, $event.target.value)"
                />
              </div>
            </fieldset>
          </div>

          <!-- Navigation Actions -->
          <div class="quiz-navigation">
            <button 
              class="btn-nav btn-previous" 
              @click="previousQuestion"
              :disabled="isSubmitting || currentQuestionIndex === 0"
            >
              ← Previous
            </button>
            
            <button 
              v-if="currentQuestionIndex < totalQuestions - 1"
              class="btn-nav btn-next" 
              :disabled="isSubmitting"
              @click="nextQuestion"
            >
              Next →
            </button>
            
            <button 
              v-else
              class="btn-nav btn-submit" 
              :disabled="isSubmitting"
              @click="handleSubmit"
            >
              {{ isSubmitting ? 'Saving…' : 'Submit Quiz' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
/**
 * @component PostDockingQuizModal
 * @description 
 * Modal component that displays post-docking quiz questions to students after successful anchor deployment.
 * Shows ONE question at a time with Previous/Next navigation for better UX.
 * Supports three question types: Multiple Choice, True/False, and Fill in the Blank.
 * Provides validation to ensure all questions are answered before submission.
 * 
 * @example
 * <PostDockingQuizModal
 *   :quiz="quizData"
 *   :isVisible="showQuiz"
 *   :isLoading="false"
 *   @close="handleClose"
 *   @submit="handleSubmit"
 * />
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

/**
 * Component Props
 */
const props = defineProps({
  quiz: {
    type: Object,
    required: true,
    default: null
  },
  isVisible: {
    type: Boolean,
    required: true,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
});

/**
 * Component Events
 */
const emit = defineEmits(['close', 'submit']);

/**
 * Reactive state storing student answers.
 * @type {Ref<Object>}
 */
const answers = ref({});

/**
 * Current question index (0-based)
 * @type {Ref<number>}
 */
const currentQuestionIndex = ref(0);

/**
 * Total number of questions
 * @type {ComputedRef<number>}
 */
const totalQuestions = computed(() => {
  return props.quiz?.questions?.length || 0;
});

/**
 * Current question being displayed
 * @type {ComputedRef<Object|null>}
 */
const currentQuestion = computed(() => {
  if (!props.quiz?.questions || currentQuestionIndex.value >= totalQuestions.value) {
    return null;
  }
  return props.quiz.questions[currentQuestionIndex.value];
});

/**
 * Progress percentage for progress bar
 * @type {ComputedRef<number>}
 */
const progressPercentage = computed(() => {
  if (totalQuestions.value === 0) return 0;
  return ((currentQuestionIndex.value + 1) / totalQuestions.value) * 100;
});

/**
 * Navigate to next question
 */
const nextQuestion = () => {
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++;
  }
};

/**
 * Navigate to previous question
 */
const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  }
};

/**
 * Handles modal close/cancel action.
 */
const handleClose = () => {
  if (props.isSubmitting) return;
  const hasAnswers = Object.keys(answers.value).length > 0;
  
  if (hasAnswers) {
    const confirmed = window.confirm('You have unsaved answers. Are you sure you want to close without submitting?');
    if (!confirmed) return;
  }
  
  emit('close');
};

/**
 * Handles quiz submission.
 */
const handleSubmit = () => {
  if (props.isSubmitting) return;
  const quiz = props.quiz;
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    console.warn('Cannot submit quiz: no questions available');
    return;
  }
  
  const unansweredQuestions = quiz.questions.filter(q => !isQuestionAnswered(q.id));
  
  if (unansweredQuestions.length > 0) {
    const message = `Please answer all questions before submitting. ${unansweredQuestions.length} question(s) remaining.`;
    alert(message);
    
    // Navigate to first unanswered question
    const firstUnansweredIndex = quiz.questions.findIndex(q => !isQuestionAnswered(q.id));
    if (firstUnansweredIndex !== -1) {
      currentQuestionIndex.value = firstUnansweredIndex;
    }
    return;
  }
  
  emit('submit', answers.value);
};

/**
 * Converts question type identifier to human-readable label.
 */
const getQuestionTypeLabel = (type) => {
  const labels = {
    'multiple-choice': 'Multiple Choice',
    'true-false': 'True/False',
    'fill-in-the-blank': 'Fill in the Blank'
  };
  return labels[type] || type;
};

/**
 * Checks if a specific question has been answered.
 */
const isQuestionAnswered = (questionId) => {
  return answers.value[questionId] !== undefined && answers.value[questionId] !== '';
};

/**
 * Stores or updates the answer for a specific question.
 */
const selectAnswer = (questionId, answer) => {
  if (props.isSubmitting) return;
  answers.value[questionId] = answer;
};

/**
 * Gets the text value from an option object or returns the option if it's already a string.
 */
const getOptionText = (option) => {
  if (typeof option === 'object' && option !== null) {
    return option.text || String(option);
  }
  return String(option);
};

/**
 * Keyboard event handler for modal interactions.
 */
const handleKeydown = (event) => {
  if (!props.isVisible || props.isSubmitting) return;
  
  // Escape key to close modal (with confirmation)
  if (event.key === 'Escape') {
    event.preventDefault();
    handleClose();
  }
  
  // Arrow keys for navigation
  if (event.key === 'ArrowRight' && currentQuestionIndex.value < totalQuestions.value - 1) {
    event.preventDefault();
    nextQuestion();
  }
  
  if (event.key === 'ArrowLeft' && currentQuestionIndex.value > 0) {
    event.preventDefault();
    previousQuestion();
  }
  
  // Enter key to submit when on last question
  if (event.key === 'Enter' && currentQuestionIndex.value === totalQuestions.value - 1) {
    const activeElement = document.activeElement;
    const isTextInput = activeElement?.tagName === 'INPUT' && activeElement?.type === 'text';
    
    if (!isTextInput) {
      event.preventDefault();
      handleSubmit();
    }
  }
};

/**
 * Watcher to reset state when modal visibility changes.
 */
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    answers.value = {};
    currentQuestionIndex.value = 0;
  }
});

/**
 * Lifecycle hooks
 */
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Modal Container */
.quiz-modal {
  position: relative;
  box-sizing: border-box;
  width: min(100%, 700px);
  min-width: 0;
  max-height: 100%;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  color: #fff;
  z-index: 300001; /* Higher than wrapper */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 0;
}

.quiz-wrapper {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  height: 100vh;
  height: 100dvh;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 300000; /* Higher than all other UI elements */
}

.quiz-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.quiz-header,
.question-progress,
.quiz-navigation {
  flex-shrink: 0;
}

.quiz-header {
  padding-right: 2rem;
}

.quiz-title,
.quiz-description,
.question-text,
.radio-option label {
  overflow-wrap: anywhere;
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

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  min-height: 200px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 1rem;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* Error State */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  min-height: 200px;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-title {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #ef4444;
}

.error-text {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

/* Header */
.quiz-header {
  margin-bottom: 1.5rem;
}

.quiz-title {
  margin: 0 0 0.5rem;
  font-size: 1.6rem;
  font-weight: 600;
  color: #3b82f6;
}

.quiz-description {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}

/* Questions Container */
.questions-container {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1.5rem;
  padding-right: 0.5rem;
}

/* Scrollbar Styling */
.questions-container::-webkit-scrollbar {
  width: 8px;
}

.questions-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.questions-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.questions-container::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

/* Question Card */
.question-card {
  min-width: 0;
  margin: 0 0 1rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.question-header {
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

.question-type-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  color: #3b82f6;
  font-weight: 500;
}

.question-text {
  margin: 0 0 1rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #fff;
}

/* Placeholder for answer inputs (temporary) */
.answer-input-placeholder {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.3);
}

.placeholder-text {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* Answer Input Styles */
.answer-input {
  margin-top: 0.75rem;
}

/* Multiple Choice Radio Options */
.radio-option {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-option:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(59, 130, 246, 0.4);
}

.radio-option:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.radio-option.selected {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
}

.radio-option input[type="radio"] {
  width: 18px;
  height: 18px;
  margin-right: 0.75rem;
  cursor: pointer;
  accent-color: #3b82f6;
}

.radio-option input[type="radio"]:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.radio-option label {
  flex: 1;
  cursor: pointer;
  color: #fff;
  font-size: 0.95rem;
  line-height: 1.4;
}

/* True/False Toggle Buttons */
.toggle-buttons {
  display: flex;
  gap: 1rem;
}

.toggle-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(59, 130, 246, 0.4);
}

.toggle-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.toggle-btn.selected {
  background: rgba(59, 130, 246, 0.3);
  border-color: #3b82f6;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
}

/* Fill in the Blank Text Input */
.text-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box; /* Fix overflow issue */
}

.text-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.text-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

/* Answered Indicator */
.answered-indicator {
  display: flex;
  align-items: center;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 4px;
  color: #22c55e;
  font-size: 0.85rem;
  font-weight: 500;
}

.checkmark {
  margin-right: 0.5rem;
  font-size: 1rem;
  font-weight: bold;
}

/* Add visual indication to answered question cards */
.question-card.answered {
  border-color: rgba(34, 197, 94, 0.4);
}

/* Question Progress Indicator */
.question-progress {
  margin-bottom: 1.5rem;
  text-align: center;
}

.progress-text {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  transition: width 0.3s ease;
}

/* Question Container */
.question-container {
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding: 0;
  border: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin-bottom: 1.5rem;
}

/* Scrollbar Styling */
.question-container::-webkit-scrollbar {
  width: 8px;
}

.question-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.question-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.question-container::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

/* Navigation Actions */
.quiz-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-nav {
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-nav:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-previous {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-previous:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.btn-next {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  margin-left: auto;
}

.btn-next:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-submit {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  margin-left: auto;
}

.btn-submit:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* Actions */
.quiz-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:focus,
.btn-secondary:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
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
  .quiz-modal {
    padding: 1rem;
  }

  .quiz-title {
    font-size: 1.3rem;
  }

  .quiz-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}

@media (max-height: 500px) {
  .quiz-modal { padding: 0.75rem 1rem; }
  .quiz-header, .question-progress, .question-container { margin-bottom: 0.5rem; }
  .quiz-title { font-size: 1.2rem; margin-bottom: 0.25rem; }
  .quiz-description { font-size: 0.85rem; }
  .question-card { padding: 0.75rem; margin-bottom: 0; }
  .quiz-navigation { padding-top: 0.5rem; }
  .btn-nav { padding: 0.5rem 0.75rem; font-size: 0.9rem; }
}
</style>
