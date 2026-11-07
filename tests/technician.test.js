const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const{Technician,Lighting}=require('../lib/technician');
const{BallGamepad}=require('../lib/ball-gamepad');
const staff={role:'technician',name:'Техник'};
test('either sensor triggers the whole target, simultaneous paired sensors count once',()=>{
  const t=new Technician(),hits=[];t.on('hit',(...x)=>hits.push(x));t.rawButtons(0,[0]);t.rawButtons(0,[1]);t.rawButtons(1,[8,9]);assert.deepEqual(hits,[[0,0],[0,0],[1,4]]);
  t.gateway({staff});t.rawButtons(0,[0,1]);assert.deepEqual(t.counters[0].slice(0,2),[1,1]);assert.equal(hits.length,3);
  t.gateway({staff:null,blocked:true});t.rawButtons(1,[0]);assert.equal(hits.length,3);
});

function startSetup(stand=0){const t=new Technician(),commands=[];new Lighting((...x)=>commands.push(x),t);t.gateway({staff});t.ledStatus(stand,{connected:true});t.command({type:'calibrate',stand});return{t,commands}}
function confirmStep(t){const c=t.calibration;t.confirmCalibration(c.stand,Math.floor(c.step/2),c.step%2)}
test('ten illuminated halves bind their sensors and commit the whole stand atomically',()=>{
  const{t,commands}=startSetup(0),before=JSON.parse(JSON.stringify(t.settings));
  const mapping=[15,16,8,9,6,7,4,5,2,3];t.settings.channels[0]=[4,3,2,1,0];
  for(let step=0;step<10;step++){
    assert.equal(t.calibration.step,step);assert(commands.some(x=>x[0]===0&&x[1]===`CAL ${Math.floor(step/2)+1} ${step%2+1}`));
    t.rawButtons(1,[mapping[step]]);assert.equal(t.calibration.step,step,'ignore hits until the LED ACK');
    confirmStep(t);t.rawButtons(1,[mapping[step]]);
    if(step<9)assert.deepEqual(t.settings.buttons,before.buttons,'partial calibration never alters saved inputs');
  }
  assert.equal(t.calibration,null);assert.deepEqual(t.settings.buttons[0],mapping);assert.deepEqual(t.settings.channels[0],[0,1,2,3,4]);assert.deepEqual(t.settings.gamepads,[1,0]);assert.deepEqual(t.settings.buttons[1],before.buttons[1]);assert(commands.some(x=>x[0]===0&&x[1]==='CHASE 5'));
});
test('setup rejects a reused sensor, multiple sensors and a second gamepad',()=>{
  const{t}=startSetup();confirmStep(t);t.rawButtons(0,[0,1]);assert.equal(t.calibration.step,0);assert.equal(t.error,'ONE_SENSOR_AT_A_TIME');
  t.rawButtons(0,[0]);confirmStep(t);t.rawButtons(0,[0]);assert.equal(t.error,'SENSOR_USED');assert.equal(t.calibration.step,1);
  t.rawButtons(1,[7]);assert.equal(t.error,'WRONG_GAMEPAD');assert.equal(t.calibration.step,1);t.rawButtons(0,[1]);assert.equal(t.calibration.step,2);
});
test('cancellation, closing and a disconnected Arduino cannot corrupt saved calibration',()=>{
  const{t}=startSetup(),saved=JSON.parse(JSON.stringify(t.settings));confirmStep(t);t.rawButtons(0,[23]);t.command({type:'cancel'});assert.deepEqual(t.settings,saved);
  t.command({type:'calibrate',stand:0});confirmStep(t);t.ledStatus(0,{connected:false});t.rawButtons(0,[22]);assert.equal(t.calibration.step,0);assert.equal(t.calibration.ready,false);
  t.gateway({staff:null});assert.equal(t.calibration,null);assert.deepEqual(t.settings,saved);assert.throws(()=>t.command({type:'calibrate',stand:0}));
});
test('LED ACK must name the current ring and half before setup accepts a hit',()=>{
  const{t}=startSetup(1);t.confirmCalibration(0,0,0);t.confirmCalibration(1,0,1);assert.equal(t.calibration.ready,false);confirmStep(t);t.rawButtons(1,[4]);assert.equal(t.calibration.step,1);t.confirmCalibration(1,0,0);assert.equal(t.calibration.ready,false);
});
test('a technician sensor hit increments only its counter and animates its whole mapped ring',()=>{
  const t=new Technician(),commands=[];new Lighting((...x)=>commands.push(x),t);t.settings.channels[1]=[4,3,2,1,0];t.gateway({staff});commands.length=0;t.rawButtons(1,[6]);assert.equal(t.counters[1][6],1);assert.equal(t.counters[1][7],0);assert.deepEqual(commands,[[1,'CHASE 2']]);
});
test('ports, button mappings and inversion persist independently for both stands',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ball-tech-')),file=path.join(dir,'settings.json');try{const t=new Technician({file});t.gateway({staff});t.command({type:'port',stand:0,port:'com7'});t.command({type:'port',stand:1,port:'COM8'});assert.throws(()=>t.command({type:'port',stand:1,port:'COM7'}));t.command({type:'invert',stand:1,value:true});const loaded=new Technician({file});assert.deepEqual(loaded.settings,t.settings)}finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('holding/reconnecting/inversion changes do not create extra button edges',()=>{
  const events=[],g=new BallGamepad({onButtons:(...x)=>events.push(x)}),s={gamepads:[0,1],invertInputs:[false,true]};const pad=(index,down=[])=>({index,id:'pad'+index,buttons:Array.from({length:16},(_,i)=>({pressed:down.includes(i),value:0}))});
  g.poll([pad(0,[0]),pad(1,[...Array(16).keys()])],s);assert.equal(events.length,0);g.poll([pad(0),pad(1,[...Array(16).keys()])],s);g.poll([pad(0,[0,1]),pad(1,[...Array(16).keys()].filter(i=>i!==9))],s);assert.deepEqual(events,[[0,[0,1]],[1,[9]]]);g.poll([pad(0,[0,1])],s);assert.equal(events.length,2);g.poll([],s);g.poll([pad(0,[0,1])],s);assert.equal(events.length,2);s.invertInputs[0]=true;g.poll([pad(0,[0,1])],s);assert.equal(events.length,2);
});
test('result lighting names the owner of each physical stand',()=>{const t=new Technician(),commands=[],l=new Lighting((...x)=>commands.push(x),t);l.update({phase:'results',scores:[3,1]});assert(commands.some(x=>x[0]===0&&x[1]==='IDLE G'));assert(commands.some(x=>x[0]===1&&x[1]==='IDLE R'));t.gateway({staff});commands.length=0;l.command(0,'SET GGGGG');assert.equal(commands.length,0)});
test('entering or resuming a round restores its target colors after leaving idle',()=>{const t=new Technician(),commands=[],l=new Lighting((...x)=>commands.push(x),t);t.settings.channels[0]=[4,3,2,1,0];l.update({phase:'game',rings:[['blue','green','red','yellow','orange'],Array(5).fill('green')],greenBonus:[true,false]});assert.deepEqual(commands.filter(x=>x[0]===0).slice(-2),[[0,'SET OYRGB'],[0,'ANIM 26']]);assert.deepEqual(commands.filter(x=>x[0]===1).slice(-2),[[1,'SET GGGGG'],[1,'ANIM 31']])});
test('shared firmware discovery saves COM assignments for the next launch',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ball-ports-')),file=path.join(dir,'settings.json');
  try{const t=new Technician({file});t.rememberPort(0,'com7');t.rememberPort(1,'COM8');assert.deepEqual(new Technician({file}).settings.ports,['COM7','COM8']);t.rememberPort(0,'COM9');assert.deepEqual(t.settings.ports,['COM7','COM8']);const duplicate=new Technician();duplicate.rememberPort(0,'COM7');assert.throws(()=>duplicate.rememberPort(1,'COM7'));assert.deepEqual(duplicate.settings.ports,['COM7','auto'])}finally{fs.rmSync(dir,{recursive:true,force:true})}
});
