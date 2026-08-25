const {SerialPort}=require('serialport');
class StriveXSerial{
  constructor(config,protocol,log=()=>{}){this.config=config;this.protocol=protocol;this.log=log;this.port=null;this.timer=null;this.stopped=false}
  start(){this.stopped=false;this.connect()}
  connect(){if(this.stopped||this.port?.isOpen)return;const path=this.config.port;if(!path){this.log({event:'connection_error',message:'STRIVEX_SERIAL_PORT is empty'});this.schedule();return}const port=this.port=new SerialPort({path,baudRate:Number(this.config.baudRate)||115200,autoOpen:false});port.on('data',data=>this.protocol.feed(data));port.on('error',error=>this.log({event:'serial_error',message:error.message}));port.on('close',()=>{if(this.port===port)this.port=null;this.protocol.setConnected(false);this.schedule()});port.open(error=>{if(error){this.log({event:'connection_error',message:error.message});if(this.port===port)this.port=null;this.protocol.setConnected(false);this.schedule()}else this.protocol.setConnected(true)})}
  send(line){if(!this.port?.isOpen)return false;this.port.write(`${line}\n`,'utf8',error=>{if(error)this.log({event:'write_error',message:error.message})});return true}
  schedule(){if(this.stopped||this.timer)return;this.timer=setTimeout(()=>{this.timer=null;this.connect()},Number(this.config.reconnectMs)||3000)}
  stop(){this.stopped=true;clearTimeout(this.timer);this.timer=null;if(this.port?.isOpen)this.port.close();this.port=null}
}
module.exports={StriveXSerial};
