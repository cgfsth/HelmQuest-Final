# Dynamic Quiz Button - Create vs Update

## Feature
Ang "Create Quiz" button karon dynamic na - automatic sya mag-usab base sa kung naa ba existing quiz o wala.

## Behavior

### Kung WALA PA quiz para sa mission:
- Button text: **"Create Quiz"** 📝
- Clicking: Opens quiz editor para mag-create ug bag-o

### Kung NAA NA quiz para sa mission:
- Button text: **"Update Quiz"** 📝
- Clicking: Opens quiz editor with existing quiz data para ma-edit

## Implementation

### 1. Template Change
**File**: `src/App.vue` (line ~1167)

**Before**:
```vue
<button ... @click="startCreatingQuiz(module.id, module.title)">
  📝 Create Quiz
</button>
```

**After**:
```vue
<button ... @click="startCreatingQuiz(module.id, module.title)">
  📝 {{ getQuizButtonText(module.id) }}
</button>
```

### 2. New Function
**File**: `src/App.vue` (added before startCreatingQuiz)

```javascript
// Get quiz button text dynamically (Create vs Update)
function getQuizButtonText(moduleId) {
  if (!moduleId) return 'Create Quiz';
  
  // Check if quiz exists for this module
  const existingQuiz = getQuizForModule(moduleId);
  return existingQuiz ? 'Update Quiz' : 'Create Quiz';
}
```

## How It Works

1. **Dynamic Text**: Button automatically shows correct text based on quiz existence
2. **Real-time Check**: Uses `getQuizForModule()` to check localStorage/progressData
3. **User-Friendly**: Clear indication of what will happen when clicking
4. **Same Functionality**: Both buttons do the same thing - open quiz editor

## User Experience

### Creating New Quiz
1. User sees "Create Quiz" button
2. Clicks button
3. Quiz editor opens with blank quiz
4. After saving, button changes to "Update Quiz" ✅

### Updating Existing Quiz
1. User sees "Update Quiz" button
2. Knows there's already a quiz for this mission
3. Clicks to edit existing quiz
4. Quiz editor opens with current quiz data ✅

## Benefits

✅ **Clear Intent** - User knows kung mag-create o mag-update  
✅ **No Confusion** - Dili ma-confuse kung naa na ba quiz o wala  
✅ **Better UX** - More intuitive interface  
✅ **Professional** - Standard pattern sa modern applications  

## Edge Cases Handled

- **No moduleId**: Shows "Create Quiz" (safe default)
- **Quiz not found**: Shows "Create Quiz"
- **Quiz exists**: Shows "Update Quiz"
- **Error checking**: Defaults to "Create Quiz"

## Related Functions

- `getQuizForModule(moduleId)` - Synchronous check sa localStorage
- `getQuizForModuleFromFirestore(moduleId)` - Async query sa Firestore
- `startCreatingQuiz(moduleId)` - Opens quiz editor (handles both create/update)

---
**Date**: 2026-10-01  
**Feature**: Dynamic quiz button text  
**Status**: ✅ Implemented  
**User Request**: "kanang create quiz button ma hide na tapos ma ilisdan ug update quiz"
