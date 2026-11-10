const test=require('node:test');const assert=require('node:assert/strict');const{once}=require('events');
const{DemoGateway}=require('../lib/demo-gateway');
function collect(gw){const seen=[];for(const type of['lobby','scan','start-denied','unlock'])gw.on(type,payload=>seen.push({type,...payload}));return seen}
test('demo taps fill the lobby and refuse a third player',()=>{
  const gw=new DemoGateway();const seen=collect(gw);
  gw.tap('111');gw.tap('222');gw.tap('333');
  const lobbies=seen.filter(x=>x.type==='lobby');
  assert.deepEqual(lobbies.at(-1).players.map(p=>p.uid),['DEMO-111','DEMO-222']);
  assert.equal(lobbies.at(-1).players[0].avatar,'X1');
  assert.equal(lobbies.at(-1).max,2);
  assert.deepEqual(seen.filter(x=>x.type==='scan').at(-1),{type:'scan',state:'denied',reason:'lobby_full'});
});
test('999 and 000 simulate unregistered and offline',()=>{
  const gw=new DemoGateway();const seen=collect(gw);
  gw.tap('999');gw.tap('000');
  assert.deepEqual(seen.filter(x=>x.type==='scan'&&x.state==='denied').map(x=>x.reason),['unregistered','offline']);
});
test('start needs two players, then unlocks both with 300 paid seconds',()=>{
  const gw=new DemoGateway();const seen=collect(gw);
  gw.tap('111');gw.lobbyStart({mode:'classic'});
  assert.deepEqual(seen.filter(x=>x.type==='start-denied').at(-1),{type:'start-denied',reason:'not_enough_players'});
  gw.tap('444');gw.lobbyStart({mode:'classic'});
  const unlock=seen.find(x=>x.type==='unlock');
  assert.deepEqual(unlock.users.map(u=>u.uid),['DEMO-111','DEMO-444']);
  assert.equal(unlock.paid_seconds,300);
  assert.equal(gw.reportResult(10,'completed',{}),true);
  assert.equal(gw.reportResult(10,'completed',{}),false);
  gw.stop();
});
test('remove and reset update the lobby',()=>{
  const gw=new DemoGateway();const seen=collect(gw);
  gw.tap('111');gw.tap('222');gw.lobbyRemove('DEMO-111');
  assert.deepEqual(seen.filter(x=>x.type==='lobby').at(-1).players.map(p=>p.uid),['DEMO-222']);
  gw.lobbyReset();
  assert.deepEqual(seen.filter(x=>x.type==='lobby').at(-1).players,[]);
});
test('start() reports listening and a connected gateway',async()=>{
  const gw=new DemoGateway();const listening=once(gw,'listening');const connected=once(gw,'connection');gw.start();
  await listening;assert.deepEqual((await connected)[0],{connected:true});
  assert.equal(gw.snapshot().connected,true);gw.stop();
});
function collectQueue(gw){const seen=[];for(const type of['lobby','scan','queue','unlock'])gw.on(type,payload=>seen.push({type,...payload}));return seen}
function startSession(gw){gw.tap('111');gw.tap('222');gw.lobbyStart({mode:'classic'})}
test('tap during a session without sign-up -> busy',()=>{
  const gw=new DemoGateway();const seen=collectQueue(gw);startSession(gw);
  const before=seen.length;gw.tap('333');
  assert.deepEqual(seen.slice(before),[{type:'scan',state:'denied',reason:'busy'}]);
  gw.stop();
});
test('sign-up, session end, reserved: outsider denied, queued guest opens the lobby',()=>{
  const gw=new DemoGateway();const seen=collectQueue(gw);startSession(gw);
  gw.queueOpen();assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'collecting');
  gw.tap('111');assert.deepEqual(seen.filter(x=>x.type==='scan').at(-1),{type:'scan',state:'denied',reason:'busy'});
  gw.tap('999');assert.deepEqual(seen.filter(x=>x.type==='scan').at(-1),{type:'scan',state:'denied',reason:'unregistered'});
  gw.tap('000');assert.deepEqual(seen.filter(x=>x.type==='scan').at(-1),{type:'scan',state:'denied',reason:'offline'});
  gw.tap('333');gw.tap('333');
  let q=seen.filter(x=>x.type==='queue').at(-1);assert.equal(q.state,'collecting');assert.deepEqual(q.players.map(p=>p.uid),['DEMO-333']);assert.equal(typeof q.expires_at,'number');
  gw.queueDone();q=seen.filter(x=>x.type==='queue').at(-1);assert.equal(q.state,'waiting');assert.equal(q.expires_at,null);
  gw.tap('444');assert.deepEqual(seen.filter(x=>x.type==='scan').at(-1),{type:'scan',state:'denied',reason:'busy'});
  assert.equal(gw.reportResult(10,'completed',{}),true);
  q=seen.filter(x=>x.type==='queue').at(-1);assert.equal(q.state,'reserved');assert.equal(typeof q.expires_at,'number');
  gw.tap('555');assert.deepEqual(seen.filter(x=>x.type==='scan').at(-1),{type:'scan',state:'denied',reason:'reserved'});
  gw.tap('333');
  assert.deepEqual(seen.filter(x=>x.type==='lobby').at(-1).players.map(p=>p.uid),['DEMO-333']);
  q=seen.filter(x=>x.type==='queue').at(-1);assert.equal(q.state,'none');assert.deepEqual(q.players,[]);
  gw.stop();
});
test('a confirmed guest is not refused as reserved on a re-tap',()=>{
  const gw=new DemoGateway();const seen=collectQueue(gw);startSession(gw);
  gw.queueOpen();gw.tap('333');gw.tap('444');
  assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'waiting');
  gw.reportResult(10,'completed',{});gw.tap('333');
  const q=seen.filter(x=>x.type==='queue').at(-1);assert.equal(q.state,'reserved');assert.deepEqual(q.players.map(p=>p.uid),['DEMO-444']);
  gw.lobbyRemove('DEMO-333');gw.tap('333');
  assert.deepEqual(seen.filter(x=>x.type==='lobby').at(-1).players.map(p=>p.uid),['DEMO-333']);
  gw.stop();
});
test('reserved expires -> queue none',async()=>{
  const gw=new DemoGateway({queueConfirmMs:20});const seen=collectQueue(gw);startSession(gw);
  gw.queueOpen();gw.tap('333');gw.queueDone();gw.reportResult(10,'completed',{});
  assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'reserved');
  await new Promise(r=>setTimeout(r,80));
  assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'none');
  gw.tap('555');assert.equal(seen.filter(x=>x.type==='lobby').at(-1).players[0].uid,'DEMO-555');
  gw.stop();
});
test('collecting idles out; cancel clears the queue',async()=>{
  const gw=new DemoGateway({queueCollectIdleMs:20});const seen=collectQueue(gw);startSession(gw);
  gw.queueOpen();gw.tap('333');await new Promise(r=>setTimeout(r,80));
  assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'waiting');
  gw.queueCancel();assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'none');
  gw.stop();
});
test('preview reset clears the queue on the control screen too',()=>{
  const gw=new DemoGateway();const seen=collectQueue(gw);startSession(gw);
  gw.queueOpen();gw.tap('333');assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'collecting');
  gw.resetPreview();assert.equal(seen.filter(x=>x.type==='queue').at(-1).state,'none');
  const before=seen.length;gw.resetPreview();assert.equal(seen.slice(before).filter(x=>x.type==='queue').length,0,'no repeat when already empty');
  gw.stop();
});
test('start() announces the queue like the real Gateway (state none)',{timeout:2000},async()=>{
  const gw=new DemoGateway();const queued=once(gw,'queue');gw.start();
  assert.deepEqual((await queued)[0],{state:'none',players:[],max:2,expires_at:null});gw.stop();
});
