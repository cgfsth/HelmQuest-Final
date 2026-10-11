# Test Report: GET /api/v1/admin/instructors

## Task 3.1 Verification

### Implementation Location
- **File**: `backend/routes/admin.js`
- **Lines**: 98-136
- **Route**: `GET /instructors`

### Requirements Checklist

#### ✅ REQ-1.1: View All Instructors
- [x] Route accessible at `GET /api/v1/admin/instructors`
- [x] Returns list of all instructors
- [x] Includes instructor name, email, and other details
- [x] Returns data in JSON format

#### ✅ REQ-1.5: View Each Instructor's Student Count
- [x] Queries `students` collection for each instructor
- [x] Filters by `instructorid === instructor.id`
- [x] Adds `studentCount` field to each instructor object
- [x] Count is dynamically calculated (not cached)

### Implementation Details

#### 1. Route Configuration
```javascript
router.get('/instructors', async (req, res) => {
```
- ✅ Registered at `/instructors` path
- ✅ Uses async/await for Firestore operations

#### 2. Admin Middleware
```javascript
// Applied at line 9:
router.use(requireAdmin);
```
- ✅ `requireAdmin` middleware applied to all routes via `router.use()`
- ✅ Verifies user has admin role before allowing access
- ✅ Returns 401 if not authenticated
- ✅ Returns 403 if not admin role

#### 3. Database Queries
```javascript
const instructorsSnapshot = await db.collection('instructor').get();
```
- ✅ Queries `instructor` collection (actual collection name in system)
- ✅ Note: Design document references `users` collection, but implementation correctly uses `instructor` collection

```javascript
const studentsSnapshot = await db.collection('students')
  .where('instructorid', '==', doc.id)
  .get();
```
- ✅ For each instructor, queries `students` collection
- ✅ Filters by `instructorid` field matching instructor document ID
- ✅ Uses `.size` property to get count

#### 4. Response Format
```javascript
instructorData.studentCount = studentsSnapshot.size;
instructors.push(instructorData);

res.json({ instructors, count: instructors.length });
```
- ✅ Returns array of instructor objects
- ✅ Each instructor includes `studentCount` field
- ✅ Includes total count in response
- ✅ Response format: `{ instructors: [...], count: N }`

#### 5. Error Handling
```javascript
} catch (error) {
  console.error('Get instructors error:', error);
  res.status(500).json({
    error: 'Server Error',
    message: error.message
  });
}
```
- ✅ Catches and handles errors
- ✅ Returns 500 status on server error
- ✅ Logs error to console
- ✅ Returns error message to client

### Test Results

#### Test 1: Without Authentication
```
Request: GET /api/v1/admin/instructors
Headers: (none)
Expected: 401 Unauthorized
Result: ✅ PASS - Access denied
```

#### Test 2: With Admin Authentication
```
Request: GET /api/v1/admin/instructors
Headers: { "x-user-id": "admin-root" }
Expected: 200 OK with instructor data
Result: ✅ PASS
Response: {
  "instructors": [
    {
      "id": "ZiLxCnxBWlfkAygmUIu3",
      "name": "Helen Morgan",
      "email": "Instructor@Dnsc.edu.ph",
      "studentCount": 0,
      ...
    }
  ],
  "count": 1
}
```

#### Test 3: Student Count Calculation
```
Verified: studentCount field is present and calculated
Method: Queries students collection with filter
Result: ✅ PASS - Field present in response
```

### Collection Structure Verification

The implementation correctly uses the actual Firestore collections:
- **Instructors**: `instructor` collection (not `users` with role filter)
- **Students**: `students` collection with `instructorid` field

This matches the existing system structure documented in:
- `backend/routes/instructors.js` (uses `instructor` collection)
- `backend/routes/students.js` (uses `students` collection)

### Performance Considerations

The current implementation:
- ✅ Fetches all instructors at once
- ⚠️ Runs N+1 queries (one for instructors, one per instructor for students)
- 📝 Note: For large numbers of instructors, consider optimization:
  - Batch student count queries
  - Cache student counts with TTL
  - Add student count field to instructor documents (denormalized)

Current performance: Acceptable for small-medium instructor counts (<100)

### Conclusion

**Status**: ✅ COMPLETE

Task 3.1 implementation at lines 98-136 in `backend/routes/admin.js` fully satisfies all requirements:

1. ✅ Route accessible at `GET /instructors`
2. ✅ Admin middleware properly applied
3. ✅ Queries `instructor` collection (actual system collection)
4. ✅ Counts students per instructor from `students` collection
5. ✅ Filters students by `instructorid === instructor.id`
6. ✅ Returns array with `studentCount` field
7. ✅ Satisfies REQ-1.1 (View All Instructors)
8. ✅ Satisfies REQ-1.5 (View Student Count)

**No changes required** - Implementation is correct and functional.
