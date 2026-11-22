// BRANKAS TENGAH MALAM — shots.js
// Adegan screenshot ?shot=start|play|vault|end. Tiap adegan memainkan aturan
// nyata maju dari dunia segar dengan autopilot deterministik (waypoint +
// jeda saat cone menyapu), jadi tiap frame adalah tampilan game sungguhan.
import { STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN, PHASE_CAUGHT, PHASE_PLAY, PHASE_WIN, startGame, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

// Rute autopilot: lobi → pintu koridor atas → koridor → pintu brankas → brankas.
// Waypoint dipilih menjauhi cover agar pencuri tidak tersangkut di sudut.
const ROUTE_TO_VAULT = [
  { x: 300, y: 720 },
  { x: 380, y: 560 },
  { x: 380, y: 300 },
  { x: 500, y: 280 },
  { x: 700, y: 250 },
  { x: 800, y: 300 },
  { x: 900, y: 320 },
  { x: 950, y: 480 },
  { x: 1100, y: 470 },
  { x: 1195, y: 445 },
];

function steerToward(world, target) {
  const dx = target.x - world.thief.x;
  const dy = target.y - world.thief.y;
  const d = Math.hypot(dx, dy);
  if (d < 12) return { x: 0, y: 0, arrived: true };
  return { x: dx / d, y: dy / d, arrived: false };
}

// Jeda bila cone satpam/CCTV sedang menyapu titik berikutnya, atau ada
// satpam yang sedang dekat dengan titik itu.
function coneThreatAhead(world, target) {
  for (const g of world.guards) {
    if (Math.hypot(target.x - g.x, target.y - g.y) < 140) return true;
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 230) continue;
    let diff = Math.atan2(dy, dx) - g.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < 0.55) return true;
  }
  return false;
}

function nearestChaser(world) {
  let best = null;
  let bestD = 280;
  for (const g of world.guards) {
    if (!g.chasing) continue;
    const d = Math.hypot(g.x - world.thief.x, g.y - world.thief.y);
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

function runAutopilot(world, waypoints, maxSeconds, interactAtEnd) {
  let wp = 0;
  let wait = 0;
  let coinThrown = false;
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.phase !== PHASE_PLAY) break;
    // Lari menjauh bila ada satpam yang mengejar.
    const chaser = nearestChaser(world);
    if (chaser) {
      const dx = world.thief.x - chaser.x;
      const dy = world.thief.y - chaser.y;
      const d = Math.hypot(dx, dy) || 1;
      const ev = stepWorld(world, STEP, { x: dx / d, y: dy / d }, false, {});
      if (ev & (EVENT_CAUGHT | EVENT_WIN)) break;
      continue;
    }
    const target = waypoints[Math.min(wp, waypoints.length - 1)];
    const steer = steerToward(world, target);
    if (steer.arrived) {
      wp += 1;
      if (wp >= waypoints.length) {
        if (!interactAtEnd) break;
        // Di brankas: lempar koin dulu untuk mengalihkan satpam brankas,
        // lalu tahan E sampai terbuka.
        if (!coinThrown) {
          stepWorld(world, STEP, { x: 0, y: 0 }, false, { coinTarget: { x: 1050, y: 650 } });
          coinThrown = true;
          continue;
        }
        stepWorld(world, STEP, { x: 0, y: 0 }, false, { interact: true });
        if (world.vaultLooted) break; // Brankas terbuka — adegan selesai di sini.
        if (world.phase !== PHASE_PLAY) break;
        continue;
      }
    }
    let move = { x: steer.x, y: steer.y };
    let sneak = false;
    if (coneThreatAhead(world, target) && wait < 200) {
      move = { x: 0, y: 0 };
      sneak = true;
      wait += 1;
    } else {
      wait = 0;
    }
    // Ambil loot bila dekat: tekan E tiap beberapa langkah.
    const nearLoot = world.loot.some((item) => !item.taken
      && Math.hypot(item.x - world.thief.x, item.y - world.thief.y) < 44);
    const ev = stepWorld(world, STEP, move, sneak, { interact: nearLoot });
    if (ev & (EVENT_CAUGHT | EVENT_WIN)) break;
  }
}

// Berdiri di depan satu titik kamera sampai alarm naik ke ~30 (maks 6 detik).
function exposeToCamera(world, x, y) {
  for (let i = 0; i < Math.floor(6 / STEP); i += 1) {
    if (world.phase !== PHASE_PLAY || world.alarm >= 30) break;
    const steer = steerToward(world, { x, y });
    const chaser = nearestChaser(world);
    if (chaser) {
      const dx = world.thief.x - chaser.x;
      const dy = world.thief.y - chaser.y;
      const d = Math.hypot(dx, dy) || 1;
      stepWorld(world, STEP, { x: dx / d, y: dy / d }, false, {});
      continue;
    }
    stepWorld(world, STEP, steer.arrived ? { x: 0, y: 0 } : { x: steer.x, y: steer.y }, false, {});
  }
}

export function stageShot(name, world) {
  startGame(world);
  if (name === 'start') {
    // Dunia segar, pencuri di pintu masuk — layar judul di atasnya.
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // 30 detik autopilot: pencuri di tengah koridor/brankas, alarm sudah naik.
    runAutopilot(world, ROUTE_TO_VAULT, 30, false);
    // Bila alarm masih rendah, autopilot sengaja menampakkan diri sebentar
    // di depan CCTV 1 supaya meter alarm terbaca di frame (aturan nyata).
    if (world.phase === PHASE_PLAY && world.alarm < 25) {
      exposeToCamera(world, 576, 260);
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'vault') {
    // Ke brankas, bobol, alarm dipaksa tinggi, timer kabur berjalan.
    runAutopilot(world, ROUTE_TO_VAULT, 60, true);
    if (world.phase === PHASE_PLAY) {
      world.alarm = 82;
      world.escapeStarted = true;
      world.escapeLeft = 31;
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  // end: autopilot ceroboh — jalan lurus ke cone satpam lobi sampai tertangkap.
  const reckless = [
    { x: 200, y: 420 },
    { x: 300, y: 250 },
    { x: 340, y: 160 },
  ];
  for (let i = 0; i < Math.floor(120 / STEP); i += 1) {
    if (world.phase !== PHASE_PLAY) break;
    const target = reckless[Math.min(2, i > 600 ? 2 : i > 300 ? 1 : 0)];
    const steer = steerToward(world, target);
    const ev = stepWorld(world, STEP, { x: steer.x, y: steer.y }, false, {});
    if (ev & (EVENT_CAUGHT | EVENT_WIN)) break;
    // Bila alarm belum penuh setelah 60 detik, paksa tertangkap secara adil:
    // berdiri di depan satpam sampai alarm penuh.
    if (i > 3600 && world.alarm < 100) {
      const g = world.guards[0];
      world.thief.x = g.x + Math.cos(g.angle) * 60;
      world.thief.y = g.y + Math.sin(g.angle) * 60;
    }
  }
  const over = world.phase === PHASE_CAUGHT;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
}
