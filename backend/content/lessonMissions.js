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
const buoy=(outcome,image,title,description)=>({outcome,image,title,description});
const question=(outcome,prompt,correct,distractors)=>({outcome,prompt,correct,distractors});
export const LESSON_MISSION_SPECS=[
  {
    lesson:1,title:'Lesson 1: Navigation - Art and Science',duration:'8-10 minutes',difficulty:'Beginner',
    briefing:'Inspect the two learning buoys and relate navigation judgment to observation, measurement and calculation. Return to port, stop the engine and deploy the anchor. Complete the final quiz. The navigation score is practice evidence; explanation and discussion also need instructor review.',
    buoys:[
      buoy(0,'art-navigation','Navigation as an art','Navigation requires judgment as conditions change. Study the observe-decide-check cycle: look at traffic, weather and available sea room, choose a suitable action, then verify its effect. Explain how a navigator adapts a plan instead of following it blindly. This buoy supports the art-of-navigation outcome; the explanation is developed in class and checked through the final quiz.'),
      buoy(1,'science-navigation','Navigation as a science','Navigation also relies on systematic observation, measurement and calculation. Positions, directions, speed and time provide evidence that can be compared with a chart and independent instruments. Use the diagram to distinguish measured information from a judgment about what action to take. The final quiz checks this distinction; a full discussion remains an instructor-assessed activity.')
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
      buoy(0,'navigation-branches','Branches of navigation','Compare the four branches in the lesson PDF. Terrestrial navigation uses charts, coastal features and bearings to known objects. Celestial navigation uses observations of celestial bodies together with time and calculations. Electronic navigation uses systems such as GNSS and radar. Dead reckoning estimates a new position from a previous position, course, speed and elapsed time. Cross-check methods instead of treating one source as infallible.'),
      buoy(1,'heading-bearing','Heading, bearing and vessel directions','Heading is the direction in which the vessel bow points. A bearing gives the direction from one position to another object or position. The pictured vessel heads north while its target lies to the northeast, so the two directions differ. State whether a direction uses true or magnetic north. Port is the left side and starboard the right side when facing forward.'),
      buoy(1,'coordinates','Latitude and longitude terms','Latitude locates a position north or south of the equator. Longitude locates it east or west of the prime meridian. Read the side and bottom scales in the example diagram: P is at 7.10 degrees N, 125.80 degrees E. Both coordinates and their hemispheres are needed to describe the position. Distinguish a position from the vessel heading or a bearing to a target.')
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
      buoy(0,'coordinates','Read a chart position','Read latitude from the chart side scale and longitude from the top or bottom scale. The worked reference P is at 7.10 degrees N, 125.80 degrees E. Check the hemispheres and coordinate format before plotting. In the separate Chart workspace, read the different reference mark M from its grid and enter its coordinates; do not copy P as the answer for M.'),
      buoy(0,'mercator','Use the required projection','On a Mercator chart, parallels and meridians intersect at right angles. A rhumb-line route appears straight and maintains a constant bearing to the chosen north reference. Select the projection required by the instrument task, then plot the provided coordinates in their specified order. Plotting a route is different from merely reaching a buoy.'),
      buoy(0,'chart-interpretation','Interpret depths and hazards','A chart includes more than coordinates: inspect the units, datum, soundings, hazards and corrections. A sounding alone does not establish under-keel clearance; the vessel draft, water level and required clearance also matter. The illustrated shoal is a schematic teaching example, not a real navigation chart. Apply these checks when discussing a route with the instructor; the current instrument task measures coordinate reading, projection and route plotting.')
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
      buoy(0,'lookout','Lookout and safe-speed principles','A proper lookout uses sight, hearing and available means suitable to the situation. A safe speed provides time and room to respond to traffic and hazards. Review the situation continuously; selecting a rule once does not remove the need to check what is happening around the vessel. The final quiz checks these principles.'),
      buoy(1,'collision-risk','Assess risk and avoiding action','Decreasing range with little change in bearing is a warning of collision risk. Evaluate the situation early and choose an action that is clear, timely and compatible with safe passing. A succession of small, uncertain changes can be difficult for another vessel to interpret. Continue monitoring until the vessels are safely clear.'),
      buoy(2,'crossing-give-way','Recognise the give-way vessel','For two ordinary power-driven vessels crossing in sight with risk of collision, the vessel that has the other on its starboard side must keep out of the way. In this mission the own vessel is the give-way vessel. If circumstances permit, avoid crossing ahead; the diagram illustrates passing astern. The stand-on role does not remove the duty to act when needed to avoid collision. Demonstrate your response in the actual vessel encounter.'),
      buoy(3,'power-lights','Apply the underway light configuration','For this 60 m power-driven vessel underway, apply port red and starboard green sidelights, a sternlight and two masthead lights; the aft masthead is higher than the forward one. An anchor-light selection does not replace this underway configuration. Lights are required from sunset to sunrise and also by day in restricted visibility. Apply the configuration using the controls; errors reduce Safety compliance. The saved syllabus wording is preserved, but its daylight phrasing is not used as the operational rule.')
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
      buoy(0,'seamanship','The meaning of seamanship','Seamanship combines the knowledge, skills and judgment used to operate and handle a vessel safely. Preparation, clear communication, lookout and checking the result of an action all contribute. Relate the prepare-handle-monitor cycle to this mission rather than treating seamanship as one isolated steering movement.'),
      buoy(1,'coordination','Coordinated vessel handling','Use small, deliberate steering inputs, watch the heading and vessel response, then correct gradually. Allow for the vessel response before adding more input. Practise approaching the berth slowly, stopping the engine and deploying the anchor safely. The quiz checks your understanding of this process; practical hand-eye proficiency still requires instructor observation.'),
      buoy(2,'power-lights','Power-driven vessel underway','Study the power-driven configuration in the picture: this 60 m vessel carries two masthead lights with the aft one higher, red port and green starboard sidelights, and a white sternlight. Actual light visibility depends on the observer direction. For a vessel under 50 m, a second masthead light is optional rather than mandatory.'),
      buoy(2,'sailing-lights','Sailing vessel underway','The basic arrangement for a sailing vessel under sail alone consists of sidelights and a sternlight. The sailing example is a separate vessel category, not the powered simulator vessel with its engine simply switched off. When a sailing vessel is also propelled by machinery, apply the power-driven requirements. Additional permitted arrangements and small-vessel exceptions need separate study.'),
      buoy(2,'anchor-lights','Vessel at anchor','Anchored is an operating status. For this 60 m example, show an all-round white light forward and another white all-round light aft at a lower level. A vessel under 50 m may use a single all-round white where it can best be seen. Do not confuse anchor lights with the red/green sidelights and directional masthead lights of a vessel underway. These are the third light-reference category in the lesson PDF.'),
      buoy(3,'signal-flags','Alpha and Oscar safety signals','Recognise two International Code of Signals flags. Alpha (A), white and blue with a swallowtail, communicates that a diver is down: keep well clear at slow speed. Oscar (O), diagonally red and yellow, communicates man overboard. Learn the meaning together with the picture; a flag signal should lead to an appropriate safety response.')
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
      buoy(0,'solas-purpose','What SOLAS means','SOLAS stands for Safety of Life at Sea. The convention addresses minimum safety standards for ship construction, equipment and operation. Relate those three areas to the reference image. The simulator supports safety awareness, but completing a navigation route is not evidence that every SOLAS requirement has been met.'),
      buoy(1,'solas-history','The 1974 Convention','The SOLAS Convention was adopted on 1 November 1974 and entered into force on 25 May 1980. Later amendments update its provisions, so it is commonly referred to as SOLAS 1974, as amended. Application depends on the relevant ship, voyage and requirements; do not assume every chapter applies identically to every vessel.'),
      buoy(2,'solas-chapters','Connect chapters to safety purposes','Use the chapter map to explain selected safety functions. Chapter II-2 concerns fire protection, detection and extinction; III covers life-saving appliances and arrangements; IV concerns radiocommunications; V concerns safety of navigation. For further discussion, I concerns surveys/certification and II-1 covers construction, stability, machinery and electrical installations. The quiz samples these distinctions; explaining the broader chapters remains part of instructor review.')
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
    return {id:`${missionId}-buoy-${index+1}`,name:item.title,image:images[item.image],description:item.description,learningOutcome:outcomes[item.outcome],requireInteraction:'inspect_buoy'};
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
