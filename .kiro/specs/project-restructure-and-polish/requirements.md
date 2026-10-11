# Requirements Document

## Introduction

HelmQuest (MarineSim3D) is a Vue.js 3 + Three.js boat simulation game featuring 3D boat physics, fishing mechanics, navigation training, inventory system, and missions. The project currently suffers from poor folder organization with source files scattered in the root directory, helpers mixed without logical categorization, and assets distributed across multiple locations. This restructure will establish proper Vue.js/Vite project conventions, organize code by functional domain, consolidate assets, and improve developer experience while maintaining all existing functionality.

## Glossary

- **Project_Root**: The top-level directory of the HelmQuest repository (capstone/)
- **Source_Directory**: The src/ folder containing all application source code
- **Helpers_Module**: JavaScript utility files providing domain-specific functionality
- **Asset_File**: Static resources including 3D models, textures, images, audio, and data files
- **Vue_Component**: .vue files containing Vue.js single-file components
- **Configuration_File**: Files controlling build tools, linters, and framework settings (vite.config.js, package.json, etc.)
- **Build_System**: Vite build tool and its configuration
- **Import_Path**: JavaScript import statement references to files and modules
- **Public_Directory**: The public/ folder for static assets served as-is by Vite
- **Documentation_File**: README, design docs, and technical documentation files

## Requirements

### Requirement 1: Establish Proper Vue.js Source Directory Structure

**User Story:** As a developer, I want all application source code organized under src/, so that the project follows Vue.js/Vite conventions and is easier to navigate.

#### Acceptance Criteria

1. THE Build_System SHALL resolve all imports from the new src/ structure without errors
2. WHEN the project is built, THE Build_System SHALL produce a working application bundle with all functionality preserved
3. THE Source_Directory SHALL contain all .vue files, .js application files, and style files previously in Project_Root
4. THE Project_Root SHALL contain only Configuration_Files, documentation, and directories after restructuring
5. FOR ALL import statements referencing moved files, THE Import_Path SHALL be updated to reflect the new src/ structure

### Requirement 2: Organize Helpers by Functional Domain

**User Story:** As a developer, I want helpers organized into logical categories, so that I can quickly locate and maintain related functionality.

#### Acceptance Criteria

1. THE Source_Directory SHALL contain a helpers/ subdirectory organized by functional domain
2. WHEN a Helpers_Module relates to physics simulation, THE Project SHALL place it in src/helpers/physics/
3. WHEN a Helpers_Module relates to 3D rendering or scene management, THE Project SHALL place it in src/helpers/rendering/
4. WHEN a Helpers_Module relates to game mechanics or mission logic, THE Project SHALL place it in src/helpers/game-logic/
5. WHEN a Helpers_Module relates to UI components or HUD systems, THE Project SHALL place it in src/helpers/ui/
6. WHEN a Helpers_Module relates to data management or configuration, THE Project SHALL place it in src/helpers/data/
7. FOR ALL relocated Helpers_Modules, THE Import_Path references throughout the codebase SHALL be updated automatically

### Requirement 3: Consolidate and Organize Asset Files

**User Story:** As a developer, I want all assets consolidated in logical locations, so that I can manage resources efficiently and eliminate duplication.

#### Acceptance Criteria

1. THE Project SHALL organize 3D models (.obj, .mtl, .gltf, .glb, .blend) in src/assets/models/
2. THE Project SHALL organize textures and images (.jpg, .png) in src/assets/textures/
3. THE Project SHALL organize audio files (.m4a, .mp3, .wav) in src/assets/audio/
4. THE Project SHALL organize geospatial data files (.tif, .png heightmaps, .geojson) in src/assets/geodata/
5. WHEN an Asset_File is referenced by application code, THE Import_Path SHALL use the new consolidated location
6. WHEN an Asset_File exists in multiple locations with identical content, THE Project SHALL retain only one copy in the appropriate asset directory

### Requirement 4: Relocate Vue Components to Standard Location

**User Story:** As a developer, I want Vue components in their conventional location, so that the project structure matches Vue.js best practices.

#### Acceptance Criteria

