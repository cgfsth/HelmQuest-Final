// Render the real app and real boat assets; check the return from Free Roam to the landing background.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const directory = resolve('../.tmp/landing-boat-verification');
mkdirSync(directory, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5177, strictPort: true, hmr: false } });
await server.listen();
const browser = spawn(process.env.HELMQUEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=9240', `--user-data-dir=${resolve(directory, 'browser-profile')}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
browser.on('error', error => console.error(error.message));
const pause = () => new Promise(resolve => setTimeout(resolve, 200));
let socket, sequence = 0;
const commands = new Map(), errors = [];
try {
  let targets;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { targets = await (await fetch('http://127.0.0.1:9240/json/list')).json(); if (targets.some(tab => tab.type === 'page')) break; } catch {}
    await pause();
  }
  assert.ok(targets?.some(tab => tab.type === 'page'), 'Hidden browser did not start');
  socket = new WebSocket(targets.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (!message.id) return;
    const command = commands.get(message.id); commands.delete(message.id); clearTimeout(command.timer);
    message.error ? command.reject(message.error) : command.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence, timer = setTimeout(() => { commands.delete(id); reject(new Error(method + ' timed out')); }, 45000);
      commands.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 600; attempt++) { if (await evaluate(expression)) return; await pause(); }
    throw new Error('App did not finish loading: ' + expression + ' ' + JSON.stringify(errors));
  }
  async function screenshot(name) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(directory, name + '.png'), Buffer.from(shot.data, 'base64'));
  }
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const nativeRAF = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => nativeRAF(time => { if (callback.name !== 'animate') callback(time); });
  ` });
  await send('Page.navigate', { url: 'http://127.0.0.1:5177/' });
  await waitFor("!!document.querySelector('#app')?.__vue_app__?._instance?.setupState?.islandGroup");
  await evaluate("window.s=document.querySelector('#app').__vue_app__._instance.setupState; s.graphicsQuality='low';s.applyGraphicsSettings();true");
  await waitFor("!!s.ocean && s.boatObject?.userData.modelPath==='/assets/trawler (1).glb'");
  const results = [];
  for (const type of ['small', 'medium', 'large']) {
    const modelPath = type === 'small' ? '/assets/SmallBoat.glb' : type === 'medium' ? '/assets/trawler (1).glb' : '/assets/BigBoat.glb';
    await evaluate(`s.chooseBoatAndSail('${type}');true`);
    await waitFor(`s.activeScreen==='simulation' && s.boatObject?.userData.modelPath===${JSON.stringify(modelPath)} && !s.showCinematicLoading`);
    assert.equal(await evaluate('s.boatObject.scale.x'), 1, 'Simulation keeps its normal hull scale');
    await evaluate("window.selectedHull=s.boatObject;s.goToScreen('landing');true");
    await pause();
    await evaluate('for(let i=0;i<120;i++){s.ocean.update(1/60,s.camera.position);s.updateLandingCinematic(1/60)}s.animate();true');
    await pause();
    const metrics = await evaluate(`(async()=>{
      const THREE=await import('/node_modules/three/build/three.module.js');
      const b=s.boatObject,frame=s.getLandingBoatPresentation(b,s.BOAT_TYPES,innerWidth/innerHeight);
      const bounds=new THREE.Box3().setFromObject(b);
      const hullBounds=new THREE.Box3().setFromObject(b.children[0]);s.camera.updateMatrixWorld(true);
      const projected=[];for(const x of [hullBounds.min.x,hullBounds.max.x])for(const y of [hullBounds.min.y,hullBounds.max.y])for(const z of [hullBounds.min.z,hullBounds.max.z])projected.push(new THREE.Vector3(x,y,z).project(s.camera));
      const motion=s.sampleBoatWaveMotion(b.position.x,b.position.z,b.rotation.y,frame.length,(x,z)=>s.ocean.sampleHeight(x,z),frame.beam);
      return {type:'${type}',sameHull:b===window.selectedHull,path:b.userData.modelPath,scale:b.scale.x,
        y:b.position.y,expectedY:s.baselineWaterlineY+frame.waterlineOffset+motion.height,
        left:Math.min(...projected.map(p=>p.x)),right:Math.max(...projected.map(p=>p.x)),
        visibleHeight:bounds.max.y-s.getWaterSurfaceY(b.position.x,b.position.z),cameraY:s.camera.position.y,
        seaY:s.getWaterSurfaceY(s.camera.position.x,s.camera.position.z),fatal:s.fatalError};})()`);
    assert.equal(metrics.sameHull, true); assert.equal(metrics.path, modelPath); assert.equal(metrics.scale, 1.5);
    assert.ok(Math.abs(metrics.y - metrics.expectedY) < .2, JSON.stringify(metrics));
    assert.ok(metrics.visibleHeight > 1, 'Hull must have visible geometry above the water: ' + JSON.stringify(metrics));
    assert.ok(metrics.cameraY > metrics.seaY, 'Landing camera stays above the water');
    assert.ok(metrics.left > -1 && metrics.right < 1, 'Loaded hull must fit across the landing background: ' + JSON.stringify(metrics));
    assert.equal(metrics.fatal, null);
    await screenshot('landing-' + type);
    await evaluate("document.querySelector('.professional-landing').style.visibility='hidden';true");
    await screenshot('scene-' + type);
    await evaluate("document.querySelector('.professional-landing').style.visibility='';true");
    results.push(metrics); console.log(JSON.stringify(metrics));
    if (type === 'small') {
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
      await evaluate('s.updateLandingCinematic(1/60);s.animate();true'); await pause();
      await screenshot('landing-small-phone');
      await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
    }
  }
  assert.deepEqual(errors, []);
  writeFileSync(resolve(directory, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, screenshots: directory }));
  await Promise.race([send('Browser.close'), new Promise(resolve => setTimeout(resolve, 1000))]);
} finally {
  for (const command of commands.values()) clearTimeout(command.timer);
  socket?.close(); browser.kill(); await server.close();
}
