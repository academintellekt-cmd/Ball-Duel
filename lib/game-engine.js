class GameEngine{
 constructor(config,hooks={}){this.config=config;this.hooks=hooks;this.reset()}
 reset(){this.phase='idle';this.scores=[0,0];this.activeByPlayer=[new Set(),new Set()];this.active=new Set();this.round=0;this.mode=this.config.defaultGameMode||'classic'}
 randomSet(count,random=Math.random,excluded=new Set()){const p=Array.from({length:15},(_,i)=>i+1).filter(x=>!excluded.has(x));for(let i=p.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[p[i],p[j]]=[p[j],p[i]]}return new Set(p.slice(0,count))}
 count(random=Math.random){if(this.mode==='duel')return 1;const a=Math.max(1,this.config.activeButtonsMin),b=Math.min(15,Math.max(a,this.config.activeButtonsMax));return a+Math.floor(random()*(b-a+1))}
 sync(){this.active=new Set([...this.activeByPlayer[0],...this.activeByPlayer[1]]);this.hooks.onLights?.(this.activeByPlayer.map(s=>[...s]))}
 makeRound(random=Math.random){const n=this.count(random);if(this.mode==='independent')this.activeByPlayer=[this.randomSet(n,random),this.randomSet(n,random)];else{const s=this.randomSet(n,random);this.activeByPlayer=[new Set(s),new Set(s)]}this.round++;this.sync();return[...this.activeByPlayer[0]]}
 start(now=Date.now(),mode=this.config.defaultGameMode||'classic'){this.phase='game';this.scores=[0,0];this.round=0;this.startedAt=now;this.mode=mode;return this.makeRound()}
 replacement(player,old,random){const excluded=new Set(this.activeByPlayer[player]);excluded.add(old);const x=[...this.randomSet(1,random,excluded)][0];if(x)this.activeByPlayer[player].add(x)}
 press(player,pos,random=Math.random,multiplier=1){if(this.phase!=='game'||![0,1].includes(player)||!this.activeByPlayer[player].has(pos))return{accepted:false};this.scores[player]+=Math.max(1,multiplier|0);let roundComplete=false;
  if(this.mode==='independent'){this.activeByPlayer[player].delete(pos);this.replacement(player,pos,random)}
  else{this.activeByPlayer[0].delete(pos);this.activeByPlayer[1].delete(pos);if(this.mode==='replacement'||this.mode==='duel'){const excluded=new Set(this.activeByPlayer[0]);excluded.add(pos);const x=[...this.randomSet(1,random,excluded)][0];if(x){this.activeByPlayer[0].add(x);this.activeByPlayer[1].add(x)}}else roundComplete=this.activeByPlayer[0].size===0}
  this.sync();return{accepted:true,roundComplete,scores:[...this.scores]}}
 finish(){this.phase='gameover';this.activeByPlayer=[new Set(),new Set()];this.sync();const winner=this.scores[0]===this.scores[1]?-1:(this.scores[0]>this.scores[1]?0:1);return{scores:[...this.scores],winner,rounds:this.round}}
}
if(typeof module!=='undefined')module.exports={GameEngine};
