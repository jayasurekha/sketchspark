/* ============================================================
   SketchSpark – app.js
   Drawing Challenges | Canvas Engine | Gallery | Timer
   ============================================================ */

'use strict';

// ─────────────────────────────────────────
//  CHALLENGE DATA
// ─────────────────────────────────────────
const CHALLENGES = [
  {
    id: 1, emoji: '🦋', title: 'Magical Butterfly',
    desc: 'Draw a butterfly with the most colorful wings you can imagine. Add patterns, swirls, and sparkles!',
    difficulty: 'easy', time: 180,
    colors: ['#ff6fb4', '#a855f7'],
    prompt: '🦋 Draw: A magical colorful butterfly'
  },
  {
    id: 2, emoji: '🏔️', title: 'Fantasy Mountain',
    desc: 'Create a mountain range at sunset with glowing peaks, clouds, and a hidden moon.',
    difficulty: 'medium', time: 300,
    colors: ['#38bdf8', '#6c63ff'],
    prompt: '🏔️ Draw: A fantasy mountain at sunset'
  },
  {
    id: 3, emoji: '🐉', title: 'Friendly Dragon',
    desc: 'Draw a cute dragon sitting on a pile of colorful gems. Make it fun, not scary!',
    difficulty: 'hard', time: 600,
    colors: ['#4ade80', '#22d3ee'],
    prompt: '🐉 Draw: A friendly dragon with gems'
  },
  {
    id: 4, emoji: '🌊', title: 'Ocean Waves',
    desc: 'Sketch rolling ocean waves with foam, sea creatures peeking out, and a bright sky.',
    difficulty: 'easy', time: 180,
    colors: ['#22d3ee', '#38bdf8'],
    prompt: '🌊 Draw: Ocean waves with sea creatures'
  },
  {
    id: 5, emoji: '🏡', title: 'Dream House',
    desc: 'Design your perfect dream home — floating in clouds, underwater, or deep in a forest.',
    difficulty: 'medium', time: 300,
    colors: ['#facc15', '#fb923c'],
    prompt: '🏡 Draw: Your fantasy dream house'
  },
  {
    id: 6, emoji: '🌸', title: 'Enchanted Garden',
    desc: 'Draw a garden full of oversized flowers, glowing mushrooms, and tiny fairies.',
    difficulty: 'medium', time: 300,
    colors: ['#fb923c', '#f87171'],
    prompt: '🌸 Draw: An enchanted magical garden'
  },
  {
    id: 7, emoji: '🚀', title: 'Space Explorer',
    desc: 'Sketch a spaceship zooming past colorful planets, asteroids, and a rainbow nebula.',
    difficulty: 'hard', time: 600,
    colors: ['#6c63ff', '#a855f7'],
    prompt: '🚀 Draw: A spaceship among the stars'
  },
  {
    id: 8, emoji: '🦄', title: '1-Minute Unicorn',
    desc: 'You have just ONE minute! Draw a unicorn as fast as you can. Speed challenge!',
    difficulty: 'easy', time: 60,
    colors: ['#f87171', '#ff6fb4'],
    prompt: '🦄 SPEED: Draw a unicorn in 1 minute!'
  }
];

const DIFFICULTY_CLASSES = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' };

// ─────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────
const state = {
  currentTool: 'pen',
  currentColor: '#6c63ff',
  brushSize: 5,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  history: [],           // canvas snapshots for undo
  historyMax: 30,
  timerInterval: null,
  timerSeconds: 180,
  timerRunning: false,
  activeChallenge: null,
  streak: parseInt(localStorage.getItem('ss_streak') || '0'),
  gallery: JSON.parse(localStorage.getItem('ss_gallery') || '[]')
};

// ─────────────────────────────────────────
//  DOM REFS
// ─────────────────────────────────────────
const $ = id => document.getElementById(id);

