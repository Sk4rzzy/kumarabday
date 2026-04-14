const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const lollipopsElement = document.getElementById("lollipops");
const winOverlay = document.getElementById("winOverlay");
const loseOverlay = document.getElementById("loseOverlay");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const muteButton = document.getElementById("mute-button");
const upButton = document.getElementById("upButton");
const downButton = document.getElementById("downButton");
const music = document.getElementById("bg-music");
const restartButtons = document.querySelectorAll(".restart-button");

function getLanes() {
  const height = canvas.clientHeight || canvas.height;
  return [height * 0.24, height * 0.48, height * 0.72];
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const player = {
  x: 120,
  lane: 1,
  size: 72,
};
const items = [];
const itemSize = 62;
let score = 0;
let lives = 3;
let lollipopsCollected = 0;
let gameRunning = false;
let isPaused = false;
let musicMuted = false;
let gameOver = false;
let lastSpawn = 0;
let lastTime = 0;
let spawnInterval = 700;
let itemSpeed = 340;
let assetsLoaded = 0;
const assetsToLoad = 4;

function loadImage(src) {
  const img = new Image();
  img.onload = () => {
    assetsLoaded += 1;
    if (assetsLoaded === assetsToLoad) {
      resizeCanvas();
      render();
    }
  };
  img.onerror = () => {
    console.error(`Ne mogu učitati sliku: ${src}`);
  };
  img.src = src;
  return img;
}

const images = {
  player: loadImage("assets/player.png"),
  lollipop: loadImage("assets/lollipop.png"),
  redbull: loadImage("assets/redbull.png"),
  milica: loadImage("assets/milica.png"),
};

window.addEventListener("resize", () => {
  resizeCanvas();
  if (!gameRunning) render();
});

function drawSprite(image, x, y, size, fallbackColor) {
  if (image && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, size, size);
    return;
  }

  ctx.fillStyle = fallbackColor;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function resetGame() {
  score = 0;
  lives = 3;
  lollipopsCollected = 0;
  player.x = 120;
  player.lane = 1;
  items.length = 0;
  gameRunning = false;
  gameOver = false;
  isPaused = false;
  lastSpawn = 0;
  itemSpeed = 340;
  spawnInterval = 700;
  music.pause();
  music.currentTime = 0;
  music.muted = musicMuted;
  pauseButton.textContent = "PAUZA";
  updateHud();
  winOverlay.classList.add("hidden");
  loseOverlay.classList.add("hidden");
}

function updateHud() {
  scoreElement.textContent = score;
  livesElement.textContent = lives;
  lollipopsElement.textContent = lollipopsCollected;
}

function startGame() {
  if (gameRunning) return;
  resetGame();
  gameRunning = true;
  isPaused = false;
  pauseButton.textContent = "PAUZA";
  music.currentTime = 0;
  music.loop = false;
  music.muted = musicMuted;
  if (!musicMuted) {
    music.play().catch(() => {
      console.warn("Glazba nije mogla početi automatski.");
    });
  }
  music.onended = () => {
    if (!gameOver) finishGame("Pjesma je završila! Pogledaj pismo.");
  };
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function togglePause() {
  if (!gameRunning || gameOver) return;
  isPaused = !isPaused;
  pauseButton.textContent = isPaused ? "NASTAVI" : "PAUZA";
  if (isPaused) {
    music.pause();
  } else if (!musicMuted) {
    music.play().catch(() => {});
  }
}

function toggleMusic() {
  musicMuted = !musicMuted;
  music.muted = musicMuted;
  muteButton.textContent = musicMuted ? "GLASNO" : "MUTI";
  if (musicMuted) {
    music.pause();
  } else if (gameRunning && !isPaused) {
    music.play().catch(() => {});
  }
}

function finishGame(message, type) {
  gameOver = true;
  gameRunning = false;
  isPaused = false;
  winOverlay.classList.add("hidden");
  loseOverlay.classList.add("hidden");

  const activeOverlay = type === "lose" ? loseOverlay : winOverlay;
  if (activeOverlay) {
    activeOverlay.classList.remove("hidden");
    const messageText = activeOverlay.querySelector(".letter-content p");
    if (messageText) {
      messageText.textContent = message;
    }
  }
}

function spawnItem() {
  const roll = Math.random();
  const type = roll < 0.5 ? "lollipop" : roll < 0.8 ? "redbull" : "milica";
  const lanes = getLanes();
  const laneIndex = Math.floor(Math.random() * lanes.length);
  items.push({
    x: canvas.clientWidth + 20,
    y: lanes[laneIndex] - itemSize / 2,
    type,
    size: itemSize,
  });
}

function handleInput(direction) {
  const lanes = getLanes();
  if (direction === "up" && player.lane > 0) {
    player.lane -= 1;
  }
  if (direction === "down" && player.lane < lanes.length - 1) {
    player.lane += 1;
  }
}

document.addEventListener("keydown", (event) => {
  if (!gameRunning || isPaused) return;
  if (event.key === "ArrowUp") handleInput("up");
  if (event.key === "ArrowDown") handleInput("down");
});

upButton.addEventListener("click", () => {
  if (!gameRunning || isPaused) return;
  handleInput("up");
});

downButton.addEventListener("click", () => {
  if (!gameRunning || isPaused) return;
  handleInput("down");
});

pauseButton.addEventListener("click", togglePause);
muteButton.addEventListener("click", toggleMusic);
startButton.addEventListener("click", startGame);
restartButtons.forEach((button) => button.addEventListener("click", startGame));

function loop(timestamp) {
  if (gameOver) return;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (!gameRunning) return;
  if (isPaused) {
    render();
    requestAnimationFrame(loop);
    return;
  }

  updateGame(delta);
  render();
  requestAnimationFrame(loop);
}

function updateGame(delta) {
  if (lives <= 0) {
    finishGame("Izgubio si sve živote! Moraš ponovo.");
    return;
  }

  lastSpawn += delta * 1000;
  if (lastSpawn >= spawnInterval) {
    spawnItem();
    lastSpawn = 0;
    if (spawnInterval > 520) spawnInterval -= 12;
  }

  items.forEach((item) => {
    item.x -= itemSpeed * delta;
  });

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.x + item.size < 0) {
      items.splice(i, 1);
      continue;
    }

    if (checkCollision(item)) {
      if (item.type === "lollipop") {
        score += 15;
        lollipopsCollected += 1;
        if (lollipopsCollected >= 16) {
          finishGame("Sada si najhappy osoba :>", "win");
          return;
        }
      }

      if (item.type === "redbull") {
        score += 25;
        itemSpeed += 90;
      }

      if (item.type === "milica") {
        lives -= 1;
        items.splice(i, 1);
        if (lives <= 0) {
          finishGame("Kako to brate nafatala te milica...", "lose");
          return;
        }
        updateHud();
        continue;
      }

      items.splice(i, 1);
      continue;
    }
  }

  updateHud();
}

