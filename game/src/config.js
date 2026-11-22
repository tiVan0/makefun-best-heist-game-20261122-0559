// BRANKAS TENGAH MALAM — config.js
// Semua angka penyeimbang dan tata letak bank. Satu tempat untuk mengubah
// ukuran arena, kecepatan, jangkauan penglihatan, dan biaya tools.
export const VIEW = { width: 1280, height: 800 };
export const HUD_HEIGHT = 72;
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walkSpeed: 170,
  sneakSpeed: 95,
  // Seberapa jauh pencuri terlihat saat jongkok: radius deteksi menyusut.
  sneakVisibility: 0.62,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 118,
  coneRange: 210,
  coneHalfAngle: 0.52,
  // Jarak sentuh = tertangkap.
  catchRadius: 26,
};

export const CAMERA = {
  range: 230,
  halfAngle: 0.42,
  sweepSpeed: 0.55,
  sweepArc: 1.15,
};

export const ALARM = {
  riseGuard: 34,
  riseCamera: 22,
  riseLaser: 26,
  decayHidden: 9,
  decaySafe: 14,
  caughtAt: 100,
};

export const TOOLS = {
  coinStart: 3,
  empStart: 1,
  smokeStart: 2,
  empDuration: 8,
  smokeDuration: 6,
  coinDistractRadius: 150,
  coinDistractSeconds: 3.5,
};

export const VAULT = {
  lockpickSeconds: 3.0,
  escapeSeconds: 45,
  vaultValue: 5000,
  goldValue: 800,
  cashValue: 400,
};

export const PALETTE = {
  floorLobby: '#233246',
  floorCorridor: '#1d2733',
  floorVault: '#2b2417',
  carpet: '#31435f',
  wall: '#0d1420',
  wallTop: '#3a4d68',
  cover: '#4a5a74',
  coverTop: '#6b7f9e',
  gold: '#f5c542',
  goldDim: '#a8871f',
  cash: '#7ddb8a',
  laser: '#ff3355',
  cone: 'rgba(255, 214, 64, 0.20)',
  coneHot: 'rgba(255, 60, 60, 0.30)',
  cameraCone: 'rgba(120, 220, 255, 0.16)',
  thief: '#1c2733',
  thiefTrim: '#f5c542',
  guard: '#7a2e2e',
  guardTrim: '#ffd166',
  text: '#e8eef7',
  dim: '#9fb0c7',
};

// Dinding sebagai persegi {x, y, w, h} dalam koordinat arena (y mulai 0 di bawah HUD).
// Arena bermain: x 0..1280, y HUD_HEIGHT..800.
export const WALLS = [
  { x: 0, y: 72, w: 1280, h: 14 },
  { x: 0, y: 786, w: 1280, h: 14 },
  { x: 0, y: 72, w: 14, h: 728 },
  { x: 1266, y: 72, w: 14, h: 728 },
  // Dinding pemisah lobi | koridor (x=430) dengan dua celah pintu.
  { x: 430, y: 72, w: 16, h: 150 },
  { x: 430, y: 322, w: 16, h: 250 },
  { x: 430, y: 672, w: 16, h: 114 },
  // Dinding pemisah koridor | ruang brankas (x=860) dengan dua celah pintu.
  { x: 860, y: 72, w: 16, h: 170 },
  { x: 860, y: 342, w: 16, h: 230 },
  { x: 860, y: 672, w: 16, h: 114 },
];

// Cover: benda yang menghalangi pandangan (dan bisa disembunyikan di baliknya).
export const COVERS = [
  // Lobi
  { x: 120, y: 300, w: 150, h: 46, label: 'MEJA RESEPSIONIS' },
  { x: 180, y: 560, w: 60, h: 60, label: 'TANAMAN' },
  { x: 300, y: 160, w: 54, h: 54, label: 'PILAR' },
  { x: 90, y: 640, w: 90, h: 40, label: 'SOFA' },
  // Koridor
  { x: 560, y: 180, w: 54, h: 54, label: 'PILAR' },
  { x: 560, y: 640, w: 54, h: 54, label: 'PILAR' },
  { x: 660, y: 500, w: 110, h: 40, label: 'ARSIP' },
  // Ruang brankas
  { x: 980, y: 160, w: 54, h: 54, label: 'PILAR' },
  { x: 980, y: 640, w: 54, h: 54, label: 'PILAR' },
  { x: 1050, y: 140, w: 60, h: 110, label: 'LEMARI BESI' },
];

export const DOORS = {
  exit: { x: 30, y: 700, w: 90, h: 86, label: 'PINTU KELUAR' },
  vault: { x: 1140, y: 380, w: 110, h: 130, label: 'BRANKAS UTAMA' },
};

export const LOOT_SPOTS = [
  { id: 'cash1', kind: 'cash', x: 200, y: 420, value: 400 },
  { id: 'cash2', kind: 'cash', x: 350, y: 700, value: 400 },
  { id: 'cash3', kind: 'cash', x: 700, y: 250, value: 400 },
  { id: 'gold1', kind: 'gold', x: 950, y: 480, value: 800 },
  { id: 'gold2', kind: 'gold', x: 1050, y: 620, value: 800 },
  { id: 'gold3', kind: 'gold', x: 1180, y: 620, value: 800 },
];

// Laser melintang di koridor: balok horizontal yang berkedip hidup/mati.
export const LASERS = [
  { x: 470, y: 300, w: 360, h: 6, period: 4.0, onFraction: 0.55, phase: 0.0 },
  { x: 470, y: 470, w: 360, h: 6, period: 5.0, onFraction: 0.5, phase: 2.0 },
  { x: 470, y: 600, w: 360, h: 6, period: 3.4, onFraction: 0.45, phase: 1.0 },
];

export const GUARD_ROUTES = [
  {
    id: 'G1',
    name: 'SATPAM LOBI',
    waypoints: [
      { x: 100, y: 160 },
      { x: 360, y: 160 },
      { x: 360, y: 480 },
      { x: 100, y: 480 },
    ],
  },
  {
    id: 'G2',
    name: 'SATPAM KORIDOR',
    waypoints: [
      { x: 520, y: 140 },
      { x: 780, y: 140 },
      { x: 780, y: 700 },
      { x: 520, y: 700 },
    ],
  },
  {
    id: 'G3',
    name: 'SATPAM BRANKAS',
    waypoints: [
      { x: 940, y: 300 },
      { x: 940, y: 610 },
      { x: 1180, y: 610 },
      { x: 1180, y: 300 },
    ],
  },
];

export const CAMERA_SPOTS = [
  { id: 'C1', x: 446, y: 260, baseAngle: 0, label: 'CCTV 1' },
  { id: 'C2', x: 900, y: 560, baseAngle: Math.PI, label: 'CCTV 2' },
  { id: 'C3', x: 1200, y: 250, baseAngle: Math.PI / 2, label: 'CCTV 3' },
];

export const THIEF_START = { x: 200, y: 730 };

export const DIFFICULTY = {
  mudah: { alarmScale: 0.75, guardSpeed: 0.9, label: 'MUDAH' },
  normal: { alarmScale: 1.0, guardSpeed: 1.0, label: 'NORMAL' },
  sulit: { alarmScale: 1.3, guardSpeed: 1.15, label: 'SULIT' },
};
