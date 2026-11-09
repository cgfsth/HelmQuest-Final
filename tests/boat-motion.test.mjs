import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { applyBoatBuoyancy, advanceBoatSteering } from '../src/helpers/boatMotion.js';
import { sampleBoatWaveMotion, getBoatWaveResponse } from '../src/helpers/oceanWaves.js';
import { normalizeBoatToScene } from '../src/helpers/normalizeBoatScale.js';
import { updateBuoyFloating } from '../src/helpers/missionWaypoints.js';

for (const length of [18, 60, 180]) {
  test(`${length}m boat flotation and rudder response are consistent at 15, 30, 60 and 144 FPS`, () => {
    const results = [];
    for (const fps of [15, 30, 60, 144]) {
      const boat = new THREE.Group();
      boat.rotation.order = 'YXZ';
      let rate = 0;
      const targetRate = 0.15;
      for (let frame = 0; frame < fps * 2; frame++) {
        applyBoatBuoyancy(boat, {height:1,rotationX:.01,rotationZ:-.01,
          ...getBoatWaveResponse(length,1/fps)}, -2);
        const steering = advanceBoatSteering(rate, targetRate, 1/fps, length);
        rate = steering.rate;
        boat.rotation.y += steering.angle;
      }
      results.push({y:boat.position.y,roll:boat.rotation.x,pitch:boat.rotation.z,yaw:boat.rotation.y,rate});
      assert.ok(rate <= targetRate && rate > targetRate * .9);
      assert.ok(boat.position.y > -1.01 && boat.position.y < -0.99);
    }
    for (const result of results) for (const field of Object.keys(result)) {
      assert.ok(Math.abs(result[field]-results[0][field]) < 1e-10, `${field}: ${JSON.stringify(results)}`);
    }
    const first = advanceBoatSteering(0, .2, 1/60, length);
    assert.ok(first.rate > 0 && first.rate < .04, 'rudder cannot instantly jump to full yaw rate');
    const reverse = advanceBoatSteering(first.rate, -.2, 1/144, length);
    assert.ok(reverse.rate > -.04, 'changing steering direction is gradual');
  });

  test(`${length}m hull follows a sloped water plane at every compass heading`, () => {
    const model = new THREE.Mesh(new THREE.BoxGeometry(length, 2, length*.2));
    const {boat} = normalizeBoatToScene(model,{targetLength:length,targetWaterlineY:0,spawnX:0,spawnZ:0});
    const surface = (x,z) => .005*x + .0075*z;
    for (const yaw of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5]) {
      boat.rotation.set(0,yaw,0);
      const motion = sampleBoatWaveMotion(0,0,yaw,length,surface,length*.2);
      applyBoatBuoyancy(boat,{...motion,...getBoatWaveResponse(length),blend:1,heaveBlend:1},0);
      const up = new THREE.Vector3(0,1,0).applyQuaternion(boat.quaternion);
      const expected = new THREE.Vector3(-.005,1,-.0075).normalize();
      assert.ok(up.distanceTo(expected) < 1e-5, `heading ${yaw}: up ${up.toArray()}`);
    }
  });
}

test('hull buoyancy includes water under bow, stern and beam instead of only the pivot', () => {
  const surface = (x,z) => (Math.abs(x)<1 && Math.abs(z)<1) ? 1 : 0;
  const motion = sampleBoatWaveMotion(0,0,0,60,surface,15);
  assert.ok(motion.height > 0 && motion.height < .25);
  assert.ok(Math.abs(motion.rotationX) < 1e-12);
  assert.ok(Math.abs(motion.rotationZ) < 1e-12);
});

const app = readFileSync(new URL('../src/App.vue',import.meta.url),'utf8').replace(/\r\n/g,'\n');
function appFunction(name) {
  const start=app.indexOf(`function ${name}(`);
  assert.ok(start>=0);
  return app.slice(start,app.indexOf('\n}',start)+2);
}

test('the chase camera has the same response at different FPS and does not inherit hull roll/pitch', () => {
  const results=[];
  for(const fps of [15,30,60,144]) {
    const context={THREE,boatObject:new THREE.Group(),camera:new THREE.PerspectiveCamera(),
      activeCamera:{value:'chase'},orbitControls:{target:new THREE.Vector3()},
      _chasePosScratch:new THREE.Vector3(),_chaseLookScratch:new THREE.Vector3(),
      _chaseOffsetBehind:new THREE.Vector3(-40,20,0),_chaseOffsetLook:new THREE.Vector3(10,5,0),
      applyCameraLookOffset:(_position,target)=>target};
    context.boatObject.rotation.set(.2,Math.PI/2,-.1,'YXZ');
    vm.createContext(context);vm.runInContext(appFunction('updateCameras'),context);
    for(let i=0;i<fps;i++) context.updateCameras(1/fps);
    results.push(context.camera.position.clone());
    assert.ok(context.camera.position.distanceTo(new THREE.Vector3(0,20,40)) < .01);
    const before=context.camera.position.clone();
    context.boatObject.rotation.x=-.2;context.boatObject.rotation.z=.1;
    context.updateCameras(1/fps);
    assert.ok(context.camera.position.distanceTo(before)<.01,'wave tilt does not swing the camera rig');
  }
  for(const result of results) assert.ok(result.distanceTo(results[0])<1e-10);
});

test('mission buoy waterlines stay at sea level when vessel draft changes', () => {
  const zones=[{id:'test-buoy',x:100,z:200}];
  const context={
    SCENE_WATERLINE_Y:0,baselineWaterlineY:0,physics:{value:{waterlineOffset:-8}},
    activeTrainingModule:{value:{steps:[{type:'navigate',waypointZone:'test-buoy'}]}},
    scene:new THREE.Scene(),waypointMarkerGroup:null,environmentPreset:'day',performance:{now:()=>0},
    clearWaypointMarkers(){},refreshTrainingWaypointZones:()=>zones,findWaypoint:()=>zones[0],updateBuoySignalLights(){},
    createWaypointMarkerGroup(_zones,_active,y){const group=new THREE.Group(),buoy=new THREE.Group();buoy.position.set(100,y,200);buoy.userData.baseY=y;group.add(buoy);return group;},
  };
  vm.createContext(context);vm.runInContext(appFunction('syncTrainingWaypointMarkers'),context);
  for(const draft of [-.35,-8,-4.5]) {
    context.physics.value.waterlineOffset=draft;
    context.syncTrainingWaypointMarkers();
    updateBuoyFloating(context.waypointMarkerGroup,0,1,1,()=>.2);
    assert.equal(context.waypointMarkerGroup.children[0].position.y,.2);
  }
});
