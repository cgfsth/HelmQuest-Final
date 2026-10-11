# Requirements Document

## Introduction

This document specifies the requirements for implementing a trawl net fishing system in the HelmQuest maritime training simulator. The system enables commercial trawler operations including net deployment, active fishing while underway, net retrieval, and inventory management of caught fish. This feature is designed for educational purposes to teach students the fundamentals of trawl fishing operations in a realistic but simplified simulation environment.

## Glossary

- **Trawl_System**: The complete trawl net fishing subsystem including deployment, collection, and retrieval mechanisms
- **Net_Mesh**: The visual 3D representation of the fishing net deployed behind the trawler
- **Deployment_Controller**: The component responsible for deploying and retrieving the trawl net
- **Catch_Collector**: The component that detects and collects fish entities when they intersect with the active net
- **Net_State**: The current operational state of the trawl net (STOWED, DEPLOYING, ACTIVE, RETRIEVING)
- **Trawler**: The commercial fishing vessel equipped with trawl fishing capabilities
- **Fish_Entity**: A spawned fish object in the simulation world that can be caught
- **Inventory_System**: The existing system that stores and displays collected fish by species and quantity
- **Net_Capacity**: The maximum number of fish that can be stored in the deployed net before retrieval is required
- **Retrieval_Progress**: A percentage value (0-100) indicating the completion status of the net retrieval operation
- **Free_Roam_Mode**: The unrestricted simulation mode where the trawl system operates

## Requirements

### Requirement 1: Trawl Net Deployment

**User Story:** As a fishing student, I want to deploy a trawl net from my commercial trawler, so that I can begin fishing operations.

#### Acceptance Criteria

1. WHEN the user presses the designated deployment key AND the Net_State is STOWED, THE Deployment_Controller SHALL change Net_State to DEPLOYING
2. WHILE Net_State is DEPLOYING, THE Deployment_Controller SHALL animate the net deployment over a period between 2 and 5 seconds
3. WHEN deployment animation completes, THE Deployment_Controller SHALL change Net_State to ACTIVE
4. THE Net_Mesh SHALL render visibly behind the Trawler when Net_State is DEPLOYING or ACTIVE
5. IF the user presses the deployment key AND Net_State is not STOWED, THEN THE Deployment_Controller SHALL ignore the input
6. WHERE Free_Roam_Mode is enabled, THE Deployment_Controller SHALL allow net deployment without mission restrictions

### Requirement 2: Active Fishing Operations

**User Story:** As a fishing student, I want fish to be automatically collected while my net is deployed and my boat is moving, so that I can learn how trawl fishing works in practice.

#### Acceptance Criteria

1. WHILE Net_State is ACTIVE AND the Trawler velocity exceeds 0.5 knots, THE Catch_Collector SHALL detect Fish_Entity collisions with the Net_Mesh
2. WHEN a Fish_Entity collides with the Net_Mesh, THE Catch_Collector SHALL add the fish to the temporary catch storage
3. WHEN a Fish_Entity is collected, THE Catch_Collector SHALL remove the Fish_Entity from the visible simulation world
4. WHILE Net_State is ACTIVE, THE Trawl_System SHALL display visual feedback indicating the net is actively collecting fish
5. WHEN temporary catch storage reaches Net_Capacity, THE Trawl_System SHALL display a notification that the net is full
6. THE Net_Capacity SHALL be set to a value between 20 and 50 fish
7. WHILE the net is full AND Net_State is ACTIVE, THE Catch_Collector SHALL continue detecting collisions but shall not add additional fish to temporary storage

### Requirement 3: Net Retrieval Operations

**User Story:** As a fishing student, I want to retrieve my deployed net to access my catch, so that I can complete the fishing cycle and manage my harvest.

#### Acceptance Criteria

1. WHEN the user presses the designated retrieval key AND Net_State is ACTIVE, THE Deployment_Controller SHALL change Net_State to RETRIEVING
2. WHILE Net_State is RETRIEVING, THE Deployment_Controller SHALL animate the net retrieval over a period between 3 and 6 seconds
3. WHILE Net_State is RETRIEVING, THE Deployment_Controller SHALL update Retrieval_Progress from 0 to 100 proportionally with elapsed time
4. WHILE Net_State is RETRIEVING, THE Trawl_System SHALL display Retrieval_Progress to the user
5. WHEN Retrieval_Progress reaches 100, THE Deployment_Controller SHALL change Net_State to STOWED
6. WHEN Net_State changes to STOWED, THE Net_Mesh SHALL no longer be visible
7. IF the user presses the retrieval key AND Net_State is not ACTIVE, THEN THE Deployment_Controller SHALL ignore the input
8. WHILE Net_State is RETRIEVING, THE Catch_Collector SHALL not collect any additional fish

