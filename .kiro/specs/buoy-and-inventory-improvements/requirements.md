# Requirements Document

## Introduction

This feature enhances the HelmQuest fishing simulation with improved buoy interactivity and organized fish inventory management. Currently, buoys exist as visual 3D meshes (waypoint markers, channel buoys, fishing gear markers) with texture-based IDs but lack interactive functionality. The fish inventory displays individual fish cards without quantity aggregation. This feature will make buoys functional with clear ID display and visual feedback, while reorganizing the inventory to group fish by species with counts.

## Glossary

- **Buoy**: A 3D mesh object in the scene that marks waypoints, channels, or fishing gear locations
- **Buoy_System**: The collection of buoy-related functions in missionWaypoints.js
- **Fishing_Gear_Marker**: A specialized buoy marking gillnet, crab pot, or longline locations
- **Waypoint_Marker**: A buoy marking navigation waypoints or patrol points
- **Channel_Buoy**: A buoy marking harbor channel boundaries (port/starboard)
- **Buoy_ID**: A unique identifier displayed on each buoy (e.g., "482" for gillnet markers)
- **Fish_Inventory**: The collection of caught fish displayed in InventoryModal.vue
- **Inventory_System**: The inventory display and management logic in InventoryModal.vue
- **Species_Group**: A collection of identical fish species aggregated for display
- **Raycaster**: A Three.js utility for detecting mouse/pointer intersection with 3D objects
- **Hover_State**: Visual feedback when the user's pointer is over an interactive buoy
- **Interaction_Handler**: JavaScript code that processes user clicks and hover events on buoys

## Requirements

### Requirement 1: Buoy Interactivity

**User Story:** As a player, I want to interact with buoys by clicking and hovering over them, so that I can access buoy information and receive visual feedback

#### Acceptance Criteria

1. WHEN a player hovers over a buoy, THE Buoy_System SHALL highlight the buoy with increased scale or emissive intensity
2. WHEN a player moves the pointer away from a buoy, THE Buoy_System SHALL restore the buoy to its default visual state within 100ms
3. WHEN a player clicks on a buoy, THE Buoy_System SHALL display a modal or panel containing buoy information
4. THE Interaction_Handler SHALL use raycasting to detect pointer intersection with buoy meshes
5. THE Buoy_System SHALL distinguish between fishing gear markers, waypoint markers, and channel buoys for interaction purposes
6. WHEN a buoy is in hover state, THE Buoy_System SHALL change the cursor style to pointer
7. FOR ALL buoy types (fishing gear, waypoint, channel), the interaction system SHALL function consistently

### Requirement 2: Buoy Size Enhancement

**User Story:** As a player, I want buoys to be larger and more visible, so that I can easily locate them during navigation

#### Acceptance Criteria

1. THE Buoy_System SHALL increase waypoint marker buoy radius from 1.5 to 2.5 units
2. THE Buoy_System SHALL increase fishing gear marker scale from 10 to 15 units
3. THE Buoy_System SHALL increase channel buoy cylinder radius from 1.2 to 1.8 units when inactive and from 1.5 to 2.2 units when active
4. WHEN a buoy size is increased, THE Buoy_System SHALL maintain aspect ratio and proportions
5. THE Buoy_System SHALL ensure increased buoy sizes do not cause rendering performance degradation beyond 5% frame time increase
6. WHEN buoys are resized, THE Buoy_System SHALL update collision detection volumes accordingly

### Requirement 3: Buoy ID Display Enhancement

**User Story:** As a player, I want to clearly see buoy IDs on all buoys, so that I can identify and report specific buoys during missions

#### Acceptance Criteria

1. THE Buoy_System SHALL display a unique ID label on every buoy visible from at least 200 meters
2. WHEN a buoy ID exists in zone configuration, THE Buoy_System SHALL render the ID using createIdLabelSprite or equivalent texture-based display
3. THE Buoy_System SHALL position ID labels above distance labels with at least 4 units vertical separation
4. WHEN a player is within 50 meters of a buoy, THE Buoy_System SHALL increase ID label font size by 50%
5. THE Buoy_System SHALL use high-contrast colors for ID labels (yellow background with dark text) for visibility
6. WHEN no explicit ID exists for a buoy, THE Buoy_System SHALL generate a unique ID based on zone id property
7. FOR ALL fishing gear markers, THE Buoy_System SHALL display registration IDs prominently on the buoy texture using createBuoyTexture

### Requirement 4: Buoy Information Panel

**User Story:** As a player, I want to see detailed information when I click a buoy, so that I can learn about the buoy's purpose and location

#### Acceptance Criteria

