const{SerialPort}=require('serialport');
const{ReadlineParser}=require('@serialport/parser-readline');

class SerialBridge{
  constructor(config={},onStatus=()=>{}){
    this.config=config;this.onStatus=onStatus;this.queue=[];this.sending=false;this.generation=0;
  }
  async start(){if(!this.config.enabled)return;this.connect()}
  async find(){
    if(this.config.port&&this.config.port!=='auto')return this.config.port;
    const ports=await SerialPort.list(),match=ports.find(v=>/arduino|ch340|usb.serial|cp210/i.test(`${v.manufacturer||''} ${v.friendlyName||''}`));
    return(match||ports[0])?.path;
  }
  async connect(){
    try{
      const path=await this.find();if(!path)throw Error('COM not found');
      this.port=new SerialPort({path,baudRate:this.config.baudRate||115200,autoOpen:false});
      this.port.on('close',()=>this.retry());this.port.on('error',()=>this.retry());
      this.port.pipe(new ReadlineParser({delimiter:'\n'})).on('data',message=>this.onStatus({connected:true,path,message:message.trim()}));
      await new Promise((resolve,reject)=>this.port.open(error=>error?reject(error):resolve()));
      this.onStatus({connected:true,path});this.send('HELLO');
    }catch(error){this.onStatus({connected:false,error:error.message});this.retry()}
  }
  retry(){if(this.timer)return;this.timer=setTimeout(()=>{this.timer=null;this.connect()},3000)}
  send(command){
    const value=String(command).trim();if(!value)return;
    if(/^MODE (?:IDLE|READY|GAMEOVER|GAME\b)/.test(value)){this.queue.length=0;this.generation++}
    this.queue.push({value,generation:this.generation});this.flush();
  }
  flush(){
    if(this.sending||!this.port?.isOpen||!this.queue.length)return;
    const item=this.queue.shift();
    if(item.generation!==this.generation){this.flush();return}
    this.sending=true;
    this.port.write(`${item.value}\n`,()=>{
      this.port.drain(()=>setTimeout(()=>{this.sending=false;this.flush()},this.config.commandIntervalMs||12));
    });
  }
  stop(){clearTimeout(this.timer);this.queue.length=0;this.generation++;if(this.port?.isOpen)this.port.close()}
}
module.exports={SerialBridge};
