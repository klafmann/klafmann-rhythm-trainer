window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const tapBtn = $('tapBtn');
  const startBtn = $('startBtn');
  const stopBtn = $('stopBtn');
  const judge = $('judge');
  const accuracyEl = $('accuracy');
  const scoreEl = $('score');
  const beatNo = $('beatNo');
  const questionNo = $('questionNo');
  const phaseText = $('phaseText');
  const tempo = $('tempo');
  const notation = $('notation');
  const stageTitle = $('stageTitle');
  const cyclePill = $('cyclePill');

  const required = [tapBtn,startBtn,stopBtn,judge,accuracyEl,scoreEl,beatNo,questionNo,phaseText,tempo,notation,stageTitle,cyclePill];
  if (required.some(x => !x)) {
    console.error('Klafmann Rhythm Trainer: missing required DOM element');
    return;
  }

  const QUARTER_REST_URL='https://upload.wikimedia.org/wikipedia/commons/0/03/QuarterRest.svg';

  let audioCtx = null;
  let timer = null;
  let running = false;
  let bpm = 84;
  let beatMs = 60000 / bpm;

  let patternIndex = 0;
  let beatIndex = 0;
  let phase = 'idle'; // demo, user, answer
  let userTapTimes = [];
  let expectedTimes = [];
  let score = 0;
  let attempts = 0;
  let goodAttempts = 0;

  const patterns = [
    {name:'Question 1｜題目 1', beats:['q','q','q','q']},
    {name:'Question 2｜題目 2', beats:['q','q','h','hold']},
    {name:'Question 3｜題目 3', beats:['q','r','r','q']},
    {name:'Question 4｜題目 4', beats:['q','r','q','r']}
  ];

  function ensureAudio(){
    try {
      if(!audioCtx){
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
      }
      if(audioCtx.state === 'suspended') audioCtx.resume();
    } catch(e) {
      console.warn('Audio init failed:', e);
    }
  }

  function tone(freq=1000,dur=0.065,gainValue=0.25,type='square'){
    if(!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  function metronome(strong=false){ tone(strong?1700:1040,0.055,strong?0.22:0.13,'square'); }
  function noteClick(){ tone(760,0.085,0.30,'triangle'); }
  function badClick(){ tone(180,0.14,0.28,'sawtooth'); }

  function clap(){
    if(!audioCtx) return;
    const now = audioCtx.currentTime;
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.09);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++){
      data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, now);
    filter.Q.value = 0.9;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.72, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.095);
    tone(900,0.025,0.18,'square');
  }

  function currentPattern(){ return patterns[patternIndex]; }

  function renderNotation(active=-1){
    const p = currentPattern();
    const xs = [230,405,580,755];
    let symbols = '';
    p.beats.forEach((type,i)=>{
      const cls = i === active ? 'current-symbol' : '';
      if(type === 'q') symbols += quarterNote(xs[i],84,cls);
      if(type === 'h') symbols += halfNote(xs[i],84,cls);
      if(type === 'r') symbols += quarterRestImage(xs[i],64,cls);
    });

    notation.innerHTML = `
    <svg viewBox="0 0 960 250" role="img" aria-label="${p.name}">
      <rect x="0" y="0" width="960" height="250" fill="#fffaf1"/>
      ${timeSignature(45,58)}
      ${barLine(145,45,190,2)}
      ${barLine(330,45,190,1)}
      ${barLine(505,45,190,1)}
      ${barLine(680,45,190,1)}
      ${barLine(875,45,190,2)}
      ${barLine(888,45,190,5)}
      ${symbols}
      <text x="230" y="220" text-anchor="middle" font-size="30" font-weight="900" fill="#b5842f">1</text>
      <text x="405" y="220" text-anchor="middle" font-size="30" font-weight="900" fill="#b5842f">2</text>
      <text x="580" y="220" text-anchor="middle" font-size="30" font-weight="900" fill="#b5842f">3</text>
      <text x="755" y="220" text-anchor="middle" font-size="30" font-weight="900" fill="#b5842f">4</text>
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
      <ellipse cx="${x}" cy="${y+42}" rx="20" ry="14" transform="rotate(-18 ${x} ${y+42})" fill="#fffaf1" stroke="#111" stroke-width="5"/>
      <line x1="${x+18}" y1="${y+37}" x2="${x+18}" y2="${y-58}" stroke="#111" stroke-width="5.2" stroke-linecap="round"/>
    </g>`;
  }

  function quarterRestImage(x,y,cls=''){
    return `<image class="${cls}" href="${QUARTER_REST_URL}" x="${x-30}" y="${y-4}" width="60" height="104" preserveAspectRatio="xMidYMid meet"/>`;
  }

  function setJudge(text,cls=''){
    judge.className = 'judge-main ' + cls;
    judge.textContent = text;
  }

  function updateTop(){
    scoreEl.textContent = score;
    questionNo.textContent = patternIndex + 1;
    beatNo.textContent = running ? (beatIndex + 1) : '-';
    phaseText.textContent = phase === 'demo' ? '示範 Demo' : phase === 'user' ? '你拍 Tap' : phase === 'answer' ? '答案 Answer' : 'Ready';
    accuracyEl.textContent = attempts ? Math.round((goodAttempts / attempts) * 100) + '%' : '0%';
  }

  function start(){
    ensureAudio();
    clearTimeout(timer);
    bpm = parseInt(tempo.value, 10) || 84;
    beatMs = 60000 / bpm;
    running = true;
    patternIndex = 0;
    beatIndex = 0;
    phase = 'demo';
    userTapTimes = [];
    expectedTimes = [];
    score = 0;
    attempts = 0;
    goodAttempts = 0;
    tapBtn.classList.add('disabled');
    setJudge('-');
    cyclePill.textContent = '示範 4 拍 → 你拍 4 拍 → 答案 4 拍 → 下一題｜Continuous pulse';
    renderNotation(-1);
    updateTop();
    stageTitle.innerHTML = '<b>題目示範</b>｜Listen';
    timer = setTimeout(tick, 120); // immediate visible response
  }

  function stop(){
    running = false;
    clearTimeout(timer);
    timer = null;
    phase = 'idle';
    beatIndex = 0;
    tapBtn.classList.add('disabled');
    stageTitle.textContent = 'STOPPED｜已停止';
    setJudge('-');
    renderNotation(-1);
    updateTop();
  }

  function tick(){
    if(!running) return;

    updateStageText();
    renderNotation(beatIndex);
    updateTop();

    metronome(beatIndex === 0);
    const type = currentPattern().beats[beatIndex];

    if(phase === 'demo'){
      tapBtn.classList.add('disabled');
      if(type === 'q' || type === 'h') noteClick();
    } else if(phase === 'user'){
      tapBtn.classList.remove('disabled');
      if(type === 'q' || type === 'h') expectedTimes.push(performance.now());
    } else if(phase === 'answer'){
      tapBtn.classList.add('disabled');
      if(type === 'q' || type === 'h') clap();
    }

    beatIndex++;

    if(beatIndex >= 4){
      if(phase === 'user') evaluateUserTurn();
      nextPhase();
    }

    if(running) timer = setTimeout(tick, beatMs);
  }

  function nextPhase(){
    beatIndex = 0;
    if(phase === 'demo'){
      phase = 'user';
      userTapTimes = [];
      expectedTimes = [];
      setJudge('-');
      return;
    }
    if(phase === 'user'){
      phase = 'answer';
      return;
    }
    if(phase === 'answer'){
      patternIndex = (patternIndex + 1) % patterns.length;
      phase = 'demo';
      setJudge('-');
    }
  }

  function updateStageText(){
    if(phase === 'demo') stageTitle.innerHTML = '<b>題目示範</b>｜Listen';
    if(phase === 'user') stageTitle.innerHTML = '<b>輪到你拍</b>｜Your turn';
    if(phase === 'answer') stageTitle.innerHTML = '<b>系統答案</b>｜Correct answer';
  }

  function tap(){
    if(phase !== 'user'){
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
    attempts++;
    const result = scoreAttempt(expectedTimes, userTapTimes);
    if(result.grade === 'perfect'){
      score += 100;
      goodAttempts++;
      setJudge('PERFECT｜完美','perfect');
    }else if(result.grade === 'good'){
      score += 70;
      goodAttempts++;
      setJudge('GOOD｜良好','good');
    }else if(result.grade === 'early'){
      score += 20;
      setJudge('EARLY｜稍早','early');
    }else if(result.grade === 'late'){
      score += 20;
      setJudge('LATE｜稍遲','late');
    }else{
      badClick();
      setJudge('MISS｜錯誤','miss');
    }
  }

  function scoreAttempt(expected, actual){
    if(actual.length !== expected.length) return {grade:'miss'};
    const diffs = expected.map((t,i)=>actual[i]-t);
    const avg = diffs.reduce((a,b)=>a+b,0)/diffs.length;
    const maxAbs = Math.max(...diffs.map(x=>Math.abs(x)));
    if(maxAbs <= 55) return {grade:'perfect'};
    if(maxAbs <= 115) return {grade:'good'};
    if(avg < -60) return {grade:'early'};
    if(avg > 60) return {grade:'late'};
    return {grade:'miss'};
  }

  tapBtn.addEventListener('click', tap);
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);

  document.addEventListener('keydown', e => {
    if(e.code === 'Space'){
      e.preventDefault();
      tap();
    }
  });

  document.addEventListener('click', () => ensureAudio(), {once:true});

  tapBtn.classList.add('disabled');
  renderNotation(-1);
  updateTop();
});
