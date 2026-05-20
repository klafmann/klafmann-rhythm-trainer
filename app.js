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

// Four patterns based on the uploaded reference.
// q = quarter note tap, h = half note tap, r = rest / no tap.
// Each item lasts one beat in this MVP timing engine.
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

  // extra low transient to make phone speakers more audible
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
  const xs=[170,360,550,740];
  let notes='';

  p.beats.forEach((type,i)=>{
    const x=xs[i];
    if(type==='q'){
      notes += noteSVG(x,98,false);
    }else if(type==='h'){
      notes += noteSVG(x,98,true);
    }else if(type==='r'){
      notes += restSVG(x,73);
    }
  });

  notation.innerHTML = `
  <svg viewBox="0 0 900 190" role="img" aria-label="${p.name}">
    <rect x="0" y="0" width="900" height="190" fill="#f4eedf"/>
    <text x="34" y="72" font-family="Georgia, serif" font-size="28" fill="#111">Rhythm</text>
    ${staffSVG()}
    <text x="142" y="85" font-family="Georgia, serif" font-size="56" font-weight="700" fill="#111">4</text>
    <text x="142" y="130" font-family="Georgia, serif" font-size="56" font-weight="700" fill="#111">4</text>
    ${notes}
    <line x1="835" y1="46" x2="835" y2="126" stroke="#111" stroke-width="3"/>
  </svg>`;
}

function staffSVG(){
  let s='';
  for(let i=0;i<5;i++){
    const y=46+i*20;
    s += `<line x1="120" y1="${y}" x2="835" y2="${y}" stroke="#111" stroke-width="1.7"/>`;
  }
  s += `<text x="116" y="122" font-family="Georgia, serif" font-size="86" fill="#111">𝄞</text>`;
  return s;
}

function noteSVG(x,y,hollow){
  const fill=hollow?'#f4eedf':'#111';
  const stroke='#111';
  return `
  <ellipse cx="${x}" cy="${y}" rx="13" ry="9" transform="rotate(-18 ${x} ${y})" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
  <line x1="${x+12}" y1="${y-4}" x2="${x+12}" y2="${y-64}" stroke="#111" stroke-width="3"/>
  <line x1="${x+12}" y1="${y-64}" x2="${x+42}" y2="${y-64}" stroke="#111" stroke-width="3"/>`;
}

function restSVG(x,y){
  // Drawn with normal SVG shapes, no special music font.
  return `
  <path d="M ${x-12} ${y} L ${x+10} ${y} L ${x-4} ${y+22} L ${x+14} ${y+22}" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${x-6}" cy="${y+40}" r="4.5" fill="#111"/>`;
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

function currentBeatType(){
  return patterns[patternIndex].beats[beat];
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
    setJudge(type==='r' ? 'REST｜休止' : 'HOLD｜延長','bad');
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
