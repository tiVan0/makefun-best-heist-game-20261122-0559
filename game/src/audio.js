// BRANKAS TENGAH MALAM — audio.js
// Semua bunyi disintesis WebAudio (oscillator + noise), tanpa file eksternal.
// AudioContext dibuat lazily pada interaksi pertama agar tidak diblokir browser.
let ctx = null;
let muted = false;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq, duration, type, volume, when = 0) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + duration + 0.02);
}

function noiseBurst(duration, volume, filterFreq) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
}

export const sfx = {
  unlockAudio() { audioCtx(); },
  pickup() { tone(880, 0.12, 'sine', 0.18); tone(1320, 0.16, 'sine', 0.14, 0.07); },
  coin() { tone(1560, 0.09, 'triangle', 0.16); },
  vaultClick() { tone(520, 0.08, 'square', 0.1); tone(780, 0.08, 'square', 0.1, 0.12); },
  vaultOpen() { tone(392, 0.2, 'sawtooth', 0.1); tone(523, 0.25, 'sawtooth', 0.1, 0.15); tone(784, 0.4, 'sine', 0.16, 0.3); },
  spotted() { tone(220, 0.3, 'sawtooth', 0.2); tone(165, 0.35, 'sawtooth', 0.2, 0.1); },
  laserZap() { noiseBurst(0.15, 0.25, 900); tone(180, 0.15, 'square', 0.12); },
  emp() { noiseBurst(0.4, 0.2, 2400); tone(1200, 0.35, 'sine', 0.1, 0.05); },
  smoke() { noiseBurst(0.5, 0.15, 500); },
  caught() { tone(311, 0.25, 'sawtooth', 0.22); tone(233, 0.3, 'sawtooth', 0.22, 0.2); tone(155, 0.6, 'sawtooth', 0.24, 0.4); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.16, i * 0.13)); },
  alarmTick() { tone(980, 0.06, 'square', 0.06); },
  toggleMute() { muted = !muted; return muted; },
  isMuted() { return muted; },
};
