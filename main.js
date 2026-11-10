const{app,BrowserWindow,ipcMain,screen}=require('electron');
const path=require('path'),fs=require('fs');const{pathToFileURL}=require('url');
const{DeviceSerial}=require('./lib/device-serial');const{StrivexSession}=require('./lib/strivex-session');const{DemoGateway}=require('./lib/demo-gateway');
const {Technician,Lighting}=require('./lib/technician');
const {SerialPort}=require('serialport');
const enabled=name=>/^(1|true|yes|on)$/i.test(process.env[name]||'');
const designMode=!app.isPackaged&&enabled('BALL_DUEL_DESIGN_MODE'),previewMode=designMode||enabled('BALL_DUEL_INTERFACE_TEST');
if(previewMode)app.setPath('userData',path.join(app.getPath('appData'),'Ball-Duel-Preview'));
let controlWindow,playerWindow,blueLed,orangeLed,strivex,runtimeConfig,technician,lighting,lastState,stopDesignWatch;
let ledChange=Promise.resolve();
if(!app.requestSingleInstanceLock()){app.quit();process.exit(0)}app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
function logFatal(error){const message=`[${new Date().toISOString()}] ${error?.stack||error}\r\n`;console.error(message);try{const root=app.isPackaged?path.dirname(process.execPath):__dirname;fs.appendFileSync(path.join(root,'ball-duel-error.log'),message,'utf8')}catch{}try{controlWindow?.webContents.send('device-status',{device:'application',connected:false,error:String(error?.message||error)})}catch{}}
function audioFiles(root,folder){try{return fs.readdirSync(path.resolve(root,folder),{withFileTypes:true}).filter(e=>e.isFile()&&/\.(mp3|wav|ogg|m4a|aac)$/i.test(e.name)).map(e=>pathToFileURL(path.resolve(root,folder,e.name)).href)}catch{return[]}}
function loadConfig(){const base=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8')),root=app.isPackaged?path.dirname(process.execPath):__dirname,external=path.join(root,'config.json'),custom=app.isPackaged&&fs.existsSync(external)?JSON.parse(fs.readFileSync(external,'utf8')):{};const c={...base,...custom,ledBlue:{...base.ledBlue,...custom.ledBlue},ledOrange:{...base.ledOrange,...custom.ledOrange},strivex:{...base.strivex,...custom.strivex},audio:{...base.audio,...custom.audio}};c.interfaceTestMode=previewMode;c.designMode=designMode;if(previewMode){c.ledBlue.enabled=false;c.ledOrange.enabled=false;c.strivex={...c.strivex,enabled:true,developmentMode:true,demoLobby:true}};c.audio.menuPlaylist=audioFiles(root,c.audio.menuPlaylistFolder);c.audio.gamePlaylists={};for(const[mode,folder]of Object.entries(c.audio.gamePlaylistFolders||{}))c.audio.gamePlaylists[mode]=audioFiles(root,folder);c.audio.ringSounds={};for(const[color,folder]of Object.entries(c.audio.ringSoundFolders||{}))c.audio.ringSounds[color]=audioFiles(root,folder);for(const key of['button','countdown','startCountdown','end','bonusX2','bonusGreen'])if(c.audio[key])c.audio[key]=pathToFileURL(path.resolve(root,c.audio[key])).href;return c}
function pickDisplays(c){const all=screen.getAllDisplays(),primary=screen.getPrimaryDisplay(),secondary=all.find(x=>x.id!==primary.id)||primary;return{control:c.controlDisplayIndex==='primary'?primary:all[c.controlDisplayIndex]||primary,player:c.playerDisplayIndex==='secondary'?secondary:all[c.playerDisplayIndex]||secondary}}
function windowAt(display,file,c){
  const bounds=designMode?require('./lib/design-mode').designBounds(screen.getPrimaryDisplay().workArea,file==='control.html'):display.bounds;
  const w=new BrowserWindow({...bounds,frame:designMode,resizable:true,fullscreen:!designMode&&!!c.kiosk,kiosk:!designMode&&!!c.kiosk,autoHideMenuBar:true,title:'Ball Duel — '+(file==='control.html'?'Control':'Player'),backgroundColor:'#07101a',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  if(previewMode){let bracelet='';const keys={Q:[0,0],W:[0,1],E:[0,2],R:[0,3],T:[0,4],U:[1,0],I:[1,1],O:[1,2],P:[1,3],'[':[1,4]};
    w.webContents.on('before-input-event',(event,input)=>{if(input.type!=='keyDown'||input.isAutoRepeat)return;if(input.key==='F12'){event.preventDefault();w.webContents.toggleDevTools();return}if(input.control||input.alt||input.meta)return;
      const editing=w.webContents.isDevToolsFocused();if(editing)return;
      if(/^[0-9]$/.test(input.key))bracelet=(bracelet+input.key).slice(-6);else if(input.key==='Enter'&&bracelet){strivex.tap?.(bracelet);bracelet=''}else if(input.key==='Escape')bracelet='';
      if(technician?.staff)return;const hit=keys[input.key.toUpperCase()];if(hit){event.preventDefault();emit('test-hit',hit)}
    });
  }
  if(designMode)w.on('close',()=>setImmediate(()=>app.quit()));
  w.webContents.on('did-finish-load',()=>{if(file==='player.html'&&lastState)w.webContents.send('state-update',lastState);if(technician)w.webContents.send('tech-state',technician.snapshot())});
  w.loadFile(path.join(__dirname,'public',file));return w;
}
function emit(channel,data){controlWindow?.webContents.send(channel,data)}
function setupStrivex(c){const demo=!!(c.strivex.demoLobby&&c.strivex.developmentMode);strivex=demo?new DemoGateway({paidSeconds:300}):new StrivexSession({host:'127.0.0.1',port:c.strivex.wsPort||4210,game:'ball-duel',version:app.getVersion(),protocol:1});for(const type of['unlock','lock','expired','lobby','scan','queue'])strivex.on(type,x=>emit('strivex-event',{type,...x}));let lastQueue=null;strivex.on('queue',x=>{lastQueue=x});strivex.on('connection',x=>{if(!x.connected)lastQueue=null});strivex.on('start-denied',x=>emit('strivex-event',{type:'start_denied',...x}));strivex.on('profile',x=>emit('strivex-event',{type:'profile',...x}));strivex.on('avatar-saved',x=>emit('strivex-event',{type:'avatar_saved',...x}));strivex.on('tick',remainingMs=>emit('strivex-event',{type:'tick',remainingMs}));strivex.on('connection',x=>emit('strivex-status',{...strivex.snapshot(),...x}));strivex.on('error',e=>emit('strivex-status',{...strivex.snapshot(),error:e.message}));strivex.on('technician',message=>technician.gateway(message));strivex.on('connection',x=>{if(!x.connected)technician.gateway({staff:null})});strivex.start();ipcMain.handle('strivex-snapshot',()=>({...strivex.snapshot(),enabled:c.strivex.enabled,developmentMode:c.strivex.developmentMode,queue:lastQueue}));ipcMain.on('strivex-final',(_e,x)=>{try{const allowed=new Set(['completed','timeout','abandoned','failed']),status=allowed.has(x?.status)?x.status:'failed';strivex.reportResult(Number(x?.number)||0,status,x?.meta||{})}catch(error){logFatal(error)}});ipcMain.on('strivex-lobby',(_e,x)=>{if(x?.type==='start'&&!technician.staff&&!technician.blocked)strivex.lobbyStart({mode:x.mode,variant:x.variant,difficulty:x.difficulty,durationMinutes:x.durationMinutes});else if(x?.type==='remove')strivex.lobbyRemove(String(x.uid||''));else if(x?.type==='reset')strivex.lobbyReset();else if(x?.type==='profile'&&typeof strivex.requestProfile==='function')strivex.requestProfile(String(x.uid||''));else if(x?.type==='avatar_save'&&typeof strivex.saveAvatar==='function')strivex.saveAvatar(String(x.uid||''),x.avatar);else if(x?.type==='queue_open'&&typeof strivex.queueOpen==='function')strivex.queueOpen();else if(x?.type==='queue_done'&&typeof strivex.queueDone==='function')strivex.queueDone();else if(x?.type==='queue_cancel'&&typeof strivex.queueCancel==='function')strivex.queueCancel();else if(x?.type==='demo-reset'&&previewMode)strivex.resetPreview?.();else if(x?.type==='demo-tap'&&typeof strivex.tap==='function')strivex.tap(String(x.code||''))});ipcMain.on('strivex-simulate',(_e,x)=>{if(c.strivex.developmentMode&&x.type==='start')strivex.unlock?.({session_id:`SIM-${Date.now()}`,users:[{uid:'SIM1',name:'Player 1'},{uid:'SIM2',name:'Player 2'}],paid_seconds:x.paid_seconds||300})})}

process.on('uncaughtException',logFatal);process.on('unhandledRejection',logFatal);
app.whenReady().then(async()=>{
  runtimeConfig=loadConfig();
  technician=new Technician({file:path.join(app.getPath('userData'),'technician-settings.json'),preview:previewMode,language:runtimeConfig.language,ports:[runtimeConfig.ledBlue.enabled===false?'off':runtimeConfig.ledBlue.port,runtimeConfig.ledOrange.enabled===false?'off':runtimeConfig.ledOrange.port],gamepad:runtimeConfig.gamepad});
  lighting=new Lighting((stand,command)=>(stand===0?blueLed:orangeLed)?.send(command),technician);
  technician.on('change',snapshot=>{for(const w of[controlWindow,playerWindow])w?.webContents.send('tech-state',snapshot)});
  technician.on('enter',()=>emit('technician-enter',{}));
  technician.on('hit',(stand,ring)=>emit('test-hit',[stand,ring]));
  technician.on('settings',()=>{if(!technician.staff)lighting.update(lastState||{phase:'lobby'},true)});
  technician.on('port',(stand,port)=>{ledChange=ledChange.then(()=>configureLed(stand,port)).catch(error=>{technician.error=error.message;technician.publish()})});
  technician.on('ports',()=>refreshPorts());
  technician.on('gateway-command',action=>{if(!strivex.technicianCommand(action))throw Error('GATEWAY_OFFLINE')});
  setupStrivex(runtimeConfig);
  ipcMain.handle('get-config',()=>runtimeConfig);
  ipcMain.on('state-update',(event,s)=>{if(event.sender!==controlWindow?.webContents)return;lastState=s;playerWindow?.webContents.send('state-update',s);lighting.update(s)});
  ipcMain.on('led-command',(event,x)=>{if(event.sender!==controlWindow?.webContents||!Number.isInteger(x?.stand)||x.stand<0||x.stand>1||typeof x.command!=='string')return;lighting.command(x.stand,x.command)});
  ipcMain.handle('tech-snapshot',()=>technician.snapshot());
  ipcMain.handle('tech-command',(_event,command)=>{try{return technician.command(command)}catch(error){technician.error=error.message;technician.publish();return technician.snapshot()}});
  ipcMain.on('gamepad-buttons',(event,x)=>{if(event.sender!==controlWindow?.webContents)return;try{technician.rawButtons(x.index,x.indices)}catch(error){logFatal(error)}});
  ipcMain.on('gamepad-status',(event,pads)=>{if(event.sender!==controlWindow?.webContents||!Array.isArray(pads)||pads.length>128)return;technician.pads=pads;technician.publish()});
  const displays=pickDisplays(runtimeConfig);controlWindow=windowAt(displays.control,'control.html',runtimeConfig);playerWindow=windowAt(displays.player,'player.html',runtimeConfig);
  if(designMode)stopDesignWatch=require('./lib/design-mode').watchDesign(__dirname,()=>[controlWindow,playerWindow]);
  await configureLed(0,technician.settings.ports[0]);await configureLed(1,technician.settings.ports[1]);await refreshPorts();
}).catch(logFatal);
async function refreshPorts(){try{technician.ports=(await SerialPort.list()).map(p=>p.path);technician.publish()}catch(error){technician.error=error.message;technician.publish()}}
async function configureLed(stand,port){
  const previous=stand===0?blueLed:orangeLed;await previous?.stop();
  const base=stand===0?runtimeConfig.ledBlue:runtimeConfig.ledOrange;
  const config={...base,identity:'BALL_DUEL_LED',compatibleIdentities:[...new Set([base.identity,...(base.compatibleIdentities||[]),stand===0?'BALL_DUEL_LED_BLUE':'BALL_DUEL_LED_ORANGE'].filter(id=>id&&id!=='BALL_DUEL_LED'))],enabled:port!=='off',port:port==='off'?'auto':port};
  const used=()=>[blueLed?.path,orangeLed?.path,technician.settings.ports[1-stand]].filter(p=>p&&!['auto','off'].includes(p));
  const device=stand===0?new DeviceSerial(runtimeConfig.ledBlue={...config},used):new DeviceSerial(runtimeConfig.ledOrange={...config},used);
  if(stand===0)blueLed=device;else orangeLed=device;
  technician.led[stand]={connected:false,path:port};technician.publish();
  device.on('status',status=>{if(device!==(stand===0?blueLed:orangeLed))return;technician.ledStatus(stand,status);if(status.connected){try{technician.rememberPort(stand,status.path)}catch(error){technician.error=error.message}}emit('device-status',{device:stand===0?'ledBlue':'ledOrange',...status});technician.publish();if(status.connected)lighting.update(lastState||{phase:'lobby'},true)});
  device.on('line',line=>{const match=/^ACK CAL ([1-5]) ([12])$/.exec(line);if(match)technician.confirmCalibration(stand,Number(match[1])-1,Number(match[2])-1)});
  await device.start();
}
app.on('second-instance',()=>controlWindow?.focus());app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>{stopDesignWatch?.();blueLed?.stop();orangeLed?.stop();strivex?.stop()});
