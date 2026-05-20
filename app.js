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

// Level 1 only.
// q = quarter note tap, h = half note tap then hold, r = quarter rest / no tap.
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

  const osc2=audioCtx.createOscillator();
  const gain2=audioCtx.createGain();
  osc2.type='triangle';
  osc2.frequency.setValueAtTime(strong ? 520 : 390, now);
  gain2.gain.setValueAtTime(strong ? 0.18 : 0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(now);
  osc2.stop(now + 0.085);
}

function renderNotation(){
  const p=patterns[patternIndex];
  patternLabel.textContent=p.name;

  const xs=[210,385,560,735];
  let symbols='';

  p.beats.forEach((type,i)=>{
    const x=xs[i];
    if(type==='q') symbols += quarterNote(x,105);
    if(type==='h') symbols += halfNote(x,105);
    if(type==='r') symbols += quarterRest(x,72);
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

function quarterNote(x,y){
  return `
  <g>
    <ellipse cx="${x}" cy="${y}" rx="18" ry="13" transform="rotate(-18 ${x} ${y})" fill="#111"/>
    <line x1="${x+16}" y1="${y-5}" x2="${x+16}" y2="${y-96}" stroke="#111" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function halfNote(x,y){
  return `
  <g>
    <ellipse cx="${x}" cy="${y}" rx="18" ry="13" transform="rotate(-18 ${x} ${y})" fill="#f4eedf" stroke="#111" stroke-width="5"/>
    <line x1="${x+16}" y1="${y-5}" x2="${x+16}" y2="${y-96}" stroke="#111" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function quarterRest(x,y){
  // Quarter rest drawn as SVG path, not a font glyph.
  return `
  <g transform="translate(${x},${y})">
    <path d="M 0 0 C 26 18, 20 36, -2 47 C 23 60, 26 82, 5 101"
      fill="none" stroke="#111" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 2 101 C -11 116, -17 129, -5 145"
      fill="none" stroke="#111" stroke-width="9" stroke-linecap="round"/>
  </g>`;
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