1. WHEN a player clicks a buoy, THE Buoy_System SHALL display a panel containing buoy ID, type, world coordinates, and description
2. THE Buoy_System SHALL show buoy type as one of: Waypoint, Fishing Gear (Gillnet), Fishing Gear (Crab Pot), Fishing Gear (Longline), Channel (Port), Channel (Starboard), or Dock
3. WHEN the information panel is open, THE Buoy_System SHALL provide a close button or allow dismissal by clicking outside the panel
4. THE Buoy_System SHALL format world coordinates in meters with 1 decimal place precision
5. WHEN a fishing gear buoy is clicked, THE Buoy_System SHALL display gear type and registration ID
6. THE Buoy_System SHALL ensure the information panel renders above all other UI elements except critical navigation alerts

### Requirement 5: Fish Inventory Grouping

**User Story:** As a player, I want my fish inventory to show each species once with quantity counts, so that I can quickly understand what I've caught

#### Acceptance Criteria

1. THE Inventory_System SHALL group fish by species name to create Species_Groups
2. WHEN multiple fish of the same species are caught, THE Inventory_System SHALL display the species once with a quantity count
3. THE Inventory_System SHALL display quantities using the format "[Fish Name] x [Amount]"
4. WHEN rendering a Species_Group, THE Inventory_System SHALL show the fish image once per species
5. THE Inventory_System SHALL preserve scientific names in the grouped display
6. FOR ALL Species_Groups, the Inventory_System SHALL maintain accurate count totals

### Requirement 6: Fish Inventory Sorting

**User Story:** As a player, I want my fish inventory sorted by quantity or name, so that I can easily find the fish I've caught most

#### Acceptance Criteria

1. THE Inventory_System SHALL sort Species_Groups by quantity in descending order by default
2. THE Inventory_System SHALL provide a toggle to switch between quantity sort and alphabetical sort
3. WHEN alphabetical sort is active, THE Inventory_System SHALL sort by common fish name in ascending order
4. WHEN the sort mode changes, THE Inventory_System SHALL re-render the inventory list within 200ms
5. THE Inventory_System SHALL persist the selected sort mode across inventory modal open/close cycles within the same session

### Requirement 7: Fish Inventory Summary Statistics

**User Story:** As a player, I want to see total fish count and unique species count, so that I can track my fishing progress

#### Acceptance Criteria

1. THE Inventory_System SHALL calculate and display total fish count as the sum of all species quantities
2. THE Inventory_System SHALL calculate and display unique species count as the number of distinct Species_Groups
3. THE Inventory_System SHALL update summary statistics immediately when fish are added to inventory
4. THE Inventory_System SHALL display statistics in the inventory modal header using the format "Your Fish Inventory ([total count] fish, [unique count] species)"
5. WHEN inventory is empty, THE Inventory_System SHALL display "Your Fish Inventory (0 fish, 0 species)"

### Requirement 8: Buoy Hover Visual Feedback

**User Story:** As a player, I want clear visual feedback when hovering over buoys, so that I know which buoys are interactive

#### Acceptance Criteria

1. WHEN a player hovers over a buoy, THE Buoy_System SHALL increase the buoy scale by 15% with smooth animation over 150ms
2. WHEN a player hovers over a fishing gear marker, THE Buoy_System SHALL increase emissive intensity of the beacon top from 1.2 to 2.5
3. WHEN hover state ends, THE Buoy_System SHALL restore original scale and emissive values with smooth animation over 150ms
4. THE Buoy_System SHALL apply hover effects only to the buoy mesh and its beacon, not to geofence rings or labels
5. WHEN multiple buoys are within raycaster range, THE Buoy_System SHALL apply hover effect only to the nearest buoy
6. THE Buoy_System SHALL ensure hover animations do not conflict with existing active/inactive state transitions

### Requirement 9: Buoy Interaction Distance Limit

**User Story:** As a player, I want to interact with buoys only when within reasonable range, so that interactions feel realistic and intentional

#### Acceptance Criteria

1. THE Buoy_System SHALL enable click interactions only when the player is within 500 meters of the buoy
2. WHEN a player attempts to click a buoy beyond 500 meters, THE Buoy_System SHALL display a message "Too far to interact (distance: [X]m)"
3. THE Buoy_System SHALL enable hover effects at any visible distance
4. WHEN calculating interaction distance, THE Buoy_System SHALL use 2D horizontal distance (ignoring y-axis height difference)
5. THE Buoy_System SHALL update interaction eligibility every frame based on current player position

### Requirement 10: Fish Inventory Data Structure Migration

**User Story:** As a developer, I want the inventory system to support grouped fish data, so that the UI can display aggregated species information

#### Acceptance Criteria

1. THE Inventory_System SHALL accept both legacy individual fish arrays and new grouped fish maps as data sources
2. WHEN legacy individual fish data is provided, THE Inventory_System SHALL transform it into Species_Groups on load
3. THE Inventory_System SHALL store grouped fish data as a map with species name as key and object containing count, image, and scientific name as value
4. WHEN a fish is added to inventory, THE Inventory_System SHALL increment the count for existing species or create a new Species_Group entry
5. THE Inventory_System SHALL maintain backward compatibility with existing fish addition logic in App.vue
6. WHEN exporting inventory data, THE Inventory_System SHALL provide both grouped and individual formats