### Requirement 4: Inventory Integration

**User Story:** As a fishing student, I want my caught fish to appear in my inventory after I retrieve the net, so that I can see what I harvested and track my progress.

#### Acceptance Criteria

1. WHEN Net_State changes from RETRIEVING to STOWED, THE Trawl_System SHALL transfer all fish from temporary catch storage to the Inventory_System
2. WHEN fish are transferred to the Inventory_System, THE Trawl_System SHALL group fish by species and increment quantities for each species
3. WHEN fish are transferred to the Inventory_System, THE Trawl_System SHALL clear the temporary catch storage
4. WHEN the user presses the 'I' key, THE Inventory_System SHALL display all caught fish grouped by species with quantities
5. WHILE Net_State is not STOWED, THE temporary catch storage SHALL not be visible in the Inventory_System
6. THE Inventory_System SHALL persist fish quantities across multiple trawl fishing cycles

### Requirement 5: User Interface and Controls

**User Story:** As a fishing student, I want clear visual feedback and intuitive controls for the trawl system, so that I can operate it effectively without confusion.

#### Acceptance Criteria

1. THE Trawl_System SHALL provide a key binding display showing the deployment key and retrieval key
2. WHILE Net_State is ACTIVE, THE Trawl_System SHALL display a visual indicator showing the net is deployed and collecting
3. WHILE Net_State is ACTIVE, THE Trawl_System SHALL display the current number of fish in temporary catch storage
4. WHILE Net_State is RETRIEVING, THE Trawl_System SHALL display Retrieval_Progress as a percentage or progress bar
5. WHEN the net becomes full, THE Trawl_System SHALL display a notification message for at least 3 seconds
6. THE Trawl_System SHALL use distinct and non-conflicting key bindings that do not overlap with existing simulator controls
7. WHILE the Trawler is not the active vessel, THE Trawl_System SHALL not display trawl-specific UI elements

### Requirement 6: Visual Net Representation

**User Story:** As a fishing student, I want to see a realistic representation of the trawl net in the water, so that I can understand the spatial relationship between the net and my vessel.

#### Acceptance Criteria

1. WHILE Net_State is DEPLOYING, ACTIVE, or RETRIEVING, THE Net_Mesh SHALL be rendered as a 3D mesh behind the Trawler
2. THE Net_Mesh SHALL be positioned between 10 and 30 meters behind the Trawler stern
3. THE Net_Mesh SHALL have a width between 8 and 15 meters and a depth between 5 and 10 meters
4. THE Net_Mesh SHALL use a semi-transparent material with visible mesh pattern
5. WHILE the Trawler is moving, THE Net_Mesh SHALL follow the Trawler position with realistic trailing behavior
6. THE Net_Mesh SHALL include visible trawl cables connecting the net to the Trawler
7. WHILE Net_State is DEPLOYING, THE Net_Mesh SHALL gradually increase in size from zero to full dimensions
8. WHILE Net_State is RETRIEVING, THE Net_Mesh SHALL gradually decrease in size from full dimensions to zero

### Requirement 7: Fish Spawning and Population

**User Story:** As a fishing student, I want fish to spawn in the water at appropriate locations, so that there are fish available to catch during trawl operations.

#### Acceptance Criteria

1. THE Trawl_System SHALL spawn Fish_Entity objects in designated fishing areas of the simulation world
2. THE Trawl_System SHALL maintain a population between 50 and 200 Fish_Entity objects in the active simulation area
3. WHEN a Fish_Entity is collected by the net, THE Trawl_System SHALL spawn a replacement Fish_Entity in the fishing area within 10 to 30 seconds
4. THE Fish_Entity SHALL have species types matching the existing fish species in the Inventory_System
5. THE Fish_Entity SHALL move with simple swimming animation patterns
6. THE Fish_Entity SHALL spawn at depths between 2 and 20 meters below the water surface

### Requirement 8: Performance and Rendering

