const tempoEl = document.getElementById("tempo");
const levelEl = document.getElementById("level");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const tapBtn = document.getElementById("tapBtn");
const notation = document.getElementById("notation");
const feedback = document.getElementById("feedback");

const hitsEl = document.getElementById("hits");
const earlyEl = document.getElementById("early");
const lateEl = document.getElementById("late");
const missEl = document.getElementById("miss");
const accuracyEl = document.getElementById("accuracy");

let timer = null;
let beat = 0;
let beatMs = 60000 / 72;
let nextBeatTime = 0;
let running = false;
let stats = { good:0, early:0, late:0, miss:0, total:0 };
let lastTapBeat = -1;

const patterns = {
  1: ["♩", "♩", "♩", "♩"],
  2: ["𝅗𝅥", "♩", "♩", "𝅗𝅥"],
  3: ["♫", "♫", "♩", "♫"],
  4: ["♩", "𝄽", "♩", "𝄽"]
};

function updateNotation(){
  notation.textContent = patterns[levelEl.value].join(" ");
}

function resetStats(){
  stats = { good:0, early:0, late:0, miss:0, total:0 };
  lastTapBeat = -1;
  updateStats();
}

function updateStats(){
  hitsEl.textContent = stats.good;
  earlyEl.textContent = stats.early;
  lateEl.textContent = stats.late;
  missEl.textContent = stats.miss;
  const counted = stats.good + stats.early + stats.late + stats.miss;
  accuracyEl.textContent = counted ? Math.round((stats.good / counted) * 100) + "%" : "--%";
}

function setBeatDisplay(){
  for(let i=1;i<=4;i++){
    document.getElementById("beat"+i).classList.toggle("active", i === beat + 1);
  }
}

function tick(){
  const now = performance.now();

  if (lastTapBeat !== beat && running) {
    const pattern = patterns[levelEl.value];
    const shouldTap = pattern[beat] !== "𝄽";
    const elapsed = now - nextBeatTime;
    if (shouldTap && elapsed > beatMs * 0.45) {
      stats.miss++;
      stats.total++;
      lastTapBeat = beat;
      feedback.innerHTML = `<span class="kr-bad">Miss</span>：今拍無 Tap 到`;
      updateStats();
    }
  }

  if(now >= nextBeatTime){
    beat = (beat + 1) % 4;
    nextBeatTime += beatMs;
    setBeatDisplay();
  }
}

function start(){
  stop();
  beatMs = 60000 / Number(tempoEl.value);
  beat = -1;
  nextBeatTime = performance.now();
  running = true;
  resetStats();
  updateNotation();
  feedback.textContent = "開始：跟住拍子 Tap。";
  timer = setInterval(tick, 20);
}

function stop(){
  if(timer) clearInterval(timer);
  timer = null;
  running = false;
}

function tap(){
  if(!running){
    feedback.textContent = "先按 Start。";
    return;
  }

  const now = performance.now();
  const nearestBeatTime = nextBeatTime - beatMs;
  const diff = now - nearestBeatTime;
  const abs = Math.abs(diff);
  const pattern = patterns[levelEl.value];
  const shouldTap = pattern[beat] !== "𝄽";

  if(!shouldTap){
    stats.late++;
    stats.total++;
    feedback.innerHTML = `<span class="kr-bad">Rest!</span>：呢一下應該停。`;
    updateStats();
    return;
  }

  if(lastTapBeat === beat) return;
  lastTapBeat = beat;

  if(abs <= beatMs * 0.16){
    stats.good++;
    feedback.innerHTML = `<span class="kr-good">Good</span>：${Math.round(diff)}ms`;
  } else if(diff < 0){
    stats.early++;
    feedback.innerHTML = `<span class="kr-warn">Early</span>：早咗 ${Math.abs(Math.round(diff))}ms`;
  } else {
    stats.late++;
    feedback.innerHTML = `<span class="kr-warn">Late</span>：遲咗 ${Math.round(diff)}ms`;
  }
  stats.total++;
  updateStats();
}

startBtn.addEventListener("click", start);
stopBtn.addEventListener("click", stop);
tapBtn.addEventListener("click", tap);
levelEl.addEventListener("change", updateNotation);
document.addEventListener("keydown", e => {
  if(e.code === "Space"){
    e.preventDefault();
    tap();
  }
});
updateNotation();