1. THE Source_Directory SHALL contain a components/ subdirectory for all Vue_Component files
2. THE Project SHALL move all .vue files from Project_Root/components/ to src/components/
3. FOR ALL Vue_Component imports in the application, THE Import_Path SHALL reference src/components/
4. WHEN the application renders, THE Vue_Component files SHALL load and function identically to before restructuring

### Requirement 5: Clean Up Root Directory

**User Story:** As a developer, I want the root directory to contain only essential configuration and documentation, so that the project structure is clean and professional.

#### Acceptance Criteria

1. THE Project_Root SHALL contain only package.json, vite.config.js, index.html, .gitignore, .gitattributes, and directory folders after restructuring
2. THE Project SHALL remove or relocate legacy files (legacy-ocean-demo.js, duplicate images) from Project_Root
3. THE Project SHALL move all source .js files (main.js, counter.js, App.vue) to Source_Directory
4. THE Project SHALL move all style files (style.css) to Source_Directory
5. WHEN examining Project_Root, THE directory listing SHALL be concise with clear purpose for each item

### Requirement 6: Separate Public Assets from Source Code

**User Story:** As a developer, I want the public/ directory to contain only static assets served directly, so that the build system handles resources appropriately.

#### Acceptance Criteria

1. THE Public_Directory SHALL NOT contain any subdirectories named "helpers" after restructuring
2. THE Public_Directory SHALL contain only Asset_Files intended for direct serving (favicon, static images, audio)
3. WHEN a file in Public_Directory was previously code or configuration, THE Project SHALL relocate it to Source_Directory
4. THE Build_System SHALL serve Public_Directory assets without processing during development and production builds

### Requirement 7: Maintain Application Functionality

**User Story:** As a developer, I want all game features to work identically after restructuring, so that refactoring is purely organizational without behavioral changes.

#### Acceptance Criteria

1. WHEN the application starts after restructuring, THE game SHALL load the landing screen without errors
2. WHEN a user navigates through menus, THE application SHALL display all screens (boat selection, auth, dashboard, training hub) correctly
3. WHEN a user starts a simulation, THE 3D scene SHALL render with ocean, boat, terrain, and all visual elements
4. WHEN a user controls the boat, THE physics simulation SHALL respond identically to before restructuring
5. WHEN a user accesses inventory, missions, or training features, THE game logic SHALL function without errors
6. WHEN the application loads 3D models and textures, THE Asset_Files SHALL resolve from their new locations correctly
7. FOR ALL import statements, THE Build_System SHALL resolve modules without "module not found" errors

### Requirement 8: Update Build Configuration for New Structure

**User Story:** As a developer, I want build configuration to reflect the new structure, so that development and production builds work correctly.

#### Acceptance Criteria

1. THE vite.config.js SHALL include any necessary path aliases for the new src/ structure
2. WHEN running the development server, THE Build_System SHALL hot-reload changes to files in Source_Directory
3. WHEN running a production build, THE Build_System SHALL bundle all Source_Directory files correctly
4. THE index.html SHALL reference the entry point as /src/main.js instead of /main.js
5. WHEN the Build_System processes imports, THE module resolution SHALL work for all relocated files

### Requirement 9: Document New Project Structure

**User Story:** As a developer, I want documentation explaining the new structure, so that I and other developers understand the organization principles.

#### Acceptance Criteria

1. THE Project SHALL create or update a README.md in Project_Root explaining the folder structure
2. THE Documentation_File SHALL describe the purpose of each top-level directory (src/, public/, docs/, .kiro/)
3. THE Documentation_File SHALL explain the helper categorization system (physics/, rendering/, game-logic/, ui/, data/)
4. THE Documentation_File SHALL provide examples of where to place new files based on their function
5. WHEN a developer reads the documentation, THE structure principles SHALL be clear and actionable

### Requirement 10: Preserve Version Control History

**User Story:** As a developer, I want Git history preserved during restructuring, so that file lineage and blame information remain intact.

#### Acceptance Criteria

1. WHEN moving files, THE Project SHALL use git mv commands or equivalent operations that preserve history
2. WHEN examining git log for a moved file, THE version control system SHALL show history from before the move
3. WHEN running git blame on moved code, THE original authors and commit information SHALL remain accessible
4. THE Project SHALL create a single restructure commit with clear commit message describing all moves

