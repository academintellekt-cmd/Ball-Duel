const clamp01=v=>v<0?0:v>1?1:v;
class LightningAudio {
  constructor(config={}) {
    this.config=config;this.enabled=config.enabled!==false;this.music={};this.effects={};this.playlists={};this.randomBags={};this.current=null;this.fadeToken=0;this.duckToken=0;
    if(!this.enabled)return;
    this.setupPlaylist('menu',config.menuPlaylist,config.menu,true);
    this.setupPlaylist('game',config.gamePlaylist,config.game,true);
    if(config.end){const end=new Audio(config.end);end.loop=false;end.volume=0;end.preload='auto';end.addEventListener('ended',()=>{if(this.current==='end')this.crossfade('menu')});this.music.end=end}
    for(const key of ['button','bonus','bonusX2','bonusGreen','pingPongHit','pingPongMiss','countdown','startCountdown'])if(config[key]){const audio=new Audio(config[key]);audio.volume=config.effectsVolume??.85;audio.preload='auto';this.effects[key]=audio}
  }
  setupPlaylist(name,files,fallback,loopFallback=true){
    const playlist=Array.isArray(files)?files.filter(Boolean):[],source=playlist[0]||fallback,previous=this.music[name];
    if(previous){previous.pause();try{previous.currentTime=0}catch{}}
    if(!source){delete this.music[name];this.playlists[name]={files:[],index:0};return}
    const audio=new Audio(source);audio.loop=!playlist.length&&loopFallback;audio.volume=0;audio.preload='auto';
    this.playlists[name]={files:playlist,index:0};
    audio.addEventListener('ended',()=>this.nextTrack(name));
    audio.addEventListener('error',()=>{if(this.playlists[name]?.files.length>1)setTimeout(()=>this.nextTrack(name),250)});
    this.music[name]=audio;
  }
  nextTrack(name){
    const audio=this.music[name],state=this.playlists[name];if(!audio||!state?.files.length)return;
    state.index=(state.index+1)%state.files.length;audio.src=state.files[state.index];audio.load();
    if(this.current===name){audio.volume=this.musicTarget(name);this.safePlay(audio,name)}
  }
  safePlay(audio,name,retries=3){if(!audio)return;audio.play().catch(error=>{console.warn(`[audio] ${name} play failed:`,error?.message||error);if(retries>0&&this.current===name)setTimeout(()=>this.safePlay(audio,name,retries-1),350)})}
  selectGame(mode){
    const specific=this.config.gamePlaylists?.[mode],playlist=Array.isArray(specific)&&specific.length?specific:(this.config.gamePlaylist||[]);
    this.setupPlaylist('game',playlist,this.config.game,true);
  }
  stopExcept(name){for(const[key,audio]of Object.entries(this.music)){if(key===name)continue;audio.pause();audio.volume=0;try{audio.currentTime=0}catch{}}}
  playGame(mode){this.selectGame(mode);this.crossfade('game');const expected=this.fadeToken;setTimeout(()=>{if(this.fadeToken===expected&&this.current==='game')this.stopExcept('game')},(this.config.fadeMs??1200)+150)}
  playEndThenMenu(){clearTimeout(this.endFallback);this.crossfade('end');this.endFallback=setTimeout(()=>{if(this.current==='end')this.crossfade('menu')},6000)}
  musicTarget(name){return name==='game'&&this.gameDucked?(this.config.sequenceMusicVolume??.08):(this.config.musicVolume??.35)}
  setGameDuck(active,duration=450){
    this.gameDucked=!!active;const game=this.music.game;if(!game||this.current!=='game')return;
    const token=++this.duckToken,from=game.volume,target=this.musicTarget('game'),started=performance.now();
    const step=now=>{if(token!==this.duckToken||this.current!=='game')return;const p=Math.min(1,(now-started)/Math.max(1,duration));game.volume=clamp01(from+(target-from)*p);if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step);
  }
  effect(name){const base=this.effects[name];if(!base)return;const audio=base.cloneNode();audio.volume=this.config.effectsVolume??.85;audio.play().catch(()=>{})}
  randomEffect(files,key='random'){
    const sources=Array.isArray(files)?files.filter(Boolean):[];if(!sources.length)return;
    let bag=this.randomBags[key];if(!Array.isArray(bag)||!bag.length){bag=[...sources];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}this.randomBags[key]=bag}
    const audio=new Audio(bag.pop());audio.volume=this.config.effectsVolume??.85;audio.preload='auto';audio.play().catch(()=>{})
  }
  color(color){const file=this.config.colors?.[color];if(!file)return;const audio=new Audio(file);audio.volume=this.config.effectsVolume??.85;audio.play().catch(()=>{})}
  pauseMusic(){
    if(!this.enabled)return;
    clearInterval(this.fadeTimer);this.fadeTimer=null;this.fadeToken++;this.duckToken++;
    const name=this.current,audio=this.music[name];if(!audio)return;
    this.stopExcept(name);audio.pause();this.pausedName=name;
  }
  resumeMusic(){
    if(!this.enabled||!this.pausedName)return;
    const name=this.pausedName;this.pausedName=null;
    if(this.current!==name)return;
    const audio=this.music[name];if(!audio)return;
    audio.volume=this.musicTarget(name);this.safePlay(audio,name);
  }
  crossfade(name,duration=this.config.fadeMs??1200){
    if(!this.enabled)return;
    clearInterval(this.fadeTimer);
    const token=++this.fadeToken;this.duckToken++;
    const previousName=this.current,to=this.music[name],target=this.musicTarget(name),toStart=to?.volume??0;
    const fading=Object.entries(this.music).filter(([key,audio])=>key!==name&&!audio.paused).map(([key,audio])=>({key,audio,volume:audio.volume}));
    this.current=name;
    if(to){if(previousName!==name||to.ended){try{to.currentTime=0}catch{}}this.safePlay(to,name);}
    const started=Date.now(),step=()=>{
      if(token!==this.fadeToken)return;
      const p=Math.min(1,(Date.now()-started)/Math.max(1,duration));
      for(const item of fading)item.audio.volume=clamp01(item.volume*(1-p));
      if(to)to.volume=clamp01(toStart+(target-toStart)*p);
      if(p<1)return;
      clearInterval(this.fadeTimer);this.fadeTimer=null;
      for(const item of fading){item.audio.pause();try{item.audio.currentTime=0}catch{}}
      for(const [key,audio] of Object.entries(this.music))if(key!==name&&!audio.paused){audio.pause();try{audio.currentTime=0}catch{}}
      if(to){to.volume=target;if(to.paused)this.safePlay(to,name)}this.stopExcept(name)
    };
    step();this.fadeTimer=setInterval(step,40);
  }
}
if(typeof module!=='undefined'&&module.exports)module.exports={LightningAudio};
