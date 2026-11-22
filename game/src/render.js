// BRANKAS TENGAH MALAM — render.js
// Semua gambar digambar di canvas 2D dari bentuk dan warna (tanpa aset luar).
// Prioritas visual: dalam satu frame harus langsung terbaca — ruangan,
// vision cone satpam, CCTV, loot, dan alarm meter.
import {
  CAMERA, COVERS, DOORS, GUARD, HUD_HEIGHT, PALETTE, THIEF, VAULT, VIEW, WALLS,
} from './config.js';
import { PHASE_CAUGHT, PHASE_PLAY, PHASE_TITLE, PHASE_WIN, laserIsOn } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFloor(ctx) {
  // Tiga ruangan, tiga warna lantai + karpet + label ruangan besar.
  const rooms = [
    { x: 14, w: 416, color: PALETTE.floorLobby, name: 'LOBI', sub: 'masuk • resepsionis' },
    { x: 446, w: 414, color: PALETTE.floorCorridor, name: 'KORIDOR BRANKAS', sub: 'laser • CCTV' },
    { x: 876, w: 390, color: PALETTE.floorVault, name: 'RUANG BRANKAS', sub: 'emas • brankas utama' },
  ];
  for (const room of rooms) {
    ctx.fillStyle = room.color;
    ctx.fillRect(room.x, HUD_HEIGHT + 14, room.w, 800 - HUD_HEIGHT - 28);
  }
  // Pola ubin samar.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 14; x < 1266; x += 52) {
    ctx.beginPath(); ctx.moveTo(x, HUD_HEIGHT + 14); ctx.lineTo(x, 786); ctx.stroke();
  }
  for (let y = HUD_HEIGHT + 14; y < 786; y += 52) {
    ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(1266, y); ctx.stroke();
  }
  // Karpet lobi.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(60, 380, 320, 130);
  ctx.strokeStyle = 'rgba(245,197,66,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 380, 320, 130);
  // Label ruangan.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const room of rooms) {
    ctx.fillStyle = 'rgba(232,238,247,0.85)';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(room.name, room.x + 18, HUD_HEIGHT + 52);
    ctx.fillStyle = 'rgba(159,176,199,0.9)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(room.sub, room.x + 18, HUD_HEIGHT + 74);
  }
  // Garis emas di ruang brankas.
  ctx.strokeStyle = 'rgba(245,197,66,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(890, 100, 362, 672);
}

function drawWallsAndCovers(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
  }
  for (const c of COVERS) {
    ctx.fillStyle = PALETTE.cover;
    roundRect(ctx, c.x, c.y, c.w, c.h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.coverTop;
    roundRect(ctx, c.x + 4, c.y + 4, c.w - 8, 10, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,238,247,0.75)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2 + 4);
  }
}

