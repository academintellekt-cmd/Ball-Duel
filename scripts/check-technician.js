const{app,BrowserWindow,ipcMain}=require('electron');
const{EventEmitter}=require('events'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
app.disableHardwareAcceleration();
const root=path.join(__dirname,'..'),out=path.join(root,'.tmp','visual-check');fs.mkdirSync(out,{recursive:true});
app.setPath('appData',fs.mkdtempSync(path.join(root,'.tmp','ui-session-')));process.env.BALL_DUEL_DESIGN_MODE='true';
const commands=[],errors=[],phases=[];let latest,control,player;
class TestLed extends EventEmitter{
  constructor(config){super();this.config=config;this.path=config.port}
  async start(){if(this.config.enabled)this.emit('status',{connected:true,path:this.path})}
  async stop(){}
  send(command){commands.push([this.path,command]);if(/^CAL [1-5] [12]$/.test(command))setImmediate(()=>this.emit('line','ACK '+command))}
}
require('../lib/device-serial');require.cache[require.resolve('../lib/device-serial')].exports={DeviceSerial:TestLed};
require('../lib/design-mode').watchDesign=()=>()=>{};
const original=ipcMain.handle.bind(ipcMain);
ipcMain.handle=(channel,handler)=>original(channel,async(...args)=>{const value=await handler(...args);return channel==='get-config'?{...value,audio:{...value.audio,enabled:false},durations:[.05],countdownSeconds:1,gameOverSeconds:.2,resultSeconds:.3,leaderboardSeconds:.3}:value});
ipcMain.on('state-update',(_e,state)=>{latest=state;if(phases.at(-1)!==state.phase)phases.push(state.phase)});
app.on('web-contents-created',(_e,wc)=>wc.on('console-message',e=>{if(e.level==='error'&&!e.message.includes('ERR_FILE_NOT_FOUND'))errors.push(e.message)}));
app.on('browser-window-created',(_e,w)=>{w.hide();w.webContents.setBackgroundThrottling(false)});
require('../main');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<400;i++){if(await fn())return;await pause(20)}throw Error('Timed out: '+label)}
const run=(code,w=control)=>w.webContents.executeJavaScript(code);
const click=(selector,w=control)=>run(`document.querySelector(${JSON.stringify(selector)}).click();true`,w);
const snapshot=()=>run('window.ballDuel.getTechnician()');
async function key(w,keyCode){w.webContents.sendInputEvent({type:'keyDown',keyCode});w.webContents.sendInputEvent({type:'keyUp',keyCode});await pause(15)}
async function scan(code,w=control){for(const digit of code)await key(w,digit);await key(w,'Return')}
async function press(index,indices,release=true){await run(`window.testPads[${index}].buttons.forEach((b,i)=>b.pressed=${JSON.stringify(indices)}.includes(i));true`);await pause(45);if(release){await run(`window.testPads[${index}].buttons.forEach(b=>b.pressed=false);true`);await pause(35)}}
async function capture(name,w){await pause(100);fs.writeFileSync(path.join(out,name+'.png'),(await w.webContents.capturePage()).toPNG())}
async function pads(){await run(`window.testPads=[0,1].map(index=>({index,id:'USB Ball Duel '+index,connected:true,buttons:Array.from({length:24},()=>({pressed:false,value:0}))}));Object.defineProperty(navigator,'getGamepads',{value:()=>window.testPads,configurable:true});true`);await pause(80)}
const timeout=setTimeout(()=>{console.error('UI timed out',errors);app.exit(1)},55000);
app.whenReady().then(async()=>{try{
  await until(()=>BrowserWindow.getAllWindows().length===2&&BrowserWindow.getAllWindows().every(w=>/\/(control|player)\.html$/.test(w.webContents.getURL())),'windows');
  control=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('control.html'));player=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('player.html'));
  await until(()=>run(`!!document.querySelector('.lobby-screen')`),'loaded');
  control.setContentSize(440,1000);player.setContentSize(1280,720);await capture('lobby-portrait',control);
  await scan('777',player);await until(()=>run(`!!document.querySelector('.tech-screen')`),'technician entered');
  for(const stand of[0,1])await run(`window.ballDuel.technicianCommand({type:'invert',stand:${stand},value:false})`);await pads();
  assert.equal(await run(`document.querySelectorAll('[data-tech="capture"]').length`),0,'no individual Assign buttons');assert.equal(await run(`document.querySelectorAll('[data-tech="calibrate"]').length`),2);
  for(const stand of[0,1]){await run(`document.querySelector('[data-port="${stand}"]').value='COM${90+stand}';true`);await click(`[data-tech="port"][data-stand="${stand}"]`);await until(async()=>(await snapshot()).led[stand].connected,'LED connected')}
  const mapping=[[15,16,2,3,4,5,6,7,8,9],[23,22,21,20,19,18,17,16,15,14]];
  for(const stand of[0,1]){
    const previous=(await snapshot()).settings.buttons[stand];await click(`[data-tech="calibrate"][data-stand="${stand}"]`,stand?player:control);
    for(let step=0;step<10;step++){
      await until(async()=>{const c=(await snapshot()).calibration;return c?.step===step&&c.ready},'ring half '+stand+':'+step);
      assert(commands.some(x=>x[0]==='COM'+(90+stand)&&x[1]===`CAL ${Math.floor(step/2)+1} ${step%2+1}`));
      if(stand===0&&step<2){await capture('calibration-half-'+(step+1),player);assert(await run(`document.querySelector('.technician-root').scrollHeight<=innerHeight+1`,player),'wizard fits landscape settings');if(step===0){control.setContentSize(1080,1920);await capture('calibration-portrait',control);assert(await run(`document.querySelector('.technician-root').scrollHeight<=innerHeight+1`),'wizard fits portrait settings');control.setContentSize(440,1000)}}
      if(stand===0&&step===0){await press(0,[15,16]);assert.equal((await snapshot()).calibration.step,0,'ambiguous paired input cannot advance setup')}
      await press(stand,[mapping[stand][step]]);
      if(step<9)assert.deepEqual((await snapshot()).settings.buttons[stand],previous,'no partial writes');
    }
    assert.equal((await snapshot()).calibration,null);assert.deepEqual((await snapshot()).settings.buttons[stand],mapping[stand]);assert.deepEqual((await snapshot()).settings.channels[stand],[0,1,2,3,4]);
  }
  await press(0,[15,16],false);await pause(100);assert.deepEqual((await snapshot()).counters[0].slice(0,2),[1,1]);assert(commands.some(x=>x[0]==='COM90'&&x[1]==='CHASE 1'));await press(0,[]);
  assert(await run(`document.querySelector('.bd-tech-target.is-hit .bd-tech-ring')!==null`),'sensor also animates its on-screen ring');
  await capture('technician-sensor-feedback',player);await capture('technician-portrait',control);await capture('technician-landscape',player);
  assert(await run(`document.querySelector('.technician-root').scrollHeight<=innerHeight+1`,player),'all targets fit the landscape settings');
  control.setContentSize(1080,1920);await capture('technician-1080x1920',control);assert(await run(`document.querySelector('.technician-root').scrollHeight<=innerHeight+1`),'all targets fit portrait settings');control.setContentSize(440,1000);
  const saved=(await snapshot()).settings;await click('[data-tech="calibrate"][data-stand="0"]');await click('[data-tech="cancel"]');assert.deepEqual((await snapshot()).settings,saved);
  await click('[data-tech="block"]');await click('[data-tech="close"]');await until(()=>run(`!!document.querySelector('.tech-blocked')`),'blocked');await scan('777');await click('[data-tech="unblock"]');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'technician-settings.json'))),saved);
  await click('[data-tech="close"]');await scan('111');await scan('222',player);await click('[data-lobby-start]');
  await until(()=>latest?.phase==='countdown','START immediately begins countdown');
  for(const w of[control,player])assert.equal(await run(`!!document.querySelector('[data-lobby-enter]')||/нажмите любую|нажмите любой датчик|входите/i.test(document.body.innerText)`,w),false);
  await capture('automatic-countdown',control);await until(()=>latest?.phase==='game','automatic game');assert(!phases.includes('ready'));
  await press(0,[15,16]);assert.deepEqual(latest.scores,[0,1],'paired sensors award a single point');assert(commands.some(x=>x[0]==='COM90'&&x[1]==='HIT 1 G'));
  await until(()=>latest.phase==='lobby','round completed');assert(latest.sessionId,'paid session retained');
  await click('[data-lobby-mode="targets"]');await click('[data-lobby-start]');await until(()=>latest.phase==='countdown','next round also starts automatically');await until(()=>latest.phase==='game','target game');
  await until(()=>run(`document.querySelectorAll('.stand-ring.target-orbit').length===4`,player),'two animated targets on each stand');
  const motion1=await run(`getComputedStyle(document.querySelector('.target-orbit'),'::before').transform`,player);await pause(120);const motion2=await run(`getComputedStyle(document.querySelector('.target-orbit'),'::before').transform`,player);assert.notEqual(motion1,motion2,'comets move while state is republished');
  await capture('targets-two-comets',player);
  const green=latest.rings[0].indexOf('green');await press(0,[mapping[0][green*2]]);assert(latest.flashes.some(x=>x.stand===0&&x.ring===green&&x.color==='green'));
  const red=latest.rings[0].findIndex((c,r)=>c==='red'&&r!==green);await press(0,[mapping[0][red*2+1]]);assert(latest.flashes.some(x=>x.stand===0&&x.ring===red&&x.color==='red'));assert(commands.some(x=>x[0]==='COM90'&&x[1]===`HIT ${red+1} R`));
  await capture('targets-hit-feedback',player);assert.equal(await run(`document.querySelectorAll('.stand-ring.flash.target-orbit').length`,player),0);
  await scan('777',player);await until(()=>latest.phase==='lobby'&&!latest.sessionId,'technician interrupts game');
  control.webContents.reloadIgnoringCache();await until(()=>run(`!!document.querySelector('.tech-screen')`),'reload');assert.deepEqual((await snapshot()).settings,saved);
  assert.deepEqual(errors,[]);console.log('PASS: 20 LED-half/sensor steps, no Assign buttons, LED confirmations, atomic persistence, sensor counter + ring orbit, automatic first/subsequent starts, no entry overlay, moving target comets, solid green/red feedback, two screens.');clearTimeout(timeout);app.quit();
}catch(error){console.error(error,errors);clearTimeout(timeout);app.exit(1)}});
