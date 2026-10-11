import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PostDockingQuizModal from './PostDockingQuizModal.vue';

describe('PostDockingQuizModal', () => {
  const mockQuiz = {
    id: 'quiz-1',
    title: 'Test Quiz',
    description: 'A test quiz',
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
      }
    ]
  };

  it('renders quiz title and description when visible', () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true
      }
    });

    expect(wrapper.text()).toContain('Test Quiz');
    expect(wrapper.text()).toContain('A test quiz');
  });

  it('does not render when isVisible is false', () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: false
      }
    });

    expect(wrapper.find('.quiz-modal').exists()).toBe(false);
  });

  it('renders all questions', () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true
      }
    });

    expect(wrapper.text()).toContain('What is 2 + 2?');
    expect(wrapper.text()).toContain('The sky is blue');
  });

  it('emits close event when close button clicked', async () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true
      }
    });

    await wrapper.find('.close-btn').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits submit event with answers when submit button clicked', async () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true
      }
    });

    // Select an answer for the first question
    const firstRadio = wrapper.findAll('input[type="radio"]')[1]; // Select '4'
    await firstRadio.setValue(true);

    // Select answer for true/false question
    const trueButton = wrapper.findAll('.toggle-btn')[0];
    await trueButton.trigger('click');

    // Submit quiz
    await wrapper.find('.btn-primary').trigger('click');
    
    expect(wrapper.emitted('submit')).toBeTruthy();
    const submittedAnswers = wrapper.emitted('submit')[0][0];
    expect(submittedAnswers).toBeDefined();
  });

  it('displays question type badges correctly', () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true
      }
    });

    expect(wrapper.text()).toContain('Multiple Choice');
    expect(wrapper.text()).toContain('True/False');
  });

  it('handles fill-in-the-blank question type', () => {
    const quizWithFillIn = {
      ...mockQuiz,
      questions: [
        {
          id: 'q1',
          prompt: 'What is the capital of France?',
          type: 'fill-in-the-blank',
          correctAnswer: 'Paris'
        }
      ]
    };

    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: quizWithFillIn,
        isVisible: true
      }
    });

    const textInput = wrapper.find('.text-input');
    expect(textInput.exists()).toBe(true);
  });

  // Error handling tests
  it('prevents submission when not all questions are answered', async () => {
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true
      }
    });

    // Try to submit without answering any questions
    await wrapper.find('.btn-primary').trigger('click');
    
    // Should show alert and not emit submit event
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Please answer all questions'));
    expect(wrapper.emitted('submit')).toBeFalsy();
    
    alertSpy.mockRestore();
  });

  it('handles empty quiz gracefully', () => {
    const emptyQuiz = {
      id: 'quiz-empty',
      title: 'Empty Quiz',
      description: 'No questions',
      questions: []
    };

    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: emptyQuiz,
        isVisible: true
      }
    });

    expect(wrapper.find('.quiz-modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('Empty Quiz');
    expect(wrapper.findAll('.question-card').length).toBe(0);
  });

  it('handles missing quiz data gracefully', () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: null,
        isVisible: true
      }
    });

    expect(wrapper.find('.quiz-modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('Quiz'); // Default title
  });

  it('shows loading state when isLoading is true', () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true,
        isLoading: true
      }
    });

    expect(wrapper.find('.loading-container').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading quiz...');
    expect(wrapper.find('.questions-container').exists()).toBe(false);
  });

  it('hides loading state and shows quiz when isLoading is false', () => {
    const wrapper = mount(PostDockingQuizModal, {
      props: {
        quiz: mockQuiz,
        isVisible: true,
        isLoading: false
      }
    });

    expect(wrapper.find('.loading-container').exists()).toBe(false);
    expect(wrapper.find('.questions-container').exists()).toBe(true);
  });
});
