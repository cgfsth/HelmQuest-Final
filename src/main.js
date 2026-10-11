import { createApp } from 'vue';
import App from './App.vue';
import InventoryModal from './components/InventoryModal.vue';
import PostDockingQuizModal from './components/PostDockingQuizModal.vue';
import QuizResultsModal from './components/QuizResultsModal.vue';
import { loadHeightmapTexture } from './helpers/loadSRTM.js';
import './landing.css';
import './student-portal.css';

// Begin heightmap fetch early (terrain tiles use this when the sim starts).
loadHeightmapTexture().catch(() => {});

const app = createApp(App);
app.component('InventoryModal', InventoryModal);
app.component('PostDockingQuizModal', PostDockingQuizModal);
app.component('QuizResultsModal', QuizResultsModal);
app.mount('#app');


