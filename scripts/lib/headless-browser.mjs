import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
export async function headlessBrowser({ directory, port = 9257, webgl = false }) {
  mkdirSync(directory, { recursive: true });
  const browser = spawn(process.env.HELMQUEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', ...(webgl ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-gpu']), `--remote-debugging-port=${port}`, `--user-data-dir=${resolve(directory, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const pause = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));
  let socket, sequence = 0; const commands = new Map(), errors = [];
  try {
    let targets;
    for (let i = 0; i < 120; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.some(t => t.type === 'page')) break; } catch {} await pause(); }
    if (!targets?.some(t => t.type === 'page')) throw new Error('Hidden Edge did not start.');
    socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text); if (!message.id) return; const pending = commands.get(message.id); commands.delete(message.id); if (pending) message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result); });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; commands.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
    const waitFor = async (expression, timeoutMs = 45000) => { const start = Date.now(); while (Date.now() - start < timeoutMs) { if (await evaluate(expression)) return; await pause(); } throw new Error(`Browser condition timed out: ${expression}\n${await evaluate('document.body.innerText')}`); };
    const clickExpression = async expression => {
      await evaluate(`(${expression}).scrollIntoView({block:'center',inline:'center',behavior:'instant'})`);
      const point = await evaluate(`(()=>{const el=${expression},r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,disabled:!!el.disabled,reachable:el.contains(document.elementFromPoint(x,y))};})()`);
      assert.equal(point.disabled, false, 'Click target is disabled'); assert.equal(point.reachable, true, 'Click target is covered');
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    };
    await send('Runtime.enable'); await send('Page.enable');
    return { errors, send, evaluate, waitFor, pause, clickExpression,
      click: text => clickExpression(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})`),
      fill: (selector, value) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`),
      navigate: url => send('Page.navigate', { url }),
      viewport: (width, height = 900) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }),
      async attach(path) { const { root } = await send('DOM.getDocument'); const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' }); await send('DOM.setFileInputFiles', { nodeId, files: [path] }); },
      async screenshot(name) { const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(resolve(directory, `${name}.png`), Buffer.from(result.data, 'base64')); },
      close() { socket?.close(); browser.kill(); }
    };
  } catch (error) { socket?.close(); browser.kill(); throw error; }
}
