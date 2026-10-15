// Local preview of the real BigBoat model; serves only the files needed to render it.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = new Map([
  ['/three.js', ['node_modules/three/build/three.module.js', 'text/javascript']],
  ['/GLTFLoader.js', ['node_modules/three/examples/jsm/loaders/GLTFLoader.js', 'text/javascript']],
  ['/utils/BufferGeometryUtils.js', ['node_modules/three/examples/jsm/utils/BufferGeometryUtils.js', 'text/javascript']],
  ['/normalizeBoatScale.js', ['src/helpers/normalizeBoatScale.js', 'text/javascript']],
  ['/bigBoatLights.js', ['src/helpers/bigBoatLights.js', 'text/javascript']],
  ['/helmCockpit.js', ['src/helpers/helmCockpit.js', 'text/javascript']],
  ['/modelLoader.js', ['src/helpers/modelLoader.js', 'text/javascript']],
  ['/modelBufferCache.js', ['src/helpers/modelBufferCache.js', 'text/javascript']],
  ['/optimizedModelManifest.js', ['src/helpers/optimizedModelManifest.js', 'text/javascript']],
  ['/helmInterior.js', ['src/helpers/helmInterior.js', 'text/javascript']],
  ['/bigBoatBridge.js', ['src/helpers/bigBoatBridge.js', 'text/javascript']],
  ['/helmRadarScreen.js', ['src/helpers/helmRadarScreen.js', 'text/javascript']],
  ['/helmDeckRails.js', ['src/helpers/helmDeckRails.js', 'text/javascript']],
  ['/assets/ship_wheel.glb', ['public/assets/ship_wheel.glb', 'model/gltf-binary']],
  ['/assets/helm/large_boat_bridge.glb', ['public/assets/helm/large_boat_bridge.glb', 'model/gltf-binary']],
  ['/MediumBoat.glb', ['public/assets/trawler (1).glb', 'model/gltf-binary']],
  ['/BigBoat.glb', ['public/assets/BigBoat.glb', 'model/gltf-binary']],
]);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#162535;color:#fff;font:16px Arial}canvas{display:block}#labels{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);pointer-events:none}#labels div{padding:10px}
</style><script type="importmap">{"imports":{"three":"/three.js","three/examples/jsm/":"/vendor/","three/examples/jsm/loaders/GLTFLoader.js":"/GLTFLoader.js"}}</script></head><body>
<div id="labels"><div>Bow / starboard</div><div>Port side</div><div>Stern</div><div>Above</div><div>Wheelhouse / foremast</div><div>Aft mast / deck</div></div>
<script>for(const event of ['error','unhandledrejection'])window.addEventListener(event,e=>fetch('/measure',{method:'POST',body:JSON.stringify({error:e.message||String(e.reason),stack:e.error?.stack||e.reason?.stack})}));</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from '/GLTFLoader.js';
import { normalizeBoatToScene } from '/normalizeBoatScale.js';
const query = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(query.has('night')?0x08101d:0x25394a);
scene.add(new THREE.HemisphereLight(0xc9eaff,0x46402e,query.has('night')?0.18:2.5));
const sun=new THREE.DirectionalLight(0xffeed8,query.has('night')?0.1:3);sun.position.set(80,150,100);scene.add(sun);
if(query.has('water')){const water=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshBasicMaterial({color:0x0b263d}));water.rotation.x=-Math.PI/2;water.position.y=-0.05;scene.add(water);}
const medium=query.has('medium');
const model=(await new GLTFLoader().loadAsync(medium?'/MediumBoat.glb':'/BigBoat.glb')).scene;
const {boat}=normalizeBoatToScene(model,{targetLength:medium?60:180,targetWaterlineY:0,spawnX:0,spawnZ:0,modelPath:medium?'/assets/trawler (1).glb':'/assets/BigBoat.glb'});scene.add(boat);boat.userData.loaMeters=medium?60:180;
if(query.has('lights')){const {addBigBoatLights}=await import('/bigBoatLights.js');addBigBoatLights(boat);}
let bridgeView;
if(query.has('bridge')){
const helm=await import('/helmCockpit.js');const {syncBigBoatBridgeWindows}=await import('/bigBoatBridge.js');
const cockpit=helm.createHelmCockpit(boat);boat.add(cockpit.group);cockpit.group.visible=true;syncBigBoatBridgeWindows(cockpit.bridgeWindows,true);
if(medium){const {syncHelmDeckRailsVisibility}=await import('/helmDeckRails.js');syncHelmDeckRailsVisibility(boat,true);helm.syncHelmBoatMeshVisibility(boat,cockpit.group,true,false);}
const {createHelmRadarScreen}=await import('/helmRadarScreen.js');
const {drawCircularTacticalChart}=await import('/helpers/tacticalChart.js');
const radarCanvas=document.createElement('canvas');radarCanvas.width=512;radarCanvas.height=512;
// Preview fixture only; the app uses its live shared mission/navigation snapshot.
drawCircularTacticalChart(radarCanvas.getContext('2d'),512,512,{
boat:{x:0,z:0,headingDeg:0},islands:[],docks:[],
waypoints:[{x:1600,z:-1900,label:'Buoy 1',active:true},{x:-900,z:-2600,label:'Buoy 2'}],
navTarget:{x:1600,z:-1900,label:'Buoy 1'},
});
createHelmRadarScreen(boat,radarCanvas);
const {syncBigBoatBridgeLightVisibility}=await import('/bigBoatLights.js');syncBigBoatBridgeLightVisibility(boat,true);
for(let i=0;i<50&&!cockpit.wheelRotor.children.length;i++)await new Promise(resolve=>setTimeout(resolve,100));
if(!medium)for(let i=0;i<150&&!cockpit.group.userData.texturedBridge;i++)await new Promise(resolve=>setTimeout(resolve,100));
bridgeView={position:(medium?helm.HELM_CAMERA_POS:helm.HELM_CAMERA_POS_LARGE).toArray(),look:(medium?helm.HELM_CAMERA_LOOK:helm.HELM_CAMERA_LOOK_LARGE).toArray()};
}
const box=new THREE.Box3().setFromObject(model);console.log('Boat bounds',box.min.toArray(),box.max.toArray());
const views=[[[200,115,-200],[0,25,0]],[[0,70,220],[0,30,0]],[[-220,85,-170],[0,30,0]],[[0,250,0],[0,20,0]],[[130,95,-110],[30,45,0]],[[-130,100,120],[-25,45,0]],[[80,75,-65],[32,45,0]],[[50,85,-35],[24,58,0]],[[80,75,65],[32,45,0]],[[145,65,0],[40,38,0]],[[180,225,140],[0,20,0]]];
const single=query.get('view');
renderer.setScissorTest(true);
for(let i=0;i<(single?1:6);i++){
const index=single?Number(single):i;
const w=single?innerWidth:innerWidth/2,h=single?innerHeight:innerHeight/3;
const x=single?0:(i%2)*w,y=single?0:(2-Math.floor(i/2))*h;
const camera=new THREE.PerspectiveCamera(Number(query.get('fov'))||(bridgeView?62:40),w/h,0.1,1000);camera.position.fromArray(query.has('camera')?query.get('camera').split(',').map(Number):bridgeView?.position||views[index][0]);camera.lookAt(new THREE.Vector3().fromArray(query.has('look')?query.get('look').split(',').map(Number):bridgeView?.look||views[index][1]));
renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.render(scene,camera);
if(query.has('sample')){
const points=query.get('sample').split(';').map(pair=>pair.split(',').map(Number));
const canvasSize=renderer.getSize(new THREE.Vector2());
const hits=points.map(([px,py])=>{const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(px/w*2-1,1-(py+h-canvasSize.y)/h*2),camera);const hit=ray.intersectObject(model,true)[0];return {pixel:[px,py],position:hit?boat.worldToLocal(hit.point).toArray():null,normal:hit?hit.face.normal.clone().transformDirection(hit.object.matrixWorld).toArray():null};});
await fetch('/measure',{method:'POST',body:JSON.stringify({viewport:[w,h],hits})});
}
}
if(single)document.querySelector('#labels').remove();
document.body.dataset.ready='true';
</script></body></html>`;
createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/measure' && req.method === 'POST') { let body = ''; req.on('data', chunk => { body += chunk; }); req.on('end', () => { console.log(body); res.end('ok'); }); return; }
  if (path === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); return; }
  const file = files.get(path)
    ?? (/^\/assets\/optimized\/[\w-]+\.[a-f0-9]{12}\.glb$/.test(path) ? ['public' + path, 'model/gltf-binary'] : null)
    ?? (/^\/helpers\/[\w-]+\.js$/.test(path) ? ['src' + path, 'text/javascript'] : null)
    ?? (/^\/vendor\/(?:[\w-]+\/)*[\w-]+\.js$/.test(path)
      ? ['node_modules/three/examples/jsm/' + path.slice('/vendor/'.length), 'text/javascript'] : null);
  if (!file) { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { 'Content-Type': file[1] }); res.end(readFileSync(resolve(file[0]))); }
  catch { res.writeHead(404); res.end(); }
}).listen(4179, '127.0.0.1', () => console.log('Big boat preview: http://127.0.0.1:4179'));
