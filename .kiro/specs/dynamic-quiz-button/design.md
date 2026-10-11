# Design Document: Dynamic Quiz Button

## Overview

This feature enhances the instructor mission management interface by implementing a dynamic quiz button that adapts its text and behavior based on quiz existence. The implementation leverages Vue 3's Composition API to create a computed property for button text and a debounced click handler to prevent accidental duplicate actions. The system verifies quiz existence through both local state (progressData) and database records to ensure data consistency.

## Architecture

### Component Structure

The dynamic quiz button feature is implemented entirely within the existing `App.vue` component's instructor dashboard section. The feature integrates with:

- **Local State**: `progressData` reactive reference containing quiz assignments and quiz records
- **Existing Functions**: `getQuizzesForModule()` for local quiz lookup, `startCreatingQuiz()` for quiz creation, and modal management functions
- **Backend API**: `firebaseApi.getAllQuizzes()` for database verification queries

### Data Flow

```
User clicks quiz button
  ↓
Debounce mechanism (300ms)
  ↓
Determine button state (computed property)
  ↓
Check progressData (getQuizzesForModule)
  ↓
If quizzes found: Verify with database
  ↓
Route to appropriate action:
  - No quiz: startCreatingQuiz()
  - Quiz exists: openQuizManager()
```

## Components

### 1. Computed Property: `quizButtonText`

**Purpose**: Dynamically compute button text based on quiz existence for a given mission

**Type**: Vue 3 computed property returning a function (computed getter with parameters)

**Signature**:
```javascript
const quizButtonText = computed(() => {
  return (moduleId) => {
    // Returns "CREATE QUIZ" or "UPDATE QUIZ"
  };
});
```

**Logic**:
1. Accept `moduleId` as parameter
2. Call `getQuizzesForModule(moduleId)` to check local state
3. If quizzes found, verify existence in database (async check)
4. Return "UPDATE QUIZ" if quiz exists, "CREATE QUIZ" otherwise
5. Handle edge cases: null/undefined data, inconsistent state

**Implementation Notes**:
- Since computed properties cannot be async, the database verification will be handled through a separate reactive reference that tracks verified quiz states
- Use a Map or object to cache verification results per module to avoid redundant API calls
- The computed property will check this cache to determine button text

### 2. Reactive State: `verifiedQuizStates`

**Purpose**: Cache database verification results for quiz existence per module

**Type**: Vue 3 reactive reference containing a Map

**Structure**:
```javascript
const verifiedQuizStates = ref(new Map());
// Map<moduleId, { hasQuiz: boolean, timestamp: number }>
```

**Usage**:
- Updated by database verification function
- Read by `quizButtonText` computed property
- Includes timestamp for cache invalidation (5-minute TTL)

### 3. Function: `verifyQuizExistence`

**Purpose**: Asynchronously verify quiz existence in database and update cache

**Signature**:
```javascript
async function verifyQuizExistence(moduleId) {
  // Query database and update verifiedQuizStates
}
```

**Implementation**:
1. Check if cached result exists and is fresh (< 5 minutes old)
2. If cached, return cached result
3. Otherwise, query database via `firebaseApi.getAllQuizzes()`
4. Filter results for quizzes assigned to the given module
5. Update `verifiedQuizStates` Map with result
6. Log inconsistencies if progressData and database disagree
7. Return boolean indicating quiz existence

**Error Handling**:
- On network error: fall back to progressData state
- On API error: log error and default to progressData
- On timeout: use progressData as fallback

### 4. Function: `handleQuizButtonClick`

**Purpose**: Debounced click handler that routes to appropriate action based on quiz existence

**Signature**:
```javascript
const handleQuizButtonClick = debounce(async (moduleId, moduleTitle) => {
  // Route to create or update action
}, 300);
```

**Implementation**:
1. Accept `moduleId` and `moduleTitle` as parameters
2. Set loading state (optional visual feedback)
3. Check `verifiedQuizStates` for quiz existence
4. If no verified state, call `verifyQuizExistence(moduleId)` and wait
5. Route to appropriate action:
   - No quiz: `startCreatingQuiz(moduleId, moduleTitle)`
   - Quiz exists: `openQuizManager(moduleId, moduleTitle)`
6. Clear loading state

**Debounce Implementation**:
- Use a simple debounce utility or create inline
- 300ms delay to prevent double-clicks
- Leading edge execution (first click executes immediately, subsequent clicks within 300ms are ignored)

### 5. Debounce Utility

**Purpose**: Prevent rapid repeated function executions

**Implementation**:
```javascript
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
```

