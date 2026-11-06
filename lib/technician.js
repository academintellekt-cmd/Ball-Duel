const fs=require('fs'),path=require('path'),{EventEmitter}=require('events');
const {targetMask}=require('./ball-duel-engine');
const LANGUAGES=['ru','en','de','fr','zh','ja'];
const portName=value=>String(value).toUpperCase().replace(/^OFF$/,'off').replace(/^AUTO$/,'auto');
class Technician extends EventEmitter{
  constructor({file,preview=false,language='ru',ports=['auto','auto'],gamepad={}}={}){
    super();this.file=file;
    this.settings={language,ports:preview?['off','off']:ports,gamepads:gamepad.swapPlayers?[...(gamepad.standByGamepadIndex||[0,1])].reverse():gamepad.standByGamepadIndex||[0,1],buttons:[0,1].map(()=>Array.from({length:10},(_,i)=>i)),channels:[0,1].map(()=>[0,1,2,3,4]),invertInputs:[!!gamepad.invertInputs,!!gamepad.invertInputs]};
    this.staff=null;this.blocked=false;this.counters=[Array(10).fill(0),Array(10).fill(0)];this.calibration=null;this.error='';this.ports=[];this.led=[{connected:false},{connected:false}];this.pads=[];
    if(file&&fs.existsSync(file)){try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));this.validate({...this.settings,...saved});this.settings={...this.settings,...saved}}catch{this.error='SETTINGS_INVALID'}}
  }
  validate(s){
    for(const[key,size,max]of[['buttons',10,127],['channels',5,4]])if(!Array.isArray(s[key])||s[key].length!==2||s[key].some(row=>!Array.isArray(row)||row.length!==size||new Set(row).size!==size||row.some(n=>!Number.isInteger(n)||n<0||n>max)))throw Error('Invalid '+key);
    if(!Array.isArray(s.gamepads)||s.gamepads.length!==2||new Set(s.gamepads).size!==2||s.gamepads.some(n=>!Number.isInteger(n)||n<0||n>127))throw Error('Invalid gamepads');
    if(!Array.isArray(s.ports)||s.ports.length!==2||s.ports.some(p=>!/^(off|auto|COM[1-9]\d*)$/i.test(p))||s.ports[0]===s.ports[1]&&!['off','auto'].includes(s.ports[0]))throw Error('Invalid COM ports');
    if(!LANGUAGES.includes(s.language)||!Array.isArray(s.invertInputs)||s.invertInputs.length!==2||s.invertInputs.some(v=>typeof v!=='boolean'))throw Error('Invalid settings');
  }
  save(patch){const next={...this.settings,...patch};this.validate(next);if(this.file){fs.mkdirSync(path.dirname(this.file),{recursive:true});const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n');fs.renameSync(tmp,this.file)}this.settings=next;this.emit('settings',next)}
  rememberPort(stand,port){if(this.settings.ports[stand]!=='auto')return;const ports=[...this.settings.ports];ports[stand]=portName(port);this.save({ports})}
  snapshot(){return{staff:this.staff,blocked:this.blocked,settings:this.settings,counters:this.counters,calibration:this.calibration,error:this.error,ports:this.ports,led:this.led,pads:this.pads}}
  publish(){this.emit('change',this.snapshot())}
  gateway({staff=null,blocked=this.blocked,error=''}={}){
    const was=!!this.staff;this.staff=staff?.role==='technician'?staff:null;this.blocked=!!blocked;this.error=error;
    if(this.staff&&!was){this.counters.forEach(row=>row.fill(0));this.emit('enter')}
    if(!this.staff&&was)this.cancelCalibration();this.publish();
  }
  cancelCalibration(){this.calibration=null;this.emit('calibrate',-1,-1,-1)}
  ledStatus(stand,status){this.led[stand]=status;if(this.calibration?.stand===stand&&!status.connected){this.calibration={...this.calibration,ready:false};this.error='LED_NOT_CONNECTED'}}
  confirmCalibration(stand,ring,half){
    const c=this.calibration;if(!c||c.stand!==stand||Math.floor(c.step/2)!==ring||c.step%2!==half||!this.led[stand].connected||c.ready)return;
    this.calibration={...c,ready:true};this.error='';this.publish();
  }
  calibrationInput(index,valid){
    const c=this.calibration;if(!c||!valid.length)return;
    if(!this.led[c.stand].connected){this.error='LED_NOT_CONNECTED';this.publish();return}
    if(!c.ready)return;
    if(valid.length!==1){this.error='ONE_SENSOR_AT_A_TIME';this.publish();return}
    if(c.index!==null&&c.index!==index){this.error='WRONG_GAMEPAD';this.publish();return}
    if(c.buttons.includes(valid[0])){this.error='SENSOR_USED';this.publish();return}
    const buttons=[...c.buttons];buttons[c.step]=valid[0];this.error='';
    if(c.step===9){
      const gamepads=[...this.settings.gamepads],other=1-c.stand,previous=gamepads[c.stand];gamepads[c.stand]=index;if(gamepads[other]===index)gamepads[other]=previous;
      const mapped=this.settings.buttons.map(row=>[...row]),channels=this.settings.channels.map(row=>[...row]);mapped[c.stand]=buttons;channels[c.stand]=[0,1,2,3,4];
      this.save({buttons:mapped,channels,gamepads});this.cancelCalibration();this.counters[c.stand].fill(0);
      this.emit('pulse',c.stand,4);
    }else{
      this.calibration={...c,index,buttons,step:c.step+1,ready:false};
      this.emit('calibrate',c.stand,Math.floor((c.step+1)/2),(c.step+1)%2);
    }
    this.publish();
  }
  rawButtons(index,indices){
    if(!Number.isInteger(index)||index<0||index>127||!Array.isArray(indices)||indices.length>128)throw Error('Invalid input');
    const valid=[...new Set(indices)].filter(n=>Number.isInteger(n)&&n>=0&&n<128);
    if(this.staff&&this.calibration){this.calibrationInput(index,valid);return}
    const stand=this.settings.gamepads.indexOf(index);if(stand<0)return;const rings=new Set();
    for(const button of valid){const slot=this.settings.buttons[stand].indexOf(button);if(slot<0)continue;rings.add(Math.floor(slot/2));if(this.staff)this.counters[stand][slot]=(this.counters[stand][slot]+1)%16}
    for(const ring of rings)if(this.staff)this.emit('pulse',stand,ring);else if(!this.blocked)this.emit('hit',stand,ring);
    if(this.staff&&rings.size)this.publish();
  }
  command(x){
    if(!this.staff)throw Error('Technician bracelet required');this.error='';
    const stand=()=>{if(!Number.isInteger(x.stand)||x.stand<0||x.stand>1)throw Error('Invalid stand');return x.stand};
    if(x.type==='cancel')this.cancelCalibration();
    else if(x.type==='port'){const ports=[...this.settings.ports];ports[stand()]=portName(x.port);this.save({ports});this.cancelCalibration();this.emit('port',x.stand,ports[x.stand])}
    else if(x.type==='invert'){const invertInputs=[...this.settings.invertInputs];invertInputs[stand()]=!!x.value;this.save({invertInputs});if(this.calibration)this.cancelCalibration()}
    else if(x.type==='language')this.save({language:x.language});
    else if(x.type==='calibrate'){
      stand();if(!this.led[x.stand].connected)throw Error('LED_NOT_CONNECTED');
      this.calibration={stand:x.stand,step:0,index:null,buttons:Array(10).fill(null),ready:false};this.emit('calibrate',x.stand,0,0);
    }else if(x.type==='target'){
      stand();if(!Number.isInteger(x.ring)||x.ring<0||x.ring>4)throw Error('Invalid target');
      if(this.calibration)throw Error('CALIBRATION_ACTIVE');this.emit('pulse',x.stand,x.ring);
    }else if(['close','block','unblock'].includes(x.type))this.emit('gateway-command',x.type);
    else if(x.type==='ports')this.emit('ports');else throw Error('Unknown technician command');
    this.publish();return this.snapshot();
  }
}
class Lighting{
  constructor(send,technician){this.send=send;this.technician=technician;this.state={phase:'lobby'};this.phase=null;
    technician.on('pulse',(stand,ring)=>send(stand,`CHASE ${technician.settings.channels[stand][ring]+1}`));
    technician.on('calibrate',(stand,ring,half)=>{for(let s=0;s<2;s++)send(s,s===stand?`CAL ${ring+1} ${half+1}`:'CAL 0')});
    technician.on('change',()=>this.update(this.state));
  }
  command(stand,command){
    if(this.technician.staff||this.technician.blocked)return;const channels=this.technician.settings.channels[stand];
    if(/^SET [BOGRY]{5}$/.test(command)){const physical=Array(5);channels.forEach((channel,ring)=>physical[channel]=command[4+ring]);command='SET '+physical.join('')}
    else if(/^(HIT|FLASH) [1-5] [BOGRYW](?: [1-9])?$/.test(command))command=command.replace(/^(HIT|FLASH) ([1-5])/,(_m,type,n)=>`${type} ${channels[Number(n)-1]+1}`);
    else if(/^ANIM \d+$/.test(command)){const mask=Number(command.slice(5));if(mask>31)return;command='ANIM '+channels.reduce((out,physical,ring)=>out|(mask&(1<<ring)?1<<physical:0),0)}
    this.send(stand,command);
  }
  update(state,force=false){
    this.state=state;const tech=this.technician;let phase=tech.staff?'technician':tech.blocked?'blocked':state.phase;
    if(['gameover','results','leaderboard'].includes(phase))phase=`result-${state.scores?.[0]===state.scores?.[1]?2:state.scores?.[0]>state.scores?.[1]?0:1}`;
    if(!force&&this.phase===phase)return;this.phase=phase;
    for(let s=0;s<2;s++){
      this.send(s,'CAL 0');this.send(s,'PULSE 0');this.send(s,'ANIM 0');
      if(phase==='game'&&state.rings?.[s]){
        this.command(s,'SET '+state.rings[s].map(c=>({blue:'B',orange:'O',green:'G',red:'R',yellow:'Y'})[c]).join(''));
        this.command(s,'ANIM '+targetMask(state.mode,state.rings[s]));
      }else this.send(s,`IDLE ${phase.startsWith('result-')?(phase==='result-2'?'W':Number(phase.slice(-1))===s?'G':'R'):['lobby','technician'].includes(phase)?(s?'O':'B'):'X'}`);
    }
    if(phase==='technician'&&tech.calibration){const c=tech.calibration;this.send(c.stand,`CAL ${Math.floor(c.step/2)+1} ${c.step%2+1}`)}
  }
}
module.exports={Technician,Lighting};
