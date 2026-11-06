const{DeviceSerial}=require('../lib/device-serial');
const side=(process.argv[2]||'blue').toLowerCase(),port=process.argv[3]||'auto';
if(!['blue','orange'].includes(side)||!/^(auto|COM[1-9]\d*)$/i.test(port)){console.error('Usage: node scripts/test-led-controller.js blue|orange COM7');process.exit(1)}
const device=new DeviceSerial({enabled:true,port:port.toLowerCase()==='auto'?'auto':port.toUpperCase(),baudRate:115200,identity:'BALL_DUEL_LED',compatibleIdentities:[side==='orange'?'BALL_DUEL_LED_ORANGE':'BALL_DUEL_LED_BLUE'],reconnectMs:3000,acknowledge:true,commandIntervalMs:25});
let started=false;
device.on('status',s=>{console.log(s);if(s.connected&&!started){started=true;device.send('TEST');setTimeout(()=>device.send(`IDLE ${side==='orange'?'O':'B'}`),1800);setTimeout(async()=>{await device.stop();process.exit(0)},3000)}});
device.on('line',console.log);device.start();setTimeout(()=>{console.error('BALL_DUEL_LED not found on '+port);process.exit(1)},15000);
