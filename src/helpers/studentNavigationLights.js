import * as THREE from 'three';
// Boat normalization uses metres with the bow along local +X and port +Z.
export function createStudentNavigationLights(boat) {
  const group=new THREE.Group();group.name='LessonNavigationLights';
  const length=boat.userData.loaMeters || 60,scale=length/60,lamps={};
  const positions={port:[length*.18,length*.28,length*.1],starboard:[length*.18,length*.28,-length*.1],masthead:[length*.25,length*.4,0],aftMasthead:[-length*.2,length*.48,0],stern:[-length*.48,length*.16,0],anchor:[0,length*.5,0]};
  const geometry=new THREE.SphereGeometry(Math.max(.25,.5*scale),12,8),materials=[];
  for(const [key,position] of Object.entries(positions)) {
    const material=new THREE.MeshBasicMaterial({color:key==='port'?0xff2525:key==='starboard'?0x24ff69:0xffffff,toneMapped:false});materials.push(material);
    const lamp=new THREE.Mesh(geometry,material);lamp.name='LessonNav-'+key;lamp.position.fromArray(position);lamp.visible=false;group.add(lamp);lamps[key]=lamp;
  }
  boat.add(group);let states={};const local=new THREE.Vector3();
  return {group,lamps,set(value){states={...value};},update(observer){if(!observer)return;local.copy(observer);boat.worldToLocal(local);const bearing=Math.atan2(local.z,local.x)*180/Math.PI;
    for(const [key,lamp] of Object.entries(lamps)){const sector=key==='port'?bearing>=0 && bearing<=112.5:key==='starboard'?bearing>=-112.5 && bearing<=0:key==='stern'?Math.abs(bearing)>=112.5:key==='anchor'?true:Math.abs(bearing)<=112.5;lamp.visible=states[key]===true && sector;}},
    dispose(){boat.remove(group);geometry.dispose();materials.forEach(material=>material.dispose());}};
}