**User Story:** As a simulator user, I want the trawl fishing system to run smoothly without impacting frame rate, so that my simulation experience remains fluid and responsive.

#### Acceptance Criteria

1. WHILE the Net_Mesh is rendered, THE Trawl_System SHALL maintain simulation frame rate above 30 frames per second on minimum specification hardware
2. THE Net_Mesh SHALL use level-of-detail rendering to reduce polygon count when viewed from a distance greater than 50 meters
3. THE Trawl_System SHALL limit Fish_Entity collision detection to Fish_Entity objects within 100 meters of the Net_Mesh
4. THE Trawl_System SHALL use efficient mesh geometry with a polygon count below 5000 triangles for the Net_Mesh
5. THE Trawl_System SHALL batch render all Fish_Entity objects using instanced rendering when more than 20 fish are visible

### Requirement 9: System State Persistence

**User Story:** As a fishing student, I want my net state and catch to be preserved if I temporarily leave the trawler, so that I can perform other tasks without losing my progress.

#### Acceptance Criteria

1. WHEN the user switches away from the Trawler to another vessel, THE Trawl_System SHALL preserve Net_State
2. WHEN the user switches away from the Trawler, THE Trawl_System SHALL preserve temporary catch storage contents
3. WHEN the user returns to the Trawler, THE Trawl_System SHALL restore Net_State to the previous value
4. WHEN the user returns to the Trawler, THE Trawl_System SHALL restore temporary catch storage to the previous contents
5. IF Net_State was ACTIVE when the user switched away, THEN THE Net_Mesh SHALL become visible again when the user returns to the Trawler

### Requirement 10: Audio Feedback

**User Story:** As a fishing student, I want audio cues for trawl operations, so that I receive multi-sensory feedback about fishing activities.

#### Acceptance Criteria

1. WHEN Net_State changes from STOWED to DEPLOYING, THE Trawl_System SHALL play a deployment sound effect
2. WHEN Net_State changes from ACTIVE to RETRIEVING, THE Trawl_System SHALL play a retrieval sound effect
3. WHEN a Fish_Entity is collected, THE Trawl_System SHALL play a subtle catch sound effect
4. WHEN the net becomes full, THE Trawl_System SHALL play a notification alert sound
5. THE Trawl_System SHALL ensure audio effects do not overlap or cause audio distortion
6. WHERE user audio settings have effects muted, THE Trawl_System SHALL respect the mute setting

### Requirement 11: Error Handling and Edge Cases

**User Story:** As a simulator user, I want the trawl system to handle unexpected situations gracefully, so that the simulation remains stable and predictable.

#### Acceptance Criteria

1. IF the Trawler runs aground WHILE Net_State is ACTIVE or RETRIEVING, THEN THE Trawl_System SHALL force Net_State to STOWED and clear temporary catch storage
2. IF the simulation is paused WHILE Net_State is DEPLOYING or RETRIEVING, THEN THE Trawl_System SHALL pause animation timers
3. WHEN the simulation resumes from pause, THE Trawl_System SHALL resume animation timers from their paused state
4. IF the Net_Mesh position calculation results in the net intersecting with terrain, THEN THE Trawl_System SHALL clamp the net position to remain above terrain surface
5. IF Fish_Entity spawning fails due to lack of valid spawn locations, THEN THE Trawl_System SHALL retry spawning within 5 seconds
6. WHEN the Trawler is destroyed or removed from simulation, THE Trawl_System SHALL clean up all associated Net_Mesh and Fish_Entity objects

### Requirement 12: Integration with Existing Systems

**User Story:** As a developer, I want the trawl system to integrate seamlessly with existing HelmQuest systems, so that it feels like a native part of the simulator.

#### Acceptance Criteria

1. THE Trawl_System SHALL use the existing Inventory_System data structures for fish storage
2. THE Trawl_System SHALL use the existing Three.js scene graph for Net_Mesh rendering
3. THE Trawl_System SHALL respect the existing key binding system and shall not override existing control mappings
4. THE Trawl_System SHALL use the existing vessel physics system to calculate Trawler velocity
5. THE Trawl_System SHALL use the existing fish species definitions from the Inventory_System for Fish_Entity types
6. WHERE fishing spots are defined in the existing fishing spots system, THE Trawl_System SHALL spawn Fish_Entity objects preferentially in those locations
7. THE Trawl_System SHALL integrate with the existing Vue 3 component architecture for UI elements
