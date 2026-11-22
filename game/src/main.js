// BRANKAS TENGAH MALAM — main.js
// Loop game + wiring input ke dunia. Mendukung ?shot=start|play|vault|end
// (&seed=) untuk screenshot deterministik, dan ?selftest=1 untuk uji aturan
// otomatis yang hasilnya ditulis ke #status (dibaca lewat --dump-dom).
import { STEP, VIEW } from './config.js';
import { createInput, consumePresses, isSneaking, moveVector } from './input.js';
import { createWorld, stepWorld, startGame, PHASE_PLAY, PHASE_TITLE } from './world.js';
import { drawWorld, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const difficulty = params.get('diff') || 'normal';
const world = createWorld(seed, difficulty);
const input = createInput(canvas);

let screen = SCREEN_TITLE;
let lastTime = performance.now();
let accumulator = 0;

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function applyShot() {
  const shot = params.get('shot');
  if (!shot) return false;
  const staged = stageShot(shot, world);
  screen = staged.screen;
  return true;
}

// --- Self-test: memainkan aturan lewat API dunia, tanpa input manusia. ---
function runSelfTest() {
  const results = [];
  function check(name, ok) {
    results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  }
  const w = createWorld(7, 'normal');
  startGame(w);
  check('mulai di fase play', w.phase === PHASE_PLAY);
  // Bergerak ke kanan.
  const x0 = w.thief.x;
  stepWorld(w, 1, { x: 1, y: 0 }, false, {});
  check('pencuri bergerak', w.thief.x > x0);
  // Ambil loot: teleport ke samping loot lalu tekan E.
  w.thief.x = w.loot[0].x;
  w.thief.y = w.loot[0].y;
  const score0 = w.score;
  stepWorld(w, STEP, { x: 0, y: 0 }, false, { interact: true });
  check('loot diambil + skor naik', w.loot[0].taken && w.score === score0 + 400);
  // Alarm naik saat terlihat kamera: letakkan pencuri di depan CCTV 1.
  const cam = w.cameras[0];
  w.thief.x = cam.x + Math.cos(cam.angle) * 100;
  w.thief.y = cam.y + Math.sin(cam.angle) * 100;
  const alarm0 = w.alarm;
  for (let i = 0; i < 60; i += 1) stepWorld(w, STEP, { x: 0, y: 0 }, false, {});
  check('alarm naik saat terlihat CCTV', w.alarm > alarm0);
  // Alarm turun saat bersembunyi jauh dari semua pengamat.
  w.thief.x = 100;
  w.thief.y = 730;
  const alarm1 = w.alarm;
  for (let i = 0; i < 120; i += 1) stepWorld(w, STEP, { x: 0, y: 0 }, false, {});
  check('alarm turun saat bersembunyi', w.alarm < alarm1);
  // Tertangkap saat alarm penuh.
  w.alarm = 99.5;
  w.thief.x = cam.x + Math.cos(cam.angle) * 100;
  w.thief.y = cam.y + Math.sin(cam.angle) * 100;
  for (let i = 0; i < 120 && w.phase === PHASE_PLAY; i += 1) stepWorld(w, STEP, { x: 0, y: 0 }, false, {});
  check('tertangkap saat alarm penuh', w.phase === 'caught');
  // Menang: buka brankas lalu sampai pintu keluar.
  const w2 = createWorld(7, 'normal');
  startGame(w2);
  w2.thief.x = 1195;
  w2.thief.y = 445;
  for (let i = 0; i < 400 && !w2.vaultLooted; i += 1) stepWorld(w2, STEP, { x: 0, y: 0 }, false, { interact: true });
  check('brankas terbuka setelah lockpick', w2.vaultLooted && w2.escapeStarted);
  w2.thief.x = 75;
  w2.thief.y = 730;
  stepWorld(w2, STEP, { x: 0, y: 0 }, false, {});
  check('menang saat kabur ke pintu keluar', w2.phase === 'win');
  // EMP mematikan CCTV.
  const w3 = createWorld(7, 'normal');
  startGame(w3);
  stepWorld(w3, STEP, { x: 0, y: 0 }, false, { emp: true });
  check('EMP mengurangi stok & mematikan CCTV', w3.emp === 0 && w3.cameras.every((c) => w3.time < c.disabledUntil));
  // Determinisme: dua dunia seed sama melangkah sama.
  const a = createWorld(3, 'normal');
  const b = createWorld(3, 'normal');
  startGame(a); startGame(b);
  for (let i = 0; i < 300; i += 1) {
    stepWorld(a, STEP, { x: 1, y: 0 }, false, {});
    stepWorld(b, STEP, { x: 1, y: 0 }, false, {});
  }
  check('deterministik seed sama', a.thief.x === b.thief.x && a.alarm === b.alarm);
  const passed = results.filter((r) => r.startsWith('PASS')).length;
  const text = `SELFTEST ${passed}/${results.length} :: ${results.join(' | ')}`;
  document.title = text;
  announce(text);
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = text;
  document.body.appendChild(pre);
}

if (params.get('selftest') === '1') {
  runSelfTest();
  drawWorld(ctx, world, SCREEN_TITLE);
} else if (applyShot()) {
  drawWorld(ctx, world, screen);
  announce(`BRANKAS TENGAH MALAM — shot ${params.get('shot')}, skor ${world.score}, alarm ${Math.round(world.alarm)}%`);
} else {
  // Loop interaktif.
  function frame(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    if (input.startPressed && (world.phase === PHASE_TITLE || world.phase === 'caught' || world.phase === 'win')) {
      sfx.unlockAudio();
      startGame(world);
      screen = SCREEN_PLAY;
    }
    if (input.restartPressed) {
      startGame(world);
      screen = SCREEN_PLAY;
    }
    if (world.phase === PHASE_PLAY) {
      sfx.unlockAudio();
      const coinTarget = input.coinQueued ? { x: input.mouseX, y: input.mouseY } : null;
      const ev = stepWorld(world, dt, moveVector(input), isSneaking(input), {
        interact: input.interactPressed,
        emp: input.empPressed,
        smoke: input.smokePressed,
        coinTarget,
      });
      void ev;
      screen = SCREEN_PLAY;
      if (world.phase === 'caught' || world.phase === 'win') {
        announce(world.phase === 'win'
          ? `Kabur sempurna! Skor $${world.score}.`
          : `Tertangkap! Skor $${world.score}. Tekan R untuk ulang.`);
      }
    }
    consumePresses(input);
    accumulator += dt;
    drawWorld(ctx, world, screen);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
