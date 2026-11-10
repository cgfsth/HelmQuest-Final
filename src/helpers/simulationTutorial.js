import { computed, ref, watch } from 'vue';

export const SIMULATION_TUTORIAL_STEPS = [
  {
    title: 'Choose your first mission', label: 'Mission briefing', icon: 'compass',
    description: 'Your instructor has approved your enrollment. Get familiar with the simulation before your first voyage.',
    instructions: [
      'Open Missions in the sidebar and choose an available mission from your instructor.',
      'Read the mission briefing, objectives and required steps before starting.',
      'A locked mission may require an earlier mission or a later opening date. Ask your instructor if no mission is available.',
    ],
    tip: 'This tutorial is a guide. Reading it does not start a mission or affect your scores.',
  },
  {
    title: 'Prepare your boat', label: 'Engine & anchor', icon: 'engine',
    description: 'Your boat starts with its engine off. Prepare it before trying to move.',
    instructions: [
      'Start the engine and wait for the engine-running message.',
      'Check the anchor indicator. If the anchor is down, raise it before moving.',
      'Look at the current mission objective so you know where to go first.',
    ],
    desktop: [{ key: 'P', action: 'Start / stop engine' }, { key: 'H', action: 'Raise / drop anchor' }],
    touch: [{ key: 'Engine', action: 'Start / stop engine' }, { key: 'Anchor', action: 'Raise / drop anchor' }],
    tip: 'Pressing the engine control again stops the engine. Keep it running while navigating.',
  },
  {
    title: 'Learn to steer and slow down', label: 'Boat controls', icon: 'steer',
    description: 'Use small inputs and leave room to turn. A moving boat takes time to stop.',
    instructions: [
      'Move forward gently, then steer left or right toward your destination.',
      'Release forward input to coast. Use reverse input to brake before reversing.',
      'Watch your speed and keep clear of the shore, docks and other obstacles.',
    ],
    desktop: [{ key: 'W', action: 'Forward' }, { key: 'S', action: 'Brake / reverse' }, { key: 'A / D', action: 'Steer left / right' }],
    touch: [{ key: '↑', action: 'Forward' }, { key: '↓', action: 'Brake / reverse' }, { key: '← / →', action: 'Steer left / right' }],
    tip: 'Slow down before a turn or docking approach. Different boats respond at different speeds.',
  },
  {
    title: 'Find and complete each checkpoint', label: 'Navigation & buoys', icon: 'buoy',
    description: 'Follow the current mission step and use the radar and compass to stay on course.',
    instructions: [
      'Check the current objective, target marker and required heading or coordinates.',
      'Approach the required buoy or checkpoint slowly. Wait for the interaction prompt.',
      'Interact when prompted, read any information card and follow its instructions. Continue when the mission step changes.',
    ],
    desktop: [{ key: 'Q', action: 'Interact when prompted' }, { key: 'C', action: 'Switch camera view' }],
    touch: [{ key: 'Interact', action: 'Interact when prompted' }, { key: 'Camera', action: 'Switch camera view' }],
    tip: 'Passing near a buoy may not complete the step. Read the prompt and finish the required interaction.',
  },
  {
    title: 'Return to port and finish', label: 'Docking & quiz', icon: 'flag',
    description: 'Complete the remaining objectives and follow the docking instructions shown in your mission.',
    instructions: [
      'Approach the assigned docking area slowly and bring the boat to a stop.',
      'Stop the engine and use the anchor when the current mission step asks you to.',
      'When the mission-complete screen offers a quiz, select Take Quiz and submit your answers. Check Training Records for your results.',
    ],
    tip: 'Complete the required simulation steps before taking the quiz. Your instructor sets the mission requirements.',
  },
  {
    title: 'Ready for your first voyage', label: 'Help & next steps', icon: 'help',
    description: 'You can revisit these cards whenever you need a reminder.',
    instructions: [
      'Use the controls guide inside the simulation for a quick reminder of the buttons.',
      'To leave a simulation, use the exit control and follow the confirmation prompts. Finish your mission first if you want a completed result.',
      'Select Finish tutorial, then open Missions when you are ready to begin.',
    ],
    desktop: [{ key: '?', action: 'Open controls guide' }, { key: '`', action: 'Hold to exit' }],
    touch: [{ key: 'Guide arrow', action: 'Open controls guide' }, { key: 'Exit', action: 'Hold to exit' }],
    tip: 'Finishing the tutorial records that you have read the guide. Mission scores and XP come from your actual training.',
  },
];

const LAST_STEP = SIMULATION_TUTORIAL_STEPS.length - 1;
const storageKey = studentId => `helmquest-simulation-tutorial:v1:${encodeURIComponent(studentId)}`;

function readProgress(storage, studentId) {
  const saved = JSON.parse(storage?.getItem(storageKey(studentId)) || 'null');
  if (!saved || !Number.isInteger(saved.stepIndex) || saved.stepIndex < 0 || saved.stepIndex > LAST_STEP) {
    return { stepIndex: 0, completed: false };
  }
  return { stepIndex: saved.stepIndex, completed: saved.completed === true && saved.stepIndex === LAST_STEP };
}

// Completion belongs to the signed-in, approved account, never to a shared browser flag.
export function useSimulationTutorial({ currentUser, isAuthenticated, userRole, storage }) {
  const stepIndex = ref(0);
  const completed = ref(false);
  const storageNotice = ref('');
  const visitProgress = new Map();
  const studentId = computed(() => isAuthenticated.value && userRole.value === 'student'
    && currentUser.value?.status === 'active' ? currentUser.value.id || null : null);

  function getStorage() {
    return storage === undefined ? globalThis.localStorage : storage;
  }
  function storageUnavailable() {
    storageNotice.value = 'Tutorial progress is kept for this visit only because browser storage is unavailable.';
  }

  watch(studentId, id => {
    stepIndex.value = 0;
    completed.value = false;
    storageNotice.value = '';
    if (!id) return;
    try {
      const saved = visitProgress.get(id) || readProgress(getStorage(), id);
      stepIndex.value = saved.stepIndex;
      completed.value = saved.completed;
    } catch {
      const saved = visitProgress.get(id);
      if (saved) { stepIndex.value = saved.stepIndex; completed.value = saved.completed; }
      storageUnavailable();
    }
  }, { immediate: true, flush: 'sync' });

  function saveProgress() {
    if (!studentId.value) return;
    const saved = { stepIndex: stepIndex.value, completed: completed.value };
    visitProgress.set(studentId.value, saved);
    try {
      const target = getStorage();
      if (!target) { storageUnavailable(); return; }
      target.setItem(storageKey(studentId.value), JSON.stringify(saved));
    } catch { storageUnavailable(); }
  }
  function next() {
    if (!studentId.value) return;
    if (stepIndex.value < LAST_STEP) stepIndex.value += 1;
    else completed.value = true;
    saveProgress();
  }
  function back() {
    if (!studentId.value || completed.value) return;
    stepIndex.value = Math.max(0, stepIndex.value - 1);
    saveProgress();
  }
  function restart() {
    if (!studentId.value) return;
    stepIndex.value = 0;
    completed.value = false;
    saveProgress();
  }

  return { stepIndex, completed, storageNotice, eligible: computed(() => !!studentId.value), next, back, restart };
}
