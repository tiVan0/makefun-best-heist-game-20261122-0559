// BRANKAS TENGAH MALAM — input.js
// Keyboard + mouse. WASD/panah bergerak, Shift jongkok, E interaksi,
// klik kiri lempar koin ke arah kursor, 1 = EMP, 2 = asap, R = ulang, Enter = mulai.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseClicked: false,
    coinQueued: false,
    interactPressed: false,
    empPressed: false,
    smokePressed: false,
    startPressed: false,
    restartPressed: false,
  };

  function canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 800,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === 'e' || event.key === 'E') state.interactPressed = true;
    if (event.key === '1') state.empPressed = true;
    if (event.key === '2') state.smokePressed = true;
    if (event.key === 'Enter') state.startPressed = true;
    if (event.key === 'r' || event.key === 'R') state.restartPressed = true;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const pos = canvasPos(event);
    state.mouseX = pos.x;
    state.mouseY = pos.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    const pos = canvasPos(event);
    state.mouseX = pos.x;
    state.mouseY = pos.y;
    state.mouseClicked = true;
    state.coinQueued = true;
  });

  return state;
}

// Vektor gerak dari tombol yang sedang ditekan; {x, y} ternormalisasi.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('a') || input.keys.has('arrowleft')) x -= 1;
  if (input.keys.has('d') || input.keys.has('arrowright')) x += 1;
  if (input.keys.has('w') || input.keys.has('arrowup')) y -= 1;
  if (input.keys.has('s') || input.keys.has('arrowdown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function isSneaking(input) {
  return input.keys.has('shift');
}

// Bersihkan flag sekali-tekan setelah satu frame dibaca.
export function consumePresses(input) {
  input.mouseClicked = false;
  input.coinQueued = false;
  input.interactPressed = false;
  input.empPressed = false;
  input.smokePressed = false;
  input.startPressed = false;
  input.restartPressed = false;
}