function drawLasers(ctx, world) {
  for (const laser of world.lasers) {
    const on = laserIsOn(laser, world.time);
    if (on) {
      ctx.strokeStyle = '#ff3355';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff3355';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(laser.x + laser.w, laser.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff8095';
      for (let x = laser.x + 12; x < laser.x + laser.w; x += 36) {
        ctx.beginPath(); ctx.arc(x, laser.y, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffb3c0';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LASER', laser.x + laser.w / 2, laser.y - 8);
    } else {
      ctx.strokeStyle = 'rgba(255,51,85,0.25)';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(laser.x + laser.w, laser.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,179,192,0.8)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LASER MATI — LEWAT!', laser.x + laser.w / 2, laser.y - 8);
    }
  }
}

function drawLoot(ctx, world) {
  for (const item of world.loot) {
    if (item.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 4 + item.x);
    ctx.save();
    ctx.shadowColor = item.kind === 'gold' ? PALETTE.gold : PALETTE.cash;
    ctx.shadowBlur = 16 * pulse;
    if (item.kind === 'gold') {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(item.x - 16, item.y + 10);
      ctx.lineTo(item.x - 10, item.y - 10);
      ctx.lineTo(item.x + 10, item.y - 10);
      ctx.lineTo(item.x + 16, item.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a5c00';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMAS', item.x, item.y + 28);
    } else {
      ctx.fillStyle = PALETTE.cash;
      roundRect(ctx, item.x - 18, item.y - 11, 36, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#0d3b16';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', item.x, item.y + 5);
      ctx.fillStyle = '#c9f5d0';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('UANG', item.x, item.y + 28);
    }
    ctx.restore();
  }
  // Brankas utama.
  const v = DOORS.vault;
  ctx.fillStyle = world.vaultLooted ? '#3d4a5c' : '#5a6b84';
  roundRect(ctx, v.x, v.y, v.w, v.h, 12);
  ctx.fill();
  ctx.strokeStyle = world.vaultLooted ? '#7ddb8a' : PALETTE.gold;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#0d1420';
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = world.vaultLooted ? '#7ddb8a' : PALETTE.gold;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.vaultLooted ? 'TERBUKA!' : 'BRANKAS', v.x + v.w / 2, v.y + 26);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(world.vaultLooted ? 'KOSONG' : '$5000', v.x + v.w / 2, v.y + v.h - 14);
  if (!world.vaultLooted) {
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#e8eef7';
    ctx.fillText('tahan E 3 detik', v.x + v.w / 2, v.y + v.h + 18);
    if (world.lockpicking) {
      const w = 90;
      ctx.fillStyle = '#0d1420';
      ctx.fillRect(v.x + v.w / 2 - w / 2, v.y + v.h - 34, w, 10);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(v.x + v.w / 2 - w / 2, v.y + v.h - 34, w * (world.lockpick / VAULT.lockpickSeconds), 10);
    }
  }
  // Pintu keluar.
  const e = DOORS.exit;
  ctx.fillStyle = world.vaultLooted ? '#1f7a33' : '#2c4a2f';
  roundRect(ctx, e.x, e.y, e.w, e.h, 8);
  ctx.fill();
  ctx.strokeStyle = world.vaultLooted ? '#7ddb8a' : '#5a7a5e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KELUAR', e.x + e.w / 2, e.y + 22);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(world.vaultLooted ? '◀ KABUR!' : 'terkunci', e.x + e.w / 2, e.y + 42);
  ctx.fillStyle = '#7ddb8a';
  ctx.beginPath();
  ctx.moveTo(e.x + e.w / 2 - 12, e.y + 56);
  ctx.lineTo(e.x + e.w / 2 + 12, e.y + 56);
  ctx.lineTo(e.x + e.w / 2, e.y + 76);
  ctx.closePath();
  ctx.fill();
}

function drawGuards(ctx, world) {
  for (const g of world.guards) {
    const hot = g.chasing || world.spottedNow;
    drawCone(ctx, g.x, g.y, g.angle, GUARD.coneRange, GUARD.coneHalfAngle,
      hot ? PALETTE.coneHot : PALETTE.cone);
    // Badan satpam.
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Topi + arah hadap.
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
    ctx.stroke();
    ctx.fillStyle = '#e8eef7';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.id, g.x, g.y - GUARD.radius - 6);
    if (g.chasing) {
      ctx.fillStyle = '#ff5555';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('!', g.x, g.y - GUARD.radius - 20);
    } else if (world.time < g.distractedUntil) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('?', g.x, g.y - GUARD.radius - 20);
    }
  }
}

function drawCameras(ctx, world) {
  for (const cam of world.cameras) {
    const disabled = world.time < cam.disabledUntil;
    if (!disabled) drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, PALETTE.cameraCone);
    ctx.fillStyle = disabled ? '#555' : '#222';
    ctx.strokeStyle = disabled ? '#888' : '#7ddcff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = disabled ? '#888' : '#ff5555';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8eef7';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(disabled ? 'CCTV MATI' : cam.label, cam.x, cam.y - 18);
  }
}

