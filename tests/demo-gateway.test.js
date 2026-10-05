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
