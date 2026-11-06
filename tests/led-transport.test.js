const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('events');
const{DeviceSerial}=require('../lib/device-serial');
function fixture(){const device=new DeviceSerial({enabled:false,acknowledge:true,commandIntervalMs:1}),writes=[],port=new EventEmitter();port.isOpen=true;port.path='COM99';port.write=(value,cb)=>{writes.push(value);cb()};port.close=cb=>{port.isOpen=false;cb()};device.port=port;return{device,writes}}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('LED transport waits for the matching ACK before sending the next command',async()=>{const{device,writes}=fixture();try{device.send('SET BBBBB');device.send('FLASH 1 G 2');assert.deepEqual(writes,['SET BBBBB\n']);device.acknowledge('ACK FLASH');await pause(5);assert.equal(writes.length,1);device.acknowledge('ACK SET');await pause(5);assert.deepEqual(writes,['SET BBBBB\n','FLASH 1 G 2\n']);device.acknowledge('ACK FLASH')}finally{await device.stop()}});
test('a command lost during a long WS2812 update is retried, and stop cancels retries',async()=>{const{device,writes}=fixture();device.send('CAL 3');await pause(410);assert.deepEqual(writes,['CAL 3\n','CAL 3\n']);await device.stop();await pause(430);assert.equal(writes.length,2);assert.equal(device.pending,null)});
test('both stands accept the shared firmware while older side identities stay distinct',()=>{
  const config=require('../config.json');const blue=new DeviceSerial(config.ledBlue),orange=new DeviceSerial(config.ledOrange);
  for(const device of[blue,orange]){assert(device.matchesIdentity('BALL_DUEL_LED READY'));assert(!device.matchesIdentity('NOT_BALL_DUEL_LED READY'));assert(!device.matchesIdentity('BALL_DUEL_LED_WRONG READY'))}
  assert(blue.matchesIdentity('BALL_DUEL_LED_BLUE READY'));assert(!blue.matchesIdentity('BALL_DUEL_LED_ORANGE READY'));assert(orange.matchesIdentity('BALL_DUEL_LED_ORANGE READY'));assert(!orange.matchesIdentity('BALL_DUEL_LED_BLUE READY'));
});
test('automatic and explicit COM selection exclude the other stand and its reserved port',async()=>{
  const{SerialPort}=require('serialport'),list=SerialPort.list;SerialPort.list=async()=>[{path:'COM7'},{path:'COM8'},{path:'COM9'}];
  try{const auto=new DeviceSerial({port:'auto'},()=>['com7','COM8']);assert.deepEqual((await auto.candidates()).map(p=>p.path),['COM9']);const manual=new DeviceSerial({port:'COM7'},()=>['com7']);assert.deepEqual(await manual.candidates(),[])}finally{SerialPort.list=list}
});
test('a calibration step requires its specific LED acknowledgement',async()=>{const{device,writes}=fixture();try{device.send('CAL 1 1');device.send('CAL 1 2');device.acknowledge('ACK CAL 0');device.acknowledge('ACK CAL 1 2');await pause(5);assert.deepEqual(writes,['CAL 1 1\n']);device.acknowledge('ACK CAL 1 1');await pause(5);assert.deepEqual(writes,['CAL 1 1\n','CAL 1 2\n']);device.acknowledge('ACK CAL 1 2')}finally{await device.stop()}});
