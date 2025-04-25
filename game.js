const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const images = {};
const sounds = {};

let mago, bundas = [], score = 0, recorde = 0, frameCount = 0, gameState = 'menu';

let musicVolume = 0.3;
let sfxVolume = 0.5;
let musicMuted = false;
let sfxMuted = false;

const keys = { space: false };
let clicked = false;

function loadImages(callback) {
  const paths = {
    mago: 'data/trollface_mago.png',
    bunda: 'data/bunda.png',
    fundo: 'data/fundo.png',
    fundoGameOver: 'data/fundo_game_over.png'
  };
  let loaded = 0;
  const total = Object.keys(paths).length;
  for (let key in paths) {
    const img = new Image();
    img.src = paths[key];
    img.onload = () => {
      images[key] = img;
      if (++loaded === total) callback();
    };
  }
}

function loadSounds() {
  sounds.musica = new Audio('data/musica_fundo.wav');
  sounds.musica.loop = true;
  sounds.musica.volume = musicMuted ? 0 : musicVolume;
  document.body.addEventListener('click', () => {
    if (!musicMuted && sounds.musica.paused) {
      sounds.musica.play();
    }
  }, { once: true });

  sounds.peido = new Audio('data/peido.wav');
  sounds.bunda_hit = new Audio('data/bunda_hit.wav');
  sounds.passou = new Audio('data/passou.wav');

  sounds.peido.volume = sfxMuted ? 0 : sfxVolume;
  sounds.bunda_hit.volume = sfxMuted ? 0 : sfxVolume;
  sounds.passou.volume = sfxMuted ? 0 : sfxVolume;
}

function setupVolumeControls() {
  const musicSlider = document.getElementById('musicVolume');
  const sfxSlider = document.getElementById('sfxVolume');
  const muteMusic = document.getElementById('muteMusic');
  const muteSfx = document.getElementById('muteSfx');

  function updateMuteButtonStyles() {
    muteMusic.classList.toggle('active', musicMuted);
    muteSfx.classList.toggle('active', sfxMuted);
  }

  musicSlider.addEventListener('input', () => {
    musicVolume = parseFloat(musicSlider.value);
    if (!musicMuted) sounds.musica.volume = musicVolume;
  });

  sfxSlider.addEventListener('input', () => {
    sfxVolume = parseFloat(sfxSlider.value);
    if (!sfxMuted) {
      sounds.peido.volume = sfxVolume;
      sounds.bunda_hit.volume = sfxVolume;
      sounds.passou.volume = sfxVolume;
    }
  });

  muteMusic.addEventListener('click', () => {
    musicMuted = !musicMuted;
    sounds.musica.volume = musicMuted ? 0 : musicVolume;
    updateMuteButtonStyles();
  });

  muteSfx.addEventListener('click', () => {
    sfxMuted = !sfxMuted;
    const vol = sfxMuted ? 0 : sfxVolume;
    sounds.peido.volume = vol;
    sounds.bunda_hit.volume = vol;
    sounds.passou.volume = vol;
    updateMuteButtonStyles();
  });

  updateMuteButtonStyles();
}

class Mago {
  constructor() {
    this.x = 80;
    this.y = HEIGHT / 2;
    this.vel = 0;
    this.gravity = 0.5;
    this.jumpStrength = -8;
    this.particulas = [];
  }

  update() {
    this.vel += this.gravity;
    this.y += this.vel;
    this.particulas.forEach(p => p.update());
    this.particulas = this.particulas.filter(p => p.lifetime > 0);
  }

  jump() {
    this.vel = this.jumpStrength;
    const peido = new Audio('data/peido.wav');
    peido.volume = sfxMuted ? 0 : sfxVolume;
    peido.play();
    for (let i = 0; i < 3; i++) {
      this.particulas.push(new Particula(this.x, this.y));
    }
  }

  draw() {
    ctx.drawImage(images.mago, this.x - 60, this.y - 60, 120, 120);
    this.particulas.forEach(p => p.draw());
  }

