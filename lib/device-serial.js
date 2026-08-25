const {SerialPort}=require('serialport');
const {ReadlineParser}=require('@serialport/parser-readline');
const {EventEmitter}=require('events');

class DeviceSerial extends EventEmitter{
  constructor(config={},exclude=()=>[]){
    super();this.config=config;this.exclude=exclude;this.queue=[];this.stopped=false;
    this.connecting=false;this.sending=false;this.generation=0;this.retryTimer=null;
  }
  async start(){if(this.config.enabled===false)return;this.stopped=false;await this.connect()}
  async candidates(){
    const ports=await SerialPort.list(),blocked=new Set(this.exclude().filter(Boolean)),usable=ports.filter(p=>!(/bluetooth|BTHENUM/i.test(`${p.manufacturer||''} ${p.friendlyName||''} ${p.pnpId||''}`)));
    if(this.config.port&&this.config.port!=='auto')return usable.filter(p=>p.path.toUpperCase()===String(this.config.port).toUpperCase());
    return usable.filter(p=>!blocked.has(p.path)).sort((a,b)=>Number(/arduino|ch340|usb.serial|cp210|ftdi/i.test(`${b.manufacturer||''} ${b.friendlyName||''}`))-Number(/arduino|ch340|usb.serial|cp210|ftdi/i.test(`${a.manufacturer||''} ${a.friendlyName||''}`)));
  }
  async closePort(port){
    if(!port)return;port.on('error',()=>{});
    if(!port.isOpen)return;
    await new Promise(resolve=>{try{port.close(()=>resolve())}catch{resolve()}});
  }
  async probe(info){
    const port=new SerialPort({path:info.path,baudRate:this.config.baudRate||115200,autoOpen:false});
    let probeError=null;const rememberError=error=>{probeError=error};port.on('error',rememberError);
    try{
      await new Promise((resolve,reject)=>port.open(error=>error?reject(error):resolve()));
      const parser=port.pipe(new ReadlineParser({delimiter:'\n'})),identity=String(this.config.identity||'');
      const found=await new Promise(resolve=>{
        let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timeout);resolve(value)};
        const timeout=setTimeout(()=>finish(false),5200);
        parser.on('data',line=>{if(!identity||String(line).trim().includes(identity))finish(true)});
        const identify=()=>{if(done||probeError)return;port.write('IDENTIFY\n',error=>{if(error)finish(false)})};
        setTimeout(identify,900);setTimeout(identify,2600);setTimeout(identify,4100);
      });
      if(!found)throw probeError||Error(`device ${identity} not found on ${info.path}`);
      port.removeListener('error',rememberError);return{port,parser};
    }catch(error){await this.closePort(port);throw error}
  }
  async connect(){
    if(this.stopped||this.connecting||this.port?.isOpen)return;this.connecting=true;
    try{
      let selected,lastError;for(const info of await this.candidates())try{selected=await this.probe(info);break}catch(error){lastError=error}
      if(!selected)throw lastError||Error('COM device not found');
      const port=selected.port;this.port=port;this.path=port.path;const generation=++this.generation;
      selected.parser.on('data',line=>{if(this.port===port)this.emit('line',String(line).trim())});
      port.on('close',()=>this.lost('COM port closed',port,generation));
      port.on('error',error=>this.lost(error.message||'COM port error',port,generation));
      this.emit('status',{connected:true,path:this.path,identity:this.config.identity});this.flush();
    }catch(error){this.emit('status',{connected:false,error:error.message,identity:this.config.identity});this.retry()}
    finally{this.connecting=false}
  }
  async lost(error,port,generation){
    if(this.stopped||generation!==this.generation||this.port!==port)return;
    this.generation++;this.port=null;this.path=null;this.sending=false;this.queue.length=0;
    this.emit('status',{connected:false,error,identity:this.config.identity});
    await this.closePort(port);this.retry();
  }
  retry(){if(this.retryTimer||this.stopped)return;this.retryTimer=setTimeout(()=>{this.retryTimer=null;this.connect()},this.config.reconnectMs||3000)}
  send(value){
    value=String(value||'').trim();if(!value)return;
    if(/^MODE\s/.test(value))this.queue.length=0;
    this.queue.push(value);if(this.queue.length>100)this.queue.shift();this.flush();
  }
  flush(){
    const port=this.port,generation=this.generation;
    if(this.sending||!port?.isOpen||!this.queue.length)return;
    this.sending=true;const value=this.queue.shift();
    const failed=error=>{if(generation!==this.generation)return;this.sending=false;if(error)this.lost(error.message||'COM write failed',port,generation);else this.flush()};
    try{
      port.write(value+'\n',writeError=>{
        if(writeError)return failed(writeError);if(generation!==this.generation||this.port!==port)return;
        port.drain(drainError=>setTimeout(()=>failed(drainError),this.config.commandIntervalMs||8));
      });
    }catch(error){failed(error)}
  }
  async stop(){
    this.stopped=true;clearTimeout(this.retryTimer);this.retryTimer=null;this.queue.length=0;this.sending=false;
    const port=this.port;this.port=null;this.path=null;this.generation++;await this.closePort(port);
  }
}
module.exports={DeviceSerial};
