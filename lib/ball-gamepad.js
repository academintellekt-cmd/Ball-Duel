(function(root){
  class BallGamepad{
    constructor({onButtons=()=>{},onStatus=()=>{},threshold=.5}={}){this.onButtons=onButtons;this.onStatus=onStatus;this.threshold=threshold;this.previous=new Map();this.statusKey=''}
    poll(pads,settings){
      const connected=Array.from(pads||[]).filter(p=>p&&p.connected!==false),alive=new Set();
      const status=connected.map(p=>({index:p.index,id:p.id,buttonCount:p.buttons.length}));const key=JSON.stringify(status);if(key!==this.statusKey){this.statusKey=key;this.onStatus(status)}
      for(const pad of connected){alive.add(pad.index);const stand=settings.gamepads.indexOf(pad.index),invert=stand>=0&&settings.invertInputs[stand];const pressed=Array.from(pad.buttons).slice(0,128).map(b=>{const raw=!!b.pressed||Number(b.value||0)>=this.threshold;return invert?!raw:raw});const signature=`${pad.id}:${invert}`,old=this.previous.get(pad.index),previous=old?.signature===signature?old.pressed:pressed;const edges=[];pressed.forEach((down,i)=>{if(down&&!previous[i])edges.push(i)});this.previous.set(pad.index,{signature,pressed});if(edges.length)this.onButtons(pad.index,edges)}
      for(const index of this.previous.keys())if(!alive.has(index))this.previous.delete(index);
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={BallGamepad};else root.BallGamepad=BallGamepad;
})(typeof window!=='undefined'?window:globalThis);