function checkCollision(item) {
  const playerY = getLanes()[player.lane] - player.size / 2;
  const playerRect = { x: player.x, y: playerY, size: player.size };
  const itemRect = { x: item.x, y: item.y, size: item.size };
  return (
    playerRect.x < itemRect.x + itemRect.size &&
    playerRect.x + playerRect.size > itemRect.x &&
    playerRect.y < itemRect.y + itemRect.size &&
    playerRect.y + playerRect.size > itemRect.y
  );
}

function render() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  drawTrack();
  drawPlayer();
  items.forEach(drawItem);
}

function drawTrack() {
  const width = canvas.clientWidth;
  const lanes = getLanes();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([14, 18]);
  lanes.forEach((lineY) => {
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

function drawPlayer() {
  const x = player.x;
  const y = getLanes()[player.lane] - player.size / 2;
  drawSprite(images.player, x, y, player.size, "#f0f");
}

function drawItem(item) {
  const sprite = item.type === "lollipop" ? images.lollipop : item.type === "redbull" ? images.redbull : images.milica;
  const color = item.type === "lollipop" ? "#ff89d8" : item.type === "redbull" ? "#4fe2ff" : "#ff4fe2";
  drawSprite(sprite, item.x, item.y, item.size, color);
}

resizeCanvas();
resetGame();
render();
