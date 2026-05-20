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
const level=document.getElementById('level');
const notation=document.getElementById('notation');

let audioCtx=null;
let running=false;
let interval=null;
let beat=0;
let bpm=84;
let beatMs=60000/bpm;
let lastBeatTime=0;
let combo=0;
let stats={perfect:0,good:0,early:0,late:0};

const patterns={
  1:[{s:'♩',tap:true},{s:'♩',tap:true},{s:'♩',tap:true},{s:'♩',tap:true}],
  2:[{s:'♩',tap:true},{s:'♩',tap:true},{s:'𝅗𝅥',tap:true},{s:'♩',tap:true}],
  3:[{s:'♪',tap:true},{s:'♪',tap:true},{s:'♩',tap:true},{s:'♪',tap:true},{s:'♪',tap:true}],
  4:[{s:'♩',tap:true},{s:'REST',tap:false},{s:'♩',tap:true},{s:'♩',tap:true}]
};

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

  osc.type='sine';
  osc.frequency.setValueAtTime(strong ? 1600 : 950, now);
  gain.gain.setValueAtTime(strong ? 0.32 : 0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

function updateNotation(){
  notation.innerHTML='';
  patterns[level.value].forEach(item=>{
    const span=document.createElement('span');
    span.className=item.tap ? 'note' : 'note rest';
    span.textContent=item.s;
    notation.appendChild(span);
  });
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
  beat=(beat+1)%4;
}

function start(){
  ensureAudio();
  clearInterval(interval);
  running=true;
  beat=0;
  combo=0;
  stats={perfect:0,good:0,early:0,late:0};
  bpm=parseInt(tempo.value,10);
  beatMs=60000/bpm;
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

  const currentBeat=(beat+3)%4;
  const pattern=patterns[level.value];
  const current=pattern[currentBeat % pattern.length];

  if(current && !current.tap){
    stats.late++;
    combo=0;
    setJudge('REST!｜休止','bad');
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
level.addEventListener('change',updateNotation);

document.addEventListener('keydown',e=>{
  if(e.code==='Space'){
    e.preventDefault();
    tap();
  }
});

updateNotation();
