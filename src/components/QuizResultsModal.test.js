import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import QuizResultsModal from './QuizResultsModal.vue';

describe('QuizResultsModal', () => {
  const mockQuiz = {
    id: 'quiz-1',
    title: 'Test Quiz',
    questions: [
      {
        id: 'q1',
        prompt: 'What is 2 + 2?',
        type: 'multiple-choice',
        options: ['3', '4', '5'],
        correctAnswer: '4'
      },
      {
        id: 'q2',
        prompt: 'The sky is blue',
        type: 'true-false',
        correctAnswer: 'True'
      },
      {
        id: 'q3',
        prompt: 'What is the capital of France?',
        type: 'fill-in-the-blank',
        correctAnswer: 'Paris'
      }
    ]
  };

  const mockResults = {
    quiz: mockQuiz,
    score: 67,
    answers: [
      {
        questionId: 'q1',
        studentAnswer: '4',
        isCorrect: true
      },
      {
        questionId: 'q2',
        studentAnswer: 'False',
        isCorrect: false
      },
      {
        questionId: 'q3',
        studentAnswer: 'Paris',
        isCorrect: true
      }
    ]
  };

  it('renders when visible', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    expect(wrapper.find('.results-modal').exists()).toBe(true);
  });

  it('does not render when isVisible is false', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: false
      }
    });

    expect(wrapper.find('.results-modal').exists()).toBe(false);
  });

  it('displays score as percentage and fraction', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    expect(wrapper.text()).toContain('67%');
    expect(wrapper.text()).toContain('2/3 correct');
  });

  it('applies green color class for passing score (≥70%)', () => {
    const passingResults = {
      ...mockResults,
      score: 100,
      answers: [
        { questionId: 'q1', studentAnswer: '4', isCorrect: true },
        { questionId: 'q2', studentAnswer: 'True', isCorrect: true },
        { questionId: 'q3', studentAnswer: 'Paris', isCorrect: true }
      ]
    };

    const wrapper = mount(QuizResultsModal, {
      props: {
        results: passingResults,
        isVisible: true
      }
    });

    expect(wrapper.find('.score-green').exists()).toBe(true);
    expect(wrapper.text()).toContain('100%');
  });

  it('applies yellow color class for marginal score (50-69%)', () => {
    const marginalResults = {
      ...mockResults,
      score: 60,
      answers: [
        { questionId: 'q1', studentAnswer: '4', isCorrect: true },
        { questionId: 'q2', studentAnswer: 'False', isCorrect: false },
        { questionId: 'q3', studentAnswer: 'London', isCorrect: false }
      ]
    };

    const wrapper = mount(QuizResultsModal, {
      props: {
        results: marginalResults,
        isVisible: true
      }
    });

    expect(wrapper.find('.score-yellow').exists()).toBe(true);
  });

  it('applies red color class for failing score (<50%)', () => {
    const failingResults = {
      ...mockResults,
      score: 33,
      answers: [
        { questionId: 'q1', studentAnswer: '3', isCorrect: false },
        { questionId: 'q2', studentAnswer: 'False', isCorrect: false },
        { questionId: 'q3', studentAnswer: 'Paris', isCorrect: true }
      ]
    };

    const wrapper = mount(QuizResultsModal, {
      props: {
        results: failingResults,
        isVisible: true
      }
    });

    expect(wrapper.find('.score-red').exists()).toBe(true);
  });

  it('displays all questions with student answers', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    expect(wrapper.text()).toContain('What is 2 + 2?');
    expect(wrapper.text()).toContain('The sky is blue');
    expect(wrapper.text()).toContain('What is the capital of France?');
    expect(wrapper.text()).toContain('4');
    expect(wrapper.text()).toContain('False');
    expect(wrapper.text()).toContain('Paris');
  });

  it('shows checkmark icon for correct answers', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    const correctIcons = wrapper.findAll('.result-icon.correct');
    expect(correctIcons.length).toBe(2); // q1 and q3 are correct
    expect(correctIcons[0].text()).toContain('✓');
  });

  it('shows X icon for incorrect answers', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    const incorrectIcons = wrapper.findAll('.result-icon.incorrect');
    expect(incorrectIcons.length).toBe(1); // q2 is incorrect
    expect(incorrectIcons[0].text()).toContain('✗');
  });

  it('displays correct answer for incorrect questions', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    // Should show correct answer "True" for the incorrectly answered question
    expect(wrapper.text()).toContain('True');
  });

  it('does not display correct answer for correctly answered questions', () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    const correctCards = wrapper.findAll('.review-card.correct');
    correctCards.forEach(card => {
      expect(card.find('.correct-answer').exists()).toBe(false);
    });
  });

  it('emits close event when close button clicked', async () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    await wrapper.find('.close-btn').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits close event when primary Close button clicked', async () => {
    const wrapper = mount(QuizResultsModal, {
      props: {
        results: mockResults,
        isVisible: true
      }
    });

    await wrapper.find('.btn-primary').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('handles empty results gracefully', () => {
    const emptyResults = {
      quiz: mockQuiz,
      score: 0,
      answers: []
    };

    const wrapper = mount(QuizResultsModal, {
      props: {
        results: emptyResults,
        isVisible: true
      }
    });

    expect(wrapper.find('.results-modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('0%');
    expect(wrapper.text()).toContain('0/0 correct');
  });

  // Error handling tests
  it('handles missing correctAnswer field gracefully', () => {
    const quizWithMissingAnswer = {
      ...mockQuiz,
      questions: [
        {
          id: 'q1',
          prompt: 'What is 2 + 2?',
          type: 'multiple-choice',
          options: ['3', '4', '5']
          // correctAnswer is missing
        }
      ]
    };

    const resultsWithMissingAnswer = {
      quiz: quizWithMissingAnswer,
      score: 0,
      answers: [
        {
          questionId: 'q1',
          studentAnswer: '4',
          isCorrect: false,
          skipped: true
        }
      ]
    };

    const wrapper = mount(QuizResultsModal, {
      props: {
        results: resultsWithMissingAnswer,
        isVisible: true
      }
    });

    expect(wrapper.find('.results-modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('N/A (scoring skipped)');
  });

  it('handles missing quiz data gracefully', () => {
    const resultsWithoutQuiz = {
      quiz: null,
      score: 50,
      answers: [
        {
          questionId: 'q1',
          studentAnswer: '4',
          isCorrect: true
        }
      ]
    };

    const wrapper = mount(QuizResultsModal, {
      props: {
        results: resultsWithoutQuiz,
        isVisible: true
      }
    });

    expect(wrapper.find('.results-modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('50%');
  });

  it('displays "Question not found" when question is missing from quiz', () => {
    const resultsWithMissingQuestion = {
      quiz: mockQuiz,
      score: 100,
      answers: [
        {
          questionId: 'q-nonexistent',
          studentAnswer: 'Some answer',
          isCorrect: true
        }
      ]
    };

    const wrapper = mount(QuizResultsModal, {
      props: {
        results: resultsWithMissingQuestion,
        isVisible: true
      }
    });

    expect(wrapper.text()).toContain('Question not found');
  });
});
