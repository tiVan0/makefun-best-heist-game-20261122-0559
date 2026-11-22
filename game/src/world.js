// BRANKAS TENGAH MALAM — world.js
// Simulasi inti: pencuri, satpam patroli + vision cone, CCTV berputar,
// laser berkedip, loot, alarm meter, tools berbayar, lockpick brankas,
// dan pelarian (getaway). Semua aturan nyata — tidak ada yang di-script
// untuk screenshot; shots.js hanya mengemudikan autopilot di atas aturan ini.
import {
  ALARM, CAMERA, CAMERA_SPOTS, COVERS, DIFFICULTY, DOORS, GUARD, GUARD_ROUTES,
  LASERS, LOOT_SPOTS, THIEF, THIEF_START, TOOLS, VAULT, WALLS,
} from './config.js';
import { angleLerp, clamp, distance } from './random.js';
import { sfx } from './audio.js';

export const EVENT_NONE = 0;
export const EVENT_CAUGHT = 1;
export const EVENT_WIN = 2;
export const EVENT_PICKUP = 4;
export const EVENT_SPOTTED = 8;

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_CAUGHT = 'caught';
export const PHASE_WIN = 'win';

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return distance(cx, cy, nx, ny) < r;
}

// Apakah garis pandang dari (x1,y1) ke (x2,y2) terhalang dinding/cover?
// Dicek dengan sampling titik di sepanjang garis.
export function lineBlocked(x1, y1, x2, y2) {
  const blockers = WALLS.concat(COVERS);
  const steps = Math.ceil(distance(x1, y1, x2, y2) / 6);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const b of blockers) {
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return true;
    }
  }
  return false;
}

// Apakah (tx,ty) terlihat dari (ox,oy) dalam cone arah `angle`?
export function insideCone(ox, oy, angle, range, halfAngle, tx, ty, visibility = 1) {
  const dx = tx - ox;
  const dy = ty - oy;
  const d = Math.hypot(dx, dy);
  if (d > range * visibility + 26) return false;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return false;
  return !lineBlocked(ox, oy, tx, ty);
}

export function createWorld(seed = 1, difficultyKey = 'normal') {
  const diff = DIFFICULTY[difficultyKey] || DIFFICULTY.normal;
  return {
    seed,
    difficultyKey,
    diff,
    time: 0,
    phase: PHASE_TITLE,
    thief: { x: THIEF_START.x, y: THIEF_START.y, facing: -Math.PI / 2, sneaking: false, moving: false },
    guards: GUARD_ROUTES.map((route) => ({
      id: route.id,
      name: route.name,
      route,
      wpIndex: 0,
      x: route.waypoints[0].x,
      y: route.waypoints[0].y,
      angle: 0,
      alert: 0,
      distractedUntil: 0,
      distractX: 0,
      distractY: 0,
      chasing: false,
    })),
    cameras: CAMERA_SPOTS.map((spot) => ({
      ...spot,
      angle: spot.baseAngle,
      sweepT: 0,
      disabledUntil: 0,
    })),
    lasers: LASERS.map((l) => ({ ...l })),
    loot: LOOT_SPOTS.map((spot) => ({ ...spot, taken: false })),
    vaultLooted: false,
    lockpick: 0,
    lockpicking: false,
    alarm: 0,
    score: 0,
    coins: TOOLS.coinStart,
    emp: TOOLS.empStart,
    smoke: TOOLS.smokeStart,
    empUntil: 0,
    smokeUntil: 0,
    smokeX: 0,
    smokeY: 0,
    thrownCoins: [],
    escapeLeft: 0,
    escapeStarted: false,
    spottedNow: false,
    spottedBy: '',
    message: '',
    messageUntil: 0,
    stats: { spotted: 0, lootTaken: 0, toolsUsed: 0, lasersHit: 0 },
    rngState: seed,
  };
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed, world.difficultyKey);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