const canvas      = $('drawCanvas');
const ctx         = canvas.getContext('2d');
const activePrompt= $('activePrompt');
const timerDisplay= $('timerDisplay');
const timerBadge  = $('timerDisplay');
const swatchesEl  = $('swatches');
const sizeSlider  = $('sizeSlider');
const sizeVal     = $('sizeVal');
const colorPicker = $('colorPicker');
const galleryGrid = $('galleryGrid');
const galleryEmpty= $('galleryEmpty');
const modal       = $('challengeModal');
const toast       = $('toast');
let toastTimeout;

// ─────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────
const sections = { challenge: $('section-challenge'), canvas: $('section-canvas'), gallery: $('section-gallery') };

function showSection(name) {
  Object.entries(sections).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.section === name);
  });
  if (name === 'gallery') renderGallery();
}

document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => showSection(pill.dataset.section));
});

$('startBtn').addEventListener('click', () => showSection('challenge'));

// ─────────────────────────────────────────
//  CHALLENGE CARDS
// ─────────────────────────────────────────
function renderChallenges() {
  const grid = $('challengeGrid');
  grid.innerHTML = '';

  CHALLENGES.forEach(ch => {
    const card = document.createElement('article');
    card.className = 'challenge-card';
    card.style.setProperty('--card-c1', ch.colors[0]);
    card.style.setProperty('--card-c2', ch.colors[1]);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Challenge: ${ch.title}`);
    card.innerHTML = `
      <span class="card-emoji">${ch.emoji}</span>
      <h3 class="card-title">${ch.title}</h3>
      <p class="card-desc">${ch.desc}</p>
      <div class="card-footer">
        <span class="badge ${DIFFICULTY_CLASSES[ch.difficulty]}">${ch.difficulty}</span>
        <span class="badge badge-time">⏱ ${formatTime(ch.time)}</span>
      </div>
    `;
    card.addEventListener('click', () => openModal(ch));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(ch); });
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────
//  STREAK
// ─────────────────────────────────────────
function renderStreak() {
  const dots = $('streakDots');
  $('streakCount').textContent = `${state.streak} day${state.streak !== 1 ? 's' : ''}`;
  dots.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const dot = document.createElement('div');
    dot.className = 'streak-dot' + (i < state.streak % 8 ? ' filled' : '');
    dots.appendChild(dot);
  }
}

function incrementStreak() {
  const today = new Date().toDateString();
  const last  = localStorage.getItem('ss_last_day');
  if (last !== today) {
    state.streak++;
    localStorage.setItem('ss_streak', state.streak);
    localStorage.setItem('ss_last_day', today);
    renderStreak();
  }
}

// ─────────────────────────────────────────
//  MODAL
// ─────────────────────────────────────────
function openModal(ch) {
  $('modalEmoji').textContent = ch.emoji;
  $('modalTitle').textContent = ch.title;
  $('modalDesc').textContent  = ch.desc;
  $('modalDiff').textContent  = ch.difficulty;
  $('modalDiff').className    = `badge ${DIFFICULTY_CLASSES[ch.difficulty]}`;
  $('modalTime').textContent  = `⏱ ${formatTime(ch.time)}`;
  $('modalTime').className    = 'badge badge-time';
  modal.classList.remove('hidden');
  $('modalAccept').onclick = () => { acceptChallenge(ch); modal.classList.add('hidden'); };
}

$('modalClose').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

function acceptChallenge(ch) {
  state.activeChallenge = ch;
  activePrompt.textContent = ch.prompt;

  // set timer
  const dur = parseInt($('timerDuration').value);
  state.timerSeconds = (dur === 0 || ch.time) ? ch.time : dur;
  $('timerDuration').value = ch.time;
  updateTimerDisplay();
  stopTimer();

  clearCanvas();
  showSection('canvas');
  showToast(`🎯 Challenge accepted: ${ch.title}!`);
}

// ─────────────────────────────────────────
//  CANVAS SETUP
// ─────────────────────────────────────────
function initCanvas() {
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';
  ctx.lineWidth = state.brushSize;
  ctx.strokeStyle = state.currentColor;
  fillCanvasWhite();
  saveHistory();
}

function fillCanvasWhite() {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top)  * scaleY
  };
}

// ─── Drawing events ───
function startDraw(e) {
  e.preventDefault();
  state.isDrawing = true;
  const { x, y } = getPos(e);
  state.lastX = x;
  state.lastY = y;
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function draw(e) {
  e.preventDefault();
  if (!state.isDrawing) return;
  const { x, y } = getPos(e);

  ctx.lineWidth   = state.brushSize;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  if (state.currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = state.brushSize * 2.5;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = state.currentColor;
    if (state.currentTool === 'brush') {
      ctx.lineWidth = state.brushSize * 2;
      ctx.globalAlpha = 0.65;
    } else {
      ctx.globalAlpha = 1;
    }
  }

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);

  state.lastX = x;
  state.lastY = y;
}

function endDraw(e) {
  if (!state.isDrawing) return;
  state.isDrawing = false;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.beginPath();
  saveHistory();
}

canvas.addEventListener('mousedown',  startDraw);
canvas.addEventListener('mousemove',  draw);
canvas.addEventListener('mouseup',    endDraw);
canvas.addEventListener('mouseleave', endDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove',  draw,       { passive: false });
canvas.addEventListener('touchend',   endDraw);

// ─────────────────────────────────────────
//  TOOLS
// ─────────────────────────────────────────
function setTool(tool) {
  state.currentTool = tool;
  [$('toolPen'), $('toolBrush'), $('toolEraser')].forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  const map = { pen: 'toolPen', brush: 'toolBrush', eraser: 'toolEraser' };
  $(map[tool]).classList.add('active');
  $(map[tool]).setAttribute('aria-pressed', 'true');
  canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
}

$('toolPen').addEventListener('click',    () => setTool('pen'));
$('toolBrush').addEventListener('click',  () => setTool('brush'));
$('toolEraser').addEventListener('click', () => setTool('eraser'));

// ─────────────────────────────────────────
//  COLORS
// ─────────────────────────────────────────
const PALETTE = [
  '#2d1b69', '#6c63ff', '#a855f7', '#ff6fb4',
  '#f87171', '#fb923c', '#facc15', '#4ade80',
  '#22d3ee', '#38bdf8', '#ffffff', '#1e1e2e'
];

function renderSwatches() {
  swatchesEl.innerHTML = '';
  PALETTE.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'swatch' + (color === state.currentColor ? ' active' : '');
    btn.style.background = color;
    btn.title = color;
    btn.setAttribute('aria-label', `Color ${color}`);
    if (color === '#ffffff') btn.style.border = '2px solid #ddd';
    btn.addEventListener('click', () => setColor(color));
    swatchesEl.appendChild(btn);
  });
}

function setColor(color) {
  state.currentColor = color;
  colorPicker.value  = color;
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.style.background === color || s.title === color);
  });
  if (state.currentTool === 'eraser') setTool('pen');
}

colorPicker.addEventListener('input', e => setColor(e.target.value));

// ─────────────────────────────────────────
//  SIZE
// ─────────────────────────────────────────
sizeSlider.addEventListener('input', e => {
  state.brushSize = parseInt(e.target.value);
  sizeVal.textContent = state.brushSize;
});

// ─────────────────────────────────────────
//  HISTORY (Undo)
// ─────────────────────────────────────────
function saveHistory() {
  if (state.history.length >= state.historyMax) state.history.shift();
  state.history.push(canvas.toDataURL());
}

function undo() {
  if (state.history.length <= 1) { showToast('Nothing to undo!'); return; }
  state.history.pop();
  const img = new Image();
  img.src = state.history[state.history.length - 1];
  img.onload = () => ctx.drawImage(img, 0, 0);
  showToast('↩ Undone');
}

$('undoBtn').addEventListener('click', undo);

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});

// ─────────────────────────────────────────
//  CLEAR
// ─────────────────────────────────────────
function clearCanvas() {
  fillCanvasWhite();
  state.history = [];
  saveHistory();
  showToast('🗑️ Canvas cleared');
}

$('clearBtn').addEventListener('click', clearCanvas);

// ─────────────────────────────────────────
//  SAVE TO GALLERY
// ─────────────────────────────────────────
$('saveBtn').addEventListener('click', saveDrawing);

function saveDrawing() {
  const dataURL = canvas.toDataURL('image/png');
  const entry = {
    id: Date.now(),
    title: state.activeChallenge ? state.activeChallenge.title : 'Free Drawing',
    emoji: state.activeChallenge ? state.activeChallenge.emoji : '🎨',
    date: new Date().toLocaleDateString(),
    image: dataURL
  };
  state.gallery.unshift(entry);
  if (state.gallery.length > 50) state.gallery.pop();
  localStorage.setItem('ss_gallery', JSON.stringify(state.gallery));
  incrementStreak();
  showToast('💾 Saved to gallery!');

  // Also trigger browser download
  const a = document.createElement('a');
  a.href     = dataURL;
  a.download = `sketchspark-${entry.title.replace(/\s+/g,'-').toLowerCase()}-${entry.id}.png`;
  a.click();
}

// ─────────────────────────────────────────
//  GALLERY RENDER
// ─────────────────────────────────────────
function renderGallery() {
  galleryGrid.innerHTML = '';
  if (state.gallery.length === 0) {
    galleryGrid.appendChild(galleryEmpty);
    return;
  }
  state.gallery.forEach(item => {
    const el = document.createElement('div');
    el.className = 'gallery-item';
    el.innerHTML = `
      <img src="${item.image}" alt="${item.title}" loading="lazy" />
      <div class="gallery-item-footer">
        <span class="gallery-item-title">${item.emoji} ${item.title}</span>
        <span class="gallery-item-date">${item.date}</span>
      </div>
    `;
    galleryGrid.appendChild(el);
  });
}

// ─────────────────────────────────────────
//  TIMER
// ─────────────────────────────────────────
function formatTime(seconds) {
  if (seconds === 0) return '∞';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  const dur = parseInt($('timerDuration').value);
  if (dur === 0) {
    timerDisplay.textContent = '⏱ Free';
    timerBadge.classList.remove('urgent');
    return;
  }
  timerDisplay.textContent = `⏱ ${formatTime(state.timerSeconds)}`;
  timerBadge.classList.toggle('urgent', state.timerSeconds <= 30 && state.timerSeconds > 0);
}

function startTimer() {
  const dur = parseInt($('timerDuration').value);
  if (dur === 0) { showToast('🎨 Free drawing mode — no timer!'); return; }
  if (state.timerRunning) return;

  state.timerRunning = true;
  $('timerStartBtn').textContent = '⏸ Running…';

  state.timerInterval = setInterval(() => {
    if (state.timerSeconds <= 0) {
      stopTimer();
      showToast('⏰ Time\'s up! Save your drawing!');
      timerDisplay.textContent = '⏱ 00:00';
      return;
    }
    state.timerSeconds--;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  $('timerStartBtn').textContent = '▶ Start Timer';
}

function resetTimer() {
  stopTimer();
  const dur = parseInt($('timerDuration').value);
  state.timerSeconds = dur === 0 ? 0 : dur;
  updateTimerDisplay();
}

$('timerStartBtn').addEventListener('click', startTimer);
$('timerResetBtn').addEventListener('click', resetTimer);
$('timerDuration').addEventListener('change', resetTimer);

// ─────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────
function showToast(msg, duration = 2800) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
}

// ─────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────
function init() {
  initCanvas();
  renderChallenges();
  renderStreak();
  renderSwatches();
  updateTimerDisplay();
  setColor('#6c63ff');

  // Show challenge section by default
  showSection('challenge');
}

init();
