// Transcribed from all six pages of the supplied official PDF. Matrix wording
// (including the original grammar) is preserved; this is not generated content.
// Instructor resources live in Firestore and never overwrite this reference.
const sharedResources = ['PPT presentation', 'Video presentations/lectures', 'ISI articles', 'Books', 'Computer/laptop'];
const sharedModes = ['LMS', 'Email', 'Social Media Platforms', 'Written Output'];
const discussion = ['Online/ on-site discussion', 'Supplemental Video Materials and Slides'];
const section = (id, title, weeks, sourcePages, content, outcomes, activities, assessments, resources = sharedResources, modes = sharedModes) => ({
  id, title, weeks, sourcePages, content, outcomes, teachingActivities: activities, assessmentTasks: assessments, submissionModes: modes, resources
});
export const OFFICIAL_SYLLABUS_KEY = 'fish-elect-6-2026-2027';
export const OFFICIAL_SYLLABUS = {
  key: OFFICIAL_SYLLABUS_KEY,
  title: 'FISH ELECT 6 — NAVIGATION AND SEAMANSHIP WITH SOLAS',
  semester: 'First Semester', schoolYear: '2026–2027', credits: '3 units', contactHours: '5 hours/week', prerequisite: 'None',
  description: 'Principles of Navigation and Application of Marine Rules and Regulations on the road of the sea, Seamanship Skills and SOLAS.',
  source: { fileName: 'CS_FishElect6_NAVIGATION AND SEAMANSHIP.pdf', pages: 6, matrixPages: [2, 3, 4], sha256: 'e9e638f70db3e14e5515e5ff0c9b7a7d0b062f948dc2d2dae70df4c2b6dc28fc', revision: 'DNSC-FM-AU-001 Rev. 00 (09.19.2025)' },
  outcomes: [
    { id: 'CLO1', text: 'Know the terms associated with the terrestrial coordinate system; Equator, Prime meridian, Latitude, Longitude and Rhumb line.' },
    { id: 'CLO2', text: 'Understand the Principles of Navigation.' },
    { id: 'CLO3', text: 'Apply Marine Rules and Regulations on the Road of the sea.' },
    { id: 'CLO4', text: 'Discuss the significance of Seamanship.' },
    { id: 'CLO5', text: 'Realize the importance of safety of life at sea.' }
  ],
  grading: { summativeAssessments: 60, performanceTasksWrittenOutputs: 40, passingScore: '50% of the highest possible score.', sourcePage: 5 },
  general: section('general', 'General: Class Orientation', 'Week 1', [2, 3], [
    'Leveling of Course Expectations and Course Overview', 'Subject and classroom policy', 'Course requirements, grading systems, and learning outcomes',
    'Data privacy reminders for online learning', 'Assigning selected topics/reports/research papers from journals and book chapters for critical review and discussion',
    'Presentation of the DNSC Vision, Mission, Core Values, and Institute Goals'
  ], [
    'Express one’s expectations about the course, classmates and the instructor', 'Familiarize the contents of the syllabus',
    'Aware to the course outline of the subject, class rules, grading system and topics/reports/journals to be discussed',
    'Manifest respect and obedience to class policies', 'Recite and Explain the College Vision, Mission, Core Values, and Institute program goals'
  ], ['Orientation via social media/online forum applications (e.g., zoom)', 'Presentation of subject and classroom policies', 'Reading and discussion of the VMGO', 'Online real-time interactive discussion'],
  ['Submission of reflections paper', 'Oral recitation', 'Written output', 'Election/random selection'], ['PowerPoint (PPT) Presentation', 'Student handbook', 'Syllabus'], ['Learning management system (LMS)', 'Email', 'Messenger']),
  sections: [
    section('lesson-1', 'Lesson 1: History, Art and Science of Navigation', 'Week 2', [3], ['History, Art and Science of Navigation'],
      ['Explain the art of Navigation', 'Discuss what does navigation mean in science'],
      ['Discussion', 'Role Playing “the importance of clear Direction”', 'Supplemental Video materials and slides'], ['Oral recitation', 'Assignment', 'Quiz', 'Midterm Examination']),
    section('lesson-2', 'Lesson 2: Introduction to Navigation', 'Week 3', [3], ['Branches of Navigation', 'Definition of terms'],
      ['Different branches of Navigation', 'Discuss different terms used in navigation'], discussion, ['Oral recitation', 'Quiz', 'Midterm Examination']),
    section('lesson-3', 'Lesson 3: Principles of Navigation', 'Weeks 4–6', [3], [
      'Terrestrial Coordinate Systems of Latitude and Longitude', 'Great circle and small circle', 'Mercator Projections', 'Nautical Charts',
      'Reading Distance and Direction', 'Plotting Distance and Direction', 'Plotting Latitude and Longitude', 'Reading Latitude and Longitude'
    ], ['Proficient use the terrestrial coordinate system, including projections and expert Nautical Chart interpretation.'],
    [...discussion, 'Concept Mapping', 'Practice Drill'], ['Oral recitation', 'Assignment', 'Quiz', 'Midterm Examination']),
    section('lesson-4', 'Lesson 4: Navigation Rules of the Road of the Sea', 'Weeks 7–8', [4], ['Navigation Rules of the Road of the Sea'], [
      'Establish fundamental concepts following the navigation regulations for maritime traffic.', 'Assess suitable methods to employ if a potential collision hazard arises.',
      'Recognize the obligated vessel to yield right if way in specific scenarios.',
      'Implement the stipulated lighting configuration. These Regulations mandated the display of lights from dawn to dusk during reduces visibility and under other conditions as deemed necessary.'
    ], [...discussion, 'Concept Mapping'], ['Quiz', 'Midterm Examination']),
    section('midterm', 'Midterm Examination', 'Week 9', [4], ['MIDTERM EXAMINATION'], ['Pass the examination', 'Manifest honesty and integrity during the examination'],
      ['Review / examination period'], ['Written examination'], ['Examination Questionnaires and rubrics'], ['LMS', 'Email']),
    section('lesson-5', 'Lesson 5: Seamanship', 'Weeks 10–14', [4], ['Meaning and Definition', 'Knot Tying', 'Lights'], [
      'Articulate the Definition of Seamanship.', 'Enhance Proficiency in Hand-Eye Coordination Abilities.',
      'Acquire knowledge of Fundamental Navigation Lights for Three Types of Vessels.', 'Recognize Various Nautical Flags along with their significance.'
    ], [...discussion, 'Concept Mapping'], ['Quiz', 'Final Examination'], ['PPT presentation', 'Video presentations/lectures', 'Books', 'Computer/laptop', 'Cellular phone', 'Global Positioning System (GPS)']),
    section('lesson-6', 'Lesson 6: Safety of Life at Sea (SOLAS)', 'Weeks 15–17', [4], ['International Convention for the Safety of Life at Sea (SOLAS), 1974'],
      ['Define Full meaning of SOLAS.', 'Discuss the SOLAS Convention of 1974, chapters and regulations.', 'Explain Briefly SOLAS Chapters'],
      [...discussion, 'Role Playing'], ['Quiz', 'Final Examination']),
    section('final', 'Final Examination', 'Week 18', [4], ['FINAL EXAMINATION'], ['Pass the examination', 'Manifest honesty and integrity during the examination'],
      ['Review / Examination period'], ['Written examination'], ['Exam Questionnaire and rubrics'], ['LMS', 'Email'])
  ],
  references: [
    'Augusto, B. (Ed.). (2015). The art of seamanship: Evolving skills, exploring oceans, and handling wind, waves and weather. McGraw Hill Education.',
    'Desai, S. (2016). Instant weather forecasting. Adlard Coles.', 'Gasol, J. M. (Ed.). (2016). IAMSAR manual: International aeronautical and maritime search and rescue manual (7th ed.).',
    'Keenan, T. (Ed.). (2014). Anatomy of the ship. Venus Books.', 'Romana-Eguía, F., et al. (2016). Ship construction for marine engineers. Bloomsbury Publishing.'
  ]
};
export const officialSection = id => id === 'general' ? OFFICIAL_SYLLABUS.general : OFFICIAL_SYLLABUS.sections.find(section => section.id === id) || null;
export const officialSectionOrder = id => OFFICIAL_SYLLABUS.sections.findIndex(section => section.id === id) + 1;

