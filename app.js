const tapBtn=document.getElementById('tapBtn');
const startBtn=document.getElementById('startBtn');
const stopBtn=document.getElementById('stopBtn');
const judge=document.getElementById('judge');
const accuracyEl=document.getElementById('accuracy');
const comboEl=document.getElementById('combo');
const scoreEl=document.getElementById('score');
const beatNo=document.getElementById('beatNo');
const measureNo=document.getElementById('measureNo');
const tempo=document.getElementById('tempo');
const notation=document.getElementById('notation');
const stageTitle=document.getElementById('stageTitle');
const cyclePill=document.getElementById('cyclePill');

let audioCtx=null;
let timer=null;
let bpm=84;
let beatMs=60000/bpm;
let patternIndex=0;
let beatIndex=0;
let phase='idle'; // demo, user, answer
let userTapTimes=[];
let expectedTimes=[];
let userStartTime=0;
let combo=0;
let score=0;
let attempts=0;
let goodAttempts=0;

const patterns=[
  {name:'Pattern 1｜節奏 1', beats:['q','q','q','q']},
  {name:'Pattern 2｜節奏 2', beats:['q','q','h','hold']},
  {name:'Pattern 3｜節奏 3', beats:['q','r','r','q']},
  {name:'Pattern 4｜節奏 4', beats:['q','r','q','r']}
];

function ensureAudio(){
  if(!audioCtx){
    const AC=window.AudioContext||window.webkitAudioContext;
    audioCtx=new AC();
  }
  if(audioCtx.state==='suspended') audioCtx.resume();
}

function tone(freq=1000,dur=0.07,gainValue=0.28,type='square'){
  if(!audioCtx) return;
  const now=audioCtx.currentTime;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,now);
  gain.gain.setValueAtTime(gainValue,now);
  gain.gain.exponentialRampToValueAtTime(0.001,now+dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now+dur);
}

function metronome(strong=false){ tone(strong?1700:1050,0.06,strong?0.36:0.24,'square'); }
function noteClick(){ tone(760,0.09,0.34,'triangle'); }
function answerClick(){ tone(520,0.11,0.32,'sine'); }
function badClick(){ tone(180,0.14,0.28,'sawtooth'); }

function currentPattern(){return patterns[patternIndex];}

function renderNotation(active=-1){
  const p=currentPattern();
  const xs=[230,405,580,755];
  let symbols='';
  p.beats.forEach((type,i)=>{
    const cls=i===active?'current-symbol':'';
    if(type==='q') symbols+=quarterNote(xs[i],84,cls);
    if(type==='h') symbols+=halfNote(xs[i],84,cls);
    if(type==='r') symbols+=quarterRest(xs[i],66,cls);
  });

  notation.innerHTML=`
  <svg viewBox="0 0 960 250" role="img" aria-label="${p.name}">
    <rect x="0" y="0" width="960" height="250" fill="#fffdfa"/>
    ${timeSignature(45,58)}
    ${barLine(145,45,190,2)}
    ${barLine(330,45,190,1)}
    ${barLine(505,45,190,1)}
    ${barLine(680,45,190,1)}
    ${barLine(875,45,190,2)}
    ${barLine(888,45,190,5)}
    ${symbols}
    <text x="230" y="220" text-anchor="middle" font-size="28" font-weight="800" fill="#bd8f34">1</text>
    <text x="405" y="220" text-anchor="middle" font-size="28" font-weight="800" fill="#bd8f34">2</text>
    <text x="580" y="220" text-anchor="middle" font-size="28" font-weight="800" fill="#bd8f34">3</text>
    <text x="755" y="220" text-anchor="middle" font-size="28" font-weight="800" fill="#bd8f34">4</text>
  </svg>`;
}

function timeSignature(x,y){
  return `
  <g transform="translate(${x},${y})">
    <text x="0" y="0" font-family="Georgia, serif" font-size="78" font-weight="700" fill="#111">4</text>
    <text x="0" y="72" font-family="Georgia, serif" font-size="78" font-weight="700" fill="#111">4</text>
  </g>`;
}

function barLine(x,y,h,w){
  return `<line x1="${x}" y1="${y}" x2="${x}" y2="${h}" stroke="#111" stroke-width="${w}"/>`;
}

function quarterNote(x,y,cls=''){
  return `
  <g class="${cls}">
    <ellipse cx="${x}" cy="${y+42}" rx="20" ry="14" transform="rotate(-18 ${x} ${y+42})" fill="#111"/>
    <line x1="${x+18}" y1="${y+37}" x2="${x+18}" y2="${y-58}" stroke="#111" stroke-width="5.2" stroke-linecap="round"/>
  </g>`;
}

function halfNote(x,y,cls=''){
  return `
  <g class="${cls}">
    <ellipse cx="${x}" cy="${y+42}" rx="20" ry="14" transform="rotate(-18 ${x} ${y+42})" fill="#fffdfa" stroke="#111" stroke-width="5"/>
    <line x1="${x+18}" y1="${y+37}" x2="${x+18}" y2="${y-58}" stroke="#111" stroke-width="5.2" stroke-linecap="round"/>
  </g>`;
}

