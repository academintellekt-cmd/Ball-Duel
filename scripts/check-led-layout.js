const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'arduino','BallDuel_LED_Nano','BallDuel_LED_Nano.ino'),'utf8');
const names=['RINGS','LEDS_PER_RING','LEDS_PER_ADDRESS','CALIBRATION_LEDS_PER_HALF'];
const definitions=names.map(name=>{const match=new RegExp(`^#define ${name} (\\d+)\\s*$`,'m').exec(source);if(!match)throw Error('Missing numeric firmware setting: '+name);return `#define ${name} ${match[1]}`});
const folder=path.join(root,'.tmp','led-layout');fs.mkdirSync(folder,{recursive:true});
const config=path.join(folder,'config.h');fs.writeFileSync(config,definitions.join('\n')+'\n');
let compiler=process.env.AVR_GXX;
if(!compiler&&process.env.LOCALAPPDATA){
  const tools=path.join(process.env.LOCALAPPDATA,'Arduino15','packages','arduino','tools','avr-gcc');
  if(fs.existsSync(tools))compiler=fs.readdirSync(tools).map(version=>path.join(tools,version,'bin','avr-g++.exe')).find(file=>fs.existsSync(file));
}
if(!compiler)throw Error('Install the Arduino AVR board package or set AVR_GXX to avr-g++.');
const result=spawnSync(compiler,['-std=gnu++11','-mmcu=atmega328p','-include',config,'-c',path.join(root,'tests','led-layout.test.cpp'),'-o',path.join(folder,'layout.o')],{encoding:'utf8'});
if(result.error)throw result.error;
if(result.status!==0){process.stderr.write(result.stderr||result.stdout);process.exit(result.status||1)}
const values=Object.fromEntries(definitions.map(line=>line.split(' ').slice(1)).map(([key,value])=>[key,Number(value)]));
const pixels=values.LEDS_PER_RING/values.LEDS_PER_ADDRESS,half=values.CALIBRATION_LEDS_PER_HALF/values.LEDS_PER_ADDRESS;
console.log(`PASS: ${values.LEDS_PER_RING} physical LEDs = ${pixels} addresses per ring; ${pixels*values.RINGS} addresses total; all 10 calibration segments light ${half} addresses / ${values.CALIBRATION_LEDS_PER_HALF} LEDs inside their own ring.`);
