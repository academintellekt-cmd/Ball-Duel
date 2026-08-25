const LIGHTNING_COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const COLOR_CODES = { off: 0, red: 1, blue: 2, green: 3, yellow: 4, purple: 5 };
class ColorGameEngine {
  constructor(random = Math.random) { this.random = random; this.scores = [0, 0]; this.round = 0; }
  shuffledPositions(count) {
    const values = Array.from({ length: 15 }, (_, i) => i + 1);
    for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
    return values.slice(0, count);
  }
  balancedColors(count) {
    const pool = []; for (const color of LIGHTNING_COLORS) pool.push(color, color);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, count);
  }
  startMatch(difficulty = 'easy', player = null) {
    const settings = { easy:{count:5,answerMs:20000}, medium:{count:6,answerMs:20000}, hard:{count:6,answerMs:15000} }[difficulty] || {count:5,answerMs:20000};
    const positions = this.shuffledPositions(settings.count).filter(position=>position!==8);
    while(positions.length<settings.count){const next=this.shuffledPositions(1)[0];if(next!==8&&!positions.includes(next))positions.push(next)}
    const colors = this.balancedColors(settings.count), target=positions.map((position,i)=>({position,color:colors[i]}));
    this.mode='colorMatch';this.targets=this.targets||[[],[]];this.entries=this.entries||[Array(15).fill('off'),Array(15).fill('off')];
    if(player===null){this.target=target;this.targets=[target,target];this.entries=[Array(15).fill('off'),Array(15).fill('off')]}
    else{this.targets[player]=target;this.entries[player]=Array(15).fill('off');this.target=target}
    this.round++;
    return {target,showMs:5000,answerMs:settings.answerMs};
  }
  cycle(player,position) {
    if(this.mode!=='colorMatch'||![0,1].includes(player)||position<1||position>15)return null;
    const order=['off',...LIGHTNING_COLORS],current=this.entries[player][position-1],next=order[(order.indexOf(current)+1)%order.length];
    this.entries[player][position-1]=next; return next;
  }
  evaluateMatch(player = null) {
    const evaluate=p=>{const expected=Array(15).fill('off');for(const item of (this.targets?.[p]||this.target||[]))expected[item.position-1]=item.color;return this.entries[p].every((value,i)=>value===expected[i])};
    if(player!==null){const correct=evaluate(player);if(correct)this.scores[player]++;return{correct,scores:[...this.scores]}}
    const correct=[evaluate(0),evaluate(1)];correct.forEach((ok,p)=>{if(ok)this.scores[p]++});return{correct,scores:[...this.scores]};
  }
  startSequence(difficulty='easy',sequenceRound=0) {
    const settings={easy:{count:4,delayMs:1000,sound:true},medium:{count:6,delayMs:1000,sound:true},hard:{count:8,delayMs:1000,sound:true},veryHard:{count:8,delayMs:Math.max(300,1000-sequenceRound*100),sound:false}}[difficulty]||{count:4,delayMs:1000,sound:true};
    const positions=this.shuffledPositions(15).filter(position=>position!==8).slice(0,settings.count),colors=this.balancedColors(settings.count);
    this.mode='colorSequence';this.sequence=positions.map((position,i)=>({position,color:colors[i]}));this.sequenceProgress=[0,0];this.sequenceInputs=[[],[]];this.round++;
    return {sequence:this.sequence,delayMs:settings.delayMs,sound:settings.sound};
  }
  pressSequence(player,position) {
    if(this.mode!=='colorSequence'||![0,1].includes(player))return{accepted:false};
    const input=this.sequenceInputs[player];input.push(position);this.sequenceProgress[player]=input.length;
    const item=this.sequence[input.length-1];
    if(input.length<this.sequence.length)return{accepted:true,correct:null,complete:false,color:item?.color||null};
    const correct=input.every((value,index)=>value===this.sequence[index].position);
    this.sequenceInputs[player]=[];this.sequenceProgress[player]=0;
    return{accepted:true,correct,complete:true,color:item?.color||null};
  }
  awardSequence(player){this.scores[player]++;return[...this.scores]}
  colorDigits(values){const a=Array(15).fill('off');for(const item of values||[])a[item.position-1]=item.color;return a.map(c=>COLOR_CODES[c]||0).join('')}
}
if(typeof module!=='undefined')module.exports={ColorGameEngine,LIGHTNING_COLORS,COLOR_CODES};