**Characteristics**:
- Leading edge execution (immediate first call)
- Blocks subsequent calls during delay period
- Resets after delay expires

### 6. Function: `openQuizManager`

**Purpose**: Open the quiz manager modal for missions with existing quizzes

**Signature**:
```javascript
function openQuizManager(moduleId, moduleTitle) {
  // Set quizManagerModal.value
}
```

**Implementation**:
1. Close any open modals
2. Set `quizManagerModal.value` with module information
3. Modal will display list of quizzes via `getQuizzesForModule(moduleId)`

**Note**: This function likely already exists in a similar form. This design formalizes its usage.

## Interfaces

### Template Integration

**Current Button**:
```vue
<button 
  type="button" 
  class="instructor-mission-btn instructor-mission-btn--quiz" 
  @click="startCreatingQuiz(module.id, module.title)"
>
  📝 Create Quiz
</button>
```

**Updated Button**:
```vue
<button 
  type="button" 
  class="instructor-mission-btn instructor-mission-btn--quiz" 
  @click="handleQuizButtonClick(module.id, module.title)"
  :disabled="isQuizButtonDisabled(module.id)"
>
  📝 {{ quizButtonText(module.id) }}
</button>
```

### API Interface

**Database Verification Endpoint**:
- Uses existing `firebaseApi.getAllQuizzes()` function
- Returns array of all quiz objects
- Filtered client-side to find quizzes for specific module

**Alternative**: If performance becomes an issue with large quiz collections, consider adding a backend endpoint:
```javascript
// Future optimization
firebaseApi.getQuizzesForModule(moduleId)
```

## Data Models

### Quiz Assignment Structure (from progressData)

```javascript
{
  quizAssignments: [
    {
      quizId: string,
      targetId: string,      // moduleId
      targetType: 'module',
      assignedAt: ISO8601 timestamp
    }
  ],
  quizzes: [
    {
      id: string,
      title: string,
      description: string,
      questions: Array,
      createdBy: string,
      createdAt: ISO8601 timestamp,
      updatedAt: ISO8601 timestamp
    }
  ]
}
```

### Verified State Cache Entry

```javascript
{
  hasQuiz: boolean,           // Quiz exists in database
  timestamp: number,          // Unix timestamp of verification
  source: 'database' | 'fallback'  // Data source used
}
```

## Error Handling

### Error Scenarios

1. **Database Verification Timeout**
   - Fallback: Use progressData state
   - Log: Warning to console
   - User Impact: Button may show incorrect state temporarily

2. **Network Error During Verification**
   - Fallback: Use progressData state
   - Log: Error to console with details
   - User Impact: Button functionality preserved

3. **Null/Undefined progressData**
   - Fallback: Default to "CREATE QUIZ" state
   - Log: Warning about missing data
   - User Impact: Can still create quiz

