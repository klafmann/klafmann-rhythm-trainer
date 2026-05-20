const tapBtn=document.getElementById('tapBtn');
const startBtn=document.getElementById('startBtn');
const stopBtn=document.getElementById('stopBtn');
const judge=document.getElementById('judge');
const accuracy=document.getElementById('accuracy');
const comboEl=document.getElementById('combo');
const perfectEl=document.getElementById('perfect');
const goodEl=document.getElementById('good');
const earlyEl=document.getElementById('early');
const lateEl=document.getElementById('late');
const tempo=document.getElementById('tempo');
const notation=document.getElementById('notation');
const patternLabel=document.getElementById('patternLabel');

const QUARTER_NOTE_URL='https://upload.wikimedia.org/wikipedia/commons/f/fb/Music-quarternote.svg';
const QUARTER_REST_URL='https://upload.wikimedia.org/wikipedia/commons/0/03/QuarterRest.svg';

let audioCtx=null;
let running=false;
let interval=null;
let beat=0;
let bpm=84;
let beatMs=60000/bpm;
let lastBeatTime=0;
let combo=0;
let patternIndex=0;
let stats={perfect:0,good:0,early:0,late:0};

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

function clickSound(strong=false){
  if(!audioCtx) return;
  const now=audioCtx.currentTime;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type='square';
  osc.frequency.setValueAtTime(strong ? 1760 : 1100, now);
  gain.gain.setValueAtTime(strong ? 0.55 : 0.38, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

function renderNotation(){
  const p=patterns[patternIndex];
  patternLabel.textContent=p.name;

  const xs=[210,385,560,735];
  let symbols='';

  p.beats.forEach((type,i)=>{
    const x=xs[i];
    if(type==='q') symbols += quarterNoteImage(x,45);
    if(type==='h') symbols += halfNoteImage(x,45);
    if(type==='r') symbols += quarterRestImage(x,54);
  });

  notation.innerHTML=`
  <svg viewBox="0 0 900 210" role="img" aria-label="${p.name}">
    <rect x="0" y="0" width="900" height="210" fill="#f4eedf"/>
    ${timeSignature(60,52)}
    ${measureGuide()}
    ${symbols}
  </svg>`;
}

function timeSignature(x,y){
  return `
  <g transform="translate(${x},${y})">
    <text x="0" y="0" font-family="Georgia, serif" font-size="82" font-weight="700" fill="#111">4</text>
    <text x="0" y="78" font-family="Georgia, serif" font-size="82" font-weight="700" fill="#111">4</text>
  </g>`;
}

function measureGuide(){
  return `
  <line x1="145" y1="42" x2="145" y2="168" stroke="#111" stroke-width="3"/>
  <line x1="835" y1="42" x2="835" y2="168" stroke="#111" stroke-width="3"/>
  <line x1="842" y1="42" x2="842" y2="168" stroke="#111" stroke-width="6"/>`;
}

function quarterNoteImage(x,y){
  return `<image href="${QUARTER_NOTE_URL}" x="${x-50}" y="${y-34}" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`;
}

function halfNoteImage(x,y){
  // keep local half-note drawing for now; the critical rest glyph uses Wikimedia image.
  return `
  <g transform="translate(${x},${y})">
    <ellipse cx="0" cy="61" rx="18" ry="13" transform="rotate(-18 0 61)" fill="#f4eedf" stroke="#111" stroke-width="5"/>
    <line x1="16" y1="56" x2="16" y2="-35" stroke="#111" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function quarterRestImage(x,y){
  // Direct Wikimedia quarter-rest SVG, scaled up from the original 12x25 file.
  return `<image href="${QUARTER_REST_URL}" x="${x-34}" y="${y-8}" width="68" height="112" preserveAspectRatio="xMidYMid meet"/>`;
}

function updateAccuracy(){
  const total=stats.perfect+stats.good+stats.early+stats.late;
  const goodTotal=stats.perfect+stats.good;
  accuracy.textContent=total?Math.round(goodTotal/total*100)+'%':'--%';
}

function updateStats(){
  perfectEl.textContent=stats.perfect;
  goodEl.textContent=stats.good;
  earlyEl.textContent=stats.early;
  lateEl.textContent=stats.late;
  updateAccuracy();
  comboEl.textContent='COMBO｜連擊 x'+combo;
}

function setJudge(text,cls=''){
  judge.className='judgement '+cls;
  judge.textContent=text;
}

function setBeatDisplay(){
  for(let i=1;i<=4;i++) document.getElementById('b'+i).classList.remove('active');
  document.getElementById('b'+(beat+1)).classList.add('active');
}

function pulse(){
  setBeatDisplay();
  clickSound(beat===0);
  lastBeatTime=performance.now();

  beat++;
  if(beat>=4){
    beat=0;
    patternIndex=(patternIndex+1)%patterns.length;
    renderNotation();
  }
}

function start(){
  ensureAudio();
  clearInterval(interval);
  running=true;
  beat=0;
  patternIndex=0;
  combo=0;
  stats={perfect:0,good:0,early:0,late:0};
  bpm=parseInt(tempo.value,10);
  beatMs=60000/bpm;
  renderNotation();
  updateStats();
  setJudge('START｜開始');
  pulse();
  interval=setInterval(pulse,beatMs);
}

function stop(){
  running=false;
  clearInterval(interval);
  setJudge('STOPPED｜已停止');
}

function tap(){
  if(!running){
    setJudge('PRESS START｜請先開始','bad');
    return;
  }

  tapBtn.classList.add('flash');
  setTimeout(()=>tapBtn.classList.remove('flash'),80);

  const justPlayedBeat=(beat+3)%4;
  const type=patterns[patternIndex].beats[justPlayedBeat];

  if(type==='r' || type==='hold'){
    stats.late++;
    combo=0;
    setJudge(type==='r'?'REST｜休止':'HOLD｜延長','bad');
    updateStats();
    return;
  }

  const diff=performance.now()-lastBeatTime;
  const altDiff=diff-beatMs;
  const best=Math.abs(diff)<Math.abs(altDiff)?diff:altDiff;
  const abs=Math.abs(best);

  if(abs<=45){
    stats.perfect++;
    combo++;
    setJudge('PERFECT｜完美','perfect');
  }else if(abs<=95){
    stats.good++;
    combo++;
    setJudge('GOOD｜準確','good');
  }else if(best<0){
    stats.early++;
    combo=0;
    setJudge('EARLY｜太早','bad');
  }else{
    stats.late++;
    combo=0;
    setJudge('LATE｜太遲','bad');
  }

  updateStats();
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

renderNotation();
updateStats();
