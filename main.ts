// BRANKAS TENGAH MALAM — entri program/v1 untuk best-heist-game-20261122-0559.
// Game-nya file statis di game/ (index.html + modul ES, canvas 2D murni,
// tanpa library dan tanpa network). Program ini menyerahkan game itu:
// menyalin game/ dan screenshots/ dari samping file ini ke /output
// (atau MAKEFUN_OUTPUT_DIR di luar grader) lalu menulis dossier.json
// dengan buildDossier dari vendor/makefun-game.ts (salinan kit, tak diubah).
// Dijalankan dua kali oleh grader; kedua run menulis byte yang sama
// karena game/ dan screenshots/ adalah file tetap dari repo ini.
// Verifikasi lokal (dari root repo ini):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   # ulangi ke out2, lalu bandingkan: diff -r out out2 harus kosong.
//
// Coba lokal:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Batas gate dari RULES.txt: teks dossier max 160 KiB, max 4 screenshot
// @ max 256 KiB, game/ max 993 file dan 48 MiB, path max 1000 byte.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