function drawThief(ctx, world) {
  const t = world.thief;
  // Asap.
  if (world.time < world.smokeUntil) {
    ctx.fillStyle = 'rgba(200,200,210,0.35)';
    ctx.beginPath();
    ctx.arc(world.smokeX, world.smokeY, 70, 0, Math.PI * 2);
    ctx.fill();
  }
  // Koin terlempar.
  for (const c of world.thrownCoins) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bayangan arah hadap (senter kecil).
  drawCone(ctx, t.x, t.y, t.facing, 70, 0.5, 'rgba(255,240,180,0.10)');
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(t.x, t.y, THIEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#f5c542';
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.facing) * 6, t.y + Math.sin(t.facing) * 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.sneaking ? 'JONGKOK' : 'PENCURI', t.x, t.y - THIEF.radius - 6);
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#0a0f18';
  ctx.fillRect(0, 0, VIEW.width, HUD_HEIGHT);
  ctx.fillStyle = '#f5c542';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BRANKAS TENGAH MALAM', 16, 30);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD gerak • Shift jongkok • E ambil/bobol • Klik koin • 1 EMP • 2 asap • R ulang', 16, 54);

  // ALARM METER — besar dan jelas.
  const ax = 545;
  const aw = 240;
  const alarm = world.alarm;
  const hot = alarm > 60;
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, 24);
  ctx.fillStyle = '#1a2434';
  roundRect(ctx, ax, 32, aw, 22, 6);
  ctx.fill();
  const frac = alarm / 100;
  ctx.fillStyle = hot ? '#ff4444' : frac > 30 ? '#ffb020' : '#39d353';
  roundRect(ctx, ax + 2, 34, (aw - 4) * frac, 18, 5);
  ctx.fill();
  ctx.strokeStyle = '#e8eef7';
  ctx.lineWidth = 2;
  roundRect(ctx, ax, 32, aw, 22, 6);
  ctx.stroke();
  ctx.fillStyle = hot ? '#ff8888' : '#e8eef7';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`${Math.round(alarm)}%`, ax + aw + 10, 50);
  if (world.spottedNow) {
    ctx.fillStyle = '#ff5555';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`TERLIHAT: ${world.spottedBy}`, ax, 68);
  }

  // Skor + loot.
  ctx.fillStyle = '#f5c542';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${world.score}`, 830, 32);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`loot ${world.stats.lootTaken}/7`, 830, 54);

  // Tools.
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`Koin ${world.coins}  •  EMP ${world.emp}  •  Asap ${world.smoke}`, 950, 32);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(world.difficultyKey.toUpperCase(), 950, 54);

  // Timer pelarian (baris kedua, kanan — agar tidak menabrak tools).
  if (world.escapeStarted && world.phase === PHASE_PLAY) {
    const urgent = world.escapeLeft < 15;
    ctx.fillStyle = urgent ? '#ff5555' : '#7ddb8a';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`KABUR! ${Math.ceil(world.escapeLeft)} dtk`, 1264, 54);
    ctx.textAlign = 'left';
  }

  // Pesan tengah bawah (transien, tidak menutupi judul ruangan).
  if (world.message && world.time < world.messageUntil) {
    ctx.fillStyle = 'rgba(10,15,24,0.85)';
    const w = ctx.measureText(world.message).width + 28;
    roundRect(ctx, (VIEW.width - w) / 2, 748, w, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, VIEW.width / 2, 769);
  }
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5,8,14,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, 300);
  ctx.fillStyle = '#e8eef7';
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 350 + i * 32));
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Tekan Enter untuk mulai • R untuk ulang', VIEW.width / 2, 350 + lines.length * 32 + 30);
}

export function drawWorld(ctx, world, screen) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#0d1420';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx);
  drawLasers(ctx, world);
  drawLoot(ctx, world);
  drawWallsAndCovers(ctx);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawThief(ctx, world);
  drawHud(ctx, world);

  if (screen === SCREEN_TITLE || world.phase === PHASE_TITLE) {
    drawOverlay(ctx, 'BRANKAS TENGAH MALAM', [
      'Menyusup ke bank. Lewati satpam, CCTV, dan laser.',
      'Ambil loot, bobol brankas utama ($5000), lalu kabur sebelum alarm penuh.',
      'WASD / panah: gerak   Shift: jongkok   E: ambil & bobol   Klik: lempar koin',
      '1: EMP matikan CCTV   2: asap   R: ulang',
    ], '#f5c542');
  } else if (screen === SCREEN_OVER || world.phase === PHASE_CAUGHT) {
    drawOverlay(ctx, 'TERTANGKAP!', [
      `Skor loot: $${world.score}   •   Alarm mencapai ${Math.round(world.alarm)}%`,
      world.message || 'Satpam atau alarm mengakhiri aksimu.',
      'Pelajari pola patroli, pakai koin dan asap, lalu coba lagi.',
    ], '#ff5555');
  } else if (screen === SCREEN_WIN || world.phase === PHASE_WIN) {
    drawOverlay(ctx, 'KABUR SEMPURNA!', [
      `Kamu membawa pulang $${world.score} dari Bank Tengah Malam.`,
      `Loot ${world.stats.lootTaken}/7   •   Terlihat ${world.stats.spotted}x   •   Tools dipakai ${world.stats.toolsUsed}x`,
      'Perencanaan yang rapi selalu dibayar lunas.',
    ], '#7ddb8a');
  }
}
