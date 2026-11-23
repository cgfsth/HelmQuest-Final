import {OFFICIAL_SYLLABUS} from '../../shared/officialSyllabus.js';
import {LESSON_ALIGNMENT_VERSION,lessonOutcomes,alignLessonMission,validateOutcomeQuiz} from '../../shared/lessonAlignment.js';
import {defaultChartExercise,lessonScoringDefinition} from '../../shared/lessonScoring.js';

export const LESSON_MISSION_PACK_VERSION='lesson-missions-v1';
export const LESSON_MISSION_SOURCES={
  navigation:'https://www.history.navy.mil/content/history/museums/nmusn/education/educational-resources/to-the-ends-of-the-earth/navigation.html',
  chart:'https://oceanservice.noaa.gov/navigation/making-nautical-charts.html',
  rules:'https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/navrules.pdf',
  flags:'https://www.govinfo.gov/content/pkg/GOVPUB-D5_300-PURL-LPS73101/pdf/GOVPUB-D5_300-PURL-LPS73101.pdf',
  solas:'https://www.imo.org/en/about/conventions/pages/international-convention-for-the-safety-of-life-at-sea-(solas),-1974.aspx'
};
// Outcome indexes reference the saved right-column outcomes, never topic lists.
export const LESSON_DESCRIPTION_VERSION='uploaded-pdf-descriptions-v1';
const buoy=(outcome,image,title,description,pdfPages)=>({outcome,image,title,description,pdfPages});
const question=(outcome,prompt,correct,distractors)=>({outcome,prompt,correct,distractors});
export const LESSON_MISSION_SPECS=[
  {
    lesson:1,title:'Lesson 1: Navigation - Art and Science',duration:'8-10 minutes',difficulty:'Beginner',
    briefing:'Inspect the two learning buoys and relate navigation judgment to observation, measurement and calculation. Return to port, stop the engine and deploy the anchor. Complete the final quiz. The navigation score is practice evidence; explanation and discussion also need instructor review.',
    buoys:[
      buoy(0,'art-navigation','Navigation as an art','Navigation as an art involves using judgment and experience when weather, visibility and traffic change. A navigator interprets uncertain observations, chooses a safe route and communicates clear intentions to the crew. Reliable measurements support these decisions, while judgment determines how much clearance is prudent in the conditions. Safe navigation combines dependable information with sound decisions.',[5,7]),
      buoy(1,'science-navigation','Navigation as a science','Navigation as a science uses geography, geometry, astronomy and physics to determine position and monitor movement. Position, heading, distance, speed and time are measured and compared with charts and instruments. Cross-checking observations helps reduce navigational errors. Scientific measurements provide reliable information, while practical judgment guides how that information is used during a voyage.',[3,6,7])
    ],
    questions:[
      question(0,'A planned route becomes crowded with traffic. Which response best illustrates the art of navigation?','Use judgment to adapt the route and verify that the revised action is safe.',['Follow the original line regardless of traffic.','Turn randomly until the route looks clear.','Stop keeping a lookout because the route was planned.']),
      question(0,'Which activity most directly demonstrates navigation judgment?','Balancing the vessel limitations, weather and available sea room before choosing an action.',['Memorising a compass label without considering conditions.','Assuming every vessel handles identically.','Treating a plan as a guarantee of safe passage.']),
      question(1,'Which example best illustrates the scientific basis of navigation?','Using measured position, direction, speed and time to check progress.',['Choosing a direction only because it feels familiar.','Ignoring instrument disagreement.','Assuming the vessel remains on course without checking.']),
      question(1,'Two sources give different position information. What supports a scientific approach?','Cross-check the observations and investigate the difference.',['Accept whichever answer is more convenient.','Average the values without checking their references.','Ignore both sources and continue without a position check.'])
    ]
  },
  {
    lesson:2,title:'Lesson 2: Navigation Branches and Terms',duration:'10-12 minutes',difficulty:'Beginner',
    briefing:'Visit the branches, direction and coordinate references. Read each picture and explanation. Practise vessel control, then return to port with the engine stopped and anchor deployed. The final quiz assesses branches and navigation terminology; buoy visits alone do not award knowledge marks.',
    buoys:[
      buoy(0,'navigation-branches','Branches of navigation','Terrestrial or coastal navigation uses visible landmarks, charted features, bearings and ranges to determine position near land. Celestial navigation uses observations of the sun, stars or other celestial bodies together with time. Electronic navigation uses systems such as GNSS, radar and electronic charts. Dead reckoning estimates position from a previous position, course, speed and elapsed time. Electronic aids are useful, but independent checks remain important.',[3,4,5]),
      buoy(1,'heading-bearing','Heading, bearing and vessel directions','Heading is the direction in which the bow points. Course is the intended direction of travel, while course over ground describes the actual direction of movement over Earth. Wind and current can cause the track to differ from the heading. A bearing is the direction from one point to another. Speed describes the rate of travel; one knot equals one nautical mile per hour.',[6,7,8,9]),
      buoy(1,'coordinates','Latitude and longitude terms','Latitude is the angular distance north or south of the equator. Longitude is the angular distance east or west of the prime meridian. Together they describe a geographic position. A waypoint is a designated position along a planned route. Position describes where the vessel is, while heading and bearing describe directions.',[6,7])
    ],
    questions:[
      question(0,'A navigator fixes position using a chart and bearings to coastal landmarks. Which branch is being used?','Terrestrial navigation',['Celestial navigation','Navigation using only a star altitude','Navigation without position references']),
      question(0,'Which observation belongs to celestial navigation?','An observation of a celestial body combined with accurate time.',['A reading of the engine fuel gauge.','A photograph of the ship name.','A measurement of anchor-chain colour.']),
      question(0,'GNSS position information is an example of which method?','Electronic navigation',['Navigation using only coastal landmarks','Navigation using only star observations','Mooring-line handling']),
      question(0,'Which branch estimates a new position from a previous position, course, speed and elapsed time?','Dead reckoning',['Flag signalling','Mooring-line handling','Reading only the ship name']),
      question(1,'The bow points north but a lighthouse lies northeast. Which statement is correct?','The heading is north and the bearing to the lighthouse is northeast.',['Heading and bearing must always be equal.','The lighthouse bearing describes the engine speed.','Heading means the latitude of the vessel.']),
      question(1,'What does latitude describe?','Position north or south of the equator.',['Position east or west of the prime meridian.','The direction of the bow only.','The vessel length.']),
      question(1,'What does longitude describe?','Position east or west of the prime meridian.',['Position north or south of the equator.','The vessel draft only.','The speed through the water.']),
      question(1,'When facing forward aboard a vessel, which side is starboard?','The right side',['The left side','The stern only','The side nearest the shore']),
      question(1,'Why should a direction be identified as true or magnetic?','The north reference affects how the direction is interpreted.',['Both words mean vessel speed.','The reference never affects a direction.','It replaces the need to state a bearing.'])
    ]
  },
  {
    lesson:3,title:'Lesson 3: Coordinates and Chart Passage',duration:'12-15 minutes',difficulty:'Intermediate',
    briefing:'Study the coordinate, projection and chart-interpretation buoys. Open Chart workspace: read mark M, select Mercator, and plot the supplied route points in order. Apply the chart plan before docking. Chart skills carry 80% of the practical score and Safety compliance 20%. Complete the separate final quiz after docking. This samples chart skills and does not certify expert chart competence.',
    buoys:[
      buoy(0,'coordinates','Read a chart position','The equator is zero degrees latitude and the prime meridian is zero degrees longitude. A position combines latitude north or south with longitude east or west. Latitude is read from the side scale and longitude from the top or bottom scale. Their intersection gives the plotted position. Latitude is written first, followed by longitude; hemisphere and degree-minute notation must be checked carefully.',[3,4,10]),
      buoy(0,'mercator','Use the required projection','Mercator is a cylindrical projection widely used for marine charts. Rhumb lines, which maintain a constant compass bearing, appear as straight lines. Scale distortion increases toward higher latitudes. Distance is measured on the latitude scale near the route, and direction is commonly measured clockwise from true north using a compass rose or plotting tool.',[6,8]),
      buoy(0,'chart-interpretation','Interpret depths and hazards','Nautical charts show coastlines, depths, aids to navigation and hazards. The title, scale, datum and symbols provide the reference needed to interpret the chart. Chart currency and relevant navigational notices are checked before use. A route is plotted by marking departure and destination, drawing the intended track and measuring its direction and distance. Hazards and safe-water clearances must be examined along the whole route.',[7,9])
    ],
    questions:[
      question(0,'A position is 7.10 degrees N, 125.80 degrees E. Which value is latitude?','7.10 degrees N',['125.80 degrees E','Both are headings','Neither value gives position information']),
      question(0,'Which coordinate belongs on the longitude scale?','125.80 degrees E',['7.10 degrees N','A speed of 5 knots','A draft of 3 metres']),
      question(0,'How does a rhumb line appear on a Mercator chart?','As a straight line with constant bearing to the chosen north reference.',['As a route with no direction.','As an anchor-chain symbol.','As a guarantee of the shortest route on the globe.']),
      question(0,'The chart-workspace instructions provide two route points in order. What should you do?','Plot the supplied coordinates in that order using the required projection.',['Reverse their order without checking the task.','Enter a speed instead of latitude.','Assume buoy arrival automatically plots the route.']),
      question(0,'Is a charted depth alone sufficient to establish safe under-keel clearance?','No; consider draft, water level, chart reference and required clearance.',['Yes, regardless of draft.','Yes, if the vessel is travelling quickly.','Yes, if the point is close to a buoy.']),
      question(0,'Which chart information should be checked before planning a passage?','Units, datum, hazards and current chart corrections.',['Only the decorative colours.','Only the mission title.','Only the vessel paint scheme.'])
    ]
  },
  {
    lesson:4,title:'Lesson 4: Give-Way and Navigation Lights',duration:'12-15 minutes',difficulty:'Intermediate',
    briefing:'Read the four rules-of-the-road references. Complete the red-aspect crossing exercise: recognise the own vessel give-way responsibility and make an early, clear response that avoids crossing ahead. Apply the 60 m power-driven underway light configuration in Navigation-light controls. The response carries 80%; Safety compliance 20% includes lighting and recorded operating violations. Dock safely, then take the final quiz. The crossing exercise concerns vessels in sight; it is not a complete restricted-visibility rules assessment.',
    buoys:[
      buoy(0,'lookout','Lookout and safe-speed principles','The collision regulations address lookout, safe speed, collision risk, vessel conduct, lights, shapes and sound signals. A proper lookout uses sight, hearing and all available appropriate means. Safe speed allows effective action to avoid collision. Visibility, traffic density, manoeuvrability, background lights, wind, sea and current are considered when choosing speed.',[3,4]),
      buoy(1,'collision-risk','Assess risk and avoiding action','A steady compass bearing with decreasing range is a warning of collision risk. Available information is used to assess the situation; if there is doubt, risk is assumed to exist. Avoiding action should be positive, early and readily apparent. Large, clear changes are generally easier to recognise than small repeated alterations. The result is monitored until the other vessel is finally past and clear.',[5,6]),
      buoy(2,'crossing-give-way','Recognise the give-way vessel','In a crossing situation involving ordinary power-driven vessels in sight with risk of collision, the vessel with the other on its starboard side keeps out of the way. The give-way vessel takes early and substantial action. The stand-on vessel initially maintains course and speed, but may or must act as conditions require. The other vessel cannot be assumed to manoeuvre correctly, so the situation remains under observation until the vessels are past and clear.',[7,8,10]),
      buoy(3,'power-lights','Apply the underway light configuration','A power-driven vessel underway displays masthead light or lights, sidelights and a sternlight, according to its size and circumstances. The port sidelight is red, the starboard sidelight is green and the sternlight is white aft. Navigation lights help indicate a vessel\'s aspect. The required arrangement depends on vessel type, length, activity and visibility.',[9])
    ],
    questions:[
      question(0,'What is the purpose of a proper lookout?','Maintain awareness using sight, hearing and other available suitable means.',['Watch only the mission progress bar.','Look only ahead and ignore traffic behind.','Replace every other navigation responsibility.']),
      question(0,'Which consideration helps determine a safe speed?','The conditions, traffic, hazards and ability to take effective avoiding action.',['The highest speed the engine can produce.','The number of quiz questions remaining.','The vessel paint colour.']),
      question(1,'Another vessel is getting closer with little change in bearing. What should this suggest?','Possible collision risk that needs assessment and timely action.',['A guarantee that it will pass safely.','A reason to stop keeping a lookout.','Proof that no avoiding action can ever be taken.']),
      question(1,'Which response is generally easier for another vessel to recognise?','An early and substantial avoiding action appropriate to the encounter.',['Many tiny uncertain alterations.','A last-second random turn.','Ignoring the encounter until contact.']),
      question(2,'Two ordinary power-driven vessels cross in sight with risk of collision. You have the other on your starboard side. What is your role?','Give-way vessel',['Always privileged vessel','Anchored vessel','Vessel with no responsibility']),
      question(2,'What should the give-way vessel avoid if circumstances permit?','Crossing ahead of the other vessel.',['Monitoring the other vessel.','Taking an early clear action.','Checking that the vessels pass clear.']),
      question(3,'Which basic lights fit the mission vessel: power-driven, 60 m, underway?','Two masthead lights, sidelights and a sternlight.',['Only one anchor light.','Only a green-over-white fishing signal.','No lights because the engine is running.']),
      question(3,'When are the prescribed navigation lights also required during daylight?','In restricted visibility.',['Only while taking a quiz.','Never during daylight.','Only when the vessel name is unreadable.'])
    ]
  },
  {
    lesson:5,title:'Lesson 5: Seamanship and Vessel Light Recognition',duration:'15-20 minutes',difficulty:'Beginner',
    briefing:'Visit the seamanship, handling, three light-reference and signal-flag buoys. The three light categories follow the lesson PDF: power-driven underway, sailing underway and vessel at anchor. Practise gradual vessel control and safe docking. Complete the final quiz for navigation-light knowledge. This activity supports handling awareness; it does not certify knot tying or hand-eye proficiency from a quiz.',
    buoys:[
      buoy(0,'seamanship','The meaning of seamanship','Seamanship is the knowledge and practical skill used to operate, handle and maintain a vessel safely. It brings together judgment, teamwork, situational awareness and hands-on work. Line handling, mooring, anchoring, watchkeeping and emergency readiness are examples. Good seamanship includes planning tasks, communicating clearly, using protective equipment and staying clear of loaded lines and pinch points.',[3,4]),
      buoy(1,'coordination','Coordinated vessel handling','Safe berth approaches use controlled speed and clear communication during docking and anchoring. Practical ropework also requires coordinated handling: a bowline forms a fixed loop, a clove hitch is a quick hitch around a post and a sheet bend joins two ropes. Knots are formed, dressed, tightened and checked before use. A clove hitch may slip under changing loads, so approved procedures and fittings matter in real operations.',[5,6,7,10]),
      buoy(2,'power-lights','Power-driven vessel underway','A power-driven vessel underway uses masthead light or lights, sidelights and a sternlight. The number and arrangement depend on vessel size and operating conditions. Sidelights identify the port and starboard aspects, while the white sternlight is shown aft. Correct identification considers the whole visible arrangement together with the vessel\'s status.',[8]),
      buoy(2,'sailing-lights','Sailing vessel underway','A sailing vessel underway has sidelights and a sternlight under the basic arrangement. Alternative arrangements apply in particular circumstances. Navigation-light identification depends on vessel type, size and operational status, so a sailing arrangement is distinguished from the masthead-light arrangement of a power-driven vessel and the all-round white lights of a vessel at anchor.',[8]),
      buoy(2,'anchor-lights','Vessel at anchor','A vessel at anchor uses all-round white anchor lights, with the arrangement depending on its length. These lights identify its anchored status. Power-driven and sailing vessels underway have different arrangements involving sidelights and a sternlight. Vessel size and operational status are considered when interpreting the lights.',[8]),
      buoy(3,'signal-flags','Alpha and Oscar safety signals','Alpha (A) means a diver is down and other vessels should keep well clear at slow speed. Oscar (O) means man overboard. Other safety signals include Bravo (B) for carrying, loading or discharging dangerous goods, and November with Charlie (N+C) as a distress signal when displayed together.',[9])
    ],
    questions:[
      question(0,'Which description best defines seamanship?','Knowledge, practical skill and judgment used to operate and handle a vessel safely.',['Only the ability to travel at maximum speed.','Only memorising vessel names.','Only completing a quiz.']),
      question(1,'Which handling practice supports coordinated vessel control?','Apply a deliberate input, observe the vessel response and correct gradually.',['Apply repeated abrupt inputs without observing the response.','Ignore the heading after touching the controls.','Treat a quiz answer as proof of practical hand-eye proficiency.']),
      question(2,'Which basic light arrangement identifies a 60 m power-driven vessel underway?','Two masthead lights, sidelights and a sternlight.',['Only an all-round anchor light.','Only a sternlight.','No lights when outside a port.']),
      question(2,'What is the basic light arrangement for a sailing vessel underway under sail alone?','Sidelights and a sternlight.',['The same two mandatory masthead lights as every 60 m power-driven vessel.','Only a single red all-round light.','Only an anchor ball used at night.']),
      question(2,'Which night arrangement is appropriate for the ordinary 60 m anchored vessel in the reference?','Two all-round white lights, forward higher and aft lower.',['Red/green sidelights alone.','Only a directional forward masthead light.','A green-over-white fishing signal.']),
      question(2,'For an ordinary power-driven vessel less than 50 m underway, is a second masthead light mandatory under the basic arrangement?','No; it may be shown but is not mandatory.',['Yes, for every vessel regardless of length.','No navigation lights of any kind are required.','It must be replaced by the Oscar flag.']),
      question(3,'What does International Code flag Alpha communicate?','A diver is down; keep well clear at slow speed.',['Man overboard.','The vessel has no safety duties.','Permission to cross closely ahead.']),
      question(3,'What does International Code flag Oscar communicate?','Man overboard.',['Diver down.','The vessel is safely anchored.','All navigation lights are correct.'])
    ]
  },
  {
    lesson:6,title:'Lesson 6: SOLAS Safety Awareness Voyage',duration:'10-12 minutes',difficulty:'Beginner',
    briefing:'Read the SOLAS purpose, convention and chapter references at the three buoys. Maintain a lookout and operate safely while returning to port. Stop the engine, deploy the anchor and complete the final quiz. The quiz checks the saved SOLAS knowledge outcomes. This is a safety-awareness voyage, not a simulated fire, lifeboat launch or complete SOLAS compliance assessment.',
    buoys:[
      buoy(0,'solas-purpose','What SOLAS means','SOLAS stands for Safety of Life at Sea. The International Convention for the Safety of Life at Sea is a major maritime safety treaty. Its main purpose is to set minimum safety standards for ship construction, equipment and operation. Safety requirements address the vessel itself, the equipment carried and the way the ship is operated.',[3]),
      buoy(1,'solas-history','The 1974 Convention','The 1974 SOLAS Convention was adopted under the International Maritime Organization. Its amendment process keeps safety requirements up to date. Application depends on ship type, size, voyage and relevant exemptions. Safety provisions must therefore be considered in relation to the vessel and voyage concerned.',[4,10]),
      buoy(2,'solas-chapters','Connect chapters to safety purposes','Chapter I concerns surveys and certification. Chapter II-1 covers construction, stability, machinery and electrical installations, while II-2 covers fire protection, detection and extinction. Chapter III concerns life-saving appliances and arrangements, including survival craft and drills. Chapter IV concerns radiocommunications and distress alerts. Chapter V covers safety of navigation, including voyage planning and navigational equipment.',[5,6,7,8])
    ],
    questions:[
      question(0,'What does SOLAS stand for?','Safety of Life at Sea',['Speed of Large Automated Ships','Signals of Land and Sea','Standard Operating Lights and Steering']),
      question(0,'What is a central purpose of SOLAS?','Minimum standards for ship construction, equipment and operation that support safety.',['A guarantee that all voyages are risk-free.','A replacement for every local and international maritime rule.','A rule concerned only with the vessel paint colour.']),
      question(1,'Which date is the adoption date of the SOLAS 1974 Convention?','1 November 1974',['25 May 1980','1 January 1914','25 December 1999']),
      question(1,'What does SOLAS 1974, as amended, indicate?','The convention includes subsequent amendments to its provisions.',['The 1974 text can never be updated.','Every chapter applies identically to every vessel.','The convention has no equipment requirements.']),
      question(2,'Which selected chapter concerns life-saving appliances and arrangements?','Chapter III',['Chapter IV','Chapter V','Chapter II-2']),
      question(2,'Which selected chapter concerns radiocommunications?','Chapter IV',['Chapter III','Chapter V','Chapter II-1']),
      question(2,'Which selected chapter concerns safety of navigation?','Chapter V',['Chapter II-2','Chapter III','Chapter IV']),
      question(2,'Which selected chapter concerns fire protection, detection and extinction?','Chapter II-2',['Chapter III','Chapter IV','Chapter V'])
    ]
  }
];