  getRect() {
    return { x: this.x - 30, y: this.y - 30, w: 60, h: 60 };
  }
}

class Particula {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 2 - 1;
    this.vy = -Math.random() * 2;
    this.radius = Math.random() * 3 + 2;
    this.lifetime = 30;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.lifetime--;
  }

  draw() {
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Bunda {
  constructor(x, speed) {
    this.x = x;
    this.speed = speed;
    this.gap = 200;
    this.topHeight = Math.floor(Math.random() * (HEIGHT - this.gap - 100) + 50);
    this.bottomY = this.topHeight + this.gap;
    this.pontuado = false;
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    ctx.drawImage(images.bunda, this.x - 50, this.topHeight - 400, 100, 400);
    ctx.save();
    ctx.translate(this.x, this.bottomY);
    ctx.scale(1, -1);
    ctx.drawImage(images.bunda, -50, -400, 100, 400);
    ctx.restore();
  }

  getRects() {
    return [
      { x: this.x - 50, y: 0, w: 100, h: this.topHeight },
      { x: this.x - 50, y: this.bottomY, w: 100, h: HEIGHT - this.bottomY }
    ];
  }
}

function checkCollision(rect1, rects) {
  return rects.some(r => (
    rect1.x < r.x + r.w &&
    rect1.x + rect1.w > r.x &&
    rect1.y < r.y + r.h &&
    rect1.y + rect1.h > r.y
  ));
}

function drawText(text, x, y, size = 30, color = 'white') {
  ctx.fillStyle = color;
  ctx.font = `${size}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function gameLoop() {
  if (gameState === 'menu') {
    ctx.drawImage(images.fundo, 0, 0, WIDTH, HEIGHT);
    drawText('Wizards Trolls Farts', WIDTH/2, 50);
    drawText('Click to Start', WIDTH/2, 340);
    drawText(`Record: ${recorde}`, WIDTH/2, 380);
    if (keys.space || clicked) {
      clicked = false;
      startGame();
    }
  } else if (gameState === 'play') {
    ctx.drawImage(images.fundo, 0, 0, WIDTH, HEIGHT);

    if (keys.space || clicked) {
      mago.jump();
      clicked = false;
      keys.space = false;
    }

    mago.update();
    mago.draw();

    if (frameCount % 90 === 0) bundas.push(new Bunda(WIDTH + 50, 4 + Math.floor(score / 5)));
    bundas.forEach(b => b.update());
    bundas.forEach(b => b.draw());
    bundas = bundas.filter(b => b.x > -100);

    for (let b of bundas) {
      if (!b.pontuado && b.x + 70 < mago.x) {
        score++;
        b.pontuado = true;
        if (!sfxMuted) sounds.passou.play();
      }
    }

    drawText(`Score: ${score}`, 60, 40);

    if (checkCollision(mago.getRect(), bundas.flatMap(b => b.getRects())) || mago.y < 0 || mago.y > HEIGHT) {
      if (!sfxMuted) sounds.bunda_hit.play();
      if (score > recorde) recorde = score;
      gameState = 'gameover';
    }
  } else if (gameState === 'gameover') {
    ctx.drawImage(images.fundoGameOver, 0, 0, WIDTH, HEIGHT);
    drawText('You need to fart more!', WIDTH/2, HEIGHT/2 - 100);
    drawText(`Score: ${score}`, WIDTH/2, HEIGHT/2);
    drawText(`Record: ${recorde}`, WIDTH/2, HEIGHT/2 + 40);
    drawText('Click to Restart', WIDTH/2, HEIGHT/2 + 120);
    if (keys.space || clicked) {
      clicked = false;
      startGame();
    }
  }

  frameCount++;
  requestAnimationFrame(gameLoop);
}

function startGame() {
  mago = new Mago();
  bundas = [];
  score = 0;
  frameCount = 0;
  gameState = 'play';
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space') keys.space = true;
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') keys.space = false;
});
canvas.addEventListener('mousedown', () => clicked = true);

loadImages(() => {
  loadSounds();
  setupVolumeControls();
  gameLoop();
});