function collideCircle(world, x, y, r) {
  // Gerak per sumbu: coba X dulu, lalu Y — pencuri meluncur di sepanjang
  // dinding/cover, bukan tersangkut di sudutnya.
  const solids = WALLS.concat(COVERS);
  let nx = clamp(x, 14 + r, 1266 - r);
  let ny = clamp(y, 86 + r, 786 - r);
  const ox = world.thief.x;
  const oy = world.thief.y;
  let blocked = false;
  for (const s of solids) {
    if (circleHitsRect(nx, oy, r, s)) { blocked = true; break; }
  }
  if (blocked) nx = ox;
  blocked = false;
  for (const s of solids) {
    if (circleHitsRect(nx, ny, r, s)) { blocked = true; break; }
  }
  if (blocked) ny = oy;
  return { x: nx, y: ny };
}

function nearestLoot(world) {
  let best = null;
  let bestD = 46;
  for (const item of world.loot) {
    if (item.taken) continue;
    const d = distance(world.thief.x, world.thief.y, item.x, item.y);
    if (d < bestD) { bestD = d; best = item; }
  }
  return best;
}

function vaultInReach(world) {
  const v = DOORS.vault;
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  return distance(world.thief.x, world.thief.y, cx, cy) < 110;
}

function exitInReach(world) {
  const e = DOORS.exit;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  return distance(world.thief.x, world.thief.y, cx, cy) < 70;
}

function setMessage(world, text, seconds = 2.5) {
  world.message = text;
  world.messageUntil = world.time + seconds;
}

function laserOn(laser, time) {
  const t = (time + laser.phase) % laser.period;
  return t < laser.period * laser.onFraction;
}

function thiefHiddenBySmoke(world) {
  if (world.time > world.smokeUntil) return false;
  return distance(world.thief.x, world.thief.y, world.smokeX, world.smokeY) < 95;
}

