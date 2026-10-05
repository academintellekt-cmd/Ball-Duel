// In-process stand-in for the Strivex Gateway (strivex.demoLobby + developmentMode).
// Same events and methods main.js uses on StrivexSession, so the lobby screen can
// be exercised on a laptop: type 111-666 + Enter for demo guests, 999 for an
// unknown bracelet, 000 for a server outage.
const{EventEmitter}=require('events');
const PLAYERS={'111':['Алекс','X1'],'222':['Мира','X2'],'333':['Тимур','X3'],'444':['Соня','X4'],'555':['Лев','X5'],'666':['Ева','X6']};
const STATUSES=new Set(['completed','timeout','abandoned','failed']);
class DemoGateway extends EventEmitter{
  constructor({paidSeconds=300,max=2}={}){super();this.paidSeconds=paidSeconds;this.max=max;this.players=[];this.sessionId=null;this.remainingMs=0;this.timer=null;this.started=false}
  start(){this.started=true;setImmediate(()=>{this.emit('listening',{host:'demo',port:0});this.emit('connection',{connected:true})});return this}
  stop(){this.clearTimer();this.started=false}
  publishLobby(){this.emit('lobby',{players:this.players.map(p=>({...p})),max:this.max})}
  tap(code){
    if(this.sessionId)return;
    this.emit('scan',{state:'checking',reason:null});
    if(code==='000'){this.emit('scan',{state:'denied',reason:'offline'});return}
    const known=PLAYERS[code];
    if(!known){this.emit('scan',{state:'denied',reason:'unregistered'});return}
    const uid=`DEMO-${code}`;
    if(this.players.some(p=>p.uid===uid)){this.publishLobby();return}
    if(this.players.length>=this.max){this.emit('scan',{state:'denied',reason:'lobby_full'});return}
    this.players.push({uid,name:known[0],avatar:known[1]});this.publishLobby();
  }
  lobbyRemove(uid){const before=this.players.length;this.players=this.players.filter(p=>p.uid!==String(uid));if(this.players.length!==before)this.publishLobby();return true}
  lobbyReset(){if(this.sessionId)return true;this.players=[];this.publishLobby();return true}
  lobbyStart(){
    if(this.sessionId){this.emit('start-denied',{reason:'game_in_progress'});return true}
    if(!this.players.length){this.emit('start-denied',{reason:'no_lobby'});return true}
    if(this.players.length!==this.max){this.emit('start-denied',{reason:'not_enough_players'});return true}
    const users=this.players.map(p=>({uid:p.uid,name:p.name,avatar:p.avatar}));this.players=[];
    this.sessionId=`DEMO-${Date.now()}`;this.remainingMs=this.paidSeconds*1000;
    this.emit('unlock',{session_id:this.sessionId,user:users[0],users,paid_seconds:this.paidSeconds});this.startTimer();return true;
  }
  startTimer(){this.clearTimer();this.timer=setInterval(()=>{this.remainingMs=Math.max(0,this.remainingMs-1000);this.emit('tick',this.remainingMs);if(this.remainingMs===0){this.clearTimer();this.emit('expired',{session_id:this.sessionId})}},1000)}
  clearTimer(){if(this.timer){clearInterval(this.timer);this.timer=null}}
  reportResult(_score,status){if(!STATUSES.has(status))throw new Error(`unknown StriveX status: ${status}`);if(!this.sessionId)return false;this.clearTimer();this.sessionId=null;this.remainingMs=0;return true}
  snapshot(){return{transport:'websocket',demo:true,connected:this.started,state:this.sessionId?'running':'idle',sessionId:this.sessionId,remainingMs:this.remainingMs,host:'demo',port:0}}
}
module.exports={DemoGateway};
