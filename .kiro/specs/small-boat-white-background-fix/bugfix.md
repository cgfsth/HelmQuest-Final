# Bugfix Requirements Document

## Introduction

When a user navigates to the boat selection screen in HelmQuest, the background displays as completely white instead of showing the ocean environment (water, sky, terrain) that is correctly visible on other menu screens like landing and play-options. This bug affects all boat options (small, medium, large) and occurs because the `boat-selection` screen is not recognized as a menu backdrop screen by the `isMenuBackdropScreen()` function.

**Technical Root Cause:**
The `isMenuBackdropScreen()` function in App.vue (line ~4996) only returns true for `'landing'` and `'play-options'` screens, excluding `'boat-selection'`. This causes the animation loop to skip the menu backdrop rendering path when on the boat selection screen. Instead of rendering the ocean cinematic backdrop (lines ~9926-9937), the animation loop attempts to execute full simulation update logic (lines ~9940+), which is designed for active gameplay. Since the boat-selection screen has no active simulation state (no boat physics, no active camera positioning), this results in a white/blank render.

**Impact:**
This bug creates a jarring user experience where the boat selection interface appears broken and unprofessional, reducing confidence in the application quality during a critical decision point in the user flow.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user navigates to the boat selection screen (activeScreen === 'boat-selection') THEN the system displays a white background instead of the ocean scene with water, sky, and terrain

1.2 WHEN isMenuBackdropScreen() is called with 'boat-selection' as the screen parameter THEN the system returns false (line ~4996 in App.vue), excluding it from menu backdrop treatment

1.3 WHEN the animation loop executes with activeScreen === 'boat-selection' THEN the system evaluates `isMenuBackdropScreen()` as false (line ~9926) and skips the early return at line ~9937

1.4 WHEN the animation loop continues past the menu backdrop check with activeScreen === 'boat-selection' THEN the system attempts to execute simulation-specific update logic (updateBoatPhysics, updateCameras, etc.) without an active simulation context

1.5 WHEN the renderFrame() function is called with no properly initialized simulation state THEN the system renders a blank/white frame instead of the ocean backdrop

1.6 WHEN the activeScreen watcher transitions to 'boat-selection' (line ~10142) THEN the system executes the else branch (line ~10151), calling applyEnvironmentPreset('day') and setting landingBoatPoseActive = false, but not triggering the menu backdrop cinematic setup

### Expected Behavior (Correct)

2.1 WHEN the user navigates to the boat selection screen (activeScreen === 'boat-selection') THEN the system SHALL display the ocean environment backdrop (water surface with waves, sky with sunset lighting, terrain/islands) identical to the landing and play-options screens

2.2 WHEN isMenuBackdropScreen() is called with 'boat-selection' as the screen parameter THEN the system SHALL return true, including it in menu backdrop treatment alongside 'landing' and 'play-options'

2.3 WHEN the animation loop executes with activeScreen === 'boat-selection' THEN the system SHALL evaluate `isMenuBackdropScreen()` as true and execute the menu backdrop rendering path (lines ~9928-9937), which includes: updateLandingCinematic(delta), ocean.update(delta), updateTerrainTiles(), wake/spray updates, and renderFrame(camera)

2.4 WHEN the animation loop processes the boat-selection screen as a menu backdrop THEN the system SHALL return early from the animate() function (line ~9937) and skip simulation-specific update logic

2.5 WHEN the activeScreen watcher transitions to 'boat-selection' THEN the system SHALL apply sunset environment preset, reset landing cinematic time, set camera FOV to LANDING_CAMERA_FOV, and prepare the cinematic ocean backdrop

2.6 WHEN renderFrame() is called during boat-selection screen THEN the system SHALL render the fully initialized ocean scene with proper lighting, water effects, and terrain visibility

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user is on the landing screen THEN the system SHALL CONTINUE TO display the ocean backdrop correctly with sunset lighting and cinematic camera movement

3.2 WHEN the user is on the play-options screen THEN the system SHALL CONTINUE TO display the ocean backdrop correctly with sunset lighting and cinematic boat animation

3.3 WHEN the user is in simulation mode (activeScreen === 'simulation') THEN the system SHALL CONTINUE TO execute full simulation update logic with boat physics, camera updates, fishing systems, and gameplay mechanics

3.4 WHEN the user navigates to dashboard screens (instructor or student) THEN the system SHALL CONTINUE TO execute the standard non-menu-backdrop rendering without ocean cinematic effects

3.5 WHEN the user is on the auth screen THEN the system SHALL CONTINUE TO execute the standard non-menu-backdrop rendering path

3.6 WHEN the boat selection functionality (chooseBoatAndSail) is triggered THEN the system SHALL CONTINUE TO correctly apply boat physics profiles via applyBoatTypePhysics(), persist student boat selection via persistStudentBoat(), and launch quick sail mode via startQuickSailWithBoat()

3.7 WHEN the animation loop processes menu backdrop screens (landing, play-options) THEN the system SHALL CONTINUE TO execute updateLandingCinematic(), update ocean waves, update terrain tiles, and render with early return

3.8 WHEN isMenuBackdropScreen() is called with 'landing' THEN the system SHALL CONTINUE TO return true

3.9 WHEN isMenuBackdropScreen() is called with 'play-options' THEN the system SHALL CONTINUE TO return true

3.10 WHEN isMenuBackdropScreen() is called with 'simulation' THEN the system SHALL CONTINUE TO return false

3.11 WHEN the user selects any boat type (small, medium, large) on the boat selection screen THEN the system SHALL CONTINUE TO load the correct boat model, apply physics multipliers, and transition to simulation