4. **Data Inconsistency (progressData has quiz, database doesn't)**
   - Resolution: Prioritize database as source of truth
   - Log: Data inconsistency details to console
   - User Impact: Shows "CREATE QUIZ" (correct state)

5. **Rapid Repeated Clicks**
   - Resolution: Debounce mechanism ignores subsequent clicks
   - Log: No logging needed (expected behavior)
   - User Impact: Only first click executes

### Logging Strategy

All error scenarios and data inconsistencies will log to browser console with structured messages:

```javascript
console.warn('[Quiz Button] Data inconsistency detected:', {
  moduleId,
  progressDataHasQuiz: boolean,
  databaseHasQuiz: boolean,
  resolution: 'Using database state'
});

console.error('[Quiz Button] Database verification failed:', {
  moduleId,
  error: errorObject,
  fallback: 'Using progressData state'
});
```

## State Management

### Reactive References

1. **verifiedQuizStates**: `ref(new Map())`
   - Stores verification results per module
   - Includes timestamp for cache invalidation
   - Cleared when progressData updates

2. **quizButtonLoadingStates**: `ref(new Set())`
   - Optional: Track which buttons are in loading state
   - Used for visual feedback during async operations
   - Contains moduleIds currently being verified

### Computed Properties

1. **quizButtonText**: `computed(() => (moduleId) => string)`
   - Returns appropriate button text per module
   - Checks verifiedQuizStates cache
   - Falls back to progressData if no verification

2. **isQuizButtonDisabled**: `computed(() => (moduleId) => boolean)`
   - Optional: Disable button during verification
   - Checks quizButtonLoadingStates
   - Prevents interaction during async operations

### Watchers

**Watch progressData changes**:
```javascript
watch(() => progressData.value?.quizzes, () => {
  // Clear verification cache when quiz data changes
  verifiedQuizStates.value.clear();
}, { deep: true });
```

## Performance Considerations

### Caching Strategy

1. **Verification Cache TTL**: 5 minutes
   - Balances freshness with API call reduction
   - Invalidated on progressData changes

2. **Lazy Verification**: Only verify when progressData indicates quiz exists
   - Reduces unnecessary API calls
   - "CREATE QUIZ" state requires no verification

3. **Batch Verification**: Future optimization
   - If many modules render simultaneously
   - Single API call can verify all modules
   - Group verification requests

### Debounce Timing

- **300ms delay**: Balances responsiveness with protection
- Leading edge execution: First click is immediate
- Prevents double-submission scenarios

### Rendering Performance

- Computed properties are cached by Vue
- Only recalculate when dependencies change
- Minimal impact on render cycle

## Security Considerations

### Input Validation

- **moduleId**: Validated to be non-empty string
- **moduleTitle**: Sanitized before passing to quiz creation
- Database queries use parameterized format (handled by firebaseApi)

### Authorization

- Quiz button only visible in instructor interface
- Backend API endpoints enforce instructor authorization
- No client-side security bypass possible

### Data Consistency

- Database is always source of truth
- Local state used only for performance optimization
- Inconsistencies logged for debugging

## Testing Strategy

### Unit Tests

1. **Debounce Function**
   - Test rapid clicks are blocked
   - Verify only first click executes
   - Confirm timeout resets correctly

2. **verifyQuizExistence Function**
   - Test successful database query
   - Test network error fallback
   - Test cache hit behavior
   - Test cache expiration

3. **quizButtonText Computed Property**
   - Test "CREATE QUIZ" for modules without quizzes
   - Test "UPDATE QUIZ" for modules with quizzes
   - Test null/undefined data handling

4. **handleQuizButtonClick Function**
   - Test routing to startCreatingQuiz
   - Test routing to openQuizManager
   - Test parameter passing

### Integration Tests

1. **Full Click Flow**
   - Click on mission without quiz → verify quiz creation opens
   - Click on mission with quiz → verify quiz manager opens
   - Rapid click → verify only one action occurs

2. **Database Verification**
   - progressData has quiz, database has quiz → "UPDATE QUIZ"
   - progressData has quiz, database doesn't → "CREATE QUIZ"
   - progressData empty, database has quiz → "UPDATE QUIZ"

3. **Error Scenarios**
   - Network error during verification → fallback works
   - Null progressData → button still functional

### Property-Based Tests

Property-based tests are not appropriate for this feature because:
- The feature tests UI interactions and external service integration (database verification)
- Button behavior is deterministic based on specific state combinations
- Database and modal interactions are infrastructure/external services
- Visual feedback and timing are not computable properties
- Configuration and state management are one-time setups, not universal behaviors

Instead, this feature should use:
- **Example-based unit tests** for specific state combinations
- **Integration tests** for database verification flow
- **UI interaction tests** for click handling and modal behavior

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing the prework analysis, several properties are logically redundant:
- Properties about debouncing (2.1, 2.2, 2.4) all test the same behavior from different angles
- Properties about database verification (1.4, 3.2) are duplicates
- Properties about data inconsistency (1.5, 3.5, 6.1) test the same scenario
- Properties about button text (1.1, 1.2) cover the core behavior completely

Consolidating these into minimal, comprehensive properties:

### Property 1: Button Text Reflects Quiz Existence

*For any* mission without quizzes in verified state, the button text computed property SHALL return "CREATE QUIZ", and *for any* mission with quizzes in verified state, the button text computed property SHALL return "UPDATE QUIZ"

**Validates: Requirements 1.1, 1.2**

### Property 2: Debounce Prevents Rapid Execution

*For any* sequence of rapid clicks (clicks within 300 milliseconds), only the first click handler execution SHALL complete, and all subsequent clicks within the debounce window SHALL be ignored

**Validates: Requirements 2.1, 2.2, 2.4**

### Property 3: Database Verification Triggered for Existing Quizzes

*For any* mission where progressData indicates quiz existence, the system SHALL trigger database verification before determining final button state

**Validates: Requirements 1.4, 3.2**

### Property 4: Database Overrides Local State

*For any* data inconsistency scenario where progressData and database disagree on quiz existence, the database result SHALL be used as the source of truth for button state determination

**Validates: Requirements 1.5, 3.5, 6.1**

### Property 5: Create Action Routes Correctly

*For any* mission without quizzes, clicking the quiz button SHALL invoke `startCreatingQuiz` with the correct module ID and module title parameters

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Update Action Routes Correctly

*For any* mission with existing quizzes, clicking the quiz button SHALL invoke `openQuizManager` with the correct module ID and module title parameters

**Validates: Requirements 5.1, 5.2**

### Property 7: Null Safety Preserved

*For any* scenario where progressData is null or undefined, the quiz button SHALL remain functional and default to "CREATE QUIZ" state without throwing errors

**Validates: Requirements 6.5**

### Property 8: Network Error Fallback

*For any* database verification failure due to network error, the quiz button SHALL fall back to progressData state and remain functional

**Validates: Requirements 6.2, 6.4**

## Migration Notes

### Existing Code Changes

1. **Template Update**
   - Change `@click="startCreatingQuiz(module.id, module.title)"` to `@click="handleQuizButtonClick(module.id, module.title)"`
   - Change button text from hardcoded `"📝 Create Quiz"` to dynamic `"📝 {{ quizButtonText(module.id) }}"`
   - Add optional `:disabled` binding for loading state

2. **Script Setup Section**
   - Add `verifiedQuizStates` reactive reference
   - Add `quizButtonText` computed property
   - Add `verifyQuizExistence` async function
   - Add `handleQuizButtonClick` debounced function
   - Add `debounce` utility function
   - Add or modify `openQuizManager` function
   - Add watcher for progressData changes

3. **No Breaking Changes**
   - Existing `startCreatingQuiz` function remains unchanged
   - Existing `getQuizzesForModule` function remains unchanged
   - Modal state management remains compatible

### Rollback Strategy

If issues arise, revert to previous button implementation by:
1. Restore hardcoded button text: `"📝 Create Quiz"`
2. Restore direct click handler: `@click="startCreatingQuiz(module.id, module.title)"`
3. Remove new functions (debounce, verification, computed properties)

## Future Enhancements

### Performance Optimizations

1. **Backend Module-Specific Query**
   - Add `GET /api/v1/quizzes/module/:moduleId` endpoint
   - Reduces payload size for verification
   - Eliminates client-side filtering

2. **Batch Verification**
   - Verify all visible modules in single API call
   - Implement when rendering 10+ modules simultaneously
   - Further reduces API call count

3. **WebSocket Real-Time Updates**
   - Push quiz creation/deletion events to clients
   - Automatically update verified states
   - Eliminates cache staleness

### User Experience Enhancements

1. **Visual Loading States**
   - Add spinner or loading indicator during verification
   - Disable button during async operations
   - Improve perceived responsiveness

2. **Optimistic UI Updates**
   - Immediately show "UPDATE QUIZ" after quiz creation
   - Update cache optimistically
   - Revert only if verification fails

3. **Tooltip Information**
   - Show quiz count on hover
   - Display last update timestamp
   - Provide context without clicking

### Accessibility Improvements

1. **ARIA Labels**
   - Add `aria-label` describing current state
   - Announce state changes to screen readers
   - Improve keyboard navigation feedback

2. **Loading Announcements**
   - Use `aria-live` regions for verification status
   - Announce completion to assistive technologies

## Open Questions

1. **Cache TTL Duration**: Is 5 minutes appropriate, or should it be configurable?
2. **Batch Verification**: Should we implement batch verification immediately or wait for performance issues?
3. **Loading Indicators**: Should loading state be implemented in v1 or deferred?
4. **Backend Optimization**: Should we add module-specific query endpoint now or later?

## Dependencies

### Existing Functions

- `getQuizzesForModule(moduleId)` - Local quiz lookup
- `startCreatingQuiz(moduleId, moduleTitle)` - Quiz creation workflow
- `progressData` - Reactive reference with quiz state

### External Dependencies

- `firebaseApi.getAllQuizzes()` - Database verification
- Vue 3 Composition API - `ref()`, `computed()`, `watch()`

### New Dependencies

- None - all functionality uses existing framework and libraries

## Implementation Order

1. **Phase 1**: Core Functionality
   - Implement `debounce` utility
   - Create `verifiedQuizStates` reactive reference
   - Implement `verifyQuizExistence` function
   - Create `quizButtonText` computed property

2. **Phase 2**: Click Handler
   - Implement `handleQuizButtonClick` function
   - Create `openQuizManager` function (if not exists)
   - Add progressData watcher

3. **Phase 3**: Template Integration
   - Update button template
   - Test rendering with various states
   - Verify click behavior

4. **Phase 4**: Error Handling & Polish
   - Add comprehensive error logging
   - Implement fallback behaviors
   - Add cache invalidation logic

5. **Phase 5**: Testing
   - Write unit tests
   - Write integration tests
   - Manual testing across scenarios