// Guidance describes existing capabilities, not automatic mission assignments.
export const PRACTICAL_ALIGNMENT = {
  'lesson-1': { guidance: 'Primarily theoretical. Assign a mission only when its objectives support this lesson.', tags: [] },
  'lesson-2': { guidance: 'Use an introductory heading or vessel-control mission when its objectives match navigation terminology.', tags: ['heading', 'compass', 'steering'] },
  'lesson-3': { guidance: 'Review route, waypoint, latitude/longitude, distance and bearing objectives. The existing chart is a training display, not an assessment of every chart projection.', tags: ['waypoint', 'latitude', 'longitude', 'route', 'bearing', 'buoy'] },
  'lesson-4': { guidance: 'Review collision avoidance, safe maneuvering and navigation-light objectives. A complete moving-vessel COLREG encounter evaluator is not implemented.', tags: ['collision', 'safety', 'maneuver', 'light'] },
  'lesson-5': { guidance: 'Existing vessel handling, anchoring, docking and lights may support selected objectives. Knot tying and nautical-flag exercises are not implemented.', tags: ['anchor', 'dock', 'handling', 'light'] },
  'lesson-6': { guidance: 'Use only a safety-related mission with matching objectives. Full SOLAS chapter assessment, lifeboat and rescue drills are not implemented.', tags: ['safety', 'emergency', 'weather', 'collision'] }
};
