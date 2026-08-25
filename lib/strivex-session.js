const http=require('http');
const crypto=require('crypto');
const{EventEmitter}=require('events');
const GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const STATUSES=new Set(['completed','timeout','abandoned','failed']);

function frameText(value){
  const payload=Buffer.from(JSON.stringify(value),'utf8'),length=payload.length;
  let header;if(length<126)header=Buffer.from([0x81,length]);else if(length<65536){header=Buffer.alloc(4);header[0]=0x81;header[1]=126;header.writeUInt16BE(length,2)}else{header=Buffer.alloc(10);header[0]=0x81;header[1]=127;header.writeBigUInt64BE(BigInt(length),2)}
  return Buffer.concat([header,payload]);
}

class FrameParser{
  constructor(onFrame){this.buffer=Buffer.alloc(0);this.onFrame=onFrame}
  push(chunk){
    this.buffer=Buffer.concat([this.buffer,chunk]);
    for(;;){
      if(this.buffer.length<2)return;const b0=this.buffer[0],b1=this.buffer[1],opcode=b0&15,masked=!!(b1&128);let length=b1&127,offset=2;
      if(length===126){if(this.buffer.length<4)return;length=this.buffer.readUInt16BE(2);offset=4}else if(length===127){if(this.buffer.length<10)return;length=Number(this.buffer.readBigUInt64BE(2));offset=10}
      let key;if(masked){if(this.buffer.length<offset+4)return;key=this.buffer.subarray(offset,offset+4);offset+=4}if(this.buffer.length<offset+length)return;
      let payload=this.buffer.subarray(offset,offset+length);this.buffer=this.buffer.subarray(offset+length);
      if(masked){const decoded=Buffer.alloc(length);for(let i=0;i<length;i++)decoded[i]=payload[i]^key[i%4];payload=decoded}
      if(opcode===1)this.onFrame('text',payload.toString('utf8'));else if(opcode===8)this.onFrame('close');else if(opcode===9)this.onFrame('ping',payload);
    }
  }
}

class StrivexSession extends EventEmitter{
  constructor({port=4200,host='127.0.0.1',game='lightning',version='0.0.0',protocol=1}={}){super();Object.assign(this,{port,host,game,version,protocol});this.server=null;this.socket=null;this.timer=null;this.sessionId=null;this.user=null;this.remainingMs=0}
  start(){
    if(this.server)return this;this.server=http.createServer();this.server.on('upgrade',(req,socket)=>this.upgrade(req,socket));this.server.on('error',error=>this.emit('error',error));this.server.listen(this.port,this.host,()=>this.emit('listening',{host:this.host,port:this.server.address().port}));return this;
  }
  stop(){this.clearTimer();if(this.socket){try{this.socket.end(Buffer.from([0x88,0]))}catch{}this.socket=null}if(this.server){this.server.close();this.server=null}}
  upgrade(req,socket){
    const key=req.headers['sec-websocket-key'];if(!key){socket.destroy();return}if(this.socket){try{this.socket.destroy()}catch{}}
    const accept=crypto.createHash('sha1').update(key+GUID).digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
    this.socket=socket;const parser=new FrameParser((type,data)=>{if(type==='text')this.receive(data);else if(type==='close')socket.end();else if(type==='ping')socket.write(Buffer.concat([Buffer.from([0x8A,data.length]),data]))});socket.on('data',chunk=>parser.push(chunk));socket.on('close',()=>{if(this.socket===socket){this.socket=null;this.emit('connection',{connected:false})}});socket.on('error',()=>{if(this.socket===socket){this.socket=null;this.emit('connection',{connected:false})}});
    this.emit('connection',{connected:true});this.send({type:'hello',game:this.game,version:this.version,protocol:this.protocol});this.send({type:'ready'});
  }
  receive(raw){let message;try{message=JSON.parse(raw)}catch{this.emit('protocol-error',new Error('invalid JSON from gateway'));return}if(message.type==='unlock')this.unlock(message);else if(message.type==='lock')this.lock(message);else this.emit('protocol-error',new Error(`unknown gateway message: ${message.type}`))}
  unlock(message){if(this.sessionId||!message.session_id)return;this.sessionId=String(message.session_id);this.user=message.user||null;this.remainingMs=Math.max(0,Number(message.paid_seconds)||0)*1000;this.emit('unlock',{session_id:this.sessionId,user:this.user,paid_seconds:Number(message.paid_seconds)||0});this.startTimer()}
  lock(message){if(!this.sessionId)return;this.clearTimer();this.remainingMs=0;this.emit('lock',{reason:String(message.reason||'gateway'),session_id:this.sessionId})}
  startTimer(){this.clearTimer();this.timer=setInterval(()=>{this.remainingMs=Math.max(0,this.remainingMs-1000);this.emit('tick',this.remainingMs);if(this.remainingMs===0){this.clearTimer();this.emit('expired',{session_id:this.sessionId})}},1000)}
  clearTimer(){if(this.timer){clearInterval(this.timer);this.timer=null}}
  reportResult(score,status,meta={}){if(!STATUSES.has(status))throw new Error(`unknown StriveX status: ${status}`);if(!this.sessionId)return false;const sessionId=this.sessionId;this.clearTimer();this.sessionId=null;this.user=null;this.remainingMs=0;this.send({type:'session_result',session_id:sessionId,score:Number.isFinite(Number(score))?Number(score):0,status,meta});this.send({type:'ready'});return true}
  send(value){if(!this.socket||this.socket.destroyed)return false;try{this.socket.write(frameText(value));return true}catch{return false}}
  snapshot(){return{transport:'websocket',connected:!!this.socket&&!this.socket.destroyed,state:this.sessionId?'running':'idle',sessionId:this.sessionId,user:this.user,remainingMs:this.remainingMs,host:this.host,port:this.port}}
}
module.exports={StrivexSession,FrameParser};
