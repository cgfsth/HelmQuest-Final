// Training point deductions, not statutory fines or collision thresholds.
export const SAFETY_RULES=Object.freeze({
  BUOY_COLLISION:{label:'Collision with a buoy',points:10},
  PORT_COLLISION:{label:'Collision with the port / pier',points:15},
  SHORE_COLLISION:{label:'Collision with land',points:15},
  NET_COLLISION:{label:'Collision with fishing nets',points:15},
  VESSEL_COLLISION:{label:'Collision with another vessel',points:100,critical:true},
  UNSAFE_CLEARANCE:{label:'Unsafe vessel clearance',points:20},
  INCORRECT_ENCOUNTER_RESPONSE:{label:'Incorrect give-way / stand-on response',points:15},
  UNSAFE_ANCHOR:{label:'Dropped the anchor while moving above 2 kn',points:10},
  DOCK_ENGINE_RUNNING:{label:'Anchored at the dock with the engine running',points:10},
  MOVE_WHILE_ANCHORED:{label:'Applied propulsion with the anchor down',points:10},
  MOVE_WITH_NET:{label:'Applied propulsion with fishing nets deployed',points:15},
  INCORRECT_LIGHTS:{label:'Incorrect navigation-light configuration',points:20},
  LIGHTS_NOT_APPLIED:{label:'Navigation-light configuration not applied',points:20}
});
export function gradeSimulationSafety(events,{lightingRequired=false,lightingTask=null,encounter=null}={}) {
  if(!Array.isArray(events) || events.length>5000)throw new Error('The simulation safety event record is missing or too large.');
  const recorded=events.map(event=>{
    if(!event || !SAFETY_RULES[event.type] || ['INCORRECT_LIGHTS','LIGHTS_NOT_APPLIED'].includes(event.type) || !Number.isFinite(event.timestamp) || event.timestamp<0)throw new Error('Invalid recorded safety event.');
    return {type:event.type,timestamp:event.timestamp};
  });
  if(encounter?.collision && !recorded.some(e=>e.type==='VESSEL_COLLISION'))recorded.push({type:'VESSEL_COLLISION'});
  if(lightingRequired && lightingTask?.type!=='lighting')recorded.push({type:'LIGHTS_NOT_APPLIED'});
  else if(lightingRequired && lightingTask.scores.lighting!==100)recorded.push({type:'INCORRECT_LIGHTS'});
  const deductions=recorded.map(event=>({...event,...SAFETY_RULES[event.type]}));
  return {score:Math.max(0,100-deductions.reduce((sum,e)=>sum+e.points,0)),deductions,critical:deductions.some(e=>e.critical)};
}
