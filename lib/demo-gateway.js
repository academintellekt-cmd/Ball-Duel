// In-process stand-in for the Strivex Gateway (strivex.demoLobby + developmentMode).
// Same events and methods main.js uses on StrivexSession, so the lobby screen can
// be exercised on a laptop: type 111-666 + Enter for demo guests, 999 for an
// unknown bracelet, 000 for a server outage.
const{EventEmitter}=require('events');
const PLAYERS={'111':['Алекс','X1'],'222':['Мира','X2'],'333':['Тимур','X3'],'444':['Соня','X4'],'555':['Лев','X5'],'666':['Ева','X6']};
const STATUSES=new Set(['completed','timeout','abandoned','failed']);
class DemoGateway extends EventEmitter{
  constructor({paidSeconds=300,max=2,queueConfirmMs=60000,queueCollectIdleMs=30000}={}){super();this.paidSeconds=paidSeconds;this.max=max;this.queueConfirmMs=queueConfirmMs;this.queueCollectIdleMs=queueCollectIdleMs;this.qState='none';this.qPlayers=[];this.qConfirmed=new Set();this.qExpires=null;this.qTimer=null;this.sessionUids=[];this.players=[];this.sessionId=null;this.remainingMs=0;this.timer=null;this.started=false;this.staff=null;this.blocked=false}
  start(){this.started=true;setImmediate(()=>{this.emit('listening',{host:'demo',port:0});this.emit('connection',{connected:true})});return this}
  stop(){this.clearTimer();this.queueNone(true);this.started=false}
  resetPreview(){this.clearTimer();this.queueNone(true);this.sessionId=null;this.remainingMs=0;this.players=[];this.publishLobby();return true}
  technicianCommand(action){if(!this.staff)return false;if(action==='close')this.staff=null;else if(action==='block')this.blocked=true;else if(action==='unblock')this.blocked=false;else return false;this.emit('technician',{staff:this.staff,blocked:this.blocked});return true}
  publishLobby(){this.emit('lobby',{players:this.players.map(p=>({...p})),max:this.max})}
  tap(code){
    if(code==='777'){this.staff={employee_id:'DEMO-TECH',name:'Demo Technician',role:'technician'};this.players=[];this.queueNone();this.emit('technician',{staff:this.staff,blocked:this.blocked});return}
    if(this.staff||this.blocked)return;
    if(this.sessionId){this.queueTap(code);return}
    if(this.qState==='reserved'&&!this.qPlayers.some(p=>p.uid===`DEMO-${code}`)&&!this.qConfirmed.has(`DEMO-${code}`)){this.emit('scan',{state:'denied',reason:'reserved'});return}
    this.emit('scan',{state:'checking',reason:null});
    if(code==='000'){this.emit('scan',{state:'denied',reason:'offline'});return}
    const known=PLAYERS[code];
    if(!known){this.emit('scan',{state:'denied',reason:'unregistered'});return}
    const uid=`DEMO-${code}`;
    if(this.players.some(p=>p.uid===uid)){this.publishLobby();return}
    if(this.players.length>=this.max){this.emit('scan',{state:'denied',reason:'lobby_full'});return}
    this.players.push({uid,name:known[0],avatar:known[1]});this.publishLobby();this.queueConfirm(uid);
  }
  // Queue for the next game: imitates gateway/src/queue.js (none -> collecting -> waiting -> reserved -> none).
  publishQueue(){this.emit('queue',{state:this.qState,players:this.qPlayers.map(p=>({...p})),max:this.max,expires_at:this.qExpires})}
  queueArm(ms,onExpire){clearTimeout(this.qTimer);this.qTimer=setTimeout(onExpire,ms);this.qTimer.unref?.();this.qExpires=Date.now()+ms}
  queueDisarm(){clearTimeout(this.qTimer);this.qTimer=null;this.qExpires=null}
  queueSet(state){this.qState=state;this.publishQueue()}
  queueNone(silent){const was=this.qState!=='none';this.queueDisarm();this.qPlayers=[];this.qConfirmed=new Set();this.qState='none';if(was&&!silent)this.publishQueue()}
  queueWaiting(){this.queueDisarm();this.queueSet('waiting')}
  queueArmCollect(){this.queueArm(this.queueCollectIdleMs,()=>{if(this.qState!=='collecting')return;if(this.qPlayers.length)this.queueWaiting();else this.queueNone()})}
  queueOpen(){if(this.qState!=='none'||!this.sessionId||this.staff||this.blocked)return true;this.qPlayers=[];this.queueArmCollect();this.queueSet('collecting');return true}
  queueDone(){if(this.qState==='collecting'&&this.qPlayers.length)this.queueWaiting();return true}
  queueCancel(){this.queueNone();return true}
  queueTap(code){
    if(this.qState!=='collecting'){this.emit('scan',{state:'denied',reason:'busy'});return}
    const uid=`DEMO-${code}`;
    if(this.sessionUids.includes(uid)){this.emit('scan',{state:'denied',reason:'busy'});return}
    this.emit('scan',{state:'checking',reason:null});
    if(code==='000'){this.emit('scan',{state:'denied',reason:'offline'});return}
    const known=PLAYERS[code];
    if(!known){this.emit('scan',{state:'denied',reason:'unregistered'});return}
    if(this.qPlayers.some(p=>p.uid===uid)){this.queueArmCollect();this.publishQueue();return}
    this.qPlayers.push({uid,name:known[0],avatar:known[1]});
    if(this.qPlayers.length>=this.max){this.queueWaiting();return}
    this.queueArmCollect();this.publishQueue();
  }
  queueSessionEnded(){
    if(this.qState==='waiting'||(this.qState==='collecting'&&this.qPlayers.length)){this.queueArm(this.queueConfirmMs,()=>{if(this.qState==='reserved')this.queueNone()});this.queueSet('reserved');return}
    if(this.qState==='collecting')this.queueNone();
  }
  queueConfirm(uid){
    if(this.qState!=='reserved'||!this.qPlayers.some(p=>p.uid===uid))return;
    this.qPlayers=this.qPlayers.filter(p=>p.uid!==uid);this.qConfirmed.add(uid);
    if(!this.qPlayers.length){this.queueNone();return}
    this.publishQueue();
  }
  lobbyRemove(uid){const before=this.players.length;this.players=this.players.filter(p=>p.uid!==String(uid));if(this.players.length!==before)this.publishLobby();return true}
  lobbyReset(){if(this.sessionId)return true;this.players=[];this.publishLobby();return true}
  // Lobby profile window: answers like the real gateway, with records the demo saw this run.
  rememberRecords(meta){this.records=this.records||{};for(const r of Array.isArray(meta?.records)?meta.records:[]){const list=this.records[r.ic]||(this.records[r.ic]=[]);const old=list.find(x=>x.mode_id===r.mode_id&&x.level_id===r.level_id);if(!old)list.push({mode_id:r.mode_id,level_id:r.level_id,best_score:r.score,updated_at:new Date().toISOString()});else if(r.score>old.best_score){old.best_score=r.score;old.updated_at=new Date().toISOString()}}}
  requestProfile(uid){setImmediate(()=>{const code=String(uid).replace(/^DEMO-/,''),known=PLAYERS[code];if(!known){this.emit('profile',{uid:String(uid),profile:null,error:'not_found'});return}const n=Number(code[0])||1;this.emit('profile',{uid:String(uid),profile:{uid:String(uid),username:known[0],avatar:(this.avatars||{})[String(uid)]||null,level:n,total_xp:n*130,xp_in_level:(n*130)%(100*n+200),needed_xp:100*n+200,time_started:!!this.sessionId,remaining_seconds:this.sessionId?Math.ceil(this.remainingMs/1000):this.paidSeconds,records:(this.records||{})[String(uid)]||[],recent:[]},error:null})});return true}
  saveAvatar(uid,avatar){this.avatars=this.avatars||{};this.avatars[String(uid)]=avatar;setImmediate(()=>this.emit('avatar-saved',{uid:String(uid),avatar,error:null}));return true}
  lobbyStart(){
    if(this.staff||this.blocked){this.emit('start-denied',{reason:'blocked'});return true}
    if(this.sessionId){this.emit('start-denied',{reason:'game_in_progress'});return true}
    if(!this.players.length){this.emit('start-denied',{reason:'no_lobby'});return true}
    if(this.players.length!==this.max){this.emit('start-denied',{reason:'not_enough_players'});return true}
    const users=this.players.map(p=>({uid:p.uid,name:p.name,avatar:p.avatar}));this.players=[];this.sessionUids=users.map(u=>u.uid);
    this.sessionId=`DEMO-${Date.now()}`;this.remainingMs=this.paidSeconds*1000;
    this.emit('unlock',{session_id:this.sessionId,user:users[0],users,paid_seconds:this.paidSeconds});this.startTimer();return true;
  }
  startTimer(){this.clearTimer();this.timer=setInterval(()=>{this.remainingMs=Math.max(0,this.remainingMs-1000);this.emit('tick',this.remainingMs);if(this.remainingMs===0){this.clearTimer();this.emit('expired',{session_id:this.sessionId})}},1000)}
  clearTimer(){if(this.timer){clearInterval(this.timer);this.timer=null}}
  reportResult(_score,status,meta={}){if(!STATUSES.has(status))throw new Error(`unknown StriveX status: ${status}`);if(!this.sessionId)return false;this.rememberRecords(meta);this.clearTimer();this.sessionId=null;this.sessionUids=[];this.remainingMs=0;this.queueSessionEnded();return true}
  snapshot(){return{transport:'websocket',demo:true,connected:this.started,state:this.sessionId?'running':'idle',sessionId:this.sessionId,remainingMs:this.remainingMs,host:'demo',port:0}}
}
module.exports={DemoGateway};
