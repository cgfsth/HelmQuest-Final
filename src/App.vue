<template>
<div ref="appRoot" class="simulation-container" :class="{ 'simulation-container--active': activeScreen === 'simulation', 'simulation-container--portrait': activeScreen === 'simulation' && simulationNeedsLandscape }">
    <div v-if="activeScreen === 'simulation' && simulationNeedsLandscape" class="simulation-orientation-prompt" role="dialog" aria-modal="true" aria-labelledby="simulation-orientation-title">
      <div class="simulation-orientation-card">
        <svg viewBox="0 0 80 80" aria-hidden="true"><rect x="24" y="12" width="32" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(-35 40 40)"/><path d="M65 30a28 28 0 0 0-42-14m0 0 1-10m-1 10 10 1M15 50a28 28 0 0 0 42 14m0 0-1 10m1-10-10-1" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        <h2 id="simulation-orientation-title">Rotate your phone</h2>
        <p>Play in landscape to see the radar, mission steps and boat controls.</p>
        <button type="button" class="btn btn-primary" @click="requestSimulationLandscape">Play in landscape</button>
        <p class="simulation-orientation-help">If the screen stays upright, turn off rotation lock and rotate your phone sideways.</p>
        <button type="button" class="simulation-orientation-back" @click="exitTraining">Back to dashboard</button>
      </div>
    </div>
    <InventoryModal/>
    <PostDockingQuizModal 
      :quiz="postDockingQuizData || {}" 
      :isVisible="showPostDockingQuiz"
      :isSubmitting="isPostDockingQuizSubmitting"
      @close="handlePostDockingQuizClose"
      @submit="handlePostDockingQuizSubmit"
    />
    <QuizResultsModal
      :results="quizResultsData || {}"
      :isVisible="showQuizResults"
      @close="handleQuizResultsClose"
    />
    
    <!-- Mission Briefing Screen -->
    <MissionBriefing
      v-if="showMissionBriefing && missionToStart"
      :mission="missionToStart"
      @start="startMissionFromBriefing"
      @cancel="cancelMissionBriefing"
    />

    <!-- Mission Panel (replaces old mission objective box) -->
    <!-- Engine Status Indicator -->
    <!-- Buoy Interaction Modal -->
    <!-- Mission Complete Modal -->
    <MissionComplete
      v-if="showMissionCompleteModal && activeTrainingModule"
      :buoys-completed="activeTrainingModule.buoys?.length || 0"
      :has-quiz="true"
      :xp-reward="activeTrainingModule.xpReward ?? activeTrainingModule.xp_reward ?? 0"
      @take-quiz="handleTakeQuizFromComplete"
      @finish="showMissionCompleteModal = false"
    />
    
    <!-- Exit confirmation modal -->
    <transition name="fade">
      <div v-if="exitConfirmVisible" class="exit-confirm-overlay" @click.self="cancelExitConfirm">
        <div class="exit-confirm-card glass-card" role="dialog" aria-modal="true" aria-label="Confirm exit">
          <h3>Are you sure?</h3>
          <p>Do you want to quit to dashboard?</p>
          <div class="exit-confirm-actions">
            <button id="exitConfirmYes" class="btn btn-danger" @click="confirmExit">Yes — Quit</button>
            <button id="exitConfirmCancel" class="btn" @click="cancelExitConfirm">Cancel</button>
          </div>
        </div>
      </div>
    </transition>
    <!-- Final exit confirmation modal -->
    <transition name="fade">
      <div v-if="exitFinalConfirmVisible" class="exit-confirm-overlay" @click.self="cancelFinalExit">
        <div class="exit-confirm-card glass-card" role="dialog" aria-modal="true" aria-label="Confirm quit">
          <h3>Are you absolutely sure?</h3>
          <p>This will quit the simulation and return you to the dashboard.</p>
          <div class="exit-confirm-actions">
            <button id="exitFinalYes" class="btn btn-danger" @click="confirmFinalExit">Yes — Quit Now</button>
            <button id="exitFinalCancel" class="btn" @click="cancelFinalExit">Cancel</button>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- Controls Guide Overlay -->
    <transition name="fade">
      <div v-if="controlsGuideVisible" class="controls-guide-overlay" :class="{ 'controls-guide-overlay--touch': simulationTouchEnabled }">
        <div id="simulation-controls-guide" class="controls-guide-card glass-card" role="dialog" aria-modal="true" aria-labelledby="controls-guide-title">
          <button type="button" class="controls-guide-close" aria-label="Close controls guide" @click="toggleControlsGuide">✖</button>
          
          <div class="controls-guide-header">
            <span class="controls-guide-icon">🎮</span>
            <h2 id="controls-guide-title" class="controls-guide-title">CONTROLS GUIDE</h2>
            <p class="controls-guide-subtitle">{{ simulationTouchEnabled ? 'Use the arrow pad and on-screen boat buttons' : 'Master your vessel with these keyboard controls' }}</p>
          </div>
          
          <div v-if="simulationTouchEnabled" class="controls-guide-content">
            <section class="controls-section">
              <h3 class="controls-section-title">Boat Controls</h3>
              <div class="controls-grid">
                <div class="control-item"><span class="control-key">↑</span><span class="control-label">Move Forward</span></div>
                <div class="control-item"><span class="control-key">↓</span><span class="control-label">Move Backward</span></div>
                <div class="control-item"><span class="control-key">←</span><span class="control-label">Turn Left</span></div>
                <div class="control-item"><span class="control-key">→</span><span class="control-label">Turn Right</span></div>
              </div>
            </section>
            <section class="controls-section">
              <h3 class="controls-section-title">Boat Actions</h3>
              <div class="controls-grid">
                <div class="control-item"><span class="control-key">Engine</span><span class="control-label">Start / Stop Engine</span></div>
                <div class="control-item"><span class="control-key">Anchor</span><span class="control-label">Drop / Raise Anchor</span></div>
                <div class="control-item"><span class="control-key">Fish</span><span class="control-label">Deploy / Retrieve Line</span></div>
                <div class="control-item"><span class="control-key">📷</span><span class="control-label">Switch View</span></div>
              </div>
            </section>
            <section class="controls-section">
              <h3 class="controls-section-title">Interaction &amp; Camera</h3>
              <div class="controls-grid">
                <div class="control-item"><span class="control-key">Q</span><span class="control-label">Tap Interact near a buoy</span></div>
                <div class="control-item"><span class="control-key">Drag</span><span class="control-label">Drag the sea to look around</span></div>
                <div class="control-item"><span class="control-key">Exit</span><span class="control-label">Hold to return to dashboard</span></div>
              </div>
            </section>
          </div>
          <div v-else class="controls-guide-content">
            <!-- Basic Controls Only -->
            <section class="controls-section">
              <h3 class="controls-section-title">🚢 Boat Controls</h3>
              <div class="controls-grid">
                <div class="control-item">
                  <kbd class="control-key">W</kbd>
                  <span class="control-label">Move Forward</span>
                </div>
                <div class="control-item">
                  <kbd class="control-key">S</kbd>
                  <span class="control-label">Move Backward</span>
                </div>
                <div class="control-item">
                  <kbd class="control-key">A</kbd>
                  <span class="control-label">Turn Left</span>
                </div>
                <div class="control-item">
                  <kbd class="control-key">D</kbd>
                  <span class="control-label">Turn Right</span>
                </div>
              </div>
            </section>
            
            <section class="controls-section">
              <h3 class="controls-section-title">⚓ Anchor</h3>
              <div class="controls-grid">
                <div class="control-item">
                  <kbd class="control-key">H</kbd>
                  <span class="control-label">Drop/Raise Anchor</span>
                </div>
              </div>
            </section>
            
            <section class="controls-section">
              <h3 class="controls-section-title">🎣 Fishing</h3>
              <div class="controls-grid">
                <div class="control-item">
                  <kbd class="control-key">F</kbd>
                  <span class="control-label">Deploy Fishing Line</span>
                </div>
                <div class="control-item">
                  <kbd class="control-key">N</kbd>
                  <span class="control-label">Deploy / Retrieve Net</span>
                </div>
              </div>
            </section>
            
            <section class="controls-section">
              <h3 class="controls-section-title">📦 Inventory</h3>
              <div class="controls-grid">
                <div class="control-item">
                  <kbd class="control-key">I</kbd>
                  <span class="control-label">Open Inventory</span>
                </div>
              </div>
            </section>
            
            <section class="controls-section">
              <h3 class="controls-section-title">📷 Camera</h3>
              <div class="controls-grid">
                <div class="control-item">
                  <kbd class="control-key">C</kbd>
                  <span class="control-label">Switch View</span>
                </div>
              </div>
            </section>
            
            <section class="controls-section">
              <h3 class="controls-section-title">💡 Headlights</h3>
              <div class="controls-grid">
                <div class="control-item">
                  <kbd class="control-key">L</kbd>
                  <span class="control-label">Toggle Lights</span>
                </div>
              </div>
            </section>
          </div>
          
          <div class="controls-guide-footer">
            <p v-if="simulationTouchEnabled" class="controls-guide-tip">Tap the arrow between the radar and controls to reopen this guide.</p>
            <p v-else class="controls-guide-tip">💡 <strong>Tip:</strong> Press <kbd>?</kbd> anytime to view this guide again</p>
            <button class="controls-guide-btn" @click="toggleControlsGuide">Got It!</button>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- WebGL Canvas Container (Three.js) -->
    <div
      v-if="!(activeScreen === 'dashboard' && userRole === 'admin')"
      ref="canvasContainer"
      class="canvas-container"
      :class="{ 'canvas-pass-through': activeScreen !== 'simulation' }"
    ></div>

    <!-- Cinematic loading -->
    <div v-if="showCinematicLoading" class="cinematic-loading">
      <div class="cinematic-glow"></div>
      <h2>Initializing HelmQuest...</h2>
      <p>{{ loadingHint }}</p>
    </div>

    <!-- Landing — Professional title screen with Student/Instructor login -->
    <div
      v-if="activeScreen === 'landing'"
      class="scene-overlay landing-overlay game-landing professional-landing"
    >
      <div class="game-landing-bg"></div>
      <div class="game-landing-vignette"></div>
      <div class="game-landing-grain" aria-hidden="true"></div>

      <!-- Top Navigation Bar -->
      <nav class="landing-nav">
        <div class="landing-nav-logo">
          <div class="logo-icon">⚓</div>
          <div class="logo-text">
            <strong>HELMQUEST</strong>
            <span>MARITIME SIMULATOR</span>
          </div>
        </div>
        <div class="landing-nav-buttons">
          <button type="button" class="nav-btn nav-btn-student" @click="goToStudentLogin">
            <span class="btn-icon">👤</span> Student Portal
          </button>
          <button type="button" class="nav-btn nav-btn-instructor" @click="goToInstructorLogin">
            <span class="btn-icon">👨‍🏫</span> Instructor Login
          </button>
          <button type="button" class="nav-btn nav-btn-admin" @click="goToAdminLogin">
            <span class="btn-icon">⚓</span> Admin Portal
          </button>
        </div>
      </nav>

      <!-- Main Hero Section -->
      <div class="landing-hero">
        <p class="hero-eyebrow landing-reveal landing-reveal--1">MARITIME SIMULATOR</p>
        <h1 class="hero-title landing-reveal landing-reveal--2">
          <span class="title-helm">HELM</span><span class="title-quest">QUEST</span>
        </h1>
        <div class="hero-divider landing-reveal landing-reveal--3"></div>
        <p class="hero-tagline landing-reveal landing-reveal--4">MASTER EVERY WAVE</p>
        <ul class="hero-features landing-reveal landing-reveal--5">
          <li><span class="feature-icon">🧭</span> NAVIGATE</li>
          <li><span class="feature-icon">🎣</span> FISH</li>
          <li><span class="feature-icon">📚</span> TRAIN</li>
        </ul>
        <div class="hero-set-sail-wrap">
          <button type="button" class="hero-set-sail-btn landing-reveal landing-reveal--6" @click="goToScreen('boat-selection')">
            <span class="set-sail-icon">⛵</span>
            <span class="set-sail-text">SET SAIL</span>
            <span class="set-sail-subtitle">Free Roam · No Login Required</span>
          </button>
        </div>
      </div>

      <!-- Footer Status Bar -->
      <div class="landing-footer">
        <p class="footer-text">© 2026 HELMQUEST SIMULATOR · DMSC DECK OPERATIONS DEPT</p>
        <div class="footer-status">
          <span class="status-indicator">●</span>
          <span class="status-text">SYS_STATUS: READY</span>
          <span class="status-coords">LAT: 7.073° N | LNG: 125.648° E (DAVAO GULF)</span>
        </div>
      </div>
    </div>

    <!-- Play options screen -->
    <div v-if="activeScreen === 'play-options'" class="scene-overlay landing-overlay game-landing main-menu-screen">
      <div class="game-landing-bg"></div>
      <div class="game-landing-vignette"></div>

      <div class="game-landing-center main-menu-center">
        <nav class="game-menu" aria-label="Play options">
          <button type="button" class="game-menu-btn game-menu-btn-primary" @click="goToScreen('boat-selection')">
            Free Roam
          </button>
          <button type="button" class="game-menu-btn" @click="goToStudentHub()" v-if="isAuthenticated">
            My Training
          </button>
          <button type="button" class="game-menu-btn game-menu-btn-ghost" @click="goBackFromPlayOptions()">
            Back
          </button>
        </nav>
      </div>
    </div>

    <!-- Boat selection screen -->
    <div v-if="activeScreen === 'boat-selection'" class="scene-overlay landing-overlay game-landing main-menu-screen">
      <div class="game-landing-bg"></div>
      <div class="game-landing-vignette"></div>

      <div class="boat-selection-container">
        <h2 class="boat-selection-title">Select Boat Type</h2>
        <p class="boat-selection-subtitle">Same controls, different feel. Pick a boat that suits your style.</p>

        <div class="boat-cards">
          <div
            v-for="type in boatTypeList"
            :key="type.id"
            class="boat-card active-boat"
            :class="{ 'boat-card--selected': selectedBoatType === type.id }"
            @click="chooseBoatAndSail(type.id)"
          >
            <div class="boat-card-header">
              <span class="boat-badge-status available-badge">{{ type.handling }}</span>
              <span class="boat-icon-emoji">{{ type.icon }}</span>
            </div>
            <div class="boat-card-body">
              <h3>{{ type.name }}</h3>
              <p class="boat-tagline">{{ type.tagline }}</p>
              <p>{{ type.description }}</p>
              <div class="boat-stat-bars">
                <div class="boat-stat-bar">
                  <span class="boat-stat-label">Speed</span>
                  <div class="boat-stat-track"><div class="boat-stat-fill" :style="{ width: (type.maxSpeedKnots / fastestBoatSpeedKnots * 100) + '%' }"></div></div>
                </div>
                <div class="boat-stat-bar">
                  <span class="boat-stat-label">Acceleration</span>
                  <div class="boat-stat-track"><div class="boat-stat-fill" :style="{ width: (BOAT_TYPES.small.accelerationTimeTo90 / type.accelerationTimeTo90 * 100) + '%' }"></div></div>
                </div>
                <div class="boat-stat-bar">
                  <span class="boat-stat-label">Turning</span>
                  <div class="boat-stat-track"><div class="boat-stat-fill" :style="{ width: (type.maxTurnDegreesPerSecond / fastestBoatTurnDegreesPerSecond * 100) + '%' }"></div></div>
                </div>
              </div>
            </div>
            <button class="boat-action-btn select-action-btn">Select &amp; Deploy</button>
          </div>
        </div>

        <button type="button" class="game-menu-btn game-menu-btn-ghost back-to-menu-btn" @click="goToScreen(isAuthenticated ? 'play-options' : 'landing')">
          ← Back
        </button>
      </div>
    </div>

    <!-- Settings modal -->
    <div v-if="showMenuSettings" class="menu-settings-modal">
      <div class="menu-settings-card glass-card">
        <h2>Settings</h2>
        <div class="menu-settings-content">
          <label class="setting-row">
            <span>Sound Volume</span>
            <input type="range" v-model="soundVolume" min="0" max="1" step="0.1" />
          </label>
          <label class="setting-row">
            <span>Start Camera</span>
            <select v-model="menuStartCamera">
              <option value="chase">Chase Camera</option>
              <option value="orbit">Orbit Camera</option>
              <option value="helm">Helm Camera</option>
            </select>
          </label>
          <label class="setting-row">
            <span>Graphics Quality</span>
            <select v-model="graphicsQuality">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </label>
          <label class="setting-row">
            <span>Water Quality</span>
            <select v-model="waterQuality">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label class="setting-row">
            <span>Shadow Quality</span>
            <select v-model="shadowQuality">
              <option value="off">Off</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label class="setting-row">
            <span>UI Scale</span>
            <select v-model="uiScale">
              <option value="0.8">Small</option>
              <option value="1.0">Normal</option>
              <option value="1.2">Large</option>
              <option value="1.4">Extra Large</option>
            </select>
          </label>
          <label class="setting-row">
            <span>Show FPS</span>
            <input type="checkbox" v-model="showFPS" />
          </label>
        </div>
        <div class="menu-settings-actions">
          <button class="menu-btn" @click="closeMenuSettings()">Close</button>
        </div>
      </div>
    </div>

    <!-- Quiz Manager Modal -->
    <div v-if="quizManagerModal" class="quiz-manager-overlay">
      <div class="quiz-manager-card glass-card">
        <h2>📝 Quiz Management: {{ quizManagerModal.moduleTitle }}</h2>
        
        <div class="quiz-manager-content">
          <!-- Quiz List Section -->
          <div class="quiz-manager-section">
            <div class="quiz-section-header">
              <h3>Quizzes for this Level</h3>
              <button class="quiz-create-btn" @click="startCreatingQuiz">+ Create New Quiz</button>
            </div>
            
            <ul v-if="quizManagerModal.assignedQuizzes.length" class="assigned-quiz-list">
              <li v-for="quiz in quizManagerModal.assignedQuizzes" :key="quiz.id" class="assigned-quiz-item">
                <div class="quiz-item-info">
                  <span class="quiz-name">{{ quiz.title }}</span>
                  <span class="quiz-questions">{{ quiz.questions?.length || 0 }} questions</span>
                </div>
                <div class="quiz-item-actions">
                  <button class="quiz-edit-btn" @click="editQuiz(quiz)">Edit</button>
                  <button class="quiz-delete-btn" @click="deleteQuiz(quiz.id)">Delete</button>
                </div>
              </li>
            </ul>
            <p v-else class="quiz-empty-state">No quizzes assigned yet. Create one to get started!</p>
          </div>
        </div>
        
        <div class="quiz-manager-actions">
          <button class="menu-btn" @click="closeQuizManager()">Close</button>
        </div>
      </div>
    </div>

    <!-- Mission Editor Modal (Instructor) -->
    <div v-if="missionEditorModal" class="quiz-editor-overlay">
      <div class="quiz-editor-card glass-card mission-editor-card">
        <h2>{{ missionEditorModal.isNew ? '🧭 Create New Mission' : '✏️ Edit Mission' }}</h2>

        <div class="quiz-editor-content">
          <!-- Basic Info -->
          <div class="quiz-editor-section">
            <label class="quiz-field">
              <span>Mission Title</span>
              <input type="text" v-model="missionEditorModal.data.title" placeholder="e.g., Mission 5: Advanced Navigation" class="quiz-input" />
            </label>
            
            <!-- Boat Type Selection (Instructor) -->
            <label class="quiz-field">
              <span>Required Boat Type</span>
              <div class="boat-type-radios">
                <label class="boat-type-option">
                  <input type="radio" name="mission-boat-type" value="small" v-model="missionEditorModal.data.boatType" />
                  <span>Small Boat (18m)</span>
                </label>
                <label class="boat-type-option">
                  <input type="radio" name="mission-boat-type" value="medium" v-model="missionEditorModal.data.boatType" />
                  <span>Medium Boat (60m)</span>
                </label>
                <label class="boat-type-option">
                  <input type="radio" name="mission-boat-type" value="large" v-model="missionEditorModal.data.boatType" />
                  <span>Large Boat (180m)</span>
                </label>
              </div>
              <span class="field-hint">Default: Medium Boat if not selected</span>
            </label>
            
            <label class="quiz-field">
              <span>Difficulty</span>
              <div class="difficulty-radios">
                <label class="difficulty-option">
                  <input type="radio" name="mission-difficulty" value="Beginner" v-model="missionEditorModal.data.difficulty" />
                  <span>Beginner</span>
                </label>
                <label class="difficulty-option">
                  <input type="radio" name="mission-difficulty" value="Intermediate" v-model="missionEditorModal.data.difficulty" />
                  <span>Intermediate</span>
                </label>
                <label class="difficulty-option">
                  <input type="radio" name="mission-difficulty" value="Advanced" v-model="missionEditorModal.data.difficulty" />
                  <span>Advanced</span>
                </label>
              </div>
              <span class="field-hint">Set the training difficulty for this mission</span>
            </label>
            
            <label class="quiz-field">
              <span>Estimated Duration</span>
              <input type="text" v-model="missionEditorModal.data.duration" placeholder="e.g., 5-10 minutes" class="quiz-input" />
            </label>
            
            <label class="quiz-field">
              <span>XP Reward</span>
              <input type="number" v-model.number="missionEditorModal.data.xpReward" placeholder="100" class="quiz-input" min="0" step="10" />
              <span class="field-hint">Base XP awarded when mission is successfully completed</span>
            </label>
            
            <label class="quiz-field">
              <span>Mission Pass Score</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="number" v-model.number="missionEditorModal.data.passScore" placeholder="70" class="quiz-input" min="0" max="100" step="5" style="flex: 1;" />
                <span style="color: #94a3b8; font-weight: 500;">%</span>
              </div>
              <span class="field-hint">Minimum score required to pass this mission</span>
            </label>
          </div>

          <!-- Buoy checkpoint content -->
          <div class="quiz-editor-section">
            <div class="quiz-section-header">
              <h3>⚓ Buoy Checkpoint Content</h3>
              <button class="quiz-add-question-btn" @click="addMissionBuoy()">+ Add Buoy</button>
            </div>
            <div v-if="missionEditorModal.data.buoys.length === 0" class="quiz-empty-state">
              No buoy content yet. Add one buoy for each checkpoint students must inspect.
            </div>
            <div v-for="(buoy, bIdx) in missionEditorModal.data.buoys" :key="buoy.id" class="question-editor-card mission-buoy-card">
              <div class="question-header">
                <span class="question-number">Buoy {{ bIdx + 1 }}</span>
                <button class="question-remove-btn" @click="removeMissionBuoy(bIdx)">✕</button>
              </div>
              <label class="quiz-field">
                <span>Checkpoint / Waypoint ID</span>
                <input type="text" v-model="buoy.waypointZone" placeholder="e.g., custom-mission-buoy-1" class="quiz-input" />
              </label>
              <label class="quiz-field">
                <span>Interaction Type (Task)</span>
                <select v-model="buoy.requireInteraction" class="quiz-select">
                  <option value="">None (Just navigate)</option>
                  <option value="photograph">📷 Photograph - Take picture</option>
                  <option value="verify_id">🔍 Verify ID - Enter buoy ID</option>
                  <option value="remove_debris">🧹 Clean Debris - Hold to clean</option>
                  <option value="inspect_buoy">👁️ Inspect - Quick check</option>
                </select>
                <span class="field-hint">This determines what students must do at this buoy</span>
              </label>
              <label class="quiz-field">
                <span>Buoy Image</span>
                <input type="file" accept="image/*" class="quiz-input" @change="handleMissionBuoyImage($event, buoy)" />
                <img v-if="buoy.imageSrc" :src="buoy.imageSrc" :alt="`Buoy ${bIdx + 1} preview`" class="mission-buoy-preview" />
              </label>
              <label class="quiz-field">
                <span>Buoy Name</span>
                <input type="text" v-model="buoy.name" placeholder="e.g., Crab Pot #482" class="quiz-input" />
              </label>
              <label class="quiz-field">
                <span>Buoy Description</span>
                <textarea v-model="buoy.description" rows="5" placeholder="Describe what students should learn or identify at this buoy..." class="quiz-textarea"></textarea>
              </label>
            </div>
          </div>
        </div>

        <div class="quiz-editor-actions">
          <button class="quiz-save-btn" @click="saveMissionEditor()" :disabled="missionSaving">
            {{ missionSaving ? '💾 Saving...' : '💾 Save Mission' }}
          </button>
          <button class="quiz-cancel-btn" @click="missionEditorModal = null" :disabled="missionSaving">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Quiz Creator/Editor Modal -->
    <div v-if="quizEditorModal" class="quiz-editor-overlay">
      <div class="quiz-editor-card glass-card">
        <h2>{{ quizEditorModal.isNew ? '📝 Create New Quiz' : '✏️ Edit Quiz' }}</h2>
        
        <div class="quiz-editor-content">
          <!-- Questions Section -->
          <div class="quiz-editor-section">
            <div class="quiz-section-header">
              <h3>❓ Questions</h3>
              <button class="quiz-add-question-btn" @click="addQuestion">+ Add Question</button>
            </div>
            
            <div v-if="quizEditorModal.quiz.questions.length === 0" class="quiz-empty-state">
              No questions yet. Click "Add Question" to create one.
            </div>
            
            <div v-for="(question, qIdx) in quizEditorModal.quiz.questions" :key="question.id" class="question-editor-card">
              <div class="question-header">
                <span class="question-number">Question {{ qIdx + 1 }}</span>
                <button class="question-remove-btn" @click="removeQuestion(qIdx)">✕</button>
              </div>
              
              <label class="quiz-field">
                <span>Question Text</span>
                <textarea 
                  v-model="question.prompt" 
                  @input="debouncedSaveDraft"
                  placeholder="Enter your question..."
                  class="quiz-textarea"
                  rows="2"
                ></textarea>
              </label>
              
              <label class="quiz-field">
                <span>Question Type</span>
                <select v-model="question.type" @change="resetAnswerOptions(question)" class="quiz-select">
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
                  <option value="fill-in-the-blank">Fill in the Blank</option>
                </select>
              </label>
              
              <!-- Multiple Choice Options -->
              <div v-if="question.type === 'multiple-choice'" class="mc-options">
                <div class="mc-options-header">
                  <label class="quiz-field-label">Answer Options:</label>
                  <span class="correct-answer-hint">← Select correct answer</span>
                </div>
                <div v-for="(option, optIdx) in question.options" :key="option.id" class="mc-option-row">
                  <div class="radio-wrapper" :title="option.isCorrect ? 'Correct Answer' : 'Mark as correct'">
                    <input 
                      type="radio" 
                      :name="'correct-' + question.id" 
                      :checked="option.isCorrect"
                      @change="setCorrectOption(question, optIdx)"
                      class="correct-radio"
                    />
                    <span v-if="option.isCorrect" class="correct-indicator">✓ Correct</span>
                  </div>
                  <input 
                    type="text" 
                    v-model="option.text" 
                    @input="debouncedSaveDraft"
                    placeholder="Option text..."
                    class="mc-option-input"
                  />
                  <button 
                    v-if="question.options.length > 2"
                    class="mc-option-remove"
                    @click="removeOption(question, optIdx)"
                  >✕</button>
                </div>
                <button 
                  v-if="question.options.length < 6"
                  class="mc-add-option-btn"
                  @click="addOption(question)"
                >+ Add Option</button>
              </div>
              
              <!-- True/False Options -->
              <div v-if="question.type === 'true-false'" class="tf-options">
                <label class="quiz-field-label">Correct Answer:</label>
                <label class="tf-option">
                  <input 
                    type="radio" 
                    :name="'tf-' + question.id" 
                    value="True"
                    v-model="question.correctAnswer"
                    @change="debouncedSaveDraft"
                  />
                  <span>True</span>
                </label>
                <label class="tf-option">
                  <input 
                    type="radio" 
                    :name="'tf-' + question.id" 
                    value="False"
                    v-model="question.correctAnswer"
                    @change="debouncedSaveDraft"
                  />
                  <span>False</span>
                </label>
              </div>
              
              <!-- Fill in the Blank Answer -->
              <div v-if="question.type === 'fill-in-the-blank'" class="fib-answer">
                <label class="quiz-field">
                  <span>Correct Answer</span>
                  <input 
                    type="text" 
                    v-model="question.correctAnswer" 
                    @input="debouncedSaveDraft"
                    placeholder="Enter the correct answer..."
                    class="quiz-input"
                  />
                  <span class="field-hint">Answer matching is case-insensitive</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="quiz-editor-actions">
          <button class="quiz-save-btn" @click="saveQuiz" :disabled="quizSaving">
            {{ quizSaving ? '💾 Saving...' : '💾 Save Quiz' }}
          </button>
          <button class="quiz-cancel-btn" @click="cancelQuizEditor" :disabled="quizSaving">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Draft Restoration Prompt -->
    <div v-if="quizDraftRestorePrompt" class="quiz-editor-overlay">
      <div class="quiz-editor-card glass-card" style="max-width: 500px;">
        <h2>📝 Unsaved Draft Found</h2>
        <div class="quiz-editor-content">
          <p style="margin-bottom: 20px; line-height: 1.6;">
            You have unsaved changes from a previous editing session.
          </p>
          <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="margin-bottom: 8px;">
              <strong>Draft saved:</strong> {{ new Date(quizDraftRestorePrompt.draftTime).toLocaleString() }}
            </div>
            <div>
              <strong>Last database save:</strong> {{ new Date(quizDraftRestorePrompt.firestoreTime).toLocaleString() }}
            </div>
          </div>
          <p style="margin-bottom: 20px; color: #fbbf24;">
            Would you like to restore your unsaved changes?
          </p>
        </div>
        <div class="quiz-editor-actions">
          <button class="quiz-save-btn" @click="restoreDraft">Restore Draft</button>
          <button class="quiz-cancel-btn" @click="discardDraft">Use Database Version</button>
        </div>
      </div>
    </div>

    <!-- Auth -->
    <div v-if="activeScreen === 'auth'" class="scene-overlay auth-overlay">
      <div class="auth-shell">
        <div class="auth-icon-container">
          <div class="auth-icon">{{ adminLoginMode ? '⚓' : '🎖️' }}</div>
        </div>
        <h1 class="auth-brand">
          {{ authMode === 'signup' ? 'Student Sign Up'
             : adminLoginMode ? 'Admin Portal'
             : instructorLoginMode ? 'Instructor Console'
             : 'Student Terminal' }}
        </h1>
        <p class="auth-tagline">
          {{ authMode === 'signup' ? 'Create your account — awaits instructor approval'
             : (instructorLoginMode || adminLoginMode) ? 'HELMQUEST CONTROL COCKPIT' : 'MARITIME TRAINING PLATFORM' }}
        </p>

        <!-- SIGN IN FORM -->
        <form v-if="authMode === 'signin'" class="auth-form" @submit.prevent="mockAuthenticate">
          <label class="auth-field">
            <span>{{ (instructorLoginMode || adminLoginMode) ? 'ADMIN EMAIL ADDRESS' : 'EMAIL ADDRESS' }}</span>
            <div class="input-wrapper">
              <span class="input-icon">📧</span>
              <input 
                class="auth-input" 
                type="email" 
                autocomplete="username" 
                v-model="authForm.email" 
                :placeholder="(instructorLoginMode || adminLoginMode) ? 'email@Dnsc.edu.ph' : 'student.dnsc.edu.ph'"
              />
            </div>
          </label>
          <label class="auth-field">
            <span>PASSWORD</span>
            <div class="password-input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                class="auth-input"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                v-model="authForm.password"
                :placeholder="(instructorLoginMode || adminLoginMode) ? 'Enter your password' : 'Enter your password'"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <span v-if="!showPassword" class="eye-off-icon"></span>
                <span v-else class="eye-on-icon"></span>
              </button>
            </div>
          </label>
          <button type="submit" class="auth-signin-btn" :class="{ 'instructor-signin': instructorLoginMode || adminLoginMode }">
            {{ (instructorLoginMode || adminLoginMode) ? '→ UNLOCK CONSOLE COCKPIT' : 'SIGN IN' }}
          </button>
          <p v-if="authError" class="auth-error">{{ authError }}</p>
        </form>

        <!-- SIGN UP FORM (students only) -->
        <form v-else class="auth-form" @submit.prevent="submitStudentSignup">
          <label class="auth-field">
            <span>STUDENT ID</span>
            <div class="input-wrapper">
              <span class="input-icon">🆔</span>
              <input class="auth-input" type="text" v-model="signupForm.studentId" placeholder="e.g., STU-2026-001" required />
            </div>
          </label>
          <label class="auth-field">
            <span>FULL NAME</span>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input class="auth-input" type="text" v-model="signupForm.name" placeholder="Full name" required />
            </div>
          </label>
          <label class="auth-field">
            <span>EMAIL ADDRESS</span>
            <div class="input-wrapper">
              <span class="input-icon">📧</span>
              <input class="auth-input" type="email" autocomplete="username" v-model="signupForm.email" placeholder="you@example.com" required />
            </div>
          </label>
          <label class="auth-field">
            <span>SELECT INSTRUCTOR</span>
            <div class="input-wrapper">
              <span class="input-icon">👨‍🏫</span>
              <select class="auth-input" v-model="signupForm.instructorId" required>
                <option value="" disabled>
                  {{ availableInstructors.length === 0 ? 'Loading instructors...' : 'Choose your instructor' }}
                </option>
                <option v-for="instructor in availableInstructors" :key="instructor.id" :value="instructor.id">
                  {{ instructor.name }}
                </option>
              </select>
            </div>
          </label>
          <label class="auth-field">
            <span>PASSWORD</span>
            <div class="password-input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                class="auth-input"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                v-model="signupForm.password"
                minlength="4"
                required
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <span v-if="!showPassword" class="eye-off-icon"></span>
                <span v-else class="eye-on-icon"></span>
              </button>
            </div>
          </label>
          <button type="submit" class="auth-signin-btn">CREATE ACCOUNT</button>
          <p v-if="authError" class="auth-error">{{ authError }}</p>
          <p v-if="signupSuccess" class="auth-success">
            ✅ Account created. Waiting for instructor approval before you can sign in.
          </p>
        </form>

        <div class="auth-mode-switch">
          <button v-if="authMode === 'signin' && !instructorLoginMode && !adminLoginMode" type="button" class="auth-mode-link" @click="switchAuthMode('signup')">
            No account? <strong>Sign up as student</strong>
          </button>
          <button v-if="authMode === 'signup'" type="button" class="auth-mode-link" @click="switchAuthMode('signin')">
            Already have an account? <strong>Sign in</strong>
          </button>
        </div>

        <p v-if="authMode === 'signin' && !adminLoginMode && !instructorLoginMode" class="auth-demo-hint">
          CREDENTIALS: instructor@helmquest.edu.ph / password
        </p>
        <button type="button" class="auth-guest-link" @click="goToScreen('landing')">
          ← RETURN TO SHORE
        </button>
      </div>
    </div>

    <!-- Dashboard — instructor console -->
    <div v-if="activeScreen === 'dashboard' && userRole === 'instructor'" class="scene-overlay dashboard-overlay">
      <div class="missions-hub missions-hub--with-sidebar" :class="{ 'missions-hub--sidebar-collapsed': sidebarCollapsed }">
        <!-- Left Sidebar -->
        <aside class="hub-sidebar" :class="{ 'hub-sidebar--collapsed': sidebarCollapsed }">
          <div class="hub-sidebar-brand">
            <span class="hub-sidebar-logo">⚓</span>
            <div class="hub-sidebar-brand-text">
              <strong>HELMQUEST</strong>
              <span>Instructor</span>
            </div>
          </div>

          <div class="hub-sidebar-profile">
            <div class="hub-sidebar-avatar">{{ (currentUser.name || 'I').charAt(0) }}</div>
            <strong class="hub-sidebar-name">{{ currentUser.name }}</strong>
            <span class="hub-sidebar-rank">Instructor</span>
          </div>

          <nav class="hub-sidebar-nav" aria-label="Instructor sections">
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': instructorTab === 'overview' }"
              @click="selectInstructorTab('overview')"
            >
              <span class="hub-nav-icon">📊</span> Overview
            </button>
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': instructorTab === 'missions' }"
              @click="selectInstructorTab('missions')"
            >
              <span class="hub-nav-icon">🧭</span> Missions
              <span class="hub-nav-count">{{ trainingModules.length }}</span>
            </button>
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': instructorTab === 'students' }"
              @click="selectInstructorTab('students')"
            >
              <span class="hub-nav-icon">👥</span> Students
              <span v-if="pendingStudentSignups.length" class="hub-nav-count">{{ pendingStudentSignups.length }}</span>
            </button>
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': instructorTab === 'leaderboards' }"
              @click="selectInstructorTab('leaderboards')"
            >
              <span class="hub-nav-icon">🏆</span> Leaderboards
            </button>
          </nav>

          <button type="button" class="hub-sidebar-logout" @click="signOut">
            <span class="hub-nav-icon">⎋</span> Log out
          </button>
        </aside>

        <!-- Main content -->
        <div class="missions-main">
        <header class="instructor-console-header">
          <div class="instructor-console-intro">
            <h1 class="instructor-brand-tab">
              <span v-if="instructorTab === 'overview'">📊 Dashboard Overview</span>
              <span v-else-if="instructorTab === 'missions'">🎯 Mission Management</span>
              <span v-else-if="instructorTab === 'students'">👥 Student Management</span>
              <span v-else-if="instructorTab === 'quizzes'">📝 Quiz Management</span>
              <span v-else-if="instructorTab === 'leaderboards'">🏆 Leaderboards</span>
              <span v-else>Instructor Console</span>
            </h1>
            <p class="instructor-header-subtitle">
              <span v-if="instructorTab === 'overview'">Track your students and mission progress at a glance.</span>
              <span v-else-if="instructorTab === 'missions'">Create, edit, and configure missions for your students.</span>
              <span v-else-if="instructorTab === 'students'">Manage student accounts, review progress, and approve signups.</span>
              <span v-else-if="instructorTab === 'quizzes'">Create and manage quizzes for mission assessments.</span>
              <span v-else-if="instructorTab === 'leaderboards'">View student rankings by performance and track class progress.</span>
              <span v-else>Manage your courses and students.</span>
            </p>
          </div>
          <button
            type="button"
            class="hub-sidebar-toggle"
            @click="sidebarCollapsed = !sidebarCollapsed"
            :aria-expanded="!sidebarCollapsed"
          >
            <span>{{ sidebarCollapsed ? 'Show menu' : 'Hide menu' }}</span>
            <span class="toggle-icon">{{ sidebarCollapsed ? '▸' : '▾' }}</span>
          </button>
        </header>

        <section v-show="instructorTab === 'overview'" class="instructor-overview" aria-label="Class overview">
          <div class="overview-toolbar">
            <span>Class Summary</span>
            <button type="button" class="overview-action" @click="fetchInstructorOverview" :disabled="instructorOverviewLoading">
              {{ instructorOverviewLoading ? 'Refreshing...' : 'Refresh' }}
            </button>
          </div>
          <p v-if="instructorOverviewError" class="overview-error" role="alert">{{ instructorOverviewError }}</p>
          <p v-if="instructorOverviewLoading && !instructorOverview" class="overview-empty" role="status">Loading class progress...</p>
          <template v-if="instructorOverview">
            <div class="dashboard-stats-cards">
              <article class="dashboard-stat-card dashboard-stat-card--blue">
                <div class="dashboard-stat-icon">👥</div>
                <div class="dashboard-stat-content">
                  <strong class="dashboard-stat-number">{{ instructorOverview.totalStudents }}</strong>
                  <span class="dashboard-stat-label">Total Students</span>
                  <span class="dashboard-stat-desc">Enrolled in your class</span>
                </div>
              </article>
              <article class="dashboard-stat-card dashboard-stat-card--green">
                <div class="dashboard-stat-icon">✓</div>
                <div class="dashboard-stat-content">
                  <strong class="dashboard-stat-number">{{ instructorOverview.studentsPassed }}</strong>
                  <span class="dashboard-stat-label">Students Passed</span>
                  <span class="dashboard-stat-desc">At least one mission passed</span>
                </div>
              </article>
              <article class="dashboard-stat-card dashboard-stat-card--purple">
                <div class="dashboard-stat-icon">↻</div>
                <div class="dashboard-stat-content">
                  <strong class="dashboard-stat-number">{{ instructorOverview.studentsNeedingRetry }}</strong>
                  <span class="dashboard-stat-label">Needs Retry</span>
                  <span class="dashboard-stat-desc">Students with failed missions</span>
                </div>
              </article>
              <article class="dashboard-stat-card dashboard-stat-card--cyan">
                <div class="dashboard-stat-icon">⚓</div>
                <div class="dashboard-stat-content">
                  <strong class="dashboard-stat-number">{{ instructorOverview.completionRate }}%</strong>
                  <span class="dashboard-stat-label">Completion Rate</span>
                  <span class="dashboard-stat-desc">Across students and missions</span>
                </div>
              </article>
            </div>
            <div class="dashboard-main-section">
              <section class="dashboard-panel">
                <h2 class="dashboard-panel-title">Mission Progress</h2>
                <div class="dashboard-progress-main">
                  <div class="dashboard-progress-header">
                    <span class="dashboard-progress-label">{{ instructorOverview.completed }} / {{ instructorOverview.totalPossibleCompletions }} student mission completions</span>
                    <span class="dashboard-progress-percent">{{ instructorOverview.completionRate }}%</span>
                  </div>
                  <div class="dashboard-progress-bar" role="progressbar" aria-label="Class mission completion" :aria-valuenow="instructorOverview.completionRate" aria-valuemin="0" aria-valuemax="100">
                    <div class="dashboard-progress-fill" :style="{ width: instructorOverview.completionRate + '%' }"></div>
                  </div>
                </div>
                <div class="dashboard-mission-cards">
                  <article v-for="mission in instructorOverview.missionProgress" :key="mission.id" class="dashboard-mission-card">
                    <div class="dashboard-mission-header">
                      <span class="dashboard-mission-name" :title="mission.name">{{ mission.name }}</span>
                      <span class="dashboard-mission-percent">{{ mission.percentage }}%</span>
                    </div>
                    <p class="overview-mission-count">{{ mission.passed }} / {{ mission.total }} students passed</p>
                    <div class="dashboard-mission-bar" role="progressbar" :aria-label="mission.name" :aria-valuenow="mission.percentage" aria-valuemin="0" aria-valuemax="100">
                      <div class="dashboard-mission-fill dashboard-mission-fill--cyan" :style="{ width: mission.percentage + '%' }"></div>
                    </div>
                  </article>
                </div>
                <p v-if="!instructorOverview.missionProgress.length" class="overview-empty">Add a mission to start tracking class progress.</p>
              </section>
              <div class="overview-detail-grid">
                <section class="dashboard-panel">
                  <div class="overview-panel-heading">
                    <h2 class="dashboard-panel-title">Needs Attention</h2>
                    <button type="button" class="overview-action" @click="selectInstructorTab('students')">View Students</button>
                  </div>
                  <ul v-if="instructorOverview.attention.length" class="overview-results">
                    <li v-for="student in instructorOverview.attention" :key="student.id" class="overview-result-row">
                      <div class="overview-result-info">
                        <strong>{{ student.name }}</strong>
                        <span>{{ student.status === 'retry' ? student.failedMissions + (student.failedMissions === 1 ? ' mission needs retry' : ' missions need retry') : 'No mission attempts yet' }}</span>
                      </div>
                      <span class="overview-status" :class="{ 'overview-status--retry': student.status === 'retry' }">{{ student.status === 'retry' ? 'Retry' : 'Not started' }}</span>
                    </li>
                  </ul>
                  <p v-else class="overview-empty">{{ instructorOverview.totalStudents ? 'No students need attention right now.' : 'No enrolled students yet.' }}</p>
                  <p v-if="instructorOverview.attentionTotal > 5" class="overview-empty">Showing 5 of {{ instructorOverview.attentionTotal }} students.</p>
                </section>
                <section class="dashboard-panel">
                  <h2 class="dashboard-panel-title">Recent Results</h2>
                  <ul v-if="instructorOverview.recentResults.length" class="overview-results">
                    <li v-for="result in instructorOverview.recentResults" :key="result.type + result.id" class="overview-result-row">
                      <div class="overview-result-info">
                        <strong>{{ result.studentName }}</strong>
                        <span>{{ result.type }} · {{ result.title }}</span>
                      </div>
                      <span class="overview-status" :class="result.passed ? 'overview-status--passed' : 'overview-status--retry'">{{ result.score }}% · {{ result.passed ? 'Pass' : 'Fail' }}</span>
                    </li>
                  </ul>
                  <p v-else class="overview-empty">Mission and quiz results will appear here.</p>
                </section>
              </div>
            </div>
          </template>
        </section>
        <section v-show="instructorTab === 'missions'" class="instructor-missions-panel">
          <!-- Toolbar -->
          <div class="instructor-missions-toolbar">
            <div class="instructor-missions-heading">
              <h2 class="instructor-panel-title">Mission Management</h2>
              <p class="instructor-panel-note">
                Create, edit, and configure the missions students see. Same layout as the student view, with full instructor controls.
              </p>
            </div>
            <button type="button" class="instructor-create-mission-btn" @click="openMissionCreator()">
              + Create New Mission
            </button>
          </div>

          <!-- Global Toggles -->
          <div class="instructor-global-toggles">
            <label class="instructor-setting-toggle">
              <input
                type="checkbox"
                :checked="courseSettingsView.sequentialUnlock"
                @change="onSequentialUnlockChange"
              />
              <span>Unlock levels in order (complete previous level first)</span>
            </label>
            
          </div>

          <!-- Mission Cards (same style as student view) -->
          <div class="training-grid">
            <article
              v-for="module in trainingModules"
              :key="module.id"
              class="training-card instructor-training-card"
              :class="{ 'training-card--locked': isModuleLockedByInstructorNow(module.id) }"
            >
              <div class="training-card-top">
                <div class="training-badges">
                  <span class="training-level-badge">{{ displayModuleLevel(module.id) }}</span>
                  <span class="training-category">{{ module.category }}</span>
                  <span
                    class="training-difficulty"
                    :class="trainingDifficultyClass(module.difficulty)"
                  >{{ module.difficulty }}</span>
                </div>
                <span
                  v-if="isModuleLockedByInstructorNow(module.id)"
                  class="training-progress-badge"
                >🔒 Locked</span>
              </div>

              <h3 class="training-card-title">{{ module.title }}</h3>
              <p class="training-card-desc">{{ module.description }}</p>

              <div class="training-meta">
                <span class="training-duration">Est. {{ module.duration }}</span>
                <span class="training-reward">+{{ module.xpReward ?? 100 }} XP</span>
              </div>

              <div class="instructor-mission-steps-summary" v-if="module.missionSteps && module.missionSteps.length > 0">
                <h4>Mission steps ({{ module.missionSteps.length }})</h4>
                <ol>
                  <li v-for="step in module.missionSteps" :key="step.id">{{ step.text }}</li>
                </ol>
              </div>
              <div class="instructor-mission-steps-summary" v-else-if="module.steps && module.steps.length > 0">
                <h4>Mission steps ({{ module.steps.length }})</h4>
                <ol>
                  <li v-for="(step, i) in module.steps" :key="i">{{ step.instruction }}</li>
                </ol>
              </div>

              <!-- Instructor Controls -->
              <div class="instructor-mission-controls">
                <h4 class="instructor-controls-heading">⚙️ Instructor Controls</h4>

                <div class="instructor-controls-row">
                  <label class="instructor-mission-toggle">
                    <input
                      type="checkbox"
                      :checked="isModuleLockedByInstructorNow(module.id)"
                      @change="onModuleLockChange(module.id, $event.target.checked)"
                    />
                    <span>🔒 Lock (hide from students)</span>
                  </label>
                  <label class="instructor-mission-toggle">
                    <input
                      type="checkbox"
                      :checked="isGearQuizRetakeAllowed"
                      @change="onRetakeToggleChange($event.target.checked)"
                    />
                    <span>🔄 Allow retakes</span>
                  </label>
                </div>

                <div class="instructor-controls-row">
                  <label class="instructor-mission-date">
                    <span>Open Date</span>
                    <input
                      type="datetime-local"
                      :value="getModuleSchedule(module.id).openDate"
                      @change="onModuleOpenDateChange(module.id, $event.target.value)"
                    />
                  </label>
                  <label class="instructor-mission-date">
                    <span>Deadline</span>
                    <input
                      type="datetime-local"
                      :value="getModuleSchedule(module.id).deadline"
                      @change="onModuleDeadlineChange(module.id, $event.target.value)"
                    />
                  </label>
                </div>
              </div>

              <!-- Actions -->
              <div class="instructor-mission-actions">
                <button type="button" class="instructor-mission-btn instructor-mission-btn--edit" @click="openMissionEditor(module)">
                  ✏️ Edit Mission
                </button>
                <button type="button" class="instructor-mission-btn instructor-mission-btn--quiz" :disabled="missionQuizzesLoading" @click="startCreatingQuiz(module.id, module.title)">
                  📝 {{ getQuizButtonText(module.id) }}
                </button>
                <button
                  type="button"
                  class="instructor-mission-btn instructor-mission-btn--delete"
                  @click="confirmDeleteMission(module)"
                >
                  🗑️ Delete
                </button>
              </div>
            </article>
          </div>
        </section>

        <!-- Pending Approvals -->
        <section v-show="instructorTab === 'students' && pendingStudentSignups.length" class="instructor-panel instructor-pending-panel">
          <h2 class="instructor-panel-title">🕒 Pending Approvals ({{ pendingStudentSignups.length }})</h2>
          <p class="instructor-panel-note">
            Review student sign-up requests. Approve to activate the account, or reject to remove it.
          </p>
          <ul class="instructor-pending-list">
            <li v-for="acct in pendingStudentSignups" :key="acct.id" class="instructor-pending-item">
              <div class="instructor-pending-info">
                <strong>{{ acct.name }}</strong>
                <span class="instructor-pending-meta">
                  {{ acct.studentId }} · {{ acct.email }} · submitted {{ formatSessionDate(acct.createdAt) }}
                </span>
              </div>
              <div class="instructor-pending-actions">
                <button type="button" class="instructor-approve-btn" @click="approveStudentSignup(acct.id)">
                  ✓ Approve
                </button>
                <button type="button" class="instructor-reject-btn" @click="rejectStudentSignup(acct.id)">
                  ✕ Reject
                </button>
              </div>
            </li>
          </ul>
        </section>

        <!-- Student Management -->
        <section v-show="instructorTab === 'students'" class="instructor-panel student-management-panel" aria-label="Class students">
          <div class="instructor-panel-header">
            <div>
              <h2 class="instructor-panel-title">Your students <span v-if="studentManagement" class="student-count">{{ managedStudents.length }}</span></h2>
              <p class="student-management-note">Account details and saved training progress for your class.</p>
            </div>
            <div class="instructor-panel-actions">
              <button type="button" class="overview-action" @click="fetchStudentManagement" :disabled="studentManagementLoading">{{ studentManagementLoading ? 'Refreshing...' : 'Refresh' }}</button>
              <button type="button" class="instructor-export-btn" @click="exportStudentRecords" :disabled="studentManagementLoading || !!studentManagementError || !filteredManagedStudents.length">Export CSV</button>
            </div>
          </div>
          <div class="student-management-filters">
            <label class="student-search-field">
              <span>Search students</span>
              <input v-model="studentSearch" type="search" placeholder="Name, student ID or email" />
            </label>
            <label class="student-status-field">
              <span>Account status</span>
              <select v-model="studentStatusFilter"><option value="all">All students</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </label>
          </div>
          <div v-if="studentManagementError" class="overview-error student-management-error" role="alert"><span>{{ studentManagementError }}</span><button type="button" class="overview-action" @click="fetchStudentManagement">Try again</button></div>
          <p v-if="studentManagementLoading && !studentManagement" class="overview-empty" role="status">Loading student records...</p>
          <p v-else-if="studentManagement && !managedStudents.length" class="overview-empty">No enrolled students yet. Approved students will appear here.</p>
          <p v-else-if="studentManagement && !filteredManagedStudents.length" class="overview-empty">No students match your search or status filter.</p>
          <div v-else-if="studentManagement" class="instructor-table-wrap student-management-table-wrap">
            <table class="instructor-table student-management-table">
              <thead><tr><th>Student</th><th>Rank / XP</th><th>Missions passed</th><th>Quizzes taken</th><th>Status</th><th>Records</th></tr></thead>
              <tbody>
                <tr v-for="student in filteredManagedStudents" :key="student.id">
                  <td data-label="Student"><div class="student-account-cell"><strong>{{ student.name }}</strong><span class="student-account-id">{{ student.studentId || 'No student ID' }}</span><span>{{ student.email }}</span></div></td>
                  <td data-label="Rank / XP"><div class="student-rank-cell"><strong>{{ student.rank }}</strong><span>{{ student.xp }} XP</span></div></td>
                  <td data-label="Missions passed"><div class="student-progress-cell"><span class="mission-completion-badge">{{ student.missionsCompleted }}/{{ student.missionsTotal }}</span><span>{{ student.missionsFailed ? student.missionsFailed + ' to retry' : student.missionsTotal && student.missionsCompleted === student.missionsTotal ? 'All passed' : student.missionsCompleted ? 'In progress' : 'Not started' }}</span></div></td>
                  <td data-label="Quizzes taken"><div class="student-progress-cell"><span class="quiz-completion-badge">{{ student.quizzesCompleted }}/{{ student.quizzesTotal }}</span><span>{{ student.quizzesCompleted ? student.quizzesPassed + ' passed' : student.quizzesTotal ? 'Not started' : 'No quizzes assigned' }}</span></div></td>
                  <td data-label="Status"><span class="student-status-badge" :class="'student-status-badge--' + student.status">{{ student.status }}</span></td>
                  <td data-label="Records"><div class="instructor-row-actions"><button type="button" class="overview-action" @click="openStudentDetail(student)">View records</button><button type="button" class="instructor-icon-btn instructor-icon-btn--remove" :title="'Remove ' + student.name" :aria-label="'Remove ' + student.name" @click="confirmRemoveStudent(student)"><svg class="student-remove-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" /></svg></button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="studentManagement && !studentManagementLoading && !studentManagementError && managedStudents.length" class="student-management-note student-management-footnote">
            <span v-if="filteredManagedStudents.length === managedStudents.length">Enrolled students: {{ managedStudents.length }}</span>
            <span v-else>Matching students: {{ filteredManagedStudents.length }} · Enrolled total: {{ managedStudents.length }}</span>
            <span> · Mission progress shows passed missions; quiz progress shows submitted quizzes.</span>
          </p>
        </section>
        <!-- Leaderboards Section (Instructor) -->
        <section v-show="instructorTab === 'leaderboards'" class="instructor-panel">
          
          <div class="leaderboard-tabs">
            <button
              class="leaderboard-tab"
              :class="{ 'leaderboard-tab--active': leaderboardTab === 'myclass' }"
              @click="leaderboardTab = 'myclass'; fetchLeaderboardData();"
            >
              👥 My Class
            </button>
            <button
              class="leaderboard-tab"
              :class="{ 'leaderboard-tab--active': leaderboardTab === 'global' }"
              @click="leaderboardTab = 'global'; fetchLeaderboardData();"
            >
              🌍 All Students
            </button>
          </div>

          <!-- My Class Leaderboard -->
          <div v-show="leaderboardTab === 'myclass'" class="leaderboard-card glass-card">
            <h3 class="leaderboard-card-title">My Class Rankings</h3>
            <p class="leaderboard-card-subtitle">Students under {{ currentInstructorName }}</p>
            <div class="leaderboard-list">
              <div class="leaderboard-item leaderboard-header-row">
                <span class="leaderboard-rank">Rank</span>
                <span class="leaderboard-name">Student</span>
                <span class="leaderboard-stat">Rank</span>
                <span class="leaderboard-stat">Total XP</span>
              </div>
              <div class="leaderboard-item" v-for="(student, index) in myClassLeaderboard" :key="student.id">
                <span class="leaderboard-rank">
                  <span v-if="index === 0" class="rank-medal">🥇</span>
                  <span v-else-if="index === 1" class="rank-medal">🥈</span>
                  <span v-else-if="index === 2" class="rank-medal">🥉</span>
                  <span v-else class="rank-number">{{ index + 1 }}</span>
                </span>
                <span class="leaderboard-name">{{ student.name }}</span>
                <span class="leaderboard-stat">{{ student.rank }}</span>
                <span class="leaderboard-stat">{{ student.xp }} XP</span>
              </div>
            </div>
          </div>

          <!-- Global Leaderboard -->
          <div v-show="leaderboardTab === 'global'" class="leaderboard-card glass-card">
            <h3 class="leaderboard-card-title">Global Rankings</h3>
            <p class="leaderboard-card-subtitle">All students across all instructors</p>
            <div class="leaderboard-list">
              <div class="leaderboard-item leaderboard-header-row">
                <span class="leaderboard-rank">Rank</span>
                <span class="leaderboard-name">Student</span>
                <span class="leaderboard-stat">Rank</span>
                <span class="leaderboard-stat">Total XP</span>
              </div>
              <div class="leaderboard-item" v-for="(student, index) in globalLeaderboard" :key="student.id">
                <span class="leaderboard-rank">
                  <span v-if="index === 0" class="rank-medal">🥇</span>
                  <span v-else-if="index === 1" class="rank-medal">🥈</span>
                  <span v-else-if="index === 2" class="rank-medal">🥉</span>
                  <span v-else class="rank-number">{{ index + 1 }}</span>
                </span>
                <span class="leaderboard-name">{{ student.name }}</span>
                <span class="leaderboard-stat">{{ student.rank }}</span>
                <span class="leaderboard-stat">{{ student.xp }} XP</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Student Editor Modal (Add/Edit) -->
        <div v-if="studentEditorModal" class="quiz-editor-overlay" @click.self="studentEditorModal = null">
          <div class="quiz-editor-card glass-card">
            <h2>{{ studentEditorModal.isNew ? '➕ Add Student' : '✏️ Edit Student' }}</h2>
            <div class="quiz-editor-content">
              <label class="quiz-field">
                <span>Student ID</span>
                <input type="text" v-model="studentEditorModal.data.studentId" placeholder="e.g., STU-2026-001" class="quiz-input" />
              </label>
              <label class="quiz-field">
                <span>Full Name</span>
                <input type="text" v-model="studentEditorModal.data.name" placeholder="Full name" class="quiz-input" />
              </label>
              <label class="quiz-field">
                <span>Email Address</span>
                <input type="email" v-model="studentEditorModal.data.email" placeholder="you@example.com" class="quiz-input" />
              </label>
              <label v-if="studentEditorModal.isNew || studentEditorModal.data.setPassword" class="quiz-field">
                <span>Password</span>
                <div class="password-input-wrapper">
                  <input 
                    :type="showPasswordStudent ? 'text' : 'password'" 
                    v-model="studentEditorModal.data.password" 
                    placeholder="At least 4 characters" 
                    class="quiz-input" 
                  />
                  <button
                    type="button"
                    class="password-toggle-btn"
                    @click="showPasswordStudent = !showPasswordStudent"
                    :aria-label="showPasswordStudent ? 'Hide password' : 'Show password'"
                  >
                    <span v-if="!showPasswordStudent" class="eye-off-icon"></span>
                    <span v-else class="eye-on-icon"></span>
                  </button>
                </div>
              </label>
              <label v-if="!studentEditorModal.isNew" class="quiz-field-inline-toggle">
                <input type="checkbox" v-model="studentEditorModal.data.setPassword" />
                <span>Change password</span>
              </label>
              <label class="quiz-field">
                <span>Status</span>
                <select v-model="studentEditorModal.data.status" class="quiz-select">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div class="quiz-editor-actions">
              <button class="quiz-save-btn" @click="saveStudentEditor()">💾 Save</button>
              <button class="quiz-cancel-btn" @click="studentEditorModal = null">Cancel</button>
            </div>
          </div>
        </div>

        </div>
        <!-- /.missions-main -->
      </div>
    </div>

    <!-- Admin Dashboard -->
    <div v-if="activeScreen === 'admin-dashboard'" class="scene-overlay dashboard-overlay admin-dashboard-overlay">
      <div class="admin-shell">
        <header class="admin-header">
          <div class="admin-header-left">
            <span class="admin-eyebrow">🏠 Admin Portal</span>
            <h1 class="admin-title">HelmQuest Admin Dashboard</h1>
            <span class="admin-user-pill">{{ currentUser.name }}</span>
          </div>
          <button class="admin-signout-btn" @click="signOut">Sign Out</button>
        </header>

        <nav class="admin-nav">
          <button @click="adminTab = 'dashboard'" class="admin-nav-btn" :class="{ 'admin-nav-btn--active': adminTab === 'dashboard' }">🏠 Dashboard</button>
          <button @click="adminTab = 'students'" class="admin-nav-btn" :class="{ 'admin-nav-btn--active': adminTab === 'students' }">👤 Student Management</button>
          <button @click="adminTab = 'instructors'" class="admin-nav-btn" :class="{ 'admin-nav-btn--active': adminTab === 'instructors' }">👨‍🏫 Instructor Management</button>
          <button @click="adminTab = 'reports'" class="admin-nav-btn" :class="{ 'admin-nav-btn--active': adminTab === 'reports' }">📊 Reports</button>
        </nav>

        <div class="admin-content">
          <div class="admin-panel">
            <div class="admin-panel-header">
              <h2 class="admin-panel-title">🛠️ Level Creator</h2>
              <span class="admin-panel-subtitle">Pre-loaded with Mission 4 — edit and publish when ready</span>
            </div>

            <!-- Details Tab -->
            <div v-if="levelCreatorTab === 'details'" class="admin-form">
              <div class="admin-form-row">
                <label class="admin-label">Mission Title</label>
                <input class="admin-input" v-model="levelCreator.title" placeholder="e.g. Mission 4: Multi-Waypoint Patrol" />
              </div>
              <div class="admin-form-row">
                <label class="admin-label">Category</label>
                <input class="admin-input" v-model="levelCreator.category" placeholder="e.g. Module 1" />
              </div>
              <div class="admin-form-row">
                <label class="admin-label">Difficulty</label>
                <select class="admin-input admin-select" v-model="levelCreator.difficulty">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div class="admin-form-row">
                <label class="admin-label">XP Reward</label>
                <input class="admin-input" v-model="levelCreator.reward" placeholder="e.g. +250 XP" />
              </div>
              <div class="admin-form-row">
                <label class="admin-label">Description</label>
                <textarea class="admin-input admin-textarea" v-model="levelCreator.description" rows="4" placeholder="Brief description of the mission and what the player learns..."></textarea>
              </div>
            </div>

            <!-- Steps Tab -->
            <div v-if="levelCreatorTab === 'steps'" class="admin-form">
              <p class="admin-form-hint">Each step guides the player to a specific waypoint. Steps run in order.</p>
              <div v-for="(step, idx) in levelCreator.steps" :key="idx" class="admin-step-card">
                <div class="admin-step-num">Step {{ idx + 1 }}</div>
                <div class="admin-form-row">
                  <label class="admin-label">Instruction Text</label>
                  <input class="admin-input" v-model="step.instruction" placeholder="What the player sees on screen" />
                </div>
                <div class="admin-form-row">
                  <label class="admin-label">Waypoint Type</label>
                  <select class="admin-input admin-select" v-model="step.type">
                    <option value="gps">GPS Coordinates</option>
                    <option value="compass">Compass Heading</option>
                    <option value="dock">Harbor Dock (Return)</option>
                  </select>
                </div>
                <div v-if="step.type === 'gps'" class="admin-form-inline">
                  <div class="admin-form-row">
                    <label class="admin-label">Latitude (°N)</label>
                    <input class="admin-input" v-model="step.lat" placeholder="e.g. 7.1100" />
                  </div>
                  <div class="admin-form-row">
                    <label class="admin-label">Longitude (°E)</label>
                    <input class="admin-input" v-model="step.lon" placeholder="e.g. 125.7400" />
                  </div>
                </div>
                <div v-if="step.type === 'compass'" class="admin-form-row">
                  <label class="admin-label">Required Heading (°)</label>
                  <input class="admin-input" v-model="step.heading" placeholder="e.g. 180" type="number" min="0" max="359" />
                </div>
                <div class="admin-form-row">
                  <label class="admin-label">Waypoint Zone ID</label>
                  <input class="admin-input admin-input-mono" v-model="step.waypointZone" placeholder="e.g. m1-patrol-1" />
                </div>
                <button class="admin-remove-btn" @click="levelCreator.steps.splice(idx, 1)" v-if="levelCreator.steps.length > 1">✕ Remove Step</button>
              </div>
              <button class="admin-add-btn" @click="levelCreator.steps.push({ instruction: '', waypointZone: '', type: 'gps', lat: '', lon: '' })">+ Add Step</button>
            </div>

            <!-- Objectives Tab -->
            <div v-if="levelCreatorTab === 'objectives'" class="admin-form">
              <p class="admin-form-hint">Objectives are shown to the player on the mission card and briefing screen.</p>
              <div v-for="(obj, idx) in levelCreator.objectives" :key="idx" class="admin-form-row admin-obj-row">
                <label class="admin-label">Objective {{ idx + 1 }}</label>
                <div class="admin-obj-input-wrap">
                  <input class="admin-input" v-model="levelCreator.objectives[idx]" placeholder="e.g. Navigate to 7.11°N, 125.74°E" />
                  <button class="admin-remove-btn admin-remove-inline" @click="levelCreator.objectives.splice(idx, 1)" v-if="levelCreator.objectives.length > 1">✕</button>
                </div>
              </div>
              <button class="admin-add-btn" @click="levelCreator.objectives.push('')">+ Add Objective</button>
            </div>

            <!-- Preview Tab -->
            <div v-if="levelCreatorTab === 'preview'" class="admin-preview">
              <div class="admin-preview-card">
                <div class="admin-preview-header">
                  <span class="admin-preview-category">{{ levelCreator.category }}</span>
                  <span class="admin-preview-difficulty" :class="'diff-' + levelCreator.difficulty.toLowerCase()">{{ levelCreator.difficulty }}</span>
                </div>
                <h3 class="admin-preview-title">{{ levelCreator.title }}</h3>
                <p class="admin-preview-desc">{{ levelCreator.description }}</p>
                <div class="admin-preview-reward">🏆 {{ levelCreator.reward }}</div>
                <div class="admin-preview-section">
                  <strong>Objectives</strong>
                  <ul class="admin-preview-list">
                    <li v-for="(obj, i) in levelCreator.objectives" :key="i">{{ obj }}</li>
                  </ul>
                </div>
                <div class="admin-preview-section">
                  <strong>Mission Steps ({{ levelCreator.steps.length }})</strong>
                  <ol class="admin-preview-list">
                    <li v-for="(step, i) in levelCreator.steps" :key="i">
                      {{ step.instruction }}
                      <span class="admin-step-badge" v-if="step.type === 'gps'">📍 {{ step.lat }}°N, {{ step.lon }}°E</span>
                      <span class="admin-step-badge" v-if="step.type === 'compass'">🧭 Heading {{ step.heading }}°</span>
                      <span class="admin-step-badge" v-if="step.type === 'dock'">⚓ Harbor Return</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <!-- Publish Bar -->
            <div class="admin-publish-bar">
              <div class="admin-publish-status" v-if="levelCreatorSaved">
                <span class="admin-saved-badge">✓ Saved as Draft</span>
              </div>
              <div class="admin-publish-actions">
                <button class="admin-save-btn" @click="adminSaveLevel">💾 Save Draft</button>
                <button class="admin-publish-btn" @click="adminPublishLevel">🚀 Publish Level</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard — student training hub (modules + missions) -->
    <div v-if="activeScreen === 'dashboard' && userRole === 'student'"
      class="scene-overlay dashboard-overlay student-dashboard-overlay"
      :class="{ 'student-dashboard-overlay--menu-open': studentCompactLayout && studentMenuOpen }">
      
      <!-- Pending Approval Message -->
      <div v-if="isStudentPending" class="pending-approval-overlay">
        <div class="pending-approval-card">
          <div class="pending-approval-icon">⏳</div>
          <h2 class="pending-approval-title">Enrollment Pending</h2>
          <p class="pending-approval-message">
            Your enrollment is pending instructor approval. You'll receive access to missions once your account has been approved.
          </p>
          <p class="pending-approval-note">
            Please check back later or contact your instructor for more information.
          </p>
          <button type="button" class="pending-approval-logout-btn" @click="signOut">
            ⎋ Log out
          </button>
        </div>
      </div>
      
      <!-- Main Dashboard (only shown if not pending) -->
      <div v-else class="missions-hub missions-hub--with-sidebar student-hub-shell"
        :class="{ 'student-hub--menu-open': studentMenuOpen }">
        <button v-if="studentCompactLayout && studentMenuOpen" type="button"
          class="student-menu-backdrop" tabindex="-1" aria-label="Close navigation menu" @click="closeStudentMenu()"></button>
        <!-- Left Sidebar -->
        <aside id="student-navigation" ref="studentMenuPanel" class="hub-sidebar"
          :inert="studentCompactLayout && !studentMenuOpen"
          :role="studentCompactLayout ? 'dialog' : undefined"
          :aria-modal="studentCompactLayout && studentMenuOpen ? 'true' : undefined"
          aria-label="Student navigation" tabindex="-1"
          @keydown.esc.stop.prevent="closeStudentMenu()" @keydown="trapStudentMenuFocus">
          <button ref="studentMenuClose" type="button" class="student-menu-close"
            aria-label="Close navigation menu" @click="closeStudentMenu()">✕</button>
          <div class="hub-sidebar-brand">
            <span class="hub-sidebar-logo">⚓</span>
            <div class="hub-sidebar-brand-text">
              <strong>HELMQUEST</strong>
              <span>Training</span>
            </div>
          </div>

          <div class="hub-sidebar-profile">
            <div class="hub-sidebar-avatar">{{ (demoStudent.name || 'S').charAt(0) }}</div>
            <strong class="hub-sidebar-name">{{ demoStudent.name }}</strong>
            <span class="hub-sidebar-student-id">{{ studentProfileExtras.studentId }}</span>
            <span class="hub-sidebar-rank">{{ demoStudent.rank }}</span>
            <div class="hub-sidebar-xp-bar" role="progressbar" :aria-valuenow="demoStudent.xpProgress" aria-valuemin="0" aria-valuemax="100">
              <div class="hub-sidebar-xp-fill" :style="{ width: demoStudent.xpProgress + '%' }"></div>
            </div>
            <span class="hub-sidebar-xp-text">{{ demoStudent.xp }} XP</span>
          </div>

          <nav class="hub-sidebar-nav" aria-label="Training sections">
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': hubTab === 'overview' }"
              @click="selectHubTab('overview'); closeStudentMenu()"
            >
              <span class="hub-nav-icon">📊</span> Overview
            </button>
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': hubTab === 'certificates' }"
              @click="selectHubTab('certificates'); closeStudentMenu()"
            >
              <span class="hub-nav-icon">🎖️</span> Training Records
            </button>
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': hubTab === 'missions' }"
              @click="selectHubTab('missions'); closeStudentMenu()"
            >
              <span class="hub-nav-icon">🧭</span> Missions
            </button>
            <button
              type="button"
              class="hub-nav-item"
              :class="{ 'hub-nav-item--active': hubTab === 'leaderboards' }"
              @click="selectHubTab('leaderboards'); closeStudentMenu()"
            >
              <span class="hub-nav-icon">🏆</span> Leaderboards
            </button>
          </nav>

          <button type="button" class="hub-sidebar-logout" @click="signOut">
            <span class="hub-nav-icon">⎋</span> Log out
          </button>
        </aside>

        <!-- Main content -->
        <div class="missions-main" :inert="studentCompactLayout && studentMenuOpen">
        <div class="student-mobile-toolbar">
          <strong>⚓ HELMQUEST</strong>
          <button ref="studentMenuTrigger" type="button" class="student-menu-trigger"
            aria-label="Open navigation menu" aria-controls="student-navigation"
            :aria-expanded="studentMenuOpen" @click="openStudentMenu">
            <span aria-hidden="true">☰</span><span>Menu</span>
          </button>
        </div>
        <header class="missions-hub-header" id="hub-overview">
          <div class="missions-hub-intro">
            <p class="training-eyebrow">HelmQuest Training</p>
            <h1 class="missions-hub-title">
              <template v-if="hubTab === 'overview'">Overview</template>
              <template v-else-if="hubTab === 'certificates'">Training Records</template>
              <template v-else-if="hubTab === 'missions'">Missions</template>
              <template v-else-if="hubTab === 'leaderboards'">Leaderboards</template>
              <template v-else>Navigation Training</template>
            </h1>
            <p v-if="hubTab === 'overview'" class="missions-hub-welcome">
              Welcome, {{ demoStudent.name }} · {{ demoStudent.rank }} · {{ demoStudent.xp }} XP
            </p>
            <p class="missions-hub-note">
              <template v-if="hubTab === 'overview'">
                {{ demoStudent.completed }} of {{ navigationMissions.length }} missions passed
                · {{ demoStudent.badgesEarned }}/{{ demoStudent.badgesTotal }} badges
                · {{ demoStudent.certificates }} certificates
              </template>
              <template v-else-if="hubTab === 'certificates'">
                View your complete training history and performance records
              </template>
              <template v-else-if="hubTab === 'missions'">
                Complete missions to earn XP, badges, and certificates
              </template>
              <template v-else-if="hubTab === 'leaderboards'">
                See how you rank against other students
              </template>
            </p>
          </div>
        </header>

        <section v-show="hubTab === 'overview'" class="motivation-panel" id="hub-badges" aria-label="Your progress and rewards">
          <!-- Student Profile Card - Horizontal Layout -->
          <div class="student-profile-card student-profile-card--horizontal">
            <div class="student-profile-left">
              <div class="student-profile-avatar">{{ (demoStudent.name || 'S').charAt(0) }}</div>
              <div class="student-profile-details">
                <strong class="student-profile-name">{{ demoStudent.name }}</strong>
                <div class="student-profile-meta">
                  <span class="student-profile-id">User ID: {{ studentProfileExtras.studentId }}</span>
                </div>
              </div>
            </div>
            <div class="student-profile-center">
              <div class="student-profile-rank-card">
                <span class="student-profile-rank-label">MY RANK</span>
                <span class="student-profile-rank-title">{{ demoStudent.rank }}</span>
                <span class="student-profile-rank-label" v-if="studentProgression.nextRank">
                  Next: {{ studentProgression.nextRank.name }} · {{ xpProgress.nextAt }} XP
                </span>
              </div>
            </div>
            <div class="student-profile-right">
              <div class="student-profile-badge-large" :class="{ 'student-profile-badge--placeholder': !profileBadge.earned }">
                <span class="student-profile-badge-icon-large" aria-hidden="true">{{ profileBadge.icon }}</span>
                <div class="student-profile-badge-info-large">
                  <span class="student-profile-badge-title-large">{{ profileBadge.title }}</span>
                  <span class="student-profile-badge-date-large" v-if="profileBadge.earnedAt">{{ formatCertificateDate(profileBadge.earnedAt) }}</span>
                  <span class="student-profile-badge-date-large" v-else>{{ profileBadge.earned ? '✓ EARNED' : 'Current Role' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Badges Section -->
          <div class="motivation-rewards-row motivation-rewards-row--full">
            <div class="motivation-block">
              <h2 class="motivation-block-title">
                <span class="motivation-block-icon">🏆</span>
                Badges
              </h2>
              <p class="motivation-block-hint">
                Complete activities and earn badges. Keep going, you're doing great!
              </p>
              <ul class="badge-grid">
                <li
                  v-for="badge in studentBadgeList"
                  :key="badge.id"
                  class="badge-card"
                  :class="{ 'badge-card--earned': badge.earned }"
                  :title="badge.description"
                >
                  <span class="badge-card-icon" aria-hidden="true">{{ badge.icon }}</span>
                  <span class="badge-card-title">{{ badge.title }}</span>
                  <span class="badge-card-status">
                    {{ badge.earned ? '✓ EARNED' : '🔒 LOCKED' }}
                  </span>
                  <span v-if="!badge.earned && badge.requiredRankId" class="rank-xp-required">
                    Requires {{ badge.requiredRank }} · {{ badge.requiredXP }} XP
                  </span>
                  <span v-if="badge.earned && badge.awardedByName" class="badge-card-by">
                    {{ badge.awardedByName }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Rank Section -->
          <div class="motivation-rewards-row motivation-rewards-row--full">
            <div class="motivation-block">
              <h2 class="motivation-block-title">
                <span class="motivation-block-icon">⚓</span>
                Rank
              </h2>
              <p class="motivation-block-hint">
                Earn XP by completing missions to advance your maritime rank
              </p>
              <ul class="badge-grid rank-grid">
                <li v-for="badge in rankBadges" :key="badge.id" 
                    class="rank-card"
                    :class="{ 
                      'rank-card--current': badge.state === 'current',
                      'rank-card--earned': badge.state === 'earned',
                      'rank-card--locked': badge.state === 'locked'
                    }">
                  <span class="badge-card-icon rank-icon">{{ badge.icon }}</span>
                  <span class="rank-title">{{ badge.name }}</span>
                  <span v-if="badge.state === 'locked'" class="rank-xp-required">{{ badge.requiredXP }} XP Required</span>
                  <span v-else-if="badge.state === 'current'" class="rank-status-badge">CURRENT RANK</span>
                  <span v-else class="rank-status-badge rank-status-earned">✓ EARNED</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Training Records tab -->
        <section v-show="hubTab === 'certificates'" class="motivation-panel" aria-label="Your training records">
          <div class="motivation-rewards-row motivation-rewards-row--full">
            <div class="motivation-block">
              <h2 class="motivation-block-title">
                <span class="motivation-block-icon">🎖️</span>
                Training Records
              </h2>
              <p class="motivation-block-hint">
                Your complete training history including missions, quizzes, and performance scores
              </p>
              
              <!-- Tab Navigation -->
              <div class="training-records-tabs">
                <button 
                  class="training-record-tab"
                  :class="{ 'active': trainingRecordsTab === 'missions' }"
                  @click="trainingRecordsTab = 'missions'"
                >
                  <span class="tab-icon">📋</span>
                  <span class="tab-text">Completed Missions</span>
                </button>
                <button 
                  class="training-record-tab"
                  :class="{ 'active': trainingRecordsTab === 'quizzes' }"
                  @click="trainingRecordsTab = 'quizzes'"
                >
                  <span class="tab-icon">📝</span>
                  <span class="tab-text">Quiz Results</span>
                </button>
              </div>
              
              <!-- Tab Content -->
              <div class="training-records-content">
                <!-- Completed Missions Tab -->
                <div v-show="trainingRecordsTab === 'missions'" class="training-record-panel">
                  <div v-if="loadingTrainingRecords" class="training-records-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading your mission records...</p>
                  </div>
                  <div v-else-if="missionRecordsError" class="training-record-empty" role="alert">
                    <p class="empty-text">{{ missionRecordsError }}</p>
                    <button class="training-record-tab" @click="fetchStudentTrainingRecords">Try again</button>
                  </div>
                  <div v-else-if="firestoreMissionScores.length" class="training-records-table-wrapper">
                    <table class="training-records-table">
                      <thead>
                        <tr>
                          <th class="table-header-mission">Mission</th>
                          <th class="table-header-score">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="score in firestoreMissionScores" :key="score.id" class="table-row">
                          <td class="table-cell-mission">
                            <div class="mission-info">
                              <span class="mission-icon">✓</span>
                              <div class="mission-details">
                                <div class="mission-title">{{ score.missionTitle || score.missionId }}</div>
                                <div class="mission-date">{{ formatCertificateDate(score.completedAt) }}</div>
                              </div>
                            </div>
                          </td>
                          <td class="table-cell-score">
                            <div class="score-badge" :class="getScoreClass(score.score)">
                              {{ score.score }}%
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="training-record-empty">
                    <div class="empty-icon">📋</div>
                    <p class="empty-text">No completed missions yet</p>
                    <p class="empty-hint">Start your training to build your record!</p>
                  </div>
                </div>
                
                <!-- Quiz Results Tab -->
                <div v-show="trainingRecordsTab === 'quizzes'" class="training-record-panel">
                  <div v-if="loadingTrainingRecords" class="training-records-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading your quiz results...</p>
                  </div>
                  <div v-else-if="quizRecordsError" class="training-record-empty" role="alert">
                    <p class="empty-text">{{ quizRecordsError }}</p>
                    <button class="training-record-tab" @click="fetchStudentTrainingRecords">Try again</button>
                  </div>
                  <div v-else-if="firestoreQuizSubmissions.length" class="training-records-table-wrapper">
                    <table class="training-records-table">
                      <thead>
                        <tr>
                          <th class="table-header-mission">Quiz</th>
                          <th class="table-header-score">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="submission in firestoreQuizSubmissions" :key="submission.id" class="table-row">
                          <td class="table-cell-mission">
                            <div class="mission-info">
                              <span class="mission-icon">📝</span>
                              <div class="mission-details">
                                <div class="mission-title">{{ submission.quizTitle || 'Quiz' }}</div>
                                <div class="mission-date">{{ formatCertificateDate(submission.submittedAt) }}</div>
                              </div>
                            </div>
                          </td>
                          <td class="table-cell-score">
                            <div class="score-badge" :class="getScoreClass(submission['Quiz-score-percentage'] ?? submission.score ?? 0)">
                              {{ submission['raw-score'] ?? submission.correctCount ?? submission.correctAnswers ?? 0 }}/{{ submission.totalQuestions ?? 0 }}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="training-record-empty">
                    <div class="empty-icon">📝</div>
                    <p class="empty-text">No quiz results yet</p>
                    <p class="empty-hint">Complete a quiz to see your results here!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div v-show="hubTab === 'missions'" class="training-grid" id="hub-missions">
          <article
            v-for="module in trainingModules.filter(m => m.id !== 'm1-mission4' || progressData.courseSettings?.isMission4Published)"
            :key="module.id"
            class="training-card"
            :class="{
              'training-card--completed': isModuleFullyComplete(module.id),
              'training-card--locked': isModuleLockedForStudent(module.id)
            }"
          >
            <div class="training-card-top">
              <div class="training-badges">
                <span class="training-level-badge">{{ displayModuleLevel(module.id) }}</span>
                <!-- Removed training-category badge -->
                <span
                  class="training-difficulty"
                  :class="trainingDifficultyClass(module.difficulty)"
                >{{ module.difficulty }}</span>
              </div>
              <span
                v-if="isModuleFullyComplete(module.id)"
                class="training-completed-badge"
              >{{ getMissionsForModule(module.id).length > 1 ? 'All missions passed' : 'Mission passed' }}</span>
              <span
                v-else-if="getModuleMissionProgress(module.id).passed > 0"
                class="training-progress-badge"
              >{{ getModuleMissionProgress(module.id).passed }}/{{ getModuleMissionProgress(module.id).total }} passed</span>
            </div>

            <h3 class="training-card-title">{{ module.title }}</h3>
            <p v-if="moduleLockMessage(module.id)" class="training-lock-notice">{{ moduleLockMessage(module.id) }}</p>
            <p class="training-card-desc">{{ module.description }}</p>

            <!-- Mission Schedule (Open Date & Deadline) -->
            <div v-if="getModuleSchedule(module.id).openDate || getModuleSchedule(module.id).deadline" class="mission-schedule">
              <div v-if="getModuleSchedule(module.id).openDate" class="mission-schedule-item">
                <span class="mission-schedule-label">📅 Opens:</span>
                <span class="mission-schedule-value">{{ formatMissionDate(getModuleSchedule(module.id).openDate) }}</span>
              </div>
              <div v-if="getModuleSchedule(module.id).deadline" class="mission-schedule-item">
                <span class="mission-schedule-label">⏰ Deadline:</span>
                <span class="mission-schedule-value">{{ formatMissionDate(getModuleSchedule(module.id).deadline) }}</span>
              </div>
              <div v-if="getMissionAvailabilityStatus(module.id).status !== 'available'" class="mission-schedule-status">
                <span :class="'mission-status-' + getMissionAvailabilityStatus(module.id).status">
                  {{ getMissionAvailabilityStatus(module.id).message }}
                </span>
              </div>
            </div>

            <div class="training-meta">
              <span class="training-duration">Est. {{ module.duration }}</span>
              <span class="training-reward">+{{ module.xpReward ?? 100 }} XP</span>
            </div>

            <!-- Mission Steps (Automatically generated from checkpoints) -->
            <div v-if="module.steps && module.steps.length > 0" class="training-mission-steps">
              <h4>Mission Steps ({{ module.steps.length }})</h4>
              <ol>
                <li v-for="(step, i) in module.steps" :key="i">{{ step.instruction }}</li>
              </ol>
            </div>

            <div class="hub-mission-list">
              <div
                v-for="mission in getMissionsForModule(module.id)"
                :key="mission.id"
                class="hub-mission-row"
                :class="[missionCardClass(mission), { 'hub-mission-row--locked': isMissionLocked(mission) }]"
              >
                <div class="hub-mission-info">
                  <span class="hub-mission-code">{{ mission.id }}</span>
                  <span class="hub-mission-name">{{ mission.title }}</span>
                  <span class="hub-mission-pass">Pass {{ mission.passScore }}%</span>
                  <span
                    v-if="getMissionResult(mission)"
                    class="hub-mission-result"
                    :class="getMissionResult(mission).passed ? 'hub-mission-result--pass' : 'hub-mission-result--fail'"
                  >
                    {{ getMissionResult(mission).score }}% {{ getMissionResult(mission).passed ? 'PASS' : 'FAIL' }}
                  </span>
                </div>
                <button
                  type="button"
                  class="hub-mission-start"
                  :disabled="isMissionLocked(mission)"
                  @click="startMissionSimulation(mission)"
                >
                  {{ missionActionLabel(mission) }}
                </button>
              </div>
            </div>

          </article>
        </div>

        <!-- Leaderboards Section -->
        <section v-show="hubTab === 'leaderboards'" class="leaderboards-section" id="hub-leaderboards">
          <!-- Leaderboard Tabs -->
          <div class="leaderboard-tabs">
            <button 
              class="leaderboard-tab" 
              :class="{ 'leaderboard-tab--active': leaderboardTab === 'myclass' }"
              @click="leaderboardTab = 'myclass'"
            >
              <span class="tab-icon">👥</span> My Class
            </button>
            <button 
              class="leaderboard-tab" 
              :class="{ 'leaderboard-tab--active': leaderboardTab === 'global' }"
              @click="leaderboardTab = 'global'"
            >
              <span class="tab-icon">🌍</span> All Students
            </button>
          </div>

          <!-- My Class Leaderboard -->
          <div v-show="leaderboardTab === 'myclass'" class="leaderboard-card glass-card">
            <h3 class="leaderboard-card-title">My Class Rankings</h3>
            <p class="leaderboard-card-subtitle">Students under {{ currentInstructorName }}</p>
            <div class="leaderboard-list">
              <div class="leaderboard-item leaderboard-header-row">
                <span class="leaderboard-rank">Rank</span>
                <span class="leaderboard-name">Student</span>
                <span class="leaderboard-stat">Rank</span>
                <span class="leaderboard-stat">Total XP</span>
              </div>
              <div class="leaderboard-item" v-for="(student, index) in myClassLeaderboard" :key="student.id" :class="{ 'leaderboard-item-current': student.id === currentUser.id }">
                <span class="leaderboard-rank">
                  <span v-if="index === 0" class="rank-medal">🥇</span>
                  <span v-else-if="index === 1" class="rank-medal">🥈</span>
                  <span v-else-if="index === 2" class="rank-medal">🥉</span>
                  <span v-else class="rank-number">{{ index + 1 }}</span>
                </span>
                <span class="leaderboard-name">
                  {{ student.name }}
                  <span v-if="student.id === currentUser.id" class="you-badge">YOU</span>
                </span>
                <span class="leaderboard-stat">{{ student.rank }}</span>
                <span class="leaderboard-stat">{{ student.xp }} XP</span>
              </div>
            </div>
          </div>

          <!-- Global Leaderboard -->
          <div v-show="leaderboardTab === 'global'" class="leaderboard-card glass-card">
            <h3 class="leaderboard-card-title">Global Rankings</h3>
            <p class="leaderboard-card-subtitle">All students across all instructors</p>
            
            <!-- Current User Global Rank Card -->
            <div v-if="currentUserGlobalRank" class="global-rank-card">
              <div class="global-rank-label">Your Global Rank</div>
              <div class="global-rank-value">#{{ currentUserGlobalRank.rank }} of {{ globalLeaderboard.length }}</div>
              <div class="global-rank-stats">
                <span>{{ currentUserGlobalRank.xp }} XP</span>
              </div>
            </div>

            <div class="leaderboard-list">
              <div class="leaderboard-item leaderboard-header-row">
                <span class="leaderboard-rank">Rank</span>
                <span class="leaderboard-name">Student</span>
                <span class="leaderboard-stat">Rank</span>
                <span class="leaderboard-stat">Total XP</span>
              </div>
              <div class="leaderboard-item" v-for="(student, index) in globalLeaderboard" :key="student.id" :class="{ 'leaderboard-item-current': student.id === currentUser.id }">
                <span class="leaderboard-rank">
                  <span v-if="index === 0" class="rank-medal">🥇</span>
                  <span v-else-if="index === 1" class="rank-medal">🥈</span>
                  <span v-else-if="index === 2" class="rank-medal">🥉</span>
                  <span v-else class="rank-number">{{ index + 1 }}</span>
                </span>
                <span class="leaderboard-name">
                  {{ student.name }}
                  <span v-if="student.id === currentUser.id" class="you-badge">YOU</span>
                </span>
                <span class="leaderboard-stat">{{ student.rank }}</span>
                <span class="leaderboard-stat">{{ student.xp }} XP</span>
              </div>
            </div>
          </div>
        </section>

        </div>
        <!-- /.missions-main -->
      </div>
      <!-- /.missions-hub (v-else) -->
    </div>
    <!-- /scene-overlay dashboard-overlay -->

    <!-- ADMIN DASHBOARD PORTAL (Optimized Component) -->
    <AdminDashboard 
      v-if="activeScreen === 'dashboard' && userRole === 'admin'"
      :current-user="currentUser"
      @logout="signOut"
    />

    <!-- ADD/EDIT USER MODALS -->
    <div v-if="showAddStudentForm || showEditStudentForm" class="admin-modal-overlay" @click.self="closeUserForms">
      <div class="admin-modal-card glass-card">
        <h2 class="admin-modal-title">{{ showEditStudentForm ? '✏️ Edit Student' : '➕ Add New Student' }}</h2>
        
        <form @submit.prevent="saveStudent" class="admin-form">
          <label class="admin-form-field">
            <span>First Name</span>
            <input v-model="currentUserForm.firstName" type="text" required />
          </label>
          <label class="admin-form-field">
            <span>Last Name</span>
            <input v-model="currentUserForm.lastName" type="text" required />
          </label>
          <label class="admin-form-field">
            <span>Email</span>
            <input v-model="currentUserForm.email" type="email" required />
          </label>
          <label v-if="!showEditStudentForm" class="admin-form-field">
            <span>Username</span>
            <input v-model="currentUserForm.username" type="text" required />
          </label>
          <label v-if="!showEditStudentForm" class="admin-form-field">
            <span>Password</span>
            <input v-model="currentUserForm.password" type="password" required />
          </label>
          <label class="admin-form-field">
            <span>Status</span>
            <select v-model="currentUserForm.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          
          <div class="admin-modal-actions">
            <button type="submit" class="admin-btn admin-btn-primary">{{ showEditStudentForm ? 'Update' : 'Add' }} Student</button>
            <button type="button" class="admin-btn admin-btn-secondary" @click="closeUserForms">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showAddInstructorForm || showEditInstructorForm" class="admin-modal-overlay" @click.self="closeUserForms">
      <div class="admin-modal-card glass-card">
        <h2 class="admin-modal-title">{{ showEditInstructorForm ? '✏️ Edit Instructor' : '➕ Add New Instructor' }}</h2>
        
        <form @submit.prevent="saveInstructor" class="admin-form">
          <label class="admin-form-field">
            <span>First Name</span>
            <input v-model="currentUserForm.firstName" type="text" required />
          </label>
          <label class="admin-form-field">
            <span>Last Name</span>
            <input v-model="currentUserForm.lastName" type="text" required />
          </label>
          <label class="admin-form-field">
            <span>Email</span>
            <input v-model="currentUserForm.email" type="email" required />
          </label>
          <label v-if="!showEditInstructorForm" class="admin-form-field">
            <span>Username</span>
            <input v-model="currentUserForm.username" type="text" required />
          </label>
          <label v-if="!showEditInstructorForm" class="admin-form-field">
            <span>Password</span>
            <input v-model="currentUserForm.password" type="password" required />
          </label>
          <label class="admin-form-field">
            <span>Department</span>
            <input v-model="currentUserForm.department" type="text" />
          </label>
          <label class="admin-form-field">
            <span>Status</span>
            <select v-model="currentUserForm.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          
          <div class="admin-modal-actions">
            <button type="submit" class="admin-btn admin-btn-primary">{{ showEditInstructorForm ? 'Update' : 'Add' }} Instructor</button>
            <button type="button" class="admin-btn admin-btn-secondary" @click="closeUserForms">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Student Quiz Taking Modal -->
    <div v-if="activeQuizSession" class="quiz-taking-overlay">
      <div class="quiz-taking-shell">
        <header class="quiz-taking-header">
          <h1>{{ activeQuizSession.quiz.title }}</h1>
          <p v-if="activeQuizSession.quiz.description">{{ activeQuizSession.quiz.description }}</p>
        </header>
        
        <div class="quiz-taking-questions">
          <div
            v-for="(question, qIdx) in activeQuizSession.quiz.questions"
            :key="qIdx"
            class="quiz-taking-question"
          >
            <h3>{{ qIdx + 1 }}. {{ question.prompt }}</h3>
            
            <!-- Multiple Choice -->
            <div v-if="question.type === 'multiple-choice'" class="quiz-answer-options">
              <label
                v-for="(option, optIdx) in question.options"
                :key="optIdx"
                class="quiz-answer-option"
              >
                <input
                  type="radio"
                  :name="'q-' + qIdx"
                  :value="option.text"
                  v-model="activeQuizSession.answers[qIdx]"
                />
                <span>{{ option.text }}</span>
              </label>
            </div>
            
            <!-- True/False -->
            <div v-if="question.type === 'true-false'" class="quiz-answer-options">
              <label class="quiz-answer-option">
                <input
                  type="radio"
                  :name="'q-' + qIdx"
                  value="True"
                  v-model="activeQuizSession.answers[qIdx]"
                />
                <span>True</span>
              </label>
              <label class="quiz-answer-option">
                <input
                  type="radio"
                  :name="'q-' + qIdx"
                  value="False"
                  v-model="activeQuizSession.answers[qIdx]"
                />
                <span>False</span>
              </label>
            </div>
            
            <!-- Fill in the Blank -->
            <div v-if="question.type === 'fill-in-the-blank'" class="quiz-answer-fib">
              <input
                type="text"
                v-model="activeQuizSession.answers[qIdx]"
                placeholder="Type your answer here..."
                class="quiz-fib-input"
              />
            </div>
          </div>
        </div>
        
        <footer class="quiz-taking-footer">
          <button
            class="quiz-submit-btn"
            :disabled="!allQuestionsAnswered"
            @click="submitQuizSession"
          >
            Submit Quiz
          </button>
          <button class="quiz-cancel-btn" @click="cancelQuizSession">Cancel</button>
        </footer>
      </div>
    </div>

    <!-- Student Quiz Results Modal -->
    <div v-if="quizResultsModal" class="quiz-results-overlay">
      <div class="quiz-results-shell">
        <h1>Quiz: {{ quizResultsModal.quizTitle }}</h1>
        
        <!-- Post-Docking Quiz: Show submission confirmation, not results -->
        <div v-if="quizResultsModal.trigger === 'post-docking'" class="quiz-submission-confirmation">
          <div class="submission-success-box">
            <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2>Quiz Submitted Successfully</h2>
            <p class="submission-message">Your answers have been submitted for instructor review.</p>
            <p class="submission-note">Your instructor will grade the quiz and provide feedback shortly.</p>
          </div>
          <footer class="quiz-results-footer">
            <button class="quiz-close-btn" @click="closeQuizResults">Close</button>
          </footer>
        </div>

        <!-- Regular Quiz: Show results with validation -->
        <div v-else>
          <div class="quiz-results-summary">
            <div class="results-score-box" :class="quizResultsModal.passed ? 'score-pass' : 'score-fail'">
              <span class="score-label">Your Score</span>
              <span class="score-value">{{ quizResultsModal.score }}%</span>
              <span class="score-status">{{ quizResultsModal.passed ? 'PASSED' : 'FAILED' }}</span>
            </div>
            
            <p v-if="quizResultsModal.feedback" class="results-feedback">
              <strong>Instructor Feedback:</strong> {{ quizResultsModal.feedback }}
            </p>
          </div>
          
          <div class="quiz-results-breakdown">
            <h3>Question Breakdown</h3>
            <div
              v-for="(question, qIdx) in quizResultsModal.questions"
              :key="qIdx"
              class="results-question"
              :class="quizResultsModal.validation[qIdx] ? 'question-correct' : 'question-incorrect'"
            >
              <h4>{{ qIdx + 1 }}. {{ question.prompt }}</h4>
              <p class="your-answer">
                <strong>Your Answer:</strong> {{ quizResultsModal.answers[qIdx] }}
                <span class="answer-icon">{{ quizResultsModal.validation[qIdx] ? '✓' : '✗' }}</span>
              </p>
              <p v-if="!quizResultsModal.validation[qIdx]" class="correct-answer-reveal">
                <strong>Correct Answer:</strong> {{ question.correctAnswer }}
              </p>
            </div>
          </div>
          
          <footer class="quiz-results-footer">
            <button class="quiz-close-btn" @click="closeQuizResults">Close</button>
          </footer>
        </div>
      </div>
    </div>

    <!-- Client-Side Error Boundary HUD -->
    <div v-if="fatalError" class="fatal-error-hud">
      <h2>⚠️ SIMULATION CRASHED</h2>
      <p>A runtime exception was caught by the error boundary:</p>
      <pre>{{ fatalError }}</pre>
      <button class="btn btn-danger" @click="clearError" style="width: auto; margin-top: 12px;">Dismiss & Retry</button>
    </div>

    <!-- Legacy HUD disabled (kept in file for now) -->
    <div class="hud-overlay" v-if="false && initComplete && activeScreen === 'simulation'">
      <!-- Top Title and Stats Bar -->
      <header class="hud-header">
        <div class="title-section">
          <h1>3D BOAT SIMULATOR</h1>
          <span class="subtitle">Modern Cabin Cruiser Edition</span>
        </div>
        <div class="quick-stats">
          <div class="stat-badge ui-priority-badge">
            <span class="stat-label">MODE</span>
            <span class="stat-value">UI FIRST</span>
          </div>
          <div class="stat-badge" :class="{ alert: stats.state === 'SINKING!' }">
            <span class="stat-label">STATUS</span>
            <span class="stat-value">{{ stats.state }}</span>
          </div>
          <div class="stat-badge">
            <span class="stat-label">CAMERA</span>
            <span class="stat-value uppercase">{{ activeCamera === 'orbit' ? 'Orbit View' : 'Helm Cam' }}</span>
          </div>
          <div class="stat-badge audio-badge" @click="toggleMusic" :class="{ active: musicPlaying }">
            <span class="stat-label">MUSIC</span>
            <span class="stat-value">
              <svg v-if="musicPlaying" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon-music-playing"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" /></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon-music-muted"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.57 17.47a.75.75 0 11-1.06-1.06 5.25 5.25 0 000-7.42.75.75 0 111.06-1.06 6.75 6.75 0 010 9.54z" /></svg>
              {{ musicPlaying ? 'ON' : 'OFF' }}
            </span>
          </div>
        </div>
      </header>

      <!-- Sidebar Configuration Panel -->
      <aside class="hud-sidebar">
        <!-- Tabs Menu -->
        <nav class="sidebar-tabs">
          <button 
            v-for="tab in ['physics', 'environment', 'options']" 
            :key="tab"
            class="tab-btn" 
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab === 'options' ? 'Settings' : tab }}
          </button>
        </nav>

        <!-- Tab Contents -->
        <div class="tab-content">
          <!-- Physics Config -->
          <div v-show="activeTab === 'physics'" class="tab-panel ui-preview-panel">
            <h3>Physics Engine Parameters</h3>
            <p class="ui-preview-note">UI preview mode: these controls are display-only right now.</p>
            
            <div class="control-group">
              <label for="thrust">Thrust Force <span class="val">{{ physics.thrustForce.toFixed(1) }}</span></label>
              <input id="thrust" type="range" min="0" max="25" step="0.5" v-model.number="physics.thrustForce" />
            </div>

            <div class="control-group">
              <label for="drag">Drag Coefficient <span class="val">{{ physics.dragCoefficient.toFixed(2) }}</span></label>
              <input id="drag" type="range" min="0" max="2" step="0.01" v-model.number="physics.dragCoefficient" />
            </div>

            <div class="control-group">
              <label for="reaction">Water Reaction <span class="val">{{ physics.waterReactionForce.toFixed(3) }}</span></label>
              <input id="reaction" type="range" min="0" max="0.1" step="0.001" v-model.number="physics.waterReactionForce" />
            </div>

            <div class="control-group">
              <label for="mass">Boat Mass <span class="val">{{ physics.mass }} kg</span></label>
              <input id="mass" type="range" min="30" max="500" step="1" v-model.number="physics.mass" />
              <div class="input-warning" v-if="physics.mass > physics.sinkingThreshold">
                ⚠️ Mass exceeds buoyancy limit ({{ physics.sinkingThreshold }} kg)
              </div>
            </div>

            <div class="control-group">
              <label for="deceleration">Deceleration <span class="val">{{ physics.decelerationRate.toFixed(3) }}</span></label>
              <input id="deceleration" type="range" min="0.9" max="1" step="0.001" v-model.number="physics.decelerationRate" />
            </div>
          </div>

          <!-- Environment Config -->
          <div v-show="activeTab === 'environment'" class="tab-panel ui-preview-panel">
            <h3>Sea & Wind Conditions</h3>
            <p class="ui-preview-note">UI preview mode: these controls are display-only right now.</p>

            <div class="control-group">
              <label for="waveAmp">Wave Amplitude <span class="val">{{ physics.waveAmplitude.toFixed(1) }}m</span></label>
              <input id="waveAmp" type="range" min="0" max="4" step="0.1" v-model.number="physics.waveAmplitude" @input="onWaterParamChange" />
            </div>

            <div class="control-group">
              <label for="waveFreq">Wave Frequency <span class="val">{{ physics.waveFrequency.toFixed(1) }} Hz</span></label>
              <input id="waveFreq" type="range" min="0" max="5" step="0.1" v-model.number="physics.waveFrequency" @input="onWaterParamChange" />
            </div>

            <div class="divider"></div>

            <div class="control-group">
              <label for="windForce">Wind Impact Factor <span class="val">{{ physics.windForce.toFixed(2) }}</span></label>
              <input id="windForce" type="range" min="0" max="0.5" step="0.01" v-model.number="physics.windForce" />
            </div>

            <div class="control-group">
              <label for="windSpeed">Wind Speed <span class="val">{{ wind.speed.toFixed(2) }} m/s</span></label>
              <input id="windSpeed" type="range" min="0" max="2" step="0.05" v-model.number="wind.speed" />
            </div>

            <div class="control-group">
              <div class="compass-label-wrapper">
                <label>Wind Heading</label>
                <span class="val">{{ wind.directionAngle }}°</span>
              </div>
              
              <!-- Interactive Compass Dial -->
              <div class="compass-container">
                <div class="compass-dial" :style="{ transform: `rotate(${-wind.directionAngle}deg)` }">
                  <div class="compass-arrow">↑</div>
                  <div class="compass-points">
                    <span class="n">N</span>
                    <span class="e">E</span>
                    <span class="s">S</span>
                    <span class="w">W</span>
                  </div>
                </div>
                <input type="range" min="0" max="360" step="5" class="compass-slider" v-model.number="wind.directionAngle" />
              </div>
            </div>
          </div>

          <!-- Simulation Panel / Controls -->
          <div v-show="activeTab === 'options'" class="tab-panel">
            <h3>Waterline Adjustment</h3>
            <p class="small description-text">Fine-tune the boat's vertical draft in the water.</p>

            <div class="control-group">
              <label for="waterlineOffset">Draft Offset <span class="val">{{ physics.waterlineOffset.toFixed(1) }}m</span></label>
              <input id="waterlineOffset" type="range" min="-8" max="8" step="0.2" v-model.number="physics.waterlineOffset" />
            </div>

            <div class="divider"></div>
            
            <h3>Simulation Options</h3>

            <div class="view-actions">
              <button class="btn btn-secondary" @click="toggleCamera" id="cameraToggleBtn">
                Switch to {{ activeCamera === 'orbit' ? 'Cockpit Cam' : 'Orbit Cam' }}
              </button>
              
              <button class="btn btn-danger" @click="resetSimulation" id="resetBtn">
                Reset Boat Simulation
              </button>
            </div>

            <div class="divider"></div>

            <div class="control-group audio-controls">
              <label>Sinking Theme Volume</label>
              <input type="range" min="0" max="1" step="0.05" v-model="soundVolume" @input="updateVolume" />
            </div>

            <div class="sound-track-info">
              <p class="small">Background track: <code>music.m4a</code> (Automatic on sinking or manual toggle)</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Bottom Speedometer & Telemetry Bar -->
      <footer class="hud-footer">
        <!-- Speedometer Section -->
        <div class="gauge-card speed-card">
          <div class="gauge-radial">
            <svg viewBox="0 0 100 100" class="gauge-svg">
              <circle cx="50" cy="50" r="45" class="gauge-track"></circle>
              <circle cx="50" cy="50" r="45" class="gauge-fill" :style="speedGaugeStyle"></circle>
            </svg>
            <div class="gauge-value">
              <span class="num">{{ speedKnotsText }}</span>
              <span class="unit">KNOTS</span>
            </div>
          </div>
          <div class="gauge-details">
            <div class="detail-row">
              <span class="label">Heading</span>
              <span class="val">{{ headingText }}°</span>
            </div>
            <div class="detail-row">
              <span class="label">Altitude Y</span>
              <span class="val">{{ stats.yPos.toFixed(2) }} m</span>
            </div>
          </div>
        </div>

        <!-- Controls Guide Card -->
        <div class="guide-card">
          <h4>MANEUVERING GUIDE</h4>
          <div class="keys-grid">
            <div class="key-item"><kbd id="keyW">W</kbd> <span>Throttle</span></div>
            <div class="key-item"><kbd id="keyS">S</kbd> <span>Reverse</span></div>
            <div class="key-item"><kbd id="keyA">A</kbd> <span>Steer Left</span></div>
            <div class="key-item"><kbd id="keyD">D</kbd> <span>Steer Right</span></div>
            <div class="key-item"><kbd id="keyH">H</kbd> <span>Drop/Raise Anchor</span></div>
            <div class="key-item"><kbd id="keyC">C</kbd> <span>Camera Toggle</span></div>
            <div class="key-item"><kbd>Double Click</kbd> <span>Fullscreen</span></div>
          </div>
        </div>
      </footer>
    </div>

    <!-- Top-center heading strip (reference-style) -->
    <div v-if="activeScreen === 'simulation' && (activeCamera !== 'helm' || simulationTouchEnabled)" v-show="!controlsGuideVisible" class="compass-hud-top">
      <div ref="compassStripViewportRef" class="compass-strip-viewport">
        <div class="compass-strip-center-tick" aria-hidden="true"></div>
        <div
          class="compass-strip-track"
          :style="{
            transform: `translateX(${compassStripTranslatePx}px)`,
            width: `${compassStripTrackWidthPx}px`
          }"
        >
          <span
            v-for="deg in compassStripMarks"
            :key="`strip-${deg}`"
            class="strip-mark"
            :class="{ major: markDisplayDeg(deg) % 90 === 0 }"
            :style="{ left: `${markCenterPx(deg)}px` }"
          >
            {{ cardinalLabel(deg) }}
            <i>{{ markDisplayDeg(deg) }}</i>
          </span>
        </div>
      </div>
      <div class="compass-strip-heading">{{ headingText }}°</div>
    </div>

    <!-- Shared layout keeps the mission card above the transparent controls. -->
    <div v-if="activeScreen === 'simulation' && (activeCamera !== 'helm' || simulationTouchEnabled)"
      v-show="!controlsGuideVisible && (!simulationTouchEnabled || (!activeMiniGame && !gearInfoPopup))"
      class="simulation-control-panel" :inert="simulationNeedsLandscape || undefined">
      <!-- Minimal mission objective box -->
      <div v-if="activeScreen === 'simulation' && (activeCamera !== 'helm' || simulationTouchEnabled)" class="mission-objective-box">
        <button class="objective-toggle" :aria-expanded="!isObjectiveCollapsed" aria-controls="simulation-objective-body" @click="isObjectiveCollapsed = !isObjectiveCollapsed">
          <span class="objective-label">{{ activeTrainingModule && isAuthenticated ? 'Training Steps' : 'Mission Objective' }}</span>
          <span class="objective-arrow" :class="{ collapsed: isObjectiveCollapsed }" aria-hidden="true"></span>
        </button>
        <div v-if="!isObjectiveCollapsed" id="simulation-objective-body" class="objective-body">
          <h4>{{ currentMissionTitle }}</h4>
          <div v-if="activeTrainingModule && isAuthenticated">
            <p v-if="isTrainingReviewMode" class="training-review-note">Practice review — your progress will not change.</p>
            <div class="training-progress-mini">
              <div class="training-progress-bar-mini">
                <div class="training-progress-fill-mini" :style="{ width: trainingProgressPercent + '%' }"></div>
              </div>
              <span class="training-step-counter-mini">
                Step {{ currentTrainingStep + 1 }} of {{ activeTrainingModule.missionSteps && activeTrainingModule.missionSteps.length > 0 ? activeTrainingModule.missionSteps.length : activeTrainingModule.steps.length }}
              </span>
              <span v-if="activeTrainingElapsedLabel" class="training-elapsed-mini">{{ activeTrainingElapsedLabel }}</span>
            </div>
            <p class="objective-text training-instruction-text clamp-2">{{ currentStepInstruction }}</p>
            <p v-if="trainingPanelHintPrimary" class="training-compass-coach clamp-2">{{ trainingPanelHintPrimary }}</p>
            <p v-if="trainingPanelHintSecondary" class="waypoint-hint clamp-2">{{ trainingPanelHintSecondary }}</p>
            
            <!-- All Mission Steps List -->
            <div v-if="activeTrainingModule.steps && activeTrainingModule.steps.length > 0" class="training-all-steps-mini" :class="{ 'steps-expanded': trainingStepsExpanded }">
              <h5 class="training-all-steps-heading">All Steps ({{ activeTrainingModule.steps.length }})</h5>
              <button type="button" class="training-all-steps-toggle" :aria-expanded="trainingStepsExpanded" aria-controls="simulation-all-steps" @click="trainingStepsExpanded = !trainingStepsExpanded">
                <span>{{ trainingStepsExpanded ? 'Hide steps' : 'View all steps' }} ({{ activeTrainingModule.steps.length }})</span>
                <span aria-hidden="true">{{ trainingStepsExpanded ? '−' : '+' }}</span>
              </button>
              <ol id="simulation-all-steps" class="training-all-steps-list">
                <li v-for="(step, i) in activeTrainingModule.steps" :key="i" 
                    :class="{ 'step-completed': i < currentTrainingStep, 'step-current': i === currentTrainingStep }">
                  {{ step.instruction }}
                </li>
              </ol>
            </div>

            <div class="training-feedback-mini" :class="{ success: trainingStepSuccess, error: trainingStepError }">
              <p>{{ trainingFeedback }}</p>
            </div>
          </div>
          <p v-else class="objective-text">{{ currentMissionObjective }}</p>
        </div>
      </div>

      <!-- Right-side navigation HUD (hidden in helm view, hidden while controls guide is open) -->
      <div v-if="activeScreen === 'simulation' && (activeCamera !== 'helm' || simulationTouchEnabled) && !controlsGuideVisible" class="nav-hud-right">
        <div class="top-gauges">
          <div class="mini-gauge">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="46" class="g-bg"></circle>
              <circle cx="60" cy="60" r="46" class="g-ring roll"></circle>
            </svg>
            <div class="mini-gauge-center">
              <span>Roll</span>
              <strong>{{ Math.round(stats.rollDeg) }}°</strong>
            </div>
          </div>
          <div class="mini-gauge">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="46" class="g-bg"></circle>
              <circle cx="60" cy="60" r="46" class="g-ring pitch"></circle>
            </svg>
            <div class="mini-gauge-center">
              <span>Pitch</span>
              <strong>{{ Math.round(stats.pitchDeg) }}°</strong>
            </div>
          </div>
        </div>

        <div class="speed-pill">{{ speedKnotsText }} Knots</div>

        <div class="compass-card" aria-label="Heading compass">
          <div
            class="compass-face"
            :style="{ transform: `translate(-50%, -50%) rotate(${-compassContinuousDeg}deg)` }"
          >
            <span class="north">N</span>
            <span class="east">E</span>
            <span class="south">S</span>
            <span class="west">W</span>
          </div>
          <div class="compass-needle" aria-hidden="true"></div>
          <div class="compass-heading-readout">{{ headingText }}°</div>
          <div class="waypoint-dot" v-if="activeWaypointCompass" :style="waypointDotStyle" :title="activeWaypointCompass.label" aria-hidden="true"></div>
        </div>
        <div v-if="activeWaypointDistanceLabel" class="waypoint-distance-readout">{{ activeWaypointDistanceLabel }}</div>

        <div class="data-pills">
          <div class="simulation-readouts">
            <div class="data-pill data-pill--readout data-pill--gps" title="Current GPS Coordinates">
              {{ gpsCoords.lat }}°N, {{ gpsCoords.lon }}°E
            </div>
            <div class="data-pill data-pill--readout" :title="`${speedMsText} meters per second`">{{ speedMsText }} m/s</div>
            <div class="data-pill data-pill--readout" :title="`Sim time ${clockText}`">{{ clockText }}</div>
          </div>
          <div class="simulation-primary-actions">
          <button
            type="button"
            class="data-pill data-pill--icon"
            :class="{ 'anchor-active': anchor.deployed || anchor.deploying || anchor.retracting }"
            :title="anchorHudTitle"
            :aria-label="anchorHudTitle"
            @click="toggleAnchor"
          >
            <svg class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 2c1.5 2.2 4.5 3.4 4.5 7.1c0 3.2-2.5 5.8-4.5 7.9-2-2.1-4.5-4.7-4.5-7.9C7.5 5.4 10.5 4.2 12 2zm0 6.2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/>
            </svg>
            <span class="simulation-action-label">Anchor</span>
          </button>
          <button
            type="button"
            class="data-pill data-pill--icon engine-btn"
            :class="{ 'engine-running': engineRunning, 'engine-starting': engineStarting }"
            :title="engineRunning ? 'Press P to stop engine' : (engineStarting ? 'Starting engine' : 'Press P to start engine')"
            :aria-label="engineRunning ? 'Stop engine' : (engineStarting ? 'Starting engine' : 'Start engine')"
            @click="startEngine"
          >
            <svg class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 2a2 2 0 0 0-2 2v1.1A6.002 6.002 0 0 0 6 11v3l-2 2v2h16v-2l-2-2v-3a6.002 6.002 0 0 0-4-5.9V4a2 2 0 0 0-2-2z"/>
            </svg>
            <span class="simulation-action-label">Engine</span>
          </button>
          <button
            type="button"
            class="data-pill data-pill--icon"
            :class="{ 'fishing-active': fishingLineActive, 'fishing-ready': fishingInZone && !fishingLineActive }"
            :title="fishingHudTitle"
            :aria-label="fishingHudTitle"
            @click="toggleFishingLine"
          >
            <svg class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M4 18c2-3 5-5 8-5s6 2 8 5H4zm6-7c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"/>
              <path fill="currentColor" d="M14 3v5l3-1.5L14 3z" opacity="0.85"/>
            </svg>
            <span class="simulation-action-label">Fish</span>
            <span v-if="fishingFishCount > 0" class="pill-badge">{{ fishingFishCount }}</span>
          </button>
          </div>
        </div>

        <div class="icon-actions">
          <button type="button" class="icon-btn" title="Switch camera (C)" aria-label="Switch camera" @click="toggleCamera">
            <svg class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M9 4 7.2 6H4c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2h-3.2L15 4H9zm3 13a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
            :class="{ 'icon-btn--off': !musicPlaying }"
            :title="musicPlaying ? 'Mute sound' : 'Unmute sound'"
            :aria-label="musicPlaying ? 'Mute sound' : 'Unmute sound'"
            @click="toggleMusic"
          >
            <svg v-if="musicPlaying" class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a3.5 3.5 0 0 0-2.45-3.35v6.68A3.5 3.5 0 0 0 16.5 12zm0-7.09v2.05a6.5 6.5 0 0 1 0 10.18v2.05a8.5 8.5 0 0 0 0-14.28z"/>
            </svg>
            <svg v-else class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M16.5 12a4.5 4.5 0 0 0-2.45-4.1v2.16l2.45 2.45V12zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
            :class="{ 'icon-btn--storm': stormMode }"
            :title="stormMode ? 'Stop rain' : 'Rainy weather'"
            :aria-label="stormMode ? 'Stop rain' : 'Rainy weather'"
            @click="toggleStormMode"
          >
            <svg v-if="!stormMode" class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M3 14h1.7c.7-2.5 3-4.3 5.8-4.3 2.3 0 4.3 1.3 5.3 3.2l1.3-.7C15.8 9.3 13.4 8 10.5 8 6.9 8 3.9 10.5 3 14zm18 0h-1.7c-.7-2.5-3-4.3-5.8-4.3-2.3 0-4.3 1.3-5.3 3.2l-1.3-.7C8.2 9.3 10.6 8 13.5 8c3.6 0 6.6 2.5 7.5 6z"/>
            </svg>
            <svg v-else class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M6 14h1.7c.7-2.5 3-4.3 5.8-4.3 1.5 0 2.9.5 4 1.3l1.3-2.3C16.4 9.1 14.5 8 12.5 8 8.9 8 5.9 10.5 5 14H3v2h3l2 3 2-6h2l2 4 2-5h3v-4z"/>
            </svg>
          </button>
          <button type="button" class="icon-btn" title="Reset simulation" aria-label="Reset simulation" @click="resetSimulation">
            <svg class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 5V2L7 7l5 5V8c2.8 0 5 2.2 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.9-4H6.1A7 7 0 0 0 12 20a7 7 0 0 0 0-14z"/>
            </svg>
          </button>
          <button type="button" class="icon-btn" title="Fullscreen" aria-label="Fullscreen" @click="toggleFullscreen">
            <svg class="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M7 7h4V5H5v6h2V7zm10 0v4h2V5h-6v2h4zM7 17v-4H5v6h6v-2H7zm10 0h-4v2h6v-6h-2v4z"/>
            </svg>
          </button>
        </div>

        <button
          class="exit-hold-btn"
          title="Hold to return to dashboard (` key)"
          @mousedown="startExitHold"
          @mouseup="cancelExitHold"
          @mouseleave="cancelExitHold"
          @touchstart.prevent="startExitHold"
          @touchend.prevent="cancelExitHold"
        >
          <span class="simulation-exit-desktop">{{ exitHoldActive ? 'HOLDING…' : 'EXIT (HOLD `)' }}</span>
          <span class="simulation-exit-mobile">{{ exitHoldActive ? 'Holding…' : 'Hold to exit' }}</span>
        </button>
      </div>
    </div>

    <!-- Circular navigation chart (top-left radar) -->
    <div
      v-if="activeScreen === 'simulation'"
      v-show="!controlsGuideVisible"
      class="tactical-minimap"
      :class="{ 'tactical-minimap--helm-screen': activeCamera === 'helm' && helmRadarReady && !simulationTouchEnabled }"
      aria-label="Navigation chart overview"
    >
      <span class="tactical-minimap-label">RADAR</span>
      <canvas ref="tacticalChartCanvas" class="tactical-minimap-canvas" aria-hidden="true"></canvas>
    </div>

    <button v-if="activeScreen === 'simulation' && simulationTouchEnabled"
      v-show="!controlsGuideVisible && !simulationNeedsLandscape && !activeMiniGame && !gearInfoPopup"
      type="button" class="simulation-guide-trigger" aria-label="Open controls guide" title="Controls guide"
      aria-haspopup="dialog" aria-controls="simulation-controls-guide" :aria-expanded="controlsGuideVisible"
      @click="toggleControlsGuide">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>

    <SimulationTouchControls v-if="activeScreen === 'simulation' && simulationTouchEnabled" v-show="!controlsGuideVisible"
      :disabled="simulationNeedsLandscape || exitConfirmVisible || exitFinalConfirmVisible || !!gearInfoPopup || showPostDockingQuiz || showQuizResults || controlsGuideVisible"
      @press="pressSimulationTouchKey" @release="releaseSimulationTouchKey" @interact="interactSimulationTouch" />

    <!-- Navigation Map removed -->

    <!-- Helm — commercial bridge (forward bow + dual MFD + wheel) - MFD DISPLAYS HIDDEN -->
    <div
      v-if="activeScreen === 'simulation' && activeCamera === 'helm'"
      class="helm-bridge-frame helm-bridge-commercial"
    >
      <div class="helm-windshield-glass" aria-hidden="true"></div>

      <!-- Helm MFD displays removed per user request -->

      <div class="helm-weather-actions">
        <div class="helm-gps-pill">
          {{ gpsCoords.lat }}°N · {{ gpsCoords.lon }}°E
        </div>
        <button
          type="button"
          class="helm-weather-btn"
          :class="{ 'helm-weather-btn--active': stormMode }"
          @click="toggleStormMode"
        >
          {{ stormMode ? 'Stop rain' : 'Rain' }}
        </button>
      </div>
      <p class="helm-bridge-hint">C — camera · R — rain · WASD — helm · mouse — look</p>
    </div>

    <!-- Take Quiz Button - CENTER OVERLAY (appears when anchor deployed AND engine OFF) -->
    <transition name="fade">
      <div v-if="anchor.deployed && activeTrainingModule && !isTrainingReviewMode && !missionReadyToReport && !activeMissionQuizSubmission && !showPostDockingQuiz && !engineRunning" class="report-mission-overlay">
        <div class="report-mission-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.15)); border-color: rgba(59, 130, 246, 0.6);">
          <div class="report-icon">📝</div>
          <h2 style="color: #3b82f6;">Mission Complete!</h2>
          <p style="color: #bfdbfe;">{{ missionQuizLoading ? 'Checking your saved quiz result…' : missionQuizLoadError || 'Time to test your knowledge.' }}</p>
          <button
            class="report-mission-btn-large"
            style="background: linear-gradient(135deg, #3b82f6, #2563eb);"
            @click="handleTakeQuizClick"
            :disabled="missionQuizLoading"
          >
            {{ missionQuizLoading ? 'Checking…' : missionQuizLoadError ? 'Retry Quiz Check' : '📝 Take Quiz' }}
          </button>
        </div>
      </div>
    </transition>
    
    <!-- Engine Still Running Warning - CENTER OVERLAY -->
    <transition name="fade">
      <div v-if="anchor.deployed && activeTrainingModule && !showPostDockingQuiz && engineRunning && isBoatInPortZone" class="report-mission-overlay">
        <div class="report-mission-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15)); border-color: rgba(239, 68, 68, 0.6);">
          <div class="report-icon">⚠️</div>
          <h2 style="color: #ef4444;">Engine Still Running</h2>
          <p style="color: #fca5a5;">Stop the engine to continue.</p>
        </div>
      </div>
    </transition>
    
    <!-- Report Mission Button - CENTER OVERLAY (appears when mission is ready to report) -->
    <transition name="fade">
      <div v-if="missionReadyToReport && anchor.deployed && !showPostDockingQuiz && !engineRunning && !missionCompleteModal" class="report-mission-overlay">
        <div class="report-mission-card">
          <div class="report-icon">📝</div>
          <h2>{{ isTrainingReviewMode ? 'Mission Report' : 'Mission Complete!' }}</h2>
          <p>{{ isTrainingReviewMode ? 'Your saved mission result is ready to view.' : 'Ready to submit your mission report.' }}</p>
          <button
            class="report-mission-btn-large"
            @click="reportMissionCompletion"
          >
            📝 Report Mission Completion
          </button>
        </div>
      </div>
    </transition>

    <!-- Sinking Crash Alarm Overlay -->
    <transition name="fade">
      <div class="sinking-overlay" v-if="stats.state === 'SINKING!' && activeScreen === 'simulation'">
        <div class="alarm-box">
          <div class="siren-light"></div>
          <h2>WARNING: HULL INTEGRITY CRITICAL</h2>
          <p>The boat is taking on water due to excessive cargo mass.</p>
          <button class="btn btn-danger" @click="resetSimulation">Emergency Reset</button>
        </div>
      </div>
    </transition>

    <!-- Mission result popup -->
    <transition name="fade">
      <div
        v-if="missionCompleteModal"
        class="mission-complete-overlay"
        role="dialog"
        aria-labelledby="mission-complete-title"
        aria-modal="true"
      >
        <div
          class="mission-complete-modal"
          :class="missionCompleteModal.passed ? 'mission-complete-modal--pass' : 'mission-complete-modal--fail'"
        >
          <div
            class="mission-result-hero"
            :class="missionCompleteModal.passed ? 'mission-result-hero--pass' : 'mission-result-hero--fail'"
          >
            <span class="mission-result-status">{{ missionCompleteModal.passed ? 'PASS' : 'FAIL' }}</span>
            <strong class="mission-result-score">{{ missionCompleteModal.score }}%</strong>
            <span class="mission-result-target">Pass score: {{ missionCompleteModal.passScore }}%</span>
          </div>

          <p class="mission-complete-eyebrow">Mission result</p>
          <h2 id="mission-complete-title">{{ missionCompleteModal.title }}</h2>
          <p class="mission-complete-code">{{ missionCompleteModal.id }}</p>

          <ul class="mission-result-breakdown">
            <li v-if="missionCompleteModal.elapsedLabel">
              <span>Time</span>
              <strong>{{ missionCompleteModal.elapsedLabel }}</strong>
            </li>
            <li v-if="missionCompleteModal.maxSpeedLabel">
              <span>Top speed</span>
              <strong>{{ missionCompleteModal.maxSpeedLabel }}</strong>
            </li>
            <li v-if="missionCompleteModal.stepsLabel">
              <span>Steps completed</span>
              <strong>{{ missionCompleteModal.stepsLabel }}</strong>
            </li>
            <li v-if="missionCompleteModal.waypointsLabel">
              <span>Waypoints reached</span>
              <strong>{{ missionCompleteModal.waypointsLabel }}</strong>
            </li>
            <li v-if="missionCompleteModal.xpEarned">
              <span>XP earned</span>
              <strong>+{{ missionCompleteModal.xpEarned }} ({{ missionCompleteModal.totalXp }} total)</strong>
            </li>
            <li v-if="missionCompleteModal.quizScore !== undefined">
              <span>Quiz score</span>
              <strong>{{ missionCompleteModal.quizCorrect }}/{{ missionCompleteModal.quizTotal }}</strong>
            </li>
          </ul>

          <!-- Enhanced Performance Breakdown - 5-METRIC SYSTEM -->
          <p class="mission-complete-hint">
            {{ missionCompleteModal.isSavedReport
              ? 'Saved mission result. Practice runs do not change your score.'
              : missionCompleteModal.passed
              ? 'Great work. Your score is saved. Your instructor may award badges or certificates after review.'
              : 'You finished the run but did not meet the pass score. Retry the mission to improve your result.' }}
          </p>
          <div class="mission-complete-actions">
            <button type="button" class="mission-complete-btn" @click="dismissMissionCompleteModal">
              {{ missionCompleteModal.passed ? 'Back to missions' : 'Retry later' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Instructor student review -->
    <transition name="fade">
      <div
        v-if="instructorReviewModal"
        class="instructor-review-overlay"
        role="dialog"
        aria-labelledby="instructor-review-title"
        aria-modal="true"
        @click.self="dismissInstructorReview"
      >
        <div class="instructor-review-modal">
          <header class="instructor-review-header">
            <div>
              <p class="instructor-review-eyebrow">Student review</p>
              <h2 id="instructor-review-title">{{ instructorReviewModal.student.name }}</h2>
            </div>
            <button type="button" class="instructor-review-close" @click="dismissInstructorReview" aria-label="Close">
              ×
            </button>
          </header>

          <section class="instructor-review-sessions">
            <h3>Mission records</h3>
            <p class="instructor-review-note">Each student's latest mission score is saved on their dashboard.</p>
            <p v-if="!instructorReviewModal.sessions.length" class="instructor-review-empty">
              No mission attempts recorded yet.
            </p>
            <ul v-else class="instructor-review-session-list">
              <li
                v-for="session in instructorReviewModal.sessions"
                :key="session.id"
                class="instructor-review-session-item"
              >
                <div class="instructor-review-session-content">
                  <div class="instructor-review-session-main">
                    <strong>{{ session.mission }}</strong>
                    <span class="instructor-review-session-code">{{ session.missionId }}</span>
                  </div>
                  <div class="instructor-review-session-meta">
                    <span>{{ formatSessionDate(session.completedAt) }}</span>
                    <span
                      class="instructor-review-session-score"
                      :class="session.passed ? 'instructor-recent-score--pass' : 'instructor-recent-score--fail'"
                    >
                      {{ session.score }}% · {{ session.passed ? 'PASS' : 'FAIL' }}
                      (need {{ session.passScore }}%)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  class="instructor-reset-mission-btn"
                  @click="confirmResetStudentMission(instructorReviewModal.student, session)"
                >
                  Reset task
                </button>
              </li>
            </ul>
          </section>

          <!-- Performance Reports (per mission session) -->
          <section class="instructor-review-performance">
            <h3>📊 Performance Reports</h3>
            <p class="instructor-review-note">
              Detailed metrics captured during each mission — navigation accuracy, steering, docking, fishing, time, and mistakes.
            </p>
            <p v-if="!performanceReports.length" class="instructor-review-empty">
              No performance data yet.
            </p>
            <ul v-else class="performance-report-list">
              <li v-for="rpt in performanceReports" :key="rpt.id" class="performance-report-card" :class="rpt.passed ? 'performance-report-card--pass' : 'performance-report-card--fail'">
                <div class="performance-report-header">
                  <div>
                    <strong class="performance-report-mission">{{ rpt.missionTitle }}</strong>
                    <span class="performance-report-date">{{ formatSessionDate(rpt.completedAt) }}</span>
                  </div>
                  <div class="performance-report-total">
                    <span class="performance-report-total-score">{{ rpt.totalScore }}%</span>
                    <span class="performance-report-total-status">{{ rpt.passed ? 'PASSED' : 'FAILED' }}</span>
                  </div>
                </div>

                <div class="performance-metrics-grid">
                  <article class="performance-metric-tile">
                    <span class="performance-metric-label">🧭 Navigation Accuracy</span>
                    <strong class="performance-metric-value" :class="metricColorClass(rpt.navigationAccuracy)">{{ rpt.navigationAccuracy }}%</strong>
                  </article>
                  <article class="performance-metric-tile">
                    <span class="performance-metric-label">🎯 Steering Accuracy</span>
                    <strong class="performance-metric-value" :class="metricColorClass(rpt.steeringAccuracy)">{{ rpt.steeringAccuracy }}%</strong>
                  </article>
                  <article class="performance-metric-tile">
                    <span class="performance-metric-label">⚓ Docking Score</span>
                    <strong class="performance-metric-value" :class="metricColorClass(rpt.dockingScore)">
                      {{ rpt.dockingScore >= 0 ? rpt.dockingScore + '%' : 'N/A' }}
                    </strong>
                  </article>
                  <article class="performance-metric-tile">
                    <span class="performance-metric-label">🎣 Fishing Score</span>
                    <strong class="performance-metric-value" :class="metricColorClass(rpt.fishingScore)">
                      {{ rpt.fishingScore >= 0 ? rpt.fishingScore + '%' : 'N/A' }}
                    </strong>
                  </article>
                  <article class="performance-metric-tile">
                    <span class="performance-metric-label">⏱️ Completion Time</span>
                    <strong class="performance-metric-value">{{ rpt.completionTime }}</strong>
                  </article>
                  <article class="performance-metric-tile">
                    <span class="performance-metric-label">⚠️ Mistakes</span>
                    <strong class="performance-metric-value" :class="rpt.mistakes === 0 ? 'metric-color--pass' : (rpt.mistakes <= 2 ? 'metric-color--warn' : 'metric-color--fail')">
                      {{ rpt.mistakes }}
                    </strong>
                  </article>
                </div>

                <div class="performance-remarks">
                  <span class="performance-remarks-label">📝 Remarks:</span>
                  <span class="performance-remarks-text">{{ rpt.remarks }}</span>
                </div>
              </li>
            </ul>
          </section>

          <!-- Quiz Attempts (per mission) -->
          <section class="instructor-review-quizzes">
            <h3>📝 Quiz Attempts</h3>
            <p class="instructor-review-note">
              Review the student's answers per mission quiz. Each question shows what they submitted and the correct answer.
            </p>
            <p v-if="!instructorReviewModal.quizSubmissions.length" class="instructor-review-empty">
              No quiz submissions yet.
            </p>
            <ul v-else class="quiz-attempt-list">
              <li
                v-for="attempt in instructorReviewModal.quizSubmissions"
                :key="attempt.id"
                class="quiz-attempt-card"
                :class="{ 'quiz-attempt-card--pass': attempt.passed, 'quiz-attempt-card--fail': !attempt.passed }"
              >
                <div class="quiz-attempt-header">
                  <div class="quiz-attempt-title-wrap">
                    <strong class="quiz-attempt-mission">{{ attempt.missionTitle }}</strong>
                    <span class="quiz-attempt-quiz-name">{{ attempt.quizTitle }}</span>
                    <span class="quiz-attempt-date">{{ formatSessionDate(attempt.submittedAt) }}</span>
                  </div>
                  <div class="quiz-attempt-score-wrap">
                    <span class="quiz-attempt-score">{{ attempt.score }}%</span>
                    <span class="quiz-attempt-status">{{ attempt.passed ? 'PASSED' : 'FAILED' }}</span>
                    <span class="quiz-attempt-count">{{ attempt.correctCount }}/{{ attempt.totalQuestions }} correct</span>
                  </div>
                </div>

                <ol v-if="attempt.questions.length" class="quiz-attempt-questions">
                  <li
                    v-for="q in attempt.questions"
                    :key="q.id"
                    class="quiz-attempt-question"
                    :class="{ 'quiz-attempt-question--correct': q.isCorrect, 'quiz-attempt-question--wrong': !q.isCorrect }"
                  >
                    <div class="quiz-attempt-question-prompt">
                      <span class="quiz-attempt-icon">{{ q.isCorrect ? '✅' : '❌' }}</span>
                      <span>{{ q.prompt }}</span>
                    </div>
                    <div class="quiz-attempt-answers">
                      <div class="quiz-attempt-answer-row">
                        <span class="quiz-attempt-answer-label">Student:</span>
                        <span class="quiz-attempt-answer-value" :class="{ 'quiz-attempt-wrong-value': !q.isCorrect }">
                          {{ q.studentAnswer || '(no answer)' }}
                        </span>
                      </div>
                      <div v-if="!q.isCorrect" class="quiz-attempt-answer-row">
                        <span class="quiz-attempt-answer-label">Correct:</span>
                        <span class="quiz-attempt-answer-value quiz-attempt-correct-value">
                          {{ q.correctAnswer || '(not set)' }}
                        </span>
                      </div>
                    </div>
                  </li>
                </ol>
              </li>
            </ul>
          </section>

          <section class="instructor-awards-panel">
            <h3>Award badges &amp; certificates</h3>
            <p class="instructor-review-note">
              Review mission scores above, then award recognition. Green items meet typical requirements.
            </p>

            <h4 class="instructor-awards-subtitle">Badges</h4>
            <ul class="instructor-award-list">
              <li
                v-for="badge in instructorReviewAwards.badges"
                :key="badge.id"
                class="instructor-award-item"
                :class="{
                  'instructor-award-item--earned': badge.earned,
                  'instructor-award-item--eligible': badge.eligible && !badge.earned
                }"
              >
                <span class="instructor-award-icon" aria-hidden="true">{{ badge.icon }}</span>
                <div class="instructor-award-info">
                  <strong>{{ badge.title }}</strong>
                  <span class="instructor-award-desc">{{ badge.description }}</span>
                  <span class="instructor-award-eligibility">
                    {{
                      badge.earned
                        ? `Awarded ${formatCertificateDate(badge.earnedAt)}${badge.awardedByName ? ' · ' + badge.awardedByName : ''}`
                        : badge.eligibilityReason
                    }}
                  </span>
                </div>
                <button
                  v-if="!badge.earned && !badge.requiredRankId"
                  type="button"
                  class="instructor-award-btn"
                  :disabled="!badge.eligible"
                  @click="instructorGrantBadge(badge.id)"
                >
                  Award
                </button>
                <button
                  v-else-if="badge.earned && !badge.requiredRankId"
                  type="button"
                  class="instructor-revoke-btn"
                  @click="instructorRevokeBadgeGrant(badge.id)"
                >
                  Revoke
                </button>
              </li>
            </ul>

            <h4 class="instructor-awards-subtitle">Certificates</h4>
            <ul class="instructor-award-list">
              <li
                v-for="cert in instructorReviewAwards.certificates"
                :key="cert.id"
                class="instructor-award-item"
                :class="{
                  'instructor-award-item--earned': cert.earned,
                  'instructor-award-item--eligible': cert.eligible && !cert.earned
                }"
              >
                <span class="instructor-award-icon" aria-hidden="true">📜</span>
                <div class="instructor-award-info">
                  <strong>{{ cert.title }}</strong>
                  <span class="instructor-award-desc">Module completion certificate</span>
                  <span class="instructor-award-eligibility">
                    {{
                      cert.earned
                        ? `Issued ${formatCertificateDate(cert.earnedAt)}${cert.awardedByName ? ' · ' + cert.awardedByName : ''}`
                        : cert.eligibilityReason + (cert.eligible ? ` Best score: ${cert.score}%.` : '')
                    }}
                  </span>
                </div>
                <button
                  v-if="!cert.earned"
                  type="button"
                  class="instructor-award-btn instructor-award-btn--gold"
                  :disabled="!cert.eligible"
                  @click="instructorGrantCertificate(cert)"
                >
                  Issue
                </button>
                <button
                  v-else
                  type="button"
                  class="instructor-revoke-btn"
                  @click="instructorRevokeCertificateGrant(cert.id)"
                >
                  Revoke
                </button>
              </li>
            </ul>
          </section>

          <div class="instructor-review-footer">
            <button
              type="button"
              class="instructor-reset-progress-btn"
              @click="confirmResetStudentProgress(instructorReviewModal.student)"
            >
              Reset all progress
            </button>
            <button type="button" class="instructor-review-done-btn" @click="dismissInstructorReview">
              Close
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Certificate viewer -->
    <transition name="fade">
      <div
        v-if="certificateModal"
        class="certificate-overlay"
        role="dialog"
        aria-labelledby="certificate-modal-title"
        aria-modal="true"
        @click.self="dismissCertificateModal"
      >
        <div class="certificate-document" id="helmquest-certificate-print">
          <div class="certificate-document-border">
            <p class="certificate-doc-eyebrow">HelmQuest · Maritime Training</p>
            <h2 id="certificate-modal-title">Certificate of Completion</h2>
            <p class="certificate-doc-presented">This certifies that</p>
            <p class="certificate-doc-name">{{ certificateModal.studentName || currentUser.name }}</p>
            <p class="certificate-doc-body">
              has successfully completed all required missions in
              <strong>{{ certificateModal.title }}</strong>
              with a best score of <strong>{{ certificateModal.score }}%</strong>.
            </p>
            <p v-if="certificateModal.awardedByName" class="certificate-doc-issuer">
              Issued by {{ certificateModal.awardedByName }}
            </p>
            <p class="certificate-doc-date">{{ formatCertificateDate(certificateModal.earnedAt) }}</p>
            <p class="certificate-doc-id">{{ certificateModal.id }}</p>
          </div>
          <div class="certificate-document-actions">
            <button type="button" class="mission-complete-btn" @click="printCertificate">Print / Save PDF</button>
            <button type="button" class="certificate-close-btn" @click="dismissCertificateModal">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Student Detail Modal -->
    <transition name="fade">
      <div v-if="showStudentDetailModal && selectedStudentDetail" class="instructor-review-overlay student-record-overlay" role="dialog" aria-modal="true" aria-labelledby="student-detail-title" @click.self="closeStudentDetail">
        <div class="student-detail-modal student-management-detail">
          <header class="student-detail-header">
            <div><p class="instructor-review-eyebrow">Training records</p><h2 id="student-detail-title" class="student-detail-title">{{ selectedStudentDetail.name }}</h2></div>
            <button type="button" class="instructor-review-close" aria-label="Close student records" @click="closeStudentDetail">×</button>
          </header>
          <p v-if="studentDetailLoading" class="overview-empty" role="status">Loading the latest student records...</p>
          <div v-else-if="studentDetailError" class="overview-error" role="alert"><p>{{ studentDetailError }}</p><button type="button" class="overview-action" @click="loadStudentDetailData(selectedStudentDetail.id)">Try again</button></div>
          <template v-else>
            <div class="student-detail-profile student-record-profile">
              <div class="student-detail-profile-info"><p class="student-detail-id">{{ selectedStudentDetail.studentId || 'No student ID' }}</p><p class="student-record-email">{{ selectedStudentDetail.email }}</p><span class="student-status-badge" :class="'student-status-badge--' + selectedStudentDetail.status">{{ selectedStudentDetail.status }}</span></div>
              <div class="student-record-rank"><strong>{{ selectedStudentDetail.rank }}</strong><span>{{ selectedStudentDetail.xp }} XP</span><span v-if="selectedStudentDetail.nextRank">Next: {{ selectedStudentDetail.nextRank }} · {{ selectedStudentDetail.xpNextAt }} XP</span><span v-else>Highest rank reached</span></div>
            </div>
            <div class="student-detail-summary-cards">
              <div class="student-summary-card"><span class="student-summary-label">Missions passed</span><strong class="student-summary-value">{{ selectedStudentDetail.missionsCompleted }}/{{ selectedStudentDetail.missionsTotal }}</strong></div>
              <div class="student-summary-card"><span class="student-summary-label">Quizzes taken</span><strong class="student-summary-value">{{ selectedStudentDetail.quizzesCompleted }}/{{ selectedStudentDetail.quizzesTotal }}</strong></div>
              <div class="student-summary-card"><span class="student-summary-label">Badges earned</span><strong class="student-summary-value">{{ selectedStudentDetail.badgesEarned }}</strong></div>
              <div class="student-summary-card"><span class="student-summary-label">Certificates</span><strong class="student-summary-value">{{ selectedStudentDetail.certificates }}</strong></div>
            </div>
            <div class="student-detail-tabs" aria-label="Student record sections"><button v-for="tab in ['overview', 'missions', 'quizzes']" :key="tab" type="button" class="student-detail-tab" :class="{ 'student-detail-tab--active': studentDetailTab === tab }" @click="studentDetailTab = tab">{{ tab }}</button></div>
            <div class="student-detail-content">
              <div v-if="studentDetailTab === 'overview'" class="student-record-overview">
                <div><span>Average mission score</span><strong>{{ selectedStudentDetail.missionScore !== null ? selectedStudentDetail.missionScore + '%' : '—' }}</strong></div>
                <div><span>Average quiz score</span><strong>{{ selectedStudentDetail.quizScore !== null ? selectedStudentDetail.quizScore + '%' : '—' }}</strong></div>
                <div><span>Last training activity</span><strong>{{ selectedStudentDetail.latestActivity ? formatSessionDate(selectedStudentDetail.latestActivity) : 'No training activity yet' }}</strong></div>
                <p class="student-management-note">Averages use one saved result per mission or quiz. Passed missions are retained; quiz retries use the latest submission.</p>
              </div>
              <div v-else-if="studentDetailTab === 'missions'" class="student-missions-table-wrap">
                <p v-if="!selectedStudentDetail.missionsDetail.length" class="overview-empty">No missions assigned yet.</p>
                <table v-else class="student-missions-table"><thead><tr><th>Mission</th><th>Score</th><th>Result</th><th>Saved</th></tr></thead><tbody><tr v-for="mission in selectedStudentDetail.missionsDetail" :key="mission.missionId"><td><strong>{{ mission.title }}</strong></td><td>{{ mission.score !== null ? mission.score + '%' : '—' }}</td><td><span class="student-record-result" :class="{ 'student-record-result--passed': mission.status === 'Passed', 'student-record-result--failed': mission.status === 'Failed' }">{{ mission.status }}</span></td><td>{{ mission.completedAt ? formatSessionDate(mission.completedAt) : '—' }}</td></tr></tbody></table>
              </div>
              <div v-else class="student-missions-table-wrap">
                <p v-if="!selectedStudentDetail.quizzesDetail.length" class="overview-empty">No quizzes assigned yet.</p>
                <table v-else class="student-missions-table"><thead><tr><th>Quiz</th><th>Score</th><th>Correct</th><th>Result</th><th>Saved</th></tr></thead><tbody><tr v-for="quiz in selectedStudentDetail.quizzesDetail" :key="quiz.quizId"><td><strong>{{ quiz.title }}</strong></td><td>{{ quiz.score !== null ? quiz.score + '%' : '—' }}</td><td>{{ quiz.correctCount !== null && quiz.totalQuestions !== null ? quiz.correctCount + '/' + quiz.totalQuestions : '—' }}</td><td><span class="student-record-result" :class="{ 'student-record-result--passed': quiz.status === 'Passed', 'student-record-result--failed': quiz.status === 'Failed' }">{{ quiz.status }}</span></td><td>{{ quiz.submittedAt ? formatSessionDate(quiz.submittedAt) : '—' }}</td></tr></tbody></table>
              </div>
            </div>
          </template>
        </div>
      </div>
    </transition>
    <!-- Gamification popup -->
    <transition name="fade">
      <div class="achievement-popup" v-if="achievementPopup">
        <h4>Achievement Unlocked</h4>
        <p>{{ achievementPopup }}</p>
      </div>
    </transition>

    <!-- Training complete notification -->
    <transition name="fade">
      <div
        v-if="trainingNotification"
        class="training-complete-toast"
        :class="`training-complete-toast--${trainingNotification.variant}`"
        role="status"
        aria-live="polite"
      >
        <span class="training-complete-toast-icon" aria-hidden="true">{{ trainingNotification.variant === 'review' ? '✓' : '🎉' }}</span>
        <div class="training-complete-toast-body">
          <h4>{{ trainingNotification.title }}</h4>
          <p>{{ trainingNotification.message }}</p>
        </div>
      </div>
    </transition>

    <!-- Anchor warning -->
    <transition name="fade">
      <div class="anchor-warning" v-if="anchorWarning">
        <p>Please retract the anchor (H) before moving</p>
      </div>
    </transition>

    <!-- Interaction prompt -->
    <transition name="fade">
      <div
        v-if="currentInteractionPrompt && activeScreen === 'simulation'"
        class="weather-notice-toast"
        role="status"
        aria-live="polite"
      >
        <span class="weather-notice-icon" aria-hidden="true">💡</span>
        <p>{{ currentInteractionPrompt }}</p>
      </div>
    </transition>

    <!-- Mini-game: Photograph -->
    <transition name="fade">
      <div v-if="activeMiniGame === 'photograph'" class="minigame-overlay minigame-camera">
        <div class="camera-crosshair"></div>
        <div class="camera-corner top-left"></div>
        <div class="camera-corner top-right"></div>
        <div class="camera-corner bottom-left"></div>
        <div class="camera-corner bottom-right"></div>
        <div class="camera-instructions">Center the gear and press [Q] to capture</div>
        <div class="camera-feedback" v-if="miniGameFeedback">{{ miniGameFeedback }}</div>
      </div>
    </transition>

    <!-- Mini-game: Verify ID -->
    <transition name="fade">
      <div v-if="activeMiniGame === 'verify_id'" class="minigame-overlay minigame-dialog">
        <div class="dialog-box">
          <h3>Verify Buoy ID</h3>
          <p>Look at the ID label on the buoy and enter the number below:</p>
          <input type="text" v-model="miniGameInput" placeholder="Enter ID" @keyup.enter="submitMiniGameId" ref="miniGameInputRef" class="minigame-input" />
          <div class="camera-feedback" style="color: #ef4444; margin-top: 8px;" v-if="miniGameFeedback">{{ miniGameFeedback }}</div>
          <div class="dialog-actions" style="margin-top: 16px;">
            <button @click="submitMiniGameId" class="mission-complete-btn">Submit</button>
            <button @click="cancelMiniGame" class="certificate-close-btn">Cancel</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Mini-game: Remove Debris -->
    <transition name="fade">
      <div v-if="activeMiniGame === 'remove_debris'" class="minigame-overlay minigame-mashing">
        <div class="mashing-container">
          <h3>Removing Debris</h3>
          <p>Mash [Q] rapidly to clear the chain!</p>
          <div class="mashing-bar-bg">
            <div class="mashing-bar-fill" :style="{ width: miniGameProgress + '%' }"></div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Gear Quiz -->
    <transition name="fade">
      <div v-if="activeMiniGame === 'gear_quiz'" class="minigame-overlay minigame-dialog">
        <div class="dialog-box gear-quiz-box">
          <template v-if="gearQuizState === 'questions'">
            <div class="quiz-header-icon">🎓</div>
            <h3>Fishing Gear Knowledge Check</h3>
            <p class="report-subtitle">Identify each gear type to complete your inspection.</p>

            <div class="quiz-progress-bar-container">
              <div class="quiz-progress-bar">
                <div class="quiz-progress-fill" :style="{ width: ((gearQuizCurrentQuestion) / gearQuizQuestions.length * 100) + '%' }"></div>
              </div>
              <span class="quiz-progress-text">Question {{ gearQuizCurrentQuestion + 1 }} of {{ gearQuizQuestions.length }}</span>
            </div>
            
            <div class="quiz-question-card">
              <p class="quiz-question">{{ gearQuizQuestions[gearQuizCurrentQuestion].text }}</p>
            </div>
            
            <div class="quiz-options">
              <button 
                v-for="(option, idx) in gearQuizQuestions[gearQuizCurrentQuestion].options" 
                :key="idx"
                @click="selectGearQuizOption(idx)"
                class="quiz-option-btn"
                :class="{ 
                  'selected': gearQuizSelectedOption === idx,
                  'correct': gearQuizAnswerRevealed && idx === gearQuizQuestions[gearQuizCurrentQuestion].correctIdx,
                  'incorrect': gearQuizAnswerRevealed && gearQuizSelectedOption === idx && idx !== gearQuizQuestions[gearQuizCurrentQuestion].correctIdx
                }"
                :disabled="gearQuizAnswerRevealed"
              >
                <span class="quiz-option-letter">{{ ['A','B','C','D'][idx] }}</span>
                <span class="quiz-option-text">{{ option }}</span>
                <span v-if="gearQuizAnswerRevealed && idx === gearQuizQuestions[gearQuizCurrentQuestion].correctIdx" class="quiz-option-icon">✓</span>
                <span v-if="gearQuizAnswerRevealed && gearQuizSelectedOption === idx && idx !== gearQuizQuestions[gearQuizCurrentQuestion].correctIdx" class="quiz-option-icon">✗</span>
              </button>
            </div>

            <div class="quiz-feedback-box" :class="{ 'quiz-feedback-correct': gearQuizFeedbackIsCorrect, 'quiz-feedback-wrong': !gearQuizFeedbackIsCorrect }" v-if="miniGameFeedback">
              <span class="quiz-feedback-icon">{{ gearQuizFeedbackIsCorrect ? '🎉' : '💡' }}</span>
              <span>{{ miniGameFeedback }}</span>
            </div>
            
            <div class="dialog-actions" style="margin-top: 16px; min-height: 48px;">
              <button v-if="gearQuizAnswerRevealed" @click="nextGearQuizQuestion" class="quiz-next-btn">{{ gearQuizCurrentQuestion < gearQuizQuestions.length - 1 ? 'Next Question →' : '📋 View Report' }}</button>
            </div>
          </template>
          <template v-else>
            <div class="report-header-icon">📋</div>
            <h3>Fishing Gear Inspection Report</h3>
            <p class="report-subtitle">Review your identification results before submitting.</p>

            <div class="report-badge" :class="gearQuizResults.filter(Boolean).length === gearQuizQuestions.length ? 'report-badge-pass' : 'report-badge-fail'">
              {{ gearQuizResults.filter(Boolean).length === gearQuizQuestions.length ? '✓ ALL INSPECTIONS PASSED' : '✗ ASSESSMENT INCOMPLETE' }}
            </div>

            <div class="report-summary">
              <div class="report-item" v-for="(q, idx) in gearQuizQuestions" :key="'rep'+idx">
                <div class="report-item-left">
                  <span class="report-item-icon">{{ gearQuizResults[idx] ? '✅' : '❌' }}</span>
                  <strong>{{ q.gearType }}</strong>
                </div>
                <span class="report-item-status" :class="{'text-success': gearQuizResults[idx], 'text-error': !gearQuizResults[idx]}">
                  {{ gearQuizResults[idx] ? 'Verified' : 'Needs Review' }}
                </span>
              </div>
            </div>

            <div class="report-score-bar">
              <span class="report-score-label">Assessment Score</span>
              <span class="report-score-value" :class="gearQuizResults.filter(Boolean).length === gearQuizQuestions.length ? 'text-success' : 'text-error'">
                {{ gearQuizResults.filter(Boolean).length }} / {{ gearQuizQuestions.length }}
              </span>
            </div>

            <div v-if="gearQuizResults.filter(Boolean).length < gearQuizQuestions.length" class="report-fail-notice">
              ⚠️ You must correctly identify all gear types to submit your report. Contact your instructor for permission to retake the assessment.
            </div>

            <div class="dialog-actions" style="margin-top: 20px;">
               <button v-if="gearQuizResults.filter(Boolean).length === gearQuizQuestions.length" @click="finishGearQuizAndSubmit" class="report-submit-btn">📤 Submit Inspection Report</button>
               <button v-else-if="isGearQuizRetakeAllowed" @click="startGearQuiz(null)" class="report-retake-btn">🔄 Retake Assessment</button>
               <button v-else @click="submitFailedGearQuiz" class="report-submit-btn report-submit-btn-fail">📤 Submit Incomplete Assessment</button>
            </div>
          </template>
        </div>
      </div>
    </transition>

    <!-- Gear Info Popup (after photographing) -->
    <transition name="fade">
      <div v-if="gearInfoPopup" class="gear-info-popup-backdrop" @click.self="dismissGearInfoPopup">
        <div class="gear-info-popup">
          <div class="gear-info-header">
            <span class="gear-info-badge">📸 Gear Identified</span>
            <h2 class="gear-info-title">{{ gearInfoPopup.name }}</h2>
          </div>
          <div class="gear-info-body">
            <div class="gear-info-image-container">
              <img :src="gearInfoPopup.imageSrc" :alt="gearInfoPopup.name" class="gear-info-image" />
              <span class="gear-info-image-label">Real-life reference photo</span>
            </div>
            <p class="gear-info-description">{{ gearInfoPopup.description }}</p>
          </div>
          <div class="gear-info-footer">
            <button @click="dismissGearInfoPopup" class="gear-info-continue-btn">Continue Mission →</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Fish caught popup -->
    <transition name="fade">
      <div
        v-if="fishingToast && activeScreen === 'simulation'"
        class="fishing-catch-toast"
        role="status"
        aria-live="polite"
      >
        <span class="fishing-catch-icon" aria-hidden="true">🐟</span>
        <p>{{ fishingToast }}</p>
      </div>
    </transition>

    <!-- Weather notice (works in Quick Sail too) -->
    <transition name="fade">
      <div
        v-if="weatherNotice && activeScreen === 'simulation'"
        class="weather-notice-toast"
        role="status"
        aria-live="polite"
      >
        <span class="weather-notice-icon" aria-hidden="true">{{ stormMode ? '🌧️' : simulationWeatherPreset === 'cloudy' ? '☁️' : '☀️' }}</span>
        <p>{{ weatherNotice }}</p>
      </div>
    </transition>

    <!-- Island collision warning -->
    <transition name="fade">
      <div
        v-if="collisionWarning && activeScreen === 'simulation'"
        class="anchor-warning island-collision-warning"
      >
        <p>{{ collisionWarning }}</p>
      </div>
    </transition>


    <!-- HTML Audio element -->
    <audio ref="audioPlayer" src="/music.m4a" loop></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue';
import { deriveProgression, studentTotalXp } from '../shared/progression.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import InventoryModal from './components/InventoryModal.vue';
import PostDockingQuizModal from './components/PostDockingQuizModal.vue';
import QuizResultsModal from './components/QuizResultsModal.vue';
import { findCompletedQuizSubmission, quizScoreCounts, restoreQuizSubmissions } from './helpers/quizCompletion.js';
import AdminDashboard from './components/admin/AdminDashboard.vue';
// New Maritime UI Components
import MissionPanel from './components/MissionPanel.vue';
import MissionBriefing from './components/MissionBriefing.vue';
import EngineStatus from './components/EngineStatus.vue';
import BuoyInteraction from './components/BuoyInteraction.vue';
import MissionComplete from './components/MissionComplete.vue';
import SimulationTouchControls from './components/SimulationTouchControls.vue';
import { loadOceanSimulation } from './helpers/oceanSimulation.js';
import {
  VISUAL_CONFIG,
  applySceneFog,
  loadHdriEnvironment,
  applySkyEnvironment,
  applySkyPreset,
  updateSkyClouds,
  configureSceneLights,
  applyRendererToneMapping,
  getSunAnglesForPreset,
} from './helpers/environmentVisuals.js';
import { createRainWeatherSystem, getRainPhysicsModifiers, RAIN_PHYSICS } from './helpers/rainWeather.js';
import { updateTerrainSun, updateTerrainFog } from './helpers/terrainMaterial.js';
import { createBoatWake, createBowSpray } from './helpers/boatWake.js';
import { updateBuoySignalLights } from './helpers/buoySignalLights.js';
import { sampleBoatWaveMotion, getBoatWaveResponse } from './helpers/oceanWaves.js';
import { advanceBoatSpeed, knotsToMetersPerSecond, metersPerSecondToKnots } from './helpers/boatPropulsion.js';
import { createScenePostProcessing } from './helpers/scenePostProcessing.js';
import { addGeoJSONLayer } from './helpers/geojsonToThree.js';
import { createFishingLineSystem, FishingState } from './helpers/fishingLine.js';
import {
  createFishingSpotMarkers,
  getFishingSpotAt,
  getNearestFishingSpot,
  getFishingSpotChartWaypoints,
} from './helpers/fishingSpots.js';
import { createCommercialFishingTrawler } from './helpers/createFishingTrawler.js';
import { loadBoatModel, disposeBoatModel } from './helpers/loadBoatModel.js';
import { addBigBoatLights, disposeBigBoatLights, updateBigBoatLightPools, syncBigBoatBridgeLightVisibility } from './helpers/bigBoatLights.js';
import { loadHarborDocks, disposeHarborDockGroup, resolveDockCollision, getActiveDockColliders, getActiveHarborDockBerth } from './helpers/harborDocks.js';
import { setHarborPoleLightsVisible } from './helpers/harborPoleLights.js';
import * as firebaseApi from './api/firebaseApi.js';
import { API_BASE_URL } from './api/firebaseApi.js';
import { canViewMission, canManageMission, missionOwner } from '../shared/missionAccess.js';

// Expose firebaseApi to window for global access
window.firebaseApi = firebaseApi;

import {
  setupBoatAnchorRig,
  beginAnchorDeploy,
  beginAnchorRetract,
  updateBoatAnchorRig,
  resetBoatAnchorRig,
  isAnchorRigEngaged,
  isAnchorFullyDeployed,
  applyAnchorPose
} from './helpers/boatAnchor.js';
import { normalizeBoatToScene, resolveTargetBoatLength, CHASE_CAM_BEHIND_LOA, CHASE_CAM_LOOK_AHEAD_LOA, CHASE_CAM_HEIGHT_LOA } from './helpers/normalizeBoatScale.js';
import { SIMULATION_SPAWN, SCENE_WATERLINE_Y, updateSimulationSpawn, applySpawnAtBerth, getBoatDepartureSpawn } from './helpers/sceneEnvironment.js';
import { loadArchipelago, getDefaultSimHeading, resolveIslandCollisionAccurate, distanceToNearestIslandShore, ISLAND_PROXIMITY_MARGIN, clampToOceanBounds, OCEAN_MAP_HALF_EXTENT } from './helpers/worldIslands.js';
import {
  createHelmCockpit,
  updateHelmCockpit,
  disposeHelmCockpit,
  syncHelmBoatMeshVisibility,
  HELM_CAMERA_POS,
  HELM_CAMERA_LOOK,
  HELM_CAMERA_POS_SMALL,
  HELM_CAMERA_LOOK_SMALL,
  HELM_CAMERA_POS_LARGE,
  HELM_CAMERA_LOOK_LARGE
} from './helpers/helmCockpit.js';
import {
  initHelmInstrumentsHud,
  updateHelmInstrumentsHud,
  disposeHelmInstrumentsHud
} from './helpers/helmInstrumentsHud.js';
import {
  syncHelmDeckRailsVisibility,
  tagHelmDeckRailMeshes
} from './helpers/helmDeckRails.js';
import { tagHelmInteriorMeshes } from './helpers/helmInterior.js';
import { syncBigBoatBridgeWindows } from './helpers/bigBoatBridge.js';
import { createHelmRadarScreen, updateHelmRadarScreen, disposeHelmRadarScreen } from './helpers/helmRadarScreen.js';
import {
  authenticateUser,
  loadProgress,
  recordMissionSession,
  getCompletedModuleIds,
  getLatestMissionResult,
  restoreSavedMissionResults,
  getStudentSessions,
  buildInstructorStudents,
  buildInstructorRecentSessions,
  buildInstructorStats,
  resetStudentProgress,
  resetStudentMission,
  saveProgress,
  getInstructorsWithStudents
} from './helpers/progressStore.js';
import {
  getCourseSettings,
  getModuleAccess,
  getModuleLevelLabel,
  getModuleLevelIndex,
  buildInstructorLevelSettings,
  setModuleLocked,
  setSequentialUnlock,
  setAutoAwardEnabled
} from './helpers/courseSettings.js';
import {
  processMissionRewards,
  autoAwardOnModuleComplete,
  isModuleFullyPassed,
  getInstructorBadgeOptions,
  getInstructorCertificateOptions,
  instructorAwardBadge,
  instructorRevokeBadge,
  instructorAwardCertificateWithScore,
  instructorRevokeCertificate,
  getStudentDisplayBadges,
  getStudentCertificates,
  getStudentMotivationSummary
} from './helpers/studentMotivation.js';
import {
  captureStepBaseline,
  evaluateTrainingStep,
  headingDelta
} from './helpers/trainingValidation.js';
import {
  calculateMissionScore,
  createTrainingRunMetrics,
  updateTrainingRunMetrics,
  trackSteeringInput,
  trackFishingActivity,
  updateFishingTime,
  trackDockingAttempt,
  trackProcedureViolation,
  trackCourseDeviation,
  calculatePerformanceBreakdown,
  recordCollision
} from './helpers/missionScoring.js';
import { performanceManager } from './helpers/performanceManager.js';
import { crossTrackDistance } from './helpers/navigationMetrics.js';
import {
  resolveModuleWaypoints,
  createWaypointMarkerGroup,
  disposeWaypointMarkerGroup,
  updateWaypointMarkerDistances,
  updateBuoyFloating,
  distanceToZoneEdge,
  findWaypoint,
  formatDistanceMeters,
  getZoneStepHint,
  getTrainingCoachHint,
  isBoatInZone,
  buildHarborRoute,
  resolveWaypointCollision
} from './helpers/missionWaypoints.js';
import {
  buildTacticalChartSnapshot,
  drawCircularTacticalChart,
  drawTacticalChart,
  resizeTacticalCanvas
} from './helpers/tacticalChart.js';
import { worldToGps } from './helpers/davaoGulfData.js';
import {
  formatHeadingStepHint,
  updateHeadingHoldState,
  cardinalLabelForHeading,
  compassBearingToTarget
} from './helpers/navigationTraining.js';
import {
  createTrawlNetMesh,
  updateTrawlNetPosition,
  isFishInNet,
  spawnFishPopulation,
  updateFishSwimming,
  getRandomFishSpecies,
  spawnFishEntity,
  NET_CONFIG
} from './helpers/trawlNetSystem.js';
import {
  ADMIN_TABS,
  initializeAdminState,
  calculateAdminStats,
  getFilteredStudents,
  getFilteredInstructors,
  getFilteredResults,
  exportToExcel as exportDataToExcel,
  exportToPDF as exportDataToPDF,
  validateEmail,
  emailExists,
  generateUserId
} from './helpers/adminDashboard.js';
import './admin-dashboard.css';

// Make Firebase API available globally for async functions
if (typeof window !== 'undefined') {
  window.firebaseApi = firebaseApi;
}

// --- Reactive State ---
const initComplete = ref(false);
const activeTab = ref('physics');
const activeCamera = ref('chase'); // 'chase' | 'orbit' | 'helm'
const musicPlaying = ref(false);
const soundVolume = ref(0.5);
const fatalError = ref(null);
const showMenuSettings = ref(false);
const isAuthenticated = ref(false);
const userRole = ref('student');
const currentUser = ref({ id: 'student-alex', name: 'Alex Rivera', email: 'student@helmquest.local' });
const adminLoginMode = ref(false); // Track if user is trying to login as admin
const instructorLoginMode = ref(false); // Track if user is trying to login as instructor

// ---- Level Creator (Admin) State ----
const levelCreator = ref({
  title: 'Mission 4: Multi-Waypoint Patrol',
  category: 'Module 1',
  description: 'Perform a maritime patrol across the Davao Gulf. Combine compass navigation and coordinate searching to verify multiple patrol markers.',
  difficulty: 'Intermediate',
  reward: '+250 XP',
  objectives: [
    'Navigate to coordinates 7.1100°N, 125.7400°E.',
    'Follow heading 180° to reach Patrol Point 2.',
    'Navigate to coordinates 7.0500°N, 125.7100°E.',
    'Return to harbor docks.'
  ],
  steps: [
    { instruction: 'Navigate to Patrol Point 1 at 7.1100°N, 125.7400°E', waypointZone: 'm1-patrol-1', type: 'gps', lat: '7.1100', lon: '125.7400' },
    { instruction: 'Steer heading 180° to reach Patrol Point 2', waypointZone: 'm1-patrol-2', type: 'compass', heading: '180' },
    { instruction: 'Navigate to Patrol Point 3 at 7.0500°N, 125.7100°E', waypointZone: 'm1-patrol-3', type: 'gps', lat: '7.0500', lon: '125.7100' },
    { instruction: 'Return to harbor docks', waypointZone: 'm1-dock-return-m4', type: 'dock' }
  ]
});
const levelCreatorSaved = ref(false);
const levelCreatorTab = ref('details');
// ---- End Level Creator State ----

// ---- Admin Dashboard State ----
const adminTab = ref('overview'); // 'overview' | 'students' | 'instructors'

// Initialize admin state from helper
const adminState = initializeAdminState();
const adminActiveTab = ref(adminState.adminActiveTab);
const adminSearch = ref(adminState.adminSearch);
const showAddStudentForm = ref(adminState.showAddStudentForm);
const showEditStudentForm = ref(adminState.showEditStudentForm);
const showAddInstructorForm = ref(adminState.showAddInstructorForm);
const showEditInstructorForm = ref(adminState.showEditInstructorForm);
const currentUserForm = ref(adminState.currentUserForm);
const reportFilter = ref(adminState.reportFilter);
const allStudents = ref(adminState.allStudents);
const allInstructors = ref(adminState.allInstructors);
const allSimulationResults = ref(adminState.allSimulationResults);

// Admin computed properties
const adminTabs = computed(() => ADMIN_TABS);

const adminStats = computed(() => {
  return calculateAdminStats(progressData.value, navigationMissions);
});

const filteredStudents = computed(() => {
  // Use existing students data from progressData
  const students = progressData.value?.students?.filter(s => s.role === 'student') || [];
  return getFilteredStudents(students, adminSearch.value);
});

const filteredInstructors = computed(() => {
  // Use existing instructors data from progressData  
  const instructors = progressData.value?.students?.filter(s => s.role === 'instructor') || [];
  return getFilteredInstructors(instructors, adminSearch.value);
});

const filteredResults = computed(() => {
  // Use existing session data as simulation results
  const results = progressData.value?.sessions || [];
  return getFilteredResults(results, reportFilter.value);
});

const adminDashboardMetrics = computed(() => {
  const totalStudents = progressData.value?.students?.length || 0;
  const instructorsList = getInstructorsWithStudents();
  const totalInstructors = instructorsList.length;
  const totalMissions = navigationMissions?.length || 0;
  const allSessions = progressData.value?.sessions || [];
  const totalAttempts = allSessions.length;
  
  return {
    totalStudents,
    totalInstructors,
    totalMissions,
    totalAttempts
  };
});

// Student management state
const adminStudentSearch = ref('');
const adminStudentSort = ref('name');
const adminStudentPageSize = 50;
const adminStudentPage = ref(1);
const adminAddStudentModal = ref(null);
const adminEditStudentModal = ref(null);
const adminNewStudent = ref({ firstName: '', lastName: '', email: '', username: '', password: '' });

const adminFilteredStudents = computed(() => {
  let students = progressData.value?.students || [];
  
  // Filter by search
  if (adminStudentSearch.value) {
    const q = adminStudentSearch.value.toLowerCase();
    students = students.filter(s => 
      (s.firstName + ' ' + s.lastName).toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q)
    );
  }
  
  // Sort
  students.sort((a, b) => {
    if (adminStudentSort.value === 'name') {
      return (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName);
    } else if (adminStudentSort.value === 'email') {
      return a.email.localeCompare(b.email);
    } else if (adminStudentSort.value === 'date') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });
  
  return students;
});

const adminStudentPageCount = computed(() => 
  Math.ceil(adminFilteredStudents.value.length / adminStudentPageSize)
);

const adminStudentsPaged = computed(() => {
  const start = (adminStudentPage.value - 1) * adminStudentPageSize;
  const end = start + adminStudentPageSize;
  return adminFilteredStudents.value.slice(start, end);
});

// Instructor management state
const adminInstructorSearch = ref('');
const adminInstructorSort = ref('name');
const adminInstructorPageSize = 50;
const adminInstructorPage = ref(1);
const adminAddInstructorModal = ref(null);
const adminEditInstructorModal = ref(null);
const adminNewInstructor = ref({ firstName: '', lastName: '', email: '', username: '', password: '', department: '' });

const adminFilteredInstructors = computed(() => {
  let instructors = getInstructorsWithStudents() || [];
  
  // Filter by search
  if (adminInstructorSearch.value) {
    const q = adminInstructorSearch.value.toLowerCase();
    instructors = instructors.filter(i => 
      (i.firstName + ' ' + i.lastName).toLowerCase().includes(q) || 
      i.email.toLowerCase().includes(q)
    );
  }
  
  // Sort
  instructors.sort((a, b) => {
    if (adminInstructorSort.value === 'name') {
      return (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName);
    } else if (adminInstructorSort.value === 'email') {
      return a.email.localeCompare(b.email);
    }
    return 0;
  });
  
  return instructors;
});

const adminInstructorPageCount = computed(() => 
  Math.ceil(adminFilteredInstructors.value.length / adminInstructorPageSize)
);

const adminInstructorsPaged = computed(() => {
  const start = (adminInstructorPage.value - 1) * adminInstructorPageSize;
  const end = start + adminInstructorPageSize;
  return adminFilteredInstructors.value.slice(start, end);
});

const adminFilteredReports = computed(() => {
  let sessions = (progressData.value?.sessions || []).map(s => ({
    ...s,
    studentName: progressData.value?.students?.find(st => st.id === s.studentId)?.firstName + ' ' + progressData.value?.students?.find(st => st.id === s.studentId)?.lastName,
    missionTitle: navigationMissions?.find(m => m.id === s.missionId)?.title || 'Unknown'
  }));
  
  // Use the unified reportFilter
  return getFilteredResults(sessions, reportFilter.value);
});

const adminReportPageSize = 50;
const adminReportPage = ref(1);

const adminReportPageCount = computed(() => 
  Math.ceil(adminFilteredReports.value.length / adminReportPageSize)
);

const adminReportsPaged = computed(() => {
  const start = (adminReportPage.value - 1) * adminReportPageSize;
  const end = start + adminReportPageSize;
  return adminFilteredReports.value.slice(start, end);
});

// ---- Admin Dashboard Functions ----

function goToAdminLogin() {
  // Set admin login mode and go to auth screen
  adminLoginMode.value = true;
  instructorLoginMode.value = false; // Reset instructor mode
  authMode.value = 'signin'; // Reset to signin form
  authForm.value.email = ''; // Clear email field for admin login
  authForm.value.password = ''; // Clear password field
  authError.value = ''; // Clear any previous errors
  activeScreen.value = 'auth';
}

function adminAddStudent() {
  if (!adminNewStudent.value.email || !adminNewStudent.value.username) {
    alert('Email and username are required');
    return;
  }
  
  // Check for duplicate email
  if (progressData.value.students.some(s => s.email === adminNewStudent.value.email)) {
    alert('Email already in use');
    return;
  }
  
  const newStudent = {
    id: `student-${Date.now()}`,
    firstName: adminNewStudent.value.firstName,
    lastName: adminNewStudent.value.lastName,
    email: adminNewStudent.value.email,
    username: adminNewStudent.value.username,
    password: adminNewStudent.value.password,
    role: 'student',
    createdAt: new Date().toISOString(),
    active: true
  };
  
  progressData.value.students.push(newStudent);
  saveProgress(progressData.value);
  adminAddStudentModal.value = null;
  adminNewStudent.value = { firstName: '', lastName: '', email: '', username: '', password: '' };
  alert(`Student ${newStudent.firstName} ${newStudent.lastName} added successfully!`);
}

function adminEditStudent(student) {
  adminEditStudentModal.value = { ...student };
}

function adminSaveStudentEdit() {
  if (!adminEditStudentModal.value.email) {
    alert('Email is required');
    return;
  }
  
  const originalStudent = progressData.value.students.find(s => s.id === adminEditStudentModal.value.id);
  const emailConflict = progressData.value.students.some(s => 
    s.email === adminEditStudentModal.value.email && s.id !== adminEditStudentModal.value.id
  );
  
  if (emailConflict) {
    alert('Email already in use by another student');
    return;
  }
  
  Object.assign(originalStudent, adminEditStudentModal.value);
  saveProgress(progressData.value);
  adminEditStudentModal.value = null;
  alert('Student updated successfully!');
}

function adminDeleteStudent(studentId) {
  if (!confirm('Are you sure you want to delete this student? Their simulation results will be preserved.')) {
    return;
  }
  
  progressData.value.students = progressData.value.students.filter(s => s.id !== studentId);
  saveProgress(progressData.value);
  alert('Student deleted successfully!');
}

function adminAddInstructor() {
  if (!adminNewInstructor.value.email || !adminNewInstructor.value.username) {
    alert('Email and username are required');
    return;
  }
  
  // Check for duplicate email (check both students and instructors)
  const allUsers = [...(progressData.value.students || []), ...(progressData.value.instructors || [])];
  if (allUsers.some(u => u.email === adminNewInstructor.value.email)) {
    alert('Email already in use');
    return;
  }
  
  if (!progressData.value.instructors) progressData.value.instructors = [];
  
  const newInstructor = {
    id: `instructor-${Date.now()}`,
    firstName: adminNewInstructor.value.firstName,
    lastName: adminNewInstructor.value.lastName,
    email: adminNewInstructor.value.email,
    username: adminNewInstructor.value.username,
    password: adminNewInstructor.value.password,
    department: adminNewInstructor.value.department,
    role: 'instructor',
    createdAt: new Date().toISOString(),
    active: true
  };
  
  progressData.value.instructors.push(newInstructor);
  saveProgress(progressData.value);
  adminAddInstructorModal.value = null;
  adminNewInstructor.value = { firstName: '', lastName: '', email: '', username: '', password: '', department: '' };
  alert(`Instructor ${newInstructor.firstName} ${newInstructor.lastName} added successfully!`);
}

function adminEditInstructor(instructor) {
  adminEditInstructorModal.value = { ...instructor };
}

function adminSaveInstructorEdit() {
  if (!adminEditInstructorModal.value.email) {
    alert('Email is required');
    return;
  }
  
  if (!progressData.value.instructors) progressData.value.instructors = [];
  
  const originalInstructor = progressData.value.instructors.find(i => i.id === adminEditInstructorModal.value.id);
  const emailConflict = progressData.value.instructors.some(i => 
    i.email === adminEditInstructorModal.value.email && i.id !== adminEditInstructorModal.value.id
  );
  
  if (emailConflict) {
    alert('Email already in use by another instructor');
    return;
  }
  
  Object.assign(originalInstructor, adminEditInstructorModal.value);
  saveProgress(progressData.value);
  adminEditInstructorModal.value = null;
  alert('Instructor updated successfully!');
}

function adminDeleteInstructor(instructorId) {
  if (!confirm('Are you sure you want to delete this instructor?')) {
    return;
  }
  
  if (!progressData.value.instructors) progressData.value.instructors = [];
  progressData.value.instructors = progressData.value.instructors.filter(i => i.id !== instructorId);
  saveProgress(progressData.value);
  alert('Instructor deleted successfully!');
}

function adminExportExcel() {
  if (adminFilteredReports.value.length === 0) {
    alert('No data to export');
    return;
  }
  
  // Simple CSV format (can be opened in Excel)
  let csv = 'Student Name,Student ID,Mission,Completion Date,Duration (min),Score,Status\n';
  
  adminFilteredReports.value.forEach(report => {
    const date = new Date(report.startTime).toLocaleString();
    const duration = report.endTime ? Math.round((new Date(report.endTime) - new Date(report.startTime)) / 60000) : '-';
    const score = report.score || '-';
    const status = report.missionPassed ? 'Passed' : 'In Progress';
    
    csv += `"${report.studentName}","${report.studentId}","${report.missionTitle}","${date}",${duration},${score},"${status}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `helmquest-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  alert('Report exported successfully!');
}

// Admin functions called by template
function editStudent(student) {
  currentUserForm.value = { ...student };
  showEditStudentForm.value = true;
}

function deleteStudent(student) {
  adminDeleteStudent(student.id);
}

function editInstructor(instructor) {
  currentUserForm.value = { ...instructor };
  showEditInstructorForm.value = true;
}

function deleteInstructor(instructor) {
  adminDeleteInstructor(instructor.id);
}

function exportToExcel() {
  const data = filteredResults.value.map(result => ({
    studentName: result.studentName || 'Unknown',
    studentId: result.studentId || result.id,
    missionName: result.missionTitle || result.mission,
    completedAt: result.startTime || result.date,
    duration: result.endTime ? Math.round((new Date(result.endTime) - new Date(result.startTime)) / 60000) : 0,
    score: result.score || 0,
    passed: result.missionPassed || false
  }));
  exportDataToExcel(data);
}

function exportToPDF() {
  const data = filteredResults.value.map(result => ({
    studentName: result.studentName || 'Unknown',
    studentId: result.studentId || result.id,
    missionName: result.missionTitle || result.mission,
    completedAt: result.startTime || result.date,
    duration: result.endTime ? Math.round((new Date(result.endTime) - new Date(result.startTime)) / 60000) : 0,
    score: result.score || 0,
    passed: result.missionPassed || false
  }));
  exportDataToPDF(data);
}

function closeUserForms() {
  showAddStudentForm.value = false;
  showEditStudentForm.value = false;
  showAddInstructorForm.value = false;
  showEditInstructorForm.value = false;
  currentUserForm.value = initializeAdminState().currentUserForm;
}

function logout() {
  signOut();
}

// ---- End Admin Dashboard State ----

// Mission editor modal state (instructor)
const missionEditorModal = ref(null);
const missionSaving = ref(false); // Track save state
const BUILTIN_MISSION_IDS = new Set(['m1-mission1', 'm1-mission2', 'm1-mission3', 'm1-mission4']);

// Boat selection modal state (student)
const boatSelectionModal = ref(null);

// Student editor modal state (instructor)
const studentEditorModal = ref(null);
const menuStartCamera = ref('chase');
const simulationRunning = ref(false);
const uiFirstMode = ref(true);
const graphicsQuality = ref('medium');
const waterQuality = ref('medium');
const shadowQuality = ref('low');
const uiScale = ref('1.0');
const showFPS = ref(false);
const activeScreen = ref('landing');
const achievementPopup = ref('');
const trainingNotification = ref(null);
const missionCompleteModal = ref(null);
const certificateModal = ref(null);
const instructorReviewModal = ref(null);
const instructorReviewAwards = ref({ badges: [], certificates: [] });
const showCinematicLoading = ref(false);
const loadingHint = ref('Preparing ocean telemetry');
const isObjectiveCollapsed = ref(false);
const trainingStepsExpanded = ref(false);
const stormMode = ref(false);
const simulationWeatherPreset = ref('day');
const simulationTouchMedia = window.matchMedia('(pointer: coarse)');
const simulationPortraitMedia = window.matchMedia('(max-width: 1023px) and (orientation: portrait) and (pointer: coarse)');
const simulationTouchEnabled = ref(simulationTouchMedia.matches);
const simulationNeedsLandscape = ref(simulationPortraitMedia.matches);
function onSimulationTouchChange(event) { simulationTouchEnabled.value = event.matches; }
function onSimulationPortraitChange(event) { simulationNeedsLandscape.value = event.matches; }
const activeInteraction = ref(null);
const activeMiniGame = ref(null);
const miniGameProgress = ref(0);
const miniGameInput = ref('');
const miniGameFeedback = ref('');
const miniGameInputRef = ref(null);
let miniGameDecayTimer = null;

// Gear info popup state
const gearInfoPopup = ref(null); // { name, description, imageSrc }
let pendingPopupMinigame = null;

const GEAR_INFO_DATA = {
  'm1-crab-pot': {
    name: 'Crab Pot (Crab Trap)',
    imageSrc: '/gear-images/crab-pot.png',
    description: 'A crab pot is a cage-like trap made of wire mesh or netting, designed to catch crabs. It features one or more cone-shaped entry funnels that allow crabs to enter but make it difficult for them to escape. Fishers bait the pot with fish scraps and lower it to the seabed, marking its location with a surface buoy. Crab pots are widely used in coastal and estuarine fisheries worldwide and are considered a relatively sustainable method since they allow undersized or non-target species to be released alive.'
  },
  'm1-gillnet': {
    name: 'Gillnet',
    imageSrc: '/gear-images/gillnet.png',
    description: 'A gillnet is a vertical wall of netting suspended in the water by floats on the top line and weights on the bottom line. Fish swim into the nearly invisible mesh and become entangled by their gill covers when they try to back out — hence the name. Gillnets can be set at the surface (drift gillnets), at mid-water, or on the seabed (set gillnets). They are one of the most common commercial fishing methods globally. Proper mesh size selection is critical to target specific species and reduce bycatch of juvenile fish or protected marine animals.'
  },
  'm1-longline': {
    name: 'Longline',
    imageSrc: '/gear-images/longline.png',
    description: 'A longline consists of a main line (sometimes stretching several kilometres) from which numerous shorter branch lines (called snoods or gangions) extend, each ending in a baited hook. Surface longlines target pelagic fish like tuna and swordfish, while bottom longlines target demersal species like cod and halibut. Longline fishing is efficient and produces high-quality catch, but requires careful management to minimize bycatch of seabirds, sea turtles, and sharks. Circle hooks and bird-scaring lines are common mitigation measures.'
  }
};

function startMiniGame(type) {
  activeMiniGame.value = type;
  miniGameFeedback.value = '';
  if (type === 'verify_id') {
    miniGameInput.value = '';
    nextTick(() => { if (miniGameInputRef.value) miniGameInputRef.value.focus(); });
  } else if (type === 'remove_debris') {
    miniGameProgress.value = 0;
    if (miniGameDecayTimer) clearInterval(miniGameDecayTimer);
    miniGameDecayTimer = setInterval(() => {
      if (miniGameProgress.value > 0) {
        miniGameProgress.value = Math.max(0, miniGameProgress.value - 2);
      }
    }, 100);
  }
}

function cancelMiniGame() {
  activeMiniGame.value = null;
  if (miniGameDecayTimer) clearInterval(miniGameDecayTimer);
}

/**
 * Complete the current mini-game and set the activeInteraction state.
 * This triggers the training step validation to check if interaction requirements are met.
 */
function completeMiniGame() {
  const type = activeMiniGame.value;
  console.log(`🎮 Mini-game completed: ${type}`);
  
  cancelMiniGame();
  activeInteraction.value = type;
  
  checkTrainingStep();
  
  activeInteraction.value = null;
}

/**
 * Show the gear info popup after a successful photograph.
 * The popup blocks progression until the player clicks Continue.
 */
function showGearInfoPopup(zoneId) {
  const missionBuoy = activeTrainingModule.value?.buoys?.find((buoy) => buoy.waypointZone === zoneId);
  const info = missionBuoy
    ? {
        name: missionBuoy.name || 'Buoy Checkpoint',
        imageSrc: missionBuoy.imageSrc,
        description: missionBuoy.description || 'Buoy checkpoint completed.'
      }
    : GEAR_INFO_DATA[zoneId];
  if (info) {
    gearInfoPopup.value = { ...info };
    pendingPopupMinigame = activeMiniGame.value;
    cancelMiniGame();
  } else {
    // No info data — just complete immediately
    completeMiniGame();
  }
}

function dismissGearInfoPopup() {
  gearInfoPopup.value = null;
  if (pendingPopupMinigame) {
    activeMiniGame.value = pendingPopupMinigame;
    pendingPopupMinigame = null;
  }
  completeMiniGame();
}

function submitMiniGameId() {
  const step = activeTrainingModule.value?.steps[currentTrainingStep.value];
  const expectedId = step?.buoyId ?? '482';
  if (miniGameInput.value.trim() === expectedId) {
    if (step?.waypointZone) {
      showGearInfoPopup(step.waypointZone);
    } else {
      completeMiniGame();
    }
  } else {
    miniGameFeedback.value = 'Incorrect ID. Please try again.';
  }
}

// Gear Quiz State
const gearQuizState = ref('questions');
const gearQuizCurrentQuestion = ref(0);
const gearQuizSelectedOption = ref(null);
const gearQuizAnswerRevealed = ref(false);
const gearQuizFeedbackIsCorrect = ref(false);
const gearQuizResults = ref([]);
const pendingMissionCompleteModule = ref(null);
const isGearQuizRetakeAllowed = ref(true); // Controlled by instructor

const gearQuizQuestions = ref([]);

// Trawl Net Fishing State
const trawlNetState = ref('STOWED'); // STOWED, DEPLOYING, ACTIVE, RETRIEVING
const trawlNetCatch = ref([]); // Temporary storage for caught fish
const trawlNetCapacity = ref(30); // Maximum fish capacity
const trawlRetrievalProgress = ref(0); // 0-100
const trawlAnimationProgress = ref(0); // 0-1 for deploy/retrieve animations
let trawlNetMesh = null;
let trawlCablesMesh = null;
let trawlAnimationTimer = null;

// Fish Inventory State
const inventoryVisible = ref(false);
const fishInventory = ref([]); // Array of fish objects with species, image, name, scientific
// Map overlay state
const mapVisible = ref(false);
// Sidebar collapse state for narrow screens
const sidebarCollapsed = ref(false);

// Student navigation uses a drawer below the desktop breakpoint.
const studentCompactLayout = ref(false);
const studentMenuOpen = ref(false);
const studentMenuPanel = ref(null);
const studentMenuTrigger = ref(null);
const studentMenuClose = ref(null);
const studentMenuMedia = window.matchMedia('(width < 1024px)');

async function openStudentMenu() {
  if (!studentCompactLayout.value) return;
  studentMenuOpen.value = true;
  await nextTick();
  studentMenuClose.value?.focus();
}

async function closeStudentMenu(restoreFocus = true) {
  const wasOpen = studentMenuOpen.value;
  studentMenuOpen.value = false;
  if (wasOpen && restoreFocus && studentCompactLayout.value) {
    await nextTick();
    studentMenuTrigger.value?.focus();
  }
}

function trapStudentMenuFocus(event) {
  if (event.key !== 'Tab' || !studentCompactLayout.value || !studentMenuOpen.value) return;
  const controls = [...studentMenuPanel.value.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')]
    .filter(element => element.getClientRects().length);
  const first = controls[0];
  const last = controls.at(-1);
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}

function updateStudentMenuLayout(event) {
  const wasOpen = studentMenuOpen.value;
  studentCompactLayout.value = event.matches;
  closeStudentMenu(false);
  if (wasOpen) nextTick(() => (event.matches ? studentMenuTrigger.value : studentMenuPanel.value)?.focus());
}

onMounted(() => {
  updateStudentMenuLayout(studentMenuMedia);
  studentMenuMedia.addEventListener('change', updateStudentMenuLayout);
});
onUnmounted(() => studentMenuMedia.removeEventListener('change', updateStudentMenuLayout));
watch([activeScreen, userRole], () => {
  if (activeScreen.value !== 'dashboard' || userRole.value !== 'student') closeStudentMenu(false);
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function maybeAutoCollapseSidebar() {
  if (typeof window !== 'undefined' && window.innerWidth <= 900) {
    sidebarCollapsed.value = true;
  }
}

function selectHubTab(tab) {
  hubTab.value = tab;
  
  // Fetch leaderboard data when switching to leaderboards tab
  if (tab === 'leaderboards') {
    fetchLeaderboardData();
  }
  if (tab === 'certificates' || tab === 'missions') {
    fetchStudentTrainingRecords();
  }
  
  maybeAutoCollapseSidebar();
}

function selectInstructorTab(tab) {
  instructorTab.value = tab;
  // The Students-tab watcher loads enrolled and pending accounts together.
  
  // Load recent activities when opening the overview tab
  if (tab === 'overview') {
    fetchInstructorRecentActivities();
  }
  
  // Load leaderboard data when opening leaderboards tab
  if (tab === 'leaderboards') {
    fetchLeaderboardData();
    fetchInstructorRecentActivities();
  }
  
  maybeAutoCollapseSidebar();
}

function selectAdminTab(tab) {
  adminTab.value = tab;
  maybeAutoCollapseSidebar();
}

/**
 * Load pending students from Firestore (filtered by current instructor)
 */
async function loadPendingStudents() {
  if (!window.firebaseApi) {
    console.error('Firebase API not available');
    return;
  }
  
  try {
    // Pass current instructor's ID to filter pending students
    const instructorId = currentUser.value?.id;
    const response = await window.firebaseApi.getPendingStudents(instructorId);
    pendingStudentsFromFirestore.value = response.students || [];
  } catch (error) {
    console.error('Error loading pending students:', error);
    pendingStudentsFromFirestore.value = [];
  }
}

/**
 * Load all students from Firestore (filtered by instructor if logged in as instructor)
 */
async function loadAllStudents() {
  if (!window.firebaseApi) {
    console.error('Firebase API not available');
    return;
  }
  
  try {
    // If logged in as instructor, only load their students
    const instructorId = (userRole.value === 'instructor') ? currentUser.value.id : null;
    const response = await window.firebaseApi.getAllStudents(instructorId);
    allStudentsFromFirestore.value = response.students || [];
    
    // Student Management has its own tab watcher and class-scoped backend projection.
    // Starting it here caused a duplicate request when the Students tab opened.
    if (userRole.value !== 'instructor') await loadStudentTrainingSummaries();
  } catch (error) {
    console.error('Error loading all students:', error);
    allStudentsFromFirestore.value = [];
  }
}

/**
 * Load training summaries for all students
 * Fetches missions/quizzes completion data
 */
async function loadStudentTrainingSummaries() {
  if (!window.firebaseApi) return;
  
  const students = allStudentsFromFirestore.value;
  const summariesMap = new Map();
  
  // Fetch summaries in parallel
  const promises = students.map(async (student) => {
    try {
      const response = await fetch(`${API_BASE_URL}/students/${student.id}/training-summary`);
      if (response.ok) {
        const summary = await response.json();
        summariesMap.set(student.id, summary);
      }
    } catch (error) {
      console.error(`Error loading training summary for student ${student.id}:`, error);
    }
  });
  
  await Promise.all(promises);
  studentTrainingSummaries.value = summariesMap;
}

// Difficulty / gamification state
const progressData = ref(loadProgress());
const difficultyLevel = ref(progressData.value?.courseSettings?.difficultyLevel || 'Normal'); // 'Easy' | 'Normal' | 'Hard'

// === DYNAMIC QUIZ BUTTON STATE ===
const verifiedQuizStates = ref(new Map());

// Debounce utility function
function debounce(fn, delay) {
  let timeoutId = null;
  let isExecuting = false;
  
  return function(...args) {
    // If already executing, ignore
    if (isExecuting) return;
    
    // Clear any pending timeout
    if (timeoutId) clearTimeout(timeoutId);
    
    // Execute immediately (leading edge)
    isExecuting = true;
    fn.apply(this, args);
    
    // Set timeout to reset executing flag
    timeoutId = setTimeout(() => {
      isExecuting = false;
      timeoutId = null;
    }, delay);
  };
}

// Verify quiz existence in database and update cache
async function verifyQuizExistence(moduleId) {
  try {
    // Check cache for fresh results (< 5 minutes old)
    const cached = verifiedQuizStates.value.get(moduleId);
    const now = Date.now();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.hasQuiz;
    }
    
    // Check progressData first
    const existingQuiz = getQuizForModule(moduleId);
    
    if (!existingQuiz) {
      // No quiz in progressData - cache and return
      verifiedQuizStates.value.set(moduleId, {
        hasQuiz: false,
        timestamp: now,
        source: 'progressData'
      });
      return false;
    }
    
    // progressData indicates quiz exists - verify with database
    try {
      const allQuizzes = await window.firebaseApi.getAllQuizzes();
      const quizIds = localQuizzes.map(q => q.id);
      const dbHasQuiz = allQuizzes.some(q => quizIds.includes(q.id));
      
      // Check for data inconsistency
      if (localQuizzes.length > 0 && !dbHasQuiz) {
        console.warn('[Quiz Button] Data inconsistency detected:', {
          moduleId,
          progressDataHasQuiz: true,
          databaseHasQuiz: false,
          resolution: 'Using database state'
        });
      }
      
      verifiedQuizStates.value.set(moduleId, {
        hasQuiz: dbHasQuiz,
        timestamp: now,
        source: 'database'
      });
      
      return dbHasQuiz;
    } catch (error) {
      console.error('[Quiz Button] Database verification failed:', {
        moduleId,
        error,
        fallback: 'Using progressData state'
      });
      
      // Fallback to progressData on network error
      verifiedQuizStates.value.set(moduleId, {
        hasQuiz: localQuizzes.length > 0,
        timestamp: now,
        source: 'fallback'
      });
      
      return localQuizzes.length > 0;
    }
  } catch (error) {
    console.error('[Quiz Button] Verification error:', error);
    return false;
  }
}

// Computed property for dynamic button text
const quizButtonText = computed(() => {
  return (moduleId) => {
    if (!moduleId) return 'CREATE QUIZ';
    
    try {
      // Check verified cache first
      const verified = verifiedQuizStates.value.get(moduleId);
      if (verified) {
        return verified.hasQuiz ? 'UPDATE QUIZ' : 'CREATE QUIZ';
      }
      
      // Fallback to progressData check
      const existingQuiz = getQuizForModule(moduleId);
      return existingQuiz ? 'UPDATE QUIZ' : 'CREATE QUIZ';
    } catch (error) {
      console.error('[Quiz Button] Error determining button text:', error);
      return 'CREATE QUIZ';
    }
  };
});

// Open quiz manager modal
function openQuizManager(moduleId, moduleTitle) {
  // Close any other modals
  quizEditorModal.value = null;
  missionEditorModal.value = null;
  
  // Open quiz manager
  quizManagerModal.value = {
    moduleId: moduleId,
    moduleTitle: moduleTitle || 'Quiz Management'
  };
}

// Debounced click handler for quiz button
const handleQuizButtonClick = debounce(async (moduleId, moduleTitle) => {
  try {
    // Check verified state
    let hasQuiz = false;
    const verified = verifiedQuizStates.value.get(moduleId);
    
    if (verified) {
      hasQuiz = verified.hasQuiz;
    } else {
      // No cached state - verify now
      hasQuiz = await verifyQuizExistence(moduleId);
    }
    
    // Close any open modals
    quizEditorModal.value = null;
    missionEditorModal.value = null;
    quizManagerModal.value = null;
    
    // Route to appropriate action
    if (hasQuiz) {
      openQuizManager(moduleId, moduleTitle);
    } else {
      startCreatingQuiz(moduleId, moduleTitle);
    }
  } catch (error) {
    console.error('[Quiz Button] Click handler error:', error);
    // Fallback to creation on error
    startCreatingQuiz(moduleId, moduleTitle);
  }
}, 300);

// Watch progressData for quiz changes and clear cache
watch(() => progressData.value?.quizzes, () => {
  verifiedQuizStates.value.clear();
}, { deep: true });

let spawnedFishHandles = [];

// Student hub active tab (sidebar navigation)
const hubTab = ref('overview');
const leaderboardTab = ref('myclass'); // Tab within leaderboards: 'myclass' or 'global'

// Instructor console active tab (sidebar navigation)
const instructorTab = ref('overview');

// Controls Guide State
const controlsGuideVisible = ref(false);
const hasSeenControlsGuide = ref(false); // Track if user has seen it before

// Load controls guide preference from localStorage
if (typeof window !== 'undefined') {
  const savedPreference = localStorage.getItem('helmquest-controls-guide-seen');
  hasSeenControlsGuide.value = savedPreference === 'true';
}

// Fish species database
const FISH_SPECIES = {
  'Tamban': {
    name: 'Tamban',
    scientific: 'Sardinella tawilis',
    image: '/fish/media__fish_tamban.png'
  },
  'Galunggong': {
    name: 'Galunggong',
    scientific: 'Decapterus macrosoma',
    image: '/fish/media__fish_galunggong.png'
  },
  'Dilis': {
    name: 'Dilis',
    scientific: 'Stolephorus commersonnii',
    image: '/fish/media__fish_dilis.png'
  },
  'Matangbaka': {
    name: 'Matangbaka',
    scientific: 'Megalops cyprinoides',
    image: '/fish/media__fish_matangbaka.png'
  }
};

// Provide inventory state for InventoryModal
provide('inventoryVisible', inventoryVisible);
provide('inventoryItems', fishInventory);

const gearQuizQuestionPool = [
  [
    { gearType: "Crab Pot", text: "Which gear is designed as a trap that sits on the ocean floor to catch crustaceans?", options: ["Gillnet", "Crab Pot", "Longline", "Trawl Net"], correctIdx: 1 },
    { gearType: "Crab Pot", text: "What type of bottom-dwelling gear uses bait inside a cage to trap target species?", options: ["Seine Net", "Longline", "Crab Pot", "Gillnet"], correctIdx: 2 }
  ],
  [
    { gearType: "Longline", text: "Which fishing gear uses a single main line with many baited hooks attached to catch pelagic fish?", options: ["Longline", "Gillnet", "Seine Net", "Crab Pot"], correctIdx: 0 },
    { gearType: "Longline", text: "What gear consists of an extensive line suspended with hundreds of individual hooks?", options: ["Trawl Net", "Crab Pot", "Gillnet", "Longline"], correctIdx: 3 }
  ],
  [
    { gearType: "Gillnet", text: "Which gear hangs vertically in the water column and catches fish by entangling their gills?", options: ["Longline", "Crab Pot", "Trawl Net", "Gillnet"], correctIdx: 3 },
    { gearType: "Gillnet", text: "What type of vertical net is virtually invisible underwater and traps fish that swim into its meshes?", options: ["Gillnet", "Longline", "Seine", "Crab Pot"], correctIdx: 0 }
  ]
];

function generateGearQuiz() {
  gearQuizQuestions.value = gearQuizQuestionPool.map(pool => pool[Math.floor(Math.random() * pool.length)]);
}

function startGearQuiz(module) {
  generateGearQuiz();
  activeMiniGame.value = 'gear_quiz';
  gearQuizState.value = 'questions';
  gearQuizCurrentQuestion.value = 0;
  gearQuizSelectedOption.value = null;
  gearQuizAnswerRevealed.value = false;
  miniGameFeedback.value = '';
  gearQuizResults.value = [];
  if (module) pendingMissionCompleteModule.value = module;
  syncUiCursor();
}

function selectGearQuizOption(idx) {
  if (gearQuizAnswerRevealed.value) return;
  gearQuizSelectedOption.value = idx;
  submitGearQuizAnswer();
}

function submitGearQuizAnswer() {
  if (gearQuizSelectedOption.value === null) return;
  gearQuizAnswerRevealed.value = true;
  const isCorrect = gearQuizSelectedOption.value === gearQuizQuestions.value[gearQuizCurrentQuestion.value].correctIdx;
  gearQuizFeedbackIsCorrect.value = isCorrect;
  gearQuizResults.value[gearQuizCurrentQuestion.value] = isCorrect;
  if (isCorrect) {
    miniGameFeedback.value = "Correct!";
  } else {
    miniGameFeedback.value = "Incorrect. The correct answer was: " + gearQuizQuestions.value[gearQuizCurrentQuestion.value].options[gearQuizQuestions.value[gearQuizCurrentQuestion.value].correctIdx];
  }
}

function nextGearQuizQuestion() {
  if (gearQuizCurrentQuestion.value < gearQuizQuestions.value.length - 1) {
    gearQuizCurrentQuestion.value++;
    gearQuizSelectedOption.value = null;
    gearQuizAnswerRevealed.value = false;
    miniGameFeedback.value = '';
  } else {
    // Show Summary
    gearQuizState.value = 'summary';
  }
}

function finishGearQuizAndSubmit() {
  activeMiniGame.value = null;
  if (pendingMissionCompleteModule.value) {
    const mod = pendingMissionCompleteModule.value;
    pendingMissionCompleteModule.value = null;
    
    if (isTrainingReviewMode.value) {
      completeTrainingReview(mod);
    } else {
      trainingFeedback.value = '🎉 Training module completed!';
      showTrainingNotification(
        'Training complete!',
        `${mod.title} — all steps finished. Calculating your mission score…`,
        { variant: 'success', durationMs: 3500 }
      );
      openMissionCompleteModal(mod);
      syncUiCursor();
    }
  }
}

function submitFailedGearQuiz() {
  activeMiniGame.value = null;
  if (pendingMissionCompleteModule.value) {
    const mod = pendingMissionCompleteModule.value;
    pendingMissionCompleteModule.value = null;
    
    const score = Math.round((gearQuizResults.value.filter(Boolean).length / gearQuizQuestions.value.length) * 100);
    
    if (isTrainingReviewMode.value) {
      completeTrainingReview(mod);
    } else {
      trainingFeedback.value = '📝 Assessment submitted with incomplete results';
      showTrainingNotification(
        'Assessment Submitted',
        `${mod.title} — submitted with ${score}% completion. Contact your instructor for retake permission.`,
        { variant: 'warning', durationMs: 4500 }
      );
      openMissionCompleteModal(mod);
      syncUiCursor();
    }
  }
}

// Trawl Net Fishing Functions
function deployTrawlNet() {
  if (trawlNetState.value !== 'STOWED') return;
  if (!boatObject || !scene) return;

  trawlNetState.value = 'DEPLOYING';
  trawlAnimationProgress.value = 0;

  // Create net if doesn't exist
  if (!trawlNetMesh) {
    trawlNetMesh = createTrawlNetMesh();
    scene.add(trawlNetMesh);
  }

  trawlNetMesh.visible = true;

  // Animate deployment
  const startTime = Date.now();
  const deployDuration = NET_CONFIG.deployTime;

  const animateDeployment = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / deployDuration, 1.0);
    trawlAnimationProgress.value = progress;

    updateTrawlNetPosition(trawlNetMesh, boatObject, progress, performance.now() * .001,
      getWaterSurfaceY(boatObject.position.x, boatObject.position.z));

    if (progress < 1.0) {
      trawlAnimationTimer = requestAnimationFrame(animateDeployment);
    } else {
      trawlNetState.value = 'ACTIVE';
      fishingToast.value = '🎣 Trawl net deployed and fishing!';
      setTimeout(() => { fishingToast.value = ''; }, 3000);
    }
  };

  animateDeployment();
}

function retrieveTrawlNet() {
  if (trawlNetState.value !== 'ACTIVE') return;

  trawlNetState.value = 'RETRIEVING';
  trawlRetrievalProgress.value = 0;
  trawlAnimationProgress.value = 1.0;

  const startTime = Date.now();
  const retrieveDuration = NET_CONFIG.retrieveTime;

  const animateRetrieval = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / retrieveDuration, 1.0);
    trawlRetrievalProgress.value = progress * 100;
    trawlAnimationProgress.value = 1.0 - progress;

    updateTrawlNetPosition(trawlNetMesh, boatObject, 1.0 - progress, performance.now() * .001,
      getWaterSurfaceY(boatObject.position.x, boatObject.position.z));

    if (progress < 1.0) {
      trawlAnimationTimer = requestAnimationFrame(animateRetrieval);
    } else {
      // Retrieval complete - transfer fish to inventory
      transferCatchToInventory();
      trawlNetState.value = 'STOWED';
      trawlRetrievalProgress.value = 0;
      if (trawlNetMesh) trawlNetMesh.visible = false;
    }
  };

  animateRetrieval();
}

function transferCatchToInventory() {
  if (trawlNetCatch.value.length === 0) {
    fishingToast.value = '🎣 Net retrieved - no fish caught';
    setTimeout(() => { fishingToast.value = ''; }, 3000);
    return;
  }

  // Add fish to inventory with proper structure
  trawlNetCatch.value.forEach(speciesName => {
    const species = FISH_SPECIES[speciesName];
    if (species) {
      fishInventory.value.push({
        name: species.name,
        scientific: species.scientific,
        image: species.image,
        caughtAt: Date.now(),
        source: 'trawl'
      });
    }
  });

  const totalCaught = trawlNetCatch.value.length;
  fishingToast.value = `🎣 Net retrieved - ${totalCaught} fish added to inventory! Press 'I' to view.`;
  setTimeout(() => { fishingToast.value = ''; }, 5000);

  // Clear temporary catch
  trawlNetCatch.value = [];
}

function toggleInventory() {
  // Only allow toggle during simulation
  if (activeScreen.value !== 'simulation') return;
  inventoryVisible.value = !inventoryVisible.value;
}

// Expose inventory toggle globally
if (typeof window !== 'undefined') {
  window.toggleInventory = toggleInventory;
}

function toggleMapPanel() {
  mapVisible.value = !mapVisible.value;
  syncUiCursor();
  if (mapVisible.value) {
    // Render the map when opening
    nextTick(() => {
      updateNavigationMap();
    });
  }
}

// When opening the map, load geojson and render
async function openMapPanel() {
  await loadGeoJsonIfNeeded();
  await nextTick();
  renderGeoJsonOnMap();
}

// Watch mapVisible to load data when opened
watch(mapVisible, (v) => {
  if (v) {
    openMapPanel();
  }
});

// Re-render on resize while map is visible
window.addEventListener('resize', () => {
  if (mapVisible.value) renderGeoJsonOnMap();
});

/**
 * Toggle the controls guide overlay
 */
function toggleControlsGuide() {
  controlsGuideVisible.value = !controlsGuideVisible.value;
  
  // Mark as seen when user opens it
  if (controlsGuideVisible.value && !hasSeenControlsGuide.value) {
    hasSeenControlsGuide.value = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('helmquest-controls-guide-seen', 'true');
    }
  }
}

/**
 * Show controls guide on first simulation load
 */
function showControlsGuideOnFirstLaunch() {
  if (!hasSeenControlsGuide.value) {
    controlsGuideVisible.value = true;
    hasSeenControlsGuide.value = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('helmquest-controls-guide-seen', 'true');
    }
  }
}

function collectFishInNet() {
  if (trawlNetState.value !== 'ACTIVE') return;
  if (!scene || !trawlNetMesh) return;
  if (trawlNetCatch.value.length >= trawlNetCapacity.value) return;

  // Check if boat is near a fishing spot for better catch rates
  const nearestSpot = getNearestFishingSpot(stats.value.boatX, stats.value.boatZ);
  const isInFishingSpot = nearestSpot && nearestSpot.distance < 50; // Within 50 meters

  // Calculate catch rate based on location
  const baseCatchRate = 0.01; // 1% chance per frame when not in fishing spot
  const fishingSpotCatchRate = 0.08; // 8% chance per frame in fishing spot
  const catchRate = isInFishingSpot ? fishingSpotCatchRate : baseCatchRate;

  // Determine catch amount (random, higher in fishing spots)
  if (Math.random() < catchRate) {
    const catchAmount = isInFishingSpot 
      ? Math.floor(Math.random() * 4) + 2  // 2-5 fish in fishing spot
      : Math.floor(Math.random() * 2) + 1; // 1-2 fish outside

    // Add random fish to catch
    for (let i = 0; i < catchAmount; i++) {
      if (trawlNetCatch.value.length >= trawlNetCapacity.value) break;
      
      const species = getRandomFishSpecies();
      trawlNetCatch.value.push(species);
    }

    // Show toast notification for significant catches
    if (catchAmount >= 2) {
      fishingToast.value = `🎣 Caught ${catchAmount} fish! (${trawlNetCatch.value.length}/${trawlNetCapacity.value})`;
      setTimeout(() => { fishingToast.value = ''; }, 2000);
    }
  }

  // Also catch physical fish entities if they exist (original behavior)
  const fishes = [];
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.isFish) {
      fishes.push(obj);
    }
  });

  // Check each physical fish for collision with net
  fishes.forEach((fish) => {
    if (trawlNetCatch.value.length >= trawlNetCapacity.value) return;
    
    if (isFishInNet(fish.position, trawlNetMesh)) {
      // Catch the fish
      const species = fish.userData.species || 'Unknown';
      trawlNetCatch.value.push(species);
      
      // Remove fish from scene
      scene.remove(fish);
      fish.geometry.dispose();
      fish.material.dispose();

      // Spawn replacement fish
      setTimeout(() => {
        if (scene) {
          const spawnDist = 100 + Math.random() * 50;
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnPos = new THREE.Vector3(
            Math.cos(spawnAngle) * spawnDist,
            -5 - Math.random() * 10,
            Math.sin(spawnAngle) * spawnDist
          );
          spawnFishEntity(scene, spawnPos, getRandomFishSpecies());
        }
      }, 5000 + Math.random() * 10000);
    }
  });
}

// Cesium integration (removed - using Three.js with map tiles instead)
const exitHoldActive = ref(false);
// Exit confirmation dialog state (two-step confirm)
const exitConfirmVisible = ref(false);
const exitConfirmMessage = ref('Do you want to quit to dashboard?');
const exitFinalConfirmVisible = ref(false);

function showExitConfirm() {
  exitConfirmVisible.value = true;
  nextTick(() => {
    const yes = document.getElementById('exitConfirmYes');
    if (yes) yes.focus();
  });
}

// First confirm: open a final confirmation modal instead of exiting immediately
function confirmExit() {
  exitConfirmVisible.value = false;
  exitFinalConfirmVisible.value = true;
  nextTick(() => {
    const yes = document.getElementById('exitFinalYes');
    if (yes) yes.focus();
  });
}

function cancelExitConfirm() {
  exitConfirmVisible.value = false;
}

function confirmFinalExit() {
  exitFinalConfirmVisible.value = false;
  exitTraining();
}

function cancelFinalExit() {
  exitFinalConfirmVisible.value = false;
}
const nowTick = ref(Date.now());

const authForm = ref({
  email: '',
  password: '',
  remember: true
});
const showPassword = ref(false);
const showPasswordStudent = ref(false);
const authError = ref('');
const authMode = ref('signin'); // 'signin' | 'signup'
const signupForm = ref({ studentId: '', name: '', email: '', password: '', instructorId: '' });
const signupSuccess = ref(false);

// Pending student signups from Firestore
const pendingStudentsFromFirestore = ref([]);

// Available instructors for student signup
const availableInstructors = ref([]);

// All students from Firestore (active)
const allStudentsFromFirestore = ref([]);

// Student training summaries cache (for enhanced student management)
const studentTrainingSummaries = ref(new Map());

// Selected student for detail view
const selectedStudentDetail = ref(null);
const studentDetailTab = ref('overview'); // overview, missions, quizzes, activity
const showStudentDetailModal = ref(false);

// Student Management reads account data and saved training results from one backend projection.
const studentManagement = ref(null);
const studentManagementLoading = ref(false);
const studentManagementError = ref('');
const studentSearch = ref('');
const studentStatusFilter = ref('all');
const studentDetailLoading = ref(false);
const studentDetailError = ref('');
let studentManagementRequest = 0;
let studentDetailRequest = 0;
let studentManagementAbortController = null;
const managedStudents = computed(() => (studentManagement.value?.students || []).filter(student => !['pending', 'rejected'].includes(student.status)));
const filteredManagedStudents = computed(() => {
  const search = studentSearch.value.trim().toLowerCase();
  return managedStudents.value.filter(student =>
    (studentStatusFilter.value === 'all' || student.status === studentStatusFilter.value) &&
    (!search || [student.name, student.studentId, student.email].some(value => String(value || '').toLowerCase().includes(search))));
});
async function fetchStudentManagement() {
  const instructorId = currentUser.value?.id;
  const request = ++studentManagementRequest;
  if (userRole.value !== 'instructor' || !instructorId) {
    studentManagementLoading.value = false;
    studentManagementError.value = 'Your instructor account could not be loaded. Please sign in again.';
    return;
  }
  studentManagementAbortController?.abort();
  const controller = new AbortController();
  studentManagementAbortController = controller;
  studentManagementLoading.value = true;
  studentManagementError.value = '';
  try {
    const data = await firebaseApi.getInstructorStudentManagement(instructorId, { signal: controller.signal });
    if (!Array.isArray(data?.students)) throw new Error('Invalid student response');
    if (request === studentManagementRequest && currentUser.value?.id === instructorId && userRole.value === 'instructor') {
      studentManagement.value = data;
    }
  } catch (error) {
    if (request === studentManagementRequest && error?.name !== 'AbortError') {
      studentManagementError.value = error?.name === 'TimeoutError'
        ? 'The database took too long to respond. Check your connection, then try again.'
        : 'Could not load your students. Please try again.';
    }
  } finally {
    if (request === studentManagementRequest) studentManagementLoading.value = false;
    if (studentManagementAbortController === controller) studentManagementAbortController = null;
  }
}
watch([() => currentUser.value?.id, userRole, activeScreen, instructorTab],
  ([id, role, screen, tab], [previousId, previousRole] = []) => {
  if (id !== previousId || role !== previousRole) {
    studentManagementAbortController?.abort();
    studentManagementAbortController = null;
    studentManagementRequest++;
    studentManagement.value = null;
    studentManagementLoading.value = false;
    studentManagementError.value = '';
    studentSearch.value = '';
    studentStatusFilter.value = 'all';
    closeStudentDetail();
  }
  if (role === 'instructor' && screen === 'dashboard' && tab === 'students') fetchStudentManagement();
  else if (studentManagementLoading.value) {
    studentManagementRequest++;
    studentManagementAbortController?.abort();
    studentManagementAbortController = null;
    studentManagementLoading.value = false;
  }
}, { immediate: true });
// End Student Management bindings.

const demoStudent = ref({
  name: 'Alex Rivera',
  xp: 0,
  rank: deriveProgression(0).rank.name,
  completed: 0,
  averageScore: 0,
  bestScore: 0,
  badgesEarned: 0,
  badgesTotal: 0,
  certificates: 0,
  xpProgress: 0,
  xpNextAt: deriveProgression(0).xpProgress.nextAt
});

// Leaderboard data from Firestore
const myClassStudents = ref([]);
const allStudentsGlobal = ref([]);
const instructorsMap = ref(new Map());
const instructorRecentActivities = ref([]); // Recent activities for instructor's students only

// Save individual mission score to Firestore
async function saveMissionScoreToFirestore({ studentId, missionId, missionTitle, score, passed, completedAt }) {
  const reportingRun = trainingRunMetrics.value;
  try {
    const response = await fetch(`${API_BASE_URL}/mission-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        missionId,
        missionTitle,
        score,
        passed,
        completedAt: completedAt || new Date()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save mission score: ${response.statusText}`);
    }
    
    const result = await response.json();
    if (currentUser.value?.id !== studentId || trainingRunMetrics.value !== reportingRun) return result;
    console.log('✅ Mission score saved to Firestore:', result);
    
    // Show XP and rank notifications
    if (result.xpAwarded && result.xpAwarded > 0) {
      // Rank up notification
      if (result.rankChanged) {
        showAchievement(`🎉 RANK UP! ${result.previousRank} → ${result.rank}! +${result.xpAwarded} XP (Total: ${result.totalXp} XP)`);
      } else {
        // Regular XP notification
        showAchievement(`🎯 +${result.xpAwarded} XP earned! Total: ${result.totalXp} XP`);
      }
      
      // Refresh student data to reflect new XP and rank
      if (currentUser.value?.id) {
        await refreshCurrentUser();
        await fetchLeaderboardData();
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error saving mission score to Firestore:', error);
    throw error;
  }
}

// Refresh current user data from Firestore
async function refreshCurrentUser() {
  try {
    if (!currentUser.value?.id) return;
    
    const response = await fetch(`${API_BASE_URL}/students/${currentUser.value.id}`);
    if (!response.ok) {
      console.error('Failed to refresh user data');
      return;
    }
    
    const data = await response.json();
    if (data.student) {
      // Update current user with fresh Firestore data
      currentUser.value = {
        ...currentUser.value,
        ...data.student,
        xp: studentTotalXp(data.student),
        completed: data.student.completed || 0
      };
      if (data.rankSettings) {
        progressData.value.courseSettings = { ...progressData.value.courseSettings, ...data.rankSettings };
      }
      console.log('✅ User data refreshed from Firestore:', currentUser.value);
    }
  } catch (error) {
    console.error('Error refreshing user data:', error);
  }
}

// Fetch leaderboard data from API
async function fetchLeaderboardData() {
  try {
    const currentStudentInstructorId = currentUser.value?.instructorid;
    
    // Fetch students in my class (same instructor)
    if (currentStudentInstructorId) {
      const myClassResponse = await fetch(`${API_BASE_URL}/students?instructorId=${currentStudentInstructorId}`);
      const myClassData = await myClassResponse.json();
      myClassStudents.value = myClassData.students || [];
      
      // Fetch total XP for each student in my class
      for (const student of myClassStudents.value) {
        student.rankXp = studentTotalXp(student);
        try {
          const xpResponse = await fetch(`${API_BASE_URL}/mission-scores/student/${student.id}/total-xp`);
          if (xpResponse.ok) {
            const xpData = await xpResponse.json();
            student.xp = xpData.totalXp || 0;
            student.completed = xpData.missionsCompleted || 0;
          }
        } catch (err) {
          console.warn(`Failed to fetch XP for student ${student.id}:`, err);
        }
      }
    } else {
      myClassStudents.value = [];
    }
    
    // Fetch all students (global)
    const globalResponse = await fetch(`${API_BASE_URL}/students`);
    const globalData = await globalResponse.json();
    allStudentsGlobal.value = globalData.students || [];
    if (globalData.rankSettings) {
      progressData.value.courseSettings = { ...progressData.value.courseSettings, ...globalData.rankSettings };
    }
    
    // Fetch total XP for each student globally
    for (const student of allStudentsGlobal.value) {
      student.rankXp = studentTotalXp(student);
      try {
        const xpResponse = await fetch(`${API_BASE_URL}/mission-scores/student/${student.id}/total-xp`);
        if (xpResponse.ok) {
          const xpData = await xpResponse.json();
          student.xp = xpData.totalXp || 0;
          student.completed = xpData.missionsCompleted || 0;
        }
      } catch (err) {
        console.warn(`Failed to fetch XP for student ${student.id}:`, err);
      }
    }
    
    // Fetch instructors to get their names
    const instructorsResponse = await fetch(`${API_BASE_URL}/instructors`);
    const instructorsData = await instructorsResponse.json();
    const instructorsList = instructorsData.instructors || [];
    
    // Create a map of instructorId -> instructor name
    const map = new Map();
    instructorsList.forEach(inst => {
      map.set(inst.id, inst.name || 'Unknown Instructor');
    });
    instructorsMap.value = map;
    
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
  }
}

// Fetch recent activities for instructor's students only
async function fetchInstructorRecentActivities() {
  try {
    const currentInstructorId = currentUser.value?.id;
    
    if (!currentInstructorId) {
      console.warn('⚠️ No instructor ID found');
      instructorRecentActivities.value = [];
      return;
    }
    
    console.log(`📊 Fetching recent activities for instructor: ${currentInstructorId}`);
    
    const response = await fetch(`${API_BASE_URL}/mission-scores/instructor/${currentInstructorId}/recent?limit=10`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch instructor activities: ${response.statusText}`);
    }
    
    const data = await response.json();
    instructorRecentActivities.value = data.activities || [];
    
    console.log(`✅ Loaded ${instructorRecentActivities.value.length} recent activities`);
  } catch (error) {
    console.error('Error fetching instructor recent activities:', error);
    instructorRecentActivities.value = [];
  }
}

/**
 * Calculate cross-track deviation (perpendicular distance from ideal route)
 * This measures how far the boat has deviated from the straight line to the waypoint
 * 
 * @param {number} boatX - Current boat X position
 * @param {number} boatZ - Current boat Z position
 * @param {Object} waypoint - Target waypoint with x, z coordinates
 * @returns {number} Deviation distance in meters (always positive)
 */
function calculateCrossTrackDeviation(boatX, boatZ, waypoint) {
  const zone = typeof waypoint === 'string' ? findWaypoint(trainingWaypoints.value, waypoint) : waypoint;
  const baseline = trainingStepBaseline.value;
  return crossTrackDistance({ x: boatX, z: boatZ },
    baseline && { x: baseline.boatX, z: baseline.boatZ }, zone);
}

// Calculate average quiz score for a student
function calculateStudentQuizAverage(studentId) {
  try {
    // Try to get quiz results from localStorage
    const storageKey = `boat_sim_progress_${studentId}`;
    const studentData = localStorage.getItem(storageKey);
    
    if (!studentData) return 0;
    
    const parsed = JSON.parse(studentData);
    const quizResults = parsed.quizResults || [];
    
    if (quizResults.length === 0) return 0;
    
    // Calculate average from all quiz results
    const totalScore = quizResults.reduce((sum, result) => sum + (result.score || 0), 0);
    const avgScore = Math.round(totalScore / quizResults.length);
    
    return avgScore;
  } catch (error) {
    console.error(`Error calculating quiz average for student ${studentId}:`, error);
    return 0;
  }
}

// Calculate average mission score for a student and update Firestore
async function calculateAndUpdateMissionScores(studentId) {
  try {
    // Fetch mission scores from Firestore instead of localStorage
    const response = await fetch(`${API_BASE_URL}/mission-scores/student/${studentId}/average`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch mission scores: ${response.statusText}`);
    }
    
    const data = await response.json();
    const { averageScore, completed, bestScore, totalAttempts } = data;
    
    console.log(`📊 Mission Stats from Firestore for ${studentId}:`, {
      averageScore,
      bestScore,
      completed,
      totalAttempts
    });
    
    // Update Firestore student document with computed averages
    const updateResponse = await fetch(`${API_BASE_URL}/students/${studentId}/scores`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        averageScore,
        completed,
        bestScore
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update scores: ${updateResponse.statusText}`);
    }
    
    const result = await updateResponse.json();
    console.log('✅ Firestore student scores updated:', result);
    
    // Update local demoStudent display
    if (currentUser.value?.id === studentId) {
      demoStudent.value.averageScore = averageScore;
      demoStudent.value.completed = completed;
      demoStudent.value.bestScore = bestScore;
    }
    
    return { averageScore, completed, bestScore };
  } catch (error) {
    console.error(`Error calculating/updating mission scores for student ${studentId}:`, error);
    return null;
  }
}

// Current instructor name for display
const currentInstructorName = computed(() => {
  const instructorId = currentUser.value?.instructorid;
  if (!instructorId) return 'Unknown Instructor';
  return instructorsMap.value.get(instructorId) || 'Unknown Instructor';
});

// My Class Leaderboard - Students under same instructor
const myClassLeaderboard = computed(() => {
  return myClassStudents.value
    .filter(s => s.status === 'active')
    .map(s => {
      const missionAvg = s.averageScore || 0;
      const quizAvg = calculateStudentQuizAverage(s.id);
      const combinedAvg = quizAvg > 0 ? Math.round((missionAvg + quizAvg) / 2) : missionAvg;
      
      return {
        id: s.id,
        name: s.name,
        xp: s.xp || 0,
        rank: deriveProgression(s.rankXp ?? studentTotalXp(s), progressData.value.courseSettings).rank.name,
        missionsCompleted: s.completed || 0,
        avgScore: combinedAvg,
        missionAvg: missionAvg,
        quizAvg: quizAvg,
        instructor: instructorsMap.value.get(s.instructorid) || 'Unknown'
      };
    })
    .sort((a, b) => {
      // Sort by XP (descending), then by missions completed (descending) as tiebreaker
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.missionsCompleted - a.missionsCompleted;
    });
});

// Global Leaderboard - All students from all instructors
const globalLeaderboard = computed(() => {
  return allStudentsGlobal.value
    .filter(s => s.status === 'active')
    .map(s => {
      const missionAvg = s.averageScore || 0;
      const quizAvg = calculateStudentQuizAverage(s.id);
      const combinedAvg = quizAvg > 0 ? Math.round((missionAvg + quizAvg) / 2) : missionAvg;
      
      return {
        id: s.id,
        name: s.name,
        xp: s.xp || 0,
        rank: deriveProgression(s.rankXp ?? studentTotalXp(s), progressData.value.courseSettings).rank.name,
        missionsCompleted: s.completed || 0,
        avgScore: combinedAvg,
        missionAvg: missionAvg,
        quizAvg: quizAvg,
        instructor: instructorsMap.value.get(s.instructorid) || 'Unknown'
      };
    })
    .sort((a, b) => {
      // Sort by XP (descending), then by missions completed (descending) as tiebreaker
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.missionsCompleted - a.missionsCompleted;
    });
});

// Current user's global rank information
const currentUserGlobalRank = computed(() => {
  const currentStudentId = currentUser.value?.id;
  if (!currentStudentId) return null;
  
  const global = globalLeaderboard.value;
  const index = global.findIndex(s => s.id === currentStudentId);
  
  if (index === -1) return null;
  
  return {
    rank: index + 1,
    xp: global[index].xp,
    avgScore: global[index].avgScore
  };
});

const studentBadgeList = computed(() => {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return [];
  return getStudentDisplayBadges(studentId, progressData.value, { ...currentUser.value, xp: totalXP.value });
});

const recentBadge = computed(() => {
  const list = studentBadgeList.value || [];
  const earned = list.filter((b) => b.earned && b.earnedAt).slice();
  if (!earned.length) return null;
  earned.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
  return earned[0];
});

const profileBadge = computed(() => {
  if (recentBadge.value) return recentBadge.value;
  const fallbackBadge = studentBadgeList.value.find(badge => badge.earned);
  return fallbackBadge
    ? fallbackBadge
    : { icon: '⚓', title: 'Welcome Aboard', earned: false, earnedAt: null, placeholder: true };
});

const studentCertificateList = computed(() => {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return [];
  return getStudentCertificates(studentId, progressData.value);
});

const totalXP = computed(() => {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return 0;
  
  const profile = progressData.value.studentProfiles?.[studentId];
  return studentTotalXp(currentUser.value?.xp !== undefined || currentUser.value?.total_xp !== undefined
    ? currentUser.value : profile);
});

const studentProgression = computed(() => deriveProgression(totalXP.value, progressData.value.courseSettings));
const currentRank = computed(() => studentProgression.value.rank);

// Rank badge states for display
const rankBadges = computed(() => studentProgression.value.rankCards);

const xpProgress = computed(() => studentProgression.value.xpProgress);

watch([studentProgression, studentBadgeList], ([progression, badges]) => {
  if (userRole.value !== 'student') return;
  Object.assign(demoStudent.value, {
    xp: progression.xp, rank: progression.rank.name,
    xpProgress: progression.xpProgress.percent, xpNextAt: progression.xpProgress.nextAt,
    badgesEarned: badges.filter(badge => badge.earned).length, badgesTotal: badges.length
  });
}, { immediate: true });

/**
 * Extra profile fields for the student dashboard header: ID, level, boat.
 */
const studentProfileExtras = computed(() => {
  const studentId = currentUser.value?.id;
  const progress = progressData.value;
  const record = (progress?.students ?? []).find((s) => s.id === studentId);
  const registered = (progress?.registeredUsers ?? []).find((u) => u.id === studentId);

  // Current level = 1 + highest module fully passed (m1-mission1..m1-mission4)
  const levelModules = ['m1-mission1', 'm1-mission2', 'm1-mission3', 'm1-mission4'];
  let highestCompleted = 0;
  for (let i = 0; i < levelModules.length; i++) {
    if (studentId && isModuleFullyPassed(studentId, levelModules[i], progress, getMissionsForModule)) {
      highestCompleted = i + 1;
    }
  }
  const currentLevel = highestCompleted >= levelModules.length
    ? `All ${levelModules.length} completed`
    : `Level ${Math.min(highestCompleted + 1, levelModules.length)}`;

  return {
    studentId: record?.studentId || registered?.studentId || currentUser.value?.studentId || '—',
    currentLevel,
    highestLevelCompleted: highestCompleted,
    boatSelected: record?.boatUsed || 'Commercial Trawler'
  };
});

const instructorStudents = computed(() => buildInstructorStudents(progressData.value));

/**
 * Students awaiting instructor approval (self-signed-up).
 */
const pendingStudentSignups = computed(() => {
  // Return pending students from Firestore
  return studentManagement.value?.students.filter(student => student.status === 'pending') ?? pendingStudentsFromFirestore.value;
});

/**
 * Check if current student has pending status
 */
const isStudentPending = computed(() => {
  return currentUser.value?.status === 'pending';
});

/**
 * Detailed student records for the instructor's "Student Records" tab.
 * Includes Boat Used, Current Level, Highest Score, Attempts, Completion Date, Status.
 * Merges localStorage students with Firestore students.
 */
const studentRecords = computed(() => {
  const progress = progressData.value;
  const sessions = progress?.sessions ?? [];
  const levelModules = ['m1-mission1', 'm1-mission2', 'm1-mission3', 'm1-mission4'];

  let allStudents = [];
  
  // For instructors: Only show Firestore students (already filtered by instructorId in backend)
  // For admins/students: Merge localStorage and Firestore students
  if (userRole.value === 'instructor') {
    // Instructors see ONLY their Firestore students (no localStorage merge)
    allStudents = allStudentsFromFirestore.value;
  } else {
    // Admin/Student: Merge localStorage and Firestore students (avoid duplicates by ID)
    const localStorageStudents = progress?.students ?? [];
    const firestoreStudents = allStudentsFromFirestore.value;
    const studentMap = new Map();
    
    // Add localStorage students first
    localStorageStudents.forEach(student => {
      studentMap.set(student.id, student);
    });
    
    // Add Firestore students (only if not already in map)
    firestoreStudents.forEach(student => {
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, student);
      }
    });
    
    allStudents = Array.from(studentMap.values());
  }

  return allStudents.map((student) => {
    const studentSessions = sessions.filter((s) => s.studentId === student.id);

    // Current level = highest level whose module is fully passed, +1 (next to attempt)
    let highestLevelCompleted = 0;
    for (let i = 0; i < levelModules.length; i++) {
      if (isModuleFullyPassed(student.id, levelModules[i], progress, getMissionsForModule)) {
        highestLevelCompleted = i + 1;
      }
    }
    const currentLevel = highestLevelCompleted === levelModules.length
      ? `Completed all ${levelModules.length}`
      : `Level ${highestLevelCompleted + 1}`;

    // Highest score across all sessions
    const highestScore = studentSessions.length
      ? Math.max(...studentSessions.map((s) => s.score ?? 0))
      : 0;

    // Total mission attempts (any session counts)
    const attempts = studentSessions.length;

    // Completion date = latest session completedAt (or empty)
    const latestSession = studentSessions.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )[0];
    const completionDate = latestSession?.completedAt || '';

    return {
      id: student.id,
      studentId: student.studentId || '—',
      name: student.name || 'Unknown',
      boatUsed: student.boatUsed || 'Commercial Trawler',
      currentLevel,
      highestLevelCompleted,
      highestScore,
      attempts,
      completionDate,
      status: student.status || 'active'
    };
  });
});

/**
 * Merge instructorStudents (score aggregates) with the raw students records so
 * the table shows Student ID, email, status, etc.
 */
const enrichedInstructorStudents = computed(() => {
  const rawById = new Map(
    (progressData.value?.students ?? []).map((s) => [s.id, s])
  );
  return instructorStudents.value.map((row) => {
    const raw = rawById.get(row.id) || {};
    return {
      ...row,
      studentId: raw.studentId || '',
      email: raw.email || '',
      status: raw.status || 'active',
      instructorId: raw.instructorId || ''
    };
  });
});

// The instructor overview always uses one read-only backend summary.
const instructorOverview = ref(null);
const instructorOverviewLoading = ref(false);
const instructorOverviewError = ref('');
let instructorOverviewRequest = 0;
async function fetchInstructorOverview() {
  const instructorId = currentUser.value?.id;
  const requestId = ++instructorOverviewRequest;
  if (userRole.value !== 'instructor') return;
  if (!instructorId) {
    instructorOverviewLoading.value = false;
    instructorOverviewError.value = 'Your instructor account could not be loaded. Please sign in again.';
    return;
  }
  instructorOverviewLoading.value = true;
  instructorOverviewError.value = '';
  try {
    const overview = await firebaseApi.getInstructorOverview(instructorId);
    if (requestId === instructorOverviewRequest && currentUser.value?.id === instructorId && userRole.value === 'instructor') {
      instructorOverview.value = overview;
    }
  } catch (error) {
    if (requestId === instructorOverviewRequest) {
      instructorOverviewError.value = 'Could not load class progress. Please try Refresh.';
    }
  } finally {
    if (requestId === instructorOverviewRequest) instructorOverviewLoading.value = false;
  }
}
// Reset and load in the same watcher. Login changes the role before the ID;
// separate watchers can reset/cancel the new request after it has started.
watch([() => currentUser.value?.id, userRole, activeScreen, instructorTab],
  ([instructorId, role, screen, tab], [previousId, previousRole] = []) => {
  if (instructorId !== previousId || role !== previousRole) {
    instructorOverviewRequest++;
    instructorOverview.value = null;
    instructorOverviewLoading.value = false;
    instructorOverviewError.value = '';
  }
  if (role === 'instructor' && screen === 'dashboard' && tab === 'overview') {
    fetchInstructorOverview();
  }
}, { immediate: true });
/**
 * Enhanced student records with training summary data
 * Includes missions completed/total and quizzes completed/total
 */
const enhancedStudentRecords = computed(() => {
  const records = studentRecords.value;
  
  return records.map(student => {
    const summary = studentTrainingSummaries.value.get(student.id);
    
    return {
      ...student,
      missionsCompleted: summary?.missions?.completed || 0,
      missionsTotal: summary?.missions?.total || trainingModules.value.length,
      missionScore: summary?.missions?.avgScore || (student.highestScore || 0),
      quizzesCompleted: summary?.quizzes?.completed || 0,
      quizzesTotal: summary?.quizzes?.total || 0,
      quizScore: summary?.quizzes?.avgScore || 0,
      latestActivity: summary?.latestActivity || student.completionDate || null
    };
  });
});

const instructorRecentSessions = computed(() => {
  // Use Firestore data instead of localStorage
  return instructorRecentActivities.value.map(activity => ({
    id: activity.id,
    studentName: activity.studentName,
    mission: activity.missionTitle,
    score: activity.score,
    passed: activity.passed
  }));
});
const instructorStats = computed(() => buildInstructorStats(progressData.value));
const adminInstructors = computed(() => getInstructorsWithStudents(progressData.value));

const navigationMissions = [];

// Core Navigation Skill Modules for Fisheries Students
const trainingModules = ref([]);

const activeTrainingModule = ref(null);
const currentTrainingStep = ref(0);
const isTrainingReviewMode = ref(false);

// Expose mission state for global hotkey checks (like inventory)
window.isMissionActive = () => !!activeTrainingModule.value;
window.isFishingDisabled = () => false; // Fishing now enabled in all missions

const activeMission = ref(null);
const trainingProgress = ref({});
const trainingStepBaseline = ref(null);
const trainingStepStartedAt = ref(0);
const trainingRunMetrics = ref(createTrainingRunMetrics());
const trainingElapsedTick = ref(0);
const trainingWaypoints = ref([]);
const interactionReadyStep = ref(null);

const stats = ref({
  speedKnots: 0,
  rotationDeg: 0,
  yPos: 0,
  rollDeg: 0,
  pitchDeg: 0,
  boatX: SIMULATION_SPAWN.x,
  boatZ: SIMULATION_SPAWN.z,
  state: 'NORMAL'
});

const physics = ref({
  thrustForce: 11.0,
  dragCoefficient: 0.13,
  waterReactionForce: 0.008,
  mass: 390,
  decelerationRate: 0.968,
  waveAmplitude: 1.2,
  waveFrequency: 1.25,
  windForce: 0.05,
  sinkingThreshold: 620,
  waterlineOffset: -6.0
});

// Flag set when Three.js scene is created to avoid calling scene-dependent
// functions too early during component setup.
let sceneInitialized = false;

// Apply difficulty stored in progressData on load (now that `physics` exists)
try {
  if (progressData.value?.courseSettings?.difficultyLevel) {
    difficultyLevel.value = progressData.value.courseSettings.difficultyLevel;
  }
  applyDifficultyEffects();
} catch (err) {
  console.warn('[HelmQuest] applyDifficultyEffects on load failed', err);
}

/**
 * Boat type profiles — same controls, only speed/turning/acceleration differ.
 * Boosted speed, throttle response and turning for quicker simulation testing.
 * Braking scales with the higher speed limits to keep stopping manageable.
 */
const BOAT_TYPES = {
  small: {
    id: 'small',
    name: 'Small Boat',
    icon: '🛶',
    tagline: 'Easy · Fast turning',
    description: 'Nimble and forgiving. Perfect for beginners learning the basics.',
    handling: 'Easy',
    modelFile: '/assets/SmallBoat.glb',
    maxSpeedKnots: 60,
    maxReverseKnots: 3,
    accelerationTimeTo90: 2,
    reverseTimeTo90: 3,
    coastTimeConstant: 12,
    brakingDeceleration: 0.8,
    maxTurnDegreesPerSecond: 24,
    massMult: 0.55,
    waterlineOffset: -0.10,  // Small boat needs to float ABOVE water surface
    wavePhaseOffset: 0.3
  },
  medium: {
    id: 'medium',
    name: 'Medium Boat',
    icon: '🛳️',
    tagline: 'Balanced',
    description: 'A well-rounded vessel. The standard for training missions.',
    handling: 'Balanced',
    modelFile: '/assets/trawler (1).glb',
    maxSpeedKnots: 40,
    maxReverseKnots: 3,
    accelerationTimeTo90: 3,
    reverseTimeTo90: 4,
    coastTimeConstant: 25,
    brakingDeceleration: 0.65,
    maxTurnDegreesPerSecond: 14,
    massMult: 1.0,
    waterlineOffset: -6.0,
    wavePhaseOffset: 0       // No phase offset (baseline)
  },
  large: {
    id: 'large',
    name: 'Large Boat',
    icon: '🚢',
    tagline: 'Slow turning · Hard docking',
    description: 'Powerful but sluggish. Requires patience and precise handling.',
    handling: 'Hard',
    modelFile: '/assets/BigBoat.glb',
    maxSpeedKnots: 45,
    maxReverseKnots: 4,
    accelerationTimeTo90: 4,
    reverseTimeTo90: 6,
    coastTimeConstant: 55,
    brakingDeceleration: 0.4,
    maxTurnDegreesPerSecond: 8,
    massMult: 1.9,
    waterlineOffset: -0.6,
    wavePhaseOffset: 0.7     // Different phase offset
  }
};

const selectedBoatType = ref('medium');

const boatTypeList = Object.values(BOAT_TYPES);
const fastestBoatSpeedKnots = Math.max(...boatTypeList.map(type => type.maxSpeedKnots));
const fastestBoatTurnDegreesPerSecond = Math.max(...boatTypeList.map(type => type.maxTurnDegreesPerSecond));

/**
 * Select a boat and immediately launch Quick Sail with its physics profile.
 */
function chooseBoatAndSail(typeId) {
  applyBoatTypePhysics(typeId);
  persistStudentBoat(typeId);
  startQuickSailWithBoat();
}

/**
 * Start quick sail and ensure the selected boat GLB is loaded in the scene.
 * If Three.js is already initialized, reload the boat model immediately.
 * Otherwise, normal initThree flow will pick up activeBoatModelFile.
 */
function startQuickSailWithBoat() {
  performanceManager.cancelMission();
  simulationWeatherPreset.value = 'day';
  stormMode.value = false;
  calmWeatherSnapshot = null;
  wind.value.speed = 0.1;
  applyBoatWavePhysics(selectedBoatType.value);
  onWaterParamChange();
  isQuickSailMode.value = true;
  showCinematicLoading.value = true;
  loadingHint.value = 'Deploying vessel...';

  const enterSimulation = async () => {
    showCinematicLoading.value = false;
    goToScreen('simulation');
    await syncWorldForSimulation();
    // Reload the selected boat model now that the scene is active
    if (scene && boatObject) {
      await swapBoatModel(activeBoatModelFile.value);
    }
  };

  Promise.resolve(archipelagoLoadPromise)
    .then(enterSimulation)
    .catch((err) => {
      console.error('Archipelago not ready for Quick Sail:', err);
      enterSimulation();
    });
}

/**
 * Hot-swap the current boat model with the GLB at the given path.
 * Falls back to the procedural trawler if the GLB fails to load.
 */
let boatSwapVersion = 0;
async function swapBoatModel(modelPath) {
  if (!scene || !modelPath) {
    console.error('[swapBoatModel] Cannot swap - scene:', !!scene, 'modelPath:', modelPath);
    return;
  }
  const version = ++boatSwapVersion;

  try {
    console.log('[swapBoatModel] === STARTING BOAT SWAP ===');
    console.log('[swapBoatModel] Target model path:', modelPath);
    console.log('[swapBoatModel] Current boatObject exists:', !!boatObject);
    console.log('[swapBoatModel] Scene fog before swap:', scene.fog);
    console.log('[swapBoatModel] Camera position before swap:', camera?.position);
    
    const model = await loadBoatModel(modelPath);
    if (version !== boatSwapVersion) {
      disposeBoatModel(model);
      return;
    }
    console.log('[swapBoatModel] Model loaded successfully:', !!model);
    console.log('[swapBoatModel] Model position:', model?.position);
    
    const previousBoat = boatObject;
    // Remove existing boat from scene
    if (boatObject?.parent) {
      console.log('[swapBoatModel] Removing old boat from scene');
      scene.remove(boatObject);
    }
    boatObject = model;
    console.log('[swapBoatModel] New boatObject assigned');
    
    console.log('[swapBoatModel] Scene fog after swap:', scene.fog);
    console.log('[swapBoatModel] Ocean object exists:', !!ocean);
    console.log('[swapBoatModel] Sky object exists:', !!sky);
    console.log('[swapBoatModel] Scene children count:', scene.children.length);
    
    finalizeSpawnedBoat(modelPath);
    disposeBoatModel(previousBoat);
    console.log('[swapBoatModel] === BOAT SWAP COMPLETE ===');
  } catch (err) {
    console.error(`[swapBoatModel] FAILED to load boat GLB (${modelPath}):`, err);
    console.error('[swapBoatModel] Error stack:', err.stack);
    // Keep whatever is already in the scene
  }
}

/**
 * Save the boat type on the student's record so it shows in reports/records.
 */
function persistStudentBoat(typeId) {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return;
  const boatName = BOAT_TYPES[typeId]?.name || 'Medium Boat';
  const progress = progressData.value;
  const rec = (progress?.students ?? []).find((s) => s.id === studentId);
  if (rec) {
    rec.boatUsed = boatName;
    saveProgress(progress);
  }
}

// Keep the Beginner sea state, then increase swell with mission weather.
function applyBoatWavePhysics(typeId) {
  const t = BOAT_TYPES[typeId] || BOAT_TYPES.medium;
  const profile = LEVEL_WEATHER_PROFILES[stormMode.value ? 3 : simulationWeatherPreset.value === 'cloudy' ? 2 : 1];
  physics.value.waveAmplitude = Math.max(
    profile.minimumAmplitude, 0.85 * profile.amplitudeScale
  );
  physics.value.waveFrequency = Math.max(
    profile.minimumFrequency, 1.2 * profile.frequencyScale
  );
  physics.value.wavePhaseOffset = t.wavePhaseOffset ?? 0;
}

/**
 * Apply the selected hull's mass, waterline and sea-state response.
 * Same controls, different feel. The sinking threshold scales with mass so a
 * larger boat can still carry cargo before triggering the sinking alarm.
 */
function applyBoatTypePhysics(typeId) {
  const t = BOAT_TYPES[typeId] || BOAT_TYPES.medium;
  const newMass = 390 * t.massMult;
  physics.value.thrustForce = 11.0;
  physics.value.dragCoefficient = 0.13;
  physics.value.mass = newMass;
  physics.value.waterReactionForce = 0.008;
  physics.value.sinkingThreshold = Math.max(620, newMass * 1.6);
  
  // Apply boat-specific waterline offset and wave physics
  physics.value.waterlineOffset = t.waterlineOffset !== undefined ? t.waterlineOffset : -6.0;
  applyBoatWavePhysics(t.id);
  
  selectedBoatType.value = t.id;
  // Set the model file so initThree uses the right GLB for this boat type
  activeBoatModelFile.value = t.modelFile || '/assets/trawler (1).glb';
  // Clear any lingering sinking state
  isSinking = false;
  sinkingTimer = 0;
  if (stats.value.state === 'SINKING!') stats.value.state = 'NORMAL';
  onWaterParamChange();
  
  console.log(`[applyBoatTypePhysics] Boat: ${t.name}, waterlineOffset: ${physics.value.waterlineOffset}m, waveAmp: ${physics.value.waveAmplitude.toFixed(2)}m, waveFreq: ${physics.value.waveFrequency.toFixed(2)}, phase: ${physics.value.wavePhaseOffset.toFixed(2)}`);
}

const wind = ref({
  speed: 0.1,
  directionAngle: 90 // Degrees
});

const anchor = ref({
  deployed: false,
  deploying: false,
  retracting: false,
  chainLength: 0,
  maxChainLength: 50,
  position: new THREE.Vector3(0, 0, 0)
});

// Alt key state for cursor visibility
const altKeyPressed = ref(false);

// Anchor warning state
const anchorWarning = ref(false);
const collisionWarning = ref('');
const fishingFishCount = ref(0);
const fishingLineActive = ref(false);
const fishingToast = ref(null);
let fishingToastTimer = null;
const weatherNotice = ref('');
let weatherNoticeTimer = null;
let islandWarningTimerId = null;

// Track if in Quick Sail mode (no achievements)
const isQuickSailMode = ref(false);

// Firestore Training Records Data
const firestoreMissionScores = ref([]);
const firestoreQuizSubmissions = ref([]);
const loadingTrainingRecords = ref(false);
const missionRecordsError = ref('');
const quizRecordsError = ref('');
let trainingRecordsRequest = 0;
const trainingRecordsTab = ref('missions'); // Tab within training records: 'missions' or 'quizzes'

watch([() => currentUser.value?.id, userRole], () => {
  trainingRecordsRequest += 1;
  firestoreMissionScores.value = [];
  firestoreQuizSubmissions.value = [];
  missionRecordsError.value = '';
  quizRecordsError.value = '';
  loadingTrainingRecords.value = false;
  if (activeScreen.value === 'dashboard' && userRole.value === 'student') {
    fetchStudentTrainingRecords();
  }
});

// --- Constants ---
const BOAT_TARGET_LENGTH_METERS = 88.0; // Medium trawler LOA base

// Active boat model — changes when the player picks a boat type
const activeBoatModelFile = ref('/assets/trawler (1).glb');

// Chase cam offsets in boat local space (bow = +X); scaled to LOA in applyChaseCameraScale
const _chaseOffsetBehind = new THREE.Vector3();
const _chaseOffsetLook = new THREE.Vector3();
const _chasePosScratch = new THREE.Vector3();
const _chaseLookScratch = new THREE.Vector3();
const _helmPosScratch = new THREE.Vector3();
const _helmLookScratch = new THREE.Vector3();
const _cameraLookScratch = new THREE.Vector3();
const _cameraRightScratch = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _boatForward = new THREE.Vector3();
const _boatRight = new THREE.Vector3();

// Mouse-look offset (camera only — does not rotate the boat)
let cameraLookYaw = 0;
let cameraLookPitch = 0;
let lastMouseLookX = 0;
let lastMouseLookY = 0;
let mouseLookReady = false;
let teardownMouseLook = null;
const MOUSE_LOOK_SENSITIVITY = 0.003;
const MOUSE_LOOK_YAW_LIMIT = THREE.MathUtils.degToRad(85);
const MOUSE_LOOK_PITCH_LIMIT = THREE.MathUtils.degToRad(40);

// --- Three.js Variables ---
let appRoot = ref(null);
let canvasContainer = ref(null);
let audioPlayer = ref(null);
let renderer, scene, camera, camera2, orbitControls;
let ocean, sky, sun;
let ambientLight, mainLight;
let islandGroup;
let shorelineSystem = null;
let boatWakeSystem = null;
let bowSpraySystem = null;
let postProcessing = null;
let fishingLineSystem = null;
let fishingSpotMarkers = null;
let rainWeatherSystem = null;
let calmWeatherSnapshot = null;
let harborDockGroup = null;
let sceneGltfLoader = null;
/** Resolves when the archipelago GLTF is in the scene (Quick Sail waits on this). */
let archipelagoLoadPromise = null;
let helmCockpit = null;
let helmRadarDisplay = null;
let helmRadarBoat = null;
let helmRadarSourceCanvas = null;
const helmRadarReady = ref(false);
let helmHud = null;
const helmRadarCanvas = ref(null);
const helmChartCanvas = ref(null);
const tacticalChartCanvas = ref(null);
const mapCanvas = ref(null);
let tacticalChartCtx = null;
let tacticalChartCanvasEl = null;
let mapCanvasCtx = null;
let mapCanvasEl = null;

// Top-down orthographic camera for realistic navigation map
let mapOrthoCamera = null;
let mapRenderTarget = null;

let geoJsonData = null;
let geoJsonBounds = null; // { minLon, maxLon, minLat, maxLat }
let environmentPreset = 'day';
let landingCinematicTime = 0;
let landingBoatPoseActive = false;
const LANDING_BOAT_X = 32;
const LANDING_BOAT_Z = 50;
const DEFAULT_CAMERA_FOV = 62;
const LANDING_CAMERA_FOV = 42;
const _landingFocus = new THREE.Vector3();
const _landingLookAt = new THREE.Vector3();
let boatObject = null; // Main physics container
let boatAnchorRig = null;
let anchorMesh = null; // Fallback when GLB has no anchor rig
let waypointMarkerGroup = null;
let animationFrameId = null;
let clockIntervalId = null;
let exitHoldTimerId = null;
let animationFrameCounter = 0;
let lastTacticalUpdateAt = 0;
let lastTrainingUpdateAt = 0;
let lastHudUpdateAt = 0;
let lastWaypointUpdateAt = 0;
const SIM_TACTICAL_INTERVAL_MS = 120;
const SIM_TRAINING_INTERVAL_MS = 120;
const SIM_HUD_INTERVAL_MS = 120;
const SIM_WAYPOINT_INTERVAL_MS = 120;

// Sinking physics trackers
let speedVel = 0; // metres/second
let speedRot = 0; // radians/second
let angularVelocity = 0;
let turnRadius = 0;
let turnTilt = 0; // banking lean from turning, blended with wave roll (not overwritten)
let isStopping = false;
let isSinking = false;
let sinkingTimer = 0;
let baselineWaterlineY = 13;

// Input Key States
const keyStates = {};

// Engine state: must be started before the boat can move
const engineRunning = ref(false);
const engineStarting = ref(false);

// Custom Speedometer Styling
const speedKnotsText = computed(() => {
  return Math.abs(stats.value.speedKnots).toFixed(1);
});

/** Nautical heading: 0° = North (-Z), 90° = East (+X), clockwise. */
function boatHeadingDegrees(rotationYRad, { round = false } = {}) {
  // Add comprehensive NaN validation for rotation input
  if (rotationYRad === null || rotationYRad === undefined || !Number.isFinite(rotationYRad)) {
    // console.warn('Invalid rotation input to boatHeadingDegrees:', rotationYRad);
    return round ? 0 : 0.0; // Return safe fallback without spam
  }
  
  const deg = 90 - THREE.MathUtils.radToDeg(rotationYRad);
  
  // Validate intermediate result
  if (!Number.isFinite(deg)) {
    return round ? 0 : 0.0;
  }
  
  const wrapped = ((deg % 360) + 360) % 360;
  
  // Validate final result
  if (!Number.isFinite(wrapped)) {
    return round ? 0 : 0.0;
  }
  
  return round ? Math.round(wrapped) : wrapped;
}

function boatRotationToCompassHeading(rotationYRad) {
  return boatHeadingDegrees(rotationYRad, { round: true });
}

const COMPASS_MARK_WIDTH_PX = 52;
const COMPASS_MARK_STEP_DEG = 15;

const compassStripViewportRef = ref(null);
const compassStripViewportWidth = ref(420);

// Unwrapped degrees for visuals (359 -> 360 -> 361) so HUD never spins at north.
const compassContinuousDeg = ref(0);
let lastWrappedHeading = 0;
let compassVisualSynced = false;

const headingDeg = computed(() => stats.value.rotationDeg);
const headingText = computed(() => {
  const heading = headingDeg.value;
  if (!Number.isFinite(heading)) {
    return '0'; // Safe fallback for NaN/undefined
  }
  return String(heading);
});

const gpsCoords = computed(() => {
  const gps = worldToGps(stats.value.boatX * 0.001, stats.value.boatZ * 0.001);
  return {
    lat: gps.lat.toFixed(4),
    lon: gps.lon.toFixed(4)
  };
});

function markDisplayDeg(deg) {
  return ((Math.round(deg) % 360) + 360) % 360;
}

function cardinalLabel(deg) {
  const normalized = markDisplayDeg(deg);
  if (normalized === 0) return 'N';
  if (normalized === 90) return 'E';
  if (normalized === 180) return 'S';
  if (normalized === 270) return 'W';
  return '';
}

function markCenterPx(deg) {
  return (deg / COMPASS_MARK_STEP_DEG) * COMPASS_MARK_WIDTH_PX + COMPASS_MARK_WIDTH_PX / 2;
}

function shortestHeadingDelta(fromDeg, toDeg) {
  let delta = toDeg - fromDeg;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function syncCompassVisualHeading(wrappedHeading, { force = false } = {}) {
  if (force || !compassVisualSynced) {
    compassContinuousDeg.value = wrappedHeading;
    lastWrappedHeading = wrappedHeading;
    compassVisualSynced = true;
    return;
  }

  const delta = shortestHeadingDelta(lastWrappedHeading, wrappedHeading);
  compassContinuousDeg.value += delta;
  lastWrappedHeading = wrappedHeading;
}

const COMPASS_STRIP_WINDOW_DEG = 250;

const compassStripMarks = computed(() => {
  const h = compassContinuousDeg.value;
  const start = Math.floor((h - COMPASS_STRIP_WINDOW_DEG) / COMPASS_MARK_STEP_DEG) * COMPASS_MARK_STEP_DEG;
  const end = Math.floor((h + COMPASS_STRIP_WINDOW_DEG) / COMPASS_MARK_STEP_DEG) * COMPASS_MARK_STEP_DEG;
  const marks = [];
  for (let d = start; d <= end; d += COMPASS_MARK_STEP_DEG) {
    marks.push(d);
  }
  return marks;
});

const compassStripTranslatePx = computed(() => {
  return compassStripViewportWidth.value / 2 - markCenterPx(compassContinuousDeg.value);
});

const compassStripTrackWidthPx = computed(() => {
  const marks = compassStripMarks.value;
  if (!marks.length) return compassStripViewportWidth.value;
  const maxCenter = markCenterPx(marks[marks.length - 1]);
  return Math.max(compassStripViewportWidth.value, maxCenter + COMPASS_MARK_WIDTH_PX);
});

function updateCompassStripViewportWidth() {
  if (compassStripViewportRef.value) {
    compassStripViewportWidth.value = compassStripViewportRef.value.clientWidth;
  }
}

const speedMsText = computed(() => (Math.abs(stats.value.speedKnots) / 1.94384).toFixed(1));

const clockText = computed(() => {
  const d = new Date(nowTick.value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
});

const anchorHudTitle = computed(() => {
  if (anchor.value.deploying) return 'Anchor deploying (H)';
  if (anchor.value.retracting) return 'Anchor retracting (H)';
  if (anchor.value.deployed) return 'Retract anchor (H)';
  return 'Deploy anchor (H)';
});

const fishingInZone = computed(
  () => getFishingSpotAt(stats.value.boatX, stats.value.boatZ) != null
);

const fishingHudTitle = computed(() => {
  const spot = getFishingSpotAt(stats.value.boatX, stats.value.boatZ);
  if (fishingLineActive.value) {
    return spot
      ? `Net out at ${spot.label} (F)`
      : `Retrieving net (F) · ${fishingFishCount.value} fish`;
  }
  if (spot) return `Fish here: ${spot.label} (F)`;
  const near = getNearestFishingSpot(stats.value.boatX, stats.value.boatZ);
  if (near) {
    return `Nearest grounds: ${near.spot.label} (${Math.round(near.distance)} m)`;
  }
  return `Sail to fishing grounds (F) · ${fishingFishCount.value} caught`;
});

const speedGaugeStyle = computed(() => {
  const circumference = 2 * Math.PI * 45; // 282.7
  const maxSpeed = (BOAT_TYPES[selectedBoatType.value] || BOAT_TYPES.medium).maxSpeedKnots;
  const currentSpeed = Math.min(Math.abs(stats.value.speedKnots), maxSpeed);
  const percentage = currentSpeed / maxSpeed;
  const offset = circumference * (1 - percentage);
  return {
    strokeDasharray: circumference,
    strokeDashoffset: offset
  };
});

const currentMissionTitle = computed(() => {
  if (activeTrainingModule.value && isAuthenticated.value) return activeTrainingModule.value.title;
  if (isQuickSailMode.value) return 'Quick Sail';
  return 'Free Navigation';
});

const currentMissionObjective = computed(() => {
  if (isQuickSailMode.value) {
    return 'Explore the gulf: WASD to drive, C for camera. Amber rings on the radar mark fishing spots — sail inside one, then press F to deploy your net.';
  }
  if (!activeTrainingModule.value) {
    return 'Explore freely: WASD to drive, move the mouse over the view to look around, C to switch camera.';
  }
  return activeTrainingModule.value.description;
});

// Training Module Computed Properties
const currentInteractionPrompt = computed(() => {
  if (activeMiniGame.value || gearInfoPopup.value) return null;
  if (!activeTrainingModule.value || activeScreen.value !== 'simulation') return null;
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];
  if (!step?.requireInteraction || !step?.waypointZone) return null;

  const zones = resolveTrainingZonesAtSpawn();
  const zone = findWaypoint(zones, step.waypointZone);
  if (!zone) return null;

  const stepKey = `${currentTrainingStep.value}:${step.waypointZone}`;
  const inZone = isBoatInZone(stats.value.boatX, stats.value.boatZ, zone);
  if (!inZone && interactionReadyStep.value !== stepKey) return null;

  if (step.requireInteraction === 'photograph') {
    const buoy = activeTrainingModule.value?.buoys?.find(b => b.waypointZone === step.waypointZone);
    return `Press [Q] to Photograph ${buoy?.name || 'Buoy'}`;
  }
  if (step.requireInteraction === 'verify_id') {
    const buoy = activeTrainingModule.value?.buoys?.find(b => b.waypointZone === step.waypointZone);
    return `Press [Q] to Verify ${buoy?.name || 'Buoy'} ID`;
  }
  if (step.requireInteraction === 'remove_debris') {
    const buoy = activeTrainingModule.value?.buoys?.find(b => b.waypointZone === step.waypointZone);
    return `Press [Q] to Clear Debris from ${buoy?.name || 'Buoy'}`;
  }
  if (step.requireInteraction === 'inspect_buoy') return 'Press [Q] to Inspect Buoy';
  if (step.requireInteraction === 'inspect_marker') return 'Press [Q] to Inspect Marker';
  if (step.requireInteraction === 'verify_patrol') return 'Press [Q] to Verify Patrol Point';
  return 'Press [Q] to Interact';
});

const currentStepInstruction = computed(() => {
  if (!activeTrainingModule.value) return '';
  
  // Use missionSteps if available (human-readable instructions)
  if (activeTrainingModule.value.missionSteps && activeTrainingModule.value.missionSteps.length > 0) {
    const missionStep = activeTrainingModule.value.missionSteps[currentTrainingStep.value];
    return missionStep ? missionStep.text : '';
  }
  
  // Fallback to old steps format
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];
  return step ? step.instruction : '';
});

// The buoy ID to type in during verify_id — set randomly at mission start
const currentBuoyVerifyId = computed(() => {
  if (!activeTrainingModule.value) return null;
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];
  return step?.buoyId ?? null;
});

const currentWaypointHint = computed(() => {
  if (!activeTrainingModule.value || !boatObject) return '';
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];
  if (!step?.waypointZone) return '';

  const zones = resolveTrainingZonesAtSpawn();
  const zone = findWaypoint(zones, step.waypointZone);
  if (!zone) return '';

  const boatPos = { x: stats.value.boatX, z: stats.value.boatZ };
  const dist = distanceToZoneEdge(boatPos.x, boatPos.z, zone);
  const inside = isBoatInZone(boatPos.x, boatPos.z, zone);
  const coach = getTrainingCoachHint(step, {
    stats: stats.value,
    boatPosition: boatPos,
    waypoints: zones,
    headingHold: trainingHeadingHold.value
  });

  const base = getZoneStepHint(zone, inside, dist, step, stats.value);
  return coach ? `${base}\n${coach}` : base;
});

// Check if boat is in port/harbor zone
const isBoatInPortZone = computed(() => {
  if (!activeTrainingModule.value || !boatObject) {
    console.log('[Quiz Button Debug] No active module or boat object');
    return false;
  }
  
  // Find the port/harbor waypoint (usually the last one or labeled as 'harbor'/'port')
  const zones = resolveTrainingZonesAtSpawn();
  console.log('[Quiz Button Debug] All zones:', zones.map(z => ({ id: z.id, label: z.label })));
  
  const portZone = zones.find(z => 
    z.id === 'harbor' || 
    z.label?.toLowerCase().includes('port') || 
    z.label?.toLowerCase().includes('harbor') ||
    z.label?.toLowerCase().includes('return')
  );
  
  console.log('[Quiz Button Debug] Port zone found:', portZone);
  
  if (!portZone) {
    console.log('[Quiz Button Debug] No port zone found in zones');
    return false;
  }
  
  // Check if boat is inside the port zone
  const inZone = isBoatInZone(stats.value.boatX, stats.value.boatZ, portZone);
  console.log('[Quiz Button Debug] Boat position:', { x: stats.value.boatX, z: stats.value.boatZ }, 'In zone:', inZone);
  return inZone;
});

// Computed to check if quiz button should show (for debugging)
const shouldShowQuizButton = computed(() => {
  const conditions = {
    anchorDeployed: anchor.value.deployed,
    activeModule: !!activeTrainingModule.value,
    notShowingQuiz: !showPostDockingQuiz.value,
    engineOff: !engineRunning.value,
    inPortZone: isBoatInPortZone.value
  };
  console.log('[Quiz Button Conditions]', conditions);
  const result = conditions.anchorDeployed && conditions.activeModule && conditions.notShowingQuiz && conditions.engineOff && conditions.inPortZone;
  console.log('[Quiz Button] Should show:', result);
  return result;
});
const activeWaypointCompass = computed(() => {
  if (!activeTrainingModule.value || !boatObject) return null;
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];
  if (!step?.waypointZone) return null;

  const zone = findWaypoint(resolveTrainingZonesAtSpawn(), step.waypointZone);
  if (!zone) return null;

  const dx = zone.x - stats.value.boatX;
  const dz = zone.z - stats.value.boatZ;
  const bearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
  const rel = ((bearing - stats.value.rotationDeg + 540) % 360) - 180;
  const dist = distanceToZoneEdge(stats.value.boatX, stats.value.boatZ, zone);

  return {
    rel,
    dist,
    inside: isBoatInZone(stats.value.boatX, stats.value.boatZ, zone),
    label: `${zone.label}: ${formatDistanceMeters(dist)}`
  };
});

const waypointDotStyle = computed(() => {
  const wp = activeWaypointCompass.value;
  if (!wp) return { display: 'none' };
  const angleRad = (wp.rel * Math.PI) / 180;
  const x = Math.sin(angleRad);
  const y = -Math.cos(angleRad);
  return {
    transform: `translate(calc(-50% + ${x} * var(--waypoint-compass-radius, 46px)), calc(-50% + ${y} * var(--waypoint-compass-radius, 46px)))`,
    opacity: wp.inside ? 0.55 : 1
  };
});

const activeWaypointDistanceLabel = computed(() => {
  const wp = activeWaypointCompass.value;
  if (!wp) return '';
  return wp.inside ? 'IN ZONE' : formatDistanceMeters(wp.dist);
});

function getTrainingNavOverlay() {
  if (!activeTrainingModule.value) return null;
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];
  if (!step?.waypointZone) return null;

  const zone = findWaypoint(resolveTrainingZonesAtSpawn(), step.waypointZone);
  if (!zone) return null;

  const dist = distanceToZoneEdge(stats.value.boatX, stats.value.boatZ, zone);
  const inside = isBoatInZone(stats.value.boatX, stats.value.boatZ, zone);

  return {
    boatX: stats.value.boatX,
    boatZ: stats.value.boatZ,
    targetX: zone.x,
    targetZ: zone.z,
    targetLabel: zone.label,
    distanceLabel: inside ? 'IN ZONE' : formatDistanceMeters(dist)
  };
}

// ==========================================
// MISSION PANEL DATA
// ==========================================
const missionPanelData = computed(() => {
  if (!activeTrainingModule.value) return null
  
  const module = activeTrainingModule.value
  const buoys = module.buoys || []
  const currentStep = currentTrainingStep.value
  
  // Count completed buoys
  const completedBuoys = trainingRunMetrics.value?.waypointsReached || 0
  const totalBuoys = buoys.length
  
  // Get current objective
  const step = module.steps[currentStep]
  const currentObjective = step ? {
    name: getBuoyName(step.waypointZone, buoys),
    distance: currentWaypointHint.value?.distanceKm 
      ? `${currentWaypointHint.value.distanceKm} km` 
      : null,
    bearing: currentWaypointHint.value?.bearingDeg 
      ? `${Math.round(currentWaypointHint.value.bearingDeg)}°` 
      : null,
    action: step.requireInteraction || null,
    actionLabel: getActionLabel(step.requireInteraction),
    canInteract: !!currentInteractionPrompt.value
  } : null
  
  // Generate dynamic checklist
  const checklistItems = generateMissionChecklist(module, currentStep, completedBuoys)
  
  return {
    missionNumber: getMissionNumber(module.id),
    missionTitle: module.title,
    buoysCompleted: completedBuoys,
    totalBuoys: totalBuoys,
    currentObjective,
    checklistItems
  }
})

// Current buoy interaction data
const currentBuoyInteraction = computed(() => {
  if (!activeTrainingModule.value) return null
  const step = activeTrainingModule.value.steps[currentTrainingStep.value]
  if (!step?.requireInteraction) return null
  
  return {
    action: step.requireInteraction,
    buoyName: getBuoyName(step.waypointZone, activeTrainingModule.value.buoys)
  }
})

// ==========================================
// MISSION UI HELPER FUNCTIONS
// ==========================================

/**
 * Get mission number from ID (e.g., "m1-mission1" -> "01")
 */
function getMissionNumber(missionId) {
  const match = missionId?.match(/mission(\d+)/)
  return match ? String(match[1]).padStart(2, '0') : '01'
}

/**
 * Get buoy name from waypoint zone
 */
function getBuoyName(waypointZone, buoys) {
  if (!buoys) return 'Checkpoint'
  const buoy = buoys.find(b => b.waypointZone === waypointZone)
  return buoy?.name || 'Checkpoint'
}

/**
 * Get action label for interaction type
 */
function getActionLabel(actionType) {
  const labels = {
    photograph: 'Photograph',
    verify_id: 'Verify ID',
    remove_debris: 'Clear Debris',
    inspect: 'Inspect'
  }
  return labels[actionType] || 'Interact'
}

/**
 * Generate dynamic mission checklist
 */
function generateMissionChecklist(module, currentStep, completedBuoys) {
  const items = []
  const buoys = module.buoys || []
  const steps = module.steps || []
  
  // Add all buoy steps dynamically
  buoys.forEach((buoy, index) => {
    const buoyStep = steps.find(s => s.waypointZone === buoy.waypointZone)
    if (!buoyStep) return
    
    const stepIndex = steps.indexOf(buoyStep)
    const status = stepIndex < currentStep ? 'complete' 
      : stepIndex === currentStep ? 'active' 
      : 'pending'
    
    items.push({
      type: 'buoy',
      label: buoy.name || `Buoy ${index + 1}`,
      status
    })
  })
  
  // Add fixed final steps
  const allBuoysDone = completedBuoys >= buoys.length
  
  // Return to Port
  items.push({
    type: 'port',
    label: 'Return to Port',
    status: allBuoysDone && !trainingRunFinished.value ? 'active' 
      : trainingRunFinished.value ? 'complete' 
      : 'pending'
  })
  
  // Stop Engine
  items.push({
    type: 'engine',
    label: 'Stop Engine',
    status: !engineRunning.value && anchor.value.deployed ? 'complete'
      : allBuoysDone && !engineRunning.value ? 'complete'
      : allBuoysDone ? 'active'
      : 'pending'
  })
  
  // Drop Anchor
  items.push({
    type: 'anchor',
    label: 'Drop Anchor',
    status: anchor.value.deployed ? 'complete'
      : !engineRunning.value && allBuoysDone ? 'active'
      : 'pending'
  })
  
  return items
}

/**
 * Show mission briefing before starting
 */
function showMissionBriefingScreen(mission) {
  console.log('[DEBUG] showMissionBriefingScreen called with:', mission);
  missionToStart.value = mission;
  console.log('[DEBUG] missionToStart set to:', missionToStart.value);
  showMissionBriefing.value = true;
  console.log('[DEBUG] showMissionBriefing set to:', showMissionBriefing.value);
}

/**
 * Start mission from briefing
 */
function startMissionFromBriefing() {
  showMissionBriefing.value = false
  
  if (!missionToStart.value) {
    missionToStart.value = null
    return
  }
  
  const mission = missionToStart.value
  
  console.log('Scene exists:', !!scene);
  console.log('boatObject exists:', !!boatObject);
  console.log('activeBoatModelFile:', activeBoatModelFile.value);
  
  // If scene is already active, reload the boat model immediately
  if (scene && boatObject && activeBoatModelFile.value) {
    console.log('Calling swapBoatModel with:', activeBoatModelFile.value);
    swapBoatModel(activeBoatModelFile.value).then(() => {
      console.log('swapBoatModel completed, starting training module');
      // Start mission after boat is loaded
      startTrainingModule(mission.moduleId, { mission });
    });
  } else {
    console.log('Scene not ready, starting training module directly (boat will load in initThree)');
    // Start mission directly (boat will load in initThree)
    startTrainingModule(mission.moduleId, { mission });
  }
  
  missionToStart.value = null
}

/**
 * Cancel mission briefing
 */
function cancelMissionBriefing() {
  showMissionBriefing.value = false
  missionToStart.value = null
}

/**
 * Handle buoy interaction from modal
 */
function handleBuoyInteractionClick() {
  showBuoyInteractionModal.value = false
  // Call existing Q key logic
  handleQuickInteract()
}

/**
 * Show mission complete screen
 */
function showMissionCompleteScreen() {
  const module = activeTrainingModule.value
  if (!module) return
  
  showMissionCompleteModal.value = true
}

/**
 * Handle take quiz from mission complete
 */
function handleTakeQuizFromComplete() {
  showMissionCompleteModal.value = false
  // Call existing quiz logic
  handleTakeQuizClick()
}

function getTacticalChartSnapshot() {
  const navOverlay = getTrainingNavOverlay();
  const zones = activeTrainingModule.value ? resolveTrainingZonesAtSpawn() : [];
  const step = activeTrainingModule.value?.steps[currentTrainingStep.value];
  const activeZoneId = step?.waypointZone ?? null;

  return buildTacticalChartSnapshot({
    boatX: stats.value.boatX,
    boatZ: stats.value.boatZ,
    boatHeadingDeg: stats.value.rotationDeg,
    islandGroup,
    harborDockGroup,
    berth: getActiveHarborDockBerth(),
    spawn: { x: SIMULATION_SPAWN.x, z: SIMULATION_SPAWN.z, label: 'Departure' },
    waypoints: [
      ...getFishingSpotChartWaypoints(stats.value.boatX, stats.value.boatZ), // Fishing spots now always visible
      ...zones
        .filter((z) => !z.visualOnly)
        .map((z) => ({
          x: z.x,
          z: z.z,
          radius: z.radius,
          label: z.label,
          color: z.color,
          active: z.id === activeZoneId,
          kind: z.gearKind ?? undefined,
        })),
    ],
    navTarget: navOverlay
      ? { x: navOverlay.targetX, z: navOverlay.targetZ, label: navOverlay.targetLabel }
      : null
  });
}

function resetTacticalChartCtx() {
  tacticalChartCtx = null;
  tacticalChartCanvasEl = null;
}

function ensureTacticalChartCtx() {
  const canvas = tacticalChartCanvas.value;
  if (!canvas) return null;
  if (canvas !== tacticalChartCanvasEl) {
    tacticalChartCanvasEl = canvas;
    tacticalChartCtx = canvas.getContext('2d');
  }
  if (activeCamera.value === 'helm' && helmRadarReady.value && tacticalChartCtx) {
    // Keep the tablet sharp even when the HUD radar is small on a phone.
    const size = 512;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
      tacticalChartCtx.setTransform(1, 0, 0, 1, 0, 0);
    }
    return { w: size, h: size };
  }
  return resizeTacticalCanvas(canvas, tacticalChartCtx);
}

function ensureMapCtx() {
  const canvas = mapCanvas.value;
  if (!canvas) return null;
  if (canvas !== mapCanvasEl) {
    mapCanvasEl = canvas;
    mapCanvasCtx = canvas.getContext('2d');
  }
  // Resize to device pixel ratio
  const w = Math.floor(canvas.clientWidth || 400);
  const h = Math.floor(canvas.clientHeight || 300);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    mapCanvasCtx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return { w, h };
}

async function loadGeoJsonIfNeeded() {
  if (geoJsonData) return;
  try {
    const res = await fetch('/export.geojson');
    if (!res.ok) return;
    const json = await res.json();
    geoJsonData = json;
    // compute bounds
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    (geoJsonData.features || []).forEach(f => {
      const geom = f.geometry;
      if (!geom) return;
      const coordsIter = (c) => {
        if (typeof c[0] === 'number') {
          const lon = c[0], lat = c[1];
          minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        } else {
          c.forEach(coordsIter);
        }
      };
      coordsIter(geom.coordinates);
    });
    if (minLon === Infinity) return;
    geoJsonBounds = { minLon, maxLon, minLat, maxLat };
  } catch (err) {
    console.error('Failed to load export.geojson', err);
  }
}

function clearMapCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#07112a';
  ctx.fillRect(0, 0, w, h);
}

function renderGeoJsonOnMap() {
  if (!geoJsonData || !mapCanvasCtx || !geoJsonBounds) return;
  const size = ensureMapCtx();
  if (!size) return;
  const { w, h } = size;
  const ctx = mapCanvasCtx;
  clearMapCanvas(ctx, w, h);

  const pad = 0.06; // 6% padding
  const innerW = w * (1 - pad * 2);
  const innerH = h * (1 - pad * 2);
  const ox = w * pad;
  const oy = h * pad;

  const { minLon, maxLon, minLat, maxLat } = geoJsonBounds;
  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;

  const project = (lon, lat) => {
    const x = ox + ((lon - minLon) / lonRange) * innerW;
    // invert Y because lat increases north; canvas Y increases downwards
    const y = oy + (1 - (lat - minLat) / latRange) * innerH;
    return [x, y];
  };

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  (geoJsonData.features || []).forEach((f) => {
    const geom = f.geometry;
    const props = f.properties || {};
    if (!geom) return;
    const type = geom.type;
    if (type === 'Polygon' || type === 'MultiPolygon') {
      const polygons = type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
      ctx.fillStyle = 'rgba(120,180,150,0.85)';
      ctx.strokeStyle = 'rgba(40,80,60,0.9)';
      ctx.lineWidth = 1.2;
      polygons.forEach(poly => {
        poly.forEach((ring, ri) => {
          ctx.beginPath();
          ring.forEach((pt, i) => {
            const [x, y] = project(pt[0], pt[1]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      });
    } else if (type === 'LineString' || type === 'MultiLineString') {
      const lines = type === 'LineString' ? [geom.coordinates] : geom.coordinates;
      ctx.strokeStyle = 'rgba(200,220,255,0.9)';
      ctx.lineWidth = 1.5;
      lines.forEach(line => {
        ctx.beginPath();
        line.forEach((pt, i) => {
          const [x, y] = project(pt[0], pt[1]);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    } else if (type === 'Point' || type === 'MultiPoint') {
      const pts = type === 'Point' ? [geom.coordinates] : geom.coordinates;
      ctx.fillStyle = 'rgba(255,200,80,0.95)';
      pts.forEach(pt => {
        const [x, y] = project(pt[0], pt[1]);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
}

function updateTacticalMinimap() {
  if (activeScreen.value !== 'simulation') return;
  if (activeCamera.value === 'helm') ensureHelmRadarDisplay();
  const size = ensureTacticalChartCtx();
  if (!size || !tacticalChartCtx) return;
  // Scale labels and markers along with the smaller radar instead of crowding its center.
  const scale = activeCamera.value === 'helm' && helmRadarReady.value
    ? size.w / 208
    : Math.min(size.w, size.h) < 140 ? Math.min(size.w, size.h) / 180 : 1;
  tacticalChartCtx.save();
  tacticalChartCtx.scale(scale, scale);
  drawCircularTacticalChart(tacticalChartCtx, size.w / scale, size.h / scale, getTacticalChartSnapshot());
  tacticalChartCtx.restore();
  if (activeCamera.value === 'helm') updateHelmRadarScreen(helmRadarDisplay);
}

function updateNavigationMap() {
  if (activeScreen.value !== 'simulation') return;
  const size = ensureMapCtx();
  if (!size || !mapCanvasCtx) return;
  
  const snapshot = getTacticalChartSnapshot();
  
  // Draw realistic terrain-style map
  const ctx = mapCanvasCtx;
  const { w, h } = size;
  const { bounds } = snapshot;
  const margin = 20;
  
  // Clear canvas
  ctx.clearRect(0, 0, w, h);
  
  // Background - ocean water with gradient
  const oceanGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
  oceanGrad.addColorStop(0, '#2563eb'); // Bright blue center
  oceanGrad.addColorStop(0.5, '#1d4ed8'); // Medium blue
  oceanGrad.addColorStop(1, '#1e3a8a'); // Dark blue edges
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);
  
  // Debug: Log bounds and island data
  console.log('[NavigationMap] Bounds:', bounds);
  console.log('[NavigationMap] Islands count:', snapshot.islands.length);
  console.log('[NavigationMap] First island:', snapshot.islands[0]);
  
  // Helper function to convert world coords to canvas
  function worldToCanvas(x, z) {
    const spanX = bounds.maxX - bounds.minX || 1;
    const spanZ = bounds.maxZ - bounds.minZ || 1;
    const scale = Math.min((w - margin * 2) / spanX, (h - margin * 2) / spanZ);
    const cx = margin + (x - bounds.minX) * scale;
    const cy = h - margin - (z - bounds.minZ) * scale;
    
    // Debug log for first call
    if (!worldToCanvas.logged) {
      console.log('[NavigationMap] World to canvas:', { x, z, cx, cy, scale, spanX, spanZ });
      worldToCanvas.logged = true;
    }
    
    return { x: cx, y: cy };
  }
  
  // Draw islands with terrain texture effect
  console.log('[NavigationMap] Drawing', snapshot.islands.length, 'islands');
  for (const island of snapshot.islands) {
    const tl = worldToCanvas(island.minX, island.maxZ);
    const br = worldToCanvas(island.maxX, island.minZ);
    const rw = br.x - tl.x;
    const rh = br.y - tl.y;
    
    console.log('[NavigationMap] Island rect:', { tl, br, rw, rh, label: island.label });
    
    // Skip if invalid dimensions
    if (rw <= 0 || rh <= 0) {
      console.warn('[NavigationMap] Skipping island with invalid dimensions:', island.label);
      continue;
    }
    
    // Island terrain gradient (green to brown)
    const islandGrad = ctx.createRadialGradient(
      tl.x + rw/2, tl.y + rh/2, 0,
      tl.x + rw/2, tl.y + rh/2, Math.max(rw, rh)/2
    );
    islandGrad.addColorStop(0, '#86efac'); // Light green center (vegetation)
    islandGrad.addColorStop(0.4, '#4ade80'); // Medium green
    islandGrad.addColorStop(0.7, '#a16207'); // Brown (earth/mountains)
    islandGrad.addColorStop(1, '#78350f'); // Dark brown edges
    
    ctx.fillStyle = islandGrad;
    ctx.fillRect(tl.x, tl.y, rw, rh);
    
    // Add texture noise for realism
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000000';
    const noiseCount = Math.min((rw * rh) / 100, 200); // Limit noise particles
    for (let i = 0; i < noiseCount; i++) {
      const px = tl.x + Math.random() * rw;
      const py = tl.y + Math.random() * rh;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.globalAlpha = 1;
    
    // Coastal outline (beach)
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 3;
    ctx.strokeRect(tl.x, tl.y, rw, rh);
    
    // Island label
    if (island.label && rw > 50) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(island.label, tl.x + rw/2, tl.y + rh/2);
      ctx.fillText(island.label, tl.x + rw/2, tl.y + rh/2);
    }
  }
  
  // Draw docks/ports
  for (const dock of snapshot.docks) {
    const tl = worldToCanvas(dock.minX, dock.maxZ);
    const br = worldToCanvas(dock.maxX, dock.minZ);
    const rw = br.x - tl.x;
    const rh = br.y - tl.y;
    
    if (rw <= 0 || rh <= 0) continue;
    
    ctx.fillStyle = '#78350f'; // Brown for dock structure
    ctx.fillRect(tl.x, tl.y, rw, rh);
    ctx.strokeStyle = '#fbbf24'; // Gold outline
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, rw, rh);
    
    // Port icon
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚓', tl.x + rw/2, tl.y + rh/2);
  }
  
  // Draw landmarks
  if (snapshot.landmarks) {
    for (const landmark of snapshot.landmarks) {
      if (landmark.x == null || landmark.z == null) continue;
      const p = worldToCanvas(landmark.x, landmark.z);
      
      // Check if in bounds
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) continue;
      
      // Landmark marker
      ctx.fillStyle = landmark.type === 'port' ? '#60a5fa' : '#4ade80';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Icon
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(landmark.icon, p.x, p.y);
      
      // Label
      if (landmark.label) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.strokeText(landmark.label, p.x, p.y + 12);
        ctx.fillText(landmark.label, p.x, p.y + 12);
      }
    }
  }
  
  // Draw waypoints
  for (const wp of snapshot.waypoints) {
    const p = worldToCanvas(wp.x, wp.z);
    if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) continue;
    
    ctx.fillStyle = wp.active ? '#fbbf24' : '#a78bfa';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, wp.active ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    if (wp.label && wp.active) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeText(wp.label, p.x, p.y - 10);
      ctx.fillText(wp.label, p.x, p.y - 10);
    }
  }
  
  // Draw boat
  const boatP = worldToCanvas(snapshot.boat.x, snapshot.boat.z);
  console.log('[NavigationMap] Boat position:', { world: { x: snapshot.boat.x, z: snapshot.boat.z }, canvas: boatP });
  
  ctx.save();
  ctx.translate(boatP.x, boatP.y);
  ctx.rotate((snapshot.boat.headingDeg * Math.PI) / 180);
  
  // Boat shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.moveTo(2, -13);
  ctx.lineTo(12, 12);
  ctx.lineTo(2, 7);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  ctx.fill();
  
  // Boat body
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(10, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Boat marker dot
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Title overlay
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 0, w, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Davao Gulf - Navigation Chart', w/2, 25);
  
  // Compass rose in corner
  const compassX = w - 60;
  const compassY = 60;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  
  // North arrow
  ctx.beginPath();
  ctx.moveTo(compassX, compassY - 30);
  ctx.lineTo(compassX - 6, compassY - 10);
  ctx.lineTo(compassX, compassY - 15);
  ctx.lineTo(compassX + 6, compassY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // N label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', compassX, compassY - 35);
  
  // Scale indicator
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  const scaleText = '10 km';
  ctx.strokeText(scaleText, 30, h - 30);
  ctx.fillText(scaleText, 30, h - 30);
  
  console.log('[NavigationMap] Rendering complete');
}

const currentHeadingTargetHint = computed(() => {
  if (!activeTrainingModule.value) return '';
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];

  if (step?.requireHeadingDeg != null) {
    const target = Math.round(step.requireHeadingDeg);
    const current = Math.round(stats.value.rotationDeg);
    const off = Math.round(headingDelta(current, target));
    const label = step.compassLabel ?? cardinalLabelForHeading(target);
    return `Target ${target}° (${label}) · now ${current}° · off ${off}°`;
  }

  if (!step?.alignHeadingFromZone && !step?.waypointZone) return '';

  const zoneId = step.alignHeadingFromZone ?? step.waypointZone;
  const zone = findWaypoint(resolveTrainingZonesAtSpawn(), zoneId);
  if (!zone?.requireHeadingDeg && !zone?.berthHeadingDeg) return '';

  const target = Math.round(zone.requireHeadingDeg ?? zone.berthHeadingDeg ?? 0);
  const current = Math.round(stats.value.rotationDeg);
  const off = Math.round(headingDelta(current, target));
  const label = zone.berthHeadingDeg != null ? 'parallel to pier' : 'for this mark';
  return `Target ${target}° (${label}) · now ${current}° · off ${off}°`;
});

const compassStepLiveHint = computed(() => {
  compassCoachTick.value;
  if (!activeTrainingModule.value || trainingStepSuccess.value) return '';
  const step = activeTrainingModule.value.steps[currentTrainingStep.value];
  if (!step) return '';
  if (activeTrainingModule.value.id !== 'map-compass' && step.requireHeadingDeg == null) return '';

  if (step.waypointZone && boatObject) {
    const zone = findWaypoint(resolveTrainingZonesAtSpawn(), step.waypointZone);
    if (zone) {
      const bearing = Math.round(
        compassBearingToTarget(stats.value.boatX, stats.value.boatZ, zone.x, zone.z)
      );
      return `Chart bearing ${bearing}° to ${zone.label}.`;
    }
  }

  if (step.requireHeadingDeg != null) {
    return formatHeadingStepHint(step, stats.value, trainingHeadingHold.value);
  }

  return '';
});

const trainingPanelHintPrimary = computed(() => {
  if (compassStepLiveHint.value) return compassStepLiveHint.value;
  if (currentHeadingTargetHint.value) return currentHeadingTargetHint.value;
  if (currentWaypointHint.value) return currentWaypointHint.value.split('\n')[0];
  return '';
});

const trainingPanelHintSecondary = computed(() => {
  if (!currentWaypointHint.value) return '';
  const [base, coach] = currentWaypointHint.value.split('\n');
  if (compassStepLiveHint.value) return base ?? '';
  if (currentHeadingTargetHint.value) return coach ?? base ?? '';
  return coach ?? '';
});

const trainingProgressPercent = computed(() => {
  if (!activeTrainingModule.value) return 0;
  const totalSteps = (activeTrainingModule.value.missionSteps && activeTrainingModule.value.missionSteps.length > 0)
    ? activeTrainingModule.value.missionSteps.length
    : activeTrainingModule.value.steps.length;
  return ((currentTrainingStep.value + 1) / totalSteps) * 100;
});

const activeTrainingElapsedLabel = computed(() => {
  trainingElapsedTick.value;
  if (!activeTrainingModule.value || isTrainingReviewMode.value) return '';
  const elapsedMs = (trainingRunMetrics.value.endedAt || performance.now()) - trainingRunMetrics.value.startedAt;
  const est = activeTrainingModule.value.duration ?? '';
  return `Elapsed ${formatElapsedDuration(elapsedMs)}${est ? ` · est. ${est}` : ''} — time affects score`;
});

const trainingStepSuccess = ref(false);
const trainingRunFinished = ref(false);
const missionReadyToReport = ref(false);  // New: true when all tasks done, at port, anchor dropped
const trainingStepError = ref(false);
const trainingFeedback = ref('');
const trainingHeadingHold = ref({ startedAt: null });
const compassCoachTick = ref(0);

// Clear local error HUD
function clearError() {
  fatalError.value = null;
}

// Watch parameters to update water shader properties
function onWaterParamChange() {
  if (!ocean) return;
  ocean.setWaveState?.(physics.value.waveAmplitude, physics.value.waveFrequency);
  if (environmentPreset === 'rain' || stormMode.value) {
    ocean.setWaveDistortion(3.6);
    ocean.setPlaybackSpeed(0.72);
    return;
  }
  if (environmentPreset === 'sunset') {
    ocean.setWaveDistortion(1.6);
    ocean.setPlaybackSpeed(0.32);
    return;
  }
  // Gentle surface movement; training physics still use the selected sea conditions.
  const distortion = THREE.MathUtils.clamp(1.3 + physics.value.waveAmplitude * 0.3, 1.4, 2.7);
  const speed = THREE.MathUtils.clamp(0.3 + physics.value.waveFrequency * 0.12, 0.35, 0.65);
  ocean.setWaveDistortion(distortion);
  ocean.setPlaybackSpeed(speed);
}

// Watch volume slider
function updateVolume() {
  if (audioPlayer.value) {
    audioPlayer.value.volume = soundVolume.value;
  }
}

// Toggle background music
function toggleMusic() {
  if (!audioPlayer.value) return;
  if (musicPlaying.value) {
    audioPlayer.value.pause();
    musicPlaying.value = false;
  } else {
    audioPlayer.value.play().catch(err => console.log('Audio playback blocked: ', err));
    musicPlaying.value = true;
  }
}

function openMenuSettings() {
  showMenuSettings.value = true;
}

function closeMenuSettings() {
  showMenuSettings.value = false;
}


function startGame() {
  showMenuSettings.value = false;
  simulationRunning.value = true;
  activeCamera.value = menuStartCamera.value;
  activeScreen.value = 'simulation';
  void syncWorldForSimulation().then(() => {
    syncOrbitControlsEnabled();
    if (activeCamera.value === 'chase') snapChaseCamera();
    requestAnimationFrame(() => updateCompassStripViewportWidth());
    // Ensure difficulty effects applied when simulation starts
    applyDifficultyEffects();
  });
  mouseLookReady = false;
}

/** Daylight + visible islands + sim boat pose (missions & Quick Sail). */
async function syncWorldForSimulation() {
  if (islandGroup) {
    islandGroup.visible = true;
    updateSimulationSpawn(islandGroup, islandGroup.userData?.isProceduralTerrain);
  }
  await rebuildHarborDocks();
  applySimulationWeather();
  landingBoatPoseActive = false;
  if (boatObject) restoreBoatSimPose();
}

async function rebuildHarborDocks() {
  if (!scene) return;

  if (harborDockGroup) {
    scene.remove(harborDockGroup);
    disposeHarborDockGroup(harborDockGroup);
    harborDockGroup = null;
  }

  try {
    harborDockGroup = await loadHarborDocks(null, islandGroup, SCENE_WATERLINE_Y, {
      mainSegments: 10
    });
    scene.add(harborDockGroup);
    setHarborPoleLightsVisible(harborDockGroup, environmentPreset !== 'day');
    applySpawnAtBerth(getActiveHarborDockBerth());
    if (activeTrainingModule.value) {
      syncTrainingWaypointMarkers();
    }
  } catch (err) {
    console.error('[HelmQuest] Harbor dock load error:', err);
  }
}

/**
 * Keep the docking rectangle invisible, including previously loaded visuals.
 */
function hideBerthZoneVisual(dockGroup) {
  const berthZone = dockGroup?.getObjectByName('DockBerthZone');
  if (berthZone) berthZone.visible = false;
}

function isMenuBackdropScreen(screen = activeScreen.value) {
  return screen === 'landing' || screen === 'play-options';
}

function goBackFromPlayOptions() {
  goToScreen(isAuthenticated.value ? 'dashboard' : 'auth');
}

function goToStudentHub() {
  if (!isAuthenticated.value) {
    goToScreen('auth');
    return;
  }
  goToScreen('dashboard');
}

function getModuleMissionProgress(moduleId) {
  const missions = getMissionsForModule(moduleId);
  const passed = missions.filter((mission) => getMissionResult(mission)?.passed).length;
  return { passed, total: missions.length };
}

function isModuleFullyComplete(moduleId) {
  const { passed, total } = getModuleMissionProgress(moduleId);
  return total > 0 && passed === total;
}

async function startMissionSimulation(mission) {
  console.log('=== startMissionSimulation DEBUG ===');
  console.log('Mission object:', mission);
  console.log('Mission boatType:', mission?.boatType);
  
  if (!mission?.moduleId) {
    startQuickSail();
    return;
  }

  // Re-check persisted completion after refresh, sign-in, or another device's run.
  // Local storage alone must not decide whether a completed mission can save again.
  if (userRole.value === 'student' && currentUser.value?.id) {
    try {
      const response = await fetch(`${API_BASE_URL}/mission-scores/${currentUser.value.id}`);
      if (!response.ok) throw new Error('Could not verify saved mission results');
      const { scores } = await response.json();
      if (!Array.isArray(scores)) throw new Error('Invalid saved mission results');
      // The simulation uses CUSTOM-* wrappers, while older saved results can
      // use the underlying ID. Reconcile both and discard stale cached passes.
      restoreSavedMissionResults(currentUser.value.id, scores, progressData.value,
        getMissionsForModule, trainingModules.value.map(module => module.id));
    } catch (error) {
      console.warn('Could not refresh saved mission results; backend completion guard remains active:', error);
    }
  }
  const result = getMissionResult(mission);
  if (result?.passed) {
    // A passed mission enters practice; its saved report remains available.
    console.log('[Review Mode] Starting review - no saving, no quiz');
    startTrainingModule(mission.moduleId, {
      review: true,
      mission
    });
    return;
  }
  
  // FAILED mission or FIRST attempt - Normal mode (can save/update)
  console.log('[Normal/Retry Mode] Starting mission - can save and update score');

  // Apply the instructor's selected boat type (or default to medium)
  const boatTypeId = mission.boatType || 'medium';
  console.log('Selected boatTypeId:', boatTypeId);
  console.log('Before applyBoatTypePhysics - activeBoatModelFile:', activeBoatModelFile.value);
  
  applyBoatTypePhysics(boatTypeId);

  // Apply mission-specific difficulty to the global difficultyLevel so
  // physics and spawning reflect the instructor's chosen difficulty for
  // this mission. Map mission difficulty ('Beginner'|'Intermediate'|'Advanced')
  // to global difficulty ('Easy'|'Normal'|'Hard').
  try {
    const missionDiff = (mission.difficulty || 'Beginner').toLowerCase();
    const diffMap = {
      beginner: 'Easy',
      intermediate: 'Normal',
      advanced: 'Hard'
    };
    const mapped = diffMap[missionDiff] || 'Normal';
    difficultyLevel.value = mapped;
    if (!progressData.value.courseSettings) progressData.value.courseSettings = {};
    progressData.value.courseSettings.difficultyLevel = mapped;
    saveProgress(progressData.value);
    // Re-apply difficulty effects now that difficultyLevel changed
    applyDifficultyEffects();
  } catch (err) {
    console.warn('[HelmQuest] failed to apply mission difficulty', err);
  }
  
  console.log('After applyBoatTypePhysics - activeBoatModelFile:', activeBoatModelFile.value);
  
  // START MISSION DIRECTLY (skip briefing for retry)
  startTrainingModule(mission.moduleId, {
    review: false,
    mission
  });
}

const courseSettingsView = computed(() => getCourseSettings(progressData.value));

const instructorLevelSettings = computed(() =>
  buildInstructorLevelSettings(progressData.value, trainingModules.value)
);

function displayModuleLevel(moduleId) {
  return getModuleLevelLabel(moduleId, progressData.value);
}

function isModuleLockedForStudent(moduleId) {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return false;
  
  // Check date-based availability
  const availabilityStatus = getMissionAvailabilityStatus(moduleId);
  if (availabilityStatus.status !== 'available') {
    return true;
  }
  
  return !getModuleAccess(studentId, moduleId, progressData.value, getMissionsForModule).accessible;
}

function moduleLockMessage(moduleId) {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return '';

  // Check date-based availability first
  const availabilityStatus = getMissionAvailabilityStatus(moduleId);
  if (availabilityStatus.status !== 'available') {
    return availabilityStatus.message;
  }

  const access = getModuleAccess(studentId, moduleId, progressData.value, getMissionsForModule);
  if (access.accessible) return '';

  if (access.reason === 'locked_by_instructor') {
    return 'This level is locked by your instructor.';
  }

  if (access.reason === 'complete_previous') {
    const previous = trainingModules.value.find((entry) => entry.id === access.previousModuleId);
    return `Complete ${previous?.title ?? 'the previous level'} to unlock.`;
  }

  return 'This level is locked.';
}

function isMissionLocked(mission) {
  if (!mission?.moduleId) return false;
  if (!isModuleLockedForStudent(mission.moduleId)) return false;
  if (getMissionResult(mission)?.passed) return false;
  return true;
}

function reloadCourseSettings() {
  saveProgress(progressData.value);
  progressData.value = loadProgress();
}

function onSequentialUnlockChange(event) {
  setSequentialUnlock(progressData.value, event.target.checked);
  reloadCourseSettings();
}

function onModuleLockChange(moduleId, locked) {
  setModuleLocked(progressData.value, moduleId, locked);
  reloadCourseSettings();
}

function onRetakeToggleChange(allowed) {
  isGearQuizRetakeAllowed.value = allowed;
  // Save to localStorage for persistence
  try {
    localStorage.setItem('helmquest_retake_allowed', JSON.stringify(allowed));
  } catch (err) {
    console.warn('[HelmQuest] Failed to save retake setting:', err);
  }
}

// Date-based access control functions
async function onModuleOpenDateChange(moduleId, openDate) {
  if (!progressData.value.moduleSchedule) {
    progressData.value.moduleSchedule = {};
  }
  if (!progressData.value.moduleSchedule[moduleId]) {
    progressData.value.moduleSchedule[moduleId] = {};
  }
  progressData.value.moduleSchedule[moduleId].openDate = openDate;
  saveProgress(progressData.value);
  reloadCourseSettings();
  
  // Save to Firestore (only if document exists)
  if (window.firebaseApi) {
    try {
      // Check if mission exists in Firestore first
      try {
        await window.firebaseApi.getMission(moduleId);
        // Document exists, safe to update
        await window.firebaseApi.updateMission(moduleId, { 
          opendate: openDate || null 
        });
        console.log('✅ Open date saved to Firestore:', moduleId, openDate);
      } catch (getError) {
        // Document doesn't exist in Firestore (custom mission in localStorage only)
        console.log('ℹ️ Mission not in Firestore, saved to localStorage only:', moduleId);
      }
    } catch (error) {
      console.error('❌ Failed to save open date to Firestore:', error);
    }
  }
}

async function onModuleDeadlineChange(moduleId, deadline) {
  if (!progressData.value.moduleSchedule) {
    progressData.value.moduleSchedule = {};
  }
  if (!progressData.value.moduleSchedule[moduleId]) {
    progressData.value.moduleSchedule[moduleId] = {};
  }
  progressData.value.moduleSchedule[moduleId].deadline = deadline;
  saveProgress(progressData.value);
  reloadCourseSettings();
  
  // Save to Firestore (only if document exists)
  if (window.firebaseApi) {
    try {
      // Check if mission exists in Firestore first
      try {
        await window.firebaseApi.getMission(moduleId);
        // Document exists, safe to update
        await window.firebaseApi.updateMission(moduleId, { 
          deadline: deadline || null 
        });
        console.log('✅ Deadline saved to Firestore:', moduleId, deadline);
      } catch (getError) {
        // Document doesn't exist in Firestore (custom mission in localStorage only)
        console.log('ℹ️ Mission not in Firestore, saved to localStorage only:', moduleId);
      }
    } catch (error) {
      console.error('❌ Failed to save deadline to Firestore:', error);
    }
  }
}

function setDifficulty(level) {
  if (!['Easy', 'Normal', 'Hard'].includes(level)) return;
  difficultyLevel.value = level;
  // Persist to course settings so reloads keep the value
  if (!progressData.value.courseSettings) progressData.value.courseSettings = {};
  progressData.value.courseSettings.difficultyLevel = level;
  saveProgress(progressData.value);
  applyDifficultyEffects();
}

function applyDifficultyEffects() {
  // Difficulty changes fishing capacity/population; sea state comes from the boat/weather.
  if (difficultyLevel.value === 'Easy') {
    trawlNetCapacity.value = 50;
    // Reduce fish spawn so easier to catch fewer but larger fish
    spawnFishPopulationIfNeeded(60);
  } else if (difficultyLevel.value === 'Normal') {
    trawlNetCapacity.value = 30;
    spawnFishPopulationIfNeeded(100);
  } else if (difficultyLevel.value === 'Hard') {
    trawlNetCapacity.value = 20;
    spawnFishPopulationIfNeeded(160);
  }
}

function spawnFishPopulationIfNeeded(count) {
  try {
    if (!sceneInitialized) return;
    // remove previous spawned fish if any
    if (Array.isArray(spawnedFishHandles) && spawnedFishHandles.length) {
      spawnedFishHandles.forEach(f => {
        try { if (f?.mesh && scene) scene.remove(f.mesh); } catch {};
      });
      spawnedFishHandles = [];
    }
    if (scene && typeof spawnFishPopulation === 'function') {
      spawnedFishHandles = spawnFishPopulation(scene, count) || [];
    }
  } catch (err) {
    console.warn('[HelmQuest] spawnFishPopulationIfNeeded error', err);
  }
}

// Quiz management modal
const quizManagerModal = ref(null);
const quizEditorModal = ref(null);
const quizSaving = ref(false); // Track save state
const quizLoadError = ref(null); // Track load errors
const quizDraftRestorePrompt = ref(null); // Draft restoration UI state

// Saved quizzes drive the instructor mission buttons, independently of local assignments.
const missionQuizzes = ref(null);
const missionQuizzesLoading = ref(false);
const missionQuizzesError = ref(false);
let missionQuizzesRequest = 0;
async function fetchMissionQuizzes() {
  const instructorId = currentUser.value?.id;
  if (userRole.value !== 'instructor' || !instructorId) return;
  const request = ++missionQuizzesRequest;
  missionQuizzesLoading.value = true;
  missionQuizzesError.value = false;
  try {
    const response = await firebaseApi.getAllQuizzes();
    if (!Array.isArray(response?.quizzes)) throw new Error('Invalid quiz response');
    if (request === missionQuizzesRequest && currentUser.value?.id === instructorId && userRole.value === 'instructor') {
      missionQuizzes.value = response.quizzes;
    }
  } catch (error) {
    if (request === missionQuizzesRequest) missionQuizzesError.value = true;
    console.error('Could not load mission quizzes:', error);
  } finally {
    if (request === missionQuizzesRequest) missionQuizzesLoading.value = false;
  }
}
watch([() => currentUser.value?.id, userRole, activeScreen, instructorTab],
  ([id, role, screen, tab], [previousId, previousRole] = []) => {
  if (id !== previousId || role !== previousRole) {
    missionQuizzesRequest++;
    missionQuizzes.value = null;
    missionQuizzesLoading.value = false;
    missionQuizzesError.value = false;
  }
  if (role === 'instructor' && screen === 'dashboard' && tab === 'missions') fetchMissionQuizzes();
}, { immediate: true });

function quizMatchesModule(quiz, moduleId) {
  const ids = Array.isArray(quiz.moduleId) ? quiz.moduleId : [quiz.moduleId];
  return ids.includes(moduleId);
}
function rememberMissionQuiz(quiz) {
  if (!quiz?.id || !missionQuizzes.value) return;
  const index = missionQuizzes.value.findIndex(saved => saved.id === quiz.id);
  if (index >= 0) missionQuizzes.value[index] = quiz;
  else missionQuizzes.value.push(quiz);
}

// Computed property to access quizzes from progressData
const quizzes = computed(() => {
  return progressData.value.quizzes || [];
});

// Quiz Creator Functions
function createBlankQuestion(order = 0) {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    prompt: '',
    type: 'multiple-choice',
    options: [
      { id: `opt-${Date.now()}-1`, text: '', isCorrect: false },
      { id: `opt-${Date.now()}-2`, text: '', isCorrect: false }
    ],
    correctAnswer: '',
    order,
    checkpointLat: 7.073 + (Math.random() * 0.02 - 0.01),
    checkpointLon: 125.648 + (Math.random() * 0.02 - 0.01)
  };
}

// Helper to generate unique IDs
function generateQuestionId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateOptionId() {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// localStorage draft management
function getDraftKey(quizId) {
  return `helmquest-quiz-draft-${quizId}`;
}

function saveDraftToLocalStorage(quizId, quizData) {
  try {
    const draftKey = getDraftKey(quizId);
    localStorage.setItem(draftKey, JSON.stringify({
      quiz: quizData,
      savedAt: new Date().toISOString()
    }));
    console.log('[DRAFT] Saved to localStorage:', draftKey);
  } catch (error) {
    console.warn('[DRAFT] Failed to save draft:', error);
  }
}

function loadDraftFromLocalStorage(quizId) {
  try {
    const draftKey = getDraftKey(quizId);
    const draftJson = localStorage.getItem(draftKey);
    if (draftJson) {
      const draft = JSON.parse(draftJson);
      console.log('[DRAFT] Found draft from:', draft.savedAt);
      return draft.quiz;
    }
  } catch (error) {
    console.warn('[DRAFT] Failed to load draft:', error);
  }
  return null;
}

function clearDraftFromLocalStorage(quizId) {
  try {
    const draftKey = getDraftKey(quizId);
    localStorage.removeItem(draftKey);
    console.log('[DRAFT] Cleared draft:', draftKey);
  } catch (error) {
    console.warn('[DRAFT] Failed to clear draft:', error);
  }
}

// Get quiz button text dynamically (Create vs Update)
function getQuizButtonText(moduleId) {
  if (!moduleId) return 'Create Quiz';
  if (missionQuizzesLoading.value) return 'Loading Quiz...';
  if (missionQuizzesError.value && missionQuizzes.value === null) return 'Retry Quiz';
  // Once loaded, backend records take precedence over stale browser assignments.
  const existingQuiz = missionQuizzes.value === null
    ? getQuizForModule(moduleId)
    : missionQuizzes.value.find(quiz => quizMatchesModule(quiz, moduleId));
  return existingQuiz ? 'Update Quiz' : 'Create Quiz';
}

async function startCreatingQuiz(moduleId = quizManagerModal.value?.moduleId, missionTitle = '') {
  if (!moduleId) return;

  quizLoadError.value = null;
  
  // Check if quiz already exists for this module (load from Firestore for latest data)
  let existingQuiz;
  try {
    existingQuiz = await getQuizForModuleFromFirestore(moduleId, { requireDatabase: true });
  } catch (error) {
    alert('Could not check the saved quiz. Please try again.');
    return;
  }
  
  console.log('[START CREATING QUIZ]', {
    moduleId,
    existingQuiz: !!existingQuiz,
    existingQuizId: existingQuiz?.id,
    questionsCount: existingQuiz?.questions?.length
  });
  
  if (existingQuiz) {
    // Open existing quiz in edit mode
    console.log('[START CREATING QUIZ] Quiz exists, opening in EDIT mode');
    
    // Check for unsaved draft
    const draft = loadDraftFromLocalStorage(existingQuiz.id);
    if (draft) {
      const draftTime = new Date(draft.updatedAt || 0);
      const firestoreTime = new Date(existingQuiz.updatedAt || 0);
      
      // If draft is newer than Firestore, offer to restore
      if (draftTime > firestoreTime) {
        quizDraftRestorePrompt.value = {
          quiz: existingQuiz,
          draft: draft,
          moduleId: moduleId,
          draftTime: draftTime,
          firestoreTime: firestoreTime
        };
        quizManagerModal.value = null;
        return;
      }
    }
    
    // No draft or draft is older - use Firestore data
    openQuizEditor(existingQuiz, moduleId, false);
    return;
  }

  // Create new quiz
  const quizTitle = missionTitle || quizManagerModal.value?.moduleTitle || '';
  console.log('[START CREATING QUIZ] Creating NEW quiz');
  
  const newQuiz = {
    title: quizTitle,
    description: '',
    moduleId: moduleId,
    questions: [createBlankQuestion()],
    createdAt: new Date().toISOString(),
    createdBy: currentUser.value?.id || 'instructor',
    updatedAt: new Date().toISOString()
  };
  
  // Save directly to Firestore to get ID
  try {
    if (!window.firebaseApi) {
      throw new Error('Firebase API not available');
    }
    
    console.log('[START CREATING QUIZ] Saving to Firestore...');
    const response = await window.firebaseApi.createQuiz(newQuiz);
    
    if (response && response.quizId) {
      newQuiz.id = response.quizId;
      rememberMissionQuiz(newQuiz);
      console.log('[START CREATING QUIZ] ✅ Created with ID:', newQuiz.id);
      
      // Add to localStorage
      if (!progressData.value.quizzes) {
        progressData.value.quizzes = [];
      }
      progressData.value.quizzes.push(newQuiz);
      
      // Create assignment
      const assignment = {
        id: `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        quizId: newQuiz.id,
        targetType: 'module',
        targetId: moduleId,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.value?.id || 'instructor'
      };
      
      if (!progressData.value.quizAssignments) {
        progressData.value.quizAssignments = [];
      }
      progressData.value.quizAssignments.push(assignment);
      
      saveProgress(progressData.value);
      
      // Open editor
      openQuizEditor(newQuiz, moduleId, false);
    } else {
      throw new Error('Failed to create quiz: No quiz ID returned');
    }
  } catch (error) {
    console.error('[START CREATING QUIZ] ❌ Failed:', error);
    alert('Failed to create quiz: ' + error.message);
  }
}

// Open quiz editor modal with given quiz data
function openQuizEditor(quiz, moduleId, isNew) {
  quizManagerModal.value = null;
  quizEditorModal.value = {
    isNew: isNew,
    moduleId: moduleId,
    quiz: JSON.parse(JSON.stringify(quiz)) // Deep clone to avoid accidental mutations
  };
  console.log('[OPEN EDITOR] Opened with', quiz.questions?.length || 0, 'questions');
}

// Restore draft
function restoreDraft() {
  if (!quizDraftRestorePrompt.value) return;
  
  const { draft, moduleId } = quizDraftRestorePrompt.value;
  openQuizEditor(draft, moduleId, false);
  quizDraftRestorePrompt.value = null;
}

// Discard draft and use Firestore data
function discardDraft() {
  if (!quizDraftRestorePrompt.value) return;
  
  const { quiz, moduleId } = quizDraftRestorePrompt.value;
  clearDraftFromLocalStorage(quiz.id);
  openQuizEditor(quiz, moduleId, false);
  quizDraftRestorePrompt.value = null;
}

// Helper function to get quiz for a specific module (1-to-1 relationship)
// Loads from Firestore to get latest data using DIRECT QUERY by moduleId
async function getQuizForModuleFromFirestore(moduleId, { requireDatabase = false } = {}) {
  try {
    if (!window.firebaseApi) {
      if (requireDatabase) throw new Error('Firebase API not available');
      console.warn('[GET QUIZ] Firebase API not available, using localStorage fallback');
      return normalizeQuizData(getQuizForModuleFromLocalStorage(moduleId));
    }
    if (requireDatabase) {
      // Re-check saved links before opening/creating; a stale label must not create
      // another quiz. This also supports legacy array-valued moduleId fields.
      const response = await window.firebaseApi.getAllQuizzes();
      if (!Array.isArray(response?.quizzes)) throw new Error('Invalid quiz response');
      missionQuizzes.value = response.quizzes;
      return normalizeQuizData(response.quizzes.find(quiz => quizMatchesModule(quiz, moduleId)) || null);
    }
    
    // DIRECT QUERY: Load quiz from Firestore by moduleId (no assignment needed!)
    console.log('[GET QUIZ] 🔍 Direct query for quiz with moduleId:', moduleId);
    const response = await window.firebaseApi.getQuizByModuleId(moduleId);
    
    if (response && response.quiz) {
      rememberMissionQuiz(response.quiz);
      console.log('[GET QUIZ] ✅ Found quiz from Firestore:', {
        id: response.quiz.id,
        title: response.quiz.title,
        moduleId: response.quiz.moduleId,
        questionsCount: response.quiz.questions?.length
      });
      return normalizeQuizData(response.quiz);
    }
    
    console.log('[GET QUIZ] ℹ️ No quiz found in Firestore for module:', moduleId);
    return null;
  } catch (error) {
    if (requireDatabase) throw error;
    // If it's a 404, that's normal - no quiz exists yet
    if (error.message?.includes('Not Found') || error.message?.includes('404')) {
      console.log('[GET QUIZ] ℹ️ No quiz exists for module:', moduleId);
      return null;
    }
    
    console.error('[GET QUIZ] ❌ Error loading from Firestore:', error);
    // Try localStorage fallback
    return normalizeQuizData(getQuizForModuleFromLocalStorage(moduleId));
  }
}

// Normalize quiz data to ensure all questions and options have IDs
function normalizeQuizData(quiz) {
  if (!quiz) return null;
  
  // Ensure questions array exists
  if (!quiz.questions) {
    quiz.questions = [];
  }
  
  // Normalize each question
  quiz.questions = quiz.questions.map((q, idx) => {
    // Ensure question has an ID
    if (!q.id) {
      q.id = `q-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 9)}`;
    }
    
    // Ensure question has required fields
    if (!q.prompt) q.prompt = '';
    if (!q.type) q.type = 'multiple-choice';
    if (q.order === undefined) q.order = idx;
    
    // Normalize options for multiple-choice
    if (q.type === 'multiple-choice') {
      if (!Array.isArray(q.options)) {
        q.options = [];
      }
      
      q.options = q.options.map((opt, optIdx) => {
        // Handle old format where options might be strings
        if (typeof opt === 'string') {
          return {
            id: generateOptionId(),
            text: opt,
            isCorrect: false
          };
        }
        
        // Ensure option has an ID
        if (!opt.id) {
          opt.id = `opt-${Date.now()}-${idx}-${optIdx}`;
        }
        
        // Ensure option has required fields
        if (!opt.text) opt.text = '';
        if (opt.isCorrect === undefined) opt.isCorrect = false;
        
        return opt;
      });
      
      // If correctAnswer is set but no option is marked correct, fix it
      if (q.correctAnswer && !q.options.some(opt => opt.isCorrect)) {
        const correctOpt = q.options.find(opt => 
          opt.id === q.correctAnswer || 
          opt.text === q.correctAnswer
        );
        if (correctOpt) {
          correctOpt.isCorrect = true;
        }
      }
    } else {
      // For non-multiple-choice, ensure options is empty array
      q.options = [];
    }
    
    // Ensure correctAnswer exists
    if (!q.correctAnswer) {
      if (q.type === 'true-false') {
        q.correctAnswer = 'True';
      } else {
        q.correctAnswer = '';
      }
    }
    
    return q;
  });
  
  return quiz;
}

// Helper to get quiz from localStorage (fallback only)
function getQuizForModuleFromLocalStorage(moduleId) {
  if (!progressData.value.quizzes) {
    return null;
  }
  // Current records link the quiz directly through moduleId; assignments are legacy.
  const directQuiz = progressData.value.quizzes.find(quiz => quizMatchesModule(quiz, moduleId));
  if (directQuiz) return directQuiz;
  
  // Find assignment for this module
  const assignment = progressData.value.quizAssignments?.find(a => 
    a.targetId === moduleId && a.targetType === 'module'
  );
  
  if (!assignment) return null;
  
  // Find the quiz
  return progressData.value.quizzes.find(q => q.id === assignment.quizId);
}

// Synchronous version for immediate checks (uses localStorage)
function getQuizForModule(moduleId) {
  return getQuizForModuleFromLocalStorage(moduleId);
}

function editQuiz(quiz) {
  const moduleId = quizManagerModal.value.moduleId;
  quizManagerModal.value = null;
  quizEditorModal.value = {
    isNew: false,
    moduleId: moduleId,
    quiz: quiz  // Use directly, no JSON.parse - keeps reactivity!
  };
}

function addQuestion() {
  if (!quizEditorModal.value) return;
  
  console.log('[ADD QUESTION] Adding new question');
  const newQuestion = createBlankQuestion(quizEditorModal.value.quiz.questions.length);
  quizEditorModal.value.quiz.questions.push(newQuestion);
  
  // Save draft to localStorage
  saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
}

function removeQuestion(index) {
  if (!quizEditorModal.value) return;
  
  quizEditorModal.value.quiz.questions.splice(index, 1);
  // Re-index remaining questions
  quizEditorModal.value.quiz.questions.forEach((q, idx) => {
    q.order = idx;
  });
  
  // Save draft to localStorage
  saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
}

function updateQuestionText(questionId, newText) {
  if (!quizEditorModal.value) return;
  
  const question = quizEditorModal.value.quiz.questions.find(q => q.id === questionId);
  if (question) {
    question.prompt = newText;
    // Debounced draft save will be triggered by watcher
  }
}

function updateQuestionType(questionId, newType) {
  if (!quizEditorModal.value) return;
  
  const question = quizEditorModal.value.quiz.questions.find(q => q.id === questionId);
  if (question) {
    question.type = newType;
    resetAnswerOptions(question);
    saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
  }
}

function resetAnswerOptions(question) {
  if (question.type === 'multiple-choice') {
    question.options = [
      { id: generateOptionId(), text: '', isCorrect: false },
      { id: generateOptionId(), text: '', isCorrect: false }
    ];
    question.correctAnswer = '';
  } else if (question.type === 'true-false') {
    question.options = [];
    question.correctAnswer = 'True';
  } else if (question.type === 'fill-in-the-blank') {
    question.options = [];
    question.correctAnswer = '';
  }
  
  // Save draft
  if (quizEditorModal.value) {
    saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
  }
}

function setCorrectOption(question, optionIndex) {
  // Uncheck all options
  question.options.forEach((opt, idx) => {
    opt.isCorrect = idx === optionIndex;
  });
  
  // Set correctAnswer to the option ID (safer than text)
  const selectedOption = question.options[optionIndex];
  if (selectedOption) {
    question.correctAnswer = selectedOption.id || selectedOption.text;
  }
  
  // Save draft
  if (quizEditorModal.value) {
    saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
  }
}

function addOption(question) {
  if (question.options.length < 6) {
    question.options.push({ 
      id: generateOptionId(), 
      text: '', 
      isCorrect: false 
    });
    
    // Save draft
    if (quizEditorModal.value) {
      saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
    }
  }
}

function removeOption(question, optionIndex) {
  if (question.options.length > 2) {
    // If removing the correct answer, clear correctAnswer
    if (question.options[optionIndex].isCorrect) {
      question.correctAnswer = '';
    }
    question.options.splice(optionIndex, 1);
    
    // Save draft
    if (quizEditorModal.value) {
      saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
    }
  }
}

function updateOptionText(question, optionId, newText) {
  const option = question.options.find(opt => opt.id === optionId);
  if (option) {
    option.text = newText;
    // If this is the correct answer, update correctAnswer too
    if (option.isCorrect) {
      question.correctAnswer = option.id || newText;
    }
  }
}

// Debounced draft save for text inputs
let draftSaveTimer = null;
function debouncedSaveDraft() {
  if (!quizEditorModal.value) return;
  
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    saveDraftToLocalStorage(quizEditorModal.value.quiz.id, quizEditorModal.value.quiz);
  }, 1000); // Save 1 second after user stops typing
}

async function saveQuiz() {
  if (!quizEditorModal.value) return;
  
  const quiz = quizEditorModal.value.quiz;
  const moduleId = quizEditorModal.value.moduleId;
  
  console.log('[SAVE QUIZ] Starting save...', {
    id: quiz.id,
    questionsCount: quiz.questions.length
  });
  
  // Prevent double-click
  if (quizSaving.value) {
    console.log('[SAVE QUIZ] Already saving, ignoring duplicate click');
    return;
  }
  
  quizSaving.value = true;
  
  try {
    // Auto-populate title from mission if empty
    if (!quiz.title || !quiz.title.trim()) {
      const module = trainingModules.value.find(m => m.id === moduleId);
      quiz.title = module?.title || 'Untitled Quiz';
    }
    
    // Validation
    if (quiz.questions.length === 0) {
      if (!confirm('This quiz has no questions. Save anyway?')) {
        quizSaving.value = false;
        return;
      }
    }
    
    // Validate each question
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      
      if (!q.prompt || !q.prompt.trim()) {
        alert(`Question ${i + 1}: Question text is required`);
        quizSaving.value = false;
        return;
      }
      
      if (q.type === 'multiple-choice') {
        // Check if at least 2 options exist
        if (!q.options || q.options.length < 2) {
          alert(`Question ${i + 1}: At least 2 options are required`);
          quizSaving.value = false;
          return;
        }
        
        // Check if all options have text
        const emptyOption = q.options.findIndex(opt => !opt.text || !opt.text.trim());
        if (emptyOption !== -1) {
          alert(`Question ${i + 1}: Option ${emptyOption + 1} text is required`);
          quizSaving.value = false;
          return;
        }
        
        // Check if a correct answer is selected
        const hasCorrect = q.options.some(opt => opt.isCorrect);
        if (!hasCorrect) {
          alert(`Question ${i + 1}: Please select the correct answer`);
          quizSaving.value = false;
          return;
        }
        
        // Ensure correctAnswer is set properly
        const correctOpt = q.options.find(opt => opt.isCorrect);
        if (correctOpt) {
          q.correctAnswer = correctOpt.id || correctOpt.text;
        }
      }
      
      if (q.type === 'true-false') {
        if (!q.correctAnswer || (q.correctAnswer !== 'True' && q.correctAnswer !== 'False')) {
          alert(`Question ${i + 1}: Please select True or False as the correct answer`);
          quizSaving.value = false;
          return;
        }
      }
      
      if (q.type === 'fill-in-the-blank') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          alert(`Question ${i + 1}: Correct answer is required`);
          quizSaving.value = false;
          return;
        }
      }
    }
    
    // Update timestamp
    quiz.updatedAt = new Date().toISOString();
    
    // Save to Firestore (primary database)
    if (!window.firebaseApi) {
      throw new Error('Firebase API not available');
    }
    
    console.log('[SAVE QUIZ] Saving to Firestore...');
    const firestoreData = {
      title: quiz.title,
      description: quiz.description || '',
      moduleId: moduleId,
      questions: quiz.questions,
      updatedAt: quiz.updatedAt,
      createdBy: quiz.createdBy || currentUser.value?.id || 'instructor',
      createdAt: quiz.createdAt // Preserve original creation time
    };
    
    const response = await window.firebaseApi.updateQuiz(quiz.id, firestoreData);
    rememberMissionQuiz({ ...quiz, moduleId });
    console.log('[SAVE QUIZ] ✅ Saved to Firestore:', response);
    
    // Update localStorage (backup/cache)
    const idx = progressData.value.quizzes.findIndex(q => q.id === quiz.id);
    if (idx !== -1) {
      progressData.value.quizzes[idx] = JSON.parse(JSON.stringify(quiz));
    } else {
      progressData.value.quizzes.push(JSON.parse(JSON.stringify(quiz)));
    }
    saveProgress(progressData.value);
    console.log('[SAVE QUIZ] ✅ Updated localStorage');
    
    // Clear draft after successful save
    clearDraftFromLocalStorage(quiz.id);
    
    // Close editor
    quizEditorModal.value = null;
    quizSaving.value = false;
    
    // Show success message
    showAchievement('✅ Quiz saved successfully!');
    console.log('[SAVE QUIZ] ✅ Complete');
    
  } catch (error) {
    console.error('[SAVE QUIZ] ❌ Failed:', error);
    quizSaving.value = false;
    alert('Failed to save quiz: ' + error.message + '\n\nYour changes are saved as a draft and can be recovered.');
  }
}

function cancelQuizEditor() {
  if (quizEditorModal.value) {
    // Check if there are unsaved changes
    const hasChanges = true; // Simplified check
    
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Your work is saved as a draft. Discard anyway?')) {
        return;
      }
    }
    
    quizEditorModal.value = null;
  }
}

function deleteQuiz(quizId) {
  if (!confirm('Delete this quiz? Student submissions will be preserved.')) {
    return;
  }
  
  // Remove quiz
  progressData.value.quizzes = progressData.value.quizzes.filter(q => q.id !== quizId);
  
  // Remove assignments
  progressData.value.quizAssignments = progressData.value.quizAssignments.filter(
    a => a.quizId !== quizId
  );
  
  saveProgress(progressData.value);
  
  // Refresh manager
  openQuizManager(quizManagerModal.value.moduleId);
}

// Alias functions for spec compatibility (Task 2.2)
// These aliases match the function names specified in the design document
function createNewQuiz() {
  return startCreatingQuiz();
}

function deleteQuestion(index) {
  return removeQuestion(index);
}

function resetAnswers(question) {
  return resetAnswerOptions(question);
}

// Student Quiz Functions
const activeQuizSession = ref(null);
const quizResultsModal = ref(null);

// ============================================
// POST-DOCKING QUIZ SYSTEM STATE
// ============================================

/**
 * Controls visibility of the post-docking quiz modal.
 * Set to true when a quiz should be presented after anchor deployment.
 * @type {Ref<boolean>}
 */
const showPostDockingQuiz = ref(false);

/**
 * Stores the quiz data to be presented in the post-docking quiz modal.
 * Contains the full quiz object with questions, title, and description.
 * @type {Ref<Object|null>}
 */
const postDockingQuizData = ref(null);

/**
 * Flag to prevent duplicate quiz triggers for the same docking event.
 * Set to true when a quiz is triggered, reset when anchor is raised or mission ends.
 * @type {Ref<boolean>}
 */
const postDockingQuizTriggered = ref(false);

const isPostDockingQuizSubmitting = ref(false);
const missionQuizLoading = ref(false);
const missionQuizLoadError = ref('');
let missionQuizRequest = 0;

const activeMissionQuizSubmission = computed(() => findCompletedQuizSubmission(
  progressData.value.quizSubmissions, {
    studentId: currentUser.value?.id,
    moduleId: activeTrainingModule.value?.id,
    missionId: activeMission.value?.id
  }
));

async function restoreMissionQuizCompletion() {
  const request = ++missionQuizRequest;
  const studentId = currentUser.value?.id;
  const moduleId = activeTrainingModule.value?.id;
  missionQuizLoadError.value = '';
  if (!studentId || !moduleId) {
    missionQuizLoading.value = false;
    return false;
  }
  missionQuizLoading.value = true;
  try {
    const { scores } = await firebaseApi.getQuizScores(studentId);
    if (request !== missionQuizRequest || currentUser.value?.id !== studentId
      || activeTrainingModule.value?.id !== moduleId) return false;
    if (!Array.isArray(scores)) throw new Error('Invalid saved quiz results');
    progressData.value.quizSubmissions = restoreQuizSubmissions(progressData.value.quizSubmissions, scores, studentId);
    saveProgress(progressData.value);
    return true;
  } catch (error) {
    if (request === missionQuizRequest) {
      console.warn('Could not check saved quiz results:', error);
      missionQuizLoadError.value = 'Could not check your saved quiz. Please retry.';
    }
    return false;
  } finally {
    if (request === missionQuizRequest) missionQuizLoading.value = false;
  }
}

watch([() => activeTrainingModule.value?.id, () => currentUser.value?.id, isTrainingReviewMode], () => {
  restoreMissionQuizCompletion();
});

// Raising the anchor resets report readiness; docking again reuses the same quiz.
watch([activeMissionQuizSubmission, () => anchor.value.deployed, isTrainingReviewMode,
  () => activeTrainingModule.value?.id], ([submission, deployed]) => {
  if (activeTrainingModule.value && deployed && (submission || isTrainingReviewMode.value)) {
    postDockingQuizTriggered.value = true;
    missionReadyToReport.value = true;
  }
});

/**
 * Controls visibility of the mission briefing screen.
 * Set to true to show briefing before mission starts.
 * @type {Ref<boolean>}
 */
const showMissionBriefing = ref(false);

/**
 * Stores the mission object for the briefing screen.
 * @type {Ref<Object|null>}
 */
const missionToStart = ref(null);

/**
 * Timestamp of last quiz check to prevent spam checking
 * @type {number}
 */
let lastQuizCheckTime = 0;

// ============================================
// MARITIME UI STATE
// ============================================

/**
 * Controls visibility of the buoy interaction modal.
 * @type {Ref<boolean>}
 */
const showBuoyInteractionModal = ref(false);

/**
 * Controls visibility of the mission complete modal.
 * @type {Ref<boolean>}
 */
const showMissionCompleteModal = ref(false);

/**
 * Controls visibility of the engine status indicator.
 * @type {Ref<boolean>}
 */
const showEngineStatus = ref(false);

/**
 * Controls visibility of the quiz results modal.
 * @type {Ref<boolean>}
 */
const showQuizResults = ref(false);

/**
 * Stores the quiz submission data to be displayed in the results modal.
 * Contains answers, score, and correctness information.
 * @type {Ref<Object|null>}
 */
const quizResultsData = ref(null);

function getQuizStatusLabel(quizId) {
  const studentId = currentUser.value?.id;
  if (!studentId) return 'Not Started';
  
  if (!progressData.value.quizSubmissions) return 'Not Started';
  
  const submission = progressData.value.quizSubmissions.find(
    s => s.quizId === quizId && s.studentId === studentId
  );
  
  if (!submission) return 'Not Started';
  
  if (submission.status === 'pending') return 'Pending Review';
  
  if (!progressData.value.quizResults) return 'Not Started';
  
  const result = progressData.value.quizResults.find(
    r => r.submissionId === submission.id
  );
  
  if (result) return `Graded: ${result.score}%`;
  
  return 'Not Started';
}

function getQuizStatusClass(quizId) {
  const status = getQuizStatusLabel(quizId);
  if (status.includes('Graded')) return 'quiz-status-graded';
  if (status === 'Pending Review') return 'quiz-status-pending';
  return 'quiz-status-not-started';
}

function canTakeQuiz(quizId) {
  const studentId = currentUser.value?.id;
  if (!studentId) return false;
  
  if (!progressData.value.quizSubmissions) return true;
  
  const submission = progressData.value.quizSubmissions.find(
    s => s.quizId === quizId && s.studentId === studentId
  );
  
  return !submission;
}

function isQuizGraded(quizId) {
  const studentId = currentUser.value?.id;
  if (!studentId) return false;
  
  if (!progressData.value.quizSubmissions) return false;
  if (!progressData.value.quizResults) return false;
  
  const submission = progressData.value.quizSubmissions.find(
    s => s.quizId === quizId && s.studentId === studentId
  );
  
  if (!submission) return false;
  
  const result = progressData.value.quizResults.find(
    r => r.submissionId === submission.id
  );
  
  return !!result;
}

function startQuizSession(quiz) {
  if (!canTakeQuiz(quiz.id)) return;
  activeQuizSession.value = {
    quiz: JSON.parse(JSON.stringify(quiz)),
    answers: new Array(quiz.questions?.length || 0).fill(''),
    startedAt: new Date().toISOString()
  };
}

const allQuestionsAnswered = computed(() => {
  if (!activeQuizSession.value) return false;
  return activeQuizSession.value.answers.every(answer => answer !== '' && answer !== null && answer !== undefined);
});

async function submitQuizSession() {
  if (!activeQuizSession.value || !canTakeQuiz(activeQuizSession.value.quiz.id)) return;
  if (!allQuestionsAnswered.value) {
    alert('Please answer all questions before submitting');
    return;
  }
  
  const studentId = currentUser.value.id;
  const studentName = currentUser.value.name;
  const quiz = activeQuizSession.value.quiz;
  const quizId = quiz.id;
  const answers = activeQuizSession.value.answers;
  
  // Auto-grade the quiz
  let correctCount = 0;
  const totalQuestions = quiz.questions.length;
  
  quiz.questions.forEach((question, index) => {
    const studentAnswer = answers[index];
    
    if (question.type === 'multiple-choice') {
      // Find the correct option
      const correctOption = question.options.find(opt => opt.isCorrect);
      if (correctOption && studentAnswer === correctOption.text) {
        correctCount++;
      }
    } else if (question.type === 'true-false') {
      if (studentAnswer === question.correctAnswer) {
        correctCount++;
      }
    } else if (question.type === 'fill-in-the-blank') {
      // Case-insensitive comparison, trim whitespace
      const correctAnswer = (question.correctAnswer || '').toLowerCase().trim();
      const userAnswer = (studentAnswer || '').toLowerCase().trim();
      if (correctAnswer === userAnswer) {
        correctCount++;
      }
    }
  });
  
  const score = Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= 70;
  
  // Save to localStorage for backwards compatibility
  if (!progressData.value.quizSubmissions) {
    progressData.value.quizSubmissions = [];
  }
  if (!progressData.value.quizResults) {
    progressData.value.quizResults = [];
  }
  
  // Check if submission already exists (retake scenario)
  let submission = progressData.value.quizSubmissions.find(
    s => s.quizId === quizId && s.studentId === studentId
  );
  
  if (submission) {
    // Update existing submission (retake)
    submission.answers = [...answers];
    submission.submittedAt = new Date().toISOString();
    submission.status = 'graded';
  } else {
    // Create new submission
    submission = {
      id: `submission-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      quizId: quizId,
      studentId: studentId,
      studentName: studentName,
      answers: [...answers],
      submittedAt: new Date().toISOString(),
      status: 'graded'
    };
    
    progressData.value.quizSubmissions.push(submission);
  }
  
  // Create/update result
  const resultId = `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const result = {
    id: resultId,
    submissionId: submission.id,
    score: score,
    correctAnswers: correctCount,
    totalQuestions: totalQuestions,
    passed: passed,
    gradedAt: new Date().toISOString(),
    feedback: `You answered ${correctCount} out of ${totalQuestions} questions correctly.`
  };
  
  // Remove old result if exists
  progressData.value.quizResults = progressData.value.quizResults.filter(
    r => r.submissionId !== submission.id
  );
  progressData.value.quizResults.push(result);
  
  saveProgress(progressData.value);
  
  // === CAPTURE MISSION AND MODULE CONTEXT ===
  const missionId = activeMission.value?.id || null;
  const moduleId = activeTrainingModule.value?.id || null;
  const instructorId = currentUser.value?.instructorId || '';
  
  // Save to Firestore via REST API
  try {
    const quizScoreData = {
      studentId: studentId,
      instructorId: instructorId,
      moduleId: moduleId,
      quizId: quizId,
      ...(missionId ? { missionId } : {}),
      quizTitle: quiz.title || 'Untitled Quiz',
      'Quiz-score-percentage': score,         // Percentage (0-100)
      'raw-score': correctCount,              // Raw correct answer count
      passed: passed,
      totalQuestions: totalQuestions,
      correctAnswers: correctCount,
      completedAt: new Date().toISOString()
    };
    
    console.log('📤 Sending quiz score to Firestore:', quizScoreData);
    
    const response = await fetch(`${API_BASE_URL}/quiz-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quizScoreData)
    });
    
    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Quiz score saved to Firestore:', data);
    } else {
      const errorData = await response.text();
      console.error('⚠️ Failed to save quiz score to Firestore:', response.status, errorData);
    }
  } catch (error) {
    console.error('❌ Error saving quiz score to Firestore:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
  
  // Show results immediately
  activeQuizSession.value = null;
  
  quizResultsModal.value = {
    quizTitle: quiz.title,
    questions: quiz.questions,
    answers: answers,
    validation: quiz.questions.map((q, index) => {
      const studentAnswer = answers[index];
      let isCorrect = false;
      
      if (q.type === 'multiple-choice') {
        const correctOption = q.options.find(opt => opt.isCorrect);
        isCorrect = correctOption && studentAnswer === correctOption.text;
      } else if (q.type === 'true-false') {
        isCorrect = studentAnswer === q.correctAnswer;
      } else if (q.type === 'fill-in-the-blank') {
        const correctAnswer = (q.correctAnswer || '').toLowerCase().trim();
        const userAnswer = (studentAnswer || '').toLowerCase().trim();
        isCorrect = correctAnswer === userAnswer;
      }
      
      return isCorrect;
    }),
    score: score,
    passed: passed,
    feedback: result.feedback,
    gradedAt: result.gradedAt,
    quizId: quizId
  };
}

function cancelQuizSession() {
  if (confirm('Are you sure you want to cancel? Your answers will not be saved.')) {
    activeQuizSession.value = null;
  }
}

function viewQuizResults(quizId) {
  if (!progressData.value.quizSubmissions) return;
  if (!progressData.value.quizResults) return;
  
  const studentId = currentUser.value.id;
  
  const submission = progressData.value.quizSubmissions.find(
    s => s.quizId === quizId && s.studentId === studentId
  );
  
  if (!submission) return;
  
  const result = progressData.value.quizResults.find(
    r => r.submissionId === submission.id
  );
  
  if (!result) return;
  
  const quiz = progressData.value.quizzes?.find(q => q.id === quizId);
  if (!quiz) return;
  
  quizResultsModal.value = {
    quizTitle: quiz.title,
    questions: quiz.questions,
    answers: submission.answers,
    validation: result.validation,
    score: result.score,
    passed: result.score >= 70,
    feedback: result.feedback,
    gradedAt: result.gradedAt,
    quizId: quizId
  };
}

function closeQuizResults() {
  quizResultsModal.value = null;
}

// ============================================
// POST-DOCKING QUIZ HANDLERS
// ============================================

/**
 * Handles the close event from the post-docking quiz modal.
 * Resets quiz state and hides the modal without submitting answers.
 * 
 * @function handlePostDockingQuizClose
 * @returns {void}
 * 
 * @example
 * // Called when user clicks cancel or close button in quiz modal
 * handlePostDockingQuizClose();
 */
function handlePostDockingQuizClose() {
  if (isPostDockingQuizSubmitting.value) return;
  showPostDockingQuiz.value = false;
  postDockingQuizData.value = null;
}

/**
 * Handle "Take Quiz" button click
 * Attempts to load quiz for current module, shows modal if found, otherwise shows error
 */
async function handleTakeQuizClick() {
  if (isTrainingReviewMode.value || missionQuizLoading.value || isPostDockingQuizSubmitting.value) return;
  const moduleId = activeTrainingModule.value?.id;
  if (!moduleId) {
    alert('Error: No active training module found.');
    return;
  }
  
  try {
    if (activeMissionQuizSubmission.value) {
      missionReadyToReport.value = true;
      return;
    }
    // Verify persisted results before showing questions, including after refresh.
    const verified = await restoreMissionQuizCompletion();
    if (activeMissionQuizSubmission.value) {
      missionReadyToReport.value = true;
      return;
    }
    if (!verified || activeTrainingModule.value?.id !== moduleId) return;
    console.log('[TAKE QUIZ] Loading quiz for module:', moduleId);
    
    // Load quiz from Firestore using direct query
    const quiz = await getQuizForModuleFromFirestore(moduleId);
    if (activeTrainingModule.value?.id !== moduleId || isTrainingReviewMode.value) return;
    if (findCompletedQuizSubmission(progressData.value.quizSubmissions, {
      studentId: currentUser.value?.id, moduleId, quizId: quiz?.id
    })) {
      missionReadyToReport.value = true;
      return;
    }
    
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      // Valid quiz found
      console.log('[TAKE QUIZ] ✅ Quiz found! Showing modal');
      postDockingQuizData.value = quiz;
      await nextTick();
      showPostDockingQuiz.value = true;
      return;
    }
    
    // No quiz found
    console.warn('[TAKE QUIZ] No quiz found for moduleId:', moduleId);
    alert('No quiz available for this mission. Please contact your instructor.');
    
  } catch (error) {
    console.error('[TAKE QUIZ] Error:', error);
    alert('Failed to load quiz. Please try again.');
  }
}

/**
 * Skip quiz and go directly to report mission
 */
function skipQuizAndReport() {
  console.log('[SKIP QUIZ] User chose to skip quiz');
  missionReadyToReport.value = true;
}

/**
 * Check for post-docking quiz when student docks
 * Queries quiz collection by moduleId to see if a quiz is assigned to current mission
 */
async function checkForPostDockingQuiz() {
  if (isTrainingReviewMode.value) return;
  const verified = await restoreMissionQuizCompletion();
  if (activeMissionQuizSubmission.value) {
    postDockingQuizTriggered.value = true;
    missionReadyToReport.value = true;
    return;
  }
  if (!verified) return;
  console.log('[QUIZ CHECK] === FUNCTION CALLED ===');
  console.log('[QUIZ CHECK] activeTrainingModule:', activeTrainingModule.value);
  
  const moduleId = activeTrainingModule.value?.id;
  console.log('[QUIZ CHECK] Module ID:', moduleId);
  
  if (!moduleId) {
    console.warn('[QUIZ CHECK] No module ID found, exiting');
    postDockingQuizTriggered.value = true;
    missionReadyToReport.value = true;
    return;
  }
  
  try {
    console.log('[QUIZ CHECK] Loading quiz from Firestore via REST API...');
    
    // Use the same direct query approach as handleTakeQuizClick
    const quiz = await getQuizForModuleFromFirestore(moduleId);
    
    console.log('[QUIZ CHECK] Quiz result:', quiz);
    
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      // Valid quiz found - SET DATA FIRST, THEN SHOW MODAL
      console.log('[QUIZ CHECK] ✓✓✓ VALID QUIZ FOUND ✓✓✓');
      console.log('[QUIZ CHECK] Setting postDockingQuizData first...');
      postDockingQuizData.value = quiz;
      
      // Wait a tick to ensure reactive data is updated
      await nextTick();
      
      console.log('[QUIZ CHECK] Now setting showPostDockingQuiz to true...');
      showPostDockingQuiz.value = true;
      console.log('[QUIZ CHECK] Modal should be visible now!');
      console.log('[QUIZ CHECK] postDockingQuizData:', postDockingQuizData.value);
      console.log('[QUIZ CHECK] showPostDockingQuiz:', showPostDockingQuiz.value);
      postDockingQuizTriggered.value = true;
    } else {
      // No quiz or quiz has no questions
      console.log('[QUIZ CHECK] No valid quiz found for moduleId - enabling report mission');
      postDockingQuizTriggered.value = true;
      missionReadyToReport.value = true;
    }
  } catch (error) {
    console.error('[QUIZ CHECK] ❌ ERROR:', error);
    console.error('[QUIZ CHECK] Error stack:', error.stack);
    postDockingQuizTriggered.value = true;
    missionReadyToReport.value = true;
  }
  
  console.log('[QUIZ CHECK] === FUNCTION COMPLETE ===');
}

/**
 * Handles quiz submission from the post-docking quiz modal.
 * Evaluates answers, calculates score, stores submission, and displays results.
 * 
 * @function handlePostDockingQuizSubmit
 * @param {Object} answers - Map of question IDs to student answers
 * @param {string} answers[questionId] - Student's answer for each question
 * @returns {void}
 * 
 * @description
 * This function:
 * 1. Validates quiz and student data
 * 2. Compares student answers to correct answers
 * 3. Calculates score (correct/total * 100)
 * 4. Creates submission object with results
 * 5. Stores submission in progressData.quizSubmissions
 * 6. Displays results modal with score breakdown
 * 
 * @example
 * // Answers object structure
 * const answers = {
 *   'q1': 'Option A',
 *   'q2': 'True',
 *   'q3': 'starboard'
 * };
 * handlePostDockingQuizSubmit(answers);
 * 
 * @throws {Error} Logs warning if quiz data or student ID is missing
 * 
 * @see {@link PostDockingQuizModal} for answer collection
 * @see {@link QuizResultsModal} for results display
 */
async function handlePostDockingQuizSubmit(answers) {
  if (isTrainingReviewMode.value) return;
  if (isPostDockingQuizSubmitting.value) return;
  // Validate quiz data exists
  if (!postDockingQuizData.value) {
    console.warn('Cannot submit quiz: no quiz data available');
    return;
  }
  
  const studentId = currentUser.value?.id;
  if (!studentId) {
    console.warn('Cannot submit quiz: no student ID available');
    return;
  }
  
  const quiz = postDockingQuizData.value;
  
  // Handle empty quiz (no questions) - should not reach here due to earlier checks
  if (!quiz.questions || quiz.questions.length === 0) {
    console.warn('Cannot submit quiz: quiz has no questions');
    handlePostDockingQuizClose();
    return;
  }
  
  const moduleId = activeTrainingModule.value?.id;
  if (findCompletedQuizSubmission(progressData.value.quizSubmissions, {
    studentId, moduleId, quizId: quiz.id
  })) {
    handlePostDockingQuizClose();
    missionReadyToReport.value = true;
    return;
  }
  if (quiz.questions.some(question => answers[question.id] === undefined
    || String(answers[question.id]).trim() === '')) return;
  const missionId = activeMission.value?.id;
  isPostDockingQuizSubmitting.value = true;
  
  try {
    // Initialize data structures if needed
    if (!progressData.value.quizSubmissions) {
      progressData.value.quizSubmissions = [];
    }
    
    // Calculate score by checking options with isCorrect flag
    let correctCount = 0;
    let validQuestionCount = 0;
    
    const answersArray = quiz.questions.map(question => {
      const studentAnswer = answers[question.id] || '';
      
      // Find the correct answer based on question type
      let correctAnswer = null;
      let isCorrect = false;
      
      if (question.type === 'multiple-choice') {
        // For multiple choice, find the option marked as correct
        const correctOption = question.options?.find(opt => opt.isCorrect === true);
        if (correctOption) {
          correctAnswer = correctOption.text;
          validQuestionCount++;
          
          // Case-insensitive & trimmed comparison
          const norm = (v) => (v ?? '').toString().trim().toLowerCase();
          isCorrect = norm(studentAnswer) === norm(correctAnswer);
          if (isCorrect) correctCount++;
        } else {
          console.warn(`Question ${question.id} has no correct option marked`);
        }
      } else if (question.type === 'true-false' || question.type === 'fill-in-the-blank') {
        // For true/false and fill-in-the-blank, use correctAnswer field
        if (question.correctAnswer) {
          correctAnswer = question.correctAnswer;
          validQuestionCount++;
          
          // Case-insensitive & trimmed comparison
          const norm = (v) => (v ?? '').toString().trim().toLowerCase();
          isCorrect = norm(studentAnswer) === norm(correctAnswer);
          if (isCorrect) correctCount++;
        } else {
          console.warn(`Question ${question.id} is missing correctAnswer field`);
        }
      }
      
      return {
        questionId: question.id,
        studentAnswer: studentAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect
      };
    });
    
    // Calculate score based on valid questions only
    const score = validQuestionCount > 0 
      ? Math.round((correctCount / validQuestionCount) * 100) 
      : 0;
    
    // Create submission
    let submission = {
      id: `submission-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      quizId: quiz.id,
      studentId: studentId,
      trainingModuleId: moduleId,
      ...(missionId ? { missionId } : {}),
      answers: answersArray,
      score: score,
      totalQuestions: validQuestionCount,
      correctAnswers: correctCount,
      status: 'graded',
      submittedAt: new Date().toISOString(),
      trigger: 'post-docking',
      quiz: quiz // Include quiz data for results display
    };
    
    // Commit remotely before marking the quiz completed locally. A failed save
    // keeps the modal and answers available so the student can retry saving.
    const saved = await firebaseApi.saveQuizScore({
      studentId, instructorId: currentUser.value?.instructorId || '',
      moduleId, quizId: quiz.id, ...(missionId ? { missionId } : {}),
      quizTitle: quiz.title || 'Quiz',
      'Quiz-score-percentage': score, 'raw-score': correctCount,
      passed: score >= 70, totalQuestions: validQuestionCount,
      correctAnswers: correctCount, completedAt: submission.submittedAt
    });
    if (currentUser.value?.id !== studentId || activeTrainingModule.value?.id !== moduleId) return;
    if (saved.skipped && !saved.data) {
      showPostDockingQuiz.value = false;
      postDockingQuizData.value = null;
      return;
    }
    if (saved.skipped) {
      submission = { ...saved.data, id: saved.scoreId };
    } else if (saved.data) {
      Object.assign(submission, saved.data, { id: saved.scoreId,
        trainingModuleId: saved.data.moduleId || moduleId,
        score: saved.data['Quiz-score-percentage'] ?? saved.data.score ?? score });
    }
    progressData.value.quizSubmissions = restoreQuizSubmissions(
      progressData.value.quizSubmissions, [submission], studentId);
    submission = findCompletedQuizSubmission(progressData.value.quizSubmissions, { studentId, quizId: quiz.id, moduleId });
    
    // Add try-catch around progressStore write operations
    try {
      saveProgress(progressData.value);
    } catch (error) {
      console.error('Failed to save quiz submission to localStorage:', error);
      // Still show results even if save fails (data is in memory)
      alert('Warning: Quiz results could not be saved to local storage, but will be available until you close the browser.');
    }
    
    // Hide quiz modal - no need to show results modal, directly show "REPORT MISSION" button
    showPostDockingQuiz.value = false;
    postDockingQuizData.value = null;
    
    // Enable "REPORT MISSION" button
    missionReadyToReport.value = true;
    postDockingQuizTriggered.value = true;
    
    showTrainingNotification(
      '✅ Quiz submitted!',
      `Score: ${quizScoreCounts(submission).correct}/${quizScoreCounts(submission).total} correct (${submission.score}%). You can now report your mission.`,
      { variant: 'success', durationMs: 4000 }
    );
  } catch (error) {
    console.error('Error during quiz submission:', error);
    alert('An error occurred while submitting the quiz. Please try again.');
    // Don't close the modal so user can retry
  } finally {
    isPostDockingQuizSubmitting.value = false;
  }
}

/**
 * Handles the close event from the quiz results modal.
 * Dismisses the results modal and allows the student to continue the simulation.
 * 
 * @function handleQuizResultsClose
 * @returns {void}
 * 
 * @description
 * This function cleans up the quiz results state and hides the modal.
 * The simulation automatically resumes as the modal no longer blocks interaction.
 * 
 * @example
 * // Called when user clicks close button in results modal
 * handleQuizResultsClose();
 */
function handleQuizResultsClose() {
  showQuizResults.value = false;
  quizResultsData.value = null;
  // Simulation automatically resumes as modal no longer blocks interaction
}

const BUOY_TASK_TYPES = ['photograph', 'verify_id', 'remove_debris'];

/**
 * Randomly shuffle tasks across all buoy steps each time a mission starts.
 * Cycles through [photograph, verify_id, remove_debris] so every task type
 * appears roughly equally regardless of how many buoys there are.
 */
function randomizeBuoyTasks(module) {
  if (!module || !Array.isArray(module.buoys) || !module.buoys.length) return;

  const buoyZoneIds = new Set(module.buoys.map(b => b.waypointZone).filter(Boolean));
  const buoySteps = module.steps.filter(s => buoyZoneIds.has(s.waypointZone));
  if (!buoySteps.length) return;

  // Build a shuffled task pool big enough to cover all buoys
  const pool = [];
  while (pool.length < buoySteps.length) {
    const chunk = [...BUOY_TASK_TYPES];
    for (let i = chunk.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chunk[i], chunk[j]] = [chunk[j], chunk[i]];
    }
    pool.push(...chunk);
  }

  const actionLabel = {
    photograph: 'photograph it',
    verify_id: 'verify its ID',
    remove_debris: 'clear debris from it'
  };

  buoySteps.forEach((step, i) => {
    const task = pool[i];
    step.requireInteraction = task;
    if (task === 'verify_id') {
      // Random 3-digit ID the player must read from the buoy and enter
      step.buoyId = String(100 + Math.floor(Math.random() * 900));
    } else {
      delete step.buoyId;
    }
    const buoy = module.buoys.find(b => b.waypointZone === step.waypointZone);
    const name = buoy?.name || `Buoy ${i + 1}`;
    step.instruction = `Navigate to ${name} and ${actionLabel[task]} (Q)`;
  });
}

function ensureMissionBuoySteps(module) {
  if (!module || !Array.isArray(module.buoys) || !module.buoys.length) return;

  const steps = Array.isArray(module.steps) ? module.steps : [];
  const buoySteps = module.buoys.map((buoy, index) => {
    const waypointZone = buoy.waypointZone || `${module.id}-buoy-${index + 1}`;
    const existingStep = steps.find((step) => step.waypointZone === waypointZone);
    
    // Use the interaction type from the buoy, default to 'inspect_buoy' if not specified
    const interactionType = buoy.requireInteraction || 'inspect_buoy';
    
    // Generate instruction text based on interaction type
    const actionText = {
      'photograph': 'photograph it',
      'verify_id': 'verify its ID',
      'remove_debris': 'clear debris',
      'inspect_buoy': 'inspect it'
    }[interactionType] || 'interact with it';
    
    if (existingStep) {
      existingStep.requireInteraction = interactionType;
      existingStep.instruction = existingStep.instruction || `Navigate to ${buoy.name || `Buoy ${index + 1}`} and ${actionText} (Q)`;
      return existingStep;
    }

    return {
      instruction: `Navigate to ${buoy.name || `Buoy ${index + 1}`} and ${actionText} (Q)`,
      waypointZone,
      type: 'compass',
      heading: String((45 + (index * 360) / module.buoys.length) % 360),
      requireInteraction: interactionType
    };
  });
  
  const buoyZoneIds = new Set(buoySteps.map((step) => step.waypointZone));
  const nonBuoySteps = steps.filter((step) => !buoyZoneIds.has(step.waypointZone) && step.type !== 'dock');
  const dockSteps = steps.filter((step) => step.type === 'dock');
  
  // Add automatic "Return to Port" step at the end if not already present
  const hasReturnToPort = dockSteps.some(step => step.instruction && step.instruction.includes('Return to port'));
  if (!hasReturnToPort) {
    dockSteps.push({
      instruction: 'Return to port, drop anchor, and report mission completion',
      waypointZone: 'harbor-berth',
      type: 'dock',
      anchorAction: 'deploy',
      requireReport: true  // New flag to require manual reporting
    });
  }
  
  module.steps = [...buoySteps, ...nonBuoySteps, ...dockSteps];
}

function startTrainingModule(moduleId, options = {}) {
  if (!isAuthenticated.value) {
    goToScreen('auth');
    return;
  }

  const module = trainingModules.value.find(m => m.id === moduleId);
  if (!module) return;
  if (!canViewMission(module, { ...currentUser.value, role: userRole.value })) return;

  ensureMissionBuoySteps(module);
  randomizeBuoyTasks(module);

  isTrainingReviewMode.value = options.review === true;
  activeMission.value = options.mission ?? findMissionForModule(moduleId) ?? null;
  activeTrainingModule.value = module;
  currentTrainingStep.value = 0;
  interactionReadyStep.value = null;

  // Initialize performance tracking system
  performanceManager.cancelMission();
  if (!isTrainingReviewMode.value && currentUser.value?.id) {
    performanceManager.startMission({
      id: activeMission.value?.id || module.id,
      studentId: currentUser.value.id,
      steps: module.steps,
      duration: module.duration || '10 minutes',
      waypoints: module.steps.filter(s => s.waypointZone),
      tasks: module.steps.filter(s => s.requireInteraction),
      objectives: module.steps
    });
    console.log('[App] Performance tracking started for mission:', module.id);
  }

  if (moduleId === 'emergency-docking' && !isTrainingReviewMode.value) {
    const route = buildHarborRoute(SIMULATION_SPAWN.x, SIMULATION_SPAWN.z, islandGroup);
    wind.value.speed = 0.4;
    wind.value.directionAngle = Math.round((route.approachHeadingDeg + 35) % 360);
    physics.value.windForce = 0.08;
  }

  trainingRunMetrics.value = createTrainingRunMetrics();
  
  // Set total steps and waypoints required for Course Accuracy calculation
  const totalSteps = (module.missionSteps && module.missionSteps.length > 0) 
    ? module.missionSteps.length 
    : module.steps.length;
  trainingRunMetrics.value.totalSteps = totalSteps;
  
  // Count waypoints required (steps with waypointZone)
  const waypointsRequired = countWaypointSteps(module);
  trainingRunMetrics.value.waypointsRequired = waypointsRequired;
  
  console.log('🔧 [METRICS INIT] Module:', module.id);
  console.log('🔧 [METRICS INIT] Total buoys:', module.buoys?.length || 0);
  console.log('🔧 [METRICS INIT] Total steps in module.steps:', module.steps.length);
  console.log('🔧 [METRICS INIT] Total steps SET TO METRICS:', totalSteps);
  console.log('🔧 [METRICS INIT] Waypoints required SET TO METRICS:', waypointsRequired);
  console.log('🔧 [METRICS INIT] trainingRunMetrics.value:', {
    totalSteps: trainingRunMetrics.value.totalSteps,
    waypointsRequired: trainingRunMetrics.value.waypointsRequired,
    stepsCompleted: trainingRunMetrics.value.stepsCompleted,
    waypointsReached: trainingRunMetrics.value.waypointsReached
  });
  
  // Set expected mission time for Time Efficiency calculation
  if (module.duration) {
    // Parse duration string to milliseconds (same logic as performanceManager)
    const durationStr = String(module.duration).trim();
    let expectedMs = 600000; // Default 10 minutes
    
    const match = durationStr.match(/(\d+)(?:-(\d+))?\s*min/i);
    if (match) {
      const min1 = parseInt(match[1]);
      const min2 = match[2] ? parseInt(match[2]) : min1;
      const avgMinutes = (min1 + min2) / 2;
      expectedMs = avgMinutes * 60 * 1000;
    } else {
      const plainNumber = parseInt(durationStr);
      if (!isNaN(plainNumber) && plainNumber > 0) {
        expectedMs = plainNumber * 60 * 1000; // Plain numbers are minutes
      }
    }
    
    trainingRunMetrics.value.expectedTime = expectedMs;
  } else {
    // No duration specified - default to 3 minutes for fallback scoring
    trainingRunMetrics.value.expectedTime = 180000; // 3 minutes
  }
  
  trainingStepSuccess.value = false;
  trainingRunFinished.value = false;
  trainingStepError.value = false;
  trainingFeedback.value = isTrainingReviewMode.value
    ? 'Practice review — complete each step to rehearse the mission.'
    : '';

  isQuickSailMode.value = false;
  showCinematicLoading.value = true;
  loadingHint.value = isTrainingReviewMode.value
    ? 'Loading practice review...'
    : 'Loading training scenario...';

  const startingRun = trainingRunMetrics.value;
  const enterTrainingSimulation = async () => {
    if (activeTrainingModule.value !== module || trainingRunMetrics.value !== startingRun) return;
    showCinematicLoading.value = false;
    goToScreen('simulation');
    await syncWorldForSimulation();
    if (activeTrainingModule.value !== module || trainingRunMetrics.value !== startingRun || activeScreen.value !== 'simulation') return;
    
    // Apply the mission's required boat type AFTER scene is ready
    if (activeMission.value?.boatType) {
      const boatTypeId = activeMission.value.boatType;
      console.log('[startTrainingModule] Applying mission boat type:', boatTypeId);
      applyBoatTypePhysics(boatTypeId);
      if (scene && boatObject && activeBoatModelFile.value) {
        console.log('[startTrainingModule] Swapping to boat model:', activeBoatModelFile.value);
        await swapBoatModel(activeBoatModelFile.value);
      }
    }
    
    if (activeTrainingModule.value !== module || trainingRunMetrics.value !== startingRun || activeScreen.value !== 'simulation') return;
    resetTrainingRunState();
    syncTrainingWaypointMarkers();
    captureTrainingStepBaseline();
    
    // Set initial waypoint in performance system
    if (performanceManager.isActive) {
      const firstStep = module.steps[0];
      if (firstStep?.waypointZone) {
        const waypointId = firstStep.waypointZone;
        performanceManager.setActiveWaypoint(
          findWaypoint(trainingWaypoints.value, waypointId),
          { x: stats.value.boatX, z: stats.value.boatZ }
        );
        console.log('[App] Initial waypoint set:', waypointId);
      }
    }
    
    // Apply mission weather with the same sea state as Set Sail.
    applyLevelWeather(module);
    
    // Show engine status indicator at mission start
    showEngineStatus.value = true
    setTimeout(() => {
      showEngineStatus.value = false
    }, 5000) // Hide after 5 seconds
  };

  Promise.resolve(archipelagoLoadPromise)
    .then(enterTrainingSimulation)
    .catch((err) => {
      console.error('Archipelago not ready for training:', err);
      enterTrainingSimulation();
    });
}

function isMissionCompleted(mission) {
  return Boolean(getMissionResult(mission)?.passed);
}

function getMissionResult(mission) {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return null;
  return getLatestMissionResult(studentId, mission.id, progressData.value);
}

function missionCardClass(mission) {
  const result = getMissionResult(mission);
  if (!result) return '';
  return result.passed ? 'hub-mission-row--passed' : 'hub-mission-row--failed';
}

function missionActionLabel(mission) {
  if (isMissionLocked(mission)) return 'Locked';
  const result = getMissionResult(mission);
  if (!result) return 'Start →';
  if (result.passed) return 'Practice review →';
  return 'Retry →';
}

/**
 * Build a synthetic mission record for a custom (instructor-created) module.
 * This lets the student portal render and launch the mission just like a builtin.
 */
function buildSyntheticMissionForCustomModule(moduleId) {
  const mod = trainingModules.value.find((m) => m.id === moduleId);
  if (!mod) return null;
  return {
    id: `CUSTOM-${moduleId}`,
    title: mod.title,
    difficulty: (mod.difficulty || 'Beginner').toUpperCase(),
    description: mod.description || '',
    passScore: mod.passScore || mod.pass_score || 70, // Read from module, default to 70
    xpReward: mod.xpReward ?? mod.xp_reward ?? 100, // Preserve an explicit zero reward.
    estimatedDuration: mod.estimatedDuration || mod.estimated_duration || 10, // For time scoring
    moduleId,
    boatType: mod.boatType || 'medium'
  };
}

function findMissionForModule(moduleId) {
  const builtin = navigationMissions.find((m) => m.moduleId === moduleId);
  if (builtin) return builtin;
  // Custom instructor-created module → synthesize mission
  return buildSyntheticMissionForCustomModule(moduleId);
}

function getMissionsForModule(moduleId) {
  const builtins = navigationMissions.filter((m) => m.moduleId === moduleId);
  if (builtins.length) return builtins;
  // No builtin mission for this module → treat as custom and provide one
  const synthetic = buildSyntheticMissionForCustomModule(moduleId);
  return synthetic ? [synthetic] : [];
}

function getModuleResult(moduleId) {
  const studentId = currentUser.value?.id;
  if (!studentId) return null;

  const missions = getMissionsForModule(moduleId);
  for (const mission of missions) {
    const result = getLatestMissionResult(studentId, mission.id, progressData.value);
    if (result) return result;
  }
  return null;
}

function syncStudentMissionProgress() {
  demoStudent.value.completed = navigationMissions.filter((m) => isMissionCompleted(m)).length;
}

function motivationContext() {
  return {
    getMissionsForModule,
    totalMissionCount: navigationMissions.length
  };
}

function refreshInstructorReviewAwards(studentId) {
  if (!studentId) {
    instructorReviewAwards.value = { badges: [], certificates: [] };
    return;
  }
  const ctx = motivationContext();
  instructorReviewAwards.value = {
    badges: getInstructorBadgeOptions(studentId, progressData.value, ctx),
    certificates: getInstructorCertificateOptions(studentId, progressData.value, ctx)
  };
}

async function syncStudentMotivation() {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return;
  await refreshCurrentUser();

  // Fetch XP from Firestore API
  let xpData = { totalXp: 0, missionsCompleted: 0 };
  try {
    const response = await fetch(`${API_BASE_URL}/mission-scores/student/${studentId}/total-xp`);
    if (response.ok) {
      xpData = await response.json();
    }
  } catch (error) {
    console.warn('Failed to fetch XP from API:', error);
  }

  const summary = getStudentMotivationSummary(
    studentId,
    progressData.value,
    navigationMissions.length,
    { ...currentUser.value, xp: totalXP.value }
  );
  demoStudent.value.name = currentUser.value.name ?? demoStudent.value.name;
  demoStudent.value.xp = summary.xp;
  demoStudent.value.rank = summary.rank;
  demoStudent.value.completed = xpData.missionsCompleted;
  demoStudent.value.averageScore = summary.averageScore;
  demoStudent.value.bestScore = summary.bestScore;
  demoStudent.value.badgesEarned = summary.badgesEarned;
  demoStudent.value.badgesTotal = summary.badgesTotal;
  demoStudent.value.certificates = summary.certificates;
  demoStudent.value.xpProgress = summary.xpProgress;
  demoStudent.value.xpNextAt = summary.xpNextAt;
}

async function applyStoredStudentProgress() {
  const studentId = currentUser.value.id;
  if (!studentId) return;

  const completedModuleIds = getCompletedModuleIds(studentId, progressData.value);
  trainingModules.value.forEach((module) => {
    module.completed = completedModuleIds.includes(module.id);
  });
  await syncStudentMotivation();
}

function formatCertificateDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get CSS class for score badge based on percentage
 * @param {number} score - Score percentage (0-100)
 * @returns {string} CSS class name
 */
function getScoreClass(score) {
  if (score >= 80) return 'score-excellent';
  if (score >= 70) return 'score-good';
  if (score >= 50) return 'score-fair';
  return 'score-poor';
}

function openCertificateModal(cert, studentName) {
  certificateModal.value = {
    ...cert,
    studentName: studentName ?? currentUser.value?.name ?? ''
  };
  syncUiCursor();
}

function dismissCertificateModal() {
  certificateModal.value = null;
  syncUiCursor();
}

function printCertificate() {
  window.print();
}

async function refreshInstructorProgress() {
  progressData.value = loadProgress();
  // Sync missions from Firestore to remove deleted missions from localStorage
  await loadMissionDatesFromFirestore();
}

function formatElapsedDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function countWaypointSteps(module) {
  return new Set(module?.steps?.map(step => step.waypointZone).filter(Boolean) ?? []).size;
}

const MODULE_PASS_SCORES = {
  'm1-mission1': 80,
  'm1-mission2': 80,
  'm1-mission3': 80
};

let trainingNotificationTimer = null;

function showFishingToast(message) {
  fishingToast.value = message;
  if (fishingToastTimer) window.clearTimeout(fishingToastTimer);
  fishingToastTimer = window.setTimeout(() => {
    fishingToast.value = null;
    fishingToastTimer = null;
  }, 3200);
}

function getWaterSurfaceY(x, z) {
  return SCENE_WATERLINE_Y + (ocean?.sampleHeight?.(x, z) ?? 0);
}

function getBoatWaveMotion() {
  const length = boatObject.userData?.loaMeters ?? 88;
  const motion = sampleBoatWaveMotion(
    boatObject.position.x, boatObject.position.z, boatObject.rotation.y,
    length,
    (x, z) => ocean?.sampleHeight?.(x, z) ?? 0
  );
  return { ...motion, ...getBoatWaveResponse(length) };
}

function toggleFishingLine() {
  if (!fishingLineSystem || activeScreen.value !== 'simulation') return;
  // Fishing now enabled during training missions
  const ok = fishingLineSystem.toggleFishingGear();
  if (!ok && !fishingLineActive.value) {
    const near = getNearestFishingSpot(stats.value.boatX, stats.value.boatZ);
    showFishingToast(
      near
        ? `Not a fishing ground. Nearest: ${near.spot.label} (${Math.round(near.distance)} m away)`
        : 'Sail to an amber fishing ring on the radar.'
    );
  }
}

/** Toggle boat engine: start if off, stop if running */
function startEngine() {
  if (activeScreen.value !== 'simulation') return;
  // If engine is running, stop it
  if (engineRunning.value) {
    engineRunning.value = false;
    engineStarting.value = false;
    showEngineStatus.value = true;
    setTimeout(() => {
      showEngineStatus.value = false;
    }, 3000);
    showTrainingNotification('Engine stopped', 'Engine has been turned off.', { variant: 'info', durationMs: 2000 });
    return;
  }
  
  // If already starting, ignore
  if (engineStarting.value) return;
  
  // Start the engine
  engineStarting.value = true;
  showEngineStatus.value = true;
  
  showTrainingNotification('Engine starting', 'Starting engine…', { variant: 'review', durationMs: 1800 });
  // Small delay to simulate starter and RPM spooling
  const startingBoat = boatObject;
  const startingRun = trainingRunMetrics.value;
  setTimeout(() => {
    if (!engineStarting.value || activeScreen.value !== 'simulation' || boatObject !== startingBoat || trainingRunMetrics.value !== startingRun) return;
    engineStarting.value = false;
    engineRunning.value = true;
    
    // Set engine start timestamp for collision grace period
    window.engineStartTime = performance.now();
    
    showTrainingNotification('Engine started', 'Engine is running. You can now drive the boat.', { variant: 'success', durationMs: 2600 });
    
    // Hide engine status after a few seconds
    setTimeout(() => {
      showEngineStatus.value = false;
    }, 3000);
  }, 1600);
}

function syncFishingUiState() {
  if (!fishingLineSystem) return;
  const state = fishingLineSystem.getState();
  fishingLineActive.value =
    state === FishingState.DEPLOYING || state === FishingState.FISHING;
  fishingFishCount.value = fishingLineSystem.getInventory().fish;
}

function initFishingLineSystem() {
  if (!scene || fishingLineSystem) return;
  fishingLineSystem = createFishingLineSystem(scene, {
    getBoat: () => boatObject,
    getWaterSurfaceY,
    onFishCaught(total, caughtFish) {
      fishInventory.value.push({
        ...caughtFish,
        caughtAt: Date.now(),
        source: 'net'
      });
      fishingFishCount.value = total;
      showFishingToast(`Fish caught! (${total} total)`);
      // Track fishing activity if in training
      if (activeTrainingModule.value) {
        trackFishingActivity(trainingRunMetrics.value, true);
      }
    },
    onDeployBlocked() {
      const near = getNearestFishingSpot(stats.value.boatX, stats.value.boatZ);
      showFishingToast(
        near
          ? `Not a fishing ground. Nearest: ${near.spot.label} (${Math.round(near.distance)} m away)`
          : 'Sail to an amber fishing ring on the radar.'
      );
      // Track failed fishing attempt if in training
      if (activeTrainingModule.value) {
        trackFishingActivity(trainingRunMetrics.value, false);
      }
    },
    onLeaveFishingSpot() {
      showFishingToast('Left fishing grounds — net retrieved.');
    },
    onStateChange() {
      syncFishingUiState();
    },
  });

  if (!fishingSpotMarkers) {
    fishingSpotMarkers = createFishingSpotMarkers(scene);
  }
}

function initRainWeather() {
  if (!scene || rainWeatherSystem) return;
  rainWeatherSystem = createRainWeatherSystem(scene, {
    getCamera: () => {
      if (activeCamera.value === 'helm') return camera2;
      return camera;
    },
    getWind: () => wind.value,
  });
}

function showTrainingNotification(title, message, options = {}) {
  const { variant = 'success', durationMs = 4500 } = options;
  trainingNotification.value = { title, message, variant };
  if (trainingNotificationTimer) {
    window.clearTimeout(trainingNotificationTimer);
    trainingNotificationTimer = null;
  }
  if (durationMs > 0) {
    trainingNotificationTimer = window.setTimeout(() => {
      if (trainingNotification.value?.title === title) {
        trainingNotification.value = null;
      }
      trainingNotificationTimer = null;
    }, durationMs);
  }
}

function dismissTrainingNotification() {
  trainingNotification.value = null;
  if (trainingNotificationTimer) {
    window.clearTimeout(trainingNotificationTimer);
    trainingNotificationTimer = null;
  }
}

const missionReportSaving = ref(false);
async function openMissionCompleteModal(module) {
  const mission = activeMission.value ?? findMissionForModule(module.id);
  if (isTrainingReviewMode.value || (mission && getMissionResult(mission)?.passed)) {
    openSavedMissionReport(module);
    return;
  }
  if (missionReportSaving.value) return;
  missionReportSaving.value = true;
  const run = trainingRunMetrics.value;
  const reportingStudentId = currentUser.value?.id;
  try {
  const passScore = mission?.passScore ?? MODULE_PASS_SCORES[module.id] ?? 80;
  
  // Complete performance tracking and get report
  let performanceReport = null;
  if (performanceManager.isActive && !isTrainingReviewMode.value) {
    performanceReport = performanceManager.completeMission();
    console.log('[App] Performance report generated:', performanceReport);
  }
  
  // Use missionSteps count if available, otherwise fallback to waypoint steps
  const stepCount = (module.missionSteps && module.missionSteps.length > 0)
    ? module.missionSteps.length
    : module.steps.length;
  
  const elapsedMs = (trainingRunMetrics.value.endedAt || performance.now()) - trainingRunMetrics.value.startedAt;
  const waypointSteps = countWaypointSteps(module);
  const waypointsVisited = trainingRunMetrics.value.visitedWaypoints.size;  // Count of unique waypoints entered
  
  // Reuse the completed quiz on every mission retry, including restored results.
  let quizScore = undefined;
  let quizCorrect = 0;
  let quizTotal = 0;
  
  if (currentUser.value?.id && progressData.value?.quizSubmissions) {
    const submission = findCompletedQuizSubmission(progressData.value.quizSubmissions, {
      studentId: currentUser.value.id, moduleId: module.id, missionId: mission?.id
    });
    if (submission) {
      const counts = quizScoreCounts(submission);
      quizTotal = counts.total;
      quizCorrect = counts.correct;
      quizScore = quizTotal;
    }
  }

  // Calculate mission score using NEW 4-METRIC SYSTEM
  // Steps (40%) + Waypoints (30%) + Quiz (20%) + Time (10%)
  const actualTimeMinutes = elapsedMs / 60000; // Convert ms to minutes
  const targetTimeMinutes = performanceManager.parseExpectedTime(mission?.estimatedDuration ?? module.duration) / 60000;
  
  const scoringResult = calculateMissionScore({
    stepsCompleted: trainingRunMetrics.value.stepsCompleted,
    totalSteps: stepCount,
    waypointsReached: waypointsVisited,
    totalWaypoints: waypointSteps,
    quizCorrect,
    quizTotal: quizTotal || 1, // Avoid division by zero
    actualTimeMinutes,
    targetTimeMinutes
  }, { passScore });
  
  const score = scoringResult.score;
  const passed = scoringResult.passed;
  
  let rewardSummary = null;
  if (userRole.value === 'student' && currentUser.value.id && mission?.id) {
    let saved = null;
    try {
      saved = await saveMissionScoreToFirestore({
        studentId: currentUser.value.id, missionId: mission.id,
        missionTitle: mission?.title ?? module.title, score, passed, completedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to save mission score to Firestore:', error);
      if (activeTrainingModule.value === module && trainingRunMetrics.value === run && currentUser.value?.id === reportingStudentId) {
        missionReadyToReport.value = true;
        trainingFeedback.value = 'Mission result was not saved. Report Mission again to retry.';
        showTrainingNotification('Mission report not saved', 'Please check your connection and report the mission again.',
          { variant: 'fail', durationMs: 6000 });
      }
      return;
    }
    if (activeTrainingModule.value !== module || trainingRunMetrics.value !== run || currentUser.value?.id !== reportingStudentId) return;
    // Another tab/device may have passed while this simulation was running.
    // Preserve the authoritative completion before any local awards or sessions.
    if (saved?.skipped) {
      if (saved.data) recordMissionSession({
        studentId: currentUser.value.id, studentName: currentUser.value.name,
        missionId: mission.id, missionTitle: saved.data.missionTitle || mission.title,
        moduleId: module.id, passScore, score: saved.data.score,
        passed: saved.data.passed, completedAt: saved.data.completedAt
      }, progressData.value);
      openSavedMissionReport(module);
      return;
    }
    recordMissionSession(
      {
        studentId: currentUser.value.id,
        studentName: currentUser.value.name,
        missionId: mission.id,
        missionTitle: mission?.title ?? module.title,
        moduleId: module.id,
        passScore,
        score,
        passed,
        elapsedMs
      },
      progressData.value
    );
    
    // Get XP reward from mission (numeric value)
    const xpRewardValue = module.xpReward ?? mission.xpReward ?? 100;
    
    rewardSummary = processMissionRewards(currentUser.value.id, progressData.value, {
      score,
      passed,
      missionXpReward: xpRewardValue
    });

    // Award badge specified by instructor (if set)
    if (passed && module.badgeReward) {
      instructorAwardBadge(progressData.value, {
        studentId: currentUser.value.id,
        badgeId: module.badgeReward,
        instructorId: 'system',
        instructorName: 'HelmQuest',
        note: `Earned by completing mission: ${module.title}`
      });
    }

    saveProgress(progressData.value);
    progressData.value = loadProgress();
    await syncStudentMotivation();
    
    if (saved) {
      // Display the existing backend award and total, rather than stale local XP.
      rewardSummary = { xpEarned: saved.xpAwarded, totalXp: saved.totalXp, rank: saved.rank };
      const profile = progressData.value.studentProfiles?.[currentUser.value.id];
      if (profile && saved.rankId) {
        profile.xp = saved.totalXp;
        saveProgress(progressData.value);
      }
      
      // Auto-update mission scores in Firestore
      calculateAndUpdateMissionScores(currentUser.value.id).catch(err => {
        console.error('Failed to auto-update mission scores:', err);
      });
    }
  }

  module.completed = passed;
  achievementPopup.value = '';
  if (rewardSummary?.xpEarned) {
    showAchievement(`+${rewardSummary.xpEarned} XP earned`);
  }

  missionCompleteModal.value = {
    id: mission?.id ?? 'HQ-Mission',
    title: mission?.title ?? module.title,
    passScore,
    score,
    passed,
    elapsedLabel: formatElapsedDuration(elapsedMs),
    maxSpeedLabel: `${trainingRunMetrics.value.maxSpeedKnots.toFixed(1)} kn`,
    stepsLabel: `${trainingRunMetrics.value.stepsCompleted}/${stepCount}`,
    waypointsLabel: waypointSteps
      ? `${waypointsVisited}/${waypointSteps} waypoints`
      : null,
    xpEarned: rewardSummary?.xpEarned ?? null,
    totalXp: rewardSummary?.totalXp ?? null,
    quizScore,
    quizCorrect,
    quizTotal
  };

  showTrainingNotification(
    passed ? 'Training complete!' : 'Training finished',
    passed
      ? `${module.title} — passed with ${score}%! See your mission results below.`
      : `${module.title} — score ${score}% (need ${passScore}% to pass). See results below.`,
    { variant: passed ? 'success' : 'fail', durationMs: 6000 }
  );
  syncUiCursor();
  } finally {
    missionReportSaving.value = false;
  }
}

function openSavedMissionReport(module) {
  const mission = activeMission.value ?? findMissionForModule(module.id);
  const saved = mission && getMissionResult(mission);
  if (!saved) {
    showTrainingNotification('Mission report unavailable', 'Could not find your saved mission result.',
      { variant: 'fail', durationMs: 4000 });
    return;
  }
  const submission = findCompletedQuizSubmission(progressData.value.quizSubmissions, {
    studentId: currentUser.value?.id, moduleId: module.id, missionId: mission.id
  });
  const counts = quizScoreCounts(submission);
  missionCompleteModal.value = {
    id: mission.id, title: mission.title || module.title,
    passScore: saved.passScore ?? mission.passScore ?? 80,
    score: saved.score, passed: saved.passed, isSavedReport: true,
    ...(submission ? { quizScore: counts.total, quizCorrect: counts.correct, quizTotal: counts.total } : {})
  };
  syncUiCursor();
}

function dismissMissionCompleteModal() {
  missionCompleteModal.value = null;
  dismissTrainingNotification();
  syncUiCursor();
  progressData.value = loadProgress();
  if (activeScreen.value === 'simulation') {
    exitTraining();
  } else {
    goToScreen('dashboard');
  }
}

/**
 * Report mission completion after returning to port and dropping anchor
 */
function reportMissionCompletion() {
  if (!missionReadyToReport.value || !activeTrainingModule.value) return;
  if (!anchor.value.deployed || engineRunning.value || showPostDockingQuiz.value) return;
  const module = activeTrainingModule.value;
  if (isTrainingReviewMode.value) {
    openSavedMissionReport(module);
    return;
  }
  
  missionReadyToReport.value = false;
  trainingFeedback.value = '🎉 Mission reported!';
  
  showTrainingNotification(
    'Mission reported!',
    'Calculating your mission score…',
    { variant: 'success', durationMs: 2000 }
  );
  
  // Small delay before opening modal for smooth transition
  const run = trainingRunMetrics.value;
  window.setTimeout(() => {
    if (activeTrainingModule.value === module && trainingRunMetrics.value === run) openMissionCompleteModal(module);
  }, 500);
}

/**
 * Get CSS class for metric bar based on score
 */
function getMetricClass(score) {
  if (score >= 80) return 'metric-bar--excellent';
  if (score >= 60) return 'metric-bar--good';
  if (score >= 40) return 'metric-bar--fair';
  return 'metric-bar--poor';
}

function missionDifficultyClass(difficulty) {
  const key = (difficulty || '').toLowerCase();
  if (key === 'beginner' || key === 'easy') return 'diff-beginner';
  if (key === 'intermediate' || key === 'medium') return 'diff-intermediate';
  return 'diff-advanced';
}

function trainingDifficultyClass(difficulty) {
  return missionDifficultyClass(difficulty);
}

function signOut() {
  firebaseApi.clearSession();
  ++missionCatalogRequest;
  trainingModules.value = [];
  // Reset all authentication state completely
  isAuthenticated.value = false;
  userRole.value = null;
  currentUser.value = null;
  authError.value = '';
  authForm.value = { email: '', password: '' }; // Clear login form
  authMode.value = 'signin'; // Always reset to signin form
  signupForm.value = { studentId: '', name: '', email: '', password: '', instructorId: '' }; // Clear signup form
  signupSuccess.value = false; // Reset signup success state
  availableInstructors.value = []; // Clear instructors list
  showPassword.value = false; // Reset password visibility
  showPasswordStudent.value = false; // Reset student password visibility
  adminLoginMode.value = false; // Reset admin login mode
  instructorLoginMode.value = false; // Reset instructor login mode
  
  // Reset training/mission state
  activeTrainingModule.value = null;
  isTrainingReviewMode.value = false;
  trainingStepBaseline.value = null;
  clearWaypointMarkers();
  activeMission.value = null;
  instructorReviewModal.value = null;
  
  progressData.value = loadProgress();
  applySavedLevelCreator();

  // Go directly to landing page (not auth screen)
  goToScreen('landing');
}

function applySavedLevelCreator() {
  const settings = progressData.value?.courseSettings;
  const viewer = isAuthenticated.value ? { ...currentUser.value, role: userRole.value } : null;
  trainingModules.value = trainingModules.value.filter(mission => canViewMission(mission, viewer));

  // Remove any builtin missions that the instructor previously deleted
  if (Array.isArray(settings?.deletedBuiltinMissionIds) && settings.deletedBuiltinMissionIds.length) {
    const deletedSet = new Set(settings.deletedBuiltinMissionIds);
    trainingModules.value = trainingModules.value.filter((m) => !deletedSet.has(m.id));
  }

  // Load instructor-created custom missions into the trainingModules list
  if (Array.isArray(settings?.customMissions)) {
    for (const custom of settings.customMissions) {
      if (!custom?.id || !canViewMission(custom, viewer)) continue;
      const idx = trainingModules.value.findIndex((m) => m.id === custom.id);
      if (idx >= 0) {
        trainingModules.value[idx] = { ...trainingModules.value[idx], ...custom };
      } else {
        trainingModules.value.push({ completed: false, disableFishing: false, ...custom });
      }
    }
  }

  if (progressData.value.courseSettings?.levelCreator) {
    levelCreator.value = JSON.parse(JSON.stringify(progressData.value.courseSettings.levelCreator));
  }
  if (progressData.value.courseSettings?.isMission4Published) {
    const m4 = trainingModules.value.find(m => m.id === 'm1-mission4');
    if (m4 && progressData.value.courseSettings.levelCreator) {
      const creator = progressData.value.courseSettings.levelCreator;
      m4.title = creator.title;
      m4.category = creator.category;
      m4.description = creator.description;
      m4.difficulty = creator.difficulty;
      m4.reward = creator.reward;
      m4.objectives = [...creator.objectives];
      m4.steps = creator.steps.map(s => ({
        instruction: s.instruction,
        waypointZone: s.waypointZone,
        type: s.type,
        lat: s.lat,
        lon: s.lon,
        heading: s.heading
      }));
    }
  }
}

/**
 * Open the mission editor modal for an existing module.
 */
function openMissionEditor(module) {
  if (!canManageMission(module, { ...currentUser.value, role: userRole.value })) return;
  const existingAssignment = progressData.value.quizAssignments?.find(
    (a) => a.targetId === module.id && a.targetType === 'module'
  );
  const existingQuiz = existingAssignment
    ? progressData.value.quizzes?.find((q) => q.id === existingAssignment.quizId)
    : null;

  // Extract numeric XP value from reward string if it exists
  let xpReward = 100; // default
  if (typeof module.xpReward === 'number') {
    xpReward = module.xpReward;
  } else if (typeof module.reward === 'string') {
    const match = module.reward.match(/\d+/);
    if (match) {
      xpReward = parseInt(match[0], 10);
    }
  } else if (typeof module.reward === 'number') {
    xpReward = module.reward;
  }

  // Get pass score with safe default
  const passScore = typeof module.passScore === 'number' ? module.passScore : 70;

  missionEditorModal.value = {
    isNew: false,
    originalId: module.id,
    data: {
      id: module.id,
      title: module.title,
      description: module.description,
      difficulty: module.difficulty,
      duration: module.duration,
      xpReward: xpReward, // Numeric value
      passScore: passScore, // Numeric value
      buoyCount: Array.isArray(module.buoys) ? module.buoys.length : 0,
      buoys: (module.buoys || []).map((buoy, index) => ({
        id: buoy.id || `${module.id}-buoy-${index + 1}`,
        name: buoy.name || `Buoy ${index + 1}`,
        waypointZone: buoy.waypointZone || `${module.id}-buoy-${index + 1}`,
        imageSrc: buoy.imageSrc || '',
        description: buoy.description || '',
        requireInteraction: buoy.requireInteraction || 'inspect_buoy'
      })),
      boatType: module.boatType || 'medium',
      objectives: [...(module.objectives || [])],
      steps: (module.steps || []).map((s) => ({
        instruction: s.instruction || '',
        waypointZone: s.waypointZone || '',
        type: s.type || 'gps',
        lat: s.lat || '',
        lon: s.lon || '',
        heading: s.heading || ''
      })),
      quiz: existingQuiz
        ? {
            id: existingQuiz.id,
            enabled: true,
            title: existingQuiz.title || '',
            description: existingQuiz.description || '',
            questions: existingQuiz.questions.map((q) => ({
              ...q,
              options: q.options ? q.options.map((o) => ({ ...o })) : []
            }))
          }
        : { id: null, enabled: false, title: '', description: '', questions: [] }
    }
  };
}

/**
 * Open the mission editor for creating a brand-new mission.
 */
function openMissionCreator() {
  const nextIdx = trainingModules.value.length + 1;
  const newId = `custom-mission-${Date.now()}`;
  missionEditorModal.value = {
    isNew: true,
    originalId: null,
    data: {
      id: newId,
      title: `Mission ${nextIdx}: New Mission`,
      description: '',
      difficulty: 'Beginner',
      duration: '5-10 minutes',
      xpReward: 100, // Numeric value
      passScore: 70, // Numeric value
      buoyCount: 0,
      buoys: [],
      boatType: 'medium',
      objectives: [''],
      steps: [
        { instruction: '', waypointZone: `${newId}-step-1`, type: 'gps', lat: '', lon: '', heading: '' }
      ],
      quiz: { id: null, enabled: false, title: '', description: '', questions: [] }
    }
  };
}

function addMissionBuoy() {
  if (!missionEditorModal.value) return;
  const data = missionEditorModal.value.data;
  const index = data.buoys.length + 1;
  const buoyId = `${data.id}-buoy-${index}`;
  data.buoys.push({
    id: buoyId,
    name: `Buoy ${index}`,
    waypointZone: buoyId,
    imageSrc: '',
    description: '',
    requireInteraction: 'photograph' // Default to photograph task
  });
  data.buoyCount = data.buoys.length;
}

function removeMissionBuoy(index) {
  if (!missionEditorModal.value) return;
  missionEditorModal.value.data.buoys.splice(index, 1);
  missionEditorModal.value.data.buoyCount = missionEditorModal.value.data.buoys.length;
}

// ── Inline quiz helpers (operate on missionEditorModal.data.quiz) ──

function addMissionQuestion() {
  const quiz = missionEditorModal.value?.data?.quiz;
  if (!quiz) return;
  quiz.questions.push(createBlankQuestion(quiz.questions.length));
}

function removeMissionQuestion(index) {
  const quiz = missionEditorModal.value?.data?.quiz;
  if (!quiz) return;
  quiz.questions.splice(index, 1);
}

function resetMissionAnswerOptions(question) {
  resetAnswerOptions(question);
}

function setMissionCorrectOption(question, optionIndex) {
  setCorrectOption(question, optionIndex);
}

function addMissionOption(question) {
  addOption(question);
}

function removeMissionOption(question, optionIndex) {
  removeOption(question, optionIndex);
}

function handleMissionBuoyImage(event, buoy) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxDimension = 1280;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      buoy.imageSrc = canvas.toDataURL('image/jpeg', 0.75);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Append a blank navigation waypoint step to the mission being edited.
 * (Internal navigation coordinates - different from missionSteps)
 */
function addMissionWaypointStep() {
  if (!missionEditorModal.value) return;
  const data = missionEditorModal.value.data;
  const idx = data.steps.length + 1;
  data.steps.push({
    instruction: '',
    waypointZone: `${data.id}-step-${idx}`,
    type: 'gps',
    lat: '',
    lon: '',
    heading: ''
  });
}

/**
 * Persist mission editor changes to the active trainingModules list and course settings.
 */
async function saveMissionEditor() {
  if (!missionEditorModal.value) return;
  if (userRole.value !== 'instructor' || !currentUser.value?.id) return;
  
  // Prevent double-click
  if (missionSaving.value) {
    console.log('[SAVE MISSION] Already saving, ignoring duplicate click');
    return;
  }
  
  missionSaving.value = true;
  const { isNew, data } = missionEditorModal.value;

  try {
    console.log('=== saveMissionEditor DEBUG ===');
    console.log('Mission data:', data);

    // Validation
    if (!data.title?.trim()) {
      showAchievement('⚠️ Mission title is required');
      missionSaving.value = false;
      return;
    }
    
    if (!data.duration?.trim()) {
      showAchievement('⚠️ Estimated duration is required');
      missionSaving.value = false;
      return;
    }
    
    // Validate XP Reward
    if (typeof data.xpReward !== 'number' || data.xpReward < 0) {
      showAchievement('⚠️ XP Reward must be a valid number (0 or higher)');
      missionSaving.value = false;
      return;
    }
    
    // Validate Pass Score
    if (typeof data.passScore !== 'number' || data.passScore < 0 || data.passScore > 100) {
      showAchievement('⚠️ Mission Pass Score must be between 0 and 100');
      missionSaving.value = false;
      return;
    }
    
    if (!data.buoys || data.buoys.length === 0) {
      showAchievement('⚠️ Add at least one buoy checkpoint');
      missionSaving.value = false;
      return;
    }

    // Build cleaned mission object with correct data types
    const cleaned = {
      id: data.id,
      instructorId: currentUser.value.id,
      createdBy: currentUser.value.id,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      difficulty: data.difficulty || 'Beginner',
      duration: data.duration.trim(),
      xpReward: Number(data.xpReward), // Store as number
      passScore: Number(data.passScore), // Store as number
      buoyCount: data.buoys.length,
      buoys: data.buoys.map((buoy, index) => ({
        id: buoy.id || `${data.id}-buoy-${index + 1}`,
        name: buoy.name?.trim() || `Buoy ${index + 1}`,
        waypointZone: buoy.waypointZone?.trim() || `${data.id}-buoy-${index + 1}`,
        imageSrc: buoy.imageSrc || '',
        description: buoy.description?.trim() || '',
        requireInteraction: buoy.requireInteraction || 'inspect_buoy'
      })),
      boatType: data.boatType || 'medium',
      objectives: data.objectives.map((o) => o?.trim()).filter(Boolean),
      steps: data.steps.map((s) => ({
        instruction: s.instruction?.trim() || '',
        waypointZone: s.waypointZone?.trim() || `${data.id}-step`,
        type: s.type || 'gps',
        lat: s.lat,
        lon: s.lon,
        heading: s.heading,
        requireInteraction: s.requireInteraction
      })),
      completed: false,
      disableFishing: true,
      opendate: getModuleSchedule(data.id).openDate || null,
      deadline: getModuleSchedule(data.id).deadline || null
    };

    ensureMissionBuoySteps(cleaned);

    console.log('Cleaned mission object:', cleaned);
    console.log('Mission xpReward (numeric):', cleaned.xpReward, typeof cleaned.xpReward);
    console.log('Mission passScore (numeric):', cleaned.passScore, typeof cleaned.passScore);
    console.log('Mission steps count:', cleaned.missionSteps?.length || 0);

    // Save to Firestore via REST API
    try {
      const firestoreMission = {
        mission_title: cleaned.title,
        description: cleaned.description,
        difficulty: cleaned.difficulty,
        estimated_duration: cleaned.duration,
        xp_reward: cleaned.xpReward, // Numeric value
        pass_score: cleaned.passScore, // Numeric value
        learning_objectives: cleaned.objectives,
        required_boat: cleaned.boatType,
        steps: cleaned.steps,
        checkpoints: cleaned.buoys.map((buoy) => ({
          id: buoy.id,
          name: buoy.name,
          waypointZone: buoy.waypointZone,
          image: buoy.imageSrc,
          description: buoy.description,
          requireInteraction: buoy.requireInteraction,
          required: true
        })),
        bouy: cleaned.buoys.map((buoy) => ({
          Image: buoy.imageSrc,
          bouy_description: buoy.description,
          checkpoint_id: buoy.waypointZone,
          require_interaction: buoy.requireInteraction
        })),
        opendate: cleaned.opendate,
        deadline: cleaned.deadline,
        createdBy: currentUser.value?.id || 'instructor',
        createdAt: isNew ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      };

      if (window.firebaseApi && typeof window.firebaseApi.createMission === 'function') {
        if (isNew) {
          const response = await window.firebaseApi.createMission({ id: cleaned.id, ...firestoreMission });
          console.log('✅ Mission created in Firestore:', response);
        } else {
          const response = await window.firebaseApi.updateMission(cleaned.id, firestoreMission);
          console.log('✅ Mission updated in Firestore:', response);
        }
      } else {
        throw new Error('Mission service is unavailable. Please try again.');
      }
    } catch (error) {
      throw new Error('Unable to save mission: ' + error.message);
    }

    // Update local state
    if (isNew) {
      trainingModules.value.push(cleaned);
    } else {
      const idx = trainingModules.value.findIndex((m) => m.id === missionEditorModal.value.originalId);
      if (idx >= 0) {
        trainingModules.value[idx] = { ...trainingModules.value[idx], ...cleaned };
      }
    }

    // Persist custom missions to progressData
    if (!progressData.value.courseSettings) progressData.value.courseSettings = {};
    const settings = progressData.value.courseSettings;
    if (!Array.isArray(settings.customMissions)) settings.customMissions = [];
    
    const customIdx = settings.customMissions.findIndex((m) => m.id === cleaned.id);
    if (customIdx >= 0) {
      settings.customMissions[customIdx] = cleaned;
    } else {
      settings.customMissions.push(cleaned);
    }

    // Ensure new missions appear in moduleOrder
    if (isNew) {
      if (!Array.isArray(settings.moduleOrder)) settings.moduleOrder = [];
      if (!settings.moduleOrder.includes(cleaned.id)) {
        settings.moduleOrder.push(cleaned.id);
      }
    }

    saveProgress(progressData.value);
    await persistMissionQuiz(cleaned.id, data.quiz);
    
    showAchievement(isNew ? '✅ Mission created successfully!' : '✅ Mission updated successfully!');
    missionEditorModal.value = null;
    missionSaving.value = false;
    
  } catch (error) {
    console.error('[SAVE MISSION] ❌ Failed:', error);
    missionSaving.value = false;
    showAchievement('❌ Failed to save mission: ' + error.message);
  }
}

/**
 * Save the quiz defined inside the mission editor and keep its module
 * assignment in sync. Removes an existing quiz/assignment when disabled.
 */
async function persistMissionQuiz(moduleId, quizForm) {
  const progress = progressData.value;
  if (!progress.quizzes) progress.quizzes = [];
  if (!progress.quizAssignments) progress.quizAssignments = [];

  const existingAssignment = progress.quizAssignments.find(
    (a) => a.targetId === moduleId && a.targetType === 'module'
  );

  // Quiz disabled → remove any existing quiz/assignment for this module
  if (!quizForm?.enabled) {
    if (existingAssignment) {
      progress.quizzes = progress.quizzes.filter((q) => q.id !== existingAssignment.quizId);
      progress.quizAssignments = progress.quizAssignments.filter((a) => a.id !== existingAssignment.id);
    }
    return;
  }

  const nowIso = new Date().toISOString();
  const questions = (quizForm.questions || []).map((q, idx) => {
    const options = (q.options || []).map((o) => ({
      text: (o.text ?? '').toString().trim(),
      isCorrect: !!o.isCorrect
    }));

    // Derive the correctAnswer field per question type so validation works.
    let correctAnswer = '';
    if (q.type === 'multiple-choice') {
      // The correct MC option's text is stored as correctAnswer for grading
      const correctOpt = options.find((o) => o.isCorrect);
      correctAnswer = correctOpt?.text || '';
    } else {
      correctAnswer = (q.correctAnswer ?? '').toString().trim();
    }

    return {
      id: `question-${idx + 1}`,
      prompt: (q.prompt ?? '').toString().trim(),
      type: q.type || 'multiple-choice',
      options,
      correctAnswer,
      order: idx
    };
  });

  // Update-in-place if quiz already exists, otherwise create a new one
  let quizId = quizForm.id;
  const existingQuiz = quizId ? progress.quizzes.find((q) => q.id === quizId) : null;

  if (existingQuiz) {
    existingQuiz.title = quizForm.title?.trim() || 'Mission Quiz';
    existingQuiz.description = quizForm.description?.trim() || '';
    existingQuiz.questions = questions;
    existingQuiz.updatedAt = nowIso;
  } else {
    quizId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    progress.quizzes.push({
      id: quizId,
      title: quizForm.title?.trim() || 'Mission Quiz',
      description: quizForm.description?.trim() || '',
      questions,
      buoyCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: currentUser.value?.id || 'instructor'
    });
  }

  // Ensure an assignment ties the quiz to the module
  if (existingAssignment) {
    existingAssignment.quizId = quizId;
  } else {
    progress.quizAssignments.push({
      id: `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quizId,
      targetType: 'module',
      targetId: moduleId,
      createdAt: nowIso,
      createdBy: currentUser.value?.id || 'instructor'
    });
  }

  // Persist quiz to Firestore
  try {
    const firestoreData = {
      title: quizForm.title?.trim() || 'Mission Quiz',
      description: quizForm.description?.trim() || '',
      moduleId: moduleId,
      questions: questions.map(q => ({
        prompt: q.prompt,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer
      })),
      createdBy: currentUser.value?.id || 'instructor'
    };

    if (existingQuiz) {
      // Update existing quiz in Firestore
      firestoreData.updatedAt = nowIso;
      await window.firebaseApi.updateQuiz(quizId, firestoreData);
    } else {
      // Create new quiz in Firestore
      firestoreData.createdAt = nowIso;
      await window.firebaseApi.createQuiz(firestoreData);
    }
  } catch (error) {
    console.warn('Failed to save quiz to Firestore, localStorage persisted:', error);
  }
}

/**
 * Delete a mission (custom or builtin) after confirmation.
 * Builtin deletions are recorded in courseSettings.deletedBuiltinMissionIds
 * so they stay hidden after a reload.
 */
async function confirmDeleteMission(module) {
  if (!module || !canManageMission(module, { ...currentUser.value, role: userRole.value })) return;
  const isBuiltin = BUILTIN_MISSION_IDS.has(module.id);
  const promptMsg = isBuiltin
    ? `Delete builtin "${module.title}"? Students will no longer see this mission. You can restore it later by clearing site data.`
    : `Delete "${module.title}"? This cannot be undone.`;
  const ok = window.confirm(promptMsg);
  if (!ok) return;

  try {
    await firebaseApi.deleteMission(module.id);
  } catch (error) {
    showAchievement('Unable to delete mission: ' + error.message);
    return;
  }

  trainingModules.value = trainingModules.value.filter((m) => m.id !== module.id);

  if (!progressData.value.courseSettings) progressData.value.courseSettings = {};
  const settings = progressData.value.courseSettings;

  if (isBuiltin) {
    if (!Array.isArray(settings.deletedBuiltinMissionIds)) {
      settings.deletedBuiltinMissionIds = [];
    }
    if (!settings.deletedBuiltinMissionIds.includes(module.id)) {
      settings.deletedBuiltinMissionIds.push(module.id);
    }
  } else if (Array.isArray(settings.customMissions)) {
    settings.customMissions = settings.customMissions.filter((m) => m.id !== module.id);
  }

  if (Array.isArray(settings.moduleOrder)) {
    settings.moduleOrder = settings.moduleOrder.filter((id) => id !== module.id);
  }

  // Remove any quiz assignment + quiz tied to this module
  if (Array.isArray(progressData.value.quizAssignments)) {
    const orphaned = progressData.value.quizAssignments.filter(
      (a) => a.targetId === module.id && a.targetType === 'module'
    );
    const orphanedQuizIds = orphaned.map((a) => a.quizId);
    progressData.value.quizAssignments = progressData.value.quizAssignments.filter(
      (a) => !(a.targetId === module.id && a.targetType === 'module')
    );
    if (Array.isArray(progressData.value.quizzes) && orphanedQuizIds.length) {
      progressData.value.quizzes = progressData.value.quizzes.filter(
        (q) => !orphanedQuizIds.includes(q.id)
      );
      
      // Delete orphaned quizzes from Firestore
      try {
        if (window.firebaseApi) {
          for (const quizId of orphanedQuizIds) {
            await window.firebaseApi.deleteQuiz(quizId);
            console.log('✅ Quiz deleted from Firestore:', quizId);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to delete quiz from Firestore:', error);
      }
    }
  }

  saveProgress(progressData.value);
  
  showAchievement('🗑️ Mission deleted');
}

/**
 * Whether the given moduleId was created by an instructor (deletable).
 */
function isCustomMission(moduleId) {
  return !BUILTIN_MISSION_IDS.has(moduleId);
}

/**
 * Load mission dates (opendate, deadline) from Firestore and sync to localStorage
 */
let missionCatalogRequest = 0;
async function loadMissionDatesFromFirestore() {
  const viewer = { ...currentUser.value, role: userRole.value };
  const request = ++missionCatalogRequest;
  if (!isAuthenticated.value || !viewer.id) {
    trainingModules.value = [];
    return;
  }
  if (!window.firebaseApi) {
    console.log('⚠️ Firebase API not available, skipping date load');
    return;
  }
  
  try {
    const response = await window.firebaseApi.getAllMissions();
    if (request !== missionCatalogRequest || currentUser.value?.id !== viewer.id || userRole.value !== viewer.role) return;
    const missions = (response.missions || []).filter(mission => canViewMission(mission, viewer));
    const firestoreMissionIds = new Set(missions.map((mission) => mission.id).filter(Boolean));

    // Firestore is the source of truth: hide local/builtin missions that have no document.
    trainingModules.value = trainingModules.value.filter((module) => firestoreMissionIds.has(module.id));
    const settings = getCourseSettings(progressData.value);
    settings.customMissions = (settings.customMissions || []).filter(mission => firestoreMissionIds.has(mission.id));
    settings.moduleOrder = [...new Set([
      ...settings.moduleOrder.filter(id => firestoreMissionIds.has(id)), ...firestoreMissionIds
    ])];
    
    if (!progressData.value.moduleSchedule) {
      progressData.value.moduleSchedule = {};
    }
    
    // Sync dates from Firestore to localStorage
    missions.forEach(mission => {
      if (mission.id) {
        if (!progressData.value.moduleSchedule[mission.id]) {
          progressData.value.moduleSchedule[mission.id] = {};
        }
        
        // Update from Firestore if dates exist
        if (mission.opendate) {
          progressData.value.moduleSchedule[mission.id].openDate = mission.opendate;
        }
        if (mission.deadline) {
          progressData.value.moduleSchedule[mission.id].deadline = mission.deadline;
        }

        const remoteBuoys = Array.isArray(mission.bouy)
          ? mission.bouy.map((buoy, index) => ({
              id: `${mission.id}-buoy-${index + 1}`,
              name: `Buoy ${index + 1}`,
              waypointZone: buoy.checkpoint_id || `${mission.id}-buoy-${index + 1}`,
              imageSrc: buoy.Image || '',
              description: buoy.bouy_description || ''
            }))
          : [];
        const remoteBuoyIds = new Set(remoteBuoys.map((buoy) => buoy.waypointZone));
        const remoteSteps = (Array.isArray(mission.steps) ? mission.steps : [])
          .filter((step) => !remoteBuoys.length || remoteBuoyIds.has(step.waypointZone) || step.type === 'dock')
          .map((step) => ({
          ...step,
          requireInteraction: remoteBuoyIds.has(step.waypointZone)
            ? 'inspect_buoy'
            : step.requireInteraction
          }));
        const remoteMission = {
          id: mission.id,
          instructorId: missionOwner(mission),
          createdBy: mission.createdBy || missionOwner(mission),
          title: mission.mission_title || mission.title || 'Untitled Mission',
          description: mission.description || '',
          difficulty: mission.difficulty || 'Beginner',
          duration: mission.estimated_duration || mission.duration || '5-10 minutes',
          xpReward: typeof mission.xp_reward === 'number' ? mission.xp_reward : 100,
          passScore: typeof mission.pass_score === 'number' ? mission.pass_score : 70,
          boatType: mission.required_boat || mission.boatType || 'medium',
          objectives: Array.isArray(mission.learning_objectives)
            ? mission.learning_objectives
            : (mission.objectives || []),
          missionSteps: Array.isArray(mission.mission_steps) 
            ? mission.mission_steps 
            : [],
          steps: remoteSteps,
          buoys: remoteBuoys,
          buoyCount: remoteBuoys.length,
          opendate: mission.opendate || null,
          deadline: mission.deadline || null,
          completed: false,
          disableFishing: true
        };
        ensureMissionBuoySteps(remoteMission);
        const existingIndex = trainingModules.value.findIndex((entry) => entry.id === mission.id);
        if (existingIndex >= 0) {
          trainingModules.value[existingIndex] = {
            ...trainingModules.value[existingIndex],
            ...remoteMission
          };
        } else {
          trainingModules.value.push(remoteMission);
        }

        if (!Array.isArray(progressData.value.courseSettings.customMissions)) {
          progressData.value.courseSettings.customMissions = [];
        }
        const customIndex = progressData.value.courseSettings.customMissions
          .findIndex((entry) => entry.id === mission.id);
        if (customIndex >= 0) {
          progressData.value.courseSettings.customMissions[customIndex] = remoteMission;
        } else {
          progressData.value.courseSettings.customMissions.push(remoteMission);
        }
      }
    });
    
    saveProgress(progressData.value);
    console.log('✅ Mission dates loaded from Firestore');
  } catch (error) {
    if (request === missionCatalogRequest && currentUser.value?.id === viewer.id) trainingModules.value = [];
    console.error('❌ Failed to load mission dates from Firestore:', error);
  }
}

/**
 * Cheap accessor for the module's schedule (openDate/deadline) with a safe default.
 */
function getModuleSchedule(moduleId) {
  return progressData.value?.moduleSchedule?.[moduleId] ?? { openDate: '', deadline: '' };
}

/**
 * Format mission date for display (e.g., "Jan 15, 2026 at 11:30 PM")
 */
function formatMissionDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  };
  return date.toLocaleString('en-US', options);
}

/**
 * Fetch student training records from Firestore (mission scores and quiz submissions)
 */
async function fetchStudentTrainingRecords() {
  const studentId = currentUser.value?.id;
  if (!studentId || userRole.value !== 'student') return;

  const request = ++trainingRecordsRequest;
  loadingTrainingRecords.value = true;
  missionRecordsError.value = '';
  quizRecordsError.value = '';
  // One failed endpoint must not prevent the other set of records from loading.
  const results = await Promise.allSettled([
    Promise.resolve().then(() => window.firebaseApi.getMissionScores(studentId)),
    Promise.resolve().then(() => window.firebaseApi.getQuizScores(studentId))
  ]);
  if (request !== trainingRecordsRequest || currentUser.value?.id !== studentId || userRole.value !== 'student') return;

  const panels = [
    { records: firestoreMissionScores, error: missionRecordsError, label: 'mission records' },
    { records: firestoreQuizSubmissions, error: quizRecordsError, label: 'quiz results' }
  ];
  results.forEach((result, index) => {
    const panel = panels[index];
    if (result.status === 'fulfilled' && Array.isArray(result.value?.scores)) {
      panel.records.value = result.value.scores;
      if (index === 0) {
        restoreSavedMissionResults(studentId, result.value.scores, progressData.value,
          getMissionsForModule, trainingModules.value.map(module => module.id));
      }
    } else {
      panel.error.value = `Unable to load your ${panel.label}. Please try again.`;
      console.error(`Failed to fetch ${panel.label}:`, result.reason || 'Invalid response');
    }
  });
  loadingTrainingRecords.value = false;
}

/**
 * Check if mission is available based on openDate and deadline
 * Returns: { status: 'not_open' | 'available' | 'closed', message: string }
 */
function getMissionAvailabilityStatus(moduleId) {
  const schedule = getModuleSchedule(moduleId);
  const now = new Date();
  
  // If no dates set, mission is always available
  if (!schedule.openDate && !schedule.deadline) {
    return { status: 'available', message: '' };
  }
  
  // Check if not yet open
  if (schedule.openDate) {
    const openDate = new Date(schedule.openDate);
    if (now < openDate) {
      return { 
        status: 'not_open', 
        message: '🔒 Not yet available' 
      };
    }
  }
  
  // Check if deadline passed
  if (schedule.deadline) {
    const deadline = new Date(schedule.deadline);
    if (now > deadline) {
      return { 
        status: 'closed', 
        message: '⏰ Deadline passed' 
      };
    }
  }
  
  return { status: 'available', message: '' };
}

/**
 * Instructor lock check used by the mission cards (reactive to progressData).
 */
function isModuleLockedByInstructorNow(moduleId) {
  return progressData.value?.courseSettings?.lockedModuleIds?.includes(moduleId) === true;
}

function adminSaveLevel() {
  if (!progressData.value.courseSettings) {
    progressData.value.courseSettings = {};
  }
  progressData.value.courseSettings.levelCreator = JSON.parse(JSON.stringify(levelCreator.value));
  saveProgress(progressData.value);

  levelCreatorSaved.value = true;
  window.setTimeout(() => { levelCreatorSaved.value = false; }, 3000);
}

function adminPublishLevel() {
  if (!progressData.value.courseSettings) {
    progressData.value.courseSettings = {};
  }
  progressData.value.courseSettings.isMission4Published = true;
  progressData.value.courseSettings.levelCreator = JSON.parse(JSON.stringify(levelCreator.value));
  
  if (progressData.value.courseSettings.moduleOrder && !progressData.value.courseSettings.moduleOrder.includes('m1-mission4')) {
    progressData.value.courseSettings.moduleOrder.push('m1-mission4');
  }

  saveProgress(progressData.value);
  applySavedLevelCreator();

  levelCreatorSaved.value = true;
  showAchievement('✅ Level published! Mission 4 is now live for students.');
  window.setTimeout(() => { levelCreatorSaved.value = false; }, 4000);
}

function formatSessionDate(isoDate) {
  if (!isoDate) return 'Unknown date';
  return new Date(isoDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function reviewStudent(student) {
  progressData.value = loadProgress();
  instructorReviewModal.value = {
    student,
    sessions: getStudentSessions(student.id, progressData.value),
    quizSubmissions: getStudentQuizSubmissions(student.id)
  };
  refreshInstructorReviewAwards(student.id);
  syncUiCursor();
}

/**
 * Open student detail modal with training record
 */
async function openStudentDetail(student) {
  selectedStudentDetail.value = student;
  studentDetailTab.value = 'overview';
  showStudentDetailModal.value = true;
  await loadStudentDetailData(student.id);
}
async function loadStudentDetailData(studentId) {
  const instructorId = currentUser.value?.id;
  const request = ++studentDetailRequest;
  studentDetailLoading.value = true;
  studentDetailError.value = '';
  try {
    const response = await firebaseApi.getInstructorStudentRecord(instructorId, studentId);
    if (!response?.student || response.student.id !== studentId) throw new Error('Invalid student record');
    if (request !== studentDetailRequest || currentUser.value?.id !== instructorId || selectedStudentDetail.value?.id !== studentId || userRole.value !== 'instructor') return;
    selectedStudentDetail.value = response.student;
    const index = studentManagement.value?.students.findIndex(student => student.id === studentId) ?? -1;
    if (index >= 0) studentManagement.value.students[index] = response.student;
  } catch (error) {
    if (request === studentDetailRequest) studentDetailError.value = 'Could not load this student’s training records. Please try again.';
  } finally {
    if (request === studentDetailRequest) studentDetailLoading.value = false;
  }
}
function closeStudentDetail() {
  studentDetailRequest++;
  showStudentDetailModal.value = false;
  selectedStudentDetail.value = null;
  studentDetailLoading.value = false;
  studentDetailError.value = '';
}
/**
 * Approve a pending student signup — flips status to 'active' on both the
 * registeredUsers auth record and the students list.
 */
async function approveStudentSignup(accountId) {
  if (!window.firebaseApi) {
    showAchievement('✕ API not available');
    return;
  }
  
  try {
    const instructorId = currentUser.value?.id || 'instructor';
    const response = await window.firebaseApi.approveStudent(accountId, instructorId);
    
    // Get the approved student data from the response
    const approvedStudent = response.student;
    
    // Remove from pending list
    const pendingStudent = pendingStudentsFromFirestore.value.find(s => s.id === accountId);
    pendingStudentsFromFirestore.value = pendingStudentsFromFirestore.value.filter(
      s => s.id !== accountId
    );
    
    // Add to progressData.students so it appears in the Students table immediately
    const progress = progressData.value;
    if (!progress.students) {
      progress.students = [];
    }
    
    // Add the approved student to localStorage students array
    progress.students.push({
      id: approvedStudent.id,
      studentId: approvedStudent.studentId,
      name: approvedStudent.name,
      email: approvedStudent.email,
      status: 'active',
      xp: approvedStudent.xp || 0,
      rank: deriveProgression(studentTotalXp(approvedStudent), progressData.value.courseSettings).rank.name,
      completed: approvedStudent.completed || 0,
      averageScore: approvedStudent.averageScore || 0,
      bestScore: approvedStudent.bestScore || 0,
      badgesEarned: approvedStudent.badgesEarned || 0,
      badgesTotal: approvedStudent.badgesTotal || 0,
      certificates: approvedStudent.certificates || 0,
      boatUsed: approvedStudent.boatUsed || 'Commercial Trawler',
      role: 'student'
    });
    
    saveProgress(progress);
    
    // Reload pending students to ensure the list is accurate
    await loadPendingStudents();
    
    // Reload all students from Firestore to ensure table is up to date
    await loadAllStudents();
    await fetchStudentManagement();
    
    showAchievement(`✓ Approved ${pendingStudent?.name || 'Student'}`);
  } catch (error) {
    console.error('Error approving student:', error);
    showAchievement('✕ Failed to approve student');
  }
}

/**
 * Reject a pending signup: set status to rejected.
 */
async function rejectStudentSignup(accountId) {
  if (!window.confirm('Reject this signup? The account will be marked as rejected.')) return;
  
  if (!window.firebaseApi) {
    showAchievement('✕ API not available');
    return;
  }
  
  try {
    await window.firebaseApi.rejectStudent(accountId);
    
    // Remove from pending list
    pendingStudentsFromFirestore.value = pendingStudentsFromFirestore.value.filter(
      s => s.id !== accountId
    );
    await fetchStudentManagement();
    
    showAchievement('✕ Signup rejected');
  } catch (error) {
    console.error('Error rejecting student:', error);
    showAchievement('✕ Failed to reject student');
  }
}

/**
 * Open Add/Edit student modal.
 */
function openStudentEditor(student = null) {
  if (student) {
    studentEditorModal.value = {
      isNew: false,
      originalId: student.id,
      data: {
        studentId: student.studentId || '',
        name: student.name || '',
        email: student.email || '',
        status: student.status || 'active',
        password: '',
        setPassword: false
      }
    };
  } else {
    studentEditorModal.value = {
      isNew: true,
      originalId: null,
      data: {
        studentId: '',
        name: '',
        email: '',
        status: 'active',
        password: '',
        setPassword: true
      }
    };
  }
}

/**
 * Persist Add/Edit student changes. Instructor-created students are marked
 * active by default so they can immediately sign in.
 */
async function saveStudentEditor() {
  if (!studentEditorModal.value) return;
  const { isNew, originalId, data } = studentEditorModal.value;
  const progress = progressData.value;

  const studentId = data.studentId?.trim();
  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();

  if (!name) {
    showAchievement('⚠️ Name is required');
    return;
  }
  if (!email) {
    showAchievement('⚠️ Email is required');
    return;
  }

  if (!Array.isArray(progress.students)) progress.students = [];
  if (!Array.isArray(progress.registeredUsers)) progress.registeredUsers = [];

  if (isNew) {
    // Check for email collision
    if (progress.registeredUsers.some((u) => u.email === email) ||
        progress.students.some((s) => s.email === email)) {
      showAchievement('⚠️ Email already in use');
      return;
    }
    const password = data.password?.trim() || 'password';
    if (password.length < 4) {
      showAchievement('⚠️ Password must be at least 4 characters');
      return;
    }
    const newId = `student-${Date.now().toString(36)}`;
    
    const studentData = {
      id: newId,
      studentId,
      name,
      email,
      role: 'student',
      status: data.status || 'active',
      instructorId: currentUser.value?.id || 'instructor-helen',
      rank: deriveProgression(0, progressData.value.courseSettings).rank.name,
      xp: 0,
      xpProgress: 0,
      boatUsed: 'Commercial Trawler',
      badges: [],
      certificates: [],
      completedModules: [],
      createdAt: new Date().toISOString()
    };
    
    // Save to Firestore via REST API
    try {
      if (window.firebaseApi && typeof window.firebaseApi.createStudent === 'function') {
        const response = await window.firebaseApi.createStudent(studentData);
        // Student successfully created in Firestore
      } else {
        console.warn('⚠️ Firebase API not available - saving to localStorage only');
      }
    } catch (error) {
      console.warn('⚠️ Failed to save to Firestore (backend offline):', error.message);
      console.log('💾 Falling back to localStorage only');
    }
    
    // Update local storage
    progress.students.push({
      id: newId,
      studentId,
      name,
      email,
      status: data.status || 'active',
      instructorId: currentUser.value?.id || 'instructor-helen',
      createdAt: new Date().toISOString()
    });
    progress.registeredUsers.push({
      id: newId,
      studentId,
      name,
      email,
      password,
      role: 'student',
      status: data.status || 'active',
      instructorId: currentUser.value?.id || 'instructor-helen',
      createdAt: new Date().toISOString()
    });
    showAchievement(`➕ Added ${name}`);
  } else {
    // Update existing student
    const rec = progress.students.find((s) => s.id === originalId);
    if (rec) {
      rec.studentId = studentId;
      rec.name = name;
      rec.email = email;
      rec.status = data.status;
      
      // Save to Firestore via REST API
      try {
        if (window.firebaseApi && typeof window.firebaseApi.updateStudent === 'function') {
          const updateData = {
            studentId,
            name,
            email,
            status: data.status
          };
          const response = await window.firebaseApi.updateStudent(originalId, updateData);
          // Student successfully updated in Firestore
        } else {
          console.warn('⚠️ Firebase API not available - saving to localStorage only');
        }
      } catch (error) {
        console.warn('⚠️ Failed to update in Firestore (backend offline):', error.message);
        console.log('💾 Falling back to localStorage only');
      }
    }
    const acct = progress.registeredUsers.find((u) => u.id === originalId);
    if (acct) {
      acct.studentId = studentId;
      acct.name = name;
      acct.email = email;
      acct.status = data.status;
      if (data.setPassword && data.password?.trim().length >= 4) {
        acct.password = data.password.trim();
      }
    }
    showAchievement(`✓ Updated ${name}`);
  }

  saveProgress(progress);
  studentEditorModal.value = null;
}

/**
 * Export the Student Records table as a CSV download.
 * For instructors: Only exports students under their supervision
 */
function buildStudentManagementCsv(rows) {
  const headers = ['Student ID', 'Name', 'Email', 'Status', 'Rank', 'Total XP', 'Missions Passed', 'Total Missions', 'Quizzes Taken', 'Total Quizzes', 'Average Mission Score', 'Average Quiz Score', 'Last Training Activity'];
  const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers, ...rows.map(row => [row.studentId, row.name, row.email, row.status, row.rank, row.xp,
    row.missionsCompleted, row.missionsTotal, row.quizzesCompleted, row.quizzesTotal,
    row.missionScore, row.quizScore, row.latestActivity])].map(row => row.map(escape).join(',')).join('\r\n');
}
function exportStudentRecords() {
  const rows = filteredManagedStudents.value;
  if (!rows.length || studentManagementLoading.value || studentManagementError.value) return;
  const blob = new Blob([buildStudentManagementCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  link.download = `helmquest-student-records-${day}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showAchievement(`Exported ${rows.length} student records`);
}
/**
 * Remove a student entirely (with confirmation).
 */
async function confirmRemoveStudent(student) {
  if (!student?.id) return;
  const ok = window.confirm(`Remove ${student.name}? Their account, sessions, and results will be permanently deleted from both local storage and database.`);
  if (!ok) return;
  
  // Delete from localStorage
  const progress = progressData.value;
  progress.students = (progress.students ?? []).filter((s) => s.id !== student.id);
  progress.registeredUsers = (progress.registeredUsers ?? []).filter((u) => u.id !== student.id);
  progress.sessions = (progress.sessions ?? []).filter((s) => s.studentId !== student.id);
  if (progress.completedModules) delete progress.completedModules[student.id];
  if (progress.studentProfiles) delete progress.studentProfiles[student.id];
  progress.quizSubmissions = (progress.quizSubmissions ?? []).filter((s) => s.studentId !== student.id);
  saveProgress(progress);
  
  // Delete from Firestore if API is available
  if (window.firebaseApi) {
    try {
      await window.firebaseApi.deleteStudent(student.id);
      await fetchStudentManagement();
      
      // Remove from Firestore students list in UI
      allStudentsFromFirestore.value = allStudentsFromFirestore.value.filter(
        s => s.id !== student.id
      );
      
      showAchievement(`🗑️ Removed ${student.name} from database`);
    } catch (error) {
      console.error('Error deleting student from Firestore:', error);
      showAchievement(`⚠️ Removed ${student.name} from local storage, but failed to delete from database`);
    }
  } else {
    showAchievement(`🗑️ Removed ${student.name}`);
  }
}

/**
 * Update student status (active/inactive/pending/rejected)
 */
async function updateStudentStatus(student, newStatus) {
  if (!student?.id) return;
  
  if (!window.confirm(`Change ${student.name}'s status to ${newStatus.toUpperCase()}?`)) {
    return;
  }
  
  // Update localStorage
  const progress = progressData.value;
  const localStudent = (progress.students ?? []).find((s) => s.id === student.id);
  if (localStudent) {
    localStudent.status = newStatus;
  }
  saveProgress(progress);
  
  // Update Firestore if API is available
  if (window.firebaseApi) {
    try {
      await window.firebaseApi.updateStudent(student.id, { status: newStatus });
      
      // Update in Firestore students list
      const firestoreStudent = allStudentsFromFirestore.value.find(s => s.id === student.id);
      if (firestoreStudent) {
        firestoreStudent.status = newStatus;
      }
      
      showAchievement(`✓ ${student.name}'s status changed to ${newStatus.toUpperCase()}`);
    } catch (error) {
      console.error('Error updating student status:', error);
      showAchievement(`✕ Failed to update status in database`);
    }
  } else {
    showAchievement(`✓ ${student.name}'s status changed to ${newStatus.toUpperCase()}`);
  }
}

/**
 * Build a performance report per session for the reviewed student.
 */
const performanceReports = computed(() => {
  const modal = instructorReviewModal.value;
  if (!modal?.sessions) return [];

  return modal.sessions.map((s) => {
    const m = s.performanceMetrics || {};
    // For metrics that require an activity attempt (docking, fishing), return -1
    // to signal N/A when there were no attempts during that mission.
    const dockingScore = m.stats?.dockingAttempts ? (m.dockingSuccess ?? 0) : -1;
    const fishingScore = m.stats?.fishingAttempts ? (m.fishingSuccess ?? 0) : -1;

    const mistakes = (m.stats?.procedureViolations ?? 0) + (m.stats?.sharpTurns ?? 0);

    return {
      id: s.id,
      missionId: s.missionId,
      missionTitle: s.mission,
      completedAt: s.completedAt,
      totalScore: s.score ?? 0,
      passed: !!s.passed,
      navigationAccuracy: m.courseAccuracy ?? 100,
      steeringAccuracy: m.steeringPrecision ?? 100,
      dockingScore,
      fishingScore,
      completionTime: formatElapsed(s.elapsedMs),
      mistakes,
      remarks: buildPerformanceRemarks({
        score: s.score ?? 0,
        passed: !!s.passed,
        navigationAccuracy: m.courseAccuracy ?? 100,
        steeringAccuracy: m.steeringPrecision ?? 100,
        dockingScore,
        fishingScore,
        mistakes
      })
    };
  });
});

/**
 * Simple color-class helper for score metrics.
 */
function metricColorClass(v) {
  if (v < 0) return 'metric-color--muted';
  if (v >= 85) return 'metric-color--pass';
  if (v >= 60) return 'metric-color--warn';
  return 'metric-color--fail';
}

/**
 * Format a duration in ms as "Xm Ys" or "Xs".
 */
function formatElapsed(ms) {
  if (typeof ms !== 'number' || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

/**
 * Auto-generate a plain-language remark for the instructor based on metrics.
 */
function buildPerformanceRemarks({ score, passed, navigationAccuracy, steeringAccuracy, dockingScore, fishingScore, mistakes }) {
  if (!passed && score === 0) return 'No attempts detected — mission not started or aborted.';

  const parts = [];
  if (passed) parts.push('✅ Passed the mission.');
  else parts.push('❌ Did not meet the pass score.');

  if (steeringAccuracy >= 85) parts.push('Steering was smooth and precise.');
  else if (steeringAccuracy < 60) parts.push('Steering was erratic — recommend more practice.');

  if (navigationAccuracy >= 85) parts.push('Navigation held course well.');
  else if (navigationAccuracy < 60) parts.push('Course deviations were significant.');

  if (dockingScore >= 0) {
    if (dockingScore >= 85) parts.push('Docking was accurate.');
    else if (dockingScore < 60) parts.push('Docking needs improvement.');
  }

  if (fishingScore >= 0) {
    if (fishingScore >= 60) parts.push('Fishing performance was solid.');
    else parts.push('Fishing outcomes were low.');
  }

  if (mistakes === 0) parts.push('Zero procedural mistakes.');
  else if (mistakes > 5) parts.push(`${mistakes} mistakes recorded — review procedure adherence.`);

  return parts.join(' ');
}

/**
 * Collect the student's quiz submissions and enrich each entry with the
 * matching quiz title, module label, per-question breakdown, and pass status.
 */
function getStudentQuizSubmissions(studentId) {
  const submissions = progressData.value?.quizSubmissions ?? [];
  const quizzes = progressData.value?.quizzes ?? [];
  const assignments = progressData.value?.quizAssignments ?? [];

  return submissions
    .filter((s) => s.studentId === studentId)
    .map((sub) => {
      // Prefer the embedded quiz snapshot; fall back to the store copy
      const quiz = sub.quiz || quizzes.find((q) => q.id === sub.quizId) || null;
      const assignment = assignments.find((a) => a.quizId === sub.quizId);
      const moduleId = sub.trainingModuleId || assignment?.targetId || '';
      const module = trainingModules.value.find((m) => m.id === moduleId);

      const questions = (quiz?.questions || []).map((q) => {
        const answerEntry = (sub.answers || []).find((a) => a.questionId === q.id);
        return {
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          correctAnswer: q.correctAnswer,
          studentAnswer: answerEntry?.studentAnswer ?? '',
          isCorrect: !!answerEntry?.isCorrect,
          skipped: !!answerEntry?.skipped
        };
      });

      return {
        id: sub.id,
        quizId: sub.quizId,
        quizTitle: quiz?.title || 'Untitled Quiz',
        moduleId,
        missionTitle: module?.title || moduleId || 'Unknown mission',
        score: sub.score ?? 0,
        submittedAt: sub.submittedAt,
        totalQuestions: questions.length,
        correctCount: questions.filter((q) => q.isCorrect).length,
        questions,
        passed: (sub.score ?? 0) >= 80
      };
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

function instructorGrantBadge(badgeId) {
  const student = instructorReviewModal.value?.student;
  if (!student?.id || userRole.value !== 'instructor') return;

  const result = instructorAwardBadge(progressData.value, {
    studentId: student.id,
    badgeId,
    instructorId: currentUser.value.id,
    instructorName: currentUser.value.name
  });

  if (!result.ok) {
    window.alert('This badge was already awarded.');
    return;
  }

  saveProgress(progressData.value);
  progressData.value = loadProgress();
  refreshInstructorReviewAwards(student.id);
  refreshInstructorProgress();
  showAchievement(`${result.badge.icon} Badge awarded to ${student.name}`);
}

function instructorRevokeBadgeGrant(badgeId) {
  const student = instructorReviewModal.value?.student;
  if (!student?.id) return;
  if (!window.confirm('Revoke this badge from the student?')) return;

  instructorRevokeBadge(progressData.value, student.id, badgeId);
  saveProgress(progressData.value);
  progressData.value = loadProgress();
  refreshInstructorReviewAwards(student.id);
  refreshInstructorProgress();
}

function instructorGrantCertificate(certOption) {
  const student = instructorReviewModal.value?.student;
  if (!student?.id || userRole.value !== 'instructor') return;

  const result = instructorAwardCertificateWithScore(progressData.value, {
    studentId: student.id,
    certificateId: certOption.id,
    instructorId: currentUser.value.id,
    instructorName: currentUser.value.name,
    score: certOption.score
  });

  if (!result.ok) {
    window.alert('This certificate was already issued.');
    return;
  }

  saveProgress(progressData.value);
  progressData.value = loadProgress();
  refreshInstructorReviewAwards(student.id);
  refreshInstructorProgress();
  showAchievement(`Certificate issued to ${student.name}`);
}

function instructorRevokeCertificateGrant(certificateId) {
  const student = instructorReviewModal.value?.student;
  if (!student?.id) return;
  if (!window.confirm('Revoke this certificate from the student?')) return;

  instructorRevokeCertificate(progressData.value, student.id, certificateId);
  saveProgress(progressData.value);
  progressData.value = loadProgress();
  refreshInstructorReviewAwards(student.id);
  refreshInstructorProgress();
}

function confirmResetStudentProgress(student) {
  if (!student?.id) return;

  const name = student.name ?? 'this student';
  const confirmed = window.confirm(
    `Reset all mission progress for ${name}?\n\nThis clears every saved score and pass/fail record for this student.`
  );
  if (!confirmed) return;

  resetStudentProgress(student.id, progressData.value);
  if (currentUser.value?.id === student.id && userRole.value === 'student') {
    applyStoredStudentProgress();
  }
  refreshInstructorStudentReview(student.id);
}

function confirmResetStudentMission(student, session) {
  if (!student?.id || !session?.missionId) return;

  const missionLabel = session.mission ?? session.missionId;
  const confirmed = window.confirm(
    `Reset "${missionLabel}" for ${student.name}?\n\nThis removes their saved score for this mission only.`
  );
  if (!confirmed) return;

  resetStudentMission(student.id, session.missionId, progressData.value);
  saveProgress(progressData.value);
  if (currentUser.value?.id === student.id && userRole.value === 'student') {
    applyStoredStudentProgress();
  }
  refreshInstructorStudentReview(student.id);
}

function refreshInstructorStudentReview(studentId) {
  progressData.value = loadProgress();
  if (instructorReviewModal.value?.student?.id !== studentId) return;

  const refreshed = instructorStudents.value.find((row) => row.id === studentId);
  if (refreshed) {
    instructorReviewModal.value = {
      student: refreshed,
      sessions: getStudentSessions(studentId, progressData.value)
    };
    refreshInstructorReviewAwards(studentId);
  }
}

function dismissInstructorReview() {
  instructorReviewModal.value = null;
  instructorReviewAwards.value = { badges: [], certificates: [] };
  syncUiCursor();
}

function captureTrainingStepBaseline() {
  trainingStepBaseline.value = captureStepBaseline(stats.value, anchor.value, getBoatPositionXZ());
  trainingStepStartedAt.value = performance.now();
  trainingHeadingHold.value = { startedAt: null };
}

function restoreFiniteBoatTransform() {
  if (!boatObject) return;

  const position = boatObject.position;
  const rotation = boatObject.rotation;
  const scale = boatObject.scale;
  const transformValues = [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, scale.x, scale.y, scale.z];
  if (transformValues.every(Number.isFinite)) return;

  console.warn('[HelmQuest] Invalid boat transform detected; restoring simulation pose.');
  const spawnX = Number.isFinite(SIMULATION_SPAWN.x) ? SIMULATION_SPAWN.x : 0;
  const spawnZ = Number.isFinite(SIMULATION_SPAWN.z) ? SIMULATION_SPAWN.z : 0;
  const spawnY = Number.isFinite(baselineWaterlineY + physics.value.waterlineOffset)
    ? baselineWaterlineY + physics.value.waterlineOffset
    : 0;
  position.set(spawnX, spawnY, spawnZ);
  rotation.set(0, getDefaultSimHeading(), 0);
  scale.set(1, 1, 1);
  speedVel = 0;
  speedRot = 0;
  angularVelocity = 0;
}

function syncStatsBoatXZ() {
  if (!boatObject) return;
  restoreFiniteBoatTransform();
  stats.value.boatX = boatObject.position.x;
  stats.value.boatZ = boatObject.position.z;
}

function getBoatPositionXZ() {
  if (!boatObject) return { x: SIMULATION_SPAWN.x, z: SIMULATION_SPAWN.z };
  return { x: stats.value.boatX, z: stats.value.boatZ };
}

function clearWaypointMarkers() {
  if (waypointMarkerGroup && scene) {
    scene.remove(waypointMarkerGroup);
    disposeWaypointMarkerGroup(waypointMarkerGroup);
    waypointMarkerGroup = null;
  }
  trainingWaypoints.value = [];
}

function resolveTrainingZonesAtSpawn() {
  // Mission buoys must use the loaded port departure, including after a dock rebuild.
  const berth = getActiveHarborDockBerth();
  if (berth) applySpawnAtBerth(berth);
  else if (islandGroup) updateSimulationSpawn(islandGroup, islandGroup.userData?.isProceduralTerrain);
  if (!activeTrainingModule.value) return [];

  const module = activeTrainingModule.value;
  const buoys = Array.isArray(module.buoys) ? module.buoys : [];
  const buoyIds = new Set(buoys.map((buoy) => buoy.waypointZone).filter(Boolean));
  let missionSteps = module.steps;

  if (buoyIds.size) {
    const configuredSteps = module.steps.filter((step) => buoyIds.has(step.waypointZone));
    const buoySteps = buoys.map((buoy, index) => {
      const configuredStep = configuredSteps.find((step) => step.waypointZone === buoy.waypointZone);
      if (configuredStep) return configuredStep;

      // A buoy without a linked GPS/compass step still needs a deterministic
      // location so the teacher-configured buoy count is visible in the scene.
      return {
        instruction: buoy.name || `Buoy ${index + 1}`,
        waypointZone: buoy.waypointZone || `${module.id}-buoy-${index + 1}`,
        type: 'compass',
        heading: String((45 + (index * 360) / buoys.length) % 360)
      };
    });
    const dockSteps = module.steps.filter((step) => step.type === 'dock');
    missionSteps = [...buoySteps, ...dockSteps];
  }

  return resolveModuleWaypoints(
    module.id,
    SIMULATION_SPAWN.x,
    SIMULATION_SPAWN.z,
    islandGroup,
    missionSteps
  );
}

function refreshTrainingWaypointZones() {
  const zones = resolveTrainingZonesAtSpawn();
  trainingWaypoints.value = zones;
  return zones;
}

/**
 * Sync waypoint markers to show ALL buoys at once.
 * All buoys visible from mission start for better navigation planning.
 */
function syncTrainingWaypointMarkers() {
  clearWaypointMarkers();
  if (!activeTrainingModule.value || !scene) return;

  const zones = refreshTrainingWaypointZones();
  if (!zones.length) return;

  // Show ALL buoy waypoints at once, not just current step
  const allBuoySteps = activeTrainingModule.value.steps.filter(s => s.waypointZone && s.type !== 'dock');
  const buoyZones = allBuoySteps
    .map(step => {
      const zone = findWaypoint(zones, step.waypointZone);
      if (!zone) return null;
      
      // Inject verify_id buoyId into the zone for 3D label
      return (step.requireInteraction === 'verify_id' && step.buoyId)
        ? { ...zone, verifyId: step.buoyId }
        : zone;
    })
    .filter(Boolean);

  if (buoyZones.length === 0) return;

  // Create markers for ALL buoys at once
  waypointMarkerGroup = createWaypointMarkerGroup(
    buoyZones,
    'all-buoys',
    baselineWaterlineY + physics.value.waterlineOffset
  );
  scene.add(waypointMarkerGroup);
  updateBuoySignalLights(waypointMarkerGroup, performance.now() * 0.001, environmentPreset !== 'day');
}

function resetTrainingRunState() {
  speedVel = 0;
  speedRot = 0;
  angularVelocity = 0;
  turnRadius = 0;
  isStopping = false;
  trainingHeadingHold.value = { startedAt: null };

  // Engine OFF at mission start - student must press P to start engine
  engineRunning.value = false;
  engineStarting.value = false;

  anchor.value.deployed = false;
  anchor.value.deploying = false;
  anchor.value.retracting = false;
  anchor.value.chainLength = 0;
  resetBoatAnchorRig(boatAnchorRig);
  if (anchorMesh) anchorMesh.visible = false;

  stats.value.speedKnots = 0;
  restoreBoatSimPose();
  
  // Clear any lingering collision warnings
  collisionWarning.value = '';
  if (islandWarningTimerId) {
    window.clearTimeout(islandWarningTimerId);
    islandWarningTimerId = null;
  }
}

function exitTraining() {
  performanceManager.cancelMission();
  clearWaypointMarkers();
  dismissTrainingNotification();
  activeTrainingModule.value = null;
  interactionReadyStep.value = null;
  activeMission.value = null;
  isTrainingReviewMode.value = false;
  trainingStepBaseline.value = null;
  trainingRunMetrics.value = createTrainingRunMetrics();
  currentTrainingStep.value = 0;
  trainingStepSuccess.value = false;
  trainingRunFinished.value = false;
  trainingStepError.value = false;
  trainingFeedback.value = '';
  
  // Reset post-docking quiz state
  postDockingQuizTriggered.value = false;
  missionReadyToReport.value = false;
  showPostDockingQuiz.value = false;
  postDockingQuizData.value = null;
  
  goToScreen('dashboard');
}

function completeTrainingReview(module) {
  const run = trainingRunMetrics.value;
  trainingStepSuccess.value = true;
  showTrainingNotification(
    'Training complete!',
    `${module.title} — practice review finished. Your saved progress was not changed.`,
    { variant: 'review', durationMs: 5000 }
  );

  window.setTimeout(() => {
    if (activeTrainingModule.value !== module || trainingRunMetrics.value !== run || activeScreen.value !== 'simulation') return;
    trainingStepSuccess.value = false;
    trainingFeedback.value = '';
    dismissTrainingNotification();
    exitTraining();
  }, 3200);
}

function checkTrainingStep() {
  if (!activeTrainingModule.value || trainingStepSuccess.value || trainingRunFinished.value) return;

  refreshTrainingWaypointZones();

  const module = activeTrainingModule.value;
  const step = module.steps[currentTrainingStep.value];
  if (!step) return;

  // Track ALL waypoint visits (non-sequential) - not just current step
  // EXCLUDE port/harbor zones to prevent counting spawn location
  module.steps.forEach((s, index) => {
    if (s.waypointZone) {
      const zone = findWaypoint(trainingWaypoints.value, s.waypointZone);
      if (zone && isBoatInZone(stats.value.boatX, stats.value.boatZ, zone)) {
        // Skip port/harbor/return zones (these are spawn/end locations)
        const isPortZone = zone.id === 'harbor' || 
                          zone.label?.toLowerCase().includes('port') || 
                          zone.label?.toLowerCase().includes('harbor') ||
                          zone.label?.toLowerCase().includes('return');
        
        // Only count non-port waypoints, OR count port only if not at mission start
        const missionRunning = performance.now() - trainingRunMetrics.value.startedAt > 5000; // 5 seconds grace period
        
        if (!isPortZone || missionRunning) {
          if (!trainingRunMetrics.value.visitedWaypoints.has(s.waypointZone)) {
            trainingRunMetrics.value.visitedWaypoints.add(s.waypointZone);
            console.log(`🎯 Waypoint VISITED: ${s.waypointZone} (Step ${index + 1}) - ${trainingRunMetrics.value.visitedWaypoints.size} total`);
          }
        }
      }
    }
  });

  // Check if current step is ready for interaction
  if (step.requireInteraction && step.waypointZone) {
    const zone = findWaypoint(trainingWaypoints.value, step.waypointZone);
    if (zone && isBoatInZone(stats.value.boatX, stats.value.boatZ, zone)) {
      interactionReadyStep.value = `${currentTrainingStep.value}:${step.waypointZone}`;
    }
  }

  updateHeadingHoldState(step, stats.value, trainingHeadingHold.value);
  const context = {
    baseline: trainingStepBaseline.value,
    startedAt: trainingStepStartedAt.value,
    now: performance.now(),
    stats: stats.value,
    anchor: anchor.value,
    boatPosition: getBoatPositionXZ(),
    waypoints: trainingWaypoints.value,
    headingHold: trainingHeadingHold.value,
    activeInteraction: activeInteraction.value,
    interactionReady: interactionReadyStep.value === `${currentTrainingStep.value}:${step.waypointZone}`
  };
  
  // Check interaction requirements for waypoint steps
  if (step.requireInteraction) {
    console.log(`🔍 Checking interaction requirement: ${step.requireInteraction} for ${step.waypointZone || 'step'}`);
  }

  const passed = evaluateTrainingStep(step, context);

  if (!passed) {
    const coach = formatHeadingStepHint(step, stats.value, trainingHeadingHold.value);
    if (coach && !trainingStepSuccess.value) {
      trainingFeedback.value = coach;
      trainingStepError.value = false;
    }
    return;
  }

  trainingStepSuccess.value = true;
  trainingStepError.value = false;
  trainingFeedback.value = '✓ Step completed!';

  const run = trainingRunMetrics.value;
  const completedStepIndex = currentTrainingStep.value;
  window.setTimeout(() => {
    if (activeTrainingModule.value !== module || trainingRunMetrics.value !== run ||
        currentTrainingStep.value !== completedStepIndex || activeScreen.value !== 'simulation') return;
    trainingStepSuccess.value = false;
    trainingFeedback.value = '';

    const completedStep = module.steps[currentTrainingStep.value];
    // Auto‑trigger rain at the start of the final mission
    if (module.id === 'm1-mission4' && currentTrainingStep.value === 0) {
      stormMode.value = true;
    }
    if (completedStep?.waypointZone) {
      trainingRunMetrics.value.waypointsReached += 1;
      
      // Track waypoint reached in performance system
      if (performanceManager.isActive) {
        const waypointId = completedStep.waypointZone;
        performanceManager.onWaypointReached(waypointId, {
          x: stats.value.boatX,
          z: stats.value.boatZ
        });
        console.log('[App] Waypoint reached tracked:', waypointId);
      }
    }
    
    // Track objective completion in performance system
    if (performanceManager.isActive) {
      const objectiveId = completedStep.id || `step-${currentTrainingStep.value}`;
      const objectiveType = completedStep.requireInteraction ? 'task' : 'waypoint';
      performanceManager.onObjectiveCompleted(objectiveId, objectiveType);
      console.log('[App] Objective completed tracked:', objectiveId);
    }

    // Determine total steps (use missionSteps if available)
    const totalSteps = (module.missionSteps && module.missionSteps.length > 0) 
      ? module.missionSteps.length 
      : module.steps.length;

    if (currentTrainingStep.value < totalSteps - 1) {
      trainingRunMetrics.value.stepsCompleted += 1;
      currentTrainingStep.value++;
      interactionReadyStep.value = null;
      
      // Set active waypoint in performance system
      if (performanceManager.isActive) {
        const nextStep = module.steps[currentTrainingStep.value];
        if (nextStep?.waypointZone) {
          const waypointId = nextStep.waypointZone;
          performanceManager.setActiveWaypoint(
            findWaypoint(trainingWaypoints.value, waypointId),
            { x: stats.value.boatX, z: stats.value.boatZ }
          );
          console.log('[App] Active waypoint set:', waypointId);
        } else {
          performanceManager.setActiveWaypoint(null);
        }
      }
      
      syncTrainingWaypointMarkers();
      captureTrainingStepBaseline();
      return;
    }

    trainingRunFinished.value = true;
    trainingRunMetrics.value.endedAt = performance.now();
    trainingRunMetrics.value.stepsCompleted = totalSteps;

    if (module.id === 'm1-mission1') {
      startGearQuiz(module);
      return;
    }

    if (isTrainingReviewMode.value) {
      trainingFeedback.value = 'Practice complete! Stop the engine and open your saved mission report.';
      missionReadyToReport.value = true;
      syncUiCursor();
      return;
    }

    // ALL missions now require manual reporting (return to port step)
    // DON'T set missionReadyToReport yet - wait for quiz check first!
    trainingFeedback.value = '✅ All tasks completed! Return to port and drop anchor to finish.';
    // missionReadyToReport will be set to true AFTER quiz is taken (or if no quiz exists)
    showTrainingNotification(
      'Mission tasks complete!',
      'Return to port and drop anchor to complete the mission.',
      { variant: 'success', durationMs: 4500 }
    );
    syncUiCursor();
  }, 1500);
}

function getTerrainMesh() {
  if (!islandGroup) return null;
  if (islandGroup.userData?.terrainMaterial) {
    return { material: islandGroup.userData.terrainMaterial };
  }
  let mesh = null;
  islandGroup.traverse((obj) => {
    if (obj.name === 'DavaoHeightmapTerrain' || obj.name?.startsWith('TerrainTile_')) mesh = obj;
  });
  return mesh;
}

function syncTerrainVisuals() {
  const terrain = getTerrainMesh();
  const material = terrain?.material ?? islandGroup?.userData?.terrainMaterial;
  if (!material || !sun) return;
  updateTerrainSun(material, sun);
  updateTerrainFog(material, scene);
}

function updateTerrainTiles() {
  if (!islandGroup?.userData?.tileManager) return;
  const x = boatObject?.position.x ?? SIMULATION_SPAWN.x;
  const z = boatObject?.position.z ?? SIMULATION_SPAWN.z;
  islandGroup.userData.tileManager.update(x, z);
}

function applySunPosition(elevationDeg, azimuthDeg) {
  if (!sun || !sky) return;
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  sun.setFromSphericalCoords(1, phi, theta);
  sky.material.uniforms.sunPosition.value.copy(sun);
  ocean?.setSunDirection(sun);
  syncTerrainVisuals();
}

function applyEnvironmentPreset(preset) {
  if (!renderer || !scene || !sky) return;

  environmentPreset = preset;
  syncBoatHeadlights();
  setHarborPoleLightsVisible(harborDockGroup, preset !== 'day');
  updateBuoySignalLights(waypointMarkerGroup, performance.now() * 0.001, preset !== 'day');
  const { elevation, azimuth } = getSunAnglesForPreset(preset);
  applySunPosition(elevation, azimuth);
  applySkyPreset(sky, preset);
  configureSceneLights(preset, ambientLight, mainLight);

  // Determine if we need adjusted fog for small boats
  const boatLength = boatObject?.userData?.loaMeters || 88;
  const isSmallBoat = boatLength < 30; // Small boats need different fog settings
  
  if (preset === 'sunset') {
    ocean?.setWaterColor(0x1a3a52);
    ocean?.setSunColor(0xffa060);
    ocean?.setOpacityScale(0.92);
    ocean?.setShallowTint?.(0x0a3a58, 0x0a2840);
    renderer.toneMappingExposure = isSmallBoat ? 1.05 : 1.15; // Less exposure for small boats
    
    // CRITICAL FIX: Adjust fog for small boats to prevent white/washed out background
    const fogNear = isSmallBoat ? 8000 : 4000;  // Push fog further away for small boats
    const fogFar = isSmallBoat ? 45000 : 32000;  // Extend fog far distance for small boats
    
    console.log(`[applyEnvironmentPreset] Sunset fog for ${isSmallBoat ? 'SMALL' : 'normal'} boat: near=${fogNear}, far=${fogFar}`);
    applySceneFog(scene, { color: VISUAL_CONFIG.fogColor, near: fogNear, far: fogFar });
    postProcessing?.resetColorGrade?.();
    if (postProcessing?.bloomPass) postProcessing.bloomPass.strength = 0.1;
  } else if (preset === 'cloudy') {
    ocean?.setWaterColor(0x162c3c);
    ocean?.setSunColor(0xaab8c8);
    ocean?.setOpacityScale(1.05);
    ocean?.setShallowTint?.(0x183747, 0x102634);
    renderer.toneMappingExposure = 0.9;
    applySceneFog(scene, { color: 0x8795a3, near: 3000, far: 24000 });
    postProcessing?.setColorGrade?.({
      saturation: 0.85, contrast: 1.0, brightness: -0.015, tint: [0.94, 0.97, 1.0],
    });
    if (postProcessing?.bloomPass) postProcessing.bloomPass.strength = 0.04;
  } else if (preset === 'rain') {
    ocean?.setWaterColor(0x0a1420);
    ocean?.setSunColor(0x3a4555);
    ocean?.setOpacityScale(1.14);
    ocean?.setShallowTint?.(0x0c1820, 0x060d14);
    renderer.toneMappingExposure = VISUAL_CONFIG.rainExposure;
    applySceneFog(scene, {
      color: VISUAL_CONFIG.rainFogColor,
      near: 800,
      far: 9000,
      mode: 'exp2',
      density: 0.00024,
    });
    postProcessing?.setColorGrade?.({
      saturation: 0.7,
      contrast: 0.94,
      brightness: -0.015,
      tint: [0.84, 0.88, 0.93],
    });
    if (postProcessing?.bloomPass) postProcessing.bloomPass.strength = 0.03;
  } else {
    // 'day' preset
    ocean?.setWaterColor(0x0a3a58);
    ocean?.setSunColor(0xffe8cc);
    ocean?.setOpacityScale(1.0);
    ocean?.setShallowTint?.(0x0a3a58, 0x0a3a58);
    renderer.toneMappingExposure = VISUAL_CONFIG.toneMappingExposure;
    applySceneFog(scene, {
      color: VISUAL_CONFIG.fogColor,
      near: VISUAL_CONFIG.fogNear,
      far: VISUAL_CONFIG.fogFar,
    });
    postProcessing?.resetColorGrade?.();
    if (postProcessing?.bloomPass) postProcessing.bloomPass.strength = 0.1;
  }

  onWaterParamChange();
  if (islandGroup) islandGroup.visible = true;
  syncTerrainVisuals();

  const appliedPreset = preset;
  if (preset === 'rain' || preset === 'cloudy') {
    scene.environment = null;
    applySkyEnvironment(renderer, scene, sky);
  } else {
    // Keep an earlier HDR load from replacing a newly selected cloudy/night sky.
    const environmentTarget = { environment: scene.environment };
    void loadHdriEnvironment(
      renderer,
      environmentTarget,
      preset === 'sunset' ? VISUAL_CONFIG.hdriUrl : VISUAL_CONFIG.hdriDayUrl
    ).then((environment) => {
      if (environmentPreset !== appliedPreset) return;
      if (environment) scene.environment = environment;
      else applySkyEnvironment(renderer, scene, sky);
    }).catch(() => {
      if (environmentPreset !== appliedPreset) return;
      applySkyEnvironment(renderer, scene, sky);
    });
  }
}

function applySimulationWeather() {
  if (activeScreen.value !== 'simulation' && !isMenuBackdropScreen()) return;
  applyEnvironmentPreset(stormMode.value ? 'rain' : simulationWeatherPreset.value);
  rainWeatherSystem?.setActive(stormMode.value);
}

/**
 * Progressive weather profiles per level. As the student advances through
 * the level order, conditions escalate from calm to stormy — increasing the
 * navigation difficulty (bigger waves, stronger wind, harder handling).
 */
const LEVEL_WEATHER_PROFILES = {
  1: {
    key: 'calm',
    preset: 'day',
    storm: false,
    windSpeed: 0.1,
    amplitudeScale: 1, minimumAmplitude: 0,
    frequencyScale: 1, minimumFrequency: 0,
    notice: '☀️ Beginner — Calm seas. Perfect conditions for learning the helm.'
  },
  2: {
    key: 'cloudy',
    preset: 'cloudy',
    storm: false,
    windSpeed: 0.6,
    amplitudeScale: 1.5, minimumAmplitude: 1.6,
    frequencyScale: 1.15, minimumFrequency: 0,
    notice: '☁️ Intermediate — Cloudy daylight, stronger wind and larger waves. Watch your heading.'
  },
  3: {
    key: 'rain',
    preset: 'rain',
    storm: true,
    windSpeed: 0.85,
    amplitudeScale: 2.6, minimumAmplitude: RAIN_PHYSICS.waveAmplitude,
    frequencyScale: 1.3, minimumFrequency: RAIN_PHYSICS.waveFrequency,
    notice: '🌧️ Advanced — Night sailing in rain with high waves. Reduced visibility and heavier handling.'
  }
};

/**
 * Apply the weather profile that matches a mission's difficulty so that
 * weather conditions reflect the mission challenge level.
 * @param {object} module - The active training module.
 */
function applyLevelWeather(module) {
  if (!module) return;

  // Get difficulty from active mission if available
  const difficulty = String(activeMission.value?.difficulty || module.difficulty || 'Beginner').trim().toLowerCase();
  
  // Map difficulty to weather profile
  let profileKey = 1; // Default to calm
  if (difficulty === 'beginner') {
    profileKey = 1; // Calm seas, sunny
  } else if (difficulty === 'intermediate') {
    profileKey = 2; // Breezy, cloudy but no rain yet
  } else if (difficulty === 'advanced') {
    profileKey = 3; // Rain and rough seas
  }
  
  const profile = LEVEL_WEATHER_PROFILES[profileKey] ?? LEVEL_WEATHER_PROFILES[1];

  // Apply the same conditions to a mission and its practice review.
  wind.value.speed = profile.windSpeed;

  // Drive the storm state + rain particles + sky/ocean preset.
  stormMode.value = profile.storm;
  simulationWeatherPreset.value = profile.preset;
  calmWeatherSnapshot = null;
  applyBoatWavePhysics(selectedBoatType.value);
  applySimulationWeather();
  onWaterParamChange();

  showWeatherNotice(profile.notice);
}

function showWeatherNotice(message) {
  weatherNotice.value = message;
  if (weatherNoticeTimer) window.clearTimeout(weatherNoticeTimer);
  weatherNoticeTimer = window.setTimeout(() => {
    weatherNotice.value = '';
    weatherNoticeTimer = null;
  }, 3200);
}

function applyLandingBoatPose() {
  if (!boatObject || landingBoatPoseActive) return;
  // Float the boat nicely on the water surface for landing page visual
  boatObject.position.set(
    LANDING_BOAT_X,
    baselineWaterlineY + 2.5, // Float well above waterline for better landing page visual
    LANDING_BOAT_Z
  );
  boatObject.rotation.set(0, Math.PI / 2 + 0.52, 0);
  boatObject.scale.setScalar(1.50);
  landingBoatPoseActive = true;
}

function restoreBoatSimPose() {
  if (!boatObject) return;
  const berth = getActiveHarborDockBerth();
  if (berth) applySpawnAtBerth(berth);
  landingBoatPoseActive = false;
  const bowHeading = getDefaultSimHeading();
  const departure = getBoatDepartureSpawn(
    berth, boatObject.userData?.loaMeters ?? resolveTargetBoatLength(activeBoatModelFile.value),
    bowHeading, boatObject.userData?.beamMeters
  );
  boatObject.position.set(departure.x, baselineWaterlineY + physics.value.waterlineOffset, departure.z);
  boatObject.rotation.set(0, bowHeading, 0);
  boatObject.scale.setScalar(1);
  stats.value.rotationDeg = boatRotationToCompassHeading(bowHeading);
  stats.value.rollDeg = 0;
  stats.value.pitchDeg = 0;
  syncCompassVisualHeading(stats.value.rotationDeg, { force: true });
  syncStatsBoatXZ();
  if (orbitControls) {
    orbitControls.target.copy(boatObject.position);
    orbitControls.update();
  }
  if (activeCamera.value === 'chase') snapChaseCamera();
  else if (activeCamera.value === 'orbit') placeOrbitCameraBehindBoat();
}

function updateLandingCinematic(delta) {
  if (!camera || !boatObject) return;

  applyLandingBoatPose();

  landingCinematicTime += delta;
  const t = landingCinematicTime;

  const bob = Math.sin(t * 0.85) * 0.45;  // Increased from 0.18 to 0.45 - bigger vertical wave motion
  const sway = Math.sin(t * 0.48) * 0.025;  // Increased from 0.008 to 0.025 - more side-to-side roll
  const pitch = Math.sin(t * 0.31) * 0.015;  // Increased from 0.004 to 0.015 - more front-to-back pitch
  boatObject.position.y = baselineWaterlineY - 8.0 + bob; // Sit boat lower in water
  boatObject.rotation.z = sway;  // Roll (side to side)
  boatObject.rotation.x = pitch;  // Pitch (bow up/down)

  const boatPos = boatObject.position;

  // Slow orbital sweep — trawler silhouette against sunset water
  const orbitPhase = t * 0.038;
  const orbitRadius = 85 + Math.sin(t * 0.07) * 10;  // Adjusted to 85 for better balance
  const camHeight = 18 + Math.sin(t * 0.11) * 2.5;  // Higher camera - raised from 12 to 18
  const camX = boatPos.x + Math.cos(orbitPhase) * orbitRadius;
  const camZ = boatPos.z + Math.sin(orbitPhase) * orbitRadius * 0.62;

  camera.fov = LANDING_CAMERA_FOV + Math.sin(t * 0.13) * 1.2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  camera.position.set(camX, boatPos.y + camHeight, camZ);

  _landingLookAt.set(
    boatPos.x + Math.sin(orbitPhase) * 3,
    boatPos.y + 10,  // Lower look-at point from 14 to 10 - shows more ocean
    boatPos.z - 8
  );
  camera.lookAt(_landingLookAt);
}

function proceedFromLanding() {
  if (activeScreen.value !== 'landing') return;
  goToScreen('auth');
}

function goToStudentLogin() {
  adminLoginMode.value = false; // Reset admin mode
  instructorLoginMode.value = false; // Reset instructor mode
  authMode.value = 'signin'; // Reset to signin form
  authForm.value.email = '';
  authForm.value.password = ''; // Clear password field
  authError.value = ''; // Clear any previous errors
  goToScreen('auth');
}

function goToInstructorLogin() {
  adminLoginMode.value = false; // Reset admin mode
  instructorLoginMode.value = true; // Set instructor mode
  authMode.value = 'signin'; // Reset to signin form
  authForm.value.email = '';
  authForm.value.password = ''; // Clear password field
  authError.value = ''; // Clear any previous errors
  goToScreen('auth');
}

function onLandingKeyDown(event) {
  // Disabled: Press any key to login - users should click the buttons instead
  return;
  // if (activeScreen.value !== 'landing' || fatalError.value) return;
  // if (event.repeat) return;
  // event.preventDefault();
  // proceedFromLanding();
}

function startQuickSail() {
  isQuickSailMode.value = true;
  showCinematicLoading.value = true;
  loadingHint.value = 'Loading islands & open water...';

  const enterSimulation = () => {
    showCinematicLoading.value = false;
    goToScreen('simulation');
    syncWorldForSimulation();
  };

  Promise.resolve(archipelagoLoadPromise)
    .then(enterSimulation)
    .catch((err) => {
      console.error('Archipelago not ready for Quick Sail:', err);
      enterSimulation();
    });
}

function syncUiCursor(screen = activeScreen.value) {
  // Consider any modal/overlay that should make the cursor visible
  const overlayOpen = (
    missionCompleteModal.value ||
    instructorReviewModal.value ||
    certificateModal.value ||
    gearInfoPopup.value ||
    exitConfirmVisible.value ||
    exitFinalConfirmVisible.value ||
    controlsGuideVisible.value ||
    showMenuSettings.value ||
    !!missionEditorModal.value ||
    !!quizEditorModal.value ||
    !!quizManagerModal.value ||
    !!inventoryVisible.value
  );

  const inSim = screen === 'simulation' && !overlayOpen && !simulationNeedsLandscape.value;
  document.body.style.cursor = inSim ? 'none' : 'auto';

  if (canvasContainer.value) {
    canvasContainer.value.style.pointerEvents = inSim ? 'auto' : 'none';
  }
  if (renderer?.domElement) {
    renderer.domElement.style.cursor = inSim ? 'none' : 'default';
  }
}

function goToScreen(screen) {
  if (screen === 'dashboard' && !isAuthenticated.value) {
    screen = 'auth';
  }

  // Reset admin login mode when going back to landing
  if (screen === 'landing') {
    adminLoginMode.value = false;
  }

  activeScreen.value = screen;
  if (screen === 'simulation') {
    simulationRunning.value = !simulationNeedsLandscape.value;
    activeCamera.value = menuStartCamera.value;
    syncOrbitControlsEnabled();
    if (activeCamera.value === 'chase') snapChaseCamera();
    requestAnimationFrame(() => updateCompassStripViewportWidth());
    mouseLookReady = false;
  } else {
    simulationRunning.value = false;
    engineStarting.value = false;
    engineRunning.value = false;
    performanceManager.cancelMission();
    Object.keys(keyStates).forEach(key => { keyStates[key] = false; });
    isQuickSailMode.value = false; // Reset Quick Sail mode when leaving simulation
    cancelExitHold();
    mouseLookReady = false;
    resetCameraLookOffset();
    if (orbitControls) orbitControls.enabled = false;
  }
  syncUiCursor(screen);
}

function showAchievement(text) {
  if (isQuickSailMode.value) return; // Skip achievements in Quick Sail mode
  achievementPopup.value = text;
  window.setTimeout(() => {
    if (achievementPopup.value === text) achievementPopup.value = '';
  }, 2600);
}

const WELCOME_ACHIEVEMENT_KEY = 'helmquest-welcome-achievement';

/**
 * Toggle between sign-in and sign-up forms and reset ephemeral state.
 */
function switchAuthMode(mode) {
  authMode.value = mode;
  authError.value = '';
  signupSuccess.value = false;
  
  // Load instructors when switching to signup mode
  if (mode === 'signup') {
    loadAvailableInstructors();
  }
}

/**
 * Load available instructors for student signup dropdown
 * 
 * Fetches all active instructors from the backend API to populate
 * the instructor selection dropdown during student registration.
 * Only active instructors are shown to prevent assignment to 
 * inactive accounts.
 * 
 * Error Handling:
 * - Gracefully handles API unavailability
 * - Filters out inactive instructors
 * - Sets empty array on errors to prevent UI issues
 */
function loadAvailableInstructors() {
  
  if (!window.firebaseApi) {
    console.error('❌ window.firebaseApi not available');
    availableInstructors.value = [];
    return;
  }

  window.firebaseApi.getAllInstructors()
    .then(response => {
      
      if (!response || !response.instructors) {
        console.error('❌ Invalid response structure:', response);
        availableInstructors.value = [];
        return;
      }
      
      // Filter only active instructors for student assignment
      const activeInstructors = response.instructors.filter(instructor => 
        instructor.status === 'active'
      );
      
      availableInstructors.value = activeInstructors;
    })
    .catch(error => {
      console.error('❌ Error loading instructors:', error);
      availableInstructors.value = [];
    });
}

/**
 * Handle student self-signup. Records a pending account that awaits
 * instructor approval before it can sign in.
 */
function submitStudentSignup() {
  authError.value = '';
  signupSuccess.value = false;

  const studentId = signupForm.value.studentId?.trim();
  const name = signupForm.value.name?.trim();
  const email = signupForm.value.email?.trim().toLowerCase();
  const password = signupForm.value.password ?? '';
  const instructorId = signupForm.value.instructorId?.trim();

  if (!studentId || !name || !email || !password || !instructorId) {
    authError.value = 'All fields are required.';
    return;
  }
  
  // Validate email domain must be @dnsc.edu.ph
  if (!email.endsWith('@dnsc.edu.ph')) {
    authError.value = 'Email must be a valid DNSC email address (@dnsc.edu.ph)';
    return;
  }
  
  if (password.length < 4) {
    authError.value = 'Password must be at least 4 characters.';
    return;
  }

  // Call Firestore API to create student account
  if (window.firebaseApi) {
    window.firebaseApi.createStudent({
      studentId,
      name,
      email,
      password,
      instructorId
    }).then(response => {
      signupSuccess.value = true;
      signupForm.value = { studentId: '', name: '', email: '', password: '', instructorId: '' };
      // Student account successfully created
    }).catch(error => {
      console.error('❌ Signup error:', error);
      authError.value = error.message || 'Failed to create account. Please try again.';
    });
  } else {
    authError.value = 'Backend API not available. Please try again later.';
  }
}

/**
 * Main authentication function with multi-method support and backward compatibility
 * 
 * Handles authentication for multiple user types through a priority-based system
 * that maintains backward compatibility with existing demo accounts while enabling
 * Firestore-based authentication for dynamically created users.
 * 
 * AUTHENTICATION PRIORITY ORDER:
 * 1. Demo accounts (DEMO_USERS) - Highest priority for backward compatibility
 * 2. Instructor Firestore authentication (@helmquest.edu.ph emails + @dnsc.edu.ph when in instructor mode)
 * 3. Student Firestore authentication (@dnsc.edu.ph emails)
 * 4. Error message for unmatched patterns
 * 
 * EMAIL PATTERN DETECTION RULES:
 * - @helmquest.local → Demo account check ONLY (instructor-marcus@helmquest.local)
 * - @dnsc.edu.ph → Both instructor AND student Firestore authentication (priority: instructor when in instructor login mode)
 * - @helmquest.edu.ph → Instructor Firestore authentication (instructors created via admin)
 * - admin@helmquest.local → Demo admin account (hardcoded in DEMO_USERS)
 * - Other domains → Error message displayed
 * 
 * DEMO ACCOUNT BACKWARD COMPATIBILITY:
 * All existing demo accounts continue to work unchanged:
 * - instructor@helmquest.local / password
 * - instructor-marcus@helmquest.local / password
 * - admin@helmquest.local / password
 * - Various hardcoded student demo accounts
 * 
 * FIRESTORE AUTHENTICATION FLOW:
 * For @dnsc.edu.ph (Students AND Instructors):
 * 1. In instructor login mode: Try instructor authentication first, fallback to student
 * 2. In student login mode: Only try student authentication
 * 3. Backend queries appropriate collection ('instructor' or 'students') in Firestore
 * 4. Validates password with bcrypt comparison
 * 5. Checks user status (pending/active/rejected/inactive for students, active/inactive for instructors)
 * 6. Allows login based on status and role requirements
 * 
 * For @helmquest.edu.ph (Instructors Only):
 * 1. Call window.firebaseApi.loginInstructor(email, password)
 * 2. Backend queries 'instructor' collection in Firestore
 * 3. Validates password with bcrypt comparison
 * 4. Checks instructor status (active/inactive)
 * 5. Allows login only for 'active' status
 * 
 * ADMIN LOGIN MODE:
 * When adminLoginMode is enabled, only admin credentials are accepted.
 * This prevents non-admin users from accessing admin features.
 * 
 * ERROR HANDLING STRATEGY:
 * - Demo account check failure: Falls through to Firestore checks
 * - Firestore authentication failure: Generic "Invalid email or password"
 * - Status-based rejection: Specific messages for pending/inactive accounts
 * - Network errors: Handled gracefully with user-friendly messages
 * - Admin mode violations: Specific admin credential requirement message
 * 
 * SECURITY CONSIDERATIONS:
 * - No sensitive data logged to console in production
 * - Generic error messages prevent user enumeration
 * - Status validation prevents unauthorized access
 * - Password never transmitted in logs or error messages
 */
function mockAuthenticate() {
  authError.value = '';
  const email = authForm.value.email.trim().toLowerCase();
  const password = authForm.value.password;

  // ========================================================================
  // PRIORITY 1: Demo account authentication (HIGHEST PRIORITY)
  // ========================================================================
  // Check hardcoded DEMO_USERS first to maintain backward compatibility
  // This includes instructor@helmquest.local, admin@helmquest.local, etc.
  let user = authenticateUser(email, password);

  // Admin login mode: restrict to admin credentials only
  if (adminLoginMode.value && (!user || user.role !== 'admin')) {
    authError.value = 'Invalid admin credentials. Please use admin@helmquest.local with password: password';
    return;
  }

  // The built-in admin account signs in locally with the hardcoded credentials.
  if (user) {
    if (user.role === 'admin') {
      firebaseApi.clearSession();
      proceedWithAuthentication(user);
      return;
    }
    firebaseApi.loginDemo(email, password)
      .then(response => proceedWithAuthentication({ ...user, ...response.user }))
      .catch(error => { authError.value = error.message || 'Login service is unavailable.'; });
    return;
  }

  // ========================================================================
  // PRIORITY 2: Instructor Firestore authentication (multi-domain support)
  // ========================================================================
  // For instructors created through the admin panel and stored in Firestore
  // Support both @helmquest.edu.ph AND @dnsc.edu.ph domains for instructors
  if (!adminLoginMode.value && 
      (email.endsWith('@helmquest.edu.ph') || 
       (instructorLoginMode.value && email.endsWith('@dnsc.edu.ph'))) && 
      window.firebaseApi) {
    window.firebaseApi.loginInstructor(email, password)
      .then(response => {
        const instructorData = response.instructor;
        
        // Instructor status validation - only active instructors can login
        if (instructorData.status === 'inactive') {
          authError.value = 'Account disabled. Contact system admin.';
          return;
        }
        
        // Status is 'active' - create user object and proceed with login
        const user = {
          id: instructorData.id,
          name: instructorData.name,
          email: instructorData.email,
          role: 'instructor',
          status: instructorData.status,
          instructorid: instructorData.id // For instructors, their own ID is used for leaderboard filtering
        };
        
        proceedWithAuthentication(user);
      })
      .catch(error => {
        // FIXED: Only allow fallback to student if NOT in instructor login mode
        if (email.endsWith('@dnsc.edu.ph') && !instructorLoginMode.value) {
          console.log('Instructor login failed, trying student authentication fallback...');
          tryStudentAuthenticationFallback(email, password);
        } else {
          console.error('Instructor login error:', error);
          authError.value = error?.message?.includes('Failed to fetch')
            ? 'Login service is unavailable. Please start the backend server and try again.'
            : 'Invalid instructor credentials.';
        }
      });
    return;
  }

  // ========================================================================
  // PRIORITY 3: Student Firestore authentication (@dnsc.edu.ph)
  // ========================================================================
  // For students created through the signup form and stored in Firestore
  // This only runs if instructor authentication failed or user is in student mode
  if (!adminLoginMode.value && email.endsWith('@dnsc.edu.ph') && window.firebaseApi) {
    tryStudentAuthenticationFallback(email, password);
    return;
  }

  // ========================================================================
  // FALLBACK: No authentication method succeeded
  // ========================================================================
  // Show appropriate error message based on login mode
  if (adminLoginMode.value) {
    authError.value = 'Invalid admin credentials. Please use admin@helmquest.local with password: password';
  } else {
    authError.value = 'Invalid email or password. Use one of the demo accounts below.';
  }
}

/**
 * Student authentication fallback for @dnsc.edu.ph emails
 * Used when instructor authentication fails or for direct student login
 */
function tryStudentAuthenticationFallback(email, password) {
  window.firebaseApi.loginStudent(email, password)
    .then(response => {
      const studentData = response.student;
      
      // FIXED: Block students from logging into instructor console
      if (instructorLoginMode.value) {
        authError.value = 'Invalid instructor credentials. Student accounts cannot access the instructor console.';
        return;
      }
      
      if (studentData.status === 'pending') {
        authError.value = 'Your account is pending instructor approval. You\'ll receive access once approved.';
        return;
      }
      if (studentData.status === 'rejected' || studentData.status === 'inactive') {
        authError.value = 'Account disabled. Contact your instructor.';
        return;
      }
      const user = {
        id: studentData.id,
        name: studentData.name,
        email: studentData.email,
        studentId: studentData.studentId,
        instructorid: studentData.instructorid || studentData.instructorId,
        role: 'student',
        status: studentData.status,
        xp: studentTotalXp(studentData),
        total_xp: studentData.total_xp,
        rank: studentData.rank,
        rankId: studentData.rankId,
        badges: studentData.badges
      };
      proceedWithAuthentication(user);
    })
    .catch(error => {
      console.error('Student login error:', error);
      authError.value = error?.message?.includes('Failed to fetch')
        ? 'Login service is unavailable. Please start the backend server and try again.'
        : 'Invalid email or password.';
    });
}

/**
 * Complete the authentication process and transition to the main application
 * 
 * This function handles the final steps of authentication after credentials
 * have been validated. It sets up the user session, loads appropriate data
 * based on user role, and transitions to the main application interface.
 * 
 * Process Flow:
 * 1. Show cinematic loading animation for smooth UX transition
 * 2. Set global authentication state (isAuthenticated, userRole, currentUser)
 * 3. Load user progress data and apply saved preferences
 * 4. Load role-specific data (student progress or instructor dashboard data)
 * 5. Navigate to appropriate dashboard screen
}

/**
 * Complete the authentication process and transition to the main application
 * 
 * This function handles the final steps of authentication after credentials
 * have been validated. It sets up the user session, loads appropriate data
 * based on user role, and transitions to the main application interface.
 * 
 * Process Flow:
 * 1. Show cinematic loading animation for smooth UX transition
 * 2. Set global authentication state (isAuthenticated, userRole, currentUser)
 * 3. Load user progress data and apply saved preferences
 * 4. Load role-specific data (student progress or instructor dashboard data)
 * 5. Navigate to appropriate dashboard screen
 * 6. Show welcome achievement for new student users
 * 
 * Role-Specific Initialization:
 * - Students: Load personal progress, sync motivation system
 * - Instructors: Load pending students, all assigned students, refresh progress
 * - Admins: Navigate directly to admin dashboard
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} user.id - Unique user identifier
 * @param {string} user.name - Full name for display
 * @param {string} user.email - Email address
 * @param {string} user.role - Role: 'student', 'instructor', or 'admin'
 * @param {string} user.status - Account status: 'active', 'pending', 'inactive'
 * @param {string} [user.studentId] - Student ID (for student role only)
 */
function proceedWithAuthentication(user) {
  // Show cinematic loading for smooth transition
  showCinematicLoading.value = true;
  loadingHint.value = 'Authenticating maritime profile';
  
  window.setTimeout(async () => {
    // Set global authentication state
    showCinematicLoading.value = false;
    isAuthenticated.value = true;
    userRole.value = user.role;
    currentUser.value = { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      studentId: user.studentId,
      instructorid: user.instructorid, // IMPORTANT: Must include instructorid for leaderboard filtering
      status: user.status,
      xp: user.xp,
      total_xp: user.total_xp,
      rank: user.rank,
      rankId: user.rankId,
      badges: user.badges
    };
    
    // Load user progress and preferences
    progressData.value = loadProgress();
    applySavedLevelCreator();
    if (user.role !== 'admin') await loadMissionDatesFromFirestore();

    // Reset login mode flags
    adminLoginMode.value = false;

    // Role-specific initialization
    if (user.role === 'student') {
      await applyStoredStudentProgress();
    } else if (user.role === 'instructor') {
      refreshInstructorProgress();
      // Each instructor tab loads its own class-scoped data when it becomes visible.
      if (user.role === 'instructor') {
        // Fetch instructor's recent activities on login
        fetchInstructorRecentActivities();
      }
    }

    // Navigate to appropriate dashboard
    goToScreen(user.role === 'admin' ? 'dashboard' : 'dashboard');
    
    // Show welcome achievement for new students
    if (user.role === 'student') {
      await syncStudentMotivation();
      try {
        if (!localStorage.getItem(WELCOME_ACHIEVEMENT_KEY)) {
          localStorage.setItem(WELCOME_ACHIEVEMENT_KEY, '1');
          showAchievement('Welcome aboard, Cadet!');
        }
      } catch {
        showAchievement('Welcome aboard, Cadet!');
      }
    }
  }, 1200);
}


function toggleStormMode() {
  if (activeScreen.value !== 'simulation') return;

  stormMode.value = !stormMode.value;
  if (stormMode.value) {
    calmWeatherSnapshot = {
      waveAmplitude: physics.value.waveAmplitude,
      waveFrequency: physics.value.waveFrequency,
      windSpeed: wind.value.speed,
      preset: simulationWeatherPreset.value,
    };
    applyBoatWavePhysics(selectedBoatType.value);
    wind.value.speed = RAIN_PHYSICS.windSpeed;
    applySimulationWeather();
    showWeatherNotice('Rain falling — darker seas, heavier handling');
    showAchievement('Rain falling — reduced visibility');
  } else {
    const snap = calmWeatherSnapshot;
    simulationWeatherPreset.value = snap?.preset ?? 'day';
    if (snap) {
      physics.value.waveAmplitude = snap.waveAmplitude;
      physics.value.waveFrequency = snap.waveFrequency;
    } else {
      applyBoatWavePhysics(selectedBoatType.value);
    }
    wind.value.speed = snap?.windSpeed ?? 0.1;
    applySimulationWeather();
    onWaterParamChange();
    showWeatherNotice(simulationWeatherPreset.value === 'cloudy'
      ? 'Cloudy daylight restored — stronger wind and larger waves'
      : 'Skies clearing — calm conditions restored');
    showAchievement(simulationWeatherPreset.value === 'cloudy' ? 'Cloudy weather restored' : 'Skies clearing');
    calmWeatherSnapshot = null;
  }
}

async function requestSimulationLandscape() {
  const root = appRoot.value;
  if (!root) return;
  try {
    if (!document.fullscreenElement) await root.requestFullscreen?.();
    if (simulationTouchEnabled.value) await window.screen.orientation?.lock?.('landscape');
  } catch {
    // The rotate prompt remains available when native orientation locking is unsupported.
  }
}

function toggleFullscreen() {
  const root = appRoot.value;
  if (!root) return;
  if (!document.fullscreenElement) {
    void requestSimulationLandscape();
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function startExitHold() {
  if (exitHoldTimerId) return;
  exitHoldActive.value = true;
  exitHoldTimerId = window.setTimeout(() => {
    exitHoldActive.value = false;
    exitHoldTimerId = null;
    goToScreen('dashboard');
  }, 900);
}

function cancelExitHold() {
  exitHoldActive.value = false;
  if (exitHoldTimerId) {
    window.clearTimeout(exitHoldTimerId);
    exitHoldTimerId = null;
  }
}

function syncOrbitControlsEnabled() {
  if (!orbitControls) return;
  orbitControls.enabled = activeCamera.value === 'orbit';
}

function syncHelmRailingsVisibility() {
  const helmView = activeScreen.value === 'simulation' && activeCamera.value === 'helm';
  const showBoatHull = selectedBoatType.value === 'small' || selectedBoatType.value === 'large';
  syncHelmDeckRailsVisibility(boatObject, helmView);
  syncHelmBoatMeshVisibility(boatObject, helmCockpit?.group ?? null, helmView, showBoatHull);
  syncBigBoatBridgeWindows(helmCockpit?.bridgeWindows, helmView && selectedBoatType.value === 'large');
  syncBigBoatBridgeLightVisibility(boatObject, helmView && selectedBoatType.value === 'large');
  if (helmRadarDisplay) helmRadarDisplay.screen.visible = helmView;
}

function ensureHelmRadarDisplay() {
  const canvas = tacticalChartCanvas.value;
  if (!boatObject || !canvas) return;
  if (helmRadarBoat === boatObject && helmRadarSourceCanvas === canvas) return;
  disposeHelmRadarDisplay();
  helmRadarBoat = boatObject;
  helmRadarSourceCanvas = canvas;
  helmRadarDisplay = createHelmRadarScreen(boatObject, canvas);
  helmRadarReady.value = !!helmRadarDisplay;
  if (helmRadarDisplay) {
    helmRadarDisplay.screen.visible = activeCamera.value === 'helm';
  }
}

function disposeHelmRadarDisplay() {
  disposeHelmRadarScreen(helmRadarDisplay);
  helmRadarDisplay = null;
  helmRadarBoat = null;
  helmRadarSourceCanvas = null;
  helmRadarReady.value = false;
}

function ensureHelmHud() {
  if (activeCamera.value !== 'helm') return;
  if (!helmHud && helmRadarCanvas.value && helmChartCanvas.value) {
    helmHud = initHelmInstrumentsHud({
      radar: helmRadarCanvas.value,
      nav: helmChartCanvas.value
    });
  }
}

function disposeHelmHud() {
  disposeHelmInstrumentsHud(helmHud);
  helmHud = null;
}

function attachHelmCockpitToBoat() {
  if (!boatObject) return;
  disposeHelmRadarDisplay();
  if (helmCockpit) {
    boatObject.remove(helmCockpit.group);
    disposeHelmCockpit(helmCockpit);
    helmCockpit = null;
  }
  helmCockpit = createHelmCockpit(boatObject);
  boatObject.add(helmCockpit.group);
  ensureHelmRadarDisplay();
  syncHelmRailingsVisibility();
}

let boatHeadlights = [];
let headlightsManuallyToggled = false; // Track if user manually toggled
let headlightsManualState = true; // Default ON

function setBoatHeadlightsVisibility(visible) {
  boatHeadlights.forEach(light => {
    if (!light) return;
    light.visible = visible;
    if (light.name === 'BoatHeadlightGlow') {
      // Keep the model's actual lamp visible without an opaque yellow ball in daylight.
      light.material.opacity = environmentPreset === 'day' ? 0 : 0.8;
      light.visible = visible && light.material.opacity > 0;
    }
  });
}

function syncBoatHeadlights() {
  const automaticState = environmentPreset !== 'day' || boatHeadlights.some(light => light.name === 'BigBoatLights');
  setBoatHeadlightsVisibility(headlightsManuallyToggled ? headlightsManualState : automaticState);
}

function createBoatHeadlightGlow() {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, depthWrite: false })
  );
  glow.name = 'BoatHeadlightGlow';
  return glow;
}

function toggleBoatHeadlights() {
  if (boatHeadlights.length === 0) {
    console.warn('⚠️ No boat headlights found');
    return;
  }
  
  // Toggle the manual state
  const automaticState = environmentPreset !== 'day' || boatHeadlights.some(light => light.name === 'BigBoatLights');
  const currentState = headlightsManuallyToggled ? headlightsManualState : automaticState;
  headlightsManualState = !currentState;
  headlightsManuallyToggled = true;
  
  // Apply to all lights
  syncBoatHeadlights();
  
  // Show notification
  console.log(`🔦 Headlights ${headlightsManualState ? 'ON' : 'OFF'}`);
  console.log(`Total lights toggled: ${boatHeadlights.length}`);
}

function addBoatHeadlights(boat, loaMeters) {
  if (!boat) return;

  const boatLength = loaMeters || 16;
  const bowOffset = boatLength * 0.45;
  const sternOffset = -boatLength * 0.4;
  const sideOffset = boatLength * 0.15;
  const lightHeight = 5.1; // Align the small boat's yellow headlight with its mounted lamp.
  
  // Detect boat size
  const isSmallBoat = boatLength < 30; // Small boat (18m)
  const isLargeBoat = boatLength > 100; // Large boat (180m)

  // Clear existing headlights from boat and dispose WebGL assets safely
  boatHeadlights.forEach(light => {
    if (light.name === 'BigBoatLights') {
      disposeBigBoatLights(light);
      return;
    }
    light.removeFromParent();
    if (light.geometry) light.geometry.dispose();
    if (light.material) {
      if (Array.isArray(light.material)) {
        light.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      } else {
        if (light.material.map) light.material.map.dispose();
        light.material.dispose();
      }
    }
  });
  boatHeadlights = [];

  if (isLargeBoat) {
    boatHeadlights.push(addBigBoatLights(boat));
    syncBoatHeadlights();
    return;
  }

  // Detect if the active model is the procedural boat or the GLB model
  const isProcedural = boat.children.some(c => c.name === 'CommercialFishingTrawler');
  
  let leftX, leftY, leftZ;
  let rightX, rightY, rightZ;
  let centerSpotX, centerSpotY;

  if (isProcedural) {
    leftX = 14.5;
    leftY = 17.5;
    leftZ = 4.0;
    
    rightX = 14.5;
    rightY = 17.5;
    rightZ = -4.0;

    centerSpotX = 15.0;
    centerSpotY = 18.5;
  } else if (!isSmallBoat && !isLargeBoat) {
    // The medium trawler's two searchlight lenses sit on the cabin roof.
    // Coordinates use the normalized 60m model with the bow facing +X.
    leftX = 7.15;
    leftY = 19.65;
    leftZ = 3.85;

    rightX = 7.15;
    rightY = 19.65;
    rightZ = -4.02;
  } else {
    // Position lights at the BOW (front) of the GLB boat for forward illumination
    // For 180m boat, bowOffset is ~81m, so we position lights there
    const frontPosition = bowOffset * 0.95; // 95% toward the bow
    
    leftX = frontPosition;
    leftY = 25.09;
    leftZ = 9.10; // Port side

    rightX = frontPosition;
    rightY = 25.09;
    rightZ = -9.36; // Starboard side

    centerSpotX = frontPosition;
    centerSpotY = 26.5;
  }

  // SMALL BOAT: Only one center spotlight, angled downward
  if (isSmallBoat) {
    // Add visible light sphere
    const centerLightSphere = createBoatHeadlightGlow();
    centerLightSphere.position.set(bowOffset * 0.8, lightHeight, 0);
    boat.add(centerLightSphere);
    boatHeadlights.push(centerLightSphere);

    // Single center spotlight pointing forward
    const centerSpotlight = new THREE.SpotLight(0xffffff, 2000.0);
    centerSpotlight.position.set(bowOffset * 0.8, lightHeight, 0);
    const centerTarget = new THREE.Object3D();
    centerTarget.position.set(bowOffset + 100, lightHeight - 1, 0); // Forward, slightly down to water level
    centerSpotlight.target = centerTarget;
    centerSpotlight.angle = Math.PI / 4; // Wider beam for small boat
    centerSpotlight.penumbra = 0.5;
    centerSpotlight.decay = 0.3;
    centerSpotlight.distance = 800; // Increased distance
    centerSpotlight.castShadow = true;
    boat.add(centerSpotlight);
    boat.add(centerTarget);
    boatHeadlights.push(centerSpotlight, centerTarget);
  } else {
    // Medium boats have two side headlights; large boats also have a center light.
    
    // Add visible light spheres to show where headlights are
    const leftLightSphere = createBoatHeadlightGlow();
    leftLightSphere.position.set(leftX, leftY, leftZ);
    boat.add(leftLightSphere);
    boatHeadlights.push(leftLightSphere);

    const rightLightSphere = createBoatHeadlightGlow();
    rightLightSphere.position.set(rightX, rightY, rightZ);
    boat.add(rightLightSphere);
    boatHeadlights.push(rightLightSphere);

    if (isLargeBoat) {
      const centerLightSphere = createBoatHeadlightGlow();
      centerLightSphere.position.set(centerSpotX, centerSpotY, 0);
      boat.add(centerLightSphere);
      boatHeadlights.push(centerLightSphere);
    }

    // Use spotlights for front lights - positioned on roof and angled down to cover a large area
    // Large boats get EXTREMELY bright lights pointing VERY far forward (like commercial vessels)
    const lightIntensity = isLargeBoat ? 15000.0 : 3500.0; // Triple intensity for large boats - very powerful searchlights
    const lightDistance = isLargeBoat ? 8000 : 3200; // Very long range for large boats
    
    const leftSpotlight = new THREE.SpotLight(0xffffee, lightIntensity);
    leftSpotlight.position.set(leftX, leftY, leftZ);
    const leftTarget = new THREE.Object3D();
    // For large boats, targets must be positioned far forward from the bow, not from the light fixture
    // Use boatLength to scale: large boats need targets much further ahead
    const targetForwardDistance = isProcedural ? (bowOffset + 250) : (isLargeBoat ? (boatLength * 3) : (boatLength * 2)); // 3x boat length for large boats
    leftTarget.position.set(targetForwardDistance, -5, sideOffset * 0.5); // Further forward and down to water
    leftSpotlight.target = leftTarget;
    leftSpotlight.angle = Math.PI / 3; // Narrower beam
    leftSpotlight.penumbra = 0.3;
    leftSpotlight.decay = 0.15; // Lower decay = light travels further
    leftSpotlight.distance = lightDistance;
    leftSpotlight.castShadow = true;
    boat.add(leftSpotlight);
    boat.add(leftTarget);
    boatHeadlights.push(leftSpotlight, leftTarget);

    const rightSpotlight = new THREE.SpotLight(0xffffee, lightIntensity);
    rightSpotlight.position.set(rightX, rightY, rightZ);
    const rightTarget = new THREE.Object3D();
    rightTarget.position.set(targetForwardDistance, -5, -sideOffset * 0.5); // Further forward and down to water
    rightSpotlight.target = rightTarget;
    rightSpotlight.angle = Math.PI / 3; // Narrower beam
    rightSpotlight.penumbra = 0.3;
    rightSpotlight.decay = 0.15;
    rightSpotlight.distance = lightDistance;
    rightSpotlight.castShadow = true;
    boat.add(rightSpotlight);
    boat.add(rightTarget);
    boatHeadlights.push(rightSpotlight, rightTarget);

    if (isLargeBoat) {
      const centerSpotlight = new THREE.SpotLight(0xffffff, 14000.0);
      centerSpotlight.position.set(centerSpotX, centerSpotY, 0); // On mast above the cabin
      const centerTarget = new THREE.Object3D();
      const centerTargetForward = isProcedural ? (bowOffset + 300) : (boatLength * 3.5);
      centerTarget.position.set(centerTargetForward, -6, 0);
      centerSpotlight.target = centerTarget;
      centerSpotlight.angle = Math.PI / 3.5;
      centerSpotlight.penumbra = 0.4;
      centerSpotlight.decay = 0.15;
      centerSpotlight.distance = 8500;
      centerSpotlight.castShadow = true;
      boat.add(centerSpotlight);
      boat.add(centerTarget);
      boatHeadlights.push(centerSpotlight, centerTarget);
    }
  }

  // Navigation lights (all boats) - reduced intensity for realistic appearance
  const leftLight = new THREE.PointLight(0xff0000, 50.0, 500); // Reduced from 200.0 to 50.0
  leftLight.position.set(bowOffset - 6, 6, sideOffset * 0.45);
  boat.add(leftLight);
  boatHeadlights.push(leftLight);

  const rightLight = new THREE.PointLight(0x00ff00, 50.0, 500); // Reduced from 200.0 to 50.0
  rightLight.position.set(bowOffset - 6, 6, -sideOffset * 0.45);
  boat.add(rightLight);
  boatHeadlights.push(rightLight);

  const rearLight = new THREE.PointLight(0xffffff, 40.0, 400); // Reduced from 150.0 to 40.0
  rearLight.position.set(sternOffset, 5, 0);
  boat.add(rearLight);
  boatHeadlights.push(rearLight);

  // --- Visual Headlight Beam on the Water & Volumetric Effect in Air (Larger Area) ---
  // Only for medium and large boats with multiple headlights
  if (!isSmallBoat) {
    // 1. Water light pool (wider and longer projection plane on water surface)
    const poolCanvas = document.createElement('canvas');
    // Use elliptical radial gradient for oval illumination
    poolCanvas.width = 256;
    poolCanvas.height = 256;
    const poolCtx = poolCanvas.getContext('2d');
    // radial gradient centered, radii adjusted for oval shape
    const poolGrad = poolCtx.createRadialGradient(128, 128, 30, 128, 128, 128);
    poolGrad.addColorStop(0, 'rgba(255, 255, 220, 0.45)'); // center bright
    poolGrad.addColorStop(0.4, 'rgba(255, 255, 220, 0.32)');
    poolGrad.addColorStop(0.8, 'rgba(255, 255, 220, 0.12)');
    poolGrad.addColorStop(1, 'rgba(255, 255, 220, 0)');
    poolCtx.fillStyle = poolGrad;
    poolCtx.fillRect(0, 0, 256, 256);
    const poolTexture = new THREE.CanvasTexture(poolCanvas);

    const poolLength = 220; // Increased length
    const poolWidth = 110;  // Increased width
    // Create an elliptical shape geometry for the light pool
    const ellipseShape = new THREE.Shape();
    ellipseShape.ellipse(0, 0, poolLength / 2, poolWidth / 2, 0, Math.PI * 2, false, 0);
    const poolGeo = new THREE.ShapeGeometry(ellipseShape); // Oval shape
    const poolMat = new THREE.MeshBasicMaterial({
      map: poolTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const poolMesh = new THREE.Mesh(poolGeo, poolMat);
    poolMesh.frustumCulled = false; // Prevent occasional culling/flicker
    poolMesh.renderOrder = 999; // Ensure always drawn
    poolMesh.visible = true;
    poolMesh.name = 'headlightPool'; // Identify for toggle
    // Position flat on the water surface starting from cabin extending forward
    poolMesh.position.set(leftX + poolLength / 2, 0.05, 0);
    poolMesh.rotation.x = -Math.PI / 2;
    boat.add(poolMesh);
    boatHeadlights.push(poolMesh);

    // 2. Volumetric cone light beams in the air (wider and longer)
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 256;
    beamCanvas.height = 256;
    const beamCtx = beamCanvas.getContext('2d');
    const beamGrad = beamCtx.createLinearGradient(0, 256, 0, 0);
    beamGrad.addColorStop(0, 'rgba(255, 255, 240, 0)');
    beamGrad.addColorStop(0.5, 'rgba(255, 255, 240, 0.04)');
    beamGrad.addColorStop(0.8, 'rgba(255, 255, 240, 0.14)');
    beamGrad.addColorStop(1, 'rgba(255, 255, 240, 0.25)'); // Brighter at source
    beamCtx.fillStyle = beamGrad;
    beamCtx.fillRect(0, 0, 256, 256);
    const beamTexture = new THREE.CanvasTexture(beamCanvas);

    const beamLength = 220; // Increased length
    const beamRadius = 25;  // Increased radius
    const beamGeo = new THREE.ConeGeometry(beamRadius, beamLength, 16, 1, true);
    beamGeo.translate(0, -beamLength / 2, 0);

    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
  });

  // Calculate the down slope angle dynamically so the beam targets the water surface at 180m
  const beamSlopeAngle = Math.atan2(leftY, 180);

  // Left volumetric beam
  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(leftX, leftY, leftZ);
  leftBeam.rotation.set(0, 0, Math.PI / 2 - beamSlopeAngle); // Angle dynamically
  boat.add(leftBeam);
  boatHeadlights.push(leftBeam);

  // Right volumetric beam
  const rightBeam = new THREE.Mesh(beamGeo, beamMat);
  rightBeam.position.set(rightX, rightY, rightZ);
  rightBeam.rotation.set(0, 0, Math.PI / 2 - beamSlopeAngle); // Angle dynamically
  boat.add(rightBeam);
  boatHeadlights.push(rightBeam);
  } // End of medium/large boat light pool and beams

  syncBoatHeadlights();

  console.log('Boat lights added:', {
    boatSize: isSmallBoat ? 'small' : (isLargeBoat ? 'large' : 'medium'),
    totalLights: boatHeadlights.length
  });
}

function updateBoatHeadlights() {
  if (!boatHeadlights.boat || !boatHeadlights.lights) return;

  const boat = boatHeadlights.boat;
  const boatLength = boat.userData.loaMeters || 16;
  const bowOffset = boatLength * 0.45;
  const sternOffset = -boatLength * 0.4;
  const sideOffset = boatLength * 0.15;
  const { centerLight, frontLight, leftLight, rightLight, rearLight } = boatHeadlights.lights;

  const isProcedural = boat.children.some(c => c.name === 'CommercialFishingTrawler');
  const leftX = isProcedural ? 14.5 : -2.71;
  const leftY = isProcedural ? 17.5 : 25.09;
  const leftZ = isProcedural ? 4.0 : 9.10;
  const rightZ = isProcedural ? -4.0 : -9.36;

  // Update center light
  centerLight.position.copy(boat.position);
  centerLight.position.y += isProcedural ? 18.5 : 26.5;

  // Update front light
  frontLight.position.copy(boat.position);
  frontLight.position.x += leftX;
  frontLight.position.y += leftY;

  // Update left light
  leftLight.position.copy(boat.position);
  leftLight.position.z += leftZ;
  leftLight.position.y += leftY;
  leftLight.position.x += leftX;

  // Update right light
  rightLight.position.copy(boat.position);
  rightLight.position.z += rightZ;
  rightLight.position.y += leftY;
  rightLight.position.x += leftX;

  // Update rear light
  rearLight.position.copy(boat.position);
  rearLight.position.x += sternOffset - 5;
  rearLight.position.y += 4;
}

watch(activeCamera, (cam) => {
  syncHelmRailingsVisibility();
  if (cam === 'helm') {
    nextTick(() => ensureHelmHud());
  } else {
    disposeHelmHud();
  }
  if (activeScreen.value === 'simulation') {
    resetTacticalChartCtx();
    nextTick(() => requestAnimationFrame(() => updateTacticalMinimap()));
  }
});

watch(gearInfoPopup, () => {
  syncUiCursor();
});

function resetCameraLookOffset() {
  cameraLookYaw = 0;
  cameraLookPitch = 0;
}

function applyCameraLookOffset(camPos, lookTarget) {
  _cameraLookScratch.copy(lookTarget).sub(camPos);
  const distance = _cameraLookScratch.length();
  if (distance < 0.001) return lookTarget;

  _cameraLookScratch.normalize();
  _cameraLookScratch.applyAxisAngle(_worldUp, cameraLookYaw);

  _cameraRightScratch.crossVectors(_cameraLookScratch, _worldUp);
  if (_cameraRightScratch.lengthSq() > 0.0001) {
    _cameraRightScratch.normalize();
    _cameraLookScratch.applyAxisAngle(_cameraRightScratch, cameraLookPitch);
  }

  return camPos.clone().add(_cameraLookScratch.multiplyScalar(distance));
}

function snapChaseCamera() {
  if (!boatObject || !camera) return;
  const behind = _chaseOffsetBehind.clone().applyQuaternion(boatObject.quaternion);
  const ahead = _chaseOffsetLook.clone().applyQuaternion(boatObject.quaternion);
  camera.position.copy(boatObject.position).add(behind);
  camera.lookAt(boatObject.position.clone().add(ahead));
}

function placeOrbitCameraBehindBoat() {
  if (!boatObject || !camera || !orbitControls) return;
  const behind = _chaseOffsetBehind.clone().applyQuaternion(boatObject.quaternion);
  camera.position.copy(boatObject.position).add(behind.multiplyScalar(1.35));
  orbitControls.target.copy(boatObject.position);
  orbitControls.update();
}

// Camera Toggle: chase -> orbit -> helm
function toggleCamera() {
  resetCameraLookOffset();
  if (activeCamera.value === 'chase') {
    activeCamera.value = 'orbit';
    placeOrbitCameraBehindBoat();
  } else if (activeCamera.value === 'orbit') {
    activeCamera.value = 'helm';
  } else {
    activeCamera.value = 'chase';
    snapChaseCamera();
  }
  syncOrbitControlsEnabled();
  syncHelmRailingsVisibility();
}

// Create anchor mesh
function createAnchorMesh() {
  const anchorGroup = new THREE.Group();

  // Anchor shank (vertical bar)
  const shankGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
  const shankMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
  const shank = new THREE.Mesh(shankGeometry, shankMaterial);
  shank.rotation.z = Math.PI / 2;
  anchorGroup.add(shank);

  // Anchor ring (top)
  const ringGeometry = new THREE.TorusGeometry(0.5, 0.15, 8, 16);
  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.x = 1;
  ring.rotation.y = Math.PI / 2;
  anchorGroup.add(ring);

  // Anchor arms (bottom curved parts)
  const armCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.5, -1, 0.8),
    new THREE.Vector3(-1, -1.5, 1.2)
  );
  const armGeometry = new THREE.TubeGeometry(armCurve, 20, 0.15, 8, false);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  anchorGroup.add(leftArm);

  const rightArmCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.5, -1, -0.8),
    new THREE.Vector3(-1, -1.5, -1.2)
  );
  const rightArmGeometry = new THREE.TubeGeometry(rightArmCurve, 20, 0.15, 8, false);
  const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
  anchorGroup.add(rightArm);

  // Anchor flukes (pointed ends)
  const flukeGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
  const flukeMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
  
  const leftFluke = new THREE.Mesh(flukeGeometry, flukeMaterial);
  leftFluke.position.set(-1.2, -1.8, 1.2);
  leftFluke.rotation.z = Math.PI / 4;
  leftFluke.rotation.y = -Math.PI / 6;
  anchorGroup.add(leftFluke);

  const rightFluke = new THREE.Mesh(flukeGeometry, flukeMaterial);
  rightFluke.position.set(-1.2, -1.8, -1.2);
  rightFluke.rotation.z = Math.PI / 4;
  rightFluke.rotation.y = Math.PI / 6;
  anchorGroup.add(rightFluke);

  anchorGroup.scale.set(2, 2, 2);
  anchorGroup.visible = false;
  return anchorGroup;
}

function toggleAnchor() {
  if (anchor.value.deploying || anchor.value.retracting) return;

  const rigActive = isAnchorFullyDeployed(boatAnchorRig) || anchor.value.deployed;

  if (rigActive) {
    anchor.value.retracting = true;
    anchor.value.chainLength = 0;
    if (boatAnchorRig) {
      beginAnchorRetract(boatAnchorRig);
    } else if (anchorMesh) {
      anchorMesh.visible = false;
      anchor.value.deployed = false;
      anchor.value.retracting = false;
    }
  } else if (boatObject) {
    anchor.value.position.copy(boatObject.position);
    anchor.value.deploying = true;
    speedVel = 0;
    speedRot = 0;
    angularVelocity = 0;

    if (boatAnchorRig) {
      beginAnchorDeploy(boatAnchorRig);
    } else {
      anchor.value.deployed = true;
      anchor.value.deploying = false;
      anchor.value.chainLength = anchor.value.maxChainLength;
      if (!anchorMesh) {
        anchorMesh = createAnchorMesh();
        scene.add(anchorMesh);
      }
      anchorMesh.position.copy(anchor.value.position);
      anchorMesh.position.y = baselineWaterlineY - 2;
      anchorMesh.visible = true;
    }
  }

  if (activeTrainingModule.value) {
    requestAnimationFrame(() => checkTrainingStep());
  }
}

// Reset Simulation
function resetSimulation() {
  speedVel = 0;
  speedRot = 0;
  angularVelocity = 0;
  turnRadius = 0;
  isStopping = false;
  isSinking = false;
  sinkingTimer = 0;

  if (boatObject) {
    // Log current spawn coordinates for debugging (removed to reduce console spam)
    // Validate spawn coordinates
    const spawnX = Number.isFinite(SIMULATION_SPAWN.x) ? SIMULATION_SPAWN.x : 0;
    const spawnZ = Number.isFinite(SIMULATION_SPAWN.z) ? SIMULATION_SPAWN.z : 0;
    const spawnY = Number.isFinite(baselineWaterlineY + physics.value.waterlineOffset) ? 
                   baselineWaterlineY + physics.value.waterlineOffset : 0;
    
    boatObject.position.set(spawnX, spawnY, spawnZ);
    
    // Validate rotation before setting - ensure it's a valid number
    const bowHeading = Math.PI / 2; // North heading
    if (Number.isFinite(bowHeading)) {
      boatObject.rotation.set(0, bowHeading, 0);
    } else {
      boatObject.rotation.set(0, 0, 0);
    }
    
    if (orbitControls) {
      orbitControls.target.copy(boatObject.position);
      orbitControls.update();
    }
    if (activeCamera.value === 'chase') snapChaseCamera();
    else if (activeCamera.value === 'orbit') placeOrbitCameraBehindBoat();
  }

  if (stats.value.state === 'SINKING!' && !musicPlaying.value && audioPlayer.value) {
    audioPlayer.value.pause();
  }
  stats.value.state = 'NORMAL';
  stats.value.rollDeg = 0;
  stats.value.pitchDeg = 0;
  stats.value.rotationDeg = 0;
  syncCompassVisualHeading(0, { force: true });
  resetCameraLookOffset();
  landingBoatPoseActive = false;
  restoreBoatSimPose();
  anchor.value.deployed = false;
  anchor.value.deploying = false;
  anchor.value.retracting = false;
  anchor.value.chainLength = 0;
  resetBoatAnchorRig(boatAnchorRig);
  if (anchorMesh) anchorMesh.visible = false;
}

// --- Procedural Teak Wood Plank Texture ---
function createTeakPlankTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Rich warm brown teak base
  ctx.fillStyle = "#9f6032"; 
  ctx.fillRect(0, 0, 512, 512);

  // Subtle natural wood grains
  for (let i = 0; i < 500; i++) {
    ctx.strokeStyle = `rgba(80, 40, 15, ${Math.random() * 0.16})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, 0);
    ctx.lineTo(Math.random() * 512, 512);
    ctx.stroke();
  }

  // Soft wood rings
  ctx.fillStyle = "rgba(70, 30, 10, 0.02)";
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 40 + Math.random() * 120, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw dark caulked deck seams/plank lines
  ctx.strokeStyle = "#25160d";
  ctx.lineWidth = 4;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  return texture;
}

// --- Procedural Canvas Fabric Texture (for Canopy Cover) ---
function createCanvasFabricTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // Soft Charcoal Canvas base color
  ctx.fillStyle = "#27272a";
  ctx.fillRect(0, 0, 128, 128);

  // Cross-hatched threads
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 1;
  for (let i = 0; i < 128; i += 2) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

// --- HIGH-FIDELITY REALISTIC CABIN CRUISER BUILDER ---
function createRealisticCabinCruiser() {
  const boatGroup = new THREE.Group();
  boatGroup.name = "RealisticCabinCruiser";

  // Materials Config
  const matHullWhite = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
  });

  const matHullBottom = new THREE.MeshStandardMaterial({
    color: 0x18181b, 
    roughness: 0.5,
    metalness: 0.1
  });

  const matStripe = new THREE.MeshPhysicalMaterial({
    color: 0x1d4ed8, 
    roughness: 0.15,
    clearcoat: 0.8
  });

  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.05,
    metalness: 0.98
  });

  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    transparent: true,
    opacity: 0.86,
    roughness: 0.02,
    metalness: 0.2,
    transmission: 0.8,
    thickness: 0.8
  });

  const matDeck = new THREE.MeshStandardMaterial({
    map: createTeakPlankTexture(),
    roughness: 0.7
  });

  const matSeat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, 
    roughness: 0.6
  });

  const matSeatTrim = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, 
    roughness: 0.5
  });

  const matCanopyCover = new THREE.MeshStandardMaterial({
    map: createCanvasFabricTexture(),
    roughness: 0.9
  });

  const matLifebuoyRed = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
  const matLifebuoyWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

  const matNavRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const matNavGreen = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const matSearchlight = new THREE.MeshBasicMaterial({ color: 0xffffee });

  // 1. Sleek Curved V-Hull (Main Section)
  const hullGeo = new THREE.BoxGeometry(8, 2.2, 4.2, 40, 10, 10);
  const pos = hullGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i); 
    let y = pos.getY(i); 
    let z = pos.getZ(i); 

    // Add NaN validation
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    if (x > 0.0) {
      let t = x / 4.0;
      let widthSqueeze = 1.0 - Math.pow(Math.abs(t), 2.2) * 0.95;
      if (!isNaN(widthSqueeze)) {
        pos.setZ(i, z * widthSqueeze);
        pos.setY(i, y + Math.pow(Math.abs(t), 2.2) * 0.75);
      }
    }

    let normX = (x + 4.0) / 8.0; 
    let deadrise = 0.55 * (0.2 + 0.8 * normX); 
    if (y < 0) {
      let keelDepth = (1.0 - Math.abs(pos.getZ(i)) / 2.1) * deadrise;
      if (!isNaN(keelDepth)) {
        pos.setY(i, y - keelDepth * 1.3);
      }
    }

    if (y > 0) {
      let newZ = pos.getZ(i) * (1.0 + y * 0.06);
      if (!isNaN(newZ)) {
        pos.setZ(i, newZ);
      }
    }
  }
  pos.needsUpdate = true; // Signal Three.js to re-upload vertices to GPU
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, matHullWhite);
  hull.position.set(-1.0, 0.4, 0);
  hull.castShadow = true;
  hull.receiveShadow = true;
  boatGroup.add(hull);

  // 2. Tapered Curved V-Bow Section
  const bowGeo = new THREE.BoxGeometry(5.0, 2.2, 4.2, 30, 10, 10);
  const bowPos = bowGeo.attributes.position;
  for (let i = 0; i < bowPos.count; i++) {
    let x = bowPos.getX(i); 
    let y = bowPos.getY(i); 
    let z = bowPos.getZ(i); 

    // Add NaN validation
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    let t = (x + 2.5) / 5.0; 
    let widthSqueeze = 1.0 - Math.pow(Math.abs(t), 2.0) * 0.96;
    if (!isNaN(widthSqueeze) && !isNaN(t)) {
      bowPos.setZ(i, z * widthSqueeze);
      bowPos.setY(i, y + (t * 0.9));
    }

    let deadrise = 0.55 * (0.6 + 0.4 * t);
    if (y < 0 && !isNaN(deadrise)) {
      let keelDepth = (1.0 - Math.abs(bowPos.getZ(i)) / 2.1) * deadrise;
      if (!isNaN(keelDepth)) {
        bowPos.setY(i, y - keelDepth * 1.3);
      }
    }

    if (y > 0) {
      let newZ = bowPos.getZ(i) * (1.0 + y * 0.06);
      if (!isNaN(newZ)) {
        bowPos.setZ(i, newZ);
      }
    }
  }
  bowPos.needsUpdate = true;
  bowGeo.computeVertexNormals();
  const bow = new THREE.Mesh(bowGeo, matHullWhite);
  bow.position.set(5.5, 0.85, 0);
  bow.castShadow = true;
  bow.receiveShadow = true;
  boatGroup.add(bow);

  // 3. Hull Bottom (Charcoal Gelcoat Bottom Paint)
  const bottomGeo = new THREE.BoxGeometry(11.8, 0.8, 4.22, 40, 4, 4);
  const botPos = bottomGeo.attributes.position;
  for (let i = 0; i < botPos.count; i++) {
    let x = botPos.getX(i);
    let y = botPos.getY(i);
    let z = botPos.getZ(i);

    // Add NaN validation
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    let t = (x + 5.9) / 11.8;
    let widthSqueeze = 1.0 - Math.pow(Math.abs(t), 2.2) * 0.94;
    if (!isNaN(widthSqueeze)) {
      botPos.setZ(i, z * widthSqueeze);
    }
    
    if (y < 0) {
      let keelDepth = (1.0 - Math.abs(botPos.getZ(i)) / 2.11) * 0.55;
      if (!isNaN(keelDepth)) {
        botPos.setY(i, y - keelDepth * 1.35);
      }
    }
  }
  botPos.needsUpdate = true;
  bottomGeo.computeVertexNormals();
  const bottom = new THREE.Mesh(bottomGeo, matHullBottom);
  bottom.position.set(2.5, -0.62, 0);
  boatGroup.add(bottom);

  // 4. Accent Racing Stripe
  const stripeGeo = new THREE.BoxGeometry(13.2, 0.16, 4.26, 40, 2, 2);
  const strPos = stripeGeo.attributes.position;
  for (let i = 0; i < strPos.count; i++) {
    let x = strPos.getX(i);
    let z = strPos.getZ(i);
    let t = (x + 6.6) / 13.2;
    strPos.setZ(i, z * (1.0 - Math.pow(Math.abs(t), 2.2) * 0.95));
  }
  strPos.needsUpdate = true;
  stripeGeo.computeVertexNormals();
  const stripe = new THREE.Mesh(stripeGeo, matStripe);
  stripe.position.set(2.5, 0.65, 0);
  boatGroup.add(stripe);

  // 5. Deck Topsides (Premium Teak Planking)
  const deckMainGeo = new THREE.BoxGeometry(7.6, 0.1, 4.14);
  const deckMain = new THREE.Mesh(deckMainGeo, matDeck);
  deckMain.position.set(-1.5, 1.5, 0);
  boatGroup.add(deckMain);

  const deckBowGeo = new THREE.BoxGeometry(5.8, 0.1, 4.14, 20, 1, 1);
  const dbPos = deckBowGeo.attributes.position;
  for (let i = 0; i < dbPos.count; i++) {
    let lx = dbPos.getX(i);
    let ly = dbPos.getY(i);
    let lz = dbPos.getZ(i);
    let t = (lx + 2.9) / 5.8;
    dbPos.setZ(i, lz * (1.0 - t * 0.96));
    dbPos.setY(i, ly + (lx + 2.9) * 0.155); 
  }
  dbPos.needsUpdate = true;
  deckBowGeo.computeVertexNormals();
  const deckBow = new THREE.Mesh(deckBowGeo, matDeck);
  deckBow.position.set(5.1, 1.95, 0);
  boatGroup.add(deckBow);

  // 6. Curved Modern Cabin Structure
  const cabinGeo = new THREE.BoxGeometry(4.8, 1.4, 3.2, 20, 5, 5);
  const cPos = cabinGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    let x = cPos.getX(i); 
    let y = cPos.getY(i); 
    let z = cPos.getZ(i); 
    let t = (x + 2.4) / 4.8;

    cPos.setZ(i, z * (1.0 - t * 0.12));

    if (y > 0) {
      let tZ = Math.abs(z) / 1.6;
      cPos.setY(i, y - Math.pow(Math.abs(tZ), 2) * 0.15);
    }
  }
  cPos.needsUpdate = true;
  cabinGeo.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeo, matHullWhite);
  cabin.position.set(1.5, 2.15, 0);
  cabin.castShadow = true;
  boatGroup.add(cabin);

  // 7. Panoramic Tinted Windshield and Curved Glass
  const windshieldGeo = new THREE.CylinderGeometry(1.6, 1.7, 1.25, 24, 1, true, 0, Math.PI);
  const windshield = new THREE.Mesh(windshieldGeo, matGlass);
  windshield.rotation.y = -Math.PI / 2;
  windshield.rotation.z = -0.32; 
  windshield.position.set(3.9, 2.5, 0);
  boatGroup.add(windshield);

  const winPortGeo = new THREE.BoxGeometry(3.6, 0.72, 0.05);
  const winPort = new THREE.Mesh(winPortGeo, matGlass);
  winPort.position.set(1.5, 2.3, 1.61);
  boatGroup.add(winPort);

  const winStarboard = winPort.clone();
  winStarboard.position.z = -1.61;
  boatGroup.add(winStarboard);

  // 8. Sleek Cockpit Canopy (Black Canvas Cover)
  const canopyGeo = new THREE.BoxGeometry(4.2, 1.25, 3.4, 20, 4, 4);
  const capPos = canopyGeo.attributes.position;
  for (let i = 0; i < capPos.count; i++) {
    let x = capPos.getX(i); 
    let y = capPos.getY(i);
    let z = capPos.getZ(i);

    if (y > 0) {
      let t = (x + 2.1) / 4.2;
      capPos.setY(i, y + t * 0.15);
    }
  }
  capPos.needsUpdate = true;
  canopyGeo.computeVertexNormals();
  const canopy = new THREE.Mesh(canopyGeo, matCanopyCover);
  canopy.position.set(-1.0, 2.9, 0);
  canopy.castShadow = true;
  boatGroup.add(canopy);

  // Chrome supports for canopy
  for (let side = -1; side <= 1; side += 2) {
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3), matChrome);
    pillarR.position.set(-3.0, 2.1, 1.62 * side);
    pillarR.rotation.z = 0.15;
    boatGroup.add(pillarR);

    const pillarF = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), matChrome);
    pillarF.position.set(-0.8, 2.5, 1.62 * side);
    pillarF.rotation.z = -0.15;
    boatGroup.add(pillarF);
  }

  // 9. Aft Cockpit Seating
  const aftSeatGeo = new THREE.BoxGeometry(0.9, 0.65, 3.5);
  const aftSeat = new THREE.Mesh(aftSeatGeo, matSeat);
  aftSeat.position.set(-4.8, 1.8, 0);
  boatGroup.add(aftSeat);

  const trimGeo = new THREE.BoxGeometry(0.92, 0.08, 3.52);
  const trim = new THREE.Mesh(trimGeo, matSeatTrim);
  trim.position.set(-4.8, 2.1, 0);
  boatGroup.add(trim);

  // Seats
  const seatBaseGeo = new THREE.BoxGeometry(0.85, 0.9, 0.85);
  const seatCushionGeo = new THREE.BoxGeometry(0.87, 0.18, 0.87);

  const createDriverSeat = (offsetZ) => {
    const seatGroup = new THREE.Group();
    const base = new THREE.Mesh(seatBaseGeo, matSeat);
    base.castShadow = true;
    seatGroup.add(base);

    const cushion = new THREE.Mesh(seatCushionGeo, matSeatTrim);
    cushion.position.y = 0.45;
    seatGroup.add(cushion);

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.5), matSeat);
    headrest.position.set(-0.35, 0.75, 0);
    seatGroup.add(headrest);

    seatGroup.position.set(0.1, 1.9, offsetZ);
    return seatGroup;
  };

  boatGroup.add(createDriverSeat(0.75));
  boatGroup.add(createDriverSeat(-0.75));

  // Helm
  const helmGeo = new THREE.BoxGeometry(0.5, 0.9, 1.2);
  const helm = new THREE.Mesh(helmGeo, matHullWhite);
  helm.position.set(3.3, 1.9, -0.75);
  boatGroup.add(helm);

  const matGps = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }); 
  const gpsScreen = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.5), matGps);
  gpsScreen.position.set(3.04, 2.15, -0.75);
  boatGroup.add(gpsScreen);

  const wheelGroup = new THREE.Group();
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 12, 24), matSeatTrim);
  wheelGroup.add(wheelRing);
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.48), matChrome);
    spoke.rotation.z = (s * Math.PI * 2) / 3;
    wheelGroup.add(spoke);
  }
  wheelGroup.position.set(3.03, 1.98, -0.75);
  wheelGroup.rotation.y = Math.PI / 2;
  wheelGroup.rotation.z = 0.22; 
  boatGroup.add(wheelGroup);

  // 10. Lifebuoy
  const buoyGroup = new THREE.Group();
  const buoyBase = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.14, 12, 32), matLifebuoyRed);
  buoyGroup.add(buoyBase);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 16), matLifebuoyWhite);
    band.position.set(Math.cos(angle) * 0.48, Math.sin(angle) * 0.48, 0);
    band.rotation.z = angle + Math.PI / 2;
    buoyGroup.add(band);
  }
  const matLine = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const lifeline = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 8, 32), matLine);
  buoyGroup.add(lifeline);

  buoyGroup.rotation.x = Math.PI / 2;
  buoyGroup.position.set(1.5, 2.9, 0);
  boatGroup.add(buoyGroup);

  // 11. Electronics
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16), matChrome);
  domeBase.position.set(3.0, 2.9, 0.7);
  boatGroup.add(domeBase);

  const domeGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.24, 16);
  const dome = new THREE.Mesh(domeGeo, matHullWhite);
  dome.position.set(3.0, 3.1, 0.7);
  boatGroup.add(dome);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 1.8), matChrome);
  mast.rotation.z = -0.15; 
  mast.position.set(-0.8, 3.6, 0);
  boatGroup.add(mast);

  const lightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.22, 12), matChrome);
  lightHousing.rotation.z = Math.PI / 2;
  lightHousing.position.set(3.92, 2.95, 0);
  boatGroup.add(lightHousing);

  const lightLens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 12), matSearchlight);
  lightLens.rotation.z = Math.PI / 2;
  lightLens.position.set(4.03, 2.95, 0);
  boatGroup.add(lightLens);

  // 12. Nav Lights
  const navPort = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), matNavRed);
  navPort.position.set(3.6, 2.2, 1.63);
  boatGroup.add(navPort);

  const navStbd = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), matNavGreen);
  navStbd.position.set(3.6, 2.2, -1.63);
  boatGroup.add(navStbd);

  // 13. Engines
  const createRealisticEngine = (offsetZ) => {
    const engineGroup = new THREE.Group();

    const cowlGeo = new THREE.BoxGeometry(0.75, 1.05, 0.58, 4, 4, 4);
    const cPos = cowlGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      let x = cPos.getX(i);
      let y = cPos.getY(i);
      let z = cPos.getZ(i);
      if (y > 0.3) {
        cPos.setX(i, x * 0.8);
        cPos.setZ(i, z * 0.8);
      }
    }
    cPos.needsUpdate = true;
    cowlGeo.computeVertexNormals();
    const cowl = new THREE.Mesh(cowlGeo, matCanopyCover);
    cowl.castShadow = true;
    engineGroup.add(cowl);

    const engStripe = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.08, 0.6), matChrome);
    engStripe.position.set(0, 0.18, 0);
    engineGroup.add(engStripe);

    const columnGeo = new THREE.BoxGeometry(0.26, 1.45, 0.2);
    const col = new THREE.Mesh(columnGeo, matChrome);
    col.position.set(-0.1, -0.95, 0);
    engineGroup.add(col);

    const bulletGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.52, 12);
    const bullet = new THREE.Mesh(bulletGeo, matChrome);
    bullet.rotation.x = Math.PI / 2;
    bullet.position.set(-0.1, -1.68, 0);
    engineGroup.add(bullet);

    const propGroup = new THREE.Group();
    for (let b = 0; b < 3; b++) {
      const bladeGeo = new THREE.BoxGeometry(0.04, 0.36, 0.13, 2, 2, 2);
      const blade = new THREE.Mesh(bladeGeo, matChrome);
      blade.position.y = 0.18;
      blade.rotation.x = 0.35; 
      blade.rotation.z = (b * Math.PI * 2) / 3;
      propGroup.add(blade);
    }
    propGroup.position.set(-0.38, -1.68, 0);
    engineGroup.add(propGroup);

    engineGroup.position.set(-5.6, 1.15, offsetZ);
    return engineGroup;
  };

  boatGroup.add(createRealisticEngine(0.95));
  boatGroup.add(createRealisticEngine(-0.95));

  // 14. Railings
  const railingGroup = new THREE.Group();
  railingGroup.name = 'BoatRailings';
  const stanchionHeight = 0.65;
  const numStanchions = 8;
  for (let s = 0; s < numStanchions; s++) {
    const xPos = 0.2 + s * 1.35;
    const zOffset = 1.95 - (s * 0.24);

    const stanchionP = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, stanchionHeight, 8), matChrome);
    stanchionP.position.set(xPos, 1.82, zOffset);
    railingGroup.add(stanchionP);

    const stanchionS = stanchionP.clone();
    stanchionS.position.z = -zOffset;
    railingGroup.add(stanchionS);
  }

  const leftRailGeo = new THREE.BoxGeometry(9.6, 0.04, 0.04);
  const leftRail = new THREE.Mesh(leftRailGeo, matChrome);
  leftRail.position.set(4.6, 2.15, 1.05);
  leftRail.rotation.y = -0.19; 
  railingGroup.add(leftRail);

  const rightRail = leftRail.clone();
  rightRail.position.z = -1.05;
  rightRail.rotation.y = 0.19;
  railingGroup.add(rightRail);

  boatGroup.add(railingGroup);

  // 15. Swim platform
  const platformGeo = new THREE.BoxGeometry(0.85, 0.12, 3.8);
  const platform = new THREE.Mesh(platformGeo, matDeck);
  platform.position.set(-5.6, 0.6, 0);
  boatGroup.add(platform);

  const ladderGroup = new THREE.Group();
  ladderGroup.name = 'BoatLadder';
  const leftRailLad = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), matChrome);
  leftRailLad.position.z = 0.35;
  ladderGroup.add(leftRailLad);

  const rightRailLad = leftRailLad.clone();
  rightRailLad.position.z = -0.35;
  ladderGroup.add(rightRailLad);

  for (let step = -0.4; step <= 0.4; step += 0.4) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), matChrome);
    rung.rotation.x = Math.PI / 2;
    rung.position.y = step;
    ladderGroup.add(rung);
  }
  ladderGroup.rotation.z = -0.25; 
  ladderGroup.position.set(-5.95, 0.1, -1.25);
  boatGroup.add(ladderGroup);

  boatGroup.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return boatGroup;
}

function applyChaseCameraScale(lengthMeters) {
  _chaseOffsetBehind.set(
    -lengthMeters * CHASE_CAM_BEHIND_LOA,
    lengthMeters * CHASE_CAM_HEIGHT_LOA,
    0
  );
  _chaseOffsetLook.set(
    lengthMeters * CHASE_CAM_LOOK_AHEAD_LOA,
    lengthMeters * CHASE_CAM_HEIGHT_LOA * 0.55,
    0
  );
  if (orbitControls) {
    orbitControls.minDistance = lengthMeters * 0.52;
  }
}

function finalizeSpawnedBoat(modelPath = activeBoatModelFile.value) {
  const meshRoot = boatObject;
  if (meshRoot?.parent) meshRoot.parent.remove(meshRoot);

  if (islandGroup) {
    updateSimulationSpawn(islandGroup, islandGroup.userData?.isProceduralTerrain);
    // Re-apply berth so the dock — not open sea — is the spawn point.
    const berth = getActiveHarborDockBerth();
    if (berth) applySpawnAtBerth(berth);
  }

  const targetLength = resolveTargetBoatLength(modelPath);
  
  console.log('[finalizeSpawnedBoat] Target boat length:', targetLength, 'meters');
  console.log('[finalizeSpawnedBoat] Model path:', modelPath);
  
  const { boat, waterlineY, lengthMeters } = normalizeBoatToScene(meshRoot, {
    targetLength,
    targetWaterlineY: SCENE_WATERLINE_Y,
    spawnX: SIMULATION_SPAWN.x,
    spawnZ: SIMULATION_SPAWN.z,
    waterlineOffset: 0,
    modelPath
  });

  boatObject = boat;
  boatObject.userData.loaMeters = lengthMeters;
  scene.add(boatObject);
  tagHelmDeckRailMeshes(boatObject);
  tagHelmInteriorMeshes(boatObject);
  boatAnchorRig = setupBoatAnchorRig(boatObject);
  if (boatAnchorRig) applyAnchorPose(boatAnchorRig, 0);
  baselineWaterlineY = waterlineY;
  applyChaseCameraScale(lengthMeters);
  attachHelmCockpitToBoat();
  addBoatHeadlights(boatObject, lengthMeters); // Add headlights
  syncHelmRailingsVisibility();

  // A newly loaded model has zero yaw; apply the shared mission/Quick Sail pose before framing it.
  if (!isMenuBackdropScreen()) restoreBoatSimPose();
  orbitControls.target.copy(boatObject.position);
  orbitControls.update();
  syncOrbitControlsEnabled();
  snapChaseCamera();
  const compassHeading = boatRotationToCompassHeading(boatObject.rotation.y);
  const validHeading = Number.isFinite(compassHeading) ? compassHeading : 0;
  stats.value.rotationDeg = validHeading;
  syncCompassVisualHeading(validHeading, { force: true });
  syncStatsBoatXZ();
  initComplete.value = true;

  if (isMenuBackdropScreen()) {
    landingBoatPoseActive = false;
    applyEnvironmentPreset('sunset');
    if (camera) {
      camera.fov = LANDING_CAMERA_FOV;
      camera.updateProjectionMatrix();
    }
  }
  
  // CRITICAL FIX: Force re-apply the environment preset to ensure proper fog/lighting
  // for all boat sizes, especially the small boat which was showing white background
  if (!isMenuBackdropScreen() && environmentPreset) {
    console.log('[finalizeSpawnedBoat] Re-applying environment preset:', environmentPreset);
    applyEnvironmentPreset(environmentPreset);
  }
}

function showCollisionWarning(message) {
  collisionWarning.value = message;
  if (islandWarningTimerId) window.clearTimeout(islandWarningTimerId);
  islandWarningTimerId = window.setTimeout(() => {
    collisionWarning.value = '';
    islandWarningTimerId = null;
  }, 2800);
}

function checkAndResolveCollisions() {
  if (!boatObject) return { blocked: false };

  let blocked = false;
  
  // GRACE PERIOD: Skip collision detection for 3 seconds after engine start
  // This prevents immediate collision warnings when spawning near the port
  const engineStartTime = window.engineStartTime || 0;
  const timeSinceStart = (performance.now() - engineStartTime) / 1000;
  const COLLISION_GRACE_PERIOD = 3.0; // 3 seconds grace period
  
  if (timeSinceStart < COLLISION_GRACE_PERIOD) {
    return { blocked: false }; // Skip all collision checks during grace period
  }

  // Check dock collision - IMPORTANT: This function RETURNS the corrected position!
  const dockColliders = getActiveDockColliders();
  
  const dockResolved = resolveDockCollision(
    boatObject.position.x,
    boatObject.position.z,
    dockColliders
  );
  
  if (dockResolved.collided) {
    blocked = true;
    // APPLY the corrected position that pushes boat away from dock
    boatObject.position.x = dockResolved.x;
    boatObject.position.z = dockResolved.z;
    showCollisionWarning('⚠️ COLLISION WITH PIER — Cannot pass through!');
    
    // Track collision in performance system
    if (performanceManager.isActive) {
      performanceManager.onCollision('dock', 'pier', Math.abs(stats.value.speedKnots));
    }
    
    // Track collision for Safety Compliance score
    if (activeTrainingModule.value && !isTrainingReviewMode.value) {
      console.log('[Safety] 🚨 PORT COLLISION DETECTED!');
      console.log('[Safety] Before - Collisions:', trainingRunMetrics.value.safety.collisions.length, 'Violations:', trainingRunMetrics.value.safety.violations.length);
      recordCollision(trainingRunMetrics.value, 'PORT', {
        speed: Math.abs(stats.value.speedKnots),
        location: { x: boatObject.position.x, z: boatObject.position.z }
      });
      console.log('[Safety] After - Collisions:', trainingRunMetrics.value.safety.collisions.length, 'Violations:', trainingRunMetrics.value.safety.violations.length);
    }
  }

  // Check waypoint/buoy collision - IMPORTANT: This also returns corrected position!
  const waypointResolved = resolveWaypointCollision(
    boatObject.position.x,
    boatObject.position.z,
    waypointMarkerGroup
  );
  
  if (waypointResolved.collided) {
    blocked = true;
    // APPLY the corrected position that pushes boat away from buoy
    boatObject.position.x = waypointResolved.x;
    boatObject.position.z = waypointResolved.z;
    showCollisionWarning('⚠️ COLLISION WITH BUOY — Cannot pass through!');
    
    // Track collision in performance system
    if (performanceManager.isActive) {
      performanceManager.onCollision('buoy', 'fishing-gear', Math.abs(stats.value.speedKnots));
    }
    
    // Track collision for Safety Compliance score
    if (activeTrainingModule.value && !isTrainingReviewMode.value) {
      console.log('[Safety] 🚨 BUOY COLLISION DETECTED!');
      console.log('[Safety] Before - Collisions:', trainingRunMetrics.value.safety.collisions.length, 'Violations:', trainingRunMetrics.value.safety.violations.length);
      recordCollision(trainingRunMetrics.value, 'BUOY', {
        speed: Math.abs(stats.value.speedKnots),
        location: { x: boatObject.position.x, z: boatObject.position.z }
      });
      console.log('[Safety] After - Collisions:', trainingRunMetrics.value.safety.collisions.length, 'Violations:', trainingRunMetrics.value.safety.violations.length);
    }
  }

  // Check island/shore collision
  if (islandGroup) {
    const resolved = resolveIslandCollisionAccurate(
      boatObject.position.x,
      boatObject.position.z,
      islandGroup
    );
    
    if (resolved.collided) {
      // ALWAYS enforce shore collision - boat should NEVER be on land!
      blocked = true;
      // APPLY the corrected position that pushes boat away from shore
      boatObject.position.x = resolved.x;
      boatObject.position.z = resolved.z;
      showCollisionWarning('⚠️ SHORE COLLISION — Cannot pass through land!');
      
      // Track collision
      if (performanceManager.isActive) {
        performanceManager.onCollision('shore', 'island', Math.abs(stats.value.speedKnots));
      }
      
      // Track collision for Safety Compliance score
      if (activeTrainingModule.value && !isTrainingReviewMode.value) {
        recordCollision(trainingRunMetrics.value, 'SHORE', {
          speed: Math.abs(stats.value.speedKnots),
          location: { x: boatObject.position.x, z: boatObject.position.z }
        });
      }
    }
  }

  // Check world boundary
  const bounded = clampToOceanBounds(boatObject.position.x, boatObject.position.z);
  if (bounded.x !== boatObject.position.x || bounded.z !== boatObject.position.z) {
    blocked = true;
    boatObject.position.x = bounded.x;
    boatObject.position.z = bounded.z;
    showCollisionWarning('⚠️ World boundary — Turn back!');
  }

  return { blocked };
}

// OLD FUNCTION - Keep for compatibility but deprecated
function applyWorldCollisionBlocking() {
  if (!boatObject) return;

  // Store original position for bounce-back calculation
  const origX = boatObject.position.x;
  const origZ = boatObject.position.z;
  let totalCollided = false;

  const dockResolved = resolveDockCollision(
    boatObject.position.x,
    boatObject.position.z,
    getActiveDockColliders()
  );
  if (dockResolved.collided) {
    boatObject.position.x = dockResolved.x;
    boatObject.position.z = dockResolved.z;
    totalCollided = true;
    
    // Calculate impact based on speed
    const impact = Math.abs(speedVel);
    
    // STRONG collision response - stop and bounce back
    if (impact > knotsToMetersPerSecond(0.8)) {
      // High speed collision - bounce back
      speedVel = -speedVel * 0.3; // Reverse 30% of speed
      showCollisionWarning('⚠️ COLLISION WITH PIER — Slow down immediately!');
    } else {
      // Low speed collision - full stop
      speedVel = 0;
      showCollisionWarning('Contact with pier — slow down and steer clear of the dock');
    }
    
    // Track collision in performance system
    if (performanceManager.isActive) {
      performanceManager.onCollision('dock', 'pier', stats.value.speedKnots);
      console.log('[App] Dock collision tracked');
    }
    
    // Track collision for Safety Compliance score
    if (activeTrainingModule.value && !isTrainingReviewMode.value) {
      recordCollision(trainingRunMetrics.value, 'PORT', {
        speed: Math.abs(stats.value.speedKnots),
        location: { x: boatObject.position.x, z: boatObject.position.z }
      });
    }
  }

  const waypointResolved = resolveWaypointCollision(
    boatObject.position.x,
    boatObject.position.z,
    waypointMarkerGroup
  );
  if (waypointResolved.collided) {
    boatObject.position.x = waypointResolved.x;
    boatObject.position.z = waypointResolved.z;
    totalCollided = true;
    
    // Calculate impact based on speed
    const impact = Math.abs(speedVel);
    
    // STRONG collision response for buoys/fishing gear
    if (impact > knotsToMetersPerSecond(0.8)) {
      // High speed collision - bounce back
      speedVel = -speedVel * 0.3; // Reverse 30% of speed
      showCollisionWarning('⚠️ COLLISION WITH FISHING GEAR — Damage risk!');
    } else {
      // Low speed collision - full stop
      speedVel = 0;
      showCollisionWarning('Contact with fishing gear — keep your distance!');
    }
    
    // Track collision in performance system
    if (performanceManager.isActive) {
      performanceManager.onCollision('buoy', 'fishing-gear', stats.value.speedKnots);
      console.log('[App] Buoy collision tracked');
    }
    
    // Track collision for Safety Compliance score
    if (activeTrainingModule.value && !isTrainingReviewMode.value) {
      recordCollision(trainingRunMetrics.value, 'BUOY', {
        speed: Math.abs(stats.value.speedKnots),
        location: { x: boatObject.position.x, z: boatObject.position.z }
      });
    }
  }

  if (!islandGroup) return;

  // TEMPORARY DISABLE: Shore collision detection causing false positives
  // Comment out collision detection until proper fix
  /*
  const resolved = resolveIslandCollisionAccurate(
    boatObject.position.x,
    boatObject.position.z,
    islandGroup
  );
  if (resolved.collided) {
    console.log('Shore collision detected at:', boatObject.position.x, boatObject.position.z);
    // TEMPORARY FIX: Don't force position change if collision detection is faulty
    // Only move boat if it's actually very close to shore
    const actualDist = distanceToNearestIslandShore(boatObject.position.x, boatObject.position.z, islandGroup);
    if (actualDist < 5) { // Only if really close
      boatObject.position.x = resolved.x;
      boatObject.position.z = resolved.z;
      speedVel *= 0.2;
    }
    showCollisionWarning('Shore collision — slow down and steer away from the island (Press R to reset)');
    return;
  }

  const shoreDist = distanceToNearestIslandShore(
    boatObject.position.x,
    boatObject.position.z,
    islandGroup
  );
  
  // TEMPORARY FIX: Reduce proximity warning sensitivity and add validation
  const validShoreDist = Number.isFinite(shoreDist) ? shoreDist : 100;
  const isMovingFast = Math.abs(speedVel) > 0.12; // Increased threshold
  
  if (validShoreDist < ISLAND_PROXIMITY_MARGIN && isMovingFast) {
    console.log('Shore proximity warning at distance:', validShoreDist, 'speed:', speedVel);
    // Only show warning if boat is actually moving toward shore
    showCollisionWarning('Shore collision — slow down and steer away from the island');
  }
  */

  const bounded = clampToOceanBounds(boatObject.position.x, boatObject.position.z);
  if (bounded.x !== boatObject.position.x || bounded.z !== boatObject.position.z) {
    boatObject.position.x = bounded.x;
    boatObject.position.z = bounded.z;
    totalCollided = true;
    
    // Stop at world boundary
    const impact = Math.abs(speedVel);
    if (impact > knotsToMetersPerSecond(0.8)) {
      speedVel = -speedVel * 0.2; // Bounce back from world edge
      showCollisionWarning('⚠️ World boundary — Turn back!');
    } else {
      speedVel = 0;
    }
  }
}

// --- Boat Physics Logic ---
function updateBoatPhysics(delta = 1 / 60) {
  if (!boatObject || !simulationRunning.value) return;
  const dt = Number.isFinite(delta) ? Math.max(0, Math.min(.1, delta)) : 1 / 60;
  if (dt === 0) return;
  const frameScale = dt * 60;
  const vessel = BOAT_TYPES[selectedBoatType.value] || BOAT_TYPES.medium;

  restoreFiniteBoatTransform();
  if (!Number.isFinite(speedVel)) speedVel = 0;
  if (!Number.isFinite(speedRot)) speedRot = 0;
  if (!Number.isFinite(angularVelocity)) angularVelocity = 0;
  if (!Number.isFinite(physics.value.mass) || physics.value.mass <= 0) physics.value.mass = 390;
  if (!Number.isFinite(physics.value.thrustForce)) physics.value.thrustForce = 11;
  if (!Number.isFinite(physics.value.dragCoefficient)) physics.value.dragCoefficient = 0.13;
  if (!Number.isFinite(physics.value.waterReactionForce)) physics.value.waterReactionForce = 0.008;
  if (!Number.isFinite(physics.value.waveAmplitude)) physics.value.waveAmplitude = 0.18;
  if (!Number.isFinite(physics.value.waveFrequency)) physics.value.waveFrequency = 1.2;
  if (!Number.isFinite(physics.value.wavePhaseOffset)) physics.value.wavePhaseOffset = 0;
  if (!Number.isFinite(wind.value.speed)) wind.value.speed = 0.1;
  if (!Number.isFinite(wind.value.directionAngle)) wind.value.directionAngle = 90;

  if (!isSinking) {
    // Anchor physics — hold vessel while anchor is deploying, set, or retracting
    if (isAnchorRigEngaged(boatAnchorRig) || anchor.value.deployed || anchor.value.deploying || anchor.value.retracting) {
      speedVel = 0;
      speedRot = 0;
      angularVelocity = 0;

      stats.value.speedKnots = 0;
      const headingPrecise = boatHeadingDegrees(boatObject.rotation.y);
      const validHeading = Number.isFinite(headingPrecise) ? headingPrecise : 0;
      stats.value.rotationDeg = Math.round(validHeading);
      syncCompassVisualHeading(validHeading);
      stats.value.yPos = boatObject.position.y;
      stats.value.rollDeg = THREE.MathUtils.radToDeg(boatObject.rotation.z || 0);
      stats.value.pitchDeg = THREE.MathUtils.radToDeg(boatObject.rotation.x || 0);
      syncStatsBoatXZ();

      if (activeTrainingModule.value && !isTrainingReviewMode.value) {
        updateTrainingRunMetrics(trainingRunMetrics.value, stats.value);
      }
      checkTrainingStep();
      return;
    }

    // Fishing Net physics — hold vessel while net is deployed or being retrieved
    if (trawlNetState.value === 'ACTIVE' || trawlNetState.value === 'DEPLOYING' || trawlNetState.value === 'RETRIEVING') {
      // Show warning if player tries to move
      if (keyStates["KeyW"] || keyStates["KeyS"] || keyStates["KeyA"] || keyStates["KeyD"]) {
        anchorWarning.value = false;
        collisionWarning.value = 'Cannot move while fishing net is deployed — retrieve net first (press N)';
        setTimeout(() => { collisionWarning.value = ''; }, 2500);
      }

      speedVel = 0;
      speedRot = 0;
      angularVelocity = 0;

      stats.value.speedKnots = 0;
      const headingPrecise = boatHeadingDegrees(boatObject.rotation.y);
      const validHeading = Number.isFinite(headingPrecise) ? headingPrecise : 0;
      stats.value.rotationDeg = Math.round(validHeading);
      syncCompassVisualHeading(validHeading);
      stats.value.yPos = boatObject.position.y;
      stats.value.rollDeg = THREE.MathUtils.radToDeg(boatObject.rotation.z || 0);
      stats.value.pitchDeg = THREE.MathUtils.radToDeg(boatObject.rotation.x || 0);
      syncStatsBoatXZ();

      if (activeTrainingModule.value && !isTrainingReviewMode.value) {
        updateTrainingRunMetrics(trainingRunMetrics.value, stats.value);
      }
      checkTrainingStep();
      return;
    }

    // Fishing Line physics — hold vessel while fishing line is deployed
    if (fishingLineActive.value) {
      // Show warning if player tries to move
      if (keyStates["KeyW"] || keyStates["KeyS"] || keyStates["KeyA"] || keyStates["KeyD"]) {
        anchorWarning.value = false;
        collisionWarning.value = 'Cannot move while fishing line is deployed — retrieve line first (press F)';
        setTimeout(() => { collisionWarning.value = ''; }, 2500);
      }

      speedVel = 0;
      speedRot = 0;
      angularVelocity = 0;

      stats.value.speedKnots = 0;
      const headingPrecise = boatHeadingDegrees(boatObject.rotation.y);
      const validHeading = Number.isFinite(headingPrecise) ? headingPrecise : 0;
      stats.value.rotationDeg = Math.round(validHeading);
      syncCompassVisualHeading(validHeading);
      stats.value.yPos = boatObject.position.y;
      stats.value.rollDeg = THREE.MathUtils.radToDeg(boatObject.rotation.z || 0);
      stats.value.pitchDeg = THREE.MathUtils.radToDeg(boatObject.rotation.x || 0);
      syncStatsBoatXZ();

      if (activeTrainingModule.value && !isTrainingReviewMode.value) {
        updateTrainingRunMetrics(trainingRunMetrics.value, stats.value);
      }
      checkTrainingStep();
      return;
    }

    const weatherFx = getRainPhysicsModifiers(stormMode.value);

    speedVel = advanceBoatSpeed(speedVel, {
      forward: keyStates.KeyW, reverse: keyStates.KeyS, engineRunning: engineRunning.value,
    }, dt, vessel, weatherFx, 390 * vessel.massMult / physics.value.mass);

    // Check training step completion
    if (activeTrainingModule.value && !isTrainingReviewMode.value) {
      updateTrainingRunMetrics(trainingRunMetrics.value, stats.value);
    }
    checkTrainingStep();

    // Engine off: keep floating and coast with existing momentum, without powered steering.
    if (!engineRunning.value) {
      // Apply wave bobbing and pitch/roll EVEN when engine is off
      // (boat should float naturally on waves regardless of engine state)
      const waveMotion = getBoatWaveMotion();
      const MAX_WAVE_TILT = waveMotion.maxTilt;
      const targetPitch = THREE.MathUtils.clamp(waveMotion.rotationX, -MAX_WAVE_TILT, MAX_WAVE_TILT);
      const targetRoll = THREE.MathUtils.clamp(waveMotion.rotationZ, -MAX_WAVE_TILT, MAX_WAVE_TILT);
      
      const rollDamping = waveMotion.blend;
      const pitchDamping = waveMotion.blend;
      
      const currentPitch = boatObject.rotation.x || 0;
      boatObject.rotation.x = THREE.MathUtils.lerp(currentPitch, targetPitch, pitchDamping);
      
      boatObject.position.y = THREE.MathUtils.lerp(boatObject.position.y,
        baselineWaterlineY + physics.value.waterlineOffset + waveMotion.height, waveMotion.heaveBlend);
      
      const currentRoll = boatObject.rotation.z || 0;
      boatObject.rotation.z = THREE.MathUtils.lerp(currentRoll, targetRoll, rollDamping);
      
      // If player is attempting to move, prompt to start engine
      if (keyStates["KeyW"] || keyStates["KeyS"] || keyStates["KeyA"] || keyStates["KeyD"]) {
        // show a short prompt
        engineStarting.value = false; // ensure not in starting animation
        anchorWarning.value = false;
        collisionWarning.value = 'Engine is off — press ENGINE START to start the engine';
        setTimeout(() => { collisionWarning.value = ''; }, 2000);
      }

      _boatForward.set(1, 0, 0).applyQuaternion(boatObject.quaternion);
      boatObject.position.addScaledVector(_boatForward, speedVel * dt);
      if (checkAndResolveCollisions().blocked) speedVel = 0;
      speedRot = 0;
      angularVelocity = 0;

      stats.value.speedKnots = metersPerSecondToKnots(speedVel);
      const headingPrecise = boatHeadingDegrees(boatObject.rotation.y);
      const validHeading = Number.isFinite(headingPrecise) ? headingPrecise : 0;
      stats.value.rotationDeg = Math.round(validHeading);
      syncCompassVisualHeading(validHeading);
      stats.value.yPos = boatObject.position.y;
      stats.value.rollDeg = THREE.MathUtils.radToDeg(boatObject.rotation.z || 0);
      stats.value.pitchDeg = THREE.MathUtils.radToDeg(boatObject.rotation.x || 0);
      syncStatsBoatXZ();

      if (activeTrainingModule.value && !isTrainingReviewMode.value) {
        updateTrainingRunMetrics(trainingRunMetrics.value, stats.value);
      }
      checkTrainingStep();
      return;
    }

    if (keyStates["KeyA"]) {
      const turnFactor = Math.min(1, Math.abs(speedVel) / knotsToMetersPerSecond(vessel.maxSpeedKnots * .35));
      speedRot = THREE.MathUtils.degToRad(vessel.maxTurnDegreesPerSecond) * turnFactor * weatherFx.steerScale * Math.sign(speedVel);
      angularVelocity = 0.04 * turnFactor * weatherFx.steerScale;
      turnRadius = 1.0;
    } else if (keyStates["KeyD"]) {
      const turnFactor = Math.min(1, Math.abs(speedVel) / knotsToMetersPerSecond(vessel.maxSpeedKnots * .35));
      speedRot = -THREE.MathUtils.degToRad(vessel.maxTurnDegreesPerSecond) * turnFactor * weatherFx.steerScale * Math.sign(speedVel);
      angularVelocity = 0.04 * turnFactor * weatherFx.steerScale;
      turnRadius = 1.0;
    } else {
      speedRot *= Math.pow(weatherFx.turnDamping, frameScale);
      angularVelocity *= Math.pow(weatherFx.turnDamping, frameScale);
      if (Math.abs(speedRot) < 0.001) speedRot = 0;
      if (Math.abs(angularVelocity) < 0.001) angularVelocity = 0;
      turnRadius = 0;
    }

    boatObject.rotation.y += speedRot * dt;
    _boatForward.set(1, 0, 0).applyQuaternion(boatObject.quaternion);
    
    // Apply movement
    boatObject.position.addScaledVector(_boatForward, speedVel * dt);
    
    // Check collision and apply corrections
    const collisionResult = checkAndResolveCollisions();
    if (collisionResult.blocked) {
      // Collision detected! Boat position already corrected by collision functions
      
      // STRONG PHYSICS RESPONSE - realistic maritime collision
      if (Math.abs(speedVel) > knotsToMetersPerSecond(1.5)) {
        // High speed collision - HARD BOUNCE BACK (reverse 80% of speed)
        speedVel = -speedVel * 0.8;
        speedRot *= 0.3; // Reduce turning momentum by 70%
      } else if (Math.abs(speedVel) > knotsToMetersPerSecond(0.5)) {
        // Medium speed - moderate bounce back (reverse 60% of speed)
        speedVel = -speedVel * 0.6;
        speedRot *= 0.5; // Reduce turning by 50%
      } else {
        // Low speed - FULL STOP
        speedVel = 0;
        speedRot = 0;
        angularVelocity = 0;
        turnRadius = 0;
      }
      
      // Additional push back to ensure boat clears the obstacle
      boatObject.position.addScaledVector(_boatForward, speedVel * dt * 0.5);
    }

    // Advanced Wave Response - realistic boat-wave interaction with roll and pitch
    const waveMotion = getBoatWaveMotion();
    // Follow the rendered swell, while keeping vessel tilt comfortable.
    const MAX_WAVE_TILT = waveMotion.maxTilt;
    const targetPitch = THREE.MathUtils.clamp(waveMotion.rotationX, -MAX_WAVE_TILT, MAX_WAVE_TILT);
    const targetRoll = THREE.MathUtils.clamp(waveMotion.rotationZ, -MAX_WAVE_TILT, MAX_WAVE_TILT);
    
    const rollDamping = waveMotion.blend;
    const pitchDamping = waveMotion.blend;
    
    // Smoothly interpolate pitch to follow waves (prevents sudden jerky motion).
    // Roll is blended below with the turning bank so the two never abruptly overwrite each other.
    const currentPitch = boatObject.rotation.x || 0;
    boatObject.rotation.x = THREE.MathUtils.lerp(currentPitch, targetPitch, pitchDamping);
    
    boatObject.position.y = THREE.MathUtils.lerp(boatObject.position.y,
      baselineWaterlineY + physics.value.waterlineOffset + waveMotion.height, waveMotion.heaveBlend);

    // Wind effect
    const windRad = THREE.MathUtils.degToRad(wind.value.directionAngle);
    const windDir = new THREE.Vector3(Math.cos(windRad), 0, Math.sin(windRad));
    const windImpact = windDir.clone().multiplyScalar(wind.value.speed * physics.value.windForce);
    
    // Store position before wind
    const preWindX = boatObject.position.x;
    const preWindZ = boatObject.position.z;
    
    boatObject.position.addScaledVector(windImpact, dt);
    
    // Check collision after wind and apply corrections
    const windCollision = checkAndResolveCollisions();
    if (windCollision.blocked) {
      // Wind pushed us into obstacle - revert wind movement
      boatObject.position.x = preWindX;
      boatObject.position.z = preWindZ;
      // Reduce momentum further
      speedVel *= 0.7;
      speedRot *= 0.7;
    }

    const sideImpact = windDir.dot(_boatForward);
    speedRot += sideImpact * wind.value.speed * 0.002 * dt;
    const maxTurnRate = THREE.MathUtils.degToRad(vessel.maxTurnDegreesPerSecond);
    speedRot = THREE.MathUtils.clamp(speedRot, -maxTurnRate, maxTurnRate);

    if (angularVelocity > 0 && turnRadius > 0) {
      const centrifugalForce = physics.value.mass * angularVelocity * angularVelocity * turnRadius;
      const adjustment = centrifugalForce * 0.0005;
      _boatRight.set(0, 0, 1).applyQuaternion(boatObject.quaternion);
      boatObject.position.addScaledVector(_boatRight, adjustment * Math.sign(speedRot) * frameScale);

      const maxTiltAngle = Math.PI / 16; // gentler bank so it never overrides the wave clamp too hard
      const tilt = angularVelocity * turnRadius * 0.15;
      turnTilt = Math.min(maxTiltAngle, tilt) * Math.sign(speedRot);
    } else {
      turnTilt *= Math.pow(0.92, frameScale);
    }
    // Blend wave roll + turning bank instead of overwriting, so rotation.z never snaps between frames
    boatObject.rotation.z = THREE.MathUtils.lerp(boatObject.rotation.z || 0, targetRoll + turnTilt, rollDamping);

    if (physics.value.mass > physics.value.sinkingThreshold) {
      isSinking = true;
      stats.value.state = 'SINKING!';
      if (audioPlayer.value && !musicPlaying.value) {
        audioPlayer.value.play().catch(() => {});
        musicPlaying.value = true;
      }
    }

    stats.value.speedKnots = metersPerSecondToKnots(speedVel);
    const headingPrecise = boatHeadingDegrees(boatObject.rotation.y);
    const validHeading = Number.isFinite(headingPrecise) ? headingPrecise : 0;
    stats.value.rotationDeg = Math.round(validHeading);
    syncCompassVisualHeading(validHeading);
    stats.value.yPos = boatObject.position.y;
    stats.value.rollDeg = THREE.MathUtils.radToDeg(boatObject.rotation.z || 0);
    stats.value.pitchDeg = THREE.MathUtils.radToDeg(boatObject.rotation.x || 0);
    syncStatsBoatXZ();
    
    // Track steering precision if in training
    if (activeTrainingModule.value && !isTrainingReviewMode.value) {
      const previousHeading = trainingRunMetrics.value.lastHeading || headingPrecise;
      trackSteeringInput(trainingRunMetrics.value, headingPrecise, previousHeading, dt * 1000);
      trainingRunMetrics.value.lastHeading = headingPrecise;
      
      // Track fishing time if line is active
      if (fishingLineActive.value) {
        updateFishingTime(trainingRunMetrics.value, dt * 1000);
      }
    }

  } else {
    sinkingTimer += 0.001 * frameScale;
    boatObject.position.y -= sinkingTimer * frameScale;
    boatObject.rotation.z += 0.001 * frameScale;
    boatObject.rotation.x += 0.0005 * frameScale;
    
    speedVel *= Math.pow(0.95, frameScale);
    _boatForward.set(1, 0, 0).applyQuaternion(boatObject.quaternion);
    boatObject.position.addScaledVector(_boatForward, speedVel * dt);

    if (boatObject.position.y < -120) {
      boatObject.position.y = -120;
      speedVel = 0;
    }

    stats.value.speedKnots = metersPerSecondToKnots(speedVel);
    stats.value.yPos = boatObject.position.y;
    stats.value.rollDeg = THREE.MathUtils.radToDeg(boatObject.rotation.z || 0);
    stats.value.pitchDeg = THREE.MathUtils.radToDeg(boatObject.rotation.x || 0);
    syncStatsBoatXZ();
  }
}

// --- Camera Focus Update ---
function updateCameras() {
  if (!boatObject) return;

  if (activeCamera.value === 'chase') {
    _chasePosScratch.copy(_chaseOffsetBehind).applyQuaternion(boatObject.quaternion).add(boatObject.position);
    _chaseLookScratch.copy(_chaseOffsetLook).applyQuaternion(boatObject.quaternion).add(boatObject.position);
    camera.position.lerp(_chasePosScratch, 0.14);
    camera.lookAt(applyCameraLookOffset(camera.position, _chaseLookScratch));
    if (orbitControls) orbitControls.target.copy(boatObject.position);
  } else if (activeCamera.value === 'orbit') {
    orbitControls.target.copy(boatObject.position);
  } else {
    // The big bridge camera follows the cabin transform to stay inside its windows during waves.
    const isSmallHelm = selectedBoatType.value === 'small';
    const isLargeHelm = selectedBoatType.value === 'large';
    const localCamPos = isSmallHelm ? HELM_CAMERA_POS_SMALL : isLargeHelm ? HELM_CAMERA_POS_LARGE : HELM_CAMERA_POS;
    const localLookPos = isSmallHelm ? HELM_CAMERA_LOOK_SMALL : isLargeHelm ? HELM_CAMERA_LOOK_LARGE : HELM_CAMERA_LOOK;
    
    // Apply only yaw rotation (Y-axis) to prevent pitch-induced camera movement
    const yawQuat = new THREE.Quaternion();
    yawQuat.setFromEuler(new THREE.Euler(0, boatObject.rotation.y, 0, 'YXZ'));
    const helmRotation = isLargeHelm ? boatObject.quaternion : yawQuat;
    
    _helmPosScratch.copy(localCamPos).applyQuaternion(helmRotation).add(boatObject.position);
    _helmLookScratch.copy(localLookPos).applyQuaternion(helmRotation).add(boatObject.position);

    camera2.position.copy(_helmPosScratch);
    camera2.lookAt(applyCameraLookOffset(camera2.position, _helmLookScratch));
  }
}

// Keyboard input setup
function pressSimulationTouchKey(code) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.slice(3).toLowerCase(), bubbles: true }));
}

function releaseSimulationTouchKey(code) {
  keyStates[code] = false;
  window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code.slice(3).toLowerCase(), bubbles: true }));
}

function interactSimulationTouch() {
  pressSimulationTouchKey('KeyQ');
  releaseSimulationTouchKey('KeyQ');
}

function setupInputs() {
  window.addEventListener("keyup", (event) => {
    if (activeScreen.value !== 'simulation') return;
    if (event.code === 'Backquote') {
      cancelExitHold();
      return;
    }
    // Track Alt key release
    if (event.key === 'Alt') {
      altKeyPressed.value = false;
      syncUiCursor();
      return;
    }
    keyStates[event.code] = false;
    if (event.code === "KeyW" || event.code === "KeyS") {
      isStopping = true;
    }
    const keyEl = document.getElementById(`key${event.code.replace('Key', '')}`);
    if (keyEl) keyEl.classList.remove('active');
  });

  window.addEventListener("keydown", (event) => {
    if (activeScreen.value !== 'simulation') return;
    // If final exit confirmation is visible, handle it first
    if (exitFinalConfirmVisible.value) {
      if ((event.code === 'Enter' || event.key === 'Enter') && !event.repeat) {
        confirmFinalExit();
        event.preventDefault();
      } else if (event.code === 'Escape' && !event.repeat) {
        cancelFinalExit();
        event.preventDefault();
      }
      return;
    }
    // If exit confirmation is visible (first step), handle modal keys
    if (exitConfirmVisible.value) {
      if ((event.code === 'Enter' || event.key === 'Enter') && !event.repeat) {
        confirmExit();
        event.preventDefault();
      } else if (event.code === 'Escape' && !event.repeat) {
        cancelExitConfirm();
        event.preventDefault();
      }
      return;
    }
    if (gearInfoPopup.value) return; // Ignore inputs when the educational popup is open
    if (event.code === 'Backquote') {
      event.preventDefault();
      startExitHold();
      return;
    }
    
    // Show exit confirmation with Escape key
    if (event.code === 'Escape' && !event.repeat) {
      event.preventDefault();
      showExitConfirm();
      return;
    }
    // Track Alt key press to show cursor
    if (event.key === 'Alt') {
      altKeyPressed.value = true;
      document.body.style.cursor = 'auto';
      if (renderer?.domElement) renderer.domElement.style.cursor = 'default';
      return;
    }
    // Toggle headlights/flashlight with L key
    if (event.code === 'KeyL' && !event.repeat) {
      toggleBoatHeadlights();
      return;
    }
    // Anchor toggle with H key
    if (event.code === 'KeyH' && !event.repeat) {
      toggleAnchor();
      return;
    }
    // Start engine with P key
    if (event.code === 'KeyP' && !event.repeat) {
      startEngine();
      return;
    }
    // Interaction key with Q
    if (event.code === 'KeyQ' && !event.repeat) {
      // Handle new interaction types: inspect_buoy, inspect_marker, verify_patrol
      if (activeMiniGame.value === 'inspect_buoy') {
        const step = activeTrainingModule.value?.steps[currentTrainingStep.value];
        if (step?.waypointZone) showGearInfoPopup(step.waypointZone);
        return;
      }

      if (activeMiniGame.value === 'inspect_marker' || activeMiniGame.value === 'verify_patrol') {
        // These interactions complete immediately without an educational popup.
        completeMiniGame();
        return;
      }
      
      if (activeMiniGame.value === 'remove_debris') {
        miniGameProgress.value += 10;
        if (miniGameProgress.value >= 100) {
          const step = activeTrainingModule.value?.steps[currentTrainingStep.value];
          if (step?.waypointZone) {
            showGearInfoPopup(step.waypointZone);
          } else {
            completeMiniGame();
          }
        }
        return;
      }
      
      if (activeMiniGame.value === 'photograph') {
        const step = activeTrainingModule.value.steps[currentTrainingStep.value];
        const zones = resolveTrainingZonesAtSpawn();
        const zone = findWaypoint(zones, step.waypointZone);
        
        if (zone && camera) {
          // Project the buoy's world position onto the screen via the live camera.
          // This gives us the ACTUAL position of the gear in the player's view
          // rather than an unreliable 2D compass-bearing guess.
          const buoyWorld = new THREE.Vector3(zone.x, 0, zone.z);
          const ndc = buoyWorld.clone().project(camera);

          // ndc.x and ndc.y are in [-1, 1]; 0,0 is screen centre.
          // Accept if the gear is within 55% of screen width/height from centre
          // AND is in front of the camera (ndc.z < 1).
          const inCenter = ndc.z < 1 && Math.abs(ndc.x) < 0.55 && Math.abs(ndc.y) < 0.55;
          
          if (inCenter) {
            const flash = document.createElement('div');
            flash.style.position = 'fixed';
            flash.style.inset = '0';
            flash.style.background = 'white';
            flash.style.zIndex = '9999';
            flash.style.opacity = '0.8';
            flash.style.transition = 'opacity 0.4s ease-out';
            flash.style.pointerEvents = 'none';
            document.body.appendChild(flash);
            setTimeout(() => { flash.style.opacity = '0'; }, 50);
            setTimeout(() => { document.body.removeChild(flash); }, 450);
            
            // Show gear info popup instead of immediately completing
            showGearInfoPopup(step.waypointZone);
          } else {
            miniGameFeedback.value = "Gear isn't centered";
            setTimeout(() => { miniGameFeedback.value = ''; }, 2000);
          }
        }
        return;
      }

      
      if (activeTrainingModule.value && !activeMiniGame.value) {
        const step = activeTrainingModule.value.steps[currentTrainingStep.value];
        if (step?.requireInteraction) {
          let canInteract = true;
          if (step.waypointZone) {
            const zones = resolveTrainingZonesAtSpawn();
            const zone = findWaypoint(zones, step.waypointZone);
            const stepKey = `${currentTrainingStep.value}:${step.waypointZone}`;
            
            // Increase detection radius for larger boats
            let effectiveZone = zone;
            if (zone) {
              const boatLength = selectedBoatType.value === 'large' ? 180 : (selectedBoatType.value === 'medium' ? 60 : 18);
              const extraRadius = boatLength / 2; // Add half the boat length to radius
              effectiveZone = { ...zone, radius: (zone.radius || 160) + extraRadius };
            }
            
            if (!effectiveZone || (!isBoatInZone(stats.value.boatX, stats.value.boatZ, effectiveZone) && interactionReadyStep.value !== stepKey)) {
              canInteract = false;
            }
          }
          if (canInteract) {
            startMiniGame(step.requireInteraction);
          }
        }
      }
      return;
    }
    // Fishing line deploy / retrieve with F key
    if (event.code === 'KeyF' && !event.repeat) {
      toggleFishingLine();
      return;
    }
    // Trawl net deploy/retrieve with N key (single-key toggle)
    if (event.code === 'KeyN' && !event.repeat) {
      if (trawlNetState.value === 'STOWED') {
        deployTrawlNet();
      } else if (trawlNetState.value === 'ACTIVE') {
        retrieveTrawlNet();
      }
      return;
    }
    // Map toggle with M key
    if (event.code === 'KeyM' && !event.repeat) {
      toggleMapPanel();
      return;
    }
    // Toggle Inventory with I key
    if (event.code === 'KeyI' && !event.repeat) {
      toggleInventory();
      return;
    }
    // Toggle Controls Guide with ? key (Shift + /)
    if (event.code === 'Slash' && event.shiftKey && !event.repeat) {
      toggleControlsGuide();
      return;
    }
    // Rain / clear skies with R key
    if (event.code === 'KeyR' && !event.repeat) {
      toggleStormMode();
      return;
    }
    // Check for movement input while anchor is deployed
    if (isAnchorRigEngaged(boatAnchorRig) || anchor.value.deployed || anchor.value.deploying || anchor.value.retracting) {
      if (event.code === 'KeyW' || event.code === 'KeyS' || event.code === 'KeyA' || event.code === 'KeyD') {
        anchorWarning.value = true;
        setTimeout(() => { anchorWarning.value = false; }, 2000);
        return;
      }
    }
    keyStates[event.code] = true;
    if (event.code === "KeyW" || event.code === "KeyS") {
      isStopping = false;
    }
    if (event.code === "KeyC") {
      toggleCamera();
    }
    const keyEl = document.getElementById(`key${event.code.replace('Key', '')}`);
    if (keyEl) keyEl.classList.add('active');
  });

  // Handle window blur (alt+tab) to reset states
  window.addEventListener('blur', () => {
    altKeyPressed.value = false;
    mouseLookReady = false;
    // Reset all key states to prevent stuck keys
    Object.keys(keyStates).forEach(key => {
      keyStates[key] = false;
    });
  });

  // Handle window focus to ensure proper state
  window.addEventListener('focus', () => {
    syncUiCursor();
  });

  window.addEventListener('dblclick', () => {
    if (activeScreen.value !== 'simulation') return;
    toggleFullscreen();
  });
}

function shouldApplyMouseLook(clientX, clientY) {
  const hit = document.elementFromPoint(clientX, clientY);
  if (!hit) return false;
  if (hit.closest('button, input, select, textarea, a, .simulation-control-panel, .nav-hud-right, .mission-objective-box, .tactical-minimap, .helm-mfd')) {
    return false;
  }
  const canvas = renderer?.domElement;
  if (!canvas) return false;
  if (hit === canvas || canvas.contains(hit)) return true;
  return Boolean(canvasContainer.value?.contains(hit));
}

function disposeMouseLook() {
  if (teardownMouseLook) {
    teardownMouseLook();
    teardownMouseLook = null;
  }
}

function setupMouseLook() {
  if (!renderer?.domElement) return;
  disposeMouseLook();

  const canvas = renderer.domElement;

  const onMouseMove = (event) => {
    if (activeScreen.value !== 'simulation') return;
    if (simulationNeedsLandscape.value) return;
    if (event.type === 'mousemove' && event.sourceCapabilities?.firesTouchEvents) return;
    if (activeCamera.value === 'orbit') return;
    // Disable mouse look when Alt is held
    if (altKeyPressed.value) return;
    if (!shouldApplyMouseLook(event.clientX, event.clientY)) {
      mouseLookReady = false;
      return;
    }

    if (!mouseLookReady) {
      lastMouseLookX = event.clientX;
      lastMouseLookY = event.clientY;
      mouseLookReady = true;
      return;
    }

    const dx = event.clientX - lastMouseLookX;
    const dy = event.clientY - lastMouseLookY;
    lastMouseLookX = event.clientX;
    lastMouseLookY = event.clientY;

    if (dx === 0 && dy === 0) return;

    cameraLookYaw -= dx * MOUSE_LOOK_SENSITIVITY;
    cameraLookPitch -= dy * MOUSE_LOOK_SENSITIVITY;
    cameraLookPitch = THREE.MathUtils.clamp(
      cameraLookPitch,
      -MOUSE_LOOK_PITCH_LIMIT,
      MOUSE_LOOK_PITCH_LIMIT
    );
    cameraLookYaw = THREE.MathUtils.clamp(
      cameraLookYaw,
      -MOUSE_LOOK_YAW_LIMIT,
      MOUSE_LOOK_YAW_LIMIT
    );
  };

  let touchLookPointer = null;
  const onTouchLookStart = (event) => {
    if (event.pointerType !== 'touch' || touchLookPointer !== null) return;
    if (activeScreen.value !== 'simulation' || simulationNeedsLandscape.value || activeCamera.value === 'orbit') return;
    if (!shouldApplyMouseLook(event.clientX, event.clientY)) return;
    touchLookPointer = event.pointerId;
    mouseLookReady = false;
    canvas.setPointerCapture(event.pointerId);
    onMouseMove(event);
  };
  const onTouchLookMove = (event) => {
    if (event.pointerId !== touchLookPointer) return;
    event.preventDefault();
    onMouseMove(event);
  };
  const onTouchLookEnd = (event) => {
    if (event.pointerId !== touchLookPointer) return;
    touchLookPointer = null;
    mouseLookReady = false;
  };
  const resetTouchLook = () => {
    if (touchLookPointer !== null && canvas.hasPointerCapture(touchLookPointer)) canvas.releasePointerCapture(touchLookPointer);
    touchLookPointer = null;
    mouseLookReady = false;
  };
  const onContextMenu = (event) => event.preventDefault();

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('blur', resetTouchLook);
  canvas.addEventListener('pointerdown', onTouchLookStart);
  canvas.addEventListener('pointermove', onTouchLookMove);
  canvas.addEventListener('pointerup', onTouchLookEnd);
  canvas.addEventListener('pointercancel', onTouchLookEnd);
  canvas.addEventListener('lostpointercapture', onTouchLookEnd);
  canvas.addEventListener('contextmenu', onContextMenu);

  teardownMouseLook = () => {
    resetTouchLook();
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('blur', resetTouchLook);
    canvas.removeEventListener('pointerdown', onTouchLookStart);
    canvas.removeEventListener('pointermove', onTouchLookMove);
    canvas.removeEventListener('pointerup', onTouchLookEnd);
    canvas.removeEventListener('pointercancel', onTouchLookEnd);
    canvas.removeEventListener('lostpointercapture', onTouchLookEnd);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}

// --- Three.js Initialization ---
function initThree() {
  try {
    const container = canvasContainer.value;
    if (!container) {
      throw new Error("Canvas container DOM element not found.");
    }
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (rendererError) {
      console.warn('[HelmQuest] High-performance WebGL context failed; retrying with compatible settings.', rendererError);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "default", failIfMajorPerformanceCaveat: false });
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    applyRendererToneMapping(renderer, VISUAL_CONFIG.toneMappingExposure);
    renderer.sortObjects = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Scene
    scene = new THREE.Scene();
    sceneInitialized = true;
    applySceneFog(scene, {
      color: VISUAL_CONFIG.fogColor,
      near: VISUAL_CONFIG.fogNear,
      far: VISUAL_CONFIG.fogFar,
    });

    // 3. Cameras
    camera = new THREE.PerspectiveCamera(62, width / height, 1, OCEAN_MAP_HALF_EXTENT * 4);
    camera.position.set(-18, 24, 82);
    camera.lookAt(SIMULATION_SPAWN.x, SCENE_WATERLINE_Y, SIMULATION_SPAWN.z);

    camera2 = new THREE.PerspectiveCamera(62, width / height, 0.2, OCEAN_MAP_HALF_EXTENT * 4);

    // 4. Lights (Calibrated for high realism)
    ambientLight = new THREE.AmbientLight(0xdbeafe, 0.38);
    scene.add(ambientLight);

    mainLight = new THREE.DirectionalLight(0xfff0dc, 1.08);
    mainLight.position.set(100, 300, -200);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 1000;
    
    const d = 160;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    scene.add(mainLight);

    // 5. Sky & Sun
    sky = new Sky();
    sky.scale.setScalar(100000);
    scene.add(sky);

    sun = new THREE.Vector3();
    applyEnvironmentPreset('day');

    disposePostProcessing();
    try {
      postProcessing = createScenePostProcessing(renderer, scene, camera);
    } catch (err) {
      console.warn('[HelmQuest] Post-processing disabled:', err);
      postProcessing = null;
    }

    const foamSurface = { sampleHeight: (x, z) => ocean?.sampleHeight?.(x, z) ?? 0 };
    boatWakeSystem = createBoatWake(scene, foamSurface);
    bowSpraySystem = createBowSpray(scene, foamSurface);
    initFishingLineSystem();
    initRainWeather();

    const gltfLoader = new GLTFLoader();
    sceneGltfLoader = gltfLoader;

    // 6. Ocean (Three.js Water2)
    loadOceanSimulation(scene, { renderer, fog: true })
      .then((oceanApi) => {
        ocean = oceanApi;
        scene.add(ocean.root);
        // Load external GeoJSON layer (from public/export.geojson)
        try {
          addGeoJSONLayer(scene, '/export.geojson', { color: 0x1e90ff, opacity: 0.45, depth: 0.12, height: SCENE_WATERLINE_Y });
        } catch (err) {
          console.warn('Failed to add GeoJSON layer:', err);
        }
        if (isMenuBackdropScreen()) {
          applyEnvironmentPreset('sunset');
        } else {
          applySimulationWeather();
        }
        onWaterParamChange();
        if (sun) ocean.setSunDirection(sun);
        console.info('[HelmQuest] Ocean water ready');
      })
      .catch((err) => {
        console.error('Ocean load error:', err);
        const fallback = new THREE.Mesh(
          new THREE.PlaneGeometry(OCEAN_MAP_HALF_EXTENT * 2, OCEAN_MAP_HALF_EXTENT * 2),
          new THREE.MeshStandardMaterial({ color: 0x032430, roughness: 0.15, metalness: 0.05 })
        );
        fallback.rotation.x = -Math.PI / 2;
        fallback.receiveShadow = true;
        scene.add(fallback);
      });

    // 7. Orbit Controls
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(SIMULATION_SPAWN.x, SCENE_WATERLINE_Y, SIMULATION_SPAWN.z);
    orbitControls.maxPolarAngle = Math.PI * 0.485;
    orbitControls.minDistance = BOAT_TARGET_LENGTH_METERS * 0.52;
    orbitControls.maxDistance = OCEAN_MAP_HALF_EXTENT * 0.92;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.update();

    // 8. Archipelago from public/assets/tropical_island.glb (terrain only, no sky LOD)
    archipelagoLoadPromise = loadArchipelago(gltfLoader)
      .then((archipelago) => {
        islandGroup = archipelago;
        islandGroup.visible = true;
        scene.add(islandGroup);

        // Shoreline foam overlay is disabled — it sampled the heightmap over open
        // water and caused distant moiré / white mesh artifacts on the horizon.
        if (shorelineSystem) {
          shorelineSystem.dispose();
          scene.remove(shorelineSystem.root);
          shorelineSystem = null;
        }

        syncTerrainVisuals();

        const spawn = updateSimulationSpawn(islandGroup, islandGroup.userData.isProceduralTerrain);
        if (islandGroup.userData?.tileManager) {
          islandGroup.userData.tileManager.forceUpdate(spawn.x, spawn.z);
        }
        if (boatObject) {
          boatObject.position.x = spawn.x;
          boatObject.position.z = spawn.z;
          syncStatsBoatXZ();
        }
        console.info(
          '[HelmQuest] Archipelago ready — spawn',
          spawn.x.toFixed(0),
          spawn.z.toFixed(0),
          islandGroup.userData?.isTiledTerrain ? '(tiled terrain)' : ''
        );
        if (activeScreen.value === 'simulation') {
          syncWorldForSimulation();
        } else {
          rebuildHarborDocks();
          if (boatObject) restoreBoatSimPose();
        }
        return archipelago;
      })
      .catch((err) => {
        console.error('Archipelago load error:', err);
        throw err;
      });

    // 9. Spawn boat: show procedural hull immediately, swap in OBJ when ready
    const attachBoat = (model, modelPath = activeBoatModelFile.value) => {
      if (boatObject?.parent) scene.remove(boatObject);
      boatObject = model;
      finalizeSpawnedBoat(modelPath);
    };

    const spawnProceduralTrawler = () => {
      attachBoat(createCommercialFishingTrawler(), null);
    };

    spawnProceduralTrawler();

    const boatGlbPath = activeBoatModelFile.value;
    if (boatGlbPath) {
      loadBoatModel(boatGlbPath)
        .then((model) => {
          attachBoat(model, boatGlbPath);
        })
        .catch((err) => {
          console.warn(`Boat GLB failed (${boatGlbPath}), keeping procedural:`, err);
        });
    }

    setupMouseLook();
  } catch (e) {
    if (/webgl|context/i.test(e.message || '')) {
      console.warn('[HelmQuest] 3D simulation unavailable; continuing without WebGL.', e);
      renderer = null;
      scene = null;
      sceneInitialized = false;
      return;
    }
    fatalError.value = `${e.message}\n${e.stack || ""}`;
    console.error("Initialization error caught:", e);
  }
}

function disposePostProcessing() {
  postProcessing?.dispose?.();
  postProcessing = null;
}

function renderFrame(activeCam) {
  if (!renderer || !scene || !activeCam) return;
  if (typeof postProcessing?.render === 'function') {
    postProcessing.setCamera(activeCam);
    postProcessing.render();
    return;
  }
  renderer.render(scene, activeCam);
}

// --- Animation Loop ---
let lastVisualFrameAt = 0;
function animate() {
  try {
    animationFrameId = requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;

    animationFrameCounter += 1;
    const delta = 1 / 60;
    const menuBackdrop = isMenuBackdropScreen();
    const nowMs = performance.now();
    const visualDelta = lastVisualFrameAt ? Math.min(0.1, (nowMs - lastVisualFrameAt) / 1000) : delta;
    lastVisualFrameAt = nowMs;
    updateSkyClouds(sky, visualDelta, wind.value.speed);
    const shouldRefreshTactical = activeScreen.value === 'simulation' && nowMs - lastTacticalUpdateAt >= SIM_TACTICAL_INTERVAL_MS;
    const shouldRefreshTraining = activeScreen.value === 'simulation' && nowMs - lastTrainingUpdateAt >= SIM_TRAINING_INTERVAL_MS;
    const shouldRefreshHud = activeScreen.value === 'simulation' && nowMs - lastHudUpdateAt >= SIM_HUD_INTERVAL_MS;
    const shouldRefreshWaypoints = activeScreen.value === 'simulation' && nowMs - lastWaypointUpdateAt >= SIM_WAYPOINT_INTERVAL_MS;

    if (menuBackdrop) {
      updateLandingCinematic(visualDelta);
      if (ocean) ocean.update(visualDelta, camera.position);
      updateBigBoatLightPools(boatObject, getWaterSurfaceY);
      updateTerrainTiles();
      if (boatObject && boatWakeSystem) {
        boatWakeSystem.update(boatObject, 2.8, visualDelta);
        bowSpraySystem?.update(boatObject, 2.8, visualDelta);
      }
      renderFrame(camera);
      return;
    }

    // Advance the water clock before sampling that same surface for floating objects.
    if (ocean) ocean.update(visualDelta, activeCamera.value === 'helm' ? camera2.position : camera.position);
    // Update simulation
    updateBoatPhysics(visualDelta);
    updateBigBoatLightPools(boatObject, getWaterSurfaceY);
    
    // Update performance tracking system
    if (performanceManager.isActive && boatObject && simulationRunning.value) {
      performanceManager.update({
        boatPosition: { x: stats.value.boatX, z: stats.value.boatZ },
        boatHeading: stats.value.rotationDeg,
        boatSpeed: stats.value.speedKnots,
        targetWaypoint: activeTrainingModule.value?.steps?.[currentTrainingStep.value]?.waypointZone
      });
    }
    
    // Track course deviation for Course Accuracy metric
    if (activeTrainingModule.value && boatObject && trainingRunMetrics.value && simulationRunning.value && !trainingRunFinished.value) {
      const currentStep = activeTrainingModule.value.steps[currentTrainingStep.value];
      if (currentStep?.waypointZone) {
        // Calculate cross-track error (perpendicular distance from ideal route)
        const deviation = calculateCrossTrackDeviation(
          stats.value.boatX,
          stats.value.boatZ,
          currentStep.waypointZone
        );
        
        // Track deviation every ~1 second to avoid overwhelming the array
        if (!window._lastDeviationTrack || (nowMs - window._lastDeviationTrack) > 1000) {
          trackCourseDeviation(trainingRunMetrics.value, deviation);
          window._lastDeviationTrack = nowMs;
        }
      }
    }
    
    // Update camera focal positions
    updateCameras();

    if (boatObject) updateTerrainTiles();

    if (boatObject && boatWakeSystem) {
      const speedKn = stats.value.speedKnots;
      boatWakeSystem.update(boatObject, speedKn, visualDelta);
      bowSpraySystem?.update(boatObject, speedKn, visualDelta);
    }

    if (fishingLineSystem) {
      fishingLineSystem.update(simulationRunning.value ? visualDelta : 0, performance.now() * 0.001);
    }

    if (trawlNetMesh && boatObject && trawlNetState.value === 'ACTIVE') {
      updateTrawlNetPosition(trawlNetMesh, boatObject, 1, performance.now() * .001,
        getWaterSurfaceY(boatObject.position.x, boatObject.position.z));
    }

    if (fishingSpotMarkers && boatObject) {
      // Always show fishing spots in both Free Roam and Mission Simulation
      const showSpots = true;  // Changed: Always show fishing spots
      fishingSpotMarkers.group.visible = showSpots;
      if (showSpots) {
        fishingSpotMarkers.update(
          boatObject.position.x,
          boatObject.position.z,
          performance.now() * 0.001
        );
      }
    }

    rainWeatherSystem?.update(visualDelta);

    if (boatAnchorRig) {
      const anchorMilestone = updateBoatAnchorRig(boatAnchorRig, simulationRunning.value ? visualDelta : 0);
      if (anchorMilestone === 'deployed') {
        anchor.value.deployed = true;
        anchor.value.deploying = false;
        anchor.value.chainLength = anchor.value.maxChainLength;
        if (boatObject) anchor.value.position.copy(boatObject.position);
        
        console.log('[ANCHOR] === ANCHOR DEPLOYED ===');
        
        // Track docking attempt if in training
        if (activeTrainingModule.value) {
          const berth = getActiveHarborDockBerth();
          const isInBerth = berth !== null;
          const distanceFromCenter = berth ? berth.distance : 50;
          trackDockingAttempt(trainingRunMetrics.value, isInBerth, distanceFromCenter);
          checkTrainingStep();
          
          // Take Quiz button will appear automatically (no need to check database here)
          console.log('[ANCHOR] Take Quiz button should be visible');
        }
      } else if (anchorMilestone === 'stowed') {
        anchor.value.deployed = false;
        anchor.value.retracting = false;
        anchor.value.chainLength = 0;
        if (activeTrainingModule.value) checkTrainingStep();
        
        // Reset states when anchor is raised
        postDockingQuizTriggered.value = false;
        missionReadyToReport.value = false;
        showPostDockingQuiz.value = false;
        lastQuizCheckTime = 0;
      }
    }

    if (activeTrainingModule.value && activeScreen.value === 'simulation') {
      trainingElapsedTick.value = performance.now();
      if (shouldRefreshTraining) {
        lastTrainingUpdateAt = nowMs;
        if (activeTrainingModule.value.id === 'map-compass') {
          compassCoachTick.value = performance.now();
          const step = activeTrainingModule.value.steps[currentTrainingStep.value];
          if (step) {
            updateHeadingHoldState(step, stats.value, trainingHeadingHold.value);
          }
        }
      }
    }

    if (waypointMarkerGroup && activeTrainingModule.value) {
      updateBuoySignalLights(waypointMarkerGroup, nowMs * 0.001, environmentPreset !== 'day');
    }
    if (waypointMarkerGroup && activeTrainingModule.value && shouldRefreshWaypoints) {
      lastWaypointUpdateAt = nowMs;
      const activeCam = activeCamera.value === 'helm' ? camera2 : camera;
      updateWaypointMarkerDistances(
        waypointMarkerGroup,
        stats.value.boatX,
        stats.value.boatZ,
        activeCam,
        resolveTrainingZonesAtSpawn()
      );
      // Make buoys float and bob with the waves for a realistic look
      updateBuoyFloating(
        waypointMarkerGroup,
        performance.now() * 0.001,
        physics.value.waveAmplitude,
        physics.value.waveFrequency,
        (x, z) => ocean?.sampleHeight?.(x, z) ?? 0
      );
    }
    
    // Hide both the berth fill and its border throughout the simulation.
    if (harborDockGroup && boatObject) {
      hideBerthZoneVisual(harborDockGroup);
    }

    const simChartSnapshot =
      activeScreen.value === 'simulation' && shouldRefreshTactical ? getTacticalChartSnapshot() : null;
    if (activeScreen.value === 'simulation' && shouldRefreshTactical) {
      lastTacticalUpdateAt = nowMs;
      updateTacticalMinimap();
    }

    if (activeCamera.value === 'helm') {
      if (!helmHud) ensureHelmHud();
      if (helmHud && simChartSnapshot && shouldRefreshHud) {
        lastHudUpdateAt = nowMs;
        updateHelmInstrumentsHud(
          helmHud,
          performance.now() * 0.001,
          stats.value.rotationDeg,
          getTrainingNavOverlay(),
          simChartSnapshot
        );
      }
      if (helmCockpit) {
        updateHelmCockpit(helmCockpit, speedRot / 60, visualDelta, keyStates);
      }
    }

    const activeCam =
      activeCamera.value === 'helm' ? camera2 : camera;

    if (activeCamera.value === 'orbit' && orbitControls) {
      orbitControls.update();
    }

    renderFrame(activeCam);
  } catch (e) {
    fatalError.value = `Animation frame crashed:\n${e.message}\n${e.stack || ""}`;
    console.error("Frame render crashed:", e);
    cancelAnimationFrame(animationFrameId);
  }
}

// Window resizing
function onWindowResize() {
  updateCompassStripViewportWidth();
  if (!renderer || !camera || !camera2) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  camera2.aspect = w / h;
  camera2.updateProjectionMatrix();

  renderer.setSize(w, h);
  postProcessing?.resize(w, h);
}

// Global Exception Handlers
window.addEventListener("error", (e) => {
  fatalError.value = `Runtime Error: ${e.message}\nLine ${e.lineno}:${e.colno} in ${e.filename}\nStack: ${e.error?.stack || ''}`;
});

window.addEventListener("unhandledrejection", (e) => {
  fatalError.value = `Unhandled Rejection: ${e.reason}`;
});

// --- Lifecycle Hooks ---
watch(simulationNeedsLandscape, (needsLandscape) => {
  if (activeScreen.value !== 'simulation') return;
  simulationRunning.value = !needsLandscape;
  Object.keys(keyStates).forEach(key => { keyStates[key] = false; });
  syncUiCursor();
  nextTick(onWindowResize);
});

watch(activeScreen, (screen, previousScreen) => {
  if (previousScreen === 'simulation' && screen !== 'simulation') {
    window.screen.orientation?.unlock?.();
    if (document.fullscreenElement === appRoot.value) document.exitFullscreen?.().catch(() => {});
  }
  if (isMenuBackdropScreen(screen)) {
    applyEnvironmentPreset('sunset');
    landingCinematicTime = 0;
    landingBoatPoseActive = false;
    if (camera) {
      camera.fov = LANDING_CAMERA_FOV;
      camera.updateProjectionMatrix();
    }
  } else {
    if (camera) {
      camera.fov = DEFAULT_CAMERA_FOV;
      camera.updateProjectionMatrix();
    }
    if (screen === 'simulation') {
      syncWorldForSimulation();
    } else {
      applyEnvironmentPreset('day');
      landingBoatPoseActive = false;
      if (islandGroup) islandGroup.visible = true;
    }
  }

  syncUiCursor(screen);

  if (screen === 'dashboard' && userRole.value === 'instructor') {
    refreshInstructorProgress();
  }

  if (screen === 'dashboard' && userRole.value === 'student') {
    progressData.value = loadProgress();
    // Sync missions from Firestore to remove deleted missions from localStorage
    loadMissionDatesFromFirestore();
    // Fetch training records from Firestore
    fetchStudentTrainingRecords();
  }

  if (screen === 'simulation') {
    resetTacticalChartCtx();
    requestAnimationFrame(() => {
      updateCompassStripViewportWidth();
      updateTacticalMinimap();
    });
  }
  syncHelmRailingsVisibility();
}, { immediate: true });

watch(missionCompleteModal, () => {
  syncUiCursor();
});

watch(instructorReviewModal, () => {
  syncUiCursor();
});

watch(exitConfirmVisible, () => {
  syncUiCursor();
});

watch(exitFinalConfirmVisible, () => {
  syncUiCursor();
});

watch(controlsGuideVisible, () => {
  syncUiCursor();
});

watch(showMenuSettings, () => {
  syncUiCursor();
});

watch(missionEditorModal, () => {
  syncUiCursor();
});

watch(quizEditorModal, () => {
  syncUiCursor();
});

watch(quizManagerModal, () => {
  syncUiCursor();
});

watch(inventoryVisible, () => {
  syncUiCursor();
});

// Watch for interaction readiness to show buoy interaction modal
watch(graphicsQuality, (newQuality) => {
  if (!renderer) return;
  const deviceRatio = window.devicePixelRatio || 1;
  switch (newQuality) {
    case 'low':
      renderer.setPixelRatio(Math.min(deviceRatio, 1.2));
      break;
    case 'medium':
      renderer.setPixelRatio(Math.min(deviceRatio, 1.5));
      break;
    case 'high':
      renderer.setPixelRatio(Math.min(deviceRatio, 1.8));
      break;
    case 'ultra':
      renderer.setPixelRatio(Math.min(deviceRatio, 2));
      break;
  }
});

watch(waterQuality, (newQuality) => {
  if (!ocean) return;
  switch (newQuality) {
    case 'low':
      ocean.setOpacityScale(0.88);
      break;
    case 'medium':
      ocean.setOpacityScale(1);
      break;
    case 'high':
      ocean.setOpacityScale(1.05);
      break;
  }
});

watch(shadowQuality, (newQuality) => {
  if (!renderer) return;
  switch (newQuality) {
    case 'off':
      renderer.shadowMap.enabled = false;
      break;
    case 'low':
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.BasicShadowMap;
      break;
    case 'medium':
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      break;
    case 'high':
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      break;
  }
});

watch(uiScale, (newScale) => {
  document.documentElement.style.fontSize = `${parseFloat(newScale) * 16}px`;
});

watch(showFPS, (newShow) => {
  const fpsElement = document.getElementById('fps-counter');
  if (newShow && !fpsElement) {
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fps-counter';
    fpsDiv.style.cssText = 'position:fixed;top:10px;left:228px;background:transparent;color:#fff;padding:8px 12px;border-radius:4px;font-family:monospace;z-index:10000;text-shadow:1px 1px 2px rgba(0,0,0,0.8);';
    document.body.appendChild(fpsDiv);
  } else if (!newShow && fpsElement) {
    fpsElement.remove();
  }
});

// Clean up old localStorage quizzes with temp IDs and sync from Firestore
async function cleanupAndSyncQuizzes() {
  console.log('[CLEANUP] Starting quiz cleanup and sync...');
  
  if (!progressData.value.quizzes) {
    progressData.value.quizzes = [];
  }
  
  // Remove all quizzes with localStorage-style IDs (quiz-xxxxx-xxxxx)
  const before = progressData.value.quizzes.length;
  progressData.value.quizzes = progressData.value.quizzes.filter(q => {
    const isLocalStorageId = q.id && q.id.startsWith('quiz-') && q.id.includes('-');
    if (isLocalStorageId) {
      console.log('[CLEANUP] Removing old localStorage quiz:', q.id, q.title);
    }
    return !isLocalStorageId;
  });
  
  // Also clean up assignments for removed quizzes
  if (progressData.value.quizAssignments) {
    progressData.value.quizAssignments = progressData.value.quizAssignments.filter(a => {
      return progressData.value.quizzes.some(q => q.id === a.quizId);
    });
  }
  
  const after = progressData.value.quizzes.length;
  console.log(`[CLEANUP] Removed ${before - after} old localStorage quizzes`);
  
  saveProgress(progressData.value);
  
  // TODO: Load quizzes from Firestore if needed
  // This would require a backend endpoint to list all quizzes
}

onMounted(() => {
  applySavedLevelCreator();
  
  // Make performance manager globally accessible for debugging
  window.__performanceManager = performanceManager;
  console.log('[App] Performance manager accessible via window.__performanceManager');
  
  // Load retake setting from localStorage
  try {
    const stored = localStorage.getItem('helmquest_retake_allowed');
    if (stored !== null) {
      isGearQuizRetakeAllowed.value = JSON.parse(stored);
    }
  } catch (err) {
    console.warn('[HelmQuest] Failed to load retake setting:', err);
  }
  
  // Clean up old localStorage quizzes with temp IDs and reload from Firestore
  cleanupAndSyncQuizzes();
  
  // Load mission dates from Firestore
  loadMissionDatesFromFirestore();
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  disposePostProcessing();
  initThree();
  setupInputs();
  syncUiCursor();
  animate();
  clockIntervalId = window.setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);

  window.addEventListener('resize', onWindowResize);
  simulationTouchMedia.addEventListener('change', onSimulationTouchChange);
  simulationPortraitMedia.addEventListener('change', onSimulationPortraitChange);
  window.addEventListener('keydown', onLandingKeyDown);
  requestAnimationFrame(() => updateCompassStripViewportWidth());
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  disposePostProcessing();
  if (clockIntervalId) window.clearInterval(clockIntervalId);
  cancelExitHold();
  if (islandWarningTimerId) {
    window.clearTimeout(islandWarningTimerId);
    islandWarningTimerId = null;
  }
  collisionWarning.value = '';
  disposeMouseLook();
  window.removeEventListener('keydown', onLandingKeyDown);
  window.removeEventListener('resize', onWindowResize);
  simulationTouchMedia.removeEventListener('change', onSimulationTouchChange);
  simulationPortraitMedia.removeEventListener('change', onSimulationPortraitChange);
  ocean?.dispose?.();
  rainWeatherSystem?.dispose?.();
  rainWeatherSystem = null;
  disposeHelmHud();
  disposeHelmRadarDisplay();
  if (helmCockpit && boatObject) {
    boatObject.remove(helmCockpit.group);
    disposeHelmCockpit(helmCockpit);
    helmCockpit = null;
  }
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.simulation-container {
  position: relative;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden !important;
  color: #f8fafc;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: #020617;
}

.simulation-container:fullscreen {
  width: 100%;
  height: 100%;
}

.canvas-container {
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden !important;
}

.canvas-container.canvas-pass-through,
.canvas-container.canvas-pass-through canvas {
  pointer-events: none !important;
  cursor: default !important;
}

.scene-overlay {
  position: absolute;
  inset: 0;
  z-index: 85000;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* Exit confirmation modal styles */
.exit-confirm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.6);
  z-index: 200000;
  padding: 20px;
}
.exit-confirm-card {
  width: min(480px, 94%);
  max-width: 480px;
  padding: 20px;
  text-align: center;
  border-radius: 12px;
}
.exit-confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.scene-overlay.game-landing {
  padding: 0;
}

/* Map overlay styles */
.map-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.85);
  z-index: 250000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.map-card {
  width: min(1100px, 96%);
  height: min(820px, 92%);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.map-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
.map-title {
  margin: 12px 18px 0 18px;
  color: #e6eef8;
}
.map-canvas {
  flex: 1 1 auto;
  width: 100%;
  height: calc(100% - 48px);
  display: block;
}

.glass-card {
  background: rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px);
}

/* —— Training modules page —— */
.training-overlay {
  background: #0b111b;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 20px 48px;
  overflow: auto;
  cursor: default;
}

.training-shell {
  width: min(1180px, 100%);
  display: grid;
  gap: 24px;
}

.training-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.training-eyebrow {
  margin: 0 0 6px;
  color: #60a5fa;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.training-page-header h2 {
  margin: 0 0 8px;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.6rem, 4vw, 2rem);
  font-weight: 700;
  color: #f8fafc;
}

.training-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
  max-width: 520px;
}

.training-back-btn {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  font-size: 0.88rem;
  padding: 10px 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.training-back-btn:hover {
  border-color: rgba(148, 163, 184, 0.6);
  background: rgba(30, 41, 59, 0.5);
}

.training-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.training-card {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(51, 65, 85, 0.65);
  border-radius: 14px;
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.training-card--completed {
  border-color: rgba(74, 222, 128, 0.35);
  background: rgba(15, 40, 30, 0.5);
}

.training-card--locked {
  border-color: rgba(248, 113, 113, 0.35);
  opacity: 0.92;
}

.training-level-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #7dd3fc;
}

.training-lock-notice {
  margin: 0;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.35);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  font-size: 0.78rem;
  line-height: 1.35;
}

.training-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.training-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.training-category,
.training-difficulty {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.training-category {
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(51, 65, 85, 0.8);
}

.training-difficulty.diff-beginner {
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.25);
}

.training-difficulty.diff-intermediate {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.training-difficulty.diff-advanced {
  color: #f472b6;
  background: rgba(244, 114, 182, 0.12);
  border: 1px solid rgba(244, 114, 182, 0.25);
}

.training-completed-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.35);
  white-space: nowrap;
}

.training-progress-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #93c5fd;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  white-space: nowrap;
}

.hub-mission-list {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}

.hub-mission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(11, 17, 27, 0.75);
  border: 1px solid rgba(51, 65, 85, 0.55);
}

.hub-mission-row--passed {
  border-color: rgba(74, 222, 128, 0.3);
}

.hub-mission-row--failed {
  border-color: rgba(248, 113, 113, 0.3);
}

.hub-mission-row--locked {
  opacity: 0.72;
  border-color: rgba(148, 163, 184, 0.35);
}

.hub-mission-row--locked .hub-mission-start {
  cursor: not-allowed;
  opacity: 0.65;
}

.hub-mission-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  min-width: 0;
}

.hub-mission-code {
  font-size: 0.72rem;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.04em;
}

.hub-mission-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #e2e8f0;
}

.hub-mission-pass {
  font-size: 0.72rem;
  color: #64748b;
}

.hub-mission-result {
  font-size: 0.72rem;
  font-weight: 700;
}

.hub-mission-result--pass {
  color: #4ade80;
}

.hub-mission-result--fail {
  color: #f87171;
}

.hub-mission-start {
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transition: background 0.2s ease;
}

.hub-mission-start:hover {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.hub-mission-row--passed .hub-mission-start {
  background: transparent;
  border: 1px solid rgba(74, 222, 128, 0.45);
  color: #86efac;
}

.hub-mission-row--passed .hub-mission-start:hover {
  background: rgba(34, 197, 94, 0.12);
}

.hub-mission-row--failed .hub-mission-start {
  background: transparent;
  border: 1px solid rgba(248, 113, 113, 0.45);
  color: #fca5a5;
}

.hub-mission-row--failed .hub-mission-start:hover {
  background: rgba(239, 68, 68, 0.12);
}

.hub-mission-start:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: rgba(51, 65, 85, 0.5);
  border-color: rgba(71, 85, 105, 0.6);
  color: #94a3b8;
}

.hub-mission-start:disabled:hover {
  background: rgba(51, 65, 85, 0.5);
}

.training-card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.3;
}

.training-mission-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.training-mission-chip {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.training-result-pill {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
}

.training-result-pill--pass {
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.training-result-pill--fail {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.training-card-desc {
  margin: 0;
  color: #94a3b8;
  font-size: 0.86rem;
  line-height: 1.45;
}

/* Mission Schedule Display */
.mission-schedule {
  margin: 12px 0 8px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
}

.mission-schedule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.8rem;
}

.mission-schedule-item:last-child {
  margin-bottom: 0;
}

.mission-schedule-label {
  color: #94a3b8;
  font-weight: 600;
  min-width: 70px;
}

.mission-schedule-value {
  color: #cbd5e1;
  font-weight: 500;
}

.mission-schedule-status {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(100, 116, 139, 0.2);
  text-align: center;
}

.mission-status-not_open {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 6px;
  color: #fbbf24;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.mission-status-closed {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 6px;
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.training-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
}

.training-duration {
  color: #cbd5e1;
}

.training-reward {
  color: #93c5fd;
  font-weight: 600;
}

.training-objectives {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  background: rgba(11, 17, 27, 0.65);
  border: 1px solid rgba(51, 65, 85, 0.45);
}

.training-objectives h4 {
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.training-objectives ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.training-objectives li {
  color: #cbd5e1;
  font-size: 0.8rem;
  line-height: 1.35;
}

.training-start-btn {
  margin-top: 4px;
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transition: background 0.2s ease;
}

.training-start-btn:hover {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.training-card--completed .training-start-btn {
  background: transparent;
  border: 1px solid rgba(74, 222, 128, 0.45);
  color: #86efac;
}

.training-card--completed .training-start-btn:hover {
  background: rgba(34, 197, 94, 0.12);
}

@media (max-width: 900px) {
  .training-grid {
    grid-template-columns: 1fr;
  }

  .training-page-header {
    flex-direction: column;
    align-items: stretch;
  }
}

.cinematic-loading {
  position: absolute;
  inset: 0;
  z-index: 92000;
  display: grid;
  place-content: center;
  text-align: center;
  gap: 8px;
  background: rgba(2, 6, 23, 0.88);
}

.cinematic-loading h2 {
  margin: 0;
  color: #e2e8f0;
  font-family: 'Outfit', sans-serif;
  letter-spacing: 0.8px;
}

.cinematic-loading p {
  margin: 0;
  color: #93c5fd;
  font-size: 0.85rem;
}

.cinematic-glow {
  width: 200px;
  height: 4px;
  margin: 0 auto 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #38bdf8, transparent);
  animation: cinematicPulse 1.25s infinite linear;
}

@keyframes cinematicPulse {
  0% { transform: translateX(-35px); opacity: 0.5; }
  50% { transform: translateX(35px); opacity: 1; }
  100% { transform: translateX(-35px); opacity: 0.5; }
}

.auth-overlay {
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  overflow: hidden;
  height: 100vh;
}

.dashboard-overlay {
  background: linear-gradient(135deg, 
    #0a1628 0%,
    #0d1b2a 25%,
    #1b263b 50%,
    #0d1b2a 75%,
    #0a1628 100%
  );
  background-size: 400% 400%;
  animation: oceanWave 15s ease infinite;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 0 48px;
  overflow: auto;
  cursor: default;
}

@keyframes oceanWave {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Force browser cache clear - Admin dashboard with ocean theme */

.dashboard-overlay button,
.dashboard-overlay a {
  cursor: pointer;
}

.missions-hub,
.missions-hub *,
.instructor-console,
.instructor-console * {
  cursor: inherit;
}

.missions-hub button {
  cursor: pointer;
}

.missions-overlay {
  background: radial-gradient(circle at 20% 20%, rgba(30, 58, 138, 0.30), rgba(2, 6, 23, 0.85));
}

/* —— Game landing (cinematic title screen) —— */
.game-landing {
  padding: 0;
  overflow: hidden;
  background: transparent;
  cursor: pointer;
}

.cinematic-letterbox {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 4;
  height: clamp(28px, 7vh, 72px);
  background: linear-gradient(180deg, #02040a 0%, #040810 100%);
  pointer-events: none;
}

.cinematic-letterbox--top {
  top: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65);
}

.cinematic-letterbox--bottom {
  bottom: 0;
  background: linear-gradient(0deg, #02040a 0%, #040810 100%);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.65);
}

.game-landing-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 90% 55% at 72% 18%, rgba(255, 120, 50, 0.28) 0%, transparent 58%),
    radial-gradient(ellipse 70% 45% at 18% 82%, rgba(40, 60, 140, 0.22) 0%, transparent 55%),
    linear-gradient(
      180deg,
      rgba(48, 22, 68, 0.58) 0%,
      rgba(24, 18, 48, 0.28) 38%,
      rgba(8, 14, 32, 0.06) 58%,
      rgba(4, 8, 20, 0.32) 100%
    );
  pointer-events: none;
  animation: sunsetOverlayShift 16s ease-in-out infinite alternate;
}

.game-landing-light-leak {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 40% 30% at 78% 22%, rgba(255, 160, 80, 0.22) 0%, transparent 70%);
  pointer-events: none;
  animation: lightLeakDrift 12s ease-in-out infinite alternate;
}

.game-landing-vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 62% 50% at 50% 44%, rgba(4, 4, 14, 0.55) 0%, transparent 72%),
    linear-gradient(90deg, rgba(6, 4, 16, 0.42) 0%, transparent 38%, transparent 62%, rgba(6, 4, 16, 0.28) 100%),
    linear-gradient(0deg, rgba(255, 100, 40, 0.16) 0%, transparent 42%);
  pointer-events: none;
}

.game-landing-grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.045;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  mix-blend-mode: overlay;
  animation: filmGrain 0.45s steps(4) infinite;
}

.game-landing-scanline {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  opacity: 0.35;
}

@keyframes sunsetOverlayShift {
  0% { opacity: 0.88; filter: hue-rotate(0deg); }
  100% { opacity: 1; filter: hue-rotate(6deg); }
}

@keyframes lightLeakDrift {
  0% { transform: translate(-2%, -1%) scale(1); opacity: 0.7; }
  100% { transform: translate(3%, 2%) scale(1.08); opacity: 1; }
}

@keyframes filmGrain {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-2%, 1%); }
  50% { transform: translate(1%, -2%); }
  75% { transform: translate(2%, 2%); }
  100% { transform: translate(0, 0); }
}

.game-landing-center {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(20px, 4vh, 36px);
  width: 100%;
  height: 100%;
  padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  text-align: center;
}

.game-landing-splash {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  width: min(920px, 92vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: clamp(8px, 1.8vh, 16px);
  pointer-events: none;
}

.game-landing-eyebrow {
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(0.72rem, 2vw, 0.88rem);
  font-weight: 600;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: rgba(255, 200, 140, 0.78);
  text-shadow: 0 0 20px rgba(255, 140, 60, 0.35);
}

.game-landing-divider {
  width: min(200px, 42vw);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 180, 100, 0.65), transparent);
  box-shadow: 0 0 12px rgba(255, 140, 60, 0.4);
}

.game-landing-features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 18px;
  margin: clamp(4px, 1vh, 10px) 0 0;
  padding: 0;
  list-style: none;
}

.game-landing-features li {
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(0.78rem, 2vw, 0.92rem);
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.72);
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(8, 12, 28, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
}

.landing-reveal {
  opacity: 0;
  animation: landingReveal 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.landing-reveal--1 { animation-delay: 0.15s; }
.landing-reveal--2 { animation-delay: 0.35s; }
.landing-reveal--3 { animation-delay: 0.55s; }
.landing-reveal--4 { animation-delay: 0.72s; }
.landing-reveal--5 { animation-delay: 0.9s; }
.landing-reveal--6 {
  animation-delay: 1.15s;
  animation-name: landingCtaReveal;
}

.landing-reveal--7 {
  animation-delay: 1.35s;
  animation-name: landingPressReveal;
}

@keyframes landingReveal {
  from {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.landing-reveal--2 {
  animation-name: landingTitleReveal;
}

@keyframes landingTitleReveal {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.94);
    filter: blur(8px);
    letter-spacing: 0.2em;
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
    letter-spacing: 0.06em;
  }
}

@keyframes landingCtaReveal {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(18px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    filter: blur(0);
  }
}

@keyframes landingPressReveal {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 0.62;
    transform: translateX(-50%) translateY(0);
  }
}

.landing-cta {
  position: absolute;
  left: 50%;
  bottom: max(88px, calc(env(safe-area-inset-bottom) + 72px));
  transform: translateX(-50%);
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: min(240px, 72vw);
  padding: 16px 36px;
  border: 1px solid rgba(255, 180, 100, 0.45);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 120, 40, 0.22) 0%, rgba(180, 60, 20, 0.18) 100%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  cursor: pointer;
  overflow: hidden;
  box-shadow:
    0 0 32px rgba(255, 120, 40, 0.25),
    0 8px 28px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 220, 180, 0.2);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.landing-cta:hover {
  transform: translateX(-50%) translateY(-2px) scale(1.03);
  border-color: rgba(255, 200, 120, 0.7);
  box-shadow:
    0 0 48px rgba(255, 140, 60, 0.4),
    0 12px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 220, 180, 0.3);
}

.landing-cta:active {
  transform: translateX(-50%) scale(0.98);
}

.landing-cta-glow {
  position: absolute;
  inset: -40%;
  background: conic-gradient(from 0deg, transparent, rgba(255, 180, 80, 0.35), transparent 40%);
  animation: ctaGlowSpin 4s linear infinite;
  pointer-events: none;
}

.landing-cta-label {
  position: relative;
  z-index: 1;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(1rem, 2.8vw, 1.15rem);
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #fff8f0;
  text-shadow: 0 0 20px rgba(255, 150, 80, 0.55);
}

@keyframes ctaGlowSpin {
  to { transform: rotate(360deg); }
}

.press-any-key {
  position: absolute;
  left: 50%;
  bottom: max(36px, calc(env(safe-area-inset-bottom) + 22px));
  transform: translateX(-50%);
  z-index: 5;
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(0.78rem, 2vw, 0.92rem);
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 235, 210, 0.62);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85);
  animation: pressKeyPulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pressKeyPulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.85; }
}

.main-menu-screen .main-menu-center {
  gap: clamp(16px, 3vh, 28px);
}

.main-menu-label {
  margin: 0 0 4px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.9);
}

@keyframes landingFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.game-title {
  margin: 0;
  font-family: 'Bebas Neue', 'Outfit', sans-serif;
  font-size: clamp(4.2rem, 13vw, 8.2rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow:
    0 4px 28px rgba(0, 0, 0, 0.7),
    0 0 64px rgba(100, 180, 255, 0.32),
    0 0 120px rgba(40, 120, 255, 0.15);
  animation: titleFloat 7s ease-in-out infinite alternate;
}

.game-title-helm {
  color: #ffffff;
}

.game-title-quest {
  color: #6fb5ff;
  text-shadow:
    0 4px 28px rgba(0, 0, 0, 0.7),
    0 0 48px rgba(100, 180, 255, 0.45),
    0 0 80px rgba(40, 120, 255, 0.2);
}

.game-hero-tagline {
  margin: 0;
  font-family: 'Rajdhani', sans-serif;
  font-size: clamp(0.95rem, 2.8vw, 1.2rem);
  font-weight: 600;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: rgba(255, 248, 240, 0.88);
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.75), 0 0 24px rgba(80, 150, 255, 0.2);
  animation: taglineGlow 4.5s ease-in-out infinite alternate;
}

@keyframes taglineGlow {
  0% { opacity: 0.6; letter-spacing: 0.38em; }
  100% { opacity: 1; letter-spacing: 0.44em; }
}

@keyframes titleFloat {
  0% { transform: translateY(0); }
  100% { transform: translateY(-8px); }
}

.game-landing-splash .game-title {
  max-width: 100%;
  animation:
    landingTitleReveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.35s forwards,
    titleFloat 7s ease-in-out 1.6s infinite alternate;
}

.game-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(280px, 88vw);
}

.game-menu-btn {
  width: 100%;
  padding: 14px 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #f1f5f9;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.game-menu-btn:hover {
  background: rgba(30, 41, 59, 0.65);
  border-color: rgba(255, 255, 255, 0.22);
}

.game-menu-btn-primary {
  padding: 16px 20px;
  border: none;
  background: #2563eb;
  font-size: 1.05rem;
  letter-spacing: 0.18em;
}

.game-menu-btn-primary:hover {
  background: #3b82f6;
  transform: translateY(-1px);
}

.game-menu-btn-ghost {
  background: transparent;
  border-color: transparent;
  color: rgba(248, 250, 252, 0.45);
  font-size: 0.9rem;
  letter-spacing: 0.12em;
  padding-top: 8px;
}

.game-menu-btn-ghost:hover {
  background: transparent;
  color: rgba(248, 250, 252, 0.75);
  border-color: transparent;
}

@media (max-height: 560px) {
  .game-landing-center {
    gap: 12px;
  }

  .game-title {
    font-size: clamp(2.5rem, 12vw, 4rem);
  }

  .game-menu-btn {
    padding: 10px 16px;
  }

  .game-menu-btn-primary {
    padding: 12px 16px;
  }
}

.landing-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.auth-shell {
  width: min(420px, 90vw);
  max-height: 80vh;
  overflow-y: auto;
  display: grid;
  gap: 0;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(25px);
}

.auth-icon-container {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.auth-icon {
  font-size: 48px;
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 12px;
  filter: drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3));
}

.auth-eyebrow {
  margin: 0 0 10px;
  color: #38bdf8;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.auth-brand {
  margin: 0 0 6px;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.5rem, 5vw, 1.9rem);
  font-weight: 700;
  line-height: 1.05;
  color: #ffffff;
  letter-spacing: -0.02em;
  text-align: center;
}

.auth-tagline {
  margin: 0 0 24px;
  color: #94a3b8;
  font-size: 0.72rem;
  line-height: 1.45;
  text-align: center;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
}

.auth-form {
  display: grid;
  gap: 14px;
}

.auth-field {
  display: grid;
  gap: 7px;
}

.auth-field span {
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  font-family: 'Outfit', sans-serif;
}

.input-wrapper,
.password-input-wrapper {
  position: relative;
  width: 100%;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  opacity: 0.5;
  pointer-events: none;
}

.input-wrapper .auth-input,
.password-input-wrapper .auth-input {
  padding-left: 42px;
}

.auth-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  padding: 11px 12px;
  background: rgba(0, 0, 0, 0.4);
  color: #ffffff;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: 'Outfit', sans-serif;
}

/* Special styling for select dropdowns */
.auth-input select,
select.auth-input {
  cursor: pointer;
  background: rgba(0, 0, 0, 0.6);
  padding-right: 15px;
}

.auth-input select:hover,
select.auth-input:hover {
  border-color: rgba(59, 130, 246, 0.3);
  background-color: rgba(0, 0, 0, 0.7);
}

.auth-input select option,
select.auth-input option {
  background: #1a1a2e;
  color: #ffffff;
  padding: 8px 12px;
  border: none;
}

.auth-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.password-input-wrapper .auth-input {
  padding-right: 48px;
}

.password-visibility-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #ffffff;
  opacity: 0.7;
  font-size: 16px;
  pointer-events: none;
  width: 20px;
  height: 20px;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'/%3e%3c/svg%3e");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.password-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  color: #ffffff;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.password-toggle-btn:hover {
  opacity: 1;
}

.eye-off-icon {
  display: block;
  width: 20px;
  height: 20px;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'/%3e%3c/svg%3e");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.eye-on-icon {
  display: block;
  width: 20px;
  height: 20px;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/%3e%3ccircle cx='12' cy='12' r='3'/%3e%3c/svg%3e");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

/* Hide browser's default password reveal button to prevent double icons */
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear {
  display: none;
}

input[type="password"]::-webkit-contacts-auto-fill-button,
input[type="password"]::-webkit-credentials-auto-fill-button {
  visibility: hidden;
  pointer-events: none;
  position: absolute;
}

.password-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  opacity: 0.6;
  transition: opacity 0.2s ease, transform 0.1s ease;
  border-radius: 6px;
}

.password-toggle-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}

.password-toggle-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.auth-signin-btn {
  margin-top: 4px;
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  background: #3b82f6;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: 'Outfit', sans-serif;
}

.auth-signin-btn.instructor-signin {
  background: #3b82f6;
  color: #ffffff;
}

.auth-signin-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.auth-signin-btn.instructor-signin:hover {
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.auth-signin-btn:active {
  transform: translateY(0px);
}

.auth-error {
  margin: 0;
  color: #f87171;
  font-size: 0.8rem;
  text-align: center;
}

.auth-demo-hint {
  margin: 20px 0 0;
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.5;
  text-align: center;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}

.auth-guest-link {
  margin-top: 16px;
  padding: 10px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.76rem;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.8px;
  text-align: center;
  width: 100%;
  border-radius: 8px;
}

.auth-guest-link:hover {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
}

.auth-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.remember-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.8rem;
}

.ghost-link {
  background: transparent;
  border: none;
  color: #93c5fd;
  cursor: pointer;
}

.dashboard-shell {
  width: min(1320px, 96vw);
  height: min(820px, 90vh);
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 14px;
}

/* —— Navigation missions dashboard —— */
.missions-hub {
  width: min(1180px, 100%);
  display: grid;
  gap: 28px;
}

/* Sidebar layout for the student training hub */
.missions-hub--with-sidebar {
  width: min(1400px, 95%);
  max-width: 1600px;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.missions-main {
  display: grid;
  gap: 28px;
  min-width: 0;
}

.hub-sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: calc(100vh - 88px);
  padding: 24px 18px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(10, 16, 28, 0.92));
  border: 1px solid rgba(56, 189, 248, 0.14);
  border-radius: 18px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(14px);
}

.hub-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}

.hub-sidebar-logo {
  font-size: 30px;
  filter: drop-shadow(0 2px 8px rgba(56, 189, 248, 0.5));
}

.hub-sidebar-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.hub-sidebar-brand-text strong {
  font-family: 'Rajdhani', 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f8fafc;
}

.hub-sidebar-brand-text span {
  font-size: 0.72rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #38bdf8;
}

.hub-sidebar-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 18px 12px;
  background: rgba(56, 189, 248, 0.06);
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 14px;
}

.hub-sidebar-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  color: #ffffff;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);
}

.hub-sidebar-name {
  font-size: 1rem;
  color: #f8fafc;
}

.hub-sidebar-rank {
  font-size: 0.8rem;
  color: #94a3b8;
}

.hub-sidebar-xp-bar {
  width: 100%;
  height: 6px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
  margin-top: 6px;
}

.hub-sidebar-xp-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
  transition: width 0.4s ease;
}

.hub-sidebar-xp-text {
  font-size: 0.72rem;
  color: #64748b;
}

.hub-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hub-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #cbd5e1;
  font-size: 0.92rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hub-nav-item:hover {
  background: rgba(56, 189, 248, 0.12);
  color: #f8fafc;
  transform: translateX(3px);
}

.hub-nav-item--active {
  background: rgba(56, 189, 248, 0.18);
  color: #f8fafc;
  border-left: 3px solid #38bdf8;
}

.hub-nav-count {
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: rgba(56, 189, 248, 0.25);
  color: #e0f2fe;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.hub-nav-item--active .hub-nav-count {
  background: #38bdf8;
  color: #0b111b;
}

.hub-nav-icon {
  font-size: 1.05rem;
}

.hub-sidebar-logout {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 13px 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hub-sidebar-logout:hover {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.hub-sidebar-toggle {
  display: none;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 360px;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.78);
  color: #e2e8f0;
  font-size: 0.94rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.hub-sidebar-toggle:hover {
  background: rgba(15, 23, 42, 0.95);
  transform: translateY(-1px);
}

.hub-sidebar-toggle .hamburger-icon {
  font-size: 1.1rem;
  opacity: 0.95;
}

.hub-sidebar-toggle .toggle-text {
  text-align: left;
  flex: 1;
}

.missions-hub--sidebar-collapsed {
  grid-template-columns: 1fr;
}

/* Stack sidebar on top on narrow screens */
@media (max-width: 900px) {
  .missions-hub--with-sidebar {
    grid-template-columns: 1fr;
  }
  .hub-sidebar {
    position: relative;
    min-height: auto;
    flex-direction: column;
  }
  .hub-sidebar-logout {
    margin-top: 16px;
  }
  .hub-sidebar-toggle {
    display: flex;
  }
}

.missions-hub-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.missions-hub-title {
  margin: 0 0 8px;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.02em;
}

.missions-hub-welcome {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
}

.missions-hub-note {
  margin: 6px 0 0;
  color: #93c5fd;
  font-size: 0.82rem;
}

/* Leaderboards Section */
.leaderboards-section {
  padding: 24px;
}

.leaderboards-header {
  margin-bottom: 24px;
}

.leaderboards-title {
  margin: 0 0 8px;
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #f8fafc;
}

.leaderboards-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
}

/* Leaderboard Tabs */
.leaderboard-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.leaderboard-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 10px;
  color: #cbd5e1;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.leaderboard-tab:hover {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-2px);
}

.leaderboard-tab--active {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.5);
  color: #38bdf8;
  box-shadow: 0 4px 15px rgba(56, 189, 248, 0.2);
}

.leaderboard-tab .tab-icon {
  font-size: 1.2rem;
}

.leaderboard-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.leaderboard-card-title {
  margin: 0 0 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: #38bdf8;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.leaderboard-card-subtitle {
  margin: 0 0 20px;
  color: #64748b;
  font-size: 0.88rem;
}

/* Global Rank Card */
.global-rank-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 24px;
  row-gap: 4px;
  width: min(100%, 360px);
  box-sizing: border-box;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(59, 130, 246, 0.15));
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  text-align: left;
}

.global-rank-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 0;
}

.global-rank-value {
  font-size: 1.65rem;
  line-height: 1.2;
  font-weight: 700;
  color: #38bdf8;
  margin: 0;
  text-shadow: 0 2px 8px rgba(56, 189, 248, 0.3);
}

.global-rank-stats {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #cbd5e1;
  font-size: 0.85rem;
}

.instructor-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #a78bfa;
  letter-spacing: 0.5px;
  margin-left: 8px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-item {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 150px 130px;
  gap: 20px;
  align-items: center;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(56, 189, 248, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.leaderboard-item:hover {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateX(4px);
}

.leaderboard-header-row {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  font-weight: 600;
  color: #38bdf8;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.leaderboard-header-row:hover {
  transform: none;
}

.leaderboard-item-current {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.leaderboard-item-current:hover {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.5);
}

.leaderboard-rank {
  text-align: center;
  font-weight: 700;
  color: #cbd5e1;
}

.rank-medal {
  font-size: 1.8rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.rank-number {
  font-size: 1.1rem;
  color: #94a3b8;
}

.leaderboard-name {
  font-weight: 600;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.you-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #22c55e;
  letter-spacing: 1px;
}

.leaderboard-stat {
  text-align: center;
  color: #cbd5e1;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .leaderboard-tabs {
    flex-direction: column;
  }
  
  .leaderboard-tab {
    padding: 12px 16px;
  }
  
  .global-rank-value {
    font-size: 1.5rem;
  }
  
  .leaderboard-item {
    grid-template-columns: 50px minmax(0, 1fr) 80px;
    gap: 12px;
  }
  
  .leaderboard-stat:nth-child(4) {
    display: none;
  }
  
  .instructor-badge {
    display: none;
  }
}

.missions-hub-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.missions-link-btn {
  border: none;
  background: none;
  color: #94a3b8;
  font-size: 0.88rem;
  cursor: pointer;
  padding: 8px 4px;
}

.missions-link-btn:hover {
  color: #cbd5e1;
}

.missions-signout-btn {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  font-size: 0.88rem;
  padding: 8px 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.missions-signout-btn:hover {
  border-color: rgba(148, 163, 184, 0.6);
  background: rgba(30, 41, 59, 0.5);
}

.motivation-panel {
  display: grid;
  min-width: 0;
  gap: 18px;
  padding: 18px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(51, 65, 85, 0.65);
}

/* Student profile card */
.student-profile-card {
  display: flex;
  gap: 18px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.05));
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.student-profile-avatar {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 800;
  color: #ffffff;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  box-shadow: 0 4px 16px rgba(56, 189, 248, 0.4);
}

.student-profile-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.student-profile-name {
  font-size: 1.35rem;
  color: #f8fafc;
  line-height: 1.1;
}

.student-profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px 20px;
}

.student-profile-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.student-profile-label {
  font-size: 0.68rem;
  color: #7dd3fc;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.student-profile-value {
  color: #f1f5f9;
  font-size: 0.95rem;
  font-weight: 600;
}

/* Compact recent badge in profile header */
.student-profile-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 12px;
}
.student-profile-badge-icon {
  font-size: 1.6rem;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  color: #e2e8f0;
}
.student-profile-badge-title {
  font-weight: 700;
  color: #f8fafc;
  display: block;
}
.student-profile-badge-date {
  font-size: 0.72rem;
  color: #94a3b8;
  display: block;
}

/* Sidebar student ID */
.hub-sidebar-student-id {
  font-size: 0.72rem;
  color: #7dd3fc;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
  margin-top: -2px;
}

/* Horizontal Profile Card Layout */
.student-profile-card--horizontal {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 1fr));
  align-items: stretch;
  padding: 18px;
  gap: 16px;
}

.student-profile-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.student-profile-left .student-profile-avatar {
  width: 56px;
  height: 56px;
  font-size: 1.7rem;
}

.student-profile-left .student-profile-details {
  gap: 6px;
}

.student-profile-left .student-profile-name {
  font-size: 1.2rem;
  overflow-wrap: anywhere;
  margin-bottom: 4px;
}

.student-profile-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student-profile-id {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: 'Courier New', monospace;
  overflow-wrap: anywhere;
}

.student-profile-center {
  display: flex;
  min-width: 0;
  justify-content: center;
}

.student-profile-rank-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.08);
  border-radius: 12px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  min-height: 72px;
}


.student-profile-rank-label {
  font-size: 0.68rem;
  color: #7dd3fc;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.student-profile-rank-title {
  font-size: 1.1rem;
  color: #f8fafc;
  font-weight: 700;
  margin: 4px 0;
}

.student-profile-rank-meta {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.4;
}

.student-profile-right {
  display: flex;
  min-width: 0;
}

.student-profile-badge-large {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.08);
  border-radius: 12px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  min-height: 72px;
}

.student-profile-badge-icon-large {
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.15);
  border-radius: 10px;
  flex-shrink: 0;
}

.student-profile-badge-info-large {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.student-profile-badge-label {
  font-size: 0.68rem;
  color: #7dd3fc;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.student-profile-badge-title-large {
  font-weight: 700;
  color: #f8fafc;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.student-profile-badge-date-large {
  font-size: 0.75rem;
  color: #94a3b8;
}

.student-profile-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 12px;
}
.student-profile-badge-icon {
  font-size: 1.6rem;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  color: #e2e8f0;
}
.student-profile-badge-title {
  font-weight: 700;
  color: #f8fafc;
  display: block;
}
.student-profile-badge-date {
  font-size: 0.72rem;
  color: #94a3b8;
  display: block;
}
.student-profile-badge--placeholder .student-profile-badge-icon {
  background: rgba(148,163,184,0.13);
}

.motivation-scores {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.motivation-stat-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(11, 17, 27, 0.85);
  border: 1px solid rgba(51, 65, 85, 0.55);
  display: grid;
  gap: 6px;
}

.motivation-stat-card--xp {
  grid-column: span 1;
}

.motivation-stat-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.motivation-stat-value {
  font-size: 1.35rem;
  color: #f8fafc;
}

.motivation-xp-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
  overflow: hidden;
}

.motivation-xp-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb, #38bdf8);
  transition: width 0.35s ease;
}

.motivation-xp-text {
  font-size: 0.75rem;
  color: #94a3b8;
}

.motivation-rewards-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
}

.motivation-rewards-row--full {
  grid-template-columns: minmax(0, 1fr);
}

.motivation-block {
  min-width: 0;
}

.motivation-block-title {
  margin: 0 0 4px;
  font-size: 1rem;
  color: #f8fafc;
}

.motivation-block-hint {
  margin: 0 0 12px;
  font-size: 0.8rem;
  color: #64748b;
}

.badge-grid {
  list-style: none;
  margin: 0;
  padding: 0 0 4px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 96px), 1fr));
  gap: 10px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.badge-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  padding: 14px 6px 10px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.55), rgba(11, 17, 27, 0.75));
  border: 1px solid rgba(51, 65, 85, 0.55);
  opacity: 0.55;
  width: 100%;
  min-height: 116px;
  box-sizing: border-box;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.badge-card:hover {
  transform: translateY(-3px);
  border-color: rgba(56, 189, 248, 0.35);
  opacity: 0.8;
}

/* Rank cards - current rank highlighted */
.rank-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 105px), 1fr));
  gap: 8px;
}

.rank-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 10px 6px;
  box-sizing: border-box;
  text-align: center;
  border: 1px solid rgba(51, 65, 85, 0.55);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.55), rgba(11, 17, 27, 0.75));
}

.rank-card .rank-icon {
  width: 28px;
  height: 28px;
  font-size: 1rem;
}

.rank-title {
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.3;
  min-height: 27px;
  color: #e2e8f0;
}

.rank-card .rank-status-badge,
.rank-card .rank-xp-required {
  font-size: 0.5rem;
  padding: 3px 6px;
  letter-spacing: 0;
}

@media (max-width: 700px) {
  .student-profile-card--horizontal {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 14px;
    gap: 12px;
  }

  .student-profile-left {
    grid-column: 1 / -1;
  }
}

.rank-card--current {
  opacity: 1 !important;
  border-color: rgba(56, 189, 248, 0.7) !important;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.25), rgba(8, 145, 178, 0.3)) !important;
  box-shadow: 0 2px 8px rgba(56, 189, 248, 0.2);
}

.rank-card--current .badge-card-status {
  color: #7dd3fc;
  font-weight: 600;
}

.rank-subtitle {
  font-size: 0.7rem;
  color: #94a3b8;
}

.rank-icon {
  font-size: 2rem;
}
.badge-card--earned {
  opacity: 1;
  border-color: rgba(56, 189, 248, 0.45);
  background: linear-gradient(180deg, rgba(15, 60, 92, 0.55), rgba(11, 17, 27, 0.75));
  box-shadow: 0 6px 16px rgba(56, 189, 248, 0.18);
}

.badge-card--earned:hover {
  opacity: 1;
  transform: translateY(-4px);
  box-shadow: 0 10px 22px rgba(56, 189, 248, 0.3);
}

.badge-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  font-size: 1.4rem;
  line-height: 1;
  background: rgba(100, 116, 139, 0.15);
  border: 1px solid rgba(100, 116, 139, 0.25);
  transition: all 0.25s ease;
}

.badge-card--earned .badge-card-icon {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  border-color: rgba(125, 211, 252, 0.6);
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.45);
}

.badge-card-title {
  font-size: 0.68rem;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1.2;
}

.badge-card-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.54rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  background: rgba(100, 116, 139, 0.15);
  margin-top: auto;
}

.badge-card--earned .badge-card-status {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

/* Rank card locked state */
.rank-card--locked {
  opacity: 0.35;
  filter: grayscale(0.6);
}

.rank-card--locked:hover {
  opacity: 0.5;
}

/* Rank card earned state */
.rank-card--earned {
  opacity: 1;
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(180deg, rgba(21, 128, 61, 0.2), rgba(11, 17, 27, 0.75));
}

.rank-card--earned .badge-card-icon {
  background: linear-gradient(135deg, #22c55e, #4ade80);
  border-color: rgba(74, 222, 128, 0.5);
}

/* Rank XP required badge */
.rank-xp-required {
  font-size: 0.58rem;
  color: #94a3b8;
  background: rgba(100, 116, 139, 0.15);
  padding: 3px 8px;
  border-radius: 999px;
  margin-top: auto;
  font-weight: 600;
}

/* Rank status badges */
.rank-status-badge {
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 999px;
  margin-top: auto;
  background: rgba(56, 189, 248, 0.2);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.rank-status-earned {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.3);
}

.certificate-list {
  list-style: none;
  margin: 0;
  padding: 0;

/* Recent badge display */
.recent-badge {
  margin: 12px 0 8px;
  display: flex;
  justify-content: center;
}
.recent-badge-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(180deg, rgba(59,130,246,0.08), rgba(37,99,235,0.03));
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(59,130,246,0.14);
  max-width: 520px;
  width: 100%;
  box-sizing: border-box;
}
.recent-badge-icon {
  font-size: 1.6rem;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
}
.recent-badge-title {
  display: block;
  font-weight: 700;
  color: #e2e8f0;
}
.recent-badge-meta {
  display: block;
  font-size: 0.85rem;
  color: #94a3b8;
}
  display: grid;
  gap: 8px;
}

.certificate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(11, 17, 27, 0.75);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.certificate-row-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.certificate-row-info strong {
  display: block;
  color: #f8fafc;
  font-size: 0.88rem;
}

.certificate-row-meta {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
}

.certificate-view-btn {
  flex-shrink: 0;
  border: 1px solid rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.1);
  color: #fcd34d;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.certificate-view-btn:hover {
  background: rgba(251, 191, 36, 0.18);
}

.motivation-empty {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
  font-style: italic;
}

/* Training Records Styles */

/* Tab Navigation */
.training-records-tabs {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  margin-bottom: 24px;
}

.training-record-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.training-record-tab:hover {
  border-color: rgba(56, 189, 248, 0.5);
  background: rgba(15, 23, 42, 0.8);
  color: #e0f2fe;
}

.training-record-tab.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  color: #38bdf8;
}

.training-record-tab .tab-icon {
  font-size: 1.3rem;
}

.training-record-tab .tab-text {
  font-weight: 700;
}

/* Tab Content */
.training-records-content {
  margin-top: 20px;
}

.training-record-panel {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Table Styles */
.training-records-table-wrapper {
  background: rgba(15, 23, 42, 0.4);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.training-records-table {
  width: 100%;
  border-collapse: collapse;
}

.training-records-table thead {
  background: rgba(56, 189, 248, 0.1);
  border-bottom: 1px solid rgba(56, 189, 248, 0.3);
}

.training-records-table th {
  padding: 16px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #7dd3fc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-header-mission {
  width: 70%;
  text-align: left;
}

.table-header-score {
  width: 30%;
  text-align: center;
}

.table-row {
  border-bottom: 1px solid rgba(56, 189, 248, 0.1);
  transition: background 0.2s ease;
}

.table-row:hover {
  background: rgba(56, 189, 248, 0.05);
}

.table-row:last-child {
  border-bottom: none;
}

.training-records-table td {
  padding: 16px 20px;
}

.table-cell-mission {
  width: 70%;
  text-align: left;
}

.table-cell-score {
  width: 30%;
  text-align: center;
}

.mission-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mission-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 8px;
  color: #22c55e;
  font-size: 1.2rem;
  font-weight: bold;
}

.mission-details {
  flex: 1;
  min-width: 0;
}

.mission-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f8fafc;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mission-date {
  font-size: 0.8rem;
  color: #94a3b8;
}

.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  min-width: 100px;
  transition: opacity 0.2s ease;
}

.score-badge:hover {
  opacity: 0.9;
}

.score-excellent {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.score-good {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.score-fair {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
  border: 1px solid rgba(234, 179, 8, 0.4);
}

.score-poor {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Loading State */
.training-records-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.training-records-loading p {
  margin: 0;
  color: #94a3b8;
  font-size: 0.95rem;
}

/* Empty State */
.training-record-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 8px;
  border: 2px dashed rgba(56, 189, 248, 0.2);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #cbd5e1;
}

.empty-hint {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .training-records-tabs {
    flex-direction: column;
    gap: 8px;
  }
  
  .training-record-tab {
    padding: 12px 20px;
    justify-content: center;
  }
  
  .training-records-table th,
  .training-records-table td {
    padding: 12px 14px;
  }
  
  .mission-title {
    font-size: 0.85rem;
  }
  
  .mission-date {
    font-size: 0.75rem;
  }
  
  .score-badge {
    font-size: 0.8rem;
    padding: 6px 12px;
    min-width: 80px;
  }
  
  .table-header-mission {
    width: 60%;
  }
  
  .table-header-score {
    width: 40%;
  }
  
  .table-cell-mission {
    width: 60%;
  }
  
  .table-cell-score {
    width: 40%;
  }
}

.training-modules-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.module-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(11, 17, 27, 0.75);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 10px;
  text-align: center;
}

.module-stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #7dd3fc;
  display: block;
  margin-bottom: 6px;
}

.module-stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
  display: block;
}

.mission-reward-badges {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  text-align: left;
}

.mission-reward-badges li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.25);
  font-size: 0.82rem;
}

.mission-reward-badges li p {
  margin: 4px 0 0;
  color: #94a3b8;
}

.mission-certificate-note {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: #fcd34d;
  font-size: 0.85rem;
  font-weight: 600;
}

.certificate-overlay {
  position: fixed;
  inset: 0;
  z-index: 96000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.72);
}

.certificate-document {
  width: min(520px, 100%);
  display: grid;
  gap: 16px;
}

.certificate-document-border {
  padding: 36px 32px;
  border-radius: 12px;
  background: linear-gradient(165deg, #fefce8 0%, #fff7ed 45%, #fef3c7 100%);
  border: 3px double #b45309;
  color: #1c1917;
  text-align: center;
}

.certificate-doc-eyebrow {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #92400e;
}

.certificate-document-border h2 {
  margin: 0 0 20px;
  font-family: 'Outfit', serif;
  font-size: 1.6rem;
  color: #78350f;
}

.certificate-doc-presented {
  margin: 0;
  font-size: 0.9rem;
  color: #57534e;
}

.certificate-doc-name {
  margin: 8px 0 16px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1c1917;
}

.certificate-doc-body {
  margin: 0 0 20px;
  line-height: 1.55;
  font-size: 0.95rem;
  color: #44403c;
}

.certificate-doc-date,
.certificate-doc-id {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #78716c;
}

.certificate-document-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.certificate-close-btn {
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: transparent;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 0.88rem;
  cursor: pointer;
}

@media (max-width: 900px) {
  .motivation-scores {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .motivation-rewards-row {
    grid-template-columns: 1fr;
  }
}

@media print {
  body * {
    visibility: hidden;
  }

  #helmquest-certificate-print,
  #helmquest-certificate-print * {
    visibility: visible;
  }

  #helmquest-certificate-print {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
  }
}

.missions-hub-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.mission-hub-card {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(51, 65, 85, 0.65);
  border-radius: 12px;
  padding: 18px 18px 16px;
  display: grid;
  gap: 8px;
  align-content: start;
  text-align: left;
  position: relative;
}

.mission-hub-card--completed {
  border-color: rgba(74, 222, 128, 0.35);
  background: rgba(15, 40, 30, 0.45);
}

.mission-hub-card--failed {
  border-color: rgba(248, 113, 113, 0.35);
  background: rgba(40, 20, 20, 0.45);
}

.mission-completed-pill {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.mission-hub-card--completed .mission-hub-start {
  color: #86efac;
}

.mission-result-pill {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mission-result-pill--fail {
  color: #fca5a5;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.mission-hub-result {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
}

.mission-hub-result--pass {
  color: #4ade80;
}

.mission-hub-result--fail {
  color: #f87171;
}

.mission-hub-card--failed .mission-hub-start {
  color: #fca5a5;
}

.mission-difficulty {
  display: inline-block;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(51, 65, 85, 0.8);
}

.mission-difficulty.diff-beginner {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.25);
}

.mission-difficulty.diff-intermediate {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.25);
}

.mission-difficulty.diff-advanced {
  color: #f472b6;
  border-color: rgba(244, 114, 182, 0.25);
}

.mission-hub-name {
  margin: 4px 0 0;
  font-size: 1.12rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.25;
}

.mission-hub-code {
  font-size: 0.78rem;
  font-weight: 600;
  color: #38bdf8;
  letter-spacing: 0.04em;
}

.mission-hub-desc {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 0.84rem;
  line-height: 1.5;
  min-height: 2.8em;
}

.mission-hub-pass {
  margin: 4px 0 0;
  color: #4ade80;
  font-size: 0.82rem;
  font-weight: 500;
}

.mission-hub-start {
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  color: #38bdf8;
  font-size: 0.88rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.mission-hub-start:hover {
  color: #7dd3fc;
}

.mission-complete-overlay {
  --mission-report-gutter: clamp(12px, 3vw, 24px);
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  z-index: 93000;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  padding: var(--mission-report-gutter);
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(6px);
}

.mission-complete-modal {
  box-sizing: border-box;
  width: min(420px, 100%);
  min-width: 0;
  padding: clamp(16px, 4vw, 24px);
  border-radius: 16px;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  text-align: center;
  display: grid;
  gap: 10px;
  max-height: calc(100vh - 2 * var(--mission-report-gutter));
  max-height: calc(100dvh - 2 * var(--mission-report-gutter));
  overflow-y: auto;
  overflow-wrap: anywhere;
}

.mission-complete-modal--pass {
  border-color: rgba(74, 222, 128, 0.45);
}

.mission-complete-modal--fail {
  border-color: rgba(248, 113, 113, 0.45);
}

.mission-result-hero {
  display: grid;
  gap: 4px;
  padding: 18px 16px;
  border-radius: 12px;
  margin-bottom: 4px;
}

.mission-result-hero--pass {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.mission-result-hero--fail {
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.mission-result-status {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.mission-result-hero--pass .mission-result-status {
  color: #4ade80;
}

.mission-result-hero--fail .mission-result-status {
  color: #f87171;
}

.mission-result-score {
  font-size: 2.4rem;
  line-height: 1;
  color: #f8fafc;
}

.mission-result-target {
  font-size: 0.78rem;
  color: #94a3b8;
}

.mission-result-breakdown {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
  text-align: left;
}

.mission-result-breakdown li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(51, 65, 85, 0.55);
  font-size: 0.82rem;
}

.mission-result-breakdown span {
  color: #94a3b8;
}

.mission-result-breakdown strong {
  color: #e2e8f0;
}

.mission-complete-badge {
  display: inline-block;
  margin: 0 auto 4px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.mission-complete-eyebrow {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.mission-complete-modal h2 {
  margin: 4px 0 0;
  color: #f8fafc;
  font-size: 1.35rem;
}

.mission-complete-code {
  margin: 0;
  color: #38bdf8;
  font-size: 0.82rem;
  font-weight: 600;
}

.mission-complete-score {
  margin: 8px 0 0;
  color: #cbd5e1;
  font-size: 0.9rem;
}

.mission-complete-pass {
  color: #4ade80;
  font-weight: 700;
}

.mission-complete-fail {
  color: #f87171;
  font-weight: 700;
}

.mission-complete-hint {
  margin: 0;
  color: #94a3b8;
  font-size: 0.8rem;
  line-height: 1.45;
}

.mission-complete-actions {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.mission-complete-btn {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  color: #0f172a;
  background: #38bdf8;
  transition: background 0.2s ease;
}

.mission-complete-btn--secondary {
  background: transparent;
  border: 1px solid rgba(251, 191, 36, 0.5);
  color: #fcd34d;
}

.mission-complete-btn--secondary:hover {
  background: rgba(251, 191, 36, 0.12);
}

.mission-complete-modal--fail .mission-complete-btn {
  background: #f87171;
  color: #0f172a;
}

.mission-complete-btn:hover {
  background: #38bdf8;
}

.mission-complete-modal--fail .mission-complete-btn:hover {
  background: #fca5a5;
}

/* Performance Breakdown Section */
.performance-breakdown-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.performance-breakdown-title {
  margin: 0 0 16px 0;
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: 0.02em;
}

.performance-metrics-grid {
  display: grid;
  gap: 16px;
}

.performance-metric-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.performance-metric-card:hover {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(148, 163, 184, 0.3);
}

.metric-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.metric-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-label {
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-bar-container {
  width: 100%;
  height: 8px;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.metric-bar {
  height: 100%;
  transition: width 0.6s ease, background-color 0.3s ease;
  border-radius: 4px;
}

.metric-bar--excellent {
  background: linear-gradient(90deg, #22c55e, #4ade80);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
}

.metric-bar--good {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.metric-bar--fair {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.metric-bar--poor {
  background: linear-gradient(90deg, #ef4444, #f87171);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}

.metric-value {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.02em;
}

.metric-stat {
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  color: #94a3b8;
  letter-spacing: 0.3px;
}

@media (max-width: 900px) {
  .missions-hub-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .missions-hub-grid {
    grid-template-columns: 1fr;
  }

  .missions-hub-header {
    flex-direction: column;
    align-items: stretch;
  }

  .missions-hub-actions {
    justify-content: space-between;
  }
}

/* —— Instructor console dashboard —— */
.instructor-console {
  width: min(1400px, 95%);
  max-width: 1600px;
  display: grid;
  gap: 24px;
}

.instructor-console-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.instructor-eyebrow {
  margin: 0 0 6px;
  color: #60a5fa;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.instructor-brand {
  margin: 0 0 8px;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.02em;
}

.instructor-brand-tab {
  margin: 0 0 8px;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.instructor-header-subtitle {
  margin: 0 0 12px;
  color: #94a3b8;
  font-size: 1rem;
  line-height: 1.5;
}

.instructor-signed-in {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
}

.instructor-signout-btn {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  font-size: 0.88rem;
  padding: 8px 16px;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.instructor-signout-btn:hover {
  border-color: rgba(148, 163, 184, 0.6);
  background: rgba(30, 41, 59, 0.5);
}

/* Modern Dashboard Statistics Cards */
.instructor-overview {
  min-width: 0;
}

.overview-toolbar,
.overview-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.overview-toolbar {
  color: #94a3b8;
  font-size: 0.85rem;
}

.overview-panel-heading .dashboard-panel-title {
  margin: 0;
}

.overview-action {
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 7px;
  padding: 7px 11px;
  color: #7dd3fc;
  background: rgba(56, 189, 248, 0.07);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
}

.overview-action:hover {
  background: rgba(56, 189, 248, 0.15);
}

.overview-action:disabled {
  opacity: 0.6;
  cursor: wait;
}

.overview-error {
  color: #fca5a5;
  font-size: 0.85rem;
}

.overview-empty,
.overview-mission-count {
  margin: 8px 0;
  color: #94a3b8;
  font-size: 0.78rem;
  line-height: 1.5;
}

.instructor-overview .dashboard-stat-card {
  min-height: 96px;
  box-sizing: border-box;
  align-items: center;
  padding: 14px;
  gap: 10px;
  min-width: 0;
}

.instructor-overview .dashboard-stat-icon {
  width: 32px;
  height: 32px;
  font-size: 16px;
}

.instructor-overview .dashboard-mission-cards {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
}

.overview-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.overview-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.overview-result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(51, 65, 85, 0.35);
  border-radius: 8px;
}

.overview-result-info {
  display: grid;
  gap: 4px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.overview-result-info strong {
  color: #e2e8f0;
  font-size: 0.85rem;
  font-weight: 600;
}

.overview-result-info span {
  color: #94a3b8;
  font-size: 0.73rem;
  line-height: 1.4;
}

.overview-status {
  flex-shrink: 0;
  padding: 4px 7px;
  border-radius: 5px;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  font-size: 0.68rem;
  white-space: nowrap;
}

.overview-status--retry {
  background: rgba(251, 146, 60, 0.1);
  color: #fdba74;
}

.overview-status--passed {
  background: rgba(34, 197, 94, 0.1);
  color: #86efac;
}

@media (max-width: 1100px) {
  .instructor-overview .dashboard-stats-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .overview-detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 480px) {
  .instructor-overview .dashboard-stats-cards {
    grid-template-columns: minmax(0, 1fr);
  }
  .instructor-overview .dashboard-progress-header {
    align-items: flex-start;
    gap: 12px;
  }
}

.dashboard-stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.dashboard-stat-card {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  transition: all 0.2s ease;
}

.dashboard-stat-card:hover {
  border-color: rgba(100, 116, 139, 0.6);
  background: rgba(15, 23, 42, 0.5);
}

.dashboard-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.dashboard-stat-card--blue .dashboard-stat-icon {
  background: rgba(59, 130, 246, 0.15);
}

.dashboard-stat-card--green .dashboard-stat-icon {
  background: rgba(34, 197, 94, 0.15);
}

.dashboard-stat-card--purple .dashboard-stat-icon {
  background: rgba(168, 85, 247, 0.15);
}

.dashboard-stat-card--cyan .dashboard-stat-icon {
  background: rgba(6, 182, 212, 0.15);
}

.dashboard-stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dashboard-stat-number {
  color: #f8fafc;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.dashboard-stat-label {
  color: #e2e8f0;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 4px;
}

.dashboard-stat-desc {
  color: #94a3b8;
  font-size: 0.7rem;
  line-height: 1.3;
}

/* Main Dashboard Section */
.dashboard-main-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-panel {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 10px;
  padding: 20px;
}

.dashboard-panel-title {
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
}

/* Mission Completion Progress */
.dashboard-progress-main {
  margin-bottom: 16px;
}

.dashboard-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.dashboard-progress-label {
  color: #e2e8f0;
  font-size: 0.85rem;
  font-weight: 500;
}

.dashboard-progress-percent {
  color: #22c55e;
  font-size: 1.1rem;
  font-weight: 700;
}

.dashboard-progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 5px;
  overflow: hidden;
}

.dashboard-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #22c55e);
  border-radius: 5px;
  transition: width 0.4s ease;
}

/* Mission Cards */
.dashboard-mission-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.dashboard-mission-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
  padding: 14px;
}

.dashboard-mission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.dashboard-mission-name {
  color: #e2e8f0;
  font-size: 0.85rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-mission-percent {
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-left: 8px;
}

.dashboard-mission-bar {
  width: 100%;
  height: 5px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 3px;
  overflow: hidden;
}

.dashboard-mission-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.dashboard-mission-fill--green {
  background: #22c55e;
}

.dashboard-mission-fill--blue {
  background: #3b82f6;
}

.dashboard-mission-fill--yellow {
  background: #eab308;
}

.dashboard-mission-fill--red {
  background: #ef4444;
}

.dashboard-mission-fill--purple {
  background: #a855f7;
}

.dashboard-mission-fill--cyan {
  background: #06b6d4;
}

.dashboard-mission-fill--orange {
  background: #f97316;
}

.dashboard-mission-fill--pink {
  background: #ec4899;
}

/* Top Performing Students Leaderboard */
.dashboard-leaderboard-header {
  display: grid;
  grid-template-columns: 70px 1fr 150px;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.3);
  border-radius: 6px;
  margin-bottom: 10px;
}

.dashboard-leaderboard-col {
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dashboard-leaderboard-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dashboard-leaderboard-row {
  display: grid;
  grid-template-columns: 70px 1fr 150px;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(51, 65, 85, 0.3);
  border-radius: 6px;
  align-items: center;
  transition: all 0.2s ease;
}

.dashboard-leaderboard-row:hover {
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(100, 116, 139, 0.4);
}

.dashboard-leaderboard-rank {
  color: #f8fafc;
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
}

.dashboard-leaderboard-name {
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 500;
}

.dashboard-leaderboard-score {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dashboard-leaderboard-score-text {
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 700;
}

.dashboard-leaderboard-score-bar {
  width: 100%;
  height: 4px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 2px;
  overflow: hidden;
}

.dashboard-leaderboard-score-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.dashboard-leaderboard-empty {
  color: #64748b;
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
}

/* Student Management */
.student-management-panel { min-width: 0; }
.student-count { display: inline-flex; margin-left: 8px; padding: 2px 9px; border-radius: 999px; color: #7dd3fc; background: rgba(56,189,248,.12); font-size: .8rem; vertical-align: middle; }
.student-management-note { margin: 6px 0 0; font-size: .82rem; line-height: 1.5; color: #94a3b8; }
.student-management-filters { display: grid; grid-template-columns: minmax(0,1fr) 180px; gap: 14px; margin: 22px 0 16px; }
.student-management-filters label { display: grid; gap: 6px; min-width: 0; font-size: .75rem; color: #94a3b8; }
.student-management-filters input, .student-management-filters select { width: 100%; min-width: 0; height: 40px; padding: 8px 12px; border: 1px solid rgba(56,189,248,.25); border-radius: 8px; color: #e2e8f0; background: #0c192a; font: inherit; font-size: .85rem; }
.student-management-filters input:focus, .student-management-filters select:focus { outline: 2px solid rgba(56,189,248,.6); outline-offset: 2px; }
.student-management-table { width: 100%; min-width: 0; }
.student-management-table th { font-size: .68rem; white-space: nowrap; }
.student-management-table td { padding: 16px 10px; vertical-align: middle; font-size: .82rem; }
.student-account-cell, .student-rank-cell, .student-progress-cell { display: grid; gap: 5px; min-width: 0; }
.student-account-cell { overflow-wrap: anywhere; }
.student-account-cell strong { font-size: .93rem; color: #f1f5f9; }
.student-account-cell span, .student-progress-cell > span:last-child { font-size: .73rem; color: #94a3b8; }
.student-account-cell .student-account-id { font-family: 'Courier New', monospace; color: #cbd5e1; }
.student-rank-cell { max-width: 160px; }
.student-rank-cell strong { font-weight: 600; line-height: 1.4; }
.student-rank-cell span { color: #38bdf8; font-size: .78rem; }
.student-progress-cell .mission-completion-badge, .student-progress-cell .quiz-completion-badge { justify-self: start; }
.student-management-table .student-status-badge { text-transform: capitalize; }
.student-management-table .instructor-row-actions { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
.student-management-table .overview-action { white-space: nowrap; padding: 7px 10px; font-size: .74rem; }
.student-management-table .instructor-icon-btn--remove { width: 34px; height: 32px; color: #fee2e2; border-color: #ef4444; background: #7f1d1d; }
.student-management-table .instructor-icon-btn--remove:focus-visible { outline: 2px solid #fca5a5; outline-offset: 2px; }
.student-remove-icon { width: 16px; height: 16px; fill: currentColor; }
.student-management-footnote { margin-top: 16px; }
.student-management-panel button:disabled { opacity: .5; cursor: wait; }
.student-management-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.student-management-error .overview-action { flex: 0 0 auto; }
.student-detail-modal.student-management-detail { width: min(900px,100%); min-width: 0; box-sizing: border-box; }
.student-management-detail .student-detail-header,
.student-management-detail .student-detail-profile,
.student-management-detail .student-detail-summary-cards,
.student-management-detail .student-detail-tabs { flex-shrink: 0; }
.student-management-detail .student-detail-content { min-height: 0; }
.student-record-profile { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.student-record-profile .student-detail-profile-info { min-width: 0; overflow-wrap: anywhere; }
.student-record-email { margin: 7px 0 12px; color: #94a3b8; font-size: .85rem; }
.student-record-rank { display: grid; gap: 5px; text-align: right; }
.student-record-rank strong { color: #f1f5f9; }
.student-record-rank span { color: #38bdf8; font-size: .85rem; }
.student-record-rank span:last-child { color: #94a3b8; font-size: .75rem; }
.student-record-overview { display: grid; gap: 14px; }
.student-record-overview > div { display: flex; justify-content: space-between; gap: 8px 20px; flex-wrap: wrap; padding-bottom: 14px; border-bottom: 1px solid rgba(148,163,184,.12); font-size: .85rem; }
.student-record-overview > div span { color: #94a3b8; }
.student-record-overview > div strong { color: #e2e8f0; }
.student-management-detail .student-detail-tab { text-transform: capitalize; }
.student-management-detail .student-missions-table-wrap { max-width: 100%; overflow-x: auto; }
.student-management-detail .student-missions-table th, .student-management-detail .student-missions-table td { padding: 12px 8px; }
.student-record-result { display: inline-block; padding: 4px 8px; border-radius: 6px; color: #94a3b8; background: rgba(148,163,184,.1); font-size: .75rem; white-space: nowrap; }
.student-record-result--passed { color: #4ade80; background: rgba(34,197,94,.12); }
.student-record-result--failed { color: #fbbf24; background: rgba(251,191,36,.12); }
@media (max-width: 1050px) {
  .student-management-table thead { display: none; }
  .student-management-table tbody { display: grid; gap: 12px; }
  .student-management-table tr { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); border: 1px solid rgba(56,189,248,.15); border-radius: 10px; padding: 8px; }
  .student-management-table td { display: block; border: 0; padding: 10px; min-width: 0; }
  .student-management-table td::before { content: attr(data-label); display: block; margin-bottom: 7px; color: #94a3b8; font-size: .66rem; text-transform: uppercase; letter-spacing: .4px; }
  .student-management-table td:first-child, .student-management-table td:last-child { grid-column: 1 / -1; }
}
@media (max-width: 600px) {
  .student-management-filters { grid-template-columns: minmax(0,1fr); }
  .student-management-error { align-items: stretch; flex-direction: column; }
  .student-record-profile { align-items: start; flex-direction: column; }
  .student-record-rank { text-align: left; }
  .instructor-review-overlay.student-record-overlay { padding: 12px; }
  .student-management-detail .student-detail-header,
  .student-management-detail .student-detail-profile,
  .student-management-detail .student-detail-summary-cards,
  .student-management-detail .student-detail-content { padding: 16px; }
  .student-management-detail .student-detail-tabs { padding: 0 16px; }
  .student-management-detail .student-detail-tab { padding: 12px; }
  .student-management-detail .student-missions-table { min-width: 480px; }
}
.instructor-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}

.instructor-panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.instructor-add-student-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.instructor-add-student-btn:hover {
  background: rgba(34, 197, 94, 0.25);
  transform: translateY(-1px);
}

.instructor-export-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.instructor-export-btn:hover {
  background: rgba(56, 189, 248, 0.22);
  transform: translateY(-1px);
}

.instructor-cell-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
  color: #cbd5e1;
}

.instructor-cell-muted {
  color: #94a3b8;
  font-size: 0.82rem;
}

.student-status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.student-status-badge--active {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
}
.student-status-badge--pending {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}
.student-status-badge--inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

/* Student Records */
.instructor-records-table th {
  white-space: nowrap;
}

.record-level-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  white-space: nowrap;
}
.record-level-badge--0 {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}
.record-level-badge--1 {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
}
.record-level-badge--2 {
  background: rgba(168, 85, 247, 0.18);
  color: #d8b4fe;
}
.record-level-badge--3 {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.record-score {
  font-size: 0.95rem;
}
.record-score--pass {
  color: #4ade80;
}
.record-score--low {
  color: #fbbf24;
}
.record-score--none {
  color: #64748b;
}

.instructor-remove-link {
  background: none;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}
.instructor-remove-link:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* Row action icon buttons */
.instructor-icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid rgba(71, 85, 105, 0.4);
  background: rgba(30, 41, 59, 0.5);
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  line-height: 1;
}
.instructor-icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}
.instructor-icon-btn--edit:hover {
  border-color: rgba(56, 189, 248, 0.6);
  background: rgba(56, 189, 248, 0.15);
}
.instructor-icon-btn--reset:hover {
  border-color: rgba(251, 191, 36, 0.55);
  background: rgba(251, 191, 36, 0.14);
}
.instructor-icon-btn--remove:hover {
  border-color: #f87171;
  background: #dc2626;
  color: #fff;
}

/* Mission and Quiz Completion Badges */
.mission-completion-badge,
.quiz-completion-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.quiz-completion-badge {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

/* Student Detail Modal */
.student-detail-modal {
  width: min(900px, 95vw);
  max-height: min(90vh, 900px);
  background: rgba(15, 23, 42, 0.98);
  border-radius: 16px;
  border: 1px solid rgba(51, 65, 85, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.student-detail-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.student-detail-back-btn {
  background: none;
  border: none;
  color: #60a5fa;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 4px 0;
  margin-bottom: 8px;
  transition: color 0.2s;
}

.student-detail-back-btn:hover {
  color: #93c5fd;
}

.student-detail-title {
  margin: 0;
  font-size: 1.25rem;
  color: #f8fafc;
  font-weight: 600;
}

.student-detail-profile {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.student-detail-name {
  margin: 0 0 4px;
  font-size: 1.5rem;
  color: #f8fafc;
  font-weight: 700;
}

.student-detail-id {
  margin: 0 0 8px;
  color: #94a3b8;
  font-size: 0.875rem;
}

.student-detail-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.student-detail-summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.student-summary-card {
  padding: 14px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.student-summary-label {
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.student-summary-value {
  color: #f8fafc;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.student-detail-tabs {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.student-detail-tab {
  padding: 12px 20px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.student-detail-tab:hover {
  color: #e2e8f0;
}

.student-detail-tab--active {
  color: #60a5fa;
  border-bottom-color: #60a5fa;
}

.student-detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Overview Tab */
.student-detail-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.student-overview-section {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
  padding: 20px;
}

.student-overview-heading {
  margin: 0 0 16px;
  font-size: 1rem;
  color: #f8fafc;
  font-weight: 600;
}

.student-overview-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-overview-stat-value {
  font-size: 2.5rem;
  color: #f8fafc;
  font-weight: 700;
  line-height: 1;
}

.student-overview-stat-label {
  color: #94a3b8;
  font-size: 0.875rem;
}

.student-overview-progress {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.student-overview-progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.student-overview-progress-label {
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 600;
}

.student-overview-progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 4px;
  overflow: hidden;
}

.student-overview-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #22c55e);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.student-overview-progress-text {
  color: #94a3b8;
  font-size: 0.75rem;
}

/* Missions/Quizzes Tables */
.student-missions-table-wrap,
.student-quizzes-table-wrap {
  overflow-x: auto;
}

.student-missions-table,
.student-quizzes-table {
  width: 100%;
  border-collapse: collapse;
}

.student-missions-table th,
.student-quizzes-table th {
  text-align: left;
  padding: 12px;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.student-missions-table td,
.student-quizzes-table td {
  padding: 14px 12px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
}

.student-mission-score,
.student-quiz-score {
  color: #f8fafc;
  font-weight: 600;
}

.student-mission-score-none,
.student-quiz-score-none {
  color: #64748b;
}

.student-mission-status,
.student-quiz-status {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.student-mission-status--completed,
.student-quiz-status--passed {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.student-mission-status--progress {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.student-quiz-status--failed {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.student-mission-status--not-started,
.student-quiz-status--not-started {
  background: rgba(71, 85, 105, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(71, 85, 105, 0.3);
}

.student-detail-empty {
  text-align: center;
  color: #64748b;
  padding: 40px 20px;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .student-detail-summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Pending panel */
.instructor-pending-panel {
  border-left: 4px solid #fbbf24;
}

.instructor-pending-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.instructor-pending-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.25);
  flex-wrap: wrap;
}

.instructor-pending-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.instructor-pending-info strong {
  color: #f8fafc;
  font-size: 0.95rem;
}
.instructor-pending-meta {
  color: #94a3b8;
  font-size: 0.78rem;
}

.instructor-pending-actions {
  display: flex;
  gap: 8px;
}

.instructor-approve-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}
.instructor-approve-btn:hover {
  background: rgba(34, 197, 94, 0.28);
}

.instructor-reject-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}
.instructor-reject-btn:hover {
  background: rgba(239, 68, 68, 0.24);
}

/* Auth signup */
.auth-mode-switch {
  margin-top: 16px;
  text-align: center;
}

.auth-mode-link {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 8px;
}
.auth-mode-link strong {
  color: #38bdf8;
  margin-left: 4px;
}
.auth-mode-link:hover strong {
  color: #7dd3fc;
}

.auth-success {
  margin-top: 12px;
  color: #4ade80;
  font-size: 0.85rem;
  text-align: center;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 10px;
  border-radius: 8px;
}

.quiz-field-inline-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #cbd5e1;
  cursor: pointer;
}
.quiz-field-inline-toggle input[type="checkbox"] {
  accent-color: #38bdf8;
}

.instructor-panel {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(51, 65, 85, 0.65);
  border-radius: 12px;
  padding: 20px 22px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.instructor-panel-title {
  margin: 0 0 16px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
}

.instructor-panel-note {
  margin: -8px 0 14px;
  color: #94a3b8;
  font-size: 0.82rem;
  line-height: 1.45;
}

/* Instructor Missions Panel */
.instructor-missions-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.instructor-missions-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 14px;
  padding: 20px 22px;
}

.instructor-missions-heading {
  flex: 1;
  min-width: 260px;
}

.instructor-difficulty-panel { margin-top: 12px; }
.instructor-difficulty-controls { display:flex; gap:8px; margin:8px 0; }
.instructor-difficulty-controls button { padding:8px 12px; border-radius:8px; background:rgba(148,163,184,0.06); color:#cbd5e1; border:1px solid rgba(148,163,184,0.08); cursor:pointer }
.instructor-difficulty-controls button.btn-active { background:linear-gradient(90deg,#38bdf8,#06b6d4); color:#042531; border-color:transparent }

.instructor-create-mission-btn {
  padding: 12px 22px;
  border-radius: 10px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.9), rgba(56, 189, 248, 0.9));
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.instructor-create-mission-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.4);
}

.instructor-global-toggles {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 14px 18px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 10px;
}

.instructor-training-card {
  position: relative;
}

.instructor-mission-steps-summary {
  margin-top: 12px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
}
.instructor-mission-steps-summary h4 {
  margin: 0 0 8px;
  font-size: 0.82rem;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.instructor-mission-steps-summary ol {
  margin: 0;
  padding-left: 20px;
  color: #cbd5e1;
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Student Portal Mission Steps */
.training-mission-steps {
  margin-top: 12px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
}
.training-mission-steps h4 {
  margin: 0 0 8px;
  font-size: 0.82rem;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.training-mission-steps ol {
  margin: 0;
  padding-left: 20px;
  color: #cbd5e1;
  font-size: 0.85rem;
  line-height: 1.5;
}

.instructor-mission-controls {
  margin-top: 14px;
  padding: 14px;
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.18);
  border-radius: 10px;
}

.instructor-controls-heading {
  margin: 0 0 12px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.instructor-controls-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.instructor-controls-row:last-child { margin-bottom: 0; }

.instructor-mission-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.85rem;
  cursor: pointer;
}
.instructor-mission-toggle input[type="checkbox"] {
  accent-color: #38bdf8;
}

.instructor-mission-date {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 160px;
  font-size: 0.75rem;
  color: #94a3b8;
}
.instructor-mission-date input {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(71, 85, 105, 0.5);
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
  font-size: 0.85rem;
}

.instructor-mission-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.instructor-mission-btn {
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.instructor-mission-btn--edit {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.4);
  color: #7dd3fc;
}
.instructor-mission-btn--edit:hover {
  background: rgba(56, 189, 248, 0.3);
}

.instructor-mission-btn--quiz {
  background: rgba(168, 85, 247, 0.18);
  border-color: rgba(168, 85, 247, 0.4);
  color: #d8b4fe;
}
.instructor-mission-btn--quiz:hover {
  background: rgba(168, 85, 247, 0.3);
}

.instructor-mission-btn--delete {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}
.instructor-mission-btn--delete:hover {
  background: rgba(239, 68, 68, 0.28);
}

/* Mission Editor Modal specifics */
.mission-editor-card {
  max-width: 820px;
  width: 100%;
}
.mission-objective-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  min-width: 0;
}
.mission-objective-row .quiz-input {
  flex: 1;
  min-width: 0;
}
.mission-step-inline {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  min-width: 0;
}
.mission-step-inline > * {
  min-width: 0;
}

.mission-quiz-hint {
  font-size: 0.75rem;
  font-weight: 500;
  color: #94a3b8;
  margin-left: 8px;
}

.mission-quiz-enable-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #cbd5e1;
  cursor: pointer;
}
.mission-quiz-enable-toggle input[type="checkbox"] {
  accent-color: #38bdf8;
}

/* Boat Type Radio Buttons (Mission Editor) */
.boat-type-radios {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.boat-type-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.boat-type-option:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(56, 189, 248, 0.4);
}
.boat-type-option input[type="radio"] {
  accent-color: #38bdf8;
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.boat-type-option span {
  font-size: 0.9rem;
  color: #e2e8f0;
}

/* Boat Selection Modal (Student) */
.boat-selection-modal {
  max-width: 780px;
  width: 95%;
  padding: 32px;
  text-align: center;
}
.boat-selection-modal h2 {
  font-size: 1.8rem;
  margin-bottom: 8px;
  color: #f8fafc;
}
.boat-selection-desc {
  font-size: 0.95rem;
  color: #94a3b8;
  margin-bottom: 28px;
}

.boat-selection-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.boat-selection-card {
  position: relative;
  padding: 24px 18px;
  background: rgba(30, 41, 59, 0.5);
  border: 2px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: center;
}
.boat-selection-card:hover {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(56, 189, 248, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}
.boat-selection-card.selected {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
}
.boat-selection-card input[type="radio"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.boat-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.boat-icon {
  font-size: 3rem;
  margin-bottom: 8px;
}
.boat-card-content h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0;
}
.boat-length {
  font-size: 0.85rem;
  font-weight: 500;
  color: #38bdf8;
  margin: 4px 0;
}
.boat-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.4;
  margin: 0;
}

.boat-selection-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.boat-selection-actions button {
  min-width: 140px;
}
.mission-quiz-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 10px;
}

.instructor-setting-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
  color: #e2e8f0;
  font-size: 0.84rem;
  line-height: 1.4;
  cursor: pointer;
}

.instructor-setting-toggle input {
  margin-top: 3px;
  flex-shrink: 0;
}

.instructor-level-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.instructor-level-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.55);
  border: 1px solid rgba(51, 65, 85, 0.55);
}

.instructor-level-row--locked {
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(69, 10, 10, 0.25);
}

.instructor-level-info {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.instructor-level-info strong {
  color: #f8fafc;
  font-size: 0.82rem;
}

.instructor-level-title {
  color: #cbd5e1;
  font-size: 0.8rem;
}

.instructor-level-category {
  color: #64748b;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.instructor-level-lock {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.instructor-level-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.instructor-level-date {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 600;
}

.instructor-level-date .date-input {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 6px;
  padding: 6px 10px;
  color: #e2e8f0;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  outline: none;
  transition: border-color 0.2s ease;
}

.instructor-level-date .date-input:focus {
  border-color: rgba(56, 189, 248, 0.6);
}

.instructor-quiz-btn {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 6px;
  padding: 6px 12px;
  color: #60a5fa;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.instructor-quiz-btn:hover {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.6);
}

/* Quiz Manager Modal */
.quiz-manager-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(8px);
}

.quiz-manager-card {
  width: min(600px, 90vw);
  max-height: 80vh;
  overflow-y: auto;
  padding: 32px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.quiz-manager-card h2 {
  margin: 0 0 24px;
  color: #f8fafc;
  font-size: 1.4rem;
  font-weight: 700;
}

.quiz-manager-content {
  display: grid;
  gap: 24px;
}

.quiz-manager-section h3 {
  margin: 0 0 12px;
  color: #cbd5e1;
  font-size: 1rem;
  font-weight: 600;
}

.assigned-quiz-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.assigned-quiz-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(51, 65, 85, 0.3);
  border: 1px solid rgba(100, 116, 139, 0.2);
  border-radius: 8px;
}

.quiz-name {
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 600;
}

.quiz-questions {
  color: #94a3b8;
  font-size: 0.8rem;
}

.quiz-empty-state {
  color: #64748b;
  font-size: 0.85rem;
  font-style: italic;
  text-align: center;
  padding: 24px;
}

.quiz-manager-hint {
  padding: 16px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.quiz-manager-hint p {
  margin: 0;
  color: #93c5fd;
  font-size: 0.85rem;
  line-height: 1.6;
}

.quiz-manager-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Quiz Editor Modal */
.quiz-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  backdrop-filter: blur(10px);
  overflow-y: auto;
  padding: 20px;
}

.quiz-editor-card {
  width: min(800px, 95vw);
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(100, 116, 139, 0.4);
  border-radius: 16px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
  box-sizing: border-box;
}
.quiz-editor-card *,
.quiz-editor-card *::before,
.quiz-editor-card *::after {
  box-sizing: border-box;
}

.quiz-editor-card h2 {
  margin: 0 0 28px;
  color: #f8fafc;
  font-size: 1.6rem;
  font-weight: 700;
}

.quiz-editor-content {
  display: grid;
  gap: 28px;
}

.quiz-editor-section {
  display: grid;
  gap: 16px;
}

.quiz-editor-section h3 {
  margin: 0 0 12px;
  color: #cbd5e1;
  font-size: 1.1rem;
  font-weight: 600;
}

.quiz-field {
  display: grid;
  gap: 8px;
}

.quiz-field > span:first-child,
.quiz-field-label {
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 600;
}

.field-hint {
  color: #64748b;
  font-size: 0.75rem;
  font-style: italic;
}

.quiz-input,
.quiz-textarea,
.quiz-select {
  width: 100%;
  max-width: 100%;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
  display: block;
}

.quiz-textarea {
  resize: vertical;
  min-height: 60px;
}

.quiz-input:focus,
.quiz-textarea:focus,
.quiz-select:focus {
  border-color: rgba(56, 189, 248, 0.6);
}

.quiz-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.quiz-create-btn,
.quiz-add-question-btn {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 6px;
  padding: 8px 16px;
  color: #4ade80;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-create-btn:hover,
.quiz-add-question-btn:hover {
  background: rgba(34, 197, 94, 0.25);
  border-color: rgba(34, 197, 94, 0.6);
}

.question-editor-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 12px;
  padding: 20px;
  display: grid;
  gap: 16px;
  min-width: 0;
}

.mission-buoy-card {
  max-width: 100%;
  overflow: hidden;
}

.mission-buoy-preview {
  display: block;
  width: 100%;
  max-width: 100%;
  height: min(360px, 45vh);
  object-fit: contain;
  object-position: center;
  border-radius: 8px;
  border: 1px solid rgba(100, 116, 139, 0.3);
  background: rgba(15, 23, 42, 0.6);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-number {
  color: #60a5fa;
  font-size: 0.9rem;
  font-weight: 700;
}

.question-remove-btn {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  padding: 4px 10px;
  color: #f87171;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.question-remove-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
}

.mc-options {
  display: grid;
  gap: 10px;
}

/* Multiple Choice Options Header */
.mc-options-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.correct-answer-hint {
  font-size: 0.75rem;
  color: #22c55e;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.mc-option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.radio-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.correct-radio {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #22c55e;
}

.correct-indicator {
  font-size: 0.75rem;
  font-weight: 600;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 4px;
  padding: 2px 8px;
  white-space: nowrap;
}

.mc-option-input {
  flex: 1;
  min-width: 0;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  color: #e2e8f0;
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
}

.mc-option-input:focus {
  border-color: rgba(56, 189, 248, 0.6);
}

.mc-option-remove {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  color: #f87171;
  font-size: 0.8rem;
  cursor: pointer;
}

.mc-add-option-btn {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  color: #60a5fa;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  justify-self: start;
}

.tf-options {
  display: flex;
  gap: 16px;
  align-items: center;
}

.tf-option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  cursor: pointer;
}

.quiz-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quiz-item-actions {
  display: flex;
  gap: 8px;
}

.quiz-edit-btn,
.quiz-delete-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-edit-btn {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.quiz-edit-btn:hover {
  background: rgba(59, 130, 246, 0.25);
}

.quiz-delete-btn {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.quiz-delete-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

.quiz-editor-actions {
  margin-top: 28px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.quiz-save-btn {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 8px;
  padding: 12px 24px;
  color: #4ade80;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-save-btn:hover {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.6);
  transform: translateY(-2px);
}

.quiz-cancel-btn {
  background: rgba(100, 116, 139, 0.15);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  padding: 12px 24px;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-cancel-btn:hover {
  background: rgba(100, 116, 139, 0.25);
}

/* Student Quiz Section in Training Cards */
.module-quizzes-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(51, 65, 85, 0.5);
}

.quiz-section-title {
  margin: 0 0 12px;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.module-quiz-list {
  display: grid;
  gap: 10px;
}

.module-quiz-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.module-quiz-card:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(100, 116, 139, 0.4);
}

.quiz-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quiz-card-title {
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 600;
}

.quiz-card-meta {
  color: #94a3b8;
  font-size: 0.75rem;
}

.quiz-card-status {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.quiz-status-not-started {
  background: rgba(100, 116, 139, 0.2);
  color: #94a3b8;
}

.quiz-status-pending {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.quiz-status-graded {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.quiz-take-btn,
.quiz-results-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.quiz-take-btn {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #60a5fa;
}

.quiz-take-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.6);
}

.quiz-results-btn {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.quiz-results-btn:hover {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.6);
}

/* Quiz Taking Modal */
.quiz-taking-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100001;
  overflow-y: auto;
  padding: 20px;
}

.quiz-taking-shell {
  width: min(900px, 95vw);
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(100, 116, 139, 0.4);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
}

.quiz-taking-header {
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.3);
}

.quiz-taking-header h1 {
  margin: 0 0 8px;
  color: #f8fafc;
  font-size: 1.8rem;
  font-weight: 700;
}

.quiz-taking-header p {
  margin: 0;
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.6;
}

.quiz-taking-questions {
  display: grid;
  gap: 32px;
  margin-bottom: 32px;
}

.quiz-taking-question {
  padding: 24px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 12px;
}

.quiz-taking-question h3 {
  margin: 0 0 20px;
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.6;
}

.quiz-answer-options {
  display: grid;
  gap: 12px;
}

.quiz-answer-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-answer-option:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(100, 116, 139, 0.5);
}

.quiz-answer-option input[type="radio"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.quiz-answer-option span {
  color: #cbd5e1;
  font-size: 0.95rem;
  flex: 1;
}

.quiz-answer-fib {
  margin-top: 8px;
}

.quiz-fib-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.8);
  border: 2px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  padding: 14px 16px;
  color: #e2e8f0;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.quiz-fib-input:focus {
  border-color: rgba(59, 130, 246, 0.6);
}

.quiz-taking-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid rgba(100, 116, 139, 0.3);
}

.quiz-submit-btn {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 8px;
  padding: 14px 32px;
  color: #4ade80;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-submit-btn:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.6);
  transform: translateY(-2px);
}

.quiz-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Quiz Results Modal */
.quiz-results-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100002;
  overflow-y: auto;
  padding: 20px;
}

.quiz-results-shell {
  width: min(900px, 95vw);
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(100, 116, 139, 0.4);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
}

.quiz-submission-confirmation {
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.submission-success-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 32px;
  background: rgba(34, 197, 94, 0.08);
  border: 2px solid rgba(74, 222, 128, 0.4);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
}

.success-icon {
  width: 64px;
  height: 64px;
  color: #4ade80;
  flex-shrink: 0;
}

.submission-success-box h2 {
  font-size: 24px;
  font-weight: 600;
  color: #4ade80;
  margin: 0;
}

.submission-message {
  font-size: 16px;
  color: #cbd5e1;
  margin: 8px 0 0;
}

.submission-note {
  font-size: 14px;
  color: #94a3b8;
  margin: 8px 0 0;
}

.quiz-results-shell h1 {
  margin: 0 0 24px;
  color: #f8fafc;
  font-size: 1.8rem;
  font-weight: 700;
}

.quiz-results-summary {
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 12px;
  display: grid;
  gap: 16px;
}

.results-score-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  border-radius: 12px;
  gap: 8px;
}

.score-pass {
  background: rgba(34, 197, 94, 0.15);
  border: 2px solid rgba(34, 197, 94, 0.4);
}

.score-fail {
  background: rgba(239, 68, 68, 0.15);
  border: 2px solid rgba(239, 68, 68, 0.4);
}

.score-label {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.score-value {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
}

.score-pass .score-value {
  color: #4ade80;
}

.score-fail .score-value {
  color: #f87171;
}

.score-status {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.score-pass .score-status {
  color: #4ade80;
}

.score-fail .score-status {
  color: #f87171;
}

.results-feedback {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.95rem;
  line-height: 1.6;
  padding: 16px;
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.quiz-results-breakdown {
  margin-bottom: 32px;
}

.quiz-results-breakdown h3 {
  margin: 0 0 20px;
  color: #cbd5e1;
  font-size: 1.2rem;
  font-weight: 600;
}

.results-question {
  padding: 20px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 2px solid transparent;
}

.question-correct {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.question-incorrect {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.results-question h4 {
  margin: 0 0 12px;
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.6;
}

.your-answer {
  margin: 0 0 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 12px;
}

.answer-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

.question-correct .answer-icon {
  color: #4ade80;
}

.question-incorrect .answer-icon {
  color: #f87171;
}

.correct-answer-reveal {
  margin: 0;
  padding: 12px;
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid rgba(59, 130, 246, 0.5);
  border-radius: 4px;
  color: #93c5fd;
  font-size: 0.9rem;
}

.quiz-results-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid rgba(100, 116, 139, 0.3);
}

.quiz-retake-btn {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 8px;
  padding: 12px 24px;
  color: #60a5fa;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-retake-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.6);
}

.quiz-close-btn {
  background: rgba(100, 116, 139, 0.2);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  padding: 12px 24px;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-close-btn:hover {
  background: rgba(100, 116, 139, 0.3);
}

.instructor-table-wrap {
  overflow-x: auto;
}

.instructor-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.instructor-table th,
.instructor-table td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(51, 65, 85, 0.55);
}

.instructor-table th {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.instructor-table td {
  color: #e2e8f0;
}

.instructor-table tbody tr:last-child td {
  border-bottom: none;
}

.instructor-review-link {
  border: none;
  background: none;
  color: #60a5fa;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.instructor-review-link:hover {
  color: #93c5fd;
}

.instructor-row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.instructor-reset-link {
  border: none;
  background: none;
  color: #f87171;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.instructor-reset-link:hover {
  color: #fca5a5;
}

.instructor-review-overlay {
  position: fixed;
  inset: 0;
  z-index: 93000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(6px);
  cursor: default;
}

.instructor-review-modal {
  width: min(680px, 94vw);
  max-height: min(88vh, 820px);
  overflow: auto;
  padding: 22px 22px 20px;
  border-radius: 14px;
  background: #0f172a;
  border: 1px solid rgba(51, 65, 85, 0.75);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  display: grid;
  gap: 16px;
}

.instructor-review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.instructor-review-eyebrow {
  margin: 0 0 4px;
  color: #60a5fa;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.instructor-review-header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.45rem;
}

.instructor-review-close {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.instructor-review-close:hover {
  color: #e2e8f0;
}

.instructor-review-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.instructor-review-stat {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(11, 17, 27, 0.75);
  border: 1px solid rgba(51, 65, 85, 0.55);
  display: grid;
  gap: 4px;
}

.instructor-review-stat span {
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.instructor-review-stat strong {
  color: #f8fafc;
  font-size: 1.2rem;
}

.instructor-review-sessions h3 {
  margin: 0 0 10px;
  color: #f8fafc;
  font-size: 0.95rem;
}

.instructor-review-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 0.88rem;
}

/* Quiz Attempts (instructor review modal) */
.instructor-review-quizzes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.6);
  border-radius: 12px;
  margin-top: 16px;
}
.instructor-review-quizzes h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
}

.quiz-attempt-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-attempt-card {
  border: 1px solid rgba(71, 85, 105, 0.4);
  border-radius: 10px;
  padding: 14px 16px;
  background: rgba(15, 23, 42, 0.65);
}
.quiz-attempt-card--pass {
  border-left: 4px solid #22c55e;
}
.quiz-attempt-card--fail {
  border-left: 4px solid #ef4444;
}

.quiz-attempt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.quiz-attempt-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.quiz-attempt-mission {
  font-size: 0.95rem;
  color: #f8fafc;
}

.quiz-attempt-quiz-name {
  font-size: 0.82rem;
  color: #94a3b8;
}

.quiz-attempt-date {
  font-size: 0.75rem;
  color: #64748b;
}

.quiz-attempt-score-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}
.quiz-attempt-score {
  font-size: 1.35rem;
  font-weight: 800;
  color: #f8fafc;
}
.quiz-attempt-card--pass .quiz-attempt-score { color: #4ade80; }
.quiz-attempt-card--fail .quiz-attempt-score { color: #f87171; }

.quiz-attempt-status {
  font-size: 0.7rem;
  letter-spacing: 1px;
  font-weight: 700;
}
.quiz-attempt-card--pass .quiz-attempt-status { color: #4ade80; }
.quiz-attempt-card--fail .quiz-attempt-status { color: #f87171; }

.quiz-attempt-count {
  font-size: 0.72rem;
  color: #64748b;
}

.quiz-attempt-questions {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-attempt-question {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(71, 85, 105, 0.3);
}
.quiz-attempt-question--correct {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(22, 78, 52, 0.18);
}
.quiz-attempt-question--wrong {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(127, 29, 29, 0.15);
}

.quiz-attempt-question-prompt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #f1f5f9;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.quiz-attempt-icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.quiz-attempt-answers {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 26px;
}
.quiz-attempt-answer-row {
  display: flex;
  gap: 8px;
  font-size: 0.82rem;
}
.quiz-attempt-answer-label {
  min-width: 70px;
  color: #94a3b8;
  font-weight: 600;
}
.quiz-attempt-answer-value {
  color: #e2e8f0;
}
.quiz-attempt-correct-value {
  color: #4ade80;
  font-weight: 600;
}
.quiz-attempt-wrong-value {
  color: #f87171;
  text-decoration: line-through;
  text-decoration-color: rgba(239, 68, 68, 0.6);
}

/* Performance Reports */
.instructor-review-performance {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.6);
  border-radius: 12px;
  margin-top: 16px;
}
.instructor-review-performance h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
}

.performance-report-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.performance-report-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.4);
}
.performance-report-card--pass { border-left: 4px solid #22c55e; }
.performance-report-card--fail { border-left: 4px solid #ef4444; }

.performance-report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.performance-report-mission {
  display: block;
  color: #f8fafc;
  font-size: 0.95rem;
}
.performance-report-date {
  display: block;
  color: #64748b;
  font-size: 0.75rem;
  margin-top: 2px;
}

.performance-report-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}
.performance-report-total-score {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f8fafc;
}
.performance-report-card--pass .performance-report-total-score { color: #4ade80; }
.performance-report-card--fail .performance-report-total-score { color: #f87171; }
.performance-report-total-status {
  font-size: 0.7rem;
  letter-spacing: 1px;
  font-weight: 700;
  color: #94a3b8;
}

.performance-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.performance-metric-tile {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(71, 85, 105, 0.3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.performance-metric-label {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.2px;
}
.performance-metric-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #f8fafc;
}

.metric-color--pass { color: #4ade80; }
.metric-color--warn { color: #fbbf24; }
.metric-color--fail { color: #f87171; }
.metric-color--muted { color: #64748b; }

.performance-remarks {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.06);
  border: 1px solid rgba(56, 189, 248, 0.15);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.performance-remarks-label {
  color: #7dd3fc;
  font-size: 0.82rem;
  font-weight: 700;
  flex-shrink: 0;
}
.performance-remarks-text {
  color: #cbd5e1;
  font-size: 0.85rem;
  line-height: 1.5;
  flex: 1;
  min-width: 0;
}

.instructor-review-note {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 0.8rem;
}

.instructor-awards-panel {
  padding-top: 8px;
  border-top: 1px solid rgba(51, 65, 85, 0.55);
  display: grid;
  gap: 12px;
}

.instructor-awards-panel h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1rem;
}

.instructor-awards-subtitle {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.instructor-award-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.instructor-award-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(11, 17, 27, 0.75);
  border: 1px solid rgba(51, 65, 85, 0.55);
}

.instructor-award-item--eligible {
  border-color: rgba(74, 222, 128, 0.35);
}

.instructor-award-item--earned {
  border-color: rgba(56, 189, 248, 0.35);
}

.instructor-award-icon {
  font-size: 1.35rem;
  line-height: 1;
  flex-shrink: 0;
}

.instructor-award-info {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}

.instructor-award-info strong {
  color: #e2e8f0;
  font-size: 0.86rem;
}

.instructor-award-desc {
  font-size: 0.75rem;
  color: #64748b;
}

.instructor-award-eligibility {
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.35;
}

.instructor-award-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  color: #0f172a;
  background: #38bdf8;
}

.instructor-award-btn:hover:not(:disabled) {
  background: #7dd3fc;
}

.instructor-award-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.instructor-award-btn--gold {
  background: #fbbf24;
  color: #422006;
}

.instructor-award-btn--gold:hover:not(:disabled) {
  background: #fcd34d;
}

.instructor-revoke-btn {
  flex-shrink: 0;
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: transparent;
  color: #fca5a5;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.instructor-revoke-btn:hover {
  background: rgba(239, 68, 68, 0.12);
}

.badge-card-by {
  font-size: 0.6rem;
  color: #7dd3fc;
  line-height: 1.2;
}

.certificate-doc-issuer {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #57534e;
  font-style: italic;
}

.instructor-review-session-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.instructor-review-session-item {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(11, 17, 27, 0.75);
  border: 1px solid rgba(51, 65, 85, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.instructor-review-session-content {
  display: grid;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.instructor-reset-mission-btn {
  flex-shrink: 0;
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.15);
  color: #fca5a5;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.instructor-reset-mission-btn:hover {
  border-color: rgba(248, 113, 113, 0.7);
  background: rgba(127, 29, 29, 0.28);
}

.instructor-review-session-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.instructor-review-session-main strong {
  color: #e2e8f0;
  font-size: 0.92rem;
}

.instructor-review-session-code {
  color: #38bdf8;
  font-size: 0.74rem;
  font-weight: 600;
}

.instructor-review-session-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.instructor-review-session-score {
  font-weight: 700;
}

.instructor-review-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.instructor-reset-progress-btn {
  border: 1px solid rgba(248, 113, 113, 0.45);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.18);
  color: #fca5a5;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 10px 16px;
  cursor: pointer;
}

.instructor-reset-progress-btn:hover {
  border-color: rgba(248, 113, 113, 0.75);
  background: rgba(127, 29, 29, 0.32);
}

.instructor-review-done-btn {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  font-size: 0.88rem;
  padding: 10px 16px;
  cursor: pointer;
}

.instructor-review-done-btn:hover {
  border-color: rgba(148, 163, 184, 0.6);
  background: rgba(30, 41, 59, 0.5);
}

.instructor-recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.instructor-recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(11, 17, 27, 0.65);
  border: 1px solid rgba(51, 65, 85, 0.45);
}

.instructor-recent-label {
  color: #cbd5e1;
  font-size: 0.92rem;
}

.instructor-recent-score {
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
}

.instructor-recent-score--pass {
  color: #4ade80;
}

.instructor-recent-score--fail {
  color: #f87171;
}

@media (max-width: 720px) {
  .dashboard-stats-cards {
    grid-template-columns: 1fr;
  }

  .dashboard-mission-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .instructor-console-header {
    flex-direction: column;
    align-items: stretch;
  }

  .instructor-recent-item {
    flex-direction: column;
    align-items: flex-start;
  }
}

.left-nav {
  padding: 16px;
  display: grid;
  gap: 10px;
  align-content: start;
}

.left-nav h3 {
  margin: 0 0 8px;
  color: #e2e8f0;
}

.nav-btn {
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.65);
  color: #cbd5e1;
  text-align: left;
  padding: 9px 10px;
  cursor: pointer;
}

.nav-btn.active {
  background: rgba(37, 99, 235, 0.35);
  color: #e2e8f0;
}

.nav-btn.active:disabled {
  opacity: 1;
  cursor: default;
}

.dashboard-main {
  padding: 18px;
  overflow: auto;
}

.dashboard-main h2 {
  margin-top: 0;
  color: #f8fafc;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.kpi-card {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 6px;
}

.kpi-card span { color: #93c5fd; font-size: 0.75rem; }
.kpi-card strong { color: #f8fafc; font-size: 1.05rem; }

.progress-wrap {
  margin: 14px 0;
  height: 10px;
  background: rgba(30, 41, 59, 0.9);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22d3ee, #2563eb);
  border-radius: inherit;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mini-chart {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
}

.mini-chart h4 {
  margin: 0 0 10px;
  color: #cbd5e1;
}

.bars {
  height: 140px;
  display: flex;
  align-items: end;
  gap: 8px;
}

.bar {
  flex: 1;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, #38bdf8, #1e40af);
}

.bar.alt {
  background: linear-gradient(180deg, #22d3ee, #0891b2);
}

.radar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.radar-list li {
  display: flex;
  justify-content: space-between;
  color: #cbd5e1;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.heatmap-grid span {
  aspect-ratio: 1;
  border-radius: 6px;
  background: #0ea5e9;
}

.missions-shell {
  width: min(1080px, 95vw);
  padding: 20px;
}

.missions-shell h2 {
  margin-top: 0;
  color: #f8fafc;
}

.mission-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0 18px;
}

.mission-card {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.mission-card h3 { margin: 0; color: #f8fafc; }
.mission-card p { margin: 0; color: #cbd5e1; font-size: 0.84rem; min-height: 42px; }

.mission-meta {
  display: flex;
  justify-content: space-between;
  color: #93c5fd;
  font-size: 0.74rem;
}

.compass-hud-top {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90500;
  width: min(560px, 52vw);
  pointer-events: none;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.55));
}

.compass-strip-viewport {
  position: relative;
  height: 44px;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(8, 16, 32, 0.92);
  border: 1px solid rgba(250, 204, 21, 0.42);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 4px 18px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px);
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}

.compass-strip-center-tick {
  position: absolute;
  left: 50%;
  top: 4px;
  bottom: 4px;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(250, 204, 21, 0.15), #facc15 45%, rgba(250, 204, 21, 0.15));
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.65);
  z-index: 2;
  pointer-events: none;
}

.compass-strip-center-tick::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -2px;
  width: 8px;
  height: 8px;
  transform: translateX(-50%);
  border-radius: 2px;
  background: #facc15;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.9);
}

.compass-strip-track {
  position: relative;
  height: 100%;
  min-width: 100%;
  padding-top: 4px;
  transition: transform 0.12s linear;
  will-change: transform;
}

.strip-mark {
  position: absolute;
  bottom: 3px;
  width: 52px;
  margin-left: -26px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  line-height: 1.1;
}

.strip-mark.major {
  color: #fde047;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.strip-mark i {
  display: block;
  font-style: normal;
  font-size: 0.62rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-top: 2px;
}

.compass-strip-heading {
  margin-top: 6px;
  text-align: center;
  font-size: 0.88rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
}

.achievement-popup {
  position: absolute;
  right: 12px;
  top: 180px;
  z-index: 91000;
  width: min(200px, 40vw);
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.45);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
}

.achievement-popup h4 {
  margin: 0;
  color: #38bdf8;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.achievement-popup p {
  margin: 6px 0 0;
  color: #e2e8f0;
}

.training-complete-toast {
  box-sizing: border-box;
  position: fixed;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 93500;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: min(440px, calc(100vw - 32px));
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(56, 189, 248, 0.45);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.training-complete-toast--success {
  border-color: rgba(74, 222, 128, 0.55);
  box-shadow: 0 20px 50px rgba(34, 197, 94, 0.2);
}

.training-complete-toast--fail {
  border-color: rgba(248, 113, 113, 0.5);
}

.training-complete-toast--review {
  border-color: rgba(250, 204, 21, 0.5);
}

.training-complete-toast-icon {
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.training-complete-toast-body {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 600px), (max-height: 480px) {
  .training-complete-toast {
    top: 16px;
  }
}

.training-complete-toast-body h4 {
  margin: 0;
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 800;
}

.training-complete-toast-body p {
  margin: 4px 0 0;
  color: #cbd5e1;
  font-size: 0.88rem;
  line-height: 1.35;
}

.anchor-warning {
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 91001;
  background: rgba(220, 38, 38, 0.95);
  border: 3px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  padding: 20px 40px;
  box-shadow: 0 12px 40px rgba(220, 38, 38, 0.6);
  animation: pulse-warning 0.5s ease-in-out infinite alternate;
}

@keyframes pulse-warning {
  from {
    transform: translateX(-50%) scale(1);
    box-shadow: 0 12px 40px rgba(220, 38, 38, 0.6);
  }
  to {
    transform: translateX(-50%) scale(1.05);
    box-shadow: 0 16px 50px rgba(220, 38, 38, 0.8);
  }
}

.anchor-warning p {
  margin: 0;
  color: #fff;
  font-size: 1.4rem;
  font-weight: 800;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.island-collision-warning {
  bottom: 190px;
  background: rgba(234, 88, 12, 0.95);
  border-color: rgba(255, 237, 213, 0.75);
  box-shadow: 0 12px 40px rgba(234, 88, 12, 0.55);
}

.island-collision-warning p {
  text-transform: none;
  font-size: 1.15rem;
  letter-spacing: 0.02em;
}

.mission-objective-box {
  position: fixed;
  top: env(safe-area-inset-top, 10px);
  right: 10px;
  z-index: 90500;
  width: min(320px, 28vw);
  max-width: calc(100% - 20px);
  /* keep the panel fully on-screen: viewport height minus top offset and 70px for the bottom HUD */
  max-height: min(360px, calc(100dvh - env(safe-area-inset-top, 10px) - 70px));
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(250, 204, 21, 0.28);
  border-radius: 8px;
  padding: 8px 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.objective-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.objective-body {
  margin-top: 6px;
  overflow: hidden; /* default: clamped */
}

/* Make mission box responsive on small viewports and allow internal scrolling if content is long */
@media (max-width: 720px) {
  .mission-objective-box {
    left: 10px;
    right: 10px;
    width: auto;
    max-width: calc(100% - 20px);
    top: calc(env(safe-area-inset-top, 10px) + 6px);
  }
  .mission-objective-box .objective-body {
    max-height: calc(min(360px, calc(100dvh - env(safe-area-inset-top, 10px) - 70px)) - 56px);
    overflow-y: auto;
  }
}

/* Ensure on larger screens the body can scroll if needed */
.mission-objective-box .objective-body {
  max-height: calc(min(360px, calc(100dvh - env(safe-area-inset-top, 10px) - 70px)) - 56px);
  overflow-y: auto;
}

.clamp-2,
.clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.clamp-2 {
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.clamp-3 {
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.training-objective-current {
  margin: 6px 0 0;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.18);
  display: grid;
  gap: 3px;
}

.training-objective-label {
  color: rgba(148, 163, 184, 0.95);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

.training-objective-text {
  color: #e2e8f0;
  font-size: 0.76rem;
  line-height: 1.25;
}

.objective-label {
  margin: 0;
  color: #facc15;
  font-size: 0.55rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.objective-arrow {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #93c5fd;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.objective-arrow.collapsed {
  transform: rotate(-90deg);
}

.mission-objective-box h4 {
  margin: 2px 0 4px;
  color: #f8fafc;
  font-size: 0.78rem;
}

.objective-text {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.66rem;
  line-height: 1.3;
}

.training-review-note {
  margin: 0 0 8px;
  color: #93c5fd;
  font-size: 0.62rem;
  line-height: 1.35;
}

.training-progress-mini {
  display: grid;
  gap: 4px;
  margin-bottom: 8px;
}

.training-step-counter-mini {
  font-size: 0.62rem;
  color: #94a3b8;
}

.training-elapsed-mini {
  font-size: 0.6rem;
  color: #64748b;
  line-height: 1.35;
}

.waypoint-hint {
  margin: 6px 0 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #93c5fd;
  font-size: 0.62rem;
  line-height: 1.4;
  max-width: 280px;
  white-space: pre-line;
}

.training-heading-target {
  margin: 4px 0 0;
  color: #fbbf24;
  font-size: 0.64rem;
  font-weight: 700;
}

.training-compass-coach {
  margin: 6px 0 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.28);
  color: #bae6fd;
  font-size: 0.72rem;
  line-height: 1.45;
  max-width: 300px;
}

.training-all-steps-mini {
  margin: 12px 0 0;
  padding: 10px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(100, 116, 139, 0.3);
  max-width: 300px;
}

.training-all-steps-heading {
  margin: 0 0 8px;
  color: #94a3b8;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.training-all-steps-list {
  margin: 0;
  padding-left: 20px;
  list-style: decimal;
}

.training-all-steps-list li {
  margin: 6px 0;
  color: #cbd5e1;
  font-size: 0.68rem;
  line-height: 1.4;
  padding-left: 4px;
}

.training-all-steps-list li.step-completed {
  color: #64748b;
  text-decoration: line-through;
  opacity: 0.6;
}

.training-all-steps-list li.step-current {
  color: #fbbf24;
  font-weight: 600;
  background: rgba(251, 191, 36, 0.1);
  padding: 4px 4px 4px 8px;
  margin-left: -4px;
  border-radius: 4px;
  border-left: 3px solid #fbbf24;
}

.tactical-minimap {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 90600;
  width: clamp(156px, 19vw, 208px);
  height: clamp(156px, 19vw, 208px);
  pointer-events: none;
  border-radius: 50%;
  overflow: visible;
  background: rgba(8, 16, 32, 0.92);
  border: 2px solid rgba(56, 189, 248, 0.42);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 10px 28px rgba(0, 0, 0, 0.55);
  filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.5));
}

@media (min-width: 768px) {
  .tactical-minimap--helm-screen {
    /* Keep the canvas mounted as the tablet's source. Phones retain the HUD
       because the physical tablet can be outside the narrow cockpit view. */
    visibility: hidden;
  }
}

.tactical-minimap-label {
  position: absolute;
  top: 7px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #7dd3fc;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  pointer-events: none;
}

.tactical-minimap-canvas {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.nav-hud-right {
  position: fixed;
  right: 10px;
  bottom: 10px;
  top: auto;
  z-index: 90500;
  width: clamp(112px, 16vw, 180px);
  max-width: calc(100vw - 20px);
  max-height: calc(100vh - 24px);
  display: grid;
  gap: 10px;
  pointer-events: auto;
  /* never let the HUD spill past the viewport or force a horizontal slider; wrap/scroll vertically only */
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  padding: 6px 6px;
  box-sizing: border-box;
}

.nav-hud-right::-webkit-scrollbar {
  width: 4px;
}

.nav-hud-right::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 999px;
}

/* Shrink the HUD on short viewports (e.g. landscape phones) so it fits without scrolling */
@media (max-height: 480px) {
  .nav-hud-right {
    gap: 5px;
    padding: 4px;
  }

  .nav-hud-right .mini-gauge {
    max-width: 46px;
  }

  .nav-hud-right .compass-card {
    width: clamp(40px, 5.5vmin, 52px);
    margin-top: 0;
  }

  .nav-hud-right .speed-pill,
  .nav-hud-right .waypoint-distance-readout {
    padding: 1px 6px;
    font-size: 0.52rem;
  }

  .nav-hud-right .data-pill--icon {
    width: 24px;
    height: 20px;
  }

  .nav-hud-right .icon-btn {
    min-height: 22px;
  }
}

@media (max-width: 720px) {
  .nav-hud-right {
    right: 8px;
    bottom: 8px;
    left: auto;
    transform: none;
    width: min(46vw, 180px);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: flex-end;
    justify-content: flex-end;
    max-height: calc(100vh - 16px);
    overflow-y: auto;
    padding: 4px;
  }

  /* Keep the engine start button visible and prioritized */
  .nav-hud-right .engine-btn {
    order: -1;
    flex: 0 0 auto;
    min-width: 44px;
    align-self: center;
    z-index: 90600;
    visibility: visible;
    opacity: 1;
  }

  .nav-hud-right .mini-gauge {
    max-width: 56px;
  }

  .nav-hud-right .top-gauges {
    display: flex;
    gap: 6px;
    width: 100%;
    justify-content: space-between;
  }
}

/* For very narrow viewports, center the HUD so it never goes off-screen */
@media (max-width: 420px) {
  .nav-hud-right {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: min(92vw, 320px);
    max-height: calc(100vh - 16px);
    overflow-y: auto;
    justify-content: center;
    gap: 4px;
    padding: 6px 8px;
  }

  .nav-hud-right .mini-gauge {
    max-width: 48px;
  }

  .nav-hud-right .engine-btn {
    order: -1;
    min-width: 40px;
    z-index: 90600;
    align-self: center;
  }
}

.top-gauges {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 5px;
}

.mini-gauge {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 68px;
  justify-self: center;
  aspect-ratio: 1;
  background: rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
  z-index: 3; /* Keep above the heading compass visuals when space is tight */
}

.mini-gauge svg {
  width: 100%;
  height: 100%;
}

.g-bg {
  fill: none;
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 6;
}

.g-ring {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 220;
  stroke-dashoffset: 35;
}

.g-ring.roll { stroke: #22d3ee; }
.g-ring.pitch { stroke: #f43f5e; }

.mini-gauge-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}

.mini-gauge-center span {
  color: #94a3b8;
  font-size: 0.48rem;
  text-transform: uppercase;
}

.mini-gauge-center strong {
  color: #f8fafc;
  font-size: 0.62rem;
}

.speed-pill {
  justify-self: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255,255,255,0.12);
  color: #f8fafc;
  font-size: 0.62rem;
}

.compass-card {
  position: relative;
  width: clamp(56px, 6.8vmin, 72px);
  aspect-ratio: 1;
  justify-self: center;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(56, 189, 248, 0.28);
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  z-index: 1;
  margin-top: 4px; /* Ensure it never intrudes into the roll/pitch row */
}

.compass-face {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 78%;
  height: 78%;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  transform-origin: center center;
  transition: transform 0.12s linear;
}

.compass-face span {
  position: absolute;
  color: #94a3b8;
  font-size: 0.52rem;
  font-weight: 700;
  line-height: 1;
}

.compass-face .north {
  top: 6%;
  left: 50%;
  transform: translate(-50%, 0);
  color: #facc15 !important;
}

.compass-face .east {
  right: 6%;
  top: 50%;
  transform: translate(0, -50%);
}

.compass-face .south {
  bottom: 6%;
  left: 50%;
  transform: translate(-50%, 0);
}

.compass-face .west {
  left: 6%;
  top: 50%;
  transform: translate(0, -50%);
}

.compass-needle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  height: 34%;
  background: linear-gradient(180deg, #facc15 0%, #facc15 45%, #e2e8f0 100%);
  border-radius: 2px;
  transform-origin: 50% 100%;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 2;
}

.compass-heading-readout {
  position: absolute;
  left: 50%;
  bottom: 8%;
  transform: translateX(-50%);
  z-index: 3;
  font-size: 0.58rem;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 0.4px;
  pointer-events: none;
}

.waypoint-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #facc15;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.85);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 3;
}

.waypoint-distance-readout {
  justify-self: center;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.92);
  border: 1px solid rgba(250, 204, 21, 0.35);
  color: #f8fafc;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.data-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  max-width: 100%;
}

.data-pill {
  padding: 3px 6px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e2e8f0;
  font-size: 0.58rem;
  min-width: 0;
  max-width: 100%;
}

.data-pill--readout {
  cursor: default;
}

.data-pill--icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
}

.data-pill.anchor-active {
  border-color: rgba(56, 189, 248, 0.55);
  color: #7dd3fc;
  background: rgba(12, 45, 68, 0.82);
}

.data-pill.fishing-active {
  border-color: rgba(255, 120, 40, 0.55);
  color: #fdba74;
  background: rgba(67, 28, 8, 0.75);
}

.data-pill.fishing-ready {
  border-color: rgba(245, 158, 11, 0.65);
  color: #fcd34d;
  background: rgba(69, 32, 6, 0.88);
}

.pill-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 12px;
  height: 12px;
  padding: 0 3px;
  border-radius: 999px;
  background: #f97316;
  color: #fff;
  font-size: 0.48rem;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
}

.hud-icon {
  width: 16px;
  height: 16px;
  display: block;
  flex-shrink: 0;
}

.fishing-catch-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 94000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 28px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(56, 189, 248, 0.5);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  pointer-events: none;
  animation: fishing-pop 0.35s ease-out;
}

.fishing-catch-icon {
  font-size: 2.4rem;
  line-height: 1;
}

.fishing-catch-toast p {
  margin: 0;
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
}

.weather-notice-toast {
  position: fixed;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 94000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.45);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.weather-notice-icon {
  font-size: 1.35rem;
  line-height: 1;
}

.weather-notice-toast p {
  margin: 0;
  color: #e2e8f0;
  font-size: 0.92rem;
  font-weight: 600;
}

.helm-weather-actions {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 12;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.helm-gps-pill {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.7);
  color: #38bdf8;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.helm-weather-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.75);
  color: #e2e8f0;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.helm-weather-btn--active {
  border-color: rgba(96, 165, 250, 0.65);
  background: rgba(30, 58, 138, 0.55);
  color: #dbeafe;
}

@keyframes fishing-pop {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.icon-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 28px;
  min-height: 28px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  font-size: 0.68rem;
  padding: 4px 0;
  cursor: pointer;
  line-height: 1;
}

.icon-btn--off {
  color: #94a3b8;
}

.icon-btn--storm {
  color: #93c5fd;
  border-color: rgba(96, 165, 250, 0.45);
  background: rgba(15, 40, 72, 0.82);
}

.exit-hold-btn {
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  background: rgba(127, 29, 29, 0.26);
  color: #fee2e2;
  font-weight: 700;
  letter-spacing: 0.3px;
  font-size: 0.58rem;
  padding: 6px 8px;
  cursor: pointer;
}

/* Report Mission - CENTER OVERLAY */
.report-mission-overlay {
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  padding: 12px;
}

.report-mission-card {
  box-sizing: border-box;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
  border: 2px solid rgba(16, 185, 129, 0.6);
  border-radius: 16px;
  padding: clamp(20px, 4vw, 48px) clamp(20px, 5vw, 64px);
  text-align: center;
  width: min(600px, 100%);
  min-width: 0;
  max-height: calc(100vh - 24px);
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
  overflow-wrap: anywhere;
  animation: slideInBounce 0.6s ease-out;
}

.report-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

.report-mission-card h2 {
  color: #10b981;
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 12px 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.report-mission-card p {
  color: #d1fae5;
  font-size: 1.1rem;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.report-mission-btn-large {
  box-sizing: border-box;
  width: 100%;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  font-weight: 700;
  padding: 18px clamp(18px, 4vw, 48px);
  cursor: pointer;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
  transition: all 0.3s ease;
}

.report-mission-btn-large:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.6);
  background: linear-gradient(135deg, #059669, #047857);
}

.report-mission-btn-large:active {
  transform: translateY(-1px) scale(1.02);
}

@keyframes slideInBounce {
  0% {
    opacity: 0;
    transform: translateY(-100px) scale(0.8);
  }
  60% {
    opacity: 1;
    transform: translateY(10px) scale(1.05);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.main-menu-overlay {
  position: absolute;
  inset: 0;
  z-index: 90000;
  background: radial-gradient(circle at 20% 20%, rgba(30, 64, 175, 0.35), rgba(2, 6, 23, 0.92));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.main-menu-card {
  width: min(520px, 92vw);
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 28px 24px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.main-menu-card h1 {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  letter-spacing: 1px;
  color: #f8fafc;
}

.menu-subtitle {
  margin: 8px 0 18px;
  color: #93c5fd;
  font-size: 0.92rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.menu-actions {
  display: grid;
  gap: 10px;
}

.menu-btn {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 700;
  letter-spacing: 0.4px;
  cursor: pointer;
}

.menu-btn-play {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
}

.menu-btn-settings {
  background: rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.menu-btn-ghost {
  background: transparent;
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.menu-hint {
  margin-top: 14px;
  color: #94a3b8;
  font-size: 0.75rem;
}

.menu-settings-modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.85);
  padding: 18px;
  z-index: 1000;
}

.menu-settings-card {
  width: min(440px, 90vw);
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 18px;
  display: grid;
  gap: 14px;
}

.menu-settings-card h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #e2e8f0;
}

.menu-setting-row {
  display: grid;
  gap: 6px;
}

.menu-setting-row label {
  font-size: 0.78rem;
  color: #cbd5e1;
}

.menu-setting-row select {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
}

.menu-settings-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.menu-settings-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85rem;
  color: #e2e8f0;
}

.setting-row input[type="range"] {
  width: 120px;
  cursor: pointer;
}

.setting-row select {
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Fatal Error Hud Overlay */
.fatal-error-hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 680px;
  background: rgba(127, 29, 29, 0.95);
  backdrop-filter: blur(20px);
  border: 2px solid #ef4444;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  z-index: 100000;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.fatal-error-hud h2 {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  color: #fca5a5;
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  letter-spacing: 0.5px;
}

.fatal-error-hud p {
  font-size: 0.8rem;
  color: #fecaca;
  margin: 0 0 16px 0;
}

.fatal-error-hud pre {
  font-family: monospace;
  font-size: 0.72rem;
  background: rgba(0, 0, 0, 0.45);
  padding: 12px;
  border-radius: 8px;
  overflow: auto;
  max-height: 250px;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* Glassmorphism Styles Core */
.hud-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through canvas except on HUD items */
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 320px 1fr;
  grid-template-areas: 
    "header header"
    "sidebar main"
    "footer footer";
  padding: 16px;
  box-sizing: border-box;
}

.hud-overlay > * {
  pointer-events: auto; /* Re-enable pointer events on interactive UI cards */
}

.ui-priority-badge {
  background: rgba(14, 116, 144, 0.26);
  border-color: rgba(56, 189, 248, 0.45);
}

.ui-preview-note {
  margin-top: -8px;
  margin-bottom: 14px;
  font-size: 0.66rem;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 6px 8px;
  border-radius: 8px;
}

.ui-preview-panel input,
.ui-preview-panel .compass-slider {
  pointer-events: none;
  opacity: 0.55;
}

/* Dashboard Header */
.hud-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 24px;
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  margin-bottom: 12px;
}

.title-section h1 {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  letter-spacing: 2px;
  margin: 0;
  background: linear-gradient(135deg, #38bdf8, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title-section .subtitle {
  font-size: 0.72rem;
  letter-spacing: 1px;
  color: #94a3b8;
  text-transform: uppercase;
}

.quick-stats {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 6px 14px;
  border-radius: 10px;
  min-width: 80px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-badge.alert {
  background: rgba(220, 38, 38, 0.25);
  border-color: rgba(220, 38, 38, 0.6);
  color: #f87171;
  animation: pulse-alarm 1.5s infinite;
}

.audio-badge {
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  justify-content: center;
  user-select: none;
}

.audio-badge.active {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.6);
}

.audio-badge:hover {
  background: rgba(255, 255, 255, 0.08);
}

.icon-music-playing, .icon-music-muted {
  width: 14px;
  height: 14px;
}

.stat-label {
  font-size: 0.6rem;
  color: #64748b;
  letter-spacing: 0.5px;
}

.stat-value {
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
}

/* Glassmorphic Sidebar Panel */
.hud-sidebar {
  grid-area: sidebar;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.sidebar-tabs {
  display: flex;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tab-btn.active {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.tab-panel h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 16px;
  color: #38bdf8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.description-text {
  margin-top: -12px;
  margin-bottom: 16px;
  color: #94a3b8;
  line-height: 1.4;
}

.control-group {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-group label {
  font-size: 0.72rem;
  color: #cbd5e1;
  display: flex;
  justify-content: space-between;
}

.control-group label .val {
  font-family: monospace;
  font-weight: bold;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
}

/* Custom CSS Range Inputs */
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  background: rgba(30, 41, 59, 0.8);
  height: 6px;
  border-radius: 3px;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
  transition: transform 0.1s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.input-warning {
  font-size: 0.65rem;
  color: #fb7185;
  background: rgba(244, 63, 94, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  margin-top: 4px;
  border: 1px solid rgba(244, 63, 94, 0.2);
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 16px 0;
}

/* Compass Widget styles */
.compass-label-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.compass-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.compass-dial {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.7);
  border: 2px dashed rgba(56, 189, 248, 0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.5s cubic-bezier(0.1, 0.8, 0.3, 1);
}

.compass-arrow {
  font-size: 2.2rem;
  font-weight: bold;
  color: #3b82f6;
  transform: translateY(-4px);
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
}

.compass-points {
  position: absolute;
  width: 100%;
  height: 100%;
  font-size: 0.65rem;
  font-weight: 700;
  color: #94a3b8;
  pointer-events: none;
}

.compass-points span {
  position: absolute;
}

.compass-points .n { top: 6px; left: 50%; transform: translateX(-50%); color: #ef4444; }
.compass-points .e { right: 8px; top: 50%; transform: translateY(-50%); }
.compass-points .s { bottom: 6px; left: 50%; transform: translateX(-50%); }
.compass-points .w { left: 8px; top: 50%; transform: translateY(-50%); }

.compass-slider {
  margin-top: 4px;
}

/* Tab View Buttons */
.view-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  border: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-secondary {
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
}

.btn-danger {
  background: #dc2626;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
}

.btn-danger:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.audio-controls {
  margin-top: 14px;
}

.sound-track-info {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 10px;
  border-radius: 8px;
}

.small {
  font-size: 0.62rem;
  color: #94a3b8;
  line-height: 1.35;
  margin: 0;
}

/* Bottom HUD elements */
.hud-footer {
  grid-area: footer;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  margin-top: 12px;
  align-items: end;
}

/* Speedometer Gauge Panel */
.gauge-card {
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.gauge-radial {
  position: relative;
  width: 90px;
  height: 90px;
}

.gauge-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.gauge-track {
  fill: none;
  stroke: rgba(30, 41, 59, 0.8);
  stroke-width: 8px;
}

.gauge-fill {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 8px;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.15s linear;
}

.gauge-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge-value .num {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  color: #ffffff;
  line-height: 1;
}

.gauge-value .unit {
  font-size: 0.52rem;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 1px;
}

.gauge-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 4px;
}

.detail-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-row .label {
  font-size: 0.65rem;
  color: #94a3b8;
}

.detail-row .val {
  font-family: monospace;
  font-weight: bold;
  font-size: 0.78rem;
  color: #38bdf8;
}

/* Keyboard Guide Card */
.guide-card {
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  padding: 14px 20px;
}

.guide-card h4 {
  font-family: 'Outfit', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: #38bdf8;
  margin-top: 0;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.keys-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.68rem;
  color: #cbd5e1;
}

kbd {
  display: inline-block;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-weight: bold;
  font-size: 0.72rem;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
  min-width: 12px;
  text-align: center;
  transition: all 0.15s ease;
}

kbd.active {
  background: #3b82f6;
  border-color: #60a5fa;
  transform: translateY(2px);
  box-shadow: 0 0px 0 rgba(0, 0, 0, 0);
}

/* Sinking Alarm Overlay screen */
.sinking-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(12, 10, 9, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.alarm-box {
  background: rgba(28, 25, 23, 0.95);
  border: 2px solid #dc2626;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  max-width: 440px;
  box-shadow: 0 0 40px rgba(220, 38, 38, 0.35);
  animation: shake 0.5s ease-in-out;
}

.siren-light {
  width: 45px;
  height: 45px;
  background: #dc2626;
  border-radius: 50%;
  margin: 0 auto 20px;
  box-shadow: 0 0 25px #dc2626;
  animation: flash-red 0.6s infinite alternate;
}

.alarm-box h2 {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  color: #ef4444;
  margin-top: 0;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.alarm-box p {
  font-size: 0.85rem;
  color: #d6d3d1;
  line-height: 1.5;
  margin-bottom: 24px;
}

/* Animations */
@keyframes pulse-alarm {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.97); }
}

@keyframes flash-red {
  from { opacity: 0.3; box-shadow: 0 0 5px #dc2626; }
  to { opacity: 1; box-shadow: 0 0 30px #dc2626; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Scrollbars */
.hud-sidebar::-webkit-scrollbar {
  width: 4px;
}
.hud-sidebar::-webkit-scrollbar-track {
  background: transparent;
}
.hud-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
}
.hud-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

@media(max-height: 700px) {
  .hud-sidebar {
    height: calc(100vh - 170px);
  }
}

/* Helm — commercial trawler bridge (reference layout) */
.helm-bridge-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 90400;
}

.helm-bridge-commercial .helm-windshield-glass {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 36%;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.22) 0%, transparent 12%, transparent 88%, rgba(0, 0, 0, 0.22) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.12) 0%, transparent 18%, transparent 92%, rgba(0, 0, 0, 0.08) 100%);
  pointer-events: none;
  z-index: 1;
}

.helm-bridge-commercial .helm-dashboard {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 36%;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: transparent;
  pointer-events: none;
  z-index: 5;
}

.helm-mfd-row {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(8px, 1.5vw, 16px);
  padding: 0 12px 10px;
  width: 100%;
  box-sizing: border-box;
}

.helm-bridge-commercial .helm-mfd {
  flex: 0 0 min(168px, 18vw);
  width: min(168px, 18vw);
  max-width: 200px;
  height: min(28vh, 150px);
  max-height: 150px;
  display: flex;
  flex-direction: column;
  background: #1a1c1f;
  border: 2px solid #0a0a0a;
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.helm-bridge-commercial .helm-monitor-bezel {
  flex: 1;
  padding: 3px;
  background: #080808;
  min-height: 0;
  display: flex;
}

.helm-bridge-commercial .helm-mfd-screen {
  display: block;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  background: #000;
}

.helm-wheel-aperture {
  flex: 1 1 auto;
  min-width: min(100px, 14vw);
  max-width: min(260px, 32vw);
  height: min(28vh, 150px);
  max-height: 150px;
  background: transparent;
  pointer-events: none;
}

.helm-bridge-hint {
  position: absolute;
  bottom: 5px;
  right: 14px;
  margin: 0;
  font-size: 0.58rem;
  color: rgba(200, 210, 220, 0.35);
  letter-spacing: 0.05em;
  z-index: 6;
}

/* Mini-games overlays */
.minigame-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9900;
  pointer-events: none; /* Allow camera mouse-drag */
}

/* Make dialog interactive */
.minigame-dialog {
  background: rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}

/* Camera */
.minigame-camera {
  background: rgba(0, 0, 0, 0.1);
}

.camera-crosshair {
  width: 40px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  position: relative;
}
.camera-crosshair::before, .camera-crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
}
.camera-crosshair::before { width: 100%; height: 2px; top: 19px; left: 0; }
.camera-crosshair::after { width: 2px; height: 100%; left: 19px; top: 0; }

.camera-corner {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.9);
}
.camera-corner.top-left { top: 20%; left: 30%; border-right: none; border-bottom: none; }
.camera-corner.top-right { top: 20%; right: 30%; border-left: none; border-bottom: none; }
.camera-corner.bottom-left { bottom: 20%; left: 30%; border-right: none; border-top: none; }
.camera-corner.bottom-right { bottom: 20%; right: 30%; border-left: none; border-top: none; }

.camera-instructions {
  position: absolute;
  bottom: 10%;
  color: #fff;
  font-size: 1.5rem;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}
.camera-feedback {
  margin-top: 20px;
  color: #ef4444;
  font-size: 1.2rem;
  font-weight: bold;
  background: rgba(0,0,0,0.5);
  padding: 4px 12px;
  border-radius: 4px;
}

/* Dialog (Verify ID) */
.minigame-dialog {
  background: rgba(0, 0, 0, 0.4);
}
.dialog-box {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  color: #f8fafc;
  text-align: center;
}
.dialog-box h3 {
  margin: 0 0 12px 0;
  color: #38bdf8;
  font-size: 1.4rem;
}
.dialog-box p {
  margin: 0 0 20px 0;
  color: #94a3b8;
  font-size: 1rem;
}
.minigame-input {
  width: 100%;
  padding: 12px;
  background: #0f172a;
  border: 1px solid #475569;
  border-radius: 4px;
  color: #fff;
  font-size: 1.2rem;
  text-align: center;
  margin-bottom: 8px;
}
.minigame-input:focus {
  outline: none;
  border-color: #38bdf8;
}
.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* Mashing (Debris) */
.minigame-mashing {
  background: rgba(0, 0, 0, 0.2);
}
.mashing-container {
  background: rgba(15, 23, 42, 0.9);
  padding: 24px 32px;
  border-radius: 12px;
  border: 2px solid #38bdf8;
  text-align: center;
}
.mashing-container h3 {
  color: #fff;
  margin: 0 0 8px 0;
}
.mashing-container p {
  color: #cbd5e1;
  margin: 0 0 20px 0;
}
.mashing-bar-bg {
  width: 300px;
  height: 24px;
  background: #1e293b;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #475569;
}
.mashing-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #eab308, #22c55e);
  transition: width 0.1s linear;
}

/* Gear Info Popup */
.gear-info-popup-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 20px;
}

.gear-info-popup {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 16px;
  width: 560px;
  max-width: 95vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow:
    0 0 60px rgba(56, 189, 248, 0.15),
    0 20px 60px rgba(0, 0, 0, 0.6);
  animation: gearPopupSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes gearPopupSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.gear-info-header {
  padding: 24px 28px 16px;
  text-align: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.gear-info-badge {
  display: inline-block;
  background: linear-gradient(135deg, #0369a1, #0ea5e9);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 5px 14px;
  border-radius: 20px;
  margin-bottom: 12px;
}

.gear-info-title {
  margin: 0;
  color: #f8fafc;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.gear-info-body {
  padding: 20px 28px;
}

.gear-info-image-container {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid rgba(148, 163, 184, 0.15);
}

.gear-info-image {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}

.gear-info-image-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: #94a3b8;
  font-size: 0.7rem;
  padding: 16px 12px 8px;
  text-align: center;
  font-style: italic;
}

.gear-info-description {
  color: #cbd5e1;
  font-size: 0.92rem;
  line-height: 1.65;
  margin: 0;
  text-align: justify;
}

.gear-info-footer {
  padding: 16px 28px 24px;
  text-align: center;
}

.gear-info-continue-btn {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: #fff;
  border: none;
  padding: 12px 36px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
}

.gear-info-continue-btn:hover {
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5);
}

.gear-info-continue-btn:active {
  transform: translateY(0);
}

/* Gear Quiz Styling */
.gear-quiz-box {
  min-width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  text-align: left;
  margin: 20px;
}

/* Responsive adjustments for smaller screens */
@media (max-width: 768px) {
  .gear-quiz-box {
    min-width: 300px;
    max-width: 95vw;
    padding: 16px;
    margin: 10px;
  }
  
  .quiz-header-icon {
    font-size: 2rem;
  }
  
  .quiz-question {
    font-size: 1rem;
  }
  
  .quiz-option-btn {
    padding: 12px 14px;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .gear-quiz-box {
    min-width: 280px;
    max-width: 98vw;
    padding: 12px;
    margin: 5px;
  }
  
  .quiz-question-card {
    padding: 12px 14px;
  }
}

.gear-quiz-box h3 {
  text-align: center;
  margin-bottom: 4px;
}
.quiz-header-icon {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 4px;
  filter: drop-shadow(0 2px 6px rgba(56, 189, 248, 0.3));
}
.quiz-progress-bar-container {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.quiz-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 3px;
  overflow: hidden;
}
.quiz-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #0ea5e9);
  transition: width 0.3s ease;
}
.quiz-progress-text {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.quiz-question-card {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.quiz-question {
  font-size: 1.1rem;
  color: #f1f5f9;
  line-height: 1.5;
  margin: 0;
}
.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quiz-option-btn {
  display: flex;
  align-items: center;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  padding: 14px 18px;
  border-radius: 8px;
  font-size: 0.98rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}
.quiz-option-btn:hover:not(:disabled) {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(56, 189, 248, 0.3);
  color: #f1f5f9;
}
.quiz-option-letter {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  margin-right: 12px;
  flex-shrink: 0;
}
.quiz-option-btn:hover:not(:disabled) .quiz-option-letter {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}
.quiz-option-text {
  flex-grow: 1;
}
.quiz-option-icon {
  font-size: 1.1rem;
  font-weight: 800;
  margin-left: 8px;
}
.quiz-option-btn.selected {
  background: rgba(14, 165, 233, 0.15);
  border-color: #0ea5e9;
  color: #fff;
}
.quiz-option-btn.correct {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
  color: #4ade80 !important;
}
.quiz-option-btn.correct .quiz-option-letter {
  background: rgba(34, 197, 94, 0.25);
  color: #4ade80;
}
.quiz-option-btn.incorrect {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #f87171 !important;
}
.quiz-option-btn.incorrect .quiz-option-letter {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.quiz-feedback-box {
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 8px;
  font-size: 0.92rem;
  line-height: 1.45;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: slideUp 0.2s ease-out;
}
.quiz-feedback-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}
.quiz-feedback-correct {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #4ade80;
}
.quiz-feedback-wrong {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.quiz-next-btn {
  width: 100%;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 18px rgba(14, 165, 233, 0.35);
  letter-spacing: 0.5px;
}
.quiz-next-btn:hover {
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(14, 165, 233, 0.45);
}

.report-submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #22c55e, #4ade80);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 18px rgba(34, 197, 94, 0.35);
  letter-spacing: 0.5px;
}
.report-submit-btn:hover {
  background: linear-gradient(135deg, #16a34a, #22c55e);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(34, 197, 94, 0.45);
}

.report-submit-btn-fail {
  background: linear-gradient(135deg, #ef4444, #f87171);
  box-shadow: 0 4px 18px rgba(239, 68, 68, 0.35);
}
.report-submit-btn-fail:hover {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  box-shadow: 0 6px 24px rgba(239, 68, 68, 0.45);
}

.report-retake-btn {
  width: 100%;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 18px rgba(245, 158, 11, 0.35);
  letter-spacing: 0.5px;
}
.report-retake-btn:hover {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(245, 158, 11, 0.45);
}

.text-success { color: #4ade80 !important; }
.text-error { color: #f87171 !important; }

/* Enhanced Report Summary */
.report-header-icon {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 4px;
  filter: drop-shadow(0 2px 6px rgba(56, 189, 248, 0.3));
}
.report-subtitle {
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0 0 16px 0;
}
.report-badge {
  text-align: center;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  padding: 6px 16px;
  border-radius: 20px;
  display: inline-block;
  margin: 0 auto 16px;
  width: 100%;
  box-sizing: border-box;
}
.report-badge-pass {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #4ade80;
}
.report-badge-fail {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}
.report-summary {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 12px;
  padding: 4px 16px;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
}
.report-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
  font-size: 1rem;
}
.report-item:last-child {
  border-bottom: none;
}
.report-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.report-item-icon {
  font-size: 1.1rem;
}
.report-item strong {
  color: #f1f5f9;
  font-weight: 600;
}
.report-item-status {
  font-weight: 700;
  font-size: 0.85rem;
  padding: 4px 12px;
  border-radius: 6px;
  background: rgba(0,0,0,0.25);
  letter-spacing: 0.5px;
}
.report-score-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(56, 189, 248, 0.1);
  border-radius: 8px;
}
.report-score-label {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.report-score-value {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 1px;
}
.report-fail-notice {
  margin-top: 14px;
  padding: 12px 16px;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.25);
  border-radius: 8px;
  color: #fbbf24;
  font-size: 0.85rem;
  line-height: 1.5;
  text-align: center;
}
.report-submit-btn {
  width: 100%;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);
  letter-spacing: 0.5px;
}
.report-submit-btn:hover {
  background: linear-gradient(135deg, #047857, #059669);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.45);
}
.report-retake-btn {
  width: 100%;
  background: linear-gradient(135deg, #b45309, #d97706);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 18px rgba(217, 119, 6, 0.35);
  letter-spacing: 0.5px;
}
.report-retake-btn:hover {
  background: linear-gradient(135deg, #92400e, #b45309);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(217, 119, 6, 0.45);
}

/* Boat Selection Screen Styling */
.boat-selection-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90%;
  max-width: 1100px;
  z-index: 10;
  padding: 40px 20px;
  box-sizing: border-box;
}
.boat-selection-title {
  font-size: 2.8rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
  letter-spacing: 0.5px;
}
.boat-selection-subtitle {
  font-size: 1.15rem;
  color: #94a3b8;
  margin: 0 0 40px 0;
  text-align: center;
  max-width: 600px;
}
.boat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  width: 100%;
  margin-bottom: 40px;
}
.boat-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
}
.active-boat {
  cursor: pointer;
  border-color: rgba(56, 189, 248, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.active-boat:hover {
  transform: translateY(-6px);
  border-color: #38bdf8;
  background: rgba(15, 23, 42, 0.65);
  box-shadow: 0 12px 30px rgba(56, 189, 248, 0.15);
}
.locked-boat {
  opacity: 0.7;
  background: rgba(15, 23, 42, 0.4);
}
.boat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.boat-badge-status {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 4px 10px;
  border-radius: 20px;
}
.available-badge {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}
.coming-soon-badge {
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}
.boat-icon-emoji {
  font-size: 2.2rem;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
}
.boat-card-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}
.boat-card-body h3 {
  font-size: 1.4rem;
  color: #f8fafc;
  margin: 0 0 10px 0;
  font-weight: 700;
}
.boat-card-body p {
  font-size: 0.92rem;
  color: #cbd5e1;
  line-height: 1.5;
  margin: 0 0 20px 0;
  flex-grow: 1;
}
.boat-specs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.boat-spec-tag {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.boat-tagline {
  color: #7dd3fc;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  margin: 4px 0 8px !important;
  text-transform: uppercase;
}

.boat-stat-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.boat-stat-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.boat-stat-label {
  min-width: 96px;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.boat-stat-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.7);
  overflow: hidden;
}

.boat-stat-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #0ea5e9);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.boat-card--selected {
  border-color: rgba(56, 189, 248, 0.7);
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.25);
  transform: translateY(-2px);
}
.boat-action-btn {
  width: 100%;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
}
.select-action-btn {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: #fff;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.25);
}
.active-boat:hover .select-action-btn {
  background: linear-gradient(135deg, #0284c7, #0ea5e9);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
}
.lock-action-btn {
  background: rgba(148, 163, 184, 0.08);
  color: #64748b;
  cursor: not-allowed;
}
.back-to-menu-btn {
  margin-top: 10px;
}

/* ============================
   ADMIN DASHBOARD
   ============================ */
.admin-dashboard-overlay {
  background: #080e1a;
}
.admin-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: 'Inter', 'Outfit', sans-serif;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(56, 189, 248, 0.15);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}
.admin-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.admin-eyebrow {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 1px;
}
.admin-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0;
  background: linear-gradient(135deg, #38bdf8, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.admin-user-pill {
  background: rgba(167, 139, 250, 0.15);
  border: 1px solid rgba(167, 139, 250, 0.3);
  color: #a78bfa;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
}
.admin-signout-btn {
  background: transparent;
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.admin-signout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(248, 113, 113, 0.6);
}
.admin-nav {
  display: flex;
  gap: 4px;
  padding: 12px 32px;
  background: rgba(10, 16, 28, 0.7);
  border-bottom: 1px solid rgba(30, 41, 59, 0.8);
  flex-shrink: 0;
}
.admin-nav-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}
.admin-nav-btn:hover {
  background: rgba(30, 41, 59, 0.6);
  color: #e2e8f0;
}
.admin-nav-btn--active {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-weight: 700;
}
.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
}
.admin-panel {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(56, 189, 248, 0.1);
  border-radius: 16px;
  overflow: hidden;
  max-width: 820px;
  margin: 0 auto;
}
.admin-panel-header {
  padding: 20px 28px 16px;
  border-bottom: 1px solid rgba(30, 41, 59, 0.8);
}
.admin-panel-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 4px 0;
}
.admin-panel-subtitle {
  font-size: 0.85rem;
  color: #64748b;
}
.admin-form {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.admin-form-hint {
  font-size: 0.87rem;
  color: #64748b;
  margin: 0;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.4);
  border-left: 3px solid rgba(56, 189, 248, 0.4);
  border-radius: 0 6px 6px 0;
}
.admin-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.admin-form-inline {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.admin-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.admin-input {
  background: rgba(10, 16, 28, 0.7);
  border: 1px solid rgba(51, 65, 85, 0.8);
  color: #e2e8f0;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  outline: none;
  font-family: inherit;
}
.admin-input:focus {
  border-color: #38bdf8;
}
.admin-input-mono {
  font-family: 'Courier New', monospace;
  color: #a78bfa;
  font-size: 0.88rem;
}
.admin-select {
  cursor: pointer;
}
.admin-textarea {
  resize: vertical;
  line-height: 1.5;
}
.admin-step-card {
  background: rgba(10, 16, 28, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.6);
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
}
.admin-step-num {
  font-size: 0.75rem;
  font-weight: 800;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.admin-remove-btn {
  align-self: flex-start;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
}
.admin-remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}
.admin-remove-inline {
  padding: 8px 12px;
  height: 100%;
}
.admin-obj-row {
  flex-direction: row !important;
  align-items: center;
  gap: 12px !important;
}
.admin-obj-input-wrap {
  display: flex;
  gap: 8px;
  flex: 1;
}
.admin-obj-input-wrap .admin-input {
  flex: 1;
}
.admin-add-btn {
  align-self: flex-start;
  background: rgba(56, 189, 248, 0.1);
  border: 1px dashed rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.admin-add-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.5);
}
.admin-publish-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 28px;
  border-top: 1px solid rgba(30, 41, 59, 0.8);
  background: rgba(10, 16, 28, 0.4);
}
.admin-publish-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}
.admin-saved-badge {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
}
.admin-save-btn {
  background: rgba(51, 65, 85, 0.5);
  border: 1px solid rgba(100, 116, 139, 0.4);
  color: #cbd5e1;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.admin-save-btn:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(100, 116, 139, 0.7);
}
.admin-publish-btn {
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  border: none;
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
}
.admin-publish-btn:hover {
  background: linear-gradient(135deg, #6d28d9, #7c3aed);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45);
}
/* Preview Card */
.admin-preview {
  padding: 24px 28px;
}
.admin-preview-card {
  background: rgba(10, 16, 28, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 12px;
  padding: 24px;
}
.admin-preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.admin-preview-category {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.admin-preview-difficulty {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
}
.diff-beginner { background: rgba(34,197,94,.15); color: #4ade80; }
.diff-intermediate { background: rgba(250,204,21,.15); color: #fbbf24; }
.diff-advanced { background: rgba(239,68,68,.15); color: #f87171; }
.admin-preview-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 10px 0;
}
.admin-preview-desc {
  font-size: 0.9rem;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0 0 16px;
}
.admin-preview-reward {
  display: inline-block;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.25);
  color: #fbbf24;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 20px;
}
.admin-preview-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(30, 41, 59, 0.8);
}
.admin-preview-section strong {
  font-size: 0.82rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 10px;
}
.admin-preview-list {
  margin: 0;
  padding: 0 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.admin-preview-list li {
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.admin-step-badge {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 4px;
}

/* Controls Guide Overlay */
.controls-guide-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 190000;
  padding: 0;
  pointer-events: none;
}

.controls-guide-card {
  position: relative;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
  background: linear-gradient(135deg, rgba(10, 25, 47, 0.98), rgba(15, 35, 65, 0.98));
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6), 0 0 100px rgba(56, 189, 248, 0.15);
  padding: 20px 24px;
  animation: slideUp 0.3s ease-out;
  pointer-events: all;
  box-sizing: border-box;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.controls-guide-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 20px;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.controls-guide-close:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
  transform: scale(1.1);
}

.controls-guide-header {
  text-align: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(56, 189, 248, 0.2);
}

.controls-guide-icon {
  font-size: 28px;
  display: inline-block;
  margin-right: 10px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.controls-guide-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 6px 0;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 2px 10px rgba(56, 189, 248, 0.3);
  display: inline-block;
}

.controls-guide-subtitle {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0;
}

.controls-guide-content {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  width: 100%;
}

.controls-section {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 8px;
  padding: 12px;
  min-width: 0;
}

.controls-section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #38bdf8;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.controls-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 6px;
  transition: all 0.2s ease;
  min-width: 0;
}

.control-item:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateX(4px);
}

.control-key {
  flex-shrink: 0;
  min-width: 34px;
  padding: 5px 8px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border: 2px solid rgba(148, 163, 184, 0.4);
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #f1f5f9;
  text-align: center;
  font-family: 'Courier New', monospace;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.control-label {
  flex: 1;
  min-width: 0;
  font-size: 0.78rem;
  color: #cbd5e1;
  line-height: 1.3;
  white-space: normal;
}

.controls-guide-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid rgba(56, 189, 248, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.controls-guide-tip {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.controls-guide-tip kbd {
  padding: 3px 6px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
  color: #e2e8f0;
}

.controls-guide-btn {
  padding: 8px 24px;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  border: 2px solid rgba(56, 189, 248, 0.5);
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;
}

.controls-guide-btn:hover {
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.4);
}

/* Responsive Design for Controls Guide */
@media (max-width: 1100px) {
  .controls-guide-content {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .controls-guide-card {
    padding: 20px 16px;
    max-height: 65vh;
  }
  
  .controls-guide-title {
    font-size: 1.25rem;
  }
  
  .controls-guide-content {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .controls-section {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .controls-guide-card {
    padding: 16px 12px;
    max-height: 75vh;
  }
  
  .controls-guide-icon {
    font-size: 28px;
  }
  
  .controls-guide-title {
    font-size: 1.1rem;
  }
  
  .controls-guide-subtitle {
    font-size: 0.8rem;
  }
  
  .controls-guide-content {
    grid-template-columns: 1fr;
  }
  
  .controls-section-title {
    font-size: 0.85rem;
  }
  
  .control-key {
    min-width: 34px;
    padding: 5px 8px;
    font-size: 0.75rem;
  }
  
  .control-label {
    font-size: 0.8rem;
  }
  
  .controls-guide-footer {
    flex-direction: column;
    gap: 12px;
  }
  
  .controls-guide-tip {
    font-size: 0.75rem;
  }
  
  .controls-guide-btn {
    width: 100%;
  }
}

/* Fade transition for controls guide */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Pending Approval Overlay */
.pending-approval-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 2rem;
}

.pending-approval-card {
  max-width: 600px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.pending-approval-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.pending-approval-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.pending-approval-message {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.pending-approval-note {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
}

.pending-approval-logout-btn {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(220, 38, 38, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pending-approval-logout-btn:hover {
  background: rgba(220, 38, 38, 0.3);
  border-color: rgba(220, 38, 38, 0.5);
  transform: translateY(-1px);
}

/* Report Mission Button */
.report-mission-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  border: 2px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4),
              0 0 20px rgba(16, 185, 129, 0.2);
  animation: pulse-glow 2s ease-in-out infinite;
}

.report-mission-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  border-color: rgba(16, 185, 129, 0.5);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6),
              0 0 30px rgba(16, 185, 129, 0.3);
}

.report-mission-btn:active {
  transform: translateY(0) scale(0.98);
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4),
                0 0 20px rgba(16, 185, 129, 0.2);
  }
  50% {
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.6),
                0 0 30px rgba(16, 185, 129, 0.4);
  }
}

/* Rank Section Styles */
.rank-display-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.rank-medal-icon {
  font-size: 3.5rem;
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.5));
}

.rank-info {
  flex: 1;
}

.rank-current-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.rank-current-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.25rem;
}

.rank-current-xp {
  font-size: 1.125rem;
  color: rgba(59, 130, 246, 1);
  font-weight: 600;
}

.rank-progress-section {
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rank-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.rank-progress-label {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.rank-progress-percent {
  font-size: 1.125rem;
  color: rgba(59, 130, 246, 1);
  font-weight: 700;
}

.rank-progress-bar {
  width: 100%;
  height: 12px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.rank-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.rank-progress-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.rank-progress-current {
  color: rgba(255, 255, 255, 0.7);
}

.rank-progress-next {
  color: rgba(147, 51, 234, 0.9);
  font-weight: 600;
}
</style>

<!-- Unscoped styles for status dropdown to ensure visibility -->
<style>
/* Student Status Dropdown - Unscoped for proper rendering */
.student-status-dropdown {
  padding: 0.4rem 2rem 0.4rem 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23fff' d='M5 7L1 3h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 10px;
  min-width: 100px;
  max-width: 120px;
  text-transform: uppercase;
}

.student-status-dropdown:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.student-status-dropdown:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.student-status-dropdown--active {
  background-color: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.4);
  color: #10b981;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2310b981' d='M5 7L1 3h8z'/%3E%3C/svg%3E");
}

.student-status-dropdown--inactive {
  background-color: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23ef4444' d='M5 7L1 3h8z'/%3E%3C/svg%3E");
}

.simulation-readouts,
.simulation-primary-actions,
.simulation-control-panel {
  display: contents;
}

.training-all-steps-toggle {
  display: none;
}

.simulation-action-label,
.simulation-exit-mobile {
  display: none;
}

/* Keep the separate mission card and transparent controls aligned without overlap. */
.simulation-container--active .simulation-control-panel {
  position: fixed;
  top: calc(8px + env(safe-area-inset-top, 0px));
  right: 8px;
  z-index: 90500;
  width: min(360px, calc(100vw - 16px));
  height: calc(100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  max-height: calc(100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.simulation-container--active .mission-objective-box {
  position: static;
  inset: auto;
  width: 100%;
  max-width: none;
  max-height: none;
  min-height: 0;
  flex: 0 1 auto;
  pointer-events: auto;
  box-sizing: border-box;
  padding: 0 12px 10px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(15, 23, 42, 0.9);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.simulation-container--active .objective-toggle {
  min-height: 44px;
  flex-shrink: 0;
}

.simulation-container--active .objective-label {
  color: #7dd3fc;
  font-size: 0.7rem;
  font-weight: 700;
}

.simulation-container--active .simulation-control-panel .objective-body {
  min-height: 0;
  max-height: none;
  margin-top: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
  padding-right: 3px;
}

.simulation-container--active .mission-objective-box h4 {
  font-size: 0.9rem;
  margin: 0 0 4px;
}

.simulation-container--active .objective-text {
  display: block;
  overflow: visible;
  font-size: 0.75rem;
  line-height: 1.4;
}

.simulation-container--active .training-review-note,
.simulation-container--active .training-step-counter-mini {
  font-size: 0.68rem;
}

.simulation-container--active .training-progress-mini {
  margin-bottom: 5px;
}

.simulation-container--active .training-compass-coach,
.simulation-container--active .waypoint-hint {
  display: block;
  overflow: visible;
  max-width: none;
  padding: 6px 8px;
  font-size: 0.72rem;
}

.simulation-container--active .training-all-steps-mini {
  margin-top: 6px;
  padding: 0;
  max-width: none;
}

.simulation-container--active .training-all-steps-heading {
  display: none;
}

.simulation-container--active .training-all-steps-toggle {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: transparent;
  color: #bae6fd;
  border: 0;
  border-radius: 6px;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
}

.simulation-container--active .training-all-steps-list {
  display: none;
  padding: 0 12px 6px 30px;
}

.simulation-container--active .steps-expanded .training-all-steps-list {
  display: block;
}

.simulation-container--active .training-all-steps-list li {
  font-size: 0.72rem;
}

.simulation-container--active .training-feedback-mini p {
  margin: 6px 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
}

.simulation-container--active .nav-hud-right {
  position: static;
  inset: auto;
  transform: none;
  width: 100%;
  max-width: none;
  max-height: none;
  flex: 0 0 auto;
  margin-top: auto;
  pointer-events: auto;
  overflow: visible;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    'gauges compass readouts'
    'speed distance readouts'
    'primary primary exit'
    'actions actions actions';
  gap: 6px 8px;
  align-items: center;
  padding: 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  backdrop-filter: none;
}

.simulation-container--active .nav-hud-right .top-gauges {
  grid-area: gauges;
  display: flex;
  justify-content: center;
  gap: 4px;
  width: auto;
}

.simulation-container--active .nav-hud-right .mini-gauge {
  width: min(40px, 50%);
  max-width: 40px;
}

.simulation-container--active .nav-hud-right .compass-card {
  --waypoint-compass-radius: 18px;
  grid-area: compass;
  width: 52px;
  margin: 0;
  justify-self: center;
}

.simulation-container--active .nav-hud-right .speed-pill {
  grid-area: speed;
  padding: 2px 6px;
  font-size: 0.62rem;
  white-space: nowrap;
}

.simulation-container--active .nav-hud-right .waypoint-distance-readout {
  grid-area: distance;
  font-size: 0.62rem;
  padding: 2px 6px;
}

.simulation-container--active .nav-hud-right .data-pills {
  display: contents;
}

.simulation-container--active .simulation-readouts {
  grid-area: readouts;
  display: grid;
  gap: 4px;
  min-width: 0;
}

.simulation-container--active .simulation-readouts .data-pill {
  font-size: 0.62rem;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
  padding: 2px 4px;
}

.simulation-container--active .simulation-primary-actions {
  grid-area: primary;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.simulation-container--active .nav-hud-right .data-pill--icon,
.simulation-container--active .nav-hud-right .icon-btn {
  width: 100%;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  box-sizing: border-box;
}

.simulation-container--active .nav-hud-right .engine-btn {
  order: 0;
}

.simulation-container--active .simulation-primary-actions button {
  gap: 4px;
}

.simulation-container--active .simulation-primary-actions .hud-icon {
  width: 14px;
  height: 14px;
}

.simulation-container--active .simulation-action-label {
  display: inline;
  font-size: 0.6rem;
}

.simulation-container--active .simulation-exit-desktop {
  display: none;
}

.simulation-container--active .simulation-exit-mobile {
  display: inline;
}

.simulation-container--active .nav-hud-right .icon-actions {
  grid-area: actions;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.simulation-container--active .nav-hud-right .exit-hold-btn {
  grid-area: exit;
  min-height: 44px;
  min-width: 0;
  padding: 6px;
  font-size: 0.65rem;
}

.simulation-container--active .nav-hud-right button:focus-visible,
.simulation-container--active .mission-objective-box button:focus-visible {
  outline: 2px solid #7dd3fc;
  outline-offset: 2px;
}

@media (min-width: 1024px) {
  .simulation-container--active .compass-hud-top {
    width: min(560px, calc(100vw - 768px));
  }

  .simulation-container--active .training-all-steps-heading {
    display: block;
    margin: 10px 10px 8px;
  }

  .simulation-container--active .training-all-steps-list {
    display: block;
  }

  .simulation-container--active .training-all-steps-toggle,
  .simulation-container--active .simulation-exit-mobile {
    display: none;
  }

  .simulation-container--active .simulation-exit-desktop {
    display: inline;
  }
}

@media (max-width: 1023px) {
  .simulation-container--active .simulation-control-panel {
    max-height: calc(100dvh - 120px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
  .simulation-container--active .compass-hud-top {
    display: none; /* Heading remains visible in the bottom compass. */
  }
  .simulation-container--active .tactical-minimap {
    top: auto;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    left: 8px;
    width: 88px;
    height: 88px;
  }
  .simulation-container--active .tactical-minimap-label {
    top: 3px;
    font-size: 0.45rem;
  }
}

/* Landscape phones retain the desktop HUD positions with compact, touchable controls. */
@media (max-width: 1023px) and (max-height: 600px) and (orientation: landscape) {
  .simulation-container--active {
    --sim-left: max(6px, env(safe-area-inset-left, 0px));
    --sim-right: max(6px, env(safe-area-inset-right, 0px));
    --sim-top: max(6px, env(safe-area-inset-top, 0px));
    --sim-bottom: max(6px, env(safe-area-inset-bottom, 0px));
    --sim-radar-size: clamp(88px, 26dvh, 128px);
    --sim-panel-width: clamp(244px, 32vw, 320px);
  }
  .simulation-container--active .simulation-control-panel {
    top: var(--sim-top);
    right: var(--sim-right);
    width: var(--sim-panel-width);
    height: calc(100dvh - var(--sim-top) - var(--sim-bottom));
    max-height: calc(100dvh - var(--sim-top) - var(--sim-bottom));
    gap: 12px;
  }
  .simulation-container--active .tactical-minimap {
    top: var(--sim-top);
    bottom: auto;
    left: var(--sim-left);
    width: var(--sim-radar-size);
    height: var(--sim-radar-size);
    box-sizing: border-box;
  }
  .simulation-container--active .tactical-minimap-label { top: 5px; font-size: 8px; }
  .simulation-container--active .compass-hud-top {
    display: block;
    top: var(--sim-top);
    left: calc((100vw + var(--sim-left) - var(--sim-right) + var(--sim-radar-size) - var(--sim-panel-width)) / 2);
    width: min(360px, calc(100vw - var(--sim-left) - var(--sim-right) - var(--sim-radar-size) - var(--sim-panel-width) - 24px));
  }
  .simulation-container--active .compass-strip-viewport { height: 30px; border-radius: 7px; }
  .simulation-container--active .strip-mark { font-size: 10px; }
  .simulation-container--active .strip-mark.major { font-size: 12px; }
  .simulation-container--active .strip-mark i { font-size: 9px; margin-top: 0; }
  .simulation-container--active .compass-strip-heading { font-size: 11px; margin-top: 2px; }
  .simulation-container--active .mission-objective-box { padding: 0 8px 6px; border-radius: 9px; }
  .simulation-container--active .objective-label { font-size: 10px; }
  .simulation-container--active .mission-objective-box h4 { font-size: 12px; }
  .simulation-container--active .objective-text,
  .simulation-container--active .training-compass-coach,
  .simulation-container--active .waypoint-hint,
  .simulation-container--active .training-feedback-mini p { font-size: 10px; line-height: 1.3; }
  .simulation-container--active .training-compass-coach,
  .simulation-container--active .waypoint-hint { padding: 4px 6px; }
  .simulation-container--active .training-review-note,
  .simulation-container--active .training-step-counter-mini,
  .simulation-container--active .training-elapsed-mini { font-size: 9px; }
  .simulation-container--active .nav-hud-right { padding: 4px; gap: 4px; }
  .simulation-container--active .nav-hud-right .mini-gauge { max-width: 32px; }
  .simulation-container--active .nav-hud-right .compass-card {
    --waypoint-compass-radius: 13px;
    width: 40px;
  }
  .simulation-container--active .nav-hud-right .speed-pill,
  .simulation-container--active .nav-hud-right .waypoint-distance-readout,
  .simulation-container--active .simulation-readouts .data-pill { font-size: 9px; padding: 1px 3px; }
  .simulation-container--active .simulation-primary-actions,
  .simulation-container--active .nav-hud-right .icon-actions { gap: 4px; }
  .simulation-container--active .simulation-action-label { font-size: 9px; }
  .simulation-container--active .simulation-primary-actions button { gap: 2px; }
  .simulation-container--active .simulation-primary-actions .hud-icon { width: 12px; height: 12px; }
  .simulation-container--active .nav-hud-right .exit-hold-btn { font-size: 9px; padding: 4px; }
  .simulation-container--active .helm-weather-actions,
  .simulation-container--active .helm-bridge-hint { display: none; }
  .simulation-container--active .weather-notice-toast {
    top: calc(var(--sim-top) + 56px);
    left: calc(var(--sim-left) + var(--sim-radar-size) + 12px);
    right: calc(var(--sim-right) + var(--sim-panel-width) + 12px);
    transform: none;
    gap: 6px;
    padding: 6px 8px;
  }
  .simulation-container--active .weather-notice-icon { font-size: 14px; }
  .simulation-container--active .weather-notice-toast p { font-size: 10px; line-height: 1.3; }
}

.simulation-container--active .canvas-container { touch-action: none; }
.simulation-guide-trigger {
  position: fixed;
  top: 50%;
  left: calc(var(--sim-left, max(8px, env(safe-area-inset-left, 0px))) + var(--sim-radar-size, 88px) / 2 - 22px);
  transform: translateY(-50%);
  z-index: 90600;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(125, 211, 252, .45);
  border-radius: 50%;
  background: rgba(8, 16, 32, .72);
  color: #7dd3fc;
  touch-action: manipulation;
  cursor: pointer;
}
.simulation-guide-trigger svg { width: 22px; height: 22px; }
.simulation-guide-trigger:focus-visible { outline: 2px solid #7dd3fc; outline-offset: 2px; }
.controls-guide-overlay--touch {
  inset: 0;
  display: grid;
  place-items: center;
  padding: max(8px, env(safe-area-inset-top, 0px)) max(8px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px));
  background: rgba(2, 6, 23, .65);
  pointer-events: auto;
}
.controls-guide-overlay--touch .controls-guide-card {
  height: 100%;
  max-height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  padding: 12px;
  border-radius: 12px;
}
.controls-guide-overlay--touch .controls-guide-close { top: 8px; right: 8px; }
.controls-guide-overlay--touch .controls-guide-header { margin: 0 0 8px; padding: 0 48px 8px; }
.controls-guide-overlay--touch .controls-guide-icon { font-size: 20px; }
.controls-guide-overlay--touch .controls-guide-title { font-size: 18px; letter-spacing: 1px; }
.controls-guide-overlay--touch .controls-guide-subtitle { font-size: 11px; }
.controls-guide-overlay--touch .controls-guide-content {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
  align-content: start;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}
.controls-guide-overlay--touch .controls-section { padding: 8px; }
.controls-guide-overlay--touch .controls-section-title { font-size: 12px; margin-bottom: 8px; }
.controls-guide-overlay--touch .controls-grid { gap: 6px; }
.controls-guide-overlay--touch .control-item { min-height: 32px; padding: 4px 6px; gap: 6px; box-sizing: border-box; }
.controls-guide-overlay--touch .control-key { min-width: 24px; padding: 3px 5px; font-size: 11px; }
.controls-guide-overlay--touch .control-label { font-size: 11px; }
.controls-guide-overlay--touch .controls-guide-footer { margin-top: 8px; padding-top: 8px; gap: 8px; flex-direction: row; }
.controls-guide-overlay--touch .controls-guide-tip { font-size: 11px; line-height: 1.4; }
.controls-guide-overlay--touch .controls-guide-btn { width: auto; min-height: 44px; padding: 8px 14px; font-size: 11px; }
.simulation-orientation-prompt {
  position: fixed;
  inset: 0;
  z-index: 2000000;
  display: grid;
  place-items: center;
  padding: max(24px, env(safe-area-inset-top, 0px)) 24px max(24px, env(safe-area-inset-bottom, 0px));
  background: rgba(5, 12, 24, .97);
  color: #e2e8f0;
  text-align: center;
  box-sizing: border-box;
  overflow-y: auto;
}
.simulation-orientation-card { width: min(100%, 360px); }
.simulation-orientation-card > svg { width: 80px; height: 80px; color: #7dd3fc; }
.simulation-orientation-card h2 { margin: 18px 0 12px; font-size: 24px; }
.simulation-orientation-card p { line-height: 1.5; font-size: 14px; }
.simulation-orientation-card .btn { width: 100%; min-height: 48px; margin: 14px 0 4px; }
.simulation-orientation-card .simulation-orientation-help { font-size: 12px; color: #94a3b8; }
.simulation-orientation-back { min-height: 44px; background: transparent; border: 0; color: #7dd3fc; font: inherit; font-size: 14px; cursor: pointer; }
.simulation-container--portrait .simulation-control-panel,
.simulation-container--portrait .compass-hud-top,
.simulation-container--portrait .tactical-minimap,
.simulation-container--portrait .simulation-touch-controls { visibility: hidden; }

@media (pointer: coarse) {
  .simulation-container--active .canvas-container { cursor: default; }
  .simulation-container--active .simulation-control-panel { right: max(8px, env(safe-area-inset-right, 0px)); }
  @media (max-width: 1023px) and (max-height: 600px) and (orientation: landscape) {
    .simulation-container--active .simulation-control-panel { right: var(--sim-right); }
  }
}

.student-status-dropdown option {
  background: #1e293b;
  color: #fff;
  padding: 0.5rem;
  font-weight: 500;
}
</style>