function quarterRest(x,y,cls=''){
  // Adjusted by hand to match a standard quarter rest silhouette and relative size.
  return `
  <g class="${cls}" transform="translate(${x-12},${y}) scale(1.05)">
    <path d="M 20 0
             C 38 20, 36 32, 18 46
             C 38 58, 42 76, 20 92
             C 8 101, 6 115, 20 130"
          fill="none" stroke="#111" stroke-width="9"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function updateTop(){
  comboEl.textContent=combo;
  scoreEl.textContent=score;
  measureNo.textContent=patternIndex+1;
  beatNo.textContent=phase==='idle'?'-':beatIndex+1;
  accuracyEl.textContent=attempts?Math.round((goodAttempts/attempts)*100)+'%':'0%';
}

function setJudge(text,cls=''){
  judge.className='judge-main '+cls;
  judge.textContent=text;
}

function clearTimer(){
  if(timer) clearTimeout(timer);
  timer=null;
}

function start(){
  ensureAudio();
  clearTimer();
  bpm=parseInt(tempo.value,10);
  beatMs=60000/bpm;
  patternIndex=0;
  combo=0;
  score=0;
  attempts=0;
  goodAttempts=0;
  setJudge('-');
  startQuestion();
}

function stop(){
  clearTimer();
  phase='idle';
  tapBtn.classList.add('disabled');
  stageTitle.textContent='STOPPED｜已停止';
  cyclePill.textContent='按 START 重新開始｜Press START to restart';
  beatNo.textContent='-';
}

function startQuestion(){
  phase='demo';
  beatIndex=0;
  userTapTimes=[];
  expectedTimes=[];
  tapBtn.classList.add('disabled');
  stageTitle.innerHTML='<b>題目示範</b>｜Listen to the question';
  cyclePill.textContent='系統會響一次題目｜The system plays the question once';
  renderNotation(-1);
  updateTop();
  timer=setTimeout(playDemoBeat,500);
}

function playDemoBeat(){
  const p=currentPattern();
  renderNotation(beatIndex);
  updateTop();
  metronome(beatIndex===0);
  const type=p.beats[beatIndex];
  if(type==='q'||type==='h') noteClick();

  beatIndex++;
  if(beatIndex<4){
    timer=setTimeout(playDemoBeat,beatMs);
  }else{
    timer=setTimeout(startUserTurn,beatMs);
  }
}

function startUserTurn(){
  phase='user';
  beatIndex=0;
  userTapTimes=[];
  expectedTimes=[];
  userStartTime=performance.now()+500;
  tapBtn.classList.remove('disabled');
  stageTitle.innerHTML='<b>輪到你</b>｜Your turn';
  cyclePill.textContent='跟返剛才節奏拍一次｜Tap the rhythm once';
  setJudge('-');
  renderNotation(-1);
  updateTop();
  timer=setTimeout(userBeatTick,500);
}

function userBeatTick(){
  renderNotation(beatIndex);
  updateTop();
  metronome(beatIndex===0);
  const type=currentPattern().beats[beatIndex];
  if(type==='q'||type==='h') expectedTimes.push(performance.now());

  beatIndex++;
  if(beatIndex<4){
    timer=setTimeout(userBeatTick,beatMs);
  }else{
    timer=setTimeout(evaluateUserTurn,beatMs*0.85);
  }
}

function tap(){
  if(phase!=='user'){
    badClick();
    setJudge('WAIT｜請等候','miss');
    return;
  }
  tapBtn.classList.add('flash');
  setTimeout(()=>tapBtn.classList.remove('flash'),70);
  userTapTimes.push(performance.now());
  noteClick();
}

function evaluateUserTurn(){
  tapBtn.classList.add('disabled');
  attempts++;

  const result=scoreAttempt(expectedTimes,userTapTimes);
  if(result.grade==='perfect'){
    combo++;
    score+=100;
    goodAttempts++;
    setJudge('PERFECT｜完美','perfect');
  }else if(result.grade==='good'){
    combo++;
    score+=70;
    goodAttempts++;
    setJudge('GOOD｜良好','good');
  }else if(result.grade==='early'){
    combo=0;
    score+=20;
    setJudge('EARLY｜稍早','early');
  }else if(result.grade==='late'){
    combo=0;
    score+=20;
    setJudge('LATE｜稍遲','late');
  }else{
    combo=0;
    badClick();
    setJudge('MISS｜錯誤','miss');
  }

  updateTop();
  timer=setTimeout(startAnswer,900);
}

function scoreAttempt(expected,actual){
  if(actual.length!==expected.length){
    return {grade:'miss'};
  }
  let diffs=expected.map((t,i)=>actual[i]-t);
  let avg=diffs.reduce((a,b)=>a+b,0)/diffs.length;
  let maxAbs=Math.max(...diffs.map(x=>Math.abs(x)));

  if(maxAbs<=55) return {grade:'perfect'};
  if(maxAbs<=110) return {grade:'good'};
  if(avg<-60) return {grade:'early'};
  if(avg>60) return {grade:'late'};
  return {grade:'miss'};
}

function startAnswer(){
  phase='answer';
  beatIndex=0;
  stageTitle.innerHTML='<b>系統答案</b>｜Correct answer';
  cyclePill.textContent='系統拍一次正確答案｜The system plays the answer once';
  renderNotation(-1);
  updateTop();
  timer=setTimeout(playAnswerBeat,400);
}

function playAnswerBeat(){
  const p=currentPattern();
  renderNotation(beatIndex);
  updateTop();
  metronome(beatIndex===0);
  const type=p.beats[beatIndex];
  if(type==='q'||type==='h') answerClick();

  beatIndex++;
  if(beatIndex<4){
    timer=setTimeout(playAnswerBeat,beatMs);
  }else{
    patternIndex=(patternIndex+1)%patterns.length;
    timer=setTimeout(startQuestion,beatMs);
  }
}

tapBtn.addEventListener('click',tap);
startBtn.addEventListener('click',start);
stopBtn.addEventListener('click',stop);
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){
    e.preventDefault();
    tap();
  }
});
document.addEventListener('click',()=>ensureAudio(),{once:true});

tapBtn.classList.add('disabled');
renderNotation();
updateTop();