const normalized=text=>String(text).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function buildLessonMission({syllabusId,module,images}) {
  const spec=LESSON_MISSION_SPECS.find(item=>item.lesson===Number(module.moduleNumber));
  if(!spec)throw new Error('Choose one of lessons 1-6.');
  const outcomes=lessonOutcomes(module.objectives),official=OFFICIAL_SYLLABUS.sections.find(s=>s.id===`lesson-${spec.lesson}`).outcomes;
  if(outcomes.length!==official.length || outcomes.some((outcome,i)=>normalized(outcome)!==normalized(official[i])))throw new Error(`Lesson ${spec.lesson} outcomes differ from the reviewed lesson plan. Review them before creating a mission.`);
  const missionId=`custom-mission-lesson-${spec.lesson}-${module.id}`,quizId=`lesson-quiz-${module.id}`;
  const checkpoints=spec.buoys.map((item,index)=>{
    if(!images[item.image])throw new Error(`Missing lesson illustration: ${item.image}`);
    return {id:`${missionId}-buoy-${index+1}`,name:item.title,image:images[item.image],description:item.description,sourcePdf:{fileName:module.fileName || `HelmQuest_Lesson_${spec.lesson}.pdf`,pages:item.pdfPages},learningOutcome:outcomes[item.outcome],requireInteraction:'inspect_buoy'};
  });
  let mission=alignLessonMission({mission_title:spec.title,description:spec.briefing,estimated_duration:spec.duration,difficulty:spec.difficulty,required_boat:'medium',xp_reward:100,pass_score:70,
    outcomeAlignmentVersion:LESSON_ALIGNMENT_VERSION,learning_objectives:outcomes,missionPackVersion:LESSON_MISSION_PACK_VERSION,sourceReferences:LESSON_MISSION_SOURCES,
    ...(spec.lesson===5?{lessonReferenceCategories:['power-driven-underway','sailing-underway','anchored']}:{}),
    encounter:{type:spec.lesson===4?'crossing-red':'none',clearance:100,warningDistance:600},...(spec.lesson===3?{chartExercise:defaultChartExercise()}:{}),steps:[],checkpoints},outcomes,true);
  const scoring=lessonScoringDefinition(outcomes,mission);mission={...mission,lessonScoring:scoring};
  const quiz={title:`Lesson ${spec.lesson}: Final Knowledge Check`,description:'Answer after completing the mission steps and safely docking. This quiz is scored separately from the navigation practical.',
    moduleId:missionId,missionId,syllabusId,syllabusModuleId:module.id,missionPackVersion:LESSON_MISSION_PACK_VERSION,passScore:70,published:true,status:'published',sourceReferences:LESSON_MISSION_SOURCES,
    questions:spec.questions.map((q,index)=>{
      const options=q.distractors.map(text=>({text,isCorrect:false}));options.splice((index+spec.lesson)%4,0,{text:q.correct,isCorrect:true});
      return {id:`lesson-${spec.lesson}-q${index+1}`,type:'multiple-choice',prompt:q.prompt,learningOutcome:outcomes[q.outcome],options};
    })};
  validateOutcomeQuiz(quiz,outcomes);
  return {lesson:spec.lesson,missionId,quizId,mission,quiz,instructions:spec.briefing,buoyCount:checkpoints.length,questionCount:quiz.questions.length};
}