// Satu langkah simulasi. `move` = {x,y} ternormalisasi, `sneak` bool,
// `actions` = {interact, emp, smoke, coinTarget|null}. Mengembalikan bit EVENT_*.
export function stepWorld(world, dt, move, sneak, actions = {}) {
  if (world.phase !== PHASE_PLAY) return EVENT_NONE;
  world.time += dt;
  let events = EVENT_NONE;
  const thief = world.thief;

  // --- Tools ---
  if (actions.emp && world.emp > 0 && world.time > world.empUntil) {
    world.emp -= 1;
    world.empUntil = world.time + TOOLS.empDuration;
    world.stats.toolsUsed += 1;
    for (const cam of world.cameras) cam.disabledUntil = world.time + TOOLS.empDuration;
    setMessage(world, 'EMP! Semua CCTV mati 8 detik.');
    sfx.emp();
  }
  if (actions.smoke && world.smoke > 0 && world.time > world.smokeUntil) {
    world.smoke -= 1;
    world.smokeUntil = world.time + TOOLS.smokeDuration;
    world.smokeX = thief.x;
    world.smokeY = thief.y;
    world.stats.toolsUsed += 1;
    setMessage(world, 'Asap! Kamu tak terlihat di dalam awan asap.');
    sfx.smoke();
  }
  if (actions.coinTarget && world.coins > 0) {
    world.coins -= 1;
    world.stats.toolsUsed += 1;
    const target = actions.coinTarget;
    world.thrownCoins.push({ x: target.x, y: target.y, t: world.time, ttl: 1.2 });
    for (const g of world.guards) {
      if (distance(g.x, g.y, target.x, target.y) < TOOLS.coinDistractRadius) {
        g.distractedUntil = world.time + TOOLS.coinDistractSeconds;
        g.distractX = target.x;
        g.distractY = target.y;
      }
    }
    setMessage(world, 'Koin dilempar — satpam menoleh ke bunyinya!');
    sfx.coin();
  }

  // --- Gerak pencuri ---
  const speed = sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
  thief.sneaking = sneak;
  thief.moving = move.x !== 0 || move.y !== 0;
  if (thief.moving) {
    thief.facing = Math.atan2(move.y, move.x);
    const pos = collideCircle(world, thief.x + move.x * speed * dt, thief.y + move.y * speed * dt, THIEF.radius);
    thief.x = pos.x;
    thief.y = pos.y;
  }

  // --- Koin yang dilempar (visual sesaat) ---
  world.thrownCoins = world.thrownCoins.filter((c) => world.time - c.t < c.ttl);

  // --- Satpam patroli / teralihkan / mengejar ---
  for (const g of world.guards) {
    let target = g.route.waypoints[g.wpIndex];
    let speedG = GUARD.patrolSpeed * world.diff.guardSpeed;
    if (world.time < g.distractedUntil) {
      target = { x: g.distractX, y: g.distractY };
      speedG = GUARD.patrolSpeed * 1.5;
    } else if (g.chasing) {
      target = { x: thief.x, y: thief.y };
      speedG = GUARD.chaseSpeed;
    }
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) {
      const step = Math.min(d, speedG * dt);
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
      g.angle = angleLerp(g.angle, Math.atan2(dy, dx), 0.25);
    } else if (world.time >= g.distractedUntil && !g.chasing) {
      g.wpIndex = (g.wpIndex + 1) % g.route.waypoints.length;
    }
  }

  // --- CCTV berputar ---
  for (const cam of world.cameras) {
    if (world.time < cam.disabledUntil) continue;
    cam.sweepT += dt * CAMERA.sweepSpeed;
    cam.angle = cam.baseAngle + Math.sin(cam.sweepT) * CAMERA.sweepArc;
  }

  // --- Deteksi: guard cone, kamera, laser ---
  const visibility = (sneak ? THIEF.sneakVisibility : 1) * (thiefHiddenBySmoke(world) ? 0 : 1);
  let seen = false;
  let seenBy = '';
  let rise = 0;
  if (visibility > 0) {
    for (const g of world.guards) {
      // Indra dekat: satpam merasakan pencuri yang menempel di sisinya,
      // meski di luar cone — menabrak satpam tetap tertangkap, tapi adil:
      // alarm sempat naik dan satpam mulai mengejar dulu.
      const near = distance(g.x, g.y, thief.x, thief.y);
      if (near < 70 && !lineBlocked(g.x, g.y, thief.x, thief.y)) {
        seen = true;
        seenBy = g.name;
        rise = Math.max(rise, ALARM.riseGuard);
        g.chasing = true;
        g.alert = 1;
      } else if (insideCone(g.x, g.y, g.angle, GUARD.coneRange, GUARD.coneHalfAngle, thief.x, thief.y, visibility)) {
        seen = true;
        seenBy = g.name;
        rise = Math.max(rise, ALARM.riseGuard);
        g.chasing = true;
        g.alert = 1;
      } else if (distance(g.x, g.y, thief.x, thief.y) > 320) {
        g.chasing = false;
        g.alert = Math.max(0, g.alert - dt * 0.2);
      }
    }
    for (const cam of world.cameras) {
      if (world.time < cam.disabledUntil) continue;
      if (insideCone(cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, thief.x, thief.y, visibility)) {
        seen = true;
        if (!seenBy) seenBy = cam.label;
        rise = Math.max(rise, ALARM.riseCamera);
      }
    }
    for (const laser of world.lasers) {
      if (!laserOn(laser, world.time)) continue;
      const inBeam = thief.x > laser.x - 4 && thief.x < laser.x + laser.w + 4
        && Math.abs(thief.y - laser.y) < THIEF.radius + 4;
      if (inBeam) {
        seen = true;
        if (!seenBy) seenBy = 'LASER';
        rise = Math.max(rise, ALARM.riseLaser);
        if (world.stats.lasersHit === 0 || world.time - (world.lastLaserHit || 0) > 1.5) {
          world.stats.lasersHit += 1;
          world.lastLaserHit = world.time;
          sfx.laserZap();
        }
      }
    }
  }
  world.spottedNow = seen;
  world.spottedBy = seen ? seenBy : '';
  if (seen) {
    if (!world.wasSeen) {
      world.stats.spotted += 1;
      events |= EVENT_SPOTTED;
      sfx.spotted();
      setMessage(world, `TERLIHAT oleh ${seenBy}! Sembunyi!`, 2);
    }
    world.alarm = Math.min(ALARM.caughtAt, world.alarm + rise * world.diff.alarmScale * dt);
  } else {
    const decay = world.escapeStarted ? ALARM.decayHidden : ALARM.decaySafe;
    world.alarm = Math.max(0, world.alarm - decay * dt);
  }
  world.wasSeen = seen;

  // --- Loot kecil: ambil dengan E ---
  if (actions.interact) {
    const item = nearestLoot(world);
    if (item) {
      item.taken = true;
      world.score += item.value;
      world.stats.lootTaken += 1;
      events |= EVENT_PICKUP;
      setMessage(world, item.kind === 'gold' ? `Emas batangan +$${item.value}` : `Tumpukan uang +$${item.value}`);
      sfx.pickup();
    }
  }

  // --- Brankas utama: tahan E untuk lockpick ---
  if (!world.vaultLooted && vaultInReach(world)) {
    if (actions.interact) {
      world.lockpicking = true;
      world.lockpick += dt;
      if (Math.floor(world.lockpick * 4) !== Math.floor((world.lockpick - dt) * 4)) sfx.vaultClick();
      if (world.lockpick >= VAULT.lockpickSeconds) {
        world.vaultLooted = true;
        world.score += VAULT.vaultValue;
        world.escapeStarted = true;
        world.escapeLeft = VAULT.escapeSeconds;
        events |= EVENT_PICKUP;
        setMessage(world, 'BRANKAS TERBUKA! +$5000 — KABUR ke pintu keluar!', 4);
        sfx.vaultOpen();
      }
    } else {
      world.lockpicking = false;
      world.lockpick = Math.max(0, world.lockpick - dt * 2);
    }
  } else {
    world.lockpicking = false;
    world.lockpick = Math.max(0, world.lockpick - dt * 2);
  }

  // --- Timer pelarian ---
  if (world.escapeStarted && world.phase === PHASE_PLAY) {
    world.escapeLeft -= dt;
    if (world.escapeLeft <= 0) {
      world.phase = PHASE_CAUGHT;
      setMessage(world, 'Terlambat! Polisi sudah mengepung bank.', 5);
      sfx.caught();
      return events | EVENT_CAUGHT;
    }
  }

  // --- Menang: sampai pintu keluar setelah brankas dibuka ---
  if (world.vaultLooted && exitInReach(world)) {
    world.phase = PHASE_WIN;
    sfx.win();
    return events | EVENT_WIN;
  }

  // --- Tertangkap: alarm penuh atau satpam menyentuh ---
  for (const g of world.guards) {
    if (distance(g.x, g.y, thief.x, thief.y) < GUARD.catchRadius) {
      world.phase = PHASE_CAUGHT;
      setMessage(world, `${g.name} menangkapmu!`, 5);
      sfx.caught();
      return events | EVENT_CAUGHT;
    }
  }
  if (world.alarm >= ALARM.caughtAt) {
    world.phase = PHASE_CAUGHT;
    setMessage(world, 'ALARM PENUH! Polisi mengepungmu!', 5);
    sfx.caught();
    return events | EVENT_CAUGHT;
  }

  return events;
}

export function startGame(world) {
  resetWorld(world);
  world.phase = PHASE_PLAY;
  setMessage(world, 'Masuk lewat lobi. Ambil loot, buka brankas, lalu kabur!', 4);
}

export function laserIsOn(laser, time) {
  return laserOn(laser, time);
}
