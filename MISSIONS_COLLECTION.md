# 🧭 MISSIONS COLLECTION
## Para sa Instructor Mission Management

---

## Collection Name: `training_modules`

---

## 📝 Document Structure

```javascript
{
  // Basic Info
  "id": "m1-mission1",                    // Unique ID (auto-generated or custom)
  "title": "Mission 1: Basic Navigation",
  "category": "Module 1",
  "description": "Learn to navigate using GPS coordinates and return to harbor",
  
  // Difficulty & Time
  "difficulty": "Beginner",               // "Beginner" | "Intermediate" | "Advanced"
  "duration": "5-10 minutes",
  "reward": "+100 XP",
  
  // Boat Requirement
  "boatType": "medium",                   // "small" | "medium" | "large"
  
  // Learning Goals
  "objectives": [
    "Navigate to waypoint using GPS",
    "Maintain proper speed and heading",
    "Return to harbor safely"
  ],
  
  // Mission Steps (Waypoints)
  "steps": [
    {
      "instruction": "Navigate to coordinates 7.11°N, 125.74°E",
      "waypointZone": "m1-step-1",
      "type": "gps",                      // "gps" | "compass" | "dock"
      "lat": "7.1100",
      "lon": "125.7400",
      "heading": ""
    },
    {
      "instruction": "Steer heading 180° to reach next point",
      "waypointZone": "m1-step-2",
      "type": "compass",
      "lat": "",
      "lon": "",
      "heading": "180"
    },
    {
      "instruction": "Return to harbor docks",
      "waypointZone": "m1-dock-return",
      "type": "dock",
      "lat": "",
      "lon": "",
      "heading": ""
    }
  ],
  
  // Settings
  "completed": false,                     // Always false for new missions
  "disableFishing": true,                 // Disable fishing during mission
  
  // Creator Info
  "createdBy": "instructor-helen",        // Instructor ID
  "createdAt": "2026-01-15T09:00:00Z",
  "updatedAt": "2026-01-15T09:30:00Z"
}
```

---

## 🎯 When Instructor Creates Mission

**UI: Instructor → Missions Tab → [+ Create New Mission]**

**Form Fields:**
- ✅ Mission Title
- ✅ Category (Module 1, Module 2, etc.)
- ✅ Description
- ✅ Difficulty (Beginner/Intermediate/Advanced)
- ✅ Duration (e.g., "5-10 minutes")
- ✅ XP Reward (e.g., "+100 XP")
- ✅ Required Boat Type (Small/Medium/Large)
- ✅ Objectives (list)
- ✅ Steps (list with waypoints)

**Database Operation:**
```javascript
POST /api/v1/modules

Body:
{
  "id": "custom-mission-1737550000",
  "title": "Mission 4: Advanced Patrol",
  "category": "Module 2",
  "description": "Multi-waypoint patrol mission",
  "difficulty": "Advanced",
  "duration": "15-20 minutes",
  "reward": "+250 XP",
  "boatType": "large",
  "objectives": [
    "Complete full patrol route",
    "Maintain speed under 15 knots",
    "Report to harbor"
  ],
  "steps": [
    {
      "instruction": "Navigate to Patrol Point 1",
      "waypointZone": "patrol-1",
      "type": "gps",
      "lat": "7.1100",
      "lon": "125.7400",
      "heading": ""
    },
    {
      "instruction": "Head to Patrol Point 2",
      "waypointZone": "patrol-2",
      "type": "compass",
      "lat": "",
      "lon": "",
      "heading": "90"
    },
    {
      "instruction": "Return to dock",
      "waypointZone": "return-dock",
      "type": "dock",
      "lat": "",
      "lon": "",
      "heading": ""
    }
  ],
  "completed": false,
  "disableFishing": true,
  "createdBy": "instructor-helen",
  "createdAt": "2026-01-22T10:00:00Z"
}
```

---

## ✏️ When Instructor Edits Mission

**UI: Instructor → Missions Tab → Mission Card → [Edit]**

**Database Operation:**
```javascript
PUT /api/v1/modules/m1-mission1

Body:
{
  "title": "Mission 1: Updated Title",
  "description": "Updated description",
  "difficulty": "Intermediate",
  // ... other updated fields
  "updatedAt": "2026-01-22T11:00:00Z"
}
```

---

## 🗑️ When Instructor Deletes Mission

**UI: Instructor → Missions Tab → Mission Card → [Delete]**

**Database Operation:**
```javascript
DELETE /api/v1/modules/custom-mission-1737550000
```

---

## 🔍 When Instructor Views Missions List

**UI: Instructor → Missions Tab**

**Database Query:**
```javascript
GET /api/v1/modules

// OR filter by creator
GET /api/v1/modules?createdBy=instructor-helen
```

**Response:**
```javascript
[
  {
    "id": "m1-mission1",
    "title": "Mission 1: Basic Navigation",
    "category": "Module 1",
    "difficulty": "Beginner",
    "duration": "5-10 minutes",
    "reward": "+100 XP",
    "createdBy": "instructor-helen"
  },
  {
    "id": "m1-mission2",
    "title": "Mission 2: Compass Navigation",
    "category": "Module 1",
    "difficulty": "Beginner",
    "duration": "10-15 minutes",
    "reward": "+150 XP",
    "createdBy": "instructor-helen"
  }
]
```

---

## 📊 Step Types Explained

### Type: "gps"
```javascript
{
  "instruction": "Navigate to coordinates 7.11°N, 125.74°E",
  "type": "gps",
  "lat": "7.1100",
  "lon": "125.7400",
  "heading": ""
}
```
**Student must:** Navigate to specific GPS coordinates

### Type: "compass"
```javascript
{
  "instruction": "Steer heading 180° (South)",
  "type": "compass",
  "lat": "",
  "lon": "",
  "heading": "180"
}
```
**Student must:** Follow specific compass heading

### Type: "dock"
```javascript
{
  "instruction": "Return to harbor docks",
  "type": "dock",
  "lat": "",
  "lon": "",
  "heading": ""
}
```
**Student must:** Return to starting dock/harbor

---

## ✅ Summary

**Collection:** `training_modules`

**CRUD Operations:**
- **CREATE** → Instructor creates new mission
- **READ** → Instructor views missions list / Student sees available missions
- **UPDATE** → Instructor edits mission
- **DELETE** → Instructor removes mission

**Key Fields:**
- `id` - Unique identifier
- `title` - Mission name
- `steps` - Array of waypoints
- `createdBy` - Which instructor created it
- `boatType` - Required boat size
- `objectives` - Learning goals

That's it! One simple collection for all missions! 🎯
